import "server-only";

import { put } from "@vercel/blob";
import Replicate, { type FileOutput } from "replicate";

import type {
  CreatorCharacterPersona,
  CreatorProfileAvatarCandidate,
} from "@/lib/content";

const DEFAULT_MODEL = "black-forest-labs/flux-2-klein-9b";
const DEFAULT_ASPECT_RATIO = "1:1";
const DEFAULT_MEGAPIXELS = "1";
const DEFAULT_OUTPUT_FORMAT = "png";
const DEFAULT_OUTPUT_QUALITY = 96;
const CANDIDATE_COUNT = 1;
const CHARACTER_PROMPT_LIMIT = 1_800;

type OpenAiImageGenerationResponse = {
  data?: Array<{
    b64_json?: string;
    revised_prompt?: string;
  }>;
  error?: {
    message?: string;
  };
};

type Flux2KleinInput = {
  aspect_ratio?: "1:1";
  disable_safety_checker?: boolean;
  go_fast?: boolean;
  megapixels?: "0.25" | "0.5" | "1" | "2" | "4";
  output_format?: "webp" | "jpg" | "png";
  output_quality?: number;
  prompt: string;
};

type ReplicateModelName = `${string}/${string}` | `${string}/${string}:${string}`;

function trimToLength(value: string | null | undefined, limit: number) {
  return value?.trim().slice(0, limit) ?? "";
}

function sanitizeBaseName(name: string) {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return normalized || "creator-avatar";
}

function resolveFileExtension(contentType: string, sourceUrl: string | null) {
  if (contentType === "image/png") {
    return ".png";
  }

  if (contentType === "image/webp") {
    return ".webp";
  }

  if (contentType === "image/jpeg") {
    return ".jpg";
  }

  if (sourceUrl) {
    try {
      const pathname = new URL(sourceUrl).pathname.toLowerCase();

      if (pathname.endsWith(".png")) {
        return ".png";
      }

      if (pathname.endsWith(".webp")) {
        return ".webp";
      }

      if (pathname.endsWith(".jpeg")) {
        return ".jpeg";
      }

      if (pathname.endsWith(".jpg")) {
        return ".jpg";
      }
    } catch {}
  }

  return ".png";
}

function isFileOutputLike(value: unknown): value is FileOutput {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    "blob" in value &&
    typeof (value as FileOutput).blob === "function" &&
    "url" in value &&
    typeof (value as FileOutput).url === "function"
  );
}

async function readReplicateOutputFile(
  output: unknown,
): Promise<{ blob: Blob; sourceUrl: string | null }> {
  if (Array.isArray(output)) {
    const [firstOutput] = output;

    if (!firstOutput) {
      throw new Error("Replicate returned no avatar output.");
    }

    return readReplicateOutputFile(firstOutput);
  }

  if (typeof output === "string") {
    const response = await fetch(output, { method: "GET" });

    if (!response.ok) {
      throw new Error(
        `Replicate returned an unreadable avatar URL (${response.status}).`,
      );
    }

    return {
      blob: await response.blob(),
      sourceUrl: output,
    };
  }

  if (isFileOutputLike(output)) {
    return {
      blob: await output.blob(),
      sourceUrl: output.url().toString(),
    };
  }

  throw new Error("Replicate returned an unsupported avatar payload.");
}

function createAvatarPrompt({
  displayName,
  persona,
  variant,
}: {
  displayName?: string | null;
  persona: CreatorCharacterPersona;
  variant: number;
}) {
  const identityPrompt = trimToLength(
    persona.identityPrompt,
    CHARACTER_PROMPT_LIMIT,
  );
  const name = trimToLength(displayName, 80) || "creator";
  const variations = [
    "neutral studio background, direct friendly expression",
    "soft gray studio background, subtle confident expression",
    "warm off-white studio background, relaxed natural expression",
    "clean editorial background, calm approachable expression",
  ];

  return [
    "Create a square creator profile avatar using the fixed character persona.",
    `Creator label: ${name}. Do not render text or logos.`,
    `Fixed character persona: ${identityPrompt}`,
    "Head-and-shoulders portrait, centered composition, professional social profile avatar, high-quality digital realism, natural skin texture, clean lighting.",
    variations[variant % variations.length],
    "Do not change the persona's gender, age range, face, hair, skin tone, ethnicity, or recognizable identity.",
    "No full-body pose, no busy background, no extra people, no text, no watermark, no explicit styling.",
  ].join(" ");
}

function getAvatarModel(): ReplicateModelName {
  const model = process.env.REPLICATE_CREATOR_AVATAR_MODEL?.trim() || DEFAULT_MODEL;

  if (!/^[^/\s]+\/[^:\s]+(?::[^\s]+)?$/.test(model)) {
    throw new Error(
      "REPLICATE_CREATOR_AVATAR_MODEL must use owner/model or owner/model:version format.",
    );
  }

  return model as ReplicateModelName;
}

function getOpenAiAvatarModel() {
  return (
    process.env.OPENAI_CREATOR_AVATAR_MODEL?.trim() ||
    process.env.OPENAI_CONTENT_IMAGE_MODEL?.trim() ||
    "gpt-image-1.5"
  );
}

function getOpenAiAvatarQuality() {
  return process.env.OPENAI_CREATOR_AVATAR_QUALITY?.trim() || "medium";
}

function getOpenAiAvatarSize() {
  return process.env.OPENAI_CREATOR_AVATAR_SIZE?.trim() || "1024x1024";
}

async function generateOpenAiAvatarCandidate({
  displayName,
  persona,
  referralCode,
  variant,
}: {
  displayName?: string | null;
  persona: CreatorCharacterPersona;
  referralCode: string;
  variant: number;
}): Promise<CreatorProfileAvatarCandidate> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const prompt = createAvatarPrompt({ displayName, persona, variant });
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    body: JSON.stringify({
      background: "opaque",
      model: getOpenAiAvatarModel(),
      output_format: "png",
      prompt,
      quality: getOpenAiAvatarQuality(),
      size: getOpenAiAvatarSize(),
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload =
    ((await response.json().catch(() => null)) as OpenAiImageGenerationResponse | null) ??
    null;

  if (!response.ok) {
    throw new Error(
      payload?.error?.message
        ? `OpenAI avatar generation failed: ${payload.error.message}`
        : `OpenAI avatar generation failed with status ${response.status}.`,
    );
  }

  const imageBase64 = payload?.data?.[0]?.b64_json;

  if (!imageBase64) {
    throw new Error("OpenAI avatar generation returned no image data.");
  }

  const imageBytes = Buffer.from(imageBase64, "base64");
  const pathname = [
    "content-creator",
    referralCode,
    "avatar-candidates",
    `${Date.now()}-${variant + 1}-${sanitizeBaseName(displayName || persona.name)}.png`,
  ].join("/");
  const uploaded = await put(
    pathname,
    new Blob([imageBytes], { type: "image/png" }),
    {
      access: "public",
      addRandomSuffix: true,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
      contentType: "image/png",
    },
  );

  return {
    contentType: uploaded.contentType,
    pathname: uploaded.pathname,
    url: uploaded.url,
  };
}

async function generateAvatarCandidate({
  displayName,
  persona,
  referralCode,
  replicate,
  variant,
}: {
  displayName?: string | null;
  persona: CreatorCharacterPersona;
  referralCode: string;
  replicate: Replicate;
  variant: number;
}): Promise<CreatorProfileAvatarCandidate> {
  const prompt = createAvatarPrompt({ displayName, persona, variant });
  const modelInput = {
    aspect_ratio: DEFAULT_ASPECT_RATIO,
    disable_safety_checker: true,
    go_fast: false,
    megapixels: DEFAULT_MEGAPIXELS,
    output_format: DEFAULT_OUTPUT_FORMAT,
    output_quality: DEFAULT_OUTPUT_QUALITY,
    prompt,
  } satisfies Flux2KleinInput;
  const rawOutput = await replicate.run(getAvatarModel(), {
    input: modelInput,
  });
  const { blob, sourceUrl } = await readReplicateOutputFile(rawOutput);
  const contentType = blob.type || "image/png";
  const extension = resolveFileExtension(contentType, sourceUrl);
  const pathname = [
    "content-creator",
    referralCode,
    "avatar-candidates",
    `${Date.now()}-${variant + 1}-${sanitizeBaseName(displayName || persona.name)}${extension}`,
  ].join("/");
  const uploaded = await put(pathname, blob, {
    access: "public",
    addRandomSuffix: true,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
    contentType,
  });

  return {
    contentType: uploaded.contentType,
    pathname: uploaded.pathname,
    url: uploaded.url,
  };
}

export async function generateCreatorAvatarCandidates({
  displayName,
  persona,
  referralCode,
}: {
  displayName?: string | null;
  persona: CreatorCharacterPersona;
  referralCode: string;
}) {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }

  const identityPrompt = trimToLength(
    persona.identityPrompt,
    CHARACTER_PROMPT_LIMIT,
  );

  if (!identityPrompt) {
    throw new Error("characterPersona.identityPrompt is required.");
  }

  if (process.env.OPENAI_API_KEY?.trim()) {
    const candidates = await Promise.all(
      Array.from({ length: CANDIDATE_COUNT }, (_, index) =>
        generateOpenAiAvatarCandidate({
          displayName,
          persona,
          referralCode,
          variant: index,
        }),
      ),
    );

    return { candidates };
  }

  const replicateToken = process.env.REPLICATE_API_TOKEN?.trim();

  if (!replicateToken) {
    throw new Error("OPENAI_API_KEY or REPLICATE_API_TOKEN is not configured.");
  }

  const replicate = new Replicate({ auth: replicateToken });
  const results = await Promise.allSettled(
    Array.from({ length: CANDIDATE_COUNT }, (_, index) =>
      generateAvatarCandidate({
        displayName,
        persona,
        referralCode,
        replicate,
        variant: index,
      }),
    ),
  );
  const candidates = results
    .filter(
      (result): result is PromiseFulfilledResult<CreatorProfileAvatarCandidate> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value);

  if (candidates.length === 0) {
    const firstFailure = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    const message =
      firstFailure?.reason instanceof Error
        ? firstFailure.reason.message
        : "Failed to generate avatar candidates.";

    throw new Error(message);
  }

  return { candidates };
}
