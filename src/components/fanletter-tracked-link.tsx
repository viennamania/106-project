"use client";

import Link from "next/link";
import type { ComponentProps, MouseEventHandler } from "react";

import type {
  FunnelEventMetadata,
  FunnelEventName,
} from "@/lib/funnel";
import type { AgentRankInteractionSignal } from "@/lib/agentrank/interaction-events";
import { trackFunnelEvent } from "@/lib/funnel-client";

type FanletterTrackedLinkProps = Omit<
  ComponentProps<typeof Link>,
  "href" | "onClick"
> & {
  agentRank?: AgentRankInteractionSignal | null;
  contentId?: string | null;
  eventName: FunnelEventName;
  href: string;
  metadata?: FunnelEventMetadata;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  referralCode?: string | null;
  shareId?: string | null;
};

export function FanletterTrackedLink({
  agentRank,
  contentId,
  eventName,
  href,
  metadata,
  onClick,
  referralCode,
  shareId,
  ...props
}: FanletterTrackedLinkProps) {
  return (
    <Link
      {...props}
      href={href}
      onClick={(event) => {
        trackFunnelEvent(eventName, {
          agentRank,
          contentId,
          metadata,
          referralCode,
          shareId,
          targetHref: href,
        });
        onClick?.(event);
      }}
    />
  );
}
