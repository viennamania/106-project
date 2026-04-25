"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Fragment,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowUp,
  Bookmark,
  Check,
  ChevronRight,
  Coins,
  Copy,
  EyeOff,
  ExternalLink,
  Heart,
  House,
  LoaderCircle,
  MessageCircle,
  MoreHorizontal,
  Maximize2,
  RefreshCcw,
  Rss,
  Send,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  AutoConnect,
  useActiveAccount,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { AndroidInstallBanner } from "@/components/android-install-banner";
import { InAppBrowserExitBanner } from "@/components/in-app-browser-exit-banner";
import { getContentCopy } from "@/lib/content-copy";
import type {
  ContentCommentCreateResponse,
  ContentCommentRecord,
  ContentCommentsResponse,
  ContentFeedView,
  ContentFeedItemRecord,
  ContentFeedLoadResponse,
  ContentSocialResponse,
  ContentSocialSummaryRecord,
} from "@/lib/content";
import {
  buildPathWithReferral,
  buildReferralLandingPath,
  setPathSearchParams,
} from "@/lib/landing-branding";
import {
  createShareId,
  setShareIdOnHref,
} from "@/lib/share-tracking";
import { trackFunnelEvent } from "@/lib/funnel-client";
import type { MemberRecord } from "@/lib/member";
import {
  getAppMetadata,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";
import type { Dictionary, Locale } from "@/lib/i18n";

type FeedState = {
  error: string | null;
  items: ContentFeedItemRecord[];
  member: MemberRecord | null;
  status: "idle" | "loading" | "ready" | "error";
};

type FeedCreatorSummary = {
  avatarImageUrl: string | null;
  closestLevel: number | null;
  contentCount: number;
  displayName: string;
  intro: string | null;
  key: string;
};

type LikeBurst = {
  id: number;
  x: number;
  y: number;
};

type ShareState = "copied" | "error" | "idle" | "sharing";
type ScrollTopControlMode = "compact" | "hidden" | "ready";

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

type PaidProofTier = "new" | "proven" | "hot";

const FEED_RESTORE_VERSION = 5;
const FEED_RESTORE_TTL_MS = 1000 * 60 * 20;
const POST_IMAGE_SIZES = "(max-width: 640px) 100vw, 470px";

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

function formatUsdtAmountLabel(value: string | null | undefined, locale: Locale) {
  const parsed = Number(value ?? "0");

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return "0";
  }

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 6,
  }).format(parsed);
}

function getPaidProofTier(social: ContentSocialSummaryRecord): PaidProofTier {
  const paidTotal = Number(social.paidTotalUsdt);

  if ((Number.isFinite(paidTotal) && paidTotal >= 10) || social.paidBuyerCount >= 10) {
    return "hot";
  }

  if ((Number.isFinite(paidTotal) && paidTotal > 0) || social.paidBuyerCount > 0) {
    return "proven";
  }

  return "new";
}

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

function writeFeedRestoreSnapshot(
  key: string | null,
  snapshot: Omit<FeedRestoreSnapshot, "savedAt" | "version">,
) {
  if (!key || typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      key,
      JSON.stringify({
        ...snapshot,
        savedAt: Date.now(),
        version: FEED_RESTORE_VERSION,
      } satisfies FeedRestoreSnapshot),
    );
  } catch {}
}

export function NetworkFeedPage({
  dictionary,
  feedView = "network",
  initialPublicFeed = null,
  locale,
  referralCode = null,
  returnToHref = null,
  shareId = null,
}: {
  dictionary: Dictionary;
  feedView?: ContentFeedView;
  initialPublicFeed?: InitialPublicFeed;
  locale: Locale;
  referralCode?: string | null;
  returnToHref?: string | null;
  shareId?: string | null;
}) {
  const contentCopy = getContentCopy(locale);
  const account = useActiveAccount();
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const homeHref = buildReferralLandingPath(locale, referralCode);
  const feedPath =
    feedView === "saved"
      ? `/${locale}/network-feed/saved`
      : feedView === "purchases"
        ? `/${locale}/network-feed/purchases`
        : `/${locale}/network-feed`;
  const currentFeedHref = setPathSearchParams(
    buildPathWithReferral(feedPath, referralCode),
    {
      returnTo: returnToHref,
      shareId,
    },
  );
  const networkFeedHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/network-feed`, referralCode),
    {
      returnTo: returnToHref,
      shareId,
    },
  );
  const savedFeedHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/network-feed/saved`, referralCode),
    {
      returnTo: returnToHref,
      shareId,
    },
  );
  const purchasesFeedHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/network-feed/purchases`, referralCode),
    {
      returnTo: returnToHref,
      shareId,
    },
  );
  const backHref = returnToHref ?? homeHref;
  const activateHref = buildPathWithReferral(`/${locale}/activate`, referralCode);
  const publicSignupHref = setPathSearchParams(activateHref, {
    returnTo: currentFeedHref,
    shareId,
  });
  const hasReferralCode = Boolean(referralCode);
  const hasInitialPublicFeed =
    feedView === "network" && hasReferralCode && Boolean(initialPublicFeed);
  const isWalletConnected = status === "connected" && Boolean(accountAddress);
  const isFeedModeResolving =
    feedView === "network" &&
    hasReferralCode &&
    hasThirdwebClientId &&
    !hasInitialPublicFeed &&
    (status === "unknown" ||
      status === "connecting" ||
      (status === "connected" && !accountAddress));
  const isPublicReferralFeed =
    feedView === "network" &&
    hasReferralCode &&
    !isWalletConnected &&
    (status === "disconnected" || !hasThirdwebClientId || hasInitialPublicFeed);
  const usesReferralHomeNavigation = isPublicReferralFeed && !returnToHref;
  const headerBackLabel = usesReferralHomeNavigation
    ? locale === "ko"
      ? "추천 페이지 보기"
      : "View referral page"
    : contentCopy.actions.backHome;
  const HeaderBackIcon = usesReferralHomeNavigation ? House : ArrowLeft;
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
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const restoredFeedKeyRef = useRef<string | null>(null);
  const skippedInitialPublicLoadRef = useRef(false);
  const trackedPublicFeedViewRef = useRef<string | null>(null);
  const isLoadingMoreRef = useRef(false);
  const scrollTopControlRef = useRef<{
    lastY: number;
    mode: ScrollTopControlMode;
  }>({
    lastY: 0,
    mode: "hidden",
  });
  const scrollTopIdleTimeoutRef = useRef<number | null>(null);
  const [state, setState] = useState<FeedState>({
    error: null,
    items: initialPublicFeed?.items ?? [],
    member: null,
    status: initialPublicFeed ? "ready" : "idle",
  });
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialPublicFeed?.nextCursor ?? null,
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showPublicStickyCta, setShowPublicStickyCta] = useState(false);
  const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false);
  const [selectedCreatorKey, setSelectedCreatorKey] = useState<string | null>(
    null,
  );
  const [scrollTopControlMode, setScrollTopControlMode] =
    useState<ScrollTopControlMode>("hidden");
  const effectiveSelectedCreatorKey = isPublicReferralFeed
    ? null
    : selectedCreatorKey;

  const isInitialLoading =
    state.status === "loading" && state.items.length === 0 && !state.error;

  const filteredItems = useMemo(() => {
    return state.items.filter((item) => {
      return (
        !effectiveSelectedCreatorKey ||
        item.authorEmail === effectiveSelectedCreatorKey
      );
    });
  }, [effectiveSelectedCreatorKey, state.items]);

  const creatorSummaries = useMemo<FeedCreatorSummary[]>(() => {
    const map = new Map<string, FeedCreatorSummary>();

    for (const item of state.items) {
      const current = map.get(item.authorEmail);
      const displayName = getDisplayName(item);
      const intro = item.authorProfile?.intro?.trim() || null;
      const avatarImageUrl = item.authorProfile?.avatarImageUrl ?? null;
      const level = item.networkLevel ?? null;

      if (!current) {
        map.set(item.authorEmail, {
          avatarImageUrl,
          closestLevel: level,
          contentCount: 1,
          displayName,
          intro,
          key: item.authorEmail,
        });
        continue;
      }

      current.contentCount += 1;
      if (
        level !== null &&
        (current.closestLevel === null || level < current.closestLevel)
      ) {
        current.closestLevel = level;
      }
      if (!current.avatarImageUrl && avatarImageUrl) {
        current.avatarImageUrl = avatarImageUrl;
      }
      if (!current.intro && intro) {
        current.intro = intro;
      }
    }

    return [...map.values()]
      .sort((left, right) => {
        const leftLevel = left.closestLevel ?? 99;
        const rightLevel = right.closestLevel ?? 99;

        if (leftLevel !== rightLevel) {
          return leftLevel - rightLevel;
        }

        return right.contentCount - left.contentCount;
      })
      .slice(0, 12);
  }, [state.items]);
  const visibleCreatorSummaries = isPublicReferralFeed ? [] : creatorSummaries;
  const publicFeedCreatorLabel =
    isPublicReferralFeed && state.items[0] ? getDisplayName(state.items[0]) : null;

  const mergeItems = useCallback(
    (currentItems: ContentFeedItemRecord[], nextItems: ContentFeedItemRecord[]) => {
      const map = new Map(currentItems.map((item) => [item.contentId, item]));

      for (const item of nextItems) {
        map.set(item.contentId, item);
      }

      return [...map.values()];
    },
    [],
  );

  const restoreScrollPosition = useCallback((scrollY: number) => {
    if (typeof window === "undefined" || scrollY <= 0) {
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.scrollTo({
          behavior: "auto",
          top: scrollY,
        });
      });
    });
  }, []);

  const applyFeedSnapshot = useCallback(
    (key: string, snapshot: FeedRestoreSnapshot) => {
      restoredFeedKeyRef.current = key;
      setState({
        error: null,
        items: snapshot.items,
        member: snapshot.member,
        status: "ready",
      });
      setNextCursor(snapshot.nextCursor);
      setSelectedCreatorKey(snapshot.selectedCreatorKey);
      restoreScrollPosition(snapshot.scrollY);
    },
    [restoreScrollPosition],
  );

  const saveFeedSnapshot = useCallback(() => {
    writeFeedRestoreSnapshot(feedRestoreKey, {
      items: state.items,
      member: state.member,
      nextCursor,
      scrollY: typeof window === "undefined" ? 0 : window.scrollY,
      selectedCreatorKey: isPublicReferralFeed ? null : selectedCreatorKey,
    });
  }, [
    feedRestoreKey,
    isPublicReferralFeed,
    nextCursor,
    selectedCreatorKey,
    state.items,
    state.member,
  ]);

  const openContentFromFeed = useCallback(
    (item: ContentFeedItemRecord) => {
      saveFeedSnapshot();

      if (!isPublicReferralFeed) {
        return;
      }

      trackFunnelEvent("content_open", {
        contentId: item.contentId,
        metadata: {
          priceType: item.priceType,
          source: "network-feed",
        },
        referralCode,
        shareId,
      });
    },
    [isPublicReferralFeed, referralCode, saveFeedSnapshot, shareId],
  );

  const updateItemSocial = useCallback(
    (contentId: string, social: ContentSocialSummaryRecord) => {
      setState((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.contentId === contentId ? { ...item, social } : item,
        ),
      }));
    },
    [],
  );

  const setScrollTopControl = useCallback((mode: ScrollTopControlMode) => {
    if (scrollTopControlRef.current.mode === mode) {
      return;
    }

    scrollTopControlRef.current.mode = mode;
    setScrollTopControlMode(mode);
  }, []);

  const scrollToFeedTop = useCallback(() => {
    setScrollTopControl("hidden");
    window.scrollTo({
      behavior: "smooth",
      top: 0,
    });
  }, [setScrollTopControl]);

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
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
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
            )
          : accountAddress
            ? await (async () => {
                const email = await getUserEmail({ client: thirdwebClient });

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
                );
              })()
            : null;

        if (!response) {
          setState({
            error: null,
            items: [],
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

        setState((current) => ({
          error: null,
          items:
            append && "items" in data
              ? mergeItems(current.items, data.items)
              : "items" in data
                ? data.items
                : [],
          member,
          status: "ready",
        }));
        setNextCursor(
          "nextCursor" in data
            ? data.nextCursor
            : null,
        );
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
      contentCopy.messages.feedLoadFailed,
      contentCopy.messages.memberMissing,
      contentCopy.messages.paymentRequired,
      dictionary.member.errors.missingEmail,
      feedView,
      isPublicReferralFeed,
      locale,
      mergeItems,
      referralCode,
    ],
  );

  useEffect(() => {
    if (isFeedModeResolving) {
      setState({
        error: null,
        items: [],
        member: null,
        status: "loading",
      });
      setNextCursor(null);
      return;
    }

    if (
      feedRestoreKey &&
      restoredFeedKeyRef.current !== feedRestoreKey
    ) {
      const snapshot = readFeedRestoreSnapshot(feedRestoreKey);

      if (snapshot) {
        applyFeedSnapshot(feedRestoreKey, snapshot);

        if (feedView === "network") {
          return;
        }
      }

      restoredFeedKeyRef.current = feedRestoreKey;
    }

    if (
      isPublicReferralFeed &&
      initialPublicFeed &&
      !skippedInitialPublicLoadRef.current
    ) {
      skippedInitialPublicLoadRef.current = true;
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
    applyFeedSnapshot,
    feedView,
    feedRestoreKey,
    initialPublicFeed,
    isFeedModeResolving,
    isPublicReferralFeed,
    loadFeed,
    status,
  ]);

  useEffect(() => {
    if (state.status !== "ready" || state.items.length === 0) {
      return;
    }

    saveFeedSnapshot();
  }, [saveFeedSnapshot, state.items.length, state.status]);

  useEffect(() => {
    if (
      !isPublicReferralFeed ||
      state.status !== "ready" ||
      trackedPublicFeedViewRef.current === `${referralCode ?? ""}:${shareId ?? ""}`
    ) {
      return;
    }

    trackedPublicFeedViewRef.current = `${referralCode ?? ""}:${shareId ?? ""}`;
    trackFunnelEvent("feed_view_public", {
      metadata: {
        itemCount: state.items.length,
        source: "network-feed",
      },
      referralCode,
      shareId,
    });
  }, [isPublicReferralFeed, referralCode, shareId, state.items.length, state.status]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePageHide = () => {
      saveFeedSnapshot();
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [saveFeedSnapshot]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const clearIdleTimeout = () => {
      if (scrollTopIdleTimeoutRef.current === null) {
        return;
      }

      window.clearTimeout(scrollTopIdleTimeoutRef.current);
      scrollTopIdleTimeoutRef.current = null;
    };

    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - scrollTopControlRef.current.lastY;
      scrollTopControlRef.current.lastY = currentY;

      clearIdleTimeout();

      if (currentY < 900) {
        setScrollTopControl("hidden");
      } else if (delta > 10) {
        setScrollTopControl("compact");
      } else {
        setScrollTopControl("ready");
      }

      setShowPublicStickyCta(currentY > 680);

      scrollTopIdleTimeoutRef.current = window.setTimeout(() => {
        if (window.scrollY >= 900) {
          setScrollTopControl("ready");
        }
      }, 520);
    };

    scrollTopControlRef.current.lastY = window.scrollY;
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      clearIdleTimeout();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [setScrollTopControl]);

  useEffect(() => {
    const node = sentinelRef.current;

    if (!node || !nextCursor || isInitialLoading || isLoadingMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadFeed({ append: true, cursor: nextCursor });
        }
      },
      {
        rootMargin: "700px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [isInitialLoading, isLoadingMore, loadFeed, nextCursor]);

  const feedViewTitle =
    feedView === "saved"
      ? locale === "ko"
        ? "저장한 피드"
        : "Saved feed"
      : feedView === "purchases"
        ? locale === "ko"
          ? "결제 완료 피드"
          : "Paid feed"
        : contentCopy.page.feedTitle;
  const feedHeaderDescription = isInitialLoading || isFeedModeResolving
    ? contentCopy.messages.feedLoadingTitle
    : isPublicReferralFeed
      ? locale === "ko"
        ? "공개 네트워크 콘텐츠"
        : "Public network content"
      : isDisconnected
        ? feedView === "saved"
          ? locale === "ko"
            ? "로그인 후 저장한 피드 보기"
            : "Sign in to view saved posts"
          : feedView === "purchases"
            ? locale === "ko"
              ? "로그인 후 결제 완료 피드 보기"
              : "Sign in to view paid posts"
            : locale === "ko"
              ? "로그인 후 맞춤 피드 보기"
              : "Sign in for your feed"
        : state.member?.status === "completed"
          ? feedView === "saved"
            ? locale === "ko"
              ? "내가 다시 보려고 저장한 콘텐츠"
              : "Posts you saved to revisit"
            : feedView === "purchases"
              ? locale === "ko"
                ? "1 USDT 결제를 완료한 콘텐츠"
                : "Content you unlocked with payment"
              : locale === "ko"
                ? "상위 네트워크 콘텐츠"
                : "Upstream network content"
          : locale === "ko"
            ? "활성화 후 이용 가능"
            : "Available after activation";
  const emptyFeedMessage =
    feedView === "saved"
      ? locale === "ko"
        ? "아직 저장한 피드가 없습니다."
        : "No saved posts yet."
      : feedView === "purchases"
        ? locale === "ko"
          ? "아직 결제 완료한 피드가 없습니다."
          : "No paid posts yet."
        : contentCopy.labels.feedEmpty;
  const endOfFeedMessage =
    feedView === "saved"
      ? locale === "ko"
        ? "저장한 피드를 모두 확인했습니다."
        : "End of saved feed."
      : feedView === "purchases"
        ? locale === "ko"
          ? "결제 완료 피드를 모두 확인했습니다."
          : "End of paid feed."
        : locale === "ko"
          ? "모든 피드를 확인했습니다."
          : "End of feed.";

  return (
    <main className="min-h-screen bg-[#fafafa] text-slate-950">
      {hasThirdwebClientId ? (
        <AutoConnect
          accountAbstraction={smartWalletOptions}
          appMetadata={appMetadata}
          chain={smartWalletChain}
          client={thirdwebClient}
          wallets={supportedWallets}
        />
      ) : null}

      <div className="mx-auto flex w-full max-w-[470px] flex-col pb-8 sm:max-w-[520px]">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#fafafa]/94 px-3 pb-2.5 pt-[calc(env(safe-area-inset-top)+0.65rem)] backdrop-blur-xl sm:px-0 sm:pb-3 sm:pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <div className="grid min-h-12 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 sm:gap-3">
            <Link
              aria-label={headerBackLabel}
              className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full transition ${
                usesReferralHomeNavigation
                  ? "border border-slate-200 bg-white text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.06)] hover:border-slate-300 hover:bg-slate-50"
                  : "text-slate-950 hover:bg-slate-100"
              }`}
              href={backHref}
              title={headerBackLabel}
            >
              <HeaderBackIcon className="size-5" />
              <span className="sr-only">{headerBackLabel}</span>
            </Link>
            <div className="min-w-0 px-1 text-center">
              <h1 className="truncate text-[1.05rem] font-semibold leading-5 tracking-tight text-slate-950 sm:text-lg sm:leading-6">
                {feedViewTitle}
              </h1>
              <p className="mt-0.5 truncate text-[0.68rem] font-medium leading-4 text-slate-500 sm:text-xs">
                {feedHeaderDescription}
              </p>
            </div>
            <button
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-slate-950 transition hover:bg-slate-100 disabled:opacity-45"
              disabled={isInitialLoading || isFeedModeResolving}
              onClick={() => {
                void loadFeed();
              }}
              type="button"
            >
              <RefreshCcw className="size-5" />
              <span className="sr-only">{contentCopy.actions.refresh}</span>
            </button>
          </div>
          {!isPublicReferralFeed ? (
            <FeedViewTabs
              activeView={feedView}
              locale={locale}
              networkHref={networkFeedHref}
              purchasesHref={purchasesFeedHref}
              savedHref={savedFeedHref}
            />
          ) : null}

        </header>

        <InAppBrowserExitBanner
          locale={locale}
          referralCode={referralCode}
          shareId={shareId}
          source="network-feed"
        />

        {isPublicReferralFeed ? (
          <PublicFeedConversionBanner
            creatorName={publicFeedCreatorLabel}
            href={publicSignupHref}
            locale={locale}
            onSignupClick={() => {
              trackFunnelEvent("signup_cta_click", {
                metadata: {
                  placement: "banner",
                  source: "network-feed",
                },
                referralCode,
                shareId,
                targetHref: publicSignupHref,
              });
            }}
            referralCode={referralCode}
          />
        ) : null}

        {visibleCreatorSummaries.length > 0 ? (
          <section className="border-b border-slate-200/80 bg-white px-3 py-3 sm:px-0">
            <div className="flex gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {visibleCreatorSummaries.map((creator) => (
                <CreatorStoryButton
                  active={effectiveSelectedCreatorKey === creator.key}
                  creator={creator}
                  key={creator.key}
                  onSelect={() => {
                    setSelectedCreatorKey((current) =>
                      current === creator.key ? null : creator.key,
                    );
                  }}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="flex flex-col">
          {isFeedModeResolving ? (
            <FeedLoadingSkeleton />
          ) : !isPublicReferralFeed && isDisconnected ? (
            <MessageCard>{contentCopy.messages.connectRequired}</MessageCard>
          ) : isInitialLoading ? (
            <FeedLoadingSkeleton />
          ) : state.error ? (
            <MessageCard tone="error">
              {state.error}
              {!isPublicReferralFeed && state.member?.status !== "completed" ? (
                <span className="mt-3 block">
                  <Link className="font-semibold underline" href={activateHref}>
                    {dictionary.referralsPage.actions.completeSignup}
                  </Link>
                </span>
              ) : null}
            </MessageCard>
          ) : state.items.length === 0 ? (
            <MessageCard>{emptyFeedMessage}</MessageCard>
          ) : filteredItems.length === 0 ? (
            <MessageCard>{contentCopy.messages.noFilteredFeed}</MessageCard>
          ) : (
            <>
              {filteredItems.map((item, index) => (
                <Fragment key={item.contentId}>
                  <SocialFeedPost
                    accountAddress={accountAddress ?? null}
                    freeLabel={contentCopy.labels.free}
                    item={item}
                    levelLabel={contentCopy.labels.level}
                    locale={locale}
                    missingEmailMessage={dictionary.member.errors.missingEmail}
                    onCommentsOpenChange={setIsCommentSheetOpen}
                    onOpenDetail={openContentFromFeed}
                    onSocialChange={updateItemSocial}
                    priority={index < 2}
                    returnToHref={currentFeedHref}
                    referralCode={referralCode}
                    shareId={shareId}
                    showNetworkLevel={!isPublicReferralFeed}
                    viewDetailLabel={contentCopy.actions.viewDetail}
                  />
                  {isPublicReferralFeed &&
                  index === Math.min(1, filteredItems.length - 1) ? (
                    <AndroidInstallBanner
                      className="mx-3 my-3 sm:mx-0"
                      locale={locale}
                    />
                  ) : null}
                </Fragment>
              ))}

              <div ref={sentinelRef} />

              {isLoadingMore ? <InlineLoader /> : null}
              {!nextCursor && filteredItems.length > 0 ? (
                <div className="px-6 py-8 text-center text-xs font-medium text-slate-400">
                  {endOfFeedMessage}
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
      <FeedScrollTopControl
        locale={locale}
        mode={
          isCommentSheetOpen
            ? "hidden"
            : isPublicReferralFeed && showPublicStickyCta
              ? "hidden"
              : scrollTopControlMode
        }
        onClick={scrollToFeedTop}
      />
      {isPublicReferralFeed && !isCommentSheetOpen ? (
        <PublicFeedStickySignupCta
          href={publicSignupHref}
          locale={locale}
          onClick={() => {
            trackFunnelEvent("signup_cta_click", {
              metadata: {
                placement: "sticky",
                source: "network-feed",
              },
              referralCode,
              shareId,
              targetHref: publicSignupHref,
            });
          }}
          visible={showPublicStickyCta}
        />
      ) : null}
    </main>
  );
}

function FeedScrollTopControl({
  locale,
  mode,
  onClick,
}: {
  locale: Locale;
  mode: ScrollTopControlMode;
  onClick: () => void;
}) {
  const label = locale === "ko" ? "맨 위로" : "Back to top";

  return (
    <div
      className={`fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-50 flex justify-center px-4 transition duration-200 ${
        mode === "hidden"
          ? "pointer-events-none translate-y-4 opacity-0"
          : "pointer-events-none translate-y-0 opacity-100"
      }`}
    >
      <button
        aria-label={label}
        className={`pointer-events-auto inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-full border border-white/70 bg-slate-950/88 text-sm font-semibold text-white shadow-[0_18px_46px_rgba(15,23,42,0.24)] backdrop-blur-xl transition-all duration-300 hover:bg-slate-900 active:scale-[0.98] ${
          mode === "ready" ? "px-4" : "w-11 px-0"
        }`}
        onClick={onClick}
        type="button"
      >
        <ArrowUp className="size-4 shrink-0" />
        <span
          className={`whitespace-nowrap transition-all duration-300 ${
            mode === "ready"
              ? "max-w-24 opacity-100"
              : "max-w-0 opacity-0"
          }`}
        >
          {label}
        </span>
      </button>
    </div>
  );
}

function FeedViewTabs({
  activeView,
  locale,
  networkHref,
  purchasesHref,
  savedHref,
}: {
  activeView: ContentFeedView;
  locale: Locale;
  networkHref: string;
  purchasesHref: string;
  savedHref: string;
}) {
  const tabs: Array<{
    href: string;
    icon: typeof Rss;
    label: string;
    view: ContentFeedView;
  }> = [
    {
      href: networkHref,
      icon: Rss,
      label: locale === "ko" ? "전체" : "All",
      view: "network",
    },
    {
      href: savedHref,
      icon: Bookmark,
      label: locale === "ko" ? "저장됨" : "Saved",
      view: "saved",
    },
    {
      href: purchasesHref,
      icon: Coins,
      label: locale === "ko" ? "결제 완료" : "Paid",
      view: "purchases",
    },
  ];

  return (
    <nav
      aria-label={locale === "ko" ? "피드 보기 전환" : "Feed views"}
      className="mt-2.5 grid grid-cols-3 gap-1.5 rounded-full border border-slate-200 bg-white/86 p-1 shadow-[0_10px_26px_rgba(15,23,42,0.05)]"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.view === activeView;

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-[0.72rem] font-semibold transition sm:text-xs ${
              active
                ? "bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            }`}
            href={tab.href}
            key={tab.view}
            style={active ? { color: "#ffffff" } : undefined}
          >
            <Icon className="size-3.5 shrink-0" />
            <span className="truncate">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function PublicFeedConversionBanner({
  creatorName,
  href,
  locale,
  onSignupClick,
  referralCode,
}: {
  creatorName: string | null;
  href: string;
  locale: Locale;
  onSignupClick: () => void;
  referralCode: string | null;
}) {
  const copy =
    locale === "ko"
      ? {
          cta: "가입하고 계속 보기",
          eyebrow: "SNS 링크로 열린 공개 피드",
          refLabel: "추천 코드",
          subtitle: creatorName
            ? `${creatorName}의 콘텐츠를 먼저 둘러보고, 가입하면 저장과 결제를 이어갈 수 있습니다.`
            : "콘텐츠를 먼저 둘러보고, 가입하면 추천 코드가 유지된 상태로 저장과 결제를 이어갈 수 있습니다.",
          title: "피드를 보고 마음에 들면 바로 내 네트워크를 시작하세요.",
        }
      : {
          cta: "Sign up and continue",
          eyebrow: "Public feed from a social link",
          refLabel: "Referral",
          subtitle: creatorName
            ? `Preview ${creatorName}'s content first. Sign up to keep saves and paid access flowing.`
            : "Preview the content first. Sign up with the referral preserved for saves and paid access.",
          title: "Browse the feed first, then start your network when ready.",
        };

  return (
    <section className="border-b border-slate-200/80 bg-white px-3 py-3 sm:px-0">
      <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#fff7ed_100%)] p-3.5 shadow-[0_16px_38px_rgba(15,23,42,0.07)]">
        <div className="flex items-start gap-3">
          <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_12px_26px_rgba(15,23,42,0.14)]">
            <Rss className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-orange-600">
                {copy.eyebrow}
              </p>
              {referralCode ? (
                <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[0.65rem] font-semibold text-orange-700">
                  {copy.refLabel} {referralCode}
                </span>
              ) : null}
            </div>
            <h2 className="mt-1 text-sm font-semibold leading-5 text-slate-950">
              {copy.title}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {copy.subtitle}
            </p>
          </div>
        </div>
        <Link
          className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full border border-slate-950 bg-slate-950 px-4 text-sm font-semibold !text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] transition hover:bg-slate-900 active:scale-[0.99]"
          href={href}
          onClick={onSignupClick}
          style={{ color: "#ffffff" }}
        >
          <UserPlus className="mr-2 size-4 shrink-0 text-white" />
          <span className="truncate text-white">{copy.cta}</span>
        </Link>
      </div>
    </section>
  );
}

function PublicFeedStickySignupCta({
  href,
  locale,
  onClick,
  visible,
}: {
  href: string;
  locale: Locale;
  onClick: () => void;
  visible: boolean;
}) {
  return (
    <div
      className={`fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.85rem)] z-40 px-3 transition duration-300 sm:hidden ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-5 opacity-0"
      }`}
    >
      <Link
        className="mx-auto flex h-12 max-w-[440px] items-center justify-center rounded-full border border-slate-950/80 bg-slate-950 px-4 text-sm font-semibold !text-white shadow-[0_20px_52px_rgba(15,23,42,0.28)] backdrop-blur-xl active:scale-[0.99]"
        href={href}
        onClick={onClick}
        style={{ color: "#ffffff" }}
      >
        <UserPlus className="mr-2 size-4 shrink-0 text-white" />
        <span className="truncate text-white">
          {locale === "ko" ? "가입하고 피드 계속 보기" : "Sign up and keep browsing"}
        </span>
      </Link>
    </div>
  );
}

function CreatorStoryButton({
  active,
  creator,
  onSelect,
}: {
  active: boolean;
  creator: FeedCreatorSummary;
  onSelect: () => void;
}) {
  return (
    <button
      className="flex w-[74px] shrink-0 flex-col items-center gap-1.5 text-center"
      onClick={onSelect}
      type="button"
    >
      <span
        className={`rounded-full p-[2px] ${
          active
            ? "bg-slate-950"
            : "bg-[linear-gradient(135deg,#f97316,#ec4899,#8b5cf6)]"
        }`}
      >
        <span className="flex size-16 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-slate-100 text-sm font-semibold text-slate-700">
          {creator.avatarImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={creator.displayName}
              className="h-full w-full object-cover"
              src={creator.avatarImageUrl}
            />
          ) : (
            getAvatarFallback(creator.displayName)
          )}
        </span>
      </span>
      <span className="line-clamp-1 w-full text-[0.7rem] text-slate-700">
        {creator.displayName}
      </span>
    </button>
  );
}

function SocialFeedPost({
  accountAddress,
  freeLabel,
  item,
  levelLabel,
  locale,
  missingEmailMessage,
  onCommentsOpenChange,
  onOpenDetail,
  onSocialChange,
  priority,
  referralCode,
  returnToHref,
  shareId,
  showNetworkLevel,
  viewDetailLabel,
}: {
  accountAddress: string | null;
  freeLabel: string;
  item: ContentFeedItemRecord;
  levelLabel: string;
  locale: Locale;
  missingEmailMessage: string;
  onCommentsOpenChange: (open: boolean) => void;
  onOpenDetail: (item: ContentFeedItemRecord) => void;
  onSocialChange: (
    contentId: string,
    social: ContentSocialSummaryRecord,
  ) => void;
  priority: boolean;
  referralCode: string | null;
  returnToHref: string;
  shareId: string | null;
  showNetworkLevel: boolean;
  viewDetailLabel: string;
}) {
  const router = useRouter();
  const previewImageUrl = resolveFeedPreviewImage(item);
  const displayName = getDisplayName(item);
  const isPaidContent = item.priceType === "paid";
  const accessLabel = isPaidContent
    ? locale === "ko"
      ? "유료"
      : "Paid"
    : freeLabel;
  const priceLabel = isPaidContent
    ? `${item.priceUsdt ?? "1"} USDT`
    : null;
  const metaItems = [
    priceLabel ? `${accessLabel} · ${priceLabel}` : accessLabel,
    ...(showNetworkLevel
      ? [`${levelLabel} ${item.networkLevel ?? "-"}`]
      : []),
    formatDate(item.publishedAt ?? item.createdAt, locale),
  ];
  const summaryPreview =
    item.summary.length > 96
      ? `${item.summary.slice(0, 96).trimEnd()}...`
      : item.summary;
  const href = setPathSearchParams(
    buildPathWithReferral(`/${locale}/content/${item.contentId}`, referralCode),
    {
      returnTo: returnToHref,
      shareId,
    },
  );
  const bridgeHref = buildPathWithReferral(
    `/${locale}/content/bridge/${item.contentId}`,
    referralCode,
  );
  const imageRef = useRef<HTMLDivElement | null>(null);
  const lastTapAtRef = useRef(0);
  const mediaOpenTimeoutRef = useRef<number | null>(null);
  const mediaPointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const [social, setSocial] = useState<ContentSocialSummaryRecord>(item.social);
  const [isHidden, setIsHidden] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [likeBursts, setLikeBursts] = useState<LikeBurst[]>([]);
  const [shareState, setShareState] = useState<ShareState>("idle");
  const [toast, setToast] = useState<string | null>(null);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [comments, setComments] = useState<ContentCommentRecord[]>([]);
  const [commentsStatus, setCommentsStatus] = useState<
    "idle" | "loading" | "ready" | "submitting" | "error"
  >("idle");
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const applySocial = useCallback(
    (nextSocial: ContentSocialSummaryRecord) => {
      setSocial(nextSocial);
      onSocialChange(item.contentId, nextSocial);
    },
    [item.contentId, onSocialChange],
  );
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return new URL(
      setShareIdOnHref(bridgeHref, shareId),
      window.location.origin,
    ).toString();
  }, [bridgeHref, shareId]);
  const actionCopy =
    locale === "ko"
      ? {
          copied: "링크를 복사했습니다.",
          copyLink: "링크 복사",
          detail: "게시물 보기",
          hidden: "게시물을 숨겼습니다.",
          hide: "피드에서 숨기기",
          like: "좋아요",
          likeCount: "좋아요",
          liked: "좋아요 완료",
          loadCommentsFailed: "댓글을 불러오지 못했습니다.",
          noComments: "아직 댓글이 없습니다.",
          openPost: "게시물 열기",
          openComments: "댓글 보기",
          paidBuyers: "결제 회원",
          paidProofHot: "많이 결제된 유료 콘텐츠",
          paidProofNew: "유료 전체 보기",
          paidProofProven: "결제 검증된 유료 콘텐츠",
          postComment: "게시",
          readMore: "더 보기",
          saved: "저장했습니다.",
          savePost: "저장",
          share: "공유",
          shareFailed: "공유할 수 없습니다.",
          sharing: "공유 중",
          signInRequired: "지갑 연결 후 사용할 수 있습니다.",
          submitCommentFailed: "댓글을 등록하지 못했습니다.",
          totalPaid: "누적 결제",
          unsavePost: "저장 취소",
          unsaved: "저장을 취소했습니다.",
          undo: "되돌리기",
          unlockAfterPayment: "결제 후 전체 콘텐츠를 계속 볼 수 있습니다.",
          viewFullPost: "본문 전체 보기",
          writeComment: "댓글 달기...",
        }
      : {
          copied: "Link copied.",
          copyLink: "Copy link",
          detail: "View post",
          hidden: "Post hidden.",
          hide: "Hide from feed",
          like: "Like",
          likeCount: "likes",
          liked: "Liked",
          loadCommentsFailed: "Failed to load comments.",
          noComments: "No comments yet.",
          openPost: "Open post",
          openComments: "View comments",
          paidBuyers: "paid members",
          paidProofHot: "Top paid content",
          paidProofNew: "Paid full access",
          paidProofProven: "Payment-proven content",
          postComment: "Post",
          readMore: "more",
          saved: "Saved.",
          savePost: "Save",
          share: "Share",
          shareFailed: "Sharing is unavailable.",
          sharing: "Sharing",
          signInRequired: "Connect your wallet to use this.",
          submitCommentFailed: "Failed to post comment.",
          totalPaid: "Total paid",
          unsavePost: "Unsave",
          unsaved: "Removed from saved.",
          undo: "Undo",
          unlockAfterPayment: "Unlock once and keep access to the full content.",
          viewFullPost: "View full post",
          writeComment: "Add a comment...",
        };
  const paidProofTier = isPaidContent ? getPaidProofTier(social) : "new";
  const paidTotalLabel = formatUsdtAmountLabel(social.paidTotalUsdt, locale);
  const paidBuyerLabel = social.paidBuyerCount.toLocaleString(locale);
  const paidProofTitle =
    paidProofTier === "hot"
      ? actionCopy.paidProofHot
      : paidProofTier === "proven"
        ? actionCopy.paidProofProven
        : actionCopy.paidProofNew;
  const hasPaidProof =
    social.paidBuyerCount > 0 || Number(social.paidTotalUsdt) > 0;
  const shouldUsePaidUnlockCta = isPaidContent && !item.canAccess;
  const shouldShowFullPostCta = !shouldUsePaidUnlockCta;

  const clearMediaOpenTimeout = useCallback(() => {
    if (mediaOpenTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(mediaOpenTimeoutRef.current);
    mediaOpenTimeoutRef.current = null;
  }, []);

  const navigateToDetail = useCallback(() => {
    onOpenDetail(item);
    router.push(href);
  }, [href, item, onOpenDetail, router]);

  const openDetailFromMedia = useCallback(() => {
    clearMediaOpenTimeout();
    navigateToDetail();
  }, [clearMediaOpenTimeout, navigateToDetail]);

  const scheduleMediaDetailOpen = useCallback(() => {
    clearMediaOpenTimeout();
    mediaOpenTimeoutRef.current = window.setTimeout(() => {
      mediaOpenTimeoutRef.current = null;
      navigateToDetail();
    }, 260);
  }, [clearMediaOpenTimeout, navigateToDetail]);

  useEffect(() => {
    return clearMediaOpenTimeout;
  }, [clearMediaOpenTimeout]);

  useEffect(() => {
    onCommentsOpenChange(isCommentsOpen);

    return () => {
      if (isCommentsOpen) {
        onCommentsOpenChange(false);
      }
    };
  }, [isCommentsOpen, onCommentsOpenChange]);

  useEffect(() => {
    if (!isCommentsOpen || typeof window === "undefined") {
      return;
    }

    const { body, documentElement } = document;
    const scrollY = Math.max(
      window.scrollY,
      documentElement.scrollTop,
      body.scrollTop,
      0,
    );
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyLeft = body.style.left;
    const previousBodyRight = body.style.right;
    const previousBodyWidth = body.style.width;
    const previousBodyHeight = body.style.height;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const previousBodyPaddingRight = body.style.paddingRight;
    const previousDocumentOverflow = documentElement.style.overflow;
    const previousDocumentOverscrollBehavior =
      documentElement.style.overscrollBehavior;
    const previousDocumentScrollBehavior = documentElement.style.scrollBehavior;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.height = "100%";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    documentElement.style.overflow = "hidden";
    documentElement.style.overscrollBehavior = "none";
    documentElement.style.scrollBehavior = "auto";

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      const restoreScroll = () => {
        window.scrollTo({
          behavior: "auto",
          top: scrollY,
        });
      };

      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.left = previousBodyLeft;
      body.style.right = previousBodyRight;
      body.style.width = previousBodyWidth;
      body.style.height = previousBodyHeight;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      body.style.paddingRight = previousBodyPaddingRight;
      documentElement.style.overflow = previousDocumentOverflow;
      documentElement.style.overscrollBehavior = previousDocumentOverscrollBehavior;
      documentElement.style.scrollBehavior = previousDocumentScrollBehavior;
      restoreScroll();
      window.requestAnimationFrame(restoreScroll);
      window.setTimeout(restoreScroll, 80);
    };
  }, [isCommentsOpen]);

  useEffect(() => {
    if (!toast && shareState !== "copied" && shareState !== "error") {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToast(null);
      setShareState("idle");
    }, 2200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [shareState, toast]);

  const spawnLikeBurst = useCallback((clientX?: number, clientY?: number) => {
    const rect = imageRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const id = Date.now() + Math.random();
    const x =
      typeof clientX === "number"
        ? ((clientX - rect.left) / rect.width) * 100
        : 50;
    const y =
      typeof clientY === "number"
        ? ((clientY - rect.top) / rect.height) * 100
        : 50;

    setLikeBursts((current) => [...current, { id, x, y }]);
    window.setTimeout(() => {
      setLikeBursts((current) => current.filter((burst) => burst.id !== id));
    }, 850);
  }, []);

  const updateSocialAction = useCallback(
    async (
      action: "hide" | "like" | "save",
      value: boolean,
      rollback: ContentSocialSummaryRecord,
    ) => {
      if (!accountAddress) {
        applySocial(rollback);
        setToast(actionCopy.signInRequired);
        return false;
      }

      try {
        const email = await getUserEmail({ client: thirdwebClient });

        if (!email) {
          throw new Error(missingEmailMessage);
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
            "error" in data && data.error ? data.error : actionCopy.shareFailed,
          );
        }

        applySocial(data.social);
        return true;
      } catch (error) {
        applySocial(rollback);
        setToast(
          error instanceof Error ? error.message : actionCopy.shareFailed,
        );
        return false;
      }
    },
    [
      accountAddress,
      actionCopy.shareFailed,
      actionCopy.signInRequired,
      applySocial,
      item.contentId,
      missingEmailMessage,
    ],
  );

  const triggerLike = useCallback(
    (clientX?: number, clientY?: number) => {
      spawnLikeBurst(clientX, clientY);

      if (social.likedByViewer) {
        return;
      }

      const nextSocial = {
        ...social,
        likedByViewer: true,
        likeCount: social.likeCount + 1,
      };

      applySocial(nextSocial);
      void updateSocialAction("like", true, social);
    },
    [applySocial, social, spawnLikeBurst, updateSocialAction],
  );

  const toggleLike = useCallback(() => {
    const previous = social;
    const nextLiked = !previous.likedByViewer;
    const nextSocial = {
      ...previous,
      likedByViewer: nextLiked,
      likeCount: Math.max(0, previous.likeCount + (nextLiked ? 1 : -1)),
    };

    applySocial(nextSocial);

    if (nextLiked) {
      spawnLikeBurst();
    }

    void updateSocialAction("like", nextLiked, previous);
  }, [applySocial, social, spawnLikeBurst, updateSocialAction]);

  const copyShareLink = useCallback(async (nextShareUrl = shareUrl) => {
    if (!nextShareUrl) {
      setShareState("error");
      setToast(actionCopy.shareFailed);
      return false;
    }

    try {
      await navigator.clipboard.writeText(nextShareUrl);
      setShareState("copied");
      setToast(actionCopy.copied);
      return true;
    } catch {
      setShareState("error");
      setToast(actionCopy.shareFailed);
      return false;
    }
  }, [actionCopy.copied, actionCopy.shareFailed, shareUrl]);

  const handleShare = useCallback(async () => {
    if (!shareUrl) {
      setShareState("error");
      setToast(actionCopy.shareFailed);
      return;
    }

    const nextShareId = createShareId("feedpost");
    const nextShareUrl = setShareIdOnHref(shareUrl, nextShareId);

    trackFunnelEvent("share_click", {
      contentId: item.contentId,
      metadata: {
        priceType: item.priceType,
        source: "network-feed-post",
      },
      referralCode,
      shareId: nextShareId,
      targetHref: nextShareUrl,
    });

    if (typeof navigator.share === "function") {
      setShareState("sharing");

      try {
        await navigator.share({
          text: item.summary,
          title: item.title,
          url: nextShareUrl,
        });
        setShareState("idle");
        return;
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          error.name === "AbortError"
        ) {
          setShareState("idle");
          return;
        }
      }
    }

    await copyShareLink(nextShareUrl);
  }, [
    actionCopy.shareFailed,
    copyShareLink,
    item.contentId,
    item.priceType,
    item.summary,
    item.title,
    referralCode,
    shareUrl,
  ]);

  const toggleSave = useCallback(() => {
    const previous = social;
    const nextSaved = !previous.savedByViewer;
    const nextSocial = {
      ...previous,
      savedByViewer: nextSaved,
      saveCount: Math.max(0, previous.saveCount + (nextSaved ? 1 : -1)),
    };

    applySocial(nextSocial);
    setToast(nextSaved ? actionCopy.saved : actionCopy.unsaved);
    void updateSocialAction("save", nextSaved, previous);
  }, [
    actionCopy.saved,
    actionCopy.unsaved,
    applySocial,
    social,
    updateSocialAction,
  ]);

  const hidePost = useCallback(() => {
    const previous = social;
    const nextSocial = {
      ...previous,
      hiddenByViewer: true,
    };

    applySocial(nextSocial);
    setIsHidden(true);
    void updateSocialAction("hide", true, previous).then((success) => {
      if (!success) {
        setIsHidden(false);
      }
    });
  }, [applySocial, social, updateSocialAction]);

  const handleMediaPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const pointerStart = mediaPointerStartRef.current;
      mediaPointerStartRef.current = null;

      if (
        pointerStart &&
        Math.hypot(
          event.clientX - pointerStart.x,
          event.clientY - pointerStart.y,
        ) > 12
      ) {
        return;
      }

      const now = Date.now();

      if (now - lastTapAtRef.current < 280) {
        event.preventDefault();
        clearMediaOpenTimeout();
        lastTapAtRef.current = 0;
        triggerLike(event.clientX, event.clientY);
        return;
      }

      lastTapAtRef.current = now;
      scheduleMediaDetailOpen();
    },
    [clearMediaOpenTimeout, scheduleMediaDetailOpen, triggerLike],
  );

  const handleMediaPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      mediaPointerStartRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    },
    [],
  );

  const handleMediaPointerCancel = useCallback(() => {
    mediaPointerStartRef.current = null;
    clearMediaOpenTimeout();
  }, [clearMediaOpenTimeout]);

  const handleMediaKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      openDetailFromMedia();
    },
    [openDetailFromMedia],
  );

  const loadComments = useCallback(async () => {
    setIsCommentsOpen(true);
    setCommentsError(null);
    setCommentsStatus("loading");

    try {
      const searchParams = new URLSearchParams();

      if (accountAddress) {
        const email = await getUserEmail({ client: thirdwebClient });

        if (email) {
          searchParams.set("email", email);
          searchParams.set("walletAddress", accountAddress);
        }
      }

      const query = searchParams.toString();
      const response = await fetch(
        `/api/content/posts/${encodeURIComponent(item.contentId)}/comments${query ? `?${query}` : ""}`,
      );
      const data = (await response.json()) as
        | ContentCommentsResponse
        | { error?: string };

      if (!response.ok || !("comments" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : actionCopy.loadCommentsFailed,
        );
      }

      setComments(data.comments);
      applySocial(data.social);
      setCommentsStatus("ready");
    } catch (error) {
      setCommentsError(
        error instanceof Error ? error.message : actionCopy.loadCommentsFailed,
      );
      setCommentsStatus("error");
    }
  }, [
    accountAddress,
    actionCopy.loadCommentsFailed,
    applySocial,
    item.contentId,
  ]);

  const submitComment = useCallback(async () => {
    const body = commentBody.trim();

    if (!body) {
      return;
    }

    if (!accountAddress) {
      setToast(actionCopy.signInRequired);
      return;
    }

    setCommentsStatus("submitting");
    setCommentsError(null);

    try {
      const email = await getUserEmail({ client: thirdwebClient });

      if (!email) {
        throw new Error(missingEmailMessage);
      }

      const response = await fetch(
        `/api/content/posts/${encodeURIComponent(item.contentId)}/comments`,
        {
          body: JSON.stringify({
            body,
            email,
            walletAddress: accountAddress,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );
      const data = (await response.json()) as
        | ContentCommentCreateResponse
        | { error?: string };

      if (!response.ok || !("comment" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : actionCopy.submitCommentFailed,
        );
      }

      setComments((current) => [data.comment, ...current]);
      applySocial(data.social);
      setCommentBody("");
      setCommentsStatus("ready");
    } catch (error) {
      setCommentsError(
        error instanceof Error ? error.message : actionCopy.submitCommentFailed,
      );
      setCommentsStatus("error");
    }
  }, [
    accountAddress,
    actionCopy.signInRequired,
    actionCopy.submitCommentFailed,
    applySocial,
    commentBody,
    item.contentId,
    missingEmailMessage,
  ]);

  if (isHidden) {
    return (
      <article className="border-b border-slate-200 bg-white px-4 py-5">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span>{actionCopy.hidden}</span>
          <button
            className="shrink-0 text-sm font-semibold text-slate-950"
            onClick={() => {
              const nextSocial = {
                ...social,
                hiddenByViewer: false,
              };

              applySocial(nextSocial);
              setIsHidden(false);
              void updateSocialAction("hide", false, social);
            }}
            type="button"
          >
            {actionCopy.undo}
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="relative border-b border-slate-200 bg-white">
      <div className="flex items-center gap-3 px-3 py-3">
        <Avatar
          imageUrl={item.authorProfile?.avatarImageUrl ?? null}
          label={displayName}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-950">
            {displayName}
          </p>
          <p className="truncate text-xs text-slate-500">
            {metaItems.filter(Boolean).join(" · ")}
          </p>
        </div>
        <button
          aria-expanded={isMenuOpen}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
          onClick={() => {
            setIsMenuOpen((current) => !current);
          }}
          type="button"
        >
          <span className="sr-only">More</span>
          <MoreHorizontal className="size-5" />
        </button>
        {isMenuOpen ? (
          <div className="absolute right-3 top-12 z-30 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.16)]">
            <button
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              onClick={() => {
                void copyShareLink();
                setIsMenuOpen(false);
              }}
              type="button"
            >
              <Copy className="size-4" />
              {actionCopy.copyLink}
            </button>
            <Link
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              href={href}
              onClick={() => {
                onOpenDetail(item);
                setIsMenuOpen(false);
              }}
            >
              <ExternalLink className="size-4" />
              {actionCopy.detail}
            </Link>
            <button
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              onClick={() => {
                hidePost();
                setIsMenuOpen(false);
              }}
              type="button"
            >
              <EyeOff className="size-4" />
              {actionCopy.hide}
            </button>
          </div>
        ) : null}
      </div>

      <div
        aria-label={`${actionCopy.openPost}: ${item.title}`}
        className="relative block w-full cursor-pointer bg-slate-100 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
        onKeyDown={handleMediaKeyDown}
        onPointerCancel={handleMediaPointerCancel}
        onPointerDown={handleMediaPointerDown}
        onPointerUp={handleMediaPointerUp}
        ref={imageRef}
        role="button"
        tabIndex={0}
      >
        {previewImageUrl ? (
          <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
            <Image
              alt={item.title}
              className="object-cover"
              fill
              priority={priority}
              sizes={POST_IMAGE_SIZES}
              src={previewImageUrl}
            />
          </div>
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.22),transparent_34%),#f8fafc] px-8 text-center">
            <div>
              <Rss className="mx-auto size-8 text-slate-400" />
              <p className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                {item.title}
              </p>
            </div>
          </div>
        )}
        {likeBursts.map((burst) => (
          <Heart
            className="pointer-events-none absolute size-20 -translate-x-1/2 -translate-y-1/2 fill-white text-white drop-shadow-[0_12px_28px_rgba(15,23,42,0.42)] motion-safe:animate-ping"
            key={burst.id}
            style={{
              left: `${burst.x}%`,
              top: `${burst.y}%`,
            }}
          />
        ))}
        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex size-10 items-center justify-center rounded-full bg-slate-950/58 text-white shadow-[0_12px_28px_rgba(15,23,42,0.22)] backdrop-blur-md">
          <Maximize2 className="size-4" />
        </span>
        {isPaidContent ? (
          <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-slate-950/72 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_12px_28px_rgba(15,23,42,0.22)] backdrop-blur-md">
            {accessLabel}
            <span className="h-1 w-1 rounded-full bg-white/55" />
            {priceLabel}
          </span>
        ) : null}
        {isPaidContent && hasPaidProof ? (
          <span className="pointer-events-none absolute bottom-3 left-3 inline-flex max-w-[calc(100%-4.5rem)] items-center gap-1.5 rounded-full border border-amber-200/50 bg-amber-300/92 px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-950 shadow-[0_14px_30px_rgba(15,23,42,0.22)] backdrop-blur-md">
            <TrendingUp className="size-3.5" />
            <span className="truncate">
              {locale === "ko"
                ? `누적 ${paidTotalLabel} USDT`
                : `${paidTotalLabel} USDT paid`}
            </span>
          </span>
        ) : null}
      </div>

      <div className="px-3 pb-4 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              aria-pressed={social.likedByViewer}
              className="inline-flex size-8 items-center justify-center rounded-full transition hover:bg-slate-100"
              onClick={toggleLike}
              type="button"
            >
              <span className="sr-only">
                {social.likedByViewer ? actionCopy.liked : actionCopy.like}
              </span>
              <Heart
                className={`size-6 transition ${
                  social.likedByViewer
                    ? "fill-rose-500 text-rose-500"
                    : "text-slate-950"
                }`}
              />
            </button>
            <button
              className="inline-flex size-8 items-center justify-center rounded-full transition hover:bg-slate-100"
              onClick={() => {
                void loadComments();
              }}
              type="button"
            >
              <span className="sr-only">{actionCopy.openComments}</span>
              <MessageCircle className="size-6 text-slate-950" />
            </button>
            <button
              className="inline-flex size-8 items-center justify-center rounded-full transition hover:bg-slate-100 disabled:opacity-60"
              disabled={shareState === "sharing"}
              onClick={() => {
                void handleShare();
              }}
              type="button"
            >
              <span className="sr-only">
                {shareState === "sharing" ? actionCopy.sharing : actionCopy.share}
              </span>
              <Send
                className={`size-6 transition ${
                  shareState === "copied" ? "text-emerald-600" : "text-slate-950"
                }`}
              />
            </button>
          </div>
          <button
            aria-pressed={social.savedByViewer}
            className="inline-flex size-8 items-center justify-center rounded-full transition hover:bg-slate-100"
            onClick={toggleSave}
            type="button"
          >
            <span className="sr-only">
              {social.savedByViewer ? actionCopy.unsavePost : actionCopy.savePost}
            </span>
            <Bookmark
              className={`size-6 transition ${
                social.savedByViewer
                  ? "fill-slate-950 text-slate-950"
                  : "text-slate-950"
              }`}
            />
          </button>
        </div>

        {toast ? (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)]">
            {toast === actionCopy.copied || toast === actionCopy.saved ? (
              <Check className="size-3.5" />
            ) : null}
            {toast}
          </div>
        ) : null}

        <div className="mt-3 space-y-1.5">
          {social.likeCount > 0 ? (
            <button
              className="text-sm font-semibold text-slate-950"
              onClick={toggleLike}
              type="button"
            >
              {actionCopy.likeCount} {social.likeCount.toLocaleString(locale)}
            </button>
          ) : null}
          {social.commentCount > 0 ? (
            <button
              className="block text-sm text-slate-500"
              onClick={() => {
                void loadComments();
              }}
              type="button"
            >
              {locale === "ko"
                ? `댓글 ${social.commentCount.toLocaleString(locale)}개 모두 보기`
                : `View all ${social.commentCount.toLocaleString(locale)} comments`}
            </button>
          ) : null}
        </div>

        {isPaidContent ? (
          <Link
            aria-disabled={!shouldUsePaidUnlockCta}
            className={`mt-3 block overflow-hidden rounded-2xl border ${
              paidProofTier === "hot"
                ? "border-amber-300 bg-[linear-gradient(135deg,#fff7ed_0%,#fef3c7_48%,#ffffff_100%)] shadow-[0_16px_34px_rgba(217,119,6,0.16)]"
                : paidProofTier === "proven"
                  ? "border-amber-200 bg-amber-50/88 shadow-[0_12px_28px_rgba(217,119,6,0.08)]"
                  : "border-slate-200 bg-slate-50/85"
            } ${
              shouldUsePaidUnlockCta
                ? "transition hover:border-slate-300 hover:bg-white hover:shadow-[0_18px_36px_rgba(15,23,42,0.12)] active:scale-[0.99]"
                : "pointer-events-none"
            }`}
            href={href}
            tabIndex={shouldUsePaidUnlockCta ? undefined : -1}
            onClick={(event) => {
              if (!shouldUsePaidUnlockCta) {
                event.preventDefault();
                return;
              }

              onOpenDetail(item);
            }}
          >
            <div className="flex items-center justify-between gap-3 px-3.5 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full ${
                    paidProofTier === "new"
                      ? "bg-slate-950 text-white"
                      : "bg-amber-400 text-slate-950"
                  }`}
                >
                  <Coins className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {paidProofTitle}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-600">
                    {hasPaidProof
                      ? `${actionCopy.totalPaid} ${paidTotalLabel} USDT`
                      : actionCopy.unlockAfterPayment}
                  </p>
                </div>
              </div>
              {hasPaidProof ? (
                <div className="flex shrink-0 items-center gap-1.5 text-right">
                  <Users className="size-3.5 text-slate-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-950">
                      {paidBuyerLabel}
                    </p>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {actionCopy.paidBuyers}
                    </p>
                  </div>
                </div>
              ) : (
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.06)]">
                  {priceLabel}
                </span>
              )}
            </div>
          </Link>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Pill tone={isPaidContent ? "paid" : "neutral"}>
            {priceLabel ? `${accessLabel} · ${priceLabel}` : accessLabel}
          </Pill>
          {showNetworkLevel ? (
            <Pill>
              {levelLabel} {item.networkLevel ?? "-"}
            </Pill>
          ) : null}
          {item.tags.slice(0, 3).map((tag) => (
            <Pill key={tag}>#{tag}</Pill>
          ))}
        </div>

        <Link
          href={href}
          onClick={() => {
            onOpenDetail(item);
          }}
        >
          <h2 className="mt-3 line-clamp-2 text-[0.96rem] font-semibold leading-5 text-slate-950">
            {item.title}
          </h2>
        </Link>
        <p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-700">
          <span className="font-semibold">{displayName}</span> {summaryPreview}
        </p>
        {item.authorProfile?.intro ? (
          <p className="mt-2 line-clamp-1 text-xs text-slate-500">
            {item.authorProfile.intro}
          </p>
        ) : null}

        {shouldShowFullPostCta ? (
          <Link
            className="group mt-4 flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/[0.03] transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_16px_34px_rgba(15,23,42,0.12)] active:scale-[0.99] sm:h-11 sm:w-auto sm:min-w-56 sm:justify-start"
            href={href}
            onClick={() => {
              onOpenDetail(item);
            }}
          >
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-[0_8px_18px_rgba(15,23,42,0.18)]">
              <ExternalLink className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate text-left">
              {actionCopy.viewFullPost || viewDetailLabel}
            </span>
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-hover:bg-slate-950 group-hover:text-white">
              <ChevronRight className="size-4" />
            </span>
          </Link>
        ) : null}
      </div>
      {isCommentsOpen ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center overflow-hidden overscroll-none bg-slate-950/45 px-0 sm:px-4">
          <div className="flex max-h-[min(82svh,720px)] w-full max-w-[520px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_-18px_60px_rgba(15,23,42,0.22)] sm:mb-6 sm:rounded-3xl">
            <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-slate-200" />
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">
                  {item.title}
                </p>
                <p className="text-xs text-slate-500">
                  {social.commentCount.toLocaleString(locale)}{" "}
                  {locale === "ko" ? "댓글" : "comments"}
                </p>
              </div>
              <button
                className="inline-flex size-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                onClick={() => {
                  setIsCommentsOpen(false);
                }}
                type="button"
              >
                <span className="sr-only">Close</span>
                <X className="size-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
              {commentsStatus === "loading" ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm font-medium text-slate-500">
                  <LoaderCircle className="size-4 animate-spin" />
                  {locale === "ko" ? "댓글을 불러오는 중" : "Loading comments"}
                </div>
              ) : commentsError ? (
                <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {commentsError}
                </p>
              ) : comments.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  {actionCopy.noComments}
                </p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div className="flex gap-3" key={comment.commentId}>
                      <Avatar
                        imageUrl={comment.authorAvatarImageUrl}
                        label={comment.authorDisplayName}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-6 text-slate-800">
                          <span className="font-semibold text-slate-950">
                            {comment.authorDisplayName}
                          </span>{" "}
                          {comment.body}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDate(comment.createdAt, locale)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-200 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
              <div className="flex items-end gap-2 rounded-2xl bg-slate-50 p-2">
                <textarea
                  className="max-h-28 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400"
                  maxLength={500}
                  onChange={(event) => {
                    setCommentBody(event.target.value);
                  }}
                  placeholder={actionCopy.writeComment}
                  value={commentBody}
                />
                <button
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition disabled:bg-slate-300"
                  disabled={
                    !commentBody.trim() || commentsStatus === "submitting"
                  }
                  onClick={() => {
                    void submitComment();
                  }}
                  type="button"
                >
                  {commentsStatus === "submitting" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    actionCopy.postComment
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function Avatar({
  imageUrl,
  label,
}: {
  imageUrl: string | null;
  label: string;
}) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={label} className="h-full w-full object-cover" src={imageUrl} />
      ) : (
        getAvatarFallback(label)
      )}
    </span>
  );
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "paid";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ${
        tone === "paid"
          ? "bg-amber-50 text-amber-800"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {children}
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
      className={`m-3 rounded-2xl border px-4 py-4 text-sm leading-6 shadow-sm ${
        tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      {children}
    </div>
  );
}

function FeedLoadingSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 3 }, (_, index) => (
        <div className="border-b border-slate-200 bg-white" key={index}>
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="size-10 rounded-full bg-slate-200 motion-safe:animate-pulse" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-32 rounded-full bg-slate-200 motion-safe:animate-pulse" />
              <div className="h-3 w-20 rounded-full bg-slate-100 motion-safe:animate-pulse" />
            </div>
          </div>
          <div className="aspect-square w-full bg-slate-200 motion-safe:animate-pulse" />
          <div className="space-y-2 px-3 py-4">
            <div className="h-4 w-36 rounded-full bg-slate-200 motion-safe:animate-pulse" />
            <div className="h-4 rounded-full bg-slate-100 motion-safe:animate-pulse" />
            <div className="h-4 w-2/3 rounded-full bg-slate-100 motion-safe:animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function InlineLoader() {
  return (
    <div className="flex items-center justify-center gap-2 px-6 py-8 text-xs font-semibold text-slate-400">
      <span className="size-2 rounded-full bg-slate-300 motion-safe:animate-bounce" />
      <span className="size-2 rounded-full bg-slate-300 motion-safe:animate-bounce [animation-delay:120ms]" />
      <span className="size-2 rounded-full bg-slate-300 motion-safe:animate-bounce [animation-delay:240ms]" />
    </div>
  );
}
