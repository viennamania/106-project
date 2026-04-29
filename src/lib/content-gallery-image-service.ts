import "server-only";

import { put } from "@vercel/blob";
import Replicate, { type FileOutput } from "replicate";

import {
  CONTENT_IMAGE_VISUAL_BRIEF_LIMIT,
  type ContentCoverGenerationProgressStep,
  type ContentPostGenerateCoverProgressEvent,
} from "@/lib/content";

const TITLE_LIMIT = 120;
const SUMMARY_LIMIT = 240;
const DEFAULT_MODEL = "black-forest-labs/flux-1.1-pro-ultra";
const DEFAULT_ASPECT_RATIO = "4:5";
const DEFAULT_OUTPUT_FORMAT = "png";
const DEFAULT_SAFETY_TOLERANCE = 6;

type FluxProUltraAspectRatio =
  | "21:9"
  | "16:9"
  | "3:2"
  | "4:3"
  | "5:4"
  | "1:1"
  | "4:5"
  | "3:4"
  | "2:3"
  | "9:16"
  | "9:21";

type FluxProUltraInput = {
  aspect_ratio?: FluxProUltraAspectRatio;
  image_prompt?: string;
  image_prompt_strength?: number;
  output_format?: "jpg" | "png";
  prompt: string;
  raw?: boolean;
  safety_tolerance?: 1 | 2 | 3 | 4 | 5 | 6;
  seed?: number;
};

export type GenerateContentGalleryImageInput = {
  onProgress?: (
    event: ContentPostGenerateCoverProgressEvent,
  ) => Promise<void> | void;
  referralCode: string;
  summary?: string | null;
  title?: string | null;
  visualBrief?: string | null;
};

export type GeneratedContentGalleryImage = {
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

  return normalized || "ai-content-image";
}

function resolveFileExtension(contentType: string, sourceUrl: string | null) {
  if (contentType === "image/png") {
    return ".png";
  }

  if (contentType === "image/webp") {
    return ".webp";
  }

  if (contentType === "image/jpeg") {
    return ".jpg";
  }

  if (sourceUrl) {
    try {
      const pathname = new URL(sourceUrl).pathname.toLowerCase();

      if (pathname.endsWith(".png")) {
        return ".png";
      }

      if (pathname.endsWith(".webp")) {
        return ".webp";
      }

      if (pathname.endsWith(".jpeg")) {
        return ".jpeg";
      }

      if (pathname.endsWith(".jpg")) {
        return ".jpg";
      }
    } catch {}
  }

  return ".png";
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
      throw new Error("Replicate returned no image output.");
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

  throw new Error("Replicate returned an unsupported image payload.");
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

export async function generateAndUploadContentGalleryImage(
  input: GenerateContentGalleryImageInput,
): Promise<GeneratedContentGalleryImage> {
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
      "Provide an image prompt to generate a content image.",
    );
  }

  await reportProgress(input.onProgress, {
    message: "Preparing the image prompt for content image generation.",
    progress: 18,
    status: "running",
    step: "preparing_prompt",
  });

  const prompt = visualBrief;

  await reportProgress(input.onProgress, {
    message: "Image prompt is ready. Starting content image generation.",
    progress: 28,
    status: "completed",
    step: "preparing_prompt",
  });

  await reportProgress(input.onProgress, {
    message: "Generating the AI content image with Replicate.",
    progress: 42,
    status: "running",
    step: "generating_image",
  });

  const replicate = new Replicate({ auth: replicateToken });
  const modelInput = {
    aspect_ratio: DEFAULT_ASPECT_RATIO,
    output_format: DEFAULT_OUTPUT_FORMAT,
    prompt,
    safety_tolerance: DEFAULT_SAFETY_TOLERANCE,
  } satisfies FluxProUltraInput;

  const rawOutput = await replicate.run(DEFAULT_MODEL, {
    input: modelInput,
  });

  await reportProgress(input.onProgress, {
    message: "AI image created. Preparing upload.",
    progress: 74,
    status: "completed",
    step: "generating_image",
  });

  const { blob, sourceUrl } = await readReplicateOutputFile(rawOutput);
  const contentType = blob.type || "image/png";
  const extension = resolveFileExtension(contentType, sourceUrl);
  const pathname = [
    "content-posts",
    input.referralCode,
    "generated-content-images",
    `${Date.now()}-${sanitizeBaseName(
      title || summary || visualBrief || "ai-content-image",
    )}${extension}`,
  ].join("/");

  await reportProgress(input.onProgress, {
    message: "Uploading the content image to your studio assets.",
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
    message: "Content image uploaded. Finalizing the result.",
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
