import "server-only";

import { createFalClient, type QueueStatus } from "@fal-ai/client";
import { put } from "@vercel/blob";

import {
  CONTENT_IMAGE_VISUAL_BRIEF_LIMIT,
  CONTENT_VIDEO_MAX_BYTES,
  type ContentCoverGenerationProgressStep,
  type ContentPostGenerateCoverProgressEvent,
} from "@/lib/content";

const TITLE_LIMIT = 120;
const SUMMARY_LIMIT = 240;
const DEFAULT_MODEL = "fal-ai/veo3.1/lite";
const DEFAULT_ASPECT_RATIO = "9:16";
const DEFAULT_DURATION = "8s";
const DEFAULT_GENERATE_AUDIO = true;
const DEFAULT_RESOLUTION = "720p";
const DEFAULT_SAFETY_TOLERANCE = "6";
const DEFAULT_TIMEOUT_MS = 290_000;

type FalVideoInput = {
  aspect_ratio: "16:9" | "9:16";
  auto_fix: boolean;
  duration: "4s" | "6s" | "8s";
  generate_audio: boolean;
  negative_prompt?: string;
  prompt: string;
  resolution: "720p" | "1080p";
  safety_tolerance: "1" | "2" | "3" | "4" | "5" | "6";
};

type FalModelName = `${string}/${string}${string}`;

type FalVideoFile = {
  content_type?: string;
  file_size?: number;
  url: string;
};

type FalVideoOutput = {
  video?: FalVideoFile;
};

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

function parseBoolean(value: string | undefined, fallback: boolean) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return fallback;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
) {
  const normalized = value?.trim();

  return allowed.includes(normalized as T) ? (normalized as T) : fallback;
}

function resolveModelName(): FalModelName {
  const model = process.env.FAL_CONTENT_VIDEO_MODEL?.trim() || DEFAULT_MODEL;

  if (!/^[^/\s]+\/[^/\s]+(?:\/[^/\s]+)*$/.test(model)) {
    throw new Error(
      "FAL_CONTENT_VIDEO_MODEL must use owner/model or owner/model/path format.",
    );
  }

  return model as FalModelName;
}

function createModelInput(prompt: string): FalVideoInput {
  const aspectRatio = parseEnum(
    process.env.FAL_CONTENT_VIDEO_ASPECT_RATIO,
    ["16:9", "9:16"] as const,
    DEFAULT_ASPECT_RATIO,
  );
  const duration = parseEnum(
    process.env.FAL_CONTENT_VIDEO_DURATION,
    ["4s", "6s", "8s"] as const,
    DEFAULT_DURATION,
  );
  const resolution = parseEnum(
    process.env.FAL_CONTENT_VIDEO_RESOLUTION,
    ["720p", "1080p"] as const,
    DEFAULT_RESOLUTION,
  );
  const safetyTolerance = parseEnum(
    process.env.FAL_CONTENT_VIDEO_SAFETY_TOLERANCE,
    ["1", "2", "3", "4", "5", "6"] as const,
    DEFAULT_SAFETY_TOLERANCE,
  );
  const negativePrompt = process.env.FAL_CONTENT_VIDEO_NEGATIVE_PROMPT?.trim();

  return {
    aspect_ratio: aspectRatio,
    auto_fix: parseBoolean(process.env.FAL_CONTENT_VIDEO_AUTO_FIX, true),
    duration,
    generate_audio: parseBoolean(
      process.env.FAL_CONTENT_VIDEO_GENERATE_AUDIO,
      DEFAULT_GENERATE_AUDIO,
    ),
    ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
    prompt,
    resolution,
    safety_tolerance: safetyTolerance,
  };
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

function isFalVideoFile(value: unknown): value is FalVideoFile {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "url" in value &&
    typeof (value as FalVideoFile).url === "string"
  );
}

function getFalVideoFile(output: unknown): FalVideoFile {
  if (isFalVideoFile(output)) {
    return output;
  }

  if (output && typeof output === "object" && "video" in output) {
    const video = (output as FalVideoOutput).video;

    if (isFalVideoFile(video)) {
      return video;
    }
  }

  throw new Error("fal returned an unsupported video payload.");
}

async function readFalOutputFile(
  output: unknown,
): Promise<{ blob: Blob; sourceUrl: string | null }> {
  const video = getFalVideoFile(output);
  const response = await fetch(video.url, { method: "GET" });

  if (!response.ok) {
    throw new Error(`fal returned an unreadable output URL (${response.status}).`);
  }

  return {
    blob: await response.blob(),
    sourceUrl: video.url,
  };
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

function getFalTimeoutMs() {
  const parsed = Number(process.env.FAL_CONTENT_VIDEO_TIMEOUT_MS?.trim());

  if (!Number.isFinite(parsed)) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.max(60_000, Math.min(600_000, Math.round(parsed)));
}

function reportFalQueueStatus(
  onProgress: GenerateContentGalleryVideoInput["onProgress"],
  status: QueueStatus,
) {
  if (status.status === "IN_QUEUE") {
    void onProgress?.({
      message:
        status.queue_position > 0
          ? `fal video generation is queued (${status.queue_position} ahead).`
          : "fal video generation is queued.",
      progress: 42,
      status: "running",
      step: "generating_image",
    });
    return;
  }

  if (status.status === "IN_PROGRESS") {
    void onProgress?.({
      message: "fal is rendering the AI content video.",
      progress: 58,
      status: "running",
      step: "generating_image",
    });
  }
}

export async function generateAndUploadContentGalleryVideo(
  input: GenerateContentGalleryVideoInput,
): Promise<GeneratedContentGalleryVideo> {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }

  const falKey = process.env.FAL_KEY?.trim();

  if (!falKey) {
    throw new Error("FAL_KEY is not configured.");
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
    message: "Preparing your video prompt for the generation request.",
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
    message: "Generating the AI content video with fal Veo 3.1 Lite.",
    progress: 42,
    status: "running",
    step: "generating_image",
  });

  const model = resolveModelName();
  const modelInput = createModelInput(prompt);
  const fal = createFalClient({ credentials: falKey });

  const result = await fal.subscribe(model, {
    input: modelInput,
    logs: true,
    mode: "polling",
    onQueueUpdate(status) {
      reportFalQueueStatus(input.onProgress, status);
    },
    pollInterval: 1000,
    timeout: getFalTimeoutMs(),
  });

  await reportProgress(input.onProgress, {
    message: "AI video created. Preparing upload.",
    progress: 74,
    status: "completed",
    step: "generating_image",
  });

  const falVideo = getFalVideoFile(result.data);
  const { blob, sourceUrl } = await readFalOutputFile(result.data);
  const contentType =
    falVideo.content_type ??
    (blob.type && blob.type !== "application/octet-stream"
      ? blob.type
      : "video/mp4");

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
