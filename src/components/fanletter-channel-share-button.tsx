"use client";

import { Check, Loader2, Share2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { Locale } from "@/lib/i18n";
import { trackFunnelEvent } from "@/lib/funnel-client";
import { cn } from "@/lib/utils";
import {
  createShareId,
  setShareIdOnHref,
} from "@/lib/share-tracking";

type ShareState = "copied" | "error" | "idle" | "sharing";

type FanletterPromotionalShareConfig = {
  creatorReferralCode: string;
  sponsorSlug?: string;
};

type FanletterChannelShareButtonProps = {
  className?: string;
  href: string;
  locale: Locale;
  promotionalShare?: FanletterPromotionalShareConfig;
  referralCode: string | null;
  shareIdScope?: string;
  summary: string;
  title: string;
  trackingSource?: string;
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        copied: "링크 복사됨",
        error: "공유 실패",
        idle: "공유하기",
        sharing: "공유 중",
      }
    : {
        copied: "Link copied",
        error: "Share failed",
        idle: "Share",
        sharing: "Sharing",
      };
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.left = "-9999px";
  textarea.style.position = "fixed";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function buildPromotionalShareUrl({
  locale,
  promotionalShare,
  referralCode,
  shareId,
}: {
  locale: Locale;
  promotionalShare: FanletterPromotionalShareConfig;
  referralCode: string | null;
  shareId: string;
}) {
  const url = new URL(
    `/${locale}/fanletter/share/${encodeURIComponent(shareId)}`,
    window.location.origin,
  );

  url.searchParams.set("creator", promotionalShare.creatorReferralCode);

  if (referralCode) {
    url.searchParams.set("ref", referralCode);
  }

  if (promotionalShare.sponsorSlug) {
    url.searchParams.set("sponsor", promotionalShare.sponsorSlug);
  }

  return url.toString();
}

export function FanletterChannelShareButton({
  className,
  href,
  locale,
  promotionalShare,
  referralCode,
  shareIdScope = "channel",
  summary,
  title,
  trackingSource = "fanletter-creator-channel",
}: FanletterChannelShareButtonProps) {
  const copy = getCopy(locale);
  const [state, setState] = useState<ShareState>("idle");

  useEffect(() => {
    if (state !== "copied" && state !== "error") {
      return;
    }

    const timeout = window.setTimeout(() => {
      setState("idle");
    }, 2200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [state]);

  const handleShare = useCallback(async () => {
    const nextShareId = createShareId(shareIdScope);
    const absoluteHref = new URL(href, window.location.origin).toString();
    const shareUrl = promotionalShare
      ? buildPromotionalShareUrl({
          locale,
          promotionalShare,
          referralCode,
          shareId: nextShareId,
        })
      : setShareIdOnHref(absoluteHref, nextShareId);

    trackFunnelEvent("share_click", {
      metadata: {
        promotionalShare: Boolean(promotionalShare),
        source: trackingSource,
        sponsorSlug: promotionalShare?.sponsorSlug ?? null,
      },
      referralCode,
      shareId: nextShareId,
      targetHref: shareUrl,
    });

    if (typeof navigator.share === "function") {
      setState("sharing");

      try {
        await navigator.share({
          text: summary,
          title,
          url: shareUrl,
        });
        setState("idle");
        return;
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          error.name === "AbortError"
        ) {
          setState("idle");
          return;
        }
      }
    }

    try {
      await copyToClipboard(shareUrl);
      setState("copied");
    } catch {
      setState("error");
    }
  }, [
    href,
    locale,
    promotionalShare,
    referralCode,
    shareIdScope,
    summary,
    title,
    trackingSource,
  ]);

  const label =
    state === "copied"
      ? copy.copied
      : state === "error"
        ? copy.error
        : state === "sharing"
          ? copy.sharing
          : copy.idle;

  return (
    <button
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/16 px-5 text-sm font-semibold text-white transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-70",
        className,
      )}
      disabled={state === "sharing"}
      onClick={() => {
        void handleShare();
      }}
      type="button"
    >
      {state === "sharing" ? (
        <Loader2 className="size-4 animate-spin" />
      ) : state === "copied" ? (
        <Check className="size-4" />
      ) : (
        <Share2 className="size-4" />
      )}
      {label}
    </button>
  );
}
