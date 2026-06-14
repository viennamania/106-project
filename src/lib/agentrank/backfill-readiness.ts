import "server-only";

import {
  getFanletterStarFounderMembershipsCollection,
  getFanletterStarInfluenceLedgerCollection,
  getFanletterStarReferralCodesCollection,
  getFanletterStarReferralEdgesCollection,
  getFanletterStarsCollection,
  getMembersCollection,
} from "@/lib/mongodb";

export type AgentRankBackfillSample = {
  email?: string | null;
  issue: string;
  referralCode?: string | null;
  starId?: string | null;
};

export type AgentRankBackfillReadinessSnapshot = {
  convertibleEvents: {
    aiStarDiscovered: number;
    cpEarned: number;
    cpPoolGenerated: number;
    founderJoined: number;
    referralCodeCreated: number;
    referralConverted: number;
  };
  coverage: {
    creatorRoleCoveragePercent: number;
    legacyReferralEdgeCoveragePercent: number;
    memberFounderUniverseCoveragePercent: number;
    memberStarterStarCoveragePercent: number;
    starOwnerCoveragePercent: number;
    starPortraitCoveragePercent: number;
  };
  gaps: string[];
  phase: "fanletter_phase_1";
  readinessScore: number;
  recordType: "agentrank.backfill_readiness.v1";
  samples: AgentRankBackfillSample[];
  totals: {
    activeStars: number;
    completedMembers: number;
    creatorMemberships: number;
    influenceLedgerRows: number;
    legacyReferralMembers: number;
    membersMissingFounderUniverse: number;
    membersMissingStarterStar: number;
    membersWithFounderUniverse: number;
    membersWithStarterStar: number;
    referralCodes: number;
    referralEdges: number;
    stars: number;
    starsMissingCreatorMembership: number;
    starsMissingOwner: number;
    starsMissingPortrait: number;
    totalMemberships: number;
  };
};

function percent(value: number, total: number) {
  if (total <= 0) {
    return 100;
  }

  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function readCount(row: Array<{ count?: number }>) {
  return row[0]?.count ?? 0;
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
}: AgentRankBackfillReadinessSnapshot["totals"]) {
  const gaps: string[] = [];

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

export async function getAgentRankBackfillReadinessSnapshot(): Promise<AgentRankBackfillReadinessSnapshot> {
  const [
    membersCollection,
    starsCollection,
    membershipsCollection,
    referralCodesCollection,
    referralEdgesCollection,
    influenceLedgerCollection,
  ] = await Promise.all([
    getMembersCollection(),
    getFanletterStarsCollection(),
    getFanletterStarFounderMembershipsCollection(),
    getFanletterStarReferralCodesCollection(),
    getFanletterStarReferralEdgesCollection(),
    getFanletterStarInfluenceLedgerCollection(),
  ]);
  const membershipsCollectionName = membershipsCollection.collectionName;
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
    missingFounderUniverseSamples,
    missingStarterStarSamples,
    missingCreatorMembershipSamples,
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
      .aggregate<{ count: number }>([
        { $match: { status: "completed" } },
        {
          $lookup: {
            as: "founderMemberships",
            foreignField: "memberEmail",
            from: membershipsCollectionName,
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
      .aggregate<{ count: number }>([
        { $match: { status: "active" } },
        {
          $lookup: {
            as: "creatorMemberships",
            from: membershipsCollectionName,
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
      .aggregate<{ count: number }>([
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
    membersCollection
      .aggregate<AgentRankBackfillSample>([
        { $match: { status: "completed" } },
        {
          $lookup: {
            as: "founderMemberships",
            foreignField: "memberEmail",
            from: membershipsCollectionName,
            localField: "email",
          },
        },
        { $match: { "founderMemberships.0": { $exists: false } } },
        { $limit: 6 },
        {
          $project: {
            _id: 0,
            email: "$email",
            issue: "missing:member_founder_universe",
            referralCode: "$referralCode",
            starId: "$fanletterStarterStarId",
          },
        },
      ])
      .toArray(),
    membersCollection
      .find(
        {
          status: "completed",
          fanletterStarterStarId: { $exists: false },
          fanletterStarReferralStarId: { $exists: false },
        },
        {
          limit: 6,
          projection: {
            _id: 0,
            email: 1,
            referralCode: 1,
          },
        },
      )
      .toArray()
      .then((rows) =>
        rows.map((row) => ({
          email: row.email,
          issue: "missing:member_starter_star",
          referralCode: row.referralCode ?? null,
          starId: null,
        })),
      ),
    starsCollection
      .aggregate<AgentRankBackfillSample>([
        { $match: { status: "active" } },
        {
          $lookup: {
            as: "creatorMemberships",
            from: membershipsCollectionName,
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
        { $limit: 6 },
        {
          $project: {
            _id: 0,
            email: "$ownerEmail",
            issue: "missing:star_creator_membership",
            referralCode: "$ownerReferralCode",
            starId: "$starId",
          },
        },
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

  return {
    convertibleEvents: {
      aiStarDiscovered: activeStars,
      cpEarned: influenceLedgerRows,
      cpPoolGenerated,
      founderJoined: totalMemberships,
      referralCodeCreated: referralCodes,
      referralConverted: referralEdges,
    },
    coverage,
    gaps: buildGaps(totals),
    phase: "fanletter_phase_1",
    readinessScore: Math.max(0, Math.min(100, readinessScore)),
    recordType: "agentrank.backfill_readiness.v1",
    samples: [
      ...missingFounderUniverseSamples,
      ...missingStarterStarSamples,
      ...missingCreatorMembershipSamples,
    ].slice(0, 12),
    totals,
  };
}
