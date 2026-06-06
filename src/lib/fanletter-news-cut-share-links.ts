import "server-only";

import { randomUUID } from "node:crypto";

import type { FunnelEventName } from "@/lib/funnel";
import {
  getFanletterNewsCutShareLinksCollection,
  getFanletterNewsReportsCollection,
  getFunnelEventsCollection,
} from "@/lib/mongodb";
import { normalizeEmail } from "@/lib/member";
import {
  getPublicCutsFromReport,
  type FanletterNewsPublicCut,
} from "@/lib/fanletter-news-public-cuts";
import { normalizeReferralCode } from "@/lib/member";
import { normalizeShareId } from "@/lib/share-tracking";

export const FANLETTER_NEWS_CUT_SHARE_MEMO_LIMIT = 120;
export const FANLETTER_NEWS_CUT_SHARE_DASHBOARD_LIMIT = 50;

export type FanletterNewsCutShareLinkDocument = {
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

export type FanletterNewsCutShareLinkDetail = FanletterNewsCutShareLinkDashboardItem & {
  cuts: FanletterNewsCutShareLinkCutDetail[];
  creatorName: string | null;
  coverImageUrl: string | null;
};

type CreateFanletterNewsCutShareLinkInput = {
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

export async function createFanletterNewsCutShareLink({
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

  const [metricRows, cutDwellRows, cutViewRows, report] = await Promise.all([
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

  return {
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
