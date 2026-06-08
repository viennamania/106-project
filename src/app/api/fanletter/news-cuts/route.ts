import {
  getFanletterNewsPublicCutFeedItemsByReportIds,
  getFanletterNewsPublicCutFeedPage,
  serializeFanletterNewsPublicCutFeedPage,
} from "@/lib/fanletter-news-public-cuts";
import { getFanletterNewsCutShareCampaignReportIds } from "@/lib/fanletter-news-cut-share-links";
import { FANLETTER_NEWS_PUBLIC_CUT_PAGE_SIZE } from "@/lib/fanletter-news-public-cuts-shared";
import { hasLocale, type Locale } from "@/lib/i18n";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import {
  readMemberServerSession,
  readMemberServerSessionFromCookieHeader,
} from "@/lib/member-server-session";
import { normalizeShareId } from "@/lib/share-tracking";

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

function readRotationSeed(value: string | null) {
  return value?.trim().slice(0, 128) || null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const localeParam = searchParams.get("locale");

  if (!localeParam || !hasLocale(localeParam)) {
    return jsonError("locale is required.", 400);
  }

  try {
    const excludeReportId = searchParams.get("excludeReportId")?.trim();
    const referralCode = readFanletterReferralCode(
      searchParams.get("ref") ?? undefined,
    );
    const shareId = normalizeShareId(searchParams.get("shareId"));
    const focusCreatorReferralCode =
      searchParams.get("focusCreatorReferralCode")?.trim().slice(0, 96) ||
      null;
    const creatorTimelineMode = searchParams.get("timeline") === "creator";
    const timelineAnchorReportId =
      searchParams.get("timelineAnchorReportId")?.trim().slice(0, 96) || null;
    const offset = readNonNegativeInteger(searchParams.get("offset"));
    const limit = readPositiveInteger(searchParams.get("limit"));
    const session =
      creatorTimelineMode && shareId
        ? readMemberServerSessionFromCookieHeader(request.headers.get("cookie"))
        : await readMemberServerSession();
    const reporterLockedMode = searchParams.get("mode") === "reporter_locked";

    if (creatorTimelineMode && shareId && timelineAnchorReportId) {
      const campaignReportIds = await getFanletterNewsCutShareCampaignReportIds({
        shareId,
      });
      const anchorIndex = campaignReportIds.indexOf(timelineAnchorReportId);

      if (anchorIndex >= 0) {
        const startIndex = anchorIndex + 1 + offset;
        const nextReportIds = campaignReportIds.slice(
          startIndex,
          startIndex + limit,
        );
        const items = await getFanletterNewsPublicCutFeedItemsByReportIds({
          locale: localeParam as Locale,
          reportIds: nextReportIds,
          viewerEmail: session?.email ?? null,
        });
        const headers = new Headers();

        headers.set(
          "Cache-Control",
          session?.email
            ? "private, max-age=15, stale-while-revalidate=60"
            : "public, max-age=15, s-maxage=30, stale-while-revalidate=120",
        );

        return Response.json(
          serializeFanletterNewsPublicCutFeedPage({
            hasMore: startIndex + items.length < campaignReportIds.length,
            items,
            nextOffset: offset + items.length,
          }),
          { headers },
        );
      }
    }

    const page = await getFanletterNewsPublicCutFeedPage({
      excludeReportIds: excludeReportId ? [excludeReportId] : [],
      focusCreatorReferralCode,
      limit,
      locale: localeParam as Locale,
      mode: reporterLockedMode ? "reporter_locked" : "default",
      offset,
      referralCode,
      rotationSeed: readRotationSeed(searchParams.get("rotationSeed")),
      shareId,
      timelineAnchorReportId: creatorTimelineMode ? timelineAnchorReportId : null,
      viewerEmail: session?.email ?? null,
    });
    const headers = new Headers();

    if (creatorTimelineMode && shareId) {
      headers.set(
        "Cache-Control",
        session?.email
          ? "private, max-age=15, stale-while-revalidate=60"
          : "public, max-age=15, s-maxage=30, stale-while-revalidate=120",
      );
    }

    return Response.json(serializeFanletterNewsPublicCutFeedPage(page), {
      headers,
    });
  } catch {
    return jsonError("Failed to load AIAVpark News reporter cuts.", 500);
  }
}
