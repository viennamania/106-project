import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  FileText,
  Flame,
  Newspaper,
  PenLine,
  Radio,
  Sparkles,
  UserRound,
} from "lucide-react";

import { FanletterNsfwOptInControl } from "@/components/fanletter-nsfw-opt-in-control";
import type { FanletterNewsReportDocument } from "@/lib/content";
import { getLatestFanletterNewsReports } from "@/lib/fanletter-news-report-service";
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
};

type ReporterStat = {
  count: number;
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
        allNews: "전체 뉴스",
        characterWire: "AI 캐릭터 와이어",
        dek:
          "팬 기자가 생성한 AI 캐릭터 브이로그 리포트를 한곳에서 읽는 FanLetter 뉴스 홈입니다.",
        emptyBody:
          "콘텐츠 상세 페이지에서 AI 리포트를 생성하면 이곳에 최신 뉴스가 모입니다.",
        emptyTitle: "아직 공개된 FanLetter 뉴스가 없습니다.",
        heroEyebrow: "FanLetter Entertainment News",
        latest: "최신 리포트",
        lead: "오늘의 리드",
        navItems: ["톱뉴스", "팬 기자", "AI 캐릭터", "브이로그"],
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
        reporterDesk: "팬 기자 데스크",
        reporterRank: "활동 기자",
        siteName: "FanLetter News",
        topStories: "톱스토리",
      }
    : {
        access: {
          nsfw: "Adult fan-only",
          paid: "Fan-only",
          public: "Public",
        },
        allNews: "All News",
        characterWire: "AI Character Wire",
        dek:
          "A FanLetter news home for AI character vlog reports created by fan reporters.",
        emptyBody:
          "Create an AI report from a content detail page and the latest stories will appear here.",
        emptyTitle: "No FanLetter news has been published yet.",
        heroEyebrow: "FanLetter Entertainment News",
        latest: "Latest Reports",
        lead: "Lead Story",
        navItems: ["Top stories", "Fan reporters", "AI characters", "Vlogs"],
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
        reporterDesk: "Fan Reporter Desk",
        reporterRank: "Active reporters",
        siteName: "FanLetter News",
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

function getReportHref(
  report: FanletterNewsReportDocument,
  referralCode: string | null,
) {
  return buildPathWithReferral(
    `/${report.locale}/fanletter/news/${report.reportId}`,
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

    map.set(report.reporterReferralCode, {
      count: (existing?.count ?? 0) + 1,
      name: report.reporterName,
      referralCode: report.reporterReferralCode,
    });
  }

  return Array.from(map.values())
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);
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
    <header className="border-b border-black/12 bg-white text-[#111510]">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            className="inline-flex items-center gap-2 text-2xl font-black !text-[#111510] sm:text-4xl"
            href={newsHomeHref}
          >
            <span className="flex size-9 items-center justify-center rounded-md bg-[#44f26e] text-black sm:size-10">
              <Newspaper className="size-5" />
            </span>
            {copy.siteName}
          </Link>
          <div className="hidden text-right text-xs font-bold text-black/48 sm:block">
            <p>{today}</p>
            <p className="mt-1 text-[#16702e]">{copy.allNews}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto border-t border-black/10 pt-3">
          {copy.navItems.map((item) => (
            <span
              className="shrink-0 rounded-full border border-black/10 px-3 py-1 text-xs font-bold text-black/62"
              key={item}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </header>
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

  return (
    <Link
      className="group block overflow-hidden rounded-lg bg-[#111510] text-white shadow-[0_24px_80px_rgba(0,0,0,0.16)]"
      href={getReportHref(report, referralCode)}
    >
      <NewsImage
        blurred={shouldBlur}
        className="aspect-[16/11]"
        nsfwLabel={nsfwCopy.badge}
        priority
        report={report}
        sizes="(max-width: 1024px) 100vw, 58rem"
      />
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e] px-3 py-1 text-xs font-black text-black">
            <Flame className="size-3.5" />
            {copy.lead}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-xs font-bold text-white/70">
            <BadgeCheck className="size-3.5 text-[#44f26e]" />
            {getAccessLabel(report, copy)}
          </span>
        </div>
        <h1
          className={`mt-4 break-words text-[2.35rem] font-black leading-[1.02] [word-break:keep-all] sm:text-[4.1rem] ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {report.title}
        </h1>
        <p
          className={`mt-4 max-w-3xl text-base font-semibold leading-7 text-white/68 sm:text-lg sm:leading-8 ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {report.dek}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-bold text-white/50">
          <span className="inline-flex items-center gap-1.5">
            <PenLine className="size-3.5 text-[#44f26e]" />
            {report.reporterName}
          </span>
          {publishedAt ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5 text-[#44f26e]" />
              {publishedAt}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5 text-[#b9ffc8]">
            {copy.read}
          </span>
        </div>
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

  return (
    <Link
      className="group grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] gap-3 border-b border-black/10 pb-4"
      href={getReportHref(report, referralCode)}
    >
      <NewsImage
        blurred={shouldBlur}
        className="aspect-[4/5] rounded-lg"
        nsfwLabel={nsfwCopy.badge}
        report={report}
        sizes="6rem"
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
          {report.title}
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
          <span>{report.reporterName}</span>
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

  return (
    <Link
      className="group block overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_16px_46px_rgba(0,0,0,0.07)]"
      href={getReportHref(report, referralCode)}
    >
      <NewsImage
        blurred={shouldBlur}
        className="aspect-[16/10]"
        nsfwLabel={nsfwCopy.badge}
        report={report}
        sizes="(max-width: 768px) 100vw, 22rem"
      />
      <div className="p-4">
        <div className="flex flex-wrap gap-2 text-[0.68rem] font-black text-[#16702e]">
          <span>{report.creatorName}</span>
          <span>{getAccessLabel(report, copy)}</span>
        </div>
        <h2
          className={`mt-2 line-clamp-2 break-words text-xl font-black leading-6 [word-break:keep-all] group-hover:text-[#16702e] ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {report.title}
        </h2>
        <p
          className={`mt-2 line-clamp-3 text-sm font-medium leading-6 text-black/58 ${
            shouldBlur ? "select-none blur-[2px]" : ""
          }`}
        >
          {report.dek}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-black/42">
          {publishedAt ? <span>{publishedAt}</span> : null}
          <span>{report.reporterName}</span>
        </div>
      </div>
    </Link>
  );
}

function ReporterRank({
  copy,
  locale,
  reporters,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  reporters: ReporterStat[];
}) {
  if (reporters.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-black/10 bg-white p-4">
      <div className="flex items-center gap-2">
        <Radio className="size-4 text-[#16702e]" />
        <h2 className="text-lg font-black">{copy.reporterRank}</h2>
      </div>
      <div className="mt-4 space-y-3">
        {reporters.map((reporter, index) => (
          <div
            className="flex items-center justify-between gap-3"
            key={reporter.referralCode}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#111510] text-xs font-black text-[#44f26e]">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black">{reporter.name}</p>
                <p className="text-xs font-bold text-black/42">
                  {reporter.referralCode}
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-[#44f26e] px-2.5 py-1 text-xs font-black text-black">
              {formatNumber(reporter.count, locale)}
            </span>
          </div>
        ))}
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
  const cookieStore = await cookies();
  const nsfwOptInEnabled = isFanletterNsfwOptedIn(
    cookieStore.get(FANLETTER_NSFW_OPT_IN_COOKIE)?.value,
  );
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const reports = await getLatestFanletterNewsReports({ limit: 28, locale });
  const nsfwReportCount = reports.filter(isNsfwReport).length;
  const [leadReport, ...restReports] = reports;
  const topStories = restReports.slice(0, 5);
  const featureReports = restReports.slice(5, 11);
  const latestReports = restReports.slice(11);
  const reporterStats = getReporterStats(reports);
  const shouldShowNsfwControl = nsfwReportCount > 0 || nsfwOptInEnabled;

  return (
    <main className="min-h-screen bg-[#f5f6f2] text-[#111510]">
      <NewsMasthead copy={copy} locale={locale} newsHomeHref={newsHomeHref} />

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div className="border-y border-black/12 py-4">
          <p className="text-sm font-black text-[#16702e]">{copy.heroEyebrow}</p>
          <h1 className="mt-2 max-w-5xl text-[2.8rem] font-black leading-[0.98] [word-break:keep-all] sm:text-[5.2rem]">
            {copy.allNews}
          </h1>
          <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-black/62 sm:text-xl sm:leading-8">
            {copy.dek}
          </p>
        </div>

        {shouldShowNsfwControl ? (
          <div className="mt-5">
            <FanletterNsfwOptInControl
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
          </div>
        ) : null}

        {leadReport ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <LeadStory
              copy={copy}
              nsfwOptInEnabled={nsfwOptInEnabled}
              referralCode={referralCode}
              report={leadReport}
            />

            <aside className="space-y-5">
              <section className="rounded-lg border border-black/10 bg-white p-4">
                <div className="flex items-center justify-between gap-3 border-b border-black/10 pb-3">
                  <h2 className="text-xl font-black">{copy.topStories}</h2>
                  <Flame className="size-5 text-[#e5484d]" />
                </div>
                <div className="mt-4 space-y-4">
                  {topStories.map((report) => (
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

              <ReporterRank
                copy={copy}
                locale={locale}
                reporters={reporterStats}
              />
            </aside>

            {featureReports.length > 0 ? (
              <section className="lg:col-span-2">
                <div className="mb-4 flex items-center gap-2 border-b-4 border-[#111510] pb-3">
                  <Sparkles className="size-5 text-[#16702e]" />
                  <h2 className="text-2xl font-black">{copy.characterWire}</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <section className="lg:col-span-2">
                <div className="mb-4 flex items-center gap-2 border-b border-black/12 pb-3">
                  <FileText className="size-5 text-[#16702e]" />
                  <h2 className="text-2xl font-black">{copy.latest}</h2>
                </div>
                <div className="grid gap-4 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
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
