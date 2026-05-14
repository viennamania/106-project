import process from "node:process";
import { spawn } from "node:child_process";

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
const FRAME_CAPTURE_TIMEOUT_MS = 30000;
const FRAME_COVER_MAX_WIDTH = 1280;
const FRAME_COVER_CONTENT_TYPE = "image/jpeg";
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
const replaceExistingCovers = args.includes("--replace-existing-covers");
const allowAiFallback = !args.includes("--no-ai-fallback");
const coverMode = normalizeCoverMode(readArgValue("--cover-mode"));
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

if (
  write &&
  (coverMode === "ai" || allowAiFallback) &&
  !process.env.OPENAI_API_KEY?.trim()
) {
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
    allowAiFallback,
    coverMode,
    dryRun,
    failed: 0,
    generated: 0,
    limit,
    promotedExistingImage: 0,
    replaceExistingCovers,
    scanned: candidates.length,
    skippedGeneratedVideo: 0,
    videoFrameExtracted: 0,
    wouldExtractVideoFrame: 0,
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
        coverMode,
        replaceExistingCovers,
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

    if (existingImageUrl && !replaceExistingCovers) {
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
      if (coverMode === "video-frame") {
        summary.wouldExtractVideoFrame += 1;
        logItem(post, {
          action: "would_extract_video_frame",
          coverImageUrl: trimToLength(post.coverImageUrl, 500) || undefined,
          reason: replaceExistingCovers
            ? "Would replace the current cover with a frame from the paid video."
            : undefined,
        });
      } else {
        summary.wouldGenerate += 1;
        logItem(post, {
          action: "would_generate_ai_cover",
          style,
        });
      }
      continue;
    }

    try {
      const profile = await getProfileForPost({
        post,
        profileByEmail,
        profilesCollection,
      });
      const referralCode = trimToLength(post.authorReferralCode, 80);

      if (!referralCode) {
        throw new Error("Post is missing authorReferralCode.");
      }

      let action = "generated_ai_cover";
      let fallbackError;
      let generatedCover;

      if (coverMode === "video-frame") {
        try {
          generatedCover = await extractAndUploadVideoFrameCover({
            post,
            referralCode,
            videoUrl: primaryVideoUrl,
          });
          action = "extracted_video_frame";
        } catch (error) {
          fallbackError = error instanceof Error ? error.message : String(error);

          if (!allowAiFallback) {
            throw error;
          }

          generatedCover = await generateAndUploadPaidCover({
            post,
            profile,
            style,
          });
          action = "generated_ai_cover";
        }
      } else {
        generatedCover = await generateAndUploadPaidCover({
          post,
          profile,
          style,
        });
      }

      await postsCollection.updateOne(
        { contentId: post.contentId },
        {
          $set: {
            coverImageUrl: generatedCover.url,
            updatedAt: new Date(),
          },
        },
      );
      if (action === "extracted_video_frame") {
        summary.videoFrameExtracted += 1;
      } else {
        summary.generated += 1;
      }
      logItem(post, {
        action,
        coverImageUrl: generatedCover.url,
        fallbackError,
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

function normalizeCoverMode(value) {
  const normalized = value?.trim();

  return normalized === "ai" ? "ai" : "video-frame";
}

function buildCandidateFilter() {
  const filter = {
    "contentVideoUrls.0": { $exists: true },
    priceType: "paid",
    status: "published",
  };

  if (includeDrafts) {
    delete filter.status;
  }

  if (!replaceExistingCovers) {
    filter.$or = [
      { coverImageUrl: { $exists: false } },
      { coverImageUrl: null },
      { coverImageUrl: "" },
      { coverImageUrl: { $regex: "^\\s*$" } },
    ];
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

function runCommand(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`${command} timed out.`));
    }, options.timeoutMs ?? FRAME_CAPTURE_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdoutChunks.push(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderrChunks.push(chunk);
    });
    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      const stderr = Buffer.concat(stderrChunks).toString("utf8").slice(-1200);
      const stdout = Buffer.concat(stdoutChunks);

      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}. ${stderr}`));
        return;
      }

      resolve({ stderr, stdout });
    });
  });
}

async function getVideoDurationSeconds(videoUrl) {
  const { stdout } = await runCommand(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      videoUrl,
    ],
    { timeoutMs: FRAME_CAPTURE_TIMEOUT_MS },
  );
  const duration = Number(stdout.toString("utf8").trim());

  return Number.isFinite(duration) && duration > 0 ? duration : null;
}

function resolveFrameCaptureTime(duration) {
  if (!duration || duration <= 0.6) {
    return 0;
  }

  return Math.min(Math.max(duration * 0.18, 0.6), Math.max(duration - 0.2, 0));
}

async function extractVideoFrameCoverBuffer(videoUrl) {
  const duration = await getVideoDurationSeconds(videoUrl).catch(() => null);
  const captureTime = resolveFrameCaptureTime(duration);
  const { stdout } = await runCommand(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      captureTime.toFixed(3),
      "-i",
      videoUrl,
      "-frames:v",
      "1",
      "-vf",
      `scale='min(${FRAME_COVER_MAX_WIDTH},iw)':-2`,
      "-q:v",
      "3",
      "-f",
      "image2pipe",
      "-vcodec",
      "mjpeg",
      "pipe:1",
    ],
    { timeoutMs: FRAME_CAPTURE_TIMEOUT_MS },
  );

  if (stdout.length === 0) {
    throw new Error("ffmpeg returned an empty video frame.");
  }

  return stdout;
}

async function extractAndUploadVideoFrameCover({ post, referralCode, videoUrl }) {
  if (!videoUrl) {
    throw new Error("Post is missing a paid video URL.");
  }

  const imageBytes = await extractVideoFrameCoverBuffer(videoUrl);
  const pathname = [
    "content-posts",
    referralCode,
    "generated",
    `${Date.now()}-${sanitizeBaseName(
      `${trimToLength(post.title, TITLE_LIMIT) || post.contentId || "paid-video"}-frame-cover`,
    )}.jpg`,
  ].join("/");
  const uploaded = await put(
    pathname,
    new Blob([imageBytes], { type: FRAME_COVER_CONTENT_TYPE }),
    {
      access: "public",
      addRandomSuffix: true,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
      contentType: FRAME_COVER_CONTENT_TYPE,
    },
  );

  return {
    contentType: uploaded.contentType,
    pathname: uploaded.pathname,
    url: uploaded.url,
  };
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
