export const agentRankInteractionEventTypes = [
  "ai_star_discovered",
  "founder_joined",
  "referral_code_created",
  "referral_converted",
  "cp_earned",
  "creator_unlocked",
  "ai_star_spawned",
  "content_engaged",
  "universe_growth",
] as const;

export type AgentRankInteractionEventType =
  (typeof agentRankInteractionEventTypes)[number];

export const agentRankInteractionSources = [
  "fanletter_home",
  "fanletter_star_detail",
  "fanletter_founder_universe",
  "fanletter_creator_unlock",
  "fanletter_agentrank",
] as const;

export type AgentRankInteractionSource =
  (typeof agentRankInteractionSources)[number];

export type AgentRankInteractionSignal = {
  eventType: AgentRankInteractionEventType;
  intent: string;
  source: AgentRankInteractionSource;
  starId?: string | null;
};

function readSafeString(value: unknown, maxLength = 96) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

export function isAgentRankInteractionEventType(
  value: unknown,
): value is AgentRankInteractionEventType {
  return (
    typeof value === "string" &&
    agentRankInteractionEventTypes.includes(
      value as AgentRankInteractionEventType,
    )
  );
}

export function isAgentRankInteractionSource(
  value: unknown,
): value is AgentRankInteractionSource {
  return (
    typeof value === "string" &&
    agentRankInteractionSources.includes(value as AgentRankInteractionSource)
  );
}

export function normalizeAgentRankInteractionSignal(
  value: unknown,
): AgentRankInteractionSignal | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Partial<AgentRankInteractionSignal>;

  if (
    !isAgentRankInteractionEventType(candidate.eventType) ||
    !isAgentRankInteractionSource(candidate.source)
  ) {
    return null;
  }

  const intent = readSafeString(candidate.intent);

  if (!intent) {
    return null;
  }

  return {
    eventType: candidate.eventType,
    intent,
    source: candidate.source,
    starId: readSafeString(candidate.starId, 128),
  };
}
