"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  Coins,
  Copy,
  ExternalLink,
  LayoutGrid,
  LoaderCircle,
  RefreshCcw,
  UserRound,
  WalletMinimal,
} from "lucide-react";
import {
  AutoConnect,
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";
import { getUserEmail } from "thirdweb/wallets/in-app";

import type {
  ContentSaleOrderRecord,
  ContentSalesDashboardResponse,
  ContentSellerWithdrawalResponse,
  CreatorProfileResponse,
} from "@/lib/content";
import { getContentCopy } from "@/lib/content-copy";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import type { Dictionary, Locale } from "@/lib/i18n";
import {
  BSC_EXPLORER,
  getAppMetadata,
  hasThirdwebClientId,
  smartWalletChain,
  smartWalletOptions,
  supportedWallets,
  thirdwebClient,
} from "@/lib/thirdweb";

type SalesPageState = {
  dashboard: ContentSalesDashboardResponse | null;
  error: string | null;
  notice: string | null;
  status: "idle" | "loading" | "ready" | "error";
};

function getSalesCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      balance: "판매용 지갑 잔고",
      buyer: "구매자",
      createWallet: "판매용 지갑 생성",
      creatingWallet: "지갑 생성 중",
      description:
        "유료 콘텐츠 결제 수익, 판매용 지갑 주소, 회수 상태를 한 곳에서 관리합니다.",
      emptyHistory: "아직 판매 내역이 없습니다.",
      history: "판매 내역",
      noWallet:
        "유료 콘텐츠를 판매하려면 thirdweb server wallet 기반 판매용 지갑이 필요합니다.",
      pending: "대기",
      sales: "판매 관리",
      submitted:
        "회수 트랜잭션을 전송했습니다. 온체인 반영 후 잔고가 갱신됩니다.",
      title: "판매 관리",
      totalSales: "누적 판매",
      verified: "확정",
      wallet: "판매용 지갑",
      walletReady: "판매용 지갑이 준비되었습니다.",
      withdraw: "잔고 회수하기",
      withdrawing: "회수 처리 중",
      withdrawTo: "회수 대상",
    };
  }

  return {
    balance: "Seller wallet balance",
    buyer: "Buyer",
    createWallet: "Create seller wallet",
    creatingWallet: "Creating wallet",
    description:
      "Manage paid content revenue, seller wallet address, and withdrawal status.",
    emptyHistory: "No sales yet.",
    history: "Sales history",
    noWallet:
      "Paid content sales require a thirdweb server wallet seller address.",
    pending: "Pending",
    sales: "Sales",
    submitted:
      "Withdrawal transaction was submitted. The balance will refresh after it lands onchain.",
    title: "Sales management",
    totalSales: "Total sales",
    verified: "Confirmed",
    wallet: "Seller wallet",
    walletReady: "Seller wallet is ready.",
    withdraw: "Withdraw balance",
    withdrawing: "Withdrawing",
    withdrawTo: "Withdraw to",
  };
}

function shortenAddress(address: string | null | undefined) {
  if (!address) {
    return "-";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDateTime(value: string, locale: Locale) {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatUsdt(value: string | null | undefined, locale: Locale) {
  const numericValue = Number(value ?? "0");

  if (!Number.isFinite(numericValue)) {
    return `${value ?? "0"} USDT`;
  }

  return `${numericValue.toLocaleString(locale, {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  })} USDT`;
}

function isPositiveWei(value: string | null | undefined) {
  try {
    return BigInt(value ?? "0") > BigInt(0);
  } catch {
    return false;
  }
}

export function CreatorStudioSalesPage({
  dictionary,
  locale,
  referralCode = null,
  returnToHref = null,
}: {
  dictionary: Dictionary;
  locale: Locale;
  referralCode?: string | null;
  returnToHref?: string | null;
}) {
  const contentCopy = getContentCopy(locale);
  const salesCopy = getSalesCopy(locale);
  const account = useActiveAccount();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const connectionStatus = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const studioHomeHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio`, referralCode),
    { returnTo: returnToHref },
  );
  const profileHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio/profile`, referralCode),
    { returnTo: returnToHref },
  );
  const newPostHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio/new`, referralCode),
    { returnTo: returnToHref },
  );
  const postsManagerHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio/posts`, referralCode),
    { returnTo: returnToHref },
  );
  const salesManagerHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/creator/studio/sales`, referralCode),
    { returnTo: returnToHref },
  );
  const activateHref = buildPathWithReferral(`/${locale}/activate`, referralCode);
  const [state, setState] = useState<SalesPageState>({
    dashboard: null,
    error: null,
    notice: null,
    status: "idle",
  });
  const [copied, setCopied] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [lastWithdrawal, setLastWithdrawal] =
    useState<ContentSellerWithdrawalResponse | null>(null);
  const isDisconnected = connectionStatus !== "connected" || !accountAddress;
  const canUseWorkspace =
    !isDisconnected && state.dashboard?.member.status === "completed";
  const hasSellerWallet = Boolean(state.dashboard?.sellerWalletAddress);
  const hasWithdrawableBalance = isPositiveWei(state.dashboard?.balance?.amountWei);

  const resolveMemberEmail = useCallback(async () => {
    const email = await getUserEmail({ client: thirdwebClient });

    if (!email) {
      throw new Error(dictionary.member.errors.missingEmail);
    }

    return email;
  }, [dictionary.member.errors.missingEmail]);

  const loadSales = useCallback(async () => {
    if (!accountAddress) {
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      status: "loading",
    }));

    try {
      const email = await resolveMemberEmail();
      const response = await fetch(
        `/api/content/sales?${new URLSearchParams({
          email,
          walletAddress: accountAddress,
        }).toString()}`,
      );
      const data = (await response.json()) as
        | ContentSalesDashboardResponse
        | { error?: string };

      if (!response.ok || !("summary" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : contentCopy.messages.studioLoadFailed,
        );
      }

      setState((current) => ({
        dashboard: data,
        error: null,
        notice: current.notice,
        status: "ready",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.studioLoadFailed,
        status: "error",
      }));
    }
  }, [accountAddress, contentCopy.messages.studioLoadFailed, resolveMemberEmail]);

  useEffect(() => {
    if (isDisconnected) {
      setState({
        dashboard: null,
        error: null,
        notice: null,
        status: "idle",
      });
      return;
    }

    void loadSales();
  }, [isDisconnected, loadSales]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCopied(false);
    }, 1800);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [copied]);

  async function createSellerWallet() {
    if (!accountAddress) {
      return;
    }

    try {
      setIsCreatingWallet(true);
      const email = await resolveMemberEmail();
      const response = await fetch("/api/content/profile/payout-wallet", {
        body: JSON.stringify({
          email,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as CreatorProfileResponse | {
        error?: string;
      };

      if (!response.ok || !("profile" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : contentCopy.messages.studioLoadFailed,
        );
      }

      setState((current) => ({
        ...current,
        error: null,
        notice: salesCopy.walletReady,
      }));
      await loadSales();
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.studioLoadFailed,
        notice: null,
      }));
    } finally {
      setIsCreatingWallet(false);
    }
  }

  async function copySellerWallet() {
    const walletAddress = state.dashboard?.sellerWalletAddress;

    if (!walletAddress) {
      return;
    }

    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function withdrawBalance() {
    if (!accountAddress || !hasWithdrawableBalance) {
      return;
    }

    try {
      setIsWithdrawing(true);
      setLastWithdrawal(null);
      const email = await resolveMemberEmail();
      const response = await fetch("/api/content/sales/withdraw", {
        body: JSON.stringify({
          email,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as
        | ContentSellerWithdrawalResponse
        | { error?: string };

      if (!response.ok || !("transactionId" in data)) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : contentCopy.messages.studioLoadFailed,
        );
      }

      setLastWithdrawal(data);
      setState((current) => ({
        ...current,
        error: null,
        notice: salesCopy.submitted,
      }));
      await loadSales();
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : contentCopy.messages.studioLoadFailed,
        notice: null,
      }));
    } finally {
      setIsWithdrawing(false);
    }
  }

  const tabs = [
    {
      href: studioHomeHref,
      isActive: false,
      label: contentCopy.labels.studioHome,
    },
    {
      href: profileHref,
      isActive: false,
      label: contentCopy.labels.creatorSettings,
    },
    {
      href: newPostHref,
      isActive: false,
      label: contentCopy.actions.createPost,
    },
    {
      href: postsManagerHref,
      isActive: false,
      label: contentCopy.actions.managePosts,
    },
    {
      href: salesManagerHref,
      isActive: true,
      label: salesCopy.sales,
    },
  ];
  const blockedState = isDisconnected ? (
    <MessageCard>{contentCopy.messages.connectRequired}</MessageCard>
  ) : state.status === "loading" && !state.dashboard ? (
    <MessageCard>{contentCopy.messages.postsLoading}</MessageCard>
  ) : state.error && state.dashboard?.member.status !== "completed" ? (
    <MessageCard tone="error">
      {state.error}
      <span className="mt-3 block">
        <Link className="font-semibold text-slate-950 underline" href={activateHref}>
          {dictionary.referralsPage.actions.completeSignup}
        </Link>
      </span>
    </MessageCard>
  ) : null;
  const dashboard = state.dashboard;
  const sales = dashboard?.sales ?? [];
  const balanceLabel = formatUsdt(dashboard?.balance?.amountUsdt ?? "0", locale);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      {hasThirdwebClientId ? (
        <AutoConnect
          accountAbstraction={smartWalletOptions}
          appMetadata={appMetadata}
          chain={chain}
          client={thirdwebClient}
          wallets={supportedWallets}
        />
      ) : null}

      <header className="relative overflow-hidden rounded-[28px] border border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.72),transparent_34%),radial-gradient(circle_at_right,rgba(254,240,138,0.34),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] px-4 py-4 shadow-[0_24px_60px_rgba(15,23,42,0.10)] sm:px-6 sm:py-5">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(148,163,184,0.6),transparent)]" />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <Link
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/92 text-slate-800 shadow-[0_14px_28px_rgba(15,23,42,0.10)] transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white sm:size-12"
                href={studioHomeHref}
              >
                <ArrowLeft className="size-4 sm:size-5" />
              </Link>
              <div className="min-w-0">
                <p className="eyebrow hidden sm:block">
                  {contentCopy.page.studioEyebrow}
                </p>
                <h1 className="text-[1.12rem] font-semibold tracking-tight text-slate-950 sm:text-[1.45rem]">
                  {salesCopy.title}
                </h1>
                <p className="mt-1 max-w-2xl text-[0.92rem] leading-6 text-slate-600 sm:text-sm">
                  {isDisconnected
                    ? contentCopy.messages.connectRequired
                    : state.status === "loading"
                      ? contentCopy.messages.postsLoading
                      : salesCopy.description}
                </p>
              </div>
            </div>
            <button
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-white/80 bg-white/92 px-4 text-sm font-semibold text-slate-950 shadow-[0_14px_28px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white"
              onClick={() => {
                void loadSales();
              }}
              type="button"
            >
              <RefreshCcw className="size-4" />
              <span className="hidden sm:inline">{contentCopy.actions.refresh}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <HeaderStatChip
              label={salesCopy.totalSales}
              loading={state.status === "loading" && !dashboard}
              value={formatUsdt(dashboard?.summary.totalSalesUsdt ?? "0", locale)}
            />
            <HeaderStatChip
              label={salesCopy.verified}
              loading={state.status === "loading" && !dashboard}
              value={String(dashboard?.summary.confirmedSalesCount ?? 0)}
            />
            <HeaderStatChip
              label={salesCopy.pending}
              loading={state.status === "loading" && !dashboard}
              value={String(dashboard?.summary.pendingSalesCount ?? 0)}
            />
            <HeaderStatChip
              label={salesCopy.balance}
              loading={state.status === "loading" && !dashboard}
              value={balanceLabel}
            />
          </div>
        </div>
      </header>

      <nav className="grid grid-cols-2 gap-2 sm:flex sm:gap-2 sm:overflow-x-auto sm:pb-1">
        {tabs.map((tab) => (
          <Link
            className={`inline-flex h-10 shrink-0 items-center justify-center rounded-full px-4 text-sm font-medium transition ${
              tab.isActive
                ? "border border-slate-950 bg-slate-950 !text-white shadow-[0_16px_36px_rgba(15,23,42,0.22)] [text-shadow:0_1px_12px_rgba(255,255,255,0.12)]"
                : "border border-slate-200 bg-white text-slate-950 hover:border-slate-300 hover:bg-slate-50"
            }`}
            href={tab.href}
            key={tab.href}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {blockedState ? (
        blockedState
      ) : (
        <section className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-5">
            <WalletManagementCard
              accountAddress={accountAddress ?? null}
              balanceLabel={balanceLabel}
              canCreateWallet={canUseWorkspace && !hasSellerWallet}
              canWithdraw={canUseWorkspace && hasWithdrawableBalance}
              copied={copied}
              isCreatingWallet={isCreatingWallet}
              isWithdrawing={isWithdrawing}
              onCopy={() => {
                void copySellerWallet();
              }}
              onCreateWallet={() => {
                void createSellerWallet();
              }}
              onWithdraw={() => {
                void withdrawBalance();
              }}
              salesCopy={salesCopy}
              walletAddress={dashboard?.sellerWalletAddress ?? null}
            />
            <div className="rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] p-5 shadow-[0_22px_55px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">{contentCopy.page.studioEyebrow}</p>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                    {contentCopy.labels.quickActions}
                  </h2>
                </div>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <LayoutGrid className="size-5" />
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                <WorkspaceSupportLink
                  description={contentCopy.page.newDescription}
                  disabled={!canUseWorkspace}
                  href={newPostHref}
                  icon={<Coins className="size-5" />}
                  title={contentCopy.actions.createPost}
                />
                <WorkspaceSupportLink
                  description={contentCopy.page.postsDescription}
                  disabled={!canUseWorkspace}
                  href={postsManagerHref}
                  icon={<LayoutGrid className="size-5" />}
                  title={contentCopy.actions.managePosts}
                />
                <WorkspaceSupportLink
                  description={contentCopy.page.profileDescription}
                  disabled={!canUseWorkspace}
                  href={profileHref}
                  icon={<UserRound className="size-5" />}
                  title={contentCopy.labels.creatorSettings}
                />
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {state.error ? <MessageCard tone="error">{state.error}</MessageCard> : null}
            {state.notice ? (
              <MessageCard tone="success">
                <span className="inline-flex items-center gap-2">
                  <Check className="size-4" />
                  {state.notice}
                </span>
                {lastWithdrawal?.transactionHash ? (
                  <a
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-slate-950 underline"
                    href={`${BSC_EXPLORER}/tx/${lastWithdrawal.transactionHash}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {shortenAddress(lastWithdrawal.transactionHash)}
                    <ExternalLink className="size-3.5" />
                  </a>
                ) : null}
              </MessageCard>
            ) : null}
            <SalesHistoryPanel
              locale={locale}
              sales={sales}
              salesCopy={salesCopy}
            />
          </div>
        </section>
      )}
    </main>
  );
}

function WalletManagementCard({
  accountAddress,
  balanceLabel,
  canCreateWallet,
  canWithdraw,
  copied,
  isCreatingWallet,
  isWithdrawing,
  onCopy,
  onCreateWallet,
  onWithdraw,
  salesCopy,
  walletAddress,
}: {
  accountAddress: string | null;
  balanceLabel: string;
  canCreateWallet: boolean;
  canWithdraw: boolean;
  copied: boolean;
  isCreatingWallet: boolean;
  isWithdrawing: boolean;
  onCopy: () => void;
  onCreateWallet: () => void;
  onWithdraw: () => void;
  salesCopy: ReturnType<typeof getSalesCopy>;
  walletAddress: string | null;
}) {
  return (
    <div className="rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] p-5 shadow-[0_22px_55px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">thirdweb server wallet</p>
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">
            {salesCopy.wallet}
          </h2>
        </div>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <WalletMinimal className="size-5" />
        </div>
      </div>

      {walletAddress ? (
        <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {salesCopy.wallet}
          </p>
          <p className="mt-2 break-all font-mono text-sm font-semibold text-slate-950">
            {walletAddress}
          </p>
          <button
            className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
            onClick={onCopy}
            type="button"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : (
        <MessageCard>{salesCopy.noWallet}</MessageCard>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {salesCopy.balance}
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            {balanceLabel}
          </p>
        </div>
        <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {salesCopy.withdrawTo}
          </p>
          <p className="mt-2 font-mono text-sm font-semibold text-slate-950">
            {shortenAddress(accountAddress)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canCreateWallet || isCreatingWallet}
          onClick={onCreateWallet}
          type="button"
        >
          {isCreatingWallet ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <WalletMinimal className="size-4" />
          )}
          {isCreatingWallet ? salesCopy.creatingWallet : salesCopy.createWallet}
        </button>
        <button
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canWithdraw || isWithdrawing}
          onClick={onWithdraw}
          type="button"
        >
          {isWithdrawing ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Coins className="size-4" />
          )}
          {isWithdrawing ? salesCopy.withdrawing : salesCopy.withdraw}
        </button>
      </div>
    </div>
  );
}

function SalesHistoryPanel({
  locale,
  sales,
  salesCopy,
}: {
  locale: Locale;
  sales: ContentSaleOrderRecord[];
  salesCopy: ReturnType<typeof getSalesCopy>;
}) {
  return (
    <div className="rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.93))] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{salesCopy.sales}</p>
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">
            {salesCopy.history}
          </h2>
        </div>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <Coins className="size-5" />
        </div>
      </div>

      {sales.length === 0 ? (
        <MessageCard>{salesCopy.emptyHistory}</MessageCard>
      ) : (
        <div className="mt-5 space-y-3">
          {sales.map((sale) => (
            <SaleHistoryItem
              key={sale.orderId}
              locale={locale}
              sale={sale}
              salesCopy={salesCopy}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SaleHistoryItem({
  locale,
  sale,
  salesCopy,
}: {
  locale: Locale;
  sale: ContentSaleOrderRecord;
  salesCopy: ReturnType<typeof getSalesCopy>;
}) {
  const statusLabel =
    sale.status === "confirmed" ? salesCopy.verified : salesCopy.pending;

  return (
    <article className="overflow-hidden rounded-[24px] border border-white/80 bg-white/94 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
      {sale.contentCoverImageUrl ? (
        <div className="h-36 border-b border-slate-200/80 bg-slate-900/90 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.28)), url(${sale.contentCoverImageUrl})`,
          }}
        />
      ) : null}
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={sale.status}>{statusLabel}</StatusBadge>
          <StatusBadge status="paid">{formatUsdt(sale.amountUsdt, locale)}</StatusBadge>
        </div>
        <h3 className="mt-3 text-base font-semibold tracking-tight text-slate-950">
          {sale.contentTitle}
        </h3>
        <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-600 sm:grid-cols-2">
          <p>
            <span className="font-semibold text-slate-900">{salesCopy.buyer}</span>{" "}
            {sale.buyerEmail}
          </p>
          <p>{formatDateTime(sale.verifiedAt ?? sale.createdAt, locale)}</p>
        </div>
        {sale.txHash ? (
          <a
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-950 underline"
            href={`${BSC_EXPLORER}/tx/${sale.txHash}`}
            rel="noreferrer"
            target="_blank"
          >
            {shortenAddress(sale.txHash)}
            <ExternalLink className="size-3.5" />
          </a>
        ) : null}
      </div>
    </article>
  );
}

function HeaderStatChip({
  label,
  loading = false,
  value,
}: {
  label: string;
  loading?: boolean;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/88 px-3 py-2 shadow-[0_12px_24px_rgba(15,23,42,0.06)] backdrop-blur">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-950">
        {loading ? "..." : value}
      </p>
    </div>
  );
}

function WorkspaceSupportLink({
  description,
  disabled,
  href,
  icon,
  title,
}: {
  description: string;
  disabled?: boolean;
  href: string;
  icon: ReactNode;
  title: string;
}) {
  if (disabled) {
    return (
      <div className="flex items-start gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-slate-400">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-300">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{title}</span>
          <span className="mt-1 block text-xs leading-5">{description}</span>
        </span>
      </div>
    );
  }

  return (
    <Link
      className="flex items-start gap-3 rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      href={href}
    >
      <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-950">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
    </Link>
  );
}

function StatusBadge({
  children,
  status,
}: {
  children: ReactNode;
  status: string;
}) {
  const className =
    status === "confirmed" || status === "paid"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status === "pending_payment"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] ${className}`}
    >
      {children}
    </span>
  );
}

function MessageCard({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "error" | "neutral" | "success";
}) {
  const className =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-slate-200 bg-white text-slate-600";

  return (
    <div className={`mt-4 rounded-[24px] border px-4 py-4 text-sm leading-6 ${className}`}>
      {children}
    </div>
  );
}
