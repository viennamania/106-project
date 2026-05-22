"use client";

import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpenCheck,
  Coins,
  Loader2,
  MessageCircleHeart,
  QrCode,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useActiveAccount,
  useActiveWalletConnectionStatus,
  useWalletBalance,
} from "thirdweb/react";

import { CopyTextButton } from "@/components/copy-text-button";
import { EmailLoginDialog } from "@/components/email-login-dialog";
import { FanletterGlobalLanguageSwitcher } from "@/components/fanletter-global-language-switcher";
import type { Dictionary, Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import {
  BSC_EXPLORER,
  BSC_USDT_ADDRESS,
  hasThirdwebClientId,
  smartWalletChain,
  thirdwebClient,
} from "@/lib/thirdweb";
import {
  getThirdwebUserEmail,
  useThirdwebConnectionState,
} from "@/lib/thirdweb-client";
import { cn } from "@/lib/utils";
import type {
  WalletTransferHistoryResponse,
  WalletTransferRecord,
} from "@/lib/wallet";

type FanletterWalletLoadStatus = "error" | "idle" | "loading" | "ready";

type FanletterWalletState = {
  email: string | null;
  error: string | null;
  history: WalletTransferRecord[];
  status: FanletterWalletLoadStatus;
  syncing: boolean;
  updatedAt: string | null;
};

type FanletterWalletService = "fanletter" | "news";

const HISTORY_LIMIT = 8;
const HISTORY_FETCH_TIMEOUT_MS = 10_000;
const FANLETTER_WALLET_DISCONNECTED_GRACE_MS = 4500;

function getCopy(locale: Locale, service: FanletterWalletService) {
  const copy = locale === "ko"
    ? {
        actions: {
          advanced: "전체 지갑 관리",
          back: "FanLetter",
          connect: "이메일로 지갑 연결",
          copy: "주소 복사",
          copied: "복사됨",
          explorer: "BscScan",
          purchases: "구매함 보기",
          refresh: "새로고침",
          returnTo: "이전 뉴스로 돌아가기",
          sales: "판매 정산",
          showQr: "입금 QR 보기",
          studio: "스튜디오",
        },
        balance: "사용 가능 USDT",
        bsc: "BSC",
        connectBody:
          "FanLetter 결제와 구매 내역은 연결된 이메일 스마트월렛 기준으로 관리합니다.",
        connectTitle: "지갑을 연결하면 FanLetter 결제 상태를 바로 볼 수 있습니다.",
        description:
          "팬 전용 콘텐츠 결제, 입금 주소, 최근 USDT 흐름, 크리에이터 정산 진입점을 FanLetter 안에서 확인합니다.",
        emptyHistory: "아직 표시할 USDT 입출금 내역이 없습니다.",
        eyebrow: "FanLetter Wallet",
        history: "최근 USDT 내역",
        historyBody:
          "구매 결제와 입금 흐름을 같은 지갑 기준으로 확인합니다.",
        loading: "지갑 정보를 확인하고 있습니다.",
        loginTitle: "FanLetter 지갑 연결",
        network: "네트워크",
        quickLinks: {
          purchases: "Fan-only",
          sales: "크리에이터 수익과 정산 주소 확인",
          studio: "유료 브이로그와 리포트 관리",
        },
        qrUnavailable: "QR을 만들지 못했습니다.",
        receive: "입금 주소",
        receiveNote:
          "BSC 네트워크의 USDT만 보내세요. 다른 네트워크 입금은 복구가 어려울 수 있습니다.",
        settlementBody:
          "크리에이터 수익은 별도 정산 주소에서 관리됩니다. 판매 정산 화면에서 정산 주소와 회수 상태를 확인하세요.",
        settlementTitle: "크리에이터 정산은 분리해서 관리합니다.",
        siteName: "FanLetter",
        title: "FanLetter 지갑 관리",
        updated: "업데이트",
        walletAddress: "지갑 주소",
      }
    : {
        actions: {
          advanced: "Full wallet",
          back: "FanLetter",
          connect: "Connect wallet with email",
          copy: "Copy address",
          copied: "Copied",
          explorer: "BscScan",
          purchases: "View purchases",
          refresh: "Refresh",
          returnTo: "Back to news",
          sales: "Sales settlement",
          showQr: "Show deposit QR",
          studio: "Studio",
        },
        balance: "Available USDT",
        bsc: "BSC",
        connectBody:
          "FanLetter payments and purchases are managed from your connected email smart wallet.",
        connectTitle: "Connect your wallet to see FanLetter payment status.",
        description:
          "Check fan-only payments, deposit address, recent USDT activity, and creator settlement entry points inside FanLetter.",
        emptyHistory: "No USDT activity to show yet.",
        eyebrow: "FanLetter Wallet",
        history: "Recent USDT activity",
        historyBody:
          "Review purchase payments and deposits from the same wallet basis.",
        loading: "Checking wallet information.",
        loginTitle: "Connect FanLetter wallet",
        network: "Network",
        quickLinks: {
          purchases: "Fan-only",
          sales: "Review creator revenue and settlement address",
          studio: "Manage paid vlogs and reports",
        },
        qrUnavailable: "Could not create QR.",
        receive: "Deposit address",
        receiveNote:
          "Send only USDT on BSC. Deposits from other networks may be unrecoverable.",
        settlementBody:
          "Creator revenue is handled through a separate settlement address. Check settlement address and withdrawals on the sales page.",
        settlementTitle: "Creator settlement is managed separately.",
        siteName: "FanLetter",
        title: "FanLetter wallet",
        updated: "Updated",
        walletAddress: "Wallet address",
      };

  if (service !== "news") {
    return copy;
  }

  return locale === "ko"
    ? {
        ...copy,
        actions: {
          ...copy.actions,
          back: "뉴스 홈",
          connect: "뉴스 지갑 연결",
          purchases: "뉴스 홈",
          sales: "가입 완료",
          studio: "AI 캐릭터",
        },
        connectBody:
          "FanLetter News의 AI 리포트, 공유자 정보, 팬 전용 브이로그 결제와 열람 내역을 같은 이메일 스마트월렛 기준으로 관리합니다.",
        connectTitle:
          "뉴스 지갑을 연결하면 FanLetter News 활동 상태를 바로 확인할 수 있습니다.",
        description:
          "뉴스 서비스에서 사용하는 이메일 지갑, USDT 잔액, 입금 주소, 최근 흐름과 가입 완료 진입점을 한곳에서 확인합니다.",
        eyebrow: "FanLetter News Wallet",
        history: "뉴스 지갑 USDT 내역",
        historyBody:
          "뉴스 기사와 팬 전용 브이로그에서 발생한 결제와 입금 흐름을 같은 지갑 기준으로 확인합니다.",
        loginTitle: "FanLetter News 지갑 연결",
        quickLinks: {
          purchases: "최신 AI 팬 리포트로 돌아가기",
          sales: "뉴스 계정 결제 확인과 활성화 진행",
          studio: "캐릭터별 뉴스와 팬 리포트 탐색",
        },
        settlementBody:
          "뉴스 계정 가입 완료와 결제 확인이 필요하면 뉴스 서비스 안에서 바로 이어서 진행합니다.",
        settlementTitle: "뉴스 계정 활성화 상태를 확인합니다.",
        siteName: "FanLetter News",
        title: "FanLetter News 지갑 관리",
      }
    : {
        ...copy,
        actions: {
          ...copy.actions,
          back: "News home",
          connect: "Connect news wallet",
          purchases: "News home",
          sales: "Verify signup",
          studio: "AI Characters",
        },
        connectBody:
          "Manage FanLetter News AI reports, sharer identity, fan-only vlog payments, and access from the same email smart wallet.",
        connectTitle:
          "Connect your news wallet to see FanLetter News activity status.",
        description:
          "Check the email wallet used for the news service, USDT balance, deposit address, recent activity, and signup verification entry points in one place.",
        eyebrow: "FanLetter News Wallet",
        history: "News wallet USDT activity",
        historyBody:
          "Review payments and deposits from news stories and fan-only vlogs on the same wallet basis.",
        loginTitle: "Connect FanLetter News wallet",
        quickLinks: {
          purchases: "Return to the latest AI fan reports",
          sales: "Verify news account payment and activation",
          studio: "Explore character news and fan reports",
        },
        settlementBody:
          "If signup completion or payment verification is required, continue directly inside the news service.",
        settlementTitle: "Check news account activation status.",
        siteName: "FanLetter News",
        title: "FanLetter News wallet",
      };
}

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

function formatAddressLabel(address?: string | null) {
  if (!address) {
    return "-";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTokenDisplay(value: string, locale: Locale) {
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

function getExplorerAddressUrl(address?: string | null) {
  return address ? `${BSC_EXPLORER}/address/${address}` : BSC_EXPLORER;
}

function getExplorerTxUrl(hash: string) {
  return `${BSC_EXPLORER}/tx/${hash}`;
}

function FanletterWalletMessage({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "error" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-4 text-sm font-medium leading-6",
        tone === "error"
          ? "border-red-300/20 bg-red-500/12 text-red-100"
          : "border-white/10 bg-white/[0.055] text-white/58",
      )}
    >
      {children}
    </div>
  );
}

function HistoryRow({
  copy,
  locale,
  transfer,
}: {
  copy: ReturnType<typeof getCopy>;
  locale: Locale;
  transfer: WalletTransferRecord;
}) {
  const isInbound = transfer.direction === "inbound";
  const amountValue = `${isInbound ? "+" : "-"}${formatTokenDisplay(
    transfer.amountDisplay,
    locale,
  )} USDT`;
  const counterpartyLabel =
    transfer.counterparty?.email ??
    formatAddressLabel(transfer.counterpartyWalletAddress);

  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                isInbound
                  ? "bg-[#44f26e] text-black"
                  : "border border-white/12 bg-white/8 text-white/68",
              )}
            >
              {isInbound ? (
                <ArrowDownLeft className="size-3.5" />
              ) : (
                <ArrowUpRight className="size-3.5" />
              )}
              {isInbound ? "IN" : "OUT"}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-white/42">
              {transfer.status}
            </span>
          </div>
          <p className="mt-3 truncate text-sm font-semibold text-white">
            {counterpartyLabel}
          </p>
          <p className="mt-1 text-xs font-medium text-white/42">
            {formatAddressLabel(transfer.counterpartyWalletAddress)}
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/32">
            {formatDateTime(transfer.timestamp, locale)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
          <p
            className={cn(
              "text-lg font-semibold",
              isInbound ? "text-[#44f26e]" : "text-white",
            )}
          >
            {amountValue}
          </p>
          <a
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-white/12 px-3 text-xs font-semibold !text-white transition hover:bg-white/8"
            href={getExplorerTxUrl(transfer.transactionHash)}
            rel="noreferrer"
            target="_blank"
          >
            {copy.actions.explorer}
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
}

export function FanletterWalletPage({
  dictionary,
  locale,
  referralCode,
  returnToHref,
  service = "fanletter",
}: {
  dictionary: Dictionary;
  locale: Locale;
  referralCode: string | null;
  returnToHref?: string | null;
  service?: FanletterWalletService;
}) {
  const account = useActiveAccount();
  const connectionStatus = useActiveWalletConnectionStatus();
  const accountAddress = account?.address ?? null;
  const copy = useMemo(() => getCopy(locale, service), [locale, service]);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [state, setState] = useState<FanletterWalletState>({
    email: null,
    error: null,
    history: [],
    status: "idle",
    syncing: false,
    updatedAt: null,
  });
  const retryTimeoutRef = useRef<number | null>(null);
  const syncVersionRef = useRef(0);
  const { data: balance } = useWalletBalance(
    {
      address: accountAddress ?? undefined,
      chain: smartWalletChain,
      client: thirdwebClient,
      tokenAddress: BSC_USDT_ADDRESS,
    },
    {
      refetchInterval: accountAddress ? 5000 : false,
      refetchIntervalInBackground: true,
    },
  );
  const { isDisconnected, isResolving } = useThirdwebConnectionState({
    accountAddress,
    clientConfigured: hasThirdwebClientId,
    disconnectedResolveGraceMs: FANLETTER_WALLET_DISCONNECTED_GRACE_MS,
    resolveGraceMs: FANLETTER_WALLET_DISCONNECTED_GRACE_MS,
    status: connectionStatus,
  });
  const formattedBalance = balance?.displayValue
    ? `${formatTokenDisplay(balance.displayValue, locale)} USDT`
    : "0 USDT";
  const isNewsService = service === "news";
  const walletPageHref = buildPathWithReferral(
    `/${locale}/fanletter${isNewsService ? "/news" : ""}/wallet`,
    referralCode,
  );
  const homeHref = buildPathWithReferral(
    `/${locale}/fanletter${isNewsService ? "/news" : ""}`,
    referralCode,
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter${isNewsService ? "/news" : ""}/connect`,
      referralCode,
    ),
    { returnTo: walletPageHref },
  );
  const purchasesHref = isNewsService
    ? homeHref
    : buildPathWithReferral(`/${locale}/fanletter/purchases`, referralCode);
  const salesHref = isNewsService
    ? setPathSearchParams(
        buildPathWithReferral(
          `/${locale}/fanletter/news/activate`,
          referralCode,
        ),
        { returnTo: walletPageHref },
      )
    : buildPathWithReferral(
        `/${locale}/fanletter/studio/sales`,
        referralCode,
      );
  const studioHref = isNewsService
    ? buildPathWithReferral(
        `/${locale}/fanletter/news/characters`,
        referralCode,
      )
    : buildPathWithReferral(`/${locale}/fanletter/studio`, referralCode);
  const advancedWalletHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/wallet`, referralCode),
    { returnTo: walletPageHref },
  );
  const backHref = returnToHref ?? homeHref;

  const loadWallet = useCallback(
    async ({ background = false } = {}) => {
      if (!accountAddress) {
        return;
      }

      const syncVersion = syncVersionRef.current + 1;
      syncVersionRef.current = syncVersion;

      if (retryTimeoutRef.current !== null) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
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
        const email = await getThirdwebUserEmail({ client: thirdwebClient }).catch(
          () => null,
        );
        const response = await fetchWithTimeout(
          `/api/wallet/usdt-history?walletAddress=${encodeURIComponent(
            accountAddress,
          )}&limit=${HISTORY_LIMIT}`,
          {},
          HISTORY_FETCH_TIMEOUT_MS,
        );
        const data = (await response.json().catch(() => null)) as
          | WalletTransferHistoryResponse
          | { error?: string }
          | null;

        if (!response.ok || !data || !("transfers" in data)) {
          throw new Error(
            data && "error" in data && data.error
              ? data.error
              : copy.loading,
          );
        }

        if (data.syncing) {
          retryTimeoutRef.current = window.setTimeout(() => {
            retryTimeoutRef.current = null;
            void loadWallet({ background: true });
          }, 3000);
        }

        if (syncVersionRef.current !== syncVersion) {
          return;
        }

        setState({
          email,
          error: null,
          history: data.transfers,
          status:
            data.syncing && data.transfers.length === 0 ? "loading" : "ready",
          syncing: Boolean(data.syncing),
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        const message = getLoadErrorMessage(error, copy.loading);

        if (syncVersionRef.current !== syncVersion) {
          return;
        }

        setState((current) => ({
          ...current,
          error: message,
          status: current.history.length > 0 ? "ready" : "error",
          syncing: false,
        }));
      } finally {
        if (syncVersionRef.current === syncVersion) {
          setIsRefreshing(false);
        }
      }
    },
    [accountAddress, copy.loading],
  );

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current !== null) {
        window.clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!accountAddress) {
      setQrCodeUrl(null);
      setState({
        email: null,
        error: null,
        history: [],
        status: "idle",
        syncing: false,
        updatedAt: null,
      });
      return;
    }

    let isCancelled = false;

    void QRCode.toDataURL(accountAddress, {
      color: {
        dark: "#030504",
        light: "#f6fff8",
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

    void loadWallet();

    return () => {
      isCancelled = true;
    };
  }, [accountAddress, loadWallet]);

  return (
    <main className="min-h-screen bg-[#030504] text-white">
      <EmailLoginDialog
        dictionary={dictionary}
        onClose={() => {
          setIsLoginDialogOpen(false);
        }}
        open={isLoginDialogOpen}
        title={copy.loginTitle}
        variant="fanletter"
      />

      <section className="px-4 pb-12 pt-[calc(env(safe-area-inset-top)+16px)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="flex items-center justify-between gap-3">
            <Link
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/[0.06] text-white transition hover:bg-white/10"
              href={backHref}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <Link className="flex min-w-0 items-center gap-2" href={homeHref}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <MessageCircleHeart className="size-5" />
              </span>
              <span className="truncate text-xl font-semibold tracking-normal">
                {copy.siteName}
              </span>
            </Link>
            <div className="hidden items-center gap-2 sm:flex">
              <FanletterGlobalLanguageSwitcher
                className="hidden lg:inline-flex"
                locale={locale}
              />
              <Link
                className="h-11 items-center justify-center rounded-full border border-white/16 px-4 text-sm font-semibold !text-white transition hover:border-white/36 sm:inline-flex"
                href={homeHref}
              >
                {copy.actions.back}
              </Link>
            </div>
            <span className="size-11 sm:hidden" />
          </header>

          <div className="mt-4 flex lg:hidden">
            <FanletterGlobalLanguageSwitcher compact locale={locale} />
          </div>

          <section className="grid gap-8 pb-10 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.78fr)] lg:items-end lg:pb-12 lg:pt-16">
            <div className="min-w-0">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#44f26e]">
                {copy.eyebrow}
              </p>
              <h1 className="mt-4 text-[2.35rem] font-semibold leading-[1.04] tracking-normal text-white [word-break:keep-all] sm:text-[3.85rem]">
                {copy.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/68 [word-break:keep-all] sm:text-lg">
                {copy.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#44f26e]/24 bg-[#44f26e]/10 px-3 py-1.5 text-xs font-semibold text-[#b9ffc8]">
                  <ShieldCheck className="size-3.5" />
                  {copy.network}: {copy.bsc}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.055] px-3 py-1.5 text-xs font-semibold text-white/58">
                  <Coins className="size-3.5" />
                  USDT
                </span>
                {returnToHref ? (
                  <Link
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.055] px-3 py-1.5 text-xs font-semibold !text-white/58 transition hover:bg-white/10 hover:!text-white"
                    href={returnToHref}
                  >
                    <ArrowLeft className="size-3.5" />
                    {copy.actions.returnTo}
                  </Link>
                ) : null}
              </div>
            </div>

            <aside className="rounded-lg border border-white/12 bg-white/[0.055] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.32)] backdrop-blur-md">
              <div className="flex items-start gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                  <WalletCards className="size-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/42">
                    {copy.balance}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                    {formattedBalance}
                  </p>
                  <p className="mt-2 break-all text-xs font-medium leading-5 text-white/46">
                    {accountAddress ?? copy.connectBody}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {isDisconnected ? (
                  <button
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold text-black transition hover:bg-[#67ff88]"
                    onClick={() => {
                      setIsLoginDialogOpen(true);
                    }}
                    type="button"
                  >
                    {copy.actions.connect}
                  </button>
                ) : (
                  <button
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold text-black transition hover:bg-[#67ff88] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isRefreshing}
                    onClick={() => {
                      void loadWallet({ background: true });
                    }}
                    type="button"
                  >
                    <RefreshCw
                      className={cn("size-4", isRefreshing && "animate-spin")}
                    />
                    {copy.actions.refresh}
                  </button>
                )}
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/16 px-4 text-sm font-semibold !text-white transition hover:bg-white/8"
                  href={advancedWalletHref}
                >
                  {copy.actions.advanced}
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </aside>
          </section>

          {!hasThirdwebClientId ? (
            <FanletterWalletMessage tone="error">
              {dictionary.common.clientIdRequired}
            </FanletterWalletMessage>
          ) : isResolving ? (
            <FanletterWalletMessage>{copy.loading}</FanletterWalletMessage>
          ) : isDisconnected ? (
            <section className="rounded-lg border border-white/12 bg-white/[0.055] p-5">
              <WalletCards className="size-8 text-[#44f26e]" />
              <h2 className="mt-4 text-2xl font-semibold">
                {copy.connectTitle}
              </h2>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-white/58">
                {copy.connectBody}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold text-black transition hover:bg-[#67ff88]"
                  onClick={() => {
                    setIsLoginDialogOpen(true);
                  }}
                  type="button"
                >
                  {copy.actions.connect}
                </button>
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/16 px-4 text-sm font-semibold !text-white transition hover:bg-white/8"
                  href={connectHref}
                >
                  {copy.actions.connect}
                </Link>
              </div>
            </section>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <section className="rounded-lg border border-white/12 bg-white/[0.055] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#44f26e]">
                      {copy.receive}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">
                      {copy.walletAddress}
                    </h2>
                  </div>
                  <QrCode className="size-8 text-[#44f26e]" />
                </div>

                <div className="mt-5 rounded-lg border border-[#44f26e]/18 bg-[#44f26e]/8 p-4">
                  {qrCodeUrl ? (
                    <Image
                      alt="FanLetter wallet QR code"
                      className="mx-auto aspect-square w-full max-w-[14rem] rounded-lg bg-white p-3"
                      height={260}
                      src={qrCodeUrl}
                      unoptimized
                      width={260}
                    />
                  ) : (
                    <div className="rounded-lg border border-dashed border-white/14 px-4 py-12 text-center text-sm font-medium text-white/46">
                      {copy.qrUnavailable}
                    </div>
                  )}
                </div>

                <p className="mt-4 break-all rounded-lg border border-white/10 bg-black/24 p-3 text-sm font-semibold leading-6 text-white">
                  {accountAddress}
                </p>
                <p className="mt-3 text-xs font-medium leading-5 text-white/46">
                  {copy.receiveNote}
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {accountAddress ? (
                    <CopyTextButton
                      className="w-full"
                      copiedLabel={copy.actions.copied}
                      copyLabel={copy.actions.copy}
                      text={accountAddress}
                    />
                  ) : null}
                  <a
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/16 px-4 text-sm font-semibold !text-white transition hover:bg-white/8"
                    href={getExplorerAddressUrl(accountAddress)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    BscScan
                    <ArrowUpRight className="size-4" />
                  </a>
                </div>
              </section>

              <section className="rounded-lg border border-white/12 bg-white/[0.055] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#44f26e]">
                      {copy.history}
                    </p>
                    <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-white/58">
                      {copy.historyBody}
                    </p>
                    {state.email ? (
                      <p className="mt-2 text-xs font-semibold text-white/38">
                        {state.email}
                      </p>
                    ) : null}
                  </div>
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-white/16 px-4 text-sm font-semibold text-white transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isRefreshing}
                    onClick={() => {
                      void loadWallet({ background: true });
                    }}
                    type="button"
                  >
                    <RefreshCw
                      className={cn("size-4", isRefreshing && "animate-spin")}
                    />
                    {copy.actions.refresh}
                  </button>
                </div>

                {state.updatedAt ? (
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/32">
                    {copy.updated} {formatDateTime(state.updatedAt, locale)}
                    {state.syncing ? " · syncing" : ""}
                  </p>
                ) : null}

                <div className="mt-4 grid gap-3">
                  {state.status === "loading" && state.history.length === 0 ? (
                    <FanletterWalletMessage>
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        {copy.loading}
                      </span>
                    </FanletterWalletMessage>
                  ) : state.error && state.history.length === 0 ? (
                    <FanletterWalletMessage tone="error">
                      {state.error}
                    </FanletterWalletMessage>
                  ) : state.history.length === 0 ? (
                    <FanletterWalletMessage>
                      {copy.emptyHistory}
                    </FanletterWalletMessage>
                  ) : (
                    <>
                      {state.error ? (
                        <FanletterWalletMessage tone="error">
                          {state.error}
                        </FanletterWalletMessage>
                      ) : null}
                      {state.history.map((transfer) => (
                        <HistoryRow
                          copy={copy}
                          key={`${transfer.transactionHash}:${transfer.logIndex}`}
                          locale={locale}
                          transfer={transfer}
                        />
                      ))}
                    </>
                  )}
                </div>
              </section>
            </div>
          )}

          <section className="mt-5 grid gap-4 md:grid-cols-3">
            <Link
              className="rounded-lg border border-white/12 bg-white/[0.055] p-4 text-white transition hover:bg-white/[0.085]"
              href={purchasesHref}
            >
              <BookOpenCheck className="size-6 text-[#44f26e]" />
              <p className="mt-3 text-sm font-semibold">
                {copy.actions.purchases}
              </p>
              <p className="mt-1 text-xs font-medium leading-5 text-white/46">
                {copy.quickLinks.purchases}
              </p>
            </Link>
            <Link
              className="rounded-lg border border-white/12 bg-white/[0.055] p-4 text-white transition hover:bg-white/[0.085]"
              href={salesHref}
            >
              <Coins className="size-6 text-[#44f26e]" />
              <p className="mt-3 text-sm font-semibold">{copy.actions.sales}</p>
              <p className="mt-1 text-xs font-medium leading-5 text-white/46">
                {copy.quickLinks.sales}
              </p>
            </Link>
            <Link
              className="rounded-lg border border-white/12 bg-white/[0.055] p-4 text-white transition hover:bg-white/[0.085]"
              href={studioHref}
            >
              <ShieldCheck className="size-6 text-[#44f26e]" />
              <p className="mt-3 text-sm font-semibold">{copy.actions.studio}</p>
              <p className="mt-1 text-xs font-medium leading-5 text-white/46">
                {copy.quickLinks.studio}
              </p>
            </Link>
          </section>
        </div>
      </section>
    </main>
  );
}
