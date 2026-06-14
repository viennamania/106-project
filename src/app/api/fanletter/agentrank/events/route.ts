import {
  agentRankReputationEventTypes,
  getFanletterAgentRankReputationEventFeed,
  type AgentRankReputationEvent,
  type AgentRankReputationEventType,
} from "@/lib/agentrank/reputation-events";

function normalizeParam(value: string | null) {
  return value?.trim() || null;
}

function normalizeLimit(value: string | null) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseIncludeTypes(value: string | null) {
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

function escapeCsvValue(value: string | number | boolean | null | undefined) {
  const normalized = value == null ? "" : String(value);

  if (!/[",\n\r]/.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replaceAll('"', '""')}"`;
}

function getImpactTotal(event: AgentRankReputationEvent) {
  return (
    event.reputationSignals.creatorWeight +
    event.reputationSignals.discoveryWeight +
    event.reputationSignals.economicWeight +
    event.reputationSignals.networkWeight
  );
}

function getContextNumber(event: AgentRankReputationEvent, key: string) {
  const value = event.context[key];

  return typeof value === "number" && Number.isFinite(value) ? value : "";
}

function getContextString(event: AgentRankReputationEvent, key: string) {
  const value = event.context[key];

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return "";
}

function getScoreSignals(event: AgentRankReputationEvent) {
  return [
    {
      label: "Founder Network",
      value: event.reputationSignals.networkWeight,
    },
    {
      label: "Economic Activity",
      value: event.reputationSignals.economicWeight,
    },
    {
      label: "Creator Journey",
      value: event.reputationSignals.creatorWeight,
    },
    {
      label: "AI Star Discovery",
      value: event.reputationSignals.discoveryWeight,
    },
  ]
    .filter((signal) => signal.value > 0)
    .sort(
      (left, right) =>
        right.value - left.value || left.label.localeCompare(right.label),
    );
}

function getEventAudit(event: AgentRankReputationEvent) {
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

function serializeEventFeedCsv(events: AgentRankReputationEvent[]) {
  const headers = [
    "eventId",
    "occurredAt",
    "type",
    "starId",
    "actorType",
    "actorId",
    "actorRole",
    "objectType",
    "objectId",
    "source",
    "sourceId",
    "intent",
    "cpDelta",
    "influenceDelta",
    "creatorProgressDelta",
    "networkWeight",
    "economicWeight",
    "creatorWeight",
    "discoveryWeight",
    "impactTotal",
    "primaryScoreSignal",
    "scoreSignals",
    "oracleReady",
    "x402Ready",
    "paymentStatus",
    "cpPoolTotal",
    "allocatedCp",
    "unallocatedCp",
    "recipientCount",
    "launchCostUsdt",
    "sourceUniverseId",
    "sourceStarId",
    "sourceStarName",
    "spawnedStarId",
    "spawnedStarName",
    "schemaVersion",
    "auditStatus",
    "qualityScore",
    "evidenceHash",
    "auditGaps",
  ];
  const rows = events.map((event) => {
    const audit = getEventAudit(event);
    const scoreSignals = getScoreSignals(event);

    return [
      event.eventId,
      event.occurredAt,
      event.type,
      event.starId,
      event.actor.type,
      event.actor.id,
      event.actor.role,
      event.object?.type,
      event.object?.id,
      event.source,
      event.sourceId,
      event.context.intent,
      event.economicLayer.cpDelta,
      event.economicLayer.influenceDelta,
      event.economicLayer.creatorProgressDelta,
      event.reputationSignals.networkWeight,
      event.reputationSignals.economicWeight,
      event.reputationSignals.creatorWeight,
      event.reputationSignals.discoveryWeight,
      getImpactTotal(event).toFixed(2),
      scoreSignals[0]?.label ?? "",
      scoreSignals
        .map((signal) => `${signal.label}:${signal.value.toFixed(2)}`)
        .join("|"),
      event.reputationSignals.oracleReady,
      event.economicLayer.x402Ready,
      getContextString(event, "paymentStatus"),
      getContextNumber(event, "cpPoolTotal"),
      getContextNumber(event, "allocatedCp"),
      getContextNumber(event, "unallocatedCp"),
      getContextNumber(event, "recipientCount"),
      getContextNumber(event, "launchCostUsdt"),
      getContextString(event, "universeId"),
      getContextString(event, "sourceStarId"),
      getContextString(event, "sourceStarName"),
      getContextString(event, "spawnedStarId"),
      getContextString(event, "spawnedStarName"),
      event.schemaVersion,
      audit.status,
      audit.qualityScore,
      audit.evidenceHash,
      audit.gaps.join("|"),
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");
}

function serializeEventFeedNdjson(events: AgentRankReputationEvent[]) {
  return `${events
    .map((event, index) =>
      JSON.stringify({
        event,
        recordType: "agentrank.reputation_event",
        sequence: index + 1,
      }),
    )
    .join("\n")}\n`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const feed = await getFanletterAgentRankReputationEventFeed({
      includeTypes: parseIncludeTypes(url.searchParams.get("types")),
      limit: normalizeLimit(url.searchParams.get("limit")),
      memberEmail: normalizeParam(url.searchParams.get("memberEmail")),
      starId: normalizeParam(url.searchParams.get("starId")),
    });

    if (url.searchParams.get("format") === "csv") {
      const csv = serializeEventFeedCsv(feed.events);
      const filename = `fanletter-agentrank-events-${Date.now()}.csv`;

      return new Response(csv, {
        headers: {
          "content-disposition": `attachment; filename="${filename}"`,
          "content-type": "text/csv; charset=utf-8",
        },
      });
    }

    if (url.searchParams.get("format") === "ndjson") {
      const ndjson = serializeEventFeedNdjson(feed.events);
      const filename = `fanletter-agentrank-events-${Date.now()}.ndjson`;

      return new Response(ndjson, {
        headers: {
          "content-disposition": `attachment; filename="${filename}"`,
          "content-type": "application/x-ndjson; charset=utf-8",
        },
      });
    }

    return Response.json(feed);
  } catch (error) {
    console.error("AgentRank event feed failed", error);

    return Response.json(
      {
        error: "AgentRank reputation events could not be loaded.",
      },
      {
        status: 500,
      },
    );
  }
}
