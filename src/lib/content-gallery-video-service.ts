import "server-only";

import { put } from "@vercel/blob";
import Replicate, { type FileOutput } from "replicate";

import {
  CONTENT_IMAGE_VISUAL_BRIEF_LIMIT,
  CONTENT_VIDEO_MAX_BYTES,
  type ContentCoverGenerationProgressStep,
  type ContentPostGenerateCoverProgressEvent,
} from "@/lib/content";

const TITLE_LIMIT = 120;
const SUMMARY_LIMIT = 240;
const DEFAULT_MODEL = "bytedance/seedance-1-pro";
const DEFAULT_ASPECT_RATIO = "9:16";
const DEFAULT_DURATION_SECONDS = 5;
const DEFAULT_FPS = 24;
const DEFAULT_RESOLUTION = "1080p";

type ReplicateVideoInput = Record<string, boolean | number | string>;
type ReplicateModelName = `${string}/${string}` | `${string}/${string}:${string}`;

export type GenerateContentGalleryVideoInput = {
  onProgress?: (
    event: ContentPostGenerateCoverProgressEvent,
  ) => Promise<void> | void;
  referralCode: string;
  summary?: string | null;
  title?: string | null;
  visualBrief?: string | null;
};

export type GeneratedContentGalleryVideo = {
  contentType: string;
  pathname: string;
  revisedPrompt: string | null;
  url: string;
};

function trimToLength(value: string | null | undefined, limit: number) {
  return value?.trim().slice(0, limit) ?? "";
}

function sanitizeBaseName(name: string) {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return normalized || "ai-content-video";
}

function parseDurationSeconds(value: string | undefined) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_DURATION_SECONDS;
  }

  return Math.max(2, Math.min(12, Math.round(parsed)));
}

function resolveModelName(): ReplicateModelName {
  const model =
    process.env.REPLICATE_CONTENT_VIDEO_MODEL?.trim() || DEFAULT_MODEL;

  if (!/^[^/\s]+\/[^/\s]+(?::[^/\s]+)?$/.test(model)) {
    throw new Error(
      "REPLICATE_CONTENT_VIDEO_MODEL must use owner/model or owner/model:version format.",
    );
  }

  return model as ReplicateModelName;
}

function createModelInput(model: string, prompt: string): ReplicateVideoInput {
  const aspectRatio =
    process.env.REPLICATE_CONTENT_VIDEO_ASPECT_RATIO?.trim() ||
    DEFAULT_ASPECT_RATIO;
  const duration = parseDurationSeconds(
    process.env.REPLICATE_CONTENT_VIDEO_DURATION?.trim(),
  );
  const resolution =
    process.env.REPLICATE_CONTENT_VIDEO_RESOLUTION?.trim() ||
    DEFAULT_RESOLUTION;

  if (model.includes("google/veo-3")) {
    return {
      aspect_ratio: aspectRatio,
      duration,
      generate_audio: true,
      prompt,
      resolution,
    };
  }

  if (model.includes("seedance")) {
    return {
      aspect_ratio: aspectRatio,
      camera_fixed: false,
      duration,
      fps: DEFAULT_FPS,
      prompt,
      resolution,
    };
  }

  return { prompt };
}

function resolveFileExtension(contentType: string, sourceUrl: string | null) {
  if (contentType === "video/webm") {
    return ".webm";
  }

  if (contentType === "video/quicktime") {
    return ".mov";
  }

  if (contentType === "video/mp4") {
    return ".mp4";
  }

  if (sourceUrl) {
    try {
      const pathname = new URL(sourceUrl).pathname.toLowerCase();

      if (pathname.endsWith(".webm")) {
        return ".webm";
      }

      if (pathname.endsWith(".mov")) {
        return ".mov";
      }

      if (pathname.endsWith(".mp4")) {
        return ".mp4";
      }
    } catch {}
  }

  return ".mp4";
}

function isFileOutputLike(value: unknown): value is FileOutput {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "blob" in value &&
    typeof (value as FileOutput).blob === "function" &&
    "url" in value &&
    typeof (value as FileOutput).url === "function"
  );
}

async function readReplicateOutputFile(
  output: unknown,
): Promise<{ blob: Blob; sourceUrl: string | null }> {
  if (Array.isArray(output)) {
    const [firstOutput] = output;

    if (!firstOutput) {
      throw new Error("Replicate returned no video output.");
    }

    return readReplicateOutputFile(firstOutput);
  }

  if (typeof output === "string") {
    const response = await fetch(output, { method: "GET" });

    if (!response.ok) {
      throw new Error(
        `Replicate returned an unreadable output URL (${response.status}).`,
      );
    }

    return {
      blob: await response.blob(),
      sourceUrl: output,
    };
  }

  if (isFileOutputLike(output)) {
    return {
      blob: await output.blob(),
      sourceUrl: output.url().toString(),
    };
  }

  throw new Error("Replicate returned an unsupported video payload.");
}

async function reportProgress(
  onProgress:
    | ((
        event: ContentPostGenerateCoverProgressEvent,
      ) => Promise<void> | void)
    | undefined,
  event: {
    message: string;
    progress: number;
    status: "completed" | "failed" | "running";
    step: ContentCoverGenerationProgressStep;
  },
) {
  await onProgress?.(event);
}

export async function generateAndUploadContentGalleryVideo(
  input: GenerateContentGalleryVideoInput,
): Promise<GeneratedContentGalleryVideo> {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }

  const replicateToken = process.env.REPLICATE_API_TOKEN?.trim();

  if (!replicateToken) {
    throw new Error("REPLICATE_API_TOKEN is not configured.");
  }

  const title = trimToLength(input.title, TITLE_LIMIT);
  const summary = trimToLength(input.summary, SUMMARY_LIMIT);
  const visualBrief = trimToLength(
    input.visualBrief,
    CONTENT_IMAGE_VISUAL_BRIEF_LIMIT,
  );

  if (!visualBrief) {
    throw new Error(
      "Provide a video prompt to generate a content video.",
    );
  }

  await reportProgress(input.onProgress, {
    message: "Preparing the video prompt for content video generation.",
    progress: 18,
    status: "running",
    step: "preparing_prompt",
  });

  const prompt = visualBrief;

  await reportProgress(input.onProgress, {
    message: "Video prompt is ready. Starting content video generation.",
    progress: 28,
    status: "completed",
    step: "preparing_prompt",
  });

  await reportProgress(input.onProgress, {
    message: "Generating the AI content video with Replicate.",
    progress: 42,
    status: "running",
    step: "generating_image",
  });

  const replicate = new Replicate({ auth: replicateToken });
  const model = resolveModelName();
  const modelInput = createModelInput(model, prompt);

  const rawOutput = await replicate.run(model, {
    input: modelInput,
  });

  await reportProgress(input.onProgress, {
    message: "AI video created. Preparing upload.",
    progress: 74,
    status: "completed",
    step: "generating_image",
  });

  const { blob, sourceUrl } = await readReplicateOutputFile(rawOutput);
  const contentType =
    blob.type && blob.type !== "application/octet-stream"
      ? blob.type
      : "video/mp4";

  if (blob.size > CONTENT_VIDEO_MAX_BYTES) {
    throw new Error("Generated video is larger than the 200MB limit.");
  }

  const extension = resolveFileExtension(contentType, sourceUrl);
  const pathname = [
    "content-posts",
    input.referralCode,
    "generated-content-videos",
    `${Date.now()}-${sanitizeBaseName(
      title || summary || visualBrief || "ai-content-video",
    )}${extension}`,
  ].join("/");

  await reportProgress(input.onProgress, {
    message: "Uploading the content video to your studio assets.",
    progress: 84,
    status: "running",
    step: "uploading_cover",
  });

  const uploaded = await put(pathname, blob, {
    access: "public",
    addRandomSuffix: true,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
    contentType,
  });

  await reportProgress(input.onProgress, {
    message: "Content video uploaded. Finalizing the result.",
    progress: 94,
    status: "completed",
    step: "uploading_cover",
  });

  return {
    contentType: uploaded.contentType,
    pathname: uploaded.pathname,
    revisedPrompt: null,
    url: uploaded.url,
  };
}
