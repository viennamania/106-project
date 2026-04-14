import { getMembersCollection } from "@/lib/mongodb";
import { normalizeEmail, serializeMember } from "@/lib/member";
import { getPointsSummaryForMember } from "@/lib/points-service";
import type { PointsSummaryResponse } from "@/lib/points";

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

    const response: PointsSummaryResponse = {
      member: serializeMember(member),
      summary: await getPointsSummaryForMember(member),
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read points summary.";

    return jsonError(message, 500);
  }
}
