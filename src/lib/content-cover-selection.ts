import type {
  ContentCoverImageCandidate,
  ContentCoverImagePlacement,
} from "@/lib/content";

type ContentCoverSource = {
  contentImageUrls?: readonly string[] | null;
  coverImageCandidates?: readonly ContentCoverImageCandidate[] | null;
  coverImageUrl?: string | null;
};

function normalizeUrl(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";

  return normalized || null;
}

function findCandidateForPlacement(
  candidates: readonly ContentCoverImageCandidate[],
  placement: ContentCoverImagePlacement,
) {
  return candidates.find((candidate) =>
    candidate.placements?.includes(placement),
  );
}

function getFrameCandidateScore(candidate: ContentCoverImageCandidate) {
  if (!normalizeUrl(candidate.url)) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestampSec = candidate.timestampSec ?? 0;
  const hasKnownDimensions = Boolean(candidate.width && candidate.height);
  const timingScore =
    timestampSec >= 4
      ? timestampSec >= 7
        ? 3
        : 2
      : timestampSec >= 2.8
        ? 1
        : 0;

  return timingScore + (hasKnownDimensions ? 0.25 : 0);
}

function findBestFrameCandidate(
  candidates: readonly ContentCoverImageCandidate[],
) {
  return [...candidates]
    .filter((candidate) => candidate.source === "frame")
    .sort(
      (left, right) =>
        getFrameCandidateScore(right) - getFrameCandidateScore(left),
    )[0];
}

export function resolveContentCoverImageUrl(
  source: ContentCoverSource,
  options: {
    fallbackPlacements?: ContentCoverImagePlacement[];
    placement?: ContentCoverImagePlacement;
  } = {},
) {
  const candidates = source.coverImageCandidates ?? [];
  const placements = [
    options.placement,
    ...(options.fallbackPlacements ?? []),
  ].filter((placement): placement is ContentCoverImagePlacement =>
    Boolean(placement),
  );

  for (const placement of placements) {
    const candidate = findCandidateForPlacement(candidates, placement);
    const candidateUrl = normalizeUrl(candidate?.url);

    if (candidateUrl) {
      return candidateUrl;
    }
  }

  const bestFrameCandidateUrl = normalizeUrl(findBestFrameCandidate(candidates)?.url);

  if (bestFrameCandidateUrl) {
    return bestFrameCandidateUrl;
  }

  return (
    normalizeUrl(source.coverImageUrl) ??
    normalizeUrl(candidates.find((candidate) => normalizeUrl(candidate.url))?.url) ??
    normalizeUrl(source.contentImageUrls?.[0])
  );
}
