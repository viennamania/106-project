"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Film,
  FileText,
  Heart,
  Images,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  RefreshCcw,
  Share2,
  X,
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

const FEED_RESTORE_VERSION = 9;
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

function getReadableBodyText(
  item: ContentFeedItemRecord,
  detailState: DetailLoadState | null,
) {
  return detailState?.content?.body?.trim() || item.previewText?.trim() || item.summary;
}

function getReadableContentImages(
  item: ContentFeedItemRecord,
  detailState: DetailLoadState | null,
) {
  const detailImages = detailState?.content?.contentImageUrls ?? [];

  return detailImages.length > 0 ? detailImages : item.contentImageUrls;
}

function getReadableContentImageCount(
  item: ContentFeedItemRecord,
  detailState: DetailLoadState | null,
) {
  return (
    detailState?.content?.contentImageCount ??
    item.contentImageCount ??
    getReadableContentImages(item, detailState).length
  );
}

function getReadableContentVideos(
  item: ContentFeedItemRecord,
  detailState: DetailLoadState | null,
) {
  const detailVideos = detailState?.content?.contentVideoUrls ?? [];

  return detailVideos.length > 0 ? detailVideos : item.contentVideoUrls ?? [];
}

function getReadableContentVideoCount(
  item: ContentFeedItemRecord,
  detailState: DetailLoadState | null,
) {
  return (
    detailState?.content?.contentVideoCount ??
    item.contentVideoCount ??
    getReadableContentVideos(item, detailState).length
  );
}

function canViewContentMedia(
  item: ContentFeedItemRecord,
  detailState: DetailLoadState | null,
) {
  return item.canAccess || Boolean(detailState?.content?.canAccess);
}

function LockedContentMediaPlaceholder({
  imageCount,
  locale,
  priceLabel,
}: {
  imageCount: number;
  locale: Locale;
  priceLabel: string;
}) {
  const mediaCountLabel =
    locale === "ko"
      ? `${imageCount.toLocaleString(locale)}개`
      : `${imageCount.toLocaleString(locale)} media items`;

  return (
    <div className="relative size-full overflow-hidden bg-[radial-gradient(circle_at_50%_30%,rgba(148,163,184,0.22),transparent_34%),linear-gradient(145deg,#020617,#0f172a_48%,#111827)]">
      <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="absolute inset-x-6 top-[22%] flex flex-col items-center text-center text-white">
        <span className="inline-flex size-16 items-center justify-center rounded-full border border-white/14 bg-white/10 shadow-[0_24px_80px_rgba(15,23,42,0.5)] backdrop-blur-md">
          <LockKeyhole className="size-7" />
        </span>
        <p className="mt-4 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/55">
          {locale === "ko" ? "잠긴 콘텐츠 미디어" : "Locked content media"}
        </p>
        <p className="mt-2 text-lg font-semibold tracking-normal text-white">
          {locale === "ko"
            ? `콘텐츠 미디어 ${mediaCountLabel}`
            : mediaCountLabel}
        </p>
        <p className="mt-1 text-sm font-medium text-white/64">
          {locale === "ko"
            ? `${priceLabel} 결제 후 열람`
            : `Unlock with ${priceLabel}`}
        </p>
      </div>
    </div>
  );
}

function getFullContentActionLabel(
  item: ContentFeedItemRecord,
  detailState: DetailLoadState | null,
  locale: Locale,
) {
  if (
    detailState?.gateReason === "paid" ||
    (item.priceType === "paid" && !canViewContentMedia(item, detailState))
  ) {
    return locale === "ko" ? "결제하고 전체 보기" : "Pay and view full post";
  }

  if (detailState?.gateReason === "network") {
    return locale === "ko" ? "권한 확인하기" : "Verify access";
  }

  if (detailState?.gateReason === "signup") {
    return locale === "ko" ? "가입 완료하고 보기" : "Complete signup to view";
  }

  return locale === "ko" ? "댓글 보기" : "View comments";
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
  const [bodySheetContentId, setBodySheetContentId] = useState<string | null>(null);
  const [galleryContentId, setGalleryContentId] = useState<string | null>(null);
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
  const buildFullContentHref = useCallback(
    (nextContentId: string) => {
      const networkDetailHref = buildNetworkDetailHref(nextContentId);

      return setPathSearchParams(
        buildPathWithReferral(`/${locale}/content/${nextContentId}`, referralCode),
        {
          returnTo: networkDetailHref,
          shareId,
        },
      );
    },
    [buildNetworkDetailHref, locale, referralCode, shareId],
  );
  const bodySheetItem = useMemo(
    () =>
      bodySheetContentId
        ? state.items.find((item) => item.contentId === bodySheetContentId) ?? null
        : null,
    [bodySheetContentId, state.items],
  );
  const bodySheetFullContentHref = useMemo(() => {
    if (!bodySheetItem) {
      return null;
    }

    return buildFullContentHref(bodySheetItem.contentId);
  }, [bodySheetItem, buildFullContentHref]);
  const galleryItem = useMemo(
    () =>
      galleryContentId
        ? state.items.find((item) => item.contentId === galleryContentId) ?? null
        : null,
    [galleryContentId, state.items],
  );
  const galleryFullContentHref = useMemo(() => {
    if (!galleryItem) {
      return null;
    }

    return buildFullContentHref(galleryItem.contentId);
  }, [buildFullContentHref, galleryItem]);

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
      bodySheetContentId &&
      !state.items.some((item) => item.contentId === bodySheetContentId)
    ) {
      setBodySheetContentId(null);
    }
  }, [bodySheetContentId, state.items]);

  useEffect(() => {
    if (
      galleryContentId &&
      !state.items.some((item) => item.contentId === galleryContentId)
    ) {
      setGalleryContentId(null);
    }
  }, [galleryContentId, state.items]);

  useEffect(() => {
    if (!bodySheetContentId && !galleryContentId) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (galleryContentId) {
          setGalleryContentId(null);
          return;
        }

        setBodySheetContentId(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [bodySheetContentId, galleryContentId]);

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
            const fullContentHref = buildFullContentHref(item.contentId);

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
                onOpenGallery={() => {
                  setBodySheetContentId(null);
                  setGalleryContentId(item.contentId);
                }}
                onOpenBody={() => {
                  setBodySheetContentId(item.contentId);
                }}
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

        {galleryItem && galleryFullContentHref ? (
          <NetworkFeedMediaViewer
            detailState={detailByContentId[galleryItem.contentId] ?? null}
            fullContentHref={galleryFullContentHref}
            item={galleryItem}
            key={galleryItem.contentId}
            locale={locale}
            onClose={() => {
              setGalleryContentId(null);
            }}
          />
        ) : null}

        {bodySheetItem && bodySheetFullContentHref ? (
          <NetworkFeedBodySheet
            contentCopy={contentCopy}
            detailState={detailByContentId[bodySheetItem.contentId] ?? null}
            fullContentHref={bodySheetFullContentHref}
            item={bodySheetItem}
            locale={locale}
            onClose={() => {
              setBodySheetContentId(null);
            }}
          />
        ) : null}

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
  onOpenGallery,
  onOpenBody,
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
  onOpenGallery: () => void;
  onOpenBody: () => void;
  onPrevious: () => void;
  onSave: () => void;
  onShare: () => void;
  priority: boolean;
  showNext: boolean;
  showPrevious: boolean;
}) {
  const imageUrl = resolveFeedPreviewImage(item);
  const videoUrl = getReadableContentVideos(item, detailState)[0] ?? null;
  const displayName = getDisplayName(item);
  const avatarFallback = getAvatarFallback(displayName);
  const bodyPreview = truncateText(getReadableBodyText(item, detailState), 260);
  const contentImageCount = getReadableContentImageCount(item, detailState);
  const contentVideoCount = getReadableContentVideoCount(item, detailState);
  const contentMediaCount = contentImageCount + contentVideoCount;
  const mediaActionLabel =
    contentVideoCount > 0 && contentImageCount > 0
      ? locale === "ko"
        ? "미디어 보기"
        : "View media"
      : contentVideoCount > 0
        ? locale === "ko"
          ? "동영상 보기"
          : "View video"
        : locale === "ko"
          ? "이미지 보기"
          : "View images";
  const isPaid = item.priceType === "paid";
  const showLockedMediaPlaceholder =
    !imageUrl &&
    !videoUrl &&
    isPaid &&
    contentMediaCount > 0 &&
    !canViewContentMedia(item, detailState);
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
        ) : videoUrl ? (
          <div className="relative size-full bg-slate-950">
            <video
              autoPlay
              className={cn(
                "h-full w-full object-cover transition duration-500",
                active ? "scale-100 opacity-100" : "scale-[1.02] opacity-82",
              )}
              loop
              muted
              playsInline
              preload="metadata"
              src={videoUrl}
            />
            <div className="absolute left-4 top-[calc(env(safe-area-inset-top)+6.2rem)] inline-flex items-center gap-2 rounded-full bg-black/42 px-3 py-2 text-xs font-semibold text-white shadow-[0_12px_26px_rgba(0,0,0,0.28)] backdrop-blur-xl">
              <Film className="size-3.5" />
              {locale === "ko" ? "동영상 콘텐츠" : "Video content"}
            </div>
          </div>
        ) : showLockedMediaPlaceholder ? (
          <LockedContentMediaPlaceholder
            imageCount={contentMediaCount}
            locale={locale}
            priceLabel={accessLabel}
          />
        ) : (
          <div className="size-full bg-[radial-gradient(circle_at_28%_20%,rgba(56,189,248,0.32),transparent_30%),linear-gradient(145deg,#020617,#111827_45%,#0f172a)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/36 via-black/0 to-black/50" />
        <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-black/86 via-black/38 to-transparent" />
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

          <h2 className="mt-4 text-[1.42rem] font-semibold leading-[1.1] tracking-normal text-white sm:text-[1.9rem]">
            {item.title}
          </h2>
          <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm font-medium leading-6 text-white/86">
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
            {contentMediaCount > 0 ? (
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/18 bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-xl transition hover:bg-white/92"
                onClick={onOpenGallery}
                type="button"
              >
                {contentVideoCount > 0 ? (
                  <Film className="size-4" />
                ) : (
                  <Images className="size-4" />
                )}
                {mediaActionLabel}
                {contentMediaCount > 1 ? (
                  <span className="rounded-full bg-slate-950/10 px-1.5 py-0.5 text-[0.65rem]">
                    {contentMediaCount}
                  </span>
                ) : null}
              </button>
            ) : null}
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/18 bg-white/12 px-4 py-2 text-sm font-semibold text-white shadow-xl backdrop-blur transition hover:bg-white/18"
              onClick={onOpenBody}
              type="button"
            >
              <FileText className="size-4" />
              {locale === "ko" ? "본문 보기" : "Read post"}
            </button>
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

function NetworkFeedMediaViewer({
  detailState,
  fullContentHref,
  item,
  locale,
  onClose,
}: {
  detailState: DetailLoadState | null;
  fullContentHref: string;
  item: ContentFeedItemRecord;
  locale: Locale;
  onClose: () => void;
}) {
  const images = useMemo(
    () => getReadableContentImages(item, detailState),
    [detailState, item],
  );
  const videos = useMemo(
    () => getReadableContentVideos(item, detailState),
    [detailState, item],
  );
  const imageCount = getReadableContentImageCount(item, detailState);
  const videoCount = getReadableContentVideoCount(item, detailState);
  const mediaCount = imageCount + videoCount;
  const hasImages = imageCount > 0;
  const hasVideos = videoCount > 0;
  const canViewMedia = canViewContentMedia(item, detailState);
  const displayName = getDisplayName(item);
  const previewImageUrl = item.coverImageUrl ?? images[0] ?? null;
  const displayMedia = useMemo(
    () => {
      if (!canViewMedia) {
        return previewImageUrl
          ? [{ kind: "image" as const, url: previewImageUrl }]
          : [];
      }

      return [
        ...images.map((url) => ({ kind: "image" as const, url })),
        ...videos.map((url) => ({ kind: "video" as const, url })),
      ];
    },
    [canViewMedia, images, previewImageUrl, videos],
  );
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const boundedActiveIndex = Math.max(
    0,
    Math.min(activeIndex, Math.max(0, displayMedia.length - 1)),
  );
  const isPaid = item.priceType === "paid";
  const mediaTypeLabel =
    hasVideos && hasImages
      ? locale === "ko"
        ? "콘텐츠 미디어"
        : "content media"
      : hasVideos
        ? locale === "ko"
          ? "콘텐츠 동영상"
          : "content video"
        : locale === "ko"
          ? "콘텐츠 이미지"
          : "content images";
  const lockedMediaNoun =
    hasVideos && hasImages
      ? locale === "ko"
        ? "미디어"
        : "media"
      : hasVideos
        ? locale === "ko"
          ? "동영상"
          : "video"
        : locale === "ko"
          ? "이미지"
          : "images";
  const mediaCountLabel =
    locale === "ko"
      ? hasVideos
        ? `${mediaCount.toLocaleString(locale)}개`
        : `${imageCount.toLocaleString(locale)}장`
      : hasVideos && hasImages
        ? `${mediaCount.toLocaleString(locale)} media items`
        : hasVideos
          ? `${videoCount.toLocaleString(locale)} ${videoCount === 1 ? "video" : "videos"}`
          : `${imageCount.toLocaleString(locale)} ${imageCount === 1 ? "image" : "images"}`;
  const lockedTitle = isPaid
    ? locale === "ko"
      ? `결제 후 ${lockedMediaNoun} 열람`
      : `Unlock ${lockedMediaNoun}`
    : locale === "ko"
      ? `권한 확인 후 ${lockedMediaNoun} 열람`
      : `Verify access to view ${lockedMediaNoun}`;
  const lockedDescription = isPaid
    ? locale === "ko"
      ? `${item.priceUsdt ?? "1"} USDT 결제 후 ${mediaTypeLabel} ${mediaCountLabel}을 바로 볼 수 있습니다.`
      : `Pay ${item.priceUsdt ?? "1"} USDT to view ${mediaCountLabel}.`
    : locale === "ko"
      ? `네트워크 권한을 확인하면 ${mediaTypeLabel}를 볼 수 있습니다.`
      : `Verify your network access to view this ${lockedMediaNoun}.`;
  const lockedActionLabel = isPaid
    ? locale === "ko"
      ? `결제하고 ${lockedMediaNoun} 보기`
      : `Pay and view ${lockedMediaNoun}`
    : locale === "ko"
      ? "권한 확인하기"
      : "Verify access";
  const closeLabel =
    hasVideos
      ? locale === "ko"
        ? "미디어 닫기"
        : "Close media"
      : locale === "ko"
        ? "이미지 닫기"
        : "Close images";
  const previousLabel =
    hasVideos
      ? locale === "ko"
        ? "이전 미디어"
        : "Previous media"
      : locale === "ko"
        ? "이전 이미지"
        : "Previous image";
  const nextLabel =
    hasVideos
      ? locale === "ko"
        ? "다음 미디어"
        : "Next media"
      : locale === "ko"
        ? "다음 이미지"
        : "Next image";

  useEffect(() => {
    trackRef.current?.scrollTo({ left: 0 });
  }, [displayMedia]);

  function scrollToIndex(nextIndex: number) {
    const track = trackRef.current;
    const clampedIndex = Math.max(
      0,
      Math.min(displayMedia.length - 1, nextIndex),
    );

    if (!track) {
      setActiveIndex(clampedIndex);
      return;
    }

    track.scrollTo({
      behavior: "smooth",
      left: track.clientWidth * clampedIndex,
    });
    setActiveIndex(clampedIndex);
  }

  if (mediaCount <= 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950 text-white">
      <div className="relative mx-auto flex h-full w-full max-w-[560px] flex-col overflow-hidden bg-slate-950 shadow-2xl sm:border-x sm:border-white/10">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-[linear-gradient(180deg,rgba(2,6,23,0.82),rgba(2,6,23,0))] px-3 pb-12 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <div className="flex items-center justify-between gap-3">
            <button
              aria-label={closeLabel}
              className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full bg-black/42 text-white shadow-[0_12px_26px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-black/58"
              onClick={onClose}
              type="button"
            >
              <X className="size-5" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/62">
                {mediaTypeLabel}
              </p>
              <p className="truncate text-sm font-semibold leading-5 text-white">
                {canViewMedia && displayMedia.length > 0
                  ? `${boundedActiveIndex + 1} / ${displayMedia.length}`
                  : mediaCountLabel}
              </p>
            </div>
            <Link
              aria-label={locale === "ko" ? "상세 페이지 열기" : "Open detail page"}
              className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full bg-black/42 !text-white shadow-[0_12px_26px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-black/58"
              href={fullContentHref}
            >
              <ExternalLink className="size-5 text-white" />
            </Link>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <div
            className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [touch-action:pan-x_pan-y] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
            onScroll={(event) => {
              const target = event.currentTarget;

              if (!target.clientWidth) {
                return;
              }

              const nextIndex = Math.round(target.scrollLeft / target.clientWidth);
              setActiveIndex(Math.max(0, Math.min(displayMedia.length - 1, nextIndex)));
            }}
            ref={trackRef}
          >
            {displayMedia.length > 0 ? (
              displayMedia.map((media, index) => (
                <div
                  className="flex h-full w-full shrink-0 snap-center items-center justify-center"
                  key={`${media.kind}-${media.url}-${index}`}
                >
                  {media.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={`${item.title} ${index + 1}`}
                      className={cn(
                        "max-h-full w-full select-none object-contain",
                        !canViewMedia
                          ? "scale-[1.04] blur-xl brightness-75 saturate-75"
                          : "",
                      )}
                      draggable={false}
                      loading={index === 0 ? "eager" : "lazy"}
                      src={media.url}
                    />
                  ) : (
                    <video
                      aria-label={`${item.title} ${index + 1}`}
                      className="max-h-full w-full bg-black object-contain"
                      controls
                      playsInline
                      preload="metadata"
                      src={media.url}
                    />
                  )}
                </div>
              ))
            ) : (
              <div className="flex h-full w-full shrink-0 snap-center items-center justify-center bg-[radial-gradient(circle_at_50%_42%,rgba(148,163,184,0.32),transparent_36%),linear-gradient(145deg,#020617,#0f172a_48%,#111827)]" />
            )}
          </div>

          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04)_0%,rgba(2,6,23,0)_24%,rgba(2,6,23,0.1)_62%,rgba(2,6,23,0.5)_100%)]" />

          {canViewMedia && displayMedia.length > 1 ? (
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between px-3 sm:flex">
              <button
                aria-label={previousLabel}
                className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-white/16 bg-slate-950/46 text-white backdrop-blur-md transition hover:bg-slate-950/64 disabled:opacity-35"
                disabled={boundedActiveIndex === 0}
                onClick={() => {
                  scrollToIndex(boundedActiveIndex - 1);
                }}
                type="button"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                aria-label={nextLabel}
                className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-white/16 bg-slate-950/46 text-white backdrop-blur-md transition hover:bg-slate-950/64 disabled:opacity-35"
                disabled={boundedActiveIndex === displayMedia.length - 1}
                onClick={() => {
                  scrollToIndex(boundedActiveIndex + 1);
                }}
                type="button"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          ) : null}

          {!canViewMedia ? (
            <div className="absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-20 rounded-lg border border-white/16 bg-slate-950/72 p-4 text-white shadow-[0_22px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl">
              <div className="flex items-start gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-950">
                  <LockKeyhole className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold leading-6">
                    {lockedTitle}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-white/72">
                    {lockedDescription}
                  </p>
                </div>
              </div>
              {detailState?.status === "loading" ? (
                <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-white/58">
                  <LoaderCircle className="size-3.5 animate-spin" />
                  {locale === "ko" ? "회원 권한 확인 중" : "Checking member access"}
                </p>
              ) : null}
              <Link
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold !text-slate-950 transition hover:bg-white/92"
                href={fullContentHref}
              >
                <ExternalLink className="size-4 shrink-0 text-slate-950" />
                <span className="truncate text-slate-950">{lockedActionLabel}</span>
              </Link>
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-16">
              <p className="line-clamp-2 text-sm font-semibold leading-5 text-white">
                {item.title}
              </p>
              <p className="mt-1 truncate text-xs font-medium text-white/64">
                {displayName}
              </p>
            </div>
          )}

          {canViewMedia && displayMedia.length > 1 ? (
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 z-30 flex justify-center px-4",
                canViewMedia
                  ? "bottom-[calc(env(safe-area-inset-bottom)+4.6rem)]"
                  : "bottom-[calc(env(safe-area-inset-bottom)+14.5rem)]",
              )}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/50 px-3 py-2 backdrop-blur-md">
                {displayMedia.map((media, index) => (
                  <span
                    className={cn(
                      "h-1.5 rounded-full transition",
                      index === boundedActiveIndex
                        ? "w-6 bg-white"
                        : "w-1.5 bg-white/45",
                    )}
                    key={`${media.kind}-${media.url}-detail-dot-${index}`}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function NetworkFeedBodySheet({
  contentCopy,
  detailState,
  fullContentHref,
  item,
  locale,
  onClose,
}: {
  contentCopy: ContentCopy;
  detailState: DetailLoadState | null;
  fullContentHref: string;
  item: ContentFeedItemRecord;
  locale: Locale;
  onClose: () => void;
}) {
  const displayName = getDisplayName(item);
  const avatarFallback = getAvatarFallback(displayName);
  const bodyText = getReadableBodyText(item, detailState);
  const actionLabel = getFullContentActionLabel(item, detailState, locale);
  const isPaid = item.priceType === "paid";
  const accessLabel = isPaid
    ? `${item.priceUsdt ?? "1"} USDT`
    : contentCopy.labels.free;
  const dateLabel = formatDate(item.publishedAt ?? item.createdAt, locale);
  const gateLabel =
    detailState?.gateReason === "paid"
      ? locale === "ko"
        ? "결제 후 전체 본문을 볼 수 있습니다."
        : "Unlock this post to read the full body."
      : detailState?.gateReason === "network"
        ? locale === "ko"
          ? "네트워크 권한이 필요합니다."
          : "Network access is required."
        : detailState?.gateReason === "signup"
          ? contentCopy.messages.paymentRequired
          : null;
  const titleId = `network-body-sheet-${item.contentId}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/54 px-0 sm:px-4"
      onClick={onClose}
    >
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="flex max-h-[82dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-lg bg-white text-slate-950 shadow-[0_-18px_60px_rgba(0,0,0,0.32)] sm:mb-4 sm:rounded-lg"
        onClick={(event) => {
          event.stopPropagation();
        }}
        role="dialog"
      >
        <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-slate-200" />
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {contentCopy.fields.body}
            </p>
            <h3
              className="mt-1 line-clamp-2 text-base font-semibold leading-6 text-slate-950"
              id={titleId}
            >
              {item.title}
            </h3>
          </div>
          <button
            aria-label={locale === "ko" ? "닫기" : "Close"}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {item.authorProfile?.avatarImageUrl ? (
              <Image
                alt=""
                className="size-10 rounded-full border border-slate-200 object-cover"
                height={40}
                src={item.authorProfile.avatarImageUrl}
                width={40}
              />
            ) : (
              <span className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700">
                {avatarFallback}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">
                {displayName}
              </p>
              <p className="truncate text-xs font-medium text-slate-500">
                {[accessLabel, dateLabel].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>

          {detailState?.status === "loading" ? (
            <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
              <LoaderCircle className="size-4 animate-spin" />
              {locale === "ko" ? "회원 권한 확인 중" : "Checking member access"}
            </p>
          ) : null}

          {detailState?.error ? (
            <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {detailState.error}
            </p>
          ) : gateLabel ? (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
              {gateLabel}
            </p>
          ) : null}

          <p className="mt-4 whitespace-pre-line text-[0.95rem] leading-7 text-slate-800">
            {bodyText}
          </p>

          {item.tags.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {item.tags.slice(0, 5).map((tag) => (
                <span
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                  key={tag}
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-slate-200 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-slate-800"
            href={fullContentHref}
          >
            <ExternalLink className="size-4 shrink-0 text-white" />
            <span className="truncate text-white">
              {actionLabel}
            </span>
          </Link>
        </div>
      </section>
    </div>
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
