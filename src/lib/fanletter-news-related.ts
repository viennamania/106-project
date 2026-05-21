import type { FanletterNewsReportDocument } from "@/lib/content";
import { getFanletterNsfwCopy } from "@/lib/fanletter-nsfw";
import type { Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";

export type FanletterRelatedNewsItem = {
  coverImageUrl: string | null;
  dek: string;
  href: string;
  isNsfw: boolean;
  nsfwBadge: string;
  publishedAt: string | null;
  reporterName: string;
  reportId: string;
  shouldBlur: boolean;
  title: string;
};

export function getFanletterNewsArticleDisplayTitle(title: string) {
  return title.replace(/^\[(AI 팬 리포트|AI fan report)\]\s*/i, "");
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

export function serializeFanletterRelatedNewsItem({
  nsfwOptInEnabled,
  referralCode,
  report,
}: {
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  report: FanletterNewsReportDocument;
}): FanletterRelatedNewsItem {
  const isNsfw = isFanletterNewsReportNsfw(report);

  return {
    coverImageUrl: report.coverImageUrl,
    dek: report.dek,
    href: buildPathWithReferral(
      `/${report.locale}/fanletter/news/${report.reportId}`,
      referralCode,
    ),
    isNsfw,
    nsfwBadge: getFanletterNsfwCopy(report.locale).badge,
    publishedAt: formatRelatedNewsDate(report.sourcePublishedAt, report.locale),
    reporterName: getFanletterNewsReporterDisplayName(report),
    reportId: report.reportId,
    shouldBlur: shouldBlurFanletterNewsReport(report, nsfwOptInEnabled),
    title: getFanletterNewsArticleDisplayTitle(report.title),
  };
}
