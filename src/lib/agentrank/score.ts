import "server-only";

import { agentRankReputationEventSchemaVersion } from "@/lib/agentrank/event-schema";
import {
  agentRankReputationEventTypes,
  getFanletterAgentRankReputationEventFeed,
  type AgentRankActor,
  type AgentRankReputationEvent,
  type AgentRankReputationEventType,
  type FanletterAgentRankReputationEventFeed,
} from "@/lib/agentrank/reputation-events";

export type AgentRankScoreDimensionKey =
  | "network"
  | "economic"
  | "creator"
  | "discovery"
  | "trust"
  | "riskPenalty";

export type AgentRankScoreDimension = {
  description: string;
  key: AgentRankScoreDimensionKey;
  label: string;
  maxScore: number;
  rawValue: number;
  score: number;
};

export type AgentRankScoreContributor = {
  actorId: string;
  actorType: AgentRankActor["type"];
  contributionScore: number;
  cpDelta: number;
  eventCount: number;
  impactTotal: number;
  influenceDelta: number;
  label?: string | null;
  role?: string | null;
};

export type AgentRankScoreAggregate = {
  agentRankVersion: "agentrank.v0";
  confidence: number;
  dimensions: AgentRankScoreDimension[];
  formula: string;
  generatedAt: string;
  maxScore: 1000;
  readiness: {
    a2aReady: boolean;
    oracleReady: boolean;
    oracleReadyPercent: number;
    reputationLedgerReady: boolean;
    schemaReadyPercent: number;
    x402Ready: boolean;
  };
  roadmap: FanletterAgentRankReputationEventFeed["roadmap"];
  scope: {
    memberEmail: string | null;
    starId: string | null;
    universeId: string | null;
  };
  score: number;
  scoreVersion: "agentrank.score.v0";
  source: "fanletter_phase_1_score_aggregator";
  summary: {
    a2aEvents: number;
    contentEngagements: number;
    cpTotal: number;
    creatorProgressTotal: number;
    creatorUnlocks: number;
    eventCount: number;
    founderJoins: number;
    influenceTotal: number;
    networkEdges: number;
    oracleReadyEvents: number;
    referralConversions: number;
    riskEvents: number;
    schemaReadyEvents: number;
    spawnedStars: number;
    uniqueMembers: number;
    uniqueStars: number;
    x402ReadyEvents: number;
  };
  topContributors: AgentRankScoreContributor[];
};

export type GetFanletterAgentRankScoreOptions = {
  includeTypes?: AgentRankReputationEventType[];
  limit?: number;
  memberEmail?: string | null;
  starId?: string | null;
  universeId?: string | null;
};

type ScoreAccumulator = {
  a2aEvents: number;
  contentEngagements: number;
  cpTotal: number;
  creatorProgressTotal: number;
  creatorUnlocks: number;
  eventCount: number;
  founderJoins: number;
  influenceTotal: number;
  launchRevenueUsdt: number;
  networkEdges: number;
  networkWeightTotal: number;
  oracleReadyEvents: number;
  referralConversions: number;
  riskEvents: number;
  schemaReadyEvents: number;
  spawnedStars: number;
  trustWeightTotal: number;
  uniqueMembers: Set<string>;
  uniqueStars: Set<string>;
  weightTotals: Record<
    Exclude<AgentRankScoreDimensionKey, "riskPenalty" | "trust">,
    number
  >;
  x402ReadyEvents: number;
};

function normalizeId(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null;
}

function normalizeLimit(value: number | null | undefined) {
  return Math.max(1, Math.min(value ?? 120, 250));
}

function clampScore(value: number, maxScore: number) {
  return Math.max(0, Math.min(maxScore, Math.round(value)));
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

function getContextNumber(
  event: AgentRankReputationEvent,
  key: string,
) {
  const value = event.context[key];

  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getImpactTotal(event: AgentRankReputationEvent) {
  return (
    event.reputationSignals.creatorWeight +
    event.reputationSignals.discoveryWeight +
    event.reputationSignals.economicWeight +
    event.reputationSignals.networkWeight +
    getContextNumber(event, "reputationImpactTrust")
  );
}

function actorContributionKey(actor: AgentRankActor) {
  return `${actor.type}:${actor.id}`;
}

function buildDimension({
  description,
  key,
  label,
  maxScore,
  rawValue,
  score,
}: AgentRankScoreDimension) {
  return {
    description,
    key,
    label,
    maxScore,
    rawValue: roundOne(rawValue),
    score: clampScore(score, maxScore),
  } satisfies AgentRankScoreDimension;
}

function matchesUniverse(
  event: AgentRankReputationEvent,
  universeId: string | null,
) {
  if (!universeId) {
    return true;
  }

  const contextUniverseId =
    typeof event.context.universeId === "string"
      ? normalizeId(event.context.universeId)
      : null;
  const starUniverseId = event.starId
    ? `fanletter-star-universe:${normalizeId(event.starId)}`
    : null;

  return contextUniverseId === universeId || starUniverseId === universeId;
}

function buildAccumulator(events: AgentRankReputationEvent[]) {
  const accumulator: ScoreAccumulator = {
    a2aEvents: 0,
    contentEngagements: 0,
    cpTotal: 0,
    creatorProgressTotal: 0,
    creatorUnlocks: 0,
    eventCount: events.length,
    founderJoins: 0,
    influenceTotal: 0,
    launchRevenueUsdt: 0,
    networkEdges: 0,
    networkWeightTotal: 0,
    oracleReadyEvents: 0,
    referralConversions: 0,
    riskEvents: 0,
    schemaReadyEvents: 0,
    spawnedStars: 0,
    trustWeightTotal: 0,
    uniqueMembers: new Set<string>(),
    uniqueStars: new Set<string>(),
    weightTotals: {
      creator: 0,
      discovery: 0,
      economic: 0,
      network: 0,
    },
    x402ReadyEvents: 0,
  };

  for (const event of events) {
    const cpDelta = event.economicLayer.cpDelta ?? 0;
    const influenceDelta = event.economicLayer.influenceDelta ?? 0;
    const creatorProgressDelta = event.economicLayer.creatorProgressDelta ?? 0;

    accumulator.cpTotal += cpDelta;
    accumulator.creatorProgressTotal += creatorProgressDelta;
    accumulator.influenceTotal += influenceDelta;
    accumulator.launchRevenueUsdt += getContextNumber(event, "launchCostUsdt");
    accumulator.weightTotals.creator += event.reputationSignals.creatorWeight;
    accumulator.weightTotals.discovery += event.reputationSignals.discoveryWeight;
    accumulator.weightTotals.economic += event.reputationSignals.economicWeight;
    accumulator.weightTotals.network += event.reputationSignals.networkWeight;
    accumulator.networkWeightTotal += event.reputationSignals.networkWeight;
    accumulator.trustWeightTotal += getContextNumber(
      event,
      "reputationImpactTrust",
    );

    if (event.type === "founder_joined") {
      accumulator.founderJoins += 1;
    }

    if (event.type === "referral_converted") {
      accumulator.networkEdges += 1;
      accumulator.referralConversions += 1;
    }

    if (event.type === "creator_unlocked") {
      accumulator.creatorUnlocks += 1;
    }

    if (event.type === "ai_star_spawned") {
      accumulator.spawnedStars += 1;
    }

    if (event.type === "content_engaged") {
      accumulator.contentEngagements += 1;
    }

    if (event.sourceId.includes("a2a") || event.context.intent === "a2a_usage") {
      accumulator.a2aEvents += 1;
    }

    if (event.economicLayer.x402Ready) {
      accumulator.x402ReadyEvents += 1;
    }

    if (event.reputationSignals.oracleReady) {
      accumulator.oracleReadyEvents += 1;
    }

    if (event.schemaVersion === agentRankReputationEventSchemaVersion) {
      accumulator.schemaReadyEvents += 1;
    }

    if (
      !event.reputationSignals.oracleReady ||
      event.schemaVersion !== agentRankReputationEventSchemaVersion ||
      !event.sourceId
    ) {
      accumulator.riskEvents += 1;
    }

    for (const actor of [event.actor, event.object, event.subject]) {
      if (!actor) {
        continue;
      }

      if (actor.type === "member") {
        accumulator.uniqueMembers.add(actor.id);
      }

      if (actor.type === "ai_star") {
        accumulator.uniqueStars.add(actor.id);
      }
    }
  }

  return accumulator;
}

function buildTopContributors(events: AgentRankReputationEvent[]) {
  const contributors = new Map<string, AgentRankScoreContributor>();

  for (const event of events) {
    for (const actor of [event.actor, event.subject]) {
      if (!actor || actor.type === "platform") {
        continue;
      }

      const key = actorContributionKey(actor);
      const existing =
        contributors.get(key) ??
        ({
          actorId: actor.id,
          actorType: actor.type,
          contributionScore: 0,
          cpDelta: 0,
          eventCount: 0,
          impactTotal: 0,
          influenceDelta: 0,
          label: actor.label ?? null,
          role: actor.role ?? null,
        } satisfies AgentRankScoreContributor);

      existing.eventCount += 1;
      existing.impactTotal += getImpactTotal(event);
      existing.cpDelta += event.economicLayer.cpDelta ?? 0;
      existing.influenceDelta += event.economicLayer.influenceDelta ?? 0;
      existing.contributionScore = clampScore(
        existing.impactTotal * 18 +
          existing.eventCount * 3 +
          Math.max(0, existing.cpDelta) / 20 +
          Math.max(0, existing.influenceDelta) * 2,
        1000,
      );
      contributors.set(key, existing);
    }
  }

  return [...contributors.values()]
    .sort((left, right) => {
      return (
        right.contributionScore - left.contributionScore ||
        right.eventCount - left.eventCount ||
        left.actorId.localeCompare(right.actorId)
      );
    })
    .slice(0, 8)
    .map((contributor) => ({
      ...contributor,
      impactTotal: roundOne(contributor.impactTotal),
    }));
}

export function calculateAgentRankScoreAggregate({
  feed,
  memberEmail,
  starId,
  universeId,
}: {
  feed: FanletterAgentRankReputationEventFeed;
  memberEmail?: string | null;
  starId?: string | null;
  universeId?: string | null;
}): AgentRankScoreAggregate {
  const normalizedUniverseId = normalizeId(universeId);
  const scopedEvents = feed.events.filter((event) =>
    matchesUniverse(event, normalizedUniverseId),
  );
  const accumulator = buildAccumulator(scopedEvents);
  const eventCount = Math.max(1, accumulator.eventCount);
  const oracleReadyPercent = Math.round(
    (accumulator.oracleReadyEvents / eventCount) * 100,
  );
  const schemaReadyPercent = Math.round(
    (accumulator.schemaReadyEvents / eventCount) * 100,
  );
  const networkDimension = buildDimension({
    description:
      "Founder joins, referral conversions, and repeated network edges around an AI Star Universe.",
    key: "network",
    label: "Founder Network",
    maxScore: 240,
    rawValue: accumulator.weightTotals.network + accumulator.networkEdges,
    score:
      accumulator.weightTotals.network * 20 +
      accumulator.founderJoins * 5 +
      accumulator.referralConversions * 10 +
      accumulator.networkEdges * 8,
  });
  const economicDimension = buildDimension({
    description:
      "CP movement and future x402 payment revenue captured as economic reputation signals.",
    key: "economic",
    label: "Economic Activity",
    maxScore: 200,
    rawValue: accumulator.cpTotal + accumulator.launchRevenueUsdt * 100,
    score:
      accumulator.weightTotals.economic * 24 +
      Math.max(0, accumulator.cpTotal) / 18 +
      accumulator.launchRevenueUsdt * 8 +
      accumulator.x402ReadyEvents * 18,
  });
  const creatorDimension = buildDimension({
    description:
      "Creator unlocks, creator progress, and spawned AI Stars generated from the network.",
    key: "creator",
    label: "Creator Journey",
    maxScore: 180,
    rawValue:
      accumulator.weightTotals.creator +
      accumulator.creatorUnlocks +
      accumulator.spawnedStars,
    score:
      accumulator.weightTotals.creator * 22 +
      accumulator.creatorUnlocks * 18 +
      accumulator.spawnedStars * 24 +
      Math.max(0, accumulator.creatorProgressTotal) * 1.2,
  });
  const discoveryDimension = buildDimension({
    description:
      "AI Star discovery, content engagement, and growth signals that create new reputation events.",
    key: "discovery",
    label: "AI Star Discovery",
    maxScore: 160,
    rawValue: accumulator.weightTotals.discovery + accumulator.contentEngagements,
    score:
      accumulator.weightTotals.discovery * 18 +
      accumulator.contentEngagements * 4 +
      accumulator.uniqueStars.size * 4,
  });
  const trustDimension = buildDimension({
    description:
      "Oracle-ready events, schema completeness, unique participants, and traceable lineage.",
    key: "trust",
    label: "Lineage Trust",
    maxScore: 220,
    rawValue:
      accumulator.oracleReadyEvents +
      accumulator.schemaReadyEvents +
      accumulator.uniqueMembers.size +
      accumulator.uniqueStars.size,
    score:
      oracleReadyPercent * 0.9 +
      schemaReadyPercent * 0.55 +
      accumulator.uniqueMembers.size * 2.4 +
      accumulator.uniqueStars.size * 5 +
      accumulator.trustWeightTotal * 12,
  });
  const riskDimension = buildDimension({
    description:
      "Penalty for missing source IDs, non-oracle-ready events, or schema gaps.",
    key: "riskPenalty",
    label: "Risk Penalty",
    maxScore: 100,
    rawValue: accumulator.riskEvents,
    score: accumulator.riskEvents * 8,
  });
  const positiveScore =
    networkDimension.score +
    economicDimension.score +
    creatorDimension.score +
    discoveryDimension.score +
    trustDimension.score;
  const score = clampScore(positiveScore - riskDimension.score, 1000);
  const confidence = clampScore(
    schemaReadyPercent * 0.45 +
      oracleReadyPercent * 0.35 +
      Math.min(100, accumulator.eventCount * 2) * 0.2,
    100,
  );

  return {
    agentRankVersion: "agentrank.v0",
    confidence,
    dimensions: [
      networkDimension,
      economicDimension,
      creatorDimension,
      discoveryDimension,
      trustDimension,
      riskDimension,
    ],
    formula:
      "AgentRank Score = Founder Network + Economic Activity + Creator Journey + AI Star Discovery + Lineage Trust - Risk Penalty",
    generatedAt: feed.generatedAt,
    maxScore: 1000,
    readiness: {
      a2aReady: accumulator.a2aEvents > 0,
      oracleReady:
        accumulator.eventCount > 0 &&
        accumulator.oracleReadyEvents === accumulator.eventCount,
      oracleReadyPercent,
      reputationLedgerReady: accumulator.eventCount > 0,
      schemaReadyPercent,
      x402Ready: accumulator.x402ReadyEvents > 0,
    },
    roadmap: [...feed.roadmap],
    scope: {
      memberEmail: normalizeId(memberEmail),
      starId: normalizeId(starId),
      universeId: normalizedUniverseId,
    },
    score,
    scoreVersion: "agentrank.score.v0",
    source: "fanletter_phase_1_score_aggregator",
    summary: {
      a2aEvents: accumulator.a2aEvents,
      contentEngagements: accumulator.contentEngagements,
      cpTotal: accumulator.cpTotal,
      creatorProgressTotal: accumulator.creatorProgressTotal,
      creatorUnlocks: accumulator.creatorUnlocks,
      eventCount: accumulator.eventCount,
      founderJoins: accumulator.founderJoins,
      influenceTotal: accumulator.influenceTotal,
      networkEdges: accumulator.networkEdges,
      oracleReadyEvents: accumulator.oracleReadyEvents,
      referralConversions: accumulator.referralConversions,
      riskEvents: accumulator.riskEvents,
      schemaReadyEvents: accumulator.schemaReadyEvents,
      spawnedStars: accumulator.spawnedStars,
      uniqueMembers: accumulator.uniqueMembers.size,
      uniqueStars: accumulator.uniqueStars.size,
      x402ReadyEvents: accumulator.x402ReadyEvents,
    },
    topContributors: buildTopContributors(scopedEvents),
  };
}

export async function getFanletterAgentRankScoreAggregate(
  options: GetFanletterAgentRankScoreOptions = {},
) {
  const feed = await getFanletterAgentRankReputationEventFeed({
    includeTypes: options.includeTypes,
    limit: normalizeLimit(options.limit),
    memberEmail: options.memberEmail,
    starId: options.starId,
  });

  return calculateAgentRankScoreAggregate({
    feed,
    memberEmail: options.memberEmail,
    starId: options.starId,
    universeId: options.universeId,
  });
}

export function parseAgentRankScoreTypes(value: string | null) {
  if (!value) {
    return undefined;
  }

  const allowedTypes = new Set<string>(agentRankReputationEventTypes);
  const types = value
    .split(",")
    .map((type) => type.trim())
    .filter((type): type is AgentRankReputationEventType => {
      return allowedTypes.has(type);
    });

  return types.length ? types : undefined;
}
