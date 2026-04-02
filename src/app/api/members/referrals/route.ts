import { getMembersCollection, getReferralRewardsCollection } from "@/lib/mongodb";
import type { MemberReferralsResponse } from "@/lib/member";
import {
  REFERRAL_REWARD_HISTORY_LIMIT,
  REFERRAL_TREE_DEPTH_LIMIT,
  createEmptyReferralRewardsSummary,
  normalizeEmail,
  serializeMember,
  serializeReferralReward,
  serializeReferralTreeNode,
  type MemberDocument,
  type ReferralRewardsSummaryRecord,
  type ReferralTreeNodeRecord,
} from "@/lib/member";
import { syncReferralRewardsForCompletedNetwork } from "@/lib/member-service";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function finalizeReferralCounts(nodes: ReferralTreeNodeRecord[]): number {
  let total = 0;

  for (const node of nodes) {
    const descendantCount = finalizeReferralCounts(node.children);
    node.directReferralCount = node.children.length;
    node.totalReferralCount = descendantCount;
    total += 1 + descendantCount;
  }

  return total;
}

async function buildReferralTree(
  member: MemberDocument,
): Promise<{
  levelCounts: number[];
  referrals: ReferralTreeNodeRecord[];
  totalReferrals: number;
}> {
  if (!member.referralCode) {
    return {
      levelCounts: [],
      referrals: [],
      totalReferrals: 0,
    };
  }

  const collection = await getMembersCollection();
  const referrals: ReferralTreeNodeRecord[] = [];
  const levelCounts: number[] = [];
  const visitedReferralCodes = new Set<string>([member.referralCode]);
  let currentParentCodes = [member.referralCode];
  let parentNodesByCode = new Map<string, ReferralTreeNodeRecord>();

  for (
    let depth = 1;
    depth <= REFERRAL_TREE_DEPTH_LIMIT && currentParentCodes.length > 0;
    depth += 1
  ) {
    const levelMembers = await collection
      .find({
        referredByCode: { $in: currentParentCodes },
        status: "completed",
      })
      .sort({ registrationCompletedAt: -1, createdAt: -1 })
      .toArray();

    if (levelMembers.length === 0) {
      break;
    }

    levelCounts.push(levelMembers.length);

    const nextParentNodesByCode = new Map<string, ReferralTreeNodeRecord>();
    const nodesByParentCode = new Map<string, ReferralTreeNodeRecord[]>();

    for (const levelMember of levelMembers) {
      const node = serializeReferralTreeNode(levelMember, depth);
      const parentCode = levelMember.referredByCode ?? "";
      const siblings = nodesByParentCode.get(parentCode) ?? [];

      siblings.push(node);
      nodesByParentCode.set(parentCode, siblings);

      if (
        levelMember.referralCode &&
        !visitedReferralCodes.has(levelMember.referralCode)
      ) {
        nextParentNodesByCode.set(levelMember.referralCode, node);
        visitedReferralCodes.add(levelMember.referralCode);
      }
    }

    if (depth === 1) {
      referrals.push(...(nodesByParentCode.get(member.referralCode) ?? []));
    } else {
      for (const parentCode of currentParentCodes) {
        const parentNode = parentNodesByCode.get(parentCode);

        if (parentNode) {
          parentNode.children = nodesByParentCode.get(parentCode) ?? [];
        }
      }
    }

    currentParentCodes = [...nextParentNodesByCode.keys()];
    parentNodesByCode = nextParentNodesByCode;
  }

  return {
    levelCounts,
    referrals,
    totalReferrals: finalizeReferralCounts(referrals),
  };
}

async function buildReferralRewardsSummary(
  member: MemberDocument,
): Promise<ReferralRewardsSummaryRecord> {
  const summary = createEmptyReferralRewardsSummary();
  const collection = await getReferralRewardsCollection();
  const [history, levelRows] = await Promise.all([
    collection
      .find({ recipientEmail: member.email })
      .sort({ awardedAt: -1, createdAt: -1 })
      .limit(REFERRAL_REWARD_HISTORY_LIMIT)
      .toArray(),
    collection
      .aggregate<{
        _id: number;
        points: number;
        rewards: number;
      }>([
        {
          $match: {
            recipientEmail: member.email,
          },
        },
        {
          $group: {
            _id: "$level",
            points: {
              $sum: "$points",
            },
            rewards: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ])
      .toArray(),
  ]);

  summary.history = history.map(serializeReferralReward);

  for (const row of levelRows) {
    const index = row._id - 1;

    if (index < 0 || index >= summary.pointsByLevel.length) {
      continue;
    }

    summary.pointsByLevel[index] = row.points;
    summary.totalPoints += row.points;
    summary.totalRewards += row.rewards;
  }

  return summary;
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

    await syncReferralRewardsForCompletedNetwork(member);
    const nextMember = await collection.findOne({ email: member.email });

    if (!nextMember || nextMember.status !== "completed" || !nextMember.referralCode) {
      return jsonError("Member signup is not complete.", 403);
    }

    const [referralTree, rewards] = await Promise.all([
      buildReferralTree(nextMember),
      buildReferralRewardsSummary(nextMember),
    ]);

    const response: MemberReferralsResponse = {
      levelCounts: referralTree.levelCounts,
      member: serializeMember(nextMember),
      referrals: referralTree.referrals,
      rewards,
      totalReferrals: referralTree.totalReferrals,
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read referrals.";

    return jsonError(message, 500);
  }
}
