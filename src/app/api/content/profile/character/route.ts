import type {
  CreatorProfileCharacterUpdateRequest,
  CreatorProfileResponse,
} from "@/lib/content";
import {
  getCreatorProfileSnapshotForCompletedMember,
  upsertCreatorCharacterForMember,
} from "@/lib/content-service";
import { isMemberAllowedForContentAutomation } from "@/lib/content-automation-service";
import { validateMemberWalletOwner } from "@/lib/member-owner";

export const runtime = "nodejs";
export const maxDuration = 180;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: CreatorProfileCharacterUpdateRequest | null = null;

  try {
    body = (await request.json()) as CreatorProfileCharacterUpdateRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.email) {
    return jsonError("email is required.", 400);
  }

  if (!body.walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  if (!body.characterPersona?.identityPrompt?.trim()) {
    return jsonError("characterPersona is required.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      email: body.email,
      walletAddress: body.walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    if (!authorization.member) {
      return jsonError("Member not found.", 404);
    }

    const currentSnapshot = await getCreatorProfileSnapshotForCompletedMember(
      authorization.member,
    );
    const profile = await upsertCreatorCharacterForMember({
      ...body,
      displayName: body.displayName || currentSnapshot.profile.displayName,
      email: authorization.normalizedEmail,
      intro:
        body.intro === undefined ? currentSnapshot.profile.intro : body.intro,
    });
    const response: CreatorProfileResponse = {
      automationAvailable: isMemberAllowedForContentAutomation(
        authorization.normalizedEmail,
      ),
      profile,
      profileConfigured: true,
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
