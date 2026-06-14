import "server-only";

import { agentRankReputationEventSchemaVersion } from "@/lib/agentrank/event-schema";
import type {
  AgentRankReputationEvent,
  AgentRankReputationEventType,
} from "@/lib/agentrank/reputation-events";

export const agentRankContractRequiredFields = [
  "actor",
  "object",
  "starId",
  "universeId",
  "source",
  "schemaVersion",
  "evidenceHash",
] as const;

export type AgentRankContractField =
  (typeof agentRankContractRequiredFields)[number];

export type AgentRankContractIssue = {
  eventId: string;
  missingFields: AgentRankContractField[];
  occurredAt: string;
  risk: "critical" | "warning";
  source: AgentRankReputationEvent["source"];
  type: AgentRankReputationEventType;
};

export type AgentRankContractSnapshot = {
  contractReadyEvents: number;
  invalidEvents: number;
  issues: AgentRankContractIssue[];
  missingFieldCounts: Record<AgentRankContractField, number>;
  recordType: "agentrank.reputation_event_contract.v1";
  requiredFields: AgentRankContractField[];
  riskEvents: number;
  totalEvents: number;
  validationPercent: number;
};

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasActor(event: AgentRankReputationEvent) {
  return hasText(event.actor?.id) && hasText(event.actor?.type);
}

function hasObject(event: AgentRankReputationEvent) {
  return hasText(event.object?.id) && hasText(event.object?.type);
}

function hasUniverseId(event: AgentRankReputationEvent) {
  return hasText(event.context.universeId);
}

function hasSource(event: AgentRankReputationEvent) {
  return hasText(event.source) && hasText(event.sourceId);
}

function hasSchemaVersion(event: AgentRankReputationEvent) {
  return event.schemaVersion === agentRankReputationEventSchemaVersion;
}

function hasEvidenceHash(event: AgentRankReputationEvent) {
  return hasText(event.audit?.evidenceHash);
}

function percent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

export function validateAgentRankEventContract(
  event: AgentRankReputationEvent,
) {
  const checks: Record<AgentRankContractField, boolean> = {
    actor: hasActor(event),
    object: hasObject(event),
    starId: hasText(event.starId),
    universeId: hasUniverseId(event),
    source: hasSource(event),
    schemaVersion: hasSchemaVersion(event),
    evidenceHash: hasEvidenceHash(event),
  };
  const missingFields = agentRankContractRequiredFields.filter(
    (field) => !checks[field],
  );
  const criticalFields = missingFields.filter((field) =>
    ["actor", "source", "schemaVersion", "evidenceHash"].includes(field),
  );
  const risk: AgentRankContractIssue["risk"] =
    criticalFields.length > 0 ? "critical" : "warning";

  return {
    contractReady: missingFields.length === 0,
    missingFields,
    risk,
  };
}

export function buildAgentRankContractSnapshot(
  events: AgentRankReputationEvent[],
): AgentRankContractSnapshot {
  const missingFieldCounts = Object.fromEntries(
    agentRankContractRequiredFields.map((field) => [field, 0]),
  ) as Record<AgentRankContractField, number>;
  const issues: AgentRankContractIssue[] = [];
  let contractReadyEvents = 0;
  let riskEvents = 0;

  for (const event of events) {
    const validation = validateAgentRankEventContract(event);

    if (validation.contractReady) {
      contractReadyEvents += 1;
      continue;
    }

    for (const field of validation.missingFields) {
      missingFieldCounts[field] += 1;
    }

    if (validation.risk === "critical") {
      riskEvents += 1;
    }

    issues.push({
      eventId: event.eventId,
      missingFields: validation.missingFields,
      occurredAt: event.occurredAt,
      risk: validation.risk,
      source: event.source,
      type: event.type,
    });
  }

  return {
    contractReadyEvents,
    invalidEvents: events.length - contractReadyEvents,
    issues: issues.slice(0, 12),
    missingFieldCounts,
    recordType: "agentrank.reputation_event_contract.v1",
    requiredFields: [...agentRankContractRequiredFields],
    riskEvents,
    totalEvents: events.length,
    validationPercent: percent(contractReadyEvents, events.length),
  };
}
