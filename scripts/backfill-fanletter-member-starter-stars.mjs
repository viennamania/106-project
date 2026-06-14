import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

const DEFAULT_SAMPLE_LIMIT = 12;

const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB_NAME?.trim();
const membersCollectionName =
  process.env.MONGODB_MEMBERS_COLLECTION?.trim() ?? "members";
const fanletterStarsCollectionName =
  process.env.MONGODB_FANLETTER_STARS_COLLECTION?.trim() ?? "fanletterStars";
const fanletterStarFounderMembershipsCollectionName =
  process.env.MONGODB_FANLETTER_STAR_FOUNDER_MEMBERSHIPS_COLLECTION?.trim() ??
  "fanletterStarFounderMemberships";
const fanletterStarReferralEdgesCollectionName =
  process.env.MONGODB_FANLETTER_STAR_REFERRAL_EDGES_COLLECTION?.trim() ??
  "fanletterStarReferralEdges";

const writeChanges = readBoolean(
  process.env.FANLETTER_MEMBER_STARTER_STARS_BACKFILL_WRITE,
);
const maxWrites = readPositiveInteger(
  process.env.FANLETTER_MEMBER_STARTER_STARS_BACKFILL_LIMIT,
  Number.POSITIVE_INFINITY,
);
const sampleLimit = readPositiveInteger(
  process.env.FANLETTER_MEMBER_STARTER_STARS_BACKFILL_SAMPLE_LIMIT,
  DEFAULT_SAMPLE_LIMIT,
);

const roleDepth = new Map([
  ["creator", 0],
  ["genesis_founder", 1],
  ["founder", 2],
  ["mentor", 3],
  ["producer", 4],
  ["partner", 5],
  ["legend", 6],
]);

if (!uri) {
  throw new Error("MONGODB_URI is not configured.");
}

if (!dbName) {
  throw new Error("MONGODB_DB_NAME is not configured.");
}

function readBoolean(value) {
  return ["1", "true", "yes"].includes(String(value ?? "").trim().toLowerCase());
}

function readPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeReferralCode(value) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";

  return normalized || null;
}

function normalizeStarId(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeDateTime(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getTime();
  }

  if (typeof value === "string") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.getTime();
    }
  }

  return 0;
}

function getMemberJoinedAt(member, fallback) {
  if (
    member.registrationCompletedAt instanceof Date &&
    !Number.isNaN(member.registrationCompletedAt.getTime())
  ) {
    return member.registrationCompletedAt;
  }

  if (member.createdAt instanceof Date && !Number.isNaN(member.createdAt.getTime())) {
    return member.createdAt;
  }

  return fallback;
}

function sortMemberships(left, right) {
  const leftDepth = roleDepth.get(left.role) ?? 99;
  const rightDepth = roleDepth.get(right.role) ?? 99;

  return (
    leftDepth - rightDepth ||
    normalizeDateTime(left.joinedAt) - normalizeDateTime(right.joinedAt) ||
    normalizeStarId(left.starId).localeCompare(normalizeStarId(right.starId))
  );
}

function pickOwnedStar({ member, ownedStars }) {
  const memberEmail = normalizeEmail(member.email);
  const memberReferralCode = normalizeReferralCode(member.referralCode);
  const candidates = (ownedStars.get(memberEmail) ?? [])
    .filter((star) => normalizeStarId(star.starId))
    .sort((left, right) => {
      const leftReferralMatch =
        normalizeReferralCode(left.legacyCreatorReferralCode) === memberReferralCode
          ? 1
          : 0;
      const rightReferralMatch =
        normalizeReferralCode(right.legacyCreatorReferralCode) === memberReferralCode
          ? 1
          : 0;
      const leftSignupSource = left.source === "member_signup" ? 1 : 0;
      const rightSignupSource = right.source === "member_signup" ? 1 : 0;

      return (
        rightReferralMatch - leftReferralMatch ||
        rightSignupSource - leftSignupSource ||
        normalizeDateTime(left.createdAt) - normalizeDateTime(right.createdAt) ||
        normalizeStarId(left.starId).localeCompare(normalizeStarId(right.starId))
      );
    });

  return candidates[0] ?? null;
}

function resolveStarterStar({
  fallbackStar,
  member,
  membershipsByMemberEmail,
  ownedStars,
  referralEdgesByTargetEmail,
  starsById,
}) {
  const memberEmail = normalizeEmail(member.email);
  const referralStarId = normalizeStarId(member.fanletterStarReferralStarId);

  if (referralStarId && starsById.has(referralStarId)) {
    return {
      reason: "existing_referral_star",
      source: "referral_star",
      star: starsById.get(referralStarId),
    };
  }

  const ownedStar = pickOwnedStar({ member, ownedStars });

  if (ownedStar) {
    return {
      reason: "member owns a starter AI Star",
      source: "owned_star",
      star: ownedStar,
    };
  }

  const memberships = (membershipsByMemberEmail.get(memberEmail) ?? [])
    .filter((membership) => starsById.has(normalizeStarId(membership.starId)))
    .sort(sortMemberships);
  const creatorMembership = memberships.find(
    (membership) => membership.role === "creator",
  );

  if (creatorMembership) {
    return {
      reason: "creator membership",
      source: "creator_membership",
      star: starsById.get(normalizeStarId(creatorMembership.starId)),
    };
  }

  if (memberships[0]) {
    return {
      reason: `${memberships[0].role} membership`,
      source: "founder_membership",
      star: starsById.get(normalizeStarId(memberships[0].starId)),
    };
  }

  const firstReferralEdge = (referralEdgesByTargetEmail.get(memberEmail) ?? [])
    .filter((edge) => starsById.has(normalizeStarId(edge.starId)))
    .sort(
      (left, right) =>
        normalizeDateTime(left.createdAt) - normalizeDateTime(right.createdAt) ||
        normalizeStarId(left.starId).localeCompare(normalizeStarId(right.starId)),
    )[0];

  if (firstReferralEdge) {
    return {
      reason: "first AI Star referral edge",
      source: "referral_edge",
      star: starsById.get(normalizeStarId(firstReferralEdge.starId)),
    };
  }

  if (fallbackStar) {
    return {
      reason: "platform active star fallback",
      source: "fallback_active_star",
      star: fallbackStar,
    };
  }

  return null;
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function mapToSortedObject(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => {
    return String(left).localeCompare(String(right));
  }));
}

function summarizeBulkWriteResult(result) {
  return {
    matched: result.matchedCount ?? 0,
    modified: result.modifiedCount ?? 0,
    upserted: result.upsertedCount ?? 0,
  };
}

async function main() {
  const client = new MongoClient(uri);

  await client.connect();

  try {
    const db = client.db(dbName);
    const membersCollection = db.collection(membersCollectionName);
    const starsCollection = db.collection(fanletterStarsCollectionName);
    const membershipsCollection = db.collection(
      fanletterStarFounderMembershipsCollectionName,
    );
    const referralEdgesCollection = db.collection(
      fanletterStarReferralEdgesCollectionName,
    );
    const now = new Date();
    const [members, stars, memberships, referralEdges] = await Promise.all([
      membersCollection
        .find(
          {
            status: "completed",
            fanletterStarterStarId: { $exists: false },
            fanletterStarReferralStarId: { $exists: false },
          },
          {
            projection: {
              _id: 0,
              createdAt: 1,
              email: 1,
              fanletterStarReferralStarId: 1,
              publicProfile: 1,
              referralCode: 1,
              registrationCompletedAt: 1,
            },
          },
        )
        .sort({ registrationCompletedAt: 1, createdAt: 1, email: 1 })
        .toArray(),
      starsCollection
        .find(
          {
            status: { $ne: "archived" },
          },
          {
            projection: {
              _id: 0,
              characterName: 1,
              createdAt: 1,
              displayName: 1,
              founderCount: 1,
              legacyCreatorReferralCode: 1,
              ownerEmail: 1,
              source: 1,
              starId: 1,
              starScore: 1,
              status: 1,
            },
          },
        )
        .toArray(),
      membershipsCollection
        .find(
          {},
          {
            projection: {
              _id: 0,
              joinedAt: 1,
              memberEmail: 1,
              role: 1,
              source: 1,
              starId: 1,
            },
          },
        )
        .sort({ joinedAt: 1 })
        .toArray(),
      referralEdgesCollection
        .find(
          {},
          {
            projection: {
              _id: 0,
              createdAt: 1,
              edgeId: 1,
              sourceMemberEmail: 1,
              starId: 1,
              targetMemberEmail: 1,
            },
          },
        )
        .sort({ createdAt: 1 })
        .toArray(),
    ]);
    const starsById = new Map(
      stars
        .map((star) => [normalizeStarId(star.starId), star])
        .filter(([starId]) => starId),
    );
    const ownedStars = new Map();
    const membershipsByMemberEmail = new Map();
    const referralEdgesByTargetEmail = new Map();

    for (const star of stars) {
      const ownerEmail = normalizeEmail(star.ownerEmail);

      if (!ownerEmail) {
        continue;
      }

      const list = ownedStars.get(ownerEmail) ?? [];
      list.push(star);
      ownedStars.set(ownerEmail, list);
    }

    for (const membership of memberships) {
      const memberEmail = normalizeEmail(membership.memberEmail);

      if (!memberEmail) {
        continue;
      }

      const list = membershipsByMemberEmail.get(memberEmail) ?? [];
      list.push(membership);
      membershipsByMemberEmail.set(memberEmail, list);
    }

    for (const edge of referralEdges) {
      const targetEmail = normalizeEmail(edge.targetMemberEmail);

      if (!targetEmail) {
        continue;
      }

      const list = referralEdgesByTargetEmail.get(targetEmail) ?? [];
      list.push(edge);
      referralEdgesByTargetEmail.set(targetEmail, list);
    }

    const fallbackStar =
      stars
        .filter((star) => star.status === "active")
        .slice()
        .sort(
          (left, right) =>
            (right.starScore ?? 0) - (left.starScore ?? 0) ||
            (right.founderCount ?? 0) - (left.founderCount ?? 0) ||
            normalizeDateTime(left.createdAt) - normalizeDateTime(right.createdAt) ||
            normalizeStarId(left.starId).localeCompare(normalizeStarId(right.starId)),
        )[0] ?? null;
    const assignments = [];
    const skipped = [];
    const sourceCounts = new Map();

    for (const member of members) {
      if (assignments.length >= maxWrites) {
        skipped.push({
          email: normalizeEmail(member.email),
          reason: "write_limit",
        });
        continue;
      }

      const resolved = resolveStarterStar({
        fallbackStar,
        member,
        membershipsByMemberEmail,
        ownedStars,
        referralEdgesByTargetEmail,
        starsById,
      });

      if (!resolved?.star) {
        skipped.push({
          email: normalizeEmail(member.email),
          reason: "no_resolvable_star",
        });
        continue;
      }

      increment(sourceCounts, resolved.source);
      assignments.push({
        email: normalizeEmail(member.email),
        joinedAt: getMemberJoinedAt(member, now),
        reason: resolved.reason,
        source: resolved.source,
        starId: normalizeStarId(resolved.star.starId),
        starName:
          resolved.star.characterName ||
          resolved.star.displayName ||
          normalizeStarId(resolved.star.starId),
      });
    }

    let writeResult = null;

    if (writeChanges && assignments.length > 0) {
      const bulkResult = await membersCollection.bulkWrite(
        assignments.map((assignment) => ({
          updateOne: {
            filter: {
              email: assignment.email,
              status: "completed",
              fanletterStarterStarId: { $exists: false },
              fanletterStarReferralStarId: { $exists: false },
            },
            update: {
              $set: {
                fanletterStarterStarBackfilledAt: now,
                fanletterStarterStarId: assignment.starId,
                fanletterStarterStarSource: assignment.source,
                fanletterStarterUniverseEnsuredAt: now,
                updatedAt: now,
              },
            },
          },
        })),
        { ordered: false },
      );
      writeResult = summarizeBulkWriteResult(bulkResult);
    }

    console.log(
      JSON.stringify(
        {
          assignments: assignments.length,
          backfillMode: writeChanges ? "write" : "dry-run-read-only",
          collectionNames: {
            fanletterStarFounderMemberships:
              fanletterStarFounderMembershipsCollectionName,
            fanletterStarReferralEdges: fanletterStarReferralEdgesCollectionName,
            fanletterStars: fanletterStarsCollectionName,
            members: membersCollectionName,
          },
          counts: {
            fallbackStarId: fallbackStar ? normalizeStarId(fallbackStar.starId) : null,
            missingStarterStarMembers: members.length,
            scannedMemberships: memberships.length,
            scannedReferralEdges: referralEdges.length,
            scannedStars: stars.length,
          },
          dryRunWriteCommand:
            "FANLETTER_MEMBER_STARTER_STARS_BACKFILL_WRITE=1 pnpm fanletter:member-starter-stars:backfill",
          notes: [
            "This script does not create AI Stars or payment records.",
            "It only attaches completed members to an existing starter AI Star.",
            "Resolution order: existing referral star, owned star, creator membership, founder membership, referral edge, active star fallback.",
          ],
          sampleAssignments: assignments.slice(0, sampleLimit),
          sampleSkipped: skipped.slice(0, sampleLimit),
          skipped: skipped.length,
          sourceCounts: mapToSortedObject(sourceCounts),
          writeResult,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
