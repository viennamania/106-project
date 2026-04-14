import "server-only";

import {
  getMongoClient,
  getPointBalancesCollection,
  getPointLedgerCollection,
  getReferralRewardsCollection,
  getRewardRedemptionsCollection,
} from "@/lib/mongodb";
import { normalizeEmail, type MemberDocument } from "@/lib/member";
import {
  createEmptyPointsSummary,
  getPointTier,
  getPointTierProgress,
  POINT_HISTORY_LIMIT,
  REWARD_CATALOG,
  REWARD_REDEMPTION_HISTORY_LIMIT,
  serializePointLedger,
  serializeRewardRedemption,
  type PointBalanceDocument,
  type PointLedgerDocument,
  type PointLedgerSourceType,
  type PointsSummaryRecord,
  type RewardCatalogResponse,
  type RewardCatalogId,
  type RewardCatalogItemRecord,
  type RewardRedeemResponse,
  type RewardRedemptionDocument,
  type RewardRedemptionsResponse,
} from "@/lib/points";
import {
  isOnchainRewardCatalogId,
  mintRewardNftToWallet,
} from "@/lib/rewards-nft";
import { isAddress } from "thirdweb";

function getReferralRewardLedgerEntryId(
  memberEmail: string,
  sourceMemberEmail: string,
) {
  return `${memberEmail}:referral_reward:${sourceMemberEmail}`;
}

function getRewardRedemptionLedgerEntryId(
  memberEmail: string,
  redemptionId: string,
) {
  return `${memberEmail}:reward_redemption:${redemptionId}`;
}

function getRewardRollbackLedgerEntryId(memberEmail: string, redemptionId: string) {
  return `${memberEmail}:reward_rollback:${redemptionId}`;
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function getPointLedgerSourceTypeForReward(
  reward: RewardCatalogItemRecord,
): PointLedgerSourceType {
  if (reward.rewardType === "tier_upgrade") {
    return "tier_upgrade";
  }

  if (reward.rewardType === "nft_claim") {
    return "nft_redemption";
  }

  return "discount_redemption";
}

function getRedemptionStatusForReward(reward: RewardCatalogItemRecord) {
  return isOnchainRewardCatalogId(reward.rewardId) ? "pending" : "queued";
}

function getMemberRewardWalletAddress(member: MemberDocument) {
  const candidateWallets = [
    member.lastWalletAddress,
    ...member.walletAddresses,
  ].filter(Boolean);

  for (const walletAddress of candidateWallets) {
    if (isAddress(walletAddress)) {
      return walletAddress;
    }
  }

  return null;
}

async function rollbackRewardRedemption({
  balancesCollection,
  ledgerCollection,
  member,
  now,
  redemptionsCollection,
  redemption,
}: {
  balancesCollection: Awaited<ReturnType<typeof getPointBalancesCollection>>;
  ledgerCollection: Awaited<ReturnType<typeof getPointLedgerCollection>>;
  member: MemberDocument;
  now: Date;
  redemptionsCollection: Awaited<ReturnType<typeof getRewardRedemptionsCollection>>;
  redemption: RewardRedemptionDocument;
}) {
  const client = await getMongoClient();
  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      await balancesCollection.updateOne(
        { memberEmail: member.email },
        {
          $inc: {
            spendablePoints: redemption.costPoints,
          },
          $set: {
            updatedAt: now,
          },
        },
        { session },
      );

      await ledgerCollection.insertOne(
        {
          createdAt: now,
          delta: redemption.costPoints,
          ledgerEntryId: getRewardRollbackLedgerEntryId(
            member.email,
            redemption.redemptionId,
          ),
          memberEmail: member.email,
          memo: redemption.rewardId,
          rewardLevel: null,
          sourceId: redemption.redemptionId,
          sourceMemberEmail: null,
          sourceType: getPointLedgerSourceTypeForReward(
            getRewardCatalogById(redemption.rewardId)!,
          ),
          type: "rollback",
          updatedAt: now,
        },
        { session },
      );

      await redemptionsCollection.deleteOne(
        {
          redemptionId: redemption.redemptionId,
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
}

function buildPointsSummary({
  balance,
  history,
}: {
  balance: PointBalanceDocument;
  history: PointLedgerDocument[];
}): PointsSummaryRecord {
  const progress = getPointTierProgress(balance.spendablePoints);

  return {
    history: history.map(serializePointLedger),
    lifetimePoints: balance.lifetimePoints,
    nextTier: progress.nextTier,
    nextTierThreshold: progress.nextTierThreshold,
    pointsToNextTier: progress.pointsToNextTier,
    progressPercent: progress.progressPercent,
    reservedPoints: balance.reservedPoints,
    spendablePoints: balance.spendablePoints,
    tier: balance.tier,
    updatedAt: balance.updatedAt.toISOString(),
  };
}

async function createOrUpdatePointBalance({
  memberEmail,
  history,
}: {
  history: PointLedgerDocument[];
  memberEmail: string;
}) {
  const [balancesCollection, ledgerCollection] = await Promise.all([
    getPointBalancesCollection(),
    getPointLedgerCollection(),
  ]);
  const [aggregateRows, existingBalance] = await Promise.all([
    ledgerCollection
      .aggregate<{
        _id: null;
        lifetimePoints: number;
        spendablePoints: number;
      }>([
        {
          $match: {
            memberEmail,
          },
        },
        {
          $group: {
            _id: null,
            lifetimePoints: {
              $sum: {
                $cond: [{ $gt: ["$delta", 0] }, "$delta", 0],
              },
            },
            spendablePoints: {
              $sum: "$delta",
            },
          },
        },
      ])
      .toArray(),
    balancesCollection.findOne({ memberEmail }),
  ]);
  const aggregate = aggregateRows[0];
  const now = new Date();
  const balance: PointBalanceDocument = {
    createdAt: existingBalance?.createdAt ?? now,
    loyaltyCardTokenId: existingBalance?.loyaltyCardTokenId ?? null,
    memberEmail,
    reservedPoints: existingBalance?.reservedPoints ?? 0,
    spendablePoints: aggregate?.spendablePoints ?? 0,
    tier: getPointTier(aggregate?.spendablePoints ?? 0),
    lifetimePoints: aggregate?.lifetimePoints ?? 0,
    updatedAt: now,
  };

  await balancesCollection.updateOne(
    { memberEmail },
    {
      $set: {
        loyaltyCardTokenId: balance.loyaltyCardTokenId,
        reservedPoints: balance.reservedPoints,
        spendablePoints: balance.spendablePoints,
        tier: balance.tier,
        lifetimePoints: balance.lifetimePoints,
        updatedAt: balance.updatedAt,
      },
      $setOnInsert: {
        createdAt: balance.createdAt,
        memberEmail,
      },
    },
    { upsert: true },
  );

  return buildPointsSummary({ balance, history });
}

export async function syncPointLedgerForMemberEmail(memberEmail: string) {
  const normalizedEmail = normalizeEmail(memberEmail);
  const [ledgerCollection, rewardsCollection] = await Promise.all([
    getPointLedgerCollection(),
    getReferralRewardsCollection(),
  ]);
  const [referralRewards, existingReferralEntries] = await Promise.all([
    rewardsCollection
      .find({ recipientEmail: normalizedEmail })
      .sort({ awardedAt: 1, createdAt: 1 })
      .toArray(),
    ledgerCollection
      .find({
        memberEmail: normalizedEmail,
        sourceType: "referral_reward",
      })
      .project<{ ledgerEntryId: string }>({
        ledgerEntryId: 1,
      })
      .toArray(),
  ]);
  const now = new Date();
  const expectedEntryIds = new Set<string>();
  const operations = referralRewards.map((reward) => {
    const ledgerEntryId = getReferralRewardLedgerEntryId(
      normalizedEmail,
      reward.sourceMemberEmail,
    );

    expectedEntryIds.add(ledgerEntryId);

    return {
      updateOne: {
        filter: { ledgerEntryId },
        update: {
          $set: {
            delta: reward.points,
            memberEmail: normalizedEmail,
            memo: null,
            rewardLevel: reward.level,
            sourceId: reward.sourceMemberEmail,
            sourceMemberEmail: reward.sourceMemberEmail,
            sourceType: "referral_reward" as const,
            type: "earn" as const,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: reward.awardedAt,
            ledgerEntryId,
          },
        },
        upsert: true,
      },
    };
  });

  if (operations.length > 0) {
    await ledgerCollection.bulkWrite(operations, { ordered: false });
  }

  const staleEntryIds = existingReferralEntries
    .map((entry) => entry.ledgerEntryId)
    .filter((entryId) => !expectedEntryIds.has(entryId));

  if (staleEntryIds.length > 0) {
    await ledgerCollection.deleteMany({
      ledgerEntryId: { $in: staleEntryIds },
      memberEmail: normalizedEmail,
      sourceType: "referral_reward",
    });
  }

  const history = await ledgerCollection
    .find({ memberEmail: normalizedEmail })
    .sort({ createdAt: -1, ledgerEntryId: -1 })
    .limit(POINT_HISTORY_LIMIT)
    .toArray();

  return createOrUpdatePointBalance({
    history,
    memberEmail: normalizedEmail,
  });
}

export async function syncPointLedgerForMemberEmails(memberEmails: string[]) {
  const uniqueEmails = [...new Set(memberEmails.map(normalizeEmail).filter(Boolean))];

  if (uniqueEmails.length === 0) {
    return;
  }

  await Promise.all(uniqueEmails.map((email) => syncPointLedgerForMemberEmail(email)));
}

export async function getPointsSummaryForMember(member: MemberDocument) {
  if (member.status !== "completed") {
    return createEmptyPointsSummary();
  }

  return syncPointLedgerForMemberEmail(member.email);
}

export function getRewardCatalog(): RewardCatalogResponse {
  return {
    rewards: [...REWARD_CATALOG].sort((left, right) => {
      return left.sortOrder - right.sortOrder;
    }),
  };
}

export async function getRewardRedemptionsForMember(
  member: MemberDocument,
): Promise<RewardRedemptionsResponse> {
  if (member.status !== "completed") {
    return {
      redemptions: [],
    };
  }

  const collection = await getRewardRedemptionsCollection();
  const redemptions = await collection
    .find({ memberEmail: member.email })
    .sort({ createdAt: -1, updatedAt: -1 })
    .limit(REWARD_REDEMPTION_HISTORY_LIMIT)
    .toArray();

  return {
    redemptions: redemptions.map(serializeRewardRedemption),
  };
}

export function getRewardCatalogById(rewardId: RewardCatalogItemRecord["rewardId"]) {
  return REWARD_CATALOG.find((reward) => reward.rewardId === rewardId) ?? null;
}

export async function redeemRewardForMember(
  member: MemberDocument,
  rewardId: RewardCatalogId,
): Promise<Omit<RewardRedeemResponse, "member">> {
  if (member.status !== "completed") {
    throw new Error("Member is not eligible for reward redemptions.");
  }

  const reward = getRewardCatalogById(rewardId);

  if (!reward) {
    throw new Error("Reward not found.");
  }

  await syncPointLedgerForMemberEmail(member.email);

  const client = await getMongoClient();
  const [balancesCollection, ledgerCollection, redemptionsCollection] =
    await Promise.all([
      getPointBalancesCollection(),
      getPointLedgerCollection(),
      getRewardRedemptionsCollection(),
    ]);
  const session = client.startSession();
  const now = new Date();
  const redemptionId = crypto.randomUUID();
  const ledgerEntryId = getRewardRedemptionLedgerEntryId(member.email, redemptionId);
  const redemption: RewardRedemptionDocument = {
    contractAddress: null,
    costPoints: reward.costPoints,
    createdAt: now,
    engineQueueId: isOnchainRewardCatalogId(reward.rewardId)
      ? null
      : `queue:${redemptionId}`,
    failureReason: null,
    memberEmail: member.email,
    redemptionId,
    rewardId,
    status: getRedemptionStatusForReward(reward),
    tokenId: null,
    tokenUri: null,
    txHash: null,
    updatedAt: now,
  };

  try {
    await session.withTransaction(async () => {
      const existingRedemption = await redemptionsCollection.findOne(
        {
          memberEmail: member.email,
          rewardId,
        },
        { session },
      );

      if (existingRedemption) {
        throw new Error("Reward has already been redeemed for this member.");
      }

      const balanceUpdate = await balancesCollection.updateOne(
        {
          memberEmail: member.email,
          spendablePoints: { $gte: reward.costPoints },
        },
        {
          $inc: {
            spendablePoints: -reward.costPoints,
          },
          $set: {
            updatedAt: now,
          },
        },
        { session },
      );

      if (balanceUpdate.modifiedCount === 0) {
        throw new Error("Insufficient points for this reward.");
      }

      await redemptionsCollection.insertOne(redemption, { session });

      await ledgerCollection.insertOne(
        {
          createdAt: now,
          delta: -reward.costPoints,
          ledgerEntryId,
          memberEmail: member.email,
          memo: reward.rewardId,
          rewardLevel: null,
          sourceId: redemptionId,
          sourceMemberEmail: null,
          sourceType: getPointLedgerSourceTypeForReward(reward),
          type: "spend",
          updatedAt: now,
        },
        { session },
      );
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new Error("Reward has already been redeemed for this member.");
    }

    throw error;
  } finally {
    await session.endSession();
  }

  if (isOnchainRewardCatalogId(reward.rewardId)) {
    const rewardWalletAddress = getMemberRewardWalletAddress(member);

    if (!rewardWalletAddress) {
      const error = new Error(
        "Member does not have a valid wallet address for reward NFT minting.",
      );

      await rollbackRewardRedemption({
        balancesCollection,
        ledgerCollection,
        member,
        now: new Date(),
        redemptionsCollection,
        redemption,
      });

      throw error;
    }

    let mintedReward: Awaited<ReturnType<typeof mintRewardNftToWallet>>;

    try {
      mintedReward = await mintRewardNftToWallet({
        rewardId,
        walletAddress: rewardWalletAddress,
      });
    } catch (error) {
      await rollbackRewardRedemption({
        balancesCollection,
        ledgerCollection,
        member,
        now: new Date(),
        redemptionsCollection,
        redemption,
      });

      throw error;
    }

    redemption.contractAddress = mintedReward.contractAddress;
    redemption.status = "completed";
    redemption.tokenId = mintedReward.tokenId;
    redemption.tokenUri = mintedReward.tokenUri;
    redemption.txHash = mintedReward.transactionHash;
    redemption.updatedAt = new Date();

    const updateResult = await redemptionsCollection.updateOne(
      {
        redemptionId,
      },
      {
        $set: {
          contractAddress: redemption.contractAddress,
          engineQueueId: null,
          status: redemption.status,
          tokenId: redemption.tokenId,
          tokenUri: redemption.tokenUri,
          txHash: redemption.txHash,
          updatedAt: redemption.updatedAt,
        },
      },
    );

    if (updateResult.modifiedCount === 0) {
      throw new Error("Reward NFT was minted but redemption finalization failed.");
    }

    if (reward.rewardType === "tier_upgrade" && redemption.tokenId) {
      await balancesCollection.updateOne(
        { memberEmail: member.email },
        {
          $set: {
            loyaltyCardTokenId: redemption.tokenId,
            updatedAt: redemption.updatedAt,
          },
        },
      );
    }
  }

  const [summary, redemptions] = await Promise.all([
    syncPointLedgerForMemberEmail(member.email),
    getRewardRedemptionsForMember(member),
  ]);

  return {
    redemption: serializeRewardRedemption(redemption),
    redemptions: redemptions.redemptions,
    summary,
  };
}
