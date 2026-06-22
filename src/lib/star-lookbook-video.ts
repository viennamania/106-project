import "server-only";

import { randomUUID } from "crypto";
import { createFalClient } from "@fal-ai/client";
import { put } from "@vercel/blob";

/**
 * Lookbook image -> short vertical video (for social / shorts).
 *
 * Uses fal reference-to-video. Inherits the content pipeline's proven video
 * model env (FAL_CONTENT_VIDEO_REFERENCE_MODEL) to maximize the chance the
 * production FAL_KEY has access, since the still-image model (nano-banana) was
 * denied and we don't want to repeat that.
 */

const DEFAULT_MODEL = "fal-ai/veo3.1/reference-to-video";
const DEFAULT_TIMEOUT_MS = 220_000;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 45_000;

type FalVideoFile = { url: string; content_type?: string };
type FalVideoOutput = { video?: FalVideoFile };

function resolveVideoModel() {
  return (
    process.env.FAL_LOOKBOOK_VIDEO_MODEL?.trim() ||
    process.env.FAL_CONTENT_VIDEO_REFERENCE_MODEL?.trim() ||
    DEFAULT_MODEL
  );
}

function createVideoPrompt(sceneBrief: string) {
  const scene = sceneBrief
    ? ` Scene: ${sceneBrief}.`
    : "";

  return [
    "A short Korean fashion lookbook video of the same model wearing the exact same outfit as the reference image.",
    "Subtle, natural motion: a gentle turn, a confident pose, hair and fabric moving softly.",
    "Keep the garment's color, print, logos, and fit identical to the reference. Same single model, realistic anatomy.",
    "Commercial fashion video, clean lighting, vertical framing, no text, no watermark." + scene,
  ].join(" ");
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

function getFalErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as {
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown };
  };
  if (typeof candidate.status === "number") return candidate.status;
  if (typeof candidate.statusCode === "number") return candidate.statusCode;
  if (typeof candidate.response?.status === "number") {
    return candidate.response.status;
  }
  return null;
}

function normalizeVideoError(error: unknown, model: string): Error {
  const base =
    error instanceof Error ? error.message : "AI lookbook video failed.";
  const status = getFalErrorStatus(error);
  const detail = `(model: ${model}${status ? `, status: ${status}` : ""})`;

  if (
    status === 401 ||
    status === 403 ||
    /forbidden|unauthorized|access denied/i.test(base)
  ) {
    return new Error(
      `fal denied the video request ${detail}. The FAL_KEY may lack access to this video model — set FAL_LOOKBOOK_VIDEO_MODEL to an accessible reference-to-video model.`,
    );
  }

  return new Error(`${base} ${detail}`);
}

export async function generateStarLookbookVideo({
  imageUrl,
  referralCode,
  sceneBrief,
}: {
  imageUrl: string;
  referralCode: string;
  sceneBrief?: string | null;
}): Promise<{ url: string; pathname: string; contentType: string }> {
  const falKey = process.env.FAL_KEY?.trim();

  if (!falKey) {
    throw new Error("FAL_KEY is not configured.");
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }

  if (!imageUrl?.trim()) {
    throw new Error("imageUrl is required.");
  }

  const model = resolveVideoModel();
  const input = {
    aspect_ratio:
      process.env.FAL_LOOKBOOK_VIDEO_ASPECT_RATIO?.trim() || "9:16",
    duration: process.env.FAL_LOOKBOOK_VIDEO_DURATION?.trim() || "6s",
    generate_audio: false,
    image_urls: [imageUrl.trim()],
    prompt: createVideoPrompt((sceneBrief ?? "").trim()),
    resolution: process.env.FAL_LOOKBOOK_VIDEO_RESOLUTION?.trim() || "720p",
  };

  const fal = createFalClient({ credentials: falKey });

  let result: Awaited<ReturnType<typeof fal.subscribe>>;

  try {
    result = await fal.subscribe(model, {
      input,
      logs: true,
      mode: "polling",
      pollInterval: 1500,
      timeout: DEFAULT_TIMEOUT_MS,
    });
  } catch (error) {
    throw normalizeVideoError(error, model);
  }

  const video = (result.data as FalVideoOutput)?.video;

  if (!video?.url) {
    throw new Error("fal returned no video.");
  }

  const response = await withTimeout(
    fetch(video.url, { method: "GET" }),
    DEFAULT_DOWNLOAD_TIMEOUT_MS,
    "lookbook video download",
  );

  if (!response.ok) {
    throw new Error(`fal returned an unreadable video URL (${response.status}).`);
  }

  const blob = await response.blob();
  const contentType = blob.type || video.content_type || "video/mp4";
  const pathname = [
    "fanletter-lookbook",
    referralCode,
    "videos",
    `${Date.now()}-${randomUUID().slice(0, 8)}.mp4`,
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
    url: uploaded.url,
  };
}
