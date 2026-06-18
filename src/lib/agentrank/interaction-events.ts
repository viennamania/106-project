export const agentRankInteractionEventTypes = [
  "ai_star_discovered",
  "founder_joined",
  "referral_code_created",
  "referral_converted",
  "cp_earned",
  "cp_pool_generated",
  "creator_unlock_evaluated",
  "creator_unlocked",
  "creator_social_connected",
  "source_universe_selected",
  "x402_mock_payment_intent",
  "ai_star_spawned",
  "content_engaged",
  "universe_growth",
] as const;

export type AgentRankInteractionEventType =
  (typeof agentRankInteractionEventTypes)[number];

export const agentRankInteractionSources = [
  "fanletter_bridge",
  "fanletter_content",
  "fanletter_home",
  "fanletter_news",
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

type AgentRankInteractionFallbackInput = {
  contentId?: string | null;
  eventName: string;
  metadata?: Record<string, boolean | null | number | string>;
  path?: string | null;
  referralCode?: string | null;
  shareId?: string | null;
  targetHref?: string | null;
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

const reservedFanletterSegments = new Set([
  "agentrank",
  "ai-star-genealogy",
  "campaigns",
  "characters",
  "connect",
  "content",
  "creator",
  "creator-unlock",
  "feed",
  "founder-club",
  "founder-universe",
  "manifest.webmanifest",
  "news",
  "onboarding",
  "reports",
  "share",
  "start",
  "studio",
  "wallet",
]);

function inferStarIdFromRoute(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value) {
      continue;
    }

    const match = value.match(/\/fanletter\/([^/?#]+)/);
    const segment = match?.[1]?.trim();

    if (segment && !reservedFanletterSegments.has(segment)) {
      return decodeURIComponent(segment).slice(0, 128);
    }
  }

  return null;
}

function inferStarId(input: AgentRankInteractionFallbackInput) {
  const metadataStarId = readSafeString(input.metadata?.starId, 128);
  const sourceStarId = readSafeString(input.metadata?.sourceStarId, 128);
  const spawnedStarId = readSafeString(input.metadata?.spawnedStarId, 128);

  return (
    metadataStarId ??
    sourceStarId ??
    spawnedStarId ??
    inferStarIdFromRoute(input.path, input.targetHref)
  );
}

function inferSource(
  input: AgentRankInteractionFallbackInput,
): AgentRankInteractionSource {
  const route = `${input.path ?? ""} ${input.targetHref ?? ""}`;

  if (route.includes("/fanletter/creator-unlock")) {
    return "fanletter_creator_unlock";
  }

  if (route.includes("/fanletter/agentrank")) {
    return "fanletter_agentrank";
  }

  if (route.includes("/universe")) {
    return "fanletter_founder_universe";
  }

  if (route.includes("/fanletter/news")) {
    return "fanletter_news";
  }

  if (
    route.includes("/fanletter/content") ||
    route.includes("/fanletter/share") ||
    route.includes("/fanletter/creator/")
  ) {
    return "fanletter_content";
  }

  if (
    route.includes("/fanletter/onboarding") ||
    route.includes("/fanletter/connect")
  ) {
    return "fanletter_bridge";
  }

  return inferStarId(input) ? "fanletter_star_detail" : "fanletter_home";
}

function inferEventType(
  input: AgentRankInteractionFallbackInput,
): AgentRankInteractionEventType | null {
  const route = `${input.path ?? ""} ${input.targetHref ?? ""}`;

  if (input.eventName === "fanletter_founder_join_completed") {
    return input.referralCode ? "referral_converted" : "founder_joined";
  }

  if (input.eventName === "fanletter_creator_launch_completed") {
    return "ai_star_spawned";
  }

  if (input.eventName === "fanletter_cp_pool_generated") {
    return "cp_pool_generated";
  }

  if (input.eventName === "fanletter_creator_unlock_evaluated") {
    return "creator_unlock_evaluated";
  }

  if (input.eventName === "fanletter_creator_unlocked") {
    return "creator_unlocked";
  }

  if (input.eventName === "fanletter_creator_social_connected") {
    return "creator_social_connected";
  }

  if (input.eventName === "fanletter_source_universe_selected") {
    return "source_universe_selected";
  }

  if (input.eventName === "fanletter_x402_mock_payment_intent") {
    return "x402_mock_payment_intent";
  }

  if (input.eventName === "signup_cta_click") {
    if (route.includes("/fanletter/creator-unlock")) {
      return "creator_unlocked";
    }

    if (
      input.referralCode ||
      route.includes("/fanletter/onboarding") ||
      route.includes("/fanletter/connect") ||
      inferStarId(input)
    ) {
      return "founder_joined";
    }

    return "ai_star_discovered";
  }

  if (
    input.eventName === "share_click" ||
    input.eventName.startsWith("promo_share_to_")
  ) {
    return "referral_code_created";
  }

  if (input.eventName === "bridge_view") {
    return input.referralCode || input.shareId
      ? "referral_converted"
      : "content_engaged";
  }

  if (
    input.eventName === "content_open" ||
    input.eventName === "external_browser_click" ||
    input.eventName === "feed_view_public" ||
    input.eventName === "paid_unlock_click" ||
    input.eventName.startsWith("fanletter_news_")
  ) {
    return "content_engaged";
  }

  return null;
}

export function inferAgentRankInteractionSignal(
  explicitSignal: unknown,
  input: AgentRankInteractionFallbackInput,
): AgentRankInteractionSignal | null {
  const normalizedSignal = normalizeAgentRankInteractionSignal(explicitSignal);

  if (normalizedSignal) {
    return normalizedSignal;
  }

  const eventType = inferEventType(input);

  if (!eventType) {
    return null;
  }

  return {
    eventType,
    intent: input.eventName.slice(0, 96),
    source: inferSource(input),
    starId: inferStarId(input),
  };
}
