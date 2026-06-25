import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Crown,
  Database,
  Link2,
  Sparkles,
} from "lucide-react";

import { FanletterActionGuide } from "@/components/fanletter-action-guide";
import { FanletterPrimaryHeader } from "@/components/fanletter-primary-header";
import { FounderRoleBadge } from "@/components/fanletter-founder-club-v2";
import type { Locale } from "@/lib/i18n";
import {
  fanletterV2Mock,
  getFanletterV2Copy,
  type CreatorUnlockData,
  type MemberPortfolio,
} from "@/mock/fanletterV2";

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(
    value,
  );
}

function getCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      back: "FanLetter 홈",
      creator: "크리에이터 여정",
      creatorBody: "조건을 확인하고 TikTok 채널 연결, 미리보기 출시까지 이어갑니다.",
      creatorCta: "권한 활성화 보기",
      creatorReady: "권한 활성화 준비",
      currentCondition: "지금 필요한 조건",
      discover: "AI 스타 발견",
      discoverBody: "성장할 AI 스타를 먼저 선택하면 파운더 참여가 시작됩니다.",
      discoverCta: "AI 스타 발견하기",
      event: "활동 기록",
      eventBody: "참여, 추천, TikTok 연결, 출시 의도가 AgentRank 기록으로 쌓입니다.",
      eventCta: "활동 기록 보기",
      founder: "파운더 네트워크",
      founderBody: "참여 중인 AI 스타 유니버스 안에서 추천 링크와 기여 포인트를 관리합니다.",
      founderCta: "참여 네트워크 보기",
      heroBody:
        "성장은 파운더 참여, 추천 공유, 크리에이터 권한 활성화, 활동 기록으로 이어지는 하나의 흐름입니다.",
      heroEyebrow: "성장 허브",
      heroTitle: "다음 행동을 선택하세요",
      metrics: {
        cp: "기여 포인트",
        creatorStars: "운영 AI 스타",
        creatorProgress: "크리에이터 진행",
        founderNetworks: "참여 네트워크",
        invites: "성공 초대",
        scout: "친구 초대 점수",
      },
      nextAction: {
        discover: "AI 스타 선택",
        founder: "추천 링크 공유",
        creator: "크리에이터 권한 활성화",
      },
      primary: {
        creator: "크리에이터 권한 활성화",
        discover: "AI 스타 발견하기",
        founder: "추천 링크 공유하기",
      },
      relationTitle: "내 성장 상태",
      result: "활동 결과",
      routeLabel: "FanLetter / 성장",
      steps: ["발견", "파운더", "추천", "활동 기록", "크리에이터"],
      tiktokNeeded: "TikTok 연결 필요",
    };
  }

  return {
    back: "FanLetter Home",
    creator: "Creator Journey",
    creatorBody:
      "Review conditions, connect TikTok, and continue into the mock launch flow.",
    creatorCta: "View Permission Activation",
    creatorReady: "Permission activation ready",
    currentCondition: "Current requirement",
    discover: "AI Star Discovery",
    discoverBody: "Choose a growing AI Star first to start Founder participation.",
    discoverCta: "Discover AI Stars",
    event: "Reputation Records",
    eventBody:
      "Joins, referrals, TikTok connections, and launch intents become AgentRank records.",
    eventCta: "View Reputation Records",
    founder: "Founder Network",
    founderBody:
      "Manage referral links and Contribution Points inside the AI Star Universes you joined.",
    founderCta: "View Joined Networks",
    heroBody:
      "Growth connects Founder participation, referral sharing, Creator permission activation, and activity records.",
    heroEyebrow: "Growth Hub",
    heroTitle: "Choose your next action",
    metrics: {
      cp: "Contribution Points",
      creatorStars: "Creator AI Stars",
      creatorProgress: "Creator Progress",
      founderNetworks: "Founder Networks",
      invites: "Successful Invites",
      scout: "Scout Score",
    },
    nextAction: {
      discover: "Choose AI Star",
      founder: "Share referral link",
      creator: "Activate Creator permission",
    },
    primary: {
      creator: "Activate Creator Permission",
      discover: "Discover AI Stars",
      founder: "Share Referral Link",
    },
    relationTitle: "My Growth Status",
    result: "Reputation result",
    routeLabel: "FanLetter / Growth",
    steps: ["Discover", "Founder", "Referral", "Reputation", "Creator"],
    tiktokNeeded: "TikTok connection needed",
  };
}

function getPrimaryAction({
  copy,
  locale,
  portfolio,
  unlock,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  portfolio: MemberPortfolio;
  unlock: CreatorUnlockData;
}) {
  if (portfolio.roles.length === 0) {
    return {
      event: "ai_star_discovered",
      eventLabel: locale === "ko" ? "스타 발견 신호" : "Star discovery signal",
      href: `/${locale}/fanletter/discovery`,
      label: copy.primary.discover,
      next: copy.nextAction.discover,
      status: "discover" as const,
    };
  }

  if (!unlock.unlocked) {
    return {
      event: "creator_unlock_evaluated",
      eventLabel: locale === "ko" ? "크리에이터 권한 평가" : "Creator unlock review",
      href: `/${locale}/fanletter/creator-unlock`,
      label: copy.primary.creator,
      next: copy.nextAction.creator,
      status: "creator" as const,
    };
  }

  return {
    event: "referral_shared",
    eventLabel: locale === "ko" ? "추천 공유 기록" : "Referral shared",
    href: `/${locale}/fanletter/scout`,
    label: copy.primary.founder,
    next: copy.nextAction.founder,
    status: "founder" as const,
  };
}

function getProgressSteps(copy: ReturnType<typeof getCopy>, status: string) {
  return copy.steps.map((label, index) => {
    if (status === "discover") {
      return { label, status: index === 0 ? "active" as const : "next" as const };
    }

    if (status === "creator") {
      return {
        label,
        status:
          index < 3 ? "done" as const : index === 3 ? "active" as const : "next" as const,
      };
    }

    return {
      label,
      status: index < 4 ? "done" as const : "active" as const,
    };
  });
}

function StatusTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-black/10 bg-white px-3 py-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-black/48">
        {label}
      </p>
      <p className="mt-1 truncate text-xl font-semibold text-black">{value}</p>
    </div>
  );
}

function GrowthActionCard({
  body,
  cta,
  href,
  icon,
  title,
}: {
  body: string;
  cta: string;
  href: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Link
      className="group grid min-w-0 gap-3 rounded-lg border border-black/10 bg-white p-4 text-black shadow-[0_16px_42px_rgba(15,23,42,0.045)] transition hover:-translate-y-0.5 hover:border-black/20"
      href={href}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-black text-white">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="break-words text-lg font-semibold leading-tight [word-break:keep-all]">
            {title}
          </h2>
          <p className="mt-1 text-sm font-medium leading-5 text-black/58 [word-break:keep-all]">
            {body}
          </p>
        </div>
      </div>
      <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-[#f7f7f4] px-4 text-sm font-semibold transition group-hover:border-black/25">
        {cta}
        <ArrowRight className="size-4" />
      </span>
    </Link>
  );
}

export function FanletterGrowthPage({
  creatorUnlock,
  isSignedIn,
  locale,
  portfolio,
}: {
  creatorUnlock?: CreatorUnlockData | null;
  isSignedIn?: boolean;
  locale: Locale;
  portfolio?: MemberPortfolio | null;
}) {
  const copy = getCopy(locale);
  const v2Copy = getFanletterV2Copy(locale);
  const resolvedPortfolio: MemberPortfolio =
    portfolio ?? fanletterV2Mock.memberPortfolio;
  const resolvedUnlock: CreatorUnlockData =
    creatorUnlock ?? fanletterV2Mock.creatorUnlock;
  const primaryAction = getPrimaryAction({
    copy,
    locale,
    portfolio: resolvedPortfolio,
    unlock: resolvedUnlock,
  });
  const progressSteps = getProgressSteps(copy, primaryAction.status);
  const creatorProgress = `${resolvedPortfolio.creatorEligibilityPercent}%`;
  const primaryStar = resolvedPortfolio.roles[0];
  const pageTitle = copy.heroTitle;

  return (
    <main className="fanletter-v2-surface min-h-screen bg-[#f7f7f4] px-4 py-5 pb-28 text-black sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <h1 className="sr-only">{pageTitle}</h1>
        <FanletterPrimaryHeader
          current="growth"
          locale={locale}
          referralCode={null}
        />

        <FanletterActionGuide
          className="border-black/10"
          currentLabel={
            primaryStar?.starName
              ? `${primaryStar.starName} · ${primaryStar.role}`
              : copy.routeLabel
          }
          metrics={[
            {
              label: copy.metrics.founderNetworks,
              value: formatNumber(resolvedPortfolio.roles.length, locale),
            },
            {
              label: copy.metrics.creatorStars,
              value: formatNumber(resolvedPortfolio.ownedStars.length, locale),
            },
          ]}
          primaryAction={{
            agentRank: {
              eventType:
                primaryAction.status === "discover"
                  ? "ai_star_discovered"
                  : primaryAction.status === "creator"
                    ? "creator_unlock_evaluated"
                    : "referral_shared",
              intent: "fanletter_growth_primary_action",
              source: "fanletter_home",
              starId: primaryStar?.starId ?? resolvedPortfolio.primaryStarId ?? undefined,
            },
            eventName: "signup_cta_click",
            href: primaryAction.href,
            label: primaryAction.label,
            metadata: {
              creatorStars: resolvedPortfolio.ownedStars.length,
              founderNetworks: resolvedPortfolio.roles.length,
              isSignedIn: Boolean(isSignedIn),
              page: "fanletter_growth",
              primaryAction: primaryAction.status,
              reputationEventType: primaryAction.event,
            },
          }}
          reputationEventLabel={primaryAction.eventLabel}
          secondaryActions={[
            {
              href: `/${locale}/fanletter/agentrank/events?limit=40`,
              label: copy.eventCta,
              metadata: {
                page: "fanletter_growth",
                placement: "growth_secondary_reputation_records",
              },
            },
          ]}
          steps={progressSteps}
          subtitle={copy.heroBody}
          title={primaryAction.next}
        />

        <section className="rounded-lg border border-black/10 bg-black p-4 text-white shadow-[0_20px_60px_rgba(15,23,42,0.16)] sm:p-6">
          <p className="text-sm font-semibold text-white/54">{copy.heroEyebrow}</p>
          <p className="mt-2 text-[2.4rem] font-semibold leading-none tracking-normal [word-break:keep-all] sm:text-[4.2rem]">
            {copy.heroTitle}
          </p>
          <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-white/64 [word-break:keep-all]">
            {copy.heroBody}
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <StatusTile
              label={copy.metrics.scout}
              value={formatNumber(resolvedPortfolio.scoutScore, locale)}
            />
            <StatusTile
              label={copy.metrics.creatorProgress}
              value={creatorProgress}
            />
            <StatusTile
              label={copy.metrics.cp}
              value={formatNumber(resolvedPortfolio.cpBalance, locale)}
            />
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-4">
          <GrowthActionCard
            body={copy.discoverBody}
            cta={copy.discoverCta}
            href={`/${locale}/fanletter/discovery`}
            icon={<Bot className="size-5" />}
            title={copy.discover}
          />
          <GrowthActionCard
            body={copy.founderBody}
            cta={copy.founderCta}
            href={`/${locale}/fanletter/founder-club?view=founder#joined-founder-networks`}
            icon={<Crown className="size-5" />}
            title={copy.founder}
          />
          <GrowthActionCard
            body={copy.creatorBody}
            cta={copy.creatorCta}
            href={`/${locale}/fanletter/creator-unlock`}
            icon={<Sparkles className="size-5" />}
            title={copy.creator}
          />
          <GrowthActionCard
            body={copy.eventBody}
            cta={copy.eventCta}
            href={`/${locale}/fanletter/agentrank/events?limit=40`}
            icon={<Database className="size-5" />}
            title={copy.event}
          />
        </section>

        <section className="grid gap-3 rounded-lg border border-black/10 bg-white p-4 shadow-[0_16px_42px_rgba(15,23,42,0.045)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/42">
                {copy.relationTitle}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-black">
                {resolvedPortfolio.memberName}
              </h2>
            </div>
            <BadgeCheck className="size-5 text-black/54" />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {resolvedPortfolio.roles.slice(0, 4).map((role) => (
              <Link
                className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-black/10 bg-[#f7f7f4] p-3 transition hover:border-black/20"
                href={`/${locale}/fanletter/${encodeURIComponent(role.starId)}/universe`}
                key={`${role.starId}-${role.role}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-black">
                    {role.starName ?? role.universeName ?? role.starId}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-black/48">
                    AI 스타 유니버스
                  </p>
                </div>
                <FounderRoleBadge copy={v2Copy} role={role.role} />
              </Link>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <StatusTile
              label={copy.metrics.invites}
              value={formatNumber(resolvedPortfolio.successfulInvites, locale)}
            />
            <StatusTile
              label={copy.metrics.founderNetworks}
              value={formatNumber(resolvedPortfolio.roles.length, locale)}
            />
            <StatusTile
              label={copy.metrics.creatorStars}
              value={formatNumber(resolvedPortfolio.ownedStars.length, locale)}
            />
          </div>

          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-zinc-800"
            href={`/${locale}/fanletter/scout`}
          >
            <Link2 className="size-4" />
            {primaryAction.status === "discover" ? copy.discoverCta : copy.founderCta}
          </Link>
        </section>
      </div>
    </main>
  );
}
