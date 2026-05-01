"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Heart,
  LoaderCircle,
  MessageCircle,
  RefreshCcw,
  Share2,
} from "lucide-react";
import {
  useActiveAccount,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { useMemberSession } from "@/components/member-session-provider";
import { getContentCopy, type ContentCopy } from "@/lib/content-copy";
import type {
  ContentDetailLoadResponse,
  ContentDetailRecord,
  ContentFeedItemRecord,
  ContentFeedLoadResponse,
  ContentFeedView,
  ContentSocialResponse,
  ContentSocialSummaryRecord,
} from "@/lib/content";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { trackFunnelEvent } from "@/lib/funnel-client";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { MemberRecord } from "@/lib/member";
import { createShareId, setShareIdOnHref } from "@/lib/share-tracking";
import {
  hasThirdwebClientId,
  thirdwebClient,
} from "@/lib/thirdweb";
import {
  getThirdwebUserEmail,
  useThirdwebConnectionState,
} from "@/lib/thirdweb-client";
import { cn } from "@/lib/utils";

type DetailFeedState = {
  error: string | null;
  items: ContentFeedItemRecord[];
  member: MemberRecord | null;
  status: "idle" | "loading" | "ready" | "error";
};

type DetailLoadState = {
  content: ContentDetailRecord | null;
  error: string | null;
  gateReason: ContentDetailLoadResponse["gateReason"];
  status: "loading" | "ready" | "error";
};

type TargetFallbackStatus = "failed" | "idle" | "loading" | "ready";

type FeedRestoreSnapshot = {
  items: ContentFeedItemRecord[];
  member: MemberRecord | null;
  nextCursor: string | null;
  savedAt: number;
  scrollY: number;
  selectedCreatorKey: string | null;
  version: number;
};

type InitialPublicFeed = {
  items: ContentFeedItemRecord[];
  nextCursor: string | null;
} | null;

const FEED_RESTORE_VERSION = 7;
const FEED_RESTORE_TTL_MS = 1000 * 60 * 20;
const DETAIL_IMAGE_SIZES = "(max-width: 640px) 100vw, 560px";

function createFeedRestoreKey({
  accountAddress,
  feedView,
  isPublicReferralFeed,
  locale,
  referralCode,
}: {
  accountAddress?: string | null;
  feedView: ContentFeedView;
  isPublicReferralFeed: boolean;
  locale: Locale;
  referralCode?: string | null;
}) {
  if (isPublicReferralFeed && referralCode) {
    return `network-feed:${FEED_RESTORE_VERSION}:${locale}:${feedView}:ref:${referralCode}`;
  }

  if (accountAddress) {
    return `network-feed:${FEED_RESTORE_VERSION}:${locale}:${feedView}:wallet:${accountAddress.toLowerCase()}`;
  }

  return null;
}

function readFeedRestoreSnapshot(key: string | null) {
  if (!key || typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(key);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<FeedRestoreSnapshot>;

    if (
      parsed.version !== FEED_RESTORE_VERSION ||
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > FEED_RESTORE_TTL_MS ||
      !Array.isArray(parsed.items)
    ) {
      window.sessionStorage.removeItem(key);
      return null;
    }

    return {
      items: parsed.items,
      member: parsed.member ?? null,
      nextCursor: parsed.nextCursor ?? null,
      savedAt: parsed.savedAt,
      scrollY: typeof parsed.scrollY === "number" ? parsed.scrollY : 0,
      selectedCreatorKey: parsed.selectedCreatorKey ?? null,
      version: FEED_RESTORE_VERSION,
    } satisfies FeedRestoreSnapshot;
  } catch {
    return null;
  }
}

function resolveFeedPreviewImage(
  item: Pick<ContentFeedItemRecord, "coverImageUrl" | "contentImageUrls">,
) {
  return item.coverImageUrl ?? item.contentImageUrls[0] ?? null;
}

function getDisplayName(item: ContentFeedItemRecord) {
  return item.authorProfile?.displayName?.trim() || item.authorEmail;
}

function getAvatarFallback(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "U";
}

function formatDate(value: string, locale: Locale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(date);
}

function formatCompactCount(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    notation: value >= 1000 ? "compact" : "standard",
  }).format(value);
}

function truncateText(value: string, maxLength: number) {
  const normalized = value.replace(/\n{3,}/g, "\n\n").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function mergeItems(
  currentItems: ContentFeedItemRecord[],
  nextItems: ContentFeedItemRecord[],
) {
  const seen = new Set(currentItems.map((item) => item.contentId));
  const merged = [...currentItems];

  for (const item of nextItems) {
    if (seen.has(item.contentId)) {
      continue;
    }

    seen.add(item.contentId);
    merged.push(item);
  }

  return merged;
}

function prioritizeItem(
  items: ContentFeedItemRecord[],
  contentId: string,
) {
  const targetIndex = items.findIndex((item) => item.contentId === contentId);

  if (targetIndex <= 0) {
    return items;
  }

  const nextItems = [...items];
  const [targetItem] = nextItems.splice(targetIndex, 1);

  return targetItem ? [targetItem, ...nextItems] : items;
}

function getViewParam(feedView: ContentFeedView) {
  return feedView === "network" ? null : feedView;
}

function getFeedPath(locale: Locale, feedView: ContentFeedView) {
  if (feedView === "saved") {
    return `/${locale}/network-feed/saved`;
  }

  if (feedView === "purchases") {
    return `/${locale}/network-feed/purchases`;
  }

  return `/${locale}/network-feed`;
}

export function NetworkFeedDetailPage({
  contentId,
  dictionary,
  feedView = "network",
  initialPublicFeed = null,
  initialTargetItem = null,
  locale,
  referralCode = null,
  returnToHref = null,
  shareId = null,
}: {
  contentId: string;
  dictionary: Dictionary;
  feedView?: ContentFeedView;
  initialPublicFeed?: InitialPublicFeed;
  initialTargetItem?: ContentFeedItemRecord | null;
  locale: Locale;
  referralCode?: string | null;
  returnToHref?: string | null;
  shareId?: string | null;
}) {
  const contentCopy = getContentCopy(locale);
  const account = useActiveAccount();
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const memberSession = useMemberSession();
  const { updateMemberSession } = memberSession;
  const memberSessionEmail =
    accountAddress &&
    memberSession.accountAddress?.toLowerCase() === accountAddress.toLowerCase()
      ? memberSession.email
      : null;
  const hasReferralCode = Boolean(referralCode);
  const initialItems = useMemo(
    () => {
      const items = initialTargetItem
        ? mergeItems([initialTargetItem], initialPublicFeed?.items ?? [])
        : initialPublicFeed?.items ?? [];

      return prioritizeItem(items, contentId);
    },
    [contentId, initialPublicFeed?.items, initialTargetItem],
  );
  const hasInitialPublicContent =
    feedView === "network" &&
    hasReferralCode &&
    (Boolean(initialPublicFeed) || Boolean(initialTargetItem));
  const {
    isConnected: isWalletConnected,
    isResolving: isWalletConnectionResolving,
  } = useThirdwebConnectionState({ accountAddress, status });
  const isFeedModeResolving =
    feedView === "network" &&
    hasReferralCode &&
    !hasInitialPublicContent &&
    isWalletConnectionResolving;
  const isPublicReferralFeed =
    feedView === "network" &&
    hasReferralCode &&
    !isWalletConnected &&
    (status === "disconnected" || !hasThirdwebClientId || hasInitialPublicContent);
  const isMemberSessionRestorePending =
    !isPublicReferralFeed &&
    status === "connected" &&
    Boolean(accountAddress) &&
    !memberSessionEmail &&
    (memberSession.status === "idle" ||
      memberSession.status === "validating" ||
      memberSession.isValidating);
  const isPrivateFeedConnectionResolving =
    !isPublicReferralFeed &&
    (isWalletConnectionResolving || isMemberSessionRestorePending);
  const isDisconnected = !isWalletConnected;
  const feedRestoreKey = useMemo(
    () =>
      createFeedRestoreKey({
        accountAddress,
        feedView,
        isPublicReferralFeed,
        locale,
        referralCode,
      }),
    [accountAddress, feedView, isPublicReferralFeed, locale, referralCode],
  );
  const feedHref = setPathSearchParams(
    buildPathWithReferral(getFeedPath(locale, feedView), referralCode),
    { shareId },
  );
  const backHref = returnToHref ?? feedHref;
  const viewParam = getViewParam(feedView);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeIndexRef = useRef(0);
  const detailStatusByContentIdRef = useRef<
    Record<string, DetailLoadState["status"]>
  >({});
  const isLoadingMoreRef = useRef(false);
  const restoredFeedKeyRef = useRef<string | null>(null);
  const alignedContentIdRef = useRef<string | null>(null);
  const initialPublicTargetRef = useRef(
    Boolean(
      initialTargetItem ??
        initialPublicFeed?.items.some((item) => item.contentId === contentId),
    ),
  );
  const initialTargetItemRef = useRef(initialTargetItem);
  const [state, setState] = useState<DetailFeedState>({
    error: null,
    items: initialItems,
    member: null,
    status: initialItems.length > 0 ? "ready" : "idle",
  });
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialPublicFeed?.nextCursor ?? null,
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [targetSearchAttempts, setTargetSearchAttempts] = useState(0);
  const [targetFallbackStatus, setTargetFallbackStatus] =
    useState<TargetFallbackStatus>("idle");
  const [detailByContentId, setDetailByContentId] = useState<
    Record<string, DetailLoadState>
  >({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    initialTargetItemRef.current = initialTargetItem;
  }, [initialTargetItem]);

  const targetIndex = useMemo(
    () => state.items.findIndex((item) => item.contentId === contentId),
    [contentId, state.items],
  );
  const activeItem = state.items[activeIndex] ?? state.items[targetIndex] ?? null;
  const activeContentId = activeItem?.contentId ?? null;

  const updateItemSocial = useCallback(
    (nextContentId: string, social: ContentSocialSummaryRecord) => {
      setState((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.contentId === nextContentId ? { ...item, social } : item,
        ),
      }));
    },
    [],
  );

  const buildNetworkDetailHref = useCallback(
    (nextContentId: string) =>
      setPathSearchParams(
        buildPathWithReferral(
          `/${locale}/network-feed/${nextContentId}`,
          referralCode,
        ),
        {
          returnTo: returnToHref,
          shareId,
          view: viewParam,
        },
      ),
    [locale, referralCode, returnToHref, shareId, viewParam],
  );

  const loadFeed = useCallback(
    async (options?: { append?: boolean; cursor?: string | null }) => {
      const append = Boolean(options?.append);
      const cursor = options?.cursor ?? null;

      if (append) {
        if (!cursor || isLoadingMoreRef.current) {
          return;
        }

        isLoadingMoreRef.current = true;
        setIsLoadingMore(true);
      } else {
        setNextCursor(null);
        setState((current) => ({
          ...current,
          error: null,
          status: "loading",
        }));
      }

      try {
        const response = isPublicReferralFeed
          ? await fetch(
              `/api/content/feed?${new URLSearchParams({
                ...(cursor ? { cursor } : {}),
                locale,
                referralCode: referralCode ?? "",
              }).toString()}`,
              { cache: "no-store" },
            )
          : accountAddress
            ? await (async () => {
                const email =
                  memberSessionEmail ??
                  (await getThirdwebUserEmail({ client: thirdwebClient }));

                if (!email) {
                  throw new Error(dictionary.member.errors.missingEmail);
                }

                return fetch(
                  `/api/content/feed?${new URLSearchParams({
                    ...(cursor ? { cursor } : {}),
                    email,
                    locale,
                    view: feedView,
                    walletAddress: accountAddress,
                  }).toString()}`,
                  { cache: "no-store" },
                );
              })()
            : null;

        if (!response) {
          setState({
            error: null,
            items: initialTargetItemRef.current
              ? [initialTargetItemRef.current]
              : [],
            member: null,
            status: "ready",
          });
          return;
        }

        const data = (await response.json()) as
          | ContentFeedLoadResponse
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : contentCopy.messages.feedLoadFailed,
          );
        }

        const member = "member" in data ? data.member : null;

        if (member && accountAddress) {
          updateMemberSession({
            email: member.email,
            member,
            walletAddress: accountAddress,
          });
        }

        if (!member && !isPublicReferralFeed) {
          throw new Error(contentCopy.messages.memberMissing);
        }

        if (
          !isPublicReferralFeed &&
          "validationError" in data &&
          data.validationError
        ) {
          setState({
            error: data.validationError,
            items: [],
            member,
            status: "ready",
          });
          setNextCursor(null);
          return;
        }

        if (!isPublicReferralFeed && member?.status !== "completed") {
          setState({
            error: contentCopy.messages.paymentRequired,
            items: [],
            member,
            status: "ready",
          });
          setNextCursor(null);
          return;
        }

        const nextItems = "items" in data ? data.items : [];

        setState((current) => ({
          error: null,
          items: prioritizeItem(
            append
              ? mergeItems(current.items, nextItems)
              : mergeItems(
                  initialTargetItemRef.current
                    ? [initialTargetItemRef.current]
                    : [],
                  nextItems,
                ),
            contentId,
          ),
          member,
          status: "ready",
        }));
        setNextCursor("nextCursor" in data ? data.nextCursor : null);
      } catch (error) {
        if (append) {
          setState((current) => ({
            ...current,
            error:
              error instanceof Error
                ? error.message
                : contentCopy.messages.feedLoadFailed,
            status: current.items.length > 0 ? "ready" : "error",
          }));
          return;
        }

        setState({
          error:
            error instanceof Error
              ? error.message
              : contentCopy.messages.feedLoadFailed,
          items: [],
          member: null,
          status: "error",
        });
        setNextCursor(null);
      } finally {
        if (append) {
          isLoadingMoreRef.current = false;
          setIsLoadingMore(false);
        }
      }
    },
    [
      accountAddress,
      contentId,
      contentCopy.messages.feedLoadFailed,
      contentCopy.messages.memberMissing,
      contentCopy.messages.paymentRequired,
      dictionary.member.errors.missingEmail,
      feedView,
      isPublicReferralFeed,
      locale,
      memberSessionEmail,
      referralCode,
      updateMemberSession,
    ],
  );

  useEffect(() => {
    if (isFeedModeResolving || isPrivateFeedConnectionResolving) {
      setState((current) => ({
        ...current,
        error: null,
        status: "loading",
      }));
      return;
    }

    if (feedRestoreKey && restoredFeedKeyRef.current !== feedRestoreKey) {
      const snapshot = readFeedRestoreSnapshot(feedRestoreKey);
      restoredFeedKeyRef.current = feedRestoreKey;

      if (snapshot?.items.length) {
        const restoredItems = prioritizeItem(
          mergeItems(
            initialTargetItemRef.current ? [initialTargetItemRef.current] : [],
            snapshot.items,
          ),
          contentId,
        );

        setState({
          error: null,
          items: restoredItems,
          member: snapshot.member,
          status: "ready",
        });
        setNextCursor(snapshot.nextCursor);

        if (restoredItems.some((item) => item.contentId === contentId)) {
          return;
        }
      }
    }

    if (initialPublicTargetRef.current) {
      return;
    }

    if (isPublicReferralFeed) {
      void loadFeed();
      return;
    }

    if (status !== "connected" || !accountAddress || !hasThirdwebClientId) {
      setState({
        error: null,
        items: [],
        member: null,
        status: "idle",
      });
      setNextCursor(null);
      return;
    }

    void loadFeed();
  }, [
    accountAddress,
    contentId,
    feedRestoreKey,
    isFeedModeResolving,
    isPrivateFeedConnectionResolving,
    isPublicReferralFeed,
    loadFeed,
    status,
  ]);

  useEffect(() => {
    setTargetSearchAttempts(0);
    setTargetFallbackStatus("idle");
    alignedContentIdRef.current = null;
  }, [contentId]);

  useEffect(() => {
    if (
      targetIndex >= 0 ||
      feedView !== "network" ||
      !referralCode ||
      targetFallbackStatus === "loading" ||
      targetFallbackStatus === "ready"
    ) {
      return;
    }

    let cancelled = false;
    setTargetFallbackStatus("loading");

    async function loadTargetItem() {
      try {
        const response = await fetch(
          `/api/content/feed?${new URLSearchParams({
            contentId,
            locale,
            referralCode: referralCode ?? "",
          }).toString()}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as
          | ContentFeedLoadResponse
          | { error?: string };

        if (!response.ok || !("items" in data)) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : contentCopy.messages.feedLoadFailed,
          );
        }

        if (cancelled) {
          return;
        }

        const [targetItem] = data.items;

        if (!targetItem) {
          setTargetFallbackStatus("failed");
          return;
        }

        initialTargetItemRef.current = targetItem;
        setState((current) => ({
          ...current,
          error: null,
          items: prioritizeItem(
            mergeItems([targetItem], current.items),
            contentId,
          ),
          status: "ready",
        }));
        setTargetFallbackStatus("ready");
      } catch {
        if (!cancelled) {
          setTargetFallbackStatus("failed");
        }
      }
    }

    void loadTargetItem();

    return () => {
      cancelled = true;
    };
  }, [
    contentCopy.messages.feedLoadFailed,
    contentId,
    feedView,
    locale,
    referralCode,
    targetFallbackStatus,
    targetIndex,
  ]);

  useEffect(() => {
    if (targetIndex < 0 || alignedContentIdRef.current === contentId) {
      return;
    }

    alignedContentIdRef.current = contentId;
    activeIndexRef.current = targetIndex;
    setActiveIndex(targetIndex);

    window.requestAnimationFrame(() => {
      const node = scrollRef.current;

      if (!node) {
        return;
      }

      node.scrollTo({
        behavior: "auto",
        top: node.clientHeight * targetIndex,
      });
    });
  }, [contentId, targetIndex]);

  useEffect(() => {
    if (
      targetIndex >= 0 ||
      state.status !== "ready" ||
      !nextCursor ||
      isLoadingMore ||
      targetSearchAttempts >= 4
    ) {
      return;
    }

    setTargetSearchAttempts((current) => current + 1);
    void loadFeed({ append: true, cursor: nextCursor });
  }, [
    isLoadingMore,
    loadFeed,
    nextCursor,
    state.status,
    targetIndex,
    targetSearchAttempts,
  ]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 2200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [toast]);

  useEffect(() => {
    if (
      !activeContentId ||
      isPublicReferralFeed ||
      !accountAddress ||
      isPrivateFeedConnectionResolving ||
      detailStatusByContentIdRef.current[activeContentId]
    ) {
      return;
    }

    let cancelled = false;
    const detailStatusByContentId = detailStatusByContentIdRef.current;
    detailStatusByContentId[activeContentId] = "loading";

    setDetailByContentId((current) => ({
      ...current,
      [activeContentId]: {
        content: null,
        error: null,
        gateReason: null,
        status: "loading",
      },
    }));

    async function loadDetail() {
      try {
        const email =
          memberSessionEmail ??
          (await getThirdwebUserEmail({ client: thirdwebClient }));

        if (!email) {
          throw new Error(dictionary.member.errors.missingEmail);
        }

        const response = await fetch(
          `/api/content/posts/${encodeURIComponent(activeContentId)}?${new URLSearchParams({
            email,
            locale,
            walletAddress: accountAddress ?? "",
          }).toString()}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as
          | ContentDetailLoadResponse
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : contentCopy.messages.detailLoadFailed,
          );
        }

        if (cancelled) {
          return;
        }

        detailStatusByContentId[activeContentId] = "ready";

        const member = "member" in data ? data.member : null;

        if (member && accountAddress) {
          updateMemberSession({
            email: member.email,
            member,
            walletAddress: accountAddress,
          });
        }

        if ("social" in data && data.social) {
          updateItemSocial(activeContentId, data.social);
        }

        setDetailByContentId((current) => ({
          ...current,
          [activeContentId]: {
            content: "content" in data ? data.content : null,
            error: null,
            gateReason: "gateReason" in data ? data.gateReason : null,
            status: "ready",
          },
        }));
      } catch (error) {
        if (cancelled) {
          return;
        }

        detailStatusByContentId[activeContentId] = "error";

        setDetailByContentId((current) => ({
          ...current,
          [activeContentId]: {
            content: null,
            error:
              error instanceof Error
                ? error.message
                : contentCopy.messages.detailLoadFailed,
            gateReason: null,
            status: "error",
          },
        }));
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;

      if (detailStatusByContentId[activeContentId] === "loading") {
        delete detailStatusByContentId[activeContentId];
      }
    };
  }, [
    accountAddress,
    activeContentId,
    contentCopy.messages.detailLoadFailed,
    dictionary.member.errors.missingEmail,
    isPrivateFeedConnectionResolving,
    isPublicReferralFeed,
    locale,
    memberSessionEmail,
    updateItemSocial,
    updateMemberSession,
  ]);

  const handleScroll = useCallback(() => {
    const node = scrollRef.current;

    if (!node || node.clientHeight <= 0) {
      return;
    }

    const nextIndex = Math.min(
      Math.max(0, Math.round(node.scrollTop / node.clientHeight)),
      Math.max(0, state.items.length - 1),
    );

    if (nextIndex !== activeIndexRef.current) {
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
    }

    const remaining = node.scrollHeight - node.scrollTop - node.clientHeight;

    if (remaining < node.clientHeight * 1.25 && nextCursor && !isLoadingMore) {
      void loadFeed({ append: true, cursor: nextCursor });
    }
  }, [isLoadingMore, loadFeed, nextCursor, state.items.length]);

  const scrollToIndex = useCallback((nextIndex: number) => {
    const node = scrollRef.current;

    if (!node) {
      return;
    }

    const boundedIndex = Math.min(
      Math.max(0, nextIndex),
      Math.max(0, state.items.length - 1),
    );

    node.scrollTo({
      behavior: "smooth",
      top: node.clientHeight * boundedIndex,
    });
  }, [state.items.length]);

  const updateSocialAction = useCallback(
    async (
      item: ContentFeedItemRecord,
      action: "like" | "save",
      value: boolean,
      rollback: ContentSocialSummaryRecord,
    ) => {
      if (!accountAddress) {
        updateItemSocial(item.contentId, rollback);
        setToast(
          locale === "ko"
            ? "로그인 후 사용할 수 있습니다."
            : "Sign in to use this action.",
        );
        return;
      }

      try {
        const email =
          memberSessionEmail ??
          (await getThirdwebUserEmail({ client: thirdwebClient }));

        if (!email) {
          throw new Error(dictionary.member.errors.missingEmail);
        }

        const response = await fetch(
          `/api/content/posts/${encodeURIComponent(item.contentId)}/social`,
          {
            body: JSON.stringify({
              action,
              email,
              value,
              walletAddress: accountAddress,
            }),
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST",
          },
        );
        const data = (await response.json()) as
          | ContentSocialResponse
          | { error?: string };

        if (!response.ok || !("social" in data)) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : contentCopy.messages.shareFailed,
          );
        }

        updateItemSocial(item.contentId, data.social);
      } catch (error) {
        updateItemSocial(item.contentId, rollback);
        setToast(
          error instanceof Error ? error.message : contentCopy.messages.shareFailed,
        );
      }
    },
    [
      accountAddress,
      contentCopy.messages.shareFailed,
      dictionary.member.errors.missingEmail,
      locale,
      memberSessionEmail,
      updateItemSocial,
    ],
  );

  const toggleLike = useCallback(
    (item: ContentFeedItemRecord) => {
      const previous = item.social;
      const nextLiked = !previous.likedByViewer;
      const nextSocial = {
        ...previous,
        likedByViewer: nextLiked,
        likeCount: Math.max(0, previous.likeCount + (nextLiked ? 1 : -1)),
      };

      updateItemSocial(item.contentId, nextSocial);
      void updateSocialAction(item, "like", nextLiked, previous);
    },
    [updateItemSocial, updateSocialAction],
  );

  const toggleSave = useCallback(
    (item: ContentFeedItemRecord) => {
      const previous = item.social;
      const nextSaved = !previous.savedByViewer;
      const nextSocial = {
        ...previous,
        savedByViewer: nextSaved,
        saveCount: Math.max(0, previous.saveCount + (nextSaved ? 1 : -1)),
      };

      updateItemSocial(item.contentId, nextSocial);
      void updateSocialAction(item, "save", nextSaved, previous);
    },
    [updateItemSocial, updateSocialAction],
  );

  const shareItem = useCallback(
    async (item: ContentFeedItemRecord) => {
      if (typeof window === "undefined") {
        return;
      }

      const nextShareId = createShareId("feeddetail");
      const bridgeHref = buildPathWithReferral(
        `/${locale}/content/bridge/${item.contentId}`,
        referralCode,
      );
      const nextShareUrl = new URL(
        setShareIdOnHref(bridgeHref, nextShareId),
        window.location.origin,
      ).toString();

      trackFunnelEvent("share_click", {
        contentId: item.contentId,
        metadata: {
          priceType: item.priceType,
          source: "network-feed-detail",
        },
        referralCode,
        shareId: nextShareId,
        targetHref: nextShareUrl,
      });

      if (typeof navigator.share === "function") {
        try {
          await navigator.share({
            text: item.summary,
            title: item.title,
            url: nextShareUrl,
          });
          return;
        } catch (error) {
          if (
            typeof error === "object" &&
            error !== null &&
            "name" in error &&
            error.name === "AbortError"
          ) {
            return;
          }
        }
      }

      try {
        await navigator.clipboard.writeText(nextShareUrl);
        setToast(contentCopy.actions.copiedLink);
      } catch {
        setToast(contentCopy.messages.shareFailed);
      }
    },
    [
      contentCopy.actions.copiedLink,
      contentCopy.messages.shareFailed,
      locale,
      referralCode,
    ],
  );

  const refreshFeed = useCallback(() => {
    void loadFeed();
  }, [loadFeed]);

  const isInitialLoading =
    state.status === "loading" && state.items.length === 0 && !state.error;
  const hasRenderableItems = state.items.length > 0;
  const showConnectionMessage =
    !isPublicReferralFeed &&
    !isFeedModeResolving &&
    !isPrivateFeedConnectionResolving &&
    isDisconnected &&
    state.items.length === 0;

  if (
    (isFeedModeResolving ||
      isPrivateFeedConnectionResolving ||
      isInitialLoading) &&
    !hasRenderableItems
  ) {
    return (
      <DetailStatusScreen backHref={backHref} contentCopy={contentCopy}>
        <LoaderCircle className="size-6 animate-spin" />
        <div>
          <p className="text-sm font-semibold">
            {locale === "ko" ? "네트워크 콘텐츠 확인 중" : "Checking network content"}
          </p>
          <p className="mt-1 text-xs text-white/62">
            {contentCopy.messages.detailLoadingDescription}
          </p>
        </div>
      </DetailStatusScreen>
    );
  }

  if (showConnectionMessage) {
    return (
      <DetailStatusScreen backHref={backHref} contentCopy={contentCopy}>
        <p className="text-sm font-semibold">{contentCopy.messages.connectRequired}</p>
      </DetailStatusScreen>
    );
  }

  if (state.error && state.items.length === 0) {
    return (
      <DetailStatusScreen backHref={backHref} contentCopy={contentCopy}>
        <p className="text-sm font-semibold">{state.error}</p>
        <button
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/16"
          onClick={refreshFeed}
          type="button"
        >
          <RefreshCcw className="size-4" />
          {contentCopy.actions.refresh}
        </button>
      </DetailStatusScreen>
    );
  }

  if (state.items.length === 0) {
    return (
      <DetailStatusScreen backHref={backHref} contentCopy={contentCopy}>
        <p className="text-sm font-semibold">{contentCopy.labels.feedEmpty}</p>
      </DetailStatusScreen>
    );
  }

  if (targetIndex < 0) {
    const isSearchingTarget =
      targetFallbackStatus === "loading" ||
      isLoadingMore ||
      (Boolean(nextCursor) && targetSearchAttempts < 4);

    return (
      <DetailStatusScreen backHref={backHref} contentCopy={contentCopy}>
        {isSearchingTarget ? <LoaderCircle className="size-6 animate-spin" /> : null}
        <div>
          <p className="text-sm font-semibold">
            {isSearchingTarget
              ? locale === "ko"
                ? "선택한 콘텐츠 확인 중"
                : "Finding selected content"
              : locale === "ko"
                ? "피드에서 콘텐츠를 찾을 수 없습니다."
                : "This post is not available in the feed."}
          </p>
          {!isSearchingTarget ? (
            <Link
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/16"
              href={feedHref}
            >
              <ArrowLeft className="size-3.5" />
              {contentCopy.actions.browseFeed}
            </Link>
          ) : null}
        </div>
      </DetailStatusScreen>
    );
  }

  return (
    <main className="h-[100dvh] overflow-hidden bg-slate-950 text-white">
      <div className="relative mx-auto h-full w-full max-w-[560px] overflow-hidden bg-slate-950 shadow-2xl sm:border-x sm:border-white/10">
        <header className="pointer-events-none fixed inset-x-0 top-0 z-40 mx-auto flex max-w-[560px] items-center justify-between gap-3 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <Link
            aria-label={contentCopy.actions.backHome}
            className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full bg-black/42 text-white shadow-[0_12px_26px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-black/58"
            href={backHref}
          >
            <ArrowLeft className="size-5" />
            <span className="sr-only">{contentCopy.actions.backHome}</span>
          </Link>
          <div className="min-w-0 flex-1 text-center drop-shadow">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/62">
              {contentCopy.page.detailEyebrow}
            </p>
            <h1 className="truncate text-sm font-semibold leading-5 text-white">
              {contentCopy.meta.feedTitle}
            </h1>
          </div>
          <button
            aria-label={contentCopy.actions.refresh}
            className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full bg-black/42 text-white shadow-[0_12px_26px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-black/58"
            onClick={refreshFeed}
            type="button"
          >
            <RefreshCcw className="size-5" />
          </button>
        </header>

        <div
          className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth"
          onScroll={handleScroll}
          ref={scrollRef}
        >
          {state.items.map((item, index) => {
            const detailState = detailByContentId[item.contentId] ?? null;
            const networkDetailHref = buildNetworkDetailHref(item.contentId);
            const fullContentHref = setPathSearchParams(
              buildPathWithReferral(`/${locale}/content/${item.contentId}`, referralCode),
              {
                returnTo: networkDetailHref,
                shareId,
              },
            );

            return (
              <NetworkFeedDetailSlide
                active={index === activeIndex}
                contentCopy={contentCopy}
                detailState={detailState}
                fullContentHref={fullContentHref}
                item={item}
                key={item.contentId}
                locale={locale}
                onLike={() => toggleLike(item)}
                onNext={() => scrollToIndex(index + 1)}
                onPrevious={() => scrollToIndex(index - 1)}
                onSave={() => toggleSave(item)}
                onShare={() => {
                  void shareItem(item);
                }}
                priority={index === targetIndex || index < 2}
                showNext={index < state.items.length - 1}
                showPrevious={index > 0}
              />
            );
          })}

          {isLoadingMore ? (
            <div className="flex min-h-[35dvh] snap-start items-center justify-center text-white/70">
              <LoaderCircle className="size-6 animate-spin" />
            </div>
          ) : null}
        </div>

        {toast ? (
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-50 mx-auto flex max-w-[560px] justify-center px-4">
            <div className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-950 shadow-2xl">
              {toast}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function DetailStatusScreen({
  backHref,
  children,
  contentCopy,
}: {
  backHref: string;
  children: React.ReactNode;
  contentCopy: ContentCopy;
}) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-slate-950 px-5 text-white">
      <Link
        aria-label={contentCopy.actions.backHome}
        className="fixed left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/16"
        href={backHref}
      >
        <ArrowLeft className="size-5" />
        <span className="sr-only">{contentCopy.actions.backHome}</span>
      </Link>
      <div className="flex max-w-sm items-center gap-3 rounded-lg border border-white/12 bg-white/8 px-4 py-4 shadow-2xl backdrop-blur-xl">
        {children}
      </div>
    </main>
  );
}

function NetworkFeedDetailSlide({
  active,
  contentCopy,
  detailState,
  fullContentHref,
  item,
  locale,
  onLike,
  onNext,
  onPrevious,
  onSave,
  onShare,
  priority,
  showNext,
  showPrevious,
}: {
  active: boolean;
  contentCopy: ContentCopy;
  detailState: DetailLoadState | null;
  fullContentHref: string;
  item: ContentFeedItemRecord;
  locale: Locale;
  onLike: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSave: () => void;
  onShare: () => void;
  priority: boolean;
  showNext: boolean;
  showPrevious: boolean;
}) {
  const imageUrl = resolveFeedPreviewImage(item);
  const displayName = getDisplayName(item);
  const avatarFallback = getAvatarFallback(displayName);
  const detailBody = detailState?.content?.body?.trim();
  const bodyPreview = truncateText(
    detailBody || item.previewText?.trim() || item.summary,
    520,
  );
  const isPaid = item.priceType === "paid";
  const accessLabel = isPaid
    ? locale === "ko"
      ? `${item.priceUsdt ?? "1"} USDT`
      : `${item.priceUsdt ?? "1"} USDT`
    : contentCopy.labels.free;
  const gateLabel =
    detailState?.gateReason === "paid"
      ? locale === "ko"
        ? "결제 후 전체 본문 열람"
        : "Unlock to read the full post"
      : detailState?.gateReason === "network"
        ? locale === "ko"
          ? "네트워크 권한 필요"
          : "Network access required"
        : detailState?.gateReason === "signup"
          ? contentCopy.messages.paymentRequired
          : null;
  const dateLabel = formatDate(item.publishedAt ?? item.createdAt, locale);

  return (
    <article className="relative flex min-h-[100dvh] snap-start snap-always items-end overflow-hidden bg-slate-950">
      <div className="absolute inset-0">
        {imageUrl ? (
          <Image
            alt=""
            className={cn(
              "object-cover transition duration-500",
              active ? "scale-100 opacity-100" : "scale-[1.02] opacity-82",
            )}
            fill
            priority={priority}
            sizes={DETAIL_IMAGE_SIZES}
            src={imageUrl}
          />
        ) : (
          <div className="size-full bg-[radial-gradient(circle_at_28%_20%,rgba(56,189,248,0.32),transparent_30%),linear-gradient(145deg,#020617,#111827_45%,#0f172a)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/62 via-black/10 to-black/92" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/76 to-transparent" />
      </div>

      <div className="absolute right-3 top-[calc(env(safe-area-inset-top)+4.4rem)] z-20 hidden flex-col gap-2 sm:flex">
        <button
          aria-label={contentCopy.actions.previousPage}
          className="inline-flex size-10 items-center justify-center rounded-full bg-black/38 text-white backdrop-blur transition hover:bg-black/58 disabled:opacity-35"
          disabled={!showPrevious}
          onClick={onPrevious}
          type="button"
        >
          <ChevronUp className="size-5" />
        </button>
        <button
          aria-label={contentCopy.actions.nextPage}
          className="inline-flex size-10 items-center justify-center rounded-full bg-black/38 text-white backdrop-blur transition hover:bg-black/58 disabled:opacity-35"
          disabled={!showNext}
          onClick={onNext}
          type="button"
        >
          <ChevronDown className="size-5" />
        </button>
      </div>

      <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+6.1rem)] right-3 z-20 flex w-12 flex-col items-center gap-4">
        <DetailActionButton
          active={item.social.likedByViewer}
          count={item.social.likeCount}
          icon={<Heart className="size-5" fill={item.social.likedByViewer ? "currentColor" : "none"} />}
          label={item.social.likedByViewer ? contentCopy.actions.liked : contentCopy.actions.like}
          locale={locale}
          onClick={onLike}
        />
        <DetailActionButton
          active={item.social.savedByViewer}
          count={item.social.saveCount}
          icon={<Bookmark className="size-5" fill={item.social.savedByViewer ? "currentColor" : "none"} />}
          label={
            item.social.savedByViewer
              ? locale === "ko"
                ? "저장됨"
                : "Saved"
              : locale === "ko"
                ? "저장"
                : "Save"
          }
          locale={locale}
          onClick={onSave}
        />
        <Link
          aria-label={locale === "ko" ? "댓글 보기" : "View comments"}
          className="flex flex-col items-center gap-1 text-white drop-shadow"
          href={fullContentHref}
        >
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-black/38 backdrop-blur transition hover:bg-black/58">
            <MessageCircle className="size-5" />
          </span>
          <span className="text-[0.65rem] font-semibold">
            {formatCompactCount(item.social.commentCount, locale)}
          </span>
        </Link>
        <button
          aria-label={contentCopy.actions.share}
          className="flex flex-col items-center gap-1 text-white drop-shadow"
          onClick={onShare}
          type="button"
        >
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-black/38 backdrop-blur transition hover:bg-black/58">
            <Share2 className="size-5" />
          </span>
          <span className="text-[0.65rem] font-semibold">{contentCopy.actions.share}</span>
        </button>
      </div>

      <div className="relative z-10 w-full px-4 pb-[calc(env(safe-area-inset-bottom)+1.1rem)] pt-28">
        <div className="max-w-[calc(100%-4rem)] pb-2">
          <div className="flex min-w-0 items-center gap-2">
            {item.authorProfile?.avatarImageUrl ? (
              <Image
                alt=""
                className="size-9 rounded-full border border-white/30 object-cover"
                height={36}
                src={item.authorProfile.avatarImageUrl}
                width={36}
              />
            ) : (
              <span className="inline-flex size-9 items-center justify-center rounded-full border border-white/20 bg-white/14 text-sm font-semibold">
                {avatarFallback}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{displayName}</p>
              <p className="truncate text-[0.68rem] font-medium text-white/62">
                {[accessLabel, dateLabel].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>

          <h2 className="mt-4 text-[1.65rem] font-semibold leading-[1.08] tracking-normal text-white sm:text-[1.9rem]">
            {item.title}
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm font-medium leading-6 text-white/86">
            {bodyPreview}
          </p>

          {detailState?.status === "loading" ? (
            <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-white/58">
              <LoaderCircle className="size-3.5 animate-spin" />
              {locale === "ko" ? "회원 권한 확인 중" : "Checking member access"}
            </p>
          ) : null}

          {detailState?.error ? (
            <p className="mt-3 text-xs font-semibold text-rose-200">
              {detailState.error}
            </p>
          ) : gateLabel ? (
            <p className="mt-3 text-xs font-semibold text-amber-100">{gateLabel}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/18 bg-white/12 px-4 py-2 text-sm font-semibold text-white shadow-xl backdrop-blur transition hover:bg-white/18"
              href={fullContentHref}
            >
              <ExternalLink className="size-4" />
              {contentCopy.actions.viewDetail}
            </Link>
            {item.networkLevel !== null ? (
              <span className="inline-flex min-h-10 items-center rounded-full border border-white/18 bg-white/10 px-3 py-2 text-xs font-semibold text-white/82 backdrop-blur">
                {contentCopy.labels.level} {item.networkLevel}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function DetailActionButton({
  active,
  count,
  icon,
  label,
  locale,
  onClick,
}: {
  active: boolean;
  count: number;
  icon: React.ReactNode;
  label: string;
  locale: Locale;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "flex flex-col items-center gap-1 text-white drop-shadow transition",
        active && "text-rose-200",
      )}
      onClick={onClick}
      type="button"
    >
      <span className="inline-flex size-11 items-center justify-center rounded-full bg-black/38 backdrop-blur transition hover:bg-black/58">
        {icon}
      </span>
      <span className="text-[0.65rem] font-semibold">
        {formatCompactCount(count, locale)}
      </span>
    </button>
  );
}
