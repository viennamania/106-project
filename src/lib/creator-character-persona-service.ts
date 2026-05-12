import "server-only";

import { randomUUID } from "crypto";

import type { CreatorCharacterPersona } from "@/lib/content";

const DEFAULT_MODEL = "gpt-5.4";
const DEFAULT_TIMEOUT_MS = 60_000;
const CANDIDATE_COUNT = 4;
const IDENTITY_PROMPT_LIMIT = 1_600;
const TRAIT_LIMIT = 180;

export type CreatorPersonaAgeRange =
  | "20s"
  | "30s"
  | "40s"
  | "50s_plus"
  | "auto";
export type CreatorPersonaAppearanceTone =
  | "african_diaspora"
  | "east_asian"
  | "latin"
  | "middle_eastern_mediterranean"
  | "south_asian"
  | "western";
export type CreatorPersonaGender = "auto" | "female" | "male";
export type CreatorPersonaVisualSilhouette =
  | "athletic"
  | "balanced"
  | "elegant"
  | "slender"
  | "soft"
  | "auto";

type OpenAiResponsesApiResponse = {
  error?: {
    message?: string;
  };
  output?: Array<{
    content?: Array<{
      json?: unknown;
      text?: string;
      type?: string;
    }>;
  }>;
  output_text?: string;
};

type PersonaCandidatePayload = {
  candidates: Array<{
    avoidChanges: string[];
    identityPrompt: string;
    lockedTraits: string[];
    name: string;
    summary: string;
  }>;
};

export type GenerateCreatorCharacterPersonasInput = {
  ageRange: CreatorPersonaAgeRange;
  appearanceTone?: CreatorPersonaAppearanceTone | null;
  avatarImageUrl?: string | null;
  displayName?: string | null;
  gender: CreatorPersonaGender;
  intro?: string | null;
  locale?: string | null;
  visualSilhouette?: CreatorPersonaVisualSilhouette | null;
};

function trimToLength(value: string | null | undefined, limit: number) {
  return value?.trim().slice(0, limit) ?? "";
}

function getCreatorPersonaModel() {
  return process.env.OPENAI_CREATOR_PERSONA_MODEL?.trim() || DEFAULT_MODEL;
}

function getCreatorPersonaTimeoutMs() {
  const parsed = Number.parseInt(
    process.env.OPENAI_CREATOR_PERSONA_TIMEOUT_MS?.trim() ?? "",
    10,
  );

  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function getCreatorPersonaReasoningEffort() {
  const value = process.env.OPENAI_CREATOR_PERSONA_REASONING
    ?.trim()
    .toLowerCase();

  return value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "xhigh"
    ? value
    : "low";
}

function getGenderInstruction(gender: CreatorPersonaGender) {
  if (gender === "female") {
    return "female adult woman";
  }

  if (gender === "male") {
    return "male adult man";
  }

  return "one clear adult gender presentation chosen by the persona";
}

function getAgeRangeInstruction(ageRange: CreatorPersonaAgeRange) {
  if (ageRange === "auto") {
    return "one coherent adult age range chosen by the persona";
  }

  if (ageRange === "50s_plus") {
    return "50s or older";
  }

  return ageRange;
}

function getAppearanceToneInstruction(
  appearanceTone: CreatorPersonaAppearanceTone | null | undefined,
) {
  switch (appearanceTone) {
    case "african_diaspora":
      return "African diaspora-inspired facial impression, skin tone range, and hair identity";
    case "east_asian":
      return "East Asian-inspired facial impression, skin tone range, and hair identity";
    case "latin":
      return "Latin-inspired facial impression, skin tone range, and hair identity";
    case "middle_eastern_mediterranean":
      return "Middle Eastern or Mediterranean-inspired facial impression, skin tone range, and hair identity";
    case "south_asian":
      return "South Asian-inspired facial impression, skin tone range, and hair identity";
    case "western":
      return "Western or European-inspired facial impression, skin tone range, and hair identity";
    default:
      return null;
  }
}

function getVisualSilhouetteInstruction(
  visualSilhouette: CreatorPersonaVisualSilhouette | null | undefined,
) {
  switch (visualSilhouette) {
    case "athletic":
      return "active natural silhouette with a lightly toned frame impression and energetic upright posture";
    case "balanced":
      return "balanced natural silhouette with proportionate frame impression and relaxed camera-visible stance";
    case "elegant":
      return "elegant upright silhouette with refined posture, long-line presence, and calm camera-visible stance";
    case "slender":
      return "slender natural silhouette with a light frame impression and relaxed posture";
    case "soft":
      return "soft natural silhouette with a gentle frame impression and relaxed posture";
    default:
      return null;
  }
}

function createPersonaSchema() {
  return {
    type: "object",
    properties: {
      candidates: {
        type: "array",
        minItems: CANDIDATE_COUNT,
        maxItems: CANDIDATE_COUNT,
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            summary: { type: "string" },
            identityPrompt: { type: "string" },
            lockedTraits: {
              type: "array",
              items: { type: "string" },
              minItems: 6,
              maxItems: 8,
            },
            avoidChanges: {
              type: "array",
              items: { type: "string" },
              minItems: 5,
              maxItems: 7,
            },
          },
          required: [
            "name",
            "summary",
            "identityPrompt",
            "lockedTraits",
            "avoidChanges",
          ],
          additionalProperties: false,
        },
      },
    },
    required: ["candidates"],
    additionalProperties: false,
  };
}

function extractResponseTextContent(response: OpenAiResponsesApiResponse) {
  const directOutputText = trimToLength(response.output_text, 20_000);

  if (directOutputText) {
    return directOutputText;
  }

  const parts: string[] = [];

  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string" && content.text.trim()) {
        parts.push(content.text.trim());
        continue;
      }

      if (content.json !== undefined) {
        parts.push(JSON.stringify(content.json));
      }
    }
  }

  return trimToLength(parts.join("\n"), 20_000);
}

function parsePersonaPayload(
  response: OpenAiResponsesApiResponse,
): PersonaCandidatePayload {
  const outputText = extractResponseTextContent(response);

  if (!outputText) {
    throw new Error("Creator persona generation returned an empty payload.");
  }

  try {
    return JSON.parse(outputText) as PersonaCandidatePayload;
  } catch {
    throw new Error("Creator persona generation returned invalid JSON.");
  }
}

function normalizeCandidate(
  candidate: PersonaCandidatePayload["candidates"][number],
  index: number,
): CreatorCharacterPersona | null {
  const name = trimToLength(candidate.name, 80);
  const identityPrompt = trimToLength(
    candidate.identityPrompt,
    IDENTITY_PROMPT_LIMIT,
  );

  if (!name || !identityPrompt) {
    return null;
  }

  return {
    avoidChanges: candidate.avoidChanges
      .map((item) => trimToLength(item, TRAIT_LIMIT))
      .filter(Boolean)
      .slice(0, 7),
    id: `persona-${index + 1}-${randomUUID().replace(/-/g, "").slice(0, 10)}`,
    identityPrompt,
    lockedTraits: candidate.lockedTraits
      .map((item) => trimToLength(item, TRAIT_LIMIT))
      .filter(Boolean)
      .slice(0, 8),
    name,
    summary: trimToLength(candidate.summary, 260),
  };
}

async function requestOpenAiResponse(
  apiKey: string,
  payload: Record<string, unknown>,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    getCreatorPersonaTimeoutMs(),
  );

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      body: JSON.stringify(payload),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });
    const json = (await response.json().catch(() => null)) as
      | OpenAiResponsesApiResponse
      | null;

    return { json, response };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("OpenAI request timed out while generating personas.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function createOpenAiResponse(payload: Record<string, unknown>) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const { json, response } = await requestOpenAiResponse(apiKey, payload);

  if (!response.ok) {
    if (
      "reasoning" in payload &&
      json?.error?.message?.toLowerCase().includes("reasoning.effort")
    ) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.reasoning;
      const fallbackResponse = await requestOpenAiResponse(
        apiKey,
        fallbackPayload,
      );

      if (fallbackResponse.response.ok) {
        return fallbackResponse.json ?? {};
      }
    }

    throw new Error(
      json?.error?.message
        ? `OpenAI request failed: ${json.error.message}`
        : `OpenAI request failed with status ${response.status}.`,
    );
  }

  return json ?? {};
}

function createPersonaPayload(input: GenerateCreatorCharacterPersonasInput) {
  const displayName = trimToLength(input.displayName, 80) || "AI Creator";
  const intro = trimToLength(input.intro, 400) || "No intro provided.";
  const avatarImageUrl = trimToLength(input.avatarImageUrl, 500);
  const language = input.locale === "ko" ? "Korean" : "English";
  const genderInstruction = getGenderInstruction(input.gender);
  const ageRangeInstruction = getAgeRangeInstruction(input.ageRange);
  const appearanceToneInstruction = getAppearanceToneInstruction(
    input.appearanceTone,
  );
  const visualSilhouetteInstruction = getVisualSilhouetteInstruction(
    input.visualSilhouette,
  );
  const hasAutoIdentity = input.gender === "auto" || input.ageRange === "auto";
  const identityRequirement = hasAutoIdentity
    ? "Each identityPrompt must explicitly state the chosen adult gender presentation and adult age range, then lock them as unchangeable identity traits."
    : `Each identityPrompt must explicitly include ${genderInstruction} and ${ageRangeInstruction}.`;

  return {
    model: getCreatorPersonaModel(),
    max_output_tokens: 2_600,
    input: [
      {
        role: "system",
        content: [
          "You create stable character identity personas for AI image and video generation.",
          "The persona must only describe a consistent adult person's identity.",
          "Make the face description concrete enough for identity consistency: face shape, jawline, cheekbones, eye shape, eyebrow style, nose bridge/tip, mouth/lip shape, skin tone/texture, hairline, hair color, length, and texture.",
          "Describe overall presence only in neutral non-sexual terms: height impression, shoulder line, neck length, posture, frame, and camera-visible stance.",
          "Every candidate must describe a consistent adult person's identity. If gender or age range is fixed, match it exactly. If either is auto, choose a coherent adult identity choice and keep it stable.",
          "When an appearance tone is provided, use it only as a stable visual design direction for face, skin, and hair details. Do not write stereotypes or broad claims about protected identity.",
          "When a visual silhouette is provided, use it only as a neutral identity-consistency cue for overall frame impression, posture, and stance.",
          "Do not include locations, scenes, camera directions, sexualized wording, nudity, fetish roles, brands, content topics, or emphasis on breasts, hips, thighs, buttocks, cleavage, or erotic body parts.",
          "Write user-facing name and summary in Korean when requested. Write identityPrompt, lockedTraits, and avoidChanges in concise English for generation models.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          `Language for name/summary: ${language}.`,
          `Creator display name: ${displayName}.`,
          `Creator intro: ${intro}.`,
          `Gender requirement: ${genderInstruction}.`,
          `Adult age range requirement: ${ageRangeInstruction}.`,
          appearanceToneInstruction
            ? `Preferred appearance tone: ${appearanceToneInstruction}. Keep it consistent across all candidates.`
            : "No fixed appearance tone was selected. Choose a coherent safe appearance for each candidate.",
          visualSilhouetteInstruction
            ? `Preferred neutral visual silhouette: ${visualSilhouetteInstruction}. Keep this as an identity-consistency cue without body-part emphasis.`
            : "No fixed visual silhouette was selected. Choose a coherent neutral presence for each candidate.",
          avatarImageUrl
            ? `A creator avatar URL is available for high-level context: ${avatarImageUrl}. Do not claim exact biometric analysis.`
            : "No avatar image is available.",
          `Generate exactly ${CANDIDATE_COUNT} distinct adult character persona candidates.`,
          identityRequirement,
          appearanceToneInstruction
            ? "Each identityPrompt must include concrete face, skin, and hair details consistent with the preferred appearance tone."
            : "Each identityPrompt must include concrete face, skin, and hair details that form a stable identity.",
          "Each identityPrompt must be one detailed paragraph in English with: face lock, hair lock, skin lock, expression lock, neutral visual silhouette lock, overall presence lock, posture lock, and a clear instruction that outfit/scene/action may change but identity must not.",
          "Each lockedTraits item should be a concrete stable visual trait, not a vague personality trait. Include at least four face/hair/skin traits and at least two neutral silhouette/posture/presence traits.",
          "Each avoidChanges item should explicitly forbid changing gender, adult age range, face structure, hair color/length, skin tone, ethnic impression, neutral visual silhouette, posture, and overall presence.",
          "Keep the wording safe for image and video models: neutral, non-erotic, and suitable for varied creator content prompts.",
        ].join(" "),
      },
    ],
    reasoning: {
      effort: getCreatorPersonaReasoningEffort(),
    },
    text: {
      format: {
        type: "json_schema",
        name: "creator_character_personas",
        schema: createPersonaSchema(),
        strict: true,
      },
    },
  };
}

export async function generateCreatorCharacterPersonas(
  input: GenerateCreatorCharacterPersonasInput,
) {
  const response = await createOpenAiResponse(createPersonaPayload(input));
  const parsed = parsePersonaPayload(response);
  const candidates = parsed.candidates
    .map((candidate, index) => normalizeCandidate(candidate, index))
    .filter((candidate): candidate is CreatorCharacterPersona =>
      Boolean(candidate),
    )
    .slice(0, CANDIDATE_COUNT);

  if (candidates.length === 0) {
    throw new Error("Creator persona generation returned no usable candidates.");
  }

  return { candidates };
}
