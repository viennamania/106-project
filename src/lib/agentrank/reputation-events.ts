import "server-only";

import { createHash } from "node:crypto";

import { agentRankReputationEventSchemaVersion } from "@/lib/agentrank/event-schema";
import { fanletterFounderUniverseCpPoolTotal } from "@/lib/fanletter-founder-universe";
import type {
  FanletterStarDocument,
  FanletterStarFounderMembershipDocument,
  FanletterStarInfluenceLedgerDocument,
  FanletterStarReferralCodeDocument,
  FanletterStarReferralEdgeDocument,
} from "@/lib/fanletter-founder-club";
import {
  getFanletterStarFounderMembershipsCollection,
  getFanletterStarInfluenceLedgerCollection,
  getFanletterStarReferralCodesCollection,
  getFanletterStarReferralEdgesCollection,
  getFanletterStarsCollection,
  getFunnelEventsCollection,
} from "@/lib/mongodb";
import type { FunnelEventDocument } from "@/lib/funnel";

export const agentRankReputationEventTypes = [
  "ai_star_discovered",
  "founder_joined",
  "referral_code_created",
  "referral_converted",
  "cp_earned",
  "cp_pool_generated",
  "creator_unlock_evaluated",
  "creator_unlocked",
  "source_universe_selected",
  "x402_mock_payment_intent",
  "ai_star_spawned",
  "content_engaged",
  "universe_growth",
] as const;

export type AgentRankReputationEventType =
  (typeof agentRankReputationEventTypes)[number];

export type AgentRankReputationEventSource =
  | "fanletter_funnel_event"
  | "fanletter_star"
  | "fanletter_star_founder_membership"
  | "fanletter_star_referral_code"
  | "fanletter_star_referral_edge"
  | "fanletter_star_influence_ledger";

export type AgentRankActorType = "ai_star" | "member" | "platform";

export type AgentRankActor = {
  id: string;
  label?: string | null;
  role?: string | null;
  type: AgentRankActorType;
};

export type AgentRankEconomicLayer = {
  cpDelta?: number;
  creatorProgressDelta?: number;
  currency: "CP";
  influenceDelta?: number;
  x402Ready: boolean;
};

export type AgentRankReputationSignals = {
  creatorWeight: number;
  discoveryWeight: number;
  economicWeight: number;
  networkWeight: number;
  oracleReady: boolean;
};

export type AgentRankAuditStatus =
  | "audit_ready"
  | "needs_enrichment"
  | "partial";

export type AgentRankReputationEventAudit = {
  evidenceHash: string;
  gaps: string[];
  graphReady: boolean;
  impactReady: boolean;
  qualityScore: number;
  status: AgentRankAuditStatus;
};

export type AgentRankReputationEvent = {
  actor: AgentRankActor;
  agentRankVersion: "agentrank.v0";
  audit: AgentRankReputationEventAudit;
  context: Record<string, string | number | boolean | null>;
  economicLayer: AgentRankEconomicLayer;
  eventId: string;
  occurredAt: string;
  object?: AgentRankActor | null;
  phase: "fanletter_phase_1";
  product: "fanletter";
  reputationSignals: AgentRankReputationSignals;
  schemaVersion: typeof agentRankReputationEventSchemaVersion;
  source: AgentRankReputationEventSource;
  sourceId: string;
  starId?: string | null;
  subject?: AgentRankActor | null;
  type: AgentRankReputationEventType;
};

export type AgentRankReputationEventSummary = {
  byType: Partial<Record<AgentRankReputationEventType, number>>;
  cpTotal: number;
  creatorWeightTotal: number;
  discoveryWeightTotal: number;
  economicWeightTotal: number;
  generatedAt: string;
  influenceTotal: number;
  networkEdges: number;
  networkWeightTotal: number;
  auditReadyEvents: number;
  averageQualityScore: number;
  oracleReadyEvents: number;
  schemaReadyEvents: number;
  totalEvents: number;
  uniqueMembers: number;
  uniqueStars: number;
};

export type FanletterAgentRankReputationEventFeed = {
  events: AgentRankReputationEvent[];
  generatedAt: string;
  roadmap: [
    "AI Star Discovery",
    "Founder Network",
    "x402 Economy",
    "Agent Transaction Graph",
    "AgentRank",
    "Agent Reputation Oracle",
  ];
  summary: AgentRankReputationEventSummary;
};

export type GetFanletterAgentRankReputationEventsOptions = {
  includeTypes?: AgentRankReputationEventType[];
  limit?: number;
  memberEmail?: string | null;
  starId?: string | null;
};

type StarLookup = Map<string, FanletterStarDocument>;

type EventBuildInput = {
  object?: AgentRankActor | null;
  occurredAt?: Date | null;
  source: AgentRankReputationEventSource;
  sourceId: string;
  starId?: string | null;
  subject?: AgentRankActor | null;
  type: AgentRankReputationEventType;
} & Omit<
  AgentRankReputationEvent,
  | "agentRankVersion"
  | "audit"
  | "eventId"
  | "economicLayer"
  | "occurredAt"
  | "phase"
  | "product"
  | "reputationSignals"
  | "schemaVersion"
  | "source"
  | "sourceId"
  | "starId"
  | "type"
>;

const defaultRoadmap = [
  "AI Star Discovery",
  "Founder Network",
  "x402 Economy",
  "Agent Transaction Graph",
  "AgentRank",
  "Agent Reputation Oracle",
] as const;

function normalizeId(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeEmail(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeLimit(value: number | null | undefined) {
  return Math.max(1, Math.min(value ?? 80, 250));
}

function isIncludedType(
  type: AgentRankReputationEventType,
  includeTypes: Set<AgentRankReputationEventType> | null,
) {
  return !includeTypes || includeTypes.has(type);
}

function toIsoDate(value: Date | null | undefined) {
  return value instanceof Date && !Number.isNaN(value.getTime())
    ? value.toISOString()
    : new Date(0).toISOString();
}

function toSafeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function buildEventId(parts: unknown[]) {
  return `agentrank_${createHash("sha256")
    .update(JSON.stringify(parts))
    .digest("hex")
    .slice(0, 32)}`;
}

function buildEvidenceHash(parts: unknown[]) {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

function isValidIsoDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

function getStarName(star: FanletterStarDocument | null | undefined) {
  return star?.characterName || star?.displayName || star?.starId || null;
}

function buildMemberActor(memberEmail: string, role?: string | null): AgentRankActor {
  return {
    id: normalizeEmail(memberEmail) || "unknown-member",
    role: role ?? null,
    type: "member",
  };
}

function buildStarActor(starId: string, star?: FanletterStarDocument | null) {
  return {
    id: normalizeId(starId) || "unknown-star",
    label: getStarName(star),
    type: "ai_star" as const,
  };
}

function parseCreatorLaunchCpPoolSourceId(sourceId: string | null | undefined) {
  const [prefix, sourceStarId, launchStarId, role, recipientMemberEmail] =
    sourceId?.split(":") ?? [];

  if (prefix !== "creator-launch-cp-pool" || !sourceStarId || !launchStarId) {
    return null;
  }

  return {
    launchStarId: normalizeId(launchStarId),
    recipientMemberEmail: normalizeEmail(recipientMemberEmail),
    role: role ?? null,
    sourceStarId: normalizeId(sourceStarId),
  };
}

function getTypeSignalDefaults(type: AgentRankReputationEventType) {
  switch (type) {
    case "ai_star_discovered":
      return {
        creatorWeight: 0,
        discoveryWeight: 1,
        economicWeight: 0,
        networkWeight: 0,
      };
    case "founder_joined":
      return {
        creatorWeight: 0,
        discoveryWeight: 0.2,
        economicWeight: 0,
        networkWeight: 1,
      };
    case "referral_code_created":
      return {
        creatorWeight: 0,
        discoveryWeight: 0.2,
        economicWeight: 0,
        networkWeight: 0.4,
      };
    case "referral_converted":
      return {
        creatorWeight: 0,
        discoveryWeight: 0.4,
        economicWeight: 0,
        networkWeight: 1.5,
      };
    case "cp_earned":
      return {
        creatorWeight: 0.2,
        discoveryWeight: 0,
        economicWeight: 1,
        networkWeight: 0.5,
      };
    case "cp_pool_generated":
      return {
        creatorWeight: 0.7,
        discoveryWeight: 0,
        economicWeight: 1.8,
        networkWeight: 1,
      };
    case "creator_unlock_evaluated":
      return {
        creatorWeight: 0.8,
        discoveryWeight: 0,
        economicWeight: 0.2,
        networkWeight: 0.6,
      };
    case "creator_unlocked":
      return {
        creatorWeight: 2,
        discoveryWeight: 0,
        economicWeight: 0.4,
        networkWeight: 0.8,
      };
    case "source_universe_selected":
      return {
        creatorWeight: 0.7,
        discoveryWeight: 0,
        economicWeight: 0.2,
        networkWeight: 1.2,
      };
    case "x402_mock_payment_intent":
      return {
        creatorWeight: 0.5,
        discoveryWeight: 0,
        economicWeight: 1.5,
        networkWeight: 0.2,
      };
    case "ai_star_spawned":
      return {
        creatorWeight: 2,
        discoveryWeight: 1,
        economicWeight: 0.6,
        networkWeight: 1,
      };
    case "content_engaged":
      return {
        creatorWeight: 0.3,
        discoveryWeight: 0.5,
        economicWeight: 0,
        networkWeight: 0.2,
      };
    case "universe_growth":
      return {
        creatorWeight: 0.4,
        discoveryWeight: 0.5,
        economicWeight: 0,
        networkWeight: 1,
      };
  }
}

function buildEventAudit({
  actor,
  context,
  economicLayer,
  object,
  occurredAt,
  reputationSignals,
  schemaVersion,
  source,
  sourceId,
  starId,
  subject,
  type,
}: {
  actor: AgentRankActor;
  context: AgentRankReputationEvent["context"];
  economicLayer: AgentRankEconomicLayer;
  object?: AgentRankActor | null;
  occurredAt: string;
  reputationSignals: AgentRankReputationSignals;
  schemaVersion: typeof agentRankReputationEventSchemaVersion;
  source: AgentRankReputationEventSource;
  sourceId: string;
  starId?: string | null;
  subject?: AgentRankActor | null;
  type: AgentRankReputationEventType;
}): AgentRankReputationEventAudit {
  const impactTotal =
    reputationSignals.creatorWeight +
    reputationSignals.discoveryWeight +
    reputationSignals.economicWeight +
    reputationSignals.networkWeight;
  const actorReady = Boolean(actor.id && !actor.id.startsWith("unknown-"));
  const sourceReady = Boolean(sourceId);
  const timeReady = isValidIsoDate(occurredAt);
  const starReady = Boolean(
    starId || object?.type === "ai_star" || subject?.type === "ai_star",
  );
  const graphReady = Boolean(
    actorReady && (object?.id || subject?.id || starId),
  );
  const impactReady = impactTotal > 0;
  const checks = [
    ["source_id", sourceReady],
    ["timestamp", timeReady],
    ["actor_id", actorReady],
    ["star_id", starReady],
    ["graph_edge", graphReady],
    ["impact_signal", impactReady],
  ] as const;
  const gaps = checks
    .filter(([, isReady]) => !isReady)
    .map(([gap]) => gap);
  const readyCount = checks.length - gaps.length;
  const qualityScore = Math.round((readyCount / checks.length) * 100);

  return {
    evidenceHash: buildEvidenceHash([
      schemaVersion,
      source,
      sourceId,
      type,
      actor,
      object,
      subject,
      starId,
      occurredAt,
      context,
      economicLayer,
      reputationSignals,
    ]),
    gaps,
    graphReady,
    impactReady,
    qualityScore,
    status:
      gaps.length === 0
        ? "audit_ready"
        : qualityScore >= 67
          ? "partial"
          : "needs_enrichment",
  };
}

function buildEvent(input: EventBuildInput): AgentRankReputationEvent {
  const cpDelta = toSafeNumber(input.context.cpDelta);
  const cpPoolTotal = toSafeNumber(input.context.cpPoolTotal);
  const influenceDelta = toSafeNumber(input.context.influenceDelta);
  const creatorProgressDelta = toSafeNumber(input.context.creatorProgressDelta);
  const defaults = getTypeSignalDefaults(input.type);
  const economicWeight =
    defaults.economicWeight +
    Math.max(0, Math.abs(cpDelta)) / 100 +
    (input.type === "cp_pool_generated" ? Math.max(0, cpPoolTotal) / 250 : 0);
  const networkWeight =
    defaults.networkWeight +
    (input.type === "referral_converted" || input.type === "founder_joined"
      ? 0.5
      : 0);
  const creatorWeight =
    defaults.creatorWeight + Math.max(0, creatorProgressDelta) / 10;
  const discoveryWeight =
    defaults.discoveryWeight +
    Math.max(0, toSafeNumber(input.context.growthPercent)) / 100;
  const economicLayer = {
    cpDelta,
    creatorProgressDelta,
    currency: "CP" as const,
    influenceDelta,
    x402Ready:
      input.type === "x402_mock_payment_intent" ||
      input.type === "cp_pool_generated" ||
      input.context.x402Ready === true,
  };
  const occurredAt = toIsoDate(input.occurredAt);
  const reputationSignals = {
    creatorWeight,
    discoveryWeight,
    economicWeight,
    networkWeight,
    oracleReady: Boolean(input.sourceId && input.occurredAt),
  };

  return {
    actor: input.actor,
    agentRankVersion: "agentrank.v0",
    audit: buildEventAudit({
      actor: input.actor,
      context: input.context,
      economicLayer,
      object: input.object ?? null,
      occurredAt,
      reputationSignals,
      schemaVersion: agentRankReputationEventSchemaVersion,
      source: input.source,
      sourceId: input.sourceId,
      starId: input.starId ?? null,
      subject: input.subject ?? null,
      type: input.type,
    }),
    context: input.context,
    economicLayer,
    eventId: buildEventId([input.source, input.sourceId, input.type]),
    object: input.object ?? null,
    occurredAt,
    phase: "fanletter_phase_1",
    product: "fanletter",
    reputationSignals,
    schemaVersion: agentRankReputationEventSchemaVersion,
    source: input.source,
    sourceId: input.sourceId,
    starId: input.starId ?? null,
    subject: input.subject ?? null,
    type: input.type,
  };
}

function buildStarEvents({
  includeTypes,
  stars,
}: {
  includeTypes: Set<AgentRankReputationEventType> | null;
  stars: FanletterStarDocument[];
}) {
  const events: AgentRankReputationEvent[] = [];

  for (const star of stars) {
    const starActor = buildStarActor(star.starId, star);

    if (isIncludedType("ai_star_discovered", includeTypes)) {
      events.push(
        buildEvent({
          actor: starActor,
          context: {
            founderCount: star.founderCount,
            growthPercent: star.growthPercent,
            openSlotCount: star.openSlotCount,
            ownerEmail: star.ownerEmail,
            source: star.source,
            starScore: star.starScore,
            status: star.status,
          },
          occurredAt: star.createdAt,
          object: star.ownerEmail ? buildMemberActor(star.ownerEmail) : null,
          source: "fanletter_star",
          sourceId: `fanletter-star:${star.starId}`,
          starId: star.starId,
          type: "ai_star_discovered",
        }),
      );
    }

    if (
      isIncludedType("ai_star_spawned", includeTypes) &&
      (star.createdByUnlock || star.spawnedFromStarId)
    ) {
      events.push(
        buildEvent({
          actor: star.ownerEmail
            ? buildMemberActor(star.ownerEmail, "creator")
            : { id: "fanletter", label: "FanLetter", type: "platform" },
          context: {
            launchCostUsdt: star.launchCostUsdt ?? null,
            source: star.source,
            spawnedFromStarId: star.spawnedFromStarId ?? null,
            status: star.status,
          },
          occurredAt: star.createdAt,
          object: star.spawnedFromStarId
            ? buildStarActor(star.spawnedFromStarId)
            : null,
          source: "fanletter_star",
          sourceId: `fanletter-star-spawned:${star.starId}`,
          starId: star.starId,
          subject: starActor,
          type: "ai_star_spawned",
        }),
      );
    }

    if (
      isIncludedType("universe_growth", includeTypes) &&
      (star.founderCount > 0 || star.growthPercent > 0)
    ) {
      events.push(
        buildEvent({
          actor: starActor,
          context: {
            founderCount: star.founderCount,
            growthPercent: star.growthPercent,
            openSlotCount: star.openSlotCount,
            starScore: star.starScore,
          },
          occurredAt: star.updatedAt,
          source: "fanletter_star",
          sourceId: `fanletter-star-growth:${star.starId}`,
          starId: star.starId,
          type: "universe_growth",
        }),
      );
    }
  }

  return events;
}

function buildMembershipEvents({
  includeTypes,
  memberships,
  starsById,
}: {
  includeTypes: Set<AgentRankReputationEventType> | null;
  memberships: FanletterStarFounderMembershipDocument[];
  starsById: StarLookup;
}) {
  const events: AgentRankReputationEvent[] = [];

  for (const membership of memberships) {
    const star = starsById.get(membership.starId);

    if (isIncludedType("founder_joined", includeTypes)) {
      events.push(
        buildEvent({
          actor: buildMemberActor(membership.memberEmail, membership.role),
          context: {
            cpBalance: membership.cpBalance,
            creatorProgressPercent: membership.creatorProgressPercent,
            influenceScore: membership.influenceScore,
            joinedViaCode: membership.joinedViaCode,
            joinedViaMemberEmail: membership.joinedViaMemberEmail,
            role: membership.role,
            source: membership.source,
          },
          object: buildStarActor(membership.starId, star),
          occurredAt: membership.joinedAt,
          source: "fanletter_star_founder_membership",
          sourceId: `fanletter-founder-membership:${membership.starId}:${membership.memberEmail}`,
          starId: membership.starId,
          type: "founder_joined",
        }),
      );
    }

    if (
      isIncludedType("creator_unlocked", includeTypes) &&
      membership.role === "creator" &&
      membership.source === "creator_unlock"
    ) {
      events.push(
        buildEvent({
          actor: buildMemberActor(membership.memberEmail, "creator"),
          context: {
            creatorProgressPercent: membership.creatorProgressPercent,
            influenceScore: membership.influenceScore,
            source: membership.source,
          },
          object: buildStarActor(membership.starId, star),
          occurredAt: membership.joinedAt,
          source: "fanletter_star_founder_membership",
          sourceId: `fanletter-creator-unlocked:${membership.starId}:${membership.memberEmail}`,
          starId: membership.starId,
          type: "creator_unlocked",
        }),
      );
    }
  }

  return events;
}

function buildReferralCodeEvents({
  includeTypes,
  referralCodes,
  starsById,
}: {
  includeTypes: Set<AgentRankReputationEventType> | null;
  referralCodes: FanletterStarReferralCodeDocument[];
  starsById: StarLookup;
}) {
  if (!isIncludedType("referral_code_created", includeTypes)) {
    return [];
  }

  return referralCodes.map((referralCode) => {
    const star = starsById.get(referralCode.starId);

    return buildEvent({
      actor: buildMemberActor(referralCode.memberEmail),
      context: {
        code: referralCode.code,
        memberReferralCode: referralCode.memberReferralCode,
        source: referralCode.source,
        status: referralCode.status,
      },
      object: buildStarActor(referralCode.starId, star),
      occurredAt: referralCode.createdAt,
      source: "fanletter_star_referral_code",
      sourceId: `fanletter-star-referral-code:${referralCode.starId}:${referralCode.code}`,
      starId: referralCode.starId,
      type: "referral_code_created",
    });
  });
}

function buildReferralEdgeEvents({
  includeTypes,
  referralEdges,
  starsById,
}: {
  includeTypes: Set<AgentRankReputationEventType> | null;
  referralEdges: FanletterStarReferralEdgeDocument[];
  starsById: StarLookup;
}) {
  if (!isIncludedType("referral_converted", includeTypes)) {
    return [];
  }

  return referralEdges.map((edge) => {
    const star = starsById.get(edge.starId);

    return buildEvent({
      actor: buildMemberActor(edge.sourceMemberEmail),
      context: {
        referralCode: edge.referralCode,
        shareId: edge.shareId,
        source: edge.source,
        sourceMemberReferralCode: edge.sourceMemberReferralCode,
        targetMemberReferralCode: edge.targetMemberReferralCode,
      },
      object: buildStarActor(edge.starId, star),
      occurredAt: edge.createdAt,
      source: "fanletter_star_referral_edge",
      sourceId: edge.edgeId,
      starId: edge.starId,
      subject: buildMemberActor(edge.targetMemberEmail),
      type: "referral_converted",
    });
  });
}

function buildInfluenceLedgerEvents({
  includeTypes,
  ledgerRows,
  starsById,
}: {
  includeTypes: Set<AgentRankReputationEventType> | null;
  ledgerRows: FanletterStarInfluenceLedgerDocument[];
  starsById: StarLookup;
}) {
  const events: AgentRankReputationEvent[] = [];

  if (isIncludedType("cp_pool_generated", includeTypes)) {
    const poolRowsByKey = new Map<
      string,
      {
        allocatedCp: number;
        createdAt: Date | null;
        launchCreatorEmail: string | null;
        launchStarId: string;
        recipientCount: number;
        roles: Set<string>;
        sourceStarId: string;
      }
    >();

    for (const row of ledgerRows) {
      const parsed = parseCreatorLaunchCpPoolSourceId(row.sourceId);

      if (!parsed) {
        continue;
      }

      const key = `creator-launch-cp-pool:${parsed.sourceStarId}:${parsed.launchStarId}`;
      const existing =
        poolRowsByKey.get(key) ??
        ({
          allocatedCp: 0,
          createdAt: null,
          launchCreatorEmail: normalizeEmail(row.sourceMemberEmail),
          launchStarId: parsed.launchStarId,
          recipientCount: 0,
          roles: new Set<string>(),
          sourceStarId: parsed.sourceStarId,
        } satisfies {
          allocatedCp: number;
          createdAt: Date | null;
          launchCreatorEmail: string | null;
          launchStarId: string;
          recipientCount: number;
          roles: Set<string>;
          sourceStarId: string;
        });

      existing.allocatedCp += Math.max(0, toSafeNumber(row.cpDelta));
      existing.createdAt =
        existing.createdAt &&
        existing.createdAt.getTime() <= row.createdAt.getTime()
          ? existing.createdAt
          : row.createdAt;
      existing.launchCreatorEmail ||= normalizeEmail(row.sourceMemberEmail);
      existing.recipientCount += 1;

      if (parsed.role) {
        existing.roles.add(parsed.role);
      }

      poolRowsByKey.set(key, existing);
    }

    for (const [sourceId, pool] of poolRowsByKey) {
      const sourceStar = starsById.get(pool.sourceStarId);
      const launchStar = starsById.get(pool.launchStarId);

      events.push(
        buildEvent({
          actor: pool.launchCreatorEmail
            ? buildMemberActor(pool.launchCreatorEmail, "creator")
            : { id: "unknown-creator", type: "member" },
          context: {
            allocatedCp: pool.allocatedCp,
            cpPoolTotal: fanletterFounderUniverseCpPoolTotal,
            launchCreatorEmail: pool.launchCreatorEmail,
            recipientCount: pool.recipientCount,
            roles: [...pool.roles].join(","),
            source: "creator_unlock",
            sourceStarId: pool.sourceStarId,
            spawnedStarId: pool.launchStarId,
            unallocatedCp: Math.max(
              0,
              fanletterFounderUniverseCpPoolTotal - pool.allocatedCp,
            ),
            x402Ready: true,
          },
          object: buildStarActor(pool.sourceStarId, sourceStar),
          occurredAt: pool.createdAt,
          source: "fanletter_star_influence_ledger",
          sourceId,
          starId: pool.sourceStarId,
          subject: buildStarActor(pool.launchStarId, launchStar),
          type: "cp_pool_generated",
        }),
      );
    }
  }

  if (isIncludedType("cp_earned", includeTypes)) {
    for (const row of ledgerRows) {
      const star = starsById.get(row.starId);

      events.push(
        buildEvent({
          actor: buildMemberActor(row.recipientMemberEmail),
          context: {
            cpDelta: row.cpDelta,
            creatorProgressDelta: row.creatorProgressDelta,
            influenceDelta: row.influenceDelta,
            memo: row.memo,
            source: row.source,
            sourceMemberEmail: row.sourceMemberEmail,
            targetMemberEmail: row.targetMemberEmail,
          },
          object: buildStarActor(row.starId, star),
          occurredAt: row.createdAt,
          source: "fanletter_star_influence_ledger",
          sourceId: row.sourceId,
          starId: row.starId,
          subject: row.targetMemberEmail
            ? buildMemberActor(row.targetMemberEmail)
            : null,
          type: "cp_earned",
        }),
      );
    }
  }

  return events;
}

function buildFunnelInteractionEvents({
  funnelEvents,
  includeTypes,
  starsById,
}: {
  funnelEvents: FunnelEventDocument[];
  includeTypes: Set<AgentRankReputationEventType> | null;
  starsById: StarLookup;
}) {
  const events: AgentRankReputationEvent[] = [];

  for (const funnelEvent of funnelEvents) {
    const signal = funnelEvent.agentRank;

    if (!signal || !isIncludedType(signal.eventType, includeTypes)) {
      continue;
    }

    const reputationEvent = funnelEvent.reputationEvent ?? null;
    const eventType = reputationEvent?.eventType ?? signal.eventType;
    const starId = normalizeId(reputationEvent?.targetStarId ?? signal.starId);
    const star = starId ? starsById.get(starId) : null;
    const actor = funnelEvent.memberEmail
      ? buildMemberActor(funnelEvent.memberEmail)
      : {
          id: "anonymous-fanletter-visitor",
          label: "Guest",
          type: "member" as const,
        };
    const metadataContext = funnelEvent.metadata ?? {};

    events.push(
      buildEvent({
        actor,
        context: {
          ...metadataContext,
          contentId: funnelEvent.contentId ?? null,
          funnelEventName: funnelEvent.name,
          intent: reputationEvent?.intent ?? signal.intent,
          path: funnelEvent.path ?? null,
          referralCode: funnelEvent.referralCode ?? null,
          reputationImpactCreator:
            reputationEvent?.reputationImpact.creator ?? null,
          reputationImpactDiscovery:
            reputationEvent?.reputationImpact.discovery ?? null,
          reputationImpactEconomy:
            reputationEvent?.reputationImpact.economy ?? null,
          reputationImpactNetwork:
            reputationEvent?.reputationImpact.network ?? null,
          reputationImpactTotal: reputationEvent?.reputationImpact.total ?? null,
          reputationImpactTrust: reputationEvent?.reputationImpact.trust ?? null,
          schemaVersion:
            reputationEvent?.schemaVersion ??
            agentRankReputationEventSchemaVersion,
          shareId: funnelEvent.shareId ?? null,
          source: reputationEvent?.source ?? signal.source,
          targetHref: funnelEvent.targetHref ?? null,
          universeId: reputationEvent?.universeId ?? null,
          viewportHeight: funnelEvent.viewport?.height ?? null,
          viewportWidth: funnelEvent.viewport?.width ?? null,
          ...(reputationEvent
            ? {
                actorMemberId: reputationEvent.actorMemberId,
                actorWalletAddress: reputationEvent.actorWalletAddress,
                cpDelta: reputationEvent.cpDelta,
                creatorProgressDelta: reputationEvent.creatorProgressDelta,
                influenceDelta: reputationEvent.influenceDelta,
                viewerType: reputationEvent.viewerType,
              }
            : {}),
        },
        object: starId ? buildStarActor(starId, star) : null,
        occurredAt: funnelEvent.createdAt,
        source: "fanletter_funnel_event",
        sourceId: `fanletter-funnel:${funnelEvent.eventId}`,
        starId,
        subject: funnelEvent.contentId
          ? {
              id: `content:${funnelEvent.contentId}`,
              label: funnelEvent.contentId,
              type: "platform" as const,
            }
          : null,
        type: eventType,
      }),
    );
  }

  return events;
}

function summarizeEvents(events: AgentRankReputationEvent[]) {
  const byType: Partial<Record<AgentRankReputationEventType, number>> = {};
  const memberIds = new Set<string>();
  const starIds = new Set<string>();
  let cpTotal = 0;
  let creatorWeightTotal = 0;
  let discoveryWeightTotal = 0;
  let economicWeightTotal = 0;
  let influenceTotal = 0;
  let networkEdges = 0;
  let networkWeightTotal = 0;
  let auditQualityTotal = 0;
  let auditReadyEvents = 0;
  let oracleReadyEvents = 0;
  let schemaReadyEvents = 0;

  for (const event of events) {
    byType[event.type] = (byType[event.type] ?? 0) + 1;
    cpTotal += event.economicLayer.cpDelta ?? 0;
    influenceTotal += event.economicLayer.influenceDelta ?? 0;
    creatorWeightTotal += event.reputationSignals.creatorWeight;
    discoveryWeightTotal += event.reputationSignals.discoveryWeight;
    economicWeightTotal += event.reputationSignals.economicWeight;
    networkWeightTotal += event.reputationSignals.networkWeight;
    auditQualityTotal += event.audit.qualityScore;

    if (event.audit.status === "audit_ready") {
      auditReadyEvents += 1;
    }

    if (event.type === "referral_converted") {
      networkEdges += 1;
    }

    if (event.reputationSignals.oracleReady) {
      oracleReadyEvents += 1;
    }

    if (event.schemaVersion === agentRankReputationEventSchemaVersion) {
      schemaReadyEvents += 1;
    }

    for (const actor of [event.actor, event.object, event.subject]) {
      if (!actor) {
        continue;
      }

      if (actor.type === "member") {
        memberIds.add(actor.id);
      }

      if (actor.type === "ai_star") {
        starIds.add(actor.id);
      }
    }
  }

  return {
    byType,
    cpTotal,
    creatorWeightTotal,
    discoveryWeightTotal,
    economicWeightTotal,
    generatedAt: new Date().toISOString(),
    influenceTotal,
    networkEdges,
    networkWeightTotal,
    auditReadyEvents,
    averageQualityScore: events.length
      ? Math.round(auditQualityTotal / events.length)
      : 0,
    oracleReadyEvents,
    schemaReadyEvents,
    totalEvents: events.length,
    uniqueMembers: memberIds.size,
    uniqueStars: starIds.size,
  } satisfies AgentRankReputationEventSummary;
}

function buildIncludeTypesSet(includeTypes?: AgentRankReputationEventType[]) {
  if (!includeTypes?.length) {
    return null;
  }

  const validTypes = new Set<AgentRankReputationEventType>(
    agentRankReputationEventTypes,
  );
  const requestedTypes = includeTypes.filter((type) => validTypes.has(type));

  return requestedTypes.length ? new Set(requestedTypes) : null;
}

export async function getFanletterAgentRankReputationEventFeed(
  options: GetFanletterAgentRankReputationEventsOptions = {},
): Promise<FanletterAgentRankReputationEventFeed> {
  const starId = normalizeId(options.starId);
  const memberEmail = normalizeEmail(options.memberEmail);
  const limit = normalizeLimit(options.limit);
  const includeTypes = buildIncludeTypesSet(options.includeTypes);
  const [
    starsCollection,
    membershipsCollection,
    referralCodesCollection,
    referralEdgesCollection,
    influenceLedgerCollection,
    funnelEventsCollection,
  ] = await Promise.all([
    getFanletterStarsCollection(),
    getFanletterStarFounderMembershipsCollection(),
    getFanletterStarReferralCodesCollection(),
    getFanletterStarReferralEdgesCollection(),
    getFanletterStarInfluenceLedgerCollection(),
    getFunnelEventsCollection(),
  ]);
  const starFilter: Record<string, unknown> = {
    status: { $ne: "archived" },
  };

  if (starId) {
    starFilter.starId = starId;
  } else if (memberEmail) {
    starFilter.ownerEmail = memberEmail;
  }

  const membershipFilter: Record<string, unknown> = {};
  const referralCodeFilter: Record<string, unknown> = {};
  const referralEdgeFilter: Record<string, unknown> = {};
  const ledgerFilter: Record<string, unknown> = {};
  const funnelEventFilter: Record<string, unknown> = {
    agentRank: { $exists: true, $ne: null },
  };

  if (starId) {
    membershipFilter.starId = starId;
    referralCodeFilter.starId = starId;
    referralEdgeFilter.starId = starId;
    ledgerFilter.starId = starId;
    funnelEventFilter["agentRank.starId"] = starId;
  }

  if (memberEmail) {
    membershipFilter.memberEmail = memberEmail;
    referralCodeFilter.memberEmail = memberEmail;
    referralEdgeFilter.$or = [
      { sourceMemberEmail: memberEmail },
      { targetMemberEmail: memberEmail },
    ];
    ledgerFilter.$or = [
      { recipientMemberEmail: memberEmail },
      { sourceMemberEmail: memberEmail },
      { targetMemberEmail: memberEmail },
    ];
    funnelEventFilter.memberEmail = memberEmail;
  }

  if (includeTypes) {
    funnelEventFilter["agentRank.eventType"] = {
      $in: [...includeTypes],
    };
  }

  const [
    stars,
    memberships,
    referralCodes,
    referralEdges,
    ledgerRows,
    funnelEvents,
  ] =
    await Promise.all([
      starsCollection
        .find(starFilter)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .toArray(),
      membershipsCollection
        .find(membershipFilter)
        .sort({ joinedAt: -1 })
        .limit(limit)
        .toArray(),
      referralCodesCollection
        .find(referralCodeFilter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray(),
      referralEdgesCollection
        .find(referralEdgeFilter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray(),
      influenceLedgerCollection
        .find(ledgerFilter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray(),
      funnelEventsCollection
        .find(funnelEventFilter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray(),
    ]);
  const starsById = new Map(stars.map((star) => [star.starId, star]));
  const missingStarIds = new Set(
    [
      ...memberships.map((membership) => membership.starId),
      ...referralCodes.map((referralCode) => referralCode.starId),
      ...referralEdges.map((edge) => edge.starId),
      ...ledgerRows.map((row) => row.starId),
      ...ledgerRows
        .map((row) => parseCreatorLaunchCpPoolSourceId(row.sourceId)?.launchStarId)
        .filter((relatedStarId): relatedStarId is string =>
          Boolean(relatedStarId),
        ),
      ...funnelEvents
        .map((event) => normalizeId(event.agentRank?.starId))
        .filter(Boolean),
    ].filter((relatedStarId) => relatedStarId && !starsById.has(relatedStarId)),
  );

  if (missingStarIds.size > 0) {
    const relatedStars = await starsCollection
      .find({
        starId: { $in: [...missingStarIds] },
      })
      .toArray();

    for (const relatedStar of relatedStars) {
      starsById.set(relatedStar.starId, relatedStar);
    }
  }

  const events = [
    ...buildStarEvents({
      includeTypes,
      stars,
    }),
    ...buildMembershipEvents({
      includeTypes,
      memberships,
      starsById,
    }),
    ...buildReferralCodeEvents({
      includeTypes,
      referralCodes,
      starsById,
    }),
    ...buildReferralEdgeEvents({
      includeTypes,
      referralEdges,
      starsById,
    }),
    ...buildInfluenceLedgerEvents({
      includeTypes,
      ledgerRows,
      starsById,
    }),
    ...buildFunnelInteractionEvents({
      funnelEvents,
      includeTypes,
      starsById,
    }),
  ]
    .sort((left, right) => {
      const timeDelta =
        new Date(right.occurredAt).getTime() -
        new Date(left.occurredAt).getTime();

      return timeDelta || left.eventId.localeCompare(right.eventId);
    })
    .slice(0, limit);
  const generatedAt = new Date().toISOString();

  return {
    events,
    generatedAt,
    roadmap: [...defaultRoadmap],
    summary: {
      ...summarizeEvents(events),
      generatedAt,
    },
  };
}

export async function getFanletterAgentRankReputationEventById(
  eventId: string,
  options: Omit<GetFanletterAgentRankReputationEventsOptions, "limit"> = {},
) {
  const normalizedEventId = eventId.trim();

  if (!normalizedEventId) {
    return null;
  }

  const feed = await getFanletterAgentRankReputationEventFeed({
    ...options,
    limit: 250,
  });

  return (
    feed.events.find((event) => event.eventId === normalizedEventId) ?? null
  );
}
