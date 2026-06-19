"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Crown,
  Database,
  GitBranch,
  ShieldCheck,
  Share2,
  Users,
} from "lucide-react";

import {
  type FanletterCreatorMockLaunch,
  useFanletterCreatorMockLaunches,
} from "@/components/fanletter-creator-mock-launch-state";
import { FanletterActionGuide } from "@/components/fanletter-action-guide";
import { FanletterAgentRankJourneyRail } from "@/components/fanletter-agentrank-journey-rail";
import { FanletterAIStarSocialAccountCard } from "@/components/fanletter-ai-star-social-account-card";
import { FanletterAgentRankCoverageActionNotice } from "@/components/fanletter-agentrank-coverage-action-notice";
import {
  AIStarCard,
  FounderRoleBadge,
  FounderUniversePreview,
  HumanMemberAvatar,
} from "@/components/fanletter-founder-club-v2";
import {
  FanletterFounderJoinLink,
  FanletterFounderMockStatusBanner,
} from "@/components/fanletter-founder-mock-state";
import { FanletterReputationTracker } from "@/components/fanletter-reputation-tracker";
import { FanletterResponsiveActionPanel } from "@/components/fanletter-responsive-action-panel";
import { FanletterStarReferralPanel } from "@/components/fanletter-star-referral-panel";
import { FanletterTerminologyGuide } from "@/components/fanletter-terminology-guide";
import type { AgentRankCoverageActionContext } from "@/lib/agentrank/coverage-action";
import type { AgentRankInteractionSignal } from "@/lib/agentrank/interaction-events";
import type { FanletterAgentRankInvestorSnapshot } from "@/lib/agentrank/ers";
import type { FunnelEventMetadata } from "@/lib/funnel";
import { trackFunnelEvent } from "@/lib/funnel-client";
import {
  buildFanletterAIStarSocialAccountViewModel,
} from "@/mock/fanletter-social-accounts";
import {
  fanletterV2Mock,
  getFanletterV2Copy,
  getFanletterV2LocalizedText,
  type AIStar,
  type MemberPortfolio as MemberPortfolioData,
  type ScoutShareLoopData,
  type SpawnedAIStar,
} from "@/mock/fanletterV2";
import type { Locale } from "@/lib/i18n";

type StarDetailViewerState = "founder" | "guest" | "member";

type StarPrimaryAction = {
  helper: string;
  href: string;
  label: string;
  status: string;
  variant: "connect" | "join" | "share";
};

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(
    value,
  );
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getPortraitInitials(name: string) {
  const normalized = name
    .replace(/[^a-zA-Z0-9가-힣\s]/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  if (!normalized) {
    return "AI";
  }

  const parts = normalized.split(" ");

  return (parts.length > 1 ? parts[0][0] + parts[1][0] : normalized.slice(0, 2))
    .toUpperCase();
}

function toMockSpawnedStar(
  launch: FanletterCreatorMockLaunch,
  sourceStar: AIStar,
): SpawnedAIStar {
  return {
    accentColor: "#a855f7",
    accentSecondary: "#67e8f9",
    createdByMemberName: launch.ownerName,
    createdByUnlock: true,
    founderCount: 0,
    growthPercent: 0,
    id: launch.id,
    launchCostUsdt: launch.launchCostUsdt,
    name: launch.name,
    portraitInitials: getPortraitInitials(launch.name),
    sourceUniverseName: launch.sourceUniverseName ?? sourceStar.universeName,
    spawnedFromStarId: launch.spawnedFromStarId ?? sourceStar.id,
    specialty: {
      en: "Creator Launch Draft",
      ja: "Creator Launch Draft",
      ko: "크리에이터 출시 draft",
    },
    starScore: 50,
  };
}

function buildReferralCode(star: AIStar) {
  const starToken =
    star.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() ||
    star.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  return `${(starToken || "STAR").slice(0, 12)}-A-001`;
}

function isKoreanCopy(copy: ReturnType<typeof getFanletterV2Copy>) {
  return copy.labels.humanMember === "일반 멤버";
}

function getDisplayUniverseName(
  name: string,
  copy: ReturnType<typeof getFanletterV2Copy>,
) {
  if (!isKoreanCopy(copy)) {
    return name;
  }

  const replacements: Record<string, string> = {
    "Harin Universe": "하린 유니버스",
    "Minseo Universe": "민서 유니버스",
    "Ria Universe": "리아 유니버스",
    "Seoyeon Universe": "서연 유니버스",
    "Yoonseo Universe": "윤서 유니버스",
  };

  return replacements[name] ?? name.replace(/\bUniverse\b/g, "유니버스");
}

function getDisplayStarName(
  name: string,
  copy: ReturnType<typeof getFanletterV2Copy>,
) {
  if (!isKoreanCopy(copy)) {
    return name;
  }

  const replacements: Record<string, string> = {
    Harin: "하린",
    Lumi: "루미",
    Minseo: "민서",
    Mira: "미라",
    Noa: "노아",
    Ria: "리아",
    Seoyeon: "서연",
    Yoonseo: "윤서",
  };

  return replacements[name] ?? name;
}

function getDisplayMemberName(
  name: string,
  copy: ReturnType<typeof getFanletterV2Copy>,
) {
  if (!isKoreanCopy(copy)) {
    return name;
  }

  const replacements: Record<string, string> = {
    "Member A": "회원 A",
    "Member B": "회원 B",
    "New member": "신규 회원",
  };

  return replacements[name.trim()] ?? name;
}

function buildShareLink({
  locale,
  referralCode,
  star,
}: {
  locale: Locale;
  referralCode: string;
  star: AIStar;
}) {
  const url = new URL(
    `/${locale}/fanletter/${encodeURIComponent(star.id)}`,
    "https://www.net402.ai",
  );
  url.searchParams.set("ref", referralCode);

  return url.toString();
}

function buildStarDetailHref({
  locale,
  referralCode,
  star,
}: {
  locale: Locale;
  referralCode?: string | null;
  star: AIStar;
}) {
  const params = new URLSearchParams();

  if (referralCode) {
    params.set("ref", referralCode);
  }

  const search = params.toString();

  return `/${locale}/fanletter/${encodeURIComponent(star.id)}${
    search ? `?${search}` : ""
  }`;
}

function buildJoinHref({
  locale,
  referralCode,
  star,
}: {
  locale: Locale;
  referralCode?: string | null;
  star: AIStar;
}) {
  const params = new URLSearchParams({
    returnTo: buildStarDetailHref({
      locale,
      referralCode,
      star,
    }),
    star: star.id,
  });

  if (referralCode) {
    params.set("ref", referralCode);
  }

  return `/${locale}/fanletter/onboarding?${params.toString()}`;
}

function buildConnectHref({
  locale,
  referralCode,
  returnToHref,
}: {
  locale: Locale;
  referralCode?: string | null;
  returnToHref: string;
}) {
  const params = new URLSearchParams({
    returnTo: returnToHref,
  });

  if (referralCode) {
    params.set("ref", referralCode);
  }

  return `/${locale}/fanletter/connect?${params.toString()}`;
}

function buildMockScoutLoop({
  locale,
  referralCode,
  star,
}: {
  locale: Locale;
  referralCode: string;
  star: AIStar;
}): ScoutShareLoopData {
  return {
    ...fanletterV2Mock.scoutShareLoop,
    referralCode,
    selectedUniverse: star.universeName,
    shareLink: buildShareLink({
      locale,
      referralCode,
      star,
    }),
    starId: star.id,
    starName: star.name,
  };
}

function getStarDetailViewerState({
  isAuthenticated,
  viewerScoutShareLoop,
}: {
  isAuthenticated: boolean;
  viewerScoutShareLoop?: ScoutShareLoopData | null;
}): StarDetailViewerState {
  if (viewerScoutShareLoop) {
    return "founder";
  }

  return isAuthenticated ? "member" : "guest";
}

function getPrimaryAction({
  connectHref,
  copy,
  joinHref,
  viewerState,
}: {
  connectHref: string;
  copy: ReturnType<typeof getFanletterV2Copy>;
  joinHref: string;
  viewerState: StarDetailViewerState;
}): StarPrimaryAction {
  const isKorean = isKoreanCopy(copy);

  if (viewerState === "founder") {
    return {
      helper: isKorean
        ? "이미 이 AI 스타의 파운더입니다. 내 링크로 새 파운더를 초대하세요."
        : "You are already a Founder for this AI Star. Invite new Founders with your link.",
      href: "#referral-builder",
      label: isKorean ? "추천 링크 공유하기" : "Share referral link",
      status: isKorean ? "파운더 참여 완료" : "Founder active",
      variant: "share",
    };
  }

  if (viewerState === "member") {
    return {
      helper: isKorean
        ? "계정은 연결되어 있습니다. 클릭하면 이 AI 스타 유니버스의 파운더 네트워크에 Founder로 저장하고 내 추천 링크를 생성합니다."
        : "Your account is connected. Join this AI Star Universe Founder Network and create your referral link.",
      href: joinHref,
      label: isKorean ? "Founder 참여하기" : "Join Founder",
      status: isKorean ? "계정 연결됨" : "Account connected",
      variant: "join",
    };
  }

  return {
    helper: isKorean
      ? "계정을 연결하면 이 AI 스타의 파운더 참여와 추천 보상을 이어갈 수 있습니다."
      : "Connect your account to join this AI Star and keep referral attribution.",
    href: connectHref,
    label: isKorean ? "계정 연결하기" : "Connect account",
    status: isKorean ? "계정 연결 필요" : "Connect account",
    variant: "connect",
  };
}

function StarActionLink({
  action,
  agentRank,
  className,
  children,
  locale,
  referralCode,
  starId,
  trackingMetadata,
}: {
  action: StarPrimaryAction;
  agentRank?: AgentRankInteractionSignal | null;
  children?: ReactNode;
  className: string;
  locale: Locale;
  referralCode?: string | null;
  starId: string;
  trackingMetadata?: FunnelEventMetadata;
}) {
  const [isConfirmPanelOpen, setIsConfirmPanelOpen] = useState(false);
  const isKorean = locale === "ko";
  const panelLabels = isKorean
    ? {
        close: "Founder 참여 확인 패널 닫기",
        confirm: action.variant === "connect" ? "계정 연결 계속" : "Founder 참여 확정",
        events: "기록될 평판 이벤트",
        location: "현재 위치",
        next: "다음 행동",
        steps:
          action.variant === "connect"
            ? ["AI 스타 발견", "계정 연결", "Founder 참여", "평판 기록"]
            : ["AI 스타 발견", "Founder 참여", "추천 링크", "평판 기록"],
        title: "Founder 참여 확인",
      }
    : {
        close: "Close Founder join confirmation panel",
        confirm: action.variant === "connect" ? "Continue to connect" : "Confirm Founder join",
        events: "Reputation events",
        location: "Current location",
        next: "Next action",
        steps:
          action.variant === "connect"
            ? ["Discover", "Connect", "Join", "Reputation"]
            : ["Discover", "Join", "Referral", "Reputation"],
        title: "Confirm Founder join",
      };
  const eventNames =
    action.variant === "connect"
      ? ["account_connected", "founder_joined"]
      : ["founder_joined", "referral_code_created"];

  function trackActionIntent(targetHref: string) {
    trackFunnelEvent("signup_cta_click", {
      agentRank,
      metadata: trackingMetadata,
      referralCode,
      targetHref,
    });
  }

  function openConfirmPanel() {
    trackFunnelEvent("signup_cta_click", {
      agentRank,
      metadata: {
        ...trackingMetadata,
        panel: "founder_join_confirmation",
      },
      referralCode,
      targetHref: action.href,
    });
    setIsConfirmPanelOpen(true);
  }

  if (action.href.startsWith("#")) {
    return (
      <a
        className={className}
        href={action.href}
        onClick={() => trackActionIntent(action.href)}
      >
        {children ?? action.label}
      </a>
    );
  }

  if (action.variant === "join") {
    return (
      <>
        <button className={className} onClick={openConfirmPanel} type="button">
          {children ?? action.label}
        </button>
        <FanletterResponsiveActionPanel
          closeLabel={panelLabels.close}
          description={action.helper}
          eyebrow={action.status}
          onClose={() => setIsConfirmPanelOpen(false)}
          open={isConfirmPanelOpen}
          title={panelLabels.title}
        >
          <StarActionConfirmPanelContent
            action={action}
            eventNames={eventNames}
            finalAction={
              <FanletterFounderJoinLink
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-center text-sm font-semibold leading-tight !text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition hover:bg-zinc-800"
                agentRank={agentRank}
                href={action.href}
                locale={locale}
                mode="live"
                referralCode={referralCode}
                starId={starId}
                trackingMetadata={trackingMetadata}
                useResponseUniverseHref
              >
                <Crown className="size-4" />
                {panelLabels.confirm}
              </FanletterFounderJoinLink>
            }
            labels={panelLabels}
            referralCode={referralCode}
          />
        </FanletterResponsiveActionPanel>
      </>
    );
  }

  return (
    <>
      <button className={className} onClick={openConfirmPanel} type="button">
        {children ?? action.label}
      </button>
      <FanletterResponsiveActionPanel
        closeLabel={panelLabels.close}
        description={action.helper}
        eyebrow={action.status}
        onClose={() => setIsConfirmPanelOpen(false)}
        open={isConfirmPanelOpen}
        title={panelLabels.title}
      >
        <StarActionConfirmPanelContent
          action={action}
          eventNames={eventNames}
          finalAction={
            <Link
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-center text-sm font-semibold leading-tight !text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition hover:bg-zinc-800"
              href={action.href}
              onClick={() => trackActionIntent(action.href)}
            >
              {panelLabels.confirm}
              <ArrowRight className="size-4" />
            </Link>
          }
          labels={panelLabels}
          referralCode={referralCode}
        />
      </FanletterResponsiveActionPanel>
    </>
  );
}

function StarActionConfirmPanelContent({
  action,
  eventNames,
  finalAction,
  labels,
  referralCode,
}: {
  action: StarPrimaryAction;
  eventNames: string[];
  finalAction: ReactNode;
  labels: {
    events: string;
    location: string;
    next: string;
    steps: string[];
  };
  referralCode?: string | null;
}) {
  return (
    <div className="grid gap-4">
      <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
          {labels.location}
        </p>
        <p className="mt-1 text-base font-semibold text-zinc-950">
          {action.status}
        </p>
        {referralCode ? (
          <p className="mt-3 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs font-semibold leading-5 text-zinc-700">
            {referralCode}
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
          {labels.next}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {labels.steps.map((step, index) => (
            <div
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-center"
              key={`${step}-${index}`}
            >
              <span className="mx-auto flex size-7 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
                {index + 1}
              </span>
              <p className="mt-2 text-[0.68rem] font-semibold leading-4 text-zinc-700 [word-break:keep-all]">
                {step}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
          {labels.events}
        </p>
        <div className="mt-3 grid gap-2">
          {eventNames.map((eventName) => (
            <div
              className="flex min-h-11 items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
              key={eventName}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white">
                <GitBranch className="size-4" />
              </span>
              <span className="min-w-0 truncate font-mono text-xs font-semibold text-zinc-700">
                {eventName}
              </span>
            </div>
          ))}
        </div>
      </section>

      {finalAction}
    </div>
  );
}

function MetricTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-[0_14px_32px_rgba(15,23,42,0.06)]">
      <p className="text-2xl font-semibold leading-none text-[#12041f]">
        {value}
      </p>
      <p className="mt-2 text-[0.68rem] font-semibold uppercase text-black/48">
        {label}
      </p>
    </div>
  );
}

function StarViewerRelationshipCard({
  copy,
  isAuthenticated,
  locale,
  memberPortfolio,
  primaryAction,
  star,
  viewerState,
}: {
  copy: ReturnType<typeof getFanletterV2Copy>;
  isAuthenticated: boolean;
  locale: Locale;
  memberPortfolio?: MemberPortfolioData | null;
  primaryAction: StarPrimaryAction;
  star: AIStar;
  viewerState: StarDetailViewerState;
}) {
  const isKorean = isKoreanCopy(copy);
  const ownedStar = memberPortfolio?.ownedStars.find((item) => item.id === star.id);
  const founderRole = memberPortfolio?.roles.find((item) => item.starId === star.id);
  const isMockFounder = !founderRole && viewerState === "founder";
  const memberInitials =
    memberPortfolio?.memberInitials ??
    (memberPortfolio?.memberName
      ? getPortraitInitials(memberPortfolio.memberName)
      : isKorean
        ? "회원"
        : "ME");
  const labels = isKorean
    ? {
        creatorBody: ownedStar
          ? "이 AI 스타의 콘텐츠와 채널 운영 권한이 있습니다."
          : isAuthenticated
            ? "이 AI 스타의 Creator/Owner 운영 권한은 없습니다."
            : "계정 연결 후 Creator/Owner 권한을 확인할 수 있습니다.",
        creatorLabel: "Creator / Owner 관계",
        creatorStatus: ownedStar
          ? "운영 가능"
          : isAuthenticated
            ? "운영 권한 없음"
            : "계정 연결 필요",
        founderBody: founderRole
          ? "이 AI 스타 유니버스의 파운더 네트워크에 참여 중입니다."
          : isMockFounder
            ? "이 브라우저에서 mock Founder 참여가 완료된 상태입니다."
            : isAuthenticated
              ? "아직 이 AI 스타의 파운더 네트워크에 참여하지 않았습니다."
              : "계정 연결 후 Founder 참여를 진행할 수 있습니다.",
        founderLabel: "파운더 네트워크 관계",
        founderStatus: founderRole
          ? copy.roles[founderRole.role]
          : isMockFounder
            ? "파운더"
            : isAuthenticated
              ? "참여 전"
              : "계정 연결 필요",
        nextActionLabel: "다음 행동",
        ownerNextAction: "TikTok 채널 관리",
        ownerStatus: "Creator 권한 활성화",
        title: "이 AI 스타와 나의 관계",
      }
    : {
        creatorBody: ownedStar
          ? "You can manage this AI Star's content and channel."
          : isAuthenticated
            ? "You do not have Creator/Owner permission for this AI Star."
            : "Connect your account to check Creator/Owner permission.",
        creatorLabel: "Creator / Owner relationship",
        creatorStatus: ownedStar
          ? "Can operate"
          : isAuthenticated
            ? "No operator permission"
            : "Connect account",
        founderBody: founderRole
          ? "You participate in this AI Star Universe's Founder Network."
          : isMockFounder
            ? "Mock Founder participation is complete in this browser."
            : isAuthenticated
              ? "You have not joined this AI Star's Founder Network yet."
              : "Connect your account to join as Founder.",
        founderLabel: "Founder Network relationship",
        founderStatus: founderRole
          ? copy.roles[founderRole.role]
          : isMockFounder
            ? "Founder"
            : isAuthenticated
              ? "Not joined"
              : "Connect account",
        nextActionLabel: "Next action",
        ownerNextAction: "Manage TikTok channel",
        ownerStatus: "Creator permission active",
        title: "My relationship with this AI Star",
      };
  const relationshipAction: {
    eventType: AgentRankInteractionSignal["eventType"];
    href: string;
    label: string;
    status: string;
  } = ownedStar
    ? {
        eventType: "creator_social_connected",
        href: `/${locale}/fanletter/creator-unlock?starId=${encodeURIComponent(
          star.id,
        )}#tiktok-channel`,
        label: labels.ownerNextAction,
        status: labels.ownerStatus,
      }
    : {
        eventType: primaryAction.variant === "share"
          ? "referral_shared"
          : "founder_joined",
        href: primaryAction.href,
        label: primaryAction.label,
        status: primaryAction.status,
      };

  return (
    <section className="mt-3 grid gap-2 rounded-[1.15rem] border border-zinc-200 bg-white p-3.5 shadow-[0_14px_36px_rgba(15,23,42,0.055)] sm:mt-4 sm:grid-cols-[0.78fr_1.22fr] sm:p-4">
      <div className="flex min-w-0 items-center gap-3">
        <HumanMemberAvatar
          member={{
            initials: memberInitials,
            name: memberPortfolio?.memberName ?? labels.title,
          }}
          size="md"
        />
        <div className="min-w-0">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {isKorean ? "내 관계" : "My relationship"}
          </p>
          <h2 className="mt-1 truncate text-lg font-semibold text-zinc-950">
            {labels.title}
          </h2>
          <p className="mt-0.5 truncate text-xs font-semibold text-zinc-500">
            {getDisplayStarName(star.name, copy)}
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-950 p-3 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white/50">
                <Bot className="size-3.5 shrink-0" />
                {labels.creatorLabel}
              </p>
              <p className="mt-1 truncate text-base font-semibold">
                {labels.creatorStatus}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[0.6rem] font-semibold text-black">
              AI STAR
            </span>
          </div>
          <p className="mt-2 text-xs font-semibold leading-5 text-white/58 [word-break:keep-all]">
            {labels.creatorBody}
          </p>
        </div>

        <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                <Users className="size-3.5 shrink-0" />
                {labels.founderLabel}
              </p>
              <p className="mt-1 truncate text-base font-semibold text-zinc-950">
                {labels.founderStatus}
              </p>
            </div>
            {founderRole ? (
              <FounderRoleBadge copy={copy} role={founderRole.role} />
            ) : null}
          </div>
          <p className="mt-2 text-xs font-semibold leading-5 text-zinc-500 [word-break:keep-all]">
            {labels.founderBody}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 sm:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {labels.nextActionLabel}
            </p>
            <p className="mt-1 truncate text-base font-semibold text-zinc-950">
              {relationshipAction.status}
            </p>
            <p className="mt-1 truncate font-mono text-xs font-semibold text-zinc-500">
              {relationshipAction.eventType}
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 text-sm font-semibold !text-white transition hover:bg-zinc-800"
            href={relationshipAction.href}
            onClick={() => {
              trackFunnelEvent("share_click", {
                agentRank: {
                  eventType: relationshipAction.eventType,
                  intent: ownedStar
                    ? "creator_tiktok_channel_manage"
                    : "star_relationship_next_action",
                  source: "fanletter_star_detail",
                  starId: star.id,
                },
                metadata: {
                  placement: "star_viewer_relationship_card",
                  relationship: ownedStar
                    ? "creator_owner"
                    : viewerState,
                  starName: star.name,
                },
              });
            }}
          >
            {relationshipAction.label}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function StarDetailMobileSignpost({
  action,
  copy,
  joinReferralCode,
  locale,
  primaryReputationEventLabel,
  primaryReputationEventType,
  referralCode,
  star,
  trackingAgentRank,
  trackingMetadata,
  viewerState,
}: {
  action: StarPrimaryAction;
  copy: ReturnType<typeof getFanletterV2Copy>;
  joinReferralCode?: string | null;
  locale: Locale;
  primaryReputationEventLabel: string;
  primaryReputationEventType: "founder_joined" | "referral_shared";
  referralCode: string;
  star: AIStar;
  trackingAgentRank?: AgentRankInteractionSignal | null;
  trackingMetadata?: FunnelEventMetadata;
  viewerState: StarDetailViewerState;
}) {
  const isKorean = isKoreanCopy(copy);
  const displayStarName = getDisplayStarName(star.name, copy);
  const founderNetworkHref = `/${locale}/fanletter/${encodeURIComponent(
    star.id,
  )}/universe${
    referralCode ? `?ref=${encodeURIComponent(referralCode)}` : ""
  }`;
  const viewerStateLabel =
    viewerState === "founder"
      ? isKorean
        ? "파운더"
        : "Founder"
      : viewerState === "member"
        ? isKorean
          ? "회원"
          : "Member"
        : isKorean
          ? "방문자"
          : "Guest";

  return (
    <section className="mt-5 min-w-0 overflow-hidden rounded-[1.15rem] border border-zinc-200 bg-white text-zinc-950 shadow-[0_14px_36px_rgba(15,23,42,0.06)] sm:hidden">
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 bg-cover bg-center text-base font-semibold text-zinc-900"
            style={
              star.portraitImageUrl
                ? { backgroundImage: `url(${star.portraitImageUrl})` }
                : {
                    background: `linear-gradient(145deg, ${star.accentColor}, ${star.accentSecondary})`,
                  }
            }
          >
            {star.portraitImageUrl ? null : star.portraitInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              <Bot className="size-3.5" />
              {isKorean ? "현재 위치" : "Current"}
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold tracking-normal">
              {displayStarName}
            </h2>
            <p className="mt-0.5 text-sm font-semibold text-zinc-500">
              {isKorean ? "AI 스타 유니버스" : "AI Star Universe"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            {
              label: isKorean ? "내 상태" : "Status",
              value: viewerStateLabel,
            },
            {
              label: copy.labels.starScore,
              value: String(star.starScore),
            },
            {
              label: copy.labels.openSlots,
              value: formatNumber(star.openSlots.open, locale),
            },
          ].map((metric) => (
            <div
              className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2"
              key={metric.label}
            >
              <p className="truncate text-[0.62rem] font-semibold text-zinc-500">
                {metric.label}
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-zinc-950">
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            {isKorean ? "다음 행동" : "Next action"}
          </p>
          <p className="mt-1 text-sm font-semibold leading-5 text-zinc-950 [word-break:keep-all]">
            {action.label}
          </p>
          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-zinc-500 [word-break:keep-all]">
            {action.helper}
          </p>
        </div>
      </div>

      <div className="border-t border-zinc-200 bg-zinc-50/72 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              {isKorean ? "생성될 신호" : "Signal"}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-zinc-950">
              {primaryReputationEventLabel}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 font-mono text-[0.66rem] font-semibold text-zinc-600">
            {primaryReputationEventType}
          </span>
        </div>
        <StarActionLink
          action={action}
          agentRank={trackingAgentRank}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-center text-sm font-semibold leading-tight !text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)]"
          locale={locale}
          referralCode={joinReferralCode}
          starId={star.id}
          trackingMetadata={{
            ...trackingMetadata,
            placement: "fanletter_star_detail_mobile_signpost_primary",
          }}
        >
          <span className="min-w-0 whitespace-normal text-center leading-tight [word-break:keep-all]">
            {action.label}
          </span>
          <ArrowRight className="size-4 shrink-0" />
        </StarActionLink>
        <Link
          className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
          href={founderNetworkHref}
        >
          <GitBranch className="size-4" />
          {isKorean ? "파운더 네트워크 보기" : "View Founder Network"}
        </Link>
      </div>
    </section>
  );
}

function FounderJoinFlowHint({
  copy,
  viewerState,
}: {
  copy: ReturnType<typeof getFanletterV2Copy>;
  viewerState: StarDetailViewerState;
}) {
  const isKorean = isKoreanCopy(copy);
  const labels =
    isKorean
      ? {
          active: "현재 단계",
          done: "완료",
          steps: [
            "계정 연결",
            "Founder 참여",
            "추천 링크 생성",
            "초대 보상 적립",
          ],
          title: "참여 흐름",
          waiting: "다음",
        }
      : {
          active: "Current",
          done: "Done",
          steps: [
            "Connect account",
            "Join Founder",
            "Create referral link",
            "Earn invite rewards",
          ],
          title: "Join Flow",
          waiting: "Next",
        };
  const activeIndex =
    viewerState === "guest" ? 0 : viewerState === "member" ? 1 : 2;

  return (
    <div className="mt-4 rounded-lg border border-zinc-200 bg-white/88 p-3 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold text-zinc-700">{labels.title}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {labels.steps.map((step, index) => {
          const isDone = index < activeIndex;
          const isActive = index === activeIndex;

          return (
            <div
              className={joinClasses(
                "min-w-0 rounded-lg border px-3 py-2",
                isActive
                  ? "border-zinc-950 bg-zinc-50"
                  : isDone
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white",
              )}
              key={step}
            >
              <p
                className={joinClasses(
                  "text-[0.62rem] font-semibold",
                  isActive
                    ? "text-zinc-950"
                    : isDone
                      ? "text-emerald-700"
                      : "text-slate-400",
                )}
              >
                {isDone ? labels.done : isActive ? labels.active : labels.waiting}
              </p>
              <p className="mt-1 truncate text-xs font-semibold text-[#12041f]">
                {step}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FounderNextReputationPath({
  className,
  copy,
  referralCode,
  viewerState,
}: {
  className?: string;
  copy: ReturnType<typeof getFanletterV2Copy>;
  referralCode: string;
  viewerState: StarDetailViewerState;
}) {
  if (viewerState !== "founder") {
    return null;
  }

  const isKorean = isKoreanCopy(copy);
  const labels = isKorean
    ? {
        active: "지금 할 일",
        done: "완료",
        next: "다음",
        subtitle: "내 링크로 새 Founder가 참여하면 보상과 평판 기록이 함께 생성됩니다.",
        title: "Founder 다음 흐름",
      }
    : {
        active: "Now",
        done: "Done",
        next: "Next",
        subtitle: "When a new Founder joins through your link, rewards and reputation records are created together.",
        title: "Founder next path",
      };
  const steps = [
    {
      event: "founder_joined",
      icon: Crown,
      label: isKorean ? "Founder 참여 완료" : "Founder joined",
      state: "done",
    },
    {
      event: "referral_shared",
      href: "#referral-builder",
      icon: Share2,
      label: isKorean ? "추천 공유" : "Share referral",
      state: "active",
    },
    {
      event: "event_ledger",
      icon: Database,
      label: isKorean ? "평판 기록" : "Reputation record",
      state: "next",
    },
    {
      event: "creator_unlock_evaluated",
      icon: Bot,
      label: isKorean ? "Creator Journey" : "Creator Journey",
      state: "next",
    },
  ];

  return (
    <article
      className={joinClasses(
        "mt-4 rounded-2xl border border-zinc-200 bg-white p-3 shadow-[0_14px_34px_rgba(15,23,42,0.06)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-zinc-500">
            {labels.title}
          </p>
          <p className="mt-1 text-sm font-semibold leading-5 text-zinc-950 [word-break:keep-all]">
            {labels.subtitle}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-[0.66rem] font-semibold text-zinc-700">
          {referralCode}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = step.state === "active";
          const isDone = step.state === "done";
          const statusLabel = isActive
            ? labels.active
            : isDone
              ? labels.done
              : labels.next;
          const content = (
            <div
              className={joinClasses(
                "min-h-[7rem] min-w-0 rounded-xl border p-3 transition",
                isActive
                  ? "border-zinc-950 bg-zinc-950 text-white shadow-[0_16px_32px_rgba(15,23,42,0.16)]"
                  : isDone
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                    : "border-zinc-200 bg-zinc-50 text-zinc-950",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={joinClasses(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
                    isActive
                      ? "bg-white text-zinc-950"
                      : isDone
                        ? "bg-white text-emerald-700"
                        : "bg-white text-zinc-600",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span
                  className={joinClasses(
                    "truncate text-[0.6rem] font-semibold uppercase tracking-[0.12em]",
                    isActive
                      ? "text-white/62"
                      : isDone
                        ? "text-emerald-700"
                        : "text-zinc-500",
                  )}
                >
                  {statusLabel}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold leading-5 [word-break:keep-all]">
                {step.label}
              </p>
              <p
                className={joinClasses(
                  "mt-2 break-all font-mono text-[0.62rem] font-semibold leading-4",
                  isActive
                    ? "text-white/58"
                    : isDone
                      ? "text-emerald-700/70"
                      : "text-zinc-400",
                )}
              >
                {step.event}
              </p>
            </div>
          );

          return step.href ? (
            <a className="block min-w-0" href={step.href} key={step.event}>
              {content}
            </a>
          ) : (
            <div className="min-w-0" key={step.event}>
              {content}
            </div>
          );
        })}
      </div>
    </article>
  );
}

function FounderJoinResultCard({
  copy,
  founderNetworkHref,
  locale,
  loop,
  onOpenSharePanel,
  referralCode,
  star,
}: {
  copy: ReturnType<typeof getFanletterV2Copy>;
  founderNetworkHref: string;
  locale: Locale;
  loop: ScoutShareLoopData;
  onOpenSharePanel: () => void;
  referralCode: string;
  star: AIStar;
}) {
  const isKorean = isKoreanCopy(copy);
  const displayStarName = getDisplayStarName(star.name, copy);
  const labels = isKorean
    ? {
        body: "추천 코드가 생성되었고, 보상과 평판 기록이 준비되었습니다.",
        event: "생성된 평판 기록",
        network: "파운더 네트워크 보기",
        share: "추천 링크 공유하기",
        title: "Founder 참여 완료",
      }
    : {
        body: "Your referral code is ready, with rewards and reputation records prepared.",
        event: "Reputation records",
        network: "View Founder Network",
        share: "Share referral link",
        title: "Founder join complete",
      };
  const resultMetrics = [
    {
      label: "CP",
      value: `+${formatNumber(loop.rewards.cp, locale)}`,
    },
    {
      label: copy.labels.influenceScore,
      value: `+${formatNumber(loop.rewards.influenceScore, locale)}`,
    },
    {
      label: copy.labels.creatorProgress,
      value: `+${loop.rewards.creatorProgressPercent}%`,
    },
  ];

  function trackShareIntent() {
    trackFunnelEvent("signup_cta_click", {
      agentRank: {
        eventType: "referral_shared",
        intent: "founder_join_result_share",
        source: "fanletter_star_detail",
        starId: star.id,
      },
      metadata: {
        placement: "founder_join_result_primary",
        starName: star.name,
      },
      referralCode,
      targetHref: "#referral-builder",
    });
  }

  return (
    <article className="mt-4 overflow-hidden rounded-2xl border border-zinc-950 bg-zinc-950 text-white shadow-[0_22px_54px_rgba(15,23,42,0.16)]">
      <div className="grid gap-0 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-zinc-950">
              <Crown className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-white/55">
                {displayStarName} · {copy.starDetail.universeTitle}
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-normal [word-break:keep-all]">
                {labels.title}
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-white/66 [word-break:keep-all]">
                {labels.body}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {resultMetrics.map((item) => (
              <div
                className="min-w-0 rounded-xl border border-white/10 bg-white/[0.06] px-2 py-3 text-center"
                key={item.label}
              >
                <p className="truncate text-base font-semibold leading-none">
                  {item.value}
                </p>
                <p className="mt-1 truncate text-[0.62rem] font-semibold text-white/46">
                  {item.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.06] p-3">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <span className="text-[0.7rem] font-semibold text-white/50">
                {copy.labels.referralCode}
              </span>
              <span className="min-w-0 truncate font-mono text-xs font-semibold text-white">
                {referralCode}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["founder_joined", "referral_code_created"].map((eventName) => (
                <span
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.08] px-2.5 text-[0.66rem] font-semibold text-white/72"
                  key={eventName}
                >
                  <GitBranch className="size-3.5" />
                  {eventName}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 p-4 sm:w-72 sm:border-l sm:border-t-0 sm:p-5">
          <p className="text-xs font-semibold text-white/48">
            {labels.event}
          </p>
          <div className="mt-3 grid gap-2">
            <button
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-4 text-center text-sm font-semibold leading-tight text-zinc-950 transition hover:bg-zinc-100"
              onClick={() => {
                trackShareIntent();
                onOpenSharePanel();
              }}
              type="button"
            >
              <Share2 className="size-4 shrink-0" />
              <span className="min-w-0 whitespace-normal [word-break:keep-all]">
                {labels.share}
              </span>
            </button>
            <Link
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 text-center text-sm font-semibold leading-tight text-white transition hover:bg-white/[0.08]"
              href={founderNetworkHref}
            >
              <span className="min-w-0 whitespace-normal [word-break:keep-all]">
                {labels.network}
              </span>
              <ArrowRight className="size-4 shrink-0" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function StarAgentRankJoinSignal({
  locale,
  snapshot,
  star,
}: {
  locale: Locale;
  snapshot?: FanletterAgentRankInvestorSnapshot | null;
  star: AIStar;
}) {
  if (!snapshot) {
    return null;
  }

  const isKorean = locale === "ko";
  const labels = isKorean
    ? {
        cta: "AgentRank 보기",
        edges: "네트워크",
        events: "평판 이벤트",
        join: "Founder 참여",
        ledger: "이벤트 원장",
        referral: "추천 코드",
        reward: "CP 보상",
        title: "이 참여가 AgentRank 신호가 됩니다",
      }
    : {
        cta: "View AgentRank",
        edges: "Network",
        events: "Reputation Events",
        join: "Founder Join",
        ledger: "Event Ledger",
        referral: "Referral Code",
        reward: "CP Reward",
        title: "This join becomes an AgentRank signal",
      };
  const scorePercent = Math.round(
    (snapshot.ers.score / Math.max(1, snapshot.ers.maxScore)) * 100,
  );

  return (
    <article className="mt-4 max-w-2xl rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
            <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
            AgentRank ERS {snapshot.ers.score}
          </p>
          <h2 className="mt-1 break-words text-sm font-semibold text-[#12041f] [word-break:keep-all]">
            {labels.title}
          </h2>
        </div>
        <div className="hidden shrink-0 flex-wrap gap-2 sm:flex">
          <Link
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-slate-900 px-3 text-xs font-semibold !text-white"
            href={`/${locale}/fanletter/agentrank?starId=${encodeURIComponent(
              star.id,
            )}`}
          >
            {labels.cta}
            <ArrowRight className="size-3.5" />
          </Link>
          <Link
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
            href={`/${locale}/fanletter/agentrank/events?starId=${encodeURIComponent(
              star.id,
            )}`}
          >
            <Database className="size-3.5" />
            {labels.ledger}
          </Link>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <span
          className="block h-full rounded-full bg-gradient-to-r from-black via-zinc-700 to-zinc-400"
          style={{ width: `${scorePercent}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          [labels.events, snapshot.ers.summary.eventCount],
          [labels.edges, snapshot.ers.summary.networkEdges],
          ["CP", snapshot.ers.summary.cpTotal],
        ].map(([label, value]) => (
          <span
            className="min-w-0 rounded-lg bg-slate-50 px-2 py-2 text-center"
            key={label}
          >
            <span className="block truncate text-sm font-semibold text-[#12041f]">
              {formatNumber(Number(value), locale)}
            </span>
            <span className="mt-0.5 block truncate text-[0.58rem] font-semibold text-slate-400">
              {label}
            </span>
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {[labels.join, labels.referral, labels.reward].map((eventLabel) => (
          <span
            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.66rem] font-semibold text-slate-700"
            key={eventLabel}
          >
            {eventLabel}
          </span>
        ))}
      </div>
    </article>
  );
}

function StarFounderMobilePanel({
  action,
  copy,
  joinReferralCode,
  locale,
  loop,
  referralCode,
  star,
  trackingAgentRank,
  trackingMetadata,
  showAction = true,
}: {
  action: StarPrimaryAction;
  copy: ReturnType<typeof getFanletterV2Copy>;
  joinReferralCode?: string | null;
  locale: Locale;
  loop: ScoutShareLoopData;
  referralCode: string;
  star: AIStar;
  trackingAgentRank?: AgentRankInteractionSignal | null;
  trackingMetadata?: FunnelEventMetadata;
  showAction?: boolean;
}) {
  const founderMember = {
    initials: "A",
    name: getDisplayMemberName(loop.sourceMember, copy),
  };
  const displayStarName = getDisplayStarName(star.name, copy);
  const mobileAIStarBadgeLabel = isKoreanCopy(copy)
    ? "AI스타"
    : copy.labels.aiStarBadge;
  const portraitBackground = star.portraitImageUrl
    ? `linear-gradient(180deg, rgba(18,4,31,0.04), rgba(18,4,31,0.72)), url("${star.portraitImageUrl}")`
    : `radial-gradient(circle at 30% 18%, rgba(255,255,255,0.86), transparent 18%), radial-gradient(circle at 72% 22%, ${star.accentSecondary}, transparent 24%), linear-gradient(145deg, ${star.accentColor}, #31105f 64%, #12041f)`;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-[0_22px_54px_rgba(15,23,42,0.08)]">
      <div className="grid grid-cols-[1fr_1.75rem_0.8fr] items-stretch gap-2">
        <div
          className="relative min-h-44 overflow-hidden rounded-lg border border-fuchsia-200 bg-cover bg-center p-3 text-white"
          style={{
            background: portraitBackground,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#12041f]/82 via-transparent to-white/10" />
          <div className="relative z-10 flex min-w-0 items-center justify-between gap-1.5">
            <span
              aria-label={copy.labels.aiStarBadge}
              className="shrink-0 whitespace-nowrap rounded-full bg-white px-2 py-1 text-[0.58rem] font-semibold leading-none text-[#5b21b6]"
            >
              {mobileAIStarBadgeLabel}
            </span>
            <span
              aria-label={`${copy.labels.starScore} ${star.starScore}`}
              className="shrink-0 rounded-full border border-white/18 bg-white/16 px-2 py-1 text-[0.58rem] font-semibold leading-none backdrop-blur"
            >
              {star.starScore}
            </span>
          </div>
          {!star.portraitImageUrl ? (
            <div className="absolute inset-x-6 bottom-12 top-12 rounded-t-full bg-white/16 backdrop-blur-[2px]" />
          ) : null}
          <div className="relative z-10 flex min-h-32 flex-col justify-end">
            <div className="flex size-14 items-center justify-center rounded-full border border-white/28 bg-black/24 text-lg font-semibold shadow-[0_14px_30px_rgba(0,0,0,0.22)]">
              {star.portraitInitials}
            </div>
            <p className="mt-2 text-xl font-semibold leading-none">
              {displayStarName}
            </p>
            <p className="mt-1 text-[0.7rem] font-semibold text-white/72">
              +{star.growthPercent}% {copy.labels.growth}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <ArrowRight className="size-5 text-zinc-900" />
        </div>

        <div className="flex min-h-44 flex-col justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase text-zinc-500">
              {copy.labels.humanMember}
            </p>
            <div className="mt-3">
              <HumanMemberAvatar member={founderMember} size="lg" />
            </div>
            <p className="mt-2 text-sm font-semibold text-zinc-950">
              {founderMember.name}
            </p>
          </div>
          <FounderRoleBadge copy={copy} role="founder" />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-[#f7f2ff] p-2">
          <p className="text-lg font-semibold leading-none">
            +{loop.rewards.cp}
          </p>
          <p className="mt-1 text-[0.62rem] font-semibold text-black/48">CP</p>
        </div>
        <div className="rounded-lg bg-[#eefcf4] p-2">
          <p className="text-lg font-semibold leading-none">
            +{loop.rewards.influenceScore}
          </p>
          <p className="mt-1 text-[0.62rem] font-semibold text-black/48">
            {copy.labels.influenceScore}
          </p>
        </div>
        <div className="rounded-lg bg-[#fff7ed] p-2">
          <p className="text-lg font-semibold leading-none">
            +{loop.rewards.creatorProgressPercent}%
          </p>
          <p className="mt-1 text-[0.62rem] font-semibold text-black/48">
            {copy.labels.creatorProgress}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-black/8 bg-[#fafafa] px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[0.68rem] font-semibold text-black/48">
            {action.status}
          </span>
          <span className="truncate font-mono text-sm font-semibold text-zinc-700">
            {referralCode}
          </span>
        </div>
      </div>

      {showAction ? (
        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <StarActionLink
            action={action}
            agentRank={trackingAgentRank}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white shadow-[0_16px_34px_rgba(15,23,42,0.18)]"
            locale={locale}
            referralCode={joinReferralCode}
            starId={star.id}
            trackingMetadata={trackingMetadata}
          >
            {action.label}
            <ArrowRight className="size-4" />
          </StarActionLink>
          <a
            aria-label={copy.actions.createMockReferral}
            className="inline-flex size-12 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-900"
            href="#referral-builder"
          >
            <Share2 className="size-5" />
          </a>
        </div>
      ) : null}
    </div>
  );
}

function HumanFounderSlots({
  copy,
  star,
}: {
  copy: ReturnType<typeof getFanletterV2Copy>;
  star: AIStar;
}) {
  return (
    <article className="rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_44px_rgba(8,18,12,0.06)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
          <Users className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-black/50">
            {copy.roles.founder}
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-normal text-black">
            {copy.starDetail.founderSlotsTitle}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-black/62">
            {copy.starDetail.founderSlotsBody}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {star.founderSlots.map((slot) => {
          const displaySlot = {
            ...slot,
            name: getDisplayMemberName(slot.name, copy),
          };

          return (
            <div
              className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
              key={`${slot.name}-${slot.role}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <HumanMemberAvatar member={displaySlot} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900">
                    {displaySlot.name}
                  </p>
                  <p className="text-xs font-medium text-zinc-500">
                    {copy.labels.humanMember}
                  </p>
                </div>
              </div>
              <FounderRoleBadge copy={copy} role={slot.role} />
            </div>
          );
        })}
      </div>
    </article>
  );
}

function SpawnedStarsSection({
  copy,
  locale,
  star,
}: {
  copy: ReturnType<typeof getFanletterV2Copy>;
  locale: Locale;
  star: AIStar;
}) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-black text-white">
          <Bot className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-zinc-700">
            {copy.labels.spawnedStars}
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-normal text-[#12041f]">
            {copy.starDetail.spawnedTitle}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-black/62">
            {copy.starDetail.spawnedBody}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {star.spawnedStars.map((spawnedStar) => {
          const sourceUniverseName = spawnedStar.sourceUniverseName
            ? getDisplayUniverseName(spawnedStar.sourceUniverseName, copy)
            : null;
          const displaySpawnedStarName = getDisplayStarName(
            spawnedStar.name,
            copy,
          );

          return (
            <Link
              className="rounded-lg border border-fuchsia-200/70 p-3 text-white shadow-[0_16px_34px_rgba(88,28,135,0.16)] transition hover:-translate-y-0.5"
              href={`/${locale}/fanletter/${spawnedStar.id}`}
              key={spawnedStar.id}
              style={{
                background: `linear-gradient(145deg, ${spawnedStar.accentColor}, #21103d 72%)`,
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex size-12 items-center justify-center rounded-lg border border-white/18 text-sm font-semibold"
                  style={{
                    background: `linear-gradient(145deg, ${spawnedStar.accentSecondary}, rgba(255,255,255,0.16))`,
                  }}
                >
                  {spawnedStar.portraitInitials}
                </span>
                <div className="min-w-0">
                  <p className="text-[0.66rem] font-semibold text-fuchsia-100">
                    {copy.labels.aiStarBadge}
                  </p>
                  <p className="truncate text-lg font-semibold">
                    {displaySpawnedStarName}
                  </p>
                  <p className="truncate text-xs font-medium text-white/60">
                    {getFanletterV2LocalizedText(
                      spawnedStar.specialty,
                      locale,
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs font-semibold text-white/70">
                <span>
                  {copy.labels.starScore} {spawnedStar.starScore}
                </span>
                <span>
                  +{spawnedStar.growthPercent}% {copy.labels.growth}
                </span>
              </div>
              {spawnedStar.createdByUnlock || sourceUniverseName ? (
                <div className="mt-3 rounded-lg border border-white/12 bg-white/8 p-2 text-[0.68rem] font-semibold leading-4 text-white/72">
                  {sourceUniverseName ? (
                    <p className="truncate">
                      {copy.labels.sourceUniverse}: {sourceUniverseName}
                    </p>
                  ) : null}
                  {spawnedStar.createdByUnlock ? (
                    <p className="truncate">{copy.labels.createdByUnlock}</p>
                  ) : null}
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </article>
  );
}

function AIStarGenealogySection({
  copy,
  locale,
  star,
}: {
  copy: ReturnType<typeof getFanletterV2Copy>;
  locale: Locale;
  star: AIStar;
}) {
  const isKorean = isKoreanCopy(copy);
  const parentStar = star.parentStar ?? null;
  const firstSpawnedStar = star.spawnedStars[0] ?? null;

  if (!parentStar && !firstSpawnedStar) {
    return null;
  }

  const labels = isKorean
    ? {
        body:
          "이 AI 스타가 어느 AI 스타 유니버스에서 탄생했고, 다음 AI 스타로 어떻게 확장되는지 보여줍니다.",
        current: "현재 AI 스타",
        map: "전체 계보 맵",
        parent: "Parent AI Star",
        spawned: "Spawned AI Star",
        title: "AI 스타 계보",
      }
    : {
        body:
          "See where this AI Star was born and how it expands into the next AI Stars.",
        current: "Current AI Star",
        map: "Full genealogy map",
        parent: "Parent AI Star",
        spawned: "Spawned AI Star",
        title: "AI Star Genealogy",
      };
  const currentStarAsNode: SpawnedAIStar = {
    accentColor: star.accentColor,
    accentSecondary: star.accentSecondary,
    founderCount: star.founderCount,
    growthPercent: star.growthPercent,
    id: star.id,
    name: star.name,
    portraitInitials: star.portraitInitials,
    specialty: star.specialty,
    starScore: star.starScore,
  };
  const cards = [
    parentStar
      ? {
          badge: labels.parent,
          href: `/${locale}/fanletter/${encodeURIComponent(parentStar.id)}`,
          node: parentStar,
          tone: "from-[#4f46e5] to-[#7c3aed]",
        }
      : null,
    {
      badge: labels.current,
      href: `/${locale}/fanletter/${encodeURIComponent(star.id)}`,
      node: currentStarAsNode,
      tone: "from-[#7c3aed] to-[#22d3ee]",
    },
    firstSpawnedStar
      ? {
          badge: labels.spawned,
          href: `/${locale}/fanletter/${encodeURIComponent(firstSpawnedStar.id)}`,
          node: firstSpawnedStar,
          tone: "from-[#a855f7] to-[#ec4899]",
        }
      : null,
  ].filter(
    (
      item,
    ): item is {
      badge: string;
      href: string;
      node: SpawnedAIStar;
      tone: string;
    } => item !== null,
  );

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-black text-white">
            <GitBranch className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-zinc-700">
              {copy.labels.aiStarBadge}
            </p>
            <h2 className="text-2xl font-semibold leading-tight tracking-normal text-[#12041f]">
              {labels.title}
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-black/62">
              {labels.body}
            </p>
          </div>
        </div>
        <Link
          className="hidden h-10 shrink-0 items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-100 sm:inline-flex"
          href={`/${locale}/fanletter/ai-star-genealogy`}
        >
          {labels.map}
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
        {cards.map((item, index) => (
          <div
            className="contents"
            key={`${item.node.id}-${item.badge}`}
          >
            {index > 0 ? (
              <div className="hidden items-center justify-center text-zinc-900 sm:flex">
                <ArrowRight className="size-5" />
              </div>
            ) : null}
            <Link
              className={`rounded-lg bg-gradient-to-br ${item.tone} p-3 text-white shadow-[0_16px_34px_rgba(88,28,135,0.18)] transition hover:-translate-y-0.5`}
              href={item.href}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-white/18 px-2 py-1 text-[0.58rem] font-semibold">
                  {item.badge}
                </span>
                <Bot className="size-4 text-white/82" />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/16 text-sm font-semibold">
                  {item.node.portraitInitials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">
                    {getDisplayStarName(item.node.name, copy)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-white/70">
                    {copy.labels.starScore} {item.node.starScore}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <Link
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-100 sm:hidden"
        href={`/${locale}/fanletter/ai-star-genealogy`}
      >
        {labels.map}
        <ArrowRight className="size-4" />
      </Link>
    </article>
  );
}

export function FanletterStarDetailPage({
  agentRankSnapshot,
  coverageAction = null,
  founderJoinCompleted = false,
  isAuthenticated = false,
  inboundReferralCode,
  locale,
  memberPortfolio,
  relatedStars,
  star,
  viewerScoutShareLoop,
}: {
  agentRankSnapshot?: FanletterAgentRankInvestorSnapshot | null;
  coverageAction?: AgentRankCoverageActionContext | null;
  founderJoinCompleted?: boolean;
  isAuthenticated?: boolean;
  inboundReferralCode?: string | null;
  locale: Locale;
  memberPortfolio?: MemberPortfolioData | null;
  relatedStars: AIStar[];
  star: AIStar;
  viewerScoutShareLoop?: ScoutShareLoopData | null;
}) {
  const copy = getFanletterV2Copy(locale);
  const mockLaunchesById = useFanletterCreatorMockLaunches();
  const displayStar = useMemo(() => {
    const existingSpawnedStarIds = new Set(
      star.spawnedStars.map((spawnedStar) => spawnedStar.id),
    );
    const mockSpawnedStars = Object.values(mockLaunchesById)
      .filter(
        (launch) =>
          launch.spawnedFromStarId === star.id ||
          (!launch.spawnedFromStarId &&
            launch.sourceUniverseName === star.universeName),
      )
      .map((launch) => toMockSpawnedStar(launch, star))
      .filter((spawnedStar) => !existingSpawnedStarIds.has(spawnedStar.id));

    if (mockSpawnedStars.length === 0) {
      return star;
    }

    return {
      ...star,
      spawnedStars: [...mockSpawnedStars, ...star.spawnedStars],
    };
  }, [mockLaunchesById, star]);
  const viewerState = getStarDetailViewerState({
    isAuthenticated,
    viewerScoutShareLoop,
  });
  const fallbackReferralCode = inboundReferralCode ?? buildReferralCode(star);
  const fallbackLoop = buildMockScoutLoop({
    locale,
    referralCode: fallbackReferralCode,
    star,
  });
  const loop = viewerScoutShareLoop ?? fallbackLoop;
  const effectiveInboundReferralCode = viewerScoutShareLoop
    ? null
    : inboundReferralCode;
  const joinReferralCode = effectiveInboundReferralCode;
  const referralCode = effectiveInboundReferralCode ?? loop.referralCode;
  const founderNetworkHref = `/${locale}/fanletter/${encodeURIComponent(
    star.id,
  )}/universe${
    referralCode ? `?ref=${encodeURIComponent(referralCode)}` : ""
  }`;
  const joinHref = buildJoinHref({
    locale,
    referralCode: joinReferralCode,
    star,
  });
  const connectHref = buildConnectHref({
    locale,
    referralCode: joinReferralCode,
    returnToHref: joinHref,
  });
  const primaryAction = getPrimaryAction({
    connectHref,
    copy,
    joinHref,
    viewerState,
  });
  const isKorean = isKoreanCopy(copy);
  const displayStarName = getDisplayStarName(star.name, copy);
  const starSocialAccount = buildFanletterAIStarSocialAccountViewModel({
    creatorMemberId: `creator:${star.id}`,
    creatorMemberInitials: getPortraitInitials(displayStarName),
    creatorMemberName: `${displayStarName} Creator`,
    creatorRole: "creator",
    starId: star.id,
  });
  const primaryReputationEventType =
    primaryAction.variant === "share" ? "referral_shared" : "founder_joined";
  const primaryActionAgentRank = {
    eventType: primaryReputationEventType,
    intent:
      primaryAction.variant === "share"
        ? "founder_referral_share"
        : primaryAction.variant === "connect"
          ? "connect_to_founder_join"
          : "founder_join_confirm",
    source: "fanletter_star_detail",
    starId: star.id,
  } satisfies AgentRankInteractionSignal;
  const primaryActionTrackingMetadata = {
    placement: "fanletter_star_detail_primary_action",
    starName: star.name,
    viewerState,
  } satisfies FunnelEventMetadata;
  const starDetailGuideSteps =
    viewerState === "founder"
      ? [
          {
            label: isKorean ? "AI 스타 발견" : "Discover",
            status: "done" as const,
          },
          {
            label: isKorean ? "Founder 참여" : "Join",
            status: "done" as const,
          },
          {
            label: isKorean ? "추천 공유" : "Share",
            status: "active" as const,
          },
          {
            label: isKorean ? "평판 기록" : "Reputation",
            status: "next" as const,
          },
        ]
      : viewerState === "member"
        ? [
            {
              label: isKorean ? "AI 스타 발견" : "Discover",
              status: "done" as const,
            },
            {
              label: isKorean ? "Founder 참여" : "Join",
              status: "active" as const,
            },
            {
              label: isKorean ? "추천 공유" : "Share",
              status: "next" as const,
            },
            {
              label: isKorean ? "평판 기록" : "Reputation",
              status: "next" as const,
            },
          ]
        : [
            {
              label: isKorean ? "AI 스타 발견" : "Discover",
              status: "done" as const,
            },
            {
              label: isKorean ? "계정 연결" : "Connect",
              status: "active" as const,
            },
            {
              label: isKorean ? "Founder 참여" : "Join",
              status: "next" as const,
            },
            {
              label: isKorean ? "평판 기록" : "Reputation",
              status: "next" as const,
            },
          ];
  const primaryReputationEventLabel =
    primaryAction.variant === "share"
      ? isKorean
        ? "추천 공유 이벤트"
        : "Referral share event"
      : isKorean
        ? "Founder 참여 이벤트"
        : "Founder join event";
  const viewerStateLabel =
    viewerState === "founder"
      ? isKorean
        ? "파운더"
        : "Founder"
      : viewerState === "member"
        ? isKorean
          ? "회원"
          : "Member"
        : isKorean
          ? "방문자"
          : "Guest";
  const starDetailOutcomeCards = [
    {
      label: isKorean ? "현재 위치" : "Current",
      value: displayStarName,
      detail: `${viewerStateLabel} · ${copy.labels.starScore} ${star.starScore}`,
    },
    {
      label: isKorean ? "다음 행동" : "Next action",
      value: primaryAction.label,
      detail: primaryAction.status,
    },
    {
      label: isKorean ? "평판 이벤트" : "Reputation event",
      value: primaryReputationEventLabel,
      detail: primaryReputationEventType,
      isStrong: true,
    },
  ];

  return (
    <main className="fanletter-v2-surface min-h-screen bg-white pb-28 text-black">
      <FanletterReputationTracker
        agentRank={{
          eventType: "ai_star_discovered",
          intent: "fanletter_star_detail_view",
          source: "fanletter_star_detail",
          starId: star.id,
        }}
        metadata={{
          founderCount: star.founderCount,
          growthPercent: star.growthPercent,
          openSlots: star.openSlots.open,
          page: "fanletter_star_detail",
          coverageAction: coverageAction?.action ?? null,
          coverageActionStarId: coverageAction?.starId ?? null,
          starName: star.name,
          starScore: star.starScore,
          viewerState,
        }}
        referralCode={referralCode}
      />
      <section
        className="overflow-hidden border-b border-zinc-200 bg-white px-4 pb-8 pt-5 text-black sm:px-6 sm:pb-16 sm:pt-6 lg:px-8"
        style={{
          background: `radial-gradient(circle at 12% 8%, ${star.accentColor}12, transparent 32%), radial-gradient(circle at 84% 10%, rgba(24,24,27,0.08), transparent 30%), linear-gradient(180deg, #ffffff 0%, #ffffff 58%, #f4f4f5 100%)`,
        }}
      >
        <div className="mx-auto max-w-[92rem]">
          <div className="flex items-center justify-between gap-3">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition hover:border-zinc-300 hover:bg-zinc-50"
              href={`/${locale}/fanletter/characters`}
            >
              <ArrowLeft className="size-4" />
              {copy.actions.openDiscovery}
            </Link>
            <span className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800 sm:hidden">
              <ShieldCheck className="size-4" />
              {isKorean ? "미리보기" : "Mock"}
            </span>
            <span className="hidden h-10 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800 sm:inline-flex">
              <ShieldCheck className="size-4" />
              {copy.starDetail.mockNotice}
            </span>
          </div>

          {coverageAction ? (
            <FanletterAgentRankCoverageActionNotice
              action={coverageAction}
              className="mt-5"
              locale={locale}
            />
          ) : null}

          <FanletterActionGuide
            className="mt-5 hidden sm:block"
            currentLabel={
              isKorean
                ? `${displayStarName} AI 스타 유니버스`
                : `${displayStarName} AI Star Universe`
            }
            metrics={[
              {
                label: copy.labels.starScore,
                value: String(star.starScore),
              },
              {
                label: copy.labels.openSlots,
                value: `${formatNumber(star.openSlots.open, locale)}/${formatNumber(
                  star.openSlots.total,
                  locale,
                )}`,
              },
            ]}
            primaryAction={{
              href: primaryAction.href,
              label: primaryAction.label,
            }}
            primaryActionSlot={
              <StarActionLink
                action={primaryAction}
                agentRank={primaryActionAgentRank}
                className="inline-flex min-h-11 max-w-full min-w-0 items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-center text-sm font-semibold leading-tight !text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition hover:bg-zinc-800 sm:w-auto sm:px-5"
                locale={locale}
                referralCode={joinReferralCode}
                starId={star.id}
                trackingMetadata={{
                  ...primaryActionTrackingMetadata,
                  placement: "fanletter_star_detail_action_guide_primary",
                }}
              >
                <span className="min-w-0 whitespace-normal text-center leading-tight [word-break:keep-all]">
                  {primaryAction.label}
                </span>
                <ArrowRight className="size-4 shrink-0" />
              </StarActionLink>
            }
            reputationEventLabel={
              primaryReputationEventLabel
            }
            secondaryActions={[
              {
                agentRank: {
                  eventType: "universe_growth",
                  intent: "star_detail_founder_network_open",
                  source: "fanletter_star_detail",
                  starId: star.id,
                },
                eventName: "content_open",
                href: founderNetworkHref,
                label: isKorean
                  ? "파운더 네트워크 보기"
                  : "View Founder Network",
                metadata: {
                  placement: "fanletter_star_detail_founder_network_secondary",
                  starName: star.name,
                },
                referralCode,
              },
            ]}
            steps={starDetailGuideSteps}
            subtitle={primaryAction.helper}
            title={
              isKorean
                ? `다음 행동: ${primaryAction.label}`
                : `Next action: ${primaryAction.label}`
            }
          />

          <StarDetailMobileSignpost
            action={primaryAction}
            copy={copy}
            joinReferralCode={joinReferralCode}
            locale={locale}
            primaryReputationEventLabel={primaryReputationEventLabel}
            primaryReputationEventType={primaryReputationEventType}
            referralCode={referralCode}
            star={star}
            trackingAgentRank={primaryActionAgentRank}
            trackingMetadata={primaryActionTrackingMetadata}
            viewerState={viewerState}
          />

          <StarViewerRelationshipCard
            copy={copy}
            isAuthenticated={isAuthenticated}
            locale={locale}
            memberPortfolio={memberPortfolio}
            primaryAction={primaryAction}
            star={star}
            viewerState={viewerState}
          />

          <FanletterAgentRankJourneyRail
            active="founder"
            className="mt-3"
            locale={locale}
            starId={star.id}
          />

          {founderJoinCompleted ? (
            <FounderJoinResultCard
              copy={copy}
              founderNetworkHref={founderNetworkHref}
              locale={locale}
              loop={loop}
              onOpenSharePanel={() => {
                window.dispatchEvent(
                  new CustomEvent("fanletter:open-referral-share-panel", {
                    detail: {
                      starId: star.id,
                    },
                  }),
                );
              }}
              referralCode={referralCode}
              star={star}
            />
          ) : null}

          <div className="mt-3 hidden gap-2 sm:grid sm:grid-cols-3">
            {starDetailOutcomeCards.map((item) => (
              <div
                className={joinClasses(
                  "min-w-0 rounded-xl border px-3 py-2.5 shadow-[0_10px_26px_rgba(15,23,42,0.045)]",
                  item.isStrong
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 bg-white text-zinc-950",
                )}
                key={item.label}
              >
                <p
                  className={joinClasses(
                    "truncate text-[0.6rem] font-semibold uppercase tracking-[0.12em]",
                    item.isStrong ? "text-white/58" : "text-zinc-500",
                  )}
                >
                  {item.label}
                </p>
                <p className="mt-1 truncate text-sm font-semibold">
                  {item.value}
                </p>
                <p
                  className={joinClasses(
                    "mt-0.5 truncate text-[0.68rem] font-semibold",
                    item.isStrong ? "text-white/58" : "text-zinc-500",
                  )}
                >
                  {item.detail}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-7 lg:grid-cols-[1fr_24rem] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm font-semibold text-zinc-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                <Crown className="size-4" />
                {copy.starDetail.heroEyebrow}
              </div>
              <h1
                aria-label={`${displayStarName} ${copy.starDetail.universeTitle}`}
                className="mt-4 max-w-4xl text-[2.55rem] font-semibold leading-[0.98] tracking-normal [word-break:keep-all] sm:mt-5 sm:text-[5rem]"
              >
                {displayStarName}
                <span className="block text-zinc-500">
                  {copy.starDetail.universeTitle}
                </span>
              </h1>
              <p className="mt-5 hidden max-w-2xl text-base font-medium leading-7 text-black/64 sm:block sm:text-lg">
                {copy.starDetail.heroBody}
              </p>
              <FanletterTerminologyGuide
                className="mt-4 hidden max-w-2xl sm:block"
                locale={locale}
                variant="compact"
              />
              <div className="mt-4 hidden max-w-2xl rounded-lg border border-zinc-200 bg-white/88 p-3 shadow-[0_14px_34px_rgba(15,23,42,0.06)] sm:block">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {primaryAction.status}
                    </p>
                    <p className="mt-1 text-sm font-medium leading-5 text-black/58">
                      {primaryAction.helper}
                    </p>
                  </div>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 font-mono text-xs font-semibold text-zinc-700">
                    {referralCode}
                  </span>
                </div>
              </div>
              <div className="hidden max-w-2xl sm:block">
                <FounderJoinFlowHint
                  copy={copy}
                  viewerState={viewerState}
                />
                <FounderNextReputationPath
                  copy={copy}
                  referralCode={referralCode}
                  viewerState={viewerState}
                />
              </div>
              <div className="hidden sm:block">
                <StarAgentRankJoinSignal
                  locale={locale}
                  snapshot={agentRankSnapshot}
                  star={star}
                />
              </div>

              <div className="scroll-mt-24" id="star-next-action" />

              <div className="mt-5 sm:hidden">
                <StarFounderMobilePanel
                  action={primaryAction}
                  copy={copy}
                  joinReferralCode={joinReferralCode}
                  locale={locale}
                  loop={loop}
                  referralCode={referralCode}
                  star={star}
                  trackingAgentRank={primaryActionAgentRank}
                  trackingMetadata={primaryActionTrackingMetadata}
                  showAction={false}
                />
                <FounderNextReputationPath
                  copy={copy}
                  referralCode={referralCode}
                  viewerState={viewerState}
                />
              </div>

              <FanletterFounderMockStatusBanner
                className="mt-4 max-w-2xl lg:mx-0"
                locale={locale}
                starId={star.id}
                starName={displayStarName}
              />

              <FanletterAIStarSocialAccountCard
                className="mt-4 max-w-2xl lg:mx-0"
                connectHref={`/${locale}/fanletter/creator-unlock?starId=${encodeURIComponent(
                  star.id,
                )}#tiktok-channel`}
                locale={locale}
                social={starSocialAccount}
                source="fanletter_star_detail"
                starId={star.id}
                starName={displayStarName}
                starPortraitImageUrl={star.portraitImageUrl}
                starPortraitInitials={star.portraitInitials}
              />

              <div className="mt-6 hidden gap-2 sm:grid sm:grid-cols-3">
                <MetricTile
                  label={copy.labels.starScore}
                  value={String(star.starScore)}
                />
                <MetricTile
                  label={copy.labels.growth}
                  value={`+${star.growthPercent}%`}
                />
                <MetricTile
                  label={copy.labels.openSlots}
                  value={`${formatNumber(
                    star.openSlots.open,
                    locale,
                  )}/${formatNumber(star.openSlots.total, locale)}`}
                />
              </div>

            </div>

            <div className="hidden lg:block">
              <AIStarCard copy={copy} isSelected locale={locale} star={star} />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto grid max-w-[92rem] gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <FanletterStarReferralPanel
            copy={copy}
            inboundReferralCode={effectiveInboundReferralCode}
            joinHref={primaryAction.href}
            joinReferralCode={joinReferralCode}
            locale={locale}
            loop={loop}
            primaryActionHref={primaryAction.href}
            primaryActionLabel={primaryAction.label}
            primaryActionVariant={primaryAction.variant}
            starId={star.id}
          />
          <div className="grid gap-4">
            <AIStarGenealogySection
              copy={copy}
              locale={locale}
              star={displayStar}
            />
            <HumanFounderSlots copy={copy} star={star} />
            <SpawnedStarsSection copy={copy} locale={locale} star={displayStar} />
          </div>
        </div>

        <div className="mx-auto max-w-[92rem]">
          <FounderUniversePreview
            copy={copy}
            locale={locale}
            stars={[displayStar]}
          />
        </div>

        <div className="mx-auto mt-12 max-w-[92rem]">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#6d28d9]">
                {copy.labels.aiStarDiscovery}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal text-[#12041f]">
                {copy.topGrowingStars.title}
              </h2>
            </div>
            <Link
              className="hidden h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-black transition hover:border-[#7c3aed]/40 hover:text-[#5b21b6] sm:inline-flex"
              href={`/${locale}/fanletter/characters`}
            >
              {copy.actions.openDiscovery}
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {relatedStars.map((relatedStar) => (
              <AIStarCard
                copy={copy}
                detailHref={`/${locale}/fanletter/${relatedStar.id}`}
                key={relatedStar.id}
                locale={locale}
                star={relatedStar}
              />
            ))}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 rounded-lg border border-black/10 bg-white p-3 text-center">
            <div>
              <p className="text-xl font-semibold text-black">
                {formatNumber(star.founderCount, locale)}
              </p>
              <p className="mt-1 text-[0.68rem] font-semibold text-black/48">
                {copy.labels.founderCount}
              </p>
            </div>
            <div>
              <p className="text-xl font-semibold text-black">
                {formatNumber(loop.rewards.cp, locale)}
              </p>
              <p className="mt-1 text-[0.68rem] font-semibold text-black/48">
                CP
              </p>
            </div>
            <div>
              <p className="text-xl font-semibold text-black">
                {formatNumber(fanletterV2Mock.creatorUnlock.createCostUsdt, locale)} USDT
              </p>
              <p className="mt-1 text-[0.68rem] font-semibold text-black/48">
                {copy.creatorUnlock.title}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
