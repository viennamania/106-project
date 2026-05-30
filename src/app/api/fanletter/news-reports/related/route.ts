import { cookies } from "next/headers";

import {
  countRelatedFanletterNewsReports,
  getFanletterNewsReportById,
  getRelatedFanletterNewsReports,
} from "@/lib/fanletter-news-report-service";
import {
  FANLETTER_NSFW_OPT_IN_COOKIE,
  isFanletterNsfwOptedIn,
} from "@/lib/fanletter-nsfw";
import {
  readFanletterRelatedNewsSort,
  serializeFanletterRelatedNewsItem,
} from "@/lib/fanletter-news-related";
import { hasLocale, type Locale } from "@/lib/i18n";

const DEFAULT_RELATED_NEWS_PAGE_SIZE = 4;
const MAX_RELATED_NEWS_PAGE_SIZE = 12;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function readNonNegativeInteger(value: string | null) {
  const parsed = value ? Number.parseInt(value, 10) : 0;

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 0;
  }

  return parsed;
}

function readRelatedNewsPageSize(value: string | null) {
  const parsed = value
    ? Number.parseInt(value, 10)
    : DEFAULT_RELATED_NEWS_PAGE_SIZE;

  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_RELATED_NEWS_PAGE_SIZE;
  }

  return Math.min(MAX_RELATED_NEWS_PAGE_SIZE, Math.max(1, parsed));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get("reportId")?.trim();
  const localeParam = searchParams.get("locale");

  if (!reportId) {
    return jsonError("reportId is required.", 400);
  }

  if (!localeParam || !hasLocale(localeParam)) {
    return jsonError("locale is required.", 400);
  }

  try {
    const report = await getFanletterNewsReportById(reportId);

    if (!report) {
      return jsonError("Report not found.", 404);
    }

    const locale = localeParam as Locale;
    const pageSize = readRelatedNewsPageSize(searchParams.get("limit"));
    const offset = readNonNegativeInteger(searchParams.get("offset"));
    const searchQuery = searchParams.get("q");
    const sort = readFanletterRelatedNewsSort(searchParams.get("sort"));
    const cookieStore = await cookies();
    const nsfwOptInEnabled = isFanletterNsfwOptedIn(
      cookieStore.get(FANLETTER_NSFW_OPT_IN_COOKIE)?.value,
    );
    const relatedQuery = {
      creatorReferralCode: report.creatorReferralCode,
      excludeContentId: report.contentId,
      excludeReportId: report.reportId,
      locale,
      searchQuery,
    };
    const [reports, totalCount] = await Promise.all([
      getRelatedFanletterNewsReports({
        ...relatedQuery,
        limit: pageSize + 1,
        offset,
        sort,
      }),
      countRelatedFanletterNewsReports(relatedQuery),
    ]);
    const items = reports
      .slice(0, pageSize)
      .map((relatedReport) =>
        serializeFanletterRelatedNewsItem({
          nsfwOptInEnabled,
          referralCode: searchParams.get("ref"),
          report: relatedReport,
        }),
      );

    return Response.json({
      hasMore: reports.length > pageSize,
      items,
      totalCount,
    });
  } catch {
    return jsonError("Failed to load related FanLetter news.", 500);
  }
}
