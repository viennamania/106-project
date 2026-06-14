import { createHash } from "node:crypto";

import {
  getFanletterAgentRankReputationEventFeed,
  type AgentRankReputationEvent,
} from "@/lib/agentrank/reputation-events";

type EventEvidenceParams = {
  eventId: string;
};

function normalizeParam(value: string | null) {
  return value?.trim() || null;
}

function normalizeEventId(value: string) {
  const normalized = value.trim();

  return /^[a-zA-Z0-9_-]{8,180}$/.test(normalized) ? normalized : null;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
    .join(",")}}`;
}

function sha256(value: unknown) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function getTraceKeys(event: AgentRankReputationEvent) {
  return new Set(
    [
      event.starId,
      event.actor.id,
      event.object?.id,
      event.subject?.id,
      event.context.universeId,
      event.context.referralCode,
    ]
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.toLowerCase()),
  );
}

function isRelatedTraceEvent(
  candidate: AgentRankReputationEvent,
  target: AgentRankReputationEvent,
) {
  if (candidate.eventId === target.eventId) {
    return false;
  }

  const targetKeys = getTraceKeys(target);

  for (const candidateKey of getTraceKeys(candidate)) {
    if (targetKeys.has(candidateKey)) {
      return true;
    }
  }

  return false;
}

function buildEventEvidencePacket(
  event: AgentRankReputationEvent,
  relatedEvents: AgentRankReputationEvent[],
) {
  const linkedEvents = relatedEvents.slice(0, 12);
  const relatedEvidenceHashes = linkedEvents.map(
    (relatedEvent) => relatedEvent.audit.evidenceHash,
  );
  const evidenceRootPayload = {
    eventEvidenceHash: event.audit.evidenceHash,
    eventId: event.eventId,
    relatedEvidenceHashes,
    schemaVersion: event.schemaVersion,
    source: event.source,
    sourceId: event.sourceId,
  };
  const evidenceRoot = sha256(evidenceRootPayload);
  const issuedAt = new Date().toISOString();
  const packet = {
    agentRankVersion: event.agentRankVersion,
    event: {
      actor: event.actor,
      audit: event.audit,
      context: event.context,
      economicLayer: event.economicLayer,
      eventId: event.eventId,
      occurredAt: event.occurredAt,
      object: event.object ?? null,
      phase: event.phase,
      product: event.product,
      reputationSignals: event.reputationSignals,
      schemaVersion: event.schemaVersion,
      source: event.source,
      sourceId: event.sourceId,
      starId: event.starId ?? null,
      subject: event.subject ?? null,
      type: event.type,
    },
    evidence: {
      eventEvidenceHash: event.audit.evidenceHash,
      latestRelatedEventAt: linkedEvents[0]?.occurredAt ?? null,
      linkedEventCount: relatedEvents.length,
      linkedEvents: linkedEvents.map((relatedEvent) => ({
        auditStatus: relatedEvent.audit.status,
        eventId: relatedEvent.eventId,
        evidenceHash: relatedEvent.audit.evidenceHash,
        occurredAt: relatedEvent.occurredAt,
        oracleReady: relatedEvent.reputationSignals.oracleReady,
        qualityScore: relatedEvent.audit.qualityScore,
        schemaVersion: relatedEvent.schemaVersion,
        source: relatedEvent.source,
        sourceId: relatedEvent.sourceId,
        type: relatedEvent.type,
      })),
      relatedEvidenceHashes,
    },
    integrity: {
      canonicalization: "json-stable-v0",
      evidenceRoot,
      hashAlgorithm: "sha256",
    },
    issuedAt,
    packetVersion: "agentrank.event_evidence_packet.v0",
    recordType: "agentrank.reputation_event_evidence",
  };

  return {
    ...packet,
    integrity: {
      ...packet.integrity,
      packetHash: sha256(packet),
    },
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<EventEvidenceParams> },
) {
  const url = new URL(request.url);
  const { eventId: rawEventId } = await params;
  const eventId = normalizeEventId(rawEventId);

  if (!eventId) {
    return Response.json(
      {
        error: "Invalid AgentRank event id.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const feed = await getFanletterAgentRankReputationEventFeed({
      limit: 250,
      memberEmail: normalizeParam(url.searchParams.get("memberEmail")),
      starId: normalizeParam(url.searchParams.get("starId")),
    });
    const event = feed.events.find((candidate) => candidate.eventId === eventId);

    if (!event) {
      return Response.json(
        {
          error: "AgentRank reputation event was not found.",
        },
        {
          status: 404,
        },
      );
    }

    const relatedEvents = feed.events.filter((candidate) =>
      isRelatedTraceEvent(candidate, event),
    );
    const packet = buildEventEvidencePacket(event, relatedEvents);
    const headers = {
      "content-type": "application/json; charset=utf-8",
      "x-agentrank-evidence-root": packet.integrity.evidenceRoot,
      "x-agentrank-event-id": event.eventId,
      "x-agentrank-packet-hash": packet.integrity.packetHash,
      "x-agentrank-record-type": packet.recordType,
      "x-agentrank-schema-version": event.schemaVersion,
    };

    if (url.searchParams.get("download") === "1") {
      return new Response(JSON.stringify(packet, null, 2), {
        headers: {
          ...headers,
          "content-disposition": `attachment; filename="agentrank-event-evidence-${event.eventId}.json"`,
        },
      });
    }

    return Response.json(packet, {
      headers,
    });
  } catch (error) {
    console.error("AgentRank event evidence packet failed", error);

    return Response.json(
      {
        error: "AgentRank event evidence packet could not be generated.",
      },
      {
        status: 500,
      },
    );
  }
}
