import type { MemberRecord } from "@/lib/member";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";

export const CONTENT_FEED_PAGE_SIZE = 20;
export const CONTENT_LIBRARY_PAGE_SIZE = 24;
export const CONTENT_NETWORK_LEVEL_LIMIT = 6;
export const CONTENT_PAID_USDT_AMOUNT = "1";
export const CONTENT_PAID_USDT_AMOUNT_WEI = "1000000000000000000";
export const CONTENT_POSTS_BLOB_PATH_SEGMENT = "content-posts";
export const CONTENT_UPLOADED_VIDEO_PATH_SEGMENT = "videos";
export const CONTENT_GENERATED_VIDEO_PATH_SEGMENT = "generated-content-videos";
export const CONTENT_PAID_REQUIRES_UPLOADED_VIDEO_ERROR =
  "Paid content requires a directly uploaded video.";
export const CONTENT_UPLOADED_VIDEO_PAID_ONLY_ERROR =
  "Uploaded videos must be saved as paid content.";
export const CONTENT_AI_GENERATED_VIDEO_FREE_ONLY_ERROR =
  "AI-generated videos must be saved as free content.";
export const CONTENT_VIDEO_SOURCE_REQUIRED_ERROR =
  "Content videos must come from AI generation or direct video upload.";
export const CONTENT_VIDEO_SOURCE_MIXED_ERROR =
  "Use either an AI-generated video or an uploaded video, not both.";
export const CONTENT_IMAGE_VISUAL_BRIEF_LIMIT = 6000;
export const CONTENT_VIDEO_LIMIT = 1;
export const CONTENT_VIDEO_MAX_BYTES = 200 * 1024 * 1024;
export const contentVideoMimeTypes = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;
export const contentCoverGenerationProgressSteps = [
  "authorizing",
  "preparing_prompt",
  "generating_image",
  "uploading_cover",
  "finalizing",
] as const;

export const creatorProfileStatuses = ["active", "restricted"] as const;
export const contentPostStatuses = ["draft", "published", "archived"] as const;
export const contentPriceTypes = ["free", "paid"] as const;
export const contentFeedViews = ["network", "saved", "purchases"] as const;
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
export const fanletterFanRequestTypes = ["message", "vlog_request"] as const;
export const fanletterFanRequestStatuses = [
  "new",
  "reviewed",
  "used",
  "hidden",
] as const;
export const fanletterFanRequestTemplateCategories = [
  "daily",
  "fanservice",
  "message",
  "outfit",
  "qna",
  "routine",
  "seasonal",
] as const;
export const fanletterFanRequestTemplateStatuses = [
  "active",
  "hidden",
] as const;
export const fanletterRealismRevisionReasons = [
  "adult_age_continuity",
  "impossible_physics",
  "private_location",
  "real_person_impersonation",
] as const;
export const creatorAvatarExpressions = [
  "default",
  "smile",
  "serious",
  "reaction",
  "shy",
  "focus",
  "fanservice",
  "thumbnail",
] as const;

export type CreatorProfileStatus = (typeof creatorProfileStatuses)[number];
export type ContentPostStatus = (typeof contentPostStatuses)[number];
export type ContentPriceType = (typeof contentPriceTypes)[number];
export type ContentVideoMimeType = (typeof contentVideoMimeTypes)[number];
export type ContentFeedView = (typeof contentFeedViews)[number];
export type ContentAssetKind = (typeof contentAssetKinds)[number];
export type ContentOrderStatus = (typeof contentOrderStatuses)[number];
export type ContentEntitlementSource =
  (typeof contentEntitlementSources)[number];
export type FanletterFanRequestType =
  (typeof fanletterFanRequestTypes)[number];
export type FanletterFanRequestStatus =
  (typeof fanletterFanRequestStatuses)[number];
export type FanletterFanRequestTemplateCategory =
  (typeof fanletterFanRequestTemplateCategories)[number];
export type FanletterFanRequestTemplateStatus =
  (typeof fanletterFanRequestTemplateStatuses)[number];
export type FanletterRealismRevisionReason =
  (typeof fanletterRealismRevisionReasons)[number];
export type ContentAccessGateReason =
  | "connect"
  | "network"
  | "paid"
  | "signup";
export type ContentCoverGenerationProgressStep =
  (typeof contentCoverGenerationProgressSteps)[number];
export type ContentImageGenerationProvider =
  | "fal-reference"
  | "fal-text"
  | "replicate";
export type ContentImageGenerationStatus = "failed" | "running" | "succeeded";
export type ContentVideoAssetSource = "generated" | "unknown" | "uploaded";

const contentVideoPolicyErrorMessages = new Set([
  CONTENT_PAID_REQUIRES_UPLOADED_VIDEO_ERROR,
  CONTENT_UPLOADED_VIDEO_PAID_ONLY_ERROR,
  CONTENT_AI_GENERATED_VIDEO_FREE_ONLY_ERROR,
  CONTENT_VIDEO_SOURCE_REQUIRED_ERROR,
  CONTENT_VIDEO_SOURCE_MIXED_ERROR,
]);

function safelyDecodePathSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function getPathSegmentsFromContentUrl(url: string) {
  const trimmedUrl = url.trim();
  let pathname = trimmedUrl;

  try {
    pathname = new URL(trimmedUrl).pathname;
  } catch {
    pathname = trimmedUrl.split(/[?#]/, 1)[0] ?? trimmedUrl;
  }

  return pathname
    .split("/")
    .map((segment) => safelyDecodePathSegment(segment.trim()))
    .filter(Boolean);
}

export function getContentVideoAssetSource(
  url: string | null | undefined,
): ContentVideoAssetSource {
  if (!url?.trim()) {
    return "unknown";
  }

  const segments = getPathSegmentsFromContentUrl(url);
  const contentRootIndex = segments.indexOf(CONTENT_POSTS_BLOB_PATH_SEGMENT);
  const sourceSegment =
    contentRootIndex >= 0 ? segments[contentRootIndex + 2] : undefined;

  if (sourceSegment === CONTENT_GENERATED_VIDEO_PATH_SEGMENT) {
    return "generated";
  }

  if (sourceSegment === CONTENT_UPLOADED_VIDEO_PATH_SEGMENT) {
    return "uploaded";
  }

  return "unknown";
}

export function hasGeneratedContentVideoUrl(urls: string[] | undefined) {
  return (urls ?? []).some((url) => getContentVideoAssetSource(url) === "generated");
}

export function hasUploadedContentVideoUrl(urls: string[] | undefined) {
  return (urls ?? []).some((url) => getContentVideoAssetSource(url) === "uploaded");
}

export function isContentVideoPolicyErrorMessage(message: string) {
  return contentVideoPolicyErrorMessages.has(message);
}

export type ContentImageGenerationAttemptDocument = {
  attemptId: string;
  completedAt?: Date | null;
  errorMessage?: string | null;
  errorStatus?: number | null;
  model: string;
  modelInput: Record<string, unknown>;
  promptStrategy?: string | null;
  provider: ContentImageGenerationProvider;
  resultContentType?: string | null;
  resultSourceUrl?: string | null;
  startedAt: Date;
  status: ContentImageGenerationStatus;
};

export type ContentImageGenerationDocument = {
  attempts: ContentImageGenerationAttemptDocument[];
  avatarImageUrl?: string | null;
  completedAt?: Date | null;
  contentType?: string | null;
  createdAt: Date;
  errorMessage?: string | null;
  finalPrompt: string;
  generationId: string;
  memberEmail: string;
  normalizedPrompt: string;
  originalPrompt: string;
  pathname?: string | null;
  personaId?: string | null;
  personaName?: string | null;
  providerPriority: "fal" | "replicate";
  referralCode: string;
  resultUrl?: string | null;
  sourceUrl?: string | null;
  status: ContentImageGenerationStatus;
  summary: string;
  title: string;
  updatedAt: Date;
};

export type CreatorProfileDocument = {
  avatarImageSet?: CreatorProfileAvatarCandidate[] | null;
  avatarImageUrl?: string | null;
  characterPersona?: CreatorCharacterPersona | null;
  configuredAt?: Date | null;
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

export type CreatorCharacterPersona = {
  avoidChanges: string[];
  id: string;
  identityPrompt: string;
  lockedTraits: string[];
  name: string;
  realismProfile?: CreatorCharacterRealismProfile | null;
  summary: string;
};

export type CreatorCharacterWorldLocation = {
  countryCode: string;
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type CreatorCharacterRealismProfile = {
  agePolicy: "adult_age_continuity";
  disclosure: "fictional_ai_character";
  groundingMode: "real_world";
  locationPolicy: "public_or_fictionalized";
  physicsPolicy: "ordinary_human_physics";
  realPersonPolicy: "no_real_person_impersonation";
  timePolicy: "timezone_season_consistent";
  worldLocation?: CreatorCharacterWorldLocation | null;
};

export type FanletterVlogPlanMediaMode = "video";
export type FanletterVlogPlanStatus =
  | "created"
  | "distributed"
  | "planned"
  | "published"
  | "skipped";

export type FanletterVlogPlanItem = {
  captionHook: string;
  checklist: string[];
  contentId?: string | null;
  dayLabel: string;
  distributedAt?: string | null;
  generatedAt?: string | null;
  id: string;
  mediaMode: FanletterVlogPlanMediaMode;
  platformAngle: string;
  scheduledFor?: string | null;
  scenePrompt: string;
  status?: FanletterVlogPlanStatus;
  summary: string;
  title: string;
  updatedAt?: string | null;
};

export type FanletterVlogPlannerResponse = {
  generatedAt: string;
  plans: FanletterVlogPlanItem[];
};

export type FanletterVlogPlanDocument = {
  captionHook: string;
  checklist: string[];
  contentId?: string | null;
  createdAt: Date;
  dayIndex: number;
  dayLabel: string;
  distributedAt?: Date | null;
  generatedAt: Date;
  generationId: string;
  mediaMode: FanletterVlogPlanMediaMode;
  memberEmail: string;
  platformAngle: string;
  planId: string;
  scheduledFor: string;
  scenePrompt: string;
  status: FanletterVlogPlanStatus;
  summary: string;
  title: string;
  updatedAt: Date;
};

export type FanletterFanRequestDocument = {
  body: string;
  characterName: string;
  createdAt: Date;
  creatorDisplayName: string;
  creatorEmail: string;
  creatorReferralCode: string;
  requestId: string;
  requestType: FanletterFanRequestType;
  requesterDisplayName: string | null;
  requesterEmail: string | null;
  requesterFingerprint?: string | null;
  originalBody?: string | null;
  realismReviewedAt?: Date | null;
  realismRevisionReasons?: FanletterRealismRevisionReason[] | null;
  sourceContentId: string | null;
  sourcePath: string | null;
  status: FanletterFanRequestStatus;
  templateCategory?: FanletterFanRequestTemplateCategory | null;
  templateId?: string | null;
  templateTitle?: string | null;
  usedContentId?: string | null;
  updatedAt: Date;
};

export type FanletterFanRequestTemplateDocument = {
  body: string;
  category: FanletterFanRequestTemplateCategory;
  createdAt: Date;
  creatorReferralCode: string | null;
  locale: Locale;
  requestType: FanletterFanRequestType;
  sortOrder: number;
  status: FanletterFanRequestTemplateStatus;
  templateId: string;
  title: string;
  updatedAt: Date;
  usageCount: number;
};

export type FanletterCharacterFollowDocument = {
  createdAt: Date;
  creatorEmail: string;
  creatorReferralCode: string;
  followerEmail: string;
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
  contentVideoUrls?: string[];
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

export type ContentSocialActionDocument = {
  contentId: string;
  createdAt: Date;
  hidden: boolean;
  liked: boolean;
  memberEmail: string;
  saved: boolean;
  updatedAt: Date;
};

export type ContentCommentDocument = {
  body: string;
  commentId: string;
  contentId: string;
  createdAt: Date;
  memberEmail: string;
  updatedAt: Date;
};

export type CreatorProfileRecord = {
  avatarImageSet: CreatorProfileAvatarCandidate[];
  avatarImageUrl: string | null;
  characterPersona: CreatorCharacterPersona | null;
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
  contentImageCount: number;
  contentImageUrls: string[];
  contentVideoCount: number;
  contentVideoUrls: string[];
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

export type ContentSocialSummaryRecord = {
  commentCount: number;
  hiddenByViewer: boolean;
  likeCount: number;
  likedByViewer: boolean;
  paidBuyerCount: number;
  paidTotalUsdt: string;
  saveCount: number;
  savedByViewer: boolean;
};

export type ContentCommentRecord = {
  authorAvatarImageUrl: string | null;
  authorDisplayName: string;
  body: string;
  commentId: string;
  contentId: string;
  createdAt: string;
  memberEmail: string;
};

export type FanletterFanRequestRecord = {
  body: string;
  characterName: string;
  createdAt: string;
  creatorDisplayName: string;
  creatorReferralCode: string;
  requestId: string;
  requestType: FanletterFanRequestType;
  requesterDisplayName: string | null;
  requesterEmail: string | null;
  realismReviewedAt: string | null;
  realismRevised: boolean;
  realismRevisionReasons: FanletterRealismRevisionReason[];
  sourceContentId: string | null;
  sourcePath: string | null;
  status: FanletterFanRequestStatus;
  templateCategory: FanletterFanRequestTemplateCategory | null;
  templateId: string | null;
  templateTitle: string | null;
  usedContentId: string | null;
  updatedAt: string;
};

export type FanletterFanRequestCreateRequest = {
  body?: string | null;
  characterName?: string | null;
  creatorReferralCode?: string | null;
  requestType?: string | null;
  requesterDisplayName?: string | null;
  sourceContentId?: string | null;
  sourcePath?: string | null;
  templateId?: string | null;
};

export type FanletterFanRequestCreateResponse = {
  request: FanletterFanRequestRecord;
};

export type FanletterFanRequestsResponse = {
  pageInfo: {
    hasNextPage: boolean;
    pageSize: number;
  };
  requests: FanletterFanRequestRecord[];
};

export type FanletterFanRequestTemplateRecord = {
  body: string;
  category: FanletterFanRequestTemplateCategory;
  creatorReferralCode: string | null;
  locale: Locale;
  requestType: FanletterFanRequestType;
  templateId: string;
  title: string;
  usageCount: number;
};

export type FanletterFanRequestTemplatesResponse = {
  templates: FanletterFanRequestTemplateRecord[];
};

export type FanletterFanRequestStatusUpdateRequest = {
  contentId?: string | null;
  email?: string | null;
  requestId?: string | null;
  status?: string | null;
  walletAddress?: string | null;
};

export type FanletterFanRequestStatusUpdateResponse = {
  request: FanletterFanRequestRecord;
};

export type FanletterCharacterFollowStateResponse = {
  followed: boolean;
  followerCount: number;
};

export type FanletterFollowedCharacterLatestContentRecord = {
  contentId: string;
  coverImageUrl: string | null;
  mediaType: "image" | "text" | "video";
  primaryVideoUrl: string | null;
  publishedAt: string | null;
  summary: string;
  title: string;
};

export type FanletterFollowedCharacterRecord = {
  avatarImageUrl: string | null;
  characterName: string;
  characterSummary: string;
  displayName: string;
  followedAt: string;
  followerCount: number;
  latestContent: FanletterFollowedCharacterLatestContentRecord | null;
  publicContentCount: number;
  referralCode: string;
  traits: string[];
  updatedAt: string;
  videoContentCount: number;
};

export type FanletterFollowedCharactersResponse = {
  characters: FanletterFollowedCharacterRecord[];
};

export type FanletterCharacterFollowUpdateRequest = {
  action?: "follow" | "unfollow" | null;
  creatorReferralCode?: string | null;
  email?: string | null;
  walletAddress?: string | null;
};

export type ContentFeedItemRecord = ContentPostRecord & {
  authorProfile: CreatorProfileRecord | null;
  canAccess: boolean;
  networkLevel: number | null;
  previewAssets: ContentAssetRecord[];
  social: ContentSocialSummaryRecord;
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

export type ContentSaleOrderRecord = ContentOrderRecord & {
  buyerEmail: string;
  buyerReferralCode: string | null;
  contentTitle: string;
  contentCoverImageUrl: string | null;
};

export type ContentSellerWalletBalanceRecord = {
  amountUsdt: string;
  amountWei: string;
  symbol: string;
};

export type ContentSalesSummaryRecord = {
  availableBalanceUsdt: string;
  confirmedSalesCount: number;
  pendingSalesCount: number;
  totalSalesCount: number;
  totalSalesUsdt: string;
};

export type ContentSalesDashboardResponse = {
  balance: ContentSellerWalletBalanceRecord | null;
  member: MemberRecord;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  profile: CreatorProfileRecord;
  sales: ContentSaleOrderRecord[];
  sellerWalletAddress: string | null;
  summary: ContentSalesSummaryRecord;
};

export type ContentSellerWithdrawalRequest = {
  amountUsdt?: string | null;
  email: string;
  walletAddress?: string;
};

export type ContentSellerWithdrawalResponse = {
  balance: ContentSellerWalletBalanceRecord | null;
  destinationWalletAddress: string;
  transactionHash: string | null;
  transactionId: string;
  withdrawnAmountUsdt: string;
  withdrawnAmountWei: string;
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
  social: ContentSocialSummaryRecord;
};

export type ContentDetailLoadResponse = {
  content: ContentDetailRecord | null;
  gateReason: ContentAccessGateReason | null;
  member: MemberRecord | null;
  social: ContentSocialSummaryRecord | null;
  validationError: string | null;
};

export type ContentLibraryResponse = {
  items: ContentFeedItemRecord[];
};

export type CreatorProfileResponse = {
  automationAvailable?: boolean;
  characterWarning?: string;
  member?: MemberRecord | null;
  profile: CreatorProfileRecord;
  profileConfigured: boolean;
};

export type CreatorProfileUploadResponse = {
  contentType: string;
  pathname: string;
  url: string;
};

export type CreatorProfileAvatarCandidate = {
  contentType: string;
  expression?: (typeof creatorAvatarExpressions)[number];
  label?: string;
  pathname: string;
  url: string;
};

export type CreatorProfileAvatarGenerateResponse = {
  candidates: CreatorProfileAvatarCandidate[];
};

export type CreatorCharacterPersonaGenerateResponse = {
  candidates: CreatorCharacterPersona[];
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

export type ContentGenerationFailureKind =
  | "provider_rejection"
  | "safety"
  | "timeout"
  | "unknown"
  | "validation";

export type ContentGenerationFailureFieldError = {
  loc: Array<number | string>;
  msg: string;
  type: string;
};

export type ContentGenerationFailureDiagnostic = {
  fieldErrors: ContentGenerationFailureFieldError[];
  kind: ContentGenerationFailureKind;
  message: string;
  model: string | null;
  modelFamily: string | null;
  modelInput: {
    aspectRatio: string | null;
    duration: number | string | null;
    enablePromptExpansion: boolean | null;
    enableSafetyChecker: boolean | null;
    generateAudio: boolean | null;
    negativePromptLength: number;
    promptLength: number;
    referenceImageCount?: number | null;
    resolution: string | null;
    safetyTolerance: string | null;
  };
  requestId: string | null;
  responseSummary: string | null;
  status: number | null;
};

export type ContentPostGenerateCoverProgressEvent = {
  message: string;
  progress: number;
  status: "completed" | "failed" | "running";
  step: ContentCoverGenerationProgressStep;
};

export type ContentPostGenerateCoverStreamEvent =
  | {
      progress: ContentPostGenerateCoverProgressEvent;
      type: "progress";
    }
  | {
      response: ContentPostGenerateCoverResponse;
      type: "result";
    }
  | {
      diagnostic?: ContentGenerationFailureDiagnostic | null;
      error: string;
      type: "error";
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
  profileConfigured: boolean;
  summary: {
    all: number;
    archived: number;
    draft: number;
    published: number;
  };
};

export type CreatorStudioPostsLoadResponse = {
  member: MemberRecord | null;
  pageInfo: CreatorStudioPostsResponse["pageInfo"] | null;
  posts: ContentPostRecord[];
  profile: CreatorProfileRecord | null;
  profileConfigured: boolean;
  summary: CreatorStudioPostsResponse["summary"];
  validationError: string | null;
};

export type CreatorProfileUpsertRequest = {
  avatarImageSet?: CreatorProfileAvatarCandidate[] | null;
  avatarImageUrl?: string | null;
  characterPersona?: CreatorCharacterPersona | null;
  displayName: string;
  email: string;
  heroImageUrl?: string | null;
  intro: string;
  payoutWalletAddress?: string | null;
  walletAddress?: string;
};

export type CreatorProfileCharacterUpdateRequest = {
  avatarImageSet?: CreatorProfileAvatarCandidate[] | null;
  avatarImageUrl?: string | null;
  characterPersona: CreatorCharacterPersona;
  displayName?: string | null;
  email: string;
  intro?: string | null;
  walletAddress?: string;
};

export type ContentPostCreateRequest = {
  body: string;
  contentImageUrls?: string[];
  contentVideoUrls?: string[];
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
  referralCode?: string | null;
  walletAddress?: string;
};

export type ContentOrderCreateResponse = {
  order: ContentOrderRecord;
  recipientWalletAddress: string;
};

export type ContentOrderVerifyRequest = {
  email: string;
  txHash: string;
  walletAddress?: string;
};

export type ContentOrderVerifyResponse = {
  entitlementGranted: boolean;
  order: ContentOrderRecord;
};

export type ContentSocialActionRequest = {
  action: "hide" | "like" | "save";
  email: string;
  value: boolean;
  walletAddress: string;
};

export type ContentSocialResponse = {
  social: ContentSocialSummaryRecord;
};

export type ContentCommentsResponse = {
  comments: ContentCommentRecord[];
  pageInfo: {
    hasMore: boolean;
    nextOffset: number | null;
    offset: number;
    pageSize: number;
  };
  social: ContentSocialSummaryRecord;
};

export type ContentCommentCreateRequest = {
  body: string;
  email: string;
  walletAddress: string;
};

export type ContentCommentCreateResponse = {
  comment: ContentCommentRecord;
  social: ContentSocialSummaryRecord;
};

export function serializeCreatorProfile(
  profile: CreatorProfileDocument,
): CreatorProfileRecord {
  return {
    avatarImageSet: profile.avatarImageSet ?? [],
    avatarImageUrl: profile.avatarImageUrl ?? null,
    characterPersona: profile.characterPersona ?? null,
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
    contentImageCount: content.contentImageUrls?.length ?? 0,
    contentImageUrls: content.contentImageUrls ?? [],
    contentVideoCount: content.contentVideoUrls?.length ?? 0,
    contentVideoUrls: content.contentVideoUrls ?? [],
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

export function createEmptyContentSocialSummary(
  overrides?: Partial<ContentSocialSummaryRecord>,
): ContentSocialSummaryRecord {
  return {
    commentCount: 0,
    hiddenByViewer: false,
    likeCount: 0,
    likedByViewer: false,
    paidBuyerCount: 0,
    paidTotalUsdt: "0",
    saveCount: 0,
    savedByViewer: false,
    ...overrides,
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

export function serializeContentSaleOrder(
  order: ContentOrderDocument,
  content?: Pick<ContentPostDocument, "coverImageUrl" | "title"> | null,
): ContentSaleOrderRecord {
  return {
    ...serializeContentOrder(order),
    buyerEmail: order.buyerEmail,
    buyerReferralCode: order.buyerReferralCode ?? null,
    contentCoverImageUrl: content?.coverImageUrl ?? null,
    contentTitle: content?.title ?? order.contentId,
  };
}

export function createEmptyContentFeed(member: MemberRecord): ContentFeedResponse {
  return {
    items: [],
    member,
    nextCursor: null,
  };
}
