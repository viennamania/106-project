"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Coins,
  RefreshCcw,
  Sparkles,
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

const BITHUMB_TRADE_URL = "https://www.bithumb.com/react/trade/order/BNB-KRW";
const BITHUMB_LOGO_URL =
  "https://www.bithumb.com/resources/img/comm/20171115_site_logo.png";

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
  const [market, setMarket] = useState<BnbMarketSnapshot | null>(null);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [isMarketFetching, setIsMarketFetching] = useState(false);
  const [destination, setDestination] = useState("");
  const [notice, setNotice] = useState<BnbNotice | null>(null);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

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

  useEffect(() => {
    if (status === "connected") {
      setIsLoginDialogOpen(false);
      return;
    }

    setMarket(null);
    setMarketError(null);
    setDestination("");
    setNotice(null);
  }, [status]);

  useEffect(() => {
    if (status !== "connected" || !hasThirdwebClientId) {
      return;
    }

    void loadMarket();
    const intervalId = window.setInterval(() => {
      void loadMarket();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadMarket, status]);

  const balanceSymbol = balance?.symbol ?? "BNB";
  const balanceValue =
    typeof balance?.value === "bigint" ? balance.value : BigInt(0);
  const formattedBalance =
    balance?.displayValue !== undefined
      ? `${formatTokenDisplay(balance.displayValue, locale)} ${balanceSymbol}`
      : `0 ${balanceSymbol}`;
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
  const parsedBalance =
    balance?.displayValue !== undefined
      ? Number.parseFloat(balance.displayValue)
      : 0;
  const bnbBalance = Number.isFinite(parsedBalance) ? parsedBalance : 0;
  const estimatedKrwValue = market ? bnbBalance * market.priceKrw : null;
  const formattedValuation =
    estimatedKrwValue !== null
      ? formatKrw(estimatedKrwValue, locale)
      : isBalanceLoading || isMarketFetching
        ? dictionary.bnbPage.loading
        : "-";
  const formattedSpotPrice = market
    ? formatKrw(market.priceKrw, locale)
    : isMarketFetching
      ? dictionary.bnbPage.loading
      : "-";
  const formattedDailyRange =
    market !== null
      ? `${formatKrw(market.low24hKrw, locale)} - ${formatKrw(
          market.high24hKrw,
          locale,
        )}`
      : "-";
  const changeIsPositive = (market?.change24hKrw ?? 0) >= 0;
  const formattedDailyChange =
    market !== null
      ? `${formatSignedKrw(market.change24hKrw, locale)} · ${formatSignedPercent(
          market.changeRate24h,
          locale,
        )}`
      : "-";
  const connectedAccountUrl = accountAddress
    ? `${BSC_EXPLORER}/address/${accountAddress}`
    : BSC_EXPLORER;
  const isDisconnected = status !== "connected" || !accountAddress;
  const balanceErrorMessage =
    balanceError instanceof Error
      ? balanceError.message
      : dictionary.bnbPage.errors.loadFailed;
  const isRefreshing = isBalanceFetching || isMarketFetching;

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

      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
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
            <LandingReveal delay={0} variant="hero">
              <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="relative overflow-hidden rounded-[32px] border border-slate-900/90 bg-[linear-gradient(135deg,#0b1220_0%,#172554_42%,#b45309_100%)] p-5 text-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:p-6">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.14),transparent_28%)]" />
                  <div className="relative">
                    <div className="flex flex-wrap items-center gap-2">
                      <InfoBadge className="border-white/18 bg-slate-950/28 text-white/92 shadow-[0_12px_30px_rgba(15,23,42,0.16)]">
                        {dictionary.bnbPage.labels.marketPair}: {market?.market ?? "BNB_KRW"}
                      </InfoBadge>
                      <InfoBadge className="border-white/18 bg-slate-950/28 text-white/92 shadow-[0_12px_30px_rgba(15,23,42,0.16)]">
                        {dictionary.bnbPage.labels.marketSource}: Bithumb
                      </InfoBadge>
                    </div>

                    <div className="mt-7 space-y-3">
                      <p className="text-sm uppercase tracking-[0.26em] text-white/55">
                        {dictionary.bnbPage.labels.valuation}
                      </p>
                      <div className="flex items-start gap-3">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/10 text-white/82">
                          <Sparkles className="size-5" />
                        </div>
                        <p className="text-[2.6rem] font-semibold tracking-tight text-white sm:text-[4.2rem]">
                          {formattedValuation}
                        </p>
                      </div>
                      <p className="max-w-2xl text-sm leading-6 text-white/68 sm:text-base">
                        {dictionary.bnbPage.notices.priceHint}
                      </p>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <div
                        className={cn(
                          "inline-flex items-center rounded-full border px-3 py-2 text-sm font-medium",
                          changeIsPositive
                            ? "border-emerald-300/50 bg-emerald-500/24 text-emerald-50 shadow-[0_14px_36px_rgba(16,185,129,0.18)]"
                            : "border-rose-300/50 bg-rose-500/24 text-rose-50 shadow-[0_14px_36px_rgba(244,63,94,0.18)]",
                        )}
                      >
                        {dictionary.bnbPage.labels.dailyChange}: {formattedDailyChange}
                      </div>
                      <button
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/40 bg-white px-4 text-sm font-semibold !text-slate-950 shadow-[0_18px_45px_rgba(255,255,255,0.16)] transition hover:bg-[#fff6d8] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isRefreshing}
                        onClick={() => {
                          void refetchBalance();
                          void loadMarket();
                        }}
                        type="button"
                      >
                        <RefreshCcw
                          className={cn("size-4", isRefreshing && "animate-spin")}
                        />
                        {dictionary.bnbPage.actions.refresh}
                      </button>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <HeroStatCard
                        label={dictionary.bnbPage.labels.availableBalance}
                        value={isBalanceLoading ? dictionary.bnbPage.loading : formattedBalance}
                      />
                      <HeroStatCard
                        label={dictionary.bnbPage.labels.spotPrice}
                        value={formattedSpotPrice}
                      />
                      <HeroStatCard
                        label={dictionary.bnbPage.labels.dailyRange}
                        value={formattedDailyRange}
                      />
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-[30px] p-5 sm:p-6">
                  <div className="space-y-1">
                    <p className="eyebrow">{dictionary.bnbPage.eyebrow}</p>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                      {dictionary.bnbPage.title}
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      {dictionary.bnbPage.description}
                    </p>
                  </div>

                  <a
                    className="mt-5 block overflow-hidden rounded-[28px] border border-[#f3ba2f]/20 bg-[linear-gradient(135deg,#fffaf2_0%,#fff1d6_100%)] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] transition hover:border-[#f3ba2f]/36 hover:shadow-[0_22px_55px_rgba(15,23,42,0.09)]"
                    href={BITHUMB_TRADE_URL}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#f3ba2f]/30 bg-white px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#7c2d12] shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                          <Image
                            alt="Bithumb logo"
                            className="h-4 w-auto object-contain"
                            height={16}
                            src={BITHUMB_LOGO_URL}
                            width={76}
                          />
                          Official
                        </div>
                        <p className="mt-4 text-lg font-semibold tracking-tight text-slate-950">
                          BNB/KRW
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {dictionary.bnbPage.notices.exchangeHint}
                        </p>
                      </div>
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#f3ba2f]/20 bg-slate-950 text-white">
                        <ArrowUpRight className="size-5" />
                      </div>
                    </div>
                  </a>

                  <div className="mt-5 grid gap-3">
                    <MetricCard
                      label={dictionary.bnbPage.labels.lastUpdated}
                      value={
                        market?.asOf
                          ? formatDateTime(market.asOf, locale)
                          : dictionary.bnbPage.loading
                      }
                    />
                    <MetricCard
                      label={dictionary.bnbPage.labels.marketSource}
                      value="Bithumb Public API"
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <a
                      className="inline-flex h-11 w-full items-center justify-between gap-2 rounded-full border border-slate-200 bg-slate-950 px-4 text-sm font-medium !text-white transition hover:bg-slate-800 sm:w-auto sm:justify-center"
                      href={connectedAccountUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span>{dictionary.walletPage.actions.openExplorer}</span>
                      <ArrowUpRight className="size-4" />
                    </a>
                    <a
                      className="inline-flex h-auto min-h-11 w-full items-center justify-between gap-3 rounded-full border border-[#f3ba2f]/40 bg-slate-950 px-4 py-2.5 text-sm font-semibold !text-white shadow-[0_18px_45px_rgba(15,23,42,0.12)] transition hover:bg-slate-800 sm:h-11 sm:w-auto sm:justify-center sm:py-0"
                      href={BITHUMB_TRADE_URL}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1">
                        <Image
                          alt="Bithumb logo"
                          className="h-4 w-auto object-contain"
                          height={16}
                          src={BITHUMB_LOGO_URL}
                          width={76}
                        />
                      </span>
                      <span className="min-w-0 text-left leading-5 sm:text-center">
                        {dictionary.bnbPage.actions.openBithumbTrade}
                      </span>
                      <ArrowUpRight className="size-4 shrink-0 sm:hidden" />
                    </a>
                  </div>
                </div>
              </section>
            </LandingReveal>

            {(balanceError || marketError) ? (
              <LandingReveal delay={80} variant="soft">
                <section className="grid gap-3">
                  {balanceError ? (
                    <MessageCard tone="error">{balanceErrorMessage}</MessageCard>
                  ) : null}
                  {marketError ? (
                    <MessageCard tone="error">{marketError}</MessageCard>
                  ) : null}
                </section>
              </LandingReveal>
            ) : null}

            <LandingReveal delay={120} variant="soft">
              <section className="glass-card rounded-[30px] p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <Coins className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="eyebrow">{dictionary.bnbPage.eyebrow}</p>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                      {dictionary.bnbPage.labels.valuation}
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      {dictionary.bnbPage.notices.priceHint}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-3">
                  <MarketMetricCard
                    label={dictionary.bnbPage.labels.availableBalance}
                    value={formattedBalance}
                  />
                  <MarketMetricCard
                    label={dictionary.bnbPage.labels.spotPrice}
                    value={formattedSpotPrice}
                  />
                  <MarketMetricCard
                    label={dictionary.bnbPage.labels.valuation}
                    value={formattedValuation}
                  />
                </div>

                <div className="mt-5 rounded-[28px] border border-[#f3ba2f]/16 bg-[linear-gradient(135deg,#111827_0%,#172554_48%,#9a3412_100%)] p-5 text-white shadow-[0_20px_55px_rgba(15,23,42,0.14)]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-slate-950/22 px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/88">
                        <Image
                          alt="Bithumb logo"
                          className="h-4 w-auto object-contain"
                          height={16}
                          src={BITHUMB_LOGO_URL}
                          width={76}
                        />
                        BNB/KRW
                      </div>
                      <p className="mt-4 text-lg font-semibold tracking-tight text-white">
                        {dictionary.bnbPage.actions.openBithumbTrade}
                      </p>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/68">
                        {dictionary.bnbPage.notices.exchangeHint}
                      </p>
                    </div>
                    <a
                      className="inline-flex h-auto min-h-12 w-full shrink-0 items-center justify-between gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold !text-slate-950 shadow-[0_18px_45px_rgba(255,255,255,0.12)] transition hover:bg-slate-100 sm:h-12 sm:w-auto sm:justify-center sm:py-0"
                      href={BITHUMB_TRADE_URL}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span>{dictionary.bnbPage.actions.openBithumbTrade}</span>
                      <ArrowUpRight className="size-4 shrink-0" />
                    </a>
                  </div>
                </div>
              </section>
            </LandingReveal>

            <LandingReveal delay={160} variant="soft">
              <section className="glass-card rounded-[30px] p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <WalletMinimal className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="eyebrow">{dictionary.bnbPage.eyebrow}</p>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                      {dictionary.bnbPage.actions.sendAll}
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      {dictionary.bnbPage.notices.sendHint}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                  <MetricCard
                    label={dictionary.bnbPage.labels.sendableAmount}
                    value={formattedBalance}
                  />
                  <label className="block">
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
                </div>

                <div className="mt-4 space-y-3">
                  <MessageCard tone="warning">
                    {dictionary.bnbPage.notices.destinationWarning}
                  </MessageCard>
                  <MessageCard tone="warning">
                    {dictionary.bnbPage.notices.bithumbRecommendation}
                  </MessageCard>
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

                {notice ? (
                  <div className="mt-4">
                    <NoticeCard
                      actionLabel={dictionary.walletPage.actions.openExplorer}
                      notice={notice}
                    />
                  </div>
                ) : null}

                <div className="mt-5">
                  <TransactionButton
                    className="inline-flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-semibold !text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 break-all text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function HeroStatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur">
      <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/55">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function MarketMetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/95 px-4 py-4 shadow-[0_16px_36px_rgba(15,23,42,0.04)]">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
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
  tone?: "error" | "neutral" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border px-4 py-4 text-sm leading-6 break-words",
        tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-950"
          : tone === "warning"
            ? "border-amber-200 bg-amber-50 text-amber-950"
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
          "border-rose-200 bg-rose-50 text-rose-950",
        notice.tone === "success" &&
          "border-emerald-200 bg-emerald-50 text-emerald-950",
        notice.tone === "info" &&
          "border-sky-200 bg-sky-50 text-sky-950",
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

function formatKrw(value: number, locale: Locale) {
  return new Intl.NumberFormat(toLocaleTag(locale), {
    currency: "KRW",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatSignedKrw(value: number, locale: Locale) {
  const absolute = formatKrw(Math.abs(value), locale);

  if (value > 0) {
    return `+${absolute}`;
  }

  if (value < 0) {
    return `-${absolute}`;
  }

  return absolute;
}

function formatSignedPercent(value: number, locale: Locale) {
  const absolute = new Intl.NumberFormat(toLocaleTag(locale), {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(Math.abs(value));

  if (value > 0) {
    return `+${absolute}%`;
  }

  if (value < 0) {
    return `-${absolute}%`;
  }

  return `${absolute}%`;
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
