import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

const FOUNDER_UNIVERSE_MAX_DEPTH = 6;
const DEFAULT_SAMPLE_LIMIT = 12;

const founderUniverseTiers = [
  { capacity: 1, depth: 0, role: "creator" },
  { capacity: 6, depth: 1, role: "genesis_founder" },
  { capacity: 36, depth: 2, role: "founder" },
  { capacity: 216, depth: 3, role: "mentor" },
  { capacity: 1296, depth: 4, role: "producer" },
  { capacity: 7776, depth: 5, role: "partner" },
  { capacity: 46656, depth: 6, role: "legend" },
];

const validRoles = new Set(founderUniverseTiers.map((tier) => tier.role));
const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB_NAME?.trim();
const fanletterStarsCollectionName =
  process.env.MONGODB_FANLETTER_STARS_COLLECTION?.trim() ?? "fanletterStars";
const fanletterStarFounderMembershipsCollectionName =
  process.env.MONGODB_FANLETTER_STAR_FOUNDER_MEMBERSHIPS_COLLECTION?.trim() ??
  "fanletterStarFounderMemberships";
const fanletterStarReferralEdgesCollectionName =
  process.env.MONGODB_FANLETTER_STAR_REFERRAL_EDGES_COLLECTION?.trim() ??
  "fanletterStarReferralEdges";

const writeChanges = readBoolean(
  process.env.FANLETTER_FOUNDER_UNIVERSE_ROLE_RECONCILE_WRITE,
);
const sampleLimit = readPositiveInteger(
  process.env.FANLETTER_FOUNDER_UNIVERSE_ROLE_RECONCILE_SAMPLE_LIMIT,
  DEFAULT_SAMPLE_LIMIT,
);
const targetStarIds = parseIdList(
  process.env.FANLETTER_FOUNDER_UNIVERSE_ROLE_RECONCILE_STAR_IDS,
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

function normalizeId(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function parseIdList(value) {
  if (!value) {
    return new Set();
  }

  return new Set(
    value
      .split(",")
      .map(normalizeId)
      .filter(Boolean),
  );
}

function getTier(depth) {
  return founderUniverseTiers.find((tier) => tier.depth === depth) ?? null;
}

function getRoleForDepth(depth) {
  const normalizedDepth = Math.max(
    0,
    Math.min(depth, FOUNDER_UNIVERSE_MAX_DEPTH),
  );

  return getTier(normalizedDepth)?.role ?? "legend";
}

function toSerializableId(value) {
  return typeof value?.toString === "function" ? value.toString() : String(value);
}

function resolveMembershipPlacement({
  creatorEmail,
  membership,
  parentByTargetEmail,
}) {
  const memberEmail = normalizeEmail(membership.memberEmail);
  const rootEmail = normalizeEmail(creatorEmail);

  if (!memberEmail) {
    return {
      depth: null,
      expectedRole: null,
      parentMemberEmail: null,
      reason: "member_email_missing",
      rootResolved: false,
      uplineMemberEmails: [],
    };
  }

  if (membership.role === "creator" || memberEmail === rootEmail) {
    return {
      depth: 0,
      expectedRole: "creator",
      parentMemberEmail: null,
      reason: null,
      rootResolved: true,
      uplineMemberEmails: rootEmail ? [rootEmail] : [memberEmail],
    };
  }

  if (!rootEmail) {
    return {
      depth: null,
      expectedRole: null,
      parentMemberEmail: normalizeEmail(membership.joinedViaMemberEmail) || null,
      reason: "creator_not_found",
      rootResolved: false,
      uplineMemberEmails: [memberEmail],
    };
  }

  const upwardPath = [];
  const visited = new Set();
  let currentEmail = memberEmail;

  for (let depth = 0; depth <= FOUNDER_UNIVERSE_MAX_DEPTH + 16; depth += 1) {
    if (!currentEmail || visited.has(currentEmail)) {
      return {
        depth: null,
        expectedRole: null,
        parentMemberEmail: normalizeEmail(membership.joinedViaMemberEmail) || null,
        reason: "cycle_detected",
        rootResolved: false,
        uplineMemberEmails: [...upwardPath],
      };
    }

    visited.add(currentEmail);
    upwardPath.push(currentEmail);

    if (currentEmail === rootEmail) {
      const rootToMemberPath = [...upwardPath].reverse();
      const resolvedDepth = rootToMemberPath.length - 1;
      const parentMemberEmail =
        rootToMemberPath.length > 1
          ? rootToMemberPath[rootToMemberPath.length - 2] ?? null
          : null;

      return {
        depth: Math.min(resolvedDepth, FOUNDER_UNIVERSE_MAX_DEPTH),
        expectedRole: getRoleForDepth(resolvedDepth),
        parentMemberEmail,
        reason:
          resolvedDepth > FOUNDER_UNIVERSE_MAX_DEPTH
            ? "over_max_depth_clamped"
            : null,
        rootResolved: true,
        uplineMemberEmails: rootToMemberPath,
      };
    }

    currentEmail = parentByTargetEmail.get(currentEmail) ?? "";
  }

  const joinedViaMemberEmail = normalizeEmail(membership.joinedViaMemberEmail);

  if (!joinedViaMemberEmail) {
    return {
      depth: 1,
      expectedRole: "genesis_founder",
      parentMemberEmail: rootEmail,
      reason: "direct_join_without_edge",
      rootResolved: true,
      uplineMemberEmails: [rootEmail, memberEmail],
    };
  }

  return {
    depth: null,
    expectedRole: null,
    parentMemberEmail: joinedViaMemberEmail,
    reason: "root_not_reached",
    rootResolved: false,
    uplineMemberEmails: [...upwardPath],
  };
}

function incrementMap(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function mapToSortedObject(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => {
    return String(left).localeCompare(String(right));
  }));
}

async function main() {
  const client = new MongoClient(uri);

  try {
    await client.connect();

    const db = client.db(dbName);
    const stars = db.collection(fanletterStarsCollectionName);
    const memberships = db.collection(fanletterStarFounderMembershipsCollectionName);
    const referralEdges = db.collection(fanletterStarReferralEdgesCollectionName);
    const starFilter =
      targetStarIds.size > 0
        ? { starId: { $in: [...targetStarIds] } }
        : { status: { $ne: "archived" } };
    const starDocuments = await stars
      .find(starFilter, {
        projection: {
          ownerEmail: 1,
          starId: 1,
          status: 1,
        },
      })
      .sort({ updatedAt: -1 })
      .toArray();
    const starIds = starDocuments.map((star) => star.starId).filter(Boolean);
    const starById = new Map(starDocuments.map((star) => [star.starId, star]));

    if (starIds.length === 0) {
      console.log(
        JSON.stringify(
          {
            backfillMode: writeChanges ? "write" : "dry-run-read-only",
            counts: {
              starsScanned: 0,
            },
            notes: ["No target AI Stars were found."],
          },
          null,
          2,
        ),
      );
      return;
    }

    const [membershipDocuments, edgeDocuments] = await Promise.all([
      memberships
        .find(
          {
            starId: { $in: starIds },
          },
          {
            projection: {
              _id: 1,
              joinedViaMemberEmail: 1,
              memberEmail: 1,
              role: 1,
              starId: 1,
            },
          },
        )
        .toArray(),
      referralEdges
        .find(
          {
            starId: { $in: starIds },
          },
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
    const edgesByStarId = new Map();

    for (const edge of edgeDocuments) {
      const starId = edge.starId;
      const sourceMemberEmail = normalizeEmail(edge.sourceMemberEmail);
      const targetMemberEmail = normalizeEmail(edge.targetMemberEmail);

      if (!starId || !sourceMemberEmail || !targetMemberEmail) {
        continue;
      }

      const parentByTargetEmail = edgesByStarId.get(starId) ?? new Map();

      if (!parentByTargetEmail.has(targetMemberEmail)) {
        parentByTargetEmail.set(targetMemberEmail, sourceMemberEmail);
      }

      edgesByStarId.set(starId, parentByTargetEmail);
    }

    const mismatches = [];
    const unresolved = [];
    const invalidRoleMemberships = [];
    const roleCountsBefore = new Map();
    const roleCountsExpected = new Map();
    const mismatchRoleTransitions = new Map();
    const reasonCounts = new Map();
    let checkedMemberships = 0;
    let matchedMemberships = 0;

    for (const membership of membershipDocuments) {
      const currentRole = membership.role ?? null;
      const star = starById.get(membership.starId);
      const placement = resolveMembershipPlacement({
        creatorEmail: star?.ownerEmail ?? null,
        membership,
        parentByTargetEmail: edgesByStarId.get(membership.starId) ?? new Map(),
      });

      checkedMemberships += 1;
      incrementMap(roleCountsBefore, currentRole ?? "missing");

      if (placement.reason) {
        incrementMap(reasonCounts, placement.reason);
      }

      if (!currentRole || !validRoles.has(currentRole)) {
        invalidRoleMemberships.push({
          currentRole,
          expectedRole: placement.expectedRole,
          memberEmail: membership.memberEmail ?? null,
          reason: placement.reason ?? "invalid_role",
          starId: membership.starId,
        });
      }

      if (!placement.expectedRole) {
        unresolved.push({
          currentRole,
          memberEmail: membership.memberEmail ?? null,
          parentMemberEmail: placement.parentMemberEmail,
          reason: placement.reason,
          starId: membership.starId,
        });
        continue;
      }

      incrementMap(roleCountsExpected, placement.expectedRole);

      if (currentRole === placement.expectedRole) {
        matchedMemberships += 1;
        continue;
      }

      const transitionKey = `${currentRole ?? "missing"} -> ${placement.expectedRole}`;
      incrementMap(mismatchRoleTransitions, transitionKey);
      mismatches.push({
        currentRole,
        depth: placement.depth,
        expectedRole: placement.expectedRole,
        memberEmail: membership.memberEmail ?? null,
        membershipId: toSerializableId(membership._id),
        parentMemberEmail: placement.parentMemberEmail,
        reason: placement.reason,
        rootResolved: placement.rootResolved,
        starId: membership.starId,
        uplineDepth: placement.uplineMemberEmails.length,
      });
    }

    let writeResult = null;

    if (writeChanges && mismatches.length > 0) {
      const now = new Date();
      const operations = mismatches
        .filter((mismatch) => mismatch.memberEmail && mismatch.starId)
        .map((mismatch) => ({
          updateOne: {
            filter: {
              memberEmail: mismatch.memberEmail,
              starId: mismatch.starId,
            },
            update: {
              $set: {
                role: mismatch.expectedRole,
                roleReconciledAt: now,
                roleReconciledFrom: mismatch.currentRole,
                updatedAt: now,
              },
            },
          },
        }));

      if (operations.length > 0) {
        const result = await memberships.bulkWrite(operations, { ordered: false });

        writeResult = {
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
          upsertedCount: result.upsertedCount,
        };
      } else {
        writeResult = {
          matchedCount: 0,
          modifiedCount: 0,
          skippedReason: "no_safe_operations",
          upsertedCount: 0,
        };
      }
    }

    const report = {
      backfillMode: writeChanges ? "write" : "dry-run-read-only",
      collectionNames: {
        fanletterStarFounderMemberships:
          fanletterStarFounderMembershipsCollectionName,
        fanletterStarReferralEdges: fanletterStarReferralEdgesCollectionName,
        fanletterStars: fanletterStarsCollectionName,
      },
      counts: {
        checkedMemberships,
        invalidRoleMemberships: invalidRoleMemberships.length,
        matchedMemberships,
        mismatchedMemberships: mismatches.length,
        referralEdgesScanned: edgeDocuments.length,
        roleCountsBefore: mapToSortedObject(roleCountsBefore),
        roleCountsExpected: mapToSortedObject(roleCountsExpected),
        starsScanned: starDocuments.length,
        unresolvedMemberships: unresolved.length,
      },
      dryRunWriteCommand:
        "FANLETTER_FOUNDER_UNIVERSE_ROLE_RECONCILE_WRITE=1 pnpm fanletter:founder-universe:roles:reconcile",
      mismatchRoleTransitions: mapToSortedObject(mismatchRoleTransitions),
      notes: [
        "Default mode is read-only. Set FANLETTER_FOUNDER_UNIVERSE_ROLE_RECONCILE_WRITE=1 to update roles.",
        "Expected roles are computed per AI Star from creator/root, star-scoped referral edges, and the 6-level Founder Universe tiers.",
        "Direct Founder joins without a referral edge are treated as genesis_founder under the AI Star Creator.",
        "Paths deeper than level 6 are clamped to legend and reported with over_max_depth_clamped.",
      ],
      reasonCounts: mapToSortedObject(reasonCounts),
      samples: {
        invalidRoleMemberships: invalidRoleMemberships.slice(0, sampleLimit),
        mismatches: mismatches.slice(0, sampleLimit),
        unresolved: unresolved.slice(0, sampleLimit),
      },
      targetStarIds: [...targetStarIds],
      writeResult,
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.close();
  }
}

await main();
