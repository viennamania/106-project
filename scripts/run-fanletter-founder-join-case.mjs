import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

const SCOUT_SIGNUP_CP_REWARD = 100;
const SCOUT_SIGNUP_CREATOR_PROGRESS_REWARD = 2;
const SCOUT_SIGNUP_INFLUENCE_REWARD = 5;
const FOUNDER_UNIVERSE_MAX_DEPTH = 6;

const founderUniverseTiers = [
  { depth: 0, role: "creator" },
  { depth: 1, role: "genesis_founder" },
  { depth: 2, role: "founder" },
  { depth: 3, role: "mentor" },
  { depth: 4, role: "producer" },
  { depth: 5, role: "partner" },
  { depth: 6, role: "legend" },
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
const fanletterStarInfluenceLedgerCollectionName =
  process.env.MONGODB_FANLETTER_STAR_INFLUENCE_LEDGER_COLLECTION?.trim() ??
  "fanletterStarInfluenceLedger";

const execute = readBoolean(process.env.FANLETTER_FOUNDER_JOIN_CASE_EXECUTE);
const requestedStarId = normalizeId(
  process.env.FANLETTER_FOUNDER_JOIN_CASE_STAR_ID,
);
const requestedMemberEmail = normalizeEmail(
  process.env.FANLETTER_FOUNDER_JOIN_CASE_MEMBER_EMAIL,
);
const requestedReferralCode = normalizeReferralCode(
  process.env.FANLETTER_FOUNDER_JOIN_CASE_REFERRAL_CODE,
);

function readBoolean(value) {
  return ["1", "true", "yes", "on"].includes(
    String(value ?? "").trim().toLowerCase(),
  );
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

function getTier(depth) {
  return founderUniverseTiers.find((tier) => tier.depth === depth) ?? null;
}

function getRoleForDepth(depth) {
  const normalizedDepth = Math.max(
    1,
    Math.min(depth, FOUNDER_UNIVERSE_MAX_DEPTH),
  );

  return getTier(normalizedDepth)?.role ?? "legend";
}

function getNextRole(parentRole) {
  if (!parentRole) {
    return getRoleForDepth(2);
  }

  const parentTier = founderUniverseTiers.find((tier) => {
    return tier.role === parentRole;
  });

  if (!parentTier) {
    return getRoleForDepth(2);
  }

  return getRoleForDepth(parentTier.depth + 1);
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

function buildReferralRewardLedgerSourceId({
  sourceMemberEmail,
  starId,
  targetMemberEmail,
}) {
  return `star-referral-reward:${starId}:${sourceMemberEmail}:${targetMemberEmail}`;
}

function buildEdgeId({ starId, targetMemberEmail }) {
  return `star-referral:${starId}:${targetMemberEmail}`;
}

function isDuplicateKeyError(error) {
  return Boolean(error && typeof error === "object" && error.code === 11000);
}

function printReport(report) {
  console.log(JSON.stringify(report, null, 2));
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function buildExecuteCommand() {
  const parts = [
    `FANLETTER_FOUNDER_JOIN_CASE_STAR_ID=${shellQuote(requestedStarId)}`,
    `FANLETTER_FOUNDER_JOIN_CASE_MEMBER_EMAIL=${shellQuote(
      requestedMemberEmail,
    )}`,
  ];

  if (requestedReferralCode) {
    parts.push(
      `FANLETTER_FOUNDER_JOIN_CASE_REFERRAL_CODE=${shellQuote(
        requestedReferralCode,
      )}`,
    );
  }

  parts.push("FANLETTER_FOUNDER_JOIN_CASE_EXECUTE=1");
  parts.push("pnpm fanletter:founder-join:case:run");

  return parts.join(" ");
}

function buildMissingInputReport(missingInputs) {
  return {
    execute,
    inputs: {
      memberEmail: requestedMemberEmail || null,
      referralCode: requestedReferralCode,
      starId: requestedStarId || null,
    },
    missingInputs,
    notes: [
      "This script never auto-selects a production join case.",
      "Set FANLETTER_FOUNDER_JOIN_CASE_STAR_ID and FANLETTER_FOUNDER_JOIN_CASE_MEMBER_EMAIL before running it.",
      "Add FANLETTER_FOUNDER_JOIN_CASE_REFERRAL_CODE to test a referred join; omit it for a direct Genesis Founder join.",
      "Writes are disabled unless FANLETTER_FOUNDER_JOIN_CASE_EXECUTE=1 is also set.",
    ],
    status: "blocked",
  };
}

function getRequiredInputBlockers() {
  const missingInputs = [];

  if (!requestedStarId) {
    missingInputs.push("FANLETTER_FOUNDER_JOIN_CASE_STAR_ID");
  }

  if (!requestedMemberEmail) {
    missingInputs.push("FANLETTER_FOUNDER_JOIN_CASE_MEMBER_EMAIL");
  }

  return missingInputs;
}

async function resolveReferralAttribution({ referralCodes, referralCode }) {
  if (!referralCode) {
    return null;
  }

  return referralCodes.findOne(
    {
      code: referralCode,
      status: "active",
    },
    {
      sort: {
        lastUsedAt: -1,
        updatedAt: -1,
      },
    },
  );
}

async function allocateReferralCode({
  member,
  referralCodes,
  star,
}) {
  const existingReferralCode = await referralCodes.findOne(
    {
      memberEmail: normalizeEmail(member.email),
      starId: star.starId,
      status: "active",
    },
    {
      projection: {
        code: 1,
      },
    },
  );

  if (existingReferralCode?.code) {
    return {
      code: existingReferralCode.code,
      existing: true,
    };
  }

  const memberEmail = normalizeEmail(member.email);
  const memberReferralCode = normalizeReferralCode(member.referralCode);

  for (let attempt = 1; attempt <= 12; attempt += 1) {
    const code = buildStarReferralCodeCandidate({
      attempt,
      memberEmail,
      memberReferralCode,
      star,
    });
    const activeCodeWithSameValue = await referralCodes.findOne({
      code,
      status: "active",
    });

    if (activeCodeWithSameValue) {
      continue;
    }

    return {
      code,
      existing: false,
    };
  }

  return {
    code: null,
    existing: false,
  };
}

async function getCaseState({ collections }) {
  const {
    influenceLedger,
    members,
    memberships,
    referralCodes,
    referralEdges,
    stars,
  } = collections;
  const [member, star, referralCodeDocument] = await Promise.all([
    members.findOne(
      {
        email: requestedMemberEmail,
        status: "completed",
      },
      {
        projection: {
          email: 1,
          referralCode: 1,
          registrationCompletedAt: 1,
          status: 1,
        },
      },
    ),
    stars.findOne(
      {
        starId: requestedStarId,
        status: { $ne: "archived" },
      },
      {
        projection: {
          characterName: 1,
          displayName: 1,
          founderCount: 1,
          openSlotCount: 1,
          ownerEmail: 1,
          starId: 1,
          status: 1,
        },
      },
    ),
    resolveReferralAttribution({
      referralCode: requestedReferralCode,
      referralCodes,
    }),
  ]);
  const starId = star?.starId ?? requestedStarId;
  const memberEmail = normalizeEmail(member?.email ?? requestedMemberEmail);
  const referralOwnerEmail = normalizeEmail(referralCodeDocument?.memberEmail);
  const [
    existingTargetMembership,
    sourceMembership,
    existingReferralEdge,
    existingRewardLedger,
    targetReferralCode,
  ] = await Promise.all([
    memberships.findOne(
      {
        memberEmail,
        starId,
      },
      {
        projection: {
          joinedAt: 1,
          joinedViaCode: 1,
          role: 1,
        },
      },
    ),
    referralOwnerEmail
      ? memberships.findOne(
          {
            memberEmail: referralOwnerEmail,
            starId,
          },
          {
            projection: {
              cpBalance: 1,
              creatorProgressPercent: 1,
              influenceScore: 1,
              role: 1,
            },
          },
        )
      : Promise.resolve(null),
    referralOwnerEmail
      ? referralEdges.findOne(
          {
            edgeId: buildEdgeId({
              starId,
              targetMemberEmail: memberEmail,
            }),
          },
          {
            projection: {
              edgeId: 1,
            },
          },
        )
      : Promise.resolve(null),
    referralOwnerEmail
      ? influenceLedger.findOne(
          {
            sourceId: buildReferralRewardLedgerSourceId({
              sourceMemberEmail: referralOwnerEmail,
              starId,
              targetMemberEmail: memberEmail,
            }),
          },
          {
            projection: {
              cpDelta: 1,
              creatorProgressDelta: 1,
              influenceDelta: 1,
              sourceId: 1,
            },
          },
        )
      : Promise.resolve(null),
    referralCodes.findOne(
      {
        memberEmail,
        starId,
        status: "active",
      },
      {
        projection: {
          code: 1,
        },
      },
    ),
  ]);
  const blockers = [];
  const warnings = [];

  if (!member) {
    blockers.push("target_completed_member_not_found");
  }

  if (!star) {
    blockers.push("active_star_not_found");
  }

  if (requestedReferralCode && !referralCodeDocument) {
    blockers.push("referral_code_not_found");
  }

  if (referralCodeDocument && referralCodeDocument.starId !== starId) {
    blockers.push("referral_code_star_mismatch");
  }

  if (referralCodeDocument && referralOwnerEmail === memberEmail) {
    blockers.push("self_referral");
  }

  if (referralCodeDocument && !sourceMembership) {
    warnings.push("referral_owner_membership_missing");
  }

  if (existingTargetMembership) {
    warnings.push("target_membership_already_exists");
  }

  const allocatedReferralCode =
    member && star
      ? await allocateReferralCode({
          member,
          referralCodes,
          star,
        })
      : {
          code: null,
          existing: false,
        };
  const expectedRole = existingTargetMembership
    ? existingTargetMembership.role
    : referralCodeDocument
      ? getNextRole(sourceMembership?.role)
      : "genesis_founder";
  const joinState = existingTargetMembership ? "existing" : "created";
  const shouldCreateReferralReward =
    Boolean(referralCodeDocument) &&
    !existingTargetMembership &&
    !existingReferralEdge &&
    !existingRewardLedger;

  return {
    allocatedReferralCode,
    blockers,
    expectedRole,
    existingReferralEdge,
    existingRewardLedger,
    existingTargetMembership,
    joinState,
    member,
    memberEmail,
    referralCodeDocument,
    referralOwnerEmail,
    shouldCreateReferralReward,
    sourceMembership,
    star,
    starId,
    targetReferralCode,
    warnings,
  };
}

async function createTargetReferralCode({
  code,
  collections,
  member,
  starId,
}) {
  if (!code) {
    return {
      created: false,
      reason: "code_unavailable",
    };
  }

  const memberEmail = normalizeEmail(member.email);
  const memberReferralCode = normalizeReferralCode(member.referralCode);
  const now = new Date();

  for (let attempt = 1; attempt <= 12; attempt += 1) {
    try {
      const result = await collections.referralCodes.updateOne(
        {
          memberEmail,
          starId,
        },
        {
          $setOnInsert: {
            code,
            createdAt: now,
            disabledAt: null,
            lastUsedAt: null,
            memberEmail,
            memberReferralCode,
            source: "member_signup",
            starId,
            status: "active",
            updatedAt: now,
          },
        },
        { upsert: true },
      );

      return {
        created: result.upsertedCount > 0,
      };
    } catch (error) {
      if (!isDuplicateKeyError(error) || attempt >= 12) {
        throw error;
      }

      code = buildStarReferralCodeCandidate({
        attempt: attempt + 1,
        memberEmail,
        memberReferralCode,
        star: {
          starId,
        },
      });
    }
  }

  return {
    created: false,
    reason: "code_collision",
  };
}

async function executeJoin({ caseState, collections }) {
  const {
    allocatedReferralCode,
    expectedRole,
    existingTargetMembership,
    member,
    memberEmail,
    referralCodeDocument,
    referralOwnerEmail,
    sourceMembership,
    starId,
  } = caseState;
  const now = new Date();
  const joinedAt = member.registrationCompletedAt ?? now;
  const targetMemberReferralCode = normalizeReferralCode(member.referralCode);
  const operations = [];
  let createdTargetMembership = false;

  if (existingTargetMembership) {
    operations.push({
      created: false,
      name: "target_membership",
      skipped: "already_exists",
    });
  } else {
    const targetMembershipResult = await collections.memberships.updateOne(
      {
        memberEmail,
        starId,
      },
      {
        $set: {
          memberReferralCode: targetMemberReferralCode,
          updatedAt: now,
        },
        $setOnInsert: {
          cpBalance: 0,
          createdAt: joinedAt,
          creatorProgressPercent: 0,
          influenceScore: 0,
          joinedAt,
          joinedViaCode: referralCodeDocument?.code ?? null,
          joinedViaMemberEmail: referralOwnerEmail || null,
          joinedViaMemberReferralCode:
            referralCodeDocument?.memberReferralCode ?? null,
          joinedViaShareId: null,
          role: expectedRole,
          source: "member_signup",
        },
      },
      { upsert: true },
    );

    createdTargetMembership = targetMembershipResult.upsertedCount > 0;

    operations.push({
      created: createdTargetMembership,
      name: "target_membership",
    });
  }

  if (referralCodeDocument && createdTargetMembership) {
    const referralCodeUpdate = await collections.referralCodes.updateOne(
      {
        code: referralCodeDocument.code,
        starId: referralCodeDocument.starId,
      },
      {
        $set: {
          lastUsedAt: now,
          updatedAt: now,
        },
      },
    );

    operations.push({
      matchedCount: referralCodeUpdate.matchedCount,
      modifiedCount: referralCodeUpdate.modifiedCount,
      name: "source_referral_code_last_used",
    });
  }

  if (createdTargetMembership) {
    const starCounterUpdate = await collections.stars.updateOne(
      {
        starId,
      },
      [
        {
          $set: {
            founderCount: { $add: ["$founderCount", 1] },
            openSlotCount: {
              $max: [0, { $subtract: ["$openSlotCount", 1] }],
            },
            updatedAt: now,
          },
        },
      ],
    );

    operations.push({
      matchedCount: starCounterUpdate.matchedCount,
      modifiedCount: starCounterUpdate.modifiedCount,
      name: "star_founder_counters",
    });
  }

  let edgeCreated = false;
  let ledgerCreated = false;

  if (referralCodeDocument && createdTargetMembership) {
    const edgeId = buildEdgeId({
      starId: referralCodeDocument.starId,
      targetMemberEmail: memberEmail,
    });
    const edgeResult = await collections.referralEdges.updateOne(
      {
        edgeId,
      },
      {
        $setOnInsert: {
          createdAt: joinedAt,
          edgeId,
          referralCode: referralCodeDocument.code,
          shareId: null,
          source: "member_signup",
          sourceMemberEmail: referralOwnerEmail,
          sourceMemberReferralCode: referralCodeDocument.memberReferralCode,
          starId: referralCodeDocument.starId,
          targetMemberEmail: memberEmail,
          targetMemberReferralCode,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
    const ledgerSourceId = buildReferralRewardLedgerSourceId({
      sourceMemberEmail: referralOwnerEmail,
      starId: referralCodeDocument.starId,
      targetMemberEmail: memberEmail,
    });
    const ledgerResult = await collections.influenceLedger.updateOne(
      {
        sourceId: ledgerSourceId,
      },
      {
        $setOnInsert: {
          cpDelta: SCOUT_SIGNUP_CP_REWARD,
          createdAt: now,
          creatorProgressDelta: SCOUT_SIGNUP_CREATOR_PROGRESS_REWARD,
          influenceDelta: SCOUT_SIGNUP_INFLUENCE_REWARD,
          memo: "AI Star referral signup reward",
          recipientMemberEmail: referralOwnerEmail,
          source: "member_signup",
          sourceId: ledgerSourceId,
          sourceMemberEmail: referralOwnerEmail,
          starId: referralCodeDocument.starId,
          targetMemberEmail: memberEmail,
        },
      },
      { upsert: true },
    );

    edgeCreated = edgeResult.upsertedCount > 0;
    ledgerCreated = ledgerResult.upsertedCount > 0;
    operations.push({
      created: edgeCreated,
      edgeId,
      name: "referral_edge",
    });
    operations.push({
      created: ledgerCreated,
      name: "referral_reward_ledger",
      sourceId: ledgerSourceId,
    });

    if (edgeCreated && ledgerCreated) {
      const sourceRewardUpdate = await collections.memberships.updateOne(
        {
          memberEmail: referralOwnerEmail,
          starId: referralCodeDocument.starId,
        },
        {
          $inc: {
            cpBalance: SCOUT_SIGNUP_CP_REWARD,
            creatorProgressPercent: SCOUT_SIGNUP_CREATOR_PROGRESS_REWARD,
            influenceScore: SCOUT_SIGNUP_INFLUENCE_REWARD,
          },
          $set: {
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
            joinedAt: now,
            joinedViaCode: null,
            joinedViaMemberEmail: null,
            joinedViaMemberReferralCode: null,
            joinedViaShareId: null,
            memberReferralCode: referralCodeDocument.memberReferralCode,
            role: sourceMembership?.role ?? "founder",
            source: "member_signup",
          },
        },
        { upsert: true },
      );

      await collections.memberships.updateOne(
        {
          memberEmail: referralOwnerEmail,
          starId: referralCodeDocument.starId,
        },
        {
          $min: {
            creatorProgressPercent: 100,
          },
        },
      );

      operations.push({
        matchedCount: sourceRewardUpdate.matchedCount,
        modifiedCount: sourceRewardUpdate.modifiedCount,
        name: "source_member_rewards",
        upsertedCount: sourceRewardUpdate.upsertedCount,
      });
    }
  }

  const referralCodeCreation = await createTargetReferralCode({
    code: allocatedReferralCode.code,
    collections,
    member,
    starId,
  });

  operations.push({
    code: allocatedReferralCode.code,
    created: referralCodeCreation.created,
    existingBeforeRun: allocatedReferralCode.existing,
    name: "target_referral_code",
    reason: referralCodeCreation.reason ?? null,
  });

  if (createdTargetMembership) {
    await collections.members.updateOne(
      {
        email: memberEmail,
      },
      referralCodeDocument
        ? {
            $set: {
              fanletterStarReferralAppliedAt: now,
              fanletterStarReferralCode: referralCodeDocument.code,
              fanletterStarReferralSourceMemberEmail: referralOwnerEmail,
              fanletterStarReferralSourceMemberReferralCode:
                referralCodeDocument.memberReferralCode,
              fanletterStarReferralStarId: referralCodeDocument.starId,
              updatedAt: now,
            },
          }
        : {
            $set: {
              fanletterStarReferralAppliedAt: now,
              fanletterStarReferralCode: null,
              fanletterStarReferralSourceMemberEmail: null,
              fanletterStarReferralSourceMemberReferralCode: null,
              fanletterStarReferralStarId: starId,
              updatedAt: now,
            },
          },
    );
  }

  operations.push({
    name: "member_founder_attribution",
    updated: createdTargetMembership,
  });

  return {
    createdTargetMembership,
    edgeCreated,
    ledgerCreated,
    operations,
  };
}

function buildBaseReport(caseState) {
  const {
    allocatedReferralCode,
    blockers,
    expectedRole,
    existingReferralEdge,
    existingRewardLedger,
    existingTargetMembership,
    joinState,
    member,
    referralCodeDocument,
    sourceMembership,
    star,
    targetReferralCode,
    warnings,
  } = caseState;

  return {
    execute,
    inputs: {
      memberEmail: requestedMemberEmail || null,
      referralCode: requestedReferralCode,
      starId: requestedStarId || null,
    },
    plan: {
      joinState,
      rewards:
        referralCodeDocument && !existingTargetMembership
          ? {
              cp: SCOUT_SIGNUP_CP_REWARD,
              creatorProgressPercent: SCOUT_SIGNUP_CREATOR_PROGRESS_REWARD,
              influenceScore: SCOUT_SIGNUP_INFLUENCE_REWARD,
              recipientMemberEmail: referralCodeDocument.memberEmail,
            }
          : {
              cp: 0,
              creatorProgressPercent: 0,
              influenceScore: 0,
              recipientMemberEmail: null,
            },
      role: expectedRole,
      targetReferralCode:
        targetReferralCode?.code ?? allocatedReferralCode.code ?? null,
      wouldCreate: {
        memberAttribution: true,
        referralCode: !targetReferralCode && Boolean(allocatedReferralCode.code),
        referralEdge:
          Boolean(referralCodeDocument) &&
          !existingTargetMembership &&
          !existingReferralEdge,
        rewardLedger:
          Boolean(referralCodeDocument) &&
          !existingTargetMembership &&
          !existingRewardLedger,
        sourceReward:
          Boolean(referralCodeDocument) &&
          !existingTargetMembership &&
          !existingReferralEdge &&
          !existingRewardLedger,
        starFounderCounters: !existingTargetMembership,
        targetMembership: !existingTargetMembership,
      },
    },
    resolved: {
      member: member
        ? {
            email: member.email,
            referralCode: normalizeReferralCode(member.referralCode),
            status: member.status,
          }
        : null,
      referralCode: referralCodeDocument
        ? {
            code: referralCodeDocument.code,
            memberEmail: referralCodeDocument.memberEmail,
            memberReferralCode: referralCodeDocument.memberReferralCode ?? null,
            starId: referralCodeDocument.starId,
          }
        : null,
      sourceMembership: sourceMembership
        ? {
            memberEmail: referralCodeDocument?.memberEmail ?? null,
            role: sourceMembership.role,
          }
        : null,
      star: star
        ? {
            founderCount: star.founderCount ?? null,
            name: star.characterName || star.displayName || star.starId,
            openSlotCount: star.openSlotCount ?? null,
            ownerEmail: star.ownerEmail ?? null,
            starId: star.starId,
            status: star.status,
          }
        : null,
    },
    safeguards: {
      noPayment: true,
      writesEnabled: execute,
    },
    status: blockers.length > 0 ? "blocked" : execute ? "ready" : "dry-run",
    warnings,
  };
}

async function main() {
  const missingInputs = getRequiredInputBlockers();

  if (missingInputs.length > 0) {
    printReport(buildMissingInputReport(missingInputs));
    return;
  }

  if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (!dbName) {
    throw new Error("MONGODB_DB_NAME is not configured.");
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();

    const db = client.db(dbName);
    const collections = {
      influenceLedger: db.collection(fanletterStarInfluenceLedgerCollectionName),
      members: db.collection(membersCollectionName),
      memberships: db.collection(fanletterStarFounderMembershipsCollectionName),
      referralCodes: db.collection(fanletterStarReferralCodesCollectionName),
      referralEdges: db.collection(fanletterStarReferralEdgesCollectionName),
      stars: db.collection(fanletterStarsCollectionName),
    };
    const caseState = await getCaseState({
      collections,
    });
    const baseReport = buildBaseReport(caseState);

    if (caseState.blockers.length > 0) {
      printReport({
        ...baseReport,
        blockers: caseState.blockers,
      });
      return;
    }

    if (!execute) {
      printReport({
        ...baseReport,
        blockers: [],
        nextExecuteCommand: buildExecuteCommand(),
      });
      return;
    }

    const execution = await executeJoin({
      caseState,
      collections,
    });

    printReport({
      ...baseReport,
      blockers: [],
      execution,
      status: "executed",
    });
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
