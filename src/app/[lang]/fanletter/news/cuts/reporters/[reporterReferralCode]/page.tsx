import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ChevronRight,
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

import { FanletterNewsCharacterProfileImageSlider } from "@/components/fanletter-news-character-motion";
import type { FanletterNewsReportDocument } from "@/lib/content";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  getFanletterNewsReporterProfile,
  getFanletterNewsReportsForReporterChannel,
} from "@/lib/fanletter-news-report-service";
import {
  getFanletterNewsArticleDisplayTitle,
  getFanletterNewsReportPreviewImageUrls,
} from "@/lib/fanletter-news-related";
import { getFanletterNewsReporterIncentiveStats } from "@/lib/fanletter-news-reporter-incentives";
import {
  getFanletterNewsReporterTrustProfile,
  type FanletterNewsReporterTrustLevel,
} from "@/lib/fanletter-news-reporter-trust";
import {
  normalizeFanletterReturnToPath,
  readFanletterReferralCode,
  readFirstSearchParam,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";

type FanletterNewsCutReporterChannelSearchParams = {
  cut?: string | string[];
  ref?: string | string[];
  returnTo?: string | string[];
  sourceReportId?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        backToCuts: "4컷 피드로 돌아가기",
        channelEyebrow: "Cut Feed Reporter Channel",
        characterCoverage: "리포트한 캐릭터",
        characterCoverageBody:
          "이 팬 기자가 어떤 AI 캐릭터를 계속 리포트하는지 빠르게 확인합니다.",
        characters: "캐릭터",
        emptyBody:
          "공개 가능한 리포트가 생기면 이 팬 기자 전용 화면에 모입니다.",
        emptyTitle: "아직 공개 리포트가 없습니다.",
        firstReport: "첫 리포트",
        heroBody:
          "방금 보던 4컷을 만든 팬 기자의 활동, 신뢰도, 최신 리포트를 피드 흐름 안에서 이어봅니다.",
        latestReports: "최신 4컷 리포트",
        latestReportsBody:
          "팬 기자가 고른 컷 흐름을 보고, 마음에 드는 리포트는 다시 4컷 피드에서 이어보세요.",
        metaDescription:
          "4컷 피드에서 이어지는 AIAVpark News 팬 기자 전용 채널입니다.",
        metaTitle: "4컷 피드 팬 기자 채널",
        news: "뉴스",
        noCharacters: "아직 표시할 캐릭터 커버리지가 없습니다.",
        openCharacter: "캐릭터 보기",
        openReport: "4컷으로 보기",
        reporterId: "리포터 ID",
        sourceReport: {
          body: "방금 보고 있던 컷에서 열린 팬 기자 채널입니다.",
          eyebrow: "보고 있던 리포터 컷",
          title: (slot: string) => `${slot}번 컷에서 이어보기`,
        },
        stats: {
          fanOnly: "팬 전용",
          public: "공개",
          purchases: "구매 기여",
          rewards: "보상 포인트",
          unlocks: "언락",
          votes: "보고싶어요",
        },
        trust: {
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
        backToCuts: "Back to 4-cut feed",
        channelEyebrow: "Cut Feed Reporter Channel",
        characterCoverage: "Reported characters",
        characterCoverageBody:
          "See which AI characters this fan reporter keeps covering.",
        characters: "Characters",
        emptyBody:
          "Public reports from this fan reporter will collect here.",
        emptyTitle: "No public reports yet.",
        firstReport: "First report",
        heroBody:
          "Continue from the 4-cut feed into this fan reporter's activity, trust, and latest reports.",
        latestReports: "Latest 4-cut reports",
        latestReportsBody:
          "Review this reporter's cut flow, then continue a report inside the 4-cut feed.",
        metaDescription:
          "A focused AIAVpark News fan reporter channel connected to the 4-cut feed.",
        metaTitle: "4-cut feed fan reporter channel",
        news: "News",
        noCharacters: "No character coverage is ready yet.",
        openCharacter: "Open character",
        openReport: "View in 4 cuts",
        reporterId: "Reporter ID",
        sourceReport: {
          body: "This reporter channel opened from the cut you were viewing.",
          eyebrow: "Reporter cut you were viewing",
          title: (slot: string) => `Continue from cut ${slot}`,
        },
        stats: {
          fanOnly: "Fan-only",
          public: "Public",
          purchases: "Purchases",
          rewards: "Reward points",
          unlocks: "Unlocks",
          votes: "Want-to-watch",
        },
        trust: {
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

function formatDate(value: Date | string | null, locale: Locale) {
  if (!value) {
    return "-";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(date);
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function getTrustLevelLabel(
  copy: ReturnType<typeof getCopy>,
  level: FanletterNewsReporterTrustLevel,
) {
  return copy.trust.levels[level];
}

function getUnoptimizedImageUrls(imageUrls: string[]) {
  return imageUrls.filter((imageUrl) =>
    shouldBypassFanletterImageOptimization(imageUrl),
  );
}

function getReportDate(report: FanletterNewsReportDocument) {
  return report.sourcePublishedAt ?? report.createdAt ?? null;
}

function getPublicReports(reports: FanletterNewsReportDocument[]) {
  return reports.filter((report) => report.contentMaturityRating !== "nsfw");
}

function getCurrentHref({
  cutSlot,
  locale,
  referralCode,
  reporterReferralCode,
  returnHref,
  sourceReportId,
}: {
  cutSlot: string | null;
  locale: Locale;
  referralCode: string | null;
  reporterReferralCode: string;
  returnHref: string;
  sourceReportId: string | null;
}) {
  return setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/cuts/reporters/${encodeURIComponent(
        reporterReferralCode,
      )}`,
      referralCode,
    ),
    {
      cut: cutSlot,
      returnTo: returnHref,
      sourceReportId,
    },
  );
}

function getReportHref({
  currentHref,
  locale,
  referralCode,
  report,
}: {
  currentHref: string;
  locale: Locale;
  referralCode: string | null;
  report: FanletterNewsReportDocument;
}) {
  return setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/cuts/${report.reportId}`,
      referralCode,
    ),
    {
      returnTo: currentHref,
    },
  );
}

function getCharacterHref({
  currentHref,
  locale,
  referralCode,
  referralCodeForCharacter,
}: {
  currentHref: string;
  locale: Locale;
  referralCode: string | null;
  referralCodeForCharacter: string | null;
}) {
  if (!referralCodeForCharacter) {
    return null;
  }

  return setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/cuts/characters/${encodeURIComponent(
        referralCodeForCharacter,
      )}`,
      referralCode,
    ),
    {
      returnTo: currentHref,
    },
  );
}

function ReporterAvatar({
  avatarImageUrl,
  name,
  reporterReferralCode,
}: {
  avatarImageUrl: string | null;
  name: string;
  reporterReferralCode: string;
}) {
  const initial =
    name.trim().charAt(0).toUpperCase() ||
    reporterReferralCode.trim().charAt(0).toUpperCase() ||
    "F";

  return (
    <div className="relative size-24 shrink-0 overflow-hidden rounded-[1.35rem] border border-[#44f26e]/32 bg-[#111510] text-[#44f26e] shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
      {avatarImageUrl ? (
        <Image
          alt=""
          aria-hidden="true"
          className="object-cover"
          fill
          sizes="6rem"
          src={avatarImageUrl}
          unoptimized={shouldBypassFanletterImageOptimization(avatarImageUrl)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="text-3xl font-black">{initial}</span>
        </div>
      )}
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.055] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[0.58rem] font-black uppercase tracking-[0.1em] text-white/36">
          {label}
        </p>
        <span className="text-[#44f26e]">{icon}</span>
      </div>
      <p className="mt-2 truncate text-xl font-black leading-none text-white">
        {value}
      </p>
    </div>
  );
}

function ReportPreviewCard({
  copy,
  currentHref,
  isSourceReport,
  locale,
  referralCode,
  report,
}: {
  copy: ReturnType<typeof getCopy>;
  currentHref: string;
  isSourceReport?: boolean;
  locale: Locale;
  referralCode: string | null;
  report: FanletterNewsReportDocument;
}) {
  const imageUrls = getFanletterNewsReportPreviewImageUrls(report);
  const title = getFanletterNewsArticleDisplayTitle(report.title);
  const href = getReportHref({ currentHref, locale, referralCode, report });

  return (
    <article
      className={`overflow-hidden rounded-[1.15rem] border ${
        isSourceReport
          ? "border-[#44f26e]/42 bg-[#06140a]"
          : "border-white/10 bg-white/[0.055]"
      }`}
    >
      <Link className="grid grid-cols-[7rem_minmax(0,1fr)] !text-white" href={href}>
        <div className="relative aspect-[9/14] overflow-hidden bg-white/8">
          {imageUrls.length > 0 ? (
            <FanletterNewsCharacterProfileImageSlider
              alt={title}
              imageClassName="h-full w-full object-cover"
              imageUrls={imageUrls}
              intervalMs={2200}
              pauseOnInteraction={false}
              sizes="7rem"
              transitionMode="css"
              unoptimizedImageUrls={getUnoptimizedImageUrls(imageUrls)}
            />
          ) : (
            <FileText className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-[#44f26e]" />
          )}
        </div>
        <div className="min-w-0 self-center p-3">
          <p className="text-[0.6rem] font-black uppercase tracking-[0.12em] text-[#44f26e]">
            {isSourceReport ? copy.sourceReport.eyebrow : copy.latestReports}
          </p>
          <h2 className="mt-1 line-clamp-3 text-lg font-black leading-tight [word-break:keep-all]">
            {title}
          </h2>
          <p className="mt-2 truncate text-[0.68rem] font-bold text-white/42">
            {formatDate(getReportDate(report), locale)} · {report.creatorName}
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 text-[0.72rem] font-black text-[#9bffad]">
            {copy.openReport}
            <ChevronRight className="size-3.5" />
          </span>
        </div>
      </Link>
    </article>
  );
}

function CharacterCoverageCard({
  character,
  copy,
  currentHref,
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
  currentHref: string;
  locale: Locale;
  referralCode: string | null;
}) {
  const href = getCharacterHref({
    currentHref,
    locale,
    referralCode,
    referralCodeForCharacter: character.creatorReferralCode,
  });
  const content = (
    <>
      <span className="relative block aspect-[4/3] overflow-hidden rounded-t-[1rem] bg-white/8">
        {character.coverImageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover"
            fill
            sizes="11rem"
            src={character.coverImageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(
              character.coverImageUrl,
            )}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[#44f26e]">
            <Sparkles className="size-8" />
          </span>
        )}
      </span>
      <span className="block p-3">
        <span className="line-clamp-1 text-base font-black text-white">
          {character.creatorName}
        </span>
        <span className="mt-1 block text-xs font-bold text-white/44">
          {formatNumber(character.reportCount, locale)} {copy.news}
        </span>
        <span className="mt-2 inline-flex items-center gap-1.5 text-[0.68rem] font-black text-[#9bffad]">
          {copy.openCharacter}
          <ChevronRight className="size-3.5" />
        </span>
      </span>
    </>
  );

  if (!href) {
    return (
      <div className="min-w-0 overflow-hidden rounded-[1rem] border border-white/10 bg-white/[0.055]">
        {content}
      </div>
    );
  }

  return (
    <Link
      className="group min-w-0 overflow-hidden rounded-[1rem] border border-white/10 bg-white/[0.055] !text-white transition hover:border-[#44f26e]/42 hover:bg-[#12301a]/42"
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
      title: `${copy.metaTitle} | AIAVpark News`,
    };
  }

  const profile = await getFanletterNewsReporterProfile({
    reporterReferralCode: normalizedReporterReferralCode,
  });
  const reporterName =
    profile?.displayName ??
    (locale === "ko"
      ? `${normalizedReporterReferralCode} 팬 기자`
      : `Fan reporter ${normalizedReporterReferralCode}`);

  return {
    title: `${reporterName} | ${copy.metaTitle}`,
    description: copy.metaDescription,
  };
}

export default async function FanletterNewsCutReporterChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; reporterReferralCode: string }>;
  searchParams: Promise<FanletterNewsCutReporterChannelSearchParams>;
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
  const cutsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/cuts`,
    referralCode,
  );
  const returnHref =
    normalizeFanletterReturnToPath(query.returnTo, locale) ?? cutsHref;
  const cutSlot = readFirstSearchParam(query.cut) ?? null;
  const sourceReportId = readFirstSearchParam(query.sourceReportId) ?? null;
  const currentHref = getCurrentHref({
    cutSlot,
    locale,
    referralCode,
    reporterReferralCode: normalizedReporterReferralCode,
    returnHref,
    sourceReportId,
  });
  const [profile, channelData, incentiveStats] = await Promise.all([
    getFanletterNewsReporterProfile({
      reporterReferralCode: normalizedReporterReferralCode,
    }),
    getFanletterNewsReportsForReporterChannel({
      limit: 24,
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
  const reporterName =
    profile?.displayName ??
    publicReports[0]?.reporterName ??
    (locale === "ko"
      ? `${normalizedReporterReferralCode} 팬 기자`
      : `Fan reporter ${normalizedReporterReferralCode}`);
  const reporterAvatarImageUrl =
    profile?.avatarImageUrl ?? publicReports[0]?.reporterAvatarImageUrl ?? null;
  const sourceReport =
    sourceReportId
      ? publicReports.find((report) => report.reportId === sourceReportId) ?? null
      : null;
  const latestPublicReports = (
    sourceReport
      ? publicReports.filter((report) => report.reportId !== sourceReport.reportId)
      : publicReports
  ).slice(0, 12);
  const reporterTrust = getFanletterNewsReporterTrustProfile({
    latestReportAt: profile?.latestReportAt ?? channelData.latestReportAt,
    paidUnlockPurchaseCount: incentiveStats.overview.paidUnlockPurchaseCount,
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
  const metricItems = [
    {
      icon: <FileText className="size-4" />,
      label: copy.news,
      value: formatNumber(channelData.reportCount, locale),
    },
    {
      icon: <Sparkles className="size-4" />,
      label: copy.characters,
      value: formatNumber(channelData.characters.length, locale),
    },
    {
      icon: <Newspaper className="size-4" />,
      label: copy.stats.public,
      value: formatNumber(channelData.publicCount, locale),
    },
    {
      icon: <UsersRound className="size-4" />,
      label: copy.stats.votes,
      value: formatNumber(incentiveStats.overview.sourceRevealVoteCount, locale),
    },
  ];
  const secondaryMetricItems = [
    {
      icon: <Trophy className="size-4" />,
      label: copy.stats.unlocks,
      value: formatNumber(
        incentiveStats.overview.sourceRevealUnlockContributionCount,
        locale,
      ),
    },
    {
      icon: <HeartHandshake className="size-4" />,
      label: copy.stats.purchases,
      value: formatNumber(incentiveStats.overview.paidUnlockPurchaseCount, locale),
    },
    {
      icon: <ShieldCheck className="size-4" />,
      label: copy.stats.rewards,
      value: `${formatNumber(incentiveStats.overview.rewardPoints, locale)}P`,
    },
  ];

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
              <PenLine className="size-3.5" />
              {copy.channelEyebrow}
            </span>
          </div>
        </header>

        <section className="px-4 pb-[calc(6.8rem+env(safe-area-inset-bottom))] pt-5">
          <section className="rounded-[1.5rem] border border-[#44f26e]/24 bg-[#07110a] p-4">
            <div className="flex items-start gap-4">
              <ReporterAvatar
                avatarImageUrl={reporterAvatarImageUrl}
                name={reporterName}
                reporterReferralCode={normalizedReporterReferralCode}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
                  {copy.channelEyebrow}
                </p>
                <h1 className="mt-2 break-words text-4xl font-black leading-none tracking-normal [word-break:keep-all]">
                  {reporterName}
                </h1>
                <p className="mt-2 truncate text-[0.72rem] font-black uppercase tracking-[0.1em] text-white/42">
                  @{normalizedReporterReferralCode}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-white/62 [word-break:keep-all]">
              {copy.heroBody}
            </p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/28 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#44f26e]">
                  {copy.trust.title}
                </p>
                <span className="rounded-full bg-[#44f26e] px-2.5 py-1 text-[0.62rem] font-black text-black">
                  {copy.trust.score(formatNumber(reporterTrust.score, locale))}
                </span>
              </div>
              <h2 className="mt-2 text-2xl font-black">{trustLevelLabel}</h2>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/12">
                <div
                  className="h-full rounded-full bg-[#44f26e]"
                  style={{ width: `${reporterTrust.progressPercent}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-white/46">
                {nextTrustLabel}
              </p>
            </div>
          </section>

          {sourceReport ? (
            <section className="mt-4 rounded-[1.25rem] border border-[#44f26e]/22 bg-[#06140a] p-3">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#44f26e]">
                {copy.sourceReport.eyebrow}
              </p>
              <h2 className="mt-1 text-xl font-black">
                {copy.sourceReport.title(cutSlot ?? "1")}
              </h2>
              <p className="mt-1 text-xs font-semibold leading-5 text-white/52">
                {copy.sourceReport.body}
              </p>
              <div className="mt-3">
                <ReportPreviewCard
                  copy={copy}
                  currentHref={currentHref}
                  isSourceReport
                  locale={locale}
                  referralCode={referralCode}
                  report={sourceReport}
                />
              </div>
            </section>
          ) : null}

          <section className="mt-4 grid grid-cols-2 gap-2">
            {metricItems.map((item) => (
              <MetricTile
                icon={item.icon}
                key={item.label}
                label={item.label}
                value={item.value}
              />
            ))}
          </section>

          <section className="mt-3 grid grid-cols-3 gap-2">
            {secondaryMetricItems.map((item) => (
              <MetricTile
                icon={item.icon}
                key={item.label}
                label={item.label}
                value={item.value}
              />
            ))}
          </section>

          <section className="mt-5">
            <div className="mb-3">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#44f26e]">
                Reporter Cut Flow
              </p>
              <h2 className="mt-1 text-2xl font-black">
                {copy.latestReports}
              </h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-white/52 [word-break:keep-all]">
                {copy.latestReportsBody}
              </p>
            </div>
            {latestPublicReports.length > 0 ? (
              <div className="space-y-3">
                {latestPublicReports.map((report) => (
                  <ReportPreviewCard
                    copy={copy}
                    currentHref={currentHref}
                    key={report.reportId}
                    locale={locale}
                    referralCode={referralCode}
                    report={report}
                  />
                ))}
              </div>
            ) : (
              <section className="rounded-[1.25rem] border border-white/12 bg-white/[0.06] p-6 text-center">
                <UserRound className="mx-auto size-10 text-[#44f26e]" />
                <h2 className="mt-3 text-xl font-black">{copy.emptyTitle}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/58">
                  {copy.emptyBody}
                </p>
              </section>
            )}
          </section>

          <section className="mt-6">
            <div className="mb-3">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-[#44f26e]">
                AI Character Coverage
              </p>
              <h2 className="mt-1 text-2xl font-black">
                {copy.characterCoverage}
              </h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-white/52 [word-break:keep-all]">
                {copy.characterCoverageBody}
              </p>
            </div>
            {channelData.characters.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {channelData.characters.map((character) => (
                  <CharacterCoverageCard
                    character={character}
                    copy={copy}
                    currentHref={currentHref}
                    key={character.creatorReferralCode ?? character.creatorName}
                    locale={locale}
                    referralCode={referralCode}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[1rem] border border-white/10 bg-white/[0.055] p-4 text-sm font-semibold text-white/52">
                {copy.noCharacters}
              </div>
            )}
          </section>
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
