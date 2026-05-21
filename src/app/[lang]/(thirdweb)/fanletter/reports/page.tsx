import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  ImageIcon,
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
        badge: "내 팬 리포트",
        connectBody:
          "로그인한 회원이 작성한 AI 팬 리포트와 대표 이미지 선택 상태를 확인하려면 계정을 연결하세요.",
        connectCta: "계정 연결하기",
        connectTitle: "계정 연결 후 리포트 목록을 볼 수 있습니다.",
        coverSource: {
          auto: "자동 커버",
          reporter_cropped: "와이드 크롭",
          reporter_selected: "직접 선택",
        },
        emptyBody:
          "아직 작성한 AI 팬 리포트가 없습니다. 공개 브이로그 상세에서 AI 리포트를 만들면 이곳에 모입니다.",
        emptyCta: "브이로그 보러가기",
        emptyTitle: "작성한 리포트가 없습니다.",
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
        source: "원본 브이로그",
        title: "내 AI 팬 리포트",
        updateCover: "커버 변경",
      }
    : {
        badge: "My fan reports",
        connectBody:
          "Connect your account to review AI fan reports you created and the selected lead image for each report.",
        connectCta: "Connect account",
        connectTitle: "Connect your account to view your reports.",
        coverSource: {
          auto: "Auto cover",
          reporter_cropped: "Wide crop",
          reporter_selected: "Manually selected",
        },
        emptyBody:
          "You have not created any AI fan reports yet. Reports created from public vlog detail pages will appear here.",
        emptyCta: "Browse vlogs",
        emptyTitle: "No reports yet.",
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
        source: "Source vlog",
        title: "My AI fan reports",
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
    <main className="min-h-screen bg-[#f5f6f1] px-4 pb-12 pt-5 text-[#111510] sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="border-b border-black/12 pb-5">
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
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-1.5 border border-[#16702e]/20 bg-white px-2.5 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                <BadgeCheck className="size-3.5" />
                {copy.badge}
              </p>
              <h1 className="mt-3 text-[2.35rem] font-black leading-none tracking-normal sm:text-[3.7rem]">
                {copy.title}
              </h1>
            </div>
            {data.member ? (
              <div className="border border-black/10 bg-white px-4 py-3 shadow-[0_14px_36px_rgba(17,21,16,0.06)]">
                <p className="text-xs font-bold text-black/42">
                  @{data.member.referralCode}
                </p>
                <p className="mt-1 text-lg font-black">
                  {copy.reportCount(formatNumber(data.reportCount, locale))}
                </p>
              </div>
            ) : null}
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
