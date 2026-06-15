import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Coins,
  GitBranch,
  Network,
  Orbit,
  Sparkles,
  Star,
} from "lucide-react";

import type {
  FanletterAIStarGenealogyNode,
  FanletterAIStarGenealogySnapshot,
} from "@/lib/fanletter-ai-star-genealogy-service";
import type { Locale } from "@/lib/i18n";

type GenealogyCopy = ReturnType<typeof getGenealogyCopy>;

function getGenealogyCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      aiStar: "AI STAR",
      backfilled: "계보 백필",
      backfilledCp: "CP 보상 백필",
      childStars: "파생 스타",
      depth: "Depth",
      edgeCount: "연결",
      generated: "Live genealogy",
      heroSubtitle:
        "기존 회원 Universe 관계를 기준으로 AI 스타 부모-자식 계보와 CP Pool 보상 흐름을 연결했습니다.",
      heroTitle: "AI 스타 계보 맵",
      lineage: "대표 계보",
      owner: "Creator ID",
      parent: "Parent",
      rewardTitle: "보상 백필 현황",
      root: "Root",
      roots: "Root AI Stars",
      starScore: "Star Score",
      topParents: "확장 중심 스타",
      totalStars: "전체 AI 스타",
      viewUniverse: "Universe 보기",
    };
  }

  return {
    aiStar: "AI STAR",
    backfilled: "Genealogy Backfill",
    backfilledCp: "CP Reward Backfill",
    childStars: "Spawned Stars",
    depth: "Depth",
    edgeCount: "Links",
    generated: "Live genealogy",
    heroSubtitle:
      "AI Star parent-child lineage and CP Pool rewards are connected from existing Founder Network data.",
    heroTitle: "AI Star Genealogy Map",
    lineage: "Featured Lineage",
    owner: "Creator ID",
    parent: "Parent",
    rewardTitle: "Reward Backfill",
    root: "Root",
    roots: "Root AI Stars",
    starScore: "Star Score",
    topParents: "Expansion Hubs",
    totalStars: "Total AI Stars",
    viewUniverse: "View Star Universe",
  };
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(
    value,
  );
}

function formatDateTime(value: string, locale: Locale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getInitials(value: string) {
  return value
    .replace(/[^a-zA-Z0-9가-힣\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-20 items-center gap-4 rounded-lg border border-violet-100 bg-white px-5 py-4 shadow-[0_18px_42px_rgba(88,28,135,0.07)]">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[#6d28d9]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-normal text-slate-400">
          {label}
        </p>
        <p className="mt-1 truncate text-2xl font-semibold text-[#11132d]">
          {value}
        </p>
      </div>
    </div>
  );
}

function AIStarPortrait({
  node,
  size = "md",
}: {
  node: Pick<FanletterAIStarGenealogyNode, "name" | "portraitImageUrl">;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg" ? "size-24" : size === "sm" ? "size-12" : "size-16";
  const innerClass =
    size === "lg" ? "size-20" : size === "sm" ? "size-10" : "size-14";

  return (
    <div
      aria-label={node.name}
      className={`${sizeClass} relative flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] via-[#a855f7] to-[#38bdf8] p-1 shadow-[0_16px_36px_rgba(124,58,237,0.2)]`}
      role="img"
    >
      <div
        className={`${innerClass} flex items-center justify-center overflow-hidden rounded-full border-4 border-white bg-violet-50 bg-cover bg-center text-sm font-semibold text-[#6d28d9]`}
        style={
          node.portraitImageUrl
            ? { backgroundImage: `url(${node.portraitImageUrl})` }
            : undefined
        }
      >
        {node.portraitImageUrl ? null : getInitials(node.name || "AI")}
      </div>
      <span className="absolute -right-1 top-1 rounded-full border border-white bg-[#6d5dfc] px-1.5 py-0.5 text-[0.5rem] font-semibold text-white">
        AI
      </span>
    </div>
  );
}

function AIStarMiniCard({
  copy,
  locale,
  node,
  parent,
}: {
  copy: GenealogyCopy;
  locale: Locale;
  node: FanletterAIStarGenealogyNode;
  parent?: FanletterAIStarGenealogyNode | null;
}) {
  return (
    <Link
      className="group block rounded-lg border border-violet-100 bg-white p-3 shadow-[0_12px_30px_rgba(88,28,135,0.06)] transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_18px_38px_rgba(88,28,135,0.12)]"
      href={`/${locale}/fanletter/${encodeURIComponent(node.id)}/universe`}
    >
      <div className="flex items-start gap-3">
        <AIStarPortrait node={node} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[0.55rem] font-semibold text-[#6d28d9]">
              {copy.aiStar}
            </span>
            {node.genealogyBackfilled ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.55rem] font-semibold text-emerald-700">
                BACKFILLED
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-[#11132d]">
            {node.name}
          </p>
          <p className="mt-0.5 truncate text-[0.66rem] font-semibold text-slate-400">
            {copy.owner} · {node.ownerId}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <div className="rounded-md bg-violet-50 px-2 py-1.5 text-center">
          <p className="text-sm font-semibold text-[#4338ca]">
            {node.childCount}
          </p>
          <p className="text-[0.52rem] font-semibold text-slate-400">
            Child
          </p>
        </div>
        <div className="rounded-md bg-emerald-50 px-2 py-1.5 text-center">
          <p className="text-sm font-semibold text-emerald-700">
            {formatNumber(node.directCpGenerated, locale)}
          </p>
          <p className="text-[0.52rem] font-semibold text-slate-400">CP</p>
        </div>
        <div className="rounded-md bg-slate-50 px-2 py-1.5 text-center">
          <p className="text-sm font-semibold text-slate-700">
            {node.starScore}
          </p>
          <p className="text-[0.52rem] font-semibold text-slate-400">
            Score
          </p>
        </div>
      </div>
      {parent ? (
        <p className="mt-2 truncate text-[0.62rem] font-semibold text-slate-400">
          {copy.parent}: {parent.name}
        </p>
      ) : null}
    </Link>
  );
}

function DepthMap({
  copy,
  locale,
  snapshot,
}: {
  copy: GenealogyCopy;
  locale: Locale;
  snapshot: FanletterAIStarGenealogySnapshot;
}) {
  const nodesByDepth = new Map<number, FanletterAIStarGenealogyNode[]>();
  const nodesById = new Map(snapshot.nodes.map((node) => [node.id, node]));

  for (const node of snapshot.nodes) {
    const nodes = nodesByDepth.get(node.depth) ?? [];
    nodes.push(node);
    nodesByDepth.set(node.depth, nodes);
  }

  return (
    <section className="rounded-lg border border-violet-100 bg-white/82 p-5 shadow-[0_20px_50px_rgba(88,28,135,0.07)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#4338ca]">
            <Network className="mr-2 inline size-6 align-[-0.18em]" />
            {copy.heroTitle}
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {copy.edgeCount} {formatNumber(snapshot.linkedStars, locale)} ·{" "}
            {copy.depth} 0-{snapshot.maxDepth}
          </p>
        </div>
        <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
          {formatNumber(snapshot.backfilledCp, locale)} CP
        </div>
      </div>

      <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
        {snapshot.depthStats.map((depth) => {
          const nodes = nodesByDepth.get(depth.depth) ?? [];

          return (
            <div
              className="w-72 shrink-0 rounded-lg border border-violet-100 bg-[#fbfbff] p-3"
              key={depth.depth}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#4338ca]">
                    {copy.depth} {depth.depth}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-400">
                    {formatNumber(depth.starCount, locale)} Stars
                  </p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
                  {formatNumber(depth.cpGenerated, locale)} CP
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                {nodes.map((node) => (
                  <AIStarMiniCard
                    copy={copy}
                    key={node.id}
                    locale={locale}
                    node={node}
                    parent={
                      node.parentStarId
                        ? nodesById.get(node.parentStarId) ?? null
                        : null
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RootCluster({
  copy,
  locale,
  root,
  snapshot,
}: {
  copy: GenealogyCopy;
  locale: Locale;
  root: FanletterAIStarGenealogyNode;
  snapshot: FanletterAIStarGenealogySnapshot;
}) {
  const children = snapshot.nodes
    .filter((node) => node.parentStarId === root.id)
    .sort(
      (left, right) =>
        right.childCount - left.childCount ||
        right.directCpGenerated - left.directCpGenerated,
    )
    .slice(0, 10);

  return (
    <section className="rounded-lg border border-violet-100 bg-white/88 p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
      <div className="grid gap-5 lg:grid-cols-[15rem_1fr]">
        <div className="rounded-lg border border-violet-200 bg-gradient-to-b from-white to-violet-50 p-5 text-center">
          <div className="flex justify-center">
            <AIStarPortrait node={root} size="lg" />
          </div>
          <p className="mt-3 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-[#6d28d9]">
            {copy.root}
          </p>
          <h3 className="mt-2 truncate text-xl font-semibold text-[#11132d]">
            {root.name}
          </h3>
          <p className="mt-1 truncate text-xs font-semibold text-slate-400">
            {copy.owner} · {root.ownerId}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-md bg-white px-2 py-2">
              <p className="text-lg font-semibold text-[#4338ca]">
                {root.childCount}
              </p>
              <p className="text-[0.58rem] font-semibold text-slate-400">
                {copy.childStars}
              </p>
            </div>
            <div className="rounded-md bg-white px-2 py-2">
              <p className="text-lg font-semibold text-emerald-700">
                {formatNumber(root.subtreeCpGenerated, locale)}
              </p>
              <p className="text-[0.58rem] font-semibold text-slate-400">CP</p>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[#6d28d9]">
            <Orbit className="size-5" />
            <p className="text-base font-semibold">{copy.childStars}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-5">
            {children.map((child) => (
              <Link
                className="rounded-lg border border-violet-100 bg-white p-3 text-center shadow-[0_10px_24px_rgba(88,28,135,0.06)]"
                href={`/${locale}/fanletter/${encodeURIComponent(child.id)}/universe`}
                key={child.id}
              >
                <div className="flex justify-center">
                  <AIStarPortrait node={child} size="sm" />
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-[#11132d]">
                  {child.name}
                </p>
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  {formatNumber(child.subtreeCpGenerated, locale)} CP
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LineagePanel({
  copy,
  lineage,
  locale,
}: {
  copy: GenealogyCopy;
  lineage: FanletterAIStarGenealogySnapshot["featuredLineages"][number];
  locale: Locale;
}) {
  return (
    <div className="rounded-lg border border-violet-100 bg-white p-4 shadow-[0_12px_32px_rgba(88,28,135,0.06)]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#4338ca]">{copy.lineage}</p>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          {formatNumber(lineage.cpGenerated, locale)} CP
        </span>
      </div>
      <div className="mt-4 flex items-center gap-2 overflow-hidden">
        {lineage.nodes.map((node, index) => (
          <div className="flex min-w-0 items-center gap-2" key={node.id}>
            {index > 0 ? (
              <ArrowRight className="size-5 shrink-0 text-violet-300" />
            ) : null}
            <Link
              className="min-w-20 text-center"
              href={`/${locale}/fanletter/${encodeURIComponent(node.id)}/universe`}
            >
              <div className="flex justify-center">
                <AIStarPortrait node={node} size="sm" />
              </div>
              <p className="mt-1 max-w-24 truncate text-xs font-semibold text-[#11132d]">
                {node.name}
              </p>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FanletterAIStarGenealogyPage({
  locale,
  snapshot,
}: {
  locale: Locale;
  snapshot: FanletterAIStarGenealogySnapshot;
}) {
  const copy = getGenealogyCopy(locale);

  return (
    <main className="fanletter-v2-surface min-h-screen overflow-x-auto bg-[#f8f9ff] px-5 py-5 text-[#11132d]">
      <div className="mx-auto min-w-[1180px] max-w-[1500px]">
        <header className="grid gap-5 lg:grid-cols-[1fr_42rem] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-sm font-semibold text-[#4338ca] shadow-[0_10px_26px_rgba(88,28,135,0.06)]">
              <Sparkles className="size-4" />
              {copy.generated} · {formatDateTime(snapshot.generatedAt, locale)}
            </div>
            <h1 className="mt-3 text-[3rem] font-semibold leading-[1.02] tracking-normal text-[#11132d]">
              {copy.heroTitle}
            </h1>
            <p className="mt-3 max-w-3xl text-lg font-medium leading-7 text-slate-500">
              {copy.heroSubtitle}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatPill
              icon={<Star className="size-6" />}
              label={copy.totalStars}
              value={formatNumber(snapshot.totalStars, locale)}
            />
            <StatPill
              icon={<GitBranch className="size-6" />}
              label={copy.edgeCount}
              value={formatNumber(snapshot.linkedStars, locale)}
            />
            <StatPill
              icon={<BadgeCheck className="size-6" />}
              label={copy.backfilled}
              value={formatNumber(snapshot.backfilledStars, locale)}
            />
            <StatPill
              icon={<Coins className="size-6" />}
              label={copy.backfilledCp}
              value={`${formatNumber(snapshot.backfilledCp, locale)} CP`}
            />
          </div>
        </header>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_26rem]">
          <div className="grid gap-5">
            {snapshot.roots.slice(0, 2).map((root) => (
              <RootCluster
                copy={copy}
                key={root.id}
                locale={locale}
                root={root}
                snapshot={snapshot}
              />
            ))}
          </div>

          <aside className="grid content-start gap-5">
            <section className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
              <h2 className="text-xl font-semibold text-[#4338ca]">
                {copy.rewardTitle}
              </h2>
              <div className="mt-4 grid gap-3">
                <div className="rounded-lg bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-700">
                    {copy.backfilledCp}
                  </p>
                  <p className="mt-1 text-4xl font-semibold text-emerald-800">
                    {formatNumber(snapshot.backfilledCp, locale)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-emerald-700">
                    {formatNumber(snapshot.backfilledLedgerEntries, locale)} ledger
                  </p>
                </div>
                {snapshot.topParents.slice(0, 5).map((node) => (
                  <div
                    className="grid grid-cols-[1fr_3rem_5rem] items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2"
                    key={node.id}
                  >
                    <p className="truncate text-sm font-semibold text-[#11132d]">
                      {node.name}
                    </p>
                    <p className="text-right text-sm font-semibold text-[#4338ca]">
                      {node.childCount}
                    </p>
                    <p className="text-right text-sm font-semibold text-emerald-700">
                      {formatNumber(node.subtreeCpGenerated, locale)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {snapshot.featuredLineages.map((lineage) => (
              <LineagePanel
                copy={copy}
                key={lineage.nodes.map((node) => node.id).join("-")}
                lineage={lineage}
                locale={locale}
              />
            ))}
          </aside>
        </section>

        <section className="mt-5">
          <DepthMap copy={copy} locale={locale} snapshot={snapshot} />
        </section>
      </div>
    </main>
  );
}
