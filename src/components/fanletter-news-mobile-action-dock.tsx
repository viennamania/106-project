"use client";

import Link from "next/link";
import {
  Coins,
  FileText,
  HeartHandshake,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

import { FanletterChannelShareButton } from "@/components/fanletter-channel-share-button";
import type { Locale } from "@/lib/i18n";

type FanletterNewsMobileActionKind =
  | "pay"
  | "read"
  | "vote"
  | "wallet"
  | "watch";

type FanletterNewsMobileActionDockProps = {
  eyebrow: string;
  locale: Locale;
  primaryHref: string;
  primaryKind: FanletterNewsMobileActionKind;
  primaryLabel: string;
  referralCode: string | null;
  shareHref: string;
  shareSummary: string;
  shareTitle: string;
  statusLabel: string;
};

function PrimaryActionIcon({
  className,
  kind,
}: {
  className?: string;
  kind: FanletterNewsMobileActionKind;
}) {
  if (kind === "pay") {
    return <Coins className={className} />;
  }

  if (kind === "vote") {
    return <HeartHandshake className={className} />;
  }

  if (kind === "wallet") {
    return <ShieldCheck className={className} />;
  }

  if (kind === "read") {
    return <FileText className={className} />;
  }

  return <PlayCircle className={className} />;
}

function shouldShowDock() {
  return window.innerWidth < 640 && window.scrollY >= 520;
}

export function FanletterNewsMobileActionDock({
  eyebrow,
  locale,
  primaryHref,
  primaryKind,
  primaryLabel,
  referralCode,
  shareHref,
  shareSummary,
  shareTitle,
  statusLabel,
}: FanletterNewsMobileActionDockProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let frameId = 0;

    const updateVisibility = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        setIsVisible(shouldShowDock());
      });
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/12 bg-[#07100b]/96 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 text-white shadow-[0_-18px_44px_rgba(0,0,0,0.24)] backdrop-blur sm:hidden">
      <div className="mx-auto max-w-md">
        <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[0.64rem] font-black uppercase tracking-[0.14em] text-[#9bffad]">
            {eyebrow}
          </p>
          <p className="shrink-0 truncate text-[0.68rem] font-bold text-white/58">
            {statusLabel}
          </p>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_5.75rem] gap-2">
          <Link
            className="inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black !text-black transition hover:bg-[#69ff8c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#44f26e]"
            href={primaryHref}
          >
            <PrimaryActionIcon className="size-4 shrink-0" kind={primaryKind} />
            <span className="min-w-0 truncate">{primaryLabel}</span>
          </Link>
          <FanletterChannelShareButton
            className="!h-auto min-h-12 !rounded-full !border-white/14 !bg-white/10 px-3 text-xs font-black !text-white hover:!bg-white/16"
            href={shareHref}
            locale={locale}
            referralCode={referralCode}
            shareIdScope="newsreport"
            summary={shareSummary}
            title={shareTitle}
            trackingSource="fanletter-news-mobile-dock"
          />
        </div>
      </div>
    </div>
  );
}
