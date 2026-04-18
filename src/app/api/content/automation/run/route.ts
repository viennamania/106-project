import type {
  ContentAutomationRunRequest,
  ContentAutomationRunResponse,
} from "@/lib/content-automation";
import {
  runContentAutomationForMember,
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
  let body: ContentAutomationRunRequest | null = null;

  try {
    body = (await request.json()) as ContentAutomationRunRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.memberEmail) {
    return jsonError("memberEmail is required.", 400);
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
    return jsonError(message, resolveStatus(message));
  }
}
