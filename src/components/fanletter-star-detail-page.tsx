"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Crown,
  GitBranch,
  ShieldCheck,
  Share2,
  Users,
} from "lucide-react";

import {
  type FanletterCreatorMockLaunch,
  useFanletterCreatorMockLaunches,
} from "@/components/fanletter-creator-mock-launch-state";
import { FanletterAIStarIdentity } from "@/components/fanletter-ai-star-identity";
import { FanletterPrimaryHeader } from "@/components/fanletter-primary-header";
import { FanletterAIStarSocialAccountCard } from "@/components/fanletter-ai-star-social-account-card";
import { FanletterAgentRankCoverageActionNotice } from "@/components/fanletter-agentrank-coverage-action-notice";
import {
  AIStarCard,
  FounderRoleBadge,
  HumanMemberAvatar,
} from "@/components/fanletter-founder-club-v2";
import {
  FanletterFounderJoinLink,
  FanletterFounderMockStatusBanner,
} from "@/components/fanletter-founder-mock-state";
import { FanletterReputationTracker } from "@/components/fanletter-reputation-tracker";
import { FanletterResponsiveActionPanel } from "@/components/fanletter-responsive-action-panel";
import { FanletterStarReferralPanel } from "@/components/fanletter-star-referral-panel";
import { getFanletterPublicRoleLabel } from "@/lib/fanletter-public-role";
import type { AgentRankCoverageActionContext } from "@/lib/agentrank/coverage-action";
import type { AgentRankInteractionSignal } from "@/lib/agentrank/interaction-events";
import type { FunnelEventMetadata } from "@/lib/funnel";
import { trackFunnelEvent } from "@/lib/funnel-client";
import {
  buildFanletterAIStarSocialAccountViewModel,
  getFanletterAIStarSocialStatusLabel,
  type FanletterAIStarSocialAccountViewModel,
} from "@/mock/fanletter-social-accounts";
import {
  fanletterV2Mock,
  getFanletterV2Copy,
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
        ? "이미 이 AI 스타의 팬입니다. 내 링크로 새 팬을 초대하세요."
        : "You are already a Fan of this AI Star. Invite new Fans with your link.",
      href: "#referral-builder",
      label: isKorean ? "추천 링크 공유하기" : "Share referral link",
      status: isKorean ? "참여 완료" : "Active",
      variant: "share",
    };
  }

  if (viewerState === "member") {
    return {
      helper: isKorean
        ? "계정은 연결되어 있습니다. 클릭하면 이 AI 스타 유니버스의 크리에이터 네트워크에 참여하고 내 추천 링크를 생성합니다."
        : "Your account is connected. Join this AI Star Universe Creator Network and create your referral link.",
      href: joinHref,
      label: isKorean ? "참여하기" : "Join",
      status: isKorean ? "계정 연결됨" : "Account connected",
      variant: "join",
    };
  }

  return {
    helper: isKorean
      ? "계정을 연결한 뒤 이 AI 스타의 크리에이터 네트워크 참여와 추천 보상을 이어갑니다."
      : "Connect your account, then join this AI Star Creator Network and keep referral attribution.",
    href: connectHref,
    label: isKorean ? "계정 연결하고 참여" : "Connect and join",
    status: isKorean ? "참여 전" : "Not joined",
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
        close: "참여 확인 패널 닫기",
        confirm: action.variant === "connect" ? "계정 연결 계속" : "참여 확정",
        events: "기록될 활동 기록",
        location: "현재 위치",
        next: "다음 행동",
        steps:
          action.variant === "connect"
            ? ["AI 스타 발견", "계정 연결", "참여", "활동 기록"]
            : ["AI 스타 발견", "참여", "추천 링크", "활동 기록"],
        title: "참여 확인",
      }
    : {
        close: "Close join confirmation panel",
        confirm: action.variant === "connect" ? "Continue to connect" : "Confirm join",
        events: "Activity records",
        location: "Current location",
        next: "Next action",
        steps:
          action.variant === "connect"
            ? ["Discover", "Connect", "Join", "Activity record"]
            : ["Discover", "Join", "Referral", "Activity record"],
        title: "Confirm join",
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
  social,
  star,
  viewerState,
}: {
  copy: ReturnType<typeof getFanletterV2Copy>;
  isAuthenticated: boolean;
  locale: Locale;
  memberPortfolio?: MemberPortfolioData | null;
  primaryAction: StarPrimaryAction;
  social: FanletterAIStarSocialAccountViewModel;
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
          ? "콘텐츠, TikTok 채널, AI 스타 설정을 관리할 수 있습니다."
          : isAuthenticated
            ? "이 AI 스타를 운영하는 크리에이터 권한은 없습니다."
            : "계정 연결 후 이 AI 스타의 운영 권한을 확인합니다.",
        creatorCaption: "AI 스타 채널",
        creatorLabel: "AI 스타 운영 권한",
        creatorStatus: ownedStar
          ? "운영 가능"
          : isAuthenticated
            ? "운영 권한 없음"
            : "계정 연결 필요",
        founderBody: founderRole
          ? "이 AI 스타 유니버스 안의 6단계 초대/기여 포인트 구조에 참여 중입니다."
          : isMockFounder
            ? "이 브라우저에서 참여 미리보기가 완료된 상태입니다."
            : isAuthenticated
              ? "아직 이 AI 스타의 크리에이터 네트워크에 참여하지 않았습니다."
              : "계정 연결 후 참여를 진행할 수 있습니다.",
        founderCaption: "회원 참여 역할",
        founderLabel: "크리에이터 네트워크 역할",
        founderStatus: founderRole
          ? getFanletterPublicRoleLabel(founderRole.role, "ko")
          : isMockFounder
            ? "팬"
            : isAuthenticated
              ? "참여 전"
              : "계정 연결 필요",
        guidance:
          "크리에이터는 AI 스타를 운영하는 권한이고, 팬는 이 AI 스타 유니버스 안에서 참여하는 역할입니다.",
        contextAssetLabel: "생성 맥락",
        contextGraphLabel: "관계 그래프",
        contextMoatFounder: "추천 코드 + 참여 역할",
        contextMoatLabel: "복제 난이도",
        contextMoatOwner: "운영 권한 + 공식 채널",
        creatorGraph: "Creator → TikTok",
        founderJoinRecord: "참여 기록",
        founderGraph: "Creator Network",
        nextActionLabel: "다음 행동",
        ownerNextAction: "TikTok 채널 관리",
        ownerStatus: "크리에이터 권한 활성화",
        referralRecord: "추천 공유 기록",
        recordLabel: "생성될 활동 기록",
        tiktokConnected: "TikTok 채널 연결됨",
        tiktokConnectedRecord: "TikTok 채널 연결 기록",
        tiktokDetailFallback: "AI 스타 채널 상태 확인",
        tiktokRequired: "TikTok 연결 필요",
        tiktokRequiredBody: "AI 스타 운영 권한은 활성화됐고, 이제 TikTok 채널 연결이 다음 단계입니다.",
        tiktokStatusLabel: "채널 상태",
        title: "권한과 역할",
      }
    : {
        creatorBody: ownedStar
          ? "You can manage content, TikTok channel, and AI Star settings."
          : isAuthenticated
            ? "You do not have Creator/Owner permission for this AI Star."
            : "Connect your account to check Creator/Owner permission.",
        creatorCaption: "AI Star channel",
        creatorLabel: "AI Star operating permission",
        creatorStatus: ownedStar
          ? "Can operate"
          : isAuthenticated
            ? "No operator permission"
            : "Connect account",
        founderBody: founderRole
          ? "You participate in this AI Star Universe's 6-tier invite and Contribution Points structure."
          : isMockFounder
            ? "Mock participation is complete in this browser."
            : isAuthenticated
              ? "You have not joined this AI Star's Creator Network yet."
              : "Connect your account to join as a Fan.",
        founderCaption: "Member participation role",
        founderLabel: "Creator Network role",
        founderStatus: founderRole
          ? getFanletterPublicRoleLabel(founderRole.role, "en")
          : isMockFounder
            ? "Fan"
            : isAuthenticated
              ? "Not joined"
              : "Connect account",
        guidance:
          "Creator is permission to operate the AI Star. Fan is your participation role inside this AI Star Universe.",
        contextAssetLabel: "Created context",
        contextGraphLabel: "Relationship graph",
        contextMoatFounder: "Referral code + participation role",
        contextMoatLabel: "Context Moat",
        contextMoatOwner: "Operating permission + official channel",
        creatorGraph: "Creator → TikTok",
        founderJoinRecord: "Join record",
        founderGraph: "Creator Network",
        nextActionLabel: "Next action",
        ownerNextAction: "Manage TikTok channel",
        ownerStatus: "Creator permission active",
        referralRecord: "Referral share record",
        recordLabel: "Activity record",
        tiktokConnected: "TikTok channel connected",
        tiktokConnectedRecord: "TikTok channel connection record",
        tiktokDetailFallback: "Review AI Star channel status",
        tiktokRequired: "TikTok connection required",
        tiktokRequiredBody:
          "AI Star operating permission is active. Connecting TikTok is the next step.",
        tiktokStatusLabel: "Channel status",
        title: "Permission and role",
      };
  const tiktokStatus = social.account
    ? getFanletterAIStarSocialStatusLabel({
        locale,
        status: social.account.status,
      })
    : labels.tiktokRequired;
  const tiktokDetail = social.account
    ? `${social.account.handle} · ${tiktokStatus}`
    : labels.tiktokRequiredBody;
  const relationshipAction: {
    detail: string;
    eventType: AgentRankInteractionSignal["eventType"];
    href: string;
    label: string;
    status: string;
  } = ownedStar
    ? {
        detail: tiktokDetail,
        eventType: "creator_social_connected",
        href: `/${locale}/fanletter/creator-unlock/tiktok?starId=${encodeURIComponent(star.id)}`,
        label: social.account ? labels.ownerNextAction : labels.tiktokRequired,
        status: social.account ? labels.tiktokConnected : labels.tiktokRequired,
      }
    : {
        detail: primaryAction.helper,
        eventType: primaryAction.variant === "share"
          ? "referral_shared"
          : "founder_joined",
        href: primaryAction.href,
        label: primaryAction.label,
        status: primaryAction.status,
      };
  const relationshipEventLabel =
    relationshipAction.eventType === "creator_social_connected"
      ? labels.tiktokConnectedRecord
      : relationshipAction.eventType === "referral_shared"
        ? labels.referralRecord
        : labels.founderJoinRecord;
  const displayStarName = getDisplayStarName(star.name, copy);
  const contextProofItems = [
    {
      done:
        relationshipAction.eventType !== "creator_social_connected" ||
        Boolean(social.account),
      label: labels.contextAssetLabel,
      value:
        relationshipAction.eventType === "creator_social_connected" &&
        !social.account
          ? labels.tiktokRequired
          : relationshipEventLabel,
    },
    {
      done: true,
      label: labels.contextGraphLabel,
      value: `${displayStarName} · ${
        ownedStar ? labels.creatorGraph : labels.founderGraph
      }`,
    },
    {
      done:
        relationshipAction.eventType !== "creator_social_connected" ||
        Boolean(social.account),
      label: labels.contextMoatLabel,
      value: ownedStar ? labels.contextMoatOwner : labels.contextMoatFounder,
    },
  ];

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
            {displayStarName}
          </p>
          <p className="mt-2 hidden text-xs font-semibold leading-5 text-zinc-500 [word-break:keep-all] sm:block">
            {labels.guidance}
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-zinc-900 bg-zinc-950 p-3 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-white/42">
                {labels.creatorCaption}
              </p>
              <p className="flex items-center gap-1.5 truncate text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white/50">
                <Bot className="size-3.5 shrink-0" />
                {labels.creatorLabel}
              </p>
              <p className="mt-1 truncate text-base font-semibold">
                {ownedStar ? tiktokStatus : labels.creatorStatus}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-white/16 bg-white px-2 py-1 text-[0.6rem] font-semibold text-black">
              Creator
            </span>
          </div>
          <p className="mt-2 text-xs font-semibold leading-5 text-white/58 [word-break:keep-all]">
            {ownedStar ? tiktokDetail : labels.creatorBody}
          </p>
        </div>

        <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                {labels.founderCaption}
              </p>
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
            ) : (
              <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-1 text-[0.6rem] font-semibold text-zinc-600">
                Fan
              </span>
            )}
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
            <p
              className="mt-1 truncate text-xs font-semibold text-zinc-500"
              title={relationshipAction.eventType}
            >
              {labels.recordLabel}: {relationshipEventLabel}
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-zinc-500 [word-break:keep-all] sm:hidden">
              {relationshipAction.detail}
            </p>
          </div>
          {ownedStar ? (
            <Link
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 text-sm font-semibold !text-white transition hover:bg-zinc-800"
              href={relationshipAction.href}
              onClick={() => {
                trackFunnelEvent("share_click", {
                  agentRank: {
                    eventType: relationshipAction.eventType,
                    intent: "creator_tiktok_channel_manage",
                    source: "fanletter_star_detail",
                    starId: star.id,
                  },
                  metadata: {
                    placement: "star_viewer_relationship_card",
                    relationship: "creator_owner",
                    starName: star.name,
                  },
                });
              }}
            >
              {relationshipAction.label}
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <StarActionLink
              action={primaryAction}
              agentRank={{
                eventType: relationshipAction.eventType,
                intent: "star_relationship_founder_action_started",
                source: "fanletter_star_detail",
                starId: star.id,
              }}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 text-sm font-semibold !text-white transition hover:bg-zinc-800"
              locale={locale}
              starId={star.id}
              trackingMetadata={{
                placement: "star_viewer_relationship_founder_action",
                relationship: "founder_network",
                starName: star.name,
              }}
            >
              {relationshipAction.label}
              <ArrowRight className="size-4" />
            </StarActionLink>
          )}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {contextProofItems.map((item) => (
            <div
              className={joinClasses(
                "min-w-0 rounded-xl border px-3 py-2.5",
                item.done
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-zinc-200 bg-white",
              )}
              key={item.label}
            >
              <p
                className={joinClasses(
                  "truncate text-[0.62rem] font-semibold uppercase tracking-[0.1em]",
                  item.done ? "text-emerald-700" : "text-zinc-500",
                )}
              >
                {item.label}
              </p>
              <p className="mt-1 break-words text-xs font-semibold leading-5 text-zinc-950 [word-break:keep-all]">
                {item.value}
              </p>
            </div>
          ))}
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
        ? "팬"
        : "Fan"
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
        <p className="mb-2 inline-flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          <Bot className="size-3.5" />
          {isKorean ? "현재 위치" : "Current"}
        </p>
        <FanletterAIStarIdentity
          accentColor={star.accentColor}
          accentSecondary={star.accentSecondary}
          badgeLabel="AI STAR"
          compact
          meta={isKorean ? "AI 스타 유니버스" : "AI Star Universe"}
          name={displayStarName}
          portraitImageUrl={star.portraitImageUrl}
          portraitInitials={star.portraitInitials}
          statusLabel={viewerStateLabel}
          universeName={getDisplayUniverseName(star.universeName, copy)}
        />

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            {
              label: isKorean ? "내 상태" : "Status",
              value: viewerStateLabel,
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
              {isKorean ? "생성될 활동 기록" : "Activity record"}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-zinc-950">
              {primaryReputationEventLabel}
            </p>
          </div>
          <span
            className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[0.66rem] font-semibold text-zinc-600"
            title={primaryReputationEventLabel}
          >
            {isKorean ? "기록 준비" : "Record ready"}
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
          {isKorean ? "크리에이터 네트워크 보기" : "View Creator Network"}
        </Link>
      </div>
    </section>
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
        body: "추천 코드가 생성되었고, 보상과 활동 기록이 준비되었습니다.",
        event: "생성된 활동 기록",
        network: "크리에이터 네트워크 보기",
        share: "추천 링크 공유하기",
        title: "참여 완료",
      }
    : {
        body: "Your referral code is ready, with rewards and activity records prepared.",
        event: "Activity records",
        network: "View Creator Network",
        share: "Share referral link",
        title: "Join complete",
      };
  const resultMetrics = [
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

          <div className="mt-4 grid grid-cols-2 gap-2">
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
            {copy.roles.creator}
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

export function FanletterStarDetailPage({
  coverageAction = null,
  founderJoinCompleted = false,
  isAuthenticated = false,
  inboundReferralCode,
  locale,
  memberPortfolio,
  star,
  viewerScoutShareLoop,
}: {
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
  const primaryReputationEventLabel =
    primaryAction.variant === "share"
      ? isKorean
        ? "추천 공유 이벤트"
        : "Referral share event"
      : isKorean
        ? "참여 기록"
        : "Join event";

  return (
    <main className="fanletter-v2-surface min-h-screen bg-white pb-28 text-black">
      <FanletterReputationTracker
        agentRank={{
          eventType: "ai_star_discovered",
          intent: "fanletter_star_detail_view",
          source: "fanletter_star_detail",
          starId: displayStar.id,
        }}
        metadata={{
          founderCount: displayStar.founderCount,
          growthPercent: displayStar.growthPercent,
          openSlots: displayStar.openSlots.open,
          page: "fanletter_star_detail",
          coverageAction: coverageAction?.action ?? null,
          coverageActionStarId: coverageAction?.starId ?? null,
          starName: displayStar.name,
          starScore: displayStar.starScore,
          viewerState,
        }}
        referralCode={referralCode}
      />
      <section
        className="overflow-hidden border-b border-zinc-200 bg-white pb-8 pt-5 text-black sm:pb-16 sm:pt-6"
        style={{
          background: `radial-gradient(circle at 12% 8%, ${star.accentColor}12, transparent 32%), radial-gradient(circle at 84% 10%, rgba(24,24,27,0.08), transparent 30%), linear-gradient(180deg, #ffffff 0%, #ffffff 58%, #f4f4f5 100%)`,
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FanletterPrimaryHeader
            current="discovery"
            locale={locale}
            referralCode={null}
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Link
              className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition hover:border-zinc-300 hover:bg-zinc-50"
              href={`/${locale}/fanletter/discovery`}
            >
              <ArrowLeft className="size-4 shrink-0" />
              {copy.actions.openDiscovery}
            </Link>
            <span className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800 sm:hidden">
              <ShieldCheck className="size-4" />
              {isKorean ? "미리보기" : "Mock"}
            </span>
            <span className="hidden h-10 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800 sm:inline-flex">
              <ShieldCheck className="size-4" />
              {copy.starDetail.mockNotice}
            </span>
          </div>

          <StarDetailMobileSignpost
            action={primaryAction}
            copy={copy}
            joinReferralCode={joinReferralCode}
            locale={locale}
            primaryReputationEventLabel={primaryReputationEventLabel}
            referralCode={referralCode}
            star={star}
            trackingAgentRank={primaryActionAgentRank}
            trackingMetadata={primaryActionTrackingMetadata}
            viewerState={viewerState}
          />

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
              <div className="scroll-mt-24" id="star-next-action" />

              <FanletterFounderMockStatusBanner
                className="mt-4 max-w-2xl lg:mx-0"
                locale={locale}
                starId={star.id}
                starName={displayStarName}
              />

              <FanletterAIStarSocialAccountCard
                className="mt-4 hidden max-w-2xl sm:block lg:mx-0"
                connectHref={`/${locale}/fanletter/creator-unlock/tiktok?starId=${encodeURIComponent(
                  star.id,
                )}`}
                locale={locale}
                social={starSocialAccount}
                source="fanletter_star_detail"
                starId={star.id}
                starName={displayStarName}
                starPortraitImageUrl={star.portraitImageUrl}
                starPortraitInitials={star.portraitInitials}
              />

              <div className="mt-6 hidden gap-2 sm:grid sm:grid-cols-2">
                <MetricTile
                  label={copy.labels.growth}
                  value={`+${displayStar.growthPercent}%`}
                />
                <MetricTile
                  label={copy.labels.openSlots}
                  value={`${formatNumber(
                    displayStar.openSlots.open,
                    locale,
                  )}/${formatNumber(displayStar.openSlots.total, locale)}`}
                />
              </div>

            </div>

            <div className="hidden lg:block">
              <AIStarCard copy={copy} isSelected locale={locale} star={displayStar} />
            </div>
          </div>

          <StarViewerRelationshipCard
            copy={copy}
            isAuthenticated={isAuthenticated}
            locale={locale}
            memberPortfolio={memberPortfolio}
            primaryAction={primaryAction}
            social={starSocialAccount}
            star={displayStar}
            viewerState={viewerState}
          />

          {founderJoinCompleted ? (
            <div className="mt-10 border-t border-zinc-200 pt-6">
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
            </div>
          ) : null}
          {coverageAction ? (
            <FanletterAgentRankCoverageActionNotice
              action={coverageAction}
              className="mt-6"
              locale={locale}
            />
          ) : null}
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 lg:px-8 xl:grid-cols-[1.05fr_0.95fr]">
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
          <HumanFounderSlots copy={copy} star={displayStar} />
        </div>

        <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-black/45">
              {isKorean ? "이 스타의 네트워크" : "This star's network"}
            </h2>
            <Link
              className="inline-flex items-center gap-1 text-sm font-semibold text-black/55 transition hover:text-black"
              href={founderNetworkHref}
            >
              {isKorean ? "전체 네트워크 보기" : "View full network"}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

      </section>
    </main>
  );
}
