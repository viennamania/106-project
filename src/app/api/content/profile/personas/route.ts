import type { CreatorCharacterPersonaGenerateResponse } from "@/lib/content";
import { getCreatorProfileSnapshotForCompletedMember } from "@/lib/content-service";
import { generateCreatorCharacterPersonas } from "@/lib/creator-character-persona-service";
import { hasLocale, type Locale } from "@/lib/i18n";
import { validateMemberWalletOwner } from "@/lib/member-owner";

export const runtime = "nodejs";
export const maxDuration = 90;

type GeneratePersonasRequest = {
  avatarImageUrl?: string | null;
  displayName?: string | null;
  email?: string | null;
  intro?: string | null;
  locale?: string | null;
  walletAddress?: string | null;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return jsonError("OPENAI_API_KEY is not configured.", 500);
  }

  let body: GeneratePersonasRequest | null = null;

  try {
    body = (await request.json()) as GeneratePersonasRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.email) {
    return jsonError("email is required.", 400);
  }

  if (!body.walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  const locale = hasLocale(body.locale ?? "") ? (body.locale as Locale) : "ko";

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

    const profileSnapshot = await getCreatorProfileSnapshotForCompletedMember(
      authorization.member,
    );
    const profile = profileSnapshot.profile;
    const generated = await generateCreatorCharacterPersonas({
      avatarImageUrl: body.avatarImageUrl || profile.avatarImageUrl,
      displayName: body.displayName || profile.displayName,
      intro: body.intro || profile.intro,
      locale,
    });
    const response: CreatorCharacterPersonaGenerateResponse = {
      candidates: generated.candidates,
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate creator personas.";
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
