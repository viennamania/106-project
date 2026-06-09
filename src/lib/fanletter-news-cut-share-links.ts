import "server-only";

import { randomUUID } from "node:crypto";

import type { FanletterNewsReportDocument } from "@/lib/content";
import type { FunnelEventName } from "@/lib/funnel";
import {
  getFanletterFanRequestsCollection,
  getContentSocialActionsCollection,
  getFanletterNewsCutShareLinksCollection,
  getFanletterNewsReportsCollection,
  getFunnelEventsCollection,
} from "@/lib/mongodb";
import { normalizeEmail, normalizeReferralCode } from "@/lib/member";
import {
  getPublicCutsFromReport,
  type FanletterNewsPublicCut,
} from "@/lib/fanletter-news-public-cuts";
import type { FanletterCampaignNewsCutRecap } from "@/lib/fanletter-campaign";
import type { SerializedFanletterNewsPublicCutShareRecap } from "@/lib/fanletter-news-public-cuts-shared";
import { normalizeShareId } from "@/lib/share-tracking";

export const FANLETTER_NEWS_CUT_SHARE_MEMO_LIMIT = 120;
export const FANLETTER_NEWS_CUT_SHARE_DASHBOARD_LIMIT = 50;
export const FANLETTER_NEWS_CUT_SHARE_CAMPAIGN_VERSION = 1;
export const FANLETTER_NEWS_CUT_SHARE_CAMPAIGN_REPORT_LIMIT = 3;

export type FanletterNewsCutShareCampaignReport = {
  contentId: string | null;
  coverImageUrl: string | null;
  creatorName: string | null;
  creatorReferralCode: string | null;
  cuts: FanletterNewsPublicCut[];
  reportId: string;
  reporterName: string | null;
  reporterReferralCode: string | null;
  title: string | null;
};

export type FanletterNewsCutShareLinkDocument = {
  campaignReportIds?: string[];
  campaignReports?: FanletterNewsCutShareCampaignReport[];
  campaignSelectedAt?: Date;
  campaignVersion?: number;
  contentId: string | null;
  createdAt: Date;
  creatorReferralCode: string | null;
  cutSlotNumber: number;
  memo: string;
  ownerEmail: string;
  ownerReferralCode: string | null;
  ownerWalletAddress: string | null;
  reportId: string;
  reporterReferralCode: string | null;
  shareId: string;
  targetHref: string;
  updatedAt: Date;
};

export type FanletterNewsCutShareLinkMetrics = {
  averageDwellMs: number;
  cutDwell: FanletterNewsCutShareLinkCutDwellMetric[];
  cutViews: number;
  dwellEvents: number;
  eventCount: number;
  guestEvents: number;
  lastEventAt: string | null;
  loadMoreEvents: number;
  maxDwellMs: number;
  memberEvents: number;
  sourceOpenClicks: number;
  totalDwellMs: number;
};

export type FanletterNewsCutShareLinkCutDwellMetric = {
  averageDwellMs: number;
  cutSlotNumber: number;
  dwellEvents: number;
  maxDwellMs: number;
  totalDwellMs: number;
};

export type FanletterNewsCutShareLinkDashboardItem = {
  contentId: string | null;
  createdAt: string;
  creatorReferralCode: string | null;
  cutSlotNumber: number;
  memo: string;
  metrics: FanletterNewsCutShareLinkMetrics;
  reportId: string;
  reportTitle: string | null;
  reporterName: string | null;
  shareId: string;
  targetHref: string;
};

export type FanletterNewsCutShareLinkCutDetail = FanletterNewsPublicCut & {
  metrics: {
    averageDwellMs: number;
    cutViews: number;
    dwellEvents: number;
    maxDwellMs: number;
    totalDwellMs: number;
  };
};

export type FanletterNewsCutShareLinkFanRequest = {
  body: string;
  createdAt: string;
  requestId: string;
  requesterDisplayName: string | null;
  sourceCutSlotNumber: number | null;
  sourceReportId: string | null;
};

export type FanletterNewsCutShareLinkDetail = FanletterNewsCutShareLinkDashboardItem & {
  campaignReports: FanletterNewsCutShareCampaignReport[];
  cuts: FanletterNewsCutShareLinkCutDetail[];
  creatorName: string | null;
  coverImageUrl: string | null;
  fanRequests: FanletterNewsCutShareLinkFanRequest[];
};

type CreateFanletterNewsCutShareLinkInput = {
  campaignReportIds?: string[];
  campaignReports?: FanletterNewsCutShareCampaignReport[];
  contentId: string | null;
  creatorReferralCode: string | null;
  cutSlotNumber: number;
  memo: string;
  ownerEmail: string;
  ownerReferralCode: string | null;
  ownerWalletAddress: string | null;
  reportId: string;
  reporterReferralCode: string | null;
  shareId?: string | null;
  targetHref: string;
};

type RawMetricsRow = {
  _id: string;
  cutViews?: number;
  dwellEvents?: number;
  eventCount?: number;
  guestEvents?: number;
  lastEventAt?: Date | null;
  loadMoreEvents?: number;
  memberEvents?: number;
  sourceOpenClicks?: number;
};

type RawCutDwellMetricsRow = {
  _id: {
    cutSlotNumber: number;
    shareId: string;
  };
  averageDwellMs?: number;
  dwellEvents?: number;
  maxDwellMs?: number;
  totalDwellMs?: number;
};

type RawCutViewMetricsRow = {
  _id: number;
  cutViews?: number;
};

type CampaignSocialMetricRow = {
  _id: string;
  likedCount?: number;
  savedCount?: number;
  sourceRevealCount?: number;
};

export function createFanletterNewsCutShareId() {
  return `newscut_${Date.now().toString(36)}_${randomUUID()
    .replace(/-/g, "")
    .slice(0, 24)}`;
}

export function normalizeFanletterNewsCutShareMemo(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, FANLETTER_NEWS_CUT_SHARE_MEMO_LIMIT);
}

function normalizeCampaignReportIds(reportIds: readonly string[]) {
  return [
    ...new Set(
      reportIds
        .map((reportId) => reportId.trim().slice(0, 128))
        .filter(Boolean),
    ),
  ].slice(0, FANLETTER_NEWS_CUT_SHARE_CAMPAIGN_REPORT_LIMIT);
}

function createCampaignReportSnapshot(
  report: FanletterNewsReportDocument,
): FanletterNewsCutShareCampaignReport | null {
  const cuts = getPublicCutsFromReport(report);

  if (cuts.length === 0) {
    return null;
  }

  return {
    contentId: report.contentId?.trim() || null,
    coverImageUrl: report.coverImageUrl ?? null,
    creatorName: report.creatorName ?? null,
    creatorReferralCode: normalizeReferralCode(report.creatorReferralCode),
    cuts,
    reportId: report.reportId,
    reporterName: report.reporterName ?? null,
    reporterReferralCode: normalizeReferralCode(report.reporterReferralCode),
    title: report.title ?? null,
  };
}

function getReportContentKey(report: FanletterNewsReportDocument) {
  return report.contentId?.trim() || report.reportId;
}

function scoreCampaignCandidateReport({
  report,
  socialMetrics,
}: {
  report: FanletterNewsReportDocument;
  socialMetrics: CampaignSocialMetricRow | null;
}) {
  const cuts = getPublicCutsFromReport(report);
  const sourcePublishedAtTime =
    report.sourcePublishedAt?.getTime() ?? report.createdAt.getTime();
  const sourceRevealCount = socialMetrics?.sourceRevealCount ?? 0;
  const likedCount = socialMetrics?.likedCount ?? 0;
  const savedCount = socialMetrics?.savedCount ?? 0;

  return (
    cuts.length * 90 +
    sourceRevealCount * 120 +
    likedCount * 28 +
    savedCount * 22 +
    (report.coverImageUrl ? 24 : 0) +
    (Number.isFinite(sourcePublishedAtTime)
      ? sourcePublishedAtTime / 1_000_000
      : 0)
  );
}

async function selectCampaignCandidateReports({
  anchorReport,
  excludeReportIds,
  preferSameCreator,
  remainingLimit,
}: {
  anchorReport: FanletterNewsReportDocument;
  excludeReportIds: Set<string>;
  preferSameCreator: boolean;
  remainingLimit: number;
}) {
  if (remainingLimit <= 0) {
    return [];
  }

  const creatorReferralCode = normalizeReferralCode(
    anchorReport.creatorReferralCode,
  );
  const reportsCollection = await getFanletterNewsReportsCollection();
  const anchorContentId = anchorReport.contentId?.trim();
  const candidates = await reportsCollection
    .find({
      locale: anchorReport.locale,
      reportId: { $nin: Array.from(excludeReportIds) },
      ...(preferSameCreator && creatorReferralCode
        ? { creatorReferralCode }
        : {}),
      ...(preferSameCreator && anchorContentId
        ? { contentId: { $ne: anchorContentId } }
        : {}),
      $or: [
        {
          teaserImages: {
            $elemMatch: {
              imageUrl: { $regex: /\S/ },
              source: "reporter_cropped",
            },
          },
        },
        {
          teaserImageUrls: {
            $elemMatch: { $regex: /\S/ },
          },
        },
      ],
      status: "published",
    })
    .sort({ sourcePublishedAt: -1, createdAt: -1, reportId: 1 })
    .limit(72)
    .toArray();
  const contentIds = [
    ...new Set(
      candidates
        .map((report) => report.contentId?.trim())
        .filter((contentId): contentId is string => Boolean(contentId)),
    ),
  ];
  const socialMetricRows =
    contentIds.length > 0
      ? await (await getContentSocialActionsCollection())
          .aggregate<CampaignSocialMetricRow>([
            { $match: { contentId: { $in: contentIds } } },
            {
              $group: {
                _id: "$contentId",
                likedCount: {
                  $sum: { $cond: [{ $eq: ["$liked", true] }, 1, 0] },
                },
                savedCount: {
                  $sum: { $cond: [{ $eq: ["$saved", true] }, 1, 0] },
                },
                sourceRevealCount: {
                  $sum: {
                    $cond: [
                      { $eq: ["$sourceRevealRequested", true] },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ])
          .toArray()
      : [];
  const socialMetricsByContentId = new Map(
    socialMetricRows.map((row) => [row._id, row]),
  );
  const bestByContent = new Map<
    string,
    { report: FanletterNewsReportDocument; score: number }
  >();

  for (const report of candidates) {
    if (excludeReportIds.has(report.reportId)) {
      continue;
    }

    const cuts = getPublicCutsFromReport(report);

    if (cuts.length === 0) {
      continue;
    }

    const contentKey = getReportContentKey(report);
    const socialMetrics = report.contentId
      ? socialMetricsByContentId.get(report.contentId) ?? null
      : null;
    const score = scoreCampaignCandidateReport({
      report,
      socialMetrics,
    });
    const current = bestByContent.get(contentKey);

    if (!current || score > current.score) {
      bestByContent.set(contentKey, { report, score });
    }
  }

  return Array.from(bestByContent.values())
    .sort((left, right) => {
      const scoreDelta = right.score - left.score;

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      return (
        (right.report.sourcePublishedAt?.getTime() ??
          right.report.createdAt.getTime()) -
        (left.report.sourcePublishedAt?.getTime() ??
          left.report.createdAt.getTime())
      );
    })
    .slice(0, remainingLimit)
    .map((candidate) => candidate.report);
}

export async function createFanletterNewsCutShareCampaignSnapshot({
  anchorReport,
}: {
  anchorReport: FanletterNewsReportDocument;
}) {
  const anchorSnapshot = createCampaignReportSnapshot(anchorReport);

  if (!anchorSnapshot) {
    return {
      campaignReportIds: [anchorReport.reportId],
      campaignReports: [] as FanletterNewsCutShareCampaignReport[],
    };
  }

  const campaignReports: FanletterNewsCutShareCampaignReport[] = [
    anchorSnapshot,
  ];
  const excludeReportIds = new Set([anchorReport.reportId]);
  const sameCreatorReports = await selectCampaignCandidateReports({
    anchorReport,
    excludeReportIds,
    preferSameCreator: true,
    remainingLimit:
      FANLETTER_NEWS_CUT_SHARE_CAMPAIGN_REPORT_LIMIT - campaignReports.length,
  });

  for (const report of sameCreatorReports) {
    const snapshot = createCampaignReportSnapshot(report);

    if (!snapshot || excludeReportIds.has(snapshot.reportId)) {
      continue;
    }

    excludeReportIds.add(snapshot.reportId);
    campaignReports.push(snapshot);
  }

  if (campaignReports.length < FANLETTER_NEWS_CUT_SHARE_CAMPAIGN_REPORT_LIMIT) {
    const fallbackReports = await selectCampaignCandidateReports({
      anchorReport,
      excludeReportIds,
      preferSameCreator: false,
      remainingLimit:
        FANLETTER_NEWS_CUT_SHARE_CAMPAIGN_REPORT_LIMIT -
        campaignReports.length,
    });

    for (const report of fallbackReports) {
      const snapshot = createCampaignReportSnapshot(report);

      if (!snapshot || excludeReportIds.has(snapshot.reportId)) {
        continue;
      }

      excludeReportIds.add(snapshot.reportId);
      campaignReports.push(snapshot);
    }
  }

  return {
    campaignReportIds: normalizeCampaignReportIds(
      campaignReports.map((report) => report.reportId),
    ),
    campaignReports,
  };
}

export async function getFanletterNewsCutShareCampaignReportIds({
  shareId,
}: {
  shareId: string | null;
}) {
  const normalizedShareId = normalizeShareId(shareId);

  if (!normalizedShareId) {
    return [];
  }

  const link = await (await getFanletterNewsCutShareLinksCollection()).findOne(
    { shareId: normalizedShareId },
    { projection: { campaignReportIds: 1, reportId: 1 } },
  );

  if (!link) {
    return [];
  }

  const campaignReportIds = normalizeCampaignReportIds(
    Array.isArray(link.campaignReportIds) ? link.campaignReportIds : [],
  );

  return campaignReportIds.length > 1 ? campaignReportIds : [];
}

export async function createFanletterNewsCutShareLink({
  campaignReportIds = [],
  campaignReports = [],
  contentId,
  creatorReferralCode,
  cutSlotNumber,
  memo,
  ownerEmail,
  ownerReferralCode,
  ownerWalletAddress,
  reporterReferralCode,
  reportId,
  shareId,
  targetHref,
}: CreateFanletterNewsCutShareLinkInput) {
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);
  const normalizedReportId = reportId.trim();
  const normalizedShareId = normalizeShareId(
    shareId ?? createFanletterNewsCutShareId(),
  );

  if (!normalizedOwnerEmail || !normalizedReportId || !normalizedShareId) {
    throw new Error("Invalid share link input.");
  }

  const now = new Date();
  const document: FanletterNewsCutShareLinkDocument = {
    ...(campaignReports.length > 0
      ? {
          campaignReportIds: normalizeCampaignReportIds(campaignReportIds),
          campaignReports,
          campaignSelectedAt: now,
          campaignVersion: FANLETTER_NEWS_CUT_SHARE_CAMPAIGN_VERSION,
        }
      : {}),
    contentId: contentId?.trim() || null,
    createdAt: now,
    creatorReferralCode: normalizeReferralCode(creatorReferralCode),
    cutSlotNumber: Math.max(1, Math.min(4, Math.floor(cutSlotNumber))),
    memo: normalizeFanletterNewsCutShareMemo(memo),
    ownerEmail: normalizedOwnerEmail,
    ownerReferralCode: normalizeReferralCode(ownerReferralCode),
    ownerWalletAddress: ownerWalletAddress?.trim().toLowerCase() || null,
    reporterReferralCode: normalizeReferralCode(reporterReferralCode),
    reportId: normalizedReportId,
    shareId: normalizedShareId,
    targetHref,
    updatedAt: now,
  };
  const collection = await getFanletterNewsCutShareLinksCollection();

  await collection.insertOne(document);

  return document;
}

export async function getFanletterNewsCutShareLinkDashboard({
  ownerEmail,
}: {
  ownerEmail: string;
}) {
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);

  if (!normalizedOwnerEmail) {
    return [];
  }

  const shareLinksCollection = await getFanletterNewsCutShareLinksCollection();
  const links = await shareLinksCollection
    .find({ ownerEmail: normalizedOwnerEmail })
    .sort({ createdAt: -1 })
    .limit(FANLETTER_NEWS_CUT_SHARE_DASHBOARD_LIMIT)
    .toArray();

  if (links.length === 0) {
    return [];
  }

  const shareIds = links.map((link) => link.shareId);
  const reportIds = [...new Set(links.map((link) => link.reportId))];
  const [metricRows, cutDwellRows, reports] = await Promise.all([
    getFunnelEventsCollection().then((collection) =>
      collection
        .aggregate<RawMetricsRow>([
          {
            $match: {
              name: {
                $in: [
                  "fanletter_news_cut_view",
                  "fanletter_news_cut_dwell",
                  "fanletter_news_cut_feed_load_more",
                  "fanletter_news_source_open_click",
                ] satisfies FunnelEventName[],
              },
              shareId: { $in: shareIds },
            },
          },
          {
            $group: {
              _id: "$shareId",
              cutViews: {
                $sum: {
                  $cond: [{ $eq: ["$name", "fanletter_news_cut_view"] }, 1, 0],
                },
              },
              dwellEvents: {
                $sum: {
                  $cond: [{ $eq: ["$name", "fanletter_news_cut_dwell"] }, 1, 0],
                },
              },
              eventCount: { $sum: 1 },
              guestEvents: {
                $sum: {
                  $cond: [{ $eq: ["$viewerType", "guest"] }, 1, 0],
                },
              },
              lastEventAt: { $max: "$createdAt" },
              loadMoreEvents: {
                $sum: {
                  $cond: [
                    { $eq: ["$name", "fanletter_news_cut_feed_load_more"] },
                    1,
                    0,
                  ],
                },
              },
              memberEvents: {
                $sum: {
                  $cond: [{ $eq: ["$viewerType", "member"] }, 1, 0],
                },
              },
              sourceOpenClicks: {
                $sum: {
                  $cond: [
                    { $eq: ["$name", "fanletter_news_source_open_click"] },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ])
        .toArray(),
    ),
    getFunnelEventsCollection().then((collection) =>
      collection
        .aggregate<RawCutDwellMetricsRow>([
          {
            $match: {
              name: "fanletter_news_cut_dwell" satisfies FunnelEventName,
              shareId: { $in: shareIds },
            },
          },
          {
            $project: {
              cutSlotNumber: {
                $convert: {
                  input: "$metadata.cutSlotNumber",
                  onError: null,
                  onNull: null,
                  to: "int",
                },
              },
              durationMs: {
                $convert: {
                  input: "$metadata.durationMs",
                  onError: 0,
                  onNull: 0,
                  to: "double",
                },
              },
              shareId: 1,
            },
          },
          {
            $match: {
              cutSlotNumber: { $gte: 1, $lte: 4 },
              durationMs: { $gt: 0 },
            },
          },
          {
            $group: {
              _id: {
                cutSlotNumber: "$cutSlotNumber",
                shareId: "$shareId",
              },
              averageDwellMs: { $avg: "$durationMs" },
              dwellEvents: { $sum: 1 },
              maxDwellMs: { $max: "$durationMs" },
              totalDwellMs: { $sum: "$durationMs" },
            },
          },
          {
            $sort: {
              "_id.shareId": 1,
              "_id.cutSlotNumber": 1,
            },
          },
        ])
        .toArray(),
    ),
    getFanletterNewsReportsCollection().then((collection) =>
      collection
        .find(
          { reportId: { $in: reportIds } },
          {
            projection: {
              reportId: 1,
              reporterName: 1,
              title: 1,
            },
          },
        )
        .toArray(),
    ),
  ]);
  const metricsByShareId = new Map(metricRows.map((row) => [row._id, row]));
  const cutDwellByShareId = new Map<
    string,
    FanletterNewsCutShareLinkCutDwellMetric[]
  >();

  for (const row of cutDwellRows) {
    const shareId = row._id.shareId;
    const cutMetrics = cutDwellByShareId.get(shareId) ?? [];

    cutMetrics.push({
      averageDwellMs: Math.round(row.averageDwellMs ?? 0),
      cutSlotNumber: row._id.cutSlotNumber,
      dwellEvents: row.dwellEvents ?? 0,
      maxDwellMs: Math.round(row.maxDwellMs ?? 0),
      totalDwellMs: Math.round(row.totalDwellMs ?? 0),
    });
    cutDwellByShareId.set(shareId, cutMetrics);
  }

  const reportsById = new Map(reports.map((report) => [report.reportId, report]));

  return links.map((link): FanletterNewsCutShareLinkDashboardItem => {
    const metrics = metricsByShareId.get(link.shareId);
    const cutDwell = cutDwellByShareId.get(link.shareId) ?? [];
    const totalDwellMs = cutDwell.reduce(
      (sum, cutMetric) => sum + cutMetric.totalDwellMs,
      0,
    );
    const dwellEvents = cutDwell.reduce(
      (sum, cutMetric) => sum + cutMetric.dwellEvents,
      0,
    );
    const maxDwellMs = cutDwell.reduce(
      (maxValue, cutMetric) => Math.max(maxValue, cutMetric.maxDwellMs),
      0,
    );
    const report = reportsById.get(link.reportId);

    return {
      contentId: link.contentId,
      createdAt: link.createdAt.toISOString(),
      creatorReferralCode: link.creatorReferralCode,
      cutSlotNumber: link.cutSlotNumber,
      memo: link.memo,
      metrics: {
        averageDwellMs:
          dwellEvents > 0 ? Math.round(totalDwellMs / dwellEvents) : 0,
        cutDwell,
        cutViews: metrics?.cutViews ?? 0,
        dwellEvents,
        eventCount: metrics?.eventCount ?? 0,
        guestEvents: metrics?.guestEvents ?? 0,
        lastEventAt: metrics?.lastEventAt?.toISOString() ?? null,
        loadMoreEvents: metrics?.loadMoreEvents ?? 0,
        maxDwellMs,
        memberEvents: metrics?.memberEvents ?? 0,
        sourceOpenClicks: metrics?.sourceOpenClicks ?? 0,
        totalDwellMs,
      },
      reportId: link.reportId,
      reportTitle: report?.title ?? null,
      reporterName: report?.reporterName ?? null,
      shareId: link.shareId,
      targetHref: link.targetHref,
    };
  });
}

function createEmptyShareLinkMetrics(
  cutDwell: FanletterNewsCutShareLinkCutDwellMetric[] = [],
): FanletterNewsCutShareLinkMetrics {
  const totalDwellMs = cutDwell.reduce(
    (sum, cutMetric) => sum + cutMetric.totalDwellMs,
    0,
  );
  const dwellEvents = cutDwell.reduce(
    (sum, cutMetric) => sum + cutMetric.dwellEvents,
    0,
  );
  const maxDwellMs = cutDwell.reduce(
    (maxValue, cutMetric) => Math.max(maxValue, cutMetric.maxDwellMs),
    0,
  );

  return {
    averageDwellMs:
      dwellEvents > 0 ? Math.round(totalDwellMs / dwellEvents) : 0,
    cutDwell,
    cutViews: 0,
    dwellEvents,
    eventCount: 0,
    guestEvents: 0,
    lastEventAt: null,
    loadMoreEvents: 0,
    maxDwellMs,
    memberEvents: 0,
    sourceOpenClicks: 0,
    totalDwellMs,
  };
}

export async function getFanletterNewsCutShareLinkDetail({
  ownerEmail,
  shareId,
}: {
  ownerEmail: string;
  shareId: string;
}): Promise<FanletterNewsCutShareLinkDetail | null> {
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);
  const normalizedShareId = normalizeShareId(shareId);

  if (!normalizedOwnerEmail || !normalizedShareId) {
    return null;
  }

  const shareLinksCollection = await getFanletterNewsCutShareLinksCollection();
  const link = await shareLinksCollection.findOne({
    ownerEmail: normalizedOwnerEmail,
    shareId: normalizedShareId,
  });

  if (!link) {
    return null;
  }

  const [metricRows, cutDwellRows, cutViewRows, fanRequests, report] =
    await Promise.all([
    getFunnelEventsCollection().then((collection) =>
      collection
        .aggregate<RawMetricsRow>([
          {
            $match: {
              name: {
                $in: [
                  "fanletter_news_cut_view",
                  "fanletter_news_cut_dwell",
                  "fanletter_news_cut_feed_load_more",
                  "fanletter_news_source_open_click",
                ] satisfies FunnelEventName[],
              },
              shareId: normalizedShareId,
            },
          },
          {
            $group: {
              _id: "$shareId",
              cutViews: {
                $sum: {
                  $cond: [{ $eq: ["$name", "fanletter_news_cut_view"] }, 1, 0],
                },
              },
              dwellEvents: {
                $sum: {
                  $cond: [{ $eq: ["$name", "fanletter_news_cut_dwell"] }, 1, 0],
                },
              },
              eventCount: { $sum: 1 },
              guestEvents: {
                $sum: {
                  $cond: [{ $eq: ["$viewerType", "guest"] }, 1, 0],
                },
              },
              lastEventAt: { $max: "$createdAt" },
              loadMoreEvents: {
                $sum: {
                  $cond: [
                    { $eq: ["$name", "fanletter_news_cut_feed_load_more"] },
                    1,
                    0,
                  ],
                },
              },
              memberEvents: {
                $sum: {
                  $cond: [{ $eq: ["$viewerType", "member"] }, 1, 0],
                },
              },
              sourceOpenClicks: {
                $sum: {
                  $cond: [
                    { $eq: ["$name", "fanletter_news_source_open_click"] },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ])
        .toArray(),
    ),
    getFunnelEventsCollection().then((collection) =>
      collection
        .aggregate<RawCutDwellMetricsRow>([
          {
            $match: {
              name: "fanletter_news_cut_dwell" satisfies FunnelEventName,
              shareId: normalizedShareId,
            },
          },
          {
            $project: {
              cutSlotNumber: {
                $convert: {
                  input: "$metadata.cutSlotNumber",
                  onError: null,
                  onNull: null,
                  to: "int",
                },
              },
              durationMs: {
                $convert: {
                  input: "$metadata.durationMs",
                  onError: 0,
                  onNull: 0,
                  to: "double",
                },
              },
            },
          },
          {
            $match: {
              cutSlotNumber: { $gte: 1, $lte: 4 },
              durationMs: { $gt: 0 },
            },
          },
          {
            $group: {
              _id: {
                cutSlotNumber: "$cutSlotNumber",
                shareId: normalizedShareId,
              },
              averageDwellMs: { $avg: "$durationMs" },
              dwellEvents: { $sum: 1 },
              maxDwellMs: { $max: "$durationMs" },
              totalDwellMs: { $sum: "$durationMs" },
            },
          },
          { $sort: { "_id.cutSlotNumber": 1 } },
        ])
        .toArray(),
    ),
    getFunnelEventsCollection().then((collection) =>
      collection
        .aggregate<RawCutViewMetricsRow>([
          {
            $match: {
              name: "fanletter_news_cut_view" satisfies FunnelEventName,
              shareId: normalizedShareId,
            },
          },
          {
            $project: {
              cutSlotNumber: {
                $convert: {
                  input: "$metadata.cutSlotNumber",
                  onError: null,
                  onNull: null,
                  to: "int",
                },
              },
            },
          },
          {
            $match: {
              cutSlotNumber: { $gte: 1, $lte: 4 },
            },
          },
          {
            $group: {
              _id: "$cutSlotNumber",
              cutViews: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
    ),
      getFanletterFanRequestsCollection().then((collection) =>
        collection
          .find(
            { sourceShareId: normalizedShareId },
            {
              projection: {
                body: 1,
                createdAt: 1,
                requestId: 1,
                requesterDisplayName: 1,
                sourceCutSlotNumber: 1,
                sourceReportId: 1,
              },
            },
          )
          .sort({ createdAt: -1 })
          .limit(4)
          .toArray(),
      ),
      getFanletterNewsReportsCollection().then((collection) =>
        collection.findOne(
          { reportId: link.reportId },
          {
            projection: {
              coverImageUrl: 1,
              creatorName: 1,
              reportId: 1,
              reporterName: 1,
              teaserImages: 1,
              teaserImageUrls: 1,
              title: 1,
            },
          },
        ),
      ),
    ]);

  const cutDwell = cutDwellRows.map((row) => ({
    averageDwellMs: Math.round(row.averageDwellMs ?? 0),
    cutSlotNumber: row._id.cutSlotNumber,
    dwellEvents: row.dwellEvents ?? 0,
    maxDwellMs: Math.round(row.maxDwellMs ?? 0),
    totalDwellMs: Math.round(row.totalDwellMs ?? 0),
  }));
  const cutDwellBySlot = new Map(
    cutDwell.map((cutMetric) => [cutMetric.cutSlotNumber, cutMetric]),
  );
  const cutViewsBySlot = new Map(
    cutViewRows.map((row) => [row._id, row.cutViews ?? 0]),
  );
  const totalMetrics = createEmptyShareLinkMetrics(cutDwell);
  const metrics = metricRows[0];
  const cuts = report ? getPublicCutsFromReport(report) : [];
  const campaignReports =
    Array.isArray(link.campaignReports) && link.campaignReports.length > 0
      ? link.campaignReports
      : cuts.length > 0
        ? [
            {
              contentId: link.contentId,
              coverImageUrl: report?.coverImageUrl ?? null,
              creatorName: report?.creatorName ?? null,
              creatorReferralCode: link.creatorReferralCode,
              cuts,
              reportId: link.reportId,
              reporterName: report?.reporterName ?? null,
              reporterReferralCode: link.reporterReferralCode,
              title: report?.title ?? null,
            },
          ]
        : [];

  return {
    campaignReports,
    contentId: link.contentId,
    coverImageUrl: report?.coverImageUrl ?? null,
    createdAt: link.createdAt.toISOString(),
    creatorName: report?.creatorName ?? null,
    creatorReferralCode: link.creatorReferralCode,
    cutSlotNumber: link.cutSlotNumber,
    cuts: cuts.map((cut) => {
      const dwellMetric = cutDwellBySlot.get(cut.slotNumber);

      return {
        ...cut,
        metrics: {
          averageDwellMs: dwellMetric?.averageDwellMs ?? 0,
          cutViews: cutViewsBySlot.get(cut.slotNumber) ?? 0,
          dwellEvents: dwellMetric?.dwellEvents ?? 0,
          maxDwellMs: dwellMetric?.maxDwellMs ?? 0,
          totalDwellMs: dwellMetric?.totalDwellMs ?? 0,
        },
      };
    }),
    fanRequests: fanRequests.map((request) => ({
      body: request.body,
      createdAt: request.createdAt.toISOString(),
      requestId: request.requestId,
      requesterDisplayName: request.requesterDisplayName ?? null,
      sourceCutSlotNumber: request.sourceCutSlotNumber ?? null,
      sourceReportId: request.sourceReportId ?? null,
    })),
    memo: link.memo,
    metrics: {
      ...totalMetrics,
      cutViews: metrics?.cutViews ?? 0,
      eventCount: metrics?.eventCount ?? 0,
      guestEvents: metrics?.guestEvents ?? 0,
      lastEventAt: metrics?.lastEventAt?.toISOString() ?? null,
      loadMoreEvents: metrics?.loadMoreEvents ?? 0,
      memberEvents: metrics?.memberEvents ?? 0,
      sourceOpenClicks: metrics?.sourceOpenClicks ?? 0,
    },
    reportId: link.reportId,
    reporterName: report?.reporterName ?? null,
    reportTitle: report?.title ?? null,
    shareId: link.shareId,
    targetHref: link.targetHref,
  };
}

export async function getFanletterNewsCutSharePublicRecap({
  reportId,
  shareId,
}: {
  reportId?: string | null;
  shareId: string | null;
}): Promise<SerializedFanletterNewsPublicCutShareRecap | null> {
  const normalizedShareId = normalizeShareId(shareId);
  const normalizedReportId = reportId?.trim() || null;

  if (!normalizedShareId) {
    return null;
  }

  const shareLinksCollection = await getFanletterNewsCutShareLinksCollection();
  const link = await shareLinksCollection.findOne(
    {
      shareId: normalizedShareId,
      ...(normalizedReportId ? { reportId: normalizedReportId } : {}),
    },
    {
      projection: {
        reportId: 1,
        shareId: 1,
      },
    },
  );

  if (!link) {
    return null;
  }

  const [metricRows, cutDwellRows, cutViewRows] = await Promise.all([
    getFunnelEventsCollection().then((collection) =>
      collection
        .aggregate<Pick<RawMetricsRow, "_id" | "eventCount">>([
          {
            $match: {
              name: {
                $in: [
                  "fanletter_news_cut_view",
                  "fanletter_news_cut_dwell",
                  "fanletter_news_cut_feed_load_more",
                  "fanletter_news_source_open_click",
                ] satisfies FunnelEventName[],
              },
              shareId: normalizedShareId,
            },
          },
          {
            $group: {
              _id: "$shareId",
              eventCount: { $sum: 1 },
            },
          },
        ])
        .toArray(),
    ),
    getFunnelEventsCollection().then((collection) =>
      collection
        .aggregate<RawCutDwellMetricsRow>([
          {
            $match: {
              name: "fanletter_news_cut_dwell" satisfies FunnelEventName,
              shareId: normalizedShareId,
            },
          },
          {
            $project: {
              cutSlotNumber: {
                $convert: {
                  input: "$metadata.cutSlotNumber",
                  onError: null,
                  onNull: null,
                  to: "int",
                },
              },
              durationMs: {
                $convert: {
                  input: "$metadata.durationMs",
                  onError: 0,
                  onNull: 0,
                  to: "double",
                },
              },
            },
          },
          {
            $match: {
              cutSlotNumber: { $gte: 1, $lte: 4 },
              durationMs: { $gt: 0 },
            },
          },
          {
            $group: {
              _id: {
                cutSlotNumber: "$cutSlotNumber",
                shareId: normalizedShareId,
              },
              averageDwellMs: { $avg: "$durationMs" },
              dwellEvents: { $sum: 1 },
              maxDwellMs: { $max: "$durationMs" },
              totalDwellMs: { $sum: "$durationMs" },
            },
          },
          { $sort: { "_id.cutSlotNumber": 1 } },
        ])
        .toArray(),
    ),
    getFunnelEventsCollection().then((collection) =>
      collection
        .aggregate<RawCutViewMetricsRow>([
          {
            $match: {
              name: "fanletter_news_cut_view" satisfies FunnelEventName,
              shareId: normalizedShareId,
            },
          },
          {
            $project: {
              cutSlotNumber: {
                $convert: {
                  input: "$metadata.cutSlotNumber",
                  onError: null,
                  onNull: null,
                  to: "int",
                },
              },
            },
          },
          {
            $match: {
              cutSlotNumber: { $gte: 1, $lte: 4 },
            },
          },
          {
            $group: {
              _id: "$cutSlotNumber",
              cutViews: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
    ),
  ]);
  const cutViewsBySlot = new Map(
    cutViewRows.map((row) => [row._id, row.cutViews ?? 0]),
  );
  const cutDwellBySlot = new Map(
    cutDwellRows.map((row) => [row._id.cutSlotNumber, row]),
  );

  return {
    cuts: Array.from({ length: 4 }, (_, index) => {
      const cutSlotNumber = index + 1;
      const dwellMetric = cutDwellBySlot.get(cutSlotNumber);

      return {
        averageDwellMs: Math.round(dwellMetric?.averageDwellMs ?? 0),
        cutSlotNumber,
        cutViews: cutViewsBySlot.get(cutSlotNumber) ?? 0,
        dwellEvents: dwellMetric?.dwellEvents ?? 0,
        maxDwellMs: Math.round(dwellMetric?.maxDwellMs ?? 0),
        totalDwellMs: Math.round(dwellMetric?.totalDwellMs ?? 0),
      };
    }),
    eventCount: metricRows[0]?.eventCount ?? 0,
    shareId: link.shareId,
  };
}

export async function getFanletterNewsCutSharePublicCampaignRecap({
  reportId,
  shareId,
}: {
  reportId?: string | null;
  shareId: string | null;
}): Promise<FanletterCampaignNewsCutRecap | null> {
  const normalizedShareId = normalizeShareId(shareId);
  const normalizedReportId = reportId?.trim() || null;

  if (!normalizedShareId) {
    return null;
  }

  const shareLinksCollection = await getFanletterNewsCutShareLinksCollection();
  const link = await shareLinksCollection.findOne(
    {
      shareId: normalizedShareId,
      ...(normalizedReportId ? { reportId: normalizedReportId } : {}),
    },
    {
      projection: {
        reportId: 1,
        shareId: 1,
        targetHref: 1,
      },
    },
  );

  if (!link) {
    return null;
  }

  const [recap, report] = await Promise.all([
    getFanletterNewsCutSharePublicRecap({
      reportId: link.reportId,
      shareId: link.shareId,
    }),
    getFanletterNewsReportsCollection().then((collection) =>
      collection.findOne(
        { reportId: link.reportId },
        {
          projection: {
            coverImageUrl: 1,
            reportId: 1,
            reporterName: 1,
            teaserImages: 1,
            teaserImageUrls: 1,
            title: 1,
          },
        },
      ),
    ),
  ]);
  const cuts = report ? getPublicCutsFromReport(report) : [];

  if (cuts.length === 0) {
    return null;
  }

  const metricsBySlot = new Map(
    (recap?.cuts ?? []).map((cutMetric) => [
      cutMetric.cutSlotNumber,
      cutMetric,
    ]),
  );

  return {
    coverImageUrl: report?.coverImageUrl ?? null,
    cuts: cuts.map((cut) => {
      const metrics = metricsBySlot.get(cut.slotNumber);

      return {
        imageUrl: cut.imageUrl,
        metrics: {
          averageDwellMs: metrics?.averageDwellMs ?? 0,
          cutViews: metrics?.cutViews ?? 0,
          dwellEvents: metrics?.dwellEvents ?? 0,
          maxDwellMs: metrics?.maxDwellMs ?? 0,
          totalDwellMs: metrics?.totalDwellMs ?? 0,
        },
        slotNumber: cut.slotNumber,
        source: cut.source,
        sourceImageUrl: cut.sourceImageUrl,
      };
    }),
    eventCount: recap?.eventCount ?? 0,
    reportId: link.reportId,
    reportTitle: report?.title ?? null,
    reporterName: report?.reporterName ?? null,
    shareId: link.shareId,
    targetHref: link.targetHref,
  };
}
