import {
  getFanletterStarsCollection,
  getMembersCollection,
  getPointBalancesCollection,
  getPointLedgerCollection,
  getReferralPlacementSlotsCollection,
  getRewardRedemptionsCollection,
} from "@/lib/mongodb";
import {
  getMemberServiceSuspensionStatus,
  SERVICE_SUSPENDED_ERROR_MESSAGE,
} from "@/lib/member-suspension";
import type {
  ManagedMemberAIStarRecord,
  ManagedMemberReferralsResponse,
  ReferralMembershipCardTier,
  ManagedReferralTreeNodeRecord,
} from "@/lib/member";
import {
  createEmptyReferralNetworkSummary,
  normalizeEmail,
  serializeMember,
  serializeReferralMember,
  REFERRAL_TREE_DEPTH_LIMIT,
  type ServiceSuspensionScope,
  type MemberDocument,
} from "@/lib/member";
import { validateMemberWalletOwner } from "@/lib/member-owner";
import type { FanletterStarDocument } from "@/lib/fanletter-founder-club";
import type { PointBalanceDocument } from "@/lib/points";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function dateToISOString(value: Date | string | null | undefined) {
  const date = value instanceof Date ? value : new Date(value ?? "");

  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function serializeManagedMemberAIStar(
  star: FanletterStarDocument,
): ManagedMemberAIStarRecord {
  return {
    createdAt: dateToISOString(star.createdAt),
    name: star.characterName || star.displayName || "AI 스타",
    portraitImageUrl: star.portraitImageUrl ?? null,
    source: star.source ?? null,
    starId: star.starId,
    starScore: star.starScore ?? 0,
    status: star.status,
  };
}

function getManagedMemberAIStarPriority(star: ManagedMemberAIStarRecord) {
  if (star.status === "active") {
    return 0;
  }

  if (star.status === "draft") {
    return 1;
  }

  return 2;
}

function shouldUseManagedMemberAIStar(
  candidate: ManagedMemberAIStarRecord,
  current: ManagedMemberAIStarRecord | undefined,
) {
  if (!current) {
    return true;
  }

  const candidatePriority = getManagedMemberAIStarPriority(candidate);
  const currentPriority = getManagedMemberAIStarPriority(current);

  if (candidatePriority !== currentPriority) {
    return candidatePriority < currentPriority;
  }

  if (candidate.starScore !== current.starScore) {
    return candidate.starScore > current.starScore;
  }

  return Date.parse(candidate.createdAt) > Date.parse(current.createdAt);
}

function createManagedReferralNode(
  member: MemberDocument,
  depth: number,
  balance?: PointBalanceDocument | null,
  membershipCardTier: ReferralMembershipCardTier = "none",
  placementSlotIndex: number | null = null,
  ownedAIStar: ManagedMemberAIStarRecord | null = null,
): ManagedReferralTreeNodeRecord {
  return {
    ...serializeReferralMember(member),
    children: [],
    depth,
    directReferralCount: 0,
    lifetimePoints: balance?.lifetimePoints ?? 0,
    membershipCardTier,
    ownedAIStar,
    placementSlotIndex,
    spendablePoints: balance?.spendablePoints ?? 0,
    status: member.status,
    tier: balance?.tier ?? "basic",
    totalReferralCount: 0,
  };
}

function finalizeManagedReferralCounts(nodes: ManagedReferralTreeNodeRecord[]) {
  let total = 0;

  for (const node of nodes) {
    const descendantCount = finalizeManagedReferralCounts(node.children);
    node.directReferralCount = node.children.length;
    node.totalReferralCount = descendantCount;
    total += 1 + descendantCount;
  }

  return total;
}

function buildReferralNetworkSummary(
  nodes: ManagedReferralTreeNodeRecord[],
  directMembers: number,
  pointSourceSummary: {
    totalContentBonusPoints: number;
    totalOtherPoints: number;
    totalReferralRewardPoints: number;
  },
) {
  const summary = createEmptyReferralNetworkSummary();

  summary.directMembers = directMembers;
  summary.totalContentBonusPoints = pointSourceSummary.totalContentBonusPoints;
  summary.totalOtherPoints = pointSourceSummary.totalOtherPoints;
  summary.totalReferralRewardPoints =
    pointSourceSummary.totalReferralRewardPoints;

  for (const node of nodes) {
    summary.totalMembers += 1;
    summary.totalSpendablePoints += node.spendablePoints;
    summary.totalLifetimePoints += node.lifetimePoints;
    summary.tierCounts[node.tier] += 1;
  }

  return summary;
}

async function getReferralNetworkPointSourceSummary(memberEmails: string[]) {
  if (memberEmails.length === 0) {
    return {
      totalContentBonusPoints: 0,
      totalOtherPoints: 0,
      totalReferralRewardPoints: 0,
    };
  }

  const ledgerCollection = await getPointLedgerCollection();
  const rows = await ledgerCollection
    .aggregate<{
      _id: string | null;
      points: number;
    }>([
      {
        $match: {
          memberEmail: { $in: memberEmails },
          type: "earn",
        },
      },
      {
        $group: {
          _id: "$sourceType",
          points: {
            $sum: {
              $cond: [{ $gt: ["$delta", 0] }, "$delta", 0],
            },
          },
        },
      },
    ])
    .toArray();
  const bySourceType = new Map(
    rows.map((row) => [row._id ?? "unknown", row.points]),
  );
  const totalReferralRewardPoints =
    bySourceType.get("referral_reward") ?? 0;
  const totalContentBonusPoints = bySourceType.get("bonus") ?? 0;
  const totalEarnedPoints = rows.reduce((sum, row) => sum + row.points, 0);

  return {
    totalContentBonusPoints,
    totalOtherPoints: Math.max(
      totalEarnedPoints - totalReferralRewardPoints - totalContentBonusPoints,
      0,
    ),
    totalReferralRewardPoints,
  };
}

function findManagedReferralNode(
  nodes: ManagedReferralTreeNodeRecord[],
  targetEmail: string,
): ManagedReferralTreeNodeRecord | null {
  for (const node of nodes) {
    if (normalizeEmail(node.email) === targetEmail) {
      return node;
    }

    const nestedMatch = findManagedReferralNode(node.children, targetEmail);

    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return null;
}

function collectManagedReferralEmails(
  node: ManagedReferralTreeNodeRecord,
): string[] {
  return [
    normalizeEmail(node.email),
    ...node.children.flatMap((child) => collectManagedReferralEmails(child)),
  ];
}

async function buildManagedReferralTree(
  member: MemberDocument,
): Promise<{
  levelCounts: number[];
  members: ManagedReferralTreeNodeRecord[];
  referrals: ManagedReferralTreeNodeRecord[];
  summary: ReturnType<typeof createEmptyReferralNetworkSummary>;
  totalReferrals: number;
}> {
  if (!member.referralCode) {
    return {
      levelCounts: [],
      members: [],
      referrals: [],
      summary: createEmptyReferralNetworkSummary(),
      totalReferrals: 0,
    };
  }

  const collection = await getMembersCollection();
  const levelCounts: number[] = [];
  const collectedMembers: Array<{ depth: number; member: MemberDocument }> = [];
  const visitedReferralCodes = new Set<string>([member.referralCode]);
  let currentParentCodes = [member.referralCode];

  for (
    let depth = 1;
    depth <= REFERRAL_TREE_DEPTH_LIMIT && currentParentCodes.length > 0;
    depth += 1
  ) {
    const levelMembers = await collection
      .find({
        placementReferralCode: { $in: currentParentCodes },
        status: "completed",
      })
      .sort({ registrationCompletedAt: -1, createdAt: -1 })
      .toArray();

    if (levelMembers.length === 0) {
      break;
    }

    levelCounts.push(levelMembers.length);
    collectedMembers.push(
      ...levelMembers.map((levelMember) => ({
        depth,
        member: levelMember,
      })),
    );

    const nextParentCodes: string[] = [];

    for (const levelMember of levelMembers) {
      if (
        levelMember.referralCode &&
        !visitedReferralCodes.has(levelMember.referralCode)
      ) {
        visitedReferralCodes.add(levelMember.referralCode);
        nextParentCodes.push(levelMember.referralCode);
      }
    }

    currentParentCodes = nextParentCodes;
  }

  const descendantEmails = [...new Set(collectedMembers.map(({ member: levelMember }) =>
    normalizeEmail(levelMember.email),
  ))];
  const [
    pointBalancesCollection,
    rewardRedemptionsCollection,
    referralPlacementSlotsCollection,
    fanletterStarsCollection,
    pointSourceSummary,
  ] = await Promise.all([
    getPointBalancesCollection(),
    getRewardRedemptionsCollection(),
    getReferralPlacementSlotsCollection(),
    getFanletterStarsCollection(),
    getReferralNetworkPointSourceSummary(descendantEmails),
  ]);
  let pointBalances: PointBalanceDocument[] = [];
  let tierRewardRedemptions: Array<{
    memberEmail: string;
    rewardId: "silver-card" | "gold-card";
  }> = [];
  let placementSlots: Array<{ claimedByEmail: string; slotIndex: number }> = [];
  let ownedAIStars: FanletterStarDocument[] = [];

  if (descendantEmails.length > 0) {
    [
      pointBalances,
      tierRewardRedemptions,
      placementSlots,
      ownedAIStars,
    ] = await Promise.all([
      pointBalancesCollection
        .find({ memberEmail: { $in: descendantEmails } })
        .toArray(),
      rewardRedemptionsCollection
        .find({
          memberEmail: { $in: descendantEmails },
          rewardId: { $in: ["silver-card", "gold-card"] },
          status: "completed",
        })
        .project<{ memberEmail: string; rewardId: "silver-card" | "gold-card" }>({
          memberEmail: 1,
          rewardId: 1,
        })
        .toArray(),
      referralPlacementSlotsCollection
        .find({ claimedByEmail: { $in: descendantEmails } })
        .project<{ claimedByEmail: string; slotIndex: number }>({
          claimedByEmail: 1,
          slotIndex: 1,
        })
        .toArray(),
      fanletterStarsCollection
        .find({
          ownerEmail: { $in: descendantEmails },
          status: { $ne: "archived" },
        })
        .sort({ status: 1, starScore: -1, createdAt: -1 })
        .toArray(),
    ]);
  }
  const balanceByEmail = new Map(
    pointBalances.map((balance) => [normalizeEmail(balance.memberEmail), balance]),
  );
  const placementSlotIndexByEmail = new Map(
    placementSlots.map((slot) => [normalizeEmail(slot.claimedByEmail), slot.slotIndex]),
  );
  const membershipCardTierByEmail = new Map<string, ReferralMembershipCardTier>();
  const ownedAIStarByEmail = new Map<string, ManagedMemberAIStarRecord>();

  for (const redemption of tierRewardRedemptions) {
    const memberEmail = normalizeEmail(redemption.memberEmail);
    const candidateTier = redemption.rewardId === "gold-card" ? "gold" : "silver";
    const currentTier = membershipCardTierByEmail.get(memberEmail) ?? "none";

    if (currentTier === "gold" || currentTier === candidateTier) {
      continue;
    }

    membershipCardTierByEmail.set(memberEmail, candidateTier);
  }

  for (const ownedAIStar of ownedAIStars) {
    const ownerEmail = normalizeEmail(ownedAIStar.ownerEmail ?? "");

    if (!ownerEmail) {
      continue;
    }

    const serializedAIStar = serializeManagedMemberAIStar(ownedAIStar);
    const currentAIStar = ownedAIStarByEmail.get(ownerEmail);

    if (shouldUseManagedMemberAIStar(serializedAIStar, currentAIStar)) {
      ownedAIStarByEmail.set(ownerEmail, serializedAIStar);
    }
  }

  const referrals: ManagedReferralTreeNodeRecord[] = [];
  const members: ManagedReferralTreeNodeRecord[] = [];
  const nodesByReferralCode = new Map<string, ManagedReferralTreeNodeRecord>();

  for (const { depth, member: levelMember } of collectedMembers) {
    const node = createManagedReferralNode(
      levelMember,
      depth,
      balanceByEmail.get(normalizeEmail(levelMember.email)),
      membershipCardTierByEmail.get(normalizeEmail(levelMember.email)) ?? "none",
      placementSlotIndexByEmail.get(normalizeEmail(levelMember.email)) ?? null,
      ownedAIStarByEmail.get(normalizeEmail(levelMember.email)) ?? null,
    );

    members.push(node);

    if (
      depth === 1 &&
      levelMember.placementReferralCode === member.referralCode
    ) {
      referrals.push(node);
    } else {
      const parentCode = levelMember.placementReferralCode ?? "";
      const parentNode = nodesByReferralCode.get(parentCode);

      if (parentNode) {
        parentNode.children.push(node);
      }
    }

    if (levelMember.referralCode) {
      nodesByReferralCode.set(levelMember.referralCode, node);
    }
  }

  const totalReferrals = finalizeManagedReferralCounts(referrals);
  const sortedMembers = [...members].sort((left, right) => {
    if (right.lifetimePoints !== left.lifetimePoints) {
      return right.lifetimePoints - left.lifetimePoints;
    }

    if (right.spendablePoints !== left.spendablePoints) {
      return right.spendablePoints - left.spendablePoints;
    }

    return (
      new Date(right.lastConnectedAt).getTime() -
      new Date(left.lastConnectedAt).getTime()
    );
  });

  return {
    levelCounts,
    members: sortedMembers,
    referrals,
    summary: buildReferralNetworkSummary(
      sortedMembers,
      referrals.length,
      pointSourceSummary,
    ),
    totalReferrals,
  };
}

async function createManagedReferralResponse(
  member: MemberDocument,
): Promise<ManagedMemberReferralsResponse> {
  const network = await buildManagedReferralTree(member);

  return {
    levelCounts: network.levelCounts,
    member: serializeMember(member),
    members: network.members,
    referrals: network.referrals,
    summary: network.summary,
    totalReferrals: network.totalReferrals,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email");

  if (!rawEmail) {
    return jsonError("email query parameter is required.", 400);
  }

  try {
    const collection = await getMembersCollection();
    const member = await collection.findOne({ email: normalizeEmail(rawEmail) });

    if (!member) {
      return jsonError("Member not found.", 404);
    }

    if (member.status !== "completed" || !member.referralCode) {
      return jsonError("Member signup is not complete.", 403);
    }

    const suspension = await getMemberServiceSuspensionStatus(collection, member);

    if (suspension) {
      return jsonError(SERVICE_SUSPENDED_ERROR_MESSAGE, 403);
    }

    return Response.json(await createManagedReferralResponse(member));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to read referral network management data.";

    return jsonError(message, 500);
  }
}

type ManageReferralServiceStatusRequest = {
  action?: "release" | "suspend";
  email?: string;
  scope?: ServiceSuspensionScope;
  targetMemberEmail?: string;
  walletAddress?: string;
};

export async function PATCH(request: Request) {
  let payload: ManageReferralServiceStatusRequest;

  try {
    payload = (await request.json()) as ManageReferralServiceStatusRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const action = payload.action;
  const rawEmail = payload.email;
  const rawTargetMemberEmail = payload.targetMemberEmail;
  const walletAddress = payload.walletAddress;
  const scope = payload.scope;

  if (!rawEmail) {
    return jsonError("email is required.", 400);
  }

  if (!walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  if (!rawTargetMemberEmail) {
    return jsonError("targetMemberEmail is required.", 400);
  }

  if (action !== "suspend" && action !== "release") {
    return jsonError("action must be suspend or release.", 400);
  }

  if (scope !== "member" && scope !== "subtree") {
    return jsonError("scope must be member or subtree.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      email: rawEmail,
      walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const operatorMember = authorization.member;

    if (!operatorMember?.referralCode) {
      return jsonError("Member signup is not complete.", 403);
    }

    const targetEmail = normalizeEmail(rawTargetMemberEmail);
    const operatorNetwork = await buildManagedReferralTree(operatorMember);
    const targetNode = findManagedReferralNode(operatorNetwork.referrals, targetEmail);

    if (!targetNode) {
      return jsonError(
        "The selected member is not managed by this referral network.",
        404,
      );
    }

    const affectedEmails = Array.from(
      new Set(
        scope === "subtree"
          ? collectManagedReferralEmails(targetNode)
          : [targetEmail],
      ),
    );

    const membersCollection = await getMembersCollection();
    const now = new Date();

    if (action === "suspend") {
      await membersCollection.updateMany(
        {
          email: { $in: affectedEmails },
          status: "completed",
        },
        {
          $set: {
            serviceSuspendedAt: now,
            serviceSuspendedByEmail: operatorMember.email,
            serviceSuspendedScope: scope,
            updatedAt: now,
          },
        },
      );
    } else {
      await membersCollection.updateMany(
        {
          email: { $in: affectedEmails },
          status: "completed",
        },
        {
          $set: {
            updatedAt: now,
          },
          $unset: {
            serviceSuspendedAt: "",
            serviceSuspendedByEmail: "",
            serviceSuspendedScope: "",
          },
        },
      );
    }

    const refreshedOperator = await membersCollection.findOne({
      email: operatorMember.email,
    });

    if (!refreshedOperator) {
      return jsonError("Member not found.", 404);
    }

    return Response.json({
      ...(await createManagedReferralResponse(refreshedOperator)),
      action,
      scope,
      updatedCount: affectedEmails.length,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update referral member service status.";

    return jsonError(message, 500);
  }
}
