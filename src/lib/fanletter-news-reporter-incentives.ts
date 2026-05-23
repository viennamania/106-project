import "server-only";

import type {
  ContentSocialResponse,
  FanletterNewsReportDocument,
} from "@/lib/content";
import { FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD } from "@/lib/fanletter-news-source-reveal";
import { normalizeEmail, normalizeReferralCode } from "@/lib/member";
import {
  getContentSocialActionsCollection,
  getMembersCollection,
} from "@/lib/mongodb";
import { awardBonusPointsForMember } from "@/lib/points-service";

export const FANLETTER_NEWS_REPORT_SOURCE_REVEAL_VOTE_REWARD_POINTS = 10;
export const FANLETTER_NEWS_REPORT_SOURCE_REVEAL_UNLOCK_REWARD_POINTS = 40;

export type FanletterNewsReporterIncentiveReportStats = {
  rewardPoints: number;
  sourceRevealUnlockContributionCount: number;
  sourceRevealVoteCount: number;
};

export type FanletterNewsReporterIncentiveStats = {
  overview: FanletterNewsReporterIncentiveReportStats;
  reports: Map<string, FanletterNewsReporterIncentiveReportStats>;
};

function emptyStats(): FanletterNewsReporterIncentiveReportStats {
  return {
    rewardPoints: 0,
    sourceRevealUnlockContributionCount: 0,
    sourceRevealVoteCount: 0,
  };
}

function getSourceRevealVoteRewardSourceId({
  reportId,
  viewerEmail,
}: {
  reportId: string;
  viewerEmail: string;
}) {
  return `fanletter-news:source-reveal-vote:${reportId}:${viewerEmail}`;
}

function getSourceRevealUnlockRewardSourceId({
  reportId,
  viewerEmail,
}: {
  reportId: string;
  viewerEmail: string;
}) {
  return `fanletter-news:source-reveal-unlock:${reportId}:${viewerEmail}`;
}

async function getCompletedReporterMembersByReferralCodes(
  referralCodes: string[],
) {
  const normalizedCodes = [
    ...new Set(
      referralCodes
        .map(normalizeReferralCode)
        .filter((code): code is string => Boolean(code)),
    ),
  ];
  const membersByReferralCode = new Map<
    string,
    { email: string; referralCode: string }
  >();

  if (normalizedCodes.length === 0) {
    return membersByReferralCode;
  }

  const members = await (await getMembersCollection())
    .find(
      {
        referralCode: { $in: normalizedCodes },
        status: "completed",
      },
      {
        projection: {
          email: 1,
          referralCode: 1,
        },
      },
    )
    .toArray();

  for (const member of members) {
    const referralCode = normalizeReferralCode(member.referralCode);

    if (referralCode && member.email) {
      membersByReferralCode.set(referralCode, {
        email: member.email,
        referralCode,
      });
    }
  }

  return membersByReferralCode;
}

async function getCompletedReporterMemberByReferralCode(
  referralCode: string | null | undefined,
) {
  const normalizedReferralCode = normalizeReferralCode(referralCode);

  if (!normalizedReferralCode) {
    return null;
  }

  return (
    (await getCompletedReporterMembersByReferralCodes([normalizedReferralCode])).get(
      normalizedReferralCode,
    ) ?? null
  );
}

async function awardReporterVoteReward({
  actionMemberEmail,
  report,
  reporterEmail,
  viewerEmail,
}: {
  actionMemberEmail: string;
  report: FanletterNewsReportDocument;
  reporterEmail: string;
  viewerEmail: string;
}) {
  const normalizedReporterEmail = normalizeEmail(reporterEmail);
  const normalizedViewerEmail = normalizeEmail(viewerEmail);

  if (
    !normalizedReporterEmail ||
    !normalizedViewerEmail ||
    normalizedReporterEmail === normalizedViewerEmail
  ) {
    return 0;
  }

  const sourceId = getSourceRevealVoteRewardSourceId({
    reportId: report.reportId,
    viewerEmail: normalizedViewerEmail,
  });

  await awardBonusPointsForMember({
    ledgerEntryId: `${normalizedReporterEmail}:${sourceId}`,
    memberEmail: normalizedReporterEmail,
    memo: `FanLetter News source reveal vote · ${report.reportId}`,
    points: FANLETTER_NEWS_REPORT_SOURCE_REVEAL_VOTE_REWARD_POINTS,
    sourceId,
    sourceMemberEmail: normalizedViewerEmail,
  });

  await (await getContentSocialActionsCollection()).updateOne(
    {
      contentId: report.contentId,
      memberEmail: actionMemberEmail,
      sourceRevealRequested: true,
    },
    {
      $set: {
        sourceRevealReporterEmail: normalizedReporterEmail,
        sourceRevealReporterVoteRewardedAt: new Date(),
        sourceRevealReporterVoteRewardPoints:
          FANLETTER_NEWS_REPORT_SOURCE_REVEAL_VOTE_REWARD_POINTS,
      },
    },
  );

  return FANLETTER_NEWS_REPORT_SOURCE_REVEAL_VOTE_REWARD_POINTS;
}

async function awardReporterUnlockRewards({
  contentId,
  viewerEmail,
}: {
  contentId: string;
  viewerEmail: string;
}) {
  const normalizedViewerEmail = normalizeEmail(viewerEmail);

  if (!normalizedViewerEmail) {
    return;
  }

  const socialActionsCollection = await getContentSocialActionsCollection();
  const attributedActions = await socialActionsCollection
    .find({
      contentId,
      sourceRevealReportId: { $type: "string" },
      sourceRevealReporterReferralCode: { $type: "string" },
      sourceRevealRequested: true,
    })
    .sort({ sourceRevealRequestedAt: 1, createdAt: 1 })
    .limit(FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD)
    .toArray();
  const reporterMembersByReferralCode =
    await getCompletedReporterMembersByReferralCodes(
      attributedActions
        .map((action) => action.sourceRevealReporterReferralCode)
        .filter((code): code is string => Boolean(code)),
    );

  await Promise.all(
    attributedActions.map(async (action) => {
      const reportId = action.sourceRevealReportId?.trim();
      const reporterReferralCode = normalizeReferralCode(
        action.sourceRevealReporterReferralCode,
      );
      const reporterMember = reporterReferralCode
        ? reporterMembersByReferralCode.get(reporterReferralCode)
        : null;

      if (!reportId || !reporterMember) {
        return;
      }

      const normalizedActionMemberEmail = normalizeEmail(action.memberEmail);

      if (
        !normalizedActionMemberEmail ||
        reporterMember.email === normalizedActionMemberEmail
      ) {
        return;
      }

      const sourceId = getSourceRevealUnlockRewardSourceId({
        reportId,
        viewerEmail: normalizedActionMemberEmail,
      });

      await awardBonusPointsForMember({
        ledgerEntryId: `${reporterMember.email}:${sourceId}`,
        memberEmail: reporterMember.email,
        memo: `FanLetter News source reveal unlock · ${reportId}`,
        points: FANLETTER_NEWS_REPORT_SOURCE_REVEAL_UNLOCK_REWARD_POINTS,
        sourceId,
        sourceMemberEmail: normalizedActionMemberEmail,
      });

      await socialActionsCollection.updateOne(
        {
          contentId: action.contentId,
          memberEmail: action.memberEmail,
          sourceRevealRequested: true,
        },
        {
          $set: {
            sourceRevealReporterEmail: reporterMember.email,
            sourceRevealReporterUnlockRewardedAt: new Date(),
            sourceRevealReporterUnlockRewardPoints:
              FANLETTER_NEWS_REPORT_SOURCE_REVEAL_UNLOCK_REWARD_POINTS,
          },
        },
      );
    }),
  );
}

export async function awardFanletterNewsSourceRevealReporterIncentives({
  report,
  response,
  viewerEmail,
}: {
  report: FanletterNewsReportDocument;
  response: ContentSocialResponse;
  viewerEmail: string;
}) {
  if (!response.sourceRevealNewlyRequested) {
    return;
  }

  const normalizedViewerEmail = normalizeEmail(viewerEmail);

  if (!normalizedViewerEmail) {
    return;
  }

  const previousCount = Math.max(0, response.sourceRevealPreviousCount ?? 0);

  if (previousCount >= FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD) {
    return;
  }

  const reporterMember = await getCompletedReporterMemberByReferralCode(
    report.reporterReferralCode,
  );

  if (reporterMember) {
    await awardReporterVoteReward({
      actionMemberEmail: normalizedViewerEmail,
      report,
      reporterEmail: reporterMember.email,
      viewerEmail: normalizedViewerEmail,
    });
  }

  const currentCount = Math.max(0, response.social.sourceRevealCount);
  const unlockedByThisRequest =
    previousCount < FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD &&
    currentCount >= FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD;

  if (unlockedByThisRequest) {
    await awardReporterUnlockRewards({
      contentId: report.contentId,
      viewerEmail: normalizedViewerEmail,
    });
  }
}

export async function getFanletterNewsReporterIncentiveStats({
  reporterReferralCode,
  reportIds,
}: {
  reporterReferralCode?: string | null;
  reportIds?: string[];
}): Promise<FanletterNewsReporterIncentiveStats> {
  const normalizedReporterReferralCode =
    normalizeReferralCode(reporterReferralCode);
  const normalizedReportIds = [
    ...new Set(
      (reportIds ?? [])
        .map((reportId) => reportId.trim())
        .filter(Boolean),
    ),
  ];
  const reports = new Map<string, FanletterNewsReporterIncentiveReportStats>();

  for (const reportId of normalizedReportIds) {
    reports.set(reportId, emptyStats());
  }

  if (!normalizedReporterReferralCode) {
    return {
      overview: emptyStats(),
      reports,
    };
  }

  const match: Record<string, unknown> = {
    sourceRevealReporterReferralCode: normalizedReporterReferralCode,
    sourceRevealRequested: true,
  };

  if (normalizedReportIds.length > 0) {
    match.sourceRevealReportId = { $in: normalizedReportIds };
  }

  const rows = await (await getContentSocialActionsCollection())
    .aggregate<{
      _id: string;
      rewardPoints: number;
      sourceRevealUnlockContributionCount: number;
      sourceRevealVoteCount: number;
    }>([
      {
        $match: match,
      },
      {
        $group: {
          _id: "$sourceRevealReportId",
          rewardPoints: {
            $sum: {
              $add: [
                { $ifNull: ["$sourceRevealReporterVoteRewardPoints", 0] },
                { $ifNull: ["$sourceRevealReporterUnlockRewardPoints", 0] },
              ],
            },
          },
          sourceRevealUnlockContributionCount: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    { $ifNull: ["$sourceRevealReporterUnlockRewardPoints", 0] },
                    0,
                  ],
                },
                1,
                0,
              ],
            },
          },
          sourceRevealVoteCount: { $sum: 1 },
        },
      },
    ])
    .toArray();
  const overview = emptyStats();

  for (const row of rows) {
    if (!row._id) {
      continue;
    }

    const stats = {
      rewardPoints: row.rewardPoints,
      sourceRevealUnlockContributionCount:
        row.sourceRevealUnlockContributionCount,
      sourceRevealVoteCount: row.sourceRevealVoteCount,
    };

    reports.set(row._id, stats);
    overview.rewardPoints += stats.rewardPoints;
    overview.sourceRevealUnlockContributionCount +=
      stats.sourceRevealUnlockContributionCount;
    overview.sourceRevealVoteCount += stats.sourceRevealVoteCount;
  }

  return {
    overview,
    reports,
  };
}
