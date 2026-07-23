// AI Star agent — live perception signals (Phase 1.5).
// Replaces the stub zeros the orchestrator used to feed the brain with real,
// best-effort reads from the existing stack: recent feed activity (contentPosts),
// pending fan requests (fanletterFanRequests) and the Star's AgentRank reputation
// total. Every read is independent and degrades to its stub default on any
// failure (missing config, connection, unseeded Star), so a tick still runs.
// Self-contained: reuses the shared collection accessors + AgentRank score reader,
// no edits to those services.
import "server-only";

import type { Filter } from "mongodb";

import { getFanletterAgentRankScoreAggregate } from "@/lib/agentrank/score";
import type { FanletterFanRequestDocument } from "@/lib/content";
import { getLegacyFanletterStarId } from "@/lib/fanletter-founder-club";
import { normalizeReferralCode } from "@/lib/member";
import {
  getContentPostsCollection,
  getFanletterFanRequestsCollection,
  getFanletterStarsCollection,
} from "@/lib/mongodb";

import type { StarAgentSignals } from "./types";

const LEGACY_STAR_ID_PREFIX = "legacy-star-";

// How far back "recent" reaches for the posting-cadence signal.
const STAR_AGENT_RECENT_POSTS_WINDOW_DAYS = Math.max(
  1,
  Number(process.env.STAR_AGENT_RECENT_POSTS_WINDOW_DAYS) || 7,
);

// Fan requests still awaiting the Star's attention (not yet fulfilled/hidden).
const PENDING_FAN_REQUEST_STATUSES = ["new", "reviewed"] as const;

/**
 * Every case-insensitive referral-code candidate that identifies this Star's
 * creator: the Star record's owner/legacy codes plus the code embedded in a
 * `legacy-star-<code>` id. Both raw and normalized (upper-case) forms are kept
 * so a query matches however the code was persisted.
 */
function collectReferralCodes(
  starId: string,
  owner: { legacyCreatorReferralCode?: string | null; ownerReferralCode?: string | null },
): string[] {
  const candidates = [owner.ownerReferralCode, owner.legacyCreatorReferralCode];

  if (starId.startsWith(LEGACY_STAR_ID_PREFIX)) {
    const embedded = starId.slice(LEGACY_STAR_ID_PREFIX.length);
    if (embedded && getLegacyFanletterStarId(embedded) === starId) {
      candidates.push(embedded);
    }
  }

  const codes = new Set<string>();
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) {
      codes.add(trimmed);
    }
    const normalized = normalizeReferralCode(candidate);
    if (normalized) {
      codes.add(normalized);
    }
  }

  return [...codes];
}

async function countRecentPosts(referralCodes: string[]): Promise<number> {
  if (referralCodes.length === 0) {
    return 0;
  }

  try {
    const since = new Date(
      Date.now() -
        STAR_AGENT_RECENT_POSTS_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );
    const collection = await getContentPostsCollection();

    return await collection.countDocuments({
      authorReferralCode: { $in: referralCodes },
      status: "published",
      createdAt: { $gte: since },
    });
  } catch {
    return 0;
  }
}

async function countPendingFanRequests(
  referralCodes: string[],
  ownerEmail: string | null,
): Promise<number> {
  const requesterScopes: Filter<FanletterFanRequestDocument>[] = [];
  if (ownerEmail) {
    requesterScopes.push({ creatorEmail: ownerEmail });
  }
  if (referralCodes.length > 0) {
    requesterScopes.push({ creatorReferralCode: { $in: referralCodes } });
  }

  if (requesterScopes.length === 0) {
    return 0;
  }

  try {
    const collection = await getFanletterFanRequestsCollection();

    return await collection.countDocuments({
      $or: requesterScopes,
      status: { $in: [...PENDING_FAN_REQUEST_STATUSES] },
    });
  } catch {
    return 0;
  }
}

async function loadReputationImpactTotal(
  starId: string,
): Promise<number | null> {
  try {
    const aggregate = await getFanletterAgentRankScoreAggregate({ starId });
    return Number.isFinite(aggregate.score) ? aggregate.score : null;
  } catch {
    return null;
  }
}

/**
 * Snapshot the Star's recent world for a tick: posting cadence, outstanding fan
 * requests, and AgentRank reputation. Best-effort — any sub-read that fails
 * falls back to its stub value rather than aborting the tick.
 */
export async function loadStarAgentSignals(
  starId: string,
): Promise<StarAgentSignals> {
  let owner: {
    legacyCreatorReferralCode?: string | null;
    ownerEmail?: string | null;
    ownerReferralCode?: string | null;
  } = {};

  try {
    const stars = await getFanletterStarsCollection();
    const star = await stars.findOne(
      { starId },
      {
        projection: {
          legacyCreatorReferralCode: 1,
          ownerEmail: 1,
          ownerReferralCode: 1,
        },
      },
    );
    if (star) {
      owner = star;
    }
  } catch {
    // Missing config / unseeded Star: fall through with derived codes only.
  }

  const referralCodes = collectReferralCodes(starId, owner);
  const ownerEmail = owner.ownerEmail?.trim() || null;

  const [recentPosts, pendingFanRequests, reputationImpactTotal] =
    await Promise.all([
      countRecentPosts(referralCodes),
      countPendingFanRequests(referralCodes, ownerEmail),
      loadReputationImpactTotal(starId),
    ]);

  return {
    recentPosts,
    pendingFanRequests,
    reputationImpactTotal,
  };
}
