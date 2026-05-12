import "server-only";

import type { Filter } from "mongodb";

import type {
  ContentPostDocument,
  CreatorProfileDocument,
  FanletterCharacterFollowDocument,
  FanletterCharacterFollowStateResponse,
  FanletterFollowedCharacterLatestContentRecord,
  FanletterFollowedCharacterRecord,
  FanletterFollowedCharactersResponse,
} from "@/lib/content";
import { normalizeContentLocale } from "@/lib/content";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { normalizeEmail, normalizeReferralCode } from "@/lib/member";
import {
  getContentPostsCollection,
  getCreatorProfilesCollection,
  getFanletterCharacterFollowsCollection,
  getMembersCollection,
} from "@/lib/mongodb";

const FANLETTER_FOLLOWING_PAGE_SIZE_MAX = 50;
const SUMMARY_LIMIT = 170;
const TITLE_LIMIT = 96;
const TRAIT_LIMIT = 38;

type FanletterPublicContentAggregate = {
  _id: string;
  latestContent: ContentPostDocument | null;
  publicContentCount: number;
};

type FanletterFollowerCountAggregate = {
  _id: string;
  followerCount: number;
};

function compactText(value: string | null | undefined, limit: number) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();

  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit - 1).trimEnd()}...`;
}

async function resolveFanletterFollowCreator(referralCode?: string | null) {
  const creatorReferralCode = normalizeReferralCode(referralCode);

  if (!creatorReferralCode) {
    throw new Error("creatorReferralCode is required.");
  }

  const membersCollection = await getMembersCollection();
  const creator = await membersCollection.findOne({
    referralCode: creatorReferralCode,
    status: "completed",
  });

  if (!creator) {
    throw new Error("Creator not found.");
  }

  return {
    creatorEmail: creator.email,
    creatorReferralCode,
  };
}

function normalizeFollowerEmail(value?: string | null) {
  return normalizeEmail(value ?? "") || null;
}

function getPublishedContentLocaleFilter(
  locale: Locale,
): Filter<ContentPostDocument> {
  const contentLocale = normalizeContentLocale(locale);

  return contentLocale === defaultLocale
    ? {
        $or: [
          { locale: contentLocale },
          { locale: { $exists: false } },
          { locale: null },
        ],
      }
    : { locale: contentLocale };
}

function getFanletterPublicContentBaseFilter(
  locale: Locale,
): Filter<ContentPostDocument> {
  return {
    ...getPublishedContentLocaleFilter(locale),
    "contentVideoUrls.0": { $exists: true },
    priceType: "free",
    status: "published",
  };
}

function getCoverImageUrl(post: ContentPostDocument) {
  return post.coverImageUrl ?? post.contentImageUrls?.[0] ?? null;
}

function getPrimaryVideoUrl(post: ContentPostDocument) {
  return post.contentVideoUrls?.find((url) => Boolean(url?.trim())) ?? null;
}

function getMediaType(
  post: ContentPostDocument,
): FanletterFollowedCharacterLatestContentRecord["mediaType"] {
  if (getPrimaryVideoUrl(post)) {
    return "video";
  }

  if (getCoverImageUrl(post)) {
    return "image";
  }

  return "text";
}

function serializeLatestContent(
  post: ContentPostDocument,
): FanletterFollowedCharacterLatestContentRecord {
  return {
    contentId: post.contentId,
    coverImageUrl: getCoverImageUrl(post),
    mediaType: getMediaType(post),
    primaryVideoUrl: getPrimaryVideoUrl(post),
    publishedAt: post.publishedAt?.toISOString() ?? null,
    summary: compactText(post.summary || post.previewText || post.body, SUMMARY_LIMIT),
    title: compactText(post.title, TITLE_LIMIT),
  };
}

function normalizeFollowingPageSize(value?: number | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 24;
  }

  return Math.max(
    1,
    Math.min(Math.trunc(parsed), FANLETTER_FOLLOWING_PAGE_SIZE_MAX),
  );
}

export async function getFanletterFollowState({
  creatorReferralCode,
  followerEmail,
}: {
  creatorReferralCode?: string | null;
  followerEmail?: string | null;
}): Promise<FanletterCharacterFollowStateResponse> {
  const creator = await resolveFanletterFollowCreator(creatorReferralCode);
  const normalizedFollowerEmail = normalizeFollowerEmail(followerEmail);
  const followsCollection = await getFanletterCharacterFollowsCollection();
  const [followerCount, follow] = await Promise.all([
    followsCollection.countDocuments({
      creatorReferralCode: creator.creatorReferralCode,
    }),
    normalizedFollowerEmail
      ? followsCollection.findOne({
          creatorReferralCode: creator.creatorReferralCode,
          followerEmail: normalizedFollowerEmail,
        })
      : Promise.resolve(null),
  ]);

  return {
    followed: Boolean(follow),
    followerCount,
  };
}

export async function updateFanletterFollowForMember({
  action,
  creatorReferralCode,
  followerEmail,
}: {
  action?: "follow" | "unfollow" | null;
  creatorReferralCode?: string | null;
  followerEmail?: string | null;
}): Promise<FanletterCharacterFollowStateResponse> {
  const creator = await resolveFanletterFollowCreator(creatorReferralCode);
  const normalizedFollowerEmail = normalizeFollowerEmail(followerEmail);

  if (!normalizedFollowerEmail) {
    throw new Error("followerEmail is required.");
  }

  if (normalizedFollowerEmail === creator.creatorEmail) {
    throw new Error("Creators cannot follow their own character.");
  }

  if (action !== "follow" && action !== "unfollow") {
    throw new Error("Unsupported follow action.");
  }

  const followsCollection = await getFanletterCharacterFollowsCollection();
  const now = new Date();

  if (action === "unfollow") {
    await followsCollection.deleteOne({
      creatorReferralCode: creator.creatorReferralCode,
      followerEmail: normalizedFollowerEmail,
    });
  } else {
    await followsCollection.updateOne(
      {
        creatorReferralCode: creator.creatorReferralCode,
        followerEmail: normalizedFollowerEmail,
      },
      {
        $set: {
          creatorEmail: creator.creatorEmail,
          creatorReferralCode: creator.creatorReferralCode,
          followerEmail: normalizedFollowerEmail,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );
  }

  return getFanletterFollowState({
    creatorReferralCode: creator.creatorReferralCode,
    followerEmail: normalizedFollowerEmail,
  });
}

export async function getFanletterFollowedCharactersForMember({
  followerEmail,
  locale,
  pageSize,
}: {
  followerEmail?: string | null;
  locale: Locale;
  pageSize?: number | null;
}): Promise<FanletterFollowedCharactersResponse> {
  const normalizedFollowerEmail = normalizeFollowerEmail(followerEmail);

  if (!normalizedFollowerEmail) {
    throw new Error("followerEmail is required.");
  }

  const followsCollection = await getFanletterCharacterFollowsCollection();
  const follows = await followsCollection
    .find({ followerEmail: normalizedFollowerEmail })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(normalizeFollowingPageSize(pageSize))
    .toArray();
  const referralCodes = [
    ...new Set(follows.map((follow) => follow.creatorReferralCode).filter(Boolean)),
  ];

  if (referralCodes.length === 0) {
    return { characters: [] };
  }

  const profilesCollection = await getCreatorProfilesCollection();
  const profiles = await profilesCollection
    .find({ referralCode: { $in: referralCodes } })
    .toArray();
  const profileByReferralCode = new Map(
    profiles.map((profile) => [profile.referralCode, profile]),
  );
  const postsCollection = await getContentPostsCollection();
  const [contentAggregates, followerCountAggregates] = await Promise.all([
    postsCollection
      .aggregate<FanletterPublicContentAggregate>([
        {
          $match: {
            ...getFanletterPublicContentBaseFilter(locale),
            authorReferralCode: { $in: referralCodes },
          },
        },
        {
          $sort: {
            authorReferralCode: 1,
            publishedAt: -1,
            createdAt: -1,
            contentId: -1,
          },
        },
        {
          $group: {
            _id: "$authorReferralCode",
            latestContent: { $first: "$$ROOT" },
            publicContentCount: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    followsCollection
      .aggregate<FanletterFollowerCountAggregate>([
        {
          $match: {
            creatorReferralCode: { $in: referralCodes },
          },
        },
        {
          $group: {
            _id: "$creatorReferralCode",
            followerCount: { $sum: 1 },
          },
        },
      ])
      .toArray(),
  ]);
  const contentByReferralCode = new Map(
    contentAggregates.map((aggregate) => [aggregate._id, aggregate]),
  );
  const followerCountByReferralCode = new Map(
    followerCountAggregates.map((aggregate) => [
      aggregate._id,
      aggregate.followerCount,
    ]),
  );
  const characters = follows.map((follow) =>
    serializeFollowedCharacter({
      contentAggregate: contentByReferralCode.get(follow.creatorReferralCode) ?? null,
      follow,
      followerCount: followerCountByReferralCode.get(follow.creatorReferralCode) ?? 0,
      locale,
      profile: profileByReferralCode.get(follow.creatorReferralCode) ?? null,
    }),
  );

  return { characters };
}

function serializeFollowedCharacter({
  contentAggregate,
  follow,
  followerCount,
  locale,
  profile,
}: {
  contentAggregate: FanletterPublicContentAggregate | null;
  follow: FanletterCharacterFollowDocument;
  followerCount: number;
  locale: Locale;
  profile: CreatorProfileDocument | null;
}): FanletterFollowedCharacterRecord {
  const latestContent = contentAggregate?.latestContent ?? null;
  const publicContentCount = contentAggregate?.publicContentCount ?? 0;
  const fallbackDisplayName =
    follow.creatorEmail.split("@")[0] || follow.creatorReferralCode;
  const characterName =
    compactText(profile?.characterPersona?.name, 64) ||
    compactText(profile?.displayName, 64) ||
    fallbackDisplayName;
  const characterSummary =
    compactText(profile?.characterPersona?.summary, 220) ||
    compactText(profile?.intro, 220) ||
    (locale === "ko"
      ? "FanLetter에서 팔로우 중인 AI 캐릭터 채널입니다."
      : "An AI character channel you follow on FanLetter.");
  const traits =
    profile?.characterPersona?.lockedTraits
      .map((trait) => compactText(trait, TRAIT_LIMIT))
      .filter(Boolean)
      .slice(0, 4) ?? [];

  return {
    avatarImageUrl: profile?.avatarImageUrl ?? null,
    characterName,
    characterSummary,
    displayName: compactText(profile?.displayName, 48) || fallbackDisplayName,
    followedAt: follow.createdAt.toISOString(),
    followerCount,
    latestContent: latestContent ? serializeLatestContent(latestContent) : null,
    publicContentCount,
    referralCode: follow.creatorReferralCode,
    traits,
    updatedAt: follow.updatedAt.toISOString(),
    videoContentCount: publicContentCount,
  };
}
