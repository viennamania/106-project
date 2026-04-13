import { getMembersCollection } from "@/lib/mongodb";
import { normalizeEmail, serializeMember } from "@/lib/member";
import {
  isRewardCatalogId,
  type RewardRedeemRequest,
  type RewardRedeemResponse,
  type RewardRedemptionsResponse,
} from "@/lib/points";
import {
  getRewardRedemptionsForMember,
  redeemRewardForMember,
} from "@/lib/points-service";
import { syncReferralRewardsForCompletedNetwork } from "@/lib/member-service";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
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

    const response: RewardRedemptionsResponse =
      await getRewardRedemptionsForMember(member);

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read reward redemptions.";

    return jsonError(message, 500);
  }
}

export async function POST(request: Request) {
  let body: RewardRedeemRequest | null = null;

  try {
    body = (await request.json()) as RewardRedeemRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const rawEmail = body?.email;
  const rawRewardId = body?.rewardId;

  if (!rawEmail) {
    return jsonError("email is required.", 400);
  }

  if (!rawRewardId || !isRewardCatalogId(rawRewardId)) {
    return jsonError("rewardId is invalid.", 400);
  }

  try {
    const collection = await getMembersCollection();
    const member = await collection.findOne({ email: normalizeEmail(rawEmail) });

    if (!member) {
      return jsonError("Member not found.", 404);
    }

    if (member.status === "completed") {
      await syncReferralRewardsForCompletedNetwork(member);
    }

    const nextMember = await collection.findOne({ email: member.email });

    if (!nextMember) {
      return jsonError("Member not found.", 404);
    }

    const redemptionResult = await redeemRewardForMember(nextMember, rawRewardId);
    const response: RewardRedeemResponse = {
      member: serializeMember(nextMember),
      redemption: redemptionResult.redemption,
      redemptions: redemptionResult.redemptions,
      summary: redemptionResult.summary,
    };

    return Response.json(response, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to redeem reward.";
    const status =
      message === "Reward has already been redeemed for this member."
        ? 409
        : message === "Insufficient points for this reward." ||
            message === "Member is not eligible for reward redemptions."
          ? 400
          : 500;

    return jsonError(message, status);
  }
}
