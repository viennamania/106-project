import process from "node:process";

import { put } from "@vercel/blob";
import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

const IMAGE_PHOTO_QUALITY_TERMS = [
  "realistic photo",
  "professional photography",
  "cinematic angle",
  "dynamic back light shining",
];
const TITLE_LIMIT = 120;
const SUMMARY_LIMIT = 240;
const BODY_LIMIT = 360;
const PREVIEW_LIMIT = 220;
const STYLE_PROMPTS = {
  character:
    "Style direction: character-led portrait mood without identity drift, expressive but tasteful, keep the persona recognizable without revealing the paid plot.",
  curiosity:
    "Style direction: curiosity-led locked teaser, partial silhouette, obscured frame, intriguing crop, premium suspense, no spoilers.",
  mood:
    "Style direction: environment-led cinematic still, realistic location, props, lighting, and atmosphere create the question while the subject can stay indirect.",
  safe:
    "Style direction: public-safe editorial cover, calm composition, neutral details, brand-safe curiosity, no suggestive framing.",
};

const args = process.argv.slice(2);
const write = args.includes("--write");
const dryRun = !write;
const includeDrafts = args.includes("--include-drafts");
const includeGeneratedVideos = args.includes("--include-generated-videos");
const contentId = readArgValue("--content-id");
const email = readArgValue("--email")?.trim().toLowerCase() ?? "";
const limit = readPositiveInteger(readArgValue("--limit"), 25);
const style = normalizeStyle(readArgValue("--style"));
const mongoUri = process.env.MONGODB_URI?.trim() ?? "";
const mongoDbName = process.env.MONGODB_DB_NAME?.trim() ?? "";
const postsCollectionName =
  process.env.MONGODB_CONTENT_POSTS_COLLECTION?.trim() ?? "contentPosts";
const profilesCollectionName =
  process.env.MONGODB_CREATOR_PROFILES_COLLECTION?.trim() ?? "creatorProfiles";

if (!mongoUri) {
  throw new Error("MONGODB_URI is required.");
}

if (!mongoDbName) {
  throw new Error("MONGODB_DB_NAME is required.");
}

if (write && !process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
  throw new Error("BLOB_READ_WRITE_TOKEN is required when using --write.");
}

if (write && !process.env.OPENAI_API_KEY?.trim()) {
  throw new Error("OPENAI_API_KEY is required when using --write.");
}

const mongoClient = new MongoClient(mongoUri);

await mongoClient.connect();

try {
  const db = mongoClient.db(mongoDbName);
  const postsCollection = db.collection(postsCollectionName);
  const profilesCollection = db.collection(profilesCollectionName);
  const filter = buildCandidateFilter();
  const candidates = await postsCollection
    .find(filter)
    .sort({ publishedAt: -1, updatedAt: -1, createdAt: -1 })
    .limit(limit)
    .toArray();
  const profileByEmail = new Map();
  const summary = {
    dryRun,
    failed: 0,
    generated: 0,
    limit,
    promotedExistingImage: 0,
    scanned: candidates.length,
    skippedGeneratedVideo: 0,
    wouldGenerate: 0,
    wouldPromoteExistingImage: 0,
  };

  console.log("Paid video cover backfill candidates:");
  console.log(
    JSON.stringify(
      {
        contentId: contentId || null,
        email: email || null,
        includeDrafts,
        includeGeneratedVideos,
        limit,
        mode: write ? "write" : "dry-run",
        style,
        total: candidates.length,
      },
      null,
      2,
    ),
  );

  for (const post of candidates) {
    const contentVideoUrls = normalizeStringArray(post.contentVideoUrls);
    const primaryVideoUrl = contentVideoUrls[0] ?? "";
    const isGeneratedVideo = primaryVideoUrl.includes("/generated-content-videos/");

    if (isGeneratedVideo && !includeGeneratedVideos) {
      summary.skippedGeneratedVideo += 1;
      logItem(post, {
        action: "skip_generated_video",
        reason:
          "Known AI-generated video path. Use --include-generated-videos to process it.",
      });
      continue;
    }

    const existingImageUrl = normalizeStringArray(post.contentImageUrls)[0] ?? "";

    if (existingImageUrl) {
      if (dryRun) {
        summary.wouldPromoteExistingImage += 1;
        logItem(post, {
          action: "would_promote_existing_image",
          coverImageUrl: existingImageUrl,
        });
        continue;
      }

      await postsCollection.updateOne(
        { contentId: post.contentId },
        {
          $set: {
            coverImageUrl: existingImageUrl,
            updatedAt: new Date(),
          },
        },
      );
      summary.promotedExistingImage += 1;
      logItem(post, {
        action: "promoted_existing_image",
        coverImageUrl: existingImageUrl,
      });
      continue;
    }

    if (dryRun) {
      summary.wouldGenerate += 1;
      logItem(post, {
        action: "would_generate_ai_cover",
        style,
      });
      continue;
    }

    try {
      const profile = await getProfileForPost({
        post,
        profileByEmail,
        profilesCollection,
      });
      const generatedCover = await generateAndUploadPaidCover({
        post,
        profile,
        style,
      });

      await postsCollection.updateOne(
        { contentId: post.contentId },
        {
          $set: {
            coverImageUrl: generatedCover.url,
            updatedAt: new Date(),
          },
        },
      );
      summary.generated += 1;
      logItem(post, {
        action: "generated_ai_cover",
        coverImageUrl: generatedCover.url,
        pathname: generatedCover.pathname,
      });
    } catch (error) {
      summary.failed += 1;
      logItem(post, {
        action: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log("");
  console.log("Paid video cover backfill summary:");
  console.log(JSON.stringify(summary, null, 2));

  if (dryRun) {
    console.log("");
    console.log("Dry run complete. Re-run with --write to update covers.");
  }
} finally {
  await mongoClient.close();
}

function readArgValue(name) {
  const prefixed = `${name}=`;
  const inlineArg = args.find((arg) => arg.startsWith(prefixed));

  if (inlineArg) {
    return inlineArg.slice(prefixed.length);
  }

  const index = args.indexOf(name);

  if (index >= 0) {
    return args[index + 1];
  }

  return null;
}

function readPositiveInteger(value, fallback) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function normalizeStyle(value) {
  const normalized = value?.trim();

  if (normalized && Object.hasOwn(STYLE_PROMPTS, normalized)) {
    return normalized;
  }

  return "curiosity";
}

function buildCandidateFilter() {
  const filter = {
    "contentVideoUrls.0": { $exists: true },
    priceType: "paid",
    status: "published",
    $or: [
      { coverImageUrl: { $exists: false } },
      { coverImageUrl: null },
      { coverImageUrl: "" },
      { coverImageUrl: { $regex: "^\\s*$" } },
    ],
  };

  if (includeDrafts) {
    delete filter.status;
  }

  if (contentId) {
    filter.contentId = contentId;
  }

  if (email) {
    filter.authorEmail = email;
  }

  return filter;
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

function trimToLength(value, limit) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function sanitizeBaseName(name) {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return normalized || "paid-video-cover";
}

function applyImagePhotoQualityPreset(prompt) {
  const normalized = prompt.trim();

  if (!normalized) {
    return IMAGE_PHOTO_QUALITY_TERMS.join(", ");
  }

  const lowerPrompt = normalized.toLowerCase();
  const missingTerms = IMAGE_PHOTO_QUALITY_TERMS.filter(
    (term) => !lowerPrompt.includes(term),
  );

  if (missingTerms.length === 0) {
    return normalized;
  }

  return `${normalized} Image quality: ${missingTerms.join(", ")}.`;
}

async function getProfileForPost({ post, profileByEmail, profilesCollection }) {
  const authorEmail = trimToLength(post.authorEmail, 160);

  if (!authorEmail) {
    return null;
  }

  if (profileByEmail.has(authorEmail)) {
    return profileByEmail.get(authorEmail);
  }

  const profile = await profilesCollection.findOne(
    { email: authorEmail },
    {
      projection: {
        characterPersona: 1,
        displayName: 1,
      },
    },
  );

  profileByEmail.set(authorEmail, profile);
  return profile;
}

function buildPaidCoverPrompt({ post, profile, style }) {
  const title = trimToLength(post.title, TITLE_LIMIT);
  const summary = trimToLength(post.summary, SUMMARY_LIMIT);
  const previewText = trimToLength(post.previewText, PREVIEW_LIMIT);
  const body = trimToLength(post.body, BODY_LIMIT);
  const characterName = trimToLength(
    profile?.characterPersona?.name || profile?.displayName,
    80,
  );

  return applyImagePhotoQualityPreset(
    [
      "Create a public teaser cover image for a locked 1 USDT FanLetter paid vlog.",
      "The cover is visible before payment, so create curiosity without revealing the full paid video content.",
      STYLE_PROMPTS[style],
      characterName
        ? `Keep the AI character mood consistent with: ${characterName}.`
        : null,
      title ? `Public title context: ${title}.` : null,
      summary ? `Public summary context: ${summary}.` : null,
      previewText ? `Public teaser context: ${previewText}.` : null,
      body ? `Use body context only as subtle mood, not literal spoilers: ${body}.` : null,
      "Safe-for-work only: no nudity, sexual framing, private body focus, gore, weapons, minors, or explicit scenes.",
      "Do not include text, letters, numbers, logos, watermarks, UI, price labels, or payment icons.",
      "Do not create an exact still frame from the paid video. Use a tasteful editorial teaser composition instead.",
      "Use cinematic lighting, one clear focal subject, tasteful negative space, and a premium vertical-vlog teaser mood.",
      "Landscape aspect ratio, suitable for feed cards, detail headers, and social sharing previews.",
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function buildSafeRetryPrompt({ post }) {
  const title = trimToLength(post.title, TITLE_LIMIT);
  const summary = trimToLength(post.summary, SUMMARY_LIMIT);

  return applyImagePhotoQualityPreset(
    [
      "Create a public-safe teaser cover image for a locked paid creator vlog.",
      "Use a non-human symbolic composition: refined objects, architecture, interiors, soft light, natural textures, or a premium still life.",
      "Do not depict people, faces, bodies, silhouettes, skin, crowds, hands, clothing, minors, nudity, erotic framing, violence, gore, weapons, or medical injury.",
      "Do not include text, letters, numbers, logos, watermarks, UI, price labels, or payment icons.",
      title ? `Public title context: ${title}.` : null,
      summary ? `Public summary context: ${summary}.` : null,
      "Landscape aspect ratio, suitable for feed cards and detail headers.",
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function buildNeutralFallbackPrompt() {
  return applyImagePhotoQualityPreset(
    [
      "Create a premium public teaser cover for a paid creator vlog.",
      "Use a completely non-human, safe-for-work abstract editorial composition with polished light, refined materials, soft depth, subtle geometric structure, and a trustworthy modern tone.",
      "Do not depict people, faces, bodies, silhouettes, skin, clothing, text, typography, letters, numbers, logos, watermarks, weapons, violence, medical scenes, or sexual content.",
      "Landscape aspect ratio, suitable for feed cards and detail headers.",
    ].join(" "),
  );
}

function isSafetyRejection(error) {
  return (
    error instanceof Error &&
    /safety|rejected by the safety system|safety_violations/i.test(error.message)
  );
}

async function generateImageBase64(prompt) {
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
      Authorization: `Bearer ${process.env.OPENAI_API_KEY?.trim()}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = await response.json().catch(() => null);

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

async function generateAndUploadPaidCover({ post, profile, style }) {
  let generatedImage;

  try {
    generatedImage = await generateImageBase64(
      buildPaidCoverPrompt({
        post,
        profile,
        style,
      }),
    );
  } catch (error) {
    if (!isSafetyRejection(error)) {
      throw error;
    }

    try {
      generatedImage = await generateImageBase64(buildSafeRetryPrompt({ post }));
    } catch (retryError) {
      if (!isSafetyRejection(retryError)) {
        throw retryError;
      }

      generatedImage = await generateImageBase64(buildNeutralFallbackPrompt());
    }
  }

  const imageBytes = Buffer.from(generatedImage.imageBase64, "base64");
  const referralCode = trimToLength(post.authorReferralCode, 80);

  if (!referralCode) {
    throw new Error("Post is missing authorReferralCode.");
  }

  const pathname = [
    "content-posts",
    referralCode,
    "generated",
    `${Date.now()}-${sanitizeBaseName(
      post.title || post.summary || post.contentId || "paid-video-cover",
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
    revisedPrompt: generatedImage.revisedPrompt,
    url: uploaded.url,
  };
}

function logItem(post, payload) {
  console.log(
    JSON.stringify(
      {
        authorEmail: post.authorEmail ?? null,
        contentId: post.contentId ?? null,
        publishedAt: post.publishedAt ?? null,
        title: post.title ?? null,
        ...payload,
      },
      null,
      2,
    ),
  );
}
