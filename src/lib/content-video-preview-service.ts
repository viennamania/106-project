import "server-only";

import { put } from "@vercel/blob";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import ffmpegStatic from "ffmpeg-static";

import {
  CONTENT_GENERATED_VIDEO_PATH_SEGMENT,
  CONTENT_POSTS_BLOB_PATH_SEGMENT,
  CONTENT_PREVIEW_VIDEO_PATH_SEGMENT,
  CONTENT_UPLOADED_VIDEO_PATH_SEGMENT,
  CONTENT_VIDEO_MAX_BYTES,
  type ContentPostVideoPreviewResponse,
} from "@/lib/content";

const PREVIEW_DURATION_SEC = 6;
const PREVIEW_CONTENT_TYPE = "video/mp4";
const PREVIEW_MAX_SOURCE_BYTES = CONTENT_VIDEO_MAX_BYTES;
const FFMPEG_TIMEOUT_MS = 150_000;
const SOURCE_DOWNLOAD_ATTEMPT_COUNT = 3;
const SOURCE_DOWNLOAD_RETRY_DELAY_MS = 1_500;
const SOURCE_DOWNLOAD_TIMEOUT_MS = 90_000;

function sanitizeBaseName(value: string) {
  const sanitized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

  return sanitized || "content-video-preview";
}

function safelyDecodePathSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function getPathSegmentsFromUrl(value: string) {
  const trimmedUrl = value.trim();
  let pathname = trimmedUrl;

  try {
    pathname = new URL(trimmedUrl).pathname;
  } catch {
    pathname = trimmedUrl.split(/[?#]/, 1)[0] ?? trimmedUrl;
  }

  return pathname
    .split("/")
    .map((segment) => safelyDecodePathSegment(segment.trim()))
    .filter(Boolean);
}

function getSourceVideoPathInfo(sourceVideoUrl: string) {
  const segments = getPathSegmentsFromUrl(sourceVideoUrl);
  const contentRootIndex = segments.indexOf(CONTENT_POSTS_BLOB_PATH_SEGMENT);

  if (contentRootIndex < 0) {
    return null;
  }

  return {
    fileName: segments.at(-1) ?? "",
    referralCode: segments[contentRootIndex + 1] ?? "",
    sourceSegment: segments[contentRootIndex + 2] ?? "",
  };
}

export function isPreviewableContentVideoUrl({
  referralCode,
  sourceVideoUrl,
}: {
  referralCode: string;
  sourceVideoUrl: string;
}) {
  const sourceInfo = getSourceVideoPathInfo(sourceVideoUrl);

  return (
    sourceInfo?.referralCode === referralCode &&
    (sourceInfo.sourceSegment === CONTENT_UPLOADED_VIDEO_PATH_SEGMENT ||
      sourceInfo.sourceSegment === CONTENT_GENERATED_VIDEO_PATH_SEGMENT)
  );
}

function resolveFfmpegPath() {
  const configured = process.env.FFMPEG_PATH?.trim();

  if (configured) {
    return configured;
  }

  return ffmpegStatic || "ffmpeg";
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    windowlessSetTimeout(resolve, ms);
  });
}

function isRetriableSourceDownloadError(error: unknown) {
  return !(
    error instanceof Error &&
    error.message === "Source video is larger than the preview limit."
  );
}

async function downloadSourceVideoOnce(
  sourceVideoUrl: string,
  destinationPath: string,
) {
  const controller = new AbortController();
  const timeout = windowlessSetTimeout(
    () => controller.abort(),
    SOURCE_DOWNLOAD_TIMEOUT_MS,
  );
  const response = await fetch(sourceVideoUrl, {
    signal: controller.signal,
  }).finally(() => {
    windowlessClearTimeout(timeout);
  });

  if (!response.ok || !response.body) {
    throw new Error("Failed to download source video for preview.");
  }

  const contentLength = Number.parseInt(
    response.headers.get("content-length") ?? "",
    10,
  );

  if (
    Number.isFinite(contentLength) &&
    contentLength > PREVIEW_MAX_SOURCE_BYTES
  ) {
    throw new Error("Source video is larger than the preview limit.");
  }

  await pipeline(
    Readable.fromWeb(
      response.body as unknown as Parameters<typeof Readable.fromWeb>[0],
    ),
    createWriteStream(destinationPath),
  );

  const fileStat = await stat(destinationPath);

  if (fileStat.size <= 0) {
    throw new Error("Downloaded source video is empty.");
  }

  if (fileStat.size > PREVIEW_MAX_SOURCE_BYTES) {
    throw new Error("Source video is larger than the preview limit.");
  }
}

async function downloadSourceVideo(sourceVideoUrl: string, destinationPath: string) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= SOURCE_DOWNLOAD_ATTEMPT_COUNT; attempt += 1) {
    try {
      await downloadSourceVideoOnce(sourceVideoUrl, destinationPath);
      return;
    } catch (error) {
      lastError = error;

      if (
        attempt >= SOURCE_DOWNLOAD_ATTEMPT_COUNT ||
        !isRetriableSourceDownloadError(error)
      ) {
        break;
      }

      await rm(destinationPath, { force: true }).catch(() => null);
      await delay(SOURCE_DOWNLOAD_RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to download source video for preview.");
}

async function runFfmpeg(inputPath: string, outputPath: string) {
  const ffmpegPath = resolveFfmpegPath();
  const args = [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    inputPath,
    "-map",
    "0:v:0",
    "-t",
    String(PREVIEW_DURATION_SEC),
    "-vf",
    "scale=min(720\\,iw):-2",
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "30",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath,
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    const timeout = windowlessSetTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Timed out while generating preview video."));
    }, FFMPEG_TIMEOUT_MS);

    child.stderr.on("data", (chunk: Buffer) => {
      stderr = `${stderr}${chunk.toString("utf8")}`.slice(-4000);
    });
    child.on("error", (error) => {
      windowlessClearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      windowlessClearTimeout(timeout);

      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          stderr.trim() || `ffmpeg exited with status ${code ?? "unknown"}.`,
        ),
      );
    });
  });

  const outputStat = await stat(outputPath);

  if (outputStat.size <= 0) {
    throw new Error("Generated preview video is empty.");
  }
}

const windowlessSetTimeout: typeof setTimeout = globalThis.setTimeout.bind(
  globalThis,
);
const windowlessClearTimeout: typeof clearTimeout = globalThis.clearTimeout.bind(
  globalThis,
);

export async function createContentVideoPreview({
  referralCode,
  sourceVideoUrl,
  title,
}: {
  referralCode: string;
  sourceVideoUrl: string;
  title?: string | null;
}): Promise<ContentPostVideoPreviewResponse> {
  const normalizedSourceVideoUrl = sourceVideoUrl.trim();

  if (!isPreviewableContentVideoUrl({ referralCode, sourceVideoUrl })) {
    throw new Error("Source video URL is not allowed for preview generation.");
  }

  const sourceInfo = getSourceVideoPathInfo(normalizedSourceVideoUrl);
  const sourceBaseName = sourceInfo?.fileName
    ? basename(sourceInfo.fileName, extname(sourceInfo.fileName))
    : "";
  const previewBaseName = sanitizeBaseName(title?.trim() || sourceBaseName);
  const tempDirectory = await mkdtemp(join(tmpdir(), "fanletter-video-preview-"));
  const inputPath = join(tempDirectory, `source-${randomUUID()}.video`);
  const outputPath = join(tempDirectory, `preview-${randomUUID()}.mp4`);

  try {
    await downloadSourceVideo(normalizedSourceVideoUrl, inputPath);
    await runFfmpeg(inputPath, outputPath);

    const previewBuffer = await readFile(outputPath);
    const pathname = [
      CONTENT_POSTS_BLOB_PATH_SEGMENT,
      referralCode,
      CONTENT_PREVIEW_VIDEO_PATH_SEGMENT,
      `${Date.now()}-${previewBaseName}.mp4`,
    ].join("/");
    const uploaded = await put(
      pathname,
      new Blob([previewBuffer], { type: PREVIEW_CONTENT_TYPE }),
      {
        access: "public",
        addRandomSuffix: true,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
        contentType: PREVIEW_CONTENT_TYPE,
      },
    );

    return {
      contentType: uploaded.contentType ?? PREVIEW_CONTENT_TYPE,
      durationSec: PREVIEW_DURATION_SEC,
      pathname: uploaded.pathname,
      sourceVideoUrl: normalizedSourceVideoUrl,
      url: uploaded.url,
    };
  } finally {
    await rm(tempDirectory, { force: true, recursive: true }).catch(() => null);
  }
}
