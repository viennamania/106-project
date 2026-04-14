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

export const runtime = "nodejs";
export const maxDuration = 30;

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

    const redemptionResult = await redeemRewardForMember(member, rawRewardId);
    const response: RewardRedeemResponse = {
      member: serializeMember(member),
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
              message === "Member is not eligible for reward redemptions." ||
              message ===
                "Member does not have a valid wallet address for reward NFT minting."
          ? 400
          : message.includes("not configured") || message.includes("required")
            ? 503
            : 500;

    return jsonError(message, status);
  }
}
