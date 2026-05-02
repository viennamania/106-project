import type { CreatorCharacterPersona } from "@/lib/content";

const CHARACTER_PROMPT_LIMIT = 1_800;

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

export function applyCreatorCharacterPersonaToPrompt(
  scenePrompt: string,
  persona: CreatorCharacterPersona | null | undefined,
) {
  const normalizedScenePrompt = scenePrompt.trim();
  const identityPrompt = trimToLength(
    persona?.identityPrompt,
    CHARACTER_PROMPT_LIMIT,
  );

  if (!persona || !identityPrompt) {
    return normalizedScenePrompt;
  }

  return [
    "Character identity lock: Maintain the same adult character identity across this generation. The character's face, age range, hair, skin tone, expression, and recognizable silhouette must remain consistent.",
    `Character persona: ${identityPrompt}`,
    `Locked traits: ${formatList(
      persona.lockedTraits,
      "same face structure, same hair, same skin tone, same age range",
    )}.`,
    `Do not change: ${formatList(
      persona.avoidChanges,
      "facial structure, hair color, age range, ethnicity, body identity",
    )}.`,
    "Only the scene, outfit, pose, lighting, and action from the user prompt may vary. Keep the person recognizably the same.",
    `User scene prompt: ${normalizedScenePrompt}`,
  ].join("\n\n");
}
