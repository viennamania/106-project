"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Crown,
  Database,
  GitBranch,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ComponentProps } from "react";

import {
  type FanletterCreatorMockLaunch,
  FanletterCreatorMockLaunchButton,
  toMemberOwnedAIStar,
  useFanletterCreatorMockLaunches,
} from "@/components/fanletter-creator-mock-launch-state";
import { FanletterActionGuide } from "@/components/fanletter-action-guide";
import { FanletterAgentRankJourneyRail } from "@/components/fanletter-agentrank-journey-rail";
import { FanletterAgentRankCoverageActionNotice } from "@/components/fanletter-agentrank-coverage-action-notice";
import { FanletterReputationTracker } from "@/components/fanletter-reputation-tracker";
import { FanletterResponsiveActionPanel } from "@/components/fanletter-responsive-action-panel";
import { FanletterTrackedLink } from "@/components/fanletter-tracked-link";
import { FanletterTerminologyGuide } from "@/components/fanletter-terminology-guide";
import { useFanletterFounderMockMemberships } from "@/components/fanletter-founder-mock-state";
import {
  useFanletterAIStarServerSocialAccount,
} from "@/components/fanletter-social-account-mock-state";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import { trackFunnelEvent } from "@/lib/funnel-client";
import {
  CreatorUnlockCard,
  FounderRoleBadge,
  HumanMemberAvatar,
  MemberPortfolio,
} from "@/components/fanletter-founder-club-v2";
import type { AgentRankFounderContributionAggregate } from "@/lib/agentrank/score";
import type { AgentRankCoverageActionContext } from "@/lib/agentrank/coverage-action";
import {
  fanletterV2Mock,
  getFanletterV2Copy,
  getFanletterV2LocalizedText,
  type AIStar,
  type CreatorUnlockCondition,
  type CreatorUnlockData,
  type MemberOwnedAIStar,
  type MemberPortfolio as MemberPortfolioData,
  type MemberPortfolioRole,
  type SpawnedAIStar,
} from "@/mock/fanletterV2";
import type { Locale } from "@/lib/i18n";

type CreatorUnlockGuideAction = ComponentProps<
  typeof FanletterActionGuide
>["primaryAction"];
type CreatorUnlockResolvedGuideAction = NonNullable<CreatorUnlockGuideAction>;

function getCreatorJourneyReputationLabel(
  eventType: string,
  locale: Locale,
) {
  const isKorean = locale === "ko";

  if (eventType === "creator_social_connected") {
    return isKorean ? "TikTok 채널 연결 기록" : "TikTok channel connected";
  }

  if (eventType === "source_universe_selected") {
    return isKorean ? "출처 AI 스타 선택 기록" : "Source AI Star selected";
  }

  if (eventType === "creator_unlocked") {
    return isKorean ? "Creator 권한 활성화 기록" : "Creator permission activated";
  }

  if (eventType === "x402_mock_payment_intent") {
    return isKorean ? "10 USDT 미리보기 의도 기록" : "10 USDT mock intent recorded";
  }

  if (eventType === "ai_star_spawned") {
    return isKorean ? "새 AI 스타 생성 기록" : "New AI Star spawned";
  }

  if (eventType === "ai_star_discovered") {
    return isKorean ? "AI 스타 발견 기록" : "AI Star discovery recorded";
  }

  return isKorean ? "권한 조건 평가 기록" : "Permission condition evaluated";
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getInitials(value: string) {
  const normalized = value.replace(/[^a-zA-Z0-9가-힣\s]/g, " ").trim();
  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }

  return (words[0] ?? value).slice(0, 2).toUpperCase();
}

function getLaunchPageCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      back: "FanLetter 홈",
      category: "카테고리",
      cost: "10 USDT 미리보기",
      draft: "준비 중",
      fieldsTitle: "새 AI 스타 생성 미리보기",
      founderContribution: "Founder Contribution",
      founderContributionBody:
        "내 파운더 활동이 어느 AI 스타 유니버스에서 AgentRank 신뢰로 쌓였는지 보여줍니다.",
      contributionScore: "기여 점수",
      contributionConfidence: "신뢰도",
      contributionEvents: "이벤트",
      contributionAudit: "감사 준비",
      contributionQuality: "품질",
      heroBody:
        "조건, 출처 AI 스타 유니버스, 미리보기 생성 준비 상태만 확인합니다. 실제 결제는 아직 실행하지 않습니다.",
      heroEyebrow: "크리에이터 권한 활성화",
      heroTitle: "크리에이터 권한 상태",
      loginCta: "계정 연결하고 내 데이터 보기",
      loginNoticeBody:
        "지금 화면은 샘플 데이터입니다. 이메일 계정을 연결하면 내 Founder 역할, CP, 초대 성과, 생성 가능한 AI 스타가 실제 데이터로 바뀝니다.",
      loginNoticeTitle: "내 Creator Unlock 상태를 보려면 계정 연결이 필요합니다",
      mockActivation: "미리보기 활성화",
      mockNotice:
        "실결제와 영구 저장은 아직 실행하지 않습니다. 이 화면은 생성 전 구조와 포트폴리오 반영 방식을 확인하는 미리보기입니다.",
      name: "AI 스타 이름",
      launchedBody:
        "브라우저에 저장된 미리보기 AI 스타 draft가 포트폴리오에 반영되었습니다.",
      launchedTitle: "미리보기 AI 스타 draft 생성됨",
      nextPortfolio: "생성 후 포트폴리오 반영",
      noSourceBody:
        "새 AI 스타는 기존 AI 스타 유니버스의 성과를 출처로 삼아야 합니다. 먼저 AI 스타를 발견해 파운더로 참여하거나, 내 AI 스타 유니버스를 만든 뒤 다시 진행하세요.",
      noSourcePrimary: "AI 스타 발견하기",
      noSourceSecondary: "파운더 클럽 보기",
      noSourceSubmit: "출처 AI 스타 유니버스 필요",
      noSourceTitle: "창업 출처 AI 스타 유니버스가 아직 없습니다",
      owner: "소유 멤버",
      preview: "AI 스타 카드 미리보기",
      roleInUniverse: "네트워크 내 역할",
      sampleData: "샘플 데이터",
      sampleOwner: "샘플 멤버",
      rewardCp: "CP",
      rewardCreator: "Creator 진행률",
      rewardInfluence: "영향력",
      rewardTitle: "Founder 참여 보상 반영",
      rewardBody:
        "이 브라우저의 미리보기 Founder 참여 내역을 Creator Unlock 조건에 반영했습니다.",
      sourceSelectBody:
        "AI 스타 유니버스는 창업 출처이고, 내 역할은 그 안의 파운더 네트워크에서 가진 위치입니다. CP Pool은 선택한 AI 스타 유니버스의 상위 계층에 분배됩니다.",
      sourceSelectTitle: "창업 출처 AI 스타 유니버스 선택",
      sourcePool: "CP Pool 분배 기준",
      source: "출처 AI 스타 유니버스",
      submit: "미리보기 생성 준비 완료",
      subtitle: "실제 결제 전",
    };
  }

  if (locale === "ja") {
    return {
      back: "FanLetter Home",
      category: "Category",
      cost: "10 USDT preview",
      draft: "Draft",
      fieldsTitle: "New AI Star launch preview",
      founderContribution: "Founder Contribution",
      founderContributionBody:
        "Shows which AI Star Universes are accumulating your Founder activity as AgentRank trust.",
      contributionScore: "Contribution Score",
      contributionConfidence: "Confidence",
      contributionEvents: "Events",
      contributionAudit: "Audit",
      contributionQuality: "Quality",
      heroBody:
        "After Creator Unlock, the member can validate a multi-AI-Star launch flow before real checkout.",
      heroEyebrow: "Creator Unlock",
      heroTitle: "Founders grow into Creators who launch new AI Stars",
      loginCta: "Connect account to view my data",
      loginNoticeBody:
        "This screen is sample data. Connect your email account to switch to your Founder roles, CP, invites, and launchable AI Stars.",
      loginNoticeTitle: "Connect an account to view your Creator Unlock status",
      mockActivation: "Mock activation",
      mockNotice:
        "No real payment or permanent write runs here. This preview checks the launch structure and portfolio reflection.",
      name: "AI Star name",
      launchedBody:
        "Mock AI Star drafts saved in this browser are reflected in the portfolio.",
      launchedTitle: "Mock AI Star draft created",
      nextPortfolio: "Portfolio reflection",
      noSourceBody:
        "A new AI Star needs an existing AI Star Universe as its launch source. Join an AI Star as a Founder or create your own AI Star Universe first, then return here.",
      noSourcePrimary: "Discover AI Stars",
      noSourceSecondary: "View Founder Club",
      noSourceSubmit: "Source AI Star Universe required",
      noSourceTitle: "No launch source AI Star Universe yet",
      owner: "Owner member",
      preview: "AI Star card preview",
      roleInUniverse: "My role",
      sampleData: "Sample data",
      sampleOwner: "Sample member",
      rewardCp: "CP",
      rewardCreator: "Creator Progress",
      rewardInfluence: "Influence",
      rewardTitle: "Founder join rewards applied",
      rewardBody:
        "Mock Founder joins saved in this browser are reflected in Creator Unlock conditions.",
      sourceSelectBody:
        "The AI Star Universe is the launch source, and My role is your position inside its Founder Network. The CP Pool is distributed to the selected AI Star Universe upline.",
      sourceSelectTitle: "Select launch source AI Star Universe",
      sourcePool: "CP Pool basis",
      source: "Source AI Star Universe",
      submit: "Mock launch ready",
      subtitle: "Before real payment",
    };
  }

  return {
    back: "FanLetter Home",
    category: "Category",
    cost: "10 USDT preview",
    draft: "Draft",
    fieldsTitle: "New AI Star launch preview",
    founderContribution: "Founder Contribution",
  founderContributionBody:
      "Shows which AI Star Universes are accumulating your Founder activity as AgentRank trust.",
    contributionScore: "Contribution Score",
    contributionConfidence: "Confidence",
    contributionEvents: "Events",
    contributionAudit: "Audit",
    contributionQuality: "Quality",
    heroBody:
      "Check conditions, launch source, and mock launch readiness. Real payment is not active yet.",
    heroEyebrow: "Creator Unlock",
    heroTitle: "Creator unlock status",
    loginCta: "Connect account to view my data",
    loginNoticeBody:
      "This screen is sample data. Connect your email account to switch to your Founder roles, CP, invites, and launchable AI Stars.",
    loginNoticeTitle: "Connect an account to view your Creator Unlock status",
    mockActivation: "Mock activation",
    mockNotice:
      "No real payment or permanent write runs here. This preview checks the launch structure and portfolio reflection.",
    name: "AI Star name",
    launchedBody:
      "Mock AI Star drafts saved in this browser are reflected in the portfolio.",
    launchedTitle: "Mock AI Star draft created",
    nextPortfolio: "Portfolio reflection",
    noSourceBody:
      "A new AI Star needs an existing AI Star Universe as its launch source. Join an AI Star as a Founder or create your own AI Star Universe first, then return here.",
    noSourcePrimary: "Discover AI Stars",
    noSourceSecondary: "View Founder Club",
    noSourceSubmit: "Source AI Star Universe required",
    noSourceTitle: "No launch source AI Star Universe yet",
    owner: "Owner member",
    preview: "AI Star card preview",
    roleInUniverse: "My role",
    sampleData: "Sample data",
    sampleOwner: "Sample member",
    rewardCp: "CP",
    rewardCreator: "Creator Progress",
    rewardInfluence: "Influence",
    rewardTitle: "Founder join rewards applied",
    rewardBody:
      "Mock Founder joins saved in this browser are reflected in Creator Unlock conditions.",
    sourceSelectBody:
      "The AI Star Universe is the launch source, and My role is your position inside its Founder Network. The CP Pool is distributed to the selected AI Star Universe upline.",
    sourceSelectTitle: "Select launch source AI Star Universe",
    sourcePool: "CP Pool basis",
    source: "Source AI Star Universe",
    submit: "Mock launch ready",
    subtitle: "Before real payment",
  };
}

function getDisplayUniverseName(name: string, locale: Locale) {
  if (locale !== "ko") {
    return name;
  }

  const replacements: Record<string, string> = {
    "Founder Club Universe": "파운더 클럽 유니버스",
    "Harin Universe": "하린 유니버스",
    "Minseo Universe": "민서 유니버스",
    "Ria Universe": "리아 유니버스",
    "Seoyeon Universe": "서연 유니버스",
    "Yoonseo Universe": "윤서 유니버스",
  };

  return replacements[name] ?? name.replace(/\bUniverse\b/g, "유니버스");
}

function getCreatorUnlockConnectHref(locale: Locale) {
  return `/${locale}/fanletter/connect?returnTo=${encodeURIComponent(
    `/${locale}/fanletter/creator-unlock`,
  )}`;
}

function getSampleSpawnedStar(): SpawnedAIStar {
  return fanletterV2Mock.aiStars[0].spawnedStars[0];
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(
    value,
  );
}

function getCreatorUnlockConditionLabels(
  copy: ReturnType<typeof getFanletterV2Copy>,
): Record<string, string> {
  return {
    activityMission: copy.creatorUnlock.activityMission,
    agentRankAuditReady: copy.creatorUnlock.agentRankAuditReady,
    agentRankEventQuality: copy.creatorUnlock.agentRankEventQuality,
    cp: copy.creatorUnlock.cp,
    creatorSocialConnected: copy.creatorUnlock.creatorSocialConnected,
    directInvites: copy.creatorUnlock.directInvites,
    founderContributionScore: copy.creatorUnlock.founderContributionScore,
    scoutScore: copy.creatorUnlock.scoutScore,
  };
}

function formatCreatorUnlockConditionValue(
  value: CreatorUnlockCondition["current"],
  locale: Locale,
) {
  if (typeof value === "number") {
    return formatNumber(value, locale);
  }

  if (locale === "ko" && value === "completed") {
    return "완료";
  }

  if (locale === "ko" && value === "pending") {
    return "대기";
  }

  return value;
}

function CreatorUnlockConditionsPanel({
  completedConditionCount,
  copy,
  locale,
  onClose,
  open,
  sourceUniverseName,
  unlock,
}: {
  completedConditionCount: number;
  copy: ReturnType<typeof getFanletterV2Copy>;
  locale: Locale;
  onClose: () => void;
  open: boolean;
  sourceUniverseName: string;
  unlock: CreatorUnlockData;
}) {
  const isKorean = locale === "ko";
  const labelsById = getCreatorUnlockConditionLabels(copy);
  const progressPercent =
    unlock.conditions.length > 0
      ? Math.round((completedConditionCount / unlock.conditions.length) * 100)
      : 0;
  const closeLabel = isKorean
    ? "권한 조건 패널 닫기"
    : "Close activation conditions panel";

  return (
    <FanletterResponsiveActionPanel
      closeLabel={closeLabel}
      description={
        isKorean
          ? "조건을 충족하면 Creator 권한이 활성화되고, 이후 미리보기 생성 행동은 AgentRank 평판 이벤트로 기록됩니다."
          : "When conditions are met, Creator permission is activated, and mock launch actions become AgentRank reputation events."
      }
      eyebrow="Creator Journey"
      onClose={onClose}
      open={open}
      title={isKorean ? "권한 활성화 조건" : "Activation conditions"}
    >
      <div className="grid gap-4">
        <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                {isKorean ? "진행률" : "Progress"}
              </p>
              <p className="mt-1 text-2xl font-semibold text-zinc-950">
                {completedConditionCount}/{unlock.conditions.length}
              </p>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
              {progressPercent}%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-black"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        </section>

        <section className="grid gap-2">
          {unlock.conditions.map((condition) => (
            <div
              className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-3"
              key={condition.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-5 text-zinc-950 [word-break:keep-all]">
                    {labelsById[condition.id] ?? condition.id}
                  </p>
                  <p className="mt-1 text-xs font-medium text-zinc-500">
                    {formatCreatorUnlockConditionValue(condition.current, locale)}
                    {" / "}
                    {formatCreatorUnlockConditionValue(condition.target, locale)}
                  </p>
                </div>
                <span
                  className={joinClasses(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                    condition.met
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-zinc-100 text-zinc-600",
                  )}
                >
                  {condition.met
                    ? isKorean
                      ? "완료"
                      : "Done"
                    : isKorean
                      ? "필요"
                      : "Needed"}
                </span>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
            AgentRank
          </p>
          <div className="mt-3 grid gap-2">
            {[
              "creator_unlock_evaluated",
              "creator_social_connected",
              "creator_unlocked",
              "x402_mock_payment_intent",
              "ai_star_spawned",
            ].map((eventName, index) => (
              <div
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                key={eventName}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <span className="min-w-0 truncate font-mono text-xs font-semibold text-zinc-700">
                  {eventName}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs font-medium leading-5 text-zinc-500 [word-break:keep-all]">
            {isKorean
              ? `${sourceUniverseName}의 성과를 출처로 새 AI 스타 생성 이벤트가 연결됩니다.`
              : `The new AI Star launch is linked to ${sourceUniverseName} as its source universe.`}
          </p>
        </section>
      </div>
    </FanletterResponsiveActionPanel>
  );
}

function getMockStarById(starId: string): AIStar | null {
  const star = fanletterV2Mock.aiStars.find((item) => item.id === starId);

  return (star ?? null) as AIStar | null;
}

type SourceUniverseOption = {
  contribution?: AgentRankFounderContributionAggregate["universes"][number] | null;
  portraitImageUrl?: string | null;
  portraitInitials: string;
  role: MemberPortfolioRole["role"];
  starId: string;
  starName: string;
  starStatus?: MemberPortfolioRole["starStatus"];
  universeName: string;
};

function getSourceUniverseOptions(
  portfolio: MemberPortfolioData,
  founderContribution?: AgentRankFounderContributionAggregate | null,
) {
  const optionsByStarId = new Map<string, SourceUniverseOption>();
  const contributionByStarId = new Map(
    founderContribution?.universes.map((universe) => [
      universe.starId,
      universe,
    ]) ?? [],
  );

  for (const role of portfolio.roles) {
    if (!role.starId) {
      continue;
    }

    const mockStar = getMockStarById(role.starId);
    const starName =
      role.starName ?? mockStar?.name ?? role.universeName ?? role.starId;

    optionsByStarId.set(role.starId, {
      portraitImageUrl: role.portraitImageUrl ?? mockStar?.portraitImageUrl,
      portraitInitials:
        role.portraitInitials ?? mockStar?.portraitInitials ?? getInitials(starName),
      contribution: contributionByStarId.get(role.starId) ?? null,
      role: role.role,
      starId: role.starId,
      starName,
      starStatus: role.starStatus,
      universeName:
        role.universeName ??
        mockStar?.universeName ??
        (starName ? `${starName} Universe` : `${role.starId} Universe`),
    });
  }

  for (const ownedStar of portfolio.ownedStars) {
    if (!ownedStar.id || optionsByStarId.has(ownedStar.id)) {
      continue;
    }

    optionsByStarId.set(ownedStar.id, {
      contribution: contributionByStarId.get(ownedStar.id) ?? null,
      portraitImageUrl: ownedStar.portraitImageUrl,
      portraitInitials: ownedStar.portraitInitials ?? getInitials(ownedStar.name),
      role: "creator",
      starId: ownedStar.id,
      starName: ownedStar.name,
      starStatus: ownedStar.status,
      universeName: ownedStar.universeName ?? `${ownedStar.name} Universe`,
    });
  }

  for (const contribution of contributionByStarId.values()) {
    if (optionsByStarId.has(contribution.starId)) {
      continue;
    }

    optionsByStarId.set(contribution.starId, {
      contribution,
      portraitInitials: getInitials(contribution.starName),
      role: "founder",
      starId: contribution.starId,
      starName: contribution.starName,
      universeName: `${contribution.starName} Universe`,
    });
  }

  return Array.from(optionsByStarId.values());
}

function getDefaultSourceStarId({
  latestMembershipStarId,
  options,
  primaryStarId,
}: {
  latestMembershipStarId?: string | null;
  options: SourceUniverseOption[];
  primaryStarId?: string | null;
}) {
  return (
    options.find((option) => option.starId === latestMembershipStarId)?.starId ??
    options.find((option) => option.starId === primaryStarId)?.starId ??
    options[0]?.starId ??
    null
  );
}

function applyMockFounderRewardsToPortfolio({
  membershipStarIds,
  mockOwnedStars = [],
  portfolio,
}: {
  membershipStarIds: string[];
  mockOwnedStars?: MemberOwnedAIStar[];
  portfolio: MemberPortfolioData;
}): MemberPortfolioData {
  if (membershipStarIds.length === 0 && mockOwnedStars.length === 0) {
    return portfolio;
  }

  const existingRoleStarIds = new Set(portfolio.roles.map((role) => role.starId));
  const existingOwnedStarIds = new Set(portfolio.ownedStars.map((star) => star.id));
  const mockRoles = membershipStarIds
    .filter((starId) => !existingRoleStarIds.has(starId))
    .map<MemberPortfolioRole>((starId) => {
      const star = getMockStarById(starId);

      return {
        portraitImageUrl: star?.portraitImageUrl,
        portraitInitials: star?.portraitInitials ?? getInitials(star?.name ?? starId),
        role: "founder",
        starId,
        starName: star?.name ?? starId,
        universeName: star?.universeName ?? `${starId} Universe`,
      };
    });
  const nextOwnedStars = [
    ...mockOwnedStars.filter((star) => !existingOwnedStarIds.has(star.id)),
    ...portfolio.ownedStars,
  ];

  return {
    ...portfolio,
    cpBalance: portfolio.cpBalance + membershipStarIds.length * 100,
    creatorEligibilityPercent: Math.min(
      100,
      portfolio.creatorEligibilityPercent + membershipStarIds.length * 2,
    ),
    directInvites: portfolio.directInvites + membershipStarIds.length,
    ownedStars: nextOwnedStars,
    roles: [...portfolio.roles, ...mockRoles],
    scoutScore: Math.min(100, portfolio.scoutScore + membershipStarIds.length * 5),
    successfulInvites: portfolio.successfulInvites + membershipStarIds.length,
  };
}

function getConditionNumberTarget(target: number | string) {
  return typeof target === "number" ? target : null;
}

function applyMockFounderRewardsToUnlock({
  latestMembershipStarId,
  membershipStarIds,
  portfolio,
  unlock,
}: {
  latestMembershipStarId?: string | null;
  membershipStarIds: string[];
  portfolio: MemberPortfolioData;
  unlock: CreatorUnlockData;
}): CreatorUnlockData {
  if (membershipStarIds.length === 0) {
    return unlock;
  }

  const conditions = unlock.conditions.map((condition) => {
    if (condition.id === "scoutScore") {
      const target = getConditionNumberTarget(condition.target);

      return {
        ...condition,
        current: portfolio.scoutScore,
        met: target !== null ? portfolio.scoutScore >= target : condition.met,
      };
    }

    if (condition.id === "directInvites") {
      const target = getConditionNumberTarget(condition.target);

      return {
        ...condition,
        current: portfolio.directInvites,
        met: target !== null ? portfolio.directInvites >= target : condition.met,
      };
    }

    if (condition.id === "cp") {
      const target = getConditionNumberTarget(condition.target);

      return {
        ...condition,
        current: portfolio.cpBalance,
        met: target !== null ? portfolio.cpBalance >= target : condition.met,
      };
    }

    return condition;
  });
  const latestStar = latestMembershipStarId
    ? getMockStarById(latestMembershipStarId)
    : null;
  const sourceUniverseName =
    latestStar?.universeName ??
    unlock.launchPreview?.sourceUniverseName ??
    "Founder Club Universe";

  return {
    ...unlock,
    conditions,
    launchPreview: {
      ...(unlock.launchPreview ?? fanletterV2Mock.creatorUnlock.launchPreview),
      ownerName:
        unlock.launchPreview?.ownerName ??
        fanletterV2Mock.creatorUnlock.launchPreview?.ownerName,
      sourceUniverseName,
      status: "mock_ready",
    },
    unlocked: conditions.every((condition) => condition.met),
  };
}

function applyCreatorSocialConnectionToUnlock({
  socialConnected,
  unlock,
}: {
  socialConnected: boolean;
  unlock: CreatorUnlockData;
}): CreatorUnlockData {
  const socialCondition: CreatorUnlockCondition = {
    current: socialConnected ? "completed" : "pending",
    id: "creatorSocialConnected",
    met: socialConnected,
    target: "completed",
  };
  const hasSocialCondition = unlock.conditions.some(
    (condition) => condition.id === socialCondition.id,
  );
  const conditions = hasSocialCondition
    ? unlock.conditions.map((condition) =>
        condition.id === socialCondition.id ? socialCondition : condition,
      )
    : [...unlock.conditions, socialCondition];

  return {
    ...unlock,
    conditions,
    unlocked: conditions.every((condition) => condition.met),
  };
}

function MockFounderRewardSummary({
  locale,
  membershipCount,
}: {
  locale: Locale;
  membershipCount: number;
}) {
  if (membershipCount === 0) {
    return null;
  }

  const copy = getLaunchPageCopy(locale);

  return (
    <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-[0_18px_44px_rgba(16,185,129,0.1)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700">
          <BadgeCheck className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold leading-tight">
            {copy.rewardTitle}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-emerald-900/72">
            {copy.rewardBody}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-emerald-200 bg-white p-3">
          <p className="text-xl font-semibold">
            +{formatNumber(membershipCount * 100, locale)}
          </p>
          <p className="mt-1 text-[0.64rem] font-semibold text-emerald-900/60">
            {copy.rewardCp}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-white p-3">
          <p className="text-xl font-semibold">+{membershipCount * 5}</p>
          <p className="mt-1 text-[0.64rem] font-semibold text-emerald-900/60">
            {copy.rewardInfluence}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-white p-3">
          <p className="text-xl font-semibold">+{membershipCount * 2}%</p>
          <p className="mt-1 text-[0.64rem] font-semibold text-emerald-900/60">
            {copy.rewardCreator}
          </p>
        </div>
      </div>
    </section>
  );
}

function getLaunchPreview({
  locale,
  portfolio,
  sourceOption,
  unlock,
}: {
  locale: Locale;
  portfolio: MemberPortfolioData;
  sourceOption?: SourceUniverseOption | null;
  unlock: CreatorUnlockData;
}) {
  const sampleStar = getSampleSpawnedStar();
  const launchPreview = unlock.launchPreview;
  const name = launchPreview?.newStarName ?? sampleStar.name;
  const ownerName = launchPreview?.ownerName ?? portfolio.memberName;
  const sourceUniverseName =
    sourceOption?.universeName ??
    launchPreview?.sourceUniverseName ??
    sampleStar.sourceUniverseName ??
    portfolio.roles[0]?.universeName ??
    "Founder Club Universe";
  const ownedPreview: MemberOwnedAIStar = {
    createdByUnlock: true,
    id: `mock-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "ai-star"}`,
    launchCostUsdt: unlock.createCostUsdt,
    name,
    sourceUniverseName,
    spawnedFromStarId:
      sourceOption?.starId ?? sampleStar.spawnedFromStarId ?? null,
    status: "draft",
    universeName: `${name} Universe`,
  };

  return {
    accentColor: sampleStar.accentColor,
    accentSecondary: sampleStar.accentSecondary,
    category: getFanletterV2LocalizedText(sampleStar.specialty, locale),
    initials: sampleStar.portraitInitials || getInitials(name),
    name,
    ownedPreview,
    ownerName,
    sourceUniverseName,
    starScore: sampleStar.starScore,
  };
}

function getSelectedText(locale: Locale) {
  if (locale === "ko") {
    return "선택됨";
  }

  if (locale === "ja") {
    return "選択中";
  }

  return "Selected";
}

function SourceUniverseAIStarPortrait({
  option,
}: {
  option: SourceUniverseOption;
}) {
  return (
    <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border-2 border-[#8b5cf6] bg-[linear-gradient(145deg,#a855f7,#6d28d9_48%,#22d3ee)] text-white shadow-[0_14px_30px_rgba(124,58,237,0.2)]">
      {option.portraitImageUrl ? (
        <Image
          alt={`${option.starName} AI Star profile`}
          className="object-cover"
          fill
          sizes="5rem"
          src={option.portraitImageUrl}
          unoptimized={shouldBypassFanletterImageOptimization(
            option.portraitImageUrl,
          )}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-xl font-semibold">
          {option.portraitInitials}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#12041f]/58 via-transparent to-white/8" />
      <span className="absolute left-1.5 top-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[0.52rem] font-semibold backdrop-blur">
        AI STAR
      </span>
    </div>
  );
}

function SourceUniverseSelector({
  copy,
  coverageAction,
  locale,
  onSelect,
  options,
  selectedStarId,
}: {
  copy: ReturnType<typeof getLaunchPageCopy>;
  coverageAction?: AgentRankCoverageActionContext | null;
  locale: Locale;
  onSelect: (starId: string) => void;
  options: SourceUniverseOption[];
  selectedStarId: string | null;
}) {
  const v2Copy = getFanletterV2Copy(locale);

  if (options.length === 0) {
    return null;
  }

  return (
    <section className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-black text-white">
          <GitBranch className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-zinc-700">
            {copy.source}
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-normal text-[#12041f]">
            {copy.sourceSelectTitle}
          </h2>
          <p className="mt-2 hidden text-sm font-medium leading-6 text-black/62 sm:block">
            {copy.sourceSelectBody}
          </p>
        </div>
      </div>

      <FanletterTerminologyGuide
        className="mt-4 hidden sm:block"
        locale={locale}
        variant="compact"
      />

      <div className="mt-5 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isSelected = option.starId === selectedStarId;

          return (
            <button
              className={joinClasses(
                "relative min-h-32 min-w-0 rounded-lg border p-3 text-left transition",
                isSelected
                  ? "border-black bg-zinc-50 ring-2 ring-black/10"
                  : "border-zinc-200 bg-white hover:border-zinc-400",
              )}
              key={option.starId}
              onClick={() => {
                onSelect(option.starId);
                trackFunnelEvent("fanletter_source_universe_selected", {
                  agentRank: {
                    eventType: "source_universe_selected",
                    intent: "source_universe_selected",
                    source: "fanletter_creator_unlock",
                    starId: option.starId,
                  },
                  metadata: {
                    contributionConfidence: option.contribution?.confidence ?? null,
                    contributionAuditReadyPercent:
                      option.contribution?.readiness.auditReadyPercent ?? null,
                    contributionEventCount: option.contribution?.eventCount ?? null,
                    contributionEventQualityPercent:
                      option.contribution?.readiness.eventQualityPercent ?? null,
                    contributionScore: option.contribution?.score ?? null,
                    coverageAction: coverageAction?.action ?? null,
                    coverageActionStarId: coverageAction?.starId ?? null,
                    placement: "creator_unlock_source_universe_selector",
                    roleInUniverse: option.role,
                    sourceUniverseId: `fanletter-star-universe:${option.starId}`,
                    sourceUniverseName: option.universeName,
                    starName: option.starName,
                  },
                  targetHref: `/${locale}/fanletter/creator-unlock`,
                });
              }}
              type="button"
            >
              <div className="flex min-w-0 items-start gap-3">
                <SourceUniverseAIStarPortrait option={option} />
                <div className="min-w-0 flex-1 pr-16 pt-0.5">
                  <p className="truncate text-lg font-semibold text-[#12041f]">
                    {option.starName}
                  </p>
                  <p className="mt-1 truncate text-xs font-semibold text-black/46">
                    {getDisplayUniverseName(option.universeName, locale)}
                  </p>
                  <div className="mt-3">
                    <p className="mb-1 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-black/38">
                      {copy.roleInUniverse}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <FounderRoleBadge copy={v2Copy} role={option.role} />
                      <span className="inline-flex h-7 items-center rounded-full border border-zinc-200 bg-white px-2 text-[0.66rem] font-semibold text-zinc-700">
                        {copy.sourcePool}
                      </span>
                    </div>
                  </div>
                  {option.contribution ? (
                    <div className="mt-3 grid min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-5">
                      <div className="rounded-lg bg-white px-2 py-2">
                        <p className="text-sm font-semibold text-[#12041f]">
                          {formatNumber(option.contribution.score, locale)}
                        </p>
                        <p className="mt-0.5 text-[0.56rem] font-semibold text-black/40">
                          {copy.contributionScore}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white px-2 py-2">
                        <p className="text-sm font-semibold text-[#12041f]">
                          {option.contribution.confidence}%
                        </p>
                        <p className="mt-0.5 text-[0.56rem] font-semibold text-black/40">
                          {copy.contributionConfidence}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white px-2 py-2">
                        <p className="text-sm font-semibold text-[#12041f]">
                          {formatNumber(option.contribution.eventCount, locale)}
                        </p>
                        <p className="mt-0.5 text-[0.56rem] font-semibold text-black/40">
                          {copy.contributionEvents}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white px-2 py-2">
                        <p className="text-sm font-semibold text-[#12041f]">
                          {option.contribution.readiness.auditReadyPercent}%
                        </p>
                        <p className="mt-0.5 text-[0.56rem] font-semibold text-black/40">
                          {copy.contributionAudit}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white px-2 py-2">
                        <p className="text-sm font-semibold text-[#12041f]">
                          {option.contribution.readiness.eventQualityPercent}%
                        </p>
                        <p className="mt-0.5 text-[0.56rem] font-semibold text-black/40">
                          {copy.contributionQuality}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
                {isSelected ? (
                  <span className="absolute right-3 top-3 inline-flex h-7 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 text-[0.66rem] font-semibold text-emerald-800">
                    {getSelectedText(locale)}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SourceUniverseNetworkLinkCard({
  copy,
  locale,
  option,
}: {
  copy: ReturnType<typeof getLaunchPageCopy>;
  locale: Locale;
  option?: SourceUniverseOption | null;
}) {
  if (!option) {
    return null;
  }

  const isKorean = locale === "ko";
  const displayUniverseName = getDisplayUniverseName(
    option.universeName,
    locale,
  );
  const roleLabel =
    getFanletterV2Copy(locale).roles[option.role] ??
    option.role.replace(/_/g, " ");
  const founderNetworkHref = `/${locale}/fanletter/${encodeURIComponent(
    option.starId,
  )}/universe`;
  const labels = isKorean
    ? {
        body: `새 AI 스타는 ${displayUniverseName} 안의 파운더 네트워크 성과를 출처로 기록됩니다.`,
        cta: "파운더 네트워크 보기",
        event: "source_universe_selected",
        role: "내 역할",
        score: "기여 점수",
        title: "출처 파운더 네트워크 확인",
      }
    : {
        body: `The new AI Star will be recorded from the Founder Network contribution inside ${displayUniverseName}.`,
        cta: "View Founder Network",
        event: "source_universe_selected",
        role: "My role",
        score: "Contribution score",
        title: "Review source Founder Network",
      };

  return (
    <section className="mt-5 rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)] sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
            <GitBranch className="size-4" />
            Creator Journey
          </p>
          <h2 className="mt-2 text-xl font-semibold leading-tight text-zinc-950 [word-break:keep-all]">
            {labels.title}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-zinc-600 [word-break:keep-all]">
            {labels.body}
          </p>
        </div>

        <FanletterTrackedLink
          agentRank={{
            eventType: "universe_growth",
            intent: "creator_unlock_source_founder_network_opened",
            source: "fanletter_creator_unlock",
            starId: option.starId,
          }}
          className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-center text-sm font-semibold leading-tight !text-white transition hover:bg-zinc-800 lg:w-auto lg:shrink-0"
          eventName="content_open"
          href={founderNetworkHref}
          metadata={{
            placement: "creator_unlock_source_founder_network_link",
            roleInUniverse: roleLabel,
            sourceUniverseId: `fanletter-star-universe:${option.starId}`,
            sourceUniverseName: option.universeName,
            starName: option.starName,
          }}
        >
          <span className="min-w-0 whitespace-normal [word-break:keep-all]">
            {labels.cta}
          </span>
          <ArrowRight className="size-4 shrink-0" />
        </FanletterTrackedLink>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          [copy.source, displayUniverseName],
          [labels.role, roleLabel],
          [
            labels.score,
            option.contribution
              ? formatNumber(option.contribution.score, locale)
              : "-",
          ],
        ].map(([label, value]) => (
          <div
            className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
            key={label}
          >
            <p className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-zinc-500">
              {label}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-zinc-950">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-600">
        <Database className="size-3.5 shrink-0" />
        <span className="min-w-0 truncate">{labels.event}</span>
      </div>
    </section>
  );
}

function SourceUniverseEmptyState({
  copy,
  locale,
}: {
  copy: ReturnType<typeof getLaunchPageCopy>;
  locale: Locale;
}) {
  return (
    <section className="rounded-lg border border-amber-200 bg-white p-4 shadow-[0_18px_44px_rgba(245,158,11,0.08)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <GitBranch className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-700">
              {copy.source}
            </p>
            <h2 className="text-2xl font-semibold leading-tight tracking-normal text-[#12041f]">
              {copy.noSourceTitle}
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-black/62">
              {copy.noSourceBody}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:min-w-44">
          <FanletterTrackedLink
            agentRank={{
              eventType: "ai_star_discovered",
              intent: "creator_unlock_no_source_discovery",
              source: "fanletter_creator_unlock",
            }}
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-zinc-800"
            eventName="signup_cta_click"
            href={`/${locale}/fanletter/characters`}
            metadata={{
              placement: "creator_unlock_no_source_primary",
            }}
          >
            {copy.noSourcePrimary}
          </FanletterTrackedLink>
          <FanletterTrackedLink
            agentRank={{
              eventType: "content_engaged",
              intent: "creator_unlock_no_source_founder_club",
              source: "fanletter_creator_unlock",
            }}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
            eventName="content_open"
            href={`/${locale}/fanletter/founder-club`}
            metadata={{
              placement: "creator_unlock_no_source_secondary",
            }}
          >
            {copy.noSourceSecondary}
          </FanletterTrackedLink>
        </div>
      </div>
      <FanletterTerminologyGuide
        className="mt-4"
        locale={locale}
        variant="compact"
      />
    </section>
  );
}

function FounderContributionPanel({
  contribution,
  copy,
  locale,
}: {
  contribution?: AgentRankFounderContributionAggregate | null;
  copy: ReturnType<typeof getLaunchPageCopy>;
  locale: Locale;
}) {
  if (!contribution || contribution.universes.length === 0) {
    return null;
  }

  const scorePercent = Math.round(
    (contribution.totalScore / Math.max(1, contribution.maxScore)) * 100,
  );
  const topUniverses = contribution.universes.slice(0, 3);

  return (
    <section className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg bg-gradient-to-br from-black via-zinc-900 to-zinc-700 p-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white/68">
                {copy.founderContribution}
              </p>
              <p className="mt-2 text-4xl font-semibold">
                {formatNumber(contribution.totalScore, locale)}
              </p>
            </div>
            <span className="rounded-full bg-white/14 px-3 py-1 text-xs font-semibold text-white">
              AgentRank v0
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/16">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-white"
              style={{ width: `${scorePercent}%` }}
            />
          </div>
          <p className="mt-3 text-sm font-medium leading-6 text-white/70">
            {copy.founderContributionBody}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-white/10 p-2">
              <p className="text-lg font-semibold">
                {formatNumber(contribution.summary.sourceUniverseCount, locale)}
              </p>
              <p className="text-[0.62rem] font-semibold text-white/56">
                Universe
              </p>
            </div>
            <div className="rounded-lg bg-white/10 p-2">
              <p className="text-lg font-semibold">
                {formatNumber(contribution.summary.eventCount, locale)}
              </p>
              <p className="text-[0.62rem] font-semibold text-white/56">
                {copy.contributionEvents}
              </p>
            </div>
            <div className="rounded-lg bg-white/10 p-2">
              <p className="text-lg font-semibold">{contribution.confidence}%</p>
              <p className="text-[0.62rem] font-semibold text-white/56">
                {copy.contributionConfidence}
              </p>
            </div>
          </div>
        </div>

        <div className="grid content-start gap-2">
          {topUniverses.map((universe) => (
            <div
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
              key={universe.universeId}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#12041f]">
                    {universe.starName}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-black/46">
                    {universe.role ?? "founder"} ·{" "}
                    {formatNumber(universe.eventCount, locale)}{" "}
                    {copy.contributionEvents}
                  </p>
                </div>
                <p className="shrink-0 text-xl font-semibold text-zinc-900">
                  {formatNumber(universe.score, locale)}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <span className="rounded-lg bg-white px-2 py-2 text-xs font-semibold text-[#12041f]">
                  CP {formatNumber(universe.cpTotal, locale)}
                </span>
                <span className="rounded-lg bg-white px-2 py-2 text-xs font-semibold text-[#12041f]">
                  Invite {formatNumber(universe.referralConversions, locale)}
                </span>
                <span className="rounded-lg bg-white px-2 py-2 text-xs font-semibold text-[#12041f]">
                  Oracle {universe.readiness.oracleReadyPercent}%
                </span>
                <span className="rounded-lg bg-white px-2 py-2 text-xs font-semibold text-[#12041f]">
                  {copy.contributionAudit} {universe.readiness.auditReadyPercent}%
                </span>
                <span className="rounded-lg bg-white px-2 py-2 text-xs font-semibold text-[#12041f]">
                  {copy.contributionQuality}{" "}
                  {universe.readiness.eventQualityPercent}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FieldPreview({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-black/8 bg-white px-3 py-3">
      <p className="text-[0.68rem] font-semibold text-black/44">{label}</p>
      <p className="mt-1 min-h-6 text-sm font-semibold text-black">{value}</p>
    </div>
  );
}

function LaunchAIStarPreviewCard({
  aiStarBadgeLabel,
  category,
  copy,
  initials,
  name,
  sourceUniverseName,
  starScoreLabel,
  starScore,
  unlockCost,
}: {
  aiStarBadgeLabel: string;
  category: string;
  copy: ReturnType<typeof getLaunchPageCopy>;
  initials: string;
  name: string;
  sourceUniverseName: string;
  starScoreLabel: string;
  starScore: number;
  unlockCost: number;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-fuchsia-200 bg-[#160726] text-white shadow-[0_24px_70px_rgba(88,28,135,0.22)]">
      <div className="relative aspect-[4/3] bg-[linear-gradient(145deg,#a855f7,#301052_62%,#12041f)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.76),transparent_18%),radial-gradient(circle_at_76%_24%,rgba(45,212,191,0.72),transparent_24%)]" />
        <div className="absolute inset-x-5 bottom-5 top-12 rounded-t-full bg-white/16 backdrop-blur-[2px]" />
        <div className="absolute bottom-6 left-1/2 flex size-24 -translate-x-1/2 items-center justify-center rounded-full border border-white/28 bg-black/28 text-2xl font-semibold shadow-[0_16px_34px_rgba(0,0,0,0.22)]">
          {initials}
        </div>
        <span className="absolute left-3 top-3 rounded-full bg-white/18 px-2.5 py-1 text-[0.62rem] font-semibold backdrop-blur">
          {aiStarBadgeLabel}
        </span>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-[0.68rem] font-semibold text-zinc-900">
            {aiStarBadgeLabel}
          </span>
          <span className="rounded-full border border-cyan-100/70 bg-cyan-100 px-3 py-1 text-[0.68rem] font-semibold text-cyan-950">
            {copy.mockActivation}
          </span>
        </div>
        <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-normal">
          {name}
        </h2>
        <p className="mt-1 text-sm font-medium text-white/66">{category}</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-white/12 bg-white/10 p-3">
            <p className="text-xl font-semibold">{starScore}</p>
            <p className="mt-1 text-[0.64rem] font-semibold text-white/54">
              {starScoreLabel}
            </p>
          </div>
          <div className="rounded-lg border border-white/12 bg-white/10 p-3">
            <p className="text-xl font-semibold">{unlockCost} USDT</p>
            <p className="mt-1 text-[0.64rem] font-semibold text-white/54">
              {copy.cost}
            </p>
          </div>
        </div>

        <p className="mt-4 rounded-lg border border-white/12 bg-white/8 px-3 py-2 text-xs font-semibold leading-5 text-white/72">
          {copy.source}: {sourceUniverseName}
        </p>
      </div>
    </article>
  );
}

function PortfolioReflectionPreview({
  copy,
  locale,
  ownedStars,
  previewStar,
}: {
  copy: ReturnType<typeof getLaunchPageCopy>;
  locale: Locale;
  ownedStars: MemberOwnedAIStar[];
  previewStar: MemberOwnedAIStar;
}) {
  const reflectedStars = [
    previewStar,
    ...ownedStars.filter(
      (star) =>
        star.id !== previewStar.id &&
        !(
          star.name === previewStar.name &&
          star.sourceUniverseName === previewStar.sourceUniverseName
        ),
    ),
  ].slice(0, 4);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-black text-white">
          <BadgeCheck className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-zinc-700">
            {copy.nextPortfolio}
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-normal text-[#12041f]">
            {copy.nextPortfolio}
          </h2>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {reflectedStars.map((star, index) => (
          <div
            className={joinClasses(
              "rounded-lg border p-3",
              index === 0
                ? "border-zinc-300 bg-zinc-50"
                : "border-zinc-200 bg-white",
            )}
            key={`${star.id}-${index}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-black">
                  {star.name}
                </p>
                <p className="truncate text-xs font-medium text-black/48">
                  {getDisplayUniverseName(
                    star.universeName ?? `${star.name} Universe`,
                    locale,
                  )}
                </p>
              </div>
              <span className="rounded-full bg-[#12041f] px-2.5 py-1 text-[0.62rem] font-semibold text-white">
                AI STAR
              </span>
            </div>
            {star.sourceUniverseName ? (
              <p className="mt-3 truncate text-xs font-semibold text-zinc-700">
                {copy.source}:{" "}
                {getDisplayUniverseName(star.sourceUniverseName, locale)}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function MockLaunchSavedSummary({
  launches,
  locale,
}: {
  launches: MemberOwnedAIStar[];
  locale: Locale;
}) {
  if (launches.length === 0) {
    return null;
  }

  const copy = getLaunchPageCopy(locale);

  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-zinc-950 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-900">
          <BadgeCheck className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold leading-tight">
            {copy.launchedTitle}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-zinc-600">
            {copy.launchedBody}
          </p>
          <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-zinc-700">
            AI STAR draft {launches.length}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {launches.map((launch) => (
          <div
            className="flex min-h-20 items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3"
            key={launch.id}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {launch.name}
              </span>
              <span className="mt-1 block truncate text-xs font-semibold text-zinc-700">
                {getDisplayUniverseName(
                  launch.sourceUniverseName ??
                    launch.universeName ??
                    `${launch.name} Universe`,
                  locale,
                )}
              </span>
            </span>
            <span className="inline-flex h-8 shrink-0 items-center rounded-full bg-black px-3 text-xs font-semibold text-white">
              {launch.launchCostUsdt ?? 10} USDT
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MockLaunchEventReceiptCard({
  launch,
  launchCount,
  locale,
  sourceUniverseName,
}: {
  launch?: FanletterCreatorMockLaunch | MemberOwnedAIStar | null;
  launchCount: number;
  locale: Locale;
  sourceUniverseName?: string | null;
}) {
  const isKorean = locale === "ko";
  const hasLaunch = Boolean(launch || launchCount > 0);
  const displaySourceUniverseName = launch?.sourceUniverseName
    ? getDisplayUniverseName(launch.sourceUniverseName, locale)
    : sourceUniverseName
      ? getDisplayUniverseName(sourceUniverseName, locale)
    : isKorean
      ? "선택한 AI 스타 유니버스"
      : "Selected AI Star Universe";
  const labels = isKorean
    ? {
        amount: "10 USDT mock",
        cpPool: "CP Pool 출처",
        draft: "생성된 draft",
        event: hasLaunch ? "생성된 평판 기록" : "생성될 평판 기록",
        payment: "실제 결제 없음",
        pendingName: "AI 스타 draft 생성 대기",
        source: "창업 출처",
        title: hasLaunch ? "미리보기 생성 결과" : "미리보기 생성 대기",
      }
    : {
        amount: "10 USDT mock",
        cpPool: "CP Pool source",
        draft: "Created draft",
        event: hasLaunch ? "Reputation records" : "Pending reputation records",
        payment: "No real payment",
        pendingName: "AI Star draft pending",
        source: "Launch source",
        title: hasLaunch ? "Mock launch result" : "Mock launch pending",
      };

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 text-zinc-950 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-black text-white">
          <RocketIcon />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-600">
            {labels.title}
          </p>
          <h2 className="mt-1 break-words text-xl font-semibold leading-tight [word-break:keep-all]">
            {launch?.name ??
              (hasLaunch
                ? `${labels.draft} ${launchCount}`
                : labels.pendingName)}
          </h2>
          <p className="mt-2 text-sm font-medium leading-5 text-zinc-600 [word-break:keep-all]">
            {labels.payment} · {labels.amount}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          [labels.source, displaySourceUniverseName],
          [labels.cpPool, displaySourceUniverseName],
          [labels.draft, `${launchCount}`],
        ].map(([label, value]) => (
          <div
            className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
            key={label}
          >
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-zinc-500">
              {label}
            </p>
            <p className="mt-1 break-words text-sm font-semibold leading-tight [word-break:keep-all]">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-zinc-500">
          {labels.event}
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {[
            "x402_mock_payment_intent",
            "ai_star_spawned",
            "cp_pool_generated",
          ].map((eventName) => (
            <span
              className="min-w-0 rounded-full border border-zinc-200 bg-white px-3 py-2 text-center font-mono text-[0.66rem] font-semibold text-zinc-700"
              key={eventName}
            >
              {eventName}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function RocketIcon() {
  return <Sparkles className="size-5" />;
}

function AccountConnectionNotice({
  connectHref,
  copy,
}: {
  connectHref: string;
  copy: ReturnType<typeof getLaunchPageCopy>;
}) {
  return (
    <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-black text-white">
            <BadgeCheck className="size-5" />
          </span>
          <div className="min-w-0">
            <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
              {copy.sampleData}
            </span>
            <h2 className="mt-2 text-xl font-semibold leading-tight text-[#12041f]">
              {copy.loginNoticeTitle}
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-black/62">
              {copy.loginNoticeBody}
            </p>
          </div>
        </div>
        <FanletterTrackedLink
          agentRank={{
            eventType: "creator_unlocked",
            intent: "creator_unlock_connect",
            source: "fanletter_creator_unlock",
          }}
          className="hidden min-h-11 shrink-0 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold !text-white transition hover:bg-zinc-800 sm:inline-flex"
          eventName="signup_cta_click"
          href={connectHref}
          metadata={{
            placement: "creator_unlock_account_connection_notice",
          }}
        >
          {copy.loginCta}
        </FanletterTrackedLink>
      </div>
    </section>
  );
}

function CreatorUnlockStateStrip({
  creatorSocialConnected,
  creatorSocialHandle,
  isPreviewMode,
  locale,
  nextActionTitle,
  reputationLedgerHref,
  requiresSourceUniverse,
  selectedSourceOption,
  socialSourceStarId,
  unlock,
}: {
  creatorSocialConnected: boolean;
  creatorSocialHandle?: string | null;
  isPreviewMode: boolean;
  locale: Locale;
  nextActionTitle: string;
  reputationLedgerHref: string;
  requiresSourceUniverse: boolean;
  selectedSourceOption: SourceUniverseOption | null;
  socialSourceStarId: string;
  unlock: CreatorUnlockData;
}) {
  const completedConditionCount = unlock.conditions.filter(
    (condition) => condition.met,
  ).length;
  const progressPercent =
    unlock.conditions.length > 0
      ? Math.round((completedConditionCount / unlock.conditions.length) * 100)
      : 0;
  const conditionLabels = getCreatorUnlockConditionLabels(
    getFanletterV2Copy(locale),
  );
  const nextMissingCondition = unlock.conditions.find(
    (condition) => !condition.met,
  );
  const labels =
    locale === "ko"
      ? {
          action: "다음 행동",
          connect: "계정 연결 후 실데이터 확인",
          locked: "조건 상세 확인",
          nextCondition: "다음 조건",
          recordCreated: "평판 기록 생성됨",
          reputationRecord: "평판 기록",
          socialComplete: "TikTok 연결 조건 완료",
          viewRecord: "평판 기록 보기",
          progress: "권한 진행률",
          ready: "생성 미리보기 가능",
          source: "창업 출처",
          sourceMissing: "참여한 AI 스타 유니버스 필요",
        }
      : {
          action: "Next Action",
          connect: "Connect to view live data",
          locked: "Review conditions",
          nextCondition: "Next Condition",
          recordCreated: "Reputation Record Created",
          reputationRecord: "Reputation Record",
          socialComplete: "TikTok condition complete",
          viewRecord: "View record",
          progress: "Activation Progress",
          ready: "Launch preview ready",
          source: "Launch Source",
          sourceMissing: "AI Star Universe required",
        };
  const items = [
    {
      detail: `${progressPercent}%`,
      label: labels.progress,
      tone: unlock.unlocked ? "emerald" : "violet",
      value: `${completedConditionCount}/${unlock.conditions.length}`,
    },
    {
      label: labels.source,
      tone: requiresSourceUniverse ? "amber" : "violet",
      value: requiresSourceUniverse
        ? labels.sourceMissing
        : selectedSourceOption?.universeName
          ? getDisplayUniverseName(selectedSourceOption.universeName, locale)
          : labels.sourceMissing,
    },
    {
      label:
        !isPreviewMode && !requiresSourceUniverse && nextMissingCondition
          ? labels.nextCondition
          : labels.action,
      tone: unlock.unlocked && !isPreviewMode && !requiresSourceUniverse
        ? "emerald"
        : "violet",
      value: isPreviewMode
        ? labels.connect
        : requiresSourceUniverse
          ? labels.sourceMissing
          : unlock.unlocked
            ? labels.ready
            : nextMissingCondition
              ? conditionLabels[nextMissingCondition.id] ?? labels.locked
              : labels.locked,
    },
  ];

  return (
    <section className="mt-4 grid w-full min-w-0 gap-2">
      <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <div
            className={joinClasses(
              "min-w-0 rounded-lg border bg-white px-3 py-3 shadow-[0_12px_28px_rgba(88,28,135,0.06)]",
              item.tone === "emerald" && "border-emerald-200",
              item.tone === "amber" && "border-amber-200",
              item.tone === "violet" && "border-zinc-200",
            )}
            key={item.label}
          >
            <p
              className={joinClasses(
                "text-[0.66rem] font-semibold uppercase tracking-[0.08em]",
                item.tone === "emerald" && "text-emerald-700",
                item.tone === "amber" && "text-amber-700",
                item.tone === "violet" && "text-zinc-700",
              )}
            >
              {item.label}
            </p>
            <p className="mt-1 break-words text-sm font-semibold leading-tight text-[#12041f] [word-break:keep-all]">
              {item.value}
            </p>
            {"detail" in item && item.detail ? (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-black"
                  style={{ width: item.detail }}
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {creatorSocialConnected ? (
        <div className="grid min-w-0 gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-950 shadow-[0_12px_28px_rgba(16,185,129,0.08)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-emerald-700">
              <CheckCircle2 className="size-3.5" />
              {labels.recordCreated}
            </p>
            <p className="mt-1 break-words text-sm font-semibold leading-tight [word-break:keep-all]">
              {labels.socialComplete}
            </p>
            <span className="mt-2 inline-flex min-h-7 max-w-full items-center rounded-full bg-white px-2.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
              <span className="min-w-0 truncate">
                {creatorSocialHandle ?? "creator_social_connected"}
              </span>
            </span>
          </div>
          <div className="min-w-0 rounded-lg border border-emerald-200 bg-white/72 px-3 py-2">
            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-emerald-700">
              {labels.action}
            </p>
            <p className="mt-1 break-words text-sm font-semibold leading-tight text-emerald-950 [word-break:keep-all]">
              {nextActionTitle.replace(/^(다음 행동|Next action):\s*/i, "")}
            </p>
          </div>
          <FanletterTrackedLink
            agentRank={{
              eventType: "content_engaged",
              intent: "creator_unlock_social_connection_ledger_opened",
              source: "fanletter_creator_unlock",
              starId: socialSourceStarId,
            }}
            className="inline-flex min-h-10 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-black px-4 py-2 text-center text-sm font-semibold leading-tight !text-white transition hover:bg-zinc-800 lg:w-auto"
            eventName="content_open"
            href={reputationLedgerHref}
            metadata={{
              creatorJourneyConditionId: "creatorSocialConnected",
              creatorJourneyConditionMet: true,
              ledgerFilter: "creator_social_connected",
              placement: "creator_unlock_state_strip_social_ledger",
              socialHandle: creatorSocialHandle ?? null,
              socialSourceStarId,
            }}
          >
            <Database className="size-4 shrink-0" />
            <span className="min-w-0 whitespace-normal text-center [word-break:keep-all]">
              {labels.viewRecord}
            </span>
            <ArrowRight className="size-4 shrink-0" />
          </FanletterTrackedLink>
        </div>
      ) : null}
    </section>
  );
}

function CreatorFounderRelationshipGuide({
  locale,
  portfolio,
  requiresSourceUniverse,
  selectedSourceOption,
}: {
  locale: Locale;
  portfolio: MemberPortfolioData;
  requiresSourceUniverse: boolean;
  selectedSourceOption: SourceUniverseOption | null;
}) {
  const isKorean = locale === "ko";
  const v2Copy = getFanletterV2Copy(locale);
  const primaryOwnedStar =
    portfolio.ownedStars.find((star) => star.id === selectedSourceOption?.starId) ??
    portfolio.ownedStars[0] ??
    null;
  const selectedUniverseName =
    selectedSourceOption && !requiresSourceUniverse
      ? getDisplayUniverseName(selectedSourceOption.universeName, locale)
      : isKorean
        ? "출처 선택 필요"
        : "Source required";
  const selectedRoleLabel =
    selectedSourceOption && !requiresSourceUniverse
      ? v2Copy.roles[selectedSourceOption.role]
      : isKorean
        ? "참여 전"
        : "Not selected";
  const labels = isKorean
    ? {
        creatorBody: "콘텐츠, TikTok 채널, 스튜디오를 운영하는 AI 스타입니다.",
        creatorCount: `${formatNumber(portfolio.ownedStars.length, locale)}개 운영`,
        creatorEmpty: "운영 중인 AI 스타 없음",
        creatorEyebrow: "Creator / Owner 관계",
        creatorTitle: "내가 운영하는 AI 스타",
        founderBody: "선택한 AI 스타 유니버스 안의 6단계 초대/역할/CP 기준입니다.",
        founderCount: `${formatNumber(portfolio.roles.length, locale)}개 참여`,
        founderEyebrow: "파운더 네트워크 관계",
        founderTitle: "창업 출처 역할",
        memberEyebrow: "현재 위치",
        memberTitle: "내 Creator Journey 기준",
        source: "출처",
        status: "상태",
      }
    : {
        creatorBody: "AI Stars where you operate content, TikTok, and studio tools.",
        creatorCount: `${formatNumber(portfolio.ownedStars.length, locale)} operated`,
        creatorEmpty: "No operated AI Stars",
        creatorEyebrow: "Creator / Owner relationship",
        creatorTitle: "AI Stars I operate",
        founderBody:
          "The 6-tier invite, role, and CP structure inside the selected AI Star Universe.",
        founderCount: `${formatNumber(portfolio.roles.length, locale)} joined`,
        founderEyebrow: "Founder Network relationship",
        founderTitle: "Launch source role",
        memberEyebrow: "Current position",
        memberTitle: "My Creator Journey basis",
        source: "Source",
        status: "Status",
      };

  return (
    <section className="mt-4 grid min-w-0 gap-2 rounded-[1.15rem] border border-zinc-200 bg-white p-3.5 shadow-[0_14px_36px_rgba(15,23,42,0.055)] sm:grid-cols-3 sm:p-4">
      <div className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          {labels.memberEyebrow}
        </p>
        <div className="mt-3 flex min-w-0 items-center gap-3">
          <HumanMemberAvatar
            member={{
              initials: portfolio.memberInitials ?? getInitials(portfolio.memberName),
              name: portfolio.memberName,
            }}
            size="md"
          />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-zinc-950">
              {portfolio.memberName}
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-zinc-500">
              {labels.memberTitle}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white px-2.5 py-2 ring-1 ring-zinc-200">
            <p className="truncate text-sm font-semibold text-zinc-950">
              {labels.creatorCount}
            </p>
            <p className="mt-0.5 text-[0.62rem] font-semibold text-zinc-500">
              Creator
            </p>
          </div>
          <div className="rounded-lg bg-white px-2.5 py-2 ring-1 ring-zinc-200">
            <p className="truncate text-sm font-semibold text-zinc-950">
              {labels.founderCount}
            </p>
            <p className="mt-0.5 text-[0.62rem] font-semibold text-zinc-500">
              Founder
            </p>
          </div>
        </div>
      </div>

      <div className="min-w-0 rounded-xl border border-zinc-950 bg-zinc-950 p-3 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white/54">
              {labels.creatorEyebrow}
            </p>
            <p className="mt-1 truncate text-base font-semibold">
              {primaryOwnedStar?.name ?? labels.creatorEmpty}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[0.62rem] font-semibold text-black">
            AI STAR
          </span>
        </div>
        <div className="mt-3 flex min-w-0 items-center gap-3">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-full border border-white/14 bg-cover bg-center text-xs font-semibold text-white"
            style={
              primaryOwnedStar?.portraitImageUrl
                ? { backgroundImage: `url(${primaryOwnedStar.portraitImageUrl})` }
                : primaryOwnedStar
                  ? {
                      background:
                        "linear-gradient(145deg, #111827, #52525b 52%, #a1a1aa)",
                    }
                  : undefined
            }
          >
            {primaryOwnedStar?.portraitImageUrl
              ? null
              : primaryOwnedStar?.portraitInitials ?? <Bot className="size-4" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{labels.creatorTitle}</p>
            <p className="mt-0.5 text-xs font-semibold leading-5 text-white/56 [word-break:keep-all]">
              {labels.creatorBody}
            </p>
          </div>
        </div>
      </div>

      <div className="min-w-0 rounded-xl border border-zinc-200 bg-white p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {labels.founderEyebrow}
            </p>
            <p className="mt-1 truncate text-base font-semibold text-zinc-950">
              {labels.founderTitle}
            </p>
          </div>
          {selectedSourceOption && !requiresSourceUniverse ? (
            <FounderRoleBadge copy={v2Copy} role={selectedSourceOption.role} />
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-zinc-50 px-2.5 py-2">
            <p className="truncate text-sm font-semibold text-zinc-950">
              {selectedUniverseName}
            </p>
            <p className="mt-0.5 text-[0.62rem] font-semibold text-zinc-500">
              {labels.source}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-50 px-2.5 py-2">
            <p className="truncate text-sm font-semibold text-zinc-950">
              {selectedRoleLabel}
            </p>
            <p className="mt-0.5 text-[0.62rem] font-semibold text-zinc-500">
              {labels.status}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs font-semibold leading-5 text-zinc-500 [word-break:keep-all]">
          {labels.founderBody}
        </p>
      </div>
    </section>
  );
}

function CreatorNextActionStatusCard({
  action,
  completedConditionCount,
  isPreviewMode,
  locale,
  nextMissingCondition,
  requiresSourceUniverse,
  sourceUniverseName,
  unlock,
}: {
  action: CreatorUnlockResolvedGuideAction;
  completedConditionCount: number;
  isPreviewMode: boolean;
  locale: Locale;
  nextMissingCondition?: CreatorUnlockCondition | null;
  requiresSourceUniverse: boolean;
  sourceUniverseName: string;
  unlock: CreatorUnlockData;
}) {
  const isKorean = locale === "ko";
  const conditionLabels = getCreatorUnlockConditionLabels(
    getFanletterV2Copy(locale),
  );
  const progressPercent =
    unlock.conditions.length > 0
      ? Math.round((completedConditionCount / unlock.conditions.length) * 100)
      : 0;
  const nextConditionLabel = nextMissingCondition
    ? conditionLabels[nextMissingCondition.id] ?? nextMissingCondition.id
    : isKorean
      ? "모든 조건 완료"
      : "All conditions complete";
  const currentValue = nextMissingCondition
    ? formatCreatorUnlockConditionValue(nextMissingCondition.current, locale)
    : `${completedConditionCount}/${unlock.conditions.length}`;
  const targetValue = nextMissingCondition
    ? formatCreatorUnlockConditionValue(nextMissingCondition.target, locale)
    : "100%";
  const eventType =
    action.agentRank && "eventType" in action.agentRank
      ? action.agentRank.eventType
      : unlock.unlocked
        ? "x402_mock_payment_intent"
        : "creator_unlock_evaluated";
  const labels = isKorean
    ? {
        body: requiresSourceUniverse
          ? "먼저 AI 스타를 선택해 창업 출처를 만들어야 Creator Journey가 이어집니다."
          : isPreviewMode
            ? "계정을 연결하면 내 Founder 활동과 조건 진행률을 실데이터로 확인합니다."
            : unlock.unlocked
              ? "조건이 충족되었습니다. 미리보기 생성 행동은 x402 mock 이벤트로 기록됩니다."
              : "부족한 조건을 채우면 Creator 권한 활성화 평가 이벤트가 갱신됩니다.",
        condition: "다음 조건",
        current: "현재",
        event: "평판 기록 결과",
        eventId: "기술 ID",
        source: "창업 출처",
        target: "목표",
        title: unlock.unlocked ? "권한 활성화 준비 완료" : "다음 조건부터 처리하세요",
      }
    : {
        body: requiresSourceUniverse
          ? "Choose an AI Star first so the Creator Journey has a launch source."
          : isPreviewMode
            ? "Connect an account to evaluate your live Founder activity and conditions."
            : unlock.unlocked
              ? "Conditions are met. The mock launch action records an x402 mock event."
              : "Complete the missing condition to refresh the Creator permission evaluation event.",
        condition: "Next condition",
        current: "Current",
        event: "Reputation result",
        eventId: "Technical ID",
        source: "Launch source",
        target: "Target",
        title: unlock.unlocked ? "Permission activation ready" : "Handle the next condition first",
      };
  const reputationLabel = getCreatorJourneyReputationLabel(eventType, locale);

  return (
    <section className="mt-4 grid w-full min-w-0 gap-3 rounded-[1.1rem] border border-zinc-200 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-7 items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-zinc-600">
            Creator Journey
          </span>
          <span className="inline-flex h-7 items-center rounded-full border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700">
            {completedConditionCount}/{unlock.conditions.length} · {progressPercent}%
          </span>
        </div>
        <h2 className="mt-3 break-words text-xl font-semibold leading-tight text-zinc-950 [word-break:keep-all]">
          {labels.title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-5 text-zinc-600 [word-break:keep-all]">
          {labels.body}
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            {
              label: labels.condition,
              value: nextConditionLabel,
            },
            {
              label: labels.source,
              value: sourceUniverseName,
            },
            {
              label: labels.event,
              value: reputationLabel,
            },
          ].map((item) => (
            <div
              className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
              key={item.label}
            >
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                {item.label}
              </p>
              <p
                className={joinClasses(
                  "mt-1 break-words text-sm font-semibold leading-tight text-zinc-950 [word-break:keep-all]",
                )}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-2 break-all rounded-lg bg-zinc-50 px-3 py-2 font-mono text-[0.62rem] font-semibold leading-4 text-zinc-400">
          {labels.eventId}: {eventType}
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            { label: labels.current, value: currentValue },
            { label: labels.target, value: targetValue },
          ].map((item) => (
            <div
              className="min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2"
              key={item.label}
            >
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                {item.label}
              </p>
              <p className="mt-1 break-words text-sm font-semibold text-zinc-950">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <FanletterTrackedLink
        agentRank={action.agentRank}
        className="inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-center text-sm font-semibold leading-tight !text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition hover:bg-zinc-800 lg:w-auto lg:shrink-0"
        eventName="signup_cta_click"
        href={action.href}
        metadata={{
          ...action.metadata,
          nextConditionId: nextMissingCondition?.id ?? null,
          placement: "creator_unlock_next_action_status_card",
          sourceUniverseName,
        }}
        referralCode={action.referralCode}
      >
        <span className="min-w-0 whitespace-normal text-center [word-break:keep-all]">
          {action.label}
        </span>
        <ArrowRight className="size-4 shrink-0" />
      </FanletterTrackedLink>
    </section>
  );
}

function CreatorJourneyEventPath({
  hasMockLaunches,
  isPreviewMode,
  locale,
  requiresSourceUniverse,
  sourceUniverseName,
  unlock,
}: {
  hasMockLaunches: boolean;
  isPreviewMode: boolean;
  locale: Locale;
  requiresSourceUniverse: boolean;
  sourceUniverseName: string;
  unlock: CreatorUnlockData;
}) {
  const isKorean = locale === "ko";
  const labels = isKorean
    ? {
        active: "현재",
        done: "완료",
        next: "다음",
        source: "출처",
        subtitle: "선택한 AI 스타 유니버스의 성과가 새 AI 스타 생성 기록으로 이어집니다.",
        title: "행동이 평판 기록으로 이어지는 흐름",
      }
    : {
        active: "Now",
        done: "Done",
        next: "Next",
        source: "Source",
        subtitle:
          "The selected AI Star Universe becomes the source of the new AI Star creation record.",
        title: "How actions become reputation records",
      };
  const steps = [
    {
      body: requiresSourceUniverse
        ? isKorean
          ? "AI 스타 유니버스 선택 필요"
          : "Choose an AI Star Universe"
        : sourceUniverseName,
      eventType: "source_universe_selected",
      icon: GitBranch,
      label: isKorean ? "출처 선택" : "Source selected",
      status: requiresSourceUniverse ? "active" : "done",
    },
    {
      body: isKorean ? "조건 충족 후 권한 활성화" : "Activate after conditions",
      eventType: "creator_unlocked",
      icon: BadgeCheck,
      label: isKorean ? "권한 활성화" : "Permission active",
      status: requiresSourceUniverse
        ? "next"
        : unlock.unlocked
          ? "done"
          : "active",
    },
    {
      body: isKorean ? "실결제 없이 의도만 기록" : "Mock intent, no real payment",
      eventType: "x402_mock_payment_intent",
      icon: CircleDollarSign,
      label: isKorean ? "10 USDT 미리보기" : "10 USDT preview",
      status: hasMockLaunches
        ? "done"
        : unlock.unlocked && !requiresSourceUniverse && !isPreviewMode
          ? "active"
          : "next",
    },
    {
      body: isKorean ? "새 AI 스타 draft 생성" : "Create AI Star draft",
      eventType: "ai_star_spawned",
      icon: Sparkles,
      label: isKorean ? "AI 스타 생성" : "AI Star spawned",
      status: hasMockLaunches ? "done" : "next",
    },
  ] as const;

  return (
    <section className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            {isKorean ? "평판 기록" : "Reputation records"}
          </p>
          <h2 className="mt-1 text-xl font-semibold leading-tight text-[#12041f]">
            {labels.title}
          </h2>
          <p className="mt-1 text-sm font-medium leading-5 text-zinc-500 [word-break:keep-all]">
            {labels.subtitle}
          </p>
        </div>
        <span className="inline-flex min-h-8 max-w-full items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 text-xs font-semibold text-zinc-700">
          <span className="min-w-0 truncate">
            {labels.source}: {sourceUniverseName}
          </span>
        </span>
      </div>

      <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-4">
        {steps.map((step) => {
          const Icon = step.icon;
          const isDone = step.status === "done";
          const isActive = step.status === "active";

          return (
            <div
              className={joinClasses(
                "min-w-0 rounded-lg border p-3",
                isDone && "border-emerald-200 bg-emerald-50",
                isActive && "border-zinc-950 bg-zinc-50",
                !isDone && !isActive && "border-zinc-200 bg-white",
              )}
              key={step.eventType}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={joinClasses(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    isDone && "bg-emerald-600 text-white",
                    isActive && "bg-black text-white",
                    !isDone && !isActive && "bg-zinc-100 text-zinc-500",
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </span>
                <span
                  className={joinClasses(
                    "rounded-full px-2 py-0.5 text-[0.62rem] font-semibold",
                    isDone && "bg-white text-emerald-800",
                    isActive && "bg-white text-zinc-950",
                    !isDone && !isActive && "bg-zinc-100 text-zinc-500",
                  )}
                >
                  {isDone ? labels.done : isActive ? labels.active : labels.next}
                </span>
              </div>
              <p className="mt-3 break-words text-sm font-semibold leading-5 text-[#12041f] [word-break:keep-all]">
                {step.label}
              </p>
              <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-zinc-500 [word-break:keep-all]">
                {step.body}
              </p>
              <p className="mt-3 break-words text-[0.62rem] font-semibold leading-4 text-zinc-500">
                {getCreatorJourneyReputationLabel(step.eventType, locale)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function FanletterCreatorUnlockPage({
  creatorUnlock,
  coverageAction = null,
  founderContribution,
  isSignedIn = false,
  locale,
  memberPortfolio,
}: {
  creatorUnlock?: CreatorUnlockData | null;
  coverageAction?: AgentRankCoverageActionContext | null;
  founderContribution?: AgentRankFounderContributionAggregate | null;
  isSignedIn?: boolean;
  locale: Locale;
  memberPortfolio?: MemberPortfolioData | null;
}) {
  const v2Copy = getFanletterV2Copy(locale);
  const copy = getLaunchPageCopy(locale);
  const connectHref = getCreatorUnlockConnectHref(locale);
  const isPreviewMode = !isSignedIn;
  const mockMembershipsByStarId = useFanletterFounderMockMemberships();
  const mockLaunchesById = useFanletterCreatorMockLaunches();
  const mockOwnedStars = useMemo(
    () => Object.values(mockLaunchesById).map(toMemberOwnedAIStar),
    [mockLaunchesById],
  );
  const membershipStarIds = useMemo(
    () => Object.keys(mockMembershipsByStarId),
    [mockMembershipsByStarId],
  );
  const latestMembershipStarId = useMemo(
    () =>
      Object.values(mockMembershipsByStarId).sort((left, right) =>
        right.joinedAt.localeCompare(left.joinedAt),
      )[0]?.starId ?? null,
    [mockMembershipsByStarId],
  );
  const effectiveMembershipStarIds = useMemo(
    () => (isPreviewMode ? [] : membershipStarIds),
    [isPreviewMode, membershipStarIds],
  );
  const effectiveLatestMembershipStarId = isPreviewMode
    ? null
    : latestMembershipStarId;
  const effectiveMockOwnedStars = useMemo(
    () => (isPreviewMode ? [] : mockOwnedStars),
    [isPreviewMode, mockOwnedStars],
  );
  const basePortfolio: MemberPortfolioData =
    memberPortfolio ?? fanletterV2Mock.memberPortfolio;
  const portfolio = useMemo(
    () =>
      applyMockFounderRewardsToPortfolio({
        membershipStarIds: effectiveMembershipStarIds,
        mockOwnedStars: effectiveMockOwnedStars,
        portfolio: basePortfolio,
      }),
    [basePortfolio, effectiveMembershipStarIds, effectiveMockOwnedStars],
  );
  const sourceOptions = useMemo(
    () => getSourceUniverseOptions(portfolio, founderContribution),
    [founderContribution, portfolio],
  );
  const [selectedSourceStarId, setSelectedSourceStarId] = useState<string | null>(
    coverageAction?.starId ?? null,
  );
  const [isConditionsPanelOpen, setIsConditionsPanelOpen] = useState(false);
  const [lastMockLaunch, setLastMockLaunch] =
    useState<FanletterCreatorMockLaunch | null>(null);
  const defaultSourceStarId = getDefaultSourceStarId({
    latestMembershipStarId: effectiveLatestMembershipStarId,
    options: sourceOptions,
    primaryStarId: portfolio.primaryStarId,
  });
  const activeSourceStarId = selectedSourceStarId ?? defaultSourceStarId;
  const selectedSourceOption =
    sourceOptions.find((option) => option.starId === activeSourceStarId) ??
    sourceOptions[0] ??
    null;
  const requiresSourceUniverse = isSignedIn && !selectedSourceOption;
  const memberInitials =
    portfolio.memberInitials ?? getInitials(portfolio.memberName);
  const trackingSourceStarId =
    coverageAction?.starId ??
    selectedSourceOption?.starId ??
    portfolio.primaryStarId;
  const socialSourceStarId =
    trackingSourceStarId ?? selectedSourceOption?.starId ?? "minseo";
  const tiktokChannelHref = `/${locale}/fanletter/creator-unlock/tiktok?starId=${encodeURIComponent(
    socialSourceStarId,
  )}`;
  const creatorJourneyServerSocialAccount = useFanletterAIStarServerSocialAccount({
    platform: "tiktok",
    starId: socialSourceStarId,
  });
  const creatorJourneyEffectiveSocialAccount = creatorJourneyServerSocialAccount;
  const creatorJourneySocialConnected = Boolean(
    creatorJourneyEffectiveSocialAccount,
  );
  const baseUnlock: CreatorUnlockData =
    creatorUnlock ?? fanletterV2Mock.creatorUnlock;
  const unlockBeforeSocialCondition = useMemo(
    () =>
      applyMockFounderRewardsToUnlock({
        latestMembershipStarId: effectiveLatestMembershipStarId,
        membershipStarIds: effectiveMembershipStarIds,
        portfolio,
        unlock: baseUnlock,
      }),
    [
      baseUnlock,
      effectiveLatestMembershipStarId,
      effectiveMembershipStarIds,
      portfolio,
    ],
  );
  const unlock = useMemo(
    () =>
      applyCreatorSocialConnectionToUnlock({
        socialConnected: creatorJourneySocialConnected,
        unlock: unlockBeforeSocialCondition,
      }),
    [creatorJourneySocialConnected, unlockBeforeSocialCondition],
  );
  const launchPreview = getLaunchPreview({
    locale,
    portfolio,
    sourceOption: selectedSourceOption,
    unlock,
  });
  const sourceUniverseName = getDisplayUniverseName(
    launchPreview.sourceUniverseName,
    locale,
  );
  const displaySourceUniverseName = requiresSourceUniverse
    ? copy.noSourceSubmit
    : sourceUniverseName;
  const completedConditionCount = unlock.conditions.filter(
    (condition) => condition.met,
  ).length;
  const nextMissingCondition = unlock.conditions.find(
    (condition) => !condition.met,
  );
  const isCreatorSocialNextAction =
    !unlock.unlocked && nextMissingCondition?.id === "creatorSocialConnected";
  const getConditionCurrent = (id: string) =>
    unlock.conditions.find((condition) => condition.id === id)?.current ?? null;
  const getConditionMet = (id: string) =>
    unlock.conditions.find((condition) => condition.id === id)?.met ?? false;
  const getConditionTarget = (id: string) =>
    unlock.conditions.find((condition) => condition.id === id)?.target ?? null;
  const shouldTrackCoverageMockPaymentIntent =
    coverageAction?.action === "x402_mock_payment_intent" ||
    coverageAction?.action === "x402_economy";
  const shouldTrackCoverageCreatorUnlocked =
    coverageAction?.action === "creator_unlocked" && !unlock.unlocked;
  const creatorUnlockNextAction: CreatorUnlockResolvedGuideAction = requiresSourceUniverse
    ? {
        agentRank: {
          eventType: "ai_star_discovered" as const,
          intent: "creator_unlock_find_source_universe",
          source: "fanletter_creator_unlock",
          starId: trackingSourceStarId,
        },
        href: `/${locale}/fanletter/characters`,
        label: copy.noSourcePrimary,
        metadata: {
          placement: "creator_unlock_action_guide_primary",
          sourceUniverseName: displaySourceUniverseName,
        },
      }
    : isPreviewMode
      ? {
          agentRank: {
            eventType: "creator_unlocked" as const,
            intent: "creator_unlock_preview_connect",
            source: "fanletter_creator_unlock",
            starId: trackingSourceStarId,
          },
          href: connectHref,
          label: copy.loginCta,
          metadata: {
            placement: "creator_unlock_action_guide_connect",
            sourceUniverseName: displaySourceUniverseName,
          },
        }
      : unlock.unlocked
        ? {
            agentRank: {
              eventType: "x402_mock_payment_intent" as const,
              intent: "creator_unlock_ready_mock_launch",
              source: "fanletter_creator_unlock",
              starId: trackingSourceStarId,
            },
            href: "#mock-launch-panel",
            label: locale === "ko" ? "미리보기 생성 완료하기" : "Complete mock launch",
            metadata: {
              placement: "creator_unlock_action_guide_mock_launch",
              sourceUniverseName: displaySourceUniverseName,
            },
          }
        : isCreatorSocialNextAction
          ? {
              agentRank: {
                eventType: "creator_social_connected" as const,
                intent: "creator_unlock_connect_tiktok_channel",
                source: "fanletter_creator_unlock",
                starId: trackingSourceStarId,
              },
              href: tiktokChannelHref,
              label: locale === "ko" ? "TikTok 연결하기" : "Connect TikTok",
              metadata: {
                placement: "creator_unlock_action_guide_tiktok",
                sourceUniverseName: displaySourceUniverseName,
              },
            }
        : {
            agentRank: {
              eventType: "creator_unlock_evaluated" as const,
              intent: "creator_unlock_review_conditions",
              source: "fanletter_creator_unlock",
              starId: trackingSourceStarId,
            },
            href: "#creator-unlock-conditions",
            label: locale === "ko" ? "조건 확인하기" : "Review conditions",
            metadata: {
              placement: "creator_unlock_action_guide_conditions",
              sourceUniverseName: displaySourceUniverseName,
            },
          };
  const creatorUnlockNextTitle = requiresSourceUniverse
    ? locale === "ko"
      ? "다음 행동: AI 스타 발견"
      : "Next action: discover AI Stars"
    : isPreviewMode
      ? locale === "ko"
        ? "다음 행동: 계정 연결"
        : "Next action: connect account"
      : unlock.unlocked
        ? locale === "ko"
          ? "다음 행동: 미리보기 생성 완료"
          : "Next action: complete mock launch"
        : isCreatorSocialNextAction
          ? locale === "ko"
            ? "다음 행동: TikTok 채널 연결"
            : "Next action: connect TikTok channel"
        : locale === "ko"
          ? "다음 행동: 조건 확인"
          : "Next action: review conditions";
  const creatorUnlockEventLabel = requiresSourceUniverse
    ? locale === "ko"
      ? "AI Star Discovery 이벤트"
      : "AI Star Discovery event"
    : isCreatorSocialNextAction
      ? locale === "ko"
        ? "TikTok 채널 연결 이벤트"
        : "TikTok channel connection event"
    : unlock.unlocked
      ? "x402 Mock Payment Intent"
      : locale === "ko"
        ? "Creator Unlock 평가 이벤트"
        : "Creator Unlock evaluation event";
  const creatorSocialLedgerParams = new URLSearchParams({
    coverageAction: "creator_social_connected",
    limit: "40",
    sort: "latest",
    starId: socialSourceStarId,
    type: "creator_social_connected",
  });
  const creatorSocialLedgerHref = `/${locale}/fanletter/agentrank/events?${creatorSocialLedgerParams.toString()}`;
  const openConditionsPanel = () => {
    trackFunnelEvent("fanletter_creator_unlock_evaluated", {
      agentRank: {
        eventType: "creator_unlock_evaluated",
        intent: "creator_unlock_condition_panel_opened",
        source: "fanletter_creator_unlock",
        starId: selectedSourceOption?.starId ?? null,
      },
      metadata: {
        completedConditionCount,
        sourceUniverseName: displaySourceUniverseName,
        totalConditionCount: unlock.conditions.length,
        unlocked: unlock.unlocked,
      },
    });
    setIsConditionsPanelOpen(true);
  };
  const shouldUseConditionPanelAction =
    !requiresSourceUniverse &&
    !isPreviewMode &&
    !unlock.unlocked &&
    !isCreatorSocialNextAction;
  const creatorUnlockActionGuide = (
    <FanletterActionGuide
      className="mt-5"
      currentLabel={locale === "ko" ? "Creator Journey" : "Creator Journey"}
      metrics={[
        {
          label: locale === "ko" ? "조건" : "Conditions",
          value: `${completedConditionCount}/${unlock.conditions.length}`,
        },
        {
          label: locale === "ko" ? "출처" : "Source",
          value: requiresSourceUniverse
            ? locale === "ko"
              ? "필요"
              : "Required"
            : displaySourceUniverseName,
        },
      ]}
      primaryAction={creatorUnlockNextAction}
      primaryActionSlot={
        shouldUseConditionPanelAction ? (
          <button
            className="inline-flex min-h-11 max-w-full min-w-0 items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-center text-sm font-semibold leading-tight !text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition hover:bg-zinc-800 sm:w-auto sm:px-5"
            onClick={openConditionsPanel}
            type="button"
          >
            {creatorUnlockNextAction.label}
          </button>
        ) : undefined
      }
      reputationEventLabel={creatorUnlockEventLabel}
      secondaryActions={[]}
      steps={[
        {
          label: locale === "ko" ? "조건 확인" : "Check conditions",
          status:
            completedConditionCount >= unlock.conditions.length
              ? "done"
              : "active",
        },
        {
          label: locale === "ko" ? "출처 선택" : "Choose source",
          status: requiresSourceUniverse ? "active" : "done",
        },
        {
          label: locale === "ko" ? "TikTok 채널" : "TikTok channel",
          status: creatorJourneySocialConnected
            ? "done"
            : unlockBeforeSocialCondition.unlocked &&
                !requiresSourceUniverse &&
                !isPreviewMode
              ? "active"
              : "next",
        },
        {
          label: locale === "ko" ? "미리보기 생성" : "Mock launch",
          status:
            unlock.unlocked && !requiresSourceUniverse && !isPreviewMode
              ? "active"
              : "next",
        },
        {
          label: locale === "ko" ? "평판 기록" : "Reputation",
          status: unlock.unlocked ? "next" : "next",
        },
      ]}
      subtitle={
        locale === "ko"
          ? "새 AI 스타는 선택한 AI 스타 유니버스의 성과로 기록되고, 이후 CP Pool과 평판 기록으로 이어집니다."
          : "A new AI Star records the selected AI Star Universe as its launch source, then feeds CP Pool and reputation records."
      }
      title={
        creatorUnlockNextTitle
      }
    />
  );

  return (
    <main className="fanletter-v2-surface min-h-screen overflow-x-hidden bg-white px-4 py-5 text-black sm:px-6 lg:px-8">
      <FanletterReputationTracker
        agentRank={{
          eventType: "creator_unlock_evaluated",
          intent: unlock.unlocked
            ? "creator_unlock_evaluation_passed"
            : "creator_unlock_evaluation_pending",
          source: "fanletter_creator_unlock",
          starId: trackingSourceStarId,
        }}
        eventName="fanletter_creator_unlock_evaluated"
        metadata={{
          activityMissionCurrent: String(
            getConditionCurrent("activityMission") ?? "pending",
          ),
          activityMissionMet: getConditionMet("activityMission"),
          activityMissionTarget: String(
            getConditionTarget("activityMission") ?? "completed",
          ),
          completedConditionCount,
          createCostUsdt: unlock.createCostUsdt,
          creatorSocialConnectedCurrent: String(
            getConditionCurrent("creatorSocialConnected") ?? "pending",
          ),
          creatorSocialConnectedMet: getConditionMet("creatorSocialConnected"),
          creatorSocialConnectedTarget: String(
            getConditionTarget("creatorSocialConnected") ?? "completed",
          ),
          creatorUnlockEvaluated: true,
          cpCurrent: Number(getConditionCurrent("cp") ?? 0),
          cpMet: getConditionMet("cp"),
          cpTarget: Number(getConditionTarget("cp") ?? 0),
          directInvitesCurrent: Number(getConditionCurrent("directInvites") ?? 0),
          directInvitesMet: getConditionMet("directInvites"),
          directInvitesTarget: Number(getConditionTarget("directInvites") ?? 0),
          founderContributionCurrent: Number(
            getConditionCurrent("founderContributionScore") ?? 0,
          ),
          founderContributionMet: getConditionMet("founderContributionScore"),
          founderContributionTarget: Number(
            getConditionTarget("founderContributionScore") ?? 0,
          ),
          agentRankAuditReadyCurrent: Number(
            getConditionCurrent("agentRankAuditReady") ?? 0,
          ),
          agentRankAuditReadyMet: getConditionMet("agentRankAuditReady"),
          agentRankAuditReadyTarget: Number(
            getConditionTarget("agentRankAuditReady") ?? 0,
          ),
          agentRankEventQualityCurrent: Number(
            getConditionCurrent("agentRankEventQuality") ?? 0,
          ),
          agentRankEventQualityMet: getConditionMet("agentRankEventQuality"),
          agentRankEventQualityTarget: Number(
            getConditionTarget("agentRankEventQuality") ?? 0,
          ),
          isSignedIn,
          page: "fanletter_creator_unlock",
          coverageAction: coverageAction?.action ?? null,
          coverageActionStarId: coverageAction?.starId ?? null,
          requiresSourceUniverse,
          scoutScoreCurrent: Number(getConditionCurrent("scoutScore") ?? 0),
          scoutScoreMet: getConditionMet("scoutScore"),
          scoutScoreTarget: Number(getConditionTarget("scoutScore") ?? 0),
          sourceStarId: trackingSourceStarId,
          socialChannelStarId: socialSourceStarId,
          sourceUniverseId: selectedSourceOption?.starId
            ? `fanletter-star-universe:${selectedSourceOption.starId}`
            : null,
          sourceUniverseName: displaySourceUniverseName,
          totalConditionCount: unlock.conditions.length,
          unlocked: unlock.unlocked,
        }}
      />
      {shouldTrackCoverageMockPaymentIntent ? (
        <FanletterReputationTracker
          agentRank={{
            eventType: "x402_mock_payment_intent",
            intent: "coverage_mock_x402_payment_intent",
            source: "fanletter_creator_unlock",
            starId: trackingSourceStarId,
          }}
          eventName="fanletter_x402_mock_payment_intent"
          metadata={{
            amountUsdt: unlock.createCostUsdt,
            checkoutMode: "mock_coverage",
            coverageAction: coverageAction?.action ?? null,
            coverageActionStarId: coverageAction?.starId ?? null,
            currency: "USDT",
            mockPaymentIntent: true,
            page: "fanletter_creator_unlock",
            paymentStatus: "mock_intent",
            sourceStarId: trackingSourceStarId,
            sourceUniverseId: trackingSourceStarId
              ? `fanletter-star-universe:${trackingSourceStarId}`
              : null,
            sourceUniverseName: displaySourceUniverseName,
            x402Ready: true,
          }}
          targetHref={`/${locale}/fanletter/creator-unlock`}
        />
      ) : null}
      {unlock.unlocked || shouldTrackCoverageCreatorUnlocked ? (
        <FanletterReputationTracker
          agentRank={{
            eventType: "creator_unlocked",
            intent: unlock.unlocked
              ? "creator_unlock_page_ready"
              : "coverage_mock_creator_unlocked",
            source: "fanletter_creator_unlock",
            starId: trackingSourceStarId,
          }}
          eventName="fanletter_creator_unlocked"
          metadata={{
            completedConditionCount,
            createCostUsdt: unlock.createCostUsdt,
            coverageAction: coverageAction?.action ?? null,
            coverageActionStarId: coverageAction?.starId ?? null,
            coverageMockCreatorUnlocked: shouldTrackCoverageCreatorUnlocked,
            creatorUnlockReady: unlock.unlocked,
            page: "fanletter_creator_unlock",
            realCreatorUnlockState: unlock.unlocked,
            requiresSourceUniverse,
            sourceStarId: trackingSourceStarId,
            sourceUniverseId: trackingSourceStarId
              ? `fanletter-star-universe:${trackingSourceStarId}`
              : null,
            sourceUniverseName: displaySourceUniverseName,
            totalConditionCount: unlock.conditions.length,
          }}
          targetHref={`/${locale}/fanletter/creator-unlock`}
        />
      ) : null}
      <div className="mx-auto w-full min-w-0 max-w-[92rem]">
        <div className="flex items-center justify-between gap-3">
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
            href={`/${locale}/fanletter#creator-unlock`}
          >
            <ArrowLeft className="size-4" />
            {copy.back}
          </Link>
          <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="size-4" />
            {copy.subtitle}
          </span>
        </div>

        {creatorUnlockActionGuide}

        <FanletterAgentRankJourneyRail
          active="creator"
          className="mt-4"
          locale={locale}
          starId={trackingSourceStarId}
        />

        <section className="mt-6 grid w-full min-w-0 gap-4 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm font-semibold text-zinc-900">
              <Crown className="size-4" />
              {copy.heroEyebrow}
            </div>
            <h1 className="mt-4 max-w-4xl text-[2.35rem] font-semibold leading-[1.02] tracking-normal text-[#12041f] [word-break:keep-all] sm:text-[4rem]">
              {copy.heroTitle}
            </h1>
            <p className="mt-4 hidden max-w-2xl text-base font-medium leading-7 text-black/62 sm:block sm:text-lg">
              {copy.heroBody}
            </p>
          </div>

          <div className="w-full min-w-0 rounded-[1.1rem] border border-zinc-200 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.055)] sm:p-5">
            <div className="flex items-center gap-3">
              <HumanMemberAvatar
                member={{ initials: memberInitials, name: portfolio.memberName }}
                size="lg"
              />
              <div>
                <p className="text-sm font-semibold text-black/48">
                  {isPreviewMode ? copy.sampleOwner : copy.owner}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="text-2xl font-semibold text-black">
                    {portfolio.memberName}
                  </p>
                  {isPreviewMode ? (
                    <span className="inline-flex h-7 items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 text-xs font-semibold text-amber-800">
                      {copy.sampleData}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="mt-5 grid min-w-0 grid-cols-3 gap-2">
              {[
                {
                  label: locale === "ko" ? "조건" : "Conditions",
                  value: `${completedConditionCount}/${unlock.conditions.length}`,
                },
                {
                  label: copy.source,
                  value: requiresSourceUniverse
                    ? locale === "ko"
                      ? "필요"
                      : "Required"
                    : displaySourceUniverseName,
                },
                {
                  label: copy.cost,
                  value: `${unlock.createCostUsdt} USDT`,
                },
              ].map((item) => (
                <div
                  className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                  key={item.label}
                >
                  <p className="break-words text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-zinc-500 [word-break:keep-all]">
                    {item.label}
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold leading-tight text-[#12041f] [word-break:keep-all]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {coverageAction ? (
          <FanletterAgentRankCoverageActionNotice
            action={coverageAction}
            className="mt-5"
            locale={locale}
          />
        ) : null}

        {isPreviewMode ? (
          <AccountConnectionNotice connectHref={connectHref} copy={copy} />
        ) : null}

        <CreatorUnlockStateStrip
          creatorSocialConnected={creatorJourneySocialConnected}
          creatorSocialHandle={creatorJourneyEffectiveSocialAccount?.handle}
          isPreviewMode={isPreviewMode}
          locale={locale}
          nextActionTitle={creatorUnlockNextTitle}
          reputationLedgerHref={creatorSocialLedgerHref}
          requiresSourceUniverse={requiresSourceUniverse}
          selectedSourceOption={selectedSourceOption}
          socialSourceStarId={socialSourceStarId}
          unlock={unlock}
        />

        <CreatorFounderRelationshipGuide
          locale={locale}
          portfolio={portfolio}
          requiresSourceUniverse={requiresSourceUniverse}
          selectedSourceOption={selectedSourceOption}
        />

        <CreatorNextActionStatusCard
          action={creatorUnlockNextAction}
          completedConditionCount={completedConditionCount}
          isPreviewMode={isPreviewMode}
          locale={locale}
          nextMissingCondition={nextMissingCondition}
          requiresSourceUniverse={requiresSourceUniverse}
          sourceUniverseName={displaySourceUniverseName}
          unlock={unlock}
        />

        <SourceUniverseNetworkLinkCard
          copy={copy}
          locale={locale}
          option={requiresSourceUniverse ? null : selectedSourceOption}
        />

        <CreatorJourneyEventPath
          hasMockLaunches={effectiveMockOwnedStars.length > 0}
          isPreviewMode={isPreviewMode}
          locale={locale}
          requiresSourceUniverse={requiresSourceUniverse}
          sourceUniverseName={displaySourceUniverseName}
          unlock={unlock}
        />

        <section
          className="mt-5 rounded-[1.1rem] border border-zinc-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.045)] sm:p-5"
          id="tiktok-channel"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                <Bot className="size-3.5" />
                {locale === "ko" ? "AI 스타 TikTok 채널" : "AI Star TikTok channel"}
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-normal text-black">
                {creatorJourneySocialConnected
                  ? locale === "ko"
                    ? "TikTok 연결 완료"
                    : "TikTok connected"
                  : locale === "ko"
                    ? "TikTok 연결은 전용 화면에서 진행"
                    : "Connect TikTok on a focused page"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-zinc-600">
                {creatorJourneySocialConnected
                  ? locale === "ko"
                    ? `${creatorJourneyEffectiveSocialAccount?.handle ?? "TikTok"} 채널이 연결되어 평판 기록 조건에 반영되었습니다.`
                    : `${creatorJourneyEffectiveSocialAccount?.handle ?? "TikTok"} is connected and reflected in the Reputation Record condition.`
                  : locale === "ko"
                    ? "회원 개인 계정이 아니라 선택한 AI 스타의 공식 TikTok 채널을 연결합니다."
                    : "This connects the selected AI Star's official TikTok channel, not a personal member account."}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <Link
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                href={tiktokChannelHref}
              >
                {creatorJourneySocialConnected
                  ? locale === "ko"
                    ? "연결 상태 보기"
                    : "View connection"
                  : locale === "ko"
                    ? "TikTok 연결하기"
                    : "Connect TikTok"}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                href={creatorSocialLedgerHref}
              >
                {locale === "ko" ? "평판 기록 보기" : "View records"}
              </Link>
            </div>
          </div>
        </section>

        <FounderContributionPanel
          contribution={isPreviewMode ? null : founderContribution}
          copy={copy}
          locale={locale}
        />

        <MockFounderRewardSummary
          locale={locale}
          membershipCount={effectiveMembershipStarIds.length}
        />

        <section className="mt-8 grid w-full min-w-0 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="grid min-w-0 gap-4">
            <div id="creator-unlock-conditions">
              <CreatorUnlockCard
                copy={v2Copy}
                locale={locale}
                unlock={unlock}
              />
              <button
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50 sm:w-auto"
                onClick={openConditionsPanel}
                type="button"
              >
                {locale === "ko" ? "조건 상세 보기" : "View condition details"}
              </button>
              <CreatorUnlockConditionsPanel
                completedConditionCount={completedConditionCount}
                copy={v2Copy}
                locale={locale}
                onClose={() => setIsConditionsPanelOpen(false)}
                open={isConditionsPanelOpen}
                sourceUniverseName={displaySourceUniverseName}
                unlock={unlock}
              />
            </div>
            <div id="source-universe-picker">
              {requiresSourceUniverse ? (
                <SourceUniverseEmptyState copy={copy} locale={locale} />
              ) : (
                <SourceUniverseSelector
                  copy={copy}
                  coverageAction={coverageAction}
                  locale={locale}
                  onSelect={setSelectedSourceStarId}
                  options={sourceOptions}
                  selectedStarId={selectedSourceOption?.starId ?? null}
                />
              )}
            </div>
            <section
              className="w-full min-w-0 rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-5"
              id="mock-launch-panel"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-black text-white">
                  <Sparkles className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-700">
                    {copy.mockActivation}
                  </p>
                  <h2 className="text-2xl font-semibold leading-tight tracking-normal text-[#12041f]">
                    {copy.fieldsTitle}
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-black/62">
                    {copy.mockNotice}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                <FieldPreview label={copy.name} value={launchPreview.name} />
                <FieldPreview label={copy.category} value={launchPreview.category} />
                <FieldPreview
                  label={copy.source}
                  value={displaySourceUniverseName}
                />
                <FieldPreview
                  label={copy.cost}
                  value={`${unlock.createCostUsdt} USDT · ${copy.mockActivation}`}
                />
              </div>

              <div className="mt-5 flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <CircleDollarSign className="size-5" />
                  {requiresSourceUniverse ? copy.noSourceSubmit : copy.submit}
                </div>
                <span className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white">
                  {unlock.createCostUsdt} USDT
                </span>
                {requiresSourceUniverse ? (
                  <FanletterTrackedLink
                    agentRank={{
                      eventType: "ai_star_discovered",
                      intent: "creator_unlock_missing_source_discovery",
                      source: "fanletter_creator_unlock",
                    }}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-zinc-800"
                    eventName="signup_cta_click"
                    href={`/${locale}/fanletter/characters`}
                    metadata={{
                      placement: "creator_unlock_launch_missing_source",
                    }}
                  >
                    {copy.noSourcePrimary}
                  </FanletterTrackedLink>
                ) : isPreviewMode ? (
                  <FanletterTrackedLink
                    agentRank={{
                      eventType: "creator_unlocked",
                      intent: "creator_unlock_preview_connect",
                      source: "fanletter_creator_unlock",
                      starId:
                        selectedSourceOption?.starId ??
                        launchPreview.ownedPreview.spawnedFromStarId,
                    }}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-zinc-800"
                    eventName="signup_cta_click"
                    href={connectHref}
                    metadata={{
                      placement: "creator_unlock_launch_preview_connect",
                      sourceUniverseName: launchPreview.sourceUniverseName,
                    }}
                  >
                    {copy.loginCta}
                  </FanletterTrackedLink>
                ) : (
                  <FanletterCreatorMockLaunchButton
                    agentRank={{
                      eventType: "ai_star_spawned",
                      intent: "mock_ai_star_launch_completed",
                      source: "fanletter_creator_unlock",
                      starId:
                        selectedSourceOption?.starId ??
                        launchPreview.ownedPreview.spawnedFromStarId,
                    }}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-70"
                    launchCostUsdt={unlock.createCostUsdt}
                    locale={locale}
                    name={launchPreview.name}
                    onLaunch={setLastMockLaunch}
                    ownerName={launchPreview.ownerName}
                    sourceStarId={
                      selectedSourceOption?.starId ??
                      launchPreview.ownedPreview.spawnedFromStarId
                    }
                    sourceUniverseName={launchPreview.sourceUniverseName}
                    trackingMetadata={{
                      coverageAction: coverageAction?.action ?? null,
                      coverageActionStarId: coverageAction?.starId ?? null,
                      launchCostUsdt: unlock.createCostUsdt,
                      placement: "creator_unlock_mock_launch_button",
                      sourceUniverseName: launchPreview.sourceUniverseName,
                    }}
                  />
                )}
              </div>

              <div className="mt-4">
                <MockLaunchEventReceiptCard
                  launch={lastMockLaunch ?? effectiveMockOwnedStars[0] ?? null}
                  launchCount={Math.max(
                    effectiveMockOwnedStars.length,
                    lastMockLaunch ? 1 : 0,
                  )}
                  locale={locale}
                  sourceUniverseName={selectedSourceOption?.universeName ?? null}
                />
              </div>
            </section>
          </div>

          <div className="grid min-w-0 gap-4">
            <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-black text-white">
                  <Bot className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-700">
                    {copy.preview}
                  </p>
                  <h2 className="text-2xl font-semibold leading-tight tracking-normal text-[#12041f]">
                    {copy.preview}
                  </h2>
                </div>
              </div>
              <LaunchAIStarPreviewCard
                aiStarBadgeLabel={v2Copy.labels.aiStarBadge}
                category={launchPreview.category}
                copy={copy}
                initials={launchPreview.initials}
                name={launchPreview.name}
                sourceUniverseName={displaySourceUniverseName}
                starScoreLabel={v2Copy.labels.starScore}
                starScore={launchPreview.starScore}
                unlockCost={unlock.createCostUsdt}
              />
            </section>

            <PortfolioReflectionPreview
              copy={copy}
              locale={locale}
              ownedStars={portfolio.ownedStars ?? []}
              previewStar={launchPreview.ownedPreview}
            />
            <MockLaunchSavedSummary
              launches={effectiveMockOwnedStars}
              locale={locale}
            />
          </div>
        </section>

        <section className="mt-4">
          <MemberPortfolio
            copy={v2Copy}
            locale={locale}
            portfolio={portfolio}
          />
        </section>
      </div>
    </main>
  );
}
