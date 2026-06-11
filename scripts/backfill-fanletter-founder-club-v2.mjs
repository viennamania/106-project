import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

const DEFAULT_SAMPLE_LIMIT = 12;
const DEFAULT_TOP_LIMIT = 20;

const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB_NAME?.trim();
const membersCollectionName =
  process.env.MONGODB_MEMBERS_COLLECTION?.trim() ?? "members";
const creatorProfilesCollectionName =
  process.env.MONGODB_CREATOR_PROFILES_COLLECTION?.trim() ?? "creatorProfiles";
const contentPostsCollectionName =
  process.env.MONGODB_CONTENT_POSTS_COLLECTION?.trim() ?? "contentPosts";
const fanletterCharacterFollowsCollectionName =
  process.env.MONGODB_FANLETTER_CHARACTER_FOLLOWS_COLLECTION ??
  "fanletterCharacterFollows";
const fanletterFanRequestsCollectionName =
  process.env.MONGODB_FANLETTER_FAN_REQUESTS_COLLECTION ??
  "fanletterFanRequests";
const fanletterNewsReportsCollectionName =
  process.env.MONGODB_FANLETTER_NEWS_REPORTS_COLLECTION ??
  "fanletterNewsReports";
const fanletterNewsCutShareLinksCollectionName =
  process.env.MONGODB_FANLETTER_NEWS_CUT_SHARE_LINKS_COLLECTION ??
  "fanletterNewsCutShareLinks";
const fanletterStarsCollectionName =
  process.env.MONGODB_FANLETTER_STARS_COLLECTION ?? "fanletterStars";
const fanletterStarReferralCodesCollectionName =
  process.env.MONGODB_FANLETTER_STAR_REFERRAL_CODES_COLLECTION ??
  "fanletterStarReferralCodes";
const fanletterStarFounderMembershipsCollectionName =
  process.env.MONGODB_FANLETTER_STAR_FOUNDER_MEMBERSHIPS_COLLECTION ??
  "fanletterStarFounderMemberships";

const writeChanges = ["1", "true", "yes"].includes(
  (process.env.FANLETTER_FOUNDER_CLUB_BACKFILL_WRITE ?? "")
    .trim()
    .toLowerCase(),
);
const defaultFounderSlotLimit = readPositiveInteger(
  process.env.FANLETTER_FOUNDER_CLUB_DEFAULT_SLOT_LIMIT,
  150,
);
const sampleLimit = readPositiveInteger(
  process.env.FANLETTER_FOUNDER_CLUB_BACKFILL_SAMPLE_LIMIT,
  DEFAULT_SAMPLE_LIMIT,
);
const topLimit = readPositiveInteger(
  process.env.FANLETTER_FOUNDER_CLUB_BACKFILL_TOP_LIMIT,
  DEFAULT_TOP_LIMIT,
);
const targetCreatorReferralCodes = parseReferralCodeList(
  process.env.FANLETTER_FOUNDER_CLUB_BACKFILL_CREATOR_CODES,
);

if (!uri) {
  throw new Error("MONGODB_URI is not configured.");
}

if (!dbName) {
  throw new Error("MONGODB_DB_NAME is not configured.");
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

function toIsoStringOrNull(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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

function getMemberJoinedAt(member, fallback = new Date()) {
  return toDateOrFallback(
    member.registrationCompletedAt,
    toDateOrFallback(member.createdAt, fallback),
  );
}

function getLegacyStarId(creatorReferralCode) {
  return `legacy-star-${creatorReferralCode.toLowerCase()}`;
}

function getInitialStarScore(star) {
  if (star.proposedStatus === "draft") {
    return 0;
  }

  const weightedScore =
    35 +
    star.sourceCounts.contentPosts * 0.08 +
    star.sourceCounts.newsReports * 0.06 +
    star.sourceCounts.fanRequests * 0.35 +
    star.sourceCounts.follows * 1.2 +
    star.sourceCounts.newsCutShareLinks * 0.5;

  return Math.max(0, Math.min(100, Math.round(weightedScore)));
}

function createEmptySourceCounts() {
  return {
    contentPosts: 0,
    creatorProfiles: 0,
    fanRequests: 0,
    follows: 0,
    memberOwnedStars: 0,
    newsCutShareLinks: 0,
    newsReports: 0,
    shareSignupAttributions: 0,
  };
}

function getOrCreateStar(starsByReferralCode, creatorReferralCode) {
  const normalizedCode = normalizeReferralCode(creatorReferralCode);

  if (!normalizedCode) {
    return null;
  }

  if (!starsByReferralCode.has(normalizedCode)) {
    starsByReferralCode.set(normalizedCode, {
      characterName: null,
      creatorEmail: null,
      displayName: null,
      legacyCreatorReferralCode: normalizedCode,
      legacyPersonaId: null,
      ownerEmail: null,
      ownerReferralCode: normalizedCode,
      portraitImageUrl: null,
      proposedStatus: "draft",
      sourceCounts: createEmptySourceCounts(),
      starId: getLegacyStarId(normalizedCode),
    });
  }

  return starsByReferralCode.get(normalizedCode);
}

function addStarCount(starsByReferralCode, creatorReferralCode, source, count) {
  const star = getOrCreateStar(starsByReferralCode, creatorReferralCode);

  if (!star) {
    return;
  }

  star.sourceCounts[source] += count;
}

function getStarActivityScore(star) {
  return Object.values(star.sourceCounts).reduce((sum, count) => sum + count, 0);
}

function summarizeStar(star) {
  return {
    characterName: star.characterName,
    creatorEmail: star.creatorEmail,
    displayName: star.displayName,
    legacyCreatorReferralCode: star.legacyCreatorReferralCode,
    legacyPersonaId: star.legacyPersonaId,
    ownerEmail: star.ownerEmail,
    ownerReferralCode: star.ownerReferralCode,
    portraitImageUrl: star.portraitImageUrl,
    proposedStatus: star.proposedStatus,
    sourceCounts: star.sourceCounts,
    starId: star.starId,
    totalSourceRows: getStarActivityScore(star),
  };
}

function sortRowsByCount(left, right) {
  return right.count - left.count || String(left._id).localeCompare(String(right._id));
}

function makeFieldTypeMatch(fieldName) {
  return {
    [fieldName]: {
      $type: "string",
    },
  };
}

function addTargetCreatorFilter(match, fieldName) {
  if (targetCreatorReferralCodes.size === 0) {
    return match;
  }

  return {
    ...match,
    [fieldName]: {
      ...(match[fieldName] ?? {}),
      $in: [...targetCreatorReferralCodes],
    },
  };
}

function getTargetReferralCodeMatch(fieldName) {
  return addTargetCreatorFilter(makeFieldTypeMatch(fieldName), fieldName);
}

function getMemberOwnedStarName(member) {
  const displayName =
    member.publicProfile?.displayName?.trim() ||
    member.email?.split("@")[0]?.trim() ||
    "Founder";

  return `${displayName} Starter AI Star`;
}

function summarizeMemberOwnedCreatorMembership(member, starsByReferralCode) {
  const memberReferralCode = normalizeReferralCode(member.referralCode);
  const star = memberReferralCode
    ? starsByReferralCode.get(memberReferralCode)
    : null;

  return {
    joinedAt: toIsoStringOrNull(
      member.registrationCompletedAt ?? member.createdAt,
    ),
    memberEmail: normalizeEmail(member.email) || null,
    memberReferralCode,
    role: "creator",
    source: "member_signup",
    starId: memberReferralCode ? getLegacyStarId(memberReferralCode) : null,
    starStatus: star?.proposedStatus ?? "draft",
  };
}

function getBackfillSourceForStar(star) {
  return star.sourceCounts.creatorProfiles > 0
    ? "creator_profile"
    : "member_signup";
}

function getMemberOwnedStarCandidates(completedMemberRows, starsByReferralCode) {
  return completedMemberRows
    .map((member) => {
      const memberReferralCode = normalizeReferralCode(member.referralCode);
      const memberEmail = normalizeEmail(member.email);
      const star = memberReferralCode
        ? starsByReferralCode.get(memberReferralCode)
        : null;

      if (!memberReferralCode || !memberEmail || !star) {
        return null;
      }

      return {
        member,
        memberEmail,
        memberReferralCode,
        star,
      };
    })
    .filter(Boolean);
}

function buildStarDocument(candidate, now) {
  const { member, memberEmail, memberReferralCode, star } = candidate;
  const joinedAt = getMemberJoinedAt(member, now);
  const source = getBackfillSourceForStar(star);

  return {
    backfilledAt: now,
    categoryLabel: null,
    characterName:
      star.characterName || getMemberOwnedStarName(member) || "Starter AI Star",
    createdAt: joinedAt,
    displayName:
      star.displayName ||
      member.publicProfile?.displayName?.trim() ||
      memberEmail.split("@")[0] ||
      "Founder",
    founderCount: 1,
    growthPercent: 0,
    legacyCreatorReferralCode: memberReferralCode,
    legacyPersonaId: star.legacyPersonaId ?? null,
    openSlotCount: Math.max(0, defaultFounderSlotLimit - 1),
    ownerEmail: star.ownerEmail ?? memberEmail,
    ownerReferralCode: memberReferralCode,
    portraitImageUrl: star.portraitImageUrl ?? null,
    source,
    starId: star.starId,
    starScore: getInitialStarScore(star),
    status: star.proposedStatus,
    updatedAt: now,
  };
}

function buildCreatorMembershipDocument(candidate, now) {
  const { member, memberEmail, memberReferralCode, star } = candidate;
  const joinedAt = getMemberJoinedAt(member, now);

  return {
    backfilledAt: now,
    cpBalance: 0,
    createdAt: joinedAt,
    creatorProgressPercent: 100,
    influenceScore: 0,
    joinedAt,
    joinedViaCode: null,
    joinedViaMemberEmail: null,
    joinedViaMemberReferralCode: null,
    joinedViaShareId: null,
    memberEmail,
    memberReferralCode,
    role: "creator",
    source: "member_signup",
    starId: star.starId,
    updatedAt: now,
  };
}

function buildCreatorReferralCodeDocument(candidate, now) {
  const { member, memberEmail, memberReferralCode, star } = candidate;
  const joinedAt = getMemberJoinedAt(member, now);

  return {
    code: memberReferralCode,
    createdAt: joinedAt,
    disabledAt: null,
    lastUsedAt: null,
    memberEmail,
    memberReferralCode,
    source: "member_signup",
    starId: star.starId,
    status: "active",
    updatedAt: now,
  };
}

async function aggregateCountByReferralCode({
  collection,
  fieldName,
  match = {},
}) {
  return collection
    .aggregate([
      {
        $match: addTargetCreatorFilter(
          {
            ...match,
            ...makeFieldTypeMatch(fieldName),
          },
          fieldName,
        ),
      },
      {
        $group: {
          _id: `$${fieldName}`,
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
    ])
    .toArray();
}

async function ensureFounderClubIndexes({
  founderMemberships,
  referralCodes,
  stars,
}) {
  await Promise.all([
    stars.createIndex({ starId: 1 }, { unique: true }),
    stars.createIndex(
      { legacyCreatorReferralCode: 1 },
      {
        unique: true,
        partialFilterExpression: {
          legacyCreatorReferralCode: { $type: "string" },
        },
      },
    ),
    stars.createIndex({ ownerEmail: 1, status: 1, updatedAt: -1 }),
    stars.createIndex({ status: 1, starScore: -1, updatedAt: -1 }),
    referralCodes.createIndex({ starId: 1, code: 1 }, { unique: true }),
    referralCodes.createIndex(
      { starId: 1, memberEmail: 1 },
      { unique: true },
    ),
    referralCodes.createIndex({ memberEmail: 1, status: 1, updatedAt: -1 }),
    referralCodes.createIndex({ code: 1, status: 1 }),
    founderMemberships.createIndex(
      { starId: 1, memberEmail: 1 },
      { unique: true },
    ),
    founderMemberships.createIndex({ memberEmail: 1, role: 1, updatedAt: -1 }),
    founderMemberships.createIndex({ starId: 1, role: 1, influenceScore: -1 }),
    founderMemberships.createIndex({ starId: 1, joinedAt: -1 }),
  ]);
}

function summarizeBulkWriteResult(result) {
  return {
    inserted: result.insertedCount ?? 0,
    matched: result.matchedCount ?? 0,
    modified: result.modifiedCount ?? 0,
    upserted: result.upsertedCount ?? 0,
  };
}

async function applyMemberOwnedStarBackfill({ collections, candidates, now }) {
  const { founderMemberships, referralCodes, stars } = collections;

  await ensureFounderClubIndexes(collections);

  if (candidates.length === 0) {
    return {
      creatorMemberships: summarizeBulkWriteResult({}),
      referralCodes: summarizeBulkWriteResult({}),
      stars: summarizeBulkWriteResult({}),
    };
  }

  const [starResult, membershipResult, referralCodeResult] = await Promise.all([
    stars.bulkWrite(
      candidates.map((candidate) => {
        const document = buildStarDocument(candidate, now);

        return {
          updateOne: {
            filter: { starId: document.starId },
            update: {
              $setOnInsert: document,
            },
            upsert: true,
          },
        };
      }),
      { ordered: false },
    ),
    founderMemberships.bulkWrite(
      candidates.map((candidate) => {
        const document = buildCreatorMembershipDocument(candidate, now);

        return {
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
        };
      }),
      { ordered: false },
    ),
    referralCodes.bulkWrite(
      candidates.map((candidate) => {
        const document = buildCreatorReferralCodeDocument(candidate, now);

        return {
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
        };
      }),
      { ordered: false },
    ),
  ]);

  return {
    creatorMemberships: summarizeBulkWriteResult(membershipResult),
    referralCodes: summarizeBulkWriteResult(referralCodeResult),
    stars: summarizeBulkWriteResult(starResult),
  };
}

function summarizeCountRows(rows) {
  return rows
    .slice()
    .sort(sortRowsByCount)
    .slice(0, topLimit)
    .map((row) => ({
      count: row.count,
      legacyCreatorReferralCode: normalizeReferralCode(row._id),
      starId: normalizeReferralCode(row._id)
        ? getLegacyStarId(normalizeReferralCode(row._id))
        : null,
    }));
}

function summarizeHighConfidenceEdge(row) {
  const creatorReferralCode = normalizeReferralCode(row.starCreatorReferralCode);

  return {
    joinedAt: toIsoStringOrNull(row.joinedAt),
    joinedMemberEmail: normalizeEmail(row.joinedMemberEmail) || null,
    joinedMemberReferralCode: normalizeReferralCode(row.joinedMemberReferralCode),
    legacyCreatorReferralCode: creatorReferralCode,
    shareId: row.shareId ?? null,
    sourceMemberEmail: normalizeEmail(row.sourceMemberEmail) || null,
    sourceMemberReferralCode: normalizeReferralCode(row.sourceMemberReferralCode),
    starId: creatorReferralCode ? getLegacyStarId(creatorReferralCode) : null,
  };
}

function summarizeMediumAttribution(row) {
  const creatorReferralCode = normalizeReferralCode(row.creatorReferralCode);

  return {
    joinedAt: toIsoStringOrNull(row.joinedAt),
    joinedMemberEmail: normalizeEmail(row.joinedMemberEmail) || null,
    joinedMemberReferralCode: normalizeReferralCode(row.joinedMemberReferralCode),
    legacyCreatorReferralCode: creatorReferralCode,
    shareId: row.shareId ?? null,
    starId: creatorReferralCode ? getLegacyStarId(creatorReferralCode) : null,
  };
}

function summarizeLegacyReferral(row) {
  return {
    count: row.count,
    legacyPlacementReferralCode: normalizeReferralCode(row._id),
  };
}

const client = new MongoClient(uri);

try {
  await client.connect();

  const db = client.db(dbName);
  const members = db.collection(membersCollectionName);
  const creatorProfiles = db.collection(creatorProfilesCollectionName);
  const contentPosts = db.collection(contentPostsCollectionName);
  const fanletterCharacterFollows = db.collection(
    fanletterCharacterFollowsCollectionName,
  );
  const fanletterFanRequests = db.collection(fanletterFanRequestsCollectionName);
  const fanletterNewsReports = db.collection(fanletterNewsReportsCollectionName);
  const fanletterNewsCutShareLinks = db.collection(
    fanletterNewsCutShareLinksCollectionName,
  );
  const fanletterStars = db.collection(fanletterStarsCollectionName);
  const fanletterStarReferralCodes = db.collection(
    fanletterStarReferralCodesCollectionName,
  );
  const fanletterStarFounderMemberships = db.collection(
    fanletterStarFounderMembershipsCollectionName,
  );
  const starsByReferralCode = new Map();

  const [
    completedMemberRows,
    creatorProfileRows,
    contentPostRows,
    followRows,
    requestRows,
    newsReportRows,
    shareLinkRows,
    shareSignupAttributionRows,
  ] = await Promise.all([
    members
      .find(
        {
          status: "completed",
          ...getTargetReferralCodeMatch("referralCode"),
        },
        {
          projection: {
            _id: 0,
            createdAt: 1,
            email: 1,
            publicProfile: 1,
            referralCode: 1,
            registrationCompletedAt: 1,
          },
        },
      )
      .sort({ registrationCompletedAt: 1, createdAt: 1, email: 1 })
      .toArray(),
    creatorProfiles
      .find(addTargetCreatorFilter(makeFieldTypeMatch("referralCode"), "referralCode"), {
        projection: {
          _id: 0,
          avatarImageUrl: 1,
          "characterPersona.id": 1,
          "characterPersona.name": 1,
          displayName: 1,
          email: 1,
          referralCode: 1,
          status: 1,
        },
      })
      .toArray(),
    aggregateCountByReferralCode({
      collection: contentPosts,
      fieldName: "authorReferralCode",
      match: { status: "published" },
    }),
    aggregateCountByReferralCode({
      collection: fanletterCharacterFollows,
      fieldName: "creatorReferralCode",
    }),
    aggregateCountByReferralCode({
      collection: fanletterFanRequests,
      fieldName: "creatorReferralCode",
    }),
    aggregateCountByReferralCode({
      collection: fanletterNewsReports,
      fieldName: "creatorReferralCode",
      match: { status: "published" },
    }),
    aggregateCountByReferralCode({
      collection: fanletterNewsCutShareLinks,
      fieldName: "creatorReferralCode",
    }),
    aggregateCountByReferralCode({
      collection: members,
      fieldName: "fanletterShareCreatorReferralCode",
      match: { status: "completed" },
    }),
  ]);

  for (const member of completedMemberRows) {
    const star = getOrCreateStar(starsByReferralCode, member.referralCode);

    if (!star) {
      continue;
    }

    const memberEmail = normalizeEmail(member.email);

    star.characterName = star.characterName ?? getMemberOwnedStarName(member);
    star.creatorEmail = star.creatorEmail ?? memberEmail;
    star.displayName =
      star.displayName ??
      member.publicProfile?.displayName?.trim() ??
      member.email?.split("@")[0]?.trim() ??
      null;
    star.ownerEmail = star.ownerEmail ?? memberEmail;
    star.ownerReferralCode =
      star.ownerReferralCode ?? normalizeReferralCode(member.referralCode);
    star.sourceCounts.memberOwnedStars += 1;
  }

  for (const profile of creatorProfileRows) {
    const star = getOrCreateStar(starsByReferralCode, profile.referralCode);

    if (!star) {
      continue;
    }

    star.characterName = profile.characterPersona?.name?.trim() || null;
    star.creatorEmail = normalizeEmail(profile.email) || null;
    star.displayName = profile.displayName?.trim() || null;
    star.legacyPersonaId = profile.characterPersona?.id?.trim() || null;
    star.ownerEmail = star.ownerEmail ?? normalizeEmail(profile.email) ?? null;
    star.ownerReferralCode =
      star.ownerReferralCode ?? normalizeReferralCode(profile.referralCode);
    star.portraitImageUrl = profile.avatarImageUrl?.trim() || null;
    star.proposedStatus = "active";
    star.sourceCounts.creatorProfiles += 1;
  }

  for (const row of contentPostRows) {
    addStarCount(starsByReferralCode, row._id, "contentPosts", row.count);
  }

  for (const row of followRows) {
    addStarCount(starsByReferralCode, row._id, "follows", row.count);
  }

  for (const row of requestRows) {
    addStarCount(starsByReferralCode, row._id, "fanRequests", row.count);
  }

  for (const row of newsReportRows) {
    addStarCount(starsByReferralCode, row._id, "newsReports", row.count);
  }

  for (const row of shareLinkRows) {
    addStarCount(starsByReferralCode, row._id, "newsCutShareLinks", row.count);
  }

  for (const row of shareSignupAttributionRows) {
    addStarCount(
      starsByReferralCode,
      row._id,
      "shareSignupAttributions",
      row.count,
    );
  }

  for (const star of starsByReferralCode.values()) {
    if (
      star.sourceCounts.creatorProfiles > 0 ||
      star.sourceCounts.contentPosts > 0 ||
      star.sourceCounts.newsReports > 0
    ) {
      star.proposedStatus = "active";
    }
  }

  const memberOwnedStarCandidates = getMemberOwnedStarCandidates(
    completedMemberRows,
    starsByReferralCode,
  );
  const writeResult = writeChanges
    ? await applyMemberOwnedStarBackfill({
        candidates: memberOwnedStarCandidates,
        collections: {
          founderMemberships: fanletterStarFounderMemberships,
          referralCodes: fanletterStarReferralCodes,
          stars: fanletterStars,
        },
        now: new Date(),
      })
    : null;

  const highConfidenceEdges = await members
    .aggregate([
      {
        $match: {
          fanletterShareId: { $type: "string" },
          status: "completed",
        },
      },
      {
        $lookup: {
          as: "shareLinks",
          foreignField: "shareId",
          from: fanletterNewsCutShareLinksCollectionName,
          localField: "fanletterShareId",
        },
      },
      { $unwind: "$shareLinks" },
      {
        $match: addTargetCreatorFilter(
          {
            "shareLinks.creatorReferralCode": { $type: "string" },
            "shareLinks.ownerEmail": { $type: "string" },
          },
          "shareLinks.creatorReferralCode",
        ),
      },
      {
        $project: {
          _id: 0,
          joinedAt: "$registrationCompletedAt",
          joinedMemberEmail: "$email",
          joinedMemberReferralCode: "$referralCode",
          shareId: "$fanletterShareId",
          sourceMemberEmail: "$shareLinks.ownerEmail",
          sourceMemberReferralCode: "$shareLinks.ownerReferralCode",
          starCreatorReferralCode: "$shareLinks.creatorReferralCode",
        },
      },
      { $sort: { joinedAt: -1, joinedMemberEmail: 1 } },
    ])
    .toArray();

  const mediumAttributionsWithoutShareLink = await members
    .aggregate([
      {
        $match: addTargetCreatorFilter(
          {
            fanletterShareCreatorReferralCode: { $type: "string" },
            status: "completed",
          },
          "fanletterShareCreatorReferralCode",
        ),
      },
      {
        $lookup: {
          as: "shareLinks",
          foreignField: "shareId",
          from: fanletterNewsCutShareLinksCollectionName,
          localField: "fanletterShareId",
        },
      },
      {
        $match: {
          shareLinks: { $size: 0 },
        },
      },
      {
        $project: {
          _id: 0,
          creatorReferralCode: "$fanletterShareCreatorReferralCode",
          joinedAt: "$registrationCompletedAt",
          joinedMemberEmail: "$email",
          joinedMemberReferralCode: "$referralCode",
          shareId: "$fanletterShareId",
        },
      },
      { $sort: { joinedAt: -1, joinedMemberEmail: 1 } },
    ])
    .toArray();

  const legacyReferralOnlyRows = await members
    .aggregate([
      {
        $match: {
          placementReferralCode: { $type: "string" },
          status: "completed",
          $or: [
            { fanletterShareCreatorReferralCode: { $exists: false } },
            { fanletterShareCreatorReferralCode: null },
            { fanletterShareCreatorReferralCode: "" },
          ],
        },
      },
      {
        $group: {
          _id: "$placementReferralCode",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
    ])
    .toArray();

  const followMembershipRows = await fanletterCharacterFollows
    .aggregate([
      {
        $match: addTargetCreatorFilter(
          {
            creatorReferralCode: { $type: "string" },
            followerEmail: { $type: "string" },
          },
          "creatorReferralCode",
        ),
      },
      {
        $group: {
          _id: "$creatorReferralCode",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
      { $limit: topLimit },
    ])
    .toArray();

  const requestMembershipRows = await fanletterFanRequests
    .aggregate([
      {
        $match: addTargetCreatorFilter(
          {
            creatorReferralCode: { $type: "string" },
            requesterEmail: { $type: "string" },
          },
          "creatorReferralCode",
        ),
      },
      {
        $group: {
          _id: "$creatorReferralCode",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
      { $limit: topLimit },
    ])
    .toArray();

  const highConfidenceByStar = new Map();

  for (const edge of highConfidenceEdges) {
    const creatorReferralCode = normalizeReferralCode(edge.starCreatorReferralCode);

    if (!creatorReferralCode) {
      continue;
    }

    highConfidenceByStar.set(
      creatorReferralCode,
      (highConfidenceByStar.get(creatorReferralCode) ?? 0) + 1,
    );
  }

  const report = {
    backfillMode: writeChanges ? "write" : "dry-run-read-only",
    collectionNames: {
      contentPosts: contentPostsCollectionName,
      creatorProfiles: creatorProfilesCollectionName,
      fanletterCharacterFollows: fanletterCharacterFollowsCollectionName,
      fanletterFanRequests: fanletterFanRequestsCollectionName,
      fanletterNewsCutShareLinks: fanletterNewsCutShareLinksCollectionName,
      fanletterNewsReports: fanletterNewsReportsCollectionName,
      fanletterStarFounderMemberships:
        fanletterStarFounderMembershipsCollectionName,
      fanletterStarReferralCodes: fanletterStarReferralCodesCollectionName,
      fanletterStars: fanletterStarsCollectionName,
      members: membersCollectionName,
    },
    counts: {
      candidateStars: starsByReferralCode.size,
      completedMembersWithReferralCode: completedMemberRows.length,
      highConfidenceReferralEdges: highConfidenceEdges.length,
      legacyReferralOnlyGroups: legacyReferralOnlyRows.length,
      memberOwnedCreatorMemberships: completedMemberRows.length,
      memberOwnedDraftStars: [...starsByReferralCode.values()].filter(
        (star) => star.proposedStatus === "draft",
      ).length,
      memberOwnedReferralCodes: memberOwnedStarCandidates.length,
      memberOwnedStarsToUpsert: memberOwnedStarCandidates.length,
      mediumAttributionsWithoutShareLink:
        mediumAttributionsWithoutShareLink.length,
      profileBackedStars: creatorProfileRows.length,
    },
    notes: [
      "High confidence edges have a completed member signup, fanletterShareId, matching news cut share link, share owner, and creator referral code.",
      "Member-owned star backfill creates one AI Star candidate per completed member referralCode and makes that member the creator of that star.",
      "Member-owned stars without an existing creator profile or published content should start as draft so incomplete AI Stars do not enter public discovery.",
      "Medium attributions identify the AI Star through fanletterShareCreatorReferralCode but do not resolve the scout/share owner from fanletterNewsCutShareLinks.",
      "Legacy referral-only members should stay in the existing member referral tree unless product policy assigns them to a default/global AI Star.",
      writeChanges
        ? "Write mode only upserts new Founder Club collections and does not modify legacy member referral, placement, reward, or payment collections."
        : "Set FANLETTER_FOUNDER_CLUB_BACKFILL_WRITE=1 to upsert member-owned stars, creator memberships, and star-scoped referral codes.",
    ],
    proposedCollections: [
      {
        collection: "fanletterStars",
        uniqueIndexes: ["starId", "legacyCreatorReferralCode"],
      },
      {
        collection: "fanletterStarReferralCodes",
        uniqueIndexes: ["{ starId: 1, code: 1 }", "{ starId: 1, memberEmail: 1 }"],
      },
      {
        collection: "fanletterStarFounderMemberships",
        uniqueIndexes: ["{ starId: 1, memberEmail: 1 }"],
      },
      {
        collection: "fanletterStarReferralEdges",
        uniqueIndexes: [
          "{ starId: 1, targetMemberEmail: 1 }",
          "{ starId: 1, shareId: 1, targetMemberEmail: 1 }",
        ],
      },
      {
        collection: "fanletterStarInfluenceLedger",
        uniqueIndexes: ["sourceId"],
      },
    ],
    samples: {
      candidateStars: [...starsByReferralCode.values()]
        .sort((left, right) => getStarActivityScore(right) - getStarActivityScore(left))
        .slice(0, sampleLimit)
        .map(summarizeStar),
      highConfidenceReferralEdges: highConfidenceEdges
        .slice(0, sampleLimit)
        .map(summarizeHighConfidenceEdge),
      mediumAttributionsWithoutShareLink: mediumAttributionsWithoutShareLink
        .slice(0, sampleLimit)
        .map(summarizeMediumAttribution),
      memberOwnedCreatorMemberships: completedMemberRows
        .slice(0, sampleLimit)
        .map((member) =>
          summarizeMemberOwnedCreatorMembership(member, starsByReferralCode),
        ),
    },
    topBySource: {
      contentPosts: summarizeCountRows(contentPostRows),
      fanRequests: summarizeCountRows(requestRows),
      follows: summarizeCountRows(followRows),
      highConfidenceReferralEdges: [...highConfidenceByStar.entries()]
        .map(([creatorReferralCode, count]) => ({
          count,
          legacyCreatorReferralCode: creatorReferralCode,
          starId: getLegacyStarId(creatorReferralCode),
        }))
        .sort(sortRowsByCount)
        .slice(0, topLimit),
      legacyReferralOnly: legacyReferralOnlyRows
        .slice(0, topLimit)
        .map(summarizeLegacyReferral),
      newsCutShareLinks: summarizeCountRows(shareLinkRows),
      newsReports: summarizeCountRows(newsReportRows),
      possibleFollowMemberships: summarizeCountRows(followMembershipRows),
      possibleRequestMemberships: summarizeCountRows(requestMembershipRows),
      shareSignupAttributions: summarizeCountRows(shareSignupAttributionRows),
    },
    writeResult,
  };

  console.log(JSON.stringify(report, null, 2));
} finally {
  await client.close();
}
