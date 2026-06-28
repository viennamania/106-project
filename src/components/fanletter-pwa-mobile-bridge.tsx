"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Share2,
  Smartphone,
  X,
} from "lucide-react";

import {
  buildChromeIntentUrl,
  isRestrictedInAppBrowser,
} from "@/lib/in-app-browser";
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
type LinkCopyState = "copied" | "error" | "idle";
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
  /^\/(?:ko|en|ja|zh|vi|id)\/fanletter(?:\/?$|\/(?:feed|start|onboarding|content|creator|requests|news)(?:\/|$))/;

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

function getCurrentTargetHref(fallbackPath: string) {
  if (typeof window === "undefined") {
    return fallbackPath;
  }

  return window.location.href;
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
  const [promptState, setPromptState] =
    useState<"idle" | "opening" | "prompting">("idle");
  const [guideVisible, setGuideVisible] = useState(false);
  const [linkCopyState, setLinkCopyState] = useState<LinkCopyState>("idle");

  const copy = useMemo(() => {
    if (locale === "ko") {
      if (environment.restrictedInApp) {
        return {
          body:
            "SNS 앱 안에서는 PWA 설치와 알림이 제한될 수 있습니다. 외부 브라우저에서 열고 홈 화면에 추가하면 다음부터 바로 들어올 수 있습니다.",
          copied: "복사됨",
          copyError: "복사 실패",
          copyLink: "링크 복사",
          dismiss: "나중에",
          guideSteps:
            environment.platform === "ios"
              ? [
                  "SNS 앱 메뉴에서 Safari로 열거나 링크를 복사해 Safari에 붙여넣습니다.",
                  "Safari 공유 버튼을 누릅니다.",
                  "\"홈 화면에 추가\"를 선택합니다.",
                ]
              : [
                  "Chrome에서 열린 뒤 브라우저 메뉴를 누릅니다.",
                  "\"앱 설치\" 또는 \"홈 화면에 추가\"를 선택합니다.",
                  "홈 화면의 AIAVpark 아이콘으로 다시 들어옵니다.",
                ],
          guideTitle: "홈 화면 바로가기 만드는 방법",
          install:
            environment.platform === "android"
              ? "Chrome에서 열기"
              : "방법 보기",
          installing:
            environment.platform === "android"
              ? "Chrome 여는 중"
              : "방법 확인 중",
          title: "AIAVpark 바로가기 만들기",
        };
      }

      if (environment.platform === "ios") {
        return {
          body: "Safari 공유 버튼에서 홈 화면에 추가하면 AIAVpark News와 AI 캐릭터 브이로그를 앱처럼 열 수 있습니다.",
          copied: "복사됨",
          copyError: "복사 실패",
          copyLink: "링크 복사",
          dismiss: "닫기",
          guideSteps: [
            "Safari 공유 버튼을 누릅니다.",
            "\"홈 화면에 추가\"를 선택합니다.",
            "홈 화면의 AIAVpark 아이콘으로 다시 들어옵니다.",
          ],
          guideTitle: "iPhone 홈 화면 추가",
          install: "방법 보기",
          installing: "안내 확인 중",
          title: "AIAVpark를 홈 화면에 추가",
        };
      }

      return installPrompt
        ? {
            body: "설치하면 AIAVpark News, AI 캐릭터, 브이로그 구매 흐름을 더 빠르게 이어볼 수 있습니다.",
            copied: "복사됨",
            copyError: "복사 실패",
            copyLink: "링크 복사",
            dismiss: "나중에",
            guideSteps: [
              "브라우저 설치 안내가 열리면 설치를 선택합니다.",
              "홈 화면의 AIAVpark 아이콘으로 다시 들어옵니다.",
            ],
            guideTitle: "앱 설치 방법",
            install: "앱 설치",
            installing: "설치 화면 여는 중",
            title: "AIAVpark 앱으로 열기",
          }
        : {
            body: "Chrome 메뉴에서 홈 화면에 추가하면 AIAVpark News와 브이로그 제작 화면을 앱처럼 빠르게 열 수 있습니다.",
            copied: "복사됨",
            copyError: "복사 실패",
            copyLink: "링크 복사",
            dismiss: "나중에",
            guideSteps: [
              "Chrome 오른쪽 위 메뉴를 누릅니다.",
              "\"앱 설치\" 또는 \"홈 화면에 추가\"를 선택합니다.",
              "홈 화면의 AIAVpark 아이콘으로 다시 들어옵니다.",
            ],
            guideTitle: "Android 홈 화면 추가",
            install: "방법 보기",
            installing: "안내 확인 중",
            title: "AIAVpark를 홈 화면에 추가",
          };
    }

    if (environment.restrictedInApp) {
      return {
        body:
          "Social app browsers can limit PWA install and notifications. Open AIAVpark in an external browser, then add it to your Home Screen.",
        copied: "Copied",
        copyError: "Copy failed",
        copyLink: "Copy link",
        dismiss: "Maybe later",
        guideSteps:
          environment.platform === "ios"
            ? [
                "Open this link in Safari or copy it into Safari.",
                "Tap Safari Share.",
                "Choose Add to Home Screen.",
              ]
            : [
                "Open this link in Chrome.",
                "Use Install app or Add to Home screen from the browser menu.",
                "Return from the AIAVpark icon on your Home Screen.",
              ],
        guideTitle: "Create a Home Screen shortcut",
        install:
          environment.platform === "android"
            ? "Open in Chrome"
            : "View steps",
        installing:
          environment.platform === "android"
            ? "Opening Chrome"
            : "Opening guide",
        title: "Create an AIAVpark shortcut",
      };
    }

    if (environment.platform === "ios") {
      return {
        body: "Use Safari Share, then Add to Home Screen to open AIAVpark News and AI character vlogs like an app.",
        copied: "Copied",
        copyError: "Copy failed",
        copyLink: "Copy link",
        dismiss: "Close",
        guideSteps: [
          "Tap Safari Share.",
          "Choose Add to Home Screen.",
          "Return from the AIAVpark icon on your Home Screen.",
        ],
        guideTitle: "Add on iPhone",
        install: "View steps",
        installing: "Checking guide",
        title: "Add AIAVpark to Home Screen",
      };
    }

    return installPrompt
      ? {
          body: "Install AIAVpark to continue News, AI characters, and purchased vlogs faster.",
          copied: "Copied",
          copyError: "Copy failed",
          copyLink: "Copy link",
          dismiss: "Maybe later",
          guideSteps: [
            "Use the browser install prompt.",
            "Return from the AIAVpark icon on your Home Screen.",
          ],
          guideTitle: "Install app",
          install: "Install app",
          installing: "Opening install prompt",
          title: "Open AIAVpark as an app",
        }
      : {
          body: "Use Chrome's menu to add AIAVpark to your Home Screen and open News or vlog creation like an app.",
          copied: "Copied",
          copyError: "Copy failed",
          copyLink: "Copy link",
          dismiss: "Maybe later",
          guideSteps: [
            "Open Chrome's menu.",
            "Choose Install app or Add to Home screen.",
            "Return from the AIAVpark icon on your Home Screen.",
          ],
          guideTitle: "Add on Android",
          install: "View steps",
          installing: "Checking guide",
          title: "Add AIAVpark to Home Screen",
        };
  }, [environment.platform, environment.restrictedInApp, installPrompt, locale]);

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
    if (!eligibleSurface) {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      const platform = getInstallPlatform(window.navigator.userAgent ?? "");

      if (platform !== "android") {
        return;
      }

      if (isStandaloneDisplayMode()) {
        return;
      }

      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [eligibleSurface]);

  const isEligible =
    eligibleSurface &&
    environment.ready &&
    !dismissed &&
    !environment.standalone &&
    (environment.restrictedInApp ||
      environment.platform === "ios" ||
      environment.platform === "android");

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
        restrictedInApp: environment.restrictedInApp,
        surface: environment.restrictedInApp
          ? "fanletter-mobile-in-app"
          : "fanletter-mobile",
      },
      referralCode,
      shareId,
      targetHref: currentPath,
    });
  }, [
    currentPath,
    environment.platform,
    environment.restrictedInApp,
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
        restrictedInApp: environment.restrictedInApp,
        surface: environment.restrictedInApp
          ? "fanletter-mobile-in-app"
          : "fanletter-mobile",
      },
      referralCode,
      shareId,
      targetHref: currentPath,
    });
  }, [
    currentPath,
    environment.platform,
    environment.restrictedInApp,
    referralCode,
    shareId,
  ]);

  useEffect(() => {
    if (!eligibleSurface || !environment.ready || environment.standalone) {
      return;
    }

    const handleAppInstalled = () => {
      dismiss("accepted");
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [dismiss, eligibleSurface, environment.ready, environment.standalone]);

  useEffect(() => {
    if (linkCopyState === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLinkCopyState("idle");
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [linkCopyState]);

  const copyLink = useCallback(async () => {
    const targetHref = getCurrentTargetHref(currentPath);

    try {
      await navigator.clipboard.writeText(targetHref);
      setLinkCopyState("copied");
      setGuideVisible(true);
      trackFunnelEvent("pwa_install_click", {
        metadata: {
          action: "copy-link",
          app: "fanletter",
          platform: environment.platform,
          restrictedInApp: environment.restrictedInApp,
          surface: "fanletter-mobile-copy-link",
        },
        referralCode,
        shareId,
        targetHref,
      });
    } catch {
      setLinkCopyState("error");
    }
  }, [
    currentPath,
    environment.platform,
    environment.restrictedInApp,
    referralCode,
    shareId,
  ]);

  const install = useCallback(async () => {
    if (environment.restrictedInApp) {
      const targetHref = getCurrentTargetHref(currentPath);

      trackFunnelEvent("pwa_install_click", {
        metadata: {
          app: "fanletter",
          platform: environment.platform,
          restrictedInApp: true,
          surface: "fanletter-mobile-external-browser",
        },
        referralCode,
        shareId,
        targetHref,
      });

      if (environment.platform === "android") {
        const intentUrl = buildChromeIntentUrl(targetHref);

        if (intentUrl) {
          setPromptState("opening");
          window.location.href = intentUrl;
          window.setTimeout(() => {
            setPromptState("idle");
          }, 1400);
          return;
        }
      }

      setGuideVisible(true);
      return;
    }

    if (environment.platform === "ios") {
      setGuideVisible(true);
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
      return;
    }

    if (!installPrompt) {
      if (environment.platform === "android") {
        setGuideVisible(true);
        trackFunnelEvent("pwa_install_click", {
          metadata: {
            app: "fanletter",
            platform: "android",
            surface: "fanletter-mobile-guide",
          },
          referralCode,
          shareId,
          targetHref: currentPath,
        });
      }
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
    environment.restrictedInApp,
    installPrompt,
    referralCode,
    shareId,
  ]);

  if (!isEligible) {
    return null;
  }

  const canPrompt =
    environment.restrictedInApp ||
    environment.platform === "ios" ||
    environment.platform === "android" ||
    Boolean(installPrompt);
  const showCopyLinkAction =
    environment.restrictedInApp || environment.platform === "ios";
  const primaryIcon =
    environment.restrictedInApp && environment.platform === "android"
      ? "external"
      : environment.platform === "ios"
        ? "share"
        : installPrompt
          ? "download"
          : "share";

  return (
    <aside className="fixed inset-x-3 bottom-[calc(6.15rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md sm:bottom-5">
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
                  "inline-flex h-10 flex-1 items-center justify-center whitespace-nowrap rounded-full bg-[#44f26e] px-4 text-sm font-semibold text-black transition hover:bg-[#67ff88]",
                  !canPrompt && "cursor-not-allowed opacity-60",
                )}
                disabled={!canPrompt || promptState !== "idle"}
                onClick={() => {
                  void install();
                }}
                type="button"
              >
                {primaryIcon === "external" ? (
                  <ExternalLink className="mr-2 size-4" />
                ) : primaryIcon === "share" ? (
                  <Share2 className="mr-2 size-4" />
                ) : (
                  <Download className="mr-2 size-4" />
                )}
                {promptState !== "idle" ? copy.installing : copy.install}
              </button>
              {showCopyLinkAction ? (
                <button
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-white/14 px-3 text-sm font-semibold text-white/76 transition hover:text-white"
                  onClick={() => {
                    void copyLink();
                  }}
                  type="button"
                >
                  {linkCopyState === "copied" ? (
                    <Check className="mr-1.5 size-4 text-[#44f26e]" />
                  ) : (
                    <Copy className="mr-1.5 size-4" />
                  )}
                  <span className="whitespace-nowrap">
                    {linkCopyState === "copied"
                      ? copy.copied
                      : linkCopyState === "error"
                        ? copy.copyError
                        : copy.copyLink}
                  </span>
                </button>
              ) : (
                <button
                  className="inline-flex h-10 items-center justify-center rounded-full border border-white/14 px-4 text-sm font-semibold text-white/76 transition hover:text-white"
                  onClick={() => {
                    dismiss("later");
                  }}
                  type="button"
                >
                  {copy.dismiss}
                </button>
              )}
            </div>
            {guideVisible ? (
              <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.06] p-3">
                <p className="text-xs font-black text-[#9bffad]">
                  {copy.guideTitle}
                </p>
                <ol className="mt-2 space-y-1.5 text-xs font-medium leading-5 text-white/68">
                  {copy.guideSteps.map((step, index) => (
                    <li className="flex gap-2" key={step}>
                      <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[0.66rem] font-black text-white/72">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
