/**
 * Star Lookbook pricing (points).
 *
 * Shared between the client studio UI and the server billing logic so the
 * displayed cost and the charged cost never drift. No "server-only" import here
 * on purpose — the client component needs this too.
 *
 * NOTE: 50 points/image is a placeholder. Confirm the final point price with
 * the business before launch (referral reward is 200/80 pts for reference).
 */
export const LOOKBOOK_POINT_COST_PER_IMAGE = 50;
export const LOOKBOOK_MIN_IMAGES = 1;
export const LOOKBOOK_MAX_IMAGES = 4;

/** A short lookbook video costs more than a still (seller credits). */
export const LOOKBOOK_VIDEO_CREDITS = 8;

/**
 * Garment/source images are fetched server-side (sent to the image model), so
 * they must be restricted to our own Vercel Blob store — otherwise a client
 * could point the server at arbitrary/internal URLs (SSRF). The seller upload
 * route always returns URLs on this host.
 */
export const LOOKBOOK_BLOB_HOST =
  "t0gqytzvlsa2lapo.public.blob.vercel-storage.com";

export function isLookbookBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === LOOKBOOK_BLOB_HOST;
  } catch {
    return false;
  }
}

export function clampLookbookImageCount(numImages: number | null | undefined) {
  if (typeof numImages !== "number" || !Number.isFinite(numImages)) {
    return LOOKBOOK_MIN_IMAGES;
  }

  return Math.max(
    LOOKBOOK_MIN_IMAGES,
    Math.min(LOOKBOOK_MAX_IMAGES, Math.round(numImages)),
  );
}

export function computeLookbookPointCost(numImages: number | null | undefined) {
  return LOOKBOOK_POINT_COST_PER_IMAGE * clampLookbookImageCount(numImages);
}
