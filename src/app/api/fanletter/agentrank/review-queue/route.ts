import {
  getFanletterAgentRankReputationEventFeed,
  type AgentRankReputationEvent,
} from "@/lib/agentrank/reputation-events";
import {
  filterAgentRankReputationEventFeedByMockScope,
  normalizeAgentRankEventMockScope,
  summarizeAgentRankEventMockScope,
} from "@/lib/agentrank/mock-events";
import {
  buildAgentRankReviewQueueSnapshot,
  type AgentRankReviewQueueItem,
} from "@/lib/agentrank/review-queue";

function normalizeParam(value: string | null) {
  return value?.trim() || null;
}

function normalizeLimit(value: string | null) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? Math.max(10, Math.min(parsed, 240)) : 120;
}

function escapeCsvValue(value: string | number | boolean | null | undefined) {
  const normalized = value == null ? "" : String(value);

  if (!/[",\n\r]/.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replaceAll('"', '""')}"`;
}

function getActorLabel(event: AgentRankReputationEvent) {
  return event.actor.label ?? event.actor.id;
}

function flattenReviewQueueItems(
  snapshot: ReturnType<typeof buildAgentRankReviewQueueSnapshot>,
) {
  return snapshot.reviewItems;
}

function serializeReviewQueueCsv(items: AgentRankReviewQueueItem[]) {
  const headers = [
    "category",
    "eventId",
    "occurredAt",
    "type",
    "starId",
    "actorId",
    "actorLabel",
    "source",
    "sourceId",
    "impactTotal",
    "qualityScore",
    "reasonCodes",
    "auditGaps",
    "actionLabel",
    "oracleReady",
    "graphReady",
    "impactReady",
    "provenance",
    "schemaVersion",
    "status",
  ];
  const rows = items.map((item) => [
    item.category,
    item.event.eventId,
    item.event.occurredAt,
    item.event.type,
    item.event.starId,
    item.event.actor.id,
    getActorLabel(item.event),
    item.event.source,
    item.event.sourceId,
    item.impactTotal.toFixed(2),
    item.qualityScore,
    item.reasonCodes.join("|"),
    item.auditGaps.join("|"),
    item.actionLabel,
    item.event.reputationSignals.oracleReady,
    item.event.audit.graphReady,
    item.event.audit.impactReady,
    item.provenance,
    item.event.schemaVersion,
    item.status,
  ]);

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");
}

function serializeReviewQueueNdjson(items: AgentRankReviewQueueItem[]) {
  return `${items
    .map((item, index) =>
      JSON.stringify({
        actionLabel: item.actionLabel,
        auditGaps: item.auditGaps,
        category: item.category,
        event: item.event,
        impactTotal: item.impactTotal,
        provenance: item.provenance,
        qualityScore: item.qualityScore,
        reasonCodes: item.reasonCodes,
        recordType: "agentrank.review_queue_item",
        sequence: index + 1,
        status: item.status,
      }),
    )
    .join("\n")}\n`;
}

function getReviewQueueHeaders(
  snapshot: ReturnType<typeof buildAgentRankReviewQueueSnapshot>,
) {
  return {
    "x-agentrank-action-coverage-ready": String(
      snapshot.summary.actionCoverageReady,
    ),
    "x-agentrank-high-impact-events": String(
      snapshot.summary.highImpactEvents,
    ),
    "x-agentrank-needs-oracle-events": String(
      snapshot.summary.needsOracleEvents,
    ),
    "x-agentrank-packet-ready-events": String(
      snapshot.summary.packetReadyEvents,
    ),
    "x-agentrank-product-action-coverage-ready": String(
      snapshot.summary.productActionCoverageReady,
    ),
    "x-agentrank-product-events": String(snapshot.summary.productEvents),
    "x-agentrank-record-count": String(snapshot.summary.totalEvents),
    "x-agentrank-record-type": "agentrank.review_queue",
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const scope = normalizeAgentRankEventMockScope(
      url.searchParams.get("scope"),
    );
    const limit = normalizeLimit(url.searchParams.get("limit"));
    const rawFeed = await getFanletterAgentRankReputationEventFeed({
      limit,
      memberEmail: normalizeParam(url.searchParams.get("memberEmail")),
      starId: normalizeParam(url.searchParams.get("starId")),
    });
    const scopedFeed = filterAgentRankReputationEventFeedByMockScope(
      rawFeed,
      scope,
    );
    const reviewQueue = buildAgentRankReviewQueueSnapshot(scopedFeed.events);
    const rawScope = summarizeAgentRankEventMockScope(rawFeed.events);
    const scopedScope = summarizeAgentRankEventMockScope(scopedFeed.events);
    const scopeHeaders = {
      "x-agentrank-event-scope": scope,
      "x-agentrank-mock-events": String(scopedScope.mockEvents),
      "x-agentrank-product-events": String(scopedScope.productEvents),
      "x-agentrank-raw-mock-events": String(rawScope.mockEvents),
      "x-agentrank-raw-product-events": String(rawScope.productEvents),
    };
    const items = flattenReviewQueueItems(reviewQueue);

    if (url.searchParams.get("format") === "packet") {
      return Response.json(reviewQueue.packetDraft, {
        headers: {
          "x-agentrank-packet-hash": reviewQueue.packetDraft.packetHash,
          "x-agentrank-packet-id": reviewQueue.packetDraft.packetId,
          "x-agentrank-record-type": reviewQueue.packetDraft.recordType,
          ...scopeHeaders,
        },
      });
    }

    if (url.searchParams.get("format") === "score-history") {
      return Response.json(reviewQueue.scoreHistory, {
        headers: {
          "x-agentrank-record-type": reviewQueue.scoreHistory.recordType,
          "x-agentrank-score-current": String(
            reviewQueue.scoreHistory.currentScore,
          ),
          "x-agentrank-score-product-only": String(
            reviewQueue.scoreHistory.productOnlyScore,
          ),
          ...scopeHeaders,
        },
      });
    }

    if (url.searchParams.get("format") === "csv") {
      const csv = serializeReviewQueueCsv(items);
      const filename = `fanletter-agentrank-review-queue-${Date.now()}.csv`;

      return new Response(csv, {
        headers: {
          "content-disposition": `attachment; filename="${filename}"`,
          "content-type": "text/csv; charset=utf-8",
          ...getReviewQueueHeaders(reviewQueue),
          ...scopeHeaders,
        },
      });
    }

    if (url.searchParams.get("format") === "ndjson") {
      const ndjson = serializeReviewQueueNdjson(items);
      const filename = `fanletter-agentrank-review-queue-${Date.now()}.ndjson`;

      return new Response(ndjson, {
        headers: {
          "content-disposition": `attachment; filename="${filename}"`,
          "content-type": "application/x-ndjson; charset=utf-8",
          ...getReviewQueueHeaders(reviewQueue),
          ...scopeHeaders,
        },
      });
    }

    return Response.json(
      {
        eventScope: {
          raw: rawScope,
          scope,
          scoped: scopedScope,
        },
        filters: {
          limit,
          memberEmail: normalizeParam(url.searchParams.get("memberEmail")),
          scope,
          starId: normalizeParam(url.searchParams.get("starId")),
        },
        generatedAt: reviewQueue.generatedAt,
        reviewQueue,
      },
      {
        headers: {
          ...getReviewQueueHeaders(reviewQueue),
          ...scopeHeaders,
        },
      },
    );
  } catch (error) {
    console.error("AgentRank review queue failed", error);

    return Response.json(
      {
        error: "AgentRank review queue could not be loaded.",
      },
      {
        status: 500,
      },
    );
  }
}
