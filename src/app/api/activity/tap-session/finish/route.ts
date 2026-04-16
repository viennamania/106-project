import { finishActivityTapSession } from "@/lib/activity-service";
import { getMemberRegistrationStatus } from "@/lib/member-service";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let payload: {
    email?: string;
    sessionId?: string;
    tapCount?: number;
  };

  try {
    payload = (await request.json()) as {
      email?: string;
      sessionId?: string;
      tapCount?: number;
    };
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!payload.email || !payload.sessionId) {
    return jsonError("email and sessionId are required.", 400);
  }

  if (
    typeof payload.tapCount !== "number" ||
    !Number.isFinite(payload.tapCount) ||
    payload.tapCount < 0
  ) {
    return jsonError("tapCount must be a non-negative number.", 400);
  }

  try {
    const member = await getMemberRegistrationStatus(payload.email);

    if (!member) {
      return jsonError("Member not found.", 404);
    }

    if (member.status !== "completed") {
      return jsonError("Completed signup is required.", 403);
    }

    return Response.json(
      await finishActivityTapSession(member, {
        sessionId: payload.sessionId,
        tapCount: payload.tapCount,
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to finish tap session.";
    const status = message === "Tap session not found." ? 404 : 500;

    return jsonError(message, status);
  }
}
