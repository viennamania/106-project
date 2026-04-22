import {
  getMembersCollection,
  getPointBalancesCollection,
  getReferralPlacementSlotsCollection,
  getRewardRedemptionsCollection,
} from "@/lib/mongodb";
import type {
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
import type { PointBalanceDocument } from "@/lib/points";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function createManagedReferralNode(
  member: MemberDocument,
  depth: number,
  balance?: PointBalanceDocument | null,
  membershipCardTier: ReferralMembershipCardTier = "none",
  placementSlotIndex: number | null = null,
): ManagedReferralTreeNodeRecord {
  return {
    ...serializeReferralMember(member),
    children: [],
    depth,
    directReferralCount: 0,
    lifetimePoints: balance?.lifetimePoints ?? 0,
    membershipCardTier,
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
) {
  const summary = createEmptyReferralNetworkSummary();

  summary.directMembers = directMembers;

  for (const node of nodes) {
    summary.totalMembers += 1;
    summary.totalSpendablePoints += node.spendablePoints;
    summary.totalLifetimePoints += node.lifetimePoints;
    summary.tierCounts[node.tier] += 1;
  }

  return summary;
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
  ] = await Promise.all([
    getPointBalancesCollection(),
    getRewardRedemptionsCollection(),
    getReferralPlacementSlotsCollection(),
  ]);
  const [pointBalances, tierRewardRedemptions, placementSlots] =
    descendantEmails.length > 0
      ? await Promise.all([
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
        ])
      : [[], [], []];
  const balanceByEmail = new Map(
    pointBalances.map((balance) => [normalizeEmail(balance.memberEmail), balance]),
  );
  const placementSlotIndexByEmail = new Map(
    placementSlots.map((slot) => [normalizeEmail(slot.claimedByEmail), slot.slotIndex]),
  );
  const membershipCardTierByEmail = new Map<string, ReferralMembershipCardTier>();

  for (const redemption of tierRewardRedemptions) {
    const memberEmail = normalizeEmail(redemption.memberEmail);
    const candidateTier = redemption.rewardId === "gold-card" ? "gold" : "silver";
    const currentTier = membershipCardTierByEmail.get(memberEmail) ?? "none";

    if (currentTier === "gold" || currentTier === candidateTier) {
      continue;
    }

    membershipCardTierByEmail.set(memberEmail, candidateTier);
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
    summary: buildReferralNetworkSummary(sortedMembers, referrals.length),
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
