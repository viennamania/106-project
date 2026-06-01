import {
  getFanletterNewsPublicCutFeedPage,
  serializeFanletterNewsPublicCutFeedPage,
} from "@/lib/fanletter-news-public-cuts";
import { FANLETTER_NEWS_PUBLIC_CUT_PAGE_SIZE } from "@/lib/fanletter-news-public-cuts-shared";
import { hasLocale, type Locale } from "@/lib/i18n";

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

function readPositiveInteger(value: string | null) {
  const parsed = value
    ? Number.parseInt(value, 10)
    : FANLETTER_NEWS_PUBLIC_CUT_PAGE_SIZE;

  if (!Number.isFinite(parsed) || parsed < 1) {
    return FANLETTER_NEWS_PUBLIC_CUT_PAGE_SIZE;
  }

  return parsed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const localeParam = searchParams.get("locale");

  if (!localeParam || !hasLocale(localeParam)) {
    return jsonError("locale is required.", 400);
  }

  try {
    const excludeReportId = searchParams.get("excludeReportId")?.trim();
    const page = await getFanletterNewsPublicCutFeedPage({
      excludeReportIds: excludeReportId ? [excludeReportId] : [],
      limit: readPositiveInteger(searchParams.get("limit")),
      locale: localeParam as Locale,
      offset: readNonNegativeInteger(searchParams.get("offset")),
    });

    return Response.json(serializeFanletterNewsPublicCutFeedPage(page));
  } catch {
    return jsonError("Failed to load FanLetter News reporter cuts.", 500);
  }
}
