import "server-only";

import {
  getCreatorProfileSnapshotForCompletedMember,
} from "@/lib/content-service";
import type { ContentPostDocument } from "@/lib/content";
import type {
  FanletterCharacterGrowthMetrics,
  FanletterCharacterGrowthMission,
  FanletterCharacterGrowthRecord,
  FanletterCharacterGrowthUnlock,
} from "@/lib/fanletter-character-growth";
import type { Locale } from "@/lib/i18n";
import type { MemberDocument } from "@/lib/member";
import {
  getContentCommentsCollection,
  getContentOrdersCollection,
  getContentPostsCollection,
  getContentSocialActionsCollection,
  getFanletterFanRequestsCollection,
} from "@/lib/mongodb";

const CHARACTER_GROWTH_MAX_LEVEL = 10;
const LEVEL_XP_FLOORS = [0, 140, 360, 680, 1120, 1680, 2380, 3240, 4280, 5520];

type AggregateCount = {
  _id: string;
  count: number;
};

type SocialAggregateCount = {
  _id: string | null;
  likeCount: number;
  saveCount: number;
};

type GrowthCopy = {
  avatarUnlocks: Array<Omit<FanletterCharacterGrowthUnlock, "unlocked"> & {
    requirement: (metrics: FanletterCharacterGrowthMetrics, level: number) => boolean;
  }>;
  contentSkills: Array<Omit<FanletterCharacterGrowthUnlock, "unlocked"> & {
    requirement: (metrics: FanletterCharacterGrowthMetrics, level: number) => boolean;
  }>;
  missions: Array<Omit<FanletterCharacterGrowthMission, "completed" | "progress"> & {
    progress: (metrics: FanletterCharacterGrowthMetrics, characterReady: boolean) => number;
  }>;
  summary: (metrics: FanletterCharacterGrowthMetrics, level: number) => string;
  titles: string[];
};

function getCopy(locale: Locale): GrowthCopy {
  if (locale === "ko") {
    return {
      avatarUnlocks: [
        {
          description: "대표 프로필에 쓰는 기본 아바타입니다.",
          id: "base",
          label: "기본 아바타",
          requirement: (_metrics, level) => level >= 1,
        },
        {
          description: "미소, 차분함 같은 브이로그용 표정을 확장합니다.",
          id: "expression",
          label: "표정 세트",
          requirement: (_metrics, level) => level >= 2,
        },
        {
          description: "일상 브이로그에 어울리는 소품과 배경 톤을 제안합니다.",
          id: "daily_props",
          label: "일상 소품",
          requirement: (metrics) => metrics.publishedVlogCount >= 3,
        },
        {
          description: "댓글과 팬 요청에 반응하는 친근한 표정을 강화합니다.",
          id: "fan_reaction",
          label: "팬 리액션",
          requirement: (metrics) =>
            metrics.commentCount + metrics.fanRequestTotalCount >= 3,
        },
        {
          description: "프리미엄 콘텐츠에 맞는 조명과 무드 스타일을 엽니다.",
          id: "premium_mood",
          label: "프리미엄 무드",
          requirement: (metrics, level) => level >= 5 || metrics.paidBuyerCount > 0,
        },
      ],
      contentSkills: [
        {
          description: "캐릭터가 같은 정체성으로 짧은 일상 장면을 이어갑니다.",
          id: "daily_vlog",
          label: "일상 브이로그",
          requirement: (_metrics, level) => level >= 1,
        },
        {
          description: "팬 댓글과 저장 반응을 다음 콘텐츠 후크로 활용합니다.",
          id: "fan_reply",
          label: "팬 댓글 반응",
          requirement: (metrics) => metrics.commentCount > 0,
        },
        {
          description: "팬이 보낸 요청을 브이로그 장면으로 바꿉니다.",
          id: "fan_request",
          label: "팬 요청 맞춤",
          requirement: (metrics) => metrics.fanRequestTotalCount > 0,
        },
        {
          description: "반응이 좋은 장면을 더 강한 숏폼 후크로 재구성합니다.",
          id: "shortform_hook",
          label: "숏폼 후크",
          requirement: (metrics, level) =>
            level >= 4 || metrics.likeCount + metrics.saveCount >= 10,
        },
        {
          description: "유료 판매 흐름에 맞는 특별 장면과 카피를 제안합니다.",
          id: "premium_content",
          label: "프리미엄 콘텐츠",
          requirement: (metrics, level) => level >= 5 || metrics.paidBuyerCount > 0,
        },
      ],
      missions: [
        {
          action: "create_character",
          description: "이름, 페르소나, 대표 아바타를 한 번에 준비합니다.",
          id: "character_ready",
          progress: (_metrics, characterReady) => (characterReady ? 1 : 0),
          target: 1,
          title: "캐릭터 정체성 완성",
        },
        {
          action: "create_vlog",
          description: "첫 세로형 브이로그를 만들어 캐릭터의 시작 장면을 확보합니다.",
          id: "first_vlog",
          progress: (metrics) => Math.min(1, metrics.totalVlogCount),
          target: 1,
          title: "첫 브이로그 만들기",
        },
        {
          action: "publish_vlog",
          description: "공개 브이로그 3개를 채워 캐릭터 채널의 기본 루틴을 만듭니다.",
          id: "three_public_vlogs",
          progress: (metrics) => Math.min(3, metrics.publishedVlogCount),
          target: 3,
          title: "공개 브이로그 3개 게시",
        },
        {
          action: "open_studio",
          description: "좋아요, 댓글, 저장 반응 10개를 모아 팬 반응형 스킬을 엽니다.",
          id: "ten_reactions",
          progress: (metrics) =>
            Math.min(10, metrics.likeCount + metrics.commentCount + metrics.saveCount),
          target: 10,
          title: "팬 반응 10개 모으기",
        },
        {
          action: "view_requests",
          description: "팬 요청을 콘텐츠로 사용해 캐릭터의 맞춤 응답력을 키웁니다.",
          id: "complete_fan_request",
          progress: (metrics) => Math.min(1, metrics.fanRequestCompletedCount),
          target: 1,
          title: "팬 요청 1개 완료",
        },
      ],
      summary: (metrics, level) =>
        metrics.publishedVlogCount > 0
          ? `공개 브이로그 ${metrics.publishedVlogCount}개와 팬 반응 ${
              metrics.likeCount + metrics.commentCount + metrics.saveCount
            }개를 기반으로 Lv.${level}까지 성장했습니다.`
          : "캐릭터 정체성을 고정하고 첫 브이로그를 만들면 성장 미션이 시작됩니다.",
      titles: [
        "캐릭터 준비 중",
        "첫 브이로거",
        "일상 브이로거",
        "팬 리액션형 캐릭터",
        "채널 운영자",
        "프리미엄 크리에이터",
        "루틴 메이커",
        "팬덤 빌더",
        "시그니처 브이로거",
        "대표 캐릭터",
      ],
    };
  }

  return {
    avatarUnlocks: [
      {
        description: "The base avatar used across the character profile.",
        id: "base",
        label: "Base avatar",
        requirement: (_metrics, level) => level >= 1,
      },
      {
        description: "Adds smile and calm expression variants for vlogs.",
        id: "expression",
        label: "Expression set",
        requirement: (_metrics, level) => level >= 2,
      },
      {
        description: "Adds prop and background suggestions for daily vlogs.",
        id: "daily_props",
        label: "Daily props",
        requirement: (metrics) => metrics.publishedVlogCount >= 3,
      },
      {
        description: "Strengthens friendly reaction looks for comments and requests.",
        id: "fan_reaction",
        label: "Fan reactions",
        requirement: (metrics) =>
          metrics.commentCount + metrics.fanRequestTotalCount >= 3,
      },
      {
        description: "Unlocks lighting and mood direction for premium content.",
        id: "premium_mood",
        label: "Premium mood",
        requirement: (metrics, level) => level >= 5 || metrics.paidBuyerCount > 0,
      },
    ],
    contentSkills: [
      {
        description: "Keeps short daily scenes aligned to the same identity.",
        id: "daily_vlog",
        label: "Daily vlog",
        requirement: (_metrics, level) => level >= 1,
      },
      {
        description: "Uses comments and saves as hooks for the next post.",
        id: "fan_reply",
        label: "Fan replies",
        requirement: (metrics) => metrics.commentCount > 0,
      },
      {
        description: "Turns fan requests into vlog scenes.",
        id: "fan_request",
        label: "Fan requests",
        requirement: (metrics) => metrics.fanRequestTotalCount > 0,
      },
      {
        description: "Reframes high-signal scenes into stronger short-form hooks.",
        id: "shortform_hook",
        label: "Short-form hook",
        requirement: (metrics, level) =>
          level >= 4 || metrics.likeCount + metrics.saveCount >= 10,
      },
      {
        description: "Suggests scenes and copy for paid content flow.",
        id: "premium_content",
        label: "Premium content",
        requirement: (metrics, level) => level >= 5 || metrics.paidBuyerCount > 0,
      },
    ],
    missions: [
      {
        action: "create_character",
        description: "Prepare the name, persona, and representative avatar.",
        id: "character_ready",
        progress: (_metrics, characterReady) => (characterReady ? 1 : 0),
        target: 1,
        title: "Complete character identity",
      },
      {
        action: "create_vlog",
        description: "Create the first vertical vlog scene for this character.",
        id: "first_vlog",
        progress: (metrics) => Math.min(1, metrics.totalVlogCount),
        target: 1,
        title: "Create first vlog",
      },
      {
        action: "publish_vlog",
        description: "Publish 3 public vlogs to establish the channel routine.",
        id: "three_public_vlogs",
        progress: (metrics) => Math.min(3, metrics.publishedVlogCount),
        target: 3,
        title: "Publish 3 public vlogs",
      },
      {
        action: "open_studio",
        description: "Collect 10 likes, comments, and saves to unlock fan-aware skills.",
        id: "ten_reactions",
        progress: (metrics) =>
          Math.min(10, metrics.likeCount + metrics.commentCount + metrics.saveCount),
        target: 10,
        title: "Collect 10 fan reactions",
      },
      {
        action: "view_requests",
        description: "Use a fan request to grow the character's response range.",
        id: "complete_fan_request",
        progress: (metrics) => Math.min(1, metrics.fanRequestCompletedCount),
        target: 1,
        title: "Complete 1 fan request",
      },
    ],
    summary: (metrics, level) =>
      metrics.publishedVlogCount > 0
        ? `Reached Lv.${level} from ${metrics.publishedVlogCount} public vlogs and ${
            metrics.likeCount + metrics.commentCount + metrics.saveCount
          } fan reactions.`
        : "Lock the character identity and create the first vlog to start growth missions.",
    titles: [
      "Character setup",
      "First vlogger",
      "Daily vlogger",
      "Fan reaction character",
      "Channel operator",
      "Premium creator",
      "Routine maker",
      "Fandom builder",
      "Signature vlogger",
      "Flagship character",
    ],
  };
}

function clampProgress(progress: number, target: number) {
  if (target <= 0) {
    return 0;
  }

  return Math.min(target, Math.max(0, progress));
}

function getPublishingStreakDays(posts: ContentPostDocument[]) {
  const dayValues = [
    ...new Set(
      posts
        .filter((post) => post.status === "published")
        .map((post) => (post.publishedAt ?? post.createdAt).toISOString().slice(0, 10)),
    ),
  ].sort((a, b) => (a < b ? 1 : -1));

  if (dayValues.length === 0) {
    return 0;
  }

  let streak = 1;
  let previous = new Date(`${dayValues[0]}T00:00:00.000Z`).getTime();

  for (const dayValue of dayValues.slice(1)) {
    const current = new Date(`${dayValue}T00:00:00.000Z`).getTime();
    const diffDays = Math.round((previous - current) / (24 * 60 * 60 * 1000));

    if (diffDays !== 1) {
      break;
    }

    streak += 1;
    previous = current;
  }

  return streak;
}

function calculateLevel(totalXp: number) {
  let level = 1;

  for (let index = 0; index < LEVEL_XP_FLOORS.length; index += 1) {
    if (totalXp >= LEVEL_XP_FLOORS[index]) {
      level = index + 1;
    }
  }

  const maxLevel = CHARACTER_GROWTH_MAX_LEVEL;
  const currentLevelFloor = LEVEL_XP_FLOORS[level - 1] ?? 0;
  const nextLevelXp =
    level >= maxLevel ? null : LEVEL_XP_FLOORS[level] ?? null;
  const xpInCurrentLevel = Math.max(0, totalXp - currentLevelFloor);
  const xpToNextLevel = nextLevelXp === null ? null : Math.max(0, nextLevelXp - totalXp);
  const progressPercent =
    nextLevelXp === null
      ? 100
      : Math.round(
          (xpInCurrentLevel / Math.max(1, nextLevelXp - currentLevelFloor)) * 100,
        );

  return {
    level,
    maxLevel,
    nextLevelXp,
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
    xpInCurrentLevel,
    xpToNextLevel,
  };
}

function calculateTotalXp({
  characterReady,
  metrics,
}: {
  characterReady: boolean;
  metrics: FanletterCharacterGrowthMetrics;
}) {
  return (
    (characterReady ? 160 : 0) +
    Math.min(metrics.draftVlogCount, 5) * 35 +
    metrics.publishedVlogCount * 90 +
    Math.min(metrics.likeCount, 250) * 8 +
    Math.min(metrics.commentCount, 150) * 14 +
    Math.min(metrics.saveCount, 200) * 12 +
    metrics.fanRequestPendingCount * 25 +
    metrics.fanRequestCompletedCount * 120 +
    metrics.paidBuyerCount * 180 +
    Math.min(metrics.streakDays, 14) * 30
  );
}

function buildMissions({
  characterReady,
  copy,
  metrics,
}: {
  characterReady: boolean;
  copy: GrowthCopy;
  metrics: FanletterCharacterGrowthMetrics;
}) {
  return copy.missions.map((mission) => {
    const progress = clampProgress(
      mission.progress(metrics, characterReady),
      mission.target,
    );

    return {
      action: mission.action,
      completed: progress >= mission.target,
      description: mission.description,
      id: mission.id,
      progress,
      target: mission.target,
      title: mission.title,
    };
  });
}

async function getContentReactionMetrics(contentIds: string[]) {
  if (contentIds.length === 0) {
    return {
      commentCount: 0,
      likeCount: 0,
      paidBuyerCount: 0,
      saveCount: 0,
    };
  }

  const socialActionsCollection = await getContentSocialActionsCollection();
  const commentsCollection = await getContentCommentsCollection();
  const ordersCollection = await getContentOrdersCollection();
  const [actionCounts, commentCounts, orderCounts] = await Promise.all([
    socialActionsCollection
      .aggregate<SocialAggregateCount>([
        {
          $match: {
            contentId: { $in: contentIds },
          },
        },
        {
          $group: {
            _id: null,
            likeCount: {
              $sum: {
                $cond: ["$liked", 1, 0],
              },
            },
            saveCount: {
              $sum: {
                $cond: ["$saved", 1, 0],
              },
            },
          },
        },
      ])
      .toArray(),
    commentsCollection.countDocuments({
      contentId: { $in: contentIds },
    }),
    ordersCollection.countDocuments({
      contentId: { $in: contentIds },
      status: "confirmed",
    }),
  ]);
  const actionCount = actionCounts[0];

  return {
    commentCount: commentCounts,
    likeCount: actionCount?.likeCount ?? 0,
    paidBuyerCount: orderCounts,
    saveCount: actionCount?.saveCount ?? 0,
  };
}

async function getFanRequestMetrics(memberEmail: string) {
  const requestsCollection = await getFanletterFanRequestsCollection();
  const counts = await requestsCollection
    .aggregate<AggregateCount>([
      {
        $match: {
          creatorEmail: memberEmail,
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const countByStatus = new Map(counts.map((item) => [item._id, item.count]));

  return {
    completedCount: countByStatus.get("used") ?? 0,
    pendingCount: (countByStatus.get("new") ?? 0) + (countByStatus.get("reviewed") ?? 0),
    totalCount: counts.reduce((total, item) => total + item.count, 0),
  };
}

export async function getFanletterCharacterGrowthForMember({
  locale,
  member,
}: {
  locale: Locale;
  member: MemberDocument;
}): Promise<FanletterCharacterGrowthRecord> {
  const [profileSnapshot, posts] = await Promise.all([
    getCreatorProfileSnapshotForCompletedMember(member),
    (async () => {
      const postsCollection = await getContentPostsCollection();

      return postsCollection
        .find({
          authorEmail: member.email,
          "contentVideoUrls.0": { $exists: true },
        })
        .toArray();
    })(),
  ]);
  const contentIds = posts.map((post) => post.contentId);
  const [reactions, fanRequests] = await Promise.all([
    getContentReactionMetrics(contentIds),
    getFanRequestMetrics(member.email),
  ]);
  const draftVlogCount = posts.filter((post) => post.status === "draft").length;
  const publishedVlogCount = posts.filter(
    (post) => post.status === "published",
  ).length;
  const characterReady = Boolean(
    profileSnapshot.profile.displayName.trim() &&
      profileSnapshot.profile.characterPersona &&
      profileSnapshot.profile.avatarImageUrl,
  );
  const metrics: FanletterCharacterGrowthMetrics = {
    commentCount: reactions.commentCount,
    draftVlogCount,
    fanRequestCompletedCount: fanRequests.completedCount,
    fanRequestPendingCount: fanRequests.pendingCount,
    fanRequestTotalCount: fanRequests.totalCount,
    likeCount: reactions.likeCount,
    paidBuyerCount: reactions.paidBuyerCount,
    publishedVlogCount,
    saveCount: reactions.saveCount,
    streakDays: getPublishingStreakDays(posts),
    totalVlogCount: draftVlogCount + publishedVlogCount,
  };
  const totalXp = calculateTotalXp({ characterReady, metrics });
  const levelState = calculateLevel(totalXp);
  const copy = getCopy(locale);
  const title = copy.titles[levelState.level - 1] ?? copy.titles[0];

  return {
    avatarUnlocks: copy.avatarUnlocks.map((unlock) => ({
      description: unlock.description,
      id: unlock.id,
      label: unlock.label,
      unlocked: unlock.requirement(metrics, levelState.level),
    })),
    contentSkills: copy.contentSkills.map((skill) => ({
      description: skill.description,
      id: skill.id,
      label: skill.label,
      unlocked: skill.requirement(metrics, levelState.level),
    })),
    level: levelState.level,
    locale,
    maxLevel: levelState.maxLevel,
    metrics,
    missions: buildMissions({ characterReady, copy, metrics }),
    nextLevelXp: levelState.nextLevelXp,
    progressPercent: levelState.progressPercent,
    summary: copy.summary(metrics, levelState.level),
    title,
    totalXp,
    xpInCurrentLevel: levelState.xpInCurrentLevel,
    xpToNextLevel: levelState.xpToNextLevel,
  };
}
