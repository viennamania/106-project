export const ACTIVITY_TIME_ZONE = "Asia/Seoul";
export const ACTIVITY_CHECK_IN_POINTS = 3;
export const ACTIVITY_TAP_TARGET = 100;
export const ACTIVITY_TAP_REWARD_POINTS = 1;
export const ACTIVITY_TAP_DAILY_REWARD_LIMIT = 3;
export const ACTIVITY_TAP_SESSION_DURATION_SECONDS = 30;
export const ACTIVITY_TEAM_BONUS_POINTS = 1;
export const ACTIVITY_TEAM_BONUS_LEVEL_LIMIT = 2;
export const ACTIVITY_HISTORY_LIMIT = 8;

export const activityLedgerSourceTypes = [
  "check_in",
  "tap_challenge",
  "team_bonus",
] as const;

export const activityTapSessionStatuses = [
  "active",
  "completed",
  "expired",
] as const;

export type ActivityLedgerSourceType =
  (typeof activityLedgerSourceTypes)[number];

export type ActivityTapSessionStatus =
  (typeof activityTapSessionStatuses)[number];

export type ActivityProfileRecord = {
  createdAt: string;
  lastCheckInDateKey: string | null;
  lifetimeActivityPoints: number;
  memberEmail: string;
  spendableActivityPoints: number;
  streakDays: number;
  updatedAt: string;
};

export type ActivityDailyStateRecord = {
  bestTapCount: number;
  checkedInAt: string | null;
  createdAt: string;
  dateKey: string;
  memberEmail: string;
  tapRewardsEarned: number;
  teamBonusPoints: number;
  updatedAt: string;
};

export type ActivityLedgerRecord = {
  createdAt: string;
  dateKey: string;
  ledgerEntryId: string;
  level: number | null;
  memberEmail: string;
  points: number;
  sourceId: string;
  sourceMemberEmail: string | null;
  sourceType: ActivityLedgerSourceType;
};

export type ActivityTapSessionRecord = {
  completedAt: string | null;
  createdAt: string;
  dateKey: string;
  expiresAt: string;
  memberEmail: string;
  rewardedPoints: number;
  sessionId: string;
  startedAt: string;
  status: ActivityTapSessionStatus;
  tapCount: number;
  targetTaps: number;
  updatedAt: string;
};

export type ActivityMissionProgressRecord = {
  completed: boolean;
  id: "check_in" | "tap_challenge" | "team_bonus";
  progressLabel: string;
};

export type ActivitySummaryRecord = {
  activeSession: ActivityTapSessionRecord | null;
  history: ActivityLedgerRecord[];
  missions: ActivityMissionProgressRecord[];
  profile: ActivityProfileRecord;
  today: {
    bestTapCount: number;
    checkInPoints: number;
    checkedIn: boolean;
    dateKey: string;
    remainingTapRewards: number;
    streakDays: number;
    tapRewardCount: number;
    tapRewardLimit: number;
    tapRewardPoints: number;
    tapTarget: number;
    teamBonusPoints: number;
    totalPoints: number;
  };
  updatedAt: string;
};

export type ActivitySummaryResponse = {
  summary: ActivitySummaryRecord;
};

export type ActivityCheckInResponse = {
  summary: ActivitySummaryRecord;
};

export type ActivityTapSessionStartResponse = {
  session: ActivityTapSessionRecord;
  summary: ActivitySummaryRecord;
};

export type ActivityTapSessionFinishResponse = {
  rewardEarned: number;
  session: ActivityTapSessionRecord;
  summary: ActivitySummaryRecord;
};

export type ActivityProfileDocument = {
  createdAt: Date;
  lastCheckInDateKey?: string | null;
  lifetimeActivityPoints: number;
  memberEmail: string;
  spendableActivityPoints: number;
  streakDays: number;
  updatedAt: Date;
};

export type ActivityDailyStateDocument = {
  bestTapCount: number;
  checkedInAt?: Date | null;
  createdAt: Date;
  dateKey: string;
  memberEmail: string;
  tapRewardsEarned: number;
  teamBonusPoints: number;
  updatedAt: Date;
};

export type ActivityLedgerDocument = {
  createdAt: Date;
  dateKey: string;
  ledgerEntryId: string;
  level?: number | null;
  memberEmail: string;
  points: number;
  sourceId: string;
  sourceMemberEmail?: string | null;
  sourceType: ActivityLedgerSourceType;
};

export type ActivityTapSessionDocument = {
  completedAt?: Date | null;
  createdAt: Date;
  dateKey: string;
  expiresAt: Date;
  memberEmail: string;
  rewardedPoints: number;
  sessionId: string;
  startedAt: Date;
  status: ActivityTapSessionStatus;
  tapCount: number;
  targetTaps: number;
  updatedAt: Date;
};

export function serializeActivityProfile(
  profile: ActivityProfileDocument,
): ActivityProfileRecord {
  return {
    createdAt: profile.createdAt.toISOString(),
    lastCheckInDateKey: profile.lastCheckInDateKey ?? null,
    lifetimeActivityPoints: profile.lifetimeActivityPoints,
    memberEmail: profile.memberEmail,
    spendableActivityPoints: profile.spendableActivityPoints,
    streakDays: profile.streakDays,
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export function serializeActivityDailyState(
  state: ActivityDailyStateDocument,
): ActivityDailyStateRecord {
  return {
    bestTapCount: state.bestTapCount,
    checkedInAt: state.checkedInAt?.toISOString() ?? null,
    createdAt: state.createdAt.toISOString(),
    dateKey: state.dateKey,
    memberEmail: state.memberEmail,
    tapRewardsEarned: state.tapRewardsEarned,
    teamBonusPoints: state.teamBonusPoints,
    updatedAt: state.updatedAt.toISOString(),
  };
}

export function serializeActivityLedger(
  ledgerEntry: ActivityLedgerDocument,
): ActivityLedgerRecord {
  return {
    createdAt: ledgerEntry.createdAt.toISOString(),
    dateKey: ledgerEntry.dateKey,
    ledgerEntryId: ledgerEntry.ledgerEntryId,
    level: ledgerEntry.level ?? null,
    memberEmail: ledgerEntry.memberEmail,
    points: ledgerEntry.points,
    sourceId: ledgerEntry.sourceId,
    sourceMemberEmail: ledgerEntry.sourceMemberEmail ?? null,
    sourceType: ledgerEntry.sourceType,
  };
}

export function serializeActivityTapSession(
  session: ActivityTapSessionDocument,
): ActivityTapSessionRecord {
  return {
    completedAt: session.completedAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    dateKey: session.dateKey,
    expiresAt: session.expiresAt.toISOString(),
    memberEmail: session.memberEmail,
    rewardedPoints: session.rewardedPoints,
    sessionId: session.sessionId,
    startedAt: session.startedAt.toISOString(),
    status: session.status,
    tapCount: session.tapCount,
    targetTaps: session.targetTaps,
    updatedAt: session.updatedAt.toISOString(),
  };
}

export function createEmptyActivityProfile(
  memberEmail = "",
): ActivityProfileRecord {
  const now = new Date().toISOString();

  return {
    createdAt: now,
    lastCheckInDateKey: null,
    lifetimeActivityPoints: 0,
    memberEmail,
    spendableActivityPoints: 0,
    streakDays: 0,
    updatedAt: now,
  };
}

export function createEmptyActivitySummary(
  memberEmail = "",
  dateKey = "",
): ActivitySummaryRecord {
  const now = new Date().toISOString();

  return {
    activeSession: null,
    history: [],
    missions: [
      {
        completed: false,
        id: "check_in",
        progressLabel: `0 / ${ACTIVITY_CHECK_IN_POINTS}P`,
      },
      {
        completed: false,
        id: "tap_challenge",
        progressLabel: `0 / ${ACTIVITY_TAP_TARGET}`,
      },
      {
        completed: false,
        id: "team_bonus",
        progressLabel: "0P",
      },
    ],
    profile: createEmptyActivityProfile(memberEmail),
    today: {
      bestTapCount: 0,
      checkInPoints: ACTIVITY_CHECK_IN_POINTS,
      checkedIn: false,
      dateKey,
      remainingTapRewards: ACTIVITY_TAP_DAILY_REWARD_LIMIT,
      streakDays: 0,
      tapRewardCount: 0,
      tapRewardLimit: ACTIVITY_TAP_DAILY_REWARD_LIMIT,
      tapRewardPoints: ACTIVITY_TAP_REWARD_POINTS,
      tapTarget: ACTIVITY_TAP_TARGET,
      teamBonusPoints: 0,
      totalPoints: 0,
    },
    updatedAt: now,
  };
}
