import "server-only";

import type {
  FunnelEventDocument,
  FunnelEventMetadata,
  FunnelEventName,
} from "@/lib/funnel";
import { getFunnelEventsCollection } from "@/lib/mongodb";
import { normalizeReferralCode } from "@/lib/member";
import { normalizeShareId } from "@/lib/share-tracking";

const FANLETTER_NEWS_SHARE_COHORT_LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;
const FANLETTER_NEWS_SHARE_COHORT_EVENT_LIMIT = 600;
const FANLETTER_NEWS_SHARE_COHORT_MIN_EVENTS = 3;
const FANLETTER_NEWS_SHARE_COHORT_MIN_SCORE = 4;

const FANLETTER_NEWS_SHARE_COHORT_EVENT_NAMES: FunnelEventName[] = [
  "fanletter_news_cut_feed_load_more",
  "fanletter_news_cut_view",
  "fanletter_news_source_open_click",
  "share_click",
];

export type FanletterNewsShareCohortSignals = {
  contentScoreById: Map<string, number>;
  creatorScoreByReferralCode: Map<string, number>;
  reportScoreById: Map<string, number>;
  reporterScoreByReferralCode: Map<string, number>;
  totalEvents: number;
  totalScore: number;
};

function createEmptyShareCohortSignals(): FanletterNewsShareCohortSignals {
  return {
    contentScoreById: new Map(),
    creatorScoreByReferralCode: new Map(),
    reportScoreById: new Map(),
    reporterScoreByReferralCode: new Map(),
    totalEvents: 0,
    totalScore: 0,
  };
}

function readMetadataString(
  metadata: FunnelEventMetadata | undefined,
  key: string,
) {
  const value = metadata?.[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function addScore(map: Map<string, number>, key: string | null, score: number) {
  const normalizedKey = key?.trim().toUpperCase();

  if (!normalizedKey) {
    return;
  }

  map.set(normalizedKey, (map.get(normalizedKey) ?? 0) + score);
}

function getEventWeight(event: Pick<FunnelEventDocument, "name">) {
  switch (event.name) {
    case "fanletter_news_source_open_click":
      return 5;
    case "share_click":
      return 6;
    case "fanletter_news_cut_feed_load_more":
      return 3;
    case "fanletter_news_cut_view":
      return 1;
    default:
      return 0;
  }
}

function getEventContentId(event: Pick<FunnelEventDocument, "contentId" | "metadata">) {
  return (
    event.contentId?.trim() ||
    readMetadataString(event.metadata, "contentId") ||
    readMetadataString(event.metadata, "currentContentId")
  );
}

function getEventReportId(event: Pick<FunnelEventDocument, "metadata">) {
  return (
    readMetadataString(event.metadata, "reportId") ||
    readMetadataString(event.metadata, "currentReportId")
  );
}

function getEventCreatorReferralCode(
  event: Pick<FunnelEventDocument, "metadata">,
) {
  return normalizeReferralCode(
    readMetadataString(event.metadata, "creatorReferralCode") ||
      readMetadataString(event.metadata, "currentCreatorReferralCode"),
  );
}

function getEventReporterReferralCode(
  event: Pick<FunnelEventDocument, "metadata">,
) {
  return normalizeReferralCode(
    readMetadataString(event.metadata, "reporterReferralCode") ||
      readMetadataString(event.metadata, "currentReporterReferralCode"),
  );
}

export function hasFanletterNewsShareCohortSignals(
  signals: FanletterNewsShareCohortSignals | null,
): signals is FanletterNewsShareCohortSignals {
  return Boolean(
    signals &&
      signals.totalEvents >= FANLETTER_NEWS_SHARE_COHORT_MIN_EVENTS &&
      signals.totalScore >= FANLETTER_NEWS_SHARE_COHORT_MIN_SCORE,
  );
}

export async function getFanletterNewsShareCohortSignals(
  shareId: string | null,
): Promise<FanletterNewsShareCohortSignals | null> {
  const normalizedShareId = normalizeShareId(shareId);

  if (!normalizedShareId) {
    return null;
  }

  try {
    const collection = await getFunnelEventsCollection();
    const since = new Date(Date.now() - FANLETTER_NEWS_SHARE_COHORT_LOOKBACK_MS);
    const events = await collection
      .find(
        {
          createdAt: { $gte: since },
          name: { $in: FANLETTER_NEWS_SHARE_COHORT_EVENT_NAMES },
          shareId: normalizedShareId,
          $or: [{ viewerType: "guest" }, { viewerType: { $exists: false } }],
        },
        {
          projection: {
            contentId: 1,
            metadata: 1,
            name: 1,
            viewerType: 1,
          },
        },
      )
      .sort({ createdAt: -1 })
      .limit(FANLETTER_NEWS_SHARE_COHORT_EVENT_LIMIT)
      .toArray();
    const signals = createEmptyShareCohortSignals();

    for (const event of events) {
      const weight = getEventWeight(event);

      if (weight <= 0) {
        continue;
      }

      signals.totalEvents += 1;
      signals.totalScore += weight;
      addScore(signals.contentScoreById, getEventContentId(event), weight);
      addScore(signals.reportScoreById, getEventReportId(event), weight);
      addScore(
        signals.creatorScoreByReferralCode,
        getEventCreatorReferralCode(event),
        weight,
      );
      addScore(
        signals.reporterScoreByReferralCode,
        getEventReporterReferralCode(event),
        weight,
      );
    }

    return hasFanletterNewsShareCohortSignals(signals) ? signals : null;
  } catch {
    return null;
  }
}
