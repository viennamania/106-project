import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Clock3,
  FileText,
  Newspaper,
  PenLine,
  UserRound,
} from "lucide-react";

import { FanletterNsfwOptInControl } from "@/components/fanletter-nsfw-opt-in-control";
import type { FanletterNewsReportDocument } from "@/lib/content";
import { getLatestFanletterNewsReports } from "@/lib/fanletter-news-report-service";
import {
  FANLETTER_NSFW_OPT_IN_COOKIE,
  getFanletterNsfwCopy,
  isFanletterNsfwOptedIn,
} from "@/lib/fanletter-nsfw";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";

type FanletterNewsHomeSearchParams = {
  ref?: string | string[];
};

type ReporterStat = {
  count: number;
  name: string;
  referralCode: string;
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        access: {
          nsfw: "성인 팬 전용",
          paid: "팬 전용",
          public: "공개",
        },
        allNews: "AI 캐릭터 엔터테인먼트 뉴스룸",
        characterWire: "AI 캐릭터 와이어",
        dek:
          "팬 기자가 생성한 AI 캐릭터 브이로그 리포트를 엔터테인먼트 뉴스 포맷으로 모아 읽는 FanLetter News입니다.",
        edition: "AI 캐릭터·팬 리포트 전문 뉴스",
        emptyBody:
          "콘텐츠 상세 페이지에서 AI 리포트를 생성하면 이곳에 최신 뉴스가 모입니다.",
        emptyTitle: "아직 공개된 FanLetter 뉴스가 없습니다.",
        heroEyebrow: "FanLetter Entertainment News",
        issueLabel: "오늘의 FanLetter 엔터테인먼트 브리핑",
        latest: "최신 리포트",
        lead: "오늘의 리드",
        leadKicker: "FanLetter exclusive",
        navItems: ["톱뉴스", "팬 기자", "AI 캐릭터", "브이로그"],
        newsroomStats: "뉴스룸 현황",
        nsfwControl: {
          disabledBody:
            "NSFW 뉴스는 목록에 유지하되 성인 팬 전용 커버와 기사 미리보기를 블러 처리합니다. 켜면 선명하게 표시됩니다.",
          disabledTitle: "NSFW 뉴스 미리보기 블러",
          enabledBody:
            "NSFW 뉴스 미리보기가 선명하게 표시됩니다. 끄면 다시 커버와 기사 미리보기가 블러 처리됩니다.",
          enabledTitle: "NSFW 뉴스 표시 중",
          hiddenCountText: (count: string) =>
            `블러 처리된 NSFW 뉴스 ${count}개`,
        },
        read: "기사 보기",
        reporterDesk: "팬 기자 데스크",
        reporterRank: "활동 기자",
        siteName: "FanLetter News",
        ticker: "뉴스 브리핑",
        topStories: "많이 본 뉴스",
      }
    : {
        access: {
          nsfw: "Adult fan-only",
          paid: "Fan-only",
          public: "Public",
        },
        allNews: "AI Character Entertainment Newsroom",
        characterWire: "AI Character Wire",
        dek:
          "FanLetter News collects AI character vlog reports from fan reporters in an entertainment-news format.",
        edition: "AI character and fan-report news",
        emptyBody:
          "Create an AI report from a content detail page and the latest stories will appear here.",
        emptyTitle: "No FanLetter news has been published yet.",
        heroEyebrow: "FanLetter Entertainment News",
        issueLabel: "Today's FanLetter entertainment briefing",
        latest: "Latest Reports",
        lead: "Lead Story",
        leadKicker: "FanLetter exclusive",
        navItems: ["Top stories", "Fan reporters", "AI characters", "Vlogs"],
        newsroomStats: "Newsroom Status",
        nsfwControl: {
          disabledBody:
            "NSFW stories remain listed, with adult fan-only covers and story previews blurred until opt-in.",
          disabledTitle: "NSFW news previews blurred",
          enabledBody:
            "NSFW news previews are visible. Turn this off to blur covers and story previews again.",
          enabledTitle: "NSFW news visible",
          hiddenCountText: (count: string) => `${count} NSFW stories blurred`,
        },
        read: "Read story",
        reporterDesk: "Fan Reporter Desk",
        reporterRank: "Active reporters",
        siteName: "FanLetter News",
        ticker: "News Briefing",
        topStories: "Most Read",
      };
}

function formatDate(value: Date | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(value);
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function getArticleDisplayTitle(title: string) {
  return title.replace(/^\[(AI 팬 리포트|AI fan report)\]\s*/i, "");
}

function getReporterDisplayName(report: FanletterNewsReportDocument) {
  const reporterId = report.reporterReferralCode.trim();

  if (!reporterId) {
    return report.reporterName;
  }

  return report.locale === "ko"
    ? `${reporterId} 팬 기자`
    : `Fan reporter ${reporterId}`;
}

function getReportHref(
  report: FanletterNewsReportDocument,
  referralCode: string | null,
) {
  return buildPathWithReferral(
    `/${report.locale}/fanletter/news/${report.reportId}`,
    referralCode,
  );
}

function getAccessLabel(
  report: FanletterNewsReportDocument,
  copy: ReturnType<typeof getCopy>,
) {
  if (report.contentMaturityRating === "nsfw") {
    return copy.access.nsfw;
  }

  return report.priceType === "paid" ? copy.access.paid : copy.access.public;
}

function isNsfwReport(report: FanletterNewsReportDocument) {
  return report.contentMaturityRating === "nsfw";
}

function shouldBlurReport(
  report: FanletterNewsReportDocument,
  nsfwOptInEnabled: boolean,
) {
  return isNsfwReport(report) && !nsfwOptInEnabled;
}

function getReporterStats(reports: FanletterNewsReportDocument[]) {
  const map = new Map<string, ReporterStat>();

  for (const report of reports) {
    const existing = map.get(report.reporterReferralCode);

    map.set(report.reporterReferralCode, {
      count: (existing?.count ?? 0) + 1,
      name: getReporterDisplayName(report),
      referralCode: report.reporterReferralCode,
    });
  }

  return Array.from(map.values())
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);
}

function NewsImage({
  blurred = false,
  className,
  nsfwLabel,
  priority = false,
  report,
  sizes,
}: {
  blurred?: boolean;
  className?: string;
  nsfwLabel?: string;
  priority?: boolean;
  report: FanletterNewsReportDocument;
  sizes: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-[#0d120f] ${className ?? ""}`}>
      {report.coverImageUrl ? (
        <Image
          alt=""
          aria-hidden="true"
          className={
            blurred
              ? "scale-[1.06] object-cover blur-md brightness-[0.68] saturate-[0.86]"
              : "object-cover"
          }
          fill
          priority={priority}
          sizes={sizes}
          src={report.coverImageUrl}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#07100b,#111510_52%,#24372a)] text-[#44f26e]">
          <Newspaper className="size-12" />
        </div>
      )}
      {blurred ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/34 p-3 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-black/62 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-white shadow-[0_14px_34px_rgba(0,0,0,0.3)]">
            <AlertTriangle className="size-3.5 text-rose-300" />
            {nsfwLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function NewsMasthead({
  copy,
  locale,
  newsHomeHref,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  newsHomeHref: string;
}) {
  const today = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
  }).format(new Date());

  return (
    <header className="border-b border-black/16 bg-white text-[#111510]">
      <div className="border-b border-black/10 bg-[#f3f4ef]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-black/50 sm:px-6 lg:px-8">
          <span>{today}</span>
          <span className="hidden sm:inline">{copy.edition}</span>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 border-b-2 border-[#111510] pb-3">
          <Link
            className="inline-flex items-center text-[2.25rem] font-black leading-none tracking-normal !text-[#111510] sm:text-[4.5rem]"
            href={newsHomeHref}
          >
            {copy.siteName}
          </Link>
          <span className="hidden shrink-0 border border-black/16 px-3 py-1.5 text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#16702e] sm:inline-flex">
            {copy.heroEyebrow}
          </span>
        </div>
        <nav
          aria-label={copy.siteName}
          className="flex gap-5 overflow-x-auto border-b border-black/10 py-3"
        >
          {copy.navItems.map((item) => (
            <span
              className="shrink-0 text-[0.76rem] font-black uppercase tracking-[0.12em] text-black/58"
              key={item}
            >
              {item}
            </span>
          ))}
        </nav>
      </div>
    </header>
  );
}

function NewsTicker({
  copy,
  reports,
}: {
  copy: ReturnType<typeof getCopy>;
  reports: FanletterNewsReportDocument[];
}) {
  if (reports.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-black/12 bg-white text-[#111510]">
      <div className="mx-auto grid max-w-6xl gap-2 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:px-6 lg:px-8">
        <div className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
          {copy.ticker}
        </div>
        <div className="flex min-w-0 gap-2 overflow-x-auto text-sm font-bold text-black/68">
          {reports.map((report) => (
            <span
              className="shrink-0 border-l border-black/12 pl-3"
              key={report.reportId}
            >
              {getArticleDisplayTitle(report.title)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  icon,
  title,
}: {
  eyebrow?: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3 border-b-2 border-[#111510] pb-3">
      <div>
        {eyebrow ? (
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#16702e]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-xl font-black tracking-normal">{title}</h2>
      </div>
      <span className="text-[#16702e]">{icon}</span>
    </div>
  );
}

function LeadStory({
  copy,
  nsfwOptInEnabled,
  referralCode,
  report,
}: {
  copy: ReturnType<typeof getCopy>;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  report: FanletterNewsReportDocument;
}) {
  const publishedAt = formatDate(report.sourcePublishedAt, report.locale);
  const nsfwCopy = getFanletterNsfwCopy(report.locale);
  const shouldBlur = shouldBlurReport(report, nsfwOptInEnabled);
  const title = getArticleDisplayTitle(report.title);

  return (
    <Link
      className="group grid gap-5 border-b border-black/16 bg-white pb-6 lg:grid-cols-[minmax(0,1fr)_18.5rem] lg:items-start"
      href={getReportHref(report, referralCode)}
    >
      <NewsImage
        blurred={shouldBlur}
        className="order-2 aspect-[16/10] border border-black/10"
        nsfwLabel={nsfwCopy.badge}
        priority
        report={report}
        sizes="(max-width: 1024px) 100vw, 20rem"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center border border-[#16702e]/30 bg-[#ecfff0] px-2.5 py-1 text-xs font-black text-[#16702e]">
            {copy.lead}
          </span>
          <span className="inline-flex items-center border border-black/12 px-2.5 py-1 text-xs font-bold text-black/58">
            {getAccessLabel(report, copy)}
          </span>
        </div>
        <p className="mt-4 text-[0.66rem] font-black uppercase tracking-[0.18em] text-black/38">
          {copy.leadKicker}
        </p>
        <h1
          className={`mt-2 break-words text-[2.1rem] font-black leading-[1.12] tracking-normal [word-break:keep-all] sm:text-[3.05rem] ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {title}
        </h1>
        <p
          className={`mt-3 max-w-3xl text-base font-semibold leading-7 text-black/62 ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {report.dek}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-bold text-black/44">
          <span className="inline-flex items-center gap-1.5">
            <PenLine className="size-3.5 text-[#16702e]" />
            {getReporterDisplayName(report)}
          </span>
          {publishedAt ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5 text-[#16702e]" />
              {publishedAt}
            </span>
          ) : null}
          <span className="font-black text-[#16702e] group-hover:underline">
            {copy.read}
          </span>
        </div>
      </div>
    </Link>
  );
}

function CompactStory({
  copy,
  nsfwOptInEnabled,
  referralCode,
  report,
}: {
  copy: ReturnType<typeof getCopy>;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  report: FanletterNewsReportDocument;
}) {
  const publishedAt = formatDate(report.sourcePublishedAt, report.locale);
  const nsfwCopy = getFanletterNsfwCopy(report.locale);
  const shouldBlur = shouldBlurReport(report, nsfwOptInEnabled);
  const title = getArticleDisplayTitle(report.title);

  return (
    <Link
      className="group grid min-w-0 grid-cols-[5.4rem_minmax(0,1fr)] gap-3 border-b border-black/10 pb-4 last:border-b-0 last:pb-0"
      href={getReportHref(report, referralCode)}
    >
      <NewsImage
        blurred={shouldBlur}
        className="aspect-[4/5] border border-black/10"
        nsfwLabel={nsfwCopy.badge}
        report={report}
        sizes="5.5rem"
      />
      <div className="min-w-0">
        <p className="text-[0.68rem] font-black text-[#16702e]">
          {getAccessLabel(report, copy)}
        </p>
        <h2
          className={`mt-1 line-clamp-2 break-words text-base font-black leading-5 [word-break:keep-all] group-hover:text-[#16702e] ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {title}
        </h2>
        <p
          className={`mt-1 line-clamp-2 text-sm font-medium leading-5 text-black/58 ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {report.dek}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-[0.68rem] font-bold text-black/42">
          {publishedAt ? <span>{publishedAt}</span> : null}
          <span>{getReporterDisplayName(report)}</span>
        </div>
      </div>
    </Link>
  );
}

function FeatureCard({
  copy,
  nsfwOptInEnabled,
  referralCode,
  report,
}: {
  copy: ReturnType<typeof getCopy>;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  report: FanletterNewsReportDocument;
}) {
  const publishedAt = formatDate(report.sourcePublishedAt, report.locale);
  const nsfwCopy = getFanletterNsfwCopy(report.locale);
  const shouldBlur = shouldBlurReport(report, nsfwOptInEnabled);
  const title = getArticleDisplayTitle(report.title);

  return (
    <Link
      className="group block border-t border-black/14 bg-white pt-4"
      href={getReportHref(report, referralCode)}
    >
      <NewsImage
        blurred={shouldBlur}
        className="aspect-[16/10] border border-black/10"
        nsfwLabel={nsfwCopy.badge}
        report={report}
        sizes="(max-width: 768px) 100vw, 22rem"
      />
      <div className="p-4">
        <div className="flex flex-wrap gap-2 text-[0.68rem] font-black text-[#16702e]">
          <span>{report.creatorName}</span>
          <span>{getAccessLabel(report, copy)}</span>
        </div>
        <h2
          className={`mt-2 line-clamp-2 break-words text-xl font-black leading-6 [word-break:keep-all] group-hover:text-[#16702e] ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {title}
        </h2>
        <p
          className={`mt-2 line-clamp-3 text-sm font-medium leading-6 text-black/58 ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {report.dek}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-black/42">
          {publishedAt ? <span>{publishedAt}</span> : null}
          <span>{getReporterDisplayName(report)}</span>
        </div>
      </div>
    </Link>
  );
}

function ReporterRank({
  copy,
  locale,
  reporters,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  reporters: ReporterStat[];
}) {
  if (reporters.length === 0) {
    return null;
  }

  return (
    <section className="border border-black/12 bg-white p-4">
      <SectionHeader
        icon={<PenLine className="size-5" />}
        title={copy.reporterRank}
      />
      <div className="space-y-3">
        {reporters.map((reporter, index) => (
          <div
            className="flex items-center justify-between gap-3"
            key={reporter.referralCode}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center border border-black/14 bg-[#f5f6f2] text-xs font-black text-[#16702e]">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{reporter.name}</p>
                <p className="text-xs font-bold text-black/42">
                  {reporter.referralCode}
                </p>
              </div>
            </div>
            <span className="shrink-0 bg-[#44f26e] px-2.5 py-1 text-xs font-black text-black">
              {formatNumber(reporter.count, locale)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function RankedStoryList({
  copy,
  nsfwOptInEnabled,
  referralCode,
  reports,
}: {
  copy: ReturnType<typeof getCopy>;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  reports: FanletterNewsReportDocument[];
}) {
  if (reports.length === 0) {
    return null;
  }

  return (
    <section className="border border-black/12 bg-white p-4">
      <SectionHeader
        icon={<Newspaper className="size-5" />}
        title={copy.topStories}
      />
      <div className="divide-y divide-black/10">
        {reports.map((report, index) => {
          const publishedAt = formatDate(report.sourcePublishedAt, report.locale);
          const shouldBlur = shouldBlurReport(report, nsfwOptInEnabled);
          const title = getArticleDisplayTitle(report.title);

          return (
            <Link
              className="group grid grid-cols-[2rem_minmax(0,1fr)] gap-3 py-3 first:pt-0 last:pb-0"
              href={getReportHref(report, referralCode)}
              key={report.reportId}
            >
              <span className="pt-0.5 text-xl font-black leading-none text-[#16702e]">
                {index + 1}
              </span>
              <div className="min-w-0">
                <h2
                  className={`line-clamp-2 break-words text-base font-black leading-5 [word-break:keep-all] group-hover:text-[#16702e] ${
                    shouldBlur ? "select-none blur-[2px]" : ""
                  }`}
                >
                  {title}
                </h2>
                <div className="mt-2 flex flex-wrap gap-2 text-[0.68rem] font-bold text-black/42">
                  <span>{getAccessLabel(report, copy)}</span>
                  {publishedAt ? <span>{publishedAt}</span> : null}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const copy = getCopy(locale);

  return {
    title: `${copy.siteName} | FanLetter`,
    description: copy.dek,
  };
}

export default async function LocalizedFanletterNewsHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsHomeSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const cookieStore = await cookies();
  const nsfwOptInEnabled = isFanletterNsfwOptedIn(
    cookieStore.get(FANLETTER_NSFW_OPT_IN_COOKIE)?.value,
  );
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const reports = await getLatestFanletterNewsReports({ limit: 28, locale });
  const nsfwReportCount = reports.filter(isNsfwReport).length;
  const [leadReport, ...restReports] = reports;
  const topStories = restReports.slice(0, 5);
  const featureReports = restReports.slice(5, 11);
  const latestReports = restReports.slice(11);
  const reporterStats = getReporterStats(reports);
  const shouldShowNsfwControl = nsfwReportCount > 0 || nsfwOptInEnabled;

  return (
    <main className="min-h-screen bg-[#f5f6f2] text-[#111510]">
      <NewsMasthead copy={copy} locale={locale} newsHomeHref={newsHomeHref} />
      <NewsTicker copy={copy} reports={reports.slice(0, 5)} />

      <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        {shouldShowNsfwControl ? (
          <div className="mb-5">
            <FanletterNsfwOptInControl
              disabledBody={copy.nsfwControl.disabledBody}
              disabledTitle={copy.nsfwControl.disabledTitle}
              enabled={nsfwOptInEnabled}
              enabledBody={copy.nsfwControl.enabledBody}
              enabledTitle={copy.nsfwControl.enabledTitle}
              hiddenCount={nsfwReportCount}
              hiddenCountText={copy.nsfwControl.hiddenCountText(
                formatNumber(nsfwReportCount, locale),
              )}
              locale={locale}
              tone={nsfwOptInEnabled ? "dark" : "light"}
            />
          </div>
        ) : null}

        {leadReport ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <div className="min-w-0 space-y-8">
              <div className="grid gap-4 border-b border-black/12 pb-4 sm:grid-cols-[minmax(0,1fr)_18rem] sm:items-end">
                <div>
                  <p className="text-[0.72rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
                    {copy.issueLabel}
                  </p>
                  <h1 className="mt-2 break-words text-[2rem] font-black leading-[1.12] [word-break:keep-all] sm:text-[2.8rem]">
                    {copy.allNews}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-black/58 sm:text-base sm:leading-7">
                    {copy.dek}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="border border-black/10 bg-white p-3">
                    <p className="text-xl font-black">
                      {formatNumber(reports.length, locale)}
                    </p>
                    <p className="mt-1 text-[0.6rem] font-black uppercase tracking-[0.1em] text-black/42">
                      News
                    </p>
                  </div>
                  <div className="border border-black/10 bg-white p-3">
                    <p className="text-xl font-black">
                      {formatNumber(reporterStats.length, locale)}
                    </p>
                    <p className="mt-1 text-[0.6rem] font-black uppercase tracking-[0.1em] text-black/42">
                      Desk
                    </p>
                  </div>
                  <div className="border border-black/10 bg-white p-3">
                    <p className="text-xl font-black">
                      {formatNumber(nsfwReportCount, locale)}
                    </p>
                    <p className="mt-1 text-[0.6rem] font-black uppercase tracking-[0.1em] text-black/42">
                      NSFW
                    </p>
                  </div>
                </div>
              </div>

              <LeadStory
                copy={copy}
                nsfwOptInEnabled={nsfwOptInEnabled}
                referralCode={referralCode}
                report={leadReport}
              />

              {featureReports.length > 0 ? (
                <section>
                  <SectionHeader
                    eyebrow={copy.heroEyebrow}
                    icon={<Newspaper className="size-5" />}
                    title={copy.characterWire}
                  />
                  <div className="grid gap-5 sm:grid-cols-2">
                    {featureReports.map((report) => (
                      <FeatureCard
                        copy={copy}
                        key={report.reportId}
                        nsfwOptInEnabled={nsfwOptInEnabled}
                        referralCode={referralCode}
                        report={report}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {latestReports.length > 0 ? (
                <section>
                  <SectionHeader
                    icon={<FileText className="size-5" />}
                    title={copy.latest}
                  />
                  <div className="grid gap-4 border border-black/10 bg-white p-4 sm:grid-cols-2">
                    {latestReports.map((report) => (
                      <CompactStory
                        copy={copy}
                        key={report.reportId}
                        nsfwOptInEnabled={nsfwOptInEnabled}
                        referralCode={referralCode}
                        report={report}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <aside className="space-y-5 lg:sticky lg:top-4">
              <RankedStoryList
                copy={copy}
                nsfwOptInEnabled={nsfwOptInEnabled}
                referralCode={referralCode}
                reports={topStories}
              />

              <ReporterRank
                copy={copy}
                locale={locale}
                reporters={reporterStats}
              />

              <section className="border border-black/12 bg-white p-4">
                <SectionHeader
                  icon={<FileText className="size-5" />}
                  title={copy.newsroomStats}
                />
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[#f5f6f2] p-3">
                    <p className="text-lg font-black">
                      {formatNumber(reports.length, locale)}
                    </p>
                    <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.1em] text-black/42">
                      News
                    </p>
                  </div>
                  <div className="bg-[#f5f6f2] p-3">
                    <p className="text-lg font-black">
                      {formatNumber(reporterStats.length, locale)}
                    </p>
                    <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.1em] text-black/42">
                      Desk
                    </p>
                  </div>
                  <div className="bg-[#f5f6f2] p-3">
                    <p className="text-lg font-black">
                      {formatNumber(nsfwReportCount, locale)}
                    </p>
                    <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.1em] text-black/42">
                      NSFW
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        ) : (
          <section className="mt-6 rounded-lg border border-black/10 bg-white p-8 text-center">
            <UserRound className="mx-auto size-12 text-[#16702e]" />
            <h2 className="mt-4 text-2xl font-black">{copy.emptyTitle}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-black/58">
              {copy.emptyBody}
            </p>
          </section>
        )}
      </section>
    </main>
  );
}
