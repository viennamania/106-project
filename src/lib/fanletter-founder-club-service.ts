import "server-only";

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

const HOME_STAR_LIMIT = 4;
const FOUNDER_SLOT_LIMIT = 4;
const DEFAULT_FOUNDER_SLOT_TOTAL = 150;
const MEMBER_PORTFOLIO_ROLE_LIMIT = 12;
const SPAWNED_STAR_LIMIT = 3;
const SCOUT_SIGNUP_CP_REWARD = 100;
const SCOUT_SIGNUP_CREATOR_PROGRESS_REWARD = 2;
const SCOUT_SIGNUP_INFLUENCE_REWARD = 5;
const SCOUT_SHARE_PLATFORMS = ["Kakao", "Instagram", "X", "TikTok"] as const;
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

export type FanletterStarReferralAttribution = {
  code: string;
  memberEmail: string;
  memberReferralCode: string | null;
  starId: string;
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
  spawnedStars = [],
  star,
}: {
  founderSlots: HumanFounderSlot[];
  spawnedStars?: SpawnedAIStar[];
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
    spawnedStars,
    starScore: star.starScore,
    universeName: getUniverseName(star),
  };
}

function serializeSpawnedStar(star: FanletterStarDocument): SpawnedAIStar {
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
        role: "founder",
        source: "member_signup",
      },
    },
    { upsert: true },
  );

  if (attribution) {
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

  if (targetMembershipResult.upsertedCount > 0) {
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
          role: "founder",
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

  await membersCollection.updateOne(
    { email: member.email },
    {
      $set: {
        fanletterStarReferralAppliedAt: now,
        fanletterStarReferralCode: attribution.code,
        fanletterStarReferralSourceMemberEmail: attribution.memberEmail,
        fanletterStarReferralSourceMemberReferralCode:
          attribution.memberReferralCode,
        fanletterStarReferralStarId: attribution.starId,
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
  const spawnedStarCandidates =
    founderMemberEmails.length > 0
      ? await starsCollection
          .find({
            ownerEmail: { $in: founderMemberEmails },
            starId: { $nin: starIds },
            status: { $ne: "archived" },
          })
          .sort({
            growthPercent: -1,
            starScore: -1,
            founderCount: -1,
            updatedAt: -1,
          })
          .limit(limit * SPAWNED_STAR_LIMIT * 2)
          .toArray()
      : [];
  const spawnedStarsByParentStarId = new Map<string, SpawnedAIStar[]>();

  for (const spawnedStar of spawnedStarCandidates) {
    if (!spawnedStar.ownerEmail) {
      continue;
    }

    const parentMemberships =
      membershipsByMemberEmail.get(spawnedStar.ownerEmail) ?? [];

    for (const parentMembership of parentMemberships) {
      if (parentMembership.starId === spawnedStar.starId) {
        continue;
      }

      const list =
        spawnedStarsByParentStarId.get(parentMembership.starId) ?? [];

      if (
        list.length >= SPAWNED_STAR_LIMIT ||
        list.some((item) => item.id === spawnedStar.starId)
      ) {
        continue;
      }

      list.push(serializeSpawnedStar(spawnedStar));
      spawnedStarsByParentStarId.set(parentMembership.starId, list);
    }
  }

  return stars.map((star) =>
    serializeStar({
      founderSlots: serializeFounderSlots({
        memberNamesByEmail,
        memberships: membershipsByStarId.get(star.starId) ?? [],
      }),
      spawnedStars: spawnedStarsByParentStarId.get(star.starId) ?? [],
      star,
    }),
  );
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
  const spawnedStars =
    memberEmails.length > 0
      ? await starsCollection
          .find({
            ownerEmail: { $in: memberEmails },
            starId: { $ne: starId },
            status: { $ne: "archived" },
          })
          .sort({
            growthPercent: -1,
            starScore: -1,
            founderCount: -1,
            updatedAt: -1,
          })
          .limit(SPAWNED_STAR_LIMIT)
          .toArray()
      : [];

  return serializeStar({
    founderSlots: serializeFounderSlots({
      memberNamesByEmail,
      memberships,
    }),
    spawnedStars: spawnedStars.map(serializeSpawnedStar),
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
): Promise<CreatorUnlockData | null> {
  const memberEmail = normalizeEmail(email ?? "");

  if (!memberEmail) {
    return null;
  }

  const [portfolio, activityProfile] = await Promise.all([
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
  ]);
  const scoutScore = portfolio?.scoutScore ?? 0;
  const directInvites = portfolio?.directInvites ?? 0;
  const cpBalance = portfolio?.cpBalance ?? 0;
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
      : "Founder Club Universe");

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
