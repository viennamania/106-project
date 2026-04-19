import type { MemberRecord } from "@/lib/member";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";

export const CONTENT_FEED_PAGE_SIZE = 20;
export const CONTENT_LIBRARY_PAGE_SIZE = 24;
export const CONTENT_NETWORK_LEVEL_LIMIT = 6;

export const creatorProfileStatuses = ["active", "restricted"] as const;
export const contentPostStatuses = ["draft", "published", "archived"] as const;
export const contentPriceTypes = ["free", "paid"] as const;
export const contentAssetKinds = [
  "cover",
  "preview_image",
  "image",
  "video",
  "attachment",
] as const;
export const contentOrderStatuses = [
  "pending_payment",
  "confirmed",
  "expired",
  "failed",
] as const;
export const contentEntitlementSources = [
  "free",
  "purchase",
  "complimentary",
] as const;

export type CreatorProfileStatus = (typeof creatorProfileStatuses)[number];
export type ContentPostStatus = (typeof contentPostStatuses)[number];
export type ContentPriceType = (typeof contentPriceTypes)[number];
export type ContentAssetKind = (typeof contentAssetKinds)[number];
export type ContentOrderStatus = (typeof contentOrderStatuses)[number];
export type ContentEntitlementSource =
  (typeof contentEntitlementSources)[number];
export type ContentAccessGateReason =
  | "connect"
  | "network"
  | "paid"
  | "signup";

export type CreatorProfileDocument = {
  avatarImageUrl?: string | null;
  createdAt: Date;
  displayName: string;
  email: string;
  heroImageUrl?: string | null;
  intro: string;
  payoutWalletAddress: string | null;
  referralCode: string;
  status: CreatorProfileStatus;
  updatedAt: Date;
};

export type ContentAssetDocument = {
  assetId: string;
  blobUrl: string;
  contentId: string;
  createdAt: Date;
  kind: ContentAssetKind;
  mimeType: string;
  sizeBytes: number;
  thumbnailUrl?: string | null;
  uploaderEmail: string;
};

export type ContentPostDocument = {
  authorEmail: string;
  authorReferralCode: string;
  body: string;
  contentId: string;
  contentImageUrls?: string[];
  coverImageUrl: string | null;
  createdAt: Date;
  locale?: Locale | null;
  previewAssetIds: string[];
  previewText: string | null;
  priceType: ContentPriceType;
  priceUsdt: string | null;
  publishedAt?: Date | null;
  status: ContentPostStatus;
  summary: string;
  tags: string[];
  title: string;
  updatedAt: Date;
};

export type ContentOrderDocument = {
  amountUsdt: string;
  buyerEmail: string;
  buyerReferralCode?: string | null;
  contentId: string;
  createdAt: Date;
  orderId: string;
  sellerEmail: string;
  sellerWalletAddress: string;
  status: ContentOrderStatus;
  txHash?: string | null;
  updatedAt: Date;
  verifiedAt?: Date | null;
};

export type ContentEntitlementDocument = {
  contentId: string;
  createdAt: Date;
  grantedAt: Date;
  memberEmail: string;
  orderId?: string | null;
  source: ContentEntitlementSource;
};

export type CreatorProfileRecord = {
  avatarImageUrl: string | null;
  displayName: string;
  heroImageUrl: string | null;
  intro: string;
  payoutWalletAddress: string | null;
  referralCode: string;
  status: CreatorProfileStatus;
  updatedAt: string;
};

export type ContentAssetRecord = {
  assetId: string;
  blobUrl: string;
  kind: ContentAssetKind;
  mimeType: string;
  sizeBytes: number;
  thumbnailUrl: string | null;
};

export type ContentPostRecord = {
  authorEmail: string;
  authorReferralCode: string;
  contentId: string;
  contentImageUrls: string[];
  coverImageUrl: string | null;
  createdAt: string;
  locale: Locale;
  previewText: string | null;
  priceType: ContentPriceType;
  priceUsdt: string | null;
  publishedAt: string | null;
  status: ContentPostStatus;
  summary: string;
  tags: string[];
  title: string;
  updatedAt: string;
};

export type ContentFeedItemRecord = ContentPostRecord & {
  authorProfile: CreatorProfileRecord | null;
  canAccess: boolean;
  networkLevel: number | null;
  previewAssets: ContentAssetRecord[];
};

export type ContentSourceAttributionRecord = {
  title: string;
  url: string;
};

export type ContentDetailRecord = ContentPostRecord & {
  assets: ContentAssetRecord[];
  authorProfile: CreatorProfileRecord | null;
  body: string;
  canAccess: boolean;
  entitlementSource: ContentEntitlementSource | null;
  sources: ContentSourceAttributionRecord[];
};

export type ContentOrderRecord = {
  amountUsdt: string;
  contentId: string;
  createdAt: string;
  orderId: string;
  status: ContentOrderStatus;
  txHash: string | null;
  verifiedAt: string | null;
};

export type ContentFeedResponse = {
  items: ContentFeedItemRecord[];
  member: MemberRecord;
  nextCursor: string | null;
};

export type ContentFeedLoadResponse = {
  items: ContentFeedItemRecord[];
  member: MemberRecord | null;
  nextCursor: string | null;
  validationError: string | null;
};

export type ContentDetailResponse = {
  content: ContentDetailRecord;
  member: MemberRecord;
};

export type ContentDetailLoadResponse = {
  content: ContentDetailRecord | null;
  gateReason: ContentAccessGateReason | null;
  member: MemberRecord | null;
  validationError: string | null;
};

export type ContentLibraryResponse = {
  items: ContentFeedItemRecord[];
};

export type CreatorProfileResponse = {
  profile: CreatorProfileRecord;
};

export type CreatorProfileUploadResponse = {
  contentType: string;
  pathname: string;
  url: string;
};

export type ContentPostUploadResponse = {
  contentType: string;
  pathname: string;
  url: string;
};

export type ContentPostGenerateCoverResponse = {
  contentType: string;
  pathname: string;
  revisedPrompt: string | null;
  url: string;
};

export type CreatorStudioPostsResponse = {
  member: MemberRecord;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  posts: ContentPostRecord[];
  profile: CreatorProfileRecord;
  summary: {
    all: number;
    archived: number;
    draft: number;
    published: number;
  };
};

export type CreatorProfileUpsertRequest = {
  avatarImageUrl?: string | null;
  displayName: string;
  email: string;
  heroImageUrl?: string | null;
  intro: string;
  payoutWalletAddress?: string | null;
  walletAddress?: string;
};

export type ContentPostCreateRequest = {
  body: string;
  contentImageUrls?: string[];
  coverImageUrl?: string | null;
  email: string;
  locale?: Locale | null;
  previewAssetIds?: string[];
  previewText?: string | null;
  priceType: ContentPriceType;
  priceUsdt?: string | null;
  status?: ContentPostStatus;
  summary?: string;
  tags?: string[];
  title: string;
  walletAddress?: string;
};

export type ContentPostUpdateRequest = Partial<ContentPostCreateRequest> & {
  contentId: string;
  email: string;
};

export type ContentPostMutationResponse = {
  content: ContentPostRecord;
};

export type ContentOrderCreateRequest = {
  contentId: string;
  email: string;
};

export type ContentOrderCreateResponse = {
  order: ContentOrderRecord;
  recipientWalletAddress: string;
};

export type ContentOrderVerifyRequest = {
  email: string;
  txHash: string;
};

export type ContentOrderVerifyResponse = {
  entitlementGranted: boolean;
  order: ContentOrderRecord;
};

export function serializeCreatorProfile(
  profile: CreatorProfileDocument,
): CreatorProfileRecord {
  return {
    avatarImageUrl: profile.avatarImageUrl ?? null,
    displayName: profile.displayName,
    heroImageUrl: profile.heroImageUrl ?? null,
    intro: profile.intro,
    payoutWalletAddress: profile.payoutWalletAddress ?? null,
    referralCode: profile.referralCode,
    status: profile.status,
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export function serializeContentAsset(
  asset: ContentAssetDocument,
): ContentAssetRecord {
  return {
    assetId: asset.assetId,
    blobUrl: asset.blobUrl,
    kind: asset.kind,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    thumbnailUrl: asset.thumbnailUrl ?? null,
  };
}

export function serializeContentPost(
  content: ContentPostDocument,
): ContentPostRecord {
  return {
    authorEmail: content.authorEmail,
    authorReferralCode: content.authorReferralCode,
    contentId: content.contentId,
    contentImageUrls: content.contentImageUrls ?? [],
    coverImageUrl: content.coverImageUrl ?? null,
    createdAt: content.createdAt.toISOString(),
    locale: normalizeContentLocale(content.locale),
    previewText: content.previewText ?? null,
    priceType: content.priceType,
    priceUsdt: content.priceUsdt ?? null,
    publishedAt: content.publishedAt?.toISOString() ?? null,
    status: content.status,
    summary: content.summary,
    tags: content.tags,
    title: content.title,
    updatedAt: content.updatedAt.toISOString(),
  };
}

export function normalizeContentLocale(locale: string | null | undefined): Locale {
  if (locale && hasLocale(locale)) {
    return locale;
  }

  return defaultLocale;
}

export function serializeContentOrder(
  order: ContentOrderDocument,
): ContentOrderRecord {
  return {
    amountUsdt: order.amountUsdt,
    contentId: order.contentId,
    createdAt: order.createdAt.toISOString(),
    orderId: order.orderId,
    status: order.status,
    txHash: order.txHash ?? null,
    verifiedAt: order.verifiedAt?.toISOString() ?? null,
  };
}

export function createEmptyContentFeed(member: MemberRecord): ContentFeedResponse {
  return {
    items: [],
    member,
    nextCursor: null,
  };
}
