import "server-only";

import type { FanletterNewsReportDocument } from "@/lib/content";
import {
  FANLETTER_NEWS_REPORT_SOURCE_REVEAL_UNLOCK_REWARD_POINTS,
  FANLETTER_NEWS_REPORT_SOURCE_REVEAL_VOTE_REWARD_POINTS,
  getFanletterNewsReporterIncentiveStats,
  type FanletterNewsReporterIncentiveReportStats,
} from "@/lib/fanletter-news-reporter-incentives";
import {
  getFanletterNewsReportsForMember,
  type FanletterNewsReporterMember,
} from "@/lib/fanletter-news-report-service";
import type { Locale } from "@/lib/i18n";
import { normalizeEmail } from "@/lib/member";
import {
  getFanletterNewsReportsCollection,
  getPointLedgerCollection,
} from "@/lib/mongodb";
import { serializePointLedger } from "@/lib/points";

export type FanletterNewsReporterRewardCategory = "unlock" | "vote";

export type FanletterNewsReporterRewardLedgerItem = {
  awardedAt: string;
  category: FanletterNewsReporterRewardCategory;
  ledgerEntryId: string;
  participantLabel: string | null;
  points: number;
  reportId: string;
  reportTitle: string;
};

export type FanletterNewsReporterRewardReportItem =
  FanletterNewsReporterIncentiveReportStats & {
    contentId: string;
    coverImageUrl: string | null;
    creatorName: string;
    publishedAt: string;
    reportId: string;
    title: string;
  };

export type FanletterNewsReporterRewardsOverview =
  FanletterNewsReporterIncentiveReportStats & {
    reportCount: number;
    sourceRevealUnlockRewardCount: number;
    sourceRevealVoteRewardCount: number;
    unlockRewardPoints: number;
    voteRewardPoints: number;
  };

export type FanletterNewsReporterRewardsSummary = {
  ledger: FanletterNewsReporterRewardLedgerItem[];
  member: FanletterNewsReporterMember | null;
  overview: FanletterNewsReporterRewardsOverview;
  reports: FanletterNewsReporterRewardReportItem[];
};

const REPORTER_REWARD_SOURCE_ID_PATTERN =
  /^fanletter-news:source-reveal-(vote|unlock):([^:]+):(.+)$/;
const REPORTER_REWARD_SOURCE_ID_QUERY =
  "^fanletter-news:source-reveal-(vote|unlock):";

function createEmptyOverview(): FanletterNewsReporterRewardsOverview {
  return {
    paidUnlockPurchaseCount: 0,
    paidUnlockRevenueUsdt: 0,
    reportCount: 0,
    rewardPoints: 0,
    sourceRevealUnlockContributionCount: 0,
    sourceRevealUnlockRewardCount: 0,
    sourceRevealVoteCount: 0,
    sourceRevealVoteRewardCount: 0,
    unlockRewardPoints: 0,
    voteRewardPoints: 0,
  };
}

function parseReporterRewardSourceId(sourceId: string | null | undefined) {
  const match = sourceId?.match(REPORTER_REWARD_SOURCE_ID_PATTERN);

  if (!match) {
    return null;
  }

  const category: FanletterNewsReporterRewardCategory =
    match[1] === "unlock" ? "unlock" : "vote";
  const reportId = match[2]?.trim();

  if (!reportId) {
    return null;
  }

  return {
    category,
    reportId,
    sourceMemberEmail: normalizeEmail(match[3] ?? ""),
  };
}

function maskParticipantEmail(email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email ?? "");

  if (!normalizedEmail) {
    return null;
  }

  const [name, domain] = normalizedEmail.split("@");

  if (!domain) {
    return null;
  }

  const visibleName = name.slice(0, Math.min(2, name.length));

  return `${visibleName}${name.length > 2 ? "***" : "*"}@${domain}`;
}

function getReportPublishedAt(report: FanletterNewsReportDocument) {
  return report.sourcePublishedAt ?? report.createdAt;
}

function createReportItem(
  report: FanletterNewsReportDocument,
  stats: FanletterNewsReporterIncentiveReportStats | undefined,
): FanletterNewsReporterRewardReportItem {
  return {
    contentId: report.contentId,
    coverImageUrl: report.coverImageUrl ?? null,
    creatorName: report.creatorName,
    paidUnlockPurchaseCount: stats?.paidUnlockPurchaseCount ?? 0,
    paidUnlockRevenueUsdt: stats?.paidUnlockRevenueUsdt ?? 0,
    publishedAt: getReportPublishedAt(report).toISOString(),
    reportId: report.reportId,
    rewardPoints: stats?.rewardPoints ?? 0,
    sourceRevealUnlockContributionCount:
      stats?.sourceRevealUnlockContributionCount ?? 0,
    sourceRevealVoteCount: stats?.sourceRevealVoteCount ?? 0,
    title: report.title,
  };
}

function compareReportItems(
  a: FanletterNewsReporterRewardReportItem,
  b: FanletterNewsReporterRewardReportItem,
) {
  if (b.rewardPoints !== a.rewardPoints) {
    return b.rewardPoints - a.rewardPoints;
  }

  if (b.sourceRevealVoteCount !== a.sourceRevealVoteCount) {
    return b.sourceRevealVoteCount - a.sourceRevealVoteCount;
  }

  return (
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

function getRewardTotal(
  totals: Map<
    FanletterNewsReporterRewardCategory,
    { awardCount: number; rewardPoints: number }
  >,
  category: FanletterNewsReporterRewardCategory,
) {
  return (
    totals.get(category) ?? {
      awardCount: 0,
      rewardPoints: 0,
    }
  );
}

export async function getFanletterNewsReporterRewardsSummary({
  email,
  ledgerLimit = 50,
  locale,
}: {
  email?: string | null;
  ledgerLimit?: number;
  locale: Locale;
}): Promise<FanletterNewsReporterRewardsSummary> {
  const reporterData = await getFanletterNewsReportsForMember({
    email,
    limit: 100,
    locale,
  });
  const member = reporterData.member;

  if (!member) {
    return {
      ledger: [],
      member: null,
      overview: createEmptyOverview(),
      reports: [],
    };
  }

  const normalizedEmail = normalizeEmail(member.email);
  const pointLedgerCollection = normalizedEmail
    ? await getPointLedgerCollection()
    : null;
  const [incentiveStats, ledgerEntries, rewardTotalRows] = await Promise.all([
    getFanletterNewsReporterIncentiveStats({
      reporterReferralCode: member.referralCode,
    }),
    pointLedgerCollection
      ? pointLedgerCollection
          .find({
            memberEmail: normalizedEmail,
            sourceId: { $regex: REPORTER_REWARD_SOURCE_ID_QUERY },
            sourceType: "bonus",
          })
          .sort({ createdAt: -1, ledgerEntryId: -1 })
          .limit(Math.max(1, Math.min(Math.floor(ledgerLimit), 100)))
          .toArray()
      : Promise.resolve([]),
    pointLedgerCollection
      ? pointLedgerCollection
          .aggregate<{
            _id: FanletterNewsReporterRewardCategory;
            awardCount: number;
            rewardPoints: number;
          }>([
            {
              $match: {
                memberEmail: normalizedEmail,
                sourceId: { $regex: REPORTER_REWARD_SOURCE_ID_QUERY },
                sourceType: "bonus",
              },
            },
            {
              $project: {
                category: {
                  $cond: [
                    {
                      $regexMatch: {
                        input: "$sourceId",
                        regex: "^fanletter-news:source-reveal-unlock:",
                      },
                    },
                    "unlock",
                    "vote",
                  ],
                },
                delta: 1,
              },
            },
            {
              $group: {
                _id: "$category",
                awardCount: { $sum: 1 },
                rewardPoints: { $sum: "$delta" },
              },
            },
          ])
          .toArray()
      : Promise.resolve([]),
  ]);
  const rewardTotals = new Map(
    rewardTotalRows.map((row) => [
      row._id,
      {
        awardCount: row.awardCount,
        rewardPoints: row.rewardPoints,
      },
    ]),
  );
  const parsedLedger = ledgerEntries
    .map((entry) => {
      const serializedEntry = serializePointLedger(entry);
      const parsedSource = parseReporterRewardSourceId(
        serializedEntry.sourceId,
      );

      if (!parsedSource) {
        return null;
      }

      return {
        entry: serializedEntry,
        parsedSource,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const reportIdsToFetch = [
    ...new Set([
      ...reporterData.reports.map((report) => report.reportId),
      ...Array.from(incentiveStats.reports.keys()),
      ...parsedLedger.map((item) => item.parsedSource.reportId),
    ]),
  ];
  const reportsCollection = await getFanletterNewsReportsCollection();
  const fetchedReports =
    reportIdsToFetch.length > 0
      ? await reportsCollection
          .find({
            reporterReferralCode: member.referralCode,
            reportId: { $in: reportIdsToFetch },
            status: "published",
          })
          .limit(reportIdsToFetch.length)
          .toArray()
      : [];
  const reportsById = new Map(
    [...reporterData.reports, ...fetchedReports].map(
      (report) => [report.reportId, report] as const,
    ),
  );
  const reports = Array.from(reportsById.values())
    .map((report) =>
      createReportItem(report, incentiveStats.reports.get(report.reportId)),
    )
    .sort(compareReportItems);
  const ledger = parsedLedger.map(({ entry, parsedSource }) => {
    const report = reportsById.get(parsedSource.reportId);

    return {
      awardedAt: entry.createdAt,
      category: parsedSource.category,
      ledgerEntryId: entry.ledgerEntryId,
      participantLabel: maskParticipantEmail(parsedSource.sourceMemberEmail),
      points: entry.delta,
      reportId: parsedSource.reportId,
      reportTitle: report?.title ?? parsedSource.reportId,
    };
  });
  const unlockRewardTotal = getRewardTotal(rewardTotals, "unlock");
  const voteRewardTotal = getRewardTotal(rewardTotals, "vote");
  const ledgerRewardPoints =
    unlockRewardTotal.rewardPoints + voteRewardTotal.rewardPoints;
  const fallbackUnlockRewardPoints =
    incentiveStats.overview.sourceRevealUnlockContributionCount *
    FANLETTER_NEWS_REPORT_SOURCE_REVEAL_UNLOCK_REWARD_POINTS;
  const unlockRewardPoints =
    ledgerRewardPoints > 0
      ? unlockRewardTotal.rewardPoints
      : fallbackUnlockRewardPoints;
  const rewardPoints =
    ledgerRewardPoints > 0
      ? ledgerRewardPoints
      : incentiveStats.overview.rewardPoints;
  const voteRewardPoints =
    ledgerRewardPoints > 0
      ? voteRewardTotal.rewardPoints
      : Math.max(0, rewardPoints - unlockRewardPoints);
  const overview = {
    ...incentiveStats.overview,
    rewardPoints,
    reportCount: reporterData.maturityCounts.all,
    sourceRevealUnlockRewardCount:
      unlockRewardTotal.awardCount ||
      Math.floor(
        unlockRewardPoints /
          FANLETTER_NEWS_REPORT_SOURCE_REVEAL_UNLOCK_REWARD_POINTS,
      ),
    sourceRevealVoteRewardCount:
      voteRewardTotal.awardCount ||
      Math.floor(
        voteRewardPoints / FANLETTER_NEWS_REPORT_SOURCE_REVEAL_VOTE_REWARD_POINTS,
      ),
    unlockRewardPoints,
    voteRewardPoints,
  };

  return {
    ledger,
    member,
    overview,
    reports,
  };
}
