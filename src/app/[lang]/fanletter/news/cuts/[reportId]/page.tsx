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
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";

type FanletterNewsCutDetailSearchParams = {
  ref?: string | string[];
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; reportId: string }>;
}): Promise<Metadata> {
  const { lang, reportId } = await params;
  const locale = hasLocale(lang) ? (lang as Locale) : defaultLocale;
  const copy = getCopy(locale);
  const report = await getFanletterNewsReportById(reportId);

  return {
    title: report ? `${report.title} | ${copy.title}` : copy.title,
    description: report?.dek ?? copy.description,
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
    targetReport: report,
  });

  return (
    <FanletterNewsPublicCutsFeedPage
      excludeReportId={report.reportId}
      hasMore={feedPage.hasMore}
      items={serializeFanletterNewsPublicCutFeedItems(feedPage.items)}
      locale={locale}
      nextOffset={feedPage.nextOffset}
      referralCode={referralCode}
    />
  );
}
