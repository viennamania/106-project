import "server-only";

import { randomUUID } from "crypto";
import type { Collection } from "mongodb";

import { getMongoClient } from "@/lib/mongodb";
import {
  chargeSellerCredits,
  INSUFFICIENT_SELLER_CREDITS_ERROR,
  refundSellerCredits,
} from "@/lib/seller-workspace";

/**
 * Async lookbook jobs — run heavy generation (batch image sets, video) off the
 * user-facing Vercel request, on a Railway worker. Credits are charged at
 * enqueue time and refunded if the job fails. The existing synchronous path is
 * unchanged; this is an additive queue the Railway worker drains.
 */

export type SellerJobType = "image" | "video";
export type SellerJobStatus =
  | "queued"
  | "processing"
  | "done"
  | "failed"
  | "canceled";

export type SellerJobInput = {
  starId?: string | null;
  starImageIndex?: number | null;
  garmentImageUrls?: string[];
  sceneBrief?: string | null;
  aspectRatio?: string | null;
  numImages?: number | null;
  imageUrl?: string | null; // video source
};

export type SellerJobResult = {
  imageUrls?: string[];
  videoUrl?: string | null;
};

type SellerJobDocument = {
  jobId: string;
  workspaceId: string;
  type: SellerJobType;
  status: SellerJobStatus;
  input: SellerJobInput;
  result: SellerJobResult | null;
  error: string | null;
  chargedCredits: number;
  sourceId: string;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
};

export type SellerJobPublic = {
  jobId: string;
  type: SellerJobType;
  status: SellerJobStatus;
  result: SellerJobResult | null;
  error: string | null;
  createdAt: string;
};

let jobsPromise: Promise<Collection<SellerJobDocument>> | null = null;

function getDbName() {
  const dbName = process.env.MONGODB_DB_NAME;
  if (!dbName) {
    throw new Error("MONGODB_DB_NAME is not configured.");
  }
  return dbName;
}

async function getJobsCollection() {
  if (!jobsPromise) {
    jobsPromise = (async () => {
      const client = await getMongoClient();
      const collection = client
        .db(getDbName())
        .collection<SellerJobDocument>(
          process.env.MONGODB_SELLER_LOOKBOOK_JOBS_COLLECTION ??
            "sellerLookbookJobs",
        );
      await collection.createIndex({ jobId: 1 }, { unique: true });
      await collection.createIndex({ status: 1, createdAt: 1 });
      await collection.createIndex({ workspaceId: 1, createdAt: -1 });
      return collection;
    })();
  }
  return jobsPromise;
}

function toPublic(doc: SellerJobDocument): SellerJobPublic {
  return {
    createdAt: doc.createdAt.toISOString(),
    error: doc.error,
    jobId: doc.jobId,
    result: doc.result,
    status: doc.status,
    type: doc.type,
  };
}

/** Charge credits and enqueue a job. Throws INSUFFICIENT_SELLER_CREDITS_ERROR if low. */
export async function enqueueSellerJob({
  cost,
  input,
  type,
  workspaceId,
}: {
  cost: number;
  input: SellerJobInput;
  type: SellerJobType;
  workspaceId: string;
}): Promise<SellerJobPublic> {
  const jobId = randomUUID();
  const sourceId = `job:${jobId}`;

  // Charge first; if this throws INSUFFICIENT, no job is created.
  await chargeSellerCredits({
    amount: cost,
    memo: `lookbook ${type} job`,
    sourceId,
    workspaceId,
  });

  const now = new Date();
  const doc: SellerJobDocument = {
    attempts: 0,
    chargedCredits: cost,
    createdAt: now,
    error: null,
    input,
    jobId,
    result: null,
    sourceId,
    status: "queued",
    type,
    updatedAt: now,
    workspaceId,
  };

  const collection = await getJobsCollection();
  try {
    await collection.insertOne(doc);
  } catch (error) {
    // The charge already committed; if the job row can't be written there is
    // nothing to refund it later, so refund here to avoid losing credits.
    await refundSellerCredits({ amount: cost, sourceId, workspaceId });
    throw error;
  }

  return toPublic(doc);
}

export async function getSellerJob(
  jobId: string,
  workspaceId: string,
): Promise<SellerJobPublic | null> {
  const collection = await getJobsCollection();
  const doc = await collection.findOne({ jobId, workspaceId });
  return doc ? toPublic(doc) : null;
}

export async function listSellerJobs(
  workspaceId: string,
  limit = 20,
): Promise<SellerJobPublic[]> {
  const collection = await getJobsCollection();
  const docs = await collection
    .find({ workspaceId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toPublic);
}

/** Atomically claim the oldest queued job for processing (worker side). */
export async function claimNextSellerJob(): Promise<SellerJobDocument | null> {
  const collection = await getJobsCollection();
  const now = new Date();
  const claimed = await collection.findOneAndUpdate(
    { status: "queued" },
    { $set: { status: "processing", updatedAt: now }, $inc: { attempts: 1 } },
    { returnDocument: "after", sort: { createdAt: 1 } },
  );
  return claimed ?? null;
}

export async function completeSellerJob(
  jobId: string,
  result: SellerJobResult,
): Promise<void> {
  const collection = await getJobsCollection();
  await collection.updateOne(
    { jobId },
    { $set: { status: "done", result, error: null, updatedAt: new Date() } },
  );
}

/** Mark a job failed and refund the credits charged at enqueue time. */
export async function failSellerJob(
  job: SellerJobDocument,
  message: string,
): Promise<void> {
  const collection = await getJobsCollection();
  await collection.updateOne(
    { jobId: job.jobId },
    { $set: { status: "failed", error: message, updatedAt: new Date() } },
  );

  if (job.chargedCredits > 0) {
    await refundSellerCredits({
      amount: job.chargedCredits,
      sourceId: job.sourceId,
      workspaceId: job.workspaceId,
    });
  }
}

export type SellerJobStats = {
  queued: number;
  processing: number;
  doneLastHour: number;
  failedLastHour: number;
  oldestQueuedAgeSec: number | null;
};

/**
 * Queue health snapshot for monitoring. A high `oldestQueuedAgeSec` with
 * `processing: 0` means the worker is not draining (down / unauthorized).
 */
export async function getSellerJobStats(): Promise<SellerJobStats> {
  const collection = await getJobsCollection();
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [queued, processing, doneLastHour, failedLastHour, oldest] =
    await Promise.all([
      collection.countDocuments({ status: "queued" }),
      collection.countDocuments({ status: "processing" }),
      collection.countDocuments({ status: "done", updatedAt: { $gte: hourAgo } }),
      collection.countDocuments({
        status: "failed",
        updatedAt: { $gte: hourAgo },
      }),
      collection.find({ status: "queued" }).sort({ createdAt: 1 }).limit(1).toArray(),
    ]);

  const oldestQueuedAgeSec = oldest[0]
    ? Math.round((Date.now() - oldest[0].createdAt.getTime()) / 1000)
    : null;

  return { doneLastHour, failedLastHour, oldestQueuedAgeSec, processing, queued };
}

/**
 * Cancel a job ONLY if it is still queued (the worker has not claimed it) and
 * refund the credits charged at enqueue. Returns true if it was canceled. Used
 * by the client to fall back to the synchronous path when the Railway worker
 * is not draining the queue. Atomic, so it never races a worker claim.
 */
export async function cancelSellerJob(
  jobId: string,
  workspaceId: string,
): Promise<boolean> {
  const collection = await getJobsCollection();
  const canceled = await collection.findOneAndUpdate(
    { jobId, status: "queued", workspaceId },
    { $set: { status: "canceled", updatedAt: new Date() } },
    { returnDocument: "after" },
  );

  if (!canceled) return false;

  if (canceled.chargedCredits > 0) {
    await refundSellerCredits({
      amount: canceled.chargedCredits,
      sourceId: canceled.sourceId,
      workspaceId: canceled.workspaceId,
    });
  }

  return true;
}

export { INSUFFICIENT_SELLER_CREDITS_ERROR };
