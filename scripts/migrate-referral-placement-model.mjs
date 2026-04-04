import { MongoClient } from "mongodb";

const REFERRAL_SIGNUP_LIMIT = 6;

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

function dateOrNull(value) {
  return value instanceof Date ? value : value ? new Date(value) : null;
}

function sameDate(left, right) {
  if (left === null && right === null) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return left.getTime() === right.getTime();
}

function sameValue(left, right) {
  if (left instanceof Date || right instanceof Date) {
    return sameDate(dateOrNull(left), dateOrNull(right));
  }

  return left === right;
}

function getPlacementTimestamp(member) {
  return (
    dateOrNull(member.placementAssignedAt) ??
    dateOrNull(member.registrationCompletedAt) ??
    dateOrNull(member.createdAt)
  );
}

function sortByTimestampAndEmail(left, right) {
  const leftTime = getPlacementTimestamp(left)?.getTime() ?? 0;
  const rightTime = getPlacementTimestamp(right)?.getTime() ?? 0;

  if (leftTime !== rightTime) {
    return leftTime - rightTime;
  }

  return String(left.email).localeCompare(String(right.email));
}

function buildNormalizedMember(member, emailByReferralCode) {
  const sponsorReferralCode =
    member.sponsorReferralCode ?? member.referredByCode ?? null;
  const sponsorEmail = sponsorReferralCode
    ? emailByReferralCode.get(sponsorReferralCode) ??
      member.sponsorEmail ??
      member.referredByEmail ??
      null
    : null;
  const isCompleted = member.status === "completed";
  const placementReferralCode = isCompleted
    ? member.placementReferralCode ?? member.referredByCode ?? null
    : null;
  const placementEmail = placementReferralCode
    ? emailByReferralCode.get(placementReferralCode) ??
      member.placementEmail ??
      member.referredByEmail ??
      null
    : null;
  const placementAssignedAt = placementReferralCode
    ? dateOrNull(member.placementAssignedAt) ??
      dateOrNull(member.registrationCompletedAt) ??
      dateOrNull(member.createdAt)
    : null;
  const placementSource = placementReferralCode
    ? member.placementSource ?? "manual"
    : null;

  return {
    ...member,
    placementAssignedAt,
    placementEmail,
    placementReferralCode,
    placementSource,
    referredByCode: sponsorReferralCode,
    referredByEmail: sponsorEmail,
    sponsorEmail,
    sponsorReferralCode,
  };
}

function buildMemberPatch(originalMember, normalizedMember) {
  const fields = [
    "placementAssignedAt",
    "placementEmail",
    "placementReferralCode",
    "placementSource",
    "referredByCode",
    "referredByEmail",
    "sponsorEmail",
    "sponsorReferralCode",
  ];
  const patch = {};

  for (const field of fields) {
    const originalValue =
      field === "placementAssignedAt"
        ? dateOrNull(originalMember[field])
        : originalMember[field] ?? null;
    const normalizedValue =
      field === "placementAssignedAt"
        ? dateOrNull(normalizedMember[field])
        : normalizedMember[field] ?? null;

    if (!sameValue(originalValue, normalizedValue)) {
      patch[field] = normalizedValue;
    }
  }

  return patch;
}

const client = new MongoClient(uri);

try {
  await client.connect();

  const db = client.db(dbName);
  const membersCollection = db.collection(membersCollectionName);
  const placementSlotsCollection = db.collection(placementSlotsCollectionName);
  const members = await membersCollection
    .find({})
    .sort({ createdAt: 1, email: 1 })
    .toArray();
  const emailByReferralCode = new Map(
    members
      .filter((member) => typeof member.referralCode === "string" && member.referralCode)
      .map((member) => [member.referralCode, member.email]),
  );
  const normalizedMembers = members.map((member) =>
    buildNormalizedMember(member, emailByReferralCode),
  );
  const memberPatches = normalizedMembers
    .map((member, index) => ({
      _id: members[index]._id,
      patch: buildMemberPatch(members[index], member),
    }))
    .filter(({ patch }) => Object.keys(patch).length > 0);

  if (memberPatches.length > 0) {
    await membersCollection.bulkWrite(
      memberPatches.map(({ _id, patch }) => ({
        updateOne: {
          filter: { _id },
          update: {
            $set: patch,
          },
        },
      })),
      { ordered: false },
    );
  }

  const normalizedMembersByReferralCode = new Map(
    normalizedMembers
      .filter((member) => member.status === "completed" && member.referralCode)
      .map((member) => [member.referralCode, member]),
  );
  const placementsByOwnerCode = new Map();

  for (const member of normalizedMembers) {
    if (
      member.status !== "completed" ||
      !member.placementReferralCode ||
      !member.email
    ) {
      continue;
    }

    const owner = normalizedMembersByReferralCode.get(member.placementReferralCode);

    if (!owner) {
      throw new Error(
        `Cannot rebuild placement slots because owner ${member.placementReferralCode} for ${member.email} does not exist as a completed member.`,
      );
    }

    const children = placementsByOwnerCode.get(member.placementReferralCode) ?? [];
    children.push(member);
    placementsByOwnerCode.set(member.placementReferralCode, children);
  }

  const slotDocuments = [];

  for (const owner of normalizedMembers) {
    if (owner.status !== "completed" || !owner.referralCode) {
      continue;
    }

    const claimedChildren =
      placementsByOwnerCode.get(owner.referralCode)?.sort(sortByTimestampAndEmail) ??
      [];
    const slotCount = Math.max(REFERRAL_SIGNUP_LIMIT, claimedChildren.length);
    const ownerRegistrationCompletedAt =
      dateOrNull(owner.registrationCompletedAt) ?? dateOrNull(owner.createdAt);
    const ownerCreatedAt = ownerRegistrationCompletedAt;

    for (let index = 0; index < slotCount; index += 1) {
      const claimedChild = claimedChildren[index] ?? null;
      const claimedAt = claimedChild ? getPlacementTimestamp(claimedChild) : null;

      slotDocuments.push({
        claimSource: claimedChild?.placementSource ?? null,
        claimedAt,
        claimedByEmail: claimedChild?.email ?? null,
        createdAt: ownerCreatedAt,
        ownerEmail: owner.email,
        ownerReferralCode: owner.referralCode,
        ownerRegistrationCompletedAt,
        slotIndex: index + 1,
        updatedAt: claimedAt ?? ownerCreatedAt,
      });
    }
  }

  await placementSlotsCollection.deleteMany({});

  if (slotDocuments.length > 0) {
    await placementSlotsCollection.insertMany(slotDocuments, { ordered: true });
  }

  const claimedSlots = slotDocuments.filter((slot) => slot.claimedByEmail).length;

  console.log(
    JSON.stringify(
      {
        claimedSlots,
        dbName,
        memberUpdates: memberPatches.length,
        membersCollection: membersCollectionName,
        membersScanned: members.length,
        placementRoots: normalizedMembersByReferralCode.size,
        slotsCollection: placementSlotsCollectionName,
        totalSlots: slotDocuments.length,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
