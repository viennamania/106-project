import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Database,
  FileCheck2,
  Fingerprint,
  Gauge,
  GitBranch,
  Network,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  WalletCards,
} from "lucide-react";

import { FanletterActionGuide } from "@/components/fanletter-action-guide";
import { FanletterAgentRankCoverageActionNotice } from "@/components/fanletter-agentrank-coverage-action-notice";
import { FanletterAgentRankSocialConnectionEvidence } from "@/components/fanletter-agentrank-social-connection-evidence";
import { FanletterTrackedLink } from "@/components/fanletter-tracked-link";
import type { AgentRankEventEvidencePacket } from "@/lib/agentrank/evidence-packet";
import type { AgentRankCoverageActionContext } from "@/lib/agentrank/coverage-action";
import { getAgentRankEventTypeLabel } from "@/lib/agentrank/event-labels";
import {
  isAgentRankEventIncludedInMockScope,
  isAgentRankCoverageMockEvent,
  type AgentRankEventMockScope,
} from "@/lib/agentrank/mock-events";
import { getAgentRankRelatedStarScope } from "@/lib/agentrank/related-star-scope";
import type { AgentRankReputationEvent } from "@/lib/agentrank/reputation-events";
import type { Locale } from "@/lib/i18n";

type FanletterAgentRankEvidencePacketPageProps = {
  coverageAction?: AgentRankCoverageActionContext | null;
  event: AgentRankReputationEvent;
  eventScope?: AgentRankEventMockScope;
  locale: Locale;
  packet: AgentRankEventEvidencePacket;
};

function getCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      audit: "감사",
      backToEvent: "이벤트 상세",
      backToLedger: "평판 기록",
      canonical: "Canonical JSON",
      coverageMockEvent: "커버리지 Mock 이벤트",
      contextAsset: "Context Asset",
      contextCreated: "생성된 Context",
      contextGraph: "Context Graph",
      contextMoat: "Context Moat",
      contextMoatBody:
        "원본 행동, 감사 해시, 연결 증거, 점수 영향을 한 패킷으로 묶어 동일한 AI 스타/멤버/추천 관계를 누적합니다.",
      contextScore: "Context Score",
      downloadJson: "JSON 다운로드",
      evidence: "증거",
      evidenceRoot: "Evidence Root",
      event: "Reputation Event",
      eventContribution: "이벤트 기여도",
      eventHash: "Event Evidence Hash",
      eventScope: "이벤트 범위",
      eventScopeMismatch:
        "현재 이벤트는 선택한 이벤트 범위 밖에 있습니다. Linked Evidence만 선택 범위로 제한된 패킷입니다.",
      eventScopeOutside: "범위 밖",
      graphReady: "Graph 준비",
      heroBody:
        "단일 Reputation Event가 AgentRank Oracle로 전달될 때 필요한 원본, 스키마, 감사 해시, 연결 이벤트를 사람이 검토할 수 있게 정리한 증거 패킷입니다.",
      heroEyebrow: "AgentRank Oracle Packet",
      heroTitle: "Evidence Packet Viewer",
      issuedAt: "발급 시각",
      linkedEvidence: "Linked Evidence",
      linkedEvidenceBody:
        "같은 AI 스타, 멤버, 추천 코드, Universe로 연결된 주변 이벤트 해시입니다.",
      dominantSignal: "주요 기여 신호",
      includedInPacket: "패킷 포함",
      notReady: "대기",
      object: "대상",
      oracleManifest: "Oracle Manifest",
      oracleResult: "Oracle 결과",
      oracleReady: "Oracle 준비",
      impactReady: "Impact 준비",
      packetHash: "Packet Hash",
      packetVersion: "Packet Version",
      productEvent: "제품 이벤트",
      quality: "품질",
      ready: "검증 가능",
      recordType: "Record Type",
      relatedStarScope: "관련 AI 스타 범위",
      schema: "Schema",
      scoreImpact: "Score Impact",
      scoreFormula: "Network + Economic + Creator + Discovery",
      scopeAll: "전체 이벤트",
      scopeMock: "Mock 커버리지",
      scopeProduct: "운영 이벤트",
      nextAction: "다음 행동",
      source: "Source",
      sourceId: "Source ID",
      trace: "검증 흐름",
      normalizedEvent: "정규화 이벤트",
      oraclePacket: "Oracle Packet",
      rawAction: "원본 행동",
      verifierNote:
        "검증자는 Event Evidence Hash와 Linked Evidence를 canonical JSON으로 다시 해시해 Evidence Root를 재현할 수 있습니다.",
      x402Ready: "x402 준비",
    };
  }

  return {
    audit: "Audit",
    backToEvent: "Event Detail",
    backToLedger: "Reputation Records",
    canonical: "Canonical JSON",
    coverageMockEvent: "Coverage Mock Event",
    contextAsset: "Context Asset",
    contextCreated: "Created Context",
    contextGraph: "Context Graph",
    contextMoat: "Context Moat",
    contextMoatBody:
      "Raw action, audit hash, linked evidence, and score impact are bundled into one packet that compounds the same AI Star, member, and referral relationship.",
    contextScore: "Context Score",
    downloadJson: "Download JSON",
    evidence: "Evidence",
    evidenceRoot: "Evidence Root",
    event: "Reputation Event",
    eventContribution: "Event Contribution",
    eventHash: "Event Evidence Hash",
    eventScope: "Event Scope",
    eventScopeMismatch:
      "This event is outside the selected event scope. Only linked evidence is limited to the selected scope.",
    eventScopeOutside: "Out of scope",
    graphReady: "Graph-ready",
    heroBody:
      "A human-readable evidence packet showing the source record, schema, audit hash, and linked events required to pass one Reputation Event into the AgentRank Oracle.",
    heroEyebrow: "AgentRank Oracle Packet",
    heroTitle: "Evidence Packet Viewer",
    issuedAt: "Issued At",
    linkedEvidence: "Linked Evidence",
    linkedEvidenceBody:
      "Nearby event hashes connected by the same AI Star, member, referral code, or Universe.",
    dominantSignal: "Dominant Signal",
    includedInPacket: "Included in packet",
    notReady: "Pending",
    object: "Object",
    oracleManifest: "Oracle Manifest",
    oracleResult: "Oracle Result",
    oracleReady: "Oracle-ready",
    impactReady: "Impact-ready",
    packetHash: "Packet Hash",
    packetVersion: "Packet Version",
    productEvent: "Product Event",
    quality: "Quality",
    ready: "Verifiable",
    recordType: "Record Type",
    relatedStarScope: "Related AI Star Scope",
    schema: "Schema",
    scoreImpact: "Score Impact",
    scoreFormula: "Network + Economic + Creator + Discovery",
    scopeAll: "All Events",
    scopeMock: "Mock Coverage",
    scopeProduct: "Product Events",
    nextAction: "Next Action",
    source: "Source",
    sourceId: "Source ID",
    trace: "Verification Flow",
    normalizedEvent: "Normalized Event",
    oraclePacket: "Oracle Packet",
    rawAction: "Raw Action",
    verifierNote:
      "A verifier can reproduce the Evidence Root by hashing the Event Evidence Hash and Linked Evidence from the canonical JSON payload.",
    x402Ready: "x402-ready",
  };
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

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(value);
}

function getActorLabel(actor: AgentRankReputationEvent["actor"] | null) {
  if (!actor) {
    return "-";
  }

  return actor.label ?? actor.id;
}

function getEventTypeLabel(type: AgentRankReputationEvent["type"], locale: Locale) {
  return getAgentRankEventTypeLabel(type, locale);
}

function truncateHash(value: string, start = 14, end = 10) {
  if (value.length <= start + end + 1) {
    return value;
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function getEventScopeLabel(
  scope: AgentRankEventMockScope,
  copy: ReturnType<typeof getCopy>,
) {
  if (scope === "mock") {
    return copy.scopeMock;
  }

  if (scope === "product") {
    return copy.scopeProduct;
  }

  return copy.scopeAll;
}

function getEvidencePacketNextActionLabel(
  packet: AgentRankEventEvidencePacket,
  locale: Locale,
) {
  const readiness = packet.oracleManifest.readiness;
  const graph = packet.oracleManifest.graph;
  const isKorean = locale === "ko";

  if (!readiness.oracleReady) {
    return isKorean ? "Oracle 준비 항목 보강" : "Enrich Oracle readiness";
  }

  if (!graph.graphReady) {
    return isKorean ? "거래 그래프 연결 확인" : "Review graph links";
  }

  if (!graph.impactReady) {
    return isKorean ? "점수 영향 신호 확인" : "Review score impact signal";
  }

  if (packet.evidence.linkedEvents.length < packet.evidence.linkedEventCount) {
    return isKorean ? "연결 증거 추가 확인" : "Review remaining linked evidence";
  }

  return isKorean ? "Oracle 전달 패킷 검토" : "Review Oracle handoff packet";
}

function getEvidencePacketContextScore(packet: AgentRankEventEvidencePacket) {
  const graph = packet.oracleManifest.graph;
  const readiness = packet.oracleManifest.readiness;
  let score = 4;

  if (readiness.oracleReady) {
    score += 1.25;
  } else if (readiness.auditStatus === "audit_ready") {
    score += 0.75;
  }

  if (graph.graphReady) {
    score += 1;
  }

  if (graph.impactReady) {
    score += 1;
  }

  if (packet.evidence.linkedEventCount >= 6) {
    score += 1.25;
  } else if (packet.evidence.linkedEventCount >= 2) {
    score += 0.75;
  } else if (packet.evidence.linkedEventCount > 0) {
    score += 0.4;
  }

  if (graph.relatedStarScope.length > 0) {
    score += 0.75;
  }

  if (readiness.qualityScore >= 90) {
    score += 0.75;
  } else if (readiness.qualityScore >= 75) {
    score += 0.35;
  }

  return Math.max(1, Math.min(10, Math.round(score)));
}

function TraceStep({
  Icon,
  body,
  label,
  tone = "violet",
}: {
  Icon: typeof ShieldCheck;
  body: string;
  label: string;
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
      <span className="flex size-10 items-center justify-center rounded-lg bg-white/80 shadow-sm">
        <Icon className="size-4" />
      </span>
      <p className="mt-4 text-xs font-semibold uppercase">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-5 text-[#11132d]">
        {body}
      </p>
    </div>
  );
}

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-5 text-[#11132d]">
        {value}
      </p>
    </div>
  );
}

function getScoreImpactDimensions(
  packet: AgentRankEventEvidencePacket,
  locale: Locale,
) {
  const impact = packet.oracleManifest.scoreImpact;
  const labels =
    locale === "ko"
      ? {
          creator: "Creator Journey",
          discovery: "AI Star Discovery",
          economic: "Economic Activity",
          network: "Founder Network",
        }
      : {
          creator: "Creator Journey",
          discovery: "AI Star Discovery",
          economic: "Economic Activity",
          network: "Founder Network",
        };

  return [
    {
      Icon: Network,
      barClass: "bg-blue-500",
      label: labels.network,
      textClass: "text-blue-700",
      value: impact.network,
    },
    {
      Icon: WalletCards,
      barClass: "bg-emerald-500",
      label: labels.economic,
      textClass: "text-emerald-700",
      value: impact.economic,
    },
    {
      Icon: Sparkles,
      barClass: "bg-violet-500",
      label: labels.creator,
      textClass: "text-[#6d28d9]",
      value: impact.creator,
    },
    {
      Icon: TrendingUp,
      barClass: "bg-fuchsia-500",
      label: labels.discovery,
      textClass: "text-fuchsia-700",
      value: impact.discovery,
    },
  ].sort((left, right) => right.value - left.value);
}

function ScoreImpactManifestCard({
  copy,
  locale,
  packet,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  packet: AgentRankEventEvidencePacket;
}) {
  const dimensions = getScoreImpactDimensions(packet, locale);
  const dominant = dimensions[0];
  const maxValue = Math.max(1, ...dimensions.map((dimension) => dimension.value));
  const total = packet.oracleManifest.scoreImpact.total;

  return (
    <div className="rounded-lg border border-violet-100 bg-gradient-to-br from-[#11132d] via-[#312e81] to-[#7c3aed] p-4 text-white">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-white/65">
            <Gauge className="size-4" />
            {copy.eventContribution}
          </p>
          <p className="mt-2 text-4xl font-semibold">
            {formatNumber(total, locale)}
          </p>
        </div>
        <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/15">
          {copy.includedInPacket}
        </span>
      </div>

      <div className="mt-4 rounded-lg bg-white/10 p-3 ring-1 ring-white/10">
        <p className="text-xs font-semibold uppercase text-white/55">
          {copy.dominantSignal}
        </p>
        <p className="mt-1 text-lg font-semibold">{dominant.label}</p>
        <p className="mt-1 text-xs font-semibold text-white/55">
          {copy.scoreFormula}
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        {dimensions.map((dimension) => {
          const Icon = dimension.Icon;
          const width = Math.max(
            4,
            Math.round((dimension.value / maxValue) * 100),
          );

          return (
            <div key={dimension.label}>
              <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                <span className="inline-flex items-center gap-2 text-white/75">
                  <Icon className="size-3.5" />
                  {dimension.label}
                </span>
                <span>{formatNumber(dimension.value, locale)}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/12">
                <div
                  className={`h-full rounded-full ${dimension.barClass}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EvidencePacketMobileStatusCard({
  copy,
  event,
  linkedEventCount,
  locale,
  nextActionLabel,
  packet,
  primaryHref,
  primaryLabel,
}: {
  copy: ReturnType<typeof getCopy>;
  event: AgentRankReputationEvent;
  linkedEventCount: number;
  locale: Locale;
  nextActionLabel: string;
  packet: AgentRankEventEvidencePacket;
  primaryHref: string;
  primaryLabel: string;
}) {
  const readiness = packet.oracleManifest.readiness;
  const starId = event.starId ?? event.object?.id ?? null;

  return (
    <section className="rounded-[1.15rem] border border-zinc-200 bg-white p-4 text-zinc-950 shadow-[0_14px_40px_rgba(15,23,42,0.055)] sm:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            {copy.oracleManifest}
          </p>
          <h2 className="mt-1 truncate text-xl font-semibold">
            {getEventTypeLabel(event.type, locale)}
          </h2>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ${
            readiness.oracleReady
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {readiness.oracleReady ? copy.ready : copy.notReady}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-zinc-50 px-3 py-2">
          <p className="text-[0.62rem] font-semibold text-zinc-500">
            {copy.quality}
          </p>
          <p className="mt-1 text-lg font-semibold">
            {formatNumber(readiness.qualityScore, locale)}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-50 px-3 py-2">
          <p className="text-[0.62rem] font-semibold text-zinc-500">
            {copy.eventContribution}
          </p>
          <p className="mt-1 text-lg font-semibold">
            {formatNumber(packet.oracleManifest.scoreImpact.total, locale)}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-50 px-3 py-2">
          <p className="text-[0.62rem] font-semibold text-zinc-500">
            {copy.linkedEvidence}
          </p>
          <p className="mt-1 text-lg font-semibold">{linkedEventCount}</p>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-zinc-950 bg-zinc-950 px-3 py-2 text-white">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/55">
          {copy.nextAction}
        </p>
        <p className="mt-1 break-words text-sm font-semibold leading-tight [word-break:keep-all]">
          {nextActionLabel}
        </p>
      </div>

      <FanletterTrackedLink
        agentRank={{
          eventType: "universe_growth",
          intent: "agentrank_evidence_packet_mobile_download",
          source: "fanletter_agentrank",
          starId,
        }}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-semibold !text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)]"
        eventName="content_open"
        href={primaryHref}
        metadata={{
          eventId: event.eventId,
          eventType: event.type,
          placement: "agentrank_evidence_packet_mobile_primary",
        }}
      >
        <span className="min-w-0 truncate">{primaryLabel}</span>
        <ArrowRight className="size-4 shrink-0" />
      </FanletterTrackedLink>

      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
        <p className="text-[0.62rem] font-semibold normal-case tracking-[0.08em] text-emerald-700/75">
          {copy.oracleResult}
        </p>
        <p className="mt-1 break-words text-sm font-semibold leading-tight text-emerald-950 [word-break:keep-all]">
          {readiness.oracleReady ? copy.ready : copy.notReady} ·{" "}
          {copy.quality} {formatNumber(readiness.qualityScore, locale)}/100
        </p>
      </div>

      <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          {copy.packetHash}
        </p>
        <p className="mt-1 break-all font-mono text-[0.68rem] font-semibold text-zinc-700">
          {truncateHash(packet.integrity.packetHash, 14, 8)}
        </p>
      </div>
    </section>
  );
}

function EvidencePacketSignpostSummary({
  copy,
  event,
  locale,
  nextActionLabel,
  packet,
}: {
  copy: ReturnType<typeof getCopy>;
  event: AgentRankReputationEvent;
  locale: Locale;
  nextActionLabel: string;
  packet: AgentRankEventEvidencePacket;
}) {
  const readiness = packet.oracleManifest.readiness;
  const summaryItems = [
    {
      body: truncateHash(packet.integrity.packetHash, 14, 8),
      Icon: Fingerprint,
      label: copy.oracleManifest,
      value: getEventTypeLabel(event.type, locale),
    },
    {
      body:
        locale === "ko"
          ? "검증자가 바로 확인할 다음 단계입니다."
          : "The next step for verifier review.",
      Icon: FileCheck2,
      label: copy.nextAction,
      value: nextActionLabel,
    },
    {
      body: `${copy.quality} ${formatNumber(readiness.qualityScore, locale)}/100`,
      Icon: BadgeCheck,
      label: copy.oracleResult,
      value: readiness.oracleReady ? copy.ready : copy.notReady,
    },
  ];

  return (
    <section className="hidden grid-cols-3 gap-3 sm:grid">
      {summaryItems.map((item) => {
        const Icon = item.Icon;

        return (
          <article
            className="min-w-0 rounded-[1rem] border border-zinc-200 bg-white p-4 text-zinc-950 shadow-[0_14px_36px_rgba(15,23,42,0.045)]"
            key={item.label}
          >
            <p className="flex items-center gap-1.5 text-[0.68rem] font-semibold normal-case tracking-[0.08em] text-zinc-500">
              <Icon className="size-3.5 shrink-0" />
              {item.label}
            </p>
            <p className="mt-2 truncate text-lg font-semibold text-zinc-950">
              {item.value}
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-zinc-500">
              {item.body}
            </p>
          </article>
        );
      })}
    </section>
  );
}

function EvidencePacketContextAssetCard({
  copy,
  event,
  locale,
  packet,
}: {
  copy: ReturnType<typeof getCopy>;
  event: AgentRankReputationEvent;
  locale: Locale;
  packet: AgentRankEventEvidencePacket;
}) {
  const contextScore = getEvidencePacketContextScore(packet);
  const graph = packet.oracleManifest.graph;
  const flowSteps = [
    {
      body: `${event.source} / ${truncateHash(event.sourceId, 12, 8)}`,
      Icon: Database,
      label: copy.rawAction,
    },
    {
      body: `${getEventTypeLabel(event.type, locale)} · ${event.schemaVersion}`,
      Icon: GitBranch,
      label: copy.normalizedEvent,
    },
    {
      body: truncateHash(packet.integrity.evidenceRoot, 14, 8),
      Icon: Fingerprint,
      label: copy.evidenceRoot,
    },
    {
      body: `${packet.evidence.linkedEvents.length}/${packet.evidence.linkedEventCount}`,
      Icon: Network,
      label: copy.contextGraph,
    },
    {
      body: packet.oracleManifest.readiness.oracleReady
        ? copy.ready
        : copy.notReady,
      Icon: ShieldCheck,
      label: copy.oraclePacket,
    },
  ];

  return (
    <section className="rounded-[1.15rem] border border-zinc-200 bg-white p-4 text-zinc-950 shadow-[0_18px_46px_rgba(15,23,42,0.055)] sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <div className="rounded-[1rem] border border-zinc-950 bg-zinc-950 p-4 text-white">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/55">
            <Sparkles className="size-4" />
            {copy.contextAsset}
          </p>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-5xl font-semibold tracking-tight">
              {contextScore}
            </span>
            <span className="pb-2 text-sm font-semibold text-white/55">/10</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-white/70">
            {copy.contextScore}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold">
            <span className="rounded-lg bg-white/10 px-3 py-2 text-white/80">
              {copy.quality}{" "}
              {formatNumber(packet.oracleManifest.readiness.qualityScore, locale)}
            </span>
            <span className="rounded-lg bg-white/10 px-3 py-2 text-white/80">
              {copy.linkedEvidence} {packet.evidence.linkedEventCount}
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                {copy.contextCreated}
              </p>
              <h2 className="mt-1 text-2xl font-semibold leading-tight text-zinc-950">
                {locale === "ko"
                  ? "원본 행동이 검증 가능한 평판 Context가 됩니다"
                  : "A raw action becomes verifiable reputation context"}
              </h2>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                graph.graphReady
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {copy.graphReady}: {graph.graphReady ? copy.ready : copy.notReady}
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-5">
            {flowSteps.map((step) => {
              const Icon = step.Icon;

              return (
                <div
                  className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                  key={step.label}
                >
                  <span className="inline-flex size-8 items-center justify-center rounded-lg bg-white text-zinc-900 shadow-sm">
                    <Icon className="size-4" />
                  </span>
                  <p className="mt-2 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    {step.label}
                  </p>
                  <p className="mt-1 truncate text-xs font-semibold text-zinc-950">
                    {step.body}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border border-zinc-200 bg-white px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              {copy.contextMoat}
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-zinc-700 [word-break:keep-all]">
              {copy.contextMoatBody}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FanletterAgentRankEvidencePacketPage({
  coverageAction = null,
  event,
  eventScope = "all",
  locale,
  packet,
}: FanletterAgentRankEvidencePacketPageProps) {
  const copy = getCopy(locale);
  const ledgerParams = new URLSearchParams();
  const eventParams = new URLSearchParams();
  const downloadParams = new URLSearchParams({
    download: "1",
  });
  const starId = event.starId ?? event.object?.id ?? null;
  const scopeLabel = starId
    ? starId
    : locale === "ko"
      ? "AI 스타 미지정"
      : "No AI Star";
  const linkedEvents = packet.evidence.linkedEvents;
  const isCoverageMock = isAgentRankCoverageMockEvent(event);
  const eventInScope = isAgentRankEventIncludedInMockScope(event, eventScope);
  const eventScopeLabel = getEventScopeLabel(eventScope, copy);
  const relatedStarScope = getAgentRankRelatedStarScope(event);
  const nextActionLabel = getEvidencePacketNextActionLabel(packet, locale);

  if (starId) {
    ledgerParams.set("starId", starId);
    eventParams.set("starId", starId);
    downloadParams.set("starId", starId);
  }

  if (eventScope !== "all") {
    ledgerParams.set("scope", eventScope);
    eventParams.set("scope", eventScope);
    downloadParams.set("scope", eventScope);
  }

  if (coverageAction) {
    ledgerParams.set("coverageAction", coverageAction.action);
    eventParams.set("coverageAction", coverageAction.action);
    downloadParams.set("coverageAction", coverageAction.action);

    if (coverageAction.memberEmail) {
      ledgerParams.set("memberEmail", coverageAction.memberEmail);
      eventParams.set("memberEmail", coverageAction.memberEmail);
      downloadParams.set("memberEmail", coverageAction.memberEmail);
    }
  }

  const ledgerHref = `/${locale}/fanletter/agentrank/events${
    ledgerParams.size ? `?${ledgerParams.toString()}` : ""
  }`;
  const eventDetailHref = `/${locale}/fanletter/agentrank/events/${encodeURIComponent(
    event.eventId,
  )}${eventParams.size ? `?${eventParams.toString()}` : ""}`;
  const evidenceDownloadHref = `/api/fanletter/agentrank/events/${encodeURIComponent(
    event.eventId,
  )}/evidence?${downloadParams.toString()}`;

  return (
    <main className="fanletter-v2-surface min-h-screen overflow-x-hidden bg-[#f8f9ff] px-4 py-5 text-[#11132d] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full min-w-0 max-w-[86rem] flex-col gap-5">
        <div className="hidden sm:block">
          <FanletterActionGuide
            currentLabel={
              locale === "ko"
                ? `Evidence Packet · ${scopeLabel}`
                : `Evidence Packet · ${scopeLabel}`
            }
            metrics={[
              {
                label: copy.eventContribution,
                value: formatNumber(
                  packet.oracleManifest.scoreImpact.total,
                  locale,
                ),
              },
              {
                label: copy.linkedEvidence,
                value: `${linkedEvents.length}/${packet.evidence.linkedEventCount}`,
              },
            ]}
            primaryAction={{
              agentRank: {
                eventType: "universe_growth",
                intent: "agentrank_evidence_packet_download",
                source: "fanletter_agentrank",
                starId,
              },
              eventName: "content_open",
              href: evidenceDownloadHref,
              label: copy.downloadJson,
              metadata: {
                eventId: event.eventId,
                placement: "agentrank_evidence_packet_action_guide_primary",
              },
            }}
            reputationEventLabel={
              locale === "ko" ? "Oracle 증거 패킷" : "Oracle evidence packet"
            }
            secondaryActions={[]}
            steps={[
              {
                label: locale === "ko" ? "이벤트 선택" : "Event selected",
                status: "done",
              },
              {
                label: locale === "ko" ? "증거 해시" : "Evidence hash",
                status: "active",
              },
              {
                label: locale === "ko" ? "연결 증거" : "Linked evidence",
                status: linkedEvents.length > 0 ? "done" : "next",
              },
              {
                label: locale === "ko" ? "Oracle 전달" : "Oracle handoff",
                status: "next",
              },
            ]}
            subtitle={copy.verifierNote}
            title={
              locale === "ko"
                ? "다음 행동: Evidence Root 검증"
                : "Next action: verify Evidence Root"
            }
          />
        </div>
        <EvidencePacketMobileStatusCard
          copy={copy}
          event={event}
          linkedEventCount={linkedEvents.length}
          locale={locale}
          nextActionLabel={nextActionLabel}
          packet={packet}
          primaryHref={evidenceDownloadHref}
          primaryLabel={copy.downloadJson}
        />
        <EvidencePacketSignpostSummary
          copy={copy}
          event={event}
          locale={locale}
          nextActionLabel={nextActionLabel}
          packet={packet}
        />
        <EvidencePacketContextAssetCard
          copy={copy}
          event={event}
          locale={locale}
          packet={packet}
        />
        <FanletterAgentRankSocialConnectionEvidence
          event={event}
          locale={locale}
        />
        <header className="hidden rounded-[1.35rem] border border-violet-100 bg-white p-5 shadow-[0_24px_70px_rgba(88,28,135,0.08)] sm:block">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex h-10 items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-4 text-sm font-semibold text-[#6d28d9]"
                href={ledgerHref}
              >
                <ArrowLeft className="size-4" />
                {copy.backToLedger}
              </Link>
              <Link
                className="hidden h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 sm:inline-flex"
                href={eventDetailHref}
              >
                <GitBranch className="size-4" />
                {copy.backToEvent}
              </Link>
            </div>
          </div>

          <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-end">
            <div className="min-w-0">
              <p className="inline-flex flex-wrap items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
                {copy.heroEyebrow}
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold normal-case ring-1 ${
                    isCoverageMock
                      ? "border-amber-100 bg-amber-50 text-amber-800 ring-amber-100"
                      : "border-emerald-100 bg-emerald-50 text-emerald-800 ring-emerald-100"
                  }`}
                >
                  {isCoverageMock ? (
                    <TriangleAlert className="size-3.5" />
                  ) : (
                    <ShieldCheck className="size-3.5" />
                  )}
                  {isCoverageMock ? copy.coverageMockEvent : copy.productEvent}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[0.68rem] font-semibold normal-case text-[#6d28d9] ring-1 ring-violet-100">
                  {copy.eventScope}: {eventScopeLabel}
                </span>
              </p>
              <h1 className="mt-2 text-4xl font-semibold leading-tight text-[#11132d] sm:text-5xl">
                {copy.heroTitle}
              </h1>
              <p className="mt-4 hidden max-w-3xl text-base font-medium leading-7 text-slate-600 sm:block">
                {copy.heroBody}
              </p>
              {!eventInScope ? (
                <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-semibold leading-6 text-amber-800">
                  {copy.eventScopeOutside} · {copy.eventScopeMismatch}
                </p>
              ) : null}
              {relatedStarScope.length ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-violet-100 bg-violet-50 px-3 py-2">
                  <span className="text-xs font-semibold uppercase text-[#6d28d9]">
                    {copy.relatedStarScope}
                  </span>
                  {relatedStarScope.map((relatedStarId) => (
                    <span
                      className="rounded-full bg-white px-2.5 py-1 font-mono text-[0.68rem] font-semibold text-[#6d28d9]"
                      key={relatedStarId}
                    >
                      {relatedStarId}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="rounded-lg bg-gradient-to-br from-[#11132d] via-[#4338ca] to-[#7c3aed] p-5 text-white">
              <p className="text-xs font-semibold uppercase text-white/60">
                {copy.packetHash}
              </p>
              <p className="mt-3 break-all font-mono text-xs font-semibold leading-6 text-white/90">
                {packet.integrity.packetHash}
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

        <section className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
                <ShieldCheck className="size-4" />
                {copy.trace}
              </p>
              <p className="mt-2 hidden max-w-3xl text-sm font-medium leading-6 text-slate-500 sm:block">
                {copy.verifierNote}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <BadgeCheck className="size-3.5" />
              {copy.ready}
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <TraceStep
              Icon={Database}
              body={`${packet.event.source} / ${packet.event.sourceId}`}
              label={copy.source}
            />
            <TraceStep
              Icon={ShieldCheck}
              body={packet.event.schemaVersion}
              label={copy.schema}
              tone="cyan"
            />
            <TraceStep
              Icon={Fingerprint}
              body={truncateHash(packet.evidence.eventEvidenceHash)}
              label={copy.eventHash}
              tone="emerald"
            />
            <TraceStep
              Icon={Network}
              body={`${linkedEvents.length} / ${packet.evidence.linkedEventCount}`}
              label={copy.linkedEvidence}
              tone="slate"
            />
          </div>
        </section>

        <section className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
                <BadgeCheck className="size-4" />
                {copy.oracleManifest}
              </p>
              <p className="mt-2 hidden max-w-3xl text-sm font-medium leading-6 text-slate-500 sm:block">
                {copy.heroBody}
              </p>
            </div>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-[#6d28d9]">
              {copy.scoreImpact}{" "}
              {formatNumber(packet.oracleManifest.scoreImpact.total, locale)}
            </span>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-[1.15fr_0.9fr_0.9fr]">
            <ScoreImpactManifestCard
              copy={copy}
              locale={locale}
              packet={packet}
            />
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase text-emerald-700">
                {copy.oracleReady}
              </p>
              <div className="mt-3 grid gap-2 text-sm font-semibold text-[#11132d]">
                <span className="rounded-md bg-white/80 px-3 py-2">
                  {copy.oracleReady}:{" "}
                  {packet.oracleManifest.readiness.oracleReady
                    ? copy.ready
                    : packet.oracleManifest.readiness.auditStatus}
                </span>
                <span className="rounded-md bg-white/80 px-3 py-2">
                  {copy.quality}:{" "}
                  {formatNumber(
                    packet.oracleManifest.readiness.qualityScore,
                    locale,
                  )}
                  /100
                </span>
                <span className="rounded-md bg-white/80 px-3 py-2">
                  {copy.x402Ready}:{" "}
                  {packet.oracleManifest.readiness.x402Ready
                    ? copy.ready
                    : copy.notReady}
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-violet-100 bg-violet-50 p-4">
              <p className="text-xs font-semibold uppercase text-[#6d28d9]">
                {copy.relatedStarScope}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {packet.oracleManifest.graph.relatedStarScope.length ? (
                  packet.oracleManifest.graph.relatedStarScope.map(
                    (relatedStarId) => (
                      <span
                        className="rounded-full bg-white px-2.5 py-1 font-mono text-[0.68rem] font-semibold text-[#6d28d9] ring-1 ring-violet-100"
                        key={relatedStarId}
                      >
                        {relatedStarId}
                      </span>
                    ),
                  )
                ) : (
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                    -
                  </span>
                )}
              </div>
              <div className="mt-3 grid gap-2 text-sm font-semibold text-[#11132d]">
                <span className="rounded-md bg-white/80 px-3 py-2">
                  {copy.graphReady}:{" "}
                  {packet.oracleManifest.graph.graphReady
                    ? copy.ready
                    : packet.oracleManifest.readiness.auditStatus}
                </span>
                <span className="rounded-md bg-white/80 px-3 py-2">
                  {copy.impactReady}:{" "}
                  {packet.oracleManifest.graph.impactReady
                    ? copy.ready
                    : packet.oracleManifest.readiness.auditStatus}
                </span>
                <span className="rounded-md bg-white/80 px-3 py-2">
                  {copy.linkedEvidence}:{" "}
                  {packet.oracleManifest.graph.linkedEventCount} /{" "}
                  {packet.oracleManifest.graph.relatedEventCount}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <article className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
              <FileCheck2 className="size-4" />
              {copy.event}
            </p>
            <h2 className="mt-3 break-all font-mono text-lg font-semibold text-[#11132d]">
              {event.eventId}
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoTile label={copy.event} value={getEventTypeLabel(event.type, locale)} />
              <InfoTile label={copy.issuedAt} value={formatDate(packet.issuedAt, locale)} />
              <InfoTile label={copy.sourceId} value={event.sourceId} />
              <InfoTile label={copy.object} value={getActorLabel(event.object ?? null)} />
              <InfoTile label={copy.audit} value={event.audit.status} />
              <InfoTile
                label={copy.quality}
                value={`${formatNumber(event.audit.qualityScore, locale)}/100`}
              />
            </div>
          </article>

          <article className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
              <Fingerprint className="size-4" />
              {copy.evidence}
            </p>
            <div className="mt-5 grid gap-3">
              <InfoTile label={copy.recordType} value={packet.recordType} />
              <InfoTile label={copy.packetVersion} value={packet.packetVersion} />
              <InfoTile label={copy.evidenceRoot} value={packet.integrity.evidenceRoot} />
              <InfoTile label={copy.packetHash} value={packet.integrity.packetHash} />
            </div>
          </article>
        </section>

        <section className="rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
                <Network className="size-4" />
                {copy.linkedEvidence}
              </p>
              <p className="mt-2 hidden max-w-3xl text-sm font-medium leading-6 text-slate-500 sm:block">
                {copy.linkedEvidenceBody}
              </p>
            </div>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-[#6d28d9]">
              {linkedEvents.length} / {packet.evidence.linkedEventCount}
            </span>
          </div>
          <div className="mt-5 grid gap-2">
            {linkedEvents.map((linkedEvent) => {
              const params = new URLSearchParams();

              if (starId) {
                params.set("starId", starId);
              }

              if (eventScope !== "all") {
                params.set("scope", eventScope);
              }

              if (coverageAction) {
                params.set("coverageAction", coverageAction.action);

                if (coverageAction.memberEmail) {
                  params.set("memberEmail", coverageAction.memberEmail);
                }
              }

              return (
                <Link
                  className="grid min-w-0 gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm transition hover:border-violet-200 hover:bg-white sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_8rem]"
                  href={`/${locale}/fanletter/agentrank/events/${encodeURIComponent(
                    linkedEvent.eventId,
                  )}${params.size ? `?${params.toString()}` : ""}`}
                  key={linkedEvent.eventId}
                >
                  <span className="min-w-0 truncate font-semibold text-[#11132d]">
                    {getEventTypeLabel(linkedEvent.type, locale)}
                  </span>
                  <span className="min-w-0 break-all font-mono text-[0.68rem] font-semibold text-slate-500">
                    {truncateHash(linkedEvent.evidenceHash, 16, 8)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#6d28d9]">
                    {formatNumber(linkedEvent.qualityScore, locale)}/100
                    <ArrowRight className="size-3.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="hidden rounded-lg border border-violet-100 bg-white p-5 shadow-[0_18px_44px_rgba(88,28,135,0.06)] sm:block">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#6d28d9]">
            <Database className="size-4" />
            {copy.canonical}
          </p>
          <pre className="mt-4 max-h-[34rem] overflow-auto rounded-lg bg-[#11132d] p-4 text-xs leading-6 text-violet-50">
            {JSON.stringify(packet, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  );
}
