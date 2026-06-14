import { readFile } from "node:fs/promises";

import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

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

const outputJson =
  process.argv.includes("--json") ||
  ["1", "true", "yes"].includes(
    String(process.env.FANLETTER_AGENTRANK_BACKFILL_PLAN_JSON ?? "")
      .trim()
      .toLowerCase(),
  );

if (!uri) {
  throw new Error("MONGODB_URI is not configured.");
}

if (!dbName) {
  throw new Error("MONGODB_DB_NAME is not configured.");
}

function percent(value, total) {
  if (total <= 0) {
    return 100;
  }

  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function readCount(row) {
  return row[0]?.count ?? 0;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

async function readPackageScripts() {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );

  return packageJson.scripts ?? {};
}

function getPackageScriptName(command) {
  const match = command?.trim().match(/^pnpm\s+([^\s]+)/);

  return match?.[1] ?? null;
}

function resolveScriptStatus(command, packageScripts) {
  const scriptName = getPackageScriptName(command);

  if (!scriptName) {
    return "manual";
  }

  return packageScripts[scriptName] ? "available" : "missing";
}

function buildGaps({
  influenceLedgerRows,
  legacyReferralMembers,
  membersMissingFounderUniverse,
  membersMissingStarterStar,
  referralEdges,
  starsMissingCreatorMembership,
  starsMissingOwner,
  starsMissingPortrait,
  totalMemberships,
}) {
  const gaps = [];

  if (membersMissingFounderUniverse > 0) {
    gaps.push("missing:member_founder_universe");
  }

  if (membersMissingStarterStar > 0) {
    gaps.push("missing:member_starter_star");
  }

  if (starsMissingCreatorMembership > 0) {
    gaps.push("missing:star_creator_membership");
  }

  if (starsMissingOwner > 0) {
    gaps.push("missing:star_owner");
  }

  if (starsMissingPortrait > 0) {
    gaps.push("missing:star_portrait");
  }

  if (legacyReferralMembers > referralEdges) {
    gaps.push("missing:legacy_referral_edges");
  }

  if (totalMemberships > 0 && influenceLedgerRows === 0) {
    gaps.push("missing:cp_influence_ledger");
  }

  return gaps;
}

function buildActionPlan({ gaps, packageScripts, totals }) {
  const plans = {
    "missing:member_founder_universe": {
      description:
        "Attach completed members to an AI Star Founder Universe using referral context, existing memberships, or a platform starter universe fallback.",
      estimatedRecords: totals.membersMissingFounderUniverse,
      eventTypes: ["founder_joined", "source_universe_selected"],
      gap: "missing:member_founder_universe",
      id: "backfill-member-founder-universe",
      priority: 1,
      runMode: "script_ready",
      safetyLevel: "write_gated",
      script: "pnpm fanletter:founder-universe:backfill",
      targetCoverage: "memberFounderUniverseCoveragePercent",
      title: "Member Founder Universe placement",
      writeCommand:
        "FANLETTER_FOUNDER_UNIVERSE_BACKFILL_WRITE=1 pnpm fanletter:founder-universe:backfill",
    },
    "missing:member_starter_star": {
      description:
        "Derive each completed member's starter AI Star from referral joins, first founder membership, creator-owned star, or fallback starter star.",
      estimatedRecords: totals.membersMissingStarterStar,
      eventTypes: ["ai_star_discovered", "founder_joined"],
      gap: "missing:member_starter_star",
      id: "backfill-member-starter-star",
      priority: 2,
      runMode: "script_ready",
      safetyLevel: "write_gated",
      script: "pnpm fanletter:member-starter-stars:backfill",
      targetCoverage: "memberStarterStarCoveragePercent",
      title: "Member starter AI Star assignment",
      writeCommand:
        "FANLETTER_MEMBER_STARTER_STARS_BACKFILL_WRITE=1 pnpm fanletter:member-starter-stars:backfill",
    },
    "missing:star_creator_membership": {
      description:
        "Ensure every active AI Star has exactly one creator membership so launch lineage can produce Creator Journey and CP Pool events.",
      estimatedRecords: totals.starsMissingCreatorMembership,
      eventTypes: ["source_universe_selected", "cp_pool_generated"],
      gap: "missing:star_creator_membership",
      id: "backfill-star-creator-membership",
      priority: 3,
      runMode: "script_ready",
      safetyLevel: "write_gated",
      script: "pnpm fanletter:founder-universe:roles:reconcile",
      targetCoverage: "creatorRoleCoveragePercent",
      title: "AI Star creator membership reconciliation",
      writeCommand:
        "FANLETTER_FOUNDER_UNIVERSE_ROLE_RECONCILE_WRITE=1 pnpm fanletter:founder-universe:roles:reconcile",
    },
    "missing:legacy_referral_edges": {
      description:
        "Convert legacy member-level referral fields into AI Star scoped referral edges while preserving original sponsor evidence.",
      estimatedRecords: Math.max(
        0,
        totals.legacyReferralMembers - totals.referralEdges,
      ),
      eventTypes: ["referral_code_created", "referral_converted"],
      gap: "missing:legacy_referral_edges",
      id: "backfill-legacy-referral-edges",
      priority: 4,
      runMode: "script_ready",
      safetyLevel: "write_gated",
      script: "pnpm fanletter:founder-club:backfill:audit",
      targetCoverage: "legacyReferralEdgeCoveragePercent",
      title: "Legacy referral edge conversion",
      writeCommand:
        "FANLETTER_FOUNDER_CLUB_BACKFILL_WRITE=1 pnpm fanletter:founder-club:backfill:audit",
    },
    "missing:cp_influence_ledger": {
      description:
        "Generate CP and Influence ledger rows for Founder Universe actions so AgentRank can read economic contribution signals.",
      estimatedRecords: totals.totalMemberships,
      eventTypes: ["cp_earned", "cp_pool_generated"],
      gap: "missing:cp_influence_ledger",
      id: "backfill-cp-influence-ledger",
      priority: 5,
      runMode: "script_ready",
      safetyLevel: "write_gated",
      script: "pnpm referral-rewards:reconcile",
      targetCoverage: "memberFounderUniverseCoveragePercent",
      title: "CP and Influence ledger reconciliation",
      writeCommand:
        "REFERRAL_REWARDS_RECONCILE_WRITE=1 pnpm referral-rewards:reconcile",
    },
    "missing:star_owner": {
      description:
        "Resolve missing AI Star owner records before using creator lineage for source-universe and spawned-star reputation events.",
      estimatedRecords: totals.starsMissingOwner,
      eventTypes: ["source_universe_selected"],
      gap: "missing:star_owner",
      id: "backfill-star-owner",
      priority: 6,
      runMode: "manual_review",
      safetyLevel: "manual_review",
      targetCoverage: "starOwnerCoveragePercent",
      title: "AI Star owner identity repair",
    },
    "missing:star_portrait": {
      description:
        "Attach safe AI Star profile portraits so investor and member-facing universe maps can distinguish AI Stars from human members.",
      estimatedRecords: totals.starsMissingPortrait,
      eventTypes: ["ai_star_discovered"],
      gap: "missing:star_portrait",
      id: "backfill-star-portrait",
      priority: 7,
      runMode: "script_ready",
      safetyLevel: "write_gated",
      script: "pnpm fanletter:ai-star-profiles:backfill",
      targetCoverage: "starPortraitCoveragePercent",
      title: "AI Star profile portrait enrichment",
      writeCommand: "pnpm fanletter:ai-star-profiles:backfill -- --write",
    },
  };

  return gaps
    .map((gap) => plans[gap])
    .filter(Boolean)
    .map((plan) => ({
      ...plan,
      packageScript: getPackageScriptName(plan.script),
      scriptStatus: resolveScriptStatus(plan.script, packageScripts),
    }))
    .sort((a, b) => a.priority - b.priority);
}

async function getBackfillPlanSnapshot({ db, packageScripts }) {
  const membersCollection = db.collection(membersCollectionName);
  const starsCollection = db.collection(fanletterStarsCollectionName);
  const membershipsCollection = db.collection(
    fanletterStarFounderMembershipsCollectionName,
  );
  const referralCodesCollection = db.collection(
    fanletterStarReferralCodesCollectionName,
  );
  const referralEdgesCollection = db.collection(
    fanletterStarReferralEdgesCollectionName,
  );
  const influenceLedgerCollection = db.collection(
    fanletterStarInfluenceLedgerCollectionName,
  );

  const [
    activeStars,
    completedMembers,
    creatorMemberships,
    influenceLedgerRows,
    legacyReferralMembers,
    membersWithFounderUniverseRows,
    membersWithStarterStar,
    referralCodes,
    referralEdges,
    stars,
    starsMissingCreatorMembershipRows,
    starsMissingOwner,
    starsMissingPortrait,
    totalMemberships,
    cpPoolGeneratedRows,
  ] = await Promise.all([
    starsCollection.countDocuments({ status: "active" }),
    membersCollection.countDocuments({ status: "completed" }),
    membershipsCollection.countDocuments({ role: "creator" }),
    influenceLedgerCollection.countDocuments({}),
    membersCollection.countDocuments({
      status: "completed",
      $or: [
        { sponsorReferralCode: { $type: "string" } },
        { referredByCode: { $type: "string" } },
        { fanletterStarReferralCode: { $type: "string" } },
      ],
    }),
    membersCollection
      .aggregate([
        { $match: { status: "completed" } },
        {
          $lookup: {
            as: "founderMemberships",
            foreignField: "memberEmail",
            from: fanletterStarFounderMembershipsCollectionName,
            localField: "email",
          },
        },
        { $match: { "founderMemberships.0": { $exists: true } } },
        { $count: "count" },
      ])
      .toArray(),
    membersCollection.countDocuments({
      status: "completed",
      $or: [
        { fanletterStarterStarId: { $type: "string" } },
        { fanletterStarReferralStarId: { $type: "string" } },
      ],
    }),
    referralCodesCollection.countDocuments({ status: "active" }),
    referralEdgesCollection.countDocuments({}),
    starsCollection.countDocuments({}),
    starsCollection
      .aggregate([
        { $match: { status: "active" } },
        {
          $lookup: {
            as: "creatorMemberships",
            from: fanletterStarFounderMembershipsCollectionName,
            let: { starId: "$starId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$starId", "$$starId"] },
                      { $eq: ["$role", "creator"] },
                    ],
                  },
                },
              },
              { $limit: 1 },
            ],
          },
        },
        { $match: { "creatorMemberships.0": { $exists: false } } },
        { $count: "count" },
      ])
      .toArray(),
    starsCollection.countDocuments({
      $or: [{ ownerEmail: null }, { ownerEmail: "" }, { ownerEmail: { $exists: false } }],
    }),
    starsCollection.countDocuments({
      $or: [
        { portraitImageUrl: null },
        { portraitImageUrl: "" },
        { portraitImageUrl: { $exists: false } },
      ],
    }),
    membershipsCollection.countDocuments({}),
    influenceLedgerCollection
      .aggregate([
        { $match: { sourceId: /^creator-launch-cp-pool:/ } },
        {
          $project: {
            parts: { $split: ["$sourceId", ":"] },
          },
        },
        {
          $group: {
            _id: {
              launchStarId: { $arrayElemAt: ["$parts", 2] },
              sourceStarId: { $arrayElemAt: ["$parts", 1] },
            },
          },
        },
        { $count: "count" },
      ])
      .toArray(),
  ]);
  const membersWithFounderUniverse = readCount(membersWithFounderUniverseRows);
  const starsMissingCreatorMembership = readCount(
    starsMissingCreatorMembershipRows,
  );
  const cpPoolGenerated = readCount(cpPoolGeneratedRows);
  const membersMissingFounderUniverse = Math.max(
    0,
    completedMembers - membersWithFounderUniverse,
  );
  const membersMissingStarterStar = Math.max(
    0,
    completedMembers - membersWithStarterStar,
  );
  const coverage = {
    creatorRoleCoveragePercent: percent(
      activeStars - starsMissingCreatorMembership,
      activeStars,
    ),
    legacyReferralEdgeCoveragePercent: percent(
      Math.min(referralEdges, legacyReferralMembers),
      legacyReferralMembers,
    ),
    memberFounderUniverseCoveragePercent: percent(
      membersWithFounderUniverse,
      completedMembers,
    ),
    memberStarterStarCoveragePercent: percent(
      membersWithStarterStar,
      completedMembers,
    ),
    starOwnerCoveragePercent: percent(stars - starsMissingOwner, stars),
    starPortraitCoveragePercent: percent(stars - starsMissingPortrait, stars),
  };
  const readinessScore = Math.round(
    coverage.memberFounderUniverseCoveragePercent * 0.28 +
      coverage.memberStarterStarCoveragePercent * 0.18 +
      coverage.creatorRoleCoveragePercent * 0.18 +
      coverage.legacyReferralEdgeCoveragePercent * 0.14 +
      coverage.starOwnerCoveragePercent * 0.12 +
      coverage.starPortraitCoveragePercent * 0.1,
  );
  const totals = {
    activeStars,
    completedMembers,
    creatorMemberships,
    influenceLedgerRows,
    legacyReferralMembers,
    membersMissingFounderUniverse,
    membersMissingStarterStar,
    membersWithFounderUniverse,
    membersWithStarterStar,
    referralCodes,
    referralEdges,
    stars,
    starsMissingCreatorMembership,
    starsMissingOwner,
    starsMissingPortrait,
    totalMemberships,
  };
  const gaps = buildGaps(totals);

  return {
    actionPlan: buildActionPlan({ gaps, packageScripts, totals }),
    collectionNames: {
      fanletterStarFounderMemberships:
        fanletterStarFounderMembershipsCollectionName,
      fanletterStarInfluenceLedger: fanletterStarInfluenceLedgerCollectionName,
      fanletterStarReferralCodes: fanletterStarReferralCodesCollectionName,
      fanletterStarReferralEdges: fanletterStarReferralEdgesCollectionName,
      fanletterStars: fanletterStarsCollectionName,
      members: membersCollectionName,
    },
    convertibleEvents: {
      aiStarDiscovered: activeStars,
      cpEarned: influenceLedgerRows,
      cpPoolGenerated,
      founderJoined: totalMemberships,
      referralCodeCreated: referralCodes,
      referralConverted: referralEdges,
    },
    coverage,
    gaps,
    phase: "fanletter_phase_1",
    readinessScore: Math.max(0, Math.min(100, readinessScore)),
    recordType: "agentrank.backfill_plan_audit.v1",
    totals,
  };
}

function printHumanReport(snapshot) {
  console.log("AgentRank Backfill Plan Audit");
  console.log("-----------------------------");
  console.log(`Database: ${dbName}`);
  console.log(`Record Type: ${snapshot.recordType}`);
  console.log(`Readiness Score: ${snapshot.readinessScore}/100`);
  console.log(`Gaps: ${snapshot.gaps.length ? snapshot.gaps.join(", ") : "none"}`);
  console.log("");
  console.log("Coverage");
  console.table(
    Object.entries(snapshot.coverage).map(([metric, value]) => ({
      metric,
      value: `${value}%`,
    })),
  );
  console.log("Convertible Reputation Events");
  console.table(
    Object.entries(snapshot.convertibleEvents).map(([eventType, count]) => ({
      count,
      eventType,
    })),
  );

  if (snapshot.actionPlan.length === 0) {
    console.log("No backfill actions are required.");
    return;
  }

  console.log("Action Plan");
  console.table(
    snapshot.actionPlan.map((item) => ({
      command: item.script ?? "manual review",
      estimatedRecords: formatNumber(item.estimatedRecords),
      eventTypes: item.eventTypes.join(", "),
      priority: item.priority,
      safetyLevel: item.safetyLevel,
      scriptStatus: item.scriptStatus,
      title: item.title,
      writeCommand: item.writeCommand ?? "manual review",
    })),
  );
  console.log("");
  console.log("Safety");
  console.log("- This audit is read-only and does not write to MongoDB.");
  console.log("- Listed commands default to dry-run unless their own WRITE env is set.");
  console.log("- Review manual_review items before generating AgentRank oracle packets.");
}

async function main() {
  const packageScripts = await readPackageScripts();
  const client = new MongoClient(uri);

  await client.connect();

  try {
    const snapshot = await getBackfillPlanSnapshot({
      db: client.db(dbName),
      packageScripts,
    });

    if (outputJson) {
      console.log(JSON.stringify(snapshot, null, 2));
      return;
    }

    printHumanReport(snapshot);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
