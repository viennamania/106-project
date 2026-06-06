import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterNewsPublicCutsFeedPage } from "@/components/fanletter-news-public-cuts-feed-page";
import {
  createFanletterNewsPublicCutFeedRotationSeed,
  createFanletterNewsPublicCutFeedItem,
  getFanletterNewsPublicCutFeedPage,
  serializeFanletterNewsPublicCutFeedItems,
} from "@/lib/fanletter-news-public-cuts";
import {
  FANLETTER_NEWS_PUBLIC_CUT_INITIAL_PAGE_SIZE,
  FANLETTER_NEWS_PUBLIC_CUT_QUERY_PARAM,
  normalizeFanletterNewsPublicCutSlotNumber,
} from "@/lib/fanletter-news-public-cuts-shared";
import { buildFanletterOgVersionToken } from "@/lib/fanletter-og";
import { getFanletterNewsReportById } from "@/lib/fanletter-news-report-service";
import {
  normalizeFanletterReturnToPath,
  readFanletterReferralCode,
  readFirstSearchParam,
} from "@/lib/fanletter-routing";
import { defaultLocale, getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { readMemberServerSession } from "@/lib/member-server-session";
import { normalizeShareId } from "@/lib/share-tracking";

type FanletterNewsCutDetailSearchParams = {
  cut?: string | string[];
  ref?: string | string[];
  returnTo?: string | string[];
  shareId?: string | string[];
  source?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        description:
          "팬 기자가 직접 편집한 4컷을 먼저 보고 뉴스와 캐릭터 채널로 이어가는 AIAVpark News 피드입니다.",
        title: "리포터 컷 | AIAVpark News",
      }
    : {
        description:
          "An AIAVpark News cut feed that starts with the four teaser cuts edited by a fan reporter.",
        title: "Reporter Cut | AIAVpark News",
      };
}

function getFanletterNewsCutDetailMetadataUrl({
  fallbackReferralCode,
  locale,
  referralCode,
  reportId,
  shareId,
  cutSlotNumber,
}: {
  cutSlotNumber: number | null;
  fallbackReferralCode: string | null;
  locale: Locale;
  referralCode: string | null;
  reportId: string;
  shareId: string | null;
}) {
  const basePath = `/${locale}/fanletter/news/cuts/${reportId}`;
  const cutSlotNumberValue = cutSlotNumber ? String(cutSlotNumber) : null;

  if (shareId) {
    return setPathSearchParams(basePath, {
      [FANLETTER_NEWS_PUBLIC_CUT_QUERY_PARAM]: cutSlotNumberValue,
      ref: referralCode,
      shareId,
    });
  }

  return setPathSearchParams(
    buildPathWithReferral(basePath, referralCode ?? fallbackReferralCode),
    {
      [FANLETTER_NEWS_PUBLIC_CUT_QUERY_PARAM]: cutSlotNumberValue,
    },
  );
}

type FanletterNewsCutDetailReport = NonNullable<
  Awaited<ReturnType<typeof getFanletterNewsReportById>>
>;
type FanletterNewsCutDetailCut = NonNullable<
  ReturnType<typeof createFanletterNewsPublicCutFeedItem>
>["leadCut"];

function getFanletterNewsCutOgImagePath({
  cut,
  locale,
  report,
  shareId,
}: {
  cut: FanletterNewsCutDetailCut;
  locale: Locale;
  report: FanletterNewsCutDetailReport;
  shareId: string | null;
}) {
  const searchParams = new URLSearchParams({
    cut: String(cut.slotNumber),
    lang: locale,
    reportId: report.reportId,
  });
  const version = buildFanletterOgVersionToken(
    cut.imageUrl,
    report.reporterAvatarImageUrl ?? null,
    report.updatedAt.toISOString(),
  );

  if (shareId) {
    searchParams.set("shareId", shareId);
  }

  if (version) {
    searchParams.set("v", version);
  }

  return `/api/og/fanletter-news/cut?${searchParams.toString()}`;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; reportId: string }>;
  searchParams: Promise<FanletterNewsCutDetailSearchParams>;
}): Promise<Metadata> {
  const { lang, reportId } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? (lang as Locale) : defaultLocale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const shareId = normalizeShareId(readFirstSearchParam(query.shareId));
  const cutSlotNumber = normalizeFanletterNewsPublicCutSlotNumber(
    readFirstSearchParam(query.cut),
  );
  const report = await getFanletterNewsReportById(reportId);
  const localizedReport = report?.locale === locale ? report : null;
  const feedItem = localizedReport
    ? createFanletterNewsPublicCutFeedItem(localizedReport)
    : null;
  const selectedCut = feedItem
    ? cutSlotNumber
      ? feedItem.cuts.find((cut) => cut.slotNumber === cutSlotNumber) ??
        feedItem.leadCut
      : feedItem.leadCut
    : null;
  const imageUrl =
    selectedCut && localizedReport
      ? getFanletterNewsCutOgImagePath({
          cut: selectedCut,
          locale,
          report: localizedReport,
          shareId,
        })
      : (localizedReport?.coverImageUrl ?? null);
  const title = localizedReport
    ? `${localizedReport.title} | ${copy.title}`
    : copy.title;
  const description = localizedReport?.dek ?? copy.description;
  const url = getFanletterNewsCutDetailMetadataUrl({
    cutSlotNumber,
    fallbackReferralCode: localizedReport?.reporterReferralCode ?? null,
    locale,
    referralCode,
    reportId: localizedReport?.reportId ?? reportId,
    shareId,
  });
  const ogImages = imageUrl
    ? [
        {
          alt: localizedReport?.title ?? copy.title,
          height: selectedCut ? 630 : 675,
          type: selectedCut ? "image/png" : "image/jpeg",
          url: imageUrl,
          width: 1200,
        },
      ]
    : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      description,
      images: ogImages,
      siteName: "AIAVpark News",
      title,
      type: "article",
      url,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      description,
      images: imageUrl ? [imageUrl] : undefined,
      title,
    },
  };
}

export default async function LocalizedFanletterNewsCutDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; reportId: string }>;
  searchParams: Promise<FanletterNewsCutDetailSearchParams>;
}) {
  const { lang, reportId } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode(query.ref);
  const shareId = normalizeShareId(readFirstSearchParam(query.shareId));
  const initialCutSlotNumber = normalizeFanletterNewsPublicCutSlotNumber(
    readFirstSearchParam(query.cut),
  );
  const returnToHref = normalizeFanletterReturnToPath(query.returnTo, locale);
  const initialSourceContentId =
    readFirstSearchParam(query.source)?.trim() || null;
  const session = await readMemberServerSession();
  const feedRotationSeed = createFanletterNewsPublicCutFeedRotationSeed();
  const report = await getFanletterNewsReportById(reportId);

  if (
    !report ||
    report.locale !== locale ||
    !createFanletterNewsPublicCutFeedItem(report)
  ) {
    notFound();
  }

  const feedPage = await getFanletterNewsPublicCutFeedPage({
    excludeReportIds: [report.reportId],
    limit: FANLETTER_NEWS_PUBLIC_CUT_INITIAL_PAGE_SIZE,
    locale,
    referralCode,
    rotationSeed: feedRotationSeed,
    shareId,
    targetOnly: Boolean(shareId),
    targetReport: report,
    viewerEmail: session?.email ?? null,
  });

  return (
    <FanletterNewsPublicCutsFeedPage
      dictionary={getDictionary(locale)}
      excludeReportId={report.reportId}
      feedRotationSeed={feedRotationSeed}
      hasMore={feedPage.hasMore}
      initialCutSlotNumber={initialCutSlotNumber}
      items={serializeFanletterNewsPublicCutFeedItems(feedPage.items)}
      locale={locale}
      nextOffset={feedPage.nextOffset}
      referralCode={referralCode}
      returnToHref={returnToHref}
      shareId={shareId}
      sourceContentId={initialSourceContentId}
      viewerEmail={session?.email ?? null}
    />
  );
}
