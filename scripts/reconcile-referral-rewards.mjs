import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

const REFERRAL_REWARD_POINTS = 200;
const REFERRAL_TREE_DEPTH_LIMIT = 6;

const writeChanges = ["1", "true", "yes"].includes(
  (process.env.REFERRAL_REWARDS_RECONCILE_WRITE ?? "").trim().toLowerCase(),
);
const targetEmails = parseEmailList(
  process.env.REFERRAL_REWARDS_RECONCILE_TARGET_EMAILS,
);

const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB_NAME?.trim();
const membersCollectionName =
  process.env.MONGODB_MEMBERS_COLLECTION?.trim() ?? "members";
const rewardsCollectionName =
  process.env.MONGODB_REFERRAL_REWARDS_COLLECTION?.trim() ?? "referralRewards";

if (!uri) {
  throw new Error("MONGODB_URI is not configured.");
}

if (!dbName) {
  throw new Error("MONGODB_DB_NAME is not configured.");
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function normalizeReferralCode(value) {
  const normalized = value?.trim().toUpperCase() ?? "";
  return normalized || null;
}

function parseEmailList(value) {
  if (!value) {
    return new Set();
  }

  return new Set(
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map(normalizeEmail),
  );
}

function rewardKey({ recipientEmail, sourceMemberEmail }) {
  return `${recipientEmail}\u0000${sourceMemberEmail}`;
}

function toIsoStringOrNull(value) {
  return value instanceof Date ? value.toISOString() : value ?? null;
}

function summarizeReward(reward) {
  return {
    awardedAt: toIsoStringOrNull(reward.awardedAt),
    level: reward.level,
    points: reward.points,
    recipientEmail: reward.recipientEmail,
    recipientReferralCode: reward.recipientReferralCode ?? null,
    sourceMemberEmail: reward.sourceMemberEmail,
    sourceMemberReferralCode: reward.sourceMemberReferralCode ?? null,
    sourceRegistrationCompletedAt: toIsoStringOrNull(
      reward.sourceRegistrationCompletedAt,
    ),
  };
}

function summarizeChangedReward({ existing, expected }) {
  return {
    existing: summarizeReward(existing),
    expected: summarizeReward(expected),
  };
}

function summarizeRecipientTotals({ history, totalPoints, totalRewards }) {
  return {
    history: history.map(summarizeReward),
    totalPoints,
    totalRewards,
  };
}

function isRelevantReward(reward, emailFilter) {
  if (emailFilter.size === 0) {
    return true;
  }

  return (
    emailFilter.has(normalizeEmail(reward.recipientEmail)) ||
    emailFilter.has(normalizeEmail(reward.sourceMemberEmail))
  );
}

function buildExpectedRewards(members) {
  const completedMembers = members.filter((member) => member.status === "completed");
  const membersByReferralCode = new Map(
    completedMembers
      .filter((member) => normalizeReferralCode(member.referralCode))
      .map((member) => [normalizeReferralCode(member.referralCode), member]),
  );
  const expectedRewards = new Map();

  for (const sourceMember of completedMembers) {
    const awardedAt =
      sourceMember.registrationCompletedAt ?? sourceMember.createdAt ?? new Date();
    const seenRecipientEmails = new Set([sourceMember.email]);
    const seenReferralCodes = new Set();
    let currentReferralCode = normalizeReferralCode(
      sourceMember.placementReferralCode,
    );

    for (
      let level = 1;
      level <= REFERRAL_TREE_DEPTH_LIMIT && currentReferralCode;
      level += 1
    ) {
      if (seenReferralCodes.has(currentReferralCode)) {
        break;
      }

      seenReferralCodes.add(currentReferralCode);

      const recipientMember = membersByReferralCode.get(currentReferralCode);

      if (!recipientMember) {
        break;
      }

      if (!seenRecipientEmails.has(recipientMember.email)) {
        expectedRewards.set(
          rewardKey({
            recipientEmail: recipientMember.email,
            sourceMemberEmail: sourceMember.email,
          }),
          {
            awardedAt,
            level,
            points: REFERRAL_REWARD_POINTS,
            recipientEmail: recipientMember.email,
            recipientReferralCode: normalizeReferralCode(
              recipientMember.referralCode,
            ),
            sourceMemberEmail: sourceMember.email,
            sourceMemberReferralCode: normalizeReferralCode(
              sourceMember.referralCode,
            ),
            sourcePaymentTransactionHash:
              sourceMember.paymentTransactionHash ?? null,
            sourceRegistrationCompletedAt: awardedAt,
            sourceWalletAddress: sourceMember.lastWalletAddress,
          },
        );

        seenRecipientEmails.add(recipientMember.email);
      }

      currentReferralCode = normalizeReferralCode(
        recipientMember.placementReferralCode,
      );
    }
  }

  return expectedRewards;
}

function rewardsDiffer(existing, expected) {
  return (
    existing.level !== expected.level ||
    existing.points !== expected.points ||
    (existing.recipientReferralCode ?? null) !==
      (expected.recipientReferralCode ?? null) ||
    (existing.sourceMemberReferralCode ?? null) !==
      (expected.sourceMemberReferralCode ?? null) ||
    (existing.sourcePaymentTransactionHash ?? null) !==
      (expected.sourcePaymentTransactionHash ?? null) ||
    (existing.sourceWalletAddress ?? null) !==
      (expected.sourceWalletAddress ?? null) ||
    toIsoStringOrNull(existing.awardedAt) !==
      toIsoStringOrNull(expected.awardedAt) ||
    toIsoStringOrNull(existing.sourceRegistrationCompletedAt) !==
      toIsoStringOrNull(expected.sourceRegistrationCompletedAt)
  );
}

function buildRecipientSummary(rewards, email) {
  const history = rewards
    .filter((reward) => reward.recipientEmail === email)
    .sort((left, right) => {
      const leftTime = new Date(left.awardedAt).getTime();
      const rightTime = new Date(right.awardedAt).getTime();
      return rightTime - leftTime;
    });

  return {
    history,
    totalPoints: history.reduce((sum, reward) => sum + reward.points, 0),
    totalRewards: history.length,
  };
}

const client = new MongoClient(uri);

try {
  await client.connect();

  const db = client.db(dbName);
  const members = db.collection(membersCollectionName);
  const rewards = db.collection(rewardsCollectionName);

  const [memberRows, existingRewardRows] = await Promise.all([
    members
      .find(
        { status: "completed" },
        {
          projection: {
            _id: 0,
            createdAt: 1,
            email: 1,
            lastWalletAddress: 1,
            paymentTransactionHash: 1,
            placementReferralCode: 1,
            referralCode: 1,
            registrationCompletedAt: 1,
            status: 1,
          },
        },
      )
      .toArray(),
    rewards.find({}).toArray(),
  ]);

  const expectedRewards = buildExpectedRewards(memberRows);
  const filteredExpectedRewards = [...expectedRewards.values()].filter((reward) =>
    isRelevantReward(reward, targetEmails),
  );
  const filteredExistingRewards = existingRewardRows.filter((reward) =>
    isRelevantReward(reward, targetEmails),
  );
  const existingRewardsByKey = new Map(
    filteredExistingRewards.map((reward) => [rewardKey(reward), reward]),
  );
  const expectedRewardsByKey = new Map(
    filteredExpectedRewards.map((reward) => [rewardKey(reward), reward]),
  );

  const missingRewards = filteredExpectedRewards.filter(
    (reward) => !existingRewardsByKey.has(rewardKey(reward)),
  );
  const staleRewards = filteredExistingRewards.filter(
    (reward) => !expectedRewardsByKey.has(rewardKey(reward)),
  );
  const changedRewards = filteredExpectedRewards
    .map((expectedReward) => {
      const existingReward = existingRewardsByKey.get(rewardKey(expectedReward));

      if (!existingReward || !rewardsDiffer(existingReward, expectedReward)) {
        return null;
      }

      return {
        existing: existingReward,
        expected: expectedReward,
      };
    })
    .filter(Boolean);

  const summary = {
    completedMembers: memberRows.length,
    counts: {
      changed: changedRewards.length,
      existing: filteredExistingRewards.length,
      expected: filteredExpectedRewards.length,
      missing: missingRewards.length,
      stale: staleRewards.length,
    },
    dryRun: !writeChanges,
    targetEmails: [...targetEmails],
    changedRewards: changedRewards.map(summarizeChangedReward),
    missingRewards: missingRewards.map(summarizeReward),
    staleRewards: staleRewards.map(summarizeReward),
  };

  if (!writeChanges) {
    console.log(JSON.stringify(summary, null, 2));
    console.log(
      "\nSet REFERRAL_REWARDS_RECONCILE_WRITE=1 to apply the reward reconciliation.",
    );
    process.exit(0);
  }

  const operations = [
    ...missingRewards.map((reward) => ({
      insertOne: {
        document: {
          ...reward,
          createdAt: new Date(),
        },
      },
    })),
    ...changedRewards.map(({ existing, expected }) => ({
      updateOne: {
        filter: { _id: existing._id },
        update: {
          $set: {
            awardedAt: expected.awardedAt,
            level: expected.level,
            points: expected.points,
            recipientReferralCode: expected.recipientReferralCode,
            sourceMemberReferralCode: expected.sourceMemberReferralCode,
            sourcePaymentTransactionHash: expected.sourcePaymentTransactionHash,
            sourceRegistrationCompletedAt:
              expected.sourceRegistrationCompletedAt,
            sourceWalletAddress: expected.sourceWalletAddress,
          },
        },
      },
    })),
    ...staleRewards.map((reward) => ({
      deleteOne: {
        filter: { _id: reward._id },
      },
    })),
  ];

  if (operations.length > 0) {
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        await rewards.bulkWrite(operations, {
          ordered: false,
          session,
        });
      });
    } finally {
      await session.endSession();
    }
  }

  const nextRewardRows = await rewards
    .find(
      targetEmails.size === 0
        ? {}
        : {
            $or: [
              { recipientEmail: { $in: [...targetEmails] } },
              { sourceMemberEmail: { $in: [...targetEmails] } },
            ],
          },
    )
    .toArray();
  const recipientSummaries = [...targetEmails].reduce((accumulator, email) => {
    accumulator[email] = summarizeRecipientTotals(
      buildRecipientSummary(nextRewardRows, email),
    );
    return accumulator;
  }, {});

  console.log(
    JSON.stringify(
      {
        ...summary,
        dryRun: false,
        recipientSummaries,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
