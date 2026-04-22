"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  GitBranch,
  Layers3,
  Megaphone,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import {
  AutoConnect,
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { AnimatedNumberText } from "@/components/animated-number-text";
import { EmailLoginDialog } from "@/components/email-login-dialog";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { NotificationCenterContent } from "@/components/notification-center-content";
import { NotificationCenterSheet } from "@/components/notification-center-sheet";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import type {
  AppNotificationPreferencesRecord,
  AppNotificationRecord,
  AppNotificationsResponse,
} from "@/lib/notifications";
import {
  createEmptyReferralNetworkSummary,
  type ManagedMemberReferralsResponse,
  type ManagedReferralTreeNodeRecord,
  type MemberRecord,
  type SyncMemberResponse,
} from "@/lib/member";
import { type Dictionary, localeLabels, type Locale } from "@/lib/i18n";
import { getReferralLevelTheme } from "@/lib/referral-level-theme";
import {
  getAppMetadata,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";
import { cn } from "@/lib/utils";

type ActivateNetworkState = {
  error: string | null;
  levelCounts: number[];
  member: MemberRecord | null;
  members: ManagedReferralTreeNodeRecord[];
  referrals: ManagedReferralTreeNodeRecord[];
  status: "idle" | "loading" | "ready" | "error";
  summary: ReturnType<typeof createEmptyReferralNetworkSummary>;
  totalReferrals: number;
};

type ActivateNetworkNotificationsState = {
  error: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  nextCursor: string | null;
  notifications: AppNotificationRecord[];
  open: boolean;
  preferences: AppNotificationPreferencesRecord | null;
  status: "idle" | "loading" | "ready" | "error";
  unreadCount: number;
};

export function ActivateNetworkPage({
  dictionary,
  locale,
  referralCode = null,
  requestedMemberEmail = null,
  returnToHref,
}: {
  dictionary: Dictionary;
  locale: Locale;
  referralCode?: string | null;
  requestedMemberEmail?: string | null;
  returnToHref: string;
}) {
  const account = useActiveAccount();
  const router = useRouter();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const [state, setState] = useState<ActivateNetworkState>({
    error: null,
    levelCounts: [],
    member: null,
    members: [],
    referrals: [],
    status: "idle",
    summary: createEmptyReferralNetworkSummary(),
    totalReferrals: 0,
  });
  const [notificationsState, setNotificationsState] =
    useState<ActivateNetworkNotificationsState>({
      error: null,
      hasMore: false,
      isLoadingMore: false,
      nextCursor: null,
      notifications: [],
      open: false,
      preferences: null,
      status: "idle",
      unreadCount: 0,
    });
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemberEmail, setSelectedMemberEmail] = useState<string | null>(
    null,
  );
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const isDisconnected = status !== "connected" || !accountAddress;
  const notificationCopy = dictionary.activateNetworkPage.notifications;
  const isCompletedMember = state.member?.status === "completed";
  const notificationsPageHref = buildPathWithReferral(
    `/${locale}/notifications`,
    referralCode,
  );
  const announcementsPageHref = buildPathWithReferral(
    `/${locale}/announcements`,
    referralCode,
  );

  const filteredMembers = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return state.members;
    }

    return state.members.filter((member) => {
      const referralCode = member.referralCode?.toLowerCase() ?? "";

      return (
        member.email.toLowerCase().includes(normalizedQuery) ||
        member.lastWalletAddress.toLowerCase().includes(normalizedQuery) ||
        referralCode.includes(normalizedQuery)
      );
    });
  }, [deferredSearchQuery, state.members]);

  const selectedMember =
    state.members.find((member) => member.email === selectedMemberEmail) ??
    filteredMembers[0] ??
    null;

  useEffect(() => {
    if (status === "connected") {
      setIsLoginDialogOpen(false);
      return;
    }

    setSearchQuery("");
    setSelectedMemberEmail(null);
    setNotificationsState({
      error: null,
      hasMore: false,
      isLoadingMore: false,
      nextCursor: null,
      notifications: [],
      open: false,
      preferences: null,
      status: "idle",
      unreadCount: 0,
    });
  }, [status]);

  useEffect(() => {
    if (!selectedMemberEmail && filteredMembers[0]) {
      setSelectedMemberEmail(filteredMembers[0].email);
      return;
    }

    if (
      selectedMemberEmail &&
      filteredMembers.length > 0 &&
      !filteredMembers.some((member) => member.email === selectedMemberEmail)
    ) {
      setSelectedMemberEmail(filteredMembers[0]?.email ?? null);
    }
  }, [filteredMembers, selectedMemberEmail]);

  useEffect(() => {
    const normalizedRequestedEmail = requestedMemberEmail?.trim().toLowerCase();

    if (!normalizedRequestedEmail) {
      return;
    }

    const matchedMember = state.members.find((member) => {
      return member.email.toLowerCase() === normalizedRequestedEmail;
    });

    if (matchedMember && matchedMember.email !== selectedMemberEmail) {
      setSelectedMemberEmail(matchedMember.email);
    }
  }, [requestedMemberEmail, selectedMemberEmail, state.members]);

  const loadNetwork = useCallback(async () => {
    if (!accountAddress) {
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      status: "loading",
    }));

    try {
      const email = await getUserEmail({ client: thirdwebClient });

      if (!email) {
        setState({
          error: dictionary.activateNetworkPage.errors.missingEmail,
          levelCounts: [],
          member: null,
          members: [],
          referrals: [],
          status: "error",
          summary: createEmptyReferralNetworkSummary(),
          totalReferrals: 0,
        });
        return;
      }

      const syncResponse = await fetch("/api/members", {
        body: JSON.stringify({
          chainId: chain.id,
          chainName: chain.name ?? "BSC",
          email,
          locale,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const syncData = (await syncResponse.json()) as
        | SyncMemberResponse
        | { error?: string };

      if (!syncResponse.ok) {
        throw new Error(
          "error" in syncData && syncData.error
            ? syncData.error
            : dictionary.activateNetworkPage.errors.loadFailed,
        );
      }

      if ("validationError" in syncData && syncData.validationError) {
        setState({
          error: syncData.validationError,
          levelCounts: [],
          member: syncData.member,
          members: [],
          referrals: [],
          status: "error",
          summary: createEmptyReferralNetworkSummary(),
          totalReferrals: 0,
        });
        return;
      }

      if (!("member" in syncData) || !syncData.member) {
        throw new Error(dictionary.activateNetworkPage.errors.loadFailed);
      }

      if (syncData.member.status !== "completed") {
        setState({
          error: null,
          levelCounts: [],
          member: syncData.member,
          members: [],
          referrals: [],
          status: "ready",
          summary: createEmptyReferralNetworkSummary(),
          totalReferrals: 0,
        });
        return;
      }

      const response = await fetch(
        `/api/members/referrals/manage?email=${encodeURIComponent(email)}`,
      );
      const data = (await response.json()) as
        | ManagedMemberReferralsResponse
        | { error?: string };

      if (!response.ok || !("member" in data) || !("members" in data)) {
        throw new Error(
          response.status === 403
            ? dictionary.activateNetworkPage.paymentRequired
            : response.status === 404
            ? dictionary.activateNetworkPage.memberMissing
            : "error" in data && data.error
              ? data.error
              : dictionary.activateNetworkPage.errors.loadFailed,
        );
      }

      setState({
        error: null,
        levelCounts: data.levelCounts,
        member: data.member,
        members: data.members,
        referrals: data.referrals,
        status: "ready",
        summary: data.summary,
        totalReferrals: data.totalReferrals,
      });
      setSelectedMemberEmail(data.members[0]?.email ?? null);
    } catch (error) {
      setState({
        error:
          error instanceof Error
            ? error.message
            : dictionary.activateNetworkPage.errors.loadFailed,
        levelCounts: [],
        member: null,
        members: [],
        referrals: [],
        status: "error",
        summary: createEmptyReferralNetworkSummary(),
        totalReferrals: 0,
      });
    }
  }, [accountAddress, chain.id, chain.name, dictionary, locale]);

  const openNotificationsPage = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const returnTo = `${window.location.pathname}${window.location.search}`;
    router.push(
      setPathSearchParams(notificationsPageHref, {
        returnTo,
      }),
    );
  }, [notificationsPageHref, router]);

  const loadNotifications = useCallback(
    async ({
      append = false,
      background = false,
      cursor = null,
      lightweight = false,
      memberEmail,
    }: {
      append?: boolean;
      background?: boolean;
      cursor?: string | null;
      lightweight?: boolean;
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
      } else if (!background) {
        setNotificationsState((current) => ({
          ...current,
          error: null,
          status: "loading",
        }));
      }

      try {
        const searchParams = new URLSearchParams({
          email: memberEmail,
          pageSize: lightweight ? "1" : "20",
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

        setNotificationsState((current) => {
          // Lightweight polling only exists to keep the badge count fresh.
          // Never let those responses overwrite the full notification list,
          // because they can resolve after the sheet has already opened.
          if (lightweight) {
            return {
              ...current,
              error: null,
              preferences: current.preferences ?? data.preferences,
              status: current.status === "idle" ? "ready" : current.status,
              unreadCount: data.unreadCount,
            };
          }

          return {
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
                      return (
                        existing.notificationId === notification.notificationId
                      );
                    });
                  }),
                ]
              : data.notifications,
            preferences: data.preferences,
            status: "ready",
            unreadCount: data.unreadCount,
          };
        });
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

  const markAllNotificationsAsRead = useCallback(async () => {
    const memberEmail = state.member?.email;

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
  }, [accountAddress, dictionary, state.member?.email]);

  const markNotificationAsRead = useCallback(
    async (notificationId: string) => {
      const memberEmail = state.member?.email;

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
    [accountAddress, dictionary, state.member?.email],
  );

  const updateNotificationPreference = useCallback(
    async (
      key:
        | "directMemberCompletedEnabled"
        | "networkContentPublishedEnabled"
        | "networkMemberCompletedEnabled"
        | "networkLevelCompletedEnabled",
      value: boolean,
    ) => {
      const memberEmail = state.member?.email;

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
    [accountAddress, dictionary, state.member?.email],
  );

  const openNotification = useCallback(
    async (notification: AppNotificationRecord) => {
      if (!notification.isRead) {
        await markNotificationAsRead(notification.notificationId);
      }

      if (notification.targetMemberEmail) {
        setSearchQuery("");
        setSelectedMemberEmail(notification.targetMemberEmail);
      }

      if (notification.href) {
        router.replace(notification.href, { scroll: false });
      }

      setNotificationsState((current) => ({
        ...current,
        open: false,
      }));
    },
    [markNotificationAsRead, router],
  );

  useEffect(() => {
    if (
      status !== "connected" ||
      !accountAddress ||
      !hasThirdwebClientId
    ) {
      setState({
        error: null,
        levelCounts: [],
        member: null,
        members: [],
        referrals: [],
        status: "idle",
        summary: createEmptyReferralNetworkSummary(),
        totalReferrals: 0,
      });
      return;
    }

    void loadNetwork();
  }, [accountAddress, loadNetwork, status]);

  useEffect(() => {
    if (
      status !== "connected" ||
      state.member?.status !== "completed" ||
      !state.member.email
    ) {
      setNotificationsState({
        error: null,
        hasMore: false,
        isLoadingMore: false,
        nextCursor: null,
        notifications: [],
        open: false,
        preferences: null,
        status: "idle",
        unreadCount: 0,
      });
      return;
    }

    void loadNotifications({
      background: true,
      lightweight: true,
      memberEmail: state.member.email,
    });

    const intervalId = window.setInterval(() => {
      void loadNotifications({
        background: true,
        lightweight: true,
        memberEmail: state.member?.email ?? "",
      });
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadNotifications, state.member?.email, state.member?.status, status]);

  useEffect(() => {
    if (
      !notificationsState.open ||
      status !== "connected" ||
      state.member?.status !== "completed" ||
      !state.member.email
    ) {
      return;
    }

    void loadNotifications({
      memberEmail: state.member.email,
    });
  }, [
    loadNotifications,
    notificationsState.open,
    state.member?.email,
    state.member?.status,
    status,
  ]);

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,161,58,0.16),transparent_24%),radial-gradient(circle_at_88%_12%,rgba(37,99,235,0.12),transparent_24%),linear-gradient(180deg,#f6efe3_0%,#fbf7ef_38%,#f7f1e8_100%)]" />
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

      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <header className="glass-card sticky top-[calc(env(safe-area-inset-top)+0.75rem)] z-30 -mx-4 flex flex-col gap-3 rounded-none border-x-0 px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:rounded-[28px] lg:border-x lg:px-5 lg:py-4">
          <div className="flex items-center gap-3">
            <Link
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:size-12"
              href={returnToHref}
            >
              <ArrowLeft className="size-4 sm:size-5" />
            </Link>
            <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_18px_35px_rgba(15,23,42,0.16)] sm:size-12">
              <GitBranch className="size-4 sm:size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="eyebrow hidden sm:block">
                {dictionary.activateNetworkPage.eyebrow}
              </p>
              <h1 className="truncate text-base font-semibold tracking-tight text-slate-950 sm:text-lg">
                {dictionary.activateNetworkPage.title}
              </h1>
              <p className="hidden text-sm text-slate-600 lg:block">
                {dictionary.activateNetworkPage.description}
              </p>
              <div className="mt-1 sm:hidden">
                <StatusChip labels={dictionary.common.status} status={status} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isCompletedMember ? (
                <button
                  className={cn(
                    "inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition hover:border-sky-200 hover:bg-sky-50/70 sm:size-11",
                    notificationsState.open && "border-sky-300 bg-sky-50 text-sky-800",
                  )}
                  onClick={() => {
                    if (
                      typeof window !== "undefined" &&
                      window.matchMedia("(max-width: 1023px)").matches
                    ) {
                      openNotificationsPage();
                      return;
                    }

                    setNotificationsState((current) => ({
                      ...current,
                      open: !current.open,
                    }));
                  }}
                  type="button"
                >
                  <Bell className="size-4" />
                </button>
              ) : null}
              {isCompletedMember ? (
                <Link
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-[#ead7b5] bg-[#fff8ea] text-[#7c6137] shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition hover:border-[#dfc79e] hover:bg-[#fff1d2] sm:size-11"
                  href={announcementsPageHref}
                >
                  <Megaphone className="size-4" />
                </Link>
              ) : null}
              <button
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:size-11"
                disabled={state.status === "loading"}
                onClick={() => {
                  void loadNetwork();
                }}
                type="button"
              >
                <RefreshCcw
                  className={cn("size-4", state.status === "loading" && "animate-spin")}
                />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="hidden sm:block">
              <StatusChip labels={dictionary.common.status} status={status} />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              {isCompletedMember ? (
                <button
                  className="hidden h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition hover:border-sky-200 hover:bg-sky-50/70 lg:inline-flex"
                  onClick={() => {
                    setNotificationsState((current) => ({
                      ...current,
                      open: !current.open,
                    }));
                  }}
                  type="button"
                >
                  <Bell className="size-4" />
                  <span>{notificationCopy.title}</span>
                  {notificationsState.unreadCount > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-slate-950 px-1.5 py-0.5 text-[0.64rem] font-semibold leading-none text-white">
                      {formatInteger(notificationsState.unreadCount, locale)}
                    </span>
                  ) : null}
                </button>
              ) : null}
              {isCompletedMember ? (
                <Link
                  className="hidden h-10 items-center gap-2 rounded-full border border-[#ead7b5] bg-[#fff8ea] px-3 text-sm font-medium text-[#7c6137] shadow-[0_12px_30px_rgba(15,23,42,0.05)] lg:inline-flex"
                  href={announcementsPageHref}
                >
                  <Megaphone className="size-4" />
                  {dictionary.announcementsPage.title}
                </Link>
              ) : null}
              {hasThirdwebClientId ? (
                isDisconnected ? (
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-medium text-white shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:bg-slate-800"
                    onClick={() => {
                      setIsLoginDialogOpen(true);
                    }}
                    type="button"
                  >
                    {dictionary.common.connectWallet}
                  </button>
                ) : null
              ) : (
                <div className="rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                  {dictionary.common.clientIdRequired}
                </div>
              )}
            </div>
          </div>
        </header>

        {!hasThirdwebClientId ? (
          <MessageCard>{dictionary.env.description}</MessageCard>
        ) : isDisconnected ? (
          <section className="glass-card rounded-[30px] p-5 sm:p-6">
            <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <div className="space-y-3">
                <p className="text-sm leading-6 text-slate-600">
                  {dictionary.activateNetworkPage.disconnected}
                </p>
                <button
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 sm:w-auto"
                  onClick={() => {
                    setIsLoginDialogOpen(true);
                  }}
                  type="button"
                >
                  {dictionary.common.connectWallet}
                </button>
              </div>
            </div>
          </section>
        ) : state.status === "loading" && !state.member ? (
          <MessageCard>{dictionary.activateNetworkPage.loading}</MessageCard>
        ) : state.member?.status !== "completed" ? (
          <MessageCard>{dictionary.activateNetworkPage.paymentRequired}</MessageCard>
        ) : (
          <>
            <LandingReveal variant="hero">
              <section className="relative overflow-hidden rounded-[32px] border border-slate-900/90 bg-[linear-gradient(150deg,#09111f_0%,#0f172a_48%,#1d4ed8_100%)] p-5 text-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:p-6">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.14),transparent_28%)]" />
                <div className="relative">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{dictionary.member.completedValue}</Badge>
                    <Badge>{dictionary.activateNetworkPage.title}</Badge>
                  </div>

                  <div className="mt-6 space-y-3">
                    <p className="eyebrow text-white/70">
                      {dictionary.activateNetworkPage.eyebrow}
                    </p>
                    <h2 className="max-w-2xl text-[1.95rem] font-semibold leading-[1] tracking-tight text-white sm:text-[2.85rem] sm:leading-[1.04]">
                      {dictionary.activateNetworkPage.title}
                    </h2>
                    <p className="max-w-2xl text-[0.98rem] leading-7 text-white/76 sm:text-lg">
                      {dictionary.activateNetworkPage.description}
                    </p>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryMetricCard
                      icon={<Users className="size-4" />}
                      label={dictionary.activateNetworkPage.labels.totalMembers}
                      locale={locale}
                      value={String(state.summary.totalMembers)}
                    />
                    <SummaryMetricCard
                      icon={<GitBranch className="size-4" />}
                      label={dictionary.activateNetworkPage.labels.directMembers}
                      locale={locale}
                      value={String(state.summary.directMembers)}
                    />
                    <SummaryMetricCard
                      icon={<Trophy className="size-4" />}
                      label={
                        dictionary.activateNetworkPage.labels.totalLifetimePoints
                      }
                      locale={locale}
                      value={`${formatInteger(state.summary.totalLifetimePoints, locale)}P`}
                    />
                    <SummaryMetricCard
                      icon={<Layers3 className="size-4" />}
                      label={
                        dictionary.activateNetworkPage.labels.totalSpendablePoints
                      }
                      locale={locale}
                      value={`${formatInteger(state.summary.totalSpendablePoints, locale)}P`}
                    />
                  </div>
                </div>
              </section>
            </LandingReveal>

            <section className="grid items-start gap-4 lg:grid-cols-[0.94fr_1.06fr]">
              <div className="space-y-4">
                <section className="glass-card rounded-[28px] p-4 sm:p-5 lg:hidden">
                  <SelectedMemberPanel
                    dictionary={dictionary}
                    locale={locale}
                    member={selectedMember}
                  />
                </section>

                <section className="glass-card rounded-[28px] p-4 sm:p-5">
                  <div className="space-y-1">
                    <div className="space-y-1">
                      <p className="eyebrow">{dictionary.activateNetworkPage.eyebrow}</p>
                      <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                        {dictionary.activateNetworkPage.labels.searchResults}
                      </h3>
                      <p className="text-sm leading-6 text-slate-600">
                        {dictionary.activateNetworkPage.leaderboardDescription}
                      </p>
                    </div>
                  </div>

                  <label className="mt-5 block">
                    <span className="sr-only">
                      {dictionary.activateNetworkPage.searchPlaceholder}
                    </span>
                    <div className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                      <Search className="size-4 shrink-0 text-slate-400" />
                      <input
                        className="w-full min-w-0 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                        onChange={(event) => {
                          setSearchQuery(event.target.value);
                        }}
                        placeholder={dictionary.activateNetworkPage.searchPlaceholder}
                        type="text"
                        value={searchQuery}
                      />
                    </div>
                  </label>

                  <div className="mt-4 space-y-3 lg:max-h-[42rem] lg:overflow-y-auto lg:pr-1">
                    {state.error ? (
                      <MessageCard tone="error">{state.error}</MessageCard>
                    ) : null}

                    {filteredMembers.length === 0 ? (
                      <MessageCard>{dictionary.activateNetworkPage.empty}</MessageCard>
                    ) : (
                      filteredMembers.map((member) => {
                        const isSelected = selectedMember?.email === member.email;

                        return (
                          <article
                            className={cn(
                              "rounded-[22px] border px-4 py-4 transition",
                              isSelected
                                ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_45px_rgba(15,23,42,0.16)]"
                                : "border-white/80 bg-white/90 text-slate-950 shadow-[0_18px_45px_rgba(15,23,42,0.06)] hover:border-slate-300 hover:bg-slate-50",
                            )}
                            key={member.email}
                          >
                            <button
                              className="w-full text-left"
                              onClick={() => {
                                setSelectedMemberEmail(member.email);
                              }}
                              type="button"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="break-all text-base font-semibold tracking-tight sm:truncate">
                                    {member.email}
                                  </p>
                                  <p
                                    className={cn(
                                      "mt-1 text-sm",
                                      isSelected ? "text-white/72" : "text-slate-600",
                                    )}
                                  >
                                    {formatAddressLabel(member.lastWalletAddress)}
                                  </p>
                                </div>
                                {member.membershipCardTier !== "none" ? (
                                  <MembershipCardBadge
                                    active={isSelected}
                                    dictionary={dictionary}
                                    membershipCardTier={member.membershipCardTier}
                                  />
                                ) : null}
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <Pill active={isSelected}>
                                  {dictionary.activateNetworkPage.labels.level} {member.depth}
                                </Pill>
                                <Pill active={isSelected}>
                                  {dictionary.activateNetworkPage.labels.pointTier}{" "}
                                  {getTierLabel(dictionary, member.tier)}
                                </Pill>
                                <Pill active={isSelected}>
                                  {formatInteger(member.lifetimePoints, locale)}P
                                </Pill>
                                <Pill active={isSelected}>
                                  {formatInteger(member.spendablePoints, locale)}P
                                </Pill>
                              </div>
                            </button>
                          </article>
                        );
                      })
                    )}
                  </div>
                </section>
              </div>

              <section className="hidden rounded-[28px] lg:sticky lg:top-24 lg:block">
                <div className="glass-card rounded-[28px] p-4 sm:p-5">
                  <SelectedMemberPanel
                    dictionary={dictionary}
                    locale={locale}
                    member={selectedMember}
                  />
                </div>
              </section>
            </section>

            <section className="glass-card rounded-[28px] p-4 sm:p-5">
              <div className="space-y-1">
                <p className="eyebrow">{dictionary.activateNetworkPage.eyebrow}</p>
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                  {dictionary.referralsPage.listTitle}
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  {dictionary.activateNetworkPage.treeDescription}
                </p>
              </div>

              <div className="mt-5">
                <ManagedReferralNetworkExplorer
                  dictionary={dictionary}
                  levelCounts={state.levelCounts}
                  locale={locale}
                  onSelectMember={(email) => {
                    setSelectedMemberEmail(email);
                  }}
                  referrals={state.referrals}
                  totalReferrals={state.totalReferrals}
                />
              </div>
            </section>
          </>
        )}
      </main>
      <NotificationCenterSheet
        closeLabel={dictionary.common.loginDialog.close}
        eyebrow={dictionary.activateNetworkPage.eyebrow}
        markAllDisabled={notificationsState.unreadCount === 0}
        markAllReadLabel={notificationCopy.markAllRead}
        onClose={() => {
          setNotificationsState((current) => ({
            ...current,
            open: false,
          }));
        }}
        onMarkAllRead={() => {
          void markAllNotificationsAsRead();
        }}
        open={notificationsState.open}
        title={notificationCopy.title}
        unreadCountText={formatTemplate(notificationCopy.unreadCount, {
          count: formatInteger(notificationsState.unreadCount, locale),
        })}
      >
        <NotificationCenterContent
          activePushCard={notificationsState.open && Boolean(state.member?.email)}
          dictionary={dictionary}
          hasMore={notificationsState.hasMore && Boolean(state.member?.email)}
          isLoadingMore={notificationsState.isLoadingMore}
          locale={locale}
          memberEmail={state.member?.email ?? null}
          notifications={notificationsState.notifications}
          notificationsError={notificationsState.error}
          notificationsStatus={notificationsState.status}
          onLoadMore={() => {
            void loadNotifications({
              append: true,
              cursor: notificationsState.nextCursor,
              memberEmail: state.member?.email ?? "",
            });
          }}
          onOpenNotification={(notification) => {
            void openNotification(notification);
          }}
          onUpdatePreference={(key, value) => {
            void updateNotificationPreference(key, value);
          }}
          preferences={notificationsState.preferences}
          walletAddress={accountAddress ?? null}
        />
      </NotificationCenterSheet>
    </div>
  );
}

function SelectedMemberPanel({
  dictionary,
  locale,
  member,
}: {
  dictionary: Dictionary;
  locale: Locale;
  member: ManagedReferralTreeNodeRecord | null;
}) {
  return (
    <>
      <div className="space-y-1">
        <p className="eyebrow">{dictionary.activateNetworkPage.eyebrow}</p>
        <h2 className="text-xl font-semibold tracking-tight text-slate-950">
          {dictionary.activateNetworkPage.labels.currentMember}
        </h2>
        <p className="text-sm leading-6 text-slate-600">
          {dictionary.activateNetworkPage.selectionHint}
        </p>
      </div>

      {member ? (
        <SelectedMemberCard
          dictionary={dictionary}
          locale={locale}
          member={member}
        />
      ) : (
        <div className="mt-5">
          <MessageCard>{dictionary.activateNetworkPage.empty}</MessageCard>
        </div>
      )}
    </>
  );
}

function SelectedMemberCard({
  className,
  dictionary,
  locale,
  member,
}: {
  className?: string;
  dictionary: Dictionary;
  locale: Locale;
  member: ManagedReferralTreeNodeRecord;
}) {
  return (
    <div className={cn("mt-5 space-y-4", className)}>
      <div className="rounded-[26px] border border-slate-900/90 bg-[linear-gradient(150deg,#0f172a_0%,#13233d_48%,#14532d_100%)] p-4 text-white shadow-[0_22px_60px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/52">
              {dictionary.activateNetworkPage.labels.currentMember}
            </p>
            <p className="mt-3 break-all text-xl font-semibold tracking-tight text-white">
              {member.email}
            </p>
          </div>
          {member.membershipCardTier !== "none" ? (
            <MembershipCardBadge
              active
              dictionary={dictionary}
              membershipCardTier={member.membershipCardTier}
            />
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <DarkMetric
            label={dictionary.activateNetworkPage.labels.lifetimePoints}
            locale={locale}
            value={`${formatInteger(member.lifetimePoints, locale)}P`}
          />
          <DarkMetric
            label={dictionary.activateNetworkPage.labels.spendablePoints}
            locale={locale}
            value={`${formatInteger(member.spendablePoints, locale)}P`}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard
          label={dictionary.activateNetworkPage.labels.memberStatus}
          value={
            member.status === "completed"
              ? dictionary.member.completedValue
              : dictionary.member.pendingValue
          }
        />
        <InfoCard
          label={dictionary.activateNetworkPage.labels.locale}
          value={localeLabels[member.locale as Locale] ?? member.locale}
        />
        <InfoCard
          label={dictionary.activateNetworkPage.labels.joinedAt}
          value={formatDateTime(member.registrationCompletedAt, locale)}
        />
        <InfoCard
          label={dictionary.activateNetworkPage.labels.lastConnectedAt}
          value={formatDateTime(member.lastConnectedAt, locale)}
        />
        <InfoCard
          label={dictionary.activateNetworkPage.labels.directChildren}
          value={formatInteger(member.directReferralCount, locale)}
        />
        <InfoCard
          label={dictionary.activateNetworkPage.labels.descendants}
          value={formatInteger(member.totalReferralCount, locale)}
        />
        <InfoCard
          className="sm:col-span-2"
          label={dictionary.activateNetworkPage.labels.walletAddress}
          value={member.lastWalletAddress}
        />
        <InfoCard
          label={dictionary.activateNetworkPage.labels.referralCode}
          value={member.referralCode ?? dictionary.common.notAvailable}
        />
        <InfoCard
          label={dictionary.activateNetworkPage.labels.referredByCode}
          value={member.referredByCode ?? dictionary.common.notAvailable}
        />
        <InfoCard
          label={dictionary.activateNetworkPage.labels.placementReferralCode}
          value={
            member.placementReferralCode ?? dictionary.common.notAvailable
          }
        />
        <InfoCard
          label={dictionary.activateNetworkPage.labels.placementEmail}
          value={member.placementEmail ?? dictionary.common.notAvailable}
        />
        <InfoCard
          label={dictionary.activateNetworkPage.labels.pointTier}
          value={getTierLabel(dictionary, member.tier)}
        />
        <InfoCard
          label={dictionary.activateNetworkPage.labels.membershipCard}
          value={getMembershipCardLabel(dictionary, member.membershipCardTier)}
        />
      </div>
    </div>
  );
}

function ManagedReferralNetworkExplorer({
  dictionary,
  levelCounts,
  locale,
  onSelectMember,
  referrals,
  totalReferrals,
}: {
  dictionary: Dictionary;
  levelCounts: number[];
  locale: Locale;
  onSelectMember: (email: string) => void;
  referrals: ManagedReferralTreeNodeRecord[];
  totalReferrals: number;
}) {
  const [path, setPath] = useState<ManagedReferralTreeNodeRecord[]>([]);
  const focusedNode = path[path.length - 1] ?? null;
  const currentNodes = focusedNode ? focusedNode.children : referrals;
  const currentLevel = focusedNode ? focusedNode.depth + 1 : 1;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryMetricCard
          icon={<Users className="size-4" />}
          label={dictionary.activateNetworkPage.labels.directMembers}
          locale={locale}
          tone="light"
          value={String(referrals.length)}
        />
        <SummaryMetricCard
          icon={<Layers3 className="size-4" />}
          label={dictionary.activateNetworkPage.labels.totalMembers}
          locale={locale}
          tone="light"
          value={String(totalReferrals)}
        />
        <SummaryMetricCard
          icon={<GitBranch className="size-4" />}
          label={`${dictionary.activateNetworkPage.labels.level} ${currentLevel}`}
          locale={locale}
          tone="light"
          value={String(currentNodes.length)}
        />
      </div>

      {levelCounts.length > 0 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {levelCounts.map((count, index) => {
            const theme = getReferralLevelTheme(index + 1);

            return (
              <div
                className={cn(
                  "shrink-0 min-w-[7.6rem] rounded-[18px] border px-3.5 py-3",
                  theme.compactCardClassName,
                )}
                key={index}
              >
                <div className="flex items-start justify-between gap-3">
                  <p
                    className={cn(
                      "text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                      theme.eyebrowClassName,
                    )}
                  >
                    {dictionary.activateNetworkPage.labels.level} {index + 1}
                  </p>
                  <span
                    className={cn(
                      "mt-1 inline-flex size-2.5 rounded-full",
                      theme.dotClassName,
                    )}
                  />
                </div>
                <p
                  className={cn(
                    "mt-2 text-base font-semibold tracking-tight tabular-nums",
                    theme.compactValueClassName,
                  )}
                >
                  {formatInteger(count, locale)}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}

      {path.length > 0 ? (
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-100"
              onClick={() => {
                setPath([]);
              }}
              type="button"
            >
              {dictionary.referralsPage.rootLabel}
            </button>

            {path.map((node, index) => (
              <div className="flex items-center gap-2" key={`${node.email}-${index}`}>
                <ChevronRight className="size-4 text-slate-400" />
                <button
                  className={cn(
                    "inline-flex max-w-[14rem] items-center rounded-full border px-3 py-2 text-sm font-medium transition",
                    index === path.length - 1
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-100",
                  )}
                  onClick={() => {
                    setPath(path.slice(0, index + 1));
                  }}
                  type="button"
                >
                  <span className="truncate">{node.email}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {currentNodes.length === 0 ? (
        <MessageCard>{dictionary.activateNetworkPage.empty}</MessageCard>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {currentNodes.map((member) => (
            <article
              className="rounded-[22px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
              key={`${member.email}:${member.lastWalletAddress}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-slate-600">
                    {dictionary.activateNetworkPage.labels.level} {member.depth}
                  </div>
                  <p className="mt-2.5 break-all text-base font-semibold tracking-tight text-slate-950">
                    {member.email}
                  </p>
                </div>

                {member.membershipCardTier !== "none" ? (
                  <MembershipCardBadge
                    dictionary={dictionary}
                    membershipCardTier={member.membershipCardTier}
                  />
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <InfoCard
                  label={dictionary.activateNetworkPage.labels.lifetimePoints}
                  value={`${formatInteger(member.lifetimePoints, locale)}P`}
                />
                <InfoCard
                  label={dictionary.activateNetworkPage.labels.spendablePoints}
                  value={`${formatInteger(member.spendablePoints, locale)}P`}
                />
                <InfoCard
                  label={dictionary.activateNetworkPage.labels.pointTier}
                  value={getTierLabel(dictionary, member.tier)}
                />
                <InfoCard
                  label={dictionary.activateNetworkPage.labels.membershipCard}
                  value={getMembershipCardLabel(dictionary, member.membershipCardTier)}
                />
                <InfoCard
                  label={dictionary.activateNetworkPage.labels.directChildren}
                  value={formatInteger(member.directReferralCount, locale)}
                />
                <InfoCard
                  label={dictionary.activateNetworkPage.labels.descendants}
                  value={formatInteger(member.totalReferralCount, locale)}
                />
              </div>

              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                  onClick={() => {
                    onSelectMember(member.email);
                  }}
                  type="button"
                >
                  {dictionary.activateNetworkPage.labels.currentMember}
                </button>
                {member.children.length > 0 ? (
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                    onClick={() => {
                      setPath([...path, member]);
                      onSelectMember(member.email);
                    }}
                    type="button"
                  >
                    {dictionary.referralsPage.actions.viewChildren}
                    <span className="rounded-full bg-white/14 px-2 py-1 text-xs text-white">
                      {formatInteger(member.directReferralCount, locale)}
                    </span>
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}


function SummaryMetricCard({
  icon,
  label,
  locale,
  tone = "dark",
  value,
}: {
  icon: ReactNode;
  label: string;
  locale: Locale;
  tone?: "dark" | "light";
  value: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[120px] flex-col rounded-[24px] p-4",
        tone === "dark"
          ? "border border-white/12 bg-white/10 backdrop-blur"
          : "border border-slate-200 bg-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.06)]",
      )}
    >
      <div
        className={cn(
          "flex min-h-[2.75rem] items-start gap-2",
          tone === "dark" ? "text-white/70" : "text-slate-500",
        )}
      >
        <div
          className={cn(
            "pt-0.5",
            tone === "dark" ? "text-white/72" : "text-slate-500",
          )}
        >
          {icon}
        </div>
        <p className="text-xs leading-5 uppercase tracking-[0.18em]">{label}</p>
      </div>
      <div className="mt-auto flex items-end justify-end pt-4">
        <p
          className={cn(
            "text-right text-2xl font-semibold tracking-tight tabular-nums",
            tone === "dark" ? "text-white" : "text-slate-950",
          )}
        >
          <AnimatedNumberText locale={locale} value={value} />
        </p>
      </div>
    </div>
  );
}

function DarkMetric({
  label,
  locale,
  value,
}: {
  label: string;
  locale: Locale;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/8 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur">
      <p className="text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-white/45">
        {label}
      </p>
      <div className="mt-2 flex justify-end">
        <p className="text-right text-lg font-semibold text-white tabular-nums">
          <AnimatedNumberText locale={locale} value={value} />
        </p>
      </div>
    </div>
  );
}

function InfoCard({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[18px] border border-slate-200 bg-white/90 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-all text-sm font-semibold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function Badge({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/82 backdrop-blur">
      <ShieldCheck className="size-3.5" />
      {children}
    </span>
  );
}

function Pill({
  active = false,
  children,
}: {
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium",
        active
          ? "border-white/18 bg-white/10 text-white/82"
          : "border-slate-200 bg-slate-50 text-slate-700",
      )}
    >
      {children}
    </span>
  );
}

function MembershipCardBadge({
  active = false,
  dictionary,
  membershipCardTier,
}: {
  active?: boolean;
  dictionary: Dictionary;
  membershipCardTier: ManagedReferralTreeNodeRecord["membershipCardTier"];
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]",
        active
          ? "bg-white/12 text-white"
          : membershipCardTier === "gold"
            ? "bg-amber-100 text-amber-950"
            : "bg-emerald-100 text-emerald-950",
      )}
    >
      {getMembershipCardLabel(dictionary, membershipCardTier)}
    </span>
  );
}

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

function StatusChip({
  labels,
  status,
}: {
  labels: Dictionary["common"]["status"];
  status: "connected" | "disconnected" | "connecting" | "unknown";
}) {
  const copy =
    status === "connected"
      ? labels.connected
      : status === "connecting"
        ? labels.connecting
        : status === "unknown"
          ? labels.unknown
          : labels.disconnected;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium",
        status === "connected" &&
          "border-emerald-200 bg-emerald-50 text-emerald-900",
        status === "connecting" &&
          "border-blue-200 bg-blue-50 text-blue-900",
        status === "unknown" &&
          "border-slate-200 bg-slate-50 text-slate-700",
        status === "disconnected" &&
          "border-slate-200 bg-white text-slate-700",
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          status === "connected" && "bg-emerald-500",
          status === "connecting" && "bg-blue-500",
          status === "unknown" && "bg-slate-400",
          status === "disconnected" && "bg-slate-400",
        )}
      />
      {copy}
    </div>
  );
}

function getTierLabel(
  dictionary: Dictionary,
  tier: ManagedReferralTreeNodeRecord["tier"],
) {
  return dictionary.rewardsPage.tiers[tier];
}

function getMembershipCardLabel(
  dictionary: Dictionary,
  membershipCardTier: ManagedReferralTreeNodeRecord["membershipCardTier"],
) {
  if (membershipCardTier === "gold") {
    return dictionary.rewardsPage.tiers.gold;
  }

  if (membershipCardTier === "silver") {
    return dictionary.rewardsPage.tiers.silver;
  }

  return dictionary.common.notAvailable;
}

function formatAddressLabel(address: string) {
  if (!address) {
    return "-";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatInteger(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatTemplate(
  template: string,
  replacements: Record<string, string | number>,
) {
  return Object.entries(replacements).reduce((message, [key, value]) => {
    return message.replaceAll(`{${key}}`, String(value));
  }, template);
}
