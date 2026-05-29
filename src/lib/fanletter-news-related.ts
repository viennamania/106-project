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

export const FANLETTER_RELATED_NEWS_SORTS = [
  "first",
  "latest",
  "unlock",
] as const;

export type FanletterRelatedNewsSort =
  (typeof FANLETTER_RELATED_NEWS_SORTS)[number];

export const DEFAULT_FANLETTER_RELATED_NEWS_SORT =
  "first" satisfies FanletterRelatedNewsSort;

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

function getFanletterRelatedNewsCardTitle(title: string) {
  return getFanletterNewsArticleDisplayTitle(title).replace(
    /^\[(최초|First)\]\s*/i,
    "",
  );
}

function getFanletterRelatedNewsCardDek({
  locale,
  rawDek,
  sourceReveal,
}: {
  locale: Locale;
  rawDek: string;
  sourceReveal: FanletterRelatedNewsSourceReveal | null;
}) {
  if (locale !== "ko") {
    return rawDek.replace(
      /^A fan-reporter summary of .+?'s vlog using the five Ws and one H\.$/i,
      sourceReveal
        ? sourceReveal.unlocked
          ? "Fans opened the source vlog from this report."
          : "Fans are opening the source vlog from this report."
        : "Follow the source vlog and fan reactions from this report.",
    );
  }

  return rawDek.replace(
    /^.+?의 브이로그를 팬 기자 관점(?:에서|으로) 육하원칙으로 정리했습니다\.?$/,
    sourceReveal
      ? sourceReveal.unlocked
        ? "팬들이 원본 브이로그를 열어낸 리포트입니다."
        : "팬들이 함께 원본 브이로그를 열어가는 리포트입니다."
      : "원본 브이로그와 팬 반응 포인트를 확인하세요.",
  );
}

export function readFanletterRelatedNewsSort(
  value?: string | string[] | null,
): FanletterRelatedNewsSort {
  const rawValue = Array.isArray(value) ? value[0] : value;

  return FANLETTER_RELATED_NEWS_SORTS.includes(
    rawValue as FanletterRelatedNewsSort,
  )
    ? (rawValue as FanletterRelatedNewsSort)
    : DEFAULT_FANLETTER_RELATED_NEWS_SORT;
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
  const sourceReveal = createRelatedNewsSourceRevealStatus(report);

  return {
    coverImageUrl: report.coverImageUrl,
    dek: getFanletterRelatedNewsCardDek({
      locale: report.locale,
      rawDek: report.dek,
      sourceReveal,
    }),
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
    sourceReveal,
    title: getFanletterRelatedNewsCardTitle(report.title),
  };
}
