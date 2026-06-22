import "server-only";

import { createHash, randomBytes, randomUUID } from "crypto";
import type { Collection } from "mongodb";

import { getMongoClient } from "@/lib/mongodb";

/**
 * Seller workspace + credits — the decoupled, crypto-free spine of the
 * seller-facing lookbook product.
 *
 * Sellers do NOT need a wallet, USDT, or a fanletter membership. A workspace is
 * created from an email and identified by an unguessable workspaceKey (stored
 * hashed). Spending is in money-bought "credits" (1 credit = 1 lookbook shot),
 * fully separate from the crypto referral points system.
 */

export const SELLER_TRIAL_CREDITS = 8; // free trial: ~2 four-shot sets
export const INSUFFICIENT_SELLER_CREDITS_ERROR = "INSUFFICIENT_SELLER_CREDITS";

export type SellerWorkspaceDocument = {
  workspaceId: string;
  workspaceKeyHash: string;
  email: string;
  creditBalance: number;
  createdAt: Date;
  updatedAt: Date;
};

type SellerCreditLedgerDocument = {
  ledgerEntryId: string;
  workspaceId: string;
  delta: number;
  type: "trial" | "purchase" | "spend" | "refund";
  sourceId: string;
  memo: string | null;
  createdAt: Date;
};

/** License granted to the seller for lookbooks they generate. See /lookbook/terms. */
export const SELLER_LOOKBOOK_LICENSE = "seller-commercial-nonexclusive-v1";

type SellerLookbookGenerationDocument = {
  generationId: string;
  workspaceId: string;
  starId: string;
  imageUrls: string[];
  imageCount: number;
  license: string;
  createdAt: Date;
};

export type SellerWorkspacePublic = {
  workspaceId: string;
  email: string;
  creditBalance: number;
};

function getDbName() {
  const dbName = process.env.MONGODB_DB_NAME;

  if (!dbName) {
    throw new Error("MONGODB_DB_NAME is not configured.");
  }

  return dbName;
}

let workspacesPromise: Promise<Collection<SellerWorkspaceDocument>> | null = null;
let ledgerPromise: Promise<Collection<SellerCreditLedgerDocument>> | null = null;
let generationsPromise: Promise<
  Collection<SellerLookbookGenerationDocument>
> | null = null;

async function getWorkspacesCollection() {
  if (!workspacesPromise) {
    workspacesPromise = (async () => {
      const client = await getMongoClient();
      const collection = client
        .db(getDbName())
        .collection<SellerWorkspaceDocument>(
          process.env.MONGODB_SELLER_WORKSPACES_COLLECTION ?? "sellerWorkspaces",
        );
      await collection.createIndex({ workspaceId: 1 }, { unique: true });
      return collection;
    })();
  }

  return workspacesPromise;
}

async function getLedgerCollection() {
  if (!ledgerPromise) {
    ledgerPromise = (async () => {
      const client = await getMongoClient();
      const collection = client
        .db(getDbName())
        .collection<SellerCreditLedgerDocument>(
          process.env.MONGODB_SELLER_CREDIT_LEDGER_COLLECTION ??
            "sellerCreditLedger",
        );
      await collection.createIndex({ ledgerEntryId: 1 }, { unique: true });
      await collection.createIndex({ workspaceId: 1, createdAt: -1 });
      return collection;
    })();
  }

  return ledgerPromise;
}

async function getGenerationsCollection() {
  if (!generationsPromise) {
    generationsPromise = (async () => {
      const client = await getMongoClient();
      const collection = client
        .db(getDbName())
        .collection<SellerLookbookGenerationDocument>(
          process.env.MONGODB_SELLER_LOOKBOOK_GENERATIONS_COLLECTION ??
            "sellerLookbookGenerations",
        );
      await collection.createIndex({ workspaceId: 1, createdAt: -1 });
      return collection;
    })();
  }

  return generationsPromise;
}

/**
 * Record provenance + the granted license for a generated lookbook. Best-effort:
 * the caller should not fail the response if this throws.
 */
export async function recordSellerLookbookGeneration({
  imageUrls,
  starId,
  workspaceId,
}: {
  imageUrls: string[];
  starId: string;
  workspaceId: string;
}): Promise<void> {
  try {
    const collection = await getGenerationsCollection();
    await collection.insertOne({
      createdAt: new Date(),
      generationId: randomUUID(),
      imageCount: imageUrls.length,
      imageUrls,
      license: SELLER_LOOKBOOK_LICENSE,
      starId,
      workspaceId,
    });
  } catch {
    // provenance logging is best-effort
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashKey(workspaceKey: string) {
  return createHash("sha256").update(workspaceKey).digest("hex");
}

function toPublic(doc: SellerWorkspaceDocument): SellerWorkspacePublic {
  return {
    creditBalance: doc.creditBalance,
    email: doc.email,
    workspaceId: doc.workspaceId,
  };
}

/**
 * Create a brand-new seller workspace (email optional but recommended for
 * receipts). Grants free trial credits. Returns the raw workspaceKey ONCE — the
 * client stores it; we only persist its hash.
 */
export async function createSellerWorkspace({
  email,
}: {
  email?: string | null;
}): Promise<{ workspace: SellerWorkspacePublic; workspaceKey: string }> {
  const workspaces = await getWorkspacesCollection();
  const ledger = await getLedgerCollection();
  const now = new Date();
  const workspaceId = randomUUID();
  const workspaceKey = randomBytes(24).toString("hex");

  const doc: SellerWorkspaceDocument = {
    createdAt: now,
    creditBalance: SELLER_TRIAL_CREDITS,
    email: email ? normalizeEmail(email) : "",
    updatedAt: now,
    workspaceId,
    workspaceKeyHash: hashKey(workspaceKey),
  };

  await workspaces.insertOne(doc);
  await ledger.insertOne({
    createdAt: now,
    delta: SELLER_TRIAL_CREDITS,
    ledgerEntryId: `${workspaceId}:trial`,
    memo: "free trial",
    sourceId: "trial",
    type: "trial",
    workspaceId,
  });

  return { workspace: toPublic(doc), workspaceKey };
}

export async function authorizeSellerWorkspace({
  workspaceId,
  workspaceKey,
}: {
  workspaceId?: string | null;
  workspaceKey?: string | null;
}): Promise<SellerWorkspaceDocument | null> {
  if (!workspaceId?.trim() || !workspaceKey?.trim()) {
    return null;
  }

  const workspaces = await getWorkspacesCollection();
  const doc = await workspaces.findOne({ workspaceId: workspaceId.trim() });

  if (!doc || doc.workspaceKeyHash !== hashKey(workspaceKey.trim())) {
    return null;
  }

  return doc;
}

export async function getSellerWorkspacePublic(
  workspaceId: string,
): Promise<SellerWorkspacePublic | null> {
  const workspaces = await getWorkspacesCollection();
  const doc = await workspaces.findOne({ workspaceId });

  return doc ? toPublic(doc) : null;
}

/** Atomic guard-decrement of credits + a spend ledger entry. */
export async function chargeSellerCredits({
  amount,
  memo,
  sourceId,
  workspaceId,
}: {
  amount: number;
  memo?: string | null;
  sourceId: string;
  workspaceId: string;
}): Promise<number> {
  if (amount <= 0) {
    throw new Error("amount must be positive.");
  }

  const client = await getMongoClient();
  const workspaces = await getWorkspacesCollection();
  const ledger = await getLedgerCollection();
  const session = client.startSession();
  const now = new Date();
  let newBalance = 0;

  try {
    await session.withTransaction(async () => {
      const result = await workspaces.findOneAndUpdate(
        { creditBalance: { $gte: amount }, workspaceId },
        { $inc: { creditBalance: -amount }, $set: { updatedAt: now } },
        { returnDocument: "after", session },
      );

      if (!result) {
        throw new Error(INSUFFICIENT_SELLER_CREDITS_ERROR);
      }

      newBalance = result.creditBalance;

      await ledger.insertOne(
        {
          createdAt: now,
          delta: -amount,
          ledgerEntryId: `${workspaceId}:spend:${sourceId}`,
          memo: memo ?? null,
          sourceId,
          type: "spend",
          workspaceId,
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  return newBalance;
}

export async function refundSellerCredits({
  amount,
  sourceId,
  workspaceId,
}: {
  amount: number;
  sourceId: string;
  workspaceId: string;
}): Promise<void> {
  if (amount <= 0) {
    return;
  }

  const client = await getMongoClient();
  const workspaces = await getWorkspacesCollection();
  const ledger = await getLedgerCollection();
  const session = client.startSession();
  const now = new Date();

  try {
    await session.withTransaction(async () => {
      await workspaces.updateOne(
        { workspaceId },
        { $inc: { creditBalance: amount }, $set: { updatedAt: now } },
        { session },
      );
      await ledger.insertOne(
        {
          createdAt: now,
          delta: amount,
          ledgerEntryId: `${workspaceId}:refund:${sourceId}`,
          memo: "refund",
          sourceId,
          type: "refund",
          workspaceId,
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
}

/** Add purchased credits (called after a verified payment). Idempotent by sourceId. */
export async function grantSellerCredits({
  amount,
  memo,
  sourceId,
  workspaceId,
}: {
  amount: number;
  memo?: string | null;
  sourceId: string;
  workspaceId: string;
}): Promise<number> {
  if (amount <= 0) {
    throw new Error("amount must be positive.");
  }

  const ledger = await getLedgerCollection();
  const ledgerEntryId = `${workspaceId}:purchase:${sourceId}`;
  const existing = await ledger.findOne({ ledgerEntryId });

  if (existing) {
    const current = await getSellerWorkspacePublic(workspaceId);
    return current?.creditBalance ?? 0;
  }

  const client = await getMongoClient();
  const workspaces = await getWorkspacesCollection();
  const session = client.startSession();
  const now = new Date();
  let newBalance = 0;

  try {
    await session.withTransaction(async () => {
      const result = await workspaces.findOneAndUpdate(
        { workspaceId },
        { $inc: { creditBalance: amount }, $set: { updatedAt: now } },
        { returnDocument: "after", session },
      );

      if (!result) {
        throw new Error("Workspace not found.");
      }

      newBalance = result.creditBalance;

      await ledger.insertOne(
        {
          createdAt: now,
          delta: amount,
          ledgerEntryId,
          memo: memo ?? null,
          sourceId,
          type: "purchase",
          workspaceId,
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  return newBalance;
}
