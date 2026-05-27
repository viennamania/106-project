import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Newspaper, WalletCards } from "lucide-react";

import { FanletterNewsReportComposerPage } from "@/components/fanletter-news-report-composer-page";
import { getFanletterNewsReportDraftSourcesForMember } from "@/lib/fanletter-news-report-service";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { readMemberServerSession } from "@/lib/member-server-session";

type FanletterNewsReportNewSearchParams = {
  contentId?: string | string[];
  nsfw?: string | string[];
  q?: string | string[];
  ref?: string | string[];
  reportStatus?: string | string[];
};

type ReportStatusFilter = "all" | "reported" | "unreported";

function readStringSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function normalizeReportSearchQuery(value?: string | string[]) {
  return readStringSearchParam(value).replace(/\s+/g, " ").trim().slice(0, 80);
}

function normalizeSelectedContentId(value?: string | string[]) {
  return readStringSearchParam(value).trim().slice(0, 120);
}

function normalizeReportStatusFilter(
  value?: string | string[],
): ReportStatusFilter {
  const normalized = readStringSearchParam(value).trim().toLowerCase();

  return normalized === "reported" || normalized === "unreported"
    ? normalized
    : "all";
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
        reportsCta: "리포트 관리로 돌아가기",
        title: "새 뉴스 리포트 작성",
      }
    : {
        connectBody:
          "Only fan reporter members can create new news reports. Connect your account to open vlog candidates and the teaser image desk.",
        connectCta: "Connect news account",
        connectTitle: "Connect your news reporter account.",
        reportsCta: "Back to report desk",
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
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const includeNsfw = readIncludeNsfwSearchParam(query.nsfw);
  const reportStatusFilter = normalizeReportStatusFilter(query.reportStatus);
  const searchQuery = normalizeReportSearchQuery(query.q);
  const selectedContentId = normalizeSelectedContentId(query.contentId);
  const reportsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reports`,
    referralCode,
  );
  const reportNewBaseHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reports/new`,
    referralCode,
  );
  const filteredReportNewHref = setPathSearchParams(reportNewBaseHref, {
    nsfw: includeNsfw ? null : "off",
    reportStatus: reportStatusFilter === "all" ? null : reportStatusFilter,
  });
  const reportNewHref = setPathSearchParams(filteredReportNewHref, {
    contentId: selectedContentId,
    q: searchQuery,
  });
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    { returnTo: reportNewHref },
  );
  const onboardingHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/onboarding`, referralCode),
    { returnTo: reportNewHref },
  );
  const session = await readMemberServerSession();
  const data = session
    ? await getFanletterNewsReportDraftSourcesForMember({
        email: session.email,
        includeNsfw,
        limit: searchQuery || reportStatusFilter !== "all" ? 80 : undefined,
        locale,
        reportStatus: reportStatusFilter,
        searchQuery,
      })
    : {
        items: [],
        member: null,
      };

  if (!session || !data.member) {
    return (
      <main className="min-h-screen bg-[#f2f4ef] px-4 py-6 text-[#111510] sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl border border-black/12 bg-white p-6 shadow-[0_18px_46px_rgba(17,21,16,0.08)] sm:p-8">
          <p className="inline-flex size-11 items-center justify-center rounded-full bg-[#111510] text-[#44f26e]">
            <WalletCards className="size-5" />
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-normal [word-break:keep-all]">
            {copy.connectTitle}
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-black/58">
            {copy.connectBody}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black !text-white transition hover:bg-black"
              href={connectHref}
            >
              {copy.connectCta}
              <ArrowRight className="size-4 text-[#44f26e]" />
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/12 bg-[#f6f8f4] px-5 text-sm font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
              href={reportsHref}
            >
              <Newspaper className="size-4 text-[#16702e]" />
              {copy.reportsCta}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <FanletterNewsReportComposerPage
      includeNsfw={includeNsfw}
      connectHref={connectHref}
      currentHref={reportNewHref}
      initialSelectedContentId={selectedContentId}
      locale={locale}
      onboardingHref={onboardingHref}
      reportNewHref={filteredReportNewHref}
      reportStatusFilter={reportStatusFilter}
      reporterReferralCode={data.member.referralCode}
      reportsHref={reportsHref}
      searchQuery={searchQuery}
      sources={data.items}
    />
  );
}
