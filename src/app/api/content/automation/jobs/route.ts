import type { ContentAutomationJobsResponse } from "@/lib/content-automation";
import {
  getContentAutomationJobsForMember,
  serializeAutomationMember,
} from "@/lib/content-automation-service";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function resolveStatus(message: string) {
  if (message === "Member not found.") {
    return 404;
  }

  if (
    message === "Completed signup is required." ||
    message === "Content automation is not enabled for this member."
  ) {
    return 403;
  }

  if (message.endsWith("is required.")) {
    return 400;
  }

  return 500;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email");

  if (!rawEmail) {
    return jsonError("email query parameter is required.", 400);
  }

  try {
    const { items, member, profile } = await getContentAutomationJobsForMember(
      rawEmail,
    );
    const response: ContentAutomationJobsResponse = {
      items,
      member: serializeAutomationMember(member),
      profile,
    };
    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load content automation jobs.";
    return jsonError(message, resolveStatus(message));
  }
}
