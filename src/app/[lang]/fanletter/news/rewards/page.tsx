import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Coins,
  FileText,
  LockKeyhole,
  Newspaper,
  Trophy,
  UsersRound,
  WalletCards,
} from "lucide-react";

import { FanletterNewsReportsSessionBridge } from "@/components/fanletter-news-reports-session-bridge";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  FANLETTER_NEWS_SOURCE_REVEAL_FAN_UNLOCK_REWARD_POINTS,
  FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD,
} from "@/lib/fanletter-news-source-reveal";
import {
  getFanletterNewsMemberRewardsSummary,
  type FanletterNewsMemberFanRewardItem,
  type FanletterNewsMemberFanRewardStatus,
} from "@/lib/fanletter-news-member-rewards";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { readMemberServerSession } from "@/lib/member-server-session";

type FanletterNewsRewardsSearchParams = {
  ref?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        connectBody:
          "팬 참여 보상과 리포터 보상 내역을 보려면 FanLetter News 계정 연결이 필요합니다.",
        connectCta: "뉴스 계정 연결",
        connectTitle: "보상 포인트는 로그인 후 확인할 수 있습니다.",
        description:
          "FanLetter News 회원이 받은 팬 참여 보상과 리포터 보상을 한곳에서 확인하는 페이지입니다.",
        emptyFanRewards:
          "아직 팬 참여 보상이 없습니다. 원본 공개에 참여하면 조건 달성 시 보상이 이곳에 쌓입니다.",
        fanFlowBody: `${FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD}명 중 선착순 참여자가 원본 공개를 달성하면 ${FANLETTER_NEWS_SOURCE_REVEAL_FAN_UNLOCK_REWARD_POINTS}P 보상을 받습니다.`,
        fanFlowTitle: "팬도 원본 공개에 기여하면 보상을 받습니다",
        fanRewardsTitle: "팬 참여 보상 내역",
        heroBody:
          "일반 팬의 원본 공개 참여 보상과 리포터 활동 보상을 합산해 보여줍니다.",
        heroEyebrow: "FanLetter Rewards",
        heroTitle: "보상 포인트",
        newsHome: "FanLetter News",
        reporterDetail: "리포터 보상 상세",
        reporterEmpty:
          "리포터로 리포트를 발행하면 참여 보상과 공개 보너스가 이 영역에 함께 표시됩니다.",
        reporterTitle: "리포터 보상",
        stats: {
          fanParticipation: "원본 공개 참여",
          fanRewards: "팬 보상",
          pending: "조건 대기",
          reporterRewards: "리포터 보상",
          total: "누적 보상",
        },
        status: {
          awarded: "지급 완료",
          closed: "공개 완료",
          pending: "조건 대기",
        },
        title: "보상 포인트 | FanLetter News",
        wallet: "전체 지갑",
      }
    : {
        connectBody:
          "Connect your FanLetter News account to view fan participation and reporter rewards.",
        connectCta: "Connect news account",
        connectTitle: "Reward points require sign-in.",
        description:
          "A FanLetter News page for fan participation rewards and reporter rewards.",
        emptyFanRewards:
          "No fan participation rewards yet. Join source-open participation and rewards will appear here when the condition is met.",
        fanFlowBody: `The first ${FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD} participants can receive ${FANLETTER_NEWS_SOURCE_REVEAL_FAN_UNLOCK_REWARD_POINTS}P when the source opens.`,
        fanFlowTitle: "Fans earn rewards by helping open source vlogs",
        fanRewardsTitle: "Fan participation rewards",
        heroBody:
          "Review source-open fan rewards and reporter activity rewards in one place.",
        heroEyebrow: "FanLetter Rewards",
        heroTitle: "Reward Points",
        newsHome: "FanLetter News",
        reporterDetail: "Reporter reward detail",
        reporterEmpty:
          "Publish reports as a reporter and vote rewards plus source-open bonuses will appear here.",
        reporterTitle: "Reporter rewards",
        stats: {
          fanParticipation: "Source-open joins",
          fanRewards: "Fan rewards",
          pending: "Pending",
          reporterRewards: "Reporter rewards",
          total: "Total rewards",
        },
        status: {
          awarded: "Awarded",
          closed: "Opened",
          pending: "Pending",
        },
        title: "Reward Points | FanLetter News",
        wallet: "Wallet",
      };
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatPoints(value: number, locale: Locale) {
  return `${formatNumber(value, locale)}P`;
}

function formatDateTime(value: string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusClasses(status: FanletterNewsMemberFanRewardStatus) {
  if (status === "awarded") {
    return "border-[#19b84b]/24 bg-[#ecfff0] text-[#126c2c]";
  }

  if (status === "closed") {
    return "border-black/10 bg-[#f2f4ef] text-black/48";
  }

  return "border-[#f2c94c]/34 bg-[#fff8dc] text-[#806300]";
}

function FanRewardCard({
  copy,
  item,
  locale,
}: {
  copy: ReturnType<typeof getCopy>;
  item: FanletterNewsMemberFanRewardItem;
  locale: Locale;
}) {
  const requestedAt = formatDateTime(item.requestedAt, locale);
  const rewardedAt = formatDateTime(item.rewardedAt, locale);
  const progressText = `${formatNumber(
    Math.min(item.sourceRevealCount, item.threshold),
    locale,
  )}/${formatNumber(item.threshold, locale)}`;

  return (
    <article className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_14px_36px_rgba(17,21,16,0.06)] sm:grid-cols-[7.5rem_minmax(0,1fr)]">
      <div className="relative min-h-[7.5rem] bg-[#111510]">
        {item.coverImageUrl ? (
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="8rem"
            src={item.coverImageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(
              item.coverImageUrl,
            )}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#44f26e]">
            <BookOpenCheck className="size-8" />
          </div>
        )}
      </div>
      <div className="min-w-0 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.08em] ${getStatusClasses(
              item.status,
            )}`}
          >
            {item.status === "awarded" ? (
              <CheckCircle2 className="size-3.5" />
            ) : item.status === "closed" ? (
              <LockKeyhole className="size-3.5" />
            ) : (
              <Clock3 className="size-3.5" />
            )}
            {copy.status[item.status]}
          </span>
          <span className="rounded-full border border-black/10 bg-[#f6f8f4] px-2.5 py-1 text-[0.6rem] font-black text-black/52">
            {progressText}
          </span>
        </div>
        <h3 className="mt-2 line-clamp-2 break-words text-base font-black leading-5 [word-break:keep-all] sm:text-lg sm:leading-6">
          {item.title}
        </h3>
        <p className="mt-1 truncate text-xs font-bold text-black/42">
          {item.reportTitle ?? item.creatorName}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/8 pt-3">
          <div className="min-w-0 text-[0.68rem] font-bold leading-5 text-black/42">
            {rewardedAt ?? requestedAt ?? item.contentId}
          </div>
          <span className="shrink-0 text-sm font-black text-[#16702e]">
            {item.points > 0 ? `+${formatPoints(item.points, locale)}` : "0P"}
          </span>
        </div>
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
    title: copy.title,
    description: copy.description,
    robots: {
      follow: false,
      index: false,
    },
  };
}

export default async function LocalizedFanletterNewsRewardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsRewardsSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const rewardsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/rewards`,
    referralCode,
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    { returnTo: rewardsHref },
  );
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const walletHref = buildPathWithReferral(`/${locale}/rewards`, referralCode);
  const reporterRewardsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reporter/rewards`,
    referralCode,
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
            <Coins className="size-5" />
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

  const summary = await getFanletterNewsMemberRewardsSummary({
    email: session.email,
    locale,
  });
  const statItems = [
    {
      icon: Trophy,
      label: copy.stats.total,
      value: formatPoints(summary.overview.totalRewardPoints, locale),
    },
    {
      icon: UsersRound,
      label: copy.stats.fanParticipation,
      value: formatNumber(summary.overview.fanParticipationCount, locale),
    },
    {
      icon: Coins,
      label: copy.stats.fanRewards,
      value: formatPoints(summary.overview.fanRewardPoints, locale),
    },
    {
      icon: FileText,
      label: copy.stats.reporterRewards,
      value: formatPoints(summary.overview.reporterRewardPoints, locale),
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef1ec] px-4 pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-4 text-[#111510] sm:px-6 sm:pb-12 lg:px-8">
      <FanletterNewsReportsSessionBridge
        hasServerSession
        locale={locale}
        serverSessionEmail={session.email}
        serverSessionWalletAddress={session.walletAddress}
      />
      <section className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3 border-b border-black/12 pb-3">
          <Link
            className="inline-flex items-center gap-2 text-sm font-black !text-[#16702e]"
            href={newsHomeHref}
          >
            <Newspaper className="size-4" />
            {copy.newsHome}
          </Link>
          <Link
            className="hidden h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-3 text-xs font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0] sm:inline-flex"
            href={walletHref}
          >
            <WalletCards className="size-4 text-[#16702e]" />
            {copy.wallet}
          </Link>
        </div>

        <section className="mt-5 overflow-hidden border border-black/12 bg-[#111510] text-white shadow-[0_22px_64px_rgba(17,21,16,0.18)]">
          <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#44f26e]">
                <Coins className="size-4" />
                {copy.heroEyebrow}
              </p>
              <h1 className="mt-4 max-w-3xl text-[2.25rem] font-black leading-[1.04] tracking-normal [word-break:keep-all] sm:text-[3.25rem]">
                {copy.heroTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/64 sm:text-base sm:leading-7">
                {copy.heroBody}
              </p>
            </div>
            <div className="rounded-lg border border-[#44f26e]/24 bg-[#44f26e]/10 p-4">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#9bffad]">
                {copy.fanFlowTitle}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/76">
                {copy.fanFlowBody}
              </p>
            </div>
          </div>
          <div className="grid border-t border-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {statItems.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  className="min-w-0 border-b border-white/10 p-4 sm:border-r lg:border-b-0"
                  key={item.label}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-[0.62rem] font-black uppercase tracking-[0.12em] text-white/42">
                      {item.label}
                    </p>
                    <Icon className="size-4 shrink-0 text-[#44f26e]" />
                  </div>
                  <p className="mt-2 truncate text-2xl font-black text-white">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="min-w-0">
            <div className="mb-3 flex items-end justify-between gap-3 border-b-2 border-[#111510] pb-3">
              <div>
                <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
                  Fan Rewards
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-normal">
                  {copy.fanRewardsTitle}
                </h2>
              </div>
              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-[#16702e]">
                {formatNumber(summary.overview.pendingFanRewardCount, locale)}{" "}
                {copy.stats.pending}
              </span>
            </div>
            {summary.fanRewards.length > 0 ? (
              <div className="grid gap-3">
                {summary.fanRewards.map((item) => (
                  <FanRewardCard
                    copy={copy}
                    item={item}
                    key={item.contentId}
                    locale={locale}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-black/10 bg-white p-5 text-sm font-semibold leading-6 text-black/54">
                {copy.emptyFanRewards}
              </p>
            )}
          </section>

          <aside className="h-fit rounded-lg border border-black/12 bg-white p-4 shadow-[0_16px_42px_rgba(17,21,16,0.08)] sm:p-5 lg:sticky lg:top-6">
            <p className="inline-flex items-center gap-2 text-[0.66rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
              <Trophy className="size-4" />
              Reporter
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-normal">
              {copy.reporterTitle}
            </h2>
            {summary.reporterRewards.member ? (
              <>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-black/10 bg-[#f6f8f4] p-3">
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.08em] text-black/42">
                      {copy.stats.reporterRewards}
                    </p>
                    <p className="mt-1 text-lg font-black">
                      {formatPoints(
                        summary.reporterRewards.overview.rewardPoints,
                        locale,
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg border border-black/10 bg-[#f6f8f4] p-3">
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.08em] text-black/42">
                      {locale === "ko" ? "리포트" : "Reports"}
                    </p>
                    <p className="mt-1 text-lg font-black">
                      {formatNumber(
                        summary.reporterRewards.overview.reportCount,
                        locale,
                      )}
                    </p>
                  </div>
                </div>
                <Link
                  className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#111510] px-4 text-sm font-black !text-white transition hover:bg-black"
                  href={reporterRewardsHref}
                >
                  {copy.reporterDetail}
                  <ArrowRight className="size-4 text-[#44f26e]" />
                </Link>
              </>
            ) : (
              <p className="mt-3 rounded-lg border border-black/10 bg-[#f6f8f4] p-4 text-sm font-semibold leading-6 text-black/56">
                {copy.reporterEmpty}
              </p>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
