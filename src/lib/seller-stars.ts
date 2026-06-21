import "server-only";

import { getCreatorProfilesCollection } from "@/lib/mongodb";

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

  return docs
    .map((doc) => ({
      id: doc.referralCode,
      images: buildImages(doc.avatarImageUrl, doc.avatarImageSet),
      name:
        doc.characterPersona?.name?.trim() ||
        doc.displayName?.trim() ||
        doc.referralCode,
    }))
    .filter((star) => Boolean(star.id) && star.images.length > 0);
}

export async function resolveSellerStarImage(
  starId: string | null | undefined,
  imageIndex: number,
): Promise<string | null> {
  if (!starId?.trim()) {
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
