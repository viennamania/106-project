import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

const DEFAULT_ROOT_EMAIL = "creath.park@gmail.com";
const DEFAULT_CHILD_EMAIL = "genie1647@gmail.com";

const rootEmail = normalizeEmail(
  process.env.REFERRAL_ROOT_EMAIL ?? DEFAULT_ROOT_EMAIL,
);
const childEmail = normalizeEmail(
  process.env.REFERRAL_CHILD_EMAIL ?? DEFAULT_CHILD_EMAIL,
);
const writeChanges = ["1", "true", "yes"].includes(
  (process.env.REFERRAL_REPAIR_WRITE ?? "").trim().toLowerCase(),
);

const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB_NAME?.trim();
const membersCollectionName =
  process.env.MONGODB_MEMBERS_COLLECTION?.trim() ?? "members";
const placementSlotsCollectionName =
  process.env.MONGODB_REFERRAL_PLACEMENT_SLOTS_COLLECTION?.trim() ??
  "referralPlacementSlots";
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
  const code = value?.trim().toUpperCase() ?? "";
  return code || null;
}

function toIsoStringOrNull(value) {
  return value instanceof Date ? value.toISOString() : value ?? null;
}

function summarizeMember(member) {
  if (!member) {
    return null;
  }

  return {
    email: member.email,
    placementAssignedAt: toIsoStringOrNull(member.placementAssignedAt),
    placementEmail: member.placementEmail ?? null,
    placementReferralCode: member.placementReferralCode ?? null,
    placementSource: member.placementSource ?? null,
    referralCode: member.referralCode ?? null,
    referredByCode: member.referredByCode ?? null,
    sponsorReferralCode: member.sponsorReferralCode ?? null,
    status: member.status,
  };
}

function summarizeSlot(slot) {
  if (!slot) {
    return null;
  }

  return {
    claimSource: slot.claimSource ?? null,
    claimedAt: toIsoStringOrNull(slot.claimedAt),
    claimedByEmail: slot.claimedByEmail ?? null,
    ownerEmail: slot.ownerEmail,
    ownerReferralCode: slot.ownerReferralCode,
    slotIndex: slot.slotIndex,
  };
}

function summarizeReward(reward) {
  return {
    awardedAt: toIsoStringOrNull(reward.awardedAt),
    level: reward.level,
    points: reward.points,
    recipientEmail: reward.recipientEmail,
    sourceMemberEmail: reward.sourceMemberEmail,
  };
}

const client = new MongoClient(uri);

try {
  await client.connect();

  const db = client.db(dbName);
  const members = db.collection(membersCollectionName);
  const placementSlots = db.collection(placementSlotsCollectionName);
  const rewards = db.collection(rewardsCollectionName);

  const [rootMember, childMember] = await Promise.all([
    members.findOne({ email: rootEmail }),
    members.findOne({ email: childEmail }),
  ]);

  if (!rootMember) {
    throw new Error(`Root member not found: ${rootEmail}`);
  }

  if (!childMember) {
    throw new Error(`Child member not found: ${childEmail}`);
  }

  if (rootMember.status !== "completed") {
    throw new Error(`Root member is not completed: ${rootEmail}`);
  }

  if (childMember.status !== "completed") {
    throw new Error(`Child member is not completed: ${childEmail}`);
  }

  const rootReferralCode = normalizeReferralCode(rootMember.referralCode);
  const childReferralCode = normalizeReferralCode(childMember.referralCode);

  if (!rootReferralCode) {
    throw new Error(`Root member has no referral code: ${rootEmail}`);
  }

  if (!childReferralCode) {
    throw new Error(`Child member has no referral code: ${childEmail}`);
  }

  const childSponsorReferralCode = normalizeReferralCode(
    childMember.sponsorReferralCode ?? childMember.referredByCode,
  );

  if (childSponsorReferralCode !== rootReferralCode) {
    throw new Error(
      `Child member is not sponsored by root member. Expected ${rootReferralCode}, received ${childSponsorReferralCode ?? "null"}.`,
    );
  }

  const [rootClaimedSlot, childSlotUnderRoot, reciprocalRewards] =
    await Promise.all([
      placementSlots.findOne({ claimedByEmail: rootEmail }),
      placementSlots.findOne({
        ownerReferralCode: rootReferralCode,
        claimedByEmail: childEmail,
      }),
      rewards
        .find({
          $or: [
            {
              recipientEmail: rootEmail,
              sourceMemberEmail: childEmail,
            },
            {
              recipientEmail: childEmail,
              sourceMemberEmail: rootEmail,
            },
          ],
        })
        .sort({ awardedAt: 1, createdAt: 1 })
        .toArray(),
    ]);

  const rootNeedsReset =
    rootMember.placementReferralCode !== null ||
    rootMember.placementEmail !== null ||
    rootMember.placementAssignedAt !== null ||
    rootMember.placementSource !== null;
  const rootClaimMustBeReleased =
    !!rootClaimedSlot && rootClaimedSlot.claimSource === "auto";
  const childPlacementMatchesRoot =
    normalizeReferralCode(childMember.placementReferralCode) === rootReferralCode;
  const childHasRootSlot = Boolean(childSlotUnderRoot);

  if (rootClaimedSlot && rootClaimedSlot.claimSource !== "auto") {
    throw new Error(
      `Root member already occupies a non-auto placement slot (${rootClaimedSlot.ownerReferralCode}#${rootClaimedSlot.slotIndex}). Refusing automatic repair.`,
    );
  }

  if (!childPlacementMatchesRoot || !childHasRootSlot) {
    throw new Error(
      "Child member is not consistently placed under the requested root member. Repair script intentionally aborts instead of rewriting the child branch automatically.",
    );
  }

  const summary = {
    child: summarizeMember(childMember),
    checks: {
      childHasRootSlot,
      childPlacementMatchesRoot,
      childSponsorReferralCode,
      rootClaimMustBeReleased,
      rootNeedsReset,
    },
    dryRun: !writeChanges,
    reciprocalRewards: reciprocalRewards.map(summarizeReward),
    root: summarizeMember(rootMember),
    rootClaimedSlot: summarizeSlot(rootClaimedSlot),
  };

  if (!writeChanges) {
    console.log(JSON.stringify(summary, null, 2));
    console.log(
      "\nSet REFERRAL_REPAIR_WRITE=1 to apply the repair after reviewing this dry-run output.",
    );
    process.exit(0);
  }

  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      const now = new Date();

      if (rootClaimMustBeReleased && rootClaimedSlot) {
        await placementSlots.updateOne(
          {
            ownerReferralCode: rootClaimedSlot.ownerReferralCode,
            slotIndex: rootClaimedSlot.slotIndex,
          },
          {
            $set: {
              claimSource: null,
              claimedAt: null,
              claimedByEmail: null,
              updatedAt: now,
            },
          },
          { session },
        );
      }

      if (rootNeedsReset) {
        await members.updateOne(
          { email: rootEmail },
          {
            $set: {
              placementAssignedAt: null,
              placementEmail: null,
              placementReferralCode: null,
              placementSource: null,
              updatedAt: now,
            },
          },
          { session },
        );
      }
    });
  } finally {
    await session.endSession();
  }

  const [nextRootMember, nextRootSlot] = await Promise.all([
    members.findOne({ email: rootEmail }),
    placementSlots.findOne({ claimedByEmail: rootEmail }),
  ]);

  console.log(
    JSON.stringify(
      {
        ...summary,
        dryRun: false,
        nextRoot: summarizeMember(nextRootMember),
        nextRootClaimedSlot: summarizeSlot(nextRootSlot),
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
