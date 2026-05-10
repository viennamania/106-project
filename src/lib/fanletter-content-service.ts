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
  type FanletterFanRequestType,
  createEmptyContentSocialSummary,
  normalizeContentLocale,
} from "@/lib/content";
import { getContentSocialSummaryForViewer } from "@/lib/content-service";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";
import {
  getContentPostsCollection,
  getCreatorProfilesCollection,
  getFanletterFanRequestsCollection,
} from "@/lib/mongodb";

const FANLETTER_PUBLIC_CONTENT_LIMIT = 24;
const FANLETTER_PUBLIC_FAN_REQUEST_PREVIEW_LIMIT = 5;
const FANLETTER_FEED_PAGE_SIZE = 24;
const FANLETTER_FEED_MAX_SORT_CANDIDATES = 240;
const SUMMARY_LIMIT = 180;
const TITLE_LIMIT = 96;

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
};

export type FanletterCreatorProfile = {
  avatarImageUrl: string | null;
  character: FanletterPublicCharacter | null;
  displayName: string;
  intro: string;
  referralCode: string;
};

export type FanletterPublicCharacter = {
  avatarImageSet: Array<{
    expression: CreatorProfileAvatarCandidate["expression"] | null;
    label: string | null;
    url: string;
  }>;
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

function getPublicCharacter({
  posts,
  profile,
}: {
  posts: ContentPostDocument[];
  profile: CreatorProfileDocument | null | undefined;
}): FanletterPublicCharacter | null {
  const persona = profile?.characterPersona;

  if (!persona || !profile) {
    return null;
  }

  return {
    avatarImageSet: getPublicAvatarImageSet(profile),
    imageContentCount: posts.filter((post) => getMediaType(post) === "image").length,
    latestTitle: compactText(posts[0]?.title, 72) || null,
    name: compactText(persona.name, 64) || profile.displayName,
    summary: compactText(persona.summary, 220),
    traits: getPublicCharacterTraits(persona),
    videoContentCount: posts.filter((post) => getMediaType(post) === "video").length,
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
  const requests = await requestsCollection
    .find({
      creatorReferralCode: referralCode,
      status: { $in: ["new", "reviewed", "used"] },
    })
    .sort({
      createdAt: -1,
      updatedAt: -1,
    })
    .limit(FANLETTER_PUBLIC_FAN_REQUEST_PREVIEW_LIMIT)
    .toArray();

  return requests.map(toPublicFanRequestPreview);
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
    const [authorPosts, authorPublicContentCount] = authorContentFilter
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
        ])
      : [[], 0];
    const authorRecentPosts = authorPosts
      .filter((authorPost) => authorPost.contentId !== post.contentId)
      .slice(0, 4);
    const authorRecentSocialByContentId =
      await getSocialByContentId(authorRecentPosts);

    return {
      ...toPublicContentItem({ post, profile, social }),
      authorCharacter: getPublicCharacter({ posts: authorPosts, profile }),
      authorPublicContentCount,
      authorRecentContent: authorRecentPosts.map((authorPost) =>
        toPublicContentItem({
          post: authorPost,
          profile,
          social: authorRecentSocialByContentId.get(authorPost.contentId),
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
    const [storedProfile, posts, publicContentCount, fanRequestPreviews] =
      await Promise.all([
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
        postsCollection.countDocuments(contentFilter),
        getPublicFanRequestPreviews(referralCode).catch(() => []),
      ]);
    const profile =
      storedProfile ??
      (posts[0]?.authorEmail
        ? await profilesCollection.findOne({ email: posts[0].authorEmail })
        : null);

    if (!profile && posts.length === 0) {
      return null;
    }

    const socialByContentId = await getSocialByContentId(posts);
    const displayName =
      compactText(profile?.displayName, 48) ||
      posts[0]?.authorEmail.split("@")[0] ||
      "FanLetter Creator";

    return {
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
        character: getPublicCharacter({ posts, profile }),
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
