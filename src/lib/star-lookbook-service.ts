import "server-only";

import { randomUUID } from "crypto";
import { createFalClient } from "@fal-ai/client";
import { put } from "@vercel/blob";

/**
 * Star Lookbook Service ("AI 스타 룩북 스튜디오")
 *
 * style-room.ai-style garment fitting, powered by fanletter's AI stars.
 * A seller supplies one or more clothing photos; this puts the garment on a
 * chosen AI star and renders a Korean fashion e-commerce lookbook shot.
 *
 * This module is intentionally self-contained (own fal client, own blob upload,
 * own env reads) so it can ship additively without touching the shared content
 * image pipeline. It reuses the same `fal-ai/nano-banana-2/edit` multi-reference
 * model that `content-gallery-image-service.ts` already depends on — the only
 * difference is that the garment must be PRESERVED, not replaced.
 */

const DEFAULT_MODEL = "fal-ai/nano-banana-2/edit";
const DEFAULT_ASPECT_RATIO: StarLookbookAspectRatio = "4:5";
const DEFAULT_RESOLUTION: StarLookbookResolution = "2K";
const DEFAULT_OUTPUT_FORMAT = "png";
const DEFAULT_SAFETY_TOLERANCE: FalImageSafetyTolerance = "2";
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 30_000;
const MAX_GARMENT_IMAGES = 4;
const MAX_NUM_IMAGES = 4;
const SCENE_BRIEF_LIMIT = 600;
const STAR_NAME_LIMIT = 80;
const AVATAR_URL_LIMIT = 1_000;

export type StarLookbookAspectRatio =
  | "auto"
  | "1:1"
  | "3:4"
  | "4:5"
  | "2:3"
  | "9:16";

export type StarLookbookResolution = "1K" | "2K" | "4K";

type FalImageSafetyTolerance = "1" | "2" | "3" | "4" | "5" | "6";

type FalNanoBananaEditInput = {
  aspect_ratio: StarLookbookAspectRatio;
  image_urls: string[];
  limit_generations: boolean;
  num_images: number;
  output_format: "jpeg" | "png" | "webp";
  prompt: string;
  resolution: StarLookbookResolution;
  safety_tolerance: FalImageSafetyTolerance;
};

type FalImageFile = { content_type?: string; url: string };
type FalImageOutput = { images?: FalImageFile[] };

export type GenerateStarLookbookInput = {
  /** AI star identity anchor (the first reference image). */
  starAvatarUrl: string;
  /** One or more seller clothing/product photos to reproduce on the star. */
  garmentImageUrls: string[];
  /** Optional scene/background brief, e.g. "성수동 카페, 자연광, full body". */
  sceneBrief?: string | null;
  /** Optional star name, used for prompt flavor and asset filenames. */
  starName?: string | null;
  aspectRatio?: StarLookbookAspectRatio;
  resolution?: StarLookbookResolution;
  /** Number of lookbook shots to render (1-4). */
  numImages?: number;
  /** Owning member referral code — used for the blob asset path. */
  referralCode: string;
  memberEmail: string;
};

export type GeneratedLookbookImage = {
  url: string;
  pathname: string;
  contentType: string;
  sourceUrl: string | null;
};

function trimToLength(value: string | null | undefined, limit: number) {
  return value?.trim().slice(0, limit) ?? "";
}

function clampInt(value: number | undefined, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(value)));
}

function resolveModelName() {
  const model = process.env.FAL_LOOKBOOK_MODEL?.trim() || DEFAULT_MODEL;

  if (!/^[^/\s]+\/[^/\s]+(?:\/[^/\s]+)*$/.test(model)) {
    throw new Error(
      "FAL_LOOKBOOK_MODEL must use owner/model or owner/model/path format.",
    );
  }

  return model;
}

function sanitizeBaseName(name: string) {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return normalized || "star-lookbook";
}

function resolveFileExtension(contentType: string, sourceUrl: string | null) {
  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  if (contentType === "image/jpeg") return ".jpg";

  if (sourceUrl) {
    try {
      const pathname = new URL(sourceUrl).pathname.toLowerCase();
      if (pathname.endsWith(".png")) return ".png";
      if (pathname.endsWith(".webp")) return ".webp";
      if (pathname.endsWith(".jpeg")) return ".jpeg";
      if (pathname.endsWith(".jpg")) return ".jpg";
    } catch {}
  }

  return ".png";
}

/**
 * The garment-preserving fitting prompt — the heart of the lookbook module.
 *
 * The first reference image is the model identity (the AI star); every other
 * reference image is the garment, which must be reproduced exactly. This is the
 * deliberate inverse of the content pipeline's "do not copy the clothing" rule.
 */
function createFittingPrompt({
  garmentCount,
  sceneBrief,
  starName,
}: {
  garmentCount: number;
  sceneBrief: string;
  starName: string;
}) {
  const plural = garmentCount > 1;
  const sceneText =
    sceneBrief ||
    "a clean, well-lit Korean fashion lookbook setting with soft natural daylight and a trendy Seoul backdrop (e.g. a Seongsu-dong cafe or Hannam-dong street)";

  return [
    "Create one photorealistic Korean fashion e-commerce lookbook photo.",
    "Identity source: use the FIRST reference image only as the model's identity. Preserve the exact same face, facial structure, hairstyle, hair color, skin tone, and body proportions. The model is a single consistent fictional adult.",
    `Garment source: take the clothing item${plural ? "s" : ""} from the remaining reference image${plural ? "s" : ""} and show ${plural ? "them" : "it"} worn by the model.`,
    "Reproduce the garment with pixel-level fidelity: keep the exact color, fabric texture, weave, pattern, print, graphics, logos, stitching, buttons, zippers, neckline, collar, sleeve length, hem length, silhouette, and fit. Do not redesign, recolor, restyle, add, or remove any garment detail.",
    `Scene: ${sceneText}. Natural, flattering full-body or three-quarter pose with the complete outfit clearly visible. Commercial fashion photography quality, sharp focus on the garment, realistic lighting and shadows.`,
    starName ? `The model is the AI star "${starName}".` : "",
    "Single person only. Realistic human anatomy and proportions. No text overlays, no watermarks, no extra accessories that were not in the garment references.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new Error(
              `${label} timed out after ${Math.round(timeoutMs / 1000)} seconds.`,
            ),
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function collectFalImageFiles(output: unknown): FalImageFile[] {
  if (!output || typeof output !== "object") {
    return [];
  }

  const images = (output as FalImageOutput).images;

  if (!Array.isArray(images)) {
    return [];
  }

  return images.filter(
    (image): image is FalImageFile =>
      Boolean(image) && typeof (image as FalImageFile).url === "string",
  );
}

async function uploadLookbookImage({
  baseName,
  image,
  referralCode,
}: {
  baseName: string;
  image: FalImageFile;
  referralCode: string;
}): Promise<GeneratedLookbookImage> {
  const response = await withTimeout(
    fetch(image.url, { method: "GET" }),
    DEFAULT_DOWNLOAD_TIMEOUT_MS,
    "lookbook image download",
  );

  if (!response.ok) {
    throw new Error(
      `fal returned an unreadable lookbook image URL (${response.status}).`,
    );
  }

  const blob = await response.blob();
  const contentType = blob.type || image.content_type || "image/png";
  const extension = resolveFileExtension(contentType, image.url);
  const pathname = [
    "fanletter-lookbook",
    referralCode,
    `${Date.now()}-${baseName}-${randomUUID().slice(0, 8)}${extension}`,
  ].join("/");

  const uploaded = await put(pathname, blob, {
    access: "public",
    addRandomSuffix: true,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
    contentType,
  });

  return {
    contentType: uploaded.contentType,
    pathname: uploaded.pathname,
    sourceUrl: image.url,
    url: uploaded.url,
  };
}

export async function generateStarLookbook(
  input: GenerateStarLookbookInput,
): Promise<GeneratedLookbookImage[]> {
  const falKey = process.env.FAL_KEY?.trim();

  if (!falKey) {
    throw new Error("FAL_KEY is not configured.");
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }

  const starAvatarUrl = trimToLength(input.starAvatarUrl, AVATAR_URL_LIMIT);

  if (!starAvatarUrl) {
    throw new Error("starAvatarUrl is required to anchor the AI star identity.");
  }

  const garmentImageUrls = (input.garmentImageUrls ?? [])
    .map((url) => trimToLength(url, AVATAR_URL_LIMIT))
    .filter(Boolean)
    .slice(0, MAX_GARMENT_IMAGES);

  if (garmentImageUrls.length === 0) {
    throw new Error("At least one garment image is required.");
  }

  if (!input.referralCode?.trim()) {
    throw new Error("referralCode is required.");
  }

  const starName = trimToLength(input.starName, STAR_NAME_LIMIT);
  const sceneBrief = trimToLength(input.sceneBrief, SCENE_BRIEF_LIMIT);
  const numImages = clampInt(input.numImages, 1, MAX_NUM_IMAGES, 1);
  const aspectRatio = input.aspectRatio ?? DEFAULT_ASPECT_RATIO;
  const resolution = input.resolution ?? DEFAULT_RESOLUTION;
  const model = resolveModelName();

  const prompt = createFittingPrompt({
    garmentCount: garmentImageUrls.length,
    sceneBrief,
    starName,
  });

  const modelInput: FalNanoBananaEditInput = {
    aspect_ratio: aspectRatio,
    // First image = AI star identity, remaining = garments to preserve.
    image_urls: [starAvatarUrl, ...garmentImageUrls],
    limit_generations: true,
    num_images: numImages,
    output_format: DEFAULT_OUTPUT_FORMAT,
    prompt,
    resolution,
    safety_tolerance: DEFAULT_SAFETY_TOLERANCE,
  };

  const fal = createFalClient({ credentials: falKey });
  const result = await fal.subscribe(model, {
    input: modelInput,
    logs: true,
    mode: "polling",
    pollInterval: 1000,
    timeout: DEFAULT_TIMEOUT_MS,
  });

  const images = collectFalImageFiles(result.data);

  if (images.length === 0) {
    throw new Error("fal returned no lookbook images.");
  }

  const baseName = sanitizeBaseName(starName || "star-lookbook");

  return Promise.all(
    images.map((image) =>
      uploadLookbookImage({ baseName, image, referralCode: input.referralCode }),
    ),
  );
}
