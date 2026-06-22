import "server-only";

import type { Collection } from "mongodb";

import {
  getCreatorProfilesCollection,
  getMembersCollection,
  getMongoClient,
  getPointLedgerCollection,
} from "@/lib/mongodb";
import { awardBonusPointsForMember } from "@/lib/points-service";

const LOOKBOOK_ROYALTY_MEMO = "lookbook model royalty";

/** Royalty points credited to a star owner per shot a seller generates with it. */
export const LOOKBOOK_MODEL_ROYALTY_POINTS_PER_SHOT = 10;

type SellerStarSettingsDocument = {
  starId: string;
  optIn: boolean;
  updatedAt: Date;
};

let settingsPromise: Promise<Collection<SellerStarSettingsDocument>> | null =
  null;

function getDbName() {
  const dbName = process.env.MONGODB_DB_NAME;

  if (!dbName) {
    throw new Error("MONGODB_DB_NAME is not configured.");
  }

  return dbName;
}

async function getStarSettingsCollection() {
  if (!settingsPromise) {
    settingsPromise = (async () => {
      const client = await getMongoClient();
      const collection = client
        .db(getDbName())
        .collection<SellerStarSettingsDocument>(
          process.env.MONGODB_SELLER_STAR_SETTINGS_COLLECTION ??
            "sellerStarSettings",
        );
      await collection.createIndex({ starId: 1 }, { unique: true });
      return collection;
    })();
  }

  return settingsPromise;
}

export async function getStarOptIn(starId: string): Promise<boolean> {
  if (!starId?.trim()) {
    return false;
  }

  const collection = await getStarSettingsCollection();
  const doc = await collection.findOne({ starId: starId.trim() });

  return doc?.optIn ?? false;
}

export async function setStarOptIn(
  starId: string,
  optIn: boolean,
): Promise<void> {
  if (!starId?.trim()) {
    return;
  }

  const collection = await getStarSettingsCollection();
  await collection.updateOne(
    { starId: starId.trim() },
    { $set: { optIn, updatedAt: new Date() } },
    { upsert: true },
  );
}

async function getOptedInStarIds(): Promise<Set<string>> {
  const collection = await getStarSettingsCollection();
  const docs = await collection
    .find({ optIn: true })
    .project<{ starId: string }>({ starId: 1 })
    .toArray();

  return new Set(docs.map((doc) => doc.starId));
}

async function getStarOwnerEmail(starId: string): Promise<string | null> {
  const members = await getMembersCollection();
  const member = await members.findOne(
    { referralCode: starId.trim() },
    { projection: { email: 1 } },
  );

  return member?.email ?? null;
}

/**
 * Credit the star owner with model royalty points. Best-effort — never throws
 * into the generation response.
 */
export async function awardStarModelRoyalty({
  shots,
  sourceId,
  starId,
}: {
  shots: number;
  sourceId: string;
  starId: string;
}): Promise<void> {
  try {
    const points = LOOKBOOK_MODEL_ROYALTY_POINTS_PER_SHOT * Math.max(1, shots);
    const ownerEmail = await getStarOwnerEmail(starId);

    if (!ownerEmail) {
      return;
    }

    await awardBonusPointsForMember({
      ledgerEntryId: `${ownerEmail}:lookbook_royalty:${sourceId}`,
      memberEmail: ownerEmail,
      memo: LOOKBOOK_ROYALTY_MEMO,
      points,
      sourceId,
    });
  } catch {
    // royalty is best-effort
  }
}

/** Total model royalty points a star owner has earned from seller lookbooks. */
export async function getStarRoyaltyTotal(starId: string): Promise<number> {
  try {
    const ownerEmail = await getStarOwnerEmail(starId);

    if (!ownerEmail) {
      return 0;
    }

    const ledger = await getPointLedgerCollection();
    const rows = await ledger
      .aggregate<{ total: number }>([
        { $match: { memberEmail: ownerEmail, memo: LOOKBOOK_ROYALTY_MEMO } },
        { $group: { _id: null, total: { $sum: "$delta" } } },
      ])
      .toArray();

    return rows[0]?.total ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Public AI-star catalog for the seller lookbook product.
 *
 * The seller's model is ALWAYS a fanletter AI star (never an arbitrary upload).
 * Stars are sourced from creator profiles that have an avatar image. Sellers
 * pick a star by id; the server resolves the actual image so the model can only
 * ever be an AI star.
 */

export type SellerStar = { id: string; name: string; images: string[] };

const STAR_LIMIT = 24;
const IMAGES_PER_STAR = 6;

type AvatarCandidateLike = { url?: string | null } | null | undefined;

function buildImages(
  avatarImageUrl?: string | null,
  avatarImageSet?: AvatarCandidateLike[] | null,
): string[] {
  const urls = [
    avatarImageUrl ?? "",
    ...(avatarImageSet ?? []).map((candidate) => candidate?.url ?? ""),
  ].filter((url): url is string => typeof url === "string" && url.length > 0);

  return Array.from(new Set(urls)).slice(0, IMAGES_PER_STAR);
}

export async function getSellerStars(): Promise<SellerStar[]> {
  const collection = await getCreatorProfilesCollection();
  const docs = await collection
    .find({ avatarImageUrl: { $type: "string", $ne: "" } })
    .project<{
      referralCode: string;
      displayName?: string | null;
      avatarImageUrl?: string | null;
      avatarImageSet?: AvatarCandidateLike[] | null;
      characterPersona?: { name?: string | null } | null;
      updatedAt?: Date;
    }>({
      avatarImageSet: 1,
      avatarImageUrl: 1,
      characterPersona: 1,
      displayName: 1,
      referralCode: 1,
      updatedAt: 1,
    })
    .sort({ updatedAt: -1 })
    .limit(STAR_LIMIT)
    .toArray();

  const optedIn = await getOptedInStarIds();

  return docs
    .map((doc) => ({
      id: doc.referralCode,
      images: buildImages(doc.avatarImageUrl, doc.avatarImageSet),
      name:
        doc.characterPersona?.name?.trim() ||
        doc.displayName?.trim() ||
        doc.referralCode,
    }))
    .filter(
      (star) =>
        Boolean(star.id) && star.images.length > 0 && optedIn.has(star.id),
    );
}

export async function resolveSellerStarImage(
  starId: string | null | undefined,
  imageIndex: number,
): Promise<string | null> {
  if (!starId?.trim()) {
    return null;
  }

  // Only opted-in stars may be used as a model.
  if (!(await getStarOptIn(starId))) {
    return null;
  }

  const collection = await getCreatorProfilesCollection();
  const doc = await collection.findOne(
    { referralCode: starId.trim() },
    { projection: { avatarImageSet: 1, avatarImageUrl: 1 } },
  );

  if (!doc) {
    return null;
  }

  const images = buildImages(doc.avatarImageUrl, doc.avatarImageSet);

  if (images.length === 0) {
    return null;
  }

  const safeIndex = Number.isFinite(imageIndex)
    ? Math.max(0, Math.min(images.length - 1, Math.floor(imageIndex)))
    : 0;

  return images[safeIndex];
}
