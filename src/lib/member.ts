import type { LandingBrandingDocument } from "@/lib/landing-branding";

export const MEMBER_SIGNUP_USDT_AMOUNT = "10";
export const MEMBER_SIGNUP_USDT_DECIMALS = 18;
export const MEMBER_SIGNUP_USDT_AMOUNT_WEI = "10000000000000000000";
export const REFERRAL_SIGNUP_LIMIT = 6;
export const REFERRAL_TREE_DEPTH_LIMIT = 6;
export const REFERRAL_REWARD_POINTS_LEVEL_ONE = 200;
export const REFERRAL_REWARD_POINTS_OTHER_LEVELS = 80;
export const REFERRAL_REWARD_HISTORY_LIMIT = 24;

export const memberStatuses = ["pending_payment", "completed"] as const;
export const placementSources = ["manual", "auto"] as const;

export type MemberStatus = (typeof memberStatuses)[number];
export type PlacementSource = (typeof placementSources)[number];

export type MemberRecord = {
  awaitingPaymentSince: string;
  chainId: number;
  chainName: string;
  createdAt: string;
  email: string;
  lastConnectedAt: string;
  lastWalletAddress: string;
  locale: string;
  paymentAmount: string | null;
  paymentReceivedAt: string | null;
  paymentTransactionHash: string | null;
  paymentWebhookEventId: string | null;
  placementAssignedAt: string | null;
  placementEmail: string | null;
  placementReferralCode: string | null;
  placementSlotIndex: number | null;
  placementSource: PlacementSource | null;
  referralRewardsIssuedAt: string | null;
  referralCode: string | null;
  referredByCode: string | null;
  referredByEmail: string | null;
  registrationCompletedAt: string | null;
  requiredDepositAmount: string;
  requiredDepositAmountWei: string;
  sponsorEmail: string | null;
  sponsorReferralCode: string | null;
  status: MemberStatus;
  updatedAt: string;
  walletAddresses: string[];
};

export type SyncMemberRequest = {
  chainId: number;
  chainName: string;
  email: string;
  locale: string;
  syncMode?: "full" | "light";
  referredByCode?: string | null;
  walletAddress: string;
};

export type SyncMemberResponse = {
  justCompleted: boolean;
  member: MemberRecord | null;
  validationError: string | null;
};

export type IncomingReferralStatus = "available" | "full" | "invalid";

export type IncomingReferralState = {
  code: string;
  signupCount: number;
  limit: number;
  status: IncomingReferralStatus;
};

export type ReferralMemberRecord = {
  email: string;
  lastConnectedAt: string;
  lastWalletAddress: string;
  locale: string;
  placementEmail: string | null;
  placementReferralCode: string | null;
  referralCode: string | null;
  referredByCode: string | null;
  registrationCompletedAt: string;
};

export type ReferralTreeNodeRecord = ReferralMemberRecord & {
  children: ReferralTreeNodeRecord[];
  depth: number;
  directReferralCount: number;
  totalReferralCount: number;
};

export type MemberReferralsResponse = {
  levelCounts: number[];
  member: MemberRecord;
  referrals: ReferralTreeNodeRecord[];
  rewards: ReferralRewardsSummaryRecord;
  totalReferrals: number;
};

export type ReferralRewardRecord = {
  awardedAt: string;
  level: number;
  points: number;
  sourceMemberEmail: string;
  sourceMemberReferralCode: string | null;
  sourcePaymentTransactionHash: string | null;
  sourceRegistrationCompletedAt: string;
  sourceWalletAddress: string;
};

export type ReferralRewardsSummaryRecord = {
  history: ReferralRewardRecord[];
  pointsByLevel: number[];
  totalPoints: number;
  totalRewards: number;
};

export type ReferralMemberTier = "basic" | "silver" | "gold" | "vip";
export type ReferralMembershipCardTier = "none" | "silver" | "gold";

export type ManagedReferralTreeNodeRecord = ReferralMemberRecord & {
  children: ManagedReferralTreeNodeRecord[];
  depth: number;
  directReferralCount: number;
  lifetimePoints: number;
  membershipCardTier: ReferralMembershipCardTier;
  spendablePoints: number;
  status: MemberStatus;
  tier: ReferralMemberTier;
  totalReferralCount: number;
};

export type ReferralNetworkSummaryRecord = {
  directMembers: number;
  tierCounts: Record<ReferralMemberTier, number>;
  totalLifetimePoints: number;
  totalMembers: number;
  totalSpendablePoints: number;
};

export type ManagedMemberReferralsResponse = {
  levelCounts: number[];
  member: MemberRecord;
  members: ManagedReferralTreeNodeRecord[];
  referrals: ManagedReferralTreeNodeRecord[];
  summary: ReferralNetworkSummaryRecord;
  totalReferrals: number;
};

export type ReferralRewardDocument = {
  awardedAt: Date;
  createdAt: Date;
  level: number;
  points: number;
  recipientEmail: string;
  recipientReferralCode: string | null;
  sourceMemberEmail: string;
  sourceMemberReferralCode: string | null;
  sourcePaymentTransactionHash?: string | null;
  sourceRegistrationCompletedAt: Date;
  sourceWalletAddress: string;
};

export type ReferralPlacementSlotDocument = {
  claimSource: PlacementSource | null;
  claimedAt: Date | null;
  claimedByEmail: string | null;
  createdAt: Date;
  ownerEmail: string;
  ownerReferralCode: string;
  ownerRegistrationCompletedAt: Date;
  slotIndex: number;
  updatedAt: Date;
};

export type MemberDocument = {
  awaitingPaymentSince: Date;
  chainId: number;
  chainName: string;
  createdAt: Date;
  email: string;
  lastConnectedAt: Date;
  lastWalletAddress: string;
  landingBranding?: LandingBrandingDocument | null;
  locale: string;
  paymentBackfillCheckedAt?: Date | null;
  paymentAmount?: string | null;
  paymentReceivedAt?: Date | null;
  paymentTransactionHash?: string | null;
  paymentWebhookEventId?: string | null;
  placementAssignedAt?: Date | null;
  placementEmail?: string | null;
  placementReferralCode?: string | null;
  placementSource?: PlacementSource | null;
  referralRewardsIssuedAt?: Date | null;
  referralCode?: string | null;
  referredByCode?: string | null;
  referredByEmail?: string | null;
  registrationCompletedAt?: Date | null;
  requiredDepositAmount: string;
  requiredDepositAmountWei: string;
  sponsorEmail?: string | null;
  sponsorReferralCode?: string | null;
  status: MemberStatus;
  updatedAt: Date;
  walletAddresses: string[];
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeReferralCode(referralCode?: string | null) {
  const normalized = referralCode?.trim().toUpperCase() ?? "";
  return normalized ? normalized : null;
}

export function getReferralRewardPoints(level: number) {
  return level <= 1
    ? REFERRAL_REWARD_POINTS_LEVEL_ONE
    : REFERRAL_REWARD_POINTS_OTHER_LEVELS;
}

export function serializeMember(member: MemberDocument): MemberRecord {
  return {
    awaitingPaymentSince: member.awaitingPaymentSince.toISOString(),
    chainId: member.chainId,
    chainName: member.chainName,
    createdAt: member.createdAt.toISOString(),
    email: member.email,
    lastConnectedAt: member.lastConnectedAt.toISOString(),
    lastWalletAddress: member.lastWalletAddress,
    locale: member.locale,
    paymentAmount: member.paymentAmount ?? null,
    paymentReceivedAt: member.paymentReceivedAt?.toISOString() ?? null,
    paymentTransactionHash: member.paymentTransactionHash ?? null,
    paymentWebhookEventId: member.paymentWebhookEventId ?? null,
    placementAssignedAt: member.placementAssignedAt?.toISOString() ?? null,
    placementEmail: member.placementEmail ?? null,
    placementReferralCode: member.placementReferralCode ?? null,
    placementSlotIndex: null,
    placementSource: member.placementSource ?? null,
    referralRewardsIssuedAt: member.referralRewardsIssuedAt?.toISOString() ?? null,
    referralCode: member.referralCode ?? null,
    referredByCode: member.sponsorReferralCode ?? member.referredByCode ?? null,
    referredByEmail: member.sponsorEmail ?? member.referredByEmail ?? null,
    registrationCompletedAt:
      member.registrationCompletedAt?.toISOString() ?? null,
    requiredDepositAmount: member.requiredDepositAmount,
    requiredDepositAmountWei: member.requiredDepositAmountWei,
    sponsorEmail: member.sponsorEmail ?? member.referredByEmail ?? null,
    sponsorReferralCode: member.sponsorReferralCode ?? member.referredByCode ?? null,
    status: member.status,
    updatedAt: member.updatedAt.toISOString(),
    walletAddresses: member.walletAddresses,
  };
}

export function serializeReferralMember(
  member: MemberDocument,
): ReferralMemberRecord {
  return {
    email: member.email,
    lastConnectedAt: member.lastConnectedAt.toISOString(),
    lastWalletAddress: member.lastWalletAddress,
    locale: member.locale,
    placementEmail: member.placementEmail ?? null,
    placementReferralCode: member.placementReferralCode ?? null,
    referralCode: member.referralCode ?? null,
    referredByCode: member.sponsorReferralCode ?? member.referredByCode ?? null,
    registrationCompletedAt:
      member.registrationCompletedAt?.toISOString() ??
      member.createdAt.toISOString(),
  };
}

export function serializeReferralTreeNode(
  member: MemberDocument,
  depth: number,
): ReferralTreeNodeRecord {
  return {
    ...serializeReferralMember(member),
    children: [],
    depth,
    directReferralCount: 0,
    totalReferralCount: 0,
  };
}

export function serializeReferralReward(
  reward: ReferralRewardDocument,
): ReferralRewardRecord {
  return {
    awardedAt: reward.awardedAt.toISOString(),
    level: reward.level,
    points: reward.points,
    sourceMemberEmail: reward.sourceMemberEmail,
    sourceMemberReferralCode: reward.sourceMemberReferralCode ?? null,
    sourcePaymentTransactionHash: reward.sourcePaymentTransactionHash ?? null,
    sourceRegistrationCompletedAt:
      reward.sourceRegistrationCompletedAt.toISOString(),
    sourceWalletAddress: reward.sourceWalletAddress,
  };
}

export function createEmptyReferralRewardsSummary(): ReferralRewardsSummaryRecord {
  return {
    history: [],
    pointsByLevel: Array.from(
      { length: REFERRAL_TREE_DEPTH_LIMIT },
      () => 0,
    ),
    totalPoints: 0,
    totalRewards: 0,
  };
}

export function createEmptyReferralNetworkSummary(): ReferralNetworkSummaryRecord {
  return {
    directMembers: 0,
    tierCounts: {
      basic: 0,
      gold: 0,
      silver: 0,
      vip: 0,
    },
    totalLifetimePoints: 0,
    totalMembers: 0,
    totalSpendablePoints: 0,
  };
}
