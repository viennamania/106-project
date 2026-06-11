"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Bot,
  ChevronRight,
  CircleDot,
  GitBranch,
  Search,
  Sparkles,
  Users,
} from "lucide-react";

import {
  FounderRoleBadge,
  HumanMemberAvatar,
} from "@/components/fanletter-founder-club-v2";
import type {
  FanletterFounderUniverseExplorerData,
  FanletterFounderUniverseExplorerNode,
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
    founderUniverse: "Founder Universe",
    member: "Member",
    members: "Members",
    open: "Open",
    overview: "Overview",
    referral: "Referral",
    search: "Search role or referral code",
    selected: "Selected node",
    spawned: "Spawned Stars",
    title: "Universe Explorer",
  },
  ja: {
    all: "すべて",
    aiStar: "AI STAR",
    back: "戻る",
    children: "下位",
    cpPool: "CP Pool",
    edge: "Edges",
    empty: "条件に合うメンバーがいません。",
    founderUniverse: "Founder Universe",
    member: "Member",
    members: "Members",
    open: "Open",
    overview: "概要",
    referral: "Referral",
    search: "RoleまたはReferral codeを検索",
    selected: "選択ノード",
    spawned: "Spawned Stars",
    title: "Universe Explorer",
  },
  ko: {
    all: "전체",
    aiStar: "AI 스타",
    back: "뒤로",
    children: "하위",
    cpPool: "CP Pool",
    edge: "연결",
    empty: "조건에 맞는 멤버가 없습니다.",
    founderUniverse: "파운더 유니버스",
    member: "멤버",
    members: "멤버",
    open: "열림",
    overview: "요약",
    referral: "추천",
    search: "역할 또는 추천 코드 검색",
    selected: "선택 노드",
    spawned: "파생 AI 스타",
    title: "유니버스 탐색",
  },
} as const;

function getExplorerCopy(locale: Locale) {
  return locale === "ko" || locale === "ja"
    ? explorerCopy[locale]
    : explorerCopy.en;
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

function getRoleDepthLabel(tier: FanletterFounderUniverseExplorerTier) {
  return `L${tier.depth}`;
}

function AIStarCenterCard({
  locale,
  universe,
}: {
  locale: Locale;
  universe: FanletterFounderUniverseExplorerData;
}) {
  const copy = getExplorerCopy(locale);

  return (
    <div className="relative overflow-hidden rounded-lg border border-violet-300 bg-gradient-to-br from-[#7c3aed] via-[#a855f7] to-[#38bdf8] p-4 text-white shadow-[0_24px_58px_rgba(124,58,237,0.24)]">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-7 items-center rounded-full bg-white/20 px-2.5 text-[0.68rem] font-semibold backdrop-blur">
          {copy.aiStar}
        </span>
        <Sparkles className="size-5 text-white" />
      </div>
      <div className="mt-6 flex items-center gap-3">
        <div className="flex size-16 items-center justify-center rounded-full border border-white/40 bg-white/18 text-lg font-semibold">
          {universe.star.initials}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-normal">
            {universe.star.displayName || universe.star.name}
          </h1>
          <p className="mt-1 text-sm font-medium text-white/78">
            {copy.founderUniverse}
          </p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-white/14 p-2">
          <p className="text-lg font-semibold">{universe.star.starScore}</p>
          <p className="mt-1 text-[0.65rem] font-semibold text-white/70">
            Star Score
          </p>
        </div>
        <div className="rounded-lg bg-white/14 p-2">
          <p className="text-lg font-semibold">
            {formatNumber(universe.star.founderCount, locale)}
          </p>
          <p className="mt-1 text-[0.65rem] font-semibold text-white/70">
            Founder
          </p>
        </div>
        <div className="rounded-lg bg-white/14 p-2">
          <p className="text-lg font-semibold">
            {formatNumber(universe.totals.edgeCount, locale)}
          </p>
          <p className="mt-1 text-[0.65rem] font-semibold text-white/70">
            {copy.edge}
          </p>
        </div>
      </div>
    </div>
  );
}

function UniverseTierInfographic({
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
  const copy = getExplorerCopy(locale);
  const v2Copy = getFanletterV2Copy(locale);

  return (
    <div className="grid gap-2">
      {tiers.map((tier) => {
        const isSelected = selectedDepth === tier.depth;
        const fillPercent =
          tier.capacity > 0
            ? Math.max(3, Math.min(100, (tier.memberCount / tier.capacity) * 100))
            : 0;

        return (
          <button
            className={joinClasses(
              "grid min-h-[4.75rem] grid-cols-[3.7rem_1fr_auto] items-center gap-3 rounded-lg border bg-white p-3 text-left shadow-[0_12px_28px_rgba(88,28,135,0.06)] transition",
              isSelected
                ? "border-[#7c3aed] ring-2 ring-[#7c3aed]/12"
                : "border-violet-100 hover:border-violet-300",
            )}
            key={tier.depth}
            onClick={() => onSelectDepth(tier.depth)}
            type="button"
          >
            <div className="flex size-12 items-center justify-center rounded-full border border-violet-200 bg-violet-50 text-sm font-semibold text-[#6d28d9]">
              {getRoleDepthLabel(tier)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <FounderRoleBadge
                  copy={v2Copy}
                  role={tier.role as FounderRole}
                />
                {tier.cpPoolReward > 0 ? (
                  <span className="inline-flex h-7 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 text-[0.68rem] font-semibold text-emerald-800">
                    +{tier.cpPoolReward} CP
                  </span>
                ) : null}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-[#7c3aed]"
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-[#12041f]">
                {formatNumber(tier.memberCount, locale)}
              </p>
              <p className="text-[0.66rem] font-semibold text-black/45">
                / {formatNumber(tier.capacity, locale)}
              </p>
              <p className="mt-1 text-[0.64rem] font-semibold text-emerald-700">
                {copy.open} {formatNumber(tier.openSlots, locale)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
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

function SelectedNodePanel({
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
  const copy = getExplorerCopy(locale);
  const v2Copy = getFanletterV2Copy(locale);

  if (!node) {
    return null;
  }

  return (
    <aside className="rounded-lg border border-violet-100 bg-white p-4 shadow-[0_14px_34px_rgba(88,28,135,0.07)] lg:sticky lg:top-4">
      <p className="text-xs font-semibold text-[#6d28d9]">{copy.selected}</p>
      <div className="mt-3 flex items-center gap-3">
        <HumanMemberAvatar
          member={{ initials: node.initials, name: node.label }}
          size="lg"
        />
        <div className="min-w-0">
          <FounderRoleBadge copy={v2Copy} role={node.role as FounderRole} />
          <p className="mt-2 truncate text-lg font-semibold text-[#12041f]">
            {node.label}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-black/8 bg-zinc-50 p-3">
          <p className="text-xl font-semibold text-[#12041f]">
            {formatNumber(node.directChildrenCount, locale)}
          </p>
          <p className="mt-1 text-[0.68rem] font-semibold text-black/45">
            {copy.children}
          </p>
        </div>
        <div className="rounded-lg border border-black/8 bg-zinc-50 p-3">
          <p className="text-xl font-semibold text-[#12041f]">L{node.depth}</p>
          <p className="mt-1 text-[0.68rem] font-semibold text-black/45">
            Depth
          </p>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold text-black/48">
          {copy.referral}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {node.starReferralCode ? (
            <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 font-mono text-xs font-semibold text-[#6d28d9]">
              {node.starReferralCode}
            </span>
          ) : null}
          {node.memberReferralCode ? (
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-xs font-semibold text-black/54">
              {node.memberReferralCode}
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-5">
        <p className="text-xs font-semibold text-black/48">
          {copy.children}
        </p>
        <div className="mt-2 grid gap-2">
          {childNodes.length > 0 ? (
            childNodes.slice(0, 8).map((childNode) => (
              <button
                className="flex items-center gap-2 rounded-lg border border-black/8 bg-white p-2 text-left transition hover:border-violet-300"
                key={childNode.nodeId}
                onClick={() => onSelectNode(childNode.nodeId)}
                type="button"
              >
                <HumanMemberAvatar
                  member={{
                    initials: childNode.initials,
                    name: childNode.label,
                  }}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#12041f]">
                    {childNode.label}
                  </p>
                  <p className="text-[0.66rem] font-semibold text-black/42">
                    L{childNode.depth} · {v2Copy.roles[childNode.role]}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <p className="rounded-lg bg-zinc-50 p-3 text-sm font-medium text-black/46">
              {copy.empty}
            </p>
          )}
        </div>
      </div>
    </aside>
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
    <main className="min-h-screen bg-[#fbfaff] pb-28 text-[#12041f]">
      <section className="border-b border-violet-100 bg-[linear-gradient(180deg,#ffffff_0%,#fbfaff_58%,#f3efff_100%)] px-4 pb-8 pt-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[92rem]">
          <div className="flex items-center justify-between gap-3">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-full border border-violet-200 bg-white px-3 text-sm font-semibold text-[#5b21b6] shadow-[0_12px_28px_rgba(88,28,135,0.08)]"
              href={`/${locale}/fanletter/${encodeURIComponent(universe.star.id)}`}
            >
              <ArrowLeft className="size-4" />
              {copy.back}
            </Link>
            <span className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800">
              <GitBranch className="size-4" />
              {formatNumber(universe.totals.edgeCount, locale)}
            </span>
          </div>

          <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-sm font-semibold text-[#6d28d9] shadow-[0_10px_24px_rgba(88,28,135,0.08)]">
                <CircleDot className="size-4" />
                {copy.title}
              </div>
              <h1 className="mt-4 max-w-3xl text-[2.85rem] font-semibold leading-[0.98] tracking-normal [word-break:keep-all] sm:text-[4.75rem]">
                {universe.star.displayName || universe.star.name}
                <span className="block text-[#6d28d9]">
                  {copy.founderUniverse}
                </span>
              </h1>
              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-black/8 bg-white p-3">
                  <p className="text-xl font-semibold">
                    {formatNumber(universe.totals.totalMembers, locale)}
                  </p>
                  <p className="mt-1 text-[0.68rem] font-semibold text-black/45">
                    {copy.members}
                  </p>
                </div>
                <div className="rounded-lg border border-black/8 bg-white p-3">
                  <p className="text-xl font-semibold">
                    {formatNumber(universe.totals.activeReferralCodes, locale)}
                  </p>
                  <p className="mt-1 text-[0.68rem] font-semibold text-black/45">
                    {copy.referral}
                  </p>
                </div>
                <div className="rounded-lg border border-black/8 bg-white p-3">
                  <p className="text-xl font-semibold">
                    {formatNumber(universe.totals.spawnedStars, locale)}
                  </p>
                  <p className="mt-1 text-[0.68rem] font-semibold text-black/45">
                    {copy.spawned}
                  </p>
                </div>
              </div>
            </div>
            <AIStarCenterCard locale={locale} universe={universe} />
          </div>
        </div>
      </section>

      <section className="px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto grid max-w-[92rem] gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-5">
            <div className="rounded-lg border border-violet-100 bg-white/72 p-3 shadow-[0_12px_34px_rgba(88,28,135,0.06)] backdrop-blur">
              <div className="flex items-center gap-2">
                <Bot className="size-5 text-[#6d28d9]" />
                <p className="text-sm font-semibold text-[#6d28d9]">
                  {copy.overview}
                </p>
              </div>
              <div className="mt-3 grid gap-2">
                <button
                  className={joinClasses(
                    "h-10 rounded-lg border px-3 text-sm font-semibold transition",
                    selectedDepth === "all"
                      ? "border-[#7c3aed] bg-violet-50 text-[#5b21b6]"
                      : "border-black/8 bg-white text-black/54",
                  )}
                  onClick={() => setSelectedDepth("all")}
                  type="button"
                >
                  {copy.all}
                </button>
                <UniverseTierInfographic
                  locale={locale}
                  onSelectDepth={setSelectedDepth}
                  selectedDepth={selectedDepth}
                  tiers={universe.tiers}
                />
              </div>
            </div>

            <div className="rounded-lg border border-violet-100 bg-white p-3 shadow-[0_12px_34px_rgba(88,28,135,0.06)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#6d28d9]">
                    {copy.members}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-black/42">
                    {formatNumber(filteredNodes.length, locale)} /{" "}
                    {formatNumber(universe.nodes.length, locale)}
                  </p>
                </div>
                <label className="relative block sm:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/32" />
                  <input
                    className="h-11 w-full rounded-lg border border-black/10 bg-white pl-9 pr-3 text-sm font-semibold outline-none transition placeholder:text-black/32 focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/12"
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
                  <p className="rounded-lg bg-zinc-50 p-4 text-sm font-semibold text-black/48 sm:col-span-2 xl:col-span-3">
                    {copy.empty}
                  </p>
                )}
              </div>
            </div>
          </div>

          <SelectedNodePanel
            childNodes={selectedChildNodes}
            locale={locale}
            node={selectedNode}
            onSelectNode={setSelectedNodeId}
          />
        </div>
      </section>
    </main>
  );
}
