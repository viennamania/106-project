import "server-only";

import {
  fanletterFounderUniverseTiers,
  type FanletterFounderUniverseRole,
} from "@/lib/fanletter-founder-universe";
import type {
  FanletterFounderUniverseExplorerData,
  FanletterFounderUniverseExplorerNode,
} from "@/lib/fanletter-founder-universe-explorer";
import { getFanletterFounderUniverseExplorer } from "@/lib/fanletter-founder-universe-explorer-service";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";
import {
  getFanletterStarFounderMembershipsCollection,
  getFanletterStarInfluenceLedgerCollection,
  getFanletterStarReferralCodesCollection,
  getFanletterStarReferralEdgesCollection,
  getFanletterStarsCollection,
} from "@/lib/mongodb";

export type FanletterFounderUniverseInvestorTier = {
  capacity: number;
  cpPoolReward: number;
  depth: number;
  memberCount: number;
  openSlots: number;
  role: FanletterFounderUniverseRole;
};

export type FanletterFounderUniverseInvestorDistribution = {
  allocated: boolean;
  cp: number;
  depth: number;
  recipientLabel: string | null;
  role: FanletterFounderUniverseRole;
};

export type FanletterFounderUniverseInvestorExpansionStar = {
  creatorInitials: string | null;
  creatorMemberId: string | null;
  creatorRole: FanletterFounderUniverseRole | null;
  founderCount: number;
  growthPercent: number;
  id: string;
  name: string;
  portraitImageUrl: string | null;
  source: "live_projection" | "live_spawned";
  starScore: number;
};

export type FanletterFounderUniverseInvestorTopUniverse = {
  founderCount: number;
  growthPercent: number;
  portraitImageUrl: string | null;
  starId: string;
  starName: string;
  starScore: number;
  status: string;
};

export type FanletterFounderUniverseInvestorSnapshot = {
  cpDistribution: FanletterFounderUniverseInvestorDistribution[];
  generatedAt: string;
  expansionStars: FanletterFounderUniverseInvestorExpansionStar[];
  global: {
    activeReferralCodes: number;
    activeStars: number;
    cpLedgerEntries: number;
    draftStars: number;
    referralEdges: number;
    spawnedStars: number;
    totalCpDistributed: number;
    totalMemberships: number;
    totalStars: number;
    universeCount: number;
  };
  launchMember: {
    depth: number;
    directChildrenCount: number;
    initials: string;
    label: string;
    memberId: string;
    nodeId: string;
    role: FanletterFounderUniverseRole;
    starReferralCode: string | null;
  } | null;
  selectedUniverse: FanletterFounderUniverseExplorerData;
  tiers: FanletterFounderUniverseInvestorTier[];
  topUniverses: FanletterFounderUniverseInvestorTopUniverse[];
};

function toSafeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function pickLaunchMember(universe: FanletterFounderUniverseExplorerData) {
  const spawnedCreatorNodeId = universe.spawnedStars.find(
    (spawnedStar) => spawnedStar.creatorNodeId,
  )?.creatorNodeId;
  const spawnedCreatorNode = spawnedCreatorNodeId
    ? universe.nodes.find((node) => node.nodeId === spawnedCreatorNodeId)
    : null;
  const deepestRewardNode = [...universe.nodes]
    .filter((node) => node.depth > 0 && node.depth <= 4)
    .sort(
      (left, right) =>
        right.depth - left.depth ||
        right.directChildrenCount - left.directChildrenCount,
    )[0];

  return (
    spawnedCreatorNode ??
    deepestRewardNode ??
    universe.nodes.find((node) => node.isCreator) ??
    universe.nodes[0] ??
    null
  );
}

function buildCpDistribution({
  launchMember,
  universe,
}: {
  launchMember: FanletterFounderUniverseExplorerNode | null;
  universe: FanletterFounderUniverseExplorerData;
}) {
  const nodesByDepth = new Map<number, FanletterFounderUniverseExplorerNode>();

  for (const node of universe.nodes) {
    if (!nodesByDepth.has(node.depth)) {
      nodesByDepth.set(node.depth, node);
    }
  }

  return fanletterFounderUniverseTiers
    .filter((tier) => tier.cpPoolReward > 0)
    .map((tier): FanletterFounderUniverseInvestorDistribution => {
      const recipient =
        launchMember && launchMember.depth >= tier.depth
          ? nodesByDepth.get(tier.depth) ?? null
          : null;

      return {
        allocated: Boolean(recipient),
        cp: tier.cpPoolReward,
        depth: tier.depth,
        recipientLabel: recipient?.label ?? null,
        role: tier.role,
      };
    });
}

function buildExpansionStars({
  launchMember,
  topUniverses,
  universe,
}: {
  launchMember: FanletterFounderUniverseExplorerNode | null;
  topUniverses: FanletterFounderUniverseInvestorTopUniverse[];
  universe: FanletterFounderUniverseExplorerData;
}): FanletterFounderUniverseInvestorExpansionStar[] {
  if (universe.spawnedStars.length > 0) {
    return universe.spawnedStars.slice(0, 4).map((star) => {
      const creatorNode = star.creatorNodeId
        ? universe.nodes.find((node) => node.nodeId === star.creatorNodeId) ?? null
        : null;

      return {
        creatorInitials: creatorNode?.initials ?? null,
        creatorMemberId: creatorNode?.memberId ?? star.creatorLabel,
        creatorRole: star.creatorRole,
        founderCount: star.directSpawnedStars,
        growthPercent: star.growthPercent,
        id: star.id,
        name: star.name,
        portraitImageUrl: star.portraitImageUrl,
        source: "live_spawned",
        starScore: star.starScore,
      };
    });
  }

  const candidateNodes = [
    launchMember,
    ...universe.nodes
      .filter((node) => !node.isCreator && node.depth > 0)
      .sort(
        (left, right) =>
          right.directChildrenCount - left.directChildrenCount ||
          left.depth - right.depth ||
          left.memberId.localeCompare(right.memberId),
      ),
  ].filter(
    (node, index, nodes): node is FanletterFounderUniverseExplorerNode =>
      Boolean(node) &&
      nodes.findIndex((candidate) => candidate?.nodeId === node?.nodeId) === index,
  );
  const previewUniverses = topUniverses
    .filter((star) => star.starId !== universe.star.id)
    .slice(0, 4);

  return previewUniverses.map((star, index) => {
    const creatorNode =
      candidateNodes[index % Math.max(1, candidateNodes.length)] ?? null;

    return {
      creatorInitials: creatorNode?.initials ?? null,
      creatorMemberId: creatorNode?.memberId ?? null,
      creatorRole: creatorNode?.role ?? null,
      founderCount: star.founderCount,
      growthPercent: star.growthPercent,
      id: star.starId,
      name: star.starName,
      portraitImageUrl: star.portraitImageUrl,
      source: "live_projection",
      starScore: star.starScore,
    };
  });
}

async function findLargestLiveUniverse() {
  const membershipsCollection =
    await getFanletterStarFounderMembershipsCollection();
  const topMembershipUniverses = await membershipsCollection
    .aggregate<{ _id: string; memberCount: number }>([
      {
        $group: {
          _id: "$starId",
          memberCount: { $sum: 1 },
        },
      },
      { $sort: { memberCount: -1 } },
      { $limit: 20 },
    ])
    .toArray();

  for (const row of topMembershipUniverses) {
    const universe = await getFanletterFounderUniverseExplorer(row._id);

    if (universe) {
      return universe;
    }
  }

  const starsCollection = await getFanletterStarsCollection();
  const fallbackStar = await starsCollection.findOne(
    {
      status: { $ne: "archived" },
    },
    {
      projection: {
        starId: 1,
      },
      sort: {
        founderCount: -1,
        starScore: -1,
        createdAt: -1,
      },
    },
  );

  return fallbackStar
    ? getFanletterFounderUniverseExplorer(fallbackStar.starId)
    : null;
}

async function getTopUniverses(): Promise<
  FanletterFounderUniverseInvestorTopUniverse[]
> {
  const [starsCollection, membershipsCollection] = await Promise.all([
    getFanletterStarsCollection(),
    getFanletterStarFounderMembershipsCollection(),
  ]);
  const rows = await membershipsCollection
    .aggregate<{ _id: string; memberCount: number }>([
      {
        $group: {
          _id: "$starId",
          memberCount: { $sum: 1 },
        },
      },
      { $sort: { memberCount: -1 } },
      { $limit: 8 },
    ])
    .toArray();
  const starIds = rows.map((row) => row._id).filter(Boolean);
  const stars = starIds.length
    ? await starsCollection
        .find(
          {
            starId: { $in: starIds },
            status: { $ne: "archived" },
          },
          {
            projection: {
              characterName: 1,
              displayName: 1,
              growthPercent: 1,
              portraitImageUrl: 1,
              starId: 1,
              starScore: 1,
              status: 1,
            },
          },
        )
        .toArray()
    : [];
  const starsById = new Map(stars.map((star) => [star.starId, star]));

  return rows
    .map((row) => {
      const star = starsById.get(row._id);

      if (!star) {
        return null;
      }

      return {
        founderCount: row.memberCount,
        growthPercent: star.growthPercent,
        portraitImageUrl: star.portraitImageUrl ?? null,
        starId: star.starId,
        starName: star.characterName || star.displayName,
        starScore: star.starScore,
        status: String(star.status),
      };
    })
    .filter(
      (row): row is FanletterFounderUniverseInvestorTopUniverse => row !== null,
    );
}

async function getGlobalMetrics() {
  const [
    starsCollection,
    membershipsCollection,
    referralEdgesCollection,
    referralCodesCollection,
    influenceLedgerCollection,
  ] = await Promise.all([
    getFanletterStarsCollection(),
    getFanletterStarFounderMembershipsCollection(),
    getFanletterStarReferralEdgesCollection(),
    getFanletterStarReferralCodesCollection(),
    getFanletterStarInfluenceLedgerCollection(),
  ]);
  const [
    starStatusRows,
    totalMemberships,
    referralEdges,
    activeReferralCodes,
    spawnedStars,
    universeRows,
    cpRows,
  ] = await Promise.all([
    starsCollection
      .aggregate<{ _id: string; count: number }>([
        {
          $match: {
            status: { $ne: "archived" },
          },
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    membershipsCollection.countDocuments({}),
    referralEdgesCollection.countDocuments({}),
    referralCodesCollection.countDocuments({ status: "active" }),
    starsCollection.countDocuments({
      spawnedFromStarId: { $type: "string", $ne: "" },
      status: { $ne: "archived" },
    }),
    membershipsCollection
      .aggregate<{ _id: string }>([
        {
          $group: {
            _id: "$starId",
          },
        },
      ])
      .toArray(),
    influenceLedgerCollection
      .aggregate<{ _id: null; count: number; totalCp: number }>([
        {
          $match: {
            source: "creator_unlock",
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalCp: { $sum: "$cpDelta" },
          },
        },
      ])
      .toArray(),
  ]);
  const statusCounts = new Map(
    starStatusRows.map((row) => [row._id, row.count]),
  );
  const activeStars = statusCounts.get("active") ?? 0;
  const draftStars = statusCounts.get("draft") ?? 0;

  return {
    activeReferralCodes,
    activeStars,
    cpLedgerEntries: toSafeNumber(cpRows[0]?.count),
    draftStars,
    referralEdges,
    spawnedStars,
    totalCpDistributed: toSafeNumber(cpRows[0]?.totalCp),
    totalMemberships,
    totalStars: activeStars + draftStars,
    universeCount: universeRows.length,
  };
}

export async function getFanletterFounderUniverseInvestorSnapshot({
  starId: starIdInput,
}: {
  starId?: string | null;
} = {}): Promise<FanletterFounderUniverseInvestorSnapshot | null> {
  const normalizedStarId = starIdInput
    ? normalizeFanletterStarId(starIdInput)
    : null;
  const selectedUniverse = normalizedStarId
    ? await getFanletterFounderUniverseExplorer(normalizedStarId)
    : await findLargestLiveUniverse();

  if (!selectedUniverse) {
    return null;
  }

  const selectedStarName =
    selectedUniverse.star.name || selectedUniverse.star.displayName || "AI Star";
  const investorUniverse: FanletterFounderUniverseExplorerData = {
    ...selectedUniverse,
    star: {
      ...selectedUniverse.star,
      displayName: selectedStarName,
      name: selectedStarName,
      universeName: `${selectedStarName} Universe`,
    },
  };

  const [global, topUniverses] = await Promise.all([
    getGlobalMetrics(),
    getTopUniverses(),
  ]);
  const launchMember = pickLaunchMember(investorUniverse);

  return {
    cpDistribution: buildCpDistribution({
      launchMember,
      universe: investorUniverse,
    }),
    expansionStars: buildExpansionStars({
      launchMember,
      topUniverses,
      universe: investorUniverse,
    }),
    generatedAt: new Date().toISOString(),
    global,
    launchMember: launchMember
      ? {
          depth: launchMember.depth,
          directChildrenCount: launchMember.directChildrenCount,
          initials: launchMember.initials,
          label: launchMember.label,
          memberId: launchMember.memberId,
          nodeId: launchMember.nodeId,
          role: launchMember.role,
          starReferralCode: launchMember.starReferralCode,
        }
      : null,
    selectedUniverse: investorUniverse,
    tiers: investorUniverse.tiers,
    topUniverses,
  };
}
