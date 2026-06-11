export const fanletterFounderRoles = [
  "founder",
  "mentor",
  "partner",
  "creator",
] as const;

export const fanletterFounderClubBackfillSources = [
  "creator_profile",
  "fan_request",
  "follow",
  "member_signup",
  "news_cut_share",
  "share_signup_attribution",
  "manual",
] as const;

export type FanletterFounderRole = (typeof fanletterFounderRoles)[number];
export type FanletterFounderClubBackfillSource =
  (typeof fanletterFounderClubBackfillSources)[number];

export type FanletterStarStatus = "active" | "archived" | "draft";
export type FanletterStarReferralCodeStatus = "active" | "disabled";

export type FanletterStarDocument = {
  backfilledAt?: Date | null;
  categoryLabel: string | null;
  characterName: string;
  createdByUnlock?: boolean;
  createdAt: Date;
  displayName: string;
  founderCount: number;
  growthPercent: number;
  launchCostUsdt?: number | null;
  legacyCreatorReferralCode: string | null;
  legacyPersonaId: string | null;
  openSlotCount: number;
  ownerEmail: string | null;
  ownerReferralCode: string | null;
  portraitImageUrl: string | null;
  source: FanletterFounderClubBackfillSource;
  spawnedFromStarId?: string | null;
  starId: string;
  starScore: number;
  status: FanletterStarStatus;
  updatedAt: Date;
};

export type FanletterStarReferralCodeDocument = {
  code: string;
  createdAt: Date;
  disabledAt?: Date | null;
  lastUsedAt?: Date | null;
  memberEmail: string;
  memberReferralCode: string | null;
  source: FanletterFounderClubBackfillSource;
  starId: string;
  status: FanletterStarReferralCodeStatus;
  updatedAt: Date;
};

export type FanletterStarFounderMembershipDocument = {
  backfilledAt?: Date | null;
  cpBalance: number;
  createdAt: Date;
  creatorProgressPercent: number;
  influenceScore: number;
  joinedAt: Date;
  joinedViaCode: string | null;
  joinedViaMemberEmail: string | null;
  joinedViaMemberReferralCode: string | null;
  joinedViaShareId: string | null;
  memberEmail: string;
  memberReferralCode: string | null;
  role: FanletterFounderRole;
  source: FanletterFounderClubBackfillSource;
  starId: string;
  updatedAt: Date;
};

export type FanletterStarReferralEdgeDocument = {
  backfilledAt?: Date | null;
  createdAt: Date;
  edgeId: string;
  referralCode: string | null;
  shareId: string | null;
  source: FanletterFounderClubBackfillSource;
  sourceMemberEmail: string;
  sourceMemberReferralCode: string | null;
  starId: string;
  targetMemberEmail: string;
  targetMemberReferralCode: string | null;
  updatedAt: Date;
};

export type FanletterStarInfluenceLedgerDocument = {
  cpDelta: number;
  createdAt: Date;
  creatorProgressDelta: number;
  influenceDelta: number;
  memo: string;
  recipientMemberEmail: string;
  source: FanletterFounderClubBackfillSource;
  sourceId: string;
  sourceMemberEmail: string | null;
  starId: string;
  targetMemberEmail: string | null;
};

export function getLegacyFanletterStarId(creatorReferralCode: string) {
  return `legacy-star-${creatorReferralCode.trim().toLowerCase()}`;
}
