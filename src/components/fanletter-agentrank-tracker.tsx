"use client";

import { useEffect } from "react";

import { trackFunnelEvent } from "@/lib/funnel-client";

export function FanletterAgentRankTracker({
  starId,
}: {
  starId?: string | null;
}) {
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const queryStarId = searchParams.get("starId")?.trim();
    const coverageAction = searchParams.get("coverageAction")?.trim() ?? null;
    const trackedStarId = starId ?? queryStarId ?? null;
    const isA2AUsageCoverage = coverageAction === "a2a_usage";

    trackFunnelEvent("content_open", {
      agentRank: {
        eventType: "content_engaged",
        intent: isA2AUsageCoverage ? "a2a_usage" : "agentrank_investor_page_view",
        source: "fanletter_agentrank",
        starId: trackedStarId,
      },
      metadata: {
        a2aMockUsage: isA2AUsageCoverage,
        coverageAction,
        coverageActionStarId: trackedStarId,
        page: "fanletter_agentrank",
        starId: trackedStarId,
      },
    });
  }, [starId]);

  return null;
}
