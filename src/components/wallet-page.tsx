"use client";

import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Coins,
  QrCode,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  WalletMinimal,
  X,
} from "lucide-react";
import { getContract } from "thirdweb";
import { transfer } from "thirdweb/extensions/erc20";
import {
  AutoConnect,
  TransactionButton,
  useActiveAccount,
  useActiveWallet,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
  useDisconnect,
  useWalletBalance,
} from "thirdweb/react";
import { toUnits } from "thirdweb/utils";
import { getUserEmail } from "thirdweb/wallets/in-app";

import { AnimatedNumberText } from "@/components/animated-number-text";
import { CopyTextButton } from "@/components/copy-text-button";
import { EmailLoginDialog } from "@/components/email-login-dialog";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LandingReveal } from "@/components/landing/landing-reveal";
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";
import {
  buildPathWithReferral,
  buildReferralLandingPath,
} from "@/lib/landing-branding";
import {
  MEMBER_SIGNUP_USDT_DECIMALS,
  type MemberRecord,
  type SyncMemberResponse,
} from "@/lib/member";
import { getLandingBrandingCopy } from "@/lib/landing-branding-copy";
import { type Dictionary, type Locale } from "@/lib/i18n";
import { getReferralLevelTheme } from "@/lib/referral-level-theme";
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
import { cn } from "@/lib/utils";
import type {
  WalletMemberLookupRecord,
  WalletRecipientSearchResponse,
  WalletTransferHistoryResponse,
  WalletTransferMutationRequest,
  WalletTransferRecord,
} from "@/lib/wallet";

type WalletNoticeTone = "info" | "success" | "error";

type WalletNotice = {
  href?: string;
  text: string;
  tone: WalletNoticeTone;
};

type WalletLoadStatus = "idle" | "loading" | "ready" | "error";

type WalletDashboardState = {
  email: string | null;
  history: WalletTransferRecord[];
  historyError: string | null;
  historyStatus: WalletLoadStatus;
  historyUpdatedAt: string | null;
  member: MemberRecord | null;
  memberError: string | null;
  memberStatus: WalletLoadStatus;
  memberUpdatedAt: string | null;
};

type RecipientSearchState = {
  error: string | null;
  results: WalletMemberLookupRecord[];
  status: "idle" | "loading" | "ready" | "error";
};

const HISTORY_LIMIT = 24;
const HISTORY_FETCH_TIMEOUT_MS = 10_000;
const MEMBER_FETCH_TIMEOUT_MS = 10_000;
const TRANSFER_MUTATION_TIMEOUT_MS = 10_000;
const usdtContract = getContract({
  address: BSC_USDT_ADDRESS,
  chain: smartWalletChain,
  client: thirdwebClient,
});

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function getLoadErrorMessage(error: unknown, fallbackMessage: string) {
  if (
    error instanceof Error &&
    (error.name === "AbortError" ||
      error.message.toLowerCase().includes("timed out"))
  ) {
    return fallbackMessage;
  }

  return error instanceof Error ? error.message : fallbackMessage;
}

export function WalletPage({
  dictionary,
  locale,
  referralCode = null,
}: {
  dictionary: Dictionary;
  locale: Locale;
  referralCode?: string | null;
}) {
  const brandingCopy = getLandingBrandingCopy(locale);
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const status = useActiveWalletConnectionStatus();
  const accountAddress = account?.address;
  const appMetadata = getAppMetadata(dictionary.meta.description);
  const { data: balance } = useWalletBalance(
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
  const [dashboard, setDashboard] = useState<WalletDashboardState>({
    email: null,
    history: [],
    historyError: null,
    historyStatus: "idle",
    historyUpdatedAt: null,
    member: null,
    memberError: null,
    memberStatus: "idle",
    memberUpdatedAt: null,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchState, setSearchState] = useState<RecipientSearchState>({
    error: null,
    results: [],
    status: "idle",
  });
  const [selectedRecipient, setSelectedRecipient] =
    useState<WalletMemberLookupRecord | null>(null);
  const [sendAmount, setSendAmount] = useState("");
  const [notice, setNotice] = useState<WalletNotice | null>(null);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const historyRetryTimeoutRef = useRef<number | null>(null);
  const syncInFlightRef = useRef(false);
  const syncVersionRef = useRef(0);
  const walletRefreshRequesterRef = useRef<(() => void) | null>(null);
  const connectedAccountUrl = accountAddress
    ? `${BSC_EXPLORER}/address/${accountAddress}`
    : BSC_EXPLORER;
  const currentEmail = dashboard.member?.email ?? dashboard.email;
  const isCompletedMember = dashboard.member?.status === "completed";
  const homeHref = buildReferralLandingPath(locale, referralCode);
  const bnbWalletHref = buildPathWithReferral(`/${locale}/wallet/bnb`, referralCode);
  const referralsHref = buildPathWithReferral(`/${locale}/referrals`, referralCode);
  const brandingStudioHref = buildPathWithReferral(
    `/${locale}/branding-studio`,
    referralCode,
  );

  const persistWalletTransfer = useCallback(
    async (payload: WalletTransferMutationRequest) => {
      const response = await fetchWithTimeout(
        "/api/wallet/usdt-history",
        {
          body: JSON.stringify(payload),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        },
        TRANSFER_MUTATION_TIMEOUT_MS,
      );
      const data = (await response.json()) as { error?: string; ok?: boolean };

      if (!response.ok) {
        throw new Error(
          data.error ?? dictionary.walletPage.errors.loadFailed,
        );
      }
    },
    [dictionary],
  );

  const runWalletSync = useCallback(
    async ({ background = false } = {}) => {
      if (!accountAddress || syncInFlightRef.current) {
        return;
      }

      syncInFlightRef.current = true;
      const syncVersion = syncVersionRef.current + 1;
      syncVersionRef.current = syncVersion;

      const setDashboardIfCurrent = (
        updater: SetStateAction<WalletDashboardState>,
      ) => {
        if (syncVersionRef.current !== syncVersion) {
          return;
        }

        setDashboard(updater);
      };

      if (historyRetryTimeoutRef.current !== null) {
        window.clearTimeout(historyRetryTimeoutRef.current);
        historyRetryTimeoutRef.current = null;
      }

      if (background) {
        setIsRefreshing(true);
      } else {
        setDashboard((current) => ({
          ...current,
          historyError: null,
          historyStatus: "loading",
          memberError: null,
          memberStatus: "loading",
        }));
      }

      try {
        const historyTask = (async () => {
          try {
            const historyResponse = await fetchWithTimeout(
              `/api/wallet/usdt-history?walletAddress=${encodeURIComponent(accountAddress)}&limit=${HISTORY_LIMIT}`,
              {},
              HISTORY_FETCH_TIMEOUT_MS,
            );
            const historyData = (await historyResponse.json()) as
              | WalletTransferHistoryResponse
              | { error?: string };

            if (!historyResponse.ok || !("transfers" in historyData)) {
              throw new Error(
                historyResponse.status === 400
                  ? dictionary.walletPage.errors.loadFailed
                  : "error" in historyData && historyData.error
                    ? historyData.error
                    : dictionary.walletPage.errors.loadFailed,
              );
            }

            if (historyData.syncing) {
              historyRetryTimeoutRef.current = window.setTimeout(() => {
                historyRetryTimeoutRef.current = null;
                walletRefreshRequesterRef.current?.();
              }, 3000);
            }

            setDashboardIfCurrent((current) => ({
              ...current,
              history: historyData.transfers,
              historyError: null,
              historyStatus:
                historyData.syncing && historyData.transfers.length === 0
                  ? "loading"
                  : "ready",
              historyUpdatedAt:
                historyData.syncing && historyData.transfers.length === 0
                  ? current.historyUpdatedAt
                  : new Date().toISOString(),
            }));
          } catch (error) {
            const message = getLoadErrorMessage(
              error,
              dictionary.walletPage.errors.loadFailed,
            );

            setDashboardIfCurrent((current) => {
              if (current.historyUpdatedAt || current.history.length > 0) {
                return {
                  ...current,
                  historyError: message,
                  historyStatus: "ready",
                };
              }

              return {
                ...current,
                history: [],
                historyError: message,
                historyStatus: "error",
                historyUpdatedAt: null,
              };
            });
          }
        })();

        const memberTask = (async () => {
          try {
            const email = await getUserEmail({ client: thirdwebClient });

            if (!email) {
              throw new Error(dictionary.walletPage.errors.missingEmail);
            }

            setDashboardIfCurrent((current) => ({
              ...current,
              email,
            }));

            const syncResponse = await fetchWithTimeout(
              "/api/members",
              {
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
              },
              MEMBER_FETCH_TIMEOUT_MS,
            );
            const syncData = (await syncResponse.json()) as
              | SyncMemberResponse
              | { error?: string };

            if (!syncResponse.ok) {
              throw new Error(
                "error" in syncData && syncData.error
                  ? syncData.error
                  : dictionary.walletPage.errors.loadFailed,
              );
            }

            if ("validationError" in syncData && syncData.validationError) {
              throw new Error(syncData.validationError);
            }

            setDashboardIfCurrent((current) => ({
              ...current,
              email,
              member: "member" in syncData ? syncData.member : null,
              memberError: null,
              memberStatus: "ready",
              memberUpdatedAt: new Date().toISOString(),
            }));
          } catch (error) {
            const message = getLoadErrorMessage(
              error,
              dictionary.walletPage.errors.loadFailed,
            );

            setDashboardIfCurrent((current) => {
              if (current.memberUpdatedAt || current.member || current.email) {
                return {
                  ...current,
                  memberError: message,
                  memberStatus: "ready",
                };
              }

              return {
                ...current,
                email: null,
                member: null,
                memberError: message,
                memberStatus: "error",
                memberUpdatedAt: null,
              };
            });
          }
        })();

        await Promise.allSettled([memberTask, historyTask]);
      } finally {
        syncInFlightRef.current = false;

        if (syncVersionRef.current === syncVersion) {
          setIsRefreshing(false);
        }
      }
    },
    [accountAddress, chain.id, chain.name, dictionary, locale],
  );

  useEffect(() => {
    walletRefreshRequesterRef.current = () => {
      void runWalletSync({ background: true });
    };

    return () => {
      walletRefreshRequesterRef.current = null;
    };
  }, [runWalletSync]);

  const runRecipientSearch = useCallback(
    async ({
      memberEmail,
      query,
      signal,
    }: {
      memberEmail: string;
      query: string;
      signal: AbortSignal;
    }) => {
      try {
        setSearchState((current) => ({
          ...current,
          error: null,
          status: "loading",
        }));
        const response = await fetch(
          `/api/members/search?memberEmail=${encodeURIComponent(
            memberEmail,
          )}&query=${encodeURIComponent(query)}`,
          { signal },
        );
        const data = (await response.json()) as
          | WalletRecipientSearchResponse
          | { error?: string };

        if (!response.ok || !("results" in data)) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : dictionary.walletPage.errors.searchFailed,
          );
        }

        setSearchState({
          error: null,
          results: data.results,
          status: "ready",
        });
      } catch (error) {
        if (signal.aborted) {
          return;
        }

        setSearchState({
          error:
            error instanceof Error
              ? error.message
              : dictionary.walletPage.errors.searchFailed,
          results: [],
          status: "error",
        });
      }
    },
    [dictionary],
  );

  useEffect(() => {
    return () => {
      if (historyRetryTimeoutRef.current !== null) {
        window.clearTimeout(historyRetryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!accountAddress) {
      setQrCodeUrl(null);
      return;
    }

    let isCancelled = false;

    void QRCode.toDataURL(accountAddress, {
      color: {
        dark: "#0f172a",
        light: "#f8fafc",
      },
      errorCorrectionLevel: "M",
      margin: 1,
      width: 360,
    })
      .then((url: string) => {
        if (!isCancelled) {
          setQrCodeUrl(url);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setQrCodeUrl(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [accountAddress]);

  useEffect(() => {
    if (status !== "connected") {
      syncVersionRef.current += 1;
      syncInFlightRef.current = false;
      if (historyRetryTimeoutRef.current !== null) {
        window.clearTimeout(historyRetryTimeoutRef.current);
        historyRetryTimeoutRef.current = null;
      }
      setIsLogoutDialogOpen(false);
      setIsRefreshing(false);
      setDashboard({
        email: null,
        history: [],
        historyError: null,
        historyStatus: "idle",
        historyUpdatedAt: null,
        member: null,
        memberError: null,
        memberStatus: "idle",
        memberUpdatedAt: null,
      });
      setNotice(null);
      setSearchQuery("");
      setSearchState({
        error: null,
        results: [],
        status: "idle",
      });
      setSelectedRecipient(null);
      setSendAmount("");
      return;
    }
  }, [status]);

  useEffect(() => {
    if (status === "connected") {
      setIsLoginDialogOpen(false);
    }
  }, [status]);

  useEffect(() => {
    if (status !== "connected" || !accountAddress || !hasThirdwebClientId) {
      return;
    }

    void runWalletSync();
  }, [accountAddress, chain.id, chain.name, locale, runWalletSync, status]);

  useEffect(() => {
    if (status !== "connected" || !accountAddress || !hasThirdwebClientId) {
      return;
    }

    const handleFocus = () => {
      void runWalletSync({ background: true });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void runWalletSync({ background: true });
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [accountAddress, runWalletSync, status]);

  useEffect(() => {
    const normalizedQuery = searchQuery.trim();

    if (
      status !== "connected" ||
      !accountAddress ||
      !currentEmail ||
      !hasThirdwebClientId ||
      normalizedQuery.length < 2
    ) {
      setSearchState({
        error: null,
        results: [],
        status: "idle",
      });
      return;
    }

    if (
      selectedRecipient &&
      normalizedQuery.toLowerCase() === selectedRecipient.email.toLowerCase()
    ) {
      setSearchState({
        error: null,
        results: [],
        status: "idle",
      });
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void runRecipientSearch({
        memberEmail: currentEmail,
        query: normalizedQuery,
        signal: controller.signal,
      });
    }, 220);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    accountAddress,
    currentEmail,
    runRecipientSearch,
    searchQuery,
    selectedRecipient,
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

  const formattedBalance = balance?.displayValue
    ? `${formatTokenDisplay(balance.displayValue, locale)} USDT`
    : "0 USDT";
  const isDisconnected = status !== "connected" || !accountAddress;
  const selectedRecipientAddress = selectedRecipient?.walletAddress
    ? normalizeAddress(selectedRecipient.walletAddress)
    : null;
  const isSelfTransfer =
    accountAddress && selectedRecipientAddress
      ? normalizeAddress(accountAddress) === selectedRecipientAddress
      : false;

  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_26%),radial-gradient(circle_at_88%_8%,rgba(13,148,136,0.18),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(245,158,11,0.14),transparent_28%)]" />
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
      <QrCodeDialog
        accountAddress={accountAddress}
        eyebrow={dictionary.walletPage.eyebrow}
        copyLabel={dictionary.common.copyAddress}
        copiedLabel={dictionary.common.copied}
        note={dictionary.walletPage.receiveNote}
        onClose={() => {
          setIsQrOpen(false);
        }}
        open={isQrOpen}
        qrCodeUrl={qrCodeUrl}
        title={dictionary.walletPage.labels.receive}
        unavailableLabel={dictionary.walletPage.notices.qrUnavailable}
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

      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <header className="glass-card flex flex-col gap-4 rounded-[28px] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              href={homeHref}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div className="space-y-1">
              <p className="eyebrow">{dictionary.walletPage.eyebrow}</p>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                  {dictionary.walletPage.title}
                </h1>
                <p className="text-sm text-slate-600">
                  {dictionary.walletPage.description}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
            <LanguageSwitcher
              label={dictionary.common.languageLabel}
              locale={locale}
            />
            <Link
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
              href={bnbWalletHref}
            >
              <Coins className="size-4" />
              {dictionary.bnbPage.title}
            </Link>
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
                  {dictionary.walletPage.disconnected}
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
            <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <LandingReveal delay={0} variant="hero">
                <section className="relative overflow-hidden rounded-[32px] border border-slate-900/90 bg-[linear-gradient(135deg,#0f172a_0%,#13233d_46%,#0f766e_100%)] p-5 text-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:p-6">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.16),transparent_28%)]" />
                  <div className="relative">
                    <div className="flex flex-wrap items-center gap-2">
                      <InfoBadge className="border-white/14 bg-white/10 text-white/85">
                        {dictionary.walletPage.labels.network}: BSC
                      </InfoBadge>
                      <InfoBadge className="border-white/14 bg-white/10 text-white/85">
                        {dictionary.walletPage.labels.asset}: USDT
                      </InfoBadge>
                      <InfoBadge className="border-emerald-400/20 bg-emerald-400/12 text-emerald-100">
                        {dictionary.walletPage.receiveNote}
                      </InfoBadge>
                    </div>

                    <div className="mt-8 space-y-2">
                      <p className="text-sm uppercase tracking-[0.26em] text-white/55">
                        {dictionary.walletPage.labels.availableBalance}
                      </p>
                      <AnimatedNumberText
                        className="text-4xl font-semibold tracking-tight sm:text-5xl"
                        locale={locale}
                        value={formattedBalance}
                      />
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <button
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/14"
                        onClick={() => {
                          setIsQrOpen(true);
                        }}
                        type="button"
                      >
                        <QrCode className="size-4" />
                        {dictionary.walletPage.actions.showQr}
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
                </section>
              </LandingReveal>

              <LandingReveal delay={80} variant="soft">
                <section className="glass-card rounded-[30px] p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="eyebrow">{dictionary.walletPage.eyebrow}</p>
                      <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                        {dictionary.walletPage.labels.memberAccount}
                      </h2>
                    </div>
                    <button
                      className="inline-flex size-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isRefreshing}
                      onClick={() => {
                        void runWalletSync({ background: true });
                      }}
                      type="button"
                    >
                      <RefreshCcw
                        className={cn("size-4", isRefreshing && "animate-spin")}
                      />
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <MetricCard
                      label={dictionary.walletPage.labels.memberAccount}
                      value={dashboard.member?.email ?? currentEmail ?? "-"}
                    />
                    <MetricCard
                      label={dictionary.walletPage.labels.memberStatus}
                      value={
                        dashboard.member
                          ? dashboard.member.status === "completed"
                            ? dictionary.member.completedValue
                            : dictionary.member.pendingValue
                          : "-"
                      }
                    />
                    <MetricCard
                      label={dictionary.walletPage.labels.walletAddress}
                      value={accountAddress ? formatAddressLabel(accountAddress) : "-"}
                    />
                    <MetricCard
                      label={dictionary.walletPage.labels.referralCode}
                      value={dashboard.member?.referralCode ?? "-"}
                    />
                  </div>

                    <div className="mt-4 rounded-[24px] border border-slate-200 bg-white/80 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                        {dictionary.walletPage.labels.updatedAt}
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-900">
                        {dashboard.memberUpdatedAt
                          ? formatDateTime(dashboard.memberUpdatedAt, locale)
                          : dashboard.memberStatus === "loading"
                            ? dictionary.walletPage.loading
                            : "-"}
                      </p>
                    </div>

                  {isCompletedMember ? (
                    <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
                      <Link
                        className="inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                        href={referralsHref}
                      >
                        {dictionary.member.actions.viewReferrals}
                      </Link>
                      <Link
                        className="inline-flex h-11 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
                        href={brandingStudioHref}
                      >
                        {brandingCopy.page.title}
                      </Link>
                    </div>
                  ) : null}

                  {dashboard.memberError ? (
                    <div className="mt-4">
                      <MessageCard tone="error">
                        {dashboard.memberError}
                      </MessageCard>
                    </div>
                  ) : null}
                </section>
              </LandingReveal>
            </section>

            <section className="grid gap-5 lg:grid-cols-[0.94fr_1.06fr]">
              <LandingReveal delay={120} variant="soft">
                <section className="glass-card rounded-[30px] p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <WalletMinimal className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="eyebrow">{dictionary.walletPage.eyebrow}</p>
                      <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                        {dictionary.walletPage.labels.receive}
                      </h2>
                      <p className="text-sm leading-6 text-slate-600">
                        {dictionary.walletPage.receiveNote}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.96))] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      {dictionary.walletPage.labels.walletAddress}
                    </p>
                    <p className="mt-3 break-all text-sm font-medium text-slate-950">
                      {accountAddress ?? "-"}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      {accountAddress ? (
                        <CopyTextButton
                          className="w-full sm:w-auto"
                          copiedLabel={dictionary.common.copied}
                          copyLabel={dictionary.common.copyAddress}
                          text={accountAddress}
                        />
                      ) : null}
                      <button
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                        onClick={() => {
                          setIsQrOpen(true);
                        }}
                        type="button"
                      >
                        <QrCode className="size-4" />
                        {dictionary.walletPage.actions.showQr}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[24px] border border-emerald-200 bg-emerald-50/80 px-4 py-4 text-sm leading-6 text-emerald-950">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                      <p>{dictionary.walletPage.receiveNote}</p>
                    </div>
                  </div>
                </section>
              </LandingReveal>

              <LandingReveal delay={180} variant="soft">
                <section className="glass-card rounded-[30px] p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <Send className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="eyebrow">{dictionary.walletPage.eyebrow}</p>
                      <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                        {dictionary.walletPage.labels.send}
                      </h2>
                      <p className="text-sm leading-6 text-slate-600">
                        {dictionary.walletPage.sendNote}
                      </p>
                    </div>
                  </div>

                  <label className="mt-5 block">
                    <span className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      {dictionary.walletPage.labels.recipient}
                    </span>
                    <div className="mt-2 flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                      <Search className="size-4 shrink-0 text-slate-400" />
                      <input
                        className="w-full min-w-0 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                        onChange={(event) => {
                          setSearchQuery(event.target.value);
                          setSelectedRecipient(null);
                        }}
                        placeholder={dictionary.walletPage.placeholders.searchMember}
                        type="text"
                        value={searchQuery}
                      />
                    </div>
                  </label>

                  {selectedRecipient ? (
                    <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50/90 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            {selectedRecipient.email}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {formatAddressLabel(selectedRecipient.walletAddress)}
                          </p>
                        </div>
                        <button
                          className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                          onClick={() => {
                            setSelectedRecipient(null);
                            setSearchQuery("");
                          }}
                          type="button"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <InfoBadge>
                          {selectedRecipient.status === "completed"
                            ? dictionary.member.completedValue
                            : dictionary.member.pendingValue}
                        </InfoBadge>
                        {selectedRecipient.level ? (
                          <InfoBadge
                            className={cn(
                              "bg-transparent",
                              getReferralLevelTheme(selectedRecipient.level)
                                .badgeClassName,
                            )}
                          >
                            {dictionary.referralsPage.labels.level}{" "}
                            {selectedRecipient.level}
                          </InfoBadge>
                        ) : null}
                        {selectedRecipient.referralCode ? (
                          <InfoBadge>
                            {dictionary.walletPage.labels.referralCode}:{" "}
                            {selectedRecipient.referralCode}
                          </InfoBadge>
                        ) : null}
                      </div>
                    </div>
                  ) : searchState.status === "loading" ? (
                    <div className="mt-4">
                      <MessageCard>{dictionary.walletPage.loading}</MessageCard>
                    </div>
                  ) : searchQuery.trim().length >= 2 ? (
                    <div className="mt-4 space-y-2">
                      {searchState.error ? (
                        <MessageCard tone="error">{searchState.error}</MessageCard>
                      ) : searchState.results.length === 0 ? (
                        <MessageCard>{dictionary.walletPage.searchEmpty}</MessageCard>
                      ) : (
                        searchState.results.map((result) => (
                          <button
                            className="flex w-full items-start justify-between gap-3 rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
                            key={`${result.email}:${result.walletAddress}`}
                            onClick={() => {
                              setSelectedRecipient(result);
                              setSearchQuery(result.email);
                              setSearchState({
                                error: null,
                                results: [],
                                status: "idle",
                              });
                            }}
                            type="button"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-950">
                                {result.email}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {formatAddressLabel(result.walletAddress)}
                              </p>
                            </div>
                            <div className="shrink-0">
                              <div className="flex flex-wrap justify-end gap-2">
                                <InfoBadge>
                                  {result.status === "completed"
                                    ? dictionary.member.completedValue
                                    : dictionary.member.pendingValue}
                                </InfoBadge>
                                {result.level ? (
                                  <InfoBadge
                                    className={cn(
                                      "bg-transparent",
                                      getReferralLevelTheme(result.level)
                                        .badgeClassName,
                                    )}
                                  >
                                    {dictionary.referralsPage.labels.level}{" "}
                                    {result.level}
                                  </InfoBadge>
                                ) : null}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}

                  <label className="mt-5 block">
                    <span className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      {dictionary.walletPage.labels.amount}
                    </span>
                    <div className="mt-2 flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-3 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                      <input
                        className="w-full min-w-0 bg-transparent text-lg font-semibold text-slate-950 outline-none placeholder:text-slate-400"
                        inputMode="decimal"
                        onChange={(event) => {
                          setSendAmount(event.target.value);
                        }}
                        placeholder={dictionary.walletPage.placeholders.amount}
                        type="text"
                        value={sendAmount}
                      />
                      <span className="text-sm font-medium text-slate-500">
                        USDT
                      </span>
                    </div>
                  </label>

                  <p className="mt-3 text-sm text-slate-600">
                    {dictionary.walletPage.labels.availableBalance}: {formattedBalance}
                  </p>

                  <div className="mt-5">
                    <TransactionButton
                      className="inline-flex h-12 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={
                        !accountAddress ||
                        !selectedRecipient ||
                        !sendAmount.trim() ||
                        isSelfTransfer
                      }
                      onError={(error) => {
                        setNotice({
                          text: error.message,
                          tone: "error",
                        });
                      }}
                      onTransactionConfirmed={(receipt) => {
                        const confirmedRecipient = selectedRecipient;
                        const confirmedAmount = sendAmount.trim();

                        if (
                          accountAddress &&
                          confirmedRecipient &&
                          confirmedAmount &&
                          /^\d+(\.\d+)?$/u.test(confirmedAmount)
                        ) {
                          const amountWei = toUnits(
                            confirmedAmount,
                            MEMBER_SIGNUP_USDT_DECIMALS,
                          ).toString();

                          void persistWalletTransfer({
                            action: "confirm_send",
                            amountWei,
                            fromWalletAddress: accountAddress,
                            toWalletAddress: confirmedRecipient.walletAddress,
                            transactionHash: receipt.transactionHash,
                          }).catch(() => {
                            // The history row stays pending until the next refresh retry.
                          });
                        }

                        setNotice({
                          href: `${BSC_EXPLORER}/tx/${receipt.transactionHash}`,
                          text: dictionary.walletPage.notices.txConfirmed,
                          tone: "success",
                        });
                        setSendAmount("");
                        window.setTimeout(() => {
                          void runWalletSync({ background: true });
                        }, 1800);
                      }}
                      onTransactionSent={(result) => {
                        const sentRecipient = selectedRecipient;
                        const sentAmount = sendAmount.trim();

                        if (
                          accountAddress &&
                          sentRecipient &&
                          sentAmount &&
                          /^\d+(\.\d+)?$/u.test(sentAmount)
                        ) {
                          const amountWei = toUnits(
                            sentAmount,
                            MEMBER_SIGNUP_USDT_DECIMALS,
                          ).toString();

                          void persistWalletTransfer({
                            action: "record_send",
                            amountWei,
                            fromWalletAddress: accountAddress,
                            toWalletAddress: sentRecipient.walletAddress,
                            transactionHash: result.transactionHash,
                          }).catch(() => {
                            // Keep the UI moving even if the history write fails.
                          });
                        }

                        setNotice({
                          href: `${BSC_EXPLORER}/tx/${result.transactionHash}`,
                          text: dictionary.walletPage.notices.txSent,
                          tone: "info",
                        });
                        window.setTimeout(() => {
                          void runWalletSync({ background: true });
                        }, 3200);
                      }}
                      transaction={() => {
                        if (!selectedRecipient) {
                          throw new Error(dictionary.walletPage.errors.selectRecipient);
                        }

                        const normalizedAmount = sendAmount.trim();

                        if (!normalizedAmount || !/^\d+(\.\d+)?$/u.test(normalizedAmount)) {
                          throw new Error(dictionary.walletPage.errors.invalidAmount);
                        }

                        const amountInUnits = toUnits(
                          normalizedAmount,
                          MEMBER_SIGNUP_USDT_DECIMALS,
                        );

                        if (amountInUnits <= BigInt(0)) {
                          throw new Error(dictionary.walletPage.errors.invalidAmount);
                        }

                        if (isSelfTransfer) {
                          throw new Error(dictionary.walletPage.errors.selfTransfer);
                        }

                        if (
                          typeof balance?.value === "bigint" &&
                          amountInUnits > balance.value
                        ) {
                          throw new Error(
                            dictionary.walletPage.errors.insufficientBalance,
                          );
                        }

                        return transfer({
                          amount: normalizedAmount,
                          contract: usdtContract,
                          to: selectedRecipient.walletAddress,
                        });
                      }}
                      type="button"
                      unstyled
                    >
                      {dictionary.walletPage.actions.send}
                    </TransactionButton>
                  </div>
                </section>
              </LandingReveal>
            </section>

            <LandingReveal delay={240} variant="soft">
              <section className="glass-card rounded-[30px] p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="eyebrow">{dictionary.walletPage.eyebrow}</p>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                      {dictionary.walletPage.labels.history}
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      {dictionary.walletPage.historyDescription}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {dashboard.historyUpdatedAt ? (
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                        {dictionary.walletPage.labels.updatedAt}{" "}
                        {formatDateTime(dashboard.historyUpdatedAt, locale)}
                      </p>
                    ) : null}
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isRefreshing}
                      onClick={() => {
                        void runWalletSync({ background: true });
                      }}
                      type="button"
                    >
                      <RefreshCcw
                        className={cn("size-4", isRefreshing && "animate-spin")}
                      />
                      {dictionary.walletPage.actions.refresh}
                    </button>
                  </div>
                </div>

                <div className="mt-5">
                  {dashboard.historyStatus === "loading" &&
                  dashboard.history.length === 0 ? (
                    <MessageCard>{dictionary.walletPage.loading}</MessageCard>
                  ) : dashboard.historyError && dashboard.history.length === 0 ? (
                    <MessageCard tone="error">
                      {dashboard.historyError}
                    </MessageCard>
                  ) : dashboard.history.length === 0 ? (
                    <MessageCard>{dictionary.walletPage.emptyHistory}</MessageCard>
                  ) : (
                    <div className="space-y-3">
                      {dashboard.historyError ? (
                        <MessageCard tone="error">
                          {dashboard.historyError}
                        </MessageCard>
                      ) : null}
                      {dashboard.history.map((transferRecord) => (
                        <HistoryRow
                          dictionary={dictionary}
                          key={`${transferRecord.transactionHash}:${transferRecord.logIndex}`}
                          locale={locale}
                          transfer={transferRecord}
                        />
                      ))}
                    </div>
                  )}
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
  notice: WalletNotice;
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

function HistoryRow({
  dictionary,
  locale,
  transfer,
}: {
  dictionary: Dictionary;
  locale: Locale;
  transfer: WalletTransferRecord;
}) {
  const isInbound = transfer.direction === "inbound";
  const directionLabel = isInbound
    ? dictionary.walletPage.labels.inbound
    : dictionary.walletPage.labels.outbound;
  const explorerUrl = `${BSC_EXPLORER}/tx/${transfer.transactionHash}`;
  const counterpartyLabel =
    transfer.counterparty?.email ?? formatAddressLabel(transfer.counterpartyWalletAddress);
  const amountValue = `${isInbound ? "+" : "-"}${formatTokenDisplay(transfer.amountDisplay, locale)} USDT`;
  const transferStatusLabel =
    transfer.status === "pending"
      ? dictionary.rewardsPage.redemptionStatus.pending
      : dictionary.rewardsPage.redemptionStatus.completed;

  return (
    <div className="rounded-[26px] border border-slate-200 bg-white/90 px-4 py-4 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
                isInbound
                  ? "bg-emerald-50 text-emerald-900"
                  : "bg-slate-100 text-slate-800",
              )}
            >
              {isInbound ? (
                <ArrowDownLeft className="size-3.5" />
              ) : (
                <ArrowUpRight className="size-3.5" />
              )}
              {directionLabel}
            </span>
            {transfer.counterparty?.status ? (
              <InfoBadge>
                {transfer.counterparty.status === "completed"
                  ? dictionary.member.completedValue
                  : dictionary.member.pendingValue}
              </InfoBadge>
            ) : null}
            <InfoBadge>{transferStatusLabel}</InfoBadge>
          </div>
          <p className="mt-3 truncate text-base font-semibold text-slate-950">
            {counterpartyLabel}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {formatAddressLabel(transfer.counterpartyWalletAddress)}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500">
            {formatDateTime(transfer.timestamp, locale)}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
          <p
            className={cn(
              "text-lg font-semibold tracking-tight",
              isInbound ? "text-emerald-700" : "text-slate-950",
            )}
          >
            {amountValue}
          </p>
          <a
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            href={explorerUrl}
            rel="noreferrer"
            target="_blank"
          >
            {dictionary.walletPage.actions.openExplorer}
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

function QrCodeDialog({
  accountAddress,
  eyebrow,
  copiedLabel,
  copyLabel,
  note,
  onClose,
  open,
  qrCodeUrl,
  title,
  unavailableLabel,
}: {
  accountAddress?: string;
  eyebrow: string;
  copiedLabel: string;
  copyLabel: string;
  note: string;
  onClose: () => void;
  open: boolean;
  qrCodeUrl: string | null;
  title: string;
  unavailableLabel: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/62 px-4 py-6 backdrop-blur-sm">
      <div className="glass-card w-full max-w-sm rounded-[32px] bg-white/96 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.24)] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              {title}
            </h2>
          </div>
          <button
            className="inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 rounded-[28px] border border-slate-200 bg-slate-50 px-4 py-4">
          {qrCodeUrl ? (
            <Image
              alt="Wallet QR code"
              className="mx-auto aspect-square w-full max-w-[260px] rounded-[20px] bg-white p-3"
              height={260}
              src={qrCodeUrl}
              unoptimized
              width={260}
            />
          ) : (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
              {unavailableLabel}
            </div>
          )}
        </div>

        <p className="mt-4 break-all text-sm font-medium text-slate-950">
          {accountAddress ?? "-"}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{note}</p>

        {accountAddress ? (
          <div className="mt-5">
            <CopyTextButton
              className="w-full"
              copiedLabel={copiedLabel}
              copyLabel={copyLabel}
              text={accountAddress}
            />
          </div>
        ) : null}
      </div>
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

function formatAddressLabel(address: string) {
  if (!address) {
    return "-";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
