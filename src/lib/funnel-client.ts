import type {
  FunnelEventMetadata,
  FunnelEventName,
} from "@/lib/funnel";

type FunnelEventPayload = {
  contentId?: string | null;
  metadata?: FunnelEventMetadata;
  path?: string | null;
  referralCode?: string | null;
  targetHref?: string | null;
};

export function trackFunnelEvent(
  name: FunnelEventName,
  payload: FunnelEventPayload = {},
) {
  if (typeof window === "undefined") {
    return;
  }

  const body = JSON.stringify({
    ...payload,
    name,
    path: payload.path ?? `${window.location.pathname}${window.location.search}`,
    viewport: {
      height: window.innerHeight,
      width: window.innerWidth,
    },
  });

  try {
    if (typeof navigator.sendBeacon === "function") {
      const sent = navigator.sendBeacon(
        "/api/funnel/events",
        new Blob([body], { type: "application/json" }),
      );

      if (sent) {
        return;
      }
    }

    void fetch("/api/funnel/events", {
      body,
      headers: {
        "Content-Type": "application/json",
      },
      keepalive: true,
      method: "POST",
    });
  } catch {}
}
