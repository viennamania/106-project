import "server-only";

import {
  createEmptyContentSocialSummary,
  type FanletterNewsReportDocument,
  type FanletterNewsReportTeaserImageDocument,
} from "@/lib/content";
import { getContentSocialSummaryForViewer } from "@/lib/content-service";
import { getFanletterNewsReportsCollection } from "@/lib/mongodb";
import {
  getLatestFanletterNewsReports,
} from "@/lib/fanletter-news-report-service";
import {
  createFanletterNewsSourceRevealState,
  type FanletterNewsSourceRevealState,
} from "@/lib/fanletter-news-source-reveal";
import {
  FANLETTER_NEWS_PUBLIC_CUT_INITIAL_PAGE_SIZE,
  FANLETTER_NEWS_PUBLIC_CUT_MAX_PAGE_SIZE,
  type FanletterNewsPublicCutFeedLoadResponse,
  type SerializedFanletterNewsPublicCutFeedItem,
} from "@/lib/fanletter-news-public-cuts-shared";
import type { Locale } from "@/lib/i18n";

const FANLETTER_NEWS_PUBLIC_CUT_LIMIT = 4;
const FANLETTER_NEWS_PUBLIC_CUT_FEED_REPORT_LIMIT =
  FANLETTER_NEWS_PUBLIC_CUT_INITIAL_PAGE_SIZE;
const FANLETTER_NEWS_PUBLIC_CUT_FEED_LOOKAHEAD_LIMIT = 48;

export type FanletterNewsPublicCut = {
  imageUrl: string;
  slotNumber: number;
  source: FanletterNewsReportTeaserImageDocument["source"] | "legacy_teaser";
  sourceImageUrl: string | null;
};

export type FanletterNewsPublicCutFeedItem = {
  cuts: FanletterNewsPublicCut[];
  leadCut: FanletterNewsPublicCut;
  report: FanletterNewsReportDocument;
  sourceReveal: FanletterNewsSourceRevealState;
};

export type FanletterNewsPublicCutFeedPage = {
  hasMore: boolean;
  items: FanletterNewsPublicCutFeedItem[];
  nextOffset: number;
};

function normalizePublicCutFeedLimit(limit: number) {
  if (!Number.isFinite(limit)) {
    return FANLETTER_NEWS_PUBLIC_CUT_INITIAL_PAGE_SIZE;
  }

  return Math.max(
    1,
    Math.min(Math.floor(limit), FANLETTER_NEWS_PUBLIC_CUT_MAX_PAGE_SIZE),
  );
}

function normalizePublicCutFeedOffset(offset: number) {
  if (!Number.isFinite(offset)) {
    return 0;
  }

  return Math.max(0, Math.floor(offset));
}

function getPublicCutsFromReport(
  report: Pick<FanletterNewsReportDocument, "teaserImages" | "teaserImageUrls">,
): FanletterNewsPublicCut[] {
  const croppedCuts =
    report.teaserImages
      ?.filter(
        (image) =>
          image.source === "reporter_cropped" && Boolean(image.imageUrl.trim()),
      )
      .map((image, index) => ({
        imageUrl: image.imageUrl.trim(),
        slotNumber: index + 1,
        source: image.source,
        sourceImageUrl: image.sourceImageUrl.trim() || null,
      })) ?? [];

  if (croppedCuts.length > 0) {
    return croppedCuts.slice(0, FANLETTER_NEWS_PUBLIC_CUT_LIMIT);
  }

  return (report.teaserImageUrls ?? [])
    .map((imageUrl) => imageUrl.trim())
    .filter(Boolean)
    .slice(0, FANLETTER_NEWS_PUBLIC_CUT_LIMIT)
    .map((imageUrl, index) => ({
      imageUrl,
      slotNumber: index + 1,
      source: "legacy_teaser" as const,
      sourceImageUrl: imageUrl,
    }));
}

export function createFanletterNewsPublicCutFeedItem(
  report: FanletterNewsReportDocument,
): FanletterNewsPublicCutFeedItem | null {
  const cuts = getPublicCutsFromReport(report);
  const leadCut = cuts[0] ?? null;

  if (!leadCut) {
    return null;
  }

  return {
    cuts,
    leadCut,
    report,
    sourceReveal: createFanletterNewsSourceRevealState(
      createEmptyContentSocialSummary(),
    ),
  };
}

async function hydrateFanletterNewsPublicCutFeedItemsSourceReveal(
  items: FanletterNewsPublicCutFeedItem[],
  viewerEmail?: string | null,
) {
  if (items.length === 0) {
    return items;
  }

  const uniqueContentIds = [
    ...new Set(
      items
        .map((item) => item.report.contentId.trim())
        .filter((contentId) => contentId.length > 0),
    ),
  ];

  if (uniqueContentIds.length === 0) {
    return items;
  }

  const sourceRevealByContentId = new Map<string, FanletterNewsSourceRevealState>();

  await Promise.all(
    uniqueContentIds.map(async (contentId) => {
      let social = createEmptyContentSocialSummary();

      try {
        social = await getContentSocialSummaryForViewer(
          contentId,
          viewerEmail ?? null,
        );
      } catch {
        social = createEmptyContentSocialSummary();
      }

      sourceRevealByContentId.set(
        contentId,
        createFanletterNewsSourceRevealState(social),
      );
    }),
  );

  return items.map((item) => ({
    ...item,
    sourceReveal:
      sourceRevealByContentId.get(item.report.contentId) ?? item.sourceReveal,
  }));
}

export function serializeFanletterNewsPublicCutFeedItem(
  item: FanletterNewsPublicCutFeedItem,
): SerializedFanletterNewsPublicCutFeedItem {
  return {
    cuts: item.cuts,
    leadCut: item.leadCut,
    report: {
      contentMaturityRating: item.report.contentMaturityRating,
      coverImageUrl: item.report.coverImageUrl,
      createdAt: item.report.createdAt.toISOString(),
      creatorName: item.report.creatorName,
      creatorReferralCode: item.report.creatorReferralCode,
      dek: item.report.dek,
      priceType: item.report.priceType,
      reporterName: item.report.reporterName,
      reporterReferralCode: item.report.reporterReferralCode,
      reportId: item.report.reportId,
      sourcePublishedAt: item.report.sourcePublishedAt?.toISOString() ?? null,
      title: item.report.title,
    },
    sourceReveal: item.sourceReveal,
  };
}

export function serializeFanletterNewsPublicCutFeedItems(
  items: FanletterNewsPublicCutFeedItem[],
) {
  return items.map((item) => serializeFanletterNewsPublicCutFeedItem(item));
}

export function serializeFanletterNewsPublicCutFeedPage(
  page: FanletterNewsPublicCutFeedPage,
): FanletterNewsPublicCutFeedLoadResponse {
  return {
    hasMore: page.hasMore,
    items: serializeFanletterNewsPublicCutFeedItems(page.items),
    nextOffset: page.nextOffset,
  };
}

export async function getFanletterNewsPublicCutFeedPage({
  excludeReportIds = [],
  limit = FANLETTER_NEWS_PUBLIC_CUT_INITIAL_PAGE_SIZE,
  locale,
  offset = 0,
  targetReport = null,
  viewerEmail = null,
}: {
  excludeReportIds?: string[];
  limit?: number;
  locale: Locale;
  offset?: number;
  targetReport?: FanletterNewsReportDocument | null;
  viewerEmail?: string | null;
}): Promise<FanletterNewsPublicCutFeedPage> {
  const normalizedLimit = normalizePublicCutFeedLimit(limit);
  const normalizedOffset = normalizePublicCutFeedOffset(offset);
  const targetItem = targetReport
    ? createFanletterNewsPublicCutFeedItem(targetReport)
    : null;
  const normalizedExcludeReportIds = [
    ...new Set(
      [
        ...excludeReportIds,
        ...(targetItem ? [targetItem.report.reportId] : []),
      ]
        .map((reportId) => reportId.trim())
        .filter(Boolean),
    ),
  ];
  const queryLimit = Math.max(1, normalizedLimit - (targetItem ? 1 : 0));
  const reportsCollection = await getFanletterNewsReportsCollection();
  const reports = await reportsCollection
    .find({
      locale,
      ...(normalizedExcludeReportIds.length > 0
        ? { reportId: { $nin: normalizedExcludeReportIds } }
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
    .sort({ sourcePublishedAt: -1, createdAt: -1 })
    .skip(normalizedOffset)
    .limit(queryLimit + 1)
    .toArray();
  const feedItems = reports
    .slice(0, queryLimit)
    .map((report) => createFanletterNewsPublicCutFeedItem(report))
    .filter((item): item is FanletterNewsPublicCutFeedItem => Boolean(item));
  const items = targetItem ? [targetItem, ...feedItems] : feedItems;

  return {
    hasMore: reports.length > queryLimit,
    items: await hydrateFanletterNewsPublicCutFeedItemsSourceReveal(
      items,
      viewerEmail,
    ),
    nextOffset: normalizedOffset + Math.min(reports.length, queryLimit),
  };
}

export async function getFanletterNewsPublicCutFeed({
  limit = FANLETTER_NEWS_PUBLIC_CUT_FEED_REPORT_LIMIT,
  locale,
  targetReport = null,
  viewerEmail = null,
}: {
  limit?: number;
  locale: Locale;
  targetReport?: FanletterNewsReportDocument | null;
  viewerEmail?: string | null;
}) {
  if (limit <= FANLETTER_NEWS_PUBLIC_CUT_MAX_PAGE_SIZE) {
    const page = await getFanletterNewsPublicCutFeedPage({
      limit,
      locale,
      targetReport,
      viewerEmail,
    });

    return page.items;
  }

  const normalizedLimit = Math.max(
    1,
    Math.min(Math.floor(limit), FANLETTER_NEWS_PUBLIC_CUT_FEED_REPORT_LIMIT),
  );
  const reports = await getLatestFanletterNewsReports({
    limit: FANLETTER_NEWS_PUBLIC_CUT_FEED_LOOKAHEAD_LIMIT,
    locale,
    promoteFirstReports: true,
  });
  const itemsByReportId = new Map<string, FanletterNewsPublicCutFeedItem>();
  const targetItem = targetReport
    ? createFanletterNewsPublicCutFeedItem(targetReport)
    : null;

  if (targetItem) {
    itemsByReportId.set(targetItem.report.reportId, targetItem);
  }

  for (const report of reports) {
    if (itemsByReportId.has(report.reportId)) {
      continue;
    }

    const item = createFanletterNewsPublicCutFeedItem(report);

    if (item) {
      itemsByReportId.set(report.reportId, item);
    }
  }

  return hydrateFanletterNewsPublicCutFeedItemsSourceReveal(
    Array.from(itemsByReportId.values()).slice(0, normalizedLimit),
    viewerEmail,
  );
}
