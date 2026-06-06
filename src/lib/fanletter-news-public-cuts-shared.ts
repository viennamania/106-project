import type {
  ContentMaturityRating,
  ContentPriceType,
  FanletterNewsReportTeaserImageDocument,
} from "@/lib/content";
import type { FanletterNewsSourceRevealState } from "@/lib/fanletter-news-source-reveal";

export const FANLETTER_NEWS_PUBLIC_CUT_INITIAL_PAGE_SIZE = 12;
export const FANLETTER_NEWS_PUBLIC_CUT_PAGE_SIZE = 12;
export const FANLETTER_NEWS_PUBLIC_CUT_SHARED_PAGE_SIZE = 4;
export const FANLETTER_NEWS_PUBLIC_CUT_MAX_PAGE_SIZE = 24;
export const FANLETTER_NEWS_PUBLIC_CUT_QUERY_PARAM = "cut";
export const FANLETTER_NEWS_PUBLIC_CUT_MAX_SLOTS = 4;

export function normalizeFanletterNewsPublicCutSlotNumber(value: unknown) {
  const candidate = typeof value === "string" ? value.trim() : "";
  const parsed = Number.parseInt(candidate, 10);

  if (
    !Number.isFinite(parsed) ||
    parsed < 1 ||
    parsed > FANLETTER_NEWS_PUBLIC_CUT_MAX_SLOTS
  ) {
    return null;
  }

  return parsed;
}

export type SerializedFanletterNewsPublicCut = {
  imageUrl: string;
  slotNumber: number;
  source: FanletterNewsReportTeaserImageDocument["source"] | "legacy_teaser";
  sourceImageUrl: string | null;
};

export type SerializedFanletterNewsPublicCutReport = {
  contentId: string;
  contentMaturityRating: ContentMaturityRating;
  coverImageUrl: string | null;
  createdAt: string;
  creatorAvatarImageUrl: string | null;
  creatorName: string;
  creatorReferralCode: string | null;
  dek: string;
  priceType: ContentPriceType;
  reporterAvatarImageUrl: string | null;
  reporterName: string;
  reporterReferralCode: string;
  reportId: string;
  sourcePublishedAt: string | null;
  title: string;
};

export type SerializedFanletterNewsPublicCutReportSlot = {
  full: boolean;
  limit: number;
  remaining: number;
  used: number;
};

export type SerializedFanletterNewsPublicCutFeedItemBase = {
  cuts: SerializedFanletterNewsPublicCut[];
  leadCut: SerializedFanletterNewsPublicCut;
  report: SerializedFanletterNewsPublicCutReport;
  reportSlot: SerializedFanletterNewsPublicCutReportSlot;
  sourceReveal: FanletterNewsSourceRevealState;
};

export type SerializedFanletterNewsPublicCutFeedItem =
  SerializedFanletterNewsPublicCutFeedItemBase & {
    vlogReportOptions?: SerializedFanletterNewsPublicCutFeedItemBase[];
  };

export type SerializedFanletterNewsPublicCutShareRecapMetric = {
  averageDwellMs: number;
  cutSlotNumber: number;
  cutViews: number;
  dwellEvents: number;
  maxDwellMs: number;
  totalDwellMs: number;
};

export type SerializedFanletterNewsPublicCutShareRecap = {
  cuts: SerializedFanletterNewsPublicCutShareRecapMetric[];
  eventCount: number;
  shareId: string;
};

export type FanletterNewsPublicCutFeedLoadResponse = {
  hasMore: boolean;
  items: SerializedFanletterNewsPublicCutFeedItem[];
  nextOffset: number;
};

export type FanletterNewsPublicCutSourceAccessState =
  | "no_video"
  | "nsfw_opt_in_required"
  | "paid_locked"
  | "playable"
  | "source_reveal_locked";

export type FanletterNewsPublicCutSource = {
  accessState: FanletterNewsPublicCutSourceAccessState;
  authorName: string;
  canViewerAccess: boolean;
  connectHref: string;
  contentId: string;
  contentMaturityRating: ContentMaturityRating;
  coverImageUrl: string | null;
  detailHref: string;
  mediaType: "image" | "text" | "video";
  paidUnlockHref: string | null;
  pinUnlockHref: string;
  previewVideoUrl: string | null;
  priceType: ContentPriceType;
  priceUsdt: string | null;
  sourceReveal: FanletterNewsSourceRevealState;
  summary: string;
  title: string;
  videoUrl: string | null;
  viewerHasPaidEntitlement: boolean;
  viewerRelation: "audience" | "owner";
};

export type FanletterNewsPublicCutSourceLoadResponse = {
  source: FanletterNewsPublicCutSource;
};
