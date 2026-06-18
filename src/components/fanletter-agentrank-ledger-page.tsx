import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  AtSign,
  BadgeCheck,
  Bot,
  Clock3,
  Coins,
  Database,
  Download,
  GitBranch,
  Network,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";

import {
  agentRankReputationEventTypes,
  type AgentRankReputationEvent,
  type AgentRankReputationEventType,
  type FanletterAgentRankReputationEventFeed,
} from "@/lib/agentrank/reputation-events";
import { FanletterActionGuide } from "@/components/fanletter-action-guide";
import { FanletterAgentRankCoverageActionNotice } from "@/components/fanletter-agentrank-coverage-action-notice";
import { FanletterAgentRankEventQuickPanel } from "@/components/fanletter-agentrank-event-quick-panel";
import type { AgentRankCoverageActionContext } from "@/lib/agentrank/coverage-action";
import {
  isAgentRankCoverageMockEvent,
  type AgentRankEventMockScope,
} from "@/lib/agentrank/mock-events";
import {
  buildAgentRankReviewQueueSnapshot,
  type AgentRankReviewQueueCategory,
  type AgentRankProductActionCoverageItem,
  type AgentRankReviewQueueItem,
  type AgentRankReviewQueueSnapshot,
} from "@/lib/agentrank/review-queue";
import type {
  AgentRankEventLedgerReadinessFilter,
  AgentRankEventLedgerSort,
} from "@/lib/agentrank/event-feed-controls";
import { getAgentRankRelatedStarScope } from "@/lib/agentrank/related-star-scope";
import type { Locale } from "@/lib/i18n";

type FanletterAgentRankLedgerPageProps = {
  coverageAction?: AgentRankCoverageActionContext | null;
  eventScope: {
    raw: {
      mockEvents: number;
      productEvents: number;
      totalEvents: number;
    };
    readiness: AgentRankEventLedgerReadinessFilter;
    scope: AgentRankEventMockScope;
    scoped: {
      mockEvents: number;
      productEvents: number;
      totalEvents: number;
    };
    sort: AgentRankEventLedgerSort;
  };
  feed: FanletterAgentRankReputationEventFeed;
  filters: {
    limit: number;
    memberEmail: string | null;
    readiness: AgentRankEventLedgerReadinessFilter;
    scope: AgentRankEventMockScope;
    sort: AgentRankEventLedgerSort;
    starId: string | null;
    type: AgentRankReputationEventType | null;
  };
  locale: Locale;
};

const eventTone = {
  ai_star_discovered: "border-blue-100 bg-blue-50 text-blue-700",
  ai_star_spawned: "border-pink-100 bg-pink-50 text-pink-700",
  content_engaged: "border-slate-100 bg-slate-50 text-slate-700",
  cp_earned: "border-emerald-100 bg-emerald-50 text-emerald-700",
  cp_pool_generated: "border-teal-100 bg-teal-50 text-teal-700",
  creator_unlock_evaluated: "border-purple-100 bg-purple-50 text-purple-700",
  creator_unlocked: "border-fuchsia-100 bg-fuchsia-50 text-fuchsia-700",
  creator_social_connected: "border-zinc-200 bg-zinc-50 text-zinc-800",
  founder_joined: "border-violet-100 bg-violet-50 text-[#6d28d9]",
  referral_code_created: "border-cyan-100 bg-cyan-50 text-cyan-700",
  referral_shared: "border-sky-100 bg-sky-50 text-sky-700",
  referral_converted: "border-indigo-100 bg-indigo-50 text-indigo-700",
  source_universe_selected: "border-teal-100 bg-teal-50 text-teal-700",
  universe_growth: "border-amber-100 bg-amber-50 text-amber-700",
  x402_mock_payment_intent:
    "border-emerald-100 bg-emerald-50 text-emerald-700",
} satisfies Record<AgentRankReputationEventType, string>;

const eventIconMap = {
  ai_star_discovered: Bot,
  ai_star_spawned: Sparkles,
  content_engaged: Clock3,
  cp_earned: Coins,
  cp_pool_generated: Database,
  creator_unlock_evaluated: SlidersHorizontal,
  creator_unlocked: BadgeCheck,
  creator_social_connected: AtSign,
  founder_joined: Users,
  referral_code_created: Network,
  referral_shared: Network,
  referral_converted: GitBranch,
  source_universe_selected: ShieldCheck,
  universe_growth: Database,
  x402_mock_payment_intent: Coins,
} satisfies Record<AgentRankReputationEventType, typeof Bot>;

function getLedgerCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      actor: "액터",
      all: "전체",
      api: "API 원본",
      audit: "감사 상태",
      auditReady: "감사 준비",
      back: "AgentRank로 돌아가기",
      cp: "CP",
      coverageMock: "커버리지 Mock",
      coverageMockNote:
        "커버리지 확인용 이벤트입니다. 실제 결제/권한 부여와 분리됩니다.",
      csv: "CSV 내보내기",
      details: "이벤트 상세",
      evidencePacket: "Evidence Packet",
      empty:
        "조건에 맞는 Reputation Event가 없습니다. 다른 스타, 멤버, 이벤트 타입으로 확인하세요.",
      event: "이벤트",
      eventId: "이벤트 ID",
      eventScope: "이벤트 범위",
      evidenceHash: "증거 해시",
      applyFilters: "필터 적용",
      actionCoverage: "제품 행동 커버리지",
      actionCoverageBody:
        "FanLetter 핵심 행동이 AgentRank Reputation Event로 누락 없이 들어오는지 점검합니다.",
      actionMissing: "수집 대기",
      actionReady: "수집됨",
      clearFilters: "필터 초기화",
      filterByType: "이벤트 타입 필터",
      currentFilter: "현재 필터",
      filterDrawer: "필터 조정",
      filters: "Ledger 필터",
      generated: "생성 시각",
      graphScope: "그래프 범위",
      graphReady: "그래프 준비",
      heroBody:
        "FanLetter에서 발생한 발견, 파운더 참여, 추천, CP, 크리에이터 생성 이벤트가 AgentRank v1 스키마로 정규화되는지 확인합니다.",
      heroEyebrow: "AgentRank Ledger",
      heroTitle: "Reputation Event Ledger",
      impact: "평판 영향",
      impactReady: "영향 준비",
      investorDemo: "Investor Demo Mode",
      investorDemoBody:
        "선택한 AI 스타의 이벤트, 보상, 검증 상태를 투자자 데모에서 바로 설명할 수 있는 운영 지표로 묶습니다.",
      ledgerReviewQueue: "Event Review Queue",
      ledgerReviewQueueBody:
        "오라클 보강, Packet 후보, 고기여 이벤트, 품질 낮은 이벤트를 작업 큐처럼 분류합니다.",
      lowQualityEvents: "품질 점검",
      member: "멤버",
      networkEdges: "네트워크 엣지",
      needs: "보강 필요",
      nextAction: "다음 액션",
      ndjson: "NDJSON 스트림",
      oracleNeeds: "Oracle 보강 항목",
      oracleReady: "오라클 준비",
      openEvent: "요약 보기",
      packetPartial: "Packet 부분 준비",
      packetReady: "Packet 준비",
      quality: "품질 점수",
      rankContribution: "AgentRank 기여도",
      ready: "준비됨",
      reviewHighImpact: "고기여 검토",
      reviewNeedsOracle: "오라클 보강",
      reviewPacketReady: "Packet 후보",
      readinessAll: "전체 준비도",
      readinessFilter: "준비도 필터",
      readinessNeedsOracle: "Oracle 보강 필요",
      readinessOracleReady: "Oracle 준비",
      readinessPacketPartial: "Packet 부분 준비",
      readinessPacketReady: "Packet 준비",
      relatedStarScope: "관련 AI 스타",
      schema: "스키마",
      schemaReady: "스키마 준비",
      scoreSignals: "점수 신호",
      scopeAll: "전체 이벤트",
      scopeMock: "Mock 커버리지",
      scopeProduct: "운영 이벤트",
      sort: "정렬",
      sortImpactDesc: "기여도 높은 순",
      sortLatest: "최신순",
      sortQualityAsc: "품질 낮은 순",
      sortQualityDesc: "품질 높은 순",
      source: "소스",
      sourceId: "소스 ID",
      star: "AI 스타",
      limit: "표시 개수",
      productEvent: "제품 이벤트",
      totalEvents: "이벤트",
      uniqueMembers: "멤버",
      uniqueStars: "AI 스타",
      viewAll: "전체 보기",
    };
  }

  return {
    actor: "Actor",
    all: "All",
    api: "Raw API",
    audit: "Audit Status",
    auditReady: "Audit-ready",
    back: "Back to AgentRank",
    cp: "CP",
    coverageMock: "Coverage Mock",
    coverageMockNote:
      "Audit coverage event. Separated from live payment or entitlement state.",
    csv: "Export CSV",
    details: "Event Details",
    evidencePacket: "Evidence Packet",
    empty:
      "No matching Reputation Events. Try another Star, member, or event type.",
    event: "Event",
    eventId: "Event ID",
    eventScope: "Event scope",
    evidenceHash: "Evidence Hash",
    applyFilters: "Apply filters",
    actionCoverage: "Product Action Coverage",
    actionCoverageBody:
      "Checks whether core FanLetter actions are entering AgentRank as Reputation Events.",
    actionMissing: "Pending",
    actionReady: "Covered",
    clearFilters: "Reset filters",
    filterByType: "Filter by event type",
    currentFilter: "Current filter",
    filterDrawer: "Adjust filters",
    filters: "Ledger filters",
    generated: "Generated",
    graphScope: "Graph Scope",
    graphReady: "Graph-ready",
    heroBody:
      "Inspect how FanLetter discovery, founder, referral, CP, and creator launch actions normalize into the AgentRank v1 schema.",
    heroEyebrow: "AgentRank Ledger",
    heroTitle: "Reputation Event Ledger",
    impact: "Reputation Impact",
    impactReady: "Impact-ready",
    investorDemo: "Investor Demo Mode",
    investorDemoBody:
      "Packages the selected AI Star's events, rewards, and verification state into operator metrics for investor demos.",
    ledgerReviewQueue: "Event Review Queue",
    ledgerReviewQueueBody:
      "Groups Oracle gaps, packet candidates, high-impact events, and low-quality events as an operational review queue.",
    lowQualityEvents: "Quality Review",
    member: "Member",
    networkEdges: "Network Edges",
    needs: "Needs data",
    nextAction: "Next action",
    ndjson: "NDJSON Stream",
    oracleNeeds: "Oracle gaps",
    oracleReady: "Oracle-ready",
    openEvent: "Quick view",
    packetPartial: "Packet partial",
    packetReady: "Packet ready",
    quality: "Quality Score",
    rankContribution: "AgentRank Contribution",
    ready: "Ready",
    reviewHighImpact: "High-impact Review",
    reviewNeedsOracle: "Oracle Gaps",
    reviewPacketReady: "Packet Candidates",
    readinessAll: "All readiness",
    readinessFilter: "Readiness filter",
    readinessNeedsOracle: "Needs Oracle",
    readinessOracleReady: "Oracle-ready",
    readinessPacketPartial: "Packet partial",
    readinessPacketReady: "Packet ready",
    relatedStarScope: "Related AI Stars",
    schema: "Schema",
    schemaReady: "Schema-ready",
    scoreSignals: "Score Signals",
    scopeAll: "All events",
    scopeMock: "Mock coverage",
    scopeProduct: "Product events",
    sort: "Sort",
    sortImpactDesc: "Highest contribution",
    sortLatest: "Latest",
    sortQualityAsc: "Lowest quality",
    sortQualityDesc: "Highest quality",
    source: "Source",
    sourceId: "Source ID",
    star: "AI Star",
    limit: "Limit",
    productEvent: "Product Event",
    totalEvents: "Events",
    uniqueMembers: "Members",
    uniqueStars: "AI Stars",
    viewAll: "View all",
  };
}

function isCoverageMockEvent(event: AgentRankReputationEvent) {
  return isAgentRankCoverageMockEvent(event);
}

function toFiniteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatNumber(value: number | null | undefined, locale: Locale) {
  return new Intl.NumberFormat(locale).format(toFiniteNumber(value));
}

function formatPercent(
  value: number | null | undefined,
  total: number | null | undefined,
  locale: Locale,
) {
  const safeTotal = toFiniteNumber(total);
  const safeValue = toFiniteNumber(value);
  const percent = safeTotal > 0 ? Math.round((safeValue / safeTotal) * 100) : 0;

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    style: "percent",
  }).format(percent / 100);
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

function getEventTypeLabel(type: AgentRankReputationEventType, locale: Locale) {
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
          creator_social_connected: "TikTok 채널 연결",
          founder_joined: "파운더 참여",
          referral_code_created: "추천 코드 생성",
          referral_shared: "추천 링크 공유",
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
          creator_social_connected: "Creator Social Connected",
          founder_joined: "Founder Joined",
          referral_code_created: "Referral Code Created",
          referral_shared: "Referral Shared",
          referral_converted: "Referral Converted",
          source_universe_selected: "Source Universe Selected",
          universe_growth: "Universe Growth",
          x402_mock_payment_intent: "x402 Mock Payment Intent",
        };

  return labels[type];
}

function getActorLabel(actor: AgentRankReputationEvent["actor"]) {
  return actor.label ?? actor.id;
}

function getObjectLabel(event: AgentRankReputationEvent) {
  return event.object?.label ?? event.object?.id ?? event.starId ?? "-";
}

function isValidIsoDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

function getOracleReadinessGaps(
  event: AgentRankReputationEvent,
  locale: Locale,
) {
  const labels =
    locale === "ko"
      ? {
          actor: "액터 ID",
          source: "소스 ID",
          star: "AI 스타 ID",
          time: "발생 시각",
          upstream: "상위 검증 신호",
        }
      : {
          actor: "Actor ID",
          source: "Source ID",
          star: "AI Star ID",
          time: "Timestamp",
          upstream: "Upstream verification signal",
        };
  const gaps: string[] = [];

  if (!event.sourceId) {
    gaps.push(labels.source);
  }

  if (!isValidIsoDate(event.occurredAt)) {
    gaps.push(labels.time);
  }

  if (!event.actor.id || event.actor.id.startsWith("unknown-")) {
    gaps.push(labels.actor);
  }

  if (!event.starId && event.object?.type !== "ai_star") {
    gaps.push(labels.star);
  }

  if (!event.reputationSignals.oracleReady && gaps.length === 0) {
    gaps.push(labels.upstream);
  }

  return gaps;
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

function getLedgerScoreSignals(event: AgentRankReputationEvent) {
  return [
    {
      label: "Network",
      tone: "bg-blue-50 text-blue-700 ring-blue-100",
      value: event.reputationSignals.networkWeight,
    },
    {
      label: "Economic",
      tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      value: event.reputationSignals.economicWeight,
    },
    {
      label: "Creator",
      tone: "bg-violet-50 text-[#6d28d9] ring-violet-100",
      value: event.reputationSignals.creatorWeight,
    },
    {
      label: "Discovery",
      tone: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100",
      value: event.reputationSignals.discoveryWeight,
    },
  ]
    .filter((signal) => signal.value > 0)
    .sort(
      (left, right) =>
        right.value - left.value || left.label.localeCompare(right.label),
    );
}

function ScoreContributionBar({
  signals,
}: {
  signals: ReturnType<typeof getLedgerScoreSignals>;
}) {
  const total = signals.reduce((sum, signal) => sum + signal.value, 0);

  if (total <= 0) {
    return <div className="h-2 rounded-full bg-slate-100" />;
  }

  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
      {signals.map((signal) => {
        const width = Math.max(7, Math.round((signal.value / total) * 100));
        const colorClass =
          signal.label === "Network"
            ? "bg-blue-500"
            : signal.label === "Economic"
              ? "bg-emerald-500"
              : signal.label === "Creator"
                ? "bg-violet-500"
                : "bg-fuchsia-500";

        return (
          <span
            className={colorClass}
            key={signal.label}
            style={{ width: `${width}%` }}
          />
        );
      })}
    </div>
  );
}

function ReadinessPill({
  gaps,
  label,
}: {
  gaps: string[];
  label: string;
}) {
  const isReady = gaps.length === 0;
  const Icon = isReady ? BadgeCheck : AlertTriangle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
        isReady
          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
          : "border-amber-100 bg-amber-50 text-amber-700"
      }`}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}

function buildLedgerHref({
  filters,
  locale,
  readiness,
  scope,
  sort,
  type,
}: {
  filters: FanletterAgentRankLedgerPageProps["filters"];
  locale: Locale;
  readiness?: AgentRankEventLedgerReadinessFilter;
  scope?: AgentRankEventMockScope;
  sort?: AgentRankEventLedgerSort;
  type: AgentRankReputationEventType | null;
}) {
  const params = new URLSearchParams();
  const nextScope = scope ?? filters.scope;
  const nextReadiness = readiness ?? filters.readiness;
  const nextSort = sort ?? filters.sort;

  if (filters.starId) {
    params.set("starId", filters.starId);
  }

  if (filters.memberEmail) {
    params.set("memberEmail", filters.memberEmail);
  }

  if (type) {
    params.set("type", type);
  }

  if (nextScope !== "all") {
    params.set("scope", nextScope);
  }

  if (nextReadiness !== "all") {
    params.set("readiness", nextReadiness);
  }

  if (nextSort !== "latest") {
    params.set("sort", nextSort);
  }

  if (filters.limit !== 120) {
    params.set("limit", String(filters.limit));
  }

  const query = params.toString();

  return `/${locale}/fanletter/agentrank/events${query ? `?${query}` : ""}`;
}

function buildEventDetailHref({
  event,
  locale,
}: {
  event: AgentRankReputationEvent;
  locale: Locale;
}) {
  const params = new URLSearchParams();
  const starId = event.starId ?? event.object?.id ?? null;

  if (starId) {
    params.set("starId", starId);
  }

  return `/${locale}/fanletter/agentrank/events/${encodeURIComponent(
    event.eventId,
  )}${params.size ? `?${params.toString()}` : ""}`;
}

function getReviewQueuePresentation(
  category: AgentRankReviewQueueCategory,
  locale: Locale,
) {
  const labels =
    locale === "ko"
      ? {
          high_impact: {
            body: "AgentRank 점수 기여가 큰 이벤트를 먼저 검토합니다.",
            label: "고기여 검토",
          },
          needs_oracle: {
            body: "Oracle, 그래프, 감사, 영향 신호가 부족한 이벤트입니다.",
            label: "오라클 보강",
          },
          packet_ready: {
            body: "Evidence Packet으로 묶어 Oracle에 전달할 수 있는 후보입니다.",
            label: "Packet 후보",
          },
          quality_review: {
            body: "품질 점수나 필수 필드가 낮아 운영 점검이 필요합니다.",
            label: "품질 점검",
          },
        }
      : {
          high_impact: {
            body: "Prioritize events with the strongest AgentRank score impact.",
            label: "High-impact Review",
          },
          needs_oracle: {
            body: "Events missing Oracle, graph, audit, or impact signals.",
            label: "Oracle Gaps",
          },
          packet_ready: {
            body: "Candidates ready to package for the Reputation Oracle.",
            label: "Packet Candidates",
          },
          quality_review: {
            body: "Events needing operator checks for quality or required fields.",
            label: "Quality Review",
          },
        };
  const presentation = {
    high_impact: {
      Icon: Sparkles,
      tone: "border-blue-100 bg-blue-50/80",
    },
    needs_oracle: {
      Icon: AlertTriangle,
      tone: "border-amber-100 bg-amber-50/80",
    },
    packet_ready: {
      Icon: ShieldCheck,
      tone: "border-emerald-100 bg-emerald-50/80",
    },
    quality_review: {
      Icon: SlidersHorizontal,
      tone: "border-fuchsia-100 bg-fuchsia-50/80",
    },
  } satisfies Record<
    AgentRankReviewQueueCategory,
    {
      Icon: typeof AlertTriangle;
      tone: string;
    }
  >;

  return {
    ...labels[category],
    ...presentation[category],
  };
}

function getReviewQueueActionLabel(
  item: AgentRankReviewQueueItem,
  locale: Locale,
) {
  if (locale !== "ko") {
    return item.actionLabel;
  }

  if (item.auditGaps.length > 0) {
    return `보강: ${item.auditGaps
      .slice(0, 2)
      .map((gap) => getAuditGapLabel(gap, locale))
      .join(", ")}`;
  }

  if (item.reasonCodes.includes("oracle_gap")) {
    return "상위 Oracle 신호 검증";
  }

  if (item.reasonCodes.includes("graph_gap")) {
    return "거래 그래프 엣지 연결";
  }

  if (item.reasonCodes.includes("impact_gap")) {
    return "점수 영향 신호 검증";
  }

  if (item.reasonCodes.includes("low_quality")) {
    return "낮은 품질 점수 점검";
  }

  return "Oracle Packet 후보 검토";
}

function getLedgerEventNextActionLabel(
  event: AgentRankReputationEvent,
  locale: Locale,
) {
  const isKorean = locale === "ko";

  if (!event.audit.graphReady) {
    return isKorean ? "거래 그래프 연결" : "Connect graph links";
  }

  if (!event.audit.impactReady) {
    return isKorean ? "점수 영향 확인" : "Review score impact";
  }

  if (!event.reputationSignals.oracleReady) {
    return isKorean ? "Oracle 증거 보강" : "Enrich Oracle evidence";
  }

  if (event.audit.status !== "audit_ready") {
    return isKorean ? "감사 품질 점검" : "Review audit quality";
  }

  return isKorean ? "상세 추적 검증" : "Trace event detail";
}

function getActionCoverageLabel(
  action: AgentRankProductActionCoverageItem,
  locale: Locale,
) {
  if (locale !== "ko") {
    return action.label;
  }

  const labels = {
    creator: "크리에이터 권한/AI 스타 생성",
    discovery: "AI 스타 발견",
    founder: "파운더 참여",
    payment: "x402 Mock/CP Pool",
    referral: "추천 코드/전환",
    star_detail: "AI 스타 상세/콘텐츠",
  } satisfies Record<AgentRankProductActionCoverageItem["key"], string>;

  return labels[action.key];
}

function sumContextNumber(events: AgentRankReputationEvent[], key: string) {
  return events.reduce((sum, event) => {
    const value = event.context[key];

    return sum + (typeof value === "number" && Number.isFinite(value) ? value : 0);
  }, 0);
}

function MetricTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#11132d]">{value}</p>
    </div>
  );
}

function LedgerOperationStatusCard({
  auditReadyEvents,
  filters,
  locale,
  packetReadyEvents,
  reviewHref,
  totalEvents,
}: {
  auditReadyEvents: number;
  filters: FanletterAgentRankLedgerPageProps["filters"];
  locale: Locale;
  packetReadyEvents: number;
  reviewHref: string;
  totalEvents: number;
}) {
  const copy = getLedgerCopy(locale);
  const isKo = locale === "ko";
  const packetReadyHref = buildLedgerHref({
    filters,
    locale,
    readiness: "packet_ready",
    sort: "impact_desc",
    type: null,
  });
  const packetPercent =
    totalEvents > 0 ? Math.round((packetReadyEvents / totalEvents) * 100) : 0;
  const progressWidth = `${Math.min(100, Math.max(0, packetPercent))}%`;
  const scopeLabel =
    filters.scope === "product"
      ? copy.scopeProduct
      : filters.scope === "mock"
        ? copy.scopeMock
        : copy.scopeAll;
  const readinessLabel =
    filters.readiness === "needs_oracle"
      ? copy.readinessNeedsOracle
      : filters.readiness === "oracle_ready"
        ? copy.readinessOracleReady
        : filters.readiness === "packet_partial"
          ? copy.readinessPacketPartial
          : filters.readiness === "packet_ready"
            ? copy.readinessPacketReady
            : copy.readinessAll;
  const filterSummary = [
    filters.starId ?? (isKo ? "전체 AI 스타" : "All AI Stars"),
    scopeLabel,
    readinessLabel,
  ].join(" · ");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex max-w-full items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
            <Database className="size-3.5 shrink-0 text-black" />
            <span className="truncate">
              {isKo ? "현재 위치: Reputation Event 장부" : "Now: Reputation Event ledger"}
            </span>
          </p>
          <h2 className="mt-3 text-xl font-semibold leading-tight text-[#11132d] [word-break:keep-all] sm:text-2xl">
            {isKo ? "다음 처리: 리뷰 큐 확인" : "Next action: review the queue"}
          </h2>
          <p className="mt-2 hidden max-w-2xl text-sm font-medium leading-6 text-slate-500 sm:block">
            {isKo
              ? "이 장부는 FanLetter 행동을 AgentRank가 검증할 수 있는 Reputation Event로 정리합니다."
              : "This ledger turns FanLetter actions into AgentRank-verifiable Reputation Events."}
          </p>
        </div>
        <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
          {copy.packetReady} {formatNumber(packetReadyEvents, locale)}
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-black via-zinc-700 to-zinc-400"
          style={{ width: progressWidth }}
        />
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          {copy.currentFilter}
        </p>
        <p className="mt-1 break-words text-sm font-semibold leading-tight text-zinc-950 [word-break:keep-all]">
          {filterSummary}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2">
          <p className="truncate text-[0.62rem] font-semibold uppercase text-slate-400">
            {copy.totalEvents}
          </p>
          <p className="mt-1 truncate text-lg font-semibold text-[#11132d]">
            {formatNumber(totalEvents, locale)}
          </p>
        </div>
        <div className="min-w-0 rounded-lg bg-zinc-50 px-3 py-2">
          <p className="truncate text-[0.62rem] font-semibold uppercase text-zinc-500">
            {copy.auditReady}
          </p>
          <p className="mt-1 truncate text-lg font-semibold text-zinc-950">
            {formatNumber(auditReadyEvents, locale)}
          </p>
        </div>
        <div className="min-w-0 rounded-lg bg-emerald-50 px-3 py-2">
          <p className="truncate text-[0.62rem] font-semibold uppercase text-emerald-700/70">
            {copy.packetReady}
          </p>
          <p className="mt-1 truncate text-lg font-semibold text-emerald-800">
            {packetPercent}%
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
        <Link
          className="hidden h-11 min-w-0 items-center justify-center gap-2 rounded-full bg-[#111827] px-5 text-sm font-semibold !text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)] sm:inline-flex"
          href={reviewHref}
        >
          {copy.ledgerReviewQueue}
          <ArrowRight className="size-4 shrink-0" />
        </Link>
        <Link
          className="hidden h-11 min-w-0 items-center justify-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 sm:inline-flex"
          href={packetReadyHref}
        >
          {copy.reviewPacketReady}
          <ArrowRight className="size-4 shrink-0" />
        </Link>
      </div>
    </section>
  );
}

function ReviewQueuePanel({
  filters,
  locale,
  queue,
}: {
  filters: FanletterAgentRankLedgerPageProps["filters"];
  locale: Locale;
  queue: AgentRankReviewQueueSnapshot["queues"];
}) {
  const copy = getLedgerCopy(locale);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-zinc-600">
            <AlertTriangle className="size-4" />
            {copy.ledgerReviewQueue}
          </p>
          <p className="mt-2 hidden max-w-3xl text-sm font-medium leading-6 text-slate-500 sm:block">
            {copy.ledgerReviewQueueBody}
          </p>
        </div>
        <Link
          className="inline-flex h-9 items-center gap-2 rounded-full bg-[#11132d] px-3 text-xs font-semibold !text-white"
          href={buildLedgerHref({
            filters,
            locale,
            readiness: "needs_oracle",
            sort: "quality_asc",
            type: null,
          })}
        >
          {copy.reviewNeedsOracle}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-4">
        {queue.map((bucket) => {
          const { Icon, body, label, tone } = getReviewQueuePresentation(
            bucket.category,
            locale,
          );

          return (
            <article
              className={`rounded-lg border p-3 ${tone}`}
              key={bucket.category}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold">
                    <Icon className="size-4 shrink-0" />
                    {label}
                  </p>
                  <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
                    {body}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#11132d]">
                  {formatNumber(bucket.total, locale)}
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {bucket.events.length ? (
                  bucket.events.map((item) => (
                    <Link
                      className="block rounded-lg bg-white/78 px-3 py-2 text-sm transition hover:bg-white"
                      href={buildEventDetailHref({ event: item.event, locale })}
                      key={item.event.eventId}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate font-semibold text-[#11132d]">
                          {getEventTypeLabel(item.event.type, locale)}
                        </span>
                        <span className="shrink-0 font-mono text-xs font-semibold text-zinc-700">
                          {item.impactTotal.toFixed(1)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                        {copy.nextAction}: {getReviewQueueActionLabel(item, locale)}
                      </p>
                    </Link>
                  ))
                ) : (
                  <p className="rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold text-slate-500">
                    {copy.ready}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ActionCoveragePanel({
  actions,
  filters,
  locale,
}: {
  actions: AgentRankProductActionCoverageItem[];
  filters: FanletterAgentRankLedgerPageProps["filters"];
  locale: Locale;
}) {
  const copy = getLedgerCopy(locale);
  const coveredCount = actions.filter((action) => action.covered).length;

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-zinc-600">
            <BadgeCheck className="size-4" />
            {copy.actionCoverage}
          </p>
          <p className="mt-2 hidden max-w-3xl text-sm font-medium leading-6 text-slate-500 sm:block">
            {copy.actionCoverageBody}
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-900">
          {formatNumber(coveredCount, locale)}/{formatNumber(actions.length, locale)}
        </span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        {actions.map((action) => (
          <Link
            className={`rounded-lg border p-3 transition hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)] ${
              action.covered
                ? "border-emerald-100 bg-emerald-50/80"
                : "border-amber-100 bg-amber-50/80"
            }`}
            href={buildLedgerHref({
              filters,
              locale,
              type: action.eventType,
            })}
            key={action.label}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-semibold text-[#11132d]">
                {getActionCoverageLabel(action, locale)}
              </p>
              {action.covered ? (
                <BadgeCheck className="size-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertTriangle className="size-4 shrink-0 text-amber-600" />
              )}
            </div>
            <p
              className={`mt-2 text-xs font-semibold ${
                action.covered ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {action.covered ? copy.actionReady : copy.actionMissing}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function InvestorDemoPanel({
  apiHref,
  csvHref,
  feed,
  filters,
  locale,
  ndjsonHref,
}: {
  apiHref: string;
  csvHref: string;
  feed: FanletterAgentRankReputationEventFeed;
  filters: FanletterAgentRankLedgerPageProps["filters"];
  locale: Locale;
  ndjsonHref: string;
}) {
  const copy = getLedgerCopy(locale);
  const starLabel = filters.starId ?? (locale === "ko" ? "전체 AI 스타" : "All AI Stars");
  const readyPercent = formatPercent(
    feed.summary.oracleReadyEvents,
    feed.summary.totalEvents,
    locale,
  );
  const steps = [
    {
      Icon: Bot,
      label: "FanLetter",
      value: formatNumber(feed.summary.totalEvents, locale),
    },
    {
      Icon: AlertTriangle,
      label: "Review Queue",
      value: formatNumber(
        feed.events.filter((event) => !event.reputationSignals.oracleReady)
          .length,
        locale,
      ),
    },
    {
      Icon: Database,
      label: "Oracle Packet",
      value: readyPercent,
    },
    {
      Icon: Sparkles,
      label: "AgentRank",
      value: formatNumber(sumContextNumber(feed.events, "cpPoolTotal"), locale),
    },
  ];

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
      <div className="grid gap-0 lg:grid-cols-[1fr_24rem]">
        <div className="p-5">
          <p className="text-sm font-semibold uppercase text-zinc-600">
            {copy.investorDemo}
          </p>
          <h2 className="mt-2 break-words text-3xl font-semibold text-[#11132d]">
            {starLabel}
          </h2>
          <p className="mt-2 hidden max-w-3xl text-sm font-medium leading-6 text-slate-500 sm:block">
            {copy.investorDemoBody}
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_2rem_1fr_2rem_1fr_2rem_1fr] md:items-center">
            {steps.map(({ Icon, label, value }, index) => (
              <div className="contents" key={label}>
                <div
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                >
                  <Icon className="size-5 text-zinc-900" />
                  <p className="mt-2 text-xs font-semibold uppercase text-slate-400">
                    {label}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[#11132d]">
                    {value}
                  </p>
                </div>
                {index < steps.length - 1 ? (
                  <div className="hidden justify-center text-zinc-900 md:flex">
                    <ArrowRight className="size-5" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
        <div className="grid content-center gap-3 border-t border-zinc-200 bg-gradient-to-br from-black via-zinc-900 to-zinc-700 p-5 text-white lg:border-l lg:border-t-0">
          <MetricTile
            label={copy.oracleReady}
            value={readyPercent}
          />
          <div className="hidden gap-2 sm:grid">
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-zinc-900"
              href={apiHref}
            >
              <Database className="size-4" />
              {copy.api}
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white/12 px-3 text-sm font-semibold text-white ring-1 ring-white/15"
              href={csvHref}
            >
              <Download className="size-4" />
              {copy.csv}
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-white/12 px-3 text-sm font-semibold text-white ring-1 ring-white/15"
              href={ndjsonHref}
            >
              <Database className="size-4" />
              {copy.ndjson}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function EventCard({
  coverageAction,
  event,
  locale,
}: {
  coverageAction?: AgentRankCoverageActionContext | null;
  event: AgentRankReputationEvent;
  locale: Locale;
}) {
  const copy = getLedgerCopy(locale);
  const Icon = eventIconMap[event.type];
  const detailParams = new URLSearchParams();
  const evidencePacketParams = new URLSearchParams();
  const scoreSignals = getLedgerScoreSignals(event);
  const impactTotal =
    typeof event.context.reputationImpactTotal === "number"
      ? event.context.reputationImpactTotal
      : event.reputationSignals.creatorWeight +
        event.reputationSignals.discoveryWeight +
        event.reputationSignals.economicWeight +
        event.reputationSignals.networkWeight;
  const oracleGaps = getOracleReadinessGaps(event, locale);
  const audit = getEventAudit(event);
  const auditGaps = audit.gaps.map((gap) => getAuditGapLabel(gap, locale));
  const isCoverageMock = isCoverageMockEvent(event);
  const isPacketReady =
    event.reputationSignals.oracleReady && audit.status === "audit_ready";
  const packetStarId = event.starId ?? event.object?.id ?? null;
  const relatedStarScope = getAgentRankRelatedStarScope(event);
  const universeLabel = String(event.context.universeId ?? event.starId ?? "-");
  const graphReadyLabel = event.audit.graphReady ? copy.ready : copy.needs;
  const impactReadyLabel = event.audit.impactReady ? copy.ready : copy.needs;
  const oraclePacketLabel = isPacketReady
    ? copy.packetReady
    : copy.packetPartial;
  const nextActionLabel = getLedgerEventNextActionLabel(event, locale);

  if (event.starId) {
    detailParams.set("starId", event.starId);
  }

  if (packetStarId) {
    evidencePacketParams.set("starId", packetStarId);
  }

  if (coverageAction) {
    detailParams.set("coverageAction", coverageAction.action);
    evidencePacketParams.set("coverageAction", coverageAction.action);

    if (coverageAction.memberEmail) {
      detailParams.set("memberEmail", coverageAction.memberEmail);
      evidencePacketParams.set("memberEmail", coverageAction.memberEmail);
    }
  }

  const detailHref = `/${locale}/fanletter/agentrank/events/${encodeURIComponent(
    event.eventId,
  )}${detailParams.size ? `?${detailParams.toString()}` : ""}`;
  const evidenceHref = `/${locale}/fanletter/agentrank/events/${encodeURIComponent(
    event.eventId,
  )}/evidence${
    evidencePacketParams.size ? `?${evidencePacketParams.toString()}` : ""
  }`;

  return (
    <article className="rounded-lg border border-slate-100 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-lg border ${eventTone[event.type]}`}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-[#11132d]">
              {getEventTypeLabel(event.type, locale)}
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-500">
              {event.context.intent ?? event.sourceId}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
              isCoverageMock
                ? "border-amber-100 bg-amber-50 text-amber-700"
                : "border-emerald-100 bg-emerald-50 text-emerald-700"
            }`}
          >
            {isCoverageMock ? (
              <AlertTriangle className="size-3.5" />
            ) : (
              <ShieldCheck className="size-3.5" />
            )}
            {isCoverageMock ? copy.coverageMock : copy.productEvent}
          </span>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-[#6d28d9]">
            {event.context.source ?? event.source}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:hidden">
        <div className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            {locale === "ko" ? "현재 대상" : "Current target"}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-zinc-950">
            {getObjectLabel(event)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0 rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              {copy.nextAction}
            </p>
            <p className="mt-1 break-words text-sm font-semibold leading-5 text-zinc-950 [word-break:keep-all]">
              {nextActionLabel}
            </p>
          </div>
          <div className="min-w-0 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-emerald-700/70">
              {copy.impact}
            </p>
            <p className="mt-1 text-xl font-semibold text-emerald-900">
              {impactTotal.toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 hidden gap-3 text-sm sm:grid sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">
            {copy.actor}
          </p>
          <p className="mt-1 truncate font-semibold text-slate-700">
            {getActorLabel(event.actor)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">
            {copy.star}
          </p>
          <p className="mt-1 truncate font-semibold text-slate-700">
            {getObjectLabel(event)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">
            {copy.impact}
          </p>
          <p className="mt-1 font-semibold text-slate-700">
            {impactTotal.toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">
            {copy.schema}
          </p>
          <p className="mt-1 truncate font-semibold text-emerald-700">
            {event.schemaVersion}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">
            {copy.quality}
          </p>
          <p className="mt-1 font-semibold text-slate-700">
            {audit.qualityScore}/100
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs font-semibold">
        <span className="text-slate-400">{copy.scoreSignals}</span>
        {scoreSignals.length ? (
          scoreSignals.map((signal) => (
            <span
              className={`rounded-full px-2.5 py-1 ring-1 ${signal.tone}`}
              key={signal.label}
            >
              {signal.label} {signal.value.toFixed(1)}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-slate-50 px-2.5 py-1 text-slate-500 ring-1 ring-slate-100">
            -
          </span>
        )}
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-zinc-50 px-2.5 py-1 text-zinc-700 ring-1 ring-zinc-100 sm:hidden">
          <ArrowRight className="size-3.5 shrink-0" />
          <span className="min-w-0 truncate">{nextActionLabel}</span>
        </span>
      </div>

      {relatedStarScope.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-violet-100 bg-violet-50/70 px-3 py-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 text-[#6d28d9]">
            <Bot className="size-3.5" />
            {copy.relatedStarScope}
          </span>
          {relatedStarScope.map((relatedStarId) => (
            <span
              className="rounded-full bg-white px-2.5 py-1 font-mono text-[0.68rem] text-[#6d28d9] ring-1 ring-violet-100"
              key={relatedStarId}
            >
              {relatedStarId}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase text-slate-400">
              {copy.rankContribution}
            </p>
            <p className="font-mono text-sm font-semibold text-[#11132d]">
              {impactTotal.toFixed(1)}
            </p>
          </div>
          <div className="mt-2">
            <ScoreContributionBar signals={scoreSignals} />
          </div>
        </div>
        <div className="min-w-0 rounded-md bg-white px-3 py-2 ring-1 ring-slate-100">
          <p className="text-xs font-semibold uppercase text-slate-400">
            {copy.oracleReady}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-[#11132d]">
            {oraclePacketLabel}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {copy.quality} {audit.qualityScore}/100
          </p>
        </div>
        <div className="min-w-0 rounded-md bg-white px-3 py-2 ring-1 ring-slate-100">
          <p className="text-xs font-semibold uppercase text-slate-400">
            {copy.graphScope}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-[#11132d]">
            {relatedStarScope.length} {copy.uniqueStars}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {copy.graphReady} {graphReadyLabel} · {copy.impactReady}{" "}
            {impactReadyLabel}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
        <ReadinessPill
          gaps={oracleGaps}
          label={
            oracleGaps.length === 0
              ? `${copy.oracleReady} ${copy.ready}`
              : `${copy.oracleReady} ${copy.needs}`
          }
        />
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
            audit.status === "audit_ready"
              ? "border-violet-100 bg-violet-50 text-[#6d28d9]"
              : "border-amber-100 bg-amber-50 text-amber-700"
          }`}
        >
          <ShieldCheck className="size-3.5" />
          {getAuditStatusLabel(audit.status, locale)}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
            isPacketReady
              ? "border-cyan-100 bg-cyan-50 text-cyan-700"
              : "border-slate-100 bg-slate-50 text-slate-600"
          }`}
        >
          <Database className="size-3.5" />
          {isPacketReady ? copy.packetReady : copy.packetPartial}
        </span>
        {isCoverageMock ? (
          <span className="hidden items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-amber-700 sm:inline-flex">
            <AlertTriangle className="size-3.5" />
            {copy.coverageMockNote}
          </span>
        ) : null}
        <span className="hidden max-w-full items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-slate-500 ring-1 ring-slate-100 sm:inline-flex">
          <Clock3 className="size-3.5" />
          {formatDate(event.occurredAt, locale)}
        </span>
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-slate-500 ring-1 ring-slate-100">
          <Network className="size-3.5 shrink-0" />
          <span className="min-w-0 break-all">{universeLabel}</span>
        </span>
        <span className="hidden max-w-full items-center rounded-full bg-slate-50 px-2.5 py-1 font-mono text-[0.68rem] text-slate-500 ring-1 ring-slate-100 sm:inline-flex">
          {event.eventId.slice(0, 20)}
        </span>
        <Link
          className="hidden h-8 items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50 px-3 text-xs font-semibold text-[#6d28d9] sm:inline-flex"
          href={evidenceHref}
        >
          <Download className="size-3.5" />
          {copy.evidencePacket}
        </Link>
        <FanletterAgentRankEventQuickPanel
          buttonLabel={copy.openEvent}
          detailHref={detailHref}
          detailLabel={copy.details}
          event={event}
          evidenceHref={evidenceHref}
          evidenceLabel={copy.evidencePacket}
          locale={locale}
        />
      </div>

      <details className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
        <summary className="cursor-pointer text-[#5b21b6]">
          {copy.details}
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <div className="min-w-0">
            <p className="uppercase text-slate-400">{copy.eventId}</p>
            <p className="mt-1 break-all font-mono text-[0.68rem] text-slate-700">
              {event.eventId}
            </p>
          </div>
          <div className="min-w-0">
            <p className="uppercase text-slate-400">{copy.sourceId}</p>
            <p className="mt-1 break-all font-mono text-[0.68rem] text-slate-700">
              {event.sourceId}
            </p>
          </div>
          <div>
            <p className="uppercase text-slate-400">{copy.source}</p>
            <p className="mt-1 text-slate-700">{event.source}</p>
          </div>
          <div>
            <p className="uppercase text-slate-400">{copy.oracleNeeds}</p>
            <p className="mt-1 text-slate-700">
              {oracleGaps.length ? oracleGaps.join(", ") : copy.ready}
            </p>
          </div>
          <div className="min-w-0">
            <p className="uppercase text-slate-400">{copy.evidenceHash}</p>
            <p className="mt-1 break-all font-mono text-[0.68rem] text-slate-700">
              {audit.evidenceHash}
            </p>
          </div>
          <div>
            <p className="uppercase text-slate-400">{copy.audit}</p>
            <p className="mt-1 text-slate-700">
              {auditGaps.length ? auditGaps.join(", ") : copy.ready}
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {[
            ["Network", event.reputationSignals.networkWeight],
            ["Economic", event.reputationSignals.economicWeight],
            ["Creator", event.reputationSignals.creatorWeight],
            ["Discovery", event.reputationSignals.discoveryWeight],
          ].map(([label, value]) => (
            <div className="rounded-md bg-white px-2.5 py-2" key={label}>
              <p className="text-slate-400">{label}</p>
              <p className="mt-1 text-sm text-[#11132d]">
                {Number(value).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </details>
    </article>
  );
}

export function FanletterAgentRankLedgerPage({
  coverageAction = null,
  eventScope,
  feed,
  filters,
  locale,
}: FanletterAgentRankLedgerPageProps) {
  const copy = getLedgerCopy(locale);
  const scopeLabel = filters.starId
    ? filters.starId
    : locale === "ko"
      ? "전체 AI 스타"
      : "All AI Stars";
  const apiParams = new URLSearchParams();
  const averageQualityScore =
    typeof feed.summary.averageQualityScore === "number"
      ? feed.summary.averageQualityScore
      : feed.events.length
        ? Math.round(
            feed.events.reduce(
              (sum, event) => sum + getEventAudit(event).qualityScore,
              0,
            ) / feed.events.length,
          )
        : 0;
  const auditReadyEvents =
    typeof feed.summary.auditReadyEvents === "number"
      ? feed.summary.auditReadyEvents
      : feed.events.filter(
          (event) => getEventAudit(event).status === "audit_ready",
        ).length;
  const packetReadyEvents = feed.events.filter((event) => {
    return (
      event.reputationSignals.oracleReady &&
      getEventAudit(event).status === "audit_ready"
    );
  }).length;

  if (filters.starId) {
    apiParams.set("starId", filters.starId);
  }

  if (filters.memberEmail) {
    apiParams.set("memberEmail", filters.memberEmail);
  }

  if (filters.type) {
    apiParams.set("types", filters.type);
  }

  if (filters.scope !== "all") {
    apiParams.set("scope", filters.scope);
  }

  if (filters.readiness !== "all") {
    apiParams.set("readiness", filters.readiness);
  }

  if (filters.sort !== "latest") {
    apiParams.set("sort", filters.sort);
  }

  apiParams.set("limit", String(filters.limit));
  const csvParams = new URLSearchParams(apiParams);
  csvParams.set("format", "csv");
  const ndjsonParams = new URLSearchParams(apiParams);
  ndjsonParams.set("format", "ndjson");
  const apiHref = `/api/fanletter/agentrank/events?${apiParams.toString()}`;
  const csvHref = `/api/fanletter/agentrank/events?${csvParams.toString()}`;
  const ndjsonHref = `/api/fanletter/agentrank/events?${ndjsonParams.toString()}`;
  const reviewHref = `/${locale}/fanletter/agentrank/review?${apiParams.toString()}`;
  const reviewSnapshot = buildAgentRankReviewQueueSnapshot(feed.events);
  const reviewQueue = reviewSnapshot.queues;
  const actionCoverage = reviewSnapshot.actionCoverage;
  const scopeOptions: Array<{
    count: number;
    label: string;
    scope: AgentRankEventMockScope;
  }> = [
    {
      count: eventScope.raw.totalEvents,
      label: copy.scopeAll,
      scope: "all",
    },
    {
      count: eventScope.raw.productEvents,
      label: copy.scopeProduct,
      scope: "product",
    },
    {
      count: eventScope.raw.mockEvents,
      label: copy.scopeMock,
      scope: "mock",
    },
  ];
  const readinessOptions: Array<{
    label: string;
    readiness: AgentRankEventLedgerReadinessFilter;
  }> = [
    {
      label: copy.readinessAll,
      readiness: "all",
    },
    {
      label: copy.readinessNeedsOracle,
      readiness: "needs_oracle",
    },
    {
      label: copy.readinessOracleReady,
      readiness: "oracle_ready",
    },
    {
      label: copy.readinessPacketPartial,
      readiness: "packet_partial",
    },
    {
      label: copy.readinessPacketReady,
      readiness: "packet_ready",
    },
  ];
  const sortOptions: Array<{
    label: string;
    sort: AgentRankEventLedgerSort;
  }> = [
    {
      label: copy.sortLatest,
      sort: "latest",
    },
    {
      label: copy.sortImpactDesc,
      sort: "impact_desc",
    },
    {
      label: copy.sortQualityAsc,
      sort: "quality_asc",
    },
    {
      label: copy.sortQualityDesc,
      sort: "quality_desc",
    },
  ];

  return (
    <main className="fanletter-v2-surface min-h-screen overflow-x-hidden bg-white px-4 py-5 text-[#11132d] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full min-w-0 max-w-[92rem] flex-col gap-5">
        <FanletterActionGuide
          currentLabel={
            locale === "ko"
              ? `이벤트 장부 · ${scopeLabel}`
              : `Event ledger · ${scopeLabel}`
          }
          metrics={[
            {
              label: locale === "ko" ? "이벤트" : "Events",
              value: String(feed.summary.totalEvents ?? feed.events.length),
            },
            {
              label: locale === "ko" ? "패킷 준비" : "Packet ready",
              value: String(packetReadyEvents),
            },
          ]}
          primaryAction={{
            agentRank: {
              eventType: "creator_unlock_evaluated",
              intent: "agentrank_ledger_action_guide_review",
              source: "fanletter_agentrank",
              starId: filters.starId,
            },
            href: reviewHref,
            label:
              locale === "ko" ? "리뷰 큐 열기" : "Open review queue",
            metadata: {
              placement: "agentrank_ledger_action_guide_primary",
            },
          }}
          reputationEventLabel={
            locale === "ko" ? "검증 가능 이벤트" : "Verifiable events"
          }
          secondaryActions={[]}
          steps={[
            {
              label: locale === "ko" ? "수집" : "Collect",
              status: "done",
            },
            {
              label: locale === "ko" ? "정규화" : "Normalize",
              status: "done",
            },
            {
              label: locale === "ko" ? "검증" : "Review",
              status: packetReadyEvents > 0 ? "active" : "next",
            },
            {
              label: locale === "ko" ? "오라클 패킷" : "Oracle packet",
              status: packetReadyEvents > 0 ? "next" : "next",
            },
          ]}
          subtitle={
            locale === "ko"
              ? "AgentRank로 보낼 수 있는 이벤트와 보완이 필요한 이벤트를 먼저 확인합니다."
              : "Review which events are ready for AgentRank and which need evidence."
          }
          title={
            locale === "ko"
              ? "다음 행동: 검증 큐 확인"
              : "Next action: review the queue"
          }
        />
        <header className="hidden rounded-[1.35rem] border border-zinc-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:block">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-900"
              href={`/${locale}/fanletter/agentrank${
                filters.starId
                  ? `?starId=${encodeURIComponent(filters.starId)}`
                  : ""
              }`}
            >
              <ArrowLeft className="size-4" />
              {copy.back}
            </Link>
          </div>

          <div className="mt-7 grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase text-zinc-600">
                {copy.heroEyebrow}
              </p>
              <h1 className="mt-2 text-4xl font-semibold leading-tight text-[#11132d] sm:text-5xl">
                {copy.heroTitle}
              </h1>
              <p className="mt-4 hidden max-w-3xl text-base font-medium leading-7 text-slate-600 sm:block">
                {copy.heroBody}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <MetricTile
                label={copy.totalEvents}
                value={formatNumber(feed.summary.totalEvents, locale)}
              />
              <MetricTile
                label={copy.scopeProduct}
                value={formatNumber(eventScope.raw.productEvents, locale)}
              />
              <MetricTile
                label={copy.scopeMock}
                value={formatNumber(eventScope.raw.mockEvents, locale)}
              />
              <MetricTile
                label={copy.uniqueMembers}
                value={formatNumber(feed.summary.uniqueMembers, locale)}
              />
              <MetricTile
                label={copy.uniqueStars}
                value={formatNumber(feed.summary.uniqueStars, locale)}
              />
            </div>
          </div>
        </header>

        {coverageAction ? (
          <FanletterAgentRankCoverageActionNotice
            action={coverageAction}
            locale={locale}
          />
        ) : null}

        <LedgerOperationStatusCard
          auditReadyEvents={auditReadyEvents}
          filters={filters}
          locale={locale}
          packetReadyEvents={packetReadyEvents}
          reviewHref={reviewHref}
          totalEvents={feed.summary.totalEvents}
        />

        <div className="hidden sm:block">
          <InvestorDemoPanel
            apiHref={apiHref}
            csvHref={csvHref}
            feed={feed}
            filters={filters}
            locale={locale}
            ndjsonHref={ndjsonHref}
          />
        </div>

        <div className="hidden sm:block">
          <ReviewQueuePanel
            filters={filters}
            locale={locale}
            queue={reviewQueue}
          />
        </div>

        <div className="hidden sm:block">
          <ActionCoveragePanel
            actions={actionCoverage}
            filters={filters}
            locale={locale}
          />
        </div>

        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase text-zinc-600">
            <SlidersHorizontal className="size-4" />
            {copy.filters}
          </div>
          <details className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:hidden">
            <summary className="cursor-pointer text-sm font-semibold text-zinc-950">
              {copy.filterDrawer}
            </summary>
            <form
              action={`/${locale}/fanletter/agentrank/events`}
              className="mt-3 grid gap-3"
            >
              {coverageAction ? (
                <input
                  name="coverageAction"
                  type="hidden"
                  value={coverageAction.action}
                />
              ) : null}
              {filters.type ? (
                <input name="type" type="hidden" value={filters.type} />
              ) : null}
              {filters.memberEmail ? (
                <input
                  name="memberEmail"
                  type="hidden"
                  value={filters.memberEmail}
                />
              ) : null}
              <input name="limit" type="hidden" value={filters.limit} />
              <label className="min-w-0">
                <span className="text-xs font-semibold uppercase text-slate-400">
                  {copy.star}
                </span>
                <input
                  className="mt-1 h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-[#11132d] outline-none transition focus:border-zinc-400"
                  defaultValue={filters.starId ?? ""}
                  name="starId"
                  placeholder="legacy-star-t7v7bayl"
                />
              </label>
              <label className="min-w-0">
                <span className="text-xs font-semibold uppercase text-slate-400">
                  {copy.eventScope}
                </span>
                <select
                  className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-[#11132d] outline-none transition focus:border-zinc-400"
                  defaultValue={filters.scope}
                  name="scope"
                >
                  <option value="all">{copy.scopeAll}</option>
                  <option value="product">{copy.scopeProduct}</option>
                  <option value="mock">{copy.scopeMock}</option>
                </select>
              </label>
              <label className="min-w-0">
                <span className="text-xs font-semibold uppercase text-slate-400">
                  {copy.readinessFilter}
                </span>
                <select
                  className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-[#11132d] outline-none transition focus:border-zinc-400"
                  defaultValue={filters.readiness}
                  name="readiness"
                >
                  <option value="all">{copy.readinessAll}</option>
                  <option value="oracle_ready">{copy.readinessOracleReady}</option>
                  <option value="needs_oracle">
                    {copy.readinessNeedsOracle}
                  </option>
                  <option value="packet_ready">{copy.readinessPacketReady}</option>
                  <option value="packet_partial">
                    {copy.readinessPacketPartial}
                  </option>
                </select>
              </label>
              <label className="min-w-0">
                <span className="text-xs font-semibold uppercase text-slate-400">
                  {copy.sort}
                </span>
                <select
                  className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-[#11132d] outline-none transition focus:border-zinc-400"
                  defaultValue={filters.sort}
                  name="sort"
                >
                  <option value="latest">{copy.sortLatest}</option>
                  <option value="impact_desc">{copy.sortImpactDesc}</option>
                  <option value="quality_asc">{copy.sortQualityAsc}</option>
                  <option value="quality_desc">{copy.sortQualityDesc}</option>
                </select>
              </label>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-black px-4 text-sm font-semibold !text-white shadow-[0_14px_34px_rgba(15,23,42,0.18)]"
                type="submit"
              >
                <Search className="size-4" />
                {copy.applyFilters}
              </button>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600"
                href={`/${locale}/fanletter/agentrank/events`}
              >
                {copy.clearFilters}
              </Link>
            </form>
          </details>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
            {[
              {
                label: copy.eventScope,
                value:
                  scopeOptions.find((option) => option.scope === filters.scope)
                    ?.label ?? copy.scopeAll,
              },
              {
                label: copy.readinessFilter,
                value:
                  readinessOptions.find(
                    (option) => option.readiness === filters.readiness,
                  )?.label ?? copy.readinessAll,
              },
              {
                label: copy.sort,
                value:
                  sortOptions.find((option) => option.sort === filters.sort)
                    ?.label ?? copy.sortLatest,
              },
              {
                label: copy.filterByType,
                value: filters.type
                  ? getEventTypeLabel(filters.type, locale)
                  : copy.viewAll,
              },
            ].map((item) => (
              <div
                className="min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2"
                key={item.label}
              >
                <p className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-zinc-500">
                  {item.label}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-zinc-950">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
          <form
            action={`/${locale}/fanletter/agentrank/events`}
            className="mt-4 hidden gap-3 sm:grid lg:grid-cols-[1fr_1fr_9rem_11rem_12rem_12rem_auto_auto]"
          >
            {coverageAction ? (
              <input
                name="coverageAction"
                type="hidden"
                value={coverageAction.action}
              />
            ) : null}
            {filters.type ? (
              <input name="type" type="hidden" value={filters.type} />
            ) : null}
            <label className="min-w-0">
              <span className="text-xs font-semibold uppercase text-slate-400">
                {copy.star}
              </span>
              <input
                className="mt-1 h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-[#11132d] outline-none transition focus:border-zinc-400 focus:bg-white"
                defaultValue={filters.starId ?? ""}
                name="starId"
                placeholder="legacy-star-t7v7bayl"
              />
            </label>
            <label className="min-w-0">
              <span className="text-xs font-semibold uppercase text-slate-400">
                {copy.member}
              </span>
              <input
                className="mt-1 h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-[#11132d] outline-none transition focus:border-zinc-400 focus:bg-white"
                defaultValue={filters.memberEmail ?? ""}
                name="memberEmail"
                placeholder="member@example.com"
                type="email"
              />
            </label>
            <label className="min-w-0">
              <span className="text-xs font-semibold uppercase text-slate-400">
                {copy.limit}
              </span>
              <input
                className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-[#11132d] outline-none transition focus:border-zinc-400 focus:bg-white"
                defaultValue={filters.limit}
                max={200}
                min={10}
                name="limit"
                type="number"
              />
            </label>
            <label className="min-w-0">
              <span className="text-xs font-semibold uppercase text-slate-400">
                {copy.eventScope}
              </span>
              <select
                className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-[#11132d] outline-none transition focus:border-zinc-400 focus:bg-white"
                defaultValue={filters.scope}
                name="scope"
              >
                <option value="all">{copy.scopeAll}</option>
                <option value="product">{copy.scopeProduct}</option>
                <option value="mock">{copy.scopeMock}</option>
              </select>
            </label>
            <label className="min-w-0">
              <span className="text-xs font-semibold uppercase text-slate-400">
                {copy.readinessFilter}
              </span>
              <select
                className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-[#11132d] outline-none transition focus:border-zinc-400 focus:bg-white"
                defaultValue={filters.readiness}
                name="readiness"
              >
                <option value="all">{copy.readinessAll}</option>
                <option value="oracle_ready">{copy.readinessOracleReady}</option>
                <option value="needs_oracle">
                  {copy.readinessNeedsOracle}
                </option>
                <option value="packet_ready">{copy.readinessPacketReady}</option>
                <option value="packet_partial">
                  {copy.readinessPacketPartial}
                </option>
              </select>
            </label>
            <label className="min-w-0">
              <span className="text-xs font-semibold uppercase text-slate-400">
                {copy.sort}
              </span>
              <select
                className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-[#11132d] outline-none transition focus:border-zinc-400 focus:bg-white"
                defaultValue={filters.sort}
                name="sort"
              >
                <option value="latest">{copy.sortLatest}</option>
                <option value="impact_desc">{copy.sortImpactDesc}</option>
                <option value="quality_asc">{copy.sortQualityAsc}</option>
                <option value="quality_desc">{copy.sortQualityDesc}</option>
              </select>
            </label>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-lg bg-black px-4 text-sm font-semibold !text-white shadow-[0_14px_34px_rgba(15,23,42,0.18)]"
              type="submit"
            >
              <Search className="size-4" />
              {copy.applyFilters}
            </button>
            <Link
              className="inline-flex h-11 items-center justify-center self-end rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600"
              href={`/${locale}/fanletter/agentrank/events`}
            >
              {copy.clearFilters}
            </Link>
          </form>
          <div className="mt-4 hidden gap-2 overflow-x-auto pb-1 sm:flex">
            {scopeOptions.map((option) => {
              const isActive = filters.scope === option.scope;

              return (
                <Link
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-semibold ${
                    isActive
                      ? "bg-[#11132d] !text-white"
                      : "border border-slate-200 bg-white text-slate-600"
                  }`}
                  href={buildLedgerHref({
                    filters,
                    locale,
                    scope: option.scope,
                    type: filters.type,
                  })}
                  key={option.scope}
                >
                  {option.label}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive
                        ? "bg-white/18 !text-white"
                        : "bg-slate-50 text-slate-500"
                    }`}
                  >
                    {formatNumber(option.count, locale)}
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="mt-3 hidden gap-2 overflow-x-auto pb-1 sm:flex">
            {readinessOptions.map((option) => {
              const isActive = filters.readiness === option.readiness;

              return (
                <Link
                  className={`inline-flex h-10 shrink-0 items-center rounded-full px-3 text-sm font-semibold ${
                    isActive
                      ? "bg-emerald-600 !text-white"
                      : "border border-emerald-100 bg-emerald-50 text-emerald-700"
                  }`}
                  href={buildLedgerHref({
                    filters,
                    locale,
                    readiness: option.readiness,
                    type: filters.type,
                  })}
                  key={option.readiness}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
          <div className="mt-3 hidden gap-2 overflow-x-auto pb-1 sm:flex">
            {sortOptions.map((option) => {
              const isActive = filters.sort === option.sort;

              return (
                <Link
                  className={`inline-flex h-10 shrink-0 items-center rounded-full px-3 text-sm font-semibold ${
                    isActive
                      ? "bg-black !text-white"
                      : "border border-zinc-200 bg-zinc-50 text-zinc-700"
                  }`}
                  href={buildLedgerHref({
                    filters,
                    locale,
                    sort: option.sort,
                    type: filters.type,
                  })}
                  key={option.sort}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="hidden gap-3 sm:grid sm:grid-cols-2 xl:grid-cols-7">
          <MetricTile
            label={copy.schemaReady}
            value={formatPercent(
              feed.summary.schemaReadyEvents,
              feed.summary.totalEvents,
              locale,
            )}
          />
          <MetricTile
            label={copy.oracleReady}
            value={formatPercent(
              feed.summary.oracleReadyEvents,
              feed.summary.totalEvents,
              locale,
            )}
          />
          <MetricTile
            label={copy.evidencePacket}
            value={formatPercent(packetReadyEvents, feed.summary.totalEvents, locale)}
          />
          <MetricTile
            label={copy.auditReady}
            value={formatPercent(
              auditReadyEvents,
              feed.summary.totalEvents,
              locale,
            )}
          />
          <MetricTile
            label={copy.quality}
            value={`${formatNumber(averageQualityScore, locale)}/100`}
          />
          <MetricTile
            label={copy.networkEdges}
            value={formatNumber(feed.summary.networkEdges, locale)}
          />
          <MetricTile
            label={copy.cp}
            value={formatNumber(feed.summary.cpTotal, locale)}
          />
        </section>

        <section className="hidden rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:block">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase text-zinc-600">
                {copy.filterByType}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {copy.generated}: {formatDate(feed.generatedAt, locale)}
              </p>
            </div>
            <Link
              className={`inline-flex h-9 items-center rounded-full px-3 text-sm font-semibold ${
                filters.type
                  ? "border border-slate-200 bg-white text-slate-600"
                  : "bg-black !text-white"
              }`}
              href={buildLedgerHref({ filters, locale, type: null })}
            >
              {copy.viewAll}
            </Link>
          </div>
          <div className="mt-4 hidden gap-2 overflow-x-auto pb-1 sm:flex">
            {agentRankReputationEventTypes.map((type) => {
              const isActive = filters.type === type;
              const count = feed.summary.byType[type] ?? 0;

              return (
                <Link
                  className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-semibold ${
                    isActive
                      ? "bg-black !text-white"
                      : "border border-slate-200 bg-white text-slate-600"
                  }`}
                  href={buildLedgerHref({ filters, locale, type })}
                  key={type}
                >
                  {getEventTypeLabel(type, locale)}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      isActive
                        ? "bg-white/18 !text-white"
                        : "bg-slate-50 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4">
          {feed.events.length > 0 ? (
            feed.events.map((event) => (
              <EventCard
                coverageAction={coverageAction}
                event={event}
                key={event.eventId}
                locale={locale}
              />
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center">
              <ShieldCheck className="mx-auto size-10 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-500">
                {copy.empty}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
