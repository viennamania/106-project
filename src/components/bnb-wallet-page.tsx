"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Coins,
  RefreshCcw,
  WalletMinimal,
} from "lucide-react";
import { getAddress, isAddress, prepareTransaction } from "thirdweb";
import {
  AutoConnect,
  TransactionButton,
  useActiveAccount,
  useActiveWallet,
  useActiveWalletConnectionStatus,
  useDisconnect,
  useWalletBalance,
} from "thirdweb/react";

import { EmailLoginDialog } from "@/components/email-login-dialog";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";
import { type Dictionary, type Locale } from "@/lib/i18n";
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

type BnbNoticeTone = "info" | "success" | "error";

type BnbNotice = {
  href?: string;
  text: string;
  tone: BnbNoticeTone;
};

export function BnbWalletPage({
  dictionary,
  locale,
}: {
  dictionary: Dictionary;
  locale: Locale;
}) {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const {
    data: balance,
    error: balanceError,
    isFetching: isBalanceFetching,
    isLoading: isBalanceLoading,
    refetch: refetchBalance,
  } = useWalletBalance(
    {
      address: accountAddress,
      chain: smartWalletChain,
      client: thirdwebClient,
    },
    {
      refetchInterval: status === "connected" ? 5000 : false,
      refetchIntervalInBackground: true,
    },
  );
  const [destination, setDestination] = useState("");
  const [notice, setNotice] = useState<BnbNotice | null>(null);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  useEffect(() => {
    if (status === "connected") {
      setIsLoginDialogOpen(false);
      return;
    }

    setDestination("");
    setNotice(null);
  }, [status]);

  const trimmedDestination = destination.trim();
  const hasValidDestination = isAddress(trimmedDestination);
  const normalizedDestination = hasValidDestination
    ? getAddress(trimmedDestination)
    : null;
  const normalizedAccountAddress = accountAddress
    ? accountAddress.toLowerCase()
    : null;
  const isSelfTransfer =
    normalizedDestination !== null &&
    normalizedAccountAddress !== null &&
    normalizedDestination.toLowerCase() === normalizedAccountAddress;
  const balanceValue =
    typeof balance?.value === "bigint" ? balance.value : BigInt(0);
  const balanceSymbol = balance?.symbol ?? "BNB";
  const formattedBalance =
    balance?.displayValue !== undefined
      ? `${formatTokenDisplay(balance.displayValue, locale)} ${balanceSymbol}`
      : `0 ${balanceSymbol}`;
  const connectedAccountUrl = accountAddress
    ? `${BSC_EXPLORER}/address/${accountAddress}`
    : BSC_EXPLORER;
  const isDisconnected = status !== "connected" || !accountAddress;
  const balanceErrorMessage =
    balanceError instanceof Error
      ? balanceError.message
      : dictionary.bnbPage.errors.loadFailed;

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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.15),transparent_24%),radial-gradient(circle_at_88%_10%,rgba(37,99,235,0.12),transparent_22%),linear-gradient(180deg,#fbf7ef_0%,#f7f1e8_100%)]" />

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

      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <header className="glass-card flex flex-col gap-4 rounded-[28px] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              className="inline-flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              href={`/${locale}/wallet`}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div className="space-y-1">
              <p className="eyebrow">{dictionary.bnbPage.eyebrow}</p>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                  {dictionary.bnbPage.title}
                </h1>
                <p className="text-sm text-slate-600">
                  {dictionary.bnbPage.description}
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
                  {dictionary.bnbPage.disconnected}
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
        ) : (
          <>
            <LandingReveal delay={0} variant="soft">
              <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="relative overflow-hidden rounded-[32px] border border-slate-900/90 bg-[linear-gradient(135deg,#111827_0%,#1e293b_48%,#9a3412_100%)] p-5 text-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:p-6">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.14),transparent_28%)]" />
                  <div className="relative">
                    <div className="flex flex-wrap items-center gap-2">
                      <InfoBadge className="border-white/14 bg-white/10 text-white/85">
                        {dictionary.walletPage.labels.network}: BSC
                      </InfoBadge>
                      <InfoBadge className="border-white/14 bg-white/10 text-white/85">
                        BNB
                      </InfoBadge>
                    </div>

                    <div className="mt-8 space-y-2">
                      <p className="text-sm uppercase tracking-[0.26em] text-white/55">
                        {dictionary.bnbPage.labels.availableBalance}
                      </p>
                      <p className="text-4xl font-semibold tracking-tight sm:text-5xl">
                        {isBalanceLoading
                          ? dictionary.bnbPage.loading
                          : formattedBalance}
                      </p>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <button
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/14 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isBalanceFetching}
                        onClick={() => {
                          void refetchBalance();
                        }}
                        type="button"
                      >
                        <RefreshCcw
                          className={cn("size-4", isBalanceFetching && "animate-spin")}
                        />
                        {dictionary.walletPage.actions.refresh}
                      </button>
                      <a
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/18 bg-slate-50 px-4 text-sm font-medium !text-slate-950 shadow-[0_14px_34px_rgba(15,23,42,0.12)] transition hover:bg-white"
                        href={connectedAccountUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <span className="whitespace-nowrap !text-slate-950">
                          {dictionary.walletPage.actions.openExplorer}
                        </span>
                        <ArrowUpRight className="size-4 !text-slate-950" />
                      </a>
                    </div>

                    {notice ? (
                      <div className="mt-6">
                        <NoticeCard
                          actionLabel={dictionary.walletPage.actions.openExplorer}
                          notice={notice}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="glass-card rounded-[30px] p-5 sm:p-6">
                  <div className="space-y-1">
                    <p className="eyebrow">{dictionary.bnbPage.eyebrow}</p>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                      {dictionary.walletPage.labels.walletAddress}
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      {dictionary.bnbPage.notices.sendHint}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <MetricCard
                      label={dictionary.walletPage.labels.walletAddress}
                      value={accountAddress ?? "-"}
                    />
                    <MetricCard
                      label={dictionary.walletPage.labels.network}
                      value="BSC"
                    />
                    <MetricCard
                      label={dictionary.bnbPage.labels.sendableAmount}
                      value={formattedBalance}
                    />
                  </div>

                  {balanceError ? (
                    <div className="mt-4">
                      <MessageCard tone="error">{balanceErrorMessage}</MessageCard>
                    </div>
                  ) : null}
                </div>
              </section>
            </LandingReveal>

            <LandingReveal delay={80} variant="soft">
              <section className="glass-card rounded-[30px] p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <Coins className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="eyebrow">{dictionary.bnbPage.eyebrow}</p>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                      {dictionary.bnbPage.title}
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      {dictionary.bnbPage.description}
                    </p>
                  </div>
                </div>

                <label className="mt-5 block">
                  <span className="text-xs uppercase tracking-[0.22em] text-slate-500">
                    {dictionary.bnbPage.labels.destination}
                  </span>
                  <div className="mt-2 flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                    <WalletMinimal className="size-4 shrink-0 text-slate-400" />
                    <input
                      className="w-full min-w-0 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                      onChange={(event) => {
                        setDestination(event.target.value);
                      }}
                      placeholder={dictionary.bnbPage.placeholders.destination}
                      spellCheck={false}
                      type="text"
                      value={destination}
                    />
                  </div>
                </label>

                <div className="mt-4 rounded-[24px] border border-amber-200 bg-amber-50/80 px-4 py-4 text-sm leading-6 text-amber-950">
                  {dictionary.bnbPage.notices.sendHint}
                </div>

                {trimmedDestination ? (
                  <div className="mt-4">
                    {!hasValidDestination ? (
                      <MessageCard tone="error">
                        {dictionary.bnbPage.errors.invalidAddress}
                      </MessageCard>
                    ) : isSelfTransfer ? (
                      <MessageCard tone="error">
                        {dictionary.bnbPage.errors.selfTransfer}
                      </MessageCard>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-5 rounded-[24px] border border-slate-200 bg-white/90 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                    {dictionary.bnbPage.labels.sendableAmount}
                  </p>
                  <p className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                    {formattedBalance}
                  </p>
                </div>

                <div className="mt-5">
                  <TransactionButton
                    className="inline-flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={
                      !accountAddress ||
                      !hasValidDestination ||
                      isSelfTransfer ||
                      balanceValue <= BigInt(0)
                    }
                    onError={(error) => {
                      setNotice({
                        text: error.message,
                        tone: "error",
                      });
                    }}
                    onTransactionConfirmed={(receipt) => {
                      setNotice({
                        href: `${BSC_EXPLORER}/tx/${receipt.transactionHash}`,
                        text: dictionary.bnbPage.notices.txConfirmed,
                        tone: "success",
                      });
                      setDestination("");
                      void refetchBalance();
                    }}
                    onTransactionSent={(result) => {
                      setNotice({
                        href: `${BSC_EXPLORER}/tx/${result.transactionHash}`,
                        text: dictionary.bnbPage.notices.txSent,
                        tone: "info",
                      });
                    }}
                    transaction={() => {
                      if (!normalizedDestination) {
                        throw new Error(dictionary.bnbPage.errors.invalidAddress);
                      }

                      if (isSelfTransfer) {
                        throw new Error(dictionary.bnbPage.errors.selfTransfer);
                      }

                      if (balanceValue <= BigInt(0)) {
                        throw new Error(
                          dictionary.bnbPage.errors.insufficientBalance,
                        );
                      }

                      return prepareTransaction({
                        chain: smartWalletChain,
                        client: thirdwebClient,
                        to: normalizedDestination,
                        value: balanceValue,
                      });
                    }}
                    type="button"
                    unstyled
                  >
                    {dictionary.bnbPage.actions.sendAll}
                  </TransactionButton>
                </div>
              </section>
            </LandingReveal>
          </>
        )}
      </main>
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

function NoticeCard({
  actionLabel,
  notice,
}: {
  actionLabel: string;
  notice: BnbNotice;
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border px-4 py-4 text-sm",
        notice.tone === "error" &&
          "border-rose-300/60 bg-rose-400/12 text-rose-50",
        notice.tone === "success" &&
          "border-emerald-300/40 bg-emerald-400/12 text-emerald-50",
        notice.tone === "info" &&
          "border-sky-200/40 bg-white/10 text-white/80",
      )}
    >
      <p>{notice.text}</p>
      {notice.href ? (
        <a
          className="mt-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em]"
          href={notice.href}
          rel="noreferrer"
          target="_blank"
        >
          {actionLabel}
          <ArrowUpRight className="size-3.5" />
        </a>
      ) : null}
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

function formatAddressLabel(address: string) {
  if (!address) {
    return "-";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTokenDisplay(value: string, locale: string) {
  const [integerPartRaw, fractionPartRaw = ""] = value.split(".");
  const prefix = integerPartRaw.startsWith("-") ? "-" : "";
  const integerPart = prefix ? integerPartRaw.slice(1) : integerPartRaw;
  const formattedInteger = new Intl.NumberFormat(locale).format(
    BigInt(integerPart || "0"),
  );
  const trimmedFraction = fractionPartRaw.slice(0, 4).replace(/0+$/u, "");

  return `${prefix}${formattedInteger}${
    trimmedFraction ? `.${trimmedFraction}` : ""
  }`;
}
