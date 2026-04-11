import type { MemberDocument, MemberStatus } from "@/lib/member";

export const WALLET_MEMBER_SEARCH_LIMIT = 8;
export const WALLET_HISTORY_DEFAULT_LIMIT = 24;
export const WALLET_HISTORY_MAX_LIMIT = 50;

export type WalletMemberLookupRecord = {
  email: string;
  lastConnectedAt: string;
  locale: string;
  referralCode: string | null;
  registrationCompletedAt: string | null;
  status: MemberStatus;
  walletAddress: string;
};

export type WalletRecipientSearchResponse = {
  results: WalletMemberLookupRecord[];
};

export type WalletTransferDirection = "inbound" | "outbound";

export type WalletTransferRecord = {
  amountDisplay: string;
  amountWei: string;
  blockNumber: number;
  counterparty: WalletMemberLookupRecord | null;
  counterpartyWalletAddress: string;
  direction: WalletTransferDirection;
  logIndex: number;
  timestamp: string;
  transactionHash: string;
};

export type WalletTransferHistoryResponse = {
  transfers: WalletTransferRecord[];
  walletAddress: string;
};

export function serializeWalletMemberLookup(
  member: Pick<
    MemberDocument,
    | "email"
    | "lastConnectedAt"
    | "lastWalletAddress"
    | "locale"
    | "referralCode"
    | "registrationCompletedAt"
    | "status"
  >,
): WalletMemberLookupRecord {
  return {
    email: member.email,
    lastConnectedAt: member.lastConnectedAt.toISOString(),
    locale: member.locale,
    referralCode: member.referralCode ?? null,
    registrationCompletedAt:
      member.registrationCompletedAt?.toISOString() ?? null,
    status: member.status,
    walletAddress: member.lastWalletAddress,
  };
}
