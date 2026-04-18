import type {
  ContentAutomationRunRequest,
  ContentAutomationRunResponse,
} from "@/lib/content-automation";
import {
  getEnabledContentAutomationMemberEmails,
  runContentAutomationForMember,
  runContentAutomationForEnabledMembers,
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

  let body:
    | (Partial<ContentAutomationRunRequest> & {
        mode?: ContentAutomationRunRequest["mode"];
      })
    | null = null;

  try {
    body = (await request.json()) as ContentAutomationRunRequest;
  } catch {
    return jsonAutomationError("Invalid JSON body.", 400);
  }

  try {
    const mode = body?.mode ?? "discover_and_draft";

    if (body?.memberEmail) {
      const result = await runContentAutomationForMember({
        memberEmail: body.memberEmail,
        mode,
      });
      const response: ContentAutomationRunResponse = {
        content: result.content,
        job: result.job,
        member: serializeAutomationMember(result.member),
        profile: result.profile,
        sources: result.sources,
      };

      return Response.json(response);
    }

    const enabledMemberEmails = await getEnabledContentAutomationMemberEmails();
    const batch = await runContentAutomationForEnabledMembers(mode);

    return Response.json({
      items: batch.items.map((item) => ({
        error: item.error,
        memberEmail: item.memberEmail,
        response: item.result
          ? {
              content: item.result.content,
              job: item.result.job,
              member: serializeAutomationMember(item.result.member),
              profile: item.result.profile,
              sources: item.result.sources,
            }
          : null,
      })),
      mode: "batch",
      summary: batch.summary,
      targetMemberEmails: enabledMemberEmails,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to run content automation.";
    return jsonAutomationError(message, resolveStatus(message));
  }
}
