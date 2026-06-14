import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bot,
  Database,
  FileCheck2,
  Fingerprint,
  GitBranch,
  Gauge,
  Link2,
  Network,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  WalletCards,
} from "lucide-react";

import { FanletterAgentRankCoverageActionNotice } from "@/components/fanletter-agentrank-coverage-action-notice";
import type { AgentRankCoverageActionContext } from "@/lib/agentrank/coverage-action";
import type { AgentRankReputationEvent } from "@/lib/agentrank/reputation-events";
import type { Locale } from "@/lib/i18n";

type FanletterAgentRankEventDetailPageProps = {
  coverageAction?: AgentRankCoverageActionContext | null;
  event: AgentRankReputationEvent;
  locale: Locale;
  relatedEvents?: AgentRankReputationEvent[];
};

function getCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      actor: "액터",
      agentGraph: "Agent Transaction Graph",
      audit: "AgentRank 감사",
      auditGaps: "보강 항목",
      evidenceHash: "증거 해시",
      back: "이벤트 원장",
      context: "Context",
      coverageMockBody:
        "이 이벤트는 커버리지 확인을 위해 생성된 mock Reputation Event입니다. 실제 결제, 실제 권한 부여, 운영 보상 상태와 분리해서 봅니다.",
      coverageMockEvent: "커버리지 Mock 이벤트",
      eventId: "이벤트 ID",
      formula: "ERS 반영 공식",
      heroBody:
        "FanLetter에서 발생한 단일 Reputation Event가 AgentRank 점수, Oracle 준비 상태, 향후 x402 경제 그래프로 어떻게 연결되는지 추적합니다.",
      heroEyebrow: "AgentRank Evidence",
      object: "대상",
      oracle: "Oracle 준비",
      oracleEvidenceTrace: "Oracle Evidence Trace",
      oracleEvidenceTraceBody:
        "이 이벤트가 AgentRank Oracle로 전달될 때 필요한 원본 소스, 스키마, 감사 해시, 연결 이벤트 증거를 하나의 검증 흐름으로 묶습니다.",
      oraclePacketCandidate: "Oracle Packet 후보",
      pending: "대기",
      productEvent: "제품 이벤트",
      productEventBody:
        "실제 사용자 행동, 콘텐츠 참여, Universe 참여, 또는 운영 데이터에서 생성된 Reputation Event입니다.",
      quality: "품질 점수",
      riskPenalty: "Risk Penalty",
      currentEvent: "현재 이벤트",
      eventWeight: "Event Weight",
      downstream: "이후 신호",
      trustSignal: "Lineage Trust",
      eventLineage: "Event Lineage",
      eventLineageBody:
        "같은 AI 스타, 멤버, 추천 코드, Universe로 이어진 이벤트를 전후 흐름으로 보여줍니다.",
      viewEvidencePacket: "증거 패킷 보기",
      economicFlow: "Economic Flow",
      economicFlowBody:
        "Creator Launch에서 발생한 x402 의도, CP Pool 생성, 상위 네트워크 분배를 하나의 거래 흐름으로 추적합니다.",
      scoreImpact: "AgentRank Score Impact",
      scoreImpactBody:
        "이벤트를 AgentRank ERS 차원으로 해석해 어떤 경제 평판 신호가 강화되는지 보여줍니다.",
      graphBody:
        "액터, 이벤트, 대상, 주변 Reputation Event를 하나의 거래 그래프로 연결합니다.",
      linkedEvents: "연결 이벤트",
      allocated: "분배됨",
      cpPool: "CP Pool",
      creator: "Creator",
      launchCost: "Launch Cost",
      paymentIntent: "x402 의도",
      recipients: "수령자",
      roleBands: "보상 계층",
      sourceUniverse: "Source Universe",
      spawnedStar: "Spawned Star",
      unallocated: "미분배",
      noRelatedEvents: "연결된 주변 이벤트가 아직 충분하지 않습니다.",
      rawJson: "Raw Event JSON",
      ready: "준비됨",
      readiness: "AgentRank 호환성",
      schema: "스키마",
      source: "소스",
      sourceId: "소스 ID",
      sourceTrace: "소스 추적",
      title: "Reputation Event 상세 추적",
      upstream: "이전 신호",
      linkedEvidence: "연결 증거",
      verificationRoute: "검증 경로",
      viewAgentRank: "AgentRank 보기",
      x402: "x402 경제",
    };
  }

  return {
    actor: "Actor",
    agentGraph: "Agent Transaction Graph",
    audit: "AgentRank Audit",
    auditGaps: "Audit gaps",
    evidenceHash: "Evidence Hash",
    back: "Event Ledger",
    context: "Context",
    coverageMockBody:
      "This is a mock Reputation Event generated for coverage verification. Treat it separately from live payments, entitlement grants, and production rewards.",
    coverageMockEvent: "Coverage Mock Event",
    eventId: "Event ID",
    formula: "ERS Impact Formula",
    heroBody:
      "Trace how one FanLetter Reputation Event contributes to AgentRank scoring, Oracle readiness, and the future x402 economy graph.",
    heroEyebrow: "AgentRank Evidence",
    object: "Object",
    oracle: "Oracle-ready",
    oracleEvidenceTrace: "Oracle Evidence Trace",
    oracleEvidenceTraceBody:
      "Groups the source record, schema, audit hash, and related event evidence required to pass this event into the AgentRank Oracle.",
    oraclePacketCandidate: "Oracle Packet Candidate",
    pending: "Pending",
    productEvent: "Product Event",
    productEventBody:
      "Generated from real user behavior, content engagement, Universe participation, or production operational data.",
    quality: "Quality Score",
    riskPenalty: "Risk Penalty",
    currentEvent: "Current Event",
    eventWeight: "Event Weight",
    downstream: "Downstream Signals",
    trustSignal: "Lineage Trust",
    eventLineage: "Event Lineage",
    eventLineageBody:
      "Shows nearby events connected by the same AI Star, member, referral code, or Universe.",
    viewEvidencePacket: "View Evidence Packet",
    economicFlow: "Economic Flow",
    economicFlowBody:
      "Traces x402 intent, CP Pool generation, and upline distribution from a Creator Launch as one transaction flow.",
    scoreImpact: "AgentRank Score Impact",
    scoreImpactBody:
      "Maps this event into AgentRank ERS dimensions so the strengthened economic reputation signals are easy to inspect.",
    graphBody:
      "Connects the actor, event, object, and nearby Reputation Events into one transaction graph.",
    linkedEvents: "linked events",
    allocated: "Allocated",
    cpPool: "CP Pool",
    creator: "Creator",
    launchCost: "Launch Cost",
    paymentIntent: "x402 Intent",
    recipients: "Recipients",
    roleBands: "Reward Bands",
    sourceUniverse: "Source Universe",
    spawnedStar: "Spawned Star",
    unallocated: "Unallocated",
    noRelatedEvents: "There are not enough related surrounding events yet.",
    rawJson: "Raw Event JSON",
    ready: "Ready",
    readiness: "AgentRank Compatibility",
    schema: "Schema",
    source: "Source",
    sourceId: "Source ID",
    sourceTrace: "Source Trace",
    title: "Reputation Event Trace",
    upstream: "Upstream Signals",
    linkedEvidence: "Linked Evidence",
    verificationRoute: "Verification Route",
    viewAgentRank: "View AgentRank",
    x402: "x402 Economy",
  };
}

function isCoverageMockEvent(event: AgentRankReputationEvent) {
  return (
    event.type === "x402_mock_payment_intent" ||
    event.context.coverageMockCreatorUnlocked === true ||
    event.context.mockPaymentIntent === true ||
    event.context.checkoutMode === "mock_coverage" ||
    event.context.a2aMockUsage === true
  );
}

function formatDate(value: string, locale: Locale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toFiniteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatNumber(value: number | null | undefined, locale: Locale) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(toFiniteNumber(value));
}

function getActorLabel(actor: AgentRankReputationEvent["actor"] | null) {
  if (!actor) {
    return "-";
  }

  return actor.label ?? actor.id;
}

function getEventTypeLabel(type: AgentRankReputationEvent["type"], locale: Locale) {
  const labels =
    locale === "ko"
      ? {
          ai_star_discovered: "AI 스타 발견",
          ai_star_spawned: "AI 스타 생성",
          content_engaged: "콘텐츠 참여",
          cp_earned: "CP 획득",
          cp_pool_generated: "CP Pool 생성",
          creator_unlock_evaluated: "권한 평가",
          creator_unlocked: "크리에이터 권한",
          founder_joined: "파운더 참여",
          referral_code_created: "추천 코드 생성",
          referral_converted: "추천 전환",
          source_universe_selected: "출처 유니버스 선택",
          universe_growth: "유니버스 성장",
          x402_mock_payment_intent: "x402 결제 의도",
        }
      : {
          ai_star_discovered: "AI Star Discovered",
          ai_star_spawned: "AI Star Spawned",
          content_engaged: "Content Engaged",
          cp_earned: "CP Earned",
          cp_pool_generated: "CP Pool Generated",
          creator_unlock_evaluated: "Creator Unlock Evaluated",
          creator_unlocked: "Creator Unlocked",
          founder_joined: "Founder Joined",
          referral_code_created: "Referral Code Created",
          referral_converted: "Referral Converted",
          source_universe_selected: "Source Universe Selected",
          universe_growth: "Universe Growth",
          x402_mock_payment_intent: "x402 Mock Payment Intent",
        };

  return labels[type];
}

function getImpactTotal(event: AgentRankReputationEvent) {
  return (
    event.reputationSignals.networkWeight +
    event.reputationSignals.economicWeight +
    event.reputationSignals.creatorWeight +
    event.reputationSignals.discoveryWeight
  );
}

function getAuditGapLabel(gap: string, locale: Locale) {
  const labels =
    locale === "ko"
      ? {
          actor_id: "액터 ID",
          graph_edge: "그래프 엣지",
          impact_signal: "평판 영향",
          source_id: "소스 ID",
          star_id: "AI 스타 ID",
          timestamp: "발생 시각",
        }
      : {
          actor_id: "Actor ID",
          graph_edge: "Graph edge",
          impact_signal: "Impact signal",
          source_id: "Source ID",
          star_id: "AI Star ID",
          timestamp: "Timestamp",
        };

  return labels[gap as keyof typeof labels] ?? gap;
}

function getAuditStatusLabel(
  status: AgentRankReputationEvent["audit"]["status"],
  locale: Locale,
) {
  const labels =
    locale === "ko"
      ? {
          audit_ready: "감사 준비",
          needs_enrichment: "보강 필요",
          partial: "부분 준비",
        }
      : {
          audit_ready: "Audit-ready",
          needs_enrichment: "Needs enrichment",
          partial: "Partial",
        };

  return labels[status];
}

function getEventAudit(event: AgentRankReputationEvent) {
  const audit = event.audit;
  const qualityScore = toFiniteNumber(audit?.qualityScore);
  const gaps = Array.isArray(audit?.gaps) ? audit.gaps : [];

  return {
    evidenceHash: audit?.evidenceHash ?? event.eventId.replace(/^agentrank_/, ""),
    gaps,
    qualityScore,
    status:
      audit?.status ??
      (gaps.length === 0 && qualityScore >= 90 ? "audit_ready" : "partial"),
  } satisfies Pick<
    AgentRankReputationEvent["audit"],
    "evidenceHash" | "gaps" | "qualityScore" | "status"
  >;
}

function getReadinessItems(event: AgentRankReputationEvent, locale: Locale) {
  const copy = getCopy(locale);
  const audit = getEventAudit(event);
  const auditGapLabel = audit.gaps.length
    ? audit.gaps.map((gap) => getAuditGapLabel(gap, locale)).join(", ")
    : copy.ready;

  return [
    {
      body:
        locale === "ko"
          ? "AgentRank v1 이벤트 스키마로 정규화됨"
          : "Normalized into AgentRank v1 event schema",
      isReady: true,
      label: copy.schema,
    },
    {
      body: `${copy.quality} ${audit.qualityScore}/100 · ${auditGapLabel}`,
      isReady: audit.status === "audit_ready",
      label: copy.audit,
    },
    {
      body:
        locale === "ko"
          ? "sourceId와 발생 시각으로 검증 가능"
          : "Verifiable through sourceId and timestamp",
      isReady: event.reputationSignals.oracleReady,
      label: copy.oracle,
    },
    {
      body:
        locale === "ko"
          ? "CP 기반 보상은 기록됨, 결제 레이어는 추후 연결"
          : "CP reward is recorded; payment layer comes later",
      isReady: event.economicLayer.x402Ready,
      label: copy.x402,
    },
    {
      body:
        locale === "ko"
          ? "Actor, Object, Star ID로 그래프 엣지 생성 가능"
          : "Actor, object, and Star ID can form graph edges",
      isReady: Boolean(event.actor.id && (event.object?.id || event.starId)),
      label: copy.agentGraph,
    },
  ];
}

function SignalTile({
  label,
  locale,
  value,
}: {
  label: string;
  locale: Locale;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-violet-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#11132d]">
        {formatNumber(value, locale)}
      </p>
    </div>
  );
}

function readContextNumber(event: AgentRankReputationEvent, key: string) {
  const value = event.context[key];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readContextString(event: AgentRankReputationEvent, key: string) {
  const value = event.context[key];

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function getScoreImpactRows(
  event: AgentRankReputationEvent,
  locale: Locale,
) {
  const audit = getEventAudit(event);
  const cpDelta = event.economicLayer.cpDelta ?? 0;
  const creatorProgressDelta = event.economicLayer.creatorProgressDelta ?? 0;
  const cpPoolTotal = readContextNumber(event, "cpPoolTotal") ?? 0;
  const launchCostUsdt = readContextNumber(event, "launchCostUsdt") ?? 0;
  const trustContext = readContextNumber(event, "reputationImpactTrust") ?? 0;
  const riskFlags =
    audit.gaps.length +
    (event.reputationSignals.oracleReady ? 0 : 1) +
    (event.audit.graphReady ? 0 : 1) +
    (event.audit.impactReady ? 0 : 1);
  const labels =
    locale === "ko"
      ? {
          creator:
            "크리에이터 권한, 새 AI 스타 생성, Creator Progress 신호",
          discovery: "AI 스타 발견, 콘텐츠 참여, 신규 스타 노출 신호",
          economic: "CP 이동, CP Pool, x402 의도, 창업 비용 신호",
          network: "파운더 참여, 추천 전환, 네트워크 엣지 신호",
          risk: "보강 항목, Oracle 미준비, 그래프/영향 신호 누락",
          trust: "증거 품질, Oracle 준비, 스키마/계보 신뢰 신호",
        }
      : {
          creator:
            "Creator unlocks, spawned AI Stars, and Creator Progress signals",
          discovery: "AI Star discovery, content engagement, and star exposure",
          economic: "CP movement, CP Pool, x402 intent, and launch cost signals",
          network: "Founder joins, referral conversions, and network edges",
          risk: "Audit gaps, Oracle gaps, and missing graph/impact signals",
          trust: "Evidence quality, Oracle readiness, schema, and lineage trust",
        };

  return [
    {
      Icon: Network,
      description: labels.network,
      label: "Founder Network",
      tone: "bg-blue-50 text-blue-700 ring-blue-100",
      value:
        event.reputationSignals.networkWeight +
        (event.type === "founder_joined" ? 0.4 : 0) +
        (event.type === "referral_converted" ? 0.8 : 0),
    },
    {
      Icon: WalletCards,
      description: labels.economic,
      label: "Economic Activity",
      tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      value:
        event.reputationSignals.economicWeight +
        Math.max(0, cpDelta) / 100 +
        Math.max(0, cpPoolTotal) / 1000 +
        launchCostUsdt / 10 +
        (event.economicLayer.x402Ready ? 0.6 : 0),
    },
    {
      Icon: Sparkles,
      description: labels.creator,
      label: "Creator Journey",
      tone: "bg-violet-50 text-[#6d28d9] ring-violet-100",
      value:
        event.reputationSignals.creatorWeight +
        Math.max(0, creatorProgressDelta) / 20 +
        (event.type === "creator_unlocked" ? 0.8 : 0) +
        (event.type === "ai_star_spawned" ? 1 : 0),
    },
    {
      Icon: TrendingUp,
      description: labels.discovery,
      label: "AI Star Discovery",
      tone: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100",
      value:
        event.reputationSignals.discoveryWeight +
        (event.type === "ai_star_discovered" ? 0.5 : 0) +
        (event.type === "content_engaged" ? 0.4 : 0),
    },
    {
      Icon: ShieldCheck,
      description: labels.trust,
      label: locale === "ko" ? "Lineage Trust" : "Lineage Trust",
      tone: "bg-cyan-50 text-cyan-700 ring-cyan-100",
      value:
        (event.reputationSignals.oracleReady ? 0.8 : 0) +
        audit.qualityScore / 100 +
        Math.max(0, trustContext),
    },
    {
      Icon: TriangleAlert,
      description: labels.risk,
      isRisk: true,
      label: locale === "ko" ? "Risk Penalty" : "Risk Penalty",
      tone: "bg-red-50 text-red-700 ring-red-100",
      value: riskFlags,
    },
  ].map((row) => ({
    ...row,
    value: Math.max(0, Math.round(row.value * 10) / 10),
  }));
}

function ScoreImpactPanel({
  copy,
  event,
  locale,
}: {
  copy: ReturnType<typeof getCopy>;
  event: AgentRankReputationEvent;
  locale: Locale;
}) {
  const rows = getScoreImpactRows(event, locale);
  const positiveRows = rows.filter((row) => !row.isRisk);
  const positiveTotal = positiveRows.reduce((sum, row) => sum + row.value, 0);
  const riskTotal = rows
    .filter((row) => row.isRisk)
    .reduce((sum, row) => sum + row.value, 0);
  const netWeight = Math.max(0, Math.round((positiveTotal - riskTotal) * 10) / 10);
  const maxValue = Math.max(1, ...rows.map((row) => row.value));

  return (
    <article className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
            <Gauge className="size-4" />
            {copy.scoreImpact}
          </p>
          <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-500">
            {copy.scoreImpactBody}
          </p>
        </div>
        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-[#6d28d9]">
          {copy.eventWeight} {formatNumber(netWeight, locale)}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SignalTile
          label={copy.eventWeight}
          locale={locale}
          value={netWeight}
        />
        <SignalTile
          label={copy.quality}
          locale={locale}
          value={getEventAudit(event).qualityScore}
        />
        <SignalTile
          label={copy.riskPenalty}
          locale={locale}
          value={riskTotal}
        />
      </div>

      <div className="mt-4 grid gap-3">
        {rows.map((row) => {
          const width = Math.max(4, Math.round((row.value / maxValue) * 100));
          const Icon = row.Icon;

          return (
            <div
              className="rounded-lg border border-slate-100 bg-slate-50 p-3"
              key={row.label}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ${row.tone}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#11132d]">{row.label}</p>
                    <p className="mt-1 text-sm font-medium leading-5 text-slate-500">
                      {row.description}
                    </p>
                  </div>
                </div>
                <p
                  className={`shrink-0 text-lg font-semibold ${
                    row.isRisk ? "text-red-600" : "text-[#6d28d9]"
                  }`}
                >
                  {row.isRisk ? "-" : "+"}
                  {formatNumber(row.value, locale)}
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className={`h-full rounded-full ${
                    row.isRisk
                      ? "bg-gradient-to-r from-red-400 to-rose-500"
                      : "bg-gradient-to-r from-[#7c3aed] to-[#22d3ee]"
                  }`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function EconomicFlowStep({
  Icon,
  label,
  tone = "violet",
  value,
}: {
  Icon: typeof WalletCards;
  label: string;
  tone?: "cyan" | "emerald" | "slate" | "violet";
  value: string;
}) {
  const toneClass = {
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    slate: "border-slate-100 bg-slate-50 text-slate-700",
    violet: "border-violet-100 bg-violet-50 text-[#6d28d9]",
  }[tone];

  return (
    <div className={`min-w-0 rounded-lg border p-4 ${toneClass}`}>
      <div className="flex items-center gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/80">
          <Icon className="size-4" />
        </span>
        <p className="text-xs font-semibold uppercase">{label}</p>
      </div>
      <p className="mt-3 break-words text-lg font-semibold leading-tight text-[#11132d]">
        {value}
      </p>
    </div>
  );
}

function EconomicFlowArrow() {
  return (
    <div className="flex items-center justify-center text-[#7c3aed] max-lg:rotate-90">
      <ArrowRight className="size-5" />
    </div>
  );
}

function EconomicFlowPanel({
  copy,
  event,
  locale,
}: {
  copy: ReturnType<typeof getCopy>;
  event: AgentRankReputationEvent;
  locale: Locale;
}) {
  const cpPoolTotal = readContextNumber(event, "cpPoolTotal");
  const allocatedCp = readContextNumber(event, "allocatedCp");
  const unallocatedCp = readContextNumber(event, "unallocatedCp");
  const recipientCount = readContextNumber(event, "recipientCount");
  const launchCostUsdt = readContextNumber(event, "launchCostUsdt");
  const hasEconomicFlow =
    event.type === "cp_pool_generated" ||
    event.type === "x402_mock_payment_intent" ||
    event.type === "ai_star_spawned" ||
    cpPoolTotal !== null ||
    launchCostUsdt !== null;

  if (!hasEconomicFlow) {
    return null;
  }

  const creator =
    readContextString(event, "launchCreatorEmail") ?? getActorLabel(event.actor);
  const sourceUniverse =
    event.object?.label ??
    readContextString(event, "sourceStarName") ??
    readContextString(event, "sourceStarId") ??
    event.starId ??
    "-";
  const spawnedStar =
    event.subject?.label ??
    readContextString(event, "spawnedStarName") ??
    readContextString(event, "spawnedStarId") ??
    "-";
  const paymentStatus = readContextString(event, "paymentStatus") ?? "mock";
  const roleBands = readContextString(event, "roles");
  const cpPoolValue =
    cpPoolTotal !== null
      ? `${formatNumber(cpPoolTotal, locale)} CP`
      : allocatedCp !== null
        ? `${formatNumber(allocatedCp, locale)} CP`
        : "-";

  return (
    <section className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
            <WalletCards className="size-4" />
            {copy.economicFlow}
          </p>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
            {copy.economicFlowBody}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            event.economicLayer.x402Ready
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {copy.paymentIntent} · {paymentStatus}
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)_2rem_minmax(0,1fr)_2rem_minmax(0,1fr)] lg:items-stretch">
        <EconomicFlowStep
          Icon={Bot}
          label={copy.creator}
          value={creator}
        />
        <EconomicFlowArrow />
        <EconomicFlowStep
          Icon={Database}
          label={copy.sourceUniverse}
          tone="cyan"
          value={sourceUniverse}
        />
        <EconomicFlowArrow />
        <EconomicFlowStep
          Icon={WalletCards}
          label={copy.cpPool}
          tone="emerald"
          value={cpPoolValue}
        />
        <EconomicFlowArrow />
        <EconomicFlowStep
          Icon={GitBranch}
          label={copy.spawnedStar}
          tone="slate"
          value={spawnedStar}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SignalTile
          label={copy.allocated}
          locale={locale}
          value={allocatedCp ?? 0}
        />
        <SignalTile
          label={copy.unallocated}
          locale={locale}
          value={unallocatedCp ?? 0}
        />
        <SignalTile
          label={copy.recipients}
          locale={locale}
          value={recipientCount ?? 0}
        />
        <SignalTile
          label={copy.launchCost}
          locale={locale}
          value={launchCostUsdt ?? 0}
        />
        <div className="rounded-lg border border-violet-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">
            {copy.roleBands}
          </p>
          <p className="mt-2 break-words text-sm font-semibold leading-6 text-[#11132d]">
            {roleBands || "-"}
          </p>
        </div>
      </div>
    </section>
  );
}

function ReadinessCard({
  body,
  isReady,
  label,
  pendingLabel,
  readyLabel,
}: {
  body: string;
  isReady: boolean;
  label: string;
  pendingLabel: string;
  readyLabel: string;
}) {
  const Icon = isReady ? BadgeCheck : TriangleAlert;

  return (
    <div className="rounded-lg border border-slate-100 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-[#11132d]">{label}</p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isReady
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          <Icon className="size-3.5" />
          {isReady ? readyLabel : pendingLabel}
        </span>
      </div>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">{body}</p>
    </div>
  );
}

function getEventTimestamp(event: AgentRankReputationEvent) {
  const timestamp = new Date(event.occurredAt).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function buildLineageGroups(
  event: AgentRankReputationEvent,
  relatedEvents: AgentRankReputationEvent[],
) {
  const currentTimestamp = getEventTimestamp(event);
  const upstream = relatedEvents
    .filter((candidate) => getEventTimestamp(candidate) <= currentTimestamp)
    .sort((left, right) => getEventTimestamp(right) - getEventTimestamp(left))
    .slice(0, 3);
  const downstream = relatedEvents
    .filter((candidate) => getEventTimestamp(candidate) > currentTimestamp)
    .sort((left, right) => getEventTimestamp(left) - getEventTimestamp(right))
    .slice(0, 3);

  return {
    downstream,
    upstream,
  };
}

function EventLineageNode({
  event,
  isCurrent = false,
  locale,
}: {
  event: AgentRankReputationEvent;
  isCurrent?: boolean;
  locale: Locale;
}) {
  const starId = event.starId ?? event.object?.id ?? null;
  const params = new URLSearchParams();
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#11132d]">
            {getEventTypeLabel(event.type, locale)}
          </p>
          <p className="mt-1 truncate text-[0.68rem] font-semibold text-slate-400">
            {formatDate(event.occurredAt, locale)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
            isCurrent
              ? "bg-white/18 text-white"
              : "bg-violet-50 text-[#6d28d9]"
          }`}
        >
          {formatNumber(getImpactTotal(event), locale)}
        </span>
      </div>
      <p
        className={`mt-3 truncate font-mono text-[0.68rem] font-semibold ${
          isCurrent ? "text-white/70" : "text-slate-500"
        }`}
      >
        {event.eventId}
      </p>
      <p
        className={`mt-1 truncate text-[0.68rem] font-semibold ${
          isCurrent ? "text-white/70" : "text-slate-400"
        }`}
      >
        {getActorLabel(event.actor)} → {getActorLabel(event.object ?? null)}
      </p>
    </>
  );

  if (starId) {
    params.set("starId", starId);
  }

  if (isCurrent) {
    return (
      <div className="rounded-lg bg-gradient-to-br from-[#11132d] via-[#4338ca] to-[#7c3aed] p-4 text-white shadow-[0_18px_44px_rgba(88,28,135,0.16)]">
        {content}
      </div>
    );
  }

  return (
    <Link
      className="block rounded-lg border border-slate-100 bg-white p-4 transition hover:border-violet-200 hover:shadow-[0_16px_36px_rgba(88,28,135,0.08)]"
      href={`/${locale}/fanletter/agentrank/events/${encodeURIComponent(
        event.eventId,
      )}${params.size ? `?${params.toString()}` : ""}`}
    >
      {content}
    </Link>
  );
}

function LineageColumn({
  emptyLabel,
  events,
  isCurrent = false,
  locale,
  title,
}: {
  emptyLabel: string;
  events: AgentRankReputationEvent[];
  isCurrent?: boolean;
  locale: Locale;
  title: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-slate-400">{title}</p>
      <div className="mt-3 grid gap-2">
        {events.length ? (
          events.map((lineageEvent) => (
            <EventLineageNode
              event={lineageEvent}
              isCurrent={isCurrent}
              key={lineageEvent.eventId}
              locale={locale}
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm font-semibold text-slate-400">
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  );
}

function truncateGraphLabel(value: string, maxLength = 18) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function getNodeLabel(actor: AgentRankReputationEvent["actor"] | null) {
  return truncateGraphLabel(getActorLabel(actor), 20);
}

function truncateEvidenceHash(value: string, start = 12, end = 8) {
  if (value.length <= start + end + 1) {
    return value;
  }

  return `${value.slice(0, start)}…${value.slice(-end)}`;
}

function getRelatedGraphPosition(index: number) {
  const positions = [
    { x: 245, y: 72 },
    { x: 515, y: 72 },
    { x: 210, y: 250 },
    { x: 550, y: 250 },
    { x: 380, y: 52 },
    { x: 380, y: 278 },
  ];

  return positions[index % positions.length];
}

function GraphNode({
  accent = "#7c3aed",
  label,
  sublabel,
  variant = "light",
  x,
  y,
}: {
  accent?: string;
  label: string;
  sublabel: string;
  variant?: "current" | "light";
  x: number;
  y: number;
}) {
  const isCurrent = variant === "current";

  return (
    <g>
      <circle
        cx={x}
        cy={y}
        fill={isCurrent ? "url(#currentNodeGradient)" : "#ffffff"}
        r={isCurrent ? 45 : 37}
        stroke={accent}
        strokeWidth={isCurrent ? 3 : 2}
      />
      <text
        fill={isCurrent ? "#ffffff" : "#11132d"}
        fontSize={isCurrent ? 13 : 12}
        fontWeight="700"
        textAnchor="middle"
        x={x}
        y={y - 3}
      >
        {label}
      </text>
      <text
        fill={isCurrent ? "rgba(255,255,255,0.72)" : "#64748b"}
        fontSize="10"
        fontWeight="600"
        textAnchor="middle"
        x={x}
        y={y + 13}
      >
        {sublabel}
      </text>
    </g>
  );
}

function OracleTraceStep({
  Icon,
  body,
  label,
  state,
  tone = "violet",
}: {
  Icon: typeof ShieldCheck;
  body: string;
  label: string;
  state: string;
  tone?: "cyan" | "emerald" | "slate" | "violet";
}) {
  const toneClass = {
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    slate: "border-slate-100 bg-slate-50 text-slate-600",
    violet: "border-violet-100 bg-violet-50 text-[#6d28d9]",
  }[tone];

  return (
    <div className={`min-w-0 rounded-lg border p-4 ${toneClass}`}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-sm">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase">{label}</p>
          <p className="mt-2 break-words text-sm font-semibold leading-5 text-[#11132d]">
            {body}
          </p>
        </div>
      </div>
      <p className="mt-3 inline-flex rounded-full bg-white/75 px-2.5 py-1 text-[0.68rem] font-semibold">
        {state}
      </p>
    </div>
  );
}

function OracleEvidenceTracePanel({
  coverageAction,
  copy,
  event,
  locale,
  relatedEvents,
}: {
  coverageAction?: AgentRankCoverageActionContext | null;
  copy: ReturnType<typeof getCopy>;
  event: AgentRankReputationEvent;
  locale: Locale;
  relatedEvents: AgentRankReputationEvent[];
}) {
  const audit = getEventAudit(event);
  const linkedEvidence = relatedEvents.slice(0, 5);
  const sourceTrace = `${event.source} · ${event.sourceId}`;
  const evidencePacketParams = new URLSearchParams();
  const packetStarId = event.starId ?? event.object?.id ?? null;
  const packetState = event.reputationSignals.oracleReady
    ? copy.ready
    : copy.pending;

  if (packetStarId) {
    evidencePacketParams.set("starId", packetStarId);
  }

  if (coverageAction) {
    evidencePacketParams.set("coverageAction", coverageAction.action);

    if (coverageAction.memberEmail) {
      evidencePacketParams.set("memberEmail", coverageAction.memberEmail);
    }
  }

  return (
    <section className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
            <FileCheck2 className="size-4" />
            {copy.oracleEvidenceTrace}
          </p>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
            {copy.oracleEvidenceTraceBody}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              event.reputationSignals.oracleReady
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {copy.oraclePacketCandidate} · {packetState}
          </span>
          <Link
            className="inline-flex h-9 items-center gap-2 rounded-full bg-[#11132d] px-3 text-xs font-semibold text-white transition hover:bg-[#2f235f]"
            href={`/${locale}/fanletter/agentrank/events/${encodeURIComponent(
              event.eventId,
            )}/evidence${
              evidencePacketParams.size
                ? `?${evidencePacketParams.toString()}`
                : ""
            }`}
          >
            <FileCheck2 className="size-3.5" />
            {copy.viewEvidencePacket}
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OracleTraceStep
          Icon={Database}
          body={sourceTrace}
          label={copy.sourceTrace}
          state={copy.sourceId}
        />
        <OracleTraceStep
          Icon={ShieldCheck}
          body={event.schemaVersion}
          label={copy.schema}
          state={event.agentRankVersion}
          tone="cyan"
        />
        <OracleTraceStep
          Icon={Fingerprint}
          body={truncateEvidenceHash(audit.evidenceHash, 16, 10)}
          label={copy.evidenceHash}
          state={`${getAuditStatusLabel(audit.status, locale)} · ${
            audit.qualityScore
          }/100`}
          tone="emerald"
        />
        <OracleTraceStep
          Icon={Network}
          body={`${formatNumber(linkedEvidence.length, locale)} ${
            copy.linkedEvents
          }`}
          label={copy.linkedEvidence}
          state={copy.verificationRoute}
          tone="slate"
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
            <Fingerprint className="size-3.5" />
            {copy.evidenceHash}
          </p>
          <p className="mt-3 break-all font-mono text-xs font-semibold leading-6 text-[#11132d]">
            {audit.evidenceHash}
          </p>
        </div>

        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
            <Link2 className="size-3.5" />
            {copy.linkedEvidence}
          </p>
          <div className="mt-3 grid gap-2">
            {linkedEvidence.length ? (
              linkedEvidence.map((relatedEvent) => {
                const relatedAudit = getEventAudit(relatedEvent);
                const params = new URLSearchParams();
                const relatedStarId =
                  relatedEvent.starId ?? relatedEvent.object?.id ?? null;

                if (relatedStarId) {
                  params.set("starId", relatedStarId);
                }

                if (coverageAction) {
                  params.set("coverageAction", coverageAction.action);

                  if (coverageAction.memberEmail) {
                    params.set("memberEmail", coverageAction.memberEmail);
                  }
                }

                return (
                  <Link
                    className="grid min-w-0 gap-2 rounded-lg bg-white px-3 py-2 text-sm transition hover:text-[#6d28d9] sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]"
                    href={`/${locale}/fanletter/agentrank/events/${encodeURIComponent(
                      relatedEvent.eventId,
                    )}${params.size ? `?${params.toString()}` : ""}`}
                    key={relatedEvent.eventId}
                  >
                    <span className="min-w-0 truncate font-semibold text-[#11132d]">
                      {getEventTypeLabel(relatedEvent.type, locale)}
                    </span>
                    <span className="min-w-0 break-all font-mono text-[0.68rem] font-semibold text-slate-500">
                      {truncateEvidenceHash(relatedAudit.evidenceHash, 14, 8)}
                    </span>
                  </Link>
                );
              })
            ) : (
              <p className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-400">
                {copy.noRelatedEvents}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function AgentTransactionGraph({
  event,
  locale,
  relatedEvents,
}: {
  event: AgentRankReputationEvent;
  locale: Locale;
  relatedEvents: AgentRankReputationEvent[];
}) {
  const relatedGraphEvents = relatedEvents.slice(0, 6);
  const actorLabel = getNodeLabel(event.actor);
  const objectLabel = getNodeLabel(event.object ?? null);
  const sourceLabel = truncateGraphLabel(event.source.replace("fanletter_", ""), 19);
  const currentLabel = truncateGraphLabel(getEventTypeLabel(event.type, locale), 18);

  return (
    <div className="overflow-hidden rounded-lg border border-violet-100 bg-white">
      <div className="overflow-x-auto">
        <svg
          aria-label="Agent Transaction Graph"
          className="min-w-[48rem]"
          role="img"
          viewBox="0 0 760 330"
        >
          <defs>
            <linearGradient id="currentNodeGradient" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#11132d" />
              <stop offset="55%" stopColor="#4338ca" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <marker
              id="graphArrow"
              markerHeight="8"
              markerWidth="8"
              orient="auto"
              refX="7"
              refY="4"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill="#8b5cf6" />
            </marker>
            <filter id="nodeShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow
                dx="0"
                dy="10"
                floodColor="#4c1d95"
                floodOpacity="0.12"
                stdDeviation="10"
              />
            </filter>
          </defs>

          <rect fill="#fbfaff" height="330" rx="20" width="760" />
          <path
            d="M148 165 C210 150 280 150 334 162"
            fill="none"
            markerEnd="url(#graphArrow)"
            stroke="#8b5cf6"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path
            d="M426 162 C480 150 550 150 612 165"
            fill="none"
            markerEnd="url(#graphArrow)"
            stroke="#8b5cf6"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path
            d="M380 205 C380 232 380 252 380 276"
            fill="none"
            markerEnd="url(#graphArrow)"
            stroke="#a78bfa"
            strokeDasharray="7 8"
            strokeLinecap="round"
            strokeWidth="2.5"
          />

          {relatedGraphEvents.map((relatedEvent, index) => {
            const position = getRelatedGraphPosition(index);

            return (
              <g key={relatedEvent.eventId}>
                <path
                  d={`M380 165 C${(380 + position.x) / 2} ${(165 + position.y) / 2 - 22} ${
                    position.x
                  } ${position.y}`}
                  fill="none"
                  stroke="#c4b5fd"
                  strokeDasharray="5 8"
                  strokeLinecap="round"
                  strokeWidth="1.8"
                />
                <GraphNode
                  accent="#c4b5fd"
                  label={truncateGraphLabel(
                    getEventTypeLabel(relatedEvent.type, locale),
                    13,
                  )}
                  sublabel={formatNumber(getImpactTotal(relatedEvent), locale)}
                  x={position.x}
                  y={position.y}
                />
              </g>
            );
          })}

          <g filter="url(#nodeShadow)">
            <GraphNode
              accent="#22c55e"
              label={actorLabel}
              sublabel={event.actor.type}
              x={110}
              y={165}
            />
            <GraphNode
              accent="#7c3aed"
              label={currentLabel}
              sublabel={formatNumber(getImpactTotal(event), locale)}
              variant="current"
              x={380}
              y={165}
            />
            <GraphNode
              accent="#06b6d4"
              label={objectLabel}
              sublabel={event.object?.type ?? "object"}
              x={650}
              y={165}
            />
            <GraphNode
              accent="#f59e0b"
              label={sourceLabel}
              sublabel="source"
              x={380}
              y={286}
            />
          </g>
        </svg>
      </div>
    </div>
  );
}

export function FanletterAgentRankEventDetailPage({
  coverageAction = null,
  event,
  locale,
  relatedEvents = [],
}: FanletterAgentRankEventDetailPageProps) {
  const copy = getCopy(locale);
  const audit = getEventAudit(event);
  const starId = event.starId ?? event.object?.id ?? null;
  const ledgerParams = new URLSearchParams();
  const impactTotal = getImpactTotal(event);
  const contextEntries = Object.entries(event.context).filter(
    ([, value]) => value !== null && value !== "",
  );
  const lineage = buildLineageGroups(event, relatedEvents);
  const isCoverageMock = isCoverageMockEvent(event);
  const eventClassification = isCoverageMock
    ? {
        body: copy.coverageMockBody,
        Icon: TriangleAlert,
        label: copy.coverageMockEvent,
        tone:
          "border-amber-100 bg-amber-50 text-amber-800 ring-amber-100",
      }
    : {
        body: copy.productEventBody,
        Icon: ShieldCheck,
        label: copy.productEvent,
        tone:
          "border-emerald-100 bg-emerald-50 text-emerald-800 ring-emerald-100",
      };
  const EventClassificationIcon = eventClassification.Icon;

  if (starId) {
    ledgerParams.set("starId", starId);
  }

  if (coverageAction) {
    ledgerParams.set("coverageAction", coverageAction.action);

    if (coverageAction.memberEmail) {
      ledgerParams.set("memberEmail", coverageAction.memberEmail);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f9ff] px-4 py-5 text-[#11132d] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full min-w-0 max-w-[86rem] flex-col gap-5">
        <header className="rounded-[1.35rem] border border-violet-100 bg-white p-5 shadow-[0_24px_70px_rgba(88,28,135,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-4 text-sm font-semibold text-[#6d28d9]"
              href={`/${locale}/fanletter/agentrank/events${
                ledgerParams.size ? `?${ledgerParams.toString()}` : ""
              }`}
            >
              <ArrowLeft className="size-4" />
              {copy.back}
            </Link>
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#11132d] px-4 text-sm font-semibold text-white"
              href={`/${locale}/fanletter/agentrank${
                starId ? `?starId=${encodeURIComponent(starId)}` : ""
              }`}
            >
              <ShieldCheck className="size-4" />
              {copy.viewAgentRank}
            </Link>
          </div>

          <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
                {copy.heroEyebrow}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold normal-case ring-1 ${eventClassification.tone}`}
                >
                  <EventClassificationIcon className="size-3.5" />
                  {eventClassification.label}
                </span>
              </p>
              <h1 className="mt-2 text-4xl font-semibold leading-tight text-[#11132d] sm:text-5xl">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-slate-600">
                {copy.heroBody}
              </p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-[#11132d] via-[#4338ca] to-[#7c3aed] p-5 text-white">
              <p className="text-xs font-semibold uppercase text-white/60">
                {copy.formula}
              </p>
              <p className="mt-2 text-4xl font-semibold">
                {formatNumber(impactTotal, locale)}
              </p>
              <p className="mt-2 text-sm font-semibold text-white/70">
                Network + Economic + Creator + Discovery
              </p>
            </div>
          </div>
        </header>

        {coverageAction ? (
          <FanletterAgentRankCoverageActionNotice
            action={coverageAction}
            locale={locale}
          />
        ) : null}

        <section
          className={`rounded-lg border p-4 shadow-[0_18px_44px_rgba(88,28,135,0.05)] ${eventClassification.tone}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-sm">
                <EventClassificationIcon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase">
                  {eventClassification.label}
                </p>
                <p className="mt-1 max-w-4xl text-sm font-medium leading-6 text-slate-600">
                  {eventClassification.body}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#11132d]">
              {event.context.intent ?? event.type}
            </span>
          </div>
        </section>

        <section className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
                <GitBranch className="size-4" />
                {copy.eventLineage}
              </p>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                {copy.eventLineageBody}
              </p>
            </div>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-[#6d28d9]">
              {formatNumber(relatedEvents.length, locale)} {copy.linkedEvents}
            </span>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_2rem_minmax(0,1.15fr)_2rem_minmax(0,1fr)] lg:items-center">
            <LineageColumn
              emptyLabel={copy.noRelatedEvents}
              events={lineage.upstream}
              locale={locale}
              title={copy.upstream}
            />
            <div className="hidden justify-center text-[#6d28d9] lg:flex">
              <ArrowRight className="size-5" />
            </div>
            <LineageColumn
              emptyLabel={copy.noRelatedEvents}
              events={[event]}
              isCurrent
              locale={locale}
              title={copy.currentEvent}
            />
            <div className="hidden justify-center text-[#6d28d9] lg:flex">
              <ArrowRight className="size-5" />
            </div>
            <LineageColumn
              emptyLabel={copy.noRelatedEvents}
              events={lineage.downstream}
              locale={locale}
              title={copy.downstream}
            />
          </div>
        </section>

        <section className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
                <Network className="size-4" />
                {copy.agentGraph}
              </p>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">
                {copy.graphBody}
              </p>
            </div>
            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
              AgentRank v0
            </span>
          </div>
          <div className="mt-5">
            <AgentTransactionGraph
              event={event}
              locale={locale}
              relatedEvents={relatedEvents}
            />
          </div>
        </section>

        <EconomicFlowPanel copy={copy} event={event} locale={locale} />

        <OracleEvidenceTracePanel
          coverageAction={coverageAction}
          copy={copy}
          event={event}
          locale={locale}
          relatedEvents={relatedEvents}
        />

        <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <article className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#6d28d9]">
                  <Bot className="size-4" />
                  {getEventTypeLabel(event.type, locale)}
                </p>
                <h2 className="mt-2 break-all font-mono text-lg font-semibold text-[#11132d]">
                  {event.eventId}
                </h2>
              </div>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-[#6d28d9]">
                {event.phase}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                [copy.eventId, event.eventId],
                [copy.sourceId, event.sourceId],
                [copy.source, event.source],
                ["Occurred", formatDate(event.occurredAt, locale)],
                [
                  copy.audit,
                  `${getAuditStatusLabel(audit.status, locale)} · ${
                    audit.qualityScore
                  }/100`,
                ],
                [copy.evidenceHash, audit.evidenceHash],
                [copy.actor, `${getActorLabel(event.actor)} (${event.actor.type})`],
                [
                  copy.object,
                  `${getActorLabel(event.object ?? null)}${
                    event.object?.type ? ` (${event.object.type})` : ""
                  }`,
                ],
              ].map(([label, value]) => (
                <div
                  className="min-w-0 rounded-lg border border-slate-100 bg-slate-50 p-3"
                  key={label}
                >
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    {label}
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#6d28d9]">
              <GitBranch className="size-4" />
              {copy.agentGraph}
            </p>
            <div className="mt-5 grid gap-3">
              <div className="rounded-lg border border-violet-100 bg-violet-50 p-4">
                <p className="text-xs font-semibold uppercase text-violet-500">
                  {copy.actor}
                </p>
                <p className="mt-1 break-all text-sm font-semibold text-[#11132d]">
                  {getActorLabel(event.actor)}
                </p>
              </div>
              <div className="flex justify-center">
                <Network className="size-7 text-[#6d28d9]" />
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase text-emerald-600">
                  {copy.object}
                </p>
                <p className="mt-1 break-all text-sm font-semibold text-[#11132d]">
                  {getActorLabel(event.object ?? null)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  {copy.evidenceHash}
                </p>
                <p className="mt-1 break-all font-mono text-[0.68rem] font-semibold text-slate-600">
                  {audit.evidenceHash}
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <ScoreImpactPanel copy={copy} event={event} locale={locale} />

          <article className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
            <p className="text-sm font-semibold uppercase text-[#6d28d9]">
              {copy.readiness}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {getReadinessItems(event, locale).map((item) => (
                <ReadinessCard
                  body={item.body}
                  isReady={item.isReady}
                  key={item.label}
                  label={item.label}
                  pendingLabel={copy.pending}
                  readyLabel={copy.ready}
                />
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
              <WalletCards className="size-4" />
              {copy.context}
            </p>
            <div className="mt-4 grid gap-2">
              {contextEntries.length ? (
                contextEntries.map(([key, value]) => (
                  <div
                    className="grid gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm sm:grid-cols-[12rem_1fr]"
                    key={key}
                  >
                    <p className="font-semibold text-slate-400">{key}</p>
                    <p className="break-words font-semibold text-slate-700">
                      {String(value)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm font-semibold text-slate-500">-</p>
              )}
            </div>
          </article>

          <article className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
              <Database className="size-4" />
              {copy.rawJson}
            </p>
            <pre className="mt-4 max-h-[34rem] overflow-auto rounded-lg bg-[#11132d] p-4 text-xs leading-6 text-violet-50">
              {JSON.stringify(event, null, 2)}
            </pre>
          </article>
        </section>
      </div>
    </main>
  );
}
