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
  "recommended",
  "first",
  "latest",
  "unlock",
] as const;

export type FanletterRelatedNewsSort =
  (typeof FANLETTER_RELATED_NEWS_SORTS)[number];

export const DEFAULT_FANLETTER_RELATED_NEWS_SORT =
  "recommended" satisfies FanletterRelatedNewsSort;

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

const FANLETTER_NEWS_FIRST_PREFIX_PATTERN = /^\[(최초|First)\]\s*/i;
const FANLETTER_NEWS_TEMPLATE_PREFIX_PATTERN =
  /^\[(AI 팬 리포트|AI fan report)\]\s*/i;
const FANLETTER_NEWS_QUOTED_TEXT_PATTERN = /['"“”‘’]([^'"“”‘’]{2,120})['"“”‘’]/g;
const FANLETTER_NEWS_LOW_SIGNAL_SOURCE_TITLE_PATTERNS = [
  /^무료\s*공개\s*브이로그(?:\s*업로드)?$/i,
  /^공개\s*브이로그(?:\s*업로드)?$/i,
  /^새\s*브이로그(?:\s*업로드)?$/i,
  /^오늘의\s*브이로그(?:\s*업로드)?$/i,
  /^팬\s*전용\s*(?:유료\s*)?브이로그(?:\s*업로드)?$/i,
  /^유료\s*브이로그(?:\s*업로드)?$/i,
  /^브이로그\s*업로드$/i,
  /^원본\s*브이로그\s*업로드$/i,
  /^free\s+public\s+vlog(?:\s+upload)?$/i,
  /^public\s+vlog(?:\s+upload)?$/i,
  /^new\s+vlog(?:\s+upload)?$/i,
  /^today'?s\s+vlog(?:\s+upload)?$/i,
  /^fan[-\s]?only\s+(?:paid\s+)?vlog(?:\s+upload)?$/i,
  /^paid\s+vlog(?:\s+upload)?$/i,
  /^source\s+vlog\s+upload$/i,
  /^vlog\s+upload$/i,
] as const;

function normalizeFanletterNewsTitleText(title: string) {
  return title
    .replace(/\s+/g, " ")
    .replace(/\s+([,.:;!?])/g, "$1")
    .trim();
}

function normalizeFanletterNewsSourceTitleForComparison(title: string) {
  return normalizeFanletterNewsTitleText(title)
    .replace(/^['"“”‘’]+|['"“”‘’]+$/g, "")
    .replace(/[.。]+$/g, "")
    .trim();
}

function hasKoreanText(value: string) {
  return /[가-힣]/.test(value);
}

export function isFanletterNewsLowSignalSourceTitle(title: string) {
  const normalizedTitle =
    normalizeFanletterNewsSourceTitleForComparison(title);

  return FANLETTER_NEWS_LOW_SIGNAL_SOURCE_TITLE_PATTERNS.some((pattern) =>
    pattern.test(normalizedTitle),
  );
}

function getFanletterNewsGenericSourceLabel(title: string) {
  return hasKoreanText(title) ? "새 브이로그" : "new vlog";
}

function replaceQuotedLowSignalSourceTitles(title: string) {
  return title.replace(
    FANLETTER_NEWS_QUOTED_TEXT_PATTERN,
    (matchedText, quotedText: string) =>
      isFanletterNewsLowSignalSourceTitle(quotedText)
        ? getFanletterNewsGenericSourceLabel(title)
        : matchedText,
  );
}

function normalizeFanletterNewsTemplateTitle(title: string) {
  const titleWithoutTemplatePrefix = normalizeFanletterNewsTitleText(
    title.replace(FANLETTER_NEWS_TEMPLATE_PREFIX_PATTERN, ""),
  );

  if (isFanletterNewsLowSignalSourceTitle(titleWithoutTemplatePrefix)) {
    return hasKoreanText(titleWithoutTemplatePrefix)
      ? "새 브이로그 팬 리포트"
      : "New vlog fan report";
  }

  const koreanSourceReportMatch = titleWithoutTemplatePrefix.match(
    /^(.+?),\s*['"“”‘’](.+?)['"“”‘’]\s*(?:팬\s*)?리포트\s*공개$/i,
  );

  if (
    koreanSourceReportMatch &&
    isFanletterNewsLowSignalSourceTitle(koreanSourceReportMatch[2])
  ) {
    return `${koreanSourceReportMatch[1].trim()} 새 브이로그 팬 리포트 공개`;
  }

  const englishSourceReportMatch = titleWithoutTemplatePrefix.match(
    /^(.+?)\s+shares\s+(?:a\s+)?fan\s+report\s+for\s+['"“”‘’](.+?)['"“”‘’]$/i,
  );

  if (
    englishSourceReportMatch &&
    isFanletterNewsLowSignalSourceTitle(englishSourceReportMatch[2])
  ) {
    return `${englishSourceReportMatch[1].trim()} shares a new vlog fan report`;
  }

  return normalizeFanletterNewsTitleText(
    replaceQuotedLowSignalSourceTitles(titleWithoutTemplatePrefix),
  );
}

export function getFanletterNewsArticleDisplayTitle(title: string) {
  const firstPrefix = title.match(FANLETTER_NEWS_FIRST_PREFIX_PATTERN)?.[0] ?? "";
  const titleWithoutFirstPrefix = title.slice(firstPrefix.length);

  return normalizeFanletterNewsTitleText(
    `${firstPrefix}${normalizeFanletterNewsTemplateTitle(
      titleWithoutFirstPrefix,
    )}`,
  );
}

export function getFanletterNewsBareArticleDisplayTitle(title: string) {
  return getFanletterNewsArticleDisplayTitle(title).replace(
    FANLETTER_NEWS_FIRST_PREFIX_PATTERN,
    "",
  );
}

export function getFanletterNewsSourceDisplayTitle(
  title: string | null | undefined,
  locale: Locale,
) {
  const normalizedTitle = normalizeFanletterNewsTitleText(title ?? "");

  if (!normalizedTitle || isFanletterNewsLowSignalSourceTitle(normalizedTitle)) {
    return locale === "ko" ? "원본 브이로그" : "Source vlog";
  }

  return normalizedTitle;
}

function getFanletterRelatedNewsCardTitle(title: string) {
  return getFanletterNewsBareArticleDisplayTitle(title);
}

function getUniqueRelatedNewsImageUrls(values: Array<string | null | undefined>) {
  return [
    ...new Set(
      values
        .map((value) => value?.trim() ?? "")
        .filter(Boolean),
    ),
  ];
}

export function getFanletterNewsReportPreviewImageUrl(
  report: Pick<
    FanletterNewsReportDocument,
    "coverImageUrl" | "teaserImages" | "teaserImageUrls"
  >,
) {
  const reporterCroppedTeaserImageUrls =
    report.teaserImages
      ?.filter(
        (image) =>
          image.source === "reporter_cropped" &&
          image.imageUrl.trim() &&
          image.imageUrl.trim() !== image.sourceImageUrl.trim(),
      )
      .map((image) => image.imageUrl) ?? [];

  return (
    getUniqueRelatedNewsImageUrls([
      ...reporterCroppedTeaserImageUrls,
      ...(report.teaserImageUrls ?? []),
      ...(report.teaserImages ?? [])
        .filter((image) => image.source !== "reporter_cropped")
        .map((image) => image.imageUrl),
      report.coverImageUrl,
    ])[0] ?? null
  );
}

export function getFanletterNewsDisplayDek({
  locale,
  rawDek,
  sourceReveal,
}: {
  locale: Locale;
  rawDek: string;
  sourceReveal: FanletterRelatedNewsSourceReveal | null;
}) {
  if (locale !== "ko") {
    return rawDek
      .replace(
        /^A fan-reporter summary of .+?'s vlog using the five Ws and one H\.$/i,
        sourceReveal
          ? sourceReveal.unlocked
            ? "Fans opened the source vlog from this report."
            : "Fans are opening the source vlog from this report."
          : "Follow the source vlog and fan reactions from this report.",
      )
      .replace(
        /^Follow (.+?)'s source vlog and fan participation from one news page\.$/i,
        "Follow the moments fans are reacting to in $1's source vlog.",
      );
  }

  return rawDek
    .replace(
      /^.+?의 브이로그를 팬 기자 관점(?:에서|으로) 육하원칙으로 정리했습니다\.?$/,
      sourceReveal
        ? sourceReveal.unlocked
          ? "팬들이 원본 브이로그를 열어낸 리포트입니다."
          : "팬들이 함께 원본 브이로그를 열어가는 리포트입니다."
        : "원본 브이로그에서 팬들이 반응한 포인트를 이어보세요.",
    )
    .replace(
      /^(.+?)의 원본 브이로그와 팬 참여 흐름을 한 화면에서 확인하세요\.?$/,
      "$1의 원본 브이로그에서 팬들이 반응할 장면을 짚었습니다.",
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
  return getFanletterNewsDisplayDek({ locale, rawDek, sourceReveal });
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
    coverImageUrl: getFanletterNewsReportPreviewImageUrl(report),
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
