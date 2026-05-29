import type { FanletterNewsSourceRevealState } from "@/lib/fanletter-news-source-reveal";

export const FANLETTER_NEWS_SOURCE_REVEAL_STATE_CHANGE_EVENT =
  "fanletter-news-source-reveal-state-change";

export type FanletterNewsSourceRevealStateChangeDetail = {
  endpoint: string | null;
  reportId: string | null;
  state: FanletterNewsSourceRevealState;
};
