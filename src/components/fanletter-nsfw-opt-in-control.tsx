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
  enabled,
  hiddenCount = 0,
  locale,
}: {
  className?: string;
  enabled: boolean;
  hiddenCount?: number;
  locale: Locale;
}) {
  const copy = getFanletterNsfwCopy(locale);
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const hiddenCountLabel = new Intl.NumberFormat(locale).format(hiddenCount);

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
        "rounded-lg border p-4",
        enabled
          ? "border-rose-300/50 bg-rose-950 text-white"
          : "border-black/10 bg-white text-black",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              enabled ? "bg-rose-400 text-black" : "bg-black text-white",
            )}
          >
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {enabled ? copy.enabledTitle : copy.disabledTitle}
            </p>
            <p
              className={cn(
                "mt-1 text-xs font-medium leading-5",
                enabled ? "text-white/66" : "text-black/54",
              )}
            >
              {enabled ? copy.enabledBody : copy.disabledBody}
            </p>
            {!enabled && hiddenCount > 0 ? (
              <p className="mt-2 text-xs font-semibold text-rose-700">
                {copy.hiddenCount(hiddenCountLabel)}
              </p>
            ) : null}
          </div>
        </div>
        <button
          className={cn(
            "inline-flex h-11 shrink-0 items-center justify-center rounded-full px-4 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-70",
            enabled
              ? "bg-white text-rose-950 hover:bg-rose-50"
              : "bg-black text-white hover:bg-black/82",
          )}
          disabled={isPending}
          onClick={() => {
            setOptIn(!enabled);
          }}
          type="button"
        >
          {enabled ? copy.enabledCta : copy.disabledCta}
        </button>
      </div>
    </section>
  );
}
