"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";

import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isAndroidBrowser() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /android/i.test(navigator.userAgent ?? "");
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

export function AndroidInstallBanner({
  className,
  locale,
}: {
  className?: string;
  locale: Locale;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [promptState, setPromptState] = useState<"idle" | "prompting">("idle");

  const copy = useMemo(
    () =>
      locale === "ko"
        ? {
            badge: "ANDROID APP INSTALL",
            body:
              "외부 브라우저로 잘 넘어왔습니다. 이미 설치했다면 홈 화면의 Pocket 앱에서 여는 것이 가장 좋고, 아직 설치하지 않았다면 지금 설치하면 다음부터 더 빠르게 열리고 푸시 흐름도 안정적입니다.",
            dismiss: "나중에",
            fallback:
              "이미 설치했다면 홈 화면의 Pocket Smart Wallet 앱을 직접 열어보세요. 설치하지 않았다면 Chrome 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택하면 됩니다.",
            title: "이 흐름은 앱으로 여는 것이 가장 좋습니다",
            trigger: "앱 설치",
            triggering: "설치 화면 여는 중...",
          }
        : {
            badge: "ANDROID APP INSTALL",
            body:
              "You have reached the external browser. If Pocket is already installed, opening it from your home screen is best. If not, installing it now will make future opens faster and improve push flows.",
            dismiss: "Maybe later",
            fallback:
              "If Pocket is already installed, open it from your home screen. Otherwise use the Chrome menu and choose Install app or Add to Home screen.",
            title: "This flow works best as an installed app",
            trigger: "Install app",
            triggering: "Opening install prompt...",
          },
    [locale],
  );

  const fromBridge = searchParams.get("fromBridge") === "1";
  const storageKey = useMemo(
    () => `android-install-banner-dismissed:${pathname}`,
    [pathname],
  );
  const isEligible = useMemo(() => {
    return fromBridge && isAndroidBrowser() && !isStandaloneDisplayMode();
  }, [fromBridge]);

  useEffect(() => {
    if (!isEligible || typeof window === "undefined") {
      return;
    }

    setDismissed(window.sessionStorage.getItem(storageKey) === "1");
  }, [isEligible, storageKey]);

  useEffect(() => {
    if (!isEligible) {
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
  }, [isEligible]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(storageKey, "1");
    }
  }, [storageKey]);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) {
      return;
    }

    setPromptState("prompting");

    try {
      await installPrompt.prompt();
      const outcome = await installPrompt.userChoice;

      if (outcome.outcome === "accepted") {
        handleDismiss();
      }
    } finally {
      setPromptState("idle");
      setInstallPrompt(null);
    }
  }, [handleDismiss, installPrompt]);

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
        {installPrompt ? (
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
