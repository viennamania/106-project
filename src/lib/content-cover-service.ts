import "server-only";

import { put } from "@vercel/blob";

import type {
  ContentCoverGenerationProgressStep,
  ContentPostGenerateCoverProgressEvent,
} from "@/lib/content";

const TITLE_LIMIT = 120;
const SUMMARY_LIMIT = 240;
const BODY_LIMIT = 480;
const VISUAL_BRIEF_LIMIT = 320;

type OpenAiImageGenerationResponse = {
  data?: Array<{
    b64_json?: string;
    revised_prompt?: string;
  }>;
  error?: {
    message?: string;
  };
};

export type GenerateContentCoverInput = {
  body?: string | null;
  onProgress?: (
    event: ContentPostGenerateCoverProgressEvent,
  ) => Promise<void> | void;
  referralCode: string;
  summary?: string | null;
  title?: string | null;
  visualBrief?: string | null;
};

export type GeneratedContentCover = {
  contentType: string;
  pathname: string;
  revisedPrompt: string | null;
  url: string;
};

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

  return normalized || "ai-cover";
}

function buildImagePrompt(input: {
  body: string;
  summary: string;
  title: string;
  visualBrief: string;
}) {
  return [
    "Create a premium editorial cover image for a network content feed.",
    "Do not include any text, letters, numbers, logos, watermarks, or UI chrome.",
    "Use a clean, modern, visually striking composition with one clear subject and strong depth.",
    "Landscape aspect ratio, suitable for a feed card and article header.",
    "Style: polished, cinematic, trustworthy, high-signal, not cartoonish, not childish.",
    input.title ? `Core topic: ${input.title}.` : null,
    input.summary ? `Summary context: ${input.summary}.` : null,
    input.body ? `Supporting context: ${input.body}.` : null,
    input.visualBrief ? `Visual direction: ${input.visualBrief}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildSafeRetryPrompt(input: {
  summary: string;
  title: string;
}) {
  return [
    "Create a premium editorial cover image for a network content feed.",
    "Safe-for-work only. Use a non-human symbolic composition: refined objects, architecture, interiors, landscape details, abstract light, natural textures, or product-like still life.",
    "Do not depict people, faces, bodies, silhouettes, skin, crowds, hands, clothing, celebrities, real people, lookalikes, minors, nudity, erotic framing, violence, gore, weapons, or medical injury.",
    "Treat the content topic only as abstract editorial context. Do not literally visualize sensitive wording from the title or summary.",
    "Do not include any text, letters, numbers, logos, watermarks, or UI chrome.",
    "Use a clean, modern, trustworthy composition with one clear focal subject and cinematic lighting.",
    "Landscape aspect ratio, suitable for a feed card and article header.",
    input.title ? `Core topic: ${input.title}.` : null,
    input.summary ? `Summary context: ${input.summary}.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildNeutralFallbackPrompt() {
  return [
    "Create a premium editorial cover image for a creator network content feed.",
    "Use a completely non-human, safe-for-work abstract composition with polished light, refined materials, soft depth, subtle geometric structure, and a trustworthy modern tone.",
    "Do not depict people, faces, bodies, silhouettes, skin, clothing, text, typography, letters, numbers, logos, watermarks, weapons, violence, medical scenes, or sexual content.",
    "Landscape aspect ratio, suitable for a feed card and article header.",
  ]
    .filter(Boolean)
    .join(" ");
}

function isSafetyRejection(error: unknown) {
  return (
    error instanceof Error &&
    /safety|rejected by the safety system|safety_violations/i.test(
      error.message,
    )
  );
}

async function generateImageBase64(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    body: JSON.stringify({
      background: "opaque",
      model: process.env.OPENAI_CONTENT_IMAGE_MODEL?.trim() || "gpt-image-1.5",
      output_format: "png",
      prompt,
      quality: process.env.OPENAI_CONTENT_IMAGE_QUALITY?.trim() || "high",
      size: process.env.OPENAI_CONTENT_IMAGE_SIZE?.trim() || "1536x1024",
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
        ? `OpenAI image generation failed: ${payload.error.message}`
        : `OpenAI image generation failed with status ${response.status}.`,
    );
  }

  const image = payload?.data?.[0];

  if (!image?.b64_json) {
    throw new Error("OpenAI image generation returned no image data.");
  }

  return {
    imageBase64: image.b64_json,
    revisedPrompt: image.revised_prompt?.trim() || null,
  };
}

async function reportProgress(
  onProgress:
    | ((
        event: ContentPostGenerateCoverProgressEvent,
      ) => Promise<void> | void)
    | undefined,
  event: {
    message: string;
    progress: number;
    status: "completed" | "failed" | "running";
    step: ContentCoverGenerationProgressStep;
  },
) {
  await onProgress?.(event);
}

export async function generateAndUploadContentCover(
  input: GenerateContentCoverInput,
): Promise<GeneratedContentCover> {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }

  const title = trimToLength(input.title, TITLE_LIMIT);
  const summary = trimToLength(input.summary, SUMMARY_LIMIT);
  const body = trimToLength(input.body, BODY_LIMIT);
  const visualBrief = trimToLength(input.visualBrief, VISUAL_BRIEF_LIMIT);

  if (!title && !summary && !body && !visualBrief) {
    throw new Error(
      "Provide title, summary, body, or visual brief to generate a cover.",
    );
  }

  await reportProgress(input.onProgress, {
    message: "Preparing the visual direction for the cover.",
    progress: 18,
    status: "running",
    step: "preparing_prompt",
  });
  const prompt = buildImagePrompt({
    body,
    summary,
    title,
    visualBrief,
  });
  await reportProgress(input.onProgress, {
    message: "Creative brief is ready. Starting image generation.",
    progress: 28,
    status: "completed",
    step: "preparing_prompt",
  });
  await reportProgress(input.onProgress, {
    message: "Generating the AI cover image.",
    progress: 42,
    status: "running",
    step: "generating_image",
  });
  let generatedImage: {
    imageBase64: string;
    revisedPrompt: string | null;
  };

  try {
    generatedImage = await generateImageBase64(prompt);
  } catch (error) {
    if (!isSafetyRejection(error)) {
      throw error;
    }

    await reportProgress(input.onProgress, {
      message:
        "The first cover prompt was blocked by image safety filters. Retrying with a non-human editorial direction.",
      progress: 58,
      status: "running",
      step: "generating_image",
    });

    try {
      generatedImage = await generateImageBase64(
        buildSafeRetryPrompt({
          summary,
          title,
        }),
      );
    } catch (retryError) {
      if (!isSafetyRejection(retryError)) {
        throw retryError;
      }

      await reportProgress(input.onProgress, {
        message:
          "The safer cover prompt was also blocked. Retrying with a neutral fallback cover.",
        progress: 64,
        status: "running",
        step: "generating_image",
      });

      generatedImage = await generateImageBase64(buildNeutralFallbackPrompt());
    }
  }

  const { imageBase64, revisedPrompt } = generatedImage;
  await reportProgress(input.onProgress, {
    message: "AI image created. Preparing upload.",
    progress: 74,
    status: "completed",
    step: "generating_image",
  });
  const imageBytes = Buffer.from(imageBase64, "base64");
  const pathname = [
    "content-posts",
    input.referralCode,
    "generated",
    `${Date.now()}-${sanitizeBaseName(
      title || summary || visualBrief || "ai-cover",
    )}.png`,
  ].join("/");

  await reportProgress(input.onProgress, {
    message: "Uploading the cover to your studio assets.",
    progress: 84,
    status: "running",
    step: "uploading_cover",
  });
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
  await reportProgress(input.onProgress, {
    message: "Cover uploaded. Finalizing the result.",
    progress: 94,
    status: "completed",
    step: "uploading_cover",
  });

  return {
    contentType: uploaded.contentType,
    pathname: uploaded.pathname,
    revisedPrompt,
    url: uploaded.url,
  };
}
