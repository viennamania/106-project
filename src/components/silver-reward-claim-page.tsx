"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Coins,
  RefreshCcw,
  WalletMinimal,
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

import { EmailLoginDialog } from "@/components/email-login-dialog";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";
import { cn } from "@/lib/utils";
import { type Dictionary, type Locale } from "@/lib/i18n";
import type { MemberRecord, SyncMemberResponse } from "@/lib/member";
import type { RewardRedemptionRecord } from "@/lib/points";
import type {
  SilverRewardClaimEligibilityReason,
  SilverRewardClaimRecord,
  SilverRewardClaimRequest,
  SilverRewardClaimResponse,
  SilverRewardClaimSummaryResponse,
  SilverRewardQuoteRecord,
} from "@/lib/silver-reward-claim";
import {
  BSC_EXPLORER,
  getAppMetadata,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";

type SilverRewardClaimPageState = {
  canClaim: boolean;
  claim: SilverRewardClaimRecord | null;
  eligibilityReason: SilverRewardClaimEligibilityReason | null;
  email: string | null;
  error: string | null;
  member: MemberRecord | null;
  quote: SilverRewardQuoteRecord | null;
  rewardRedemption: RewardRedemptionRecord | null;
  status: "idle" | "loading" | "ready" | "error";
  walletAddress: string | null;
};

function createEmptyState(): SilverRewardClaimPageState {
  return {
    canClaim: false,
    claim: null,
    eligibilityReason: null,
    email: null,
    error: null,
    member: null,
    quote: null,
    rewardRedemption: null,
    status: "idle",
    walletAddress: null,
  };
}

export function SilverRewardClaimPage({
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
  const [state, setState] = useState<SilverRewardClaimPageState>(
    createEmptyState(),
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const isDisconnected = status !== "connected" || !accountAddress;
  const connectedAccountUrl = accountAddress
    ? `${BSC_EXPLORER}/address/${accountAddress}`
    : BSC_EXPLORER;

  const loadClaim = useCallback(
    async ({ background = false } = {}) => {
      if (!accountAddress) {
        return;
      }

      if (background) {
        setIsRefreshing(true);
      } else {
        setState((current) => ({
          ...current,
          error: null,
          status: "loading",
        }));
      }

      try {
        const email = await getUserEmail({ client: thirdwebClient });

        if (!email) {
          throw new Error(dictionary.rewardsPage.errors.missingEmail);
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
              : dictionary.rewardsPage.silverClaim.errors.loadFailed,
          );
        }

        if ("validationError" in syncData && syncData.validationError) {
          throw new Error(syncData.validationError);
        }

        const response = await fetch(
          `/api/rewards/silver-claim?email=${encodeURIComponent(email)}`,
        );
        const data = (await response.json()) as
          | SilverRewardClaimSummaryResponse
          | { error?: string };

        if (!response.ok || !("quote" in data)) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : dictionary.rewardsPage.silverClaim.errors.loadFailed,
          );
        }

        setState({
          canClaim: data.canClaim,
          claim: data.claim,
          eligibilityReason: data.eligibilityReason,
          email,
          error: null,
          member: data.member,
          quote: data.quote,
          rewardRedemption: data.rewardRedemption,
          status: "ready",
          walletAddress: data.walletAddress,
        });
      } catch (error) {
        setState((current) => ({
          ...current,
          error:
            error instanceof Error
              ? error.message
              : dictionary.rewardsPage.silverClaim.errors.loadFailed,
          status: "error",
        }));
      } finally {
        setIsRefreshing(false);
      }
    },
    [accountAddress, chain.id, chain.name, dictionary, locale],
  );

  useEffect(() => {
    if (status !== "connected") {
      setActionError(null);
      setActionNotice(null);
      setIsClaiming(false);
      setIsRefreshing(false);
      setIsLogoutDialogOpen(false);
      setState(createEmptyState());
    }
  }, [status]);

  useEffect(() => {
    if (status === "connected") {
      setIsLoginDialogOpen(false);
    }
  }, [status]);

  useEffect(() => {
    if (!hasThirdwebClientId || status !== "connected" || !accountAddress) {
      return;
    }

    void loadClaim();
  }, [accountAddress, loadClaim, status]);

  useEffect(() => {
    if (!hasThirdwebClientId || status !== "connected" || !accountAddress) {
      return;
    }

    const handleFocus = () => {
      void loadClaim({ background: true });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadClaim({ background: true });
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [accountAddress, loadClaim, status]);

  function confirmLogout() {
    if (!wallet) {
      setIsLogoutDialogOpen(false);
      return;
    }

    setIsLogoutDialogOpen(false);
    disconnect(wallet);
  }

  async function handleClaim() {
    if (!state.email) {
      setActionError(dictionary.rewardsPage.errors.missingEmail);
      return;
    }

    setActionError(null);
    setActionNotice(null);
    setIsClaiming(true);

    try {
      const response = await fetch("/api/rewards/silver-claim", {
        body: JSON.stringify({
          email: state.email,
        } satisfies SilverRewardClaimRequest),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as
        | SilverRewardClaimResponse
        | { error?: string };

      if (!response.ok || !("quote" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : dictionary.rewardsPage.silverClaim.errors.claimFailed,
        );
      }

      setState({
        canClaim: data.canClaim,
        claim: data.claim,
        eligibilityReason: data.eligibilityReason,
        email: state.email,
        error: null,
        member: data.member,
        quote: data.quote,
        rewardRedemption: data.rewardRedemption,
        status: "ready",
        walletAddress: data.walletAddress,
      });
      setActionNotice(dictionary.rewardsPage.silverClaim.notices.claimSuccess);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : dictionary.rewardsPage.silverClaim.errors.claimFailed,
      );
    } finally {
      setIsClaiming(false);
    }
  }

  const quote = state.quote;
  const claimStatusLabel = getSilverClaimStatusLabel({
    claim: state.claim,
    dictionary,
    eligibilityReason: state.eligibilityReason,
  });
  const silverCardStatusLabel =
    state.rewardRedemption?.status === "completed"
      ? dictionary.rewardsPage.silverClaim.statuses.silverCardCompleted
      : dictionary.rewardsPage.silverClaim.statuses.silverCardRequired;
  const infoMessage = getSilverClaimMessage({
    claim: state.claim,
    dictionary,
    eligibilityReason: state.eligibilityReason,
  });
  const claimTransactionUrl = state.claim?.txHash
    ? `${BSC_EXPLORER}/tx/${state.claim.txHash}`
    : null;

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_24%),radial-gradient(circle_at_88%_10%,rgba(34,197,94,0.14),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(245,158,11,0.14),transparent_24%)]" />
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
              href={`/${locale}/rewards`}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div className="space-y-1">
              <p className="eyebrow">{dictionary.rewardsPage.eyebrow}</p>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                  {dictionary.rewardsPage.silverClaim.title}
                </h1>
                <p className="text-sm text-slate-600">
                  {dictionary.rewardsPage.silverClaim.description}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
            <LanguageSwitcher
              label={dictionary.common.languageLabel}
              locale={locale}
            />
            <StatusChip labels={dictionary.common.status} status={status} />
            {hasThirdwebClientId ? (
              status === "connected" ? (
                <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
                  {accountAddress ? (
                    <a
                      className="inline-flex h-11 w-full items-center justify-between gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto sm:justify-start"
                      href={connectedAccountUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {formatAddressLabel(accountAddress)}
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
                <button
                  className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-medium text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 sm:w-auto"
                  onClick={() => {
                    setIsLoginDialogOpen(true);
                  }}
                  type="button"
                >
                  {dictionary.common.connectWallet}
                </button>
              )
            ) : (
              <div className="rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                {dictionary.common.clientIdRequired}
              </div>
            )}
          </div>
        </header>

        {!hasThirdwebClientId ? (
          <MessageCard>{dictionary.env.description}</MessageCard>
        ) : isDisconnected ? (
          <section className="glass-card rounded-[30px] p-5 sm:p-6">
            <div className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <div className="space-y-3">
                <p className="text-sm leading-6 text-slate-600">
                  {dictionary.rewardsPage.disconnected}
                </p>
                <button
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 sm:w-auto"
                  onClick={() => {
                    setIsLoginDialogOpen(true);
                  }}
                  type="button"
                >
                  {dictionary.common.connectWallet}
                </button>
              </div>
            </div>
          </section>
        ) : state.status === "error" && !state.quote ? (
          <MessageCard tone="error">
            {state.error ?? dictionary.rewardsPage.silverClaim.errors.loadFailed}
          </MessageCard>
        ) : (
          <>
            <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
              <section className="relative overflow-hidden rounded-[32px] border border-slate-900/90 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_48%,#0f766e_100%)] p-5 text-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:p-6">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.14),transparent_30%)]" />
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-2">
                    <InfoBadge className="border-white/14 bg-white/10 text-white/85">
                      {silverCardStatusLabel}
                    </InfoBadge>
                    <InfoBadge className="border-emerald-300/20 bg-emerald-300/12 text-emerald-100">
                      {claimStatusLabel}
                    </InfoBadge>
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <HeroMetric
                      icon={<Coins className="size-5" />}
                      label={dictionary.rewardsPage.silverClaim.labels.rewardValue}
                      value={formatUsd(quote?.usdAmount ?? 0, locale)}
                    />
                    <HeroMetric
                      icon={<WalletMinimal className="size-5" />}
                      label={dictionary.rewardsPage.silverClaim.labels.estimatedBnb}
                      value={
                        quote
                          ? `${quote.bnbAmount} BNB`
                          : dictionary.rewardsPage.loading
                      }
                    />
                  </div>

                  <div className="mt-5 rounded-[24px] border border-white/12 bg-white/10 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/60">
                      {dictionary.rewardsPage.silverClaim.labels.estimatedKrw}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                      {quote
                        ? formatKrw(quote.estimatedKrwAmount, locale)
                        : dictionary.rewardsPage.loading}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/72">
                      {dictionary.rewardsPage.silverClaim.quoteNote}
                    </p>
                  </div>
                </div>
              </section>

              <section className="glass-card rounded-[30px] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="eyebrow">{dictionary.rewardsPage.eyebrow}</p>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                      {dictionary.walletPage.labels.memberAccount}
                    </h2>
                  </div>
                  <button
                    className="inline-flex size-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isRefreshing}
                    onClick={() => {
                      void loadClaim({ background: true });
                    }}
                    type="button"
                  >
                    <RefreshCcw
                      className={cn("size-4", isRefreshing && "animate-spin")}
                    />
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <MetricCard
                    label={dictionary.walletPage.labels.memberAccount}
                    value={state.member?.email ?? state.email ?? "-"}
                  />
                  <MetricCard
                    label={dictionary.walletPage.labels.memberStatus}
                    value={
                      state.member
                        ? state.member.status === "completed"
                          ? dictionary.member.completedValue
                          : dictionary.member.pendingValue
                        : "-"
                    }
                  />
                  <MetricCard
                    label={dictionary.rewardsPage.silverClaim.labels.destinationWallet}
                    value={state.walletAddress ?? "-"}
                  />
                  <MetricCard
                    label={dictionary.rewardsPage.silverClaim.labels.quotedAt}
                    value={
                      quote ? formatDateTime(quote.asOf, locale) : dictionary.rewardsPage.loading
                    }
                  />
                </div>

                {state.error ? (
                  <div className="mt-4">
                    <MessageCard tone="error">{state.error}</MessageCard>
                  </div>
                ) : null}
              </section>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricStatCard
                label={dictionary.rewardsPage.silverClaim.labels.usdtKrw}
                value={quote ? formatKrw(quote.usdtKrwPrice, locale) : "-"}
              />
              <MetricStatCard
                label={dictionary.rewardsPage.silverClaim.labels.bnbKrw}
                value={quote ? formatKrw(quote.bnbKrwPrice, locale) : "-"}
              />
              <MetricStatCard
                label={dictionary.rewardsPage.silverClaim.labels.silverCardStatus}
                value={silverCardStatusLabel}
              />
              <MetricStatCard
                label={dictionary.rewardsPage.silverClaim.labels.claimStatus}
                value={claimStatusLabel}
              />
            </section>

            {actionNotice ? <MessageCard>{actionNotice}</MessageCard> : null}
            {actionError ? <MessageCard tone="error">{actionError}</MessageCard> : null}
            {infoMessage ? <MessageCard>{infoMessage}</MessageCard> : null}
            {state.claim?.failureReason ? (
              <MessageCard tone="error">{state.claim.failureReason}</MessageCard>
            ) : null}

            <section className="glass-card rounded-[30px] p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="eyebrow">{dictionary.rewardsPage.eyebrow}</p>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                    {dictionary.rewardsPage.silverClaim.title}
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    {dictionary.rewardsPage.silverClaim.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                    href={`/${locale}/rewards`}
                  >
                    {dictionary.rewardsPage.silverClaim.actions.backToRewards}
                  </Link>
                  {claimTransactionUrl ? (
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                      href={claimTransactionUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {dictionary.rewardsPage.silverClaim.actions.openTransaction}
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="space-y-3">
                    <p className="text-sm leading-6 text-slate-600">
                      {dictionary.rewardsPage.silverClaim.quoteNote}
                    </p>
                    {claimTransactionUrl ? (
                      <Link
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-900 transition hover:text-slate-700"
                        href={claimTransactionUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <span className="font-mono">
                          {shortenHash(state.claim?.txHash ?? "")}
                        </span>
                        <ArrowUpRight className="size-4" />
                      </Link>
                    ) : null}
                  </div>

                  <button
                    className={cn(
                      "inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
                      state.canClaim
                        ? "bg-slate-950 text-white hover:bg-slate-800"
                        : "border border-slate-200 bg-slate-50 text-slate-500",
                    )}
                    disabled={!state.canClaim || isClaiming}
                    onClick={() => {
                      void handleClaim();
                    }}
                    type="button"
                  >
                    {isClaiming
                      ? dictionary.rewardsPage.silverClaim.actions.claiming
                      : dictionary.rewardsPage.silverClaim.actions.claim}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function HeroMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-white/70">{icon}</div>
      <p className="mt-3 text-[0.68rem] uppercase tracking-[0.22em] text-white/55">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
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
    <div className="rounded-[24px] border border-slate-200 bg-white/90 px-4 py-4 shadow-[0_16px_36px_rgba(15,23,42,0.04)]">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-all text-sm font-semibold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function MetricStatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="glass-card rounded-[26px] border border-white/70 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-950">{value}</p>
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

function InfoBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700",
        className,
      )}
    >
      {children}
    </span>
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

function getSilverClaimStatusLabel({
  claim,
  dictionary,
  eligibilityReason,
}: {
  claim: SilverRewardClaimRecord | null;
  dictionary: Dictionary;
  eligibilityReason: SilverRewardClaimEligibilityReason | null;
}) {
  if (claim?.status === "completed") {
    return dictionary.rewardsPage.silverClaim.statuses.completed;
  }

  if (claim?.status === "pending" || eligibilityReason === "claim_pending") {
    return dictionary.rewardsPage.silverClaim.statuses.pending;
  }

  if (claim?.status === "failed") {
    return dictionary.rewardsPage.silverClaim.statuses.failed;
  }

  if (eligibilityReason === "silver_card_incomplete") {
    return dictionary.rewardsPage.silverClaim.statuses.silverCardRequired;
  }

  return dictionary.rewardsPage.silverClaim.statuses.available;
}

function getSilverClaimMessage({
  claim,
  dictionary,
  eligibilityReason,
}: {
  claim: SilverRewardClaimRecord | null;
  dictionary: Dictionary;
  eligibilityReason: SilverRewardClaimEligibilityReason | null;
}) {
  if (claim?.status === "completed") {
    return dictionary.rewardsPage.silverClaim.messages.completed;
  }

  if (claim?.status === "pending" || eligibilityReason === "claim_pending") {
    return dictionary.rewardsPage.silverClaim.messages.pending;
  }

  if (claim?.status === "failed") {
    return dictionary.rewardsPage.silverClaim.messages.failed;
  }

  if (eligibilityReason === "signup_incomplete") {
    return dictionary.rewardsPage.silverClaim.messages.requiresSignup;
  }

  if (eligibilityReason === "silver_card_incomplete") {
    return dictionary.rewardsPage.silverClaim.messages.requiresSilverCard;
  }

  if (eligibilityReason === "wallet_missing") {
    return dictionary.rewardsPage.silverClaim.messages.missingWallet;
  }

  if (eligibilityReason === "already_claimed") {
    return dictionary.rewardsPage.silverClaim.messages.alreadyClaimed;
  }

  return null;
}

function formatAddressLabel(address: string) {
  if (!address) {
    return "-";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatKrw(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    currency: "KRW",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatUsd(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function shortenHash(value: string) {
  if (value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}
