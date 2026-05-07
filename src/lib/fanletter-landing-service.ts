import "server-only";

import { cache } from "react";
import type { Filter } from "mongodb";

import {
  type ContentPostDocument,
  type CreatorProfileDocument,
  normalizeContentLocale,
} from "@/lib/content";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";
import {
  getContentOrdersCollection,
  getContentCommentsCollection,
  getContentPostsCollection,
  getCreatorProfilesCollection,
  getContentSocialActionsCollection,
} from "@/lib/mongodb";

const FEATURED_VIDEO_LIMIT = 6;
const FEATURED_VIDEO_CANDIDATE_LIMIT = 48;
const RECENCY_DECAY_DAYS = 21;
const TEXT_LIMIT = 170;

export type FanletterFeaturedVideo = {
  authorAvatarImageUrl: string | null;
  authorName: string;
  contentId: string;
  coverImageUrl: string | null;
  priceLabel: "free" | "paid";
  publishedAt: string | null;
  summary: string;
  title: string;
  videoUrl: string;
};

export type FanletterLiveStats = {
  activeCreatorCount: number;
  confirmedSalesCount: number;
  publishedContentCount: number;
  publicVideoCount: number;
  totalSalesUsdt: number;
};

export type FanletterLandingData = {
  featuredVideos: FanletterFeaturedVideo[];
  liveStats: FanletterLiveStats;
};

type FanletterCandidateSignals = {
  commentCount: number;
  likeCount: number;
  paidBuyerCount: number;
  saveCount: number;
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

function compactText(value: string | null | undefined, limit = TEXT_LIMIT) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();

  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit - 1).trimEnd()}...`;
}

function getVideoUrl(post: ContentPostDocument) {
  return post.contentVideoUrls?.find((url) => typeof url === "string" && url);
}

function getAuthorName(
  post: ContentPostDocument,
  profile: CreatorProfileDocument | undefined,
) {
  return compactText(profile?.displayName, 36) || post.authorEmail.split("@")[0];
}

function createEmptyCandidateSignals(): FanletterCandidateSignals {
  return {
    commentCount: 0,
    likeCount: 0,
    paidBuyerCount: 0,
    saveCount: 0,
  };
}

function mergeUniquePosts(posts: ContentPostDocument[]) {
  const postByContentId = new Map<string, ContentPostDocument>();

  for (const post of posts) {
    if (!postByContentId.has(post.contentId)) {
      postByContentId.set(post.contentId, post);
    }
  }

  return [...postByContentId.values()];
}

function getPostPublishedTime(post: ContentPostDocument) {
  return (post.publishedAt ?? post.createdAt).getTime();
}

function getCompletenessScore(post: ContentPostDocument) {
  let score = 0;

  if (post.coverImageUrl || post.contentImageUrls?.[0]) {
    score += 1;
  }

  if (post.summary || post.previewText) {
    score += 0.55;
  }

  if (post.body.trim().length >= 120) {
    score += 0.3;
  }

  if (post.tags.length > 0) {
    score += 0.2;
  }

  return score;
}

function scoreFeaturedVideoCandidate({
  post,
  referralCode,
  signals,
}: {
  post: ContentPostDocument;
  referralCode: string | null;
  signals: FanletterCandidateSignals;
}) {
  const ageDays = Math.max(
    0,
    (Date.now() - getPostPublishedTime(post)) / (1000 * 60 * 60 * 24),
  );
  const recencyScore = 3 * Math.exp(-ageDays / RECENCY_DECAY_DAYS);
  const referralBoost =
    referralCode && post.authorReferralCode === referralCode ? 5 : 0;
  const engagementScore =
    Math.log1p(
      signals.likeCount +
        signals.saveCount * 1.25 +
        signals.commentCount * 1.5 +
        signals.paidBuyerCount * 3,
    ) * 1.1;

  return Math.max(
    0.2,
    1 +
      referralBoost +
      recencyScore +
      getCompletenessScore(post) +
      engagementScore,
  );
}

async function getCandidateSignals(posts: ContentPostDocument[]) {
  const contentIds = [...new Set(posts.map((post) => post.contentId))];
  const signals = new Map<string, FanletterCandidateSignals>();

  for (const contentId of contentIds) {
    signals.set(contentId, createEmptyCandidateSignals());
  }

  if (contentIds.length === 0) {
    return signals;
  }

  const socialActionsCollection = await getContentSocialActionsCollection();
  const commentsCollection = await getContentCommentsCollection();
  const ordersCollection = await getContentOrdersCollection();
  const [actionCounts, commentCounts, orderCounts] = await Promise.all([
    socialActionsCollection
      .aggregate<{
        _id: string;
        likeCount: number;
        saveCount: number;
      }>([
        {
          $match: {
            contentId: { $in: contentIds },
          },
        },
        {
          $group: {
            _id: "$contentId",
            likeCount: {
              $sum: {
                $cond: ["$liked", 1, 0],
              },
            },
            saveCount: {
              $sum: {
                $cond: ["$saved", 1, 0],
              },
            },
          },
        },
      ])
      .toArray(),
    commentsCollection
      .aggregate<{ _id: string; count: number }>([
        {
          $match: {
            contentId: { $in: contentIds },
          },
        },
        {
          $group: {
            _id: "$contentId",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    ordersCollection
      .aggregate<{ _id: string; buyerCount: number }>([
        {
          $match: {
            contentId: { $in: contentIds },
            status: "confirmed",
          },
        },
        {
          $group: {
            _id: "$contentId",
            buyerCount: { $sum: 1 },
          },
        },
      ])
      .toArray(),
  ]);

  for (const count of actionCounts) {
    const current =
      signals.get(count._id) ?? createEmptyCandidateSignals();
    signals.set(count._id, {
      ...current,
      likeCount: count.likeCount,
      saveCount: count.saveCount,
    });
  }

  for (const count of commentCounts) {
    const current =
      signals.get(count._id) ?? createEmptyCandidateSignals();
    signals.set(count._id, {
      ...current,
      commentCount: count.count,
    });
  }

  for (const count of orderCounts) {
    const current =
      signals.get(count._id) ?? createEmptyCandidateSignals();
    signals.set(count._id, {
      ...current,
      paidBuyerCount: count.buyerCount,
    });
  }

  return signals;
}

function pickWeightedFeaturedPosts({
  posts,
  referralCode,
  signalsByContentId,
}: {
  posts: ContentPostDocument[];
  referralCode: string | null;
  signalsByContentId: Map<string, FanletterCandidateSignals>;
}) {
  const remaining = posts.map((post) => ({
    post,
    score: scoreFeaturedVideoCandidate({
      post,
      referralCode,
      signals:
        signalsByContentId.get(post.contentId) ?? createEmptyCandidateSignals(),
    }),
  }));
  const selected: ContentPostDocument[] = [];
  const selectedCountByAuthor = new Map<string, number>();

  while (remaining.length > 0 && selected.length < FEATURED_VIDEO_LIMIT) {
    const weightedCandidates = remaining.map((candidate) => {
      const selectedAuthorCount =
        selectedCountByAuthor.get(candidate.post.authorEmail) ?? 0;
      const isReferralAuthor =
        referralCode && candidate.post.authorReferralCode === referralCode;
      const diversityPenalty = isReferralAuthor
        ? 1 + Math.max(0, selectedAuthorCount - 3) * 0.4
        : 1 + Math.max(0, selectedAuthorCount - 1) * 0.8;

      return {
        ...candidate,
        adjustedScore: candidate.score / diversityPenalty,
      };
    });
    const totalScore = weightedCandidates.reduce(
      (total, candidate) => total + candidate.adjustedScore,
      0,
    );
    let target = Math.random() * totalScore;
    let pickedIndex = 0;

    for (let index = 0; index < weightedCandidates.length; index += 1) {
      target -= weightedCandidates[index].adjustedScore;

      if (target <= 0) {
        pickedIndex = index;
        break;
      }
    }

    const [picked] = remaining.splice(pickedIndex, 1);
    selected.push(picked.post);
    selectedCountByAuthor.set(
      picked.post.authorEmail,
      (selectedCountByAuthor.get(picked.post.authorEmail) ?? 0) + 1,
    );
  }

  return selected;
}

async function getFeaturedVideoPosts({
  locale,
  referralCode,
}: {
  locale: Locale;
  referralCode: string | null;
}) {
  const postsCollection = await getContentPostsCollection();
  const baseFilter: Filter<ContentPostDocument> = {
    ...getPublishedContentLocaleFilter(locale),
    "contentVideoUrls.0": { $exists: true },
    priceType: "free",
    status: "published",
  };
  const sort = {
    publishedAt: -1,
    createdAt: -1,
    contentId: -1,
  } as const;
  const [scopedPosts, globalPosts] = await Promise.all([
    referralCode
      ? postsCollection
          .find({
            ...baseFilter,
            authorReferralCode: referralCode,
          })
          .sort(sort)
          .limit(FEATURED_VIDEO_CANDIDATE_LIMIT)
          .toArray()
      : Promise.resolve([]),
    postsCollection
      .find(baseFilter)
      .sort(sort)
      .limit(FEATURED_VIDEO_CANDIDATE_LIMIT)
      .toArray(),
  ]);
  const candidates = mergeUniquePosts([...scopedPosts, ...globalPosts]);
  const signalsByContentId = await getCandidateSignals(candidates);

  return pickWeightedFeaturedPosts({
    posts: candidates,
    referralCode,
    signalsByContentId,
  });
}

async function getProfileByEmail(posts: ContentPostDocument[]) {
  const profilesCollection = await getCreatorProfilesCollection();
  const authorEmails = [...new Set(posts.map((post) => post.authorEmail))];

  if (authorEmails.length === 0) {
    return new Map<string, CreatorProfileDocument>();
  }

  const profiles = await profilesCollection
    .find({
      email: { $in: authorEmails },
    })
    .toArray();

  return new Map(profiles.map((profile) => [profile.email, profile]));
}

export const getFanletterLandingData = cache(
  async (
    locale: Locale,
    referralCodeInput: string | null,
  ): Promise<FanletterLandingData> => {
    const referralCode = normalizeReferralCode(referralCodeInput);
    const postsCollection = await getContentPostsCollection();
    const profilesCollection = await getCreatorProfilesCollection();
    const ordersCollection = await getContentOrdersCollection();
    const publishedContentFilter: Filter<ContentPostDocument> = {
      ...getPublishedContentLocaleFilter(locale),
      "contentVideoUrls.0": { $exists: true },
      status: "published",
    };
    const publicVideoFilter: Filter<ContentPostDocument> = {
      ...publishedContentFilter,
      "contentVideoUrls.0": { $exists: true },
      priceType: "free",
    };
    const totalSalesPipeline = [
      {
        $match: {
          status: "confirmed",
        },
      },
      {
        $group: {
          _id: null,
          totalSalesUsdt: {
            $sum: {
              $convert: {
                input: "$amountUsdt",
                onError: 0,
                onNull: 0,
                to: "double",
              },
            },
          },
        },
      },
    ];

    const [
      publishedContentCount,
      publicVideoCount,
      activeCreatorCount,
      confirmedSalesCount,
      totalSalesRows,
      featuredPosts,
    ] = await Promise.all([
      postsCollection.countDocuments(publishedContentFilter),
      postsCollection.countDocuments(publicVideoFilter),
      profilesCollection.countDocuments({ status: "active" }),
      ordersCollection.countDocuments({ status: "confirmed" }),
      ordersCollection
        .aggregate<{ _id: null; totalSalesUsdt: number }>(totalSalesPipeline)
        .toArray(),
      getFeaturedVideoPosts({ locale, referralCode }),
    ]);
    const profileByEmail = await getProfileByEmail(featuredPosts);

    return {
      featuredVideos: featuredPosts.flatMap((post) => {
        const videoUrl = getVideoUrl(post);

        if (!videoUrl) {
          return [];
        }

        const profile = profileByEmail.get(post.authorEmail);

        return [
          {
            authorAvatarImageUrl: profile?.avatarImageUrl ?? null,
            authorName: getAuthorName(post, profile),
            contentId: post.contentId,
            coverImageUrl:
              post.coverImageUrl ?? post.contentImageUrls?.[0] ?? null,
            priceLabel: post.priceType,
            publishedAt: post.publishedAt?.toISOString() ?? null,
            summary: compactText(post.summary || post.previewText || post.body),
            title: compactText(post.title, 92),
            videoUrl,
          },
        ];
      }),
      liveStats: {
        activeCreatorCount,
        confirmedSalesCount,
        publishedContentCount,
        publicVideoCount,
        totalSalesUsdt: totalSalesRows[0]?.totalSalesUsdt ?? 0,
      },
    };
  },
);
