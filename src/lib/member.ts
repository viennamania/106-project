export const MEMBER_SIGNUP_USDT_AMOUNT = "10";
export const MEMBER_SIGNUP_USDT_DECIMALS = 18;
export const MEMBER_SIGNUP_USDT_AMOUNT_WEI = "10000000000000000000";
export const REFERRAL_SIGNUP_LIMIT = 6;
export const REFERRAL_TREE_DEPTH_LIMIT = 6;
export const REFERRAL_REWARD_POINTS = 1;
export const REFERRAL_REWARD_HISTORY_LIMIT = 24;

export const memberStatuses = ["pending_payment", "completed"] as const;

export type MemberStatus = (typeof memberStatuses)[number];

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
  referralRewardsIssuedAt: string | null;
  referralCode: string | null;
  referredByCode: string | null;
  referredByEmail: string | null;
  registrationCompletedAt: string | null;
  requiredDepositAmount: string;
  requiredDepositAmountWei: string;
  status: MemberStatus;
  updatedAt: string;
  walletAddresses: string[];
};

export type SyncMemberRequest = {
  chainId: number;
  chainName: string;
  email: string;
  locale: string;
  referredByCode?: string | null;
  walletAddress: string;
};

export type SyncMemberResponse = {
  justCompleted: boolean;
  member: MemberRecord;
};

export type IncomingReferralStatus = "available" | "full" | "invalid";

export type IncomingReferralState = {
  code: string;
  completedReferrals: number;
  limit: number;
  status: IncomingReferralStatus;
};

export type ReferralMemberRecord = {
  email: string;
  lastConnectedAt: string;
  lastWalletAddress: string;
  locale: string;
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

export type MemberDocument = {
  awaitingPaymentSince: Date;
  chainId: number;
  chainName: string;
  createdAt: Date;
  email: string;
  lastConnectedAt: Date;
  lastWalletAddress: string;
  locale: string;
  paymentBackfillCheckedAt?: Date | null;
  paymentAmount?: string | null;
  paymentReceivedAt?: Date | null;
  paymentTransactionHash?: string | null;
  paymentWebhookEventId?: string | null;
  referralRewardsIssuedAt?: Date | null;
  referralCode?: string | null;
  referredByCode?: string | null;
  referredByEmail?: string | null;
  registrationCompletedAt?: Date | null;
  requiredDepositAmount: string;
  requiredDepositAmountWei: string;
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
    referralRewardsIssuedAt: member.referralRewardsIssuedAt?.toISOString() ?? null,
    referralCode: member.referralCode ?? null,
    referredByCode: member.referredByCode ?? null,
    referredByEmail: member.referredByEmail ?? null,
    registrationCompletedAt:
      member.registrationCompletedAt?.toISOString() ?? null,
    requiredDepositAmount: member.requiredDepositAmount,
    requiredDepositAmountWei: member.requiredDepositAmountWei,
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
    referralCode: member.referralCode ?? null,
    referredByCode: member.referredByCode ?? null,
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
