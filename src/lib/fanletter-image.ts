const FANLETTER_BLOB_HOSTNAME =
  "t0gqytzvlsa2lapo.public.blob.vercel-storage.com";

export function shouldBypassFanletterImageOptimization(
  src: string | null | undefined,
) {
  if (!src) {
    return false;
  }

  try {
    return new URL(src).hostname === FANLETTER_BLOB_HOSTNAME;
  } catch {
    return false;
  }
}
