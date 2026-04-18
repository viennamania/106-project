"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  RefreshCcw,
} from "lucide-react";
import {
  AutoConnect,
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { EmailLoginDialog } from "@/components/email-login-dialog";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { NotificationCenterContent } from "@/components/notification-center-content";
import { NotificationPushCard } from "@/components/notification-push-card";
import type {
  AppNotificationPreferencesRecord,
  AppNotificationRecord,
  AppNotificationsResponse,
} from "@/lib/notifications";
import type {
  MemberRecord,
  SyncMemberResponse,
} from "@/lib/member";
import { type Dictionary, type Locale } from "@/lib/i18n";
import {
  BSC_EXPLORER,
  getAppMetadata,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";
import { cn } from "@/lib/utils";

type MemberSyncState = {
  email: string | null;
  error: string | null;
  member: MemberRecord | null;
  status: "idle" | "syncing" | "ready" | "error";
};

type MemberNotificationsState = {
  error: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  nextCursor: string | null;
  notifications: AppNotificationRecord[];
  preferences: AppNotificationPreferencesRecord | null;
  status: "idle" | "loading" | "ready" | "error";
  unreadCount: number;
};

function MessageCard({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "error" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border px-4 py-4 text-sm leading-6 break-words",
        tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-950"
          : "border-slate-200 bg-white/90 text-slate-600",
      )}
    >
      {children}
    </div>
  );
}

function formatTemplate(
  template: string,
  replacements: Record<string, string | number>,
) {
  return Object.entries(replacements).reduce((message, [key, value]) => {
    return message.replaceAll(`{${key}}`, String(value));
  }, template);
}

export function NotificationsPage({
  dictionary,
  locale,
  returnToHref,
}: {
  dictionary: Dictionary;
  locale: Locale;
  returnToHref: string;
}) {
  const account = useActiveAccount();
  const router = useRouter();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const notificationCopy = dictionary.activateNetworkPage.notifications;
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const accountUrl = accountAddress
    ? `${BSC_EXPLORER}/address/${accountAddress}`
    : BSC_EXPLORER;
  const [memberSync, setMemberSync] = useState<MemberSyncState>({
    email: null,
    error: null,
    member: null,
    status: "idle",
  });
  const [notificationsState, setNotificationsState] =
    useState<MemberNotificationsState>({
      error: null,
      hasMore: false,
      isLoadingMore: false,
      nextCursor: null,
      notifications: [],
      preferences: null,
      status: "idle",
      unreadCount: 0,
    });
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const isCompletedMember = memberSync.member?.status === "completed";

  const loadNotifications = useCallback(
    async ({
      append = false,
      cursor = null,
      memberEmail,
    }: {
      append?: boolean;
      cursor?: string | null;
      memberEmail: string;
    }) => {
      if (!memberEmail || !accountAddress) {
        return;
      }

      if (append) {
        setNotificationsState((current) => ({
          ...current,
          error: null,
          isLoadingMore: true,
        }));
      } else {
        setNotificationsState((current) => ({
          ...current,
          error: null,
          status: "loading",
        }));
      }

      try {
        const searchParams = new URLSearchParams({
          email: memberEmail,
          pageSize: "20",
          walletAddress: accountAddress,
        });

        if (cursor) {
          searchParams.set("cursor", cursor);
        }

        const response = await fetch(`/api/notifications?${searchParams.toString()}`);
        const data = (await response.json()) as
          | AppNotificationsResponse
          | { error?: string };

        if (
          !response.ok ||
          !("hasMore" in data) ||
          !("nextCursor" in data) ||
          !("notifications" in data) ||
          !("preferences" in data)
        ) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : dictionary.activateNetworkPage.errors.loadFailed,
          );
        }

        setNotificationsState((current) => ({
          ...current,
          error: null,
          hasMore: data.hasMore,
          isLoadingMore: false,
          nextCursor: data.nextCursor,
          notifications: append
            ? [
                ...current.notifications,
                ...data.notifications.filter((notification) => {
                  return !current.notifications.some((existing) => {
                    return existing.notificationId === notification.notificationId;
                  });
                }),
              ]
            : data.notifications,
          preferences: data.preferences,
          status: "ready",
          unreadCount: data.unreadCount,
        }));
      } catch (error) {
        setNotificationsState((current) => ({
          ...current,
          error:
            error instanceof Error
              ? error.message
              : dictionary.activateNetworkPage.errors.loadFailed,
          isLoadingMore: false,
          status: "error",
        }));
      }
    },
    [accountAddress, dictionary],
  );

  const runMemberSync = useCallback(async () => {
    if (!accountAddress) {
      return;
    }

    setMemberSync((current) => ({
      ...current,
      error: null,
      status: "syncing",
    }));

    try {
      const email = await getUserEmail({ client: thirdwebClient });

      if (!email) {
        setMemberSync({
          email: null,
          error: dictionary.activateNetworkPage.errors.missingEmail,
          member: null,
          status: "error",
        });
        return;
      }

      const response = await fetch("/api/members", {
        body: JSON.stringify({
          chainId: chain.id,
          chainName: chain.name ?? "BSC",
          email,
          locale,
          syncMode: "light",
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as
        | SyncMemberResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : dictionary.activateNetworkPage.errors.loadFailed,
        );
      }

      if (!("member" in data) || !data.member) {
        throw new Error(dictionary.activateNetworkPage.errors.loadFailed);
      }

      setMemberSync({
        email: data.member.email,
        error: null,
        member: data.member,
        status: "ready",
      });
    } catch (error) {
      setMemberSync({
        email: null,
        error:
          error instanceof Error
            ? error.message
            : dictionary.activateNetworkPage.errors.loadFailed,
        member: null,
        status: "error",
      });
    }
  }, [accountAddress, chain.id, chain.name, dictionary, locale]);

  const markAllNotificationsAsRead = useCallback(async () => {
    const memberEmail = memberSync.member?.email;

    if (!memberEmail || !accountAddress) {
      return;
    }

    try {
      const response = await fetch("/api/notifications", {
        body: JSON.stringify({
          action: "mark_all_read",
          email: memberEmail,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as
        | AppNotificationsResponse
        | { error?: string };

      if (
        !response.ok ||
        !("hasMore" in data) ||
        !("nextCursor" in data) ||
        !("notifications" in data) ||
        !("preferences" in data)
      ) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : dictionary.activateNetworkPage.errors.loadFailed,
        );
      }

      setNotificationsState((current) => ({
        ...current,
        error: null,
        hasMore: data.hasMore,
        isLoadingMore: false,
        nextCursor: data.nextCursor,
        notifications: data.notifications,
        preferences: data.preferences,
        status: "ready",
        unreadCount: data.unreadCount,
      }));
    } catch (error) {
      setNotificationsState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : dictionary.activateNetworkPage.errors.loadFailed,
        isLoadingMore: false,
        status: "error",
      }));
    }
  }, [accountAddress, dictionary, memberSync.member?.email]);

  const markNotificationAsRead = useCallback(
    async (notificationId: string) => {
      const memberEmail = memberSync.member?.email;

      if (!memberEmail || !notificationId || !accountAddress) {
        return;
      }

      try {
        const response = await fetch("/api/notifications", {
          body: JSON.stringify({
            action: "mark_read",
            email: memberEmail,
            notificationIds: [notificationId],
            walletAddress: accountAddress,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        const data = (await response.json()) as
          | AppNotificationsResponse
          | { error?: string };

        if (
          !response.ok ||
          !("hasMore" in data) ||
          !("nextCursor" in data) ||
          !("notifications" in data) ||
          !("preferences" in data)
        ) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : dictionary.activateNetworkPage.errors.loadFailed,
          );
        }

        setNotificationsState((current) => ({
          ...current,
          error: null,
          hasMore: data.hasMore,
          isLoadingMore: false,
          nextCursor: data.nextCursor,
          notifications: data.notifications,
          preferences: data.preferences,
          status: "ready",
          unreadCount: data.unreadCount,
        }));
      } catch (error) {
        setNotificationsState((current) => ({
          ...current,
          error:
            error instanceof Error
              ? error.message
              : dictionary.activateNetworkPage.errors.loadFailed,
          isLoadingMore: false,
          status: "error",
        }));
      }
    },
    [accountAddress, dictionary, memberSync.member?.email],
  );

  const updateNotificationPreference = useCallback(
    async (
      key:
        | "directMemberCompletedEnabled"
        | "networkMemberCompletedEnabled"
        | "networkLevelCompletedEnabled",
      value: boolean,
    ) => {
      const memberEmail = memberSync.member?.email;

      if (!memberEmail || !accountAddress) {
        return;
      }

      try {
        const response = await fetch("/api/notifications", {
          body: JSON.stringify({
            action: "update_preferences",
            email: memberEmail,
            [key]: value,
            walletAddress: accountAddress,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        const data = (await response.json()) as
          | AppNotificationsResponse
          | { error?: string };

        if (
          !response.ok ||
          !("hasMore" in data) ||
          !("nextCursor" in data) ||
          !("notifications" in data) ||
          !("preferences" in data)
        ) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : dictionary.activateNetworkPage.errors.loadFailed,
          );
        }

        setNotificationsState((current) => ({
          ...current,
          error: null,
          hasMore: data.hasMore,
          isLoadingMore: false,
          nextCursor: data.nextCursor,
          notifications: data.notifications,
          preferences: data.preferences,
          status: "ready",
          unreadCount: data.unreadCount,
        }));
      } catch (error) {
        setNotificationsState((current) => ({
          ...current,
          error:
            error instanceof Error
              ? error.message
              : dictionary.activateNetworkPage.errors.loadFailed,
          isLoadingMore: false,
          status: "error",
        }));
      }
    },
    [accountAddress, dictionary, memberSync.member?.email],
  );

  const openNotification = useCallback(
    async (notification: AppNotificationRecord) => {
      if (!notification.isRead) {
        await markNotificationAsRead(notification.notificationId);
      }

      if (notification.href) {
        router.push(notification.href);
      }
    },
    [markNotificationAsRead, router],
  );

  useEffect(() => {
    if (status !== "connected" || !accountAddress || !hasThirdwebClientId) {
      setMemberSync({
        email: null,
        error: null,
        member: null,
        status: "idle",
      });
      setNotificationsState({
        error: null,
        hasMore: false,
        isLoadingMore: false,
        nextCursor: null,
        notifications: [],
        preferences: null,
        status: "idle",
        unreadCount: 0,
      });
      return;
    }

    void runMemberSync();
  }, [accountAddress, runMemberSync, status]);

  useEffect(() => {
    if (!isCompletedMember || !memberSync.member?.email) {
      setNotificationsState({
        error: null,
        hasMore: false,
        isLoadingMore: false,
        nextCursor: null,
        notifications: [],
        preferences: null,
        status: "idle",
        unreadCount: 0,
      });
      return;
    }

    void loadNotifications({ memberEmail: memberSync.member.email });

    const intervalId = window.setInterval(() => {
      void loadNotifications({ memberEmail: memberSync.member?.email ?? "" });
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isCompletedMember, loadNotifications, memberSync.member?.email]);

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_24%),radial-gradient(circle_at_0%_20%,rgba(255,255,255,0.62),transparent_20%),linear-gradient(180deg,#f7f2e8_0%,#fbf7ef_44%,#f6f2eb_100%)]" />
      <EmailLoginDialog
        dictionary={dictionary}
        onClose={() => {
          setIsLoginDialogOpen(false);
        }}
        open={isLoginDialogOpen}
        title={dictionary.common.connectModalTitle}
      />

      {hasThirdwebClientId ? (
        <AutoConnect
          accountAbstraction={smartWalletOptions}
          appMetadata={appMetadata}
          chain={smartWalletChain}
          client={thirdwebClient}
          wallets={supportedWallets}
        />
      ) : null}

      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <LandingReveal delay={10} variant="soft">
          <header className="glass-card flex flex-col gap-3 rounded-[26px] px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#111827,#1e293b)] text-white shadow-[0_16px_40px_rgba(15,23,42,0.2)]">
                <Bell className="size-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="eyebrow">{dictionary.activateNetworkPage.eyebrow}</p>
                <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                  {notificationCopy.title}
                </h1>
                <p className="hidden max-w-2xl text-sm leading-6 text-slate-600 sm:block">
                  {notificationCopy.pageDescription}
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
              <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                <Link
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                  href={returnToHref}
                >
                  <ArrowLeft className="size-4" />
                  {notificationCopy.dismiss}
                </Link>
              </div>

              {status === "connected" && accountAddress ? (
                <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                    onClick={() => {
                      void runMemberSync();
                    }}
                    type="button"
                  >
                    <RefreshCcw className="size-4" />
                    {dictionary.activateNetworkPage.actions.refresh}
                  </button>
                  <a
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                    href={accountUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {accountAddress.slice(0, 6)}...{accountAddress.slice(-4)}
                    <ArrowUpRight className="size-4" />
                  </a>
                </div>
              ) : hasThirdwebClientId ? (
                <button
                  className="inline-flex h-10 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                  onClick={() => {
                    setIsLoginDialogOpen(true);
                  }}
                  type="button"
                >
                  {dictionary.common.connectWallet}
                </button>
              ) : (
                <div className="rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-900">
                  {dictionary.common.clientIdRequired}
                </div>
              )}
            </div>
          </header>
        </LandingReveal>

        <LandingReveal delay={90} variant="soft">
          <section className="glass-card rounded-[30px] px-4 py-5 sm:px-5 sm:py-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <p className="eyebrow">{dictionary.activateNetworkPage.eyebrow}</p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
                  {notificationCopy.title}
                </h2>
                <p className="text-sm leading-6 text-slate-600">
                  {formatTemplate(notificationCopy.unreadCount, {
                    count: new Intl.NumberFormat(locale).format(
                      notificationsState.unreadCount,
                    ),
                  })}
                </p>
              </div>
              {isCompletedMember ? (
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={notificationsState.unreadCount === 0}
                  onClick={() => {
                    void markAllNotificationsAsRead();
                  }}
                  type="button"
                >
                  {notificationCopy.markAllRead}
                </button>
              ) : null}
            </div>

            {status !== "connected" || !accountAddress ? (
              <MessageCard>{dictionary.member.disconnected}</MessageCard>
            ) : memberSync.status === "syncing" ? (
              <MessageCard>{dictionary.member.syncing}</MessageCard>
            ) : memberSync.error ? (
              <MessageCard tone="error">{memberSync.error}</MessageCard>
            ) : memberSync.member ? (
              isCompletedMember ? (
                <NotificationCenterContent
                  activePushCard
                  dictionary={dictionary}
                  hasMore={notificationsState.hasMore}
                  isLoadingMore={notificationsState.isLoadingMore}
                  locale={locale}
                  memberEmail={memberSync.member.email}
                  notifications={notificationsState.notifications}
                  notificationsError={notificationsState.error}
                  notificationsStatus={notificationsState.status}
                  onLoadMore={() => {
                    void loadNotifications({
                      append: true,
                      cursor: notificationsState.nextCursor,
                      memberEmail: memberSync.member?.email ?? "",
                    });
                  }}
                  onOpenNotification={(notification) => {
                    void openNotification(notification);
                  }}
                  onUpdatePreference={(key, value) => {
                    void updateNotificationPreference(key, value);
                  }}
                  preferences={notificationsState.preferences}
                  walletAddress={accountAddress}
                />
              ) : (
                <div className="space-y-4">
                  <NotificationPushCard
                    active
                    copy={notificationCopy.push}
                    locale={locale}
                    memberEmail={memberSync.member.email}
                    walletAddress={accountAddress}
                  />
                  <MessageCard>{notificationCopy.availableAfterSignup}</MessageCard>
                </div>
              )
            ) : (
              <MessageCard>{dictionary.activateNetworkPage.memberMissing}</MessageCard>
            )}
          </section>
        </LandingReveal>
      </main>
    </div>
  );
}
