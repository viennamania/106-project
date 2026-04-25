export const funnelEventNames = [
  "bridge_view",
  "content_open",
  "feed_view_public",
  "paid_unlock_click",
  "signup_cta_click",
] as const;

export type FunnelEventName = (typeof funnelEventNames)[number];

export type FunnelEventMetadata = Record<
  string,
  boolean | null | number | string
>;

export type FunnelEventDocument = {
  contentId?: string | null;
  createdAt: Date;
  eventId: string;
  metadata?: FunnelEventMetadata;
  name: FunnelEventName;
  path?: string | null;
  referer?: string | null;
  referralCode?: string | null;
  targetHref?: string | null;
  userAgent?: string | null;
  viewport?: {
    height: number;
    width: number;
  } | null;
};

export function isFunnelEventName(value: unknown): value is FunnelEventName {
  return (
    typeof value === "string" &&
    funnelEventNames.includes(value as FunnelEventName)
  );
}
