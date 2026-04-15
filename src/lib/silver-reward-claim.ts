import type { MemberRecord } from "@/lib/member";
import type { RewardRedemptionRecord } from "@/lib/points";

export const silverRewardClaimStatuses = [
  "pending",
  "completed",
  "failed",
] as const;
export const silverRewardClaimEligibilityReasons = [
  "signup_incomplete",
  "silver_card_incomplete",
  "wallet_missing",
  "already_claimed",
  "claim_pending",
] as const;

export type SilverRewardClaimStatus = (typeof silverRewardClaimStatuses)[number];
export type SilverRewardClaimEligibilityReason =
  (typeof silverRewardClaimEligibilityReasons)[number];

export type SilverRewardClaimDocument = {
  bnbAmount: string;
  bnbAmountWei: string;
  bnbKrwPrice: number;
  claimId: string;
  createdAt: Date;
  failureReason?: string | null;
  memberEmail: string;
  rewardId: "silver-card";
  status: SilverRewardClaimStatus;
  txHash?: string | null;
  updatedAt: Date;
  usdAmount: number;
  usdtKrwPrice: number;
  walletAddress: string;
};

export type SilverRewardClaimRecord = {
  bnbAmount: string;
  bnbAmountWei: string;
  bnbKrwPrice: number;
  claimId: string;
  createdAt: string;
  failureReason: string | null;
  memberEmail: string;
  rewardId: "silver-card";
  status: SilverRewardClaimStatus;
  txHash: string | null;
  updatedAt: string;
  usdAmount: number;
  usdtKrwPrice: number;
  walletAddress: string;
};

export type SilverRewardQuoteRecord = {
  asOf: string;
  bnbAmount: string;
  bnbAmountWei: string;
  bnbKrwPrice: number;
  estimatedKrwAmount: number;
  usdAmount: number;
  usdtKrwPrice: number;
};

export type SilverRewardClaimSummaryResponse = {
  canClaim: boolean;
  claim: SilverRewardClaimRecord | null;
  eligibilityReason: SilverRewardClaimEligibilityReason | null;
  member: MemberRecord;
  quote: SilverRewardQuoteRecord;
  rewardRedemption: RewardRedemptionRecord | null;
  walletAddress: string | null;
};

export type SilverRewardClaimRequest = {
  email: string;
};

export type SilverRewardClaimResponse = SilverRewardClaimSummaryResponse;

export function serializeSilverRewardClaim(
  claim: SilverRewardClaimDocument,
): SilverRewardClaimRecord {
  return {
    bnbAmount: claim.bnbAmount,
    bnbAmountWei: claim.bnbAmountWei,
    bnbKrwPrice: claim.bnbKrwPrice,
    claimId: claim.claimId,
    createdAt: claim.createdAt.toISOString(),
    failureReason: claim.failureReason ?? null,
    memberEmail: claim.memberEmail,
    rewardId: claim.rewardId,
    status: claim.status,
    txHash: claim.txHash ?? null,
    updatedAt: claim.updatedAt.toISOString(),
    usdAmount: claim.usdAmount,
    usdtKrwPrice: claim.usdtKrwPrice,
    walletAddress: claim.walletAddress,
  };
}
