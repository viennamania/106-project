import type { MemberStatus } from "@/lib/member";

export type FanletterNewsReporterTrustLevel =
  | "active"
  | "leading"
  | "starter"
  | "trusted";

export type FanletterNewsReporterTrustProfile = {
  level: FanletterNewsReporterTrustLevel;
  nextLevel: FanletterNewsReporterTrustLevel | null;
  pointsToNextLevel: number;
  progressPercent: number;
  score: number;
};

const FANLETTER_NEWS_REPORTER_TRUST_THRESHOLDS: Array<{
  level: FanletterNewsReporterTrustLevel;
  minimumScore: number;
}> = [
  { level: "starter", minimumScore: 0 },
  { level: "active", minimumScore: 25 },
  { level: "trusted", minimumScore: 50 },
  { level: "leading", minimumScore: 75 },
];

function clampScore(value: number, max: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(Math.floor(value), max));
}

function getRecentActivityScore({
  latestReportAt,
  now,
}: {
  latestReportAt?: Date | null;
  now: Date;
}) {
  if (!latestReportAt) {
    return 0;
  }

  const diffMs = now.getTime() - latestReportAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 30) {
    return 4;
  }

  return diffDays <= 90 ? 2 : 0;
}

export function getFanletterNewsReporterTrustProfile({
  latestReportAt = null,
  now = new Date(),
  reportCount,
  rewardPoints,
  sourceRevealUnlockContributionCount,
  sourceRevealVoteCount,
  status,
}: {
  latestReportAt?: Date | null;
  now?: Date;
  reportCount: number;
  rewardPoints: number;
  sourceRevealUnlockContributionCount: number;
  sourceRevealVoteCount: number;
  status?: MemberStatus | null;
}): FanletterNewsReporterTrustProfile {
  const score = clampScore(
    clampScore(reportCount * 6, 30) +
      clampScore(sourceRevealVoteCount * 2, 24) +
      clampScore(sourceRevealUnlockContributionCount * 8, 24) +
      clampScore(rewardPoints / 25, 12) +
      (status === "completed" ? 6 : 0) +
      getRecentActivityScore({ latestReportAt, now }),
    100,
  );
  const currentThreshold =
    [...FANLETTER_NEWS_REPORTER_TRUST_THRESHOLDS]
      .reverse()
      .find((threshold) => score >= threshold.minimumScore) ??
    FANLETTER_NEWS_REPORTER_TRUST_THRESHOLDS[0];
  const nextThreshold =
    FANLETTER_NEWS_REPORTER_TRUST_THRESHOLDS.find(
      (threshold) => score < threshold.minimumScore,
    ) ?? null;

  return {
    level: currentThreshold.level,
    nextLevel: nextThreshold?.level ?? null,
    pointsToNextLevel: nextThreshold
      ? Math.max(0, nextThreshold.minimumScore - score)
      : 0,
    progressPercent: nextThreshold
      ? Math.max(
          6,
          Math.min(100, Math.round((score / nextThreshold.minimumScore) * 100)),
        )
      : 100,
    score,
  };
}
