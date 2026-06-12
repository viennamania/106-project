import "server-only";

import { getFanletterStarInfluenceLedgerCollection, getFanletterStarsCollection } from "@/lib/mongodb";

export type FanletterAIStarGenealogyNode = {
  childCount: number;
  createdAt: string | null;
  depth: number;
  directCpGenerated: number;
  displayName: string;
  founderCount: number;
  genealogyBackfilled: boolean;
  growthPercent: number;
  id: string;
  name: string;
  ownerId: string;
  parentStarId: string | null;
  portraitImageUrl: string | null;
  starScore: number;
  status: string;
  subtreeCpGenerated: number;
};

export type FanletterAIStarGenealogyEdge = {
  childStarId: string;
  parentStarId: string;
};

export type FanletterAIStarGenealogyDepth = {
  cpGenerated: number;
  depth: number;
  starCount: number;
};

export type FanletterAIStarGenealogyLineage = {
  cpGenerated: number;
  nodes: FanletterAIStarGenealogyNode[];
};

export type FanletterAIStarGenealogySnapshot = {
  backfilledCp: number;
  backfilledLedgerEntries: number;
  backfilledStars: number;
  depthStats: FanletterAIStarGenealogyDepth[];
  edges: FanletterAIStarGenealogyEdge[];
  featuredLineages: FanletterAIStarGenealogyLineage[];
  generatedAt: string;
  linkedStars: number;
  maxDepth: number;
  nodes: FanletterAIStarGenealogyNode[];
  roots: FanletterAIStarGenealogyNode[];
  topParents: FanletterAIStarGenealogyNode[];
  totalStars: number;
};

type StarRow = {
  characterName?: string | null;
  createdAt?: Date | null;
  displayName?: string | null;
  founderCount?: number | null;
  genealogyBackfilledAt?: Date | null;
  growthPercent?: number | null;
  ownerEmail?: string | null;
  portraitImageUrl?: string | null;
  spawnedFromStarId?: string | null;
  starId: string;
  starScore?: number | null;
  status?: string | null;
};

function toSafeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toIsoStringOrNull(value: unknown) {
  return value instanceof Date && !Number.isNaN(value.getTime())
    ? value.toISOString()
    : null;
}

function normalizeStarId(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getOwnerId(value: string | null | undefined) {
  const email = value?.trim().toLowerCase() ?? "";
  const localPart = email.split("@")[0]?.trim();

  return localPart || "unknown";
}

function parseLaunchStarIdFromLedgerSourceId(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const parts = value.split(":");

  return parts[0] === "creator-launch-cp-pool" && parts[2]
    ? normalizeStarId(parts[2])
    : null;
}

function buildChildrenByParent(edges: FanletterAIStarGenealogyEdge[]) {
  const childrenByParent = new Map<string, string[]>();

  for (const edge of edges) {
    const children = childrenByParent.get(edge.parentStarId) ?? [];
    children.push(edge.childStarId);
    childrenByParent.set(edge.parentStarId, children);
  }

  return childrenByParent;
}

function buildFeaturedLineages({
  childrenByParent,
  nodesById,
  roots,
}: {
  childrenByParent: Map<string, string[]>;
  nodesById: Map<string, FanletterAIStarGenealogyNode>;
  roots: FanletterAIStarGenealogyNode[];
}) {
  const lineages: FanletterAIStarGenealogyLineage[] = [];

  for (const root of roots) {
    const path: FanletterAIStarGenealogyNode[] = [root];
    const visited = new Set([root.id]);
    let current = root;

    while (path.length < 7) {
      const next = (childrenByParent.get(current.id) ?? [])
        .map((childId) => nodesById.get(childId))
        .filter((node): node is FanletterAIStarGenealogyNode => Boolean(node))
        .filter((node) => !visited.has(node.id))
        .sort(
          (left, right) =>
            right.childCount - left.childCount ||
            right.subtreeCpGenerated - left.subtreeCpGenerated ||
            right.starScore - left.starScore ||
            left.name.localeCompare(right.name),
        )[0];

      if (!next) {
        break;
      }

      path.push(next);
      visited.add(next.id);
      current = next;
    }

    lineages.push({
      cpGenerated: path.reduce((sum, node) => sum + node.directCpGenerated, 0),
      nodes: path,
    });
  }

  return lineages
    .sort(
      (left, right) =>
        right.nodes.length - left.nodes.length ||
        right.cpGenerated - left.cpGenerated,
    )
    .slice(0, 4);
}

export async function getFanletterAIStarGenealogySnapshot(): Promise<FanletterAIStarGenealogySnapshot> {
  const [starsCollection, influenceLedgerCollection] = await Promise.all([
    getFanletterStarsCollection(),
    getFanletterStarInfluenceLedgerCollection(),
  ]);
  const [stars, ledgerRows] = await Promise.all([
    starsCollection
      .find(
        { status: { $ne: "archived" } },
        {
          projection: {
            characterName: 1,
            createdAt: 1,
            displayName: 1,
            founderCount: 1,
            genealogyBackfilledAt: 1,
            growthPercent: 1,
            ownerEmail: 1,
            portraitImageUrl: 1,
            spawnedFromStarId: 1,
            starId: 1,
            starScore: 1,
            status: 1,
          },
        },
      )
      .toArray(),
    influenceLedgerCollection
      .find(
        {
          source: "creator_unlock",
          sourceId: /^creator-launch-cp-pool:/,
        },
        {
          projection: {
            cpDelta: 1,
            sourceId: 1,
          },
        },
      )
      .toArray(),
  ]);
  const starRows = stars as StarRow[];
  const starIds = new Set(starRows.map((star) => star.starId));
  const cpByLaunchStarId = new Map<string, number>();
  let backfilledCp = 0;

  for (const row of ledgerRows) {
    const launchStarId = parseLaunchStarIdFromLedgerSourceId(row.sourceId);
    const cpDelta = toSafeNumber(row.cpDelta);

    if (!launchStarId) {
      continue;
    }

    cpByLaunchStarId.set(
      launchStarId,
      (cpByLaunchStarId.get(launchStarId) ?? 0) + cpDelta,
    );
    backfilledCp += cpDelta;
  }

  const edges = starRows
    .map((star): FanletterAIStarGenealogyEdge | null => {
      const parentStarId = normalizeStarId(star.spawnedFromStarId);

      if (!parentStarId || parentStarId === star.starId || !starIds.has(parentStarId)) {
        return null;
      }

      return {
        childStarId: star.starId,
        parentStarId,
      };
    })
    .filter((edge): edge is FanletterAIStarGenealogyEdge => edge !== null);
  const childrenByParent = buildChildrenByParent(edges);
  const parentByChild = new Map(
    edges.map((edge) => [edge.childStarId, edge.parentStarId]),
  );
  const rootIds = starRows
    .map((star) => star.starId)
    .filter((starId) => !parentByChild.has(starId));
  const depthByStarId = new Map<string, number>();
  const queue = rootIds.map((starId) => ({ depth: 0, starId }));

  while (queue.length > 0) {
    const item = queue.shift();

    if (!item || depthByStarId.has(item.starId)) {
      continue;
    }

    depthByStarId.set(item.starId, item.depth);

    for (const childStarId of childrenByParent.get(item.starId) ?? []) {
      queue.push({
        depth: item.depth + 1,
        starId: childStarId,
      });
    }
  }

  const nodes = starRows
    .map((star): FanletterAIStarGenealogyNode => {
      const childCount = childrenByParent.get(star.starId)?.length ?? 0;
      const name = star.characterName || star.displayName || star.starId;

      return {
        childCount,
        createdAt: toIsoStringOrNull(star.createdAt),
        depth: depthByStarId.get(star.starId) ?? 0,
        directCpGenerated: cpByLaunchStarId.get(star.starId) ?? 0,
        displayName: star.displayName || name,
        founderCount: toSafeNumber(star.founderCount),
        genealogyBackfilled: star.genealogyBackfilledAt instanceof Date,
        growthPercent: toSafeNumber(star.growthPercent),
        id: star.starId,
        name,
        ownerId: getOwnerId(star.ownerEmail),
        parentStarId: parentByChild.get(star.starId) ?? null,
        portraitImageUrl: star.portraitImageUrl ?? null,
        starScore: toSafeNumber(star.starScore),
        status: String(star.status ?? "draft"),
        subtreeCpGenerated: 0,
      };
    })
    .sort(
      (left, right) =>
        left.depth - right.depth ||
        right.childCount - left.childCount ||
        right.directCpGenerated - left.directCpGenerated ||
        left.name.localeCompare(right.name),
    );
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  function calculateSubtreeCp(starId: string, visited = new Set<string>()) {
    if (visited.has(starId)) {
      return 0;
    }

    visited.add(starId);

    const node = nodesById.get(starId);

    if (!node) {
      return 0;
    }

    const childCp = (childrenByParent.get(starId) ?? []).reduce(
      (sum, childStarId) => sum + calculateSubtreeCp(childStarId, visited),
      0,
    );

    node.subtreeCpGenerated = node.directCpGenerated + childCp;

    return node.subtreeCpGenerated;
  }

  for (const rootId of rootIds) {
    calculateSubtreeCp(rootId);
  }

  const roots = rootIds
    .map((rootId) => nodesById.get(rootId))
    .filter((node): node is FanletterAIStarGenealogyNode => Boolean(node))
    .sort(
      (left, right) =>
        right.subtreeCpGenerated - left.subtreeCpGenerated ||
        right.childCount - left.childCount ||
        left.name.localeCompare(right.name),
    );
  const depthStats = [...new Set(nodes.map((node) => node.depth))]
    .sort((left, right) => left - right)
    .map((depth) => {
      const depthNodes = nodes.filter((node) => node.depth === depth);

      return {
        cpGenerated: depthNodes.reduce(
          (sum, node) => sum + node.directCpGenerated,
          0,
        ),
        depth,
        starCount: depthNodes.length,
      };
    });

  return {
    backfilledCp,
    backfilledLedgerEntries: ledgerRows.length,
    backfilledStars: nodes.filter((node) => node.genealogyBackfilled).length,
    depthStats,
    edges,
    featuredLineages: buildFeaturedLineages({
      childrenByParent,
      nodesById,
      roots,
    }),
    generatedAt: new Date().toISOString(),
    linkedStars: edges.length,
    maxDepth: Math.max(0, ...nodes.map((node) => node.depth)),
    nodes,
    roots,
    topParents: [...nodes]
      .filter((node) => node.childCount > 0)
      .sort(
        (left, right) =>
          right.childCount - left.childCount ||
          right.subtreeCpGenerated - left.subtreeCpGenerated ||
          left.name.localeCompare(right.name),
      )
      .slice(0, 12),
    totalStars: nodes.length,
  };
}
