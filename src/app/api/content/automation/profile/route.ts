import type {
  CreatorAutomationProfileResponse,
  CreatorAutomationProfileUpsertRequest,
} from "@/lib/content-automation";
import {
  getCreatorAutomationProfileForMember,
  serializeAutomationMember,
  upsertCreatorAutomationProfileForMember,
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
    const { member, profile } = await getCreatorAutomationProfileForMember(rawEmail);
    const response: CreatorAutomationProfileResponse = {
      member: serializeAutomationMember(member),
      profile,
    };
    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load content automation profile.";
    return jsonError(message, resolveStatus(message));
  }
}

export async function POST(request: Request) {
  let body: CreatorAutomationProfileUpsertRequest | null = null;

  try {
    body = (await request.json()) as CreatorAutomationProfileUpsertRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.memberEmail) {
    return jsonError("memberEmail is required.", 400);
  }

  try {
    const { member, profile } = await upsertCreatorAutomationProfileForMember(body);
    const response: CreatorAutomationProfileResponse = {
      member: serializeAutomationMember(member),
      profile,
    };
    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to save content automation profile.";
    return jsonError(message, resolveStatus(message));
  }
}
