import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

const DEFAULT_SAMPLE_LIMIT = 10;

const founderUniverseRoles = [
  "creator",
  "genesis_founder",
  "founder",
  "mentor",
  "producer",
  "partner",
  "legend",
];

const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB_NAME?.trim();
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

const sampleLimit = readPositiveInteger(
  process.env.FANLETTER_FOUNDER_JOIN_READINESS_SAMPLE_LIMIT,
  DEFAULT_SAMPLE_LIMIT,
);
const targetStarIds = parseIdList(
  process.env.FANLETTER_FOUNDER_JOIN_READINESS_STAR_IDS,
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

function incrementMap(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function mapToSortedObject(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => {
    return String(left).localeCompare(String(right));
  }));
}

function getStarDisplayName(star) {
  return star.characterName || star.displayName || star.starId;
}

async function main() {
  const client = new MongoClient(uri);

  try {
    await client.connect();

    const db = client.db(dbName);
    const stars = db.collection(fanletterStarsCollectionName);
    const memberships = db.collection(fanletterStarFounderMembershipsCollectionName);
    const referralCodes = db.collection(fanletterStarReferralCodesCollectionName);
    const referralEdges = db.collection(fanletterStarReferralEdgesCollectionName);
    const influenceLedger = db.collection(fanletterStarInfluenceLedgerCollectionName);
    const starFilter =
      targetStarIds.size > 0
        ? { starId: { $in: [...targetStarIds] } }
        : { status: { $ne: "archived" } };
    const starDocuments = await stars
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
      .toArray();
    const starIds = starDocuments.map((star) => star.starId).filter(Boolean);

    if (starIds.length === 0) {
      console.log(
        JSON.stringify(
          {
            counts: {
              starsScanned: 0,
            },
            liveFlag: {
              founderJoinEnabled: readBoolean(
                process.env.FANLETTER_FOUNDER_CLUB_LIVE_JOIN_ENABLED,
              ),
            },
            notes: ["No target AI Stars were found."],
            targetStarIds: [...targetStarIds],
          },
          null,
          2,
        ),
      );
      return;
    }

    const [
      membershipDocuments,
      referralCodeDocuments,
      referralEdgeCount,
      influenceLedgerCount,
    ] = await Promise.all([
      memberships
        .find(
          {
            starId: { $in: starIds },
          },
          {
            projection: {
              memberEmail: 1,
              role: 1,
              starId: 1,
            },
          },
        )
        .toArray(),
      referralCodes
        .find(
          {
            starId: { $in: starIds },
          },
          {
            projection: {
              code: 1,
              memberEmail: 1,
              starId: 1,
              status: 1,
            },
          },
        )
        .toArray(),
      referralEdges.countDocuments({
        starId: { $in: starIds },
      }),
      influenceLedger.countDocuments({
        starId: { $in: starIds },
      }),
    ]);
    const membershipsByStarId = new Map();
    const activeReferralCodeKeys = new Set();
    const roleCounts = new Map();

    for (const membership of membershipDocuments) {
      const starMemberships = membershipsByStarId.get(membership.starId) ?? [];

      starMemberships.push(membership);
      membershipsByStarId.set(membership.starId, starMemberships);
      incrementMap(roleCounts, membership.role ?? "missing");
    }

    for (const referralCode of referralCodeDocuments) {
      if (referralCode.status !== "active") {
        continue;
      }

      const memberEmail = normalizeEmail(referralCode.memberEmail);

      if (!memberEmail || !referralCode.starId) {
        continue;
      }

      activeReferralCodeKeys.add(`${referralCode.starId}:${memberEmail}`);
    }

    const readyStars = [];
    const blockedStars = [];
    const missingCreatorMembershipStars = [];
    const missingOwnerEmailStars = [];
    const founderMembershipsMissingReferralCodes = [];
    const invalidRoleMemberships = [];

    for (const star of starDocuments) {
      const ownerEmail = normalizeEmail(star.ownerEmail);
      const starMemberships = membershipsByStarId.get(star.starId) ?? [];
      const creatorMembership = starMemberships.find((membership) => {
        return (
          membership.role === "creator" &&
          normalizeEmail(membership.memberEmail) === ownerEmail
        );
      });
      const reasons = [];

      if (!ownerEmail) {
        reasons.push("owner_email_missing");
        missingOwnerEmailStars.push({
          name: getStarDisplayName(star),
          starId: star.starId,
          status: star.status ?? null,
        });
      }

      if (!creatorMembership) {
        reasons.push("creator_membership_missing");
        missingCreatorMembershipStars.push({
          name: getStarDisplayName(star),
          ownerEmail: star.ownerEmail ?? null,
          starId: star.starId,
        });
      }

      for (const membership of starMemberships) {
        const memberEmail = normalizeEmail(membership.memberEmail);

        if (!membership.role || !founderUniverseRoles.includes(membership.role)) {
          invalidRoleMemberships.push({
            memberEmail: membership.memberEmail ?? null,
            role: membership.role ?? null,
            starId: membership.starId,
          });
        }

        if (
          membership.role !== "creator" &&
          memberEmail &&
          !activeReferralCodeKeys.has(`${membership.starId}:${memberEmail}`)
        ) {
          founderMembershipsMissingReferralCodes.push({
            memberEmail: membership.memberEmail,
            role: membership.role,
            starId: membership.starId,
          });
        }
      }

      const summary = {
        founderMembershipCount: starMemberships.filter((membership) => {
          return membership.role !== "creator";
        }).length,
        name: getStarDisplayName(star),
        ownerEmail: star.ownerEmail ?? null,
        reasons,
        starId: star.starId,
        status: star.status ?? null,
      };

      if (reasons.length === 0) {
        readyStars.push(summary);
      } else {
        blockedStars.push(summary);
      }
    }

    const liveJoinEnabled = readBoolean(
      process.env.FANLETTER_FOUNDER_CLUB_LIVE_JOIN_ENABLED,
    );
    const report = {
      collectionNames: {
        fanletterStarFounderMemberships:
          fanletterStarFounderMembershipsCollectionName,
        fanletterStarInfluenceLedger: fanletterStarInfluenceLedgerCollectionName,
        fanletterStarReferralCodes: fanletterStarReferralCodesCollectionName,
        fanletterStarReferralEdges: fanletterStarReferralEdgesCollectionName,
        fanletterStars: fanletterStarsCollectionName,
      },
      counts: {
        activeReferralCodes: referralCodeDocuments.filter((referralCode) => {
          return referralCode.status === "active";
        }).length,
        blockedStars: blockedStars.length,
        founderMembershipsMissingReferralCodes:
          founderMembershipsMissingReferralCodes.length,
        influenceLedgerEntries: influenceLedgerCount,
        invalidRoleMemberships: invalidRoleMemberships.length,
        missingCreatorMembershipStars: missingCreatorMembershipStars.length,
        missingOwnerEmailStars: missingOwnerEmailStars.length,
        readyStars: readyStars.length,
        referralEdges: referralEdgeCount,
        roleCounts: mapToSortedObject(roleCounts),
        starsScanned: starDocuments.length,
        totalMemberships: membershipDocuments.length,
      },
      liveFlag: {
        founderJoinEnabled: liveJoinEnabled,
        requiredEnv: "FANLETTER_FOUNDER_CLUB_LIVE_JOIN_ENABLED=1",
        responseMode: liveJoinEnabled ? "live" : "preview",
      },
      notes: [
        "This audit is read-only and does not create or update memberships, referral edges, referral codes, or ledger entries.",
        "Live Founder join can create membership, referral edge, inviter reward ledger, and a star-scoped referral code when the live flag is enabled.",
        "Stars are ready when they have an ownerEmail and a matching creator membership.",
        "Founder memberships without active referral codes can still join, but sharing is weaker until getOrCreate referral code runs for that member.",
      ],
      recommendedNextActions: [
        liveJoinEnabled
          ? "Run a controlled live join with a non-owner test account and verify membership, edge, referral code, and ledger documents."
          : "Enable FANLETTER_FOUNDER_CLUB_LIVE_JOIN_ENABLED=1 only after selecting a controlled test AI Star and account.",
        missingCreatorMembershipStars.length > 0
          ? "Backfill missing creator memberships before broad live rollout."
          : "Creator memberships are ready for scanned stars.",
        founderMembershipsMissingReferralCodes.length > 0
          ? "Warm referral codes for existing Founder memberships or let them be created on first share."
          : "Existing Founder referral codes are ready for scanned memberships.",
      ],
      samples: {
        blockedStars: blockedStars.slice(0, sampleLimit),
        founderMembershipsMissingReferralCodes:
          founderMembershipsMissingReferralCodes.slice(0, sampleLimit),
        invalidRoleMemberships: invalidRoleMemberships.slice(0, sampleLimit),
        missingCreatorMembershipStars:
          missingCreatorMembershipStars.slice(0, sampleLimit),
        missingOwnerEmailStars: missingOwnerEmailStars.slice(0, sampleLimit),
        readyStars: readyStars.slice(0, sampleLimit),
      },
      targetStarIds: [...targetStarIds],
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.close();
  }
}

await main();
