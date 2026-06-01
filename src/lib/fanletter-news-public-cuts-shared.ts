import type {
  ContentMaturityRating,
  ContentPriceType,
  FanletterNewsReportTeaserImageDocument,
} from "@/lib/content";

export const FANLETTER_NEWS_PUBLIC_CUT_INITIAL_PAGE_SIZE = 12;
export const FANLETTER_NEWS_PUBLIC_CUT_PAGE_SIZE = 12;
export const FANLETTER_NEWS_PUBLIC_CUT_MAX_PAGE_SIZE = 24;

export type SerializedFanletterNewsPublicCut = {
  imageUrl: string;
  slotNumber: number;
  source: FanletterNewsReportTeaserImageDocument["source"] | "legacy_teaser";
  sourceImageUrl: string | null;
};

export type SerializedFanletterNewsPublicCutReport = {
  contentMaturityRating: ContentMaturityRating;
  createdAt: string;
  creatorName: string;
  creatorReferralCode: string | null;
  dek: string;
  priceType: ContentPriceType;
  reporterName: string;
  reporterReferralCode: string;
  reportId: string;
  sourcePublishedAt: string | null;
  title: string;
};

export type SerializedFanletterNewsPublicCutFeedItem = {
  cuts: SerializedFanletterNewsPublicCut[];
  leadCut: SerializedFanletterNewsPublicCut;
  report: SerializedFanletterNewsPublicCutReport;
};

export type FanletterNewsPublicCutFeedLoadResponse = {
  hasMore: boolean;
  items: SerializedFanletterNewsPublicCutFeedItem[];
  nextOffset: number;
};
