"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { Check, Copy, ExternalLink, LoaderCircle, Smartphone } from "lucide-react";

import { trackFunnelEvent } from "@/lib/funnel-client";
import {
  buildChromeIntentUrl,
  inferBridgePlatform,
  isRestrictedInAppBrowser,
  type BridgePlatformHint,
} from "@/lib/in-app-browser";
import type { Locale } from "@/lib/i18n";

type ExitEnvironment = {
  platform: BridgePlatformHint;
  targetHref: string;
  visible: boolean;
};

const serverEnvironmentSnapshot = "0|other|";

function subscribeEnvironment() {
  return () => {};
}

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const pwaNavigator = navigator as Navigator & { standalone?: boolean };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    pwaNavigator.standalone === true
  );
}

function getEnvironmentSnapshot() {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return serverEnvironmentSnapshot;
  }

  const userAgent = navigator.userAgent ?? "";
  const visible =
    isRestrictedInAppBrowser(userAgent) && !isStandaloneDisplayMode();

  return `${visible ? "1" : "0"}|${inferBridgePlatform(userAgent)}|${window.location.href}`;
}

function parseEnvironmentSnapshot(snapshot: string): ExitEnvironment {
  const [visible, platform, targetHref] = snapshot.split("|");

  return {
    platform:
      platform === "android" || platform === "ios" || platform === "other"
        ? platform
        : "other",
    targetHref: targetHref ?? "",
    visible: visible === "1",
  };
}

export function InAppBrowserExitBanner({
  locale,
  referralCode,
  shareId = null,
  source,
}: {
  locale: Locale;
  referralCode: string | null;
  shareId?: string | null;
  source: string;
}) {
  const [copyState, setCopyState] = useState<"copied" | "error" | "idle">("idle");
  const environmentSnapshot = useSyncExternalStore(
    subscribeEnvironment,
    getEnvironmentSnapshot,
    () => serverEnvironmentSnapshot,
  );
  const environment = useMemo(
    () => parseEnvironmentSnapshot(environmentSnapshot),
    [environmentSnapshot],
  );
  const [launchState, setLaunchState] = useState<"idle" | "opening">("idle");

  useEffect(() => {
    if (!environment.visible) {
      return;
    }

    trackFunnelEvent("pwa_install_banner_view", {
      metadata: {
        platform: environment.platform,
        source,
        surface: "in-app-browser-exit",
      },
      referralCode,
      shareId,
      targetHref: environment.targetHref,
    });
  }, [
    environment.platform,
    environment.targetHref,
    environment.visible,
    referralCode,
    shareId,
    source,
  ]);

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

  const copy = useMemo(() => {
    if (locale === "ko") {
      return {
        badge: "KAKAO IN-APP BROWSER",
        body:
          "카카오톡 안에서는 로그인, 결제, PWA 설치가 제한될 수 있습니다. 외부 브라우저로 열고 홈 화면 앱으로 추가하면 이후 유입이 더 안정적입니다.",
        copyError: "복사 실패",
        copyLink: "링크 복사",
        copied: "복사됨",
        hint:
          environment.platform === "ios"
            ? "iPhone에서는 우측 상단 메뉴의 다른 브라우저로 열기 또는 링크 복사 후 Safari 열기가 가장 안정적입니다."
            : "Android에서는 Chrome 실행을 먼저 시도합니다. 열리지 않으면 카카오톡 메뉴의 다른 브라우저로 열기를 사용하세요.",
        opening: "브라우저 여는 중...",
        primary:
          environment.platform === "android"
            ? "Chrome에서 열기"
            : "외부 브라우저로 열기",
        title: "외부 브라우저에서 이어가세요",
      };
    }

    return {
      badge: "IN-APP BROWSER",
      body:
        "Login, payment, and PWA installation can be limited inside social app browsers. Open this in an external browser, then add it to your Home Screen.",
      copyError: "Copy failed",
      copyLink: "Copy link",
      copied: "Copied",
      hint:
        environment.platform === "ios"
          ? "On iPhone, use Open in Browser from the app menu or copy the link and open it in Safari."
          : "On Android we try Chrome first. If it does not open, use Open in Browser from the app menu.",
      opening: "Opening browser...",
      primary:
        environment.platform === "android"
          ? "Open in Chrome"
          : "Open externally",
      title: "Continue in an external browser",
    };
  }, [environment.platform, locale]);

  const handleOpenBrowser = useCallback(() => {
    if (!environment.targetHref) {
      return;
    }

    setLaunchState("opening");
    trackFunnelEvent("external_browser_click", {
      metadata: {
        platform: environment.platform,
        source,
        surface: "in-app-browser-exit",
      },
      referralCode,
      shareId,
      targetHref: environment.targetHref,
    });

    if (environment.platform === "android") {
      const intentUrl = buildChromeIntentUrl(environment.targetHref);

      if (intentUrl) {
        window.location.href = intentUrl;
        window.setTimeout(() => {
          setLaunchState("idle");
        }, 1400);
        return;
      }
    }

    window.open(environment.targetHref, "_blank", "noopener,noreferrer");
    window.setTimeout(() => {
      setLaunchState("idle");
    }, 1200);
  }, [environment.platform, environment.targetHref, referralCode, shareId, source]);

  const handleCopy = useCallback(async () => {
    if (!environment.targetHref) {
      return;
    }

    try {
      await navigator.clipboard.writeText(environment.targetHref);
      setCopyState("copied");
      trackFunnelEvent("external_browser_click", {
        metadata: {
          action: "copy-link",
          platform: environment.platform,
          source,
          surface: "in-app-browser-exit",
        },
        referralCode,
        shareId,
        targetHref: environment.targetHref,
      });
    } catch {
      setCopyState("error");
    }
  }, [environment.platform, environment.targetHref, referralCode, shareId, source]);

  if (!environment.visible) {
    return null;
  }

  return (
    <section className="border-b border-amber-200/80 bg-amber-50 px-3 py-3 sm:px-0">
      <div className="overflow-hidden rounded-[24px] border border-amber-200 bg-[linear-gradient(135deg,#fffaf0_0%,#ffffff_58%,#fef3c7_100%)] p-3.5 shadow-[0_16px_38px_rgba(120,53,15,0.08)]">
        <div className="flex items-start gap-3">
          <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_12px_26px_rgba(15,23,42,0.14)]">
            <Smartphone className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-amber-700">
              {copy.badge}
            </p>
            <h2 className="mt-1 text-sm font-semibold leading-5 text-slate-950">
              {copy.title}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-700">{copy.body}</p>
            <p className="mt-2 text-[0.72rem] leading-5 text-slate-500">
              {copy.hint}
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <button
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-950 bg-slate-950 px-4 text-sm font-semibold !text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] transition hover:bg-slate-900 active:scale-[0.99]"
            onClick={handleOpenBrowser}
            style={{ color: "#ffffff" }}
            type="button"
          >
            {launchState === "opening" ? (
              <LoaderCircle className="mr-2 size-4 shrink-0 animate-spin text-white" />
            ) : (
              <ExternalLink className="mr-2 size-4 shrink-0 text-white" />
            )}
            <span className="truncate text-white">
              {launchState === "opening" ? copy.opening : copy.primary}
            </span>
          </button>
          <button
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:text-slate-950"
            onClick={() => {
              void handleCopy();
            }}
            type="button"
          >
            {copyState === "copied" ? (
              <Check className="mr-2 size-4 text-emerald-600" />
            ) : (
              <Copy className="mr-2 size-4" />
            )}
            {copyState === "copied"
              ? copy.copied
              : copyState === "error"
                ? copy.copyError
                : copy.copyLink}
          </button>
        </div>
      </div>
    </section>
  );
}
