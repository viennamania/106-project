import { put } from "@vercel/blob";

import type { ContentPostGenerateCoverResponse } from "@/lib/content";
import { getMembersCollection } from "@/lib/mongodb";
import { normalizeEmail } from "@/lib/member";

export const runtime = "nodejs";

const TITLE_LIMIT = 120;
const SUMMARY_LIMIT = 240;
const BODY_LIMIT = 480;

type GenerateCoverRequest = {
  body?: string | null;
  email?: string | null;
  summary?: string | null;
  title?: string | null;
};

type OpenAiImageGenerationResponse = {
  data?: Array<{
    b64_json?: string;
    revised_prompt?: string;
  }>;
  error?: {
    message?: string;
  };
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

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
}) {
  const body = trimToLength(input.body, BODY_LIMIT);
  const summary = trimToLength(input.summary, SUMMARY_LIMIT);
  const title = trimToLength(input.title, TITLE_LIMIT);

  return [
    "Create a premium editorial cover image for a network content feed.",
    "Do not include any text, letters, numbers, logos, watermarks, or UI chrome.",
    "Use a clean, modern, visually striking composition with one clear subject and strong depth.",
    "Landscape aspect ratio, suitable for a feed card and article header.",
    "Style: polished, cinematic, trustworthy, high-signal, not cartoonish, not childish.",
    title ? `Core topic: ${title}.` : null,
    summary ? `Summary context: ${summary}.` : null,
    body ? `Supporting context: ${body}.` : null,
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
      quality: process.env.OPENAI_CONTENT_IMAGE_QUALITY?.trim() || "medium",
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

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return jsonError("BLOB_READ_WRITE_TOKEN is not configured.", 500);
  }

  let body: GenerateCoverRequest | null = null;

  try {
    body = (await request.json()) as GenerateCoverRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const email = normalizeEmail(body?.email ?? "");

  if (!email) {
    return jsonError("email is required.", 400);
  }

  const title = trimToLength(body?.title, TITLE_LIMIT);
  const summary = trimToLength(body?.summary, SUMMARY_LIMIT);
  const contentBody = trimToLength(body?.body, BODY_LIMIT);

  if (!title && !summary && !contentBody) {
    return jsonError("Provide title, summary, or body to generate a cover.", 400);
  }

  const membersCollection = await getMembersCollection();
  const member = await membersCollection.findOne({ email });

  if (!member) {
    return jsonError("Member not found.", 404);
  }

  if (member.status !== "completed" || !member.referralCode) {
    return jsonError("Creator Studio is only available to completed members.", 403);
  }

  try {
    const prompt = buildImagePrompt({
      body: contentBody,
      summary,
      title,
    });
    const { imageBase64, revisedPrompt } = await generateImageBase64(prompt);
    const imageBytes = Buffer.from(imageBase64, "base64");
    const pathname = [
      "content-posts",
      member.referralCode,
      "generated",
      `${Date.now()}-${sanitizeBaseName(title || summary || "ai-cover")}.png`,
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

    const response: ContentPostGenerateCoverResponse = {
      contentType: uploaded.contentType,
      pathname: uploaded.pathname,
      revisedPrompt,
      url: uploaded.url,
    };

    return Response.json(response);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to generate AI cover.",
      500,
    );
  }
}
