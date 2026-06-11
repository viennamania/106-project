import "server-only";

import type { Filter } from "mongodb";

import type {
  AIStar,
  FounderRole,
  HumanFounderSlot,
  LocalizedText,
  MemberPortfolio,
} from "@/mock/fanletterV2";
import type {
  FanletterStarDocument,
  FanletterStarFounderMembershipDocument,
} from "@/lib/fanletter-founder-club";
import {
  getFanletterStarInfluenceLedgerCollection,
  getFanletterStarFounderMembershipsCollection,
  getFanletterStarReferralEdgesCollection,
  getFanletterStarsCollection,
  getMembersCollection,
} from "@/lib/mongodb";
import { normalizeEmail } from "@/lib/member";

const HOME_STAR_LIMIT = 4;
const FOUNDER_SLOT_LIMIT = 4;
const DEFAULT_FOUNDER_SLOT_TOTAL = 150;
const MEMBER_PORTFOLIO_ROLE_LIMIT = 12;
const founderRoleRank: Record<Exclude<FounderRole, "member">, number> = {
  creator: 0,
  mentor: 1,
  partner: 2,
  founder: 3,
};

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

export async function getFanletterFounderClubMemberPortfolio(
  email?: string | null,
): Promise<MemberPortfolio | null> {
  const memberEmail = normalizeEmail(email ?? "");

  if (!memberEmail) {
    return null;
  }

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
  const stars =
    starIds.length > 0
      ? await starsCollection.find({ starId: { $in: starIds } }).toArray()
      : [];
  const starsById = new Map(stars.map((star) => [star.starId, star]));
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
