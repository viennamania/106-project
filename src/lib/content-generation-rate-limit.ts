import "server-only";

import { getMongoClient, getMongoConfig } from "@/lib/mongodb";

/**
 * Defensive per-member rate limit for the PAID AI-generation routes (avatar
 * candidates, cover, content image, ...). These routes call OpenAI/fal per
 * request with no incremental charge, so an authorized member (or a leaked
 * wallet+email) looping the endpoint could run up unbounded provider cost.
 *
 * This is a cost/abuse safety net, NOT the credit economy: the defaults are
 * generous (only egregious volumes are blocked) and env-tunable so the owner
 * can adjust without a redeploy. It fails OPEN — any rate-limit store hiccup
 * allows the request, so it can never break a legitimate paid generation.
 */

type ContentGenRateLimitDocument = {
  key: string;
  createdAt: Date;
};

const COLLECTION_NAME =
  process.env.MONGODB_CONTENT_GEN_RATE_LIMIT_COLLECTION ??
  "contentGenRateLimit";

// Keep records ~1 day, well beyond any rate-limit window, then let the TTL
// index reap them so the collection can't grow unbounded.
const RECORD_TTL_SECONDS = 60 * 60 * 24;

let collectionPromise: Promise<
  import("mongodb").Collection<ContentGenRateLimitDocument>
> | null = null;

async function getContentGenRateLimitCollection() {
  if (!collectionPromise) {
    collectionPromise = (async () => {
      const { dbName } = getMongoConfig();
      const client = await getMongoClient();
      const collection = client
        .db(dbName)
        .collection<ContentGenRateLimitDocument>(COLLECTION_NAME);

      await Promise.all([
        collection.createIndex({ key: 1, createdAt: -1 }),
        collection.createIndex(
          { createdAt: 1 },
          { expireAfterSeconds: RECORD_TTL_SECONDS },
        ),
      ]);

      return collection;
    })().catch((error) => {
      // Let a later call retry index/collection setup rather than caching a
      // rejected promise forever.
      collectionPromise = null;
      throw error;
    });
  }

  return collectionPromise;
}

function readPositiveIntEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export type ContentGenRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

/**
 * Records the attempt and reports whether it's within the per-key limit.
 * `key` should be a stable per-member identifier (e.g. the referral code).
 * `windowMs`/`max` may be overridden per route; both fall back to generous
 * env-tunable defaults.
 */
export async function enforceContentGenerationRateLimit(
  key: string,
  options?: {
    windowMs?: number;
    max?: number;
    /** Env var name for a per-route max override. */
    maxEnvVar?: string;
    /** Env var name for a per-route window (minutes) override. */
    windowMinutesEnvVar?: string;
  },
): Promise<ContentGenRateLimitResult> {
  const windowMs =
    options?.windowMs ??
    readPositiveIntEnv(
      options?.windowMinutesEnvVar ?? "CONTENT_GEN_RATE_LIMIT_WINDOW_MINUTES",
      60,
    ) *
      60 *
      1000;
  const max =
    options?.max ??
    readPositiveIntEnv(
      options?.maxEnvVar ?? "CONTENT_GEN_RATE_LIMIT_MAX",
      30,
    );

  try {
    const collection = await getContentGenRateLimitCollection();
    const since = new Date(Date.now() - windowMs);
    const recentCount = await collection.countDocuments({
      key,
      createdAt: { $gte: since },
    });

    if (recentCount >= max) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      };
    }

    await collection.insertOne({ key, createdAt: new Date() });

    return { allowed: true, retryAfterSeconds: 0 };
  } catch (error) {
    // Fail OPEN: never block a legitimate paid generation because the
    // rate-limit store is momentarily unavailable.
    console.error(
      "[content-gen-rate-limit] check failed — allowing the request",
      error,
    );
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
