import { getActivitySummaryForMember } from "@/lib/activity-service";
import { getMemberRegistrationStatus } from "@/lib/member-service";

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
    const member = await getMemberRegistrationStatus(rawEmail);

    if (!member) {
      return jsonError("Member not found.", 404);
    }

    if (member.status !== "completed") {
      return jsonError("Completed signup is required.", 403);
    }

    return Response.json({
      summary: await getActivitySummaryForMember(member),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load activity summary.";

    return jsonError(message, 500);
  }
}
