import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Coins,
  FileText,
  Newspaper,
  PenLine,
  ShieldCheck,
  Sparkles,
  Trophy,
  Unlock,
  UserRound,
  UsersRound,
} from "lucide-react";

import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  getFanletterNewsReporterDirectory,
  type FanletterNewsReporterDirectoryItem,
} from "@/lib/fanletter-news-report-service";
import {
  getFanletterNewsArticleDisplayTitle as getArticleDisplayTitle,
} from "@/lib/fanletter-news-related";
import {
  getFanletterNewsReporterIncentiveStats,
  type FanletterNewsReporterIncentiveReportStats,
} from "@/lib/fanletter-news-reporter-incentives";
import {
  getFanletterNewsReporterTrustProfile,
  type FanletterNewsReporterTrustLevel,
  type FanletterNewsReporterTrustProfile,
} from "@/lib/fanletter-news-reporter-trust";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";

type FanletterNewsReportersSearchParams = {
  ref?: string | string[];
  sort?: string | string[];
};

const REPORTER_DIRECTORY_LIMIT = 96;
const REPORTER_DIRECTORY_SORTS = [
  "recommended",
  "latest",
  "news",
  "trust",
  "revenue",
  "first",
] as const;

type ReporterDirectorySort = (typeof REPORTER_DIRECTORY_SORTS)[number];

type ReporterDirectoryEntry = FanletterNewsReporterDirectoryItem & {
  incentive: FanletterNewsReporterIncentiveReportStats;
  rankScore: number;
  trust: FanletterNewsReporterTrustProfile;
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        backToNews: "뉴스 홈",
        empty: {
          body:
            "공개된 팬 기자 리포트가 쌓이면 이곳에서 팬 기자들이 경쟁적으로 노출됩니다.",
          title: "아직 공개할 팬 기자가 없습니다.",
        },
        hero: {
          body:
            "팬 기자들이 작성량, 첫 리포트 선점, 독자 반응, 언락, 구매 기여로 경쟁하는 공개 디렉토리입니다. 일반 유저는 신뢰할 만한 팬 기자를 발견하고, 팬 기자는 자신의 성과를 홍보할 수 있습니다.",
          eyebrow: "Fan Reporter League",
          kicker: "AI 캐릭터 IP 성장 파트너",
          title: "팬 기자 전체",
        },
        latestReport: "최근 뉴스",
        nav: {
          reporterDesk: "리포터 데스크",
          viewChannel: "채널 보기",
        },
        reporterId: "리포터 ID",
        sort: {
          first: "첫 리포트",
          latest: "최근 활동",
          news: "뉴스 많은 순",
          recommended: "추천",
          revenue: "구매 기여",
          title: "정렬",
          trust: "신뢰도",
        },
        stats: {
          active: "최근 활동",
          characters: "AI 캐릭터",
          fanOnly: "팬 전용",
          first: "최초 리포트",
          news: "뉴스",
          public: "공개",
          reporters: "팬 기자",
          revenue: "기여 매출",
          reward: "보상",
          trust: "신뢰도",
          unlocks: "언락",
          votes: "보고싶어요",
        },
        trust: {
          score: (score: string) => `${score}점`,
          levels: {
            active: "활동 팬 기자",
            leading: "대표 팬 기자",
            starter: "신규 팬 기자",
            trusted: "신뢰 팬 기자",
          },
        },
      }
    : {
        backToNews: "News home",
        empty: {
          body:
            "Fan reporters will be promoted here once public reports are available.",
          title: "No fan reporters are ready yet.",
        },
        hero: {
          body:
            "A public directory where fan reporters compete through publishing, first-report scoops, reader reactions, unlocks, and purchase contribution.",
          eyebrow: "Fan Reporter League",
          kicker: "AI character IP growth partners",
          title: "All fan reporters",
        },
        latestReport: "Latest news",
        nav: {
          reporterDesk: "Reporter desk",
          viewChannel: "View channel",
        },
        reporterId: "Reporter ID",
        sort: {
          first: "First reports",
          latest: "Latest",
          news: "Most news",
          recommended: "Recommended",
          revenue: "Purchases",
          title: "Sort",
          trust: "Trust",
        },
        stats: {
          active: "Recent",
          characters: "AI characters",
          fanOnly: "Fan-only",
          first: "First reports",
          news: "News",
          public: "Public",
          reporters: "Reporters",
          revenue: "Revenue",
          reward: "Rewards",
          trust: "Trust",
          unlocks: "Unlocks",
          votes: "Want-to-watch",
        },
        trust: {
          score: (score: string) => `${score} pts`,
          levels: {
            active: "Active fan reporter",
            leading: "Leading fan reporter",
            starter: "New fan reporter",
            trusted: "Trusted fan reporter",
          },
        },
      };
}

function readSort(value: string | string[] | undefined): ReporterDirectorySort {
  const raw = Array.isArray(value) ? value[0] : value;

  return REPORTER_DIRECTORY_SORTS.includes(raw as ReporterDirectorySort)
    ? (raw as ReporterDirectorySort)
    : "recommended";
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

function formatUsdt(value: number, locale: Locale) {
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value > 0 && value < 1 ? 2 : 0,
  }).format(value)} USDT`;
}

function getDateValue(value: Date | null) {
  return value?.getTime() ?? 0;
}

function getTrustLevelLabel(
  copy: ReturnType<typeof getCopy>,
  level: FanletterNewsReporterTrustLevel,
) {
  return copy.trust.levels[level];
}

function getDirectoryHref({
  locale,
  referralCode,
  sort,
}: {
  locale: Locale;
  referralCode: string | null;
  sort: ReporterDirectorySort;
}) {
  return setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/reporters`, referralCode),
    {
      sort: sort === "recommended" ? null : sort,
    },
  );
}

function sortReporters(
  reporters: ReporterDirectoryEntry[],
  sort: ReporterDirectorySort,
) {
  const byLatest = (left: ReporterDirectoryEntry, right: ReporterDirectoryEntry) =>
    getDateValue(right.latestReportAt) - getDateValue(left.latestReportAt);
  const byRecommended = (
    left: ReporterDirectoryEntry,
    right: ReporterDirectoryEntry,
  ) =>
    right.rankScore - left.rankScore ||
    right.firstReportCount - left.firstReportCount ||
    right.reportCount - left.reportCount ||
    byLatest(left, right);

  return [...reporters].sort((left, right) => {
    if (sort === "latest") {
      return byLatest(left, right);
    }

    if (sort === "news") {
      return right.reportCount - left.reportCount || byRecommended(left, right);
    }

    if (sort === "trust") {
      return right.trust.score - left.trust.score || byRecommended(left, right);
    }

    if (sort === "revenue") {
      return (
        right.incentive.paidUnlockPurchaseCount -
          left.incentive.paidUnlockPurchaseCount ||
        right.incentive.paidUnlockRevenueUsdt -
          left.incentive.paidUnlockRevenueUsdt ||
        byRecommended(left, right)
      );
    }

    if (sort === "first") {
      return (
        right.firstReportCount - left.firstReportCount ||
        right.reportCount - left.reportCount ||
        byLatest(left, right)
      );
    }

    return byRecommended(left, right);
  });
}

function ReporterAvatar({
  avatarImageUrl,
  name,
  referralCode,
}: {
  avatarImageUrl: string | null;
  name: string;
  referralCode: string;
}) {
  const initial =
    name.trim().charAt(0).toUpperCase() ||
    referralCode.trim().charAt(0).toUpperCase() ||
    "F";

  return (
    <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#111510] text-xl font-black text-[#44f26e] ring-4 ring-white">
      {avatarImageUrl ? (
        <Image
          alt=""
          aria-hidden="true"
          className="object-cover"
          fill
          sizes="4rem"
          src={avatarImageUrl}
          unoptimized={shouldBypassFanletterImageOptimization(avatarImageUrl)}
        />
      ) : (
        initial
      )}
    </span>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 border border-black/10 bg-white p-3 shadow-[0_12px_28px_rgba(17,21,16,0.045)]">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[0.6rem] font-black uppercase tracking-[0.1em] text-black/42">
          {label}
        </p>
        <span className="text-[#16702e]">{icon}</span>
      </div>
      <p className="mt-2 truncate text-2xl font-black leading-none text-[#111510]">
        {value}
      </p>
    </div>
  );
}

function ReporterCard({
  copy,
  locale,
  rank,
  referralCode,
  reporter,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  rank: number;
  referralCode: string | null;
  reporter: ReporterDirectoryEntry;
}) {
  const channelHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reporters/${encodeURIComponent(
      reporter.referralCode,
    )}`,
    referralCode,
  );
  const latestReportHref = reporter.latestReport
    ? buildPathWithReferral(
        `/${locale}/fanletter/news/${reporter.latestReport.reportId}`,
        referralCode,
      )
    : null;
  const trustLevelLabel = getTrustLevelLabel(copy, reporter.trust.level);

  return (
    <article className="grid min-w-0 overflow-hidden border border-black/12 bg-white shadow-[0_16px_42px_rgba(17,21,16,0.065)]">
      <div className="border-b border-black/10 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <ReporterAvatar
              avatarImageUrl={reporter.avatarImageUrl}
              name={reporter.name}
              referralCode={reporter.referralCode}
            />
            <div className="min-w-0">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                #{rank} · {trustLevelLabel}
              </p>
              <Link
                className="mt-1 block truncate text-xl font-black tracking-normal !text-[#111510] hover:text-[#16702e]"
                href={channelHref}
              >
                {reporter.name}
              </Link>
              <p className="mt-0.5 truncate text-xs font-bold text-black/42">
                @{reporter.referralCode}
              </p>
            </div>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center border border-[#44f26e]/45 bg-[#ecfff0] text-[#16702e]">
            <ShieldCheck className="size-5" />
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-px border border-black/10 bg-black/10">
          {[
            [copy.stats.news, reporter.reportCount],
            [copy.stats.characters, reporter.characterCount],
            [copy.stats.first, reporter.firstReportCount],
          ].map(([label, value]) => (
            <div className="min-w-0 bg-[#fbfcf8] p-2.5" key={label}>
              <p className="truncate text-lg font-black leading-none">
                {formatNumber(Number(value), locale)}
              </p>
              <p className="mt-1 truncate text-[0.56rem] font-black uppercase tracking-[0.08em] text-black/38">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {reporter.latestReport ? (
        <Link
          className="group grid grid-cols-[7rem_minmax(0,1fr)] border-b border-black/10 bg-[#fbfcf8] !text-[#111510]"
          href={latestReportHref ?? channelHref}
        >
          <span className="relative block aspect-[4/3] bg-[#111510]">
            {reporter.latestReport.coverImageUrl ? (
              <Image
                alt=""
                aria-hidden="true"
                className="object-cover transition duration-300 group-hover:scale-[1.03]"
                fill
                sizes="7rem"
                src={reporter.latestReport.coverImageUrl}
                unoptimized={shouldBypassFanletterImageOptimization(
                  reporter.latestReport.coverImageUrl,
                )}
              />
            ) : (
              <span className="flex h-full items-center justify-center text-[#44f26e]">
                <Newspaper className="size-8" />
              </span>
            )}
          </span>
          <span className="min-w-0 p-3">
            <span className="text-[0.6rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
              {copy.latestReport}
            </span>
            <span className="mt-1 block line-clamp-2 text-sm font-black leading-5 [word-break:keep-all]">
              {getArticleDisplayTitle(reporter.latestReport.title)}
            </span>
            <span className="mt-1 block truncate text-[0.66rem] font-bold text-black/42">
              {reporter.latestReport.creatorName} ·{" "}
              {formatDate(reporter.latestReportAt, locale)}
            </span>
          </span>
        </Link>
      ) : null}

      <div className="grid grid-cols-2 gap-2 p-4">
        <div className="border border-black/10 bg-[#f7fbf5] p-2.5">
          <p className="text-[0.56rem] font-black uppercase tracking-[0.08em] text-black/38">
            {copy.stats.votes}
          </p>
          <p className="mt-1 text-base font-black">
            {formatNumber(reporter.incentive.sourceRevealVoteCount, locale)}
          </p>
        </div>
        <div className="border border-black/10 bg-[#faf7ff] p-2.5">
          <p className="text-[0.56rem] font-black uppercase tracking-[0.08em] text-black/38">
            {copy.stats.revenue}
          </p>
          <p className="mt-1 truncate text-base font-black">
            {formatUsdt(reporter.incentive.paidUnlockRevenueUsdt, locale)}
          </p>
        </div>
        <Link
          className="col-span-2 inline-flex h-10 items-center justify-center gap-2 bg-[#111510] px-3 text-sm font-black !text-white transition hover:bg-[#16702e]"
          href={channelHref}
        >
          {copy.nav.viewChannel}
          <ArrowRight className="size-4 text-[#44f26e]" />
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
    description: copy.hero.body,
    title: `${copy.hero.title} | FanLetter News`,
  };
}

export default async function FanletterNewsReportersDirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsReportersSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const selectedSort = readSort(query.sort);
  const reporters = await getFanletterNewsReporterDirectory({
    limit: REPORTER_DIRECTORY_LIMIT,
    locale,
  });
  const incentiveStats = await Promise.all(
    reporters.map((reporter) =>
      getFanletterNewsReporterIncentiveStats({
        reporterReferralCode: reporter.referralCode,
      }),
    ),
  );
  const enrichedReporters = reporters.map((reporter, index) => {
    const incentive = incentiveStats[index]?.overview ?? {
      paidUnlockPurchaseCount: 0,
      paidUnlockRevenueUsdt: 0,
      rewardPoints: 0,
      sourceRevealUnlockContributionCount: 0,
      sourceRevealVoteCount: 0,
    };
    const trust = getFanletterNewsReporterTrustProfile({
      latestReportAt: reporter.latestReportAt,
      paidUnlockPurchaseCount: incentive.paidUnlockPurchaseCount,
      reportCount: reporter.reportCount,
      rewardPoints: incentive.rewardPoints,
      sourceRevealUnlockContributionCount:
        incentive.sourceRevealUnlockContributionCount,
      sourceRevealVoteCount: incentive.sourceRevealVoteCount,
      status: null,
    });

    return {
      ...reporter,
      incentive,
      rankScore:
        trust.score * 10 +
        reporter.firstReportCount * 7 +
        reporter.reportCount * 3 +
        incentive.paidUnlockPurchaseCount * 6 +
        Math.min(incentive.paidUnlockRevenueUsdt, 100),
      trust,
    };
  });
  const sortedReporters = sortReporters(enrichedReporters, selectedSort);
  const totalReports = enrichedReporters.reduce(
    (sum, reporter) => sum + reporter.reportCount,
    0,
  );
  const totalCharacters = enrichedReporters.reduce(
    (sum, reporter) => sum + reporter.characterCount,
    0,
  );
  const latestActivityTime = Math.max(
    0,
    ...enrichedReporters.map((reporter) => getDateValue(reporter.latestReportAt)),
  );
  const recentThreshold = latestActivityTime - 30 * 24 * 60 * 60 * 1000;
  const activeReporterCount = enrichedReporters.filter(
    (reporter) => getDateValue(reporter.latestReportAt) >= recentThreshold,
  ).length;
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const reporterDeskHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reports`,
    referralCode,
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef1ec] pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-[#111510] sm:pb-12">
      <header className="border-b border-black/14 bg-white">
        <div className="mx-auto max-w-[92rem] px-4 pt-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4 border-b-2 border-[#111510] pb-3">
            <Link
              className="inline-flex min-w-0 items-center break-words text-[2.05rem] font-black leading-none tracking-normal !text-[#111510] sm:text-[4.25rem]"
              href={newsHomeHref}
            >
              FanLetter News
            </Link>
            <Link
              className="hidden shrink-0 items-center gap-2 border border-black/14 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0] sm:inline-flex"
              href={newsHomeHref}
            >
              <ArrowLeft className="size-4 text-[#16702e]" />
              {copy.backToNews}
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-black/10 bg-[#fbfcf8]">
        <div className="mx-auto grid max-w-[92rem] gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
              <BadgeCheck className="size-3.5" />
              {copy.hero.eyebrow}
            </p>
            <h1 className="mt-3 break-words text-[2.5rem] font-black leading-[0.98] tracking-normal [word-break:keep-all] sm:text-[4.3rem] lg:text-[5.2rem]">
              {copy.hero.title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-black/58 sm:text-base sm:leading-7">
              {copy.hero.body}
            </p>
          </div>
          <aside className="border border-[#44f26e]/18 bg-[#111510] p-4 text-white shadow-[0_18px_50px_rgba(17,21,16,0.16)]">
            <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#44f26e]">
              {copy.hero.kicker}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="border border-white/10 bg-white/[0.06] p-3">
                <p className="text-[0.58rem] font-black uppercase tracking-[0.1em] text-white/38">
                  {copy.stats.reporters}
                </p>
                <p className="mt-1 text-2xl font-black text-[#b9ffc8]">
                  {formatNumber(enrichedReporters.length, locale)}
                </p>
              </div>
              <div className="border border-white/10 bg-white/[0.06] p-3">
                <p className="text-[0.58rem] font-black uppercase tracking-[0.1em] text-white/38">
                  {copy.stats.news}
                </p>
                <p className="mt-1 text-2xl font-black text-[#b9ffc8]">
                  {formatNumber(totalReports, locale)}
                </p>
              </div>
            </div>
            <Link
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 bg-[#44f26e] px-4 text-sm font-black !text-black transition hover:bg-[#69ff8c]"
              href={reporterDeskHref}
            >
              <PenLine className="size-4" />
              {copy.nav.reporterDesk}
            </Link>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            icon={<UsersRound className="size-4" />}
            label={copy.stats.reporters}
            value={formatNumber(enrichedReporters.length, locale)}
          />
          <StatTile
            icon={<FileText className="size-4" />}
            label={copy.stats.news}
            value={formatNumber(totalReports, locale)}
          />
          <StatTile
            icon={<Sparkles className="size-4" />}
            label={copy.stats.characters}
            value={formatNumber(totalCharacters, locale)}
          />
          <StatTile
            icon={<CalendarDays className="size-4" />}
            label={copy.stats.active}
            value={formatNumber(activeReporterCount, locale)}
          />
        </div>

        <div className="mt-5 flex flex-col gap-3 border border-black/12 bg-white p-3 shadow-[0_14px_34px_rgba(17,21,16,0.045)] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-[0.66rem] font-black uppercase tracking-[0.14em] text-black/44">
            <BarChart3 className="size-4 text-[#16702e]" />
            {copy.sort.title}
          </div>
          <nav className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {REPORTER_DIRECTORY_SORTS.map((sort) => {
              const isSelected = sort === selectedSort;

              return (
                <Link
                  className={`inline-flex h-9 shrink-0 items-center justify-center border px-3 text-xs font-black transition ${
                    isSelected
                      ? "border-[#111510] bg-[#111510] !text-white"
                      : "border-black/10 bg-[#fbfcf8] !text-black/58 hover:border-[#19b84b] hover:bg-[#ecfff0] hover:!text-[#16702e]"
                  }`}
                  href={getDirectoryHref({
                    locale,
                    referralCode,
                    sort,
                  })}
                  key={sort}
                >
                  {copy.sort[sort]}
                </Link>
              );
            })}
          </nav>
        </div>

        {sortedReporters.length > 0 ? (
          <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortedReporters.map((reporter, index) => (
              <ReporterCard
                copy={copy}
                key={reporter.referralCode}
                locale={locale}
                rank={index + 1}
                referralCode={referralCode}
                reporter={reporter}
              />
            ))}
          </section>
        ) : (
          <section className="mt-5 border border-dashed border-black/16 bg-white p-8 text-center shadow-[0_14px_34px_rgba(17,21,16,0.045)]">
            <UserRound className="mx-auto size-10 text-[#16702e]" />
            <h2 className="mt-3 text-2xl font-black">{copy.empty.title}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-black/54">
              {copy.empty.body}
            </p>
          </section>
        )}

        <section className="mt-8 grid gap-3 border-t-2 border-[#111510] pt-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 border border-black/10 bg-white p-4">
            <Trophy className="size-5 text-[#16702e]" />
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-black/38">
                {copy.stats.first}
              </p>
              <p className="mt-1 text-sm font-black">
                {formatNumber(
                  enrichedReporters.reduce(
                    (sum, reporter) => sum + reporter.firstReportCount,
                    0,
                  ),
                  locale,
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 border border-black/10 bg-white p-4">
            <Unlock className="size-5 text-[#5b35a2]" />
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-black/38">
                {copy.stats.unlocks}
              </p>
              <p className="mt-1 text-sm font-black">
                {formatNumber(
                  enrichedReporters.reduce(
                    (sum, reporter) =>
                      sum +
                      reporter.incentive.sourceRevealUnlockContributionCount,
                    0,
                  ),
                  locale,
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 border border-black/10 bg-white p-4">
            <Coins className="size-5 text-[#16702e]" />
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-black/38">
                {copy.stats.revenue}
              </p>
              <p className="mt-1 text-sm font-black">
                {formatUsdt(
                  enrichedReporters.reduce(
                    (sum, reporter) =>
                      sum + reporter.incentive.paidUnlockRevenueUsdt,
                    0,
                  ),
                  locale,
                )}
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
