import "server-only";

import { randomUUID } from "crypto";
import type { Collection } from "mongodb";

import { getMongoClient } from "@/lib/mongodb";

/**
 * Member (wallet/points) lookbook generation history — the member-side
 * equivalent of the seller `sellerLookbookGenerations` provenance store. Powers
 * the studio's "my lookbooks" section + CSV export (bulk product upload).
 */

type MemberLookbookGenerationDocument = {
  generationId: string;
  memberEmail: string;
  starId: string | null;
  starName: string | null;
  garmentImageUrls: string[];
  imageUrls: string[];
  imageCount: number;
  createdAt: Date;
};

let generationsPromise: Promise<
  Collection<MemberLookbookGenerationDocument>
> | null = null;

function getDbName() {
  const dbName = process.env.MONGODB_DB_NAME;

  if (!dbName) {
    throw new Error("MONGODB_DB_NAME is not configured.");
  }

  return dbName;
}

async function getGenerationsCollection() {
  if (!generationsPromise) {
    generationsPromise = (async () => {
      const client = await getMongoClient();
      const collection = client
        .db(getDbName())
        .collection<MemberLookbookGenerationDocument>(
          process.env.MONGODB_MEMBER_LOOKBOOK_GENERATIONS_COLLECTION ??
            "memberLookbookGenerations",
        );
      await collection.createIndex({ memberEmail: 1, createdAt: -1 });
      return collection;
    })();
  }

  return generationsPromise;
}

export type MemberGenerationPublic = {
  generationId: string;
  starId: string | null;
  starName: string | null;
  garmentImageUrls: string[];
  imageUrls: string[];
  createdAt: string;
};

/** Recent lookbook generations for a member (the studio's "my lookbooks"). */
export async function getMemberLookbookGenerations(
  memberEmail: string,
  limit = 50,
): Promise<MemberGenerationPublic[]> {
  const collection = await getGenerationsCollection();
  const docs = await collection
    .find({ memberEmail })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return docs.map((doc) => ({
    createdAt: doc.createdAt.toISOString(),
    garmentImageUrls: doc.garmentImageUrls ?? [],
    generationId: doc.generationId,
    imageUrls: doc.imageUrls,
    starId: doc.starId ?? null,
    starName: doc.starName ?? null,
  }));
}

/**
 * Record a generated lookbook for history. Best-effort: the caller must not
 * fail the response if this throws.
 */
export async function recordMemberLookbookGeneration({
  garmentImageUrls,
  imageUrls,
  memberEmail,
  starId,
  starName,
}: {
  garmentImageUrls?: string[];
  imageUrls: string[];
  memberEmail: string;
  starId?: string | null;
  starName?: string | null;
}): Promise<void> {
  try {
    const collection = await getGenerationsCollection();
    await collection.insertOne({
      createdAt: new Date(),
      garmentImageUrls: garmentImageUrls ?? [],
      generationId: randomUUID(),
      imageCount: imageUrls.length,
      imageUrls,
      memberEmail,
      starId: starId ?? null,
      starName: starName ?? null,
    });
  } catch {
    // history logging is best-effort
  }
}
