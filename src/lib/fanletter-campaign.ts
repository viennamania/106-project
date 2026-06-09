export const fanletterCampaignCategories = [
  "living_appliance",
  "beauty",
  "food",
  "health",
  "fashion",
  "tech_gadget",
  "goods",
] as const;

export const fanletterCampaignGoals = [
  "click",
  "coupon",
  "purchase",
  "live_view",
] as const;

export const fanletterCampaignStatuses = [
  "draft",
  "pending_admin",
  "approved",
  "active",
  "paused",
  "completed",
  "rejected",
] as const;

export const fanletterCampaignEventTypes = [
  "impression",
  "click",
  "share",
  "coupon_download",
  "purchase",
  "live_view",
  "signup",
] as const;

export const fanletterCampaignPlacementChannels = [
  "fanletter_news_cut",
] as const;

export const fanletterCampaignPlacementVerificationStatuses = [
  "verified",
  "unverified",
] as const;

export type FanletterCampaignCategory =
  (typeof fanletterCampaignCategories)[number];
export type FanletterCampaignGoal = (typeof fanletterCampaignGoals)[number];
export type FanletterCampaignStatus =
  (typeof fanletterCampaignStatuses)[number];
export type FanletterCampaignEventType =
  (typeof fanletterCampaignEventTypes)[number];
export type FanletterCampaignPlacementChannel =
  (typeof fanletterCampaignPlacementChannels)[number];
export type FanletterCampaignPlacementVerificationStatus =
  (typeof fanletterCampaignPlacementVerificationStatuses)[number];

export type FanletterCampaignCharacter = {
  baseScore: number;
  categories: FanletterCampaignCategory[];
  hook: string;
  id: string;
  mark: string;
  name: string;
  role: string;
};

export type FanletterCampaignProduct = {
  benefit: string;
  brand: string;
  category: FanletterCampaignCategory;
  name: string;
  price: string;
  prohibitedCopy: string;
  requiredCopy: string;
  url: string;
};

export type FanletterCampaignAnalysis = {
  audience: string;
  goal: FanletterCampaignGoal;
  growth: string;
  motivation: string;
  risk: "low" | "medium" | "notice" | "high";
  shareTarget: string;
  summary: string;
  type: string;
};

export type FanletterCampaignMatch = {
  character: FanletterCampaignCharacter;
  fitReason: string;
  fitScore: number;
  riskNotes: string;
};

export type FanletterCampaignBrief = {
  complianceCopy: string;
  shareCopy: string;
  storyHook: string;
};

export type FanletterCampaignDraft = {
  analysis: FanletterCampaignAnalysis;
  brief: FanletterCampaignBrief;
  goalLabel: string;
  matches: FanletterCampaignMatch[];
  product: FanletterCampaignProduct;
  questName: string;
  selectedCharacter: FanletterCampaignCharacter;
  shareSlug: string;
};

export type FanletterCampaignPlacementDocument = {
  channel: FanletterCampaignPlacementChannel;
  contentId: string | null;
  createdAt: Date;
  creatorReferralCode: string | null;
  cutSlotNumber: number | null;
  label: string;
  placementId: string;
  reportId: string | null;
  reporterReferralCode: string | null;
  shareId: string;
  shareUrl: string;
  targetHref: string | null;
  updatedAt: Date;
  verificationStatus: FanletterCampaignPlacementVerificationStatus;
};

export type FanletterCampaignDocument = FanletterCampaignDraft & {
  advertiserId: string;
  approvedAt: Date | null;
  campaignId: string;
  characterId: string;
  createdAt: Date;
  placements?: FanletterCampaignPlacementDocument[];
  publishedAt: Date | null;
  status: FanletterCampaignStatus;
  updatedAt: Date;
};

export type FanletterCampaignEventDocument = {
  campaignId: string;
  characterId: string;
  createdAt: Date;
  eventId: string;
  eventType: FanletterCampaignEventType;
  eventValue: number;
  progressDelta: number;
  source: string;
};

export type FanletterCampaignReport = {
  byType: Partial<Record<FanletterCampaignEventType, number>>;
  progressCount: number;
  total: number;
};

export type FanletterCampaignEventRecord = {
  campaignId: string;
  characterId: string;
  createdAt: string;
  eventId: string;
  eventType: FanletterCampaignEventType;
  eventValue: number;
  progressDelta: number;
  source: string;
};

export type FanletterCampaignPlacementMetrics = {
  cutViews: number;
  eventCount: number;
  lastEventAt: string | null;
  loadMoreEvents: number;
  sourceOpenClicks: number;
};

export type FanletterCampaignPlacementRecord = Omit<
  FanletterCampaignPlacementDocument,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  metrics: FanletterCampaignPlacementMetrics;
  updatedAt: string;
};

export type FanletterCampaignRecord = Omit<
  FanletterCampaignDocument,
  "approvedAt" | "createdAt" | "placements" | "publishedAt" | "updatedAt"
> & {
  approvedAt: string | null;
  createdAt: string;
  events: FanletterCampaignEventRecord[];
  placements: FanletterCampaignPlacementRecord[];
  progressCount: number;
  publishedAt: string | null;
  report: FanletterCampaignReport;
  updatedAt: string;
};

export type FanletterCampaignAnalyzeRequest = {
  benefitText?: string | null;
  brandName?: string | null;
  campaignGoal?: string | null;
  category?: string | null;
  forceInfer?: boolean | null;
  priceAmount?: string | null;
  productName?: string | null;
  productUrl?: string | null;
  prohibitedCopy?: string | null;
  requiredCopy?: string | null;
  selectedCharacterId?: string | null;
};

export type FanletterCampaignCreateRequest = FanletterCampaignAnalyzeRequest & {
  advertiserId?: string | null;
};

export type FanletterCampaignStatusUpdateRequest = {
  status?: string | null;
};

export type FanletterCampaignEventCreateRequest = {
  eventType?: string | null;
  eventValue?: number | string | null;
  source?: string | null;
};

export type FanletterCampaignPlacementAttachRequest = {
  channel?: string | null;
  label?: string | null;
  shareId?: string | null;
  shareUrl?: string | null;
};

export type FanletterCampaignsResponse = {
  campaigns: FanletterCampaignRecord[];
  statusCounts: Partial<Record<FanletterCampaignStatus, number>>;
};

export type FanletterCampaignResponse = {
  campaign: FanletterCampaignRecord;
};

export type FanletterCampaignAnalyzeResponse = {
  draft: FanletterCampaignDraft;
};

export const fanletterCampaignCharacters: FanletterCampaignCharacter[] = [
  {
    baseScore: 74,
    categories: ["living_appliance", "food", "goods"],
    hook: "방과 루틴이 좋아질수록 생활력이 오르는 캐릭터",
    id: "harin",
    mark: "하",
    name: "하린",
    role: "자취 생활 캐릭터",
  },
  {
    baseScore: 70,
    categories: ["beauty", "health", "fashion"],
    hook: "상품을 비교하고 팬에게 맞는 사용 루틴을 제안하는 캐릭터",
    id: "mina",
    mark: "미",
    name: "미나",
    role: "뷰티 큐레이터",
  },
  {
    baseScore: 72,
    categories: ["tech_gadget", "living_appliance"],
    hook: "새 장비를 테스트하며 리뷰 레벨이 오르는 캐릭터",
    id: "ido",
    mark: "이",
    name: "이도",
    role: "IT 리뷰어",
  },
  {
    baseScore: 68,
    categories: ["fashion", "beauty", "goods"],
    hook: "팬의 응원과 선택이 무대 준비에 반영되는 캐릭터",
    id: "yoonseo",
    mark: "윤",
    name: "윤서",
    role: "아이돌 연습생",
  },
  {
    baseScore: 69,
    categories: ["health", "food", "fashion"],
    hook: "팬들과 함께 루틴을 완성하며 활동 레벨이 오르는 캐릭터",
    id: "doyun",
    mark: "도",
    name: "도윤",
    role: "운동 루틴 코치",
  },
];

export const fanletterCampaignCategoryLabels: Record<
  FanletterCampaignCategory,
  string
> = {
  beauty: "뷰티",
  fashion: "패션",
  food: "식품",
  goods: "굿즈",
  health: "건강",
  living_appliance: "생활가전",
  tech_gadget: "IT가젯",
};

export const fanletterCampaignGoalLabels: Record<
  FanletterCampaignGoal,
  string
> = {
  click: "클릭",
  coupon: "쿠폰",
  live_view: "라방 유입",
  purchase: "구매",
};

export const fanletterCampaignStatusLabels: Record<
  FanletterCampaignStatus,
  string
> = {
  active: "활성",
  approved: "승인 완료",
  completed: "종료",
  draft: "초안",
  paused: "일시중지",
  pending_admin: "승인 대기",
  rejected: "반려",
};
