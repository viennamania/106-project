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
const CHARACTER_PROMPT_LIMIT = 1_800;

type AvatarExpressionSpec = {
  expression: NonNullable<CreatorProfileAvatarCandidate["expression"]>;
  label: string;
  prompt: string;
};

const AVATAR_EXPRESSION_SET = [
  {
    expression: "default",
    label: "대표",
    prompt:
      "neutral studio background, direct confident expression, clean first-impression channel hero look",
  },
  {
    expression: "smile",
    label: "미소",
    prompt:
      "soft gray studio background, gentle natural smile, warm eyes, approachable fan reply mood",
  },
  {
    expression: "serious",
    label: "차분",
    prompt:
      "clean editorial background, calm composed expression, steady gaze, polished routine vlog mood",
  },
  {
    expression: "reaction",
    label: "리액션",
    prompt:
      "clean studio background, vivid surprised reaction, expressive eyes, slightly raised eyebrows, memorable ending cut",
  },
  {
    expression: "shy",
    label: "설렘",
    prompt:
      "soft daylight studio background, shy delighted expression, subtle blush mood, gentle fan-service moment",
  },
  {
    expression: "focus",
    label: "집중",
    prompt:
      "minimal editorial background, focused thoughtful expression, slightly serious eyes, behind-the-scenes planning mood",
  },
  {
    expression: "fanservice",
    label: "팬서비스",
    prompt:
      "bright clean background, playful wink or tiny heart gesture close to face, friendly fan-service expression",
  },
  {
    expression: "thumbnail",
    label: "썸네일",
    prompt:
      "high-clarity thumbnail look, curious bright expression, slight head tilt, strong eye contact, clean contrast without text",
  },
] satisfies AvatarExpressionSpec[];

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
  expression,
  persona,
}: {
  displayName?: string | null;
  expression: AvatarExpressionSpec;
  persona: CreatorCharacterPersona;
}) {
  const identityPrompt = trimToLength(
    persona.identityPrompt,
    CHARACTER_PROMPT_LIMIT,
  );
  const name = trimToLength(displayName, 80) || "creator";

  return [
    "Create a square creator profile avatar using the fixed character persona.",
    `Creator label: ${name}. Do not render text or logos.`,
    `Avatar set expression: ${expression.label}.`,
    `Fixed character persona: ${identityPrompt}`,
    "Generate this as one frame in a single consistent character expression kit. The same person must appear across every cut; only the facial expression, micro-pose, and emotional tone may change.",
    "Preserve exact facial identity: face shape, eyes, nose, mouth, eyebrows, hairline, hairstyle, skin tone, age range, body proportions, makeup level, and recognizable features.",
    "Head-and-shoulders portrait, centered composition, professional social profile avatar, high-quality digital realism, natural skin texture, clean lighting, consistent crop and lens.",
    expression.prompt,
    "Do not redesign the character, change wardrobe direction dramatically, shift ethnicity, alter age, change hair length, or make the character look like a different person.",
    "No full-body pose, no busy background, no extra people, no text, no watermark, no explicit or adult styling.",
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
  expression,
  persona,
  referralCode,
}: {
  displayName?: string | null;
  expression: AvatarExpressionSpec;
  persona: CreatorCharacterPersona;
  referralCode: string;
}): Promise<CreatorProfileAvatarCandidate> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const prompt = createAvatarPrompt({ displayName, expression, persona });
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
    `${Date.now()}-${expression.expression}-${sanitizeBaseName(displayName || persona.name)}.png`,
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
    expression: expression.expression,
    label: expression.label,
    pathname: uploaded.pathname,
    url: uploaded.url,
  };
}

async function generateAvatarCandidate({
  displayName,
  expression,
  persona,
  referralCode,
  replicate,
}: {
  displayName?: string | null;
  expression: AvatarExpressionSpec;
  persona: CreatorCharacterPersona;
  referralCode: string;
  replicate: Replicate;
}): Promise<CreatorProfileAvatarCandidate> {
  const prompt = createAvatarPrompt({ displayName, expression, persona });
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
    `${Date.now()}-${expression.expression}-${sanitizeBaseName(displayName || persona.name)}${extension}`,
  ].join("/");
  const uploaded = await put(pathname, blob, {
    access: "public",
    addRandomSuffix: true,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
    contentType,
  });

  return {
    contentType: uploaded.contentType,
    expression: expression.expression,
    label: expression.label,
    pathname: uploaded.pathname,
    url: uploaded.url,
  };
}

function collectGeneratedAvatarCandidates(
  results: Array<PromiseSettledResult<CreatorProfileAvatarCandidate>>,
) {
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

  return candidates;
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
    const results = await Promise.allSettled(
      AVATAR_EXPRESSION_SET.map((expression) =>
        generateOpenAiAvatarCandidate({
          displayName,
          expression,
          persona,
          referralCode,
        }),
      ),
    );

    return { candidates: collectGeneratedAvatarCandidates(results) };
  }

  const replicateToken = process.env.REPLICATE_API_TOKEN?.trim();

  if (!replicateToken) {
    throw new Error("OPENAI_API_KEY or REPLICATE_API_TOKEN is not configured.");
  }

  const replicate = new Replicate({ auth: replicateToken });
  const results = await Promise.allSettled(
    AVATAR_EXPRESSION_SET.map((expression) =>
      generateAvatarCandidate({
        displayName,
        expression,
        persona,
        referralCode,
        replicate,
      }),
    ),
  );

  return { candidates: collectGeneratedAvatarCandidates(results) };
}
