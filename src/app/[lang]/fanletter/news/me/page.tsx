import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  CircleUserRound,
  Clapperboard,
  Home,
  Newspaper,
  PenLine,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  WalletCards,
} from "lucide-react";

import { FanletterNewsReportsSessionBridge } from "@/components/fanletter-news-reports-session-bridge";
import { FanletterNewsRolePreferenceControl } from "@/components/fanletter-news-role-preference-control";
import { getCreatorStudioPostsForMember } from "@/lib/content-service";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import { getFanletterNewsMemberRewardsSummary } from "@/lib/fanletter-news-member-rewards";
import { getFanletterNewsReportsForMember } from "@/lib/fanletter-news-report-service";
import {
  getFanletterNewsVlogManageHref,
  getFanletterNewsVlogStartHref,
} from "@/lib/fanletter-news-vlog-routing";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { readMemberServerSession } from "@/lib/member-server-session";

type FanletterNewsMeSearchParams = {
  ref?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        connectBody:
          "마이 전용 페이지에서 구매함, 리포트, 브이로그 제작으로 바로 이동하려면 뉴스 계정 연결이 필요합니다.",
        connectCta: "뉴스 계정 연결",
        connectTitle: "마이 페이지는 로그인 후 사용할 수 있습니다.",
        description:
          "AIAVpark News 탐색 메뉴에서 들어오는 마이 전용 모바일 페이지입니다.",
        heroBody:
          "소비자로 계속 보거나, 팬 리포터와 브이로거 작업으로 바로 전환합니다.",
        heroEyebrow: "AIAVpark News My",
        heroTitle: "마이",
        memberFallback: "AIAVpark 회원",
        primaryActions: {
          continueFeed: "컷 피드 계속 보기",
          createReport: "리포트 작성",
          createVlog: "새 브이로그",
          purchases: "구매함",
        },
        secondaryActions: {
          characters: "AI 캐릭터",
          fullHub: "상세 뉴스 허브",
          reportRewards: "보상 포인트",
          vlogsManage: "내 브이로그 관리",
          wallet: "지갑 관리",
        },
        stats: {
          purchases: "구매 기여",
          reports: "리포트",
          rewards: "포인트",
          votes: "참여",
          vlogs: "브이로그",
        },
        title: "마이 | AIAVpark News",
      }
    : {
        connectBody:
          "Connect your News account to open purchases, reports, and vlog creation from the My page.",
        connectCta: "Connect news account",
        connectTitle: "My page requires sign-in.",
        description:
          "A dedicated mobile My page opened from the AIAVpark News explore menu.",
        heroBody:
          "Keep consuming the feed, or switch directly into fan reporter and vlogger work.",
        heroEyebrow: "AIAVpark News My",
        heroTitle: "My",
        memberFallback: "AIAVpark member",
        primaryActions: {
          continueFeed: "Continue cut feed",
          createReport: "Write report",
          createVlog: "New vlog",
          purchases: "Purchases",
        },
        secondaryActions: {
          characters: "AI Characters",
          fullHub: "Full news hub",
          reportRewards: "Reward points",
          vlogsManage: "Manage vlogs",
          wallet: "Wallet",
        },
        stats: {
          purchases: "Purchase assists",
          reports: "Reports",
          rewards: "Points",
          votes: "Joins",
          vlogs: "Vlogs",
        },
        title: "My | AIAVpark News",
      };
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

async function readCreatorVlogData(email: string, locale: Locale) {
  try {
    return await getCreatorStudioPostsForMember(email, {
      locale,
      media: "video",
      page: 1,
      pageSize: 1,
      status: "all",
    });
  } catch {
    return null;
  }
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
    description: copy.description,
    robots: {
      follow: false,
      index: false,
    },
    title: copy.title,
  };
}

export default async function LocalizedFanletterNewsMePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsMeSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const meHref = buildPathWithReferral(
    `/${locale}/fanletter/news/me`,
    referralCode,
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    { returnTo: meHref },
  );
  const session = await readMemberServerSession();

  if (!session) {
    return (
      <main className="min-h-screen bg-[#050706] px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 text-white">
        <FanletterNewsReportsSessionBridge
          hasServerSession={false}
          locale={locale}
          serverSessionEmail={null}
          serverSessionWalletAddress={null}
        />
        <section className="mx-auto max-w-md rounded-2xl border border-white/12 bg-white/[0.06] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-[#44f26e] text-[#111510]">
            <UserRound className="size-6" />
          </span>
          <h1 className="mt-4 text-2xl font-black tracking-normal [word-break:keep-all]">
            {copy.connectTitle}
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/62 [word-break:keep-all]">
            {copy.connectBody}
          </p>
          <Link
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-black !text-[#111510]"
            href={connectHref}
          >
            {copy.connectCta}
            <ArrowRight className="size-4" />
          </Link>
        </section>
      </main>
    );
  }

  const [reporterData, creatorData, rewardSummary] = await Promise.all([
    getFanletterNewsReportsForMember({
      email: session.email,
      limit: 1,
      locale,
    }),
    readCreatorVlogData(session.email, locale),
    getFanletterNewsMemberRewardsSummary({
      email: session.email,
      locale,
    }),
  ]);
  const effectiveReferralCode =
    referralCode ??
    reporterData.member?.referralCode ??
    creatorData?.member.referralCode ??
    null;
  const cutsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/cuts`,
    effectiveReferralCode,
  );
  const fullHubHref = buildPathWithReferral(
    `/${locale}/fanletter/news/my`,
    effectiveReferralCode,
  );
  const reportNewHref = buildPathWithReferral(
    `/${locale}/fanletter/news/reports/new`,
    effectiveReferralCode,
  );
  const purchasesHref = buildPathWithReferral(
    `/${locale}/fanletter/news/purchases`,
    effectiveReferralCode,
  );
  const charactersHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters`,
    effectiveReferralCode,
  );
  const rewardsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/rewards`,
    effectiveReferralCode,
  );
  const walletHref = setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/wallet/manage`,
      effectiveReferralCode,
    ),
    { returnTo: fullHubHref },
  );
  const vlogsManageHref = getFanletterNewsVlogManageHref({
    locale,
    referralCode: effectiveReferralCode,
  });
  const vlogsNewHref = getFanletterNewsVlogStartHref({
    locale,
    referralCode: effectiveReferralCode,
    returnToHref: vlogsManageHref,
  });
  const displayName =
    reporterData.member?.displayName ??
    creatorData?.profile.displayName ??
    copy.memberFallback;
  const avatarImageUrl =
    reporterData.member?.avatarImageUrl ??
    creatorData?.profile.avatarImageUrl ??
    null;
  const reportCount = reporterData.maturityCounts.all;
  const vlogCount = creatorData?.summary.all ?? 0;
  const rewardOverview = rewardSummary.overview;
  const reporterRewardOverview = rewardSummary.reporterRewards.overview;
  const statItems = [
    {
      label: copy.stats.reports,
      value: formatNumber(reportCount, locale),
    },
    {
      label: copy.stats.vlogs,
      value: formatNumber(vlogCount, locale),
    },
    {
      label: copy.stats.votes,
      value: formatNumber(rewardOverview.fanParticipationCount, locale),
    },
    {
      label: copy.stats.purchases,
      value: formatNumber(
        reporterRewardOverview.paidUnlockPurchaseCount,
        locale,
      ),
    },
    {
      label: copy.stats.rewards,
      value: `${formatNumber(rewardOverview.totalRewardPoints, locale)}P`,
    },
  ];
  const primaryActions = [
    {
      href: cutsHref,
      icon: Home,
      label: copy.primaryActions.continueFeed,
    },
    {
      href: reportNewHref,
      icon: PenLine,
      label: copy.primaryActions.createReport,
    },
    {
      href: vlogsNewHref,
      icon: Clapperboard,
      label: copy.primaryActions.createVlog,
    },
    {
      href: purchasesHref,
      icon: BookOpenCheck,
      label: copy.primaryActions.purchases,
    },
  ];
  const secondaryActions = [
    {
      href: vlogsManageHref,
      icon: Clapperboard,
      label: copy.secondaryActions.vlogsManage,
    },
    {
      href: rewardsHref,
      icon: Trophy,
      label: copy.secondaryActions.reportRewards,
    },
    {
      href: charactersHref,
      icon: Sparkles,
      label: copy.secondaryActions.characters,
    },
    {
      href: walletHref,
      icon: WalletCards,
      label: copy.secondaryActions.wallet,
    },
    {
      href: fullHubHref,
      icon: Newspaper,
      label: copy.secondaryActions.fullHub,
    },
  ];

  return (
    <main className="min-h-screen bg-[#050706] px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 text-white">
      <FanletterNewsReportsSessionBridge
        hasServerSession
        locale={locale}
        serverReporterProfile={
          reporterData.member
            ? {
                avatarImageUrl: reporterData.member.avatarImageUrl,
                displayName: reporterData.member.displayName,
                referralCode: reporterData.member.referralCode,
              }
            : null
        }
        serverSessionEmail={session.email}
        serverSessionWalletAddress={session.walletAddress}
        serverVloggerProfile={
          creatorData?.profile
            ? {
                avatarImageUrl:
                  creatorData.profile.avatarImageUrl ??
                  creatorData.profile.avatarImageSet[0]?.url ??
                  null,
                displayName:
                  creatorData.profile.characterPersona?.name ??
                  creatorData.profile.displayName,
                referralCode: creatorData.profile.referralCode,
              }
            : null
        }
      />
      <section className="mx-auto max-w-md">
        <div className="rounded-2xl border border-[#44f26e]/24 bg-[#07110a] p-4 shadow-[0_18px_46px_rgba(0,0,0,0.22)]">
          <div className="flex items-center gap-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-full border border-white/12 bg-white/8">
              {avatarImageUrl ? (
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  sizes="64px"
                  src={avatarImageUrl}
                  unoptimized={shouldBypassFanletterImageOptimization(
                    avatarImageUrl,
                  )}
                />
              ) : (
                <CircleUserRound className="absolute inset-0 m-auto size-8 text-[#44f26e]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#44f26e]">
                <ShieldCheck className="size-3.5" />
                {copy.heroEyebrow}
              </p>
              <h1 className="mt-1 truncate text-3xl font-black tracking-normal">
                {copy.heroTitle}
              </h1>
              <p className="mt-1 truncate text-sm font-bold text-white/58">
                {displayName}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold leading-6 text-white/64 [word-break:keep-all]">
            {copy.heroBody}
          </p>
          <div className="mt-4 grid grid-cols-5 gap-1.5">
            {statItems.map((item) => (
              <div
                className="min-w-0 rounded-xl border border-white/10 bg-white/[0.06] px-2 py-2 text-center"
                key={item.label}
              >
                <p className="truncate text-[0.56rem] font-black text-white/44">
                  {item.label}
                </p>
                <p className="mt-1 truncate text-[0.78rem] font-black text-white">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <FanletterNewsRolePreferenceControl
            generalHref={fullHubHref}
            locale={locale}
            reporterHref={reportNewHref}
            reporterReportCount={formatNumber(reportCount, locale)}
            variant="dark"
            vloggerHref={vlogsManageHref}
            vloggerVideoCount={formatNumber(vlogCount, locale)}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {primaryActions.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                className="min-h-[5.4rem] rounded-2xl border border-[#44f26e]/24 bg-[#44f26e] p-3 !text-[#111510] shadow-[0_12px_30px_rgba(25,184,75,0.18)]"
                href={item.href}
                key={item.label}
              >
                <Icon className="size-5" />
                <span className="mt-3 block text-base font-black leading-tight [word-break:keep-all]">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-3 grid gap-2">
          {secondaryActions.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                className="inline-flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-black !text-white transition hover:border-[#44f26e]/34 hover:bg-[#44f26e]/10"
                href={item.href}
                key={item.label}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Icon className="size-4 shrink-0 text-[#44f26e]" />
                  <span className="truncate">{item.label}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-white/44" />
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
