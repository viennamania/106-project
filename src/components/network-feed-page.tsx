"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  Bookmark,
  Heart,
  MessageCircle,
  MoreHorizontal,
  RefreshCcw,
  Rss,
  Send,
} from "lucide-react";
import {
  AutoConnect,
  useActiveAccount,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { getContentCopy } from "@/lib/content-copy";
import type {
  ContentFeedItemRecord,
  ContentFeedLoadResponse,
} from "@/lib/content";
import {
  buildPathWithReferral,
  buildReferralLandingPath,
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

type FeedLevelFilter = "all" | "extended" | "nearby";

type FeedCreatorSummary = {
  avatarImageUrl: string | null;
  closestLevel: number | null;
  contentCount: number;
  displayName: string;
  intro: string | null;
  key: string;
};

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
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<FeedState>({
    error: null,
    items: [],
    member: null,
    status: "idle",
  });
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [levelFilter, setLevelFilter] = useState<FeedLevelFilter>("all");
  const [selectedCreatorKey, setSelectedCreatorKey] = useState<string | null>(
    null,
  );

  const isInitialLoading =
    state.status === "loading" && state.items.length === 0 && !state.error;

  const filteredItems = useMemo(() => {
    return state.items.filter((item) => {
      const level = item.networkLevel ?? 6;
      const matchesCreator =
        !selectedCreatorKey || item.authorEmail === selectedCreatorKey;

      if (!matchesCreator) {
        return false;
      }

      if (levelFilter === "nearby") {
        return level <= 2;
      }

      if (levelFilter === "extended") {
        return level >= 3;
      }

      return true;
    });
  }, [levelFilter, selectedCreatorKey, state.items]);

  const nearbyCount = useMemo(() => {
    return state.items.filter((item) => (item.networkLevel ?? 6) <= 2).length;
  }, [state.items]);
  const extendedCount = useMemo(() => {
    return state.items.filter((item) => (item.networkLevel ?? 6) >= 3).length;
  }, [state.items]);
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

  const filterItems = useMemo(
    () => [
      {
        count: state.items.length,
        key: "all" as const,
        label: contentCopy.labels.allLevels,
      },
      {
        count: nearbyCount,
        key: "nearby" as const,
        label: contentCopy.labels.nearbyLevels,
      },
      {
        count: extendedCount,
        key: "extended" as const,
        label: contentCopy.labels.extendedLevels,
      },
    ],
    [
      contentCopy.labels.allLevels,
      contentCopy.labels.extendedLevels,
      contentCopy.labels.nearbyLevels,
      extendedCount,
      nearbyCount,
      state.items.length,
    ],
  );

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

  const loadFeed = useCallback(
    async (options?: { append?: boolean; cursor?: string | null }) => {
      const append = Boolean(options?.append);
      const cursor = options?.cursor ?? null;

      if (append) {
        if (!cursor || isLoadingMore) {
          return;
        }
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
      isLoadingMore,
      isPublicReferralFeed,
      locale,
      mergeItems,
      referralCode,
    ],
  );

  useEffect(() => {
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
  }, [accountAddress, isPublicReferralFeed, loadFeed, status]);

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

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filterItems.map((item) => (
              <button
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  levelFilter === item.key
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
                key={item.key}
                onClick={() => {
                  setLevelFilter(item.key);
                }}
                type="button"
              >
                <span>{item.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[0.65rem] ${
                    levelFilter === item.key
                      ? "bg-white text-slate-950"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.count}
                </span>
              </button>
            ))}
            {selectedCreatorKey ? (
              <button
                className="inline-flex shrink-0 items-center rounded-full border border-slate-950 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white"
                onClick={() => {
                  setSelectedCreatorKey(null);
                }}
                type="button"
              >
                {locale === "ko" ? "크리에이터 해제" : "Clear creator"}
              </button>
            ) : null}
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
                  freeLabel={contentCopy.labels.free}
                  item={item}
                  key={item.contentId}
                  levelLabel={contentCopy.labels.level}
                  locale={locale}
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
  freeLabel,
  item,
  levelLabel,
  locale,
  priority,
  referralCode,
  viewDetailLabel,
}: {
  freeLabel: string;
  item: ContentFeedItemRecord;
  levelLabel: string;
  locale: Locale;
  priority: boolean;
  referralCode: string | null;
  viewDetailLabel: string;
}) {
  const previewImageUrl = resolveFeedPreviewImage(item);
  const displayName = getDisplayName(item);
  const href = buildPathWithReferral(
    `/${locale}/content/${item.contentId}`,
    referralCode,
  );

  return (
    <article className="border-b border-slate-200 bg-white">
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
        <MoreHorizontal className="size-5 shrink-0 text-slate-500" />
      </div>

      <Link
        className="block bg-slate-100"
        href={href}
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
      </Link>

      <div className="px-3 pb-4 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Heart className="size-6 text-slate-950" />
            <MessageCircle className="size-6 text-slate-950" />
            <Send className="size-6 text-slate-950" />
          </div>
          <Bookmark className="size-6 text-slate-950" />
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

        <Link href={href}>
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
        >
          {viewDetailLabel}
        </Link>
      </div>
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
