import type {
  CreatorProfileResponse,
  CreatorProfileUpsertRequest,
} from "@/lib/content";
import {
  getCreatorProfileForMember,
  upsertCreatorProfileForMember,
} from "@/lib/content-service";

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
    const response: CreatorProfileResponse = {
      profile: await getCreatorProfileForMember(rawEmail),
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load creator profile.";
    const status =
      message === "Member not found."
        ? 404
        : message === "Completed signup is required."
          ? 403
          : 500;

    return jsonError(message, status);
  }
}

export async function POST(request: Request) {
  let body: CreatorProfileUpsertRequest | null = null;

  try {
    body = (await request.json()) as CreatorProfileUpsertRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.email) {
    return jsonError("email is required.", 400);
  }

  if (!body.displayName?.trim()) {
    return jsonError("displayName is required.", 400);
  }

  try {
    const response: CreatorProfileResponse = {
      profile: await upsertCreatorProfileForMember(body),
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save creator profile.";
    const status =
      message === "Member not found."
        ? 404
        : message === "Completed signup is required."
          ? 403
          : message.endsWith("is required.")
            ? 400
            : 500;

    return jsonError(message, status);
  }
}
