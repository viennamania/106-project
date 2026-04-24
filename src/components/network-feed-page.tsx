"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  Bookmark,
  Check,
  Copy,
  EyeOff,
  ExternalLink,
  Heart,
  LoaderCircle,
  MessageCircle,
  MoreHorizontal,
  RefreshCcw,
  Rss,
  Send,
  X,
} from "lucide-react";
import {
  AutoConnect,
  useActiveAccount,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { getContentCopy } from "@/lib/content-copy";
import type {
  ContentCommentCreateResponse,
  ContentCommentRecord,
  ContentCommentsResponse,
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

type FeedRestoreSnapshot = {
  items: ContentFeedItemRecord[];
  member: MemberRecord | null;
  nextCursor: string | null;
  savedAt: number;
  scrollY: number;
  selectedCreatorKey: string | null;
  version: number;
};

const FEED_RESTORE_VERSION = 2;
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

function readStoredFlag(key: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeStoredFlag(key: string, value: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {}
}

function createFeedRestoreKey({
  accountAddress,
  isPublicReferralFeed,
  locale,
  referralCode,
}: {
  accountAddress?: string | null;
  isPublicReferralFeed: boolean;
  locale: Locale;
  referralCode?: string | null;
}) {
  if (isPublicReferralFeed && referralCode) {
    return `network-feed:${FEED_RESTORE_VERSION}:${locale}:ref:${referralCode}`;
  }

  if (accountAddress) {
    return `network-feed:${FEED_RESTORE_VERSION}:${locale}:wallet:${accountAddress.toLowerCase()}`;
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
  locale,
  referralCode = null,
}: {
  dictionary: Dictionary;
  locale: Locale;
  referralCode?: string | null;
}) {
  const contentCopy = getContentCopy(locale);
  const account = useActiveAccount();
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const homeHref = buildReferralLandingPath(locale, referralCode);
  const activateHref = buildPathWithReferral(`/${locale}/activate`, referralCode);
  const isPublicReferralFeed = Boolean(referralCode);
  const isDisconnected = status !== "connected" || !accountAddress;
  const feedRestoreKey = useMemo(
    () =>
      createFeedRestoreKey({
        accountAddress,
        isPublicReferralFeed,
        locale,
        referralCode,
      }),
    [accountAddress, isPublicReferralFeed, locale, referralCode],
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const restoredFeedKeyRef = useRef<string | null>(null);
  const isLoadingMoreRef = useRef(false);
  const [state, setState] = useState<FeedState>({
    error: null,
    items: [],
    member: null,
    status: "idle",
  });
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedCreatorKey, setSelectedCreatorKey] = useState<string | null>(
    null,
  );

  const isInitialLoading =
    state.status === "loading" && state.items.length === 0 && !state.error;

  const filteredItems = useMemo(() => {
    return state.items.filter((item) => {
      return !selectedCreatorKey || item.authorEmail === selectedCreatorKey;
    });
  }, [selectedCreatorKey, state.items]);

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
      selectedCreatorKey,
    });
  }, [
    feedRestoreKey,
    nextCursor,
    selectedCreatorKey,
    state.items,
    state.member,
  ]);

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
      contentCopy.messages.feedLoadFailed,
      contentCopy.messages.memberMissing,
      contentCopy.messages.paymentRequired,
      dictionary.member.errors.missingEmail,
      isPublicReferralFeed,
      locale,
      mergeItems,
      referralCode,
    ],
  );

  useEffect(() => {
    if (
      feedRestoreKey &&
      restoredFeedKeyRef.current !== feedRestoreKey
    ) {
      const snapshot = readFeedRestoreSnapshot(feedRestoreKey);

      if (snapshot) {
        applyFeedSnapshot(feedRestoreKey, snapshot);
        return;
      }

      restoredFeedKeyRef.current = feedRestoreKey;
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
    feedRestoreKey,
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

  const feedDescription = isInitialLoading
    ? contentCopy.messages.feedLoadingDescription
    : isPublicReferralFeed
      ? contentCopy.page.feedDescription
      : isDisconnected
        ? contentCopy.messages.connectRequired
        : state.member?.status === "completed"
          ? contentCopy.page.feedDescription
          : contentCopy.messages.paymentRequired;

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
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#fafafa]/92 px-3 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-xl sm:px-0">
          <div className="flex items-center justify-between gap-3">
            <Link
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-slate-950 transition hover:bg-slate-100"
              href={homeHref}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div className="min-w-0 flex-1 text-center">
              <h1 className="truncate text-lg font-semibold tracking-tight">
                {contentCopy.page.feedTitle}
              </h1>
              <p className="truncate text-xs text-slate-500">{feedDescription}</p>
            </div>
            <button
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-slate-950 transition hover:bg-slate-100 disabled:opacity-45"
              disabled={isInitialLoading}
              onClick={() => {
                void loadFeed();
              }}
              type="button"
            >
              <RefreshCcw className="size-5" />
            </button>
          </div>

        </header>

        {creatorSummaries.length > 0 ? (
          <section className="border-b border-slate-200/80 bg-white px-3 py-3 sm:px-0">
            <div className="flex gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {creatorSummaries.map((creator) => (
                <CreatorStoryButton
                  active={selectedCreatorKey === creator.key}
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
          {!isPublicReferralFeed && isDisconnected ? (
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
            <MessageCard>{contentCopy.labels.feedEmpty}</MessageCard>
          ) : filteredItems.length === 0 ? (
            <MessageCard>{contentCopy.messages.noFilteredFeed}</MessageCard>
          ) : (
            <>
              {filteredItems.map((item, index) => (
                <SocialFeedPost
                  accountAddress={accountAddress ?? null}
                  freeLabel={contentCopy.labels.free}
                  item={item}
                  key={item.contentId}
                  levelLabel={contentCopy.labels.level}
                  locale={locale}
                  missingEmailMessage={dictionary.member.errors.missingEmail}
                  onOpenDetail={saveFeedSnapshot}
                  onSocialChange={updateItemSocial}
                  priority={index < 2}
                  referralCode={referralCode}
                  viewDetailLabel={contentCopy.actions.viewDetail}
                />
              ))}

              <div ref={sentinelRef} />

              {isLoadingMore ? <InlineLoader /> : null}
              {!nextCursor && filteredItems.length > 0 ? (
                <div className="px-6 py-8 text-center text-xs font-medium text-slate-400">
                  {locale === "ko" ? "모든 피드를 확인했습니다." : "End of feed."}
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </main>
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
  onOpenDetail,
  onSocialChange,
  priority,
  referralCode,
  viewDetailLabel,
}: {
  accountAddress: string | null;
  freeLabel: string;
  item: ContentFeedItemRecord;
  levelLabel: string;
  locale: Locale;
  missingEmailMessage: string;
  onOpenDetail: () => void;
  onSocialChange: (
    contentId: string,
    social: ContentSocialSummaryRecord,
  ) => void;
  priority: boolean;
  referralCode: string | null;
  viewDetailLabel: string;
}) {
  const previewImageUrl = resolveFeedPreviewImage(item);
  const displayName = getDisplayName(item);
  const feedHref = buildPathWithReferral(`/${locale}/network-feed`, referralCode);
  const href = setPathSearchParams(
    buildPathWithReferral(`/${locale}/content/${item.contentId}`, referralCode),
    {
      returnTo: feedHref,
    },
  );
  const bridgeHref = buildPathWithReferral(
    `/${locale}/content/bridge/${item.contentId}`,
    referralCode,
  );
  const imageRef = useRef<HTMLDivElement | null>(null);
  const lastTapAtRef = useRef(0);
  const [social, setSocial] = useState<ContentSocialSummaryRecord>(() => ({
    ...item.social,
    likedByViewer:
      item.social.likedByViewer || readStoredFlag(`content-like:${item.contentId}`),
    savedByViewer:
      item.social.savedByViewer || readStoredFlag(`content-save:${item.contentId}`),
  }));
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

    return new URL(bridgeHref, window.location.origin).toString();
  }, [bridgeHref]);
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
          openComments: "댓글 보기",
          postComment: "게시",
          saved: "저장했습니다.",
          savePost: "저장",
          share: "공유",
          shareFailed: "공유할 수 없습니다.",
          sharing: "공유 중",
          signInRequired: "지갑 연결 후 사용할 수 있습니다.",
          submitCommentFailed: "댓글을 등록하지 못했습니다.",
          unsavePost: "저장 취소",
          unsaved: "저장을 취소했습니다.",
          undo: "되돌리기",
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
          openComments: "View comments",
          postComment: "Post",
          saved: "Saved.",
          savePost: "Save",
          share: "Share",
          shareFailed: "Sharing is unavailable.",
          sharing: "Sharing",
          signInRequired: "Connect your wallet to use this.",
          submitCommentFailed: "Failed to post comment.",
          unsavePost: "Unsave",
          unsaved: "Removed from saved.",
          undo: "Undo",
          writeComment: "Add a comment...",
        };

  useEffect(() => {
    writeStoredFlag(`content-like:${item.contentId}`, social.likedByViewer);
  }, [item.contentId, social.likedByViewer]);

  useEffect(() => {
    writeStoredFlag(`content-save:${item.contentId}`, social.savedByViewer);
  }, [item.contentId, social.savedByViewer]);

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

  const copyShareLink = useCallback(async () => {
    if (!shareUrl) {
      setShareState("error");
      setToast(actionCopy.shareFailed);
      return false;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
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

    if (typeof navigator.share === "function") {
      setShareState("sharing");

      try {
        await navigator.share({
          text: item.summary,
          title: item.title,
          url: shareUrl,
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

    await copyShareLink();
  }, [actionCopy.shareFailed, copyShareLink, item.summary, item.title, shareUrl]);

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
      if (event.pointerType !== "touch") {
        return;
      }

      const now = Date.now();

      if (now - lastTapAtRef.current < 280) {
        event.preventDefault();
        triggerLike(event.clientX, event.clientY);
      }

      lastTapAtRef.current = now;
    },
    [triggerLike],
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
            {levelLabel} {item.networkLevel ?? "-"} ·{" "}
            {formatDate(item.publishedAt ?? item.createdAt, locale)}
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
                onOpenDetail();
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
        className="relative block bg-slate-100"
        onDoubleClick={(event) => {
          triggerLike(event.clientX, event.clientY);
        }}
        onPointerUp={handleMediaPointerUp}
        ref={imageRef}
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

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Pill>{freeLabel}</Pill>
          <Pill>
            {levelLabel} {item.networkLevel ?? "-"}
          </Pill>
          {item.tags.slice(0, 3).map((tag) => (
            <Pill key={tag}>#{tag}</Pill>
          ))}
        </div>

        <Link href={href} onClick={onOpenDetail}>
          <h2 className="mt-3 line-clamp-2 text-[0.96rem] font-semibold leading-5 text-slate-950">
            {item.title}
          </h2>
        </Link>
        <p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-700">
          <span className="font-semibold">{displayName}</span> {item.summary}
        </p>
        {item.authorProfile?.intro ? (
          <p className="mt-2 line-clamp-1 text-xs text-slate-500">
            {item.authorProfile.intro}
          </p>
        ) : null}

        <Link
          className="mt-3 inline-flex text-sm font-semibold text-slate-950"
          href={href}
          onClick={onOpenDetail}
        >
          {viewDetailLabel}
        </Link>
      </div>
      {isCommentsOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-0 sm:px-4">
          <div className="max-h-[82vh] w-full max-w-[520px] overflow-hidden rounded-t-3xl bg-white shadow-[0_-18px_60px_rgba(15,23,42,0.22)] sm:mb-6 sm:rounded-3xl">
            <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-200" />
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
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

            <div className="max-h-[48vh] overflow-y-auto px-4 py-3">
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

            <div className="border-t border-slate-200 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
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

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[0.68rem] font-semibold text-slate-600">
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
