import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Brain,
  Coins,
  Database,
  Eye,
  GitBranch,
  Heart,
  Network,
  Orbit,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
} from "lucide-react";

import type {
  AgentRankEconomicReputationScore,
  AgentRankErsComponent,
  FanletterAgentRankInvestorSnapshot,
} from "@/lib/agentrank/ers";
import type { AgentRankReputationEvent } from "@/lib/agentrank/reputation-events";
import type { Locale } from "@/lib/i18n";

type AgentRankCopy = ReturnType<typeof getAgentRankCopy>;

const componentIconMap = {
  a2aUsage: Bot,
  lineageTrust: GitBranch,
  retention: Orbit,
  revenue: Coins,
  riskPenalty: ShieldAlert,
  uniqueCustomers: Users,
} satisfies Record<AgentRankErsComponent["key"], typeof Coins>;

const eventIconMap = {
  ai_star_discovered: Eye,
  ai_star_spawned: Rocket,
  content_engaged: Heart,
  cp_earned: Coins,
  creator_unlocked: Sparkles,
  founder_joined: Users,
  referral_code_created: Network,
  referral_converted: GitBranch,
  universe_growth: Orbit,
} satisfies Record<AgentRankReputationEvent["type"], typeof Eye>;

function getAgentRankCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      a2a: "A2A",
      agentRank: "AgentRank",
      agentRankBody:
        "AI Agent 간 신뢰를 점수화하는 Economic Reputation Network입니다.",
      agentStack: "AI Agent Trust Stack",
      cleanEvents: "Clean Economic Events",
      dataLayer: "MiZi 데이터/검증 레이어",
      ers: "Economic Reputation Score",
      eventFactory: "Reputation Event Factory",
      eventFactoryBody:
        "FanLetter의 발견, 참여, 초대, 창업, CP 보상이 AgentRank 이벤트 원천이 됩니다.",
      eventTimeline: "최근 Reputation Events",
      fanletter: "FanLetter",
      fanletterBody:
        "AI 스타 발견과 파운더 네트워크로 소비자 행동 데이터를 생성합니다.",
      formula: "ERS 계산식",
      generated: "Live AgentRank preview",
      googleProblem: "Google은 링크 그래프를 신뢰로 바꿨습니다.",
      heroBody:
        "FanLetter는 최종 제품이 아니라 AgentRank의 Phase 1입니다. AI 스타와 파운더 네트워크에서 발생하는 경제적 행동을 평판 이벤트로 수집해 AgentRank로 확장합니다.",
      heroTitle: "From PageRank to AgentRank",
      mizi: "MiZi",
      miziBody:
        "이벤트를 정제하고 x402, A2A, 오라클 검증 가능한 경제 이벤트로 전환합니다.",
      pageRank: "PageRank",
      productPath: "FanLetter → MiZi → AgentRank",
      roadmap: "장기 로드맵",
      score: "AgentRank Score",
      trustLayerMissing: "AI Agent 경제에는 Trust Layer가 필요합니다.",
      viewEventsApi: "Event API",
      viewFounderUniverse: "Founder Network",
      viewHome: "FanLetter 홈",
      whyMatters:
        "PageRank가 웹 링크를 신뢰로 바꾼 것처럼, AgentRank는 AI Agent의 경제 활동을 신뢰로 바꿉니다.",
      x402: "x402",
      x402Pending: "x402 결제 연결 예정",
      metrics: {
        cp: "CP 생성",
        events: "이벤트",
        members: "멤버",
        network: "네트워크 연결",
        oracle: "오라클 준비",
        stars: "AI 스타",
      },
    };
  }

  return {
    a2a: "A2A",
    agentRank: "AgentRank",
    agentRankBody:
      "The Economic Reputation Network that scores trust between AI Agents.",
    agentStack: "AI Agent Trust Stack",
    cleanEvents: "Clean Economic Events",
    dataLayer: "MiZi Data & Verification Layer",
    ers: "Economic Reputation Score",
    eventFactory: "Reputation Event Factory",
    eventFactoryBody:
      "Discovery, joins, invites, creator launches, and CP rewards become AgentRank event sources.",
    eventTimeline: "Latest Reputation Events",
    fanletter: "FanLetter",
    fanletterBody:
      "Generates consumer behavior data through AI Star Discovery and Founder Network activity.",
    formula: "ERS Formula",
    generated: "Live AgentRank preview",
    googleProblem: "Google transformed link graphs into trust.",
    heroBody:
      "FanLetter is not the final product. It is Phase 1 of AgentRank. AI Star and Founder Network actions become reputation events that compound into the AgentRank trust layer.",
    heroTitle: "From PageRank to AgentRank",
    mizi: "MiZi",
    miziBody:
      "Cleans, verifies, and enriches events into x402, A2A, and oracle-ready economic signals.",
    pageRank: "PageRank",
    productPath: "FanLetter → MiZi → AgentRank",
    roadmap: "Long-term Roadmap",
    score: "AgentRank Score",
    trustLayerMissing: "The AI Agent economy needs a trust layer.",
    viewEventsApi: "Event API",
    viewFounderUniverse: "Founder Network",
    viewHome: "FanLetter Home",
    whyMatters:
      "PageRank indexed web links. AgentRank indexes economic trust between AI Agents.",
    x402: "x402",
    x402Pending: "x402 payment integration pending",
    metrics: {
      cp: "CP Generated",
      events: "Events",
      members: "Members",
      network: "Network Edges",
      oracle: "Oracle Ready",
      stars: "AI Stars",
    },
  };
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", {
    maximumFractionDigits: 0,
  }).format(value);
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

function getEventTypeLabel(type: AgentRankReputationEvent["type"], locale: Locale) {
  if (locale !== "ko") {
    return type.replaceAll("_", " ");
  }

  const labels: Record<AgentRankReputationEvent["type"], string> = {
    ai_star_discovered: "AI 스타 발견",
    ai_star_spawned: "AI 스타 창업",
    content_engaged: "콘텐츠 반응",
    cp_earned: "CP 보상",
    creator_unlocked: "크리에이터 권한",
    founder_joined: "파운더 참여",
    referral_code_created: "추천 코드 생성",
    referral_converted: "추천 전환",
    universe_growth: "유니버스 성장",
  };

  return labels[type];
}

function getEventSourceLabel(
  source: AgentRankReputationEvent["source"],
  locale: Locale,
) {
  if (locale !== "ko") {
    const labels: Record<AgentRankReputationEvent["source"], string> = {
      fanletter_funnel_event: "FanLetter Interaction",
      fanletter_star: "AI Star Registry",
      fanletter_star_founder_membership: "Founder Network",
      fanletter_star_influence_ledger: "CP Ledger",
      fanletter_star_referral_code: "Referral Code",
      fanletter_star_referral_edge: "Referral Graph",
    };

    return labels[source];
  }

  const labels: Record<AgentRankReputationEvent["source"], string> = {
    fanletter_funnel_event: "FanLetter 행동 신호",
    fanletter_star: "AI 스타 레지스트리",
    fanletter_star_founder_membership: "파운더 네트워크",
    fanletter_star_influence_ledger: "CP 원장",
    fanletter_star_referral_code: "추천 코드",
    fanletter_star_referral_edge: "추천 그래프",
  };

  return labels[source];
}

function MetricTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-violet-100 bg-white px-4 py-3 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
      <p className="text-[0.68rem] font-semibold uppercase text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-[#11132d]">{value}</p>
    </div>
  );
}

function TrustProblemPanel({ copy }: { copy: AgentRankCopy }) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_auto_1fr]">
      <div className="rounded-lg border border-blue-100 bg-white p-5 shadow-[0_18px_44px_rgba(37,99,235,0.07)]">
        <div className="inline-flex rounded-full bg-blue-700 px-3 py-1 text-xs font-semibold text-white">
          1998 · WEB TRUST
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-[#11132d]">
          {copy.pageRank}
        </h2>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
          {copy.googleProblem}
        </p>
        <div className="mt-5 grid grid-cols-5 items-center gap-3">
          {[0, 1, 2, 3, 4].map((node) => (
            <div
              className="relative flex size-10 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white shadow-[0_12px_26px_rgba(37,99,235,0.2)]"
              key={node}
            >
              {node + 1}
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4 text-center">
          <p className="text-lg font-semibold text-blue-800">PageRank</p>
          <p className="mt-1 text-sm font-medium text-blue-700">
            Ranks web pages by link authority
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-[#151735] text-xl font-semibold text-white shadow-[0_18px_44px_rgba(15,23,42,0.18)]">
          VS
        </span>
      </div>

      <div className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.08)]">
        <div className="inline-flex rounded-full bg-[#6d28d9] px-3 py-1 text-xs font-semibold text-white">
          2026+ · AGENT TRUST
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-[#11132d]">
          AgentRank
        </h2>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
          {copy.trustLayerMissing}
        </p>
        <div className="mt-5 grid gap-2">
          {["LLM", "MCP", "A2A", "x402"].map((layer) => (
            <div
              className="flex h-11 items-center justify-between rounded-lg border border-violet-100 bg-violet-50/50 px-4 text-sm font-semibold text-[#4338ca]"
              key={layer}
            >
              <span>{layer}</span>
              <ArrowRight className="size-4 rotate-90" />
            </div>
          ))}
          <div className="rounded-lg border border-dashed border-violet-300 bg-white p-3 text-center text-sm font-semibold text-[#6d28d9]">
            ??? · Trust Layer
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductPathPanel({ copy }: { copy: AgentRankCopy }) {
  const items = [
    {
      body: copy.fanletterBody,
      icon: <Heart className="size-7" />,
      title: copy.fanletter,
    },
    {
      body: copy.miziBody,
      icon: <Database className="size-7" />,
      title: copy.mizi,
    },
    {
      body: copy.agentRankBody,
      icon: <Brain className="size-7" />,
      title: copy.agentRank,
    },
  ];

  return (
    <section className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase text-[#6d28d9]">
          {copy.agentStack}
        </p>
        <h2 className="mt-1 text-3xl font-semibold text-[#11132d]">
          {copy.productPath}
        </h2>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {items.map((item, index) => (
          <div
            className="relative rounded-lg border border-slate-100 bg-[#f8f9ff] p-5"
            key={item.title}
          >
            {index < items.length - 1 ? (
              <ArrowRight className="absolute -right-5 top-1/2 hidden size-6 -translate-y-1/2 text-[#6d28d9] lg:block" />
            ) : null}
            <div className="flex size-14 items-center justify-center rounded-lg bg-white text-[#6d28d9] shadow-[0_12px_28px_rgba(88,28,135,0.08)]">
              {item.icon}
            </div>
            <h3 className="mt-4 text-2xl font-semibold text-[#11132d]">
              {item.title}
            </h3>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
              {item.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ErsScorePanel({
  copy,
  ers,
  locale,
}: {
  copy: AgentRankCopy;
  ers: AgentRankEconomicReputationScore;
  locale: Locale;
}) {
  const scorePercent = Math.round((ers.score / ers.maxScore) * 100);

  return (
    <section className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-[#6d28d9]">
            {copy.ers}
          </p>
          <h2 className="mt-1 text-3xl font-semibold text-[#11132d]">
            {copy.score}
          </h2>
        </div>
        <div className="rounded-lg bg-gradient-to-br from-[#6d28d9] to-[#2563eb] px-5 py-4 text-right text-white shadow-[0_18px_44px_rgba(88,28,135,0.25)]">
          <p className="text-sm font-semibold text-white/76">ERS</p>
          <p className="text-5xl font-semibold">{ers.score}</p>
          <p className="text-sm font-semibold text-white/76">
            / {formatNumber(ers.maxScore, locale)}
          </p>
        </div>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-violet-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#6d28d9] via-[#2563eb] to-[#16a34a]"
          style={{ width: `${scorePercent}%` }}
        />
      </div>
      <p className="mt-4 rounded-lg border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-semibold text-[#4c1d95]">
        {ers.formula}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ers.components.map((component) => {
          const Icon = componentIconMap[component.key];
          const isPenalty = component.key === "riskPenalty";

          return (
            <div
              className="rounded-lg border border-slate-100 bg-[#f8f9ff] p-4"
              key={component.key}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                      isPenalty
                        ? "bg-red-50 text-red-600"
                        : "bg-white text-[#6d28d9]"
                    }`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#11132d]">
                      {component.label}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                      {formatNumber(component.rawValue, locale)}
                    </p>
                  </div>
                </div>
                <p
                  className={`text-xl font-semibold ${
                    isPenalty ? "text-red-600" : "text-[#4338ca]"
                  }`}
                >
                  {isPenalty ? "-" : "+"}
                  {formatNumber(component.score, locale)}
                </p>
              </div>
              <p className="mt-3 text-xs font-medium leading-5 text-slate-500">
                {component.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EventFactoryPanel({
  copy,
  events,
  locale,
}: {
  copy: AgentRankCopy;
  events: AgentRankReputationEvent[];
  locale: Locale;
}) {
  const factoryItems = [
    {
      icon: <Eye className="size-5" />,
      label: "Watch Vlog",
    },
    {
      icon: <Users className="size-5" />,
      label: "Join Universe",
    },
    {
      icon: <Network className="size-5" />,
      label: "Invite Founder",
    },
    {
      icon: <Rocket className="size-5" />,
      label: "Create AI Star",
    },
    {
      icon: <WalletCards className="size-5" />,
      label: "x402 Payment",
    },
    {
      icon: <Bot className="size-5" />,
      label: "A2A Usage",
    },
  ];

  return (
    <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="rounded-lg border border-pink-100 bg-white p-5 shadow-[0_18px_44px_rgba(219,39,119,0.07)]">
        <p className="text-sm font-semibold uppercase text-pink-600">
          {copy.eventFactory}
        </p>
        <h2 className="mt-1 text-3xl font-semibold text-[#11132d]">
          FanLetter
        </h2>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
          {copy.eventFactoryBody}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {factoryItems.map((item) => (
            <div
              className="rounded-lg border border-pink-100 bg-pink-50/60 p-3 text-center"
              key={item.label}
            >
              <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-white text-pink-600">
                {item.icon}
              </div>
              <p className="mt-2 text-xs font-semibold text-[#11132d]">
                {item.label}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-lg bg-gradient-to-r from-pink-500 to-fuchsia-500 px-4 py-3 text-center text-sm font-semibold text-white">
          {copy.cleanEvents}
        </div>
      </div>

      <div className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase text-[#6d28d9]">
              AgentRank Ledger
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[#11132d]">
              {copy.eventTimeline}
            </h2>
          </div>
          <Database className="size-8 text-[#6d28d9]" />
        </div>
        <div className="mt-4 grid gap-3">
          {events.slice(0, 8).map((event) => {
            const Icon = eventIconMap[event.type];
            const intent =
              typeof event.context.intent === "string"
                ? event.context.intent
                : null;

            return (
              <div
                className="flex items-start gap-3 rounded-lg border border-slate-100 bg-[#f8f9ff] p-3"
                key={event.eventId}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#6d28d9]">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-[#11132d]">
                      {getEventTypeLabel(event.type, locale)}
                    </p>
                    <p className="shrink-0 text-xs font-semibold text-slate-400">
                      {formatDateTime(event.occurredAt, locale)}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-violet-50 px-2 py-1 text-[0.68rem] font-semibold text-[#6d28d9]">
                      {getEventSourceLabel(event.source, locale)}
                    </span>
                    {intent ? (
                      <span className="rounded-full bg-white px-2 py-1 text-[0.68rem] font-semibold text-slate-500">
                        {intent}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate font-mono text-xs font-semibold text-[#6d28d9]">
                    {event.sourceId}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-2 py-1 text-[0.68rem] font-semibold text-slate-600">
                      {event.actor.type}: {event.actor.id}
                    </span>
                    {event.economicLayer.cpDelta ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[0.68rem] font-semibold text-emerald-700">
                        CP +{formatNumber(event.economicLayer.cpDelta, locale)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ReadinessPill({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
          : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
      }`}
    >
      {active ? <BadgeCheck className="size-4" /> : <ShieldCheck className="size-4" />}
      {label}
    </div>
  );
}

export function FanletterAgentRankPage({
  locale,
  snapshot,
}: {
  locale: Locale;
  snapshot: FanletterAgentRankInvestorSnapshot;
}) {
  const copy = getAgentRankCopy(locale);
  const { ers, eventFeed } = snapshot;
  const metrics = [
    {
      label: copy.metrics.events,
      value: formatNumber(ers.summary.eventCount, locale),
    },
    {
      label: copy.metrics.cp,
      value: formatNumber(ers.summary.cpTotal, locale),
    },
    {
      label: copy.metrics.members,
      value: formatNumber(ers.summary.uniqueMembers, locale),
    },
    {
      label: copy.metrics.stars,
      value: formatNumber(ers.summary.uniqueStars, locale),
    },
    {
      label: copy.metrics.network,
      value: formatNumber(ers.summary.networkEdges, locale),
    },
    {
      label: copy.metrics.oracle,
      value: `${formatNumber(ers.summary.oracleReadyEvents, locale)}/${formatNumber(
        ers.summary.eventCount,
        locale,
      )}`,
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f9ff] px-5 py-5 text-[#11132d]">
      <div className="mx-auto max-w-[1500px]">
        <header className="grid gap-5 rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-[0_24px_70px_rgba(88,28,135,0.08)] lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm font-semibold text-[#6d28d9]">
              <Sparkles className="size-4" />
              {copy.generated} · {formatDateTime(snapshot.generatedAt, locale)}
            </div>
            <h1 className="mt-4 text-[3rem] font-semibold leading-[1.02] tracking-normal text-[#11132d] md:text-[4.4rem]">
              {copy.heroTitle}
            </h1>
            <p className="mt-3 max-w-3xl text-lg font-medium leading-8 text-slate-600">
              {copy.heroBody}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <ReadinessPill active={ers.readiness.reputationLedgerReady} label="Reputation Ledger" />
              <ReadinessPill active={ers.readiness.oracleReady} label="Oracle-ready Events" />
              <ReadinessPill active={ers.readiness.x402Ready} label={copy.x402Pending} />
              <ReadinessPill active={ers.readiness.a2aReady} label={`${copy.a2a} pending`} />
            </div>
          </div>
          <div className="rounded-[1.25rem] bg-gradient-to-br from-[#11132d] via-[#312e81] to-[#6d28d9] p-5 text-white shadow-[0_24px_70px_rgba(88,28,135,0.24)]">
            <p className="text-sm font-semibold uppercase text-white/70">
              {snapshot.positioning.phase}
            </p>
            <h2 className="mt-3 text-4xl font-semibold">
              {snapshot.positioning.mission}
            </h2>
            <p className="mt-4 text-sm font-medium leading-6 text-white/72">
              {copy.whyMatters}
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { label: "LLM", Icon: Brain },
                { label: "MCP", Icon: Network },
                { label: "x402", Icon: WalletCards },
              ].map(({ Icon, label }) => (
                <div
                  className="rounded-lg bg-white/10 p-3 text-center ring-1 ring-white/10"
                  key={label}
                >
                  <Icon className="mx-auto size-6" />
                  <p className="mt-2 text-sm font-semibold">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {metrics.map((metric) => (
            <MetricTile
              key={metric.label}
              label={metric.label}
              value={metric.value}
            />
          ))}
        </section>

        <div className="mt-5">
          <TrustProblemPanel copy={copy} />
        </div>

        <div className="mt-5">
          <ProductPathPanel copy={copy} />
        </div>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_28rem]">
          <ErsScorePanel copy={copy} ers={ers} locale={locale} />
          <aside className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
            <p className="text-sm font-semibold uppercase text-[#6d28d9]">
              {copy.roadmap}
            </p>
            <div className="mt-4 grid gap-3">
              {eventFeed.roadmap.map((step, index) => (
                <div
                  className="flex items-center gap-3 rounded-lg border border-slate-100 bg-[#f8f9ff] p-3"
                  key={step}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#6d28d9]">
                    {index + 1}
                  </div>
                  <p className="text-sm font-semibold text-[#11132d]">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg border border-dashed border-violet-200 bg-violet-50 p-4">
              <p className="text-sm font-semibold text-[#4c1d95]">
                {copy.formula}
              </p>
              <p className="mt-2 text-sm font-medium leading-6 text-[#6d28d9]">
                {ers.formula}
              </p>
            </div>
          </aside>
        </section>

        <div className="mt-5">
          <EventFactoryPanel
            copy={copy}
            events={eventFeed.events}
            locale={locale}
          />
        </div>

        <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-full bg-gradient-to-r from-[#11132d] via-[#4338ca] to-[#6d28d9] px-6 py-4 text-white shadow-[0_18px_44px_rgba(67,56,202,0.22)]">
          <p className="font-semibold">
            Google indexed the Web. AgentRank indexes Trust between AI Agents.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-[#4338ca]"
              href={`/${locale}/fanletter`}
            >
              {copy.viewHome}
            </Link>
            <Link
              className="inline-flex h-10 items-center rounded-full bg-white/14 px-4 text-sm font-semibold text-white ring-1 ring-white/24"
              href={`/${locale}/fanletter/founder-universe`}
            >
              {copy.viewFounderUniverse}
            </Link>
            <Link
              className="inline-flex h-10 items-center rounded-full bg-white/14 px-4 text-sm font-semibold text-white ring-1 ring-white/24"
              href="/api/fanletter/agentrank/events"
            >
              {copy.viewEventsApi}
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
