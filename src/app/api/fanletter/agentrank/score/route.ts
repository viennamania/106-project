import { sha256AgentRankPayload } from "@/lib/agentrank/integrity";
import {
  type AgentRankReputationEvent,
} from "@/lib/agentrank/reputation-events";
import { filterAgentRankReputationEventFeedForScoring } from "@/lib/agentrank/mock-events";
import {
  getFanletterAgentRankScoreEventFeed,
  getFanletterAgentRankScoreAggregate,
  parseAgentRankScoreTypes,
  type AgentRankScoreAggregate,
} from "@/lib/agentrank/score";

function normalizeParam(value: string | null) {
  return value?.trim() || null;
}

function normalizeLimit(value: string | null) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeBoolean(value: string | null) {
  return value === "1" || value === "true" || value === "yes";
}

function escapeCsvValue(value: string | number | boolean | null | undefined) {
  const normalized = value == null ? "" : String(value);

  if (!/[",\n\r]/.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replaceAll('"', '""')}"`;
}

function serializeRowsCsv(
  rows: Array<Array<string | number | boolean | null | undefined>>,
) {
  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

function serializeAgentRankScoreCsv(score: AgentRankScoreAggregate) {
  const overviewRows = [
    ["section", "key", "label", "value", "maxValue", "description"],
    ["overview", "score", "AgentRank Score", score.score, score.maxScore, score.formula],
    ["overview", "confidence", "Score Confidence", score.confidence, 100, ""],
    [
      "overview",
      "scoringMode",
      "Scoring Mode",
      score.eventScope.scoringMode,
      "",
      "",
    ],
    [
      "overview",
      "excludedMockEvents",
      "Excluded Mock Events",
      score.eventScope.excludedMockEvents,
      "",
      "",
    ],
    [
      "readiness",
      "schemaReadyPercent",
      "Schema Ready",
      score.readiness.schemaReadyPercent,
      100,
      "",
    ],
    [
      "readiness",
      "oracleReadyPercent",
      "Oracle Ready",
      score.readiness.oracleReadyPercent,
      100,
      "",
    ],
    [
      "readiness",
      "auditReadyPercent",
      "Audit Ready",
      score.readiness.auditReadyPercent,
      100,
      "",
    ],
    [
      "readiness",
      "eventQualityPercent",
      "Event Quality",
      score.readiness.eventQualityPercent,
      100,
      "",
    ],
    ...score.dimensions.map((dimension) => [
      "dimension",
      dimension.key,
      dimension.label,
      dimension.score,
      dimension.maxScore,
      dimension.description,
    ]),
    ["summary", "eventCount", "Events", score.summary.eventCount, "", ""],
    ["summary", "founderJoins", "Joins", score.summary.founderJoins, "", ""],
    [
      "summary",
      "referralConversions",
      "Referral Conversions",
      score.summary.referralConversions,
      "",
      "",
    ],
    ["summary", "networkEdges", "Network Edges", score.summary.networkEdges, "", ""],
    ["summary", "cpTotal", "CP Total", score.summary.cpTotal, "", ""],
    [
      "summary",
      "cpPoolGeneratedTotal",
      "CP Pool Generated",
      score.summary.cpPoolGeneratedTotal,
      "",
      "",
    ],
    ["summary", "spawnedStars", "Spawned Stars", score.summary.spawnedStars, "", ""],
    ["summary", "x402ReadyEvents", "x402 Ready Events", score.summary.x402ReadyEvents, "", ""],
    ...score.topContributors.map((contributor) => [
      "contributor",
      contributor.actorId,
      contributor.label || contributor.actorType,
      contributor.contributionScore,
      1000,
      `events=${contributor.eventCount};cp=${contributor.cpDelta};influence=${contributor.influenceDelta}`,
    ]),
  ];

  return serializeRowsCsv(overviewRows);
}

function buildAgentRankOraclePacket(
  score: AgentRankScoreAggregate,
  events: AgentRankReputationEvent[],
) {
  const evidenceEvents = events.slice(0, 24);
  const evidenceHashes = evidenceEvents.map((event) => event.audit.evidenceHash);
  const evidenceRootPayload = {
    dimensions: score.dimensions.map((dimension) => ({
      key: dimension.key,
      maxScore: dimension.maxScore,
      rawValue: dimension.rawValue,
      score: dimension.score,
    })),
    evidenceHashes,
    scope: score.scope,
    score: {
      confidence: score.confidence,
      maxScore: score.maxScore,
      value: score.score,
    },
    scoreVersion: score.scoreVersion,
    summary: {
      cpPoolGeneratedTotal: score.summary.cpPoolGeneratedTotal,
      cpTotal: score.summary.cpTotal,
      excludedMockEvents: score.eventScope.excludedMockEvents,
      eventCount: score.summary.eventCount,
      founderJoins: score.summary.founderJoins,
      networkEdges: score.summary.networkEdges,
      referralConversions: score.summary.referralConversions,
      spawnedStars: score.summary.spawnedStars,
      uniqueMembers: score.summary.uniqueMembers,
      uniqueStars: score.summary.uniqueStars,
      x402ReadyEvents: score.summary.x402ReadyEvents,
    },
  };
  const evidenceRoot = sha256AgentRankPayload(evidenceRootPayload);
  const issuedAt = new Date().toISOString();

  const packet = {
    agentRankVersion: score.agentRankVersion,
    attestations: {
      a2aReady: score.readiness.a2aReady,
      auditReady: score.readiness.auditReady,
      oracleReady: score.readiness.oracleReady,
      reputationLedgerReady: score.readiness.reputationLedgerReady,
      schemaReadyPercent: score.readiness.schemaReadyPercent,
      x402Ready: score.readiness.x402Ready,
    },
    dimensions: score.dimensions.map((dimension) => ({
      key: dimension.key,
      label: dimension.label,
      maxScore: dimension.maxScore,
      rawValue: dimension.rawValue,
      score: dimension.score,
    })),
    generatedAt: score.generatedAt,
    evidence: {
      eventCount: events.length,
      evidenceHashes,
      latestEventAt: events[0]?.occurredAt ?? null,
      sampleEvents: evidenceEvents.map((event) => ({
        auditStatus: event.audit.status,
        eventId: event.eventId,
        evidenceHash: event.audit.evidenceHash,
        occurredAt: event.occurredAt,
        oracleReady: event.reputationSignals.oracleReady,
        qualityScore: event.audit.qualityScore,
        schemaVersion: event.schemaVersion,
        sourceId: event.sourceId,
        type: event.type,
      })),
    },
    integrity: {
      canonicalization: "json-stable-v0",
      evidenceRoot,
      hashAlgorithm: "sha256",
    },
    issuedAt,
    packetVersion: "agentrank.oracle_packet.v0",
    readiness: score.readiness,
    roadmap: score.roadmap,
    eventScope: score.eventScope,
    score: {
      confidence: score.confidence,
      formula: score.formula,
      maxScore: score.maxScore,
      value: score.score,
    },
    scope: score.scope,
    scoreVersion: score.scoreVersion,
    source: score.source,
    summary: {
      cpPoolGeneratedTotal: score.summary.cpPoolGeneratedTotal,
      cpTotal: score.summary.cpTotal,
      excludedMockEvents: score.eventScope.excludedMockEvents,
      eventCount: score.summary.eventCount,
      founderJoins: score.summary.founderJoins,
      networkEdges: score.summary.networkEdges,
      referralConversions: score.summary.referralConversions,
      spawnedStars: score.summary.spawnedStars,
      uniqueMembers: score.summary.uniqueMembers,
      uniqueStars: score.summary.uniqueStars,
      x402ReadyEvents: score.summary.x402ReadyEvents,
    },
    topContributors: score.topContributors.map((contributor) => ({
      actorId: contributor.actorId,
      actorType: contributor.actorType,
      contributionScore: contributor.contributionScore,
      eventCount: contributor.eventCount,
      label: contributor.label,
      role: contributor.role,
    })),
  };

  return {
    ...packet,
    integrity: {
      ...packet.integrity,
      packetHash: sha256AgentRankPayload(packet),
    },
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeTypes = parseAgentRankScoreTypes(url.searchParams.get("types"));
  const limit = normalizeLimit(url.searchParams.get("limit"));
  const memberEmail = normalizeParam(url.searchParams.get("memberEmail"));
  const starId = normalizeParam(url.searchParams.get("starId"));
  const universeId = normalizeParam(url.searchParams.get("universeId"));
  const includeMockEvents = normalizeBoolean(url.searchParams.get("includeMock"));
  const coverageProbe = normalizeBoolean(url.searchParams.get("coverageProbe"));

  try {
    const score = await getFanletterAgentRankScoreAggregate({
      coverageProbe,
      includeMockEvents,
      includeTypes,
      limit,
      memberEmail,
      starId,
      universeId,
    });

    if (url.searchParams.get("format") === "csv") {
      const csv = serializeAgentRankScoreCsv(score);
      const filename = `fanletter-agentrank-score-${Date.now()}.csv`;

      return new Response(csv, {
        headers: {
          "content-disposition": `attachment; filename="${filename}"`,
          "content-type": "text/csv; charset=utf-8",
        },
      });
    }

    if (url.searchParams.get("format") === "oracle") {
      const feed = await getFanletterAgentRankScoreEventFeed({
        coverageProbe,
        includeTypes,
        limit,
        memberEmail,
        starId,
      });
      const scoreFeed = filterAgentRankReputationEventFeedForScoring(feed, {
        includeMockEvents,
      });
      const packet = buildAgentRankOraclePacket(score, scoreFeed.events);
      const filename = `fanletter-agentrank-oracle-${Date.now()}.json`;

      return Response.json(packet, {
        headers: {
          "content-disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return Response.json(score);
  } catch (error) {
    console.error("AgentRank score aggregation failed", error);

    return Response.json(
      {
        error: "AgentRank score could not be calculated.",
      },
      {
        status: 500,
      },
    );
  }
}
