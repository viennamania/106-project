import {
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
    ["summary", "founderJoins", "Founder Joins", score.summary.founderJoins, "", ""],
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

function buildAgentRankOraclePacket(score: AgentRankScoreAggregate) {
  return {
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
    issuedAt: new Date().toISOString(),
    packetVersion: "agentrank.oracle_packet.v0",
    readiness: score.readiness,
    roadmap: score.roadmap,
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
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const score = await getFanletterAgentRankScoreAggregate({
      includeTypes: parseAgentRankScoreTypes(url.searchParams.get("types")),
      limit: normalizeLimit(url.searchParams.get("limit")),
      memberEmail: normalizeParam(url.searchParams.get("memberEmail")),
      starId: normalizeParam(url.searchParams.get("starId")),
      universeId: normalizeParam(url.searchParams.get("universeId")),
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
      const packet = buildAgentRankOraclePacket(score);
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
