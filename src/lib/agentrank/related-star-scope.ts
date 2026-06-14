import type { AgentRankReputationEvent } from "@/lib/agentrank/reputation-events";

function readContextString(event: AgentRankReputationEvent, key: string) {
  const value = event.context[key];

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

export function getAgentRankRelatedStarScope(
  event: AgentRankReputationEvent,
) {
  const values = [
    event.starId,
    event.object?.type === "ai_star" ? event.object.id : null,
    event.subject?.type === "ai_star" ? event.subject.id : null,
    readContextString(event, "sourceStarId"),
    readContextString(event, "spawnedStarId"),
    readContextString(event, "targetStarId"),
    readContextString(event, "coverageActionStarId"),
    readContextString(event, "relatedStarIds"),
  ];
  const starIds = values
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(","))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set(starIds)];
}
