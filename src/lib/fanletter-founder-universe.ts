export const fanletterFounderUniverseBranchingFactor = 6;
export const fanletterFounderUniverseMaxDepth = 6;
export const fanletterFounderUniverseCpPoolTotal = 1000;

export const fanletterFounderUniverseRoles = [
  "creator",
  "genesis_founder",
  "founder",
  "mentor",
  "producer",
  "partner",
  "legend",
] as const;

export type FanletterFounderUniverseRole =
  (typeof fanletterFounderUniverseRoles)[number];

export type FanletterFounderUniverseTier = {
  capacity: number;
  cpPoolReward: number;
  depth: number;
  role: FanletterFounderUniverseRole;
};

export const fanletterFounderUniverseTiers = [
  { capacity: 1, cpPoolReward: 300, depth: 0, role: "creator" },
  { capacity: 6, cpPoolReward: 300, depth: 1, role: "genesis_founder" },
  { capacity: 36, cpPoolReward: 200, depth: 2, role: "founder" },
  { capacity: 216, cpPoolReward: 150, depth: 3, role: "mentor" },
  { capacity: 1296, cpPoolReward: 50, depth: 4, role: "producer" },
  { capacity: 7776, cpPoolReward: 0, depth: 5, role: "partner" },
  { capacity: 46656, cpPoolReward: 0, depth: 6, role: "legend" },
] as const satisfies readonly FanletterFounderUniverseTier[];

export type FanletterFounderUniverseReferralEdge = {
  sourceMemberEmail: string;
  targetMemberEmail: string;
};

export type FanletterFounderUniverseUplineEntry = {
  depth: number;
  memberEmail: string;
  role: FanletterFounderUniverseRole;
};

export type FanletterFounderUniverseUplineResolution = {
  missingReason:
    | "creator_not_found"
    | "cycle_detected"
    | "launch_creator_not_found"
    | "root_not_reached"
    | null;
  path: FanletterFounderUniverseUplineEntry[];
  rootResolved: boolean;
};

export type FanletterFounderUniverseCpPoolDistributionItem = {
  allocated: boolean;
  cp: number;
  depth: number;
  recipientMemberEmail: string | null;
  role: FanletterFounderUniverseRole;
  sourceId: string | null;
};

export type FanletterFounderUniverseCpPoolDistribution = {
  allocatedCp: number;
  cpPoolTotal: number;
  items: FanletterFounderUniverseCpPoolDistributionItem[];
  launchCreatorEmail: string;
  launchStarId: string;
  rootResolved: boolean;
  sourceStarId: string;
  uplinePath: FanletterFounderUniverseUplineEntry[];
  unallocatedCp: number;
};

function normalizeUniverseEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeUniverseId(value: string) {
  return value.trim().toLowerCase();
}

export function getFanletterFounderUniverseTier(depth: number) {
  return (
    fanletterFounderUniverseTiers.find((tier) => tier.depth === depth) ?? null
  );
}

export function getFanletterFounderUniverseTierByRole(
  role: FanletterFounderUniverseRole,
) {
  return fanletterFounderUniverseTiers.find((tier) => tier.role === role) ?? null;
}

export function getFanletterFounderUniverseTierCapacity(depth: number) {
  if (depth <= 0) {
    return 1;
  }

  return fanletterFounderUniverseBranchingFactor ** depth;
}

export function buildFanletterFounderUniverseLedgerSourceId({
  launchStarId,
  recipientMemberEmail,
  role,
  sourceStarId,
}: {
  launchStarId: string;
  recipientMemberEmail: string;
  role: FanletterFounderUniverseRole;
  sourceStarId: string;
}) {
  return [
    "creator-launch-cp-pool",
    normalizeUniverseId(sourceStarId),
    normalizeUniverseId(launchStarId),
    role,
    normalizeUniverseEmail(recipientMemberEmail),
  ].join(":");
}

export function resolveFanletterFounderUniverseUplinePath({
  creatorEmail,
  launchCreatorEmail,
  referralEdges,
}: {
  creatorEmail: string | null | undefined;
  launchCreatorEmail: string | null | undefined;
  referralEdges: readonly FanletterFounderUniverseReferralEdge[];
}): FanletterFounderUniverseUplineResolution {
  const creator = normalizeUniverseEmail(creatorEmail);
  const launchCreator = normalizeUniverseEmail(launchCreatorEmail);

  if (!creator) {
    return {
      missingReason: "creator_not_found",
      path: [],
      rootResolved: false,
    };
  }

  if (!launchCreator) {
    return {
      missingReason: "launch_creator_not_found",
      path: [],
      rootResolved: false,
    };
  }

  const targetToSource = new Map<string, string>();

  for (const edge of referralEdges) {
    const source = normalizeUniverseEmail(edge.sourceMemberEmail);
    const target = normalizeUniverseEmail(edge.targetMemberEmail);

    if (source && target && !targetToSource.has(target)) {
      targetToSource.set(target, source);
    }
  }

  const upwardPath: string[] = [];
  const visited = new Set<string>();
  let current = launchCreator;

  for (let depth = 0; depth <= fanletterFounderUniverseMaxDepth; depth += 1) {
    if (visited.has(current)) {
      return {
        missingReason: "cycle_detected",
        path: [],
        rootResolved: false,
      };
    }

    visited.add(current);
    upwardPath.push(current);

    if (current === creator) {
      const rootToLaunchPath = [...upwardPath].reverse();
      const path: FanletterFounderUniverseUplineEntry[] = [];

      for (let index = 0; index < rootToLaunchPath.length; index += 1) {
        const tier = getFanletterFounderUniverseTier(index);

        if (tier) {
          path.push({
            depth: tier.depth,
            memberEmail: rootToLaunchPath[index] ?? "",
            role: tier.role,
          });
        }
      }

      return {
        missingReason: null,
        path,
        rootResolved: true,
      };
    }

    const parent = targetToSource.get(current);

    if (!parent) {
      break;
    }

    current = parent;
  }

  return {
    missingReason: "root_not_reached",
    path: [],
    rootResolved: false,
  };
}

export function buildFanletterFounderUniverseCpPoolDistribution({
  launchCreatorEmail,
  launchStarId,
  rootResolved,
  sourceStarId,
  uplinePath,
}: {
  launchCreatorEmail: string;
  launchStarId: string;
  rootResolved: boolean;
  sourceStarId: string;
  uplinePath: readonly FanletterFounderUniverseUplineEntry[];
}): FanletterFounderUniverseCpPoolDistribution {
  const entriesByDepth = new Map<number, FanletterFounderUniverseUplineEntry>();

  for (const entry of uplinePath) {
    if (!entriesByDepth.has(entry.depth)) {
      entriesByDepth.set(entry.depth, {
        depth: entry.depth,
        memberEmail: normalizeUniverseEmail(entry.memberEmail),
        role: entry.role,
      });
    }
  }

  const items = fanletterFounderUniverseTiers
    .filter((tier) => tier.cpPoolReward > 0)
    .map((tier): FanletterFounderUniverseCpPoolDistributionItem => {
      const recipient = rootResolved ? entriesByDepth.get(tier.depth) : null;
      const recipientMemberEmail = recipient?.memberEmail || null;

      return {
        allocated: recipientMemberEmail !== null,
        cp: tier.cpPoolReward,
        depth: tier.depth,
        recipientMemberEmail,
        role: tier.role,
        sourceId: recipientMemberEmail
          ? buildFanletterFounderUniverseLedgerSourceId({
              launchStarId,
              recipientMemberEmail,
              role: tier.role,
              sourceStarId,
            })
          : null,
      };
    });
  const allocatedCp = items.reduce(
    (sum, item) => sum + (item.allocated ? item.cp : 0),
    0,
  );

  return {
    allocatedCp,
    cpPoolTotal: fanletterFounderUniverseCpPoolTotal,
    items,
    launchCreatorEmail: normalizeUniverseEmail(launchCreatorEmail),
    launchStarId,
    rootResolved,
    sourceStarId,
    uplinePath: rootResolved ? [...uplinePath] : [],
    unallocatedCp: fanletterFounderUniverseCpPoolTotal - allocatedCp,
  };
}
