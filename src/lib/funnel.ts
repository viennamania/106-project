export const funnelEventNames = [
  "bridge_view",
  "content_open",
  "external_browser_click",
  "fanletter_news_cut_view",
  "fanletter_news_report_view",
  "fanletter_news_source_open_click",
  "feed_view_public",
  "paid_unlock_click",
  "promo_share_to_creator_channel",
  "promo_share_to_fan_only",
  "promo_share_to_onboarding",
  "promo_share_to_public_vlogs",
  "promo_share_to_service_home",
  "pwa_install_banner_view",
  "pwa_install_click",
  "pwa_install_dismiss",
  "share_click",
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
  memberEmail?: string | null;
  memberWalletAddress?: string | null;
  name: FunnelEventName;
  path?: string | null;
  referer?: string | null;
  referralCode?: string | null;
  shareId?: string | null;
  targetHref?: string | null;
  userAgent?: string | null;
  viewerType?: "guest" | "member";
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
