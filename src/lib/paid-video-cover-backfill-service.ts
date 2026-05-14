import "server-only";

import { spawn } from "node:child_process";

import { put } from "@vercel/blob";
import type { Filter } from "mongodb";

import {
  CONTENT_GENERATED_VIDEO_PATH_SEGMENT,
  type ContentPostDocument,
} from "@/lib/content";
import { generateAndUploadContentCover } from "@/lib/content-cover-service";
import {
  getContentPostsCollection,
  getCreatorProfilesCollection,
} from "@/lib/mongodb";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
const TITLE_LIMIT = 120;
const SUMMARY_LIMIT = 240;
const BODY_LIMIT = 360;
const PREVIEW_LIMIT = 220;
const FRAME_CAPTURE_TIMEOUT_MS = 30000;
const FRAME_COVER_MAX_WIDTH = 1280;
const FRAME_COVER_CONTENT_TYPE = "image/jpeg";

export const paidVideoCoverBackfillStyles = [
  "character",
  "curiosity",
  "mood",
  "safe",
] as const;

export type PaidVideoCoverBackfillStyle =
  (typeof paidVideoCoverBackfillStyles)[number];

export type PaidVideoCoverBackfillInput = {
  allowAiFallback?: boolean;
  coverMode?: PaidVideoCoverBackfillMode;
  contentId?: string;
  email?: string;
  includeDrafts?: boolean;
  includeGeneratedVideos?: boolean;
  limit?: number;
  replaceExistingCovers?: boolean;
  style?: PaidVideoCoverBackfillStyle;
  write?: boolean;
};

export type PaidVideoCoverBackfillMode = "ai" | "video-frame";

export type PaidVideoCoverBackfillAction =
  | "extracted_video_frame"
  | "failed"
  | "generated_ai_cover"
  | "promoted_existing_image"
  | "skip_generated_video"
  | "would_extract_video_frame"
  | "would_generate_ai_cover"
  | "would_promote_existing_image";

export type PaidVideoCoverBackfillItem = {
  action: PaidVideoCoverBackfillAction;
  authorEmail: string | null;
  contentId: string | null;
  coverImageUrl?: string;
  error?: string;
  fallbackError?: string;
  pathname?: string;
  publishedAt: string | null;
  reason?: string;
  style?: PaidVideoCoverBackfillStyle;
  title: string | null;
};

export type PaidVideoCoverBackfillResult = {
  allowAiFallback: boolean;
  coverMode: PaidVideoCoverBackfillMode;
  dryRun: boolean;
  failed: number;
  generated: number;
  items: PaidVideoCoverBackfillItem[];
  limit: number;
  promotedExistingImage: number;
  replaceExistingCovers: boolean;
  scanned: number;
  skippedGeneratedVideo: number;
  style: PaidVideoCoverBackfillStyle;
  videoFrameExtracted: number;
  wouldExtractVideoFrame: number;
  wouldGenerate: number;
  wouldPromoteExistingImage: number;
};

type CreatorProfileSnapshot = {
  characterPersona?: {
    name?: string | null;
  } | null;
  displayName?: string | null;
} | null;

const STYLE_PROMPTS: Record<PaidVideoCoverBackfillStyle, string> = {
  character:
    "Style direction: character-led portrait mood without identity drift, expressive but tasteful, keep the persona recognizable without revealing the paid plot.",
  curiosity:
    "Style direction: curiosity-led locked teaser, partial silhouette, obscured frame, intriguing crop, premium suspense, no spoilers.",
  mood:
    "Style direction: environment-led cinematic still, realistic location, props, lighting, and atmosphere create the question while the subject can stay indirect.",
  safe:
    "Style direction: public-safe editorial cover, calm composition, neutral details, brand-safe curiosity, no suggestive framing.",
};

function normalizeLimit(limit: number | undefined) {
  if (!Number.isFinite(limit) || !limit || limit <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.floor(limit), MAX_LIMIT);
}

function normalizeStyle(
  style: PaidVideoCoverBackfillStyle | undefined,
): PaidVideoCoverBackfillStyle {
  return style && paidVideoCoverBackfillStyles.includes(style)
    ? style
    : "curiosity";
}

function normalizeCoverMode(
  coverMode: PaidVideoCoverBackfillMode | undefined,
): PaidVideoCoverBackfillMode {
  return coverMode === "ai" ? "ai" : "video-frame";
}

function normalizeAllowAiFallback(value: boolean | undefined) {
  return value ?? true;
}

function normalizeEmail(email: string | undefined) {
  return email?.trim().toLowerCase() || "";
}

function normalizeString(value: unknown, limit = 500) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function sanitizeBaseName(name: string) {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return normalized || "paid-video-cover";
}

function createItem(
  post: Partial<ContentPostDocument>,
  item: Omit<
    PaidVideoCoverBackfillItem,
    "authorEmail" | "contentId" | "publishedAt" | "title"
  >,
): PaidVideoCoverBackfillItem {
  return {
    authorEmail: normalizeString(post.authorEmail, 160) || null,
    contentId: normalizeString(post.contentId, 100) || null,
    publishedAt: serializeDate(post.publishedAt),
    title: normalizeString(post.title, TITLE_LIMIT) || null,
    ...item,
  };
}

function isGeneratedVideoUrl(videoUrl: string) {
  return videoUrl.includes(`/${CONTENT_GENERATED_VIDEO_PATH_SEGMENT}/`);
}

function buildCandidateFilter(
  input: Pick<
    PaidVideoCoverBackfillInput,
    "contentId" | "email" | "includeDrafts" | "replaceExistingCovers"
  >,
): Filter<ContentPostDocument> {
  const filter: Filter<ContentPostDocument> = {
    "contentVideoUrls.0": { $exists: true },
    priceType: "paid",
  };
  const contentId = normalizeString(input.contentId, 100);
  const email = normalizeEmail(input.email);

  if (!input.includeDrafts) {
    filter.status = "published";
  }

  if (!input.replaceExistingCovers) {
    filter.$or = [
      { coverImageUrl: { $exists: false } },
      { coverImageUrl: null },
      { coverImageUrl: "" },
      { coverImageUrl: { $regex: "^\\s*$" } },
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

function buildPaidCoverVisualBrief(options: {
  post: ContentPostDocument;
  profile: CreatorProfileSnapshot;
  style: PaidVideoCoverBackfillStyle;
}) {
  const characterName = normalizeString(
    options.profile?.characterPersona?.name || options.profile?.displayName,
    80,
  );

  return [
    "FanLetter paid video public teaser cover for a locked 1 USDT fan-only vlog.",
    "Create curiosity before payment without revealing the full paid content.",
    STYLE_PROMPTS[options.style],
    characterName
      ? `Keep the AI character mood consistent with: ${characterName}.`
      : null,
    "Safe-for-work only: no nudity, sexual framing, private body focus, gore, weapons, minors, or explicit scenes.",
    "Do not include text, letters, numbers, logos, watermarks, UI, price labels, or payment icons.",
    "Do not create an exact still frame from the paid video. Use a tasteful editorial teaser composition instead.",
  ]
    .filter(Boolean)
    .join(" ");
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
    }, options.timeoutMs ?? FRAME_CAPTURE_TIMEOUT_MS);

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

async function getVideoDurationSeconds(videoUrl: string) {
  const { stdout } = await runCommand(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      videoUrl,
    ],
    { timeoutMs: FRAME_CAPTURE_TIMEOUT_MS },
  );
  const duration = Number(stdout.toString("utf8").trim());

  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

function resolveFrameCaptureTime(duration: number | null) {
  if (!duration || duration <= 0.6) {
    return 0;
  }

  return Math.min(Math.max(duration * 0.18, 0.6), Math.max(duration - 0.2, 0));
}

async function extractVideoFrameCoverBuffer(videoUrl: string) {
  const duration = await getVideoDurationSeconds(videoUrl).catch(() => null);
  const captureTime = resolveFrameCaptureTime(duration);
  const { stdout } = await runCommand(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      captureTime.toFixed(3),
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

  return stdout;
}

async function extractAndUploadVideoFrameCover({
  post,
  referralCode,
  videoUrl,
}: {
  post: ContentPostDocument;
  referralCode: string;
  videoUrl: string;
}) {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }

  if (!videoUrl) {
    throw new Error("Post is missing a paid video URL.");
  }

  const imageBytes = await extractVideoFrameCoverBuffer(videoUrl);
  const imageArrayBuffer = imageBytes.buffer.slice(
    imageBytes.byteOffset,
    imageBytes.byteOffset + imageBytes.byteLength,
  ) as ArrayBuffer;
  const pathname = [
    "content-posts",
    referralCode,
    "generated",
    `${Date.now()}-${sanitizeBaseName(
      `${normalizeString(post.title, TITLE_LIMIT) || post.contentId || "paid-video"}-frame-cover`,
    )}.jpg`,
  ].join("/");
  const uploaded = await put(
    pathname,
    new Blob([imageArrayBuffer], { type: FRAME_COVER_CONTENT_TYPE }),
    {
      access: "public",
      addRandomSuffix: true,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
      contentType: FRAME_COVER_CONTENT_TYPE,
    },
  );

  return {
    contentType: uploaded.contentType,
    pathname: uploaded.pathname,
    url: uploaded.url,
  };
}

async function getProfileForPost(
  post: ContentPostDocument,
  profileByEmail: Map<string, CreatorProfileSnapshot>,
) {
  const authorEmail = normalizeString(post.authorEmail, 160);

  if (!authorEmail) {
    return null;
  }

  if (profileByEmail.has(authorEmail)) {
    return profileByEmail.get(authorEmail) ?? null;
  }

  const profilesCollection = await getCreatorProfilesCollection();
  const profile = (await profilesCollection.findOne(
    { email: authorEmail },
    {
      projection: {
        characterPersona: 1,
        displayName: 1,
      },
    },
  )) as CreatorProfileSnapshot;

  profileByEmail.set(authorEmail, profile);
  return profile;
}

export async function backfillPaidVideoCovers(
  input: PaidVideoCoverBackfillInput = {},
): Promise<PaidVideoCoverBackfillResult> {
  const dryRun = !input.write;
  const allowAiFallback = normalizeAllowAiFallback(input.allowAiFallback);
  const coverMode = normalizeCoverMode(input.coverMode);
  const limit = normalizeLimit(input.limit);
  const style = normalizeStyle(input.style);
  const postsCollection = await getContentPostsCollection();
  const candidates = await postsCollection
    .find(buildCandidateFilter(input))
    .sort({ publishedAt: -1, updatedAt: -1, createdAt: -1 })
    .limit(limit)
    .toArray();
  const profileByEmail = new Map<string, CreatorProfileSnapshot>();
  const result: PaidVideoCoverBackfillResult = {
    allowAiFallback,
    coverMode,
    dryRun,
    failed: 0,
    generated: 0,
    items: [],
    limit,
    promotedExistingImage: 0,
    replaceExistingCovers: Boolean(input.replaceExistingCovers),
    scanned: candidates.length,
    skippedGeneratedVideo: 0,
    style,
    videoFrameExtracted: 0,
    wouldExtractVideoFrame: 0,
    wouldGenerate: 0,
    wouldPromoteExistingImage: 0,
  };

  for (const post of candidates) {
    const primaryVideoUrl = normalizeStringArray(post.contentVideoUrls)[0] ?? "";

    if (isGeneratedVideoUrl(primaryVideoUrl) && !input.includeGeneratedVideos) {
      result.skippedGeneratedVideo += 1;
      result.items.push(
        createItem(post, {
          action: "skip_generated_video",
          reason:
            "Known AI-generated video path. Use includeGeneratedVideos to process it.",
        }),
      );
      continue;
    }

    const existingImageUrl = normalizeStringArray(post.contentImageUrls)[0] ?? "";

    if (existingImageUrl && !input.replaceExistingCovers) {
      if (dryRun) {
        result.wouldPromoteExistingImage += 1;
        result.items.push(
          createItem(post, {
            action: "would_promote_existing_image",
            coverImageUrl: existingImageUrl,
          }),
        );
        continue;
      }

      await postsCollection.updateOne(
        { contentId: post.contentId },
        {
          $set: {
            coverImageUrl: existingImageUrl,
            updatedAt: new Date(),
          },
        },
      );
      result.promotedExistingImage += 1;
      result.items.push(
        createItem(post, {
          action: "promoted_existing_image",
          coverImageUrl: existingImageUrl,
        }),
      );
      continue;
    }

    if (dryRun) {
      if (coverMode === "video-frame") {
        result.wouldExtractVideoFrame += 1;
        result.items.push(
          createItem(post, {
            action: "would_extract_video_frame",
            coverImageUrl: normalizeString(post.coverImageUrl, 500) || undefined,
            reason: input.replaceExistingCovers
              ? "Would replace the current cover with a frame from the paid video."
              : undefined,
          }),
        );
      } else {
        result.wouldGenerate += 1;
        result.items.push(
          createItem(post, {
            action: "would_generate_ai_cover",
            style,
          }),
        );
      }
      continue;
    }

    try {
      const profile = await getProfileForPost(post, profileByEmail);
      const referralCode = normalizeString(post.authorReferralCode, 80);

      if (!referralCode) {
        throw new Error("Post is missing authorReferralCode.");
      }

      let action: PaidVideoCoverBackfillAction = "generated_ai_cover";
      let fallbackError: string | undefined;
      let generatedCover:
        | Awaited<ReturnType<typeof generateAndUploadContentCover>>
        | Awaited<ReturnType<typeof extractAndUploadVideoFrameCover>>;

      if (coverMode === "video-frame") {
        try {
          generatedCover = await extractAndUploadVideoFrameCover({
            post,
            referralCode,
            videoUrl: primaryVideoUrl,
          });
          action = "extracted_video_frame";
        } catch (error) {
          fallbackError = error instanceof Error ? error.message : String(error);

          if (!allowAiFallback) {
            throw error;
          }

          generatedCover = await generateAndUploadContentCover({
            body: normalizeString(post.body, BODY_LIMIT),
            referralCode,
            summary:
              normalizeString(post.previewText, PREVIEW_LIMIT) ||
              normalizeString(post.summary, SUMMARY_LIMIT),
            title: normalizeString(post.title, TITLE_LIMIT),
            visualBrief: buildPaidCoverVisualBrief({
              post,
              profile,
              style,
            }),
          });
          action = "generated_ai_cover";
        }
      } else {
        generatedCover = await generateAndUploadContentCover({
          body: normalizeString(post.body, BODY_LIMIT),
          referralCode,
          summary:
            normalizeString(post.previewText, PREVIEW_LIMIT) ||
            normalizeString(post.summary, SUMMARY_LIMIT),
          title: normalizeString(post.title, TITLE_LIMIT),
          visualBrief: buildPaidCoverVisualBrief({
            post,
            profile,
            style,
          }),
        });
      }

      await postsCollection.updateOne(
        { contentId: post.contentId },
        {
          $set: {
            coverImageUrl: generatedCover.url,
            updatedAt: new Date(),
          },
        },
      );
      if (action === "extracted_video_frame") {
        result.videoFrameExtracted += 1;
      } else {
        result.generated += 1;
      }
      result.items.push(
        createItem(post, {
          action,
          coverImageUrl: generatedCover.url,
          fallbackError,
          pathname: generatedCover.pathname,
        }),
      );
    } catch (error) {
      result.failed += 1;
      result.items.push(
        createItem(post, {
          action: "failed",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  return result;
}
