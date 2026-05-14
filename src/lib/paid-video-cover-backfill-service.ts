import "server-only";

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

export const paidVideoCoverBackfillStyles = [
  "character",
  "curiosity",
  "mood",
  "safe",
] as const;

export type PaidVideoCoverBackfillStyle =
  (typeof paidVideoCoverBackfillStyles)[number];

export type PaidVideoCoverBackfillInput = {
  contentId?: string;
  email?: string;
  includeDrafts?: boolean;
  includeGeneratedVideos?: boolean;
  limit?: number;
  style?: PaidVideoCoverBackfillStyle;
  write?: boolean;
};

export type PaidVideoCoverBackfillAction =
  | "failed"
  | "generated_ai_cover"
  | "promoted_existing_image"
  | "skip_generated_video"
  | "would_generate_ai_cover"
  | "would_promote_existing_image";

export type PaidVideoCoverBackfillItem = {
  action: PaidVideoCoverBackfillAction;
  authorEmail: string | null;
  contentId: string | null;
  coverImageUrl?: string;
  error?: string;
  pathname?: string;
  publishedAt: string | null;
  reason?: string;
  style?: PaidVideoCoverBackfillStyle;
  title: string | null;
};

export type PaidVideoCoverBackfillResult = {
  dryRun: boolean;
  failed: number;
  generated: number;
  items: PaidVideoCoverBackfillItem[];
  limit: number;
  promotedExistingImage: number;
  scanned: number;
  skippedGeneratedVideo: number;
  style: PaidVideoCoverBackfillStyle;
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
    "contentId" | "email" | "includeDrafts"
  >,
): Filter<ContentPostDocument> {
  const filter: Filter<ContentPostDocument> = {
    "contentVideoUrls.0": { $exists: true },
    priceType: "paid",
    $or: [
      { coverImageUrl: { $exists: false } },
      { coverImageUrl: null },
      { coverImageUrl: "" },
      { coverImageUrl: { $regex: "^\\s*$" } },
    ],
  };
  const contentId = normalizeString(input.contentId, 100);
  const email = normalizeEmail(input.email);

  if (!input.includeDrafts) {
    filter.status = "published";
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
    dryRun,
    failed: 0,
    generated: 0,
    items: [],
    limit,
    promotedExistingImage: 0,
    scanned: candidates.length,
    skippedGeneratedVideo: 0,
    style,
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

    if (existingImageUrl) {
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
      result.wouldGenerate += 1;
      result.items.push(
        createItem(post, {
          action: "would_generate_ai_cover",
          style,
        }),
      );
      continue;
    }

    try {
      const profile = await getProfileForPost(post, profileByEmail);
      const referralCode = normalizeString(post.authorReferralCode, 80);

      if (!referralCode) {
        throw new Error("Post is missing authorReferralCode.");
      }

      const generatedCover = await generateAndUploadContentCover({
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

      await postsCollection.updateOne(
        { contentId: post.contentId },
        {
          $set: {
            coverImageUrl: generatedCover.url,
            updatedAt: new Date(),
          },
        },
      );
      result.generated += 1;
      result.items.push(
        createItem(post, {
          action: "generated_ai_cover",
          coverImageUrl: generatedCover.url,
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
