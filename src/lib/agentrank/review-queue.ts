import {
  agentRankReputationEventTypes,
  type AgentRankReputationEvent,
  type AgentRankReputationEventType,
} from "@/lib/agentrank/reputation-events";

export const agentRankReviewQueueCategories = [
  "needs_oracle",
  "packet_ready",
  "high_impact",
  "quality_review",
] as const;

export type AgentRankReviewQueueCategory =
  (typeof agentRankReviewQueueCategories)[number];

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
  qualityScore: number;
  reasonCodes: AgentRankReviewReasonCode[];
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

export type AgentRankReviewQueueSnapshot = {
  actionCoverage: AgentRankProductActionCoverageItem[];
  generatedAt: string;
  queues: AgentRankReviewQueueBucket[];
  summary: {
    actionCoverageReady: number;
    actionCoverageTotal: number;
    highImpactEvents: number;
    lowQualityEvents: number;
    needsOracleEvents: number;
    packetReadyEvents: number;
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

export function buildAgentRankReviewQueueSnapshot(
  events: AgentRankReputationEvent[],
): AgentRankReviewQueueSnapshot {
  const items = events.map((event) => {
    const audit = getAgentRankReviewAudit(event);
    const reasonCodes = getAgentRankReviewReasonCodes(event);
    const category: AgentRankReviewQueueCategory = reasonCodes.includes("oracle_gap") ||
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
      qualityScore: audit.qualityScore,
      reasonCodes,
    } satisfies AgentRankReviewQueueItem;
  });
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
  const packetReady = byImpact.filter((item) =>
    item.reasonCodes.includes("packet_candidate"),
  );
  const highImpact = byImpact.filter((item) => item.impactTotal >= 2);
  const qualityReview = byQuality.filter((item) => item.qualityScore < 90);
  const actionCoverage = buildAgentRankProductActionCoverage(events);
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
    actionCoverage,
    generatedAt: new Date().toISOString(),
    queues: buckets,
    summary: {
      actionCoverageReady: actionCoverage.filter((item) => item.covered).length,
      actionCoverageTotal: actionCoverage.length,
      highImpactEvents: highImpact.length,
      lowQualityEvents: qualityReview.length,
      needsOracleEvents: needsOracle.length,
      packetReadyEvents: packetReady.length,
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
        hasEventType("referral_converted"),
      eventType: "referral_converted",
      key: "referral",
      label: "Referral Code / Conversion",
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
