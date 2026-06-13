import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

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

const requestedStarId = normalizeId(
  process.env.FANLETTER_FOUNDER_JOIN_CASE_STAR_ID,
);
const requestedMemberEmail = normalizeEmail(
  process.env.FANLETTER_FOUNDER_JOIN_CASE_MEMBER_EMAIL,
);
const requestedReferralCode = normalizeReferralCode(
  process.env.FANLETTER_FOUNDER_JOIN_CASE_REFERRAL_CODE,
);

if (!uri) {
  throw new Error("MONGODB_URI is not configured.");
}

if (!dbName) {
  throw new Error("MONGODB_DB_NAME is not configured.");
}

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

function getStarDisplayName(star) {
  return star?.characterName || star?.displayName || star?.starId || null;
}

function buildReferralRewardLedgerSourceId({
  sourceMemberEmail,
  starId,
  targetMemberEmail,
}) {
  return `star-referral-reward:${starId}:${sourceMemberEmail}:${targetMemberEmail}`;
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

async function findAutomaticCase({
  members,
  memberships,
  referralCodes,
  stars,
}) {
  const starFilter = requestedStarId
    ? { starId: requestedStarId, status: { $ne: "archived" } }
    : { ownerEmail: { $type: "string" }, status: "active" };
  const candidateStars = await stars
    .find(starFilter, {
      projection: {
        characterName: 1,
        displayName: 1,
        ownerEmail: 1,
        starId: 1,
        status: 1,
      },
    })
    .sort({ updatedAt: -1 })
    .limit(40)
    .toArray();

  for (const star of candidateStars) {
    const referralCodeDocument = requestedReferralCode
      ? await resolveReferralAttribution({
          referralCode: requestedReferralCode,
          referralCodes,
        })
      : await referralCodes.findOne(
          {
            starId: star.starId,
            status: "active",
          },
          {
            sort: {
              updatedAt: -1,
            },
          },
        );

    if (requestedReferralCode && referralCodeDocument?.starId !== star.starId) {
      continue;
    }

    const existingMembershipEmails = await memberships.distinct("memberEmail", {
      starId: star.starId,
    });
    const excludedEmails = [
      ...existingMembershipEmails.map(normalizeEmail),
      normalizeEmail(star.ownerEmail),
      normalizeEmail(referralCodeDocument?.memberEmail),
    ].filter(Boolean);
    const memberFilter = requestedMemberEmail
      ? {
          email: requestedMemberEmail,
          status: "completed",
        }
      : {
          email: { $nin: excludedEmails },
          status: "completed",
        };
    const member = await members.findOne(
      memberFilter,
      {
        projection: {
          email: 1,
          referralCode: 1,
          status: 1,
        },
        sort: {
          registrationCompletedAt: -1,
          updatedAt: -1,
        },
      },
    );

    if (!member) {
      continue;
    }

    return {
      member,
      referralCodeDocument,
      source: requestedStarId || requestedMemberEmail || requestedReferralCode
        ? "requested_inputs"
        : "automatic_candidate",
      star,
    };
  }

  return null;
}

async function main() {
  const client = new MongoClient(uri);

  try {
    await client.connect();

    const db = client.db(dbName);
    const members = db.collection(membersCollectionName);
    const stars = db.collection(fanletterStarsCollectionName);
    const memberships = db.collection(fanletterStarFounderMembershipsCollectionName);
    const referralCodes = db.collection(fanletterStarReferralCodesCollectionName);
    const referralEdges = db.collection(fanletterStarReferralEdgesCollectionName);
    const influenceLedger = db.collection(fanletterStarInfluenceLedgerCollectionName);
    const selectedCase = await findAutomaticCase({
      members,
      memberships,
      referralCodes,
      stars,
    });

    if (!selectedCase) {
      console.log(
        JSON.stringify(
          {
            inputs: {
              memberEmail: requestedMemberEmail || null,
              referralCode: requestedReferralCode,
              starId: requestedStarId || null,
            },
            notes: [
              "No safe Founder join case was found with the provided filters.",
              "Set FANLETTER_FOUNDER_JOIN_CASE_STAR_ID, FANLETTER_FOUNDER_JOIN_CASE_MEMBER_EMAIL, and optionally FANLETTER_FOUNDER_JOIN_CASE_REFERRAL_CODE for a focused audit.",
            ],
            status: "blocked",
          },
          null,
          2,
        ),
      );
      return;
    }

    const { member, referralCodeDocument, source, star } = selectedCase;
    const memberEmail = normalizeEmail(member.email);
    const starId = star.starId;
    const ownerEmail = normalizeEmail(star.ownerEmail);
    const referralOwnerEmail = normalizeEmail(referralCodeDocument?.memberEmail);
    const [
      existingTargetMembership,
      sourceMembership,
      existingTargetReferralCode,
      existingReferralEdge,
      existingRewardLedger,
    ] = await Promise.all([
      memberships.findOne(
        {
          memberEmail,
          starId,
        },
        {
          projection: {
            joinedAt: 1,
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
                role: 1,
              },
            },
          )
        : Promise.resolve(null),
      memberships.findOne({ memberEmail, starId }).then((membership) => {
        if (!membership) {
          return referralCodes.findOne(
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
          );
        }

        return referralCodes.findOne(
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
        );
      }),
      referralOwnerEmail
        ? referralEdges.findOne(
            {
              sourceMemberEmail: referralOwnerEmail,
              starId,
              targetMemberEmail: memberEmail,
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
    ]);
    const blockers = [];
    const warnings = [];

    if (!starId || star.status === "archived") {
      blockers.push("star_not_active");
    }

    if (!ownerEmail) {
      blockers.push("star_owner_missing");
    }

    if (member.status !== "completed") {
      blockers.push("target_member_not_completed");
    }

    if (referralCodeDocument && referralCodeDocument.starId !== starId) {
      blockers.push("referral_code_star_mismatch");
    }

    if (referralCodeDocument && referralOwnerEmail === memberEmail) {
      blockers.push("self_referral");
    }

    if (requestedReferralCode && !referralCodeDocument) {
      blockers.push("referral_code_not_found");
    }

    if (!referralCodeDocument) {
      warnings.push("direct_join_without_referral_code");
    }

    if (existingTargetMembership) {
      warnings.push("target_membership_already_exists");
    }

    if (referralCodeDocument && !sourceMembership) {
      warnings.push("referral_owner_membership_missing");
    }

    const expectedRole = existingTargetMembership
      ? existingTargetMembership.role
      : referralCodeDocument
        ? getNextRole(sourceMembership?.role)
        : "genesis_founder";
    const joinState = existingTargetMembership ? "existing" : "created";
    const liveJoinEnabled = readBoolean(
      process.env.FANLETTER_FOUNDER_CLUB_LIVE_JOIN_ENABLED,
    );
    const report = {
      caseSource: source,
      expectedMutation: {
        influenceLedger:
          referralCodeDocument && !existingTargetMembership
            ? {
                existsAlready: Boolean(existingRewardLedger),
                sourceId: buildReferralRewardLedgerSourceId({
                  sourceMemberEmail: referralOwnerEmail,
                  starId,
                  targetMemberEmail: memberEmail,
                }),
                willCreateIfMissing: !existingRewardLedger,
              }
            : null,
        referralEdge:
          referralCodeDocument && !existingTargetMembership
            ? {
                existsAlready: Boolean(existingReferralEdge),
                sourceMemberEmail: referralOwnerEmail,
                targetMemberEmail: memberEmail,
                willCreateIfMissing: !existingReferralEdge,
              }
            : null,
        targetMembership: {
          expectedRole,
          joinState,
          starId,
          targetMemberEmail: memberEmail,
          willCreate: !existingTargetMembership,
        },
        targetReferralCode: {
          code: existingTargetReferralCode?.code ?? null,
          existsAlready: Boolean(existingTargetReferralCode),
          willCreateAfterJoin: !existingTargetReferralCode,
        },
      },
      inputs: {
        memberEmail: requestedMemberEmail || null,
        referralCode: requestedReferralCode,
        starId: requestedStarId || null,
      },
      liveFlag: {
        founderJoinEnabled: liveJoinEnabled,
        requiredEnv: "FANLETTER_FOUNDER_CLUB_LIVE_JOIN_ENABLED=1",
        responseMode: liveJoinEnabled ? "live" : "preview",
      },
      notes: [
        "This audit is read-only and does not create memberships, edges, referral codes, or ledger entries.",
        "Use this before enabling live Founder join for a controlled test account.",
        "A live join with a referral creates target membership, referral edge, inviter reward ledger, and target referral code if missing.",
      ],
      selectedCase: {
        memberEmail,
        referralCode: referralCodeDocument?.code ?? null,
        referralOwnerEmail: referralOwnerEmail || null,
        referralOwnerRole: sourceMembership?.role ?? null,
        starId,
        starName: getStarDisplayName(star),
        starOwnerEmail: ownerEmail || null,
      },
      status: blockers.length === 0 ? "ready" : "blocked",
      validation: {
        blockers,
        warnings,
      },
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.close();
  }
}

await main();
