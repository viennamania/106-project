import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Coins,
  CalendarDays,
  Clapperboard,
  FileText,
  HeartHandshake,
  Newspaper,
  PenLine,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";

import type { FanletterNewsReportDocument } from "@/lib/content";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  getFanletterNewsReporterProfile,
  getFanletterNewsReportsForReporterChannel,
} from "@/lib/fanletter-news-report-service";
import {
  getFanletterNewsArticleDisplayTitle as getArticleDisplayTitle,
} from "@/lib/fanletter-news-related";
import { getFanletterNewsReporterIncentiveStats } from "@/lib/fanletter-news-reporter-incentives";
import {
  getFanletterNewsReporterTrustProfile,
  type FanletterNewsReporterTrustLevel,
} from "@/lib/fanletter-news-reporter-trust";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";

type FanletterNewsReporterChannelSearchParams = {
  ref?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        access: {
          fanOnly: "팬 전용",
          public: "공개",
        },
        allReporters: "팬 기자 전체",
        backToNews: "뉴스 홈",
        characterCoverage: {
          body:
            "이 팬 기자가 지속적으로 리포트하며 성장시키는 AI 캐릭터입니다.",
          empty: "아직 공개 채널에 표시할 AI 캐릭터 커버리지가 없습니다.",
          latest: "최근 리포트",
          open: "캐릭터 채널",
          reports: (count: string) => `${count}개 리포트`,
          title: "성장시키는 AI 캐릭터",
        },
        empty: {
          body:
            "이 팬 기자의 공개 뉴스 리포트가 아직 없습니다. 공개 가능한 리포트가 생성되면 이 채널에 축적됩니다.",
          title: "공개 리포트가 아직 없습니다.",
        },
        hero: {
          body:
            "팬 기자가 AI 캐릭터의 팬이 되어 뉴스를 만들고, 독자의 보고싶어요·언락·구매 행동을 캐릭터 IP 성장과 보상 기준으로 연결합니다.",
          eyebrow: "Fan Reporter Channel",
          fallbackName: (code: string) => `${code} 팬 기자`,
          kicker: "AI 캐릭터 IP 성장 파트너",
          titleSuffix: "팬 기자 채널",
        },
        latestReports: {
          cta: "뉴스 읽기",
          emptyNsfw:
            "이 팬 기자의 리포트는 있지만 공개 채널에서는 NSFW 리포트를 제외했습니다.",
          title: "최신 공개 뉴스",
        },
        meta: {
          firstReport: "첫 리포트",
          joined: "가입",
          latest: "최근 활동",
          reporterId: "리포터 ID",
        },
        model: {
          body:
            "리포터 채널은 단순 작성자 목록이 아니라, 어떤 팬 기자가 어떤 AI 캐릭터의 팬덤과 유료 콘텐츠 소비를 만들어내는지 보여주는 공개 신뢰 지표입니다.",
          steps: ["뉴스 작성", "팬 반응 유도", "보상 기준 누적"],
          title: "팬 기자가 캐릭터 성장 루프를 만듭니다",
        },
        nsfwExcluded: (count: string) =>
          `공개 채널 품질을 위해 NSFW 리포트 ${count}개는 목록에서 제외했습니다.`,
        reporterStats: {
          characters: "AI 캐릭터",
          fanOnly: "팬 전용",
          paidPurchases: "구매 기여",
          publicReports: "공개 리포트",
          reports: "뉴스",
          revenue: "기여 매출",
          reward: "보상 포인트",
          unlocks: "언락",
          votes: "보고싶어요",
        },
        reporterDesk: "리포터 데스크",
        siteName: "AIAVpark News",
        trust: {
          basis: "작성·반응·언락·구매 기여 기준",
          max: "최고 등급",
          next: (level: string, points: string) =>
            `${level}까지 ${points}점`,
          score: (score: string) => `${score}점`,
          title: "팬 기자 신뢰도",
          levels: {
            active: "활동 팬 기자",
            leading: "대표 팬 기자",
            starter: "신규 팬 기자",
            trusted: "신뢰 팬 기자",
          },
        },
      }
    : {
        access: {
          fanOnly: "Fan-only",
          public: "Public",
        },
        allReporters: "All fan reporters",
        backToNews: "News home",
        characterCoverage: {
          body:
            "AI characters this fan reporter repeatedly covers and helps grow.",
          empty: "No public AI character coverage is ready for this channel yet.",
          latest: "Latest report",
          open: "Character channel",
          reports: (count: string) => `${count} reports`,
          title: "AI characters being grown",
        },
        empty: {
          body:
            "Public news reports from this fan reporter will collect here once they are available.",
          title: "No public reports yet.",
        },
        hero: {
          body:
            "Fan reporters become fans of AI characters, publish news, and connect reader want-to-watch, unlock, and purchase actions to character growth and reward basis.",
          eyebrow: "Fan Reporter Channel",
          fallbackName: (code: string) => `Fan reporter ${code}`,
          kicker: "AI character IP growth partner",
          titleSuffix: "fan reporter channel",
        },
        latestReports: {
          cta: "Read news",
          emptyNsfw:
            "This fan reporter has reports, but NSFW reports are excluded from the public channel.",
          title: "Latest public news",
        },
        meta: {
          firstReport: "First report",
          joined: "Joined",
          latest: "Latest activity",
          reporterId: "Reporter ID",
        },
        model: {
          body:
            "The reporter channel is a public trust surface that shows which fan reporters create fandom and paid-content demand for AI characters.",
          steps: ["Publish news", "Drive fan actions", "Accumulate revenue basis"],
          title: "Fan reporters create the character growth loop",
        },
        nsfwExcluded: (count: string) =>
          `${count} NSFW reports are excluded from this public channel.`,
        reporterStats: {
          characters: "AI characters",
          fanOnly: "Fan-only",
          paidPurchases: "Purchases",
          publicReports: "Public reports",
          reports: "News",
          revenue: "Revenue basis",
          reward: "Reward points",
          unlocks: "Unlocks",
          votes: "Want-to-watch",
        },
        reporterDesk: "Reporter desk",
        siteName: "AIAVpark News",
        trust: {
          basis: "Based on reports, reactions, unlocks, and purchases",
          max: "Top level",
          next: (level: string, points: string) =>
            `${points} points to ${level}`,
          score: (score: string) => `${score} pts`,
          title: "Fan reporter trust",
          levels: {
            active: "Active fan reporter",
            leading: "Leading fan reporter",
            starter: "New fan reporter",
            trusted: "Trusted fan reporter",
          },
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

function formatUsdt(value: number, locale: Locale) {
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value > 0 && value < 1 ? 2 : 0,
  }).format(value)} USDT`;
}

function getTrustLevelLabel(
  copy: ReturnType<typeof getCopy>,
  level: FanletterNewsReporterTrustLevel,
) {
  return copy.trust.levels[level];
}

function getReportDate(report: FanletterNewsReportDocument) {
  return report.sourcePublishedAt ?? report.createdAt ?? null;
}

function getPublicReports(reports: FanletterNewsReportDocument[]) {
  return reports.filter((report) => report.contentMaturityRating !== "nsfw");
}

function ReporterAvatar({
  avatarImageUrl,
  name,
  reporterReferralCode,
  size = "large",
}: {
  avatarImageUrl: string | null;
  name: string;
  reporterReferralCode: string;
  size?: "large" | "small";
}) {
  const initial =
    name.trim().charAt(0).toUpperCase() ||
    reporterReferralCode.trim().charAt(0).toUpperCase() ||
    "F";
  const className =
    size === "large"
      ? "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#111510] text-2xl font-black text-[#44f26e] ring-4 ring-white sm:size-24"
      : "relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#111510] text-sm font-black text-[#44f26e]";

  return (
    <span className={className}>
      {avatarImageUrl ? (
        <Image
          alt=""
          aria-hidden="true"
          className="object-cover"
          fill
          sizes={size === "large" ? "6rem" : "2.75rem"}
          src={avatarImageUrl}
          unoptimized={shouldBypassFanletterImageOptimization(avatarImageUrl)}
        />
      ) : (
        initial
      )}
    </span>
  );
}

function MetricCard({
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

function NewsReportCard({
  copy,
  locale,
  referralCode,
  report,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  referralCode: string | null;
  report: FanletterNewsReportDocument;
}) {
  const href = buildPathWithReferral(
    `/${locale}/fanletter/news/${report.reportId}`,
    referralCode,
  );
  const publishedAt = formatDate(getReportDate(report), locale);
  const accessLabel =
    report.priceType === "paid" ? copy.access.fanOnly : copy.access.public;
  const imageUrl = report.coverImageUrl;

  return (
    <article className="grid min-w-0 overflow-hidden border border-black/12 bg-white shadow-[0_14px_34px_rgba(17,21,16,0.055)]">
      <Link className="relative block aspect-[16/10] bg-[#111510]" href={href}>
        {imageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover transition duration-300 hover:scale-[1.03]"
            fill
            sizes="(max-width: 768px) 100vw, 26rem"
            src={imageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(imageUrl)}
          />
        ) : (
          <span className="flex h-full items-center justify-center text-[#44f26e]">
            <Newspaper className="size-10" />
          </span>
        )}
        <span className="absolute left-3 top-3 bg-[#44f26e] px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-black">
          {accessLabel}
        </span>
      </Link>
      <div className="flex min-w-0 flex-col p-4">
        <div className="flex flex-wrap items-center gap-2 text-[0.68rem] font-bold text-black/42">
          <span>{publishedAt}</span>
          <span aria-hidden="true">·</span>
          <span>{report.creatorName}</span>
        </div>
        <Link
          className="mt-2 line-clamp-2 break-words text-lg font-black leading-6 [word-break:keep-all] hover:text-[#16702e]"
          href={href}
        >
          {getArticleDisplayTitle(report.title)}
        </Link>
        <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-black/58">
          {report.dek}
        </p>
        <Link
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#111510] px-4 text-sm font-black !text-white transition hover:bg-black"
          href={href}
        >
          {copy.latestReports.cta}
          <ArrowRight className="size-4 text-[#44f26e]" />
        </Link>
      </div>
    </article>
  );
}

function CharacterCoverageCard({
  character,
  copy,
  locale,
  referralCode,
}: {
  character: {
    coverImageUrl: string | null;
    creatorName: string;
    creatorReferralCode: string | null;
    latestReportAt: Date | null;
    reportCount: number;
  };
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  referralCode: string | null;
}) {
  const href = character.creatorReferralCode
    ? buildPathWithReferral(
        `/${locale}/fanletter/news/characters/${character.creatorReferralCode}`,
        referralCode,
      )
    : null;
  const latestReportAt = formatDate(character.latestReportAt, locale);
  const content = (
    <>
      <span className="relative block aspect-[4/3] overflow-hidden bg-[#111510]">
        {character.coverImageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            fill
            sizes="(max-width: 768px) 50vw, 18rem"
            src={character.coverImageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(
              character.coverImageUrl,
            )}
          />
        ) : (
          <span className="flex h-full items-center justify-center text-[#44f26e]">
            <Sparkles className="size-9" />
          </span>
        )}
      </span>
      <span className="block p-3">
        <span className="line-clamp-1 text-base font-black text-[#111510]">
          {character.creatorName}
        </span>
        <span className="mt-1 block text-xs font-bold text-black/44">
          {copy.characterCoverage.reports(
            formatNumber(character.reportCount, locale),
          )}
        </span>
        <span className="mt-2 flex items-center justify-between gap-2 text-[0.66rem] font-black text-[#16702e]">
          <span className="truncate">
            {copy.characterCoverage.latest} {latestReportAt}
          </span>
          {href ? <ArrowRight className="size-3.5 shrink-0" /> : null}
        </span>
      </span>
    </>
  );

  if (!href) {
    return (
      <div className="min-w-0 overflow-hidden border border-black/10 bg-white">
        {content}
      </div>
    );
  }

  return (
    <Link
      className="group min-w-0 overflow-hidden border border-black/10 bg-white !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
      href={href}
    >
      {content}
    </Link>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; reporterReferralCode: string }>;
}): Promise<Metadata> {
  const { lang, reporterReferralCode } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const copy = getCopy(locale);
  const normalizedReporterReferralCode =
    normalizeReferralCode(reporterReferralCode);

  if (!normalizedReporterReferralCode) {
    return {
      title: `${copy.hero.titleSuffix} | AIAVpark News`,
    };
  }

  const profile = await getFanletterNewsReporterProfile({
    reporterReferralCode: normalizedReporterReferralCode,
  });
  const reporterName =
    profile?.displayName ?? copy.hero.fallbackName(normalizedReporterReferralCode);

  return {
    title: `${reporterName} ${copy.hero.titleSuffix} | AIAVpark News`,
    description: copy.hero.body,
  };
}

export default async function FanletterNewsReporterChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; reporterReferralCode: string }>;
  searchParams: Promise<FanletterNewsReporterChannelSearchParams>;
}) {
  const { lang, reporterReferralCode } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const normalizedReporterReferralCode =
    normalizeReferralCode(reporterReferralCode);

  if (!normalizedReporterReferralCode) {
    notFound();
  }

  const referralCode = readFanletterReferralCode(query.ref);
  const [profile, channelData, incentiveStats] = await Promise.all([
    getFanletterNewsReporterProfile({
      reporterReferralCode: normalizedReporterReferralCode,
    }),
    getFanletterNewsReportsForReporterChannel({
      locale,
      reporterReferralCode: normalizedReporterReferralCode,
    }),
    getFanletterNewsReporterIncentiveStats({
      reporterReferralCode: normalizedReporterReferralCode,
    }),
  ]);

  if (!profile && channelData.reportCount === 0) {
    notFound();
  }

  const publicReports = getPublicReports(channelData.reports);
  const characterStats = channelData.characters;
  const reporterName =
    profile?.displayName ??
    publicReports[0]?.reporterName ??
    copy.hero.fallbackName(normalizedReporterReferralCode);
  const reporterAvatarImageUrl =
    profile?.avatarImageUrl ?? publicReports[0]?.reporterAvatarImageUrl ?? null;
  const reporterTrust = getFanletterNewsReporterTrustProfile({
    latestReportAt: profile?.latestReportAt ?? channelData.latestReportAt,
    paidUnlockPurchaseCount:
      incentiveStats.overview.paidUnlockPurchaseCount,
    reportCount: Math.max(profile?.reportCount ?? 0, channelData.reportCount),
    rewardPoints: incentiveStats.overview.rewardPoints,
    sourceRevealUnlockContributionCount:
      incentiveStats.overview.sourceRevealUnlockContributionCount,
    sourceRevealVoteCount: incentiveStats.overview.sourceRevealVoteCount,
    status: profile?.status ?? null,
  });
  const trustLevelLabel = getTrustLevelLabel(copy, reporterTrust.level);
  const nextTrustLabel = reporterTrust.nextLevel
    ? copy.trust.next(
        getTrustLevelLabel(copy, reporterTrust.nextLevel),
        formatNumber(reporterTrust.pointsToNextLevel, locale),
      )
    : copy.trust.max;
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const reportersHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reporters`,
    referralCode,
  );
  const reportsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reports`,
    referralCode,
  );
  const latestHref = "#latest-reporter-news";
  const metaItems = [
    {
      label: copy.meta.reporterId,
      value: `@${normalizedReporterReferralCode}`,
    },
    {
      label: copy.meta.latest,
      value: formatDate(channelData.latestReportAt, locale),
    },
    {
      label: copy.meta.firstReport,
      value: formatDate(profile?.firstReportAt ?? null, locale),
    },
    {
      label: copy.meta.joined,
      value: formatDate(profile?.joinedAt ?? null, locale),
    },
  ];
  const metricItems = [
    {
      icon: <FileText className="size-4" />,
      label: copy.reporterStats.reports,
      value: formatNumber(channelData.reportCount, locale),
    },
    {
      icon: <Sparkles className="size-4" />,
      label: copy.reporterStats.characters,
      value: formatNumber(characterStats.length, locale),
    },
    {
      icon: <Clapperboard className="size-4" />,
      label: copy.reporterStats.publicReports,
      value: formatNumber(channelData.publicCount, locale),
    },
    {
      icon: <Coins className="size-4" />,
      label: copy.reporterStats.fanOnly,
      value: formatNumber(channelData.fanOnlyCount, locale),
    },
    {
      icon: <UsersRound className="size-4" />,
      label: copy.reporterStats.votes,
      value: formatNumber(incentiveStats.overview.sourceRevealVoteCount, locale),
    },
    {
      icon: <Trophy className="size-4" />,
      label: copy.reporterStats.unlocks,
      value: formatNumber(
        incentiveStats.overview.sourceRevealUnlockContributionCount,
        locale,
      ),
    },
    {
      icon: <HeartHandshake className="size-4" />,
      label: copy.reporterStats.paidPurchases,
      value: formatNumber(incentiveStats.overview.paidUnlockPurchaseCount, locale),
    },
    {
      icon: <Coins className="size-4" />,
      label: copy.reporterStats.revenue,
      value: formatUsdt(incentiveStats.overview.paidUnlockRevenueUsdt, locale),
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef1ec] pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-[#111510] sm:pb-12">
      <header className="border-b border-black/14 bg-white">
        <div className="mx-auto max-w-[92rem] px-4 pt-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4 border-b-2 border-[#111510] pb-3">
            <Link
              className="inline-flex min-w-0 items-center break-words text-[2.05rem] font-black leading-none tracking-normal !text-[#111510] sm:text-[4.25rem]"
              href={newsHomeHref}
            >
              {copy.siteName}
            </Link>
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <Link
                className="inline-flex items-center gap-2 border border-black/14 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                href={reportersHref}
              >
                <UsersRound className="size-4 text-[#16702e]" />
                {copy.allReporters}
              </Link>
              <Link
                className="inline-flex items-center gap-2 border border-black/14 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                href={newsHomeHref}
              >
                <ArrowLeft className="size-4 text-[#16702e]" />
                {copy.backToNews}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[92rem] px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(21rem,28rem)] lg:items-stretch">
          <section className="overflow-hidden border border-black/12 bg-white shadow-[0_18px_50px_rgba(17,21,16,0.075)]">
            <div className="border-b-2 border-[#111510] bg-[#111510] px-4 py-3 text-white sm:px-6">
              <p className="inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#44f26e]">
                <BadgeCheck className="size-3.5" />
                {copy.hero.eyebrow}
              </p>
            </div>
            <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
              <ReporterAvatar
                avatarImageUrl={reporterAvatarImageUrl}
                name={reporterName}
                reporterReferralCode={normalizedReporterReferralCode}
              />
              <div className="min-w-0">
                <p className="text-[0.72rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
                  {copy.hero.kicker}
                </p>
                <h1 className="mt-2 break-words text-[2rem] font-black leading-[1.08] tracking-normal [word-break:keep-all] sm:text-[3rem] lg:text-[3.25rem]">
                  {reporterName}
                </h1>
                {profile?.characterName ? (
                  <p className="mt-2 text-sm font-black text-black/42">
                    {profile.characterName}
                  </p>
                ) : null}
              </div>
            </div>
            <dl className="grid border-t border-black/10 sm:grid-cols-4">
              {metaItems.map((item) => (
                <div
                  className="min-w-0 border-b border-black/10 px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
                  key={item.label}
                >
                  <dt className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-black/38">
                    {item.label}
                  </dt>
                  <dd className="mt-1 truncate text-sm font-black text-[#111510]">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <aside className="border border-[#44f26e]/18 bg-[#111510] p-4 text-white shadow-[0_18px_50px_rgba(17,21,16,0.16)] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#44f26e]">
                <ShieldCheck className="size-3.5" />
                {copy.trust.title}
              </p>
              <span className="inline-flex rounded-full bg-[#44f26e] px-2.5 py-1 text-[0.68rem] font-black text-black">
                {copy.trust.score(formatNumber(reporterTrust.score, locale))}
              </span>
            </div>
            <h2 className="mt-4 text-3xl font-black leading-tight">
              {trustLevelLabel}
            </h2>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/12">
              <div
                className="h-full rounded-full bg-[#44f26e]"
                style={{ width: `${reporterTrust.progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold leading-5 text-white/54">
              {copy.trust.basis} · {nextTrustLabel}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="border border-white/10 bg-white/[0.06] p-3">
                <p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-white/38">
                  {copy.reporterStats.reward}
                </p>
                <p className="mt-1 text-lg font-black text-[#b9ffc8]">
                  {formatNumber(incentiveStats.overview.rewardPoints, locale)}P
                </p>
              </div>
              <div className="border border-white/10 bg-white/[0.06] p-3">
                <p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-white/38">
                  {copy.reporterStats.revenue}
                </p>
                <p className="mt-1 text-lg font-black text-[#b9ffc8]">
                  {formatUsdt(incentiveStats.overview.paidUnlockRevenueUsdt, locale)}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 py-2 text-sm font-black !text-black transition hover:bg-[#69ff8c]"
                href={latestHref}
              >
                {copy.latestReports.title}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/18 px-4 py-2 text-sm font-black !text-white transition hover:border-[#44f26e] hover:bg-white/10"
                href={reportsHref}
              >
                <PenLine className="size-4 text-[#44f26e]" />
                {copy.reporterDesk}
              </Link>
            </div>
          </aside>
        </div>

        <section className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {metricItems.map((item) => (
            <MetricCard
              icon={item.icon}
              key={item.label}
              label={item.label}
              value={item.value}
            />
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="border border-black/12 bg-white p-4 shadow-[0_14px_34px_rgba(17,21,16,0.055)] sm:p-5">
            <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
              <HeartHandshake className="size-3.5" />
              Fan Reporter Partner
            </p>
            <h2 className="mt-3 text-2xl font-black leading-tight tracking-normal [word-break:keep-all] sm:text-3xl">
              {copy.model.title}
            </h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {copy.model.steps.map((step, index) => (
              <div
                className="border border-black/10 bg-white px-4 py-3 shadow-[0_12px_28px_rgba(17,21,16,0.045)]"
                key={step}
              >
                <p className="text-[0.6rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <p className="mt-1 text-sm font-black text-[#111510]">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
                <Sparkles className="size-3.5" />
                AI Character Coverage
              </p>
              <h2 className="mt-1 text-2xl font-black">
                {copy.characterCoverage.title}
              </h2>
            </div>
          </div>
          {characterStats.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {characterStats.map((character) => (
                <CharacterCoverageCard
                  character={character}
                  copy={copy}
                  key={character.creatorReferralCode ?? character.creatorName}
                  locale={locale}
                  referralCode={referralCode}
                />
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-black/16 bg-white p-5 text-sm font-semibold text-black/54">
              {copy.characterCoverage.empty}
            </div>
          )}
        </section>

        <section className="mt-8" id="latest-reporter-news">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
                <Newspaper className="size-3.5" />
                Reporter Newsroom
              </p>
              <h2 className="mt-1 text-2xl font-black">
                {copy.latestReports.title}
              </h2>
            </div>
            {channelData.nsfwCount > 0 ? (
              <p className="max-w-md text-xs font-bold leading-5 text-black/42 sm:text-right">
                {copy.nsfwExcluded(formatNumber(channelData.nsfwCount, locale))}
              </p>
            ) : null}
          </div>
          {publicReports.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {publicReports.map((report) => (
                <NewsReportCard
                  copy={copy}
                  key={report.reportId}
                  locale={locale}
                  referralCode={referralCode}
                  report={report}
                />
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-black/16 bg-white p-8 text-center shadow-[0_14px_34px_rgba(17,21,16,0.045)]">
              <UserRound className="mx-auto size-10 text-[#16702e]" />
              <h2 className="mt-3 text-2xl font-black">
                {channelData.reportCount > 0
                  ? copy.latestReports.emptyNsfw
                  : copy.empty.title}
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-black/54">
                {copy.empty.body}
              </p>
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-3 border-t-2 border-[#111510] pt-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 border border-black/10 bg-white p-4">
            <CalendarDays className="size-5 text-[#16702e]" />
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-black/38">
                {copy.meta.latest}
              </p>
              <p className="mt-1 text-sm font-black">
                {formatDate(channelData.latestReportAt, locale)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 border border-black/10 bg-white p-4">
            <FileText className="size-5 text-[#16702e]" />
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-black/38">
                {copy.reporterStats.reports}
              </p>
              <p className="mt-1 text-sm font-black">
                {formatNumber(channelData.reportCount, locale)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 border border-black/10 bg-white p-4">
            <ShieldCheck className="size-5 text-[#16702e]" />
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-black/38">
                {copy.trust.title}
              </p>
              <p className="mt-1 text-sm font-black">{trustLevelLabel}</p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
