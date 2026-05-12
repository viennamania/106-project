"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  Check,
  Coins,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircleHeart,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WalletCards,
  WalletMinimal,
} from "lucide-react";
import {
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { FanletterAccountStatusLink } from "@/components/fanletter-account-status-link";
import { FanletterGlobalLanguageSwitcher } from "@/components/fanletter-global-language-switcher";
import { useMemberSession } from "@/components/member-session-provider";
import {
  useWalletUnlockGate,
  WalletUnlockAction,
} from "@/components/wallet-unlock-gate";
import type {
  ContentSaleOrderRecord,
  ContentSalesDashboardResponse,
  ContentSellerWithdrawalResponse,
  CreatorProfileResponse,
} from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { syncServerMemberRegistration } from "@/lib/member-session-client";
import {
  BSC_EXPLORER,
  smartWalletChain,
  thirdwebClient,
} from "@/lib/thirdweb";
import {
  getThirdwebUserEmail,
  useThirdwebConnectionState,
} from "@/lib/thirdweb-client";

type SalesPageState = {
  dashboard: ContentSalesDashboardResponse | null;
  error: string | null;
  notice: string | null;
  status: "error" | "idle" | "loading" | "ready";
};

const FANLETTER_SALES_DISCONNECTED_GRACE_MS = 4500;
const SALES_PAGE_SIZE = 10;

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        actions: {
          back: "스튜디오",
          channels: "채널 배포",
          completeSignup: "시작 준비 완료하기",
          connect: "계정 연결",
          copied: "복사됨",
          copy: "복사",
          create: "새 브이로그 만들기",
          createWallet: "정산 주소 준비",
          creatingWallet: "정산 주소 준비 중",
          feed: "피드 보기",
          next: "다음",
          previous: "이전",
          refresh: "새로고침",
          unlock: "정산 기능 열기",
          withdraw: "잔고 회수하기",
          withdrawing: "회수 처리 중",
        },
        connectRequired:
          "FanLetter 계정을 연결하면 AI 캐릭터 브이로그 판매 내역을 확인할 수 있습니다.",
        description:
          "유료 브이로그 판매, 구매자 확인, 정산 가능 잔고, 회수 상태를 FanLetter 안에서 관리합니다.",
        emptyHistory:
          "아직 판매 내역이 없습니다. 유료 브이로그를 공개하면 구매 내역이 이곳에 표시됩니다.",
        eyebrow: "FanLetter Sales",
        labels: {
          balance: "정산 가능 잔고",
          buyer: "구매자",
          confirmed: "확정 판매",
          history: "판매 내역",
          page: "페이지",
          pending: "대기",
          sales: "판매",
          sellerWallet: "정산 주소",
          status: "판매 상태",
          totalSales: "누적 판매",
          wallet: "정산",
          withdrawTo: "회수 대상",
        },
        loading: "판매 내역을 불러오고 있습니다.",
        noWallet:
          "유료 브이로그 판매 수익을 받으려면 FanLetter 정산 주소가 필요합니다.",
        paymentRequired:
          "FanLetter 시작 준비 확인이 끝나면 판매 내역을 관리할 수 있습니다.",
        submitted:
          "회수 트랜잭션을 전송했습니다. 온체인 반영 후 잔고가 갱신됩니다.",
        title: "FanLetter 판매 내역",
        walletReady: "정산 주소가 준비되었습니다.",
      }
    : {
        actions: {
          back: "Studio",
          channels: "Channel distribution",
          completeSignup: "Complete signup",
          connect: "Connect account",
          copied: "Copied",
          copy: "Copy",
          create: "Create new vlog",
          createWallet: "Create settlement address",
          creatingWallet: "Creating settlement address",
          feed: "View feed",
          next: "Next",
          previous: "Previous",
          refresh: "Refresh",
          unlock: "Unlock settlement",
          withdraw: "Withdraw balance",
          withdrawing: "Withdrawing",
        },
        connectRequired:
          "Connect your FanLetter account to view AI character vlog sales.",
        description:
          "Manage paid vlog sales, buyers, settlement balance, and withdrawals inside FanLetter.",
        emptyHistory:
          "No sales yet. Paid vlog purchases will appear here after you publish paid content.",
        eyebrow: "FanLetter Sales",
        labels: {
          balance: "Settlement balance",
          buyer: "Buyer",
          confirmed: "Confirmed sales",
          history: "Sales history",
          page: "Page",
          pending: "Pending",
          sales: "Sales",
          sellerWallet: "Settlement address",
          status: "Sales status",
          totalSales: "Total sales",
          wallet: "Settlement",
          withdrawTo: "Withdraw to",
        },
        loading: "Loading sales.",
        noWallet:
          "Paid vlog sales require a FanLetter settlement address.",
        paymentRequired:
          "Confirm FanLetter readiness to manage sales.",
        submitted:
          "Withdrawal transaction was submitted. The balance will refresh after it lands onchain.",
        title: "FanLetter sales",
        walletReady: "Settlement address is ready.",
      };
}

function shortenAddress(address: string | null | undefined) {
  if (!address) {
    return "-";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
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

function normalizePageValue(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

function isPositiveWei(value: string | null | undefined) {
  try {
    return BigInt(value ?? "0") > BigInt(0);
  } catch {
    return false;
  }
}

async function readApiJson<T>(response: Response, fallback: string): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | T
    | null;
  const error =
    payload && typeof payload === "object" && "error" in payload
      ? payload.error
      : null;

  if (!response.ok || !payload) {
    throw new Error(error || fallback);
  }

  return payload as T;
}

function getSalesCountLabel(count: number, locale: Locale) {
  const formatted = formatNumber(count, locale);

  return locale === "ko" ? `${formatted}건` : `${formatted} sales`;
}

function getPageLabel(page: number, totalPages: number, locale: Locale) {
  return locale === "ko"
    ? `${page}/${Math.max(totalPages, 1)}페이지`
    : `Page ${page}/${Math.max(totalPages, 1)}`;
}

export function FanletterSalesPage({
  locale,
  referralCode,
}: {
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const searchParams = useSearchParams();
  const router = useRouter();
  const account = useActiveAccount();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const connectionStatus = useActiveWalletConnectionStatus();
  const memberSession = useMemberSession();
  const { updateMemberSession } = memberSession;
  const accountAddress = account?.address ?? null;
  const connection = useThirdwebConnectionState({
    accountAddress,
    disconnectedResolveGraceMs: FANLETTER_SALES_DISCONNECTED_GRACE_MS,
    resolveGraceMs: FANLETTER_SALES_DISCONNECTED_GRACE_MS,
    status: connectionStatus,
  });
  const appliedPage = normalizePageValue(searchParams.get("page"));
  const studioHref = buildPathWithReferral(
    `/${locale}/fanletter/studio`,
    referralCode,
  );
  const managerBaseHref = buildPathWithReferral(
    `/${locale}/fanletter/studio/sales`,
    referralCode,
  );
  const buildSalesHref = useCallback(
    (options?: { page?: number }) => {
      const page = options?.page ?? appliedPage;

      return setPathSearchParams(managerBaseHref, {
        page: page > 1 ? String(page) : null,
      });
    },
    [appliedPage, managerBaseHref],
  );
  const currentManagerHref = useMemo(() => buildSalesHref(), [buildSalesHref]);
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode),
    { returnTo: currentManagerHref },
  );
  const activateHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/activate`, referralCode),
    { returnTo: currentManagerHref },
  );
  const createHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/create`, referralCode),
    { returnTo: currentManagerHref },
  );
  const feedHref = buildPathWithReferral(`/${locale}/fanletter/feed`, referralCode);
  const channelsHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/channels`, referralCode),
    { returnTo: currentManagerHref },
  );
  const homeHref = buildPathWithReferral(`/${locale}/fanletter`, referralCode);
  const [email, setEmail] = useState<string | null>(memberSession.email);
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
  const dashboard = state.dashboard;
  const walletUnlock = useWalletUnlockGate({
    email: dashboard?.member.email ?? email ?? memberSession.email,
    locale,
    referralCode,
    returnTo: currentManagerHref,
    walletAddress: accountAddress,
  });
  const hasSellerWallet = Boolean(dashboard?.sellerWalletAddress);
  const hasWithdrawableBalance = isPositiveWei(dashboard?.balance?.amountWei);
  const canUseWorkspace =
    connectionStatus === "connected" && dashboard?.member.status === "completed";
  const isInitialLoading = state.status === "loading" && !dashboard;
  const balanceLabel = formatUsdt(dashboard?.balance?.amountUsdt ?? "0", locale);

  const resolveEmail = useCallback(async () => {
    const resolved =
      email ??
      memberSession.email ??
      (await getThirdwebUserEmail({ client: thirdwebClient }));

    if (!resolved) {
      throw new Error(copy.connectRequired);
    }

    setEmail(resolved);
    return resolved;
  }, [copy.connectRequired, email, memberSession.email]);

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
      const resolvedEmail = await resolveEmail();
      const params = new URLSearchParams({
        email: resolvedEmail,
        page: String(appliedPage),
        pageSize: String(SALES_PAGE_SIZE),
        walletAddress: accountAddress,
      });
      let response = await fetch(`/api/content/sales?${params.toString()}`, {
        cache: "no-store",
      });

      if (response.status === 404) {
        const syncData = await syncServerMemberRegistration({
          chainId: chain.id,
          chainName: chain.name ?? "BSC",
          email: resolvedEmail,
          locale,
          referredByCode: referralCode,
          syncMode: "light",
          walletAddress: accountAddress,
        });

        if (!syncData.ok) {
          throw new Error(syncData.error || copy.connectRequired);
        }

        if (syncData.member) {
          updateMemberSession({
            email: syncData.member.email,
            member: syncData.member,
            walletAddress: accountAddress,
          });
        }

        if (syncData.validationError) {
          throw new Error(syncData.validationError);
        }

        response = await fetch(`/api/content/sales?${params.toString()}`, {
          cache: "no-store",
        });
      }

      const data = await readApiJson<ContentSalesDashboardResponse>(
        response,
        copy.loading,
      );

      if (data.pageInfo.totalCount > 0 && data.pageInfo.totalPages < appliedPage) {
        router.replace(
          buildSalesHref({
            page: data.pageInfo.totalPages,
          }),
        );
        return;
      }

      if (data.pageInfo.totalCount === 0 && appliedPage > 1) {
        router.replace(buildSalesHref({ page: 1 }));
        return;
      }

      updateMemberSession({
        email: data.member.email,
        member: data.member,
        walletAddress: accountAddress,
      });
      setState((current) => ({
        dashboard: data,
        error: null,
        notice: current.notice,
        status: "ready",
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.loading;
      setState((current) => ({
        ...current,
        error:
          message === "Completed signup is required."
            ? copy.paymentRequired
            : message,
        status: "error",
      }));
    }
  }, [
    accountAddress,
    appliedPage,
    buildSalesHref,
    chain.id,
    chain.name,
    copy.connectRequired,
    copy.loading,
    copy.paymentRequired,
    locale,
    referralCode,
    resolveEmail,
    router,
    updateMemberSession,
  ]);

  useEffect(() => {
    if (connection.isResolving) {
      return;
    }

    if (connection.isDisconnected || connectionStatus !== "connected" || !accountAddress) {
      setState({
        dashboard: null,
        error: null,
        notice: null,
        status: "idle",
      });
      return;
    }

    void loadSales();
  }, [
    accountAddress,
    connection.isDisconnected,
    connection.isResolving,
    connectionStatus,
    loadSales,
  ]);

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
      const resolvedEmail = await resolveEmail();
      const response = await fetch("/api/content/profile/payout-wallet", {
        body: JSON.stringify({
          email: resolvedEmail,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      await readApiJson<CreatorProfileResponse>(response, copy.loading);
      setState((current) => ({
        ...current,
        error: null,
        notice: copy.walletReady,
      }));
      await loadSales();
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : copy.loading,
        notice: null,
      }));
    } finally {
      setIsCreatingWallet(false);
    }
  }

  async function copySellerWallet() {
    const walletAddress = dashboard?.sellerWalletAddress;

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

    if (!walletUnlock.isUnlocked) {
      setState((current) => ({
        ...current,
        error: walletUnlock.copy.unlockRequired,
      }));
      return;
    }

    try {
      setIsWithdrawing(true);
      setLastWithdrawal(null);
      const resolvedEmail = await resolveEmail();
      const response = await fetch("/api/content/sales/withdraw", {
        body: JSON.stringify({
          email: resolvedEmail,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = await readApiJson<ContentSellerWithdrawalResponse>(
        response,
        copy.loading,
      );

      setLastWithdrawal(data);
      setState((current) => ({
        ...current,
        error: null,
        notice: copy.submitted,
      }));
      await loadSales();
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : copy.loading,
        notice: null,
      }));
    } finally {
      setIsWithdrawing(false);
    }
  }

  function renderBlockedState() {
    if (connection.isResolving) {
      return <MessagePanel>{copy.loading}</MessagePanel>;
    }

    if (connection.isDisconnected || connectionStatus !== "connected" || !accountAddress) {
      return (
        <MessagePanel>
          {copy.connectRequired}
          <Link
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white"
            href={connectHref}
          >
            <WalletCards className="size-4" />
            {copy.actions.connect}
          </Link>
        </MessagePanel>
      );
    }

    const signupRequired =
      state.error === copy.paymentRequired ||
      (dashboard ? dashboard.member.status !== "completed" : false);

    if (signupRequired) {
      return (
        <MessagePanel tone="error">
          {state.error || copy.paymentRequired}
          <Link
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white"
            href={activateHref}
          >
            <ShieldCheck className="size-4" />
            {copy.actions.completeSignup}
          </Link>
        </MessagePanel>
      );
    }

    if (state.status === "error" && !dashboard) {
      return <MessagePanel tone="error">{state.error || copy.loading}</MessagePanel>;
    }

    return null;
  }

  const blockedState = renderBlockedState();
  const sales = dashboard?.sales ?? [];
  const pageInfo = dashboard?.pageInfo ?? null;

  return (
    <main className="min-h-screen bg-[#030504] text-white">
      <section className="px-4 pb-8 pt-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex items-center justify-between gap-3">
            <Link
              className="inline-flex size-11 items-center justify-center rounded-full border border-white/14 bg-white/[0.04] transition hover:bg-white/[0.08]"
              href={studioHref}
              title={copy.actions.back}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <Link className="flex min-w-0 items-center gap-2" href={homeHref}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <MessageCircleHeart className="size-5" />
              </span>
              <span className="truncate text-sm font-semibold tracking-normal">
                FanLetter
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <FanletterGlobalLanguageSwitcher
                className="hidden xl:inline-flex"
                locale={locale}
              />
              <FanletterAccountStatusLink
                locale={locale}
                referralCode={referralCode}
              />
              <button
                className="inline-flex size-11 items-center justify-center rounded-full border border-white/14 bg-white/[0.04] transition hover:bg-white/[0.08] disabled:opacity-50"
                disabled={isInitialLoading}
                onClick={() => {
                  void loadSales();
                }}
                title={copy.actions.refresh}
                type="button"
              >
                <RefreshCw
                  className={`size-5 ${isInitialLoading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </header>

          <div className="mt-4 flex xl:hidden">
            <FanletterGlobalLanguageSwitcher compact locale={locale} />
          </div>

          <div className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] lg:items-end lg:py-14">
            <div className="max-w-3xl">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#44f26e]">
                {copy.eyebrow}
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-normal sm:text-5xl">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-white/62">
                {copy.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#6cff89]"
                  href={createHref}
                >
                  <Plus className="size-4" />
                  {copy.actions.create}
                </Link>
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/[0.04] px-4 text-sm font-semibold !text-white transition hover:bg-white/[0.08]"
                  href={feedHref}
                >
                  <Sparkles className="size-4" />
                  {copy.actions.feed}
                </Link>
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/[0.04] px-4 text-sm font-semibold !text-white transition hover:bg-white/[0.08]"
                  href={channelsHref}
                >
                  <BadgeDollarSign className="size-4" />
                  {copy.actions.channels}
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <HeroMetric
                label={copy.labels.totalSales}
                loading={isInitialLoading}
                value={formatUsdt(dashboard?.summary.totalSalesUsdt, locale)}
              />
              <HeroMetric
                label={copy.labels.confirmed}
                loading={isInitialLoading}
                value={formatNumber(dashboard?.summary.confirmedSalesCount ?? 0, locale)}
              />
              <HeroMetric
                label={copy.labels.pending}
                loading={isInitialLoading}
                value={formatNumber(dashboard?.summary.pendingSalesCount ?? 0, locale)}
              />
              <HeroMetric
                label={copy.labels.balance}
                loading={isInitialLoading}
                value={balanceLabel}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f6f8f4] px-4 py-8 text-black sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(17rem,23rem)_minmax(0,1fr)] lg:items-start">
          <WalletPanel
            accountAddress={accountAddress}
            balanceLabel={balanceLabel}
            canCreateWallet={canUseWorkspace && !hasSellerWallet}
            canWithdraw={canUseWorkspace && hasWithdrawableBalance}
            copied={copied}
            copy={copy}
            isCreatingWallet={isCreatingWallet}
            isWalletUnlocked={walletUnlock.isUnlocked}
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
            unlockHref={walletUnlock.unlockHref}
            unlockLabel={walletUnlock.copy.unlockAction || copy.actions.unlock}
            walletAddress={dashboard?.sellerWalletAddress ?? null}
          />

          <div className="min-w-0">
            <section className="rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_42px_rgba(8,18,12,0.06)] sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#16702e]">
                    {copy.labels.sales}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-normal">
                    {copy.labels.history}
                  </h2>
                  {pageInfo ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusBadge status="paid">
                        {getSalesCountLabel(pageInfo.totalCount, locale)}
                      </StatusBadge>
                      <StatusBadge status="page">
                        {getPageLabel(pageInfo.page, pageInfo.totalPages, locale)}
                      </StatusBadge>
                    </div>
                  ) : null}
                </div>
                {state.notice ? (
                  <div className="inline-flex max-w-md flex-col rounded-lg border border-[#44f26e]/40 bg-[#44f26e]/12 px-3 py-2 text-sm font-semibold text-[#0c5f24]">
                    <span className="inline-flex items-center gap-2">
                      <Check className="size-4" />
                      {state.notice}
                    </span>
                    {lastWithdrawal?.transactionHash ? (
                      <a
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold underline"
                        href={`${BSC_EXPLORER}/tx/${lastWithdrawal.transactionHash}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {shortenAddress(lastWithdrawal.transactionHash)}
                        <ExternalLink className="size-3.5" />
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>

            {blockedState ? (
              <div className="mt-5">{blockedState}</div>
            ) : isInitialLoading ? (
              <SalesLoadingSkeleton />
            ) : state.error ? (
              <div className="mt-5">
                <MessagePanel tone="error">{state.error}</MessagePanel>
              </div>
            ) : sales.length === 0 ? (
              <div className="mt-5">
                <MessagePanel>{copy.emptyHistory}</MessagePanel>
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {sales.map((sale) => (
                  <SaleHistoryCard
                    copy={copy}
                    key={sale.orderId}
                    locale={locale}
                    sale={sale}
                  />
                ))}

                {pageInfo ? (
                  <div className="flex flex-col gap-3 border-t border-black/10 pt-4 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm font-semibold text-black/50">
                      {getSalesCountLabel(pageInfo.totalCount, locale)} ·{" "}
                      {getPageLabel(pageInfo.page, pageInfo.totalPages, locale)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {pageInfo.hasPreviousPage ? (
                        <Link
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-black transition hover:border-black/20 hover:bg-[#f6f8f4]"
                          href={buildSalesHref({
                            page: pageInfo.page - 1,
                          })}
                        >
                          <ArrowLeft className="size-4" />
                          {copy.actions.previous}
                        </Link>
                      ) : null}
                      {pageInfo.hasNextPage ? (
                        <Link
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-black transition hover:border-black/20 hover:bg-[#f6f8f4]"
                          href={buildSalesHref({
                            page: pageInfo.page + 1,
                          })}
                        >
                          {copy.actions.next}
                          <ArrowRight className="size-4" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroMetric({
  label,
  loading,
  value,
}: {
  label: string;
  loading: boolean;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/12 bg-white/[0.04] p-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/42">
        {label}
      </p>
      {loading ? (
        <div className="mt-4 h-8 w-16 rounded-full bg-white/10 motion-safe:animate-pulse" />
      ) : (
        <p className="mt-3 truncate text-3xl font-semibold tracking-normal text-white">
          {value}
        </p>
      )}
    </div>
  );
}

function WalletPanel({
  accountAddress,
  balanceLabel,
  canCreateWallet,
  canWithdraw,
  copied,
  copy,
  isCreatingWallet,
  isWalletUnlocked,
  isWithdrawing,
  onCopy,
  onCreateWallet,
  onWithdraw,
  unlockHref,
  unlockLabel,
  walletAddress,
}: {
  accountAddress: string | null;
  balanceLabel: string;
  canCreateWallet: boolean;
  canWithdraw: boolean;
  copied: boolean;
  copy: ReturnType<typeof getCopy>;
  isCreatingWallet: boolean;
  isWalletUnlocked: boolean;
  isWithdrawing: boolean;
  onCopy: () => void;
  onCreateWallet: () => void;
  onWithdraw: () => void;
  unlockHref: string;
  unlockLabel: string;
  walletAddress: string | null;
}) {
  return (
    <aside className="rounded-lg border border-black/10 bg-white p-5 shadow-[0_18px_42px_rgba(8,18,12,0.06)] lg:sticky lg:top-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#16702e]">
            {copy.labels.wallet}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">
            {copy.labels.sellerWallet}
          </h2>
        </div>
        <span className="flex size-11 items-center justify-center rounded-lg bg-black text-white">
          <WalletMinimal className="size-5" />
        </span>
      </div>

      {walletAddress ? (
        <div className="mt-5 rounded-lg border border-black/10 bg-[#f6f8f4] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/46">
            {copy.labels.sellerWallet}
          </p>
          <p className="mt-2 break-all font-mono text-sm font-semibold text-black">
            {walletAddress}
          </p>
          <button
            className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-black transition hover:border-black/20 hover:bg-white/70"
            onClick={onCopy}
            type="button"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? copy.actions.copied : copy.actions.copy}
          </button>
        </div>
      ) : (
        <MessagePanel>{copy.noWallet}</MessagePanel>
      )}

      <div className="mt-4 grid gap-3">
        <WalletMetric label={copy.labels.balance} value={balanceLabel} />
        <WalletMetric
          label={copy.labels.withdrawTo}
          value={shortenAddress(accountAddress)}
        />
      </div>

      <div className="mt-5 grid gap-2">
        <button
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-black transition hover:border-black/20 hover:bg-[#f6f8f4] disabled:cursor-not-allowed disabled:bg-black/[0.04] disabled:text-black/42"
          disabled={!canCreateWallet || isCreatingWallet}
          onClick={onCreateWallet}
          type="button"
        >
          {isCreatingWallet ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <WalletMinimal className="size-4" />
          )}
          {isCreatingWallet ? copy.actions.creatingWallet : copy.actions.createWallet}
        </button>
        {!isWalletUnlocked && canWithdraw ? (
          <WalletUnlockAction
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-black/82"
            href={unlockHref}
          >
            {unlockLabel}
          </WalletUnlockAction>
        ) : (
          <button
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-black/82 disabled:cursor-not-allowed disabled:bg-black/[0.08] disabled:!text-black/42"
            disabled={!canWithdraw || isWithdrawing}
            onClick={onWithdraw}
            type="button"
          >
            {isWithdrawing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Coins className="size-4" />
            )}
            {isWithdrawing ? copy.actions.withdrawing : copy.actions.withdraw}
          </button>
        )}
      </div>
    </aside>
  );
}

function WalletMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-[#f6f8f4] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/46">
        {label}
      </p>
      <p className="mt-2 break-all text-xl font-semibold tracking-normal text-black">
        {value}
      </p>
    </div>
  );
}

function SaleHistoryCard({
  copy,
  locale,
  sale,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  sale: ContentSaleOrderRecord;
}) {
  const statusLabel =
    sale.status === "confirmed" ? copy.labels.confirmed : copy.labels.pending;

  return (
    <article className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-[0_18px_42px_rgba(8,18,12,0.06)]">
      {sale.contentCoverImageUrl ? (
        <div
          className="h-40 border-b border-black/10 bg-black bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(3,5,4,0.08), rgba(3,5,4,0.34)), url(${sale.contentCoverImageUrl})`,
          }}
        />
      ) : null}
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={sale.status}>{statusLabel}</StatusBadge>
          <StatusBadge status="paid">{formatUsdt(sale.amountUsdt, locale)}</StatusBadge>
        </div>
        <h3 className="mt-3 text-xl font-semibold leading-tight tracking-normal text-black">
          {sale.contentTitle}
        </h3>
        <div className="mt-3 grid gap-2 text-sm font-medium leading-6 text-black/58 sm:grid-cols-2">
          <p>
            <span className="font-semibold text-black">{copy.labels.buyer}</span>{" "}
            {sale.buyerEmail}
          </p>
          <p>{formatDateTime(sale.verifiedAt ?? sale.createdAt, locale)}</p>
        </div>
        {sale.txHash ? (
          <a
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-black underline"
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

function StatusBadge({
  children,
  status,
}: {
  children: ReactNode;
  status: string;
}) {
  const className =
    status === "confirmed" || status === "paid"
      ? "border-[#44f26e]/42 bg-[#44f26e]/14 text-[#0c5f24]"
      : status === "pending_payment"
        ? "border-amber-300/60 bg-amber-100 text-amber-900"
        : "border-black/10 bg-black/[0.04] text-black/58";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] ${className}`}
    >
      {children}
    </span>
  );
}

function MessagePanel({
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
        ? "border-[#44f26e]/42 bg-[#44f26e]/14 text-[#0c5f24]"
        : "border-black/10 bg-white text-black/58";

  return (
    <div className={`rounded-lg border p-5 text-sm font-medium leading-6 ${className}`}>
      {children}
    </div>
  );
}

function SalesLoadingSkeleton() {
  return (
    <div className="mt-5 grid gap-3">
      {[0, 1, 2].map((item) => (
        <div
          className="h-44 animate-pulse rounded-lg border border-black/10 bg-white"
          key={item}
        />
      ))}
    </div>
  );
}
