"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Download, Share2, Smartphone, X } from "lucide-react";

import { isRestrictedInAppBrowser } from "@/lib/in-app-browser";
import type { Locale } from "@/lib/i18n";
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
type InstallDismissReason = "accepted" | "ios-guide" | "later" | "legacy";
type InstallDismissRecord = {
  dismissedAt: number;
  expiresAt: number;
  platform: InstallPlatform;
  reason: InstallDismissReason;
  version: 2;
};

const dismissedStorageKey = "fanletter:pwa-install-dismissed:v1";
const installPromptSnoozeMs = 7 * 24 * 60 * 60 * 1000;
const installAcceptedSnoozeMs = 90 * 24 * 60 * 60 * 1000;
const publicSurfacePattern =
  /^\/(?:ko|en|ja|zh|vi|id)\/fanletter(?:\/?$|\/(?:feed|start|onboarding|content|creator)(?:\/|$))/;

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

function safeRemoveStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

function createDismissRecord({
  now,
  platform,
  reason,
  snoozeMs = installPromptSnoozeMs,
}: {
  now: number;
  platform: InstallPlatform;
  reason: InstallDismissReason;
  snoozeMs?: number;
}) {
  return JSON.stringify({
    dismissedAt: now,
    expiresAt: now + snoozeMs,
    platform,
    reason,
    version: 2,
  } satisfies InstallDismissRecord);
}

function readDismissedState(now: number) {
  const storedValue = safeReadStorage(dismissedStorageKey);

  if (!storedValue) {
    return false;
  }

  if (storedValue === "1") {
    safeWriteStorage(
      dismissedStorageKey,
      createDismissRecord({
        now,
        platform: "other",
        reason: "legacy",
      }),
    );
    return true;
  }

  try {
    const record = JSON.parse(storedValue) as Partial<InstallDismissRecord>;

    if (typeof record.expiresAt !== "number") {
      safeRemoveStorage(dismissedStorageKey);
      return false;
    }

    if (record.expiresAt > now) {
      return true;
    }
  } catch {
    safeRemoveStorage(dismissedStorageKey);
    return false;
  }

  safeRemoveStorage(dismissedStorageKey);
  return false;
}

export function FanletterPwaMobileBridge({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref");
  const shareId = normalizeShareId(searchParams.get("shareId"));
  const trackedViewRef = useRef(false);
  const [dismissed, setDismissed] = useState(true);
  const [environment, setEnvironment] = useState<InstallEnvironment>({
    platform: "other",
    ready: false,
    restrictedInApp: false,
    standalone: false,
  });
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [promptState, setPromptState] = useState<"idle" | "prompting">("idle");

  const copy = useMemo(() => {
    if (locale === "ko") {
      return environment.platform === "ios"
        ? {
            body: "Safari 공유 버튼에서 홈 화면에 추가하면 캐릭터 피드와 브이로그를 앱처럼 열 수 있습니다.",
            dismiss: "닫기",
            install: "방법 확인",
            installing: "안내 확인 중",
            title: "FanLetter를 홈 화면에 추가",
          }
        : {
            body: "설치하면 FanLetter 캐릭터 피드와 브이로그를 더 빠르게 이어볼 수 있습니다.",
            dismiss: "나중에",
            install: "앱 설치",
            installing: "설치 화면 여는 중",
            title: "FanLetter 앱으로 열기",
          };
    }

    return environment.platform === "ios"
      ? {
          body: "Use Safari Share, then Add to Home Screen to open FanLetter like an app.",
          dismiss: "Close",
          install: "Got it",
          installing: "Checking guide",
          title: "Add FanLetter to Home Screen",
        }
      : {
          body: "Install FanLetter to continue character feeds and vlogs faster.",
          dismiss: "Maybe later",
          install: "Install app",
          installing: "Opening install prompt",
          title: "Open FanLetter as an app",
        };
  }, [environment.platform, locale]);

  const eligibleSurface = publicSurfacePattern.test(pathname);
  const currentPath = useMemo(() => {
    const search = searchParams.toString();

    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

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
    setDismissed(readDismissedState(Date.now()));
  }, []);

  useEffect(() => {
    if (
      !eligibleSurface ||
      !environment.ready ||
      environment.restrictedInApp ||
      environment.standalone ||
      environment.platform !== "android"
    ) {
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
  }, [eligibleSurface, environment]);

  const isEligible =
    eligibleSurface &&
    environment.ready &&
    !dismissed &&
    !environment.restrictedInApp &&
    !environment.standalone &&
    (environment.platform === "ios" ||
      (environment.platform === "android" && Boolean(installPrompt)));

  useEffect(() => {
    if (!isEligible || trackedViewRef.current) {
      return;
    }

    trackedViewRef.current = true;
    trackFunnelEvent("pwa_install_banner_view", {
      metadata: {
        app: "fanletter",
        hasPrompt: Boolean(installPrompt),
        platform: environment.platform,
        surface: "fanletter-mobile",
      },
      referralCode,
      shareId,
      targetHref: currentPath,
    });
  }, [
    currentPath,
    environment.platform,
    installPrompt,
    isEligible,
    referralCode,
    shareId,
  ]);

  const dismiss = useCallback((reason: InstallDismissReason = "later") => {
    safeWriteStorage(
      dismissedStorageKey,
      createDismissRecord({
        now: Date.now(),
        platform: environment.platform,
        reason,
        snoozeMs:
          reason === "accepted" ? installAcceptedSnoozeMs : installPromptSnoozeMs,
      }),
    );
    setDismissed(true);
    trackFunnelEvent("pwa_install_dismiss", {
      metadata: {
        app: "fanletter",
        platform: environment.platform,
        reason,
        surface: "fanletter-mobile",
      },
      referralCode,
      shareId,
      targetHref: currentPath,
    });
  }, [currentPath, environment.platform, referralCode, shareId]);

  const install = useCallback(async () => {
    if (environment.platform === "ios") {
      trackFunnelEvent("pwa_install_click", {
        metadata: {
          app: "fanletter",
          platform: "ios",
          surface: "fanletter-mobile-guide",
        },
        referralCode,
        shareId,
        targetHref: currentPath,
      });
      dismiss("ios-guide");
      return;
    }

    if (!installPrompt) {
      return;
    }

    setPromptState("prompting");
    trackFunnelEvent("pwa_install_click", {
      metadata: {
        app: "fanletter",
        platform: environment.platform,
        surface: "fanletter-mobile",
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
          app: "fanletter",
          outcome: outcome.outcome,
          platform: environment.platform,
          surface: "fanletter-mobile-result",
        },
        referralCode,
        shareId,
        targetHref: currentPath,
      });

      if (outcome.outcome === "accepted") {
        dismiss("accepted");
      }
    } finally {
      setPromptState("idle");
      setInstallPrompt(null);
    }
  }, [
    currentPath,
    dismiss,
    environment.platform,
    installPrompt,
    referralCode,
    shareId,
  ]);

  if (!isEligible) {
    return null;
  }

  const canPrompt = environment.platform === "ios" || Boolean(installPrompt);

  return (
    <aside className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md sm:bottom-5">
      <div className="overflow-hidden rounded-lg border border-[#44f26e]/34 bg-[#030504]/96 p-3 text-white shadow-[0_22px_70px_rgba(0,0,0,0.36)] backdrop-blur-xl">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
            <Smartphone className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-5">{copy.title}</p>
                <p className="mt-1 text-xs font-medium leading-5 text-white/64">
                  {copy.body}
                </p>
              </div>
              <button
                aria-label={copy.dismiss}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/58 transition hover:text-white"
                onClick={() => {
                  dismiss("later");
                }}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                className={cn(
                  "inline-flex h-10 flex-1 items-center justify-center rounded-full bg-[#44f26e] px-4 text-sm font-semibold text-black transition hover:bg-[#67ff88]",
                  !canPrompt && "cursor-not-allowed opacity-60",
                )}
                disabled={!canPrompt || promptState === "prompting"}
                onClick={() => {
                  void install();
                }}
                type="button"
              >
                {environment.platform === "ios" ? (
                  <Share2 className="mr-2 size-4" />
                ) : (
                  <Download className="mr-2 size-4" />
                )}
                {promptState === "prompting" ? copy.installing : copy.install}
              </button>
              <button
                className="inline-flex h-10 items-center justify-center rounded-full border border-white/14 px-4 text-sm font-semibold text-white/76 transition hover:text-white"
                onClick={() => {
                  dismiss("later");
                }}
                type="button"
              >
                {copy.dismiss}
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
