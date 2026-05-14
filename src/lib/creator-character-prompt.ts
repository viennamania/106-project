import type { CreatorCharacterPersona } from "@/lib/content";
import {
  createFanletterRealismPromptBlock,
  normalizeFanletterRealismRequestText,
} from "@/lib/fanletter-realism-policy";

const CHARACTER_PROMPT_LIMIT = 1_800;
const USER_SCENE_PROMPT_LIMIT = 6_000;

function trimToLength(value: string | null | undefined, limit: number) {
  return value?.trim().slice(0, limit) ?? "";
}

function formatList(values: string[], fallback: string) {
  const normalized = values
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 8);

  return normalized.length > 0 ? normalized.join("; ") : fallback;
}

function createCharacterDescriptionReplacements() {
  return [
    [
      /\b(?:a|an|the)?\s*(?:young|younger|old|older|middle[-\s]?aged|elderly|mature|teenage|teen|adult)\s+(?:man|woman|male|female|lady|guy|girl|boy|person)\b/gi,
      "the fixed character persona",
    ],
    [
      /\b(?:beautiful|gorgeous|pretty|handsome|attractive|cute|sexy)\s+(?:white|black|asian|korean|japanese|chinese|latina|latino|hispanic|caucasian|european)?\s*(?:man|woman|male|female|lady|guy|girl|boy|person)\b/gi,
      "the fixed character persona",
    ],
    [
      /\b(?:a|an|the)?\s*(?:white|black|asian|korean|japanese|chinese|latina|latino|hispanic|caucasian|european)\s+(?:man|woman|male|female|lady|guy|girl|boy|person)\b/gi,
      "the fixed character persona",
    ],
    [
      /\b(?:a|an|the)?\s*(?:curvy|petite|slim|skinny|muscular|athletic|voluptuous|busty|hourglass)\s+(?:man|woman|male|female|lady|guy|girl|boy|person)\b/gi,
      "the fixed character persona",
    ],
    [
      /\b(?:a|an|the)?\s*(?:curvy|petite|slim|skinny|muscular|athletic|voluptuous|busty|hourglass)\s+(?:nurse|model|performer|character|subject)\b/gi,
      "the fixed character persona",
    ],
    [
      /\b(?:a|an|the)?\s*\d{2}[-\s]?year[-\s]?old\s+(?:man|woman|male|female|lady|guy|girl|boy|person)\b/gi,
      "the fixed character persona",
    ],
    [
      /\b(?:in\s+(?:his|her|their)\s+)?(?:20s|30s|40s|50s|60s|twenties|thirties|forties|fifties|sixties)\b/gi,
      "the persona age range",
    ],
    [
      /\b(?:slicked[-\s]?back|blonde|blond|black|brown|brunette|chestnut|red|auburn|silver|gray|grey|platinum|long|short|curly|straight|wavy|braided)\s+hair\b/gi,
      "persona-consistent hair",
    ],
    [
      /\b(?:fair|pale|light|dark|olive|beige|tan|tanned|bronzed|brown|porcelain)\s+skin\b/gi,
      "persona-consistent skin tone",
    ],
    [
      /\b(?:soft\s+oval|oval|round|heart[-\s]?shaped|sharp|angular|delicate|chiseled)\s+face\b/gi,
      "persona-consistent face",
    ],
    [
      /\b(?:blue|green|brown|hazel|gray|grey|almond|large|small)\s+eyes\b/gi,
      "persona-consistent eyes",
    ],
    [
      /\b(?:strikingly\s+large|very\s+large|large|big|huge|small|full)\s+(?:bust|breasts|chest|hips)\s+and\s+(?:hips|buttocks|chest|bust|breasts)\b/gi,
      "persona-consistent presence",
    ],
    [
      /\b(?:strikingly\s+large|very\s+large|large|big|huge|small|full)\s+(?:bust|breasts|chest|hips)\b/gi,
      "persona-consistent presence",
    ],
    [/\b(?:distinct|visible)\s+tan\s+lines\b/gi, "persona-consistent skin details"],
    [/\b(?:soft|athletic|slim|thick)\s+thighs\b/gi, "persona-consistent presence"],
    [/\bhourglass\s+figure\b/gi, "persona-consistent presence"],
    [/\bbody\s+type\b/gi, "persona-consistent presence"],
    [/\bfacial\s+features\b/gi, "persona-consistent facial identity"],
    [
      /(?:젊은|어린|중년|노년|성인|20대|30대|40대|50대|60대)\s*(?:남성|여성|남자|여자|인물|사람|소녀|소년)/g,
      "고정 페르소나 인물",
    ],
    [/(?:금발|흑발|검은\s*머리|갈색\s*머리|긴\s*머리|짧은\s*머리)/g, "페르소나와 일치하는 머리"],
    [/(?:하얀|밝은|어두운|그을린|태닝한)\s*피부/g, "페르소나와 일치하는 피부톤"],
    [/(?:큰|작은)\s*(?:가슴|엉덩이)/g, "페르소나와 일치하는 실루엣"],
  ] satisfies Array<[RegExp, string]>;
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

function replaceCharacterDescriptionsWithPersona(scenePrompt: string) {
  let normalized = scenePrompt;
  let replaced = false;

  for (const [pattern, replacement] of createCharacterDescriptionReplacements()) {
    normalized = normalized.replace(pattern, (match) => {
      replaced = true;

      if (match[0] === match[0]?.toUpperCase()) {
        return replacement[0].toUpperCase() + replacement.slice(1);
      }

      return replacement;
    });
  }

  return {
    prompt: normalizeSpacing(normalized),
    replaced,
  };
}

export function applyCreatorCharacterPersonaToPrompt(
  scenePrompt: string,
  persona: CreatorCharacterPersona | null | undefined,
) {
  const normalizedScenePrompt = normalizeFanletterRealismRequestText(
    scenePrompt,
    USER_SCENE_PROMPT_LIMIT,
  );
  const identityPrompt = trimToLength(
    persona?.identityPrompt,
    CHARACTER_PROMPT_LIMIT,
  );
  const realismPromptBlock = createFanletterRealismPromptBlock(persona);

  if (!persona || !identityPrompt) {
    return [
      realismPromptBlock,
      `User scene prompt: ${normalizedScenePrompt}`,
    ].join("\n\n");
  }

  const normalizedUserScene =
    replaceCharacterDescriptionsWithPersona(normalizedScenePrompt);
  const sceneInstruction = normalizedUserScene.replaced
    ? "User-supplied character identity details were replaced with the fixed character persona. Preserve the remaining scene, outfit, pose, lighting, camera, action, and mood."
    : "If the user prompt contains any conflicting gender, age, face, hair, skin tone, ethnicity, or overall appearance details, ignore those details and use the character persona instead.";

  return [
    "Character identity lock: Maintain the same adult character identity across this generation. The character's face, age range, hair, skin tone, expression, neutral visual silhouette, posture, and overall presence must remain consistent.",
    `Character persona: ${identityPrompt}`,
    `Locked traits: ${formatList(
      persona.lockedTraits,
      "same face structure, same hair, same skin tone, same age range, same neutral visual silhouette, same posture, same overall presence",
    )}.`,
    `Do not change: ${formatList(
      persona.avoidChanges,
      "facial structure, hair color, age range, ethnicity, neutral visual silhouette, posture, overall presence",
    )}.`,
    realismPromptBlock,
    "Use the character persona as the only source of truth for the main person's identity. Do not let the user scene prompt override the persona's gender, age range, face, hair, skin tone, ethnicity, or overall visual identity.",
    "Reality grounding also overrides any user prompt details that would require impossible physics, age changes, exact real-time private location claims, or real-person impersonation.",
    sceneInstruction,
    `User scene prompt: ${normalizedUserScene.prompt}`,
  ].join("\n\n");
}

export function insertCreatorCharacterWorldContextPrompt(
  prompt: string,
  worldContextPrompt: string | null | undefined,
) {
  const normalizedWorldContextPrompt = trimToLength(worldContextPrompt, 1_400);

  if (!normalizedWorldContextPrompt) {
    return prompt;
  }

  const marker = "User scene prompt:";
  const markerIndex = prompt.lastIndexOf(marker);

  if (markerIndex < 0) {
    return [normalizedWorldContextPrompt, prompt].join("\n\n");
  }

  return [
    prompt.slice(0, markerIndex).trim(),
    normalizedWorldContextPrompt,
    prompt.slice(markerIndex).trim(),
  ]
    .filter(Boolean)
    .join("\n\n");
}
