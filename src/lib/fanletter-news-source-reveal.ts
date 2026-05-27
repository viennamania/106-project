import type { ContentSocialSummaryRecord } from "@/lib/content";

export const FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD = 6;
export const FANLETTER_NEWS_SOURCE_REVEAL_PARTICIPANT_LIMIT = 6;
export const FANLETTER_NEWS_SOURCE_REVEAL_FAN_UNLOCK_REWARD_POINTS = 100;

export type FanletterNewsSourceRevealParticipant = {
  avatarImageUrl: string | null;
  displayName: string;
  referralCode: string | null;
  requestedAt: string | null;
};

export type FanletterNewsSourceRevealState = {
  count: number;
  participants: FanletterNewsSourceRevealParticipant[];
  requestedByViewer: boolean;
  threshold: number;
  unlocked: boolean;
};

export function createFanletterNewsSourceRevealState(
  social: ContentSocialSummaryRecord,
  options?: {
    participants?: FanletterNewsSourceRevealParticipant[];
  },
): FanletterNewsSourceRevealState {
  const count = Math.max(0, Math.floor(social.sourceRevealCount));
  const threshold = FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD;

  return {
    count,
    participants: options?.participants ?? [],
    requestedByViewer: social.sourceRevealRequestedByViewer,
    threshold,
    unlocked: count >= threshold,
  };
}
