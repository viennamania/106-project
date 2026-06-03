import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowRight, Newspaper, WalletCards } from "lucide-react";

import { FanletterNewsReportComposerPage } from "@/components/fanletter-news-report-composer-page";
import { FanletterNewsReportsSessionBridge } from "@/components/fanletter-news-reports-session-bridge";
import { getFanletterNewsReportDraftSourcesForMember } from "@/lib/fanletter-news-report-service";
import {
  getSafeFanletterReturnTo,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { readMemberServerSession } from "@/lib/member-server-session";
import { cn } from "@/lib/utils";

export type FanletterNewsReportNewSearchParams = {
  contentId?: string | string[];
  nsfw?: string | string[];
  q?: string | string[];
  ref?: string | string[];
  reportStatus?: string | string[];
  returnTo?: string | string[];
  sourcePage?: string | string[];
  sourceReveal?: string | string[];
  sourceSort?: string | string[];
};

type ReportStatusFilter = "all" | "reported" | "unreported";
type SourceRevealFilter =
  | "all"
  | "early"
  | "locked"
  | "near"
  | "opportunity"
  | "unlocked";
type SourceSort = "latest" | "recommended";

function readStringSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeReportSearchQuery(value?: string | string[]) {
  return readStringSearchParam(value).replace(/\s+/g, " ").trim().slice(0, 80);
}

function normalizeSelectedContentId(value?: string | string[]) {
  return readStringSearchParam(value).trim().slice(0, 120);
}

function normalizeSourcePage(value?: string | string[]) {
  const parsed = Number.parseInt(readStringSearchParam(value), 10);

  return Number.isFinite(parsed) && parsed > 1
    ? Math.min(Math.floor(parsed), 999)
    : 1;
}

function normalizeReportStatusFilter({
  defaultValue,
  value,
}: {
  defaultValue: ReportStatusFilter;
  value?: string | string[];
}): ReportStatusFilter {
  const normalized = readStringSearchParam(value).trim().toLowerCase();

  return normalized === "all" ||
    normalized === "reported" ||
    normalized === "unreported"
    ? normalized
    : defaultValue;
}

function normalizeSourceRevealFilter({
  defaultValue,
  value,
}: {
  defaultValue: SourceRevealFilter;
  value?: string | string[];
}): SourceRevealFilter {
  const normalized = readStringSearchParam(value).trim().toLowerCase();

  return normalized === "all" ||
    normalized === "early" ||
    normalized === "locked" ||
    normalized === "near" ||
    normalized === "opportunity" ||
    normalized === "unlocked"
    ? normalized
    : defaultValue;
}

function normalizeSourceSort(value?: string | string[]): SourceSort {
  return readStringSearchParam(value).trim().toLowerCase() === "latest"
    ? "latest"
    : "recommended";
}

function readIncludeNsfwSearchParam(value?: string | string[]) {
  const normalized = readStringSearchParam(value).trim().toLowerCase();

  return !["0", "false", "hide", "off"].includes(normalized);
}

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        connectBody:
          "팬 리포터 회원만 새 뉴스 리포트를 작성할 수 있습니다. 계정을 연결하면 브이로그 후보와 티저 이미지 편집실이 열립니다.",
        connectCta: "뉴스 계정 연결",
        connectTitle: "뉴스 리포터 계정 연결이 필요합니다.",
        quickBackCta: "컷 피드로 돌아가기",
        quickConnectBody:
          "미언락 원본을 4컷 기사로 편집하려면 팬 리포터 계정 연결이 필요합니다. 연결 후 바로 소재 선택과 크롭 편집으로 이어집니다.",
        reportsCta: "리포트 관리로 돌아가기",
        quickTitle: "미언락 원본 4컷 기사 작성",
        title: "새 뉴스 리포트 작성",
      }
    : {
        connectBody:
          "Only fan reporter members can create new news reports. Connect your account to open vlog candidates and the teaser image desk.",
        connectCta: "Connect news account",
        connectTitle: "Connect your news reporter account.",
        quickBackCta: "Back to cut feed",
        quickConnectBody:
          "Connect a fan reporter account to edit a locked source into a four-cut report. After connecting, you can continue directly into source selection and cropping.",
        reportsCta: "Back to report desk",
        quickTitle: "Write locked-source four-cut report",
        title: "Create new news report",
      };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? (lang as Locale) : defaultLocale;
  const copy = getCopy(locale);

  return {
    title: `${copy.title} | FanLetter News`,
  };
}

export default async function LocalizedFanletterNewsReportNewPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsReportNewSearchParams>;
}) {
  return renderFanletterNewsReportComposerRoute({
    experience: "default",
    params,
    searchParams,
  });
}

export async function renderFanletterNewsReportComposerRoute({
  experience,
  params,
  searchParams,
}: {
  experience: "default" | "quick";
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsReportNewSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const includeNsfw = readIncludeNsfwSearchParam(query.nsfw);
  const searchQuery = normalizeReportSearchQuery(query.q);
  const selectedContentId = normalizeSelectedContentId(query.contentId);
  const sourcePage = normalizeSourcePage(query.sourcePage);
  const hasSelectedContentId = Boolean(selectedContentId);
  const defaultReportStatusFilter: ReportStatusFilter = hasSelectedContentId
    ? experience === "quick"
      ? "unreported"
      : "all"
    : "unreported";
  const defaultSourceRevealFilter: SourceRevealFilter = hasSelectedContentId
    ? experience === "quick"
      ? "locked"
      : "all"
    : "opportunity";
  const sourceSort = normalizeSourceSort(query.sourceSort);
  const reportStatusFilter = normalizeReportStatusFilter({
    defaultValue: defaultReportStatusFilter,
    value: query.reportStatus,
  });
  const sourceRevealFilter = normalizeSourceRevealFilter({
    defaultValue: defaultSourceRevealFilter,
    value: query.sourceReveal,
  });
  const reportsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reports`,
    referralCode,
  );
  const fallbackReturnToHref =
    experience === "quick"
      ? buildPathWithReferral(`/${locale}/fanletter/news/cuts`, referralCode)
      : reportsHref;
  const returnToHref = getSafeFanletterReturnTo({
    fallbackPath: fallbackReturnToHref,
    locale,
    referralCode,
    returnTo: query.returnTo,
  });
  const reportNewBaseHref = buildPathWithReferral(
    experience === "quick"
      ? `/${locale}/fanletter/news/reports/quick`
      : `/${locale}/fanletter/news/reports/new`,
    referralCode,
  );
  const filteredReportNewHref = setPathSearchParams(reportNewBaseHref, {
    nsfw: includeNsfw ? null : "off",
    reportStatus:
      reportStatusFilter === defaultReportStatusFilter ? null : reportStatusFilter,
    returnTo: returnToHref,
    sourceReveal:
      sourceRevealFilter === defaultSourceRevealFilter ? null : sourceRevealFilter,
    sourceSort: sourceSort === "recommended" ? null : sourceSort,
  });
  const reportNewHref = setPathSearchParams(filteredReportNewHref, {
    contentId: selectedContentId,
    q: searchQuery,
    sourcePage: sourcePage > 1 ? String(sourcePage) : null,
  });
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    { returnTo: reportNewHref },
  );
  const onboardingHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/onboarding`, referralCode),
    { returnTo: reportNewHref },
  );
  await connection();
  const session = await readMemberServerSession();
  const data = session
    ? await getFanletterNewsReportDraftSourcesForMember({
        email: session.email,
        includeNsfw,
        limit:
          searchQuery ||
          reportStatusFilter !== defaultReportStatusFilter ||
          sourceRevealFilter !== defaultSourceRevealFilter ||
          sourceSort !== "recommended"
            ? 80
            : undefined,
        locale,
        reportStatus: reportStatusFilter,
        searchQuery,
      })
    : {
        items: [],
        member: null,
      };

  if (!session || !data.member) {
    const isQuickExperience = experience === "quick";

    return (
      <main
        className={cn(
          "min-h-screen px-4 text-[#111510] sm:px-6 lg:px-8",
          isQuickExperience
            ? "bg-[#050706] pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+0.85rem)] text-white"
            : "bg-[#f2f4ef] pb-28 pt-5 sm:py-6",
        )}
      >
        <FanletterNewsReportsSessionBridge
          hasServerSession={Boolean(session)}
          locale={locale}
          serverReporterProfile={null}
          serverSessionEmail={session?.email ?? null}
          serverSessionWalletAddress={session?.walletAddress ?? null}
        />
        <section
          className={cn(
            "mx-auto p-5 shadow-[0_18px_46px_rgba(17,21,16,0.08)] sm:p-8",
            isQuickExperience
              ? "max-w-[430px] rounded-3xl border border-[#44f26e]/24 bg-[#0a120d] shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
              : "max-w-3xl border border-black/12 bg-white",
          )}
        >
          <p
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-full",
              isQuickExperience
                ? "bg-[#44f26e] text-[#111510]"
                : "bg-[#111510] text-[#44f26e]",
            )}
          >
            <WalletCards className="size-5" />
          </p>
          <h1 className="mt-4 text-[2rem] font-black leading-tight tracking-normal [word-break:keep-all] sm:text-3xl">
            {isQuickExperience ? copy.quickTitle : copy.connectTitle}
          </h1>
          <p
            className={cn(
              "mt-2 text-sm font-semibold leading-6",
              isQuickExperience ? "text-white/62" : "text-black/58",
            )}
          >
            {isQuickExperience ? copy.quickConnectBody : copy.connectBody}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link
              className={cn(
                "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-black transition sm:h-11 sm:w-auto",
                isQuickExperience
                  ? "bg-[#44f26e] !text-[#111510] hover:bg-[#65ff87]"
                  : "bg-[#111510] !text-white hover:bg-black",
              )}
              href={connectHref}
            >
              {copy.connectCta}
              <ArrowRight
                className={cn(
                  "size-4",
                  isQuickExperience ? "text-[#111510]" : "text-[#44f26e]",
                )}
              />
            </Link>
            <Link
              className={cn(
                "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border px-5 text-sm font-black transition sm:h-11 sm:w-auto",
                isQuickExperience
                  ? "border-white/12 bg-white/8 !text-white/78 hover:border-[#44f26e]/34 hover:bg-white/12"
                  : "border-black/12 bg-[#f6f8f4] !text-[#111510] hover:border-[#19b84b] hover:bg-[#ecfff0]",
              )}
              href={returnToHref}
            >
              <Newspaper
                className={cn(
                  "size-4",
                  isQuickExperience ? "text-[#44f26e]" : "text-[#16702e]",
                )}
              />
              {isQuickExperience ? copy.quickBackCta : copy.reportsCta}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      <FanletterNewsReportsSessionBridge
        hasServerSession
        locale={locale}
        serverReporterProfile={{
          avatarImageUrl: data.member.avatarImageUrl,
          displayName: data.member.displayName,
          referralCode: data.member.referralCode,
        }}
        serverSessionEmail={session.email}
        serverSessionWalletAddress={session.walletAddress}
      />
      <FanletterNewsReportComposerPage
        includeNsfw={includeNsfw}
        connectHref={connectHref}
        currentHref={reportNewHref}
        defaultReportStatusFilter={defaultReportStatusFilter}
        defaultSourceRevealFilter={defaultSourceRevealFilter}
        experience={experience}
        initialSelectedContentId={selectedContentId}
        locale={locale}
        onboardingHref={onboardingHref}
        reportNewHref={filteredReportNewHref}
        reportStatusFilter={reportStatusFilter}
        reporter={{
          ...data.member,
          walletAddress: session.walletAddress,
        }}
        reporterReferralCode={data.member.referralCode}
        reportsHref={reportsHref}
        returnToHref={returnToHref}
        searchQuery={searchQuery}
        sourcePage={sourcePage}
        sourceRevealFilter={sourceRevealFilter}
        sourceSort={sourceSort}
        sources={data.items}
      />
    </>
  );
}
