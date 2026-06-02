import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterNewsPublicCutsFeedPage } from "@/components/fanletter-news-public-cuts-feed-page";
import {
  createFanletterNewsPublicCutFeedItem,
  getFanletterNewsPublicCutFeedPage,
  serializeFanletterNewsPublicCutFeedItems,
} from "@/lib/fanletter-news-public-cuts";
import { FANLETTER_NEWS_PUBLIC_CUT_INITIAL_PAGE_SIZE } from "@/lib/fanletter-news-public-cuts-shared";
import { getFanletterNewsReportById } from "@/lib/fanletter-news-report-service";
import {
  readFanletterReferralCode,
  readFirstSearchParam,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { readMemberServerSession } from "@/lib/member-server-session";
import { normalizeShareId } from "@/lib/share-tracking";

type FanletterNewsCutDetailSearchParams = {
  ref?: string | string[];
  shareId?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        description:
          "팬 기자가 직접 편집한 4컷을 먼저 보고 뉴스와 캐릭터 채널로 이어가는 FanLetter News 피드입니다.",
        title: "리포터 컷 | FanLetter News",
      }
    : {
        description:
          "A FanLetter News cut feed that starts with the four teaser cuts edited by a fan reporter.",
        title: "Reporter Cut | FanLetter News",
      };
}

function getFanletterNewsCutDetailMetadataUrl({
  fallbackReferralCode,
  locale,
  referralCode,
  reportId,
  shareId,
}: {
  fallbackReferralCode: string | null;
  locale: Locale;
  referralCode: string | null;
  reportId: string;
  shareId: string | null;
}) {
  const basePath = `/${locale}/fanletter/news/cuts/${reportId}`;

  if (shareId) {
    return setPathSearchParams(basePath, {
      ref: referralCode,
      shareId,
    });
  }

  return buildPathWithReferral(basePath, referralCode ?? fallbackReferralCode);
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
  const report = await getFanletterNewsReportById(reportId);
  const localizedReport = report?.locale === locale ? report : null;
  const feedItem = localizedReport
    ? createFanletterNewsPublicCutFeedItem(localizedReport)
    : null;
  const imageUrl =
    localizedReport?.coverImageUrl ?? feedItem?.leadCut.imageUrl ?? null;
  const title = localizedReport
    ? `${localizedReport.title} | ${copy.title}`
    : copy.title;
  const description = localizedReport?.dek ?? copy.description;
  const url = getFanletterNewsCutDetailMetadataUrl({
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
          height: 675,
          type: "image/jpeg",
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
      siteName: "FanLetter News",
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
  const session = await readMemberServerSession();
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
    shareId,
    targetReport: report,
    viewerEmail: session?.email ?? null,
  });

  return (
    <FanletterNewsPublicCutsFeedPage
      excludeReportId={report.reportId}
      hasMore={feedPage.hasMore}
      items={serializeFanletterNewsPublicCutFeedItems(feedPage.items)}
      locale={locale}
      nextOffset={feedPage.nextOffset}
      referralCode={referralCode}
      shareId={shareId}
    />
  );
}
