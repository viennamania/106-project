import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

const FOUNDER_UNIVERSE_MAX_DEPTH = 6;
const DEFAULT_SAMPLE_LIMIT = 5;
const DEFAULT_TOP_LIMIT = 12;

const founderUniverseTiers = [
  { capacity: 1, depth: 0, role: "creator" },
  { capacity: 6, depth: 1, role: "genesis_founder" },
  { capacity: 36, depth: 2, role: "founder" },
  { capacity: 216, depth: 3, role: "mentor" },
  { capacity: 1296, depth: 4, role: "producer" },
  { capacity: 7776, depth: 5, role: "partner" },
  { capacity: 46656, depth: 6, role: "legend" },
];

const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB_NAME?.trim();
const membersCollectionName =
  process.env.MONGODB_MEMBERS_COLLECTION?.trim() ?? "members";
const fanletterStarsCollectionName =
  process.env.MONGODB_FANLETTER_STARS_COLLECTION?.trim() ?? "fanletterStars";
const fanletterStarFounderMembershipsCollectionName =
  process.env.MONGODB_FANLETTER_STAR_FOUNDER_MEMBERSHIPS_COLLECTION?.trim() ??
  "fanletterStarFounderMemberships";
const fanletterStarReferralCodesCollectionName =
  process.env.MONGODB_FANLETTER_STAR_REFERRAL_CODES_COLLECTION?.trim() ??
  "fanletterStarReferralCodes";
const fanletterStarReferralEdgesCollectionName =
  process.env.MONGODB_FANLETTER_STAR_REFERRAL_EDGES_COLLECTION?.trim() ??
  "fanletterStarReferralEdges";

const writeChanges = readBoolean(
  process.env.FANLETTER_FOUNDER_UNIVERSE_BACKFILL_WRITE,
);
const targetRootReferralCodes = parseReferralCodeList(
  process.env.FANLETTER_FOUNDER_UNIVERSE_BACKFILL_ROOT_CODES,
);
const sampleLimit = readPositiveInteger(
  process.env.FANLETTER_FOUNDER_UNIVERSE_BACKFILL_SAMPLE_LIMIT,
  DEFAULT_SAMPLE_LIMIT,
);
const topLimit = readPositiveInteger(
  process.env.FANLETTER_FOUNDER_UNIVERSE_BACKFILL_TOP_LIMIT,
  DEFAULT_TOP_LIMIT,
);
const maxDepth = Math.min(
  FOUNDER_UNIVERSE_MAX_DEPTH,
  readPositiveInteger(
    process.env.FANLETTER_FOUNDER_UNIVERSE_BACKFILL_MAX_DEPTH,
    FOUNDER_UNIVERSE_MAX_DEPTH,
  ),
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

function normalizeReferralCode(value) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return normalized || null;
}

function parseReferralCodeList(value) {
  if (!value) {
    return new Set();
  }

  return new Set(
    value
      .split(",")
      .map(normalizeReferralCode)
      .filter(Boolean),
  );
}

function toDateOrFallback(value, fallback) {
  if (value instanceof Date) {
    return value;
  }

  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function getMemberJoinedAt(member, fallback) {
  return toDateOrFallback(
    member.registrationCompletedAt,
    toDateOrFallback(member.createdAt, fallback),
  );
}

function getLegacyStarId(referralCode) {
  return `legacy-star-${referralCode.toLowerCase()}`;
}

function getReferralCodeToken(value, fallback) {
  const token = value?.replace(/[^a-zA-Z0-9가-힣]/g, "").toUpperCase();

  return token?.slice(0, 8) || fallback;
}

function buildStarReferralCodeCandidate({
  attempt,
  memberEmail,
  memberReferralCode,
  star,
}) {
  const starToken = getReferralCodeToken(
    star.characterName || star.displayName || star.starId,
    "STAR",
  );
  const memberToken = getReferralCodeToken(
    memberReferralCode ?? memberEmail.split("@")[0],
    "MEMBER",
  ).slice(0, 5);

  return `${starToken}-${memberToken}-${String(attempt).padStart(3, "0")}`;
}

function buildEdgeId({ sourceMemberEmail, starId, targetMemberEmail }) {
  return `star-placement-backfill:${starId}:${sourceMemberEmail}:${targetMemberEmail}`;
}

function getTier(depth) {
  return founderUniverseTiers.find((tier) => tier.depth === depth) ?? null;
}

function sortByJoinedAtAndEmail(left, right) {
  const leftTime = getMemberJoinedAt(left, new Date(0)).getTime();
  const rightTime = getMemberJoinedAt(right, new Date(0)).getTime();

  return leftTime - rightTime || String(left.email).localeCompare(String(right.email));
}

function buildMemberIndexes(completedMembers) {
  const membersByReferralCode = new Map();
  const childrenByPlacementReferralCode = new Map();
  const missingParentEdges = [];
  const selfPlacementEdges = [];
  const validPlacementEdges = [];

  for (const member of completedMembers) {
    const referralCode = normalizeReferralCode(member.referralCode);

    if (referralCode) {
      membersByReferralCode.set(referralCode, member);
    }
  }

  for (const member of completedMembers) {
    const memberEmail = normalizeEmail(member.email);
    const memberReferralCode = normalizeReferralCode(member.referralCode);
    const placementReferralCode = normalizeReferralCode(member.placementReferralCode);

    if (!memberEmail || !placementReferralCode) {
      continue;
    }

    const placementMember = membersByReferralCode.get(placementReferralCode);

    if (!placementMember) {
      missingParentEdges.push({
        childEmail: memberEmail,
        placementReferralCode,
      });
      continue;
    }

    const placementEmail = normalizeEmail(placementMember.email);

    if (placementEmail === memberEmail || placementReferralCode === memberReferralCode) {
      selfPlacementEdges.push({
        childEmail: memberEmail,
        placementReferralCode,
      });
      continue;
    }

    validPlacementEdges.push({
      childEmail: memberEmail,
      childReferralCode: memberReferralCode,
      placementEmail,
      placementReferralCode,
    });

    const children = childrenByPlacementReferralCode.get(placementReferralCode) ?? [];
    children.push(member);
    childrenByPlacementReferralCode.set(placementReferralCode, children);
  }

  for (const children of childrenByPlacementReferralCode.values()) {
    children.sort(sortByJoinedAtAndEmail);
  }

  return {
    childrenByPlacementReferralCode,
    missingParentEdges,
    selfPlacementEdges,
    validPlacementEdges,
    membersByReferralCode,
  };
}

function collectFounderUniverseRows({
  childrenByPlacementReferralCode,
  membersByReferralCode,
  rootReferralCode,
}) {
  const rows = [];
  const queue = [
    {
      depth: 0,
      member: membersByReferralCode.get(rootReferralCode),
      parent: null,
    },
  ];
  const seenReferralCodes = new Set();
  let cycleDetected = false;

  while (queue.length > 0) {
    const item = queue.shift();

    if (!item?.member || item.depth > maxDepth) {
      continue;
    }

    const memberReferralCode = normalizeReferralCode(item.member.referralCode);

    if (!memberReferralCode) {
      continue;
    }

    if (seenReferralCodes.has(memberReferralCode)) {
      cycleDetected = true;
      continue;
    }

    seenReferralCodes.add(memberReferralCode);
    rows.push(item);

    if (item.depth >= maxDepth) {
      continue;
    }

    const children = childrenByPlacementReferralCode.get(memberReferralCode) ?? [];

    for (const child of children) {
      queue.push({
        depth: item.depth + 1,
        member: child,
        parent: item.member,
      });
    }
  }

  return {
    cycleDetected,
    rows,
  };
}

function summarizeBulkWriteResult(result) {
  return {
    inserted: result.insertedCount ?? 0,
    matched: result.matchedCount ?? 0,
    modified: result.modifiedCount ?? 0,
    upserted: result.upsertedCount ?? 0,
  };
}

function incrementCount(map, key, value = 1) {
  map.set(key, (map.get(key) ?? 0) + value);
}

function mapToSortedObject(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => left - right));
}

async function ensureIndexes({
  founderMemberships,
  referralCodes,
  referralEdges,
}) {
  await Promise.all([
    founderMemberships.createIndex(
      { starId: 1, memberEmail: 1 },
      { unique: true },
    ),
    founderMemberships.createIndex({ memberEmail: 1, role: 1, updatedAt: -1 }),
    founderMemberships.createIndex({ starId: 1, role: 1, influenceScore: -1 }),
    founderMemberships.createIndex({ starId: 1, joinedAt: -1 }),
    referralCodes.createIndex({ starId: 1, code: 1 }, { unique: true }),
    referralCodes.createIndex(
      { starId: 1, memberEmail: 1 },
      { unique: true },
    ),
    referralCodes.createIndex({ memberEmail: 1, status: 1, updatedAt: -1 }),
    referralCodes.createIndex({ code: 1, status: 1 }),
    referralEdges.createIndex({ edgeId: 1 }, { unique: true }),
    referralEdges.createIndex(
      { starId: 1, targetMemberEmail: 1 },
      { unique: true },
    ),
    referralEdges.createIndex(
      { starId: 1, shareId: 1, targetMemberEmail: 1 },
      {
        partialFilterExpression: {
          shareId: { $type: "string" },
        },
        unique: true,
      },
    ),
    referralEdges.createIndex({ sourceMemberEmail: 1, createdAt: -1 }),
    referralEdges.createIndex({ starId: 1, createdAt: -1 }),
  ]);
}

function allocateReferralCode({
  activeReferralCodes,
  existingCode,
  generatedCodeKeys,
  member,
  star,
}) {
  const existingNormalizedCode = normalizeReferralCode(existingCode?.code);

  if (existingNormalizedCode && existingCode?.status === "active") {
    return {
      code: existingNormalizedCode,
      writeRequired: false,
    };
  }

  if (
    existingNormalizedCode &&
    !activeReferralCodes.has(existingNormalizedCode) &&
    !generatedCodeKeys.has(existingNormalizedCode)
  ) {
    activeReferralCodes.add(existingNormalizedCode);
    generatedCodeKeys.add(existingNormalizedCode);

    return {
      code: existingNormalizedCode,
      writeRequired: true,
    };
  }

  const memberEmail = normalizeEmail(member.email);
  const memberReferralCode = normalizeReferralCode(member.referralCode);

  for (let attempt = 1; attempt <= 999; attempt += 1) {
    const code = buildStarReferralCodeCandidate({
      attempt,
      memberEmail,
      memberReferralCode,
      star,
    });

    if (!activeReferralCodes.has(code) && !generatedCodeKeys.has(code)) {
      activeReferralCodes.add(code);
      generatedCodeKeys.add(code);

      return {
        code,
        writeRequired: true,
      };
    }
  }

  throw new Error(
    `Unable to allocate star referral code for ${memberEmail} in ${star.starId}.`,
  );
}

function buildRootReport({ proposedRows, rootReferralCode, star }) {
  const depthCounts = new Map();

  for (const row of proposedRows) {
    incrementCount(depthCounts, row.depth);
  }

  return {
    depthCounts: mapToSortedObject(depthCounts),
    descendantCount: Math.max(0, proposedRows.length - 1),
    rootOwnerEmail: normalizeEmail(star.ownerEmail),
    rootReferralCode,
    sampleMembers: proposedRows.slice(0, sampleLimit).map((row) => ({
      depth: row.depth,
      email: normalizeEmail(row.member.email),
      referralCode: normalizeReferralCode(row.member.referralCode),
      role: getTier(row.depth)?.role ?? null,
    })),
    starId: star.starId,
  };
}

async function main() {
  const client = new MongoClient(uri);

  await client.connect();

  try {
    const db = client.db(dbName);
    const members = db.collection(membersCollectionName);
    const stars = db.collection(fanletterStarsCollectionName);
    const founderMemberships = db.collection(
      fanletterStarFounderMembershipsCollectionName,
    );
    const referralCodes = db.collection(fanletterStarReferralCodesCollectionName);
    const referralEdges = db.collection(fanletterStarReferralEdgesCollectionName);
    const now = new Date();

    const [completedMembers, memberOwnedStars, existingReferralCodeRows] =
      await Promise.all([
        members
          .find(
            {
              status: "completed",
            },
            {
              projection: {
                _id: 0,
                createdAt: 1,
                email: 1,
                placementReferralCode: 1,
                publicProfile: 1,
                referralCode: 1,
                registrationCompletedAt: 1,
                status: 1,
              },
            },
          )
          .sort({ registrationCompletedAt: 1, createdAt: 1, email: 1 })
          .toArray(),
        stars
          .find(
            {
              legacyCreatorReferralCode: { $type: "string" },
            },
            {
              projection: {
                _id: 0,
                characterName: 1,
                displayName: 1,
                legacyCreatorReferralCode: 1,
                ownerEmail: 1,
                ownerReferralCode: 1,
                starId: 1,
                status: 1,
              },
            },
          )
          .sort({ legacyCreatorReferralCode: 1 })
          .toArray(),
        referralCodes
          .find(
            {},
            {
              projection: {
                _id: 0,
                code: 1,
                memberEmail: 1,
                starId: 1,
                status: 1,
              },
            },
          )
          .toArray(),
      ]);
    const {
      childrenByPlacementReferralCode,
      membersByReferralCode,
      missingParentEdges,
      selfPlacementEdges,
      validPlacementEdges,
    } = buildMemberIndexes(completedMembers);
    const starsByReferralCode = new Map(
      memberOwnedStars
        .map((star) => [
          normalizeReferralCode(star.legacyCreatorReferralCode),
          star,
        ])
        .filter(([code]) => code),
    );
    const activeReferralCodes = new Set(
      existingReferralCodeRows
        .filter((row) => row.status === "active")
        .map((row) => normalizeReferralCode(row.code))
        .filter(Boolean),
    );
    const activeReferralCodesScanned = activeReferralCodes.size;
    const existingCodeByStarAndMember = new Map(
      existingReferralCodeRows.map((row) => [
        `${row.starId}\u0000${normalizeEmail(row.memberEmail)}`,
        row,
      ]),
    );
    const rootReferralCodes =
      targetRootReferralCodes.size > 0
        ? [...targetRootReferralCodes]
        : [...starsByReferralCode.keys()].sort();
    const generatedCodeKeys = new Set();
    const referralCodeDocuments = new Map();
    const membershipDocuments = new Map();
    const edgeDocuments = new Map();
    const skippedRoots = [];
    const rootReports = [];
    const rootsByDescendantCount = [];
    const aggregateDepthCounts = new Map();
    let cycleRootCount = 0;

    for (const rootReferralCode of rootReferralCodes) {
      const rootMember = membersByReferralCode.get(rootReferralCode);
      const star = starsByReferralCode.get(rootReferralCode);

      if (!rootMember || !star) {
        skippedRoots.push({
          hasMember: Boolean(rootMember),
          hasStar: Boolean(star),
          rootReferralCode,
          starId: getLegacyStarId(rootReferralCode),
        });
        continue;
      }

      const { cycleDetected, rows } = collectFounderUniverseRows({
        childrenByPlacementReferralCode,
        membersByReferralCode,
        rootReferralCode,
      });

      if (cycleDetected) {
        cycleRootCount += 1;
      }

      if (rows.length <= 1) {
        rootsByDescendantCount.push({
          descendantCount: 0,
          rootReferralCode,
          starId: star.starId,
        });
        continue;
      }

      const referralCodeByEmail = new Map();

      for (const row of rows) {
        const memberEmail = normalizeEmail(row.member.email);
        const existingCode = existingCodeByStarAndMember.get(
          `${star.starId}\u0000${memberEmail}`,
        );
        const referralCodeAllocation = allocateReferralCode({
          activeReferralCodes,
          existingCode,
          generatedCodeKeys,
          member: row.member,
          star,
        });
        const code = referralCodeAllocation.code;

        referralCodeByEmail.set(memberEmail, code);

        if (referralCodeAllocation.writeRequired) {
          referralCodeDocuments.set(`${star.starId}\u0000${memberEmail}`, {
            code,
            createdAt: getMemberJoinedAt(row.member, now),
            disabledAt: null,
            lastUsedAt: null,
            memberEmail,
            memberReferralCode: normalizeReferralCode(row.member.referralCode),
            source: "member_signup",
            starId: star.starId,
            status: "active",
            updatedAt: now,
          });
        }
      }

      for (const row of rows) {
        incrementCount(aggregateDepthCounts, row.depth);

        if (row.depth === 0 || !row.parent) {
          continue;
        }

        const tier = getTier(row.depth);

        if (!tier) {
          continue;
        }

        const memberEmail = normalizeEmail(row.member.email);
        const parentEmail = normalizeEmail(row.parent.email);
        const memberReferralCode = normalizeReferralCode(row.member.referralCode);
        const parentReferralCode = normalizeReferralCode(row.parent.referralCode);
        const parentStarReferralCode = referralCodeByEmail.get(parentEmail) ?? null;
        const joinedAt = getMemberJoinedAt(row.member, now);

        membershipDocuments.set(`${star.starId}\u0000${memberEmail}`, {
          backfilledAt: now,
          cpBalance: 0,
          createdAt: joinedAt,
          creatorProgressPercent: 0,
          influenceScore: 0,
          joinedAt,
          joinedViaCode: parentStarReferralCode,
          joinedViaMemberEmail: parentEmail,
          joinedViaMemberReferralCode: parentReferralCode,
          joinedViaShareId: null,
          memberEmail,
          memberReferralCode,
          role: tier.role,
          source: "member_signup",
          starId: star.starId,
          updatedAt: now,
        });
        edgeDocuments.set(
          `${star.starId}\u0000${memberEmail}`,
          {
            backfilledAt: now,
            createdAt: joinedAt,
            edgeId: buildEdgeId({
              sourceMemberEmail: parentEmail,
              starId: star.starId,
              targetMemberEmail: memberEmail,
            }),
            referralCode: parentStarReferralCode,
            shareId: null,
            source: "member_signup",
            sourceMemberEmail: parentEmail,
            sourceMemberReferralCode: parentReferralCode,
            starId: star.starId,
            targetMemberEmail: memberEmail,
            targetMemberReferralCode: memberReferralCode,
            updatedAt: now,
          },
        );
      }

      rootsByDescendantCount.push({
        descendantCount: Math.max(0, rows.length - 1),
        rootReferralCode,
        starId: star.starId,
      });

      if (rootReports.length < sampleLimit || targetRootReferralCodes.has(rootReferralCode)) {
        rootReports.push(
          buildRootReport({
            proposedRows: rows,
            rootReferralCode,
            star,
          }),
        );
      }
    }

    let writeResult = null;

    if (writeChanges) {
      await ensureIndexes({
        founderMemberships,
        referralCodes,
        referralEdges,
      });

      const referralCodeOps = [...referralCodeDocuments.values()].map(
        (document) => ({
          updateOne: {
            filter: {
              memberEmail: document.memberEmail,
              starId: document.starId,
            },
            update: {
              $set: {
                code: document.code,
                disabledAt: document.disabledAt,
                lastUsedAt: document.lastUsedAt,
                memberReferralCode: document.memberReferralCode,
                source: document.source,
                status: document.status,
                updatedAt: document.updatedAt,
              },
              $setOnInsert: {
                createdAt: document.createdAt,
                memberEmail: document.memberEmail,
                starId: document.starId,
              },
            },
            upsert: true,
          },
        }),
      );
      const membershipOps = [...membershipDocuments.values()].map((document) => ({
        updateOne: {
          filter: {
            memberEmail: document.memberEmail,
            starId: document.starId,
          },
          update: {
            $set: {
              backfilledAt: document.backfilledAt,
              joinedViaCode: document.joinedViaCode,
              joinedViaMemberEmail: document.joinedViaMemberEmail,
              joinedViaMemberReferralCode: document.joinedViaMemberReferralCode,
              joinedViaShareId: document.joinedViaShareId,
              memberReferralCode: document.memberReferralCode,
              role: document.role,
              source: document.source,
              updatedAt: document.updatedAt,
            },
            $setOnInsert: {
              cpBalance: document.cpBalance,
              createdAt: document.createdAt,
              creatorProgressPercent: document.creatorProgressPercent,
              influenceScore: document.influenceScore,
              joinedAt: document.joinedAt,
            },
          },
          upsert: true,
        },
      }));
      const edgeOps = [...edgeDocuments.values()].map((document) => ({
        updateOne: {
          filter: {
            edgeId: document.edgeId,
          },
          update: {
            $setOnInsert: document,
          },
          upsert: true,
        },
      }));
      const [referralCodeResult, membershipResult, edgeResult] =
        await Promise.all([
          referralCodeOps.length > 0
            ? referralCodes.bulkWrite(referralCodeOps, { ordered: false })
            : Promise.resolve({}),
          membershipOps.length > 0
            ? founderMemberships.bulkWrite(membershipOps, { ordered: false })
            : Promise.resolve({}),
          edgeOps.length > 0
            ? referralEdges.bulkWrite(edgeOps, { ordered: false })
            : Promise.resolve({}),
        ]);

      writeResult = {
        founderMemberships: summarizeBulkWriteResult(membershipResult),
        referralCodes: summarizeBulkWriteResult(referralCodeResult),
        referralEdges: summarizeBulkWriteResult(edgeResult),
      };
    }

    const topRootsByDescendantCount = rootsByDescendantCount
      .slice()
      .sort(
        (left, right) =>
          right.descendantCount - left.descendantCount ||
          left.rootReferralCode.localeCompare(right.rootReferralCode),
      )
      .slice(0, topLimit);
    const report = {
      backfillMode: writeChanges ? "write" : "dry-run-read-only",
      collectionNames: {
        fanletterStarFounderMemberships:
          fanletterStarFounderMembershipsCollectionName,
        fanletterStarReferralCodes: fanletterStarReferralCodesCollectionName,
        fanletterStarReferralEdges: fanletterStarReferralEdgesCollectionName,
        fanletterStars: fanletterStarsCollectionName,
        members: membersCollectionName,
      },
      counts: {
        activeReferralCodesScanned,
        aggregateDepthCounts: mapToSortedObject(aggregateDepthCounts),
        completedMembers: completedMembers.length,
        completedMembersWithReferralCode: membersByReferralCode.size,
        existingMemberOwnedStars: memberOwnedStars.length,
        generatedReferralCodes: referralCodeDocuments.size,
        maxDepth,
        missingParentPlacementEdges: missingParentEdges.length,
        proposedFounderMemberships: membershipDocuments.size,
        proposedReferralCodes: referralCodeDocuments.size,
        proposedReferralEdges: edgeDocuments.size,
        rootsProcessed: rootsByDescendantCount.length,
        rootsRequested: rootReferralCodes.length,
        rootsSkipped: skippedRoots.length,
        rootsWithCycleDetected: cycleRootCount,
        selfPlacementEdges: selfPlacementEdges.length,
        validMemberPlacementEdges: validPlacementEdges.length,
      },
      dryRunWriteCommand:
        "FANLETTER_FOUNDER_UNIVERSE_BACKFILL_WRITE=1 pnpm fanletter:founder-universe:backfill",
      notes: [
        "This script maps the existing member placementReferralCode tree into each member-owned AI Star Universe.",
        "It does not modify legacy member referral, placement, reward, payment, or point collections.",
        "It does not issue retroactive CP. CP Pool rewards remain tied to future Creator Launch events.",
        "Root members remain Creator. Descendants are mapped by depth: genesis_founder, founder, mentor, producer, partner, legend.",
        "Star-scoped referral codes are generated per member per AI Star to avoid reusing ambiguous legacy member referral codes.",
      ],
      rootReports,
      skippedRoots: skippedRoots.slice(0, sampleLimit),
      targetRootReferralCodes: [...targetRootReferralCodes],
      topRootsByDescendantCount,
      writeResult,
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.close();
  }
}

await main();
