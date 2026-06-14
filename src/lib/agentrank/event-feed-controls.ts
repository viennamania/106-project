import "server-only";

import {
  summarizeAgentRankReputationEvents,
  type AgentRankReputationEvent,
  type FanletterAgentRankReputationEventFeed,
} from "@/lib/agentrank/reputation-events";

export const agentRankEventLedgerReadinessFilters = [
  "all",
  "oracle_ready",
  "needs_oracle",
  "packet_ready",
  "packet_partial",
] as const;

export type AgentRankEventLedgerReadinessFilter =
  (typeof agentRankEventLedgerReadinessFilters)[number];

export const agentRankEventLedgerSorts = [
  "latest",
  "impact_desc",
  "quality_asc",
  "quality_desc",
] as const;

export type AgentRankEventLedgerSort =
  (typeof agentRankEventLedgerSorts)[number];

function isOneOf<T extends readonly string[]>(
  allowed: T,
  value: string | null | undefined,
): value is T[number] {
  return Boolean(value && allowed.includes(value));
}

export function normalizeAgentRankEventLedgerReadinessFilter(
  value: string | null | undefined,
): AgentRankEventLedgerReadinessFilter {
  return isOneOf(agentRankEventLedgerReadinessFilters, value) ? value : "all";
}

export function normalizeAgentRankEventLedgerSort(
  value: string | null | undefined,
): AgentRankEventLedgerSort {
  return isOneOf(agentRankEventLedgerSorts, value) ? value : "latest";
}

export function getAgentRankEventImpactTotal(event: AgentRankReputationEvent) {
  return (
    event.reputationSignals.creatorWeight +
    event.reputationSignals.discoveryWeight +
    event.reputationSignals.economicWeight +
    event.reputationSignals.networkWeight
  );
}

export function isAgentRankEventPacketReady(event: AgentRankReputationEvent) {
  return (
    event.reputationSignals.oracleReady &&
    event.audit.status === "audit_ready"
  );
}

export function isAgentRankEventOracleReady(event: AgentRankReputationEvent) {
  return (
    event.reputationSignals.oracleReady &&
    event.audit.status === "audit_ready" &&
    event.audit.gaps.length === 0
  );
}

function getEventTimestamp(event: AgentRankReputationEvent) {
  const timestamp = new Date(event.occurredAt).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function filterAgentRankEventsByReadiness(
  events: AgentRankReputationEvent[],
  readiness: AgentRankEventLedgerReadinessFilter,
) {
  if (readiness === "oracle_ready") {
    return events.filter(isAgentRankEventOracleReady);
  }

  if (readiness === "needs_oracle") {
    return events.filter((event) => !isAgentRankEventOracleReady(event));
  }

  if (readiness === "packet_ready") {
    return events.filter(isAgentRankEventPacketReady);
  }

  if (readiness === "packet_partial") {
    return events.filter((event) => !isAgentRankEventPacketReady(event));
  }

  return events;
}

export function sortAgentRankEvents(
  events: AgentRankReputationEvent[],
  sort: AgentRankEventLedgerSort,
) {
  const sorted = [...events];

  if (sort === "impact_desc") {
    sorted.sort((left, right) => {
      return (
        getAgentRankEventImpactTotal(right) -
          getAgentRankEventImpactTotal(left) ||
        getEventTimestamp(right) - getEventTimestamp(left) ||
        left.eventId.localeCompare(right.eventId)
      );
    });

    return sorted;
  }

  if (sort === "quality_asc") {
    sorted.sort((left, right) => {
      return (
        left.audit.qualityScore - right.audit.qualityScore ||
        getEventTimestamp(right) - getEventTimestamp(left) ||
        left.eventId.localeCompare(right.eventId)
      );
    });

    return sorted;
  }

  if (sort === "quality_desc") {
    sorted.sort((left, right) => {
      return (
        right.audit.qualityScore - left.audit.qualityScore ||
        getEventTimestamp(right) - getEventTimestamp(left) ||
        left.eventId.localeCompare(right.eventId)
      );
    });

    return sorted;
  }

  sorted.sort((left, right) => {
    return (
      getEventTimestamp(right) - getEventTimestamp(left) ||
      left.eventId.localeCompare(right.eventId)
    );
  });

  return sorted;
}

export function applyAgentRankEventLedgerControls(
  feed: FanletterAgentRankReputationEventFeed,
  {
    limit,
    readiness,
    sort,
  }: {
    limit?: number;
    readiness: AgentRankEventLedgerReadinessFilter;
    sort: AgentRankEventLedgerSort;
  },
) {
  const filtered = filterAgentRankEventsByReadiness(feed.events, readiness);
  const sorted = sortAgentRankEvents(filtered, sort);
  const events =
    typeof limit === "number" && Number.isFinite(limit)
      ? sorted.slice(0, Math.max(1, limit))
      : sorted;

  return {
    ...feed,
    events,
    summary: {
      ...summarizeAgentRankReputationEvents(events),
      generatedAt: feed.summary.generatedAt,
    },
  } satisfies FanletterAgentRankReputationEventFeed;
}
