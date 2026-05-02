import type {
  CreatorCharacterPersona,
  CreatorProfileAvatarGenerateResponse,
} from "@/lib/content";
import { generateCreatorAvatarCandidates } from "@/lib/creator-avatar-service";
import { getCreatorProfileSnapshotForCompletedMember } from "@/lib/content-service";
import { validateMemberWalletOwner } from "@/lib/member-owner";

export const runtime = "nodejs";
export const maxDuration = 180;

type GenerateAvatarCandidatesRequest = {
  characterPersona?: CreatorCharacterPersona | null;
  displayName?: string | null;
  email?: string | null;
  walletAddress?: string | null;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function isCreatorCharacterPersona(
  value: CreatorCharacterPersona | null | undefined,
): value is CreatorCharacterPersona {
  return Boolean(value?.identityPrompt?.trim());
}

export async function POST(request: Request) {
  let body: GenerateAvatarCandidatesRequest | null = null;

  try {
    body = (await request.json()) as GenerateAvatarCandidatesRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.email) {
    return jsonError("email is required.", 400);
  }

  if (!body.walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      email: body.email,
      walletAddress: body.walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    if (!authorization.member?.referralCode) {
      return jsonError("Creator Studio is only available to completed members.", 403);
    }

    const profileSnapshot = await getCreatorProfileSnapshotForCompletedMember(
      authorization.member,
    );
    const persona = isCreatorCharacterPersona(body.characterPersona)
      ? body.characterPersona
      : profileSnapshot.profile.characterPersona;

    if (!isCreatorCharacterPersona(persona)) {
      return jsonError("characterPersona is required.", 400);
    }

    const generated = await generateCreatorAvatarCandidates({
      displayName: body.displayName || profileSnapshot.profile.displayName,
      persona,
      referralCode: authorization.member.referralCode,
    });
    const response: CreatorProfileAvatarGenerateResponse = {
      candidates: generated.candidates,
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate avatar candidates.";
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
