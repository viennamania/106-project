import type {
  ContentAutomationRunRequest,
  ContentAutomationRunResponse,
} from "@/lib/content-automation";
import {
  runContentAutomationForMember,
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

  if (
    message === "CONTENT_AUTOMATION_INTERNAL_KEY is not configured." ||
    message === "OPENAI_API_KEY is not configured."
  ) {
    return 500;
  }

  if (message === "Member not found.") {
    return 404;
  }

  if (message === "Completed signup is required.") {
    return 403;
  }

  if (
    message.endsWith("is required.") ||
    message.includes("Only ") ||
    message.includes("No public sources")
  ) {
    return 400;
  }

  if (
    message.includes("limit") ||
    message.includes("interval") ||
    message.includes("disabled")
  ) {
    return 409;
  }

  return 500;
}

export async function POST(request: Request) {
  try {
    assertAutomationInternalAccess(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unauthorized automation request.";
    return jsonAutomationError(message, resolveStatus(message));
  }

  let body: ContentAutomationRunRequest | null = null;

  try {
    body = (await request.json()) as ContentAutomationRunRequest;
  } catch {
    return jsonAutomationError("Invalid JSON body.", 400);
  }

  if (!body?.memberEmail) {
    return jsonAutomationError("memberEmail is required.", 400);
  }

  try {
    const result = await runContentAutomationForMember(body);
    const response: ContentAutomationRunResponse = {
      content: result.content,
      job: result.job,
      member: serializeAutomationMember(result.member),
      profile: result.profile,
      sources: result.sources,
    };

    return Response.json(response, {
      status: result.job.status === "failed" ? 500 : 200,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to run content automation.";
    return jsonAutomationError(message, resolveStatus(message));
  }
}
