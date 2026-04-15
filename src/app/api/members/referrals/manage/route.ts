import {
  getMembersCollection,
  getPointBalancesCollection,
} from "@/lib/mongodb";
import type {
  ManagedMemberReferralsResponse,
  ManagedReferralTreeNodeRecord,
} from "@/lib/member";
import {
  createEmptyReferralNetworkSummary,
  normalizeEmail,
  serializeMember,
  serializeReferralMember,
  REFERRAL_TREE_DEPTH_LIMIT,
  type MemberDocument,
} from "@/lib/member";
import type { PointBalanceDocument } from "@/lib/points";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function createManagedReferralNode(
  member: MemberDocument,
  depth: number,
  balance?: PointBalanceDocument | null,
): ManagedReferralTreeNodeRecord {
  return {
    ...serializeReferralMember(member),
    children: [],
    depth,
    directReferralCount: 0,
    lifetimePoints: balance?.lifetimePoints ?? 0,
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
  const pointBalancesCollection = await getPointBalancesCollection();
  const pointBalances =
    descendantEmails.length > 0
      ? await pointBalancesCollection
          .find({ memberEmail: { $in: descendantEmails } })
          .toArray()
      : [];
  const balanceByEmail = new Map(
    pointBalances.map((balance) => [normalizeEmail(balance.memberEmail), balance]),
  );

  const referrals: ManagedReferralTreeNodeRecord[] = [];
  const members: ManagedReferralTreeNodeRecord[] = [];
  const nodesByReferralCode = new Map<string, ManagedReferralTreeNodeRecord>();

  for (const { depth, member: levelMember } of collectedMembers) {
    const node = createManagedReferralNode(
      levelMember,
      depth,
      balanceByEmail.get(normalizeEmail(levelMember.email)),
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

    const network = await buildManagedReferralTree(member);

    const response: ManagedMemberReferralsResponse = {
      levelCounts: network.levelCounts,
      member: serializeMember(member),
      members: network.members,
      referrals: network.referrals,
      summary: network.summary,
      totalReferrals: network.totalReferrals,
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to read referral network management data.";

    return jsonError(message, 500);
  }
}
