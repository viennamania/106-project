import type { CreatorCharacterPersonaGenerateResponse } from "@/lib/content";
import { getCreatorProfileSnapshotForCompletedMember } from "@/lib/content-service";
import {
  generateCreatorCharacterPersonas,
  type CreatorPersonaAgeRange,
  type CreatorPersonaAppearanceTone,
  type CreatorPersonaGender,
} from "@/lib/creator-character-persona-service";
import { hasLocale, type Locale } from "@/lib/i18n";
import { validateMemberWalletOwner } from "@/lib/member-owner";

export const runtime = "nodejs";
export const maxDuration = 90;

type GeneratePersonasRequest = {
  ageRange?: string | null;
  appearanceTone?: string | null;
  avatarImageUrl?: string | null;
  displayName?: string | null;
  email?: string | null;
  gender?: string | null;
  intro?: string | null;
  locale?: string | null;
  walletAddress?: string | null;
};

const creatorPersonaAgeRanges = ["20s", "30s", "40s", "50s_plus"] as const;
const creatorPersonaAppearanceTones = [
  "african_diaspora",
  "east_asian",
  "latin",
  "middle_eastern_mediterranean",
  "south_asian",
  "western",
] as const;
const creatorPersonaGenders = ["female", "male"] as const;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function parsePersonaAgeRange(value: string | null | undefined) {
  return creatorPersonaAgeRanges.includes(value as CreatorPersonaAgeRange)
    ? (value as CreatorPersonaAgeRange)
    : null;
}

function parsePersonaGender(value: string | null | undefined) {
  return creatorPersonaGenders.includes(value as CreatorPersonaGender)
    ? (value as CreatorPersonaGender)
    : null;
}

function parsePersonaAppearanceTone(value: string | null | undefined) {
  return creatorPersonaAppearanceTones.includes(
    value as CreatorPersonaAppearanceTone,
  )
    ? (value as CreatorPersonaAppearanceTone)
    : null;
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

  const gender = parsePersonaGender(body.gender);

  if (!gender) {
    return jsonError("gender is required.", 400);
  }

  const ageRange = parsePersonaAgeRange(body.ageRange);

  if (!ageRange) {
    return jsonError("ageRange is required.", 400);
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
      ageRange,
      appearanceTone: parsePersonaAppearanceTone(body.appearanceTone),
      avatarImageUrl: body.avatarImageUrl || profile.avatarImageUrl,
      displayName: body.displayName || profile.displayName,
      gender,
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
