import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpenCheck,
  ImageIcon,
  Newspaper,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import {
  FanletterReportsCoverManager,
  type FanletterReportsPageReport,
} from "@/components/fanletter-reports-cover-manager";
import type { ContentMaturityRating } from "@/lib/content";
import { getFanletterNewsReportsForMember } from "@/lib/fanletter-news-report-service";
import { getFanletterNewsReporterIncentiveStats } from "@/lib/fanletter-news-reporter-incentives";
import {
  getFanletterNewsReporterTrustProfile,
  type FanletterNewsReporterTrustLevel,
} from "@/lib/fanletter-news-reporter-trust";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { readMemberServerSession } from "@/lib/member-server-session";

type FanletterNewsReportsSearchParams = {
  maturity?: string | string[];
  page?: string | string[];
  ref?: string | string[];
};

const NEWS_REPORTS_PAGE_SIZE = 12;
type ReportMaturityFilter = "all" | ContentMaturityRating;

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        badge: "FanLetter News 리포터",
        body:
          "팬 기자가 AI 캐릭터의 팬 파트너가 되어 리포트로 관심을 만들고, 보고싶어요·언락·유료 구매 기여를 수익 공유 기준으로 관리합니다.",
        connectBody:
          "FanLetter News에서 리포터로 활동한 회원만 볼 수 있는 관리 페이지입니다. 계정을 연결하면 작성한 뉴스 리포트와 보상 성과가 표시됩니다.",
        connectCta: "뉴스 계정 연결",
        connectTitle: "뉴스 리포터 계정 연결이 필요합니다.",
        coverDesk: "커버",
        coverDeskValue: "편집 가능",
        coverImage: "커버",
        deskBody:
          "뉴스 소비자에게 노출되는 뉴스, 원본 브이로그 이동, 커버 변경, 인센티브 성과를 모바일에서도 바로 확인할 수 있습니다.",
        deskEyebrow: "Reporter Desk",
        deskTitle: "뉴스 리포터 운영 현황",
        editReport: "내용 수정",
        emptyBody:
          "아직 뉴스 리포터로 작성한 AI 팬 리포트가 없습니다. 공개 브이로그에서 AI 리포트를 만들면 이곳에 모입니다.",
        emptyCta: "뉴스 브이로그 보기",
        emptyTitle: "관리할 뉴스 리포트가 없습니다.",
        filterReset: "전체 보기",
        filteredEmptyBody:
          "선택한 NSFW 기준에 해당하는 리포트가 없습니다. 필터를 바꾸면 다른 리포트를 바로 확인할 수 있습니다.",
        filteredEmptyTitle: (filter: string) => `${filter} 리포트가 없습니다.`,
        incentive: "성과",
        incentiveReward: "리포터 보상",
        newReportBody:
          "브이로그 후보를 고르고 티저 이미지를 16:9로 크롭해 뉴스 리포트를 발행합니다.",
        newReportCta: "새 리포트 작성",
        newReportTitle: "티저 기반 리포트 작성실",
        partnerModel: {
          attributedRevenue: "수익 공유 기준 매출",
          body:
            "리포터가 작성한 뉴스가 캐릭터 팬을 만들고 원본 브이로그 구매까지 이어지면 해당 리포트의 기여 성과로 기록됩니다.",
          eyebrow: "Fan Reporter Partner",
          paidPurchases: "유료 구매 기여",
          steps: ["리포트 작성", "팬 반응 유도", "포인트·수익 공유 기준 누적"],
          title: "팬 기자가 AI 캐릭터 IP 성장 파트너가 됩니다",
        },
        memberOnly: "회원 전용",
        maturity: {
          all: "전체",
          general: "일반",
          nsfw: "NSFW",
        },
        maturityBody:
          "뉴스에 노출되는 리포트의 성인 콘텐츠 여부를 기준으로 목록을 나누고, 커버/원본 브이로그/성과를 같은 화면에서 확인합니다.",
        maturityFilterLabel: "콘텐츠 등급 필터",
        maturityGeneral: "일반 리포트",
        maturityNsfw: "NSFW 리포트",
        maturityOverview: "콘텐츠 등급 관리",
        maturityTitle: "NSFW 리포트를 따로 점검하세요",
        nav: {
          characters: "AI 캐릭터",
          connect: "지갑",
          home: "뉴스 홈",
          purchases: "구매함",
        },
        nsfwGuideBody:
          "NSFW 리포트는 목록에서 명확히 표시됩니다. 커버 이미지와 뉴스 제목을 확인한 뒤 성인 팬 전용 콘텐츠로 운영할지 빠르게 점검하세요.",
        nsfwGuideTitle: "성인 콘텐츠 표시",
        openReport: "뉴스 보기",
        pagination: {
          label: "뉴스 리포트 페이지",
          next: "다음",
          pageStatus: (current: string, total: string) =>
            `${current} / ${total} 페이지`,
          previous: "이전",
        },
        reportCount: (count: string) => `작성 뉴스 ${count}개`,
        reportTitle: "뉴스 리포트",
        reporterId: "리포터 ID",
        reporterLogo: "리포터 프로필 이미지",
        reporterProfile: "로그인 리포터",
        reporterStatus: "활동 상태",
        reporterTrust: {
          basis:
            "작성 수, 최근 활동, 보고싶어요, 언락, 유료 구매 기여, 보상 포인트 기준",
          label: "팬 기자 신뢰도",
          max: "최고 등급 유지 중",
          next: (level: string, points: string) =>
            `${level}까지 ${points}점 남음`,
          score: (score: string) => `${score}점`,
          title: "내 팬 기자 등급",
          levels: {
            active: "활동 팬 기자",
            leading: "대표 팬 기자",
            starter: "신규 팬 기자",
            trusted: "신뢰 팬 기자",
          },
        },
        rewardPoints: (points: string) => `${points}P`,
        source: "원본 브이로그",
        sourceRevealVotes: "보고싶어요",
        statusCompleted: "활동 중",
        statusPending: "계정 준비 중",
        title: "뉴스 리포터 리포트 관리",
        unlockContributions: "언락 기여",
        updateCover: "커버 변경",
        updatedAt: "최근 수정",
      }
    : {
        badge: "FanLetter News reporter",
        body:
          "Fan reporters become AI character fan partners, creating demand through reports and tracking want-to-watch, unlock, and paid purchase contribution for revenue-sharing basis.",
        connectBody:
          "This desk is for members who report inside FanLetter News. Connect your account to see your news reports and rewards.",
        connectCta: "Connect news account",
        connectTitle: "Connect your news reporter account.",
        coverDesk: "Cover",
        coverDeskValue: "Editable",
        coverImage: "Cover",
        deskBody:
          "Review the news shown to readers, source-vlog flow, cover editing, and incentive performance from desktop or mobile.",
        deskEyebrow: "Reporter Desk",
        deskTitle: "News reporter operations",
        editReport: "Edit report",
        emptyBody:
          "You have not created AI fan reports as a news reporter yet. Reports created from public vlogs will appear here.",
        emptyCta: "Browse news vlogs",
        emptyTitle: "No news reports to manage.",
        filterReset: "View all",
        filteredEmptyBody:
          "There are no reports matching the selected NSFW filter. Switch filters to review the rest of your reports.",
        filteredEmptyTitle: (filter: string) => `No ${filter} reports.`,
        incentive: "Performance",
        incentiveReward: "Reporter rewards",
        newReportBody:
          "Choose a vlog candidate, crop a teaser image to 16:9, and publish a news report.",
        newReportCta: "Create new report",
        newReportTitle: "Teaser-based report desk",
        partnerModel: {
          attributedRevenue: "Revenue-share basis",
          body:
            "When a report helps readers become fans and purchase the source vlog, that purchase is attributed back to the fan reporter's report.",
          eyebrow: "Fan Reporter Partner",
          paidPurchases: "Paid purchase contribution",
          steps: ["Publish reports", "Drive fan actions", "Accumulate points and revenue-share basis"],
          title: "Fan reporters grow AI character IP as partners",
        },
        memberOnly: "Members only",
        maturity: {
          all: "All",
          general: "General",
          nsfw: "NSFW",
        },
        maturityBody:
          "Split your News reports by adult-content status while reviewing covers, source vlogs, and performance in the same desk.",
        maturityFilterLabel: "Content rating filter",
        maturityGeneral: "General reports",
        maturityNsfw: "NSFW reports",
        maturityOverview: "Content rating desk",
        maturityTitle: "Review NSFW reports separately",
        nav: {
          characters: "AI Characters",
          connect: "Wallet",
          home: "News Home",
          purchases: "Purchases",
        },
        nsfwGuideBody:
          "NSFW reports are clearly marked in the list. Review the cover image and headline before operating it as adult fan-only content.",
        nsfwGuideTitle: "Adult-content labeling",
        openReport: "Open news",
        pagination: {
          label: "News report pages",
          next: "Next",
          pageStatus: (current: string, total: string) =>
            `Page ${current} of ${total}`,
          previous: "Previous",
        },
        reportCount: (count: string) => `${count} news reports`,
        reportTitle: "News report",
        reporterId: "Reporter ID",
        reporterLogo: "Reporter profile image",
        reporterProfile: "Signed-in reporter",
        reporterStatus: "Status",
        reporterTrust: {
          basis:
            "Based on report count, recent activity, want-to-watch, unlocks, paid purchases, and reward points",
          label: "Fan reporter trust",
          max: "Top level maintained",
          next: (level: string, points: string) =>
            `${points} points to ${level}`,
          score: (score: string) => `${score} pts`,
          title: "My fan reporter level",
          levels: {
            active: "Active fan reporter",
            leading: "Leading fan reporter",
            starter: "New fan reporter",
            trusted: "Trusted fan reporter",
          },
        },
        rewardPoints: (points: string) => `${points}P`,
        source: "Source vlog",
        sourceRevealVotes: "Want-to-watch",
        statusCompleted: "Active",
        statusPending: "Account pending",
        title: "News reporter report desk",
        unlockContributions: "Unlocks",
        updateCover: "Change cover",
        updatedAt: "Updated",
      };
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatUsdt(value: number, locale: Locale) {
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value > 0 && value < 1 ? 2 : 0,
  }).format(value)} USDT`;
}

function readPageNumber(value?: string | string[]) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(rawValue ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function readMaturityFilter(value?: string | string[]): ReportMaturityFilter {
  const rawValue = Array.isArray(value) ? value[0] : value;

  return rawValue === "general" || rawValue === "nsfw" ? rawValue : "all";
}

function getNewsReportsPageHref({
  locale,
  maturityFilter,
  page,
  referralCode,
}: {
  locale: Locale;
  maturityFilter: ReportMaturityFilter;
  page: number;
  referralCode: string | null;
}) {
  const baseHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reports`,
    referralCode,
  );

  return setPathSearchParams(baseHref, {
    maturity: maturityFilter === "all" ? null : maturityFilter,
    page: page > 1 ? String(page) : null,
  });
}

function getReporterTrustLevelLabel(
  copy: ReturnType<typeof getCopy>,
  level: FanletterNewsReporterTrustLevel,
) {
  return copy.reporterTrust.levels[level];
}

function getReportPaginationItems({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const visiblePages = Array.from(
    new Set(
      [
        1,
        currentPage - 1,
        currentPage,
        currentPage + 1,
        totalPages,
      ].filter((page) => page >= 1 && page <= totalPages),
    ),
  ).sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];
  let previousPage: number | null = null;

  visiblePages.forEach((page) => {
    if (previousPage !== null && page - previousPage > 1) {
      items.push(page - previousPage === 2 ? previousPage + 1 : "ellipsis");
    }

    items.push(page);
    previousPage = page;
  });

  return items;
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
    title: `${copy.title} | FanLetter News`,
    description: copy.body,
    robots: {
      follow: false,
      index: false,
    },
  };
}

export default async function LocalizedFanletterNewsReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsReportsSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const maturityFilter = readMaturityFilter(query.maturity);
  const currentPage = readPageNumber(query.page);
  const reportOffset = (currentPage - 1) * NEWS_REPORTS_PAGE_SIZE;
  const session = await readMemberServerSession();
  const reportsBaseHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reports`,
    referralCode,
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    { returnTo: reportsBaseHref },
  );
  const data = session
    ? await getFanletterNewsReportsForMember({
        email: session.email,
        limit: NEWS_REPORTS_PAGE_SIZE,
        locale,
        maturityRating: maturityFilter === "all" ? null : maturityFilter,
        offset: reportOffset,
      })
    : {
        maturityCounts: {
          all: 0,
          general: 0,
          nsfw: 0,
        },
        member: null,
        reportCount: 0,
        reports: [],
      };
  const [overviewIncentiveStats, pageIncentiveStats] = data.member
    ? await Promise.all([
        getFanletterNewsReporterIncentiveStats({
          reporterReferralCode: data.member.referralCode,
        }),
        getFanletterNewsReporterIncentiveStats({
          reporterReferralCode: data.member.referralCode,
          reportIds: data.reports.map((report) => report.reportId),
        }),
      ])
    : [null, null];
  const effectiveReferralCode = referralCode ?? data.member?.referralCode ?? null;
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    effectiveReferralCode,
  );
  const charactersHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters`,
    effectiveReferralCode,
  );
  const purchasesHref = buildPathWithReferral(
    `/${locale}/fanletter/news/purchases`,
    effectiveReferralCode,
  );
  const walletHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, effectiveReferralCode),
    { returnTo: newsHomeHref },
  );
  const effectiveNewReportHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reports/new`,
    effectiveReferralCode,
  );
  const topNavItems = [
    {
      href: newsHomeHref,
      icon: Newspaper,
      label: copy.nav.home,
    },
    {
      href: charactersHref,
      icon: Sparkles,
      label: copy.nav.characters,
    },
    {
      href: purchasesHref,
      icon: BookOpenCheck,
      label: copy.nav.purchases,
    },
    {
      href: walletHref,
      icon: WalletCards,
      label: copy.nav.connect,
    },
  ];
  const reporterStatusLabel = data.member
    ? data.member.status === "completed"
      ? copy.statusCompleted
      : copy.statusPending
    : copy.memberOnly;
  const reporterInitial = data.member
    ? data.member.displayName.trim().charAt(0).toUpperCase() ||
      data.member.referralCode.trim().charAt(0).toUpperCase() ||
      "N"
    : "N";
  const reporterTrust = data.member
    ? getFanletterNewsReporterTrustProfile({
        latestReportAt: data.reports[0]?.updatedAt ?? null,
        paidUnlockPurchaseCount:
          overviewIncentiveStats?.overview.paidUnlockPurchaseCount ?? 0,
        reportCount: data.maturityCounts.all,
        rewardPoints: overviewIncentiveStats?.overview.rewardPoints ?? 0,
        sourceRevealUnlockContributionCount:
          overviewIncentiveStats?.overview
            .sourceRevealUnlockContributionCount ?? 0,
        sourceRevealVoteCount:
          overviewIncentiveStats?.overview.sourceRevealVoteCount ?? 0,
        status: data.member.status,
      })
    : null;
  const reporterTrustLevelLabel = reporterTrust
    ? getReporterTrustLevelLabel(copy, reporterTrust.level)
    : null;
  const reporterTrustNextLabel =
    reporterTrust && reporterTrust.nextLevel
      ? copy.reporterTrust.next(
          getReporterTrustLevelLabel(copy, reporterTrust.nextLevel),
          formatNumber(reporterTrust.pointsToNextLevel, locale),
        )
      : copy.reporterTrust.max;
  const reporterStats = data.member
    ? [
        {
          label: copy.reporterId,
          value: `@${data.member.referralCode}`,
        },
        {
          label: copy.reporterStatus,
          value: reporterStatusLabel,
        },
        {
          label: copy.coverDesk,
          value: copy.coverDeskValue,
        },
        {
          label: copy.sourceRevealVotes,
          value: formatNumber(
            overviewIncentiveStats?.overview.sourceRevealVoteCount ?? 0,
            locale,
          ),
        },
        {
          label: copy.unlockContributions,
          value: formatNumber(
            overviewIncentiveStats?.overview
              .sourceRevealUnlockContributionCount ?? 0,
            locale,
          ),
        },
        {
          label: copy.partnerModel.paidPurchases,
          value: formatNumber(
            overviewIncentiveStats?.overview.paidUnlockPurchaseCount ?? 0,
            locale,
          ),
        },
        {
          label: copy.partnerModel.attributedRevenue,
          value: formatUsdt(
            overviewIncentiveStats?.overview.paidUnlockRevenueUsdt ?? 0,
            locale,
          ),
        },
        {
          label: copy.maturityNsfw,
          value: formatNumber(data.maturityCounts.nsfw, locale),
        },
        {
          label: copy.maturityGeneral,
          value: formatNumber(data.maturityCounts.general, locale),
        },
        {
          label: copy.reporterTrust.label,
          value: reporterTrust
            ? copy.reporterTrust.score(formatNumber(reporterTrust.score, locale))
            : "-",
        },
        {
          label: copy.incentiveReward,
          value: copy.rewardPoints(
            formatNumber(
              overviewIncentiveStats?.overview.rewardPoints ?? 0,
              locale,
            ),
          ),
        },
      ]
    : [];
  const totalPages = Math.max(
    1,
    Math.ceil(data.reportCount / NEWS_REPORTS_PAGE_SIZE),
  );
  const paginationItems = getReportPaginationItems({
    currentPage,
    totalPages,
  });
  const currentReportsHref = getNewsReportsPageHref({
    locale,
    maturityFilter,
    page: currentPage,
    referralCode: effectiveReferralCode,
  });
  const maturityFilterItems = [
    {
      count: data.maturityCounts.all,
      href: getNewsReportsPageHref({
        locale,
        maturityFilter: "all",
        page: 1,
        referralCode: effectiveReferralCode,
      }),
      key: "all" as const,
      label: copy.maturity.all,
    },
    {
      count: data.maturityCounts.general,
      href: getNewsReportsPageHref({
        locale,
        maturityFilter: "general",
        page: 1,
        referralCode: effectiveReferralCode,
      }),
      key: "general" as const,
      label: copy.maturity.general,
    },
    {
      count: data.maturityCounts.nsfw,
      href: getNewsReportsPageHref({
        locale,
        maturityFilter: "nsfw",
        page: 1,
        referralCode: effectiveReferralCode,
      }),
      key: "nsfw" as const,
      label: copy.maturity.nsfw,
    },
  ];
  const selectedMaturityLabel = copy.maturity[maturityFilter];
  const hasAnyReports = data.maturityCounts.all > 0;
  const reportItems: FanletterReportsPageReport[] = data.reports.map((report) => {
    const reportIncentives =
      pageIncentiveStats?.reports.get(report.reportId) ?? {
        paidUnlockPurchaseCount: 0,
        paidUnlockRevenueUsdt: 0,
        rewardPoints: 0,
        sourceRevealUnlockContributionCount: 0,
        sourceRevealVoteCount: 0,
      };
    const reportHref = buildPathWithReferral(
      `/${locale}/fanletter/news/${report.reportId}`,
      effectiveReferralCode,
    );
    const editHref = setPathSearchParams(
      buildPathWithReferral(
        `/${locale}/fanletter/reports/${report.reportId}`,
        effectiveReferralCode,
      ),
      { returnTo: currentReportsHref },
    );
    const sourceHref = setPathSearchParams(
      buildPathWithReferral(
        `/${locale}/fanletter/news/vlogs/${report.contentId}`,
        effectiveReferralCode,
      ),
      { returnTo: currentReportsHref },
    );

    return {
      contentId: report.contentId,
      creatorName: report.creatorName,
      coverImageSource: report.coverImageSource ?? "auto",
      coverImageUrl: report.coverImageUrl,
      contentMaturityRating: report.contentMaturityRating,
      dek: report.dek,
      editHref,
      incentiveRewardPoints: reportIncentives.rewardPoints,
      paidUnlockPurchaseCount: reportIncentives.paidUnlockPurchaseCount,
      paidUnlockRevenueUsdt: reportIncentives.paidUnlockRevenueUsdt,
      priceType: report.priceType,
      reportHref,
      reportId: report.reportId,
      sourceHref,
      sourceTitle: report.sourceTitle,
      sourceRevealUnlockContributionCount:
        reportIncentives.sourceRevealUnlockContributionCount,
      sourceRevealVoteCount: reportIncentives.sourceRevealVoteCount,
      sourcePublishedAt: report.sourcePublishedAt?.toISOString() ?? null,
      title: report.title,
      updatedAt: report.updatedAt.toISOString(),
    };
  });

  if (data.member && hasAnyReports && currentPage > totalPages) {
    redirect(
      getNewsReportsPageHref({
        locale,
        maturityFilter,
        page: totalPages,
        referralCode: effectiveReferralCode,
      }),
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef1ec] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 text-[#111510] sm:px-6 sm:pb-12 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/12 pb-3">
          <Link
            className="inline-flex items-center gap-2 text-sm font-black !text-[#16702e]"
            href={newsHomeHref}
          >
            <Newspaper className="size-4" />
            FanLetter News
          </Link>
          <nav className="hidden items-center gap-2 sm:flex">
            {topNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-3 text-xs font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                  href={item.href}
                  key={item.label}
                >
                  <Icon className="size-4 text-[#16702e]" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(21rem,27rem)] lg:items-stretch">
          <div className="flex min-h-[21rem] flex-col justify-between border border-black/12 bg-white p-5 shadow-[0_18px_46px_rgba(17,21,16,0.07)] sm:p-7">
            <div>
              <p className="inline-flex items-center gap-1.5 border border-[#16702e]/20 bg-[#f6f8f4] px-2.5 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                <BadgeCheck className="size-3.5" />
                {copy.badge}
              </p>
              <h1 className="mt-4 max-w-3xl text-[2.4rem] font-black leading-none tracking-normal [word-break:keep-all] sm:text-[4rem]">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-black/60 sm:text-base sm:leading-7">
                {copy.body}
              </p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:hidden">
              {topNavItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    className="inline-flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-full border border-black/10 bg-[#f6f8f4] px-2 text-xs font-black !text-[#111510]"
                    href={item.href}
                    key={item.label}
                  >
                    <Icon className="size-3.5 shrink-0 text-[#16702e]" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <aside className="border border-black/12 bg-[#111510] p-5 text-white shadow-[0_18px_46px_rgba(17,21,16,0.16)] sm:p-6">
            <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#44f26e]">
              <BarChart3 className="size-3.5" />
              {copy.deskEyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-black leading-tight tracking-normal [word-break:keep-all]">
              {copy.deskTitle}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/62">
              {copy.deskBody}
            </p>
            {data.member ? (
              <>
                <div className="mt-5 flex min-w-0 items-center gap-3 border-y border-white/12 py-4">
                  <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-lg font-black text-[#16702e] ring-1 ring-white/12">
                    {data.member.avatarImageUrl ? (
                      <Image
                        alt={copy.reporterLogo}
                        className="object-cover"
                        fill
                        sizes="3.5rem"
                        src={data.member.avatarImageUrl}
                        unoptimized={shouldBypassFanletterImageOptimization(
                          data.member.avatarImageUrl,
                        )}
                      />
                    ) : (
                      reporterInitial
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#44f26e]">
                      {copy.reporterProfile}
                    </p>
                    <p className="mt-1 truncate text-lg font-black leading-tight">
                      {data.member.displayName}
                    </p>
                    <p className="mt-1 truncate text-xs font-bold text-white/46">
                      @{data.member.referralCode}
                    </p>
                  </div>
                </div>
                {reporterTrust && reporterTrustLevelLabel ? (
                  <div className="mt-4 border border-[#44f26e]/18 bg-white/[0.06] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#44f26e]">
                        <ShieldCheck className="size-3.5" />
                        {copy.reporterTrust.title}
                      </p>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e] px-2.5 py-1 text-[0.68rem] font-black text-[#111510]">
                        <TrendingUp className="size-3.5" />
                        {copy.reporterTrust.score(
                          formatNumber(reporterTrust.score, locale),
                        )}
                      </span>
                    </div>
                    <p className="mt-3 text-xl font-black leading-tight">
                      {reporterTrustLevelLabel}
                    </p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/12">
                      <div
                        className="h-full rounded-full bg-[#44f26e]"
                        style={{ width: `${reporterTrust.progressPercent}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs font-semibold leading-5 text-white/54">
                      {copy.reporterTrust.basis} · {reporterTrustNextLabel}
                    </p>
                  </div>
                ) : null}
                <p className="mt-4 text-xl font-black">
                  {copy.reportCount(
                    formatNumber(data.maturityCounts.all, locale),
                  )}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {reporterStats.map((stat) => (
                    <div
                      className="border border-white/10 bg-white/[0.06] px-3 py-2"
                      key={stat.label}
                    >
                      <p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-white/38">
                        {stat.label}
                      </p>
                      <p className="mt-1 truncate text-sm font-black">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
                <Link
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black !text-[#111510] transition hover:bg-[#65ff86]"
                  href={effectiveNewReportHref}
                >
                  {copy.newReportCta}
                  <ArrowRight className="size-4" />
                </Link>
              </>
            ) : (
              <p className="mt-5 inline-flex rounded-full bg-[#44f26e] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#111510]">
                {copy.memberOnly}
              </p>
            )}
          </aside>
        </div>

        {data.member ? (
          <section className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="border border-black/12 bg-white p-4 shadow-[0_14px_34px_rgba(17,21,16,0.055)] sm:p-5">
              <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                <Sparkles className="size-3.5" />
                {copy.partnerModel.eyebrow}
              </p>
              <h2 className="mt-3 max-w-3xl text-2xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-3xl">
                {copy.partnerModel.title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-black/58">
                {copy.partnerModel.body}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {copy.partnerModel.steps.map((step, index) => (
                  <div
                    className="border border-black/10 bg-[#f6f8f4] px-3 py-3"
                    key={step}
                  >
                    <p className="text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <p className="mt-1 text-sm font-black text-[#111510]">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
              <Link
                className="mt-4 flex items-center justify-between gap-4 border border-[#19b84b]/20 bg-[#ecfff0] px-4 py-3 !text-[#111510] transition hover:border-[#19b84b]/45 hover:bg-white"
                href={effectiveNewReportHref}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-black">
                    {copy.newReportTitle}
                  </span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-black/56">
                    {copy.newReportBody}
                  </span>
                </span>
                <ArrowRight className="size-5 shrink-0 text-[#16702e]" />
              </Link>
            </div>
            <aside className="border border-[#16702e]/18 bg-[#111510] p-4 text-white shadow-[0_14px_34px_rgba(17,21,16,0.14)] sm:p-5">
              <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#44f26e]">
                <WalletCards className="size-3.5" />
                {copy.partnerModel.attributedRevenue}
              </p>
              <p className="mt-3 text-3xl font-black leading-none">
                {formatUsdt(
                  overviewIncentiveStats?.overview.paidUnlockRevenueUsdt ?? 0,
                  locale,
                )}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="border border-white/10 bg-white/[0.06] px-3 py-2">
                  <p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-white/38">
                    {copy.partnerModel.paidPurchases}
                  </p>
                  <p className="mt-1 text-sm font-black">
                    {formatNumber(
                      overviewIncentiveStats?.overview
                        .paidUnlockPurchaseCount ?? 0,
                      locale,
                    )}
                  </p>
                </div>
                <div className="border border-[#44f26e]/20 bg-[#44f26e]/10 px-3 py-2">
                  <p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-[#b9ffc8]/68">
                    {copy.incentiveReward}
                  </p>
                  <p className="mt-1 text-sm font-black text-[#b9ffc8]">
                    {copy.rewardPoints(
                      formatNumber(
                        overviewIncentiveStats?.overview.rewardPoints ?? 0,
                        locale,
                      ),
                    )}
                  </p>
                </div>
              </div>
            </aside>
          </section>
        ) : null}

        {!session || !data.member ? (
          <section className="mt-2 border border-black/12 bg-white p-5 shadow-[0_18px_46px_rgba(17,21,16,0.08)] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <p className="inline-flex size-11 items-center justify-center rounded-full bg-[#111510] text-[#44f26e]">
                  <WalletCards className="size-5" />
                </p>
                <h2 className="mt-4 text-2xl font-black tracking-normal">
                  {copy.connectTitle}
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-black/58">
                  {copy.connectBody}
                </p>
              </div>
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black !text-white transition hover:bg-black"
                href={connectHref}
              >
                {copy.connectCta}
                <ArrowRight className="size-4 text-[#44f26e]" />
              </Link>
            </div>
          </section>
        ) : !hasAnyReports ? (
          <section className="mt-2 border border-dashed border-black/16 bg-white p-6 text-center shadow-[0_18px_46px_rgba(17,21,16,0.06)]">
            <ImageIcon className="mx-auto size-9 text-[#16702e]" />
            <h2 className="mt-4 text-2xl font-black tracking-normal">
              {copy.emptyTitle}
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-black/58">
              {copy.emptyBody}
            </p>
            <Link
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black !text-white transition hover:bg-black"
              href={effectiveNewReportHref}
            >
              {copy.newReportCta}
              <ArrowRight className="size-4 text-[#44f26e]" />
            </Link>
          </section>
        ) : (
          <>
            <section className="mt-2 grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="border border-black/12 bg-white p-4 shadow-[0_14px_34px_rgba(17,21,16,0.06)] sm:p-5">
                <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                  <SlidersHorizontal className="size-3.5" />
                  {copy.maturityOverview}
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="max-w-2xl">
                    <h2 className="text-2xl font-black leading-tight tracking-normal [word-break:keep-all]">
                      {copy.maturityTitle}
                    </h2>
                    <p className="mt-2 text-sm font-semibold leading-6 text-black/56">
                      {copy.maturityBody}
                    </p>
                  </div>
                  <div
                    aria-label={copy.maturityFilterLabel}
                    className="flex flex-wrap gap-2"
                  >
                    {maturityFilterItems.map((item) => {
                      const isActive = item.key === maturityFilter;

                      return (
                        <Link
                          aria-current={isActive ? "page" : undefined}
                          className={`inline-flex h-10 items-center justify-center gap-2 rounded-full border px-3 text-sm font-black transition ${
                            isActive
                              ? "border-[#111510] bg-[#111510] !text-white"
                              : "border-black/12 bg-[#f6f8f4] !text-[#111510] hover:border-[#19b84b] hover:bg-[#ecfff0]"
                          }`}
                          href={item.href}
                          key={item.key}
                        >
                          <span>{item.label}</span>
                          <span
                            className={`inline-flex min-w-6 justify-center rounded-full px-1.5 py-0.5 text-[0.68rem] ${
                              isActive
                                ? "bg-white/14 text-white"
                                : "bg-white text-black/54"
                            }`}
                          >
                            {formatNumber(item.count, locale)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

              <aside className="border border-[#16702e]/18 bg-[#111510] p-4 text-white shadow-[0_14px_34px_rgba(17,21,16,0.14)] sm:p-5">
                <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#44f26e]">
                  <ShieldAlert className="size-3.5" />
                  {copy.nsfwGuideTitle}
                </p>
                <p className="mt-3 text-3xl font-black leading-none">
                  {formatNumber(data.maturityCounts.nsfw, locale)}
                </p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.1em] text-white/42">
                  {copy.maturityNsfw}
                </p>
                <p className="mt-3 text-sm font-semibold leading-6 text-white/62">
                  {copy.nsfwGuideBody}
                </p>
              </aside>
            </section>

            {data.reportCount === 0 ? (
              <section className="mt-4 border border-dashed border-black/16 bg-white p-6 text-center shadow-[0_18px_46px_rgba(17,21,16,0.06)]">
                <ShieldAlert className="mx-auto size-9 text-[#16702e]" />
                <h2 className="mt-4 text-2xl font-black tracking-normal">
                  {copy.filteredEmptyTitle(selectedMaturityLabel)}
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-black/58">
                  {copy.filteredEmptyBody}
                </p>
                <Link
                  className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black !text-white transition hover:bg-black"
                  href={getNewsReportsPageHref({
                    locale,
                    maturityFilter: "all",
                    page: 1,
                    referralCode: effectiveReferralCode,
                  })}
                >
                  {copy.filterReset}
                  <ArrowRight className="size-4 text-[#44f26e]" />
                </Link>
              </section>
            ) : (
              <FanletterReportsCoverManager
                copy={{
                  coverImage: copy.coverImage,
                  editReport: copy.editReport,
                  incentive: copy.incentive,
                  openReport: copy.openReport,
                  paidPurchases: copy.partnerModel.paidPurchases,
                  reportTitle: copy.reportTitle,
                  rewardPoints: copy.incentiveReward,
                  revenueShare: copy.partnerModel.attributedRevenue,
                  source: copy.source,
                  sourceRevealVotes: copy.sourceRevealVotes,
                  unlockContributions: copy.unlockContributions,
                  updateCover: copy.updateCover,
                  updatedAt: copy.updatedAt,
                }}
                locale={locale}
                reports={reportItems}
              />
            )}

            {data.reportCount > 0 && totalPages > 1 ? (
              <nav
                aria-label={copy.pagination.label}
                className="mt-7 flex flex-col gap-3 border-t border-black/12 pt-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-sm font-black text-black/48">
                  {copy.pagination.pageStatus(
                    formatNumber(currentPage, locale),
                    formatNumber(totalPages, locale),
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    aria-disabled={currentPage <= 1}
                    className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-black transition ${
                      currentPage <= 1
                        ? "pointer-events-none border-black/8 bg-white text-black/24"
                        : "border-black/12 bg-white !text-[#111510] hover:border-[#19b84b] hover:bg-[#ecfff0]"
                    }`}
                    href={getNewsReportsPageHref({
                      locale,
                      maturityFilter,
                      page: Math.max(1, currentPage - 1),
                      referralCode: effectiveReferralCode,
                    })}
                  >
                    {copy.pagination.previous}
                  </Link>
                  {paginationItems.map((item, index) =>
                    item === "ellipsis" ? (
                      <span
                        aria-hidden="true"
                        className="inline-flex size-10 items-center justify-center text-sm font-black text-black/34"
                        key={`ellipsis-${index}`}
                      >
                        ...
                      </span>
                    ) : (
                      <Link
                        aria-current={item === currentPage ? "page" : undefined}
                        className={`inline-flex size-10 items-center justify-center rounded-full border text-sm font-black transition ${
                          item === currentPage
                            ? "border-[#111510] bg-[#111510] !text-white"
                            : "border-black/12 bg-white !text-[#111510] hover:border-[#19b84b] hover:bg-[#ecfff0]"
                        }`}
                        href={getNewsReportsPageHref({
                          locale,
                          maturityFilter,
                          page: item,
                          referralCode: effectiveReferralCode,
                        })}
                        key={item}
                      >
                        {formatNumber(item, locale)}
                      </Link>
                    ),
                  )}
                  <Link
                    aria-disabled={currentPage >= totalPages}
                    className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-black transition ${
                      currentPage >= totalPages
                        ? "pointer-events-none border-black/8 bg-white text-black/24"
                        : "border-black/12 bg-white !text-[#111510] hover:border-[#19b84b] hover:bg-[#ecfff0]"
                    }`}
                    href={getNewsReportsPageHref({
                      locale,
                      maturityFilter,
                      page: Math.min(totalPages, currentPage + 1),
                      referralCode: effectiveReferralCode,
                    })}
                  >
                    {copy.pagination.next}
                  </Link>
                </div>
              </nav>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
