import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  FileText,
  Newspaper,
  PenLine,
  Sparkles,
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
  getFanletterNewsCharacterStats,
  type FanletterNewsCharacterStat,
} from "@/lib/fanletter-news-character-directory";
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
        characterDirectory: {
          body:
            "뉴스가 생성된 AI 캐릭터 채널을 한곳에서 확인하세요. 캐릭터별 최신 리포트와 팬 전용 브이로그 흐름을 바로 이어볼 수 있습니다.",
          cta: "뉴스 AI 캐릭터 전체 보기",
          fanOnly: "팬 전용",
          latest: "최근 기사",
          news: "뉴스",
          open: "캐릭터 채널 보기",
          title: "뉴스 속 AI 캐릭터",
        },
        characterWire: "AI 캐릭터 와이어",
        dek:
          "팬 기자가 생성한 AI 캐릭터 브이로그 리포트를 엔터테인먼트 뉴스 포맷으로 모아 읽는 FanLetter News입니다.",
        edition: "AI 캐릭터·팬 리포트 전문 뉴스",
        emptyBody:
          "콘텐츠 상세 페이지에서 AI 리포트를 생성하면 이곳에 최신 뉴스가 모입니다.",
        emptyReporterBody: (name: string) =>
          `${name}가 만든 공개 뉴스가 아직 없습니다. 전체 뉴스룸에서 다른 팬 기자의 리포트를 먼저 확인해보세요.`,
        emptyReporterTitle: (name: string) => `${name}의 뉴스가 아직 없습니다.`,
        emptyTitle: "아직 공개된 FanLetter 뉴스가 없습니다.",
        heroEyebrow: "FanLetter Entertainment News",
        issueLabel: "오늘의 FanLetter 엔터테인먼트 브리핑",
        latest: "최신 리포트",
        lead: "오늘의 리드",
        leadKicker: "FanLetter exclusive",
        navItems: ["톱뉴스", "팬 기자", "AI 캐릭터", "브이로그"],
        photoDesk: "포토 뉴스",
        photoDeskBody:
          "커버 이미지가 좋은 AI 캐릭터 뉴스를 한눈에 훑어볼 수 있게 모았습니다.",
        newsroomStats: "뉴스룸 현황",
        newsroomStatLabels: {
          news: "뉴스",
          nsfw: "NSFW",
          reporters: "기자",
        },
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
        reporterReportUnit: "뉴스",
        reporterRank: "활동 기자",
        siteName: "FanLetter News",
        ticker: "뉴스 브리핑",
        topStories: "주요 뉴스",
      }
    : {
        access: {
          nsfw: "Adult fan-only",
          paid: "Fan-only",
          public: "Public",
        },
        allNews: "AI Character Entertainment Newsroom",
        characterDirectory: {
          body:
            "Browse the AI character channels generating FanLetter News, then jump into each character's latest reports and fan-only vlog stream.",
          cta: "All news AI characters",
          fanOnly: "Fan-only",
          latest: "Latest story",
          news: "News",
          open: "View character channel",
          title: "AI Characters In The News",
        },
        characterWire: "AI Character Wire",
        dek:
          "FanLetter News collects AI character vlog reports from fan reporters in an entertainment-news format.",
        edition: "AI character and fan-report news",
        emptyBody:
          "Create an AI report from a content detail page and the latest stories will appear here.",
        emptyReporterBody: (name: string) =>
          `${name} has not published fan-reporter news yet. Browse the full newsroom for other fan reports.`,
        emptyReporterTitle: (name: string) =>
          `${name} has no news yet.`,
        emptyTitle: "No FanLetter news has been published yet.",
        heroEyebrow: "FanLetter Entertainment News",
        issueLabel: "Today's FanLetter entertainment briefing",
        latest: "Latest Reports",
        lead: "Lead Story",
        leadKicker: "FanLetter exclusive",
        navItems: ["Top stories", "Fan reporters", "AI characters", "Vlogs"],
        photoDesk: "Photo Desk",
        photoDeskBody:
          "A visual scan of AI character stories with the strongest cover moments.",
        newsroomStats: "Newsroom Status",
        newsroomStatLabels: {
          news: "News",
          nsfw: "NSFW",
          reporters: "Desk",
        },
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
        reporterReportUnit: "Stories",
        reporterRank: "Active reporters",
        siteName: "FanLetter News",
        ticker: "News Briefing",
        topStories: "Top Stories",
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

function getReporterFallbackDisplayName(locale: Locale, referralCode: string) {
  return locale === "ko"
    ? `${referralCode} 팬 기자`
    : `Fan reporter ${referralCode}`;
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

function isPreferredLeadReport(report: FanletterNewsReportDocument) {
  const title = `${report.title} ${report.sourceTitle}`;

  return (
    Boolean(report.coverImageUrl) &&
    !title.toLowerCase().includes("fanletter ai 팬 리포트") &&
    !title.toLowerCase().includes("fanletter ai fan report")
  );
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
  const hydrated = await Promise.all(
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

  return hydrated.sort((left, right) => right.count - left.count).slice(0, 5);
}

function NewsImage({
  blurred = false,
  className,
  imageClassName = "object-cover",
  nsfwLabel,
  priority = false,
  report,
  sizes,
}: {
  blurred?: boolean;
  className?: string;
  imageClassName?: string;
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
              ? `scale-[1.06] blur-md brightness-[0.68] saturate-[0.86] ${imageClassName}`
              : imageClassName
          }
          fill
          loading={priority ? "eager" : undefined}
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
  charactersHref,
  copy,
  locale,
  navigationBaseHref,
  newsHomeHref,
}: {
  charactersHref: string;
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  navigationBaseHref: string;
  newsHomeHref: string;
}) {
  const today = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
  }).format(new Date());
  const navHrefs = [
    `${navigationBaseHref}#top-stories`,
    `${navigationBaseHref}#fan-reporters`,
    charactersHref,
    `${navigationBaseHref}#latest-news`,
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-black/16 bg-white text-[#111510] shadow-[0_8px_24px_rgba(17,21,16,0.06)] sm:static sm:z-auto sm:shadow-none">
      <div className="border-b border-black/10 bg-[#f3f4ef]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-black/50 sm:px-6 sm:py-2 sm:text-[0.68rem] sm:tracking-[0.14em] lg:px-8">
          <span>{today}</span>
          <span className="hidden sm:inline">{copy.edition}</span>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 sm:pt-4 lg:px-8">
        <div className="flex items-end justify-between gap-4 border-b-2 border-[#111510] pb-2.5 sm:pb-3">
          <Link
            className="inline-flex items-center text-[1.82rem] font-black leading-none tracking-normal !text-[#111510] sm:text-[4.5rem]"
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
          className="flex gap-4 overflow-x-auto border-b border-black/10 py-2.5 [scrollbar-width:none] sm:gap-5 sm:py-3 [&::-webkit-scrollbar]:hidden"
        >
          {copy.navItems.map((item, index) => (
            <Link
              className="shrink-0 border-r border-black/10 pr-4 text-[0.7rem] font-black uppercase tracking-[0.1em] text-black/58 transition last:border-r-0 last:pr-0 hover:text-[#16702e] sm:text-[0.76rem] sm:tracking-[0.12em]"
              href={navHrefs[index] ?? navigationBaseHref}
              key={item}
            >
              {item}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function NewsTicker({
  copy,
  referralCode,
  reports,
}: {
  copy: ReturnType<typeof getCopy>;
  referralCode: string | null;
  reports: FanletterNewsReportDocument[];
}) {
  if (reports.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-black/12 bg-white text-[#111510]">
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)] items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 lg:px-8">
        <div className="inline-flex h-7 items-center bg-[#111510] px-2.5 text-[0.62rem] font-black uppercase tracking-[0.12em] text-white sm:bg-transparent sm:px-0 sm:text-[0.68rem] sm:tracking-[0.16em] sm:text-[#16702e]">
          {copy.ticker}
        </div>
        <div className="flex min-w-0 gap-2 overflow-x-auto text-xs font-bold text-black/68 [scrollbar-width:none] sm:text-sm [&::-webkit-scrollbar]:hidden">
          {reports.map((report) => (
            <Link
              className="max-w-[18rem] shrink-0 truncate border-l border-black/12 pl-3 transition first:border-l-0 first:pl-0 hover:text-[#16702e] sm:max-w-none"
              href={getReportHref(report, referralCode)}
              key={report.reportId}
            >
              {getArticleDisplayTitle(report.title)}
            </Link>
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
    <div className="mb-3 flex items-end justify-between gap-3 border-b-2 border-[#111510] pb-2.5 sm:mb-4 sm:pb-3">
      <div>
        {eyebrow ? (
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#16702e]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-lg font-black tracking-normal sm:text-xl">
          {title}
        </h2>
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
        className="aspect-[16/9] sm:aspect-[16/10] sm:min-h-[30rem] lg:min-h-[34rem]"
        nsfwLabel={nsfwCopy.badge}
        priority
        report={report}
        sizes="(max-width: 1024px) 100vw, 54rem"
      />
      <div className="hidden sm:absolute sm:inset-0 sm:block sm:bg-gradient-to-t sm:from-black/90 sm:via-black/34 sm:to-transparent" />
      <div className="relative border-t border-black/10 bg-white p-4 sm:absolute sm:inset-x-0 sm:bottom-0 sm:border-t-0 sm:bg-transparent sm:p-7 sm:pt-32">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center bg-[#44f26e] px-2.5 py-1 text-[0.72rem] font-black text-black sm:text-xs">
            {copy.lead}
          </span>
          <span className="inline-flex items-center border border-black/10 bg-[#f5f6f2] px-2.5 py-1 text-[0.72rem] font-bold text-black/56 backdrop-blur sm:border-white/24 sm:bg-white/12 sm:text-xs sm:text-white/84">
            {getAccessLabel(report, copy)}
          </span>
        </div>
        <p className="mt-3 text-[0.62rem] font-black uppercase tracking-[0.16em] text-black/42 sm:mt-4 sm:text-[0.66rem] sm:tracking-[0.18em] sm:text-white/58">
          {copy.leadKicker}
        </p>
        <h2
          className={`mt-2 line-clamp-3 max-w-4xl break-words text-[1.55rem] font-black leading-[1.1] tracking-normal text-[#111510] [word-break:keep-all] sm:line-clamp-none sm:text-[3.35rem] sm:leading-[1.05] sm:text-white lg:text-[3.9rem] ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {title}
        </h2>
        <p
          className={`mt-2 line-clamp-2 max-w-2xl text-sm font-semibold leading-6 text-black/58 sm:mt-3 sm:line-clamp-none sm:text-base sm:leading-7 sm:text-white/78 ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {report.dek}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.72rem] font-bold text-black/46 sm:mt-4 sm:gap-3 sm:text-xs sm:text-white/62">
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
      className="group grid grid-cols-[7rem_minmax(0,1fr)] overflow-hidden border border-black/12 bg-white text-[#111510] sm:relative sm:block sm:bg-[#111510] sm:text-white"
      href={getReportHref(report, referralCode)}
    >
      <NewsImage
        blurred={shouldBlur}
        className="h-full min-h-[8.5rem] sm:aspect-[16/10] sm:h-auto sm:min-h-[15.5rem] lg:aspect-auto lg:h-[16.5rem]"
        nsfwLabel={nsfwCopy.badge}
        report={report}
        sizes="(max-width: 640px) 7rem, (max-width: 1024px) 50vw, 20rem"
      />
      <div className="hidden sm:absolute sm:inset-0 sm:block sm:bg-gradient-to-t sm:from-black/86 sm:via-black/26 sm:to-transparent" />
      <div className="min-w-0 p-3 sm:absolute sm:inset-x-0 sm:bottom-0 sm:p-4">
        <div className="mb-2 flex flex-wrap gap-2 text-[0.62rem] font-black uppercase tracking-[0.08em] sm:text-[0.64rem] sm:tracking-[0.1em]">
          <span className="bg-[#44f26e] px-2 py-1 text-black">
            {getAccessLabel(report, copy)}
          </span>
          {publishedAt ? (
            <span className="border border-black/10 bg-[#f5f6f2] px-2 py-1 text-black/52 sm:border-white/20 sm:bg-white/12 sm:text-white/76">
              {publishedAt}
            </span>
          ) : null}
        </div>
        <h2
          className={`line-clamp-3 break-words text-base font-black leading-5 text-[#111510] [word-break:keep-all] group-hover:text-[#16702e] sm:text-xl sm:leading-6 sm:text-white sm:group-hover:text-[#44f26e] ${
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
        className="aspect-[16/10] sm:aspect-[16/11]"
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
          className={`mt-2 line-clamp-2 break-words text-lg font-black leading-6 text-white [word-break:keep-all] group-hover:text-[#44f26e] sm:text-xl ${
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

function PhotoDesk({
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

  const [leadPhoto, ...restPhotos] = reports;

  return (
    <section className="border-y-2 border-[#111510] bg-[#111510] p-3 text-white sm:p-4">
      <div className="mb-4 grid gap-2 border-b border-white/18 pb-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
        <div>
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
            FanLetter Visual
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-normal">
            {copy.photoDesk}
          </h2>
        </div>
        <p className="text-sm font-semibold leading-6 text-white/58 sm:text-right">
          {copy.photoDeskBody}
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.16fr)_minmax(18rem,0.84fr)]">
        {leadPhoto ? (
          <PhotoDeskStory
            copy={copy}
            featured
            nsfwOptInEnabled={nsfwOptInEnabled}
            referralCode={referralCode}
            report={leadPhoto}
          />
        ) : null}
        {restPhotos.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {restPhotos.slice(0, 3).map((report) => (
              <PhotoDeskStory
                copy={copy}
                key={report.reportId}
                nsfwOptInEnabled={nsfwOptInEnabled}
                referralCode={referralCode}
                report={report}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PhotoDeskStory({
  copy,
  featured = false,
  nsfwOptInEnabled,
  referralCode,
  report,
}: {
  copy: ReturnType<typeof getCopy>;
  featured?: boolean;
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
      className={`group relative block overflow-hidden border border-white/16 bg-black text-white ${
        featured
          ? "min-h-[18rem] sm:min-h-[22rem]"
          : "min-h-[8.75rem] sm:min-h-[10.5rem]"
      }`}
      href={getReportHref(report, referralCode)}
    >
      <div className="absolute inset-0">
        <NewsImage
          blurred={shouldBlur}
          className="h-full w-full"
          nsfwLabel={nsfwCopy.badge}
          priority={featured}
          report={report}
          sizes={
            featured
              ? "(max-width: 1024px) 100vw, 48rem"
              : "(max-width: 1024px) 33vw, 19rem"
          }
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/24 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
        <div className="flex flex-wrap gap-2 text-[0.62rem] font-black uppercase tracking-[0.1em]">
          <span className="bg-[#44f26e] px-2 py-1 text-black">
            {getAccessLabel(report, copy)}
          </span>
          {publishedAt ? (
            <span className="border border-white/20 bg-white/12 px-2 py-1 text-white/72">
              {publishedAt}
            </span>
          ) : null}
        </div>
        <h2
          className={`mt-2 break-words font-black leading-tight [word-break:keep-all] group-hover:text-[#44f26e] ${
            featured
              ? "line-clamp-3 text-2xl sm:text-3xl"
              : "line-clamp-2 text-lg"
          } ${shouldBlur ? "select-none blur-[2px]" : ""}`}
        >
          {title}
        </h2>
        {featured ? (
          <p
            className={`mt-2 line-clamp-2 max-w-2xl text-sm font-semibold leading-6 text-white/68 ${
              shouldBlur ? "select-none blur-[2px]" : ""
            }`}
          >
            {report.dek}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function NewsCharacterDirectory({
  characters,
  copy,
  locale,
  nsfwOptInEnabled,
  referralCode,
}: {
  characters: FanletterNewsCharacterStat[];
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
}) {
  if (characters.length === 0) {
    return null;
  }

  const directoryHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters`,
    referralCode,
  );

  return (
    <section className="border border-black/12 bg-white p-4 sm:p-5" id="ai-characters">
      <div className="mb-4 grid gap-3 border-b-2 border-[#111510] pb-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#16702e]">
            Character Desk
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-normal">
            {copy.characterDirectory.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-black/58">
            {copy.characterDirectory.body}
          </p>
        </div>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 border border-black/14 px-4 text-sm font-black text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
          href={directoryHref}
        >
          {copy.characterDirectory.cta}
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {characters.map((character) => {
          const channelHref = buildPathWithReferral(
            `/${locale}/fanletter/creator/${character.referralCode}`,
            referralCode ?? character.referralCode,
          );
          const report = character.representativeReport;
          const nsfwCopy = getFanletterNsfwCopy(locale);
          const shouldBlur = shouldBlurReport(report, nsfwOptInEnabled);
          const latestReportAt = formatDate(character.latestReportAt, locale);

          return (
            <Link
              className="group grid min-w-0 grid-cols-[6.5rem_minmax(0,1fr)] overflow-hidden border border-black/10 bg-[#f7faf4] transition hover:border-[#19b84b] hover:bg-white sm:block"
              href={channelHref}
              key={character.referralCode}
            >
              <div className="relative">
                <NewsImage
                  blurred={shouldBlur}
                  className="aspect-[4/5] h-full min-h-[8.75rem] sm:min-h-0"
                  nsfwLabel={nsfwCopy.badge}
                  report={report}
                  sizes="(max-width: 640px) 7rem, (max-width: 1280px) 50vw, 15rem"
                />
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 bg-[#44f26e] px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-black">
                  <Sparkles className="size-3.5" />
                  AI
                </span>
              </div>
              <div className="min-w-0 p-3">
                <p className="truncate text-[0.64rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
                  {copy.characterDirectory.latest}
                </p>
                <h3 className="mt-1 truncate text-lg font-black tracking-normal">
                  {character.name}
                </h3>
                <p className="mt-1 truncate text-xs font-bold text-black/42">
                  @{character.referralCode}
                </p>
                <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-black/60">
                  {getArticleDisplayTitle(report.title)}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[0.66rem] font-black">
                  <span className="bg-[#111510] px-2 py-1 text-white">
                    {formatNumber(character.newsCount, locale)}{" "}
                    {copy.characterDirectory.news}
                  </span>
                  <span className="border border-black/10 bg-white px-2 py-1 text-black/62">
                    {formatNumber(character.fanOnlyCount, locale)}{" "}
                    {copy.characterDirectory.fanOnly}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/10 pt-3 text-[0.68rem] font-bold text-black/42">
                  <span className="truncate">{latestReportAt}</span>
                  <span className="shrink-0 text-[#16702e] group-hover:underline">
                    {copy.characterDirectory.open}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
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
    <section
      className="border border-black/12 bg-white p-4"
      id="fan-reporters"
    >
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
                  <span className="grid shrink-0 justify-items-center bg-[#44f26e] px-2 py-1 text-black">
                    <span className="text-[0.72rem] font-black leading-none">
                      {formatNumber(reporter.count, locale)}
                    </span>
                    <span className="mt-0.5 text-[0.52rem] font-black uppercase leading-none tracking-[0.08em]">
                      {copy.reporterReportUnit}
                    </span>
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
    getReporterFallbackDisplayName(locale, reporterReferralCode);
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
  const currentNewsHref = activeReporterReferralCode
    ? getReporterNewsHref(locale, activeReporterReferralCode, referralCode)
    : newsHomeHref;
  const [allReports, reports, activeReporterProfile] = await Promise.all([
    getLatestFanletterNewsReports({ limit: 48, locale }),
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
  const visibleReports = reports.filter(
    (report) => !shouldBlurReport(report, nsfwOptInEnabled),
  );
  const leadReport =
    visibleReports.find(isPreferredLeadReport) ??
    visibleReports.find((report) => Boolean(report.coverImageUrl)) ??
    visibleReports[0] ??
    reports.find(isPreferredLeadReport) ??
    reports[0];
  const restReports = leadReport
    ? reports.filter((report) => report.reportId !== leadReport.reportId)
    : [];
  const heroSideReports = restReports.slice(0, 2);
  const topStories = restReports.slice(2, 7);
  const photoDeskReports = restReports.slice(7, 11);
  const featureReports = restReports.slice(11, 20);
  const latestReports = restReports.slice(20);
  const reporterStats = await hydrateReporterStats(getReporterStats(allReports));
  const characterNewsStats = getFanletterNewsCharacterStats(allReports, 8);
  const shouldShowNsfwControl = nsfwReportCount > 0 || nsfwOptInEnabled;
  const activeReporterName = activeReporterReferralCode
    ? activeReporterProfile?.displayName ??
      getReporterFallbackDisplayName(locale, activeReporterReferralCode)
    : null;
  const displayedNewsCount =
    activeReporterReferralCode && activeReporterProfile
      ? activeReporterProfile.reportCount
      : reports.length;
  const charactersHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters`,
    referralCode,
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f6f2] text-[#111510]">
      <NewsMasthead
        charactersHref={charactersHref}
        copy={copy}
        locale={locale}
        navigationBaseHref={currentNewsHref}
        newsHomeHref={newsHomeHref}
      />
      <NewsTicker
        copy={copy}
        referralCode={referralCode}
        reports={reports.slice(0, 5)}
      />

      <section className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-7 lg:px-8">
        {leadReport ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
            <div className="min-w-0 space-y-6 sm:space-y-8">
              <div className="border-b-2 border-[#111510] pb-3 sm:border-b sm:border-black/12 sm:pb-4">
                <p className="text-[0.66rem] font-black uppercase tracking-[0.13em] text-[#16702e] sm:text-[0.72rem] sm:tracking-[0.16em]">
                  {copy.issueLabel}
                </p>
                <h1 className="mt-2 max-w-4xl break-words text-[1.55rem] font-black leading-[1.1] [word-break:keep-all] sm:text-[2.65rem] sm:leading-[1.08]">
                  {copy.allNews}
                </h1>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-black/58 sm:mt-3 sm:text-base sm:leading-7">
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

              <section
                className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]"
                id="top-stories"
              >
                <LeadStory
                  copy={copy}
                  nsfwOptInEnabled={nsfwOptInEnabled}
                  referralCode={referralCode}
                  report={leadReport}
                />

                {heroSideReports.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-1">
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

              {topStories.length > 0 ? (
                <div className="lg:hidden">
                  <RankedStoryList
                    copy={copy}
                    nsfwOptInEnabled={nsfwOptInEnabled}
                    referralCode={referralCode}
                    reports={topStories}
                  />
                </div>
              ) : null}

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

              <PhotoDesk
                copy={copy}
                nsfwOptInEnabled={nsfwOptInEnabled}
                referralCode={referralCode}
                reports={photoDeskReports}
              />

              <NewsCharacterDirectory
                characters={characterNewsStats}
                copy={copy}
                locale={locale}
                nsfwOptInEnabled={nsfwOptInEnabled}
                referralCode={referralCode}
              />

              {featureReports.length > 0 ? (
                <section id="character-wire">
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
                <section id="latest-news">
                  <SectionHeader
                    icon={<FileText className="size-5" />}
                    title={copy.latest}
                  />
                  <div className="grid gap-4 border border-black/10 bg-white p-3 sm:grid-cols-2 sm:p-4">
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
              <div className="hidden lg:block">
                <RankedStoryList
                  copy={copy}
                  nsfwOptInEnabled={nsfwOptInEnabled}
                  referralCode={referralCode}
                  reports={topStories}
                />
              </div>

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
                      {formatNumber(displayedNewsCount, locale)}
                    </p>
                    <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.1em] text-black/42">
                      {copy.newsroomStatLabels.news}
                    </p>
                  </div>
                  <div className="bg-[#f5f6f2] p-3">
                    <p className="text-lg font-black">
                      {formatNumber(reporterStats.length, locale)}
                    </p>
                    <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.1em] text-black/42">
                      {copy.newsroomStatLabels.reporters}
                    </p>
                  </div>
                  <div className="bg-[#f5f6f2] p-3">
                    <p className="text-lg font-black">
                      {formatNumber(nsfwReportCount, locale)}
                    </p>
                    <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.1em] text-black/42">
                      {copy.newsroomStatLabels.nsfw}
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        ) : (
          <section className="mt-6 rounded-lg border border-black/10 bg-white p-8 text-center">
            <UserRound className="mx-auto size-12 text-[#16702e]" />
            <h2 className="mt-4 text-2xl font-black">
              {activeReporterName
                ? copy.emptyReporterTitle(activeReporterName)
                : copy.emptyTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-black/58">
              {activeReporterName
                ? copy.emptyReporterBody(activeReporterName)
                : copy.emptyBody}
            </p>
            {activeReporterName ? (
              <Link
                className="mt-5 inline-flex h-11 items-center justify-center border border-black/14 px-4 text-sm font-black text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                href={newsHomeHref}
              >
                {copy.reporterFilter.allNews}
              </Link>
            ) : null}
          </section>
        )}
      </section>
    </main>
  );
}
