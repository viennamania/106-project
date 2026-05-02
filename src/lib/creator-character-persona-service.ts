import "server-only";

import { randomUUID } from "crypto";

import type { CreatorCharacterPersona } from "@/lib/content";

const DEFAULT_MODEL = "gpt-5.4";
const DEFAULT_TIMEOUT_MS = 60_000;
const CANDIDATE_COUNT = 4;

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
  avatarImageUrl?: string | null;
  displayName?: string | null;
  intro?: string | null;
  locale?: string | null;
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
              minItems: 4,
              maxItems: 6,
            },
            avoidChanges: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 5,
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
  const identityPrompt = trimToLength(candidate.identityPrompt, 1_200);

  if (!name || !identityPrompt) {
    return null;
  }

  return {
    avoidChanges: candidate.avoidChanges
      .map((item) => trimToLength(item, 160))
      .filter(Boolean)
      .slice(0, 5),
    id: `persona-${index + 1}-${randomUUID().replace(/-/g, "").slice(0, 10)}`,
    identityPrompt,
    lockedTraits: candidate.lockedTraits
      .map((item) => trimToLength(item, 160))
      .filter(Boolean)
      .slice(0, 6),
    name,
    summary: trimToLength(candidate.summary, 220),
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

  return {
    model: getCreatorPersonaModel(),
    max_output_tokens: 1_800,
    input: [
      {
        role: "system",
        content: [
          "You create stable character identity personas for AI image and video generation.",
          "The persona must only describe a consistent adult person's identity: face, hair, skin tone, age range, expression, silhouette, and signature details.",
          "Do not include locations, scenes, camera directions, sexualized wording, nudity, fetish roles, brands, or content topics.",
          "Write user-facing name and summary in Korean when requested. Write identityPrompt, lockedTraits, and avoidChanges in concise English for generation models.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          `Language for name/summary: ${language}.`,
          `Creator display name: ${displayName}.`,
          `Creator intro: ${intro}.`,
          avatarImageUrl
            ? `A creator avatar URL is available for high-level context: ${avatarImageUrl}. Do not claim exact biometric analysis.`
            : "No avatar image is available.",
          `Generate exactly ${CANDIDATE_COUNT} distinct adult character persona candidates. Keep each useful for maintaining the same person across varied content prompts.`,
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
