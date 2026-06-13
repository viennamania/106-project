"use client";

import { useEffect, useRef } from "react";

import type { AgentRankInteractionSignal } from "@/lib/agentrank/interaction-events";
import type {
  FunnelEventMetadata,
  FunnelEventName,
} from "@/lib/funnel";
import { trackFunnelEvent } from "@/lib/funnel-client";

type FanletterReputationTrackerProps = {
  agentRank: AgentRankInteractionSignal;
  contentId?: string | null;
  eventName?: FunnelEventName;
  metadata?: FunnelEventMetadata;
  referralCode?: string | null;
  shareId?: string | null;
  targetHref?: string | null;
};

export function FanletterReputationTracker({
  agentRank,
  contentId,
  eventName = "content_open",
  metadata,
  referralCode,
  shareId,
  targetHref,
}: FanletterReputationTrackerProps) {
  const didTrack = useRef(false);

  useEffect(() => {
    if (didTrack.current) {
      return;
    }

    didTrack.current = true;
    trackFunnelEvent(eventName, {
      agentRank,
      contentId,
      metadata,
      referralCode,
      shareId,
      targetHref,
    });
  }, [
    agentRank,
    contentId,
    eventName,
    metadata,
    referralCode,
    shareId,
    targetHref,
  ]);

  return null;
}
