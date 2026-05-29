import "server-only";

import { put } from "@vercel/blob";
import ffmpegStatic from "ffmpeg-static";
import { spawn } from "node:child_process";
import { accessSync, constants, createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  resolve,
} from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import {
  CONTENT_GENERATED_VIDEO_PATH_SEGMENT,
  CONTENT_POSTS_BLOB_PATH_SEGMENT,
  CONTENT_PREVIEW_VIDEO_PATH_SEGMENT,
  CONTENT_UPLOADED_VIDEO_PATH_SEGMENT,
  CONTENT_VIDEO_MAX_BYTES,
  type ContentPostVideoPreviewResponse,
} from "@/lib/content-video-shared";

const PREVIEW_DURATION_SEC = 6;
const PREVIEW_CONTENT_TYPE = "video/mp4";
const PREVIEW_MAX_SOURCE_BYTES = CONTENT_VIDEO_MAX_BYTES;
const PREVIEW_MAX_OUTPUT_BYTES = 25 * 1024 * 1024;
const FFMPEG_TIMEOUT_MS = 150_000;
const SOURCE_DOWNLOAD_ATTEMPT_COUNT = 6;
const SOURCE_DOWNLOAD_RETRY_DELAY_MS = 2_000;
const SOURCE_DOWNLOAD_TIMEOUT_MS = 90_000;
const requireFromThisModule = createRequire(import.meta.url);

function canExecuteFile(filePath: string) {
  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function addFfmpegPathCandidate(candidates: string[], value: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return;
  }

  candidates.push(trimmed);

  if (!isAbsolute(trimmed)) {
    candidates.push(resolve(process.cwd(), trimmed));
    return;
  }

  if (!trimmed.startsWith("/ROOT/")) {
    return;
  }

  const rootRelativePath = trimmed.slice("/ROOT/".length);
  const taskRoot = process.env.LAMBDA_TASK_ROOT?.trim();

  if (taskRoot) {
    candidates.push(join(taskRoot, rootRelativePath));
  }

  candidates.push(join(process.cwd(), rootRelativePath));
}

function getPackagedFfmpegBinaryPath() {
  try {
    const packageJsonPath = requireFromThisModule.resolve(
      "ffmpeg-static/package.json",
    );
    const executableName =
      process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";

    return join(dirname(packageJsonPath), executableName);
  } catch {
    return null;
  }
}

function getFfmpegBinaryPath() {
  const candidates: string[] = [];

  addFfmpegPathCandidate(candidates, process.env.FFMPEG_PATH ?? null);
  addFfmpegPathCandidate(candidates, ffmpegStatic);
  addFfmpegPathCandidate(candidates, getPackagedFfmpegBinaryPath());

  const executablePath = candidates.find(canExecuteFile);

  if (executablePath) {
    return executablePath;
  }

  return (
    candidates.find((candidate) => !candidate.startsWith("/ROOT/")) ??
    ffmpegStatic ??
    "ffmpeg"
  );
}

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

function formatPreviewError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
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

function createSourceByteLimitTransform() {
  let totalBytes = 0;

  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      totalBytes += chunk.length;

      if (totalBytes > PREVIEW_MAX_SOURCE_BYTES) {
        callback(new Error("Source video is larger than the preview limit."));
        return;
      }

      callback(null, chunk);
    },
  });
}

async function fetchSourceVideo(sourceVideoUrl: string) {
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
    throw new Error(
      `Failed to download source video for preview (${response.status}).`,
    );
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

  return response.body;
}

async function downloadSourceVideoToTempFile(sourceVideoUrl: string) {
  const sourceBody = await fetchSourceVideo(sourceVideoUrl);
  const tempDirPath = await mkdtemp(join(tmpdir(), "content-preview-"));
  const inputPath = join(tempDirPath, "source.mp4");

  try {
    await pipeline(
      Readable.fromWeb(
        sourceBody as unknown as Parameters<typeof Readable.fromWeb>[0],
      ),
      createSourceByteLimitTransform(),
      createWriteStream(inputPath),
    );

    return {
      inputPath,
      cleanup: () => rm(tempDirPath, { force: true, recursive: true }),
    };
  } catch (error) {
    await rm(tempDirPath, { force: true, recursive: true }).catch(() => {});
    throw error;
  }
}

async function transcodeSourceVideo(sourceVideoUrl: string) {
  const ffmpegPath = getFfmpegBinaryPath();
  const tempSource = await downloadSourceVideoToTempFile(sourceVideoUrl);
  const args = [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    tempSource.inputPath,
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
    "-f",
    "mp4",
    "-movflags",
    "frag_keyframe+empty_moov+default_base_moof",
    "pipe:1",
  ];

  console.info("[content-preview] ffmpeg preview process starting", {
    ffmpegPath,
    inputMode: "temp-file",
  });

  try {
    return await new Promise<Buffer>((resolve, reject) => {
      const child = spawn(ffmpegPath, args, {
        stdio: ["ignore", "pipe", "pipe"],
      });
      const outputChunks: Buffer[] = [];
      let stderr = "";
      let outputBytes = 0;
      let settled = false;
      const timeout = windowlessSetTimeout(() => {
        child.kill("SIGKILL");
        settle(new Error("Timed out while generating preview video."));
      }, FFMPEG_TIMEOUT_MS);

      function settle(error: Error | null, buffer?: Buffer) {
        if (settled) {
          return;
        }

        settled = true;
        windowlessClearTimeout(timeout);

        if (error) {
          reject(error);
          return;
        }

        resolve(buffer ?? Buffer.alloc(0));
      }

      child.stdout.on("data", (chunk: Buffer) => {
        outputBytes += chunk.length;

        if (outputBytes > PREVIEW_MAX_OUTPUT_BYTES) {
          child.kill("SIGKILL");
          settle(new Error("Generated preview video is larger than expected."));
          return;
        }

        outputChunks.push(chunk);
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr = `${stderr}${chunk.toString("utf8")}`.slice(-4000);
      });
      child.on("error", (error) => {
        settle(
          new Error(
            `Failed to start ffmpeg preview process (${ffmpegPath}): ${
              error.message
            }`,
          ),
        );
      });
      child.on("close", (code) => {
        if (code === 0) {
          const outputBuffer = Buffer.concat(outputChunks, outputBytes);

          if (outputBuffer.length <= 0) {
            settle(new Error("Generated preview video is empty."));
            return;
          }

          settle(null, outputBuffer);
          return;
        }

        settle(
          new Error(
            stderr.trim() || `ffmpeg exited with status ${code ?? "unknown"}.`,
          ),
        );
      });
    });
  } finally {
    await tempSource.cleanup().catch((error: unknown) => {
      console.warn("[content-preview] failed to clean up temp source video", {
        error: formatPreviewError(error),
      });
    });
  }
}

async function createPreviewBuffer(sourceVideoUrl: string) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= SOURCE_DOWNLOAD_ATTEMPT_COUNT; attempt += 1) {
    try {
      return await transcodeSourceVideo(sourceVideoUrl);
    } catch (error) {
      lastError = error;

      if (
        attempt >= SOURCE_DOWNLOAD_ATTEMPT_COUNT ||
        !isRetriableSourceDownloadError(error)
      ) {
        break;
      }

      await delay(SOURCE_DOWNLOAD_RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to generate preview video.");
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
  const logContext = {
    referralCode,
    sourceFileName: sourceInfo?.fileName ?? "",
    sourceSegment: sourceInfo?.sourceSegment ?? "",
  };
  const sourceBaseName = sourceInfo?.fileName
    ? basename(sourceInfo.fileName, extname(sourceInfo.fileName))
    : "";
  const previewBaseName = sanitizeBaseName(title?.trim() || sourceBaseName);

  try {
    console.info("[content-preview] preview generation started", logContext);
    const previewBuffer = await createPreviewBuffer(normalizedSourceVideoUrl);
    console.info("[content-preview] preview video generated", {
      ...logContext,
      previewBytes: previewBuffer.length,
    });

    const pathname = [
      CONTENT_POSTS_BLOB_PATH_SEGMENT,
      referralCode,
      CONTENT_PREVIEW_VIDEO_PATH_SEGMENT,
      `${Date.now()}-${previewBaseName}.mp4`,
    ].join("/");
    const uploaded = await put(
      pathname,
      previewBuffer,
      {
        access: "public",
        addRandomSuffix: true,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
        contentType: PREVIEW_CONTENT_TYPE,
      },
    );

    console.info("[content-preview] preview video uploaded", {
      ...logContext,
      pathname: uploaded.pathname,
    });

    return {
      contentType: uploaded.contentType ?? PREVIEW_CONTENT_TYPE,
      durationSec: PREVIEW_DURATION_SEC,
      pathname: uploaded.pathname,
      sourceVideoUrl: normalizedSourceVideoUrl,
      url: uploaded.url,
    };
  } catch (error) {
    console.error("[content-preview] preview generation failed", {
      ...logContext,
      error: formatPreviewError(error),
    });
    throw error;
  }
}
