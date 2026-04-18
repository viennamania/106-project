import type { ContentAutomationJobsResponse } from "@/lib/content-automation";
import {
  getContentAutomationJobsForMember,
  serializeAutomationMember,
} from "@/lib/content-automation-service";
import {
  assertAutomationInternalAccess,
  jsonAutomationError,
} from "@/lib/content-automation-internal";

function resolveStatus(message: string) {
  if (message === "Unauthorized automation request.") {
    return 401;
  }

  if (message === "CONTENT_AUTOMATION_INTERNAL_KEY is not configured.") {
    return 500;
  }

  if (message === "Member not found.") {
    return 404;
  }

  if (message === "Completed signup is required.") {
    return 403;
  }

  if (message.endsWith("is required.")) {
    return 400;
  }

  return 500;
}

export async function GET(request: Request) {
  try {
    assertAutomationInternalAccess(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized automation request.";
    return jsonAutomationError(message, resolveStatus(message));
  }

  const url = new URL(request.url);
  const memberEmail = url.searchParams.get("memberEmail");

  if (!memberEmail) {
    return jsonAutomationError("memberEmail query parameter is required.", 400);
  }

  try {
    const { items, member, profile } = await getContentAutomationJobsForMember(
      memberEmail,
    );
    const response: ContentAutomationJobsResponse = {
      items,
      member: serializeAutomationMember(member),
      profile,
    };
    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load automation jobs.";
    return jsonAutomationError(message, resolveStatus(message));
  }
}
