"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, FileText, RefreshCcw } from "lucide-react";
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
import type { ContentDetailResponse } from "@/lib/content";
import {
  buildPathWithReferral,
  buildReferralLandingPath,
} from "@/lib/landing-branding";
import type { MemberRecord, SyncMemberResponse } from "@/lib/member";
import {
  getAppMetadata,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";
import type { Dictionary, Locale } from "@/lib/i18n";

type DetailState = {
  content: ContentDetailResponse["content"] | null;
  error: string | null;
  member: MemberRecord | null;
  status: "idle" | "loading" | "ready" | "error";
};

export function ContentDetailPage({
  contentId,
  dictionary,
  locale,
  referralCode = null,
}: {
  contentId: string;
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
  const feedHref = buildPathWithReferral(`/${locale}/network-feed`, referralCode);
  const studioHref = buildPathWithReferral(`/${locale}/creator/studio`, referralCode);
  const activateHref = buildPathWithReferral(`/${locale}/activate`, referralCode);
  const [state, setState] = useState<DetailState>({
    content: null,
    error: null,
    member: null,
    status: "idle",
  });
  const isDisconnected = status !== "connected" || !accountAddress;

  const loadDetail = useCallback(async () => {
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
            : contentCopy.messages.detailLoadFailed,
        );
      }

      const member = "member" in syncData ? syncData.member : null;

      if (!member) {
        throw new Error(contentCopy.messages.memberMissing);
      }

      if ("validationError" in syncData && syncData.validationError) {
        setState({
          content: null,
          error: syncData.validationError,
          member,
          status: "ready",
        });
        return;
      }

      if (member.status !== "completed") {
        setState({
          content: null,
          error: contentCopy.messages.paymentRequired,
          member,
          status: "ready",
        });
        return;
      }

      const response = await fetch(
        `/api/content/posts/${encodeURIComponent(contentId)}?email=${encodeURIComponent(email)}`,
      );
      const data = (await response.json()) as ContentDetailResponse | {
        error?: string;
      };

      if (!response.ok || !("content" in data) || !("member" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : contentCopy.messages.detailLoadFailed,
        );
      }

      setState({
        content: data.content,
        error: null,
        member: data.member,
        status: "ready",
      });
    } catch (error) {
      setState({
        content: null,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.detailLoadFailed,
        member: null,
        status: "error",
      });
    }
  }, [
    accountAddress,
    chain.id,
    chain.name,
    contentCopy.messages.detailLoadFailed,
    contentCopy.messages.memberMissing,
    contentCopy.messages.paymentRequired,
    contentId,
    dictionary.member.errors.missingEmail,
    locale,
  ]);

  useEffect(() => {
    if (status !== "connected" || !accountAddress || !hasThirdwebClientId) {
      setState({
        content: null,
        error: null,
        member: null,
        status: "idle",
      });
      return;
    }

    void loadDetail();
  }, [accountAddress, loadDetail, status]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
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
            href={feedHref}
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="space-y-1">
            <p className="eyebrow">{contentCopy.page.detailEyebrow}</p>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                {contentCopy.meta.detailTitle}
              </h1>
              <p className="text-sm text-slate-600">
                {contentCopy.page.detailDescription}
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
            href={homeHref}
          >
            {contentCopy.actions.backHome}
          </Link>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
            href={studioHref}
          >
            {contentCopy.actions.openStudio}
          </Link>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
            onClick={() => {
              void loadDetail();
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
      ) : state.content ? (
        <article className="glass-card rounded-[32px] p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <FileText className="size-5" />
            </div>
            <div>
              <p className="eyebrow">{contentCopy.labels.free}</p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                {state.content.title}
              </h2>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Badge>{contentCopy.labels.free}</Badge>
            {state.content.authorProfile?.displayName ? (
              <Badge>{state.content.authorProfile.displayName}</Badge>
            ) : null}
            {state.content.authorProfile?.referralCode ? (
              <Badge>{state.content.authorProfile.referralCode}</Badge>
            ) : null}
          </div>

          <p className="mt-6 text-base leading-7 text-slate-600">
            {state.content.summary}
          </p>

          <div className="mt-8 rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <p className="whitespace-pre-wrap text-[0.98rem] leading-8 text-slate-800">
              {state.content.body}
            </p>
          </div>
        </article>
      ) : null}
    </main>
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
