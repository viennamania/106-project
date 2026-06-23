import "server-only";

import type { Collection } from "mongodb";

import { getMongoClient } from "@/lib/mongodb";

/**
 * Free trial for the member lookbook studio.
 *
 * Restores the "try before you buy" that the retired crypto-free guest trial
 * (8 credits) provided: a brand-new member with zero referral points can still
 * generate their first few lookbooks. This does NOT inject spendable points into
 * the economy — it simply waives the studio's point charge for the first N
 * shots per member (tracked here), so it can't be withdrawn or used elsewhere.
 */

const DEFAULT_FREE_TRIAL_SHOTS = 4;

export function getFreeTrialAllowance(): number {
  const raw = Number(process.env.LOOKBOOK_FREE_TRIAL_SHOTS);

  return Number.isFinite(raw) && raw >= 0
    ? Math.floor(raw)
    : DEFAULT_FREE_TRIAL_SHOTS;
}

type MemberLookbookTrialDocument = {
  memberEmail: string;
  used: number;
  updatedAt: Date;
};

let trialsPromise: Promise<Collection<MemberLookbookTrialDocument>> | null = null;

function getDbName() {
  const dbName = process.env.MONGODB_DB_NAME;

  if (!dbName) {
    throw new Error("MONGODB_DB_NAME is not configured.");
  }

  return dbName;
}

async function getTrialsCollection() {
  if (!trialsPromise) {
    trialsPromise = (async () => {
      const client = await getMongoClient();
      const collection = client
        .db(getDbName())
        .collection<MemberLookbookTrialDocument>(
          process.env.MONGODB_MEMBER_LOOKBOOK_TRIALS_COLLECTION ??
            "memberLookbookTrials",
        );
      await collection.createIndex({ memberEmail: 1 }, { unique: true });
      return collection;
    })();
  }

  return trialsPromise;
}

export type FreeTrialStatus = {
  allowance: number;
  used: number;
  remaining: number;
};

export async function getFreeTrialStatus(
  memberEmail: string,
): Promise<FreeTrialStatus> {
  const allowance = getFreeTrialAllowance();
  let used = 0;
  try {
    const doc = await (await getTrialsCollection()).findOne({ memberEmail });
    used = doc?.used ?? 0;
  } catch {
    // best-effort; treat as none used
  }

  return { allowance, remaining: Math.max(0, allowance - used), used };
}

/**
 * Atomically consume up to `want` free shots for a member; returns how many
 * were actually granted (0..want). The guarded update keeps the total from ever
 * exceeding the allowance even under concurrent requests.
 */
export async function consumeFreeTrialShots(
  memberEmail: string,
  want: number,
): Promise<number> {
  const allowance = getFreeTrialAllowance();

  if (want <= 0 || allowance <= 0 || !memberEmail) {
    return 0;
  }

  const collection = await getTrialsCollection();

  // Ensure the doc exists first (avoids an $inc/$setOnInsert path conflict).
  await collection.updateOne(
    { memberEmail },
    { $setOnInsert: { memberEmail, updatedAt: new Date(), used: 0 } },
    { upsert: true },
  );

  const doc = await collection.findOne({ memberEmail });
  const used = doc?.used ?? 0;
  const grant = Math.min(Math.max(0, allowance - used), want);

  if (grant <= 0) {
    return 0;
  }

  // Guard: only increment if `used` hasn't advanced past this read (concurrency).
  const result = await collection.updateOne(
    { memberEmail, used: { $lte: allowance - grant } },
    { $inc: { used: grant }, $set: { updatedAt: new Date() } },
  );

  return result.modifiedCount > 0 ? grant : 0;
}

/** Give back consumed free shots when a generation fails. Best-effort. */
export async function refundFreeTrialShots(
  memberEmail: string,
  shots: number,
): Promise<void> {
  if (shots <= 0 || !memberEmail) {
    return;
  }

  try {
    const collection = await getTrialsCollection();
    await collection.updateOne(
      { memberEmail, used: { $gte: shots } },
      { $inc: { used: -shots }, $set: { updatedAt: new Date() } },
    );
  } catch {
    // best-effort
  }
}
