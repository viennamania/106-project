"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Crown,
  GitBranch,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  FanletterCreatorMockLaunchButton,
  toMemberOwnedAIStar,
  useFanletterCreatorMockLaunches,
} from "@/components/fanletter-creator-mock-launch-state";
import { FanletterTerminologyGuide } from "@/components/fanletter-terminology-guide";
import { useFanletterFounderMockMemberships } from "@/components/fanletter-founder-mock-state";
import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  CreatorUnlockCard,
  FounderRoleBadge,
  HumanMemberAvatar,
  MemberPortfolio,
} from "@/components/fanletter-founder-club-v2";
import {
  fanletterV2Mock,
  getFanletterV2Copy,
  getFanletterV2LocalizedText,
  type AIStar,
  type CreatorUnlockData,
  type MemberOwnedAIStar,
  type MemberPortfolio as MemberPortfolioData,
  type MemberPortfolioRole,
  type SpawnedAIStar,
} from "@/mock/fanletterV2";
import type { Locale } from "@/lib/i18n";

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
      heroBody:
        "크리에이터 권한 활성화 이후 여러 AI 스타를 만들 수 있는 흐름을 실제 결제 없이 먼저 검증합니다.",
      heroEyebrow: "크리에이터 권한 활성화",
      heroTitle: "Founder가 성장하면 새 AI 스타를 출시합니다",
      loginCta: "계정 연결하고 내 데이터 보기",
      loginNoticeBody:
        "지금 화면은 샘플 데이터입니다. 이메일 계정을 연결하면 내 Founder 역할, CP, 초대 성과, 생성 가능한 AI 스타가 실제 데이터로 바뀝니다.",
      loginNoticeTitle: "내 Creator Unlock 상태를 보려면 계정 연결이 필요합니다",
      mockActivation: "미리보기 활성화",
      mockNotice:
        "실결제와 영구 저장은 아직 실행하지 않습니다. 이 화면은 생성 전 구조와 포트폴리오 반영 방식을 확인하는 미리보기입니다.",
      name: "AI 스타 이름",
      launchedBody:
        "브라우저에 저장된 mock AI 스타 draft가 포트폴리오에 반영되었습니다.",
      launchedTitle: "Mock AI 스타 draft 생성됨",
      nextPortfolio: "생성 후 포트폴리오 반영",
      noSourceBody:
        "새 AI 스타는 기존 스타 유니버스의 성과를 출처로 삼아야 합니다. 먼저 AI 스타를 발견해 파운더로 참여하거나, 내 스타 유니버스를 만든 뒤 다시 진행하세요.",
      noSourcePrimary: "AI 스타 발견하기",
      noSourceSecondary: "파운더 클럽 보기",
      noSourceSubmit: "출처 스타 유니버스 필요",
      noSourceTitle: "창업 출처 스타 유니버스가 아직 없습니다",
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
        "이 브라우저의 mock Founder 참여 내역을 Creator Unlock 조건에 반영했습니다.",
      sourceSelectBody:
        "AI 스타는 창업 출처 스타 유니버스이고, 내 역할은 그 안의 파운더 네트워크에서 가진 위치입니다. CP Pool은 선택한 스타 유니버스의 상위 계층에 분배됩니다.",
      sourceSelectTitle: "창업 출처 스타 유니버스 선택",
      sourcePool: "CP Pool 분배 기준",
      source: "출처 스타 유니버스",
      steps: [
        "크리에이터 조건 충족",
        "출처 스타 유니버스 선택",
        "10 USDT 조건 미리보기",
        "내가 만든 AI 스타에 반영",
      ],
      submit: "Mock 생성 준비 완료",
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
        "A new AI Star needs an existing Star Universe as its launch source. Join an AI Star as a Founder or create your own Star Universe first, then return here.",
      noSourcePrimary: "Discover AI Stars",
      noSourceSecondary: "View Founder Club",
      noSourceSubmit: "Source Star Universe required",
      noSourceTitle: "No launch source Star Universe yet",
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
        "The AI Star is the launch source Star Universe, and My role is your position inside its Founder Network. The CP Pool is distributed to the selected Star Universe upline.",
      sourceSelectTitle: "Select launch source Star Universe",
      sourcePool: "CP Pool basis",
      source: "Source Star Universe",
      steps: [
        "Meet Creator conditions",
        "Select source Star Universe",
        "Preview 10 USDT condition",
        "Reflect in owned AI Stars",
      ],
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
    "A new AI Star needs an existing Star Universe as its launch source. Join an AI Star as a Founder or create your own Star Universe first, then return here.",
  noSourcePrimary: "Discover AI Stars",
  noSourceSecondary: "View Founder Club",
  noSourceSubmit: "Source Star Universe required",
  noSourceTitle: "No launch source Star Universe yet",
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
    "The AI Star is the launch source Star Universe, and My role is your position inside its Founder Network. The CP Pool is distributed to the selected Star Universe upline.",
  sourceSelectTitle: "Select launch source Star Universe",
  sourcePool: "CP Pool basis",
  source: "Source Star Universe",
  steps: [
    "Meet Creator conditions",
    "Select source Star Universe",
    "Preview 10 USDT condition",
    "Reflect in owned AI Stars",
  ],
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

function getMockStarById(starId: string): AIStar | null {
  const star = fanletterV2Mock.aiStars.find((item) => item.id === starId);

  return (star ?? null) as AIStar | null;
}

type SourceUniverseOption = {
  portraitImageUrl?: string | null;
  portraitInitials: string;
  role: MemberPortfolioRole["role"];
  starId: string;
  starName: string;
  starStatus?: MemberPortfolioRole["starStatus"];
  universeName: string;
};

function getSourceUniverseOptions(portfolio: MemberPortfolioData) {
  const optionsByStarId = new Map<string, SourceUniverseOption>();

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
      portraitImageUrl: ownedStar.portraitImageUrl,
      portraitInitials: ownedStar.portraitInitials ?? getInitials(ownedStar.name),
      role: "creator",
      starId: ownedStar.id,
      starName: ownedStar.name,
      starStatus: ownedStar.status,
      universeName: ownedStar.universeName ?? `${ownedStar.name} Universe`,
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
  locale,
  onSelect,
  options,
  selectedStarId,
}: {
  copy: ReturnType<typeof getLaunchPageCopy>;
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
    <section className="rounded-lg border border-violet-200 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.08)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed] text-white">
          <GitBranch className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[#6d28d9]">
            {copy.source}
          </p>
          <h2 className="text-2xl font-semibold leading-tight tracking-normal text-[#12041f]">
            {copy.sourceSelectTitle}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-black/62">
            {copy.sourceSelectBody}
          </p>
        </div>
      </div>

      <FanletterTerminologyGuide
        className="mt-4"
        locale={locale}
        variant="compact"
      />

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isSelected = option.starId === selectedStarId;

          return (
            <button
              className={joinClasses(
                "relative min-h-32 rounded-lg border p-3 text-left transition",
                isSelected
                  ? "border-[#7c3aed] bg-[#f5f0ff] ring-2 ring-[#7c3aed]/12"
                  : "border-black/8 bg-[#fbfaff] hover:border-violet-300",
              )}
              key={option.starId}
              onClick={() => onSelect(option.starId)}
              type="button"
            >
              <div className="flex items-start gap-3">
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
                      <span className="inline-flex h-7 items-center rounded-full border border-violet-100 bg-white px-2 text-[0.66rem] font-semibold text-[#6d28d9]">
                        {copy.sourcePool}
                      </span>
                    </div>
                  </div>
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
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-[#7c3aed] px-4 text-sm font-semibold text-white transition hover:bg-[#6d28d9]"
            href={`/${locale}/fanletter#top-growing-ai-stars`}
          >
            {copy.noSourcePrimary}
          </Link>
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-violet-200 bg-white px-4 text-sm font-semibold text-[#5b21b6] transition hover:bg-violet-50"
            href={`/${locale}/fanletter#founder-club`}
          >
            {copy.noSourceSecondary}
          </Link>
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
          <span className="rounded-full bg-white px-3 py-1 text-[0.68rem] font-semibold text-[#4c1d95]">
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
    <section className="rounded-lg border border-violet-200 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.08)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed] text-white">
          <BadgeCheck className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[#6d28d9]">
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
                ? "border-fuchsia-200 bg-[#faf5ff]"
                : "border-black/8 bg-[#f8f7ff]",
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
              <p className="mt-3 truncate text-xs font-semibold text-[#6d28d9]">
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
    <section className="rounded-lg border border-fuchsia-200 bg-[#faf5ff] p-4 text-[#3b0764] shadow-[0_18px_44px_rgba(168,85,247,0.1)] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white text-[#7c3aed]">
          <BadgeCheck className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold leading-tight">
            {copy.launchedTitle}
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-[#3b0764]/70">
            {copy.launchedBody}
          </p>
          <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#6d28d9]">
            AI STAR draft {launches.length}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {launches.map((launch) => (
          <div
            className="flex min-h-20 items-center justify-between gap-3 rounded-lg border border-fuchsia-200 bg-white p-3"
            key={launch.id}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {launch.name}
              </span>
              <span className="mt-1 block truncate text-xs font-semibold text-[#7c3aed]">
                {getDisplayUniverseName(
                  launch.sourceUniverseName ??
                    launch.universeName ??
                    `${launch.name} Universe`,
                  locale,
                )}
              </span>
            </span>
            <span className="inline-flex h-8 shrink-0 items-center rounded-full bg-[#7c3aed] px-3 text-xs font-semibold text-white">
              {launch.launchCostUsdt ?? 10} USDT
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AccountConnectionNotice({
  connectHref,
  copy,
}: {
  connectHref: string;
  copy: ReturnType<typeof getLaunchPageCopy>;
}) {
  return (
    <section className="mt-6 rounded-lg border border-violet-200 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.08)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed] text-white">
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
        <Link
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] px-5 text-sm font-semibold text-white transition hover:bg-[#6d28d9]"
          href={connectHref}
        >
          {copy.loginCta}
        </Link>
      </div>
    </section>
  );
}

export function FanletterCreatorUnlockPage({
  creatorUnlock,
  isSignedIn = false,
  locale,
  memberPortfolio,
}: {
  creatorUnlock?: CreatorUnlockData | null;
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
    () => getSourceUniverseOptions(portfolio),
    [portfolio],
  );
  const [selectedSourceStarId, setSelectedSourceStarId] = useState<string | null>(
    null,
  );
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
  const baseUnlock: CreatorUnlockData =
    creatorUnlock ?? fanletterV2Mock.creatorUnlock;
  const unlock = useMemo(
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
  const memberInitials =
    portfolio.memberInitials ?? getInitials(portfolio.memberName);

  return (
    <main className="min-h-screen bg-[#fbfaff] px-4 py-5 text-black sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[92rem]">
        <div className="flex items-center justify-between gap-3">
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-violet-200 bg-white px-4 text-sm font-semibold text-[#5b21b6] transition hover:bg-violet-50"
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

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-sm font-semibold text-[#6d28d9]">
              <Crown className="size-4" />
              {copy.heroEyebrow}
            </div>
            <h1 className="mt-5 max-w-4xl text-[2.55rem] font-semibold leading-[1.02] tracking-normal text-[#12041f] [word-break:keep-all] sm:text-[4.4rem]">
              {copy.heroTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-black/62 sm:text-lg">
              {copy.heroBody}
            </p>
          </div>

          <div className="rounded-lg border border-violet-200 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.08)] sm:p-5">
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
            <div className="mt-5 grid grid-cols-4 gap-2">
              {copy.steps.map((step, index) => (
                <div
                  className="rounded-lg border border-violet-100 bg-[#f8f7ff] p-2"
                  key={step}
                >
                  <p className="text-xs font-semibold text-[#6d28d9]">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-2 text-xs font-semibold leading-4 text-[#26113d]">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {isPreviewMode ? (
          <AccountConnectionNotice connectHref={connectHref} copy={copy} />
        ) : null}

        <MockFounderRewardSummary
          locale={locale}
          membershipCount={effectiveMembershipStarIds.length}
        />

        <section className="mt-8 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="grid min-w-0 gap-4">
            <CreatorUnlockCard
              copy={v2Copy}
              locale={locale}
              unlock={unlock}
            />
            {requiresSourceUniverse ? (
              <SourceUniverseEmptyState copy={copy} locale={locale} />
            ) : (
              <SourceUniverseSelector
                copy={copy}
                locale={locale}
                onSelect={setSelectedSourceStarId}
                options={sourceOptions}
                selectedStarId={selectedSourceOption?.starId ?? null}
              />
            )}
            <section className="rounded-lg border border-violet-200 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.08)] sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed] text-white">
                  <Sparkles className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#6d28d9]">
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

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
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
                  <Link
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#7c3aed] px-4 text-sm font-semibold text-white transition hover:bg-[#6d28d9]"
                    href={`/${locale}/fanletter#top-growing-ai-stars`}
                  >
                    {copy.noSourcePrimary}
                  </Link>
                ) : isPreviewMode ? (
                  <Link
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#7c3aed] px-4 text-sm font-semibold text-white transition hover:bg-[#6d28d9]"
                    href={connectHref}
                  >
                    {copy.loginCta}
                  </Link>
                ) : (
                  <FanletterCreatorMockLaunchButton
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#7c3aed] px-4 text-sm font-semibold text-white transition hover:bg-[#6d28d9] disabled:cursor-wait disabled:opacity-70"
                    launchCostUsdt={unlock.createCostUsdt}
                    locale={locale}
                    name={launchPreview.name}
                    ownerName={launchPreview.ownerName}
                    sourceStarId={
                      selectedSourceOption?.starId ??
                      launchPreview.ownedPreview.spawnedFromStarId
                    }
                    sourceUniverseName={launchPreview.sourceUniverseName}
                  />
                )}
              </div>
            </section>
          </div>

          <div className="grid min-w-0 gap-4">
            <section className="rounded-lg border border-violet-200 bg-white p-4 shadow-[0_18px_44px_rgba(88,28,135,0.08)] sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#7c3aed] text-white">
                  <Bot className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#6d28d9]">
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
