import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  ImageIcon,
  Newspaper,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  WalletCards,
} from "lucide-react";

import {
  FanletterReportsCoverManager,
  type FanletterReportsPageReport,
} from "@/components/fanletter-reports-cover-manager";
import { FanletterNewsReportsSessionBridge } from "@/components/fanletter-news-reports-session-bridge";
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
        badge: "내 FanLetter News",
        body:
          "내가 만든 팬 리포트를 독자가 보는 뉴스 카드처럼 모아보고, 필요한 리포트만 다시 열어 수정하세요.",
        connectBody:
          "내가 작성한 팬 리포트를 보려면 FanLetter News 계정을 연결하세요. 연결 후 내 뉴스와 작성 흐름을 바로 이어갈 수 있습니다.",
        connectCta: "뉴스 계정 연결",
        connectTitle: "FanLetter News 연결이 필요합니다.",
        coverDesk: "커버",
        coverDeskValue: "편집 가능",
        coverImage: "커버",
        deskBody:
          "발행한 팬 리포트, 원본 브이로그, 이미지 수정 진입을 한 화면에서 편하게 확인합니다.",
        deskEyebrow: "My reports",
        deskTitle: "내 팬 리포트",
        editReport: "내용 수정",
        emptyBody:
          "아직 작성한 AI 팬 리포트가 없습니다. 공개 브이로그에서 마음에 드는 장면을 골라 첫 리포트를 만들어보세요.",
        emptyCta: "뉴스 브이로그 보기",
        emptyTitle: "아직 만든 팬 리포트가 없습니다.",
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
          "전체, 일반, NSFW 리포트를 골라 내 뉴스 카드를 빠르게 찾아볼 수 있습니다.",
        maturityFilterLabel: "콘텐츠 등급 필터",
        maturityGeneral: "일반 리포트",
        maturityNsfw: "NSFW 리포트",
        maturityOverview: "리포트 모아보기",
        maturityTitle: "내 뉴스 카드 보기",
        nav: {
          characters: "AI 캐릭터",
          connect: "지갑",
          home: "뉴스 홈",
          purchases: "구매함",
        },
        nsfwGuideBody:
          "NSFW 리포트는 카드에 별도 표시됩니다. 원하는 등급만 골라 편하게 확인하세요.",
        nsfwGuideTitle: "NSFW 리포트",
        openReport: "뉴스 보기",
        pagination: {
          label: "뉴스 리포트 페이지",
          next: "다음",
          pageStatus: (current: string, total: string) =>
            `${current} / ${total} 페이지`,
          previous: "이전",
        },
        photoCollection: "포토 컬렉션",
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
        title: "내 팬 리포트",
        unlockContributions: "언락 기여",
        updateCover: "커버/티저 변경",
        updatedAt: "최근 수정",
      }
    : {
        badge: "My FanLetter News",
        body:
          "Browse the fan reports you created as reader-facing news cards, then reopen only the stories you want to update.",
        connectBody:
          "Connect your FanLetter News account to see the fan reports you created and continue your writing flow.",
        connectCta: "Connect news account",
        connectTitle: "Connect FanLetter News.",
        coverDesk: "Cover",
        coverDeskValue: "Editable",
        coverImage: "Cover",
        deskBody:
          "Review your published fan reports, source vlogs, and image-edit entry points in one simple view.",
        deskEyebrow: "My reports",
        deskTitle: "My fan reports",
        editReport: "Edit report",
        emptyBody:
          "You have not created an AI fan report yet. Pick a public vlog scene and publish your first report.",
        emptyCta: "Browse news vlogs",
        emptyTitle: "No fan reports yet.",
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
          "Filter all, general, and NSFW reports to quickly find your own news cards.",
        maturityFilterLabel: "Content rating filter",
        maturityGeneral: "General reports",
        maturityNsfw: "NSFW reports",
        maturityOverview: "Browse reports",
        maturityTitle: "My news cards",
        nav: {
          characters: "AI Characters",
          connect: "Wallet",
          home: "News Home",
          purchases: "Purchases",
        },
        nsfwGuideBody:
          "NSFW reports are marked on cards. Pick a rating filter to browse comfortably.",
        nsfwGuideTitle: "NSFW reports",
        openReport: "Open news",
        pagination: {
          label: "News report pages",
          next: "Next",
          pageStatus: (current: string, total: string) =>
            `Page ${current} of ${total}`,
          previous: "Previous",
        },
        photoCollection: "Photo collection",
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
        title: "My fan reports",
        unlockContributions: "Unlocks",
        updateCover: "Cover/teasers",
        updatedAt: "Updated",
      };
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
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
  const requestedReportsHref = getNewsReportsPageHref({
    locale,
    maturityFilter,
    page: currentPage,
    referralCode,
  });
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    { returnTo: requestedReportsHref },
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
  const overviewIncentiveStats = data.member
    ? await getFanletterNewsReporterIncentiveStats({
        reporterReferralCode: data.member.referralCode,
      })
    : null;
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
  const currentReportsHref = getNewsReportsPageHref({
    locale,
    maturityFilter,
    page: currentPage,
    referralCode: effectiveReferralCode,
  });
  const walletHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, effectiveReferralCode),
    { returnTo: currentReportsHref },
  );
  const effectiveNewReportHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reports/new`,
    effectiveReferralCode,
  );
  const photoCollectionHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reporter/photos`,
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
  const totalPages = Math.max(
    1,
    Math.ceil(data.reportCount / NEWS_REPORTS_PAGE_SIZE),
  );
  const paginationItems = getReportPaginationItems({
    currentPage,
    totalPages,
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
      priceType: report.priceType,
      reportHref,
      reportId: report.reportId,
      sourceHref,
      sourceTitle: report.sourceTitle,
      sourcePublishedAt: report.sourcePublishedAt?.toISOString() ?? null,
      teaserImageUrls: report.teaserImageUrls ?? [],
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
      <FanletterNewsReportsSessionBridge
        hasServerSession={Boolean(session)}
        locale={locale}
        serverReporterProfile={
          data.member
            ? {
                avatarImageUrl: data.member.avatarImageUrl,
                displayName: data.member.displayName,
                referralCode: data.member.referralCode,
              }
            : null
        }
        serverSessionEmail={session?.email ?? null}
        serverSessionWalletAddress={session?.walletAddress ?? null}
      />
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
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

        <section className="overflow-hidden border border-black/10 bg-white shadow-[0_18px_46px_rgba(17,21,16,0.06)]">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="p-5 sm:p-7">
              <p className="inline-flex items-center gap-1.5 border border-[#16702e]/20 bg-[#f6f8f4] px-2.5 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                <BadgeCheck className="size-3.5" />
                {copy.badge}
              </p>
              <h1 className="mt-4 max-w-3xl text-[2.1rem] font-black leading-[1.04] tracking-normal [word-break:keep-all] sm:text-[3.2rem]">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-black/60 sm:text-base sm:leading-7">
                {copy.body}
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-black !text-[#111510] transition hover:bg-[#65ff86]"
                  href={effectiveNewReportHref}
                >
                  {copy.newReportCta}
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-black/10 bg-[#f6f8f4] px-5 text-sm font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                  href={photoCollectionHref}
                >
                  <ImageIcon className="size-4 text-[#16702e]" />
                  {copy.photoCollection}
                </Link>
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-black/10 bg-[#f6f8f4] px-5 text-sm font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                  href={newsHomeHref}
                >
                  <Newspaper className="size-4 text-[#16702e]" />
                  {copy.nav.home}
                </Link>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:hidden">
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

            <aside className="border-t border-black/10 bg-[#f6f8f4] p-5 lg:border-l lg:border-t-0">
              {data.member ? (
                <div className="flex h-full flex-col justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-xl font-black text-[#16702e] ring-1 ring-black/10">
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
                      <p className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#16702e]">
                        {copy.reporterProfile}
                      </p>
                      <p className="mt-1 truncate text-lg font-black leading-tight">
                        {data.member.displayName}
                      </p>
                      <p className="mt-1 truncate text-xs font-bold text-black/46">
                        @{data.member.referralCode}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className="border border-black/10 bg-white px-3 py-3">
                      <p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-black/38">
                        {copy.reportTitle}
                      </p>
                      <p className="mt-1 text-xl font-black">
                        {formatNumber(data.maturityCounts.all, locale)}
                      </p>
                    </div>
                    <div className="border border-black/10 bg-white px-3 py-3">
                      <p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-black/38">
                        {copy.reporterStatus}
                      </p>
                      <p className="mt-1 truncate text-sm font-black">
                        {reporterStatusLabel}
                      </p>
                    </div>
                    {reporterTrustLevelLabel ? (
                      <div className="col-span-2 border border-[#19b84b]/18 bg-[#ecfff0] px-3 py-3">
                        <p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-[#16702e]/70">
                          {copy.reporterTrust.label}
                        </p>
                        <p className="mt-1 truncate text-sm font-black text-[#16702e]">
                          {reporterTrustLevelLabel}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col justify-between gap-5">
                  <div>
                    <p className="inline-flex size-11 items-center justify-center rounded-full bg-white text-[#16702e] ring-1 ring-black/10">
                      <WalletCards className="size-5" />
                    </p>
                    <h2 className="mt-4 text-xl font-black leading-tight tracking-normal [word-break:keep-all]">
                      {copy.connectTitle}
                    </h2>
                    <p className="mt-2 text-sm font-semibold leading-6 text-black/56">
                      {copy.connectBody}
                    </p>
                  </div>
                  <Link
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black !text-white transition hover:bg-black"
                    href={connectHref}
                  >
                    {copy.connectCta}
                    <ArrowRight className="size-4 text-[#44f26e]" />
                  </Link>
                </div>
              )}
            </aside>
          </div>
        </section>

        {!session || !data.member ? null : !hasAnyReports ? (
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
            <section className="mt-4 border border-black/10 bg-white p-4 shadow-[0_14px_34px_rgba(17,21,16,0.045)] sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-2xl">
                  <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                    <SlidersHorizontal className="size-3.5" />
                    {copy.maturityOverview}
                  </p>
                  <h2 className="mt-2 text-2xl font-black leading-tight tracking-normal [word-break:keep-all]">
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
              {data.maturityCounts.nsfw > 0 ? (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-rose-500/18 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700">
                  <ShieldAlert className="size-3.5" />
                  {copy.nsfwGuideTitle}:{" "}
                  {formatNumber(data.maturityCounts.nsfw, locale)}
                </p>
              ) : null}
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
                variant="card-grid"
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
