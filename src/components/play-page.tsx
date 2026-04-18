"use client";

import Link from "next/link";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarCheck2,
  CheckCircle2,
  Flame,
  RefreshCcw,
  Sparkles,
  Trophy,
  Zap,
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
import { LandingReveal } from "@/components/landing/landing-reveal";
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";
import {
  buildPathWithReferral,
  buildReferralLandingPath,
} from "@/lib/landing-branding";
import type { Dictionary, Locale } from "@/lib/i18n";
import type {
  ActivitySummaryRecord,
  ActivitySummaryResponse,
  ActivityTapSessionFinishResponse,
  ActivityTapSessionStartResponse,
} from "@/lib/activity";
import { createEmptyActivitySummary } from "@/lib/activity";
import type { MemberRecord, SyncMemberResponse } from "@/lib/member";
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

type PlayPageState = {
  email: string | null;
  error: string | null;
  member: MemberRecord | null;
  status: "idle" | "loading" | "ready" | "error";
  summary: ActivitySummaryRecord;
};

export function PlayPage({
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
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const [state, setState] = useState<PlayPageState>({
    email: null,
    error: null,
    member: null,
    status: "idle",
    summary: createEmptyActivitySummary(),
  });
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isStartingTap, setIsStartingTap] = useState(false);
  const [isFinishingTap, setIsFinishingTap] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [tapCount, setTapCount] = useState(0);
  const [countdownNow, setCountdownNow] = useState(Date.now());
  const autoFinishRequestedRef = useRef(false);
  const activeSession = state.summary.activeSession;
  const isDisconnected = status !== "connected" || !accountAddress;
  const connectedAccountUrl = accountAddress
    ? `${BSC_EXPLORER}/address/${accountAddress}`
    : BSC_EXPLORER;
  const progressPercent = activeSession
    ? Math.min(100, (tapCount / activeSession.targetTaps) * 100)
    : 0;
  const progressRingStyle = {
    background: `conic-gradient(from 180deg, rgba(251,191,36,0.96) 0%, rgba(34,197,94,0.92) ${progressPercent}%, rgba(148,163,184,0.18) ${progressPercent}%, rgba(148,163,184,0.18) 100%)`,
  } satisfies CSSProperties;
  const remainingMs = activeSession
    ? Math.max(0, new Date(activeSession.expiresAt).getTime() - countdownNow)
    : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const tapTargetReached =
    activeSession !== null && tapCount >= activeSession.targetTaps;
  const summary = state.summary;
  const homeHref = buildReferralLandingPath(locale, referralCode);
  const activateHref = buildPathWithReferral(`/${locale}/activate`, referralCode);

  const loadActivity = useCallback(
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
          throw new Error(dictionary.playPage.errors.missingEmail);
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
              : dictionary.playPage.errors.loadFailed,
          );
        }

        if ("validationError" in syncData && syncData.validationError) {
          throw new Error(syncData.validationError);
        }

        const member = "member" in syncData ? syncData.member : null;

        if (!member) {
          throw new Error(dictionary.playPage.errors.loadFailed);
        }

        const summary = member.status === "completed"
          ? await (async () => {
              const response = await fetch(
                `/api/activity/summary?email=${encodeURIComponent(email)}`,
              );
              const data = (await response.json()) as
                | ActivitySummaryResponse
                | { error?: string };

              if (!response.ok || !("summary" in data)) {
                throw new Error(
                  "error" in data && data.error
                    ? data.error
                    : dictionary.playPage.errors.loadFailed,
                );
              }

              return data.summary;
            })()
          : createEmptyActivitySummary(email);

        setState({
          email,
          error: null,
          member,
          status: "ready",
          summary,
        });
        setActionError(null);
        if (!summary.activeSession) {
          setTapCount(0);
        }
      } catch (error) {
        setState((current) => ({
          ...current,
          error:
            error instanceof Error
              ? error.message
              : dictionary.playPage.errors.loadFailed,
          status: "error",
        }));
      } finally {
        setIsRefreshing(false);
      }
    },
    [
      accountAddress,
      chain.id,
      chain.name,
      dictionary.playPage.errors.loadFailed,
      dictionary.playPage.errors.missingEmail,
      locale,
    ],
  );

  useEffect(() => {
    if (status === "connected") {
      setIsLoginDialogOpen(false);
      return;
    }

    setActionError(null);
    setActionNotice(null);
    setTapCount(0);
    setState({
      email: null,
      error: null,
      member: null,
      status: "idle",
      summary: createEmptyActivitySummary(),
    });
  }, [status]);

  useEffect(() => {
    if (status !== "connected" || !accountAddress || !hasThirdwebClientId) {
      return;
    }

    void loadActivity();
  }, [accountAddress, loadActivity, status]);

  useEffect(() => {
    if (!activeSession) {
      autoFinishRequestedRef.current = false;
      setCountdownNow(Date.now());
      return;
    }

    autoFinishRequestedRef.current = false;
    setCountdownNow(Date.now());
    const intervalId = window.setInterval(() => {
      setCountdownNow(Date.now());
    }, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeSession]);

  const finishTapSession = useCallback(
    async (reason: "manual" | "timeout") => {
      if (!state.email || !activeSession || isFinishingTap) {
        return;
      }

      setIsFinishingTap(true);
      setActionError(null);

      try {
        const response = await fetch("/api/activity/tap-session/finish", {
          body: JSON.stringify({
            email: state.email,
            sessionId: activeSession.sessionId,
            tapCount,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        });
        const data = (await response.json()) as
          | ActivityTapSessionFinishResponse
          | { error?: string };

        if (!response.ok || !("summary" in data)) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : dictionary.playPage.errors.tapFailed,
          );
        }

        setState((current) => ({
          ...current,
          summary: data.summary,
        }));
        setTapCount(0);
        setActionNotice(
          data.rewardEarned > 0
            ? formatTemplate(dictionary.playPage.notices.tapSuccess, {
                coins: formatPlayCoins(data.rewardEarned, locale, dictionary),
              })
            : reason === "timeout"
              ? dictionary.playPage.notices.tapExpired
              : dictionary.playPage.notices.tapMissed,
        );
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : dictionary.playPage.errors.tapFailed,
        );
      } finally {
        setIsFinishingTap(false);
      }
    },
    [
      activeSession,
      dictionary,
      isFinishingTap,
      locale,
      state.email,
      tapCount,
    ],
  );

  useEffect(() => {
    if (!activeSession || remainingMs > 0 || autoFinishRequestedRef.current) {
      return;
    }

    autoFinishRequestedRef.current = true;
    void finishTapSession("timeout");
  }, [activeSession, finishTapSession, remainingMs]);

  async function handleCheckIn() {
    if (!state.email || isCheckingIn) {
      return;
    }

    setIsCheckingIn(true);
    setActionError(null);

    try {
      const response = await fetch("/api/activity/check-in", {
        body: JSON.stringify({ email: state.email }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as
        | ActivitySummaryResponse
        | { error?: string };

      if (!response.ok || !("summary" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : dictionary.playPage.errors.checkInFailed,
        );
      }

      setState((current) => ({
        ...current,
        summary: data.summary,
      }));
      setActionNotice(
        formatTemplate(dictionary.playPage.notices.checkInSuccess, {
          coins: formatPlayCoins(
            data.summary.today.checkInPoints,
            locale,
            dictionary,
          ),
        }),
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : dictionary.playPage.errors.checkInFailed,
      );
    } finally {
      setIsCheckingIn(false);
    }
  }

  async function handleStartTapSession() {
    if (!state.email || isStartingTap || activeSession) {
      return;
    }

    setIsStartingTap(true);
    setActionError(null);

    try {
      const response = await fetch("/api/activity/tap-session/start", {
        body: JSON.stringify({ email: state.email }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as
        | ActivityTapSessionStartResponse
        | { error?: string };

      if (!response.ok || !("session" in data) || !("summary" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : dictionary.playPage.errors.tapFailed,
        );
      }

      setState((current) => ({
        ...current,
        summary: data.summary,
      }));
      setTapCount(0);
      setActionNotice(dictionary.playPage.notices.tapStarted);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message === "Daily tap reward limit reached."
            ? dictionary.playPage.errors.dailyLimitReached
            : error.message
          : dictionary.playPage.errors.tapFailed,
      );
    } finally {
      setIsStartingTap(false);
    }
  }

  function handleTapHit() {
    if (!activeSession || isFinishingTap || remainingMs <= 0) {
      return;
    }

    setTapCount((current) => current + 1);
  }

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),transparent_18%),radial-gradient(circle_at_0%_10%,rgba(255,255,255,0.62),transparent_18%),linear-gradient(180deg,#091426_0%,#0b1220_38%,#f5f1e8_38%,#f8f5ee_100%)]" />

      <LogoutConfirmDialog
        cancelLabel={dictionary.common.logoutDialog.cancel}
        confirmLabel={dictionary.common.logoutDialog.confirm}
        description={dictionary.common.logoutDialog.description}
        onCancel={() => {
          setIsLogoutDialogOpen(false);
        }}
        onConfirm={() => {
          if (!wallet) {
            setIsLogoutDialogOpen(false);
            return;
          }

          setIsLogoutDialogOpen(false);
          disconnect(wallet);
        }}
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

      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-4 pb-24 sm:px-6 sm:py-6 lg:px-8">
        <LandingReveal delay={10} variant="soft">
          <header className="glass-card rounded-[28px] px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#111827,#172554)] text-white shadow-[0_16px_40px_rgba(15,23,42,0.2)]">
                  <Sparkles className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="eyebrow">{dictionary.playPage.eyebrow}</p>
                  <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                    {dictionary.playPage.title}
                  </h1>
                </div>
              </div>

              <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
                <Link
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                  href={homeHref}
                >
                  <ArrowLeft className="size-4" />
                  {dictionary.playPage.actions.backHome}
                </Link>
                <LanguageSwitcher
                  label={dictionary.common.languageLabel}
                  locale={locale}
                />
                {status === "connected" && accountAddress ? (
                  <>
                    <a
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
                      href={connectedAccountUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {formatAddressLabel(accountAddress)}
                      <ArrowUpRight className="size-4" />
                    </a>
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                      onClick={() => {
                        setIsLogoutDialogOpen(true);
                      }}
                      type="button"
                    >
                      {dictionary.common.disconnectWallet}
                    </button>
                  </>
                ) : (
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                    onClick={() => {
                      setIsLoginDialogOpen(true);
                    }}
                    type="button"
                  >
                    {dictionary.common.connectWallet}
                  </button>
                )}
              </div>
            </div>
          </header>
        </LandingReveal>

        <LandingReveal variant="hero">
          <section className="relative overflow-hidden rounded-[32px] border border-slate-900/85 bg-[linear-gradient(145deg,#07111f_0%,#0b1830_54%,#113122_100%)] p-4 text-white shadow-[0_30px_90px_rgba(15,23,42,0.26)] sm:p-6">
            <div className="pointer-events-none absolute -right-16 top-0 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.28),transparent_70%)] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.22),transparent_72%)] blur-3xl" />

            <div className="relative grid gap-4 lg:grid-cols-[1.06fr_0.94fr]">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-white/72">
                  <Sparkles className="size-3.5" />
                  {dictionary.playPage.badge}
                </div>
                <div className="space-y-3">
                  <h2 className="max-w-2xl text-[2rem] font-semibold leading-[0.96] tracking-[-0.06em] sm:text-[2.9rem]">
                    {dictionary.playPage.hero.title}
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-white/72 sm:text-base">
                    {dictionary.playPage.hero.description}
                  </p>
                  <div className="inline-flex items-center rounded-full border border-amber-300/24 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold tracking-[0.12em] text-amber-100">
                    {dictionary.playPage.currency.separateNotice}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <PlayMetricCard
                    icon={<Sparkles className="size-4" />}
                    label={dictionary.playPage.labels.activityPoints}
                    locale={locale}
                    value={formatPlayCoins(
                      summary.profile.spendableActivityPoints,
                      locale,
                      dictionary,
                    )}
                  />
                  <PlayMetricCard
                    icon={<Trophy className="size-4" />}
                    label={dictionary.playPage.labels.todayPoints}
                    locale={locale}
                    value={formatPlayCoins(summary.today.totalPoints, locale, dictionary)}
                  />
                  <PlayMetricCard
                    icon={<Flame className="size-4" />}
                    label={dictionary.playPage.labels.streak}
                    locale={locale}
                    value={formatTemplate(dictionary.playPage.labels.streakValue, {
                      days: String(summary.today.streakDays),
                    })}
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-[26px] border border-white/12 bg-white/8 p-4 backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/50">
                        {dictionary.playPage.labels.dailyMissions}
                      </p>
                      <p className="mt-2 text-lg font-semibold tracking-tight text-white">
                        {dictionary.playPage.hero.sideTitle}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-100">
                      <CheckCircle2 className="size-4" />
                      {summary.missions.filter((mission) => mission.completed).length} / {summary.missions.length}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2.5">
                    {summary.missions.map((mission) => (
                      <MissionCard
                        completed={mission.completed}
                        key={mission.id}
                        progressLabel={mission.progressLabel}
                        title={dictionary.playPage.missions[mission.id].title}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-[26px] border border-white/12 bg-[linear-gradient(135deg,rgba(15,23,42,0.28),rgba(15,118,110,0.24))] p-4 backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/52">
                        {dictionary.playPage.labels.teamBonus}
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight text-white tabular-nums">
                        <AnimatedNumberText
                          locale={locale}
                          value={formatPlayCoins(
                            summary.today.teamBonusPoints,
                            locale,
                            dictionary,
                          )}
                        />
                      </p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-medium text-white/70">
                      {getTeamBonusScopeLabel(locale)}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/68">
                    {dictionary.playPage.hero.teamHint}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </LandingReveal>

        {actionNotice ? (
          <MessageCard tone="success">{actionNotice}</MessageCard>
        ) : null}
        {actionError ? <MessageCard tone="error">{actionError}</MessageCard> : null}
        {state.error ? <MessageCard tone="error">{state.error}</MessageCard> : null}

        {isDisconnected ? (
          <MessageCard>{dictionary.playPage.disconnected}</MessageCard>
        ) : state.status === "loading" ? (
          <MessageCard>{dictionary.playPage.loading}</MessageCard>
        ) : state.member?.status !== "completed" ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <MessageCard>{dictionary.playPage.requiresSignup}</MessageCard>
            <Link
              className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
              href={activateHref}
            >
              {dictionary.playPage.actions.completeSignup}
            </Link>
          </div>
        ) : (
          <section className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
            <LandingReveal delay={80} variant="soft">
              <div className="glass-card rounded-[30px] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow">{dictionary.playPage.labels.tapChallenge}</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                      {dictionary.playPage.tap.title}
                    </h3>
                  </div>
                  <button
                    className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                    disabled={isRefreshing}
                    onClick={() => {
                      void loadActivity({ background: true });
                    }}
                    type="button"
                  >
                    <RefreshCcw className={cn("size-4", isRefreshing && "animate-spin")} />
                  </button>
                </div>

                <div className="mt-5 grid gap-4">
                  <div className="mx-auto flex w-full max-w-[22rem] flex-col items-center gap-4">
                    <div
                      className="relative flex size-[18rem] items-center justify-center rounded-full p-3 shadow-[0_32px_80px_rgba(15,23,42,0.16)] sm:size-[20rem]"
                      style={progressRingStyle}
                    >
                      <div className="absolute inset-3 rounded-full bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),transparent_36%),linear-gradient(180deg,#081225_0%,#0f172a_60%,#122b1d_100%)]" />
                      <button
                        className="relative flex size-full items-center justify-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_30%),linear-gradient(180deg,#0f172a_0%,#081225_100%)] px-8 text-center transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55"
                        disabled={!activeSession || isFinishingTap}
                        onClick={handleTapHit}
                        type="button"
                      >
                        <div className="space-y-3">
                          <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-amber-300/24 bg-amber-400/10 text-amber-200">
                            <Zap className="size-7" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-white/42">
                              {activeSession
                                ? dictionary.playPage.tap.liveLabel
                                : dictionary.playPage.tap.idleLabel}
                            </p>
                            <p className="text-[2.9rem] font-black leading-none tracking-[-0.07em] text-white tabular-nums">
                              {tapCount}
                            </p>
                            <p className="text-sm leading-6 text-white/68">
                              {activeSession
                                ? formatTemplate(dictionary.playPage.tap.targetLabel, {
                                    target: String(activeSession.targetTaps),
                                  })
                                : dictionary.playPage.tap.idleDescription}
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>

                    <div className="w-full rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                            {dictionary.playPage.labels.tapProgress}
                          </p>
                          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                            {formatTemplate(dictionary.playPage.tap.progressLabel, {
                              current: String(Math.min(tapCount, summary.today.tapTarget)),
                              target: String(summary.today.tapTarget),
                            })}
                          </p>
                        </div>
                        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 tabular-nums">
                          {activeSession
                            ? formatTemplate(dictionary.playPage.tap.timerLabel, {
                                seconds: String(remainingSeconds),
                              })
                            : dictionary.playPage.tap.timerIdle}
                        </div>
                      </div>
                      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#f59e0b,#22c55e)] transition-[width] duration-150"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <StatPill
                          label={dictionary.playPage.tap.rewardLabel}
                          value={formatPlayCoins(
                            summary.today.tapRewardPoints,
                            locale,
                            dictionary,
                            { signed: true },
                          )}
                        />
                        <StatPill
                          label={dictionary.playPage.tap.remainingLabel}
                          value={formatTemplate(dictionary.playPage.tap.remainingValue, {
                            count: String(summary.today.remainingTapRewards),
                          })}
                        />
                      </div>
                    </div>

                    {activeSession ? (
                      <button
                        className={cn(
                          "inline-flex h-12 w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition",
                          tapTargetReached
                            ? "bg-slate-950 text-white shadow-[0_22px_45px_rgba(15,23,42,0.16)] hover:bg-slate-800"
                            : "border border-slate-200 bg-white text-slate-500",
                        )}
                        disabled={!tapTargetReached || isFinishingTap}
                        onClick={() => {
                          void finishTapSession("manual");
                        }}
                        type="button"
                      >
                        {isFinishingTap
                          ? dictionary.playPage.actions.finishingTap
                          : tapTargetReached
                            ? dictionary.playPage.actions.claimTapReward
                            : dictionary.playPage.actions.tapMore}
                      </button>
                    ) : (
                      <button
                        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_22px_45px_rgba(15,23,42,0.16)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        disabled={isStartingTap || summary.today.remainingTapRewards === 0}
                        onClick={() => {
                          void handleStartTapSession();
                        }}
                        type="button"
                      >
                        {isStartingTap
                          ? dictionary.playPage.actions.startingTap
                          : dictionary.playPage.actions.startTap}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </LandingReveal>

            <div className="grid gap-4">
              <LandingReveal delay={120} variant="soft">
                <div className="glass-card rounded-[30px] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="eyebrow">{dictionary.playPage.labels.dailyMissions}</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                        {dictionary.playPage.actions.checkIn}
                      </h3>
                    </div>
                    <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900">
                      {formatPlayCoins(
                        summary.today.checkInPoints,
                        locale,
                        dictionary,
                        { signed: true },
                      )}
                    </div>
                  </div>

                  <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#fde68a,#f59e0b)] text-slate-950 shadow-[0_12px_26px_rgba(245,158,11,0.24)]">
                        <CalendarCheck2 className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {dictionary.playPage.missions.check_in.title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {dictionary.playPage.missions.check_in.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <StatPill
                        label={dictionary.playPage.labels.dateKey}
                        value={summary.today.dateKey}
                      />
                      <StatPill
                        label={dictionary.playPage.labels.bestTap}
                        value={formatTemplate(dictionary.playPage.labels.bestTapValue, {
                          count: String(summary.today.bestTapCount),
                        })}
                      />
                    </div>

                    <button
                      className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      disabled={summary.today.checkedIn || isCheckingIn}
                      onClick={() => {
                        void handleCheckIn();
                      }}
                      type="button"
                    >
                      {summary.today.checkedIn
                        ? dictionary.playPage.actions.checkedIn
                        : isCheckingIn
                          ? dictionary.playPage.actions.checkingIn
                          : dictionary.playPage.actions.checkIn}
                    </button>
                  </div>
                </div>
              </LandingReveal>

              <LandingReveal delay={160} variant="soft">
                <div className="glass-card rounded-[30px] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="eyebrow">{dictionary.playPage.labels.history}</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                        {dictionary.playPage.history.title}
                      </h3>
                    </div>
                    <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                      {summary.history.length}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {summary.history.length > 0 ? (
                      summary.history.map((entry) => (
                        <HistoryCard
                          description={getHistoryDescription(dictionary, entry)}
                          key={entry.ledgerEntryId}
                          locale={locale}
                          timestamp={entry.createdAt}
                          value={formatPlayCoins(entry.points, locale, dictionary, {
                            signed: true,
                          })}
                        />
                      ))
                    ) : (
                      <MessageCard>{dictionary.playPage.history.empty}</MessageCard>
                    )}
                  </div>
                </div>
              </LandingReveal>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function PlayMetricCard({
  icon,
  label,
  locale,
  value,
}: {
  icon: ReactNode;
  label: string;
  locale: Locale;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/12 bg-white/8 p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/50">
          {label}
        </p>
        <div className="text-white/52">{icon}</div>
      </div>
      <p className="mt-5 text-[1.9rem] font-black leading-none tracking-[-0.06em] text-white tabular-nums">
        <AnimatedNumberText locale={locale} value={value} />
      </p>
    </div>
  );
}

function MissionCard({
  completed,
  progressLabel,
  title,
}: {
  completed: boolean;
  progressLabel: string;
  title: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-[20px] border px-4 py-3",
        completed
          ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-50"
          : "border-white/10 bg-white/6 text-white",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] opacity-70">
          {progressLabel}
        </p>
      </div>
      <div
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-full border",
          completed
            ? "border-emerald-300/40 bg-emerald-300/12 text-emerald-100"
            : "border-white/10 bg-white/6 text-white/72",
        )}
      >
        <CheckCircle2 className="size-4" />
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function HistoryCard({
  description,
  locale,
  timestamp,
  value,
}: {
  description: string;
  locale: Locale;
  timestamp: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">{description}</p>
          <p className="mt-1 text-sm text-slate-500">
            {formatDateTime(timestamp, locale)}
          </p>
        </div>
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-900">
          {value}
        </div>
      </div>
    </div>
  );
}

function MessageCard({
  children,
  tone = "neutral",
}: {
  children: string;
  tone?: "neutral" | "error" | "success";
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border px-4 py-4 text-sm leading-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]",
        tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-950"
          : tone === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-950"
            : "border-slate-200 bg-white text-slate-700",
      )}
    >
      {children}
    </div>
  );
}

function getHistoryDescription(
  dictionary: Dictionary,
  entry: ActivitySummaryRecord["history"][number],
) {
  if (entry.sourceType === "check_in") {
    return dictionary.playPage.history.checkIn;
  }

  if (entry.sourceType === "tap_challenge") {
    return dictionary.playPage.history.tapChallenge;
  }

  if (entry.sourceMemberEmail) {
    return formatTemplate(dictionary.playPage.history.teamBonus, {
      email: entry.sourceMemberEmail,
      level: String(entry.level ?? 0),
    });
  }

  return dictionary.playPage.history.teamBonusFallback;
}

function formatTemplate(
  template: string,
  replacements: Record<string, string>,
) {
  return Object.entries(replacements).reduce((result, [key, value]) => {
    return result.replaceAll(`{${key}}`, value);
  }, template);
}

function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getTeamBonusScopeLabel(locale: Locale) {
  switch (locale) {
    case "ko":
      return "1~2단계";
    case "ja":
      return "1〜2段階";
    case "zh":
      return "1~2层";
    case "vi":
      return "Tầng 1-2";
    case "id":
      return "Level 1-2";
    case "en":
    default:
      return "Levels 1-2";
  }
}

function formatPlayCoins(
  value: number,
  locale: Locale,
  dictionary: Dictionary,
  options?: { signed?: boolean },
) {
  const formattedCount = new Intl.NumberFormat(locale).format(value);
  const isSingle = Math.abs(value) === 1;
  const template = options?.signed
    ? isSingle
      ? dictionary.playPage.currency.signedValueSingle
      : dictionary.playPage.currency.signedValuePlural
    : isSingle
      ? dictionary.playPage.currency.valueSingle
      : dictionary.playPage.currency.valuePlural;

  return formatTemplate(template, {
    count: formattedCount,
  });
}

function formatAddressLabel(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
