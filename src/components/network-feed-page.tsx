"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  RefreshCcw,
  Rss,
  UserRound,
} from "lucide-react";
import {
  AutoConnect,
  useActiveAccount,
  useActiveWalletChain,
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

const INITIAL_VISIBLE_ITEM_COUNT = 6;
const VISIBLE_ITEM_INCREMENT = 6;

function resolveFeedPreviewImage(item: Pick<ContentFeedItemRecord, "coverImageUrl" | "contentImageUrls">) {
  return item.coverImageUrl ?? item.contentImageUrls[0] ?? null;
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
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const homeHref = buildReferralLandingPath(locale, referralCode);
  const activateHref = buildPathWithReferral(`/${locale}/activate`, referralCode);
  const [state, setState] = useState<FeedState>({
    error: null,
    items: [],
    member: null,
    status: "idle",
  });
  const [levelFilter, setLevelFilter] = useState<FeedLevelFilter>("all");
  const [visibleItemCount, setVisibleItemCount] = useState(
    INITIAL_VISIBLE_ITEM_COUNT,
  );
  const isDisconnected = status !== "connected" || !accountAddress;
  const isPublicReferralFeed = Boolean(referralCode);
  const isInitialLoading =
    state.status === "loading" &&
    !state.error &&
    !state.member &&
    state.items.length === 0;
  const filteredItems = useMemo(() => {
    return state.items.filter((item) => {
      const level = item.networkLevel ?? 6;

      if (levelFilter === "nearby") {
        return level <= 2;
      }

      if (levelFilter === "extended") {
        return level >= 3;
      }

      return true;
    });
  }, [levelFilter, state.items]);
  const featuredItem = filteredItems[0] ?? null;
  const featuredImageUrl = featuredItem ? resolveFeedPreviewImage(featuredItem) : null;
  const listItems = featuredItem
    ? filteredItems.slice(1, visibleItemCount + 1)
    : filteredItems.slice(0, visibleItemCount);
  const nearbyCount = useMemo(() => {
    return state.items.filter((item) => (item.networkLevel ?? 6) <= 2).length;
  }, [state.items]);
  const extendedCount = useMemo(() => {
    return state.items.filter((item) => (item.networkLevel ?? 6) >= 3).length;
  }, [state.items]);
  const uniqueCreatorCount = useMemo(() => {
    return new Set(
      state.items.map((item) => item.authorProfile?.displayName ?? item.authorEmail),
    ).size;
  }, [state.items]);
  const closestLevel = useMemo(() => {
    if (state.items.length === 0) {
      return "1~6";
    }

    const levels = state.items
      .map((item) => item.networkLevel ?? 6)
      .filter((level) => Number.isFinite(level));

    return `${Math.min(...levels)}~6`;
  }, [state.items]);
  const canShowMore = filteredItems.length > (featuredItem ? listItems.length + 1 : listItems.length);
  const canShowLess = visibleItemCount > INITIAL_VISIBLE_ITEM_COUNT;
  const creatorSummaries = useMemo<FeedCreatorSummary[]>(() => {
    const map = new Map<string, FeedCreatorSummary>();

    for (const item of filteredItems) {
      const key = item.authorEmail;
      const current = map.get(key);
      const nextLevel = item.networkLevel ?? null;
      const nextDisplayName =
        item.authorProfile?.displayName?.trim() || item.authorEmail;
      const nextIntro = item.authorProfile?.intro?.trim() || null;
      const nextAvatarImageUrl = item.authorProfile?.avatarImageUrl ?? null;

      if (!current) {
        map.set(key, {
          avatarImageUrl: nextAvatarImageUrl,
          closestLevel: nextLevel,
          contentCount: 1,
          displayName: nextDisplayName,
          intro: nextIntro,
          key,
        });
        continue;
      }

      current.contentCount += 1;
      if (
        nextLevel !== null &&
        (current.closestLevel === null || nextLevel < current.closestLevel)
      ) {
        current.closestLevel = nextLevel;
      }
      if (!current.intro && nextIntro) {
        current.intro = nextIntro;
      }
      if (!current.avatarImageUrl && nextAvatarImageUrl) {
        current.avatarImageUrl = nextAvatarImageUrl;
      }
    }

    return [...map.values()]
      .sort((left, right) => {
        const leftLevel = left.closestLevel ?? 999;
        const rightLevel = right.closestLevel ?? 999;

        if (leftLevel !== rightLevel) {
          return leftLevel - rightLevel;
        }

        return right.contentCount - left.contentCount;
      })
      .slice(0, 4);
  }, [filteredItems]);
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

  useEffect(() => {
    setVisibleItemCount(INITIAL_VISIBLE_ITEM_COUNT);
  }, [levelFilter, state.items.length]);

  const loadFeed = useCallback(async () => {
    setState((current) => ({
      ...current,
      error: null,
      status: "loading",
    }));

    try {
      const response = isPublicReferralFeed
        ? await fetch(
            `/api/content/feed?${new URLSearchParams({
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

              return fetch("/api/content/feed", {
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

      if (!isPublicReferralFeed && "validationError" in data && data.validationError) {
        setState({
          error: data.validationError,
          items: [],
          member,
          status: "ready",
        });
        return;
      }

      if (!isPublicReferralFeed && member?.status !== "completed") {
        setState({
          error: contentCopy.messages.paymentRequired,
          items: [],
          member,
          status: "ready",
        });
        return;
      }

      setState({
        error: null,
        items: "items" in data ? data.items : [],
        member,
        status: "ready",
      });
    } catch (error) {
      setState({
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.feedLoadFailed,
        items: [],
        member: null,
        status: "error",
      });
    }
  }, [
    accountAddress,
    chain.id,
    chain.name,
    contentCopy.messages.feedLoadFailed,
    contentCopy.messages.memberMissing,
    contentCopy.messages.paymentRequired,
    dictionary.member.errors.missingEmail,
    isPublicReferralFeed,
    locale,
    referralCode,
  ]);

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
      return;
    }

    void loadFeed();
  }, [accountAddress, isPublicReferralFeed, loadFeed, status]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      {hasThirdwebClientId ? (
        <AutoConnect
          accountAbstraction={smartWalletOptions}
          appMetadata={appMetadata}
          chain={smartWalletChain}
          client={thirdwebClient}
          wallets={supportedWallets}
        />
      ) : null}

      <header className="sticky top-[calc(env(safe-area-inset-top)+0.75rem)] z-30 relative overflow-hidden rounded-[28px] border border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.58),transparent_36%),radial-gradient(circle_at_right,rgba(254,240,138,0.28),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.92),rgba(248,250,252,0.92))] px-4 py-4 shadow-[0_20px_48px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:px-6 sm:py-5 lg:static lg:bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.72),transparent_36%),radial-gradient(circle_at_right,rgba(254,240,138,0.36),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] lg:shadow-[0_24px_60px_rgba(15,23,42,0.10)]">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(148,163,184,0.6),transparent)]" />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <Link
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/92 text-slate-800 shadow-[0_14px_28px_rgba(15,23,42,0.10)] transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white sm:size-12"
                href={homeHref}
              >
                <ArrowLeft className="size-4 sm:size-5" />
              </Link>

              <div className="min-w-0">
                <div className="flex items-start gap-3">
                  <div className="hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_18px_30px_rgba(15,23,42,0.18)] sm:inline-flex">
                    <Rss className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="eyebrow hidden sm:block">{contentCopy.page.feedEyebrow}</p>
                    <h1 className="text-[1.15rem] font-semibold tracking-tight text-slate-950 sm:text-[1.45rem]">
                      {contentCopy.page.feedTitle}
                    </h1>
                    <p className="mt-1 max-w-2xl text-[0.92rem] leading-6 text-slate-600 sm:text-sm sm:leading-6">
                      {isInitialLoading
                        ? contentCopy.messages.feedLoadingDescription
                        : isPublicReferralFeed
                          ? contentCopy.page.feedDescription
                          : isDisconnected
                            ? contentCopy.messages.connectRequired
                            : state.member?.status === "completed"
                              ? contentCopy.page.feedDescription
                              : contentCopy.messages.paymentRequired}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-white/80 bg-white/92 px-4 text-sm font-semibold text-slate-950 shadow-[0_14px_28px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white"
              onClick={() => {
                void loadFeed();
              }}
              type="button"
            >
              <RefreshCcw className="size-4" />
              <span className="hidden sm:inline">{contentCopy.actions.refresh}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <HeaderStatChip
              label={contentCopy.labels.networkAccess}
              loading={isInitialLoading}
              value={closestLevel}
            />
            <HeaderStatChip
              label={contentCopy.labels.posts}
              loading={isInitialLoading}
              value={String(state.items.length)}
            />
            <HeaderStatChip
              label={contentCopy.labels.creators}
              loading={isInitialLoading}
              value={String(uniqueCreatorCount)}
            />
            <HeaderStatChip
              label={contentCopy.labels.nearbyLevels}
              loading={isInitialLoading}
              value={String(nearbyCount)}
            />
          </div>
        </div>
      </header>

      <section className="grid gap-5 xl:grid-cols-[1.16fr_0.84fr]">
        <div className="space-y-5">
          {!isPublicReferralFeed && isDisconnected ? (
            <MessageCard>{contentCopy.messages.connectRequired}</MessageCard>
          ) : isInitialLoading ? (
            <FeedLoadingSkeleton copy={contentCopy} />
          ) : state.error ? (
            <MessageCard tone="error">
              {state.error}
              {!isPublicReferralFeed && state.member?.status !== "completed" ? (
                <span className="mt-3 block">
                  <Link className="font-semibold text-slate-950 underline" href={activateHref}>
                    {dictionary.referralsPage.actions.completeSignup}
                  </Link>
                </span>
              ) : null}
            </MessageCard>
          ) : state.items.length === 0 ? (
            <MessageCard>{contentCopy.labels.feedEmpty}</MessageCard>
          ) : (
            <>
              {featuredItem ? (
                <article className="overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,245,249,0.94))] shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
                  <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{contentCopy.labels.featured}</Badge>
                        <Badge>{contentCopy.labels.free}</Badge>
                        <Badge>
                          {`${contentCopy.labels.level} ${featuredItem.networkLevel ?? "-"}`}
                        </Badge>
                        <Badge>
                          {featuredItem.authorProfile?.displayName ?? featuredItem.authorEmail}
                        </Badge>
                      </div>
                      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                        {featuredItem.title}
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                        {featuredItem.summary}
                      </p>
                      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          {formatDate(
                            featuredItem.publishedAt ?? featuredItem.createdAt,
                            locale,
                          )}
                        </p>
                        <Link
                          className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-semibold !text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
                          href={buildPathWithReferral(
                            `/${locale}/content/${featuredItem.contentId}`,
                            referralCode,
                          )}
                        >
                          {contentCopy.actions.viewDetail}
                        </Link>
                      </div>
                    </div>
                    {featuredImageUrl ? (
                      <div className="min-h-[260px] border-t border-white/60 lg:min-h-full lg:border-l lg:border-t-0">
                        <div
                          className="h-full min-h-[260px] w-full bg-cover bg-center"
                          style={{
                            backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.04), rgba(15,23,42,0.28)), url(${featuredImageUrl})`,
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex min-h-[260px] items-end border-t border-white/60 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.82),transparent_45%),linear-gradient(135deg,#dbeafe_0%,#eff6ff_52%,#fde68a_100%)] p-6 lg:border-l lg:border-t-0">
                        <div className="max-w-sm">
                          <p className="eyebrow">{contentCopy.page.feedEyebrow}</p>
                          <p className="mt-3 text-base font-medium text-slate-700">
                            {contentCopy.entry.viewerDescription}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              ) : null}

              <div className="rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] p-5 shadow-[0_22px_55px_rgba(15,23,42,0.08)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="eyebrow">{contentCopy.page.feedEyebrow}</p>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                      {contentCopy.page.feedTitle}
                    </h2>
                  </div>
                  <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                    {filteredItems.length}/{state.items.length} {contentCopy.labels.posts}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {filterItems.map((item) => (
                    <button
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                        levelFilter === item.key
                          ? "border-slate-950 bg-slate-950 !text-white shadow-[0_16px_36px_rgba(15,23,42,0.2)]"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      key={item.key}
                      onClick={() => {
                        setLevelFilter(item.key);
                      }}
                      type="button"
                    >
                      <span>{item.label}</span>
                      <span
                        className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[0.7rem] ${
                          levelFilter === item.key
                            ? "bg-white text-slate-950"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {creatorSummaries.length > 0 ? (
                <div className="rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] p-5 shadow-[0_22px_55px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="eyebrow">{contentCopy.labels.creators}</p>
                      <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                        {contentCopy.labels.creators}
                      </h2>
                    </div>
                    <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
                      {creatorSummaries.length} {contentCopy.labels.creators}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {creatorSummaries.map((creator) => (
                      <CreatorSpotlightCard
                        creator={creator}
                        key={creator.key}
                        levelLabel={contentCopy.labels.level}
                        postsLabel={contentCopy.labels.posts}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {filteredItems.length === 0 ? (
                <MessageCard>{contentCopy.messages.noFilteredFeed}</MessageCard>
              ) : listItems.length === 0 ? null : (
                <div className="grid gap-4 md:grid-cols-2">
                  {listItems.map((item) => (
                    <FeedPostCard
                      freeLabel={contentCopy.labels.free}
                      item={item}
                      key={item.contentId}
                      levelLabel={contentCopy.labels.level}
                      locale={locale}
                      referralCode={referralCode}
                      viewDetailLabel={contentCopy.actions.viewDetail}
                    />
                  ))}
                </div>
              )}

              {filteredItems.length > 0 && (canShowMore || canShowLess) ? (
                <div className="flex flex-wrap gap-2">
                  {canShowMore ? (
                    <button
                      className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
                      onClick={() => {
                        setVisibleItemCount(
                          (current) => current + VISIBLE_ITEM_INCREMENT,
                        );
                      }}
                      type="button"
                    >
                      {contentCopy.actions.showMore}
                    </button>
                  ) : null}
                  {canShowLess ? (
                    <button
                      className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
                      onClick={() => {
                        setVisibleItemCount(INITIAL_VISIBLE_ITEM_COUNT);
                      }}
                      type="button"
                    >
                      {contentCopy.actions.showLess}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start xl:space-y-5">
          <div className="hidden rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] p-4 shadow-[0_22px_55px_rgba(15,23,42,0.08)] sm:rounded-[30px] sm:p-5 xl:block">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[18px] bg-slate-950 text-white sm:size-12 sm:rounded-2xl">
                <Rss className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="eyebrow hidden sm:block">{contentCopy.page.feedEyebrow}</p>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
                  {contentCopy.page.feedTitle}
                </h2>
              </div>
            </div>
            <p className="mt-3 text-[0.92rem] leading-6 text-slate-600 sm:mt-4 sm:text-sm">
              {isInitialLoading
                ? contentCopy.messages.feedLoadingDescription
                : contentCopy.page.feedDescription}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:gap-3">
              <MetricCard
                label={contentCopy.labels.networkAccess}
                loading={isInitialLoading}
                value={closestLevel}
              />
              <MetricCard
                label={contentCopy.labels.posts}
                loading={isInitialLoading}
                value={String(state.items.length)}
              />
              <MetricCard
                label={contentCopy.labels.creators}
                loading={isInitialLoading}
                value={String(uniqueCreatorCount)}
              />
              <MetricCard
                label={contentCopy.labels.nearbyLevels}
                loading={isInitialLoading}
                value={String(nearbyCount)}
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] p-4 shadow-[0_22px_55px_rgba(15,23,42,0.08)] sm:rounded-[30px] sm:p-5">
            <div>
              <p className="eyebrow hidden sm:block">{contentCopy.page.feedEyebrow}</p>
              <h2 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
                {contentCopy.entry.viewerTitle}
              </h2>
            </div>
            <p className="mt-3 text-[0.92rem] leading-6 text-slate-600 sm:mt-4 sm:text-sm">
              {contentCopy.entry.viewerDescription}
            </p>
            <div className="mt-3 grid gap-2.5 sm:mt-4 sm:gap-3">
              <FeedActionCard
                description={contentCopy.actions.backHome}
                href={homeHref}
                icon={<UserRound className="size-5" />}
                title={contentCopy.actions.backHome}
              />
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  loading = false,
  value,
}: {
  label: string;
  loading?: boolean;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/80 bg-white/90 px-3 py-3 sm:rounded-[22px] sm:px-4 sm:py-4">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[0.68rem] sm:tracking-[0.18em]">
        {label}
      </p>
      {loading ? (
        <div className="mt-2 h-8 w-16 rounded-full bg-slate-200/80 motion-safe:animate-pulse" />
      ) : (
        <p className="mt-1.5 text-[1.65rem] font-semibold tracking-tight text-slate-950 sm:mt-2 sm:text-2xl">
          {value}
        </p>
      )}
    </div>
  );
}

function HeaderStatChip({
  label,
  loading = false,
  value,
}: {
  label: string;
  loading?: boolean;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/80 bg-white/88 px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur sm:min-w-[128px] sm:px-4">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      {loading ? (
        <div className="mt-2 h-7 w-16 rounded-full bg-slate-200/80 motion-safe:animate-pulse" />
      ) : (
        <p className="mt-1 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
          {value}
        </p>
      )}
    </div>
  );
}

function FeedLoadingSkeleton({
  copy,
}: {
  copy: ReturnType<typeof getContentCopy>;
}) {
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,245,249,0.94))] shadow-[0_28px_80px_rgba(15,23,42,0.12)]">
        <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap gap-2">
              <div className="h-8 w-24 rounded-full bg-slate-200/80 motion-safe:animate-pulse" />
              <div className="h-8 w-20 rounded-full bg-slate-200/70 motion-safe:animate-pulse" />
              <div className="h-8 w-24 rounded-full bg-slate-200/70 motion-safe:animate-pulse" />
            </div>
            <div className="h-10 w-4/5 rounded-[20px] bg-slate-200/80 motion-safe:animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 rounded-full bg-slate-200/70 motion-safe:animate-pulse" />
              <div className="h-4 w-3/4 rounded-full bg-slate-200/70 motion-safe:animate-pulse" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="h-4 w-32 rounded-full bg-slate-200/70 motion-safe:animate-pulse" />
              <div className="h-11 w-28 rounded-full bg-slate-200/80 motion-safe:animate-pulse" />
            </div>
          </div>
          <div className="min-h-[260px] bg-slate-200/80 motion-safe:animate-pulse" />
        </div>
      </div>

      <div className="rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] p-5 shadow-[0_22px_55px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <div className="h-4 w-28 rounded-full bg-slate-200/70 motion-safe:animate-pulse" />
            <div className="h-8 w-44 rounded-full bg-slate-200/80 motion-safe:animate-pulse" />
          </div>
          <div className="h-10 w-28 rounded-full bg-slate-200/80 motion-safe:animate-pulse" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              className="h-10 w-28 rounded-full bg-slate-200/80 motion-safe:animate-pulse"
              key={index}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] p-5 shadow-[0_20px_48px_rgba(15,23,42,0.08)]"
            key={index}
          >
            <div className="mb-4 h-40 rounded-[22px] bg-slate-200/80 motion-safe:animate-pulse sm:h-48" />
            <div className="flex gap-2">
              <div className="h-7 w-16 rounded-full bg-slate-200/80 motion-safe:animate-pulse" />
              <div className="h-7 w-20 rounded-full bg-slate-200/70 motion-safe:animate-pulse" />
            </div>
            <div className="mt-4 h-8 w-4/5 rounded-full bg-slate-200/80 motion-safe:animate-pulse" />
            <div className="mt-3 space-y-2">
              <div className="h-4 rounded-full bg-slate-200/70 motion-safe:animate-pulse" />
              <div className="h-4 w-2/3 rounded-full bg-slate-200/70 motion-safe:animate-pulse" />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="h-4 w-24 rounded-full bg-slate-200/70 motion-safe:animate-pulse" />
              <div className="h-11 w-24 rounded-full bg-slate-200/80 motion-safe:animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      <MessageCard>{copy.messages.feedLoadingTitle}</MessageCard>
    </div>
  );
}

function FeedPostCard({
  freeLabel,
  item,
  levelLabel,
  locale,
  referralCode,
  viewDetailLabel,
}: {
  freeLabel: string;
  item: ContentFeedItemRecord;
  levelLabel: string;
  locale: Locale;
  referralCode: string | null;
  viewDetailLabel: string;
}) {
  const previewImageUrl = resolveFeedPreviewImage(item);

  return (
    <article className="rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] p-5 shadow-[0_20px_48px_rgba(15,23,42,0.08)]">
      {previewImageUrl ? (
        <div className="mb-4 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-900/90">
          <div
            className="h-40 w-full bg-cover bg-center sm:h-48"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.24)), url(${previewImageUrl})`,
            }}
          />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{freeLabel}</Badge>
        <Badge>{`${levelLabel} ${item.networkLevel ?? "-"}`}</Badge>
        <Badge>{item.authorProfile?.displayName ?? item.authorEmail}</Badge>
      </div>
      <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
        {item.title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
          {formatDate(item.publishedAt ?? item.createdAt, locale)}
        </p>
        <Link
          className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-semibold !text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
          href={buildPathWithReferral(`/${locale}/content/${item.contentId}`, referralCode)}
        >
          {viewDetailLabel}
        </Link>
      </div>
    </article>
  );
}

function FeedActionCard({
  description,
  href,
  icon,
  title,
}: {
  description: string;
  href: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Link
      className="flex items-start justify-between gap-3 rounded-[22px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_52px_rgba(15,23,42,0.12)] sm:gap-4 sm:rounded-[26px] sm:p-5"
      href={href}
    >
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[18px] bg-slate-950 text-white sm:size-12 sm:rounded-2xl">
          {icon}
        </div>
        <div className="min-w-0 pt-0.5 sm:pt-1">
          <h3 className="text-[0.97rem] font-semibold tracking-tight text-slate-950 sm:text-base">
            {title}
          </h3>
          <p className="mt-1 text-[0.86rem] leading-5 text-slate-600 sm:mt-2 sm:text-sm sm:leading-6">
            {description}
          </p>
        </div>
      </div>
      <div className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 sm:size-10">
        <ArrowUpRight className="size-4" />
      </div>
    </Link>
  );
}

function CreatorSpotlightCard({
  creator,
  levelLabel,
  postsLabel,
}: {
  creator: FeedCreatorSummary;
  levelLabel: string;
  postsLabel: string;
}) {
  return (
    <article className="rounded-[24px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
      <div className="flex items-start gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-slate-200 bg-slate-950/95 text-white shadow-[0_16px_32px_rgba(15,23,42,0.14)]">
          {creator.avatarImageUrl ? (
            <div
              className="h-full w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${creator.avatarImageUrl})` }}
            />
          ) : (
            <UserRound className="size-6" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold tracking-tight text-slate-950">
            {creator.displayName}
          </h3>
          {creator.intro ? (
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
              {creator.intro}
            </p>
          ) : (
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {levelLabel} {creator.closestLevel ?? "-"} · {postsLabel}{" "}
              {creator.contentCount}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>{`${postsLabel} ${creator.contentCount}`}</Badge>
        <Badge>{`${levelLabel} ${creator.closestLevel ?? "-"}`}</Badge>
      </div>
    </article>
  );
}

function Badge({
  children,
}: {
  children: string;
}) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-slate-700">
      {children}
    </span>
  );
}

function MessageCard({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "error" | "neutral";
}) {
  return (
    <div
      className={
        tone === "error"
          ? "rounded-[24px] border border-rose-200 bg-[linear-gradient(180deg,#fff1f2,#ffe4e6)] px-4 py-4 text-sm leading-6 text-rose-900 shadow-[0_18px_44px_rgba(244,63,94,0.08)]"
          : "rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] px-4 py-4 text-sm leading-6 text-slate-600 shadow-[0_18px_44px_rgba(15,23,42,0.06)]"
      }
    >
      {children}
    </div>
  );
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
