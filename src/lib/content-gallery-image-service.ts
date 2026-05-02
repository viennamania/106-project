import "server-only";

import { createFalClient } from "@fal-ai/client";
import { put } from "@vercel/blob";
import Replicate, { type FileOutput } from "replicate";

import {
  CONTENT_IMAGE_VISUAL_BRIEF_LIMIT,
  type CreatorCharacterPersona,
  type ContentCoverGenerationProgressStep,
  type ContentPostGenerateCoverProgressEvent,
} from "@/lib/content";
import { applyCreatorCharacterPersonaToPrompt } from "@/lib/creator-character-prompt";

const TITLE_LIMIT = 120;
const SUMMARY_LIMIT = 240;
const DEFAULT_MODEL = "black-forest-labs/flux-2-klein-9b";
const DEFAULT_FAL_REFERENCE_MODEL = "fal-ai/nano-banana-2/edit";
const DEFAULT_ASPECT_RATIO = "4:5";
const DEFAULT_FAL_REFERENCE_ASPECT_RATIO = "4:5";
const DEFAULT_FAL_REFERENCE_RESOLUTION = "1K";
const DEFAULT_MEGAPIXELS = "2";
const DEFAULT_OUTPUT_FORMAT = "png";
const DEFAULT_OUTPUT_QUALITY = 100;
const DEFAULT_DISABLE_SAFETY_CHECKER = true;
const DEFAULT_FAL_SAFETY_TOLERANCE = "6";

type Flux2KleinAspectRatio =
  | "1:1"
  | "16:9"
  | "9:16"
  | "3:2"
  | "2:3"
  | "4:3"
  | "3:4"
  | "5:4"
  | "4:5"
  | "21:9"
  | "9:21"
  | "match_input_image";

type Flux2KleinMegapixels = "0.25" | "0.5" | "1" | "2" | "4";

type Flux2KleinInput = {
  aspect_ratio?: Flux2KleinAspectRatio;
  disable_safety_checker?: boolean;
  go_fast?: boolean;
  images?: string[];
  megapixels?: Flux2KleinMegapixels;
  output_format?: "webp" | "jpg" | "png";
  output_quality?: number;
  prompt: string;
  seed?: number;
};

type FalImageModelFamily = "flux-kontext" | "nano-banana-edit";

type FalImageModelName = `${string}/${string}${string}`;

type FalNanoBananaAspectRatio =
  | "auto"
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
  | "4:1"
  | "1:4"
  | "8:1"
  | "1:8";

type FalNanoBananaResolution = "0.5K" | "1K" | "2K" | "4K";

type FalImageSafetyTolerance = "1" | "2" | "3" | "4" | "5" | "6";

type FalNanoBananaEditInput = {
  aspect_ratio: FalNanoBananaAspectRatio;
  image_urls: string[];
  limit_generations: boolean;
  num_images: number;
  output_format: "jpeg" | "png" | "webp";
  prompt: string;
  resolution: FalNanoBananaResolution;
  safety_tolerance: FalImageSafetyTolerance;
};

type FalFluxKontextResolutionMode =
  | "auto"
  | "match_input"
  | "1:1"
  | "16:9"
  | "21:9"
  | "3:2"
  | "2:3"
  | "4:5"
  | "5:4"
  | "3:4"
  | "4:3"
  | "9:16"
  | "9:21";

type FalFluxKontextInput = {
  acceleration: "none" | "regular" | "high";
  enable_safety_checker: boolean;
  image_url: string;
  num_images: number;
  output_format: "jpeg" | "png";
  prompt: string;
  resolution_mode: FalFluxKontextResolutionMode;
};

type FalReferenceImageInput = FalFluxKontextInput | FalNanoBananaEditInput;

type FalImageFile = {
  content_type?: string;
  url: string;
};

type FalImageOutput = {
  description?: string | null;
  images?: FalImageFile[];
  prompt?: string | null;
};

export type GenerateContentGalleryImageInput = {
  avatarImageUrl?: string | null;
  characterPersona?: CreatorCharacterPersona | null;
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

function resolveFalReferenceModelName(): FalImageModelName {
  const model =
    process.env.FAL_CONTENT_IMAGE_REFERENCE_MODEL?.trim() ||
    process.env.FAL_CONTENT_IMAGE_MODEL?.trim() ||
    DEFAULT_FAL_REFERENCE_MODEL;

  if (!/^[^/\s]+\/[^/\s]+(?:\/[^/\s]+)*$/.test(model)) {
    throw new Error(
      "FAL_CONTENT_IMAGE_REFERENCE_MODEL must use owner/model or owner/model/path format.",
    );
  }

  return model as FalImageModelName;
}

function resolveFalImageModelFamily(
  model: FalImageModelName,
): FalImageModelFamily {
  return model.includes("flux-kontext") ? "flux-kontext" : "nano-banana-edit";
}

function createReferenceIdentityPrompt(prompt: string) {
  return [
    "Use the reference avatar only as the identity anchor for the main person: preserve the same face, facial structure, hair identity, skin tone, and overall presence.",
    "Create a new content image from the scene prompt. Do not copy the avatar background, crop, pose, or clothing unless the scene prompt explicitly asks for it.",
    prompt,
  ].join("\n\n");
}

function createFalReferenceImageInput({
  avatarImageUrl,
  model,
  prompt,
}: {
  avatarImageUrl: string;
  model: FalImageModelName;
  prompt: string;
}): FalReferenceImageInput {
  const modelFamily = resolveFalImageModelFamily(model);
  const referencePrompt = createReferenceIdentityPrompt(prompt);

  if (modelFamily === "flux-kontext") {
    const outputFormat = parseEnum(
      process.env.FAL_CONTENT_IMAGE_OUTPUT_FORMAT,
      ["jpeg", "png"] as const,
      "png",
    );
    const resolutionMode = parseEnum(
      process.env.FAL_CONTENT_IMAGE_ASPECT_RATIO,
      [
        "auto",
        "match_input",
        "1:1",
        "16:9",
        "21:9",
        "3:2",
        "2:3",
        "4:5",
        "5:4",
        "3:4",
        "4:3",
        "9:16",
        "9:21",
      ] as const,
      DEFAULT_FAL_REFERENCE_ASPECT_RATIO,
    );

    return {
      acceleration: parseEnum(
        process.env.FAL_CONTENT_IMAGE_ACCELERATION,
        ["none", "regular", "high"] as const,
        "none",
      ),
      enable_safety_checker: parseBoolean(
        process.env.FAL_CONTENT_IMAGE_ENABLE_SAFETY_CHECKER,
        false,
      ),
      image_url: avatarImageUrl,
      num_images: 1,
      output_format: outputFormat,
      prompt: referencePrompt,
      resolution_mode: resolutionMode,
    };
  }

  return {
    aspect_ratio: parseEnum(
      process.env.FAL_CONTENT_IMAGE_ASPECT_RATIO,
      [
        "auto",
        "21:9",
        "16:9",
        "3:2",
        "4:3",
        "5:4",
        "1:1",
        "4:5",
        "3:4",
        "2:3",
        "9:16",
        "4:1",
        "1:4",
        "8:1",
        "1:8",
      ] as const,
      DEFAULT_FAL_REFERENCE_ASPECT_RATIO,
    ),
    image_urls: [avatarImageUrl],
    limit_generations: true,
    num_images: 1,
    output_format: parseEnum(
      process.env.FAL_CONTENT_IMAGE_OUTPUT_FORMAT,
      ["jpeg", "png", "webp"] as const,
      DEFAULT_OUTPUT_FORMAT,
    ),
    prompt: referencePrompt,
    resolution: parseEnum(
      process.env.FAL_CONTENT_IMAGE_RESOLUTION,
      ["0.5K", "1K", "2K", "4K"] as const,
      DEFAULT_FAL_REFERENCE_RESOLUTION,
    ),
    safety_tolerance: parseEnum(
      process.env.FAL_CONTENT_IMAGE_SAFETY_TOLERANCE ||
        process.env.FAL_CONTENT_VIDEO_SAFETY_TOLERANCE,
      ["1", "2", "3", "4", "5", "6"] as const,
      DEFAULT_FAL_SAFETY_TOLERANCE,
    ),
  };
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

function isFalImageFile(value: unknown): value is FalImageFile {
  if (!value || typeof value !== "object") {
    return false;
  }

  return "url" in value && typeof (value as FalImageFile).url === "string";
}

function getFalImageFile(output: unknown): FalImageFile {
  if (isFalImageFile(output)) {
    return output;
  }

  if (output && typeof output === "object" && "images" in output) {
    const [image] = (output as FalImageOutput).images ?? [];

    if (isFalImageFile(image)) {
      return image;
    }
  }

  throw new Error("fal returned an unsupported image payload.");
}

async function readFalImageOutputFile(
  output: unknown,
): Promise<{ blob: Blob; sourceUrl: string | null }> {
  const image = getFalImageFile(output);
  const response = await fetch(image.url, { method: "GET" });

  if (!response.ok) {
    throw new Error(`fal returned an unreadable output URL (${response.status}).`);
  }

  return {
    blob: await response.blob(),
    sourceUrl: image.url,
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

export async function generateAndUploadContentGalleryImage(
  input: GenerateContentGalleryImageInput,
): Promise<GeneratedContentGalleryImage> {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }

  const avatarImageUrl = trimToLength(input.avatarImageUrl, 500);
  const falKey = process.env.FAL_KEY?.trim();
  const replicateToken = process.env.REPLICATE_API_TOKEN?.trim();

  if (!replicateToken && !(avatarImageUrl && falKey)) {
    throw new Error("FAL_KEY or REPLICATE_API_TOKEN is not configured.");
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

  const prompt = applyCreatorCharacterPersonaToPrompt(
    visualBrief,
    input.characterPersona,
  );

  await reportProgress(input.onProgress, {
    message: "Image prompt is ready. Starting content image generation.",
    progress: 28,
    status: "completed",
    step: "preparing_prompt",
  });

  let blob: Blob;
  let sourceUrl: string | null;

  if (avatarImageUrl && falKey) {
    const model = resolveFalReferenceModelName();

    await reportProgress(input.onProgress, {
      message: "Generating the AI content image with a persona avatar reference.",
      progress: 42,
      status: "running",
      step: "generating_image",
    });

    const fal = createFalClient({ credentials: falKey });
    const modelInput = createFalReferenceImageInput({
      avatarImageUrl,
      model,
      prompt,
    });
    const result = await fal.subscribe(model, {
      input: modelInput,
      logs: true,
      mode: "polling",
      pollInterval: 1000,
    });
    const falOutput = await readFalImageOutputFile(result.data);

    blob = falOutput.blob;
    sourceUrl = falOutput.sourceUrl;
  } else {
    await reportProgress(input.onProgress, {
      message: "Generating the AI content image with Replicate.",
      progress: 42,
      status: "running",
      step: "generating_image",
    });

    const replicate = new Replicate({ auth: replicateToken });
    const modelInput = {
      aspect_ratio: DEFAULT_ASPECT_RATIO,
      disable_safety_checker: DEFAULT_DISABLE_SAFETY_CHECKER,
      go_fast: false,
      megapixels: DEFAULT_MEGAPIXELS,
      output_format: DEFAULT_OUTPUT_FORMAT,
      output_quality: DEFAULT_OUTPUT_QUALITY,
      prompt,
    } satisfies Flux2KleinInput;

    const rawOutput = await replicate.run(DEFAULT_MODEL, {
      input: modelInput,
    });
    const replicateOutput = await readReplicateOutputFile(rawOutput);

    blob = replicateOutput.blob;
    sourceUrl = replicateOutput.sourceUrl;
  }

  await reportProgress(input.onProgress, {
    message: "AI image created. Preparing upload.",
    progress: 74,
    status: "completed",
    step: "generating_image",
  });

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
    revisedPrompt: prompt === visualBrief ? null : prompt,
    url: uploaded.url,
  };
}
