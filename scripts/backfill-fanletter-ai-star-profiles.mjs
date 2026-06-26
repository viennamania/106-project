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
const DUPLICATE_PROFILE_BACKFILL_METHOD = "unique_duplicate_profile_identity_v1";
const PLACEHOLDER_NAME_PATTERN = /\bstarter\s+ai\s+star\b/i;

const args = process.argv.slice(2);
const write = args.includes("--write");
const continueOnError = args.includes("--continue-on-error");
const duplicateProfileImages = args.includes("--duplicate-profile-images");
const starIdFilter = readArgValue("--star-id");
const limit = readPositiveInteger(
  readArgValue("--limit"),
  write ? DEFAULT_WRITE_LIMIT : DEFAULT_DRY_RUN_LIMIT,
);
const duplicateMinCount = readPositiveInteger(readArgValue("--duplicate-min-count"), 3);
const falModel = readArgValue("--model") || process.env.FAL_AI_STAR_PROFILE_MODEL || DEFAULT_FAL_MODEL;
const profileUrlPool = readUrlPool(
  readArgValue("--profile-url-pool") || process.env.FANLETTER_AI_STAR_PROFILE_URL_POOL,
);
const useProfileUrlPool = !duplicateProfileImages && profileUrlPool.length > 0;
const profileImageProvider = normalizeProfileImageProvider(
  readArgValue("--provider") ||
    readArgValue("--image-provider") ||
    process.env.FANLETTER_AI_STAR_PROFILE_PROVIDER ||
    (duplicateProfileImages ? "svg" : "fal"),
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

if (write && !useProfileUrlPool && profileImageProvider === "fal" && !process.env.FAL_KEY?.trim()) {
  throw new Error("FAL_KEY is required when using --write.");
}

if (
  write &&
  !useProfileUrlPool &&
  profileImageProvider === "openai" &&
  !process.env.OPENAI_API_KEY?.trim()
) {
  throw new Error("OPENAI_API_KEY is required when using --write with OpenAI profile generation.");
}

if (write && !useProfileUrlPool && !process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
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

function normalizeProfileImageProvider(value) {
  const provider = normalizeText(value).toLowerCase();

  if (provider === "fal" || provider === "openai" || provider === "svg") {
    return provider;
  }

  throw new Error("--provider must be fal, openai, or svg.");
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
  if (!useProfileUrlPool) {
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
    provider: "fal",
    sourceUrl: image.url,
  };
}

function getOpenAiProfileModel() {
  return (
    process.env.OPENAI_AI_STAR_PROFILE_MODEL?.trim() ||
    process.env.OPENAI_CREATOR_AVATAR_MODEL?.trim() ||
    process.env.OPENAI_CONTENT_IMAGE_MODEL?.trim() ||
    "gpt-image-1.5"
  );
}

function getOpenAiProfileQuality() {
  return process.env.OPENAI_AI_STAR_PROFILE_QUALITY?.trim() || "medium";
}

function getOpenAiProfileSize() {
  return process.env.OPENAI_AI_STAR_PROFILE_SIZE?.trim() || "1024x1024";
}

async function generateOpenAiProfileImage({ prompt }) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required.");
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    body: JSON.stringify({
      background: "opaque",
      model: getOpenAiProfileModel(),
      output_format: "png",
      prompt,
      quality: getOpenAiProfileQuality(),
      size: getOpenAiProfileSize(),
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.error?.message
        ? `OpenAI profile image generation failed: ${payload.error.message}`
        : `OpenAI profile image generation failed with status ${response.status}.`,
    );
  }

  const imageBase64 = payload?.data?.[0]?.b64_json;

  if (!imageBase64) {
    throw new Error("OpenAI profile image generation returned no image data.");
  }

  return {
    blob: new Blob([Buffer.from(imageBase64, "base64")], { type: "image/png" }),
    provider: "openai",
    revisedPrompt: payload?.data?.[0]?.revised_prompt?.trim() || null,
    sourceUrl: null,
  };
}

function pickSeededValue(star, salt, values) {
  return values[stableHash(`${star.starId}:${salt}`) % values.length];
}

function escapeXml(value) {
  return normalizeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateSvgProfileImage({ name, star }) {
  const palettes = [
    {
      accent: "#7c3aed",
      backgroundEnd: "#fde68a",
      backgroundStart: "#f5d0fe",
      clothing: "#111827",
      hair: "#171717",
      skin: "#f3c7a7",
    },
    {
      accent: "#0f766e",
      backgroundEnd: "#bfdbfe",
      backgroundStart: "#ccfbf1",
      clothing: "#134e4a",
      hair: "#1f2937",
      skin: "#e9b98f",
    },
    {
      accent: "#db2777",
      backgroundEnd: "#ddd6fe",
      backgroundStart: "#fbcfe8",
      clothing: "#831843",
      hair: "#2f1b14",
      skin: "#f1c6a8",
    },
    {
      accent: "#2563eb",
      backgroundEnd: "#d9f99d",
      backgroundStart: "#bfdbfe",
      clothing: "#172554",
      hair: "#111827",
      skin: "#e7b894",
    },
    {
      accent: "#c2410c",
      backgroundEnd: "#bae6fd",
      backgroundStart: "#fed7aa",
      clothing: "#431407",
      hair: "#23150f",
      skin: "#efc3a5",
    },
  ];
  const hairPaths = [
    "M315 486c-38-145 38-265 194-265 159 0 239 119 201 265-30-63-92-92-197-92-108 0-169 29-198 92Z",
    "M304 502c-25-156 50-285 209-285 151 0 238 114 214 282-52-83-104-115-212-115-110 0-163 37-211 118Z",
    "M300 492c4-166 90-279 236-266 131 12 205 130 185 272-48-65-110-104-212-104-95 0-157 34-209 98Z",
    "M309 493c-12-151 68-267 207-267 142 0 225 107 205 263-42-73-111-106-205-106-93 0-163 35-207 110Z",
  ];
  const eyeStyles = [
    '<path d="M424 510c20-13 43-13 64 0" fill="none" stroke="#111827" stroke-linecap="round" stroke-width="12"/><path d="M557 510c20-13 43-13 64 0" fill="none" stroke="#111827" stroke-linecap="round" stroke-width="12"/>',
    '<circle cx="456" cy="510" r="10" fill="#111827"/><circle cx="589" cy="510" r="10" fill="#111827"/>',
    '<path d="M426 505c22 10 43 10 62 0" fill="none" stroke="#111827" stroke-linecap="round" stroke-width="10"/><path d="M558 505c22 10 43 10 62 0" fill="none" stroke="#111827" stroke-linecap="round" stroke-width="10"/>',
  ];
  const palette = pickSeededValue(star, "palette", palettes);
  const hairPath = pickSeededValue(star, "hair", hairPaths);
  const eyeStyle = pickSeededValue(star, "eyes", eyeStyles);
  const rotation = (stableHash(`${star.starId}:rotation`) % 9) - 4;
  const safeName = escapeXml(name);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-label="${safeName} AI Star profile">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${palette.backgroundStart}"/>
      <stop offset="1" stop-color="${palette.backgroundEnd}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="34%" r="52%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.72"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="frame">
      <path d="M512 72 858 272v400L512 872 166 672V272Z"/>
    </clipPath>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>
  <g opacity="0.26" fill="none" stroke="${palette.accent}" stroke-width="3">
    <circle cx="206" cy="210" r="86"/>
    <circle cx="821" cy="246" r="54"/>
    <circle cx="790" cy="810" r="106"/>
  </g>
  <g clip-path="url(#frame)">
    <rect x="130" y="70" width="764" height="820" fill="#fff" opacity="0.18"/>
    <g transform="rotate(${rotation} 512 512)">
      <path d="M270 886c33-143 126-235 242-235s209 92 242 235H270Z" fill="${palette.clothing}"/>
      <path d="M449 630h126l24 96c-28 33-145 33-174 0l24-96Z" fill="${palette.skin}"/>
      <path d="${hairPath}" fill="${palette.hair}"/>
      <ellipse cx="512" cy="500" rx="162" ry="194" fill="${palette.skin}"/>
      <path d="M352 504c-21-76-5-138 41-184 51-51 124-71 201-48 57 17 93 56 108 116-43-34-93-50-150-48-92 2-151 53-200 164Z" fill="${palette.hair}" opacity="0.94"/>
      <path d="M363 490c-53 5-60 92-8 117" fill="${palette.skin}"/>
      <path d="M661 490c53 5 60 92 8 117" fill="${palette.skin}"/>
      ${eyeStyle}
      <path d="M515 526c-11 35-17 58-4 77" fill="none" stroke="#9f6b54" stroke-linecap="round" stroke-width="9" opacity="0.52"/>
      <path d="M459 639c36 28 78 28 116 0" fill="none" stroke="#9f1239" stroke-linecap="round" stroke-width="11" opacity="0.72"/>
      <circle cx="386" cy="577" r="23" fill="#f9a8d4" opacity="0.22"/>
      <circle cx="638" cy="577" r="23" fill="#f9a8d4" opacity="0.22"/>
    </g>
  </g>
  <path d="M512 72 858 272v400L512 872 166 672V272Z" fill="none" stroke="${palette.accent}" stroke-width="18"/>
  <path d="M512 102 832 287v370L512 842 192 657V287Z" fill="none" stroke="#fff" stroke-opacity="0.64" stroke-width="6"/>
  <g fill="${palette.accent}" opacity="0.86">
    <circle cx="205" cy="734" r="10"/>
    <circle cx="806" cy="338" r="8"/>
    <path d="M736 176h22v22h-22z" transform="rotate(45 747 187)"/>
  </g>
</svg>`;

  return {
    blob: new Blob([svg], { type: "image/svg+xml" }),
    provider: "svg",
    sourceUrl: null,
  };
}

async function generateProfileImage({ prompt }) {
  if (profileImageProvider === "svg") {
    return generateSvgProfileImage({ name: prompt.name, star: prompt.star });
  }

  if (profileImageProvider === "openai") {
    return generateOpenAiProfileImage({ prompt: prompt.text });
  }

  return generateFalProfileImage({ prompt: prompt.text });
}

async function uploadProfileImage({ imageBlob, name, starId }) {
  const contentType = imageBlob.type || "image/png";
  const extension =
    contentType === "image/jpeg"
      ? ".jpg"
      : contentType === "image/webp"
        ? ".webp"
        : contentType === "image/svg+xml"
          ? ".svg"
          : ".png";
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

async function findDuplicatePortraitTargets(starsCollection) {
  const duplicateMatch = {
    portraitImageUrl: { $regex: /^https:\/\//i, $type: "string" },
    profileBackfillMethod: { $ne: DUPLICATE_PROFILE_BACKFILL_METHOD },
    source: "member_signup",
    status: { $ne: "archived" },
  };

  const pipeline = [
    { $match: duplicateMatch },
    {
      $group: {
        _id: "$portraitImageUrl",
        duplicatePortraitImageUseCount: { $sum: 1 },
        stars: {
          $push: {
            _id: "$_id",
            characterName: "$characterName",
            createdAt: "$createdAt",
            displayName: "$displayName",
            founderCount: "$founderCount",
            growthPercent: "$growthPercent",
            ownerEmail: "$ownerEmail",
            portraitImageUrl: "$portraitImageUrl",
            source: "$source",
            starId: "$starId",
            starScore: "$starScore",
            status: "$status",
          },
        },
      },
    },
    { $match: { duplicatePortraitImageUseCount: { $gte: duplicateMinCount } } },
    { $unwind: "$stars" },
    {
      $replaceRoot: {
        newRoot: {
          $mergeObjects: [
            "$stars",
            {
              duplicatePortraitImageUrl: "$_id",
              duplicatePortraitImageUseCount: "$duplicatePortraitImageUseCount",
            },
          ],
        },
      },
    },
    ...(starIdFilter ? [{ $match: { starId: normalizeStarId(starIdFilter) } }] : []),
    {
      $sort: {
        duplicatePortraitImageUseCount: -1,
        founderCount: -1,
        starScore: -1,
        growthPercent: -1,
        createdAt: -1,
        starId: 1,
      },
    },
    { $limit: limit },
  ];

  return starsCollection.aggregate(pipeline).toArray();
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
  const targets = duplicateProfileImages
    ? await findDuplicatePortraitTargets(starsCollection)
    : await starsCollection
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
    const needsPortrait = duplicateProfileImages || isMissingPortrait(star);
    const generatedName = needsName
      ? pickGeneratedName({ plannedNames, star, usedNames })
      : getCurrentName(star);
    const ownerId = getOwnerId(star);
    const prompt = needsPortrait
      ? {
          name: generatedName,
          star,
          text: buildPrompt({ name: generatedName, star }),
        }
      : null;
    const poolProfileUrl = needsPortrait ? pickProfileUrlFromPool(star) : null;
    const profileBackfillMethod = poolProfileUrl
      ? "codex_default_profile_pool_v1"
      : duplicateProfileImages
        ? DUPLICATE_PROFILE_BACKFILL_METHOD
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
      ...(star.duplicatePortraitImageUseCount
        ? {
            duplicatePortraitImageUseCount: star.duplicatePortraitImageUseCount,
            duplicatePortraitImageUrl: star.duplicatePortraitImageUrl,
          }
        : {}),
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
            const generatedImage = await generateProfileImage({ prompt });
            const uploaded = await uploadProfileImage({
              imageBlob: generatedImage.blob,
              name: generatedName,
              starId: star.starId,
            });

            update.$set.portraitImageUrl = uploaded.url;
            update.$set.profileBackfillBlobPathname = uploaded.pathname;
            update.$set.profileBackfillProvider = generatedImage.provider;
            if (generatedImage.sourceUrl) {
              update.$set.profileBackfillSourceImageUrl = generatedImage.sourceUrl;
            }
            if (generatedImage.revisedPrompt) {
              update.$set.profileBackfillRevisedPrompt = generatedImage.revisedPrompt;
            }
            if (duplicateProfileImages) {
              update.$set.previousDuplicatePortraitImageUrl =
                normalizeText(star.duplicatePortraitImageUrl) || normalizeText(star.portraitImageUrl);
              update.$set.previousDuplicatePortraitImageUseCount =
                star.duplicatePortraitImageUseCount;
            }
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
        filter: duplicateProfileImages
          ? {
              duplicateMinCount,
              source: "member_signup",
              starId: starIdFilter ? normalizeStarId(starIdFilter) : undefined,
              target: "duplicate portrait images",
            }
          : starIdFilter
            ? { starId: normalizeStarId(starIdFilter) }
            : "missing portrait/name",
        limit,
        profileImageProvider,
        profileUrlPoolSize: profileUrlPool.length,
        useProfileUrlPool,
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
