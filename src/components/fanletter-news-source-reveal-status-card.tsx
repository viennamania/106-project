"use client";

import { CheckCircle2, Coins, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { FanletterPaidUnlockTrigger } from "@/components/fanletter-paid-unlock-panel";
import type { FanletterNewsSourceRevealState } from "@/lib/fanletter-news-source-reveal";
import {
  FANLETTER_NEWS_SOURCE_REVEAL_STATE_CHANGE_EVENT,
  type FanletterNewsSourceRevealStateChangeDetail,
} from "@/lib/fanletter-news-source-reveal-events";
import type { Locale } from "@/lib/i18n";

type FanletterNewsSourceRevealStatusCardProps = {
  initialSourceReveal: FanletterNewsSourceRevealState | null;
  isPaidContent: boolean;
  locale: Locale;
  paidAmountLabel: string;
  paidUnlockHref: string | null;
  sourceRevealEndpoint: string | null;
  sourceRevealReportId: string | null;
  viewerCanAccessSource: boolean;
};

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function getCopy({
  countLabel,
  locale,
  paidAmountLabel,
  remainingCount,
  remainingLabel,
  thresholdLabel,
}: {
  countLabel: string;
  locale: Locale;
  paidAmountLabel: string;
  remainingCount: number;
  remainingLabel: string;
  thresholdLabel: string;
}) {
  return locale === "ko"
    ? {
        completeLabel: "조건 완료",
        ctaPay: `${paidAmountLabel} 원본 보기`,
        eyebrow: "원본 공개",
        flywheel: {
          label: "참여 루프",
          steps: ["리포트 유입", "보고싶어요", "인센티브"],
        },
        freeLockedBody: `${remainingLabel}명이 더 누르면 모두에게 무료 공개됩니다.`,
        freeLockedTitle: `${countLabel}/${thresholdLabel}명 참여 중`,
        freeUnlockedBody:
          "공개 조건이 완료되어 원본 브이로그를 바로 볼 수 있습니다.",
        freeUnlockedTitle: "무료 공개 완료",
        paidLockedBody: `${remainingLabel}명이 더 누르면 결제가 열립니다. 이후 ${paidAmountLabel}로 전체 원본을 볼 수 있습니다.`,
        paidLockedTitle: `${countLabel}/${thresholdLabel}명 참여 중`,
        paidReadyBody: `${paidAmountLabel} 결제 후 전체 원본 브이로그를 바로 볼 수 있습니다.`,
        paidReadyTitle: `${paidAmountLabel} 원본 보기 가능`,
        paidUnlockedBody:
          "결제 또는 작성자 권한이 확인되어 원본 브이로그를 바로 이어볼 수 있습니다.",
        paidUnlockedTitle: "원본 열람 가능",
        progressLabel: (count: string, threshold: string) =>
          `${count}/${threshold}명 참여`,
        remainingShort: (remaining: string) => `${remaining}명 남음`,
      }
    : {
        completeLabel: "Complete",
        ctaPay: `Watch for ${paidAmountLabel}`,
        eyebrow: "Source access",
        flywheel: {
          label: "Growth loop",
          steps: ["Report traffic", "Want-to-watch", "Incentive"],
        },
        freeLockedBody: `${remainingLabel} more fan${remainingCount === 1 ? "" : "s"} need to want it. Then this source vlog opens for everyone for free.`,
        freeLockedTitle: `${countLabel}/${thresholdLabel} joined`,
        freeUnlockedBody:
          "The open condition is complete, so the source vlog is available now.",
        freeUnlockedTitle: "Free source is open",
        paidLockedBody: `${remainingLabel} more fan${remainingCount === 1 ? "" : "s"} need to want it. After access opens, anyone can watch the full source vlog for ${paidAmountLabel}.`,
        paidLockedTitle: `${countLabel}/${thresholdLabel} joined`,
        paidReadyBody: `Pay ${paidAmountLabel} to watch the full source vlog now.`,
        paidReadyTitle: `${paidAmountLabel} source is ready`,
        paidUnlockedBody:
          "Your payment or owner access is confirmed, so you can continue the source vlog now.",
        paidUnlockedTitle: "Source vlog is available",
        progressLabel: (count: string, threshold: string) =>
          `${count}/${threshold} joined`,
        remainingShort: (remaining: string) => `${remaining} left`,
      };
}

export function FanletterNewsSourceRevealStatusCard({
  initialSourceReveal,
  isPaidContent,
  locale,
  paidAmountLabel,
  paidUnlockHref,
  sourceRevealEndpoint,
  sourceRevealReportId,
  viewerCanAccessSource,
}: FanletterNewsSourceRevealStatusCardProps) {
  const [sourceReveal, setSourceReveal] = useState(initialSourceReveal);

  useEffect(() => {
    setSourceReveal(initialSourceReveal);
  }, [initialSourceReveal]);

  useEffect(() => {
    const handleSourceRevealStateChange = (event: Event) => {
      const detail = (event as CustomEvent<FanletterNewsSourceRevealStateChangeDetail>)
        .detail;

      if (!detail) {
        return;
      }

      const endpointMatches =
        Boolean(sourceRevealEndpoint) && detail.endpoint === sourceRevealEndpoint;
      const reportIdMatches =
        Boolean(sourceRevealReportId) && detail.reportId === sourceRevealReportId;

      if (!endpointMatches && !reportIdMatches) {
        return;
      }

      setSourceReveal(detail.state);
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
  }, [sourceRevealEndpoint, sourceRevealReportId]);

  const revealUnlocked = sourceReveal?.unlocked ?? true;
  const thresholdLabel = sourceReveal
    ? formatNumber(sourceReveal.threshold, locale)
    : formatNumber(6, locale);
  const remainingCount = sourceReveal
    ? Math.max(0, sourceReveal.threshold - sourceReveal.count)
    : 0;
  const remainingLabel = formatNumber(remainingCount, locale);
  const countLabel = sourceReveal
    ? formatNumber(sourceReveal.count, locale)
    : thresholdLabel;
  const stage = isPaidContent
    ? viewerCanAccessSource
      ? "paidUnlocked"
      : revealUnlocked
        ? "paidReady"
        : "paidLocked"
    : revealUnlocked
      ? "freeUnlocked"
      : "freeLocked";
  const copy = getCopy({
    countLabel,
    locale,
    paidAmountLabel,
    remainingCount,
    remainingLabel,
    thresholdLabel,
  });
  const title =
    stage === "paidLocked"
      ? copy.paidLockedTitle
      : stage === "paidReady"
        ? copy.paidReadyTitle
        : stage === "paidUnlocked"
          ? copy.paidUnlockedTitle
          : stage === "freeLocked"
            ? copy.freeLockedTitle
            : copy.freeUnlockedTitle;
  const body =
    stage === "paidLocked"
      ? copy.paidLockedBody
      : stage === "paidReady"
        ? copy.paidReadyBody
        : stage === "paidUnlocked"
          ? copy.paidUnlockedBody
          : stage === "freeLocked"
            ? copy.freeLockedBody
            : copy.freeUnlockedBody;
  const showPayCta =
    isPaidContent && revealUnlocked && !viewerCanAccessSource && paidUnlockHref;
  const progressPercent =
    sourceReveal && sourceReveal.threshold > 0
      ? Math.min(
          100,
          Math.max(0, (sourceReveal.count / sourceReveal.threshold) * 100),
        )
      : 100;
  const progressTail =
    !sourceReveal || revealUnlocked || remainingCount <= 0
      ? copy.completeLabel
      : copy.remainingShort(remainingLabel);

  return (
    <div
      aria-live="polite"
      className="mb-4 rounded-lg border border-[#19b84b]/28 bg-[linear-gradient(180deg,#f8fff9_0%,#effcf2_100%)] p-4 shadow-[0_14px_34px_rgba(22,112,46,0.1)] sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#07150b] text-[#44f26e]">
          {stage === "paidReady" ? (
            <Coins className="size-4.5" />
          ) : revealUnlocked ? (
            <CheckCircle2 className="size-4.5" />
          ) : (
            <Users className="size-4.5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.7rem] font-black text-[#16702e]">
            {copy.eyebrow}
          </p>
          <h3 className="mt-1 text-xl font-black leading-tight text-[#111510] [word-break:keep-all] sm:text-2xl">
            {title}
          </h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-black/62 [word-break:keep-all] sm:text-base">
            {body}
          </p>
        </div>
      </div>
      {sourceReveal ? (
        <div className="mt-4">
          <div
            aria-label={copy.progressLabel(countLabel, thresholdLabel)}
            aria-valuemax={sourceReveal.threshold}
            aria-valuemin={0}
            aria-valuenow={Math.min(sourceReveal.count, sourceReveal.threshold)}
            className="h-2 overflow-hidden rounded-full bg-[#dfeee2]"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-[#44f26e] transition-[width]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs font-black text-black/46">
            <span>{copy.progressLabel(countLabel, thresholdLabel)}</span>
            <span className={revealUnlocked ? "text-[#16702e]" : ""}>
              {progressTail}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-lg border border-[#16702e]/12 bg-white text-center shadow-[0_8px_20px_rgba(22,112,46,0.06)]">
            {copy.flywheel.steps.map((step, index) => (
              <div
                className="border-l border-[#16702e]/10 px-2 py-2 first:border-l-0"
                key={step}
              >
                <p className="text-[0.56rem] font-black uppercase tracking-[0.08em] text-[#16702e]">
                  {index === 0 ? copy.flywheel.label : `${index + 1}`}
                </p>
                <p className="mt-0.5 truncate text-[0.68rem] font-black text-[#111510] sm:text-xs">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {showPayCta && paidUnlockHref ? (
        <div className="mt-4">
          <FanletterPaidUnlockTrigger
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black !text-white transition hover:bg-[#243026] sm:w-auto"
            href={paidUnlockHref}
          >
            <Coins className="size-4 text-[#44f26e]" />
            {copy.ctaPay}
          </FanletterPaidUnlockTrigger>
        </div>
      ) : null}
    </div>
  );
}
