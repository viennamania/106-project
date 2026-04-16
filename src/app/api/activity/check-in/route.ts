import { claimActivityCheckIn } from "@/lib/activity-service";
import { getMemberRegistrationStatus } from "@/lib/member-service";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let payload: { email?: string };

  try {
    payload = (await request.json()) as { email?: string };
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!payload.email) {
    return jsonError("email is required.", 400);
  }

  try {
    const member = await getMemberRegistrationStatus(payload.email);

    if (!member) {
      return jsonError("Member not found.", 404);
    }

    if (member.status !== "completed") {
      return jsonError("Completed signup is required.", 403);
    }

    return Response.json({
      summary: await claimActivityCheckIn(member),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to claim check-in.";

    return jsonError(message, 500);
  }
}
