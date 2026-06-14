import "server-only";

import { agentRankInteractionSources } from "@/lib/agentrank/interaction-events";
import type { AgentRankInteractionSource } from "@/lib/agentrank/interaction-events";
import type { AgentRankEconomicReputationScore } from "@/lib/agentrank/ers";
import {
  agentRankReputationEventTypes,
  type AgentRankReputationEventType,
  type FanletterAgentRankReputationEventFeed,
} from "@/lib/agentrank/reputation-events";

export type AgentRankCoverageEventItem = {
  count: number;
  covered: boolean;
  layer: "creator" | "discovery" | "economy" | "network";
  type: AgentRankReputationEventType;
};

export type AgentRankCoverageSourceItem = {
  count: number;
  covered: boolean;
  source: AgentRankInteractionSource;
};

export type AgentRankCoverageSnapshot = {
  eventTypeCoveragePercent: number;
  eventTypes: AgentRankCoverageEventItem[];
  gaps: string[];
  interactionSourceCoveragePercent: number;
  oracleCoveragePercent: number;
  phase1QualityScore: number;
  readiness: Pick<
    AgentRankEconomicReputationScore["readiness"],
    "a2aReady" | "x402Ready"
  >;
  schemaCoveragePercent: number;
  sources: AgentRankCoverageSourceItem[];
  totals: {
    coveredEventTypes: number;
    coveredInteractionSources: number;
    eventTypes: number;
    interactionSources: number;
    oracleReadyEvents: number;
    schemaReadyEvents: number;
    totalEvents: number;
  };
};

const eventLayerMap = {
  ai_star_discovered: "discovery",
  ai_star_spawned: "creator",
  content_engaged: "discovery",
  cp_earned: "economy",
  cp_pool_generated: "economy",
  creator_unlock_evaluated: "creator",
  creator_unlocked: "creator",
  founder_joined: "network",
  referral_code_created: "network",
  referral_converted: "network",
  source_universe_selected: "network",
  universe_growth: "network",
  x402_mock_payment_intent: "economy",
} satisfies Record<AgentRankReputationEventType, AgentRankCoverageEventItem["layer"]>;

function percent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function readInteractionSource(value: unknown): AgentRankInteractionSource | null {
  return typeof value === "string" &&
    agentRankInteractionSources.includes(value as AgentRankInteractionSource)
    ? (value as AgentRankInteractionSource)
    : null;
}

export function buildAgentRankCoverageSnapshot(
  feed: FanletterAgentRankReputationEventFeed,
  readiness: AgentRankEconomicReputationScore["readiness"],
): AgentRankCoverageSnapshot {
  const eventTypes = agentRankReputationEventTypes.map((type) => {
    const count = feed.summary.byType[type] ?? 0;

    return {
      count,
      covered: count > 0,
      layer: eventLayerMap[type],
      type,
    };
  });
  const sourceCounts = new Map<AgentRankInteractionSource, number>();

  for (const event of feed.events) {
    const source = readInteractionSource(event.context.source);

    if (!source) {
      continue;
    }

    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }

  const sources = agentRankInteractionSources.map((source) => {
    const count = sourceCounts.get(source) ?? 0;

    return {
      count,
      covered: count > 0,
      source,
    };
  });
  const coveredEventTypes = eventTypes.filter((item) => item.covered).length;
  const coveredInteractionSources = sources.filter((item) => item.covered).length;
  const eventTypeCoveragePercent = percent(
    coveredEventTypes,
    eventTypes.length,
  );
  const interactionSourceCoveragePercent = percent(
    coveredInteractionSources,
    sources.length,
  );
  const oracleCoveragePercent = percent(
    feed.summary.oracleReadyEvents,
    feed.summary.totalEvents,
  );
  const schemaCoveragePercent = percent(
    feed.summary.schemaReadyEvents,
    feed.summary.totalEvents,
  );
  const missingEventTypes = eventTypes
    .filter((item) => !item.covered)
    .map((item) => item.type);
  const missingSources = sources
    .filter((item) => !item.covered)
    .map((item) => item.source);
  const gaps = [
    ...missingEventTypes.slice(0, 4).map((type) => `missing_event:${type}`),
    ...missingSources.slice(0, 4).map((source) => `missing_source:${source}`),
  ];

  if (!readiness.x402Ready) {
    gaps.push("pending:x402_economy");
  }

  if (!readiness.a2aReady) {
    gaps.push("pending:a2a_usage");
  }

  const futureReadinessBonus =
    (readiness.x402Ready ? 5 : 0) + (readiness.a2aReady ? 5 : 0);
  const phase1QualityScore = Math.round(
    eventTypeCoveragePercent * 0.4 +
      interactionSourceCoveragePercent * 0.2 +
      oracleCoveragePercent * 0.2 +
      schemaCoveragePercent * 0.2 +
      futureReadinessBonus,
  );

  return {
    eventTypeCoveragePercent,
    eventTypes,
    gaps: gaps.slice(0, 10),
    interactionSourceCoveragePercent,
    oracleCoveragePercent,
    phase1QualityScore: Math.max(0, Math.min(100, phase1QualityScore)),
    readiness: {
      a2aReady: readiness.a2aReady,
      x402Ready: readiness.x402Ready,
    },
    schemaCoveragePercent,
    sources,
    totals: {
      coveredEventTypes,
      coveredInteractionSources,
      eventTypes: eventTypes.length,
      interactionSources: sources.length,
      oracleReadyEvents: feed.summary.oracleReadyEvents,
      schemaReadyEvents: feed.summary.schemaReadyEvents,
      totalEvents: feed.summary.totalEvents,
    },
  };
}
