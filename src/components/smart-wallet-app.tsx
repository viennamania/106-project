"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Check,
  Copy,
  Mail,
  Megaphone,
  PenSquare,
  Rss,
  Sparkles,
  Users,
  WalletMinimal,
} from "lucide-react";
import { getContract } from "thirdweb";
import { transfer } from "thirdweb/extensions/erc20";
import {
  AutoConnect,
  TransactionButton,
  useActiveAccount,
  useDisconnect,
  useActiveWallet,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
  useWalletBalance,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { AnimatedNumberText } from "@/components/animated-number-text";
import { EmailLoginDialog } from "@/components/email-login-dialog";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { NotificationCenterContent } from "@/components/notification-center-content";
import { NotificationCenterSheet } from "@/components/notification-center-sheet";
import { NotificationPushCard } from "@/components/notification-push-card";
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";
import { CopyTextButton } from "@/components/copy-text-button";
import { ReferralNetworkExplorer } from "@/components/referral-network-explorer";
import { ReferralRewardsPanel } from "@/components/referral-rewards-panel";
import {
  buildPathWithReferral,
  buildReferralLandingPath,
  setPathSearchParams,
  type LandingPageBranding,
} from "@/lib/landing-branding";
import { getContentCopy } from "@/lib/content-copy";
import { getLandingBrandingCopy } from "@/lib/landing-branding-copy";
import type {
  AppNotificationPreferencesRecord,
  AppNotificationRecord,
  AppNotificationsResponse,
} from "@/lib/notifications";
import {
  createEmptyReferralRewardsSummary,
  type IncomingReferralState,
  MEMBER_SIGNUP_USDT_AMOUNT,
  MEMBER_SIGNUP_USDT_AMOUNT_WEI,
  REFERRAL_SIGNUP_LIMIT,
  type MemberReferralsResponse,
  type MemberRecord,
  type ReferralRewardsSummaryRecord,
  type ReferralTreeNodeRecord,
  type SyncMemberResponse,
} from "@/lib/member";
import { cn } from "@/lib/utils";
import {
  BSC_EXPLORER,
  BSC_USDT_ADDRESS,
  getAppMetadata,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";
import { type Dictionary, type Locale } from "@/lib/i18n";

type NoticeTone = "info" | "success" | "error";

type WalletNotice = {
  tone: NoticeTone;
  text: string;
  href?: string;
};

type MemberSyncState = {
  email: string | null;
  error: string | null;
  justCompleted: boolean;
  member: MemberRecord | null;
  status: "idle" | "syncing" | "ready" | "blocked" | "error";
};

type ReferralDashboardState = {
  error: string | null;
  lastUpdatedAt: string | null;
  levelCounts: number[];
  referrals: ReferralTreeNodeRecord[];
  rewards: ReferralRewardsSummaryRecord;
  status: "idle" | "loading" | "ready" | "error";
  totalReferrals: number;
};

type MemberNotificationsState = {
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

type ReferralExperienceResponse = {
  branding: LandingPageBranding | null;
  memberEmail: string | null;
  referralCode: string | null;
};

const GENERIC_MEMBER_SYNC_ERRORS = new Set([
  "error",
  "Failed to read member.",
  "Failed to sync member.",
  "Member sync failed.",
]);

const CELEBRATION_DURATION_MS = 4200;
const usdtContract = getContract({
  address: BSC_USDT_ADDRESS,
  chain: smartWalletChain,
  client: thirdwebClient,
});

export function SmartWalletApp({
  dictionary,
  incomingReferralBranding,
  incomingReferralState,
  locale,
  projectWallet,
}: {
  dictionary: Dictionary;
  incomingReferralBranding: LandingPageBranding | null;
  incomingReferralState: IncomingReferralState | null;
  locale: Locale;
  projectWallet: string | null;
}) {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const pathname = usePathname();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const status = useActiveWalletConnectionStatus();
  const { data: balance } = useWalletBalance({
    client: thirdwebClient,
    chain: smartWalletChain,
    address: account?.address,
    tokenAddress: BSC_USDT_ADDRESS,
  }, {
    refetchInterval: status === "connected" ? 5000 : false,
    refetchIntervalInBackground: true,
  });
  const [notice, setNotice] = useState<WalletNotice | null>(null);
  const [copied, setCopied] = useState(false);
  const [memberSync, setMemberSync] = useState<MemberSyncState>({
    email: null,
    error: null,
    justCompleted: false,
    member: null,
    status: "idle",
  });
  const [referralDashboard, setReferralDashboard] =
    useState<ReferralDashboardState>({
      error: null,
      lastUpdatedAt: null,
      levelCounts: [],
      referrals: [],
      rewards: createEmptyReferralRewardsSummary(),
      status: "idle",
      totalReferrals: 0,
    });
  const [notificationsState, setNotificationsState] =
    useState<MemberNotificationsState>({
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
  const [memberSponsorBranding, setMemberSponsorBranding] =
    useState<LandingPageBranding | null>(null);
  const [memberSponsorBrandingCode, setMemberSponsorBrandingCode] =
    useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);
  const celebrationTimeoutRef = useRef<number | null>(null);
  const syncInFlightRef = useRef(false);

  const appMetadata = getAppMetadata(dictionary.meta.description);
  const accountAddress = account?.address;
  const accountLabel = formatAddressLabel(accountAddress);
  const projectWalletUrl = projectWallet
    ? `${BSC_EXPLORER}/address/${projectWallet}`
    : BSC_EXPLORER;
  const incomingReferralCode = incomingReferralState?.code ?? null;
  const activeIncomingReferralCode =
    incomingReferralState?.status !== "invalid"
      ? incomingReferralCode
      : null;
  const memberSponsorReferralCode = getPrioritySponsorReferralCode(
    memberSync.member,
  );
  const preferredReferralCode =
    memberSponsorReferralCode ?? activeIncomingReferralCode;
  const preferredReferralBranding =
    memberSponsorReferralCode === null
      ? incomingReferralBranding
      : memberSponsorReferralCode === activeIncomingReferralCode
        ? incomingReferralBranding
        : memberSponsorBrandingCode === memberSponsorReferralCode
          ? memberSponsorBranding
          : null;
  const homeHref = buildReferralLandingPath(locale, preferredReferralCode);
  const notificationsPageHref = buildPathWithReferral(
    `/${locale}/notifications`,
    preferredReferralCode,
  );
  const activatePageHref = buildPathWithReferral(
    `/${locale}/activate`,
    preferredReferralCode,
  );
  const brandingStudioHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/branding-studio`, preferredReferralCode),
    {
      returnTo: activatePageHref,
    },
  );
  const creatorStudioHref = buildPathWithReferral(
    `/${locale}/creator/studio`,
    preferredReferralCode,
  );
  const networkFeedHref = buildPathWithReferral(
    `/${locale}/network-feed`,
    preferredReferralCode,
  );
  const rewardsHref = buildPathWithReferral(
    `/${locale}/rewards`,
    preferredReferralCode,
  );
  const announcementsPageHref = buildPathWithReferral(
    `/${locale}/announcements`,
    preferredReferralCode,
  );
  const activateNetworkHref = buildPathWithReferral(
    `/${locale}/activate/network`,
    preferredReferralCode,
  );
  const notificationCopy = dictionary.activateNetworkPage.notifications;
  const isSelfIncomingReferral =
    incomingReferralCode !== null &&
    memberSync.member?.referralCode === incomingReferralCode;
  const isSignupCompleted = memberSync.member?.status === "completed";
  const canManagePushAlerts =
    status === "connected" &&
    Boolean(accountAddress) &&
    Boolean(memberSync.member?.email);
  const isIncomingReferralOverflow =
    incomingReferralState?.status === "full" && !isSignupCompleted;
  const isMembershipLoading =
    status === "connected" &&
    hasThirdwebClientId &&
    memberSync.status !== "ready" &&
    memberSync.status !== "blocked" &&
    memberSync.status !== "error";
  const referralLink = memberSync.member?.referralCode
    ? getReferralLink(memberSync.member.referralCode, locale)
    : null;
  const showMemberRegistryPanel =
    memberSync.status === "syncing" ||
    memberSync.status === "blocked" ||
    memberSync.status === "error" ||
    Boolean(memberSync.member);
  const paymentCtaLabel = isSignupCompleted
    ? dictionary.sponsored.completedCta
    : dictionary.sponsored.cta.replace(
        "{amount}",
        MEMBER_SIGNUP_USDT_AMOUNT,
      );
  const insufficientBalanceMessage = formatTemplate(
    dictionary.member.errors.insufficientBalance,
    {
      amount: MEMBER_SIGNUP_USDT_AMOUNT,
    },
  );
  const isInsufficientUsdtBalance =
    !isSignupCompleted &&
    typeof balance?.value === "bigint" &&
    balance.value < BigInt(MEMBER_SIGNUP_USDT_AMOUNT_WEI);
  const isSignupBalanceLoading =
    status === "connected" &&
    !isSignupCompleted &&
    accountAddress !== undefined &&
    !balance;
  const signupBalanceValue = balance?.displayValue
    ? formatBalance(balance.displayValue, balance.symbol ?? "USDT", locale)
    : dictionary.common.notAvailable;
  const mobileDockEyebrow = isSignupCompleted
    ? dictionary.member.eyebrow
    : status === "connected" && hasThirdwebClientId
      ? dictionary.sponsored.eyebrow
      : dictionary.onboarding.eyebrow;
  const mobileDockTitle = isSignupCompleted
    ? dictionary.member.newMember
    : status === "connected" && hasThirdwebClientId
      ? `${MEMBER_SIGNUP_USDT_AMOUNT} USDT`
      : dictionary.runway.steps[0].title;
  const showMobileActionDock =
    hasThirdwebClientId && status === "connected" && !isSignupCompleted;
  const isSignupPaymentDisabled =
    !accountAddress ||
    !hasThirdwebClientId ||
    isSignupBalanceLoading ||
    isInsufficientUsdtBalance ||
    !projectWallet ||
    isSignupCompleted;

  function handleSignupPaymentError(error: Error) {
    setNotice({
      tone: "error",
      text: error.message,
    });
  }

  function handleSignupPaymentConfirmed(receipt: { transactionHash: string }) {
    setNotice({
      tone: "success",
      text: dictionary.sponsored.txConfirmed,
      href: `${BSC_EXPLORER}/tx/${receipt.transactionHash}`,
    });

    window.setTimeout(() => {
      void runMemberSync({ background: true });
    }, 2500);
  }

  function handleSignupPaymentSent(result: { transactionHash: string }) {
    setNotice({
      tone: "info",
      text: dictionary.sponsored.txSent,
      href: `${BSC_EXPLORER}/tx/${result.transactionHash}`,
    });

    window.setTimeout(() => {
      void runMemberSync({ background: true });
    }, 4000);
  }

  function createSignupPaymentTransaction() {
    if (!accountAddress) {
      throw new Error(dictionary.sponsored.connectFirst);
    }

    if (!projectWallet) {
      throw new Error(dictionary.member.errors.projectWalletMissing);
    }

    if (isInsufficientUsdtBalance) {
      throw new Error(insufficientBalanceMessage);
    }

    return transfer({
      amount: MEMBER_SIGNUP_USDT_AMOUNT,
      contract: usdtContract,
      to: projectWallet,
    });
  }

  function resolveMemberSyncErrorMessage(error: unknown) {
    if (!(error instanceof Error)) {
      return dictionary.member.errors.syncFailed;
    }

    const rawMessage = error.message.trim();

    if (!rawMessage || GENERIC_MEMBER_SYNC_ERRORS.has(rawMessage)) {
      return dictionary.member.errors.syncFailed;
    }

    if (rawMessage === "PROJECT_WALLET is not configured.") {
      return dictionary.member.errors.projectWalletMissing;
    }

    return rawMessage;
  }

  function triggerCelebration() {
    if (celebrationTimeoutRef.current) {
      window.clearTimeout(celebrationTimeoutRef.current);
    }

    setShowCelebration(true);
    celebrationTimeoutRef.current = window.setTimeout(() => {
      setShowCelebration(false);
      celebrationTimeoutRef.current = null;
    }, CELEBRATION_DURATION_MS);
  }

  async function loadReferralDashboard(
    email: string,
    options?: { background?: boolean },
  ) {
    if (!options?.background) {
      setReferralDashboard((current) => ({
        ...current,
        error: null,
        status: "loading",
      }));
    }

    try {
      const response = await fetch(
        `/api/members/referrals?email=${encodeURIComponent(email)}`,
      );
      const data = (await response.json()) as
        | MemberReferralsResponse
        | { error?: string };

      if (!response.ok || !("member" in data) || !("referrals" in data)) {
        throw new Error(
          response.status === 403
            ? dictionary.referralsPage.paymentRequired
            : response.status === 404
              ? dictionary.referralsPage.memberMissing
              : "error" in data && data.error
                ? data.error
                : dictionary.referralsPage.errors.loadFailed,
        );
      }

      setReferralDashboard({
        error: null,
        lastUpdatedAt: new Date().toISOString(),
        levelCounts: data.levelCounts,
        referrals: data.referrals,
        rewards: data.rewards,
        status: "ready",
        totalReferrals: data.totalReferrals,
      });
    } catch (error) {
      setReferralDashboard((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : dictionary.referralsPage.errors.loadFailed,
        status: current.referrals.length > 0 ? "ready" : "error",
      }));
    }
  }

  async function runMemberSync(options?: {
    background?: boolean;
    mode?: "full" | "light";
  }) {
    if (!accountAddress || syncInFlightRef.current) {
      return;
    }

    syncInFlightRef.current = true;

    if (!options?.background) {
      setMemberSync((current) => ({
        ...current,
        error: null,
        status: "syncing",
      }));
    }

    try {
      const email = await getUserEmail({ client: thirdwebClient });

      if (!email) {
        setMemberSync({
          email: null,
          error: dictionary.member.errors.missingEmail,
          justCompleted: false,
          member: null,
          status: "error",
        });
        setReferralDashboard({
          error: null,
          lastUpdatedAt: null,
          levelCounts: [],
          referrals: [],
          rewards: createEmptyReferralRewardsSummary(),
          status: "idle",
          totalReferrals: 0,
        });
        return;
      }

      const response = await fetch("/api/members", {
        body: JSON.stringify({
          chainId: chain.id,
          chainName: chain.name ?? "BSC",
          email,
          locale,
          referredByCode: preferredReferralCode,
          syncMode: options?.mode ?? "full",
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
            : dictionary.member.errors.syncFailed,
        );
      }

      if ("validationError" in data && data.validationError) {
        const hasPendingMember = data.member?.status === "pending_payment";
        setMemberSync({
          email,
          error: data.validationError,
          justCompleted: false,
          member: data.member,
          status: hasPendingMember ? "ready" : "blocked",
        });
        setReferralDashboard({
          error: null,
          lastUpdatedAt: null,
          levelCounts: [],
          referrals: [],
          rewards: createEmptyReferralRewardsSummary(),
          status: "idle",
          totalReferrals: 0,
        });
        return;
      }

      if (!("member" in data) || !data.member) {
        throw new Error(dictionary.member.errors.syncFailed);
      }

      const syncedMember = data.member;
      let shouldCelebrate = data.justCompleted;

      setMemberSync((current) => {
        if (
          !shouldCelebrate &&
          current.member?.status === "pending_payment" &&
          syncedMember.status === "completed"
        ) {
          shouldCelebrate = true;
        }

        return {
          email: syncedMember.email,
          error: null,
          justCompleted: shouldCelebrate,
          member: syncedMember,
          status: "ready",
        };
      });

      if (shouldCelebrate) {
        triggerCelebration();
      }

      if (syncedMember.status === "completed") {
        void loadReferralDashboard(syncedMember.email, {
          background: options?.background,
        });
      } else {
        setReferralDashboard({
          error: null,
          lastUpdatedAt: null,
          levelCounts: [],
          referrals: [],
          rewards: createEmptyReferralRewardsSummary(),
          status: "idle",
          totalReferrals: 0,
        });
      }
    } catch (error) {
      setMemberSync((current) => ({
        ...current,
        error: resolveMemberSyncErrorMessage(error),
        justCompleted: false,
        status: "error",
      }));
    } finally {
      syncInFlightRef.current = false;
    }
  }

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
                      return existing.notificationId === notification.notificationId;
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

      setNotificationsState((current) => ({
        ...current,
        open: false,
      }));

      if (notification.href) {
        router.push(notification.href);
      }
    },
    [markNotificationAsRead, router],
  );

  const syncMemberRegistration = useEffectEvent(async () => {
    await runMemberSync({ mode: "light" });
  });

  useEffect(() => {
    if (status !== "connected" || !accountAddress || !hasThirdwebClientId) {
      setMemberSync({
        email: null,
        error: null,
        justCompleted: false,
        member: null,
        status: "idle",
      });
      setReferralDashboard({
        error: null,
        lastUpdatedAt: null,
        levelCounts: [],
        referrals: [],
        rewards: createEmptyReferralRewardsSummary(),
        status: "idle",
        totalReferrals: 0,
      });
      return;
    }

    void syncMemberRegistration();
  }, [
    accountAddress,
    status,
    locale,
    chain.id,
    chain.name,
    preferredReferralCode,
  ]);

  useEffect(() => {
    if (
      !memberSponsorReferralCode ||
      memberSponsorReferralCode === activeIncomingReferralCode
    ) {
      setMemberSponsorBranding(null);
      setMemberSponsorBrandingCode(null);
      return;
    }

    const controller = new AbortController();

    void (async () => {
      try {
        const searchParams = new URLSearchParams({
          lang: locale,
          ref: memberSponsorReferralCode,
        });
        const response = await fetch(
          `/api/referrals/experience?${searchParams.toString()}`,
          {
            signal: controller.signal,
          },
        );
        const data = (await response.json()) as
          | ReferralExperienceResponse
          | { error?: string };

        if (!response.ok || !("branding" in data)) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "Failed to load referral branding experience.",
          );
        }

        if (controller.signal.aborted) {
          return;
        }

        setMemberSponsorBranding(data.branding ?? null);
        setMemberSponsorBrandingCode(
          data.referralCode ?? memberSponsorReferralCode,
        );
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        setMemberSponsorBranding(null);
        setMemberSponsorBrandingCode(memberSponsorReferralCode);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [
    activeIncomingReferralCode,
    locale,
    memberSponsorReferralCode,
  ]);

  const pollForCompletedSignup = useEffectEvent(async () => {
    await runMemberSync({ background: true });
  });

  const openNotificationsPage = useCallback((mode: "push" | "replace" = "push") => {
    if (typeof window === "undefined") {
      return;
    }

    const returnTo = `${window.location.pathname}${window.location.search}`;
    const href = setPathSearchParams(notificationsPageHref, {
      returnTo,
    });

    if (mode === "replace") {
      router.replace(href);
      return;
    }

    router.push(href);
  }, [notificationsPageHref, router]);

  const refreshCompletedNetwork = useEffectEvent(async () => {
    await runMemberSync({ background: true });
  });

  useEffect(() => {
    if (
      status !== "connected" ||
      !accountAddress ||
      !hasThirdwebClientId ||
      memberSync.status === "blocked" ||
      memberSync.member?.status === "completed"
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      void pollForCompletedSignup();
    }, 7000);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    accountAddress,
    memberSync.status,
    memberSync.member?.status,
    status,
  ]);

  useEffect(() => {
    if (
      status !== "connected" ||
      !accountAddress ||
      !hasThirdwebClientId ||
      memberSync.member?.status !== "completed"
    ) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshCompletedNetwork();
      }
    };

    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    accountAddress,
    memberSync.member?.status,
    status,
  ]);

  useEffect(() => {
    if (status !== "connected") {
      setIsLogoutDialogOpen(false);
    }
  }, [status]);

  useEffect(() => {
    if (
      status !== "connected" ||
      memberSync.member?.status !== "completed" ||
      !memberSync.member.email
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
      memberEmail: memberSync.member.email,
    });

    const intervalId = window.setInterval(() => {
      void loadNotifications({
        background: true,
        lightweight: true,
        memberEmail: memberSync.member?.email ?? "",
      });
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    loadNotifications,
    memberSync.member?.email,
    memberSync.member?.status,
    status,
  ]);

  useEffect(() => {
    if (
      !notificationsState.open ||
      status !== "connected" ||
      memberSync.member?.status !== "completed" ||
      !memberSync.member.email
    ) {
      return;
    }

    void loadNotifications({
      memberEmail: memberSync.member.email,
    });
  }, [
    loadNotifications,
    memberSync.member?.email,
    memberSync.member?.status,
    notificationsState.open,
    status,
  ]);

  useEffect(() => {
    if (
      pathname === notificationsPageHref ||
      !isSignupCompleted ||
      !memberSync.member?.email ||
      notificationsState.unreadCount < 1 ||
      typeof window === "undefined"
    ) {
      return;
    }

    const isMobileViewport = window.matchMedia("(max-width: 1023px)").matches;

    if (!isMobileViewport) {
      return;
    }

    const sessionKey = `notification-inbox-auto-opened:${memberSync.member.email}`;

    if (window.sessionStorage.getItem(sessionKey) === "1") {
      return;
    }

    window.sessionStorage.setItem(sessionKey, "1");
    openNotificationsPage("replace");
  }, [
    isSignupCompleted,
    memberSync.member?.email,
    notificationsPageHref,
    notificationsState.unreadCount,
    openNotificationsPage,
    pathname,
  ]);

  useEffect(() => {
    if (status === "connected") {
      setIsLoginDialogOpen(false);
    }
  }, [status]);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }

      if (celebrationTimeoutRef.current) {
        window.clearTimeout(celebrationTimeoutRef.current);
      }
    };
  }, []);

  async function handleCopyAddress() {
    if (!accountAddress) {
      return;
    }

    try {
      await navigator.clipboard.writeText(accountAddress);
      setCopied(true);
      setNotice({
        tone: "info",
        text: dictionary.notices.copySuccess,
      });

      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }

      copiedTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
        copiedTimeoutRef.current = null;
      }, 1800);
    } catch {
      setNotice({
        tone: "error",
        text: dictionary.notices.copyError,
      });
    }
  }

  function confirmLogout() {
    if (!wallet) {
      setIsLogoutDialogOpen(false);
      return;
    }

    setIsLogoutDialogOpen(false);
    disconnect(wallet);
  }

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(234,179,8,0.14),transparent_22%),radial-gradient(circle_at_0%_10%,rgba(255,255,255,0.62),transparent_20%),radial-gradient(circle_at_100%_20%,rgba(30,41,59,0.12),transparent_22%),linear-gradient(180deg,#f7f2e8_0%,#fbf7ef_44%,#f6f2eb_100%)]" />
      <LogoutConfirmDialog
        cancelLabel={dictionary.common.logoutDialog.cancel}
        confirmLabel={dictionary.common.logoutDialog.confirm}
        description={dictionary.common.logoutDialog.description}
        onCancel={() => {
          setIsLogoutDialogOpen(false);
        }}
        onConfirm={confirmLogout}
        open={isLogoutDialogOpen}
        title={dictionary.common.logoutDialog.title}
      />
      <CelebrationOverlay
        description={dictionary.member.celebrationDescription}
        open={showCelebration}
        title={dictionary.member.celebrationTitle}
      />
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

      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-4 py-4 pb-32 sm:gap-4 sm:px-6 sm:py-6 sm:pb-32 lg:px-8 lg:pb-8">
        <LandingReveal delay={10} variant="soft">
          <header className="glass-card flex flex-col gap-3 rounded-[26px] px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#111827,#1e293b)] text-white shadow-[0_16px_40px_rgba(15,23,42,0.2)]">
                <WalletMinimal className="size-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="eyebrow">{dictionary.common.headerEyebrow}</p>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                    {dictionary.common.appName}
                  </h1>
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
              <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                <Link
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                  href={homeHref}
                >
                  <ArrowLeft className="size-4" />
                  {dictionary.referralsPage.actions.backHome}
                </Link>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-wrap sm:items-center">
                  <StatusChip
                    labels={dictionary.common.status}
                    status={status}
                  />
                </div>
              </div>
              {hasThirdwebClientId ? (
                status === "connected" ? (
                  <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                    {isSignupCompleted && memberSync.member?.email ? (
                      <button
                        className={cn(
                          "group inline-flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-full border px-4 text-sm font-medium text-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 focus-visible:ring-offset-2",
                          notificationsState.open
                            ? "border-sky-300 bg-sky-50 shadow-[0_18px_38px_rgba(14,165,233,0.14)]"
                            : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50/70 hover:shadow-[0_18px_38px_rgba(15,23,42,0.12)]",
                          "sm:w-auto sm:justify-start",
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
                        <span className="inline-flex items-center gap-2 transition group-hover:text-sky-900">
                          <Bell className="size-4 transition group-hover:scale-105 group-hover:text-sky-700" />
                          {notificationCopy.title}
                        </span>
                        {notificationsState.unreadCount > 0 ? (
                          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-slate-950 px-2 py-1 text-[0.68rem] font-semibold leading-none text-white transition group-hover:bg-sky-900 group-hover:shadow-[0_10px_20px_rgba(14,165,233,0.18)]">
                            {new Intl.NumberFormat(locale).format(
                              notificationsState.unreadCount,
                            )}
                          </span>
                        ) : null}
                      </button>
                    ) : null}
                    <button
                      className="inline-flex h-10 w-full items-center justify-center rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      disabled={!wallet}
                      onClick={() => {
                        if (!wallet) {
                          return;
                        }

                        setIsLogoutDialogOpen(true);
                      }}
                      type="button"
                    >
                      {dictionary.common.disconnectWallet}
                    </button>
                  </div>
                ) : (
                  <div className="hidden w-full sm:block sm:w-auto">
                    <button
                      className="inline-flex h-10 w-full items-center justify-center rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-medium text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 sm:w-auto"
                      onClick={() => {
                        setIsLoginDialogOpen(true);
                      }}
                      type="button"
                    >
                      {dictionary.common.connectWallet}
                    </button>
                  </div>
                )
              ) : (
                <div className="w-full rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-900 sm:w-auto">
                  {dictionary.common.clientIdRequired}
                </div>
              )}
            </div>
          </header>
        </LandingReveal>

        {isSignupCompleted && memberSync.member ? (
          <CompletedHomeDashboard
            activateNetworkHref={activateNetworkHref}
            announcementsPageHref={announcementsPageHref}
            brandingStudioHref={brandingStudioHref}
            creatorStudioHref={creatorStudioHref}
            dictionary={dictionary}
            isSelfIncomingReferral={isSelfIncomingReferral}
            isRefreshing={
              memberSync.status === "syncing" ||
              referralDashboard.status === "loading"
            }
            locale={locale}
            member={memberSync.member}
            networkFeedHref={networkFeedHref}
            onRefresh={() => {
              void runMemberSync();
            }}
            referralDashboard={referralDashboard}
            referralLink={referralLink}
            rewardsHref={rewardsHref}
          />
        ) : isMembershipLoading ? (
          <MembershipLoadingSection dictionary={dictionary} />
        ) : (
          <section
            className={cn(
              "grid gap-4",
              showMemberRegistryPanel && "lg:grid-cols-[1.08fr_0.92fr]",
            )}
          >
            <LandingReveal variant="hero">
              <div className="glass-card relative overflow-hidden rounded-[30px] p-4 sm:p-6">
                <div className="absolute inset-x-6 top-0 h-28 rounded-full bg-[radial-gradient(circle,rgba(234,179,8,0.14),transparent_68%)] blur-3xl" />
                <div className="relative space-y-5">
                  <div className="space-y-3">
                    <p className="eyebrow">
                      {!hasThirdwebClientId
                        ? dictionary.member.eyebrow
                        : status === "connected" && accountAddress
                          ? dictionary.sponsored.eyebrow
                          : dictionary.onboarding.eyebrow}
                    </p>
                    <h2 className="max-w-2xl text-[1.72rem] font-semibold leading-[1.03] tracking-tight text-slate-950 sm:text-[2.85rem] sm:leading-[1.04]">
                      {!hasThirdwebClientId
                        ? dictionary.env.title
                        : isIncomingReferralOverflow
                          ? dictionary.member.incomingReferralLimitTitle
                          : status === "connected" && accountAddress
                            ? dictionary.sponsored.title
                            : dictionary.common.connectWallet}
                    </h2>
                    <p className="max-w-2xl text-[0.96rem] leading-7 text-slate-600 sm:text-lg">
                      {!hasThirdwebClientId
                        ? dictionary.env.description
                        : isIncomingReferralOverflow && incomingReferralState
                          ? formatTemplate(
                              dictionary.member.incomingReferralLimitDescription,
                              {
                                code: incomingReferralState.code,
                                count: incomingReferralState.signupCount,
                                limit: incomingReferralState.limit,
                              },
                            )
                          : status === "connected" && accountAddress
                            ? dictionary.member.pending
                            : dictionary.member.disconnected}
                    </p>
                  </div>

                  {preferredReferralCode ? (
                    <IncomingReferralHighlightCard
                      branding={preferredReferralBranding}
                      dictionary={dictionary}
                      referralCode={preferredReferralCode}
                    />
                  ) : null}

                  {!hasThirdwebClientId ? (
                    <div className="rounded-[22px] border border-amber-200 bg-amber-50/90 px-4 py-4 text-sm leading-6 text-amber-950 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
                      {dictionary.common.clientIdRequired}
                    </div>
                  ) : status !== "connected" || !accountAddress ? (
                    <div className="grid gap-2.5 sm:grid-cols-[0.92fr_1.08fr] sm:gap-3">
                      <div className="order-2 relative overflow-hidden rounded-[24px] border border-slate-900/85 bg-[linear-gradient(160deg,#081225_0%,#0f172a_54%,#10213f_100%)] p-3.5 text-white shadow-[0_28px_80px_rgba(15,23,42,0.18)] sm:order-1 sm:rounded-[26px] sm:p-5">
                        <div className="pointer-events-none absolute -right-8 top-0 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.28),transparent_68%)] blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-12 left-0 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.18),transparent_72%)] blur-3xl" />

                        <div className="relative flex h-full flex-col">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/52">
                                {dictionary.member.labels.requiredDeposit}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-white/62">
                                {dictionary.hero.badges[1]}
                              </p>
                            </div>
                            <div className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/76">
                              BSC
                            </div>
                          </div>

                          <div className="mt-5 rounded-[20px] border border-white/10 bg-white/7 px-3.5 py-3.5 sm:mt-7 sm:rounded-[22px] sm:px-4 sm:py-4">
                            <div className="flex items-end justify-end gap-2 text-right">
                              <span className="text-[2.7rem] leading-none font-black tracking-[-0.06em] text-white tabular-nums sm:text-[3.3rem]">
                                {MEMBER_SIGNUP_USDT_AMOUNT}
                              </span>
                              <span className="pb-1 text-base font-semibold tracking-[0.06em] text-white/72 sm:text-xl">
                                USDT
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="order-1 grid gap-2.5 sm:order-2 sm:gap-3">
                        <div
                          className="rounded-[22px] border border-white/70 bg-white/92 p-3.5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] scroll-mt-24 sm:rounded-[24px] sm:p-5 sm:scroll-mt-28"
                          id="wallet-onboarding"
                        >
                          <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] sm:rounded-[24px] sm:p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-emerald-900">
                                  <WalletMinimal className="size-3.5" />
                                  {dictionary.hero.badges[0]}
                                </div>
                                <p className="mt-3 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
                                  {dictionary.onboarding.cards[0].title}
                                </p>
                              </div>
                              <div className="rounded-full border border-slate-200 bg-white px-3 py-3 text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                                <ArrowUpRight className="size-4" />
                              </div>
                            </div>

                            <button
                              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-[0_22px_45px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 sm:mt-5 sm:h-12"
                              onClick={() => {
                                setIsLoginDialogOpen(true);
                              }}
                              type="button"
                            >
                              <WalletMinimal className="size-4" />
                              {dictionary.common.connectWallet}
                            </button>

                            <p className="mt-3 text-sm leading-6 text-slate-600 sm:mt-4">
                              {dictionary.common.loginDialog.emailDescription}
                            </p>
                          </div>
                        </div>

                        <OnboardingGuideCard dictionary={dictionary} />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid gap-3">
                        <InfoRow
                          label={dictionary.member.labels.signupStatus}
                          value={dictionary.member.pendingValue}
                        />
                      </div>

                      <div
                        className="rounded-[24px] bg-[linear-gradient(180deg,#111827,#0f172a)] p-4 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] scroll-mt-24 sm:p-5 sm:scroll-mt-28"
                        id="signup-payment"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap">
                            <CompactMetaCard
                              label={dictionary.member.labels.requiredDeposit}
                              locale={locale}
                              value={`${MEMBER_SIGNUP_USDT_AMOUNT} USDT`}
                            />
                            <CompactMetaCard
                              label={dictionary.connected.labels.balance}
                              locale={locale}
                              value={signupBalanceValue}
                            />
                          </div>
                          <div className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white/75">
                            {dictionary.member.pendingValue}
                          </div>
                        </div>

                        {isInsufficientUsdtBalance ? (
                          <p className="mt-4 rounded-[18px] border border-rose-200/20 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-rose-100">
                            {insufficientBalanceMessage}
                          </p>
                        ) : null}

                        <div className="mt-5 rounded-[22px] border border-white/10 bg-white/5 p-4">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="break-words text-xl font-semibold tracking-tight text-white">
                                {accountLabel ?? accountAddress}
                              </p>
                            </div>
                            <button
                              className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/15 sm:w-auto sm:self-start"
                              onClick={handleCopyAddress}
                              type="button"
                            >
                              {copied ? (
                                <Check className="size-3.5" />
                              ) : (
                                <Copy className="size-3.5" />
                              )}
                              {copied
                                ? dictionary.common.copied
                                : dictionary.common.copyAddress}
                            </button>
                          </div>

                          <p className="mt-4 text-sm leading-6 text-white/60">
                            {dictionary.member.pending}
                          </p>
                        </div>

                        <div className="mt-5 hidden lg:block">
                          <p className="mb-3 text-xs uppercase tracking-[0.24em] text-white/45">
                            {dictionary.sponsored.eyebrow}
                          </p>
                          <TransactionButton
                            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isSignupPaymentDisabled}
                            onError={handleSignupPaymentError}
                            onTransactionConfirmed={handleSignupPaymentConfirmed}
                            onTransactionSent={handleSignupPaymentSent}
                            transaction={createSignupPaymentTransaction}
                            type="button"
                            unstyled
                          >
                            {paymentCtaLabel}
                          </TransactionButton>
                        </div>
                      </div>

                      <LandingReveal delay={120} variant="soft">
                        <NoticeCard
                          notice={notice}
                          placeholder={dictionary.sponsored.emptyNotice}
                        />
                      </LandingReveal>
                    </div>
                  )}
                </div>
              </div>
            </LandingReveal>

            {showMemberRegistryPanel ? (
              <Panel
                contentClassName="gap-4"
                eyebrow={dictionary.member.eyebrow}
                revealDelay={120}
                title={dictionary.member.title}
              >

                {memberSync.status === "syncing" ? (
                  <MessageCard>{dictionary.member.syncing}</MessageCard>
                ) : null}

                {memberSync.status === "error" ? (
                  <MessageCard tone="error">
                    {memberSync.error ?? dictionary.member.errors.syncFailed}
                  </MessageCard>
                ) : null}

                {memberSync.status === "blocked" ? (
                  <MessageCard>
                    {memberSync.error ?? dictionary.member.errors.syncFailed}
                  </MessageCard>
                ) : null}

                {memberSync.member ? (
                  <>
                    <div className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                      <p className="text-sm leading-6 text-slate-600">
                        {memberSync.member.status === "completed"
                          ? dictionary.member.synced
                          : dictionary.member.pending}
                      </p>
                      {memberSync.justCompleted ? (
                        <p className="mt-2 text-sm font-semibold text-emerald-700">
                          {dictionary.member.newMember}
                        </p>
                      ) : null}
                      {memberSync.member.referredByCode ? (
                        <p className="mt-2 text-sm font-medium text-slate-700">
                          {formatTemplate(
                            dictionary.member.appliedReferralDescription,
                            {
                              code: memberSync.member.referredByCode,
                            },
                          )}
                        </p>
                      ) : null}
                      {memberSync.member.placementSource === "auto" &&
                      memberSync.member.placementReferralCode ? (
                        <p className="mt-2 text-sm font-medium text-sky-700">
                          {formatTemplate(
                            dictionary.member.autoPlacementDescription,
                            {
                              code: memberSync.member.placementReferralCode,
                            },
                          )}
                        </p>
                      ) : null}
                    </div>

                    {!isSignupCompleted ? (
                      <NotificationPushCard
                        active={canManagePushAlerts}
                        copy={notificationCopy.push}
                        locale={locale}
                        memberEmail={memberSync.member.email}
                        walletAddress={accountAddress ?? null}
                      />
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoRow
                        label={dictionary.member.labels.emailKey}
                        value={memberSync.member.email}
                      />
                      <InfoRow
                        label={dictionary.member.labels.signupStatus}
                        value={
                          memberSync.member.status === "completed"
                            ? dictionary.member.completedValue
                            : dictionary.member.pendingValue
                        }
                      />
                      <InfoRow
                        label={dictionary.member.labels.referredByCode}
                        value={
                          memberSync.member.referredByCode ??
                          dictionary.member.noReferralApplied
                        }
                      />
                      {shouldShowPlacementReferralCode(memberSync.member) ? (
                        <InfoRow
                          label={dictionary.member.labels.placementReferralCode}
                          value={
                            memberSync.member.placementReferralCode ??
                            dictionary.common.notAvailable
                          }
                        />
                      ) : null}
                    </div>

                    <div className="grid gap-3 sm:flex sm:flex-wrap">
                      <button
                        className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        disabled={memberSync.status === "syncing"}
                        onClick={() => {
                          void runMemberSync();
                        }}
                        type="button"
                      >
                        {dictionary.member.actions.refreshStatus}
                      </button>

                      <a
                        className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium !text-white transition hover:bg-slate-800 sm:w-auto"
                        href={projectWalletUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {dictionary.member.actions.openProjectWallet}
                      </a>
                    </div>
                  </>
                ) : null}
              </Panel>
            ) : null}
          </section>
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
        open={
          notificationsState.open &&
          isSignupCompleted &&
          Boolean(memberSync.member?.email)
        }
        title={notificationCopy.title}
        unreadCountText={formatTemplate(notificationCopy.unreadCount, {
          count: new Intl.NumberFormat(locale).format(
            notificationsState.unreadCount,
          ),
        })}
      >
        <NotificationCenterContent
          activePushCard={notificationsState.open && isSignupCompleted}
          dictionary={dictionary}
          hasMore={notificationsState.hasMore && Boolean(memberSync.member?.email)}
          isLoadingMore={notificationsState.isLoadingMore}
          locale={locale}
          memberEmail={memberSync.member?.email ?? null}
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
          walletAddress={accountAddress ?? null}
        />
      </NotificationCenterSheet>

      {showMobileActionDock ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] lg:hidden">
          <div className="pointer-events-auto glass-card rounded-[26px] border border-white/75 px-3 py-3 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
            <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-[0.68rem] font-medium uppercase tracking-[0.2em] text-slate-500">
                  {mobileDockEyebrow}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-950">
                  {mobileDockTitle}
                </p>
              </div>

              <TransactionButton
                className="inline-flex h-11 w-full shrink-0 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-semibold !text-white transition hover:bg-slate-800 min-[420px]:w-auto"
                disabled={isSignupPaymentDisabled}
                onError={handleSignupPaymentError}
                onTransactionConfirmed={handleSignupPaymentConfirmed}
                onTransactionSent={handleSignupPaymentSent}
                transaction={createSignupPaymentTransaction}
                type="button"
                unstyled
              >
                {paymentCtaLabel}
              </TransactionButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Panel({
  className,
  title,
  eyebrow,
  description,
  children,
  contentClassName,
  id,
  revealDelay = 0,
}: {
  className?: string;
  title: string;
  eyebrow: string;
  description?: string;
  children: ReactNode;
  contentClassName?: string;
  id?: string;
  revealDelay?: number;
}) {
  return (
    <LandingReveal delay={revealDelay} variant="soft">
      <section
        className={cn(
          "glass-card rounded-[26px] p-4 sm:rounded-[30px] sm:p-5",
          id && "scroll-mt-24 sm:scroll-mt-28",
          className,
        )}
        id={id}
      >
        <div className="mb-4 space-y-1">
          <p className="eyebrow">{eyebrow}</p>
          <h3 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
            {title}
          </h3>
          {description ? (
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              {description}
            </p>
          ) : null}
        </div>
        <div className={cn("flex flex-col", contentClassName)}>{children}</div>
      </section>
    </LandingReveal>
  );
}

function MembershipLoadingSection({
  dictionary,
}: {
  dictionary: Dictionary;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <LandingReveal variant="hero">
        <div className="glass-card relative overflow-hidden rounded-[30px] p-4 sm:p-6">
        <div className="absolute inset-x-6 top-0 h-28 rounded-full bg-[radial-gradient(circle,rgba(234,179,8,0.14),transparent_68%)] blur-3xl" />
        <div className="relative space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge icon={<WalletMinimal className="size-3.5" />}>
              {dictionary.member.title}
            </Badge>
            <Badge icon={<Sparkles className="size-3.5" />}>
              {dictionary.referralsPage.title}
            </Badge>
          </div>

          <div className="space-y-3">
            <p className="eyebrow">{dictionary.member.eyebrow}</p>
            <h2 className="max-w-2xl text-[1.95rem] font-semibold leading-[1] tracking-tight text-slate-950 sm:text-[2.85rem] sm:leading-[1.04]">
              {dictionary.common.appName}
            </h2>
            <p className="max-w-2xl text-[0.98rem] leading-7 text-slate-600 sm:text-lg">
              {dictionary.member.syncing}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
                key={index}
              >
                <div className="h-3 w-20 animate-pulse rounded-full bg-slate-200" />
                <div className="mt-4 h-8 w-28 animate-pulse rounded-full bg-slate-200" />
                <div className="mt-3 h-3 w-24 animate-pulse rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
      </LandingReveal>

      <Panel
        contentClassName="gap-4"
        eyebrow={dictionary.referralsPage.eyebrow}
        revealDelay={120}
        title={dictionary.referralsPage.title}
      >
        <MessageCard>{dictionary.referralsPage.loading}</MessageCard>
      </Panel>
    </section>
  );
}

function IncomingReferralHighlightCard({
  branding,
  dictionary,
  referralCode,
}: {
  branding: LandingPageBranding | null;
  dictionary: Dictionary;
  referralCode: string;
}) {
  const theme = branding?.theme ?? null;
  const cardStyle: CSSProperties | undefined = theme
    ? {
        backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.98) 0%, ${theme.accentSoft} 100%)`,
        borderColor: theme.glow,
        boxShadow: `0 22px 55px ${theme.glow}`,
      }
    : undefined;
  const accentBadgeStyle: CSSProperties | undefined = theme
    ? {
        backgroundColor: theme.accentSoft,
        borderColor: theme.glow,
        color: theme.buttonFrom,
      }
    : undefined;
  const codeBadgeStyle: CSSProperties | undefined = theme
    ? {
        backgroundColor: theme.codeSurface,
        borderColor: theme.glow,
        color: theme.buttonFrom,
      }
    : undefined;
  const description = branding?.description ?? formatTemplate(
    dictionary.member.incomingReferralDescription,
    {
      code: referralCode,
    },
  );

  return (
    <div
      className="rounded-[24px] border border-[#ead7b5] bg-[linear-gradient(135deg,#fff9ee_0%,#ffffff_100%)] p-4 shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:p-5"
      style={cardStyle}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <span
              className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-amber-900"
              style={accentBadgeStyle}
            >
              {branding?.brandedExperienceLabel ?? dictionary.member.labels.referredByCode}
            </span>
            <span
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-slate-700"
              style={codeBadgeStyle}
            >
              {branding?.referralCodeLabel ?? dictionary.member.labels.referredByCode}:{" "}
              {referralCode}
            </span>
          </div>

          {branding ? (
            <p className="mt-4 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
              {branding.sharedByLabel}
            </p>
          ) : null}
          <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
            {branding?.brandName ?? dictionary.member.incomingReferralTitle}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            {description}
          </p>
          {branding ? (
            <p className="mt-3 text-xs font-medium text-slate-500">
              {formatTemplate(dictionary.member.appliedReferralDescription, {
                code: referralCode,
              })}
            </p>
          ) : null}
        </div>

        {branding?.heroImageUrl ? (
          <div className="h-28 w-full overflow-hidden rounded-[20px] border border-white/70 bg-slate-950/5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] md:w-40 md:shrink-0">
            <div
              className="h-full w-full bg-cover bg-center"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.04), rgba(15,23,42,0.18)), url(${branding.heroImageUrl})`,
              }}
            />
          </div>
        ) : branding ? (
          <div
            className="hidden rounded-[22px] border px-4 py-3 text-right md:block md:shrink-0"
            style={codeBadgeStyle}
          >
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em]">
              {branding.badgeLabel}
            </p>
            <p className="mt-2 text-sm font-medium opacity-80">
              {branding.sharedByLabel}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CompletedHomeDashboard({
  activateNetworkHref,
  announcementsPageHref,
  brandingStudioHref,
  creatorStudioHref,
  dictionary,
  isSelfIncomingReferral,
  isRefreshing,
  locale,
  member,
  networkFeedHref,
  onRefresh,
  referralDashboard,
  referralLink,
  rewardsHref,
}: {
  activateNetworkHref: string;
  announcementsPageHref: string;
  brandingStudioHref: string;
  creatorStudioHref: string;
  dictionary: Dictionary;
  isSelfIncomingReferral: boolean;
  isRefreshing: boolean;
  locale: Locale;
  member: MemberRecord;
  networkFeedHref: string;
  onRefresh: () => void;
  referralDashboard: ReferralDashboardState;
  referralLink: string | null;
  rewardsHref: string;
}) {
  const directReferralCount = referralDashboard.referrals.length;
  const totalReferralCount = referralDashboard.totalReferrals;
  const brandingCopy = getLandingBrandingCopy(locale);
  const contentCopy = getContentCopy(locale);
  const firstLevelLimitHint = formatTemplate(
    dictionary.referralsPage.firstLevelLimitHint,
    {
      limit: REFERRAL_SIGNUP_LIMIT,
    },
  );

  return (
    <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <LandingReveal variant="hero">
        <div className="glass-card relative overflow-hidden rounded-[30px] p-4 sm:p-6">
        <div className="absolute inset-x-6 top-0 h-28 rounded-full bg-[radial-gradient(circle,rgba(234,179,8,0.12),transparent_68%)] blur-3xl" />
        <div className="relative space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge icon={<Check className="size-3.5" />}>
              {dictionary.member.completedValue}
            </Badge>
            <Badge icon={<Users className="size-3.5" />}>
              {dictionary.referralsPage.title}
            </Badge>
          </div>

          <div className="space-y-3">
            <p className="eyebrow">{dictionary.referralsPage.eyebrow}</p>
            <h2 className="max-w-2xl text-[1.95rem] font-semibold leading-[1] tracking-tight text-slate-950 sm:text-[2.85rem] sm:leading-[1.04]">
              {dictionary.referralsPage.title}
            </h2>
            <p className="max-w-2xl text-[0.98rem] leading-7 text-slate-600 sm:text-lg">
              {dictionary.member.synced}
            </p>
          </div>

          {isSelfIncomingReferral ? (
            <MessageCard>{dictionary.member.selfReferralNotice}</MessageCard>
          ) : null}

          {member.referredByCode ? (
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/90 p-4 text-sm leading-6 text-emerald-950">
              {formatTemplate(dictionary.member.appliedReferralDescription, {
                code: member.referredByCode,
              })}
            </div>
          ) : null}

          {member.placementSource === "auto" && member.placementReferralCode ? (
            <div className="rounded-[24px] border border-sky-200 bg-sky-50/90 p-4 text-sm leading-6 text-sky-950">
              {formatTemplate(dictionary.member.autoPlacementDescription, {
                code: member.placementReferralCode,
              })}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1.16fr_0.84fr]">
            <div className="relative min-w-0 overflow-hidden rounded-[26px] border border-slate-900/85 bg-[linear-gradient(160deg,#081225_0%,#0f172a_48%,#10213f_100%)] p-4 text-white shadow-[0_28px_80px_rgba(15,23,42,0.22)] sm:rounded-[30px] sm:p-5">
              <div className="pointer-events-none absolute -right-8 top-0 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(96,165,250,0.32),transparent_68%)] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-14 left-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.18),transparent_72%)] blur-3xl" />

              <div className="relative space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/55">
                      {dictionary.referralsPage.shareTitle}
                    </p>
                    <p className="mt-2 max-w-md text-sm leading-6 text-white/72">
                      {dictionary.member.shareHint}
                    </p>
                  </div>
                  <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/82 backdrop-blur">
                    <Check className="size-3.5" />
                    {dictionary.member.completedValue}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/8 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur sm:p-5">
                  <p className="text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-white/45">
                    {dictionary.referralsPage.labels.referralCode}
                  </p>
                  <p className="mt-3 break-all font-mono text-[2rem] font-semibold leading-[0.92] tracking-[-0.05em] text-white sm:text-[2.45rem]">
                    {member.referralCode ?? dictionary.common.notAvailable}
                  </p>
                </div>

                {referralLink ? (
                  <>
                    <a
                      className="group block rounded-[22px] border border-white/10 bg-black/10 p-3.5 transition hover:border-white/16 hover:bg-black/14"
                      href={referralLink}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-white/45">
                          {dictionary.referralsPage.labels.referralLink}
                        </p>
                        <ArrowUpRight className="size-4 shrink-0 text-white/45 transition group-hover:text-white/72" />
                      </div>
                      <p className="mt-2 break-all text-sm font-medium leading-6 text-white/92">
                        {referralLink}
                      </p>
                    </a>

                    <div className="grid gap-2.5 xl:grid-cols-[auto_minmax(0,1fr)] xl:items-stretch">
                      <CopyTextButton
                        className="h-12 w-full rounded-2xl border-0 bg-white px-4 text-[0.95rem] font-semibold text-slate-950 shadow-[0_20px_45px_rgba(255,255,255,0.16)] hover:bg-slate-100 xl:min-w-[7.75rem]"
                        copiedLabel={dictionary.common.copied}
                        copyLabel={dictionary.common.copyLink}
                        text={referralLink}
                      />
                      <Link
                        className="group inline-flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#f7d97e_0%,#f5c34d_52%,#ecab1f_100%)] px-4 !text-slate-950 shadow-[0_22px_50px_rgba(245,195,77,0.24)] transition hover:translate-y-[-1px] hover:shadow-[0_26px_60px_rgba(245,195,77,0.3)]"
                        href={brandingStudioHref}
                      >
                        <Sparkles className="size-4 shrink-0 !text-slate-950 transition group-hover:rotate-[-8deg]" />
                        <span className="whitespace-nowrap !text-slate-950">{brandingCopy.actions.customizeLandingCompact}</span>
                        <ArrowUpRight className="hidden size-4 shrink-0 !text-slate-950 opacity-80 transition group-hover:translate-x-0.5 2xl:block" />
                      </Link>
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3">
              <Link
                className="group rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition hover:border-slate-200 hover:bg-white sm:p-5"
                href={networkFeedHref}
              >
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  {contentCopy.page.feedEyebrow}
                </p>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <Rss className="size-4" />
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-slate-400 transition group-hover:text-slate-700" />
                </div>
                <p className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
                  {contentCopy.entry.viewerTitle}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {contentCopy.entry.viewerDescription}
                </p>
              </Link>

              <Link
                className="group rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition hover:border-slate-200 hover:bg-white sm:p-5"
                href={creatorStudioHref}
              >
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  {contentCopy.page.studioEyebrow}
                </p>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <PenSquare className="size-4" />
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-slate-400 transition group-hover:text-slate-700" />
                </div>
                <p className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
                  {contentCopy.entry.creatorTitle}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {contentCopy.entry.creatorDescription}
                </p>
              </Link>

              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  animateValue
                  hint={firstLevelLimitHint}
                  label={dictionary.referralsPage.labels.directReferrals}
                  locale={locale}
                  value={`${directReferralCount} / ${REFERRAL_SIGNUP_LIMIT}`}
                />
                <MetricCard
                  animateValue
                  hint={dictionary.referralsPage.depthHint.replace(
                    "{depth}",
                    "6",
                  )}
                  label={dictionary.referralsPage.labels.totalNetwork}
                  locale={locale}
                  value={String(totalReferralCount)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      </LandingReveal>

      <Panel
        contentClassName="gap-4"
        eyebrow={dictionary.member.eyebrow}
        revealDelay={120}
        title={dictionary.member.title}
      >
        <div className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <p className="text-sm leading-6 text-slate-600">
            {dictionary.referralsPage.memberReady}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <InfoRow
            alignValueRight
            label={dictionary.member.labels.emailKey}
            value={member.email}
          />
          <InfoRow
            alignValueRight
            label={dictionary.member.labels.signupStatus}
            value={dictionary.member.completedValue}
          />
          <InfoRow
            alignValueRight
            label={dictionary.member.labels.completionAt}
            value={
              member.registrationCompletedAt
                ? formatDateTime(member.registrationCompletedAt, locale)
                : dictionary.common.notAvailable
            }
          />
          <InfoRow
            alignValueRight
            label={dictionary.member.labels.paymentReceivedAt}
            value={
              member.paymentReceivedAt
                ? formatDateTime(member.paymentReceivedAt, locale)
                : dictionary.common.notAvailable
            }
          />
          <InfoRow
            alignValueRight
            label={dictionary.member.labels.lastConnectedAt}
            value={formatDateTime(member.lastConnectedAt, locale)}
          />
          <InfoRow
            alignValueRight
            label={dictionary.member.labels.referredByCode}
            value={member.referredByCode ?? dictionary.member.noReferralApplied}
          />
          {shouldShowPlacementReferralCode(member) ? (
            <InfoRow
              alignValueRight
              label={dictionary.member.labels.placementReferralCode}
              value={
                member.placementReferralCode ?? dictionary.common.notAvailable
              }
            />
          ) : null}
          <InfoRow
            alignValueRight
            label={dictionary.member.labels.requiredDeposit}
            valueContent={
              <AnimatedNumberText
                locale={locale}
                value={`${member.requiredDepositAmount} USDT`}
              />
            }
            value={`${member.requiredDepositAmount} USDT`}
          />
        </div>

      </Panel>

      <LandingReveal className="lg:col-span-2" delay={160} variant="soft">
        <section className="glass-card rounded-[24px] p-4 sm:rounded-[28px] sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                {dictionary.member.labels.updatedAt}
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {referralDashboard.lastUpdatedAt
                  ? formatDateTime(referralDashboard.lastUpdatedAt, locale)
                  : dictionary.common.notAvailable}
              </p>
            </div>
            <button
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isRefreshing}
              onClick={onRefresh}
              type="button"
            >
              {isRefreshing
                ? dictionary.referralsPage.loading
                : dictionary.referralsPage.actions.refresh}
            </button>
          </div>
        </section>
      </LandingReveal>

      <Panel
        className="lg:col-span-2"
        contentClassName="gap-4"
        description={dictionary.referralsPage.rewards.description}
        eyebrow={dictionary.referralsPage.eyebrow}
        revealDelay={180}
        title={dictionary.referralsPage.rewards.title}
      >
        <div className="rounded-[22px] border border-[#e7d6b7] bg-[linear-gradient(135deg,#fff9ec_0%,#ffffff_72%)] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center rounded-full border border-[#ead7b5] bg-[#fff5df] px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8d7142]">
                  {dictionary.rewardsPage.labels.rewardCatalog}
                </div>
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-700">
                  {dictionary.referralsPage.rewards.totalPoints}
                  <span className="ml-2 text-slate-950">
                    {new Intl.NumberFormat(locale).format(
                      referralDashboard.rewards.totalPoints,
                    )}
                    P
                  </span>
                </div>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                {dictionary.rewardsPage.previewNote}
              </p>
            </div>
            <Link
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-semibold !text-white shadow-[0_18px_35px_rgba(15,23,42,0.14)] transition hover:bg-slate-800"
              href={rewardsHref}
            >
              <span className="!text-white">{dictionary.rewardsPage.title}</span>
              <ArrowUpRight className="size-4 !text-white" />
            </Link>
          </div>
        </div>
        <ReferralRewardsPanel
          dictionary={dictionary}
          locale={locale}
          rewards={referralDashboard.rewards}
          showHeader={false}
        />
      </Panel>

      <Panel
        className="lg:col-span-2"
        contentClassName="gap-4"
        eyebrow={dictionary.referralsPage.eyebrow}
        revealDelay={220}
        title={dictionary.referralsPage.listTitle}
      >
        <div className="flex justify-end">
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#ead7b5] bg-[#fff8ea] px-4 text-sm font-semibold text-[#7c6137] shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:border-[#dfc79e] hover:bg-[#fff1d2]"
              href={announcementsPageHref}
            >
              <Megaphone className="size-4" />
              {dictionary.announcementsPage.title}
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:bg-slate-50"
              href={activateNetworkHref}
            >
              {dictionary.activateNetworkPage.actions.openManagement}
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>

        {referralDashboard.error ? (
          <MessageCard tone="error">{referralDashboard.error}</MessageCard>
        ) : null}

        {referralDashboard.status === "loading" ? (
          <MessageCard>{dictionary.referralsPage.loading}</MessageCard>
        ) : (
          <ReferralNetworkExplorer
            dictionary={dictionary}
            key={`${member.email}:${referralDashboard.totalReferrals}:${referralDashboard.levelCounts.join("-")}`}
            levelCounts={referralDashboard.levelCounts}
            locale={locale}
            referrals={referralDashboard.referrals}
            totalReferrals={referralDashboard.totalReferrals}
          />
        )}
      </Panel>
    </section>
  );
}

function MetricCard({
  animateValue = false,
  className,
  label,
  locale,
  value,
  hint,
}: {
  animateValue?: boolean;
  className?: string;
  label: string;
  locale: Locale;
  value: string;
  hint: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[116px] flex-col rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]",
        className,
      )}
    >
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className="mt-6 text-right text-2xl font-semibold tracking-tight text-slate-950 tabular-nums">
        {animateValue ? (
          <AnimatedNumberText locale={locale} value={value} />
        ) : (
          value
        )}
      </p>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
    </div>
  );
}

function InfoRow({
  alignValueRight = false,
  label,
  value,
  valueContent,
}: {
  alignValueRight?: boolean;
  label: string;
  value: string;
  valueContent?: ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3.5 py-3">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className={cn(
        "mt-2 break-words text-sm font-medium text-slate-900 sm:text-base",
        alignValueRight && "text-right tabular-nums",
      )}>
        {valueContent ?? value}
      </p>
    </div>
  );
}

function shouldShowPlacementReferralCode(
  member: Pick<MemberRecord, "placementReferralCode" | "referredByCode">,
) {
  if (!member.placementReferralCode) {
    return false;
  }

  return member.placementReferralCode !== member.referredByCode;
}

function getPrioritySponsorReferralCode(member: MemberRecord | null) {
  if (!member) {
    return null;
  }

  return member.sponsorReferralCode ?? member.referredByCode ?? null;
}

function CompactMetaCard({
  label,
  locale,
  value,
}: {
  label: string;
  locale: Locale;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/10 px-3 py-3">
      <p className="text-[0.64rem] uppercase tracking-[0.2em] text-white/52">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-white">
        <AnimatedNumberText locale={locale} value={value} />
      </p>
    </div>
  );
}

function Badge({
  children,
  icon,
}: {
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 backdrop-blur">
      {icon}
      {children}
    </div>
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

function OnboardingGuideCard({
  dictionary,
}: {
  dictionary: Dictionary;
}) {
  const steps = [
    {
      description: dictionary.runway.steps[0].description,
      icon: Mail,
      title: dictionary.runway.steps[0].title,
    },
    {
      description: dictionary.runway.steps[1].description,
      icon: WalletMinimal,
      title: dictionary.runway.steps[1].title,
    },
    {
      description: dictionary.runway.steps[2].description,
      icon: Sparkles,
      title: dictionary.runway.steps[2].title,
    },
  ] as const;

  return (
    <div className="rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,#edf5ff_0%,#ffffff_100%)] p-3.5 shadow-[0_20px_54px_rgba(15,23,42,0.06)] sm:rounded-[24px] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-sky-900/56">
            {dictionary.signInMix.eyebrow}
          </p>
          <p className="mt-1.5 text-base font-semibold tracking-tight text-slate-950 sm:mt-2 sm:text-lg">
            {dictionary.signInMix.title}
          </p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/92 text-sky-700 shadow-[0_14px_28px_rgba(15,23,42,0.08)] sm:size-11">
          <Sparkles className="size-4" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
        {dictionary.signInMix.methods.map((method) => (
          <div
            className="rounded-full border border-sky-100 bg-white/85 px-2.5 py-1.5 text-[0.68rem] font-semibold tracking-[0.12em] text-sky-900/72"
            key={method}
          >
            {method}
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-2.5">
        {steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <div
              className="rounded-[18px] border border-white/85 bg-white/92 px-3 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:rounded-[20px]"
              key={step.title}
            >
              <div className="flex items-start gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-[0.7rem] font-bold text-white shadow-[0_10px_22px_rgba(15,23,42,0.16)] sm:size-8 sm:text-xs">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-slate-950">
                    <Icon className="size-4 text-sky-700" />
                    <p className="text-[0.84rem] font-semibold tracking-tight sm:text-sm">
                      {step.title}
                    </p>
                  </div>
                  <p className="mt-1 text-[0.8rem] leading-5 text-slate-600 sm:text-sm sm:leading-6">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
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
        "inline-flex h-11 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium",
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

function NoticeCard({
  notice,
  placeholder,
}: {
  notice: WalletNotice | null;
  placeholder: string;
}) {
  if (!notice) {
    return (
      <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-500">
        {placeholder}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[22px] border px-4 py-4 text-sm leading-6 break-words",
        notice.tone === "success" &&
          "border-emerald-200 bg-emerald-50 text-emerald-950",
        notice.tone === "info" && "border-blue-200 bg-blue-50 text-blue-950",
        notice.tone === "error" && "border-rose-200 bg-rose-50 text-rose-950",
      )}
    >
      <p>{notice.text}</p>
    </div>
  );
}

const celebrationBursts = [
  {
    colors: ["#2563eb", "#38bdf8", "#f97316", "#facc15"],
    x: "18%",
    y: "22%",
  },
  {
    colors: ["#0f766e", "#2dd4bf", "#f59e0b", "#fb7185"],
    x: "74%",
    y: "18%",
  },
  {
    colors: ["#f97316", "#fb7185", "#facc15", "#38bdf8"],
    x: "26%",
    y: "74%",
  },
  {
    colors: ["#2563eb", "#22c55e", "#f97316", "#e879f9"],
    x: "82%",
    y: "68%",
  },
];

const celebrationVectors = [
  { x: "0px", y: "-84px" },
  { x: "62px", y: "-52px" },
  { x: "84px", y: "0px" },
  { x: "60px", y: "54px" },
  { x: "0px", y: "86px" },
  { x: "-62px", y: "54px" },
  { x: "-84px", y: "0px" },
  { x: "-62px", y: "-52px" },
  { x: "38px", y: "-88px" },
  { x: "-40px", y: "-88px" },
  { x: "92px", y: "26px" },
  { x: "-94px", y: "28px" },
];

function CelebrationOverlay({
  description,
  open,
  title,
}: {
  description: string;
  open: boolean;
  title: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.14),rgba(15,23,42,0.72))]" />
      {celebrationBursts.map((burst, burstIndex) => (
        <div
          className="celebration-burst"
          key={`${burst.x}-${burst.y}`}
          style={{
            animationDelay: `${burstIndex * 180}ms`,
            left: burst.x,
            top: burst.y,
          }}
        >
          {celebrationVectors.map((vector, particleIndex) => (
            <span
              className="celebration-spark"
              key={`${vector.x}-${vector.y}`}
              style={{
                "--celebration-color":
                  burst.colors[particleIndex % burst.colors.length],
                "--spark-x": vector.x,
                "--spark-y": vector.y,
                animationDelay: `${burstIndex * 180 + particleIndex * 28}ms`,
              } as CSSProperties}
            />
          ))}
        </div>
      ))}

      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="glass-card max-w-md rounded-[30px] border border-white/70 bg-white/82 px-6 py-7 text-center shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a,#2563eb)] text-white shadow-[0_18px_40px_rgba(37,99,235,0.22)]">
            <Sparkles className="size-6" />
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
            {title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

function formatAddressLabel(address?: string | null) {
  const trimmed = address?.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.length <= 12) {
    return trimmed;
  }

  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function formatBalance(value: string | undefined, symbol: string, locale: Locale) {
  if (!value) {
    return `0 ${symbol}`;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return `${value} ${symbol}`;
  }

  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: parsed > 1 ? 4 : 6,
  }).format(parsed)} ${symbol}`;
}

function formatTemplate(
  template: string,
  replacements: Record<string, string | number>,
) {
  return Object.entries(replacements).reduce((message, [key, value]) => {
    return message.replaceAll(`{${key}}`, String(value));
  }, template);
}

function getReferralLink(referralCode: string, locale: Locale) {
  const path = `/${locale}?ref=${encodeURIComponent(referralCode)}`;
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!appUrl) {
    return path;
  }

  try {
    return new URL(path, appUrl).toString();
  } catch {
    return path;
  }
}

function formatDateTime(value: string, locale: Locale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
