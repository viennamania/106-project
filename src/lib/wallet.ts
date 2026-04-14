import type { MemberDocument, MemberStatus } from "@/lib/member";

export const WALLET_MEMBER_SEARCH_LIMIT = 8;
export const WALLET_HISTORY_DEFAULT_LIMIT = 24;
export const WALLET_HISTORY_MAX_LIMIT = 50;

export type WalletMemberLookupRecord = {
  email: string;
  lastConnectedAt: string;
  level?: number | null;
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
export type WalletTransferStatus = "pending" | "confirmed";
export type WalletTransferSource =
  | "insight_sync"
  | "rpc_sync"
  | "app_send"
  | "project_wallet_webhook";

export type WalletTransferRecord = {
  amountDisplay: string;
  amountWei: string;
  blockNumber: number;
  counterparty: WalletMemberLookupRecord | null;
  counterpartyWalletAddress: string;
  direction: WalletTransferDirection;
  logIndex: number;
  status: WalletTransferStatus;
  timestamp: string;
  transactionHash: string;
};

export type WalletTransferDocument = {
  amountWei: string;
  blockNumber: number;
  blockTimestamp: Date;
  chainId: number;
  counterpartyWalletAddress: string;
  createdAt: Date;
  direction: WalletTransferDirection;
  logIndex: number;
  source: WalletTransferSource;
  status: WalletTransferStatus;
  tokenAddress: string;
  transactionHash: string;
  updatedAt: Date;
  walletAddress: string;
};

export type WalletTransferSyncStateDocument = {
  lastError: string | null;
  lastSyncedAt: Date | null;
  lastSyncedBlock: number | null;
  source: WalletTransferSource | null;
  updatedAt: Date;
  walletAddress: string;
};

export type WalletTransferHistoryResponse = {
  syncing?: boolean;
  transfers: WalletTransferRecord[];
  walletAddress: string;
};

export type WalletTransferMutationRequest =
  | {
      action: "record_send";
      amountWei: string;
      fromWalletAddress: string;
      toWalletAddress: string;
      transactionHash: string;
    }
  | {
      action: "confirm_send";
      amountWei: string;
      fromWalletAddress: string;
      toWalletAddress: string;
      transactionHash: string;
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
    level: null,
    locale: member.locale,
    referralCode: member.referralCode ?? null,
    registrationCompletedAt:
      member.registrationCompletedAt?.toISOString() ?? null,
    status: member.status,
    walletAddress: member.lastWalletAddress,
  };
}
