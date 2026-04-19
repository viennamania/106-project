import "server-only";

import { randomUUID } from "crypto";

import {
  CONTENT_FEED_PAGE_SIZE,
  CONTENT_NETWORK_LEVEL_LIMIT,
  normalizeContentLocale,
  serializeContentPost,
  serializeCreatorProfile,
  type ContentDetailResponse,
  type ContentFeedItemRecord,
  type ContentFeedResponse,
  type ContentPostCreateRequest,
  type ContentPostDocument,
  type ContentPostRecord,
  type ContentPostUpdateRequest,
  type CreatorProfileDocument,
  type CreatorProfileRecord,
  type CreatorProfileUpsertRequest,
  type CreatorStudioPostsResponse,
} from "@/lib/content";
import { getMemberRegistrationStatus } from "@/lib/member-service";
import { defaultLocale, type Locale } from "@/lib/i18n";
import {
  getContentPostsCollection,
  getContentPostSourceAttributionsCollection,
  getCreatorProfilesCollection,
  getMembersCollection,
} from "@/lib/mongodb";
import {
  normalizeEmail,
  normalizeReferralCode,
  serializeMember,
  type MemberDocument,
} from "@/lib/member";
import { emitNetworkContentPublishedNotifications } from "@/lib/notifications-service";

type NetworkAncestor = {
  level: number;
  member: MemberDocument;
  referralCode: string;
};

const PROFILE_DISPLAY_NAME_LIMIT = 40;
const PROFILE_INTRO_LIMIT = 220;
const CONTENT_TITLE_LIMIT = 88;
const CONTENT_SUMMARY_LIMIT = 180;
const CONTENT_BODY_LIMIT = 12_000;
const CONTENT_TAG_LIMIT = 6;
const CONTENT_TAG_LENGTH_LIMIT = 24;
const CONTENT_IMAGE_LIMIT = 10;
const CREATOR_STUDIO_DEFAULT_PAGE_SIZE = 24;
const CREATOR_STUDIO_MAX_PAGE_SIZE = 60;

type CreatorStudioPostsQueryOptions = {
  page?: number;
  pageSize?: number;
  query?: string | null;
  status?: "all" | "archived" | "draft" | "published" | null;
};

function trimToLength(value: string | null | undefined, limit: number) {
  return value?.trim().slice(0, limit) ?? "";
}

function normalizeOptionalText(value: string | null | undefined, limit: number) {
  const trimmed = trimToLength(value, limit);
  return trimmed || null;
}

function normalizeTags(tags?: string[]) {
  return (tags ?? [])
    .map((tag) => trimToLength(tag, CONTENT_TAG_LENGTH_LIMIT).toLowerCase())
    .filter(Boolean)
    .slice(0, CONTENT_TAG_LIMIT);
}

function normalizeContentImageUrls(urls?: string[]) {
  return Array.from(
    new Set(
      (urls ?? [])
        .map((url) => normalizeOptionalText(url, 500))
        .filter((url): url is string => Boolean(url)),
    ),
  ).slice(0, CONTENT_IMAGE_LIMIT);
}

function resolvePrimaryContentImageUrl(post: Pick<ContentPostDocument, "coverImageUrl" | "contentImageUrls">) {
  return post.coverImageUrl ?? post.contentImageUrls?.[0] ?? null;
}

function buildSummaryFromContent(options: {
  body: string;
  summary?: string | null;
  title?: string | null;
}) {
  const explicitSummary = trimToLength(options.summary, CONTENT_SUMMARY_LIMIT);

  if (explicitSummary) {
    return explicitSummary;
  }

  const bodySummary = options.body
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, CONTENT_SUMMARY_LIMIT);

  if (bodySummary) {
    return bodySummary;
  }

  return trimToLength(options.title, CONTENT_SUMMARY_LIMIT);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clampPageNumber(value: number | undefined) {
  if (!Number.isFinite(value) || !value || value < 1) {
    return 1;
  }

  return Math.max(1, Math.round(value));
}

function clampPageSize(value: number | undefined) {
  if (!Number.isFinite(value) || !value || value < 1) {
    return CREATOR_STUDIO_DEFAULT_PAGE_SIZE;
  }

  return Math.min(CREATOR_STUDIO_MAX_PAGE_SIZE, Math.max(1, Math.round(value)));
}

function buildCreatorStudioPostsFilter(
  memberEmail: string,
  options?: CreatorStudioPostsQueryOptions,
) {
  const filter: Record<string, unknown> = {
    authorEmail: memberEmail,
  };
  const normalizedStatus = options?.status?.trim().toLowerCase();
  const query = options?.query?.trim();

  if (
    normalizedStatus &&
    normalizedStatus !== "all" &&
    ["archived", "draft", "published"].includes(normalizedStatus)
  ) {
    filter.status = normalizedStatus;
  }

  if (query) {
    const safePattern = escapeRegex(query);
    filter.$or = [
      { title: { $regex: safePattern, $options: "i" } },
      { summary: { $regex: safePattern, $options: "i" } },
      { body: { $regex: safePattern, $options: "i" } },
    ];
  }

  return filter;
}

function inferSourceTitle(title: string | undefined, url: string) {
  const trimmedTitle = title?.trim();

  if (trimmedTitle) {
    return trimmedTitle;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getSponsorReferralCode(member: MemberDocument) {
  return normalizeReferralCode(
    member.sponsorReferralCode ?? member.referredByCode ?? null,
  );
}

function inferDisplayName(member: MemberDocument) {
  const brandedName = trimToLength(member.landingBranding?.brandName, PROFILE_DISPLAY_NAME_LIMIT);

  if (brandedName) {
    return brandedName;
  }

  const emailLocal = member.email.split("@")[0]?.trim();

  if (emailLocal) {
    return emailLocal.slice(0, PROFILE_DISPLAY_NAME_LIMIT);
  }

  return member.referralCode ?? "Creator";
}

function inferIntro(member: MemberDocument) {
  return trimToLength(member.landingBranding?.description, PROFILE_INTRO_LIMIT);
}

function createDefaultCreatorProfile(member: MemberDocument): CreatorProfileRecord {
  const now = member.updatedAt.toISOString();

  return {
    avatarImageUrl: member.landingBranding?.heroImageUrl ?? null,
    displayName: inferDisplayName(member),
    heroImageUrl: member.landingBranding?.heroImageUrl ?? null,
    intro: inferIntro(member),
    payoutWalletAddress: member.lastWalletAddress ?? null,
    referralCode: member.referralCode ?? "",
    status: "active",
    updatedAt: now,
  };
}

async function getCompletedMemberOrThrow(email: string) {
  const member = await getMemberRegistrationStatus(email);

  if (!member) {
    throw new Error("Member not found.");
  }

  if (member.status !== "completed") {
    throw new Error("Completed signup is required.");
  }

  return member;
}

async function resolveNetworkAncestors(member: MemberDocument) {
  const membersCollection = await getMembersCollection();
  const visited = new Set<string>();
  const ancestors: NetworkAncestor[] = [];
  let currentSponsorCode = getSponsorReferralCode(member);

  while (
    currentSponsorCode &&
    ancestors.length < CONTENT_NETWORK_LEVEL_LIMIT &&
    !visited.has(currentSponsorCode)
  ) {
    visited.add(currentSponsorCode);

    const ancestor = await membersCollection.findOne({
      referralCode: currentSponsorCode,
      status: "completed",
    });

    if (!ancestor) {
      break;
    }

    ancestors.push({
      level: ancestors.length + 1,
      member: ancestor,
      referralCode: currentSponsorCode,
    });

    currentSponsorCode = getSponsorReferralCode(ancestor);
  }

  return ancestors;
}

async function readStoredCreatorProfile(email: string) {
  const collection = await getCreatorProfilesCollection();
  return collection.findOne({ email: normalizeEmail(email) });
}

export async function getPublishedContentShareMetadata(contentId: string) {
  const postsCollection = await getContentPostsCollection();
  const post = await postsCollection.findOne({
    contentId,
    status: "published",
  });

  if (!post) {
    return null;
  }

  const storedProfile = await readStoredCreatorProfile(post.authorEmail);
  const membersCollection = await getMembersCollection();
  const authorMember = await membersCollection.findOne({
    email: post.authorEmail,
  });
  const authorDisplayName = storedProfile?.displayName?.trim()
    ? storedProfile.displayName.trim()
    : authorMember
      ? createDefaultCreatorProfile(authorMember).displayName
      : null;

  return {
    authorDisplayName,
    contentId: post.contentId,
    coverImageUrl: resolvePrimaryContentImageUrl(post),
    locale: normalizeContentLocale(post.locale),
    publishedAt: post.publishedAt ?? null,
    summary: post.summary,
    title: post.title,
    updatedAt: post.updatedAt,
  };
}

export async function getPublicContentPreview(contentId: string) {
  const postsCollection = await getContentPostsCollection();
  const post = await postsCollection.findOne({
    contentId,
    status: "published",
  });

  if (!post) {
    return null;
  }

  const storedProfile = await readStoredCreatorProfile(post.authorEmail);
  const sourceAttributionsCollection =
    await getContentPostSourceAttributionsCollection();
  const attribution = await sourceAttributionsCollection.findOne({ contentId });
  const membersCollection = await getMembersCollection();
  const authorMember = await membersCollection.findOne({ email: post.authorEmail });
  const authorProfile = storedProfile
    ? serializeCreatorProfile(storedProfile)
    : authorMember
      ? createDefaultCreatorProfile(authorMember)
      : null;
  const sources = (attribution?.sourceUrls ?? [])
    .map((url, index) => ({
      title: attribution?.sourceTitles?.[index],
      url: url.trim(),
    }))
    .filter((source) => Boolean(source.url))
    .map((source) => ({
      title: inferSourceTitle(source.title, source.url),
      url: source.url,
    }));
  const previewBody = `${post.body.slice(0, 1600).trim()}${post.body.length > 1600 ? "\n\n..." : ""}`;

  return {
    ...serializeContentPost(post),
    assets: [],
    authorProfile,
    body: previewBody,
    canAccess: false,
    entitlementSource: null,
    sources,
  };
}

async function emitPublishedContentNotifications(options: {
  author: MemberDocument;
  contentId: string;
  contentLocale: Locale | null | undefined;
  contentTitle: string;
  publishedAt?: Date | null;
}) {
  try {
    const storedProfile = await readStoredCreatorProfile(options.author.email);
    const authorDisplayName =
      storedProfile?.displayName?.trim() ||
      createDefaultCreatorProfile(options.author).displayName;

    await emitNetworkContentPublishedNotifications({
      authorDisplayName,
      authorEmail: options.author.email,
      authorReferralCode: options.author.referralCode ?? "",
      contentId: options.contentId,
      contentLocale: options.contentLocale,
      contentTitle: options.contentTitle,
      publishedAt: options.publishedAt,
    });
  } catch (error) {
    console.error("Failed to emit content published notifications.", error);
  }
}

export async function getCreatorProfileForMember(
  email: string,
): Promise<CreatorProfileRecord> {
  const member = await getCompletedMemberOrThrow(email);
  const stored = await readStoredCreatorProfile(member.email);

  if (!stored) {
    return createDefaultCreatorProfile(member);
  }

  return serializeCreatorProfile(stored);
}

export async function upsertCreatorProfileForMember(
  input: CreatorProfileUpsertRequest,
): Promise<CreatorProfileRecord> {
  const normalizedEmail = normalizeEmail(input.email);

  if (!normalizedEmail) {
    throw new Error("email is required.");
  }

  const member = await getCompletedMemberOrThrow(normalizedEmail);

  if (!member.referralCode) {
    throw new Error("Completed member is missing referral code.");
  }

  const displayName = trimToLength(input.displayName, PROFILE_DISPLAY_NAME_LIMIT);
  const intro = trimToLength(input.intro, PROFILE_INTRO_LIMIT);

  if (!displayName) {
    throw new Error("displayName is required.");
  }

  const collection = await getCreatorProfilesCollection();
  const now = new Date();

  const nextProfile: CreatorProfileDocument = {
    avatarImageUrl: normalizeOptionalText(input.avatarImageUrl, 500),
    createdAt: now,
    displayName,
    email: member.email,
    heroImageUrl: normalizeOptionalText(input.heroImageUrl, 500),
    intro,
    payoutWalletAddress: normalizeOptionalText(input.payoutWalletAddress, 120),
    referralCode: member.referralCode,
    status: "active",
    updatedAt: now,
  };

  const existing = await collection.findOne({ email: member.email });

  await collection.updateOne(
    { email: member.email },
    {
      $set: {
        ...nextProfile,
        createdAt: existing?.createdAt ?? now,
      },
    },
    { upsert: true },
  );

  const stored = await collection.findOne({ email: member.email });

  if (!stored) {
    throw new Error("Failed to save creator profile.");
  }

  return serializeCreatorProfile(stored);
}

function buildFeedItem({
  authorProfile,
  content,
  networkLevel,
}: {
  authorProfile: CreatorProfileRecord | null;
  content: ContentPostDocument;
  networkLevel: number | null;
}): ContentFeedItemRecord {
  return {
    ...serializeContentPost(content),
    authorProfile,
    canAccess: true,
    networkLevel,
    previewAssets: [],
  };
}

export async function getNetworkFeedForMember(
  email: string,
  locale: Locale,
): Promise<ContentFeedResponse> {
  const member = await getCompletedMemberOrThrow(email);
  const ancestors = await resolveNetworkAncestors(member);
  const levelByReferralCode = new Map<string, number>();
  const contentLocale = normalizeContentLocale(locale);

  for (const ancestor of ancestors) {
    levelByReferralCode.set(ancestor.referralCode, ancestor.level);
  }

  if (ancestors.length === 0) {
    return {
      items: [],
      member: serializeMember(member),
      nextCursor: null,
    };
  }

  const postsCollection = await getContentPostsCollection();
  const creatorProfilesCollection = await getCreatorProfilesCollection();
  const referralCodes = ancestors.map((ancestor) => ancestor.referralCode);
  const localeFilter =
    contentLocale === defaultLocale
      ? [
          { locale: contentLocale },
          { locale: { $exists: false } },
          { locale: null },
        ]
      : [{ locale: contentLocale }];
  const posts = await postsCollection
    .find({
      $or: localeFilter,
      authorReferralCode: { $in: referralCodes },
      priceType: "free",
      status: "published",
    })
    .sort({
      publishedAt: -1,
      createdAt: -1,
    })
    .limit(CONTENT_FEED_PAGE_SIZE)
    .toArray();

  const authorEmails = [...new Set(posts.map((post) => post.authorEmail))];
  const storedProfiles = authorEmails.length
    ? await creatorProfilesCollection.find({
        email: { $in: authorEmails },
      }).toArray()
    : [];
  const storedProfileByEmail = new Map(
    storedProfiles.map((profile) => [profile.email, profile]),
  );
  const ancestorByEmail = new Map(
    ancestors.map((ancestor) => [ancestor.member.email, ancestor.member]),
  );

  const items = posts
    .map((post) => {
      const storedProfile = storedProfileByEmail.get(post.authorEmail);
      const authorProfile = storedProfile
        ? serializeCreatorProfile(storedProfile)
        : ancestorByEmail.has(post.authorEmail)
          ? createDefaultCreatorProfile(ancestorByEmail.get(post.authorEmail)!)
          : null;

      return buildFeedItem({
        authorProfile,
        content: post,
        networkLevel: levelByReferralCode.get(post.authorReferralCode) ?? null,
      });
    })
    .sort((left, right) => {
      const leftLevel = left.networkLevel ?? CONTENT_NETWORK_LEVEL_LIMIT + 1;
      const rightLevel = right.networkLevel ?? CONTENT_NETWORK_LEVEL_LIMIT + 1;

      if (leftLevel !== rightLevel) {
        return leftLevel - rightLevel;
      }

      return (
        new Date(right.publishedAt ?? right.createdAt).getTime() -
        new Date(left.publishedAt ?? left.createdAt).getTime()
      );
    });

  return {
    items,
    member: serializeMember(member),
    nextCursor: null,
  };
}

export async function getCreatorStudioPostsForMember(
  email: string,
  options?: CreatorStudioPostsQueryOptions,
): Promise<CreatorStudioPostsResponse> {
  const member = await getCompletedMemberOrThrow(email);
  const postsCollection = await getContentPostsCollection();
  const summaryCounts = await postsCollection
    .aggregate<{ _id: string; count: number }>([
      {
        $match: {
          authorEmail: member.email,
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
  const summary = {
    all: 0,
    archived: 0,
    draft: 0,
    published: 0,
  };

  for (const item of summaryCounts) {
    if (item._id === "archived") {
      summary.archived = item.count;
    } else if (item._id === "draft") {
      summary.draft = item.count;
    } else if (item._id === "published") {
      summary.published = item.count;
    }

    summary.all += item.count;
  }

  const usingPagination = Boolean(
    options &&
      (options.page !== undefined ||
        options.pageSize !== undefined ||
        options.query?.trim() ||
        (options.status && options.status !== "all")),
  );
  const filter = buildCreatorStudioPostsFilter(member.email, options);
  const page = clampPageNumber(options?.page);
  const pageSize = clampPageSize(options?.pageSize);
  const totalCount = usingPagination
    ? await postsCollection.countDocuments(filter)
    : summary.all;
  const cursor = usingPagination ? (page - 1) * pageSize : 0;
  const posts = await postsCollection
    .find(filter)
    .sort({ updatedAt: -1, createdAt: -1 })
    .skip(cursor)
    .limit(usingPagination ? pageSize : Math.max(summary.all, 1))
    .toArray();
  const totalPages = usingPagination ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;

  return {
    member: serializeMember(member),
    pageInfo: {
      hasNextPage: usingPagination ? page < totalPages : false,
      hasPreviousPage: usingPagination ? page > 1 : false,
      page,
      pageSize: usingPagination ? pageSize : posts.length,
      totalCount,
      totalPages,
    },
    posts: posts.map((post) => serializeContentPost(post)),
    profile: await getCreatorProfileForMember(member.email),
    summary,
  };
}

export async function createContentPostForMember(
  input: ContentPostCreateRequest,
): Promise<ContentPostRecord> {
  const normalizedEmail = normalizeEmail(input.email);

  if (!normalizedEmail) {
    throw new Error("email is required.");
  }

  const member = await getCompletedMemberOrThrow(normalizedEmail);

  if (!member.referralCode) {
    throw new Error("Completed member is missing referral code.");
  }

  if (input.priceType !== "free") {
    throw new Error("Only free content is supported in this release.");
  }

  const title = trimToLength(input.title, CONTENT_TITLE_LIMIT);
  const body = trimToLength(input.body, CONTENT_BODY_LIMIT);
  const summary = buildSummaryFromContent({
    body,
    summary: input.summary,
    title: input.title,
  });

  if (!title) {
    throw new Error("title is required.");
  }

  if (!body) {
    throw new Error("body is required.");
  }

  const status = input.status === "published" ? "published" : "draft";
  const now = new Date();
  const post: ContentPostDocument = {
    authorEmail: member.email,
    authorReferralCode: member.referralCode,
    body,
    contentId: randomUUID(),
    contentImageUrls: normalizeContentImageUrls(input.contentImageUrls),
    coverImageUrl: normalizeOptionalText(input.coverImageUrl, 500),
    createdAt: now,
    locale: normalizeContentLocale(input.locale),
    previewAssetIds: (input.previewAssetIds ?? []).slice(0, 4),
    previewText: normalizeOptionalText(input.previewText, CONTENT_SUMMARY_LIMIT),
    priceType: "free",
    priceUsdt: null,
    publishedAt: status === "published" ? now : null,
    status,
    summary,
    tags: normalizeTags(input.tags),
    title,
    updatedAt: now,
  };

  const postsCollection = await getContentPostsCollection();
  await postsCollection.insertOne(post);

  if (post.status === "published") {
    await emitPublishedContentNotifications({
      author: member,
      contentId: post.contentId,
      contentLocale: post.locale,
      contentTitle: post.title,
      publishedAt: post.publishedAt,
    });
  }

  return serializeContentPost(post);
}

export async function updateContentPostForMember(
  input: ContentPostUpdateRequest,
): Promise<ContentPostRecord> {
  const normalizedEmail = normalizeEmail(input.email);

  if (!normalizedEmail) {
    throw new Error("email is required.");
  }

  const member = await getCompletedMemberOrThrow(normalizedEmail);
  const postsCollection = await getContentPostsCollection();
  const post = await postsCollection.findOne({ contentId: input.contentId });

  if (!post) {
    throw new Error("Content not found.");
  }

  if (post.authorEmail !== member.email) {
    throw new Error("Only the author can update this content.");
  }

  if (input.priceType && input.priceType !== "free") {
    throw new Error("Only free content is supported in this release.");
  }

  const nextStatus =
    input.status && ["draft", "published", "archived"].includes(input.status)
      ? input.status
      : post.status;
  const now = new Date();
  const nextPublishedAt =
    nextStatus === "published" ? post.publishedAt ?? now : post.publishedAt ?? null;
  const nextBody =
    input.body !== undefined
      ? trimToLength(input.body, CONTENT_BODY_LIMIT)
      : post.body;
  const nextTitle =
    input.title !== undefined
      ? trimToLength(input.title, CONTENT_TITLE_LIMIT)
      : post.title;
  const nextSummary =
    input.summary !== undefined
      ? buildSummaryFromContent({
          body: nextBody,
          summary: input.summary,
          title: nextTitle,
        })
      : post.summary;

  await postsCollection.updateOne(
    { contentId: post.contentId },
    {
      $set: {
        body: nextBody,
        contentImageUrls:
          input.contentImageUrls !== undefined
            ? normalizeContentImageUrls(input.contentImageUrls)
            : post.contentImageUrls ?? [],
        coverImageUrl:
          input.coverImageUrl !== undefined
            ? normalizeOptionalText(input.coverImageUrl, 500)
            : post.coverImageUrl ?? null,
        locale:
          input.locale !== undefined
            ? normalizeContentLocale(input.locale)
            : normalizeContentLocale(post.locale),
        previewAssetIds:
          input.previewAssetIds !== undefined
            ? input.previewAssetIds.slice(0, 4)
            : post.previewAssetIds,
        previewText:
          input.previewText !== undefined
            ? normalizeOptionalText(input.previewText, CONTENT_SUMMARY_LIMIT)
            : post.previewText ?? null,
        publishedAt: nextPublishedAt,
        status: nextStatus,
        summary: nextSummary,
        tags: input.tags !== undefined ? normalizeTags(input.tags) : post.tags,
        title: nextTitle,
        updatedAt: now,
      },
    },
  );

  const nextPost = await postsCollection.findOne({ contentId: post.contentId });

  if (!nextPost) {
    throw new Error("Content not found.");
  }

  if (post.status !== "published" && nextPost.status === "published") {
    await emitPublishedContentNotifications({
      author: member,
      contentId: nextPost.contentId,
      contentLocale: nextPost.locale,
      contentTitle: nextPost.title,
      publishedAt: nextPost.publishedAt,
    });
  }

  return serializeContentPost(nextPost);
}

export async function getContentDetailForMember(
  contentId: string,
  email: string,
): Promise<ContentDetailResponse> {
  const member = await getCompletedMemberOrThrow(email);
  const postsCollection = await getContentPostsCollection();
  const post = await postsCollection.findOne({ contentId });

  if (!post) {
    throw new Error("Content not found.");
  }

  const isAuthor = post.authorEmail === member.email;

  if (!isAuthor) {
    if (post.status !== "published") {
      throw new Error("Content not found.");
    }

    if (post.priceType !== "free") {
      throw new Error("This content requires a paid unlock.");
    }

    const ancestors = await resolveNetworkAncestors(member);
    const visibleReferralCodes = new Set(
      ancestors.map((ancestor) => ancestor.referralCode),
    );

    if (!visibleReferralCodes.has(post.authorReferralCode)) {
      throw new Error("Content is not available in your network.");
    }
  }

  const storedProfile = await readStoredCreatorProfile(post.authorEmail);
  const sourceAttributionsCollection =
    await getContentPostSourceAttributionsCollection();
  const attribution = await sourceAttributionsCollection.findOne({ contentId });
  const authorMember = isAuthor
    ? member
    : await (async () => {
        const membersCollection = await getMembersCollection();
        return membersCollection.findOne({ email: post.authorEmail });
      })();
  const authorProfile = storedProfile
    ? serializeCreatorProfile(storedProfile)
    : authorMember
      ? createDefaultCreatorProfile(authorMember)
      : null;
  const sources = (attribution?.sourceUrls ?? [])
    .map((url, index) => ({
      title: attribution?.sourceTitles?.[index],
      url: url.trim(),
    }))
    .filter((source) => Boolean(source.url))
    .map((source) => ({
      title: inferSourceTitle(source.title, source.url),
      url: source.url,
    }));

  return {
    content: {
      ...serializeContentPost(post),
      assets: [],
      authorProfile,
      body: post.body,
      canAccess: true,
      entitlementSource: "free",
      sources,
    },
    member: serializeMember(member),
  };
}
