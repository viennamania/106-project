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
import type { FanletterNewsSourceRevealState } from "@/lib/fanletter-news-source-reveal";
import {
  FANLETTER_NEWS_SOURCE_REVEAL_STATE_CHANGE_EVENT,
  type FanletterNewsSourceRevealStateChangeDetail,
} from "@/lib/fanletter-news-source-reveal-events";
import type { Locale } from "@/lib/i18n";

type FanletterNewsMobileActionKind =
  | "pay"
  | "read"
  | "vote"
  | "wallet"
  | "watch";

type FanletterNewsMobileActionDockProps = {
  eyebrow: string;
  initialSourceRevealState?: FanletterNewsSourceRevealState | null;
  joinedLabel?: string;
  locale: Locale;
  primaryHref: string;
  primaryKind: FanletterNewsMobileActionKind;
  primaryLabel: string;
  referralCode: string | null;
  shareHref: string;
  shareSummary: string;
  shareTitle: string;
  sourceRevealEndpoint?: string | null;
  sourceUnlockedHref?: string | null;
  sourceUnlockedKind?: Extract<FanletterNewsMobileActionKind, "pay" | "watch">;
  sourceUnlockedLabel?: string | null;
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

function formatCount(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatSourceRevealProgress(
  state: FanletterNewsSourceRevealState,
  locale: Locale,
) {
  const count = formatCount(state.count, locale);
  const threshold = formatCount(state.threshold, locale);
  const remaining = formatCount(Math.max(0, state.threshold - state.count), locale);

  return locale === "ko"
    ? `${count}/${threshold}명 참여 중 · ${remaining}명 더 필요`
    : `${count}/${threshold} fans joined · ${remaining} more needed`;
}

function getDockCopy(locale: Locale) {
  return locale === "ko"
    ? {
        openComplete: "공개 완료",
        progressEyebrow: "원본 공개",
        progressShort: (count: string, threshold: string, remaining: string) =>
          `${count}/${threshold} 참여 · ${remaining}명 남음`,
      }
    : {
        openComplete: "Open",
        progressEyebrow: "Source access",
        progressShort: (count: string, threshold: string, remaining: string) =>
          `${count}/${threshold} joined · ${remaining} left`,
      };
}

export function FanletterNewsMobileActionDock({
  eyebrow,
  initialSourceRevealState = null,
  joinedLabel,
  locale,
  primaryHref,
  primaryKind,
  primaryLabel,
  referralCode,
  shareHref,
  shareSummary,
  shareTitle,
  sourceRevealEndpoint = null,
  sourceUnlockedHref = null,
  sourceUnlockedKind = "watch",
  sourceUnlockedLabel = null,
  statusLabel,
}: FanletterNewsMobileActionDockProps) {
  const copy = getDockCopy(locale);
  const [isVisible, setIsVisible] = useState(false);
  const [sourceRevealState, setSourceRevealState] =
    useState<FanletterNewsSourceRevealState | null>(initialSourceRevealState);

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

  useEffect(() => {
    setSourceRevealState(initialSourceRevealState);
  }, [initialSourceRevealState]);

  useEffect(() => {
    if (!sourceRevealEndpoint) {
      return;
    }

    const handleSourceRevealStateChange = (event: Event) => {
      const detail = (event as CustomEvent<FanletterNewsSourceRevealStateChangeDetail>)
        .detail;

      if (!detail || detail.endpoint !== sourceRevealEndpoint) {
        return;
      }

      setSourceRevealState(detail.state);
    };

    window.addEventListener(
      FANLETTER_NEWS_SOURCE_REVEAL_STATE_CHANGE_EVENT,
      handleSourceRevealStateChange,
    );

    return () => {
      window.removeEventListener(
        FANLETTER_NEWS_SOURCE_REVEAL_STATE_CHANGE_EVENT,
        handleSourceRevealStateChange,
      );
    };
  }, [sourceRevealEndpoint]);

  if (!isVisible) {
    return null;
  }

  const sourceRevealUnlocked = Boolean(sourceRevealState?.unlocked);
  const shouldUseUnlockedSourceAction = Boolean(
    sourceRevealUnlocked &&
      sourceUnlockedHref &&
      (primaryKind === "vote" || primaryKind === "wallet"),
  );
  const effectivePrimaryKind = shouldUseUnlockedSourceAction
    ? sourceUnlockedKind
    : primaryKind;
  const effectivePrimaryHref = shouldUseUnlockedSourceAction && sourceUnlockedHref
    ? sourceUnlockedHref
    : primaryHref;
  const sourceRevealVoteJoined = Boolean(
    effectivePrimaryKind === "vote" &&
      sourceRevealState?.requestedByViewer &&
      !sourceRevealState.unlocked,
  );
  const effectivePrimaryLabel = shouldUseUnlockedSourceAction
    ? sourceUnlockedLabel ?? primaryLabel
    : sourceRevealVoteJoined
      ? joinedLabel ?? primaryLabel
      : primaryLabel;
  const progressCountLabel = sourceRevealState
    ? formatCount(sourceRevealState.count, locale)
    : null;
  const progressThresholdLabel = sourceRevealState
    ? formatCount(sourceRevealState.threshold, locale)
    : null;
  const progressRemainingLabel = sourceRevealState
    ? formatCount(
        Math.max(0, sourceRevealState.threshold - sourceRevealState.count),
        locale,
      )
    : null;
  const progressPercent =
    sourceRevealState && sourceRevealState.threshold > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (sourceRevealState.count / sourceRevealState.threshold) * 100,
          ),
        )
      : 0;
  const effectiveStatusLabel =
    sourceRevealState && !sourceRevealState.unlocked
      ? formatSourceRevealProgress(sourceRevealState, locale)
      : sourceRevealState?.unlocked
        ? copy.openComplete
      : statusLabel;
  const compactStatusLabel =
    sourceRevealState &&
    progressCountLabel &&
    progressThresholdLabel &&
    progressRemainingLabel
      ? sourceRevealState.unlocked
        ? copy.openComplete
        : copy.progressShort(
            progressCountLabel,
            progressThresholdLabel,
            progressRemainingLabel,
          )
      : effectiveStatusLabel;
  const primaryActionClassName = sourceRevealVoteJoined
    ? "inline-flex min-h-[3.25rem] min-w-0 cursor-default items-center justify-center gap-2 rounded-[1.15rem] border border-[#44f26e]/34 bg-[#44f26e]/14 px-3.5 text-sm font-black !text-[#b9ffc8]"
    : "inline-flex min-h-[3.25rem] min-w-0 items-center justify-center gap-2 rounded-[1.15rem] bg-[#44f26e] px-3.5 text-sm font-black !text-black shadow-[0_10px_28px_rgba(68,242,110,0.22)] transition hover:bg-[#69ff8c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#44f26e]";

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#07100b]/96 px-3 pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-2.5 text-white shadow-[0_-18px_44px_rgba(0,0,0,0.24)] backdrop-blur sm:hidden">
      <div className="mx-auto max-w-md">
        <div className="mb-2.5">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <p className="min-w-0 truncate text-[0.72rem] font-black text-[#9bffad]">
              {sourceRevealState ? copy.progressEyebrow : eyebrow}
            </p>
            <p className="shrink-0 truncate text-[0.72rem] font-black text-white/62">
              {compactStatusLabel}
            </p>
          </div>
          {sourceRevealState ? (
            <div
              aria-label={effectiveStatusLabel}
              aria-valuemax={sourceRevealState.threshold}
              aria-valuemin={0}
              aria-valuenow={Math.min(
                sourceRevealState.count,
                sourceRevealState.threshold,
              )}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/12"
              role="progressbar"
            >
              <div
                className="h-full rounded-full bg-[#44f26e] transition-[width]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_6.35rem] gap-2">
          {sourceRevealVoteJoined ? (
            <button
              aria-disabled="true"
              className={primaryActionClassName}
              disabled
              type="button"
            >
              <PrimaryActionIcon
                className="size-4 shrink-0"
                kind={effectivePrimaryKind}
              />
              <span className="min-w-0 truncate">{effectivePrimaryLabel}</span>
            </button>
          ) : (
            <Link className={primaryActionClassName} href={effectivePrimaryHref}>
              <PrimaryActionIcon
                className="size-4 shrink-0"
                kind={effectivePrimaryKind}
              />
              <span className="min-w-0 truncate">{effectivePrimaryLabel}</span>
            </Link>
          )}
          <FanletterChannelShareButton
            className="!h-auto min-h-[3.25rem] whitespace-nowrap !rounded-[1.15rem] !border-white/14 !bg-white/10 !px-2.5 !text-[0.72rem] !font-black !text-white hover:!bg-white/16"
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
