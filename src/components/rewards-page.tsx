"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
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
  WalletMinimal,
} from "lucide-react";
import {
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { AnimatedNumberText } from "@/components/animated-number-text";
import { EmailLoginDialog } from "@/components/email-login-dialog";
import { useMemberSession } from "@/components/member-session-provider";
import {
  buildPathWithReferral,
  setLandingLanguageContext,
} from "@/lib/landing-branding";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { MemberRecord } from "@/lib/member";
import { syncServerMemberRegistration } from "@/lib/member-session-client";
import {
  getServiceConnectModalTitle,
  SERVICE_BRAND_NAME,
} from "@/lib/service-branding";
import { getThirdwebUserEmail, useThirdwebConnectionState } from "@/lib/thirdweb-client";
import {
  createEmptyPointsSummary,
  isRepeatableRewardCatalogId,
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
  SilverRewardQuoteRecord,
} from "@/lib/silver-reward-claim";
import {
  BSC_EXPLORER,
  hasThirdwebClientId,
  smartWalletChain,
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
  silverQuote: SilverRewardQuoteRecord | null;
  status: "idle" | "loading" | "ready" | "error";
  summary: PointsSummaryRecord;
};

type RewardRedeemDialogState = {
  error: string | null;
  phase: "confirm" | "processing" | "success" | "error";
  reward: RewardCatalogItemRecord;
  silverQuote: SilverRewardQuoteRecord | null;
  spendablePointsBefore: number;
};

const HISTORY_PAGE_SIZE = 8;

export function RewardsPage({
  dictionary,
  landingLanguage = null,
  locale,
  referralCode = null,
  returnTo = null,
}: {
  dictionary: Dictionary;
  landingLanguage?: string | null;
  locale: Locale;
  referralCode?: string | null;
  returnTo?: string | null;
}) {
  const account = useActiveAccount();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const memberSession = useMemberSession();
  const memberSessionEmail =
    accountAddress &&
    memberSession.accountAddress?.toLowerCase() === accountAddress.toLowerCase()
      ? memberSession.email
      : null;
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
    silverQuote: null,
    status: "idle",
    summary: createEmptyPointsSummary(),
  });
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [redeemingRewardId, setRedeemingRewardId] =
    useState<RewardCatalogId | null>(null);
  const [redeemDialog, setRedeemDialog] =
    useState<RewardRedeemDialogState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const activateHref =
    returnTo ??
    setLandingLanguageContext(
      buildPathWithReferral(`/${locale}/activate`, referralCode),
      landingLanguage,
    );
  const silverClaimHref = setLandingLanguageContext(
    buildPathWithReferral(`/${locale}/rewards/silver-claim`, referralCode),
    landingLanguage,
  );
  const {
    isDisconnected,
    isResolving: isConnectionResolving,
  } = useThirdwebConnectionState({
    accountAddress,
    status,
  });
  const historyPageCount = Math.max(
    1,
    Math.ceil(state.summary.history.length / HISTORY_PAGE_SIZE),
  );
  const currentHistoryPage = Math.min(historyPage, historyPageCount);
  const paginatedHistory = state.summary.history.slice(
    (currentHistoryPage - 1) * HISTORY_PAGE_SIZE,
    currentHistoryPage * HISTORY_PAGE_SIZE,
  );
  const pointContextCopy = getRewardPointContextCopy(locale);
  const nextTierName = state.summary.nextTier
    ? getTierLabel(state.summary.nextTier, dictionary)
    : null;
  const nextTierStatusLabel = nextTierName
    ? pointContextCopy.nextTierNeeded(
        nextTierName,
        formatNumber(state.summary.pointsToNextTier, locale),
      )
    : dictionary.rewardsPage.labels.maxTier;

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
          silverQuote: null,
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
          throw new Error(syncData.error || dictionary.rewardsPage.errors.loadFailed);
        }

        if (syncData.validationError) {
          throw new Error(syncData.validationError);
        }

        const member = syncData.member;

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
              const response = await fetch("/api/points/summary");
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
              const response = await fetch("/api/rewards/redemptions");
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
              const response = await fetch("/api/rewards/silver-claim");
              const data = (await response.json()) as
                | SilverRewardClaimSummaryResponse
                | { error?: string };

              if (!response.ok || !("claim" in data)) {
                throw new Error(dictionary.rewardsPage.silverClaim.errors.loadFailed);
              }

              return {
                claim: data.claim,
                error: null,
                quote: data.quote,
              };
            })().catch((error) => {
              return {
                claim: null,
                error:
                  error instanceof Error
                    ? error.message
                    : dictionary.rewardsPage.silverClaim.errors.loadFailed,
                quote: null,
              };
            })
          : Promise.resolve({
              claim: null,
              error: null,
              quote: null,
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
          silverQuote: silverClaimResult.quote,
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
    [accountAddress, chain.id, chain.name, dictionary, locale, memberSessionEmail],
  );

  useEffect(() => {
    if (status !== "connected") {
      setIsRefreshing(false);
      setRedeemingRewardId(null);
      setRedeemDialog(null);
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
        silverQuote: null,
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
  const rewardsActionCopy = getRewardsActionCopy(locale);
  const nextRedeemableReward = state.catalog.find((reward) => {
    if (state.summary.spendablePoints < reward.costPoints) {
      return false;
    }

    return (
      isRepeatableRewardCatalogId(reward.rewardId) ||
      !latestRedemptionsByReward[reward.rewardId]
    );
  });
  const nearestLockedReward = state.catalog
    .filter((reward) => state.summary.spendablePoints < reward.costPoints)
    .sort((first, second) => first.costPoints - second.costPoints)[0];
  const nextRewardTitle = nextRedeemableReward
    ? getRewardTitle(nextRedeemableReward.rewardId, dictionary)
    : nearestLockedReward
      ? getRewardTitle(nearestLockedReward.rewardId, dictionary)
      : null;
  const nextRewardPointGap = nearestLockedReward
    ? Math.max(0, nearestLockedReward.costPoints - state.summary.spendablePoints)
    : 0;
  const rewardPrimaryAction =
    activeMember && activeMember.status !== "completed"
      ? rewardsActionCopy.completeSignup
      : nextRedeemableReward
        ? rewardsActionCopy.redeemReady(nextRewardTitle ?? "")
        : nearestLockedReward
          ? rewardsActionCopy.needMorePoints(
              nextRewardTitle ?? "",
              formatNumber(nextRewardPointGap, locale),
            )
          : rewardsActionCopy.reviewHistory;

  function handleRedeemReward(rewardId: RewardCatalogId) {
    const reward = state.catalog.find((item) => item.rewardId === rewardId);

    if (reward?.rewardId === "silver-card") {
      setActionError(null);
      setActionNotice(null);
      setRedeemDialog({
        error: null,
        phase: "confirm",
        reward,
        silverQuote: state.silverQuote,
        spendablePointsBefore: state.summary.spendablePoints,
      });
      return;
    }

    void redeemReward(rewardId);
  }

  async function redeemReward(
    rewardId: RewardCatalogId,
    { useDialog = false }: { useDialog?: boolean } = {},
  ) {
    if (!state.email) {
      const errorMessage = dictionary.rewardsPage.errors.missingEmail;

      if (useDialog) {
        setRedeemDialog((current) =>
          current
            ? {
                ...current,
                error: errorMessage,
                phase: "error",
              }
            : current,
        );
      } else {
        setActionError(errorMessage);
      }
      return;
    }

    setActionError(null);
    setActionNotice(null);
    setRedeemingRewardId(rewardId);
    if (useDialog) {
      setRedeemDialog((current) =>
        current
          ? {
              ...current,
              error: null,
              phase: "processing",
            }
          : current,
      );
    }

    try {
      const response = await fetch("/api/rewards/redemptions", {
        body: JSON.stringify({
          email: state.email,
          rewardId,
          walletAddress: accountAddress ?? "",
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
      if (useDialog) {
        setRedeemDialog((current) =>
          current
            ? {
                ...current,
                error: null,
                phase: "success",
              }
            : current,
        );
      } else {
        setActionNotice(dictionary.rewardsPage.notices.redeemSuccess);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : dictionary.rewardsPage.errors.redeemFailed;

      if (useDialog) {
        setRedeemDialog((current) =>
          current
            ? {
                ...current,
                error: errorMessage,
                phase: "error",
              }
            : current,
        );
      } else {
        setActionError(errorMessage);
      }
    } finally {
      setRedeemingRewardId(null);
    }
  }

  function handleConfirmRedeemDialog() {
    if (!redeemDialog || redeemDialog.phase === "processing") {
      return;
    }

    void redeemReward(redeemDialog.reward.rewardId, { useDialog: true });
  }

  function handleCloseRedeemDialog() {
    if (redeemDialog?.phase === "processing") {
      return;
    }

    setRedeemDialog(null);
  }

  return (
    <div className="friend-service-surface relative isolate overflow-hidden bg-[#f7f4ee]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0))]" />
      <RewardRedeemDialog
        dictionary={dictionary}
        dialog={redeemDialog}
        locale={locale}
        memberEmail={state.email ?? activeMember?.email ?? null}
        onClose={handleCloseRedeemDialog}
        onConfirm={handleConfirmRedeemDialog}
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

      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-3 py-3 sm:gap-5 sm:px-6 sm:py-6 lg:px-8">
        <header className="relative flex flex-col gap-3 overflow-hidden rounded-[22px] border border-zinc-200 bg-white px-4 py-3 shadow-[0_18px_55px_rgba(24,24,27,0.07)] sm:flex-row sm:items-center sm:justify-between sm:rounded-[26px] sm:px-5 sm:py-4">
          <div className="flex items-start gap-3">
            <Link
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:size-12"
              href={activateHref}
            >
              <ArrowLeft className="size-4 sm:size-5" />
            </Link>
            <div className="space-y-1">
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-zinc-500 sm:text-[0.68rem] sm:tracking-[0.22em]">
                {SERVICE_BRAND_NAME}
              </p>
              <div>
                <h1 className="text-base font-semibold tracking-tight text-slate-950 sm:text-lg">
                  {dictionary.rewardsPage.title}
                </h1>
                <p className="hidden text-sm text-slate-600 sm:block">
                  {locale === "ko"
                    ? "내 추천 활동으로 쌓인 포인트와 사용 가능한 보상을 확인합니다."
                    : dictionary.rewardsPage.description}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
            <StatusChip labels={dictionary.common.status} status={status} />
            {!hasThirdwebClientId ? (
              <div className="rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                {dictionary.common.clientIdRequired}
              </div>
            ) : null}
          </div>
        </header>

        {!hasThirdwebClientId ? (
          <MessageCard>{dictionary.env.description}</MessageCard>
        ) : isConnectionResolving ? (
          <MessageCard>{dictionary.rewardsPage.loading}</MessageCard>
        ) : isDisconnected ? (
          <section className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-[0_22px_70px_rgba(24,24,27,0.08)] sm:rounded-[28px] sm:p-6">
            <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <WalletMinimal className="size-5" />
            </div>
            <div className="mt-4 max-w-xl space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                {dictionary.rewardsPage.title}
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
        ) : state.status === "error" && !canBrowseRewards ? (
          <MessageCard tone="error">
            {state.error ?? dictionary.rewardsPage.errors.loadFailed}
          </MessageCard>
        ) : (
          <>
            <section className="grid gap-3 sm:gap-5 lg:grid-cols-[1.08fr_0.92fr]">
              <section className="relative overflow-hidden rounded-[26px] border border-zinc-900 bg-zinc-950 p-4 text-white shadow-[0_28px_80px_rgba(24,24,27,0.24)] sm:rounded-[30px] sm:p-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)]" />
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-2">
                    <InfoBadge className="border-white/14 bg-white/10 text-white/85">
                      {pointContextCopy.currentTierLabel} ·{" "}
                      {getTierLabel(state.summary.tier, dictionary)}
                    </InfoBadge>
                    {state.summary.nextTier ? (
                      <InfoBadge className="border-emerald-300/20 bg-emerald-300/12 text-emerald-100">
                        {pointContextCopy.nextTierLabel} ·{" "}
                        {nextTierStatusLabel}
                      </InfoBadge>
                    ) : (
                      <InfoBadge className="border-amber-300/24 bg-amber-300/14 text-amber-100">
                        {dictionary.rewardsPage.labels.maxTier}
                      </InfoBadge>
                    )}
                  </div>

                  <div className="mt-5 space-y-1.5 sm:mt-8 sm:space-y-2">
                    <p className="text-[0.68rem] uppercase tracking-[0.2em] text-white/55 sm:text-sm sm:tracking-[0.26em]">
                      {dictionary.rewardsPage.labels.spendablePoints}
                    </p>
                    <AnimatedNumberText
                      className="text-3xl font-semibold tracking-tight sm:text-5xl"
                      locale={locale}
                      value={formatPoints(state.summary.spendablePoints, locale)}
                    />
                    <p className="max-w-md break-keep text-xs leading-5 text-white/62 sm:text-sm sm:leading-6">
                      {pointContextCopy.spendableHeroCaption}
                    </p>
                  </div>

                  <p className="mt-4 hidden max-w-2xl text-sm leading-6 text-white/72 sm:block">
                    {dictionary.rewardsPage.previewNote}
                  </p>

                  <div className="mt-4 rounded-[20px] border border-white/12 bg-white/[0.07] px-3 py-3 sm:mt-5 sm:px-4">
                    <p className="text-sm font-semibold text-white">
                      {pointContextCopy.definitionTitle}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-white/62 sm:text-sm sm:leading-6">
                      {pointContextCopy.definitionBody}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-2 sm:mt-6 sm:grid-cols-3">
                    <PointContextCard
                      hint={pointContextCopy.spendableHint}
                      label={pointContextCopy.spendableLabel}
                      tone="primary"
                      value={formatPoints(state.summary.spendablePoints, locale)}
                    />
                    <PointContextCard
                      hint={pointContextCopy.lifetimeHint}
                      label={pointContextCopy.lifetimeLabel}
                      tone="neutral"
                      value={formatPoints(state.summary.lifetimePoints, locale)}
                    />
                    <PointContextCard
                      hint={
                        nextTierName
                          ? pointContextCopy.nextTierHint
                          : pointContextCopy.maxTierHint
                      }
                      label={
                        nextTierName
                          ? pointContextCopy.nextTierLabel
                          : pointContextCopy.currentTierLabel
                      }
                      tone="progress"
                      value={nextTierStatusLabel}
                    />
                  </div>

                  <RewardActionRail
                    copy={rewardsActionCopy}
                    primaryAction={rewardPrimaryAction}
                  />

                  <p className="mt-4 text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-white/55 sm:text-xs">
                    {pointContextCopy.sourceBreakdownLabel}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:gap-3">
                    <MiniStat
                      label={dictionary.rewardsPage.labels.referralRewardPoints}
                      value={formatPoints(
                        state.summary.sourceTotals.referralRewardPoints,
                        locale,
                      )}
                    />
                    <MiniStat
                      label={dictionary.rewardsPage.labels.contentActivityPoints}
                      value={formatPoints(
                        state.summary.sourceTotals.contentActivityPoints,
                        locale,
                      )}
                    />
                  </div>

                  <div className="mt-5 rounded-[20px] border border-white/12 bg-white/10 px-3 py-3 sm:mt-6 sm:rounded-[24px] sm:px-4 sm:py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/60">
                        {dictionary.rewardsPage.labels.progress}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
                        {state.summary.progressPercent}%
                      </p>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/12 sm:h-3">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#f8fafc_0%,#fcd34d_45%,#34d399_100%)]"
                        style={{ width: `${state.summary.progressPercent}%` }}
                      />
                    </div>
                    <p className="mt-2 break-keep text-xs leading-5 text-white/55">
                      {pointContextCopy.progressCaption}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-[0_22px_70px_rgba(24,24,27,0.08)] sm:rounded-[30px] sm:p-6">
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

                <div className="mt-4 grid gap-2 sm:mt-5 sm:grid-cols-2 sm:gap-3">
                  <MetricCard
                    className="sm:col-span-2"
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
                </div>

                {activeMember?.status !== "completed" ? (
                  <div className="mt-4 space-y-4">
                    <MessageCard>{dictionary.rewardsPage.paymentRequired}</MessageCard>
                    <Link
                      className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium !text-white transition hover:bg-slate-800 sm:w-auto"
                      href={activateHref}
                    >
                      {dictionary.rewardsPage.actions.completeSignup}
                    </Link>
                  </div>
                ) : null}

                {state.error ? (
                  <div className="mt-4">
                    <MessageCard tone="error">{state.error}</MessageCard>
                  </div>
                ) : null}
              </section>
            </section>

            <section className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-[0_22px_70px_rgba(24,24,27,0.08)] sm:rounded-[30px] sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                  <p className="eyebrow">{dictionary.rewardsPage.eyebrow}</p>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
                    {dictionary.rewardsPage.labels.rewardCatalog}
                  </h2>
                  <p className="hidden text-sm leading-6 text-slate-600 sm:block">
                    {dictionary.rewardsPage.catalog.previewNote}
                  </p>
                </div>
              </div>

              <div className="mt-4 sm:mt-5">
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
                  <div className="grid gap-3 sm:gap-4 sm:[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
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
                        silverClaimHref={silverClaimHref}
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

            <section className="grid min-w-0 gap-3 sm:gap-5 lg:grid-cols-[1.02fr_0.98fr]">
              <section className="min-w-0 rounded-[24px] border border-zinc-200 bg-white p-4 shadow-[0_22px_70px_rgba(24,24,27,0.08)] sm:rounded-[30px] sm:p-6">
                <div className="space-y-1">
                  <p className="eyebrow">{dictionary.rewardsPage.eyebrow}</p>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                    {dictionary.rewardsPage.labels.earnHistory}
                  </h2>
                </div>

                <div className="mt-5 min-w-0">
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

              <section className="min-w-0 rounded-[24px] border border-zinc-200 bg-white p-4 shadow-[0_22px_70px_rgba(24,24,27,0.08)] sm:rounded-[30px] sm:p-6">
                <div className="space-y-1">
                  <p className="eyebrow">{dictionary.rewardsPage.eyebrow}</p>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                    {dictionary.rewardsPage.labels.redemptionHistory}
                  </h2>
                </div>

                <div className="mt-5 min-w-0">
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

function PointContextCard({
  hint,
  label,
  tone = "neutral",
  value,
}: {
  hint: string;
  label: string;
  tone?: "neutral" | "primary" | "progress";
  value: string;
}) {
  const toneClassName =
    tone === "primary"
      ? "border-emerald-300/24 bg-emerald-300/12"
      : tone === "progress"
        ? "border-amber-300/24 bg-amber-300/12"
        : "border-white/12 bg-white/10";
  const valueClassName =
    tone === "primary"
      ? "text-emerald-50"
      : tone === "progress"
        ? "text-amber-50"
        : "text-white";

  return (
    <div
      className={cn(
        "min-w-0 rounded-[18px] border px-3 py-3 sm:rounded-[22px] sm:px-4",
        toneClassName,
      )}
    >
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/50">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 truncate text-sm font-semibold sm:text-base",
          valueClassName,
        )}
        title={value}
      >
        {value}
      </p>
      <p className="mt-1 text-[0.68rem] leading-4 text-white/55">{hint}</p>
    </div>
  );
}

function MetricCard({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[18px] border border-slate-200 bg-white/90 px-3 py-3 shadow-[0_16px_36px_rgba(15,23,42,0.04)] sm:rounded-[24px] sm:px-4 sm:py-4",
        className,
      )}
    >
      <p className="text-[0.64rem] uppercase tracking-[0.16em] text-slate-500 sm:text-xs sm:tracking-[0.22em]">
        {label}
      </p>
      <p className="mt-1.5 break-all text-sm font-semibold text-slate-950 sm:mt-2">
        {value}
      </p>
    </div>
  );
}

function RewardRedeemDialog({
  dictionary,
  dialog,
  locale,
  memberEmail,
  onClose,
  onConfirm,
}: {
  dictionary: Dictionary;
  dialog: RewardRedeemDialogState | null;
  locale: Locale;
  memberEmail: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!dialog) {
    return null;
  }

  const copy = dictionary.rewardsPage.redeemDialog;
  const isProcessing = dialog.phase === "processing";
  const isSuccess = dialog.phase === "success";
  const isError = dialog.phase === "error";
  const rewardTitle = getRewardTitle(dialog.reward.rewardId, dictionary);
  const afterPoints = Math.max(
    0,
    dialog.spendablePointsBefore - dialog.reward.costPoints,
  );
  const activeStepIndex = isSuccess ? 2 : isProcessing ? 1 : 0;
  const steps = [
    copy.steps.confirm,
    copy.steps.processing,
    copy.steps.completed,
  ];

  return (
    <div
      aria-labelledby="reward-redeem-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-slate-950/55 px-3 pb-3 pt-10 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
    >
      <section className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/30 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.34)]">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {dictionary.rewardsPage.eyebrow}
              </p>
              <h2
                className="break-keep text-2xl font-semibold tracking-tight text-slate-950"
                id="reward-redeem-dialog-title"
              >
                {isProcessing
                  ? copy.processingTitle
                  : isSuccess
                    ? copy.successTitle
                    : isError
                      ? copy.errorTitle
                      : copy.title}
              </h2>
              <p className="break-keep text-sm leading-6 text-slate-600">
                {isSuccess ? copy.successDescription : copy.description}
              </p>
            </div>
            <button
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isProcessing}
              onClick={onClose}
              type="button"
            >
              <span className="text-xl leading-none">×</span>
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {steps.map((step, index) => (
              <div
                className={cn(
                  "rounded-2xl border px-3 py-2 text-center text-xs font-semibold",
                  index <= activeStepIndex
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-500",
                )}
                key={step}
              >
                {step}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 px-5 py-5 sm:px-6">
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-2 gap-3">
              <DialogMetric
                label={copy.accountLabel}
                value={memberEmail ?? "-"}
              />
              <DialogMetric label={copy.rewardLabel} value={rewardTitle} />
              <DialogMetric
                label={copy.balanceLabel}
                value={formatPoints(dialog.spendablePointsBefore, locale)}
              />
              <DialogMetric
                label={copy.costLabel}
                value={formatPoints(dialog.reward.costPoints, locale)}
              />
            </div>
            <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3">
              <p className="text-xs font-medium text-emerald-800">
                {copy.afterBalanceLabel}
              </p>
              <p className="mt-1 text-lg font-semibold text-emerald-950">
                {formatPoints(afterPoints, locale)}
              </p>
            </div>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">
                    {copy.expectedBnbLabel}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">
                    {dialog.silverQuote
                      ? `${dialog.silverQuote.bnbAmount} BNB`
                      : copy.expectedBnbUnavailable}
                  </p>
                </div>
                {dialog.silverQuote ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {formatUsd(dialog.silverQuote.usdAmount, locale)}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 break-keep text-xs leading-5 text-slate-500">
                {copy.expectedBnbHint}
              </p>
            </div>
          </div>

          {isProcessing ? (
            <div className="flex items-center gap-3 rounded-[22px] border border-blue-200 bg-blue-50 px-4 py-3 text-blue-950">
              <RefreshCcw className="size-5 animate-spin" />
              <p className="text-sm font-medium">{copy.processingTitle}</p>
            </div>
          ) : null}

          {isSuccess ? (
            <div className="flex items-start gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
              <p className="text-sm font-medium leading-6">{copy.successDescription}</p>
            </div>
          ) : null}

          {isError ? (
            <MessageCard tone="error">
              {dialog.error ?? dictionary.rewardsPage.errors.redeemFailed}
            </MessageCard>
          ) : null}
        </div>

        <div className="grid gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:grid-cols-2 sm:px-6">
          {isSuccess ? (
            <button
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 sm:col-span-2"
              onClick={onClose}
              type="button"
            >
              {copy.actions.close}
            </button>
          ) : (
            <>
              <button
                className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isProcessing}
                onClick={onClose}
                type="button"
              >
                {copy.actions.cancel}
              </button>
              <button
                className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isProcessing}
                onClick={onConfirm}
                type="button"
              >
                {isError ? copy.actions.retry : copy.actions.confirm}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function DialogMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white bg-white px-3 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1.5 truncate text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function RewardActionRail({
  copy,
  primaryAction,
}: {
  copy: ReturnType<typeof getRewardsActionCopy>;
  primaryAction: string;
}) {
  return (
    <div className="mt-4 rounded-[22px] border border-white/12 bg-white/[0.08] p-3 sm:mt-5 sm:rounded-[24px] sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-white/55 sm:text-xs sm:tracking-[0.24em]">
            {copy.nextActionLabel}
          </p>
          <p className="mt-1 break-keep text-sm font-semibold leading-5 text-white sm:text-base">
            {primaryAction}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/82">
          <Sparkles className="size-3.5" />
          {copy.recordLabel}
        </span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {copy.steps.map((step, index) => (
          <div
            className="min-w-0 rounded-2xl border border-white/10 bg-black/16 px-3 py-2.5"
            key={step}
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-[0.62rem] font-semibold text-slate-950">
                {index + 1}
              </span>
              <span className="min-w-0 truncate text-xs font-medium text-white/78">
                {step}
              </span>
            </div>
          </div>
        ))}
      </div>
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
  silverClaimHref,
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
  silverClaimHref: string;
  silverClaim: SilverRewardClaimRecord | null;
  spendablePoints: number;
}) {
  const theme = getRewardCardTheme(reward.rewardId, dictionary);
  const rewardTypeLabel = getRewardTypeLabel(reward.rewardType, dictionary);
  const rewardTitle = getRewardTitle(reward.rewardId, dictionary);
  const rewardDescription = getRewardDescription(reward.rewardId, dictionary);
  const isRepeatableReward = isRepeatableRewardCatalogId(reward.rewardId);
  const isEligible = spendablePoints >= reward.costPoints;
  const hasRedemption = Boolean(redemption);
  const isCompletedReward = redemption?.status === "completed";
  const presentsAsCompleted = isCompletedReward && !isRepeatableReward;
  const isProcessingReward =
    redemption?.status === "pending" || redemption?.status === "queued";
  const isSilverReward =
    reward.rewardId === "silver-card" && redemption?.status === "completed";
  const isCompletedSilverClaim =
    isSilverReward && silverClaim?.status === "completed";
  const isLocked = !hasRedemption && !isEligible;
  const repeatableRewardStatusLabel =
    isRepeatableReward && hasRedemption
      ? isEligible
        ? dictionary.rewardsPage.catalog.eligible
        : formatTemplate(dictionary.rewardsPage.catalog.needMorePoints, {
            points: formatNumber(reward.costPoints - spendablePoints, locale),
          })
      : null;
  const StateIcon = repeatableRewardStatusLabel
    ? isEligible
      ? Sparkles
      : LockKeyhole
    : isCompletedReward
      ? CheckCircle2
      : hasRedemption
        ? RefreshCcw
        : isEligible
          ? Sparkles
          : LockKeyhole;
  const statusLabel = repeatableRewardStatusLabel ?? (isSilverReward
    ? silverClaim
      ? getSilverClaimStatusLabel(silverClaim.status, dictionary)
      : dictionary.rewardsPage.silverClaim.statuses.available
    : redemption
      ? getRedemptionStatusLabel(redemption.status, dictionary)
      : isEligible
        ? dictionary.rewardsPage.catalog.eligible
        : formatTemplate(dictionary.rewardsPage.catalog.needMorePoints, {
            points: formatNumber(reward.costPoints - spendablePoints, locale),
          }));
  const repeatableRewardCanRedeem =
    isRepeatableReward &&
    canRedeem &&
    isEligible &&
    !isRedeeming &&
    !isProcessingReward;
  const shouldOpenSilverClaim =
    isSilverReward &&
    !repeatableRewardCanRedeem &&
    silverClaim?.status !== "completed" &&
    silverClaim?.status !== "pending";
  let actionLabel = isRedeeming
    ? dictionary.rewardsPage.actions.redeeming
    : dictionary.rewardsPage.actions.redeem;

  if (shouldOpenSilverClaim) {
    actionLabel = dictionary.rewardsPage.silverClaim.actions.open;
  } else if (isRepeatableReward) {
    actionLabel = isRedeeming
      ? dictionary.rewardsPage.actions.redeeming
      : dictionary.rewardsPage.actions.redeem;
  } else if (isSilverReward) {
    actionLabel =
      silverClaim?.status === "completed"
        ? dictionary.rewardsPage.silverClaim.statuses.completed
        : silverClaim?.status === "pending"
          ? dictionary.rewardsPage.silverClaim.statuses.pending
          : dictionary.rewardsPage.silverClaim.actions.open;
  } else if (redemption) {
    actionLabel = getRedemptionStatusLabel(redemption.status, dictionary);
  }

  let isActionDisabled =
    !canRedeem || !isEligible || Boolean(redemption) || isRedeeming;

  if (shouldOpenSilverClaim) {
    isActionDisabled = false;
  } else if (isRepeatableReward) {
    isActionDisabled = !canRedeem || !isEligible || isRedeeming || isProcessingReward;
  } else if (isSilverReward) {
    isActionDisabled =
      silverClaim?.status === "completed" || silverClaim?.status === "pending";
  }
  const Icon =
    reward.rewardType === "tier_upgrade"
      ? Crown
      : reward.rewardType === "nft_claim"
        ? Ticket
        : Gift;
  const surfaceClassName = presentsAsCompleted
    ? theme.completedSurfaceClassName
    : theme.pendingSurfaceClassName;
  const iconClassName = presentsAsCompleted
    ? theme.completedIconClassName
    : theme.pendingIconClassName;
  const toneLabelClassName = presentsAsCompleted
    ? theme.completedToneLabelClassName
    : theme.pendingToneLabelClassName;
  const statusClassName = presentsAsCompleted
    ? theme.completedStatusClassName
    : hasRedemption
      ? "border-blue-200 bg-blue-50 text-blue-900"
      : isEligible
        ? theme.readyStatusClassName
        : "border-slate-200 bg-slate-50 text-slate-700";
  const panelClassName = presentsAsCompleted
    ? "border-white/12 bg-white/10 text-white/88"
    : "border-slate-200 bg-white/90 text-slate-700";
  const titleClassName = presentsAsCompleted ? "text-white" : "text-slate-950";
  const descriptionClassName = presentsAsCompleted
    ? "text-white/72"
    : "text-slate-600";
  const metaLabelClassName = presentsAsCompleted
    ? "text-white/55"
    : "text-slate-500";
  const costValueClassName = presentsAsCompleted ? "text-white" : "text-slate-950";
  const actionClassName = presentsAsCompleted
    ? isActionDisabled
      ? "border border-white/14 bg-white/10 !text-white/75"
      : "bg-white !text-slate-950 hover:bg-slate-100"
    : isEligible && canRedeem
      ? theme.readyActionClassName
      : "border border-slate-200 bg-white !text-slate-500";
  const silverClaimTransactionUrl =
    isCompletedSilverClaim && silverClaim.txHash
      ? `${BSC_EXPLORER}/tx/${silverClaim.txHash}`
      : null;
  const highlightCopy = isRepeatableReward && hasRedemption
    ? isEligible
      ? dictionary.rewardsPage.catalog.eligible
      : formatTemplate(dictionary.rewardsPage.catalog.needMorePoints, {
          points: formatNumber(reward.costPoints - spendablePoints, locale),
        })
    : isCompletedReward
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
        "group relative overflow-hidden rounded-[24px] p-[1px] transition duration-300 sm:rounded-[30px]",
        presentsAsCompleted
          ? theme.completedFrameClassName
          : theme.pendingFrameClassName,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-4 top-0 h-16 rounded-b-[24px] blur-2xl sm:inset-x-6 sm:h-24 sm:rounded-b-[28px] sm:blur-3xl",
          theme.glowClassName,
        )}
      />
      <div
        className={cn(
          "relative flex h-full flex-col rounded-[23px] p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:rounded-[29px] sm:p-6",
          surfaceClassName,
        )}
      >
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-[18px] shadow-[0_14px_28px_rgba(15,23,42,0.12)] sm:size-12 sm:rounded-2xl",
                iconClassName,
              )}
            >
              <Icon className="size-4 sm:size-5" />
            </div>
            <div className="min-w-0">
              <p
                className={cn(
                  "break-keep text-[0.66rem] font-medium leading-4 tracking-[0.12em] sm:text-[0.72rem] sm:leading-5 sm:tracking-[0.14em]",
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
                "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] sm:px-3 sm:text-[0.68rem] sm:tracking-[0.2em]",
                toneLabelClassName,
              )}
            >
              {theme.accentLabel}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] sm:px-3 sm:text-[0.68rem] sm:tracking-[0.2em]",
                presentsAsCompleted
                  ? "border-white/14 bg-white/10 text-white/82"
                  : "border-slate-200 bg-white/80 text-slate-700",
              )}
            >
              {dictionary.rewardsPage.catalog.previewBadge}
            </span>
            {presentsAsCompleted ? (
              <span className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/14 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-emerald-100 sm:px-3 sm:text-[0.68rem] sm:tracking-[0.2em]">
                {dictionary.rewardsPage.redemptionStatus.completed}
              </span>
            ) : null}
            <span
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[0.66rem] font-semibold tracking-[0.1em] sm:ml-auto sm:px-3 sm:text-[0.7rem] sm:tracking-[0.14em]",
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
              "break-keep text-lg font-semibold leading-[1.2] tracking-tight sm:mt-1 sm:text-xl",
              titleClassName,
            )}
          >
            {rewardTitle}
          </h3>
          <p
            className={cn(
              "mt-1.5 break-keep text-xs leading-5 sm:mt-3 sm:text-sm sm:leading-6",
              descriptionClassName,
            )}
          >
            {rewardDescription}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-1 sm:gap-3">
          <div
            className={cn(
              "rounded-[18px] border px-3 py-2.5 sm:rounded-[22px] sm:px-4 sm:py-3",
              panelClassName,
            )}
          >
            <p
              className={cn(
                "text-[0.62rem] uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.22em]",
                metaLabelClassName,
              )}
            >
              {dictionary.rewardsPage.labels.rewardCost}
            </p>
            <p className={cn("mt-1.5 text-sm font-semibold sm:mt-2", costValueClassName)}>
              {formatPoints(reward.costPoints, locale)}
            </p>
          </div>
          <div
            className={cn(
              "rounded-[18px] border px-3 py-2.5 sm:rounded-[22px] sm:px-4 sm:py-3",
              panelClassName,
            )}
          >
            <p
              className={cn(
                "text-[0.62rem] uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.22em]",
                metaLabelClassName,
              )}
            >
              {dictionary.rewardsPage.labels.progress}
            </p>
            <p className={cn("mt-1.5 text-sm font-semibold sm:mt-2", costValueClassName)}>
              {highlightCopy}
            </p>
            {!presentsAsCompleted && !isEligible ? (
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
          {isCompletedSilverClaim ? (
            <div
              className={cn(
                "col-span-2 rounded-[18px] border px-3 py-2.5 sm:col-span-1 sm:rounded-[22px] sm:px-4 sm:py-3",
                panelClassName,
              )}
            >
              <p
                className={cn(
                  "text-[0.62rem] uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.22em]",
                  metaLabelClassName,
                )}
              >
                {dictionary.rewardsPage.silverClaim.labels.claimedBnb}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <p className={cn("text-sm font-semibold", costValueClassName)}>
                  {silverClaim.bnbAmount} BNB
                </p>
                {silverClaimTransactionUrl ? (
                  <Link
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      presentsAsCompleted
                        ? "border-white/14 bg-white/8 text-white/82 hover:bg-white/12 hover:text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950",
                    )}
                    href={silverClaimTransactionUrl}
                    rel="noreferrer"
                    target="_blank"
                    title={silverClaim.txHash ?? undefined}
                  >
                    <span>{dictionary.rewardsPage.silverClaim.actions.openTransaction}</span>
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        <div className="mt-auto pt-4 sm:pt-6">
          {shouldOpenSilverClaim ? (
            <Link
              className={cn(
                "inline-flex h-10 w-full items-center justify-center rounded-full px-4 text-sm font-medium transition sm:h-11",
                actionClassName,
              )}
              href={silverClaimHref}
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              className={cn(
                "inline-flex h-10 w-full items-center justify-center rounded-full px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 sm:h-11",
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
      <div className="space-y-2">
        {entries.map((entry) => {
          const isPositive = entry.delta >= 0;
          const historyContext = getLedgerHistoryContextCopy(locale);
          const typeLabel =
            entry.type === "earn"
              ? dictionary.rewardsPage.history.earn
              : dictionary.rewardsPage.history.adjustment;
          const sourceTypeText = sourceTypeLabel(entry.sourceType, dictionary, locale);
          const impactLabel = isPositive
            ? historyContext.spendableIncrease
            : historyContext.spendableDecrease;
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
          const sourceIdLabel = entry.sourceId
            ? compactLedgerSourceId(entry.sourceId)
            : null;

          return (
            <article
              className="min-w-0 rounded-[22px] border border-slate-200 bg-white/95 p-3 shadow-[0_14px_34px_rgba(15,23,42,0.05)] sm:p-4"
              key={entry.ledgerEntryId}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <InfoBadge>{typeLabel}</InfoBadge>
                    {entry.rewardLevel ? (
                      <InfoBadge>{`G${entry.rewardLevel}`}</InfoBadge>
                    ) : null}
                    <InfoBadge className="max-w-full truncate">
                      {sourceTypeText}
                    </InfoBadge>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {sourceLabel}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {impactLabel} · {formatDateTime(entry.createdAt, locale)}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold tabular-nums",
                    isPositive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-rose-200 bg-rose-50 text-rose-900",
                  )}
                >
                  {isPositive ? "+" : ""}
                  {formatPoints(entry.delta, locale)}
                </span>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                  {historyContext.reasonLabel}
                </p>
                <p className="mt-1 line-clamp-2 break-keep text-sm leading-6 text-slate-700">
                  {humanizeLedgerMemo(detailsLabel)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <InfoBadge>{sourceTypeText}</InfoBadge>
                  <InfoBadge>{impactLabel}</InfoBadge>
                </div>
                {sourceIdLabel ? (
                  <p className="mt-1 truncate font-mono text-[0.68rem] text-slate-400">
                    ID {sourceIdLabel}
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
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

function compactLedgerSourceId(value: string) {
  const normalized = value.trim();
  const lastSegment = normalized.split(":").filter(Boolean).at(-1) ?? normalized;

  if (lastSegment.length <= 18) {
    return lastSegment;
  }

  return `${lastSegment.slice(0, 8)}...${lastSegment.slice(-6)}`;
}

function humanizeLedgerMemo(value: string) {
  return value
    .replace(/^AIAVpark News source reveal vote$/i, "뉴스 출처 투표 보상")
    .replace(/^AIAVpark News source reveal unlock$/i, "뉴스 출처 열람 보상")
    .replace(/^AIAVpark News fan source reveal unlock$/i, "뉴스 출처 열람 참여 보상")
    .replace(/^FanLetter News source reveal vote$/i, "뉴스 출처 투표 보상")
    .replace(/^FanLetter News source reveal unlock$/i, "뉴스 출처 열람 보상")
    .replace(/^FanLetter News fan source reveal unlock$/i, "뉴스 출처 열람 참여 보상");
}

function sourceTypeLabel(
  sourceType: PointLedgerRecord["sourceType"],
  dictionary: Dictionary,
  locale: Locale,
) {
  const copy = getLedgerSourceTypeCopy(locale);

  if (sourceType === "referral_reward") {
    return dictionary.rewardsPage.history.referralReward;
  }

  if (sourceType === "bonus") {
    return copy.contentActivity;
  }

  if (sourceType === "tier_upgrade") {
    return copy.tierUpgrade;
  }

  if (sourceType === "nft_redemption") {
    return copy.nftRedemption;
  }

  if (sourceType === "discount_redemption") {
    return copy.discountRedemption;
  }

  if (sourceType === "lookbook_generation") {
    return copy.lookbookGeneration;
  }

  if (sourceType === "admin") {
    return dictionary.rewardsPage.history.adminAdjustment;
  }

  return dictionary.rewardsPage.history.other;
}

function getLedgerHistoryContextCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      reasonLabel: "발생 이유",
      spendableDecrease: "사용 가능 포인트 차감",
      spendableIncrease: "사용 가능 포인트 증가",
    };
  }

  if (locale === "ja") {
    return {
      reasonLabel: "発生理由",
      spendableDecrease: "利用可能ポイント減少",
      spendableIncrease: "利用可能ポイント増加",
    };
  }

  if (locale === "zh") {
    return {
      reasonLabel: "发生原因",
      spendableDecrease: "可用积分减少",
      spendableIncrease: "可用积分增加",
    };
  }

  return {
    reasonLabel: "Why this changed",
    spendableDecrease: "Spendable points decreased",
    spendableIncrease: "Spendable points increased",
  };
}

function getLedgerSourceTypeCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      contentActivity: "콘텐츠 활동",
      discountRedemption: "서비스 크레딧 사용",
      lookbookGeneration: "룩북 생성",
      nftRedemption: "NFT 리워드 사용",
      tierUpgrade: "등급 리워드 사용",
    };
  }

  if (locale === "ja") {
    return {
      contentActivity: "コンテンツ活動",
      discountRedemption: "サービスクレジット使用",
      lookbookGeneration: "ルックブック生成",
      nftRedemption: "NFTリワード使用",
      tierUpgrade: "等級リワード使用",
    };
  }

  if (locale === "zh") {
    return {
      contentActivity: "内容活动",
      discountRedemption: "服务积分使用",
      lookbookGeneration: "Lookbook 生成",
      nftRedemption: "NFT 奖励使用",
      tierUpgrade: "等级奖励使用",
    };
  }

  return {
    contentActivity: "Content activity",
    discountRedemption: "Service credit use",
    lookbookGeneration: "Lookbook generation",
    nftRedemption: "NFT reward use",
    tierUpgrade: "Tier reward use",
  };
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

function getRewardPointContextCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      currentTierLabel: "현재 등급",
      definitionBody:
        "리워드 교환은 사용 가능 포인트에서 차감되고, 등급은 누적 적립 포인트로 계산합니다.",
      definitionTitle: "포인트는 두 가지로 구분합니다",
      lifetimeHint: "등급 계산에만 쓰는 전체 적립 기록",
      lifetimeLabel: "등급 기준 누적 포인트",
      maxTierHint: "현재 최고 등급입니다",
      nextTierHint: "다음 멤버 등급 기준",
      nextTierLabel: "다음 등급까지",
      nextTierNeeded: (tier: string, points: string) =>
        `${tier}까지 ${points}P 더 필요`,
      progressCaption:
        "등급 진행도는 교환 가능 잔액이 아니라 등급 기준 누적 포인트로 계산합니다.",
      sourceBreakdownLabel: "포인트 출처",
      spendableHeroCaption:
        "지금 리워드 교환에 쓸 수 있는 실제 잔액입니다. 등급 기준 누적 포인트와는 별도로 관리됩니다.",
      spendableHint: "리워드 교환에 바로 쓰는 잔액",
      spendableLabel: "리워드 교환 가능 포인트",
    };
  }

  if (locale === "ja") {
    return {
      currentTierLabel: "現在のランク",
      definitionBody:
        "リワード交換は交換可能ポイントから差し引かれ、ランクは累積獲得ポイントで計算されます。",
      definitionTitle: "ポイントは2種類に分けて表示します",
      lifetimeHint: "ランク計算だけに使う累積記録",
      lifetimeLabel: "ランク基準累積ポイント",
      maxTierHint: "現在の最高ランクです",
      nextTierHint: "次のメンバーランク基準",
      nextTierLabel: "次のランクまで",
      nextTierNeeded: (tier: string, points: string) =>
        `${tier}まであと${points}P必要`,
      progressCaption:
        "ランク進捗は交換可能残高ではなく、ランク基準累積ポイントで計算します。",
      sourceBreakdownLabel: "ポイントの内訳",
      spendableHeroCaption:
        "今すぐリワード交換に使える実際の残高です。ランク基準の累積ポイントとは別に管理されます。",
      spendableHint: "リワード交換に使える残高",
      spendableLabel: "リワード交換可能ポイント",
    };
  }

  if (locale === "zh") {
    return {
      currentTierLabel: "当前等级",
      definitionBody:
        "奖励兑换会从可用积分中扣减，会员等级按累计获得积分计算。",
      definitionTitle: "积分分为两类显示",
      lifetimeHint: "仅用于等级计算的累计记录",
      lifetimeLabel: "等级基准累计积分",
      maxTierHint: "当前已是最高等级",
      nextTierHint: "下一会员等级目标",
      nextTierLabel: "距离下一等级",
      nextTierNeeded: (tier: string, points: string) =>
        `距离 ${tier} 还需 ${points}P`,
      progressCaption: "等级进度按等级基准累计积分计算，不按可兑换余额计算。",
      sourceBreakdownLabel: "积分来源",
      spendableHeroCaption: "这是现在可用于兑换奖励的实际余额，与等级累计积分分开管理。",
      spendableHint: "可直接兑换奖励的余额",
      spendableLabel: "奖励可兑换积分",
    };
  }

  return {
    currentTierLabel: "Current tier",
    definitionBody:
      "Reward exchanges spend your redeemable points. Member tier is calculated from lifetime earned points.",
    definitionTitle: "Points are split into two meanings",
    lifetimeHint: "Lifetime earning record for tier only",
    lifetimeLabel: "Tier lifetime points",
    maxTierHint: "You are at the top tier",
    nextTierHint: "Target for the next member tier",
    nextTierLabel: "To next tier",
    nextTierNeeded: (tier: string, points: string) =>
      `${points}P more to ${tier}`,
    progressCaption:
      "Tier progress is calculated from lifetime tier points, not redeemable balance.",
    sourceBreakdownLabel: "Point sources",
    spendableHeroCaption:
      "This is the actual balance available for rewards. Tier lifetime points are tracked separately.",
    spendableHint: "Balance you can redeem now",
    spendableLabel: "Reward redeemable points",
  };
}

function getRewardsActionCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      completeSignup: "가입 상태를 먼저 완료하면 리워드를 사용할 수 있습니다",
      needMorePoints: (reward: string, points: string) =>
        `${reward}까지 ${points}P 더 모으면 됩니다`,
      nextActionLabel: "다음 행동",
      recordLabel: "교환 기록 생성",
      redeemReady: (reward: string) => `${reward} 교환 가능`,
      reviewHistory: "현재 포인트와 교환 기록을 확인하세요",
      steps: ["포인트 확인", "리워드 선택", "교환 기록"],
    };
  }

  if (locale === "ja") {
    return {
      completeSignup: "登録状態を完了するとリワードを利用できます",
      needMorePoints: (reward: string, points: string) =>
        `${reward}まであと${points}P`,
      nextActionLabel: "次のアクション",
      recordLabel: "交換記録を作成",
      redeemReady: (reward: string) => `${reward}を交換できます`,
      reviewHistory: "ポイントと交換履歴を確認してください",
      steps: ["ポイント確認", "リワード選択", "交換記録"],
    };
  }

  if (locale === "zh") {
    return {
      completeSignup: "完成注册状态后即可使用奖励",
      needMorePoints: (reward: string, points: string) =>
        `距离 ${reward} 还需 ${points}P`,
      nextActionLabel: "下一步",
      recordLabel: "生成兑换记录",
      redeemReady: (reward: string) => `可兑换 ${reward}`,
      reviewHistory: "请查看积分与兑换记录",
      steps: ["确认积分", "选择奖励", "兑换记录"],
    };
  }

  return {
    completeSignup: "Complete signup before using rewards",
    needMorePoints: (reward: string, points: string) =>
      `${points}P more to ${reward}`,
    nextActionLabel: "Next action",
    recordLabel: "Redemption record",
    redeemReady: (reward: string) => `${reward} is ready`,
    reviewHistory: "Review your points and redemption history",
    steps: ["Check points", "Choose reward", "Record redemption"],
  };
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

function formatUsd(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatTemplate(
  template: string,
  replacements: Record<string, string | number>,
) {
  return Object.entries(replacements).reduce((message, [key, value]) => {
    return message.replaceAll(`{${key}}`, String(value));
  }, template);
}
