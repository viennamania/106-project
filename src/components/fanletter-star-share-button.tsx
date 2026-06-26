"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";

import type { Locale } from "@/lib/i18n";

const SHARE_PLATFORMS = ["Kakao", "Instagram", "X", "TikTok"] as const;

function buildPlatformHref(platform: string, shareLink: string) {
  if (platform === "X") {
    const url = new URL("https://twitter.com/intent/tweet");
    url.searchParams.set("url", shareLink);

    return url.toString();
  }

  return shareLink;
}

/**
 * Per-star invite/share action for AI star cards. Opens an inline sheet with the
 * star's referral code and share channels (Kakao/Instagram/X/TikTok), built from
 * the card's referralCode + channel link — no extra data fetch required. Lives
 * inside a card that is itself a link, so the trigger stops propagation.
 */
export function FanletterStarShareButton({
  channelPath,
  className,
  locale,
  referralCode,
}: {
  /** Locale-prefixed channel path for this star, e.g. /ko/fanletter/channel/ABC */
  channelPath: string;
  className?: string;
  locale: Locale;
  referralCode: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const isKo = locale === "ko";

  function getShareLink() {
    if (typeof window === "undefined") {
      return channelPath;
    }

    return `${window.location.origin}${channelPath}`;
  }

  async function copy(value: string, key: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500);
    } catch {
      // Clipboard may be unavailable; the visible value is still selectable.
    }
  }

  return (
    <div className={className ?? "relative"}>
      <button
        aria-expanded={open}
        aria-label={isKo ? "초대" : "Invite"}
        className="inline-flex size-9 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-700 shadow-[0_8px_20px_rgba(15,23,42,0.1)] backdrop-blur transition hover:border-zinc-300 hover:text-black"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        type="button"
      >
        <Share2 className="size-4" />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-11 z-30 w-64 rounded-2xl border border-zinc-200 bg-white p-3 text-left shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {isKo ? "초대 코드" : "Invite code"}
          </p>
          <button
            className="mt-1 flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
            onClick={() => copy(referralCode, "code")}
            type="button"
          >
            <span className="min-w-0 truncate">{referralCode}</span>
            {copied === "code" ? (
              <Check className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <Copy className="size-4 shrink-0 text-zinc-500" />
            )}
          </button>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {SHARE_PLATFORMS.map((platform) => (
              <a
                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-1 text-[0.66rem] font-semibold text-zinc-700 transition hover:border-zinc-300 hover:text-black"
                href={buildPlatformHref(platform, getShareLink())}
                key={platform}
                rel="noopener noreferrer"
                target="_blank"
              >
                {platform}
              </a>
            ))}
          </div>

          <button
            className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-full bg-black px-4 text-xs font-semibold !text-white transition hover:bg-zinc-800"
            onClick={() => copy(getShareLink(), "link")}
            type="button"
          >
            {copied === "link" ? (
              <>
                <Check className="size-4" />
                {isKo ? "링크 복사됨" : "Link copied"}
              </>
            ) : (
              <>
                <Copy className="size-4" />
                {isKo ? "초대 링크 복사" : "Copy invite link"}
              </>
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
