import type { CSSProperties, ReactNode } from "react";
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

import {
  buildAgentRankCoverageSnapshot,
  type AgentRankCoverageSnapshot,
} from "@/lib/agentrank/coverage";
import type { AgentRankInteractionSource } from "@/lib/agentrank/interaction-events";
import { FanletterAgentRankTracker } from "@/components/fanletter-agentrank-tracker";
import { FanletterTrackedLink } from "@/components/fanletter-tracked-link";
import type {
  AgentRankEconomicReputationScore,
  AgentRankErsComponent,
  FanletterAgentRankInvestorSnapshot,
} from "@/lib/agentrank/ers";
import type { AgentRankReputationEvent } from "@/lib/agentrank/reputation-events";
import type {
  AgentRankScoreAggregate,
  AgentRankScoreDimensionKey,
} from "@/lib/agentrank/score";
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
  creator_unlock_evaluated: BadgeCheck,
  creator_unlocked: Sparkles,
  founder_joined: Users,
  referral_code_created: Network,
  referral_converted: GitBranch,
  source_universe_selected: ShieldCheck,
  universe_growth: Orbit,
  x402_mock_payment_intent: WalletCards,
} satisfies Record<AgentRankReputationEvent["type"], typeof Eye>;

const scoreDimensionIconMap = {
  creator: Rocket,
  discovery: Eye,
  economic: Coins,
  network: Network,
  riskPenalty: ShieldAlert,
  trust: ShieldCheck,
} satisfies Record<AgentRankScoreDimensionKey, typeof Coins>;

function getAgentRankCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      a2a: "A2A",
      agentRank: "AgentRank",
      agentRankBody:
        "AI Agent 간 신뢰를 점수화하는 Economic Reputation Network입니다.",
      agentRankCta: "Rank · Score · Predict · Empower",
      agentRankTrustLine:
        "AgentRank는 경제 활동을 사용해 AI Agent의 신뢰를 측정합니다.",
      agentTransactionGraph: "Agent Transaction Graph",
      agentStack: "AI Agent Trust Stack",
      cleanEvents: "Clean Economic Events",
      collectVerify: "Collect · Verify · Enrich · Store · Connect",
      coverage: {
        covered: "수집됨",
        eventCoverage: "이벤트 타입 커버리지",
        gaps: "우선 보강 신호",
        interactionCoverage: "CTA 소스 커버리지",
        missing: "대기",
        oracleCoverage: "오라클 준비율",
        phase1Quality: "Phase 1 데이터 품질",
        schemaCoverage: "AgentRank 스키마 준비율",
        subtitle:
          "FanLetter 행동이 AgentRank 평판 이벤트로 얼마나 안정적으로 쌓이는지 점검합니다.",
        title: "AgentRank Event Quality",
      },
      dataLayer: "MiZi 데이터/검증 레이어",
      economicActivity: "평판은 경제 활동에서 만들어집니다",
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
      googleTrustLine: "Google은 링크를 사용해 웹 신뢰를 측정했습니다.",
      heroBody:
        "FanLetter는 최종 제품이 아니라 AgentRank의 Phase 1입니다. AI 스타와 파운더 네트워크에서 발생하는 경제적 행동을 평판 이벤트로 수집해 AgentRank로 확장합니다.",
      heroTitle: "From PageRank to AgentRank",
      heroSubtitle: "AI Agent 경제를 위한 Trust Infrastructure",
      mizi: "MiZi",
      miziBody:
        "이벤트를 정제하고 x402, A2A, 오라클 검증 가능한 경제 이벤트로 전환합니다.",
      miziEquals: "MiZi = PeopleGPT",
      miziPeople:
        "AI 경제를 위한 People Search Engine입니다. 사람, 크리에이터, AI Agent의 검증된 기록을 연결합니다.",
      pageRank: "PageRank",
      productPath: "FanLetter → MiZi (PeopleGPT) → AgentRank",
      reputationInfrastructure: "Reputation Infrastructure",
      roadmap: "장기 로드맵",
      score: "AgentRank Score",
      scoreAggregator: "AgentRank Score Aggregator",
      scoreAggregatorBody:
        "Reputation Event를 Founder Network, 경제 활동, Creator Journey, AI 스타 발견, Lineage Trust 차원으로 집계합니다.",
      scoreConfidence: "집계 신뢰도",
      trustLayerMissing: "AI Agent 경제에는 Trust Layer가 필요합니다.",
      topContributors: "상위 기여자",
      useCases: "Use Cases",
      viewEventsApi: "Event Ledger",
      viewFounderUniverse: "Founder Network",
      viewHome: "FanLetter 홈",
      whyMatters:
        "PageRank가 웹 링크를 신뢰로 바꾼 것처럼, AgentRank는 AI Agent의 경제 활동을 신뢰로 바꿉니다.",
      x402: "x402",
      x402Pending: "x402 결제 연결 예정",
      bottomStatements: [
        "Google organized the world's information.",
        "PeopleGPT organizes the world's trust.",
        "AgentRank measures economic reputation.",
      ],
      futureBuild: "우리가 만드는 미래",
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
    agentRankCta: "Rank · Score · Predict · Empower",
    agentRankTrustLine:
      "AgentRank uses economic activity to measure AI Agent trust.",
    agentTransactionGraph: "Agent Transaction Graph",
    agentStack: "AI Agent Trust Stack",
    cleanEvents: "Clean Economic Events",
    collectVerify: "Collect · Verify · Enrich · Store · Connect",
    coverage: {
      covered: "Covered",
      eventCoverage: "Event Type Coverage",
      gaps: "Priority Gaps",
      interactionCoverage: "CTA Source Coverage",
      missing: "Pending",
      oracleCoverage: "Oracle-ready Coverage",
      phase1Quality: "Phase 1 Data Quality",
      schemaCoverage: "AgentRank Schema Coverage",
      subtitle:
        "Checks how reliably FanLetter actions are becoming AgentRank reputation events.",
      title: "AgentRank Event Quality",
    },
    dataLayer: "MiZi Data & Verification Layer",
    economicActivity: "Reputation is built from economic activity",
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
    googleTrustLine: "Google used links to measure web trust.",
    heroBody:
      "FanLetter is not the final product. It is Phase 1 of AgentRank. AI Star and Founder Network actions become reputation events that compound into the AgentRank trust layer.",
    heroTitle: "From PageRank to AgentRank",
    heroSubtitle: "Building the Trust Infrastructure for the AI Agent Economy",
    mizi: "MiZi",
    miziBody:
      "Cleans, verifies, and enriches events into x402, A2A, and oracle-ready economic signals.",
    miziEquals: "MiZi = PeopleGPT",
    miziPeople:
      "The People Search Engine for the AI Economy. It connects verified records for people, creators, and AI Agents.",
    pageRank: "PageRank",
    productPath: "FanLetter → MiZi (PeopleGPT) → AgentRank",
    reputationInfrastructure: "Reputation Infrastructure",
    roadmap: "Long-term Roadmap",
    score: "AgentRank Score",
    scoreAggregator: "AgentRank Score Aggregator",
    scoreAggregatorBody:
      "Aggregates Reputation Events into Founder Network, Economic Activity, Creator Journey, AI Star Discovery, and Lineage Trust dimensions.",
    scoreConfidence: "Score Confidence",
    trustLayerMissing: "The AI Agent economy needs a trust layer.",
    topContributors: "Top Contributors",
    useCases: "Use Cases",
    viewEventsApi: "Event Ledger",
    viewFounderUniverse: "Founder Network",
    viewHome: "FanLetter Home",
    whyMatters:
      "PageRank indexed web links. AgentRank indexes economic trust between AI Agents.",
    x402: "x402",
    x402Pending: "x402 payment integration pending",
    bottomStatements: [
      "Google organized the world's information.",
      "PeopleGPT organizes the world's trust.",
      "AgentRank measures economic reputation.",
    ],
    futureBuild: "The Future We Build",
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
    creator_unlock_evaluated: "권한 평가",
    creator_unlocked: "크리에이터 권한",
    founder_joined: "파운더 참여",
    referral_code_created: "추천 코드 생성",
    referral_converted: "추천 전환",
    source_universe_selected: "출처 유니버스 선택",
    universe_growth: "유니버스 성장",
    x402_mock_payment_intent: "x402 결제 의도",
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

function getInteractionSourceLabel(
  source: AgentRankInteractionSource,
  locale: Locale,
) {
  const labels: Record<AgentRankInteractionSource, string> =
    locale === "ko"
      ? {
          fanletter_agentrank: "AgentRank 페이지",
          fanletter_bridge: "연결/온보딩",
          fanletter_content: "콘텐츠/브이로그",
          fanletter_creator_unlock: "크리에이터 권한",
          fanletter_founder_universe: "파운더 네트워크",
          fanletter_home: "FanLetter 홈",
          fanletter_news: "뉴스/리포트",
          fanletter_star_detail: "AI 스타 상세",
        }
      : {
          fanletter_agentrank: "AgentRank Page",
          fanletter_bridge: "Connect / Onboarding",
          fanletter_content: "Content / Vlog",
          fanletter_creator_unlock: "Creator Unlock",
          fanletter_founder_universe: "Founder Network",
          fanletter_home: "FanLetter Home",
          fanletter_news: "News / Reports",
          fanletter_star_detail: "AI Star Detail",
        };

  return labels[source];
}

function getCoverageGapLabel(gap: string, locale: Locale) {
  const [kind, value] = gap.split(":");

  if (kind === "missing_event") {
    return locale === "ko"
      ? `이벤트 미수집: ${getEventTypeLabel(
          value as AgentRankReputationEvent["type"],
          locale,
        )}`
      : `Missing event: ${value.replaceAll("_", " ")}`;
  }

  if (kind === "missing_source") {
    return locale === "ko"
      ? `CTA 소스 미수집: ${getInteractionSourceLabel(
          value as AgentRankInteractionSource,
          locale,
        )}`
      : `Missing CTA source: ${getInteractionSourceLabel(
          value as AgentRankInteractionSource,
          locale,
        )}`;
  }

  if (gap === "pending:x402_economy") {
    return locale === "ko"
      ? "x402 결제 이벤트 연결 예정"
      : "x402 payment events pending";
  }

  if (gap === "pending:a2a_usage") {
    return locale === "ko"
      ? "A2A 호출 이벤트 연결 예정"
      : "A2A call events pending";
  }

  return gap;
}

function getScoreDimensionLabel(
  key: AgentRankScoreDimensionKey,
  locale: Locale,
) {
  const labels: Record<AgentRankScoreDimensionKey, string> =
    locale === "ko"
      ? {
          creator: "크리에이터 여정",
          discovery: "AI 스타 발견",
          economic: "경제 활동",
          network: "파운더 네트워크",
          riskPenalty: "위험 패널티",
          trust: "리니지 신뢰",
        }
      : {
          creator: "Creator Journey",
          discovery: "AI Star Discovery",
          economic: "Economic Activity",
          network: "Founder Network",
          riskPenalty: "Risk Penalty",
          trust: "Lineage Trust",
        };

  return labels[key];
}

function MetricTile({
  label,
  style,
  value,
}: {
  label: string;
  style?: CSSProperties;
  value: string;
}) {
  return (
    <div
      className="agentrank-flow-card rounded-lg border border-violet-100 bg-white px-4 py-3 shadow-[0_18px_44px_rgba(88,28,135,0.06)]"
      style={style}
    >
      <p className="text-[0.68rem] font-semibold uppercase text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-[#11132d]">{value}</p>
    </div>
  );
}

function MiniConnectionGraph({
  variant,
}: {
  variant: "agent" | "web";
}) {
  const nodes = [
    { left: "10%", top: "48%" },
    { left: "30%", top: "25%" },
    { left: "46%", top: "55%" },
    { left: "66%", top: "28%" },
    { left: "80%", top: "62%" },
  ];
  const lines = [
    { left: "17%", top: "47%", rotate: -26, width: "28%" },
    { left: "36%", top: "38%", rotate: 34, width: "26%" },
    { left: "54%", top: "43%", rotate: -28, width: "26%" },
    { left: "56%", top: "63%", rotate: 8, width: "30%" },
    { left: "23%", top: "61%", rotate: -6, width: "34%" },
  ];
  const isWeb = variant === "web";
  const nodeClass = isWeb
    ? "bg-blue-600 text-white ring-blue-100"
    : "bg-violet-600 text-white ring-violet-100";
  const lineClass = isWeb ? "bg-blue-300/80" : "bg-violet-300/80";

  return (
    <div className="relative h-36 overflow-hidden rounded-lg border border-slate-100 bg-white">
      {lines.map((line, index) => (
        <span
          className={`agentrank-graph-line absolute h-0.5 rounded-full ${lineClass}`}
          key={`${line.left}-${line.top}-${index}`}
          style={{
            animationDelay: `${index * 160}ms`,
            left: line.left,
            top: line.top,
            transform: `rotate(${line.rotate}deg)`,
            width: line.width,
          }}
        />
      ))}
      {nodes.map((node, index) => (
        <span
          className={`agentrank-graph-node absolute flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-semibold ring-8 ${nodeClass}`}
          key={`${node.left}-${node.top}-${index}`}
          style={{
            animationDelay: `${index * 180}ms`,
            left: node.left,
            top: node.top,
          }}
        >
          {isWeb ? index + 1 : <Bot className="size-4" />}
        </span>
      ))}
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
        {isWeb ? "Web Link Graph" : "Agent Transaction Graph"}
      </span>
    </div>
  );
}

function IconMiniTile({
  icon,
  label,
  tone = "violet",
}: {
  icon: ReactNode;
  label: string;
  tone?: "blue" | "emerald" | "pink" | "violet";
}) {
  const toneClass = {
    blue: "border-blue-100 bg-blue-50/70 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
    pink: "border-pink-100 bg-pink-50/70 text-pink-700",
    violet: "border-violet-100 bg-violet-50/70 text-[#6d28d9]",
  }[tone];

  return (
    <div
      className={`agentrank-flow-card min-w-0 rounded-lg border px-3 py-3 text-center ${toneClass}`}
    >
      <div className="mx-auto flex size-9 items-center justify-center rounded-lg bg-white shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
        {icon}
      </div>
      <p className="mt-2 text-xs font-semibold leading-4 text-[#11132d]">
        {label}
      </p>
    </div>
  );
}

function CoverageProgress({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-violet-100 bg-white p-4 shadow-[0_14px_34px_rgba(88,28,135,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#11132d]">{label}</p>
        <p className="text-2xl font-semibold text-[#6d28d9]">{value}%</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-violet-100">
        <div
          className="agentrank-score-bar h-full rounded-full bg-gradient-to-r from-[#6d28d9] via-[#2563eb] to-[#16a34a]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function AgentRankCoveragePanel({
  copy,
  coverage,
  locale,
}: {
  copy: AgentRankCopy;
  coverage: AgentRankCoverageSnapshot;
  locale: Locale;
}) {
  const layerClass = {
    creator: "border-pink-100 bg-pink-50/70 text-pink-700",
    discovery: "border-blue-100 bg-blue-50/70 text-blue-700",
    economy: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
    network: "border-violet-100 bg-violet-50/70 text-[#6d28d9]",
  } satisfies Record<
    AgentRankCoverageSnapshot["eventTypes"][number]["layer"],
    string
  >;

  return (
    <section className="agentrank-flow-card rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-semibold uppercase text-[#6d28d9]">
            {copy.coverage.title}
          </p>
          <h2 className="mt-1 text-3xl font-semibold text-[#11132d]">
            {copy.coverage.phase1Quality} · {coverage.phase1QualityScore}%
          </h2>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
            {copy.coverage.subtitle}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <CoverageProgress
              label={copy.coverage.eventCoverage}
              value={coverage.eventTypeCoveragePercent}
            />
            <CoverageProgress
              label={copy.coverage.interactionCoverage}
              value={coverage.interactionSourceCoveragePercent}
            />
            <CoverageProgress
              label={copy.coverage.oracleCoverage}
              value={coverage.oracleCoveragePercent}
            />
            <CoverageProgress
              label={copy.coverage.schemaCoverage}
              value={coverage.schemaCoveragePercent}
            />
          </div>
          <div className="mt-5 rounded-lg border border-dashed border-violet-200 bg-violet-50 p-4">
            <p className="text-sm font-semibold text-[#4c1d95]">
              {copy.coverage.gaps}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {coverage.gaps.map((gap) => (
                <span
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#6d28d9] ring-1 ring-violet-100"
                  key={gap}
                >
                  {getCoverageGapLabel(gap, locale)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase text-[#6d28d9]">
                {copy.coverage.eventCoverage}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                {coverage.totals.coveredEventTypes}/
                {coverage.totals.eventTypes}
              </p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {coverage.eventTypes.map((item) => {
                const Icon = eventIconMap[item.type];

                return (
                  <div
                    className={`min-w-0 rounded-lg border p-3 ${
                      item.covered
                        ? layerClass[item.layer]
                        : "border-slate-100 bg-slate-50 text-slate-400"
                    }`}
                    key={item.type}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#11132d]">
                            {getEventTypeLabel(item.type, locale)}
                          </p>
                          <p className="text-xs font-semibold text-slate-500">
                            {item.count} events
                          </p>
                        </div>
                      </div>
                      {item.covered ? (
                        <BadgeCheck className="size-5 shrink-0 text-emerald-600" />
                      ) : (
                        <ShieldCheck className="size-5 shrink-0 text-slate-300" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase text-[#6d28d9]">
                {copy.coverage.interactionCoverage}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                {coverage.totals.coveredInteractionSources}/
                {coverage.totals.interactionSources}
              </p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {coverage.sources.map((source) => (
                <div
                  className={`rounded-lg border px-3 py-3 ${
                    source.covered
                      ? "border-emerald-100 bg-emerald-50/70"
                      : "border-slate-100 bg-slate-50"
                  }`}
                  key={source.source}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-[#11132d]">
                      {getInteractionSourceLabel(source.source, locale)}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.68rem] font-semibold ${
                        source.covered
                          ? "bg-white text-emerald-700"
                          : "bg-white text-slate-400"
                      }`}
                    >
                      {source.count}
                    </span>
                  </div>
                  <p
                    className={`mt-2 text-xs font-semibold ${
                      source.covered ? "text-emerald-700" : "text-slate-400"
                    }`}
                  >
                    {source.covered
                      ? copy.coverage.covered
                      : copy.coverage.missing}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AgentRankScoreAggregatorPanel({
  copy,
  locale,
  scoreAggregate,
}: {
  copy: AgentRankCopy;
  locale: Locale;
  scoreAggregate: AgentRankScoreAggregate;
}) {
  const scorePercent = Math.round(
    (scoreAggregate.score / scoreAggregate.maxScore) * 100,
  );
  const readinessItems = [
    {
      active: scoreAggregate.readiness.reputationLedgerReady,
      label: "Ledger",
    },
    {
      active: scoreAggregate.readiness.oracleReady,
      label: `Oracle ${scoreAggregate.readiness.oracleReadyPercent}%`,
    },
    {
      active: scoreAggregate.readiness.x402Ready,
      label: "x402",
    },
    {
      active: scoreAggregate.readiness.a2aReady,
      label: "A2A",
    },
  ];

  return (
    <section className="agentrank-flow-card overflow-hidden rounded-lg border border-violet-100 bg-white shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
      <div className="grid gap-5 p-5 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-lg bg-gradient-to-br from-[#11132d] via-[#312e81] to-[#6d28d9] p-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-white/70">
                {copy.scoreAggregator}
              </p>
              <h2 className="mt-2 text-4xl font-semibold">
                {scoreAggregate.score}
                <span className="text-lg font-semibold text-white/60">
                  / {formatNumber(scoreAggregate.maxScore, locale)}
                </span>
              </h2>
            </div>
            <div className="rounded-lg bg-white/12 px-4 py-3 text-right ring-1 ring-white/10">
              <p className="text-xs font-semibold uppercase text-white/60">
                {copy.scoreConfidence}
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {scoreAggregate.confidence}%
              </p>
            </div>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/12">
            <div
              className="agentrank-score-bar h-full rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-white"
              style={{ width: `${scorePercent}%` }}
            />
          </div>
          <p className="mt-4 text-sm font-medium leading-6 text-white/74">
            {copy.scoreAggregatorBody}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {readinessItems.map((item) => (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                  item.active
                    ? "bg-emerald-300/18 text-emerald-100 ring-emerald-200/25"
                    : "bg-white/8 text-white/58 ring-white/10"
                }`}
                key={item.label}
              >
                {item.active ? (
                  <BadgeCheck className="size-3.5" />
                ) : (
                  <ShieldCheck className="size-3.5" />
                )}
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          {scoreAggregate.dimensions.map((dimension) => {
            const Icon = scoreDimensionIconMap[dimension.key];
            const isPenalty = dimension.key === "riskPenalty";
            const dimensionPercent = Math.round(
              (dimension.score / Math.max(1, dimension.maxScore)) * 100,
            );

            return (
              <div
                className="rounded-lg border border-slate-100 bg-[#f8f9ff] p-4"
                key={dimension.key}
              >
                <div className="flex items-start justify-between gap-4">
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
                        {getScoreDimensionLabel(dimension.key, locale)}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        raw {formatNumber(dimension.rawValue, locale)}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`shrink-0 text-xl font-semibold ${
                      isPenalty ? "text-red-600" : "text-[#4338ca]"
                    }`}
                  >
                    {isPenalty ? "-" : "+"}
                    {formatNumber(dimension.score, locale)}
                  </p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className={`h-full rounded-full ${
                      isPenalty
                        ? "bg-gradient-to-r from-red-500 to-orange-400"
                        : "agentrank-score-bar bg-gradient-to-r from-[#6d28d9] via-[#2563eb] to-[#16a34a]"
                    }`}
                    style={{ width: `${dimensionPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 border-t border-violet-100 bg-violet-50/40 p-5 xl:grid-cols-[1fr_0.9fr]">
        <div>
          <p className="text-sm font-semibold uppercase text-[#6d28d9]">
            {copy.formula}
          </p>
          <p className="mt-2 text-sm font-medium leading-6 text-[#4c1d95]">
            {scoreAggregate.formula}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase text-[#6d28d9]">
            {copy.topContributors}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {scoreAggregate.topContributors.slice(0, 4).map((contributor) => (
              <div
                className="flex items-center justify-between gap-3 rounded-lg border border-violet-100 bg-white px-3 py-2"
                key={`${contributor.actorType}:${contributor.actorId}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#11132d]">
                    {contributor.label ?? contributor.actorId}
                  </p>
                  <p className="text-xs font-semibold text-slate-500">
                    {contributor.actorType}
                    {contributor.role ? ` · ${contributor.role}` : ""} ·{" "}
                    {formatNumber(contributor.eventCount, locale)} events
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-[#6d28d9]">
                  {formatNumber(contributor.contributionScore, locale)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustProblemPanel({ copy }: { copy: AgentRankCopy }) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_auto_1fr]">
      <div className="agentrank-flow-card rounded-lg border border-blue-100 bg-white p-5 shadow-[0_18px_44px_rgba(37,99,235,0.07)]">
        <div className="inline-flex rounded-full bg-blue-700 px-3 py-1 text-xs font-semibold text-white">
          1998 · GOOGLE SOLVED THE WEB TRUST PROBLEM
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[0.78fr_1fr_0.78fr] md:items-center">
          <div>
            <p className="text-3xl font-semibold text-blue-700">Google</p>
            <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
              {copy.googleProblem}
            </p>
          </div>
          <MiniConnectionGraph variant="web" />
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-center">
            <div className="agentrank-soft-float mx-auto flex size-12 items-center justify-center rounded-lg bg-white text-blue-700 shadow-[0_12px_26px_rgba(37,99,235,0.12)]">
              <Sparkles className="size-6" />
            </div>
            <p className="mt-3 text-xl font-semibold text-blue-800">
              {copy.pageRank}
            </p>
            <p className="mt-1 text-sm font-medium text-blue-700">
              Ranks web pages by link authority
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-center text-sm font-semibold text-blue-700">
          {copy.googleTrustLine}
        </div>
      </div>

      <div className="flex items-center justify-center">
        <span className="agentrank-soft-float flex size-16 items-center justify-center rounded-full bg-[#151735] text-xl font-semibold text-white shadow-[0_18px_44px_rgba(15,23,42,0.18)]">
          VS
        </span>
      </div>

      <div className="agentrank-flow-card rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.08)]">
        <div className="inline-flex rounded-full bg-[#6d28d9] px-3 py-1 text-xs font-semibold text-white">
          2026+ · AI AGENTS FACE THE SAME TRUST PROBLEM
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div>
            <h2 className="text-2xl font-semibold text-[#11132d]">
              {copy.agentRank}
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
              {copy.trustLayerMissing}
            </p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {["LLM", "MCP", "A2A", "x402"].map((layer) => (
                <div
                  className="rounded-lg border border-violet-100 bg-violet-50/70 px-2 py-3 text-center text-xs font-semibold text-[#4338ca]"
                  key={layer}
                >
                  {layer}
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-dashed border-violet-300 bg-white p-3 text-center text-sm font-semibold text-[#6d28d9]">
              ??? · Trust Layer is Missing
            </div>
          </div>
          <MiniConnectionGraph variant="agent" />
        </div>
        <div className="mt-4 rounded-lg bg-violet-50 px-4 py-3 text-center text-sm font-semibold text-[#6d28d9]">
          {copy.agentRankTrustLine}
        </div>
      </div>
    </section>
  );
}

function ProductPathPanel({
  copy,
  ers,
}: {
  copy: AgentRankCopy;
  ers: AgentRankEconomicReputationScore;
}) {
  const fanletterEvents = [
    { icon: <Eye className="size-5" />, label: "Watch Vlog" },
    { icon: <Heart className="size-5" />, label: "Like / Comment" },
    { icon: <Users className="size-5" />, label: "Join Universe" },
    { icon: <Network className="size-5" />, label: "Invite Founder" },
    { icon: <Rocket className="size-5" />, label: "Create AI Star" },
    { icon: <WalletCards className="size-5" />, label: "x402 Payment" },
    { icon: <Bot className="size-5" />, label: "A2A Call" },
    { icon: <Orbit className="size-5" />, label: "Repeat Usage" },
    { icon: <Sparkles className="size-5" />, label: "More Events" },
  ];
  const miziInfra = [
    { icon: <ShieldCheck className="size-5" />, label: "Identity" },
    { icon: <Database className="size-5" />, label: "Skills & Profile" },
    { icon: <Network className="size-5" />, label: "MCP" },
    { icon: <Bot className="size-5" />, label: "A2A" },
    { icon: <WalletCards className="size-5" />, label: "x402" },
    { icon: <BadgeCheck className="size-5" />, label: "Oracle" },
  ];
  const agentRankSignals = [
    { icon: <Coins className="size-5" />, label: "Revenue" },
    { icon: <Users className="size-5" />, label: "Customers" },
    { icon: <Orbit className="size-5" />, label: "Retention" },
    { icon: <Bot className="size-5" />, label: "A2A Usage" },
    { icon: <GitBranch className="size-5" />, label: "Lineage" },
    { icon: <ShieldAlert className="size-5" />, label: "Risk" },
  ];

  return (
    <section className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase text-[#6d28d9]">
          OUR VISION: THE AI AGENT TRUST STACK
        </p>
        <h2 className="mt-1 text-3xl font-semibold text-[#11132d]">
          {copy.productPath}
        </h2>
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div
          className="agentrank-flow-card agentrank-stage-card relative min-w-0 overflow-hidden rounded-lg border border-pink-100 bg-pink-50/35 p-5"
          style={{ animationDelay: "80ms" }}
        >
          <ArrowRight className="absolute -right-4 top-1/2 hidden size-8 -translate-y-1/2 text-pink-400 xl:block" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-pink-600">
                1. {copy.fanletter}
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-[#11132d]">
                {copy.eventFactory}
              </h3>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                {copy.fanletterBody}
              </p>
            </div>
            <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-white text-pink-600 shadow-[0_12px_28px_rgba(219,39,119,0.1)]">
              <Heart className="size-7" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {fanletterEvents.map((event) => (
              <IconMiniTile
                icon={event.icon}
                key={event.label}
                label={event.label}
                tone="pink"
              />
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-gradient-to-r from-pink-500 to-fuchsia-500 px-4 py-3 text-center text-sm font-semibold text-white">
            Raw data of value, behavior, and interactions
          </div>
        </div>

        <div
          className="agentrank-flow-card agentrank-stage-card relative min-w-0 overflow-hidden rounded-lg border border-blue-100 bg-blue-50/35 p-5"
          style={{ animationDelay: "160ms" }}
        >
          <ArrowRight className="absolute -right-4 top-1/2 hidden size-8 -translate-y-1/2 text-blue-400 xl:block" />
          <div className="text-center">
            <p className="text-sm font-semibold uppercase text-blue-700">
              2. {copy.miziEquals}
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-[#11132d]">
              People Search Engine
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-600">
              {copy.miziPeople}
            </p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="rounded-lg border border-blue-100 bg-white p-3 text-center text-xs font-semibold text-blue-700">
              Who is the best person for this job?
            </div>
            <div className="agentrank-soft-float mx-auto flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-[0_18px_44px_rgba(37,99,235,0.22)]">
              <Bot className="size-11" />
            </div>
            <div className="rounded-lg border border-blue-100 bg-white p-3 text-center text-xs font-semibold text-blue-700">
              Which AI Agent is the most trusted?
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-blue-100 bg-white p-3 text-center text-xs font-semibold text-blue-700">
            Who has the right skills and proven track record?
          </div>
          <p className="mt-5 text-sm font-semibold uppercase text-blue-700">
            {copy.reputationInfrastructure}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {miziInfra.map((item) => (
              <IconMiniTile
                icon={item.icon}
                key={item.label}
                label={item.label}
                tone="blue"
              />
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 text-center text-sm font-semibold text-white">
            {copy.collectVerify}
          </div>
        </div>

        <div
          className="agentrank-flow-card agentrank-stage-card relative min-w-0 overflow-hidden rounded-lg border border-violet-100 bg-violet-50/40 p-5"
          style={{ animationDelay: "240ms" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-[#6d28d9]">
                3. {copy.agentRank}
              </p>
              <h3 className="mt-1 text-2xl font-semibold text-[#11132d]">
                Economic Reputation Engine
              </h3>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                {copy.agentRankBody}
              </p>
            </div>
            <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-white text-[#6d28d9] shadow-[0_12px_28px_rgba(88,28,135,0.1)]">
              <Brain className="size-7" />
            </div>
          </div>
          <div className="mt-5 rounded-lg border border-violet-100 bg-white p-4">
            <p className="text-center text-sm font-semibold uppercase text-[#6d28d9]">
              {copy.agentTransactionGraph}
            </p>
            <div className="mt-3">
              <MiniConnectionGraph variant="agent" />
            </div>
            <div className="agentrank-soft-float mx-auto -mt-8 flex w-fit min-w-24 justify-center rounded-lg bg-gradient-to-br from-[#6d28d9] to-[#4338ca] px-5 py-3 text-3xl font-semibold text-white shadow-[0_16px_34px_rgba(88,28,135,0.22)]">
              {ers.score}
            </div>
          </div>
          <p className="mt-5 text-sm font-semibold uppercase text-[#6d28d9]">
            {copy.ers}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {agentRankSignals.map((signal) => (
              <IconMiniTile
                icon={signal.icon}
                key={signal.label}
                label={signal.label}
              />
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-gradient-to-r from-[#6d28d9] to-[#4338ca] px-4 py-3 text-center text-sm font-semibold text-white">
            {copy.agentRankCta}
          </div>
        </div>
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
    <section className="agentrank-flow-card rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-[#6d28d9]">
            {copy.ers}
          </p>
          <h2 className="mt-1 text-3xl font-semibold text-[#11132d]">
            {copy.score}
          </h2>
        </div>
        <div className="agentrank-soft-float rounded-lg bg-gradient-to-br from-[#6d28d9] to-[#2563eb] px-5 py-4 text-right text-white shadow-[0_18px_44px_rgba(88,28,135,0.25)]">
          <p className="text-sm font-semibold text-white/76">ERS</p>
          <p className="text-5xl font-semibold">{ers.score}</p>
          <p className="text-sm font-semibold text-white/76">
            / {formatNumber(ers.maxScore, locale)}
          </p>
        </div>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-violet-100">
        <div
          className="agentrank-score-bar h-full rounded-full bg-gradient-to-r from-[#6d28d9] via-[#2563eb] to-[#16a34a]"
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

function EconomicActivityPanel({
  copy,
}: {
  copy: AgentRankCopy;
}) {
  const formulaItems = [
    { icon: <Coins className="size-5" />, label: "Revenue", sign: "+" },
    { icon: <Users className="size-5" />, label: "Unique Customers", sign: "+" },
    { icon: <Orbit className="size-5" />, label: "Retention", sign: "+" },
    { icon: <Bot className="size-5" />, label: "A2A Usage", sign: "+" },
    { icon: <GitBranch className="size-5" />, label: "Lineage Trust", sign: "-" },
    { icon: <ShieldAlert className="size-5" />, label: "Risk Penalty", sign: "=" },
  ];
  const activityItems = [
    { icon: <WalletCards className="size-5" />, label: "Payment (x402)" },
    { icon: <Bot className="size-5" />, label: "Agent Call (A2A)" },
    { icon: <Orbit className="size-5" />, label: "Repeat Usage" },
    { icon: <Rocket className="size-5" />, label: "Creator Spawn" },
    { icon: <Users className="size-5" />, label: "Founder Contribution" },
    { icon: <Network className="size-5" />, label: "Value Flow" },
  ];
  const useCases = [
    "Agent Hiring",
    "Collaboration Matching",
    "Task Delegation",
    "Investment Decision",
    "Risk Assessment",
    "Ecosystem Growth",
  ];
  const futureItems = [
    "AI Agents",
    "Builders",
    "Users",
    "Enterprises",
    "Investors",
    "Oracles",
  ];

  return (
    <section className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
      <div className="agentrank-flow-card rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]">
        <p className="text-sm font-semibold uppercase text-[#6d28d9]">
          {copy.formula}
        </p>
        <h2 className="mt-1 text-3xl font-semibold text-[#11132d]">
          {copy.ers} Formula
        </h2>
        <div className="mt-5 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {formulaItems.map((item) => (
            <div className="min-w-0" key={item.label}>
              <IconMiniTile icon={item.icon} label={item.label} />
              <p
                className={`mt-2 text-center text-lg font-semibold ${
                  item.sign === "-" ? "text-red-500" : "text-[#6d28d9]"
                }`}
              >
                {item.sign}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg bg-gradient-to-r from-[#6d28d9] to-[#4338ca] px-5 py-4 text-center text-2xl font-semibold text-white">
          ERS · AgentRank Score
        </div>
      </div>

      <div
        className="agentrank-flow-card rounded-lg border border-emerald-100 bg-white p-5 shadow-[0_18px_44px_rgba(16,185,129,0.08)]"
        style={{ animationDelay: "100ms" }}
      >
        <p className="text-sm font-semibold uppercase text-emerald-700">
          {copy.economicActivity}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {activityItems.map((item) => (
            <IconMiniTile
              icon={item.icon}
              key={item.label}
              label={item.label}
              tone="emerald"
            />
          ))}
        </div>
      </div>

      <div
        className="agentrank-flow-card rounded-lg border border-blue-100 bg-white p-5 shadow-[0_18px_44px_rgba(37,99,235,0.07)]"
        style={{ animationDelay: "180ms" }}
      >
        <p className="text-sm font-semibold uppercase text-blue-700">
          {copy.miziEquals}
        </p>
        <h2 className="mt-1 text-3xl font-semibold text-[#11132d]">
          PeopleGPT
        </h2>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
          {copy.miziPeople}
        </p>
        <div className="mt-4 flex min-w-0 items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/60 p-2">
          <div className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-500">
            Find the most trusted AI Agent for...
          </div>
          <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white"
          >
            <ArrowRight className="size-5" />
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div
          className="agentrank-flow-card rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]"
          style={{ animationDelay: "260ms" }}
        >
          <p className="text-sm font-semibold uppercase text-[#6d28d9]">
            {copy.useCases}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {useCases.map((item) => (
              <div
                className="rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-3 text-sm font-semibold text-[#11132d]"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <div
          className="agentrank-flow-card rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]"
          style={{ animationDelay: "340ms" }}
        >
          <p className="text-sm font-semibold uppercase text-[#6d28d9]">
            {copy.futureBuild}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {futureItems.map((item) => (
              <div
                className="rounded-lg border border-slate-100 bg-[#f8f9ff] px-3 py-3 text-sm font-semibold text-[#11132d]"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
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
      <div className="agentrank-flow-card rounded-lg border border-pink-100 bg-white p-5 shadow-[0_18px_44px_rgba(219,39,119,0.07)]">
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

      <div
        className="agentrank-flow-card rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.07)]"
        style={{ animationDelay: "120ms" }}
      >
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
  starId,
}: {
  locale: Locale;
  snapshot: FanletterAgentRankInvestorSnapshot;
  starId?: string | null;
}) {
  const copy = getAgentRankCopy(locale);
  const { ers, eventFeed, scoreAggregate } = snapshot;
  const coverage = buildAgentRankCoverageSnapshot(eventFeed, ers.readiness);
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
    <main className="fanletter-agentrank-page min-h-screen overflow-x-hidden bg-[#f8f9ff] px-5 py-5 text-[#11132d]">
      <FanletterAgentRankTracker starId={starId} />
      <div className="mx-auto max-w-[1500px]">
        <header className="agentrank-flow-card grid gap-5 rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-[0_24px_70px_rgba(88,28,135,0.08)] lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm font-semibold text-[#6d28d9]">
              <Sparkles className="size-4" />
              {copy.generated} · {formatDateTime(snapshot.generatedAt, locale)}
            </div>
            <h1 className="mt-4 text-[3rem] font-semibold leading-[1.02] tracking-normal text-[#11132d] md:text-[4.4rem]">
              {copy.heroTitle}
            </h1>
            <p className="mt-2 text-2xl font-semibold text-[#4338ca]">
              {copy.heroSubtitle}
            </p>
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
          <div className="agentrank-stage-card relative overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-[#11132d] via-[#312e81] to-[#6d28d9] p-5 text-white shadow-[0_24px_70px_rgba(88,28,135,0.24)]">
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
          {metrics.map((metric, index) => (
            <MetricTile
              key={metric.label}
              label={metric.label}
              value={metric.value}
              style={{ animationDelay: `${index * 45}ms` }}
            />
          ))}
        </section>

        <div className="mt-5">
          <AgentRankScoreAggregatorPanel
            copy={copy}
            locale={locale}
            scoreAggregate={scoreAggregate}
          />
        </div>

        <div className="mt-5">
          <AgentRankCoveragePanel
            copy={copy}
            coverage={coverage}
            locale={locale}
          />
        </div>

        <div className="mt-5">
          <TrustProblemPanel copy={copy} />
        </div>

        <div className="mt-5">
          <ProductPathPanel copy={copy} ers={ers} />
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
          <EconomicActivityPanel copy={copy} />
        </div>

        <div className="mt-5">
          <EventFactoryPanel
            copy={copy}
            events={eventFeed.events}
            locale={locale}
          />
        </div>

        <footer className="agentrank-flow-card mt-5 overflow-hidden rounded-lg bg-[#080c2a] text-white shadow-[0_24px_70px_rgba(8,12,42,0.24)]">
          <div className="grid gap-4 border-b border-white/10 p-5 lg:grid-cols-3">
            {copy.bottomStatements.map((statement, index) => (
              <div
                className="agentrank-dark-card relative flex items-center gap-3 overflow-hidden rounded-lg bg-white/5 p-4 ring-1 ring-white/10"
                key={statement}
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-[#4338ca]">
                  {index === 0 ? (
                    <Sparkles className="size-6" />
                  ) : index === 1 ? (
                    <Bot className="size-6" />
                  ) : (
                    <Brain className="size-6" />
                  )}
                </div>
                <p className="text-lg font-semibold leading-6">{statement}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 p-5 lg:grid-cols-[1fr_1fr_1fr_0.92fr]">
            {[
              {
                body: "Reputation Event Factory. Creates valuable events from human and agent activities.",
                icon: <Heart className="size-6" />,
                title: "FanLetter",
              },
              {
                body: "Reputation Infrastructure. Collects, verifies, enriches, and connects reputation data.",
                icon: <Database className="size-6" />,
                title: "MiZi (PeopleGPT)",
              },
              {
                body: "Economic Reputation Network. Calculates scores and rankings for the AI Agent economy.",
                icon: <Brain className="size-6" />,
                title: "AgentRank",
              },
            ].map((item) => (
              <div
                className="agentrank-dark-card relative overflow-hidden rounded-lg bg-white/5 p-4 ring-1 ring-white/10"
                key={item.title}
              >
                <div className="flex items-center gap-2 text-violet-200">
                  {item.icon}
                  <p className="text-xl font-semibold text-white">
                    {item.title}
                  </p>
                </div>
                <p className="mt-3 text-sm font-medium leading-6 text-white/70">
                  {item.body}
                </p>
              </div>
            ))}
            <div className="rounded-lg border border-pink-400/30 bg-gradient-to-br from-pink-500/16 to-violet-500/16 p-4">
              <p className="text-2xl font-semibold uppercase leading-tight text-pink-300">
                From data to trust.
              </p>
              <p className="mt-1 text-2xl font-semibold uppercase leading-tight text-blue-200">
                From trust to economy.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <FanletterTrackedLink
                  agentRank={{
                    eventType: "content_engaged",
                    intent: "agentrank_footer_home",
                    source: "fanletter_agentrank",
                    starId: starId ?? null,
                  }}
                  className="inline-flex h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-[#4338ca]"
                  eventName="content_open"
                  href={`/${locale}/fanletter`}
                >
                  {copy.viewHome}
                </FanletterTrackedLink>
                <FanletterTrackedLink
                  agentRank={{
                    eventType: "content_engaged",
                    intent: "agentrank_footer_founder_network",
                    source: "fanletter_agentrank",
                    starId: starId ?? null,
                  }}
                  className="inline-flex h-10 items-center rounded-full bg-white/12 px-4 text-sm font-semibold text-white ring-1 ring-white/20"
                  eventName="content_open"
                  href={`/${locale}/fanletter/founder-universe`}
                >
                  {copy.viewFounderUniverse}
                </FanletterTrackedLink>
                <FanletterTrackedLink
                  agentRank={{
                    eventType: "content_engaged",
                    intent: "agentrank_footer_event_api",
                    source: "fanletter_agentrank",
                    starId: starId ?? null,
                  }}
                  className="inline-flex h-10 items-center rounded-full bg-white/12 px-4 text-sm font-semibold text-white ring-1 ring-white/20"
                  eventName="content_open"
                  href={`/${locale}/fanletter/agentrank/events${
                    starId ? `?starId=${encodeURIComponent(starId)}` : ""
                  }`}
                >
                  {copy.viewEventsApi}
                </FanletterTrackedLink>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
