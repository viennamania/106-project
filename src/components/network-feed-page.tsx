"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, RefreshCcw, Rss } from "lucide-react";
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
  const studioHref = buildPathWithReferral(`/${locale}/creator/studio`, referralCode);
  const activateHref = buildPathWithReferral(`/${locale}/activate`, referralCode);
  const [state, setState] = useState<FeedState>({
    error: null,
    items: [],
    member: null,
    status: "idle",
  });
  const isDisconnected = status !== "connected" || !accountAddress;

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
            className="inline-flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
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
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
            href={studioHref}
          >
            {contentCopy.actions.openStudio}
          </Link>
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

      <section className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="glass-card rounded-[30px] p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Rss className="size-5" />
            </div>
            <div>
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
                ? contentCopy.labels.studioNotice
                : contentCopy.messages.paymentRequired}
          </p>

          <div className="mt-5 space-y-3">
            <MetricCard
              label={contentCopy.labels.networkAccess}
              value={
                state.items.length > 0
                  ? `${Math.min(
                      ...state.items
                        .map((item) => item.networkLevel ?? 6)
                        .filter(Boolean),
                    )}~6`
                  : "1~6"
              }
            />
            <MetricCard
              label={contentCopy.labels.posts}
              value={String(state.items.length)}
            />
            <MetricCard
              label={contentCopy.labels.author}
              value={state.items[0]?.authorProfile?.displayName ?? "-"}
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

        <div className="space-y-3">
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
            state.items.map((item) => (
              <article
                className="glass-card rounded-[28px] p-5"
                key={item.contentId}
              >
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
                  <Badge>{contentCopy.labels.free}</Badge>
                  <Badge>
                    {`${contentCopy.labels.level} ${item.networkLevel ?? "-"}`}
                  </Badge>
                  <Badge>{item.authorProfile?.displayName ?? item.authorEmail}</Badge>
                </div>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {item.summary}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {formatDate(item.publishedAt ?? item.createdAt, locale)}
                  </p>
                  <Link
                    className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                    href={buildPathWithReferral(
                      `/${locale}/content/${item.contentId}`,
                      referralCode,
                    )}
                  >
                    {contentCopy.actions.viewDetail}
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
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
