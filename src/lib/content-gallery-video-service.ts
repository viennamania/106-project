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
} from "@/lib/content";

const TITLE_LIMIT = 120;
const SUMMARY_LIMIT = 240;
const DEFAULT_MODEL = "fal-ai/wan/v2.7/text-to-video";
const DEFAULT_ASPECT_RATIO = "9:16";
const DEFAULT_DURATION = "8s";
const DEFAULT_GENERATE_AUDIO = true;
const DEFAULT_RESOLUTION = "720p";
const DEFAULT_SAFETY_TOLERANCE = "6";
const DEFAULT_TIMEOUT_MS = 290_000;

type FalModelFamily = "veo" | "wan-v2.7";

type FalVeoVideoInput = {
  aspect_ratio: "16:9" | "9:16";
  auto_fix: boolean;
  duration: "4s" | "6s" | "8s";
  generate_audio: boolean;
  negative_prompt?: string;
  prompt: string;
  resolution: "720p" | "1080p";
  safety_tolerance: "1" | "2" | "3" | "4" | "5" | "6";
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

type FalVideoInput = FalVeoVideoInput | FalWanVideoInput;

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

function parseWanDuration(value: string | undefined) {
  const normalized = value?.trim().replace(/s$/i, "");
  const parsed = Number(normalized);
  const duration = Number.isFinite(parsed) ? Math.round(parsed) : 8;
  const clamped = Math.max(2, Math.min(15, duration));

  return clamped as FalWanVideoInput["duration"];
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

function resolveModelFamily(model: FalModelName): FalModelFamily {
  if (model === "fal-ai/wan/v2.7/text-to-video") {
    return "wan-v2.7";
  }

  return "veo";
}

function getModelDisplayName(model: FalModelName) {
  if (resolveModelFamily(model) === "wan-v2.7") {
    return "fal Wan 2.7";
  }

  if (model === "fal-ai/veo3.1/lite") {
    return "fal Veo 3.1 Lite";
  }

  return model;
}

function createVeoModelInput(prompt: string): FalVeoVideoInput {
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

function createWanModelInput(prompt: string): FalWanVideoInput {
  const aspectRatio = parseEnum(
    process.env.FAL_CONTENT_VIDEO_ASPECT_RATIO,
    ["16:9", "9:16", "1:1", "4:3", "3:4"] as const,
    DEFAULT_ASPECT_RATIO,
  );
  const resolution = parseEnum(
    process.env.FAL_CONTENT_VIDEO_RESOLUTION,
    ["720p", "1080p"] as const,
    DEFAULT_RESOLUTION,
  );
  const negativePrompt = process.env.FAL_CONTENT_VIDEO_NEGATIVE_PROMPT?.trim();
  const audioUrl = process.env.FAL_CONTENT_VIDEO_AUDIO_URL?.trim();

  return {
    aspect_ratio: aspectRatio,
    ...(audioUrl ? { audio_url: audioUrl } : {}),
    duration: parseWanDuration(process.env.FAL_CONTENT_VIDEO_DURATION),
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

function createModelInput(model: FalModelName, prompt: string): FalVideoInput {
  if (resolveModelFamily(model) === "wan-v2.7") {
    return createWanModelInput(prompt);
  }

  return createVeoModelInput(prompt);
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
    [/\bhourglass\s+figure\b/gi, "classic fashion silhouette"],
    [/\bsoft\s+athletic\s+thighs\b/gi, "athletic editorial pose"],
    [/\bpartially\s+unzipped\b/gi, "neatly styled"],
    [/\btasteful\s+cleavage\b/gi, "fashion neckline"],
    [/\bcleavage\b/gi, "fashion neckline"],
    [/\bsheer\s+stockings\b/gi, "vintage stockings"],
    [/\bwearing\s+a\s+loose\s+shirt\s+and\s+no\s+bra\b/gi, "wearing a loose summer shirt"],
    [/\bwithout\s+a\s+bra\b/gi, "in a relaxed summer outfit"],
    [/\bno\s+bra\b/gi, "relaxed summer outfit"],
    [/\bbraless\b/gi, "relaxed summer outfit"],
    [/\bstrikingly\s+large\s+bust\s+and\s+hips\b/gi, "confident fashion-model silhouette"],
    [/\blarge\s+bust\s+and\s+hips\b/gi, "fashion-model silhouette"],
    [/\bbig\s+bust\b/gi, "elegant silhouette"],
    [/\blarge\s+bust\b/gi, "elegant silhouette"],
    [/\bbust\b/gi, "silhouette"],
    [/\bwide\s+hips\b/gi, "balanced fashion silhouette"],
    [/\bhips\b/gi, "silhouette"],
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
    aspectRatio: input.aspect_ratio ?? null,
    duration: input.duration ?? null,
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
    resolution: input.resolution ?? null,
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

  const { prompt, revisedPrompt } = rewritePromptForSaferVideoGeneration(
    visualBrief,
  );
  const model = resolveModelName();
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

  const modelInput = createModelInput(model, prompt);
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
