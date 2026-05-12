import "server-only";

import { cache } from "react";
import type { Filter } from "mongodb";

import {
  type CreatorCharacterPersona,
  type ContentPostDocument,
  type ContentPriceType,
  type ContentSocialSummaryRecord,
  type CreatorProfileAvatarCandidate,
  type CreatorProfileDocument,
  type FanletterFanRequestDocument,
  type FanletterFanRequestStatus,
  type FanletterFanRequestType,
  createEmptyContentSocialSummary,
  normalizeContentLocale,
} from "@/lib/content";
import { getContentSocialSummaryForViewer } from "@/lib/content-service";
import {
  buildFanletterCharacterGrowthRecord,
  type FanletterCharacterGrowthMetrics,
} from "@/lib/fanletter-character-growth";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";
import {
  getContentPostsCollection,
  getCreatorProfilesCollection,
  getFanletterFanRequestsCollection,
} from "@/lib/mongodb";

const FANLETTER_PUBLIC_CONTENT_LIMIT = 24;
const FANLETTER_PUBLIC_FAN_REQUEST_PREVIEW_LIMIT = 5;
const FANLETTER_FAN_ONLY_CONTENT_LIMIT = 6;
const FANLETTER_FEED_PAGE_SIZE = 24;
const FANLETTER_FEED_MAX_SORT_CANDIDATES = 240;
const SUMMARY_LIMIT = 180;
const TITLE_LIMIT = 96;
const EMPTY_PUBLIC_FAN_REQUEST_METRICS: FanletterPublicFanRequestMetrics = {
  completedCount: 0,
  pendingCount: 0,
  totalCount: 0,
};

export const fanletterFeedSortOptions = [
  "latest",
  "popular",
  "comments",
  "saves",
] as const;

export type FanletterFeedSort = (typeof fanletterFeedSortOptions)[number];

export type FanletterFeedFilters = {
  page: number;
  pageCount: number;
  pageSize: number;
  query: string;
  sort: FanletterFeedSort;
  totalCount: number;
};

export type FanletterPublicContentItem = {
  authorAvatarImageUrl: string | null;
  authorName: string;
  authorReferralCode: string | null;
  contentId: string;
  coverImageUrl: string | null;
  mediaType: "image" | "text" | "video";
  priceType: ContentPriceType;
  priceUsdt: string | null;
  primaryVideoUrl: string | null;
  publishedAt: string | null;
  social: ContentSocialSummaryRecord;
  summary: string;
  title: string;
};

export type FanletterPublicCharacterGrowth = {
  level: number;
  maxLevel: number;
  metrics: {
    fanRequestCount: number;
    publicVlogCount: number;
    reactionCount: number;
    saveCount: number;
  };
  nextMission: {
    description: string;
    progress: number;
    target: number;
    title: string;
  } | null;
  progressPercent: number;
  skills: Array<{
    description: string;
    label: string;
  }>;
  summary: string;
  title: string;
  totalXp: number;
};

export type FanletterPublicContentDetail = FanletterPublicContentItem & {
  authorCharacter: FanletterPublicCharacter | null;
  authorPublicContentCount: number;
  authorRecentContent: FanletterPublicContentItem[];
  body: string;
  canPubliclyAccess: boolean;
  contentImageUrls: string[];
  contentVideoUrls: string[];
  fanRequestSource: FanletterPublicFanRequestSource | null;
  tags: string[];
};

export type FanletterPublicFanRequestSource = {
  body: string;
  characterName: string;
  createdAt: string;
  requestType: FanletterFanRequestType;
  requesterDisplayName: string | null;
};

export type FanletterPublicFanRequestPreview = {
  body: string;
  createdAt: string;
  requestType: FanletterFanRequestType;
  requesterDisplayName: string | null;
  status: FanletterFanRequestStatus;
  usedContentId: string | null;
};

export type FanletterCreatorProfile = {
  avatarImageUrl: string | null;
  character: FanletterPublicCharacter | null;
  displayName: string;
  intro: string;
  referralCode: string;
};

type FanletterPublicFanRequestMetrics = {
  completedCount: number;
  pendingCount: number;
  totalCount: number;
};

export type FanletterPublicCharacter = {
  avatarImageSet: Array<{
    expression: CreatorProfileAvatarCandidate["expression"] | null;
    label: string | null;
    url: string;
  }>;
  growth: FanletterPublicCharacterGrowth;
  imageContentCount: number;
  latestTitle: string | null;
  name: string;
  summary: string;
  traits: string[];
  videoContentCount: number;
};

export type FanletterFeedPageData = {
  filters: FanletterFeedFilters;
  items: FanletterPublicContentItem[];
  referralCode: string | null;
};

export type FanletterCreatorPageData = {
  fanOnlyContentCount: number;
  fanOnlyItems: FanletterPublicContentItem[];
  fanRequestPreviews: FanletterPublicFanRequestPreview[];
  items: FanletterPublicContentItem[];
  profile: FanletterCreatorProfile;
  publicContentCount: number;
};

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

function compactText(value: string | null | undefined, limit: number) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();

  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit - 1).trimEnd()}...`;
}

function compactSearchQuery(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isFanletterFeedSort(value: string | null | undefined): value is FanletterFeedSort {
  return fanletterFeedSortOptions.includes(value as FanletterFeedSort);
}

function normalizeFeedPage(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.floor(value));
}

function getFanletterEngagementScore(item: FanletterPublicContentItem) {
  return (
    item.social.likeCount * 3 +
    item.social.commentCount * 4 +
    item.social.saveCount * 2
  );
}

function sortFeedItems(
  items: FanletterPublicContentItem[],
  sort: FanletterFeedSort,
) {
  const withLatestFallback = (a: FanletterPublicContentItem, b: FanletterPublicContentItem) =>
    new Date(b.publishedAt ?? 0).getTime() -
      new Date(a.publishedAt ?? 0).getTime() ||
    b.contentId.localeCompare(a.contentId);

  return [...items].sort((a, b) => {
    if (sort === "popular") {
      const scoreDelta = getFanletterEngagementScore(b) - getFanletterEngagementScore(a);

      return scoreDelta || withLatestFallback(a, b);
    }

    if (sort === "comments") {
      return (
        b.social.commentCount - a.social.commentCount ||
        getFanletterEngagementScore(b) - getFanletterEngagementScore(a) ||
        withLatestFallback(a, b)
      );
    }

    if (sort === "saves") {
      return (
        b.social.saveCount - a.social.saveCount ||
        getFanletterEngagementScore(b) - getFanletterEngagementScore(a) ||
        withLatestFallback(a, b)
      );
    }

    return withLatestFallback(a, b);
  });
}

function getPublicCharacterTraits(persona: CreatorCharacterPersona) {
  return persona.lockedTraits
    .map((trait) => compactText(trait, 44))
    .filter(Boolean)
    .slice(0, 6);
}

function getPublicAvatarImageSet(profile: CreatorProfileDocument) {
  const uniqueUrls = new Set<string>();
  const candidates = [
    ...(profile.avatarImageUrl
      ? [
          {
            expression: null,
            label: null,
            url: profile.avatarImageUrl,
          },
        ]
      : []),
    ...(profile.avatarImageSet ?? []).map((candidate) => ({
      expression: candidate.expression ?? null,
      label: candidate.label ?? null,
      url: candidate.url,
    })),
  ];

  return candidates
    .filter((candidate) => {
      const url = candidate.url.trim();

      if (!url || uniqueUrls.has(url)) {
        return false;
      }

      uniqueUrls.add(url);
      return true;
    })
    .slice(0, 4);
}

function getPublicPublishingStreakDays(posts: ContentPostDocument[]) {
  const dayValues = [
    ...new Set(
      posts
        .map((post) => (post.publishedAt ?? post.createdAt).toISOString().slice(0, 10)),
    ),
  ].sort((a, b) => (a < b ? 1 : -1));

  if (dayValues.length === 0) {
    return 0;
  }

  let streak = 1;
  let previous = new Date(`${dayValues[0]}T00:00:00.000Z`).getTime();

  for (const dayValue of dayValues.slice(1)) {
    const current = new Date(`${dayValue}T00:00:00.000Z`).getTime();
    const diffDays = Math.round((previous - current) / (24 * 60 * 60 * 1000));

    if (diffDays !== 1) {
      break;
    }

    streak += 1;
    previous = current;
  }

  return streak;
}

function getPublicCharacterGrowth({
  characterReady,
  fanRequestMetrics,
  locale,
  publicContentCount,
  posts,
  socialByContentId,
}: {
  characterReady: boolean;
  fanRequestMetrics: FanletterPublicFanRequestMetrics;
  locale: Locale;
  publicContentCount?: number;
  posts: ContentPostDocument[];
  socialByContentId?: Map<string, ContentSocialSummaryRecord>;
}): FanletterPublicCharacterGrowth {
  const publicVlogCount =
    publicContentCount ??
    posts.filter((post) => getMediaType(post) === "video").length;
  const socialTotals = posts.reduce(
    (totals, post) => {
      const social = socialByContentId?.get(post.contentId);

      return {
        commentCount: totals.commentCount + (social?.commentCount ?? 0),
        likeCount: totals.likeCount + (social?.likeCount ?? 0),
        paidBuyerCount: totals.paidBuyerCount + (social?.paidBuyerCount ?? 0),
        saveCount: totals.saveCount + (social?.saveCount ?? 0),
      };
    },
    {
      commentCount: 0,
      likeCount: 0,
      paidBuyerCount: 0,
      saveCount: 0,
    },
  );
  const reactionCount =
    socialTotals.likeCount + socialTotals.commentCount + socialTotals.saveCount;
  const metrics: FanletterCharacterGrowthMetrics = {
    commentCount: socialTotals.commentCount,
    draftVlogCount: 0,
    fanRequestCompletedCount: fanRequestMetrics.completedCount,
    fanRequestPendingCount: fanRequestMetrics.pendingCount,
    fanRequestTotalCount: fanRequestMetrics.totalCount,
    likeCount: socialTotals.likeCount,
    paidBuyerCount: socialTotals.paidBuyerCount,
    publishedVlogCount: publicVlogCount,
    saveCount: socialTotals.saveCount,
    streakDays: getPublicPublishingStreakDays(posts),
    totalVlogCount: publicVlogCount,
  };
  const growth = buildFanletterCharacterGrowthRecord({
    characterReady,
    locale,
    metrics,
  });
  const nextMission =
    growth.missions.find(
      (mission) => mission.id !== "character_ready" && !mission.completed,
    ) ?? null;
  const unlockedSkills = growth.contentSkills.filter((skill) => skill.unlocked);
  const skills = (unlockedSkills.length > 0 ? unlockedSkills : growth.contentSkills)
    .slice(0, 3)
    .map((skill) => ({
      description: skill.description,
      label: skill.label,
    }));

  return {
    level: growth.level,
    maxLevel: growth.maxLevel,
    metrics: {
      fanRequestCount: fanRequestMetrics.totalCount,
      publicVlogCount,
      reactionCount,
      saveCount: socialTotals.saveCount,
    },
    nextMission: nextMission
      ? {
          description: nextMission.description,
          progress: nextMission.progress,
          target: nextMission.target,
          title: nextMission.title,
        }
      : null,
    progressPercent: growth.progressPercent,
    skills,
    summary: growth.summary,
    title: growth.title,
    totalXp: growth.totalXp,
  };
}

function getPublicCharacter({
  fanRequestMetrics = EMPTY_PUBLIC_FAN_REQUEST_METRICS,
  locale,
  posts,
  profile,
  publicContentCount,
  socialByContentId,
}: {
  fanRequestMetrics?: FanletterPublicFanRequestMetrics;
  locale: Locale;
  posts: ContentPostDocument[];
  profile: CreatorProfileDocument | null | undefined;
  publicContentCount?: number;
  socialByContentId?: Map<string, ContentSocialSummaryRecord>;
}): FanletterPublicCharacter | null {
  const persona = profile?.characterPersona;

  if (!persona || !profile) {
    return null;
  }

  return {
    avatarImageSet: getPublicAvatarImageSet(profile),
    growth: getPublicCharacterGrowth({
      characterReady: Boolean(
        profile.displayName.trim() && persona && profile.avatarImageUrl,
      ),
      fanRequestMetrics,
      locale,
      posts,
      publicContentCount,
      socialByContentId,
    }),
    imageContentCount: posts.filter((post) => getMediaType(post) === "image").length,
    latestTitle: compactText(posts[0]?.title, 72) || null,
    name: compactText(persona.name, 64) || profile.displayName,
    summary: compactText(persona.summary, 220),
    traits: getPublicCharacterTraits(persona),
    videoContentCount:
      publicContentCount ??
      posts.filter((post) => getMediaType(post) === "video").length,
  };
}

function getCoverImageUrl(post: ContentPostDocument) {
  return post.coverImageUrl ?? post.contentImageUrls?.[0] ?? null;
}

function getPrimaryVideoUrl(post: ContentPostDocument) {
  return post.contentVideoUrls?.find((url) => Boolean(url?.trim())) ?? null;
}

function getMediaType(post: ContentPostDocument): FanletterPublicContentItem["mediaType"] {
  if (getPrimaryVideoUrl(post)) {
    return "video";
  }

  if (getCoverImageUrl(post)) {
    return "image";
  }

  return "text";
}

function getAuthorName(
  post: ContentPostDocument,
  profile: CreatorProfileDocument | undefined | null,
) {
  return (
    compactText(profile?.displayName, 36) ||
    post.authorEmail.split("@")[0] ||
    "FanLetter"
  );
}

async function getProfilesByAuthorEmail(posts: ContentPostDocument[]) {
  const emails = [...new Set(posts.map((post) => post.authorEmail).filter(Boolean))];

  if (emails.length === 0) {
    return new Map<string, CreatorProfileDocument>();
  }

  const profilesCollection = await getCreatorProfilesCollection();
  const profiles = await profilesCollection
    .find({
      email: { $in: emails },
    })
    .toArray();

  return new Map(profiles.map((profile) => [profile.email, profile]));
}

async function getCreatorProfileMatchesForFeedQuery(query: string) {
  if (!query) {
    return {
      emails: [],
      referralCodes: [],
    };
  }

  const profilesCollection = await getCreatorProfilesCollection();
  const regex = new RegExp(escapeRegExp(query), "i");
  const profiles = await profilesCollection
    .find(
      {
        $or: [
          { displayName: regex },
          { email: regex },
          { intro: regex },
          { referralCode: regex },
          { "characterPersona.name": regex },
          { "characterPersona.summary": regex },
          { "characterPersona.lockedTraits": regex },
        ],
      },
      {
        projection: {
          email: 1,
          referralCode: 1,
        },
      },
    )
    .limit(80)
    .toArray();

  return {
    emails: profiles.map((profile) => profile.email).filter(Boolean),
    referralCodes: profiles
      .map((profile) => normalizeReferralCode(profile.referralCode))
      .filter((value): value is string => Boolean(value)),
  };
}

async function getSocialByContentId(posts: ContentPostDocument[]) {
  const pairs = await Promise.all(
    posts.map(async (post) => [
      post.contentId,
      await getContentSocialSummaryForViewer(post.contentId, null).catch(() =>
        createEmptyContentSocialSummary(),
      ),
    ] as const),
  );

  return new Map(pairs);
}

function toPublicContentItem({
  post,
  profile,
  social,
}: {
  post: ContentPostDocument;
  profile: CreatorProfileDocument | null | undefined;
  social?: ContentSocialSummaryRecord;
}): FanletterPublicContentItem {
  return {
    authorAvatarImageUrl: profile?.avatarImageUrl ?? null,
    authorName: getAuthorName(post, profile),
    authorReferralCode:
      profile?.referralCode ?? post.authorReferralCode?.trim() ?? null,
    contentId: post.contentId,
    coverImageUrl: getCoverImageUrl(post),
    mediaType: getMediaType(post),
    priceType: post.priceType,
    priceUsdt: post.priceUsdt ?? null,
    primaryVideoUrl: getPrimaryVideoUrl(post),
    publishedAt: post.publishedAt?.toISOString() ?? null,
    social: social ?? createEmptyContentSocialSummary(),
    summary: compactText(post.summary || post.previewText || post.body, SUMMARY_LIMIT),
    title: compactText(post.title, TITLE_LIMIT),
  };
}

function toPublicFanRequestSource(
  request: FanletterFanRequestDocument,
): FanletterPublicFanRequestSource {
  return {
    body: compactText(request.body, 220),
    characterName: compactText(request.characterName, 64),
    createdAt: request.createdAt.toISOString(),
    requestType: request.requestType,
    requesterDisplayName: compactText(request.requesterDisplayName, 36) || null,
  };
}

function toPublicFanRequestPreview(
  request: FanletterFanRequestDocument,
): FanletterPublicFanRequestPreview {
  return {
    body: compactText(request.body, 180),
    createdAt: request.createdAt.toISOString(),
    requestType: request.requestType,
    requesterDisplayName: compactText(request.requesterDisplayName, 28) || null,
    status: request.status,
    usedContentId: request.usedContentId ?? null,
  };
}

async function getFanRequestSourceForContent(contentId: string) {
  const requestsCollection = await getFanletterFanRequestsCollection();
  const request = await requestsCollection.findOne(
    {
      status: "used",
      usedContentId: contentId,
    },
    {
      sort: {
        updatedAt: -1,
        createdAt: -1,
      },
    },
  );

  return request ? toPublicFanRequestSource(request) : null;
}

async function getPublicFanRequestPreviews(referralCode: string) {
  const requestsCollection = await getFanletterFanRequestsCollection();
  const [usedRequests, recentRequests] = await Promise.all([
    requestsCollection
      .find({
        creatorReferralCode: referralCode,
        status: "used",
        usedContentId: { $type: "string" },
      })
      .sort({
        updatedAt: -1,
        createdAt: -1,
      })
      .limit(3)
      .toArray(),
    requestsCollection
      .find({
        creatorReferralCode: referralCode,
        status: { $in: ["new", "reviewed", "used"] },
      })
      .sort({
        createdAt: -1,
        updatedAt: -1,
      })
      .limit(FANLETTER_PUBLIC_FAN_REQUEST_PREVIEW_LIMIT)
      .toArray(),
  ]);
  const requestsById = new Map<string, FanletterFanRequestDocument>();

  [...usedRequests, ...recentRequests].forEach((request) => {
    if (!requestsById.has(request.requestId)) {
      requestsById.set(request.requestId, request);
    }
  });
  const requests = [...requestsById.values()].slice(
    0,
    FANLETTER_PUBLIC_FAN_REQUEST_PREVIEW_LIMIT,
  );

  return requests.map(toPublicFanRequestPreview);
}

async function getPublicFanRequestMetrics(
  referralCode: string,
): Promise<FanletterPublicFanRequestMetrics> {
  const requestsCollection = await getFanletterFanRequestsCollection();
  const counts = await requestsCollection
    .aggregate<{ _id: FanletterFanRequestStatus; count: number }>([
      {
        $match: {
          creatorReferralCode: referralCode,
          status: { $in: ["new", "reviewed", "used"] },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();
  const countByStatus = new Map(counts.map((item) => [item._id, item.count]));

  return {
    completedCount: countByStatus.get("used") ?? 0,
    pendingCount: (countByStatus.get("new") ?? 0) + (countByStatus.get("reviewed") ?? 0),
    totalCount: counts.reduce((total, item) => total + item.count, 0),
  };
}

async function getPublicContentFilter({
  locale,
  query,
  referralCode,
}: {
  locale: Locale;
  query?: string | null;
  referralCode?: string | null;
}): Promise<Filter<ContentPostDocument>> {
  const baseFilter: Filter<ContentPostDocument> = {
    ...getPublishedContentLocaleFilter(locale),
    ...(referralCode ? { authorReferralCode: referralCode } : {}),
    "contentVideoUrls.0": { $exists: true },
    priceType: "free",
    status: "published",
  };
  const normalizedQuery = compactSearchQuery(query);

  if (!normalizedQuery) {
    return baseFilter;
  }

  const regex = new RegExp(escapeRegExp(normalizedQuery), "i");
  const profileMatches =
    await getCreatorProfileMatchesForFeedQuery(normalizedQuery);
  const searchClauses: Filter<ContentPostDocument>[] = [
    { authorEmail: regex },
    { authorReferralCode: regex },
    { body: regex },
    { previewText: regex },
    { summary: regex },
    { tags: regex },
    { title: regex },
  ];

  if (profileMatches.emails.length > 0) {
    searchClauses.push({ authorEmail: { $in: profileMatches.emails } });
  }

  if (profileMatches.referralCodes.length > 0) {
    searchClauses.push({
      authorReferralCode: { $in: profileMatches.referralCodes },
    });
  }

  return {
    $and: [
      baseFilter,
      {
        $or: searchClauses,
      },
    ],
  };
}

function getFanOnlyContentFilter({
  locale,
  referralCode,
}: {
  locale: Locale;
  referralCode: string;
}): Filter<ContentPostDocument> {
  return {
    ...getPublishedContentLocaleFilter(locale),
    authorReferralCode: referralCode,
    "contentVideoUrls.0": { $exists: true },
    priceType: "paid",
    status: "published",
  };
}

export async function getFanletterPublicContentItems({
  locale,
  limit = FANLETTER_PUBLIC_CONTENT_LIMIT,
  query,
  referralCode,
}: {
  locale: Locale;
  limit?: number;
  query?: string | null;
  referralCode?: string | null;
}) {
  const postsCollection = await getContentPostsCollection();
  const normalizedReferralCode = normalizeReferralCode(referralCode);
  const contentFilter = await getPublicContentFilter({
    locale,
    query,
    referralCode: normalizedReferralCode,
  });
  const posts = await postsCollection
    .find(contentFilter)
    .sort({
      publishedAt: -1,
      createdAt: -1,
      contentId: -1,
    })
    .limit(limit)
    .toArray();
  const [profileByEmail, socialByContentId] = await Promise.all([
    getProfilesByAuthorEmail(posts),
    getSocialByContentId(posts),
  ]);

  return posts.map((post) =>
    toPublicContentItem({
      post,
      profile: profileByEmail.get(post.authorEmail),
      social: socialByContentId.get(post.contentId),
    }),
  );
}

export const getFanletterFeedPageData = cache(
  async (
    locale: Locale,
    referralCodeInput: string | null,
    options?: {
      page?: number | null;
      query?: string | null;
      sort?: string | null;
    },
  ): Promise<FanletterFeedPageData> => {
    const referralCode = normalizeReferralCode(referralCodeInput);
    const query = compactSearchQuery(options?.query);
    const sort = isFanletterFeedSort(options?.sort) ? options.sort : "latest";
    const postsCollection = await getContentPostsCollection();
    const contentFilter = await getPublicContentFilter({ locale, query });
    const totalMatchingCount = await postsCollection.countDocuments(contentFilter);
    const pageSize = FANLETTER_FEED_PAGE_SIZE;
    let page = normalizeFeedPage(options?.page);
    let items: FanletterPublicContentItem[] = [];
    const totalCount =
      sort === "latest"
        ? totalMatchingCount
        : Math.min(totalMatchingCount, FANLETTER_FEED_MAX_SORT_CANDIDATES);
    const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

    page = Math.min(page, pageCount);

    const offset = (page - 1) * pageSize;

    if (totalMatchingCount > 0) {
      if (sort === "latest") {
        const posts = await postsCollection
          .find(contentFilter)
          .sort({
            publishedAt: -1,
            createdAt: -1,
            contentId: -1,
          })
          .skip(offset)
          .limit(pageSize)
          .toArray();
        const [profileByEmail, socialByContentId] = await Promise.all([
          getProfilesByAuthorEmail(posts),
          getSocialByContentId(posts),
        ]);

        items = posts.map((post) =>
          toPublicContentItem({
            post,
            profile: profileByEmail.get(post.authorEmail),
            social: socialByContentId.get(post.contentId),
          }),
        );
      } else {
        const posts = await postsCollection
          .find(contentFilter)
          .sort({
            publishedAt: -1,
            createdAt: -1,
            contentId: -1,
          })
          .limit(FANLETTER_FEED_MAX_SORT_CANDIDATES)
          .toArray();
        const [profileByEmail, socialByContentId] = await Promise.all([
          getProfilesByAuthorEmail(posts),
          getSocialByContentId(posts),
        ]);
        const sortedItems = sortFeedItems(
          posts.map((post) =>
            toPublicContentItem({
              post,
              profile: profileByEmail.get(post.authorEmail),
              social: socialByContentId.get(post.contentId),
            }),
          ),
          sort,
        );

        items = sortedItems.slice(offset, offset + pageSize);
      }
    }

    return {
      filters: {
        page,
        pageCount,
        pageSize,
        query,
        sort,
        totalCount,
      },
      items,
      referralCode,
    };
  },
);

export const getFanletterPublicContentDetail = cache(
  async (
    contentId: string,
    locale: Locale,
  ): Promise<FanletterPublicContentDetail | null> => {
    const postsCollection = await getContentPostsCollection();
    const post = await postsCollection.findOne({
      contentId,
      status: "published",
    });

    if (!post) {
      return null;
    }

    if (!getPrimaryVideoUrl(post)) {
      return null;
    }

    const profilesCollection = await getCreatorProfilesCollection();
    const [profile, social, fanRequestSource] = await Promise.all([
      profilesCollection.findOne({ email: post.authorEmail }),
      getContentSocialSummaryForViewer(post.contentId, null).catch(() =>
        createEmptyContentSocialSummary(),
      ),
      getFanRequestSourceForContent(post.contentId),
    ]);
    const canPubliclyAccess = post.priceType === "free";
    const authorReferralCode = normalizeReferralCode(
      profile?.referralCode ?? post.authorReferralCode,
    );
    const authorContentFilter = authorReferralCode
      ? await getPublicContentFilter({ locale, referralCode: authorReferralCode })
      : null;
    const [authorPosts, authorPublicContentCount, authorFanRequestMetrics] =
      authorContentFilter
        ? await Promise.all([
            postsCollection
              .find(authorContentFilter)
              .sort({
                publishedAt: -1,
                createdAt: -1,
                contentId: -1,
              })
              .limit(FANLETTER_PUBLIC_CONTENT_LIMIT)
              .toArray(),
            postsCollection.countDocuments(authorContentFilter),
            authorReferralCode
              ? getPublicFanRequestMetrics(authorReferralCode).catch(
                  () => EMPTY_PUBLIC_FAN_REQUEST_METRICS,
                )
              : EMPTY_PUBLIC_FAN_REQUEST_METRICS,
          ])
        : [[], 0, EMPTY_PUBLIC_FAN_REQUEST_METRICS];
    const authorRecentPosts = authorPosts
      .filter((authorPost) => authorPost.contentId !== post.contentId)
      .slice(0, 4);
    const authorSocialByContentId = await getSocialByContentId(authorPosts);

    return {
      ...toPublicContentItem({ post, profile, social }),
      authorCharacter: getPublicCharacter({
        fanRequestMetrics: authorFanRequestMetrics,
        locale,
        posts: authorPosts,
        profile,
        publicContentCount: authorPublicContentCount,
        socialByContentId: authorSocialByContentId,
      }),
      authorPublicContentCount,
      authorRecentContent: authorRecentPosts.map((authorPost) =>
        toPublicContentItem({
          post: authorPost,
          profile,
          social: authorSocialByContentId.get(authorPost.contentId),
        }),
      ),
      body: canPubliclyAccess
        ? post.body
        : post.previewText?.trim() || post.summary,
      canPubliclyAccess,
      contentImageUrls: canPubliclyAccess ? post.contentImageUrls ?? [] : [],
      contentVideoUrls: canPubliclyAccess ? post.contentVideoUrls ?? [] : [],
      fanRequestSource,
      tags: post.tags,
    };
  },
);

export const getFanletterCreatorPageData = cache(
  async (
    locale: Locale,
    referralCodeInput: string,
  ): Promise<FanletterCreatorPageData | null> => {
    const referralCode = normalizeReferralCode(referralCodeInput);

    if (!referralCode) {
      return null;
    }

    const profilesCollection = await getCreatorProfilesCollection();
    const postsCollection = await getContentPostsCollection();
    const contentFilter = await getPublicContentFilter({ locale, referralCode });
    const fanOnlyContentFilter = getFanOnlyContentFilter({ locale, referralCode });
    const [
      storedProfile,
      posts,
      fanOnlyPosts,
      publicContentCount,
      fanOnlyContentCount,
      fanRequestPreviews,
      fanRequestMetrics,
    ] = await Promise.all([
        profilesCollection.findOne({ referralCode }),
        postsCollection
          .find(contentFilter)
          .sort({
            publishedAt: -1,
            createdAt: -1,
            contentId: -1,
          })
          .limit(FANLETTER_PUBLIC_CONTENT_LIMIT)
          .toArray(),
        postsCollection
          .find(fanOnlyContentFilter)
          .sort({
            publishedAt: -1,
            createdAt: -1,
            contentId: -1,
          })
          .limit(FANLETTER_FAN_ONLY_CONTENT_LIMIT)
          .toArray(),
        postsCollection.countDocuments(contentFilter),
        postsCollection.countDocuments(fanOnlyContentFilter),
        getPublicFanRequestPreviews(referralCode).catch(() => []),
        getPublicFanRequestMetrics(referralCode).catch(
          () => EMPTY_PUBLIC_FAN_REQUEST_METRICS,
        ),
      ]);
    const creatorPosts = [...posts, ...fanOnlyPosts];
    const profile =
      storedProfile ??
      (creatorPosts[0]?.authorEmail
        ? await profilesCollection.findOne({ email: creatorPosts[0].authorEmail })
        : null);

    if (!profile && creatorPosts.length === 0) {
      return null;
    }

    const socialByContentId = await getSocialByContentId(creatorPosts);
    const displayName =
      compactText(profile?.displayName, 48) ||
      creatorPosts[0]?.authorEmail.split("@")[0] ||
      "FanLetter Creator";

    return {
      fanOnlyContentCount,
      fanOnlyItems: fanOnlyPosts.map((post) =>
        toPublicContentItem({
          post,
          profile,
          social: socialByContentId.get(post.contentId),
        }),
      ),
      fanRequestPreviews,
      items: posts.map((post) =>
        toPublicContentItem({
          post,
          profile,
          social: socialByContentId.get(post.contentId),
        }),
      ),
      profile: {
        avatarImageUrl: profile?.avatarImageUrl ?? null,
        character: getPublicCharacter({
          fanRequestMetrics,
          locale,
          posts,
          profile,
          publicContentCount,
          socialByContentId,
        }),
        displayName,
        intro:
          compactText(profile?.intro, 220) ||
          (locale === "ko"
            ? "FanLetter에서 공개 콘텐츠를 운영하는 크리에이터입니다."
            : "A creator publishing public content on FanLetter."),
        referralCode,
      },
      publicContentCount,
    };
  },
);
