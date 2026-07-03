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
  X,
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
      releaseNoticeMember: "현재 회원의 서비스가 재개되었습니다.",
      releaseNoticeSubtree:
        "현재 회원과 하위 완료 회원 전체의 서비스가 재개되었습니다.",
      scopeLabel: "적용 범위",
      scopeMember: "현재 회원만",
      scopeSubtree: "현재 회원 + 하위 회원",
      statusLabel: "서비스 상태",
      submitPending: "적용 중...",
      suspendAction: "서비스 일시 정지",
      suspendedAtLabel: "중단 시각",
      suspendedByLabel: "중단 처리 관리자",
      suspendedScopeLabel: "중단 적용 범위",
      suspendedValue: "중단됨",
      suspendNoticeMember: "현재 회원 서비스가 중단되었습니다.",
      suspendNoticeSubtree:
        "현재 회원과 하위 완료 회원 전체의 서비스가 중단되었습니다.",
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
  const [isSelectedMemberSheetOpen, setIsSelectedMemberSheetOpen] =
    useState(false);
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
  const summaryContext = getNetworkSummaryContextCopy(locale);

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
  const memberSortOptions = useMemo(() => getMemberSortOptions(locale), [locale]);
  const primaryMemberSortOptions = memberSortOptions.slice(0, 4);
  const advancedMemberSortOptions = memberSortOptions.slice(4);
  const memberSortCopy = useMemo(() => getMemberSortCopy(locale), [locale]);

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
  const memberListOverviewCopy = getMemberListOverviewCopy(locale);
  const memberListStartIndex = sortedMembers.length > 0 ? memberPageStartIndex + 1 : 0;
  const memberListAIStarCount = sortedMembers.reduce(
    (count, member) => count + (member.ownedAIStar ? 1 : 0),
    0,
  );
  const activeMemberSortLabel =
    memberSortOptions.find((option) => option.key === memberSortKey)?.label ??
    memberSortOptions[0]?.label ??
    "";
  const selectedMember =
    state.members.find((member) => member.email === selectedMemberEmail) ??
    paginatedMembers[0] ??
    null;
  const memberPointChipCopy = getMemberPointChipCopy(locale);
  const mobileSelectedMemberCopy = getMobileSelectedMemberCopy(locale);
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
    setIsSelectedMemberSheetOpen(false);
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
    if (!selectedMember) {
      setIsSelectedMemberSheetOpen(false);
    }
  }, [selectedMember]);

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

    if (
      selectedMemberEmail &&
      !sortedMembers.some((member) => member.email === selectedMemberEmail)
    ) {
      setSelectedMemberEmail(null);
    }
  }, [paginatedMembers.length, selectedMemberEmail, sortedMembers]);

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
      setSelectedMemberEmail(null);
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
                    <div className="inline-flex max-w-2xl items-start gap-2 rounded-[20px] border border-white/12 bg-white/10 px-3 py-2.5 text-left text-xs leading-5 text-white/72 sm:text-sm sm:leading-6">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-200" />
                      <span>
                        <strong className="font-semibold text-white">
                          {summaryContext.badge}
                        </strong>
                        <span className="mx-1 text-white/35">·</span>
                        {summaryContext.description}
                      </span>
                    </div>
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
                          {memberSortCopy.label}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatTemplate(memberSortCopy.resultCount, {
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
                      {primaryMemberSortOptions.map((option) => {
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
                    {advancedMemberSortOptions.length > 0 ? (
                      <details className="group mt-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-slate-600">
                          <span>{memberSortCopy.advancedLabel}</span>
                          <ChevronRight className="size-3.5 transition group-open:rotate-90" />
                        </summary>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {advancedMemberSortOptions.map((option) => {
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
                      </details>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-2 rounded-[22px] border border-slate-900/90 bg-slate-950 p-3 text-white shadow-[0_18px_45px_rgba(15,23,42,0.12)] sm:grid-cols-2 xl:grid-cols-4">
                    <MemberListOverviewItem
                      label={memberListOverviewCopy.visibleRange}
                      value={formatTemplate(memberListOverviewCopy.rangeValue, {
                        end: formatInteger(memberPageEndIndex, locale),
                        start: formatInteger(memberListStartIndex, locale),
                        total: formatInteger(sortedMembers.length, locale),
                      })}
                    />
                    <MemberListOverviewItem
                      label={memberListOverviewCopy.currentSort}
                      value={`${activeMemberSortLabel} · ${getMemberSortDirectionLabel(
                        locale,
                        memberSortKey,
                        memberSortDirection,
                      )}`}
                    />
                    <MemberListOverviewItem
                      label={memberListOverviewCopy.aiStarLinked}
                      value={formatTemplate(memberListOverviewCopy.aiStarValue, {
                        count: formatInteger(memberListAIStarCount, locale),
                        total: formatInteger(sortedMembers.length, locale),
                      })}
                    />
                  </div>

                  <div className="mt-4 space-y-3">
                    {state.error ? (
                      <MessageCard tone="error">{state.error}</MessageCard>
                    ) : null}

                    {sortedMembers.length === 0 ? (
                      <MessageCard>{dictionary.activateNetworkPage.empty}</MessageCard>
                    ) : (
                      paginatedMembers.map((member) => {
                        const isSelected = selectedMemberEmail === member.email;

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
                                setIsSelectedMemberSheetOpen(true);
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
                                <div className="flex shrink-0 flex-col items-end gap-2">
                                  {member.membershipCardTier !== "none" ? (
                                    <MembershipCardBadge
                                      active={isSelected}
                                      dictionary={dictionary}
                                      membershipCardTier={member.membershipCardTier}
                                    />
                                  ) : null}
                                </div>
                              </div>

                              <MemberAIStarInline
                                active={isSelected}
                                locale={locale}
                                member={member}
                              />

                              <MemberListContextGrid
                                active={isSelected}
                                locale={locale}
                                member={member}
                              />

                              <div className="mt-3 flex flex-wrap gap-2">
                                <Pill active={isSelected}>
                                  {dictionary.activateNetworkPage.labels.level}{" "}
                                  {formatInteger(member.depth, locale)}
                                </Pill>
                                <Pill active={isSelected}>
                                  {dictionary.activateNetworkPage.labels.pointTier}{" "}
                                  {getTierLabel(dictionary, member.tier)}
                                </Pill>
                                <MemberPointPill
                                  active={isSelected}
                                  label={memberPointChipCopy.lifetime}
                                  value={`${formatInteger(member.lifetimePoints, locale)}P`}
                                />
                                <MemberPointPill
                                  active={isSelected}
                                  label={memberPointChipCopy.spendable}
                                  value={`${formatInteger(member.spendablePoints, locale)}P`}
                                />
                              </div>
                              <div
                                className={cn(
                                  "mt-3 flex items-center justify-between rounded-2xl border px-3 py-2 text-xs font-semibold sm:hidden",
                                  isSelected
                                    ? "border-white/12 bg-white/10 text-white"
                                    : "border-slate-200 bg-slate-50 text-slate-700",
                                )}
                              >
                                <span>{mobileSelectedMemberCopy.action}</span>
                                <ChevronRight className="size-4 shrink-0" />
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
                    networkReturnHref={currentPageHref}
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
                    setIsSelectedMemberSheetOpen(true);
                  }}
                  referrals={state.referrals}
                  totalReferrals={state.totalReferrals}
                />
              </div>
            </section>
          </>
        )}
      </main>
      <SelectedMemberBottomSheet
        dictionary={dictionary}
        locale={locale}
        member={selectedMember}
        networkReturnHref={currentPageHref}
        onApplyServiceStatus={updateMemberServiceStatus}
        onChangeServiceScope={setServiceScope}
        onClose={() => {
          setIsSelectedMemberSheetOpen(false);
          setSelectedMemberEmail(null);
        }}
        open={isSelectedMemberSheetOpen}
        serviceCopy={serviceCopy}
        serviceScope={serviceScope}
        serviceStatusUpdate={serviceStatusUpdate}
      />
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

function SelectedMemberBottomSheet({
  dictionary,
  locale,
  member,
  networkReturnHref,
  onApplyServiceStatus,
  onChangeServiceScope,
  onClose,
  open,
  serviceCopy,
  serviceScope,
  serviceStatusUpdate,
}: {
  dictionary: Dictionary;
  locale: Locale;
  member: ManagedReferralTreeNodeRecord | null;
  networkReturnHref: string;
  onApplyServiceStatus: (action: "release" | "suspend") => void;
  onChangeServiceScope: (scope: ServiceSuspensionScope) => void;
  onClose: () => void;
  open: boolean;
  serviceCopy: ReturnType<typeof getServiceManagementCopy>;
  serviceScope: ServiceSuspensionScope;
  serviceStatusUpdate: ServiceStatusUpdateState;
}) {
  const copy = getMobileSelectedMemberCopy(locale);
  const aiStarStatus = member?.ownedAIStar ? copy.aiStarReady : copy.aiStarPending;

  if (!open || !member) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/52 px-0 backdrop-blur-sm lg:hidden"
      onClick={onClose}
    >
      <section
        aria-label={copy.sheetTitle}
        aria-modal="true"
        className="max-h-[88vh] w-full overflow-hidden rounded-t-[30px] border border-white/70 bg-white shadow-[0_-24px_70px_rgba(15,23,42,0.26)]"
        onClick={(event) => {
          event.stopPropagation();
        }}
        role="dialog"
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                {copy.eyebrow}
              </p>
              <h2 className="mt-1 break-all text-lg font-semibold tracking-tight text-slate-950">
                {member.email}
              </h2>
              <div className="mt-2 flex max-w-[calc(100vw-6.5rem)] gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <span className="inline-flex shrink-0 items-center rounded-full bg-slate-950 px-2.5 py-1 text-[0.68rem] font-semibold text-white">
                  {dictionary.activateNetworkPage.labels.level}{" "}
                  {formatInteger(member.depth, locale)}
                </span>
                <span className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.68rem] font-semibold text-slate-700">
                  {dictionary.activateNetworkPage.labels.directChildren}{" "}
                  {formatInteger(member.directReferralCount, locale)}
                </span>
                <span className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.68rem] font-semibold text-slate-700">
                  {aiStarStatus}
                </span>
              </div>
            </div>
            <button
              aria-label={dictionary.common.loginDialog.close}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(88vh-104px)] overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4">
          <SelectedMemberCard
            className="mt-0"
            dictionary={dictionary}
            locale={locale}
            member={member}
            networkReturnHref={networkReturnHref}
            onApplyServiceStatus={onApplyServiceStatus}
            onChangeServiceScope={onChangeServiceScope}
            serviceCopy={serviceCopy}
            serviceScope={serviceScope}
            serviceStatusUpdate={serviceStatusUpdate}
          />
        </div>
      </section>
    </div>
  );
}

function SelectedMemberPanel({
  dictionary,
  locale,
  member,
  networkReturnHref,
  onApplyServiceStatus,
  onChangeServiceScope,
  serviceCopy,
  serviceScope,
  serviceStatusUpdate,
}: {
  dictionary: Dictionary;
  locale: Locale;
  member: ManagedReferralTreeNodeRecord | null;
  networkReturnHref: string;
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
          networkReturnHref={networkReturnHref}
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
  networkReturnHref,
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
  networkReturnHref: string;
  onApplyServiceStatus: (action: "release" | "suspend") => void;
  onChangeServiceScope: (scope: ServiceSuspensionScope) => void;
  serviceCopy: ReturnType<typeof getServiceManagementCopy>;
  serviceScope: ServiceSuspensionScope;
  serviceStatusUpdate: ServiceStatusUpdateState;
}) {
  const isServiceSuspended = Boolean(member.serviceSuspendedAt);
  const summaryCopy = getSelectedMemberSummaryCopy(locale);
  const detailCopy = getSelectedMemberDetailCopy(locale);
  const aiStarStatus = member.ownedAIStar
    ? `${member.ownedAIStar.name} · ${getAIStarStatusLabel(member.ownedAIStar.status, locale)}`
    : summaryCopy.aiStarPending;
  const networkPosition =
    locale === "ko"
      ? `${member.depth}단계 · 직접 ${formatInteger(member.directReferralCount, locale)}명 · 전체 ${formatInteger(member.totalReferralCount, locale)}명`
      : `Level ${formatInteger(member.depth, locale)} · ${formatInteger(member.directReferralCount, locale)} direct · ${formatInteger(member.totalReferralCount, locale)} network`;
  const nextCheck = member.ownedAIStar
    ? summaryCopy.nextCheckContent
    : summaryCopy.nextCheckProfile;

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

        <div className="mt-3 inline-flex items-start gap-2 rounded-[18px] border border-white/10 bg-white/8 px-3 py-2.5 text-xs leading-5 text-white/70">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-200" />
          <span>
            <strong className="font-semibold text-white">
              {summaryCopy.pointScopeBadge}
            </strong>
            <span className="mx-1 text-white/35">·</span>
            {summaryCopy.pointScopeDescription}
          </span>
        </div>

        <SelectedMemberRelationshipStrip
          copy={summaryCopy}
          locale={locale}
          member={member}
        />

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <MemberSignalCard
            label={summaryCopy.positionLabel}
            value={networkPosition}
          />
          <MemberSignalCard
            label={summaryCopy.aiStarLabel}
            value={aiStarStatus}
          />
          <MemberSignalCard
            label={summaryCopy.nextCheckLabel}
            value={nextCheck}
          />
        </div>
      </div>

      <SelectedMemberJourneyCard
        copy={getSelectedMemberJourneyCopy(locale)}
        locale={locale}
        member={member}
      />

      <SelectedMemberAIStarCard
        locale={locale}
        member={member}
        networkReturnHref={networkReturnHref}
      />

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
      </div>

      <details className="group rounded-[24px] border border-slate-200 bg-white/86 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
              {detailCopy.eyebrow}
            </p>
            <p className="mt-1 text-base font-semibold text-slate-950">
              {detailCopy.title}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {detailCopy.description}
            </p>
          </div>
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition group-open:rotate-90">
            <ChevronRight className="size-4" />
          </span>
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
      </details>

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

function MemberListContextGrid({
  active,
  locale,
  member,
}: {
  active: boolean;
  locale: Locale;
  member: ManagedReferralTreeNodeRecord;
}) {
  const copy = getMemberListContextCopy(locale);
  const networkValue = formatTemplate(copy.networkValue, {
    direct: formatInteger(member.directReferralCount, locale),
    total: formatInteger(member.totalReferralCount, locale),
  });
  const statusValue = member.serviceSuspendedAt
    ? copy.statusSuspended
    : member.status === "completed"
      ? copy.statusCompleted
      : copy.statusPending;

  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <MemberListContextItem
        active={active}
        label={copy.joinedAtLabel}
        value={formatDateOnly(member.registrationCompletedAt, locale)}
      />
      <MemberListContextItem
        active={active}
        label={copy.lastConnectedLabel}
        value={formatDateOnly(member.lastConnectedAt, locale)}
      />
      <MemberListContextItem
        active={active}
        label={copy.networkLabel}
        value={networkValue}
      />
      <MemberListContextItem
        active={active}
        label={copy.statusLabel}
        value={statusValue}
      />
    </div>
  );
}

function MemberListOverviewItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/8 px-3 py-2.5">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/45">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-white" title={value}>
        {value}
      </p>
    </div>
  );
}

function MemberListContextItem({
  active,
  className,
  label,
  value,
}: {
  active: boolean;
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border px-3 py-2.5",
        active
          ? "border-white/10 bg-white/8"
          : "border-slate-200 bg-slate-50/80",
        className,
      )}
    >
      <p
        className={cn(
          "text-[0.62rem] font-semibold uppercase tracking-[0.14em]",
          active ? "text-white/45" : "text-slate-400",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate text-xs font-semibold",
          active ? "text-white/82" : "text-slate-700",
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function SelectedMemberAIStarCard({
  locale,
  member,
  networkReturnHref,
}: {
  locale: Locale;
  member: ManagedReferralTreeNodeRecord;
  networkReturnHref: string;
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

  const aiStarHref = setPathSearchParams(
    `/${locale}/fanletter/${encodeURIComponent(star.starId)}`,
    {
      returnTo: networkReturnHref,
      source: "activate_network_member_ai_star",
    },
  );

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

      <Link
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
        href={aiStarHref}
      >
        {copy.viewCta}
        <ChevronRight className="size-4" />
      </Link>
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
                    {dictionary.activateNetworkPage.labels.level}{" "}
                    {formatInteger(member.depth, locale)}
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

function MemberSignalCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-[18px] border border-white/10 bg-black/18 px-3 py-3">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white/38">
        {label}
      </p>
      <p className="mt-1.5 line-clamp-2 break-keep text-xs font-semibold leading-5 text-white/82 [word-break:keep-all]">
        {value}
      </p>
    </div>
  );
}

function SelectedMemberRelationshipStrip({
  copy,
  locale,
  member,
}: {
  copy: ReturnType<typeof getSelectedMemberSummaryCopy>;
  locale: Locale;
  member: ManagedReferralTreeNodeRecord;
}) {
  const relationship =
    locale === "ko"
      ? `나의 추천 네트워크 ${formatInteger(member.depth, locale)}단계`
      : `Level ${formatInteger(member.depth, locale)} in my network`;
  const aiStarValue = member.ownedAIStar
    ? member.ownedAIStar.name
    : copy.aiStarShortPending;

  return (
    <div className="mt-4 rounded-[22px] border border-white/10 bg-white/8 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white/42">
            {copy.relationshipEyebrow}
          </p>
          <p className="mt-1 break-keep text-sm font-semibold leading-5 text-white [word-break:keep-all]">
            {relationship}
          </p>
        </div>
        <span className="inline-flex h-9 w-fit items-center gap-2 rounded-full border border-white/12 bg-black/18 px-3 text-xs font-semibold text-white/78">
          <GitBranch className="size-3.5" />
          {copy.relationshipBadge}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <RelationshipPill
          icon={<Users className="size-3.5" />}
          label={copy.directLabel}
          value={formatTemplate(copy.memberCountValue, {
            count: formatInteger(member.directReferralCount, locale),
          })}
        />
        <RelationshipPill
          icon={<GitBranch className="size-3.5" />}
          label={copy.networkLabel}
          value={formatTemplate(copy.memberCountValue, {
            count: formatInteger(member.totalReferralCount, locale),
          })}
        />
        <RelationshipPill
          icon={<Hexagon className="size-3.5" />}
          label={copy.aiStarLabel}
          value={aiStarValue}
        />
      </div>
    </div>
  );
}

function RelationshipPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/14 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-white/42">
        {icon}
        <p className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.16em]">
          {label}
        </p>
      </div>
      <p className="mt-1 truncate text-xs font-semibold text-white/84" title={value}>
        {value}
      </p>
    </div>
  );
}

function SelectedMemberJourneyCard({
  copy,
  locale,
  member,
}: {
  copy: ReturnType<typeof getSelectedMemberJourneyCopy>;
  locale: Locale;
  member: ManagedReferralTreeNodeRecord;
}) {
  const aiStarValue = member.ownedAIStar
    ? `${member.ownedAIStar.name} · ${getAIStarStatusLabel(member.ownedAIStar.status, locale)}`
    : copy.aiStarPending;
  const steps = [
    {
      detail: formatDateTime(member.registrationCompletedAt, locale),
      state: copy.doneState,
      title: copy.signupTitle,
    },
    {
      detail: formatAddressLabel(member.lastWalletAddress),
      state: member.lastWalletAddress ? copy.readyState : copy.pendingState,
      title: copy.walletTitle,
    },
    {
      detail: aiStarValue,
      state: member.ownedAIStar ? copy.readyState : copy.pendingState,
      title: copy.aiStarTitle,
    },
    {
      detail:
        locale === "ko"
          ? `사용 가능 ${formatInteger(member.spendablePoints, locale)}P · 누적 ${formatInteger(member.lifetimePoints, locale)}P`
          : `${formatInteger(member.spendablePoints, locale)}P available · ${formatInteger(member.lifetimePoints, locale)}P lifetime`,
      state: copy.readyState,
      title: copy.pointsTitle,
    },
  ];

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white/92 p-4 shadow-[0_16px_42px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {copy.eyebrow}
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
            {copy.title}
          </h3>
        </div>
        <p className="max-w-md text-sm leading-6 text-slate-600">
          {copy.description}
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        {steps.map((step, index) => (
          <div
            className="min-w-0 rounded-[20px] border border-slate-200 bg-slate-50/80 p-3"
            key={step.title}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                {index + 1}
              </span>
              <span className="truncate rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.68rem] font-semibold text-emerald-700">
                {step.state}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-950">
              {step.title}
            </p>
            <p className="mt-1 line-clamp-2 break-all text-xs leading-5 text-slate-600">
              {step.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
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

function MemberPointPill({
  active = false,
  label,
  value,
}: {
  active?: boolean;
  label: string;
  value: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[6.75rem] flex-col rounded-[16px] border px-3 py-2 text-left",
        active
          ? "border-white/18 bg-white/10 text-white"
          : "border-slate-200 bg-white text-slate-950 shadow-[0_10px_26px_rgba(15,23,42,0.05)]",
      )}
    >
      <span
        className={cn(
          "text-[0.66rem] font-semibold leading-none",
          active ? "text-white/56" : "text-slate-500",
        )}
      >
        {label}
      </span>
      <span className="mt-1.5 text-sm font-semibold leading-none">{value}</span>
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
      viewCta: "AI 스타 유니버스 보기",
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
    viewCta: "View AI Star Universe",
  };
}

function getSelectedMemberSummaryCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      aiStarLabel: "AI 스타",
      aiStarShortPending: "생성 대기",
      directLabel: "직접 하위",
      aiStarPending: "가입 후 생성 정보 대기",
      memberCountValue: "{count}명",
      networkLabel: "전체 하위",
      nextCheckContent: "콘텐츠와 포인트 이력 확인",
      nextCheckLabel: "다음 확인",
      nextCheckProfile: "AI 스타 프로필 연결 확인",
      pointScopeBadge: "이 회원 기준",
      pointScopeDescription:
        "아래 포인트는 선택한 회원 한 명의 값이며, 상단 네트워크 합산과 별도로 봅니다.",
      positionLabel: "네트워크 위치",
      relationshipBadge: "관계 확인",
      relationshipEyebrow: "관계 요약",
    };
  }

  return {
    aiStarLabel: "AI Star",
    aiStarShortPending: "Pending",
    directLabel: "Direct",
    aiStarPending: "Generated profile pending",
    memberCountValue: "{count}",
    networkLabel: "Network",
    nextCheckContent: "Review content and points history",
    nextCheckLabel: "Next check",
    nextCheckProfile: "Confirm AI Star profile link",
    pointScopeBadge: "Member scope",
    pointScopeDescription:
      "These points belong to the selected member and are separate from the network totals above.",
    positionLabel: "Network position",
    relationshipBadge: "Relationship",
    relationshipEyebrow: "Relationship summary",
  };
}

function getSelectedMemberJourneyCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      aiStarPending: "AI 스타 프로필 생성 대기",
      aiStarTitle: "AI 스타 프로필",
      description:
        "가입, 지갑, AI 스타, 포인트가 어떤 순서로 연결됐는지 확인합니다.",
      doneState: "완료",
      eyebrow: "서비스 기록",
      pendingState: "대기",
      pointsTitle: "포인트",
      readyState: "준비",
      signupTitle: "가입 완료",
      title: "이 회원의 진행 흐름",
      walletTitle: "지갑 연결",
    };
  }

  return {
    aiStarPending: "AI Star profile pending",
    aiStarTitle: "AI Star profile",
    description:
      "Review how signup, wallet, AI Star, and points are connected.",
    doneState: "Done",
    eyebrow: "Service record",
    pendingState: "Pending",
    pointsTitle: "Points",
    readyState: "Ready",
    signupTitle: "Signup complete",
    title: "Member progress flow",
    walletTitle: "Wallet",
  };
}

function getSelectedMemberDetailCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "필요할 때 지갑 주소, 추천 코드, 배치 코드만 펼쳐서 확인합니다.",
      eyebrow: "상세 정보",
      title: "지갑·추천 코드 보기",
    };
  }

  if (locale === "ja") {
    return {
      description:
        "運用確認に必要なウォレットアドレス、紹介コード、配置コードだけを折りたたんで確認します。",
      eyebrow: "詳細情報",
      title: "ウォレット・紹介コードを見る",
    };
  }

  if (locale === "zh") {
    return {
      description: "折叠查看运营确认所需的钱包地址、推荐码和位置码。",
      eyebrow: "详细信息",
      title: "查看钱包和推荐码",
    };
  }

  if (locale === "vi") {
    return {
      description:
        "Mở khi cần kiểm tra địa chỉ ví, mã giới thiệu và mã vị trí vận hành.",
      eyebrow: "Chi tiết",
      title: "Xem ví và mã giới thiệu",
    };
  }

  if (locale === "id") {
    return {
      description:
        "Buka saat perlu memeriksa alamat wallet, kode referral, dan kode penempatan.",
      eyebrow: "Detail",
      title: "Lihat wallet dan kode referral",
    };
  }

  return {
    description:
      "Open only when you need wallet, referral, and placement details for operations.",
    eyebrow: "Details",
    title: "View wallet and referral codes",
  };
}

function getMobileSelectedMemberCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      action: "상태와 AI 스타 보기",
      aiStarPending: "AI 스타 대기",
      aiStarReady: "AI 스타 있음",
      eyebrow: "선택한 회원",
      sheetTitle: "회원 상태",
    };
  }

  if (locale === "ja") {
    return {
      action: "状態とAIスターを見る",
      aiStarPending: "AIスター待ち",
      aiStarReady: "AIスターあり",
      eyebrow: "選択したメンバー",
      sheetTitle: "メンバー状態",
    };
  }

  if (locale === "zh") {
    return {
      action: "查看状态和 AI Star",
      aiStarPending: "AI Star 待生成",
      aiStarReady: "已有 AI Star",
      eyebrow: "已选会员",
      sheetTitle: "会员状态",
    };
  }

  if (locale === "vi") {
    return {
      action: "Xem trạng thái và AI Star",
      aiStarPending: "AI Star đang chờ",
      aiStarReady: "Có AI Star",
      eyebrow: "Thành viên đã chọn",
      sheetTitle: "Trạng thái thành viên",
    };
  }

  if (locale === "id") {
    return {
      action: "Lihat status dan AI Star",
      aiStarPending: "AI Star menunggu",
      aiStarReady: "Ada AI Star",
      eyebrow: "Member terpilih",
      sheetTitle: "Status member",
    };
  }

  return {
    action: "View status and AI Star",
    aiStarPending: "AI Star pending",
    aiStarReady: "AI Star ready",
    eyebrow: "Selected member",
    sheetTitle: "Member status",
  };
}

function getMemberListContextCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      joinedAtLabel: "가입일",
      lastConnectedLabel: "최근 연결",
      networkLabel: "하위 규모",
      networkValue: "직접 {direct}명 · 전체 {total}명",
      statusCompleted: "가입 완료",
      statusLabel: "회원 상태",
      statusPending: "대기",
      statusSuspended: "중단",
    };
  }

  if (locale === "ja") {
    return {
      joinedAtLabel: "登録日",
      lastConnectedLabel: "最終接続",
      networkLabel: "下位規模",
      networkValue: "直接 {direct}名 · 全体 {total}名",
      statusCompleted: "登録完了",
      statusLabel: "会員状態",
      statusPending: "待機",
      statusSuspended: "停止",
    };
  }

  if (locale === "zh") {
    return {
      joinedAtLabel: "注册日期",
      lastConnectedLabel: "最近连接",
      networkLabel: "下级规模",
      networkValue: "直属 {direct}人 · 全部 {total}人",
      statusCompleted: "注册完成",
      statusLabel: "会员状态",
      statusPending: "等待中",
      statusSuspended: "已暂停",
    };
  }

  if (locale === "vi") {
    return {
      joinedAtLabel: "Ngày tham gia",
      lastConnectedLabel: "Kết nối gần nhất",
      networkLabel: "Quy mô tuyến dưới",
      networkValue: "Trực tiếp {direct} · Toàn mạng {total}",
      statusCompleted: "Hoàn tất",
      statusLabel: "Trạng thái",
      statusPending: "Đang chờ",
      statusSuspended: "Tạm dừng",
    };
  }

  if (locale === "id") {
    return {
      joinedAtLabel: "Tanggal gabung",
      lastConnectedLabel: "Terakhir terhubung",
      networkLabel: "Ukuran jaringan",
      networkValue: "Langsung {direct} · Total {total}",
      statusCompleted: "Selesai",
      statusLabel: "Status",
      statusPending: "Menunggu",
      statusSuspended: "Ditangguhkan",
    };
  }

  return {
    joinedAtLabel: "Joined",
    lastConnectedLabel: "Last connected",
    networkLabel: "Downline size",
    networkValue: "Direct {direct} · Total {total}",
    statusCompleted: "Completed",
    statusLabel: "Member status",
    statusPending: "Pending",
    statusSuspended: "Suspended",
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
      lifetime: "Tier lifetime points accumulated by the downline",
      referralRewards: "Rewards earned from referral signups",
      spendable: "Redeemable balances currently held by the downline",
      totalMembers: "Completed members in this downline",
    },
    id: {
      contentBonus: "Poin dari aktivitas konten di jaringan ini",
      directMembers: "Member yang diundang langsung oleh akun ini",
      lifetime: "Akumulasi poin untuk level anggota di downline",
      referralRewards: "Reward dari pendaftaran referral",
      spendable: "Saldo poin yang bisa ditukar oleh downline",
      totalMembers: "Member selesai di downline ini",
    },
    ja: {
      contentBonus: "このネットワークのコンテンツ活動ポイント",
      directMembers: "このアカウントが直接招待した会員",
      lifetime: "下位会員のランク計算用累積ポイント",
      referralRewards: "紹介登録から発生した報酬ポイント",
      spendable: "下位会員が現在交換に使える残高",
      totalMembers: "この下位ネットワークの完了会員",
    },
    ko: {
      contentBonus: "콘텐츠 활동으로 받은 포인트",
      directMembers: "이 계정이 직접 초대한 회원",
      lifetime: "하위 회원의 등급 기준 누적 포인트",
      referralRewards: "추천 가입으로 받은 보상",
      spendable: "하위 회원이 지금 교환에 쓸 수 있는 포인트",
      totalMembers: "이 계정 아래 가입 완료 회원",
    },
    vi: {
      contentBonus: "Điểm từ hoạt động nội dung trong mạng này",
      directMembers: "Thành viên được tài khoản này mời trực tiếp",
      lifetime: "Điểm tích lũy dùng để tính hạng của tuyến dưới",
      referralRewards: "Điểm thưởng từ đăng ký giới thiệu",
      spendable: "Số dư điểm có thể đổi của tuyến dưới",
      totalMembers: "Thành viên đã hoàn tất trong tuyến dưới",
    },
    zh: {
      contentBonus: "此网络中的内容活动积分",
      directMembers: "此账号直接邀请的会员",
      lifetime: "下级会员用于等级计算的累计积分",
      referralRewards: "推荐注册产生的奖励积分",
      spendable: "下级会员当前可兑换的积分余额",
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

function getNetworkSummaryContextCopy(locale: Locale) {
  const copy = {
    en: {
      badge: "Downline aggregate",
      description:
        "Summary points are not your wallet balance. They are totals from completed members in this referral network.",
    },
    id: {
      badge: "Total downline",
      description:
        "Poin ringkasan bukan saldo dompet Anda, tetapi total member selesai dalam jaringan referral ini.",
    },
    ja: {
      badge: "下位会員の合計",
      description:
        "ここに表示されるポイントは自分の残高ではなく、この紹介ネットワークに含まれる完了会員の合計です。",
    },
    ko: {
      badge: "하위 회원 합산",
      description:
        "요약 포인트는 내 지갑 잔액이 아니라 이 추천 네트워크에 포함된 완료 회원들의 합계입니다.",
    },
    vi: {
      badge: "Tổng tuyến dưới",
      description:
        "Điểm tóm tắt không phải số dư ví của bạn mà là tổng của các thành viên hoàn tất trong mạng giới thiệu này.",
    },
    zh: {
      badge: "下级会员合计",
      description:
        "这里的积分不是我的钱包余额，而是该推荐网络内已完成会员的合计。",
    },
  } satisfies Record<Locale, { badge: string; description: string }>;

  return copy[locale] ?? copy.en;
}

function getMemberSortCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      advancedLabel: "추가 정렬",
      label: "정렬 기준",
      resultCount: "조건에 맞는 회원 {count}명",
    };
  }

  return {
    advancedLabel: "More sort options",
    label: "Sort by",
    resultCount: "{count} matching members",
  };
}

function getMemberListOverviewCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      aiStarLinked: "AI 스타 프로필",
      aiStarValue: "{count}/{total}명 연결",
      currentSort: "현재 정렬",
      rangeValue: "{start}-{end} / {total}명",
      visibleRange: "목록 범위",
    };
  }

  if (locale === "ja") {
    return {
      aiStarLinked: "AIスタープロフィール",
      aiStarValue: "{count}/{total}名連携",
      currentSort: "現在の並び替え",
      rangeValue: "{start}-{end} / {total}名",
      visibleRange: "表示範囲",
    };
  }

  if (locale === "zh") {
    return {
      aiStarLinked: "AI明星资料",
      aiStarValue: "{count}/{total}人已连接",
      currentSort: "当前排序",
      rangeValue: "{start}-{end} / {total}人",
      visibleRange: "列表范围",
    };
  }

  if (locale === "vi") {
    return {
      aiStarLinked: "Hồ sơ AI Star",
      aiStarValue: "{count}/{total} đã liên kết",
      currentSort: "Sắp xếp hiện tại",
      rangeValue: "{start}-{end} / {total}",
      visibleRange: "Phạm vi danh sách",
    };
  }

  if (locale === "id") {
    return {
      aiStarLinked: "Profil AI Star",
      aiStarValue: "{count}/{total} tertaut",
      currentSort: "Urutan saat ini",
      rangeValue: "{start}-{end} / {total}",
      visibleRange: "Rentang daftar",
    };
  }

  return {
    aiStarLinked: "AI Star profile",
    aiStarValue: "{count}/{total} linked",
    currentSort: "Current sort",
    rangeValue: "{start}-{end} / {total}",
    visibleRange: "List range",
  };
}

function getMemberPointChipCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      lifetime: "등급 누적",
      spendable: "교환 가능",
    };
  }

  if (locale === "ja") {
    return {
      lifetime: "ランク累積",
      spendable: "交換可能",
    };
  }

  if (locale === "zh") {
    return {
      lifetime: "等级累计",
      spendable: "可兑换",
    };
  }

  if (locale === "vi") {
    return {
      lifetime: "Tích lũy hạng",
      spendable: "Có thể đổi",
    };
  }

  if (locale === "id") {
    return {
      lifetime: "Total level",
      spendable: "Bisa ditukar",
    };
  }

  return {
    lifetime: "Tier total",
    spendable: "Redeemable",
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
      label: isKorean ? "등급 누적 P" : "Tier lifetime",
    },
    {
      defaultDirection: "desc",
      key: "spendablePoints",
      label: isKorean ? "교환 가능 P" : "Redeemable",
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

function formatDateOnly(value: string, locale: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
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
