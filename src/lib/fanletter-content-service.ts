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
  createEmptyContentSocialSummary,
  normalizeContentLocale,
} from "@/lib/content";
import { getContentSocialSummaryForViewer } from "@/lib/content-service";
import { defaultLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";
import {
  getContentPostsCollection,
  getCreatorProfilesCollection,
} from "@/lib/mongodb";

const FANLETTER_PUBLIC_CONTENT_LIMIT = 24;
const SUMMARY_LIMIT = 180;
const TITLE_LIMIT = 96;

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
  body: string;
  canPubliclyAccess: boolean;
  contentImageUrls: string[];
  contentVideoUrls: string[];
  tags: string[];
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
  items: FanletterPublicContentItem[];
  referralCode: string | null;
};

export type FanletterCreatorPageData = {
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

function getPublicContentFilter({
  locale,
  referralCode,
}: {
  locale: Locale;
  referralCode?: string | null;
}): Filter<ContentPostDocument> {
  return {
    ...getPublishedContentLocaleFilter(locale),
    ...(referralCode ? { authorReferralCode: referralCode } : {}),
    "contentVideoUrls.0": { $exists: true },
    priceType: "free",
    status: "published",
  };
}

export async function getFanletterPublicContentItems({
  locale,
  limit = FANLETTER_PUBLIC_CONTENT_LIMIT,
  referralCode,
}: {
  locale: Locale;
  limit?: number;
  referralCode?: string | null;
}) {
  const postsCollection = await getContentPostsCollection();
  const normalizedReferralCode = normalizeReferralCode(referralCode);
  const posts = await postsCollection
    .find(
      getPublicContentFilter({
        locale,
        referralCode: normalizedReferralCode,
      }),
    )
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
  ): Promise<FanletterFeedPageData> => {
    const referralCode = normalizeReferralCode(referralCodeInput);
    const items = await getFanletterPublicContentItems({ locale });

    return {
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
    const [profile, social] = await Promise.all([
      profilesCollection.findOne({ email: post.authorEmail }),
      getContentSocialSummaryForViewer(post.contentId, null).catch(() =>
        createEmptyContentSocialSummary(),
      ),
    ]);
    const canPubliclyAccess = post.priceType === "free";
    const authorReferralCode = normalizeReferralCode(
      profile?.referralCode ?? post.authorReferralCode,
    );
    const authorContentFilter = authorReferralCode
      ? getPublicContentFilter({ locale, referralCode: authorReferralCode })
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

    return {
      ...toPublicContentItem({ post, profile, social }),
      authorCharacter: getPublicCharacter({ posts: authorPosts, profile }),
      authorPublicContentCount,
      body: canPubliclyAccess
        ? post.body
        : post.previewText?.trim() || post.summary,
      canPubliclyAccess,
      contentImageUrls: canPubliclyAccess ? post.contentImageUrls ?? [] : [],
      contentVideoUrls: canPubliclyAccess ? post.contentVideoUrls ?? [] : [],
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
    const [storedProfile, posts, publicContentCount] = await Promise.all([
      profilesCollection.findOne({ referralCode }),
      postsCollection
        .find(getPublicContentFilter({ locale, referralCode }))
        .sort({
          publishedAt: -1,
          createdAt: -1,
          contentId: -1,
        })
        .limit(FANLETTER_PUBLIC_CONTENT_LIMIT)
        .toArray(),
      postsCollection.countDocuments(getPublicContentFilter({ locale, referralCode })),
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
