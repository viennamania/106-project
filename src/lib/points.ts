import type { MemberRecord } from "@/lib/member";

export const POINT_HISTORY_LIMIT = 24;
export const REWARD_REDEMPTION_HISTORY_LIMIT = 12;

export const pointTiers = ["basic", "silver", "gold", "vip"] as const;
export const pointLedgerTypes = [
  "earn",
  "spend",
  "expire",
  "rollback",
  "admin_adjustment",
] as const;
export const pointLedgerSourceTypes = [
  "referral_reward",
  "tier_upgrade",
  "nft_redemption",
  "discount_redemption",
  "bonus",
  "admin",
] as const;
export const rewardCatalogIds = [
  "silver-card",
  "gold-card",
  "vip-pass",
  "service-credit",
] as const;
export const rewardTypes = [
  "tier_upgrade",
  "nft_claim",
  "discount_coupon",
] as const;
export const rewardRedemptionStatuses = [
  "pending",
  "queued",
  "completed",
  "failed",
  "cancelled",
] as const;

export type PointTier = (typeof pointTiers)[number];
export type PointLedgerType = (typeof pointLedgerTypes)[number];
export type PointLedgerSourceType = (typeof pointLedgerSourceTypes)[number];
export type RewardCatalogId = (typeof rewardCatalogIds)[number];
export type RewardType = (typeof rewardTypes)[number];
export type RewardRedemptionStatus = (typeof rewardRedemptionStatuses)[number];

export type PointTierRule = {
  minPoints: number;
  tier: PointTier;
};

export const POINT_TIER_RULES: PointTierRule[] = [
  { minPoints: 0, tier: "basic" },
  { minPoints: 1_000, tier: "silver" },
  { minPoints: 5_000, tier: "gold" },
  { minPoints: 20_000, tier: "vip" },
];

export type RewardCatalogItemRecord = {
  costPoints: number;
  rewardId: RewardCatalogId;
  rewardType: RewardType;
  sortOrder: number;
  tierTarget: PointTier | null;
};

export const REWARD_CATALOG: RewardCatalogItemRecord[] = [
  {
    costPoints: 1_000,
    rewardId: "silver-card",
    rewardType: "tier_upgrade",
    sortOrder: 10,
    tierTarget: "silver",
  },
  {
    costPoints: 5_000,
    rewardId: "gold-card",
    rewardType: "tier_upgrade",
    sortOrder: 20,
    tierTarget: "gold",
  },
  {
    costPoints: 10_000,
    rewardId: "vip-pass",
    rewardType: "nft_claim",
    sortOrder: 30,
    tierTarget: null,
  },
  {
    costPoints: 20_000,
    rewardId: "service-credit",
    rewardType: "discount_coupon",
    sortOrder: 40,
    tierTarget: null,
  },
];

export type PointLedgerDocument = {
  createdAt: Date;
  delta: number;
  ledgerEntryId: string;
  memberEmail: string;
  memo?: string | null;
  rewardLevel?: number | null;
  sourceId?: string | null;
  sourceMemberEmail?: string | null;
  sourceType: PointLedgerSourceType;
  type: PointLedgerType;
  updatedAt: Date;
};

export type PointBalanceDocument = {
  createdAt: Date;
  loyaltyCardTokenId?: string | null;
  memberEmail: string;
  reservedPoints: number;
  spendablePoints: number;
  tier: PointTier;
  lifetimePoints: number;
  updatedAt: Date;
};

export type RewardRedemptionDocument = {
  contractAddress?: string | null;
  costPoints: number;
  createdAt: Date;
  engineQueueId?: string | null;
  failureReason?: string | null;
  memberEmail: string;
  redemptionId: string;
  rewardId: RewardCatalogId;
  status: RewardRedemptionStatus;
  tokenId?: string | null;
  tokenUri?: string | null;
  txHash?: string | null;
  updatedAt: Date;
};

export type PointLedgerRecord = {
  createdAt: string;
  delta: number;
  ledgerEntryId: string;
  memo: string | null;
  rewardLevel: number | null;
  sourceId: string | null;
  sourceMemberEmail: string | null;
  sourceType: PointLedgerSourceType;
  type: PointLedgerType;
};

export type RewardRedemptionRecord = {
  contractAddress: string | null;
  costPoints: number;
  createdAt: string;
  engineQueueId: string | null;
  failureReason: string | null;
  redemptionId: string;
  rewardId: RewardCatalogId;
  status: RewardRedemptionStatus;
  tokenId: string | null;
  tokenUri: string | null;
  txHash: string | null;
};

export type PointsSummaryRecord = {
  history: PointLedgerRecord[];
  lifetimePoints: number;
  nextTier: PointTier | null;
  nextTierThreshold: number | null;
  pointsToNextTier: number;
  progressPercent: number;
  reservedPoints: number;
  spendablePoints: number;
  tier: PointTier;
  updatedAt: string | null;
};

export type PointsSummaryResponse = {
  member: MemberRecord;
  summary: PointsSummaryRecord;
};

export type RewardCatalogResponse = {
  rewards: RewardCatalogItemRecord[];
};

export type RewardRedemptionsResponse = {
  redemptions: RewardRedemptionRecord[];
};

export type RewardRedeemRequest = {
  email: string;
  rewardId: RewardCatalogId;
  walletAddress: string;
};

export type RewardRedeemResponse = {
  member: MemberRecord;
  redemption: RewardRedemptionRecord;
  redemptions: RewardRedemptionRecord[];
  summary: PointsSummaryRecord;
};

export function createEmptyPointsSummary(): PointsSummaryRecord {
  return {
    history: [],
    lifetimePoints: 0,
    nextTier: "silver",
    nextTierThreshold: 1_000,
    pointsToNextTier: 1_000,
    progressPercent: 0,
    reservedPoints: 0,
    spendablePoints: 0,
    tier: "basic",
    updatedAt: null,
  };
}

export function getPointTier(points: number): PointTier {
  let tier: PointTier = POINT_TIER_RULES[0]?.tier ?? "basic";

  for (const rule of POINT_TIER_RULES) {
    if (points >= rule.minPoints) {
      tier = rule.tier;
      continue;
    }

    break;
  }

  return tier;
}

export function getPointTierProgress(points: number) {
  const currentRule =
    [...POINT_TIER_RULES].reverse().find((rule) => points >= rule.minPoints) ??
    POINT_TIER_RULES[0];
  const nextRule =
    POINT_TIER_RULES.find((rule) => rule.minPoints > points) ?? null;
  const tier = currentRule?.tier ?? "basic";

  if (!nextRule) {
    return {
      nextTier: null,
      nextTierThreshold: null,
      pointsToNextTier: 0,
      progressPercent: 100,
      tier,
    };
  }

  const currentThreshold = currentRule?.minPoints ?? 0;
  const range = Math.max(nextRule.minPoints - currentThreshold, 1);
  const progressPercent = Math.max(
    0,
    Math.min(
      100,
      Math.round(((points - currentThreshold) / range) * 100),
    ),
  );

  return {
    nextTier: nextRule.tier,
    nextTierThreshold: nextRule.minPoints,
    pointsToNextTier: Math.max(nextRule.minPoints - points, 0),
    progressPercent,
    tier,
  };
}

export function serializePointLedger(
  entry: PointLedgerDocument,
): PointLedgerRecord {
  return {
    createdAt: entry.createdAt.toISOString(),
    delta: entry.delta,
    ledgerEntryId: entry.ledgerEntryId,
    memo: entry.memo ?? null,
    rewardLevel: entry.rewardLevel ?? null,
    sourceId: entry.sourceId ?? null,
    sourceMemberEmail: entry.sourceMemberEmail ?? null,
    sourceType: entry.sourceType,
    type: entry.type,
  };
}

export function serializeRewardRedemption(
  redemption: RewardRedemptionDocument,
): RewardRedemptionRecord {
  return {
    contractAddress: redemption.contractAddress ?? null,
    costPoints: redemption.costPoints,
    createdAt: redemption.createdAt.toISOString(),
    engineQueueId: redemption.engineQueueId ?? null,
    failureReason: redemption.failureReason ?? null,
    redemptionId: redemption.redemptionId,
    rewardId: redemption.rewardId,
    status: redemption.status,
    tokenId: redemption.tokenId ?? null,
    tokenUri: redemption.tokenUri ?? null,
    txHash: redemption.txHash ?? null,
  };
}

export function isRewardCatalogId(value: string): value is RewardCatalogId {
  return rewardCatalogIds.includes(value as RewardCatalogId);
}
