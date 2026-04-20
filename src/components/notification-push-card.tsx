"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, Smartphone } from "lucide-react";

import { type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type NotificationPushCopy = {
  denied: string;
  description: string;
  disable: string;
  disabling: string;
  enable: string;
  enabling: string;
  installRequired: string;
  notConfigured: string;
  subscribed: string;
  title: string;
  unsupported: string;
  unsubscribed: string;
};

type NotificationPushCardProps = {
  active: boolean;
  copy: NotificationPushCopy;
  locale: Locale;
  memberEmail: string | null;
  walletAddress: string | null;
};

type PushCardState = {
  error: string | null;
  isSubscribed: boolean;
  permission: NotificationPermission;
  status: "idle" | "subscribing" | "unsubscribing";
};

const vapidPublicKey =
  process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim() ?? "";

function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "PushManager" in window &&
    "serviceWorker" in navigator
  );
}

function isAppleMobileDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const platform = navigator.platform ?? "";
  const userAgent = navigator.userAgent ?? "";
  const isTouchMac =
    platform === "MacIntel" && navigator.maxTouchPoints > 1;

  return /iPad|iPhone|iPod/.test(userAgent) || isTouchMac;
}

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replaceAll("-", "+").replaceAll("_", "/");
  const raw = window.atob(normalized);

  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function getExistingServiceWorkerRegistration() {
  const scopedRegistration = await navigator.serviceWorker.getRegistration("/");

  if (scopedRegistration) {
    return scopedRegistration;
  }

  return navigator.serviceWorker.getRegistration();
}

async function ensurePushServiceWorkerRegistration() {
  const existingRegistration = await getExistingServiceWorkerRegistration();

  if (existingRegistration) {
    return existingRegistration;
  }

  return navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
}

export function NotificationPushCard({
  active,
  copy,
  locale,
  memberEmail,
  walletAddress,
}: NotificationPushCardProps) {
  const [state, setState] = useState<PushCardState>({
    error: null,
    isSubscribed: false,
    permission:
      typeof Notification === "undefined" ? "default" : Notification.permission,
    status: "idle",
  });
  const syncedEndpointRef = useRef<string | null>(null);
  const configured = Boolean(vapidPublicKey);
  const supported = isPushSupported();
  const requiresInstall = supported && isAppleMobileDevice() && !isStandaloneDisplayMode();

  const syncSubscriptionToServer = useCallback(
    async (subscription: PushSubscription) => {
      if (!memberEmail || !walletAddress || !configured) {
        return;
      }

      if (syncedEndpointRef.current === subscription.endpoint) {
        return;
      }

      const subscriptionJson = subscription.toJSON();
      const auth = subscriptionJson.keys?.auth?.trim() ?? "";
      const p256dh = subscriptionJson.keys?.p256dh?.trim() ?? "";

      if (!auth || !p256dh) {
        throw new Error(copy.unsupported);
      }

      const response = await fetch("/api/notifications/push-subscriptions", {
        body: JSON.stringify({
          email: memberEmail,
          locale,
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              auth,
              p256dh,
            },
          },
          walletAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? copy.unsupported);
      }

      syncedEndpointRef.current = subscription.endpoint;
    },
    [configured, copy.unsupported, locale, memberEmail, walletAddress],
  );

  useEffect(() => {
    if (!active || !supported) {
      return;
    }

    let cancelled = false;

    async function refreshSubscriptionState() {
      const registration = await getExistingServiceWorkerRegistration();
      const subscription = registration
        ? await registration.pushManager.getSubscription()
        : null;

      if (cancelled) {
        return;
      }

      setState((current) => ({
        ...current,
        error: null,
        isSubscribed: Boolean(subscription),
        permission: Notification.permission,
      }));

      if (!subscription) {
        syncedEndpointRef.current = null;
        return;
      }

      try {
        await syncSubscriptionToServer(subscription);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          error:
            error instanceof Error ? error.message : copy.unsupported,
        }));
      }
    }

    void refreshSubscriptionState();

    return () => {
      cancelled = true;
    };
  }, [active, copy.unsupported, supported, syncSubscriptionToServer]);

  async function handleEnable() {
    if (!supported || !configured || requiresInstall || !memberEmail || !walletAddress) {
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      status: "subscribing",
    }));

    try {
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      if (permission !== "granted") {
        setState((current) => ({
          ...current,
          permission,
          status: "idle",
        }));
        return;
      }

      const registration = await ensurePushServiceWorkerRegistration();
      const existingSubscription =
        await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          userVisibleOnly: true,
        }));

      await syncSubscriptionToServer(subscription);

      setState((current) => ({
        ...current,
        error: null,
        isSubscribed: true,
        permission,
        status: "idle",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error ? error.message : copy.unsupported,
        status: "idle",
      }));
    }
  }

  async function handleDisable() {
    if (!supported || !memberEmail || !walletAddress) {
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      status: "unsubscribing",
    }));

    try {
      const registration = await getExistingServiceWorkerRegistration();
      const subscription = registration
        ? await registration.pushManager.getSubscription()
        : null;

      if (subscription) {
        const endpoint = subscription.endpoint;

        await subscription.unsubscribe();
        syncedEndpointRef.current = null;

        const response = await fetch("/api/notifications/push-subscriptions", {
          body: JSON.stringify({
            email: memberEmail,
            endpoint,
            walletAddress,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "DELETE",
        });

        const data = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? copy.unsupported);
        }
      }

      setState((current) => ({
        ...current,
        error: null,
        isSubscribed: false,
        permission: Notification.permission,
        status: "idle",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error ? error.message : copy.unsupported,
        status: "idle",
      }));
    }
  }

  const statusText = state.error
    ? state.error
    : !configured
      ? copy.notConfigured
      : !supported
        ? copy.unsupported
        : requiresInstall
          ? copy.installRequired
          : !state.isSubscribed && state.permission === "denied"
            ? copy.denied
          : state.isSubscribed
            ? copy.subscribed
            : copy.unsubscribed;
  const actionDisabled =
    state.status !== "idle" ||
    !configured ||
    !supported ||
    requiresInstall ||
    (!state.isSubscribed && state.permission === "denied") ||
    !memberEmail ||
    !walletAddress;
  const actionLabel =
    state.isSubscribed
      ? state.status === "unsubscribing"
        ? copy.disabling
        : copy.disable
      : state.status === "subscribing"
        ? copy.enabling
        : copy.enable;

  return (
    <div className="rounded-[24px] border border-sky-200 bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(255,255,255,0.96))] px-4 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:px-5 sm:py-5">
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-5">
        <div className="min-w-0 space-y-2.5">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-700 shadow-[0_10px_24px_rgba(59,130,246,0.12)]">
              {state.isSubscribed ? (
                <BellRing className="size-4" />
              ) : (
                <Smartphone className="size-4" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950 sm:text-base">
                {copy.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600 sm:text-[0.95rem]">
                {copy.description}
              </p>
            </div>
          </div>
          <p
            className={cn(
              "text-xs font-medium leading-5 sm:text-sm",
              state.error
                ? "text-rose-600"
                : state.isSubscribed
                  ? "text-emerald-700"
                  : "text-slate-500",
            )}
          >
            {statusText}
          </p>
        </div>

        <button
          className={cn(
            "inline-flex h-11 shrink-0 items-center justify-center rounded-full px-4 text-sm font-semibold transition lg:min-w-[192px]",
            state.isSubscribed
              ? "border border-slate-200 bg-white text-slate-950 hover:border-slate-300 hover:bg-slate-50"
              : "bg-slate-950 text-white hover:bg-slate-800",
            actionDisabled && "cursor-not-allowed opacity-60",
          )}
          disabled={actionDisabled}
          onClick={() => {
            if (state.isSubscribed) {
              void handleDisable();
              return;
            }

            void handleEnable();
          }}
          type="button"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
