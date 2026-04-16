import { startActivityTapSession } from "@/lib/activity-service";
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

    const result = await startActivityTapSession(member);

    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to start tap session.";
    const status =
      message === "Daily tap reward limit reached." ? 409 : 500;

    return jsonError(message, status);
  }
}
