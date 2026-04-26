"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Coins,
  RefreshCcw,
  ShieldCheck,
  WalletMinimal,
} from "lucide-react";
import {
  AutoConnect,
  useActiveAccount,
  useActiveWalletConnectionStatus,
  useWalletBalance,
} from "thirdweb/react";

import { CopyTextButton } from "@/components/copy-text-button";
import { EmailLoginDialog } from "@/components/email-login-dialog";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { getAssetManagementCopy } from "@/lib/asset-management-copy";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import type { Dictionary, Locale } from "@/lib/i18n";
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
import type {
  WalletTransferHistoryResponse,
  WalletTransferRecord,
} from "@/lib/wallet";
import { cn } from "@/lib/utils";

type BnbMarketSnapshot = {
  asOf: string;
  change24hKrw: number;
  changeRate24h: number;
  high24hKrw: number;
  low24hKrw: number;
  market: string;
  priceKrw: number;
  source: string;
};

type HistoryState = {
  error: string | null;
  status: "idle" | "loading" | "ready" | "error";
  transfers: WalletTransferRecord[];
};

export function AssetManagementPage({
  dictionary,
  locale,
  referralCode = null,
  returnTo = null,
}: {
  dictionary: Dictionary;
  locale: Locale;
  referralCode?: string | null;
  returnTo?: string | null;
}) {
  const copy = getAssetManagementCopy(locale);
  const account = useActiveAccount();
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const isDisconnected = status !== "connected" || !accountAddress;
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [market, setMarket] = useState<BnbMarketSnapshot | null>(null);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [isMarketFetching, setIsMarketFetching] = useState(false);
  const [history, setHistory] = useState<HistoryState>({
    error: null,
    status: "idle",
    transfers: [],
  });

  const {
    data: usdtBalance,
    isFetching: isUsdtFetching,
    isLoading: isUsdtLoading,
    refetch: refetchUsdtBalance,
  } = useWalletBalance(
    {
      address: accountAddress,
      chain: smartWalletChain,
      client: thirdwebClient,
      tokenAddress: BSC_USDT_ADDRESS,
    },
    {
      refetchInterval: status === "connected" ? 5000 : false,
      refetchIntervalInBackground: true,
    },
  );
  const {
    data: bnbBalance,
    isFetching: isBnbFetching,
    isLoading: isBnbLoading,
    refetch: refetchBnbBalance,
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

  const assetPageHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/activate/assets`, referralCode),
    {
      returnTo,
    },
  );
  const activateHref = buildPathWithReferral(`/${locale}/activate`, referralCode);
  const backHref = returnTo ?? activateHref;
  const usdtManagementHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/wallet`, referralCode),
    {
      returnTo: assetPageHref,
    },
  );
  const bnbManagementHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/wallet/bnb`, referralCode),
    {
      returnTo: assetPageHref,
    },
  );
  const connectedAccountUrl = accountAddress
    ? `${BSC_EXPLORER}/address/${accountAddress}`
    : BSC_EXPLORER;

  const loadMarket = useCallback(async () => {
    setIsMarketFetching(true);

    try {
      const response = await fetch("/api/market/bnb-krw", {
        cache: "no-store",
      });
      const payload = (await response.json()) as
        | BnbMarketSnapshot
        | { error?: string };

      if (!response.ok || !("priceKrw" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : dictionary.bnbPage.errors.marketFailed,
        );
      }

      setMarket(payload);
      setMarketError(null);
    } catch (error) {
      setMarketError(
        error instanceof Error
          ? error.message
          : dictionary.bnbPage.errors.marketFailed,
      );
    } finally {
      setIsMarketFetching(false);
    }
  }, [dictionary.bnbPage.errors.marketFailed]);

  const loadHistory = useCallback(async () => {
    if (!accountAddress) {
      return;
    }

    setHistory((current) => ({
      ...current,
      error: null,
      status: current.status === "ready" ? "ready" : "loading",
    }));

    try {
      const response = await fetch(
        `/api/wallet/usdt-history?walletAddress=${encodeURIComponent(
          accountAddress,
        )}&limit=3`,
        {
          cache: "no-store",
        },
      );
      const payload = (await response.json()) as
        | WalletTransferHistoryResponse
        | { error?: string };

      if (!response.ok || !("transfers" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : dictionary.walletPage.errors.loadFailed,
        );
      }

      setHistory({
        error: null,
        status: "ready",
        transfers: payload.transfers.slice(0, 3),
      });
    } catch (error) {
      setHistory({
        error:
          error instanceof Error
            ? error.message
            : dictionary.walletPage.errors.loadFailed,
        status: "error",
        transfers: [],
      });
    }
  }, [accountAddress, dictionary.walletPage.errors.loadFailed]);

  const refreshAssets = useCallback(() => {
    void refetchUsdtBalance();
    void refetchBnbBalance();
    void loadMarket();
    void loadHistory();
  }, [loadHistory, loadMarket, refetchBnbBalance, refetchUsdtBalance]);

  useEffect(() => {
    if (status === "connected") {
      setIsLoginDialogOpen(false);
      return;
    }

    setMarket(null);
    setMarketError(null);
    setHistory({
      error: null,
      status: "idle",
      transfers: [],
    });
  }, [status]);

  useEffect(() => {
    if (isDisconnected || !hasThirdwebClientId) {
      return;
    }

    void loadMarket();
    void loadHistory();
    const intervalId = window.setInterval(() => {
      void loadMarket();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isDisconnected, loadHistory, loadMarket]);

  const formattedUsdtBalance =
    usdtBalance?.displayValue !== undefined
      ? `${formatTokenDisplay(usdtBalance.displayValue, locale)} ${
          usdtBalance.symbol ?? "USDT"
        }`
      : `0 ${copy.usdt.label}`;
  const formattedBnbBalance =
    bnbBalance?.displayValue !== undefined
      ? `${formatTokenDisplay(bnbBalance.displayValue, locale)} ${
          bnbBalance.symbol ?? "BNB"
        }`
      : `0 ${copy.bnb.label}`;
  const parsedBnb =
    bnbBalance?.displayValue !== undefined
      ? Number.parseFloat(bnbBalance.displayValue)
      : 0;
  const bnbAmount = Number.isFinite(parsedBnb) ? parsedBnb : 0;
  const estimatedBnbKrw = market ? bnbAmount * market.priceKrw : null;
  const formattedBnbKrw =
    estimatedBnbKrw !== null ? formatKrw(estimatedBnbKrw, locale) : "-";
  const formattedSpotPrice = market ? formatKrw(market.priceKrw, locale) : "-";
  const updatedAt =
    market?.asOf ?? (history.status === "ready" ? new Date().toISOString() : null);
  const isRefreshing = isUsdtFetching || isBnbFetching || isMarketFetching;

  return (
    <div className="relative isolate overflow-hidden bg-slate-50/70">
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

      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-4 pb-28 pt-4 sm:gap-5 sm:px-6 sm:pb-8 sm:pt-6 lg:px-8">
        <header className="glass-card flex flex-col gap-3 rounded-[24px] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-start gap-3">
            <Link
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:size-12 sm:rounded-2xl"
              href={backHref}
            >
              <ArrowLeft className="size-4 sm:size-5" />
            </Link>
            <div className="min-w-0 space-y-1">
              <p className="eyebrow hidden sm:block">{copy.eyebrow}</p>
              <h1 className="truncate text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
                {copy.title}
              </h1>
              <p className="line-clamp-2 text-xs leading-5 text-slate-600 sm:text-sm">
                {copy.description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <StatusChip labels={dictionary.common.status} status={status} />
            <button
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:px-4"
              disabled={isRefreshing || isDisconnected}
              onClick={refreshAssets}
              type="button"
            >
              <RefreshCcw className={cn("size-4", isRefreshing && "animate-spin")} />
              <span className="hidden sm:inline">{copy.actions.refresh}</span>
            </button>
            {hasThirdwebClientId && isDisconnected ? (
              <button
                className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-medium text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 sm:h-11"
                onClick={() => {
                  setIsLoginDialogOpen(true);
                }}
                type="button"
              >
                {dictionary.common.connectWallet}
              </button>
            ) : null}
          </div>
        </header>

        {!hasThirdwebClientId ? (
          <MessageCard tone="warning">{dictionary.env.description}</MessageCard>
        ) : isDisconnected ? (
          <LandingReveal variant="soft">
            <section className="glass-card rounded-[24px] p-4 sm:p-6">
              <div className="space-y-4 rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <WalletMinimal className="size-5" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                    {copy.title}
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    {copy.disconnected}
                  </p>
                </div>
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
            </section>
          </LandingReveal>
        ) : (
          <>
            <LandingReveal variant="hero">
              <section className="overflow-hidden rounded-[24px] border border-slate-900 bg-[linear-gradient(145deg,#07111f_0%,#111827_54%,#0f766e_100%)] p-5 text-white shadow-[0_26px_70px_rgba(15,23,42,0.24)] sm:p-6">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/82">
                      <CheckCircle2 className="size-3.5" />
                      {copy.labels.network}: BSC
                    </div>
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.22em] text-white/55">
                        {copy.labels.estimatedValue}
                      </p>
                      <p className="mt-3 break-words text-[2rem] font-semibold leading-tight tracking-tight text-white sm:text-[2.85rem]">
                        {isUsdtLoading || isBnbLoading
                          ? copy.loading
                          : `${formattedUsdtBalance} + ${formattedBnbKrw}`}
                      </p>
                    </div>
                    <p className="max-w-2xl text-sm leading-6 text-white/72">
                      {copy.labels.totalOverview}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm sm:min-w-56">
                    <SummaryMetric
                      label={copy.labels.spotPrice}
                      value={isMarketFetching && !market ? copy.loading : formattedSpotPrice}
                    />
                    <SummaryMetric
                      label={copy.labels.lastUpdated}
                      value={updatedAt ? formatDateTime(updatedAt, locale) : copy.unavailable}
                    />
                  </div>
                </div>
              </section>
            </LandingReveal>

            <section className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="space-y-4">
                <SectionHeading
                  eyebrow={copy.eyebrow}
                  title={copy.labels.assets}
                />
                <div className="grid gap-3">
                  <AssetRow
                    actionHref={usdtManagementHref}
                    actionLabel={copy.actions.manageUsdt}
                    description={copy.usdt.description}
                    icon={<WalletMinimal className="size-5" />}
                    label={copy.usdt.label}
                    metricLabel={copy.usdt.metric}
                    metricValue={
                      isUsdtLoading ? dictionary.walletPage.loading : formattedUsdtBalance
                    }
                    tone="emerald"
                  />
                  <AssetRow
                    actionHref={bnbManagementHref}
                    actionLabel={copy.actions.manageBnb}
                    description={copy.bnb.description}
                    icon={<Coins className="size-5" />}
                    label={copy.bnb.label}
                    metricLabel={copy.bnb.metric}
                    metricValue={
                      isBnbLoading || isMarketFetching
                        ? dictionary.bnbPage.loading
                        : formattedBnbKrw
                    }
                    secondaryValue={formattedBnbBalance}
                    tone="amber"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <SectionHeading
                  eyebrow={copy.labels.account}
                  title={copy.labels.walletAddress}
                />
                <section className="rounded-[24px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)] sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <ShieldCheck className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <p className="text-sm font-semibold tracking-tight text-slate-950">
                          {copy.labels.walletAddress}
                        </p>
                        <p className="mt-1 break-all font-mono text-sm leading-6 text-slate-600">
                          {accountAddress}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <CopyTextButton
                          className="h-11 w-full justify-center rounded-2xl sm:w-auto"
                          copiedLabel={dictionary.common.copied}
                          copyLabel={dictionary.common.copyAddress}
                          text={accountAddress}
                        />
                        <a
                          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-950 px-4 text-sm font-medium !text-white transition hover:bg-slate-800 sm:w-auto"
                          href={connectedAccountUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {copy.actions.openExplorer}
                          <ArrowUpRight className="size-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <section className="rounded-[24px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)] sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">{copy.labels.recentActivity}</p>
                    <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
                      {dictionary.walletPage.labels.history}
                    </h2>
                  </div>
                  <Activity className="size-5 text-slate-400" />
                </div>

                <div className="mt-4 space-y-2">
                  {history.status === "loading" ? (
                    <MessageCard>{dictionary.walletPage.loading}</MessageCard>
                  ) : history.status === "error" ? (
                    <MessageCard tone="warning">
                      {history.error ?? dictionary.walletPage.errors.loadFailed}
                    </MessageCard>
                  ) : history.transfers.length === 0 ? (
                    <MessageCard>{copy.emptyHistory}</MessageCard>
                  ) : (
                    history.transfers.map((transfer) => (
                      <TransferRow
                        dictionary={dictionary}
                        key={`${transfer.transactionHash}:${transfer.logIndex}`}
                        locale={locale}
                        transfer={transfer}
                      />
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-slate-950 p-4 text-white shadow-[0_24px_65px_rgba(15,23,42,0.18)] sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/10">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold tracking-tight">
                      {copy.security.title}
                    </p>
                    <p className="text-sm leading-6 text-white/72">
                      {copy.security.description}
                    </p>
                  </div>
                </div>
                {marketError ? (
                  <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-50">
                    {marketError}
                  </div>
                ) : null}
              </section>
            </section>

            <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/94 px-4 py-3 shadow-[0_-18px_45px_rgba(15,23,42,0.12)] backdrop-blur sm:hidden">
              <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2">
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 text-sm font-semibold !text-white"
                  href={usdtManagementHref}
                >
                  <WalletMinimal className="size-4" />
                  {copy.actions.manageUsdt}
                </Link>
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950"
                  href={bnbManagementHref}
                >
                  <Coins className="size-4" />
                  {copy.actions.manageBnb}
                </Link>
              </div>
            </nav>
          </>
        )}
      </main>
    </div>
  );
}

function AssetRow({
  actionHref,
  actionLabel,
  description,
  icon,
  label,
  metricLabel,
  metricValue,
  secondaryValue,
  tone,
}: {
  actionHref: string;
  actionLabel: string;
  description: string;
  icon: ReactNode;
  label: string;
  metricLabel: string;
  metricValue: string;
  secondaryValue?: string;
  tone: "amber" | "emerald";
}) {
  return (
    <Link
      className="group block rounded-[24px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.07)] transition hover:border-slate-200 hover:bg-white sm:p-5"
      href={actionHref}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "inline-flex size-12 shrink-0 items-center justify-center rounded-2xl",
              tone === "emerald"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700",
            )}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight text-slate-950">
              {label}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {description}
            </p>
          </div>
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-slate-400 transition group-hover:text-slate-700" />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {metricLabel}
          </p>
          <p className="mt-1 break-words text-2xl font-semibold tracking-tight text-slate-950">
            {metricValue}
          </p>
          {secondaryValue ? (
            <p className="mt-1 text-sm font-medium text-slate-500">
              {secondaryValue}
            </p>
          ) : null}
        </div>
        <div className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-950">
          {actionLabel}
        </div>
      </div>
    </Link>
  );
}

function MessageCard({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] border px-4 py-3 text-sm leading-6 break-words",
        tone === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-950"
          : "border-slate-200 bg-slate-50 text-slate-600",
      )}
    >
      {children}
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
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
        {title}
      </h2>
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
        "inline-flex h-10 items-center gap-2 rounded-full border px-3 text-xs font-medium sm:h-11",
        status === "connected" &&
          "border-emerald-200 bg-emerald-50 text-emerald-900",
        status === "connecting" && "border-blue-200 bg-blue-50 text-blue-900",
        status === "unknown" && "border-slate-200 bg-slate-50 text-slate-700",
        status === "disconnected" && "border-slate-200 bg-white text-slate-700",
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

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/10 px-4 py-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/50">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

function TransferRow({
  dictionary,
  locale,
  transfer,
}: {
  dictionary: Dictionary;
  locale: Locale;
  transfer: WalletTransferRecord;
}) {
  const isInbound = transfer.direction === "inbound";
  const counterparty =
    transfer.counterparty?.email ??
    formatAddressLabel(transfer.counterpartyWalletAddress);

  return (
    <a
      className="block rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300 hover:bg-white"
      href={`${BSC_EXPLORER}/tx/${transfer.transactionHash}`}
      rel="noreferrer"
      target="_blank"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">
            {isInbound
              ? dictionary.walletPage.labels.inbound
              : dictionary.walletPage.labels.outbound}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">{counterparty}</p>
        </div>
        <div className="text-right">
          <p
            className={cn(
              "text-sm font-semibold",
              isInbound ? "text-emerald-700" : "text-slate-950",
            )}
          >
            {isInbound ? "+" : "-"}
            {formatTokenDisplay(transfer.amountDisplay, locale)} USDT
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatDateTime(transfer.timestamp, locale)}
          </p>
        </div>
      </div>
    </a>
  );
}

function formatAddressLabel(address: string) {
  if (!address) {
    return "-";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDateTime(value: string, locale: Locale) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(toLocaleTag(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatKrw(value: number, locale: Locale) {
  return new Intl.NumberFormat(toLocaleTag(locale), {
    currency: "KRW",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatTokenDisplay(value: string, locale: Locale) {
  const [integerPartRaw, fractionPartRaw = ""] = value.split(".");
  const prefix = integerPartRaw.startsWith("-") ? "-" : "";
  const integerPart = prefix ? integerPartRaw.slice(1) : integerPartRaw;
  const formattedInteger = new Intl.NumberFormat(toLocaleTag(locale)).format(
    BigInt(integerPart || "0"),
  );
  const trimmedFraction = fractionPartRaw.slice(0, 4).replace(/0+$/u, "");

  return `${prefix}${formattedInteger}${
    trimmedFraction ? `.${trimmedFraction}` : ""
  }`;
}

function toLocaleTag(locale: Locale) {
  if (locale === "ko") {
    return "ko-KR";
  }

  if (locale === "ja") {
    return "ja-JP";
  }

  if (locale === "zh") {
    return "zh-CN";
  }

  if (locale === "vi") {
    return "vi-VN";
  }

  if (locale === "id") {
    return "id-ID";
  }

  return "en-US";
}
