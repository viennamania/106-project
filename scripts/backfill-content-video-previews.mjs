import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { put } from "@vercel/blob";
import ffmpegStatic from "ffmpeg-static";
import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

const CONTENT_POSTS_BLOB_PATH_SEGMENT = "content-posts";
const CONTENT_PREVIEW_VIDEO_PATH_SEGMENT = "preview-videos";
const DEFAULT_BACKFILL_LIMIT = 25;
const MAX_BACKFILL_LIMIT = 500;
const PREVIEW_CONTENT_TYPE = "video/mp4";
const PREVIEW_DURATION_SEC = 6;
const FFMPEG_TIMEOUT_MS = 150_000;
const SOURCE_DOWNLOAD_TIMEOUT_MS = 90_000;
const CONTENT_VIDEO_MAX_BYTES = 200 * 1024 * 1024;

const writeChanges = ["1", "true", "yes"].includes(
  (process.env.CONTENT_VIDEO_PREVIEW_BACKFILL_WRITE ?? "").trim().toLowerCase(),
);
const limit = normalizeLimit(process.env.CONTENT_VIDEO_PREVIEW_BACKFILL_LIMIT);
const targetContentIds = parseCsv(
  process.env.CONTENT_VIDEO_PREVIEW_BACKFILL_CONTENT_IDS,
);
const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB_NAME?.trim();
const postsCollectionName =
  process.env.MONGODB_CONTENT_POSTS_COLLECTION?.trim() ?? "contentPosts";

if (!uri) {
  throw new Error("MONGODB_URI is not configured.");
}

if (!dbName) {
  throw new Error("MONGODB_DB_NAME is not configured.");
}

if (writeChanges && !process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
  throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
}

function parseCsv(value) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function normalizeLimit(value) {
  const parsed = Number.parseInt(value?.trim() ?? "", 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_BACKFILL_LIMIT;
  }

  return Math.min(parsed, MAX_BACKFILL_LIMIT);
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value.map((item) => normalizeString(item)).filter(Boolean)
    : [];
}

function sanitizeBaseName(value) {
  const sanitized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

  return sanitized || "content-video-preview";
}

function getFfmpegPath() {
  return process.env.FFMPEG_PATH?.trim() || ffmpegStatic || "ffmpeg";
}

async function downloadSourceVideo(sourceVideoUrl, destinationPath) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, SOURCE_DOWNLOAD_TIMEOUT_MS);
  const response = await fetch(sourceVideoUrl, {
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeout);
  });

  if (!response.ok || !response.body) {
    throw new Error("Failed to download source video.");
  }

  const contentLength = Number.parseInt(
    response.headers.get("content-length") ?? "",
    10,
  );

  if (Number.isFinite(contentLength) && contentLength > CONTENT_VIDEO_MAX_BYTES) {
    throw new Error("Source video exceeds the 200MB limit.");
  }

  await pipeline(Readable.fromWeb(response.body), createWriteStream(destinationPath));

  const fileStat = await stat(destinationPath);

  if (fileStat.size <= 0) {
    throw new Error("Downloaded source video is empty.");
  }

  if (fileStat.size > CONTENT_VIDEO_MAX_BYTES) {
    throw new Error("Source video exceeds the 200MB limit.");
  }
}

async function runFfmpeg(inputPath, outputPath) {
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

  await new Promise((resolve, reject) => {
    const child = spawn(getFfmpegPath(), args, {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Timed out while generating preview video."));
    }, FFMPEG_TIMEOUT_MS);

    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk.toString("utf8")}`.slice(-4000);
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);

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
}

async function createPreview({ post, sourceVideoUrl }) {
  const tempDirectory = await mkdtemp(join(tmpdir(), "fanletter-preview-backfill-"));
  const inputPath = join(tempDirectory, `source-${randomUUID()}.video`);
  const outputPath = join(tempDirectory, `preview-${randomUUID()}.mp4`);

  try {
    await downloadSourceVideo(sourceVideoUrl, inputPath);
    await runFfmpeg(inputPath, outputPath);

    const outputStat = await stat(outputPath);

    if (outputStat.size <= 0) {
      throw new Error("Generated preview video is empty.");
    }

    const previewBuffer = await readFile(outputPath);
    const sourceBaseName = basename(sourceVideoUrl.split(/[?#]/, 1)[0], extname(sourceVideoUrl));
    const previewBaseName = sanitizeBaseName(post.title || sourceBaseName);
    const pathname = [
      CONTENT_POSTS_BLOB_PATH_SEGMENT,
      normalizeString(post.authorReferralCode),
      CONTENT_PREVIEW_VIDEO_PATH_SEGMENT,
      `${Date.now()}-${previewBaseName}.mp4`,
    ].join("/");

    return put(pathname, new Blob([previewBuffer], { type: PREVIEW_CONTENT_TYPE }), {
      access: "public",
      addRandomSuffix: true,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
      contentType: PREVIEW_CONTENT_TYPE,
    });
  } finally {
    await rm(tempDirectory, { force: true, recursive: true }).catch(() => null);
  }
}

function buildFilter() {
  return {
    "contentVideoUrls.0": { $exists: true },
    ...(targetContentIds.size > 0 ? { contentId: { $in: [...targetContentIds] } } : {}),
    $or: [
      { previewClipVideoUrl: { $exists: false } },
      { previewClipVideoUrl: null },
      { previewClipVideoUrl: "" },
    ],
  };
}

const summary = {
  dryRun: !writeChanges,
  failed: 0,
  limit,
  scanned: 0,
  skippedMissingReferral: 0,
  skippedMissingVideo: 0,
  updated: 0,
  wouldUpdate: 0,
};
const failedItems = [];
const client = new MongoClient(uri);

try {
  await client.connect();

  const collection = client.db(dbName).collection(postsCollectionName);
  const posts = await collection
    .find(buildFilter(), {
      projection: {
        _id: 1,
        authorReferralCode: 1,
        contentId: 1,
        contentVideoUrls: 1,
        title: 1,
      },
    })
    .sort({ updatedAt: -1, createdAt: -1, contentId: -1 })
    .limit(limit)
    .toArray();

  for (const post of posts) {
    summary.scanned += 1;

    const sourceVideoUrl = normalizeStringArray(post.contentVideoUrls)[0] ?? "";

    if (!sourceVideoUrl) {
      summary.skippedMissingVideo += 1;
      continue;
    }

    if (!normalizeString(post.authorReferralCode)) {
      summary.skippedMissingReferral += 1;
      continue;
    }

    if (!writeChanges) {
      summary.wouldUpdate += 1;
      continue;
    }

    try {
      const uploaded = await createPreview({ post, sourceVideoUrl });

      await collection.updateOne(
        { _id: post._id },
        {
          $set: {
            previewClipVideoUrl: uploaded.url,
            updatedAt: new Date(),
          },
        },
      );
      summary.updated += 1;
      console.log(`updated ${post.contentId}`);
    } catch (error) {
      summary.failed += 1;
      if (failedItems.length < 50) {
        failedItems.push({
          contentId: post.contentId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
} finally {
  await client.close();
}

console.log("Content video preview backfill summary:");
console.log(JSON.stringify(summary, null, 2));

if (failedItems.length > 0) {
  console.log("Failures:");
  console.log(JSON.stringify(failedItems, null, 2));
}
