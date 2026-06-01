import "server-only";

import type {
  ContentPostDocument,
  FanletterNewsReportDocument,
} from "@/lib/content";
import { FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD } from "@/lib/fanletter-news-source-reveal";
import {
  getFanletterNewsReporterRewardsSummary,
  type FanletterNewsReporterRewardsSummary,
} from "@/lib/fanletter-news-reporter-rewards";
import type { Locale } from "@/lib/i18n";
import { normalizeEmail } from "@/lib/member";
import {
  getContentPostsCollection,
  getContentSocialActionsCollection,
  getFanletterNewsReportsCollection,
  getPointLedgerCollection,
} from "@/lib/mongodb";
import { serializePointLedger } from "@/lib/points";

export type FanletterNewsMemberFanRewardStatus =
  | "awarded"
  | "closed"
  | "pending";

export type FanletterNewsMemberFanRewardItem = {
  contentId: string;
  coverImageUrl: string | null;
  creatorName: string;
  ledgerEntryId: string | null;
  points: number;
  reportId: string | null;
  reportTitle: string | null;
  requestedAt: string | null;
  rewardedAt: string | null;
  sourceRevealCount: number;
  status: FanletterNewsMemberFanRewardStatus;
  threshold: number;
  title: string;
};

export type FanletterNewsMemberRewardsOverview = {
  fanParticipationCount: number;
  fanRewardCount: number;
  fanRewardPoints: number;
  pendingFanRewardCount: number;
  reporterRewardPoints: number;
  totalRewardPoints: number;
};

export type FanletterNewsMemberRewardsSummary = {
  fanRewards: FanletterNewsMemberFanRewardItem[];
  overview: FanletterNewsMemberRewardsOverview;
  reporterRewards: FanletterNewsReporterRewardsSummary;
};

const FAN_REWARD_SOURCE_ID_PATTERN =
  /^fanletter-news:source-reveal-fan-unlock:([^:]+):(.+)$/;
const FAN_REWARD_SOURCE_ID_QUERY =
  "^fanletter-news:source-reveal-fan-unlock:";

function trimText(value: string | null | undefined, limit: number) {
  const trimmed = value?.trim() ?? "";

  if (trimmed.length <= limit) {
    return trimmed;
  }

  return `${trimmed.slice(0, Math.max(0, limit - 1)).trim()}…`;
}

function parseFanRewardSourceId(sourceId: string | null | undefined) {
  const match = sourceId?.match(FAN_REWARD_SOURCE_ID_PATTERN);

  if (!match) {
    return null;
  }

  const contentId = match[1]?.trim();
  const viewerEmail = normalizeEmail(match[2] ?? "");

  if (!contentId || !viewerEmail) {
    return null;
  }

  return {
    contentId,
    viewerEmail,
  };
}

function getPostTitle(post: ContentPostDocument | undefined, contentId: string) {
  return trimText(post?.title, 120) || contentId;
}

function getPostCreatorName(post: ContentPostDocument | undefined) {
  return (
    trimText(post?.authorReferralCode, 32) ||
    trimText(post?.authorEmail?.split("@")[0], 32) ||
    "FanLetter"
  );
}

function getReportTitle(report: FanletterNewsReportDocument | undefined) {
  return report ? trimText(report.title || report.sourceTitle, 120) : null;
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.toISOString();
}

function createEmptyOverview(
  reporterRewards: FanletterNewsReporterRewardsSummary,
): FanletterNewsMemberRewardsOverview {
  const reporterRewardPoints = reporterRewards.overview.rewardPoints;

  return {
    fanParticipationCount: 0,
    fanRewardCount: 0,
    fanRewardPoints: 0,
    pendingFanRewardCount: 0,
    reporterRewardPoints,
    totalRewardPoints: reporterRewardPoints,
  };
}

export async function getFanletterNewsMemberRewardsSummary({
  email,
  fanRewardLimit = 60,
  locale,
}: {
  email?: string | null;
  fanRewardLimit?: number;
  locale: Locale;
}): Promise<FanletterNewsMemberRewardsSummary> {
  const normalizedEmail = normalizeEmail(email ?? "");
  const reporterRewards = await getFanletterNewsReporterRewardsSummary({
    email: normalizedEmail,
    locale,
  });

  if (!normalizedEmail) {
    return {
      fanRewards: [],
      overview: createEmptyOverview(reporterRewards),
      reporterRewards,
    };
  }

  const safeLimit = Math.max(1, Math.min(Math.floor(fanRewardLimit), 100));
  const [
    pointLedgerCollection,
    socialActionsCollection,
    postsCollection,
    reportsCollection,
  ] = await Promise.all([
    getPointLedgerCollection(),
    getContentSocialActionsCollection(),
    getContentPostsCollection(),
    getFanletterNewsReportsCollection(),
  ]);
  const fanRewardFilter = {
    memberEmail: normalizedEmail,
    sourceId: { $regex: FAN_REWARD_SOURCE_ID_QUERY },
    sourceType: "bonus" as const,
  };
  const [ledgerEntries, fanRewardTotals, participationCount, participationActions] =
    await Promise.all([
      pointLedgerCollection
        .find(fanRewardFilter)
        .sort({ createdAt: -1, ledgerEntryId: -1 })
        .limit(safeLimit)
        .toArray(),
      pointLedgerCollection
        .aggregate<{
          _id: null;
          rewardCount: number;
          rewardPoints: number;
        }>([
          {
            $match: fanRewardFilter,
          },
          {
            $group: {
              _id: null,
              rewardCount: { $sum: 1 },
              rewardPoints: { $sum: "$delta" },
            },
          },
        ])
        .toArray(),
      socialActionsCollection.countDocuments({
        memberEmail: normalizedEmail,
        sourceRevealRequested: true,
      }),
      socialActionsCollection
        .find({
          memberEmail: normalizedEmail,
          sourceRevealRequested: true,
        })
        .sort({ sourceRevealRequestedAt: -1, updatedAt: -1, createdAt: -1 })
        .limit(safeLimit)
        .toArray(),
    ]);
  const serializedLedgerItems = ledgerEntries
    .map((entry) => {
      const serialized = serializePointLedger(entry);
      const parsedSource = parseFanRewardSourceId(serialized.sourceId);

      if (!parsedSource) {
        return null;
      }

      return {
        parsedSource,
        serialized,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const contentIds = [
    ...new Set([
      ...participationActions.map((action) => action.contentId),
      ...serializedLedgerItems.map((item) => item.parsedSource.contentId),
    ]),
  ].filter(Boolean);
  const reportIds = [
    ...new Set(
      participationActions
        .map((action) => action.sourceRevealReportId?.trim())
        .filter((reportId): reportId is string => Boolean(reportId)),
    ),
  ];
  const [posts, sourceRevealCountRows, reports] = await Promise.all([
    contentIds.length > 0
      ? postsCollection
          .find({
            contentId: { $in: contentIds },
          })
          .limit(contentIds.length)
          .toArray()
      : Promise.resolve([]),
    contentIds.length > 0
      ? socialActionsCollection
          .aggregate<{
            _id: string;
            count: number;
          }>([
            {
              $match: {
                contentId: { $in: contentIds },
                sourceRevealRequested: true,
              },
            },
            {
              $group: {
                _id: "$contentId",
                count: { $sum: 1 },
              },
            },
          ])
          .toArray()
      : Promise.resolve([]),
    reportIds.length > 0
      ? reportsCollection
          .find({
            reportId: { $in: reportIds },
            status: "published",
          })
          .limit(reportIds.length)
          .toArray()
      : Promise.resolve([]),
  ]);
  const postByContentId = new Map(
    posts.map((post) => [post.contentId, post] as const),
  );
  const reportById = new Map(
    reports.map((report) => [report.reportId, report] as const),
  );
  const sourceRevealCountByContentId = new Map(
    sourceRevealCountRows.map((row) => [row._id, row.count] as const),
  );
  const ledgerByContentId = new Map(
    serializedLedgerItems.map((item) => [
      item.parsedSource.contentId,
      item.serialized,
    ]),
  );
  const actionByContentId = new Map(
    participationActions.map((action) => [action.contentId, action] as const),
  );
  const rewardContentIds = serializedLedgerItems.map(
    (item) => item.parsedSource.contentId,
  );
  const orderedContentIds = [
    ...new Set([
      ...participationActions.map((action) => action.contentId),
      ...rewardContentIds,
    ]),
  ];
  const fanRewards = orderedContentIds.map((contentId) => {
    const action = actionByContentId.get(contentId);
    const ledgerEntry = ledgerByContentId.get(contentId);
    const post = postByContentId.get(contentId);
    const reportId = action?.sourceRevealReportId?.trim() || null;
    const report = reportId ? reportById.get(reportId) : undefined;
    const sourceRevealCount = sourceRevealCountByContentId.get(contentId) ?? 0;
    const fallbackRewardPoints =
      action?.sourceRevealFanUnlockRewardPoints &&
      action.sourceRevealFanUnlockRewardPoints > 0
        ? action.sourceRevealFanUnlockRewardPoints
        : 0;
    const rewardPoints = Math.max(0, ledgerEntry?.delta ?? fallbackRewardPoints);
    const rewardedAt =
      ledgerEntry?.createdAt ?? toIsoString(action?.sourceRevealFanUnlockRewardedAt);
    const status: FanletterNewsMemberFanRewardStatus =
      rewardPoints > 0
        ? "awarded"
        : sourceRevealCount >= FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD
          ? "closed"
          : "pending";

    return {
      contentId,
      coverImageUrl: post?.coverImageUrl ?? null,
      creatorName: getPostCreatorName(post),
      ledgerEntryId: ledgerEntry?.ledgerEntryId ?? null,
      points: rewardPoints,
      reportId,
      reportTitle: getReportTitle(report),
      requestedAt: toIsoString(
        action?.sourceRevealRequestedAt ?? action?.updatedAt ?? action?.createdAt,
      ),
      rewardedAt,
      sourceRevealCount,
      status,
      threshold: FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD,
      title: getPostTitle(post, contentId),
    };
  });
  const fanRewardSummary = fanRewardTotals[0] ?? {
    rewardCount: 0,
    rewardPoints: 0,
  };
  const fanRewardPoints = Math.max(0, fanRewardSummary.rewardPoints);
  const reporterRewardPoints = reporterRewards.overview.rewardPoints;
  const overview: FanletterNewsMemberRewardsOverview = {
    fanParticipationCount: participationCount,
    fanRewardCount: fanRewardSummary.rewardCount,
    fanRewardPoints,
    pendingFanRewardCount: fanRewards.filter((item) => item.status === "pending")
      .length,
    reporterRewardPoints,
    totalRewardPoints: fanRewardPoints + reporterRewardPoints,
  };

  return {
    fanRewards,
    overview,
    reporterRewards,
  };
}
