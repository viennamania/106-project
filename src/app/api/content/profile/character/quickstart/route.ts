import type {
  CreatorPersonaAgeRange,
  CreatorPersonaAppearanceTone,
  CreatorPersonaGender,
  CreatorPersonaVisualSilhouette,
} from "@/lib/creator-character-persona-service";
import { generateCreatorAvatarCandidates } from "@/lib/creator-avatar-service";
import {
  generateCreatorCharacterPersonas,
} from "@/lib/creator-character-persona-service";
import type { CreatorProfileResponse } from "@/lib/content";
import {
  getCreatorProfileSnapshotForCompletedMember,
  upsertCreatorCharacterForMember,
} from "@/lib/content-service";
import { isMemberAllowedForContentAutomation } from "@/lib/content-automation-service";
import { normalizeCreatorCharacterRealismProfile } from "@/lib/fanletter-realism-policy";
import { hasLocale, type Locale } from "@/lib/i18n";
import { validateMemberWalletOwner } from "@/lib/member-owner";

export const runtime = "nodejs";
export const maxDuration = 300;

type QuickCharacterStyle =
  | "chic"
  | "cinematic"
  | "daily"
  | "fan_service"
  | "friendly"
  | "premium";

type QuickCharacterRequest = {
  ageRange?: string | null;
  appearanceTone?: string | null;
  displayName?: string | null;
  email?: string | null;
  gender?: string | null;
  intro?: string | null;
  locale?: string | null;
  style?: string | null;
  visualSilhouette?: string | null;
  walletAddress?: string | null;
};

const ageRanges = ["20s", "30s", "40s", "50s_plus", "auto"] as const;
const appearanceTones = [
  "african_diaspora",
  "east_asian",
  "latin",
  "middle_eastern_mediterranean",
  "south_asian",
  "western",
] as const;
const genders = ["auto", "female", "male"] as const;
const visualSilhouettes = [
  "athletic",
  "balanced",
  "elegant",
  "slender",
  "soft",
  "auto",
] as const;
const styles = [
  "chic",
  "cinematic",
  "daily",
  "fan_service",
  "friendly",
  "premium",
] as const;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function parseAgeRange(value: string | null | undefined): CreatorPersonaAgeRange {
  return ageRanges.includes(value as CreatorPersonaAgeRange)
    ? (value as CreatorPersonaAgeRange)
    : "auto";
}

function parseAppearanceTone(
  value: string | null | undefined,
): CreatorPersonaAppearanceTone | null {
  return appearanceTones.includes(value as CreatorPersonaAppearanceTone)
    ? (value as CreatorPersonaAppearanceTone)
    : null;
}

function parseGender(value: string | null | undefined): CreatorPersonaGender {
  return genders.includes(value as CreatorPersonaGender)
    ? (value as CreatorPersonaGender)
    : "auto";
}

function parseVisualSilhouette(
  value: string | null | undefined,
): CreatorPersonaVisualSilhouette | null {
  return visualSilhouettes.includes(value as CreatorPersonaVisualSilhouette)
    ? (value as CreatorPersonaVisualSilhouette)
    : null;
}

function parseStyle(value: string | null | undefined): QuickCharacterStyle {
  return styles.includes(value as QuickCharacterStyle)
    ? (value as QuickCharacterStyle)
    : "friendly";
}

function createStyleIntro(style: QuickCharacterStyle, locale: Locale) {
  const ko = {
    chic: "시크하고 절제된 톤으로 짧은 코멘트와 스타일 컷에 잘 맞는 AI 캐릭터 콘텐츠.",
    cinematic: "영화적인 분위기와 감정선이 있는 AI 캐릭터 콘텐츠.",
    daily: "일상 브이로그와 루틴형 숏폼에 잘 맞는 AI 캐릭터 콘텐츠.",
    fan_service: "팬에게 다정하게 반응하고 답장하는 팬 소통형 AI 캐릭터 콘텐츠.",
    friendly: "팬에게 친근하게 말을 거는 밝은 AI 캐릭터 콘텐츠.",
    premium: "차분하고 세련된 프리미엄 톤의 AI 캐릭터 콘텐츠.",
  } satisfies Record<QuickCharacterStyle, string>;
  const en = {
    chic: "Chic AI character content suited for concise comments and style-focused scenes.",
    cinematic: "AI character content with cinematic mood and emotional moments.",
    daily: "AI character content suited for daily vlog and routine shorts.",
    fan_service: "Fan-facing AI character content built around warm replies and appreciation.",
    friendly: "Bright AI character content that feels friendly to fans.",
    premium: "Calm, polished AI character content with a premium tone.",
  } satisfies Record<QuickCharacterStyle, string>;

  return locale === "ko" ? ko[style] : en[style];
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return jsonError("OPENAI_API_KEY is not configured.", 500);
  }

  let body: QuickCharacterRequest | null = null;

  try {
    body = (await request.json()) as QuickCharacterRequest;
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
  const style = parseStyle(body.style);

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

    const currentSnapshot = await getCreatorProfileSnapshotForCompletedMember(
      authorization.member,
    );
    const currentProfile = currentSnapshot.profile;
    const displayName =
      body.displayName?.trim() || currentProfile.displayName || "AI Creator";
    const introParts = [
      body.intro?.trim() || currentProfile.intro,
      createStyleIntro(style, locale),
    ].filter(Boolean);
    const personaCandidates = await generateCreatorCharacterPersonas({
      ageRange: parseAgeRange(body.ageRange),
      appearanceTone: parseAppearanceTone(body.appearanceTone),
      avatarImageUrl: currentProfile.avatarImageUrl,
      displayName,
      gender: parseGender(body.gender),
      intro: introParts.join("\n"),
      locale,
      visualSilhouette: parseVisualSilhouette(body.visualSilhouette),
    });
    const [characterPersona] = personaCandidates.candidates;

    if (!characterPersona) {
      return jsonError("Creator persona generation returned no usable candidates.", 500);
    }

    const currentRealismProfile = normalizeCreatorCharacterRealismProfile(
      currentProfile.characterPersona?.realismProfile,
    );
    const generatedRealismProfile = normalizeCreatorCharacterRealismProfile(
      characterPersona.realismProfile,
    );
    const characterPersonaWithRealism = {
      ...characterPersona,
      realismProfile: {
        ...generatedRealismProfile,
        worldLocation:
          currentRealismProfile.worldLocation ??
          generatedRealismProfile.worldLocation,
      },
    };

    let avatarImageSet: CreatorProfileResponse["profile"]["avatarImageSet"] = [];
    let selectedAvatarUrl: string | null = null;
    let characterWarning: string | null = null;

    try {
      const avatarCandidates = await generateCreatorAvatarCandidates({
        displayName,
        persona: characterPersonaWithRealism,
        referralCode: authorization.member.referralCode,
      });
      const selectedAvatar =
        avatarCandidates.candidates.find(
          (candidate) => candidate.expression === "default",
        ) ?? avatarCandidates.candidates[0];

      if (!selectedAvatar) {
        throw new Error("Avatar generation returned no usable candidates.");
      }

      avatarImageSet = avatarCandidates.candidates;
      selectedAvatarUrl = selectedAvatar.url;
    } catch {
      characterWarning =
        locale === "ko"
          ? "캐릭터 페르소나는 저장했지만 아바타 생성은 완료하지 못했습니다. 캐릭터 변경 화면에서 아바타만 다시 생성할 수 있습니다."
          : "The character persona was saved, but avatar generation did not finish. You can regenerate only the avatar from the character change screen.";
    }

    const profile = await upsertCreatorCharacterForMember({
      avatarImageSet,
      avatarImageUrl: selectedAvatarUrl,
      characterPersona: characterPersonaWithRealism,
      displayName,
      email: authorization.normalizedEmail,
      intro: currentProfile.intro,
      walletAddress: body.walletAddress ?? undefined,
    });
    const response: CreatorProfileResponse = {
      automationAvailable: isMemberAllowedForContentAutomation(
        authorization.normalizedEmail,
      ),
      ...(characterWarning ? { characterWarning } : {}),
      profile,
      profileConfigured: true,
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create quick character profile.";
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
