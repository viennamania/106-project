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
import {
  getFanletterNewsReporterProfile,
  getLatestFanletterNewsReports,
  type FanletterNewsReporterProfile,
} from "@/lib/fanletter-news-report-service";
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
  reporter?: string | string[];
};

type ReporterStat = {
  avatarImageUrl: string | null;
  count: number;
  latestReportAt: Date | null;
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
        reporterFilter: {
          allNews: "전체 뉴스 보기",
          body: (count: string) =>
            `${count}개의 AI 캐릭터 리포트를 작성했습니다. 이 팬 기자가 만든 뉴스만 모아볼 수 있습니다.`,
          eyebrow: "팬 기자 채널",
          title: (name: string) => `${name}의 FanLetter News`,
        },
        reporterDesk: "팬 기자 데스크",
        reporterNewsCta: "이 기자 뉴스 보기",
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
        reporterFilter: {
          allNews: "All news",
          body: (count: string) =>
            `${count} AI character reports published. View only the stories from this fan reporter.`,
          eyebrow: "Fan reporter channel",
          title: (name: string) => `${name}'s FanLetter News`,
        },
        reporterDesk: "Fan Reporter Desk",
        reporterNewsCta: "View reporter news",
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
  const reporterName = report.reporterName.trim();

  if (reporterName) {
    return reporterName;
  }

  const reporterId = report.reporterReferralCode.trim();

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

function getReporterNewsHref(
  locale: Locale,
  reporterReferralCode: string,
  referralCode: string | null,
) {
  return buildPathWithReferral(
    `/${locale}/fanletter/news?reporter=${encodeURIComponent(
      reporterReferralCode,
    )}`,
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
    const reportDate = report.sourcePublishedAt ?? report.createdAt ?? null;
    const latestReportAt =
      existing?.latestReportAt && reportDate
        ? existing.latestReportAt > reportDate
          ? existing.latestReportAt
          : reportDate
        : existing?.latestReportAt ?? reportDate;

    map.set(report.reporterReferralCode, {
      avatarImageUrl:
        existing?.avatarImageUrl ?? report.reporterAvatarImageUrl ?? null,
      count: (existing?.count ?? 0) + 1,
      latestReportAt,
      name: existing?.name ?? getReporterDisplayName(report),
      referralCode: report.reporterReferralCode,
    });
  }

  return Array.from(map.values())
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);
}

async function hydrateReporterStats(reporters: ReporterStat[]) {
  return Promise.all(
    reporters.map(async (reporter) => {
      const profile = await getFanletterNewsReporterProfile({
        reporterReferralCode: reporter.referralCode,
      });

      return {
        ...reporter,
        avatarImageUrl: profile?.avatarImageUrl ?? reporter.avatarImageUrl,
        count: profile?.reportCount ?? reporter.count,
        latestReportAt: profile?.latestReportAt ?? reporter.latestReportAt,
        name: profile?.displayName ?? reporter.name,
      };
    }),
  );
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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-black/50 sm:px-6 lg:px-8">
          <span>{today}</span>
          <span className="hidden sm:inline">{copy.edition}</span>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
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
      <div className="mx-auto grid max-w-7xl gap-2 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:px-6 lg:px-8">
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
      className="group relative block overflow-hidden border border-black/12 bg-[#111510] text-white shadow-[0_18px_44px_rgba(10,18,12,0.16)]"
      href={getReportHref(report, referralCode)}
    >
      <NewsImage
        blurred={shouldBlur}
        className="aspect-[4/5] min-h-[30rem] sm:aspect-[16/10] lg:min-h-[34rem]"
        nsfwLabel={nsfwCopy.badge}
        priority
        report={report}
        sizes="(max-width: 1024px) 100vw, 54rem"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/34 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 pt-24 sm:p-7 sm:pt-32">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center bg-[#44f26e] px-2.5 py-1 text-xs font-black text-black">
            {copy.lead}
          </span>
          <span className="inline-flex items-center border border-white/24 bg-white/12 px-2.5 py-1 text-xs font-bold text-white/84 backdrop-blur">
            {getAccessLabel(report, copy)}
          </span>
        </div>
        <p className="mt-4 text-[0.66rem] font-black uppercase tracking-[0.18em] text-white/58">
          {copy.leadKicker}
        </p>
        <h2
          className={`mt-2 max-w-4xl break-words text-[2.25rem] font-black leading-[1.05] tracking-normal text-white [word-break:keep-all] sm:text-[3.35rem] lg:text-[3.9rem] ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {title}
        </h2>
        <p
          className={`mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/78 sm:text-base sm:leading-7 ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {report.dek}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-bold text-white/62">
          <span className="inline-flex items-center gap-1.5">
            <PenLine className="size-3.5 text-[#44f26e]" />
            {getReporterDisplayName(report)}
          </span>
          {publishedAt ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5 text-[#44f26e]" />
              {publishedAt}
            </span>
          ) : null}
          <span className="font-black text-[#44f26e] group-hover:underline">
            {copy.read}
          </span>
        </div>
      </div>
    </Link>
  );
}

function HeroSideStory({
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
      className="group relative block overflow-hidden border border-black/12 bg-[#111510] text-white"
      href={getReportHref(report, referralCode)}
    >
      <NewsImage
        blurred={shouldBlur}
        className="aspect-[4/5] min-h-[15.5rem] sm:aspect-[16/10] lg:aspect-auto lg:h-[16.5rem]"
        nsfwLabel={nsfwCopy.badge}
        report={report}
        sizes="(max-width: 1024px) 50vw, 20rem"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/26 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="mb-2 flex flex-wrap gap-2 text-[0.64rem] font-black uppercase tracking-[0.1em]">
          <span className="bg-[#44f26e] px-2 py-1 text-black">
            {getAccessLabel(report, copy)}
          </span>
          {publishedAt ? (
            <span className="border border-white/20 bg-white/12 px-2 py-1 text-white/76">
              {publishedAt}
            </span>
          ) : null}
        </div>
        <h2
          className={`line-clamp-3 break-words text-xl font-black leading-6 text-white [word-break:keep-all] group-hover:text-[#44f26e] ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {title}
        </h2>
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
      className="group relative block overflow-hidden border border-black/12 bg-[#111510] text-white"
      href={getReportHref(report, referralCode)}
    >
      <NewsImage
        blurred={shouldBlur}
        className="aspect-[4/5] sm:aspect-[16/11]"
        nsfwLabel={nsfwCopy.badge}
        report={report}
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 24rem"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/26 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="flex flex-wrap gap-2 text-[0.68rem] font-black">
          <span className="bg-[#44f26e] px-2 py-1 text-black">
            {report.creatorName}
          </span>
          <span className="border border-white/20 bg-white/12 px-2 py-1 text-white/78">
            {getAccessLabel(report, copy)}
          </span>
        </div>
        <h2
          className={`mt-2 line-clamp-2 break-words text-xl font-black leading-6 text-white [word-break:keep-all] group-hover:text-[#44f26e] ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {title}
        </h2>
        <p
          className={`mt-2 line-clamp-2 text-sm font-medium leading-6 text-white/72 ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {report.dek}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-white/56">
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
  referralCode,
  reporters,
  selectedReporterReferralCode,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  referralCode: string | null;
  reporters: ReporterStat[];
  selectedReporterReferralCode: string | null;
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
        {reporters.map((reporter, index) => {
          const isSelected =
            reporter.referralCode === selectedReporterReferralCode;
          const latestReportAt = formatDate(reporter.latestReportAt, locale);

          return (
            <Link
              className={`group grid grid-cols-[2.65rem_minmax(0,1fr)] gap-3 border border-black/10 p-3 transition hover:border-[#19b84b] ${
                isSelected ? "bg-[#ecfff0]" : "bg-white hover:bg-[#f7fbf5]"
              }`}
              href={getReporterNewsHref(
                locale,
                reporter.referralCode,
                referralCode,
              )}
              key={reporter.referralCode}
            >
              <span className="relative flex size-10 items-center justify-center overflow-hidden rounded-full bg-[#111510] text-xs font-black text-[#44f26e]">
                {reporter.avatarImageUrl ? (
                  <Image
                    alt=""
                    aria-hidden="true"
                    className="object-cover"
                    fill
                    sizes="2.5rem"
                    src={reporter.avatarImageUrl}
                  />
                ) : (
                  reporter.name.trim().charAt(0).toUpperCase() ||
                  reporter.referralCode.charAt(0)
                )}
                <span className="absolute bottom-0 right-0 flex size-4 items-center justify-center bg-[#44f26e] text-[0.56rem] font-black text-black">
                  {index + 1}
                </span>
              </span>
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">
                      {reporter.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-bold text-black/42">
                      @{reporter.referralCode}
                    </p>
                  </div>
                  <span className="shrink-0 bg-[#44f26e] px-2 py-1 text-[0.68rem] font-black text-black">
                    {formatNumber(reporter.count, locale)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.66rem] font-bold text-black/46">
                  <span className="text-[#16702e] group-hover:underline">
                    {copy.reporterNewsCta}
                  </span>
                  {latestReportAt ? <span>{latestReportAt}</span> : null}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ReporterFilterBanner({
  copy,
  locale,
  newsHomeHref,
  profile,
  reporterReferralCode,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  newsHomeHref: string;
  profile: FanletterNewsReporterProfile | null;
  reporterReferralCode: string;
}) {
  const reporterName =
    profile?.displayName ??
    (locale === "ko"
      ? `${reporterReferralCode} 팬 기자`
      : `Fan reporter ${reporterReferralCode}`);
  const reportCount = formatNumber(profile?.reportCount ?? 0, locale);

  return (
    <section className="grid gap-4 border border-black/12 bg-white p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
      <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-full bg-[#111510] text-lg font-black text-[#44f26e]">
        {profile?.avatarImageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover"
            fill
            sizes="4rem"
            src={profile.avatarImageUrl}
          />
        ) : (
          reporterName.trim().charAt(0).toUpperCase() ||
          reporterReferralCode.charAt(0)
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[0.7rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
          {copy.reporterFilter.eyebrow}
        </p>
        <h2 className="mt-1 break-words text-2xl font-black leading-tight [word-break:keep-all]">
          {copy.reporterFilter.title(reporterName)}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-black/58">
          {copy.reporterFilter.body(reportCount)}
        </p>
      </div>
      <Link
        className="inline-flex h-11 items-center justify-center border border-black/14 px-4 text-sm font-black text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
        href={newsHomeHref}
      >
        {copy.reporterFilter.allNews}
      </Link>
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
          const nsfwCopy = getFanletterNsfwCopy(report.locale);
          const shouldBlur = shouldBlurReport(report, nsfwOptInEnabled);
          const title = getArticleDisplayTitle(report.title);

          return (
            <Link
              className="group grid grid-cols-[4.8rem_minmax(0,1fr)] gap-3 py-3 first:pt-0 last:pb-0"
              href={getReportHref(report, referralCode)}
              key={report.reportId}
            >
              <div className="relative">
                <NewsImage
                  blurred={shouldBlur}
                  className="aspect-[4/5] border border-black/10"
                  nsfwLabel={nsfwCopy.badge}
                  report={report}
                  sizes="5rem"
                />
                <span className="absolute left-1 top-1 flex size-6 items-center justify-center bg-[#44f26e] text-xs font-black leading-none text-black">
                  {index + 1}
                </span>
              </div>
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
  const activeReporterReferralCode = readFanletterReferralCode(query.reporter);
  const cookieStore = await cookies();
  const nsfwOptInEnabled = isFanletterNsfwOptedIn(
    cookieStore.get(FANLETTER_NSFW_OPT_IN_COOKIE)?.value,
  );
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const [allReports, reports, activeReporterProfile] = await Promise.all([
    getLatestFanletterNewsReports({ limit: 28, locale }),
    activeReporterReferralCode
      ? getLatestFanletterNewsReports({
          limit: 28,
          locale,
          reporterReferralCode: activeReporterReferralCode,
        })
      : getLatestFanletterNewsReports({ limit: 28, locale }),
    activeReporterReferralCode
      ? getFanletterNewsReporterProfile({
          reporterReferralCode: activeReporterReferralCode,
        })
      : Promise.resolve(null),
  ]);
  const nsfwReportCount = reports.filter(isNsfwReport).length;
  const leadReport =
    reports.find((report) => !shouldBlurReport(report, nsfwOptInEnabled)) ??
    reports[0];
  const restReports = leadReport
    ? reports.filter((report) => report.reportId !== leadReport.reportId)
    : [];
  const heroSideReports = restReports.slice(0, 2);
  const topStories = restReports.slice(2, 7);
  const featureReports = restReports.slice(7, 16);
  const latestReports = restReports.slice(16);
  const reporterStats = await hydrateReporterStats(getReporterStats(allReports));
  const shouldShowNsfwControl = nsfwReportCount > 0 || nsfwOptInEnabled;

  return (
    <main className="min-h-screen bg-[#f5f6f2] text-[#111510]">
      <NewsMasthead copy={copy} locale={locale} newsHomeHref={newsHomeHref} />
      <NewsTicker copy={copy} reports={reports.slice(0, 5)} />

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        {leadReport ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
            <div className="min-w-0 space-y-8">
              <div className="border-b border-black/12 pb-4">
                <p className="text-[0.72rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
                  {copy.issueLabel}
                </p>
                <h1 className="mt-2 max-w-4xl break-words text-[1.85rem] font-black leading-[1.08] [word-break:keep-all] sm:text-[2.65rem]">
                  {copy.allNews}
                </h1>
                <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-black/58 sm:text-base sm:leading-7">
                  {copy.dek}
                </p>
              </div>

              {activeReporterReferralCode ? (
                <ReporterFilterBanner
                  copy={copy}
                  locale={locale}
                  newsHomeHref={newsHomeHref}
                  profile={activeReporterProfile}
                  reporterReferralCode={activeReporterReferralCode}
                />
              ) : null}

              <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <LeadStory
                  copy={copy}
                  nsfwOptInEnabled={nsfwOptInEnabled}
                  referralCode={referralCode}
                  report={leadReport}
                />

                {heroSideReports.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    {heroSideReports.map((report) => (
                      <HeroSideStory
                        copy={copy}
                        key={report.reportId}
                        nsfwOptInEnabled={nsfwOptInEnabled}
                        referralCode={referralCode}
                        report={report}
                      />
                    ))}
                  </div>
                ) : null}
              </section>

              {shouldShowNsfwControl ? (
                <FanletterNsfwOptInControl
                  compact
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
              ) : null}

              {featureReports.length > 0 ? (
                <section>
                  <SectionHeader
                    eyebrow={copy.heroEyebrow}
                    icon={<Newspaper className="size-5" />}
                    title={copy.characterWire}
                  />
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                referralCode={referralCode}
                reporters={reporterStats}
                selectedReporterReferralCode={activeReporterReferralCode}
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
