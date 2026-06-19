"use client";

import Link from "next/link";
import { type CSSProperties, useMemo, useState } from "react";
import {
  type LucideIcon,
  ArrowLeft,
  ArrowRight,
  Bell,
  ChevronDown,
  ChevronRight,
  CircleDot,
  ExternalLink,
  Gauge,
  GitBranch,
  HelpCircle,
  Heart,
  Network,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

import {
  FounderRoleBadge,
  HumanMemberAvatar,
} from "@/components/fanletter-founder-club-v2";
import { FanletterActionGuide } from "@/components/fanletter-action-guide";
import { FanletterAIStarSocialAccountCard } from "@/components/fanletter-ai-star-social-account-card";
import { FanletterAgentRankCoverageActionNotice } from "@/components/fanletter-agentrank-coverage-action-notice";
import { getAgentRankEventTypeLabel } from "@/lib/agentrank/event-labels";
import type { AgentRankReputationEventType } from "@/lib/agentrank/reputation-events";
import { FanletterResponsiveActionPanel } from "@/components/fanletter-responsive-action-panel";
import { FanletterReputationTracker } from "@/components/fanletter-reputation-tracker";
import { FanletterTrackedLink } from "@/components/fanletter-tracked-link";
import { FanletterTerminologyGuide } from "@/components/fanletter-terminology-guide";
import type { AgentRankCoverageActionContext } from "@/lib/agentrank/coverage-action";
import { trackFunnelEvent } from "@/lib/funnel-client";
import type {
  FanletterFounderUniverseExplorerData,
  FanletterFounderUniverseExplorerNode,
  FanletterFounderUniverseExplorerSpawnedStar,
  FanletterFounderUniverseExplorerTier,
} from "@/lib/fanletter-founder-universe-explorer";
import type { Locale } from "@/lib/i18n";
import {
  getFanletterV2Copy,
  type FounderRole,
} from "@/mock/fanletterV2";
import { buildFanletterAIStarSocialAccountViewModel } from "@/mock/fanletter-social-accounts";

type ExplorerDepthFilter = "all" | number;

type FounderUniverseAgentRankScoreDimensionKey =
  | "creator"
  | "discovery"
  | "economic"
  | "network"
  | "riskPenalty"
  | "trust";

type FounderUniverseAgentRankSnapshot = {
  ers: {
    formula: string;
    maxScore: number;
    readiness: {
      a2aReady: boolean;
      oracleReady: boolean;
      reputationLedgerReady: boolean;
      x402Ready: boolean;
    };
    score: number;
    summary: {
      cpTotal: number;
      eventCount: number;
      networkEdges: number;
      oracleReadyEvents: number;
      spawnedStars: number;
      uniqueMembers: number;
      uniqueStars: number;
    };
  };
  scoreAggregate?: {
    confidence: number;
    dimensions: Array<{
      key: FounderUniverseAgentRankScoreDimensionKey;
      maxScore: number;
      rawValue: number;
      score: number;
    }>;
    formula: string;
    maxScore: number;
    readiness: {
      oracleReadyPercent: number;
      schemaReadyPercent: number;
    };
    score: number;
    summary: {
      eventCount: number;
      founderJoins: number;
      referralConversions: number;
      riskEvents: number;
      spawnedStars: number;
      uniqueMembers: number;
    };
    topContributors: Array<{
      actorId: string;
      actorType: string;
      contributionScore: number;
      eventCount: number;
      label?: string | null;
      role?: string | null;
    }>;
  };
  eventFeed: {
    events: Array<{
      actor: {
        id: string;
        label?: string | null;
        role?: string | null;
        type: string;
      };
      economicLayer: {
        cpDelta?: number;
      };
      eventId: string;
      object?: {
        id: string;
        label?: string | null;
        role?: string | null;
        type: string;
      } | null;
      occurredAt: string;
      source: string;
      subject?: {
        id: string;
        label?: string | null;
        role?: string | null;
        type: string;
      } | null;
      type: string;
    }>;
  };
};

const explorerCopy = {
  en: {
    all: "All",
    aiStar: "AI STAR",
    back: "Back",
    children: "Children",
    cpPool: "CP Pool",
    edge: "Edges",
    empty: "No members match this filter.",
    expansion: "AI Star Universe Expansion",
    founderUniverse: "Founder Network",
    founderJoins: "Founder Joins",
    generatedBy: "Launched by",
    source: "Source AI Star Universe",
    member: "Member",
    members: "Members",
    newUniverse: "New AI Star Universe",
    noSpawned: "No spawned AI Stars yet.",
    open: "Open",
    overview: "Overview",
    referral: "Referral",
    reputationEvents: "Reputation Records",
    search: "Search role or referral code",
    selected: "Selected node",
    scoreBreakdown: "Score Breakdown",
    scoreConfidence: "Confidence",
    spawned: "Spawned Stars",
    trustScore: "Reputation Score",
    title: "Founder Network Explorer",
    viewAgentRank: "View Reputation",
    viewCoverage: "Coverage Audit",
    viewEvidencePacket: "Evidence Packet",
    viewLedgerGaps: "Oracle Gaps",
    viewLedgerHighImpact: "High-impact Ledger",
    viewLedger: "Reputation Records",
  },
  ja: {
    all: "すべて",
    aiStar: "AI STAR",
    back: "戻る",
    children: "下位",
    cpPool: "CP Pool",
    edge: "Edges",
    empty: "条件に合うメンバーがいません。",
    expansion: "AI Star Universe Expansion",
    founderUniverse: "Founder Network",
    founderJoins: "Founder Joins",
    generatedBy: "生成者",
    source: "Source AI Star Universe",
    member: "Member",
    members: "Members",
    newUniverse: "New AI Star Universe",
    noSpawned: "まだ派生AIスターはありません。",
    open: "Open",
    overview: "概要",
    referral: "Referral",
    reputationEvents: "Reputation Records",
    search: "RoleまたはReferral codeを検索",
    selected: "選択ノード",
    scoreBreakdown: "Score Breakdown",
    scoreConfidence: "Confidence",
    spawned: "Spawned Stars",
    trustScore: "AgentRank Score",
    title: "Founder Network Explorer",
    viewAgentRank: "AgentRankを見る",
    viewCoverage: "Coverage Audit",
    viewEvidencePacket: "Evidence Packet",
    viewLedgerGaps: "Oracle Gaps",
    viewLedgerHighImpact: "High-impact Ledger",
    viewLedger: "Reputation Records",
  },
  ko: {
    all: "전체",
    aiStar: "AI 스타",
    back: "뒤로",
    children: "하위",
    cpPool: "CP Pool",
    edge: "연결",
    empty: "조건에 맞는 멤버가 없습니다.",
    expansion: "AI 스타 유니버스 확장",
    founderUniverse: "파운더 네트워크",
    founderJoins: "파운더 참여",
    generatedBy: "배출 멤버",
    source: "출처 AI 스타 유니버스",
    member: "멤버",
    members: "멤버",
    newUniverse: "새 AI 스타 유니버스",
    noSpawned: "아직 파생 AI 스타가 없습니다.",
    open: "열림",
    overview: "요약",
    referral: "추천",
    reputationEvents: "평판 기록",
    search: "역할 또는 추천 코드 검색",
    selected: "선택 노드",
    scoreBreakdown: "점수 구성",
    scoreConfidence: "집계 신뢰도",
    spawned: "파생 AI 스타",
    trustScore: "평판 점수",
    title: "파운더 네트워크 탐색",
    viewAgentRank: "평판 기록 보기",
    viewCoverage: "커버리지 감사",
    viewEvidencePacket: "증거 패킷",
    viewLedgerGaps: "오라클 보강",
    viewLedgerHighImpact: "고기여 원장",
    viewLedger: "평판 기록",
  },
} as const;

function getExplorerCopy(locale: Locale) {
  return locale === "ko" || locale === "ja"
    ? explorerCopy[locale]
    : explorerCopy.en;
}

function getDashboardCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      active: "활성",
      activity: "주요 활동",
      allView: "전체 보기",
      contribution: "기여도",
      cpRewardThisMonth: "이번 달 보상 포인트",
      directFounder: "직속 파운더",
      fanGrowth: "팬 증가",
      founderClub: "파운더 네트워크",
      graphLegend: {
        active: "활성",
        direct: "나의 직속",
        inactive: "비활성",
        referral: "나의 추천",
      },
      joinedAt: "가입일",
      memberProfile: "멤버 프로필 보기",
      monthlyGrowth: "이번 달 성장",
      myActivity: "내 활동",
      myContribution: "내 기여도",
      myCredit: "내 크레딧",
      myInfluence: "내 영향력",
      nextDistribution: "다음 분배 예정일",
      notifications: "알림",
      selectedMember: "보고 있는 멤버",
      settings: "설정",
      tierSubtitles: {
        creator: "AI 스타 창업자",
        founder: "성장 참여 파트너",
        genesis_founder: "초기 공동 프로듀서",
        legend: "명예의 전당",
        mentor: "인플루언스 리더",
        partner: "열정적 서포터",
        producer: "콘텐츠 기획자",
      },
      topNav: [
        "홈",
        "AI 스타 데뷔",
        "성장 센터",
        "파운더 네트워크",
        "AI 스타관",
        "내 AI 스타",
        "AI 스타 마켓",
      ],
      totalNetwork: "전체 네트워크",
      viewGrowth: "성장 현황 보기",
      views: "조회수",
    };
  }

  return {
    active: "Active",
    activity: "Key Activities",
    allView: "View All",
    contribution: "Contribution",
    cpRewardThisMonth: "This Month Reward Points",
    directFounder: "Direct Founders",
    fanGrowth: "Fan Growth",
    founderClub: "Founder Network",
    graphLegend: {
      active: "Active",
      direct: "My Direct",
      inactive: "Inactive",
      referral: "My Referral",
    },
    joinedAt: "Joined",
    memberProfile: "View Member Profile",
    monthlyGrowth: "Monthly Growth",
    myActivity: "My Activity",
    myContribution: "My Contribution",
    myCredit: "My Credit",
    myInfluence: "My Influence",
    nextDistribution: "Next Distribution",
    notifications: "Notifications",
    selectedMember: "Viewing Member",
    settings: "Settings",
    tierSubtitles: {
      creator: "AI Star Creator",
      founder: "Growth Partner",
      genesis_founder: "Early Co-producer",
      legend: "Hall of Fame",
      mentor: "Influence Leader",
      partner: "Core Supporter",
      producer: "Content Producer",
    },
    topNav: [
      "Home",
      "AI Star Debut",
      "Growth Center",
      "Founder Network",
      "AI Star Hall",
      "My AI Stars",
      "AI Star Market",
    ],
    totalNetwork: "Total Network",
    viewGrowth: "View Growth",
    views: "Views",
  };
}

function getUniverseStarName(
  star: FanletterFounderUniverseExplorerData["star"],
) {
  return star.name?.trim() || star.displayName?.trim() || star.id;
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(
    value,
  );
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const unsafeMemberDisplayNamePatterns = [
  /adult/i,
  /boob/i,
  /chat\s*gpt/i,
  /chatgpt/i,
  /fuck/i,
  /hand\s*job/i,
  /hentai/i,
  /nude/i,
  /nsfw/i,
  /porn/i,
  /sex/i,
  /\b69\b/i,
  /69/i,
] as const;

function isUnsafeMemberDisplayName(value: string | null | undefined) {
  const text = value?.trim();

  return Boolean(
    text && unsafeMemberDisplayNamePatterns.some((pattern) => pattern.test(text)),
  );
}

function getSafeMemberFallback({
  memberId,
  memberReferralCode,
  nodeId,
  starReferralCode,
}: Pick<
  FanletterFounderUniverseExplorerNode,
  "memberId" | "memberReferralCode" | "nodeId" | "starReferralCode"
>) {
  const token = (memberReferralCode ?? starReferralCode ?? memberId ?? nodeId)
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-4)
    .toUpperCase();

  return `Member ${token || "USER"}`;
}

function sanitizeFounderUniverseData(
  universe: FanletterFounderUniverseExplorerData,
): FanletterFounderUniverseExplorerData {
  const safeLabelByNodeId = new Map<string, string>();
  const nodes = universe.nodes.map((node) => {
    const safeLabel = isUnsafeMemberDisplayName(node.label)
      ? getSafeMemberFallback(node)
      : node.label;
    const safeMemberId = isUnsafeMemberDisplayName(node.memberId)
      ? getSafeMemberFallback(node)
      : node.memberId;

    safeLabelByNodeId.set(node.nodeId, safeLabel);

    return {
      ...node,
      initials: safeLabel === node.label ? node.initials : safeLabel.slice(0, 2),
      label: safeLabel,
      memberId: safeMemberId,
      searchText: [
        safeMemberId,
        safeLabel,
        node.memberReferralCode,
        node.starReferralCode,
        node.role,
        node.source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    };
  });
  const spawnedStars = universe.spawnedStars.map((spawnedStar) => {
    if (!isUnsafeMemberDisplayName(spawnedStar.creatorLabel)) {
      return spawnedStar;
    }

    return {
      ...spawnedStar,
      creatorLabel:
        (spawnedStar.creatorNodeId
          ? safeLabelByNodeId.get(spawnedStar.creatorNodeId)
          : null) ?? "Member",
    };
  });

  return {
    ...universe,
    nodes,
    spawnedStars,
  };
}

const universeDepthColors: Record<
  number,
  { bg: string; border: string; fill: string; text: string }
> = {
  0: {
    bg: "bg-violet-50",
    border: "border-violet-300",
    fill: "bg-violet-500",
    text: "text-violet-700",
  },
  1: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    fill: "bg-amber-400",
    text: "text-amber-700",
  },
  2: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    fill: "bg-blue-400",
    text: "text-blue-700",
  },
  3: {
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    fill: "bg-emerald-400",
    text: "text-emerald-700",
  },
  4: {
    bg: "bg-orange-50",
    border: "border-orange-300",
    fill: "bg-orange-400",
    text: "text-orange-700",
  },
  5: {
    bg: "bg-cyan-50",
    border: "border-cyan-300",
    fill: "bg-cyan-500",
    text: "text-cyan-700",
  },
  6: {
    bg: "bg-slate-50",
    border: "border-slate-300",
    fill: "bg-slate-400",
    text: "text-slate-600",
  },
};

const universeLegendHexStyles: Record<
  number,
  { accent: string; glow: string; surface: string; tint: string }
> = {
  0: {
    accent: "#7c3aed",
    glow: "rgba(124, 58, 237, 0.2)",
    surface: "#fbf7ff",
    tint: "#f1e9ff",
  },
  1: {
    accent: "#d97706",
    glow: "rgba(245, 158, 11, 0.18)",
    surface: "#fffaf0",
    tint: "#fff3cf",
  },
  2: {
    accent: "#2563eb",
    glow: "rgba(59, 130, 246, 0.18)",
    surface: "#f3f8ff",
    tint: "#e3efff",
  },
  3: {
    accent: "#059669",
    glow: "rgba(16, 185, 129, 0.18)",
    surface: "#f0fdf8",
    tint: "#dcfce7",
  },
  4: {
    accent: "#ea580c",
    glow: "rgba(249, 115, 22, 0.18)",
    surface: "#fff7ed",
    tint: "#ffedd5",
  },
  5: {
    accent: "#0891b2",
    glow: "rgba(6, 182, 212, 0.18)",
    surface: "#ecfeff",
    tint: "#cffafe",
  },
  6: {
    accent: "#475569",
    glow: "rgba(100, 116, 139, 0.16)",
    surface: "#f8fafc",
    tint: "#eef2f7",
  },
};

const universeTierIconByRole: Record<Exclude<FounderRole, "member">, LucideIcon> = {
  creator: Sparkles,
  founder: Users,
  genesis_founder: ShieldCheck,
  legend: Star,
  mentor: Network,
  partner: Heart,
  producer: Rocket,
};

const visibleUniverseDotsByDepth: Record<number, number> = {
  1: 6,
  2: 12,
  3: 18,
  4: 24,
  5: 30,
  6: 36,
};

function formatOrbitPercent(value: number) {
  return `${Number(value.toFixed(4))}%`;
}

function getUniverseOrbitRadius(depth: number) {
  return 19.7 + depth * 4.3;
}

function getMonthEndLabel(value: string, locale: Locale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(endDate);
}

function FounderDashboardSidebar({
  currentStarId,
  locale,
  selectedNode,
  starName,
}: {
  currentStarId: string;
  locale: Locale;
  selectedNode: FanletterFounderUniverseExplorerNode | null;
  starName: string;
}) {
  const isKorean = locale === "ko";
  const dashboardCopy = getDashboardCopy(locale);
  const v2Copy = getFanletterV2Copy(locale);
  const encodedStarId = encodeURIComponent(currentStarId);
  const selectedRole = selectedNode
    ? v2Copy.roles[selectedNode.role]
    : v2Copy.roles.creator;
  const contextItems = [
    {
      href: `/${locale}/fanletter/${encodedStarId}/universe`,
      icon: Network,
      label: isKorean ? "파운더 네트워크" : "Founder Network",
      meta: isKorean ? "현재 화면" : "Current view",
    },
    {
      href: `/${locale}/fanletter/${encodedStarId}`,
      icon: Star,
      label: isKorean ? "AI 스타 유니버스" : "AI Star Universe",
      meta: isKorean ? "스타 상세" : "Star detail",
    },
    {
      href: `/${locale}/fanletter/agentrank/events?starId=${encodedStarId}&limit=40`,
      icon: Gauge,
      label: isKorean ? "평판 기록" : "Reputation Records",
      meta: isKorean ? "AgentRank 신호" : "AgentRank signals",
    },
    {
      href: `/${locale}/fanletter/creator-unlock?starId=${encodedStarId}`,
      icon: Sparkles,
      label: isKorean ? "Creator Journey" : "Creator Journey",
      meta: isKorean ? "권한 활성화" : "Permission activation",
    },
  ];

  return (
    <aside className="hidden min-h-screen border-r border-zinc-200 bg-white px-5 py-7 shadow-[18px_0_45px_rgba(15,23,42,0.04)] xl:flex xl:w-[15rem] xl:shrink-0 xl:flex-col">
      <Link
        className="inline-flex items-center gap-1 text-xl font-semibold tracking-normal text-zinc-950"
        href={`/${locale}/fanletter`}
      >
        FanLetter
        <Sparkles className="size-4 fill-black text-black" />
      </Link>

      <div className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          {isKorean ? "현재 위치" : "Current Location"}
        </p>
        <p className="mt-2 line-clamp-2 text-lg font-semibold leading-tight text-zinc-950 [word-break:keep-all]">
          {starName}
        </p>
        <div className="mt-3 grid gap-2 text-xs font-semibold text-zinc-600">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="size-3.5 text-zinc-400" />
            {isKorean ? "AI 스타 유니버스" : "AI Star Universe"}
          </span>
          <span className="inline-flex items-center gap-2 text-zinc-950">
            <Network className="size-3.5 text-zinc-700" />
            {isKorean ? "파운더 네트워크" : "Founder Network"}
          </span>
        </div>
      </div>

      <nav className="mt-5 grid gap-2" aria-label={dashboardCopy.founderClub}>
        {contextItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = index === 0;

          return (
            <Link
              className={joinClasses(
                "group flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                isActive
                  ? "border-zinc-950 bg-zinc-950 !text-white"
                  : "border-zinc-200 bg-white !text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 hover:!text-zinc-950",
              )}
              href={item.href}
              key={item.label}
            >
              <span
                className={joinClasses(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  isActive
                    ? "bg-white/12 text-white"
                    : "bg-zinc-100 text-zinc-700 group-hover:bg-white",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate">{item.label}</span>
                <span
                  className={joinClasses(
                    "mt-0.5 block truncate text-[0.68rem] font-semibold",
                    isActive ? "text-white/58" : "text-zinc-400",
                  )}
                >
                  {item.meta}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto grid gap-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_14px_28px_rgba(15,23,42,0.06)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            {isKorean ? "보고 있는 멤버" : "Viewing Member"}
          </p>
          <div className="flex items-center gap-3">
            <HumanMemberAvatar
              member={{
                initials: selectedNode?.initials ?? "W",
                name: selectedNode?.label ?? "Wayne",
              }}
              size="md"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#12041f]">
                {selectedNode?.label ?? "Wayne"}
              </p>
              <span className="mt-1 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-[0.62rem] font-semibold text-zinc-700">
                {selectedRole}
              </span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold text-zinc-500">
            <span>
              {isKorean ? "단계" : "Tier"} L{selectedNode?.depth ?? 0}
            </span>
            <span>
              {isKorean ? "직속" : "Direct"}{" "}
              {selectedNode?.directChildrenCount ?? 0}
            </span>
          </div>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 text-sm font-semibold !text-white transition hover:bg-zinc-800"
          href="#founder-network-map"
        >
          <Network className="size-4" />
          {isKorean ? "내 위치 보기" : "View my position"}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </aside>
  );
}

function FounderDashboardTopbar({
  locale,
  selectedNode,
}: {
  locale: Locale;
  selectedNode: FanletterFounderUniverseExplorerNode | null;
}) {
  const dashboardCopy = getDashboardCopy(locale);

  return (
    <header className="flex items-center justify-between gap-4 px-4 py-5 sm:px-7 lg:px-8">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold tracking-normal text-[#111827]">
          {dashboardCopy.founderClub}
        </h1>
        <HelpCircle className="size-4 text-slate-400" />
      </div>
      <div className="flex items-center gap-3">
        <button
          aria-label={dashboardCopy.notifications}
          className="relative hidden size-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.06)] sm:inline-flex"
          type="button"
        >
          <Bell className="size-5" />
          <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-rose-500" />
        </button>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-semibold text-[#111827] shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
          type="button"
        >
          <HumanMemberAvatar
            member={{
              initials: selectedNode?.initials ?? "W",
              name: selectedNode?.label ?? "Wayne",
            }}
            size="sm"
          />
          <span className="hidden sm:inline">{selectedNode?.label ?? "Wayne"}</span>
          <ChevronDown className="size-4 text-slate-500" />
        </button>
      </div>
    </header>
  );
}

function FounderUniverseMobileSignpost({
  creatorNode,
  creatorJourneyHref,
  ledgerHref,
  locale,
  memberCount,
  selectedNode,
  selectedRoleLabel,
  star,
  starName,
}: {
  creatorNode: FanletterFounderUniverseExplorerNode | null;
  creatorJourneyHref: string;
  ledgerHref: string;
  locale: Locale;
  memberCount: number;
  selectedNode: FanletterFounderUniverseExplorerNode | null;
  selectedRoleLabel: string;
  star: FanletterFounderUniverseExplorerData["star"];
  starName: string;
}) {
  const isKorean = locale === "ko";

  return (
    <section className="min-w-0 overflow-hidden rounded-[1.15rem] border border-zinc-200 bg-white text-zinc-950 shadow-[0_14px_36px_rgba(15,23,42,0.06)] sm:hidden">
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
            {star.portraitImageUrl ? null : star.initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              <Network className="size-3.5" />
              {isKorean ? "현재 위치" : "Current"}
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold tracking-normal">
              {starName}
            </h2>
            <p className="mt-0.5 text-sm font-semibold text-zinc-500">
              {isKorean ? "파운더 네트워크" : "Founder Network"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            {
              label: isKorean ? "내 역할" : "My role",
              value: selectedRoleLabel,
            },
            {
              label: isKorean ? "직접 하위" : "Direct",
              value: formatNumber(selectedNode?.directChildrenCount ?? 0, locale),
            },
            {
              label: isKorean ? "전체 네트워크" : "Network",
              value: formatNumber(memberCount, locale),
            },
            {
              label: isKorean ? "운영 주체" : "Operator",
              value: creatorNode?.label ?? (isKorean ? "Creator" : "Creator"),
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
            {isKorean ? "보고 있는 멤버" : "Viewing member"}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-zinc-950">
            {selectedNode?.label ?? starName}
          </p>
          <p className="mt-0.5 truncate text-xs font-semibold text-zinc-500">
            {selectedNode?.memberId
              ? `ID ${selectedNode.memberId}`
              : isKorean
                ? "AI 스타 창업자"
                : "AI Star creator"}
          </p>
        </div>
      </div>

      <div className="border-t border-zinc-200 bg-zinc-50/72 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              {isKorean ? "다음 행동" : "Next action"}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-zinc-950">
              {isKorean ? "내 위치 보기" : "View my position"}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[0.68rem] font-semibold text-zinc-600">
            {isKorean ? "네트워크 성장 이벤트" : "Network growth event"}
          </span>
        </div>
        <FanletterTrackedLink
          agentRank={{
            eventType: "universe_growth",
            intent: "founder_universe_mobile_signpost_map",
            source: "fanletter_founder_universe",
            starId: star.id,
          }}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-semibold !text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)]"
          eventName="content_open"
          href="#founder-network-map"
          metadata={{
            placement: "founder_universe_mobile_signpost_primary",
            selectedNodeId: selectedNode?.nodeId ?? null,
            starName,
          }}
        >
          {isKorean ? "내 위치 보기" : "View my position"}
          <ArrowRight className="size-4" />
        </FanletterTrackedLink>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <FanletterTrackedLink
            agentRank={{
              eventType: "content_engaged",
              intent: "founder_universe_mobile_records_open",
              source: "fanletter_founder_universe",
              starId: star.id,
            }}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-center text-xs font-semibold leading-tight text-zinc-800"
            eventName="content_open"
            href={ledgerHref}
            metadata={{
              placement: "founder_universe_mobile_signpost_ledger",
              selectedNodeId: selectedNode?.nodeId ?? null,
              starName,
            }}
          >
            <ShieldCheck className="size-3.5 shrink-0" />
            {isKorean ? "평판 기록" : "Records"}
          </FanletterTrackedLink>
          <FanletterTrackedLink
            agentRank={{
              eventType: "creator_unlock_evaluated",
              intent: "founder_universe_mobile_creator_journey_open",
              source: "fanletter_founder_universe",
              starId: star.id,
            }}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-center text-xs font-semibold leading-tight text-zinc-800"
            eventName="content_open"
            href={creatorJourneyHref}
            metadata={{
              placement: "founder_universe_mobile_signpost_creator",
              selectedNodeId: selectedNode?.nodeId ?? null,
              starName,
            }}
          >
            <Sparkles className="size-3.5 shrink-0" />
            Creator
          </FanletterTrackedLink>
        </div>
      </div>
    </section>
  );
}

function FounderNetworkRelationshipSummary({
  agentRank,
  creatorNode,
  locale,
  selectedNode,
  selectedRoleLabel,
  star,
  starName,
}: {
  agentRank?: FounderUniverseAgentRankSnapshot | null;
  creatorNode: FanletterFounderUniverseExplorerNode | null;
  locale: Locale;
  selectedNode: FanletterFounderUniverseExplorerNode | null;
  selectedRoleLabel: string;
  star: FanletterFounderUniverseExplorerData["star"];
  starName: string;
}) {
  const isKorean = locale === "ko";
  const v2Copy = getFanletterV2Copy(locale);
  const latestEvent = agentRank?.eventFeed.events[0] ?? null;
  const latestEventLabel = latestEvent
    ? getAgentRankEventLabel(latestEvent.type, locale)
    : isKorean
      ? "기록 대기"
      : "Waiting";

  return (
    <section className="grid min-w-0 gap-2 rounded-[1.15rem] border border-zinc-200 bg-white p-3.5 shadow-[0_14px_36px_rgba(15,23,42,0.055)] sm:grid-cols-3 sm:p-4">
      <div className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-950 p-3 text-white">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white/54">
          {isKorean ? "AI 스타 유니버스" : "AI Star Universe"}
        </p>
        <div className="mt-3 flex min-w-0 items-center gap-3">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-full border border-white/14 bg-cover bg-center text-sm font-semibold text-white"
            style={
              star.portraitImageUrl
                ? { backgroundImage: `url(${star.portraitImageUrl})` }
                : {
                    background: `linear-gradient(145deg, ${star.accentColor}, ${star.accentSecondary})`,
                  }
            }
          >
            {star.portraitImageUrl ? null : star.initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{starName}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-white/54">
              {isKorean ? "AI 스타별 성장 공간" : "Star-specific growth space"}
            </p>
          </div>
        </div>
      </div>

      <div className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {isKorean ? "Creator / Owner 관계" : "Creator / Owner"}
            </p>
            <p className="mt-1 truncate text-base font-semibold text-zinc-950">
              {creatorNode?.label ?? (isKorean ? "운영자" : "Operator")}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[0.62rem] font-semibold text-zinc-700 ring-1 ring-zinc-200">
            {isKorean ? "운영 권한" : "Operate"}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <HumanMemberAvatar
            member={{
              initials: creatorNode?.initials ?? "CR",
              name: creatorNode?.label ?? "Creator",
            }}
            size="sm"
          />
          <p className="min-w-0 text-xs font-semibold leading-5 text-zinc-500 [word-break:keep-all]">
            {isKorean
              ? "콘텐츠와 채널을 운영하는 사람입니다."
              : "The person who operates content and channels."}
          </p>
        </div>
      </div>

      <div className="min-w-0 rounded-xl border border-zinc-200 bg-white p-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {isKorean ? "파운더 네트워크 관계" : "Founder Network"}
            </p>
            <p className="mt-1 truncate text-base font-semibold text-zinc-950">
              {selectedNode?.label ?? starName}
            </p>
          </div>
          {selectedNode ? (
            <FounderRoleBadge copy={v2Copy} role={selectedNode.role as FounderRole} />
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-zinc-50 px-2.5 py-2">
            <p className="truncate text-sm font-semibold text-zinc-950">
              {selectedRoleLabel}
            </p>
            <p className="mt-0.5 text-[0.62rem] font-semibold text-zinc-500">
              {isKorean ? "참여 역할" : "Role"}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-50 px-2.5 py-2">
            <p className="truncate text-sm font-semibold text-zinc-950">
              {latestEventLabel}
            </p>
            <p className="mt-0.5 text-[0.62rem] font-semibold text-zinc-500">
              {isKorean ? "평판 기록" : "Record"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FounderNetworkTierStructureCard({
  locale,
  tiers,
}: {
  locale: Locale;
  tiers: FanletterFounderUniverseExplorerTier[];
}) {
  const dashboardCopy = getDashboardCopy(locale);
  const v2Copy = getFanletterV2Copy(locale);
  const isKorean = locale === "ko";
  const sortedTiers = [...tiers].sort((a, b) => a.depth - b.depth);

  return (
    <section className="min-w-0 overflow-hidden rounded-[1.15rem] border border-zinc-200 bg-white p-3.5 text-zinc-950 shadow-[0_14px_36px_rgba(15,23,42,0.06)] sm:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            <Users className="size-3.5" />
            {isKorean ? "파운더 네트워크" : "Founder Network"}
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-normal">
            {isKorean ? "6단계 구조" : "6-tier structure"}
          </h2>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[0.68rem] font-semibold text-zinc-600">
          {isKorean ? "초대/역할/CP" : "Invite/Role/CP"}
        </span>
      </div>

      <div className="mt-3 grid gap-2">
        {sortedTiers.map((tier) => {
          const colors = universeDepthColors[tier.depth] ?? universeDepthColors[6];
          const subtitle =
            dashboardCopy.tierSubtitles[
              tier.role as keyof typeof dashboardCopy.tierSubtitles
            ];

          return (
            <div
              className="grid min-h-14 grid-cols-[2.7rem_1fr_auto] items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2"
              key={tier.depth}
            >
              <span
                className={joinClasses(
                  "flex size-9 items-center justify-center border text-sm font-semibold shadow-[0_8px_18px_rgba(15,23,42,0.06)] [clip-path:polygon(25%_6.7%,75%_6.7%,100%_50%,75%_93.3%,25%_93.3%,0_50%)]",
                  colors.bg,
                  colors.border,
                  colors.text,
                )}
              >
                {tier.depth}
              </span>
              <span className="min-w-0">
                <span
                  className={joinClasses(
                    "block truncate text-sm font-semibold",
                    colors.text,
                  )}
                >
                  {v2Copy.roles[tier.role]}
                </span>
                <span className="mt-0.5 block truncate text-xs font-semibold text-zinc-500">
                  {subtitle}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-zinc-950">
                {formatNumber(tier.capacity, locale)}
                {isKorean ? "명" : ""}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FounderNetworkPositionPath({
  agentRank,
  childNodes,
  locale,
  nodesById,
  onSelectNode,
  selectedNode,
}: {
  agentRank?: FounderUniverseAgentRankSnapshot | null;
  childNodes: FanletterFounderUniverseExplorerNode[];
  locale: Locale;
  nodesById: Map<string, FanletterFounderUniverseExplorerNode>;
  onSelectNode: (nodeId: string) => void;
  selectedNode: FanletterFounderUniverseExplorerNode | null;
}) {
  const isKorean = locale === "ko";
  const v2Copy = getFanletterV2Copy(locale);

  if (!selectedNode) {
    return null;
  }

  const upstreamNodes: FanletterFounderUniverseExplorerNode[] = [];
  let cursor: FanletterFounderUniverseExplorerNode | null = selectedNode;

  while (cursor?.parentNodeId) {
    const parentNode: FanletterFounderUniverseExplorerNode | null =
      nodesById.get(cursor.parentNodeId) ?? null;

    if (!parentNode) {
      break;
    }

    upstreamNodes.push(parentNode);
    cursor = parentNode;
  }

  const pathNodes = [...upstreamNodes.reverse(), selectedNode].slice(-4);
  const visibleChildNodes = childNodes.slice(0, 3);
  const hiddenChildCount = Math.max(0, childNodes.length - visibleChildNodes.length);
  const latestEvent = agentRank?.eventFeed.events[0] ?? null;
  const cpDelta = latestEvent?.economicLayer.cpDelta ?? 0;
  const latestEventLabel = latestEvent
    ? getAgentRankEventLabel(latestEvent.type, locale)
    : isKorean
      ? "네트워크 성장"
      : "Network growth";

  return (
    <section className="grid min-w-0 gap-2 rounded-[1.15rem] border border-zinc-200 bg-white p-3.5 shadow-[0_14px_36px_rgba(15,23,42,0.06)] sm:grid-cols-[1fr_1fr_1fr] sm:p-4">
      <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <p className="inline-flex items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-zinc-500">
          <CircleDot className="size-3.5" />
          {isKorean ? "보고 있는 위치" : "Viewing position"}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <HumanMemberAvatar
            member={{
              initials: selectedNode.initials,
              name: selectedNode.label,
            }}
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-zinc-950">
              {selectedNode.label}
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-zinc-500">
              {v2Copy.roles[selectedNode.role]} · L{selectedNode.depth}
            </p>
          </div>
        </div>
        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-1.5">
          {pathNodes.map((pathNode, index) => {
            const isCurrent = pathNode.nodeId === selectedNode.nodeId;

            return (
              <button
                className={joinClasses(
                  "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 text-[0.66rem] font-semibold transition",
                  isCurrent
                    ? "cursor-default border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50",
                )}
                disabled={isCurrent}
                key={pathNode.nodeId}
                onClick={() => onSelectNode(pathNode.nodeId)}
                type="button"
              >
                <span className="max-w-[5.5rem] truncate">
                  {pathNode.label}
                </span>
                {index < pathNodes.length - 1 ? (
                  <ChevronRight
                    className={joinClasses(
                      "size-3 shrink-0",
                      isCurrent ? "text-white/58" : "text-zinc-400",
                    )}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 rounded-lg border border-zinc-200 bg-white p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-zinc-500">
              <Users className="size-3.5" />
              {isKorean ? "하위 1단계" : "First downstream"}
            </p>
            <p className="mt-1 text-lg font-semibold text-zinc-950">
              {formatNumber(selectedNode.directChildrenCount, locale)}
              {isKorean ? "명" : ""}
            </p>
          </div>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[0.66rem] font-semibold text-zinc-600">
            {isKorean ? "직속" : "Direct"}
          </span>
        </div>
        <div className="mt-3 grid gap-1.5">
          {visibleChildNodes.length > 0 ? (
            visibleChildNodes.map((childNode) => (
              <button
                className="flex min-h-10 min-w-0 items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-left transition hover:border-zinc-400 hover:bg-white"
                key={childNode.nodeId}
                onClick={() => onSelectNode(childNode.nodeId)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <HumanMemberAvatar
                    member={{
                      initials: childNode.initials,
                      name: childNode.label,
                    }}
                    size="sm"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-zinc-950">
                      {childNode.label}
                    </span>
                    <span className="block truncate text-[0.62rem] font-semibold text-zinc-500">
                      {v2Copy.roles[childNode.role]}
                    </span>
                  </span>
                </span>
                <ChevronRight className="size-3.5 shrink-0 text-zinc-400" />
              </button>
            ))
          ) : (
            <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-500">
              {isKorean
                ? "아직 직속 하위 멤버가 없습니다."
                : "No direct downstream members yet."}
            </p>
          )}
          {hiddenChildCount > 0 ? (
            <p className="text-xs font-semibold text-zinc-500">
              +{formatNumber(hiddenChildCount, locale)}{" "}
              {isKorean ? "명 더 있음" : "more"}
            </p>
          ) : null}
        </div>
      </div>

      <div className="min-w-0 rounded-lg border border-zinc-950 bg-zinc-950 p-3 text-white">
        <p className="inline-flex items-center gap-1.5 text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-white/58">
          <ShieldCheck className="size-3.5" />
          {isKorean ? "평판 결과" : "Reputation result"}
        </p>
        <p className="mt-2 break-words text-base font-semibold leading-5 [word-break:keep-all]">
          {latestEventLabel}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white/8 px-2.5 py-2">
            <p className="text-sm font-semibold">
              {formatNumber(agentRank?.ers.summary.eventCount ?? 0, locale)}
            </p>
            <p className="mt-0.5 text-[0.62rem] font-semibold text-white/50">
              {isKorean ? "기록" : "Records"}
            </p>
          </div>
          <div className="rounded-lg bg-white/8 px-2.5 py-2">
            <p className="text-sm font-semibold">
              {cpDelta > 0
                ? `+${formatNumber(cpDelta, locale)}`
                : formatNumber(agentRank?.ers.summary.cpTotal ?? 0, locale)}
            </p>
            <p className="mt-0.5 text-[0.62rem] font-semibold text-white/50">
              CP
            </p>
          </div>
        </div>
        <p className="mt-3 rounded-lg bg-white/8 px-3 py-2 text-xs font-semibold leading-5 text-white/62 [word-break:keep-all]">
          {isKorean
            ? "자세한 기록은 아래 평판 기록 영역에서 확인합니다."
            : "Detailed records are available in the reputation section below."}
        </p>
      </div>
    </section>
  );
}

function FounderStarHero({
  creatorNode,
  locale,
  universe,
}: {
  creatorNode: FanletterFounderUniverseExplorerNode | null;
  locale: Locale;
  universe: FanletterFounderUniverseExplorerData;
}) {
  const copy = getExplorerCopy(locale);
  const dashboardCopy = getDashboardCopy(locale);
  const v2Copy = getFanletterV2Copy(locale);
  const monthlyViews = Math.max(12_000, universe.totals.edgeCount * 821);
  const fanGrowth = Math.max(24, universe.totals.activeReferralCodes * 3);
  const starName = getUniverseStarName(universe.star);

  return (
    <section className="rounded-[1.35rem] border border-slate-100 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.07)] sm:p-5">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-stretch">
        <div className="grid gap-5 md:grid-cols-[20rem_minmax(0,1fr)]">
          <div
            className="min-h-[18rem] overflow-hidden rounded-xl border border-slate-100 bg-cover bg-center shadow-[0_18px_42px_rgba(15,23,42,0.08)]"
            style={
              universe.star.portraitImageUrl
                ? { backgroundImage: `url(${universe.star.portraitImageUrl})` }
                : {
                    background: `linear-gradient(145deg, ${universe.star.accentColor}, ${universe.star.accentSecondary})`,
                  }
            }
          >
            {universe.star.portraitImageUrl ? null : (
              <div className="flex h-full min-h-[18rem] items-center justify-center text-5xl font-semibold text-white">
                {universe.star.initials}
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-col justify-center">
            <span className="w-fit rounded-full bg-zinc-100 px-2.5 py-1 text-[0.68rem] font-semibold text-zinc-700">
              {copy.aiStar}
            </span>
            <div className="mt-3 flex items-center gap-2">
              <h2 className="truncate text-[2.45rem] font-semibold leading-none tracking-normal text-[#111827]">
                {starName}
              </h2>
              <span className="flex size-8 items-center justify-center rounded-full bg-[#6d6dfb] text-white">
                <ShieldCheck className="size-5" />
              </span>
            </div>
            <p className="mt-3 text-base font-semibold text-[#111827]">
              {v2Copy.roles.creator}{" "}
              <span className="ml-3 font-medium text-slate-600">
                {creatorNode?.label ?? "Wayne"}
              </span>
            </p>
            <p className="mt-6 max-w-md text-sm font-medium leading-6 text-slate-500">
              {starName}
              {locale === "ko"
                ? "는 파운더와 함께 성장하는 AI 스타입니다."
                : " is an AI Star growing with Founders."}
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <Heart className="size-4 text-rose-400" />
                <p className="mt-2 text-xl font-semibold text-[#111827]">
                  {formatNumber(universe.star.founderCount, locale)}
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  {locale === "ko" ? "파운더" : "Founder"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <Users className="size-4 text-blue-500" />
                <p className="mt-2 text-xl font-semibold text-[#111827]">
                  {formatNumber(universe.totals.totalMembers, locale)}
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  {copy.members}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                <p className="mt-2 text-xl font-semibold text-[#111827]">
                  {universe.star.starScore}
                </p>
                <p className="text-xs font-semibold text-slate-500">Star Score</p>
              </div>
            </div>
          </div>
        </div>

        <aside className="border-t border-slate-100 pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#111827]">
              {dashboardCopy.monthlyGrowth}
            </p>
            <Link
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500"
              href={`/${locale}/fanletter/${encodeURIComponent(universe.star.id)}`}
            >
              {dashboardCopy.allView}
              <ChevronRight className="size-4" />
            </Link>
          </div>
          <div className="mt-6 grid gap-5 text-sm">
            {[
              [dashboardCopy.fanGrowth, `+${formatNumber(fanGrowth, locale)}`],
              [dashboardCopy.views, `+${formatNumber(monthlyViews, locale)}`],
              [copy.spawned, formatNumber(universe.totals.spawnedStars, locale)],
              [copy.referral, formatNumber(universe.totals.activeReferralCodes, locale)],
            ].map(([label, value]) => (
              <div className="flex items-center justify-between gap-3" key={label}>
                <span className="font-medium text-slate-500">{label}</span>
                <span className="font-semibold text-zinc-950">{value}</span>
              </div>
            ))}
          </div>
          <Link
            className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-black px-4 text-sm font-semibold !text-white shadow-[0_16px_34px_rgba(15,23,42,0.18)] transition hover:bg-zinc-800"
            href={`/${locale}/fanletter/${encodeURIComponent(universe.star.id)}`}
          >
            {starName} {dashboardCopy.viewGrowth}
            <ChevronRight className="size-4" />
          </Link>
        </aside>
      </div>
    </section>
  );
}

function UniverseRoleLegend({
  locale,
  onSelectDepth,
  selectedDepth,
  tiers,
}: {
  locale: Locale;
  onSelectDepth: (depth: ExplorerDepthFilter) => void;
  selectedDepth: ExplorerDepthFilter;
  tiers: FanletterFounderUniverseExplorerTier[];
}) {
  const dashboardCopy = getDashboardCopy(locale);
  const v2Copy = getFanletterV2Copy(locale);

  return (
    <div className="grid gap-2.5">
      {tiers.map((tier) => {
        const colors = universeDepthColors[tier.depth] ?? universeDepthColors[6];
        const active = selectedDepth === tier.depth;
        const hexStyle =
          universeLegendHexStyles[tier.depth] ?? universeLegendHexStyles[6];
        const TierIcon =
          universeTierIconByRole[tier.role as Exclude<FounderRole, "member">] ??
          Sparkles;
        const subtitle =
          dashboardCopy.tierSubtitles[
            tier.role as keyof typeof dashboardCopy.tierSubtitles
          ];

        return (
          <button
            className={joinClasses(
              "group grid min-h-[4.7rem] grid-cols-[3.6rem_1fr] items-center gap-3 rounded-[1.15rem] border px-2.5 py-2 text-left transition duration-300",
              active
                ? "scale-[1.01] border-white/14 bg-white/10 shadow-[0_14px_30px_rgba(124,58,237,0.16)]"
                : "border-transparent hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.06]",
            )}
            key={tier.depth}
            onClick={() => onSelectDepth(tier.depth)}
            type="button"
          >
            <span
              className="relative flex size-12 items-center justify-center transition duration-300 group-hover:scale-105 [filter:drop-shadow(0_10px_18px_var(--hex-glow))]"
              style={
                {
                  "--hex-accent": hexStyle.accent,
                  "--hex-glow": hexStyle.glow,
                  "--hex-surface": hexStyle.surface,
                  "--hex-tint": hexStyle.tint,
                } as CSSProperties
              }
            >
              <span
                className={joinClasses(
                  "absolute inset-[-0.35rem] rounded-full bg-[var(--hex-accent)] opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-[0.28]",
                  active ? "animate-pulse opacity-[0.28]" : "",
                )}
              />
              <span className="absolute inset-0 bg-[var(--hex-accent)] [clip-path:polygon(25%_6.7%,75%_6.7%,100%_50%,75%_93.3%,25%_93.3%,0_50%)]" />
              <span className="absolute inset-[2px] bg-[linear-gradient(145deg,var(--hex-tint),var(--hex-surface)_62%,#ffffff)] [clip-path:polygon(25%_6.7%,75%_6.7%,100%_50%,75%_93.3%,25%_93.3%,0_50%)]" />
              <span className="absolute left-[0.62rem] top-[0.54rem] z-10 h-2 w-2 rounded-full bg-white/85 shadow-[0_0_10px_rgba(255,255,255,0.95)]" />
              <TierIcon
                aria-hidden="true"
                className="relative z-10 size-[1.05rem] transition duration-300 group-hover:rotate-[-8deg]"
                style={{ color: hexStyle.accent }}
              />
              <span
                className="absolute -bottom-1 -right-1 z-20 flex size-5 items-center justify-center rounded-full border border-white bg-[var(--hex-accent)] text-[0.68rem] font-semibold text-white shadow-[0_7px_14px_var(--hex-glow)]"
              >
                {tier.depth}
              </span>
            </span>
              <span className="min-w-0 self-center">
                <span className="flex min-w-0 items-center justify-between gap-2">
                  <span
                    className={joinClasses(
                      "min-w-0 whitespace-normal text-sm font-semibold leading-tight [word-break:keep-all]",
                      colors.text,
                    )}
                  >
                    {v2Copy.roles[tier.role]}
                  </span>
                <span className="shrink-0 text-xs font-semibold text-white">
                  {formatNumber(tier.capacity, locale)}
                  {locale === "ko" ? "명" : ""}
                </span>
              </span>
                <span className="mt-0.5 block whitespace-normal text-[0.72rem] font-medium leading-snug text-white/68 [word-break:keep-all]">
                  {subtitle}
                </span>
              </span>
          </button>
        );
      })}
    </div>
  );
}

function FounderUniverseOrbitMap({
  locale,
  onSelectNode,
  selectedNodeId,
  universe,
}: {
  locale: Locale;
  onSelectNode: (nodeId: string) => void;
  selectedNodeId: string | null;
  universe: FanletterFounderUniverseExplorerData;
}) {
  const v2Copy = getFanletterV2Copy(locale);
  const nodesByDepth = useMemo(() => {
    const map = new Map<number, FanletterFounderUniverseExplorerNode[]>();

    for (const node of universe.nodes) {
      if (node.depth <= 0 || node.depth > 6) {
        continue;
      }

      const nodes = map.get(node.depth) ?? [];
      nodes.push(node);
      map.set(node.depth, nodes);
    }

    return map;
  }, [universe.nodes]);
  const creatorNode =
    universe.nodes.find((node) => node.isCreator) ?? universe.nodes[0] ?? null;
  const nodesById = useMemo<Map<string, FanletterFounderUniverseExplorerNode>>(
    () => new Map(universe.nodes.map((node) => [node.nodeId, node])),
    [universe.nodes],
  );
  const focusedNodeIds = useMemo(() => {
    const focused = new Set<string>();
    const baseNode =
      (selectedNodeId ? nodesById.get(selectedNodeId) : null) ?? creatorNode;

    if (!baseNode) {
      return focused;
    }

    focused.add(baseNode.nodeId);

    let cursor: FanletterFounderUniverseExplorerNode | null = baseNode;
    while (cursor?.parentNodeId) {
      const parentNode: FanletterFounderUniverseExplorerNode | null =
        nodesById.get(cursor.parentNodeId) ?? null;

      if (!parentNode) {
        break;
      }

      focused.add(parentNode.nodeId);
      cursor = parentNode;
    }

    for (const childNodeId of baseNode.childNodeIds) {
      focused.add(childNodeId);
    }

    return focused;
  }, [creatorNode, nodesById, selectedNodeId]);
  const starName = getUniverseStarName(universe.star);
  const tierCapacityByDepth = useMemo(
    () =>
      new Map(
        universe.tiers.map((tier) => [
          tier.depth,
          `${formatNumber(tier.capacity, locale)}${locale === "ko" ? "명" : ""}`,
        ]),
      ),
    [locale, universe.tiers],
  );
  const depthBadgePositions = [6, 5, 4, 3, 2].map((depth) => ({
    depth,
    top: 50 - getUniverseOrbitRadius(depth),
  }));
  const capacityLabels: Array<{
    depth: number;
    left?: string;
    right?: string;
    top: string;
  }> = [
    { depth: 5, right: "8%", top: "24%" },
    { depth: 6, right: "2%", top: "42%" },
    { depth: 4, right: "10%", top: "58%" },
    { depth: 3, right: "20%", top: "75%" },
    { depth: 1, left: "49%", top: "87%" },
  ];
  const featuredNodes = universe.nodes
    .filter((node) => !node.isCreator && node.depth > 0)
    .slice(0, 6);
  const featuredNodePositions: Array<CSSProperties> = [
    { left: "8%", top: "14%" },
    { right: "6%", top: "16%" },
    { left: "2%", top: "43%" },
    { right: "1%", top: "45%" },
    { left: "10%", bottom: "14%" },
    { right: "8%", bottom: "13%" },
  ];

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[36rem] overflow-hidden rounded-[1.4rem] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.24)_0%,rgba(22,12,40,0.96)_38%,#040406_100%)] shadow-[0_30px_90px_rgba(0,0,0,0.42)] lg:max-w-[38rem]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.12)_0%,transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_42%,rgba(124,58,237,0.12))]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/20 shadow-[0_0_80px_rgba(168,85,247,0.28)]" />
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
      >
        {[1, 2, 3, 4, 5, 6].map((depth) => {
          const radius = getUniverseOrbitRadius(depth);
          const colors = universeDepthColors[depth] ?? universeDepthColors[6];

          return (
            <circle
              className={joinClasses("opacity-70 drop-shadow-sm", colors.text)}
              cx="50"
              cy="50"
              fill="none"
              key={`orbit-ring-${depth}`}
              r={radius}
              stroke="currentColor"
              strokeDasharray="1.1 1.35"
              strokeLinecap="round"
              strokeWidth="0.42"
            />
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-0 z-20 hidden sm:block">
        {depthBadgePositions.map(({ depth, top }) => {
          const colors = universeDepthColors[depth] ?? universeDepthColors[6];

          return (
            <span
              className={joinClasses(
                "absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center border text-sm font-semibold shadow-[0_10px_20px_rgba(15,23,42,0.08)] [clip-path:polygon(25%_6.7%,75%_6.7%,100%_50%,75%_93.3%,25%_93.3%,0_50%)]",
                colors.bg,
                colors.border,
                colors.text,
              )}
              key={`depth-badge-${depth}`}
              style={{ left: "50%", top: formatOrbitPercent(top) }}
            >
              {depth}
            </span>
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 hidden sm:block">
        {capacityLabels.map((label) => (
          <span
            className="absolute rounded-full border border-white/10 bg-black/48 px-2.5 py-1 text-[0.72rem] font-semibold text-white/70 shadow-[0_8px_22px_rgba(0,0,0,0.22)] backdrop-blur"
            key={`capacity-${label.depth}`}
            style={{
              left: label.left,
              right: label.right,
              top: label.top,
            }}
          >
            {tierCapacityByDepth.get(label.depth)}
          </span>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 z-30 hidden lg:block">
        {featuredNodes.map((node, index) => {
          const colors = universeDepthColors[node.depth] ?? universeDepthColors[6];
          const position = featuredNodePositions[index] ?? featuredNodePositions[0];
          const focused = focusedNodeIds.has(node.nodeId);

          return (
            <button
              className={joinClasses(
                "pointer-events-auto absolute flex min-w-[8.6rem] items-center gap-2 rounded-xl border border-white/14 bg-[#0c0b12]/82 p-2 text-left shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur transition hover:-translate-y-0.5 hover:border-violet-300/50",
                focused ? "opacity-100" : "opacity-[0.35] saturate-50",
              )}
              key={`featured-node-${node.nodeId}`}
              onClick={() => onSelectNode(node.nodeId)}
              style={position}
              type="button"
            >
              <HumanMemberAvatar
                member={{ initials: node.initials, name: node.label }}
                size="sm"
              />
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-white">
                  {node.label}
                </span>
                <span className={joinClasses("mt-0.5 block text-[0.6rem] font-semibold uppercase", colors.text)}>
                  {v2Copy.roles[node.role]}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {[1, 2, 3, 4, 5, 6].flatMap((depth) => {
        const visibleSlots = visibleUniverseDotsByDepth[depth] ?? depth * 6;
        const nodes = nodesByDepth.get(depth) ?? [];
        const colors = universeDepthColors[depth] ?? universeDepthColors[6];
        const radius = getUniverseOrbitRadius(depth);

        return Array.from({ length: visibleSlots }, (_, index) => {
          const angle = -90 + (360 / visibleSlots) * index;
          const radians = (angle * Math.PI) / 180;
          const node = nodes[index] ?? null;
          const x = 50 + Math.cos(radians) * radius;
          const y = 50 + Math.sin(radians) * radius;
          const selected = node?.nodeId === selectedNodeId;
          const focused = node ? focusedNodeIds.has(node.nodeId) : false;

          return (
            <button
              aria-label={node?.label ?? `L${depth} slot ${index + 1}`}
              className={joinClasses(
                "absolute flex items-center justify-center border text-[0.6rem] font-semibold transition [clip-path:polygon(25%_6.7%,75%_6.7%,100%_50%,75%_93.3%,25%_93.3%,0_50%)]",
                node
                  ? "shadow-[0_8px_18px_rgba(0,0,0,0.24)] ring-2 ring-black/40 hover:brightness-110"
                  : "pointer-events-none bg-white/5 opacity-25 shadow-none ring-0",
                node ? colors.fill : "border-white/55",
                node ? colors.border : "text-transparent",
                node ? "text-white" : "",
                node && !focused ? "opacity-[0.28] saturate-50" : "",
                focused ? "z-30 ring-2 ring-white/55" : "z-10",
                selected ? "z-40 ring-4 ring-violet-300/55" : "",
              )}
              disabled={!node}
              key={`${depth}-${index}`}
              onClick={() => {
                if (node) {
                  onSelectNode(node.nodeId);
                }
              }}
              style={{
                height: depth <= 2 ? "1.55rem" : "1.28rem",
                left: formatOrbitPercent(x),
                top: formatOrbitPercent(y),
                transform: `translate(-50%, -50%) ${
                  selected ? "scale(1.18)" : "scale(1)"
                }`,
                width: depth <= 2 ? "1.55rem" : "1.28rem",
              }}
              type="button"
            >
              {node ? (depth <= 2 ? depth : "") : ""}
            </button>
          );
        });
      })}

      <div className="absolute left-1/2 top-1/2 z-40 size-[5.6rem] -translate-x-1/2 -translate-y-1/2 sm:size-[7rem]">
        <span className="absolute inset-[-1.1rem] rounded-full bg-violet-400/22 blur-2xl" />
        <span className="absolute inset-[-0.6rem] rounded-full border border-violet-200/50 shadow-[0_0_42px_rgba(168,85,247,0.34)]" />
        <span className="absolute inset-[-0.18rem] bg-white/10 shadow-[0_10px_36px_rgba(124,58,237,0.24)] [clip-path:polygon(25%_6.7%,75%_6.7%,100%_50%,75%_93.3%,25%_93.3%,0_50%)]" />
        <div className="relative h-full w-full bg-[linear-gradient(145deg,#a78bfa,#7c3aed_45%,#38bdf8)] p-[3px] shadow-[0_18px_42px_rgba(124,58,237,0.32)] [clip-path:polygon(25%_6.7%,75%_6.7%,100%_50%,75%_93.3%,25%_93.3%,0_50%)]">
          <div
            className="flex h-full w-full items-center justify-center bg-cover bg-center text-lg font-semibold text-white [clip-path:polygon(25%_6.7%,75%_6.7%,100%_50%,75%_93.3%,25%_93.3%,0_50%)]"
            style={
              universe.star.portraitImageUrl
                ? { backgroundImage: `url(${universe.star.portraitImageUrl})` }
                : {
                    background: `linear-gradient(145deg, ${universe.star.accentColor}, ${universe.star.accentSecondary})`,
                  }
            }
          >
            {universe.star.portraitImageUrl ? null : universe.star.initials}
          </div>
        </div>
      </div>

      <div className="absolute left-1/2 top-[calc(50%+3rem)] z-30 w-[9.7rem] -translate-x-1/2 overflow-hidden rounded-2xl border border-violet-300/24 bg-black/72 text-center shadow-[0_18px_48px_rgba(0,0,0,0.38)] backdrop-blur sm:top-[calc(50%+3.75rem)] sm:w-[10.6rem]">
        <span className="block h-1 bg-[linear-gradient(90deg,#8b5cf6,#38bdf8)]" />
        <div className="px-3 pb-3 pt-2.5">
          <span className="mx-auto inline-flex h-5 items-center rounded-full bg-white/10 px-2 text-[0.58rem] font-semibold tracking-[0.08em] text-violet-200">
            AI STAR
          </span>
          <p className="mt-1.5 truncate text-[0.95rem] font-semibold text-white sm:text-base">
          {starName}
          </p>
          <p className="mt-0.5 whitespace-nowrap text-[0.68rem] font-semibold text-white/58 sm:text-[0.72rem]">
            {v2Copy.roles.creator}
          </p>
          <p className="mx-auto mt-1 max-w-full truncate rounded-full bg-white/10 px-2 py-1 text-[0.65rem] font-semibold text-white/70 sm:text-[0.68rem]">
            {creatorNode?.label ?? "Wayne"}
          </p>
        </div>
      </div>
    </div>
  );
}

function UniverseStatusLegend({ locale }: { locale: Locale }) {
  const dashboardCopy = getDashboardCopy(locale);

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-white/58">
      <span className="inline-flex items-center gap-2">
        <span className="size-3 rounded-full bg-white/74" />
        {dashboardCopy.graphLegend.active}
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="size-3 rounded-full bg-white/24" />
        {dashboardCopy.graphLegend.inactive}
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="size-3 rounded-full border-2 border-violet-300 bg-transparent" />
        {dashboardCopy.graphLegend.direct}
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-0 w-6 border-t-2 border-dashed border-violet-300" />
        {dashboardCopy.graphLegend.referral}
      </span>
    </div>
  );
}

function FounderUniverseDashboardPanel({
  locale,
  onSelectDepth,
  onSelectNode,
  selectedDepth,
  selectedNodeId,
  universe,
}: {
  locale: Locale;
  onSelectDepth: (depth: ExplorerDepthFilter) => void;
  onSelectNode: (nodeId: string) => void;
  selectedDepth: ExplorerDepthFilter;
  selectedNodeId: string | null;
  universe: FanletterFounderUniverseExplorerData;
}) {
  const copy = getExplorerCopy(locale);
  const dashboardCopy = getDashboardCopy(locale);
  const v2Copy = getFanletterV2Copy(locale);
  const starName = getUniverseStarName(universe.star);
  const creatorNode =
    universe.nodes.find((node) => node.isCreator) ?? universe.nodes[0] ?? null;
  const totalCpPool = universe.tiers.reduce(
    (sum, tier) => sum + tier.cpPoolReward,
    0,
  );
  const metricStrip = [
    {
      icon: Users,
      label: locale === "ko" ? "파운더" : "Founders",
      sublabel: locale === "ko" ? "활동 중" : "active",
      value: formatNumber(universe.totals.totalMembers, locale),
    },
    {
      icon: Rocket,
      label: copy.spawned,
      sublabel: locale === "ko" ? "탄생 완료" : "launched",
      value: formatNumber(universe.totals.spawnedStars, locale),
    },
    {
      icon: GitBranch,
      label: copy.reputationEvents,
      sublabel: locale === "ko" ? "추적 이벤트" : "tracked",
      value: formatNumber(universe.totals.edgeCount, locale),
    },
    {
      icon: CircleDot,
      label: copy.cpPool,
      sublabel: locale === "ko" ? "mock 보상 풀" : "mock pool",
      value: `${formatNumber(totalCpPool, locale)} CP`,
    },
    {
      icon: ShieldCheck,
      label: locale === "ko" ? "참여 가능 슬롯" : "Open Slots",
      sublabel: locale === "ko" ? "참여 가능" : "available",
      value: formatNumber(universe.star.openSlots, locale),
    },
    {
      icon: Gauge,
      label: locale === "ko" ? "평판 구조" : "Reputation",
      sublabel: locale === "ko" ? "기록 호환" : "record-ready",
      value: locale === "ko" ? "준비됨" : "Ready",
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#050507] p-4 text-white shadow-[0_34px_110px_rgba(0,0,0,0.32)] sm:p-5 lg:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(124,58,237,0.24),transparent_36%),radial-gradient(circle_at_12%_10%,rgba(255,255,255,0.12),transparent_22%)]" />
      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-violet-200">
            <Sparkles className="size-4" />
            FanLetter
          </p>
          <h2 className="mt-5 max-w-[13rem] text-3xl font-semibold uppercase leading-none tracking-normal text-white sm:mt-7 sm:max-w-[14rem] sm:text-5xl">
            AI Star
            <span className="block bg-[linear-gradient(90deg,#ffffff,#a78bfa)] bg-clip-text text-transparent">
              Universe
            </span>
          </h2>
          <p className="mt-4 hidden max-w-sm text-sm font-medium leading-6 text-white/64 sm:block">
            {locale === "ko"
              ? `${starName}의 AI 스타 유니버스 안에서 파운더 네트워크가 성장하고, 행동 결과가 평판 기록으로 남습니다.`
              : `${starName}'s AI Star Universe contains the Founder Network that grows members and records action results.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-9 items-center rounded-full border border-white/12 bg-white/[0.04] px-3 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-white/78 sm:h-10 sm:px-4 sm:text-xs sm:tracking-[0.16em]">
            Onchain
            <span className="mx-1.5 text-white/30 sm:mx-2">•</span>
            Open
            <span className="mx-1.5 text-white/30 sm:mx-2">•</span>
            Fair
          </span>
          <button
            className="hidden h-10 items-center rounded-full border border-white/12 bg-white/[0.06] px-4 text-sm font-semibold text-white transition hover:bg-white/10 sm:inline-flex"
            onClick={() => onSelectDepth("all")}
            type="button"
          >
            {dashboardCopy.allView}
          </button>
        </div>
      </div>

      <div className="relative z-10 mt-7 grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)_20rem]">
        <aside className="grid content-start gap-4">
          <div className="rounded-2xl border border-violet-300/24 bg-white/[0.04] p-4 shadow-[0_18px_46px_rgba(0,0,0,0.22)] backdrop-blur">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">
              {locale === "ko" ? "크리에이터" : v2Copy.roles.creator}
            </span>
            <div className="mt-4 flex items-center gap-3">
              <div
                className="flex size-16 shrink-0 items-center justify-center rounded-full border border-white/20 bg-cover bg-center text-lg font-semibold text-white"
                style={
                  universe.star.portraitImageUrl
                    ? { backgroundImage: `url(${universe.star.portraitImageUrl})` }
                    : {
                        background: `linear-gradient(145deg, ${universe.star.accentColor}, ${universe.star.accentSecondary})`,
                      }
                }
              >
                {universe.star.portraitImageUrl ? null : universe.star.initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-2xl font-semibold text-white">
                  {starName}
                </p>
                <p className="mt-1 truncate text-xs font-semibold text-white/52">
                  {creatorNode?.label ?? "Creator"}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/52">Star Score</span>
                <span className="font-semibold text-violet-200">
                  {universe.star.starScore}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/52">{copy.members}</span>
                <span className="font-semibold text-white">
                  {formatNumber(universe.totals.totalMembers, locale)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/52">{copy.spawned}</span>
                <span className="font-semibold text-white">
                  {formatNumber(universe.totals.spawnedStars, locale)}
                </span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/52">
              {locale === "ko" ? "6단계 등급" : "Universe Tiers"}
            </p>
            <UniverseRoleLegend
              locale={locale}
              onSelectDepth={onSelectDepth}
              selectedDepth={selectedDepth}
              tiers={universe.tiers}
            />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-3 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-violet-200">
              {dashboardCopy.founderClub}
            </p>
            <p className="mt-1 text-xs font-medium text-white/48">
              {locale === "ko"
                ? "AI 스타 유니버스 안의 6단계 파운더 네트워크"
                : "6-tier Founder Network inside the AI Star Universe"}
            </p>
          </div>
          <FounderUniverseOrbitMap
            locale={locale}
            onSelectNode={onSelectNode}
            selectedNodeId={selectedNodeId}
            universe={universe}
          />
          <div className="mt-4">
            <UniverseStatusLegend locale={locale} />
          </div>
        </div>

        <aside className="rounded-2xl border border-violet-300/24 bg-white/[0.04] p-4 shadow-[0_18px_46px_rgba(0,0,0,0.22)] backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-white">{copy.spawned}</p>
              <p className="mt-1 text-xs font-medium text-white/52">
                {locale === "ko"
                  ? `${starName}에서 탄생한 AI 스타`
                  : `AI Stars spawned from ${starName}`}
              </p>
            </div>
            <Sparkles className="size-4 text-violet-200" />
          </div>

          <div className="mt-5 grid gap-3">
            {universe.spawnedStars.length > 0 ? (
              universe.spawnedStars.slice(0, 3).map((spawnedStar) => (
                <FanletterTrackedLink
                  agentRank={{
                    eventType: "ai_star_spawned",
                    intent: "founder_universe_showcase_spawned_open",
                    source: "fanletter_founder_universe",
                    starId: spawnedStar.id,
                  }}
                  className="group grid grid-cols-[5.4rem_minmax(0,1fr)] overflow-hidden rounded-xl border border-white/10 bg-white/[0.045] text-white transition hover:border-violet-300/42 hover:bg-white/[0.07]"
                  eventName="content_open"
                  href={`/${locale}/fanletter/${encodeURIComponent(
                    spawnedStar.id,
                  )}/universe`}
                  key={spawnedStar.id}
                  metadata={{
                    placement: "founder_universe_showcase_spawned",
                    sourceStarId: universe.star.id,
                    spawnedStarName: spawnedStar.name,
                  }}
                >
                  <div
                    className="min-h-[5.6rem] bg-cover bg-center"
                    style={
                      spawnedStar.portraitImageUrl
                        ? {
                            backgroundImage: `url(${spawnedStar.portraitImageUrl})`,
                          }
                        : {
                            background: `linear-gradient(145deg, ${universe.star.accentColor}, ${universe.star.accentSecondary})`,
                          }
                    }
                  />
                  <div className="min-w-0 p-3">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-base font-semibold">
                        {spawnedStar.name}
                      </p>
                      <span className="rounded-full bg-violet-500 px-1.5 py-0.5 text-[0.58rem] font-semibold uppercase">
                        {getStatusLabel(spawnedStar.status, locale)}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <span className="text-white/52">Score</span>
                      <span className="text-right font-semibold">
                        {spawnedStar.starScore}
                      </span>
                      <span className="text-white/52">Growth</span>
                      <span className="text-right font-semibold">
                        +{spawnedStar.growthPercent}%
                      </span>
                    </div>
                  </div>
                </FanletterTrackedLink>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/14 bg-white/[0.035] p-5 text-center">
                <Rocket className="mx-auto size-7 text-white/32" />
                <p className="mt-3 text-sm font-semibold text-white/54">
                  {copy.noSpawned}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      <div className="relative z-10 mt-5 grid overflow-hidden rounded-2xl border border-violet-300/18 bg-white/[0.045] sm:grid-cols-2 xl:grid-cols-6">
        {metricStrip.map((metric) => (
          <div
            className="flex items-center gap-3 border-white/10 p-4 sm:border-r last:border-r-0"
            key={metric.label}
          >
            <metric.icon className="size-6 shrink-0 text-violet-200" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-white/48">
                {metric.label}
              </p>
              <p className="mt-1 truncate text-2xl font-semibold text-violet-200">
                {metric.value}
              </p>
              <p className="mt-0.5 truncate text-xs font-medium text-white/44">
                {metric.sublabel}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SelectedMemberDetailContent({
  childNodes,
  ledgerHref,
  locale,
  memberReputationEvents,
  node,
  onSelectNode,
  showProfileButton = true,
  starId,
}: {
  childNodes: FanletterFounderUniverseExplorerNode[];
  ledgerHref: string;
  locale: Locale;
  memberReputationEvents: FounderUniverseAgentRankSnapshot["eventFeed"]["events"];
  node: FanletterFounderUniverseExplorerNode | null;
  onSelectNode: (nodeId: string) => void;
  showProfileButton?: boolean;
  starId: string;
}) {
  const dashboardCopy = getDashboardCopy(locale);
  const v2Copy = getFanletterV2Copy(locale);

  if (!node) {
    return null;
  }

  const joinedAt = formatDate(node.joinedAt, locale);
  const contribution = Math.min(96, 48 + node.directChildrenCount * 8 + node.depth * 3);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-[#111827]">
          {dashboardCopy.selectedMember}
        </h3>
        <FounderRoleBadge copy={v2Copy} role={node.role as FounderRole} />
      </div>
      <div className="mt-6 flex items-center gap-4">
        <div
          className={joinClasses(
            "flex size-16 items-center justify-center border text-lg font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.08)] [clip-path:polygon(25%_6.7%,75%_6.7%,100%_50%,75%_93.3%,25%_93.3%,0_50%)]",
            universeDepthColors[node.depth]?.bg ?? "bg-slate-50",
            universeDepthColors[node.depth]?.border ?? "border-slate-200",
            universeDepthColors[node.depth]?.text ?? "text-slate-600",
          )}
        >
          G{node.depth}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xl font-semibold text-[#111827]">
            {node.label}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {dashboardCopy.joinedAt} {joinedAt || "-"}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-400">
            ID {node.memberId}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 divide-x divide-slate-100 rounded-lg border border-slate-100 bg-slate-50 text-center">
        <div className="p-4">
          <p className="text-xl font-semibold text-[#111827]">
            {formatNumber(node.directChildrenCount, locale)}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {dashboardCopy.directFounder}
          </p>
        </div>
        <div className="p-4">
          <p className="text-xl font-semibold text-[#111827]">
            {formatNumber(childNodes.length + node.directChildrenCount, locale)}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {dashboardCopy.totalNetwork}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span className="text-slate-600">{dashboardCopy.contribution}</span>
          <span className="text-[#111827]">{contribution}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-black"
            style={{ width: `${contribution}%` }}
          />
        </div>
      </div>

      <MemberReputationRecords
        events={memberReputationEvents}
        ledgerHref={ledgerHref}
        locale={locale}
        node={node}
        starId={starId}
      />

      <div className="mt-6">
        <p className="text-sm font-semibold text-[#111827]">
          {dashboardCopy.activity}
        </p>
        <ul className="mt-3 grid gap-2 text-sm font-medium text-slate-600">
          <li className="flex justify-between gap-3">
            <span>교육 콘텐츠 제작</span>
            <span className="font-semibold text-[#111827]">
              {formatNumber(Math.max(1, node.directChildrenCount * 2), locale)}
              회
            </span>
          </li>
          <li className="flex justify-between gap-3">
            <span>투표 참여</span>
            <span className="font-semibold text-[#111827]">
              {formatNumber(Math.max(3, node.depth * 8), locale)}회
            </span>
          </li>
          <li className="flex justify-between gap-3">
            <span>팬 이벤트 기획</span>
            <span className="font-semibold text-[#111827]">
              {formatNumber(Math.max(1, node.directChildrenCount), locale)}회
            </span>
          </li>
        </ul>
      </div>

      {childNodes.length > 0 ? (
        <div className="mt-6">
          <p className="text-sm font-semibold text-[#111827]">
            {dashboardCopy.directFounder}
          </p>
          <div className="mt-3 grid gap-2">
            {childNodes.slice(0, 6).map((childNode) => (
              <button
                className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left transition hover:border-zinc-400 hover:bg-zinc-50"
                key={childNode.nodeId}
                onClick={() => onSelectNode(childNode.nodeId)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <HumanMemberAvatar
                    member={{
                      initials: childNode.initials,
                      name: childNode.label,
                    }}
                    size="sm"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-zinc-950">
                      {childNode.label}
                    </span>
                    <span className="block truncate text-xs font-semibold text-zinc-500">
                      ID {childNode.memberId}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-[0.68rem] font-semibold text-zinc-700">
                  L{childNode.depth}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showProfileButton ? (
        <button
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-[#111827] transition hover:bg-zinc-200 hover:text-black"
          onClick={() => onSelectNode(node.nodeId)}
          type="button"
        >
          {dashboardCopy.memberProfile}
          <ChevronRight className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

function SelectedDashboardMemberCard({
  childNodes,
  ledgerHref,
  locale,
  memberReputationEvents,
  node,
  onSelectNode,
  starId,
}: {
  childNodes: FanletterFounderUniverseExplorerNode[];
  ledgerHref: string;
  locale: Locale;
  memberReputationEvents: FounderUniverseAgentRankSnapshot["eventFeed"]["events"];
  node: FanletterFounderUniverseExplorerNode | null;
  onSelectNode: (nodeId: string) => void;
  starId: string;
}) {
  if (!node) {
    return null;
  }

  return (
    <aside className="rounded-[1.35rem] border border-slate-100 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
      <SelectedMemberDetailContent
        childNodes={childNodes}
        ledgerHref={ledgerHref}
        locale={locale}
        memberReputationEvents={memberReputationEvents}
        node={node}
        onSelectNode={onSelectNode}
        starId={starId}
      />
    </aside>
  );
}

function SelectedMemberDetailPanel({
  childNodes,
  ledgerHref,
  locale,
  memberReputationEvents,
  node,
  onClose,
  onSelectNode,
  open,
  starId,
}: {
  childNodes: FanletterFounderUniverseExplorerNode[];
  ledgerHref: string;
  locale: Locale;
  memberReputationEvents: FounderUniverseAgentRankSnapshot["eventFeed"]["events"];
  node: FanletterFounderUniverseExplorerNode | null;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
  open: boolean;
  starId: string;
}) {
  const dashboardCopy = getDashboardCopy(locale);
  const v2Copy = getFanletterV2Copy(locale);
  const title = node?.label ?? dashboardCopy.selectedMember;
  const roleLabel = node ? v2Copy.roles[node.role] : dashboardCopy.selectedMember;
  const description =
    locale === "ko"
      ? "보고 있는 멤버의 파운더 네트워크 위치, 기여도, 직접 하위 멤버를 확인합니다."
      : "Review this member's Founder Network position, contribution, and direct downstream members.";

  return (
    <FanletterResponsiveActionPanel
      closeLabel={
        locale === "ko"
          ? "멤버 상세 패널 닫기"
          : "Close member detail panel"
      }
      description={description}
      eyebrow={roleLabel}
      onClose={onClose}
      open={open && Boolean(node)}
      title={title}
    >
      <SelectedMemberDetailContent
        childNodes={childNodes}
        ledgerHref={ledgerHref}
        locale={locale}
        memberReputationEvents={memberReputationEvents}
        node={node}
        onSelectNode={onSelectNode}
        showProfileButton={false}
        starId={starId}
      />
    </FanletterResponsiveActionPanel>
  );
}

function MonthlyCpRewardCard({
  locale,
  universe,
}: {
  locale: Locale;
  universe: FanletterFounderUniverseExplorerData;
}) {
  const dashboardCopy = getDashboardCopy(locale);
  const cpReward = 1_000 + universe.totals.spawnedStars * 250;

  return (
    <aside className="rounded-[1.35rem] border border-slate-100 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-[#111827]">
          {dashboardCopy.cpRewardThisMonth}
        </h3>
        <HelpCircle className="size-4 text-slate-400" />
      </div>
      <p className="mt-6 text-xs font-semibold text-slate-400">
        총 보상 포인트
      </p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-3xl font-semibold text-[#7c3aed]">
          {formatNumber(cpReward, locale)} CP
        </p>
        <div className="flex size-14 items-center justify-center rounded-xl bg-violet-100 text-xl font-semibold text-[#7c3aed] shadow-[0_14px_28px_rgba(124,58,237,0.14)]">
          C
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-500">
          {dashboardCopy.nextDistribution}
        </span>
        <span className="font-semibold text-[#111827]">
          {getMonthEndLabel(universe.generatedAt, locale)}
        </span>
      </div>
    </aside>
  );
}

function normalizeReputationIdentity(value: string | null | undefined) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/^member\s+/, "")
    .replace(/[^a-z0-9@._-]/g, "") ?? "";
}

function isNodeRelatedReputationActor(
  actor:
    | {
        id: string;
        label?: string | null;
        role?: string | null;
        type: string;
      }
    | null
    | undefined,
  node: FanletterFounderUniverseExplorerNode,
) {
  if (!actor || actor.type !== "member") {
    return false;
  }

  const actorId = normalizeReputationIdentity(actor.id);
  const actorLabel = normalizeReputationIdentity(actor.label);
  const memberId = normalizeReputationIdentity(node.memberId);
  const memberLabel = normalizeReputationIdentity(node.label);

  return [actorId, actorLabel].some((value) => {
    if (!value) {
      return false;
    }

    return (
      value === memberId ||
      value === memberLabel ||
      (memberId.length > 3 && value.includes(memberId)) ||
      (memberLabel.length > 3 && value.includes(memberLabel))
    );
  });
}

function getMemberReputationEvents({
  agentRank,
  node,
}: {
  agentRank?: FounderUniverseAgentRankSnapshot | null;
  node: FanletterFounderUniverseExplorerNode | null;
}) {
  if (!agentRank || !node) {
    return [];
  }

  return agentRank.eventFeed.events
    .filter((event) =>
      [event.actor, event.subject, event.object].some((actor) =>
        isNodeRelatedReputationActor(actor, node),
      ),
    )
    .slice(0, 4);
}

function MemberReputationRecords({
  events,
  ledgerHref,
  locale,
  node,
  starId,
}: {
  events: FounderUniverseAgentRankSnapshot["eventFeed"]["events"];
  ledgerHref: string;
  locale: Locale;
  node: FanletterFounderUniverseExplorerNode;
  starId: string;
}) {
  const isKorean = locale === "ko";
  const totalCp = events.reduce(
    (sum, event) => sum + (event.economicLayer.cpDelta ?? 0),
    0,
  );

  return (
    <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#111827]">
            <ShieldCheck className="size-4" />
            {isKorean ? "이 멤버의 평판 기록" : "Member reputation records"}
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 [word-break:keep-all]">
            {isKorean
              ? "참여, 추천, CP 보상이 AgentRank 기록으로 이어집니다."
              : "Joins, referrals, and CP rewards become AgentRank records."}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[0.68rem] font-semibold text-zinc-700">
          {formatNumber(events.length, locale)}
          {isKorean ? "건" : ""}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-zinc-50 px-3 py-2">
          <p className="text-sm font-semibold text-zinc-950">
            {events.length > 0
              ? getAgentRankEventLabel(events[0].type, locale)
              : isKorean
                ? "기록 대기"
                : "Waiting"}
          </p>
          <p className="mt-0.5 text-[0.62rem] font-semibold text-zinc-500">
            {isKorean ? "최근 기록" : "Latest"}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-50 px-3 py-2">
          <p className="text-sm font-semibold text-zinc-950">
            {totalCp > 0 ? `+${formatNumber(totalCp, locale)}` : "0"} CP
          </p>
          <p className="mt-0.5 text-[0.62rem] font-semibold text-zinc-500">
            {isKorean ? "CP 반영" : "CP impact"}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {events.length > 0 ? (
          events.map((event) => (
            <div
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
              key={event.eventId}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-zinc-950">
                    {getAgentRankEventLabel(event.type, locale)}
                  </p>
                  <p className="mt-0.5 truncate text-[0.62rem] font-semibold text-zinc-500">
                    {formatDate(event.occurredAt, locale)} · {event.source}
                  </p>
                </div>
                {event.economicLayer.cpDelta ? (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.62rem] font-semibold text-emerald-700">
                    CP +{formatNumber(event.economicLayer.cpDelta, locale)}
                  </span>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold leading-5 text-zinc-500 [word-break:keep-all]">
            {isKorean
              ? "아직 이 멤버와 직접 연결된 기록이 없습니다. 하위 멤버 초대나 추천 공유가 발생하면 여기에 표시됩니다."
              : "No direct records are linked to this member yet. Invites and referral shares will appear here."}
          </p>
        )}
      </div>

      <FanletterTrackedLink
        agentRank={{
          eventType: "content_engaged",
          intent: "founder_network_member_records_opened",
          source: "fanletter_founder_universe",
          starId,
        }}
        className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-black px-3 text-xs font-semibold text-white"
        eventName="content_open"
        href={ledgerHref}
        metadata={{
          memberId: node.memberId,
          memberRole: node.role,
          placement: "founder_network_member_reputation_records",
        }}
      >
        {isKorean ? "평판 기록 보기" : "View records"}
        <ArrowRight className="size-3.5" />
      </FanletterTrackedLink>
    </section>
  );
}

function getAgentRankEventLabel(type: string, locale: Locale) {
  if (locale !== "ko") {
    return type.replaceAll("_", " ");
  }

  const knownEventLabels: Partial<Record<AgentRankReputationEventType, true>> = {
    ai_star_discovered: true,
    ai_star_spawned: true,
    content_engaged: true,
    cp_earned: true,
    cp_pool_generated: true,
    creator_social_connected: true,
    creator_unlock_evaluated: true,
    creator_unlocked: true,
    founder_joined: true,
    referral_code_created: true,
    referral_converted: true,
    referral_shared: true,
    source_universe_selected: true,
    universe_growth: true,
    x402_mock_payment_intent: true,
  };

  return knownEventLabels[type as AgentRankReputationEventType]
    ? getAgentRankEventTypeLabel(type as AgentRankReputationEventType, locale)
    : type.replaceAll("_", " ");
}

function getAgentRankScoreDimensionLabel(
  key: FounderUniverseAgentRankScoreDimensionKey,
  locale: Locale,
) {
  const labels: Record<FounderUniverseAgentRankScoreDimensionKey, string> =
    locale === "ko"
      ? {
          creator: "크리에이터",
          discovery: "발견",
          economic: "경제",
          network: "네트워크",
          riskPenalty: "위험",
          trust: "신뢰",
        }
      : {
          creator: "Creator",
          discovery: "Discovery",
          economic: "Economic",
          network: "Network",
          riskPenalty: "Risk",
          trust: "Trust",
        };

  return labels[key];
}

function getAgentRankScoreDimensionClass(
  key: FounderUniverseAgentRankScoreDimensionKey,
) {
  const classMap: Record<FounderUniverseAgentRankScoreDimensionKey, string> = {
    creator: "bg-pink-50 text-pink-700 ring-pink-100",
    discovery: "bg-blue-50 text-blue-700 ring-blue-100",
    economic: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    network: "bg-zinc-100 text-zinc-700 ring-zinc-200",
    riskPenalty: "bg-red-50 text-red-700 ring-red-100",
    trust: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  return classMap[key];
}

function AgentRankUniverseCard({
  agentRank,
  locale,
  universe,
}: {
  agentRank?: FounderUniverseAgentRankSnapshot | null;
  locale: Locale;
  universe: FanletterFounderUniverseExplorerData;
}) {
  if (!agentRank) {
    return null;
  }

  const copy = getExplorerCopy(locale);
  const scoreAggregate = agentRank.scoreAggregate ?? null;
  const displayScore = scoreAggregate?.score ?? agentRank.ers.score;
  const displayMaxScore = scoreAggregate?.maxScore ?? agentRank.ers.maxScore;
  const scorePercent = Math.round(
    (displayScore / Math.max(1, displayMaxScore)) * 100,
  );
  const latestEvents = agentRank.eventFeed.events.slice(0, 3);
  const latestEvent = latestEvents[0] ?? null;
  const encodedStarId = encodeURIComponent(universe.star.id);
  const coverageAuditHref = `/${locale}/fanletter/agentrank/coverage?starId=${encodedStarId}&limit=120`;
  const highImpactLedgerHref = `/${locale}/fanletter/agentrank/events?starId=${encodedStarId}&limit=40&readiness=packet_ready&sort=impact_desc`;
  const oracleGapLedgerHref = `/${locale}/fanletter/agentrank/events?starId=${encodedStarId}&limit=40&readiness=needs_oracle&sort=quality_asc`;
  const latestEvidenceHref = latestEvent
    ? `/${locale}/fanletter/agentrank/events/${encodeURIComponent(
        latestEvent.eventId,
      )}/evidence?starId=${encodedStarId}`
    : null;
  const dimensionHighlights =
    scoreAggregate?.dimensions
      .filter((dimension) => dimension.key !== "riskPenalty")
      .slice(0, 4) ?? [];

  return (
    <aside className="rounded-[1.35rem] border border-zinc-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <Sparkles className="size-4" />
            {copy.trustScore}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {copy.reputationEvents}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2 sm:justify-end">
          <FanletterTrackedLink
            agentRank={{
              eventType: "content_engaged",
              intent: "founder_universe_agentrank_card_open",
              source: "fanletter_founder_universe",
              starId: universe.star.id,
            }}
            className="inline-flex h-8 items-center rounded-full bg-zinc-100 px-2.5 text-xs font-semibold text-zinc-900"
            eventName="content_open"
            href={`/${locale}/fanletter/agentrank?starId=${encodedStarId}`}
            metadata={{
              placement: "founder_universe_agentrank_sidebar_card",
              starName: universe.star.displayName || universe.star.name,
            }}
          >
            {copy.viewAgentRank}
          </FanletterTrackedLink>
          <FanletterTrackedLink
            agentRank={{
              eventType: "content_engaged",
              intent: "founder_universe_high_impact_ledger_open",
              source: "fanletter_founder_universe",
              starId: universe.star.id,
            }}
            className="hidden h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-900 sm:inline-flex"
            eventName="content_open"
            href={highImpactLedgerHref}
            metadata={{
              placement: "founder_universe_agentrank_sidebar_high_impact_ledger",
              starName: universe.star.displayName || universe.star.name,
            }}
          >
            <ExternalLink className="size-3" />
            {copy.viewLedgerHighImpact}
          </FanletterTrackedLink>
          <FanletterTrackedLink
            agentRank={{
              eventType: "content_engaged",
              intent: "founder_universe_oracle_gap_ledger_open",
              source: "fanletter_founder_universe",
              starId: universe.star.id,
            }}
            className="hidden h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 sm:inline-flex"
            eventName="content_open"
            href={oracleGapLedgerHref}
            metadata={{
              placement: "founder_universe_agentrank_sidebar_oracle_gap_ledger",
              starName: universe.star.displayName || universe.star.name,
            }}
          >
            <ShieldCheck className="size-3" />
            {copy.viewLedgerGaps}
          </FanletterTrackedLink>
          <FanletterTrackedLink
            agentRank={{
              eventType: "content_engaged",
              intent: "founder_universe_coverage_audit_open",
              source: "fanletter_founder_universe",
              starId: universe.star.id,
            }}
            className="hidden h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 sm:inline-flex"
            eventName="content_open"
            href={coverageAuditHref}
            metadata={{
              placement: "founder_universe_agentrank_sidebar_coverage",
              starName: universe.star.displayName || universe.star.name,
            }}
          >
            <Gauge className="size-3" />
            {copy.viewCoverage}
          </FanletterTrackedLink>
          {latestEvidenceHref ? (
            <FanletterTrackedLink
              agentRank={{
                eventType: "content_engaged",
                intent: "founder_universe_evidence_packet_open",
                source: "fanletter_founder_universe",
                starId: universe.star.id,
              }}
              className="hidden h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 sm:inline-flex"
              eventName="content_open"
              href={latestEvidenceHref}
              metadata={{
                eventId: latestEvent?.eventId,
                placement: "founder_universe_agentrank_sidebar_evidence",
                starName: universe.star.displayName || universe.star.name,
              }}
            >
              <ShieldCheck className="size-3" />
              {copy.viewEvidencePacket}
            </FanletterTrackedLink>
          ) : null}
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-gradient-to-br from-black via-zinc-900 to-zinc-700 p-4 text-white">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-white/60">
              AgentRank
            </p>
            <p className="mt-1 text-4xl font-semibold">
              {displayScore}
            </p>
          </div>
          <p className="pb-1 text-sm font-semibold text-white/70">
            / {formatNumber(displayMaxScore, locale)}
          </p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/16">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300"
            style={{ width: `${scorePercent}%` }}
          />
        </div>
        {scoreAggregate ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-white/10 px-3 py-2">
            <span className="text-xs font-semibold text-white/62">
              {copy.scoreConfidence}
            </span>
            <span className="text-sm font-semibold text-white">
              {scoreAggregate.confidence}%
            </span>
          </div>
        ) : null}
      </div>

      {dimensionHighlights.length > 0 ? (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-zinc-700">
              {copy.scoreBreakdown}
            </p>
            <p className="text-[0.65rem] font-semibold text-slate-400">
              v0
            </p>
          </div>
          <div className="mt-3 grid gap-2">
            {dimensionHighlights.map((dimension) => {
              const dimensionPercent = Math.round(
                (dimension.score / Math.max(1, dimension.maxScore)) * 100,
              );

              return (
                <div key={dimension.key}>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[0.65rem] font-semibold ring-1 ${getAgentRankScoreDimensionClass(
                        dimension.key,
                      )}`}
                    >
                      {getAgentRankScoreDimensionLabel(dimension.key, locale)}
                    </span>
                    <span className="text-xs font-semibold text-[#111827]">
                      {formatNumber(dimension.score, locale)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-black via-zinc-700 to-zinc-400"
                      style={{ width: `${dimensionPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-400">
            {copy.reputationEvents}
          </p>
          <p className="mt-1 text-xl font-semibold text-[#111827]">
            {formatNumber(agentRank.ers.summary.eventCount, locale)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-400">CP</p>
          <p className="mt-1 text-xl font-semibold text-[#111827]">
            {formatNumber(agentRank.ers.summary.cpTotal, locale)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-400">{copy.edge}</p>
          <p className="mt-1 text-xl font-semibold text-[#111827]">
            {formatNumber(agentRank.ers.summary.networkEdges, locale)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-400">Oracle</p>
          <p className="mt-1 text-xl font-semibold text-[#111827]">
            {formatNumber(agentRank.ers.summary.oracleReadyEvents, locale)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {latestEvents.map((event) => (
          <FanletterTrackedLink
            agentRank={{
              eventType: "content_engaged",
              intent: "founder_universe_latest_event_evidence_open",
              source: "fanletter_founder_universe",
              starId: universe.star.id,
            }}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2 transition hover:border-zinc-300 hover:bg-zinc-50"
            eventName="content_open"
            href={`/${locale}/fanletter/agentrank/events/${encodeURIComponent(
              event.eventId,
            )}/evidence?starId=${encodedStarId}`}
            key={event.eventId}
            metadata={{
              eventId: event.eventId,
              eventType: event.type,
              placement: "founder_universe_latest_event_evidence_row",
              starName: universe.star.displayName || universe.star.name,
            }}
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#111827]">
                {getAgentRankEventLabel(event.type, locale)}
              </p>
              <p className="mt-0.5 truncate text-[0.65rem] font-semibold text-slate-400">
                {event.source}
              </p>
            </div>
            {event.economicLayer.cpDelta ? (
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[0.65rem] font-semibold text-emerald-700">
                CP +{formatNumber(event.economicLayer.cpDelta, locale)}
              </span>
            ) : null}
          </FanletterTrackedLink>
        ))}
      </div>
    </aside>
  );
}

function FounderNetworkReputationRecordFlow({
  agentRank,
  locale,
  universe,
}: {
  agentRank?: FounderUniverseAgentRankSnapshot | null;
  locale: Locale;
  universe: FanletterFounderUniverseExplorerData;
}) {
  if (!agentRank) {
    return null;
  }

  const copy = getExplorerCopy(locale);
  const scoreAggregate = agentRank.scoreAggregate ?? null;
  const displayScore = scoreAggregate?.score ?? agentRank.ers.score;
  const displayMaxScore = scoreAggregate?.maxScore ?? agentRank.ers.maxScore;
  const scorePercent = Math.round(
    (displayScore / Math.max(1, displayMaxScore)) * 100,
  );
  const latestEvents = agentRank.eventFeed.events.slice(0, 3);
  const latestEvent = latestEvents[0] ?? null;
  const encodedStarId = encodeURIComponent(universe.star.id);
  const highImpactLedgerHref = `/${locale}/fanletter/agentrank/events?starId=${encodedStarId}&limit=40&readiness=packet_ready&sort=impact_desc`;
  const latestEvidenceHref = latestEvent
    ? `/${locale}/fanletter/agentrank/events/${encodeURIComponent(
        latestEvent.eventId,
      )}/evidence?starId=${encodedStarId}`
    : null;
  const latestCpDelta = latestEvents.reduce(
    (sum, event) => sum + (event.economicLayer.cpDelta ?? 0),
    0,
  );
  const primaryEventLabel = latestEvent
    ? getAgentRankEventLabel(latestEvent.type, locale)
    : locale === "ko"
      ? "네트워크 성장"
      : "Network growth";
  const recordCountLabel = formatNumber(
    agentRank.ers.summary.eventCount,
    locale,
  );
  const cpChangeLabel =
    latestCpDelta > 0
      ? `CP +${formatNumber(latestCpDelta, locale)}`
      : `${formatNumber(agentRank.ers.summary.cpTotal, locale)} CP`;
  const flowSteps = [
    {
      description:
        locale === "ko"
          ? "참여, 추천, 멤버 선택 같은 의미 있는 행동"
          : "Meaningful actions such as joins, referrals, and member inspection",
      icon: CircleDot,
      label: locale === "ko" ? "내 행동" : "My action",
      value: primaryEventLabel,
    },
    {
      description:
        locale === "ko"
          ? "AI 스타 유니버스 안의 성장 기록으로 저장"
          : "Saved as growth records inside the AI Star Universe",
      icon: ShieldCheck,
      label: copy.reputationEvents,
      value:
        locale === "ko"
          ? `${recordCountLabel}건`
          : `${recordCountLabel} records`,
    },
    {
      description:
        locale === "ko"
          ? "CP와 평판 점수에 반영되는 변화"
          : "Changes reflected in CP and reputation score",
      icon: Gauge,
      label: locale === "ko" ? "보상/기여 변화" : "Reward impact",
      value: cpChangeLabel,
    },
  ];

  return (
    <section className="overflow-hidden rounded-[1.35rem] border border-zinc-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="border-b border-zinc-200 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700">
              <ShieldCheck className="size-4" />
              {copy.reputationEvents}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-[#111827]">
              {locale === "ko"
                ? "내 행동이 기록으로 쌓입니다"
                : "Your actions become records"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500 [word-break:keep-all]">
              {locale === "ko"
                ? "AI 스타 유니버스 안에서 참여와 추천이 발생하면, 파운더 네트워크 성장 기록과 CP 변화로 남습니다."
                : "When joins and referrals happen inside this AI Star Universe, they become Founder Network growth records and CP changes."}
            </p>
          </div>
          <div className="grid gap-2 sm:flex sm:shrink-0">
            <FanletterTrackedLink
              agentRank={{
                eventType: "content_engaged",
                intent: "founder_universe_reputation_record_flow_ledger",
                source: "fanletter_founder_universe",
                starId: universe.star.id,
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)]"
              eventName="content_open"
              href={highImpactLedgerHref}
              metadata={{
                placement: "founder_universe_reputation_record_flow_primary",
                starName: universe.star.displayName || universe.star.name,
              }}
            >
              {locale === "ko" ? "평판 기록 보기" : "View records"}
              <ArrowRight className="size-4" />
            </FanletterTrackedLink>
            {latestEvidenceHref ? (
              <FanletterTrackedLink
                agentRank={{
                  eventType: "content_engaged",
                  intent: "founder_universe_reputation_record_flow_evidence",
                  source: "fanletter_founder_universe",
                  starId: universe.star.id,
                }}
                className="hidden min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 sm:inline-flex"
                eventName="content_open"
                href={latestEvidenceHref}
                metadata={{
                  eventId: latestEvent?.eventId,
                  placement: "founder_universe_reputation_record_flow_evidence",
                  starName: universe.star.displayName || universe.star.name,
                }}
              >
                {copy.viewEvidencePacket}
              </FanletterTrackedLink>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-3 md:grid-cols-3">
          {flowSteps.map((step, index) => {
            const StepIcon = step.icon;

            return (
              <div
                className="relative min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5"
                key={step.label}
              >
                {index < flowSteps.length - 1 ? (
                  <span className="absolute -right-2 top-1/2 hidden size-4 -translate-y-1/2 items-center justify-center rounded-full bg-white text-zinc-400 md:flex">
                    <ChevronRight className="size-4" />
                  </span>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-900 shadow-[0_10px_20px_rgba(15,23,42,0.06)]">
                    <StepIcon className="size-4" />
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-[0.65rem] font-semibold text-zinc-500">
                    {index + 1}
                  </span>
                </div>
                <p className="mt-3 text-xs font-semibold text-zinc-500">
                  {step.label}
                </p>
                <p className="mt-1 truncate text-lg font-semibold text-[#111827]">
                  {step.value}
                </p>
                <p className="mt-1.5 text-xs font-medium leading-5 text-slate-500 [word-break:keep-all]">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-zinc-500">
                {copy.trustScore}
              </p>
              <p className="mt-1 text-3xl font-semibold text-[#111827]">
                {displayScore}
              </p>
            </div>
            <p className="pb-1 text-sm font-semibold text-slate-400">
              / {formatNumber(displayMaxScore, locale)}
            </p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-black via-zinc-700 to-zinc-400"
              style={{ width: `${scorePercent}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-zinc-50 px-2 py-2">
              <p className="text-sm font-semibold text-[#111827]">
                {scoreAggregate
                  ? `${scoreAggregate.confidence}%`
                  : formatNumber(agentRank.ers.summary.networkEdges, locale)}
              </p>
              <p className="mt-0.5 text-[0.65rem] font-semibold text-slate-400">
                {scoreAggregate ? copy.scoreConfidence : copy.edge}
              </p>
            </div>
            <div className="rounded-lg bg-zinc-50 px-2 py-2">
              <p className="text-sm font-semibold text-[#111827]">
                {formatNumber(agentRank.ers.summary.oracleReadyEvents, locale)}
              </p>
              <p className="mt-0.5 text-[0.65rem] font-semibold text-slate-400">
                {locale === "ko" ? "검증 가능" : "Verified"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {latestEvents.length > 0 ? (
        <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#111827]">
              {locale === "ko" ? "최근 평판 기록" : "Recent records"}
            </p>
            <span className="text-xs font-semibold text-slate-400">
              {locale === "ko" ? "행동 결과" : "Action results"}
            </span>
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            {latestEvents.map((event) => (
              <FanletterTrackedLink
                agentRank={{
                  eventType: "content_engaged",
                  intent: "founder_universe_reputation_record_row_evidence",
                  source: "fanletter_founder_universe",
                  starId: universe.star.id,
                }}
                className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left transition hover:border-zinc-400 hover:bg-zinc-50"
                eventName="content_open"
                href={`/${locale}/fanletter/agentrank/events/${encodeURIComponent(
                  event.eventId,
                )}/evidence?starId=${encodedStarId}`}
                key={event.eventId}
                metadata={{
                  eventId: event.eventId,
                  eventType: event.type,
                  placement: "founder_universe_reputation_record_row",
                  starName: universe.star.displayName || universe.star.name,
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[#111827]">
                    {getAgentRankEventLabel(event.type, locale)}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-slate-400">
                    {event.source}
                  </span>
                </span>
                {event.economicLayer.cpDelta ? (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[0.68rem] font-semibold text-emerald-700">
                    CP +{formatNumber(event.economicLayer.cpDelta, locale)}
                  </span>
                ) : (
                  <ChevronRight className="size-4 shrink-0 text-slate-400" />
                )}
              </FanletterTrackedLink>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function getStatusLabel(
  status: FanletterFounderUniverseExplorerSpawnedStar["status"],
  locale: Locale,
) {
  if (locale === "ko") {
    return status === "active" ? "활성" : status === "draft" ? "초안" : "보관";
  }

  if (locale === "ja") {
    return status === "active" ? "公開" : status === "draft" ? "下書き" : "保存";
  }

  return status === "active" ? "Active" : status === "draft" ? "Draft" : "Archived";
}

function SpawnedStarCard({
  locale,
  onSelectNode,
  sourceStarId,
  sourceStarName,
  spawnedStar,
}: {
  locale: Locale;
  onSelectNode: (nodeId: string) => void;
  sourceStarId: string;
  sourceStarName: string;
  spawnedStar: FanletterFounderUniverseExplorerSpawnedStar;
}) {
  const copy = getExplorerCopy(locale);
  const v2Copy = getFanletterV2Copy(locale);
  const createdAt = formatDate(spawnedStar.createdAt, locale);

  return (
    <div className="grid gap-3 rounded-lg border border-violet-100 bg-white p-3 shadow-[0_12px_30px_rgba(88,28,135,0.06)]">
      <FanletterTrackedLink
        agentRank={{
          eventType: "ai_star_spawned",
          intent: "spawned_star_universe_open",
          source: "fanletter_founder_universe",
          starId: spawnedStar.id,
        }}
        className="group relative overflow-hidden rounded-lg border border-violet-300 bg-gradient-to-br from-[#7c3aed] via-[#a855f7] to-[#38bdf8] p-3 text-white shadow-[0_18px_42px_rgba(124,58,237,0.18)]"
        eventName="content_open"
        href={`/${locale}/fanletter/${encodeURIComponent(spawnedStar.id)}/universe`}
        metadata={{
          placement: "founder_universe_spawned_star_card",
          sourceStarId,
          sourceStarName,
          spawnedStarName: spawnedStar.name,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex h-7 items-center rounded-full bg-white/22 px-2.5 text-[0.66rem] font-semibold backdrop-blur">
            AI STAR
          </span>
          <ExternalLink className="size-4 text-white/82 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
        <div className="mt-5 flex items-center gap-3">
          <div
            className="flex size-16 shrink-0 items-center justify-center rounded-full border border-white/42 bg-white/16 bg-cover bg-center text-lg font-semibold"
            style={
              spawnedStar.portraitImageUrl
                ? { backgroundImage: `url(${spawnedStar.portraitImageUrl})` }
                : undefined
            }
          >
            {spawnedStar.portraitImageUrl ? null : spawnedStar.name.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold tracking-normal">
              {spawnedStar.name}
            </p>
            <p className="mt-1 text-xs font-semibold text-white/72">
              {copy.newUniverse}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-white/14 p-2">
            <p className="text-base font-semibold">{spawnedStar.starScore}</p>
            <p className="mt-1 text-[0.6rem] font-semibold text-white/66">
              Score
            </p>
          </div>
          <div className="rounded-lg bg-white/14 p-2">
            <p className="text-base font-semibold">
              +{spawnedStar.growthPercent}%
            </p>
            <p className="mt-1 text-[0.6rem] font-semibold text-white/66">
              Growth
            </p>
          </div>
          <div className="rounded-lg bg-white/14 p-2">
            <p className="text-base font-semibold">
              {formatNumber(spawnedStar.directSpawnedStars, locale)}
            </p>
            <p className="mt-1 text-[0.6rem] font-semibold text-white/66">
              Spawn
            </p>
          </div>
        </div>
      </FanletterTrackedLink>

      <div className="rounded-lg border border-black/8 bg-zinc-50 p-3">
        <div className="flex items-start gap-3">
          <HumanMemberAvatar
            member={{
              initials: spawnedStar.creatorLabel?.slice(0, 2) ?? "M",
              name: spawnedStar.creatorLabel ?? copy.member,
            }}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[0.66rem] font-semibold text-black/42">
              {copy.generatedBy}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-[#12041f]">
              {spawnedStar.creatorLabel ?? copy.member}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {spawnedStar.creatorRole ? (
                <FounderRoleBadge
                  copy={v2Copy}
                  role={spawnedStar.creatorRole as FounderRole}
                />
              ) : null}
              {spawnedStar.creatorDepth !== null ? (
                <span className="inline-flex h-6 items-center rounded-full bg-white px-2 text-[0.64rem] font-semibold text-black/45">
                  L{spawnedStar.creatorDepth}
                </span>
              ) : null}
              <span className="inline-flex h-6 items-center rounded-full bg-white px-2 text-[0.64rem] font-semibold text-black/45">
                {getStatusLabel(spawnedStar.status, locale)}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/6 pt-2">
          <span className="text-[0.66rem] font-semibold text-black/42">
            {createdAt || spawnedStar.id}
          </span>
          {spawnedStar.creatorNodeId ? (
            <button
              className="inline-flex h-8 items-center rounded-full border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-900"
              onClick={() => {
                onSelectNode(spawnedStar.creatorNodeId ?? "");
                trackFunnelEvent("content_open", {
                  agentRank: {
                    eventType: "universe_growth",
                    intent: "spawned_star_creator_node_selected",
                    source: "fanletter_founder_universe",
                    starId: sourceStarId,
                  },
                  metadata: {
                    creatorDepth: spawnedStar.creatorDepth,
                    creatorRole: spawnedStar.creatorRole,
                    placement: "founder_universe_spawned_star_creator_node",
                    spawnedStarId: spawnedStar.id,
                    spawnedStarName: spawnedStar.name,
                  },
                });
              }}
              type="button"
            >
              Node
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function UniverseExpansionMap({
  locale,
  onSelectNode,
  universe,
}: {
  locale: Locale;
  onSelectNode: (nodeId: string) => void;
  universe: FanletterFounderUniverseExplorerData;
}) {
  const copy = getExplorerCopy(locale);
  const starName = getUniverseStarName(universe.star);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white/90 p-3 shadow-[0_14px_36px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="size-5 text-zinc-900" />
          <div>
            <p className="text-sm font-semibold text-zinc-700">
              {copy.expansion}
            </p>
            <p className="mt-1 text-xs font-semibold text-black/42">
              {formatNumber(universe.spawnedStars.length, locale)}{" "}
              {copy.spawned}
            </p>
          </div>
        </div>
        <span className="inline-flex h-9 items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800">
          CP Pool 1,000
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex h-7 items-center rounded-full bg-white px-2.5 text-[0.66rem] font-semibold text-zinc-700">
              {copy.source}
            </span>
            <Sparkles className="size-4 text-zinc-900" />
          </div>
          <div className="mt-5 flex items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-full border border-zinc-200 bg-white text-base font-semibold text-zinc-900">
              {universe.star.initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-[#12041f]">
                {starName}
              </p>
              <p className="mt-1 text-xs font-semibold text-black/45">
                {copy.founderUniverse}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <span>{copy.source}</span>
            <ArrowRight className="size-4 lg:rotate-0 rotate-90" />
            <span>{copy.spawned}</span>
          </div>
        </div>

        {universe.spawnedStars.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {universe.spawnedStars.map((spawnedStar) => (
              <SpawnedStarCard
                key={spawnedStar.id}
                locale={locale}
                onSelectNode={onSelectNode}
                sourceStarId={universe.star.id}
                sourceStarName={starName}
                spawnedStar={spawnedStar}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-52 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center">
            <div>
              <Rocket className="mx-auto size-8 text-violet-300" />
              <p className="mt-3 text-sm font-semibold text-black/48">
                {copy.noSpawned}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function MemberNodeCard({
  isSelected,
  locale,
  node,
  onSelect,
}: {
  isSelected: boolean;
  locale: Locale;
  node: FanletterFounderUniverseExplorerNode;
  onSelect: (nodeId: string) => void;
}) {
  const copy = getExplorerCopy(locale);
  const v2Copy = getFanletterV2Copy(locale);
  const joinedAt = formatDate(node.joinedAt, locale);

  return (
    <button
      className={joinClasses(
        "rounded-lg border bg-white p-3 text-left shadow-[0_10px_26px_rgba(88,28,135,0.06)] transition",
        isSelected
          ? "border-black ring-2 ring-black/10"
          : "border-zinc-200 hover:border-zinc-400",
      )}
      onClick={() => onSelect(node.nodeId)}
      type="button"
    >
      <div className="flex items-start gap-3">
        <HumanMemberAvatar
          member={{ initials: node.initials, name: node.label }}
          size={node.isCreator ? "lg" : "md"}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <FounderRoleBadge copy={v2Copy} role={node.role as FounderRole} />
            <span className="text-[0.68rem] font-semibold text-black/45">
              L{node.depth}
            </span>
          </div>
          <p className="mt-2 truncate text-base font-semibold text-[#12041f]">
            {node.label}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {node.starReferralCode ? (
              <span className="rounded-full bg-zinc-100 px-2 py-1 font-mono text-[0.65rem] font-semibold text-zinc-700">
                {node.starReferralCode}
              </span>
            ) : null}
            {joinedAt ? (
              <span className="rounded-full bg-zinc-50 px-2 py-1 text-[0.65rem] font-semibold text-black/48">
                {joinedAt}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex min-w-10 flex-col items-end gap-1">
          <Users className="size-4 text-black/36" />
          <span className="text-sm font-semibold text-black/54">
            {formatNumber(node.directChildrenCount, locale)}
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-black/6 pt-2 text-xs font-semibold text-black/46">
        <span>{copy.children}</span>
        <ChevronRight className="size-4" />
      </div>
    </button>
  );
}

export function FanletterFounderUniverseExplorer({
  agentRank,
  coverageAction = null,
  locale,
  universe,
  viewerNodeId = null,
}: {
  agentRank?: FounderUniverseAgentRankSnapshot | null;
  coverageAction?: AgentRankCoverageActionContext | null;
  locale: Locale;
  universe: FanletterFounderUniverseExplorerData;
  viewerNodeId?: string | null;
}) {
  const copy = getExplorerCopy(locale);
  const displayUniverse = useMemo(
    () => sanitizeFounderUniverseData(universe),
    [universe],
  );
  const [selectedDepth, setSelectedDepth] =
    useState<ExplorerDepthFilter>("all");
  const [query, setQuery] = useState("");
  const creatorNode =
    displayUniverse.nodes.find((node) => node.isCreator) ??
    displayUniverse.nodes[0] ??
    null;
  const viewerNode =
    viewerNodeId
      ? displayUniverse.nodes.find((node) => node.nodeId === viewerNodeId) ?? null
      : null;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    viewerNode?.nodeId ?? creatorNode?.nodeId ?? null,
  );
  const [isMemberPanelOpen, setIsMemberPanelOpen] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const nodesById = useMemo(
    () => new Map(displayUniverse.nodes.map((node) => [node.nodeId, node])),
    [displayUniverse.nodes],
  );
  const filteredNodes = useMemo(
    () =>
      displayUniverse.nodes.filter((node) => {
        const matchesDepth =
          selectedDepth === "all" ? true : node.depth === selectedDepth;
        const matchesQuery = normalizedQuery
          ? node.searchText.includes(normalizedQuery)
          : true;

        return matchesDepth && matchesQuery;
      }),
    [displayUniverse.nodes, normalizedQuery, selectedDepth],
  );
  const selectedNode = selectedNodeId ? nodesById.get(selectedNodeId) ?? null : null;
  const isViewingOwnNode = Boolean(
    viewerNodeId && selectedNode?.nodeId === viewerNodeId,
  );
  const selectedChildNodes =
    selectedNode?.childNodeIds
      .map((childNodeId) => nodesById.get(childNodeId))
      .filter(
        (node): node is FanletterFounderUniverseExplorerNode => node !== undefined,
      ) ?? [];
  const selectedMemberReputationEvents = useMemo(
    () =>
      getMemberReputationEvents({
        agentRank,
        node: selectedNode,
      }),
    [agentRank, selectedNode],
  );
  const handleSelectNode = (nodeId: string) => {
    const nextNode = nodesById.get(nodeId);

    setSelectedNodeId(nodeId);
    setIsMemberPanelOpen(true);

    if (nextNode) {
      trackFunnelEvent("content_open", {
        agentRank: {
          eventType: "universe_growth",
          intent: "founder_universe_member_detail_opened",
          source: "fanletter_founder_universe",
          starId: displayUniverse.star.id,
        },
        metadata: {
          memberDepth: nextNode.depth,
          memberId: nextNode.memberId,
          memberRole: nextNode.role,
          placement: "founder_universe_member_detail_panel",
          starName: getUniverseStarName(displayUniverse.star),
        },
      });
    }
  };
  const v2Copy = getFanletterV2Copy(locale);
  const starName = getUniverseStarName(displayUniverse.star);
  const selectedRoleLabel = selectedNode
    ? v2Copy.roles[selectedNode.role]
    : v2Copy.roles.creator;
  const starSocialAccount = buildFanletterAIStarSocialAccountViewModel({
    creatorMemberId: creatorNode?.memberId ?? `creator:${displayUniverse.star.id}`,
    creatorMemberInitials: creatorNode?.initials ?? displayUniverse.star.initials,
    creatorMemberName: creatorNode?.label ?? `${starName} Creator`,
    creatorRole: "creator",
    starId: displayUniverse.star.id,
  });
  const encodedStarId = encodeURIComponent(displayUniverse.star.id);
  const founderUniverseLedgerHref = `/${locale}/fanletter/agentrank/events?starId=${encodedStarId}&limit=40&readiness=packet_ready&sort=impact_desc`;
  const creatorJourneyHref = `/${locale}/fanletter/creator-unlock?starId=${encodedStarId}`;

  return (
    <main className="fanletter-v2-surface min-h-screen bg-white text-[#111827] xl:flex">
      <FanletterReputationTracker
        agentRank={{
          eventType: "universe_growth",
          intent: "founder_universe_explorer_view",
          source: "fanletter_founder_universe",
          starId: displayUniverse.star.id,
        }}
        metadata={{
          edgeCount: displayUniverse.totals.edgeCount,
          page: "fanletter_founder_universe",
          coverageAction: coverageAction?.action ?? null,
          coverageActionMemberEmail: coverageAction?.memberEmail ?? null,
          coverageActionStarId: coverageAction?.starId ?? null,
          spawnedStarCount: displayUniverse.spawnedStars.length,
          starName: displayUniverse.star.name,
          totalMembers: displayUniverse.totals.totalMembers,
        }}
      />
      <FounderDashboardSidebar
        currentStarId={displayUniverse.star.id}
        locale={locale}
        selectedNode={creatorNode}
        starName={starName}
      />
      <div className="min-w-0 flex-1">
        <FounderDashboardTopbar locale={locale} selectedNode={creatorNode} />

        <div className="grid gap-5 px-4 pb-28 sm:px-7 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
              href={`/${locale}/fanletter/${encodeURIComponent(displayUniverse.star.id)}`}
            >
              <ArrowLeft className="size-4" />
              {copy.back}
            </Link>
            <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700">
              <GitBranch className="size-4" />
              {formatNumber(displayUniverse.totals.edgeCount, locale)} {copy.edge}
            </span>
          </div>

          <section className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-[0_14px_34px_rgba(15,23,42,0.055)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-zinc-500">
                  <Link
                    className="rounded-full bg-zinc-100 px-2.5 py-1 !text-zinc-700 transition hover:bg-zinc-200"
                    href={`/${locale}/fanletter/founder-club?view=founder#joined-founder-networks`}
                  >
                    Founder Club
                  </Link>
                  <ChevronRight className="size-3.5 text-zinc-300" />
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1">
                    {locale === "ko" ? "AI 스타 유니버스" : "AI Star Universe"}
                  </span>
                  <ChevronRight className="size-3.5 text-zinc-300" />
                  <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-white">
                    {locale === "ko" ? "파운더 네트워크" : "Founder Network"}
                  </span>
                </div>
                <p className="mt-3 truncate text-xl font-semibold text-zinc-950">
                  {starName}
                </p>
                <p className="mt-1 text-sm font-medium leading-5 text-zinc-500 [word-break:keep-all]">
                  {locale === "ko"
                    ? viewerNode
                      ? "로그인한 계정의 역할과 다음 행동을 먼저 보여줍니다."
                      : "AI 스타 유니버스 안에서 내 역할과 다음 행동을 확인합니다."
                    : viewerNode
                      ? "Your signed-in position and next action are shown first."
                      : "Review your role and next action inside this AI Star Universe."}
                </p>
              </div>
              <Link
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 text-sm font-semibold !text-white transition hover:bg-zinc-800"
                href="#founder-network-map"
              >
                <Network className="size-4" />
                {locale === "ko" ? "내 위치 보기" : "View my position"}
              </Link>
            </div>
          </section>

          {coverageAction ? (
            <FanletterAgentRankCoverageActionNotice
              action={coverageAction}
              locale={locale}
            />
          ) : null}

          <FounderUniverseMobileSignpost
            creatorNode={creatorNode}
            creatorJourneyHref={creatorJourneyHref}
            ledgerHref={founderUniverseLedgerHref}
            locale={locale}
            memberCount={displayUniverse.totals.totalMembers}
            selectedNode={selectedNode}
            selectedRoleLabel={selectedRoleLabel}
            star={displayUniverse.star}
            starName={starName}
          />

          <FounderNetworkTierStructureCard
            locale={locale}
            tiers={displayUniverse.tiers}
          />

          <FounderNetworkRelationshipSummary
            agentRank={agentRank}
            creatorNode={creatorNode}
            locale={locale}
            selectedNode={selectedNode}
            selectedRoleLabel={selectedRoleLabel}
            star={displayUniverse.star}
            starName={starName}
          />

          <FounderNetworkPositionPath
            agentRank={agentRank}
            childNodes={selectedChildNodes}
            locale={locale}
            nodesById={nodesById}
            onSelectNode={handleSelectNode}
            selectedNode={selectedNode}
          />

          <FanletterAIStarSocialAccountCard
            connectHref={`/${locale}/fanletter/creator-unlock?starId=${encodedStarId}#tiktok-channel`}
            locale={locale}
            social={starSocialAccount}
            source="fanletter_founder_universe"
            starId={displayUniverse.star.id}
            starName={starName}
            starPortraitImageUrl={displayUniverse.star.portraitImageUrl}
            starPortraitInitials={displayUniverse.star.initials}
          />

          <FanletterActionGuide
            className="hidden sm:block"
            currentLabel={
              locale === "ko"
                ? `${starName} 파운더 네트워크`
                : `${starName} Founder Network`
            }
            metrics={[
              {
                label: locale === "ko" ? "내 역할" : "My role",
                value: selectedRoleLabel,
              },
              {
                label: locale === "ko" ? "네트워크" : "Network",
                value: formatNumber(displayUniverse.totals.totalMembers, locale),
              },
            ]}
            primaryAction={{
              agentRank: {
                eventType: "universe_growth",
                intent: "founder_universe_action_guide_map",
                source: "fanletter_founder_universe",
                starId: displayUniverse.star.id,
              },
              eventName: "content_open",
              href: "#founder-network-map",
              label:
                locale === "ko"
                  ? "내 위치 보기"
                  : "View my position",
              metadata: {
                placement: "founder_universe_action_guide_primary",
                selectedNodeId: selectedNode?.nodeId ?? null,
                starName,
              },
            }}
            reputationEventLabel={
              locale === "ko"
                ? "네트워크 성장 이벤트"
                : "Network growth event"
            }
            secondaryActions={[
              {
                agentRank: {
                  eventType: "content_engaged",
                  intent: "founder_universe_action_guide_ledger",
                  source: "fanletter_founder_universe",
                  starId: displayUniverse.star.id,
                },
                eventName: "content_open",
                href: founderUniverseLedgerHref,
                label:
                  locale === "ko"
                    ? "평판 기록 보기"
                    : "View reputation records",
                metadata: {
                  placement: "founder_universe_action_guide_ledger",
                  starName,
                },
              },
            ]}
            steps={[
              {
                label: locale === "ko" ? "AI 스타" : "AI Star",
                status: "done",
              },
              {
                label: locale === "ko" ? "6단계 네트워크" : "6-tier network",
                status: "active",
              },
              {
                label: locale === "ko" ? "CP 분배" : "CP distribution",
                status:
                  displayUniverse.totals.spawnedStars > 0 ? "done" : "next",
              },
              {
                label: locale === "ko" ? "평판 기록" : "Reputation",
                status: agentRank ? "active" : "next",
              },
            ]}
            subtitle={
              locale === "ko"
                ? "보고 있는 멤버의 위치와 하위 네트워크를 확인하고, 성장 결과를 평판 기록으로 남깁니다."
                : "Inspect the member position and downstream network, then save growth as reputation records."
            }
            title={
              locale === "ko"
                ? isViewingOwnNode
                  ? "다음 행동: 내 하위 네트워크 확인"
                  : "다음 행동: 내 위치 보기"
                : isViewingOwnNode
                  ? "Next action: inspect my downstream"
                  : "Next action: view my position"
            }
          />

          <section className="hidden min-w-0 grid-cols-2 gap-2 sm:grid sm:grid-cols-3">
            <div className="hidden min-w-0 rounded-lg border border-zinc-200 bg-white p-3 shadow-[0_10px_26px_rgba(15,23,42,0.045)] sm:block">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                {locale === "ko" ? "AI 스타 유니버스" : "AI Star Universe"}
              </p>
              <p className="mt-1 truncate text-base font-semibold text-zinc-950">
                {starName}
              </p>
              <p className="mt-0.5 truncate text-xs font-semibold text-zinc-500">
                {displayUniverse.star.id}
              </p>
            </div>
            <button
              className="min-w-0 rounded-lg border border-zinc-200 bg-white p-3 text-left shadow-[0_10px_26px_rgba(15,23,42,0.045)] transition hover:border-zinc-400 hover:bg-zinc-50"
              disabled={!selectedNode}
              onClick={() => {
                if (selectedNode) {
                  handleSelectNode(selectedNode.nodeId);
                }
              }}
              type="button"
            >
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                {locale === "ko"
                  ? isViewingOwnNode
                    ? "내 위치"
                    : "보고 있는 멤버"
                  : isViewingOwnNode
                    ? "My position"
                    : "Viewing member"}
              </p>
              <p className="mt-1 truncate text-base font-semibold text-zinc-950">
                {selectedNode?.label ?? starName}
              </p>
              <p className="mt-0.5 truncate text-xs font-semibold text-zinc-500">
                {selectedNode?.memberId
                  ? `ID ${selectedNode.memberId}`
                  : locale === "ko"
                    ? "AI 스타 창업자"
                    : "AI Star creator"}
              </p>
            </button>
            <div className="min-w-0 rounded-lg border border-zinc-950 bg-zinc-950 p-3 text-white shadow-[0_14px_34px_rgba(15,23,42,0.16)]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-white/62">
                {locale === "ko" ? "다음 행동" : "Next action"}
              </p>
              <p className="mt-1 truncate text-base font-semibold">
                {selectedRoleLabel}
              </p>
              <p className="mt-0.5 truncate text-xs font-semibold text-white/62">
                {formatNumber(selectedNode?.directChildrenCount ?? 0, locale)}{" "}
                {copy.children}
              </p>
            </div>
          </section>

          <div id="founder-network-map">
            <FounderUniverseDashboardPanel
              locale={locale}
              onSelectDepth={setSelectedDepth}
              onSelectNode={handleSelectNode}
              selectedDepth={selectedDepth}
              selectedNodeId={selectedNodeId}
              universe={displayUniverse}
            />
          </div>

          <FanletterTerminologyGuide
            className="hidden sm:block"
            locale={locale}
            variant="compact"
          />

          <div className="hidden sm:block">
            <FounderStarHero
              creatorNode={creatorNode}
              locale={locale}
              universe={displayUniverse}
            />
          </div>

          <FounderNetworkReputationRecordFlow
            agentRank={agentRank}
            locale={locale}
            universe={displayUniverse}
          />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="grid gap-5">
              <div className="hidden sm:block">
                <UniverseExpansionMap
                  locale={locale}
                  onSelectNode={handleSelectNode}
                  universe={displayUniverse}
                />
              </div>

              <div className="hidden rounded-[1.35rem] border border-slate-100 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.07)] sm:block sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-[#111827]">
                      {copy.members}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {formatNumber(filteredNodes.length, locale)} /{" "}
                      {formatNumber(displayUniverse.nodes.length, locale)}
                    </p>
                  </div>
                  <label className="relative block sm:w-80">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none transition placeholder:text-slate-300 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/10"
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={copy.search}
                      type="search"
                      value={query}
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredNodes.length > 0 ? (
                    filteredNodes.slice(0, 120).map((node) => (
                      <MemberNodeCard
                        isSelected={selectedNodeId === node.nodeId}
                        key={node.nodeId}
                        locale={locale}
                        node={node}
                        onSelect={handleSelectNode}
                      />
                    ))
                  ) : (
                    <p className="rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-500 sm:col-span-2 xl:col-span-3">
                      {copy.empty}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="hidden content-start gap-5 sm:grid">
              <SelectedDashboardMemberCard
                childNodes={selectedChildNodes}
                ledgerHref={founderUniverseLedgerHref}
                locale={locale}
                memberReputationEvents={selectedMemberReputationEvents}
                node={selectedNode}
                onSelectNode={handleSelectNode}
                starId={displayUniverse.star.id}
              />
              <AgentRankUniverseCard
                agentRank={agentRank}
                locale={locale}
                universe={displayUniverse}
              />
              <MonthlyCpRewardCard locale={locale} universe={displayUniverse} />
            </div>
          </div>
        </div>
      </div>
      <SelectedMemberDetailPanel
        childNodes={selectedChildNodes}
        ledgerHref={founderUniverseLedgerHref}
        locale={locale}
        memberReputationEvents={selectedMemberReputationEvents}
        node={selectedNode}
        onClose={() => setIsMemberPanelOpen(false)}
        onSelectNode={handleSelectNode}
        open={isMemberPanelOpen}
        starId={displayUniverse.star.id}
      />
    </main>
  );
}
