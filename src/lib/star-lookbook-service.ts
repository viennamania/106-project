import "server-only";

import { randomUUID } from "crypto";
import { put } from "@vercel/blob";

/**
 * Star Lookbook Service ("AI 스타 룩북 스튜디오")
 *
 * style-room.ai-style garment fitting, powered by fanletter's AI stars.
 * A seller supplies one or more clothing photos; this puts the garment on a
 * chosen AI star and renders a Korean fashion e-commerce lookbook shot.
 *
 * Generation uses OpenAI's image EDIT endpoint (`/v1/images/edits`), which
 * accepts multiple input images + a prompt and composites them. The first image
 * is the AI star (identity); the rest are the garment(s) to reproduce. We use
 * OpenAI here because the production OPENAI_API_KEY already powers content cover
 * generation, whereas the fal multi-image edit models were not accessible to the
 * production FAL_KEY (403).
 */

const OPENAI_EDITS_ENDPOINT = "https://api.openai.com/v1/images/edits";
const DEFAULT_ASPECT_RATIO: StarLookbookAspectRatio = "4:5";
const DEFAULT_QUALITY = "high";
const DEFAULT_MODEL = "gpt-image-1";
const MAX_GARMENT_IMAGES = 4;
const MAX_NUM_IMAGES = 4;
const SCENE_BRIEF_LIMIT = 600;
const STAR_NAME_LIMIT = 80;
const AVATAR_URL_LIMIT = 1_000;
const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 30_000;

export type StarLookbookAspectRatio =
  | "auto"
  | "1:1"
  | "3:4"
  | "4:5"
  | "2:3"
  | "9:16";

// Kept for API/route compatibility. OpenAI image edits derive size from the
// aspect ratio rather than a 1K/2K/4K resolution, so this value is accepted but
// not forwarded to the provider.
export type StarLookbookResolution = "1K" | "2K" | "4K";

type OpenAiImageEditResponse = {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string };
};

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

function resolveModel() {
  return process.env.OPENAI_LOOKBOOK_MODEL?.trim() || DEFAULT_MODEL;
}

function resolveQuality() {
  return process.env.OPENAI_LOOKBOOK_QUALITY?.trim() || DEFAULT_QUALITY;
}

/** Map the requested aspect ratio to an OpenAI image size. */
function resolveOpenAiSize(aspectRatio: StarLookbookAspectRatio) {
  if (aspectRatio === "1:1") {
    return "1024x1024";
  }

  if (aspectRatio === "auto") {
    return "auto";
  }

  // 4:5, 3:4, 2:3, 9:16 → portrait
  return "1024x1536";
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

function extensionForContentType(contentType: string) {
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return ".jpg";
  return ".png";
}

/**
 * A lookbook is a SET of shots, not one image. Each shot reuses the same star +
 * garment but varies the framing/pose so a seller gets a ready-to-use set.
 * Ordered by importance; the first N are used for an N-shot set.
 */
const SHOT_TYPES: { id: string; instruction: string }[] = [
  {
    id: "full-front",
    instruction:
      "Full-body front view, model standing and facing the camera, the entire outfit visible from head to toe.",
  },
  {
    id: "three-quarter",
    instruction:
      "Three-quarter angle full-body view, body turned slightly with a natural, relaxed fashion pose.",
  },
  {
    id: "waist-up-detail",
    instruction:
      "Waist-up shot focusing on the upper garment — show fabric texture, neckline and stitching detail in sharp focus.",
  },
  {
    id: "sitting-lifestyle",
    instruction:
      "Seated lifestyle shot with a relaxed candid pose, the full outfit still clearly visible.",
  },
];

/**
 * The garment-preserving fitting prompt — the heart of the lookbook module.
 *
 * The first reference image is the model identity (the AI star); every other
 * reference image is the garment, which must be reproduced exactly.
 */
function createFittingPrompt({
  garmentCount,
  sceneBrief,
  shotInstruction,
  starName,
}: {
  garmentCount: number;
  sceneBrief: string;
  shotInstruction: string;
  starName: string;
}) {
  const plural = garmentCount > 1;
  const sceneText =
    sceneBrief ||
    "a clean, well-lit Korean fashion lookbook setting with soft natural daylight and a trendy Seoul backdrop (e.g. a Seongsu-dong cafe or Hannam-dong street)";

  return [
    "Create one photorealistic Korean fashion e-commerce lookbook photo.",
    "Identity source: use the FIRST input image only as the model's identity. Preserve the exact same face, facial structure, hairstyle, hair color, skin tone, and body proportions. The model is a single consistent fictional adult — keep the SAME model across every shot.",
    `Garment source: take the clothing item${plural ? "s" : ""} from the remaining input image${plural ? "s" : ""} and show ${plural ? "them" : "it"} worn by the model.`,
    "Reproduce the garment with high fidelity: keep the exact color, fabric texture, weave, pattern, print, graphics, logos, stitching, buttons, zippers, neckline, collar, sleeve length, hem length, silhouette, and fit. Do not redesign, recolor, restyle, add, or remove any garment detail.",
    `Scene: ${sceneText}. Commercial fashion photography quality, sharp focus on the garment, realistic lighting and shadows.`,
    `Shot: ${shotInstruction}`,
    starName ? `The model is the AI star "${starName}".` : "",
    "Single person only. Realistic human anatomy and proportions. No text overlays, no watermarks.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function withTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  label: string,
) {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      run(controller.signal),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          // Abort the underlying request so a timed-out fetch doesn't keep the
          // socket open / keep buffering the body in the background.
          controller.abort();
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

async function fetchInputImage(
  url: string,
  index: number,
): Promise<{ blob: Blob; filename: string }> {
  const response = await withTimeout(
    (signal) => fetch(url, { method: "GET", signal }),
    DEFAULT_DOWNLOAD_TIMEOUT_MS,
    "input image download",
  );

  if (!response.ok) {
    throw new Error(
      `Could not read an input image (${response.status}). Make sure the star & garment image URLs are publicly reachable.`,
    );
  }

  const blob = await response.blob();
  const contentType = blob.type || "image/png";
  const filename = `image-${index}${extensionForContentType(contentType)}`;

  return { blob, filename };
}

function normalizeOpenAiError(message: string, model: string): Error {
  const detail = `(model: ${model})`;

  if (/safety|moderation|content policy|rejected/i.test(message)) {
    return new Error(
      `OpenAI safety filter rejected the request ${detail}. Try a more neutral scene description.`,
    );
  }

  if (/model|not found|does not exist|access|permission|unsupported/i.test(message)) {
    return new Error(
      `OpenAI rejected the model ${detail}: ${message}. Set OPENAI_LOOKBOOK_MODEL to an image-edit-capable model the key can use.`,
    );
  }

  return new Error(`OpenAI lookbook generation failed ${detail}: ${message}`);
}

async function uploadLookbookImage({
  baseName,
  imageBase64,
  referralCode,
}: {
  baseName: string;
  imageBase64: string;
  referralCode: string;
}): Promise<GeneratedLookbookImage> {
  const bytes = Buffer.from(imageBase64, "base64");
  const pathname = [
    "fanletter-lookbook",
    referralCode,
    `${Date.now()}-${baseName}-${randomUUID().slice(0, 8)}.png`,
  ].join("/");

  const uploaded = await put(
    pathname,
    new Blob([bytes], { type: "image/png" }),
    {
      access: "public",
      addRandomSuffix: true,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
      contentType: "image/png",
    },
  );

  return {
    contentType: uploaded.contentType,
    pathname: uploaded.pathname,
    sourceUrl: null,
    url: uploaded.url,
  };
}

export async function generateStarLookbook(
  input: GenerateStarLookbookInput,
): Promise<GeneratedLookbookImage[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
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
  const model = resolveModel();

  const size = resolveOpenAiSize(aspectRatio);
  const quality = resolveQuality();
  const inputFidelity =
    process.env.OPENAI_LOOKBOOK_INPUT_FIDELITY?.trim() || "high";

  // First image = AI star identity, remaining = garments to preserve. Fetch the
  // inputs once and reuse the blobs across every shot in the set.
  const inputImages = await Promise.all(
    [starAvatarUrl, ...garmentImageUrls].map((url, index) =>
      fetchInputImage(url, index),
    ),
  );

  // A lookbook is a SET: generate one image per shot type, in parallel, so the
  // seller gets distinct framings (front / three-quarter / detail / lifestyle)
  // of the SAME star wearing the SAME garment — not near-duplicate poses.
  const shots = SHOT_TYPES.slice(0, numImages);

  async function generateShot(shotInstruction: string): Promise<string> {
    const form = new FormData();
    form.append("model", model);
    form.append(
      "prompt",
      createFittingPrompt({
        garmentCount: garmentImageUrls.length,
        sceneBrief,
        shotInstruction,
        starName,
      }),
    );
    form.append("size", size);
    form.append("quality", quality);
    form.append("n", "1");
    // Preserve the star's face + the garment's color/print/logo from the inputs.
    form.append("input_fidelity", inputFidelity);

    for (const image of inputImages) {
      form.append("image[]", image.blob, image.filename);
    }

    const response = await withTimeout(
      (signal) =>
        fetch(OPENAI_EDITS_ENDPOINT, {
          body: form,
          headers: { Authorization: `Bearer ${apiKey}` },
          method: "POST",
          signal,
        }),
      DEFAULT_TIMEOUT_MS,
      "OpenAI lookbook generation",
    );

    const payload = (await response
      .json()
      .catch(() => null)) as OpenAiImageEditResponse | null;

    if (!response.ok) {
      throw normalizeOpenAiError(
        payload?.error?.message || `status ${response.status}`,
        model,
      );
    }

    const b64 = payload?.data?.[0]?.b64_json;

    if (!b64) {
      throw new Error("OpenAI returned no lookbook image.");
    }

    return b64;
  }

  const imageBase64List = await Promise.all(
    shots.map((shot) => generateShot(shot.instruction)),
  );

  const baseName = sanitizeBaseName(starName || "star-lookbook");

  return Promise.all(
    imageBase64List.map((imageBase64) =>
      uploadLookbookImage({ baseName, imageBase64, referralCode: input.referralCode }),
    ),
  );
}
