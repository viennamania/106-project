"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  HeartHandshake,
  Loader2,
  LockKeyhole,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useMemberSession } from "@/components/member-session-provider";
import type { FanletterNewsSourceRevealState } from "@/lib/fanletter-news-source-reveal";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SourceRevealResponse = {
  sourceReveal: FanletterNewsSourceRevealState;
};

type FanletterNewsSourceRevealVoteProps = {
  className?: string;
  connectHref: string;
  density?: "regular" | "compact";
  initialState: FanletterNewsSourceRevealState;
  locale: Locale;
  reportId?: string;
  sourceRevealEndpoint?: string;
  tone?: "dark" | "light";
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        body: (count: string, threshold: string, remaining: string) =>
          `현재 ${count}/${threshold}명 참여 중입니다. ${remaining}명이 더 보고싶어요를 누르면 원본 브이로그가 열립니다.`,
        cta: "보고싶어요",
        done: "참여 완료",
        eyebrow: "팬 오픈 투표",
        error: "참여를 저장하지 못했습니다.",
        loginCta: "로그인하고 보고싶어요",
        progressReady: "공개 조건 달성",
        progressRemaining: (count: string) => `공개까지 ${count}명`,
        saving: "반영 중",
        title: "팬 6명이 보고싶어요를 누르면 원본 브이로그가 열립니다",
        unlockedBody: (count: string) =>
          `${count}명의 팬 참여로 빌트인 원본 브이로그가 열렸습니다.`,
        unlockedTitle: "팬들이 열어낸 원본 브이로그",
      }
    : {
        body: (count: string, threshold: string, remaining: string) =>
          `${count}/${threshold} fans have joined. The source vlog opens when ${remaining} more fan${remaining === "1" ? "" : "s"} tap want to watch.`,
        cta: "Want to watch",
        done: "Joined",
        eyebrow: "Fan open vote",
        error: "Could not save your vote.",
        loginCta: "Sign in to vote",
        progressReady: "Ready to open",
        progressRemaining: (count: string) => `${count} more to open`,
        saving: "Saving",
        title: "The source vlog opens when 6 fans want to watch",
        unlockedBody: (count: string) =>
          `${count} fans opened this built-in source vlog together.`,
        unlockedTitle: "Source vlog opened by fans",
      };
}

function formatCount(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

export function FanletterNewsSourceRevealVote({
  className,
  connectHref,
  density = "regular",
  initialState,
  locale,
  reportId,
  sourceRevealEndpoint,
  tone = "dark",
}: FanletterNewsSourceRevealVoteProps) {
  const copy = getCopy(locale);
  const router = useRouter();
  const memberSession = useMemberSession();
  const [state, setState] = useState(initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setState(initialState);
  }, [initialState]);

  const progressPercent = useMemo(() => {
    if (state.threshold <= 0) {
      return 100;
    }

    return Math.min(100, Math.max(0, (state.count / state.threshold) * 100));
  }, [state.count, state.threshold]);

  const countLabel = formatCount(state.count, locale);
  const thresholdLabel = formatCount(state.threshold, locale);
  const remainingCount = Math.max(0, state.threshold - state.count);
  const remainingLabel = formatCount(remainingCount, locale);
  const isLoggedIn = Boolean(memberSession.email);
  const isDark = tone === "dark";
  const isCompact = density === "compact";
  const voteEndpoint =
    sourceRevealEndpoint ??
    (reportId
      ? `/api/fanletter/news-reports/${encodeURIComponent(reportId)}/source-reveal`
      : null);

  const handleVote = async () => {
    if (isSaving || state.requestedByViewer || state.unlocked || !voteEndpoint) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(voteEndpoint, {
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as
        | SourceRevealResponse
        | { error?: string }
        | null;

      if (!response.ok || !data || !("sourceReveal" in data)) {
        throw new Error(
          data && "error" in data && data.error ? data.error : copy.error,
        );
      }

      setState(data.sourceReveal);

      if (data.sourceReveal.unlocked) {
        router.refresh();
      }
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : copy.error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-left shadow-[0_16px_34px_rgba(0,0,0,0.12)]",
        isDark
          ? "border-white/14 bg-black/72 text-white"
          : "border-black/10 bg-white text-[#111510]",
        isCompact && "p-2.5 shadow-[0_12px_24px_rgba(0,0,0,0.14)] sm:p-3",
        className,
      )}
    >
      <div className={cn("flex items-start gap-3", isCompact && "gap-2.5")}>
        <span
          className={cn(
            "mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full",
            isCompact && "size-8 sm:size-10",
            state.unlocked
              ? "bg-[#44f26e] text-black"
              : isDark
                ? "bg-[#44f26e]/14 text-[#44f26e]"
                : "bg-[#e9ffef] text-[#16702e]",
          )}
        >
          {state.unlocked ? (
            <CheckCircle2 className={cn("size-5", isCompact && "size-4 sm:size-5")} />
          ) : (
            <LockKeyhole className={cn("size-5", isCompact && "size-4 sm:size-5")} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[0.64rem] font-black uppercase tracking-[0.16em]",
              isDark ? "text-[#9bffad]" : "text-[#16702e]",
            )}
          >
            {copy.eyebrow}
          </p>
          <p
            className={cn(
              "mt-1 text-sm font-black leading-5 [word-break:keep-all]",
              isDark ? "text-white" : "text-[#111510]",
              isCompact && "text-[0.82rem] leading-5 sm:text-sm",
            )}
          >
            {state.unlocked ? copy.unlockedTitle : copy.title}
          </p>
          <p
            className={cn(
              "mt-1 text-xs font-semibold leading-5",
              isDark ? "text-white/68" : "text-black/58",
              isCompact && "hidden sm:block",
            )}
          >
            {state.unlocked
              ? copy.unlockedBody(countLabel)
              : copy.body(countLabel, thresholdLabel, remainingLabel)}
          </p>
        </div>
      </div>

      <div className={cn("mt-3", isCompact && "mt-2")}>
        <div
          className={cn(
            "h-2 overflow-hidden rounded-full",
            isDark ? "bg-white/12" : "bg-black/8",
          )}
        >
          <div
            className="h-full rounded-full bg-[#44f26e] transition-[width]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div
          className={cn(
            "mt-2 flex items-center justify-between gap-3 text-[0.68rem] font-black",
            isDark ? "text-white/58" : "text-black/50",
            isCompact && "mt-1.5",
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" />
            {countLabel}/{thresholdLabel}
          </span>
          <span>
            {remainingCount > 0
              ? copy.progressRemaining(remainingLabel)
              : copy.progressReady}
          </span>
        </div>
      </div>

      {state.unlocked ? null : isLoggedIn ? (
        <button
          className={cn(
            "mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-72",
            isCompact && "mt-2 h-10",
            state.requestedByViewer
              ? isDark
                ? "border border-[#44f26e]/35 bg-[#44f26e]/12 text-[#b9ffc8]"
                : "border border-[#19b84b]/30 bg-[#effff3] text-[#126c2c]"
              : "bg-[#44f26e] text-black hover:bg-[#69ff8c]",
          )}
          disabled={isSaving || state.requestedByViewer}
          onClick={() => {
            void handleVote();
          }}
          type="button"
        >
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <HeartHandshake className="size-4" />
          )}
          {isSaving
            ? copy.saving
            : state.requestedByViewer
              ? copy.done
              : copy.cta}
        </button>
      ) : (
        <Link
          className={cn(
            "mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-black !text-black transition hover:bg-[#69ff8c]",
            isCompact && "mt-2 h-10",
          )}
          href={connectHref}
        >
          <HeartHandshake className="size-4" />
          {copy.loginCta}
        </Link>
      )}

      {error ? (
        <p
          className={cn(
            "mt-2 text-xs font-semibold leading-5",
            isDark ? "text-rose-200" : "text-rose-700",
          )}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
