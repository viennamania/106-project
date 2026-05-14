import type {
  CreatorCharacterPersona,
  CreatorCharacterRealismProfile,
  FanletterRealismRevisionReason,
} from "@/lib/content";
import type { Locale } from "@/lib/i18n";

const PROMPT_LIMIT = 6_000;

const DEFAULT_REALISM_PROFILE: CreatorCharacterRealismProfile = {
  agePolicy: "adult_age_continuity",
  disclosure: "fictional_ai_character",
  groundingMode: "real_world",
  locationPolicy: "public_or_fictionalized",
  physicsPolicy: "ordinary_human_physics",
  realPersonPolicy: "no_real_person_impersonation",
  timePolicy: "timezone_season_consistent",
};

const REALISM_REPLACEMENTS = [
  {
    pattern:
      /\b(?:teleport(?:ing|ation)?|time travel(?:ing)?|superpower|magic|levitat(?:e|ion)|fly through the air)\b/gi,
    reason: "impossible_physics",
    replacement: "a realistic practical-filming moment",
  },
  {
    pattern:
      /\b(?:minor|underage|teen(?:age)?|schoolgirl|schoolboy|child|kid)\b/gi,
    reason: "adult_age_continuity",
    replacement: "adult character",
  },
  {
    pattern:
      /\b(?:real[-\s]?time location|current location|exact address|home address|private address|where (?:is|are) (?:she|he|they|you) now)\b/gi,
    reason: "private_location",
    replacement: "a public, non-identifying location",
  },
  {
    pattern:
      /\b(?:impersonat(?:e|ing)|pretend to be a real person|specific celebrity|specific public figure)\b/gi,
    reason: "real_person_impersonation",
    replacement: "depict the fictional AI character",
  },
  {
    pattern:
      /(?:순간이동|텔레포트|시간여행|초능력|마법|공중부양|하늘을\s*날(?:기|아)?)/g,
    reason: "impossible_physics",
    replacement: "현실적인 촬영 연출",
  },
  {
    pattern: /(?:미성년자?|고등학생|중학생|초등학생|여고생|남고생|교복)/g,
    reason: "adult_age_continuity",
    replacement: "성인 캐릭터의 일상 복장",
  },
  {
    pattern: /(?:실시간\s*위치|현재\s*위치|정확한\s*주소|집\s*주소|자택\s*주소)/g,
    reason: "private_location",
    replacement: "공개 가능한 일반 장소",
  },
  {
    pattern:
      /(?:실존\s*인물|특정\s*연예인|특정\s*유명인|특정\s*아이돌|본인인\s*척|실제\s*사람인\s*척)/g,
    reason: "real_person_impersonation",
    replacement: "가상의 AI 캐릭터",
  },
] satisfies Array<{
  pattern: RegExp;
  reason: FanletterRealismRevisionReason;
  replacement: string;
}>;

function trimToLength(value: string | null | undefined, limit: number) {
  return value?.trim().slice(0, limit) ?? "";
}

function normalizeSpacing(value: string) {
  return value
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([([{])\s+/g, "$1")
    .replace(/\s+([)\]}])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function createDefaultCreatorRealismProfile(): CreatorCharacterRealismProfile {
  return { ...DEFAULT_REALISM_PROFILE };
}

export function normalizeCreatorCharacterRealismProfile(
  value: CreatorCharacterRealismProfile | null | undefined,
): CreatorCharacterRealismProfile {
  if (!value || value.groundingMode !== "real_world") {
    return createDefaultCreatorRealismProfile();
  }

  return {
    agePolicy:
      value.agePolicy === "adult_age_continuity"
        ? value.agePolicy
        : DEFAULT_REALISM_PROFILE.agePolicy,
    disclosure:
      value.disclosure === "fictional_ai_character"
        ? value.disclosure
        : DEFAULT_REALISM_PROFILE.disclosure,
    groundingMode: "real_world",
    locationPolicy:
      value.locationPolicy === "public_or_fictionalized"
        ? value.locationPolicy
        : DEFAULT_REALISM_PROFILE.locationPolicy,
    physicsPolicy:
      value.physicsPolicy === "ordinary_human_physics"
        ? value.physicsPolicy
        : DEFAULT_REALISM_PROFILE.physicsPolicy,
    realPersonPolicy:
      value.realPersonPolicy === "no_real_person_impersonation"
        ? value.realPersonPolicy
        : DEFAULT_REALISM_PROFILE.realPersonPolicy,
    timePolicy:
      value.timePolicy === "timezone_season_consistent"
        ? value.timePolicy
        : DEFAULT_REALISM_PROFILE.timePolicy,
  };
}

export function normalizeFanletterRealismRequestText(
  value: string | null | undefined,
  limit = PROMPT_LIMIT,
) {
  return createFanletterRealismRevision(value, limit).text;
}

export function createFanletterRealismRevision(
  value: string | null | undefined,
  limit = PROMPT_LIMIT,
) {
  let normalized = trimToLength(value, limit);
  const reasons = new Set<FanletterRealismRevisionReason>();

  for (const { pattern, reason, replacement } of REALISM_REPLACEMENTS) {
    normalized = normalized.replace(pattern, () => {
      reasons.add(reason);
      return replacement;
    });
  }

  return {
    reasons: [...reasons],
    revised: reasons.size > 0,
    text: trimToLength(normalizeSpacing(normalized), limit),
  };
}

export const FANLETTER_REALISM_POLICY_PROMPT = [
  "Reality grounding policy: Treat every FanLetter character as a fictional adult AI character rooted in the real world.",
  "Keep real human age continuity, ordinary gravity, plausible body mechanics, practical movement, weather/season/time consistency, and public or fictionalized private locations.",
  "Do not imply the character is a real person, celebrity, exact living person, minor, or physically present at an exact real-time private address.",
  "If a request asks for impossible physics, supernatural power, teleportation, age regression, exact whereabouts, private addresses, or real-person impersonation, reinterpret it as a grounded, safe, fictional vlog alternative.",
].join(" ");

export const FANLETTER_REALISM_CHARACTER_PERSONA_PROMPT = [
  "Reality-grounded character policy: Every persona must be a fictional adult AI character, not a real person or public figure.",
  "Design personas that can stay consistent with adult age continuity, real-world human body mechanics, plausible daily locations, time and season consistency, and no real-person impersonation.",
].join(" ");

export function createFanletterRealismPromptBlock(
  persona: CreatorCharacterPersona | null | undefined,
) {
  const realismProfile = normalizeCreatorCharacterRealismProfile(
    persona?.realismProfile,
  );

  return [
    FANLETTER_REALISM_POLICY_PROMPT,
    `Active realism profile: ${realismProfile.groundingMode}; ${realismProfile.agePolicy}; ${realismProfile.physicsPolicy}; ${realismProfile.locationPolicy}; ${realismProfile.timePolicy}; ${realismProfile.realPersonPolicy}; ${realismProfile.disclosure}.`,
  ].join("\n");
}

export function getFanletterRealismDisclosureCopy(locale: Locale) {
  return locale === "ko"
    ? {
        description:
          "가상의 AI 캐릭터이며 나이, 시간, 장소, 움직임을 현실 세계 기준으로 유지합니다.",
        label: "현실 기반 AI 캐릭터",
        requestNote:
          "비현실적이거나 실제 인물·위치에 가까운 요청은 현실 가능한 브이로그 장면으로 다듬어집니다.",
      }
    : {
        description:
          "A fictional AI character grounded in real-world age, time, location, and movement constraints.",
        label: "Reality-grounded AI character",
        requestNote:
          "Requests involving impossible scenes, real people, or exact private locations are adapted into plausible vlog scenes.",
      };
}
