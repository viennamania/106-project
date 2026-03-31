export type MemberRecord = {
  email: string;
  walletAddresses: string[];
  lastWalletAddress: string;
  chainId: number;
  chainName: string;
  locale: string;
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
};

export type SyncMemberResponse = {
  isNewMember: boolean;
  member: MemberRecord;
};
