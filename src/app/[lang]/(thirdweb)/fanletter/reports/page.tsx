import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Clapperboard,
  ImageIcon,
  LayoutDashboard,
  Newspaper,
  WalletCards,
} from "lucide-react";

import {
  FanletterReportsCoverManager,
  type FanletterReportsPageReport,
} from "@/components/fanletter-reports-cover-manager";
import { getFanletterNewsReportsForMember } from "@/lib/fanletter-news-report-service";
import { getFanletterNewsReporterIncentiveStats } from "@/lib/fanletter-news-reporter-incentives";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { readMemberServerSession } from "@/lib/member-server-session";

type FanletterReportsSearchParams = {
  page?: string | string[];
  ref?: string | string[];
};

const REPORTS_PAGE_SIZE = 12;

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        badge: "팬 리포터 데스크",
        body:
          "AIAVpark에서 팬 리포터로 활동하는 회원이 작성한 AI 팬 리포트, 원본 브이로그, 대표 커버를 PC와 모바일에서 관리하는 공간입니다.",
        connectBody:
          "AIAVpark 리포터 회원 서비스입니다. 계정을 연결하면 내가 만든 AI 팬 리포트와 대표 이미지 선택 상태를 확인할 수 있습니다.",
        connectCta: "계정 연결하기",
        connectTitle: "팬 리포터 계정 연결이 필요합니다.",
        coverSource: {
          auto: "자동 커버",
          reporter_cropped: "와이드 크롭",
          reporter_selected: "직접 선택",
        },
        coverDesk: "커버 관리",
        coverDeskValue: "변경 가능",
        coverImage: "커버",
        deskBody:
          "공개 브이로그 상세에서 AI 리포트를 만들고, 이 페이지에서 작성 리포트와 커버 편집을 이어갑니다.",
        deskLabel: "리포터 회원 서비스",
        deskTitle: "AIAVpark 리포터 활동 관리",
        editReport: "내용 수정",
        emptyBody:
          "아직 작성한 AI 팬 리포트가 없습니다. 공개 브이로그 상세에서 AI 리포트를 만들면 리포터 데스크에 모입니다.",
        emptyCta: "브이로그 보러가기",
        emptyTitle: "작성한 리포트가 없습니다.",
        feed: "브이로그 피드",
        incentive: "성과",
        incentiveReward: "리포터 보상",
        memberOnly: "회원 전용",
        newsroom: "뉴스룸",
        openReport: "리포트 보기",
        paidPurchases: "구매 기여",
        pagination: {
          label: "리포트 페이지",
          next: "다음",
          pageStatus: (current: string, total: string) =>
            `${current} / ${total} 페이지`,
          previous: "이전",
        },
        priceType: {
          paid: "유료",
          public: "공개",
        },
        reportCount: (count: string) => `작성 리포트 ${count}개`,
        reportTitle: "리포트",
        revenueShare: "기여 매출",
        reporterId: "리포터 ID",
        reporterLogo: "리포터 로고",
        reporterProfile: "로그인 리포터",
        reporterStatus: "활동 상태",
        rewardPoints: (points: string) => `${points}P`,
        source: "원본 브이로그",
        sourceRevealVotes: "보고싶어요 유입",
        statusCompleted: "활동 중",
        statusPending: "계정 준비 중",
        studio: "스튜디오",
        unlockContributions: "언락 기여",
        updatedAt: "최근 수정",
        title: "내 AI 팬 리포트 관리",
        updateCover: "커버/티저 변경",
      }
    : {
        badge: "Fan reporter desk",
        body:
          "A member service for AIAVpark reporters to manage AI fan reports, source vlogs, and lead images across desktop and mobile.",
        connectBody:
          "This is an AIAVpark reporter member service. Connect your account to review AI fan reports you created and the selected lead image for each report.",
        connectCta: "Connect account",
        connectTitle: "Connect your fan reporter account.",
        coverSource: {
          auto: "Auto cover",
          reporter_cropped: "Wide crop",
          reporter_selected: "Manually selected",
        },
        coverDesk: "Cover desk",
        coverDeskValue: "Editable",
        coverImage: "Cover",
        deskBody:
          "Create AI reports from public vlog detail pages, then manage the report list and cover edits here.",
        deskLabel: "Reporter member service",
        deskTitle: "AIAVpark reporter operations",
        editReport: "Edit report",
        emptyBody:
          "You have not created any AI fan reports yet. Reports created from public vlog detail pages will appear in this reporter desk.",
        emptyCta: "Browse vlogs",
        emptyTitle: "No reports yet.",
        feed: "Vlog feed",
        incentive: "Performance",
        incentiveReward: "Reporter rewards",
        memberOnly: "Members only",
        newsroom: "Newsroom",
        openReport: "Open report",
        paidPurchases: "Paid purchases",
        pagination: {
          label: "Report pages",
          next: "Next",
          pageStatus: (current: string, total: string) =>
            `Page ${current} of ${total}`,
          previous: "Previous",
        },
        priceType: {
          paid: "Paid",
          public: "Public",
        },
        reportCount: (count: string) => `${count} reports`,
        reportTitle: "Report",
        revenueShare: "Attributed revenue",
        reporterId: "Reporter ID",
        reporterLogo: "Reporter logo",
        reporterProfile: "Signed-in reporter",
        reporterStatus: "Status",
        rewardPoints: (points: string) => `${points}P`,
        source: "Source vlog",
        sourceRevealVotes: "Want-to-watch leads",
        statusCompleted: "Active",
        statusPending: "Account pending",
        studio: "Studio",
        unlockContributions: "Unlock contributions",
        updatedAt: "Updated",
        title: "My AI fan report desk",
        updateCover: "Cover/teasers",
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

function getReportPageHref({
  locale,
  page,
  referralCode,
}: {
  locale: Locale;
  page: number;
  referralCode: string | null;
}) {
  const baseHref = buildPathWithReferral(
    `/${locale}/fanletter/reports`,
    referralCode,
  );

  return setPathSearchParams(baseHref, {
    page: page > 1 ? String(page) : null,
  });
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
      if (page - previousPage === 2) {
        items.push(previousPage + 1);
      } else {
        items.push("ellipsis");
      }
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
    title: `${copy.title} | AIAVpark`,
    description: copy.connectBody,
  };
}

export default async function LocalizedFanletterReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterReportsSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const currentPage = readPageNumber(query.page);
  const reportOffset = (currentPage - 1) * REPORTS_PAGE_SIZE;
  const session = await readMemberServerSession();
  const reportsHref = buildPathWithReferral(
    `/${locale}/fanletter/reports`,
    referralCode,
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode),
    { returnTo: reportsHref },
  );
  const data = session
    ? await getFanletterNewsReportsForMember({
        email: session.email,
        limit: REPORTS_PAGE_SIZE,
        locale,
        offset: reportOffset,
      })
    : {
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
  const feedHref = buildPathWithReferral(
    `/${locale}/fanletter/feed`,
    effectiveReferralCode,
  );
  const newsHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    effectiveReferralCode,
  );
  const studioHref = buildPathWithReferral(
    `/${locale}/fanletter/studio`,
    effectiveReferralCode,
  );
  const topNavItems = [
    {
      href: feedHref,
      icon: Clapperboard,
      label: copy.feed,
    },
    {
      href: newsHref,
      icon: Newspaper,
      label: copy.newsroom,
    },
    {
      href: studioHref,
      icon: LayoutDashboard,
      label: copy.studio,
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
      "F"
    : "F";
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
    Math.ceil(data.reportCount / REPORTS_PAGE_SIZE),
  );
  const paginationItems = getReportPaginationItems({
    currentPage,
    totalPages,
  });
  const currentReportsHref = getReportPageHref({
    locale,
    page: currentPage,
    referralCode: effectiveReferralCode,
  });
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
    const sourceHref = buildPathWithReferral(
      `/${locale}/fanletter/content/${report.contentId}`,
      effectiveReferralCode,
    );

    return {
      contentId: report.contentId,
      contentMaturityRating: report.contentMaturityRating,
      creatorName: report.creatorName,
      coverImageSource: report.coverImageSource ?? "auto",
      coverImageUrl: report.coverImageUrl,
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
      teaserImageUrls: report.teaserImageUrls ?? [],
      title: report.title,
      updatedAt: report.updatedAt.toISOString(),
    };
  });

  if (data.member && data.reportCount > 0 && currentPage > totalPages) {
    redirect(
      getReportPageHref({
        locale,
        page: totalPages,
        referralCode: effectiveReferralCode,
      }),
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f6f1] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 text-[#111510] sm:px-6 sm:pb-12 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            className="inline-flex items-center gap-2 text-sm font-black !text-[#16702e]"
            href={buildPathWithReferral(
              `/${locale}/fanletter`,
              effectiveReferralCode,
            )}
          >
            <Newspaper className="size-4" />
            AIAVpark
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

        <div className="mt-4 grid gap-4 border-b border-black/12 pb-5 lg:grid-cols-[minmax(0,1fr)_minmax(21rem,26rem)] lg:items-end">
          <div>
            <div>
              <p className="inline-flex items-center gap-1.5 border border-[#16702e]/20 bg-white px-2.5 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                <BadgeCheck className="size-3.5" />
                {copy.badge}
              </p>
              <h1 className="mt-3 max-w-3xl text-[2rem] font-black leading-[1.05] tracking-normal [word-break:keep-all] sm:text-[3rem]">
                {copy.title}
              </h1>
            </div>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-black/58 sm:text-base sm:leading-7">
              {copy.body}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:hidden">
              {topNavItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    className="inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-full border border-black/10 bg-white px-2 text-xs font-black !text-[#111510]"
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
          <div className="rounded-lg border border-black/10 bg-white p-4 shadow-[0_14px_36px_rgba(17,21,16,0.06)]">
            <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
              <Newspaper className="size-3.5" />
              {copy.deskLabel}
            </p>
            <h2 className="mt-2 text-xl font-black leading-tight tracking-normal [word-break:keep-all]">
              {copy.deskTitle}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-black/56">
              {copy.deskBody}
            </p>
            {data.member ? (
              <>
                <div className="mt-4 flex min-w-0 items-center gap-3 border-y border-black/10 py-3">
                  <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#111510] text-lg font-black text-[#44f26e] ring-1 ring-black/10">
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
                <p className="mt-4 text-lg font-black">
                  {copy.reportCount(formatNumber(data.reportCount, locale))}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                  {reporterStats.map((stat) => (
                    <div
                      className="rounded-lg border border-black/8 bg-[#f6f8f4] px-3 py-2"
                      key={stat.label}
                    >
                      <p className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-black/38">
                        {stat.label}
                      </p>
                      <p className="mt-1 truncate text-sm font-black">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-4 inline-flex rounded-full bg-[#111510] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#44f26e]">
                {copy.memberOnly}
              </p>
            )}
          </div>
        </div>

        {!session || !data.member ? (
          <section className="mt-6 border border-black/12 bg-white p-5 shadow-[0_18px_46px_rgba(17,21,16,0.08)] sm:p-6">
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
        ) : data.reportCount === 0 ? (
          <section className="mt-6 border border-dashed border-black/16 bg-white p-6 text-center shadow-[0_18px_46px_rgba(17,21,16,0.06)]">
            <ImageIcon className="mx-auto size-9 text-[#16702e]" />
            <h2 className="mt-4 text-2xl font-black tracking-normal">
              {copy.emptyTitle}
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-black/58">
              {copy.emptyBody}
            </p>
            <Link
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black !text-white transition hover:bg-black"
              href={feedHref}
            >
              {copy.emptyCta}
              <ArrowRight className="size-4 text-[#44f26e]" />
            </Link>
          </section>
        ) : (
          <>
            <FanletterReportsCoverManager
              copy={{
                coverImage: copy.coverImage,
                editReport: copy.editReport,
                incentive: copy.incentive,
                openReport: copy.openReport,
                paidPurchases: copy.paidPurchases,
                reportTitle: copy.reportTitle,
                revenueShare: copy.revenueShare,
                rewardPoints: copy.incentiveReward,
                source: copy.source,
                sourceRevealVotes: copy.sourceRevealVotes,
                unlockContributions: copy.unlockContributions,
                updateCover: copy.updateCover,
                updatedAt: copy.updatedAt,
              }}
              locale={locale}
              reports={reportItems}
            />

            {totalPages > 1 ? (
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
                    href={getReportPageHref({
                      locale,
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
                        href={getReportPageHref({
                          locale,
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
                    href={getReportPageHref({
                      locale,
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
