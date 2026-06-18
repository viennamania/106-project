import "server-only";

import type { AgentRankInteractionSource } from "@/lib/agentrank/interaction-events";
import { getFanletterAIStarSocialAccountsCollection } from "@/lib/mongodb";
import type {
  FanletterAIStarSocialAccount,
  FanletterSocialPlatform,
} from "@/mock/fanletter-social-accounts";

export type FanletterAIStarSocialAccountDocument = Omit<
  FanletterAIStarSocialAccount,
  "connectedAt"
> & {
  accountKey: string;
  connectedAt: Date;
  connectedByMemberEmail?: string | null;
  connectedByMemberWalletAddress?: string | null;
  createdAt: Date;
  creatorJourneyConditionId: "creatorSocialConnected";
  creatorJourneyConditionMet: true;
  lastEventPath?: string | null;
  mockOnly: boolean;
  mode: "mock";
  reputationEventType: "creator_social_connected";
  source: AgentRankInteractionSource;
  starName: string;
  updatedAt: Date;
};

export type FanletterAIStarSocialAccountUpsertResult = {
  accountKey: string;
  matchedCount: number;
  modifiedCount: number;
  saved: boolean;
  upserted: boolean;
};

function getAccountKey(starId: string, platform: FanletterSocialPlatform) {
  return `${platform}:${starId}`;
}

function toDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export async function upsertFanletterAIStarSocialAccount({
  account,
  connectedByMemberEmail = null,
  connectedByMemberWalletAddress = null,
  eventPath = null,
  source,
  starName,
}: {
  account: FanletterAIStarSocialAccount;
  connectedByMemberEmail?: string | null;
  connectedByMemberWalletAddress?: string | null;
  eventPath?: string | null;
  source: AgentRankInteractionSource;
  starName: string;
}): Promise<FanletterAIStarSocialAccountUpsertResult> {
  const collection = await getFanletterAIStarSocialAccountsCollection();
  const now = new Date();
  const accountKey = getAccountKey(account.starId, account.platform);
  const result = await collection.updateOne(
    { accountKey },
    {
      $set: {
        connectedAt: toDate(account.connectedAt),
        connectedByMemberEmail,
        connectedByMemberId: account.connectedByMemberId,
        connectedByMemberInitials: account.connectedByMemberInitials ?? null,
        connectedByMemberName: account.connectedByMemberName,
        connectedByMemberWalletAddress,
        creatorJourneyConditionId: "creatorSocialConnected",
        creatorJourneyConditionMet: true,
        creatorRoleAtConnection: account.creatorRoleAtConnection,
        handle: account.handle,
        lastEventPath: eventPath,
        mockOnly: true,
        mode: "mock",
        platform: account.platform,
        profileUrl: account.profileUrl,
        reputationEventType: "creator_social_connected",
        source,
        starId: account.starId,
        starName,
        status: account.status,
        updatedAt: now,
      },
      $setOnInsert: {
        accountKey,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return {
    accountKey,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    saved: true,
    upserted: Boolean(result.upsertedId),
  };
}

export async function tryUpsertFanletterAIStarSocialAccount(
  input: Parameters<typeof upsertFanletterAIStarSocialAccount>[0],
) {
  try {
    return await upsertFanletterAIStarSocialAccount(input);
  } catch (error) {
    console.warn("FanLetter AI Star social account could not be saved", {
      error,
      platform: input.account.platform,
      source: input.source,
      starId: input.account.starId,
    });

    return {
      accountKey: getAccountKey(input.account.starId, input.account.platform),
      matchedCount: 0,
      modifiedCount: 0,
      saved: false,
      upserted: false,
    };
  }
}
