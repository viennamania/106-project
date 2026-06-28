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
  useActiveAccount,
  useActiveWallet,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
  useDisconnect,
} from "thirdweb/react";

import { EmailLoginDialog } from "@/components/email-login-dialog";
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";
import { useMemberSession } from "@/components/member-session-provider";
import {
  buildPathWithReferral,
} from "@/lib/landing-branding";
import { cn } from "@/lib/utils";
import { type Dictionary, type Locale } from "@/lib/i18n";
import {
  getServiceConnectModalTitle,
  SERVICE_BRAND_NAME,
} from "@/lib/service-branding";
import type { MemberRecord } from "@/lib/member";
import { syncServerMemberRegistration } from "@/lib/member-session-client";
import { getThirdwebUserEmail, useThirdwebConnectionState } from "@/lib/thirdweb-client";
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
  hasThirdwebClientId,
  smartWalletChain,
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
  referralCode = null,
}: {
  dictionary: Dictionary;
  locale: Locale;
  referralCode?: string | null;
}) {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const memberSession = useMemberSession();
  const memberSessionEmail =
    accountAddress &&
    memberSession.accountAddress?.toLowerCase() === accountAddress.toLowerCase()
      ? memberSession.email
      : null;
  const [state, setState] = useState<SilverRewardClaimPageState>(
    createEmptyState(),
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const {
    isDisconnected,
    isResolving: isConnectionResolving,
  } = useThirdwebConnectionState({
    accountAddress,
    status,
  });
  const connectedAccountUrl = accountAddress
    ? `${BSC_EXPLORER}/address/${accountAddress}`
    : BSC_EXPLORER;
  const rewardsHref = buildPathWithReferral(`/${locale}/rewards`, referralCode);

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
        const email =
          memberSessionEmail ??
          (await getThirdwebUserEmail({ client: thirdwebClient }));

        if (!email) {
          throw new Error(dictionary.rewardsPage.errors.missingEmail);
        }

        const syncData = await syncServerMemberRegistration({
          chainId: chain.id,
          chainName: chain.name ?? "BSC",
          email,
          locale,
          syncMode: "light",
          walletAddress: accountAddress,
        });

        if (!syncData.ok) {
          throw new Error(
            syncData.error ||
              dictionary.rewardsPage.silverClaim.errors.loadFailed,
          );
        }

        if (syncData.validationError) {
          throw new Error(syncData.validationError);
        }

        const response = await fetch("/api/rewards/silver-claim");
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
    [accountAddress, chain.id, chain.name, dictionary, locale, memberSessionEmail],
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
          walletAddress: accountAddress ?? "",
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
      setActionNotice(
        data.claim?.status === "pending"
          ? dictionary.rewardsPage.silverClaim.messages.pending
          : dictionary.rewardsPage.silverClaim.notices.claimSuccess,
      );
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
  const flowCopy = getSilverClaimFlowCopy(locale);
  const activeFlowStep =
    state.claim?.status === "completed"
      ? 2
      : state.claim?.status === "pending" || state.canClaim
        ? 1
        : 0;
  const nextActionText = getSilverClaimNextActionText({
    canClaim: state.canClaim,
    claim: state.claim,
    eligibilityReason: state.eligibilityReason,
    locale,
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
    <div className="friend-service-surface relative isolate overflow-hidden bg-[#f7f4ee]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0))]" />
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
        serviceLabel={SERVICE_BRAND_NAME}
        title={getServiceConnectModalTitle(locale)}
      />

      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <header className="relative flex flex-col gap-4 rounded-[26px] border border-zinc-200 bg-white px-5 py-4 shadow-[0_18px_55px_rgba(24,24,27,0.07)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              href={rewardsHref}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div className="space-y-1">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                {SERVICE_BRAND_NAME}
              </p>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                  {dictionary.rewardsPage.silverClaim.title}
                </h1>
                <p className="hidden text-sm text-slate-600 sm:block">
                  {dictionary.rewardsPage.silverClaim.description}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
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
        ) : isConnectionResolving ? (
          <MessageCard>{dictionary.rewardsPage.loading}</MessageCard>
        ) : isDisconnected ? (
          <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_22px_70px_rgba(24,24,27,0.08)] sm:p-6">
            <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <WalletMinimal className="size-5" />
            </div>
            <div className="mt-4 max-w-xl space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                {dictionary.rewardsPage.silverClaim.title}
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                {dictionary.rewardsPage.disconnected}
              </p>
            </div>
            <button
              className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 sm:w-auto"
              onClick={() => {
                setIsLoginDialogOpen(true);
              }}
              type="button"
            >
              {dictionary.common.connectWallet}
            </button>
          </section>
        ) : state.status === "error" && !state.quote ? (
          <MessageCard tone="error">
            {state.error ?? dictionary.rewardsPage.silverClaim.errors.loadFailed}
          </MessageCard>
        ) : (
          <>
            <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
              <section className="relative overflow-hidden rounded-[30px] border border-zinc-900 bg-zinc-950 p-5 text-white shadow-[0_28px_80px_rgba(24,24,27,0.24)] sm:p-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)]" />
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

                  <div className="mt-4 rounded-[22px] border border-emerald-300/20 bg-emerald-300/10 px-4 py-4">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-emerald-100/70">
                      {flowCopy.nextActionLabel}
                    </p>
                    <p className="mt-2 break-keep text-base font-semibold leading-6 text-white">
                      {nextActionText}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-[0_22px_70px_rgba(24,24,27,0.08)] sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                      {SERVICE_BRAND_NAME}
                    </p>
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

            <SilverClaimFlow activeStep={activeFlowStep} copy={flowCopy} />

            {actionNotice ? <MessageCard>{actionNotice}</MessageCard> : null}
            {actionError ? <MessageCard tone="error">{actionError}</MessageCard> : null}
            {infoMessage ? <MessageCard>{infoMessage}</MessageCard> : null}
            {state.claim?.failureReason ? (
              <MessageCard tone="error">{state.claim.failureReason}</MessageCard>
            ) : null}

            <section className="rounded-[30px] border border-zinc-200 bg-white p-5 shadow-[0_22px_70px_rgba(24,24,27,0.08)] sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    {SERVICE_BRAND_NAME}
                  </p>
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
                    href={rewardsHref}
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

              <div className="mt-5 rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_16px_38px_rgba(24,24,27,0.05)]">
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
    <div className="rounded-[24px] border border-zinc-200 bg-white px-4 py-4 shadow-[0_16px_36px_rgba(24,24,27,0.04)]">
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
    <div className="rounded-[26px] border border-zinc-200 bg-white px-4 py-4 shadow-[0_14px_34px_rgba(24,24,27,0.05)]">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function SilverClaimFlow({
  activeStep,
  copy,
}: {
  activeStep: number;
  copy: ReturnType<typeof getSilverClaimFlowCopy>;
}) {
  return (
    <section className="rounded-[28px] border border-zinc-200 bg-white p-4 shadow-[0_18px_48px_rgba(24,24,27,0.06)] sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            {copy.eyebrow}
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
            {copy.title}
          </h2>
        </div>
        <p className="break-keep text-sm leading-6 text-slate-500">
          {copy.description}
        </p>
      </div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-3">
        {copy.steps.map((step, index) => {
          const isActive = index <= activeStep;

          return (
            <li
              className={cn(
                "rounded-[22px] border px-4 py-3 transition",
                isActive
                  ? "border-slate-950 bg-slate-950 text-white shadow-[0_16px_34px_rgba(15,23,42,0.14)]"
                  : "border-slate-200 bg-slate-50 text-slate-600",
              )}
              key={step.title}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    isActive
                      ? "bg-white text-slate-950"
                      : "bg-white text-slate-500",
                  )}
                >
                  {index + 1}
                </span>
                <p className="break-keep text-sm font-semibold">{step.title}</p>
              </div>
              <p
                className={cn(
                  "mt-2 break-keep text-xs leading-5",
                  isActive ? "text-white/68" : "text-slate-500",
                )}
              >
                {step.description}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
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

function getSilverClaimFlowCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      description: "Silver 교환 후 BNB 지급까지의 현재 위치입니다.",
      eyebrow: "reward flow",
      nextActionLabel: "다음 행동",
      steps: [
        {
          description: "Silver 멤버 카드 교환 기록이 있어야 합니다.",
          title: "Silver 교환",
        },
        {
          description: "현재 시세로 예상 BNB 수량과 지급 지갑을 확인합니다.",
          title: "지급 확인",
        },
        {
          description: "클레임이 완료되면 거래 기록으로 확인합니다.",
          title: "거래 확인",
        },
      ],
      title: "BNB 지급 흐름",
    };
  }

  if (locale === "ja") {
    return {
      description: "Silver交換後、BNB支給までの現在位置です。",
      eyebrow: "reward flow",
      nextActionLabel: "次の操作",
      steps: [
        {
          description: "Silverメンバーカードの交換記録が必要です。",
          title: "Silver交換",
        },
        {
          description: "現在価格で推定BNB数量と支給ウォレットを確認します。",
          title: "支給確認",
        },
        {
          description: "クレーム完了後、取引記録で確認します。",
          title: "取引確認",
        },
      ],
      title: "BNB支給フロー",
    };
  }

  if (locale === "zh") {
    return {
      description: "Silver 兑换后到 BNB 发放的当前位置。",
      eyebrow: "reward flow",
      nextActionLabel: "下一步",
      steps: [
        {
          description: "需要先有 Silver 会员卡兑换记录。",
          title: "Silver 兑换",
        },
        {
          description: "按当前价格确认预计 BNB 数量和发放钱包。",
          title: "发放确认",
        },
        {
          description: "领取完成后可通过交易记录确认。",
          title: "交易确认",
        },
      ],
      title: "BNB 发放流程",
    };
  }

  return {
    description: "Your current position from Silver redemption to BNB payout.",
    eyebrow: "reward flow",
    nextActionLabel: "Next action",
    steps: [
      {
        description: "A completed Silver member card redemption is required.",
        title: "Silver redeemed",
      },
      {
        description: "Review the estimated BNB amount and destination wallet.",
        title: "Payout review",
      },
      {
        description: "After completion, verify the transaction record.",
        title: "Transaction check",
      },
    ],
    title: "BNB payout flow",
  };
}

function getSilverClaimNextActionText({
  canClaim,
  claim,
  eligibilityReason,
  locale,
}: {
  canClaim: boolean;
  claim: SilverRewardClaimRecord | null;
  eligibilityReason: SilverRewardClaimEligibilityReason | null;
  locale: Locale;
}) {
  if (locale === "ko") {
    if (claim?.status === "completed") {
      return "BNB 지급이 완료되었습니다. 거래 기록을 확인하세요.";
    }

    if (claim?.status === "pending" || eligibilityReason === "claim_pending") {
      return "BNB 전송 처리 중입니다. 잠시 후 새로고침하세요.";
    }

    if (canClaim) {
      return "지급 지갑과 예상 BNB 수량을 확인한 뒤 클레임을 신청하세요.";
    }

    if (eligibilityReason === "silver_card_incomplete") {
      return "먼저 Silver 멤버 카드를 교환해야 BNB 클레임이 가능합니다.";
    }

    if (eligibilityReason === "signup_incomplete") {
      return "가입 완료 후 Silver BNB 클레임을 진행할 수 있습니다.";
    }

    return "지갑 연결과 Silver 카드 상태를 확인하세요.";
  }

  if (locale === "ja") {
    if (claim?.status === "completed") {
      return "BNB支給が完了しました。取引記録を確認してください。";
    }

    if (claim?.status === "pending" || eligibilityReason === "claim_pending") {
      return "BNB送金を処理中です。しばらくしてから更新してください。";
    }

    if (canClaim) {
      return "支給ウォレットと推定BNB数量を確認してから申請してください。";
    }

    if (eligibilityReason === "silver_card_incomplete") {
      return "先にSilverメンバーカードを交換するとBNBクレームが可能です。";
    }

    if (eligibilityReason === "signup_incomplete") {
      return "登録完了後にSilver BNBクレームを進められます。";
    }

    return "ウォレット接続とSilverカード状態を確認してください。";
  }

  if (locale === "zh") {
    if (claim?.status === "completed") {
      return "BNB 已发放完成。请查看交易记录。";
    }

    if (claim?.status === "pending" || eligibilityReason === "claim_pending") {
      return "BNB 转账处理中，请稍后刷新。";
    }

    if (canClaim) {
      return "确认发放钱包和预计 BNB 数量后提交领取。";
    }

    if (eligibilityReason === "silver_card_incomplete") {
      return "请先兑换 Silver 会员卡，之后才能领取 BNB。";
    }

    if (eligibilityReason === "signup_incomplete") {
      return "完成注册后可以继续 Silver BNB 领取。";
    }

    return "请确认钱包连接和 Silver 卡状态。";
  }

  if (claim?.status === "completed") {
    return "BNB payout is complete. Review the transaction record.";
  }

  if (claim?.status === "pending" || eligibilityReason === "claim_pending") {
    return "BNB transfer is processing. Refresh again shortly.";
  }

  if (canClaim) {
    return "Review the destination wallet and estimated BNB, then submit the claim.";
  }

  if (eligibilityReason === "silver_card_incomplete") {
    return "Redeem the Silver member card first to enable this BNB claim.";
  }

  if (eligibilityReason === "signup_incomplete") {
    return "Complete signup before continuing to the Silver BNB claim.";
  }

  return "Check your wallet connection and Silver card status.";
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
