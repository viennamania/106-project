import { getMembersCollection } from "@/lib/mongodb";
import { normalizeEmail } from "@/lib/member";
import type { RewardRedemptionsResponse } from "@/lib/points";
import { getRewardRedemptionsForMember } from "@/lib/points-service";

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
