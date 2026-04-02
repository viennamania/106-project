import { getMembersCollection } from "@/lib/mongodb";
import type { MemberReferralsResponse } from "@/lib/member";
import {
  REFERRAL_TREE_DEPTH_LIMIT,
  normalizeEmail,
  serializeMember,
  serializeReferralTreeNode,
  type MemberDocument,
  type ReferralTreeNodeRecord,
} from "@/lib/member";

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

    const referralTree = await buildReferralTree(member);

    const response: MemberReferralsResponse = {
      levelCounts: referralTree.levelCounts,
      member: serializeMember(member),
      referrals: referralTree.referrals,
      totalReferrals: referralTree.totalReferrals,
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read referrals.";

    return jsonError(message, 500);
  }
}
