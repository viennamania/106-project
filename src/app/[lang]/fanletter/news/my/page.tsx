import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  CircleUserRound,
  Clapperboard,
  LayoutDashboard,
  Newspaper,
  PenLine,
  ShieldCheck,
  Sparkles,
  Trophy,
  WalletCards,
} from "lucide-react";

import { FanletterNewsLogoutButton } from "@/components/fanletter-news-logout-button";
import { FanletterNewsReportsSessionBridge } from "@/components/fanletter-news-reports-session-bridge";
import { FanletterNewsRolePreferenceControl } from "@/components/fanletter-news-role-preference-control";
import { getCreatorStudioPostsForMember } from "@/lib/content-service";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import { getFanletterNewsMemberRewardsSummary } from "@/lib/fanletter-news-member-rewards";
import { getFanletterNewsReportsForMember } from "@/lib/fanletter-news-report-service";
import { getFanletterNewsVlogManageHref } from "@/lib/fanletter-news-vlog-routing";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { readMemberServerSession } from "@/lib/member-server-session";

type FanletterNewsMySearchParams = {
  ref?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
      ? {
        connectBody:
          "FanLetter News의 구매함, 팬 리포트, 브이로그 생성 동선을 이어가려면 뉴스 계정 연결이 필요합니다.",
        connectCta: "뉴스 계정 연결",
        connectTitle: "내 뉴스 허브는 로그인 후 사용할 수 있습니다.",
        description:
          "FanLetter News 회원이 구매, 팬 리포트, 브이로그 생성 바로가기를 관리하는 모바일 허브입니다.",
        email: "계정",
        fallbackName: "FanLetter 회원",
        heroBody:
          "뉴스 소비, 팬 리포터 활동, 브이로거 작업을 전환하고 모바일 푸터의 바로가기를 내 역할에 맞춥니다.",
        heroEyebrow: "My FanLetter News",
        heroTitle: "내 뉴스 허브",
        memberStatus: {
          completed: "활성 회원",
          pending_payment: "결제 대기",
        },
        quickActions: {
          characters: "AI 캐릭터",
          createVlog: "브이로그 생성",
          purchases: "구매함",
          reportDesk: "리포트 관리",
          reportNew: "새 리포트 작성",
          reportRewards: "보상 포인트",
          studio: "브이로그 관리",
          wallet: "전체 지갑 관리",
        },
        stats: {
          paidPurchases: "구매 기여",
          reports: "작성 리포트",
          reward: "보상 포인트",
          sourceVotes: "내 참여",
          vlogs: "브이로그",
        },
        title: "내 뉴스 허브 | FanLetter News",
      }
    : {
        connectBody:
          "Connect your News account to continue purchases, fan reports, and vlog creation from one hub.",
        connectCta: "Connect news account",
        connectTitle: "My News hub requires sign-in.",
        description:
          "A mobile hub for FanLetter News members to manage purchases, fan reports, and vlog creation shortcuts.",
        email: "Account",
        fallbackName: "FanLetter member",
        heroBody:
          "Switch between news reader, fan reporter, and vlogger workflows while tailoring the mobile footer shortcut to your role.",
        heroEyebrow: "My FanLetter News",
        heroTitle: "My News Hub",
        memberStatus: {
          completed: "Active member",
          pending_payment: "Payment pending",
        },
        quickActions: {
          characters: "AI Characters",
          createVlog: "Create vlog",
          purchases: "Purchases",
          reportDesk: "Report desk",
          reportNew: "Create report",
          reportRewards: "Reward points",
          studio: "Vlog desk",
          wallet: "Wallet management",
        },
        stats: {
          paidPurchases: "Paid assists",
          reports: "Reports",
          reward: "Reward points",
          sourceVotes: "My joins",
          vlogs: "Vlogs",
        },
        title: "My News Hub | FanLetter News",
      };
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

async function readCreatorHubData(email: string, locale: Locale) {
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
    title: copy.title,
    description: copy.description,
    robots: {
      follow: false,
      index: false,
    },
  };
}

export default async function LocalizedFanletterNewsMyPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsMySearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getCopy(locale);
  const referralCode = readFanletterReferralCode(query.ref);
  const requestedMyHref = buildPathWithReferral(
    `/${locale}/fanletter/news/my`,
    referralCode,
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    { returnTo: requestedMyHref },
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

  const [reporterData, creatorData, rewardSummary] = await Promise.all([
    getFanletterNewsReportsForMember({
      email: session.email,
      limit: 1,
      locale,
    }),
    readCreatorHubData(session.email, locale),
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
  const myHref = buildPathWithReferral(
    `/${locale}/fanletter/news/my`,
    effectiveReferralCode,
  );
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
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
  const reportRewardsHref = buildPathWithReferral(
    `/${locale}/fanletter/news/rewards`,
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
  const newsVlogManageHref = getFanletterNewsVlogManageHref({
    locale,
    referralCode: effectiveReferralCode,
  });
  const createVlogHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/create`, effectiveReferralCode),
    { returnTo: newsVlogManageHref },
  );
  const walletManageHref = setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/wallet/manage`,
      effectiveReferralCode,
    ),
    { returnTo: myHref },
  );
  const reporterRewardOverview = rewardSummary.reporterRewards.overview;
  const displayName =
    reporterData.member?.displayName ??
    creatorData?.profile.displayName ??
    copy.fallbackName;
  const avatarImageUrl =
    reporterData.member?.avatarImageUrl ?? creatorData?.profile.avatarImageUrl ?? null;
  const memberStatus =
    reporterData.member?.status ?? creatorData?.member.status ?? "completed";
  const reportCount = reporterData.maturityCounts.all;
  const vlogCount = creatorData?.summary.all ?? 0;
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
      label: copy.stats.sourceVotes,
      value: formatNumber(rewardSummary.overview.fanParticipationCount, locale),
    },
    {
      label: copy.stats.paidPurchases,
      value: formatNumber(
        reporterRewardOverview.paidUnlockPurchaseCount,
        locale,
      ),
    },
    {
      label: copy.stats.reward,
      value: `${formatNumber(rewardSummary.overview.totalRewardPoints, locale)}P`,
    },
  ];
  const actionItems = [
    {
      href: newReportHref,
      icon: PenLine,
      label: copy.quickActions.reportNew,
      primary: true,
    },
    {
      href: createVlogHref,
      icon: Clapperboard,
      label: copy.quickActions.createVlog,
      primary: true,
    },
    {
      href: reportDeskHref,
      icon: Newspaper,
      label: copy.quickActions.reportDesk,
    },
    {
      href: reportRewardsHref,
      icon: Trophy,
      label: copy.quickActions.reportRewards,
    },
    {
      href: newsVlogManageHref,
      icon: LayoutDashboard,
      label: copy.quickActions.studio,
    },
    {
      href: purchasesHref,
      icon: BookOpenCheck,
      label: copy.quickActions.purchases,
    },
    {
      href: charactersHref,
      icon: Sparkles,
      label: copy.quickActions.characters,
    },
    {
      href: walletManageHref,
      icon: WalletCards,
      label: copy.quickActions.wallet,
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef1ec] px-4 pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-4 text-[#111510] sm:px-6 sm:pb-12 lg:px-8">
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
      <section className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3 border-b border-black/12 pb-3">
          <Link
            className="inline-flex items-center gap-2 text-sm font-black !text-[#16702e]"
            href={newsHomeHref}
          >
            <Newspaper className="size-4" />
            FanLetter News
          </Link>
          <Link
            className="hidden h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-3 text-xs font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0] sm:inline-flex"
            href={walletManageHref}
          >
            <WalletCards className="size-4 text-[#16702e]" />
            {copy.quickActions.wallet}
          </Link>
        </div>

        <div className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-stretch">
          <section className="border border-black/12 bg-white p-5 shadow-[0_18px_46px_rgba(17,21,16,0.07)] sm:p-7">
            <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#16702e]">
              <ShieldCheck className="size-3.5" />
              {copy.heroEyebrow}
            </p>
            <h1 className="mt-4 max-w-3xl text-[2.15rem] font-black leading-[1.06] tracking-normal [word-break:keep-all] sm:text-[3rem]">
              {copy.heroTitle}
            </h1>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
              {statItems.map((item) => (
                <div
                  className="rounded-lg border border-black/10 bg-[#f6f8f4] p-3"
                  key={item.label}
                >
                  <p className="text-[0.66rem] font-black uppercase tracking-[0.08em] text-black/44">
                    {item.label}
                  </p>
                  <p className="mt-1 text-lg font-black text-[#111510]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <aside className="border border-black/12 bg-[#111510] p-5 text-white shadow-[0_18px_46px_rgba(17,21,16,0.16)]">
            <div className="flex items-start gap-3">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-full border border-white/14 bg-white/10">
                {avatarImageUrl ? (
                  <Image
                    alt=""
                    className="h-full w-full object-cover"
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
                <p className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-[#44f26e]">
                  {copy.memberStatus[memberStatus]}
                </p>
                <h2 className="mt-1 truncate text-2xl font-black tracking-normal">
                  {displayName}
                </h2>
                <p className="mt-1 truncate text-xs font-bold text-white/52">
                  {copy.email} · {session.email}
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {statItems.map((item) => (
                <div
                  className="rounded-lg border border-white/10 bg-white/[0.06] p-3"
                  key={item.label}
                >
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.08em] text-white/42">
                    {item.label}
                  </p>
                  <p className="mt-1 text-lg font-black">{item.value}</p>
                </div>
              ))}
            </div>
            <FanletterNewsLogoutButton
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/14 px-5 text-sm font-black text-white/72 transition hover:bg-white hover:text-[#111510]"
              locale={locale}
              postLogoutHref={newsHomeHref}
              walletAddress={session.walletAddress}
            />
          </aside>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <FanletterNewsRolePreferenceControl
            generalHref={myHref}
            locale={locale}
            reporterHref={newReportHref}
            reporterReportCount={formatNumber(reportCount, locale)}
            vloggerHref={newsVlogManageHref}
            vloggerVideoCount={formatNumber(vlogCount, locale)}
          />

          <section className="border border-black/12 bg-white p-4 shadow-[0_16px_42px_rgba(17,21,16,0.08)] sm:p-5">
            <h2 className="text-xl font-black tracking-normal text-[#111510]">
              {locale === "ko" ? "바로가기" : "Shortcuts"}
            </h2>
            <div className="mt-4 grid gap-2">
              {actionItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    className={
                      item.primary
                        ? "inline-flex h-12 items-center justify-between gap-3 rounded-lg bg-[#111510] px-4 text-sm font-black !text-white transition hover:bg-black"
                        : "inline-flex h-12 items-center justify-between gap-3 rounded-lg border border-black/10 bg-[#f6f8f4] px-4 text-sm font-black !text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0]"
                    }
                    href={item.href}
                    key={item.label}
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <Icon
                        className={
                          item.primary ? "size-4 text-[#44f26e]" : "size-4 text-[#16702e]"
                        }
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0" />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
