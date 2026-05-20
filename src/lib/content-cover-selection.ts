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

  return (
    normalizeUrl(source.coverImageUrl) ??
    normalizeUrl(candidates.find((candidate) => normalizeUrl(candidate.url))?.url) ??
    normalizeUrl(source.contentImageUrls?.[0])
  );
}
