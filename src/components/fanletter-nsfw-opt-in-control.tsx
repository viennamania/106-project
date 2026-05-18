"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  FANLETTER_NSFW_OPT_IN_COOKIE,
  FANLETTER_NSFW_OPT_IN_MAX_AGE_SECONDS,
  getFanletterNsfwCopy,
} from "@/lib/fanletter-nsfw";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function FanletterNsfwOptInControl({
  className,
  compact = false,
  disabledBody,
  disabledCta,
  disabledTitle,
  enabled,
  enabledBody,
  enabledCta,
  enabledTitle,
  hiddenCount = 0,
  hiddenCountText,
  locale,
  tone = "auto",
}: {
  className?: string;
  compact?: boolean;
  disabledBody?: string;
  disabledCta?: string;
  disabledTitle?: string;
  enabled: boolean;
  enabledBody?: string;
  enabledCta?: string;
  enabledTitle?: string;
  hiddenCount?: number;
  hiddenCountText?: string;
  locale: Locale;
  tone?: "auto" | "dark" | "light";
}) {
  const copy = getFanletterNsfwCopy(locale);
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const hiddenCountLabel = new Intl.NumberFormat(locale).format(hiddenCount);
  const isDarkTone = tone === "dark" || (tone === "auto" && enabled);
  const displayTitle = enabled
    ? enabledTitle ?? copy.enabledTitle
    : disabledTitle ?? copy.disabledTitle;
  const displayBody = enabled
    ? enabledBody ?? copy.enabledBody
    : disabledBody ?? copy.disabledBody;
  const displayCta = enabled
    ? enabledCta ?? copy.enabledCta
    : disabledCta ?? copy.disabledCta;

  function setOptIn(nextEnabled: boolean) {
    setIsPending(true);
    document.cookie = [
      `${FANLETTER_NSFW_OPT_IN_COOKIE}=${nextEnabled ? "1" : "0"}`,
      "path=/",
      `max-age=${nextEnabled ? FANLETTER_NSFW_OPT_IN_MAX_AGE_SECONDS : 0}`,
      "SameSite=Lax",
    ].join("; ");
    router.refresh();
    window.setTimeout(() => {
      setIsPending(false);
    }, 500);
  }

  return (
    <section
      className={cn(
        "rounded-lg border",
        compact ? "p-3" : "p-4",
        isDarkTone
          ? "border-rose-300/50 bg-rose-950 text-white"
          : "border-black/10 bg-white text-black",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg",
              compact ? "size-9" : "size-10",
              enabled
                ? "bg-rose-400 text-black"
                : isDarkTone
                  ? "bg-white text-rose-950"
                  : "bg-black text-white",
            )}
          >
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {displayTitle}
            </p>
            <p
              className={cn(
                "mt-1 text-xs font-medium leading-5",
                compact && "line-clamp-2",
                isDarkTone ? "text-white/66" : "text-black/54",
              )}
            >
              {displayBody}
            </p>
            {!enabled && hiddenCount > 0 ? (
              <p
                className={cn(
                  "mt-2 text-xs font-semibold",
                  isDarkTone ? "text-rose-100" : "text-rose-700",
                )}
              >
                {hiddenCountText ?? copy.hiddenCount(hiddenCountLabel)}
              </p>
            ) : null}
          </div>
        </div>
        <button
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full px-4 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-70",
            compact ? "h-10" : "h-11",
            enabled
              ? "bg-white text-rose-950 hover:bg-rose-50"
              : isDarkTone
                ? "bg-rose-300 text-rose-950 hover:bg-rose-200"
                : "bg-black text-white hover:bg-black/82",
          )}
          disabled={isPending}
          onClick={() => {
            setOptIn(!enabled);
          }}
          type="button"
        >
          {displayCta}
        </button>
      </div>
    </section>
  );
}
