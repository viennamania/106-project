import "server-only";

import { put } from "@vercel/blob";
import type { Filter } from "mongodb";

import type {
  AIStar,
  CreatorUnlockData,
  FounderRole,
  HumanFounderSlot,
  LocalizedText,
  MemberPortfolio,
  ScoutShareLoopData,
  SpawnedAIStar,
} from "@/mock/fanletterV2";
import type { Locale } from "@/lib/i18n";
import type {
  FanletterStarDocument,
  FanletterStarFounderMembershipDocument,
  FanletterStarReferralCodeDocument,
} from "@/lib/fanletter-founder-club";
import { getLegacyFanletterStarId } from "@/lib/fanletter-founder-club";
import {
  getFanletterStarReferralCodesCollection,
  getFanletterStarInfluenceLedgerCollection,
  getFanletterStarFounderMembershipsCollection,
  getFanletterStarReferralEdgesCollection,
  getFanletterStarsCollection,
  getActivityProfilesCollection,
  getMembersCollection,
} from "@/lib/mongodb";
import {
  normalizeEmail,
  normalizeReferralCode,
  type MemberDocument,
} from "@/lib/member";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";
import {
  buildFanletterFounderUniverseCpPoolDistribution,
  fanletterFounderUniverseMaxDepth,
  fanletterFounderUniverseTiers,
  getFanletterFounderUniverseTier,
  getFanletterFounderUniverseTierByRole,
  resolveFanletterFounderUniverseUplinePath,
  type FanletterFounderUniverseCpPoolDistribution,
  type FanletterFounderUniverseRole,
} from "@/lib/fanletter-founder-universe";
import {
  getFanletterAgentRankFounderContribution,
  type AgentRankFounderContributionAggregate,
} from "@/lib/agentrank/score";

const HOME_STAR_LIMIT = 4;
const FOUNDER_SLOT_LIMIT = 6;
const DEFAULT_FOUNDER_SLOT_TOTAL = 150;
const FOUNDER_UNIVERSE_TOTAL_CAPACITY =
  fanletterFounderUniverseTiers.reduce(
    (total, tier) => total + tier.capacity,
    0,
  );
const MEMBER_PORTFOLIO_ROLE_LIMIT = 12;
const SPAWNED_STAR_LIMIT = 3;
const SCOUT_SIGNUP_CP_REWARD = 100;
const SCOUT_SIGNUP_CREATOR_PROGRESS_REWARD = 2;
const SCOUT_SIGNUP_INFLUENCE_REWARD = 5;
const SCOUT_SHARE_PLATFORMS = ["Kakao", "Instagram", "X", "TikTok"] as const;
const FOUNDER_CONTRIBUTION_UNLOCK_SCORE = 500;
const AGENTRANK_AUDIT_UNLOCK_PERCENT = 80;
const AGENTRANK_EVENT_QUALITY_UNLOCK_SCORE = 80;
const founderRoleRank: Record<Exclude<FounderRole, "member">, number> = {
  creator: 0,
  genesis_founder: 1,
  founder: 2,
  mentor: 3,
  producer: 4,
  partner: 5,
  legend: 6,
};

const starAccentPairs = [
  ["#8b5cf6", "#22d3ee"],
  ["#ec4899", "#f59e0b"],
  ["#06b6d4", "#84cc16"],
  ["#7c3aed", "#f97316"],
  ["#14b8a6", "#a78bfa"],
  ["#f43f5e", "#38bdf8"],
] as const;

const starterProfilePalettes = [
  {
    accent: "#0f172a",
    backgroundEnd: "#ccfbf1",
    backgroundStart: "#fef3c7",
    clothing: "#020617",
    hair: "#18181b",
    skin: "#efc3a5",
  },
  {
    accent: "#7c2d12",
    backgroundEnd: "#dbeafe",
    backgroundStart: "#fed7aa",
    clothing: "#431407",
    hair: "#1c1917",
    skin: "#f1c6a8",
  },
  {
    accent: "#075985",
    backgroundEnd: "#e9d5ff",
    backgroundStart: "#bae6fd",
    clothing: "#082f49",
    hair: "#111827",
    skin: "#e7b894",
  },
  {
    accent: "#be185d",
    backgroundEnd: "#bfdbfe",
    backgroundStart: "#fbcfe8",
    clothing: "#831843",
    hair: "#2f1b14",
    skin: "#f3c7a7",
  },
  {
    accent: "#0f766e",
    backgroundEnd: "#fde68a",
    backgroundStart: "#ccfbf1",
    clothing: "#134e4a",
    hair: "#1f2937",
    skin: "#e9b98f",
  },
] as const;

const starterProfileHairPaths = [
  "M315 486c-38-145 38-265 194-265 159 0 239 119 201 265-30-63-92-92-197-92-108 0-169 29-198 92Z",
  "M304 502c-25-156 50-285 209-285 151 0 238 114 214 282-52-83-104-115-212-115-110 0-163 37-211 118Z",
  "M300 492c4-166 90-279 236-266 131 12 205 130 185 272-48-65-110-104-212-104-95 0-157 34-209 98Z",
  "M309 493c-12-151 68-267 207-267 142 0 225 107 205 263-42-73-111-106-205-106-93 0-163 35-207 110Z",
] as const;

const starterProfileEyeStyles = [
  '<path d="M424 510c20-13 43-13 64 0" fill="none" stroke="#111827" stroke-linecap="round" stroke-width="12"/><path d="M557 510c20-13 43-13 64 0" fill="none" stroke="#111827" stroke-linecap="round" stroke-width="12"/>',
  '<circle cx="456" cy="510" r="10" fill="#111827"/><circle cx="589" cy="510" r="10" fill="#111827"/>',
  '<path d="M426 505c22 10 43 10 62 0" fill="none" stroke="#111827" stroke-linecap="round" stroke-width="10"/><path d="M558 505c22 10 43 10 62 0" fill="none" stroke="#111827" stroke-linecap="round" stroke-width="10"/>',
] as const;

export type FanletterStarReferralAttribution = {
  code: string;
  memberEmail: string;
  memberReferralCode: string | null;
  starId: string;
};

export type FanletterFounderJoinPlacement = {
  depth: number | null;
  parentMemberEmail: string | null;
  role: FanletterFounderUniverseRole | null;
  rootResolved: boolean;
  source: "computed" | "direct" | "preview";
  uplineMemberEmails: string[];
};

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function hashText(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function pickSeededValue<T>(seed: string, values: readonly T[]) {
  return values[hashText(seed) % values.length] ?? values[0];
}

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getAccentPair(starId: string) {
  return starAccentPairs[hashText(starId) % starAccentPairs.length];
}

function compactText(value: string | null | undefined, fallback: string) {
  const text = value?.replace(/\s+/g, " ").trim();
  return text || fallback;
}

const unsafeMemberDisplayNamePatterns = [
  /adult/i,
  /boob/i,
  /fuck/i,
  /hand\s*job/i,
  /hentai/i,
  /nude/i,
  /nsfw/i,
  /porn/i,
  /sex/i,
  /\b69\b/i,
  /69/i,
] as const;

function isUnsafeMemberDisplayName(value: string | null | undefined) {
  const text = value?.trim();

  return Boolean(
    text && unsafeMemberDisplayNamePatterns.some((pattern) => pattern.test(text)),
  );
}

function getInitials(value: string) {
  const normalized = value.replace(/[^a-zA-Z0-9가-힣\s]/g, " ").trim();
  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }

  return (words[0] ?? value).slice(0, 2).toUpperCase();
}

function getSpecialtyText(star: FanletterStarDocument): LocalizedText {
  const label = star.categoryLabel?.replace(/\s+/g, " ").trim();

  if (label) {
    return {
      en: label,
      ja: label,
      ko: label,
    };
  }

  return {
    en: "AI Character Star",
    ja: "AIキャラクタースター",
    ko: "AI 캐릭터 스타",
  };
}

function getUniverseName(star: FanletterStarDocument) {
  return `${star.characterName} Universe`;
}

function getMemberStarterAIStarName(member: MemberDocument) {
  const displayName = compactText(
    member.publicProfile?.displayName,
    member.email.split("@")[0] || "Founder",
  );

  return `${displayName} Starter AI Star`;
}

function buildMemberStarterProfileSvg({
  name,
  starId,
}: {
  name: string;
  starId: string;
}) {
  const palette = pickSeededValue(
    `${starId}:palette`,
    starterProfilePalettes,
  );
  const hairPath = pickSeededValue(`${starId}:hair`, starterProfileHairPaths);
  const eyeStyle = pickSeededValue(`${starId}:eyes`, starterProfileEyeStyles);
  const rotation = (hashText(`${starId}:rotation`) % 9) - 4;
  const safeName = escapeSvgText(name);

  return `<?xml version="1.0" encoding="UTF-8"?>
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
</svg>`;
}

async function createMemberStarterAIStarProfileImage({
  name,
  now,
  starId,
}: {
  name: string;
  now: Date;
  starId: string;
}) {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return null;
  }

  const svg = buildMemberStarterProfileSvg({ name, starId });
  const pathname = [
    "fanletter",
    "ai-stars",
    starId,
    "profile",
    `${now.getTime()}-starter-identity.svg`,
  ].join("/");

  try {
    const uploaded = await put(
      pathname,
      new Blob([svg], { type: "image/svg+xml" }),
      {
        access: "public",
        addRandomSuffix: true,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
        contentType: "image/svg+xml",
      },
    );

    return {
      pathname: uploaded.pathname,
      url: uploaded.url,
    };
  } catch (error) {
    console.warn("Failed to create member starter AI Star profile image.", {
      error,
      starId,
    });

    return null;
  }
}

function buildFallbackFounderPlacement({
  memberEmail,
  membership,
  source = "direct",
}: {
  memberEmail: string;
  membership: FanletterStarFounderMembershipDocument | null;
  source?: FanletterFounderJoinPlacement["source"];
}): FanletterFounderJoinPlacement {
  const fallbackTier = membership
    ? getFanletterFounderUniverseTierByRole(membership.role)
    : null;
  const parentMemberEmail = normalizeEmail(
    membership?.joinedViaMemberEmail ?? "",
  );

  return {
    depth: fallbackTier?.depth ?? null,
    parentMemberEmail: parentMemberEmail || null,
    role: membership?.role ?? fallbackTier?.role ?? null,
    rootResolved: false,
    source,
    uplineMemberEmails: [
      ...(parentMemberEmail ? [parentMemberEmail] : []),
      normalizeEmail(memberEmail),
    ].filter(Boolean),
  };
}

function getReferralCodeToken(value: string | null | undefined, fallback: string) {
  const token = value?.replace(/[^a-zA-Z0-9가-힣]/g, "").toUpperCase();

  return token?.slice(0, 8) || fallback;
}

function buildStarReferralCodeCandidate({
  attempt,
  memberEmail,
  memberReferralCode,
  star,
}: {
  attempt: number;
  memberEmail: string;
  memberReferralCode?: string | null;
  star: FanletterStarDocument;
}) {
  const starToken = getReferralCodeToken(
    star.characterName || star.displayName || star.starId,
    "STAR",
  );
  const memberToken = getReferralCodeToken(
    memberReferralCode ?? memberEmail.split("@")[0],
    "MEMBER",
  ).slice(0, 5);

  return `${starToken}-${memberToken}-${String(attempt).padStart(3, "0")}`;
}

function getConfiguredAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://www.net402.ai";
}

function buildScoutShareLink({
  code,
  locale,
  starId,
}: {
  code: string;
  locale: Locale;
  starId?: string | null;
}) {
  const normalizedStarId = normalizeFanletterStarId(starId);
  const url = new URL(
    normalizedStarId
      ? `/${locale}/fanletter/${encodeURIComponent(normalizedStarId)}`
      : `/${locale}/fanletter`,
    getConfiguredAppUrl(),
  );
  url.searchParams.set("ref", code);

  return url.toString();
}

function buildScoutShareTrackingHref({
  code,
  locale,
  platform,
  starId,
}: {
  code: string;
  locale: Locale;
  platform: string;
  starId?: string | null;
}) {
  const searchParams = new URLSearchParams({
    locale,
    platform,
    ref: code,
  });
  const normalizedStarId = normalizeFanletterStarId(starId);

  if (normalizedStarId) {
    searchParams.set("star", normalizedStarId);
  }

  return `/api/fanletter/founder-club/share?${searchParams.toString()}`;
}

function getDisplayGrowthPercent(star: FanletterStarDocument) {
  if (star.growthPercent > 0) {
    return star.growthPercent;
  }

  if (star.starScore <= 0) {
    return 0;
  }

  return Math.max(8, Math.min(49, Math.round(star.starScore / 2)));
}

function toFounderRole(
  role: FanletterStarFounderMembershipDocument["role"],
): Exclude<FounderRole, "member"> {
  return role;
}

function getFounderUniverseSlotCounts({
  fallbackFounderCount,
  fallbackOpenSlotCount,
  memberships,
}: {
  fallbackFounderCount: number;
  fallbackOpenSlotCount: number;
  memberships?: FanletterStarFounderMembershipDocument[];
}) {
  if (!memberships) {
    const fallbackFounderTotal = Math.max(0, fallbackFounderCount);
    const fallbackTotal = fallbackFounderCount + fallbackOpenSlotCount;
    const totalSlots =
      fallbackTotal > 0 ? fallbackTotal : DEFAULT_FOUNDER_SLOT_TOTAL;

    return {
      founderCount: fallbackFounderTotal,
      openSlotCount: Math.max(0, totalSlots - fallbackFounderTotal),
      totalSlots,
    };
  }

  const universeMemberCount = memberships.length;
  const hasCreator = memberships.some(
    (membership) => toFounderRole(membership.role) === "creator",
  );
  const creatorCount = hasCreator ? 1 : 0;

  return {
    founderCount: Math.max(0, universeMemberCount - creatorCount),
    openSlotCount: Math.max(
      0,
      FOUNDER_UNIVERSE_TOTAL_CAPACITY - universeMemberCount,
    ),
    totalSlots: FOUNDER_UNIVERSE_TOTAL_CAPACITY,
  };
}

function sortMembershipsForPortfolio(
  memberships: FanletterStarFounderMembershipDocument[],
) {
  return [...memberships].sort(
    (left, right) =>
      founderRoleRank[toFounderRole(left.role)] -
        founderRoleRank[toFounderRole(right.role)] ||
      right.influenceScore - left.influenceScore ||
      right.creatorProgressPercent - left.creatorProgressPercent ||
      right.joinedAt.getTime() - left.joinedAt.getTime(),
  );
}

function serializeFounderSlots({
  memberships,
  memberNamesByEmail,
}: {
  memberships: FanletterStarFounderMembershipDocument[];
  memberNamesByEmail: Map<string, string>;
}): HumanFounderSlot[] {
  return memberships.slice(0, FOUNDER_SLOT_LIMIT).map((membership) => {
    const fallbackName = membership.memberReferralCode
      ? `Member ${membership.memberReferralCode.slice(-4)}`
      : membership.memberEmail.split("@")[0] || "Member";
    const rawName = memberNamesByEmail.get(membership.memberEmail) ?? fallbackName;
    const name = isUnsafeMemberDisplayName(rawName) ? fallbackName : rawName;

    return {
      initials: getInitials(name),
      name,
      role: toFounderRole(membership.role),
    };
  });
}

const previewFounderSlotNames = [
  "Ari",
  "Bora",
  "Dain",
  "Haru",
  "Mina",
  "Rin",
] as const;

const previewFounderSlotRoles: Array<Exclude<FounderRole, "member">> = [
  "genesis_founder",
  "founder",
  "mentor",
  "producer",
  "partner",
  "founder",
];

function enrichFounderSlotsForPreview({
  founderSlots,
  star,
}: {
  founderSlots: HumanFounderSlot[];
  star: FanletterStarDocument;
}) {
  if (founderSlots.length >= FOUNDER_SLOT_LIMIT) {
    return founderSlots;
  }

  const usedNames = new Set(founderSlots.map((slot) => slot.name));
  const enrichedSlots = [...founderSlots];

  for (let index = 0; enrichedSlots.length < FOUNDER_SLOT_LIMIT; index += 1) {
    const seed = hashText(`${star.starId}:${index}`);
    const baseName = previewFounderSlotNames[seed % previewFounderSlotNames.length];
    const name = `${baseName} ${String(index + 1).padStart(2, "0")}`;

    if (usedNames.has(name)) {
      continue;
    }

    usedNames.add(name);
    enrichedSlots.push({
      initials: getInitials(name),
      name,
      role:
        previewFounderSlotRoles[
          enrichedSlots.length % previewFounderSlotRoles.length
        ] ?? "founder",
    });
  }

  return enrichedSlots;
}

function serializeStar({
  founderSlots,
  memberships,
  parentStar = null,
  spawnedStars = [],
  star,
}: {
  founderSlots: HumanFounderSlot[];
  memberships?: FanletterStarFounderMembershipDocument[];
  parentStar?: SpawnedAIStar | null;
  spawnedStars?: SpawnedAIStar[];
  star: FanletterStarDocument;
}): AIStar {
  const [accentColor, accentSecondary] = getAccentPair(star.starId);
  const { founderCount, openSlotCount, totalSlots } =
    getFounderUniverseSlotCounts({
      fallbackFounderCount: star.founderCount,
      fallbackOpenSlotCount: star.openSlotCount,
      memberships,
    });

  return {
    accentColor,
    accentSecondary,
    founderCount,
    founderSlots: enrichFounderSlotsForPreview({
      founderSlots,
      star,
    }),
    growthPercent: getDisplayGrowthPercent(star),
    id: star.starId,
    name: compactText(star.characterName, star.displayName),
    openSlots: {
      open: openSlotCount,
      total: totalSlots,
    },
    parentStar,
    portraitImageUrl: star.portraitImageUrl,
    portraitInitials: getInitials(star.characterName || star.displayName),
    specialty: getSpecialtyText(star),
    spawnedStars,
    starScore: star.starScore,
    universeName: getUniverseName(star),
  };
}

function serializeSpawnedStar({
  sourceStar,
  star,
}: {
  sourceStar?: FanletterStarDocument | null;
  star: FanletterStarDocument;
}): SpawnedAIStar {
  const [accentColor, accentSecondary] = getAccentPair(star.starId);
  const spawnedStar: SpawnedAIStar = {
    accentColor,
    accentSecondary,
    founderCount: star.founderCount,
    growthPercent: getDisplayGrowthPercent(star),
    id: star.starId,
    name: compactText(star.characterName, star.displayName),
    portraitInitials: getInitials(star.characterName || star.displayName),
    specialty: getSpecialtyText(star),
    starScore: star.starScore,
  };

  if (star.createdByUnlock) {
    spawnedStar.createdByUnlock = true;
  }

  if (star.launchCostUsdt && star.launchCostUsdt > 0) {
    spawnedStar.launchCostUsdt = star.launchCostUsdt;
  }

  if (star.spawnedFromStarId) {
    spawnedStar.spawnedFromStarId = star.spawnedFromStarId;
  }

  if (sourceStar) {
    spawnedStar.sourceUniverseName = getUniverseName(sourceStar);
  }

  return spawnedStar;
}

function serializeOwnedStar({
  sourceStarsById,
  star,
}: {
  sourceStarsById: Map<string, FanletterStarDocument>;
  star: FanletterStarDocument;
}): MemberPortfolio["ownedStars"][number] {
  const ownedStar: MemberPortfolio["ownedStars"][number] = {
    id: star.starId,
    name: compactText(star.characterName, star.displayName),
    portraitImageUrl: star.portraitImageUrl,
    portraitInitials: getInitials(star.characterName || star.displayName),
    status: star.status,
    universeName: getUniverseName(star),
  };
  const sourceStar = star.spawnedFromStarId
    ? sourceStarsById.get(star.spawnedFromStarId)
    : null;

  if (star.createdByUnlock) {
    ownedStar.createdByUnlock = true;
  }

  if (star.launchCostUsdt && star.launchCostUsdt > 0) {
    ownedStar.launchCostUsdt = star.launchCostUsdt;
  }

  if (star.spawnedFromStarId) {
    ownedStar.spawnedFromStarId = star.spawnedFromStarId;
  }

  if (sourceStar) {
    ownedStar.sourceUniverseName = getUniverseName(sourceStar);
  }

  return ownedStar;
}

function serializeStarReferralAttribution(
  referralCode: FanletterStarReferralCodeDocument,
): FanletterStarReferralAttribution {
  return {
    code: referralCode.code,
    memberEmail: referralCode.memberEmail,
    memberReferralCode: referralCode.memberReferralCode ?? null,
    starId: referralCode.starId,
  };
}

export async function resolveFanletterStarReferralCode(
  codeInput?: string | null,
): Promise<FanletterStarReferralAttribution | null> {
  const code = normalizeReferralCode(codeInput);

  if (!code) {
    return null;
  }

  const referralCodesCollection =
    await getFanletterStarReferralCodesCollection();
  const referralCode = await referralCodesCollection.findOne(
    {
      code,
      status: "active",
    },
    {
      sort: {
        lastUsedAt: -1,
        updatedAt: -1,
      },
    },
  );

  return referralCode ? serializeStarReferralAttribution(referralCode) : null;
}

export async function getOrCreateFanletterStarReferralCode({
  memberEmail: memberEmailInput,
  memberReferralCode: memberReferralCodeInput,
  starId,
}: {
  memberEmail: string;
  memberReferralCode?: string | null;
  starId: string;
}): Promise<FanletterStarReferralAttribution | null> {
  const memberEmail = normalizeEmail(memberEmailInput ?? "");
  const memberReferralCode = normalizeReferralCode(memberReferralCodeInput);

  if (!memberEmail || !starId) {
    return null;
  }

  const [referralCodesCollection, starsCollection, membershipsCollection] =
    await Promise.all([
      getFanletterStarReferralCodesCollection(),
      getFanletterStarsCollection(),
      getFanletterStarFounderMembershipsCollection(),
    ]);
  const existingReferralCode = await referralCodesCollection.findOne({
    memberEmail,
    starId,
  });

  if (existingReferralCode) {
    return serializeStarReferralAttribution(existingReferralCode);
  }

  const [star, membership] = await Promise.all([
    starsCollection.findOne({ starId }),
    membershipsCollection.findOne({ memberEmail, starId }),
  ]);

  if (!star || !membership) {
    return null;
  }

  const now = new Date();

  for (let attempt = 1; attempt <= 12; attempt += 1) {
    const code = buildStarReferralCodeCandidate({
      attempt,
      memberEmail,
      memberReferralCode,
      star,
    });
    const activeCodeWithSameValue = await referralCodesCollection.findOne({
      code,
      status: "active",
    });

    if (activeCodeWithSameValue) {
      continue;
    }

    try {
      await referralCodesCollection.updateOne(
        { memberEmail, starId },
        {
          $setOnInsert: {
            code,
            createdAt: now,
            disabledAt: null,
            lastUsedAt: null,
            memberEmail,
            memberReferralCode,
            source: "member_signup",
            starId,
            status: "active",
            updatedAt: now,
          },
        },
        { upsert: true },
      );

      const referralCode = await referralCodesCollection.findOne({
        memberEmail,
        starId,
      });

      return referralCode ? serializeStarReferralAttribution(referralCode) : null;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        continue;
      }

      throw error;
    }
  }

  return null;
}

export async function getFanletterFounderJoinPlacement({
  memberEmail: memberEmailInput,
  starId: starIdInput,
}: {
  memberEmail: string;
  starId: string;
}): Promise<FanletterFounderJoinPlacement> {
  const memberEmail = normalizeEmail(memberEmailInput);
  const starId = normalizeFanletterStarId(starIdInput);

  if (!memberEmail || !starId) {
    return {
      depth: null,
      parentMemberEmail: null,
      role: null,
      rootResolved: false,
      source: "direct",
      uplineMemberEmails: [],
    };
  }

  const [starsCollection, membershipsCollection, referralEdgesCollection] =
    await Promise.all([
      getFanletterStarsCollection(),
      getFanletterStarFounderMembershipsCollection(),
      getFanletterStarReferralEdgesCollection(),
    ]);
  const [star, membership] = await Promise.all([
    starsCollection.findOne({
      starId,
      status: { $ne: "archived" },
    }),
    membershipsCollection.findOne({
      memberEmail,
      starId,
    }),
  ]);

  if (!star || !membership) {
    return buildFallbackFounderPlacement({
      memberEmail,
      membership,
    });
  }

  let creatorEmail = normalizeEmail(star.ownerEmail ?? "");

  if (!creatorEmail) {
    const creatorMembership = await membershipsCollection.findOne(
      {
        role: "creator",
        starId,
      },
      {
        projection: {
          memberEmail: 1,
        },
      },
    );
    creatorEmail = normalizeEmail(creatorMembership?.memberEmail ?? "");
  }

  if (creatorEmail && memberEmail === creatorEmail) {
    return {
      depth: 0,
      parentMemberEmail: null,
      role: "creator",
      rootResolved: true,
      source: "computed",
      uplineMemberEmails: [creatorEmail],
    };
  }

  if (creatorEmail) {
    const upwardPath: string[] = [];
    const visited = new Set<string>();
    let currentEmail = memberEmail;

    for (
      let depth = 0;
      depth <= fanletterFounderUniverseMaxDepth;
      depth += 1
    ) {
      if (!currentEmail || visited.has(currentEmail)) {
        break;
      }

      visited.add(currentEmail);
      upwardPath.push(currentEmail);

      if (currentEmail === creatorEmail) {
        const rootToMemberPath = [...upwardPath].reverse();
        const targetDepth = rootToMemberPath.length - 1;
        const tier = getFanletterFounderUniverseTier(targetDepth);
        const parentMemberEmail =
          rootToMemberPath.length > 1
            ? rootToMemberPath[rootToMemberPath.length - 2] ?? null
            : null;

        return {
          depth: tier?.depth ?? null,
          parentMemberEmail,
          role: tier?.role ?? null,
          rootResolved: true,
          source: "computed",
          uplineMemberEmails: rootToMemberPath,
        };
      }

      const parentEdge = await referralEdgesCollection.findOne(
        {
          starId,
          targetMemberEmail: currentEmail,
        },
        {
          projection: {
            sourceMemberEmail: 1,
          },
          sort: {
            createdAt: 1,
          },
        },
      );
      currentEmail = normalizeEmail(parentEdge?.sourceMemberEmail ?? "");
    }
  }

  if (
    creatorEmail &&
    !normalizeEmail(membership.joinedViaMemberEmail ?? "") &&
    membership.role !== "creator"
  ) {
    const genesisTier = getFanletterFounderUniverseTier(1);

    return {
      depth: genesisTier?.depth ?? 1,
      parentMemberEmail: creatorEmail,
      role: genesisTier?.role ?? "genesis_founder",
      rootResolved: true,
      source: "direct",
      uplineMemberEmails: [creatorEmail, memberEmail],
    };
  }

  return buildFallbackFounderPlacement({
    memberEmail,
    membership,
  });
}

function getFanletterFounderUniverseRoleAfterDepth(depth: number) {
  const targetDepth = Math.max(
    1,
    Math.min(depth, fanletterFounderUniverseMaxDepth),
  );

  return getFanletterFounderUniverseTier(targetDepth)?.role ?? "legend";
}

function getFanletterFounderUniverseNextRole(
  role: FanletterFounderUniverseRole | null | undefined,
) {
  if (!role) {
    return getFanletterFounderUniverseRoleAfterDepth(2);
  }

  const parentTier = getFanletterFounderUniverseTierByRole(role);

  if (!parentTier) {
    return getFanletterFounderUniverseRoleAfterDepth(2);
  }

  return getFanletterFounderUniverseRoleAfterDepth(parentTier.depth + 1);
}

async function resolveFanletterFounderJoinMembershipRoles({
  attribution,
  starId,
}: {
  attribution?: FanletterStarReferralAttribution | null;
  starId: string;
}) {
  const genesisRole = getFanletterFounderUniverseRoleAfterDepth(1);

  if (!attribution) {
    return {
      sourceRole: null,
      targetRole: genesisRole,
    };
  }

  const sourcePlacement = await getFanletterFounderJoinPlacement({
    memberEmail: attribution.memberEmail,
    starId,
  });
  let sourceRole = sourcePlacement.role;

  if (!sourceRole) {
    const membershipsCollection =
      await getFanletterStarFounderMembershipsCollection();
    const sourceMembership = await membershipsCollection.findOne(
      {
        memberEmail: attribution.memberEmail,
        starId,
      },
      {
        projection: {
          role: 1,
        },
      },
    );
    sourceRole = sourceMembership?.role ?? null;
  }

  return {
    sourceRole,
    targetRole: getFanletterFounderUniverseNextRole(sourceRole),
  };
}

export async function applyFanletterStarReferralForCompletedMember(
  member: MemberDocument,
) {
  if (member.status !== "completed" || member.fanletterStarReferralAppliedAt) {
    return false;
  }

  let attribution: FanletterStarReferralAttribution | null = null;
  const directStarId = normalizeFanletterStarId(
    member.fanletterStarReferralStarId,
  );

  if (
    member.fanletterStarReferralCode &&
    member.fanletterStarReferralSourceMemberEmail &&
    member.fanletterStarReferralStarId
  ) {
    attribution = {
      code: member.fanletterStarReferralCode,
      memberEmail: member.fanletterStarReferralSourceMemberEmail,
      memberReferralCode:
        member.fanletterStarReferralSourceMemberReferralCode ?? null,
      starId: member.fanletterStarReferralStarId,
    };
  } else {
    attribution = await resolveFanletterStarReferralCode(
      member.fanletterStarReferralCode,
    );
  }

  const targetStarId = attribution?.starId ?? directStarId;

  if (!targetStarId || attribution?.memberEmail === member.email) {
    return false;
  }

  return ensureFanletterStarFounderMembershipForCompletedMember({
    attribution,
    member,
    starId: targetStarId,
    updateMemberAttribution: true,
  });
}

export async function ensureFanletterMemberStarterUniverseForCompletedMember(
  member: MemberDocument,
) {
  if (member.status !== "completed") {
    return false;
  }

  const memberEmail = normalizeEmail(member.email);
  const memberReferralCode = normalizeReferralCode(member.referralCode);

  if (!memberEmail || !memberReferralCode) {
    return false;
  }

  if (
    member.fanletterStarterUniverseEnsuredAt &&
    member.fanletterStarterStarId
  ) {
    return true;
  }

  const now = new Date();
  const joinedAt = member.registrationCompletedAt ?? member.createdAt ?? now;
  const defaultStarId = getLegacyFanletterStarId(memberReferralCode);
  const [
    membersCollection,
    membershipsCollection,
    referralCodesCollection,
    starsCollection,
  ] = await Promise.all([
    getMembersCollection(),
    getFanletterStarFounderMembershipsCollection(),
    getFanletterStarReferralCodesCollection(),
    getFanletterStarsCollection(),
  ]);
  const existingStar = await starsCollection.findOne({
    $or: [
      { starId: defaultStarId },
      { legacyCreatorReferralCode: memberReferralCode },
    ],
  });

  if (
    existingStar?.ownerEmail &&
    normalizeEmail(existingStar.ownerEmail) !== memberEmail
  ) {
    return false;
  }

  const starId = existingStar?.starId ?? defaultStarId;
  const starName = existingStar?.characterName || getMemberStarterAIStarName(member);
  const displayName =
    existingStar?.displayName ||
    compactText(member.publicProfile?.displayName, memberEmail.split("@")[0]);
  const starterProfileImage = existingStar?.portraitImageUrl
    ? null
    : await createMemberStarterAIStarProfileImage({
        name: starName,
        now,
        starId,
      });

  await starsCollection.updateOne(
    { starId },
    {
      $setOnInsert: {
        backfilledAt: now,
        categoryLabel: null,
        characterName: starName,
        createdAt: joinedAt,
        displayName,
        founderCount: 1,
        growthPercent: 0,
        legacyCreatorReferralCode: memberReferralCode,
        legacyPersonaId: null,
        openSlotCount: Math.max(0, DEFAULT_FOUNDER_SLOT_TOTAL - 1),
        ownerEmail: memberEmail,
        ownerReferralCode: memberReferralCode,
        portraitImageUrl: starterProfileImage?.url ?? null,
        profileBackfilledAt: starterProfileImage ? now : null,
        profileBackfillBlobPathname: starterProfileImage?.pathname ?? null,
        profileBackfillMethod: starterProfileImage
          ? "member_signup_starter_identity_svg_v1"
          : null,
        profileBackfillProvider: starterProfileImage ? "svg" : null,
        profileIdentitySeed: starterProfileImage ? starId : null,
        source: "member_signup",
        starId,
        starScore: 0,
        status: "draft",
        updatedAt: now,
      } satisfies FanletterStarDocument,
    },
    { upsert: true },
  );
  if (starterProfileImage) {
    await starsCollection.updateOne(
      {
        starId,
        $or: [
          { portraitImageUrl: null },
          { portraitImageUrl: "" },
          { portraitImageUrl: { $exists: false } },
        ],
      },
      {
        $set: {
          portraitImageUrl: starterProfileImage.url,
          profileBackfilledAt: now,
          profileBackfillBlobPathname: starterProfileImage.pathname,
          profileBackfillMethod: "member_signup_starter_identity_svg_v1",
          profileBackfillProvider: "svg",
          profileIdentitySeed: starId,
          updatedAt: now,
        },
      },
    );
  }
  await starsCollection.updateOne(
    {
      starId,
      $or: [{ ownerEmail: null }, { ownerEmail: { $exists: false } }],
    },
    {
      $set: {
        ownerEmail: memberEmail,
        ownerReferralCode: memberReferralCode,
        updatedAt: now,
      },
    },
  );
  await starsCollection.updateOne(
    {
      starId,
      $or: [
        { legacyCreatorReferralCode: null },
        { legacyCreatorReferralCode: { $exists: false } },
      ],
    },
    {
      $set: {
        legacyCreatorReferralCode: memberReferralCode,
        updatedAt: now,
      },
    },
  );

  await membershipsCollection.updateOne(
    {
      memberEmail,
      starId,
    },
    {
      $max: {
        creatorProgressPercent: 100,
      },
      $set: {
        memberReferralCode,
        role: "creator",
        updatedAt: now,
      },
      $setOnInsert: {
        backfilledAt: now,
        cpBalance: 0,
        createdAt: joinedAt,
        influenceScore: 0,
        joinedAt,
        joinedViaCode: null,
        joinedViaMemberEmail: null,
        joinedViaMemberReferralCode: null,
        joinedViaShareId: null,
        source: "member_signup",
      },
    },
    { upsert: true },
  );
  await starsCollection.updateOne(
    { starId },
    [
      {
        $set: {
          founderCount: { $max: ["$founderCount", 1] },
          openSlotCount: {
            $max: [
              0,
              {
                $cond: [
                  { $lte: ["$founderCount", 0] },
                  { $subtract: [DEFAULT_FOUNDER_SLOT_TOTAL, 1] },
                  "$openSlotCount",
                ],
              },
            ],
          },
          updatedAt: now,
        },
      },
    ],
  );
  await referralCodesCollection.updateOne(
    {
      memberEmail,
      starId,
    },
    {
      $setOnInsert: {
        code: memberReferralCode,
        createdAt: joinedAt,
        disabledAt: null,
        lastUsedAt: null,
        memberEmail,
        memberReferralCode,
        source: "member_signup",
        starId,
        status: "active",
        updatedAt: now,
      },
    },
    { upsert: true },
  );
  await membersCollection.updateOne(
    { email: memberEmail },
    {
      $set: {
        fanletterStarterStarId: starId,
        fanletterStarterUniverseEnsuredAt: now,
        updatedAt: now,
      },
    },
  );

  return true;
}

export async function ensureFanletterMemberStarterUniverseForEmail(
  email?: string | null,
) {
  const memberEmail = normalizeEmail(email ?? "");

  if (!memberEmail) {
    return false;
  }

  const membersCollection = await getMembersCollection();
  const member = await membersCollection.findOne({
    email: memberEmail,
    status: "completed",
  });

  return member
    ? ensureFanletterMemberStarterUniverseForCompletedMember(member)
    : false;
}

export async function ensureFanletterStarFounderMembershipForCompletedMember({
  attribution = null,
  member,
  starId,
  updateMemberAttribution = false,
}: {
  attribution?: FanletterStarReferralAttribution | null;
  member: MemberDocument;
  starId?: string | null;
  updateMemberAttribution?: boolean;
}) {
  if (member.status !== "completed") {
    return false;
  }

  const targetStarId = attribution?.starId ?? normalizeFanletterStarId(starId);

  if (!targetStarId || attribution?.memberEmail === member.email) {
    return false;
  }

  const now = new Date();
  const joinedAt = member.registrationCompletedAt ?? now;
  const targetMemberReferralCode = normalizeReferralCode(member.referralCode);
  const [
    membersCollection,
    membershipsCollection,
    referralEdgesCollection,
    influenceLedgerCollection,
    referralCodesCollection,
    starsCollection,
  ] = await Promise.all([
    getMembersCollection(),
    getFanletterStarFounderMembershipsCollection(),
    getFanletterStarReferralEdgesCollection(),
    getFanletterStarInfluenceLedgerCollection(),
    getFanletterStarReferralCodesCollection(),
    getFanletterStarsCollection(),
  ]);

  if (!attribution) {
    const star = await starsCollection.findOne({
      starId: targetStarId,
      status: { $ne: "archived" },
    });

    if (!star) {
      return false;
    }
  }

  const { sourceRole: attributionSourceRole, targetRole } =
    await resolveFanletterFounderJoinMembershipRoles({
      attribution,
      starId: targetStarId,
    });

  const targetMembershipResult = await membershipsCollection.updateOne(
    {
      memberEmail: member.email,
      starId: targetStarId,
    },
    {
      $set: {
        memberReferralCode: targetMemberReferralCode,
        updatedAt: now,
      },
      $setOnInsert: {
        cpBalance: 0,
        createdAt: joinedAt,
        creatorProgressPercent: 0,
        influenceScore: 0,
        joinedAt,
        joinedViaCode: attribution?.code ?? null,
        joinedViaMemberEmail: attribution?.memberEmail ?? null,
        joinedViaMemberReferralCode: attribution?.memberReferralCode ?? null,
        joinedViaShareId: null,
        role: targetRole,
        source: "member_signup",
      },
    },
    { upsert: true },
  );
  const createdTargetMembership = targetMembershipResult.upsertedCount > 0;

  if (attribution && createdTargetMembership) {
    await referralCodesCollection.updateOne(
      { code: attribution.code, starId: attribution.starId },
      {
        $set: {
          lastUsedAt: now,
          updatedAt: now,
        },
      },
    );
  }

  if (createdTargetMembership) {
    await starsCollection.updateOne(
      { starId: targetStarId },
      [
        {
          $set: {
            founderCount: { $add: ["$founderCount", 1] },
            openSlotCount: {
              $max: [0, { $subtract: ["$openSlotCount", 1] }],
            },
            updatedAt: now,
          },
        },
      ],
    );
  }

  if (!attribution) {
    if (!updateMemberAttribution) {
      return true;
    }

    await membersCollection.updateOne(
      { email: member.email },
      {
        $set: {
          fanletterStarReferralAppliedAt: now,
          fanletterStarReferralCode: null,
          fanletterStarReferralSourceMemberEmail: null,
          fanletterStarReferralSourceMemberReferralCode: null,
          fanletterStarReferralStarId: targetStarId,
          updatedAt: now,
        },
      },
    );

    return true;
  }

  if (createdTargetMembership) {
    const edgeId = `star-referral:${attribution.starId}:${member.email}`;
    const edgeResult = await referralEdgesCollection.updateOne(
      {
        edgeId,
      },
      {
        $setOnInsert: {
          createdAt: joinedAt,
          edgeId,
          referralCode: attribution.code,
          shareId: null,
          source: "member_signup",
          sourceMemberEmail: attribution.memberEmail,
          sourceMemberReferralCode: attribution.memberReferralCode,
          starId: attribution.starId,
          targetMemberEmail: member.email,
          targetMemberReferralCode,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
    const ledgerSourceId = `star-referral-reward:${attribution.starId}:${attribution.memberEmail}:${member.email}`;
    const ledgerResult = await influenceLedgerCollection.updateOne(
      {
        sourceId: ledgerSourceId,
      },
      {
        $setOnInsert: {
          cpDelta: SCOUT_SIGNUP_CP_REWARD,
          createdAt: now,
          creatorProgressDelta: SCOUT_SIGNUP_CREATOR_PROGRESS_REWARD,
          influenceDelta: SCOUT_SIGNUP_INFLUENCE_REWARD,
          memo: "AI Star referral signup reward",
          recipientMemberEmail: attribution.memberEmail,
          source: "member_signup",
          sourceId: ledgerSourceId,
          sourceMemberEmail: attribution.memberEmail,
          starId: attribution.starId,
          targetMemberEmail: member.email,
        },
      },
      { upsert: true },
    );

    if (edgeResult.upsertedCount > 0 && ledgerResult.upsertedCount > 0) {
      await membershipsCollection.updateOne(
        {
          memberEmail: attribution.memberEmail,
          starId: attribution.starId,
        },
        {
          $inc: {
            cpBalance: SCOUT_SIGNUP_CP_REWARD,
            creatorProgressPercent: SCOUT_SIGNUP_CREATOR_PROGRESS_REWARD,
            influenceScore: SCOUT_SIGNUP_INFLUENCE_REWARD,
          },
          $set: {
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
            joinedAt: now,
            joinedViaCode: null,
            joinedViaMemberEmail: null,
            joinedViaMemberReferralCode: null,
            joinedViaShareId: null,
            memberReferralCode: attribution.memberReferralCode,
            role: attributionSourceRole ?? "founder",
            source: "member_signup",
          },
        },
        { upsert: true },
      );
      await membershipsCollection.updateOne(
        {
          memberEmail: attribution.memberEmail,
          starId: attribution.starId,
        },
        {
          $min: {
            creatorProgressPercent: 100,
          },
        },
      );
    }
  }

  await membersCollection.updateOne(
    { email: member.email },
    updateMemberAttribution
      ? {
          $set: {
            fanletterStarReferralAppliedAt: now,
            fanletterStarReferralCode: attribution.code,
            fanletterStarReferralSourceMemberEmail: attribution.memberEmail,
            fanletterStarReferralSourceMemberReferralCode:
              attribution.memberReferralCode,
            fanletterStarReferralStarId: attribution.starId,
            updatedAt: now,
          },
        }
      : {
          $set: {
            updatedAt: now,
          },
        },
  );

  return true;
}

export async function getFanletterFounderClubHomeStars(options?: {
  limit?: number;
  selectedStarId?: string | null;
}) {
  const limit = Math.max(1, Math.min(options?.limit ?? HOME_STAR_LIMIT, 12));
  const selectedStarId = normalizeFanletterStarId(options?.selectedStarId);
  const starsCollection = await getFanletterStarsCollection();
  const starFilter: Filter<FanletterStarDocument> = {
    status: "active",
  };
  const topStars = await starsCollection
    .find(starFilter)
    .sort({
      growthPercent: -1,
      starScore: -1,
      founderCount: -1,
      updatedAt: -1,
    })
    .limit(limit)
    .toArray();
  const selectedStar =
    selectedStarId && !topStars.some((star) => star.starId === selectedStarId)
      ? await starsCollection.findOne({
          starId: selectedStarId,
          status: { $ne: "archived" },
        })
      : null;
  const stars = selectedStar
    ? [selectedStar, ...topStars].slice(0, limit)
    : topStars;

  if (stars.length === 0) {
    return [];
  }

  const starIds = stars.map((star) => star.starId);
  const membershipsCollection =
    await getFanletterStarFounderMembershipsCollection();
  const memberships = await membershipsCollection
    .find({
      starId: { $in: starIds },
    })
    .sort({
      role: 1,
      influenceScore: -1,
      joinedAt: 1,
    })
    .toArray();
  const memberEmails = [
    ...new Set(memberships.map((membership) => membership.memberEmail)),
  ];
  const membersCollection = await getMembersCollection();
  const members =
    memberEmails.length > 0
      ? await membersCollection
          .find(
            { email: { $in: memberEmails } },
            { projection: { email: 1, publicProfile: 1 } },
          )
          .toArray()
      : [];
  const memberNamesByEmail = new Map(
    members.map((member) => [
      member.email,
      compactText(member.publicProfile?.displayName, member.email.split("@")[0]),
    ]),
  );
  const membershipsByStarId = new Map<
    string,
    FanletterStarFounderMembershipDocument[]
  >();
  const membershipsByMemberEmail = new Map<
    string,
    FanletterStarFounderMembershipDocument[]
  >();

  for (const membership of memberships) {
    const list = membershipsByStarId.get(membership.starId) ?? [];
    list.push(membership);
    membershipsByStarId.set(membership.starId, list);

    const memberList = membershipsByMemberEmail.get(membership.memberEmail) ?? [];
    memberList.push(membership);
    membershipsByMemberEmail.set(membership.memberEmail, memberList);
  }
  const founderMemberEmails = [...membershipsByMemberEmail.keys()];
  const spawnedStarFilters: Filter<FanletterStarDocument>[] = [
    {
      spawnedFromStarId: { $in: starIds },
    },
  ];

  if (founderMemberEmails.length > 0) {
    spawnedStarFilters.push({
      ownerEmail: { $in: founderMemberEmails },
      $or: [
        { spawnedFromStarId: null },
        { spawnedFromStarId: { $exists: false } },
      ],
    });
  }

  const spawnedStarCandidates = await starsCollection
    .find({
      $or: spawnedStarFilters,
      starId: { $nin: starIds },
      status: { $ne: "archived" },
    })
    .sort({
      createdByUnlock: -1,
      growthPercent: -1,
      starScore: -1,
      founderCount: -1,
      updatedAt: -1,
    })
    .limit(limit * SPAWNED_STAR_LIMIT * 2)
    .toArray();
  const spawnedStarsByParentStarId = new Map<string, SpawnedAIStar[]>();
  const starsById = new Map(stars.map((star) => [star.starId, star]));

  function pushSpawnedStar(parentStarId: string, spawnedStar: FanletterStarDocument) {
    const list = spawnedStarsByParentStarId.get(parentStarId) ?? [];

    if (
      list.length >= SPAWNED_STAR_LIMIT ||
      list.some((item) => item.id === spawnedStar.starId)
    ) {
      return;
    }

    list.push(
      serializeSpawnedStar({
        sourceStar: starsById.get(parentStarId),
        star: spawnedStar,
      }),
    );
    spawnedStarsByParentStarId.set(parentStarId, list);
  }

  for (const spawnedStar of spawnedStarCandidates) {
    const explicitParentStarId = normalizeFanletterStarId(
      spawnedStar.spawnedFromStarId,
    );

    if (explicitParentStarId && starsById.has(explicitParentStarId)) {
      pushSpawnedStar(explicitParentStarId, spawnedStar);
      continue;
    }

    if (spawnedStar.spawnedFromStarId || !spawnedStar.ownerEmail) {
      continue;
    }

    const parentMemberships =
      membershipsByMemberEmail.get(spawnedStar.ownerEmail) ?? [];

    for (const parentMembership of parentMemberships) {
      if (parentMembership.starId === spawnedStar.starId) {
        continue;
      }

      pushSpawnedStar(parentMembership.starId, spawnedStar);
    }
  }

  return stars.map((star) => {
    const memberships = membershipsByStarId.get(star.starId) ?? [];

    return serializeStar({
      founderSlots: serializeFounderSlots({
        memberNamesByEmail,
        memberships,
      }),
      memberships,
      spawnedStars: spawnedStarsByParentStarId.get(star.starId) ?? [],
      star,
    });
  });
}

export async function getFanletterFounderClubStarDetail(
  starIdInput?: string | null,
) {
  const starId = normalizeFanletterStarId(starIdInput);

  if (!starId) {
    return null;
  }

  const [starsCollection, membershipsCollection] = await Promise.all([
    getFanletterStarsCollection(),
    getFanletterStarFounderMembershipsCollection(),
  ]);
  const star = await starsCollection.findOne({
    starId,
    status: { $ne: "archived" },
  });

  if (!star) {
    return null;
  }

  const memberships = await membershipsCollection
    .find({ starId })
    .sort({
      role: 1,
      influenceScore: -1,
      joinedAt: 1,
    })
    .toArray();
  const memberEmails = [
    ...new Set(memberships.map((membership) => membership.memberEmail)),
  ];
  const membersCollection = await getMembersCollection();
  const members =
    memberEmails.length > 0
      ? await membersCollection
          .find(
            { email: { $in: memberEmails } },
            { projection: { email: 1, publicProfile: 1 } },
          )
          .toArray()
      : [];
  const memberNamesByEmail = new Map(
    members.map((member) => [
      member.email,
      compactText(member.publicProfile?.displayName, member.email.split("@")[0]),
    ]),
  );
  const spawnedStarFilters: Filter<FanletterStarDocument>[] = [
    {
      spawnedFromStarId: starId,
    },
  ];

  if (memberEmails.length > 0) {
    spawnedStarFilters.push({
      ownerEmail: { $in: memberEmails },
      $or: [
        { spawnedFromStarId: null },
        { spawnedFromStarId: { $exists: false } },
      ],
    });
  }

  const parentStarId = normalizeFanletterStarId(star.spawnedFromStarId);
  const [spawnedStars, parentStar] = await Promise.all([
    starsCollection
      .find({
        $or: spawnedStarFilters,
        starId: { $ne: starId },
        status: { $ne: "archived" },
      })
      .sort({
        createdByUnlock: -1,
        growthPercent: -1,
        starScore: -1,
        founderCount: -1,
        updatedAt: -1,
      })
      .limit(SPAWNED_STAR_LIMIT)
      .toArray(),
    parentStarId
      ? starsCollection.findOne({
          starId: parentStarId,
          status: { $ne: "archived" },
        })
      : Promise.resolve(null),
  ]);

  return serializeStar({
    founderSlots: serializeFounderSlots({
      memberNamesByEmail,
      memberships,
    }),
    memberships,
    parentStar: parentStar
      ? serializeSpawnedStar({
          star: parentStar,
        })
      : null,
    spawnedStars: spawnedStars.map((spawnedStar) =>
      serializeSpawnedStar({
        sourceStar: star,
        star: spawnedStar,
      }),
    ),
    star,
  });
}

export async function getFanletterFounderClubScoutShareLoop({
  email,
  locale,
}: {
  email?: string | null;
  locale: Locale;
}): Promise<ScoutShareLoopData | null> {
  const memberEmail = normalizeEmail(email ?? "");

  if (!memberEmail) {
    return null;
  }

  const [membersCollection, membershipsCollection, starsCollection] =
    await Promise.all([
      getMembersCollection(),
      getFanletterStarFounderMembershipsCollection(),
      getFanletterStarsCollection(),
    ]);
  const [member, memberships] = await Promise.all([
    membersCollection.findOne(
      { email: memberEmail },
      { projection: { email: 1, publicProfile: 1, referralCode: 1 } },
    ),
    membershipsCollection.find({ memberEmail }).toArray(),
  ]);

  if (!member || memberships.length === 0) {
    return null;
  }

  const sortedMemberships = sortMembershipsForPortfolio(memberships);
  const starIds = [...new Set(sortedMemberships.map((item) => item.starId))];
  const stars = await starsCollection
    .find({
      starId: { $in: starIds },
      status: { $ne: "archived" },
    })
    .toArray();
  const starsById = new Map(stars.map((star) => [star.starId, star]));
  const selectedMembership = sortedMemberships.find((membership) =>
    starsById.has(membership.starId),
  );

  if (!selectedMembership) {
    return null;
  }

  const selectedStar = starsById.get(selectedMembership.starId);

  if (!selectedStar) {
    return null;
  }

  const attribution = await getOrCreateFanletterStarReferralCode({
    memberEmail,
    memberReferralCode: member.referralCode,
    starId: selectedStar.starId,
  });

  if (!attribution) {
    return null;
  }

  const sourceMember = compactText(
    member.publicProfile?.displayName,
    member.email.split("@")[0] || "Member",
  );
  const starName = compactText(selectedStar.characterName, selectedStar.displayName);
  const selectedUniverse = getUniverseName(selectedStar);

  return {
    isLiveData: true,
    referralCode: attribution.code,
    rewards: {
      cp: SCOUT_SIGNUP_CP_REWARD,
      creatorProgressPercent: SCOUT_SIGNUP_CREATOR_PROGRESS_REWARD,
      influenceScore: SCOUT_SIGNUP_INFLUENCE_REWARD,
    },
    selectedUniverse,
    shareLink: buildScoutShareLink({
      code: attribution.code,
      locale,
      starId: selectedStar.starId,
    }),
    sharePlatformLinks: SCOUT_SHARE_PLATFORMS.map((platform) => ({
      href: buildScoutShareTrackingHref({
        code: attribution.code,
        locale,
        platform,
        starId: selectedStar.starId,
      }),
      label: platform,
      platform,
    })),
    sharePlatforms: SCOUT_SHARE_PLATFORMS,
    sourceMember,
    starId: selectedStar.starId,
    starName,
    targetMember: "New member",
  };
}

export async function getFanletterFounderClubStarScoutShareLoop({
  email,
  locale,
  starId: starIdInput,
}: {
  email?: string | null;
  locale: Locale;
  starId: string;
}): Promise<ScoutShareLoopData | null> {
  const memberEmail = normalizeEmail(email ?? "");
  const starId = normalizeFanletterStarId(starIdInput);

  if (!memberEmail || !starId) {
    return null;
  }

  const [membersCollection, membershipsCollection, starsCollection] =
    await Promise.all([
      getMembersCollection(),
      getFanletterStarFounderMembershipsCollection(),
      getFanletterStarsCollection(),
    ]);
  const [member, membership, star] = await Promise.all([
    membersCollection.findOne(
      { email: memberEmail },
      { projection: { email: 1, publicProfile: 1, referralCode: 1 } },
    ),
    membershipsCollection.findOne({ memberEmail, starId }),
    starsCollection.findOne({
      starId,
      status: { $ne: "archived" },
    }),
  ]);

  if (!member || !membership || !star) {
    return null;
  }

  const attribution = await getOrCreateFanletterStarReferralCode({
    memberEmail,
    memberReferralCode: member.referralCode,
    starId,
  });

  if (!attribution) {
    return null;
  }

  const sourceMember = compactText(
    member.publicProfile?.displayName,
    member.email.split("@")[0] || "Member",
  );
  const starName = compactText(star.characterName, star.displayName);
  const selectedUniverse = getUniverseName(star);

  return {
    isLiveData: true,
    referralCode: attribution.code,
    rewards: {
      cp: SCOUT_SIGNUP_CP_REWARD,
      creatorProgressPercent: SCOUT_SIGNUP_CREATOR_PROGRESS_REWARD,
      influenceScore: SCOUT_SIGNUP_INFLUENCE_REWARD,
    },
    selectedUniverse,
    shareLink: buildScoutShareLink({
      code: attribution.code,
      locale,
      starId,
    }),
    sharePlatformLinks: SCOUT_SHARE_PLATFORMS.map((platform) => ({
      href: buildScoutShareTrackingHref({
        code: attribution.code,
        locale,
        platform,
        starId,
      }),
      label: platform,
      platform,
    })),
    sharePlatforms: SCOUT_SHARE_PLATFORMS,
    sourceMember,
    starId,
    starName,
    targetMember: "New member",
  };
}

export async function getFanletterFounderClubMemberPortfolio(
  email?: string | null,
): Promise<MemberPortfolio | null> {
  const memberEmail = normalizeEmail(email ?? "");

  if (!memberEmail) {
    return null;
  }

  await ensureFanletterMemberStarterUniverseForEmail(memberEmail);

  const [
    membersCollection,
    membershipsCollection,
    referralEdgesCollection,
    influenceLedgerCollection,
  ] = await Promise.all([
    getMembersCollection(),
    getFanletterStarFounderMembershipsCollection(),
    getFanletterStarReferralEdgesCollection(),
    getFanletterStarInfluenceLedgerCollection(),
  ]);
  const [
    member,
    memberships,
    directInvites,
    successfulInvites,
    ledgerTotals,
  ] = await Promise.all([
    membersCollection.findOne(
      { email: memberEmail },
      { projection: { email: 1, publicProfile: 1 } },
    ),
    membershipsCollection
      .find({ memberEmail })
      .sort({
        role: 1,
        influenceScore: -1,
        updatedAt: -1,
      })
      .toArray(),
    referralEdgesCollection.countDocuments({
      sourceMemberEmail: memberEmail,
    }),
    referralEdgesCollection.countDocuments({
      sourceMemberEmail: memberEmail,
      targetMemberEmail: { $ne: memberEmail },
    }),
    influenceLedgerCollection
      .aggregate<{
        cpDelta: number;
        creatorProgressDelta: number;
        influenceDelta: number;
      }>([
        { $match: { recipientMemberEmail: memberEmail } },
        {
          $group: {
            _id: null,
            cpDelta: { $sum: "$cpDelta" },
            creatorProgressDelta: { $sum: "$creatorProgressDelta" },
            influenceDelta: { $sum: "$influenceDelta" },
          },
        },
      ])
      .toArray(),
  ]);
  const memberName = compactText(
    member?.publicProfile?.displayName,
    memberEmail.split("@")[0] || "Member",
  );
  const sortedMemberships = sortMembershipsForPortfolio(memberships);
  const starIds = [...new Set(sortedMemberships.map((item) => item.starId))];
  const starsCollection = await getFanletterStarsCollection();
  const [stars, ownedStarRows] = await Promise.all([
    starIds.length > 0
      ? starsCollection.find({ starId: { $in: starIds } }).toArray()
      : Promise.resolve([]),
    starsCollection
      .find({
        ownerEmail: memberEmail,
        status: { $ne: "archived" },
      })
      .sort({
        createdByUnlock: -1,
        updatedAt: -1,
      })
      .limit(8)
      .toArray(),
  ]);
  const starsById = new Map(stars.map((star) => [star.starId, star]));
  const sourceStarIds = [
    ...new Set(
      ownedStarRows
        .map((star) => star.spawnedFromStarId)
        .filter((starId): starId is string => Boolean(starId)),
    ),
  ];
  const sourceStars =
    sourceStarIds.length > 0
      ? await starsCollection
          .find({ starId: { $in: sourceStarIds } })
          .toArray()
      : [];
  const sourceStarsById = new Map(
    [...stars, ...ownedStarRows, ...sourceStars].map((star) => [
      star.starId,
      star,
    ]),
  );
  const ownedStars = ownedStarRows.map((star) =>
    serializeOwnedStar({
      sourceStarsById,
      star,
    }),
  );
  const ledger = ledgerTotals[0] ?? {
    cpDelta: 0,
    creatorProgressDelta: 0,
    influenceDelta: 0,
  };
  const membershipCpBalance = memberships.reduce(
    (sum, membership) => sum + membership.cpBalance,
    0,
  );
  const hasCreatorRole = memberships.some(
    (membership) => membership.role === "creator",
  );
  const membershipInfluenceScore = memberships.reduce(
    (max, membership) => Math.max(max, membership.influenceScore),
    0,
  );
  const membershipCreatorProgress = memberships.reduce(
    (max, membership) => Math.max(max, membership.creatorProgressPercent),
    0,
  );
  const cpBalance = Math.max(
    0,
    Math.round(membershipCpBalance + ledger.cpDelta),
  );
  const scoutScore = Math.min(
    100,
    Math.max(
      membershipInfluenceScore,
      Math.round(successfulInvites * 5 + ledger.influenceDelta),
      hasCreatorRole ? 80 : 0,
    ),
  );
  const creatorEligibilityPercent = Math.min(
    100,
    Math.max(
      membershipCreatorProgress,
      hasCreatorRole ? 100 : 0,
      Math.round(
        scoutScore * 0.65 + Math.min(cpBalance / 5000, 1) * 25 +
          Math.min(directInvites / 20, 1) * 10 +
          ledger.creatorProgressDelta,
      ),
    ),
  );
  const primaryMembership =
    sortedMemberships.find((membership) => membership.role === "creator") ??
    sortedMemberships[0] ??
    null;
  const primaryStar = primaryMembership
    ? starsById.get(primaryMembership.starId) ?? null
    : null;
  const roles = sortedMemberships
    .slice(0, MEMBER_PORTFOLIO_ROLE_LIMIT)
    .map((membership) => {
      const star = starsById.get(membership.starId);
      const starStatus = star?.status ?? null;

      return {
        portraitImageUrl: star?.portraitImageUrl ?? null,
        portraitInitials: star
          ? getInitials(star.characterName || star.displayName)
          : getInitials(membership.starId),
        role: toFounderRole(membership.role),
        starId: membership.starId,
        starName: star
          ? compactText(star.characterName, star.displayName)
          : membership.starId,
        starStatus,
        universeName: star
          ? getUniverseName(star)
          : `${membership.starId} Universe`,
      };
    });

  return {
    cpBalance,
    creatorEligibilityPercent,
    directInvites,
    isLiveData: true,
    memberInitials: getInitials(memberName),
    memberName,
    ownedStars,
    primaryStarId: primaryStar?.starId ?? primaryMembership?.starId ?? null,
    primaryStarName: primaryStar
      ? compactText(primaryStar.characterName, primaryStar.displayName)
      : null,
    primaryStarStatus: primaryStar?.status ?? null,
    roles,
    scoutScore,
    successfulInvites,
  };
}

export async function getFanletterFounderClubCreatorUnlock(
  email?: string | null,
  options?: {
    founderContribution?: AgentRankFounderContributionAggregate | null;
  },
): Promise<CreatorUnlockData | null> {
  const memberEmail = normalizeEmail(email ?? "");

  if (!memberEmail) {
    return null;
  }

  const [portfolio, activityProfile, founderContribution] = await Promise.all([
    getFanletterFounderClubMemberPortfolio(memberEmail),
    getActivityProfilesCollection().then((collection) =>
      collection.findOne(
        { memberEmail },
        {
          projection: {
            lastCheckInDateKey: 1,
            lifetimeActivityPoints: 1,
            spendableActivityPoints: 1,
            streakDays: 1,
          },
        },
      ),
    ),
    options && "founderContribution" in options
      ? Promise.resolve(options.founderContribution ?? null)
      : getFanletterAgentRankFounderContribution({
          limit: 250,
          memberEmail,
        }),
  ]);
  const scoutScore = portfolio?.scoutScore ?? 0;
  const directInvites = portfolio?.directInvites ?? 0;
  const cpBalance = portfolio?.cpBalance ?? 0;
  const founderContributionScore = founderContribution?.totalScore ?? 0;
  const agentRankAuditReadyPercent = founderContribution?.universes.length
    ? Math.round(
        founderContribution.universes.reduce(
          (sum, universe) => sum + universe.readiness.auditReadyPercent,
          0,
        ) / founderContribution.universes.length,
      )
    : 0;
  const agentRankEventQualityScore = founderContribution?.universes.length
    ? Math.round(
        founderContribution.universes.reduce(
          (sum, universe) => sum + universe.readiness.eventQualityPercent,
          0,
        ) / founderContribution.universes.length,
      )
    : 0;
  const activityMissionCompleted = Boolean(
    activityProfile?.lastCheckInDateKey ||
      (activityProfile?.lifetimeActivityPoints ?? 0) > 0 ||
      (activityProfile?.spendableActivityPoints ?? 0) > 0 ||
      (activityProfile?.streakDays ?? 0) > 0,
  );
  const conditions = [
    {
      current: scoutScore,
      id: "scoutScore",
      met: scoutScore >= 80,
      target: 80,
    },
    {
      current: directInvites,
      id: "directInvites",
      met: directInvites >= 20,
      target: 20,
    },
    {
      current: cpBalance,
      id: "cp",
      met: cpBalance >= 5000,
      target: 5000,
    },
    {
      current: founderContributionScore,
      id: "founderContributionScore",
      met: founderContributionScore >= FOUNDER_CONTRIBUTION_UNLOCK_SCORE,
      target: FOUNDER_CONTRIBUTION_UNLOCK_SCORE,
    },
    {
      current: agentRankAuditReadyPercent,
      id: "agentRankAuditReady",
      met: agentRankAuditReadyPercent >= AGENTRANK_AUDIT_UNLOCK_PERCENT,
      target: AGENTRANK_AUDIT_UNLOCK_PERCENT,
    },
    {
      current: agentRankEventQualityScore,
      id: "agentRankEventQuality",
      met:
        agentRankEventQualityScore >= AGENTRANK_EVENT_QUALITY_UNLOCK_SCORE,
      target: AGENTRANK_EVENT_QUALITY_UNLOCK_SCORE,
    },
    {
      current: activityMissionCompleted ? "completed" : "pending",
      id: "activityMission",
      met: activityMissionCompleted,
      target: "completed",
    },
  ];
  const unlocked = conditions.every((condition) => condition.met);
  const primaryRole = portfolio?.roles.find(
    (role) => role.starId === portfolio.primaryStarId,
  );
  const sourceUniverseName =
    primaryRole?.universeName ??
    (portfolio?.primaryStarName
      ? `${portfolio.primaryStarName} Universe`
      : "AI Star Universe");

  const unlockData: CreatorUnlockData = {
    conditions,
    createCostUsdt: 10,
    isLiveData: true,
    unlocked,
  };

  if (portfolio) {
    unlockData.launchPreview = {
      newStarName: `${portfolio.memberName} Next AI Star`,
      ownerName: portfolio.memberName,
      sourceUniverseName,
      status: unlocked ? "mock_ready" : "locked",
    };
  }

  return unlockData;
}

export type FanletterFounderClubCreatorLaunchDraftInput = {
  categoryLabel?: string | null;
  createdAt?: Date | null;
  launchCostUsdt?: number | null;
  memberEmail: string;
  memberReferralCode?: string | null;
  name: string;
  portraitImageUrl?: string | null;
  requireUnlocked?: boolean;
  sourceStarId: string;
};

export type FanletterFounderClubCreatorLaunchDraftResult =
  | {
      cpPool: FanletterFounderUniverseCpPoolDistribution;
      sourceStar: FanletterStarDocument;
      star: FanletterStarDocument;
      status: "created" | "existing";
      unlock: CreatorUnlockData | null;
    }
  | {
      reason: string;
      status: "invalid" | "locked";
      unlock?: CreatorUnlockData | null;
    };

function normalizeCreatorLaunchName(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim().slice(0, 64) ?? "";
}

function normalizeOptionalCreatorLaunchText(
  value: string | null | undefined,
  maxLength: number,
) {
  const normalized = value?.replace(/\s+/g, " ").trim();

  return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizeCreatorLaunchCost(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 10;
}

function getCreatorLaunchStarIdToken(value: string, fallback: string) {
  const token = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);

  return token || fallback;
}

function buildCreatorLaunchStarIdCandidate({
  attempt,
  memberEmail,
  name,
  sourceStarId,
}: {
  attempt: number;
  memberEmail: string;
  name: string;
  sourceStarId: string;
}) {
  const ownerToken = getCreatorLaunchStarIdToken(
    memberEmail.split("@")[0] ?? "",
    "member",
  ).slice(0, 24);
  const sourceToken = getCreatorLaunchStarIdToken(sourceStarId, "source").slice(
    0,
    24,
  );
  const nameToken = getCreatorLaunchStarIdToken(name, "ai-star").slice(0, 36);
  const base = `creator-star-${ownerToken}-${sourceToken}-${nameToken}`.slice(
    0,
    116,
  );

  return attempt === 1 ? base : `${base}-${attempt}`;
}

async function ensureCreatorLaunchOwnerMembership({
  memberEmail,
  memberReferralCode,
  now,
  starId,
}: {
  memberEmail: string;
  memberReferralCode: string | null;
  now: Date;
  starId: string;
}) {
  const membershipsCollection =
    await getFanletterStarFounderMembershipsCollection();

  await membershipsCollection.updateOne(
    {
      memberEmail,
      starId,
    },
    {
      $max: {
        creatorProgressPercent: 100,
        influenceScore: 80,
      },
      $set: {
        memberReferralCode,
        role: "creator",
        updatedAt: now,
      },
      $setOnInsert: {
        cpBalance: 0,
        createdAt: now,
        joinedAt: now,
        joinedViaCode: null,
        joinedViaMemberEmail: null,
        joinedViaMemberReferralCode: null,
        joinedViaShareId: null,
        source: "creator_unlock",
      },
    },
    { upsert: true },
  );
}

async function getFanletterFounderUniverseCreatorEmail(
  sourceStar: FanletterStarDocument,
) {
  const ownerEmail = normalizeEmail(sourceStar.ownerEmail ?? "");

  if (ownerEmail) {
    return ownerEmail;
  }

  const membershipsCollection =
    await getFanletterStarFounderMembershipsCollection();
  const creatorMembership = await membershipsCollection.findOne(
    {
      role: "creator",
      starId: sourceStar.starId,
    },
    {
      projection: {
        memberEmail: 1,
      },
      sort: {
        joinedAt: 1,
      },
    },
  );

  return normalizeEmail(creatorMembership?.memberEmail ?? "");
}

export async function previewFanletterFounderUniverseCreatorLaunchCpPool({
  launchCreatorEmail,
  launchStarId,
  sourceStar,
}: {
  launchCreatorEmail: string;
  launchStarId: string;
  sourceStar: FanletterStarDocument;
}): Promise<FanletterFounderUniverseCpPoolDistribution> {
  const [creatorEmail, referralEdgesCollection] = await Promise.all([
    getFanletterFounderUniverseCreatorEmail(sourceStar),
    getFanletterStarReferralEdgesCollection(),
  ]);
  const referralEdges = await referralEdgesCollection
    .find(
      {
        starId: sourceStar.starId,
      },
      {
        projection: {
          sourceMemberEmail: 1,
          targetMemberEmail: 1,
        },
      },
    )
    .sort({
      createdAt: 1,
    })
    .toArray();
  const upline = resolveFanletterFounderUniverseUplinePath({
    creatorEmail,
    launchCreatorEmail,
    referralEdges,
  });

  return buildFanletterFounderUniverseCpPoolDistribution({
    launchCreatorEmail,
    launchStarId,
    rootResolved: upline.rootResolved,
    sourceStarId: sourceStar.starId,
    uplinePath: upline.path,
  });
}

export async function recordFanletterFounderUniverseCreatorLaunchCpPool({
  createdAt,
  distribution,
}: {
  createdAt?: Date | null;
  distribution: FanletterFounderUniverseCpPoolDistribution;
}) {
  const now =
    createdAt instanceof Date && !Number.isNaN(createdAt.getTime())
      ? createdAt
      : new Date();
  const influenceLedgerCollection =
    await getFanletterStarInfluenceLedgerCollection();
  const allocatedItems = distribution.items.filter(
    (item) => item.allocated && item.recipientMemberEmail && item.sourceId,
  );
  let insertedCount = 0;

  for (const item of allocatedItems) {
    const result = await influenceLedgerCollection.updateOne(
      {
        sourceId: item.sourceId ?? "",
      },
      {
        $setOnInsert: {
          cpDelta: item.cp,
          createdAt: now,
          creatorProgressDelta: 0,
          influenceDelta: 0,
          memo: `Creator launch CP Pool reward: ${item.role}`,
          recipientMemberEmail: item.recipientMemberEmail ?? "",
          source: "creator_unlock",
          sourceId: item.sourceId ?? "",
          sourceMemberEmail: distribution.launchCreatorEmail,
          starId: distribution.sourceStarId,
          targetMemberEmail: distribution.launchCreatorEmail,
        },
      },
      { upsert: true },
    );

    insertedCount += result.upsertedCount;
  }

  return {
    distribution,
    insertedCount,
    skippedCount: allocatedItems.length - insertedCount,
  };
}

export async function createFanletterFounderClubCreatorLaunchDraft(
  input: FanletterFounderClubCreatorLaunchDraftInput,
): Promise<FanletterFounderClubCreatorLaunchDraftResult> {
  const memberEmail = normalizeEmail(input.memberEmail);
  const sourceStarId = normalizeFanletterStarId(input.sourceStarId);
  const name = normalizeCreatorLaunchName(input.name);

  if (!memberEmail || !sourceStarId || !name) {
    return {
      reason: "invalid_creator_launch_input",
      status: "invalid",
    };
  }

  const [membersCollection, starsCollection] = await Promise.all([
    getMembersCollection(),
    getFanletterStarsCollection(),
  ]);
  const [member, sourceStar] = await Promise.all([
    membersCollection.findOne(
      {
        email: memberEmail,
        status: "completed",
      },
      {
        projection: {
          email: 1,
          referralCode: 1,
        },
      },
    ),
    starsCollection.findOne({
      starId: sourceStarId,
      status: { $ne: "archived" },
    }),
  ]);

  if (!member) {
    return {
      reason: "completed_member_not_found",
      status: "invalid",
    };
  }

  if (!sourceStar) {
    return {
      reason: "source_ai_star_not_found",
      status: "invalid",
    };
  }

  const unlock = await getFanletterFounderClubCreatorUnlock(memberEmail);

  if (input.requireUnlocked !== false && !unlock?.unlocked) {
    return {
      reason: "creator_unlock_conditions_not_met",
      status: "locked",
      unlock,
    };
  }

  const now =
    input.createdAt instanceof Date && !Number.isNaN(input.createdAt.getTime())
      ? input.createdAt
      : new Date();
  const memberReferralCode = normalizeReferralCode(
    input.memberReferralCode ?? member.referralCode,
  );
  const categoryLabel =
    normalizeOptionalCreatorLaunchText(input.categoryLabel, 96) ??
    "Creator Launch Draft";
  const portraitImageUrl = normalizeOptionalCreatorLaunchText(
    input.portraitImageUrl,
    500,
  );
  const launchCostUsdt = normalizeCreatorLaunchCost(input.launchCostUsdt);

  for (let attempt = 1; attempt <= 12; attempt += 1) {
    const starId = buildCreatorLaunchStarIdCandidate({
      attempt,
      memberEmail,
      name,
      sourceStarId,
    });
    const existingStar = await starsCollection.findOne({ starId });

    if (existingStar) {
      if (
        existingStar.ownerEmail === memberEmail &&
        existingStar.spawnedFromStarId === sourceStar.starId
      ) {
        await ensureCreatorLaunchOwnerMembership({
          memberEmail,
          memberReferralCode,
          now,
          starId,
        });
        const cpPool =
          await previewFanletterFounderUniverseCreatorLaunchCpPool({
            launchCreatorEmail: memberEmail,
            launchStarId: existingStar.starId,
            sourceStar,
          });

        return {
          cpPool,
          sourceStar,
          star: existingStar,
          status: "existing",
          unlock,
        };
      }

      continue;
    }

    const draftStar: FanletterStarDocument = {
      categoryLabel,
      characterName: name,
      createdAt: now,
      createdByUnlock: true,
      displayName: name,
      founderCount: 1,
      growthPercent: 0,
      launchCostUsdt,
      legacyCreatorReferralCode: null,
      legacyPersonaId: null,
      openSlotCount: Math.max(0, DEFAULT_FOUNDER_SLOT_TOTAL - 1),
      ownerEmail: memberEmail,
      ownerReferralCode: memberReferralCode,
      portraitImageUrl,
      source: "creator_unlock",
      spawnedFromStarId: sourceStar.starId,
      starId,
      starScore: 50,
      status: "draft",
      updatedAt: now,
    };

    try {
      await starsCollection.insertOne(draftStar);
      await ensureCreatorLaunchOwnerMembership({
        memberEmail,
        memberReferralCode,
        now,
        starId,
      });
      const cpPool =
        await previewFanletterFounderUniverseCreatorLaunchCpPool({
          launchCreatorEmail: memberEmail,
          launchStarId: draftStar.starId,
          sourceStar,
        });

      return {
        cpPool,
        sourceStar,
        star: draftStar,
        status: "created",
        unlock,
      };
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        continue;
      }

      throw error;
    }
  }

  return {
    reason: "creator_launch_star_id_conflict",
    status: "invalid",
    unlock,
  };
}
