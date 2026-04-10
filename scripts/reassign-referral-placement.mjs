import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

const REFERRAL_SIGNUP_LIMIT = 6;
const DEFAULT_CHILD_EMAIL = "condocter@naver.com";
const DEFAULT_PARENT_EMAIL = "jasonkim.v@gmail.com";

const childEmail = normalizeEmail(
  process.env.REFERRAL_REASSIGN_CHILD_EMAIL ?? DEFAULT_CHILD_EMAIL,
);
const parentEmail = normalizeEmail(
  process.env.REFERRAL_REASSIGN_PARENT_EMAIL ?? DEFAULT_PARENT_EMAIL,
);
const requestedSlotIndex = parseSlotIndex(
  process.env.REFERRAL_REASSIGN_SLOT_INDEX,
);
const writeChanges = ["1", "true", "yes"].includes(
  (process.env.REFERRAL_REASSIGN_WRITE ?? "").trim().toLowerCase(),
);

const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB_NAME?.trim();
const membersCollectionName =
  process.env.MONGODB_MEMBERS_COLLECTION?.trim() ?? "members";
const placementSlotsCollectionName =
  process.env.MONGODB_REFERRAL_PLACEMENT_SLOTS_COLLECTION?.trim() ??
  "referralPlacementSlots";

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

function parseSlotIndex(value) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1 ||
    parsed > REFERRAL_SIGNUP_LIMIT
  ) {
    throw new Error(
      `REFERRAL_REASSIGN_SLOT_INDEX must be an integer between 1 and ${REFERRAL_SIGNUP_LIMIT}.`,
    );
  }

  return parsed;
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

async function ensurePlacementSlotsForCompletedMember({
  collection,
  member,
}) {
  const ownerReferralCode = normalizeReferralCode(member.referralCode);

  if (member.status !== "completed" || !ownerReferralCode) {
    return;
  }

  const ownerRegistrationCompletedAt =
    member.registrationCompletedAt ?? member.createdAt;
  const baseTimestamp = ownerRegistrationCompletedAt;

  await collection.bulkWrite(
    Array.from({ length: REFERRAL_SIGNUP_LIMIT }, (_, index) => ({
      updateOne: {
        filter: {
          ownerReferralCode,
          slotIndex: index + 1,
        },
        update: {
          $setOnInsert: {
            claimSource: null,
            claimedAt: null,
            claimedByEmail: null,
            createdAt: baseTimestamp,
            ownerEmail: member.email,
            ownerReferralCode,
            ownerRegistrationCompletedAt,
            slotIndex: index + 1,
            updatedAt: baseTimestamp,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}

async function getPlacementDescendantReferralCodes({
  collection,
  rootReferralCode,
}) {
  const visitedReferralCodes = new Set([rootReferralCode]);
  const descendantReferralCodes = new Set();
  let currentParentCodes = [rootReferralCode];

  while (currentParentCodes.length > 0) {
    const levelMembers = await collection
      .find({
        placementReferralCode: { $in: currentParentCodes },
        status: "completed",
      })
      .project({ referralCode: 1 })
      .toArray();

    if (levelMembers.length === 0) {
      break;
    }

    const nextParentCodes = [];

    for (const levelMember of levelMembers) {
      const referralCode = normalizeReferralCode(levelMember.referralCode);

      if (!referralCode || visitedReferralCodes.has(referralCode)) {
        continue;
      }

      visitedReferralCodes.add(referralCode);
      descendantReferralCodes.add(referralCode);
      nextParentCodes.push(referralCode);
    }

    currentParentCodes = nextParentCodes;
  }

  return descendantReferralCodes;
}

const client = new MongoClient(uri);

try {
  await client.connect();

  const db = client.db(dbName);
  const members = db.collection(membersCollectionName);
  const placementSlots = db.collection(placementSlotsCollectionName);

  const [childMember, parentMember] = await Promise.all([
    members.findOne({ email: childEmail }),
    members.findOne({ email: parentEmail }),
  ]);

  if (!childMember) {
    throw new Error(`Child member not found: ${childEmail}`);
  }

  if (!parentMember) {
    throw new Error(`Parent member not found: ${parentEmail}`);
  }

  if (childMember.status !== "completed") {
    throw new Error(`Child member is not completed: ${childEmail}`);
  }

  if (parentMember.status !== "completed") {
    throw new Error(`Parent member is not completed: ${parentEmail}`);
  }

  const childReferralCode = normalizeReferralCode(childMember.referralCode);
  const parentReferralCode = normalizeReferralCode(parentMember.referralCode);

  if (!childReferralCode) {
    throw new Error(`Child member has no referral code: ${childEmail}`);
  }

  if (!parentReferralCode) {
    throw new Error(`Parent member has no referral code: ${parentEmail}`);
  }

  if (childEmail === parentEmail || childReferralCode === parentReferralCode) {
    throw new Error("Child member cannot be reassigned under itself.");
  }

  const descendantReferralCodes = await getPlacementDescendantReferralCodes({
    collection: members,
    rootReferralCode: childReferralCode,
  });

  if (descendantReferralCodes.has(parentReferralCode)) {
    throw new Error(
      `Reassigning ${childEmail} under ${parentEmail} would create a cycle.`,
    );
  }

  await ensurePlacementSlotsForCompletedMember({
    collection: placementSlots,
    member: parentMember,
  });

  const [existingClaimedSlot, targetParentSlots] = await Promise.all([
    placementSlots.findOne({ claimedByEmail: childEmail }),
    placementSlots
      .find({ ownerReferralCode: parentReferralCode })
      .sort({ slotIndex: 1 })
      .toArray(),
  ]);

  const desiredSlot =
    requestedSlotIndex !== null
      ? targetParentSlots.find((slot) => slot.slotIndex === requestedSlotIndex)
      : targetParentSlots.find((slot) => slot.claimedByEmail === null);

  if (!desiredSlot) {
    throw new Error(
      requestedSlotIndex !== null
        ? `Requested slot ${requestedSlotIndex} is not available under ${parentEmail}.`
        : `No open placement slot found under ${parentEmail}.`,
    );
  }

  if (
    desiredSlot.claimedByEmail &&
    desiredSlot.claimedByEmail !== childEmail
  ) {
    throw new Error(
      `Target slot ${desiredSlot.slotIndex} under ${parentEmail} is already claimed by ${desiredSlot.claimedByEmail}.`,
    );
  }

  const alreadyAssignedToTarget =
    childMember.placementEmail === parentEmail &&
    normalizeReferralCode(childMember.placementReferralCode) ===
      parentReferralCode &&
    existingClaimedSlot &&
    existingClaimedSlot.ownerReferralCode === parentReferralCode &&
    existingClaimedSlot.slotIndex === desiredSlot.slotIndex;

  const summary = {
    child: summarizeMember(childMember),
    currentClaimedSlot: summarizeSlot(existingClaimedSlot),
    dryRun: !writeChanges,
    parent: summarizeMember(parentMember),
    targetSlot: summarizeSlot(desiredSlot),
  };

  if (alreadyAssignedToTarget) {
    console.log(
      JSON.stringify(
        {
          ...summary,
          alreadyAssignedToTarget: true,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  if (!writeChanges) {
    console.log(JSON.stringify(summary, null, 2));
    console.log(
      "\nSet REFERRAL_REASSIGN_WRITE=1 to apply the placement reassignment.",
    );
    process.exit(0);
  }

  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      const now = new Date();

      if (existingClaimedSlot) {
        await placementSlots.updateOne(
          {
            ownerReferralCode: existingClaimedSlot.ownerReferralCode,
            slotIndex: existingClaimedSlot.slotIndex,
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

      await placementSlots.updateOne(
        {
          ownerReferralCode: parentReferralCode,
          slotIndex: desiredSlot.slotIndex,
        },
        {
          $set: {
            claimSource: "manual",
            claimedAt: now,
            claimedByEmail: childEmail,
            updatedAt: now,
          },
        },
        { session },
      );

      await members.updateOne(
        { email: childEmail },
        {
          $set: {
            placementAssignedAt: now,
            placementEmail: parentEmail,
            placementReferralCode: parentReferralCode,
            placementSource: "manual",
            updatedAt: now,
          },
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  const [nextChildMember, nextClaimedSlot] = await Promise.all([
    members.findOne({ email: childEmail }),
    placementSlots.findOne({ claimedByEmail: childEmail }),
  ]);

  console.log(
    JSON.stringify(
      {
        ...summary,
        dryRun: false,
        nextChild: summarizeMember(nextChildMember),
        nextClaimedSlot: summarizeSlot(nextClaimedSlot),
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
