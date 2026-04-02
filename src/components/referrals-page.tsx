"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, WalletMinimal } from "lucide-react";
import {
  AutoConnect,
  useActiveAccount,
  useActiveWallet,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
  useDisconnect,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { EmailLoginDialog } from "@/components/email-login-dialog";
import { LanguageSwitcher } from "@/components/language-switcher";
import { CopyTextButton } from "@/components/copy-text-button";
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";
import { ReferralNetworkExplorer } from "@/components/referral-network-explorer";
import { ReferralRewardsPanel } from "@/components/referral-rewards-panel";
import { createEmptyReferralRewardsSummary } from "@/lib/member";
import type {
  MemberReferralsResponse,
  MemberRecord,
  ReferralRewardsSummaryRecord,
  ReferralTreeNodeRecord,
  SyncMemberResponse,
} from "@/lib/member";
import { cn } from "@/lib/utils";
import {
  getAppMetadata,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";
import { type Dictionary, type Locale } from "@/lib/i18n";
import { BSC_EXPLORER } from "@/lib/thirdweb";

type ReferralsState = {
  error: string | null;
  levelCounts: number[];
  member: MemberRecord | null;
  referrals: ReferralTreeNodeRecord[];
  rewards: ReferralRewardsSummaryRecord;
  status: "idle" | "loading" | "ready" | "error";
  totalReferrals: number;
};

export function ReferralsPage({
  dictionary,
  locale,
}: {
  dictionary: Dictionary;
  locale: Locale;
}) {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const [state, setState] = useState<ReferralsState>({
    error: null,
    levelCounts: [],
    member: null,
    referrals: [],
    rewards: createEmptyReferralRewardsSummary(),
    status: "idle",
    totalReferrals: 0,
  });
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const referralLink = state.member?.referralCode
    ? getReferralLink(state.member.referralCode, locale)
    : null;
  const accountLabel = accountAddress
    ? `${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}`
    : null;
  const accountUrl = accountAddress
    ? `${BSC_EXPLORER}/address/${accountAddress}`
    : BSC_EXPLORER;

  async function loadReferrals() {
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
        setState({
          error: dictionary.referralsPage.errors.missingEmail,
          levelCounts: [],
          member: null,
          referrals: [],
          rewards: createEmptyReferralRewardsSummary(),
          status: "error",
          totalReferrals: 0,
        });
        return;
      }

      const syncResponse = await fetch("/api/members", {
        body: JSON.stringify({
          chainId: chain.id,
          chainName: chain.name ?? "BSC",
          email,
          locale,
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

      if (!syncResponse.ok || !("member" in syncData)) {
        throw new Error(
          "error" in syncData && syncData.error
            ? syncData.error
            : dictionary.referralsPage.errors.loadFailed,
        );
      }

      if (syncData.member.status !== "completed") {
        setState({
          error: null,
          levelCounts: [],
          member: syncData.member,
          referrals: [],
          rewards: createEmptyReferralRewardsSummary(),
          status: "ready",
          totalReferrals: 0,
        });
        return;
      }

      const response = await fetch(
        `/api/members/referrals?email=${encodeURIComponent(email)}`,
      );
      const data = (await response.json()) as
        | MemberReferralsResponse
        | { error?: string };

      if (!response.ok || !("member" in data) || !("referrals" in data)) {
        throw new Error(
          response.status === 403
            ? dictionary.referralsPage.paymentRequired
            : response.status === 404
            ? dictionary.referralsPage.memberMissing
            : "error" in data && data.error
              ? data.error
              : dictionary.referralsPage.errors.loadFailed,
        );
      }

      setState({
        error: null,
        levelCounts: data.levelCounts,
        member: data.member,
        referrals: data.referrals,
        rewards: data.rewards,
        status: "ready",
        totalReferrals: data.totalReferrals,
      });
    } catch (error) {
      setState({
        error:
          error instanceof Error
            ? error.message
            : dictionary.referralsPage.errors.loadFailed,
        levelCounts: [],
        member: null,
        referrals: [],
        rewards: createEmptyReferralRewardsSummary(),
        status: "error",
        totalReferrals: 0,
      });
    }
  }

  const syncAndLoadReferrals = useEffectEvent(async () => {
    await loadReferrals();
  });

  useEffect(() => {
    if (status !== "connected") {
      setIsLogoutDialogOpen(false);
    }
  }, [status]);

  useEffect(() => {
    if (status === "connected") {
      setIsLoginDialogOpen(false);
    }
  }, [status]);

  useEffect(() => {
    if (status !== "connected" || !accountAddress || !hasThirdwebClientId) {
      setState({
        error: null,
        levelCounts: [],
        member: null,
        referrals: [],
        rewards: createEmptyReferralRewardsSummary(),
        status: "idle",
        totalReferrals: 0,
      });
      return;
    }

    void syncAndLoadReferrals();
  }, [accountAddress, status, locale, chain.id, chain.name]);

  function confirmLogout() {
    if (!wallet) {
      setIsLogoutDialogOpen(false);
      return;
    }

    setIsLogoutDialogOpen(false);
    disconnect(wallet);
  }

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(15,118,110,0.2),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(249,115,22,0.14),transparent_26%)]" />
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
      <EmailLoginDialog
        dictionary={dictionary}
        onClose={() => {
          setIsLoginDialogOpen(false);
        }}
        open={isLoginDialogOpen}
        title={dictionary.common.connectModalTitle}
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

      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <header className="glass-card flex flex-col gap-4 rounded-[28px] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              className="inline-flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              href={`/${locale}`}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div className="space-y-1">
              <p className="eyebrow">{dictionary.referralsPage.eyebrow}</p>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                  {dictionary.referralsPage.title}
                </h1>
                <p className="text-sm text-slate-600">
                  {dictionary.referralsPage.description}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <LanguageSwitcher
              label={dictionary.common.languageLabel}
              locale={locale}
            />
            <StatusChip
              labels={dictionary.common.status}
              status={status}
            />
            {hasThirdwebClientId ? (
              status === "connected" ? (
                <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
                  {accountAddress ? (
                    <a
                      className="inline-flex h-11 w-full items-center justify-between gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto sm:justify-start"
                      href={accountUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {accountLabel ?? accountAddress}
                      <ArrowUpRight className="size-4" />
                    </a>
                  ) : null}

                  <button
                    className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    disabled={!wallet}
                    onClick={() => {
                      if (!wallet) {
                        return;
                      }

                      setIsLogoutDialogOpen(true);
                    }}
                    type="button"
                  >
                    {dictionary.common.disconnectWallet}
                  </button>
                </div>
              ) : (
                <div className="hidden w-full sm:block sm:w-auto">
                  <button
                    className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-medium text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 sm:w-auto"
                    onClick={() => {
                      setIsLoginDialogOpen(true);
                    }}
                    type="button"
                  >
                    {dictionary.common.connectWallet}
                  </button>
                </div>
              )
            ) : (
              <div className="rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                {dictionary.common.clientIdRequired}
              </div>
            )}
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="glass-card rounded-[30px] p-5 sm:p-6">
            <div className="mb-4 space-y-1">
              <p className="eyebrow">{dictionary.referralsPage.eyebrow}</p>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                {dictionary.referralsPage.shareTitle}
              </h2>
            </div>

            {!hasThirdwebClientId ? (
              <MessageCard>{dictionary.env.description}</MessageCard>
            ) : status !== "connected" || !accountAddress ? (
              <div className="space-y-4">
                <MessageCard>{dictionary.referralsPage.disconnected}</MessageCard>
                <div className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                  <div className="space-y-3">
                    <p className="text-sm leading-6 text-slate-600">
                      {dictionary.common.loginDialog.emailDescription}
                    </p>
                    <button
                      className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
                      onClick={() => {
                        setIsLoginDialogOpen(true);
                      }}
                      type="button"
                    >
                      {dictionary.common.connectWallet}
                    </button>
                  </div>
                </div>
              </div>
            ) : state.status === "loading" ? (
              <MessageCard>{dictionary.referralsPage.loading}</MessageCard>
            ) : state.status === "error" ? (
              <MessageCard tone="error">
                {state.error ?? dictionary.referralsPage.errors.loadFailed}
              </MessageCard>
            ) : state.member?.status !== "completed" ? (
              <div className="space-y-4">
                <MessageCard>{dictionary.referralsPage.paymentRequired}</MessageCard>
                <div className="flex flex-wrap gap-3">
                  <Link
                    className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                    href={`/${locale}`}
                  >
                    {dictionary.referralsPage.actions.completeSignup}
                  </Link>
                  <button
                    className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                    onClick={() => {
                      void loadReferrals();
                    }}
                    type="button"
                  >
                    {dictionary.referralsPage.actions.refresh}
                  </button>
                </div>
              </div>
            ) : state.member ? (
              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                  <div className="flex items-start gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <WalletMinimal className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm leading-6 text-slate-600">
                        {dictionary.referralsPage.memberReady}
                      </p>
                      <p className="mt-1 break-all text-base font-semibold text-slate-950">
                        {state.member.email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow
                    label={dictionary.referralsPage.labels.referralCode}
                    value={state.member.referralCode ?? dictionary.common.notAvailable}
                  />
                  <InfoRow
                    label={dictionary.referralsPage.labels.directReferrals}
                    value={String(state.referrals.length)}
                  />
                  <InfoRow
                    label={dictionary.referralsPage.labels.totalNetwork}
                    value={String(state.totalReferrals)}
                  />
                </div>

                {referralLink ? (
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      {dictionary.referralsPage.labels.referralLink}
                    </p>
                    <a
                      className="mt-3 block break-all text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-4"
                      href={referralLink}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {referralLink}
                    </a>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <CopyTextButton
                        className="w-full sm:w-auto"
                        copiedLabel={dictionary.common.copied}
                        copyLabel={dictionary.common.copyLink}
                        text={referralLink}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <Link
                    className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                    href={`/${locale}`}
                  >
                    {dictionary.referralsPage.actions.backHome}
                  </Link>
                  <button
                    className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      void loadReferrals();
                    }}
                    type="button"
                  >
                    {dictionary.referralsPage.actions.refresh}
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="glass-card rounded-[30px] p-5 sm:p-6">
            <div className="mb-4 space-y-1">
              <p className="eyebrow">{dictionary.referralsPage.eyebrow}</p>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                {dictionary.referralsPage.listTitle}
              </h2>
            </div>

            {status !== "connected" || !accountAddress ? (
              <MessageCard>{dictionary.referralsPage.disconnected}</MessageCard>
            ) : state.status === "loading" ? (
              <MessageCard>{dictionary.referralsPage.loading}</MessageCard>
            ) : state.status === "error" ? (
              <MessageCard tone="error">
                {state.error ?? dictionary.referralsPage.errors.loadFailed}
              </MessageCard>
            ) : state.member?.status !== "completed" ? (
              <MessageCard>{dictionary.referralsPage.paymentRequired}</MessageCard>
            ) : (
              <ReferralNetworkExplorer
                dictionary={dictionary}
                key={`${state.member.email}:${state.totalReferrals}:${state.levelCounts.join("-")}`}
                levelCounts={state.levelCounts}
                locale={locale}
                referrals={state.referrals}
                totalReferrals={state.totalReferrals}
              />
            )}
          </section>
        </section>

        <section className="glass-card rounded-[30px] p-5 sm:p-6">
          {status !== "connected" || !accountAddress ? (
            <MessageCard>{dictionary.referralsPage.disconnected}</MessageCard>
          ) : state.status === "loading" ? (
            <MessageCard>{dictionary.referralsPage.loading}</MessageCard>
          ) : state.status === "error" ? (
            <MessageCard tone="error">
              {state.error ?? dictionary.referralsPage.errors.loadFailed}
            </MessageCard>
          ) : state.member?.status !== "completed" ? (
            <MessageCard>{dictionary.referralsPage.paymentRequired}</MessageCard>
          ) : (
            <ReferralRewardsPanel
              dictionary={dictionary}
              locale={locale}
              rewards={state.rewards}
            />
          )}
        </section>
      </main>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-slate-900 sm:text-base">
        {value}
      </p>
    </div>
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
      className={cn(
        "rounded-[22px] border px-4 py-4 text-sm leading-6 break-words",
        tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-950"
          : "border-slate-200 bg-white/90 text-slate-600",
      )}
    >
      {children}
    </div>
  );
}

function StatusChip({
  labels,
  status,
}: {
  labels: Dictionary["common"]["status"];
  status: "connected" | "disconnected" | "connecting" | "unknown";
}) {
  const copy =
    status === "connected"
      ? labels.connected
      : status === "connecting"
        ? labels.connecting
        : status === "unknown"
          ? labels.unknown
          : labels.disconnected;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium",
        status === "connected" &&
          "border-emerald-200 bg-emerald-50 text-emerald-900",
        status === "connecting" &&
          "border-blue-200 bg-blue-50 text-blue-900",
        status === "unknown" &&
          "border-slate-200 bg-slate-50 text-slate-700",
        status === "disconnected" &&
          "border-slate-200 bg-white text-slate-700",
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          status === "connected" && "bg-emerald-500",
          status === "connecting" && "bg-blue-500",
          status === "unknown" && "bg-slate-400",
          status === "disconnected" && "bg-slate-400",
        )}
      />
      {copy}
    </div>
  );
}

function getReferralLink(referralCode: string, locale: Locale) {
  const path = `/${locale}?ref=${encodeURIComponent(referralCode)}`;
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!appUrl) {
    return path;
  }

  try {
    return new URL(path, appUrl).toString();
  } catch {
    return path;
  }
}
