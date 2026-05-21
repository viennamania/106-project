import process from "node:process";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

import { put } from "@vercel/blob";
import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

const args = process.argv.slice(2);
const write = args.includes("--write");
const dryRun = !write;
const includeDrafts = args.includes("--include-drafts");
const replaceExistingCandidates = args.includes("--replace-existing-candidates");
const replacePrimaryCover = args.includes("--replace-primary-cover");
const contentId = readArgValue("--content-id")?.trim() ?? "";
const email = readArgValue("--email")?.trim().toLowerCase() ?? "";
const limit = readPositiveInteger(readArgValue("--limit"), 25);
const candidateCount = normalizeCandidateCount(readArgValue("--count"));
const targetPriceType = normalizePriceType(readArgValue("--price-type"));
const mongoUri = process.env.MONGODB_URI?.trim() ?? "";
const mongoDbName = process.env.MONGODB_DB_NAME?.trim() ?? "";
const postsCollectionName =
  process.env.MONGODB_CONTENT_POSTS_COLLECTION?.trim() ?? "contentPosts";

const FRAME_CAPTURE_TIMEOUT_MS = 30000;
const FRAME_COVER_CONTENT_TYPE = "image/jpeg";
const FRAME_COVER_MAX_WIDTH = 1280;
const COVER_IMAGE_CANDIDATE_LIMIT = 8;
const CAPTURE_FRACTIONS = [0.12, 0.28, 0.46, 0.64, 0.78, 0.9];

if (!mongoUri) {
  throw new Error("MONGODB_URI is required.");
}

if (!mongoDbName) {
  throw new Error("MONGODB_DB_NAME is required.");
}

if (write && !process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
  throw new Error("BLOB_READ_WRITE_TOKEN is required when using --write.");
}

const mongoClient = new MongoClient(mongoUri);

await mongoClient.connect();

try {
  const db = mongoClient.db(mongoDbName);
  const postsCollection = db.collection(postsCollectionName);
  const filter = buildCandidateFilter();
  const candidates = await postsCollection
    .find(filter)
    .sort({ publishedAt: -1, updatedAt: -1, createdAt: -1 })
    .limit(limit)
    .toArray();
  const summary = {
    candidateCount,
    dryRun,
    failed: 0,
    limit,
    priceType: targetPriceType,
    replaceExistingCandidates,
    replacePrimaryCover,
    scanned: candidates.length,
    skippedEnoughCandidates: 0,
    updated: 0,
    wouldUpdate: 0,
  };

  console.log("Video cover candidate backfill targets:");
  console.log(
    JSON.stringify(
      {
        candidateCount,
        contentId: contentId || null,
        email: email || null,
        includeDrafts,
        limit,
        mode: write ? "write" : "dry-run",
        priceType: targetPriceType,
        replaceExistingCandidates,
        replacePrimaryCover,
        total: candidates.length,
      },
      null,
      2,
    ),
  );

  for (const post of candidates) {
    const primaryVideoUrl = normalizeStringArray(post.contentVideoUrls)[0] ?? "";
    const existingCandidates = normalizeCoverImageCandidates(
      post.coverImageCandidates,
    );
    const frameCandidates = existingCandidates.filter(
      (candidate) => candidate.source === "frame",
    );

    if (!replaceExistingCandidates && frameCandidates.length >= candidateCount) {
      summary.skippedEnoughCandidates += 1;
      logItem(post, {
        action: "skip_enough_candidates",
        frameCandidateCount: frameCandidates.length,
      });
      continue;
    }

    if (dryRun) {
      summary.wouldUpdate += 1;
      logItem(post, {
        action: "would_backfill_candidates",
        existingCandidateCount: existingCandidates.length,
        frameCandidateCount: frameCandidates.length,
        videoUrl: primaryVideoUrl,
      });
      continue;
    }

    try {
      const referralCode = trimToLength(post.authorReferralCode, 80);

      if (!referralCode) {
        throw new Error("Post is missing authorReferralCode.");
      }

      if (!primaryVideoUrl) {
        throw new Error("Post is missing a video URL.");
      }

      const capturedFrames = await extractVideoFrameCoverBuffers(
        primaryVideoUrl,
        candidateCount,
      );
      const uploadedCandidates = [];

      for (const [index, frame] of capturedFrames.entries()) {
        const uploaded = await uploadFrameCover({
          frame,
          frameIndex: index,
          post,
          referralCode,
        });

        uploadedCandidates.push(createFrameCoverImageCandidate(frame, uploaded));
      }

      if (uploadedCandidates.length === 0) {
        throw new Error("No video cover candidates were uploaded.");
      }

      const nextCoverImageCandidates = replaceExistingCandidates
        ? uploadedCandidates.slice(0, COVER_IMAGE_CANDIDATE_LIMIT)
        : mergeCoverImageCandidates(existingCandidates, uploadedCandidates);
      const currentCoverImageUrl = trimToLength(post.coverImageUrl, 500);
      const nextCoverImageUrl =
        replacePrimaryCover || !currentCoverImageUrl
          ? uploadedCandidates[0]?.url ?? currentCoverImageUrl
          : currentCoverImageUrl;

      await postsCollection.updateOne(
        { contentId: post.contentId },
        {
          $set: {
            coverImageCandidates: nextCoverImageCandidates,
            coverImageUrl: nextCoverImageUrl || null,
            updatedAt: new Date(),
          },
        },
      );
      summary.updated += 1;
      logItem(post, {
        action: "backfilled_candidates",
        candidateCount: uploadedCandidates.length,
        coverImageUrl: nextCoverImageUrl || null,
      });
    } catch (error) {
      summary.failed += 1;
      logItem(post, {
        action: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log("");
  console.log("Video cover candidate backfill summary:");
  console.log(JSON.stringify(summary, null, 2));

  if (dryRun) {
    console.log("");
    console.log("Dry run complete. Re-run with --write to update candidates.");
  }
} finally {
  await mongoClient.close();
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

  return null;
}

function readPositiveInteger(value, fallback) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function normalizeCandidateCount(value) {
  return Math.max(1, Math.min(readPositiveInteger(value, 6), 6));
}

function normalizePriceType(value) {
  const normalized = value?.trim();

  return normalized === "paid" || normalized === "free" ? normalized : "all";
}

function buildCandidateFilter() {
  const filter = {
    "contentVideoUrls.0": { $exists: true },
    status: "published",
  };

  if (targetPriceType !== "all") {
    filter.priceType = targetPriceType;
  }

  if (includeDrafts) {
    delete filter.status;
  }

  if (!replaceExistingCandidates) {
    filter.$or = [
      { coverImageCandidates: { $exists: false } },
      { coverImageCandidates: null },
      { coverImageCandidates: { $size: 0 } },
      { coverImageCandidates: { $not: { $elemMatch: { source: "frame" } } } },
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

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function trimToLength(value, limit) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function normalizePositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function normalizeCoverImageCandidates(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenUrls = new Set();
  const candidates = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const url = trimToLength(item.url, 500);

    if (!url || seenUrls.has(url)) {
      continue;
    }

    seenUrls.add(url);
    candidates.push({
      candidateId: trimToLength(item.candidateId, 120) || randomUUID(),
      contentType: trimToLength(item.contentType, 80) || null,
      createdAt: trimToLength(item.createdAt, 80) || new Date().toISOString(),
      height: normalizePositiveNumber(item.height),
      pathname: trimToLength(item.pathname, 500) || null,
      placements: Array.isArray(item.placements)
        ? item.placements.filter((placement) =>
            ["detail", "feed", "news", "share"].includes(placement),
          )
        : [],
      source:
        item.source === "ai" || item.source === "manual" ? item.source : "frame",
      timestampSec: normalizePositiveNumber(item.timestampSec),
      url,
      width: normalizePositiveNumber(item.width),
    });
  }

  return candidates.slice(0, COVER_IMAGE_CANDIDATE_LIMIT);
}

function mergeCoverImageCandidates(current, additions) {
  const seenUrls = new Set();
  const merged = [];

  for (const candidate of [...additions, ...current]) {
    if (!candidate.url || seenUrls.has(candidate.url)) {
      continue;
    }

    seenUrls.add(candidate.url);
    merged.push(candidate);
  }

  return merged.slice(0, COVER_IMAGE_CANDIDATE_LIMIT);
}

function sanitizeBaseName(name) {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return normalized || "video-cover";
}

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function logItem(post, item) {
  console.log(
    JSON.stringify({
      authorEmail: trimToLength(post.authorEmail, 160) || null,
      contentId: trimToLength(post.contentId, 100) || null,
      priceType: trimToLength(post.priceType, 20) || null,
      publishedAt: serializeDate(post.publishedAt),
      title: trimToLength(post.title, 120) || null,
      ...item,
    }),
  );
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
    }, options.timeoutMs ?? FRAME_CAPTURE_TIMEOUT_MS);

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

async function getVideoMetadata(videoUrl) {
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
    { timeoutMs: FRAME_CAPTURE_TIMEOUT_MS },
  );

  try {
    const parsed = JSON.parse(stdout.toString("utf8"));
    const stream = Array.isArray(parsed.streams) ? parsed.streams[0] : null;
    const duration = Number(parsed.format?.duration);
    const width = Number(stream?.width);
    const height = Number(stream?.height);

    return {
      duration: Number.isFinite(duration) && duration > 0 ? duration : null,
      height: Number.isFinite(height) && height > 0 ? height : null,
      width: Number.isFinite(width) && width > 0 ? width : null,
    };
  } catch {
    return {
      duration: null,
      height: null,
      width: null,
    };
  }
}

function resolveFrameCaptureTimes(duration, count) {
  const targetCount = Math.max(1, Math.min(Math.round(count), 6));

  if (!Number.isFinite(duration) || duration <= 0.6) {
    return [0];
  }

  if (targetCount === 1) {
    return [Math.min(Math.max(duration * 0.18, 0.6), Math.max(duration - 0.2, 0))];
  }

  const latestSafeTime = Math.max(duration - 0.2, 0);
  const times = CAPTURE_FRACTIONS.slice(0, targetCount).map((fraction) =>
    Math.min(Math.max(duration * fraction, 0.6), latestSafeTime),
  );

  return Array.from(new Set(times.map((time) => Number(time.toFixed(2))))).slice(
    0,
    targetCount,
  );
}

function resolveScaledDimensions(metadata) {
  if (!metadata.width || !metadata.height) {
    return {
      height: null,
      width: null,
    };
  }

  const scale = Math.min(1, FRAME_COVER_MAX_WIDTH / metadata.width);

  return {
    height: Math.max(1, Math.round(metadata.height * scale)),
    width: Math.max(1, Math.round(metadata.width * scale)),
  };
}

async function extractVideoFrameCoverBuffers(videoUrl, count) {
  const metadata = await getVideoMetadata(videoUrl);
  const dimensions = resolveScaledDimensions(metadata);
  const captureTimes = resolveFrameCaptureTimes(metadata.duration, count);
  const frames = [];

  for (const timestampSec of captureTimes) {
    const { stdout } = await runCommand(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        timestampSec.toFixed(3),
        "-i",
        videoUrl,
        "-frames:v",
        "1",
        "-vf",
        `scale='min(${FRAME_COVER_MAX_WIDTH},iw)':-2`,
        "-q:v",
        "3",
        "-f",
        "image2pipe",
        "-vcodec",
        "mjpeg",
        "pipe:1",
      ],
      { timeoutMs: FRAME_CAPTURE_TIMEOUT_MS },
    );

    if (stdout.length === 0) {
      throw new Error("ffmpeg returned an empty video frame.");
    }

    frames.push({
      bytes: stdout,
      height: dimensions.height,
      timestampSec,
      width: dimensions.width,
    });
  }

  return frames;
}

async function uploadFrameCover({ frame, frameIndex, post, referralCode }) {
  const imageArrayBuffer = frame.bytes.buffer.slice(
    frame.bytes.byteOffset,
    frame.bytes.byteOffset + frame.bytes.byteLength,
  );
  const indexSuffix = String(frameIndex + 1).padStart(2, "0");
  const pathname = [
    "content-posts",
    referralCode,
    "generated",
    `${Date.now()}-${sanitizeBaseName(
      `${trimToLength(post.title, 120) || post.contentId || "video"}-frame-cover-${indexSuffix}`,
    )}.jpg`,
  ].join("/");

  return put(pathname, new Blob([imageArrayBuffer], { type: FRAME_COVER_CONTENT_TYPE }), {
    access: "public",
    addRandomSuffix: true,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
    contentType: FRAME_COVER_CONTENT_TYPE,
  });
}

function createFrameCoverImageCandidate(frame, upload) {
  return {
    candidateId: randomUUID(),
    contentType: upload.contentType || FRAME_COVER_CONTENT_TYPE,
    createdAt: new Date().toISOString(),
    height: frame.height,
    pathname: upload.pathname || null,
    placements: [],
    source: "frame",
    timestampSec: frame.timestampSec,
    url: upload.url,
    width: frame.width,
  };
}
