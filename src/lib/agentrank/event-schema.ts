import type {
  AgentRankInteractionEventType,
  AgentRankInteractionSignal,
  AgentRankInteractionSource,
} from "@/lib/agentrank/interaction-events";

export const agentRankReputationEventSchemaVersion =
  "agentrank.reputation_event.v1" as const;

export type AgentRankEventMetadata = Record<
  string,
  boolean | null | number | string
>;

export type AgentRankReputationImpact = {
  creator: number;
  discovery: number;
  economy: number;
  network: number;
  total: number;
  trust: number;
};

export type AgentRankReputationEventDraft = {
  actorMemberId: string | null;
  actorWalletAddress: string | null;
  contentId: string | null;
  cpDelta: number;
  creatorProgressDelta: number;
  eventType: AgentRankInteractionEventType;
  funnelEventName: string;
  influenceDelta: number;
  intent: string;
  metadata: AgentRankEventMetadata;
  path: string | null;
  referralCode: string | null;
  reputationImpact: AgentRankReputationImpact;
  relatedStarIds: string[];
  schemaVersion: typeof agentRankReputationEventSchemaVersion;
  shareId: string | null;
  source: AgentRankInteractionSource;
  targetHref: string | null;
  targetStarId: string | null;
  universeId: string | null;
  viewerType: "guest" | "member";
};

type BuildAgentRankReputationEventDraftInput = {
  agentRank: AgentRankInteractionSignal;
  contentId?: string | null;
  eventName: string;
  memberEmail?: string | null;
  memberWalletAddress?: string | null;
  metadata?: AgentRankEventMetadata;
  path?: string | null;
  referralCode?: string | null;
  shareId?: string | null;
  targetHref?: string | null;
  viewerType: "guest" | "member";
};

const baseImpactByType = {
  ai_star_discovered: {
    creator: 0,
    discovery: 1,
    economy: 0,
    network: 0,
    trust: 0.25,
  },
  ai_star_spawned: {
    creator: 2,
    discovery: 1,
    economy: 0.6,
    network: 1,
    trust: 1,
  },
  content_engaged: {
    creator: 0.3,
    discovery: 0.5,
    economy: 0,
    network: 0.2,
    trust: 0.2,
  },
  cp_earned: {
    creator: 0.2,
    discovery: 0,
    economy: 1,
    network: 0.5,
    trust: 0.6,
  },
  cp_pool_generated: {
    creator: 0.7,
    discovery: 0,
    economy: 1.8,
    network: 1,
    trust: 0.9,
  },
  creator_unlock_evaluated: {
    creator: 0.8,
    discovery: 0,
    economy: 0.2,
    network: 0.6,
    trust: 0.7,
  },
  creator_unlocked: {
    creator: 2,
    discovery: 0,
    economy: 0.4,
    network: 0.8,
    trust: 0.8,
  },
  source_universe_selected: {
    creator: 0.7,
    discovery: 0,
    economy: 0.2,
    network: 1.2,
    trust: 0.8,
  },
  x402_mock_payment_intent: {
    creator: 0.5,
    discovery: 0,
    economy: 1.5,
    network: 0.2,
    trust: 0.7,
  },
  founder_joined: {
    creator: 0,
    discovery: 0.2,
    economy: 0,
    network: 1,
    trust: 0.5,
  },
  referral_code_created: {
    creator: 0,
    discovery: 0.2,
    economy: 0,
    network: 0.4,
    trust: 0.3,
  },
  referral_converted: {
    creator: 0,
    discovery: 0.4,
    economy: 0,
    network: 1.5,
    trust: 0.8,
  },
  universe_growth: {
    creator: 0.4,
    discovery: 0.5,
    economy: 0,
    network: 1,
    trust: 0.6,
  },
} satisfies Record<
  AgentRankInteractionEventType,
  Omit<AgentRankReputationImpact, "total">
>;

function normalizeString(value: string | null | undefined, maxLength = 160) {
  return value?.trim() ? value.trim().slice(0, maxLength) : null;
}

function normalizeMemberId(value: string | null | undefined) {
  return normalizeString(value, 180)?.toLowerCase() ?? null;
}

function normalizeStarId(value: string | null | undefined) {
  return normalizeString(value, 128)?.toLowerCase() ?? null;
}

function readMetadataStarId(
  metadata: AgentRankEventMetadata | undefined,
  key: string,
) {
  const value = metadata?.[key];

  return typeof value === "string" ? normalizeStarId(value) : null;
}

function uniqueStarIds(values: Array<string | null | undefined>) {
  const starIds = values
    .map((value) => normalizeStarId(value))
    .filter((value): value is string => Boolean(value));

  return [...new Set(starIds)];
}

function readNumber(
  metadata: AgentRankEventMetadata | undefined,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = metadata?.[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
}

function roundImpact(value: number) {
  return Math.round(value * 100) / 100;
}

function buildUniverseId(starId: string | null) {
  return starId ? `fanletter-star-universe:${starId}` : null;
}

function buildReputationImpact({
  eventType,
  metadata,
  targetStarId,
}: {
  eventType: AgentRankInteractionEventType;
  metadata?: AgentRankEventMetadata;
  targetStarId: string | null;
}) {
  const base = baseImpactByType[eventType];
  const cpDelta = Math.abs(readNumber(metadata, "cpDelta", "rewardCpDelta"));
  const cpPoolTotal = Math.max(
    0,
    readNumber(metadata, "cpPoolTotal", "allocatedCp", "cpPoolGenerated"),
  );
  const influenceDelta = Math.abs(
    readNumber(metadata, "influenceDelta", "influenceScoreDelta"),
  );
  const creatorProgressDelta = Math.max(
    0,
    readNumber(metadata, "creatorProgressDelta", "creatorProgressPercentDelta"),
  );
  const growthPercent = Math.max(
    0,
    readNumber(metadata, "growthPercent", "growth"),
  );
  const hasTargetStar = targetStarId ? 0.2 : 0;
  const creator = roundImpact(base.creator + creatorProgressDelta / 10);
  const discovery = roundImpact(base.discovery + growthPercent / 100);
  const economy = roundImpact(base.economy + cpDelta / 100 + cpPoolTotal / 250);
  const network = roundImpact(base.network + influenceDelta / 10);
  const trust = roundImpact(base.trust + hasTargetStar);

  return {
    creator,
    discovery,
    economy,
    network,
    total: roundImpact(creator + discovery + economy + network + trust),
    trust,
  };
}

export function buildAgentRankReputationEventDraft({
  agentRank,
  contentId,
  eventName,
  memberEmail,
  memberWalletAddress,
  metadata,
  path,
  referralCode,
  shareId,
  targetHref,
  viewerType,
}: BuildAgentRankReputationEventDraftInput): AgentRankReputationEventDraft {
  const targetStarId = normalizeStarId(agentRank.starId);
  const relatedStarIds = uniqueStarIds([
    targetStarId,
    readMetadataStarId(metadata, "starId"),
    readMetadataStarId(metadata, "sourceStarId"),
    readMetadataStarId(metadata, "spawnedStarId"),
    readMetadataStarId(metadata, "coverageActionStarId"),
  ]);

  return {
    actorMemberId: normalizeMemberId(memberEmail),
    actorWalletAddress: normalizeString(memberWalletAddress, 120),
    contentId: normalizeString(contentId, 160),
    cpDelta: readNumber(metadata, "cpDelta", "rewardCpDelta"),
    creatorProgressDelta: readNumber(
      metadata,
      "creatorProgressDelta",
      "creatorProgressPercentDelta",
    ),
    eventType: agentRank.eventType,
    funnelEventName: eventName,
    influenceDelta: readNumber(
      metadata,
      "influenceDelta",
      "influenceScoreDelta",
    ),
    intent: normalizeString(agentRank.intent, 96) ?? eventName,
    metadata: metadata ?? {},
    path: normalizeString(path, 320),
    referralCode: normalizeString(referralCode, 96),
    reputationImpact: buildReputationImpact({
      eventType: agentRank.eventType,
      metadata,
      targetStarId,
    }),
    relatedStarIds,
    schemaVersion: agentRankReputationEventSchemaVersion,
    shareId: normalizeString(shareId, 96),
    source: agentRank.source,
    targetHref: normalizeString(targetHref, 320),
    targetStarId,
    universeId: buildUniverseId(targetStarId),
    viewerType,
  };
}
