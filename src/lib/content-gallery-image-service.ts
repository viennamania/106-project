import "server-only";

import { put } from "@vercel/blob";
import Replicate, { type FileOutput } from "replicate";

import type {
  ContentCoverGenerationProgressStep,
  ContentPostGenerateCoverProgressEvent,
} from "@/lib/content";

const TITLE_LIMIT = 120;
const SUMMARY_LIMIT = 240;
const BODY_LIMIT = 480;
const VISUAL_BRIEF_LIMIT = 320;
const DEFAULT_MODEL = "black-forest-labs/flux-2-pro";
const DEFAULT_ASPECT_RATIO = "4:5";
const DEFAULT_OUTPUT_FORMAT = "webp";
const DEFAULT_OUTPUT_QUALITY = 90;

export type GenerateContentGalleryImageInput = {
  body?: string | null;
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

  return normalized || "ai-gallery-image";
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

function buildGalleryImagePrompt(input: {
  body: string;
  summary: string;
  title: string;
  visualBrief: string;
}) {
  return [
    "Create a premium editorial content image for a creator detail gallery.",
    "Do not include any text, letters, numbers, logos, watermarks, borders, frames, or UI chrome.",
    "Portrait-first composition, optimized for a mobile swipe gallery and immersive detail view.",
    "Style: polished, cinematic, photorealistic or premium editorial illustration, visually rich, not cartoonish, not childish.",
    "Use one clear focal subject, convincing depth, atmospheric lighting, and a composition that feels luxurious and modern.",
    input.title ? `Core topic: ${input.title}.` : null,
    input.summary ? `Summary context: ${input.summary}.` : null,
    input.body ? `Supporting context: ${input.body}.` : null,
    input.visualBrief ? `Visual direction: ${input.visualBrief}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
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
  const body = trimToLength(input.body, BODY_LIMIT);
  const visualBrief = trimToLength(input.visualBrief, VISUAL_BRIEF_LIMIT);

  if (!title && !summary && !body && !visualBrief) {
    throw new Error(
      "Provide title, summary, body, or visual brief to generate a content image.",
    );
  }

  await reportProgress(input.onProgress, {
    message: "Preparing the visual direction for the gallery image.",
    progress: 18,
    status: "running",
    step: "preparing_prompt",
  });

  const prompt = buildGalleryImagePrompt({
    body,
    summary,
    title,
    visualBrief,
  });

  await reportProgress(input.onProgress, {
    message: "Creative brief is ready. Starting gallery image generation.",
    progress: 28,
    status: "completed",
    step: "preparing_prompt",
  });

  await reportProgress(input.onProgress, {
    message: "Generating the AI gallery image with Replicate.",
    progress: 42,
    status: "running",
    step: "generating_image",
  });

  const replicate = new Replicate({ auth: replicateToken });
  const rawOutput = await replicate.run(DEFAULT_MODEL, {
    input: {
      aspect_ratio: DEFAULT_ASPECT_RATIO,
      output_format: DEFAULT_OUTPUT_FORMAT,
      output_quality: DEFAULT_OUTPUT_QUALITY,
      safety_tolerance: 5,
      prompt,
    },
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
    "generated-gallery",
    `${Date.now()}-${sanitizeBaseName(
      title || summary || visualBrief || "ai-gallery-image",
    )}${extension}`,
  ].join("/");

  await reportProgress(input.onProgress, {
    message: "Uploading the gallery image to your studio assets.",
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
    message: "Gallery image uploaded. Finalizing the result.",
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
