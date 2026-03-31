"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useState, type ReactNode } from "react";
import { ArrowLeft, Users, WalletMinimal } from "lucide-react";
import {
  AutoConnect,
  ConnectButton,
  ConnectEmbed,
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { LanguageSwitcher } from "@/components/language-switcher";
import type {
  MemberReferralsResponse,
  MemberRecord,
  ReferralMemberRecord,
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
import { thirdwebLocales, type Dictionary, type Locale } from "@/lib/i18n";

type ReferralsState = {
  error: string | null;
  member: MemberRecord | null;
  referrals: ReferralMemberRecord[];
  status: "idle" | "loading" | "ready" | "error";
};

export function ReferralsPage({
  dictionary,
  locale,
}: {
  dictionary: Dictionary;
  locale: Locale;
}) {
  const account = useActiveAccount();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const [state, setState] = useState<ReferralsState>({
    error: null,
    member: null,
    referrals: [],
    status: "idle",
  });
  const referralLink = state.member?.referralCode
    ? getReferralLink(state.member.referralCode, locale)
    : null;

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
          member: null,
          referrals: [],
          status: "error",
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
          member: syncData.member,
          referrals: [],
          status: "ready",
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
        member: data.member,
        referrals: data.referrals,
        status: "ready",
      });
    } catch (error) {
      setState({
        error:
          error instanceof Error
            ? error.message
            : dictionary.referralsPage.errors.loadFailed,
        member: null,
        referrals: [],
        status: "error",
      });
    }
  }

  const syncAndLoadReferrals = useEffectEvent(async () => {
    await loadReferrals();
  });

  useEffect(() => {
    if (status !== "connected" || !accountAddress || !hasThirdwebClientId) {
      setState({
        error: null,
        member: null,
        referrals: [],
        status: "idle",
      });
      return;
    }

    void syncAndLoadReferrals();
  }, [accountAddress, status, locale, chain.id, chain.name]);

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_28%),radial-gradient(circle_at_85%_10%,rgba(15,118,110,0.2),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(249,115,22,0.14),transparent_26%)]" />

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
              <ConnectButton
                accountAbstraction={smartWalletOptions}
                appMetadata={appMetadata}
                chain={smartWalletChain}
                client={thirdwebClient}
                connectButton={{
                  className:
                    "!h-11 !rounded-full !border !border-slate-200 !bg-slate-950 !px-4 !text-sm !font-medium !text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)]",
                  label: dictionary.common.connectWallet,
                }}
                connectModal={{
                  title: dictionary.common.connectModalTitle,
                  titleIcon: "/favicon.ico",
                }}
                detailsButton={{
                  className:
                    "!h-11 !rounded-full !border !border-slate-200 !bg-white !px-4 !text-sm !font-medium !text-slate-950",
                }}
                detailsModal={{
                  showTestnetFaucet: false,
                }}
                locale={thirdwebLocales[locale]}
                theme="dark"
                wallets={supportedWallets}
              />
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
                  <ConnectEmbed
                    accountAbstraction={smartWalletOptions}
                    appMetadata={appMetadata}
                    chain={smartWalletChain}
                    client={thirdwebClient}
                    locale={thirdwebLocales[locale]}
                    modalSize="compact"
                    theme="dark"
                    wallets={supportedWallets}
                  />
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
                      <p className="mt-1 text-base font-semibold text-slate-950">
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
                    label={dictionary.referralsPage.labels.totalReferrals}
                    value={String(state.referrals.length)}
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
            ) : state.referrals.length === 0 ? (
              <MessageCard>{dictionary.referralsPage.empty}</MessageCard>
            ) : (
              <div className="space-y-3">
                {state.referrals.map((referral) => (
                  <article
                    className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
                    key={referral.email}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {referral.email}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {shortenAddress(referral.lastWalletAddress)}
                        </p>
                      </div>
                      <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                        <Users className="size-4" />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <InfoRow
                        label={dictionary.referralsPage.labels.locale}
                        value={referral.locale}
                      />
                      <InfoRow
                        label={dictionary.referralsPage.labels.lastWallet}
                        value={shortenAddress(referral.lastWalletAddress)}
                      />
                      <InfoRow
                        label={dictionary.referralsPage.labels.joinedAt}
                        value={formatDateTime(
                          referral.registrationCompletedAt,
                          locale,
                        )}
                      />
                      <InfoRow
                        label={dictionary.referralsPage.labels.lastConnectedAt}
                        value={formatDateTime(referral.lastConnectedAt, locale)}
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
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
      <p className="mt-2 font-medium text-slate-900">{value}</p>
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
        "rounded-[22px] border px-4 py-4 text-sm leading-6",
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

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
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

function getReferralLink(referralCode: string, locale: Locale) {
  const path = `/${locale}?ref=${encodeURIComponent(referralCode)}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!appUrl) {
    return path;
  }

  try {
    return new URL(path, appUrl).toString();
  } catch {
    return path;
  }
}
