import "server-only";

import {
  ApiError,
  createFalClient,
  ValidationError,
  type QueueStatus,
  type ValidationErrorInfo,
} from "@fal-ai/client";
import { put } from "@vercel/blob";

import {
  CONTENT_IMAGE_VISUAL_BRIEF_LIMIT,
  CONTENT_VIDEO_MAX_BYTES,
  type ContentCoverGenerationProgressStep,
  type ContentGenerationFailureDiagnostic,
  type ContentGenerationFailureKind,
  type ContentPostGenerateCoverProgressEvent,
  type CreatorCharacterPersona,
} from "@/lib/content";
import { applyCreatorCharacterPersonaToPrompt } from "@/lib/creator-character-prompt";

const TITLE_LIMIT = 120;
const SUMMARY_LIMIT = 240;
const DEFAULT_TEXT_MODEL = "fal-ai/wan/v2.7/text-to-video";
const DEFAULT_REFERENCE_MODEL = "fal-ai/veo3.1/reference-to-video";
const DEFAULT_ASPECT_RATIO = "9:16";
const DEFAULT_DURATION = "6s";
const DEFAULT_GENERATE_AUDIO = false;
const DEFAULT_NEGATIVE_PROMPT =
  "waxy skin, plastic skin, blurry face, distorted eyes, asymmetrical face, face morphing, identity drift, low detail skin, over-smoothed skin, rubbery face, unstable eyes, warped mouth, deformed hands, extra fingers, extra people, anime, cartoon, cgi, doll-like face, uncanny valley, text, watermark, logo";
const DEFAULT_RESOLUTION = "1080p";
const DEFAULT_SAFETY_TOLERANCE = "6";
const DEFAULT_TIMEOUT_MS = 290_000;

export type ContentVideoQualityMode = "person_high" | "standard";

type FalModelFamily =
  | "minimax-subject-reference"
  | "veo"
  | "veo-reference"
  | "wan-v2.7"
  | "wan-v2.7-reference";

type FalVeoVideoInput = {
  aspect_ratio: "16:9" | "9:16";
  auto_fix: boolean;
  duration: "4s" | "6s" | "8s";
  generate_audio: boolean;
  negative_prompt?: string;
  prompt: string;
  resolution: "720p" | "1080p" | "4k";
  safety_tolerance: "1" | "2" | "3" | "4" | "5" | "6";
};

type FalVeoReferenceVideoInput = FalVeoVideoInput & {
  image_urls: string[];
};

type FalWanVideoInput = {
  aspect_ratio: "16:9" | "9:16" | "1:1" | "4:3" | "3:4";
  audio_url?: string;
  duration: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
  enable_prompt_expansion: boolean;
  enable_safety_checker: boolean;
  negative_prompt?: string;
  prompt: string;
  resolution: "720p" | "1080p";
};

type FalWanReferenceVideoInput = {
  aspect_ratio: "16:9" | "9:16" | "1:1" | "4:3" | "3:4";
  duration: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  enable_safety_checker: boolean;
  multi_shots: boolean;
  negative_prompt?: string;
  prompt: string;
  reference_image_urls: string[];
  resolution: "720p" | "1080p";
};

type FalMinimaxSubjectReferenceVideoInput = {
  negative_prompt?: string;
  prompt: string;
  prompt_optimizer: boolean;
  subject_reference_image_url: string;
};

type FalVideoInput =
  | FalMinimaxSubjectReferenceVideoInput
  | FalVeoReferenceVideoInput
  | FalVeoVideoInput
  | FalWanReferenceVideoInput
  | FalWanVideoInput;

type FalModelName = `${string}/${string}${string}`;

type FalVideoFile = {
  content_type?: string;
  file_size?: number;
  url: string;
};

type FalVideoOutput = {
  actual_prompt?: string | null;
  prompt?: string | null;
  video?: FalVideoFile;
};

type FalFailureDiagnostic = {
  bodyText: string | null;
  fieldErrors: ValidationErrorInfo[];
  kind: ContentGenerationFailureKind;
  message: string;
  requestId: string | null;
  status: number | null;
};

export class ContentVideoGenerationError extends Error {
  readonly diagnostic: ContentGenerationFailureDiagnostic;

  constructor(message: string, diagnostic: ContentGenerationFailureDiagnostic) {
    super(message);
    this.name = "ContentVideoGenerationError";
    this.diagnostic = diagnostic;
  }
}

export type GenerateContentGalleryVideoInput = {
  avatarImageUrl?: string | null;
  avatarImageUrls?: string[] | null;
  characterPersona?: CreatorCharacterPersona | null;
  onProgress?: (
    event: ContentPostGenerateCoverProgressEvent,
  ) => Promise<void> | void;
  referralCode: string;
  qualityMode?: ContentVideoQualityMode;
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

function parseInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value?.trim());

  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

function parseVeoDuration(
  value: string | undefined,
  fallback: FalVeoVideoInput["duration"],
) {
  const normalized = value?.trim().toLowerCase();
  const duration = normalized?.replace(/^(4|6|8)$/, "$1s");
  const allowed = ["4s", "6s", "8s"] as const;

  return allowed.includes(duration as FalVeoVideoInput["duration"])
    ? (duration as FalVeoVideoInput["duration"])
    : fallback;
}

function parseWanDuration(value: string | undefined, maximum = 15, fallback = 8) {
  const normalized = value?.trim().replace(/s$/i, "");
  const parsed = Number(normalized);
  const duration = Number.isFinite(parsed) ? Math.round(parsed) : fallback;
  const clamped = Math.max(2, Math.min(maximum, duration));

  return clamped as FalWanVideoInput["duration"];
}

function getMaxAvatarReferenceImages() {
  return Math.max(
    1,
    Math.min(
      8,
      parseInteger(process.env.FAL_CONTENT_VIDEO_MAX_REFERENCE_IMAGES, 4),
    ),
  );
}

function getVideoNegativePrompt() {
  return (
    process.env.FAL_CONTENT_VIDEO_NEGATIVE_PROMPT?.trim() ||
    DEFAULT_NEGATIVE_PROMPT
  );
}

function getVeoDuration(qualityMode: ContentVideoQualityMode) {
  const personDuration = process.env.FAL_CONTENT_VIDEO_PERSON_DURATION?.trim();
  const duration = parseVeoDuration(
    qualityMode === "person_high"
      ? personDuration || process.env.FAL_CONTENT_VIDEO_DURATION
      : process.env.FAL_CONTENT_VIDEO_DURATION,
    DEFAULT_DURATION,
  );

  if (qualityMode === "person_high" && !personDuration && duration === "8s") {
    return "6s";
  }

  return duration;
}

function getVeoResolution(qualityMode: ContentVideoQualityMode) {
  return parseEnum(
    qualityMode === "person_high"
      ? process.env.FAL_CONTENT_VIDEO_PERSON_RESOLUTION ||
          process.env.FAL_CONTENT_VIDEO_RESOLUTION
      : process.env.FAL_CONTENT_VIDEO_RESOLUTION,
    ["720p", "1080p", "4k"] as const,
    DEFAULT_RESOLUTION,
  );
}

function getWanDuration(qualityMode: ContentVideoQualityMode, maximum = 15) {
  if (qualityMode !== "person_high") {
    return parseWanDuration(process.env.FAL_CONTENT_VIDEO_DURATION, maximum);
  }

  return parseWanDuration(
    process.env.FAL_CONTENT_VIDEO_PERSON_DURATION ||
      process.env.FAL_CONTENT_VIDEO_DURATION,
    Math.min(maximum, 6),
    6,
  );
}

function getWanResolution(qualityMode: ContentVideoQualityMode) {
  return parseEnum(
    qualityMode === "person_high"
      ? process.env.FAL_CONTENT_VIDEO_PERSON_RESOLUTION ||
          process.env.FAL_CONTENT_VIDEO_RESOLUTION
      : process.env.FAL_CONTENT_VIDEO_RESOLUTION,
    ["720p", "1080p"] as const,
    DEFAULT_RESOLUTION,
  );
}

function isKnownTextOnlyModel(model: string) {
  return (
    model === DEFAULT_TEXT_MODEL ||
    model === "fal-ai/veo3.1/lite" ||
    model.endsWith("/text-to-video")
  );
}

function resolveModelName(hasAvatarReference: boolean): FalModelName {
  const configuredModel = process.env.FAL_CONTENT_VIDEO_MODEL?.trim();
  const configuredReferenceModel =
    process.env.FAL_CONTENT_VIDEO_REFERENCE_MODEL?.trim();
  const model = hasAvatarReference
    ? configuredReferenceModel ||
      (configuredModel && !isKnownTextOnlyModel(configuredModel)
        ? configuredModel
        : DEFAULT_REFERENCE_MODEL)
    : configuredModel || DEFAULT_TEXT_MODEL;

  if (!/^[^/\s]+\/[^/\s]+(?:\/[^/\s]+)*$/.test(model)) {
    throw new Error(
      "FAL_CONTENT_VIDEO_MODEL must use owner/model or owner/model/path format.",
    );
  }

  return model as FalModelName;
}

function resolveModelFamily(model: FalModelName): FalModelFamily {
  if (model === "fal-ai/minimax/video-01-subject-reference") {
    return "minimax-subject-reference";
  }

  if (model === "fal-ai/wan/v2.7/text-to-video") {
    return "wan-v2.7";
  }

  if (model === "fal-ai/wan/v2.7/reference-to-video") {
    return "wan-v2.7-reference";
  }

  if (model === "fal-ai/veo3.1/reference-to-video") {
    return "veo-reference";
  }

  return "veo";
}

function getModelDisplayName(model: FalModelName) {
  const family = resolveModelFamily(model);

  if (family === "minimax-subject-reference") {
    return "fal MiniMax Subject Reference";
  }

  if (family === "wan-v2.7-reference") {
    return "fal Wan 2.7 Reference";
  }

  if (family === "wan-v2.7") {
    return "fal Wan 2.7";
  }

  if (family === "veo-reference") {
    return "fal Veo 3.1 Reference";
  }

  if (model === "fal-ai/veo3.1/lite") {
    return "fal Veo 3.1 Lite";
  }

  return model;
}

function createVeoModelInput(
  prompt: string,
  avatarImageUrls: string[] = [],
  qualityMode: ContentVideoQualityMode,
): FalVeoReferenceVideoInput | FalVeoVideoInput {
  const aspectRatio = parseEnum(
    process.env.FAL_CONTENT_VIDEO_ASPECT_RATIO,
    ["16:9", "9:16"] as const,
    DEFAULT_ASPECT_RATIO,
  );
  const duration = getVeoDuration(qualityMode);
  const resolution = getVeoResolution(qualityMode);
  const safetyTolerance = parseEnum(
    process.env.FAL_CONTENT_VIDEO_SAFETY_TOLERANCE,
    ["1", "2", "3", "4", "5", "6"] as const,
    DEFAULT_SAFETY_TOLERANCE,
  );
  const negativePrompt = getVideoNegativePrompt();

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
    ...(avatarImageUrls.length > 0 ? { image_urls: avatarImageUrls } : {}),
  };
}

function createWanModelInput(
  prompt: string,
  qualityMode: ContentVideoQualityMode,
): FalWanVideoInput {
  const aspectRatio = parseEnum(
    process.env.FAL_CONTENT_VIDEO_ASPECT_RATIO,
    ["16:9", "9:16", "1:1", "4:3", "3:4"] as const,
    DEFAULT_ASPECT_RATIO,
  );
  const resolution = getWanResolution(qualityMode);
  const negativePrompt = getVideoNegativePrompt();
  const audioUrl = process.env.FAL_CONTENT_VIDEO_AUDIO_URL?.trim();

  return {
    aspect_ratio: aspectRatio,
    ...(audioUrl ? { audio_url: audioUrl } : {}),
    duration: getWanDuration(qualityMode),
    enable_prompt_expansion: parseBoolean(
      process.env.FAL_CONTENT_VIDEO_ENABLE_PROMPT_EXPANSION,
      true,
    ),
    enable_safety_checker: parseBoolean(
      process.env.FAL_CONTENT_VIDEO_ENABLE_SAFETY_CHECKER,
      true,
    ),
    ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
    prompt,
    resolution,
  };
}

function createWanReferenceModelInput(
  prompt: string,
  avatarImageUrls: string[],
  qualityMode: ContentVideoQualityMode,
): FalWanReferenceVideoInput {
  const aspectRatio = parseEnum(
    process.env.FAL_CONTENT_VIDEO_ASPECT_RATIO,
    ["16:9", "9:16", "1:1", "4:3", "3:4"] as const,
    DEFAULT_ASPECT_RATIO,
  );
  const resolution = getWanResolution(qualityMode);
  const negativePrompt = getVideoNegativePrompt();

  return {
    aspect_ratio: aspectRatio,
    duration: getWanDuration(qualityMode, 10) as FalWanReferenceVideoInput["duration"],
    enable_safety_checker: parseBoolean(
      process.env.FAL_CONTENT_VIDEO_ENABLE_SAFETY_CHECKER,
      true,
    ),
    multi_shots: parseBoolean(
      process.env.FAL_CONTENT_VIDEO_MULTI_SHOTS,
      false,
    ),
    ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
    prompt,
    reference_image_urls: avatarImageUrls,
    resolution,
  };
}

function createMinimaxSubjectReferenceModelInput(
  prompt: string,
  avatarImageUrl: string,
): FalMinimaxSubjectReferenceVideoInput {
  return {
    prompt,
    prompt_optimizer: parseBoolean(
      process.env.FAL_CONTENT_VIDEO_PROMPT_OPTIMIZER,
      true,
    ),
    subject_reference_image_url: avatarImageUrl,
  };
}

function createModelInput({
  avatarImageUrls,
  model,
  prompt,
  qualityMode,
}: {
  avatarImageUrls: string[];
  model: FalModelName;
  prompt: string;
  qualityMode: ContentVideoQualityMode;
}): FalVideoInput {
  const family = resolveModelFamily(model);

  if (family === "minimax-subject-reference") {
    const [avatarImageUrl] = avatarImageUrls;

    if (!avatarImageUrl) {
      throw new Error(
        "A creator avatar image is required for fal subject-reference video generation.",
      );
    }

    return createMinimaxSubjectReferenceModelInput(prompt, avatarImageUrl);
  }

  if (family === "wan-v2.7-reference") {
    if (avatarImageUrls.length === 0) {
      throw new Error(
        "A creator avatar image is required for fal reference-to-video generation.",
      );
    }

    return createWanReferenceModelInput(prompt, avatarImageUrls, qualityMode);
  }

  if (family === "wan-v2.7") {
    return createWanModelInput(prompt, qualityMode);
  }

  if (family === "veo-reference") {
    if (avatarImageUrls.length === 0) {
      throw new Error(
        "A creator avatar image is required for fal reference-to-video generation.",
      );
    }

    return createVeoModelInput(prompt, avatarImageUrls, qualityMode);
  }

  return createVeoModelInput(prompt, [], qualityMode);
}

function rewritePromptForSaferVideoGeneration(prompt: string) {
  if (
    !parseBoolean(process.env.FAL_CONTENT_VIDEO_SAFE_PROMPT_REWRITE, true)
  ) {
    return { prompt, revisedPrompt: null };
  }

  const replacements: Array<[RegExp, string]> = [
    [/\byoung\s+man\b/gi, "adult man"],
    [/\byoung\s+woman\b/gi, "adult woman"],
    [/\bprovocative\b/gi, "playful editorial"],
    [/\bseductive\b/gi, "confident editorial"],
    [/\bsuper\s+sexy\s+dance\b/gi, "confident high-fashion dance"],
    [/\bsexy\s+dance\b/gi, "expressive dance"],
    [/\bsuper\s+sexy\b/gi, "confident high-fashion"],
    [/\bsexy\b/gi, "confident"],
    [/\bnaughty\s+nurse\s+archetype\b/gi, "retro nurse-inspired fashion archetype"],
    [/\bnaughty\s+nurse\b/gi, "retro nurse-inspired costume"],
    [/\bcurvy\s+nurse\b/gi, "adult performer in a nurse-inspired costume"],
    [/\bhourglass\s+figure\b/gi, "classic editorial styling"],
    [/\bsoft\s+athletic\s+thighs\b/gi, "athletic editorial pose"],
    [/\bpartially\s+unzipped\b/gi, "neatly styled"],
    [/\btasteful\s+cleavage\b/gi, "fashion neckline"],
    [/\bcleavage\b/gi, "fashion neckline"],
    [/\bsheer\s+stockings\b/gi, "vintage stockings"],
    [/\bwearing\s+a\s+loose\s+shirt\s+and\s+no\s+bra\b/gi, "wearing a loose summer shirt"],
    [/\bwithout\s+a\s+bra\b/gi, "in a relaxed summer outfit"],
    [/\bno\s+bra\b/gi, "relaxed summer outfit"],
    [/\bbraless\b/gi, "relaxed summer outfit"],
    [/\bstrikingly\s+large\s+bust\s+and\s+hips\b/gi, "confident editorial styling"],
    [/\blarge\s+bust\s+and\s+hips\b/gi, "editorial styling"],
    [/\bbig\s+bust\b/gi, "elegant styling"],
    [/\blarge\s+bust\b/gi, "elegant styling"],
    [/\bbust\b/gi, "styling"],
    [/\bwide\s+hips\b/gi, "balanced styling"],
    [/\bhips\b/gi, "styling"],
    [/\bblack\s+bikini\b/gi, "black swimwear-inspired stage outfit"],
    [/\bbikini\b/gi, "swimwear-inspired stage outfit"],
    [/\bso\s+lustful\b/gi, "with sophisticated editorial energy"],
    [/\blustful\b/gi, "sophisticated and expressive"],
  ];
  const rewritten = replacements.reduce(
    (current, [pattern, replacement]) =>
      current.replace(pattern, replacement),
    prompt,
  )
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    prompt: rewritten,
    revisedPrompt: rewritten === prompt ? null : rewritten,
  };
}

function normalizeVideoPromptSpacing(value: string) {
  return value
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeAvatarReferenceUrls(
  avatarImageUrls: string[] | null | undefined,
  fallbackAvatarImageUrl: string | null | undefined,
) {
  const seenUrls = new Set<string>();
  const urls = [
    ...(Array.isArray(avatarImageUrls) ? avatarImageUrls : []),
    fallbackAvatarImageUrl,
  ];

  return urls
    .map((url) => trimToLength(url, 500))
    .filter((url) => {
      if (!url || seenUrls.has(url)) {
        return false;
      }

      seenUrls.add(url);
      return true;
    })
    .slice(0, getMaxAvatarReferenceImages());
}

function appendPersonCenteredReferenceDirection(
  prompt: string,
  avatarReferenceUrls: string[],
  qualityMode: ContentVideoQualityMode,
) {
  if (avatarReferenceUrls.length === 0) {
    return prompt;
  }

  const referenceDirection =
    avatarReferenceUrls.length <= 2
      ? "Reference plan: expression lock. Treat the first reference image as the exact facial expression, gaze, face shape, hairstyle, skin tone, and identity anchor. Use any second reference only to stabilize identity, not to change the selected expression."
      : "Reference plan: identity set. Use the image set to stabilize the same adult character identity while keeping the scene as one continuous vertical vlog shot.";
  const qualityDirection =
    qualityMode === "person_high"
      ? "High-fidelity portrait video preset: realistic human skin with visible but natural texture, stable eye direction, natural teeth and lips, clean face geometry, soft daylight or studio key light, shallow depth of field, 50mm portrait-lens feeling, shoulders-up or upper-body framing, and only subtle motion such as blink, small smile, tiny head turn, and micro-reactions. Keep the shot short, simple, and continuous; avoid fast body movement, large hand gestures near the face, sudden cuts, face smoothing, waxy skin, beauty-filter plastic skin, and expression morphing."
      : "Photorealistic person-centered vertical short-form vlog direction: use the reference avatar image set as the fixed identity lock. Show one adult character only, keep the face clearly visible in close-up or medium shot, preserve the same facial identity, hair, age range, skin tone, complexion, facial geometry, eye shape, mouth shape, and expression style from the references. Keep the motion simple and controlled.";

  return normalizeVideoPromptSpacing(
    [
      prompt,
      referenceDirection,
      qualityDirection,
      "Avoid background-dominant scenes, object-only shots, extra people, anime, cartoon, CGI, doll-like rendering, uncanny valley face, text, logos, or watermark.",
    ].join(" "),
  );
}

function rewritePromptForFalContentChecker(prompt: string) {
  if (
    !parseBoolean(
      process.env.FAL_CONTENT_VIDEO_PROVIDER_SAFE_REWRITE,
      true,
    )
  ) {
    return { prompt, revisedPrompt: null };
  }

  const replacements: Array<[RegExp, string]> = [
    [/\bfemale\s+adult\s+woman\b/gi, "adult woman"],
    [/\bmale\s+adult\s+man\b/gi, "adult man"],
    [/\bneutral\s+body\s+silhouette\s+lock\b/gi, "overall presence lock"],
    [/\bbody\s+silhouette\s+lock\b/gi, "overall presence lock"],
    [/\bneutral\s+body\s+silhouette\b/gi, "overall presence"],
    [/\bbody\s+silhouette\b/gi, "overall presence"],
    [/\brecognizable\s+silhouette\b/gi, "overall presence"],
    [/\bneutral\s+silhouette\b/gi, "overall presence"],
    [/\bsilhouette\b/gi, "presence"],
    [/\bbody\s+identity\b/gi, "visual identity"],
    [/\bbody[-\s]?proportion\s+details\b/gi, "overall appearance details"],
    [/\bbody\s+proportions?\b/gi, "overall appearance"],
    [/\bbody\s+shape\b/gi, "overall appearance"],
    [/\bbody\s+type\b/gi, "overall appearance"],
    [/\bproportions\b/gi, "visual balance"],
    [
      /\bdo\s+not\s+make\s+(?:him|her|them|the\s+character)\s+look\s+underage\b/gi,
      "keep the character clearly within the locked adult age range",
    ],
    [/\bunderage\b/gi, "younger than the locked age range"],
    [/\bminor(?:s)?\b/gi, "younger character"],
    [/\b(?:bare|exposed|visible)\s+(?:breasts?|chest|cleavage|buttocks?|butt|ass)\b/gi, "editorial styling"],
    [/\b(?:large|big|huge|full|small)\s+(?:breasts?|bust|chest|hips|buttocks?|butt|ass|thighs)\b/gi, "distinctive styling"],
    [/\b(?:breasts?|bust|cleavage|buttocks?|butt|ass)\b/gi, "styling"],
    [/\b(?:hips|thighs)\b/gi, "pose"],
    [/\bhourglass\s+figure\b/gi, "classic editorial styling"],
    [/\b(?:curvy|voluptuous|busty)\b/gi, "confident"],
    [/\b(?:erotic|sensual|sexual|nsfw|explicit|lustful)\b/gi, "editorial"],
    [/\b(?:super\s+)?sexy\b/gi, "confident"],
    [/\bprovocative\b/gi, "playful editorial"],
    [/\bseductive\b/gi, "confident editorial"],
    [/\bnaughty\b/gi, "retro"],
    [/\bfetish\b/gi, "stylized"],
    [/\bpin[-\s]?up\b/gi, "retro editorial"],
    [/\b(?:lingerie|bikini)\b/gi, "styled outfit"],
    [/\b(?:braless|no\s+bra|without\s+a\s+bra)\b/gi, "relaxed outfit"],
    [/\b(?:sheer|transparent|see[-\s]?through)\b/gi, "lightweight"],
    [/\b(?:partially\s+)?unzipped\b/gi, "neatly styled"],
    [/\brevealing\b/gi, "styled"],
    [/\b(?:distinct|visible)\s+tan\s+lines\b/gi, "summer skin details"],
    [/(?:큰|커다란|풍만한)\s*(?:가슴|엉덩이)/g, "분위기 있는 스타일"],
    [/(?:섹시|선정적|도발적|야한|노출|에로틱|관능적)/g, "에디토리얼"],
    [/(?:비키니|란제리|속옷)/g, "스타일링된 의상"],
  ];
  const rewritten = normalizeVideoPromptSpacing(
    replacements.reduce(
      (current, [pattern, replacement]) =>
        current.replace(pattern, replacement),
      prompt,
    ),
  );

  return {
    prompt: rewritten,
    revisedPrompt: rewritten === prompt ? null : rewritten,
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

function getFalRevisedPrompt(output: unknown, prompt: string) {
  if (!output || typeof output !== "object") {
    return null;
  }

  const videoOutput = output as FalVideoOutput;
  const revisedPrompt =
    typeof videoOutput.actual_prompt === "string"
      ? videoOutput.actual_prompt.trim()
      : typeof videoOutput.prompt === "string"
        ? videoOutput.prompt.trim()
        : "";

  return revisedPrompt && revisedPrompt !== prompt ? revisedPrompt : null;
}

function stringifyForDiagnostic(value: unknown, limit = 1_200) {
  if (value == null) {
    return null;
  }

  let text: string;

  if (typeof value === "string") {
    text = value;
  } else {
    try {
      text = JSON.stringify(value);
    } catch {
      text = String(value);
    }
  }

  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function getValidationFieldErrors(error: unknown) {
  if (!(error instanceof ValidationError)) {
    return [];
  }

  try {
    return error.fieldErrors;
  } catch {
    return [];
  }
}

function resolveFalFailureKind(
  error: unknown,
  bodyText: string | null,
  fieldErrors: ValidationErrorInfo[],
): ContentGenerationFailureKind {
  const messageText = error instanceof Error ? error.message : "";
  const fieldErrorText = fieldErrors
    .map((fieldError) =>
      [
        fieldError.loc.join("."),
        fieldError.msg,
        fieldError.type,
      ].join(" "),
    )
    .join(" ");
  const diagnosticText = [
    messageText,
    bodyText ?? "",
    fieldErrorText,
  ]
    .join(" ")
    .toLowerCase();

  if (
    error instanceof ApiError &&
    (error.isUserTimeout || error.status === 504)
  ) {
    return "timeout";
  }

  if (/\b(timeout|timed out)\b/.test(diagnosticText)) {
    return "timeout";
  }

  if (
    /\b(safety|unsafe|nsfw|nudity|sexual|explicit|moderation|policy|blocked|prohibited|disallowed|violation)\b/.test(
      diagnosticText,
    )
  ) {
    return "safety";
  }

  if (error instanceof ValidationError) {
    return "validation";
  }

  if (error instanceof ApiError && error.status === 422) {
    return "validation";
  }

  if (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500
  ) {
    return "provider_rejection";
  }

  return "unknown";
}

function createFalFailureDiagnostic(
  error: unknown,
  fallbackRequestId: string | null,
): FalFailureDiagnostic {
  const apiError = error instanceof ApiError ? error : null;
  const bodyText = stringifyForDiagnostic(apiError?.body);
  const fieldErrors = getValidationFieldErrors(error);
  const message =
    error instanceof Error
      ? error.message
      : "fal video generation failed.";

  return {
    bodyText,
    fieldErrors,
    kind: resolveFalFailureKind(error, bodyText, fieldErrors),
    message,
    requestId: apiError?.requestId || fallbackRequestId,
    status: apiError?.status ?? null,
  };
}

function createFalFailureMessage(diagnostic: FalFailureDiagnostic) {
  const status = diagnostic.status ? ` status=${diagnostic.status}` : "";
  const requestId = diagnostic.requestId
    ? ` requestId=${diagnostic.requestId}`
    : "";
  const bodyDetail = diagnostic.bodyText ? ` ${diagnostic.bodyText}` : "";

  return [
    `fal video generation failed (${diagnostic.kind}).`,
    `${diagnostic.message}${bodyDetail}`,
    `${status}${requestId}`.trim(),
  ]
    .filter(Boolean)
    .join(" ");
}

function createFalInputDiagnostic(input: FalVideoInput) {
  const {
    negative_prompt: negativePrompt,
    prompt,
    ...options
  } = input;

  return {
    ...options,
    negativePromptLength: negativePrompt?.length ?? 0,
    negativePromptPreview: negativePrompt
      ? negativePrompt.slice(0, 240)
      : null,
    promptLength: prompt.length,
    promptPreview: prompt.slice(0, 600),
  };
}

function createPublicFalInputDiagnostic(input: FalVideoInput) {
  const negativePrompt = input.negative_prompt ?? "";

  return {
    aspectRatio: "aspect_ratio" in input ? input.aspect_ratio : null,
    duration: "duration" in input ? input.duration : null,
    enablePromptExpansion:
      "enable_prompt_expansion" in input
        ? input.enable_prompt_expansion
        : null,
    enableSafetyChecker:
      "enable_safety_checker" in input ? input.enable_safety_checker : null,
    generateAudio:
      "generate_audio" in input ? input.generate_audio : null,
    negativePromptLength: negativePrompt.length,
    promptLength: input.prompt.length,
    referenceImageCount:
      "reference_image_urls" in input
        ? input.reference_image_urls.length
        : "image_urls" in input
          ? input.image_urls.length
          : "subject_reference_image_url" in input
            ? 1
            : 0,
    resolution: "resolution" in input ? input.resolution : null,
    safetyTolerance:
      "safety_tolerance" in input ? input.safety_tolerance : null,
  } satisfies ContentGenerationFailureDiagnostic["modelInput"];
}

function createPublicFalFailureDiagnostic({
  diagnostic,
  model,
  modelInput,
}: {
  diagnostic: FalFailureDiagnostic;
  model: FalModelName;
  modelInput: FalVideoInput;
}): ContentGenerationFailureDiagnostic {
  return {
    fieldErrors: diagnostic.fieldErrors,
    kind: diagnostic.kind,
    message: diagnostic.message,
    model,
    modelFamily: resolveModelFamily(model),
    modelInput: createPublicFalInputDiagnostic(modelInput),
    requestId: diagnostic.requestId,
    responseSummary: diagnostic.bodyText,
    status: diagnostic.status,
  };
}

function createFalGenerationError({
  error,
  model,
  modelInput,
  requestId,
}: {
  error: unknown;
  model: FalModelName;
  modelInput: FalVideoInput;
  requestId: string | null;
}) {
  const diagnostic = createFalFailureDiagnostic(error, requestId);
  const publicDiagnostic = createPublicFalFailureDiagnostic({
    diagnostic,
    model,
    modelInput,
  });

  console.error("[content-video] fal video generation failed", {
    diagnostic,
    model,
    modelFamily: resolveModelFamily(model),
    modelInput: createFalInputDiagnostic(modelInput),
  });

  return new ContentVideoGenerationError(
    createFalFailureMessage(diagnostic),
    publicDiagnostic,
  );
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
  const qualityMode = input.qualityMode ?? "standard";

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

  const personaAppliedPrompt = applyCreatorCharacterPersonaToPrompt(
    visualBrief,
    input.characterPersona,
  );
  const avatarReferenceUrls = normalizeAvatarReferenceUrls(
    input.avatarImageUrls,
    input.avatarImageUrl,
  );
  const personCenteredPrompt = appendPersonCenteredReferenceDirection(
    personaAppliedPrompt,
    avatarReferenceUrls,
    qualityMode,
  );
  const { prompt: safetyPrompt } =
    rewritePromptForSaferVideoGeneration(personCenteredPrompt);
  const { prompt } = rewritePromptForFalContentChecker(safetyPrompt);
  const revisedPrompt = prompt === visualBrief ? null : prompt;
  const model = resolveModelName(avatarReferenceUrls.length > 0);
  const modelDisplayName = getModelDisplayName(model);

  await reportProgress(input.onProgress, {
    message: "Video prompt is ready. Starting content video generation.",
    progress: 28,
    status: "completed",
    step: "preparing_prompt",
  });

  await reportProgress(input.onProgress, {
    message: `Generating the AI content video with ${modelDisplayName}.`,
    progress: 42,
    status: "running",
    step: "generating_image",
  });

  const modelInput = createModelInput({
    avatarImageUrls: avatarReferenceUrls,
    model,
    prompt,
    qualityMode,
  });
  const fal = createFalClient({ credentials: falKey });
  let falRequestId: string | null = null;

  let result: { data: unknown };

  try {
    result = await fal.subscribe(model, {
      input: modelInput,
      logs: true,
      mode: "polling",
      onEnqueue(requestId) {
        falRequestId = requestId;
      },
      onQueueUpdate(status) {
        reportFalQueueStatus(input.onProgress, status);
      },
      pollInterval: 1000,
      timeout: getFalTimeoutMs(),
    });
  } catch (error) {
    const generationError = createFalGenerationError({
      error,
      model,
      modelInput,
      requestId: falRequestId,
    });

    await reportProgress(input.onProgress, {
      message: generationError.message,
      progress: 62,
      status: "failed",
      step: "generating_image",
    });

    throw generationError;
  }

  await reportProgress(input.onProgress, {
    message: "AI video created. Preparing upload.",
    progress: 74,
    status: "completed",
    step: "generating_image",
  });

  const falVideo = getFalVideoFile(result.data);
  const falRevisedPrompt = getFalRevisedPrompt(result.data, prompt);
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
    revisedPrompt: falRevisedPrompt ?? revisedPrompt,
    url: uploaded.url,
  };
}
