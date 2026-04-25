"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";

import type { Locale } from "@/lib/i18n";
import { isRestrictedInAppBrowser } from "@/lib/in-app-browser";
import { normalizeShareId } from "@/lib/share-tracking";
import { trackFunnelEvent } from "@/lib/funnel-client";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallPlatform = "android" | "ios" | "other";

type InstallEnvironment = {
  platform: InstallPlatform;
  ready: boolean;
  restrictedInApp: boolean;
  standalone: boolean;
};

const initialEnvironment: InstallEnvironment = {
  platform: "other",
  ready: false,
  restrictedInApp: false,
  standalone: false,
};

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

function getInstallPlatform(userAgent: string): InstallPlatform {
  if (/android/i.test(userAgent)) {
    return "android";
  }

  if (/(iphone|ipad|ipod)/i.test(userAgent)) {
    return "ios";
  }

  return "other";
}

function safeReadStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWriteStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

function normalizeStoredPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return null;
  }

  if (value.startsWith("//")) {
    return null;
  }

  return value;
}

export function AndroidInstallBanner({
  className,
  locale,
}: {
  className?: string;
  locale: Locale;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const referralCode = searchParams.get("ref");
  const shareId = normalizeShareId(searchParams.get("shareId"));
  const [dismissed, setDismissed] = useState(false);
  const [environment, setEnvironment] =
    useState<InstallEnvironment>(initialEnvironment);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [promptState, setPromptState] = useState<"idle" | "prompting">("idle");
  const trackedViewKeyRef = useRef<string | null>(null);

  const copy = useMemo(
    () => {
      if (locale === "ko") {
        return environment.platform === "ios"
          ? {
              badge: "HOME SCREEN APP",
              body:
                "홈 화면에 추가하면 다음부터 카카오톡을 거치지 않고 바로 열 수 있습니다.",
              dismiss: "나중에",
              fallback: "Safari 공유 버튼에서 '홈 화면에 추가'를 선택하세요.",
              title: "앱처럼 빠르게 열기",
              trigger: "앱 설치",
              triggering: "설치 화면 여는 중...",
            }
          : {
              badge: "PWA APP INSTALL",
              body: "홈 화면에 추가하면 다음부터 더 빠르고 안정적으로 열립니다.",
              dismiss: "나중에",
              fallback: "이미 설치했다면 홈 화면의 Pocket 앱을 열어주세요.",
              title: "앱처럼 빠르게 열기",
              trigger: "앱 설치",
              triggering: "설치 화면 여는 중...",
            };
      }

      return environment.platform === "ios"
        ? {
            badge: "HOME SCREEN APP",
            body: "Add Pocket to your Home Screen to open it directly next time.",
            dismiss: "Maybe later",
            fallback: "Use Safari Share, then Add to Home Screen.",
            title: "Open faster like an app",
            trigger: "Install app",
            triggering: "Opening install prompt...",
          }
        : {
            badge: "PWA APP INSTALL",
            body: "Install once to open this flow faster and more reliably.",
            dismiss: "Maybe later",
            fallback: "Already installed? Open Pocket from your Home Screen.",
            title: "Open faster like an app",
            trigger: "Install app",
            triggering: "Opening install prompt...",
          };
    },
    [environment.platform, locale],
  );

  const fromBridge = searchParams.get("fromBridge") === "1";
  const pwaLaunch = searchParams.get("pwa") === "1";
  const storageKey = useMemo(
    () => `android-install-banner-dismissed:${pathname}`,
    [pathname],
  );
  const currentPath = useMemo(() => {
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, search]);
  const isEligible = useMemo(() => {
    return (
      fromBridge &&
      environment.ready &&
      !environment.restrictedInApp &&
      !environment.standalone &&
      (environment.platform === "android" || environment.platform === "ios")
    );
  }, [environment, fromBridge]);

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }

    const userAgent = navigator.userAgent ?? "";

    setEnvironment({
      platform: getInstallPlatform(userAgent),
      ready: true,
      restrictedInApp: isRestrictedInAppBrowser(userAgent),
      standalone: isStandaloneDisplayMode(),
    });
  }, []);

  useEffect(() => {
    if (!referralCode || typeof window === "undefined") {
      return;
    }

    safeWriteStorage("pocket:lastReferralCode", referralCode);
    safeWriteStorage("pocket:lastReferralPath", currentPath);
  }, [currentPath, referralCode]);

  useEffect(() => {
    if (
      !pwaLaunch ||
      referralCode ||
      !environment.ready ||
      typeof window === "undefined"
    ) {
      return;
    }

    const restoredPath = normalizeStoredPath(
      safeReadStorage("pocket:lastReferralPath"),
    );
    const restoredReferralCode = safeReadStorage("pocket:lastReferralCode");

    if (restoredPath && restoredPath !== currentPath) {
      router.replace(restoredPath);
      return;
    }

    if (restoredReferralCode) {
      router.replace(`/${locale}?ref=${encodeURIComponent(restoredReferralCode)}`);
    }
  }, [currentPath, environment.ready, locale, pwaLaunch, referralCode, router]);

  useEffect(() => {
    if (!isEligible || typeof window === "undefined") {
      return;
    }

    setDismissed(window.sessionStorage.getItem(storageKey) === "1");
  }, [isEligible, storageKey]);

  useEffect(() => {
    if (!isEligible || environment.platform !== "android") {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [environment.platform, isEligible]);

  useEffect(() => {
    if (!isEligible || dismissed) {
      return;
    }

    const viewKey = `${environment.platform}:${currentPath}`;

    if (trackedViewKeyRef.current === viewKey) {
      return;
    }

    trackedViewKeyRef.current = viewKey;
    trackFunnelEvent("pwa_install_banner_view", {
      metadata: {
        hasPrompt: Boolean(installPrompt),
        platform: environment.platform,
        source: "from-bridge",
      },
      referralCode,
      shareId,
      targetHref: currentPath,
    });
  }, [
    currentPath,
    dismissed,
    environment.platform,
    installPrompt,
    isEligible,
    referralCode,
    shareId,
  ]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(storageKey, "1");
    }

    trackFunnelEvent("pwa_install_dismiss", {
      metadata: {
        platform: environment.platform,
        source: "from-bridge",
      },
      referralCode,
      shareId,
      targetHref: currentPath,
    });
  }, [currentPath, environment.platform, referralCode, shareId, storageKey]);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) {
      return;
    }

    setPromptState("prompting");
    trackFunnelEvent("pwa_install_click", {
      metadata: {
        platform: environment.platform,
        source: "from-bridge",
      },
      referralCode,
      shareId,
      targetHref: currentPath,
    });

    try {
      await installPrompt.prompt();
      const outcome = await installPrompt.userChoice;

      trackFunnelEvent("pwa_install_click", {
        metadata: {
          outcome: outcome.outcome,
          platform: environment.platform,
          source: "from-bridge-result",
        },
        referralCode,
        shareId,
        targetHref: currentPath,
      });

      if (outcome.outcome === "accepted") {
        handleDismiss();
      }
    } finally {
      setPromptState("idle");
      setInstallPrompt(null);
    }
  }, [
    currentPath,
    environment.platform,
    handleDismiss,
    installPrompt,
    referralCode,
    shareId,
  ]);

  if (!isEligible || dismissed) {
    return null;
  }

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-emerald-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(237,255,247,0.92))] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:rounded-[28px] sm:p-5",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.06),transparent_32%)]" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-[18px] bg-slate-950 text-white shadow-[0_16px_36px_rgba(15,23,42,0.18)]">
            <Smartphone className="size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-emerald-700/90">
              {copy.badge}
            </p>
            <h2 className="mt-2 text-base font-semibold tracking-tight text-slate-950 sm:text-[1.05rem]">
              {copy.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{copy.body}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{copy.fallback}</p>
          </div>
        </div>
        <button
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-500 transition hover:text-slate-950"
          onClick={handleDismiss}
          type="button"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="relative mt-4 flex flex-wrap gap-2.5">
        {environment.platform === "android" && installPrompt ? (
          <button
            className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_16px_35px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={promptState === "prompting"}
            onClick={() => {
              void handleInstall();
            }}
            type="button"
          >
            <Download className="mr-2 size-4" />
            {promptState === "prompting" ? copy.triggering : copy.trigger}
          </button>
        ) : null}
        <button
          className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white/90 px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          onClick={handleDismiss}
          type="button"
        >
          {copy.dismiss}
        </button>
      </div>
    </section>
  );
}
