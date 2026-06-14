import "server-only";

import { buildAgentRankCoverageEventFeed } from "@/lib/agentrank/coverage-event-feed";
import { agentRankInteractionSources } from "@/lib/agentrank/interaction-events";
import {
  agentRankReputationEventTypes,
  getFanletterAgentRankReputationEventFeed,
  type AgentRankReputationEvent,
  type FanletterAgentRankReputationEventFeed,
  type GetFanletterAgentRankReputationEventsOptions,
} from "@/lib/agentrank/reputation-events";
import {
  countAgentRankCoverageMockEvents,
  filterAgentRankReputationEventFeedForScoring,
} from "@/lib/agentrank/mock-events";
import {
  calculateAgentRankScoreAggregate,
  type AgentRankScoreAggregate,
} from "@/lib/agentrank/score";

export type AgentRankErsComponentKey =
  | "revenue"
  | "uniqueCustomers"
  | "retention"
  | "a2aUsage"
  | "lineageTrust"
  | "riskPenalty";

export type AgentRankErsComponent = {
  description: string;
  key: AgentRankErsComponentKey;
  label: string;
  maxScore: number;
  rawValue: number;
  score: number;
};

export type AgentRankEconomicReputationScore = {
  components: AgentRankErsComponent[];
  formula: string;
  generatedAt: string;
  maxScore: 1000;
  readiness: {
    a2aReady: boolean;
    oracleReady: boolean;
    reputationLedgerReady: boolean;
    x402Ready: boolean;
  };
  score: number;
  source: "fanletter_phase_1_adapter";
  summary: {
    cpPoolGeneratedEvents: number;
    cpPoolGeneratedTotal: number;
    cpTotal: number;
    eventCount: number;
    networkEdges: number;
    oracleReadyEvents: number;
    spawnedStars: number;
    uniqueMembers: number;
    uniqueStars: number;
  };
};

export type FanletterAgentRankInvestorSnapshot = {
  ers: AgentRankEconomicReputationScore;
  eventFeed: FanletterAgentRankReputationEventFeed;
  generatedAt: string;
  positioning: {
    headline: "From PageRank to AgentRank";
    mission: "FanLetter indexes economic trust.";
    phase: "FanLetter is Phase 1 of AgentRank.";
  };
  scoreAggregate: AgentRankScoreAggregate;
};

export type GetFanletterAgentRankInvestorSnapshotOptions =
  GetFanletterAgentRankReputationEventsOptions & {
    coverageProbe?: boolean;
    includeMockEvents?: boolean;
  };

function clampScore(value: number, maxScore: number) {
  return Math.max(0, Math.min(maxScore, Math.round(value)));
}

function countEvents(
  events: AgentRankReputationEvent[],
  type: AgentRankReputationEvent["type"],
) {
  return events.filter((event) => event.type === type).length;
}

function countA2AUsageEvents(events: AgentRankReputationEvent[]) {
  return events.filter(
    (event) => event.sourceId.includes("a2a") || event.context.intent === "a2a_usage",
  ).length;
}

function getRepeatedMemberSignals(events: AgentRankReputationEvent[]) {
  const eventsByMember = new Map<string, number>();

  for (const event of events) {
    for (const actor of [event.actor, event.subject]) {
      if (actor?.type !== "member") {
        continue;
      }

      eventsByMember.set(actor.id, (eventsByMember.get(actor.id) ?? 0) + 1);
    }
  }

  return [...eventsByMember.values()].filter((eventCount) => eventCount >= 2)
    .length;
}

function sumContextNumber(
  events: AgentRankReputationEvent[],
  key: string,
) {
  return events.reduce((sum, event) => {
    const value = event.context[key];

    return sum + (typeof value === "number" && Number.isFinite(value) ? value : 0);
  }, 0);
}

function buildComponent({
  description,
  key,
  label,
  maxScore,
  rawValue,
  score,
}: AgentRankErsComponent) {
  return {
    description,
    key,
    label,
    maxScore,
    rawValue,
    score: clampScore(score, maxScore),
  };
}

export function calculateAgentRankEconomicReputationScore(
  feed: FanletterAgentRankReputationEventFeed,
): AgentRankEconomicReputationScore {
  const { events, summary } = feed;
  const spawnedStars = countEvents(events, "ai_star_spawned");
  const cpPoolGeneratedEvents = countEvents(events, "cp_pool_generated");
  const founderJoins = countEvents(events, "founder_joined");
  const referralConversions = countEvents(events, "referral_converted");
  const repeatedMembers = getRepeatedMemberSignals(events);
  const launchRevenueUsdt = sumContextNumber(events, "launchCostUsdt");
  const cpPoolGeneratedTotal = sumContextNumber(events, "cpPoolTotal");
  const cpTotal = Math.max(0, summary.cpTotal);
  const x402ReadyEvents = events.filter(
    (event) => event.economicLayer.x402Ready,
  ).length;
  const a2aUsageEvents = countA2AUsageEvents(events);
  const riskEvents = events.filter((event) => {
    return !event.reputationSignals.oracleReady || event.sourceId.length === 0;
  }).length;
  const revenueComponent = buildComponent({
    description:
      "CP generation and future x402 payment revenue converted into economic activity weight.",
    key: "revenue",
    label: "Revenue",
    maxScore: 220,
    rawValue: cpTotal + cpPoolGeneratedTotal + launchRevenueUsdt * 100,
    score:
      cpTotal / 18 +
      cpPoolGeneratedTotal / 35 +
      cpPoolGeneratedEvents * 10 +
      launchRevenueUsdt * 8,
  });
  const customerComponent = buildComponent({
    description:
      "Unique members participating as founders, referrers, creators, or reward recipients.",
    key: "uniqueCustomers",
    label: "Unique Customers",
    maxScore: 170,
    rawValue: summary.uniqueMembers,
    score: summary.uniqueMembers * 5.5,
  });
  const retentionComponent = buildComponent({
    description:
      "Repeated member actions across founder joins, referral conversions, and CP rewards.",
    key: "retention",
    label: "Retention",
    maxScore: 150,
    rawValue: repeatedMembers,
    score: repeatedMembers * 12 + founderJoins * 1.5,
  });
  const a2aComponent = buildComponent({
    description:
      "Mock and future agent-to-agent usage generated by MiZi and the x402 economy.",
    key: "a2aUsage",
    label: "A2A Usage",
    maxScore: 130,
    rawValue: a2aUsageEvents,
    score: a2aUsageEvents * 18,
  });
  const lineageComponent = buildComponent({
    description:
      "Founder Network edges, AI Star lineage, and spawned Star Universe expansion.",
    key: "lineageTrust",
    label: "Lineage Trust",
    maxScore: 230,
    rawValue: summary.networkEdges + spawnedStars + summary.uniqueStars,
    score:
      summary.networkEdges * 4.5 +
      referralConversions * 3 +
      spawnedStars * 18 +
      summary.uniqueStars * 3,
  });
  const riskComponent = buildComponent({
    description:
      "Penalty for events that are not yet oracle-ready or cannot be deterministically traced.",
    key: "riskPenalty",
    label: "Risk Penalty",
    maxScore: 100,
    rawValue: riskEvents,
    score: riskEvents * 8,
  });
  const positiveScore =
    revenueComponent.score +
    customerComponent.score +
    retentionComponent.score +
    a2aComponent.score +
    lineageComponent.score;
  const score = clampScore(positiveScore - riskComponent.score, 1000);

  return {
    components: [
      revenueComponent,
      customerComponent,
      retentionComponent,
      a2aComponent,
      lineageComponent,
      riskComponent,
    ],
    formula:
      "ERS = Revenue + Unique Customers + Retention + A2A Usage + Lineage Trust - Risk Penalty",
    generatedAt: feed.generatedAt,
    maxScore: 1000,
    readiness: {
      a2aReady: a2aUsageEvents > 0,
      oracleReady: summary.oracleReadyEvents === summary.totalEvents,
      reputationLedgerReady: summary.totalEvents > 0,
      x402Ready: x402ReadyEvents > 0,
    },
    score,
    source: "fanletter_phase_1_adapter",
    summary: {
      cpPoolGeneratedEvents,
      cpPoolGeneratedTotal,
      cpTotal: summary.cpTotal,
      eventCount: summary.totalEvents,
      networkEdges: summary.networkEdges,
      oracleReadyEvents: summary.oracleReadyEvents,
      spawnedStars,
      uniqueMembers: summary.uniqueMembers,
      uniqueStars: summary.uniqueStars,
    },
  };
}

export async function getFanletterAgentRankInvestorSnapshot(
  options: GetFanletterAgentRankInvestorSnapshotOptions = {},
): Promise<FanletterAgentRankInvestorSnapshot> {
  const baseEventFeed = await getFanletterAgentRankReputationEventFeed({
    limit: options.limit ?? 120,
    memberEmail: options.memberEmail,
    starId: options.starId,
    includeTypes: options.includeTypes,
  });
  const eventFeed = options.coverageProbe
    ? await buildAgentRankCoverageEventFeed({
        baseFeed: baseEventFeed,
        memberEmail: options.memberEmail ?? null,
        missingSources: agentRankInteractionSources.filter((source) => {
          return !baseEventFeed.events.some(
            (event) => event.context.source === source,
          );
        }),
        missingTypes: (options.includeTypes ?? agentRankReputationEventTypes).filter(
          (type) => (baseEventFeed.summary.byType[type] ?? 0) === 0,
        ),
        starId: options.starId ?? null,
      })
    : baseEventFeed;
  const includeMockEvents = options.includeMockEvents === true;
  const scoreFeed = filterAgentRankReputationEventFeedForScoring(eventFeed, {
    includeMockEvents,
  });
  const ers = calculateAgentRankEconomicReputationScore(scoreFeed);
  const scoreAggregate = calculateAgentRankScoreAggregate({
    eventScope: {
      excludedMockEvents: includeMockEvents
        ? 0
        : countAgentRankCoverageMockEvents(eventFeed.events),
      includeMockEvents,
      scoringMode: includeMockEvents
        ? "coverage_including_mock"
        : "product_events",
    },
    feed: scoreFeed,
    memberEmail: options.memberEmail,
    starId: options.starId,
  });
  const generatedAt = new Date().toISOString();

  return {
    ers,
    eventFeed,
    generatedAt,
    positioning: {
      headline: "From PageRank to AgentRank",
      mission: "FanLetter indexes economic trust.",
      phase: "FanLetter is Phase 1 of AgentRank.",
    },
    scoreAggregate,
  };
}
