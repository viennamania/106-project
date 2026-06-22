import "server-only";

import { randomUUID } from "crypto";
import type { Collection } from "mongodb";

import { getMongoClient } from "@/lib/mongodb";

/**
 * Seller → AI star feed publish requests. Seller publishes create a DRAFT post
 * (held off the feed) plus a "pending" record here; the star owner approves or
 * rejects each one before it can go live. This is the moderation/safety layer
 * over the feed-publish feature.
 */

export type SellerFeedPublicationStatus = "pending" | "approved" | "rejected";

type SellerFeedPublicationDocument = {
  publicationId: string;
  contentId: string;
  starId: string;
  ownerEmail: string;
  workspaceId: string;
  imageUrl: string;
  status: SellerFeedPublicationStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type SellerFeedPublicationPublic = {
  publicationId: string;
  contentId: string;
  imageUrl: string;
  status: SellerFeedPublicationStatus;
  createdAt: string;
};

let promise: Promise<Collection<SellerFeedPublicationDocument>> | null = null;

function getDbName() {
  const dbName = process.env.MONGODB_DB_NAME;
  if (!dbName) {
    throw new Error("MONGODB_DB_NAME is not configured.");
  }
  return dbName;
}

async function getCollection() {
  if (!promise) {
    promise = (async () => {
      const client = await getMongoClient();
      const collection = client
        .db(getDbName())
        .collection<SellerFeedPublicationDocument>(
          process.env.MONGODB_SELLER_FEED_PUBLICATIONS_COLLECTION ??
            "sellerFeedPublications",
        );
      await collection.createIndex({ contentId: 1 }, { unique: true });
      await collection.createIndex({ ownerEmail: 1, status: 1, createdAt: -1 });
      return collection;
    })();
  }
  return promise;
}

function toPublic(
  doc: SellerFeedPublicationDocument,
): SellerFeedPublicationPublic {
  return {
    contentId: doc.contentId,
    createdAt: doc.createdAt.toISOString(),
    imageUrl: doc.imageUrl,
    publicationId: doc.publicationId,
    status: doc.status,
  };
}

export async function recordSellerFeedPublication(input: {
  contentId: string;
  starId: string;
  ownerEmail: string;
  workspaceId: string;
  imageUrl: string;
}): Promise<void> {
  const now = new Date();
  const collection = await getCollection();
  await collection.insertOne({
    contentId: input.contentId,
    createdAt: now,
    imageUrl: input.imageUrl,
    ownerEmail: input.ownerEmail,
    publicationId: randomUUID(),
    starId: input.starId,
    status: "pending",
    updatedAt: now,
    workspaceId: input.workspaceId,
  });
}

/** Pending requests on this owner's star feed (for the owner's moderation UI). */
export async function listPendingFeedPublicationsForOwner(
  ownerEmail: string,
  limit = 30,
): Promise<SellerFeedPublicationPublic[]> {
  const collection = await getCollection();
  const docs = await collection
    .find({ ownerEmail, status: "pending" })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toPublic);
}

/** A request, scoped to the owner — so an owner can only moderate their own. */
export async function getFeedPublicationForOwner(
  contentId: string,
  ownerEmail: string,
): Promise<SellerFeedPublicationDocument | null> {
  const collection = await getCollection();
  return collection.findOne({ contentId, ownerEmail });
}

export async function setFeedPublicationStatus(
  contentId: string,
  status: SellerFeedPublicationStatus,
): Promise<void> {
  const collection = await getCollection();
  await collection.updateOne(
    { contentId },
    { $set: { status, updatedAt: new Date() } },
  );
}
