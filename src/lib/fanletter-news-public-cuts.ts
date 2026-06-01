import "server-only";

import type {
  FanletterNewsReportDocument,
  FanletterNewsReportTeaserImageDocument,
} from "@/lib/content";
import {
  getLatestFanletterNewsReports,
} from "@/lib/fanletter-news-report-service";
import type { Locale } from "@/lib/i18n";

const FANLETTER_NEWS_PUBLIC_CUT_LIMIT = 4;
const FANLETTER_NEWS_PUBLIC_CUT_FEED_REPORT_LIMIT = 24;
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
};

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
  };
}

export async function getFanletterNewsPublicCutFeed({
  limit = FANLETTER_NEWS_PUBLIC_CUT_FEED_REPORT_LIMIT,
  locale,
  targetReport = null,
}: {
  limit?: number;
  locale: Locale;
  targetReport?: FanletterNewsReportDocument | null;
}) {
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

  return Array.from(itemsByReportId.values()).slice(0, normalizedLimit);
}
