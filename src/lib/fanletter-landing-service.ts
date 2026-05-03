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
  getContentPostsCollection,
  getCreatorProfilesCollection,
} from "@/lib/mongodb";

const FEATURED_VIDEO_LIMIT = 6;
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
  const scopedFilter: Filter<ContentPostDocument> = referralCode
    ? {
        ...baseFilter,
        authorReferralCode: referralCode,
      }
    : baseFilter;
  const scopedPosts = await postsCollection
    .find(scopedFilter)
    .sort({
      publishedAt: -1,
      createdAt: -1,
      contentId: -1,
    })
    .limit(FEATURED_VIDEO_LIMIT)
    .toArray();

  if (scopedPosts.length > 0 || !referralCode) {
    return scopedPosts;
  }

  return postsCollection
    .find(baseFilter)
    .sort({
      publishedAt: -1,
      createdAt: -1,
      contentId: -1,
    })
    .limit(FEATURED_VIDEO_LIMIT)
    .toArray();
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
