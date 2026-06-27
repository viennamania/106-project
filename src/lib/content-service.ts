import "server-only";

import { randomUUID } from "crypto";
import { cache } from "react";
import type { Filter } from "mongodb";

import {
  CONTENT_FEED_PAGE_SIZE,
  CONTENT_AI_GENERATED_VIDEO_FREE_ONLY_ERROR,
  CONTENT_PAID_FAN_REQUEST_REQUIRED_ERROR,
  CONTENT_PAID_REQUIRES_UPLOADED_VIDEO_ERROR,
  CONTENT_POSTS_BLOB_PATH_SEGMENT,
  CONTENT_PREVIEW_VIDEO_PATH_SEGMENT,
  CONTENT_NETWORK_LEVEL_LIMIT,
  CONTENT_PAID_USDT_AMOUNT,
  CONTENT_PAID_USDT_AMOUNT_WEI,
  CONTENT_VIDEO_LIMIT,
  CONTENT_VIDEO_SOURCE_MIXED_ERROR,
  CONTENT_VIDEO_SOURCE_REQUIRED_ERROR,
  CONTENT_EXCLUSIVE_NEWS_REPORTER_NOT_FOUND_ERROR,
  CONTENT_FAN_REPORT_LIMIT_BELOW_PUBLISHED_ERROR,
  CONTENT_NSFW_REQUIRES_VIDEO_ERROR,
  contentCoverImagePlacements,
  creatorAvatarExpressions,
  createEmptyContentSocialSummary,
  getContentVideoAssetSource,
  normalizeFanletterNewsReportSlotLimit,
  normalizeContentLocale,
  serializeContentOrder,
  serializeContentSaleOrder,
  serializeContentPost,
  serializeCreatorProfile,
  type ContentCommentCreateResponse,
  type ContentCommentDocument,
  type ContentCommentRecord,
  type ContentCommentsResponse,
  type ContentCoverImageCandidate,
  type ContentCoverImageCandidateSource,
  type ContentDetailResponse,
  type ContentEntitlementDocument,
  type ContentFeedItemRecord,
  type ContentFeedReporterProfileRecord,
  type ContentFeedResponse,
  type ContentFeedView,
  type ContentOrderCreateRequest,
  type ContentOrderCreateResponse,
  type ContentOrderDocument,
  type ContentOrderVerifyRequest,
  type ContentOrderVerifyResponse,
  type ContentPostCreateRequest,
  type ContentPostDocument,
  type ContentPostRecord,
  type ContentPostUpdateRequest,
  type ContentMaturityRating,
  type ContentPriceType,
  type ContentSalesDashboardResponse,
  type ContentSellerWalletBalanceRecord,
  type ContentSellerWithdrawalRequest,
  type ContentSellerWithdrawalResponse,
  type ContentSocialActionDocument,
  type ContentSocialResponse,
  type ContentSocialSummaryRecord,
  type ContentVideoMetadata,
  type ContentVideoMetadataSource,
  type CreatorProfileDocument,
  type CreatorProfileAvatarCandidate,
  type CreatorProfileRecord,
  type CreatorProfileCharacterUpdateRequest,
  type CreatorProfileUpsertRequest,
  type CreatorCharacterPersona,
  type CreatorCharacterMemoryDocument,
  type CreatorCharacterMemoryEntry,
  type CreatorCharacterTimelineDocument,
  type CreatorCharacterTimelineEvent,
  type CreatorStudioPostsResponse,
  type FanletterNewsReportDocument,
} from "@/lib/content";
import { resolveContentCoverImageUrl } from "@/lib/content-cover-selection";
import {
  normalizeCreatorCharacterRealismProfile,
} from "@/lib/fanletter-realism-policy";
import {
  FANLETTER_NEWS_SOURCE_REVEAL_PARTICIPANT_LIMIT,
  type FanletterNewsSourceRevealParticipant,
} from "@/lib/fanletter-news-source-reveal";
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
  getFanletterFanRequestsCollection,
  getFanletterNewsReportsCollection,
  getMembersCollection,
} from "@/lib/mongodb";
import { updateFanletterFanRequestStatusForCreator } from "@/lib/fanletter-fan-request-service";
import {
  normalizeEmail,
  normalizeReferralCode,
  serializeMember,
  serializeMemberPublicProfile,
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

type CreatorSalesDashboardQueryOptions = {
  page?: number;
  pageSize?: number;
};

type ContentFeedActivityCursor = {
  contentId: string;
  sortAt: string;
};

const PROFILE_DISPLAY_NAME_LIMIT = 40;
const PROFILE_INTRO_LIMIT = 220;
const CHARACTER_PERSONA_NAME_LIMIT = 80;
const CHARACTER_PERSONA_SUMMARY_LIMIT = 220;
const CHARACTER_PERSONA_PROMPT_LIMIT = 1_200;
const CHARACTER_PERSONA_TRAIT_LIMIT = 160;
const CHARACTER_PERSONA_TRAIT_COUNT_LIMIT = 8;
const CHARACTER_MEMORY_LIMIT = 24;
const CHARACTER_MEMORY_TITLE_LIMIT = 80;
const CHARACTER_MEMORY_BODY_LIMIT = 420;
const CHARACTER_TIMELINE_LIMIT = 48;
const CHARACTER_TIMELINE_TITLE_LIMIT = 100;
const CHARACTER_TIMELINE_SUMMARY_LIMIT = 260;
const CREATOR_AVATAR_SET_LIMIT = 8;
const CONTENT_TITLE_LIMIT = 88;
const CONTENT_SUMMARY_LIMIT = 180;
const CONTENT_BODY_LIMIT = 12_000;
const CONTENT_TAG_LIMIT = 6;
const CONTENT_TAG_LENGTH_LIMIT = 24;
const CONTENT_COVER_IMAGE_CANDIDATE_LIMIT = 16;
const CONTENT_IMAGE_LIMIT = 10;
const CREATOR_STUDIO_DEFAULT_PAGE_SIZE = 24;
const CREATOR_STUDIO_MAX_PAGE_SIZE = 60;
const CONTENT_COMMENT_BODY_LIMIT = 500;
const CONTENT_COMMENTS_DEFAULT_PAGE_SIZE = 5;
const CONTENT_COMMENTS_MAX_PAGE_SIZE = 30;
const CONTENT_ORDER_PAYMENT_WINDOW_MS = 1000 * 60 * 30;
const CONTENT_SALES_DEFAULT_PAGE_SIZE = 10;
const CONTENT_SALES_MAX_PAGE_SIZE = 60;
const CONTENT_SELLER_WITHDRAW_TIMEOUT_SECONDS = 20;
const CONTENT_EXCLUSIVE_NEWS_DEFAULT_DURATION_HOURS = 12;
const CONTENT_EXCLUSIVE_NEWS_DURATION_OPTIONS = [6, 12, 24] as const;
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

function encodeContentFeedActivityCursor({
  contentId,
  sortAt,
}: {
  contentId: string;
  sortAt: Date;
}) {
  const cursor: ContentFeedActivityCursor = {
    contentId,
    sortAt: sortAt.toISOString(),
  };

  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeContentFeedActivityCursor(cursor?: string | null) {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as Partial<ContentFeedActivityCursor>;
    const sortAt = parsed.sortAt ? new Date(parsed.sortAt) : null;

    if (!parsed.contentId || !sortAt || Number.isNaN(sortAt.getTime())) {
      return null;
    }

    return {
      contentId: parsed.contentId,
      sortAt,
    };
  } catch {
    return null;
  }
}

type CreatorStudioPostsQueryOptions = {
  locale?: Locale | null;
  maturity?: "all" | "general" | "nsfw" | null;
  media?: "all" | "video" | null;
  page?: number;
  pageSize?: number;
  priceType?: "all" | "free" | "paid" | null;
  query?: string | null;
  status?: "all" | "archived" | "draft" | "published" | null;
};

type ContentPreviewClipResolverInput = {
  contentVideoUrls: string[];
  referralCode: string;
  title?: string | null;
  value?: string | null;
};

type ContentPostMutationOptions = {
  resolveMissingPreviewClipVideoUrl?: (
    input: ContentPreviewClipResolverInput,
  ) => Promise<string | null | undefined>;
};

function trimToLength(value: string | null | undefined, limit: number) {
  return value?.trim().slice(0, limit) ?? "";
}

function normalizeOptionalText(value: string | null | undefined, limit: number) {
  const trimmed = trimToLength(value, limit);
  return trimmed || null;
}

function normalizeCharacterPersonaList(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) =>
      typeof value === "string"
        ? trimToLength(value, CHARACTER_PERSONA_TRAIT_LIMIT)
        : "",
    )
    .filter(Boolean)
    .slice(0, CHARACTER_PERSONA_TRAIT_COUNT_LIMIT);
}

function normalizeCharacterPersona(
  persona: CreatorCharacterPersona | null | undefined,
): CreatorCharacterPersona | null {
  if (!persona) {
    return null;
  }

  const name = trimToLength(persona.name, CHARACTER_PERSONA_NAME_LIMIT);
  const identityPrompt = trimToLength(
    persona.identityPrompt,
    CHARACTER_PERSONA_PROMPT_LIMIT,
  );

  if (!name || !identityPrompt) {
    return null;
  }

  return {
    avoidChanges: normalizeCharacterPersonaList(persona.avoidChanges),
    id:
      trimToLength(persona.id, 80) ||
      `persona-${randomUUID().replace(/-/g, "").slice(0, 12)}`,
    identityPrompt,
    lockedTraits: normalizeCharacterPersonaList(persona.lockedTraits),
    name,
    realismProfile: normalizeCreatorCharacterRealismProfile(
      persona.realismProfile,
    ),
    summary: trimToLength(persona.summary, CHARACTER_PERSONA_SUMMARY_LIMIT),
  };
}

function normalizeDateLike(value: Date | string | null | undefined) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

function normalizeCharacterMemoryStatus(
  value: string | null | undefined,
): CreatorCharacterMemoryDocument["status"] {
  return value === "draft" ? "draft" : "confirmed";
}

function normalizeCharacterMemorySource(
  value: string | null | undefined,
): CreatorCharacterMemoryDocument["source"] {
  return value === "content" || value === "fan_request" ? value : "manual";
}

function normalizeCharacterMemory(
  values: CreatorCharacterMemoryEntry[] | CreatorCharacterMemoryDocument[] | null | undefined,
) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((entry): CreatorCharacterMemoryDocument | null => {
      const title = trimToLength(entry.title, CHARACTER_MEMORY_TITLE_LIMIT);
      const body = trimToLength(entry.body, CHARACTER_MEMORY_BODY_LIMIT);

      if (!title || !body) {
        return null;
      }

      const createdAt = normalizeDateLike(entry.createdAt);

      return {
        body,
        createdAt,
        id:
          trimToLength(entry.id, 80) ||
          `memory-${randomUUID().replace(/-/g, "").slice(0, 12)}`,
        source: normalizeCharacterMemorySource(entry.source),
        status: normalizeCharacterMemoryStatus(entry.status),
        title,
        updatedAt: normalizeDateLike(entry.updatedAt) ?? createdAt,
      };
    })
    .filter((entry): entry is CreatorCharacterMemoryDocument => Boolean(entry))
    .slice(0, CHARACTER_MEMORY_LIMIT);
}

function normalizeCharacterTimelineKind(
  value: string | null | undefined,
): CreatorCharacterTimelineDocument["kind"] {
  if (
    value === "content_created" ||
    value === "content_published" ||
    value === "fan_request_used"
  ) {
    return value;
  }

  return "manual";
}

function normalizeCharacterTimeline(
  values:
    | CreatorCharacterTimelineEvent[]
    | CreatorCharacterTimelineDocument[]
    | null
    | undefined,
) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((event): CreatorCharacterTimelineDocument | null => {
      const title = trimToLength(event.title, CHARACTER_TIMELINE_TITLE_LIMIT);
      const summary = trimToLength(
        event.summary,
        CHARACTER_TIMELINE_SUMMARY_LIMIT,
      );

      if (!title || !summary) {
        return null;
      }

      const happenedAt = normalizeDateLike(event.happenedAt);

      return {
        contentId: normalizeOptionalText(event.contentId, 80),
        createdAt: normalizeDateLike(event.createdAt),
        happenedAt,
        id:
          trimToLength(event.id, 100) ||
          `timeline-${randomUUID().replace(/-/g, "").slice(0, 12)}`,
        kind: normalizeCharacterTimelineKind(event.kind),
        summary,
        title,
      };
    })
    .filter((event): event is CreatorCharacterTimelineDocument => Boolean(event))
    .slice(0, CHARACTER_TIMELINE_LIMIT);
}

function normalizeAvatarExpression(
  value: string | null | undefined,
): CreatorProfileAvatarCandidate["expression"] | undefined {
  return creatorAvatarExpressions.find((expression) => expression === value);
}

function normalizeCreatorAvatarSet(
  values: CreatorProfileAvatarCandidate[] | null | undefined,
) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((item) => {
      const url = normalizeOptionalText(item?.url, 500);
      const pathname = normalizeOptionalText(item?.pathname, 500);
      const contentType = normalizeOptionalText(item?.contentType, 80);

      if (!url || !pathname || !contentType) {
        return null;
      }

      const expression = normalizeAvatarExpression(item.expression);

      return {
        contentType,
        ...(expression ? { expression } : {}),
        ...(item.label ? { label: trimToLength(item.label, 40) } : {}),
        pathname,
        url,
      } satisfies CreatorProfileAvatarCandidate;
    })
    .filter((item): item is CreatorProfileAvatarCandidate => Boolean(item))
    .slice(0, CREATOR_AVATAR_SET_LIMIT);
}

function normalizeTags(tags?: string[]) {
  return (tags ?? [])
    .map((tag) => trimToLength(tag, CONTENT_TAG_LENGTH_LIMIT).toLowerCase())
    .filter(Boolean)
    .slice(0, CONTENT_TAG_LIMIT);
}

function normalizeCoverImageCandidateSource(
  value: string | null | undefined,
): ContentCoverImageCandidateSource {
  if (value === "ai" || value === "frame" || value === "manual") {
    return value;
  }

  return "manual";
}

function normalizeNullablePositiveNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return Number(value.toFixed(2));
}

function normalizeCoverImagePlacements(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const allowedPlacements = new Set<string>(contentCoverImagePlacements);

  return Array.from(
    new Set(
      value
        .map((placement) => (typeof placement === "string" ? placement : ""))
        .filter(
          (
            placement,
          ): placement is (typeof contentCoverImagePlacements)[number] =>
            allowedPlacements.has(placement),
        ),
    ),
  );
}

function normalizeCoverImageCandidates(
  values: ContentCoverImageCandidate[] | null | undefined,
): ContentCoverImageCandidate[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const seenUrls = new Set<string>();

  return values
    .map((item) => {
      const url = normalizeOptionalText(item?.url, 500);

      if (!url || seenUrls.has(url)) {
        return null;
      }

      seenUrls.add(url);

      const candidateId =
        trimToLength(item?.candidateId, 120) ||
        `cover-${randomUUID().replace(/-/g, "").slice(0, 16)}`;
      const createdAt = normalizeDateLike(item?.createdAt).toISOString();

      const candidate: ContentCoverImageCandidate = {
        candidateId,
        contentType: normalizeOptionalText(item?.contentType, 80),
        createdAt,
        height: normalizeNullablePositiveNumber(item?.height),
        pathname: normalizeOptionalText(item?.pathname, 500),
        placements: normalizeCoverImagePlacements(item?.placements),
        source: normalizeCoverImageCandidateSource(item?.source),
        timestampSec: normalizeNullablePositiveNumber(item?.timestampSec),
        url,
        width: normalizeNullablePositiveNumber(item?.width),
      };

      return candidate;
    })
    .filter((item): item is ContentCoverImageCandidate => item !== null)
    .slice(0, CONTENT_COVER_IMAGE_CANDIDATE_LIMIT);
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

function normalizeContentVideoUrls(urls?: string[]) {
  return Array.from(
    new Set(
      (urls ?? [])
        .map((url) => normalizeOptionalText(url, 500))
        .filter((url): url is string => Boolean(url)),
    ),
  ).slice(0, CONTENT_VIDEO_LIMIT);
}

function getPathSegmentsFromUrl(value: string) {
  const trimmedUrl = value.trim();
  let pathname = trimmedUrl;

  try {
    pathname = new URL(trimmedUrl).pathname;
  } catch {
    pathname = trimmedUrl.split(/[?#]/, 1)[0] ?? trimmedUrl;
  }

  return pathname
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment.trim());
      } catch {
        return segment.trim();
      }
    })
    .filter(Boolean);
}

function isMemberPreviewVideoUrl(value: string, referralCode: string) {
  const segments = getPathSegmentsFromUrl(value);
  const contentRootIndex = segments.indexOf(CONTENT_POSTS_BLOB_PATH_SEGMENT);

  return (
    contentRootIndex >= 0 &&
    segments[contentRootIndex + 1] === referralCode &&
    segments[contentRootIndex + 2] === CONTENT_PREVIEW_VIDEO_PATH_SEGMENT
  );
}

function normalizeContentPreviewClipVideoUrl({
  contentVideoUrls,
  referralCode,
  value,
}: {
  contentVideoUrls: string[];
  referralCode: string;
  value?: string | null;
}) {
  const trimmed = normalizeOptionalText(value, 500);

  if (!trimmed || contentVideoUrls.length === 0) {
    return null;
  }

  return isMemberPreviewVideoUrl(trimmed, referralCode) ? trimmed : null;
}

async function resolveContentPreviewClipVideoUrl({
  contentVideoUrls,
  referralCode,
  resolveMissingPreviewClipVideoUrl,
  title,
  value,
}: {
  contentVideoUrls: string[];
  referralCode: string;
  resolveMissingPreviewClipVideoUrl?: ContentPostMutationOptions[
    "resolveMissingPreviewClipVideoUrl"
  ];
  title?: string | null;
  value?: string | null;
}) {
  const normalized = normalizeContentPreviewClipVideoUrl({
    contentVideoUrls,
    referralCode,
    value,
  });

  if (normalized || contentVideoUrls.length === 0) {
    return normalized;
  }

  const sourceVideoUrl = contentVideoUrls[0];

  try {
    const previewClipVideoUrl = await resolveMissingPreviewClipVideoUrl?.({
      contentVideoUrls,
      referralCode,
      title,
      value: normalized,
    });

    return normalizeContentPreviewClipVideoUrl({
      contentVideoUrls,
      referralCode,
      value: previewClipVideoUrl,
    });
  } catch (error) {
    console.warn("[content-preview] Failed to generate missing preview clip.", {
      error: error instanceof Error ? error.message : String(error),
      referralCode,
      sourceVideoUrl,
    });

    return null;
  }
}

function normalizeContentVideoMetadataSource(
  value: unknown,
  url: string,
): ContentVideoMetadataSource {
  if (value === "generated" || value === "uploaded") {
    return value;
  }

  return getContentVideoAssetSource(url) === "generated" ? "generated" : "uploaded";
}

function normalizeContentVideoMetadata(
  values: ContentVideoMetadata[] | null | undefined,
  contentVideoUrls: string[],
): ContentVideoMetadata[] {
  if (!Array.isArray(values) || contentVideoUrls.length === 0) {
    return [];
  }

  const allowedUrls = new Set(contentVideoUrls);
  const seenUrls = new Set<string>();

  return values
    .map((item) => {
      const url = normalizeOptionalText(item?.url, 500);

      if (!url || !allowedUrls.has(url) || seenUrls.has(url)) {
        return null;
      }

      seenUrls.add(url);

      return {
        capturedAt: normalizeDateLike(item?.capturedAt).toISOString(),
        contentType: normalizeOptionalText(item?.contentType, 80),
        durationSec:
          typeof item?.durationSec === "number" &&
          Number.isFinite(item.durationSec) &&
          item.durationSec > 0
            ? Number(item.durationSec.toFixed(2))
            : null,
        height: normalizeNullablePositiveNumber(item?.height),
        pathname: normalizeOptionalText(item?.pathname, 500),
        source: normalizeContentVideoMetadataSource(item?.source, url),
        url,
        width: normalizeNullablePositiveNumber(item?.width),
      } satisfies ContentVideoMetadata;
    })
    .filter((item): item is ContentVideoMetadata => item !== null)
    .slice(0, CONTENT_VIDEO_LIMIT);
}

function normalizePriceType(priceType?: ContentPriceType | null) {
  return priceType === "paid" ? "paid" : "free";
}

function normalizeContentMaturityRating(
  rating?: ContentMaturityRating | null,
): ContentMaturityRating {
  return rating === "nsfw" ? "nsfw" : "general";
}

function validateContentVideoPricingPolicy({
  contentVideoUrls,
  priceType,
}: {
  contentVideoUrls: string[];
  priceType: ContentPriceType;
}) {
  const videoSources = contentVideoUrls.map((url) => getContentVideoAssetSource(url));
  const hasGeneratedVideo = videoSources.includes("generated");
  const hasUploadedVideo = videoSources.includes("uploaded");
  const hasUnknownVideo = videoSources.includes("unknown");

  if (hasUnknownVideo) {
    throw new Error(CONTENT_VIDEO_SOURCE_REQUIRED_ERROR);
  }

  if (hasGeneratedVideo && hasUploadedVideo) {
    throw new Error(CONTENT_VIDEO_SOURCE_MIXED_ERROR);
  }

  if (hasGeneratedVideo && priceType === "paid") {
    throw new Error(CONTENT_AI_GENERATED_VIDEO_FREE_ONLY_ERROR);
  }

  if (priceType === "paid" && !hasUploadedVideo) {
    throw new Error(CONTENT_PAID_REQUIRES_UPLOADED_VIDEO_ERROR);
  }
}

function validateContentMaturityPolicy({
  contentMaturityRating,
  contentVideoUrls,
}: {
  contentMaturityRating: ContentMaturityRating;
  contentVideoUrls: string[];
}) {
  if (contentMaturityRating !== "nsfw") {
    return;
  }

  if (contentVideoUrls.length === 0) {
    throw new Error(CONTENT_NSFW_REQUIRES_VIDEO_ERROR);
  }
}

const contentPostUpdateContentFields = [
  "body",
  "contentImageUrls",
  "contentMaturityRating",
  "contentVideoMetadata",
  "contentVideoUrls",
  "coverImageCandidates",
  "coverImageUrl",
  "exclusiveNewsDurationHours",
  "exclusiveNewsReporterReferralCode",
  "fanRequestId",
  "locale",
  "previewAssetIds",
  "previewClipVideoUrl",
  "previewText",
  "priceType",
  "priceUsdt",
  "status",
  "summary",
  "tags",
  "title",
] as const;

function isContentUpdateLimitedToFields(
  input: ContentPostUpdateRequest,
  allowedFields: readonly (typeof contentPostUpdateContentFields)[number][],
) {
  const allowedFieldSet = new Set<string>(allowedFields);
  let hasAllowedField = false;
  const hasOnlyAllowedFields = contentPostUpdateContentFields.every((field) => {
    const hasField = Object.prototype.hasOwnProperty.call(input, field);

    if (!hasField) {
      return true;
    }

    if (allowedFieldSet.has(field)) {
      hasAllowedField = true;
      return true;
    }

    return false;
  });

  return hasAllowedField && hasOnlyAllowedFields;
}

function isContentFanRequestNeutralUpdate(input: ContentPostUpdateRequest) {
  return isContentUpdateLimitedToFields(input, [
    "contentImageUrls",
    "contentMaturityRating",
    "contentVideoMetadata",
    "coverImageCandidates",
    "coverImageUrl",
  ]);
}

function resolveContentPriceUsdt(priceType: ContentPriceType) {
  return priceType === "paid" ? CONTENT_PAID_USDT_AMOUNT : null;
}

function normalizeContentFanRequestId(value?: string | null) {
  const normalized = value?.trim() ?? "";

  return normalized ? normalized.slice(0, 120) : null;
}

function normalizeExclusiveNewsDurationHours(value: unknown) {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (!Number.isFinite(numericValue)) {
    return CONTENT_EXCLUSIVE_NEWS_DEFAULT_DURATION_HOURS;
  }

  const normalizedValue = Math.floor(numericValue);

  return CONTENT_EXCLUSIVE_NEWS_DURATION_OPTIONS.includes(
    normalizedValue as (typeof CONTENT_EXCLUSIVE_NEWS_DURATION_OPTIONS)[number],
  )
    ? normalizedValue
    : CONTENT_EXCLUSIVE_NEWS_DEFAULT_DURATION_HOURS;
}

function createEmptyExclusiveNewsAssignment() {
  return {
    exclusiveNewsAssignedAt: null,
    exclusiveNewsReporterName: null,
    exclusiveNewsReporterReferralCode: null,
    exclusiveNewsUntil: null,
  } satisfies Pick<
    ContentPostDocument,
    | "exclusiveNewsAssignedAt"
    | "exclusiveNewsReporterName"
    | "exclusiveNewsReporterReferralCode"
    | "exclusiveNewsUntil"
  >;
}

async function resolveExclusiveNewsAssignmentForContent({
  durationHours,
  now,
  priceType,
  reporterReferralCode,
  status,
}: {
  durationHours?: number | null;
  now: Date;
  priceType: ContentPriceType;
  reporterReferralCode?: string | null;
  status: ContentPostDocument["status"];
}) {
  const normalizedReferralCode = normalizeReferralCode(reporterReferralCode);

  if (!normalizedReferralCode || priceType !== "free" || status !== "published") {
    return createEmptyExclusiveNewsAssignment();
  }

  const membersCollection = await getMembersCollection();
  const reporter = await membersCollection.findOne({
    referralCode: normalizedReferralCode,
    status: "completed",
  });

  if (!reporter) {
    throw new Error(CONTENT_EXCLUSIVE_NEWS_REPORTER_NOT_FOUND_ERROR);
  }

  const normalizedDurationHours =
    normalizeExclusiveNewsDurationHours(durationHours);
  const reporterName =
    trimToLength(reporter.publicProfile?.displayName, PROFILE_DISPLAY_NAME_LIMIT) ||
    inferDisplayName(reporter);

  return {
    exclusiveNewsAssignedAt: now,
    exclusiveNewsReporterName: reporterName,
    exclusiveNewsReporterReferralCode: normalizedReferralCode,
    exclusiveNewsUntil: new Date(
      now.getTime() + normalizedDurationHours * 60 * 60 * 1000,
    ),
  } satisfies Pick<
    ContentPostDocument,
    | "exclusiveNewsAssignedAt"
    | "exclusiveNewsReporterName"
    | "exclusiveNewsReporterReferralCode"
    | "exclusiveNewsUntil"
  >;
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

async function resolveFanRequestForPaidContent({
  contentId,
  fanRequestId,
  member,
}: {
  contentId?: string | null;
  fanRequestId?: string | null;
  member: Pick<MemberDocument, "email" | "referralCode">;
}) {
  const normalizedFanRequestId = normalizeContentFanRequestId(fanRequestId);

  if (!normalizedFanRequestId) {
    throw new Error(CONTENT_PAID_FAN_REQUEST_REQUIRED_ERROR);
  }

  if (!member.referralCode) {
    throw new Error(CONTENT_PAID_FAN_REQUEST_REQUIRED_ERROR);
  }

  const requestsCollection = await getFanletterFanRequestsCollection();
  const fanRequest = await requestsCollection.findOne({
    creatorEmail: member.email,
    requestId: normalizedFanRequestId,
  });
  const isSamePublishedContent =
    Boolean(contentId) &&
    fanRequest?.status === "used" &&
    fanRequest.usedContentId === contentId;

  if (
    !fanRequest ||
    fanRequest.creatorReferralCode !== member.referralCode ||
    fanRequest.requestType !== "vlog_request" ||
    Boolean(fanRequest.usedContentId && fanRequest.usedContentId !== contentId) ||
    (!["new", "reviewed"].includes(fanRequest.status) && !isSamePublishedContent)
  ) {
    throw new Error(CONTENT_PAID_FAN_REQUEST_REQUIRED_ERROR);
  }

  return fanRequest;
}

async function syncPaidContentFanRequestStatus({
  member,
  post,
}: {
  member: Pick<MemberDocument, "email">;
  post: Pick<ContentPostDocument, "contentId" | "fanRequestId" | "priceType" | "status">;
}) {
  if (post.priceType !== "paid" || post.status === "archived" || !post.fanRequestId) {
    return;
  }

  await updateFanletterFanRequestStatusForCreator({
    contentId: post.status === "published" ? post.contentId : null,
    creatorEmail: member.email,
    requestId: post.fanRequestId,
    status: post.status === "published" ? "used" : "reviewed",
  });
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

function resolvePrimaryContentImageUrl(
  post: Pick<
    ContentPostDocument,
    "contentImageUrls" | "coverImageCandidates" | "coverImageUrl"
  >,
) {
  return resolveContentCoverImageUrl(post, {
    fallbackPlacements: ["detail"],
    placement: "share",
  });
}

function hasContentVideo(post: Pick<ContentPostDocument, "contentVideoUrls">) {
  return (post.contentVideoUrls?.length ?? 0) > 0;
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

function clampSalesPageSize(value: number | undefined) {
  if (!Number.isFinite(value) || !value || value < 1) {
    return CONTENT_SALES_DEFAULT_PAGE_SIZE;
  }

  return Math.min(CONTENT_SALES_MAX_PAGE_SIZE, Math.max(1, Math.round(value)));
}

function clampCommentOffset(value: number | undefined) {
  if (!Number.isFinite(value) || !value || value < 1) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function clampCommentPageSize(value: number | undefined) {
  if (!Number.isFinite(value) || !value || value < 1) {
    return CONTENT_COMMENTS_DEFAULT_PAGE_SIZE;
  }

  return Math.min(
    CONTENT_COMMENTS_MAX_PAGE_SIZE,
    Math.max(1, Math.floor(value)),
  );
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

  if (options?.media === "video") {
    filter["contentVideoUrls.0"] = { $exists: true };
  }

  if (options?.priceType === "free" || options?.priceType === "paid") {
    filter.priceType = options.priceType;
  }

  if (options?.maturity === "nsfw") {
    filter.contentMaturityRating = "nsfw";
  } else if (options?.maturity === "general") {
    filter.contentMaturityRating = { $ne: "nsfw" };
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

function getNetworkParentReferralCode(member: MemberDocument) {
  return normalizeReferralCode(
    member.placementReferralCode ??
      member.sponsorReferralCode ??
      member.referredByCode ??
      null,
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
    avatarImageSet: [],
    avatarImageUrl: member.landingBranding?.heroImageUrl ?? null,
    characterMemory: [],
    characterPersona: null,
    characterTimeline: [],
    displayName: inferDisplayName(member),
    heroImageUrl: member.landingBranding?.heroImageUrl ?? null,
    intro: inferIntro(member),
    payoutWalletAddress: null,
    referralCode: member.referralCode ?? "",
    status: "active",
    updatedAt: now,
  };
}

function normalizeProfileComparisonValue(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function isStoredCreatorProfileConfigured(
  stored: CreatorProfileDocument,
  defaultProfile: CreatorProfileRecord,
) {
  if (stored.configuredAt) {
    return true;
  }

  return (
    (stored.avatarImageSet?.length ?? 0) !==
      defaultProfile.avatarImageSet.length ||
    normalizeProfileComparisonValue(stored.avatarImageUrl) !==
      normalizeProfileComparisonValue(defaultProfile.avatarImageUrl) ||
    Boolean(stored.characterPersona) ||
    normalizeProfileComparisonValue(stored.displayName) !==
      normalizeProfileComparisonValue(defaultProfile.displayName) ||
    normalizeProfileComparisonValue(stored.heroImageUrl) !==
      normalizeProfileComparisonValue(defaultProfile.heroImageUrl) ||
    normalizeProfileComparisonValue(stored.intro) !==
      normalizeProfileComparisonValue(defaultProfile.intro)
  );
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
        avatarImageSet: stored?.avatarImageSet ?? defaultProfile.avatarImageSet,
        avatarImageUrl:
          stored?.avatarImageUrl ?? defaultProfile.avatarImageUrl ?? null,
        configuredAt: stored?.configuredAt ?? null,
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
  let currentParentCode = getNetworkParentReferralCode(member);

  while (
    currentParentCode &&
    ancestors.length < CONTENT_NETWORK_LEVEL_LIMIT &&
    !visited.has(currentParentCode)
  ) {
    visited.add(currentParentCode);

    const ancestor = await membersCollection.findOne({
      referralCode: currentParentCode,
      status: "completed",
    });

    if (!ancestor) {
      break;
    }

    ancestors.push({
      level: ancestors.length + 1,
      member: ancestor,
      referralCode: currentParentCode,
    });

    currentParentCode = getNetworkParentReferralCode(ancestor);
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
  let currentParentCode: string | null = normalizedReferralCode;

  while (
    currentParentCode &&
    ancestors.length < CONTENT_NETWORK_LEVEL_LIMIT &&
    !visited.has(currentParentCode)
  ) {
    visited.add(currentParentCode);

    const ancestor = await membersCollection.findOne({
      referralCode: currentParentCode,
      status: "completed",
    });

    if (!ancestor) {
      break;
    }

    ancestors.push({
      level: ancestors.length + 1,
      member: ancestor,
      referralCode: currentParentCode,
    });

    currentParentCode = getNetworkParentReferralCode(ancestor);
  }

  return ancestors;
}

function getPublishedContentLocaleFilter(locale: Locale): Filter<ContentPostDocument> {
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

async function getFeedReporterProfilesForPosts(posts: ContentPostDocument[]) {
  const contentIds = [
    ...new Set(posts.map((post) => post.contentId.trim()).filter(Boolean)),
  ];

  if (contentIds.length === 0) {
    return new Map<string, ContentFeedReporterProfileRecord>();
  }

  const reports = await (await getFanletterNewsReportsCollection())
    .find({
      contentId: { $in: contentIds },
      status: "published",
    })
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray();
  const reportsByContentId = new Map<string, FanletterNewsReportDocument[]>();

  for (const report of reports) {
    const existingReports = reportsByContentId.get(report.contentId) ?? [];
    existingReports.push(report);
    reportsByContentId.set(report.contentId, existingReports);
  }

  if (reportsByContentId.size === 0) {
    return new Map<string, ContentFeedReporterProfileRecord>();
  }

  const reporterReferralCodes = [
    ...new Set(
      reports
        .map((report) => normalizeReferralCode(report.reporterReferralCode))
        .filter((code): code is string => Boolean(code)),
    ),
  ];
  const reporterMembers = reporterReferralCodes.length
    ? await (await getMembersCollection())
        .find({
          referralCode: { $in: reporterReferralCodes },
        })
        .toArray()
    : [];
  const memberByReferralCode = new Map<
    string,
    (typeof reporterMembers)[number]
  >();

  for (const member of reporterMembers) {
    const referralCode = normalizeReferralCode(member.referralCode);

    if (referralCode) {
      memberByReferralCode.set(referralCode, member);
    }
  }

  const reporterProfileByContentId =
    new Map<string, ContentFeedReporterProfileRecord>();

  for (const post of posts) {
    const reportsForPost = reportsByContentId.get(post.contentId) ?? [];

    if (reportsForPost.length === 0) {
      continue;
    }

    const exclusiveReporterReferralCode = normalizeReferralCode(
      post.exclusiveNewsReporterReferralCode,
    );
    const report =
      (exclusiveReporterReferralCode
        ? reportsForPost.find(
            (item) =>
              normalizeReferralCode(item.reporterReferralCode) ===
              exclusiveReporterReferralCode,
          )
        : null) ?? reportsForPost[0];
    const reporterReferralCode = normalizeReferralCode(
      report.reporterReferralCode,
    );
    const reporterMember = reporterReferralCode
      ? memberByReferralCode.get(reporterReferralCode)
      : null;
    const publicProfile = serializeMemberPublicProfile(
      reporterMember?.publicProfile,
    );
    const displayName =
      publicProfile?.displayName ||
      report.reporterName.trim() ||
      reporterReferralCode ||
      reporterMember?.email.split("@")[0] ||
      "Member";

    reporterProfileByContentId.set(post.contentId, {
      avatarImageUrl: publicProfile?.avatarImageUrl ?? null,
      displayName,
      email: reporterMember?.email ?? null,
      referralCode: reporterReferralCode,
      reportId: report.reportId,
    });
  }

  return reporterProfileByContentId;
}

async function buildFeedItemsFromPosts({
  ancestors,
  posts,
  viewerEmail,
}: {
  ancestors: NetworkAncestor[];
  posts: ContentPostDocument[];
  viewerEmail?: string | null;
}) {
  const creatorProfilesCollection = await getCreatorProfilesCollection();
  const levelByReferralCode = new Map<string, number>();

  for (const ancestor of ancestors) {
    levelByReferralCode.set(ancestor.referralCode, ancestor.level);
  }

  const authorEmails = [...new Set(posts.map((post) => post.authorEmail))];
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
    posts.map((post) => post.contentId),
    viewerEmail,
  );
  const reporterProfileByContentId = await getFeedReporterProfilesForPosts(posts);
  const purchasedContentIds = await getPurchasedContentIdsForViewer(
    posts
      .filter((post) => post.priceType === "paid")
      .map((post) => post.contentId),
    viewerEmail,
  );

  return posts.map((post) => {
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
        post.authorEmail === viewerEmail ||
        purchasedContentIds.has(post.contentId),
      content: post,
      networkLevel: levelByReferralCode.get(post.authorReferralCode) ?? null,
      reporterProfile: reporterProfileByContentId.get(post.contentId) ?? null,
      social: socialByContentId.get(post.contentId),
    });
  });
}

async function loadNetworkFeedItemsFromAncestors(
  ancestors: NetworkAncestor[],
  locale: Locale,
  options?: NetworkFeedQueryOptions,
) {
  const postsCollection = await getContentPostsCollection();
  const hiddenContentIds = await getHiddenContentIdsForViewer(options?.viewerEmail);
  const cursor = decodeNetworkFeedCursor(options?.cursor);
  const baseFilter: Filter<ContentPostDocument> = {
    ...getPublishedContentLocaleFilter(locale),
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
  const items = await buildFeedItemsFromPosts({
    ancestors,
    posts: pagePosts,
    viewerEmail: options?.viewerEmail,
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
  const defaultAuthorProfile = authorMember
    ? createDefaultCreatorProfile(authorMember)
    : null;
  const authorDisplayName =
    storedProfile?.characterPersona?.name?.trim() ||
    storedProfile?.displayName?.trim() ||
    defaultAuthorProfile?.displayName ||
    null;
  const authorAvatarImageUrl =
    storedProfile?.avatarImageUrl ?? defaultAuthorProfile?.avatarImageUrl ?? null;
  const postLocale = normalizeContentLocale(post.locale);
  const isNsfwContent = post.contentMaturityRating === "nsfw";

  return {
    authorAvatarImageUrl,
    authorDisplayName,
    contentId: post.contentId,
    contentVideoUrl: isNsfwContent ? null : (post.contentVideoUrls?.[0] ?? null),
    coverImageUrl: isNsfwContent ? null : resolvePrimaryContentImageUrl(post),
    hasVideo: isNsfwContent ? false : hasContentVideo(post),
    locale: postLocale,
    priceType: post.priceType,
    priceUsdt: post.priceUsdt ?? null,
    publishedAt: post.publishedAt ?? null,
    summary: isNsfwContent
      ? postLocale === "ko"
        ? "별도 opt-in 후 확인할 수 있는 AIAVpark 팬 전용 콘텐츠입니다."
        : "AIAVpark fan-only content available after a separate opt-in."
      : post.summary,
    title: isNsfwContent
      ? postLocale === "ko"
        ? "AIAVpark NSFW 팬 전용 콘텐츠"
        : "AIAVpark NSFW fan-only content"
      : post.title,
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
  const serializedPost = serializeContentPost(post);

  return {
    ...serializedPost,
    assets: [],
    authorProfile,
    body: previewBody,
    canAccess: false,
    contentImageUrls: [],
    contentVideoUrls: [],
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
      storedProfile?.characterPersona?.name?.trim() ||
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
  const snapshot = await getCreatorProfileSnapshotForMember(email);

  return snapshot.profile;
}

export async function getCreatorProfileSnapshotForMember(
  email: string,
): Promise<{ profile: CreatorProfileRecord; profileConfigured: boolean }> {
  const member = await getCompletedMemberOrThrow(email);

  return getCreatorProfileSnapshotForCompletedMember(member);
}

export async function getCreatorProfileSnapshotForCompletedMember(
  member: MemberDocument,
): Promise<{ profile: CreatorProfileRecord; profileConfigured: boolean }> {
  if (member.status !== "completed") {
    throw new Error("Completed signup is required.");
  }

  const stored = await readStoredCreatorProfile(member.email);
  const defaultProfile = createDefaultCreatorProfile(member);

  if (!stored) {
    return {
      profile: defaultProfile,
      profileConfigured: false,
    };
  }

  return {
    profile: serializeCreatorProfile(stored),
    profileConfigured: isStoredCreatorProfileConfigured(stored, defaultProfile),
  };
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
  const existing = await collection.findOne({ email: member.email });
  const defaultProfile = createDefaultCreatorProfile(member);

  const nextProfile: CreatorProfileDocument = {
    avatarImageSet: existing
      ? existing.avatarImageSet ?? []
      : defaultProfile.avatarImageSet,
    avatarImageUrl: existing
      ? existing.avatarImageUrl ?? null
      : defaultProfile.avatarImageUrl,
    characterMemory: normalizeCharacterMemory(
      input.characterMemory ?? existing?.characterMemory ?? [],
    ),
    characterPersona: existing?.characterPersona ?? null,
    characterTimeline: normalizeCharacterTimeline(
      input.characterTimeline ?? existing?.characterTimeline ?? [],
    ),
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

  await collection.updateOne(
    { email: member.email },
    {
      $set: {
        ...nextProfile,
        configuredAt: existing?.configuredAt ?? now,
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

export async function upsertCreatorCharacterForMember(
  input: CreatorProfileCharacterUpdateRequest,
): Promise<CreatorProfileRecord> {
  const normalizedEmail = normalizeEmail(input.email);

  if (!normalizedEmail) {
    throw new Error("email is required.");
  }

  const member = await getCompletedMemberOrThrow(normalizedEmail);

  if (!member.referralCode) {
    throw new Error("Completed member is missing referral code.");
  }

  const characterPersona = normalizeCharacterPersona(input.characterPersona);

  if (!characterPersona) {
    throw new Error("characterPersona is required.");
  }

  const collection = await getCreatorProfilesCollection();
  const existing = await collection.findOne({ email: member.email });
  const defaultProfile = createDefaultCreatorProfile(member);
  const displayName =
    trimToLength(input.displayName, PROFILE_DISPLAY_NAME_LIMIT) ||
    existing?.displayName ||
    defaultProfile.displayName;
  const intro =
    input.intro === undefined
      ? existing?.intro ?? defaultProfile.intro
      : trimToLength(input.intro, PROFILE_INTRO_LIMIT);
  const avatarImageSet = normalizeCreatorAvatarSet(input.avatarImageSet);
  const avatarImageUrl =
    normalizeOptionalText(input.avatarImageUrl, 500) ||
    avatarImageSet.find((candidate) => candidate.expression === "default")?.url ||
    avatarImageSet[0]?.url ||
    null;
  const now = new Date();

  await collection.updateOne(
    { email: member.email },
    {
      $set: {
        avatarImageSet,
        avatarImageUrl,
        characterMemory: normalizeCharacterMemory(
          input.characterMemory ?? existing?.characterMemory ?? [],
        ),
        characterPersona,
        characterTimeline: normalizeCharacterTimeline(
          input.characterTimeline ?? existing?.characterTimeline ?? [],
        ),
        configuredAt: existing?.configuredAt ?? now,
        displayName,
        email: member.email,
        heroImageUrl: existing?.heroImageUrl ?? defaultProfile.heroImageUrl ?? null,
        intro,
        payoutWalletAddress: existing?.payoutWalletAddress ?? null,
        referralCode: member.referralCode,
        status: existing?.status ?? "active",
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
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

function createContentTimelineEvent(
  post: ContentPostDocument,
  kind: "content_created" | "content_published",
): CreatorCharacterTimelineDocument {
  const now = new Date();
  const isKorean = normalizeContentLocale(post.locale) === "ko";
  const title =
    kind === "content_published"
      ? isKorean
        ? `콘텐츠 공개: ${post.title}`
        : `Published content: ${post.title}`
      : isKorean
        ? `콘텐츠 초안 생성: ${post.title}`
        : `Drafted content: ${post.title}`;

  return {
    contentId: post.contentId,
    createdAt: now,
    happenedAt: kind === "content_published" ? post.publishedAt ?? now : now,
    id: `${kind}-${post.contentId}`,
    kind,
    summary: trimToLength(post.summary, CHARACTER_TIMELINE_SUMMARY_LIMIT),
    title,
  };
}

async function recordCreatorCharacterTimelineEventForMember(
  memberEmail: string,
  event: CreatorCharacterTimelineDocument,
) {
  const [timelineEvent] = normalizeCharacterTimeline([event]);

  if (!timelineEvent) {
    return;
  }

  const collection = await getCreatorProfilesCollection();
  await collection.updateOne(
    { email: memberEmail },
    {
      $pull: {
        characterTimeline: { id: timelineEvent.id },
      },
    },
  );
  await collection.updateOne(
    { email: memberEmail },
    {
      $push: {
        characterTimeline: {
          $each: [timelineEvent],
          $position: 0,
          $slice: CHARACTER_TIMELINE_LIMIT,
        },
      },
      $set: {
        updatedAt: new Date(),
      },
    },
  );
}

function buildFeedItem({
  authorProfile,
  canAccess,
  content,
  networkLevel,
  reporterProfile,
  social,
}: {
  authorProfile: CreatorProfileRecord | null;
  canAccess?: boolean;
  content: ContentPostDocument;
  networkLevel: number | null;
  reporterProfile?: ContentFeedReporterProfileRecord | null;
  social?: ContentSocialSummaryRecord;
}): ContentFeedItemRecord {
  const resolvedCanAccess = canAccess ?? content.priceType === "free";
  const serializedContent = serializeContentPost(content);

  return {
    ...serializedContent,
    authorProfile,
    canAccess: resolvedCanAccess,
    contentImageUrls: resolvedCanAccess ? serializedContent.contentImageUrls : [],
    contentVideoUrls: resolvedCanAccess ? serializedContent.contentVideoUrls : [],
    networkLevel,
    previewAssets: [],
    reporterProfile: reporterProfile ?? null,
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

async function resolveFanletterNewsOrderAttribution({
  contentId,
  sourceReportId,
  sourceReporterReferralCode,
  sourceTrackingSource,
}: {
  contentId: string;
  sourceReportId?: string | null;
  sourceReporterReferralCode?: string | null;
  sourceTrackingSource?: string | null;
}) {
  const normalizedSourceReportId = sourceReportId?.trim() ?? "";
  const normalizedSourceReporterReferralCode = normalizeReferralCode(
    sourceReporterReferralCode,
  );
  const normalizedSourceTrackingSource =
    sourceTrackingSource?.trim().slice(0, 80) || null;

  if (!normalizedSourceReportId || !normalizedSourceReporterReferralCode) {
    return {
      sourceReportId: null,
      sourceReporterReferralCode: null,
      sourceTrackingSource: normalizedSourceTrackingSource,
    };
  }

  const report = await (await getFanletterNewsReportsCollection()).findOne(
    {
      contentId,
      reportId: normalizedSourceReportId,
      reporterReferralCode: normalizedSourceReporterReferralCode,
    },
    {
      projection: {
        reportId: 1,
        reporterReferralCode: 1,
      },
    },
  );

  if (!report) {
    return {
      sourceReportId: null,
      sourceReporterReferralCode: null,
      sourceTrackingSource: normalizedSourceTrackingSource,
    };
  }

  return {
    sourceReportId: report.reportId,
    sourceReporterReferralCode: report.reporterReferralCode,
    sourceTrackingSource: normalizedSourceTrackingSource,
  };
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
  const ordersCollection = await getContentOrdersCollection();
  const [actionCounts, commentCounts, paidOrderSummaries, viewerActions] =
    await Promise.all([
      socialActionsCollection
        .aggregate<{
          _id: string;
          likeCount: number;
          saveCount: number;
          sourceRevealCount: number;
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
              sourceRevealCount: {
                $sum: {
                  $cond: ["$sourceRevealRequested", 1, 0],
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
      ordersCollection
        .aggregate<{
          _id: string;
          amountUsdts: string[];
          buyerEmails: string[];
        }>([
          {
            $match: {
              contentId: { $in: uniqueContentIds },
              status: "confirmed",
            },
          },
          {
            $group: {
              _id: "$contentId",
              amountUsdts: { $push: "$amountUsdt" },
              buyerEmails: { $addToSet: "$buyerEmail" },
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
      sourceRevealCount: count.sourceRevealCount,
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

  for (const summary of paidOrderSummaries) {
    const current =
      summaries.get(summary._id) ?? createEmptyContentSocialSummary();
    const paidTotalUsdt = summary.amountUsdts.reduce(
      (total, amount) => addDecimalStrings(total, amount),
      "0",
    );

    summaries.set(summary._id, {
      ...current,
      paidBuyerCount: summary.buyerEmails.length,
      paidTotalUsdt,
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
      sourceRevealRequestedByViewer: Boolean(action.sourceRevealRequested),
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

export async function getContentSourceRevealParticipants(
  contentId: string,
  options?: {
    limit?: number;
  },
): Promise<FanletterNewsSourceRevealParticipant[]> {
  const normalizedContentId = contentId.trim();
  const requestedLimit = Math.floor(
    options?.limit ?? FANLETTER_NEWS_SOURCE_REVEAL_PARTICIPANT_LIMIT,
  );
  const limit = Math.max(
    1,
    Math.min(
      FANLETTER_NEWS_SOURCE_REVEAL_PARTICIPANT_LIMIT,
      Number.isFinite(requestedLimit)
        ? requestedLimit
        : FANLETTER_NEWS_SOURCE_REVEAL_PARTICIPANT_LIMIT,
    ),
  );

  if (!normalizedContentId) {
    return [];
  }

  const socialActionsCollection = await getContentSocialActionsCollection();
  const actions = await socialActionsCollection
    .find(
      {
        contentId: normalizedContentId,
        sourceRevealRequested: true,
      },
      {
        projection: {
          createdAt: 1,
          memberEmail: 1,
          sourceRevealRequestedAt: 1,
          updatedAt: 1,
        },
      },
    )
    .sort({ sourceRevealRequestedAt: -1, updatedAt: -1, createdAt: -1 })
    .limit(limit)
    .toArray();

  if (actions.length === 0) {
    return [];
  }

  const memberEmails = [
    ...new Set(
      actions
        .map((action) => action.memberEmail)
        .filter((email): email is string => Boolean(email)),
    ),
  ];
  const members = memberEmails.length
    ? await (await getMembersCollection())
        .find(
          { email: { $in: memberEmails } },
          {
            projection: {
              email: 1,
              publicProfile: 1,
              referralCode: 1,
            },
          },
        )
        .toArray()
    : [];
  const memberByEmail = new Map(members.map((member) => [member.email, member]));

  return actions.map((action) => {
    const member = memberByEmail.get(action.memberEmail);
    const publicProfile = serializeMemberPublicProfile(member?.publicProfile);
    const displayName =
      trimToLength(publicProfile?.displayName, 24) ||
      trimToLength(member?.referralCode, 12) ||
      "AIAVpark fan";
    const requestedAt =
      action.sourceRevealRequestedAt ?? action.updatedAt ?? action.createdAt ?? null;

    return {
      avatarImageUrl: publicProfile?.avatarImageUrl ?? null,
      displayName,
      referralCode: member?.referralCode ?? null,
      requestedAt: requestedAt?.toISOString() ?? null,
    };
  });
}

async function getFanletterNewsReportCountsByContentId(
  contentIds: string[],
  locale?: Locale | null,
) {
  const uniqueContentIds = [
    ...new Set(contentIds.map((id) => id.trim()).filter(Boolean)),
  ];
  const counts = new Map<string, number>();

  for (const contentId of uniqueContentIds) {
    counts.set(contentId, 0);
  }

  if (uniqueContentIds.length === 0) {
    return counts;
  }

  const reportsCollection = await getFanletterNewsReportsCollection();
  const match: Filter<FanletterNewsReportDocument> = {
    contentId: { $in: uniqueContentIds },
    status: "published",
  };

  if (locale) {
    match.locale = locale;
  }

  const rows = await reportsCollection
    .aggregate<{ _id: string; count: number }>([
      {
        $match: match,
      },
      {
        $group: {
          _id: "$contentId",
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  for (const row of rows) {
    counts.set(row._id, row.count);
  }

  return counts;
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

  setOnInsert.sourceRevealRequested = false;

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

export async function requestContentSourceRevealForMember({
  contentId,
  email,
  reportAttribution = null,
}: {
  contentId: string;
  email: string;
  reportAttribution?: {
    reportId?: string | null;
    reporterReferralCode?: string | null;
  } | null;
}): Promise<ContentSocialResponse> {
  await ensurePublishedContentExists(contentId);

  const member = await getCompletedMemberOrThrow(email);
  const now = new Date();
  const socialActionsCollection = await getContentSocialActionsCollection();
  const [existingAction, previousSourceRevealCount] = await Promise.all([
    socialActionsCollection.findOne({
      contentId,
      memberEmail: member.email,
    }),
    socialActionsCollection.countDocuments({
      contentId,
      sourceRevealRequested: true,
    }),
  ]);
  const normalizedReportId = reportAttribution?.reportId?.trim() || null;
  const normalizedReporterReferralCode =
    normalizeReferralCode(reportAttribution?.reporterReferralCode) ?? null;
  const attributionFields =
    normalizedReportId && normalizedReporterReferralCode
      ? {
          sourceRevealReportId: normalizedReportId,
          sourceRevealReporterReferralCode: normalizedReporterReferralCode,
        }
      : {};
  let newlyRequested = false;

  if (!existingAction) {
    try {
      await socialActionsCollection.insertOne({
        contentId,
        createdAt: now,
        hidden: false,
        liked: false,
        memberEmail: member.email,
        saved: false,
        sourceRevealRequested: true,
        sourceRevealRequestedAt: now,
        updatedAt: now,
        ...attributionFields,
      });
      newlyRequested = true;
    } catch (error) {
      if (
        !(
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === 11000
        )
      ) {
        throw error;
      }
    }
  } else if (!existingAction.sourceRevealRequested) {
    const updateResult = await socialActionsCollection.updateOne(
      {
        contentId,
        memberEmail: member.email,
        sourceRevealRequested: { $ne: true },
      },
      {
        $set: {
          sourceRevealRequested: true,
          sourceRevealRequestedAt: now,
          updatedAt: now,
          ...attributionFields,
        },
      },
    );
    newlyRequested = updateResult.modifiedCount > 0;
  }

  return {
    social: await getContentSocialSummaryForViewer(contentId, member.email),
    sourceRevealNewlyRequested: newlyRequested,
    sourceRevealPreviousCount: previousSourceRevealCount,
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
    const fallbackProfile =
      profileByEmail.get(member.email) ?? createDefaultCreatorProfile(member);
    const publicProfile = serializeMemberPublicProfile(member.publicProfile);

    profileByEmail.set(member.email, {
      ...fallbackProfile,
      avatarImageUrl:
        publicProfile?.avatarImageUrl ?? fallbackProfile.avatarImageUrl,
      displayName: publicProfile?.displayName ?? fallbackProfile.displayName,
    });
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
  options?: {
    offset?: number;
    pageSize?: number;
  },
): Promise<ContentCommentsResponse> {
  await ensurePublishedContentExists(contentId);

  const offset = clampCommentOffset(options?.offset);
  const pageSize = clampCommentPageSize(options?.pageSize);
  const commentsCollection = await getContentCommentsCollection();
  const comments = await commentsCollection
    .find({ contentId })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(pageSize + 1)
    .toArray();
  const visibleComments = comments.slice(0, pageSize);
  const profileByEmail = await getCommentAuthorProfiles(
    visibleComments.map((comment) => comment.memberEmail),
  );
  const hasMore = comments.length > pageSize;

  return {
    comments: visibleComments.map((comment) =>
      serializeContentComment(comment, profileByEmail),
    ),
    pageInfo: {
      hasMore,
      nextOffset: hasMore ? offset + pageSize : null,
      offset,
      pageSize,
    },
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

export async function getPublicNetworkFeedItemForReferralCode(
  contentId: string,
  referralCode: string,
  locale: Locale,
) {
  const ancestors = await resolveNetworkAncestorsFromReferralCode(referralCode);

  const postsCollection = await getContentPostsCollection();
  const post = await postsCollection.findOne({
    ...getPublishedContentLocaleFilter(locale),
    contentId,
    status: "published",
  });

  if (!post) {
    return null;
  }

  const [item] = await buildFeedItemsFromPosts({
    ancestors,
    posts: [post],
  });

  return item ?? null;
}

function orderPostsByContentIds(
  posts: ContentPostDocument[],
  contentIds: string[],
) {
  const postByContentId = new Map(posts.map((post) => [post.contentId, post]));

  return contentIds
    .map((contentId) => postByContentId.get(contentId))
    .filter((post): post is ContentPostDocument => Boolean(post));
}

function buildActivityCursorFilter(
  cursor: ReturnType<typeof decodeContentFeedActivityCursor>,
  sortField: "grantedAt" | "updatedAt",
) {
  if (!cursor) {
    return {};
  }

  return {
    $or: [
      { [sortField]: { $lt: cursor.sortAt } },
      {
        [sortField]: cursor.sortAt,
        contentId: { $lt: cursor.contentId },
      },
    ],
  };
}

export async function getSavedFeedForMember(
  email: string,
  _locale: Locale,
  options?: NetworkFeedQueryOptions,
): Promise<ContentFeedResponse> {
  const member = await getCompletedMemberOrThrow(email);
  const ancestors = await resolveNetworkAncestors(member);
  const cursor = decodeContentFeedActivityCursor(options?.cursor);
  const socialActionsCollection = await getContentSocialActionsCollection();
  const baseFilter: Filter<ContentSocialActionDocument> = {
    memberEmail: member.email,
    saved: true,
  };
  const filter: Filter<ContentSocialActionDocument> = cursor
    ? {
        $and: [
          baseFilter,
          buildActivityCursorFilter(cursor, "updatedAt"),
        ],
      }
    : baseFilter;
  const actions = await socialActionsCollection
    .find(filter)
    .sort({
      updatedAt: -1,
      contentId: -1,
    })
    .limit(CONTENT_FEED_PAGE_SIZE + 1)
    .toArray();
  const hasNextPage = actions.length > CONTENT_FEED_PAGE_SIZE;
  const pageActions = hasNextPage
    ? actions.slice(0, CONTENT_FEED_PAGE_SIZE)
    : actions;
  const contentIds = pageActions.map((action) => action.contentId);
  const postsCollection = await getContentPostsCollection();
  const posts = contentIds.length
    ? await postsCollection
        .find({
          contentId: { $in: contentIds },
          status: "published",
        })
        .toArray()
    : [];
  const items = await buildFeedItemsFromPosts({
    ancestors,
    posts: orderPostsByContentIds(posts, contentIds),
    viewerEmail: member.email,
  });
  const lastAction = pageActions[pageActions.length - 1];

  return {
    items,
    member: serializeMember(member),
    nextCursor:
      hasNextPage && lastAction
        ? encodeContentFeedActivityCursor({
            contentId: lastAction.contentId,
            sortAt: lastAction.updatedAt,
          })
        : null,
  };
}

export async function getPurchasedFeedForMember(
  email: string,
  locale: Locale,
  options?: NetworkFeedQueryOptions,
): Promise<ContentFeedResponse> {
  const member = await getCompletedMemberOrThrow(email);
  const ancestors = await resolveNetworkAncestors(member);
  const cursor = decodeContentFeedActivityCursor(options?.cursor);
  const entitlementsCollection = await getContentEntitlementsCollection();
  const baseFilter: Filter<ContentEntitlementDocument> = {
    memberEmail: member.email,
    source: "purchase",
  };
  const filter: Filter<ContentEntitlementDocument> = cursor
    ? {
        $and: [
          baseFilter,
          buildActivityCursorFilter(cursor, "grantedAt"),
        ],
      }
    : baseFilter;
  const entitlements = await entitlementsCollection
    .find(filter)
    .sort({
      grantedAt: -1,
      contentId: -1,
    })
    .limit(CONTENT_FEED_PAGE_SIZE + 1)
    .toArray();
  const hasNextPage = entitlements.length > CONTENT_FEED_PAGE_SIZE;
  const pageEntitlements = hasNextPage
    ? entitlements.slice(0, CONTENT_FEED_PAGE_SIZE)
    : entitlements;
  const contentIds = pageEntitlements.map((entitlement) => entitlement.contentId);
  const postsCollection = await getContentPostsCollection();
  const posts = contentIds.length
    ? await postsCollection
        .find({
          ...getPublishedContentLocaleFilter(locale),
          contentId: { $in: contentIds },
          priceType: "paid",
          status: "published",
        })
        .toArray()
    : [];
  const items = await buildFeedItemsFromPosts({
    ancestors,
    posts: orderPostsByContentIds(posts, contentIds),
    viewerEmail: member.email,
  });
  const lastEntitlement = pageEntitlements[pageEntitlements.length - 1];

  return {
    items,
    member: serializeMember(member),
    nextCursor:
      hasNextPage && lastEntitlement
        ? encodeContentFeedActivityCursor({
            contentId: lastEntitlement.contentId,
            sortAt: lastEntitlement.grantedAt,
          })
        : null,
  };
}

export async function getContentFeedForMember(
  email: string,
  locale: Locale,
  view: ContentFeedView,
  options?: NetworkFeedQueryOptions,
): Promise<ContentFeedResponse> {
  if (view === "saved") {
    return getSavedFeedForMember(email, locale, options);
  }

  if (view === "purchases") {
    return getPurchasedFeedForMember(email, locale, options);
  }

  return getNetworkFeedForMember(email, locale, options);
}

export async function getCreatorStudioPostsForMember(
  email: string,
  options?: CreatorStudioPostsQueryOptions,
): Promise<CreatorStudioPostsResponse> {
  const member = await getCompletedMemberOrThrow(email);
  const postsCollection = await getContentPostsCollection();
  const summaryMatch: Record<string, unknown> = {
    authorEmail: member.email,
  };

  if (options?.media === "video") {
    summaryMatch["contentVideoUrls.0"] = { $exists: true };
  }

  const summaryCounts = await postsCollection
    .aggregate<{ _id: string; count: number }>([
      {
        $match: summaryMatch,
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
    free: 0,
    maturityFilters: {
      all: 0,
      general: 0,
      nsfw: 0,
    },
    paid: 0,
    published: 0,
    statusFilters: {
      all: 0,
      archived: 0,
      draft: 0,
      published: 0,
    },
  };
  const priceSummaryCounts = await postsCollection
    .aggregate<{ _id: string; count: number }>([
      {
        $match: summaryMatch,
      },
      {
        $group: {
          _id: "$priceType",
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();
  const statusFilterCounts = await postsCollection
    .aggregate<{ _id: string; count: number }>([
      {
        $match: buildCreatorStudioPostsFilter(member.email, {
          maturity: options?.maturity,
          media: options?.media,
          priceType: options?.priceType,
          query: options?.query,
          status: "all",
        }),
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();
  const maturityFilterCounts = await postsCollection
    .aggregate<{ _id: string | null; count: number }>([
      {
        $match: buildCreatorStudioPostsFilter(member.email, {
          media: options?.media,
          priceType: options?.priceType,
          query: options?.query,
          status: options?.status,
        }),
      },
      {
        $group: {
          _id: "$contentMaturityRating",
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

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

  for (const item of priceSummaryCounts) {
    if (item._id === "paid") {
      summary.paid = item.count;
    } else {
      summary.free += item.count;
    }
  }

  for (const item of statusFilterCounts) {
    if (item._id === "archived") {
      summary.statusFilters.archived = item.count;
    } else if (item._id === "draft") {
      summary.statusFilters.draft = item.count;
    } else if (item._id === "published") {
      summary.statusFilters.published = item.count;
    }

    summary.statusFilters.all += item.count;
  }

  for (const item of maturityFilterCounts) {
    if (item._id === "nsfw") {
      summary.maturityFilters.nsfw = item.count;
    } else {
      summary.maturityFilters.general += item.count;
    }

    summary.maturityFilters.all += item.count;
  }

  const usingPagination = Boolean(
    options &&
      (options.page !== undefined ||
        options.pageSize !== undefined ||
        (options.maturity && options.maturity !== "all") ||
        options.media === "video" ||
        (options.priceType && options.priceType !== "all") ||
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
  const contentIds = posts.map((post) => post.contentId);
  const [profileSnapshot, socialByContentId, newsReportCountByContentId] =
    await Promise.all([
      getCreatorProfileSnapshotForMember(member.email),
      getContentSocialSummaries(contentIds, member.email),
      getFanletterNewsReportCountsByContentId(contentIds, options?.locale),
    ]);

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
    posts: posts.map((post) => ({
      ...serializeContentPost(post),
      newsReportCount: newsReportCountByContentId.get(post.contentId) ?? 0,
      social:
        socialByContentId.get(post.contentId) ?? createEmptyContentSocialSummary(),
    })),
    profile: profileSnapshot.profile,
    profileConfigured: profileSnapshot.profileConfigured,
    summary,
  };
}

export async function createContentPostForMember(
  input: ContentPostCreateRequest,
  options: ContentPostMutationOptions = {},
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
  const fanReportLimit = normalizeFanletterNewsReportSlotLimit(
    input.fanReportLimit,
  );
  const contentMaturityRating = normalizeContentMaturityRating(
    input.contentMaturityRating,
  );
  const contentImageUrls = normalizeContentImageUrls(input.contentImageUrls);
  const contentVideoUrls = normalizeContentVideoUrls(input.contentVideoUrls);
  const contentVideoMetadata = normalizeContentVideoMetadata(
    input.contentVideoMetadata,
    contentVideoUrls,
  );
  let previewClipVideoUrl = normalizeContentPreviewClipVideoUrl({
    contentVideoUrls,
    referralCode: member.referralCode,
    value: input.previewClipVideoUrl,
  });
  const coverImageUrl = normalizeOptionalText(input.coverImageUrl, 500);
  const coverImageCandidates = normalizeCoverImageCandidates(
    input.coverImageCandidates,
  );

  if (
    status === "published" &&
    !coverImageUrl &&
    contentImageUrls.length === 0 &&
    contentVideoUrls.length === 0
  ) {
    throw new Error("media is required.");
  }

  validateContentVideoPricingPolicy({ contentVideoUrls, priceType });
  validateContentMaturityPolicy({
    contentMaturityRating,
    contentVideoUrls,
  });

  const fanRequest =
    priceType === "paid"
      ? await resolveFanRequestForPaidContent({
          fanRequestId: input.fanRequestId,
          member,
        })
      : null;

  if (priceType === "paid") {
    await ensureCreatorPaidWalletForMember(member.email);
  }

  const now = new Date();
  const exclusiveNewsAssignment = await resolveExclusiveNewsAssignmentForContent({
    durationHours: input.exclusiveNewsDurationHours,
    now,
    priceType,
    reporterReferralCode: input.exclusiveNewsReporterReferralCode,
    status,
  });
  previewClipVideoUrl = await resolveContentPreviewClipVideoUrl({
    contentVideoUrls,
    referralCode: member.referralCode,
    resolveMissingPreviewClipVideoUrl:
      options.resolveMissingPreviewClipVideoUrl,
    title,
    value: previewClipVideoUrl,
  });
  const post: ContentPostDocument = {
    authorEmail: member.email,
    authorReferralCode: member.referralCode,
    body,
    contentId: randomUUID(),
    contentImageUrls,
    contentMaturityRating,
    contentVideoMetadata,
    contentVideoUrls,
    coverImageCandidates,
    coverImageUrl,
    createdAt: now,
    ...exclusiveNewsAssignment,
    fanReportLimit,
    fanRequestId: fanRequest?.requestId ?? null,
    locale: normalizeContentLocale(input.locale),
    previewAssetIds: (input.previewAssetIds ?? []).slice(0, 4),
    previewClipVideoUrl,
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
  try {
    await postsCollection.insertOne(post);
  } catch (error) {
    if (post.fanRequestId && isDuplicateKeyError(error)) {
      throw new Error(CONTENT_PAID_FAN_REQUEST_REQUIRED_ERROR);
    }

    throw error;
  }
  await syncPaidContentFanRequestStatus({ member, post });
  await recordCreatorCharacterTimelineEventForMember(
    member.email,
    createContentTimelineEvent(post, "content_created"),
  );

  if (post.status === "published") {
    await recordCreatorCharacterTimelineEventForMember(
      member.email,
      createContentTimelineEvent(post, "content_published"),
    );
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
  options: ContentPostMutationOptions = {},
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
  const hasFanReportLimitInput = Object.prototype.hasOwnProperty.call(
    input,
    "fanReportLimit",
  );
  const nextFanReportLimit = hasFanReportLimitInput
    ? normalizeFanletterNewsReportSlotLimit(input.fanReportLimit)
    : normalizeFanletterNewsReportSlotLimit(post.fanReportLimit);
  const nextContentMaturityRating =
    input.contentMaturityRating !== undefined
      ? normalizeContentMaturityRating(input.contentMaturityRating)
      : normalizeContentMaturityRating(post.contentMaturityRating);
  const nextContentImageUrls =
    input.contentImageUrls !== undefined
      ? normalizeContentImageUrls(input.contentImageUrls)
      : post.contentImageUrls ?? [];
  const nextContentVideoUrls =
    input.contentVideoUrls !== undefined
      ? normalizeContentVideoUrls(input.contentVideoUrls)
      : post.contentVideoUrls ?? [];
  const nextContentVideoMetadata =
    input.contentVideoMetadata !== undefined || input.contentVideoUrls !== undefined
      ? normalizeContentVideoMetadata(
          input.contentVideoMetadata ?? post.contentVideoMetadata,
          nextContentVideoUrls,
        )
      : normalizeContentVideoMetadata(
          post.contentVideoMetadata,
          nextContentVideoUrls,
        );
  let nextPreviewClipVideoUrl =
    input.previewClipVideoUrl !== undefined || input.contentVideoUrls !== undefined
      ? normalizeContentPreviewClipVideoUrl({
          contentVideoUrls: nextContentVideoUrls,
          referralCode: member.referralCode ?? post.authorReferralCode,
          value: input.previewClipVideoUrl ?? post.previewClipVideoUrl,
        })
      : normalizeContentPreviewClipVideoUrl({
          contentVideoUrls: nextContentVideoUrls,
          referralCode: member.referralCode ?? post.authorReferralCode,
          value: post.previewClipVideoUrl,
        });
  const nextCoverImageUrl =
    input.coverImageUrl !== undefined
      ? normalizeOptionalText(input.coverImageUrl, 500)
      : post.coverImageUrl ?? null;
  const nextCoverImageCandidates =
    input.coverImageCandidates !== undefined
      ? normalizeCoverImageCandidates(input.coverImageCandidates)
      : normalizeCoverImageCandidates(post.coverImageCandidates);
  const isFanRequestNeutralUpdate = isContentFanRequestNeutralUpdate(input);

  if (
    nextStatus === "published" &&
    !nextCoverImageUrl &&
    nextContentImageUrls.length === 0 &&
    nextContentVideoUrls.length === 0
  ) {
    throw new Error("media is required.");
  }

  if (nextStatus !== "archived") {
    validateContentVideoPricingPolicy({
      contentVideoUrls: nextContentVideoUrls,
      priceType: nextPriceType,
    });
    validateContentMaturityPolicy({
      contentMaturityRating: nextContentMaturityRating,
      contentVideoUrls: nextContentVideoUrls,
    });
  }

  if (
    nextPriceType === "paid" &&
    nextStatus !== "archived" &&
    !isFanRequestNeutralUpdate
  ) {
    await resolveFanRequestForPaidContent({
      contentId: post.contentId,
      fanRequestId: input.fanRequestId ?? post.fanRequestId,
      member,
    });
    await ensureCreatorPaidWalletForMember(member.email);
  }

  if (hasFanReportLimitInput) {
    const reportCountByContentId = await getFanletterNewsReportCountsByContentId([
      post.contentId,
    ]);
    const publishedReportCount =
      reportCountByContentId.get(post.contentId) ?? 0;

    if (publishedReportCount > nextFanReportLimit) {
      throw new Error(CONTENT_FAN_REPORT_LIMIT_BELOW_PUBLISHED_ERROR);
    }
  }

  const now = new Date();
  const nextPublishedAt =
    nextStatus === "published" ? post.publishedAt ?? now : post.publishedAt ?? null;
  const shouldUpdateExclusiveNewsAssignment =
    Object.prototype.hasOwnProperty.call(
      input,
      "exclusiveNewsReporterReferralCode",
    ) ||
    Object.prototype.hasOwnProperty.call(input, "exclusiveNewsDurationHours");
  const shouldUpdateExclusiveNewsReporter = Object.prototype.hasOwnProperty.call(
    input,
    "exclusiveNewsReporterReferralCode",
  );
  const nextExclusiveNewsAssignment = shouldUpdateExclusiveNewsAssignment
    ? await resolveExclusiveNewsAssignmentForContent({
        durationHours: input.exclusiveNewsDurationHours,
        now,
        priceType: nextPriceType,
        reporterReferralCode:
          shouldUpdateExclusiveNewsReporter
            ? input.exclusiveNewsReporterReferralCode
            : post.exclusiveNewsReporterReferralCode ?? null,
        status: nextStatus,
      })
    : nextPriceType === "free" && nextStatus === "published"
      ? {
          exclusiveNewsAssignedAt: post.exclusiveNewsAssignedAt ?? null,
          exclusiveNewsReporterName: post.exclusiveNewsReporterName ?? null,
          exclusiveNewsReporterReferralCode:
            normalizeReferralCode(post.exclusiveNewsReporterReferralCode),
          exclusiveNewsUntil: post.exclusiveNewsUntil ?? null,
        }
      : createEmptyExclusiveNewsAssignment();
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
  const nextFanRequestId =
    nextPriceType === "paid" && nextStatus !== "archived"
      ? normalizeContentFanRequestId(input.fanRequestId ?? post.fanRequestId)
      : null;
  nextPreviewClipVideoUrl = await resolveContentPreviewClipVideoUrl({
    contentVideoUrls: nextContentVideoUrls,
    referralCode: member.referralCode ?? post.authorReferralCode,
    resolveMissingPreviewClipVideoUrl:
      options.resolveMissingPreviewClipVideoUrl,
    title: nextTitle,
    value: nextPreviewClipVideoUrl,
  });

  try {
    await postsCollection.updateOne(
      { contentId: post.contentId },
      {
        $set: {
          body: nextBody,
          contentImageUrls: nextContentImageUrls,
          contentMaturityRating:
            nextStatus === "archived" ? "general" : nextContentMaturityRating,
          contentVideoMetadata: nextContentVideoMetadata,
          contentVideoUrls: nextContentVideoUrls,
          coverImageCandidates: nextCoverImageCandidates,
          coverImageUrl: nextCoverImageUrl,
          exclusiveNewsAssignedAt:
            nextExclusiveNewsAssignment.exclusiveNewsAssignedAt,
          exclusiveNewsReporterName:
            nextExclusiveNewsAssignment.exclusiveNewsReporterName,
          exclusiveNewsReporterReferralCode:
            nextExclusiveNewsAssignment.exclusiveNewsReporterReferralCode,
          exclusiveNewsUntil: nextExclusiveNewsAssignment.exclusiveNewsUntil,
          fanReportLimit: nextFanReportLimit,
          fanRequestId: nextFanRequestId,
          locale:
            input.locale !== undefined
              ? normalizeContentLocale(input.locale)
              : normalizeContentLocale(post.locale),
          previewAssetIds:
            input.previewAssetIds !== undefined
              ? input.previewAssetIds.slice(0, 4)
              : post.previewAssetIds,
          previewClipVideoUrl: nextPreviewClipVideoUrl,
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
  } catch (error) {
    if (nextFanRequestId && isDuplicateKeyError(error)) {
      throw new Error(CONTENT_PAID_FAN_REQUEST_REQUIRED_ERROR);
    }

    throw error;
  }

  const nextPost = await postsCollection.findOne({ contentId: post.contentId });

  if (!nextPost) {
    throw new Error("Content not found.");
  }

  if (!isFanRequestNeutralUpdate) {
    await syncPaidContentFanRequestStatus({ member, post: nextPost });
  }

  if (post.status !== "published" && nextPost.status === "published") {
    await recordCreatorCharacterTimelineEventForMember(
      member.email,
      createContentTimelineEvent(nextPost, "content_published"),
    );
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

function isContentAuthorReferralLink(
  post: ContentPostDocument,
  referralCode?: string | null,
) {
  const normalizedReferralCode = normalizeReferralCode(referralCode);
  const normalizedAuthorReferralCode = normalizeReferralCode(
    post.authorReferralCode,
  );

  return Boolean(
    normalizedReferralCode &&
      normalizedAuthorReferralCode &&
      normalizedReferralCode === normalizedAuthorReferralCode,
  );
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
  const sourceAttribution = await resolveFanletterNewsOrderAttribution({
    contentId: post.contentId,
    sourceReportId: input.sourceReportId,
    sourceReporterReferralCode: input.sourceReporterReferralCode,
    sourceTrackingSource: input.sourceTrackingSource,
  });
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
    sourceReportId: sourceAttribution.sourceReportId,
    sourceReporterReferralCode: sourceAttribution.sourceReporterReferralCode,
    sourceTrackingSource: sourceAttribution.sourceTrackingSource,
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
  options?: CreatorSalesDashboardQueryOptions,
): Promise<ContentSalesDashboardResponse> {
  const member = await getCompletedMemberOrThrow(email);
  const profile = await getCreatorProfileForMember(member.email);
  const sellerWalletAddress = profile.payoutWalletAddress?.trim() || null;
  const ordersCollection = await getContentOrdersCollection();
  const page = clampPageNumber(options?.page);
  const pageSize = clampSalesPageSize(options?.pageSize);
  const cursor = (page - 1) * pageSize;
  const salesFilter = { sellerEmail: member.email };
  const [pageOrders, confirmedSalesSummary, pendingSalesCount, totalSalesCount] =
    await Promise.all([
      ordersCollection
        .find(salesFilter)
        .sort({ createdAt: -1 })
        .skip(cursor)
        .limit(pageSize)
        .toArray(),
      ordersCollection
        .aggregate<{
          confirmedSalesCount: number;
          totalSalesUsdt?: { toString(): string } | null;
        }>([
          {
            $match: {
              sellerEmail: member.email,
              status: "confirmed",
            },
          },
          {
            $group: {
              _id: null,
              confirmedSalesCount: { $sum: 1 },
              totalSalesUsdt: { $sum: { $toDecimal: "$amountUsdt" } },
            },
          },
        ])
        .toArray(),
      ordersCollection.countDocuments({
        sellerEmail: member.email,
        status: "pending_payment",
      }),
      ordersCollection.countDocuments(salesFilter),
    ]);
  const confirmedSalesCount = confirmedSalesSummary[0]?.confirmedSalesCount ?? 0;
  const totalSalesUsdt =
    confirmedSalesSummary[0]?.totalSalesUsdt?.toString() ?? "0";
  const contentIds = [...new Set(pageOrders.map((order) => order.contentId))];
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
  const totalPages = Math.max(1, Math.ceil(totalSalesCount / pageSize));

  return {
    balance,
    member: serializeMember(member),
    pageInfo: {
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      page,
      pageSize,
      totalCount: totalSalesCount,
      totalPages,
    },
    profile,
    sales: pageOrders.map((order) =>
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
  options: {
    referralCode?: string | null;
  } = {},
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

    if (post.priceType === "paid") {
      entitlement = await getContentEntitlementForMember(
        post.contentId,
        member.email,
      );
    }

    const hasPaidUnlock = post.priceType === "paid" && Boolean(entitlement);

    if (!hasPaidUnlock) {
      if (post.priceType === "paid") {
        throw new Error("This content requires a paid unlock.");
      }

      const ancestors = await resolveNetworkAncestors(member);
      const visibleReferralCodes = new Set(
        ancestors.map((ancestor) => ancestor.referralCode),
      );

      if (
        !visibleReferralCodes.has(post.authorReferralCode) &&
        !isContentAuthorReferralLink(post, options.referralCode)
      ) {
        throw new Error("Content is not available in your network.");
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
    social: await getContentSocialSummaryForViewer(post.contentId, member.email),
  };
}
