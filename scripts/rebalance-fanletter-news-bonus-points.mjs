import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

const POLICY_VERSION = "fanletter-news-bonus-v2-2026-06";
const POINT_TIER_RULES = [
  { minPoints: 0, tier: "basic" },
  { minPoints: 1_000, tier: "silver" },
  { minPoints: 5_000, tier: "gold" },
  { minPoints: 20_000, tier: "vip" },
];
const REBALANCE_RULES = [
  {
    id: "fan_open_source_vlog",
    memoPattern: /fan-open source vlog/i,
    targetPoints: 10,
  },
  {
    id: "source_reveal_unlock",
    memoPattern: /source reveal unlock/i,
    targetPoints: 5,
  },
  {
    id: "source_reveal_vote",
    memoPattern: /source reveal vote/i,
    targetPoints: 1,
  },
];

const writeChanges = ["1", "true", "yes"].includes(
  (process.env.FANLETTER_NEWS_BONUS_REBALANCE_WRITE ?? "")
    .trim()
    .toLowerCase(),
);
const targetReferralCode = normalizeReferralCode(
  process.env.FANLETTER_NEWS_BONUS_REBALANCE_REFERRAL_CODE,
);
const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB_NAME?.trim();
const membersCollectionName =
  process.env.MONGODB_MEMBERS_COLLECTION?.trim() ?? "members";
const pointLedgerCollectionName =
  process.env.MONGODB_POINT_LEDGER_COLLECTION?.trim() ?? "pointLedger";
const pointBalancesCollectionName =
  process.env.MONGODB_POINT_BALANCES_COLLECTION?.trim() ?? "pointBalances";

if (!uri) {
  throw new Error("MONGODB_URI is not configured.");
}

if (!dbName) {
  throw new Error("MONGODB_DB_NAME is not configured.");
}

function normalizeEmail(value) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeReferralCode(value) {
  const normalized = value?.trim().toUpperCase() ?? "";
  return normalized || null;
}

function getPointTier(points) {
  let tier = POINT_TIER_RULES[0]?.tier ?? "basic";

  for (const rule of POINT_TIER_RULES) {
    if (points >= rule.minPoints) {
      tier = rule.tier;
      continue;
    }

    break;
  }

  return tier;
}

function getRuleForMemo(memo) {
  return REBALANCE_RULES.find((rule) => rule.memoPattern.test(memo ?? ""));
}

async function collectReferralNetworkEmails({ members, referralCode }) {
  if (!referralCode) {
    return null;
  }

  const root = await members.findOne(
    { referralCode },
    { projection: { _id: 0, email: 1, referralCode: 1 } },
  );

  if (!root?.referralCode) {
    throw new Error(`Referral code not found: ${referralCode}`);
  }

  const emails = new Set();
  const visitedReferralCodes = new Set([root.referralCode]);
  let currentParentCodes = [root.referralCode];

  for (let depth = 1; depth <= 6 && currentParentCodes.length > 0; depth += 1) {
    const levelMembers = await members
      .find(
        {
          placementReferralCode: { $in: currentParentCodes },
          status: "completed",
        },
        {
          projection: {
            _id: 0,
            email: 1,
            referralCode: 1,
          },
        },
      )
      .toArray();

    const nextParentCodes = [];

    for (const member of levelMembers) {
      const email = normalizeEmail(member.email);

      if (email) {
        emails.add(email);
      }

      if (
        member.referralCode &&
        !visitedReferralCodes.has(member.referralCode)
      ) {
        visitedReferralCodes.add(member.referralCode);
        nextParentCodes.push(member.referralCode);
      }
    }

    currentParentCodes = nextParentCodes;
  }

  return emails;
}

async function syncPointBalance({ balances, ledger, memberEmail }) {
  const aggregateRows = await ledger
    .aggregate([
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
              $cond: [
                {
                  $and: [
                    { $gt: ["$delta", 0] },
                    { $ne: ["$type", "rollback"] },
                  ],
                },
                "$delta",
                0,
              ],
            },
          },
          spendablePoints: { $sum: "$delta" },
        },
      },
    ])
    .toArray();
  const aggregate = aggregateRows[0];
  const now = new Date();
  const spendablePoints = aggregate?.spendablePoints ?? 0;

  await balances.updateOne(
    { memberEmail },
    {
      $set: {
        lifetimePoints: aggregate?.lifetimePoints ?? 0,
        spendablePoints,
        tier: getPointTier(spendablePoints),
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
        loyaltyCardTokenId: null,
        memberEmail,
        reservedPoints: 0,
      },
    },
    { upsert: true },
  );
}

function createEmptyStats() {
  return Object.fromEntries(
    REBALANCE_RULES.map((rule) => [
      rule.id,
      {
        affectedEntries: 0,
        affectedMembers: new Set(),
        beforePoints: 0,
        reductionPoints: 0,
        targetPoints: rule.targetPoints,
      },
    ]),
  );
}

function serializeStats(stats) {
  return Object.fromEntries(
    Object.entries(stats).map(([key, value]) => [
      key,
      {
        affectedEntries: value.affectedEntries,
        affectedMembers: value.affectedMembers.size,
        beforePoints: value.beforePoints,
        afterPoints: value.beforePoints - value.reductionPoints,
        reductionPoints: value.reductionPoints,
        targetPoints: value.targetPoints,
      },
    ]),
  );
}

const client = new MongoClient(uri);

try {
  await client.connect();

  const db = client.db(dbName);
  const members = db.collection(membersCollectionName);
  const ledger = db.collection(pointLedgerCollectionName);
  const balances = db.collection(pointBalancesCollectionName);
  const scopedEmails = await collectReferralNetworkEmails({
    members,
    referralCode: targetReferralCode,
  });
  const filter = {
    sourceType: "bonus",
    type: "earn",
    ...(scopedEmails
      ? { memberEmail: { $in: [...scopedEmails] } }
      : {}),
  };
  const cursor = ledger.find(filter, {
    projection: {
      _id: 1,
      delta: 1,
      ledgerEntryId: 1,
      memberEmail: 1,
      memo: 1,
      originalDelta: 1,
    },
  });
  const stats = createEmptyStats();
  const affectedMemberEmails = new Set();
  const memberImpacts = new Map();
  const updates = [];

  for await (const entry of cursor) {
    const rule = getRuleForMemo(entry.memo);

    if (!rule || entry.delta <= rule.targetPoints) {
      continue;
    }

    const reduction = entry.delta - rule.targetPoints;
    const ruleStats = stats[rule.id];
    const memberEmail = normalizeEmail(entry.memberEmail);

    ruleStats.affectedEntries += 1;
    ruleStats.beforePoints += entry.delta;
    ruleStats.reductionPoints += reduction;

    if (memberEmail) {
      ruleStats.affectedMembers.add(memberEmail);
      affectedMemberEmails.add(memberEmail);

      const impact = memberImpacts.get(memberEmail) ?? {
        afterPoints: 0,
        beforePoints: 0,
        entries: 0,
        memberEmail,
        reductionPoints: 0,
      };

      impact.afterPoints += rule.targetPoints;
      impact.beforePoints += entry.delta;
      impact.entries += 1;
      impact.reductionPoints += reduction;
      memberImpacts.set(memberEmail, impact);
    }

    updates.push({
      _id: entry._id,
      ledgerEntryId: entry.ledgerEntryId,
      memberEmail,
      originalDelta: entry.originalDelta ?? entry.delta,
      targetDelta: rule.targetPoints,
    });
  }

  const beforeBalanceRows = affectedMemberEmails.size
    ? await balances
        .find(
          { memberEmail: { $in: [...affectedMemberEmails] } },
          {
            projection: {
              _id: 0,
              lifetimePoints: 1,
              memberEmail: 1,
              spendablePoints: 1,
            },
          },
        )
        .toArray()
    : [];
  const beforeTotals = beforeBalanceRows.reduce(
    (total, balance) => ({
      lifetimePoints: total.lifetimePoints + (balance.lifetimePoints ?? 0),
      spendablePoints: total.spendablePoints + (balance.spendablePoints ?? 0),
    }),
    { lifetimePoints: 0, spendablePoints: 0 },
  );
  const reductionPoints = Object.values(stats).reduce(
    (sum, row) => sum + row.reductionPoints,
    0,
  );

  console.log(
    JSON.stringify(
      {
        apply: writeChanges,
        policyVersion: POLICY_VERSION,
        scope: targetReferralCode
          ? { referralCode: targetReferralCode, members: scopedEmails?.size ?? 0 }
          : { referralCode: null, members: "all" },
        entriesToUpdate: updates.length,
        affectedMembers: affectedMemberEmails.size,
        beforeTotals,
        estimatedAfterTotals: {
          lifetimePoints: beforeTotals.lifetimePoints - reductionPoints,
          spendablePoints: beforeTotals.spendablePoints - reductionPoints,
        },
        reductionPoints,
        topMemberImpacts: [...memberImpacts.values()]
          .sort((left, right) => right.reductionPoints - left.reductionPoints)
          .slice(0, 20),
        stats: serializeStats(stats),
      },
      null,
      2,
    ),
  );

  if (!writeChanges) {
    console.log(
      "Dry-run only. Set FANLETTER_NEWS_BONUS_REBALANCE_WRITE=true to apply.",
    );
    process.exit(0);
  }

  const now = new Date();
  let updatedEntries = 0;

  for (let index = 0; index < updates.length; index += 500) {
    const batch = updates.slice(index, index + 500);
    const result = await ledger.bulkWrite(
      batch.map((update) => ({
        updateOne: {
          filter: { _id: update._id },
          update: {
            $set: {
              delta: update.targetDelta,
              originalDelta: update.originalDelta,
              rebalancePolicyVersion: POLICY_VERSION,
              rebalancedAt: now,
              updatedAt: now,
            },
          },
        },
      })),
      { ordered: false },
    );

    updatedEntries += result.modifiedCount;
  }

  for (const memberEmail of affectedMemberEmails) {
    await syncPointBalance({ balances, ledger, memberEmail });
  }

  console.log(
    JSON.stringify(
      {
        applied: true,
        policyVersion: POLICY_VERSION,
        syncedMembers: affectedMemberEmails.size,
        updatedEntries,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
