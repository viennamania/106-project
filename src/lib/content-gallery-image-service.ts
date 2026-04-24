import "server-only";

import { put } from "@vercel/blob";
import Replicate, { type FileOutput } from "replicate";

import type {
  ContentCoverGenerationProgressStep,
  ContentPostGenerateCoverProgressEvent,
} from "@/lib/content";

const TITLE_LIMIT = 120;
const SUMMARY_LIMIT = 240;
const BODY_LIMIT = 220;
const VISUAL_BRIEF_LIMIT = 320;
const DEFAULT_MODEL = "black-forest-labs/flux-dev";
const DEFAULT_ASPECT_RATIO = "4:5";
const DEFAULT_OUTPUT_FORMAT = "png";
const DEFAULT_OUTPUT_QUALITY = 100;
const DEFAULT_NUM_INFERENCE_STEPS = 28;
const DEFAULT_GUIDANCE = 3.5;

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
    "Create one premium editorial gallery image for a creator content detail page.",
    "This image should feel like a polished magazine still: high-end, cinematic, photoreal, elegant, and visually focused.",
    "Follow the creator visual request as the highest priority when it specifies framing, subject distance, pose, or composition.",
    "Use a single dominant subject or a very clear focal composition. Avoid cluttered storytelling, collage layouts, split panels, tiny background characters, or trying to visualize every sentence literally.",
    "Use a clear, polished editorial composition with the requested subject fully represented.",
    "Do not crop important subject details requested by the creator, such as full body, hands, feet, clothing, props, or background.",
    "Lighting should be refined and believable with rich materials, strong texture fidelity, realistic anatomy, premium depth, and controlled contrast.",
    "Do not include any text, typography, letters, numbers, logos, watermarks, borders, frames, UI chrome, subtitles, or poster layout elements.",
    "Avoid low-detail faces, duplicate people, extra limbs, distorted hands, blurry eyes, warped anatomy, muddy lighting, oversaturated colors, cheap CGI feel, or generic stock-photo composition.",
    "If people appear, keep the styling tasteful, non-explicit, fully clothed, and fashion-editorial rather than provocative.",
    input.title ? `Primary concept: ${input.title}.` : null,
    input.summary ? `Tone and scene direction: ${input.summary}.` : null,
    input.visualBrief ? `Creator visual request: ${input.visualBrief}.` : null,
    input.body
      ? `Background thematic context only, not literal scene instructions: ${input.body}.`
      : null,
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
      disable_safety_checker: true,
      guidance: DEFAULT_GUIDANCE,
      num_inference_steps: DEFAULT_NUM_INFERENCE_STEPS,
      output_format: DEFAULT_OUTPUT_FORMAT,
      output_quality: DEFAULT_OUTPUT_QUALITY,
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
