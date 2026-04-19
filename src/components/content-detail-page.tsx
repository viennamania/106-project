"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  LogOut,
  RefreshCcw,
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

import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";
import { getContentCopy } from "@/lib/content-copy";
import type {
  ContentDetailLoadResponse,
  ContentDetailResponse,
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
  returnToHref = null,
}: {
  contentId: string;
  dictionary: Dictionary;
  locale: Locale;
  referralCode?: string | null;
  returnToHref?: string | null;
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
  const backHref = returnToHref ?? feedHref;
  const activateHref = buildPathWithReferral(`/${locale}/activate`, referralCode);
  const [state, setState] = useState<DetailState>({
    content: null,
    error: null,
    member: null,
    status: "idle",
  });
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
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

      const response = await fetch(`/api/content/posts/${encodeURIComponent(contentId)}`, {
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

      const member = "member" in data ? data.member : null;

      if (!member) {
        throw new Error(contentCopy.messages.memberMissing);
      }

      if ("validationError" in data && data.validationError) {
        setState({
          content: null,
          error: data.validationError,
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

      setState({
        content: "content" in data ? data.content : null,
        error: null,
        member,
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

  function confirmLogout() {
    if (!wallet) {
      setIsLogoutDialogOpen(false);
      return;
    }

    setIsLogoutDialogOpen(false);
    disconnect(wallet);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-6 lg:px-8">
      <LogoutConfirmDialog
        cancelLabel={dictionary.common.logoutDialog.cancel}
        confirmLabel={dictionary.common.logoutDialog.confirm}
        description={dictionary.common.logoutDialog.description}
        onCancel={() => {
          setIsLogoutDialogOpen(false);
        }}
        onConfirm={confirmLogout}
        open={isLogoutDialogOpen}
        title={dictionary.common.logoutDialog.title}
      />

      {hasThirdwebClientId ? (
        <AutoConnect
          accountAbstraction={smartWalletOptions}
          appMetadata={appMetadata}
          chain={smartWalletChain}
          client={thirdwebClient}
          wallets={supportedWallets}
        />
      ) : null}

      <header className="glass-card flex flex-col gap-3 rounded-[24px] px-4 py-3 sm:gap-4 sm:rounded-[28px] sm:px-5 sm:py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5 sm:gap-3">
          <Link
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:size-12 sm:rounded-2xl"
            href={backHref}
          >
            <ArrowLeft className="size-4 sm:size-5" />
          </Link>
          <div className="space-y-1">
            <p className="eyebrow hidden sm:block">{contentCopy.page.detailEyebrow}</p>
            <div>
              <h1 className="text-[1.05rem] font-semibold tracking-tight text-slate-950 sm:text-lg">
                {contentCopy.meta.detailTitle}
              </h1>
              <p className="hidden text-sm text-slate-600 sm:block">
                {contentCopy.page.detailDescription}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:flex sm:flex-wrap sm:items-center">
          <Link
            className="hidden h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50 sm:inline-flex"
            href={homeHref}
          >
            {contentCopy.actions.backHome}
          </Link>
          <button
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 transition hover:border-slate-300 hover:bg-slate-50 sm:h-11 sm:w-auto sm:gap-2 sm:px-4 sm:text-sm sm:font-medium"
            onClick={() => {
              void loadDetail();
            }}
            type="button"
          >
            <RefreshCcw className="size-4" />
            <span className="sr-only sm:not-sr-only">{contentCopy.actions.refresh}</span>
          </button>
          {status === "connected" && accountAddress ? (
            <button
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 transition hover:border-slate-300 hover:bg-slate-50 sm:h-11 sm:w-auto sm:px-4 sm:text-sm sm:font-medium"
              onClick={() => {
                setIsLogoutDialogOpen(true);
              }}
              type="button"
            >
              <LogOut className="size-4 sm:hidden" />
              <span className="sr-only sm:not-sr-only">{contentCopy.actions.disconnect}</span>
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
        <article className="glass-card rounded-[28px] px-4 py-5 sm:rounded-[32px] sm:p-7">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[20px] bg-slate-950 text-white sm:size-12 sm:rounded-2xl">
              <FileText className="size-5" />
            </div>
            <div>
              <p className="eyebrow">{contentCopy.labels.free}</p>
              <h2 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-slate-950 sm:text-3xl">
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

          <p className="mt-5 text-[1rem] leading-7 text-slate-600 sm:mt-6">
            {state.content.summary}
          </p>

          {state.content.coverImageUrl ? (
            <div className="mt-7 overflow-hidden rounded-[24px] border border-white/80 bg-slate-900/90 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:mt-8 sm:rounded-[28px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={state.content.title}
                className="block h-auto w-full"
                loading="eager"
                src={state.content.coverImageUrl}
              />
            </div>
          ) : null}

          <div className="mt-6 rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:mt-8 sm:rounded-[28px] sm:p-5">
            <p className="whitespace-pre-wrap text-[1rem] leading-7 text-slate-800 sm:text-[0.98rem] sm:leading-8">
              {state.content.body}
            </p>
          </div>

          {state.content.sources.length > 0 ? (
            <section className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/90 p-4 sm:mt-6 sm:rounded-[28px] sm:p-5">
              <p className="eyebrow">{contentCopy.labels.references}</p>
              <div className="mt-3 grid gap-3">
                {state.content.sources.map((source) => (
                  <a
                    key={source.url}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-3 overflow-hidden rounded-[20px] border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:rounded-2xl sm:px-4"
                    href={source.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="min-w-0">
                      <span className="block break-words font-semibold text-slate-950 sm:truncate">
                        {source.title}
                      </span>
                      <span className="mt-1 block break-all text-xs leading-5 text-slate-500 sm:truncate">
                        {source.url}
                      </span>
                    </span>
                    <ExternalLink className="mt-0.5 size-4 shrink-0 text-slate-400" />
                  </a>
                ))}
              </div>
            </section>
          ) : null}
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
