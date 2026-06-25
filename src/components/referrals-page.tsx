"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Gift,
  KeyRound,
  Link2,
  LogOut,
  Route,
  Rss,
  Share2,
  UsersRound,
  WalletMinimal,
} from "lucide-react";
import {
  useActiveAccount,
  useActiveWallet,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
  useDisconnect,
} from "thirdweb/react";

import { AnimatedNumberText } from "@/components/animated-number-text";
import { EmailLoginDialog } from "@/components/email-login-dialog";
import { CopyTextButton } from "@/components/copy-text-button";
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";
import { useMemberSession } from "@/components/member-session-provider";
import { ReferralNetworkExplorer } from "@/components/referral-network-explorer";
import { ReferralRewardsPanel } from "@/components/referral-rewards-panel";
import {
  buildPathWithReferral,
  buildReferralLandingPath,
  setLandingHomeLanguageContext,
  setLandingLanguageContext,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { getContentCopy } from "@/lib/content-copy";
import {
  createEmptyReferralRewardsSummary,
  REFERRAL_SIGNUP_LIMIT,
} from "@/lib/member";
import { getLandingBrandingCopy } from "@/lib/landing-branding-copy";
import type {
  MemberReferralsResponse,
  MemberRecord,
  ReferralRewardsSummaryRecord,
  ReferralTreeNodeRecord,
} from "@/lib/member";
import { syncServerMemberRegistration } from "@/lib/member-session-client";
import { cn } from "@/lib/utils";
import {
  hasThirdwebClientId,
  smartWalletChain,
  thirdwebClient,
} from "@/lib/thirdweb";
import { getThirdwebUserEmail, useThirdwebConnectionState } from "@/lib/thirdweb-client";
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
  landingLanguage = null,
  locale,
  referralCode = null,
}: {
  dictionary: Dictionary;
  landingLanguage?: string | null;
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
  const brandingCopy = getLandingBrandingCopy(locale);
  const contentCopy = getContentCopy(locale);
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
  const homeHref = setLandingHomeLanguageContext(
    buildReferralLandingPath(locale, referralCode),
    landingLanguage,
  );
  const activateHref = setLandingLanguageContext(
    buildPathWithReferral(`/${locale}/activate`, referralCode),
    landingLanguage,
  );
  const currentReferralsHref = setLandingLanguageContext(
    buildPathWithReferral(`/${locale}/referrals`, referralCode),
    landingLanguage,
  );
  const networkFeedHref = setLandingLanguageContext(
    buildPathWithReferral(`/${locale}/network-feed`, referralCode),
    landingLanguage,
  );
  const rewardsHref = setLandingLanguageContext(
    buildPathWithReferral(`/${locale}/rewards`, referralCode),
    landingLanguage,
  );
  const walletHref = setPathSearchParams(
    setLandingLanguageContext(
      buildPathWithReferral(`/${locale}/wallet`, referralCode),
      landingLanguage,
    ),
    {
      returnTo: currentReferralsHref,
    },
  );
  const memberManagementHref = setLandingLanguageContext(
    buildPathWithReferral(`/${locale}/activate/network`, referralCode),
    landingLanguage,
  );
  const hubCopy = getReferralHubCopy(locale);
  const referralLink = state.member?.referralCode
    ? getReferralLink(state.member.referralCode, locale)
    : null;
  const referralLoginTitle = getReferralLoginTitle(locale);
  const accountLabel = accountAddress
    ? `${accountAddress.slice(0, 6)}...${accountAddress.slice(-4)}`
    : null;
  const accountUrl = accountAddress
    ? `${BSC_EXPLORER}/address/${accountAddress}`
    : BSC_EXPLORER;
  const {
    isDisconnected,
    isResolving: isConnectionResolving,
  } = useThirdwebConnectionState({ accountAddress, status });

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
      const email =
        memberSessionEmail ??
        (await getThirdwebUserEmail({ client: thirdwebClient }));

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

      const syncData = await syncServerMemberRegistration({
        chainId: chain.id,
        chainName: chain.name ?? "BSC",
        email,
        locale,
        walletAddress: accountAddress,
      });

      if (!syncData.ok) {
        throw new Error(
          syncData.error || dictionary.referralsPage.errors.loadFailed,
        );
      }

      if (syncData.validationError) {
        setState({
          error: syncData.validationError,
          levelCounts: [],
          member: syncData.member,
          referrals: [],
          rewards: createEmptyReferralRewardsSummary(),
          status: "error",
          totalReferrals: 0,
        });
        return;
      }

      if (!syncData.member) {
        throw new Error(dictionary.referralsPage.errors.loadFailed);
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
    if (isConnectionResolving) {
      return;
    }

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
  }, [
    accountAddress,
    chain.id,
    chain.name,
    isConnectionResolving,
    locale,
    status,
  ]);

  function confirmLogout() {
    if (!wallet) {
      setIsLogoutDialogOpen(false);
      return;
    }

    setIsLogoutDialogOpen(false);
    disconnect(wallet);
  }

  const canShowMemberDashboard =
    !isDisconnected &&
    !isConnectionResolving &&
    state.status !== "idle";
  const isCompletedMember = state.member?.status === "completed";
  const primaryAction =
    !hasThirdwebClientId || isConnectionResolving
      ? null
      : isDisconnected
        ? "connect"
        : isCompletedMember
          ? "manage"
          : "activate";

  return (
    <div className="friend-service-surface relative isolate min-h-screen overflow-hidden text-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,195,77,0.18),transparent_24%),radial-gradient(circle_at_88%_8%,rgba(15,23,42,0.12),transparent_24%),linear-gradient(180deg,#f6efe3_0%,#fbf7ef_44%,#f8f2e9_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,rgba(15,23,42,0.08),transparent)]" />
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
        serviceLabel="1066FRIEND+"
        title={referralLoginTitle}
      />

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-6 lg:px-8">
        <header className="flex flex-col gap-3 rounded-[28px] border border-white/70 bg-white/82 px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-start gap-3">
            <Link
              aria-label={dictionary.referralsPage.actions.backHome}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              href={homeHref}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
                1066FRIEND+
              </p>
              <h1 className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-950">
                {hubCopy.headerTitle}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <StatusChip
              labels={dictionary.common.status}
              status={status}
            />
            {hasThirdwebClientId ? (
              status === "connected" ? (
                <div className="flex flex-wrap items-center gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
                  {accountAddress ? (
                    <a
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:bg-slate-50 sm:h-11 sm:w-auto sm:justify-start sm:gap-2 sm:px-4 sm:text-sm sm:font-medium"
                      href={accountUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ArrowUpRight className="size-4 shrink-0" />
                      <span className="sr-only sm:not-sr-only">{accountLabel ?? accountAddress}</span>
                    </a>
                  ) : null}

                  <button
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-950 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:w-auto sm:px-4 sm:text-sm sm:font-medium"
                    disabled={!wallet}
                    onClick={() => {
                      if (!wallet) {
                        return;
                      }

                      setIsLogoutDialogOpen(true);
                    }}
                    type="button"
                  >
                    <LogOut className="size-4 sm:hidden" />
                    <span className="sr-only sm:not-sr-only">{dictionary.common.disconnectWallet}</span>
                  </button>
                </div>
              ) : null
            ) : (
              <div className="rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                {dictionary.common.clientIdRequired}
              </div>
            )}
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[34px] border border-[#d5b782]/15 bg-[linear-gradient(180deg,#09111f_0%,#0f172a_42%,#1d2f4b_100%)] p-5 text-white shadow-[0_38px_120px_rgba(15,23,42,0.3)] sm:rounded-[40px] sm:p-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(245,204,96,0.2),transparent_68%)]" />
          <div className="pointer-events-none absolute -right-24 bottom-0 hidden h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(228,181,80,0.18),transparent_72%)] blur-2xl sm:block" />

          <div className="relative grid gap-6 lg:grid-cols-[1.12fr_0.88fr] lg:items-end">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <HeroPill>1066FRIEND+</HeroPill>
                <HeroPill>{hubCopy.heroBadge}</HeroPill>
              </div>
              <div className="max-w-2xl space-y-3">
                <h2 className="text-[2.12rem] font-black leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl sm:leading-[0.95] sm:tracking-[-0.055em]">
                  {hubCopy.heroTitle}
                </h2>
                <p className="max-w-xl text-base leading-7 text-white/72 sm:text-lg">
                  {hubCopy.heroDescription}
                </p>
              </div>

              <div className="grid gap-3 sm:flex sm:flex-wrap">
                {primaryAction === "connect" ? (
                  <button
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-slate-950 shadow-[0_20px_45px_rgba(255,255,255,0.16)] transition hover:translate-y-[-1px] hover:bg-[#fff5d6] sm:w-auto"
                    onClick={() => {
                      setIsLoginDialogOpen(true);
                    }}
                    type="button"
                  >
                    {dictionary.common.connectWallet}
                    <ArrowUpRight className="size-4" />
                  </button>
                ) : primaryAction === "activate" ? (
                  <Link
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold !text-slate-950 shadow-[0_20px_45px_rgba(255,255,255,0.16)] transition hover:translate-y-[-1px] hover:bg-[#fff5d6] sm:w-auto"
                    href={activateHref}
                  >
                    {dictionary.referralsPage.actions.completeSignup}
                    <ArrowUpRight className="size-4" />
                  </Link>
                ) : primaryAction === "manage" ? (
                  <Link
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold !text-slate-950 shadow-[0_20px_45px_rgba(255,255,255,0.16)] transition hover:translate-y-[-1px] hover:bg-[#fff5d6] sm:w-auto"
                    href={memberManagementHref}
                  >
                    {hubCopy.primaryManage}
                    <ArrowUpRight className="size-4" />
                  </Link>
                ) : null}

                {referralLink ? (
                  <CopyTextButton
                    className="w-full border-white/18 bg-white/10 !text-white hover:bg-white/16 sm:w-auto"
                    copiedLabel={dictionary.common.copied}
                    copyLabel={dictionary.common.copyLink}
                    text={referralLink}
                  />
                ) : null}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/12 bg-white/9 p-4 shadow-[0_28px_80px_rgba(0,0,0,0.18)] backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/52">
                    {hubCopy.currentStatus}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {isCompletedMember
                      ? hubCopy.statusReady
                      : isDisconnected
                        ? hubCopy.statusNeedLogin
                        : hubCopy.statusNeedActivation}
                  </p>
                </div>
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-950">
                  <Route className="size-5" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <HeroMetric
                  label={dictionary.referralsPage.labels.referralCode}
                  value={state.member?.referralCode ?? "-"}
                />
                <HeroMetric
                  label={dictionary.referralsPage.labels.directReferrals}
                  value={`${state.referrals.length}/${REFERRAL_SIGNUP_LIMIT}`}
                />
                <HeroMetric
                  label={dictionary.referralsPage.rewards.totalPoints}
                  value={`${state.rewards.totalPoints}P`}
                />
                <HeroMetric
                  label={dictionary.referralsPage.labels.totalNetwork}
                  value={String(state.totalReferrals)}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[32px] border border-white/70 bg-white/86 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5">
            <SectionHeading
              eyebrow={hubCopy.startEyebrow}
              title={hubCopy.startTitle}
            />

            {!hasThirdwebClientId ? (
              <MessageCard>{dictionary.env.description}</MessageCard>
            ) : isConnectionResolving ? (
              <MessageCard>{dictionary.referralsPage.loading}</MessageCard>
            ) : isDisconnected ? (
              <StartStateCard
                description={dictionary.referralsPage.disconnected}
                icon={<KeyRound className="size-5" />}
                title={hubCopy.loginTitle}
              />
            ) : state.status === "loading" ? (
              <MessageCard>{dictionary.referralsPage.loading}</MessageCard>
            ) : state.status === "error" ? (
              <MessageCard tone="error">
                {state.error ?? dictionary.referralsPage.errors.loadFailed}
              </MessageCard>
            ) : !isCompletedMember ? (
              <StartStateCard
                description={dictionary.referralsPage.paymentRequired}
                icon={<CheckCircle2 className="size-5" />}
                title={hubCopy.activationTitle}
              />
            ) : state.member ? (
              <div className="space-y-4">
                <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Share2 className="size-5" />
                    </div>
                    <div className="min-w-0">
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
                    valueContent={
                      <AnimatedNumberText
                        locale={locale}
                        value={`${state.referrals.length} / ${REFERRAL_SIGNUP_LIMIT}`}
                      />
                    }
                    value={`${state.referrals.length} / ${REFERRAL_SIGNUP_LIMIT}`}
                  />
                  <InfoRow
                    label={dictionary.referralsPage.labels.totalNetwork}
                    valueContent={
                      <AnimatedNumberText
                        locale={locale}
                        value={String(state.totalReferrals)}
                      />
                    }
                    value={String(state.totalReferrals)}
                  />
                  <InfoRow
                    label={dictionary.referralsPage.rewards.totalPoints}
                    value={`${state.rewards.totalPoints} P`}
                  />
                </div>

                {referralLink ? (
                  <div className="rounded-[26px] border border-slate-200 bg-white px-4 py-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      <Link2 className="size-4" />
                      {dictionary.referralsPage.labels.referralLink}
                    </div>
                    <a
                      className="mt-3 block break-all text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-4"
                      href={referralLink}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {referralLink}
                    </a>
                    <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                      <CopyTextButton
                        className="w-full sm:w-auto"
                        copiedLabel={dictionary.common.copied}
                        copyLabel={dictionary.common.copyLink}
                        text={referralLink}
                      />
                      <a
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                        href={referralLink}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {brandingCopy.actions.openPreview}
                        <ArrowUpRight className="size-4" />
                      </a>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="rounded-[32px] border border-white/70 bg-white/86 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5">
            <SectionHeading
              eyebrow={hubCopy.manageEyebrow}
              title={hubCopy.manageTitle}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <ActionLinkCard
                description={hubCopy.membersDescription}
                href={memberManagementHref}
                icon={<UsersRound className="size-5" />}
                title={hubCopy.membersTitle}
              />
              <ActionLinkCard
                description={hubCopy.pointsDescription}
                href={rewardsHref}
                icon={<Gift className="size-5" />}
                title={hubCopy.pointsTitle}
              />
              <ActionLinkCard
                description={hubCopy.walletDescription}
                href={walletHref}
                icon={<WalletMinimal className="size-5" />}
                title={hubCopy.walletTitle}
              />
              <ActionLinkCard
                description={contentCopy.entry.viewerDescription}
                href={networkFeedHref}
                icon={<Rss className="size-5" />}
                title={contentCopy.entry.viewerTitle}
              />
            </div>
          </section>
        </section>

        {canShowMemberDashboard ? (
          <section className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
            <section className="rounded-[32px] border border-white/70 bg-white/86 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5">
              <SectionHeading
                eyebrow={hubCopy.networkEyebrow}
                title={dictionary.referralsPage.listTitle}
              />

              {state.status === "loading" ? (
                <MessageCard>{dictionary.referralsPage.loading}</MessageCard>
              ) : state.status === "error" ? (
                <MessageCard tone="error">
                  {state.error ?? dictionary.referralsPage.errors.loadFailed}
                </MessageCard>
              ) : !isCompletedMember ? (
                <MessageCard>{dictionary.referralsPage.paymentRequired}</MessageCard>
              ) : state.member ? (
                <ReferralNetworkExplorer
                  dictionary={dictionary}
                  key={`${state.member.email}:${state.totalReferrals}:${state.levelCounts.join("-")}`}
                  levelCounts={state.levelCounts}
                  locale={locale}
                  referrals={state.referrals}
                  totalReferrals={state.totalReferrals}
                />
              ) : null}
            </section>

            <section className="rounded-[32px] border border-white/70 bg-white/86 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5">
              {state.status === "loading" ? (
                <MessageCard>{dictionary.referralsPage.loading}</MessageCard>
              ) : state.status === "error" ? (
                <MessageCard tone="error">
                  {state.error ?? dictionary.referralsPage.errors.loadFailed}
                </MessageCard>
              ) : !isCompletedMember ? (
                <MessageCard>{dictionary.referralsPage.paymentRequired}</MessageCard>
              ) : (
                <ReferralRewardsPanel
                  dictionary={dictionary}
                  locale={locale}
                  rewards={state.rewards}
                />
              )}
            </section>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function HeroPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/14 bg-white/10 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/76">
      {children}
    </span>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[5.75rem] rounded-[20px] border border-white/10 bg-white/8 p-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/48">
        {label}
      </p>
      <p className="mt-3 break-words text-xl font-semibold tracking-tight text-white tabular-nums">
        {value}
      </p>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-4 space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
        {eyebrow}
      </p>
      <h2 className="text-xl font-semibold tracking-tight text-slate-950">
        {title}
      </h2>
    </div>
  );
}

function StartStateCard({
  action = null,
  description,
  icon,
  title,
}: {
  action?: ReactNode | null;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-base font-semibold tracking-tight text-slate-950">
            {title}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function ActionLinkCard({
  description,
  href,
  icon,
  title,
}: {
  description: string;
  href: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Link
      className="group rounded-[24px] border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
      href={href}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
          {icon}
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-slate-400 transition group-hover:text-slate-700" />
      </div>
      <p className="mt-4 text-base font-semibold tracking-tight text-slate-950">
        {title}
      </p>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
        {description}
      </p>
    </Link>
  );
}

function InfoRow({
  label,
  value,
  valueContent,
}: {
  label: string;
  value: string;
  valueContent?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-slate-900 sm:text-base">
        {valueContent ?? value}
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

function getReferralHubCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      activationTitle: "회원 활성화가 필요합니다",
      bnbDescription: "BNB 입금과 네트워크 수수료 상태를 확인합니다.",
      bnbTitle: "BNB 지갑",
      brandingDescription: "내 추천 링크로 열리는 랜딩 화면을 꾸밉니다.",
      brandingTitle: "랜딩 꾸미기",
      currentStatus: "현재 상태",
      headerTitle: "추천 성장 허브",
      heroBadge: "추천 코드 시작 페이지",
      heroDescription:
        "내 코드로 가입한 회원, 포인트, 지갑을 한 곳에서 관리합니다. 이 페이지가 1066FRIEND+ 추천 서비스의 시작 화면입니다.",
      heroTitle: "내 코드로 만든 네트워크를 관리하세요",
      loginTitle: "이메일로 시작하세요",
      manageEyebrow: "management",
      manageTitle: "필요한 관리 페이지로 바로 이동",
      membersDescription: "내 추천 코드로 가입한 회원과 6단계 네트워크를 확인합니다.",
      membersTitle: "추천 회원 관리",
      networkEyebrow: "my members",
      pointsDescription: "추천 가입으로 적립된 포인트와 지급 내역을 확인합니다.",
      pointsTitle: "포인트 관리",
      primaryManage: "추천 회원 관리",
      startEyebrow: "start here",
      startTitle: "지금 해야 할 일",
      statusNeedActivation: "가입 완료 전",
      statusNeedLogin: "로그인 필요",
      statusReady: "관리 가능",
      walletDescription: "스마트 월렛, USDT 잔고, 입출금 내역을 관리합니다.",
      walletTitle: "내 지갑 관리",
    };
  }

  if (locale === "ja") {
    return {
      activationTitle: "メンバー有効化が必要です",
      bnbDescription: "BNB入金とネットワーク手数料の状態を確認します。",
      bnbTitle: "BNBウォレット",
      brandingDescription: "紹介リンクで開くランディング画面を調整します。",
      brandingTitle: "ランディング編集",
      currentStatus: "現在の状態",
      headerTitle: "紹介成長ハブ",
      heroBadge: "紹介コード開始ページ",
      heroDescription:
        "自分のコードで参加したメンバー、ポイント、ウォレットを一か所で管理します。",
      heroTitle: "自分のコードで作ったネットワークを管理",
      loginTitle: "メールで開始",
      manageEyebrow: "management",
      manageTitle: "管理ページへ移動",
      membersDescription: "紹介コードで参加したメンバーと6段階ネットワークを確認します。",
      membersTitle: "紹介メンバー管理",
      networkEyebrow: "my members",
      pointsDescription: "紹介参加で貯まったポイントと履歴を確認します。",
      pointsTitle: "ポイント管理",
      primaryManage: "紹介メンバー管理",
      startEyebrow: "start here",
      startTitle: "次のアクション",
      statusNeedActivation: "有効化前",
      statusNeedLogin: "ログインが必要",
      statusReady: "管理可能",
      walletDescription: "スマートウォレット、USDT残高、入出金履歴を管理します。",
      walletTitle: "ウォレット管理",
    };
  }

  return {
    activationTitle: "Membership activation required",
    bnbDescription: "Check BNB deposits and network fee readiness.",
    bnbTitle: "BNB wallet",
    brandingDescription: "Customize the landing screen opened from your referral link.",
    brandingTitle: "Landing branding",
    currentStatus: "Current status",
    headerTitle: "Referral growth hub",
    heroBadge: "Referral code start page",
    heroDescription:
      "Manage members, points, and wallets created through your referral code in one place.",
    heroTitle: "Manage the network built by your code",
    loginTitle: "Start with email",
    manageEyebrow: "management",
    manageTitle: "Open the right management page",
    membersDescription: "Review members and the 6-level network under your code.",
    membersTitle: "Referral members",
    networkEyebrow: "my members",
    pointsDescription: "Check points and reward history from referral signups.",
    pointsTitle: "Points",
    primaryManage: "Manage members",
    startEyebrow: "start here",
    startTitle: "Next action",
    statusNeedActivation: "Activation pending",
    statusNeedLogin: "Login required",
    statusReady: "Ready to manage",
    walletDescription: "Manage your smart wallet, USDT balance, and transfers.",
    walletTitle: "Wallet",
  };
}

function getReferralLoginTitle(locale: Locale) {
  if (locale === "ko") {
    return "이메일로 1066FRIEND+ 로그인";
  }

  if (locale === "ja") {
    return "メールで1066FRIEND+にログイン";
  }

  if (locale === "zh") {
    return "使用邮箱登录 1066FRIEND+";
  }

  return "Log in to 1066FRIEND+ with email";
}
