"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Gift,
  LockKeyhole,
  RefreshCcw,
  Sparkles,
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
import type {
  SilverRewardClaimRecord,
  SilverRewardClaimSummaryResponse,
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
import { cn } from "@/lib/utils";

type RewardsPageState = {
  catalog: RewardCatalogItemRecord[];
  catalogError: string | null;
  email: string | null;
  error: string | null;
  member: MemberRecord | null;
  redemptions: RewardRedemptionRecord[];
  redemptionsError: string | null;
  silverClaim: SilverRewardClaimRecord | null;
  silverClaimError: string | null;
  status: "idle" | "loading" | "ready" | "error";
  summary: PointsSummaryRecord;
};

const HISTORY_PAGE_SIZE = 8;

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
    silverClaim: null,
    silverClaimError: null,
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
  const [historyPage, setHistoryPage] = useState(1);
  const isDisconnected = status !== "connected" || !accountAddress;
  const connectedAccountUrl = accountAddress
    ? `${BSC_EXPLORER}/address/${accountAddress}`
    : BSC_EXPLORER;
  const historyPageCount = Math.max(
    1,
    Math.ceil(state.summary.history.length / HISTORY_PAGE_SIZE),
  );
  const currentHistoryPage = Math.min(historyPage, historyPageCount);
  const paginatedHistory = state.summary.history.slice(
    (currentHistoryPage - 1) * HISTORY_PAGE_SIZE,
    currentHistoryPage * HISTORY_PAGE_SIZE,
  );

  useEffect(() => {
    setHistoryPage((currentPage) => Math.min(currentPage, historyPageCount));
  }, [historyPageCount]);

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
          silverClaimError: null,
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

        const silverClaimTask = member.status === "completed"
          ? (async () => {
              const response = await fetch(
                `/api/rewards/silver-claim?email=${encodeURIComponent(email)}`,
              );
              const data = (await response.json()) as
                | SilverRewardClaimSummaryResponse
                | { error?: string };

              if (!response.ok || !("claim" in data)) {
                throw new Error(dictionary.rewardsPage.silverClaim.errors.loadFailed);
              }

              return {
                claim: data.claim,
                error: null,
              };
            })().catch((error) => {
              return {
                claim: null,
                error:
                  error instanceof Error
                    ? error.message
                    : dictionary.rewardsPage.silverClaim.errors.loadFailed,
              };
            })
          : Promise.resolve({
              claim: null,
              error: null,
            });

        const [catalog, summaryResult, redemptionsResult, silverClaimResult] =
          await Promise.all([
            catalogTask,
            summaryTask,
            redemptionsTask,
            silverClaimTask,
          ]);

        setState({
          catalog,
          catalogError: null,
          email,
          error: null,
          member: summaryResult.member,
          redemptions: redemptionsResult.redemptions,
          redemptionsError: redemptionsResult.error,
          silverClaim: silverClaimResult.claim,
          silverClaimError: silverClaimResult.error,
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
        silverClaim: null,
        silverClaimError: null,
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
                {state.silverClaimError ? (
                  <div className="mb-4">
                    <MessageCard tone="error">{state.silverClaimError}</MessageCard>
                  </div>
                ) : null}
                {state.status === "loading" && state.catalog.length === 0 ? (
                  <MessageCard>{dictionary.rewardsPage.loading}</MessageCard>
                ) : state.catalog.length === 0 ? (
                  <MessageCard>{dictionary.rewardsPage.catalog.empty}</MessageCard>
                ) : (
                  <div className="grid gap-4 sm:[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
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
                        silverClaim={
                          reward.rewardId === "silver-card" ? state.silverClaim : null
                        }
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
                    <LedgerHistoryTable
                      currentPage={currentHistoryPage}
                      dictionary={dictionary}
                      entries={paginatedHistory}
                      locale={locale}
                      onPageChange={setHistoryPage}
                      pageCount={historyPageCount}
                      totalEntries={state.summary.history.length}
                    />
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
  silverClaim,
  spendablePoints,
}: {
  canRedeem: boolean;
  dictionary: Dictionary;
  isRedeeming: boolean;
  locale: Locale;
  onRedeem: (rewardId: RewardCatalogId) => void;
  redemption: RewardRedemptionRecord | null;
  reward: RewardCatalogItemRecord;
  silverClaim: SilverRewardClaimRecord | null;
  spendablePoints: number;
}) {
  const theme = getRewardCardTheme(reward.rewardId, dictionary);
  const rewardTypeLabel = getRewardTypeLabel(reward.rewardType, dictionary);
  const rewardTitle = getRewardTitle(reward.rewardId, dictionary);
  const rewardDescription = getRewardDescription(reward.rewardId, dictionary);
  const isEligible = spendablePoints >= reward.costPoints;
  const hasRedemption = Boolean(redemption);
  const isCompletedReward = redemption?.status === "completed";
  const isProcessingReward =
    redemption?.status === "pending" || redemption?.status === "queued";
  const isSilverReward =
    reward.rewardId === "silver-card" && redemption?.status === "completed";
  const isLocked = !hasRedemption && !isEligible;
  const StateIcon = isCompletedReward
    ? CheckCircle2
    : hasRedemption
      ? RefreshCcw
      : isEligible
        ? Sparkles
        : LockKeyhole;
  const statusLabel = isSilverReward
    ? silverClaim
      ? getSilverClaimStatusLabel(silverClaim.status, dictionary)
      : dictionary.rewardsPage.silverClaim.statuses.available
    : redemption
      ? getRedemptionStatusLabel(redemption.status, dictionary)
      : isEligible
        ? dictionary.rewardsPage.catalog.eligible
        : formatTemplate(dictionary.rewardsPage.catalog.needMorePoints, {
            points: formatNumber(reward.costPoints - spendablePoints, locale),
          });
  const actionLabel = isSilverReward
    ? silverClaim?.status === "completed"
      ? dictionary.rewardsPage.silverClaim.statuses.completed
      : silverClaim?.status === "pending"
        ? dictionary.rewardsPage.silverClaim.statuses.pending
        : dictionary.rewardsPage.silverClaim.actions.open
    : redemption
      ? getRedemptionStatusLabel(redemption.status, dictionary)
      : isRedeeming
        ? dictionary.rewardsPage.actions.redeeming
        : dictionary.rewardsPage.actions.redeem;
  const isActionDisabled = isSilverReward
    ? silverClaim?.status === "completed" || silverClaim?.status === "pending"
    : !canRedeem || !isEligible || Boolean(redemption) || isRedeeming;
  const Icon =
    reward.rewardType === "tier_upgrade"
      ? Crown
      : reward.rewardType === "nft_claim"
        ? Ticket
        : Gift;
  const surfaceClassName = isCompletedReward
    ? theme.completedSurfaceClassName
    : theme.pendingSurfaceClassName;
  const iconClassName = isCompletedReward
    ? theme.completedIconClassName
    : theme.pendingIconClassName;
  const toneLabelClassName = isCompletedReward
    ? theme.completedToneLabelClassName
    : theme.pendingToneLabelClassName;
  const statusClassName = isCompletedReward
    ? theme.completedStatusClassName
    : hasRedemption
      ? "border-blue-200 bg-blue-50 text-blue-900"
      : isEligible
        ? theme.readyStatusClassName
        : "border-slate-200 bg-slate-50 text-slate-700";
  const panelClassName = isCompletedReward
    ? "border-white/12 bg-white/10 text-white/88"
    : "border-slate-200 bg-white/90 text-slate-700";
  const titleClassName = isCompletedReward ? "text-white" : "text-slate-950";
  const descriptionClassName = isCompletedReward
    ? "text-white/72"
    : "text-slate-600";
  const metaLabelClassName = isCompletedReward
    ? "text-white/55"
    : "text-slate-500";
  const costValueClassName = isCompletedReward ? "text-white" : "text-slate-950";
  const actionClassName = isCompletedReward
    ? isActionDisabled
      ? "border border-white/14 bg-white/10 !text-white/75"
      : "bg-white !text-slate-950 hover:bg-slate-100"
    : isEligible && canRedeem
      ? theme.readyActionClassName
      : "border border-slate-200 bg-white !text-slate-500";
  const highlightCopy = isCompletedReward
    ? isSilverReward && silverClaim?.status !== "completed"
      ? dictionary.rewardsPage.silverClaim.actions.open
      : dictionary.rewardsPage.redemptionStatus.completed
    : hasRedemption
      ? getRedemptionStatusLabel(redemption?.status ?? "pending", dictionary)
      : isLocked
        ? formatTemplate(dictionary.rewardsPage.catalog.needMorePoints, {
            points: formatNumber(reward.costPoints - spendablePoints, locale),
          })
        : dictionary.rewardsPage.catalog.eligible;

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-[30px] p-[1px] transition duration-300",
        isCompletedReward
          ? theme.completedFrameClassName
          : theme.pendingFrameClassName,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-6 top-0 h-24 rounded-b-[28px] blur-3xl",
          theme.glowClassName,
        )}
      />
      <div
        className={cn(
          "relative flex h-full flex-col rounded-[29px] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-6",
          surfaceClassName,
        )}
      >
        <div className="flex flex-col gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-[0_14px_28px_rgba(15,23,42,0.12)]",
                iconClassName,
              )}
            >
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <p
                className={cn(
                  "break-keep text-[0.72rem] font-medium leading-5 tracking-[0.14em]",
                  metaLabelClassName,
                )}
              >
                {rewardTypeLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em]",
                toneLabelClassName,
              )}
            >
              {theme.accentLabel}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em]",
                isCompletedReward
                  ? "border-white/14 bg-white/10 text-white/82"
                  : "border-slate-200 bg-white/80 text-slate-700",
              )}
            >
              {dictionary.rewardsPage.catalog.previewBadge}
            </span>
            {isCompletedReward ? (
              <span className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/14 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-emerald-100">
                {dictionary.rewardsPage.redemptionStatus.completed}
              </span>
            ) : null}
            <span
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.7rem] font-semibold tracking-[0.14em] sm:ml-auto",
                statusClassName,
              )}
            >
              <StateIcon
                className={cn(
                  "size-3.5 shrink-0",
                  isProcessingReward && "animate-spin",
                )}
              />
              <span className="break-keep">{statusLabel}</span>
            </span>
          </div>

          <h3
            className={cn(
              "mt-1 break-keep text-xl font-semibold leading-[1.2] tracking-tight",
              titleClassName,
            )}
          >
            {rewardTitle}
          </h3>
          <p
            className={cn(
              "mt-3 break-keep text-sm leading-6",
              descriptionClassName,
            )}
          >
            {rewardDescription}
          </p>
        </div>

        <div className="mt-6 grid gap-3">
          <div className={cn("rounded-[22px] border px-4 py-3", panelClassName)}>
            <p className={cn("text-xs uppercase tracking-[0.22em]", metaLabelClassName)}>
              {dictionary.rewardsPage.labels.rewardCost}
            </p>
            <p className={cn("mt-2 text-sm font-semibold", costValueClassName)}>
              {formatPoints(reward.costPoints, locale)}
            </p>
          </div>
          <div className={cn("rounded-[22px] border px-4 py-3", panelClassName)}>
            <p className={cn("text-xs uppercase tracking-[0.22em]", metaLabelClassName)}>
              {dictionary.rewardsPage.labels.progress}
            </p>
            <p className={cn("mt-2 text-sm font-semibold", costValueClassName)}>
              {highlightCopy}
            </p>
            {!isCompletedReward && !hasRedemption ? (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className={cn("h-full rounded-full", theme.progressBarClassName)}
                  style={{
                    width: `${Math.max(
                      8,
                      Math.min(
                        100,
                        Math.round((spendablePoints / reward.costPoints) * 100),
                      ),
                    )}%`,
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-auto pt-6">
          {isSilverReward && !isActionDisabled ? (
            <Link
              className={cn(
                "inline-flex h-11 w-full items-center justify-center rounded-full px-4 text-sm font-medium transition",
                actionClassName,
              )}
              href={`/${locale}/rewards/silver-claim`}
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              className={cn(
                "inline-flex h-11 w-full items-center justify-center rounded-full px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
                actionClassName,
              )}
              disabled={isActionDisabled}
              onClick={() => {
                onRedeem(reward.rewardId);
              }}
              type="button"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function LedgerHistoryTable({
  currentPage,
  dictionary,
  entries,
  locale,
  onPageChange,
  pageCount,
  totalEntries,
}: {
  currentPage: number;
  dictionary: Dictionary;
  entries: PointLedgerRecord[];
  locale: Locale;
  onPageChange: (page: number) => void;
  pageCount: number;
  totalEntries: number;
}) {
  const startIndex = (currentPage - 1) * HISTORY_PAGE_SIZE + 1;
  const endIndex = Math.min(currentPage * HISTORY_PAGE_SIZE, totalEntries);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600 sm:hidden">
        <ArrowLeftRight className="size-3.5 shrink-0 text-slate-400" />
        <span>{dictionary.rewardsPage.history.mobileScrollHint}</span>
      </div>
      <div className="w-full max-w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white/90 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="-mx-5 w-[calc(100%+2.5rem)] overflow-x-auto px-5 pb-2 pt-0.5 touch-pan-x overscroll-x-contain [scrollbar-width:thin] [-webkit-overflow-scrolling:touch] sm:mx-0 sm:w-full sm:px-0">
          <table className="w-full min-w-[52rem] border-separate border-spacing-0 sm:min-w-[54rem]">
            <thead>
              <tr className="bg-slate-50/90">
                <th
                  className="min-w-[8rem] whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500"
                  scope="col"
                >
                  {dictionary.rewardsPage.history.typeLabel}
                </th>
                <th
                  className="min-w-[16rem] whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500"
                  scope="col"
                >
                  {dictionary.rewardsPage.history.sourceLabel}
                </th>
                <th
                  className="min-w-[9rem] whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500"
                  scope="col"
                >
                  {dictionary.rewardsPage.history.detailsLabel}
                </th>
                <th
                  className="min-w-[12rem] whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500"
                  scope="col"
                >
                  {dictionary.rewardsPage.history.dateLabel}
                </th>
                <th
                  className="min-w-[8rem] whitespace-nowrap border-b border-slate-200 px-4 py-3 text-right text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500"
                  scope="col"
                >
                  {dictionary.rewardsPage.history.pointsLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => {
                const isPositive = entry.delta >= 0;
                const typeLabel =
                  entry.type === "earn"
                    ? dictionary.rewardsPage.history.earn
                    : dictionary.rewardsPage.history.adjustment;
                const sourceLabel =
                  entry.sourceMemberEmail ??
                  (entry.sourceType === "referral_reward"
                    ? dictionary.rewardsPage.history.referralReward
                    : entry.sourceType === "admin"
                      ? dictionary.rewardsPage.history.adminAdjustment
                      : dictionary.rewardsPage.history.other);
                const detailsLabel =
                  entry.sourceType === "referral_reward" && entry.rewardLevel
                    ? formatTemplate(dictionary.rewardsPage.history.levelReward, {
                        level: entry.rewardLevel,
                      })
                    : entry.memo ?? dictionary.rewardsPage.history.other;
                const rowBorderClass =
                  index < entries.length - 1 ? "border-b border-slate-100" : "";

                return (
                  <tr className="align-middle" key={entry.ledgerEntryId}>
                    <td className={cn("min-w-[8rem] px-4 py-3.5", rowBorderClass)}>
                      <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                        <InfoBadge>{typeLabel}</InfoBadge>
                        {entry.rewardLevel ? (
                          <InfoBadge>{`G${entry.rewardLevel}`}</InfoBadge>
                        ) : null}
                      </div>
                    </td>
                    <td className={cn("min-w-[16rem] px-4 py-3.5", rowBorderClass)}>
                      <p className="whitespace-nowrap text-sm font-medium text-slate-950">
                        {sourceLabel}
                      </p>
                    </td>
                    <td className={cn("min-w-[9rem] px-4 py-3.5", rowBorderClass)}>
                      <p className="whitespace-nowrap text-sm leading-6 text-slate-600">
                        {detailsLabel}
                      </p>
                    </td>
                    <td className={cn("min-w-[12rem] px-4 py-3.5", rowBorderClass)}>
                      <p className="whitespace-nowrap text-sm text-slate-600">
                        {formatDateTime(entry.createdAt, locale)}
                      </p>
                    </td>
                    <td className={cn("min-w-[8rem] px-4 py-3.5 text-right", rowBorderClass)}>
                      <span
                        className={cn(
                          "ml-auto inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-sm font-semibold tabular-nums",
                          isPositive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                            : "border-rose-200 bg-rose-50 text-rose-900",
                        )}
                      >
                        {isPositive ? "+" : ""}
                        {formatPoints(entry.delta, locale)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          {startIndex}-{endIndex} / {totalEntries}
        </p>
        <div className="flex items-center gap-2">
          <button
            aria-label={dictionary.rewardsPage.history.previousPage}
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage <= 1}
            onClick={() => {
              onPageChange(currentPage - 1);
            }}
            type="button"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="min-w-16 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-center text-sm font-medium text-slate-700">
            {currentPage} / {pageCount}
          </div>
          <button
            aria-label={dictionary.rewardsPage.history.nextPage}
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage >= pageCount}
            onClick={() => {
              onPageChange(currentPage + 1);
            }}
            type="button"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
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
  const transactionUrl = redemption.txHash
    ? `${BSC_EXPLORER}/tx/${redemption.txHash}`
    : null;

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
            {redemption.tokenId ? (
              <InfoBadge className="font-mono">{`#${redemption.tokenId}`}</InfoBadge>
            ) : null}
            {transactionUrl ? (
              <Link
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                href={transactionUrl}
                rel="noreferrer"
                target="_blank"
              >
                <span className="font-mono">
                  {shortenHash(redemption.txHash ?? "")}
                </span>
                <ArrowUpRight className="size-3.5" />
              </Link>
            ) : null}
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

function shortenHash(value: string) {
  if (value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
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

type RewardCardTheme = {
  accentLabel: string;
  completedFrameClassName: string;
  completedIconClassName: string;
  completedStatusClassName: string;
  completedSurfaceClassName: string;
  completedToneLabelClassName: string;
  glowClassName: string;
  pendingFrameClassName: string;
  pendingIconClassName: string;
  pendingSurfaceClassName: string;
  pendingToneLabelClassName: string;
  progressBarClassName: string;
  readyActionClassName: string;
  readyStatusClassName: string;
};

function getRewardCardTheme(
  rewardId: RewardCatalogId,
  dictionary: Dictionary,
): RewardCardTheme {
  if (rewardId === "silver-card") {
    return {
      accentLabel: dictionary.rewardsPage.tiers.silver,
      completedFrameClassName:
        "bg-[linear-gradient(145deg,rgba(226,232,240,0.9),rgba(148,163,184,0.96),rgba(34,211,238,0.82))]",
      completedIconClassName: "bg-white/14 text-white",
      completedStatusClassName:
        "border-white/14 bg-white/12 text-white/88",
      completedSurfaceClassName:
        "bg-[linear-gradient(145deg,#0f172a_0%,#334155_48%,#0f766e_100%)]",
      completedToneLabelClassName:
        "border-white/14 bg-white/10 text-white/82",
      glowClassName: "bg-cyan-300/30",
      pendingFrameClassName:
        "bg-[linear-gradient(145deg,rgba(226,232,240,0.95),rgba(203,213,225,0.9),rgba(125,211,252,0.82))]",
      pendingIconClassName: "bg-slate-100 text-slate-700",
      pendingSurfaceClassName:
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,249,255,0.95))]",
      pendingToneLabelClassName:
        "border-slate-300 bg-slate-50 text-slate-700",
      progressBarClassName:
        "bg-[linear-gradient(90deg,#94a3b8_0%,#38bdf8_55%,#22d3ee_100%)]",
      readyActionClassName:
        "bg-[linear-gradient(135deg,#0f172a_0%,#334155_58%,#0891b2_100%)] !text-white hover:opacity-95",
      readyStatusClassName: "border-cyan-200 bg-cyan-50 text-cyan-900",
    };
  }

  if (rewardId === "gold-card") {
    return {
      accentLabel: dictionary.rewardsPage.tiers.gold,
      completedFrameClassName:
        "bg-[linear-gradient(145deg,rgba(254,240,138,0.95),rgba(251,191,36,0.98),rgba(249,115,22,0.82))]",
      completedIconClassName: "bg-white/14 text-white",
      completedStatusClassName:
        "border-white/14 bg-white/12 text-white/88",
      completedSurfaceClassName:
        "bg-[linear-gradient(145deg,#451a03_0%,#b45309_52%,#f59e0b_100%)]",
      completedToneLabelClassName:
        "border-white/14 bg-white/10 text-white/82",
      glowClassName: "bg-amber-300/35",
      pendingFrameClassName:
        "bg-[linear-gradient(145deg,rgba(254,243,199,0.95),rgba(253,230,138,0.95),rgba(251,146,60,0.82))]",
      pendingIconClassName: "bg-amber-100 text-amber-700",
      pendingSurfaceClassName:
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,235,0.96))]",
      pendingToneLabelClassName:
        "border-amber-200 bg-amber-50 text-amber-800",
      progressBarClassName:
        "bg-[linear-gradient(90deg,#fcd34d_0%,#f59e0b_55%,#f97316_100%)]",
      readyActionClassName:
        "bg-[linear-gradient(135deg,#78350f_0%,#b45309_58%,#f59e0b_100%)] !text-white hover:opacity-95",
      readyStatusClassName: "border-amber-200 bg-amber-50 text-amber-900",
    };
  }

  if (rewardId === "vip-pass") {
    return {
      accentLabel: dictionary.rewardsPage.tiers.vip,
      completedFrameClassName:
        "bg-[linear-gradient(145deg,rgba(167,243,208,0.92),rgba(16,185,129,0.95),rgba(56,189,248,0.82))]",
      completedIconClassName: "bg-white/14 text-white",
      completedStatusClassName:
        "border-white/14 bg-white/12 text-white/88",
      completedSurfaceClassName:
        "bg-[linear-gradient(145deg,#052e2b_0%,#065f46_48%,#0284c7_100%)]",
      completedToneLabelClassName:
        "border-white/14 bg-white/10 text-white/82",
      glowClassName: "bg-emerald-300/35",
      pendingFrameClassName:
        "bg-[linear-gradient(145deg,rgba(209,250,229,0.95),rgba(167,243,208,0.94),rgba(125,211,252,0.8))]",
      pendingIconClassName: "bg-emerald-100 text-emerald-700",
      pendingSurfaceClassName:
        "bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,253,245,0.96))]",
      pendingToneLabelClassName:
        "border-emerald-200 bg-emerald-50 text-emerald-800",
      progressBarClassName:
        "bg-[linear-gradient(90deg,#34d399_0%,#10b981_50%,#38bdf8_100%)]",
      readyActionClassName:
        "bg-[linear-gradient(135deg,#064e3b_0%,#059669_54%,#0284c7_100%)] !text-white hover:opacity-95",
      readyStatusClassName: "border-emerald-200 bg-emerald-50 text-emerald-900",
    };
  }

  return {
    accentLabel: dictionary.rewardsPage.rewardTypes.discountCoupon,
    completedFrameClassName:
      "bg-[linear-gradient(145deg,rgba(191,219,254,0.95),rgba(56,189,248,0.92),rgba(251,113,133,0.78))]",
    completedIconClassName: "bg-white/14 text-white",
    completedStatusClassName:
      "border-white/14 bg-white/12 text-white/88",
    completedSurfaceClassName:
      "bg-[linear-gradient(145deg,#0f172a_0%,#0369a1_50%,#fb7185_100%)]",
    completedToneLabelClassName:
      "border-white/14 bg-white/10 text-white/82",
    glowClassName: "bg-sky-300/35",
    pendingFrameClassName:
      "bg-[linear-gradient(145deg,rgba(219,234,254,0.95),rgba(186,230,253,0.9),rgba(254,205,211,0.85))]",
    pendingIconClassName: "bg-sky-100 text-sky-700",
    pendingSurfaceClassName:
      "bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.96))]",
    pendingToneLabelClassName:
      "border-sky-200 bg-sky-50 text-sky-800",
    progressBarClassName:
      "bg-[linear-gradient(90deg,#60a5fa_0%,#0ea5e9_55%,#fb7185_100%)]",
    readyActionClassName:
      "bg-[linear-gradient(135deg,#0f172a_0%,#0369a1_56%,#fb7185_100%)] !text-white hover:opacity-95",
    readyStatusClassName: "border-sky-200 bg-sky-50 text-sky-900",
  };
}

function getSilverClaimStatusLabel(
  status: SilverRewardClaimRecord["status"],
  dictionary: Dictionary,
) {
  if (status === "completed") {
    return dictionary.rewardsPage.silverClaim.statuses.completed;
  }

  if (status === "failed") {
    return dictionary.rewardsPage.silverClaim.statuses.failed;
  }

  return dictionary.rewardsPage.silverClaim.statuses.pending;
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
