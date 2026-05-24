import type { FanletterNewsReportDocument } from "@/lib/content";
import { FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD } from "@/lib/fanletter-news-source-reveal";
import { getFanletterNsfwCopy } from "@/lib/fanletter-nsfw";
import type { Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";

type FanletterRelatedNewsReport = FanletterNewsReportDocument & {
  firstNewsReportForContent?: boolean;
  relatedSourceRevealCount?: number;
  relatedSourceVlogAvailable?: boolean;
};

export type FanletterRelatedNewsSourceReveal = {
  count: number;
  progressLabel: string;
  statusLabel: string;
  threshold: number;
  unlocked: boolean;
};

export type FanletterRelatedNewsItem = {
  coverImageUrl: string | null;
  dek: string;
  firstReportBadge: string | null;
  href: string;
  isFirstReport: boolean;
  isNsfw: boolean;
  nsfwBadge: string;
  publishedAt: string | null;
  reporterName: string;
  reportId: string;
  shouldBlur: boolean;
  sourceReveal: FanletterRelatedNewsSourceReveal | null;
  title: string;
};

export function getFanletterNewsArticleDisplayTitle(title: string) {
  const firstPrefix = title.match(/^\[(최초|First)\]\s*/i)?.[0] ?? "";
  const titleWithoutFirstPrefix = title.slice(firstPrefix.length);

  return `${firstPrefix}${titleWithoutFirstPrefix.replace(
    /^\[(AI 팬 리포트|AI fan report)\]\s*/i,
    "",
  )}`;
}

export function isFanletterNewsFirstReportForContent(
  report: { firstNewsReportForContent?: boolean } | null | undefined,
) {
  return report?.firstNewsReportForContent === true;
}

export function getFanletterNewsFirstReportBadgeLabel(locale: Locale) {
  return locale === "ko" ? "최초 팬 리포트" : "First fan report";
}

export function getFanletterNewsReporterDisplayName(
  report: FanletterNewsReportDocument,
) {
  const reporterName = report.reporterName.trim();

  if (reporterName) {
    return reporterName;
  }

  const reporterId = report.reporterReferralCode.trim();

  return report.locale === "ko"
    ? `${reporterId} 팬 기자`
    : `Fan reporter ${reporterId}`;
}

export function isFanletterNewsReportNsfw(report: FanletterNewsReportDocument) {
  return report.contentMaturityRating === "nsfw";
}

export function shouldBlurFanletterNewsReport(
  report: FanletterNewsReportDocument,
  nsfwOptInEnabled: boolean,
) {
  return isFanletterNewsReportNsfw(report) && !nsfwOptInEnabled;
}

function formatRelatedNewsDate(value: Date | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(value);
}

function formatRelatedNewsNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function createRelatedNewsSourceRevealStatus(
  report: FanletterRelatedNewsReport,
): FanletterRelatedNewsSourceReveal | null {
  if (!report.relatedSourceVlogAvailable) {
    return null;
  }

  const count = Math.max(
    0,
    Math.floor(Number(report.relatedSourceRevealCount ?? 0)),
  );
  const threshold = FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD;
  const unlocked = count >= threshold;
  const displayCount = Math.min(count, threshold);
  const progressLabel = `${formatRelatedNewsNumber(
    displayCount,
    report.locale,
  )}/${formatRelatedNewsNumber(threshold, report.locale)}`;

  return {
    count,
    progressLabel,
    statusLabel: unlocked
      ? report.locale === "ko"
        ? "원본 오픈 완료"
        : "Source open"
      : report.locale === "ko"
        ? "원본 오픈 대기"
        : "Source locked",
    threshold,
    unlocked,
  };
}

export function serializeFanletterRelatedNewsItem({
  nsfwOptInEnabled,
  referralCode,
  report,
}: {
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  report: FanletterRelatedNewsReport;
}): FanletterRelatedNewsItem {
  const isFirstReport = isFanletterNewsFirstReportForContent(report);
  const isNsfw = isFanletterNewsReportNsfw(report);

  return {
    coverImageUrl: report.coverImageUrl,
    dek: report.dek,
    firstReportBadge: isFirstReport
      ? getFanletterNewsFirstReportBadgeLabel(report.locale)
      : null,
    href: buildPathWithReferral(
      `/${report.locale}/fanletter/news/${report.reportId}`,
      referralCode,
    ),
    isFirstReport,
    isNsfw,
    nsfwBadge: getFanletterNsfwCopy(report.locale).badge,
    publishedAt: formatRelatedNewsDate(report.sourcePublishedAt, report.locale),
    reporterName: getFanletterNewsReporterDisplayName(report),
    reportId: report.reportId,
    shouldBlur: shouldBlurFanletterNewsReport(report, nsfwOptInEnabled),
    sourceReveal: createRelatedNewsSourceRevealStatus(report),
    title: getFanletterNewsArticleDisplayTitle(report.title),
  };
}
