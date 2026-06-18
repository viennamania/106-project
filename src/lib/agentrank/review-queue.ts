import "server-only";

import { sha256AgentRankPayload } from "@/lib/agentrank/integrity";
import {
  isAgentRankCoverageMockEvent,
  summarizeAgentRankEventMockScope,
} from "@/lib/agentrank/mock-events";
import {
  agentRankReputationEventTypes,
  summarizeAgentRankReputationEvents,
  type AgentRankReputationEvent,
  type AgentRankReputationEventType,
  type FanletterAgentRankReputationEventFeed,
} from "@/lib/agentrank/reputation-events";
import { calculateAgentRankScoreAggregate } from "@/lib/agentrank/score";

export const agentRankReviewQueueCategories = [
  "needs_oracle",
  "packet_ready",
  "high_impact",
  "quality_review",
] as const;

export const agentRankReviewStatuses = [
  "pending",
  "needs_enrichment",
  "packet_ready",
  "approved",
  "rejected",
] as const;

export const agentRankReviewActions = [
  "mark_needs_enrichment",
  "mark_packet_ready",
  "approve_event",
  "reject_event",
] as const;

export type AgentRankReviewQueueCategory =
  (typeof agentRankReviewQueueCategories)[number];

export type AgentRankReviewStatus = (typeof agentRankReviewStatuses)[number];

export type AgentRankReviewAction = (typeof agentRankReviewActions)[number];

export type AgentRankReviewReasonCode =
  | "audit_gap"
  | "graph_gap"
  | "impact_gap"
  | "low_quality"
  | "oracle_gap"
  | "packet_candidate";

export type AgentRankReviewQueueItem = {
  actionLabel: string;
  auditGaps: string[];
  category: AgentRankReviewQueueCategory;
  event: AgentRankReputationEvent;
  impactTotal: number;
  provenance: "mock_coverage" | "product_event";
  qualityScore: number;
  reasonCodes: AgentRankReviewReasonCode[];
  status: AgentRankReviewStatus;
};

export type AgentRankReviewQueueBucket = {
  body: string;
  category: AgentRankReviewQueueCategory;
  events: AgentRankReviewQueueItem[];
  label: string;
  total: number;
};

export type AgentRankProductActionCoverageItem = {
  covered: boolean;
  eventType: AgentRankReputationEventType;
  key:
    | "creator"
    | "discovery"
    | "founder"
    | "payment"
    | "referral"
    | "star_detail";
  label: string;
};

export type AgentRankActionCoverageGroup = {
  actions: AgentRankProductActionCoverageItem[];
  eventCount: number;
  mockEvents: number;
  productEvents: number;
  ready: number;
  total: number;
};

export type AgentRankReviewPacketDraft = {
  candidateEventIds: string[];
  evidenceHashes: string[];
  generatedAt: string;
  packetHash: string;
  packetId: string;
  productEvents: number;
  mockEvents: number;
  qualityAverage: number;
  recordType: "agentrank.oracle_packet_draft";
  readiness: {
    auditReadyEvents: number;
    graphReadyEvents: number;
    impactReadyEvents: number;
    oracleReadyEvents: number;
    totalEvents: number;
  };
  scoreImpact: {
    creator: number;
    discovery: number;
    economic: number;
    network: number;
    total: number;
  };
};

export type AgentRankScoreChangeHistoryItem = {
  deltaIfExcluded: number;
  eventId: string;
  eventType: AgentRankReputationEventType;
  fromScore: number;
  impactTotal: number;
  nextStatus: AgentRankReviewStatus;
  provenance: "mock_coverage" | "product_event";
  toScoreIfExcluded: number;
};

export type AgentRankScoreHistory = {
  coverageScore: number;
  currentScore: number;
  generatedAt: string;
  productOnlyScore: number;
  recordType: "agentrank.review_score_history";
  scoreVersion: "agentrank.score.v0";
  topChanges: AgentRankScoreChangeHistoryItem[];
};

export type AgentRankReviewQueueSnapshot = {
  actionCoverage: AgentRankProductActionCoverageItem[];
  coverageBreakdown: {
    all: AgentRankActionCoverageGroup;
    mock: AgentRankActionCoverageGroup;
    product: AgentRankActionCoverageGroup;
  };
  generatedAt: string;
  operational: {
    accessMode: "ops_investor_console";
    allowedActions: AgentRankReviewAction[];
    mockActionPersistence: true;
    statusCounts: Record<AgentRankReviewStatus, number>;
  };
  packetDraft: AgentRankReviewPacketDraft;
  queues: AgentRankReviewQueueBucket[];
  recordType: "agentrank.review_queue_snapshot";
  reviewItems: AgentRankReviewQueueItem[];
  scoreHistory: AgentRankScoreHistory;
  summary: {
    actionCoverageReady: number;
    actionCoverageTotal: number;
    highImpactEvents: number;
    lowQualityEvents: number;
    mockEvents: number;
    needsOracleEvents: number;
    packetReadyEvents: number;
    productActionCoverageReady: number;
    productEvents: number;
    totalEvents: number;
  };
};

function formatLabel(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => `${segment[0]?.toUpperCase() ?? ""}${segment.slice(1)}`)
    .join(" ");
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function readContextText(event: AgentRankReputationEvent, keys: string[]) {
  return keys
    .map((key) => event.context[key])
    .filter((value) => value !== null && value !== undefined)
    .join(" ")
    .toLowerCase();
}

function getEventTimestamp(event: AgentRankReputationEvent) {
  const timestamp = new Date(event.occurredAt).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function buildFeedFromEvents(
  events: AgentRankReputationEvent[],
): FanletterAgentRankReputationEventFeed {
  return {
    events,
    generatedAt: new Date().toISOString(),
    roadmap: [
      "AI Star Discovery",
      "Founder Network",
      "x402 Economy",
      "Agent Transaction Graph",
      "AgentRank",
      "Agent Reputation Oracle",
    ],
    summary: summarizeAgentRankReputationEvents(events),
  };
}

function getAverageQuality(events: AgentRankReputationEvent[]) {
  if (events.length === 0) {
    return 0;
  }

  return Math.round(
    events.reduce((sum, event) => sum + getAgentRankReviewAudit(event).qualityScore, 0) /
      events.length,
  );
}

export function getAgentRankEventImpactTotal(event: AgentRankReputationEvent) {
  return (
    event.reputationSignals.creatorWeight +
    event.reputationSignals.discoveryWeight +
    event.reputationSignals.economicWeight +
    event.reputationSignals.networkWeight
  );
}

export function getAgentRankReviewAudit(event: AgentRankReputationEvent) {
  const qualityScore =
    typeof event.audit?.qualityScore === "number" &&
    Number.isFinite(event.audit.qualityScore)
      ? event.audit.qualityScore
      : 0;
  const gaps = Array.isArray(event.audit?.gaps) ? event.audit.gaps : [];

  return {
    evidenceHash: event.audit?.evidenceHash ?? event.eventId.replace(/^agentrank_/, ""),
    gaps,
    qualityScore,
    status: event.audit?.status ?? "partial",
  };
}

export function isAgentRankReviewPacketReady(event: AgentRankReputationEvent) {
  return (
    event.reputationSignals.oracleReady &&
    event.audit.graphReady &&
    event.audit.impactReady &&
    getAgentRankReviewAudit(event).status === "audit_ready"
  );
}

export function getAgentRankReviewReasonCodes(
  event: AgentRankReputationEvent,
): AgentRankReviewReasonCode[] {
  const audit = getAgentRankReviewAudit(event);
  const reasons = new Set<AgentRankReviewReasonCode>();

  if (!event.reputationSignals.oracleReady) {
    reasons.add("oracle_gap");
  }

  if (audit.gaps.length > 0 || audit.status !== "audit_ready") {
    reasons.add("audit_gap");
  }

  if (!event.audit.graphReady) {
    reasons.add("graph_gap");
  }

  if (!event.audit.impactReady) {
    reasons.add("impact_gap");
  }

  if (audit.qualityScore < 90) {
    reasons.add("low_quality");
  }

  if (isAgentRankReviewPacketReady(event)) {
    reasons.add("packet_candidate");
  }

  return Array.from(reasons);
}

export function getAgentRankReviewStatus(
  event: AgentRankReputationEvent,
): AgentRankReviewStatus {
  const reasonCodes = getAgentRankReviewReasonCodes(event);

  if (
    reasonCodes.includes("oracle_gap") ||
    reasonCodes.includes("audit_gap") ||
    reasonCodes.includes("graph_gap") ||
    reasonCodes.includes("impact_gap") ||
    reasonCodes.includes("low_quality")
  ) {
    return "needs_enrichment";
  }

  if (reasonCodes.includes("packet_candidate")) {
    return "packet_ready";
  }

  return "pending";
}

export function getAgentRankReviewNextActionLabel(
  event: AgentRankReputationEvent,
) {
  const audit = getAgentRankReviewAudit(event);

  if (audit.gaps.length > 0) {
    return `Enrich ${audit.gaps.slice(0, 2).map(formatLabel).join(", ")}`;
  }

  if (!event.reputationSignals.oracleReady) {
    return "Verify Oracle upstream signal";
  }

  if (!event.audit.graphReady) {
    return "Connect transaction graph edge";
  }

  if (!event.audit.impactReady) {
    return "Verify score impact signal";
  }

  if (audit.qualityScore < 90) {
    return "Review low quality score";
  }

  return "Review Oracle Packet candidate";
}

function buildReviewQueueItems(events: AgentRankReputationEvent[]) {
  return events.map((event) => {
    const audit = getAgentRankReviewAudit(event);
    const reasonCodes = getAgentRankReviewReasonCodes(event);
    const category: AgentRankReviewQueueCategory =
      reasonCodes.includes("oracle_gap") ||
      reasonCodes.includes("audit_gap") ||
      reasonCodes.includes("graph_gap") ||
      reasonCodes.includes("impact_gap")
        ? "needs_oracle"
        : isAgentRankReviewPacketReady(event)
          ? "packet_ready"
          : audit.qualityScore < 90
            ? "quality_review"
            : "high_impact";

    return {
      actionLabel: getAgentRankReviewNextActionLabel(event),
      auditGaps: audit.gaps,
      category,
      event,
      impactTotal: getAgentRankEventImpactTotal(event),
      provenance: isAgentRankCoverageMockEvent(event)
        ? "mock_coverage"
        : "product_event",
      qualityScore: audit.qualityScore,
      reasonCodes,
      status: getAgentRankReviewStatus(event),
    } satisfies AgentRankReviewQueueItem;
  });
}

function buildActionCoverageGroup(
  events: AgentRankReputationEvent[],
): AgentRankActionCoverageGroup {
  const actions = buildAgentRankProductActionCoverage(events);
  const scope = summarizeAgentRankEventMockScope(events);

  return {
    actions,
    eventCount: events.length,
    mockEvents: scope.mockEvents,
    productEvents: scope.productEvents,
    ready: actions.filter((item) => item.covered).length,
    total: actions.length,
  };
}

function buildPacketDraft(items: AgentRankReviewQueueItem[]) {
  const candidates = items
    .filter((item) => item.status === "packet_ready")
    .sort((left, right) => {
      return (
        right.impactTotal - left.impactTotal ||
        right.qualityScore - left.qualityScore ||
        getEventTimestamp(right.event) - getEventTimestamp(left.event)
      );
    })
    .slice(0, 12);
  const candidateEvents = candidates.map((item) => item.event);
  const generatedAt = new Date().toISOString();
  const scoreImpact = candidateEvents.reduce(
    (total, event) => {
      total.creator += event.reputationSignals.creatorWeight;
      total.discovery += event.reputationSignals.discoveryWeight;
      total.economic += event.reputationSignals.economicWeight;
      total.network += event.reputationSignals.networkWeight;
      total.total += getAgentRankEventImpactTotal(event);

      return total;
    },
    {
      creator: 0,
      discovery: 0,
      economic: 0,
      network: 0,
      total: 0,
    },
  );
  const packetSeed = {
    candidateEventIds: candidates.map((item) => item.event.eventId),
    evidenceHashes: candidateEvents.map((event) => event.audit.evidenceHash),
    generatedAt,
    recordType: "agentrank.oracle_packet_draft",
  };
  const packetHash = sha256AgentRankPayload(packetSeed);

  return {
    candidateEventIds: packetSeed.candidateEventIds,
    evidenceHashes: packetSeed.evidenceHashes,
    generatedAt,
    packetHash,
    packetId: `oracle_packet_${packetHash.slice(0, 24)}`,
    productEvents: candidates.filter((item) => item.provenance === "product_event")
      .length,
    mockEvents: candidates.filter((item) => item.provenance === "mock_coverage")
      .length,
    qualityAverage: getAverageQuality(candidateEvents),
    recordType: "agentrank.oracle_packet_draft",
    readiness: {
      auditReadyEvents: candidateEvents.filter(
        (event) => event.audit.status === "audit_ready",
      ).length,
      graphReadyEvents: candidateEvents.filter((event) => event.audit.graphReady)
        .length,
      impactReadyEvents: candidateEvents.filter((event) => event.audit.impactReady)
        .length,
      oracleReadyEvents: candidateEvents.filter(
        (event) => event.reputationSignals.oracleReady,
      ).length,
      totalEvents: candidateEvents.length,
    },
    scoreImpact: {
      creator: roundOne(scoreImpact.creator),
      discovery: roundOne(scoreImpact.discovery),
      economic: roundOne(scoreImpact.economic),
      network: roundOne(scoreImpact.network),
      total: roundOne(scoreImpact.total),
    },
  } satisfies AgentRankReviewPacketDraft;
}

function getScoreForEvents(events: AgentRankReputationEvent[]) {
  return calculateAgentRankScoreAggregate({
    eventScope: {
      excludedMockEvents: 0,
      includeMockEvents: true,
      scoringMode: "coverage_including_mock",
    },
    feed: buildFeedFromEvents(events),
  }).score;
}

function buildScoreHistory(items: AgentRankReviewQueueItem[]) {
  const events = items.map((item) => item.event);
  const productEvents = items
    .filter((item) => item.provenance === "product_event")
    .map((item) => item.event);
  const currentScore = getScoreForEvents(events);
  const productOnlyScore = getScoreForEvents(productEvents);
  const topChanges = [...items]
    .sort((left, right) => {
      return (
        right.impactTotal - left.impactTotal ||
        getEventTimestamp(right.event) - getEventTimestamp(left.event)
      );
    })
    .slice(0, 8)
    .map((item) => {
      const toScoreIfExcluded = getScoreForEvents(
        events.filter((event) => event.eventId !== item.event.eventId),
      );

      return {
        deltaIfExcluded: currentScore - toScoreIfExcluded,
        eventId: item.event.eventId,
        eventType: item.event.type,
        fromScore: currentScore,
        impactTotal: roundOne(item.impactTotal),
        nextStatus:
          item.status === "packet_ready" ? "approved" : item.status,
        provenance: item.provenance,
        toScoreIfExcluded,
      } satisfies AgentRankScoreChangeHistoryItem;
    });

  return {
    coverageScore: currentScore,
    currentScore,
    generatedAt: new Date().toISOString(),
    productOnlyScore,
    recordType: "agentrank.review_score_history",
    scoreVersion: "agentrank.score.v0",
    topChanges,
  } satisfies AgentRankScoreHistory;
}

export function buildAgentRankReviewQueueSnapshot(
  events: AgentRankReputationEvent[],
): AgentRankReviewQueueSnapshot {
  const items = buildReviewQueueItems(events);
  const byImpact = [...items].sort((left, right) => {
    return (
      right.impactTotal - left.impactTotal ||
      getEventTimestamp(right.event) - getEventTimestamp(left.event) ||
      left.event.eventId.localeCompare(right.event.eventId)
    );
  });
  const byQuality = [...items].sort((left, right) => {
    return (
      left.qualityScore - right.qualityScore ||
      getEventTimestamp(right.event) - getEventTimestamp(left.event) ||
      left.event.eventId.localeCompare(right.event.eventId)
    );
  });
  const needsOracle = byQuality.filter((item) => {
    return (
      item.reasonCodes.includes("oracle_gap") ||
      item.reasonCodes.includes("audit_gap") ||
      item.reasonCodes.includes("graph_gap") ||
      item.reasonCodes.includes("impact_gap")
    );
  });
  const packetReady = byImpact.filter(
    (item) => item.status === "packet_ready",
  );
  const highImpact = byImpact.filter((item) => item.impactTotal >= 2);
  const qualityReview = byQuality.filter((item) => item.qualityScore < 90);
  const productEvents = events.filter(
    (event) => !isAgentRankCoverageMockEvent(event),
  );
  const mockEvents = events.filter(isAgentRankCoverageMockEvent);
  const coverageBreakdown = {
    all: buildActionCoverageGroup(events),
    mock: buildActionCoverageGroup(mockEvents),
    product: buildActionCoverageGroup(productEvents),
  };
  const statusCounts = agentRankReviewStatuses.reduce(
    (counts, status) => {
      counts[status] = items.filter((item) => item.status === status).length;

      return counts;
    },
    {
      approved: 0,
      needs_enrichment: 0,
      packet_ready: 0,
      pending: 0,
      rejected: 0,
    } satisfies Record<AgentRankReviewStatus, number>,
  );
  const buckets = [
    {
      body: "Events requiring Oracle, graph, audit, or impact enrichment.",
      category: "needs_oracle",
      events: needsOracle.slice(0, 5),
      label: "Oracle Gap Queue",
      total: needsOracle.length,
    },
    {
      body: "Events ready to package for an Agent Reputation Oracle.",
      category: "packet_ready",
      events: packetReady.slice(0, 5),
      label: "Packet Candidate Queue",
      total: packetReady.length,
    },
    {
      body: "Events with the strongest AgentRank score contribution.",
      category: "high_impact",
      events: highImpact.slice(0, 5),
      label: "High-impact Queue",
      total: highImpact.length,
    },
    {
      body: "Events that should be checked by quality score and required fields.",
      category: "quality_review",
      events: qualityReview.slice(0, 5),
      label: "Quality Review Queue",
      total: qualityReview.length,
    },
  ] satisfies AgentRankReviewQueueBucket[];

  return {
    actionCoverage: coverageBreakdown.all.actions,
    coverageBreakdown,
    generatedAt: new Date().toISOString(),
    operational: {
      accessMode: "ops_investor_console",
      allowedActions: [...agentRankReviewActions],
      mockActionPersistence: true,
      statusCounts,
    },
    packetDraft: buildPacketDraft(items),
    queues: buckets,
    recordType: "agentrank.review_queue_snapshot",
    reviewItems: items,
    scoreHistory: buildScoreHistory(items),
    summary: {
      actionCoverageReady: coverageBreakdown.all.ready,
      actionCoverageTotal: coverageBreakdown.all.total,
      highImpactEvents: highImpact.length,
      lowQualityEvents: qualityReview.length,
      mockEvents: mockEvents.length,
      needsOracleEvents: needsOracle.length,
      packetReadyEvents: packetReady.length,
      productActionCoverageReady: coverageBreakdown.product.ready,
      productEvents: productEvents.length,
      totalEvents: events.length,
    },
  };
}

export function buildAgentRankProductActionCoverage(
  events: AgentRankReputationEvent[],
): AgentRankProductActionCoverageItem[] {
  const hasEventType = (type: AgentRankReputationEventType) => {
    return events.some((event) => event.type === type);
  };
  const hasIntent = (patterns: string[]) => {
    return events.some((event) => {
      const haystack = [
        event.source,
        event.sourceId,
        readContextText(event, ["intent", "source", "placement"]),
      ]
        .join(" ")
        .toLowerCase();

      return patterns.some((pattern) => haystack.includes(pattern));
    });
  };

  const items: AgentRankProductActionCoverageItem[] = [
    {
      covered: hasEventType("ai_star_discovered"),
      eventType: "ai_star_discovered",
      key: "discovery",
      label: "AI Star Discovery",
    },
    {
      covered:
        hasEventType("content_engaged") &&
        hasIntent(["star_detail", "profile", "vlog", "content", "home"]),
      eventType: "content_engaged",
      key: "star_detail",
      label: "AI Star Detail / Content",
    },
    {
      covered: hasEventType("founder_joined"),
      eventType: "founder_joined",
      key: "founder",
      label: "Founder Join",
    },
    {
      covered:
        hasEventType("referral_code_created") ||
        hasEventType("referral_shared") ||
        hasEventType("referral_converted"),
      eventType: "referral_converted",
      key: "referral",
      label: "Referral Code / Share / Conversion",
    },
    {
      covered:
        hasEventType("creator_unlock_evaluated") ||
        hasEventType("creator_unlocked") ||
        hasEventType("ai_star_spawned"),
      eventType: "creator_unlocked",
      key: "creator",
      label: "Creator Unlock / Spawn",
    },
    {
      covered:
        hasEventType("x402_mock_payment_intent") ||
        hasEventType("cp_pool_generated"),
      eventType: "x402_mock_payment_intent",
      key: "payment",
      label: "x402 Mock / CP Pool",
    },
  ];

  return items.filter((item) =>
    agentRankReputationEventTypes.includes(item.eventType),
  );
}

export function normalizeAgentRankReviewAction(
  value: unknown,
): AgentRankReviewAction | null {
  return typeof value === "string" &&
    agentRankReviewActions.includes(value as AgentRankReviewAction)
    ? (value as AgentRankReviewAction)
    : null;
}

export function getAgentRankReviewStatusForAction(
  action: AgentRankReviewAction,
): AgentRankReviewStatus {
  if (action === "approve_event") {
    return "approved";
  }

  if (action === "reject_event") {
    return "rejected";
  }

  if (action === "mark_packet_ready") {
    return "packet_ready";
  }

  return "needs_enrichment";
}
