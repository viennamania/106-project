"use client";

import { useEffect } from "react";

import { trackFunnelEvent } from "@/lib/funnel-client";

export function FanletterAgentRankTracker({
  starId,
}: {
  starId?: string | null;
}) {
  useEffect(() => {
    const queryStarId = new URLSearchParams(window.location.search)
      .get("starId")
      ?.trim();
    const trackedStarId = starId ?? queryStarId ?? null;

    trackFunnelEvent("content_open", {
      agentRank: {
        eventType: "content_engaged",
        intent: "agentrank_investor_page_view",
        source: "fanletter_agentrank",
        starId: trackedStarId,
      },
      metadata: {
        page: "fanletter_agentrank",
        starId: trackedStarId,
      },
    });
  }, [starId]);

  return null;
}
