import { getMembersCollection } from "@/lib/mongodb";
import type { MemberReferralsResponse } from "@/lib/member";
import {
  normalizeEmail,
  serializeMember,
  serializeReferralMember,
} from "@/lib/member";

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

    if (member.status !== "completed" || !member.referralCode) {
      return jsonError("Member signup is not complete.", 403);
    }

    const referrals = await collection
      .find({
        referredByCode: member.referralCode,
        status: "completed",
      })
      .sort({ registrationCompletedAt: -1, createdAt: -1 })
      .toArray();

    const response: MemberReferralsResponse = {
      member: serializeMember(member),
      referrals: referrals.map(serializeReferralMember),
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read referrals.";

    return jsonError(message, 500);
  }
}
