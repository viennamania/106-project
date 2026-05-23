import type { ContentSocialSummaryRecord } from "@/lib/content";

export const FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD = 6;

export type FanletterNewsSourceRevealState = {
  count: number;
  requestedByViewer: boolean;
  threshold: number;
  unlocked: boolean;
};

export function createFanletterNewsSourceRevealState(
  social: ContentSocialSummaryRecord,
): FanletterNewsSourceRevealState {
  const count = Math.max(0, Math.floor(social.sourceRevealCount));
  const threshold = FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD;

  return {
    count,
    requestedByViewer: social.sourceRevealRequestedByViewer,
    threshold,
    unlocked: count >= threshold,
  };
}
