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
  Home,
  Network,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

import {
  FounderRoleBadge,
  HumanMemberAvatar,
} from "@/components/fanletter-founder-club-v2";
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

type ExplorerDepthFilter = "all" | number;

const explorerCopy = {
  en: {
    all: "All",
    aiStar: "AI STAR",
    back: "Back",
    children: "Children",
    cpPool: "CP Pool",
    edge: "Edges",
    empty: "No members match this filter.",
    expansion: "Star Universe Expansion",
    founderUniverse: "Founder Network",
    generatedBy: "Launched by",
    member: "Member",
    members: "Members",
    newUniverse: "New Star Universe",
    noSpawned: "No spawned AI Stars yet.",
    open: "Open",
    overview: "Overview",
    referral: "Referral",
    search: "Search role or referral code",
    selected: "Selected node",
    spawned: "Spawned Stars",
    title: "Founder Network Explorer",
  },
  ja: {
    all: "すべて",
    aiStar: "AI STAR",
    back: "戻る",
    children: "下位",
    cpPool: "CP Pool",
    edge: "Edges",
    empty: "条件に合うメンバーがいません。",
    expansion: "Star Universe Expansion",
    founderUniverse: "Founder Network",
    generatedBy: "生成者",
    member: "Member",
    members: "Members",
    newUniverse: "New Star Universe",
    noSpawned: "まだ派生AIスターはありません。",
    open: "Open",
    overview: "概要",
    referral: "Referral",
    search: "RoleまたはReferral codeを検索",
    selected: "選択ノード",
    spawned: "Spawned Stars",
    title: "Founder Network Explorer",
  },
  ko: {
    all: "전체",
    aiStar: "AI 스타",
    back: "뒤로",
    children: "하위",
    cpPool: "CP Pool",
    edge: "연결",
    empty: "조건에 맞는 멤버가 없습니다.",
    expansion: "스타 유니버스 확장",
    founderUniverse: "파운더 네트워크",
    generatedBy: "배출 멤버",
    member: "멤버",
    members: "멤버",
    newUniverse: "새 스타 유니버스",
    noSpawned: "아직 파생 AI 스타가 없습니다.",
    open: "열림",
    overview: "요약",
    referral: "추천",
    search: "역할 또는 추천 코드 검색",
    selected: "선택 노드",
    spawned: "파생 AI 스타",
    title: "파운더 네트워크 탐색",
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
      directFounder: "직속 Founder",
      fanGrowth: "팬 증가",
      founderClub: "Founder Club",
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
      selectedMember: "선택된 멤버",
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
        "Founder Club",
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
    founderClub: "Founder Club",
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
    selectedMember: "Selected Member",
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
      "Founder Club",
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
  locale,
  selectedNode,
}: {
  locale: Locale;
  selectedNode: FanletterFounderUniverseExplorerNode | null;
}) {
  const dashboardCopy = getDashboardCopy(locale);
  const navIcons = [Home, Sparkles, Gauge, Network, Star, Users, ShieldCheck];
  const activityItems = [
    { icon: Users, label: dashboardCopy.myActivity },
    { icon: Gauge, label: dashboardCopy.myInfluence },
    { icon: ShieldCheck, label: dashboardCopy.myContribution },
    { icon: Bell, label: dashboardCopy.notifications, badge: "12" },
    { icon: Settings, label: dashboardCopy.settings },
  ];

  return (
    <aside className="hidden min-h-screen border-r border-violet-100 bg-white px-5 py-7 shadow-[18px_0_45px_rgba(88,28,135,0.04)] xl:flex xl:w-[15.8rem] xl:shrink-0 xl:flex-col">
      <Link
        className="inline-flex items-center gap-1 text-2xl font-semibold tracking-normal text-[#0f1b4d]"
        href={`/${locale}/fanletter`}
      >
        FanLetter
        <Sparkles className="size-5 fill-[#7c3aed] text-[#7c3aed]" />
      </Link>

      <nav className="mt-9 grid gap-1.5">
        {dashboardCopy.topNav.map((item, index) => {
          const Icon = navIcons[index] ?? CircleDot;
          const active = item === dashboardCopy.founderClub;

          return (
            <Link
              className={joinClasses(
                "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition",
                active
                  ? "bg-violet-100 text-[#6d28d9]"
                  : "text-slate-600 hover:bg-violet-50 hover:text-[#6d28d9]",
              )}
              href={index === 0 ? `/${locale}/fanletter` : "#"}
              key={item}
            >
              <Icon className="size-4" />
              {item}
            </Link>
          );
        })}
      </nav>

      <div className="mt-10 border-t border-slate-100 pt-6">
        <p className="px-3 text-xs font-semibold text-slate-400">
          {dashboardCopy.myActivity}
        </p>
        <div className="mt-3 grid gap-1.5">
          {activityItems.map((item) => (
            <button
              className="flex h-10 items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-slate-600 transition hover:bg-violet-50 hover:text-[#6d28d9]"
              key={item.label}
              type="button"
            >
              <item.icon className="size-4" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-[#7c3aed] px-2 py-0.5 text-[0.68rem] text-white">
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto grid gap-3">
        <div className="rounded-lg border border-violet-100 bg-white p-3 shadow-[0_14px_28px_rgba(88,28,135,0.07)]">
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
              <span className="mt-1 inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[0.62rem] font-semibold text-[#6d28d9]">
                Creator
              </span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-500">
            <span>Genesis 2</span>
            <span>Founder 7</span>
            <span>Mentor 13</span>
            <span>Producer 28</span>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-violet-100 bg-white p-3 shadow-[0_14px_28px_rgba(88,28,135,0.07)]">
          <span className="text-sm font-semibold text-slate-500">
            {dashboardCopy.myCredit}
          </span>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#12041f]">
            10,250 CP
            <span className="flex size-6 items-center justify-center rounded-full bg-violet-100 text-xs text-[#6d28d9]">
              C
            </span>
          </span>
        </div>
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
            <span className="w-fit rounded-full bg-violet-100 px-2.5 py-1 text-[0.68rem] font-semibold text-[#7c3aed]">
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
              Creator{" "}
              <span className="ml-3 font-medium text-slate-600">
                {creatorNode?.label ?? "Wayne"}
              </span>
            </p>
            <p className="mt-6 max-w-md text-sm font-medium leading-6 text-slate-500">
              {starName}
              {locale === "ko"
                ? "는 Founder와 함께 성장하는 AI 스타입니다."
                : " is an AI Star growing with Founders."}
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <Heart className="size-4 text-rose-400" />
                <p className="mt-2 text-xl font-semibold text-[#111827]">
                  {formatNumber(universe.star.founderCount, locale)}
                </p>
                <p className="text-xs font-semibold text-slate-500">Founder</p>
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
                <span className="font-semibold text-[#6d28d9]">{value}</span>
              </div>
            ))}
          </div>
          <Link
            className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#7c3aed] px-4 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(124,58,237,0.22)] transition hover:bg-[#6d28d9]"
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
                ? "scale-[1.01] border-slate-100 bg-[#f8fafc] shadow-[0_14px_30px_rgba(15,23,42,0.06)]"
                : "border-transparent hover:-translate-y-0.5 hover:border-slate-100 hover:bg-slate-50/80",
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
                  "absolute inset-[-0.35rem] rounded-full bg-[var(--hex-accent)] opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-[0.18]",
                  active ? "opacity-[0.18] animate-pulse" : "",
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
                  className={joinClasses("truncate text-sm font-semibold", colors.text)}
                >
                  {v2Copy.roles[tier.role]}
                </span>
                <span className="shrink-0 text-xs font-semibold text-[#111827]">
                  {formatNumber(tier.capacity, locale)}
                  {locale === "ko" ? "명" : ""}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[0.72rem] font-medium text-slate-500">
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

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[33rem] overflow-hidden rounded-[1.4rem] bg-[radial-gradient(circle,#ffffff_0%,#ffffff_34%,#f8fbff_100%)] lg:max-w-[34rem]">
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
              className={joinClasses("opacity-55", colors.text)}
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
            className="absolute rounded-full bg-white/86 px-2.5 py-1 text-[0.72rem] font-semibold text-slate-500 shadow-[0_8px_18px_rgba(15,23,42,0.06)] backdrop-blur"
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

          return (
            <button
              aria-label={node?.label ?? `L${depth} slot ${index + 1}`}
              className={joinClasses(
                "absolute flex items-center justify-center border text-[0.6rem] font-semibold transition [clip-path:polygon(25%_6.7%,75%_6.7%,100%_50%,75%_93.3%,25%_93.3%,0_50%)]",
                node
                  ? "shadow-[0_8px_18px_rgba(15,23,42,0.08)] ring-2 ring-white/80 hover:brightness-105"
                  : "pointer-events-none bg-transparent opacity-30 shadow-none ring-0",
                node ? colors.fill : "border-white/55",
                node ? colors.border : "text-transparent",
                node ? "text-white" : "",
                selected ? "z-20 ring-4 ring-[#7c3aed]/18" : "z-10",
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

      <div className="absolute left-1/2 top-1/2 z-40 size-[4.35rem] -translate-x-1/2 -translate-y-1/2 sm:size-[4.65rem]">
        <span className="absolute inset-[-0.55rem] rounded-full bg-violet-400/18 blur-xl" />
        <span className="absolute inset-[-0.22rem] bg-white/86 shadow-[0_10px_24px_rgba(124,58,237,0.16)] [clip-path:polygon(25%_6.7%,75%_6.7%,100%_50%,75%_93.3%,25%_93.3%,0_50%)]" />
        <div className="relative h-full w-full bg-[linear-gradient(145deg,#8b5cf6,#6d28d9_45%,#38bdf8)] p-[3px] shadow-[0_14px_30px_rgba(124,58,237,0.24)] [clip-path:polygon(25%_6.7%,75%_6.7%,100%_50%,75%_93.3%,25%_93.3%,0_50%)]">
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

      <div className="absolute left-1/2 top-[calc(50%+2.45rem)] z-30 w-[9.4rem] -translate-x-1/2 overflow-hidden rounded-2xl border border-violet-100/80 bg-white/94 text-center shadow-[0_16px_38px_rgba(88,28,135,0.12)] backdrop-blur sm:top-[calc(50%+2.6rem)] sm:w-[10rem]">
        <span className="block h-1 bg-[linear-gradient(90deg,#8b5cf6,#38bdf8)]" />
        <div className="px-3 pb-3 pt-2.5">
          <span className="mx-auto inline-flex h-5 items-center rounded-full bg-violet-50 px-2 text-[0.58rem] font-semibold tracking-[0.08em] text-[#7c3aed]">
            AI STAR
          </span>
          <p className="mt-1.5 truncate text-[0.95rem] font-semibold text-[#111827] sm:text-base">
          {starName}
          </p>
          <p className="mt-0.5 whitespace-nowrap text-[0.68rem] font-semibold text-slate-500 sm:text-[0.72rem]">
            {v2Copy.roles.creator}
          </p>
          <p className="mx-auto mt-1 max-w-full truncate rounded-full bg-slate-50 px-2 py-1 text-[0.65rem] font-semibold text-slate-600 sm:text-[0.68rem]">
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
    <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-500">
      <span className="inline-flex items-center gap-2">
        <span className="size-3 rounded-full bg-slate-600" />
        {dashboardCopy.graphLegend.active}
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="size-3 rounded-full bg-slate-300" />
        {dashboardCopy.graphLegend.inactive}
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="size-3 rounded-full border-2 border-[#7c3aed] bg-white" />
        {dashboardCopy.graphLegend.direct}
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-0 w-6 border-t-2 border-dashed border-[#7c3aed]" />
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
  const starName = getUniverseStarName(universe.star);

  return (
    <section className="rounded-[1.35rem] border border-slate-100 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.07)] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-normal text-[#111827]">
            {starName} {copy.founderUniverse}
          </h2>
          <HelpCircle className="size-4 text-slate-400" />
        </div>
        <div className="flex items-start gap-2">
          <button
            className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600"
            onClick={() => onSelectDepth("all")}
            type="button"
          >
            {dashboardCopy.allView}
          </button>
          <span className="grid gap-2">
            <button
              aria-label="Zoom in"
              className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-semibold text-slate-600"
              type="button"
            >
              +
            </button>
            <button
              aria-label="Zoom out"
              className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-semibold text-slate-600"
              type="button"
            >
              -
            </button>
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[14.25rem_minmax(0,1fr)]">
        <UniverseRoleLegend
          locale={locale}
          onSelectDepth={onSelectDepth}
          selectedDepth={selectedDepth}
          tiers={universe.tiers}
        />
        <div className="min-w-0">
          <FounderUniverseOrbitMap
            locale={locale}
            onSelectNode={onSelectNode}
            selectedNodeId={selectedNodeId}
            universe={universe}
          />
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
            {universe.tiers.map((tier) => {
              const hexStyle =
                universeLegendHexStyles[tier.depth] ?? universeLegendHexStyles[6];
              const TierIcon =
                universeTierIconByRole[
                  tier.role as Exclude<FounderRole, "member">
                ] ?? Sparkles;
              const v2Copy = getFanletterV2Copy(locale);

              return (
                <button
                  className="group inline-flex items-center gap-2 rounded-full px-1.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  key={tier.depth}
                  onClick={() => onSelectDepth(tier.depth)}
                  type="button"
                >
                  <span
                    className="inline-flex size-5 items-center justify-center rounded-full border bg-white transition group-hover:scale-110"
                    style={{
                      borderColor: hexStyle.accent,
                      boxShadow: `0 6px 12px ${hexStyle.glow}`,
                      color: hexStyle.accent,
                    }}
                  >
                    <TierIcon aria-hidden="true" className="size-3" />
                  </span>
                  {tier.depth} {v2Copy.roles[tier.role]}
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            <UniverseStatusLegend locale={locale} />
          </div>
        </div>
      </div>
    </section>
  );
}

function SelectedDashboardMemberCard({
  childNodes,
  locale,
  node,
  onSelectNode,
}: {
  childNodes: FanletterFounderUniverseExplorerNode[];
  locale: Locale;
  node: FanletterFounderUniverseExplorerNode | null;
  onSelectNode: (nodeId: string) => void;
}) {
  const dashboardCopy = getDashboardCopy(locale);
  const v2Copy = getFanletterV2Copy(locale);

  if (!node) {
    return null;
  }

  const joinedAt = formatDate(node.joinedAt, locale);
  const contribution = Math.min(96, 48 + node.directChildrenCount * 8 + node.depth * 3);

  return (
    <aside className="rounded-[1.35rem] border border-slate-100 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
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
            className="h-full rounded-full bg-[#7c3aed]"
            style={{ width: `${contribution}%` }}
          />
        </div>
      </div>

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

      <button
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-[#111827] transition hover:bg-violet-50 hover:text-[#6d28d9]"
        onClick={() => onSelectNode(node.nodeId)}
        type="button"
      >
        {dashboardCopy.memberProfile}
        <ChevronRight className="size-4" />
      </button>
    </aside>
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
  spawnedStar,
}: {
  locale: Locale;
  onSelectNode: (nodeId: string) => void;
  spawnedStar: FanletterFounderUniverseExplorerSpawnedStar;
}) {
  const copy = getExplorerCopy(locale);
  const v2Copy = getFanletterV2Copy(locale);
  const createdAt = formatDate(spawnedStar.createdAt, locale);

  return (
    <div className="grid gap-3 rounded-lg border border-violet-100 bg-white p-3 shadow-[0_12px_30px_rgba(88,28,135,0.06)]">
      <Link
        className="group relative overflow-hidden rounded-lg border border-violet-300 bg-gradient-to-br from-[#7c3aed] via-[#a855f7] to-[#38bdf8] p-3 text-white shadow-[0_18px_42px_rgba(124,58,237,0.18)]"
        href={`/${locale}/fanletter/${encodeURIComponent(spawnedStar.id)}/universe`}
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
      </Link>

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
              className="inline-flex h-8 items-center rounded-full border border-violet-100 bg-white px-2.5 text-xs font-semibold text-[#6d28d9]"
              onClick={() => onSelectNode(spawnedStar.creatorNodeId ?? "")}
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
    <section className="rounded-lg border border-violet-100 bg-white/78 p-3 shadow-[0_14px_36px_rgba(88,28,135,0.06)] backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="size-5 text-[#6d28d9]" />
          <div>
            <p className="text-sm font-semibold text-[#6d28d9]">
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
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex h-7 items-center rounded-full bg-white px-2.5 text-[0.66rem] font-semibold text-[#6d28d9]">
              SOURCE
            </span>
            <Sparkles className="size-4 text-[#7c3aed]" />
          </div>
          <div className="mt-5 flex items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-full border border-violet-200 bg-white text-base font-semibold text-[#6d28d9]">
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
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#6d28d9]">
            <span>Source</span>
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
                spawnedStar={spawnedStar}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-52 items-center justify-center rounded-lg border border-dashed border-violet-200 bg-white p-6 text-center">
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
          ? "border-[#7c3aed] ring-2 ring-[#7c3aed]/12"
          : "border-black/8 hover:border-violet-300",
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
              <span className="rounded-full bg-violet-50 px-2 py-1 font-mono text-[0.65rem] font-semibold text-[#6d28d9]">
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
  locale,
  universe,
}: {
  locale: Locale;
  universe: FanletterFounderUniverseExplorerData;
}) {
  const copy = getExplorerCopy(locale);
  const [selectedDepth, setSelectedDepth] =
    useState<ExplorerDepthFilter>("all");
  const [query, setQuery] = useState("");
  const creatorNode =
    universe.nodes.find((node) => node.isCreator) ?? universe.nodes[0] ?? null;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    creatorNode?.nodeId ?? null,
  );
  const normalizedQuery = query.trim().toLowerCase();
  const nodesById = useMemo(
    () => new Map(universe.nodes.map((node) => [node.nodeId, node])),
    [universe.nodes],
  );
  const filteredNodes = useMemo(
    () =>
      universe.nodes.filter((node) => {
        const matchesDepth =
          selectedDepth === "all" ? true : node.depth === selectedDepth;
        const matchesQuery = normalizedQuery
          ? node.searchText.includes(normalizedQuery)
          : true;

        return matchesDepth && matchesQuery;
      }),
    [normalizedQuery, selectedDepth, universe.nodes],
  );
  const selectedNode = selectedNodeId ? nodesById.get(selectedNodeId) ?? null : null;
  const selectedChildNodes =
    selectedNode?.childNodeIds
      .map((childNodeId) => nodesById.get(childNodeId))
      .filter(
        (node): node is FanletterFounderUniverseExplorerNode => node !== undefined,
      ) ?? [];

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-[#111827] xl:flex">
      <FounderDashboardSidebar locale={locale} selectedNode={creatorNode} />
      <div className="min-w-0 flex-1">
        <FounderDashboardTopbar locale={locale} selectedNode={creatorNode} />

        <div className="grid gap-5 px-4 pb-28 sm:px-7 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-violet-100 bg-white px-3 text-sm font-semibold text-[#6d28d9] shadow-[0_10px_24px_rgba(88,28,135,0.06)]"
              href={`/${locale}/fanletter/${encodeURIComponent(universe.star.id)}`}
            >
              <ArrowLeft className="size-4" />
              {copy.back}
            </Link>
            <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700">
              <GitBranch className="size-4" />
              {formatNumber(universe.totals.edgeCount, locale)} {copy.edge}
            </span>
          </div>

          <FounderStarHero
            creatorNode={creatorNode}
            locale={locale}
            universe={universe}
          />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="grid gap-5">
              <FounderUniverseDashboardPanel
                locale={locale}
                onSelectDepth={setSelectedDepth}
                onSelectNode={setSelectedNodeId}
                selectedDepth={selectedDepth}
                selectedNodeId={selectedNodeId}
                universe={universe}
              />

              <UniverseExpansionMap
                locale={locale}
                onSelectNode={setSelectedNodeId}
                universe={universe}
              />

              <div className="rounded-[1.35rem] border border-slate-100 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.07)] sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-[#111827]">
                      {copy.members}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {formatNumber(filteredNodes.length, locale)} /{" "}
                      {formatNumber(universe.nodes.length, locale)}
                    </p>
                  </div>
                  <label className="relative block sm:w-80">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none transition placeholder:text-slate-300 focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/12"
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
                        onSelect={setSelectedNodeId}
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

            <div className="grid content-start gap-5">
              <SelectedDashboardMemberCard
                childNodes={selectedChildNodes}
                locale={locale}
                node={selectedNode}
                onSelectNode={setSelectedNodeId}
              />
              <MonthlyCpRewardCard locale={locale} universe={universe} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
