import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  CheckCircle2,
  Coins,
  Eye,
  FileText,
  HandHeart,
  Newspaper,
  PenLine,
  Trophy,
  type LucideIcon,
  UsersRound,
  WalletCards,
} from "lucide-react";

import { FanletterNewsReportsSessionBridge } from "@/components/fanletter-news-reports-session-bridge";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  FANLETTER_NEWS_REPORT_SOURCE_REVEAL_UNLOCK_REWARD_POINTS,
  FANLETTER_NEWS_REPORT_SOURCE_REVEAL_VOTE_REWARD_POINTS,
} from "@/lib/fanletter-news-reporter-incentives";
import {
  getFanletterNewsReporterRewardsSummary,
  type FanletterNewsReporterRewardCategory,
  type FanletterNewsReporterRewardLedgerItem,
  type FanletterNewsReporterRewardReportItem,
} from "@/lib/fanletter-news-reporter-rewards";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { readMemberServerSession } from "@/lib/member-server-session";

type FanletterNewsReporterRewardsSearchParams = {
  ref?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        connectBody:
          "리포터 보상 내역을 보려면 FanLetter News 계정 연결이 필요합니다.",
        connectCta: "뉴스 계정 연결",
        connectTitle: "리포터 포인트 리포트는 로그인 후 확인할 수 있습니다.",
        description:
          "FanLetter News 리포터가 받은 보고싶어요 보상, 원본 공개 보너스, 리포트별 성과를 한눈에 확인하는 페이지입니다.",
        emptyLedger:
          "아직 지급된 리포터 포인트가 없습니다. 리포트를 발행하고 공유하면 팬 참여가 보상 내역으로 쌓입니다.",
        emptyReports:
          "발행된 리포트가 없습니다. 원본 브이로그를 빠르게 기사화하면 선점 구간에서 보상 기회를 만들 수 있습니다.",
        heroBody:
          "리포터가 받은 포인트를 원본 공개 참여, 공개 달성 보너스, 리포트별 유입 성과로 나눠 보여줍니다.",
        heroEyebrow: "Reporter Rewards",
        heroTitle: "리포터 포인트 리포트",
        ledgerTitle: "최근 지급 내역",
        newReport: "새 리포트 작성",
        newsHome: "FanLetter News",
        reportDesk: "리포트 관리",
        reportPerformance: "리포트별 성과",
        rewardFlow: "보상 흐름",
        rewardFlowBody:
          "리포트를 빨리 발행하고 SNS로 유입을 만들수록 팬의 원본 공개 참여가 내 리포터 보상으로 연결됩니다.",
        rewardFlowSteps: [
          "원본 브이로그를 리포트로 발행",
          "팬이 보고싶어요로 공개 참여",
          "원본 공개 달성 시 추가 보상",
        ],
        stats: {
          exposure: "노출 신호",
          paidUnlocks: "구매 기여",
          reports: "발행 리포트",
          total: "누적 보상",
          unlocks: "공개 보너스",
          votes: "참여 보상",
        },
        title: "리포터 포인트 리포트 | FanLetter News",
        wallet: "전체 지갑",
      }
    : {
        connectBody:
          "Connect your FanLetter News account to view reporter reward history.",
        connectCta: "Connect news account",
        connectTitle: "Reporter point reports require sign-in.",
        description:
          "A FanLetter News page for reporter point rewards, source-open bonuses, and report-level performance.",
        emptyLedger:
          "No reporter points have been awarded yet. Publish and share reports to turn fan participation into rewards.",
        emptyReports:
          "No reports have been published yet. Early source vlog coverage can create reward opportunities.",
        heroBody:
          "Track reporter points by source-open participation, unlock bonuses, and report-level referral performance.",
        heroEyebrow: "Reporter Rewards",
        heroTitle: "Reporter Point Report",
        ledgerTitle: "Recent payouts",
        newReport: "Create report",
        newsHome: "FanLetter News",
        reportDesk: "Report desk",
        reportPerformance: "Report performance",
        rewardFlow: "Reward flow",
        rewardFlowBody:
          "The earlier a reporter publishes and distributes a report, the more fan source-open participation can be attributed back to that report.",
        rewardFlowSteps: [
          "Publish a report from a source vlog",
          "Fans join source-open participation",
          "Unlock milestone adds bonus rewards",
        ],
        stats: {
          exposure: "Exposure signals",
          paidUnlocks: "Paid assists",
          reports: "Reports",
          total: "Total rewards",
          unlocks: "Unlock bonus",
          votes: "Vote rewards",
        },
        title: "Reporter Point Report | FanLetter News",
        wallet: "Wallet",
      };
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatPoints(value: number, locale: Locale) {
  return `${formatNumber(value, locale)}P`;
}

function formatUsdt(value: number, locale: Locale) {
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value > 0 && value < 1 ? 2 : 0,
  }).format(value)} USDT`;
}

function formatPercent(numerator: number, denominator: number, locale: Locale) {
  if (denominator <= 0 || numerator <= 0) {
    return "0%";
  }

  const value = (numerator / denominator) * 100;

  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: value < 10 ? 1 : 0,
  }).format(value)}%`;
}

function formatDateTime(value: string, locale: Locale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getLedgerLabel(
  category: FanletterNewsReporterRewardCategory,
  locale: Locale,
) {
  if (category === "unlock") {
    return locale === "ko" ? "원본 공개 달성 보너스" : "Source-open bonus";
  }

  return locale === "ko" ? "보고싶어요 참여 보상" : "Want-to-watch reward";
}

function getReportHref(
  locale: Locale,
  reportId: string,
  referralCode: string | null,
) {
  return buildPathWithReferral(
    `/${locale}/fanletter/news/${reportId}`,
    referralCode,
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
    title: copy.title,
    description: copy.description,
    robots: {
      follow: false,
      index: false,
    },
  };
}

export default async function LocalizedFanletterNewsReporterRewardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsReporterRewardsSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const requestedRewardsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reporter/rewards`,
    referralCode,
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    { returnTo: requestedRewardsHref },
  );
  const session = await readMemberServerSession();

  if (!session) {
    return (
      <main className="min-h-screen bg-[#eef1ec] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 text-[#111510] sm:px-6 sm:pb-12 lg:px-8">
        <FanletterNewsReportsSessionBridge
          hasServerSession={false}
          locale={locale}
          serverSessionEmail={null}
          serverSessionWalletAddress={null}
        />
        <section className="mx-auto max-w-3xl border border-black/12 bg-white p-5 shadow-[0_18px_46px_rgba(17,21,16,0.08)] sm:p-8">
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-[#111510] text-[#44f26e]">
            <WalletCards className="size-5" />
          </span>
          <h1 className="mt-4 text-2xl font-black tracking-normal [word-break:keep-all] sm:text-3xl">
            {copy.connectTitle}
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-black/58">
            {copy.connectBody}
          </p>
          <Link
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black !text-white transition hover:bg-black"
            href={connectHref}
          >
            {copy.connectCta}
            <ArrowRight className="size-4 text-[#44f26e]" />
          </Link>
        </section>
      </main>
    );
  }

  const summary = await getFanletterNewsReporterRewardsSummary({
    email: session.email,
    locale,
  });
  const effectiveReferralCode =
    referralCode ?? summary.member?.referralCode ?? null;
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    effectiveReferralCode,
  );
  const myHref = buildPathWithReferral(
    `/${locale}/fanletter/news/my`,
    effectiveReferralCode,
  );
  const newReportHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reports/new`,
    effectiveReferralCode,
  );
  const reportDeskHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reports`,
    effectiveReferralCode,
  );
  const walletHref = setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/wallet/manage`,
      effectiveReferralCode,
    ),
    { returnTo: myHref },
  );
  const overviewViewCount =
    summary.overview.reportViewCount + summary.overview.cutViewCount;
  const statItems = [
    {
      detail:
        locale === "ko"
          ? `${formatNumber(overviewViewCount, locale)}회 조회 · 원본 ${formatPercent(
              summary.overview.sourceOpenClickCount,
              overviewViewCount,
              locale,
            )} · 구매의도 ${formatPercent(
              summary.overview.paidUnlockClickCount,
              overviewViewCount,
              locale,
            )}`
          : `${formatNumber(overviewViewCount, locale)} views · Source ${formatPercent(
              summary.overview.sourceOpenClickCount,
              overviewViewCount,
              locale,
            )} · Paid intent ${formatPercent(
              summary.overview.paidUnlockClickCount,
              overviewViewCount,
              locale,
            )}`,
      icon: Eye,
      label: copy.stats.exposure,
      value: formatNumber(summary.overview.exposureSignalCount, locale),
    },
    {
      detail:
        locale === "ko"
          ? "보고싶어요와 공개 달성 보상 합계"
          : "Vote and unlock rewards combined",
      icon: Trophy,
      label: copy.stats.total,
      value: formatPoints(summary.overview.rewardPoints, locale),
    },
    {
      detail:
        locale === "ko"
          ? `${formatNumber(
              summary.overview.sourceRevealVoteRewardCount,
              locale,
            )}회 지급 x ${FANLETTER_NEWS_REPORT_SOURCE_REVEAL_VOTE_REWARD_POINTS}P`
          : `${formatNumber(
              summary.overview.sourceRevealVoteRewardCount,
              locale,
            )} payouts x ${FANLETTER_NEWS_REPORT_SOURCE_REVEAL_VOTE_REWARD_POINTS}P`,
      icon: HandHeart,
      label: copy.stats.votes,
      value: formatPoints(summary.overview.voteRewardPoints, locale),
    },
    {
      detail:
        locale === "ko"
          ? `${formatNumber(
              summary.overview.sourceRevealUnlockRewardCount,
              locale,
            )}회 지급 x ${FANLETTER_NEWS_REPORT_SOURCE_REVEAL_UNLOCK_REWARD_POINTS}P`
          : `${formatNumber(
              summary.overview.sourceRevealUnlockRewardCount,
              locale,
            )} payouts x ${FANLETTER_NEWS_REPORT_SOURCE_REVEAL_UNLOCK_REWARD_POINTS}P`,
      icon: CheckCircle2,
      label: copy.stats.unlocks,
      value: formatPoints(summary.overview.unlockRewardPoints, locale),
    },
    {
      detail: formatUsdt(summary.overview.paidUnlockRevenueUsdt, locale),
      icon: BadgeDollarSign,
      label: copy.stats.paidUnlocks,
      value: formatNumber(summary.overview.paidUnlockPurchaseCount, locale),
    },
    {
      detail: locale === "ko" ? "공개된 팬 리포트" : "Published fan reports",
      icon: FileText,
      label: copy.stats.reports,
      value: formatNumber(summary.overview.reportCount, locale),
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef1ec] px-3 pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-3 text-[#111510] sm:px-6 sm:pb-12 lg:px-8">
      <FanletterNewsReportsSessionBridge
        hasServerSession
        locale={locale}
        serverReporterProfile={
          summary.member
            ? {
                avatarImageUrl: summary.member.avatarImageUrl,
                displayName: summary.member.displayName,
                referralCode: summary.member.referralCode,
              }
            : null
        }
        serverSessionEmail={session.email}
        serverSessionWalletAddress={session.walletAddress}
      />
      <section className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3 border-b border-black/12 pb-3">
          <Link
            className="inline-flex min-w-0 items-center gap-2 text-sm font-black !text-[#16702e]"
            href={newsHomeHref}
          >
            <ArrowLeft className="size-4 shrink-0" />
            <span className="truncate">{copy.newsHome}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              className="hidden h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-3 text-xs font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0] sm:inline-flex"
              href={walletHref}
            >
              <WalletCards className="size-4 text-[#16702e]" />
              {copy.wallet}
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#111510] px-3 text-xs font-black !text-white transition hover:bg-black"
              href={newReportHref}
            >
              <PenLine className="size-4 text-[#44f26e]" />
              {copy.newReport}
            </Link>
          </div>
        </div>

        <section className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-stretch">
          <div className="border border-black/12 bg-white p-5 shadow-[0_18px_46px_rgba(17,21,16,0.07)] sm:p-7">
            <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
              <Coins className="size-3.5" />
              {copy.heroEyebrow}
            </p>
            <h1 className="mt-4 max-w-3xl text-[2.05rem] font-black leading-[1.06] tracking-normal [word-break:keep-all] sm:text-[3rem]">
              {copy.heroTitle}
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-6 text-black/58 sm:text-base sm:leading-7">
              {copy.heroBody}
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {statItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    className="rounded-lg border border-black/10 bg-[#f6f8f4] p-3"
                    key={item.label}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[0.64rem] font-black uppercase tracking-[0.08em] text-black/44">
                        {item.label}
                      </p>
                      <Icon className="size-4 text-[#16702e]" />
                    </div>
                    <p className="mt-2 text-xl font-black text-[#111510]">
                      {item.value}
                    </p>
                    <p className="mt-1 text-[0.68rem] font-bold leading-4 text-black/42">
                      {item.detail}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="border border-black/12 bg-[#111510] p-5 text-white shadow-[0_18px_46px_rgba(17,21,16,0.16)]">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#44f26e]">
              {copy.rewardFlow}
            </p>
            <h2 className="mt-3 text-2xl font-black leading-tight tracking-normal [word-break:keep-all]">
              {formatPoints(summary.overview.rewardPoints, locale)}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-white/62">
              {copy.rewardFlowBody}
            </p>
            <div className="mt-5 grid gap-2">
              {copy.rewardFlowSteps.map((step, index) => (
                <div
                  className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.06] p-3"
                  key={step}
                >
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[#44f26e] text-xs font-black text-[#111510]">
                    {index + 1}
                  </span>
                  <p className="text-sm font-black leading-5 text-white">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <section className="border border-black/12 bg-white p-4 shadow-[0_16px_42px_rgba(17,21,16,0.08)] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black tracking-normal text-[#111510]">
                {copy.reportPerformance}
              </h2>
              <Link
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-black/10 px-3 text-xs font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                href={reportDeskHref}
              >
                {copy.reportDesk}
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
            {summary.reports.length > 0 ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {summary.reports.slice(0, 8).map((report, index) => (
                  <ReportPerformanceCard
                    key={report.reportId}
                    locale={locale}
                    priority={index === 0}
                    referralCode={effectiveReferralCode}
                    report={report}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                body={copy.emptyReports}
                cta={copy.newReport}
                href={newReportHref}
                icon={Newspaper}
              />
            )}
          </section>

          <section className="border border-black/12 bg-white p-4 shadow-[0_16px_42px_rgba(17,21,16,0.08)] sm:p-5">
            <h2 className="text-xl font-black tracking-normal text-[#111510]">
              {copy.ledgerTitle}
            </h2>
            {summary.ledger.length > 0 ? (
              <div className="mt-4 grid gap-2">
                {summary.ledger.slice(0, 12).map((item) => (
                  <LedgerItem
                    item={item}
                    key={item.ledgerEntryId}
                    locale={locale}
                    referralCode={effectiveReferralCode}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                body={copy.emptyLedger}
                cta={copy.newReport}
                href={newReportHref}
                icon={UsersRound}
              />
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function EmptyState({
  body,
  cta,
  href,
  icon: Icon,
}: {
  body: string;
  cta: string;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <div className="mt-4 rounded-lg border border-black/10 bg-[#f6f8f4] p-5">
      <span className="inline-flex size-10 items-center justify-center rounded-full bg-white text-[#16702e]">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-sm font-bold leading-6 text-black/58">{body}</p>
      <Link
        className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black !text-white transition hover:bg-black"
        href={href}
      >
        {cta}
        <ArrowRight className="size-4 text-[#44f26e]" />
      </Link>
    </div>
  );
}

function ReportPerformanceCard({
  locale,
  priority = false,
  referralCode,
  report,
}: {
  locale: Locale;
  priority?: boolean;
  referralCode: string | null;
  report: FanletterNewsReporterRewardReportItem;
}) {
  const reportHref = getReportHref(locale, report.reportId, referralCode);
  const dateLabel = formatDateTime(report.publishedAt, locale);
  const viewCount = report.reportViewCount + report.cutViewCount;

  return (
    <Link
      className="group grid gap-3 rounded-lg border border-black/10 bg-[#fbfcf9] p-3 !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#f0fff2]"
      href={reportHref}
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-[#111510]">
        {report.coverImageUrl ? (
          <Image
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            fill
            loading={priority ? "eager" : "lazy"}
            sizes="(min-width: 768px) 320px, 100vw"
            src={report.coverImageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(
              report.coverImageUrl,
            )}
          />
        ) : (
          <Newspaper className="absolute inset-0 m-auto size-10 text-[#44f26e]" />
        )}
        <span className="absolute left-2 top-2 rounded-full bg-[#111510]/86 px-2.5 py-1 text-[0.68rem] font-black text-[#44f26e]">
          {formatPoints(report.rewardPoints, locale)}
        </span>
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-base font-black leading-5 tracking-normal [word-break:keep-all]">
          {report.title}
        </h3>
        <p className="mt-1 truncate text-xs font-bold text-black/46">
          {report.creatorName}
          {dateLabel ? ` · ${dateLabel}` : ""}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <Metric
          label={locale === "ko" ? "조회" : "Views"}
          value={formatNumber(viewCount, locale)}
        />
        <Metric
          label={locale === "ko" ? "원본" : "Source"}
          value={formatNumber(report.sourceOpenClickCount, locale)}
        />
        <Metric
          label={locale === "ko" ? "공유" : "Shares"}
          value={formatNumber(report.shareClickCount, locale)}
        />
        <Metric
          label={locale === "ko" ? "구매의도" : "Paid CTA"}
          value={formatNumber(report.paidUnlockClickCount, locale)}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric
          label={locale === "ko" ? "원본률" : "Source %"}
          value={formatPercent(report.sourceOpenClickCount, viewCount, locale)}
        />
        <Metric
          label={locale === "ko" ? "공유율" : "Share %"}
          value={formatPercent(report.shareClickCount, viewCount, locale)}
        />
        <Metric
          label={locale === "ko" ? "구매의도율" : "Paid CTA %"}
          value={formatPercent(report.paidUnlockClickCount, viewCount, locale)}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric
          label={locale === "ko" ? "참여" : "Votes"}
          value={formatNumber(report.sourceRevealVoteCount, locale)}
        />
        <Metric
          label={locale === "ko" ? "공개" : "Unlocks"}
          value={formatNumber(
            report.sourceRevealUnlockContributionCount,
            locale,
          )}
        />
        <Metric
          label={locale === "ko" ? "구매" : "Paid"}
          value={formatNumber(report.paidUnlockPurchaseCount, locale)}
        />
      </div>
    </Link>
  );
}

function LedgerItem({
  item,
  locale,
  referralCode,
}: {
  item: FanletterNewsReporterRewardLedgerItem;
  locale: Locale;
  referralCode: string | null;
}) {
  const reportHref = getReportHref(locale, item.reportId, referralCode);
  const dateLabel = formatDateTime(item.awardedAt, locale);

  return (
    <Link
      className="grid gap-2 rounded-lg border border-black/10 bg-[#f6f8f4] p-3 !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
      href={reportHref}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-[#16702e]">
            {getLedgerLabel(item.category, locale)}
          </p>
          <p className="mt-1 line-clamp-2 text-sm font-black leading-5 [word-break:keep-all]">
            {item.reportTitle}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#111510] px-2.5 py-1 text-xs font-black text-[#44f26e]">
          +{formatPoints(item.points, locale)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-[0.68rem] font-bold text-black/42">
        <span className="truncate">
          {item.participantLabel ?? (locale === "ko" ? "팬 참여" : "Fan action")}
        </span>
        {dateLabel ? <span className="shrink-0">{dateLabel}</span> : null}
      </div>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-black/10 bg-white px-2 py-2">
      <p className="text-[0.62rem] font-black uppercase tracking-[0.08em] text-black/38">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-[#111510]">{value}</p>
    </div>
  );
}
