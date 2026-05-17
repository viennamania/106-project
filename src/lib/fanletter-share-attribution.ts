import { normalizeReferralCode } from "@/lib/member";
import { normalizeShareId } from "@/lib/share-tracking";

export type FanletterShareAttribution = {
  creatorReferralCode: string;
  shareId: string;
  sponsorSlug: string | null;
};

type FanletterShareAttributionInput = {
  creatorReferralCode?: string | null;
  shareId?: string | null;
  sponsorSlug?: string | null;
};

function readUrlLikePath(value?: string | null) {
  const candidate = value?.trim();

  if (
    !candidate ||
    candidate.startsWith("//") ||
    /^[a-z][a-z\d+\-.]*:\/\//i.test(candidate)
  ) {
    return null;
  }

  try {
    return new URL(candidate, "https://fanletter.local");
  } catch {
    return null;
  }
}

export function normalizeFanletterShareAttribution(
  attribution?: FanletterShareAttributionInput | null,
): FanletterShareAttribution | null {
  const creatorReferralCode = normalizeReferralCode(
    attribution?.creatorReferralCode,
  );
  const shareId = normalizeShareId(attribution?.shareId);
  const sponsorSlug = attribution?.sponsorSlug?.trim().toLowerCase() || null;

  if (!creatorReferralCode || !shareId) {
    return null;
  }

  return {
    creatorReferralCode,
    shareId,
    sponsorSlug,
  };
}

export function readFanletterShareAttributionFromPath(
  path?: string | null,
): FanletterShareAttribution | null {
  const url = readUrlLikePath(path);

  if (!url) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const fanletterIndex = segments.indexOf("fanletter");
  const shareId =
    fanletterIndex >= 0 && segments[fanletterIndex + 1] === "share"
      ? segments[fanletterIndex + 2]
      : url.searchParams.get("shareId");
  const creatorReferralCode =
    url.searchParams.get("creator") ?? url.searchParams.get("ref");
  const sponsorSlug = url.searchParams.get("sponsor");

  return normalizeFanletterShareAttribution({
    creatorReferralCode,
    shareId,
    sponsorSlug,
  });
}

export function readFanletterShareAttributionFromReturnPath(
  path?: string | null,
): FanletterShareAttribution | null {
  const directAttribution = readFanletterShareAttributionFromPath(path);

  if (directAttribution) {
    return directAttribution;
  }

  const url = readUrlLikePath(path);

  if (!url) {
    return null;
  }

  const source = url.searchParams.get("from")?.trim().toLowerCase();
  const queryAttribution =
    source === "share"
      ? normalizeFanletterShareAttribution({
          creatorReferralCode: url.searchParams.get("creator"),
          shareId: url.searchParams.get("shareId"),
          sponsorSlug: url.searchParams.get("sponsor"),
        })
      : null;

  if (queryAttribution) {
    return queryAttribution;
  }

  return readFanletterShareAttributionFromPath(url.searchParams.get("returnTo"));
}
