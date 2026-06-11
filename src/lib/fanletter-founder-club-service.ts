import "server-only";

import type { Filter } from "mongodb";

import type {
  AIStar,
  FounderRole,
  HumanFounderSlot,
  LocalizedText,
} from "@/mock/fanletterV2";
import type {
  FanletterStarDocument,
  FanletterStarFounderMembershipDocument,
} from "@/lib/fanletter-founder-club";
import {
  getFanletterStarFounderMembershipsCollection,
  getFanletterStarsCollection,
  getMembersCollection,
} from "@/lib/mongodb";

const HOME_STAR_LIMIT = 4;
const FOUNDER_SLOT_LIMIT = 4;
const DEFAULT_FOUNDER_SLOT_TOTAL = 150;

const starAccentPairs = [
  ["#8b5cf6", "#22d3ee"],
  ["#ec4899", "#f59e0b"],
  ["#06b6d4", "#84cc16"],
  ["#7c3aed", "#f97316"],
  ["#14b8a6", "#a78bfa"],
  ["#f43f5e", "#38bdf8"],
] as const;

function hashText(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getAccentPair(starId: string) {
  return starAccentPairs[hashText(starId) % starAccentPairs.length];
}

function compactText(value: string | null | undefined, fallback: string) {
  const text = value?.replace(/\s+/g, " ").trim();
  return text || fallback;
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

function getDisplayGrowthPercent(star: FanletterStarDocument) {
  if (star.growthPercent > 0) {
    return star.growthPercent;
  }

  if (star.starScore <= 0) {
    return 0;
  }

  return Math.max(8, Math.min(49, Math.round(star.starScore / 2)));
}

function getFounderSlotTotal(star: FanletterStarDocument) {
  const explicitTotal = star.founderCount + star.openSlotCount;
  return explicitTotal > 0 ? explicitTotal : DEFAULT_FOUNDER_SLOT_TOTAL;
}

function toFounderRole(
  role: FanletterStarFounderMembershipDocument["role"],
): Exclude<FounderRole, "member"> {
  return role;
}

function serializeFounderSlots({
  memberships,
  memberNamesByEmail,
}: {
  memberships: FanletterStarFounderMembershipDocument[];
  memberNamesByEmail: Map<string, string>;
}): HumanFounderSlot[] {
  return memberships.slice(0, FOUNDER_SLOT_LIMIT).map((membership) => {
    const fallbackName = membership.memberEmail.split("@")[0] || "Member";
    const name = memberNamesByEmail.get(membership.memberEmail) ?? fallbackName;

    return {
      initials: getInitials(name),
      name,
      role: toFounderRole(membership.role),
    };
  });
}

function serializeStar({
  founderSlots,
  star,
}: {
  founderSlots: HumanFounderSlot[];
  star: FanletterStarDocument;
}): AIStar {
  const [accentColor, accentSecondary] = getAccentPair(star.starId);
  const founderSlotTotal = getFounderSlotTotal(star);
  const founderCount = Math.max(star.founderCount, founderSlots.length);
  const openSlotCount =
    star.openSlotCount > 0
      ? star.openSlotCount
      : Math.max(0, founderSlotTotal - founderCount);

  return {
    accentColor,
    accentSecondary,
    founderCount,
    founderSlots,
    growthPercent: getDisplayGrowthPercent(star),
    id: star.starId,
    name: compactText(star.characterName, star.displayName),
    openSlots: {
      open: openSlotCount,
      total: Math.max(founderSlotTotal, founderCount + openSlotCount),
    },
    portraitImageUrl: star.portraitImageUrl,
    portraitInitials: getInitials(star.characterName || star.displayName),
    specialty: getSpecialtyText(star),
    spawnedStars: [],
    starScore: star.starScore,
    universeName: getUniverseName(star),
  };
}

export async function getFanletterFounderClubHomeStars(options?: {
  limit?: number;
}) {
  const limit = Math.max(1, Math.min(options?.limit ?? HOME_STAR_LIMIT, 12));
  const starsCollection = await getFanletterStarsCollection();
  const starFilter: Filter<FanletterStarDocument> = {
    status: "active",
  };
  const stars = await starsCollection
    .find(starFilter)
    .sort({
      growthPercent: -1,
      starScore: -1,
      founderCount: -1,
      updatedAt: -1,
    })
    .limit(limit)
    .toArray();

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

  for (const membership of memberships) {
    const list = membershipsByStarId.get(membership.starId) ?? [];
    list.push(membership);
    membershipsByStarId.set(membership.starId, list);
  }

  return stars.map((star) =>
    serializeStar({
      founderSlots: serializeFounderSlots({
        memberNamesByEmail,
        memberships: membershipsByStarId.get(star.starId) ?? [],
      }),
      star,
    }),
  );
}
