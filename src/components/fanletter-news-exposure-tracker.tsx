"use client";

import { useEffect, useRef } from "react";

import type {
  FunnelEventMetadata,
  FunnelEventName,
} from "@/lib/funnel";
import { trackFunnelEvent } from "@/lib/funnel-client";

type FanletterNewsExposureEventName = Extract<
  FunnelEventName,
  "fanletter_news_cut_view" | "fanletter_news_report_view"
>;

type FanletterNewsExposureTrackerProps = {
  contentId?: string | null;
  eventName: FanletterNewsExposureEventName;
  metadata?: FunnelEventMetadata;
  referralCode?: string | null;
  shareId?: string | null;
  targetHref?: string | null;
};

export function FanletterNewsExposureTracker({
  contentId,
  eventName,
  metadata,
  referralCode,
  shareId,
  targetHref,
}: FanletterNewsExposureTrackerProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) {
      return;
    }

    trackedRef.current = true;
    trackFunnelEvent(eventName, {
      contentId,
      metadata,
      referralCode,
      shareId,
      targetHref,
    });
  }, [contentId, eventName, metadata, referralCode, shareId, targetHref]);

  return null;
}
