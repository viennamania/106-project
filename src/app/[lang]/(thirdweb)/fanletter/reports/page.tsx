import type { Metadata } from "next";
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
          "FanLetter에서 팬 리포터로 활동하는 회원이 작성한 AI 팬 리포트, 원본 브이로그, 대표 커버를 PC와 모바일에서 관리하는 공간입니다.",
        connectBody:
          "FanLetter 리포터 회원 서비스입니다. 계정을 연결하면 내가 만든 AI 팬 리포트와 대표 이미지 선택 상태를 확인할 수 있습니다.",
        connectCta: "계정 연결하기",
        connectTitle: "팬 리포터 계정 연결이 필요합니다.",
        coverSource: {
          auto: "자동 커버",
          reporter_cropped: "와이드 크롭",
          reporter_selected: "직접 선택",
        },
        coverDesk: "커버 관리",
        coverDeskValue: "변경 가능",
        deskBody:
          "공개 브이로그 상세에서 AI 리포트를 만들고, 이 페이지에서 작성 리포트와 커버 편집을 이어갑니다.",
        deskLabel: "리포터 회원 서비스",
        deskTitle: "FanLetter 리포터 활동 관리",
        emptyBody:
          "아직 작성한 AI 팬 리포트가 없습니다. 공개 브이로그 상세에서 AI 리포트를 만들면 리포터 데스크에 모입니다.",
        emptyCta: "브이로그 보러가기",
        emptyTitle: "작성한 리포트가 없습니다.",
        feed: "브이로그 피드",
        memberOnly: "회원 전용",
        newsroom: "뉴스룸",
        openReport: "리포트 보기",
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
        reporterId: "리포터 ID",
        reporterStatus: "활동 상태",
        source: "원본 브이로그",
        statusCompleted: "활동 중",
        statusPending: "계정 준비 중",
        studio: "스튜디오",
        title: "내 AI 팬 리포트 관리",
        updateCover: "커버 변경",
      }
    : {
        badge: "Fan reporter desk",
        body:
          "A member service for FanLetter reporters to manage AI fan reports, source vlogs, and lead images across desktop and mobile.",
        connectBody:
          "This is a FanLetter reporter member service. Connect your account to review AI fan reports you created and the selected lead image for each report.",
        connectCta: "Connect account",
        connectTitle: "Connect your fan reporter account.",
        coverSource: {
          auto: "Auto cover",
          reporter_cropped: "Wide crop",
          reporter_selected: "Manually selected",
        },
        coverDesk: "Cover desk",
        coverDeskValue: "Editable",
        deskBody:
          "Create AI reports from public vlog detail pages, then manage the report list and cover edits here.",
        deskLabel: "Reporter member service",
        deskTitle: "FanLetter reporter operations",
        emptyBody:
          "You have not created any AI fan reports yet. Reports created from public vlog detail pages will appear in this reporter desk.",
        emptyCta: "Browse vlogs",
        emptyTitle: "No reports yet.",
        feed: "Vlog feed",
        memberOnly: "Members only",
        newsroom: "Newsroom",
        openReport: "Open report",
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
        reporterId: "Reporter ID",
        reporterStatus: "Status",
        source: "Source vlog",
        statusCompleted: "Active",
        statusPending: "Account pending",
        studio: "Studio",
        title: "My AI fan report desk",
        updateCover: "Change cover",
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const copy = getCopy(locale);

  return {
    title: `${copy.title} | FanLetter`,
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
      ]
    : [];
  const totalPages = Math.max(
    1,
    Math.ceil(data.reportCount / REPORTS_PAGE_SIZE),
  );
  const pageNumbers = Array.from(
    new Set(
      [
        1,
        currentPage - 1,
        currentPage,
        currentPage + 1,
        totalPages,
      ].filter((page) => page >= 1 && page <= totalPages),
    ),
  );
  const reportItems: FanletterReportsPageReport[] = data.reports.map((report) => {
    const reportHref = buildPathWithReferral(
      `/${locale}/fanletter/news/${report.reportId}`,
      effectiveReferralCode,
    );
    const sourceHref = buildPathWithReferral(
      `/${locale}/fanletter/content/${report.contentId}`,
      effectiveReferralCode,
    );

    return {
      contentId: report.contentId,
      coverImageSource: report.coverImageSource ?? "auto",
      coverImageUrl: report.coverImageUrl,
      dek: report.dek,
      priceType: report.priceType,
      reportHref,
      reportId: report.reportId,
      sourceHref,
      sourcePublishedAt: report.sourcePublishedAt?.toISOString() ?? null,
      title: report.title,
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
            FanLetter
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
              <h1 className="mt-3 max-w-3xl text-[2.25rem] font-black leading-none tracking-normal [word-break:keep-all] sm:text-[3.55rem]">
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
                  {pageNumbers.map((page) => (
                    <Link
                      aria-current={page === currentPage ? "page" : undefined}
                      className={`inline-flex size-10 items-center justify-center rounded-full border text-sm font-black transition ${
                        page === currentPage
                          ? "border-[#111510] bg-[#111510] !text-white"
                          : "border-black/12 bg-white !text-[#111510] hover:border-[#19b84b] hover:bg-[#ecfff0]"
                      }`}
                      href={getReportPageHref({
                        locale,
                        page,
                        referralCode: effectiveReferralCode,
                      })}
                      key={page}
                    >
                      {formatNumber(page, locale)}
                    </Link>
                  ))}
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
