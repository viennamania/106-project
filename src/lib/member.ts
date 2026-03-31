export type MemberRecord = {
  email: string;
  walletAddresses: string[];
  lastWalletAddress: string;
  chainId: number;
  chainName: string;
  locale: string;
  referralCode: string;
  referredByCode: string | null;
  referredByEmail: string | null;
  createdAt: string;
  updatedAt: string;
  lastConnectedAt: string;
};

export type SyncMemberRequest = {
  email: string;
  walletAddress: string;
  chainId: number;
  chainName: string;
  locale: string;
  referredByCode?: string | null;
};

export type SyncMemberResponse = {
  isNewMember: boolean;
  member: MemberRecord;
};

export type ReferralMemberRecord = {
  email: string;
  lastWalletAddress: string;
  locale: string;
  createdAt: string;
  lastConnectedAt: string;
  referredByCode: string | null;
};

export type MemberReferralsResponse = {
  member: MemberRecord;
  referrals: ReferralMemberRecord[];
};

export type MemberDocument = {
  email: string;
  walletAddresses: string[];
  lastWalletAddress: string;
  chainId: number;
  chainName: string;
  locale: string;
  referralCode?: string;
  referredByCode?: string | null;
  referredByEmail?: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastConnectedAt: Date;
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
    chainId: member.chainId,
    chainName: member.chainName,
    createdAt: member.createdAt.toISOString(),
    email: member.email,
    lastConnectedAt: member.lastConnectedAt.toISOString(),
    lastWalletAddress: member.lastWalletAddress,
    locale: member.locale,
    referralCode: member.referralCode ?? "",
    referredByCode: member.referredByCode ?? null,
    referredByEmail: member.referredByEmail ?? null,
    updatedAt: member.updatedAt.toISOString(),
    walletAddresses: member.walletAddresses,
  };
}

export function serializeReferralMember(
  member: MemberDocument,
): ReferralMemberRecord {
  return {
    createdAt: member.createdAt.toISOString(),
    email: member.email,
    lastConnectedAt: member.lastConnectedAt.toISOString(),
    lastWalletAddress: member.lastWalletAddress,
    locale: member.locale,
    referredByCode: member.referredByCode ?? null,
  };
}
