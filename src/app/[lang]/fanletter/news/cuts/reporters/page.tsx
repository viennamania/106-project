import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Newspaper,
  PenLine,
  Trophy,
} from "lucide-react";

import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  getFanletterNewsReporterDirectory,
  type FanletterNewsReporterDirectoryItem,
} from "@/lib/fanletter-news-report-service";
import { getFanletterNewsArticleDisplayTitle } from "@/lib/fanletter-news-related";
import {
  normalizeFanletterReturnToPath,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";

type FanletterNewsCutReportersSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

const CUT_REPORTER_DIRECTORY_LIMIT = 48;

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        backToCuts: "4컷 피드로 돌아가기",
        browse: "팬 기자 둘러보기",
        characters: "캐릭터",
        emptyBody: "4컷 피드에서 이어볼 팬 기자 채널이 아직 없습니다.",
        emptyTitle: "팬 기자 채널을 준비 중입니다.",
        firstReports: "최초 리포트",
        heroBody:
          "방금 보던 4컷 흐름에서 이어볼 팬 기자를 빠르게 고르세요.",
        heroEyebrow: "AIAVpark News",
        heroTitle: "팬 기자",
        latestReport: "최신 리포트",
        metaDescription:
          "4컷 피드에서 바로 이어지는 AIAVpark News 팬 기자 선택 화면입니다.",
        metaTitle: "4컷 피드 팬 기자",
        news: "뉴스",
        openChannel: "팬 기자 채널",
        reporterId: "리포터 ID",
        signal: {
          first: "선점 리포트",
          prolific: "활동 활발",
          rising: "상승 기자",
        },
      }
    : {
        backToCuts: "Back to 4-cut feed",
        browse: "Browse fan reporters",
        characters: "Characters",
        emptyBody: "No fan reporter channels are ready from the 4-cut feed yet.",
        emptyTitle: "Fan reporter channels are getting ready.",
        firstReports: "First reports",
        heroBody:
          "Pick a fan reporter to continue from the 4-cut feed flow.",
        heroEyebrow: "AIAVpark News",
        heroTitle: "Fan Reporters",
        latestReport: "Latest report",
        metaDescription:
          "A focused AIAVpark News fan reporter picker connected to the 4-cut feed.",
        metaTitle: "4-cut feed fan reporters",
        news: "News",
        openChannel: "Reporter channel",
        reporterId: "Reporter ID",
        signal: {
          first: "First reports",
          prolific: "Active reporter",
          rising: "Rising reporter",
        },
      };
}

function formatDate(value: Date | null, locale: Locale) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(value);
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function getReporterSignal(
  reporter: FanletterNewsReporterDirectoryItem,
  copy: ReturnType<typeof getCopy>,
) {
  if (reporter.firstReportCount > 0) {
    return copy.signal.first;
  }

  if (reporter.reportCount >= 6 || reporter.characterCount >= 3) {
    return copy.signal.prolific;
  }

  return copy.signal.rising;
}

function getCurrentHref({
  locale,
  referralCode,
  returnHref,
}: {
  locale: Locale;
  referralCode: string | null;
  returnHref: string;
}) {
  return setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/cuts/reporters`, referralCode),
    {
      returnTo: returnHref,
    },
  );
}

function getReporterChannelHref({
  currentHref,
  locale,
  referralCode,
  reporter,
}: {
  currentHref: string;
  locale: Locale;
  referralCode: string | null;
  reporter: FanletterNewsReporterDirectoryItem;
}) {
  return setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/cuts/reporters/${encodeURIComponent(
        reporter.referralCode,
      )}`,
      referralCode,
    ),
    {
      returnTo: currentHref,
    },
  );
}

function getLatestReportHref({
  currentHref,
  locale,
  referralCode,
  reporter,
}: {
  currentHref: string;
  locale: Locale;
  referralCode: string | null;
  reporter: FanletterNewsReporterDirectoryItem;
}) {
  if (!reporter.latestReport) {
    return null;
  }

  return setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/cuts/${reporter.latestReport.reportId}`,
      referralCode,
    ),
    {
      returnTo: currentHref,
    },
  );
}

function ReporterAvatar({
  reporter,
  sizes,
}: {
  reporter: FanletterNewsReporterDirectoryItem;
  sizes: string;
}) {
  const initial =
    reporter.name.trim().charAt(0).toUpperCase() ||
    reporter.referralCode.trim().charAt(0).toUpperCase() ||
    "F";

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-[#111510] text-[#44f26e]">
      {reporter.avatarImageUrl ? (
        <Image
          alt=""
          aria-hidden="true"
          className="object-cover"
          fill
          sizes={sizes}
          src={reporter.avatarImageUrl}
          unoptimized={shouldBypassFanletterImageOptimization(
            reporter.avatarImageUrl,
          )}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="text-2xl font-black">{initial}</span>
        </div>
      )}
    </div>
  );
}

function ReporterMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2">
      <p className="truncate text-[0.58rem] font-black uppercase tracking-[0.1em] text-white/36">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function ReporterCard({
  copy,
  currentHref,
  index,
  locale,
  referralCode,
  reporter,
}: {
  copy: ReturnType<typeof getCopy>;
  currentHref: string;
  index: number;
  locale: Locale;
  referralCode: string | null;
  reporter: FanletterNewsReporterDirectoryItem;
}) {
  const channelHref = getReporterChannelHref({
    currentHref,
    locale,
    referralCode,
    reporter,
  });
  const latestReportHref =
    getLatestReportHref({ currentHref, locale, referralCode, reporter }) ??
    channelHref;
  const isLead = index === 0;
  const latestReportTitle = reporter.latestReport
    ? getFanletterNewsArticleDisplayTitle(reporter.latestReport.title)
    : null;

  return (
    <article
      className={
        isLead
          ? "overflow-hidden rounded-[1.35rem] border border-[#44f26e]/34 bg-[#06140a] shadow-[0_22px_70px_rgba(0,0,0,0.34)]"
          : "overflow-hidden rounded-[1.1rem] border border-white/10 bg-white/[0.055]"
      }
    >
      <Link
        className={`grid min-w-0 gap-3 !text-white ${
          isLead
            ? "grid-cols-[7.25rem_minmax(0,1fr)] p-3"
            : "grid-cols-[5.25rem_minmax(0,1fr)] p-2.5"
        }`}
        href={channelHref}
      >
        <div className="relative">
          <ReporterAvatar reporter={reporter} sizes={isLead ? "7.25rem" : "5.25rem"} />
          <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-1 text-[0.6rem] font-black text-[#111510]">
            {formatNumber(index + 1, locale)}
          </span>
        </div>
        <div className="min-w-0 self-center">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e]/12 px-2 py-1 text-[0.62rem] font-black text-[#9bffad]">
            <PenLine className="size-3" />
            {getReporterSignal(reporter, copy)}
          </p>
          <h2
            className={`mt-2 truncate font-black tracking-normal ${
              isLead ? "text-3xl" : "text-xl"
            }`}
          >
            {reporter.name}
          </h2>
          <p className="mt-1 truncate text-[0.68rem] font-black uppercase tracking-[0.1em] text-white/42">
            @{reporter.referralCode}
          </p>
          <p className="mt-3 text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#44f26e]">
            {copy.latestReport}
          </p>
          <p className="mt-1 truncate text-sm font-black text-white/78">
            {formatDate(reporter.latestReportAt, locale)}
          </p>
        </div>
      </Link>

      <div className="grid grid-cols-3 gap-2 px-3 pb-3">
        <ReporterMetric
          label={copy.news}
          value={formatNumber(reporter.reportCount, locale)}
        />
        <ReporterMetric
          label={copy.characters}
          value={formatNumber(reporter.characterCount, locale)}
        />
        <ReporterMetric
          label={copy.firstReports}
          value={formatNumber(reporter.firstReportCount, locale)}
        />
      </div>

      <div className="border-t border-white/10 px-3 py-3">
        {reporter.latestReport ? (
          <Link
            className="grid grid-cols-[5.75rem_minmax(0,1fr)_auto] items-stretch gap-3 rounded-2xl border border-white/10 bg-black/24 p-2 !text-white transition hover:border-[#44f26e]/38 hover:bg-[#12301a]/42"
            href={latestReportHref}
          >
            <div className="relative aspect-[9/14] overflow-hidden rounded-xl bg-white/8">
              {reporter.latestReport.coverImageUrl ? (
                <Image
                  alt=""
                  aria-hidden="true"
                  className="object-cover"
                  fill
                  sizes="5.75rem"
                  src={reporter.latestReport.coverImageUrl}
                  unoptimized={shouldBypassFanletterImageOptimization(
                    reporter.latestReport.coverImageUrl,
                  )}
                />
              ) : (
                <FileText className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-[#44f26e]" />
              )}
            </div>
            <div className="min-w-0 self-center py-2">
              <p className="text-[0.6rem] font-black uppercase tracking-[0.12em] text-[#44f26e]">
                {copy.latestReport}
              </p>
              <p className="mt-1 line-clamp-3 text-base font-black leading-tight [word-break:keep-all]">
                {latestReportTitle}
              </p>
            </div>
            <ChevronRight className="self-center size-4 text-white/44" />
          </Link>
        ) : null}

        <Link
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-[#44f26e] px-3 text-xs font-black !text-black"
          href={channelHref}
        >
          <PenLine className="size-4" />
          {copy.openChannel}
        </Link>
      </div>
    </article>
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
    title: `${copy.metaTitle} | AIAVpark News`,
    description: copy.metaDescription,
  };
}

export default async function FanletterNewsCutReportersPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsCutReportersSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const cutsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/cuts`,
    referralCode,
  );
  const returnHref =
    normalizeFanletterReturnToPath(query.returnTo, locale) ?? cutsHref;
  const currentHref = getCurrentHref({ locale, referralCode, returnHref });
  const reporters = await getFanletterNewsReporterDirectory({
    limit: CUT_REPORTER_DIRECTORY_LIMIT,
    locale,
  });
  const totalReports = reporters.reduce(
    (total, reporter) => total + reporter.reportCount,
    0,
  );
  const totalCharacters = reporters.reduce(
    (total, reporter) => total + reporter.characterCount,
    0,
  );

  return (
    <main className="min-h-screen bg-[#050706] text-white">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-black shadow-[0_0_56px_rgba(0,0,0,0.42)] sm:border-x sm:border-white/10">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/78 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 text-xs font-black !text-white"
              href={returnHref}
            >
              <ArrowLeft className="size-4" />
              {copy.backToCuts}
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e] px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-black">
              <Trophy className="size-3.5" />
              {copy.browse}
            </span>
          </div>
        </header>

        <section className="px-4 pb-[calc(6.8rem+env(safe-area-inset-bottom))] pt-5">
          <div className="rounded-[1.5rem] border border-[#44f26e]/20 bg-[#07110a] p-4">
            <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
              {copy.heroEyebrow}
            </p>
            <h1 className="mt-3 text-4xl font-black leading-none tracking-normal">
              {copy.heroTitle}
            </h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-white/62 [word-break:keep-all]">
              {copy.heroBody}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <ReporterMetric
                label={copy.browse}
                value={formatNumber(reporters.length, locale)}
              />
              <ReporterMetric
                label={copy.news}
                value={formatNumber(totalReports, locale)}
              />
              <ReporterMetric
                label={copy.characters}
                value={formatNumber(totalCharacters, locale)}
              />
            </div>
          </div>

          {reporters.length > 0 ? (
            <div className="mt-4 space-y-3">
              {reporters.map((reporter, index) => (
                <ReporterCard
                  copy={copy}
                  currentHref={currentHref}
                  index={index}
                  key={reporter.referralCode}
                  locale={locale}
                  referralCode={referralCode}
                  reporter={reporter}
                />
              ))}
            </div>
          ) : (
            <section className="mt-4 rounded-[1.25rem] border border-white/12 bg-white/[0.06] p-6 text-center">
              <Newspaper className="mx-auto size-10 text-[#44f26e]" />
              <h2 className="mt-3 text-xl font-black">{copy.emptyTitle}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/58">
                {copy.emptyBody}
              </p>
            </section>
          )}
        </section>

        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px] border-t border-white/10 bg-black/76 px-4 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-3 backdrop-blur-xl">
          <Link
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black !text-black"
            href={returnHref}
          >
            <ArrowLeft className="size-4" />
            {copy.backToCuts}
          </Link>
        </div>
      </div>
    </main>
  );
}
