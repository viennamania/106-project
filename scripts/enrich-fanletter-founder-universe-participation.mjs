import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

const FOUNDER_UNIVERSE_BRANCHING_FACTOR = 6;
const FOUNDER_UNIVERSE_MAX_DEPTH = 6;
const FOUNDER_UNIVERSE_TOTAL_CAPACITY = 55987;
const DEFAULT_STAR_LIMIT = 12;
const DEFAULT_MEMBERS_PER_STAR = 64;
const DEFAULT_PARTICIPATIONS_PER_MEMBER = 8;
const DEFAULT_SAMPLE_LIMIT = 8;

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
const writeChanges = readBoolean(
  process.env.FANLETTER_FOUNDER_UNIVERSE_ENRICH_WRITE,
);
const starLimit = readPositiveInteger(
  process.env.FANLETTER_FOUNDER_UNIVERSE_ENRICH_STAR_LIMIT,
  DEFAULT_STAR_LIMIT,
);
const membersPerStar = readPositiveInteger(
  process.env.FANLETTER_FOUNDER_UNIVERSE_ENRICH_MEMBERS_PER_STAR,
  DEFAULT_MEMBERS_PER_STAR,
);
const participationsPerMember = readPositiveInteger(
  process.env.FANLETTER_FOUNDER_UNIVERSE_ENRICH_PARTICIPATIONS_PER_MEMBER,
  DEFAULT_PARTICIPATIONS_PER_MEMBER,
);
const sampleLimit = readPositiveInteger(
  process.env.FANLETTER_FOUNDER_UNIVERSE_ENRICH_SAMPLE_LIMIT,
  DEFAULT_SAMPLE_LIMIT,
);
const targetStarIds = parseIdList(
  process.env.FANLETTER_FOUNDER_UNIVERSE_ENRICH_STAR_IDS,
);
const membersCollectionName =
  process.env.MONGODB_MEMBERS_COLLECTION?.trim() ?? "members";
const contentPostsCollectionName =
  process.env.MONGODB_CONTENT_POSTS_COLLECTION?.trim() ?? "contentPosts";
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

function normalizeReferralCode(value) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";

  return normalized || null;
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

function toDateOrFallback(value, fallback) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
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

function stableHash(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getTier(depth) {
  return founderUniverseTiers.find((tier) => tier.depth === depth) ?? null;
}

function getDepthForPosition(position) {
  if (position <= 0) {
    return 0;
  }

  let firstPositionAtDepth = 1;

  for (let depth = 1; depth <= FOUNDER_UNIVERSE_MAX_DEPTH; depth += 1) {
    const capacity = FOUNDER_UNIVERSE_BRANCHING_FACTOR ** depth;

    if (position < firstPositionAtDepth + capacity) {
      return depth;
    }

    firstPositionAtDepth += capacity;
  }

  return FOUNDER_UNIVERSE_MAX_DEPTH;
}

function getParentPosition(position) {
  if (position <= 0) {
    return null;
  }

  return Math.floor((position - 1) / FOUNDER_UNIVERSE_BRANCHING_FACTOR);
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

function buildEdgeId({ sourceMemberEmail, starId, targetMemberEmail }) {
  return `star-participation-enrich:${starId}:${sourceMemberEmail}:${targetMemberEmail}`;
}

function summarizeBulkWriteResult(result) {
  return {
    inserted: result.insertedCount ?? 0,
    matched: result.matchedCount ?? 0,
    modified: result.modifiedCount ?? 0,
    upserted: result.upsertedCount ?? 0,
  };
}

function mapToSortedObject(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => left - right));
}

function incrementCount(map, key, value = 1) {
  map.set(key, (map.get(key) ?? 0) + value);
}

function getMemberLookupKey(member) {
  return normalizeEmail(member.email);
}

function sortMembersForStar({ members, participationsByEmail, starId }) {
  return members
    .slice()
    .sort((left, right) => {
      const leftEmail = getMemberLookupKey(left);
      const rightEmail = getMemberLookupKey(right);
      const leftParticipations = participationsByEmail.get(leftEmail) ?? 0;
      const rightParticipations = participationsByEmail.get(rightEmail) ?? 0;

      return (
        leftParticipations - rightParticipations ||
        stableHash(`${starId}:${leftEmail}`) - stableHash(`${starId}:${rightEmail}`) ||
        leftEmail.localeCompare(rightEmail)
      );
    });
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
    referralEdges.createIndex({ sourceMemberEmail: 1, createdAt: -1 }),
    referralEdges.createIndex({ starId: 1, createdAt: -1 }),
  ]);
}

function getStarCreatorMember({ membersByEmail, membersByReferralCode, star }) {
  const ownerEmail = normalizeEmail(star.ownerEmail);

  if (ownerEmail && membersByEmail.has(ownerEmail)) {
    return membersByEmail.get(ownerEmail);
  }

  const ownerReferralCode = normalizeReferralCode(
    star.ownerReferralCode ?? star.legacyCreatorReferralCode,
  );

  if (ownerReferralCode && membersByReferralCode.has(ownerReferralCode)) {
    return membersByReferralCode.get(ownerReferralCode);
  }

  return null;
}

function buildContentStatsByReferralCode(rows) {
  return new Map(
    rows
      .map((row) => [
        normalizeReferralCode(row._id),
        {
          contentCount: row.contentCount ?? 0,
          latestPublishedAt: row.latestPublishedAt ?? null,
          videoCount: row.videoCount ?? 0,
        },
      ])
      .filter(([referralCode]) => referralCode),
  );
}

async function getContentBackedStars({
  contentPosts,
  fanletterStars,
}) {
  const contentRows = await contentPosts
    .aggregate([
      {
        $match: {
          authorReferralCode: { $type: "string" },
          status: "published",
        },
      },
      {
        $group: {
          _id: "$authorReferralCode",
          contentCount: { $sum: 1 },
          latestPublishedAt: { $max: "$publishedAt" },
          videoCount: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $gt: [{ $size: { $ifNull: ["$contentVideoUrls", []] } }, 0] },
                    {
                      $gt: [
                        { $strLenCP: { $ifNull: ["$previewClipVideoUrl", ""] } },
                        0,
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $sort: {
          videoCount: -1,
          contentCount: -1,
          latestPublishedAt: -1,
          _id: 1,
        },
      },
    ])
    .toArray();
  const contentStatsByReferralCode = buildContentStatsByReferralCode(contentRows);
  const contentReferralCodes = [...contentStatsByReferralCode.keys()];

  if (contentReferralCodes.length === 0) {
    return [];
  }

  const starFilter =
    targetStarIds.size > 0
      ? {
          starId: { $in: [...targetStarIds] },
          status: "active",
        }
      : {
          status: "active",
          $or: [
            { legacyCreatorReferralCode: { $in: contentReferralCodes } },
            { ownerReferralCode: { $in: contentReferralCodes } },
          ],
        };
  const stars = await fanletterStars
    .find(
      starFilter,
      {
        projection: {
          _id: 0,
          characterName: 1,
          displayName: 1,
          founderCount: 1,
          legacyCreatorReferralCode: 1,
          openSlotCount: 1,
          ownerEmail: 1,
          ownerReferralCode: 1,
          starId: 1,
          status: 1,
          updatedAt: 1,
        },
      },
    )
    .toArray();

  return stars
    .map((star) => {
      const legacyStats = contentStatsByReferralCode.get(
        normalizeReferralCode(star.legacyCreatorReferralCode),
      );
      const ownerStats = contentStatsByReferralCode.get(
        normalizeReferralCode(star.ownerReferralCode),
      );
      const stats = legacyStats ?? ownerStats;

      return stats
        ? {
            ...star,
            contentCount: stats.contentCount,
            latestPublishedAt: stats.latestPublishedAt,
            videoCount: stats.videoCount,
          }
        : null;
    })
    .filter(Boolean)
    .sort(
      (left, right) =>
        right.videoCount - left.videoCount ||
        right.contentCount - left.contentCount ||
        new Date(right.latestPublishedAt ?? 0).getTime() -
          new Date(left.latestPublishedAt ?? 0).getTime() ||
        left.starId.localeCompare(right.starId),
    )
    .slice(0, starLimit);
}

async function refreshStarCounts({ fanletterStars, founderMemberships, starIds }) {
  if (starIds.length === 0) {
    return [];
  }

  const membershipRows = await founderMemberships
    .aggregate([
      {
        $match: {
          starId: { $in: starIds },
        },
      },
      {
        $group: {
          _id: "$starId",
          founderCount: {
            $sum: {
              $cond: [{ $eq: ["$role", "creator"] }, 0, 1],
            },
          },
          memberCount: { $sum: 1 },
        },
      },
    ])
    .toArray();
  const now = new Date();
  const updateOps = membershipRows.map((row) => {
    const founderCount = Math.max(0, row.founderCount ?? 0);

    return {
      updateOne: {
        filter: { starId: row._id },
        update: {
          $set: {
            founderCount,
            openSlotCount: Math.max(0, FOUNDER_UNIVERSE_TOTAL_CAPACITY - row.memberCount),
            updatedAt: now,
          },
        },
      },
    };
  });

  if (updateOps.length === 0) {
    return [];
  }

  await fanletterStars.bulkWrite(updateOps, { ordered: false });

  return membershipRows.map((row) => ({
    founderCount: row.founderCount ?? 0,
    memberCount: row.memberCount ?? 0,
    openSlotCount: Math.max(0, FOUNDER_UNIVERSE_TOTAL_CAPACITY - (row.memberCount ?? 0)),
    starId: row._id,
  }));
}

async function main() {
  const client = new MongoClient(uri);

  await client.connect();

  try {
    const db = client.db(dbName);
    const members = db.collection(membersCollectionName);
    const contentPosts = db.collection(contentPostsCollectionName);
    const fanletterStars = db.collection(fanletterStarsCollectionName);
    const founderMemberships = db.collection(
      fanletterStarFounderMembershipsCollectionName,
    );
    const referralCodes = db.collection(fanletterStarReferralCodesCollectionName);
    const referralEdges = db.collection(fanletterStarReferralEdgesCollectionName);
    const now = new Date();
    const [completedMembers, contentBackedStars, existingMembershipRows, existingCodeRows, existingEdgeRows] =
      await Promise.all([
        members
          .find(
            {
              email: { $type: "string" },
              referralCode: { $type: "string" },
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
              },
            },
          )
          .sort({ registrationCompletedAt: 1, createdAt: 1, email: 1 })
          .toArray(),
        getContentBackedStars({ contentPosts, fanletterStars }),
        founderMemberships
          .find(
            {},
            {
              projection: {
                _id: 0,
                memberEmail: 1,
                role: 1,
                starId: 1,
              },
            },
          )
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
        referralEdges
          .find(
            {},
            {
              projection: {
                _id: 0,
                edgeId: 1,
                sourceMemberEmail: 1,
                starId: 1,
                targetMemberEmail: 1,
              },
            },
          )
          .toArray(),
      ]);
    const membersByEmail = new Map(
      completedMembers.map((member) => [normalizeEmail(member.email), member]),
    );
    const membersByReferralCode = new Map(
      completedMembers
        .map((member) => [normalizeReferralCode(member.referralCode), member])
        .filter(([referralCode]) => referralCode),
    );
    const existingMembersByStarId = new Map();
    const existingMembershipByStarAndMember = new Map();
    const participationsByEmail = new Map();

    for (const membership of existingMembershipRows) {
      const memberEmail = normalizeEmail(membership.memberEmail);
      const starId = normalizeId(membership.starId);

      if (!memberEmail || !starId) {
        continue;
      }

      const membersForStar = existingMembersByStarId.get(starId) ?? new Set();
      membersForStar.add(memberEmail);
      existingMembersByStarId.set(starId, membersForStar);
      existingMembershipByStarAndMember.set(`${starId}\u0000${memberEmail}`, membership);

      if (membership.role !== "creator") {
        participationsByEmail.set(
          memberEmail,
          (participationsByEmail.get(memberEmail) ?? 0) + 1,
        );
      }
    }

    const existingCodeByStarAndMember = new Map(
      existingCodeRows.map((row) => [
        `${normalizeId(row.starId)}\u0000${normalizeEmail(row.memberEmail)}`,
        row,
      ]),
    );
    const activeReferralCodes = new Set(
      existingCodeRows
        .filter((row) => row.status === "active")
        .map((row) => normalizeReferralCode(row.code))
        .filter(Boolean),
    );
    const generatedCodeKeys = new Set();
    const existingEdgeKeys = new Set(
      existingEdgeRows
        .map((row) => `${normalizeId(row.starId)}\u0000${normalizeEmail(row.targetMemberEmail)}`)
        .filter((key) => !key.endsWith("\u0000")),
    );
    const referralCodeDocuments = new Map();
    const membershipDocuments = new Map();
    const edgeDocuments = new Map();
    const starReports = [];
    const aggregateProposedDepthCounts = new Map();

    for (const star of contentBackedStars) {
      const starId = normalizeId(star.starId);
      const creatorMember = getStarCreatorMember({
        membersByEmail,
        membersByReferralCode,
        star,
      });
      const creatorEmail = normalizeEmail(creatorMember?.email ?? star.ownerEmail);

      if (!starId || !creatorMember || !creatorEmail) {
        starReports.push({
          skippedReason: "creator_member_not_found",
          starId: star.starId,
        });
        continue;
      }

      const existingMembersForStar = existingMembersByStarId.get(starId) ?? new Set();
      const availableMembers = sortMembersForStar({
        members: completedMembers,
        participationsByEmail,
        starId,
      }).filter((member) => {
        const memberEmail = normalizeEmail(member.email);

        return (
          memberEmail &&
          memberEmail !== creatorEmail &&
          !existingMembersForStar.has(memberEmail) &&
          (participationsByEmail.get(memberEmail) ?? 0) < participationsPerMember
        );
      });
      const proposedMemberCount = Math.max(0, membersPerStar - existingMembersForStar.size);
      const selectedMembers = availableMembers.slice(0, proposedMemberCount);
      const positionRows = [
        {
          depth: 0,
          member: creatorMember,
          parentPosition: null,
          position: 0,
        },
        ...selectedMembers.map((member, index) => {
          const position = index + 1;

          return {
            depth: getDepthForPosition(position),
            member,
            parentPosition: getParentPosition(position),
            position,
          };
        }),
      ];
      const referralCodeByPosition = new Map();
      const proposedDepthCounts = new Map();

      for (const row of positionRows) {
        const memberEmail = normalizeEmail(row.member.email);
        const existingCode = existingCodeByStarAndMember.get(
          `${starId}\u0000${memberEmail}`,
        );
        const referralCodeAllocation = allocateReferralCode({
          activeReferralCodes,
          existingCode,
          generatedCodeKeys,
          member: row.member,
          star,
        });

        referralCodeByPosition.set(row.position, referralCodeAllocation.code);

        if (referralCodeAllocation.writeRequired) {
          referralCodeDocuments.set(`${starId}\u0000${memberEmail}`, {
            code: referralCodeAllocation.code,
            createdAt: getMemberJoinedAt(row.member, now),
            disabledAt: null,
            lastUsedAt: null,
            memberEmail,
            memberReferralCode: normalizeReferralCode(row.member.referralCode),
            source: "manual",
            starId,
            status: "active",
            updatedAt: now,
          });
        }
      }

      for (const row of positionRows) {
        const memberEmail = normalizeEmail(row.member.email);
        const existingMembership = existingMembershipByStarAndMember.get(
          `${starId}\u0000${memberEmail}`,
        );

        if (row.depth === 0) {
          if (!existingMembership) {
            membershipDocuments.set(`${starId}\u0000${memberEmail}`, {
              backfilledAt: now,
              cpBalance: 0,
              createdAt: getMemberJoinedAt(row.member, now),
              creatorProgressPercent: 100,
              influenceScore: 80,
              joinedAt: getMemberJoinedAt(row.member, now),
              joinedViaCode: null,
              joinedViaMemberEmail: null,
              joinedViaMemberReferralCode: null,
              joinedViaShareId: null,
              memberEmail,
              memberReferralCode: normalizeReferralCode(row.member.referralCode),
              role: "creator",
              source: "manual",
              starId,
              updatedAt: now,
            });
          }

          continue;
        }

        if (existingMembership) {
          continue;
        }

        const tier = getTier(row.depth);
        const parentRow =
          typeof row.parentPosition === "number"
            ? positionRows.find((item) => item.position === row.parentPosition)
            : null;
        const parentEmail = normalizeEmail(parentRow?.member.email);
        const parentReferralCode = normalizeReferralCode(parentRow?.member.referralCode);
        const parentStarReferralCode =
          typeof row.parentPosition === "number"
            ? referralCodeByPosition.get(row.parentPosition) ?? null
            : null;

        if (!tier || !parentRow || !parentEmail) {
          continue;
        }

        const joinedAt = getMemberJoinedAt(row.member, now);
        const memberReferralCode = normalizeReferralCode(row.member.referralCode);
        membershipDocuments.set(`${starId}\u0000${memberEmail}`, {
          backfilledAt: now,
          cpBalance: 0,
          createdAt: joinedAt,
          creatorProgressPercent: 0,
          influenceScore: Math.max(0, 16 - row.depth * 2),
          joinedAt,
          joinedViaCode: parentStarReferralCode,
          joinedViaMemberEmail: parentEmail,
          joinedViaMemberReferralCode: parentReferralCode,
          joinedViaShareId: null,
          memberEmail,
          memberReferralCode,
          role: tier.role,
          source: "manual",
          starId,
          updatedAt: now,
        });
        incrementCount(proposedDepthCounts, row.depth);
        incrementCount(aggregateProposedDepthCounts, row.depth);

        const edgeKey = `${starId}\u0000${memberEmail}`;

        if (!existingEdgeKeys.has(edgeKey)) {
          edgeDocuments.set(edgeKey, {
            backfilledAt: now,
            createdAt: joinedAt,
            edgeId: buildEdgeId({
              sourceMemberEmail: parentEmail,
              starId,
              targetMemberEmail: memberEmail,
            }),
            referralCode: parentStarReferralCode,
            shareId: null,
            source: "manual",
            sourceMemberEmail: parentEmail,
            sourceMemberReferralCode: parentReferralCode,
            starId,
            targetMemberEmail: memberEmail,
            targetMemberReferralCode: memberReferralCode,
            updatedAt: now,
          });
          existingEdgeKeys.add(edgeKey);
        }

        existingMembersForStar.add(memberEmail);
        participationsByEmail.set(
          memberEmail,
          (participationsByEmail.get(memberEmail) ?? 0) + 1,
        );
      }

      starReports.push({
        contentCount: star.contentCount,
        existingMembers: existingMembersForStar.size - selectedMembers.length,
        latestPublishedAt: star.latestPublishedAt ?? null,
        proposedDepthCounts: mapToSortedObject(proposedDepthCounts),
        proposedMembers: selectedMembers.length,
        starId,
        starName: star.characterName || star.displayName || star.starId,
        videoCount: star.videoCount,
      });
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
            $setOnInsert: document,
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
      const refreshedStarCounts = await refreshStarCounts({
        fanletterStars,
        founderMemberships,
        starIds: contentBackedStars.map((star) => normalizeId(star.starId)),
      });

      writeResult = {
        founderMemberships: summarizeBulkWriteResult(membershipResult),
        referralCodes: summarizeBulkWriteResult(referralCodeResult),
        referralEdges: summarizeBulkWriteResult(edgeResult),
        refreshedStarCounts,
      };
    }

    const report = {
      backfillMode: writeChanges ? "write" : "dry-run-read-only",
      collectionNames: {
        contentPosts: contentPostsCollectionName,
        fanletterStarFounderMemberships:
          fanletterStarFounderMembershipsCollectionName,
        fanletterStarReferralCodes: fanletterStarReferralCodesCollectionName,
        fanletterStarReferralEdges: fanletterStarReferralEdgesCollectionName,
        fanletterStars: fanletterStarsCollectionName,
        members: membersCollectionName,
      },
      counts: {
        completedMembers: completedMembers.length,
        contentBackedStars: contentBackedStars.length,
        proposedDepthCounts: mapToSortedObject(aggregateProposedDepthCounts),
        proposedFounderMemberships: membershipDocuments.size,
        proposedReferralCodes: referralCodeDocuments.size,
        proposedReferralEdges: edgeDocuments.size,
        scannedExistingMemberships: existingMembershipRows.length,
      },
      dryRunWriteCommand:
        "FANLETTER_FOUNDER_UNIVERSE_ENRICH_WRITE=1 pnpm fanletter:founder-universe:enrich",
      options: {
        membersPerStar,
        participationsPerMember,
        starLimit,
        targetStarIds: [...targetStarIds],
      },
      notes: [
        "This enrichment uses completed members as visible Founder Universe participants across multiple content-backed AI Stars.",
        "It writes only star-scoped founder memberships, referral codes, referral edges, and fanletterStars founder/open-slot counters.",
        "It does not modify legacy member referral, placement, payment, reward, point, or CP ledger collections.",
        "Rows are inserted with source=manual and no retroactive CP is issued.",
        "Existing creator/founder memberships are preserved; missing members are arranged in a deterministic 6-branch tree.",
      ],
      sampleStars: starReports.slice(0, sampleLimit),
      writeResult,
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.close();
  }
}

await main();
