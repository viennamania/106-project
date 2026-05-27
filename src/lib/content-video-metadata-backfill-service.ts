import "server-only";

import { spawn } from "node:child_process";

import type { Filter } from "mongodb";

import {
  CONTENT_VIDEO_LIMIT,
  getContentVideoAssetSource,
  type ContentPostDocument,
  type ContentVideoMetadata,
  type ContentVideoMetadataSource,
} from "@/lib/content";
import { getContentPostsCollection } from "@/lib/mongodb";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const FFPROBE_TIMEOUT_MS = 30000;
const CONTENT_TYPE_TIMEOUT_MS = 10000;

export type ContentVideoMetadataBackfillInput = {
  contentId?: string;
  email?: string;
  force?: boolean;
  limit?: number;
  write?: boolean;
};

export type ContentVideoMetadataBackfillAction =
  | "failed_with_null_metadata"
  | "skipped"
  | "updated"
  | "would_update";

export type ContentVideoMetadataBackfillItem = {
  action: ContentVideoMetadataBackfillAction;
  authorEmail: string | null;
  contentId: string | null;
  durationSec: number | null;
  error?: string;
  height: number | null;
  title: string | null;
  videoUrl: string | null;
  width: number | null;
};

export type ContentVideoMetadataBackfillResult = {
  dryRun: boolean;
  durationFilled: number;
  durationUnavailable: number;
  failed: number;
  force: boolean;
  items: ContentVideoMetadataBackfillItem[];
  limit: number;
  scanned: number;
  skipped: number;
  updated: number;
  wouldUpdate: number;
};

type ProbedVideoMetadata = {
  durationSec: number | null;
  height: number | null;
  width: number | null;
};

type BackfilledVideoMetadata = {
  metadata: ContentVideoMetadata;
  probeError: string | null;
};

type FfprobeOutput = {
  format?: {
    duration?: number | string | null;
  };
  streams?: Array<{
    height?: number | string | null;
    width?: number | string | null;
  }>;
};

function normalizeLimit(limit: number | undefined) {
  if (!Number.isFinite(limit) || !limit || limit <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.floor(limit), MAX_LIMIT);
}

function normalizeString(value: unknown, limit = 500) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function normalizeEmail(email: string | undefined) {
  return normalizeString(email, 160).toLowerCase();
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? Array.from(
        new Set(
          value
            .map((item) => normalizeString(item, 500))
            .filter((item): item is string => Boolean(item)),
        ),
      ).slice(0, CONTENT_VIDEO_LIMIT)
    : [];
}

function normalizePositiveNumber(value: unknown, precision = 2) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Number(parsed.toFixed(precision));
}

function normalizePositiveInteger(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.floor(parsed);
}

function normalizeCapturedAt(value: unknown) {
  if (typeof value === "string") {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

function normalizeMetadataSource(
  value: unknown,
  url: string,
): ContentVideoMetadataSource {
  if (value === "generated" || value === "uploaded") {
    return value;
  }

  return getContentVideoAssetSource(url) === "generated" ? "generated" : "uploaded";
}

function resolvePathname(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}

function createItem(
  post: ContentPostDocument,
  item: Omit<
    ContentVideoMetadataBackfillItem,
    "authorEmail" | "contentId" | "title"
  >,
): ContentVideoMetadataBackfillItem {
  return {
    authorEmail: normalizeString(post.authorEmail, 160) || null,
    contentId: normalizeString(post.contentId, 100) || null,
    title: normalizeString(post.title, 120) || null,
    ...item,
  };
}

function normalizeExistingMetadata(
  metadata: ContentVideoMetadata | null | undefined,
  url: string,
): ContentVideoMetadata | null {
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

function buildCandidateFilter(
  input: Pick<ContentVideoMetadataBackfillInput, "contentId" | "email" | "force">,
): Filter<ContentPostDocument> {
  const filter: Filter<ContentPostDocument> = {
    "contentVideoUrls.0": { $exists: true },
  };
  const contentId = normalizeString(input.contentId, 100);
  const email = normalizeEmail(input.email);

  if (!input.force) {
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

function runCommand(
  command: string,
  args: string[],
  options: {
    timeoutMs?: number;
  } = {},
) {
  return new Promise<{
    stderr: string;
    stdout: Buffer;
  }>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`${command} timed out.`));
    }, options.timeoutMs ?? FFPROBE_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
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

async function probeRemoteVideoMetadata(
  videoUrl: string,
): Promise<ProbedVideoMetadata> {
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
  const parsed = JSON.parse(stdout.toString("utf8")) as FfprobeOutput;
  const stream = parsed.streams?.[0];

  return {
    durationSec: normalizePositiveNumber(parsed.format?.duration),
    height: normalizePositiveInteger(stream?.height),
    width: normalizePositiveInteger(stream?.width),
  };
}

async function readRemoteVideoContentType(videoUrl: string) {
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

async function createBackfilledMetadata(
  videoUrl: string,
): Promise<BackfilledVideoMetadata> {
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
    } satisfies ContentVideoMetadata,
    probeError: null,
  };
}

async function createNullBackfilledMetadata(
  videoUrl: string,
  error: unknown,
): Promise<BackfilledVideoMetadata> {
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
    } satisfies ContentVideoMetadata,
    probeError: error instanceof Error ? error.message : String(error),
  };
}

export async function backfillContentVideoMetadata(
  input: ContentVideoMetadataBackfillInput = {},
): Promise<ContentVideoMetadataBackfillResult> {
  const dryRun = !input.write;
  const force = Boolean(input.force);
  const limit = normalizeLimit(input.limit);
  const postsCollection = await getContentPostsCollection();
  const candidates = await postsCollection
    .find(buildCandidateFilter(input))
    .sort({ publishedAt: -1, updatedAt: -1, createdAt: -1 })
    .limit(limit)
    .toArray();
  const result: ContentVideoMetadataBackfillResult = {
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

  for (const post of candidates) {
    const videoUrls = normalizeStringArray(post.contentVideoUrls);
    const existingMetadataByUrl = new Map(
      videoUrls
        .map((url) => {
          const metadata = normalizeExistingMetadata(
            (post.contentVideoMetadata ?? []).find((item) => item.url === url),
            url,
          );

          return metadata ? ([url, metadata] as const) : null;
        })
        .filter((item): item is readonly [string, ContentVideoMetadata] =>
          Boolean(item),
        ),
    );
    const urlsToBackfill = force
      ? videoUrls
      : videoUrls.filter((url) => !existingMetadataByUrl.has(url));

    if (videoUrls.length === 0 || urlsToBackfill.length === 0) {
      result.skipped += 1;
      result.items.push(
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
      result.wouldUpdate += 1;
      result.items.push(
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

    const nextMetadataByUrl = force
      ? new Map<string, ContentVideoMetadata>()
      : new Map(existingMetadataByUrl);

    for (const videoUrl of urlsToBackfill) {
      let backfilled: BackfilledVideoMetadata;

      try {
        backfilled = await createBackfilledMetadata(videoUrl);
      } catch (error) {
        result.failed += 1;
        backfilled = await createNullBackfilledMetadata(videoUrl, error);
      }

      nextMetadataByUrl.set(videoUrl, backfilled.metadata);

      if (backfilled.metadata.durationSec) {
        result.durationFilled += 1;
      } else {
        result.durationUnavailable += 1;
      }

      result.items.push(
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
      .filter((item): item is ContentVideoMetadata => Boolean(item));

    await postsCollection.updateOne(
      { contentId: post.contentId },
      {
        $set: {
          contentVideoMetadata: nextMetadata,
          updatedAt: new Date(),
        },
      },
    );
    result.updated += 1;
  }

  return result;
}
