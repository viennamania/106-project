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
  useActiveWallet,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
  useDisconnect,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { LanguageSwitcher } from "@/components/language-switcher";
import { getContentCopy } from "@/lib/content-copy";
import type { ContentFeedItemRecord, ContentFeedResponse } from "@/lib/content";
import {
  buildPathWithReferral,
  buildReferralLandingPath,
} from "@/lib/landing-branding";
import type { MemberRecord, SyncMemberResponse } from "@/lib/member";
import {
  BSC_EXPLORER,
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

const INITIAL_VISIBLE_ITEM_COUNT = 6;
const VISIBLE_ITEM_INCREMENT = 6;

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
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
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
        throw new Error(dictionary.member.errors.missingEmail);
      }

      const syncResponse = await fetch("/api/members", {
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
      const syncData = (await syncResponse.json()) as
        | SyncMemberResponse
        | { error?: string };

      if (!syncResponse.ok) {
        throw new Error(
          "error" in syncData && syncData.error
            ? syncData.error
            : contentCopy.messages.feedLoadFailed,
        );
      }

      const member = "member" in syncData ? syncData.member : null;

      if (!member) {
        throw new Error(contentCopy.messages.memberMissing);
      }

      if ("validationError" in syncData && syncData.validationError) {
        setState({
          error: syncData.validationError,
          items: [],
          member,
          status: "ready",
        });
        return;
      }

      if (member.status !== "completed") {
        setState({
          error: contentCopy.messages.paymentRequired,
          items: [],
          member,
          status: "ready",
        });
        return;
      }

      const response = await fetch(
        `/api/content/feed?email=${encodeURIComponent(email)}`,
      );
      const data = (await response.json()) as ContentFeedResponse | {
        error?: string;
      };

      if (!response.ok || !("items" in data) || !("member" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : contentCopy.messages.feedLoadFailed,
        );
      }

      setState({
        error: null,
        items: data.items,
        member: data.member,
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
    locale,
  ]);

  useEffect(() => {
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
  }, [accountAddress, loadFeed, status]);

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

      <header className="glass-card flex flex-col gap-4 rounded-[28px] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            href={homeHref}
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="space-y-1">
            <p className="eyebrow">{contentCopy.page.feedEyebrow}</p>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                {contentCopy.page.feedTitle}
              </h1>
              <p className="text-sm text-slate-600">
                {contentCopy.page.feedDescription}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
          <LanguageSwitcher
            label={dictionary.common.languageLabel}
            locale={locale}
          />
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
            onClick={() => {
              void loadFeed();
            }}
            type="button"
          >
            <RefreshCcw className="size-4" />
            {contentCopy.actions.refresh}
          </button>
          {status === "connected" && accountAddress ? (
            <button
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
              onClick={() => {
                if (wallet) {
                  disconnect(wallet);
                }
              }}
              type="button"
            >
              {contentCopy.actions.disconnect}
            </button>
          ) : null}
        </div>
      </header>

      <section className="grid gap-5 xl:grid-cols-[1.14fr_0.86fr]">
        <div className="space-y-5">
          {isDisconnected ? (
            <MessageCard>{contentCopy.messages.connectRequired}</MessageCard>
          ) : state.status === "loading" ? (
            <MessageCard>{contentCopy.actions.refresh}...</MessageCard>
          ) : state.error ? (
            <MessageCard tone="error">
              {state.error}
              {state.member?.status !== "completed" ? (
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
                <article className="glass-card overflow-hidden rounded-[32px]">
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
                    {featuredItem.coverImageUrl ? (
                      <div className="min-h-[240px] border-t border-white/50 lg:min-h-full lg:border-l lg:border-t-0">
                        <div
                          className="h-full min-h-[240px] w-full bg-cover bg-center"
                          style={{
                            backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.24)), url(${featuredItem.coverImageUrl})`,
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex min-h-[240px] items-end border-t border-white/50 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.82),transparent_45%),linear-gradient(135deg,#dbeafe_0%,#eff6ff_52%,#fde68a_100%)] p-6 lg:border-l lg:border-t-0">
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

              <div className="glass-card rounded-[30px] p-5">
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

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <div className="glass-card rounded-[30px] p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Rss className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="eyebrow">{contentCopy.page.feedEyebrow}</p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                  {contentCopy.page.feedTitle}
                </h2>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {isDisconnected
                ? contentCopy.messages.connectRequired
                : state.member?.status === "completed"
                  ? contentCopy.page.feedDescription
                  : contentCopy.messages.paymentRequired}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <MetricCard
                label={contentCopy.labels.networkAccess}
                value={closestLevel}
              />
              <MetricCard
                label={contentCopy.labels.posts}
                value={String(state.items.length)}
              />
              <MetricCard
                label={contentCopy.labels.creators}
                value={String(uniqueCreatorCount)}
              />
              <MetricCard
                label={contentCopy.labels.nearbyLevels}
                value={String(nearbyCount)}
              />
            </div>

            {accountAddress ? (
              <a
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition hover:text-slate-950"
                href={`${BSC_EXPLORER}/address/${accountAddress}`}
                rel="noreferrer"
                target="_blank"
              >
                {accountAddress.slice(0, 6)}...{accountAddress.slice(-4)}
                <ArrowUpRight className="size-4" />
              </a>
            ) : null}
          </div>

          <div className="glass-card rounded-[30px] p-5">
            <div>
              <p className="eyebrow">{contentCopy.page.feedEyebrow}</p>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                {contentCopy.entry.viewerTitle}
              </h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {contentCopy.entry.viewerDescription}
            </p>
            <div className="mt-4 grid gap-3">
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
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/80 bg-white/90 px-4 py-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
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
  return (
    <article className="glass-card rounded-[28px] p-5">
      {item.coverImageUrl ? (
        <div className="mb-4 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-900/90">
          <div
            className="h-40 w-full bg-cover bg-center sm:h-48"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.24)), url(${item.coverImageUrl})`,
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
      className="glass-card flex items-start justify-between gap-4 rounded-[26px] p-5 transition hover:-translate-y-0.5 hover:shadow-[0_18px_55px_rgba(15,23,42,0.12)]"
      href={href}
    >
      <div className="flex min-w-0 items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
          {icon}
        </div>
        <div className="min-w-0 pt-1">
          <h3 className="text-base font-semibold tracking-tight text-slate-950">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
      <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950">
        <ArrowUpRight className="size-4" />
      </div>
    </Link>
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
          ? "rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-900"
          : "rounded-[24px] border border-slate-200 bg-white/90 px-4 py-4 text-sm leading-6 text-slate-600"
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
