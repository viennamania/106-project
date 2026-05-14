import "server-only";

import { randomUUID } from "crypto";
import { createFalClient } from "@fal-ai/client";
import { put } from "@vercel/blob";
import Replicate, { type FileOutput } from "replicate";

import {
  CONTENT_IMAGE_VISUAL_BRIEF_LIMIT,
  type ContentImageGenerationAttemptDocument,
  type ContentImageGenerationProvider,
  type CreatorCharacterPersona,
  type ContentCoverGenerationProgressStep,
  type ContentPostGenerateCoverProgressEvent,
} from "@/lib/content";
import { applyCreatorCharacterPersonaToPrompt } from "@/lib/creator-character-prompt";
import { applyImagePhotoQualityPreset } from "@/lib/image-prompt-quality";
import { getContentImageGenerationsCollection } from "@/lib/mongodb";

const TITLE_LIMIT = 120;
const SUMMARY_LIMIT = 240;
const DEFAULT_MODEL = "black-forest-labs/flux-2-dev";
const DEFAULT_FAL_TEXT_MODEL = "fal-ai/flux-pro/v1.1-ultra";
const DEFAULT_FAL_REFERENCE_MODEL = "fal-ai/nano-banana-2/edit";
const DEFAULT_ASPECT_RATIO = "4:5";
const DEFAULT_FAL_TEXT_ASPECT_RATIO = "3:4";
const DEFAULT_FAL_REFERENCE_ASPECT_RATIO = "4:5";
const DEFAULT_FAL_REFERENCE_RESOLUTION = "1K";
const DEFAULT_FAL_TEXT_IMAGE_PROMPT_STRENGTH = 0.2;
const DEFAULT_OUTPUT_FORMAT = "png";
const DEFAULT_OUTPUT_QUALITY = 100;
const DEFAULT_DISABLE_SAFETY_CHECKER = true;
const DEFAULT_FAL_SAFETY_TOLERANCE = "6";
const DEFAULT_FAL_TIMEOUT_MS = 90_000;
const DEFAULT_REPLICATE_TIMEOUT_MS = 90_000;
const DEFAULT_REPLICATE_COMPACT_PROMPT_LIMIT = 1_600;
const STRUCTURED_PROMPT_SEGMENT_LIMIT = 48;

type ContentImageProviderPriority = "fal" | "replicate";
type StructuredPromptValue =
  | boolean
  | null
  | number
  | string
  | StructuredPromptValue[]
  | { [key: string]: StructuredPromptValue };

type ReplicateContentImageAspectRatio =
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

type ReplicateContentImageInput = {
  aspect_ratio?: ReplicateContentImageAspectRatio;
  disable_safety_checker?: boolean;
  go_fast?: boolean;
  height?: number;
  input_images?: string[];
  output_format?: "webp" | "jpg" | "png";
  output_quality?: number;
  prompt: string;
  seed?: number;
  width?: number;
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

type FalFluxProUltraAspectRatio =
  | "21:9"
  | "16:9"
  | "4:3"
  | "3:2"
  | "1:1"
  | "2:3"
  | "3:4"
  | "9:16"
  | "9:21";

type FalFluxProUltraInput = {
  aspect_ratio: FalFluxProUltraAspectRatio;
  enhance_prompt: boolean;
  image_prompt_strength?: number;
  image_url?: string;
  num_images: number;
  output_format: "jpeg" | "png";
  prompt: string;
  raw: boolean;
  safety_tolerance: FalImageSafetyTolerance;
  sync_mode: boolean;
};

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

type GeneratedImageFile = { blob: Blob; sourceUrl: string | null };

type ContentImageGenerationAttempt = ContentImageGenerationAttemptDocument;

type ContentImageGenerationRecordPatch = {
  attempts?: ContentImageGenerationAttempt[];
  completedAt?: Date | null;
  contentType?: string | null;
  errorMessage?: string | null;
  pathname?: string | null;
  resultUrl?: string | null;
  sourceUrl?: string | null;
  status?: "failed" | "running" | "succeeded";
};

export type GenerateContentGalleryImageInput = {
  avatarImageUrl?: string | null;
  characterPersona?: CreatorCharacterPersona | null;
  memberEmail: string;
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

function normalizePromptSpacing(value: string) {
  return value
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripPromptWrapper(value: string) {
  const fenced = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (
    ((fenced.startsWith('"') && fenced.endsWith('"')) ||
      (fenced.startsWith("'") && fenced.endsWith("'"))) &&
    ["{", "["].includes(fenced.slice(1).trimStart()[0] ?? "")
  ) {
    return fenced.slice(1, -1).trim();
  }

  return fenced;
}

function parseStructuredPrompt(value: string): StructuredPromptValue | null {
  const normalized = stripPromptWrapper(value);

  if (!["{", "["].includes(normalized[0] ?? "")) {
    return null;
  }

  try {
    const parsed = JSON.parse(normalized) as StructuredPromptValue;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function isStructuredPromptRecord(
  value: StructuredPromptValue,
): value is { [key: string]: StructuredPromptValue } {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function humanizePromptKey(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function structuredPromptPrimitiveToText(value: StructuredPromptValue) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function structuredPromptValueToText(value: StructuredPromptValue): string {
  const primitive = structuredPromptPrimitiveToText(value);

  if (primitive) {
    return primitive;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => structuredPromptValueToText(item))
      .filter(Boolean)
      .join(", ");
  }

  if (isStructuredPromptRecord(value)) {
    return Object.entries(value)
      .map(([key, child]) => {
        const text = structuredPromptValueToText(child);

        return text ? `${humanizePromptKey(key)} ${text}` : "";
      })
      .filter(Boolean)
      .join(", ");
  }

  return "";
}

function shouldSkipStructuredPromptPath(path: string[], hasPersona: boolean) {
  if (!hasPersona) {
    return false;
  }

  const key = path[path.length - 1]?.toLowerCase() ?? "";
  const pathName = path.join(".").toLowerCase();

  if (
    [
      "age",
      "age_range",
      "body",
      "body_type",
      "build",
      "ethnicity",
      "eye_color",
      "eyes",
      "face",
      "facial_features",
      "figure",
      "gender",
      "hair",
      "hair_color",
      "race",
      "skin",
      "skin_tone",
    ].includes(key)
  ) {
    return true;
  }

  return (
    pathName.startsWith("appearance.hair") ||
    pathName.startsWith("appearance.face") ||
    pathName.startsWith("subject.appearance")
  );
}

function collectStructuredPromptSegments({
  hasPersona,
  path,
  segments,
  value,
}: {
  hasPersona: boolean;
  path: string[];
  segments: string[];
  value: StructuredPromptValue;
}) {
  if (segments.length >= STRUCTURED_PROMPT_SEGMENT_LIMIT) {
    return;
  }

  if (shouldSkipStructuredPromptPath(path, hasPersona)) {
    return;
  }

  const primitive = structuredPromptPrimitiveToText(value);

  if (primitive) {
    const label = path.map(humanizePromptKey).filter(Boolean).join(" ");
    segments.push(label ? `${label}: ${primitive}` : primitive);
    return;
  }

  if (Array.isArray(value)) {
    const text = structuredPromptValueToText(value);

    if (text) {
      const label = path.map(humanizePromptKey).filter(Boolean).join(" ");
      segments.push(label ? `${label}: ${text}` : text);
    }

    return;
  }

  if (!isStructuredPromptRecord(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    collectStructuredPromptSegments({
      hasPersona,
      path: [...path, key],
      segments,
      value: child,
    });
  }
}

function rewriteSensitiveImagePromptTerms(value: string) {
  const replacements = [
    [/\b(?:slightly\s+)?seductive\b/gi, "confident editorial"],
    [/\bprovocative\b/gi, "bold editorial"],
    [/\blustful\b/gi, "expressive"],
    [/\b(?:super\s+)?sexy\b/gi, "fashion-forward"],
    [/\bdeep\s+plunge\s+neckline\b/gi, "clean fashion neckline"],
    [/\bplunging\s+neckline\b/gi, "fashion neckline"],
    [/\bcleavage\b/gi, "neckline detail"],
    [/\b(?:strikingly\s+large|very\s+large|huge|big)\s+(?:bust|breasts|chest|hips)\b/gi, "balanced silhouette"],
    [/\bbusty\b/gi, "balanced"],
  ] satisfies Array<[RegExp, string]>;

  return replacements.reduce(
    (normalized, [pattern, replacement]) =>
      normalized.replace(pattern, replacement),
    value,
  );
}

function normalizeContentImagePromptForModel(
  visualBrief: string,
  hasPersona: boolean,
) {
  const structuredPrompt = parseStructuredPrompt(visualBrief);

  if (!structuredPrompt) {
    return trimToLength(
      rewriteSensitiveImagePromptTerms(normalizePromptSpacing(visualBrief)),
      CONTENT_IMAGE_VISUAL_BRIEF_LIMIT,
    );
  }

  const segments: string[] = [];
  collectStructuredPromptSegments({
    hasPersona,
    path: [],
    segments,
    value: structuredPrompt,
  });

  if (segments.length === 0) {
    return trimToLength(
      rewriteSensitiveImagePromptTerms(normalizePromptSpacing(visualBrief)),
      CONTENT_IMAGE_VISUAL_BRIEF_LIMIT,
    );
  }

  const identityInstruction = hasPersona
    ? "Use the selected creator persona and avatar as the only identity source for the main person."
    : "Use the described main person.";
  const normalized = [
    "Generate one realistic vertical editorial content image.",
    identityInstruction,
    ...segments,
  ].join(" ");

  return trimToLength(
    rewriteSensitiveImagePromptTerms(normalizePromptSpacing(normalized)),
    CONTENT_IMAGE_VISUAL_BRIEF_LIMIT,
  );
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

function parseTimeoutMs(value: string | undefined, fallback: number) {
  const parsed = Number(value?.trim());

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(30_000, Math.min(180_000, Math.round(parsed)));
}

function getFalImageTimeoutMs() {
  return parseTimeoutMs(
    process.env.CONTENT_IMAGE_FAL_TIMEOUT_MS ||
      process.env.FAL_CONTENT_IMAGE_TIMEOUT_MS,
    DEFAULT_FAL_TIMEOUT_MS,
  );
}

function getReplicateImageTimeoutMs() {
  return parseTimeoutMs(
    process.env.CONTENT_IMAGE_REPLICATE_TIMEOUT_MS ||
      process.env.REPLICATE_CONTENT_IMAGE_TIMEOUT_MS,
    DEFAULT_REPLICATE_TIMEOUT_MS,
  );
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
) {
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

function resolveFalTextModelName(): FalImageModelName {
  const model =
    process.env.FAL_CONTENT_IMAGE_TEXT_MODEL?.trim() ||
    process.env.FAL_CONTENT_IMAGE_FALLBACK_MODEL?.trim() ||
    DEFAULT_FAL_TEXT_MODEL;

  if (!/^[^/\s]+\/[^/\s]+(?:\/[^/\s]+)*$/.test(model)) {
    throw new Error(
      "FAL_CONTENT_IMAGE_TEXT_MODEL must use owner/model or owner/model/path format.",
    );
  }

  return model as FalImageModelName;
}

function resolveFalImageModelFamily(
  model: FalImageModelName,
): FalImageModelFamily {
  return model.includes("flux-kontext") ? "flux-kontext" : "nano-banana-edit";
}

function resolveImageProviderPriority(): ContentImageProviderPriority {
  const value =
    process.env.CONTENT_IMAGE_PROVIDER_PRIORITY?.trim().toLowerCase() ||
    process.env.FAL_CONTENT_IMAGE_PROVIDER_PRIORITY?.trim().toLowerCase();

  return value === "fal" ? "fal" : "replicate";
}

function createReferenceIdentityPrompt(prompt: string) {
  return [
    "Use the reference avatar only as the identity anchor for the main person: preserve the same face, facial structure, hair identity, skin tone, and overall presence.",
    "Create a new content image from the scene prompt. Do not copy the avatar background, crop, pose, or clothing unless the scene prompt explicitly asks for it.",
    prompt,
  ].join("\n\n");
}

function parseNumberInRange(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value?.trim());

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
}

function getReplicateCompactPromptLimit() {
  return parseNumberInRange(
    process.env.CONTENT_IMAGE_REPLICATE_PROMPT_LIMIT ||
      process.env.REPLICATE_CONTENT_IMAGE_PROMPT_LIMIT,
    DEFAULT_REPLICATE_COMPACT_PROMPT_LIMIT,
    600,
    2_400,
  );
}

function extractUserScenePrompt(prompt: string) {
  const marker = "User scene prompt:";
  const markerIndex = prompt.lastIndexOf(marker);

  return markerIndex >= 0
    ? prompt.slice(markerIndex + marker.length).trim()
    : prompt.trim();
}

function createReplicateCompactPrompt({
  avatarImageUrl,
  characterPersona,
  finalPrompt,
  normalizedPrompt,
}: {
  avatarImageUrl: string;
  characterPersona?: CreatorCharacterPersona | null;
  finalPrompt: string;
  normalizedPrompt: string;
}) {
  const scenePrompt =
    extractUserScenePrompt(finalPrompt) || normalizedPrompt || finalPrompt;
  const personaName = trimToLength(characterPersona?.name, 80);
  const identityPrompt = trimToLength(characterPersona?.identityPrompt, 520);
  const compactPromptLimit = getReplicateCompactPromptLimit();
  const identityInstruction = avatarImageUrl
    ? "Use the input image only as the identity reference for the main adult character. Preserve the same face, hair identity, skin tone, and overall presence."
    : "Use the selected adult creator persona as the identity source for the main character. Preserve the same gender, age range, face, hair, skin tone, and overall presence.";
  const promptParts = [
    identityInstruction,
    "Create a new editorial content image from the scene. Do not copy avatar background, crop, pose, or clothing unless the scene asks for it.",
    "Keep the fictional AI character grounded in real-world adult age continuity, ordinary human physics, plausible time/location, and no real-person impersonation.",
    personaName ? `Persona: ${personaName}.` : null,
    !avatarImageUrl && identityPrompt
      ? `Persona identity: ${identityPrompt}`
      : null,
    `Scene: ${scenePrompt}`,
  ].filter(Boolean);

  return trimToLength(
    normalizePromptSpacing(promptParts.join("\n\n")),
    compactPromptLimit,
  );
}

function createReplicateModelPrompt({
  avatarImageUrl,
  characterPersona,
  finalPrompt,
  normalizedPrompt,
}: {
  avatarImageUrl: string;
  characterPersona?: CreatorCharacterPersona | null;
  finalPrompt: string;
  normalizedPrompt: string;
}) {
  const compactPrompt = createReplicateCompactPrompt({
    avatarImageUrl,
    characterPersona,
    finalPrompt,
    normalizedPrompt,
  });
  const compactPromptLimit = getReplicateCompactPromptLimit();
  const shouldUseCompactPrompt =
    Boolean(avatarImageUrl || characterPersona?.identityPrompt) ||
    finalPrompt.length > compactPromptLimit;

  return {
    compactPrompt,
    prompt: shouldUseCompactPrompt
      ? compactPrompt
      : trimToLength(finalPrompt, compactPromptLimit),
    strategy: shouldUseCompactPrompt ? "compact" : "default",
  };
}

function createFalTextImageInput({
  avatarImageUrl,
  prompt,
}: {
  avatarImageUrl?: string | null;
  prompt: string;
}): FalFluxProUltraInput {
  const outputFormat = parseEnum(
    process.env.FAL_CONTENT_IMAGE_OUTPUT_FORMAT,
    ["jpeg", "png"] as const,
    "png",
  );
  const aspectRatio = parseEnum(
    process.env.FAL_CONTENT_IMAGE_TEXT_ASPECT_RATIO ||
      process.env.FAL_CONTENT_IMAGE_ASPECT_RATIO,
    [
      "21:9",
      "16:9",
      "4:3",
      "3:2",
      "1:1",
      "2:3",
      "3:4",
      "9:16",
      "9:21",
    ] as const,
    DEFAULT_FAL_TEXT_ASPECT_RATIO,
  );
  const input: FalFluxProUltraInput = {
    aspect_ratio: aspectRatio,
    enhance_prompt: parseBoolean(
      process.env.FAL_CONTENT_IMAGE_ENHANCE_PROMPT,
      false,
    ),
    num_images: 1,
    output_format: outputFormat,
    prompt,
    raw: parseBoolean(process.env.FAL_CONTENT_IMAGE_RAW, true),
    safety_tolerance: parseEnum(
      process.env.FAL_CONTENT_IMAGE_SAFETY_TOLERANCE ||
        process.env.FAL_CONTENT_VIDEO_SAFETY_TOLERANCE,
      ["1", "2", "3", "4", "5", "6"] as const,
      DEFAULT_FAL_SAFETY_TOLERANCE,
    ),
    sync_mode: false,
  };

  if (avatarImageUrl) {
    input.image_url = avatarImageUrl;
    input.image_prompt_strength = parseNumberInRange(
      process.env.FAL_CONTENT_IMAGE_PROMPT_STRENGTH,
      DEFAULT_FAL_TEXT_IMAGE_PROMPT_STRENGTH,
      0,
      1,
    );
  }

  return input;
}

function createReplicateImageInput({
  avatarImageUrl,
  prompt,
}: {
  avatarImageUrl: string;
  prompt: string;
}): ReplicateContentImageInput {
  return {
    aspect_ratio: DEFAULT_ASPECT_RATIO,
    disable_safety_checker: DEFAULT_DISABLE_SAFETY_CHECKER,
    go_fast: false,
    ...(avatarImageUrl ? { input_images: [avatarImageUrl] } : {}),
    output_format: DEFAULT_OUTPUT_FORMAT,
    output_quality: DEFAULT_OUTPUT_QUALITY,
    prompt,
  };
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

async function generateReplicateImageFile({
  modelInput,
  replicateToken,
}: {
  modelInput: ReplicateContentImageInput;
  replicateToken: string;
}): Promise<GeneratedImageFile> {
  const replicate = new Replicate({ auth: replicateToken });

  const rawOutput = await withTimeout(
    replicate.run(DEFAULT_MODEL, {
      input: modelInput,
    }),
    getReplicateImageTimeoutMs(),
    "Replicate image generation",
  );

  return withTimeout(
    readReplicateOutputFile(rawOutput),
    30_000,
    "Replicate image download",
  );
}

async function generateFalReferenceImageFile({
  falKey,
  model,
  modelInput,
}: {
  falKey: string;
  model: FalImageModelName;
  modelInput: FalReferenceImageInput;
}): Promise<GeneratedImageFile> {
  const fal = createFalClient({ credentials: falKey });
  const result = await fal.subscribe(model, {
    input: modelInput,
    logs: true,
    mode: "polling",
    pollInterval: 1000,
    timeout: getFalImageTimeoutMs(),
  });

  return withTimeout(
    readFalImageOutputFile(result.data),
    30_000,
    "fal image download",
  );
}

async function generateFalTextImageFile({
  falKey,
  model,
  modelInput,
}: {
  falKey: string;
  model: FalImageModelName;
  modelInput: FalFluxProUltraInput;
}): Promise<GeneratedImageFile> {
  try {
    const fal = createFalClient({ credentials: falKey });
    const result = await fal.subscribe(model, {
      input: modelInput,
      logs: true,
      mode: "polling",
      pollInterval: 1000,
      timeout: getFalImageTimeoutMs(),
    });

    return await withTimeout(
      readFalImageOutputFile(result.data),
      30_000,
      "fal text image download",
    );
  } catch (error) {
    throw normalizeImageGenerationError(error);
  }
}

function getImageGenerationErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "AI content image generation failed.";
}

function isReplicateInternalShapeError(error: unknown) {
  const message = getImageGenerationErrorMessage(error).toLowerCase();

  return (
    message.includes("q_descale must have shape") ||
    message.includes("batch_size, num_heads_k")
  );
}

function getProviderErrorStatus(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const candidate = error as {
    response?: { status?: unknown };
    status?: unknown;
    statusCode?: unknown;
  };
  const status =
    typeof candidate.status === "number"
      ? candidate.status
      : typeof candidate.statusCode === "number"
        ? candidate.statusCode
        : typeof candidate.response?.status === "number"
          ? candidate.response.status
          : null;

  return status;
}

function isProviderAccessDeniedError(error: unknown) {
  const status = getProviderErrorStatus(error);
  const message = getImageGenerationErrorMessage(error).toLowerCase();

  return (
    status === 401 ||
    status === 403 ||
    message === "forbidden" ||
    message.includes("403") ||
    message.includes("unauthorized") ||
    message.includes("access denied")
  );
}

function isProviderSafetyError(error: unknown) {
  const message = getImageGenerationErrorMessage(error).toLowerCase();

  return (
    message.includes("content policy") ||
    message.includes("content_policy") ||
    message.includes("safety") ||
    message.includes("nsfw")
  );
}

function normalizeImageGenerationError(error: unknown) {
  if (isProviderAccessDeniedError(error)) {
    return new Error(
      "AI image provider access was denied (403 Forbidden). Check REPLICATE_API_TOKEN/FAL_KEY permissions, model access, and public access to the persona avatar image.",
    );
  }

  if (isProviderSafetyError(error)) {
    return new Error(
      "AI image provider rejected this prompt with its content safety filter. Try a more neutral editorial description and avoid explicit body or sexual wording.",
    );
  }

  return error instanceof Error
    ? error
    : new Error("AI content image generation failed.");
}

function toRecordableModelInput(input: object) {
  return JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
}

async function createContentImageGenerationRecord({
  avatarImageUrl,
  finalPrompt,
  input,
  normalizedPrompt,
  originalPrompt,
  providerPriority,
  summary,
  title,
}: {
  avatarImageUrl: string;
  finalPrompt: string;
  input: GenerateContentGalleryImageInput;
  normalizedPrompt: string;
  originalPrompt: string;
  providerPriority: "fal" | "replicate";
  summary: string;
  title: string;
}) {
  const generationId = randomUUID();
  const now = new Date();

  try {
    const collection = await getContentImageGenerationsCollection();
    await collection.insertOne({
      attempts: [],
      avatarImageUrl: avatarImageUrl || null,
      createdAt: now,
      finalPrompt,
      generationId,
      memberEmail: input.memberEmail,
      normalizedPrompt,
      originalPrompt,
      personaId: input.characterPersona?.id ?? null,
      personaName: input.characterPersona?.name ?? null,
      providerPriority,
      referralCode: input.referralCode,
      status: "running",
      summary,
      title,
      updatedAt: now,
    });

    return generationId;
  } catch (error) {
    console.warn("[content-image] failed to create generation record", {
      message: getImageGenerationErrorMessage(error),
    });

    return null;
  }
}

async function updateContentImageGenerationRecord(
  generationId: string | null,
  patch: ContentImageGenerationRecordPatch,
) {
  if (!generationId) {
    return;
  }

  try {
    const collection = await getContentImageGenerationsCollection();
    await collection.updateOne(
      { generationId },
      {
        $set: {
          ...patch,
          updatedAt: new Date(),
        },
      },
    );
  } catch (error) {
    console.warn("[content-image] failed to update generation record", {
      generationId,
      message: getImageGenerationErrorMessage(error),
    });
  }
}

async function runRecordedImageGenerationAttempt<T extends object>({
  attempts,
  generationId,
  model,
  modelInput,
  promptStrategy,
  provider,
  run,
}: {
  attempts: ContentImageGenerationAttempt[];
  generationId: string | null;
  model: string;
  modelInput: T;
  promptStrategy?: string;
  provider: ContentImageGenerationProvider;
  run: () => Promise<GeneratedImageFile>;
}) {
  const attempt: ContentImageGenerationAttempt = {
    attemptId: randomUUID(),
    model,
    modelInput: toRecordableModelInput(modelInput),
    promptStrategy: promptStrategy ?? null,
    provider,
    startedAt: new Date(),
    status: "running",
  };

  attempts.push(attempt);
  await updateContentImageGenerationRecord(generationId, { attempts });

  try {
    const result = await run();
    attempt.completedAt = new Date();
    attempt.resultContentType = result.blob.type || null;
    attempt.resultSourceUrl = result.sourceUrl;
    attempt.status = "succeeded";
    await updateContentImageGenerationRecord(generationId, { attempts });

    return result;
  } catch (error) {
    attempt.completedAt = new Date();
    attempt.errorMessage = getImageGenerationErrorMessage(error);
    attempt.errorStatus = getProviderErrorStatus(error);
    attempt.status = "failed";
    await updateContentImageGenerationRecord(generationId, { attempts });
    throw error;
  }
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

  if (!replicateToken && !falKey) {
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
    message: "Preparing the AI image generation request.",
    progress: 18,
    status: "running",
    step: "preparing_prompt",
  });

  const modelVisualBrief = applyImagePhotoQualityPreset(
    normalizeContentImagePromptForModel(
      visualBrief,
      Boolean(input.characterPersona?.identityPrompt),
    ),
  );
  const prompt = applyCreatorCharacterPersonaToPrompt(
    modelVisualBrief,
    input.characterPersona,
  );

  await reportProgress(input.onProgress, {
    message: "AI image generation request is ready. Starting content image generation.",
    progress: 28,
    status: "completed",
    step: "preparing_prompt",
  });

  let generatedFile: { blob: Blob; sourceUrl: string | null };
  const providerPriority = resolveImageProviderPriority();
  const canUseReplicate = Boolean(replicateToken);
  const canUseFalReference = Boolean(avatarImageUrl && falKey);
  const canUseFalText = Boolean(falKey);
  const attempts: ContentImageGenerationAttempt[] = [];
  const generationId = await createContentImageGenerationRecord({
    avatarImageUrl,
    finalPrompt: prompt,
    input,
    normalizedPrompt: modelVisualBrief,
    originalPrompt: visualBrief,
    providerPriority,
    summary,
    title,
  });

  async function runReplicateAttempt() {
    const replicatePrompt = createReplicateModelPrompt({
      avatarImageUrl,
      characterPersona: input.characterPersona,
      finalPrompt: prompt,
      normalizedPrompt: modelVisualBrief,
    });
    const modelInput = createReplicateImageInput({
      avatarImageUrl,
      prompt: replicatePrompt.prompt,
    });
    const runAttempt = (
      attemptInput: ReplicateContentImageInput,
      strategy: string,
    ) =>
      runRecordedImageGenerationAttempt({
        attempts,
        generationId,
        model: DEFAULT_MODEL,
        modelInput: attemptInput,
        promptStrategy: `replicate-${strategy}`,
        provider: "replicate",
        run: () =>
          generateReplicateImageFile({
            modelInput: attemptInput,
            replicateToken: replicateToken ?? "",
          }),
      });

    try {
      return await runAttempt(modelInput, replicatePrompt.strategy);
    } catch (error) {
      if (
        !isReplicateInternalShapeError(error) ||
        modelInput.prompt === replicatePrompt.compactPrompt
      ) {
        throw error;
      }

      console.warn(
        "[content-image] Replicate internal shape error; retrying with compact prompt",
        {
          message: getImageGenerationErrorMessage(error),
        },
      );

      await reportProgress(input.onProgress, {
        message: "Replicate image generation hit an internal prompt error. Retrying with a shorter prompt.",
        progress: 52,
        status: "running",
        step: "generating_image",
      });

      const retryModelInput = createReplicateImageInput({
        avatarImageUrl,
        prompt: replicatePrompt.compactPrompt,
      });

      return runAttempt(retryModelInput, "compact-retry");
    }
  }

  async function runFalReferenceAttempt() {
    const model = resolveFalReferenceModelName();
    const modelInput = createFalReferenceImageInput({
      avatarImageUrl,
      model,
      prompt,
    });

    return runRecordedImageGenerationAttempt({
      attempts,
      generationId,
      model,
      modelInput,
      provider: "fal-reference",
      run: () =>
        generateFalReferenceImageFile({
          falKey: falKey ?? "",
          model,
          modelInput,
        }),
    });
  }

  async function runFalTextAttempt() {
    const model = resolveFalTextModelName();
    const modelInput = createFalTextImageInput({
      avatarImageUrl,
      prompt,
    });

    return runRecordedImageGenerationAttempt({
      attempts,
      generationId,
      model,
      modelInput,
      provider: "fal-text",
      run: () =>
        generateFalTextImageFile({
          falKey: falKey ?? "",
          model,
          modelInput,
        }),
    });
  }

  try {
    if (providerPriority === "fal" && canUseFalReference) {
      await reportProgress(input.onProgress, {
        message: "Generating the AI content image with a persona avatar reference.",
        progress: 42,
        status: "running",
        step: "generating_image",
      });

      try {
        generatedFile = await runFalReferenceAttempt();
      } catch (error) {
        if (!replicateToken) {
          console.warn(
            "[content-image] fal reference image generation failed; falling back to fal text image",
            {
              message: getImageGenerationErrorMessage(error),
            },
          );

          await reportProgress(input.onProgress, {
            message: "fal reference image generation failed. Trying fal text image generation.",
            progress: 58,
            status: "running",
            step: "generating_image",
          });
          generatedFile = await runFalTextAttempt();
        } else {
          console.warn(
            "[content-image] fal image generation failed; falling back to Replicate",
            {
              message: getImageGenerationErrorMessage(error),
            },
          );

          await reportProgress(input.onProgress, {
            message: "fal image generation failed. Trying Replicate.",
            progress: 58,
            status: "running",
            step: "generating_image",
          });
          try {
            generatedFile = await runReplicateAttempt();
          } catch (replicateError) {
            if (!canUseFalText) {
              throw normalizeImageGenerationError(replicateError);
            }

            console.warn(
              "[content-image] Replicate image generation failed; falling back to fal text image",
              {
                message: getImageGenerationErrorMessage(replicateError),
              },
            );

            await reportProgress(input.onProgress, {
              message: "Replicate image generation failed. Trying fal text image generation.",
              progress: 64,
              status: "running",
              step: "generating_image",
            });
            generatedFile = await runFalTextAttempt();
          }
        }
      }
    } else if (providerPriority === "fal" && canUseFalText) {
      await reportProgress(input.onProgress, {
        message: avatarImageUrl
          ? "Generating the AI content image with fal and the persona avatar."
          : "Generating the AI content image with fal.",
        progress: 42,
        status: "running",
        step: "generating_image",
      });

      try {
        generatedFile = await runFalTextAttempt();
      } catch (error) {
        if (!replicateToken) {
          throw normalizeImageGenerationError(error);
        }

        console.warn(
          "[content-image] fal text image generation failed; falling back to Replicate",
          {
            message: getImageGenerationErrorMessage(error),
          },
        );

        await reportProgress(input.onProgress, {
          message: "fal image generation failed. Trying Replicate.",
          progress: 58,
          status: "running",
          step: "generating_image",
        });
        generatedFile = await runReplicateAttempt().catch(
          (replicateError: unknown) => {
            throw normalizeImageGenerationError(replicateError);
          },
        );
      }
    } else if (canUseReplicate) {
      await reportProgress(input.onProgress, {
        message: avatarImageUrl
          ? "Generating the AI content image with Replicate and the persona avatar reference."
          : "Generating the AI content image with Replicate.",
        progress: 42,
        status: "running",
        step: "generating_image",
      });

      try {
        generatedFile = await runReplicateAttempt();
      } catch (error) {
        if (!canUseFalReference && !canUseFalText) {
          throw normalizeImageGenerationError(error);
        }

        console.warn(
          "[content-image] Replicate image generation failed; falling back to fal",
          {
            message: getImageGenerationErrorMessage(error),
          },
        );

        if (canUseFalReference) {
          await reportProgress(input.onProgress, {
            message: "Replicate image generation failed. Trying persona avatar reference with fal.",
            progress: 58,
            status: "running",
            step: "generating_image",
          });

          try {
            generatedFile = await runFalReferenceAttempt();
          } catch (falReferenceError) {
            if (!canUseFalText) {
              throw normalizeImageGenerationError(falReferenceError);
            }

            console.warn(
              "[content-image] fal reference image generation failed; falling back to fal text image",
              {
                message: getImageGenerationErrorMessage(falReferenceError),
              },
            );

            await reportProgress(input.onProgress, {
              message: "fal reference image generation failed. Trying fal text image generation.",
              progress: 64,
              status: "running",
              step: "generating_image",
            });
            generatedFile = await runFalTextAttempt();
          }
        } else {
          await reportProgress(input.onProgress, {
            message: "Replicate image generation failed. Trying fal text image generation.",
            progress: 58,
            status: "running",
            step: "generating_image",
          });
          generatedFile = await runFalTextAttempt();
        }
      }
    } else if (canUseFalReference) {
      await reportProgress(input.onProgress, {
        message: "Generating the AI content image with a persona avatar reference.",
        progress: 42,
        status: "running",
        step: "generating_image",
      });
      generatedFile = await runFalReferenceAttempt().catch(
        async (falReferenceError: unknown) => {
          if (!canUseFalText) {
            throw normalizeImageGenerationError(falReferenceError);
          }

          console.warn(
            "[content-image] fal reference image generation failed; falling back to fal text image",
            {
              message: getImageGenerationErrorMessage(falReferenceError),
            },
          );

          await reportProgress(input.onProgress, {
            message: "fal reference image generation failed. Trying fal text image generation.",
            progress: 58,
            status: "running",
            step: "generating_image",
          });
          return runFalTextAttempt();
        },
      );
    } else if (canUseFalText) {
      await reportProgress(input.onProgress, {
        message: "Generating the AI content image with fal.",
        progress: 42,
        status: "running",
        step: "generating_image",
      });
      generatedFile = await runFalTextAttempt().catch((error: unknown) => {
        throw normalizeImageGenerationError(error);
      });
    } else {
      throw new Error("FAL_KEY or REPLICATE_API_TOKEN is not configured.");
    }
  } catch (error) {
    await updateContentImageGenerationRecord(generationId, {
      completedAt: new Date(),
      errorMessage: getImageGenerationErrorMessage(error),
      status: "failed",
    });
    throw error;
  }

  await reportProgress(input.onProgress, {
    message: "AI image created. Preparing upload.",
    progress: 74,
    status: "completed",
    step: "generating_image",
  });

  const { blob, sourceUrl } = generatedFile;
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

  let uploaded: Awaited<ReturnType<typeof put>>;

  try {
    uploaded = await put(pathname, blob, {
      access: "public",
      addRandomSuffix: true,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
      contentType,
    });
  } catch (error) {
    await updateContentImageGenerationRecord(generationId, {
      completedAt: new Date(),
      errorMessage: getImageGenerationErrorMessage(error),
      status: "failed",
    });
    throw error;
  }

  await reportProgress(input.onProgress, {
    message: "Content image uploaded. Finalizing the result.",
    progress: 94,
    status: "completed",
    step: "uploading_cover",
  });

  const result = {
    contentType: uploaded.contentType,
    pathname: uploaded.pathname,
    revisedPrompt: prompt === visualBrief ? null : prompt,
    url: uploaded.url,
  };

  await updateContentImageGenerationRecord(generationId, {
    completedAt: new Date(),
    contentType: uploaded.contentType,
    pathname: uploaded.pathname,
    resultUrl: uploaded.url,
    sourceUrl,
    status: "succeeded",
  });

  return result;
}
