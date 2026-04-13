"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Crown,
  Gift,
  RefreshCcw,
  Ticket,
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

import { AnimatedNumberText } from "@/components/animated-number-text";
import { EmailLoginDialog } from "@/components/email-login-dialog";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { MemberRecord, SyncMemberResponse } from "@/lib/member";
import {
  createEmptyPointsSummary,
  type PointLedgerRecord,
  type PointTier,
  type PointsSummaryRecord,
  type RewardRedeemRequest,
  type RewardRedeemResponse,
  type PointsSummaryResponse,
  type RewardCatalogId,
  type RewardCatalogItemRecord,
  type RewardCatalogResponse,
  type RewardRedemptionRecord,
  type RewardRedemptionsResponse,
} from "@/lib/points";
import {
  BSC_EXPLORER,
  getAppMetadata,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";
import { cn } from "@/lib/utils";

type RewardsPageState = {
  catalog: RewardCatalogItemRecord[];
  catalogError: string | null;
  email: string | null;
  error: string | null;
  member: MemberRecord | null;
  redemptions: RewardRedemptionRecord[];
  redemptionsError: string | null;
  status: "idle" | "loading" | "ready" | "error";
  summary: PointsSummaryRecord;
};

export function RewardsPage({
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
  const [state, setState] = useState<RewardsPageState>({
    catalog: [],
    catalogError: null,
    email: null,
    error: null,
    member: null,
    redemptions: [],
    redemptionsError: null,
    status: "idle",
    summary: createEmptyPointsSummary(),
  });
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [redeemingRewardId, setRedeemingRewardId] =
    useState<RewardCatalogId | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const isDisconnected = status !== "connected" || !accountAddress;
  const connectedAccountUrl = accountAddress
    ? `${BSC_EXPLORER}/address/${accountAddress}`
    : BSC_EXPLORER;

  const loadRewards = useCallback(
    async ({ background = false } = {}) => {
      if (!accountAddress) {
        return;
      }

      if (background) {
        setIsRefreshing(true);
      } else {
        setState((current) => ({
          ...current,
          catalogError: null,
          error: null,
          redemptionsError: null,
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
              : dictionary.rewardsPage.errors.loadFailed,
          );
        }

        if ("validationError" in syncData && syncData.validationError) {
          throw new Error(syncData.validationError);
        }

        const member = "member" in syncData ? syncData.member : null;

        if (!member) {
          throw new Error(dictionary.rewardsPage.errors.loadFailed);
        }

        const catalogTask = (async () => {
          const response = await fetch("/api/rewards/catalog");
          const data = (await response.json()) as
            | RewardCatalogResponse
            | { error?: string };

          if (!response.ok || !("rewards" in data)) {
            throw new Error(dictionary.rewardsPage.errors.catalogFailed);
          }

          return data.rewards;
        })();

        const summaryTask = member.status === "completed"
          ? (async () => {
              const response = await fetch(
                `/api/points/summary?email=${encodeURIComponent(email)}`,
              );
              const data = (await response.json()) as
                | PointsSummaryResponse
                | { error?: string };

              if (!response.ok || !("summary" in data)) {
                throw new Error(dictionary.rewardsPage.errors.loadFailed);
              }

              return {
                member: data.member,
                summary: data.summary,
              };
            })()
          : Promise.resolve({
              member,
              summary: createEmptyPointsSummary(),
            });

        const redemptionsTask = member.status === "completed"
          ? (async () => {
              const response = await fetch(
                `/api/rewards/redemptions?email=${encodeURIComponent(email)}`,
              );
              const data = (await response.json()) as
                | RewardRedemptionsResponse
                | { error?: string };

              if (!response.ok || !("redemptions" in data)) {
                throw new Error(dictionary.rewardsPage.errors.redemptionsFailed);
              }

              return {
                error: null,
                redemptions: data.redemptions,
              };
            })().catch((error) => {
              return {
                error:
                  error instanceof Error
                    ? error.message
                    : dictionary.rewardsPage.errors.redemptionsFailed,
                redemptions: [],
              };
            })
          : Promise.resolve({
              error: null,
              redemptions: [],
            });

        const [catalog, summaryResult, redemptionsResult] = await Promise.all([
          catalogTask,
          summaryTask,
          redemptionsTask,
        ]);

        setState({
          catalog,
          catalogError: null,
          email,
          error: null,
          member: summaryResult.member,
          redemptions: redemptionsResult.redemptions,
          redemptionsError: redemptionsResult.error,
          status: "ready",
          summary: summaryResult.summary,
        });
      } catch (error) {
        setState((current) => ({
          ...current,
          error:
            error instanceof Error
              ? error.message
              : dictionary.rewardsPage.errors.loadFailed,
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
      setIsLogoutDialogOpen(false);
      setIsRefreshing(false);
      setRedeemingRewardId(null);
      setActionError(null);
      setActionNotice(null);
      setState({
        catalog: [],
        catalogError: null,
        email: null,
        error: null,
        member: null,
        redemptions: [],
        redemptionsError: null,
        status: "idle",
        summary: createEmptyPointsSummary(),
      });
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

    void loadRewards();
  }, [accountAddress, chain.id, chain.name, locale, loadRewards, status]);

  useEffect(() => {
    if (!hasThirdwebClientId || status !== "connected" || !accountAddress) {
      return;
    }

    const handleFocus = () => {
      void loadRewards({ background: true });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadRewards({ background: true });
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [accountAddress, loadRewards, status]);

  function confirmLogout() {
    if (!wallet) {
      setIsLogoutDialogOpen(false);
      return;
    }

    setIsLogoutDialogOpen(false);
    disconnect(wallet);
  }

  const activeMember = state.member;
  const canBrowseRewards =
    state.status === "ready" || state.status === "loading" || Boolean(activeMember);
  const latestRedemptionsByReward = state.redemptions.reduce<
    Partial<Record<RewardCatalogId, RewardRedemptionRecord>>
  >((accumulator, redemption) => {
    if (!accumulator[redemption.rewardId]) {
      accumulator[redemption.rewardId] = redemption;
    }

    return accumulator;
  }, {});

  async function handleRedeemReward(rewardId: RewardCatalogId) {
    if (!state.email) {
      setActionError(dictionary.rewardsPage.errors.missingEmail);
      return;
    }

    setActionError(null);
    setActionNotice(null);
    setRedeemingRewardId(rewardId);

    try {
      const response = await fetch("/api/rewards/redemptions", {
        body: JSON.stringify({
          email: state.email,
          rewardId,
        } satisfies RewardRedeemRequest),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as
        | RewardRedeemResponse
        | { error?: string };

      if (!response.ok || !("summary" in data) || !("redemptions" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : dictionary.rewardsPage.errors.redeemFailed,
        );
      }

      setState((current) => ({
        ...current,
        error: null,
        member: data.member,
        redemptions: data.redemptions,
        redemptionsError: null,
        summary: data.summary,
      }));
      setActionNotice(dictionary.rewardsPage.notices.redeemSuccess);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : dictionary.rewardsPage.errors.redeemFailed,
      );
    } finally {
      setRedeemingRewardId(null);
    }
  }

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.12),transparent_24%),radial-gradient(circle_at_88%_10%,rgba(16,185,129,0.15),transparent_20%),radial-gradient(circle_at_50%_100%,rgba(249,115,22,0.12),transparent_24%)]" />
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
              <p className="eyebrow">{dictionary.rewardsPage.eyebrow}</p>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                  {dictionary.rewardsPage.title}
                </h1>
                <p className="text-sm text-slate-600">
                  {dictionary.rewardsPage.description}
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
        ) : state.status === "error" && !canBrowseRewards ? (
          <MessageCard tone="error">
            {state.error ?? dictionary.rewardsPage.errors.loadFailed}
          </MessageCard>
        ) : (
          <>
            <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
              <section className="relative overflow-hidden rounded-[32px] border border-slate-900/90 bg-[linear-gradient(135deg,#0f172a_0%,#312e81_48%,#0f766e_100%)] p-5 text-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:p-6">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.16),transparent_30%)]" />
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-2">
                    <InfoBadge className="border-white/14 bg-white/10 text-white/85">
                      {getTierLabel(state.summary.tier, dictionary)}
                    </InfoBadge>
                    {state.summary.nextTier ? (
                      <InfoBadge className="border-emerald-300/20 bg-emerald-300/12 text-emerald-100">
                        {formatTemplate(dictionary.rewardsPage.labels.pointsToNextTier, {
                          points: formatNumber(state.summary.pointsToNextTier, locale),
                        })}
                      </InfoBadge>
                    ) : (
                      <InfoBadge className="border-amber-300/24 bg-amber-300/14 text-amber-100">
                        {dictionary.rewardsPage.labels.maxTier}
                      </InfoBadge>
                    )}
                  </div>

                  <div className="mt-8 space-y-2">
                    <p className="text-sm uppercase tracking-[0.26em] text-white/55">
                      {dictionary.rewardsPage.labels.spendablePoints}
                    </p>
                    <AnimatedNumberText
                      className="text-4xl font-semibold tracking-tight sm:text-5xl"
                      locale={locale}
                      value={formatPoints(state.summary.spendablePoints, locale)}
                    />
                  </div>

                  <p className="mt-5 max-w-2xl text-sm leading-6 text-white/72">
                    {dictionary.rewardsPage.previewNote}
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <MiniStat
                      label={dictionary.rewardsPage.labels.lifetimePoints}
                      value={formatPoints(state.summary.lifetimePoints, locale)}
                    />
                    <MiniStat
                      label={dictionary.rewardsPage.labels.currentTier}
                      value={getTierLabel(state.summary.tier, dictionary)}
                    />
                    <MiniStat
                      label={dictionary.rewardsPage.labels.nextTier}
                      value={
                        state.summary.nextTier
                          ? getTierLabel(state.summary.nextTier, dictionary)
                          : dictionary.rewardsPage.labels.maxTier
                      }
                    />
                  </div>

                  <div className="mt-6 rounded-[24px] border border-white/12 bg-white/10 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/60">
                        {dictionary.rewardsPage.labels.progress}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
                        {state.summary.progressPercent}%
                      </p>
                    </div>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/12">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#f8fafc_0%,#fcd34d_45%,#34d399_100%)]"
                        style={{ width: `${state.summary.progressPercent}%` }}
                      />
                    </div>
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
                      void loadRewards({ background: true });
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
                    value={activeMember?.email ?? state.email ?? "-"}
                  />
                  <MetricCard
                    label={dictionary.walletPage.labels.memberStatus}
                    value={
                      activeMember
                        ? activeMember.status === "completed"
                          ? dictionary.member.completedValue
                          : dictionary.member.pendingValue
                        : "-"
                    }
                  />
                  <MetricCard
                    label={dictionary.referralsPage.labels.referralCode}
                    value={activeMember?.referralCode ?? "-"}
                  />
                  <MetricCard
                    label={dictionary.rewardsPage.labels.currentTier}
                    value={getTierLabel(state.summary.tier, dictionary)}
                  />
                </div>

                <div className="mt-4 rounded-[24px] border border-slate-200 bg-white/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                    {dictionary.walletPage.labels.updatedAt}
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {state.summary.updatedAt
                      ? formatDateTime(state.summary.updatedAt, locale)
                      : state.status === "loading"
                        ? dictionary.rewardsPage.loading
                        : "-"}
                  </p>
                </div>

                {activeMember?.status !== "completed" ? (
                  <div className="mt-4 space-y-4">
                    <MessageCard>{dictionary.rewardsPage.paymentRequired}</MessageCard>
                    <div className="grid gap-3 sm:flex sm:flex-wrap">
                      <Link
                        className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium !text-white transition hover:bg-slate-800 sm:w-auto"
                        href={`/${locale}/activate`}
                      >
                        {dictionary.rewardsPage.actions.completeSignup}
                      </Link>
                      <Link
                        className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                        href={`/${locale}/referrals`}
                      >
                        {dictionary.rewardsPage.actions.openReferrals}
                      </Link>
                    </div>
                  </div>
                ) : null}

                {state.error ? (
                  <div className="mt-4">
                    <MessageCard tone="error">{state.error}</MessageCard>
                  </div>
                ) : null}
              </section>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricStatCard
                label={dictionary.rewardsPage.labels.spendablePoints}
                value={formatPoints(state.summary.spendablePoints, locale)}
              />
              <MetricStatCard
                label={dictionary.rewardsPage.labels.lifetimePoints}
                value={formatPoints(state.summary.lifetimePoints, locale)}
              />
              <MetricStatCard
                label={dictionary.rewardsPage.labels.currentTier}
                value={getTierLabel(state.summary.tier, dictionary)}
              />
              <MetricStatCard
                label={dictionary.rewardsPage.labels.nextTier}
                value={
                  state.summary.nextTier
                    ? formatTemplate(dictionary.rewardsPage.labels.pointsToNextTier, {
                        points: formatNumber(state.summary.pointsToNextTier, locale),
                      })
                    : dictionary.rewardsPage.labels.maxTier
                }
              />
            </section>

            <section className="glass-card rounded-[30px] p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="eyebrow">{dictionary.rewardsPage.eyebrow}</p>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                    {dictionary.rewardsPage.labels.rewardCatalog}
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    {dictionary.rewardsPage.catalog.previewNote}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                    href={`/${locale}/referrals`}
                  >
                    {dictionary.rewardsPage.actions.openReferrals}
                  </Link>
                  <Link
                    className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                    href={`/${locale}`}
                  >
                    {dictionary.rewardsPage.actions.backHome}
                  </Link>
                </div>
              </div>

              <div className="mt-5">
                {actionNotice ? (
                  <div className="mb-4">
                    <MessageCard>{actionNotice}</MessageCard>
                  </div>
                ) : null}
                {actionError ? (
                  <div className="mb-4">
                    <MessageCard tone="error">{actionError}</MessageCard>
                  </div>
                ) : null}
                {state.status === "loading" && state.catalog.length === 0 ? (
                  <MessageCard>{dictionary.rewardsPage.loading}</MessageCard>
                ) : state.catalog.length === 0 ? (
                  <MessageCard>{dictionary.rewardsPage.catalog.empty}</MessageCard>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                    {state.catalog.map((reward) => (
                      <RewardCatalogCard
                        canRedeem={activeMember?.status === "completed"}
                        dictionary={dictionary}
                        isRedeeming={redeemingRewardId === reward.rewardId}
                        key={reward.rewardId}
                        locale={locale}
                        onRedeem={handleRedeemReward}
                        redemption={latestRedemptionsByReward[reward.rewardId] ?? null}
                        reward={reward}
                        spendablePoints={state.summary.spendablePoints}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[1.02fr_0.98fr]">
              <section className="glass-card rounded-[30px] p-5 sm:p-6">
                <div className="space-y-1">
                  <p className="eyebrow">{dictionary.rewardsPage.eyebrow}</p>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                    {dictionary.rewardsPage.labels.earnHistory}
                  </h2>
                </div>

                <div className="mt-5">
                  {state.status === "loading" && state.summary.history.length === 0 ? (
                    <MessageCard>{dictionary.rewardsPage.loading}</MessageCard>
                  ) : state.summary.history.length === 0 ? (
                    <MessageCard>{dictionary.rewardsPage.emptyHistory}</MessageCard>
                  ) : (
                    <div className="space-y-3">
                      {state.summary.history.map((entry) => (
                        <LedgerHistoryRow
                          dictionary={dictionary}
                          entry={entry}
                          key={entry.ledgerEntryId}
                          locale={locale}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="glass-card rounded-[30px] p-5 sm:p-6">
                <div className="space-y-1">
                  <p className="eyebrow">{dictionary.rewardsPage.eyebrow}</p>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                    {dictionary.rewardsPage.labels.redemptionHistory}
                  </h2>
                </div>

                <div className="mt-5">
                  {state.redemptionsError ? (
                    <MessageCard tone="error">{state.redemptionsError}</MessageCard>
                  ) : state.redemptions.length === 0 ? (
                    <MessageCard>{dictionary.rewardsPage.emptyRedemptions}</MessageCard>
                  ) : (
                    <div className="space-y-3">
                      {state.redemptions.map((redemption) => (
                        <RedemptionRow
                          dictionary={dictionary}
                          key={redemption.redemptionId}
                          locale={locale}
                          redemption={redemption}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/12 bg-white/8 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.22em] text-white/55">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
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

function RewardCatalogCard({
  canRedeem,
  dictionary,
  isRedeeming,
  locale,
  onRedeem,
  redemption,
  reward,
  spendablePoints,
}: {
  canRedeem: boolean;
  dictionary: Dictionary;
  isRedeeming: boolean;
  locale: Locale;
  onRedeem: (rewardId: RewardCatalogId) => void;
  redemption: RewardRedemptionRecord | null;
  reward: RewardCatalogItemRecord;
  spendablePoints: number;
}) {
  const isEligible = spendablePoints >= reward.costPoints;
  const statusLabel = redemption
    ? getRedemptionStatusLabel(redemption.status, dictionary)
    : isEligible
      ? dictionary.rewardsPage.catalog.eligible
      : formatTemplate(dictionary.rewardsPage.catalog.needMorePoints, {
          points: formatNumber(reward.costPoints - spendablePoints, locale),
        });
  const actionLabel = redemption
    ? getRedemptionStatusLabel(redemption.status, dictionary)
    : isRedeeming
      ? dictionary.rewardsPage.actions.redeeming
      : dictionary.rewardsPage.actions.redeem;
  const isActionDisabled = !canRedeem || !isEligible || Boolean(redemption) || isRedeeming;
  const Icon =
    reward.rewardType === "tier_upgrade"
      ? Crown
      : reward.rewardType === "nft_claim"
        ? Ticket
        : Gift;

  return (
    <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <Icon className="size-5" />
        </div>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-700">
          {dictionary.rewardsPage.catalog.previewBadge}
        </span>
      </div>

      <div className="mt-5">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
          {getRewardTypeLabel(reward.rewardType, dictionary)}
        </p>
        <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
          {getRewardTitle(reward.rewardId, dictionary)}
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {getRewardDescription(reward.rewardId, dictionary)}
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            {dictionary.rewardsPage.labels.rewardCost}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {formatPoints(reward.costPoints, locale)}
          </p>
        </div>
        <div
          className={cn(
            "rounded-[20px] border px-4 py-3 text-sm font-medium",
            redemption
              ? "border-blue-200 bg-blue-50 text-blue-900"
              : isEligible
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-slate-200 bg-slate-50 text-slate-700",
          )}
        >
          {statusLabel}
        </div>
        <button
          className={cn(
            "inline-flex h-11 w-full items-center justify-center rounded-full px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
            redemption
              ? "border border-blue-200 bg-blue-50 text-blue-900"
              : isEligible && canRedeem
                ? "bg-slate-950 text-white hover:bg-slate-800"
                : "border border-slate-200 bg-white text-slate-500",
          )}
          disabled={isActionDisabled}
          onClick={() => {
            onRedeem(reward.rewardId);
          }}
          type="button"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

function LedgerHistoryRow({
  dictionary,
  entry,
  locale,
}: {
  dictionary: Dictionary;
  entry: PointLedgerRecord;
  locale: Locale;
}) {
  const isPositive = entry.delta >= 0;
  const title =
    entry.sourceMemberEmail ??
    (entry.sourceType === "referral_reward"
      ? dictionary.rewardsPage.history.referralReward
      : entry.sourceType === "admin"
        ? dictionary.rewardsPage.history.adminAdjustment
        : dictionary.rewardsPage.history.other);
  const subtitle =
    entry.sourceType === "referral_reward" && entry.rewardLevel
      ? formatTemplate(dictionary.rewardsPage.history.levelReward, {
          level: entry.rewardLevel,
        })
      : entry.memo ?? dictionary.rewardsPage.history.other;

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/90 px-4 py-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <InfoBadge>
              {entry.type === "earn"
                ? dictionary.rewardsPage.history.earn
                : dictionary.rewardsPage.history.adjustment}
            </InfoBadge>
            {entry.rewardLevel ? (
              <InfoBadge>{`G${entry.rewardLevel}`}</InfoBadge>
            ) : null}
          </div>
          <p className="mt-3 truncate text-base font-semibold text-slate-950">
            {title}
          </p>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500">
            {formatDateTime(entry.createdAt, locale)}
          </p>
        </div>

        <p
          className={cn(
            "shrink-0 text-lg font-semibold tracking-tight",
            isPositive ? "text-emerald-700" : "text-rose-700",
          )}
        >
          {isPositive ? "+" : ""}
          {formatPoints(entry.delta, locale)}
        </p>
      </div>
    </div>
  );
}

function RedemptionRow({
  dictionary,
  locale,
  redemption,
}: {
  dictionary: Dictionary;
  locale: Locale;
  redemption: RewardRedemptionRecord;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/90 px-4 py-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <InfoBadge>
              {getRedemptionStatusLabel(redemption.status, dictionary)}
            </InfoBadge>
            <InfoBadge>
              {getRewardTypeLabelById(redemption.rewardId, dictionary)}
            </InfoBadge>
          </div>
          <p className="mt-3 truncate text-base font-semibold text-slate-950">
            {getRewardTitle(redemption.rewardId, dictionary)}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {formatDateTime(redemption.createdAt, locale)}
          </p>
        </div>

        <p className="shrink-0 text-lg font-semibold tracking-tight text-slate-950">
          -{formatPoints(redemption.costPoints, locale)}
        </p>
      </div>
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

function getRewardTypeLabelById(
  rewardId: RewardCatalogId,
  dictionary: Dictionary,
) {
  return getRewardTypeLabel(
    rewardId === "silver-card" || rewardId === "gold-card"
      ? "tier_upgrade"
      : rewardId === "vip-pass"
        ? "nft_claim"
        : "discount_coupon",
    dictionary,
  );
}

function getRewardTitle(rewardId: RewardCatalogId, dictionary: Dictionary) {
  if (rewardId === "silver-card") {
    return dictionary.rewardsPage.catalog.silverCard.title;
  }

  if (rewardId === "gold-card") {
    return dictionary.rewardsPage.catalog.goldCard.title;
  }

  if (rewardId === "vip-pass") {
    return dictionary.rewardsPage.catalog.vipPass.title;
  }

  return dictionary.rewardsPage.catalog.serviceCredit.title;
}

function getRewardDescription(rewardId: RewardCatalogId, dictionary: Dictionary) {
  if (rewardId === "silver-card") {
    return dictionary.rewardsPage.catalog.silverCard.description;
  }

  if (rewardId === "gold-card") {
    return dictionary.rewardsPage.catalog.goldCard.description;
  }

  if (rewardId === "vip-pass") {
    return dictionary.rewardsPage.catalog.vipPass.description;
  }

  return dictionary.rewardsPage.catalog.serviceCredit.description;
}

function getRewardTypeLabel(
  rewardType: RewardCatalogItemRecord["rewardType"],
  dictionary: Dictionary,
) {
  if (rewardType === "tier_upgrade") {
    return dictionary.rewardsPage.rewardTypes.tierUpgrade;
  }

  if (rewardType === "nft_claim") {
    return dictionary.rewardsPage.rewardTypes.nftClaim;
  }

  return dictionary.rewardsPage.rewardTypes.discountCoupon;
}

function getRedemptionStatusLabel(
  status: RewardRedemptionRecord["status"],
  dictionary: Dictionary,
) {
  if (status === "completed") {
    return dictionary.rewardsPage.redemptionStatus.completed;
  }

  if (status === "failed") {
    return dictionary.rewardsPage.redemptionStatus.failed;
  }

  if (status === "queued") {
    return dictionary.rewardsPage.redemptionStatus.queued;
  }

  if (status === "cancelled") {
    return dictionary.rewardsPage.redemptionStatus.cancelled;
  }

  return dictionary.rewardsPage.redemptionStatus.pending;
}

function getTierLabel(tier: PointTier, dictionary: Dictionary) {
  if (tier === "silver") {
    return dictionary.rewardsPage.tiers.silver;
  }

  if (tier === "gold") {
    return dictionary.rewardsPage.tiers.gold;
  }

  if (tier === "vip") {
    return dictionary.rewardsPage.tiers.vip;
  }

  return dictionary.rewardsPage.tiers.basic;
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

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatPoints(value: number, locale: string) {
  return `${formatNumber(value, locale)}P`;
}

function formatTemplate(
  template: string,
  replacements: Record<string, string | number>,
) {
  return Object.entries(replacements).reduce((message, [key, value]) => {
    return message.replaceAll(`{${key}}`, String(value));
  }, template);
}
