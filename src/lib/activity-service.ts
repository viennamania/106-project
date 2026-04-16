import "server-only";

import { randomUUID } from "node:crypto";

import {
  ACTIVITY_CHECK_IN_POINTS,
  ACTIVITY_HISTORY_LIMIT,
  ACTIVITY_TAP_DAILY_REWARD_LIMIT,
  ACTIVITY_TAP_REWARD_POINTS,
  ACTIVITY_TAP_SESSION_DURATION_SECONDS,
  ACTIVITY_TAP_TARGET,
  ACTIVITY_TEAM_BONUS_LEVEL_LIMIT,
  ACTIVITY_TEAM_BONUS_POINTS,
  ACTIVITY_TIME_ZONE,
  createEmptyActivitySummary,
  serializeActivityLedger,
  serializeActivityProfile,
  serializeActivityTapSession,
  type ActivityDailyStateDocument,
  type ActivityLedgerDocument,
  type ActivityLedgerSourceType,
  type ActivityProfileDocument,
  type ActivitySummaryRecord,
  type ActivityTapSessionDocument,
} from "@/lib/activity";
import type { MemberDocument } from "@/lib/member";
import { normalizeReferralCode } from "@/lib/member";
import {
  getActivityDailyStatesCollection,
  getActivityLedgerCollection,
  getActivityProfilesCollection,
  getActivityTapSessionsCollection,
  getMembersCollection,
} from "@/lib/mongodb";

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function getPlacementReferralCode(member: MemberDocument) {
  return member.placementReferralCode ?? member.referredByCode ?? null;
}

function getActivityDateKey(value = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: ACTIVITY_TIME_ZONE,
    year: "numeric",
  });
  const parts = formatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function dateKeyToDayNumber(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map((value) => Number(value));
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function createActivityProfileDocument(
  memberEmail: string,
): ActivityProfileDocument {
  const now = new Date();

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

function createDailyStateDocument(
  memberEmail: string,
  dateKey: string,
): ActivityDailyStateDocument {
  const now = new Date();

  return {
    bestTapCount: 0,
    checkedInAt: null,
    createdAt: now,
    dateKey,
    memberEmail,
    tapRewardsEarned: 0,
    teamBonusPoints: 0,
    updatedAt: now,
  };
}

async function ensureActivityProfile(memberEmail: string) {
  const collection = await getActivityProfilesCollection();
  const existing = await collection.findOne({ memberEmail });

  if (existing) {
    return existing;
  }

  const created = createActivityProfileDocument(memberEmail);

  try {
    await collection.insertOne(created);
    return created;
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
  }

  return (
    (await collection.findOne({ memberEmail })) ??
    createActivityProfileDocument(memberEmail)
  );
}

async function ensureDailyState(memberEmail: string, dateKey: string) {
  const collection = await getActivityDailyStatesCollection();
  const existing = await collection.findOne({ dateKey, memberEmail });

  if (existing) {
    return existing;
  }

  const created = createDailyStateDocument(memberEmail, dateKey);

  try {
    await collection.insertOne(created);
    return created;
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
  }

  return (
    (await collection.findOne({ dateKey, memberEmail })) ??
    createDailyStateDocument(memberEmail, dateKey)
  );
}

async function expireTapSessionsForMember(memberEmail: string) {
  const collection = await getActivityTapSessionsCollection();
  const now = new Date();

  await collection.updateMany(
    {
      expiresAt: { $lte: now },
      memberEmail,
      status: "active",
    },
    {
      $set: {
        completedAt: now,
        status: "expired",
        updatedAt: now,
      },
    },
  );
}

async function findActiveTapSession(memberEmail: string) {
  await expireTapSessionsForMember(memberEmail);
  const collection = await getActivityTapSessionsCollection();

  return collection.findOne(
    {
      memberEmail,
      status: "active",
    },
    {
      sort: {
        createdAt: -1,
      },
    },
  );
}

async function awardActivityPoints({
  dateKey,
  level = null,
  memberEmail,
  points,
  sourceId,
  sourceMemberEmail = null,
  sourceType,
}: {
  dateKey: string;
  level?: number | null;
  memberEmail: string;
  points: number;
  sourceId: string;
  sourceMemberEmail?: string | null;
  sourceType: ActivityLedgerSourceType;
}) {
  const now = new Date();
  const ledgerCollection = await getActivityLedgerCollection();
  const profilesCollection = await getActivityProfilesCollection();
  const dailyStatesCollection = await getActivityDailyStatesCollection();

  try {
    await ledgerCollection.insertOne({
      createdAt: now,
      dateKey,
      ledgerEntryId: randomUUID(),
      level,
      memberEmail,
      points,
      sourceId,
      sourceMemberEmail,
      sourceType,
    } satisfies ActivityLedgerDocument);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return false;
    }

    throw error;
  }

  await profilesCollection.updateOne(
    { memberEmail },
    {
      $inc: {
        lifetimeActivityPoints: points,
        spendableActivityPoints: points,
      },
      $set: {
        updatedAt: now,
      },
      $setOnInsert: createActivityProfileDocument(memberEmail),
    },
    {
      upsert: true,
    },
  );

  await dailyStatesCollection.updateOne(
    {
      dateKey,
      memberEmail,
    },
    {
      ...(sourceType === "team_bonus"
        ? {
            $inc: {
              teamBonusPoints: points,
            },
          }
        : {}),
      $set: {
        updatedAt: now,
      },
      $setOnInsert: createDailyStateDocument(memberEmail, dateKey),
    },
    {
      upsert: true,
    },
  );

  return true;
}

async function awardTeamBonuses({
  dateKey,
  member,
  originSourceId,
}: {
  dateKey: string;
  member: MemberDocument;
  originSourceId: string;
}) {
  const membersCollection = await getMembersCollection();
  const seenReferralCodes = new Set<string>();
  let currentReferralCode = normalizeReferralCode(getPlacementReferralCode(member));

  for (
    let level = 1;
    level <= ACTIVITY_TEAM_BONUS_LEVEL_LIMIT && currentReferralCode;
    level += 1
  ) {
    if (seenReferralCodes.has(currentReferralCode)) {
      break;
    }

    seenReferralCodes.add(currentReferralCode);

    const recipient = await membersCollection.findOne({
      referralCode: currentReferralCode,
      status: "completed",
    });

    if (!recipient) {
      break;
    }

    await awardActivityPoints({
      dateKey,
      level,
      memberEmail: recipient.email,
      points: ACTIVITY_TEAM_BONUS_POINTS,
      sourceId: `${originSourceId}:level:${level}`,
      sourceMemberEmail: member.email,
      sourceType: "team_bonus",
    });

    currentReferralCode = normalizeReferralCode(
      getPlacementReferralCode(recipient),
    );
  }
}

function buildMissionProgress(summary: {
  checkedIn: boolean;
  remainingTapRewards: number;
  tapRewardCount: number;
  teamBonusPoints: number;
}) {
  return [
    {
      completed: summary.checkedIn,
      id: "check_in" as const,
      progressLabel: summary.checkedIn
        ? `${ACTIVITY_CHECK_IN_POINTS}P`
        : `0 / ${ACTIVITY_CHECK_IN_POINTS}P`,
    },
    {
      completed: summary.tapRewardCount > 0,
      id: "tap_challenge" as const,
      progressLabel:
        summary.tapRewardCount > 0
          ? `${ACTIVITY_TAP_TARGET} / ${ACTIVITY_TAP_TARGET}`
          : `0 / ${ACTIVITY_TAP_TARGET}`,
    },
    {
      completed: summary.teamBonusPoints > 0,
      id: "team_bonus" as const,
      progressLabel: `${summary.teamBonusPoints}P`,
    },
  ];
}

export async function getActivitySummaryForMember(
  member: MemberDocument,
): Promise<ActivitySummaryRecord> {
  const dateKey = getActivityDateKey();
  const [profile, dailyState] = await Promise.all([
    ensureActivityProfile(member.email),
    ensureDailyState(member.email, dateKey),
  ]);

  const ledgerCollection = await getActivityLedgerCollection();
  const [historyEntries, todayEntries, activeSession] = await Promise.all([
    ledgerCollection
      .find({ memberEmail: member.email })
      .sort({ createdAt: -1 })
      .limit(ACTIVITY_HISTORY_LIMIT)
      .toArray(),
    ledgerCollection
      .find({ dateKey, memberEmail: member.email })
      .sort({ createdAt: -1 })
      .toArray(),
    findActiveTapSession(member.email),
  ]);

  const todayTotalPoints = todayEntries.reduce(
    (sum, entry) => sum + entry.points,
    0,
  );
  const remainingTapRewards = Math.max(
    0,
    ACTIVITY_TAP_DAILY_REWARD_LIMIT - dailyState.tapRewardsEarned,
  );
  const emptySummary = createEmptyActivitySummary(member.email, dateKey);

  return {
    ...emptySummary,
    activeSession: activeSession
      ? serializeActivityTapSession(activeSession)
      : null,
    history: historyEntries.map(serializeActivityLedger),
    missions: buildMissionProgress({
      checkedIn: Boolean(dailyState.checkedInAt),
      remainingTapRewards,
      tapRewardCount: dailyState.tapRewardsEarned,
      teamBonusPoints: dailyState.teamBonusPoints,
    }),
    profile: serializeActivityProfile(profile),
    today: {
      ...emptySummary.today,
      bestTapCount: dailyState.bestTapCount,
      checkedIn: Boolean(dailyState.checkedInAt),
      dateKey,
      remainingTapRewards,
      streakDays: profile.streakDays,
      tapRewardCount: dailyState.tapRewardsEarned,
      teamBonusPoints: dailyState.teamBonusPoints,
      totalPoints: todayTotalPoints,
    },
    updatedAt: new Date().toISOString(),
  };
}

export async function claimActivityCheckIn(member: MemberDocument) {
  const dateKey = getActivityDateKey();
  const now = new Date();
  const [profile, dailyState] = await Promise.all([
    ensureActivityProfile(member.email),
    ensureDailyState(member.email, dateKey),
  ]);

  if (dailyState.checkedInAt) {
    return getActivitySummaryForMember(member);
  }

  const previousDateKey = profile.lastCheckInDateKey;
  const nextStreakDays =
    previousDateKey &&
    dateKeyToDayNumber(dateKey) - dateKeyToDayNumber(previousDateKey) === 1
      ? profile.streakDays + 1
      : 1;
  const dailyStatesCollection = await getActivityDailyStatesCollection();
  const profilesCollection = await getActivityProfilesCollection();

  await Promise.all([
    dailyStatesCollection.updateOne(
      {
        dateKey,
        memberEmail: member.email,
      },
      {
        $set: {
          checkedInAt: now,
          updatedAt: now,
        },
      },
    ),
    profilesCollection.updateOne(
      { memberEmail: member.email },
      {
        $set: {
          lastCheckInDateKey: dateKey,
          streakDays: nextStreakDays,
          updatedAt: now,
        },
      },
    ),
  ]);

  const sourceId = `check-in:${dateKey}`;

  await awardActivityPoints({
    dateKey,
    memberEmail: member.email,
    points: ACTIVITY_CHECK_IN_POINTS,
    sourceId,
    sourceType: "check_in",
  });
  await awardTeamBonuses({
    dateKey,
    member,
    originSourceId: `team-bonus:${sourceId}:${member.email}`,
  });

  return getActivitySummaryForMember(member);
}

export async function startActivityTapSession(member: MemberDocument) {
  const dateKey = getActivityDateKey();
  const dailyState = await ensureDailyState(member.email, dateKey);

  if (dailyState.tapRewardsEarned >= ACTIVITY_TAP_DAILY_REWARD_LIMIT) {
    throw new Error("Daily tap reward limit reached.");
  }

  const existingSession = await findActiveTapSession(member.email);

  if (existingSession) {
    return {
      session: serializeActivityTapSession(existingSession),
      summary: await getActivitySummaryForMember(member),
    };
  }

  const collection = await getActivityTapSessionsCollection();
  const now = new Date();
  const session = {
    createdAt: now,
    dateKey,
    expiresAt: new Date(
      now.getTime() + ACTIVITY_TAP_SESSION_DURATION_SECONDS * 1000,
    ),
    memberEmail: member.email,
    rewardedPoints: 0,
    sessionId: randomUUID(),
    startedAt: now,
    status: "active",
    tapCount: 0,
    targetTaps: ACTIVITY_TAP_TARGET,
    updatedAt: now,
  } satisfies ActivityTapSessionDocument;

  await collection.insertOne(session);

  return {
    session: serializeActivityTapSession(session),
    summary: await getActivitySummaryForMember(member),
  };
}

export async function finishActivityTapSession(
  member: MemberDocument,
  input: {
    sessionId: string;
    tapCount: number;
  },
) {
  const collection = await getActivityTapSessionsCollection();
  const session = await collection.findOne({
    memberEmail: member.email,
    sessionId: input.sessionId,
  });

  if (!session) {
    throw new Error("Tap session not found.");
  }

  if (session.status !== "active") {
    return {
      rewardEarned: session.rewardedPoints,
      session: serializeActivityTapSession(session),
      summary: await getActivitySummaryForMember(member),
    };
  }

  const now = new Date();
  const tapCount = Math.max(0, Math.floor(input.tapCount));
  const dateKey = session.dateKey;
  const dailyState = await ensureDailyState(member.email, dateKey);
  const isExpired = now.getTime() > session.expiresAt.getTime();
  const canReward =
    !isExpired &&
    tapCount >= session.targetTaps &&
    dailyState.tapRewardsEarned < ACTIVITY_TAP_DAILY_REWARD_LIMIT;
  const rewardEarned = canReward ? ACTIVITY_TAP_REWARD_POINTS : 0;
  const nextStatus = isExpired && rewardEarned === 0 ? "expired" : "completed";

  await Promise.all([
    collection.updateOne(
      {
        sessionId: session.sessionId,
      },
      {
        $set: {
          completedAt: now,
          rewardedPoints: rewardEarned,
          status: nextStatus,
          tapCount,
          updatedAt: now,
        },
      },
    ),
    (async () => {
      const dailyStatesCollection = await getActivityDailyStatesCollection();
      const updateOperation: {
        $inc?: { tapRewardsEarned: number };
        $max: { bestTapCount: number };
        $set: { updatedAt: Date };
      } = {
        $max: {
          bestTapCount: tapCount,
        },
        $set: {
          updatedAt: now,
        },
      };

      if (rewardEarned > 0) {
        updateOperation.$inc = { tapRewardsEarned: 1 };
      }

      await dailyStatesCollection.updateOne(
        {
          dateKey,
          memberEmail: member.email,
        },
        updateOperation,
      );
    })(),
  ]);

  if (rewardEarned > 0) {
    const sourceId = `tap-session:${session.sessionId}`;

    await awardActivityPoints({
      dateKey,
      memberEmail: member.email,
      points: ACTIVITY_TAP_REWARD_POINTS,
      sourceId,
      sourceType: "tap_challenge",
    });
    await awardTeamBonuses({
      dateKey,
      member,
      originSourceId: `team-bonus:${sourceId}:${member.email}`,
    });
  }

  const updatedSession = await collection.findOne({
    memberEmail: member.email,
    sessionId: session.sessionId,
  });

  if (!updatedSession) {
    throw new Error("Tap session update failed.");
  }

  return {
    rewardEarned,
    session: serializeActivityTapSession(updatedSession),
    summary: await getActivitySummaryForMember(member),
  };
}
