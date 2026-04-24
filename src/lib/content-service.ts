import "server-only";

import { randomUUID } from "crypto";
import { cache } from "react";
import type { Filter } from "mongodb";

import {
  CONTENT_FEED_PAGE_SIZE,
  CONTENT_NETWORK_LEVEL_LIMIT,
  CONTENT_PAID_USDT_AMOUNT,
  CONTENT_PAID_USDT_AMOUNT_WEI,
  createEmptyContentSocialSummary,
  normalizeContentLocale,
  serializeContentOrder,
  serializeContentSaleOrder,
  serializeContentPost,
  serializeCreatorProfile,
  type ContentCommentCreateResponse,
  type ContentCommentDocument,
  type ContentCommentRecord,
  type ContentCommentsResponse,
  type ContentDetailResponse,
  type ContentEntitlementDocument,
  type ContentFeedItemRecord,
  type ContentFeedResponse,
  type ContentOrderCreateRequest,
  type ContentOrderCreateResponse,
  type ContentOrderDocument,
  type ContentOrderVerifyRequest,
  type ContentOrderVerifyResponse,
  type ContentPostCreateRequest,
  type ContentPostDocument,
  type ContentPostRecord,
  type ContentPostUpdateRequest,
  type ContentPriceType,
  type ContentSalesDashboardResponse,
  type ContentSellerWalletBalanceRecord,
  type ContentSellerWithdrawalRequest,
  type ContentSellerWithdrawalResponse,
  type ContentSocialResponse,
  type ContentSocialSummaryRecord,
  type CreatorProfileDocument,
  type CreatorProfileRecord,
  type CreatorProfileUpsertRequest,
  type CreatorStudioPostsResponse,
} from "@/lib/content";
import { getMemberRegistrationStatus } from "@/lib/member-service";
import { defaultLocale, type Locale } from "@/lib/i18n";
import {
  getContentCommentsCollection,
  getContentEntitlementsCollection,
  getContentOrdersCollection,
  getContentPostsCollection,
  getContentPostSourceAttributionsCollection,
  getContentSocialActionsCollection,
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
import { BSC_USDT_ADDRESS, smartWalletChain } from "@/lib/thirdweb";
import {
  createOrGetThirdwebSellerWallet,
  hasThirdwebSecretKey,
  serverThirdwebClient,
} from "@/lib/thirdweb-server";
import { ERC20_TRANSFER_SIG_HASH, normalizeAddress } from "@/lib/thirdweb-webhooks";
import { Engine, getAddress, getContract, isAddress } from "thirdweb";
import { transfer } from "thirdweb/extensions/erc20";
import {
  eth_getBlockByNumber,
  eth_getTransactionReceipt,
  getRpcClient,
} from "thirdweb/rpc";
import { toTokens } from "thirdweb/utils";
import { getWalletBalance } from "thirdweb/wallets";

type NetworkAncestor = {
  level: number;
  member: MemberDocument;
  referralCode: string;
};

type NetworkFeedCursor = {
  contentId: string;
  createdAt: string;
  publishedAt: string;
};

type NetworkFeedQueryOptions = {
  cursor?: string | null;
  viewerEmail?: string | null;
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
const CONTENT_COMMENT_BODY_LIMIT = 500;
const CONTENT_COMMENTS_PAGE_SIZE = 30;
const CONTENT_ORDER_PAYMENT_WINDOW_MS = 1000 * 60 * 30;
const CONTENT_SALES_HISTORY_LIMIT = 50;
const CONTENT_SELLER_WITHDRAW_TIMEOUT_SECONDS = 20;
const contentUsdtContract = getContract({
  address: BSC_USDT_ADDRESS,
  chain: smartWalletChain,
  client: serverThirdwebClient,
});

function encodeNetworkFeedCursor(post: ContentPostDocument) {
  const cursor: NetworkFeedCursor = {
    contentId: post.contentId,
    createdAt: post.createdAt.toISOString(),
    publishedAt: (post.publishedAt ?? post.createdAt).toISOString(),
  };

  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeNetworkFeedCursor(cursor?: string | null) {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as Partial<NetworkFeedCursor>;
    const publishedAt = parsed.publishedAt
      ? new Date(parsed.publishedAt)
      : null;
    const createdAt = parsed.createdAt ? new Date(parsed.createdAt) : null;

    if (
      !parsed.contentId ||
      !publishedAt ||
      !createdAt ||
      Number.isNaN(publishedAt.getTime()) ||
      Number.isNaN(createdAt.getTime())
    ) {
      return null;
    }

    return {
      contentId: parsed.contentId,
      createdAt,
      publishedAt,
    };
  } catch {
    return null;
  }
}

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

function normalizePriceType(priceType?: ContentPriceType | null) {
  return priceType === "paid" ? "paid" : "free";
}

function resolveContentPriceUsdt(priceType: ContentPriceType) {
  return priceType === "paid" ? CONTENT_PAID_USDT_AMOUNT : null;
}

function formatUsdtAmountFromWei(value: bigint) {
  return toTokens(value, 18).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function serializeSellerWalletBalance(balance: {
  displayValue?: string;
  symbol?: string;
  value: bigint;
}): ContentSellerWalletBalanceRecord {
  return {
    amountUsdt: balance.displayValue || formatUsdtAmountFromWei(balance.value),
    amountWei: balance.value.toString(),
    symbol: balance.symbol || "USDT",
  };
}

function addDecimalStrings(left: string, right: string) {
  const leftWei = BigInt(Math.round(Number(left) * 1_000_000));
  const rightWei = BigInt(Math.round(Number(right) * 1_000_000));

  return (Number(leftWei + rightWei) / 1_000_000)
    .toFixed(6)
    .replace(/\.?0+$/, "");
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
    payoutWalletAddress: null,
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

function buildSellerWalletIdentifier(member: MemberDocument) {
  return `content-seller:${member.referralCode ?? member.email}`;
}

export async function ensureCreatorPaidWalletForMember(
  email: string,
): Promise<CreatorProfileRecord> {
  const member = await getCompletedMemberOrThrow(email);

  if (!member.referralCode) {
    throw new Error("Completed member is missing referral code.");
  }

  const collection = await getCreatorProfilesCollection();
  const stored = await collection.findOne({ email: member.email });
  const walletAddress = await createOrGetThirdwebSellerWallet(
    buildSellerWalletIdentifier(member),
  );
  const now = new Date();
  const defaultProfile = createDefaultCreatorProfile(member);

  await collection.updateOne(
    { email: member.email },
    {
      $set: {
        avatarImageUrl:
          stored?.avatarImageUrl ?? defaultProfile.avatarImageUrl ?? null,
        displayName:
          stored?.displayName?.trim() || defaultProfile.displayName,
        email: member.email,
        heroImageUrl: stored?.heroImageUrl ?? defaultProfile.heroImageUrl ?? null,
        intro: stored?.intro ?? defaultProfile.intro,
        payoutWalletAddress: walletAddress,
        referralCode: member.referralCode,
        status: stored?.status ?? "active",
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  const nextProfile = await collection.findOne({ email: member.email });

  if (!nextProfile) {
    throw new Error("Failed to save creator profile.");
  }

  return serializeCreatorProfile(nextProfile);
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

async function resolveNetworkAncestorsFromReferralCode(referralCode: string) {
  const membersCollection = await getMembersCollection();
  const normalizedReferralCode = normalizeReferralCode(referralCode);

  if (!normalizedReferralCode) {
    return [];
  }

  const visited = new Set<string>();
  const ancestors: NetworkAncestor[] = [];
  let currentSponsorCode: string | null = normalizedReferralCode;

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

async function loadNetworkFeedItemsFromAncestors(
  ancestors: NetworkAncestor[],
  locale: Locale,
  options?: NetworkFeedQueryOptions,
) {
  const levelByReferralCode = new Map<string, number>();
  const contentLocale = normalizeContentLocale(locale);

  for (const ancestor of ancestors) {
    levelByReferralCode.set(ancestor.referralCode, ancestor.level);
  }

  if (ancestors.length === 0) {
    return {
      items: [],
      nextCursor: null,
    };
  }

  const postsCollection = await getContentPostsCollection();
  const creatorProfilesCollection = await getCreatorProfilesCollection();
  const referralCodes = ancestors.map((ancestor) => ancestor.referralCode);
  const hiddenContentIds = await getHiddenContentIdsForViewer(options?.viewerEmail);
  const localeFilter =
    contentLocale === defaultLocale
      ? [
          { locale: contentLocale },
          { locale: { $exists: false } },
          { locale: null },
        ]
      : [{ locale: contentLocale }];
  const cursor = decodeNetworkFeedCursor(options?.cursor);
  const baseFilter: Filter<ContentPostDocument> = {
    $or: localeFilter,
    authorReferralCode: { $in: referralCodes },
    status: "published",
    ...(hiddenContentIds.length > 0
      ? { contentId: { $nin: hiddenContentIds } }
      : {}),
  };
  const filter: Filter<ContentPostDocument> = cursor
    ? {
        $and: [
          baseFilter,
          {
            $or: [
              { publishedAt: { $lt: cursor.publishedAt } },
              {
                publishedAt: cursor.publishedAt,
                createdAt: { $lt: cursor.createdAt },
              },
              {
                publishedAt: cursor.publishedAt,
                createdAt: cursor.createdAt,
                contentId: { $lt: cursor.contentId },
              },
            ],
          },
        ],
      }
    : baseFilter;
  const posts = await postsCollection
    .find(filter)
    .sort({
      publishedAt: -1,
      createdAt: -1,
      contentId: -1,
    })
    .limit(CONTENT_FEED_PAGE_SIZE + 1)
    .toArray();
  const hasNextPage = posts.length > CONTENT_FEED_PAGE_SIZE;
  const pagePosts = hasNextPage ? posts.slice(0, CONTENT_FEED_PAGE_SIZE) : posts;

  const authorEmails = [...new Set(pagePosts.map((post) => post.authorEmail))];
  const storedProfiles = authorEmails.length
    ? await creatorProfilesCollection
        .find({
          email: { $in: authorEmails },
        })
        .toArray()
    : [];
  const storedProfileByEmail = new Map(
    storedProfiles.map((profile) => [profile.email, profile]),
  );
  const ancestorByEmail = new Map(
    ancestors.map((ancestor) => [ancestor.member.email, ancestor.member]),
  );
  const socialByContentId = await getContentSocialSummaries(
    pagePosts.map((post) => post.contentId),
    options?.viewerEmail,
  );
  const purchasedContentIds = await getPurchasedContentIdsForViewer(
    pagePosts
      .filter((post) => post.priceType === "paid")
      .map((post) => post.contentId),
    options?.viewerEmail,
  );

  const items = pagePosts.map((post) => {
      const storedProfile = storedProfileByEmail.get(post.authorEmail);
      const authorProfile = storedProfile
        ? serializeCreatorProfile(storedProfile)
        : ancestorByEmail.has(post.authorEmail)
          ? createDefaultCreatorProfile(ancestorByEmail.get(post.authorEmail)!)
          : null;

      return buildFeedItem({
        authorProfile,
        canAccess:
          post.priceType === "free" ||
          post.authorEmail === options?.viewerEmail ||
          purchasedContentIds.has(post.contentId),
        content: post,
        networkLevel: levelByReferralCode.get(post.authorReferralCode) ?? null,
        social: socialByContentId.get(post.contentId),
      });
    });

  return {
    items,
    nextCursor:
      hasNextPage && pagePosts.length > 0
        ? encodeNetworkFeedCursor(pagePosts[pagePosts.length - 1])
        : null,
  };
}

async function readStoredCreatorProfile(email: string) {
  const collection = await getCreatorProfilesCollection();
  return collection.findOne({ email: normalizeEmail(email) });
}

export const getPublishedContentShareMetadata = cache(
async function getPublishedContentShareMetadata(contentId: string) {
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
});

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
  canAccess,
  content,
  networkLevel,
  social,
}: {
  authorProfile: CreatorProfileRecord | null;
  canAccess?: boolean;
  content: ContentPostDocument;
  networkLevel: number | null;
  social?: ContentSocialSummaryRecord;
}): ContentFeedItemRecord {
  return {
    ...serializeContentPost(content),
    authorProfile,
    canAccess: canAccess ?? content.priceType === "free",
    networkLevel,
    previewAssets: [],
    social: social ?? createEmptyContentSocialSummary(),
  };
}

function normalizeContentSocialAction(action: string | null | undefined) {
  return action === "like" || action === "save" || action === "hide"
    ? action
    : null;
}

function socialActionToField(action: "hide" | "like" | "save") {
  if (action === "like") {
    return "liked";
  }

  if (action === "save") {
    return "saved";
  }

  return "hidden";
}

async function ensurePublishedContentExists(contentId: string) {
  const postsCollection = await getContentPostsCollection();
  const post = await postsCollection.findOne({
    contentId,
    status: "published",
  });

  if (!post) {
    throw new Error("Content not found.");
  }

  return post;
}

async function getHiddenContentIdsForViewer(viewerEmail?: string | null) {
  const normalizedViewerEmail = viewerEmail ? normalizeEmail(viewerEmail) : "";

  if (!normalizedViewerEmail) {
    return [];
  }

  const socialActionsCollection = await getContentSocialActionsCollection();
  const hiddenActions = await socialActionsCollection
    .find(
      {
        hidden: true,
        memberEmail: normalizedViewerEmail,
      },
      {
        projection: {
          contentId: 1,
        },
      },
    )
    .toArray();

  return hiddenActions.map((action) => action.contentId);
}

async function getPurchasedContentIdsForViewer(
  contentIds: string[],
  viewerEmail?: string | null,
) {
  const normalizedViewerEmail = viewerEmail ? normalizeEmail(viewerEmail) : "";

  if (!normalizedViewerEmail || contentIds.length === 0) {
    return new Set<string>();
  }

  const entitlementsCollection = await getContentEntitlementsCollection();
  const entitlements = await entitlementsCollection
    .find(
      {
        contentId: { $in: contentIds },
        memberEmail: normalizedViewerEmail,
      },
      {
        projection: {
          contentId: 1,
        },
      },
    )
    .toArray();

  return new Set(entitlements.map((entitlement) => entitlement.contentId));
}

async function getContentEntitlementForMember(
  contentId: string,
  memberEmail: string,
) {
  const entitlementsCollection = await getContentEntitlementsCollection();

  return entitlementsCollection.findOne({
    contentId,
    memberEmail: normalizeEmail(memberEmail),
  });
}

async function getContentSocialSummaries(
  contentIds: string[],
  viewerEmail?: string | null,
) {
  const uniqueContentIds = [...new Set(contentIds.filter(Boolean))];
  const summaries = new Map<string, ContentSocialSummaryRecord>();

  for (const contentId of uniqueContentIds) {
    summaries.set(contentId, createEmptyContentSocialSummary());
  }

  if (uniqueContentIds.length === 0) {
    return summaries;
  }

  const normalizedViewerEmail = viewerEmail ? normalizeEmail(viewerEmail) : "";
  const socialActionsCollection = await getContentSocialActionsCollection();
  const commentsCollection = await getContentCommentsCollection();
  const [actionCounts, commentCounts, viewerActions] = await Promise.all([
    socialActionsCollection
      .aggregate<{
        _id: string;
        likeCount: number;
        saveCount: number;
      }>([
        {
          $match: {
            contentId: { $in: uniqueContentIds },
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
            contentId: { $in: uniqueContentIds },
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
    normalizedViewerEmail
      ? socialActionsCollection
          .find({
            contentId: { $in: uniqueContentIds },
            memberEmail: normalizedViewerEmail,
          })
          .toArray()
      : Promise.resolve([]),
  ]);

  for (const count of actionCounts) {
    const current =
      summaries.get(count._id) ?? createEmptyContentSocialSummary();
    summaries.set(count._id, {
      ...current,
      likeCount: count.likeCount,
      saveCount: count.saveCount,
    });
  }

  for (const count of commentCounts) {
    const current =
      summaries.get(count._id) ?? createEmptyContentSocialSummary();
    summaries.set(count._id, {
      ...current,
      commentCount: count.count,
    });
  }

  for (const action of viewerActions) {
    const current =
      summaries.get(action.contentId) ?? createEmptyContentSocialSummary();
    summaries.set(action.contentId, {
      ...current,
      hiddenByViewer: action.hidden,
      likedByViewer: action.liked,
      savedByViewer: action.saved,
    });
  }

  return summaries;
}

export async function getContentSocialSummaryForViewer(
  contentId: string,
  viewerEmail?: string | null,
): Promise<ContentSocialSummaryRecord> {
  await ensurePublishedContentExists(contentId);

  const summaries = await getContentSocialSummaries([contentId], viewerEmail);

  return summaries.get(contentId) ?? createEmptyContentSocialSummary();
}

export async function updateContentSocialActionForMember({
  action,
  contentId,
  email,
  value,
}: {
  action: string;
  contentId: string;
  email: string;
  value: boolean;
}): Promise<ContentSocialResponse> {
  const normalizedAction = normalizeContentSocialAction(action);

  if (!normalizedAction) {
    throw new Error("Unsupported social action.");
  }

  await ensurePublishedContentExists(contentId);

  const member = await getCompletedMemberOrThrow(email);
  const field = socialActionToField(normalizedAction);
  const now = new Date();
  const setOnInsert: Record<string, unknown> = {
    contentId,
    createdAt: now,
    memberEmail: member.email,
  };

  if (field !== "liked") {
    setOnInsert.liked = false;
  }

  if (field !== "saved") {
    setOnInsert.saved = false;
  }

  if (field !== "hidden") {
    setOnInsert.hidden = false;
  }

  const socialActionsCollection = await getContentSocialActionsCollection();
  await socialActionsCollection.updateOne(
    {
      contentId,
      memberEmail: member.email,
    },
    {
      $set: {
        [field]: value,
        updatedAt: now,
      },
      $setOnInsert: setOnInsert,
    },
    {
      upsert: true,
    },
  );

  return {
    social: await getContentSocialSummaryForViewer(contentId, member.email),
  };
}

function normalizeCommentBody(body: string | null | undefined) {
  return trimToLength(body, CONTENT_COMMENT_BODY_LIMIT);
}

async function getCommentAuthorProfiles(memberEmails: string[]) {
  const uniqueEmails = [...new Set(memberEmails.filter(Boolean))];

  if (uniqueEmails.length === 0) {
    return new Map<string, CreatorProfileRecord>();
  }

  const [profiles, members] = await Promise.all([
    (await getCreatorProfilesCollection())
      .find({
        email: { $in: uniqueEmails },
      })
      .toArray(),
    (await getMembersCollection())
      .find({
        email: { $in: uniqueEmails },
      })
      .toArray(),
  ]);
  const profileByEmail = new Map<string, CreatorProfileRecord>();

  for (const profile of profiles) {
    profileByEmail.set(profile.email, serializeCreatorProfile(profile));
  }

  for (const member of members) {
    if (!profileByEmail.has(member.email)) {
      profileByEmail.set(member.email, createDefaultCreatorProfile(member));
    }
  }

  return profileByEmail;
}

function serializeContentComment(
  comment: ContentCommentDocument,
  profileByEmail: Map<string, CreatorProfileRecord>,
): ContentCommentRecord {
  const profile = profileByEmail.get(comment.memberEmail);

  return {
    authorAvatarImageUrl: profile?.avatarImageUrl ?? null,
    authorDisplayName:
      profile?.displayName ??
      comment.memberEmail.split("@")[0] ??
      comment.memberEmail,
    body: comment.body,
    commentId: comment.commentId,
    contentId: comment.contentId,
    createdAt: comment.createdAt.toISOString(),
    memberEmail: comment.memberEmail,
  };
}

export async function getContentCommentsForContent(
  contentId: string,
  viewerEmail?: string | null,
): Promise<ContentCommentsResponse> {
  await ensurePublishedContentExists(contentId);

  const commentsCollection = await getContentCommentsCollection();
  const comments = await commentsCollection
    .find({ contentId })
    .sort({ createdAt: -1 })
    .limit(CONTENT_COMMENTS_PAGE_SIZE)
    .toArray();
  const profileByEmail = await getCommentAuthorProfiles(
    comments.map((comment) => comment.memberEmail),
  );

  return {
    comments: comments.map((comment) =>
      serializeContentComment(comment, profileByEmail),
    ),
    social: await getContentSocialSummaryForViewer(contentId, viewerEmail),
  };
}

export async function addContentCommentForMember({
  body,
  contentId,
  email,
}: {
  body: string;
  contentId: string;
  email: string;
}): Promise<ContentCommentCreateResponse> {
  await ensurePublishedContentExists(contentId);

  const member = await getCompletedMemberOrThrow(email);
  const normalizedBody = normalizeCommentBody(body);

  if (!normalizedBody) {
    throw new Error("Comment body is required.");
  }

  const now = new Date();
  const comment: ContentCommentDocument = {
    body: normalizedBody,
    commentId: randomUUID(),
    contentId,
    createdAt: now,
    memberEmail: member.email,
    updatedAt: now,
  };

  const commentsCollection = await getContentCommentsCollection();
  await commentsCollection.insertOne(comment);

  const profileByEmail = await getCommentAuthorProfiles([member.email]);

  return {
    comment: serializeContentComment(comment, profileByEmail),
    social: await getContentSocialSummaryForViewer(contentId, member.email),
  };
}

export async function getNetworkFeedForMember(
  email: string,
  locale: Locale,
  options?: NetworkFeedQueryOptions,
): Promise<ContentFeedResponse> {
  const member = await getCompletedMemberOrThrow(email);
  const ancestors = await resolveNetworkAncestors(member);
  const feed = await loadNetworkFeedItemsFromAncestors(ancestors, locale, {
    ...options,
    viewerEmail: member.email,
  });

  return {
    items: feed.items,
    member: serializeMember(member),
    nextCursor: feed.nextCursor,
  };
}

export async function getPublicNetworkFeedForReferralCode(
  referralCode: string,
  locale: Locale,
  options?: NetworkFeedQueryOptions,
) {
  const ancestors = await resolveNetworkAncestorsFromReferralCode(referralCode);
  const feed = await loadNetworkFeedItemsFromAncestors(ancestors, locale, options);

  return {
    items: feed.items,
    nextCursor: feed.nextCursor,
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
  const priceType = normalizePriceType(input.priceType);

  if (priceType === "paid") {
    await ensureCreatorPaidWalletForMember(member.email);
  }

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
    priceType,
    priceUsdt: resolveContentPriceUsdt(priceType),
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

  const nextStatus =
    input.status && ["draft", "published", "archived"].includes(input.status)
      ? input.status
      : post.status;
  const nextPriceType =
    input.priceType !== undefined
      ? normalizePriceType(input.priceType)
      : post.priceType;

  if (nextPriceType === "paid") {
    await ensureCreatorPaidWalletForMember(member.email);
  }

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
        priceType: nextPriceType,
        priceUsdt: resolveContentPriceUsdt(nextPriceType),
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

function normalizeTxHash(txHash: string) {
  const trimmed = txHash.trim();

  if (!/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
    throw new Error("Valid transaction hash is required.");
  }

  return trimmed.toLowerCase();
}

function extractTopicAddress(topic: string | null | undefined) {
  if (!topic || !topic.startsWith("0x") || topic.length < 42) {
    return null;
  }

  return normalizeAddress(`0x${topic.slice(-40)}`);
}

function isMatchingContentPaymentLog(
  log: {
    address: string;
    data: string;
    topics: readonly (string | null)[];
  },
  {
    amountWei,
    buyerWalletAddress,
    sellerWalletAddress,
  }: {
    amountWei: string;
    buyerWalletAddress: string;
    sellerWalletAddress: string;
  },
) {
  if (normalizeAddress(log.address) !== normalizeAddress(BSC_USDT_ADDRESS)) {
    return false;
  }

  const topics = log.topics.filter(Boolean) as string[];

  if (topics.length < 3 || topics[0]?.toLowerCase() !== ERC20_TRANSFER_SIG_HASH) {
    return false;
  }

  const fromAddress = extractTopicAddress(topics[1]);
  const toAddress = extractTopicAddress(topics[2]);

  if (!fromAddress || !toAddress) {
    return false;
  }

  return (
    fromAddress === normalizeAddress(buyerWalletAddress) &&
    toAddress === normalizeAddress(sellerWalletAddress) &&
    BigInt(log.data).toString() === amountWei
  );
}

async function verifyContentPaymentTransaction({
  amountWei,
  buyerWalletAddress,
  createdAt,
  sellerWalletAddress,
  txHash,
}: {
  amountWei: string;
  buyerWalletAddress: string;
  createdAt: Date;
  sellerWalletAddress: string;
  txHash: string;
}) {
  const rpcClient = getRpcClient({
    chain: smartWalletChain,
    client: serverThirdwebClient,
  });
  const receipt = await eth_getTransactionReceipt(rpcClient, {
    hash: txHash as `0x${string}`,
  });
  const receiptStatus = String(receipt.status ?? "").toLowerCase();

  if (receiptStatus && receiptStatus !== "success" && receiptStatus !== "0x1") {
    throw new Error("Transaction is not confirmed successfully.");
  }

  const matchingLog = receipt.logs.find((log) =>
    isMatchingContentPaymentLog(log, {
      amountWei,
      buyerWalletAddress,
      sellerWalletAddress,
    }),
  );

  if (!matchingLog) {
    throw new Error("Matching USDT transfer log not found in receipt.");
  }

  const blockNumber =
    typeof receipt.blockNumber === "bigint"
      ? receipt.blockNumber
      : BigInt(receipt.blockNumber);
  const block = await eth_getBlockByNumber(rpcClient, {
    blockNumber,
  });
  const blockTimestampMs = Number(block.timestamp) * 1000;

  if (
    blockTimestampMs + 1000 * 60 <
    createdAt.getTime() - CONTENT_ORDER_PAYMENT_WINDOW_MS
  ) {
    throw new Error("Transaction is outside the order payment window.");
  }

  return {
    blockNumber,
    blockTimestampMs,
  };
}

async function assertContentVisibleToBuyer(
  post: ContentPostDocument,
  buyer: MemberDocument,
) {
  if (post.status !== "published") {
    throw new Error("Content not found.");
  }

  const ancestors = await resolveNetworkAncestors(buyer);
  const visibleReferralCodes = new Set(
    ancestors.map((ancestor) => ancestor.referralCode),
  );

  if (!visibleReferralCodes.has(post.authorReferralCode)) {
    throw new Error("Content is not available in your network.");
  }
}

export async function createContentOrderForMember(
  input: ContentOrderCreateRequest,
): Promise<ContentOrderCreateResponse> {
  const normalizedEmail = normalizeEmail(input.email);

  if (!normalizedEmail) {
    throw new Error("email is required.");
  }

  const buyer = await getCompletedMemberOrThrow(normalizedEmail);
  const postsCollection = await getContentPostsCollection();
  const post = await postsCollection.findOne({ contentId: input.contentId });

  if (!post) {
    throw new Error("Content not found.");
  }

  if (post.authorEmail === buyer.email) {
    throw new Error("Authors can already access their own content.");
  }

  if (post.priceType !== "paid") {
    throw new Error("This content is free.");
  }

  await assertContentVisibleToBuyer(post, buyer);

  const existingEntitlement = await getContentEntitlementForMember(
    post.contentId,
    buyer.email,
  );

  if (existingEntitlement) {
    throw new Error("Content already unlocked.");
  }

  const sellerProfile = await ensureCreatorPaidWalletForMember(post.authorEmail);
  const sellerWalletAddress = sellerProfile.payoutWalletAddress?.trim();

  if (!sellerWalletAddress) {
    throw new Error("Seller wallet is not configured.");
  }

  const now = new Date();
  const order: ContentOrderDocument = {
    amountUsdt: CONTENT_PAID_USDT_AMOUNT,
    buyerEmail: buyer.email,
    buyerReferralCode: buyer.referralCode ?? null,
    contentId: post.contentId,
    createdAt: now,
    orderId: randomUUID(),
    sellerEmail: post.authorEmail,
    sellerWalletAddress: normalizeAddress(sellerWalletAddress),
    status: "pending_payment",
    txHash: null,
    updatedAt: now,
  };
  const ordersCollection = await getContentOrdersCollection();

  await ordersCollection.insertOne(order);

  return {
    order: serializeContentOrder(order),
    recipientWalletAddress: order.sellerWalletAddress,
  };
}

export async function verifyContentOrderForMember(
  orderId: string,
  input: ContentOrderVerifyRequest,
): Promise<ContentOrderVerifyResponse> {
  const normalizedEmail = normalizeEmail(input.email);

  if (!normalizedEmail) {
    throw new Error("email is required.");
  }

  const buyer = await getCompletedMemberOrThrow(normalizedEmail);
  const buyerWalletAddress = input.walletAddress?.trim();

  if (!buyerWalletAddress) {
    throw new Error("walletAddress is required.");
  }

  const txHash = normalizeTxHash(input.txHash);
  const ordersCollection = await getContentOrdersCollection();
  const order = await ordersCollection.findOne({
    buyerEmail: buyer.email,
    orderId,
  });

  if (!order) {
    throw new Error("Content order not found.");
  }

  if (order.status === "confirmed") {
    return {
      entitlementGranted: true,
      order: serializeContentOrder(order),
    };
  }

  if (order.status !== "pending_payment") {
    throw new Error("Content order is not payable.");
  }

  const duplicateOrder = await ordersCollection.findOne({
    orderId: { $ne: order.orderId },
    txHash,
  });

  if (duplicateOrder) {
    throw new Error("Transaction has already been used.");
  }

  await verifyContentPaymentTransaction({
    amountWei: CONTENT_PAID_USDT_AMOUNT_WEI,
    buyerWalletAddress,
    createdAt: order.createdAt,
    sellerWalletAddress: order.sellerWalletAddress,
    txHash,
  });

  const now = new Date();
  await ordersCollection.updateOne(
    { orderId: order.orderId, status: "pending_payment" },
    {
      $set: {
        status: "confirmed",
        txHash,
        updatedAt: now,
        verifiedAt: now,
      },
    },
  );

  const entitlementsCollection = await getContentEntitlementsCollection();
  const entitlement: ContentEntitlementDocument = {
    contentId: order.contentId,
    createdAt: now,
    grantedAt: now,
    memberEmail: buyer.email,
    orderId: order.orderId,
    source: "purchase",
  };

  await entitlementsCollection.updateOne(
    {
      contentId: entitlement.contentId,
      memberEmail: entitlement.memberEmail,
    },
    {
      $set: {
        grantedAt: entitlement.grantedAt,
        orderId: entitlement.orderId,
        source: entitlement.source,
      },
      $setOnInsert: {
        contentId: entitlement.contentId,
        createdAt: entitlement.createdAt,
        memberEmail: entitlement.memberEmail,
      },
    },
    { upsert: true },
  );

  const confirmedOrder = await ordersCollection.findOne({ orderId: order.orderId });

  if (!confirmedOrder) {
    throw new Error("Content order not found.");
  }

  return {
    entitlementGranted: true,
    order: serializeContentOrder(confirmedOrder),
  };
}

async function getSellerWalletBalance(
  sellerWalletAddress: string | null,
): Promise<ContentSellerWalletBalanceRecord | null> {
  if (!sellerWalletAddress) {
    return null;
  }

  if (!isAddress(sellerWalletAddress)) {
    throw new Error("Seller wallet address is invalid.");
  }

  const balance = await getWalletBalance({
    address: getAddress(sellerWalletAddress),
    chain: smartWalletChain,
    client: serverThirdwebClient,
    tokenAddress: BSC_USDT_ADDRESS,
  });

  return serializeSellerWalletBalance(balance);
}

export async function getCreatorSalesDashboardForMember(
  email: string,
): Promise<ContentSalesDashboardResponse> {
  const member = await getCompletedMemberOrThrow(email);
  const profile = await getCreatorProfileForMember(member.email);
  const sellerWalletAddress = profile.payoutWalletAddress?.trim() || null;
  const ordersCollection = await getContentOrdersCollection();
  const [recentOrders, confirmedOrders, pendingSalesCount, totalSalesCount] =
    await Promise.all([
      ordersCollection
        .find({ sellerEmail: member.email })
        .sort({ createdAt: -1 })
        .limit(CONTENT_SALES_HISTORY_LIMIT)
        .toArray(),
      ordersCollection
        .find(
          {
            sellerEmail: member.email,
            status: "confirmed",
          },
          {
            projection: {
              amountUsdt: 1,
            },
          },
        )
        .toArray(),
      ordersCollection.countDocuments({
        sellerEmail: member.email,
        status: "pending_payment",
      }),
      ordersCollection.countDocuments({ sellerEmail: member.email }),
    ]);
  const confirmedSalesCount = confirmedOrders.length;
  const totalSalesUsdt = confirmedOrders.reduce(
    (total, order) => addDecimalStrings(total, order.amountUsdt),
    "0",
  );
  const contentIds = [...new Set(recentOrders.map((order) => order.contentId))];
  const postsCollection = await getContentPostsCollection();
  const posts = contentIds.length
    ? await postsCollection
        .find(
          {
            contentId: { $in: contentIds },
          },
          {
            projection: {
              contentId: 1,
              coverImageUrl: 1,
              title: 1,
            },
          },
        )
        .toArray()
    : [];
  const postByContentId = new Map(
    posts.map((post) => [post.contentId, post]),
  );
  const balance = await getSellerWalletBalance(sellerWalletAddress);

  return {
    balance,
    member: serializeMember(member),
    profile,
    sales: recentOrders.map((order) =>
      serializeContentSaleOrder(order, postByContentId.get(order.contentId)),
    ),
    sellerWalletAddress,
    summary: {
      availableBalanceUsdt: balance?.amountUsdt ?? "0",
      confirmedSalesCount,
      pendingSalesCount,
      totalSalesCount,
      totalSalesUsdt,
    },
  };
}

function getSellerServerWallet(sellerWalletAddress: string) {
  if (!hasThirdwebSecretKey) {
    throw new Error("THIRDWEB_SECRET_KEY is required for seller wallet withdrawals.");
  }

  if (!isAddress(sellerWalletAddress)) {
    throw new Error("Seller wallet address is invalid.");
  }

  return Engine.serverWallet({
    address: getAddress(sellerWalletAddress),
    chain: smartWalletChain,
    client: serverThirdwebClient,
  });
}

export async function withdrawCreatorSalesBalanceForMember(
  input: ContentSellerWithdrawalRequest,
): Promise<ContentSellerWithdrawalResponse> {
  const normalizedEmail = normalizeEmail(input.email);

  if (!normalizedEmail) {
    throw new Error("email is required.");
  }

  const destinationWalletAddress = input.walletAddress?.trim();

  if (!destinationWalletAddress) {
    throw new Error("walletAddress is required.");
  }

  if (!isAddress(destinationWalletAddress)) {
    throw new Error("walletAddress is invalid.");
  }

  const member = await getCompletedMemberOrThrow(normalizedEmail);
  const profile = await getCreatorProfileForMember(member.email);
  const sellerWalletAddress = profile.payoutWalletAddress?.trim();

  if (!sellerWalletAddress) {
    throw new Error("Seller wallet is not configured.");
  }

  const balance = await getSellerWalletBalance(sellerWalletAddress);
  const withdrawAmountWei = balance ? BigInt(balance.amountWei) : BigInt(0);

  if (withdrawAmountWei <= BigInt(0)) {
    throw new Error("Seller wallet USDT balance is empty.");
  }

  const transaction = transfer({
    amountWei: withdrawAmountWei,
    contract: contentUsdtContract,
    to: getAddress(destinationWalletAddress),
  });
  const { transactionId } = await getSellerServerWallet(
    sellerWalletAddress,
  ).enqueueTransaction({
    transaction,
  });
  let transactionHash: string | null = null;

  try {
    const receipt = await Engine.waitForTransactionHash({
      client: serverThirdwebClient,
      timeoutInSeconds: CONTENT_SELLER_WITHDRAW_TIMEOUT_SECONDS,
      transactionId,
    });
    transactionHash = receipt.transactionHash;
  } catch {
    transactionHash = null;
  }

  const nextBalance = await getSellerWalletBalance(sellerWalletAddress).catch(
    () => null,
  );

  return {
    balance: nextBalance,
    destinationWalletAddress: getAddress(destinationWalletAddress),
    transactionHash,
    transactionId,
    withdrawnAmountUsdt: formatUsdtAmountFromWei(withdrawAmountWei),
    withdrawnAmountWei: withdrawAmountWei.toString(),
  };
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
  let entitlement: ContentEntitlementDocument | null = null;

  if (!isAuthor) {
    if (post.status !== "published") {
      throw new Error("Content not found.");
    }

    const ancestors = await resolveNetworkAncestors(member);
    const visibleReferralCodes = new Set(
      ancestors.map((ancestor) => ancestor.referralCode),
    );

    if (!visibleReferralCodes.has(post.authorReferralCode)) {
      throw new Error("Content is not available in your network.");
    }

    if (post.priceType === "paid") {
      entitlement = await getContentEntitlementForMember(
        post.contentId,
        member.email,
      );

      if (!entitlement) {
        throw new Error("This content requires a paid unlock.");
      }
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
      entitlementSource: isAuthor
        ? "complimentary"
        : post.priceType === "paid"
          ? entitlement?.source ?? "purchase"
          : "free",
      sources,
    },
    member: serializeMember(member),
  };
}
