import { createFalClient } from "@fal-ai/client";
import { put } from "@vercel/blob";
import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

const DEFAULT_DRY_RUN_LIMIT = 20;
const DEFAULT_WRITE_LIMIT = 1;
const DEFAULT_FAL_MODEL = "fal-ai/flux-pro/v1.1-ultra";
const DEFAULT_TIMEOUT_MS = 120_000;
const PROFILE_BACKFILL_METHOD = "fal_20s_30s_female_profile_v1";
const PLACEHOLDER_NAME_PATTERN = /\bstarter\s+ai\s+star\b/i;

const args = process.argv.slice(2);
const write = args.includes("--write");
const continueOnError = args.includes("--continue-on-error");
const starIdFilter = readArgValue("--star-id");
const limit = readPositiveInteger(
  readArgValue("--limit"),
  write ? DEFAULT_WRITE_LIMIT : DEFAULT_DRY_RUN_LIMIT,
);
const falModel = readArgValue("--model") || process.env.FAL_AI_STAR_PROFILE_MODEL || DEFAULT_FAL_MODEL;
const profileUrlPool = readUrlPool(
  readArgValue("--profile-url-pool") || process.env.FANLETTER_AI_STAR_PROFILE_URL_POOL,
);
const mongoUri = process.env.MONGODB_URI?.trim() ?? "";
const mongoDbName = process.env.MONGODB_DB_NAME?.trim() ?? "";
const starsCollectionName =
  process.env.MONGODB_FANLETTER_STARS_COLLECTION?.trim() ?? "fanletterStars";

const GENERATED_NAMES = [
  "서아",
  "하린",
  "유나",
  "민서",
  "서윤",
  "지아",
  "아린",
  "채원",
  "나연",
  "윤서",
  "세아",
  "다은",
  "수아",
  "예린",
  "라온",
  "하윤",
  "소윤",
  "리아",
  "유리",
  "가은",
  "이서",
  "서현",
  "다온",
  "하나",
  "연우",
  "시은",
  "유진",
  "채아",
  "로아",
  "지유",
  "아윤",
  "서진",
  "하영",
  "나린",
  "예나",
  "수빈",
  "민지",
  "유하",
  "다희",
  "서하",
  "지안",
  "소미",
  "아라",
  "윤아",
  "세린",
  "하람",
  "나은",
  "채린",
  "리나",
  "은서",
  "서율",
  "민아",
  "유림",
  "하은",
  "보라",
  "아영",
  "다솜",
  "서영",
  "지민",
  "혜린",
  "나경",
  "수연",
  "예은",
  "린아",
  "서린",
  "유빈",
  "가윤",
  "채윤",
  "아현",
  "다연",
  "하율",
  "나율",
  "서우",
  "민채",
  "유정",
  "세윤",
  "윤하",
  "해린",
  "이린",
  "도아",
  "아민",
  "소라",
  "리안",
  "주아",
  "하리",
  "나리",
  "서빈",
  "유솔",
  "다빈",
  "시연",
  "예지",
  "지현",
  "수현",
  "아솔",
  "혜나",
  "세희",
  "라희",
  "은채",
  "채희",
  "아진",
  "유채",
  "하경",
  "서희",
  "나현",
  "도연",
  "윤채",
  "소은",
  "리윤",
  "해윤",
  "다인",
  "예솔",
  "지온",
  "수민",
  "아림",
  "서정",
  "유라",
  "하빈",
  "나혜",
  "채빈",
  "민솔",
  "아린느",
  "세리",
  "리엘",
  "유엘",
  "라빈",
  "서엘",
  "하엘",
  "미유",
  "소율",
  "제나",
  "엘린",
  "리아나",
  "미나",
  "다엘",
  "로윤",
  "아엘",
  "린서",
  "윤비",
  "채율",
  "나오",
  "세나",
  "유안",
  "하루",
  "서리",
  "리하",
  "아나",
];

const STYLE_PRESETS = [
  {
    label: "golf lifestyle",
    prompt:
      "polished golf lifestyle AI star, cream knit polo, outdoor country club light, refined sporty elegance",
  },
  {
    label: "fashion beauty",
    prompt:
      "fashion and beauty AI star, soft editorial makeup, clean high-end studio background, graceful styling",
  },
  {
    label: "travel vlog",
    prompt:
      "travel vlog AI star, relaxed linen jacket, bright airy natural background, fresh cinematic mood",
  },
  {
    label: "story writing",
    prompt:
      "story and writing AI star, calm creative studio, subtle literary mood, elegant understated styling",
  },
  {
    label: "daily creator",
    prompt:
      "daily lifestyle creator AI star, warm approachable expression, modern minimal studio, friendly premium look",
  },
  {
    label: "premium fan",
    prompt:
      "premium fan communication AI star, soft smile, sophisticated portrait lighting, intimate but modest styling",
  },
];

if (!mongoUri) {
  throw new Error("MONGODB_URI is required.");
}

if (!mongoDbName) {
  throw new Error("MONGODB_DB_NAME is required.");
}

if (write && profileUrlPool.length === 0 && !process.env.FAL_KEY?.trim()) {
  throw new Error("FAL_KEY is required when using --write.");
}

if (write && profileUrlPool.length === 0 && !process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
  throw new Error("BLOB_READ_WRITE_TOKEN is required when using --write.");
}

function readArgValue(name) {
  const index = args.indexOf(name);

  if (index < 0) {
    return null;
  }

  const value = args[index + 1];

  return value && !value.startsWith("--") ? value : null;
}

function readPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readUrlPool(value) {
  return normalizeText(value)
    .split(",")
    .map((url) => url.trim())
    .filter((url) => /^https:\/\/.+/i.test(url));
}

function normalizeText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function normalizeStarId(value) {
  return normalizeText(value).toLowerCase();
}

function sanitizeBaseName(name) {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return normalized || "ai-star-profile";
}

function stableHash(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function isMissingPortrait(star) {
  return !normalizeText(star.portraitImageUrl);
}

function isPlaceholderName(value) {
  const name = normalizeText(value);

  return !name || PLACEHOLDER_NAME_PATTERN.test(name);
}

function getCurrentName(star) {
  return normalizeText(star.characterName) || normalizeText(star.displayName);
}

function getOwnerId(star) {
  const email = normalizeText(star.ownerEmail).toLowerCase();
  const localPart = email.split("@")[0]?.trim();

  return localPart || normalizeStarId(star.starId).replace(/^legacy-star-/, "");
}

function pickGeneratedName({ plannedNames, star, usedNames }) {
  const start = stableHash(`${star.starId}:${star.ownerEmail ?? ""}`) % GENERATED_NAMES.length;

  for (let offset = 0; offset < GENERATED_NAMES.length; offset += 1) {
    const candidate = GENERATED_NAMES[(start + offset) % GENERATED_NAMES.length];

    if (!usedNames.has(candidate) && !plannedNames.has(candidate)) {
      plannedNames.add(candidate);
      return candidate;
    }
  }

  const fallback = `AI스타${String(plannedNames.size + 1).padStart(2, "0")}`;
  plannedNames.add(fallback);
  return fallback;
}

function pickStyle(star) {
  return STYLE_PRESETS[stableHash(star.starId) % STYLE_PRESETS.length];
}

function pickProfileUrlFromPool(star) {
  if (profileUrlPool.length === 0) {
    return null;
  }

  return profileUrlPool[stableHash(star.starId) % profileUrlPool.length];
}

function buildPrompt({ name, star }) {
  const style = pickStyle(star);

  return [
    "Create a square fictional AI Star profile portrait.",
    "Subject: fictional adult woman, clearly 25 to 32 years old, not a minor, not a real person, not a celebrity lookalike.",
    "Visual identity: Korean or East Asian inspired AI star, head-and-shoulders portrait, centered face, natural skin texture, realistic photography, polished creator profile avatar.",
    `Character name label for internal direction only: ${name}. Do not render text.`,
    `Creator style: ${style.prompt}.`,
    "Mood: bright, sophisticated, premium but approachable, suitable for an AI creator discovery platform.",
    "Composition: clean soft background, flattering studio lighting, sharp eyes, realistic hair detail, modest modern fashion, no busy props.",
    "Strict exclusions: no text, no logo, no watermark, no extra people, no childlike face, no school uniform, no explicit styling, no lingerie, no exaggerated body framing.",
  ].join(" ");
}

function getErrorMessage(error) {
  const detail = error?.body?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }

  return error instanceof Error ? error.message : String(error);
}

function isFalImageFile(value) {
  return Boolean(value && typeof value === "object" && typeof value.url === "string");
}

function getFalImageFile(output) {
  if (isFalImageFile(output)) {
    return output;
  }

  if (output && typeof output === "object" && Array.isArray(output.images)) {
    const [image] = output.images;

    if (isFalImageFile(image)) {
      return image;
    }
  }

  throw new Error("fal returned an unsupported image payload.");
}

async function withTimeout(promise, timeoutMs, label) {
  let timeoutId;

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function generateFalProfileImage({ prompt }) {
  const fal = createFalClient({ credentials: process.env.FAL_KEY.trim() });
  const result = await fal.subscribe(falModel, {
    input: {
      aspect_ratio: "1:1",
      enhance_prompt: true,
      num_images: 1,
      output_format: "png",
      prompt,
      raw: false,
      safety_tolerance: "2",
      sync_mode: true,
    },
    logs: true,
    mode: "polling",
    pollInterval: 1000,
    timeout: DEFAULT_TIMEOUT_MS,
  });
  const image = getFalImageFile(result.data);
  const response = await withTimeout(
    fetch(image.url, { method: "GET" }),
    30_000,
    "fal image download",
  );

  if (!response.ok) {
    throw new Error(`fal returned an unreadable image URL (${response.status}).`);
  }

  return {
    blob: await response.blob(),
    sourceUrl: image.url,
  };
}

async function uploadProfileImage({ imageBlob, name, starId }) {
  const contentType = imageBlob.type || "image/png";
  const extension = contentType === "image/jpeg" ? ".jpg" : contentType === "image/webp" ? ".webp" : ".png";
  const pathname = [
    "fanletter",
    "ai-stars",
    starId,
    "profile",
    `${Date.now()}-${sanitizeBaseName(name)}${extension}`,
  ].join("/");

  return put(pathname, imageBlob, {
    access: "public",
    addRandomSuffix: true,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
    contentType,
  });
}

function buildMissingFilter() {
  const missingPortrait = [
    { portraitImageUrl: null },
    { portraitImageUrl: "" },
    { portraitImageUrl: { $exists: false } },
  ];
  const missingName = [
    { characterName: null },
    { characterName: "" },
    { characterName: { $exists: false } },
    { characterName: PLACEHOLDER_NAME_PATTERN },
  ];

  return {
    status: { $ne: "archived" },
    ...(starIdFilter ? { starId: normalizeStarId(starIdFilter) } : {}),
    $or: [...missingPortrait, ...missingName],
  };
}

const client = new MongoClient(mongoUri);
const now = new Date();

await client.connect();

try {
  const db = client.db(mongoDbName);
  const starsCollection = db.collection(starsCollectionName);
  const allStars = await starsCollection
    .find(
      { status: { $ne: "archived" } },
      {
        projection: {
          characterName: 1,
          displayName: 1,
          starId: 1,
        },
      },
    )
    .toArray();
  const usedNames = new Set(
    allStars
      .map((star) => normalizeText(star.characterName || star.displayName))
      .filter((name) => name && !isPlaceholderName(name)),
  );
  const plannedNames = new Set();
  const targets = await starsCollection
    .find(buildMissingFilter(), {
      projection: {
        characterName: 1,
        createdAt: 1,
        displayName: 1,
        founderCount: 1,
        growthPercent: 1,
        ownerEmail: 1,
        portraitImageUrl: 1,
        source: 1,
        starId: 1,
        starScore: 1,
        status: 1,
      },
    })
    .sort({
      founderCount: -1,
      starScore: -1,
      growthPercent: -1,
      createdAt: -1,
      starId: 1,
    })
    .limit(limit)
    .toArray();
  const results = [];
  let updatedStars = 0;
  let uploadedImages = 0;
  let assignedPoolImages = 0;
  let renamedStars = 0;
  let failedStars = 0;

  for (const star of targets) {
    const needsName = isPlaceholderName(star.characterName);
    const needsPortrait = isMissingPortrait(star);
    const generatedName = needsName
      ? pickGeneratedName({ plannedNames, star, usedNames })
      : getCurrentName(star);
    const ownerId = getOwnerId(star);
    const prompt = needsPortrait ? buildPrompt({ name: generatedName, star }) : null;
    const poolProfileUrl = needsPortrait ? pickProfileUrlFromPool(star) : null;
    const profileBackfillMethod = poolProfileUrl
      ? "codex_default_profile_pool_v1"
      : PROFILE_BACKFILL_METHOD;
    const result = {
      generatedName,
      mode: write ? "write" : "dry-run",
      needsName,
      needsPortrait,
      ownerId,
      previousName: normalizeText(star.characterName) || null,
      previousPortraitImageUrl: normalizeText(star.portraitImageUrl) || null,
      profileBackfillMethod,
      profileUrlPoolSize: profileUrlPool.length,
      starId: star.starId,
      status: star.status,
      uploadedUrl: null,
    };

    if (poolProfileUrl) {
      result.assignedPoolUrl = poolProfileUrl;
    }

    if (write) {
      try {
        const update = {
          $set: {
            profileBackfilledAt: now,
            profileBackfillMethod,
            updatedAt: now,
          },
        };

        if (needsName) {
          update.$set.characterName = generatedName;
          update.$set.nameBackfilledAt = now;
          update.$set.nameBackfillMethod = profileBackfillMethod;
        }

        if (needsPortrait) {
          if (poolProfileUrl) {
            update.$set.portraitImageUrl = poolProfileUrl;
            update.$set.profileBackfillPoolUrl = poolProfileUrl;
            result.uploadedUrl = poolProfileUrl;
            assignedPoolImages += 1;
          } else {
            const generatedImage = await generateFalProfileImage({ prompt });
            const uploaded = await uploadProfileImage({
              imageBlob: generatedImage.blob,
              name: generatedName,
              starId: star.starId,
            });

            update.$set.portraitImageUrl = uploaded.url;
            update.$set.profileBackfillSourceImageUrl = generatedImage.sourceUrl;
            update.$set.profileBackfillBlobPathname = uploaded.pathname;
            result.uploadedUrl = uploaded.url;
            uploadedImages += 1;
          }
        }

        const updateResult = await starsCollection.updateOne(
          {
            starId: star.starId,
            status: { $ne: "archived" },
          },
          update,
        );

        updatedStars += updateResult.modifiedCount;
        renamedStars += needsName && updateResult.modifiedCount ? 1 : 0;
      } catch (error) {
        result.error = getErrorMessage(error);
        failedStars += 1;

        if (!continueOnError) {
          results.push(result);
          break;
        }
      }
    }

    results.push(result);
  }

  console.log(
    JSON.stringify(
      {
        mode: write ? "write" : "dry-run",
        filter: starIdFilter ? { starId: normalizeStarId(starIdFilter) } : "missing portrait/name",
        limit,
        profileUrlPoolSize: profileUrlPool.length,
        assignedPoolImages,
        matchedTargets: targets.length,
        failedStars,
        renamedStars,
        uploadedImages,
        updatedStars,
        results,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
