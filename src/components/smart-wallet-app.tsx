"use client";

import Link from "next/link";
import {
  type CSSProperties,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  Check,
  Copy,
  Sparkles,
  Users,
  WalletMinimal,
} from "lucide-react";
import { getContract } from "thirdweb";
import { transfer } from "thirdweb/extensions/erc20";
import {
  AutoConnect,
  TransactionButton,
  useActiveAccount,
  useDisconnect,
  useActiveWallet,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
  useWalletBalance,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { EmailLoginDialog } from "@/components/email-login-dialog";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";
import { CopyTextButton } from "@/components/copy-text-button";
import { ReferralNetworkExplorer } from "@/components/referral-network-explorer";
import { ReferralRewardsPanel } from "@/components/referral-rewards-panel";
import {
  createEmptyReferralRewardsSummary,
  type IncomingReferralState,
  MEMBER_SIGNUP_USDT_AMOUNT,
  MEMBER_SIGNUP_USDT_AMOUNT_WEI,
  type MemberReferralsResponse,
  type MemberRecord,
  type ReferralRewardsSummaryRecord,
  type ReferralTreeNodeRecord,
  type SyncMemberResponse,
} from "@/lib/member";
import { cn } from "@/lib/utils";
import {
  BSC_EXPLORER,
  BSC_USDT_ADDRESS,
  getAppMetadata,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";
import { type Dictionary, type Locale } from "@/lib/i18n";

type NoticeTone = "info" | "success" | "error";

type WalletNotice = {
  tone: NoticeTone;
  text: string;
  href?: string;
};

type MemberSyncState = {
  email: string | null;
  error: string | null;
  justCompleted: boolean;
  member: MemberRecord | null;
  status: "idle" | "syncing" | "ready" | "error";
};

type ReferralDashboardState = {
  error: string | null;
  levelCounts: number[];
  referrals: ReferralTreeNodeRecord[];
  rewards: ReferralRewardsSummaryRecord;
  status: "idle" | "loading" | "ready" | "error";
  totalReferrals: number;
};

const CELEBRATION_DURATION_MS = 4200;
const usdtContract = getContract({
  address: BSC_USDT_ADDRESS,
  chain: smartWalletChain,
  client: thirdwebClient,
});

export function SmartWalletApp({
  dictionary,
  incomingReferralState,
  locale,
  projectWallet,
}: {
  dictionary: Dictionary;
  incomingReferralState: IncomingReferralState | null;
  locale: Locale;
  projectWallet: string | null;
}) {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const status = useActiveWalletConnectionStatus();
  const { data: balance } = useWalletBalance({
    client: thirdwebClient,
    chain: smartWalletChain,
    address: account?.address,
    tokenAddress: BSC_USDT_ADDRESS,
  });
  const [notice, setNotice] = useState<WalletNotice | null>(null);
  const [copied, setCopied] = useState(false);
  const [memberSync, setMemberSync] = useState<MemberSyncState>({
    email: null,
    error: null,
    justCompleted: false,
    member: null,
    status: "idle",
  });
  const [referralDashboard, setReferralDashboard] =
    useState<ReferralDashboardState>({
      error: null,
      levelCounts: [],
      referrals: [],
      rewards: createEmptyReferralRewardsSummary(),
      status: "idle",
      totalReferrals: 0,
    });
  const [showCelebration, setShowCelebration] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);
  const celebrationTimeoutRef = useRef<number | null>(null);
  const syncInFlightRef = useRef(false);

  const appMetadata = getAppMetadata(dictionary.meta.description);
  const adminSignerAddress = getAdminAccountAddress(wallet);
  const accountAddress = account?.address;
  const accountLabel = formatAddressLabel(accountAddress);
  const accountUrl = accountAddress
    ? `${BSC_EXPLORER}/address/${accountAddress}`
    : BSC_EXPLORER;
  const adminSignerLabel = formatAddressLabel(adminSignerAddress);
  const projectWalletUrl = projectWallet
    ? `${BSC_EXPLORER}/address/${projectWallet}`
    : BSC_EXPLORER;
  const incomingReferralCode = incomingReferralState?.code ?? null;
  const activeIncomingReferralCode =
    incomingReferralState?.status === "available"
      ? incomingReferralCode
      : null;
  const isSelfIncomingReferral =
    incomingReferralCode !== null &&
    memberSync.member?.referralCode === incomingReferralCode;
  const isSignupCompleted = memberSync.member?.status === "completed";
  const isIncomingReferralBlocked =
    incomingReferralState?.status === "full" &&
    memberSync.member?.referredByCode !== incomingReferralState.code &&
    !isSignupCompleted;
  const isMembershipLoading =
    status === "connected" &&
    hasThirdwebClientId &&
    memberSync.status !== "ready" &&
    memberSync.status !== "error";
  const referralLink = memberSync.member?.referralCode
    ? getReferralLink(memberSync.member.referralCode, locale)
    : null;
  const paymentTransactionUrl = memberSync.member?.paymentTransactionHash
    ? `${BSC_EXPLORER}/tx/${memberSync.member.paymentTransactionHash}`
    : null;
  const paymentCtaLabel = isSignupCompleted
    ? dictionary.sponsored.completedCta
    : dictionary.sponsored.cta.replace(
        "{amount}",
        MEMBER_SIGNUP_USDT_AMOUNT,
      );
  const insufficientBalanceMessage = formatTemplate(
    dictionary.member.errors.insufficientBalance,
    {
      amount: MEMBER_SIGNUP_USDT_AMOUNT,
    },
  );
  const isInsufficientUsdtBalance =
    !isSignupCompleted &&
    typeof balance?.value === "bigint" &&
    balance.value < BigInt(MEMBER_SIGNUP_USDT_AMOUNT_WEI);
  const isSignupBalanceLoading =
    status === "connected" &&
    !isSignupCompleted &&
    accountAddress !== undefined &&
    !balance;
  const mobilePrimaryHref = isSignupCompleted
    ? `/${locale}/referrals`
    : status === "connected" && hasThirdwebClientId
      ? "#signup-payment"
      : "#wallet-onboarding";
  const mobilePrimaryLabel = isSignupCompleted
    ? dictionary.member.actions.viewReferrals
    : status === "connected" && hasThirdwebClientId
      ? paymentCtaLabel
      : dictionary.common.connectWallet;
  const mobileDockEyebrow = isSignupCompleted
    ? dictionary.member.eyebrow
    : status === "connected" && hasThirdwebClientId
      ? dictionary.sponsored.eyebrow
      : dictionary.onboarding.eyebrow;
  const mobileDockTitle = isSignupCompleted
    ? dictionary.member.newMember
    : status === "connected" && hasThirdwebClientId
      ? `${MEMBER_SIGNUP_USDT_AMOUNT} USDT`
      : dictionary.runway.steps[0].title;
  const showMobileActionDock =
    hasThirdwebClientId && status === "connected" && !isSignupCompleted;

  function triggerCelebration() {
    if (celebrationTimeoutRef.current) {
      window.clearTimeout(celebrationTimeoutRef.current);
    }

    setShowCelebration(true);
    celebrationTimeoutRef.current = window.setTimeout(() => {
      setShowCelebration(false);
      celebrationTimeoutRef.current = null;
    }, CELEBRATION_DURATION_MS);
  }

  async function loadReferralDashboard(
    email: string,
    options?: { background?: boolean },
  ) {
    if (!options?.background) {
      setReferralDashboard((current) => ({
        ...current,
        error: null,
        status: "loading",
      }));
    }

    try {
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

      setReferralDashboard({
        error: null,
        levelCounts: data.levelCounts,
        referrals: data.referrals,
        rewards: data.rewards,
        status: "ready",
        totalReferrals: data.totalReferrals,
      });
    } catch (error) {
      setReferralDashboard((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : dictionary.referralsPage.errors.loadFailed,
        status: current.referrals.length > 0 ? "ready" : "error",
      }));
    }
  }

  async function runMemberSync(options?: { background?: boolean }) {
    if (!accountAddress || syncInFlightRef.current) {
      return;
    }

    syncInFlightRef.current = true;

    if (!options?.background) {
      setMemberSync((current) => ({
        ...current,
        error: null,
        status: "syncing",
      }));
    }

    try {
      const email = await getUserEmail({ client: thirdwebClient });

      if (!email) {
        setMemberSync({
          email: null,
          error: dictionary.member.errors.missingEmail,
          justCompleted: false,
          member: null,
          status: "error",
        });
        setReferralDashboard({
          error: null,
          levelCounts: [],
          referrals: [],
          rewards: createEmptyReferralRewardsSummary(),
          status: "idle",
          totalReferrals: 0,
        });
        return;
      }

      const response = await fetch("/api/members", {
        body: JSON.stringify({
          chainId: chain.id,
          chainName: chain.name ?? "BSC",
          email,
          locale,
          referredByCode: activeIncomingReferralCode,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const data = (await response.json()) as
        | SyncMemberResponse
        | { error?: string };

      if (!response.ok || !("member" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : dictionary.member.errors.syncFailed,
        );
      }

      let shouldCelebrate = data.justCompleted;

      setMemberSync((current) => {
        if (
          !shouldCelebrate &&
          current.member?.status === "pending_payment" &&
          data.member.status === "completed"
        ) {
          shouldCelebrate = true;
        }

        return {
          email: data.member.email,
          error: null,
          justCompleted: shouldCelebrate,
          member: data.member,
          status: "ready",
        };
      });

      if (shouldCelebrate) {
        triggerCelebration();
      }

      if (data.member.status === "completed") {
        void loadReferralDashboard(data.member.email, {
          background: options?.background,
        });
      } else {
        setReferralDashboard({
          error: null,
          levelCounts: [],
          referrals: [],
          rewards: createEmptyReferralRewardsSummary(),
          status: "idle",
          totalReferrals: 0,
        });
      }
    } catch (error) {
      setMemberSync((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : dictionary.member.errors.syncFailed,
        justCompleted: false,
        status: "error",
      }));
    } finally {
      syncInFlightRef.current = false;
    }
  }

  const syncMemberRegistration = useEffectEvent(async () => {
    await runMemberSync();
  });

  useEffect(() => {
    if (status !== "connected" || !accountAddress || !hasThirdwebClientId) {
      setMemberSync({
        email: null,
        error: null,
        justCompleted: false,
        member: null,
        status: "idle",
      });
      setReferralDashboard({
        error: null,
        levelCounts: [],
        referrals: [],
        rewards: createEmptyReferralRewardsSummary(),
        status: "idle",
        totalReferrals: 0,
      });
      return;
    }

    void syncMemberRegistration();
  }, [
    accountAddress,
    status,
    locale,
    chain.id,
    chain.name,
    activeIncomingReferralCode,
  ]);

  const pollForCompletedSignup = useEffectEvent(async () => {
    await runMemberSync({ background: true });
  });

  useEffect(() => {
    if (
      status !== "connected" ||
      !accountAddress ||
      !hasThirdwebClientId ||
      memberSync.member?.status === "completed" ||
      isInsufficientUsdtBalance
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      void pollForCompletedSignup();
    }, 7000);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    accountAddress,
    isInsufficientUsdtBalance,
    memberSync.member?.status,
    status,
  ]);

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
    return () => {
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }

      if (celebrationTimeoutRef.current) {
        window.clearTimeout(celebrationTimeoutRef.current);
      }
    };
  }, []);

  async function handleCopyAddress() {
    if (!accountAddress) {
      return;
    }

    try {
      await navigator.clipboard.writeText(accountAddress);
      setCopied(true);
      setNotice({
        tone: "info",
        text: dictionary.notices.copySuccess,
      });

      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }

      copiedTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
        copiedTimeoutRef.current = null;
      }, 1800);
    } catch {
      setNotice({
        tone: "error",
        text: dictionary.notices.copyError,
      });
    }
  }

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
      <CelebrationOverlay
        description={dictionary.member.celebrationDescription}
        open={showCelebration}
        title={dictionary.member.celebrationTitle}
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

      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-4 pb-28 sm:gap-5 sm:px-6 sm:py-6 sm:pb-32 lg:px-8 lg:pb-8">
        <header className="glass-card flex flex-col gap-4 rounded-[28px] px-4 py-4 sm:px-5 sm:py-4">
          <div className="flex items-start gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a,#2563eb)] text-white shadow-[0_16px_40px_rgba(37,99,235,0.28)]">
              <WalletMinimal className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="eyebrow">{dictionary.common.headerEyebrow}</p>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                  {dictionary.common.appName}
                </h1>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-wrap sm:items-center">
              <LanguageSwitcher
                label={dictionary.common.languageLabel}
                locale={locale}
              />
              <StatusChip
                labels={dictionary.common.status}
                status={status}
              />
            </div>
            {hasThirdwebClientId ? (
              status === "connected" ? (
                <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
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
                  ) : (
                    <div className="inline-flex h-11 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                      {dictionary.common.status.connected}
                    </div>
                  )}

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
              <div className="w-full rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-900 sm:w-auto">
                {dictionary.common.clientIdRequired}
              </div>
            )}
          </div>
        </header>

        {isSignupCompleted && memberSync.member ? (
          <CompletedHomeDashboard
            dictionary={dictionary}
            isSelfIncomingReferral={isSelfIncomingReferral}
            locale={locale}
            member={memberSync.member}
            onRefresh={() => {
              void runMemberSync();
            }}
            paymentTransactionUrl={paymentTransactionUrl}
            referralDashboard={referralDashboard}
            referralLink={referralLink}
          />
        ) : isMembershipLoading ? (
          <MembershipLoadingSection dictionary={dictionary} />
        ) : (
          <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="glass-card relative overflow-hidden rounded-[32px] p-5 sm:p-7">
              <div className="absolute inset-x-6 top-0 h-32 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.18),transparent_68%)] blur-3xl" />
              <div className="relative space-y-6">
                <div className="space-y-3">
                  <p className="eyebrow">
                    {!hasThirdwebClientId
                      ? dictionary.member.eyebrow
                      : status === "connected" && accountAddress
                        ? dictionary.sponsored.eyebrow
                        : dictionary.onboarding.eyebrow}
                  </p>
                  <h2 className="max-w-2xl text-[2.15rem] font-semibold leading-[0.98] tracking-tight text-slate-950 sm:text-5xl sm:leading-[1.05]">
                    {!hasThirdwebClientId
                      ? dictionary.env.title
                      : isIncomingReferralBlocked
                        ? dictionary.member.incomingReferralLimitTitle
                        : status === "connected" && accountAddress
                          ? dictionary.sponsored.title
                          : dictionary.common.connectWallet}
                  </h2>
                  <p className="max-w-2xl text-[0.98rem] leading-7 text-slate-600 sm:text-lg">
                    {!hasThirdwebClientId
                      ? dictionary.env.description
                      : isIncomingReferralBlocked && incomingReferralState
                        ? formatTemplate(
                              dictionary.member.incomingReferralLimitDescription,
                              {
                                code: incomingReferralState.code,
                                count: incomingReferralState.signupCount,
                                limit: incomingReferralState.limit,
                              },
                            )
                        : status === "connected" && accountAddress
                          ? dictionary.member.pending
                          : dictionary.member.disconnected}
                  </p>
                </div>

                {isIncomingReferralBlocked && incomingReferralState ? (
                  <MessageCard tone="error">
                    {formatTemplate(
                      dictionary.member.incomingReferralLimitDescription,
                      {
                        code: incomingReferralState.code,
                        count: incomingReferralState.signupCount,
                        limit: incomingReferralState.limit,
                      },
                    )}
                  </MessageCard>
                ) : activeIncomingReferralCode ? (
                  <div className="rounded-[28px] border border-emerald-200 bg-emerald-50/90 p-5 text-sm text-emerald-950">
                    <p className="font-semibold">
                      {dictionary.member.incomingReferralTitle}
                    </p>
                    <p className="mt-2 leading-6">
                      {dictionary.member.incomingReferralDescription.replace(
                        "{code}",
                        activeIncomingReferralCode,
                      )}
                    </p>
                  </div>
                ) : null}

                {!hasThirdwebClientId ? (
                  <MessageCard>{dictionary.env.description}</MessageCard>
                ) : status !== "connected" || !accountAddress ? (
                  <div className="space-y-4">
                    <div className="grid gap-3">
                      <InfoRow
                        label={dictionary.member.labels.requiredDeposit}
                        value={`${MEMBER_SIGNUP_USDT_AMOUNT} USDT`}
                      />
                    </div>

                    <div
                      className="rounded-[28px] border border-white/70 bg-white/92 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] scroll-mt-24 sm:scroll-mt-28"
                      id="wallet-onboarding"
                    >
                      <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                        <p className="text-sm leading-6 text-slate-600">
                          {dictionary.common.loginDialog.emailDescription}
                        </p>
                        <button
                          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
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
                ) : (
                  <div className="space-y-4">
                    {isInsufficientUsdtBalance ? (
                      <MessageCard tone="error">
                        {insufficientBalanceMessage}
                      </MessageCard>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoRow
                        label={dictionary.member.labels.signupStatus}
                        value={dictionary.member.pendingValue}
                      />
                      <InfoRow
                        label={dictionary.member.labels.lastWallet}
                        value={accountLabel ?? accountAddress}
                      />
                    </div>

                    <div
                      className="rounded-[28px] bg-slate-950 p-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] scroll-mt-24 sm:scroll-mt-28"
                      id="signup-payment"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <CompactMetaCard
                          label={dictionary.member.labels.requiredDeposit}
                          value={`${MEMBER_SIGNUP_USDT_AMOUNT} USDT`}
                        />
                        <div className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white/75">
                          {dictionary.member.pendingValue}
                        </div>
                      </div>

                      <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                              {dictionary.member.labels.lastWallet}
                            </p>
                            <p className="mt-2 break-words text-xl font-semibold tracking-tight text-white">
                              {accountLabel ?? accountAddress}
                            </p>
                          </div>
                          <button
                            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 self-start rounded-full border border-white/10 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/15"
                            onClick={handleCopyAddress}
                            type="button"
                          >
                            {copied ? (
                              <Check className="size-3.5" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                            {copied
                              ? dictionary.common.copied
                              : dictionary.common.copyAddress}
                          </button>
                        </div>

                        <p className="mt-4 text-sm leading-6 text-white/60">
                          {dictionary.member.pending}
                        </p>
                      </div>

                      <div className="mt-5">
                        <p className="mb-3 text-xs uppercase tracking-[0.24em] text-white/45">
                          {dictionary.sponsored.eyebrow}
                        </p>
                        <TransactionButton
                          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={
                            !accountAddress ||
                            !hasThirdwebClientId ||
                            isSignupBalanceLoading ||
                            isInsufficientUsdtBalance ||
                            !projectWallet ||
                            isIncomingReferralBlocked ||
                            isSignupCompleted
                          }
                          onError={(error) =>
                            setNotice({
                              tone: "error",
                              text: error.message,
                            })
                          }
                          onTransactionConfirmed={(receipt) => {
                            setNotice({
                              tone: "success",
                              text: dictionary.sponsored.txConfirmed,
                              href: `${BSC_EXPLORER}/tx/${receipt.transactionHash}`,
                            });

                            window.setTimeout(() => {
                              void runMemberSync({ background: true });
                            }, 2500);
                          }}
                          onTransactionSent={(result) => {
                            setNotice({
                              tone: "info",
                              text: dictionary.sponsored.txSent,
                              href: `${BSC_EXPLORER}/tx/${result.transactionHash}`,
                            });

                            window.setTimeout(() => {
                              void runMemberSync({ background: true });
                            }, 4000);
                          }}
                          transaction={() => {
                            if (!accountAddress) {
                              throw new Error(dictionary.sponsored.connectFirst);
                            }

                            if (!projectWallet) {
                              throw new Error(
                                dictionary.member.errors.projectWalletMissing,
                              );
                            }

                            if (isInsufficientUsdtBalance) {
                              throw new Error(insufficientBalanceMessage);
                            }

                            if (isIncomingReferralBlocked && incomingReferralState) {
                              throw new Error(
                                formatTemplate(
                                  dictionary.member.errors.referralLimitReached,
                                  {
                                    code: incomingReferralState.code,
                                    count: incomingReferralState.signupCount,
                                    limit: incomingReferralState.limit,
                                  },
                                ),
                              );
                            }

                            return transfer({
                              amount: MEMBER_SIGNUP_USDT_AMOUNT,
                              contract: usdtContract,
                              to: projectWallet,
                            });
                          }}
                          type="button"
                          unstyled
                        >
                          {paymentCtaLabel}
                        </TransactionButton>
                      </div>
                    </div>

                    <NoticeCard
                      notice={notice}
                      openExplorerLabel={dictionary.sponsored.openExplorer}
                      placeholder={dictionary.sponsored.emptyNotice}
                    />
                  </div>
                )}
              </div>
            </div>

            <Panel
              contentClassName="gap-4"
              eyebrow={dictionary.member.eyebrow}
              title={dictionary.member.title}
            >
              {memberSync.status === "idle" ? (
                <MessageCard>{dictionary.member.disconnected}</MessageCard>
              ) : null}

              {memberSync.status === "syncing" ? (
                <MessageCard>{dictionary.member.syncing}</MessageCard>
              ) : null}

              {memberSync.status === "error" ? (
                <MessageCard tone="error">
                  {memberSync.error ?? dictionary.member.errors.syncFailed}
                </MessageCard>
              ) : null}

              {status === "connected" && accountAddress ? (
                <div className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                  <div>
                    <div>
                      <p className="eyebrow">{dictionary.connected.eyebrow}</p>
                      <h3 className="text-xl font-semibold text-slate-950">
                        {accountLabel ?? accountAddress}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <InfoRow
                      label={dictionary.connected.labels.chain}
                      value={chain.name ?? "BSC"}
                    />
                    <InfoRow
                      label={dictionary.connected.labels.balance}
                      value={formatBalance(
                        balance?.displayValue,
                        balance?.symbol ?? "USDT",
                        locale,
                      )}
                    />
                    <InfoRow
                      label={dictionary.connected.labels.walletType}
                      value={
                        adminSignerAddress
                          ? dictionary.common.walletTypeAbstracted
                          : wallet?.id ?? dictionary.common.notAvailable
                      }
                    />
                    <InfoRow
                      label={dictionary.connected.labels.adminSigner}
                      value={adminSignerLabel ?? dictionary.common.notAvailable}
                    />
                  </div>
                </div>
              ) : null}

              {memberSync.member ? (
                <>
                  <div className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                    <p className="text-sm leading-6 text-slate-600">
                      {memberSync.member.status === "completed"
                        ? dictionary.member.synced
                        : dictionary.member.pending}
                    </p>
                    {memberSync.justCompleted ? (
                      <p className="mt-2 text-sm font-semibold text-emerald-700">
                        {dictionary.member.newMember}
                      </p>
                    ) : null}
                    {memberSync.member.referredByCode ? (
                      <p className="mt-2 text-sm font-medium text-slate-700">
                        {dictionary.member.appliedReferralDescription.replace(
                          "{code}",
                          memberSync.member.referredByCode,
                        )}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoRow
                      label={dictionary.member.labels.emailKey}
                      value={memberSync.member.email}
                    />
                    <InfoRow
                      label={dictionary.member.labels.signupStatus}
                      value={
                        memberSync.member.status === "completed"
                          ? dictionary.member.completedValue
                          : dictionary.member.pendingValue
                      }
                    />
                    <InfoRow
                      label={dictionary.member.labels.lastWallet}
                      value={
                        formatAddressLabel(memberSync.member.lastWalletAddress) ??
                        dictionary.common.notAvailable
                      }
                    />
                    <InfoRow
                      label={dictionary.member.labels.referredByCode}
                      value={
                        memberSync.member.referredByCode ??
                        dictionary.member.noReferralApplied
                      }
                    />
                  </div>

                  {paymentTransactionUrl ? (
                    <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                        {dictionary.member.labels.paymentTransaction}
                      </p>
                      <a
                        className="mt-3 flex max-w-full items-start gap-2 break-all text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-4"
                        href={paymentTransactionUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {memberSync.member.paymentTransactionHash}
                        <ArrowUpRight className="size-4" />
                      </a>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <button
                      className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={memberSync.status === "syncing"}
                      onClick={() => {
                        void runMemberSync();
                      }}
                      type="button"
                    >
                      {dictionary.member.actions.refreshStatus}
                    </button>

                    <a
                      className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                      href={projectWalletUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {dictionary.member.actions.openProjectWallet}
                    </a>
                  </div>
                </>
              ) : null}
            </Panel>
          </section>
        )}
      </main>

      {showMobileActionDock ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] lg:hidden">
          <div className="pointer-events-auto glass-card flex items-center gap-3 rounded-[26px] border border-white/75 px-3 py-3 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
            <div className="min-w-0 flex-1">
              <p className="text-[0.68rem] font-medium uppercase tracking-[0.2em] text-slate-500">
                {mobileDockEyebrow}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-950">
                {mobileDockTitle}
              </p>
            </div>

            <PrimaryActionLink
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-semibold !text-white transition hover:bg-slate-800"
              href={mobilePrimaryHref}
              label={mobilePrimaryLabel}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Panel({
  className,
  title,
  eyebrow,
  children,
  contentClassName,
  id,
}: {
  className?: string;
  title: string;
  eyebrow: string;
  children: ReactNode;
  contentClassName?: string;
  id?: string;
}) {
  return (
    <section
      className={cn(
        "glass-card rounded-[30px] p-5 sm:p-6",
        id && "scroll-mt-24 sm:scroll-mt-28",
        className,
      )}
      id={id}
    >
      <div className="mb-4 space-y-1">
        <p className="eyebrow">{eyebrow}</p>
        <h3 className="text-xl font-semibold tracking-tight text-slate-950">
          {title}
        </h3>
      </div>
      <div className={cn("flex flex-col", contentClassName)}>{children}</div>
    </section>
  );
}

function MembershipLoadingSection({
  dictionary,
}: {
  dictionary: Dictionary;
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="glass-card relative overflow-hidden rounded-[32px] p-5 sm:p-7">
        <div className="absolute inset-x-6 top-0 h-32 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.18),transparent_68%)] blur-3xl" />
        <div className="relative space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge icon={<WalletMinimal className="size-3.5" />}>
              {dictionary.member.title}
            </Badge>
            <Badge icon={<Sparkles className="size-3.5" />}>
              {dictionary.referralsPage.title}
            </Badge>
          </div>

          <div className="space-y-3">
            <p className="eyebrow">{dictionary.member.eyebrow}</p>
            <h2 className="max-w-2xl text-[2.15rem] font-semibold leading-[0.98] tracking-tight text-slate-950 sm:text-5xl sm:leading-[1.05]">
              {dictionary.common.appName}
            </h2>
            <p className="max-w-2xl text-[0.98rem] leading-7 text-slate-600 sm:text-lg">
              {dictionary.member.syncing}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
                key={index}
              >
                <div className="h-3 w-20 animate-pulse rounded-full bg-slate-200" />
                <div className="mt-4 h-8 w-28 animate-pulse rounded-full bg-slate-200" />
                <div className="mt-3 h-3 w-24 animate-pulse rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <Panel
        contentClassName="gap-4"
        eyebrow={dictionary.referralsPage.eyebrow}
        title={dictionary.referralsPage.title}
      >
        <MessageCard>{dictionary.referralsPage.loading}</MessageCard>
      </Panel>
    </section>
  );
}

function CompletedHomeDashboard({
  dictionary,
  isSelfIncomingReferral,
  locale,
  member,
  onRefresh,
  paymentTransactionUrl,
  referralDashboard,
  referralLink,
}: {
  dictionary: Dictionary;
  isSelfIncomingReferral: boolean;
  locale: Locale;
  member: MemberRecord;
  onRefresh: () => void;
  paymentTransactionUrl: string | null;
  referralDashboard: ReferralDashboardState;
  referralLink: string | null;
}) {
  const directReferralCount = referralDashboard.referrals.length;
  const totalReferralCount = referralDashboard.totalReferrals;

  return (
    <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="glass-card relative overflow-hidden rounded-[32px] p-5 sm:p-7">
        <div className="absolute inset-x-6 top-0 h-32 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.18),transparent_68%)] blur-3xl" />
        <div className="relative space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge icon={<Check className="size-3.5" />}>
              {dictionary.member.completedValue}
            </Badge>
            <Badge icon={<Users className="size-3.5" />}>
              {dictionary.referralsPage.title}
            </Badge>
          </div>

          <div className="space-y-3">
            <p className="eyebrow">{dictionary.referralsPage.eyebrow}</p>
            <h2 className="max-w-2xl text-[2.15rem] font-semibold leading-[0.98] tracking-tight text-slate-950 sm:text-5xl sm:leading-[1.05]">
              {dictionary.referralsPage.title}
            </h2>
            <p className="max-w-2xl text-[0.98rem] leading-7 text-slate-600 sm:text-lg">
              {dictionary.member.synced}
            </p>
          </div>

          {isSelfIncomingReferral ? (
            <MessageCard>{dictionary.member.selfReferralNotice}</MessageCard>
          ) : null}

          {member.referredByCode ? (
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/90 p-4 text-sm leading-6 text-emerald-950">
              {dictionary.member.appliedReferralDescription.replace(
                "{code}",
                member.referredByCode,
              )}
            </div>
          ) : null}

          <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
            <MetricCard
              hint={dictionary.referralsPage.labels.referralCode}
              label={dictionary.member.completedValue}
              value={member.referralCode ?? dictionary.common.notAvailable}
            />
            <MetricCard
              hint={dictionary.referralsPage.listTitle}
              label={dictionary.referralsPage.labels.directReferrals}
              value={String(directReferralCount)}
            />
            <MetricCard
              hint={dictionary.referralsPage.depthHint.replace(
                "{depth}",
                "6",
              )}
              label={dictionary.referralsPage.labels.totalNetwork}
              value={String(totalReferralCount)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <p className="eyebrow">{dictionary.referralsPage.shareTitle}</p>
              <p className="mt-3 text-3xl font-semibold tracking-[0.08em] text-slate-950">
                {member.referralCode ?? dictionary.common.notAvailable}
              </p>

              {referralLink ? (
                <>
                  <a
                    className="mt-4 block break-all text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-4"
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
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {dictionary.member.shareHint}
                  </p>
                </>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 rounded-[28px] bg-slate-950 p-5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
              <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                {dictionary.member.eyebrow}
              </p>
              <p className="text-xl font-semibold tracking-tight">
                {dictionary.member.newMember}
              </p>
              <p className="text-sm leading-6 text-white/70">
                {dictionary.referralsPage.description}
              </p>

              <div className="mt-auto flex flex-wrap gap-3">
                <button
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                  onClick={onRefresh}
                  type="button"
                >
                  {dictionary.member.actions.refreshStatus}
                </button>

                {paymentTransactionUrl ? (
                  <a
                    className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15"
                    href={paymentTransactionUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {dictionary.sponsored.openExplorer}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Panel
        contentClassName="gap-4"
        eyebrow={dictionary.member.eyebrow}
        title={dictionary.member.title}
      >
        <div className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <p className="text-sm leading-6 text-slate-600">
            {dictionary.referralsPage.memberReady}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <InfoRow
            label={dictionary.member.labels.emailKey}
            value={member.email}
          />
          <InfoRow
            label={dictionary.member.labels.signupStatus}
            value={dictionary.member.completedValue}
          />
          <InfoRow
            label={dictionary.member.labels.completionAt}
            value={
              member.registrationCompletedAt
                ? formatDateTime(member.registrationCompletedAt, locale)
                : dictionary.common.notAvailable
            }
          />
          <InfoRow
            label={dictionary.member.labels.paymentReceivedAt}
            value={
              member.paymentReceivedAt
                ? formatDateTime(member.paymentReceivedAt, locale)
                : dictionary.common.notAvailable
            }
          />
          <InfoRow
            label={dictionary.member.labels.lastWallet}
            value={
              formatAddressLabel(member.lastWalletAddress) ??
              dictionary.common.notAvailable
            }
          />
          <InfoRow
            label={dictionary.member.labels.lastConnectedAt}
            value={formatDateTime(member.lastConnectedAt, locale)}
          />
          <InfoRow
            label={dictionary.member.labels.referredByCode}
            value={member.referredByCode ?? dictionary.member.noReferralApplied}
          />
          <InfoRow
            label={dictionary.member.labels.requiredDeposit}
            value={`${member.requiredDepositAmount} USDT`}
          />
        </div>

        {paymentTransactionUrl ? (
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
              {dictionary.member.labels.paymentTransaction}
            </p>
            <a
              className="mt-3 flex max-w-full items-start gap-2 break-all text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-4"
              href={paymentTransactionUrl}
              rel="noreferrer"
              target="_blank"
            >
              {member.paymentTransactionHash}
              <ArrowUpRight className="size-4" />
            </a>
          </div>
        ) : null}
      </Panel>

      <Panel
        className="lg:col-span-2"
        contentClassName="gap-4"
        eyebrow={dictionary.referralsPage.eyebrow}
        title={dictionary.referralsPage.rewards.title}
      >
        <ReferralRewardsPanel
          dictionary={dictionary}
          locale={locale}
          rewards={referralDashboard.rewards}
        />
      </Panel>

      <Panel
        className="lg:col-span-2"
        contentClassName="gap-4"
        eyebrow={dictionary.referralsPage.eyebrow}
        title={dictionary.referralsPage.listTitle}
      >
        {referralDashboard.error ? (
          <MessageCard tone="error">{referralDashboard.error}</MessageCard>
        ) : null}

        {referralDashboard.status === "loading" ? (
          <MessageCard>{dictionary.referralsPage.loading}</MessageCard>
        ) : (
          <ReferralNetworkExplorer
            dictionary={dictionary}
            key={`${member.email}:${referralDashboard.totalReferrals}:${referralDashboard.levelCounts.join("-")}`}
            levelCounts={referralDashboard.levelCounts}
            locale={locale}
            referrals={referralDashboard.referrals}
            totalReferrals={referralDashboard.totalReferrals}
          />
        )}
      </Panel>
    </section>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="min-w-[156px] snap-start rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:min-w-0">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500">{hint}</p>
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

function CompactMetaCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/10 px-3 py-3">
      <p className="text-[0.64rem] uppercase tracking-[0.2em] text-white/52">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

function Badge({
  children,
  icon,
}: {
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 backdrop-blur">
      {icon}
      {children}
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
        "inline-flex h-11 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium",
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

function PrimaryActionLink({
  className,
  href,
  label,
}: {
  className?: string;
  href: string;
  label: string;
}) {
  if (href.startsWith("/")) {
    return (
      <Link className={className} href={href}>
        {label}
      </Link>
    );
  }

  return (
    <a className={className} href={href}>
      {label}
    </a>
  );
}

function NoticeCard({
  notice,
  placeholder,
  openExplorerLabel,
}: {
  notice: WalletNotice | null;
  placeholder: string;
  openExplorerLabel: string;
}) {
  if (!notice) {
    return (
      <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-500">
        {placeholder}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[22px] border px-4 py-4 text-sm leading-6 break-words",
        notice.tone === "success" &&
          "border-emerald-200 bg-emerald-50 text-emerald-950",
        notice.tone === "info" && "border-blue-200 bg-blue-50 text-blue-950",
        notice.tone === "error" && "border-rose-200 bg-rose-50 text-rose-950",
      )}
    >
      <p>{notice.text}</p>
      {notice.href ? (
        <a
          className="mt-2 inline-flex items-center gap-2 font-semibold underline decoration-current underline-offset-4"
          href={notice.href}
          rel="noreferrer"
          target="_blank"
        >
          {openExplorerLabel}
          <ArrowUpRight className="size-4" />
        </a>
      ) : null}
    </div>
  );
}

const celebrationBursts = [
  {
    colors: ["#2563eb", "#38bdf8", "#f97316", "#facc15"],
    x: "18%",
    y: "22%",
  },
  {
    colors: ["#0f766e", "#2dd4bf", "#f59e0b", "#fb7185"],
    x: "74%",
    y: "18%",
  },
  {
    colors: ["#f97316", "#fb7185", "#facc15", "#38bdf8"],
    x: "26%",
    y: "74%",
  },
  {
    colors: ["#2563eb", "#22c55e", "#f97316", "#e879f9"],
    x: "82%",
    y: "68%",
  },
];

const celebrationVectors = [
  { x: "0px", y: "-84px" },
  { x: "62px", y: "-52px" },
  { x: "84px", y: "0px" },
  { x: "60px", y: "54px" },
  { x: "0px", y: "86px" },
  { x: "-62px", y: "54px" },
  { x: "-84px", y: "0px" },
  { x: "-62px", y: "-52px" },
  { x: "38px", y: "-88px" },
  { x: "-40px", y: "-88px" },
  { x: "92px", y: "26px" },
  { x: "-94px", y: "28px" },
];

function CelebrationOverlay({
  description,
  open,
  title,
}: {
  description: string;
  open: boolean;
  title: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.14),rgba(15,23,42,0.72))]" />
      {celebrationBursts.map((burst, burstIndex) => (
        <div
          className="celebration-burst"
          key={`${burst.x}-${burst.y}`}
          style={{
            animationDelay: `${burstIndex * 180}ms`,
            left: burst.x,
            top: burst.y,
          }}
        >
          {celebrationVectors.map((vector, particleIndex) => (
            <span
              className="celebration-spark"
              key={`${vector.x}-${vector.y}`}
              style={{
                "--celebration-color":
                  burst.colors[particleIndex % burst.colors.length],
                "--spark-x": vector.x,
                "--spark-y": vector.y,
                animationDelay: `${burstIndex * 180 + particleIndex * 28}ms`,
              } as CSSProperties}
            />
          ))}
        </div>
      ))}

      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="glass-card max-w-md rounded-[30px] border border-white/70 bg-white/82 px-6 py-7 text-center shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a,#2563eb)] text-white shadow-[0_18px_40px_rgba(37,99,235,0.22)]">
            <Sparkles className="size-6" />
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
            {title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

function getAdminAccountAddress(
  wallet:
    | {
        getAdminAccount?: () =>
          | {
              address?: string | null;
            }
          | undefined;
      }
    | undefined,
) {
  try {
    return wallet?.getAdminAccount?.()?.address?.trim() ?? null;
  } catch {
    return null;
  }
}

function formatAddressLabel(address?: string | null) {
  const trimmed = address?.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.length <= 12) {
    return trimmed;
  }

  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function formatTemplate(
  template: string,
  replacements: Record<string, string | number>,
) {
  return Object.entries(replacements).reduce((message, [key, value]) => {
    return message.replaceAll(`{${key}}`, String(value));
  }, template);
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

function formatBalance(
  value: string | undefined,
  symbol: string,
  locale: Locale,
) {
  if (!value) {
    return `0 ${symbol}`;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return `${value} ${symbol}`;
  }

  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: parsed > 1 ? 4 : 6,
  }).format(parsed)} ${symbol}`;
}

function formatDateTime(value: string, locale: Locale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
