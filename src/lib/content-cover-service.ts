import "server-only";

import { put } from "@vercel/blob";

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

  const prompt = buildImagePrompt({
    body,
    summary,
    title,
    visualBrief,
  });
  const { imageBase64, revisedPrompt } = await generateImageBase64(prompt);
  const imageBytes = Buffer.from(imageBase64, "base64");
  const pathname = [
    "content-posts",
    input.referralCode,
    "generated",
    `${Date.now()}-${sanitizeBaseName(
      title || summary || visualBrief || "ai-cover",
    )}.png`,
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
    revisedPrompt,
    url: uploaded.url,
  };
}
