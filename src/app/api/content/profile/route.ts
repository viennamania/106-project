import type {
  CreatorProfileResponse,
  CreatorProfileUpsertRequest,
} from "@/lib/content";
import { validateMemberWalletOwner } from "@/lib/member-owner";
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
  const rawWalletAddress = url.searchParams.get("walletAddress");

  if (!rawEmail) {
    return jsonError("email query parameter is required.", 400);
  }

  if (!rawWalletAddress) {
    return jsonError("walletAddress query parameter is required.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      email: rawEmail,
      walletAddress: rawWalletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const response: CreatorProfileResponse = {
      profile: await getCreatorProfileForMember(authorization.normalizedEmail),
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

  if (!body.walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  if (!body.displayName?.trim()) {
    return jsonError("displayName is required.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      email: body.email,
      walletAddress: body.walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const response: CreatorProfileResponse = {
      profile: await upsertCreatorProfileForMember({
        ...body,
        email: authorization.normalizedEmail,
      }),
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
