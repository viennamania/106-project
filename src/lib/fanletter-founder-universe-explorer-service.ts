import "server-only";

import { createHash } from "node:crypto";

import {
  fanletterFounderUniverseTiers,
  getFanletterFounderUniverseTier,
  getFanletterFounderUniverseTierByRole,
  type FanletterFounderUniverseRole,
} from "@/lib/fanletter-founder-universe";
import type {
  FanletterFounderUniverseExplorerData,
  FanletterFounderUniverseExplorerEdge,
  FanletterFounderUniverseExplorerNode,
  FanletterFounderUniverseExplorerSpawnedStar,
} from "@/lib/fanletter-founder-universe-explorer";
import {
  type FanletterStarDocument,
  type FanletterStarFounderMembershipDocument,
  type FanletterStarReferralEdgeDocument,
} from "@/lib/fanletter-founder-club";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";
import {
  getFanletterStarFounderMembershipsCollection,
  getFanletterStarReferralCodesCollection,
  getFanletterStarReferralEdgesCollection,
  getFanletterStarsCollection,
  getMembersCollection,
} from "@/lib/mongodb";
import { normalizeEmail, normalizeReferralCode } from "@/lib/member";
import type { MemberDocument } from "@/lib/member";

const starAccentPairs = [
  ["#8b5cf6", "#22d3ee"],
  ["#ec4899", "#f59e0b"],
  ["#06b6d4", "#84cc16"],
  ["#7c3aed", "#f97316"],
  ["#14b8a6", "#a78bfa"],
  ["#f43f5e", "#38bdf8"],
] as const;

function hashText(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getAccentPair(starId: string) {
  return starAccentPairs[hashText(starId) % starAccentPairs.length];
}

function getStableNodeId(email: string) {
  return `member-${createHash("sha256").update(email).digest("hex").slice(0, 16)}`;
}

function compactText(value: string | null | undefined, fallback: string) {
  const text = value?.replace(/\s+/g, " ").trim();

  return text || fallback;
}

const unsafeMemberDisplayNamePatterns = [
  /adult/i,
  /boob/i,
  /fuck/i,
  /hand\s*job/i,
  /hentai/i,
  /nude/i,
  /nsfw/i,
  /porn/i,
  /sex/i,
  /\b69\b/i,
  /69/i,
] as const;

function isUnsafeMemberDisplayName(value: string | null | undefined) {
  const text = value?.trim();

  return Boolean(
    text && unsafeMemberDisplayNamePatterns.some((pattern) => pattern.test(text)),
  );
}

function getInitials(value: string) {
  const normalized = value.replace(/[^a-zA-Z0-9가-힣\s]/g, " ").trim();
  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }

  return (words[0] ?? value).slice(0, 2).toUpperCase();
}

function toIsoStringOrNull(value: Date | null | undefined) {
  return value instanceof Date && !Number.isNaN(value.getTime())
    ? value.toISOString()
    : null;
}

function getStarInitials(star: FanletterStarDocument) {
  return getInitials(star.characterName || star.displayName || "AI Star");
}

function getMemberLabel({
  member,
  memberReferralCode,
  nodeId,
}: {
  member: Pick<MemberDocument, "publicProfile"> | null | undefined;
  memberReferralCode: string | null;
  nodeId: string;
}) {
  const publicName = member?.publicProfile?.displayName;

  if (publicName?.trim() && !isUnsafeMemberDisplayName(publicName)) {
    return compactText(publicName, "Member");
  }

  if (memberReferralCode) {
    return `Member ${memberReferralCode.slice(-4)}`;
  }

  return `Member ${nodeId.slice(-4).toUpperCase()}`;
}

function getMemberId({
  email,
  memberReferralCode,
  nodeId,
}: {
  email: string;
  memberReferralCode: string | null;
  nodeId: string;
}) {
  const localPart = normalizeEmail(email).split("@")[0]?.trim();

  if (localPart && !isUnsafeMemberDisplayName(localPart)) {
    return localPart;
  }

  if (memberReferralCode) {
    return memberReferralCode;
  }

  return nodeId.replace(/^member-/, "").slice(0, 8).toUpperCase();
}

function getMembershipRoleDepth(role: FanletterFounderUniverseRole) {
  return getFanletterFounderUniverseTierByRole(role)?.depth ?? null;
}

function getCreatorEmail({
  memberships,
  star,
}: {
  memberships: FanletterStarFounderMembershipDocument[];
  star: FanletterStarDocument;
}) {
  const ownerEmail = normalizeEmail(star.ownerEmail ?? "");

  if (ownerEmail) {
    return ownerEmail;
  }

  return normalizeEmail(
    memberships.find((membership) => membership.role === "creator")
      ?.memberEmail ?? "",
  );
}

function buildDepthAndParentMaps({
  creatorEmail,
  edges,
}: {
  creatorEmail: string;
  edges: FanletterStarReferralEdgeDocument[];
}) {
  const childrenByEmail = new Map<string, string[]>();
  const parentByEmail = new Map<string, string>();

  for (const edge of edges) {
    const sourceEmail = normalizeEmail(edge.sourceMemberEmail);
    const targetEmail = normalizeEmail(edge.targetMemberEmail);

    if (!sourceEmail || !targetEmail) {
      continue;
    }

    const children = childrenByEmail.get(sourceEmail) ?? [];
    children.push(targetEmail);
    childrenByEmail.set(sourceEmail, children);

    if (!parentByEmail.has(targetEmail)) {
      parentByEmail.set(targetEmail, sourceEmail);
    }
  }

  const depthByEmail = new Map<string, number>();

  if (creatorEmail) {
    const queue = [{ depth: 0, email: creatorEmail }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const item = queue.shift();

      if (!item || visited.has(item.email) || item.depth > 6) {
        continue;
      }

      visited.add(item.email);
      depthByEmail.set(item.email, item.depth);

      for (const childEmail of childrenByEmail.get(item.email) ?? []) {
        queue.push({
          depth: item.depth + 1,
          email: childEmail,
        });
      }
    }
  }

  return {
    childrenByEmail,
    depthByEmail,
    parentByEmail,
  };
}

const previewUniverseNodeTargets: Record<number, number> = {
  0: 1,
  1: 6,
  2: 12,
  3: 18,
};

const previewMemberNames = [
  "Ari",
  "Bora",
  "Dain",
  "Eun",
  "Haru",
  "Ian",
  "Jin",
  "Kai",
  "Lina",
  "Mina",
  "Nari",
  "Rin",
] as const;

const previewSpawnedStarNames = ["Nova", "Lina", "Mira"] as const;

function getPreviewDate(starId: string, depth: number, index: number) {
  const date = new Date(Date.UTC(2026, 0, 1));
  date.setUTCDate(
    date.getUTCDate() + (hashText(`${starId}:${depth}:${index}`) % 120),
  );

  return date.toISOString();
}

function getPreviewReferralCode({
  depth,
  index,
  star,
}: {
  depth: number;
  index: number;
  star: FanletterStarDocument;
}) {
  const starToken = compactText(star.characterName, star.displayName)
    .replace(/[^a-zA-Z0-9가-힣]/g, "")
    .toUpperCase()
    .slice(0, 8);

  return `${starToken || "STAR"}-P${depth}${String(index + 1).padStart(2, "0")}`;
}

function buildPreviewFounderUniverseNode({
  depth,
  index,
  parentNodeId,
  star,
}: {
  depth: number;
  index: number;
  parentNodeId: string | null;
  star: FanletterStarDocument;
}): FanletterFounderUniverseExplorerNode {
  const tier = getFanletterFounderUniverseTier(depth);
  const nameSeed = hashText(`${star.starId}:${depth}:${index}`);
  const baseName = previewMemberNames[nameSeed % previewMemberNames.length];
  const label =
    depth === 0
      ? compactText(star.ownerEmail?.split("@")[0], "Creator")
      : `${baseName} ${String(index + 1).padStart(2, "0")}`;
  const memberId =
    depth === 0
      ? compactText(star.ownerEmail?.split("@")[0], "creator")
      : `${star.starId.slice(-4).toUpperCase()}-${depth}${String(index + 1).padStart(2, "0")}`;
  const memberReferralCode = getPreviewReferralCode({ depth, index, star });
  const email =
    depth === 0 && star.ownerEmail
      ? normalizeEmail(star.ownerEmail)
      : `preview-${star.starId}-${depth}-${index}@fanletter.local`;
  const role = tier?.role ?? "legend";
  const searchText = [
    memberId,
    label,
    memberReferralCode,
    role,
    "preview_backfill",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    childNodeIds: [],
    depth,
    directChildrenCount: 0,
    initials: getInitials(label),
    isCreator: depth === 0,
    joinedAt: getPreviewDate(star.starId, depth, index),
    label,
    memberId,
    memberReferralCode,
    nodeId: getStableNodeId(email),
    parentNodeId,
    role,
    searchText,
    source: "preview_backfill",
    starReferralCode: memberReferralCode,
  };
}

function enrichFounderUniverseExplorerPreview({
  edges,
  nodes,
  spawnedStars,
  star,
}: {
  edges: FanletterFounderUniverseExplorerEdge[];
  nodes: FanletterFounderUniverseExplorerNode[];
  spawnedStars: FanletterFounderUniverseExplorerSpawnedStar[];
  star: FanletterStarDocument;
}) {
  const nodesById = new Map(
    nodes.map((node) => [
      node.nodeId,
      {
        ...node,
        childNodeIds: [...node.childNodeIds],
      },
    ]),
  );
  const nextEdges = [...edges];
  const nodesByDepth = new Map<number, FanletterFounderUniverseExplorerNode[]>();

  function rebuildDepthIndex() {
    nodesByDepth.clear();

    for (const node of nodesById.values()) {
      const list = nodesByDepth.get(node.depth) ?? [];
      list.push(node);
      nodesByDepth.set(node.depth, list);
    }
  }

  rebuildDepthIndex();

  if ((nodesByDepth.get(0)?.length ?? 0) === 0) {
    const rootNode = buildPreviewFounderUniverseNode({
      depth: 0,
      index: 0,
      parentNodeId: null,
      star,
    });
    nodesById.set(rootNode.nodeId, rootNode);
    rebuildDepthIndex();
  }

  for (const [depthText, targetCount] of Object.entries(
    previewUniverseNodeTargets,
  )) {
    const depth = Number(depthText);

    if (depth === 0) {
      continue;
    }

    let currentNodes = nodesByDepth.get(depth) ?? [];
    const parentNodes = nodesByDepth.get(depth - 1) ?? [];

    if (parentNodes.length === 0) {
      continue;
    }

    while (currentNodes.length < targetCount) {
      const index = currentNodes.length;
      const parentNode = parentNodes[index % parentNodes.length];
      const previewNode = buildPreviewFounderUniverseNode({
        depth,
        index,
        parentNodeId: parentNode?.nodeId ?? null,
        star,
      });

      if (nodesById.has(previewNode.nodeId)) {
        break;
      }

      nodesById.set(previewNode.nodeId, previewNode);

      if (parentNode) {
        parentNode.childNodeIds.push(previewNode.nodeId);
        parentNode.directChildrenCount = parentNode.childNodeIds.length;
        nextEdges.push({
          sourceNodeId: parentNode.nodeId,
          targetNodeId: previewNode.nodeId,
        });
      }

      rebuildDepthIndex();
      currentNodes = nodesByDepth.get(depth) ?? [];
    }
  }

  const enrichedNodes = Array.from(nodesById.values()).sort(
    (left, right) =>
      left.depth - right.depth ||
      left.role.localeCompare(right.role) ||
      left.label.localeCompare(right.label),
  );
  const spawnedById = new Map(
    spawnedStars.map((spawnedStar) => [spawnedStar.id, spawnedStar]),
  );
  const creatorCandidates = enrichedNodes.filter(
    (node) => node.depth > 0 && node.depth <= 3,
  );

  for (
    let index = 0;
    spawnedById.size < 3 && index < previewSpawnedStarNames.length;
    index += 1
  ) {
    const creatorNode =
      creatorCandidates[index % Math.max(creatorCandidates.length, 1)] ??
      enrichedNodes.find((node) => node.isCreator) ??
      enrichedNodes[0] ??
      null;
    const spawnedName = `${previewSpawnedStarNames[index]} ${compactText(
      star.characterName,
      star.displayName,
    )}`;
    const spawnedId = `preview-${star.starId}-${previewSpawnedStarNames[
      index
    ].toLowerCase()}`;

    spawnedById.set(spawnedId, {
      createdAt: getPreviewDate(star.starId, 7, index),
      creatorDepth: creatorNode?.depth ?? null,
      creatorLabel: creatorNode?.label ?? null,
      creatorNodeId: creatorNode?.nodeId ?? null,
      creatorRole: creatorNode?.role ?? null,
      directSpawnedStars: index === 0 ? 2 : 0,
      growthPercent: 8 + index * 3,
      id: spawnedId,
      name: spawnedName,
      ownerLabel: "Creator",
      portraitImageUrl: null,
      starScore: 50 + index * 4,
      status: "draft",
    });
  }

  return {
    edges: nextEdges,
    nodes: enrichedNodes,
    spawnedStars: Array.from(spawnedById.values()),
  };
}

export async function getFanletterFounderUniverseExplorer(
  starIdInput: string,
): Promise<FanletterFounderUniverseExplorerData | null> {
  const starId = normalizeFanletterStarId(starIdInput);

  if (!starId) {
    return null;
  }

  const [
    starsCollection,
    membershipsCollection,
    referralEdgesCollection,
    referralCodesCollection,
    membersCollection,
  ] = await Promise.all([
    getFanletterStarsCollection(),
    getFanletterStarFounderMembershipsCollection(),
    getFanletterStarReferralEdgesCollection(),
    getFanletterStarReferralCodesCollection(),
    getMembersCollection(),
  ]);
  const [star, memberships, referralEdges, referralCodes, spawnedStars] =
    await Promise.all([
      starsCollection.findOne({
        starId,
        status: { $ne: "archived" },
      }),
      membershipsCollection
        .find({ starId })
        .sort({ joinedAt: 1, memberEmail: 1 })
        .toArray(),
      referralEdgesCollection
        .find({ starId })
        .sort({ createdAt: 1, targetMemberEmail: 1 })
        .toArray(),
      referralCodesCollection
        .find(
          { starId, status: "active" },
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
      starsCollection
        .find(
          {
            spawnedFromStarId: starId,
            status: { $ne: "archived" },
          },
          {
            projection: {
              characterName: 1,
              createdAt: 1,
              displayName: 1,
              founderCount: 1,
              growthPercent: 1,
              ownerEmail: 1,
              portraitImageUrl: 1,
              starScore: 1,
              starId: 1,
              status: 1,
            },
          },
        )
        .sort({ createdAt: -1 })
        .limit(24)
        .toArray(),
    ]);

  if (!star) {
    return null;
  }

  const spawnedStarIds = spawnedStars.map((spawnedStar) => spawnedStar.starId);
  const spawnedChildCountRows = spawnedStarIds.length
    ? await starsCollection
        .aggregate<{ _id: string; count: number }>([
          {
            $match: {
              spawnedFromStarId: { $in: spawnedStarIds },
              status: { $ne: "archived" },
            },
          },
          {
            $group: {
              _id: "$spawnedFromStarId",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray()
    : [];
  const spawnedChildCountByStarId = new Map(
    spawnedChildCountRows.map((row) => [row._id, row.count]),
  );

  const creatorEmail = getCreatorEmail({ memberships, star });
  const {
    childrenByEmail,
    depthByEmail,
    parentByEmail,
  } = buildDepthAndParentMaps({
    creatorEmail,
    edges: referralEdges,
  });
  const membershipByEmail = new Map(
    memberships.map((membership) => [
      normalizeEmail(membership.memberEmail),
      membership,
    ]),
  );
  const starReferralCodeByEmail = new Map(
    referralCodes.map((referralCode) => [
      normalizeEmail(referralCode.memberEmail),
      normalizeReferralCode(referralCode.code),
    ]),
  );
  const memberEmails = [
    ...new Set([
      ...memberships.map((membership) => normalizeEmail(membership.memberEmail)),
      ...referralEdges.flatMap((edge) => [
        normalizeEmail(edge.sourceMemberEmail),
        normalizeEmail(edge.targetMemberEmail),
      ]),
      ...spawnedStars.map((spawnedStar) =>
        normalizeEmail(spawnedStar.ownerEmail ?? ""),
      ),
    ]),
  ].filter(Boolean);
  const memberProfiles = memberEmails.length
    ? await membersCollection
        .find(
          { email: { $in: memberEmails } },
          {
            projection: {
              email: 1,
              publicProfile: 1,
              referralCode: 1,
              status: 1,
            },
          },
        )
        .toArray()
    : [];
  const memberProfileByEmail = new Map(
    memberProfiles.map((member) => [normalizeEmail(member.email), member]),
  );
  const nodeEmails = [
    ...new Set([
      ...memberEmails,
      ...(creatorEmail ? [creatorEmail] : []),
    ]),
  ];
  const nodeIdByEmail = new Map(
    nodeEmails.map((email) => [email, getStableNodeId(email)]),
  );
  const edges: FanletterFounderUniverseExplorerEdge[] = referralEdges
    .map((edge) => {
      const sourceEmail = normalizeEmail(edge.sourceMemberEmail);
      const targetEmail = normalizeEmail(edge.targetMemberEmail);
      const sourceNodeId = nodeIdByEmail.get(sourceEmail);
      const targetNodeId = nodeIdByEmail.get(targetEmail);

      return sourceNodeId && targetNodeId
        ? {
            sourceNodeId,
            targetNodeId,
          }
        : null;
    })
    .filter(
      (edge): edge is FanletterFounderUniverseExplorerEdge => edge !== null,
    );
  const nodes = nodeEmails
    .map((email): FanletterFounderUniverseExplorerNode | null => {
      const membership = membershipByEmail.get(email);

      if (!membership) {
        return null;
      }

      const nodeId = nodeIdByEmail.get(email);

      if (!nodeId) {
        return null;
      }

      const memberProfile = memberProfileByEmail.get(email);
      const role = membership.role;
      const fallbackDepth = getMembershipRoleDepth(role);
      const depth = depthByEmail.get(email) ?? fallbackDepth ?? 6;
      const parentEmail = parentByEmail.get(email) ?? null;
      const childNodeIds = (childrenByEmail.get(email) ?? [])
        .map((childEmail) => nodeIdByEmail.get(childEmail))
        .filter((childNodeId): childNodeId is string => Boolean(childNodeId));
      const memberReferralCode =
        normalizeReferralCode(membership.memberReferralCode) ??
        normalizeReferralCode(memberProfile?.referralCode);
      const starReferralCode = starReferralCodeByEmail.get(email) ?? null;
      const label = getMemberLabel({
        member: memberProfile,
        memberReferralCode,
        nodeId,
      });
      const memberId = getMemberId({
        email,
        memberReferralCode,
        nodeId,
      });

      return {
        childNodeIds,
        depth,
        directChildrenCount: childNodeIds.length,
        initials: getInitials(label),
        isCreator: role === "creator" || email === creatorEmail,
        joinedAt: toIsoStringOrNull(membership.joinedAt),
        label,
        memberId,
        memberReferralCode,
        nodeId,
        parentNodeId: parentEmail ? nodeIdByEmail.get(parentEmail) ?? null : null,
        role,
        searchText: [
          memberId,
          label,
          memberReferralCode,
          starReferralCode,
          role,
          getFanletterFounderUniverseTier(depth)?.role,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
        source: membership.source ?? null,
        starReferralCode,
      };
    })
    .filter((node): node is FanletterFounderUniverseExplorerNode => node !== null)
    .sort(
      (left, right) =>
        left.depth - right.depth ||
        left.role.localeCompare(right.role) ||
        left.label.localeCompare(right.label),
    );
  const serializedSpawnedStars = spawnedStars.map((spawnedStar) => {
    const ownerEmail = normalizeEmail(spawnedStar.ownerEmail ?? "");
    const ownerMembership = ownerEmail
      ? membershipByEmail.get(ownerEmail) ?? null
      : null;
    const ownerNodeId = ownerEmail ? nodeIdByEmail.get(ownerEmail) ?? null : null;
    const ownerProfile = ownerEmail
      ? memberProfileByEmail.get(ownerEmail) ?? null
      : null;
    const ownerReferralCode =
      normalizeReferralCode(ownerMembership?.memberReferralCode) ??
      normalizeReferralCode(ownerProfile?.referralCode);
    const creatorDepth =
      ownerEmail && depthByEmail.has(ownerEmail)
        ? depthByEmail.get(ownerEmail) ?? null
        : ownerMembership
          ? getMembershipRoleDepth(ownerMembership.role)
          : null;

    return {
      createdAt: toIsoStringOrNull(spawnedStar.createdAt),
      creatorDepth,
      creatorLabel: ownerEmail
        ? getMemberLabel({
            member: ownerProfile,
            memberReferralCode: ownerReferralCode,
            nodeId: ownerNodeId ?? getStableNodeId(ownerEmail),
          })
        : null,
      creatorNodeId: ownerNodeId,
      creatorRole: ownerMembership?.role ?? null,
      directSpawnedStars: spawnedChildCountByStarId.get(spawnedStar.starId) ?? 0,
      growthPercent: spawnedStar.growthPercent,
      id: spawnedStar.starId,
      name: spawnedStar.characterName || spawnedStar.displayName,
      ownerLabel: ownerEmail ? "Creator" : null,
      portraitImageUrl: spawnedStar.portraitImageUrl ?? null,
      starScore: spawnedStar.starScore,
      status: spawnedStar.status,
    };
  });
  const enrichedUniverse = enrichFounderUniverseExplorerPreview({
    edges,
    nodes,
    spawnedStars: serializedSpawnedStars,
    star,
  });
  const nodeCountByDepth = new Map<number, number>();

  for (const node of enrichedUniverse.nodes) {
    nodeCountByDepth.set(node.depth, (nodeCountByDepth.get(node.depth) ?? 0) + 1);
  }

  const [accentColor, accentSecondary] = getAccentPair(star.starId);
  const totalCapacity = fanletterFounderUniverseTiers.reduce(
    (sum, tier) => sum + tier.capacity,
    0,
  );

  return {
    edges: enrichedUniverse.edges,
    generatedAt: new Date().toISOString(),
    nodes: enrichedUniverse.nodes,
    spawnedStars: enrichedUniverse.spawnedStars,
    star: {
      accentColor,
      accentSecondary,
      displayName: star.displayName,
      founderCount: Math.max(0, nodes.length - 1),
      growthPercent: star.growthPercent,
      id: star.starId,
      initials: getStarInitials(star),
      name: star.characterName,
      openSlots: Math.max(0, totalCapacity - nodes.length),
      portraitImageUrl: star.portraitImageUrl ?? null,
      starScore: star.starScore,
      status: star.status,
      universeName: `${star.characterName} Universe`,
    },
    tiers: fanletterFounderUniverseTiers.map((tier) => {
      const memberCount = nodeCountByDepth.get(tier.depth) ?? 0;

      return {
        capacity: tier.capacity,
        cpPoolReward: tier.cpPoolReward,
        depth: tier.depth,
        memberCount,
        openSlots: Math.max(0, tier.capacity - memberCount),
        role: tier.role,
      };
    }),
    totals: {
      activeReferralCodes: referralCodes.length,
      edgeCount: enrichedUniverse.edges.length,
      maxDepth: Math.max(0, ...enrichedUniverse.nodes.map((node) => node.depth)),
      rootResolved: Boolean(creatorEmail && depthByEmail.has(creatorEmail)),
      spawnedStars: enrichedUniverse.spawnedStars.length,
      totalCapacity,
      totalMembers: enrichedUniverse.nodes.length,
    },
  };
}
