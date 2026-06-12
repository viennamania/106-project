import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

const CP_POOL_REWARDS = [
  { cp: 300, depth: 0, role: "creator" },
  { cp: 300, depth: 1, role: "genesis_founder" },
  { cp: 200, depth: 2, role: "founder" },
  { cp: 150, depth: 3, role: "mentor" },
  { cp: 50, depth: 4, role: "producer" },
];
const ROLE_DEPTH = new Map([
  ["creator", 0],
  ["genesis_founder", 1],
  ["founder", 2],
  ["mentor", 3],
  ["producer", 4],
  ["partner", 5],
  ["legend", 6],
]);
const DEFAULT_SAMPLE_LIMIT = 12;

const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB_NAME?.trim();
const writeChanges = readBoolean(
  process.env.FANLETTER_AI_STAR_GENEALOGY_BACKFILL_WRITE,
);
const sampleLimit = readPositiveInteger(
  process.env.FANLETTER_AI_STAR_GENEALOGY_BACKFILL_SAMPLE_LIMIT,
  DEFAULT_SAMPLE_LIMIT,
);
const maxWrites = readPositiveInteger(
  process.env.FANLETTER_AI_STAR_GENEALOGY_BACKFILL_LIMIT,
  Number.POSITIVE_INFINITY,
);

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

function stableHash(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getStarName(star) {
  return star.characterName || star.displayName || star.starId;
}

function getLedgerSourceId({
  launchStarId,
  recipientMemberEmail,
  role,
  sourceStarId,
}) {
  return [
    "creator-launch-cp-pool",
    normalizeStarId(sourceStarId),
    normalizeStarId(launchStarId),
    role,
    normalizeEmail(recipientMemberEmail),
  ].join(":");
}

function buildParentMap(stars) {
  const parentByStarId = new Map();
  const starIds = new Set(stars.map((star) => star.starId));

  for (const star of stars) {
    const parentId = normalizeStarId(star.spawnedFromStarId);

    if (parentId && parentId !== star.starId && starIds.has(parentId)) {
      parentByStarId.set(star.starId, parentId);
    }
  }

  return parentByStarId;
}

function wouldCreateCycle({ childStarId, parentByStarId, parentStarId }) {
  let current = parentStarId;
  const visited = new Set([childStarId]);

  while (current) {
    if (visited.has(current)) {
      return true;
    }

    visited.add(current);
    current = parentByStarId.get(current);
  }

  return false;
}

function getCreatorEmail({ membershipsByStarId, star }) {
  const ownerEmail = normalizeEmail(star.ownerEmail);

  if (ownerEmail) {
    return ownerEmail;
  }

  const creatorMembership = (membershipsByStarId.get(star.starId) ?? []).find(
    (membership) => membership.role === "creator",
  );

  return normalizeEmail(creatorMembership?.memberEmail);
}

function isMemberSignupBackfillStar(star) {
  const name = getStarName(star).toLowerCase();

  return star.source === "member_signup" || name.includes("starter ai star");
}

function resolveUplinePath({
  creatorEmail,
  launchCreatorEmail,
  referralEdges,
}) {
  const creator = normalizeEmail(creatorEmail);
  const launchCreator = normalizeEmail(launchCreatorEmail);

  if (!creator || !launchCreator) {
    return { path: [], rootResolved: false };
  }

  const targetToSource = new Map();

  for (const edge of referralEdges) {
    const source = normalizeEmail(edge.sourceMemberEmail);
    const target = normalizeEmail(edge.targetMemberEmail);

    if (source && target && !targetToSource.has(target)) {
      targetToSource.set(target, source);
    }
  }

  const upwardPath = [];
  const visited = new Set();
  let current = launchCreator;

  for (let depth = 0; depth <= 6; depth += 1) {
    if (visited.has(current)) {
      return { path: [], rootResolved: false };
    }

    visited.add(current);
    upwardPath.push(current);

    if (current === creator) {
      return {
        path: upwardPath.reverse().map((memberEmail, index) => ({
          depth: index,
          memberEmail,
          role: CP_POOL_REWARDS[index]?.role ?? "legend",
        })),
        rootResolved: true,
      };
    }

    const parent = targetToSource.get(current);

    if (!parent) {
      break;
    }

    current = parent;
  }

  return { path: [], rootResolved: false };
}

function buildCpPoolDistribution({
  launchStarId,
  rootResolved,
  sourceStarId,
  uplinePath,
}) {
  const entriesByDepth = new Map(
    uplinePath.map((entry) => [entry.depth, entry.memberEmail]),
  );

  return CP_POOL_REWARDS.map((reward) => {
    const recipientMemberEmail = rootResolved
      ? normalizeEmail(entriesByDepth.get(reward.depth))
      : "";

    return {
      allocated: Boolean(recipientMemberEmail),
      cp: reward.cp,
      depth: reward.depth,
      recipientMemberEmail: recipientMemberEmail || null,
      role: reward.role,
      sourceId: recipientMemberEmail
        ? getLedgerSourceId({
            launchStarId,
            recipientMemberEmail,
            role: reward.role,
            sourceStarId,
          })
        : null,
    };
  });
}

function chooseParentCandidate({
  candidateStar,
  childCounts,
  memberships,
  parentByStarId,
  starsById,
}) {
  const candidateCreatedAt = normalizeDateTime(candidateStar.createdAt);
  const ownerEmail = normalizeEmail(candidateStar.ownerEmail);
  const parentCandidates = memberships
    .filter((membership) => {
      const parentStarId = normalizeStarId(membership.starId);
      const parentStar = starsById.get(parentStarId);

      if (
        !ownerEmail ||
        !parentStar ||
        parentStarId === candidateStar.starId ||
        wouldCreateCycle({
          childStarId: candidateStar.starId,
          parentByStarId,
          parentStarId,
        })
      ) {
        return false;
      }

      const parentCreatedAt = normalizeDateTime(parentStar.createdAt);

      return parentCreatedAt === 0 || candidateCreatedAt === 0
        ? true
        : parentCreatedAt <= candidateCreatedAt ||
            isMemberSignupBackfillStar(parentStar);
    })
    .map((membership) => {
      const parentStarId = normalizeStarId(membership.starId);
      const parentStar = starsById.get(parentStarId);
      const roleDepth = ROLE_DEPTH.get(membership.role) ?? 6;
      const childCount = childCounts.get(parentStarId) ?? 0;
      const statusScore = parentStar?.status === "active" ? 25 : 0;
      const backfilledRootScore = isMemberSignupBackfillStar(parentStar) ? 12 : 0;
      const influenceScore =
        Number.isFinite(membership.influenceScore) ? membership.influenceScore : 0;
      const founderScore = Math.min(parentStar?.founderCount ?? 0, 120) / 6;
      const starScore = Math.min(parentStar?.starScore ?? 0, 100) / 8;
      const balancePenalty = childCount * 14;
      const hashTieBreaker =
        stableHash(`${candidateStar.starId}:${parentStarId}`) / 0xffffffff;

      return {
        membership,
        parentStar,
        parentStarId,
        score:
          (6 - roleDepth) * 80 +
          statusScore +
          backfilledRootScore +
          influenceScore +
          founderScore +
          starScore -
          balancePenalty +
          hashTieBreaker,
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        normalizeDateTime(left.parentStar?.createdAt) -
          normalizeDateTime(right.parentStar?.createdAt) ||
        left.parentStarId.localeCompare(right.parentStarId),
    );

  return parentCandidates[0] ?? null;
}

const client = new MongoClient(uri);
const now = new Date();

await client.connect();

try {
  const db = client.db(dbName);
  const starsCollection = db.collection(
    process.env.MONGODB_FANLETTER_STARS_COLLECTION?.trim() ?? "fanletterStars",
  );
  const membershipsCollection = db.collection(
    process.env.MONGODB_FANLETTER_STAR_FOUNDER_MEMBERSHIPS_COLLECTION?.trim() ??
      "fanletterStarFounderMemberships",
  );
  const referralEdgesCollection = db.collection(
    process.env.MONGODB_FANLETTER_STAR_REFERRAL_EDGES_COLLECTION?.trim() ??
      "fanletterStarReferralEdges",
  );
  const influenceLedgerCollection = db.collection(
    process.env.MONGODB_FANLETTER_STAR_INFLUENCE_LEDGER_COLLECTION?.trim() ??
      "fanletterStarInfluenceLedger",
  );

  const [stars, memberships, referralEdges] = await Promise.all([
    starsCollection
      .find(
        { status: { $ne: "archived" } },
        {
          projection: {
            characterName: 1,
            createdAt: 1,
            displayName: 1,
            founderCount: 1,
            growthPercent: 1,
            ownerEmail: 1,
            source: 1,
            spawnedFromStarId: 1,
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
            influenceScore: 1,
            joinedAt: 1,
            memberEmail: 1,
            role: 1,
            starId: 1,
          },
        },
      )
      .toArray(),
    referralEdgesCollection
      .find(
        {},
        {
          projection: {
            sourceMemberEmail: 1,
            starId: 1,
            targetMemberEmail: 1,
          },
        },
      )
      .sort({ createdAt: 1 })
      .toArray(),
  ]);
  const starsById = new Map(stars.map((star) => [star.starId, star]));
  const membershipsByEmail = new Map();
  const membershipsByStarId = new Map();
  const referralEdgesByStarId = new Map();
  const parentByStarId = buildParentMap(stars);
  const childCounts = new Map();

  for (const parentStarId of parentByStarId.values()) {
    childCounts.set(parentStarId, (childCounts.get(parentStarId) ?? 0) + 1);
  }

  for (const membership of memberships) {
    const memberEmail = normalizeEmail(membership.memberEmail);
    const starId = normalizeStarId(membership.starId);

    if (memberEmail) {
      const list = membershipsByEmail.get(memberEmail) ?? [];
      list.push({ ...membership, memberEmail, starId });
      membershipsByEmail.set(memberEmail, list);
    }

    if (starId) {
      const list = membershipsByStarId.get(starId) ?? [];
      list.push({ ...membership, memberEmail, starId });
      membershipsByStarId.set(starId, list);
    }
  }

  for (const edge of referralEdges) {
    const starId = normalizeStarId(edge.starId);

    if (!starId) {
      continue;
    }

    const list = referralEdgesByStarId.get(starId) ?? [];
    list.push(edge);
    referralEdgesByStarId.set(starId, list);
  }

  const candidates = stars
    .filter(
      (star) =>
        !normalizeStarId(star.spawnedFromStarId) && normalizeEmail(star.ownerEmail),
    )
    .sort(
      (left, right) =>
        normalizeDateTime(left.createdAt) - normalizeDateTime(right.createdAt) ||
        left.starId.localeCompare(right.starId),
    );
  const assignments = [];
  const skipped = {
    noMembershipCandidate: 0,
    noResolvableCpPool: 0,
    writeLimit: 0,
  };

  for (const candidateStar of candidates) {
    if (assignments.length >= maxWrites) {
      skipped.writeLimit += 1;
      continue;
    }

    const ownerEmail = normalizeEmail(candidateStar.ownerEmail);
    const parentCandidate = chooseParentCandidate({
      candidateStar,
      childCounts,
      memberships: membershipsByEmail.get(ownerEmail) ?? [],
      parentByStarId,
      starsById,
    });

    if (!parentCandidate) {
      skipped.noMembershipCandidate += 1;
      continue;
    }

    const sourceStar = parentCandidate.parentStar;
    const creatorEmail = getCreatorEmail({
      membershipsByStarId,
      star: sourceStar,
    });
    const upline = resolveUplinePath({
      creatorEmail,
      launchCreatorEmail: ownerEmail,
      referralEdges: referralEdgesByStarId.get(sourceStar.starId) ?? [],
    });
    const cpPool = buildCpPoolDistribution({
      launchStarId: candidateStar.starId,
      rootResolved: upline.rootResolved,
      sourceStarId: sourceStar.starId,
      uplinePath: upline.path,
    });

    if (!upline.rootResolved) {
      skipped.noResolvableCpPool += 1;
    }

    assignments.push({
      childStar: candidateStar,
      cpPool,
      ownerEmail,
      parentRole: parentCandidate.membership.role,
      parentStar: sourceStar,
      score: parentCandidate.score,
      upline,
    });
    parentByStarId.set(candidateStar.starId, sourceStar.starId);
    childCounts.set(sourceStar.starId, (childCounts.get(sourceStar.starId) ?? 0) + 1);
  }

  let updatedStars = 0;
  let insertedLedger = 0;
  let skippedLedger = 0;

  if (writeChanges) {
    for (const assignment of assignments) {
      const updateResult = await starsCollection.updateOne(
        {
          spawnedFromStarId: { $exists: false },
          starId: assignment.childStar.starId,
        },
        {
          $set: {
            genealogyBackfilledAt: now,
            genealogyBackfillMethod: "owner_membership_balanced_legacy_root",
            spawnedFromStarId: assignment.parentStar.starId,
            updatedAt: now,
          },
        },
      );

      if (updateResult.modifiedCount === 0) {
        const retryResult = await starsCollection.updateOne(
          {
            $or: [{ spawnedFromStarId: null }, { spawnedFromStarId: "" }],
            starId: assignment.childStar.starId,
          },
          {
            $set: {
              genealogyBackfilledAt: now,
              genealogyBackfillMethod: "owner_membership_balanced_legacy_root",
              spawnedFromStarId: assignment.parentStar.starId,
              updatedAt: now,
            },
          },
        );
        updatedStars += retryResult.modifiedCount;
      } else {
        updatedStars += updateResult.modifiedCount;
      }

      for (const item of assignment.cpPool.filter(
        (entry) => entry.allocated && entry.recipientMemberEmail && entry.sourceId,
      )) {
        const ledgerResult = await influenceLedgerCollection.updateOne(
          {
            sourceId: item.sourceId,
          },
          {
            $setOnInsert: {
              cpDelta: item.cp,
              createdAt: now,
              creatorProgressDelta: 0,
              influenceDelta: 0,
              memo: `AI Star genealogy backfill CP Pool reward: ${item.role}`,
              recipientMemberEmail: item.recipientMemberEmail,
              source: "creator_unlock",
              sourceId: item.sourceId,
              sourceMemberEmail: assignment.ownerEmail,
              starId: assignment.parentStar.starId,
              targetMemberEmail: assignment.ownerEmail,
            },
          },
          { upsert: true },
        );

        insertedLedger += ledgerResult.upsertedCount;
        skippedLedger += ledgerResult.upsertedCount ? 0 : 1;
      }
    }
  }

  const allocatedCp = assignments.reduce(
    (sum, assignment) =>
      sum +
      assignment.cpPool.reduce(
        (itemSum, item) => itemSum + (item.allocated ? item.cp : 0),
        0,
      ),
    0,
  );
  const sample = assignments.slice(0, sampleLimit).map((assignment) => ({
    allocatedCp: assignment.cpPool.reduce(
      (sum, item) => sum + (item.allocated ? item.cp : 0),
      0,
    ),
    childName: getStarName(assignment.childStar),
    childStarId: assignment.childStar.starId,
    ownerEmail: assignment.ownerEmail,
    parentName: getStarName(assignment.parentStar),
    parentRole: assignment.parentRole,
    parentStarId: assignment.parentStar.starId,
    rootResolved: assignment.upline.rootResolved,
  }));

  console.log(
    JSON.stringify(
      {
        mode: writeChanges ? "write" : "dry-run",
        scannedStars: stars.length,
        candidateStars: candidates.length,
        assignments: assignments.length,
        allocatedCp,
        insertedLedger,
        skipped,
        skippedLedger,
        updatedStars,
        sample,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
