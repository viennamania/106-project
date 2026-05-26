import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  FileText,
  List,
  Newspaper,
  PenLine,
  Radio,
  Sparkles,
  UserRound,
} from "lucide-react";

import { FanletterBrandMark } from "@/components/fanletter-brand-mark";
import { FanletterServiceBridge } from "@/components/fanletter-service-bridge";
import type { FanletterNewsReportDocument } from "@/lib/content";
import {
  getFanletterNewsReporterProfile,
  getLatestFanletterNewsReports,
  type FanletterNewsReporterProfile,
} from "@/lib/fanletter-news-report-service";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  getFanletterNewsCharacterStats,
  hydrateFanletterNewsCharacterStats,
  type FanletterNewsCharacterStat,
} from "@/lib/fanletter-news-character-directory";
import {
  getFanletterNsfwCopy,
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
  firstReportCount: number;
  latestReportAt: Date | null;
  name: string;
  referralCode: string;
};

const CHARACTER_WIRE_REPORT_LIMIT = 9;
const LATEST_SECTION_REPORT_LIMIT = 8;
const PHOTO_DESK_REPORT_LIMIT = 4;

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
          eyebrow: "AI 캐릭터 프로필",
          fanOnly: "팬 전용",
          latest: "최근 뉴스",
          news: "뉴스",
          open: "캐릭터 채널 보기",
          profile: "프로필",
          title: "뉴스 속 AI 캐릭터",
        },
        characterWire: "AI 캐릭터 와이어",
        characterWireBody:
          "캐릭터별 최신 이슈를 와이어 서비스처럼 빠르게 훑어보고, 팬 전용/공개 브이로그 뉴스의 흐름을 이어서 확인하세요.",
        characterWireStats: {
          characters: "캐릭터",
          stories: "와이어",
        },
        dek:
          "팬 기자가 생성한 AI 캐릭터 브이로그 리포트를 엔터테인먼트 뉴스 포맷으로 모아 읽는 FanLetter News입니다.",
        edition: "AI 캐릭터·팬 리포트 전문 뉴스",
        emptyBody:
          "콘텐츠 상세 페이지에서 AI 리포트를 생성하면 이곳에 최신 뉴스가 모입니다.",
        emptyReporterBody: (name: string) =>
          `${name}가 만든 공개 뉴스가 아직 없습니다. 전체 뉴스룸에서 다른 팬 기자의 리포트를 먼저 확인해보세요.`,
        emptyReporterTitle: (name: string) => `${name}의 뉴스가 아직 없습니다.`,
        emptyTitle: "아직 공개된 FanLetter 뉴스가 없습니다.",
        frontPage: {
          characters: "캐릭터 편집판",
          desk: "뉴스룸 데스크",
          deskBody: "리포터 활동, AI 캐릭터 이슈, 공개 뉴스 흐름을 한곳에서 확인합니다.",
          headlines: "주요 헤드라인",
          leadDeck:
            "빠르게 발행된 팬 리포트를 리드와 주요 헤드라인으로 큐레이션하는 FanLetter 뉴스 편집판입니다.",
          reporters: "리포터 편집판",
          title: "FanLetter 뉴스 편집판",
        },
        firstReport: "최초 리포트",
        heroEyebrow: "FanLetter Entertainment News",
        issueLabel: "오늘의 FanLetter 엔터테인먼트 브리핑",
        latest: "최근 발행 리포트",
        lead: "오늘의 리드",
        leadKicker: "FanLetter exclusive",
        navItems: [
          "톱뉴스",
          "플랫폼 모델",
          "팬 기자",
          "AI 캐릭터",
          "브이로그",
          "구매함",
          "리포터 데스크",
        ],
        photoDesk: "포토 뉴스",
        photoDeskBody:
          "NSFW를 제외한 선명한 커버 뉴스를 포토 에디토리얼처럼 큐레이션합니다.",
        newsroomStats: "뉴스룸 현황",
        newsroomStatLabels: {
          news: "뉴스",
          visuals: "포토",
          reporters: "기자",
        },
        nsfwControl: {
          disabledBody:
            "NSFW 뉴스는 목록에 유지하되 성인 팬 전용 커버와 뉴스 미리보기를 블러 처리합니다. 켜면 선명하게 표시됩니다.",
          disabledTitle: "NSFW 뉴스 미리보기 블러",
          enabledBody:
            "NSFW 뉴스 미리보기가 선명하게 표시됩니다. 끄면 다시 커버와 뉴스 미리보기가 블러 처리됩니다.",
          enabledTitle: "NSFW 뉴스 표시 중",
          hiddenCountText: (count: string) =>
            `블러 처리된 NSFW 뉴스 ${count}개`,
        },
        read: "뉴스 보기",
        reporterFilter: {
          allNews: "전체 뉴스 보기",
          body: (count: string) =>
            `${count}개의 AI 캐릭터 리포트를 작성했습니다. 이 팬 기자가 만든 뉴스만 모아볼 수 있습니다.`,
          eyebrow: "팬 기자 채널",
          title: (name: string) => `${name}의 FanLetter News`,
        },
        reporterDesk: "팬 기자 데스크",
        reporterFirstMetric: "선점",
        reporterNewsCta: "이 팬 기자 뉴스 보기",
        reporterReportUnit: "뉴스",
        reporterRank: "활동 기자",
        siteName: "FanLetter News",
        ticker: "뉴스 브리핑",
        topStories: "주요 뉴스",
        wireLatest: "캐릭터별 최신",
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
          eyebrow: "AI Character Profiles",
          fanOnly: "Fan-only",
          latest: "Latest news",
          news: "News",
          open: "View character channel",
          profile: "Profile",
          title: "AI Characters In The News",
        },
        characterWire: "AI Character Wire",
        characterWireBody:
          "Scan the latest character-level issues like a wire service, then continue into public and fan-only vlog news streams.",
        characterWireStats: {
          characters: "Characters",
          stories: "Wire",
        },
        dek:
          "FanLetter News collects AI character vlog reports from fan reporters in an entertainment-news format.",
        edition: "AI character and fan-report news",
        emptyBody:
          "Create an AI report from a content detail page and the latest news will appear here.",
        emptyReporterBody: (name: string) =>
          `${name} has not published fan-reporter news yet. Browse the full newsroom for other fan reports.`,
        emptyReporterTitle: (name: string) =>
          `${name} has no news yet.`,
        emptyTitle: "No FanLetter news has been published yet.",
        frontPage: {
          characters: "Character Edition",
          desk: "Newsroom Desk",
          deskBody:
            "Track reporter activity, AI character issues, and public news flow in one place.",
          headlines: "Major Headlines",
          leadDeck:
            "A FanLetter news edition that curates fast-moving fan reports into lead news and major headlines.",
          reporters: "Reporter Edition",
          title: "FanLetter News Edition",
        },
        firstReport: "First report",
        heroEyebrow: "FanLetter Entertainment News",
        issueLabel: "Today's FanLetter entertainment briefing",
        latest: "Recently Published Reports",
        lead: "Lead News",
        leadKicker: "FanLetter exclusive",
        navItems: [
          "Top news",
          "Platform",
          "Fan reporters",
          "AI characters",
          "Vlogs",
          "Purchases",
          "Reporter desk",
        ],
        photoDesk: "Photo Desk",
        photoDeskBody:
          "A polished editorial curation of non-NSFW character news with strong cover moments.",
        newsroomStats: "Newsroom Status",
        newsroomStatLabels: {
          news: "News",
          visuals: "Photo",
          reporters: "Desk",
        },
        nsfwControl: {
          disabledBody:
            "NSFW news remains listed, with adult fan-only covers and news previews blurred until opt-in.",
          disabledTitle: "NSFW news previews blurred",
          enabledBody:
            "NSFW news previews are visible. Turn this off to blur covers and news previews again.",
          enabledTitle: "NSFW news visible",
          hiddenCountText: (count: string) => `${count} NSFW news items blurred`,
        },
        read: "Read news",
        reporterFilter: {
          allNews: "All news",
          body: (count: string) =>
            `${count} AI character reports published. View only the news from this fan reporter.`,
          eyebrow: "Fan reporter channel",
          title: (name: string) => `${name}'s FanLetter News`,
        },
        reporterDesk: "Fan Reporter Desk",
        reporterFirstMetric: "Scoops",
        reporterNewsCta: "View reporter news",
        reporterReportUnit: "News",
        reporterRank: "Active reporters",
        siteName: "FanLetter News",
        ticker: "News Briefing",
        topStories: "Top Stories",
        wireLatest: "Latest By Character",
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
  return title
    .replace(/^\[(최초|First)\]\s*/i, "")
    .replace(/^\[(AI 팬 리포트|AI fan report)\]\s*/i, "");
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
    `/${locale}/fanletter/news/reporters/${encodeURIComponent(
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

function isEditorialSafeReport(report: FanletterNewsReportDocument) {
  return !isNsfwReport(report);
}

function isFirstNewsReport(report: FanletterNewsReportDocument) {
  return (
    (
      report as FanletterNewsReportDocument & {
        firstNewsReportForContent?: boolean;
      }
    ).firstNewsReportForContent === true
  );
}

function isPreferredLeadReport(report: FanletterNewsReportDocument) {
  const title = `${report.title} ${report.sourceTitle}`;

  return (
    isEditorialSafeReport(report) &&
    Boolean(report.coverImageUrl) &&
    !title.toLowerCase().includes("fanletter ai 팬 리포트") &&
    !title.toLowerCase().includes("fanletter ai fan report")
  );
}

function isPreferredFirstLeadReport(report: FanletterNewsReportDocument) {
  return isFirstNewsReport(report) && isPreferredLeadReport(report);
}

function getFirstNewsPromotedReports(reports: FanletterNewsReportDocument[]) {
  return [...reports].sort((left, right) => {
    const firstReportDelta =
      Number(isFirstNewsReport(right)) - Number(isFirstNewsReport(left));

    if (firstReportDelta !== 0) {
      return firstReportDelta;
    }

    return 0;
  });
}

function getReportCreatorKey(report: FanletterNewsReportDocument) {
  return (
    report.creatorReferralCode?.trim() ||
    report.creatorName.trim() ||
    report.reportId
  );
}

function getPhotoDeskReports(
  reports: FanletterNewsReportDocument[],
  limit: number,
) {
  return getBalancedCharacterReports({
    filter: (report) =>
      isEditorialSafeReport(report) && Boolean(report.coverImageUrl),
    limit,
    reports,
  });
}

function getBalancedCharacterReports({
  deprioritizedCreatorKey,
  filter = isEditorialSafeReport,
  limit,
  reports,
}: {
  deprioritizedCreatorKey?: string | null;
  filter?: (report: FanletterNewsReportDocument) => boolean;
  limit: number;
  reports: FanletterNewsReportDocument[];
}) {
  const reportsByCreator = new Map<string, FanletterNewsReportDocument[]>();
  const seenReportIds = new Set<string>();

  for (const report of reports) {
    if (!filter(report) || seenReportIds.has(report.reportId)) {
      continue;
    }

    const creatorKey = getReportCreatorKey(report);
    const creatorReports = reportsByCreator.get(creatorKey) ?? [];

    creatorReports.push(report);
    reportsByCreator.set(creatorKey, creatorReports);
    seenReportIds.add(report.reportId);
  }

  const selectedReports: FanletterNewsReportDocument[] = [];
  const creatorReportQueues = Array.from(reportsByCreator.entries());
  const normalizedDeprioritizedCreatorKey =
    deprioritizedCreatorKey?.trim() ?? null;

  if (normalizedDeprioritizedCreatorKey) {
    creatorReportQueues.sort(([leftKey], [rightKey]) => {
      if (leftKey === normalizedDeprioritizedCreatorKey) {
        return 1;
      }

      if (rightKey === normalizedDeprioritizedCreatorKey) {
        return -1;
      }

      return 0;
    });
  }

  while (selectedReports.length < limit) {
    let addedReport = false;

    for (const [, creatorReports] of creatorReportQueues) {
      const report = creatorReports.shift();

      if (!report) {
        continue;
      }

      selectedReports.push(report);
      addedReport = true;

      if (selectedReports.length >= limit) {
        return selectedReports;
      }
    }

    if (!addedReport) {
      break;
    }
  }

  return selectedReports;
}

function getBalancedCharacterWireReports(
  reports: FanletterNewsReportDocument[],
  limit: number,
) {
  return getBalancedCharacterReports({
    limit,
    reports,
  });
}

function excludeReports(
  reports: FanletterNewsReportDocument[],
  excludedReports: FanletterNewsReportDocument[],
) {
  const excludedReportIds = new Set(
    excludedReports.map((report) => report.reportId),
  );

  return reports.filter((report) => !excludedReportIds.has(report.reportId));
}

function buildMixedNewsHomeReports({
  latestReports,
  limit,
  publicReports,
}: {
  latestReports: FanletterNewsReportDocument[];
  limit: number;
  publicReports: FanletterNewsReportDocument[];
}) {
  const seen = new Set<string>();
  const editorialLatestReports = latestReports.filter(isEditorialSafeReport);
  const publicQueue = publicReports.filter(
    (report) => report.priceType !== "paid" && isEditorialSafeReport(report),
  );
  const candidateReports = getFirstNewsPromotedReports(
    [...editorialLatestReports, ...publicQueue].filter((report) => {
      if (seen.has(report.reportId)) {
        return false;
      }

      seen.add(report.reportId);
      return true;
    }),
  );
  const leadCandidate =
    candidateReports.find(isPreferredFirstLeadReport) ??
    candidateReports.find(isPreferredLeadReport) ??
    candidateReports[0];

  if (!leadCandidate) {
    return [];
  }

  return [
    leadCandidate,
    ...getBalancedCharacterReports({
      deprioritizedCreatorKey: getReportCreatorKey(leadCandidate),
      limit: limit - 1,
      reports: candidateReports.filter(
        (report) => report.reportId !== leadCandidate.reportId,
      ),
    }),
  ].slice(0, limit);
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
      firstReportCount:
        (existing?.firstReportCount ?? 0) + (isFirstNewsReport(report) ? 1 : 0),
      latestReportAt,
      name: existing?.name ?? getReporterDisplayName(report),
      referralCode: report.reporterReferralCode,
    });
  }

  return Array.from(map.values())
    .sort(
      (left, right) =>
        right.firstReportCount - left.firstReportCount || right.count - left.count,
    )
    .slice(0, 5);
}

function getNewsroomReporterCount(reports: FanletterNewsReportDocument[]) {
  return new Set(
    reports
      .map((report) => report.reporterReferralCode.trim())
      .filter(Boolean),
  ).size;
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

  return hydrated
    .sort(
      (left, right) =>
        right.firstReportCount - left.firstReportCount || right.count - left.count,
    )
    .slice(0, 5);
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
          unoptimized={shouldBypassFanletterImageOptimization(
            report.coverImageUrl,
          )}
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
  platformHref,
  purchasesHref,
  reportsHref,
}: {
  charactersHref: string;
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  navigationBaseHref: string;
  newsHomeHref: string;
  platformHref: string;
  purchasesHref: string;
  reportsHref: string;
}) {
  const today = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
  }).format(new Date());
  const navHrefs = [
    `${navigationBaseHref}#top-stories`,
    platformHref,
    `${navigationBaseHref}#fan-reporters`,
    charactersHref,
    `${navigationBaseHref}#latest-news`,
    purchasesHref,
    reportsHref,
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-black/16 bg-white text-[#111510] shadow-[0_8px_24px_rgba(17,21,16,0.06)] sm:static sm:z-auto sm:shadow-none">
      <div className="border-b border-black/10 bg-[#f3f4ef]">
        <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-4 px-4 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-black/50 sm:px-6 sm:py-2 sm:text-[0.68rem] sm:tracking-[0.14em] lg:px-8">
          <span>{today}</span>
          <span className="hidden sm:inline">{copy.edition}</span>
        </div>
      </div>
      <div className="mx-auto max-w-[92rem] px-4 pt-3 sm:px-6 sm:pt-4 lg:px-8">
        <div className="flex items-end justify-between gap-4 border-b-2 border-[#111510] pb-2.5 sm:pb-3">
          <Link
            className="inline-flex min-w-0 items-center gap-2 text-[1.82rem] font-black leading-none tracking-normal !text-[#111510] sm:gap-4 sm:text-[4.5rem]"
            href={newsHomeHref}
          >
            <FanletterBrandMark className="size-9 sm:size-16" />
            <span className="truncate">{copy.siteName}</span>
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
      <div className="mx-auto grid max-w-[92rem] grid-cols-[auto_minmax(0,1fr)] items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 lg:px-8">
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
        <h2 className="mt-1 text-xl font-black leading-tight tracking-normal sm:text-2xl">
          {title}
        </h2>
      </div>
      <span className="flex size-9 shrink-0 items-center justify-center border border-black/12 bg-[#eef3ea] text-[#16702e]">
        {icon}
      </span>
    </div>
  );
}

function FirstReportBadge({
  copy,
  tone = "light",
}: {
  copy: ReturnType<typeof getCopy>;
  tone?: "dark" | "light";
}) {
  return (
    <span
      className={
        tone === "dark"
          ? "inline-flex items-center bg-[#44f26e] px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-black"
          : "inline-flex items-center bg-[#111510] px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#44f26e]"
      }
    >
      {copy.firstReport}
    </span>
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
          {isFirstNewsReport(report) ? (
            <FirstReportBadge copy={copy} tone="dark" />
          ) : null}
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

function PortalHeadlineList({
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
    <section className="min-w-0 border-t border-black/12 bg-white p-4 lg:border-t-0 xl:border-r">
      <div className="mb-3 flex items-center justify-between gap-3 border-b-2 border-[#111510] pb-2">
        <h2 className="text-lg font-black tracking-normal">
          {copy.frontPage.headlines}
        </h2>
        <span className="text-[0.66rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
          {formatNumber(reports.length, reports[0]?.locale ?? "ko")}
        </span>
      </div>
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
              <span className="mt-0.5 flex size-7 items-center justify-center border border-black/12 text-xs font-black text-[#16702e] group-hover:border-[#19b84b] group-hover:bg-[#ecfff0]">
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap gap-2 text-[0.62rem] font-black uppercase tracking-[0.1em] text-black/42">
                  <span className="text-[#16702e]">
                    {getAccessLabel(report, copy)}
                  </span>
                  {publishedAt ? <span>{publishedAt}</span> : null}
                </span>
                <span
                  className={`mt-1 block line-clamp-2 break-words text-[1.02rem] font-black leading-5 [word-break:keep-all] group-hover:text-[#16702e] ${
                    shouldBlur ? "select-none blur-[2px]" : ""
                  }`}
                >
                  {title}
                </span>
                <span
                  className={`mt-1 block line-clamp-1 text-xs font-semibold text-black/46 ${
                    shouldBlur ? "select-none blur-[2px]" : ""
                  }`}
                >
                  {getReporterDisplayName(report)} · {report.creatorName}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function NewsDeskPanel({
  characters,
  copy,
  locale,
  referralCode,
  reporters,
  selectedReporterReferralCode,
}: {
  characters: FanletterNewsCharacterStat[];
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  referralCode: string | null;
  reporters: ReporterStat[];
  selectedReporterReferralCode: string | null;
}) {
  const topReporters = reporters.slice(0, 3);
  const topCharacters = characters.slice(0, 3);

  return (
    <aside className="border-t border-black/12 bg-[#f7faf4] p-4 xl:border-t-0">
      <div className="border-b-2 border-[#111510] pb-3">
        <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
          {copy.frontPage.desk}
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-black/58">
          {copy.frontPage.deskBody}
        </p>
      </div>

      {topReporters.length > 0 ? (
        <div className="mt-4">
          <h3 className="border-b border-black/12 pb-2 text-sm font-black">
            {copy.frontPage.reporters}
          </h3>
          <div className="divide-y divide-black/10">
            {topReporters.map((reporter, index) => {
              const isSelected =
                reporter.referralCode === selectedReporterReferralCode;

              return (
                <Link
                  className={`group grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2 py-2.5 ${
                    isSelected ? "text-[#16702e]" : "text-[#111510]"
                  }`}
                  href={getReporterNewsHref(
                    locale,
                    reporter.referralCode,
                    referralCode,
                  )}
                  key={reporter.referralCode}
                >
                  <span className="flex size-8 items-center justify-center bg-[#111510] text-xs font-black text-[#44f26e]">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black group-hover:text-[#16702e]">
                      {reporter.name}
                    </span>
                    <span className="block truncate text-[0.66rem] font-bold text-black/42">
                      @{reporter.referralCode}
                    </span>
                  </span>
                  <span className="text-xs font-black text-[#16702e]">
                    {formatNumber(reporter.count, locale)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {topCharacters.length > 0 ? (
        <div className="mt-4">
          <h3 className="border-b border-black/12 pb-2 text-sm font-black">
            {copy.frontPage.characters}
          </h3>
          <div className="divide-y divide-black/10">
            {topCharacters.map((character) => {
              const channelHref = buildPathWithReferral(
                `/${locale}/fanletter/news/characters/${character.referralCode}`,
                referralCode ?? character.referralCode,
              );

              return (
                <Link
                  className="group grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2 py-2.5"
                  href={channelHref}
                  key={character.referralCode}
                >
                  <span className="relative size-10 overflow-hidden rounded-full bg-[#111510]">
                    {character.avatarImageUrl ? (
                      <Image
                        alt=""
                        aria-hidden="true"
                        className="object-cover"
                        fill
                        sizes="2.5rem"
                        src={character.avatarImageUrl}
                        unoptimized={shouldBypassFanletterImageOptimization(
                          character.avatarImageUrl,
                        )}
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-white/64">
                        <UserRound className="size-5" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black group-hover:text-[#16702e]">
                      {character.name}
                    </span>
                    <span className="mt-0.5 block line-clamp-1 text-[0.66rem] font-semibold text-black/46">
                      {getArticleDisplayTitle(
                        character.representativeReport.title,
                      )}
                    </span>
                    <span className="mt-1 block text-[0.62rem] font-black uppercase tracking-[0.08em] text-[#16702e]">
                      {formatNumber(character.newsCount, locale)}{" "}
                      {copy.characterDirectory.news}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function NewsFrontPage({
  characterNewsStats,
  copy,
  displayedNewsCount,
  displayedReporterCount,
  heroSideReports,
  leadReport,
  locale,
  nsfwOptInEnabled,
  referralCode,
  reporterStats,
  selectedReporterReferralCode,
  topStories,
  visualReportCount,
}: {
  characterNewsStats: FanletterNewsCharacterStat[];
  copy: ReturnType<typeof getCopy>;
  displayedNewsCount: number;
  displayedReporterCount: number;
  heroSideReports: FanletterNewsReportDocument[];
  leadReport: FanletterNewsReportDocument;
  locale: Locale;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  reporterStats: ReporterStat[];
  selectedReporterReferralCode: string | null;
  topStories: FanletterNewsReportDocument[];
  visualReportCount: number;
}) {
  return (
    <section
      className="overflow-hidden border-y-2 border-[#111510] bg-white shadow-[0_18px_44px_rgba(17,21,16,0.06)]"
      id="top-stories"
    >
      <div className="grid gap-3 border-b-2 border-[#111510] p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-[0.66rem] font-black uppercase tracking-[0.13em] text-[#16702e] sm:text-[0.72rem] sm:tracking-[0.16em]">
            {copy.issueLabel}
          </p>
          <h1 className="mt-2 max-w-4xl break-words text-[1.8rem] font-black leading-[1.05] tracking-normal [word-break:keep-all] sm:text-[3rem]">
            {copy.frontPage.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-black/58 sm:text-base sm:leading-7">
            {copy.frontPage.leadDeck}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-px border border-black/10 bg-black/10 lg:min-w-80">
          {[
            [copy.newsroomStatLabels.news, displayedNewsCount],
            [copy.newsroomStatLabels.reporters, displayedReporterCount],
            [copy.newsroomStatLabels.visuals, visualReportCount],
          ].map(([label, value]) => (
            <div className="bg-[#f7faf4] p-3" key={label}>
              <p className="text-xl font-black leading-none">
                {formatNumber(Number(value), locale)}
              </p>
              <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.1em] text-black/42">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.74fr)] xl:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.62fr)_18.5rem]">
        <div className="min-w-0 p-3 sm:p-4 lg:border-r lg:border-black/12">
          <LeadStory
            copy={copy}
            nsfwOptInEnabled={nsfwOptInEnabled}
            referralCode={referralCode}
            report={leadReport}
          />

          {heroSideReports.length > 0 ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
        </div>

        <PortalHeadlineList
          copy={copy}
          nsfwOptInEnabled={nsfwOptInEnabled}
          referralCode={referralCode}
          reports={topStories}
        />

        <NewsDeskPanel
          characters={characterNewsStats}
          copy={copy}
          locale={locale}
          referralCode={referralCode}
          reporters={reporterStats}
          selectedReporterReferralCode={selectedReporterReferralCode}
        />
      </div>
    </section>
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
      className="group grid min-w-0 grid-cols-[7.25rem_minmax(0,1fr)] gap-3 border-b border-black/10 pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[8.25rem_minmax(0,1fr)]"
      href={getReportHref(report, referralCode)}
    >
      <NewsImage
        blurred={shouldBlur}
        className="aspect-[16/10] border border-black/10"
        nsfwLabel={nsfwCopy.badge}
        report={report}
        sizes="(max-width: 640px) 7.25rem, 8.25rem"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2 text-[0.68rem] font-black text-[#16702e]">
          <span>{getAccessLabel(report, copy)}</span>
        </div>
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
      className="group relative block min-h-[15rem] overflow-hidden border border-white/14 bg-white/[0.045] text-white transition hover:border-[#44f26e]/50"
      href={getReportHref(report, referralCode)}
    >
      <NewsImage
        blurred={shouldBlur}
        className="absolute inset-0 h-full w-full"
        nsfwLabel={nsfwCopy.badge}
        report={report}
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 24rem"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/38 to-black/6" />
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

function CharacterWireSection({
  copy,
  locale,
  nsfwOptInEnabled,
  referralCode,
  reports,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  nsfwOptInEnabled: boolean;
  referralCode: string | null;
  reports: FanletterNewsReportDocument[];
}) {
  if (reports.length === 0) {
    return null;
  }

  const [leadReport, ...restReports] = reports;
  const creatorCount = new Set(
    reports
      .map((report) => report.creatorReferralCode ?? report.creatorName)
      .filter(Boolean),
  ).size;
  const secondaryReports = restReports.slice(0, 4);
  const gridReports = restReports.slice(4);

  return (
    <section
      className="overflow-hidden border-2 border-[#111510] bg-[#111510] text-white shadow-[0_24px_70px_rgba(12,20,14,0.2)]"
      id="character-wire"
    >
      <div className="grid gap-4 border-b border-white/14 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-5">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
            <Radio className="size-3.5" />
            {copy.heroEyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-black leading-none tracking-normal sm:text-5xl">
            {copy.characterWire}
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/62 sm:text-base sm:leading-7">
            {copy.characterWireBody}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:min-w-64">
          <WireStat
            label={copy.characterWireStats.stories}
            value={formatNumber(reports.length, locale)}
          />
          <WireStat
            label={copy.characterWireStats.characters}
            value={formatNumber(creatorCount, locale)}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.12fr)_minmax(20rem,0.88fr)]">
        {leadReport ? (
          <WireLeadStory
            copy={copy}
            nsfwOptInEnabled={nsfwOptInEnabled}
            referralCode={referralCode}
            report={leadReport}
          />
        ) : null}
        <div className="border-t border-white/14 p-3 sm:p-4 lg:border-l lg:border-t-0">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/12 pb-3">
            <p className="inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.16em] text-white/46">
              <List className="size-3.5 text-[#44f26e]" />
              {copy.wireLatest}
            </p>
            <span className="text-[0.66rem] font-black text-[#44f26e]">
              {formatNumber(secondaryReports.length, locale)}
            </span>
          </div>
          <div className="divide-y divide-white/10">
            {secondaryReports.map((report) => (
              <WireBriefStory
                copy={copy}
                key={report.reportId}
                nsfwOptInEnabled={nsfwOptInEnabled}
                referralCode={referralCode}
                report={report}
              />
            ))}
          </div>
        </div>
      </div>

      {gridReports.length > 0 ? (
        <div className="grid gap-3 border-t border-white/14 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
          {gridReports.map((report) => (
            <FeatureCard
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
  );
}

function WireStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/12 bg-white/[0.055] p-3">
      <p className="text-2xl font-black leading-none text-white sm:text-3xl">
        {value}
      </p>
      <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[0.12em] text-white/42">
        {label}
      </p>
    </div>
  );
}

function WireLeadStory({
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
      className="group relative block min-h-[23rem] overflow-hidden bg-black text-white sm:min-h-[30rem]"
      href={getReportHref(report, referralCode)}
    >
      <NewsImage
        blurred={shouldBlur}
        className="absolute inset-0 h-full w-full"
        nsfwLabel={nsfwCopy.badge}
        priority
        report={report}
        sizes="(max-width: 1024px) 100vw, 52rem"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/94 via-black/36 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
        <div className="flex flex-wrap gap-2 text-[0.68rem] font-black">
          <span className="bg-[#44f26e] px-2 py-1 text-black">
            {report.creatorName}
          </span>
          <span className="border border-white/18 bg-white/12 px-2 py-1 text-white/76">
            {getAccessLabel(report, copy)}
          </span>
        </div>
        <h3
          className={`mt-3 line-clamp-3 max-w-4xl break-words text-3xl font-black leading-[1.02] tracking-normal [word-break:keep-all] group-hover:text-[#44f26e] sm:text-5xl ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {title}
        </h3>
        <p
          className={`mt-3 line-clamp-2 max-w-2xl text-sm font-semibold leading-6 text-white/68 sm:text-base sm:leading-7 ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {report.dek}
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-white/54">
          <span>{getReporterDisplayName(report)}</span>
          {publishedAt ? <span>{publishedAt}</span> : null}
          <span className="text-[#44f26e] group-hover:underline">
            {copy.read}
          </span>
        </div>
      </div>
    </Link>
  );
}

function WireBriefStory({
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
      className="group grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 py-3 first:pt-0 last:pb-0"
      href={getReportHref(report, referralCode)}
    >
      <NewsImage
        blurred={shouldBlur}
        className="aspect-[4/5] border border-white/12"
        nsfwLabel={nsfwCopy.badge}
        report={report}
        sizes="5.5rem"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2 text-[0.62rem] font-black uppercase tracking-[0.1em]">
          <span className="text-[#44f26e]">{report.creatorName}</span>
          <span className="text-white/52">{getAccessLabel(report, copy)}</span>
          {publishedAt ? <span className="text-white/34">{publishedAt}</span> : null}
        </div>
        <h3
          className={`mt-1 line-clamp-3 break-words text-base font-black leading-5 [word-break:keep-all] group-hover:text-[#44f26e] ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {title}
        </h3>
        <p
          className={`mt-1 line-clamp-2 text-xs font-semibold leading-5 text-white/46 ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {report.dek}
        </p>
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
    <section className="overflow-hidden border-y-2 border-[#111510] bg-white text-[#111510] shadow-[0_22px_60px_rgba(17,21,16,0.08)]">
      <div className="grid gap-3 border-b-2 border-[#111510] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,0.42fr)] sm:items-end sm:p-5">
        <div>
          <p className="text-[0.66rem] font-black uppercase tracking-[0.26em] text-[#16702e]">
            FanLetter Visual Edit
          </p>
          <h2 className="mt-2 max-w-3xl text-[2.6rem] font-black leading-[0.96] tracking-normal sm:text-[4.7rem]">
            {copy.photoDesk}
          </h2>
        </div>
        <p className="text-sm font-semibold leading-6 text-black/58 sm:text-right">
          {copy.photoDeskBody}
        </p>
      </div>

      <div className="grid gap-px bg-[#111510] lg:grid-cols-[minmax(0,1.12fr)_minmax(18rem,0.88fr)]">
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
          <div className="grid gap-px bg-[#111510] sm:grid-cols-3 lg:grid-cols-1">
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
      className={`group relative block overflow-hidden bg-[#111510] text-white ${
        featured
          ? "min-h-[25rem] sm:min-h-[32rem]"
          : "min-h-[14rem] sm:min-h-[16rem]"
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/18 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2 text-[0.62rem] font-black uppercase tracking-[0.18em]">
          <span className="bg-white px-2.5 py-1 text-[#111510]">
            {getAccessLabel(report, copy)}
          </span>
          {publishedAt ? (
            <span className="border border-white/24 bg-black/28 px-2.5 py-1 text-white/78 backdrop-blur">
              {publishedAt}
            </span>
          ) : null}
        </div>
        <h2
          className={`mt-3 max-w-4xl break-words font-black leading-[0.98] tracking-normal text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)] [word-break:keep-all] group-hover:text-[#f5f7f1] ${
            featured
              ? "line-clamp-3 text-[2.3rem] sm:text-[4.2rem]"
              : "line-clamp-3 text-2xl sm:text-3xl"
          } ${shouldBlur ? "select-none blur-[2px]" : ""}`}
        >
          {title}
        </h2>
        {featured ? (
          <p
            className={`mt-4 line-clamp-2 max-w-2xl text-sm font-semibold leading-6 text-white/72 sm:text-base sm:leading-7 ${
              shouldBlur ? "select-none blur-[2px]" : ""
            }`}
          >
            {report.dek}
          </p>
        ) : null}
        <div className="mt-4 h-px w-16 bg-white/70 transition group-hover:w-24" />
      </div>
    </Link>
  );
}

function NewsCharacterDirectory({
  characters,
  copy,
  locale,
  referralCode,
}: {
  characters: FanletterNewsCharacterStat[];
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  referralCode: string | null;
}) {
  if (characters.length === 0) {
    return null;
  }

  const directoryHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters`,
    referralCode,
  );
  const [featuredCharacter, ...profileCharacters] = characters;
  const featuredChannelHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters/${featuredCharacter.referralCode}`,
    referralCode ?? featuredCharacter.referralCode,
  );
  const featuredReport = featuredCharacter.representativeReport;
  const featuredLatestReportAt = formatDate(
    featuredCharacter.latestReportAt,
    locale,
  );

  return (
    <section
      className="overflow-hidden border-y-2 border-[#111510] bg-white shadow-[0_18px_44px_rgba(17,21,16,0.06)]"
      id="ai-characters"
    >
      <div className="grid gap-3 border-b-2 border-[#111510] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-5">
        <div>
          <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#16702e]">
            {copy.characterDirectory.eyebrow}
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-normal">
            {copy.characterDirectory.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-black/58">
            {copy.characterDirectory.body}
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-black/14 px-4 py-2 text-center text-sm font-black leading-5 text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0] sm:w-auto"
          href={directoryHref}
        >
          {copy.characterDirectory.cta}
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(22rem,1.05fr)]">
        <Link
          className="group relative min-h-[25rem] overflow-hidden bg-[#111510] text-white lg:min-h-full"
          href={featuredChannelHref}
        >
          {featuredReport.coverImageUrl ? (
            <Image
              alt=""
              aria-hidden="true"
              className="object-cover opacity-64 transition duration-300 group-hover:scale-[1.025] group-hover:opacity-72"
              fill
              sizes="(max-width: 1024px) 100vw, 40rem"
              src={featuredReport.coverImageUrl}
              unoptimized={shouldBypassFanletterImageOptimization(
                featuredReport.coverImageUrl,
              )}
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(145deg,#07100b,#111510_52%,#203426)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/94 via-black/46 to-black/14" />
          <div className="relative flex min-h-[25rem] flex-col justify-end p-4 sm:p-5">
            <div className="flex min-w-0 items-end gap-3 sm:gap-4">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-full border-2 border-white/22 bg-[#111510] sm:size-24">
                {featuredCharacter.avatarImageUrl ? (
                  <Image
                    alt={featuredCharacter.name}
                    className="h-full w-full object-cover"
                    fill
                    sizes="6rem"
                    src={featuredCharacter.avatarImageUrl}
                    unoptimized={shouldBypassFanletterImageOptimization(
                      featuredCharacter.avatarImageUrl,
                    )}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/72">
                    <UserRound className="size-10" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 bg-[#44f26e] px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-[0.1em] text-black">
                  <Sparkles className="size-3.5" />
                  {copy.characterDirectory.profile}
                </span>
                <h3 className="mt-3 break-words text-[2rem] font-black leading-none tracking-normal !text-white [word-break:keep-all] sm:text-[2.8rem]">
                  {featuredCharacter.name}
                </h3>
                <p className="mt-2 truncate text-sm font-black text-white/58">
                  @{featuredCharacter.referralCode}
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/66">
              {getArticleDisplayTitle(featuredReport.title)}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-px bg-white/12">
              {[
                {
                  label: copy.characterDirectory.news,
                  value: featuredCharacter.newsCount,
                },
                {
                  label: copy.access.public,
                  value: featuredCharacter.publicCount,
                },
                {
                  label: copy.characterDirectory.fanOnly,
                  value: featuredCharacter.fanOnlyCount,
                },
              ].map((stat) => (
                <div className="bg-white/[0.07] p-3" key={stat.label}>
                  <p className="text-xl font-black leading-none text-white">
                    {formatNumber(stat.value, locale)}
                  </p>
                  <p className="mt-1 truncate text-[0.56rem] font-black uppercase tracking-[0.09em] text-white/46">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/14 pt-4 text-xs font-bold text-white/52">
              <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                <Clock3 className="size-3.5 shrink-0 text-[#44f26e]" />
                <span className="truncate">{featuredLatestReportAt}</span>
              </span>
              <span className="shrink-0 text-[#44f26e] group-hover:underline">
                {copy.characterDirectory.open}
              </span>
            </div>
          </div>
        </Link>

        <div className="min-w-0 divide-y divide-black/10 border-t border-black/12 bg-[#f7faf4] p-3 sm:p-4 lg:border-l lg:border-t-0">
          {profileCharacters.length > 0
            ? profileCharacters.map((character) => {
          const channelHref = buildPathWithReferral(
            `/${locale}/fanletter/news/characters/${character.referralCode}`,
            referralCode ?? character.referralCode,
          );
          const report = character.representativeReport;
          const latestReportAt = formatDate(character.latestReportAt, locale);

          return (
            <Link
              className="group grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:items-center"
              href={channelHref}
              key={character.referralCode}
            >
              <div className="relative size-16 overflow-hidden rounded-full border border-black/10 bg-[#111510] sm:size-[4.5rem]">
                {character.avatarImageUrl ? (
                  <Image
                    alt={character.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                    fill
                    sizes="4.5rem"
                    src={character.avatarImageUrl}
                    unoptimized={shouldBypassFanletterImageOptimization(
                      character.avatarImageUrl,
                    )}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/70">
                    <UserRound className="size-7" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="min-w-0 truncate text-lg font-black tracking-normal group-hover:text-[#16702e]">
                    {character.name}
                  </h3>
                  <span className="inline-flex shrink-0 items-center gap-1 bg-white px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.08em] text-[#16702e]">
                    <Newspaper className="size-3" />
                    {formatNumber(character.newsCount, locale)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs font-bold text-black/42">
                    @{character.referralCode}
                </p>
                <p className="mt-2 line-clamp-2 break-words text-sm font-semibold leading-5 text-black/62 [word-break:keep-all]">
                  {getArticleDisplayTitle(report.title)}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[0.64rem] font-black uppercase tracking-[0.08em] text-black/38">
                  <span className="text-[#16702e]">
                    {formatNumber(character.publicCount, locale)}{" "}
                    {copy.access.public}
                  </span>
                  <span>
                    {formatNumber(character.fanOnlyCount, locale)}{" "}
                    {copy.characterDirectory.fanOnly}
                  </span>
                  {latestReportAt ? <span>{latestReportAt}</span> : null}
                </div>
              </div>

              <span className="hidden shrink-0 text-xs font-black text-[#16702e] group-hover:underline sm:block">
                {copy.characterDirectory.open}
              </span>
            </Link>
          );
            })
            : null}
        </div>
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
      className="border border-black/12 bg-white p-4 shadow-[0_16px_36px_rgba(17,21,16,0.06)]"
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
                    unoptimized={shouldBypassFanletterImageOptimization(
                      reporter.avatarImageUrl,
                    )}
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
                  {reporter.firstReportCount > 0 ? (
                    <span className="font-black text-[#16702e]">
                      {copy.reporterFirstMetric}{" "}
                      {formatNumber(reporter.firstReportCount, locale)}
                    </span>
                  ) : null}
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
            unoptimized={shouldBypassFanletterImageOptimization(
              profile.avatarImageUrl,
            )}
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
  const nsfwOptInEnabled = false;
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );

  if (activeReporterReferralCode) {
    redirect(getReporterNewsHref(locale, activeReporterReferralCode, referralCode));
  }

  const currentNewsHref = activeReporterReferralCode
    ? getReporterNewsHref(locale, activeReporterReferralCode, referralCode)
    : newsHomeHref;
  const [
    allReports,
    latestNewsReports,
    publicReports,
    activeReporterProfile,
  ] =
    await Promise.all([
      getLatestFanletterNewsReports({ limit: 48, locale }),
      activeReporterReferralCode
        ? getLatestFanletterNewsReports({
            limit: 48,
            locale,
            promoteFirstReports: true,
            reporterReferralCode: activeReporterReferralCode,
          })
        : getLatestFanletterNewsReports({
            limit: 48,
            locale,
            promoteFirstReports: true,
          }),
      getLatestFanletterNewsReports({
        limit: 24,
        locale,
        promoteFirstReports: true,
        priceType: "free",
        reporterReferralCode: activeReporterReferralCode,
      }),
      activeReporterReferralCode
        ? getFanletterNewsReporterProfile({
            reporterReferralCode: activeReporterReferralCode,
          })
        : Promise.resolve(null),
    ]);
  const reports = buildMixedNewsHomeReports({
    latestReports: latestNewsReports,
    limit: 28,
    publicReports,
  });
  const editorialAllReports = allReports.filter(isEditorialSafeReport);
  const excludedNsfwReportCount = new Set(
    [...latestNewsReports, ...publicReports]
      .filter(isNsfwReport)
      .map((report) => report.reportId),
  ).size;
  const leadReport =
    reports.find(isPreferredLeadReport) ??
    reports.find((report) => Boolean(report.coverImageUrl)) ??
    reports[0];
  const restReports = leadReport
    ? reports.filter((report) => report.reportId !== leadReport.reportId)
    : [];
  const heroSideReports = restReports.slice(0, 2);
  const topStories = restReports.slice(2, 7);
  const sectionCandidateReports = restReports.slice(7);
  const photoDeskReports = getPhotoDeskReports(
    sectionCandidateReports,
    PHOTO_DESK_REPORT_LIMIT,
  );
  const reportsAfterPhotoDesk = excludeReports(
    sectionCandidateReports,
    photoDeskReports,
  );
  const featureReports = getBalancedCharacterWireReports(
    reportsAfterPhotoDesk,
    CHARACTER_WIRE_REPORT_LIMIT,
  );
  const primaryDisplayedReports = [
    ...(leadReport ? [leadReport] : []),
    ...heroSideReports,
    ...topStories,
    ...photoDeskReports,
    ...featureReports,
  ];
  const latestSectionReports = excludeReports(
    allReports.filter(isEditorialSafeReport),
    primaryDisplayedReports,
  ).slice(0, LATEST_SECTION_REPORT_LIMIT);
  const [reporterStats, characterNewsStats] = await Promise.all([
    hydrateReporterStats(getReporterStats(editorialAllReports)),
    hydrateFanletterNewsCharacterStats(
      getFanletterNewsCharacterStats(editorialAllReports, 8),
    ),
  ]);
  const activeReporterName = activeReporterReferralCode
    ? activeReporterProfile?.displayName ??
      getReporterFallbackDisplayName(locale, activeReporterReferralCode)
    : null;
  const displayedNewsCount = reports.length;
  const displayedReporterCount = activeReporterReferralCode
    ? displayedNewsCount > 0
      ? 1
      : 0
    : getNewsroomReporterCount(reports);
  const visualReportCount = photoDeskReports.length;
  const charactersHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters`,
    referralCode,
  );
  const purchasesHref = buildPathWithReferral(
    `/${locale}/fanletter/news/purchases`,
    referralCode,
  );
  const platformHref = buildPathWithReferral(
    `/${locale}/fanletter/news/platform`,
    referralCode,
  );
  const reportsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reports`,
    referralCode,
  );
  const studioHref = buildPathWithReferral(
    `/${locale}/fanletter/studio`,
    referralCode,
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef1ec] text-[#111510]">
      <NewsMasthead
        charactersHref={charactersHref}
        copy={copy}
        locale={locale}
        navigationBaseHref={currentNewsHref}
        newsHomeHref={newsHomeHref}
        platformHref={platformHref}
        purchasesHref={purchasesHref}
        reportsHref={reportsHref}
      />
      <NewsTicker
        copy={copy}
        referralCode={referralCode}
        reports={reports.slice(0, 5)}
      />

      <section className="mx-auto max-w-[92rem] px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {leadReport ? (
          <div className="space-y-7 sm:space-y-9">
            {activeReporterReferralCode ? (
              <ReporterFilterBanner
                copy={copy}
                locale={locale}
                newsHomeHref={newsHomeHref}
                profile={activeReporterProfile}
                reporterReferralCode={activeReporterReferralCode}
              />
            ) : null}

            <NewsFrontPage
              characterNewsStats={characterNewsStats}
              copy={copy}
              displayedNewsCount={displayedNewsCount}
              displayedReporterCount={displayedReporterCount}
              heroSideReports={heroSideReports}
              leadReport={leadReport}
              locale={locale}
              nsfwOptInEnabled={nsfwOptInEnabled}
              referralCode={referralCode}
              reporterStats={reporterStats}
              selectedReporterReferralCode={activeReporterReferralCode}
              topStories={topStories}
              visualReportCount={visualReportCount}
            />

            <FanletterServiceBridge
              locale={locale}
              newsHref={newsHomeHref}
              studioHref={studioHref}
              variant="news"
              vlogHref={charactersHref}
            />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22.5rem] xl:items-start">
              <div className="min-w-0 space-y-7 sm:space-y-9">
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
                  referralCode={referralCode}
                />

                <CharacterWireSection
                  copy={copy}
                  locale={locale}
                  nsfwOptInEnabled={nsfwOptInEnabled}
                  referralCode={referralCode}
                  reports={featureReports}
                />

                {latestSectionReports.length > 0 ? (
                  <section id="latest-news">
                    <SectionHeader
                      icon={<FileText className="size-5" />}
                      title={copy.latest}
                    />
                    <div className="grid gap-4 border border-black/10 bg-white p-3 shadow-[0_16px_36px_rgba(17,21,16,0.05)] sm:grid-cols-2 sm:p-4">
                      {latestSectionReports.map((report) => (
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

              <aside className="space-y-5 xl:sticky xl:top-4">
                <ReporterRank
                  copy={copy}
                  locale={locale}
                  referralCode={referralCode}
                  reporters={reporterStats}
                  selectedReporterReferralCode={activeReporterReferralCode}
                />

                <section className="border border-black/12 bg-white p-4 shadow-[0_16px_36px_rgba(17,21,16,0.06)]">
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
                        {formatNumber(displayedReporterCount, locale)}
                      </p>
                      <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.1em] text-black/42">
                        {copy.newsroomStatLabels.reporters}
                      </p>
                    </div>
                    <div className="bg-[#f5f6f2] p-3">
                      <p className="text-lg font-black">
                        {formatNumber(visualReportCount, locale)}
                      </p>
                      <p className="mt-1 text-[0.58rem] font-black uppercase tracking-[0.1em] text-black/42">
                        {copy.newsroomStatLabels.visuals}
                      </p>
                    </div>
                  </div>
                  {excludedNsfwReportCount > 0 ? (
                    <p className="mt-3 border-t border-black/10 pt-3 text-xs font-bold leading-5 text-black/42">
                      {locale === "ko"
                        ? `뉴스 홈 편집에서 NSFW 리포트 ${formatNumber(
                            excludedNsfwReportCount,
                            locale,
                          )}개를 제외했습니다.`
                        : `${formatNumber(
                            excludedNsfwReportCount,
                            locale,
                          )} NSFW reports are excluded from this news home edit.`}
                    </p>
                  ) : null}
                </section>
              </aside>
            </div>
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
