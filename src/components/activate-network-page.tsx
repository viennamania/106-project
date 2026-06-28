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
  ArrowUpDown,
  Bell,
  ChevronRight,
  GitBranch,
  Hexagon,
  Layers3,
  Megaphone,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import {
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { AnimatedNumberText } from "@/components/animated-number-text";
import { EmailLoginDialog } from "@/components/email-login-dialog";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { useMemberSession } from "@/components/member-session-provider";
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
  type ServiceSuspensionScope,
} from "@/lib/member";
import { syncServerMemberRegistration } from "@/lib/member-session-client";
import { type Dictionary, localeLabels, type Locale } from "@/lib/i18n";
import { getReferralLevelTheme } from "@/lib/referral-level-theme";
import { getThirdwebUserEmail, useThirdwebConnectionState } from "@/lib/thirdweb-client";
import {
  hasThirdwebClientId,
  smartWalletChain,
  thirdwebClient,
} from "@/lib/thirdweb";
import { cn } from "@/lib/utils";
import {
  getServiceConnectModalTitle,
  SERVICE_BRAND_NAME,
} from "@/lib/service-branding";

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

type ServiceStatusUpdateState = {
  error: string | null;
  notice: string | null;
  status: "error" | "idle" | "submitting" | "success";
};

type MemberSortKey =
  | "directReferralCount"
  | "email"
  | "lifetimePoints"
  | "recent"
  | "spendablePoints"
  | "tier"
  | "totalReferralCount"
  | "depth";

type MemberSortDirection = "asc" | "desc";

const NETWORK_MEMBER_PAGE_SIZE = 6;

function getServiceManagementCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      activeValue: "정상",
      description:
        "운영자 권한으로 회원의 서비스 이용 상태를 조정합니다. 일반 회원 화면에는 노출되지 않으며, 변경 전 대상과 범위를 확인해야 합니다.",
      releaseAction: "서비스 재개",
      releaseNoticeMember: "선택 회원의 서비스가 재개되었습니다.",
      releaseNoticeSubtree:
        "선택 회원과 하위 완료 회원 전체의 서비스가 재개되었습니다.",
      scopeLabel: "적용 범위",
      scopeMember: "선택 회원만",
      scopeSubtree: "선택 회원 + 하위 회원",
      statusLabel: "서비스 상태",
      submitPending: "적용 중...",
      suspendAction: "서비스 일시 정지",
      suspendedAtLabel: "중단 시각",
      suspendedByLabel: "중단 처리 관리자",
      suspendedScopeLabel: "중단 적용 범위",
      suspendedValue: "중단됨",
      suspendNoticeMember: "선택 회원 서비스가 중단되었습니다.",
      suspendNoticeSubtree:
        "선택 회원과 하위 완료 회원 전체의 서비스가 중단되었습니다.",
      title: "운영자 전용 서비스 상태",
    };
  }

  return {
    activeValue: "Active",
    description:
      "Adjust service access with operator permission. This control is not shown to regular members, and the target and scope must be reviewed before applying a change.",
    releaseAction: "Resume service",
    releaseNoticeMember: "Service access was resumed for the selected member.",
    releaseNoticeSubtree:
      "Service access was resumed for the selected member and the completed downline.",
    scopeLabel: "Apply scope",
    scopeMember: "Selected member only",
    scopeSubtree: "Selected member + downline",
    statusLabel: "Service status",
    submitPending: "Applying...",
    suspendAction: "Pause service",
    suspendedAtLabel: "Suspended at",
    suspendedByLabel: "Suspended by",
    suspendedScopeLabel: "Applied scope",
    suspendedValue: "Suspended",
    suspendNoticeMember: "Service access was suspended for the selected member.",
    suspendNoticeSubtree:
      "Service access was suspended for the selected member and the completed downline.",
    title: "Operator-only service status",
  };
}

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
  const memberSession = useMemberSession();
  const memberSessionEmail =
    accountAddress &&
    memberSession.accountAddress?.toLowerCase() === accountAddress.toLowerCase()
      ? memberSession.email
      : null;
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
  const [memberSortDirection, setMemberSortDirection] =
    useState<MemberSortDirection>("desc");
  const [memberSortKey, setMemberSortKey] = useState<MemberSortKey>("recent");
  const [memberPage, setMemberPage] = useState(1);
  const [serviceScope, setServiceScope] =
    useState<ServiceSuspensionScope>("member");
  const [serviceStatusUpdate, setServiceStatusUpdate] =
    useState<ServiceStatusUpdateState>({
      error: null,
      notice: null,
      status: "idle",
    });
  const [selectedMemberEmail, setSelectedMemberEmail] = useState<string | null>(
    null,
  );
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const {
    isDisconnected,
    isResolving: isConnectionResolving,
  } = useThirdwebConnectionState({
    accountAddress,
    status,
  });
  const notificationCopy = dictionary.activateNetworkPage.notifications;
  const serviceCopy = getServiceManagementCopy(locale);
  const paginationCopy = getMemberPaginationCopy(locale);
  const isCompletedMember = state.member?.status === "completed";
  const notificationsPageHref = buildPathWithReferral(
    `/${locale}/notifications`,
    referralCode,
  );
  const announcementsPageHref = buildPathWithReferral(
    `/${locale}/announcements`,
    referralCode,
  );
  const hexViewLabel = {
    en: "Hex view",
    id: "Tampilan heks",
    ja: "ヘックス表示",
    ko: "육각형 보기",
    vi: "Mạng lục giác",
    zh: "六角视图",
  } satisfies Record<Locale, string>;
  const summaryHints = getNetworkSummaryHintCopy(locale);

  const filteredMembers = useMemo(() => {
    const normalizedQuery = deferredSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return state.members;
    }

    return state.members.filter((member) => {
      const referralCode = member.referralCode?.toLowerCase() ?? "";
      const aiStarName = member.ownedAIStar?.name.toLowerCase() ?? "";
      const aiStarId = member.ownedAIStar?.starId.toLowerCase() ?? "";

      return (
        member.email.toLowerCase().includes(normalizedQuery) ||
        member.lastWalletAddress.toLowerCase().includes(normalizedQuery) ||
        referralCode.includes(normalizedQuery) ||
        aiStarName.includes(normalizedQuery) ||
        aiStarId.includes(normalizedQuery)
      );
    });
  }, [deferredSearchQuery, state.members]);

  const sortedMembers = useMemo(() => {
    return [...filteredMembers].sort((firstMember, secondMember) => {
      const comparison = compareMembersBySortKey(
        firstMember,
        secondMember,
        memberSortKey,
        locale,
      );

      if (comparison !== 0) {
        return memberSortDirection === "asc" ? comparison : -comparison;
      }

      if (firstMember.depth !== secondMember.depth) {
        return firstMember.depth - secondMember.depth;
      }

      return firstMember.email.localeCompare(secondMember.email, locale);
    });
  }, [filteredMembers, locale, memberSortDirection, memberSortKey]);

  const totalMemberPages = Math.max(
    1,
    Math.ceil(sortedMembers.length / NETWORK_MEMBER_PAGE_SIZE),
  );
  const safeMemberPage = Math.min(memberPage, totalMemberPages);
  const memberPageStartIndex = (safeMemberPage - 1) * NETWORK_MEMBER_PAGE_SIZE;
  const paginatedMembers = useMemo(
    () =>
      sortedMembers.slice(
        memberPageStartIndex,
        memberPageStartIndex + NETWORK_MEMBER_PAGE_SIZE,
      ),
    [memberPageStartIndex, sortedMembers],
  );
  const memberPageEndIndex = Math.min(
    memberPageStartIndex + paginatedMembers.length,
    sortedMembers.length,
  );
  const selectedMember =
    state.members.find((member) => member.email === selectedMemberEmail) ??
    paginatedMembers[0] ??
    null;
  const memberPointChipCopy = getMemberPointChipCopy(locale);
  const currentPageHref = useMemo(
    () =>
      setPathSearchParams(
        buildPathWithReferral(`/${locale}/activate/network`, referralCode),
        {
          member: selectedMemberEmail,
          returnTo: returnToHref,
        },
      ),
    [locale, referralCode, returnToHref, selectedMemberEmail],
  );
  const hexDashboardHref = useMemo(
    () =>
      setPathSearchParams(
        buildPathWithReferral(`/${locale}/activate/network/hex`, referralCode),
        {
          member: selectedMemberEmail,
          returnTo: currentPageHref,
        },
      ),
    [currentPageHref, locale, referralCode, selectedMemberEmail],
  );

  useEffect(() => {
    if (status === "connected") {
      setIsLoginDialogOpen(false);
      return;
    }

    setSearchQuery("");
    setServiceStatusUpdate({
      error: null,
      notice: null,
      status: "idle",
    });
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
    setServiceStatusUpdate({
      error: null,
      notice: null,
      status: "idle",
    });
  }, [selectedMemberEmail]);

  useEffect(() => {
    setMemberPage(1);
  }, [deferredSearchQuery, memberSortDirection, memberSortKey]);

  useEffect(() => {
    if (memberPage > totalMemberPages) {
      setMemberPage(totalMemberPages);
    }
  }, [memberPage, totalMemberPages]);

  useEffect(() => {
    if (!paginatedMembers.length) {
      if (selectedMemberEmail && sortedMembers.length === 0) {
        setSelectedMemberEmail(null);
      }

      return;
    }

    if (!selectedMemberEmail) {
      setSelectedMemberEmail(paginatedMembers[0].email);
      return;
    }

    if (
      !paginatedMembers.some((member) => member.email === selectedMemberEmail)
    ) {
      setSelectedMemberEmail(paginatedMembers[0]?.email ?? null);
    }
  }, [paginatedMembers, selectedMemberEmail, sortedMembers.length]);

  useEffect(() => {
    const normalizedRequestedEmail = requestedMemberEmail?.trim().toLowerCase();

    if (!normalizedRequestedEmail) {
      return;
    }

    const matchedMember = sortedMembers.find((member) => {
      return member.email.toLowerCase() === normalizedRequestedEmail;
    });

    if (matchedMember) {
      const matchedIndex = sortedMembers.findIndex((member) => {
        return member.email === matchedMember.email;
      });

      if (matchedIndex >= 0) {
        setMemberPage(Math.floor(matchedIndex / NETWORK_MEMBER_PAGE_SIZE) + 1);
      }
    }

    if (matchedMember && matchedMember.email !== selectedMemberEmail) {
      setSelectedMemberEmail(matchedMember.email);
    }
  }, [requestedMemberEmail, selectedMemberEmail, sortedMembers]);

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
      const email =
        memberSessionEmail ??
        (await getThirdwebUserEmail({ client: thirdwebClient }));

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

      const syncData = await syncServerMemberRegistration({
        chainId: chain.id,
        chainName: chain.name ?? "BSC",
        email,
        locale,
        walletAddress: accountAddress,
      });

      if (!syncData.ok) {
        throw new Error(
          syncData.error || dictionary.activateNetworkPage.errors.loadFailed,
        );
      }

      if (syncData.validationError) {
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

      if (!syncData.member) {
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
  }, [accountAddress, chain.id, chain.name, dictionary, locale, memberSessionEmail]);

  const updateMemberServiceStatus = useCallback(
    async (action: "release" | "suspend") => {
      if (!selectedMember || !accountAddress) {
        return;
      }

      setServiceStatusUpdate({
        error: null,
        notice: null,
        status: "submitting",
      });

      try {
        const email =
          memberSessionEmail ??
          (await getThirdwebUserEmail({ client: thirdwebClient }));

        if (!email) {
          throw new Error(dictionary.activateNetworkPage.errors.missingEmail);
        }

        const response = await fetch("/api/members/referrals/manage", {
          body: JSON.stringify({
            action,
            email,
            scope: serviceScope,
            targetMemberEmail: selectedMember.email,
            walletAddress: accountAddress,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PATCH",
        });
        const data = (await response.json()) as
          | (ManagedMemberReferralsResponse & { updatedCount: number })
          | { error?: string };

        if (!response.ok || !("member" in data) || !("members" in data)) {
          throw new Error(
            "error" in data && data.error
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
        setSelectedMemberEmail(selectedMember.email);
        setServiceStatusUpdate({
          error: null,
          notice:
            action === "suspend"
              ? serviceScope === "subtree"
                ? serviceCopy.suspendNoticeSubtree
                : serviceCopy.suspendNoticeMember
              : serviceScope === "subtree"
                ? serviceCopy.releaseNoticeSubtree
                : serviceCopy.releaseNoticeMember,
          status: "success",
        });
      } catch (error) {
        setServiceStatusUpdate({
          error:
            error instanceof Error
              ? error.message
              : dictionary.activateNetworkPage.errors.loadFailed,
          notice: null,
          status: "error",
        });
      }
    },
    [
      accountAddress,
      dictionary.activateNetworkPage.errors.loadFailed,
      dictionary.activateNetworkPage.errors.missingEmail,
      memberSessionEmail,
      selectedMember,
      serviceCopy.releaseNoticeMember,
      serviceCopy.releaseNoticeSubtree,
      serviceCopy.suspendNoticeMember,
      serviceCopy.suspendNoticeSubtree,
      serviceScope,
    ],
  );

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
    <div className="friend-service-surface relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,161,58,0.16),transparent_24%),radial-gradient(circle_at_88%_12%,rgba(37,99,235,0.12),transparent_24%),linear-gradient(180deg,#f6efe3_0%,#fbf7ef_38%,#f7f1e8_100%)]" />
      <EmailLoginDialog
        dictionary={dictionary}
        onClose={() => {
          setIsLoginDialogOpen(false);
        }}
        open={isLoginDialogOpen}
        serviceLabel={SERVICE_BRAND_NAME}
        title={getServiceConnectModalTitle(locale)}
      />

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
              <p className="friend-service-kicker sm:hidden">
                {SERVICE_BRAND_NAME}
              </p>
              <p className="eyebrow hidden sm:block">
                {SERVICE_BRAND_NAME}
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
                <Link
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition hover:border-indigo-200 hover:bg-indigo-50/70 hover:text-indigo-800 sm:size-11"
                  href={hexDashboardHref}
                  title={hexViewLabel[locale]}
                >
                  <Hexagon className="size-4" />
                </Link>
              ) : null}
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
                <Link
                  className="hidden h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition hover:border-indigo-200 hover:bg-indigo-50/70 hover:text-indigo-800 lg:inline-flex"
                  href={hexDashboardHref}
                >
                  <Hexagon className="size-4" />
                  {hexViewLabel[locale]}
                </Link>
              ) : null}
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
        ) : isConnectionResolving ? (
          <MessageCard>{dictionary.activateNetworkPage.loading}</MessageCard>
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
                      hint={summaryHints.totalMembers}
                      icon={<Users className="size-4" />}
                      label={dictionary.activateNetworkPage.labels.totalMembers}
                      locale={locale}
                      value={String(state.summary.totalMembers)}
                    />
                    <SummaryMetricCard
                      hint={summaryHints.directMembers}
                      icon={<GitBranch className="size-4" />}
                      label={dictionary.activateNetworkPage.labels.directMembers}
                      locale={locale}
                      value={String(state.summary.directMembers)}
                    />
                    <SummaryMetricCard
                      hint={summaryHints.referralRewards}
                      icon={<Trophy className="size-4" />}
                      label={
                        dictionary.activateNetworkPage.labels.totalReferralRewardPoints
                      }
                      locale={locale}
                      value={`${formatInteger(state.summary.totalReferralRewardPoints, locale)}P`}
                    />
                    <SummaryMetricCard
                      hint={summaryHints.contentBonus}
                      icon={<Layers3 className="size-4" />}
                      label={
                        dictionary.activateNetworkPage.labels.totalContentBonusPoints
                      }
                      locale={locale}
                      value={`${formatInteger(state.summary.totalContentBonusPoints, locale)}P`}
                    />
                    <SummaryMetricCard
                      hint={summaryHints.lifetime}
                      icon={<Trophy className="size-4" />}
                      label={
                        dictionary.activateNetworkPage.labels.totalLifetimePoints
                      }
                      locale={locale}
                      value={`${formatInteger(state.summary.totalLifetimePoints, locale)}P`}
                    />
                    <SummaryMetricCard
                      hint={summaryHints.spendable}
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
                    onApplyServiceStatus={updateMemberServiceStatus}
                    onChangeServiceScope={setServiceScope}
                    serviceCopy={serviceCopy}
                    serviceScope={serviceScope}
                    serviceStatusUpdate={serviceStatusUpdate}
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

                  <div className="mt-4 rounded-[22px] border border-slate-200 bg-white/80 p-3 shadow-[0_14px_34px_rgba(15,23,42,0.035)]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {getMemberSortCopy(locale).label}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatTemplate(getMemberSortCopy(locale).resultCount, {
                            count: formatInteger(sortedMembers.length, locale),
                          })}
                        </p>
                      </div>
                      <button
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
                        onClick={() => {
                          setMemberSortDirection((current) =>
                            current === "asc" ? "desc" : "asc",
                          );
                        }}
                        type="button"
                      >
                        <ArrowUpDown className="size-3.5" />
                        {getMemberSortDirectionLabel(
                          locale,
                          memberSortKey,
                          memberSortDirection,
                        )}
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {getMemberSortOptions(locale).map((option) => {
                        const isActive = memberSortKey === option.key;

                        return (
                          <button
                            className={cn(
                              "inline-flex min-h-9 items-center justify-center rounded-full border px-3 text-xs font-semibold transition",
                              isActive
                                ? "border-slate-950 bg-slate-950 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                            )}
                            key={option.key}
                            onClick={() => {
                              setMemberSortKey(option.key);
                              setMemberSortDirection(option.defaultDirection);
                            }}
                            type="button"
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {state.error ? (
                      <MessageCard tone="error">{state.error}</MessageCard>
                    ) : null}

                    {sortedMembers.length === 0 ? (
                      <MessageCard>{dictionary.activateNetworkPage.empty}</MessageCard>
                    ) : (
                      paginatedMembers.map((member) => {
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
                                  <p
                                    className={cn(
                                      "mt-1 text-xs font-medium",
                                      isSelected ? "text-white/55" : "text-slate-500",
                                    )}
                                  >
                                    {dictionary.activateNetworkPage.labels.joinedAt}{" "}
                                    {formatDateTime(member.registrationCompletedAt, locale)}
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

                              <MemberAIStarInline
                                active={isSelected}
                                locale={locale}
                                member={member}
                              />

                              <div className="mt-3 flex flex-wrap gap-2">
                                <Pill active={isSelected}>
                                  {dictionary.activateNetworkPage.labels.level} {member.depth}
                                </Pill>
                                <Pill active={isSelected}>
                                  {dictionary.activateNetworkPage.labels.pointTier}{" "}
                                  {getTierLabel(dictionary, member.tier)}
                                </Pill>
                                <Pill active={isSelected}>
                                  {memberPointChipCopy.lifetime}{" "}
                                  {formatInteger(member.lifetimePoints, locale)}P
                                </Pill>
                                <Pill active={isSelected}>
                                  {memberPointChipCopy.spendable}{" "}
                                  {formatInteger(member.spendablePoints, locale)}P
                                </Pill>
                              </div>
                            </button>
                          </article>
                        );
                      })
                    )}
                  </div>

                  {sortedMembers.length > NETWORK_MEMBER_PAGE_SIZE ? (
                    <div className="mt-4 rounded-[22px] border border-slate-200 bg-white/85 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-medium text-slate-500">
                          {formatTemplate(paginationCopy.range, {
                            end: formatInteger(memberPageEndIndex, locale),
                            start: formatInteger(memberPageStartIndex + 1, locale),
                            total: formatInteger(sortedMembers.length, locale),
                          })}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            className="inline-flex min-h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                            disabled={safeMemberPage <= 1}
                            onClick={() => {
                              setMemberPage((current) => Math.max(1, current - 1));
                            }}
                            type="button"
                          >
                            {paginationCopy.previous}
                          </button>
                          <span className="min-w-16 rounded-full bg-slate-950 px-3 py-2 text-center text-xs font-semibold text-white">
                            {safeMemberPage} / {totalMemberPages}
                          </span>
                          <button
                            className="inline-flex min-h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                            disabled={safeMemberPage >= totalMemberPages}
                            onClick={() => {
                              setMemberPage((current) =>
                                Math.min(totalMemberPages, current + 1),
                              );
                            }}
                            type="button"
                          >
                            {paginationCopy.next}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>

              <section className="hidden rounded-[28px] lg:sticky lg:top-24 lg:block">
                <div className="glass-card rounded-[28px] p-4 sm:p-5">
                  <SelectedMemberPanel
                    dictionary={dictionary}
                    locale={locale}
                    member={selectedMember}
                    onApplyServiceStatus={updateMemberServiceStatus}
                    onChangeServiceScope={setServiceScope}
                    serviceCopy={serviceCopy}
                    serviceScope={serviceScope}
                    serviceStatusUpdate={serviceStatusUpdate}
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
  onApplyServiceStatus,
  onChangeServiceScope,
  serviceCopy,
  serviceScope,
  serviceStatusUpdate,
}: {
  dictionary: Dictionary;
  locale: Locale;
  member: ManagedReferralTreeNodeRecord | null;
  onApplyServiceStatus: (action: "release" | "suspend") => void;
  onChangeServiceScope: (scope: ServiceSuspensionScope) => void;
  serviceCopy: ReturnType<typeof getServiceManagementCopy>;
  serviceScope: ServiceSuspensionScope;
  serviceStatusUpdate: ServiceStatusUpdateState;
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
          onApplyServiceStatus={onApplyServiceStatus}
          onChangeServiceScope={onChangeServiceScope}
          serviceCopy={serviceCopy}
          serviceScope={serviceScope}
          serviceStatusUpdate={serviceStatusUpdate}
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
  onApplyServiceStatus,
  onChangeServiceScope,
  serviceCopy,
  serviceScope,
  serviceStatusUpdate,
}: {
  className?: string;
  dictionary: Dictionary;
  locale: Locale;
  member: ManagedReferralTreeNodeRecord;
  onApplyServiceStatus: (action: "release" | "suspend") => void;
  onChangeServiceScope: (scope: ServiceSuspensionScope) => void;
  serviceCopy: ReturnType<typeof getServiceManagementCopy>;
  serviceScope: ServiceSuspensionScope;
  serviceStatusUpdate: ServiceStatusUpdateState;
}) {
  const isServiceSuspended = Boolean(member.serviceSuspendedAt);

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

      <SelectedMemberAIStarCard locale={locale} member={member} />

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
          label={serviceCopy.statusLabel}
          value={
            isServiceSuspended
              ? serviceCopy.suspendedValue
              : serviceCopy.activeValue
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

      <div className="rounded-[24px] border border-amber-200/85 bg-[linear-gradient(180deg,rgba(255,251,235,0.96),rgba(255,247,223,0.92))] p-4 shadow-[0_18px_45px_rgba(217,119,6,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-amber-800/70">
              {serviceCopy.title}
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
              {serviceCopy.description}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.32)]",
              isServiceSuspended
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700",
            )}
          >
            {isServiceSuspended
              ? serviceCopy.suspendedValue
              : serviceCopy.activeValue}
          </span>
        </div>

        {isServiceSuspended ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <InfoCard
              label={serviceCopy.suspendedAtLabel}
              value={formatDateTime(member.serviceSuspendedAt ?? "", locale)}
            />
            <InfoCard
              label={serviceCopy.suspendedByLabel}
              value={
                member.serviceSuspendedByEmail ?? dictionary.common.notAvailable
              }
            />
            <InfoCard
              label={serviceCopy.suspendedScopeLabel}
              value={
                member.serviceSuspendedScope === "subtree"
                  ? serviceCopy.scopeSubtree
                  : serviceCopy.scopeMember
              }
            />
          </div>
        ) : null}

        <div className="mt-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {serviceCopy.scopeLabel}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["member", "subtree"] as const).map((scopeValue) => {
              const active = serviceScope === scopeValue;

              return (
                <button
                  className={cn(
                    "inline-flex h-11 items-center justify-center rounded-full border px-4 text-sm font-medium transition",
                    active
                      ? "border-amber-300 bg-amber-100 text-amber-950 shadow-[0_12px_28px_rgba(217,119,6,0.12)]"
                      : "border-white/80 bg-white/85 text-slate-700 hover:border-amber-200 hover:bg-white",
                  )}
                  key={scopeValue}
                  onClick={() => {
                    onChangeServiceScope(scopeValue);
                  }}
                  type="button"
                >
                  {scopeValue === "subtree"
                    ? serviceCopy.scopeSubtree
                    : serviceCopy.scopeMember}
                </button>
              );
            })}
          </div>
        </div>

        {serviceStatusUpdate.error ? (
          <div className="mt-4">
            <MessageCard tone="error">{serviceStatusUpdate.error}</MessageCard>
          </div>
        ) : null}
        {serviceStatusUpdate.notice ? (
          <div className="mt-4">
            <MessageCard>{serviceStatusUpdate.notice}</MessageCard>
          </div>
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={serviceStatusUpdate.status === "submitting"}
            onClick={() => {
              onApplyServiceStatus("suspend");
            }}
            type="button"
          >
            {serviceStatusUpdate.status === "submitting"
              ? serviceCopy.submitPending
              : serviceCopy.suspendAction}
          </button>
          <button
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={serviceStatusUpdate.status === "submitting"}
            onClick={() => {
              onApplyServiceStatus("release");
            }}
            type="button"
          >
            {serviceStatusUpdate.status === "submitting"
              ? serviceCopy.submitPending
              : serviceCopy.releaseAction}
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberAIStarInline({
  active,
  locale,
  member,
}: {
  active: boolean;
  locale: Locale;
  member: ManagedReferralTreeNodeRecord;
}) {
  const copy = getMemberAIStarCopy(locale);
  const star = member.ownedAIStar;

  if (!star) {
    return (
      <div
        className={cn(
          "mt-3 rounded-2xl border px-3 py-2 text-xs font-medium",
          active
            ? "border-white/12 bg-white/8 text-white/58"
            : "border-slate-200 bg-slate-50 text-slate-500",
        )}
      >
        {copy.empty}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mt-3 flex min-w-0 items-center gap-3 rounded-2xl border px-3 py-2",
        active
          ? "border-white/12 bg-white/8"
          : "border-violet-100 bg-[linear-gradient(135deg,#fff_0%,#faf5ff_100%)]",
      )}
    >
      <AIStarPortrait
        className="size-10 shrink-0"
        name={star.name}
        portraitImageUrl={star.portraitImageUrl}
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.64rem] font-bold tracking-[0.12em]",
              active
                ? "bg-white text-slate-950"
                : "bg-slate-950 text-white",
            )}
          >
            <Hexagon className="size-3" />
            AI STAR
          </span>
          <span
            className={cn(
              "truncate text-sm font-semibold",
              active ? "text-white" : "text-slate-950",
            )}
          >
            {star.name}
          </span>
        </div>
        <p
          className={cn(
            "mt-1 truncate text-xs",
            active ? "text-white/58" : "text-slate-500",
          )}
        >
          {copy.listHint} · {copy.scoreLabel} {formatInteger(star.starScore, locale)} ·{" "}
          {getAIStarStatusLabel(star.status, locale)}
        </p>
      </div>
    </div>
  );
}

function SelectedMemberAIStarCard({
  locale,
  member,
}: {
  locale: Locale;
  member: ManagedReferralTreeNodeRecord;
}) {
  const copy = getMemberAIStarCopy(locale);
  const star = member.ownedAIStar;

  if (!star) {
    return (
      <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
          {copy.label}
        </p>
        <p className="mt-2 text-base font-semibold text-slate-950">
          {copy.emptyTitle}
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {copy.emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-violet-100 bg-[linear-gradient(135deg,#ffffff_0%,#faf5ff_52%,#f8fafc_100%)] p-4 shadow-[0_16px_38px_rgba(88,28,135,0.08)]">
      <div className="flex items-start gap-4">
        <AIStarPortrait
          className="size-16 shrink-0"
          name={star.name}
          portraitImageUrl={star.portraitImageUrl}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-950 px-2.5 py-1 text-[0.64rem] font-bold tracking-[0.12em] text-white">
              <Hexagon className="size-3" />
              AI STAR
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.68rem] font-semibold text-emerald-700">
              {getAIStarStatusLabel(star.status, locale)}
            </span>
          </div>
          <p className="mt-2 break-words text-lg font-semibold text-slate-950">
            {star.name}
          </p>
          <p className="mt-1 break-all text-xs font-medium text-slate-500">
            {star.starId}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white/85 px-3 py-2">
          <p className="text-[0.66rem] uppercase tracking-[0.16em] text-slate-500">
            {copy.scoreLabel}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {formatInteger(star.starScore, locale)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/85 px-3 py-2">
          <p className="text-[0.66rem] uppercase tracking-[0.16em] text-slate-500">
            {copy.sourceLabel}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {getAIStarSourceLabel(star.source, locale)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/85 px-3 py-2">
          <p className="text-[0.66rem] uppercase tracking-[0.16em] text-slate-500">
            {copy.createdAtLabel}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {formatDateTime(star.createdAt, locale)}
          </p>
        </div>
      </div>
    </div>
  );
}

function AIStarPortrait({
  className,
  name,
  portraitImageUrl,
}: {
  className?: string;
  name: string;
  portraitImageUrl: string | null;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center overflow-hidden rounded-2xl border border-violet-200 bg-violet-50 bg-cover bg-center text-sm font-bold text-violet-700 shadow-[0_10px_28px_rgba(124,58,237,0.12)]",
        className,
      )}
      style={
        portraitImageUrl
          ? {
              backgroundImage: `url(${portraitImageUrl})`,
            }
          : undefined
      }
    >
      {portraitImageUrl ? null : getAIStarInitials(name)}
    </span>
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
  const [showFullTree, setShowFullTree] = useState(false);
  const focusedNode = path[path.length - 1] ?? null;
  const currentNodes = focusedNode ? focusedNode.children : referrals;
  const currentLevel = focusedNode ? focusedNode.depth + 1 : 1;
  const hasNestedReferrals = totalReferrals > referrals.length;
  const treeModeCopy =
    locale === "ko"
      ? {
          collapse: "1단계만 보기",
          description:
            "2단계 이상 하위 회원이 있으면 전체 트리를 펼쳐 추천 관계를 한 번에 확인할 수 있습니다.",
          expand: "전체 하위 트리 보기",
          title: "추천 네트워크 표시 방식",
        }
      : {
          collapse: "Show level 1 only",
          description:
            "When deeper downline members exist, expand the full tree to review the referral relationship at once.",
          expand: "Show full downline tree",
          title: "Referral network view",
        };

  const renderNestedMembers = (
    nodes: ManagedReferralTreeNodeRecord[],
    level = 1,
  ): ReactNode => {
    if (nodes.length === 0) {
      return null;
    }

    return (
      <div
        className={cn(
          "space-y-3",
          level > 1 &&
            "mt-3 ml-3 border-l border-slate-200 pl-3 sm:ml-5 sm:pl-4",
        )}
      >
        {nodes.map((member) => {
          const theme = getReferralLevelTheme(member.depth);

          return (
            <article
              className="rounded-[22px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
              key={`tree:${member.email}:${member.lastWalletAddress}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em]",
                      theme.compactCardClassName,
                    )}
                  >
                    {dictionary.activateNetworkPage.labels.level} {member.depth}
                  </div>
                  <p className="mt-2.5 break-all text-base font-semibold tracking-tight text-slate-950">
                    {member.email}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {dictionary.activateNetworkPage.labels.directChildren}{" "}
                    {formatInteger(member.directReferralCount, locale)} ·{" "}
                    {dictionary.activateNetworkPage.labels.descendants}{" "}
                    {formatInteger(member.totalReferralCount, locale)}
                  </p>
                </div>

                {member.membershipCardTier !== "none" ? (
                  <MembershipCardBadge
                    dictionary={dictionary}
                    membershipCardTier={member.membershipCardTier}
                  />
                ) : null}
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
                      setShowFullTree(false);
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

              {member.children.length > 0
                ? renderNestedMembers(member.children, level + 1)
                : null}
            </article>
          );
        })}
      </div>
    );
  };

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

      {hasNestedReferrals ? (
        <div className="rounded-[24px] border border-slate-200 bg-white/88 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950">
                {treeModeCopy.title}
              </p>
              <p className="mt-1 break-keep text-sm leading-6 text-slate-600 [word-break:keep-all]">
                {treeModeCopy.description}
              </p>
            </div>
            <button
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              onClick={() => {
                setShowFullTree((current) => !current);
                setPath([]);
              }}
              type="button"
            >
              {showFullTree ? treeModeCopy.collapse : treeModeCopy.expand}
            </button>
          </div>
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

      {showFullTree ? (
        renderNestedMembers(referrals)
      ) : currentNodes.length === 0 ? (
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
  hint,
  icon,
  label,
  locale,
  tone = "dark",
  value,
}: {
  hint?: string;
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
        <div className="min-w-0">
          <p className="text-xs leading-5 uppercase tracking-[0.18em]">{label}</p>
          {hint ? (
            <p
              className={cn(
                "mt-1 line-clamp-2 text-[0.7rem] leading-4 normal-case tracking-normal",
                tone === "dark" ? "text-white/48" : "text-slate-500",
              )}
            >
              {hint}
            </p>
          ) : null}
        </div>
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

function getMemberAIStarCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      createdAtLabel: "생성",
      empty: "생성된 AI 스타 없음",
      emptyDescription:
        "이 회원에게 가입 완료 후 생성되는 AI 스타 프로필이 아직 연결되지 않았습니다.",
      emptyTitle: "AI 스타 연결 대기",
      label: "회원 AI 스타",
      listHint: "가입 후 생성",
      scoreLabel: "스타 점수",
      sourceLabel: "출처",
    };
  }

  return {
    createdAtLabel: "Created",
    empty: "No generated AI Star",
    emptyDescription:
      "The AI Star generated after this member's activation is not linked yet.",
    emptyTitle: "AI Star connection pending",
    label: "Member AI Star",
    listHint: "Generated after signup",
    scoreLabel: "Star score",
    sourceLabel: "Source",
  };
}

function getAIStarStatusLabel(status: string, locale: Locale) {
  const isKorean = locale === "ko";

  if (status === "active") {
    return isKorean ? "운영 중" : "Active";
  }

  if (status === "draft") {
    return isKorean ? "준비 중" : "Draft";
  }

  return isKorean ? "비활성" : "Inactive";
}

function getAIStarSourceLabel(source: string | null, locale: Locale) {
  const isKorean = locale === "ko";

  if (source === "member_signup") {
    return isKorean ? "가입 생성" : "Signup";
  }

  if (source === "creator_unlock") {
    return isKorean ? "Creator 권한 활성화" : "Creator activation";
  }

  if (source === "creator_profile") {
    return isKorean ? "스튜디오 설정" : "Studio profile";
  }

  if (source === "manual") {
    return isKorean ? "운영자 등록" : "Manual";
  }

  return source ?? (isKorean ? "기록 없음" : "Not recorded");
}

function getAIStarInitials(name: string) {
  const compactName = name.trim();

  if (!compactName) {
    return "AI";
  }

  return Array.from(compactName).slice(0, 2).join("").toUpperCase();
}

function getNetworkSummaryHintCopy(locale: Locale) {
  const copy = {
    en: {
      contentBonus: "Points from content activity in this network",
      directMembers: "Members directly invited by this account",
      lifetime: "All points accumulated by the downline",
      referralRewards: "Rewards earned from referral signups",
      spendable: "Redeemable points held by the downline",
      totalMembers: "Completed members in this downline",
    },
    id: {
      contentBonus: "Poin dari aktivitas konten di jaringan ini",
      directMembers: "Member yang diundang langsung oleh akun ini",
      lifetime: "Semua poin yang dikumpulkan downline",
      referralRewards: "Reward dari pendaftaran referral",
      spendable: "Poin redeemable yang dimiliki downline",
      totalMembers: "Member selesai di downline ini",
    },
    ja: {
      contentBonus: "このネットワークのコンテンツ活動ポイント",
      directMembers: "このアカウントが直接招待した会員",
      lifetime: "下位ネットワークが累計した全ポイント",
      referralRewards: "紹介登録から発生した報酬ポイント",
      spendable: "下位会員が現在利用できるポイント",
      totalMembers: "この下位ネットワークの完了会員",
    },
    ko: {
      contentBonus: "콘텐츠 활동으로 받은 포인트",
      directMembers: "이 계정이 직접 초대한 회원",
      lifetime: "하위 전체가 누적한 모든 포인트",
      referralRewards: "추천 가입으로 받은 보상",
      spendable: "하위 회원이 지금 쓸 수 있는 포인트",
      totalMembers: "이 계정 아래 가입 완료 회원",
    },
    vi: {
      contentBonus: "Điểm từ hoạt động nội dung trong mạng này",
      directMembers: "Thành viên được tài khoản này mời trực tiếp",
      lifetime: "Tổng điểm mà tuyến dưới đã tích lũy",
      referralRewards: "Điểm thưởng từ đăng ký giới thiệu",
      spendable: "Điểm có thể dùng của tuyến dưới",
      totalMembers: "Thành viên đã hoàn tất trong tuyến dưới",
    },
    zh: {
      contentBonus: "此网络中的内容活动积分",
      directMembers: "此账号直接邀请的会员",
      lifetime: "下级网络累计的全部积分",
      referralRewards: "推荐注册产生的奖励积分",
      spendable: "下级会员当前可用积分",
      totalMembers: "此下级网络中已完成会员",
    },
  } satisfies Record<
    Locale,
    Record<
      | "contentBonus"
      | "directMembers"
      | "lifetime"
      | "referralRewards"
      | "spendable"
      | "totalMembers",
      string
    >
  >;

  return copy[locale] ?? copy.en;
}

function getMemberSortCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      label: "정렬",
      resultCount: "{count}명 표시 중",
    };
  }

  return {
    label: "Sort",
    resultCount: "{count} members",
  };
}

function getMemberPointChipCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      lifetime: "누적",
      spendable: "사용 가능",
    };
  }

  if (locale === "ja") {
    return {
      lifetime: "累計",
      spendable: "利用可能",
    };
  }

  if (locale === "zh") {
    return {
      lifetime: "累计",
      spendable: "可用",
    };
  }

  return {
    lifetime: "Total",
    spendable: "Spendable",
  };
}

function getMemberPaginationCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      next: "다음",
      previous: "이전",
      range: "{start}-{end}명 / 전체 {total}명",
    };
  }

  return {
    next: "Next",
    previous: "Prev",
    range: "{start}-{end} of {total}",
  };
}

function getMemberSortOptions(locale: Locale) {
  const isKorean = locale === "ko";

  return [
    {
      defaultDirection: "desc",
      key: "recent",
      label: isKorean ? "최근 가입" : "Newest",
    },
    {
      defaultDirection: "asc",
      key: "depth",
      label: isKorean ? "추천 단계" : "Level",
    },
    {
      defaultDirection: "desc",
      key: "lifetimePoints",
      label: isKorean ? "누적 포인트" : "Lifetime points",
    },
    {
      defaultDirection: "desc",
      key: "spendablePoints",
      label: isKorean ? "사용 가능 P" : "Spendable",
    },
    {
      defaultDirection: "desc",
      key: "directReferralCount",
      label: isKorean ? "직접 하위" : "Direct",
    },
    {
      defaultDirection: "desc",
      key: "totalReferralCount",
      label: isKorean ? "전체 하위" : "Network",
    },
    {
      defaultDirection: "desc",
      key: "tier",
      label: isKorean ? "등급" : "Tier",
    },
    {
      defaultDirection: "asc",
      key: "email",
      label: isKorean ? "이메일" : "Email",
    },
  ] satisfies Array<{
    defaultDirection: MemberSortDirection;
    key: MemberSortKey;
    label: string;
  }>;
}

function getMemberSortDirectionLabel(
  locale: Locale,
  key: MemberSortKey,
  direction: MemberSortDirection,
) {
  const isAscending = direction === "asc";

  if (locale !== "ko") {
    if (key === "recent") {
      return isAscending ? "Oldest" : "Newest";
    }

    if (key === "email") {
      return isAscending ? "A-Z" : "Z-A";
    }

    if (key === "depth") {
      return isAscending ? "Near first" : "Deep first";
    }

    return isAscending ? "Low first" : "High first";
  }

  if (key === "recent") {
    return isAscending ? "오래된순" : "최신순";
  }

  if (key === "email") {
    return isAscending ? "가나다순" : "역순";
  }

  if (key === "depth") {
    return isAscending ? "가까운 단계" : "깊은 단계";
  }

  return isAscending ? "낮은순" : "높은순";
}

function compareMembersBySortKey(
  firstMember: ManagedReferralTreeNodeRecord,
  secondMember: ManagedReferralTreeNodeRecord,
  key: MemberSortKey,
  locale: Locale,
) {
  if (key === "email") {
    return firstMember.email.localeCompare(secondMember.email, locale);
  }

  if (key === "recent") {
    return (
      parseMemberDate(firstMember.registrationCompletedAt) -
      parseMemberDate(secondMember.registrationCompletedAt)
    );
  }

  if (key === "tier") {
    return getMemberTierRank(firstMember.tier) - getMemberTierRank(secondMember.tier);
  }

  return getMemberNumericSortValue(firstMember, key) -
    getMemberNumericSortValue(secondMember, key);
}

function getMemberNumericSortValue(
  member: ManagedReferralTreeNodeRecord,
  key: Exclude<MemberSortKey, "email" | "recent" | "tier">,
) {
  if (key === "depth") {
    return member.depth;
  }

  if (key === "directReferralCount") {
    return member.directReferralCount;
  }

  if (key === "lifetimePoints") {
    return member.lifetimePoints;
  }

  if (key === "spendablePoints") {
    return member.spendablePoints;
  }

  return member.totalReferralCount;
}

function getMemberTierRank(tier: ManagedReferralTreeNodeRecord["tier"]) {
  if (tier === "vip") {
    return 4;
  }

  if (tier === "gold") {
    return 3;
  }

  if (tier === "silver") {
    return 2;
  }

  return 1;
}

function parseMemberDate(value: string) {
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatAddressLabel(address: string) {
  if (!address) {
    return "-";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDateTime(value: string, locale: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
