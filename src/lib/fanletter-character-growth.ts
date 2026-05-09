import type { Locale } from "@/lib/i18n";

export type FanletterCharacterGrowthMissionAction =
  | "create_character"
  | "create_vlog"
  | "open_studio"
  | "publish_vlog"
  | "view_requests";

export type FanletterCharacterGrowthMission = {
  action: FanletterCharacterGrowthMissionAction;
  completed: boolean;
  description: string;
  id: string;
  progress: number;
  target: number;
  title: string;
};

export type FanletterCharacterGrowthUnlock = {
  description: string;
  id: string;
  label: string;
  unlocked: boolean;
};

export type FanletterCharacterGrowthMetrics = {
  commentCount: number;
  draftVlogCount: number;
  fanRequestCompletedCount: number;
  fanRequestPendingCount: number;
  fanRequestTotalCount: number;
  likeCount: number;
  paidBuyerCount: number;
  publishedVlogCount: number;
  saveCount: number;
  streakDays: number;
  totalVlogCount: number;
};

export type FanletterCharacterGrowthRecord = {
  avatarUnlocks: FanletterCharacterGrowthUnlock[];
  contentSkills: FanletterCharacterGrowthUnlock[];
  level: number;
  locale: Locale;
  maxLevel: number;
  metrics: FanletterCharacterGrowthMetrics;
  missions: FanletterCharacterGrowthMission[];
  nextLevelXp: number | null;
  progressPercent: number;
  summary: string;
  title: string;
  totalXp: number;
  xpInCurrentLevel: number;
  xpToNextLevel: number | null;
};

export type FanletterCharacterGrowthResponse = {
  growth: FanletterCharacterGrowthRecord;
};
