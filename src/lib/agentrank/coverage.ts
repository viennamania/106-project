import "server-only";

import { buildAgentRankContractSnapshot } from "@/lib/agentrank/contract";
import type { AgentRankContractSnapshot } from "@/lib/agentrank/contract";
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

export type AgentRankCoverageFactoryLayer = {
  coveragePercent: number;
  coveredEventTypes: number;
  eventTypes: number;
  layer: AgentRankCoverageEventItem["layer"];
  missingEventTypes: AgentRankReputationEventType[];
  oracleReadyEvents: number;
  totalEvents: number;
};

export type AgentRankCoverageSnapshot = {
  contract: AgentRankContractSnapshot;
  contractValidationPercent: number;
  eventTypeCoveragePercent: number;
  eventTypes: AgentRankCoverageEventItem[];
  factoryManifest: {
    agentRankCompatible: boolean;
    economicTrustInputs: AgentRankCoverageEventItem["layer"][];
    layers: AgentRankCoverageFactoryLayer[];
    phase: "fanletter_phase_1";
    recordType: "agentrank.reputation_event_factory.v1";
  };
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
  creator_social_connected: "creator",
  founder_joined: "network",
  referral_code_created: "network",
  referral_shared: "network",
  referral_converted: "network",
  source_universe_selected: "network",
  universe_growth: "network",
  x402_mock_payment_intent: "economy",
} satisfies Record<AgentRankReputationEventType, AgentRankCoverageEventItem["layer"]>;

const factoryLayerOrder = [
  "discovery",
  "network",
  "creator",
  "economy",
] satisfies AgentRankCoverageEventItem["layer"][];

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
  const contract = buildAgentRankContractSnapshot(feed.events);
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
  const factoryLayers = factoryLayerOrder.map((layer) => {
    const layerEventTypes = eventTypes.filter((item) => item.layer === layer);
    const layerEventTypeNames = layerEventTypes.map((item) => item.type);
    const layerEvents = feed.events.filter((event) =>
      layerEventTypeNames.includes(event.type),
    );
    const layerCoveredEventTypes = layerEventTypes.filter(
      (item) => item.covered,
    ).length;

    return {
      coveragePercent: percent(layerCoveredEventTypes, layerEventTypes.length),
      coveredEventTypes: layerCoveredEventTypes,
      eventTypes: layerEventTypes.length,
      layer,
      missingEventTypes: layerEventTypes
        .filter((item) => !item.covered)
        .map((item) => item.type),
      oracleReadyEvents: layerEvents.filter(
        (event) => event.reputationSignals.oracleReady,
      ).length,
      totalEvents: layerEvents.length,
    };
  });
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
    eventTypeCoveragePercent * 0.28 +
      interactionSourceCoveragePercent * 0.17 +
      oracleCoveragePercent * 0.2 +
      schemaCoveragePercent * 0.15 +
      contract.validationPercent * 0.2 +
      futureReadinessBonus,
  );

  return {
    contract,
    contractValidationPercent: contract.validationPercent,
    eventTypeCoveragePercent,
    eventTypes,
    factoryManifest: {
      agentRankCompatible:
        schemaCoveragePercent >= 90 &&
        oracleCoveragePercent >= 50 &&
        coveredEventTypes >= Math.ceil(eventTypes.length * 0.7),
      economicTrustInputs: [...factoryLayerOrder],
      layers: factoryLayers,
      phase: "fanletter_phase_1",
      recordType: "agentrank.reputation_event_factory.v1",
    },
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
