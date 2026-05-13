import "server-only";

import type { Filter } from "mongodb";
import { unstable_cache } from "next/cache";

import {
  type ContentPostDocument,
  type CreatorProfileDocument,
  normalizeContentLocale,
} from "@/lib/content";
import { defaultLocale, type Locale } from "@/lib/i18n";
import {
  getContentOrdersCollection,
  getContentCommentsCollection,
  getContentPostsCollection,
  getCreatorProfilesCollection,
  getContentSocialActionsCollection,
} from "@/lib/mongodb";

const FEATURED_VIDEO_LIMIT = 6;
const FEATURED_PAID_VIDEO_LIMIT = 4;
const FEATURED_VIDEO_CANDIDATE_LIMIT = 48;
const RECENCY_DECAY_DAYS = 21;
const TEXT_LIMIT = 170;
const LANDING_TEXT_SENSITIVE_PATTERN =
  /(adult|big bust|bikini|create a|dramatic lighting|erotic|face shape|flirty|fluid motion|give a kiss|hands behind|hyper-realistic|intricate design|lingerie|lust|make me|motion blur|my hand|naked|nude|nsfw|porn|prompt|ring light|selfie|sex|sexy|soft oval face|standard iphone selfie|standing pose|textures|underwear|uploaded reference|with my hand|노출|비키니|섹시|성인|속옷|야한)/i;

export type FanletterFeaturedVideo = {
  authorAvatarImageUrl: string | null;
  authorName: string;
  authorReferralCode: string | null;
  contentId: string;
  coverImageUrl: string | null;
  priceLabel: "free" | "paid";
  priceUsdt: string | null;
  previewText: string | null;
  publishedAt: string | null;
  social: FanletterCandidateSignals;
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
  featuredPaidVideos: FanletterFeaturedVideo[];
  featuredVideos: FanletterFeaturedVideo[];
  liveStats: FanletterLiveStats;
};

export type FanletterCandidateSignals = {
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

function isReadableLandingText(value: string) {
  const compacted = value.replace(/\s+/g, "").trim();

  if (/[�Ÿÿ]/.test(value)) {
    return false;
  }

  if (/(.)\1{3,}/i.test(compacted)) {
    return false;
  }

  if (/[가-힣]/.test(compacted) && compacted.length >= 2) {
    return true;
  }

  if (compacted.length < 4) {
    return false;
  }

  const latinText = compacted.replace(/[^a-z]/gi, "");

  if (
    latinText.length >= Math.ceil(compacted.length * 0.72) &&
    !/[aeiou]/i.test(latinText)
  ) {
    return false;
  }

  return true;
}

function getSafeLandingText({
  fallback,
  limit,
  value,
}: {
  fallback: string;
  limit: number;
  value: string | null | undefined;
}) {
  const text = compactText(value, limit);

  if (
    !text ||
    !isReadableLandingText(text) ||
    LANDING_TEXT_SENSITIVE_PATTERN.test(text)
  ) {
    return fallback;
  }

  return text;
}

function getVideoUrl(post: ContentPostDocument) {
  return post.contentVideoUrls?.find((url) => typeof url === "string" && url);
}

function getAuthorName(
  post: ContentPostDocument,
  profile: CreatorProfileDocument | undefined,
) {
  return (
    compactText(profile?.characterPersona?.name, 36) ||
    compactText(profile?.displayName, 36) ||
    post.authorEmail.split("@")[0]
  );
}

function createEmptyCandidateSignals(): FanletterCandidateSignals {
  return {
    commentCount: 0,
    likeCount: 0,
    paidBuyerCount: 0,
    saveCount: 0,
  };
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
  signals,
}: {
  post: ContentPostDocument;
  signals: FanletterCandidateSignals;
}) {
  const ageDays = Math.max(
    0,
    (Date.now() - getPostPublishedTime(post)) / (1000 * 60 * 60 * 24),
  );
  const recencyScore = 3 * Math.exp(-ageDays / RECENCY_DECAY_DAYS);
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
  limit = FEATURED_VIDEO_LIMIT,
  posts,
  signalsByContentId,
}: {
  limit?: number;
  posts: ContentPostDocument[];
  signalsByContentId: Map<string, FanletterCandidateSignals>;
}) {
  const remaining = posts.map((post) => ({
    post,
    score: scoreFeaturedVideoCandidate({
      post,
      signals:
        signalsByContentId.get(post.contentId) ?? createEmptyCandidateSignals(),
    }),
  }));
  const selected: ContentPostDocument[] = [];
  const selectedCountByAuthor = new Map<string, number>();

  while (remaining.length > 0 && selected.length < limit) {
    const weightedCandidates = remaining.map((candidate) => {
      const selectedAuthorCount =
        selectedCountByAuthor.get(candidate.post.authorEmail) ?? 0;
      const diversityPenalty =
        1 + Math.max(0, selectedAuthorCount - 1) * 0.8;

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
  limit,
  locale,
  priceType,
}: {
  limit?: number;
  locale: Locale;
  priceType: "free" | "paid";
}) {
  const postsCollection = await getContentPostsCollection();
  const baseFilter: Filter<ContentPostDocument> = {
    ...getPublishedContentLocaleFilter(locale),
    "contentVideoUrls.0": { $exists: true },
    priceType,
    status: "published",
  };
  const sort = {
    publishedAt: -1,
    createdAt: -1,
    contentId: -1,
  } as const;
  const candidates = await postsCollection
    .find(baseFilter)
    .sort(sort)
    .limit(FEATURED_VIDEO_CANDIDATE_LIMIT)
    .toArray();
  const signalsByContentId = await getCandidateSignals(candidates);

  return pickWeightedFeaturedPosts({
    limit,
    posts: candidates,
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

function toFeaturedVideo({
  locale,
  post,
  profile,
  signals,
}: {
  locale: Locale;
  post: ContentPostDocument;
  profile: CreatorProfileDocument | undefined;
  signals?: FanletterCandidateSignals | null;
}): FanletterFeaturedVideo | null {
  const videoUrl = getVideoUrl(post);

  if (!videoUrl) {
    return null;
  }

  const authorName = getAuthorName(post, profile);
  const paidTitleFallback =
    locale === "ko"
      ? `${authorName} 팬 전용 브이로그`
      : `${authorName} fan-only vlog`;
  const publicTitleFallback =
    locale === "ko"
      ? `${authorName} 공개 브이로그`
      : `${authorName} public vlog`;
  const paidPreviewFallback =
    locale === "ko"
      ? "결제 후 전체 영상과 상세 본문이 열리는 팬 전용 브이로그입니다."
      : "A fan-only vlog where the full video and detail body unlock after payment.";
  const publicPreviewFallback =
    locale === "ko"
      ? "캐릭터 분위기를 먼저 확인할 수 있는 무료 공개 브이로그입니다."
      : "A free public vlog that previews the character's vibe.";
  const title =
    post.priceType === "paid"
      ? getSafeLandingText({
          fallback: paidTitleFallback,
          limit: 92,
          value: post.title,
        })
      : getSafeLandingText({
          fallback: publicTitleFallback,
          limit: 92,
          value: post.title,
        });
  const previewText =
    post.priceType === "paid"
      ? getSafeLandingText({
          fallback: paidPreviewFallback,
          limit: 120,
          value: post.previewText || post.summary,
        })
      : post.previewText
        ? getSafeLandingText({
            fallback: publicPreviewFallback,
            limit: 120,
            value: post.previewText,
          })
        : null;
  const summary =
    post.priceType === "paid"
      ? previewText || paidPreviewFallback
      : getSafeLandingText({
          fallback: publicPreviewFallback,
          limit: TEXT_LIMIT,
          value: post.summary || post.previewText || post.body,
        });

  return {
    authorAvatarImageUrl: profile?.avatarImageUrl ?? null,
    authorName,
    authorReferralCode: post.authorReferralCode || null,
    contentId: post.contentId,
    coverImageUrl:
      post.coverImageUrl ?? post.contentImageUrls?.[0] ?? null,
    priceLabel: post.priceType,
    priceUsdt: post.priceUsdt ?? null,
    previewText,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    social: signals ?? createEmptyCandidateSignals(),
    summary,
    title,
    videoUrl,
  };
}

export const getFanletterLandingData = unstable_cache(
  async (locale: Locale): Promise<FanletterLandingData> => {
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
      featuredPaidPosts,
    ] = await Promise.all([
      postsCollection.countDocuments(publishedContentFilter),
      postsCollection.countDocuments(publicVideoFilter),
      profilesCollection.countDocuments({ status: "active" }),
      ordersCollection.countDocuments({ status: "confirmed" }),
      ordersCollection
        .aggregate<{ _id: null; totalSalesUsdt: number }>(totalSalesPipeline)
        .toArray(),
      getFeaturedVideoPosts({ locale, priceType: "free" }),
      getFeaturedVideoPosts({
        limit: FEATURED_PAID_VIDEO_LIMIT,
        locale,
        priceType: "paid",
      }),
    ]);
    const [profileByEmail, paidSignalsByContentId] = await Promise.all([
      getProfileByEmail([...featuredPosts, ...featuredPaidPosts]),
      getCandidateSignals(featuredPaidPosts),
    ]);

    return {
      featuredPaidVideos: featuredPaidPosts.flatMap((post) => {
        const video = toFeaturedVideo({
          locale,
          post,
          profile: profileByEmail.get(post.authorEmail),
          signals: paidSignalsByContentId.get(post.contentId),
        });

        return video ? [video] : [];
      }),
      featuredVideos: featuredPosts.flatMap((post) => {
        const video = toFeaturedVideo({
          locale,
          post,
          profile: profileByEmail.get(post.authorEmail),
        });

        return video ? [video] : [];
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
  ["fanletter-landing-data-v6"],
  {
    revalidate: 300,
    tags: ["fanletter-landing-data"],
  },
);
