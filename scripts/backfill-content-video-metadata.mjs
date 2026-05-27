import process from "node:process";
import { spawn } from "node:child_process";

import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

const CONTENT_VIDEO_LIMIT = 1;
const CONTENT_POSTS_BLOB_PATH_SEGMENT = "content-posts";
const CONTENT_UPLOADED_VIDEO_PATH_SEGMENT = "videos";
const CONTENT_GENERATED_VIDEO_PATH_SEGMENT = "generated-content-videos";
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;
const FFPROBE_TIMEOUT_MS = 30000;
const CONTENT_TYPE_TIMEOUT_MS = 10000;

const args = process.argv.slice(2);
const write = args.includes("--write");
const dryRun = !write;
const force = args.includes("--force");
const compact = args.includes("--compact");
const contentId = readArgValue("--content-id")?.trim() ?? "";
const email = readArgValue("--email")?.trim().toLowerCase() ?? "";
const limit = normalizeLimit(readPositiveInteger(readArgValue("--limit")));
const mongoUri = process.env.MONGODB_URI?.trim() ?? "";
const mongoDbName = process.env.MONGODB_DB_NAME?.trim() ?? "";
const postsCollectionName =
  process.env.MONGODB_CONTENT_POSTS_COLLECTION?.trim() ?? "contentPosts";

if (!mongoUri) {
  throw new Error("MONGODB_URI is required.");
}

if (!mongoDbName) {
  throw new Error("MONGODB_DB_NAME is required.");
}

const mongoClient = new MongoClient(mongoUri);

await mongoClient.connect();

try {
  const db = mongoClient.db(mongoDbName);
  const postsCollection = db.collection(postsCollectionName);
  const candidates = await postsCollection
    .find(buildCandidateFilter())
    .sort({ publishedAt: -1, updatedAt: -1, createdAt: -1 })
    .limit(limit)
    .toArray();
  const summary = {
    dryRun,
    durationFilled: 0,
    durationUnavailable: 0,
    failed: 0,
    force,
    items: [],
    limit,
    scanned: candidates.length,
    skipped: 0,
    updated: 0,
    wouldUpdate: 0,
  };

  console.log("Content video metadata backfill candidates:");
  console.log(
    JSON.stringify(
      {
        contentId: contentId || null,
        email: email || null,
        force,
        limit,
        mode: write ? "write" : "dry-run",
        total: candidates.length,
      },
      null,
      2,
    ),
  );

  for (const post of candidates) {
    const videoUrls = normalizeStringArray(post.contentVideoUrls);
    const existingMetadataByUrl = new Map(
      videoUrls
        .map((url) => {
          const metadata = normalizeExistingMetadata(
            (post.contentVideoMetadata ?? []).find((item) => item.url === url),
            url,
          );

          return metadata ? [url, metadata] : null;
        })
        .filter(Boolean),
    );
    const urlsToBackfill = force
      ? videoUrls
      : videoUrls.filter((url) => !existingMetadataByUrl.has(url));

    if (videoUrls.length === 0 || urlsToBackfill.length === 0) {
      summary.skipped += 1;
      summary.items.push(
        createItem(post, {
          action: "skipped",
          durationSec: null,
          height: null,
          videoUrl: videoUrls[0] ?? null,
          width: null,
        }),
      );
      continue;
    }

    if (dryRun) {
      summary.wouldUpdate += 1;
      summary.items.push(
        createItem(post, {
          action: "would_update",
          durationSec: null,
          height: null,
          videoUrl: urlsToBackfill[0] ?? null,
          width: null,
        }),
      );
      continue;
    }

    const nextMetadataByUrl = force ? new Map() : new Map(existingMetadataByUrl);

    for (const videoUrl of urlsToBackfill) {
      let backfilled;

      try {
        backfilled = await createBackfilledMetadata(videoUrl);
      } catch (error) {
        summary.failed += 1;
        backfilled = await createNullBackfilledMetadata(videoUrl, error);
      }

      nextMetadataByUrl.set(videoUrl, backfilled.metadata);

      if (backfilled.metadata.durationSec) {
        summary.durationFilled += 1;
      } else {
        summary.durationUnavailable += 1;
      }

      summary.items.push(
        createItem(post, {
          action: backfilled.probeError ? "failed_with_null_metadata" : "updated",
          durationSec: backfilled.metadata.durationSec,
          error: backfilled.probeError ?? undefined,
          height: backfilled.metadata.height,
          videoUrl,
          width: backfilled.metadata.width,
        }),
      );
    }

    const nextMetadata = videoUrls
      .map((url) => nextMetadataByUrl.get(url))
      .filter(Boolean);

    await postsCollection.updateOne(
      { contentId: post.contentId },
      {
        $set: {
          contentVideoMetadata: nextMetadata,
          updatedAt: new Date(),
        },
      },
    );
    summary.updated += 1;
  }

  console.log(JSON.stringify(compact ? compactSummary(summary) : summary, null, 2));
} finally {
  await mongoClient.close();
}

function compactSummary(summary) {
  return {
    ...summary,
    itemCount: summary.items.length,
    items: undefined,
  };
}

function readArgValue(name) {
  const prefixed = `${name}=`;
  const inlineArg = args.find((arg) => arg.startsWith(prefixed));

  if (inlineArg) {
    return inlineArg.slice(prefixed.length);
  }

  const index = args.indexOf(name);

  if (index >= 0) {
    return args[index + 1];
  }

  return undefined;
}

function readPositiveInteger(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.floor(parsed);
}

function normalizeLimit(limit) {
  if (!Number.isFinite(limit) || !limit || limit <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.floor(limit), MAX_LIMIT);
}

function normalizeString(value, limit = 500) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? Array.from(
        new Set(
          value
            .map((item) => normalizeString(item, 500))
            .filter(Boolean),
        ),
      ).slice(0, CONTENT_VIDEO_LIMIT)
    : [];
}

function normalizePositiveNumber(value, precision = 2) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Number(parsed.toFixed(precision));
}

function normalizePositiveInteger(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.floor(parsed);
}

function normalizeCapturedAt(value) {
  if (typeof value === "string") {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

function safelyDecodePathSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function getPathSegmentsFromContentUrl(url) {
  const trimmedUrl = normalizeString(url, 500);
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

function getContentVideoAssetSource(url) {
  if (!normalizeString(url, 500)) {
    return "unknown";
  }

  const segments = getPathSegmentsFromContentUrl(url);
  const contentRootIndex = segments.indexOf(CONTENT_POSTS_BLOB_PATH_SEGMENT);
  const sourceSegment =
    contentRootIndex >= 0 ? segments[contentRootIndex + 2] : undefined;

  if (sourceSegment === CONTENT_GENERATED_VIDEO_PATH_SEGMENT) {
    return "generated";
  }

  if (sourceSegment === CONTENT_UPLOADED_VIDEO_PATH_SEGMENT) {
    return "uploaded";
  }

  return "unknown";
}

function normalizeMetadataSource(value, url) {
  if (value === "generated" || value === "uploaded") {
    return value;
  }

  return getContentVideoAssetSource(url) === "generated" ? "generated" : "uploaded";
}

function resolvePathname(url) {
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}

function normalizeExistingMetadata(metadata, url) {
  if (!metadata || metadata.url !== url) {
    return null;
  }

  return {
    capturedAt: normalizeCapturedAt(metadata.capturedAt),
    contentType: normalizeString(metadata.contentType, 80) || null,
    durationSec: normalizePositiveNumber(metadata.durationSec),
    height: normalizePositiveInteger(metadata.height),
    pathname: normalizeString(metadata.pathname, 500) || resolvePathname(url),
    source: normalizeMetadataSource(metadata.source, url),
    url,
    width: normalizePositiveInteger(metadata.width),
  };
}

function createItem(post, item) {
  return {
    authorEmail: normalizeString(post.authorEmail, 160) || null,
    contentId: normalizeString(post.contentId, 100) || null,
    title: normalizeString(post.title, 120) || null,
    ...item,
  };
}

function buildCandidateFilter() {
  const filter = {
    "contentVideoUrls.0": { $exists: true },
  };

  if (!force) {
    filter.$or = [
      { contentVideoMetadata: { $exists: false } },
      { "contentVideoMetadata.0": { $exists: false } },
    ];
  }

  if (contentId) {
    filter.contentId = contentId;
  }

  if (email) {
    filter.authorEmail = email;
  }

  return filter;
}

function runCommand(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`${command} timed out.`));
    }, options.timeoutMs ?? FFPROBE_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderrChunks.push(chunk);
    });
    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      const stderr = Buffer.concat(stderrChunks).toString("utf8").slice(-1200);
      const stdout = Buffer.concat(stdoutChunks);

      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}. ${stderr}`));
        return;
      }

      resolve({ stderr, stdout });
    });
  });
}

async function probeRemoteVideoMetadata(videoUrl) {
  const { stdout } = await runCommand(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height:format=duration",
      "-of",
      "json",
      videoUrl,
    ],
    { timeoutMs: FFPROBE_TIMEOUT_MS },
  );
  const parsed = JSON.parse(stdout.toString("utf8"));
  const stream = parsed.streams?.[0];

  return {
    durationSec: normalizePositiveNumber(parsed.format?.duration),
    height: normalizePositiveInteger(stream?.height),
    width: normalizePositiveInteger(stream?.width),
  };
}

async function readRemoteVideoContentType(videoUrl) {
  try {
    const response = await fetch(videoUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(CONTENT_TYPE_TIMEOUT_MS),
    });

    return normalizeString(response.headers.get("content-type"), 80) || null;
  } catch {
    return null;
  }
}

async function createBackfilledMetadata(videoUrl) {
  const [contentType, probedMetadata] = await Promise.all([
    readRemoteVideoContentType(videoUrl),
    probeRemoteVideoMetadata(videoUrl),
  ]);

  return {
    metadata: {
      capturedAt: new Date().toISOString(),
      contentType,
      durationSec: probedMetadata.durationSec,
      height: probedMetadata.height,
      pathname: resolvePathname(videoUrl),
      source: normalizeMetadataSource(null, videoUrl),
      url: videoUrl,
      width: probedMetadata.width,
    },
    probeError: null,
  };
}

async function createNullBackfilledMetadata(videoUrl, error) {
  return {
    metadata: {
      capturedAt: new Date().toISOString(),
      contentType: await readRemoteVideoContentType(videoUrl),
      durationSec: null,
      height: null,
      pathname: resolvePathname(videoUrl),
      source: normalizeMetadataSource(null, videoUrl),
      url: videoUrl,
      width: null,
    },
    probeError: error instanceof Error ? error.message : String(error),
  };
}
