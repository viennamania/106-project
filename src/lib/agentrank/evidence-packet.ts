import "server-only";

import { sha256AgentRankPayload } from "@/lib/agentrank/integrity";
import {
  filterAgentRankReputationEventFeedByMockScope,
  type AgentRankEventMockScope,
} from "@/lib/agentrank/mock-events";
import {
  getFanletterAgentRankReputationEventFeed,
  type AgentRankReputationEvent,
} from "@/lib/agentrank/reputation-events";

export type AgentRankEventEvidencePacket = ReturnType<
  typeof buildAgentRankEventEvidencePacket
>;

type GetAgentRankEventEvidencePacketOptions = {
  eventId: string;
  eventScope?: AgentRankEventMockScope;
  limit?: number;
  memberEmail?: string | null;
  starId?: string | null;
};

export function normalizeAgentRankEventId(value: string) {
  const normalized = value.trim();

  return /^[a-zA-Z0-9_-]{8,180}$/.test(normalized) ? normalized : null;
}

export function getAgentRankTraceKeys(event: AgentRankReputationEvent) {
  return new Set(
    [
      event.starId,
      event.actor.id,
      event.object?.id,
      event.subject?.id,
      event.context.sourceStarId,
      event.context.spawnedStarId,
      event.context.targetStarId,
      event.context.universeId,
      event.context.referralCode,
      event.context.relatedStarIds,
    ]
      .filter((value): value is string => typeof value === "string")
      .flatMap((value) => value.split(","))
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAgentRankRelatedTraceEvent(
  candidate: AgentRankReputationEvent,
  target: AgentRankReputationEvent,
) {
  if (candidate.eventId === target.eventId) {
    return false;
  }

  const targetKeys = getAgentRankTraceKeys(target);

  for (const candidateKey of getAgentRankTraceKeys(candidate)) {
    if (targetKeys.has(candidateKey)) {
      return true;
    }
  }

  return false;
}

export function buildAgentRankEventEvidencePacket(
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
  const evidenceRoot = sha256AgentRankPayload(evidenceRootPayload);
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
      packetHash: sha256AgentRankPayload(packet),
    },
  };
}

export async function getAgentRankEventEvidencePacket({
  eventId,
  eventScope = "all",
  limit = 250,
  memberEmail,
  starId,
}: GetAgentRankEventEvidencePacketOptions) {
  const feed = await getFanletterAgentRankReputationEventFeed({
    limit,
    memberEmail,
    starId,
  });
  const event = feed.events.find((candidate) => candidate.eventId === eventId);

  if (!event) {
    return null;
  }

  const scopedFeed = filterAgentRankReputationEventFeedByMockScope(
    feed,
    eventScope,
  );
  const relatedEvents = scopedFeed.events.filter((candidate) =>
    isAgentRankRelatedTraceEvent(candidate, event),
  );
  const packet = buildAgentRankEventEvidencePacket(event, relatedEvents);

  return {
    event,
    feed: scopedFeed,
    packet,
    relatedEvents,
  };
}
