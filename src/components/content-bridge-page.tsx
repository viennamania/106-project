"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Copy,
  ExternalLink,
  LoaderCircle,
  MessageCircleMore,
  Smartphone,
} from "lucide-react";

import type { Locale } from "@/lib/i18n";
import { trackFunnelEvent } from "@/lib/funnel-client";
import type { BridgePlatformHint } from "@/lib/in-app-browser";
import { buildChromeIntentUrl } from "@/lib/in-app-browser";

type ContentBridgePageProps = {
  authorDisplayName: string | null;
  autoRedirect: boolean;
  coverImageUrl: string | null;
  homeHref: string;
  locale: Locale;
  platformHint: BridgePlatformHint;
  publishedAt: string | null;
  summary: string;
  targetHref: string;
  title: string;
};

export function ContentBridgePage({
  authorDisplayName,
  autoRedirect,
  coverImageUrl,
  homeHref,
  locale,
  platformHint,
  publishedAt,
  summary,
  targetHref,
  title,
}: ContentBridgePageProps) {
  const router = useRouter();
  const [copyState, setCopyState] = useState<"copied" | "error" | "idle">("idle");
  const [launchState, setLaunchState] = useState<"idle" | "opening">("idle");
  const copy = useMemo(
    () =>
      locale === "ko"
        ? {
            autoDescription:
              "일반 브라우저에서는 바로 콘텐츠로 이동합니다. 잠시만 기다려주세요.",
            autoTitle: "콘텐츠로 이동 중",
            backHome: "홈으로 돌아가기",
            browserCta: "브라우저에서 계속 보기",
            browserHint:
              platformHint === "android"
                ? "안드로이드에서는 Chrome 실행을 먼저 시도합니다. 열리지 않으면 카카오톡 메뉴의 다른 브라우저로 열기를 사용하세요."
                : platformHint === "ios"
                  ? "iPhone에서는 카카오톡 우측 메뉴의 다른 브라우저로 열기를 사용하면 더 안정적으로 볼 수 있습니다."
                  : "카카오톡에서는 우측 메뉴의 다른 브라우저로 열기를 사용할 수 있습니다.",
            browserReady: "브라우저나 홈 화면 앱에서 보기 좋은 화면",
            copyLink: "링크 복사",
            copiedLink: "링크 복사됨",
            copyFailed: "링크 복사에 실패했습니다.",
            eyebrow: "KAKAO OPEN BRIDGE",
            intro:
              "카카오톡 안에서는 화면 비율과 로그인 흐름이 제한될 수 있습니다. 이미 설치했다면 홈 화면의 Pocket 앱을 직접 열고, 아니라면 먼저 외부 브라우저로 여는 것을 권장합니다.",
            installTitle: "브라우저나 홈 화면 앱으로 이어가세요",
            installSteps:
              platformHint === "ios"
                ? [
                    "이미 설치했다면 홈 화면의 Pocket Smart Wallet 앱을 직접 열어보세요.",
                    "Safari로 연 뒤 공유 메뉴에서 홈 화면에 추가를 선택하면 다음부터 앱처럼 바로 실행할 수 있습니다.",
                  ]
                : [
                    "이미 설치했다면 홈 화면의 Pocket Smart Wallet 앱을 직접 열어보세요.",
                    "Chrome으로 연 뒤 브라우저 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택하면 다음부터 앱처럼 바로 실행할 수 있습니다.",
                  ],
            opening: "브라우저를 여는 중...",
            shareProtected: "레퍼럴이 유지된 공유 링크입니다.",
            title: "더 시원한 브라우저 화면이나 홈 화면 앱에서 열어보세요",
          }
        : {
            autoDescription:
              "Opening the content directly in your browser. Please wait a moment.",
            autoTitle: "Opening content",
            backHome: "Back home",
            browserCta: "Continue in browser",
            browserHint:
              platformHint === "android"
                ? "On Android we try Chrome first. If it does not open, use KakaoTalk's Open in Browser menu."
                : platformHint === "ios"
                  ? "On iPhone, using KakaoTalk's Open in Browser menu is the most reliable option."
                  : "You can also use KakaoTalk's Open in Browser menu.",
            browserReady: "Best viewed in a browser or home screen app",
            copyLink: "Copy link",
            copiedLink: "Link copied",
            copyFailed: "Unable to copy the link.",
            eyebrow: "KAKAO OPEN BRIDGE",
            intro:
              "KakaoTalk's in-app browser can limit screen space and login flow. If you already installed Pocket, open it from your home screen. Otherwise, continue in an external browser first.",
            installTitle: "Continue in a browser or open the home screen app",
            installSteps:
              platformHint === "ios"
                ? [
                    "If Pocket is already installed, open it directly from your home screen.",
                    "If not, open this in Safari, then use Share > Add to Home Screen.",
                  ]
                : [
                    "If Pocket is already installed, open it directly from your home screen.",
                    "If not, open this in Chrome, then use Install app or Add to Home screen from the browser menu.",
                  ],
            opening: "Opening browser...",
            shareProtected: "This shared link keeps the referral attached.",
            title: "Open it in a better browser view or your installed app",
          },
    [locale, platformHint],
  );

  useEffect(() => {
    if (!autoRedirect) {
      return;
    }

    const timeout = window.setTimeout(() => {
      router.replace(targetHref);
    }, 120);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [autoRedirect, router, targetHref]);

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCopyState("idle");
    }, 2200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [copyState]);

  const absoluteTargetUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return targetHref;
    }

    return new URL(targetHref, window.location.origin).toString();
  }, [targetHref]);
  const publishedLabel = useMemo(() => {
    if (!publishedAt) {
      return null;
    }

    const nextDate = new Date(publishedAt);

    if (Number.isNaN(nextDate.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
    }).format(nextDate);
  }, [locale, publishedAt]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(absoluteTargetUrl);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }, [absoluteTargetUrl]);

  const handleOpenBrowser = useCallback(() => {
    setLaunchState("opening");
    trackFunnelEvent("external_browser_click", {
      metadata: {
        platform: platformHint,
        source: "content-bridge",
      },
      targetHref,
    });

    if (platformHint === "android") {
      const intentUrl = buildChromeIntentUrl(absoluteTargetUrl);

      if (intentUrl) {
        window.location.href = intentUrl;
        window.setTimeout(() => {
          window.location.assign(targetHref);
        }, 1100);
        return;
      }
    }

    window.open(absoluteTargetUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => {
      setLaunchState("idle");
    }, 1200);
  }, [absoluteTargetUrl, platformHint, targetHref]);

  if (autoRedirect) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-4 py-8 sm:px-6">
        <section className="w-full max-w-xl overflow-hidden rounded-[32px] border border-white/80 bg-white/92 p-5 text-center shadow-[0_28px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-7">
          {coverImageUrl ? (
            <div className="mb-5 overflow-hidden rounded-[26px] border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={title}
                className="aspect-[16/10] w-full object-cover"
                src={coverImageUrl}
              />
            </div>
          ) : null}
          <div className="mx-auto inline-flex size-14 items-center justify-center rounded-full border border-slate-200 bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
            <LoaderCircle className="size-5 animate-spin" />
          </div>
          <p className="mt-5 text-[0.74rem] font-semibold uppercase tracking-[0.3em] text-slate-400">
            {copy.eyebrow}
          </p>
          <h1 className="mt-3 text-[1.9rem] font-semibold tracking-tight text-slate-950">
            {copy.autoTitle}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            {copy.autoDescription}
          </p>
          <Link
            className="mt-5 inline-flex text-sm font-semibold text-slate-950 underline"
            href={targetHref}
          >
            {title}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-3 py-4 sm:px-6 sm:py-6">
      <section className="overflow-hidden rounded-[34px] border border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.14),transparent_24%),linear-gradient(180deg,#0f172a_0%,#111827_42%,#1f2937_100%)] text-white shadow-[0_32px_80px_rgba(15,23,42,0.18)]">
        <div className="relative">
          {coverImageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={title}
                className="aspect-[4/5] w-full object-cover sm:aspect-[16/9]"
                src={coverImageUrl}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.18)_0%,rgba(15,23,42,0.42)_42%,rgba(15,23,42,0.9)_100%)]" />
            </>
          ) : (
            <div className="aspect-[4/5] w-full bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.3),transparent_28%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.22),transparent_30%),linear-gradient(180deg,#0f172a_0%,#111827_60%,#1f2937_100%)] sm:aspect-[16/9]" />
          )}

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/12 px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-white/72 backdrop-blur-md">
              <MessageCircleMore className="size-3.5" />
              {copy.eyebrow}
            </div>
            <h1 className="mt-4 text-[2rem] font-semibold leading-[1.02] tracking-tight sm:text-[2.8rem]">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/74 sm:text-base">
              {summary}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-white/64">
              {authorDisplayName ? (
                <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 backdrop-blur-md">
                  {authorDisplayName}
                </span>
              ) : null}
              {publishedLabel ? (
                <span className="rounded-full border border-white/14 bg-white/10 px-3 py-1.5 backdrop-blur-md">
                  {publishedLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:p-7">
          <div className="rounded-[28px] border border-white/12 bg-white/8 p-5 backdrop-blur-xl">
            <p className="text-[0.76rem] font-semibold uppercase tracking-[0.28em] text-white/52">
              {copy.browserReady}
            </p>
            <h2 className="mt-3 text-[1.7rem] font-semibold leading-tight tracking-tight text-white sm:text-[2.2rem]">
              {copy.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/74 sm:text-base">
              {copy.intro}
            </p>
            <div className="mt-5 grid gap-3">
              <button
                className="inline-flex h-12 items-center justify-center rounded-full border border-amber-200/70 bg-[linear-gradient(135deg,#fef3c7_0%,#fbbf24_100%)] px-5 text-sm font-semibold text-slate-950 shadow-[0_20px_45px_rgba(251,191,36,0.28)] transition hover:brightness-[1.03]"
                onClick={handleOpenBrowser}
                type="button"
              >
                {launchState === "opening" ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-2 size-4" />
                )}
              {launchState === "opening" ? copy.opening : copy.browserCta}
              </button>
              <button
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/16 bg-white/10 px-5 text-sm font-semibold text-white/84 transition hover:bg-white/16"
                onClick={() => {
                  void handleCopy();
                }}
                type="button"
              >
                <Copy className="mr-2 size-4" />
                {copyState === "copied" ? copy.copiedLink : copy.copyLink}
              </button>
            </div>
            <p className="mt-4 text-xs leading-6 text-white/56">
              {copy.browserHint}
            </p>
            <p className="mt-2 text-xs leading-6 text-white/42">
              {copy.shareProtected}
            </p>
            <div className="mt-5 rounded-[22px] border border-white/12 bg-white/6 p-4">
              <div className="flex items-start gap-3">
                <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/10 text-white">
                  <Smartphone className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{copy.installTitle}</p>
                  <ul className="mt-2 space-y-1.5 text-xs leading-6 text-white/62">
                    {copy.installSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            {copyState === "error" ? (
              <p className="mt-2 text-xs font-medium text-rose-300">{copy.copyFailed}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-slate-950/26 px-4 py-3 backdrop-blur-md">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/16 bg-white/8 px-5 text-sm font-semibold text-white/84 transition hover:bg-white/14"
              href={homeHref}
            >
              {copy.backHome}
            </Link>
            <span className="text-xs leading-6 text-white/52">{copy.browserHint}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
