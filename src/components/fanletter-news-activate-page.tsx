"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Copy,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
  WalletMinimal,
  type LucideIcon,
} from "lucide-react";
import { getContract } from "thirdweb";
import { transfer } from "thirdweb/extensions/erc20";
import {
  TransactionButton,
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
  useWalletBalance,
} from "thirdweb/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { EmailLoginDialog } from "@/components/email-login-dialog";
import { useMemberSession } from "@/components/member-session-provider";
import {
  useWalletUnlockGate,
  WalletUnlockAction,
} from "@/components/wallet-unlock-gate";
import { readFanletterShareAttributionFromReturnPath } from "@/lib/fanletter-share-attribution";
import type { Dictionary, Locale } from "@/lib/i18n";
import {
  MEMBER_SIGNUP_USDT_AMOUNT,
  MEMBER_SIGNUP_USDT_AMOUNT_WEI,
  type MemberRecord,
} from "@/lib/member";
import { syncServerMemberRegistration } from "@/lib/member-session-client";
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

type FanletterNewsActivateStatus = "error" | "idle" | "ready" | "syncing";

type FanletterNewsActivateSyncState = {
  email: string | null;
  error: string | null;
  justCompleted: boolean;
  member: MemberRecord | null;
  status: FanletterNewsActivateStatus;
  validationError: string | null;
};

type NewsActivateNotice = {
  href?: string;
  text: string;
  tone: "error" | "info" | "success";
};

const NEWS_ACTIVATE_DISCONNECTED_GRACE_MS = 4500;

const usdtContract = getContract({
  address: BSC_USDT_ADDRESS,
  chain: smartWalletChain,
  client: thirdwebClient,
});

const emptySyncState: FanletterNewsActivateSyncState = {
  email: null,
  error: null,
  justCompleted: false,
  member: null,
  status: "idle",
  validationError: null,
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        account: "뉴스 계정",
        accountReady: "뉴스 계정 활성화 완료",
        activate: "가입 완료하기",
        amount: "필요 금액",
        balance: "보유 USDT",
        checking: "가입 상태 확인 중",
        checkingPayment:
          "10 USDT 가입 결제 기록을 확인하고 있습니다. 블록체인/웹훅 반영 상태에 따라 잠시 걸릴 수 있습니다.",
        completeBody:
          "가입 완료가 확인되었습니다. 이제 FanLetter News에서 AI 리포트, 팬 기자 활동, 유료 브이로그 열람을 같은 계정으로 이어갈 수 있습니다.",
        connect: "뉴스 지갑 연결",
        disconnected: "뉴스 지갑을 먼저 연결하세요.",
        edition: "FanLetter Entertainment News",
        email: "이메일",
        eyebrow: "FanLetter News Signup",
        home: "뉴스 홈",
        insufficientBalance: `${MEMBER_SIGNUP_USDT_AMOUNT} USDT 이상 보유해야 가입 완료 결제를 진행할 수 있습니다.`,
        loginTitle: "FanLetter News 지갑 연결",
        missingClient:
          "현재 브라우저에서 이메일 지갑 연결을 시작할 수 없습니다. 잠시 후 다시 시도하세요.",
        missingProjectWallet:
          "프로젝트 수신 지갑이 설정되지 않아 결제를 시작할 수 없습니다.",
        pendingBody:
          "뉴스 서비스 안에서 10 USDT 결제와 가입 상태 확인을 바로 진행합니다. 결제 확인 후 보던 뉴스로 돌아갈 수 있습니다.",
        pendingTitle: "뉴스 서비스 가입 완료",
        paymentStillPending:
          "아직 10 USDT 가입 결제 기록이 확인되지 않았습니다. 결제를 완료했다면 블록체인 반영 후 다시 확인하세요.",
        projectWallet: "수신 지갑",
        refresh: "상태 다시 확인",
        returnTo: "뉴스로 돌아가기",
        siteName: "FanLetter News",
        status: "상태",
        steps: ["뉴스 지갑 연결", "10 USDT 결제", "뉴스 계정 활성화"],
        syncing: "회원 정보를 동기화하고 있습니다.",
        title: "FanLetter News 안에서 가입 완료",
        txConfirmed:
          "결제가 확인되었습니다. 잠시 후 가입 완료 상태를 다시 확인합니다.",
        txSent: "결제가 전송되었습니다. 블록체인 확인 후 상태를 갱신합니다.",
        walletId: "연결 ID",
      }
    : {
        account: "News account",
        accountReady: "News account activated",
        activate: "Complete signup",
        amount: "Required amount",
        balance: "USDT balance",
        checking: "Checking signup",
        checkingPayment:
          "Checking the 10 USDT signup payment record. Chain and webhook updates can take a moment.",
        completeBody:
          "Signup is complete. You can continue AI reports, fan reporter actions, and paid vlog access in FanLetter News with the same account.",
        connect: "Connect news wallet",
        disconnected: "Connect your news wallet first.",
        edition: "FanLetter Entertainment News",
        email: "Email",
        eyebrow: "FanLetter News Signup",
        home: "News home",
        insufficientBalance: `You need at least ${MEMBER_SIGNUP_USDT_AMOUNT} USDT to complete signup.`,
        loginTitle: "Connect FanLetter News wallet",
        missingClient:
          "Email wallet connection cannot start in this browser right now. Please try again shortly.",
        missingProjectWallet:
          "The project receiving wallet is not configured, so payment cannot start.",
        pendingBody:
          "Complete the 10 USDT payment and status check directly inside the news service. After confirmation, return to the news page you were viewing.",
        pendingTitle: "Complete News signup",
        paymentStillPending:
          "No 10 USDT signup payment record has been confirmed yet. If you already paid, wait for the chain update, then check again.",
        projectWallet: "Receiving wallet",
        refresh: "Check status again",
        returnTo: "Back to news",
        siteName: "FanLetter News",
        status: "Status",
        steps: ["Connect news wallet", "Pay 10 USDT", "Activate news account"],
        syncing: "Syncing member information.",
        title: "Complete signup inside FanLetter News",
        txConfirmed:
          "Payment is confirmed. Signup status will be checked again shortly.",
        txSent: "Payment was sent. Status will refresh after chain confirmation.",
        walletId: "Connection ID",
      };
}

function formatAddressLabel(address?: string | null) {
  const trimmed = address?.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.length <= 12) {
    return trimmed;
  }

  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function normalizeAddress(address?: string | null) {
  return address?.trim().toLowerCase() ?? "";
}

function isMemberWalletKnown(member: MemberRecord, walletAddress: string) {
  const normalizedWalletAddress = normalizeAddress(walletAddress);

  if (!normalizedWalletAddress) {
    return false;
  }

  return [member.lastWalletAddress, ...member.walletAddresses]
    .map((address) => normalizeAddress(address))
    .includes(normalizedWalletAddress);
}

function getMemberStatusLabel(member: MemberRecord | null, locale: Locale) {
  if (!member) {
    return locale === "ko" ? "확인 전" : "Not checked";
  }

  if (member.serviceSuspendedAt) {
    return locale === "ko" ? "서비스 중단" : "Suspended";
  }

  return member.status === "completed"
    ? locale === "ko"
      ? "가입 완료"
      : "Completed"
    : locale === "ko"
      ? "결제 확인 필요"
      : "Payment required";
}

function formatTokenBalance(
  displayValue: string | undefined,
  symbol: string | undefined,
  locale: Locale,
) {
  if (!displayValue) {
    return "-";
  }

  const value = Number(displayValue);
  const tokenSymbol = symbol ?? "USDT";

  if (!Number.isFinite(value)) {
    return `${displayValue} ${tokenSymbol}`;
  }

  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 4,
  }).format(value)} ${tokenSymbol}`;
}

function StepStatus({
  done,
  index,
  label,
  loading,
}: {
  done: boolean;
  index: number;
  label: string;
  loading?: boolean;
}) {
  return (
    <div
      className={joinClasses(
        "border bg-white px-3 py-3",
        done
          ? "border-[#16702e] bg-[#e5f7df] text-[#111510]"
          : "border-black/12 bg-white text-black/58",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center border border-current/18 text-[0.68rem] font-black">
            {index + 1}
          </span>
          <p className="truncate text-[0.68rem] font-black uppercase tracking-[0.1em]">
            {label}
          </p>
        </div>
        {loading ? (
          <Loader2 className="size-4 animate-spin text-[#16702e]" />
        ) : done ? (
          <CheckCircle2 className="size-4 text-[#16702e]" />
        ) : (
          <span className="size-2 rounded-full bg-current opacity-36" />
        )}
      </div>
    </div>
  );
}

function InfoRow({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  value: string | null;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)] items-center gap-3 border-b border-black/10 py-3 last:border-b-0 sm:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]">
      <dt className="flex min-w-0 items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.1em] text-black/42">
        <Icon className="size-4 shrink-0 text-[#16702e]" />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="min-w-0 truncate text-right text-sm font-black text-[#111510]">
        {value ?? "-"}
      </dd>
    </div>
  );
}

function NoticeCard({ notice }: { notice: NewsActivateNotice | null }) {
  if (!notice) {
    return null;
  }

  const className =
    notice.tone === "success"
      ? "border-[#16702e]/28 bg-[#ecfff0] text-[#113b1d]"
      : notice.tone === "error"
        ? "border-red-200 bg-red-50 text-red-900"
        : "border-amber-200 bg-amber-50 text-amber-950";

  return (
    <div className={joinClasses("border p-3 text-sm font-semibold leading-6", className)}>
      <div className="flex items-start gap-2">
        {notice.tone === "success" ? (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        ) : (
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
        )}
        <p>
          {notice.text}
          {notice.href ? (
            <>
              {" "}
              <a className="font-black underline" href={notice.href} rel="noreferrer" target="_blank">
                BscScan
              </a>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}

export function FanletterNewsActivatePage({
  dictionary,
  locale,
  projectWallet,
  referralCode,
  returnToHref,
}: {
  dictionary: Dictionary;
  locale: Locale;
  projectWallet: string | null;
  referralCode: string | null;
  returnToHref: string;
}) {
  const account = useActiveAccount();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const connectionStatus = useActiveWalletConnectionStatus();
  const memberSession = useMemberSession();
  const { updateMemberSession } = memberSession;
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [notice, setNotice] = useState<NewsActivateNotice | null>(null);
  const [syncState, setSyncState] =
    useState<FanletterNewsActivateSyncState>(emptySyncState);
  const syncInFlightRef = useRef(false);
  const copy = getCopy(locale);
  const accountAddress = account?.address ?? null;
  const accountLabel = formatAddressLabel(accountAddress);
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    { returnTo: returnToHref },
  );
  const activateHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/activate`, referralCode),
    { returnTo: returnToHref },
  );
  const fanletterShareAttribution = useMemo(
    () => readFanletterShareAttributionFromReturnPath(returnToHref),
    [returnToHref],
  );
  const connection = useThirdwebConnectionState({
    accountAddress,
    clientConfigured: hasThirdwebClientId,
    disconnectedResolveGraceMs: NEWS_ACTIVATE_DISCONNECTED_GRACE_MS,
    resolveGraceMs: NEWS_ACTIVATE_DISCONNECTED_GRACE_MS,
    status: connectionStatus,
  });
  const { data: balance } = useWalletBalance(
    {
      address: accountAddress ?? undefined,
      chain: smartWalletChain,
      client: thirdwebClient,
      tokenAddress: BSC_USDT_ADDRESS,
    },
    {
      refetchInterval: connection.isConnected ? 5000 : false,
      refetchIntervalInBackground: true,
    },
  );
  const cachedSessionMember = useMemo(() => {
    if (!accountAddress || !memberSession.member) {
      return null;
    }

    return isMemberWalletKnown(memberSession.member, accountAddress)
      ? memberSession.member
      : null;
  }, [accountAddress, memberSession.member]);
  const cachedSessionEmail = cachedSessionMember ? memberSession.email : null;
  const connectedMember = syncState.member ?? cachedSessionMember;
  const memberIsCompleted =
    connectedMember?.status === "completed" &&
    !connectedMember.serviceSuspendedAt;
  const memberNeedsPayment = connectedMember?.status === "pending_payment";
  const walletUnlock = useWalletUnlockGate({
    email: syncState.email ?? cachedSessionEmail ?? connectedMember?.email,
    locale,
    referralCode,
    returnTo: activateHref,
    walletAddress: accountAddress,
  });
  const isBalanceLoading =
    connection.isConnected && !memberIsCompleted && !balance;
  const isInsufficientUsdtBalance =
    !memberIsCompleted &&
    typeof balance?.value === "bigint" &&
    balance.value < BigInt(MEMBER_SIGNUP_USDT_AMOUNT_WEI);
  const balanceLabel = formatTokenBalance(
    balance?.displayValue,
    balance?.symbol ?? "USDT",
    locale,
  );
  const paymentDisabled =
    !accountAddress ||
    !hasThirdwebClientId ||
    isBalanceLoading ||
    isInsufficientUsdtBalance ||
    !projectWallet ||
    memberIsCompleted;
  const cardTitle = memberIsCompleted
    ? copy.accountReady
    : connection.isResolving
      ? copy.checking
      : connection.isConnected
        ? copy.pendingTitle
        : copy.disconnected;
  const cardBody = memberIsCompleted
    ? copy.completeBody
    : connection.isResolving
      ? copy.syncing
      : connection.isConnected
        ? copy.pendingBody
        : copy.disconnected;
  const statusText = getMemberStatusLabel(connectedMember, locale);

  useEffect(() => {
    if (connectionStatus === "connected") {
      setIsLoginDialogOpen(false);
    }
  }, [connectionStatus]);

  useEffect(() => {
    if (!connection.isConnected || !accountAddress) {
      setSyncState(emptySyncState);
      setNotice(null);
      return;
    }

    let isCancelled = false;

    async function syncMember() {
      if (!accountAddress || syncInFlightRef.current) {
        return;
      }

      syncInFlightRef.current = true;
      setSyncState((current) => ({
        ...current,
        email: cachedSessionEmail,
        error: null,
        member: cachedSessionMember,
        status: cachedSessionMember ? "ready" : "syncing",
        validationError: null,
      }));

      try {
        const email =
          cachedSessionEmail ??
          (await getThirdwebUserEmail({ client: thirdwebClient }));

        if (!email) {
          throw new Error(dictionary.member.errors.missingEmail);
        }

        const result = await syncServerMemberRegistration({
          chainId: chain.id,
          chainName: chain.name ?? "BSC",
          email,
          fanletterShareAttribution,
          locale,
          referredByCode: referralCode,
          syncMode: "light",
          walletAddress: accountAddress,
        });

        if (!result.ok) {
          throw new Error(result.error || dictionary.member.errors.syncFailed);
        }

        if (!result.member) {
          throw new Error(dictionary.member.errors.syncFailed);
        }

        const syncedMember = result.member;

        if (isCancelled) {
          return;
        }

        updateMemberSession({
          email: syncedMember.email,
          member: syncedMember,
          walletAddress: accountAddress,
        });

        setSyncState((current) => ({
          email: syncedMember.email,
          error: null,
          justCompleted:
            result.justCompleted ||
            (current.member?.status === "pending_payment" &&
              syncedMember.status === "completed"),
          member: syncedMember,
          status: "ready",
          validationError: result.validationError,
        }));
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setSyncState((current) => ({
          ...current,
          error:
            error instanceof Error
              ? error.message
              : dictionary.member.errors.syncFailed,
          justCompleted: false,
          status: "error",
        }));
      } finally {
        syncInFlightRef.current = false;
      }
    }

    void syncMember();

    return () => {
      isCancelled = true;
    };
  }, [
    accountAddress,
    cachedSessionEmail,
    cachedSessionMember,
    chain.id,
    chain.name,
    connection.isConnected,
    dictionary.member.errors.missingEmail,
    dictionary.member.errors.syncFailed,
    fanletterShareAttribution,
    locale,
    referralCode,
    updateMemberSession,
  ]);

  async function refreshMemberStatus(background = false) {
    if (!accountAddress || syncInFlightRef.current) {
      return;
    }

    syncInFlightRef.current = true;

    if (!background) {
      setNotice({
        text: copy.checkingPayment,
        tone: "info",
      });
      setSyncState((current) => ({
        ...current,
        error: null,
        status: "syncing",
        validationError: null,
      }));
    }

    try {
      const email =
        syncState.email ??
        cachedSessionEmail ??
        (await getThirdwebUserEmail({ client: thirdwebClient }));

      if (!email) {
        throw new Error(dictionary.member.errors.missingEmail);
      }

      const result = await syncServerMemberRegistration({
        chainId: chain.id,
        chainName: chain.name ?? "BSC",
        email,
        fanletterShareAttribution,
        locale,
        referredByCode: referralCode,
        syncMode: "full",
        walletAddress: accountAddress,
      });

      if (!result.ok) {
        throw new Error(result.error || dictionary.member.errors.syncFailed);
      }

      if (!result.member) {
        throw new Error(dictionary.member.errors.syncFailed);
      }

      const syncedMember = result.member;
      const syncedMemberIsCompleted =
        syncedMember.status === "completed" && !syncedMember.serviceSuspendedAt;

      updateMemberSession({
        email: syncedMember.email,
        member: syncedMember,
        walletAddress: accountAddress,
      });

      setSyncState((current) => ({
        email: syncedMember.email,
        error: null,
        justCompleted:
          result.justCompleted ||
          (current.member?.status === "pending_payment" &&
            syncedMember.status === "completed"),
        member: syncedMember,
        status: "ready",
        validationError: result.validationError,
      }));

      if (!background) {
        setNotice({
          text: syncedMemberIsCompleted
            ? copy.completeBody
            : result.validationError || copy.paymentStillPending,
          tone: syncedMemberIsCompleted ? "success" : "info",
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : dictionary.member.errors.syncFailed;

      if (!background) {
        setNotice({
          text: message,
          tone: "error",
        });
      }

      setSyncState((current) => ({
        ...current,
        error: message,
        justCompleted: false,
        status: "error",
      }));
    } finally {
      syncInFlightRef.current = false;
    }
  }

  function createSignupPaymentTransaction() {
    if (!accountAddress) {
      throw new Error(copy.disconnected);
    }

    if (!walletUnlock.isUnlocked) {
      throw new Error(walletUnlock.copy.unlockRequired);
    }

    if (!projectWallet) {
      throw new Error(copy.missingProjectWallet);
    }

    if (isInsufficientUsdtBalance) {
      throw new Error(copy.insufficientBalance);
    }

    return transfer({
      amount: MEMBER_SIGNUP_USDT_AMOUNT,
      contract: usdtContract,
      to: projectWallet,
    });
  }

  function handlePaymentError(error: Error) {
    setNotice({
      text: error.message,
      tone: "error",
    });
  }

  function handlePaymentSent(result: { transactionHash: string }) {
    setNotice({
      href: `${BSC_EXPLORER}/tx/${result.transactionHash}`,
      text: copy.txSent,
      tone: "info",
    });

    window.setTimeout(() => {
      void refreshMemberStatus(true);
    }, 4000);
  }

  function handlePaymentConfirmed(receipt: { transactionHash: string }) {
    setNotice({
      href: `${BSC_EXPLORER}/tx/${receipt.transactionHash}`,
      text: copy.txConfirmed,
      tone: "success",
    });

    window.setTimeout(() => {
      void refreshMemberStatus(true);
    }, 2500);
  }

  const steps = copy.steps.map((step, index) => (
    <StepStatus
      done={
        index === 0
          ? connection.isConnected
          : index === 1
            ? Boolean(memberNeedsPayment || memberIsCompleted)
            : memberIsCompleted
      }
      index={index}
      key={step}
      label={step}
      loading={
        (index === 0 && connection.isResolving) ||
        (index === 2 && syncState.status === "syncing")
      }
    />
  ));

  return (
    <main className="min-h-screen bg-[#eef1ec] pb-4 text-[#111510]">
      <EmailLoginDialog
        dictionary={dictionary}
        onClose={() => {
          setIsLoginDialogOpen(false);
        }}
        open={isLoginDialogOpen}
        title={copy.loginTitle}
        variant="fanletter"
      />

      <header className="border-b border-black/14 bg-white">
        <div className="border-b border-black/10 bg-[#f7f7f4]">
          <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-4 px-4 py-2 text-[0.72rem] font-semibold text-black/52 sm:px-6 lg:px-8">
            <span className="min-w-0 truncate">{copy.edition}</span>
            <Link
              className="shrink-0 font-bold !text-[#16702e]"
              href={returnToHref}
            >
              {copy.returnTo}
            </Link>
          </div>
        </div>
        <div className="mx-auto flex max-w-[92rem] items-end justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            className="inline-flex items-center gap-3 text-[2rem] font-black leading-none tracking-normal !text-[#111510] sm:text-[3.2rem]"
            href={newsHomeHref}
          >
            {copy.siteName}
          </Link>
          <Link
            aria-label={copy.returnTo}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-black/14 bg-white text-[#111510] transition hover:bg-black hover:text-white"
            href={returnToHref}
          >
            <ArrowLeft className="size-5" />
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-[92rem] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:px-8 lg:py-8 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <section className="min-w-0 overflow-hidden border-y-2 border-[#111510] bg-white shadow-[0_18px_48px_rgba(17,21,16,0.08)]">
          <div className="border-b-2 border-[#111510] p-4 sm:p-5">
            <p className="text-[0.72rem] font-black uppercase tracking-[0.18em] text-[#16702e]">
              {copy.eyebrow}
            </p>
            <h1 className="mt-3 max-w-4xl break-words text-[2.15rem] font-black leading-[1.05] tracking-normal [word-break:keep-all] sm:text-[3.45rem] lg:text-[3.9rem]">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-black/62 [word-break:keep-all] sm:text-base sm:leading-7">
              {cardBody}
            </p>
            <div className="mt-5 grid gap-px border border-black/10 bg-black/10 sm:grid-cols-3">
              {steps}
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.45fr)]">
            <div className="min-w-0 p-4 sm:p-5">
              <div className="border border-black/12 bg-[#f7faf4] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
                      {copy.activate}
                    </p>
                    <h2 className="mt-2 text-3xl font-black leading-none tracking-normal sm:text-4xl">
                      {MEMBER_SIGNUP_USDT_AMOUNT} USDT
                    </h2>
                  </div>
                  <span className="flex size-12 shrink-0 items-center justify-center bg-[#111510] text-[#44f26e]">
                    <ShieldCheck className="size-6" />
                  </span>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <div className="border border-black/10 bg-white px-3 py-3">
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-black/42">
                      {copy.amount}
                    </p>
                    <p className="mt-1 text-lg font-black">
                      {MEMBER_SIGNUP_USDT_AMOUNT} USDT
                    </p>
                  </div>
                  <div className="border border-black/10 bg-white px-3 py-3">
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-black/42">
                      {copy.balance}
                    </p>
                    <p className="mt-1 truncate text-lg font-black">
                      {isBalanceLoading ? copy.checking : balanceLabel}
                    </p>
                  </div>
                </div>

                {isInsufficientUsdtBalance ? (
                  <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-950">
                    {copy.insufficientBalance}
                  </div>
                ) : null}

                {!projectWallet ? (
                  <div className="mt-4 border border-red-200 bg-red-50 p-3 text-sm font-semibold leading-6 text-red-900">
                    {copy.missingProjectWallet}
                  </div>
                ) : null}

                <div className="mt-5 grid gap-2">
                  {!hasThirdwebClientId || !connection.isConnected ? (
                    <button
                      className="inline-flex h-12 items-center justify-center gap-2 bg-[#44f26e] px-5 text-sm font-black text-black transition hover:bg-[#69ff8c] disabled:cursor-not-allowed disabled:bg-black/12 disabled:text-black/38"
                      disabled={!hasThirdwebClientId}
                      onClick={() => setIsLoginDialogOpen(true)}
                      type="button"
                    >
                      <Mail className="size-4" />
                      {hasThirdwebClientId ? copy.connect : copy.missingClient}
                    </button>
                  ) : memberIsCompleted ? (
                    <Link
                      className="inline-flex h-12 items-center justify-center gap-2 bg-[#44f26e] px-5 text-sm font-black !text-black transition hover:bg-[#69ff8c]"
                      href={returnToHref}
                    >
                      {copy.returnTo}
                      <ArrowRight className="size-4" />
                    </Link>
                  ) : !walletUnlock.isUnlocked ? (
                    <WalletUnlockAction
                      className="inline-flex h-12 items-center justify-center gap-2 bg-[#111510] px-5 text-sm font-black !text-white transition hover:bg-black"
                      href={walletUnlock.unlockHref}
                    >
                      {walletUnlock.copy.unlockAction}
                    </WalletUnlockAction>
                  ) : (
                    <TransactionButton
                      className="inline-flex h-12 items-center justify-center gap-2 bg-[#44f26e] px-5 text-sm font-black !text-black transition hover:bg-[#69ff8c] disabled:cursor-not-allowed disabled:bg-black/12 disabled:!text-black/38"
                      disabled={paymentDisabled}
                      onError={handlePaymentError}
                      onTransactionConfirmed={handlePaymentConfirmed}
                      onTransactionSent={handlePaymentSent}
                      transaction={createSignupPaymentTransaction}
                      type="button"
                      unstyled
                    >
                      {isBalanceLoading ? copy.checking : copy.activate}
                    </TransactionButton>
                  )}
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 border border-black/14 px-5 text-sm font-black text-[#111510] transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={
                      !connection.isConnected || syncState.status === "syncing"
                    }
                    onClick={() => {
                      void refreshMemberStatus();
                    }}
                    type="button"
                  >
                    <RefreshCw
                      className={joinClasses(
                        "size-4",
                        syncState.status === "syncing" && "animate-spin",
                      )}
                    />
                    {copy.refresh}
                  </button>
                </div>

                <div className="mt-4 grid gap-2">
                  <NoticeCard notice={notice} />
                  <NoticeCard
                    notice={
                      syncState.error
                        ? { text: syncState.error, tone: "error" }
                        : syncState.validationError && memberNeedsPayment
                          ? { text: syncState.validationError, tone: "info" }
                          : null
                    }
                  />
                </div>
              </div>
            </div>

            <aside className="border-t border-black/12 bg-[#111510] p-4 text-white sm:p-5 lg:border-l lg:border-t-0">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#44f26e]">
                {copy.account}
              </p>
              <h2 className="mt-2 break-words text-2xl font-black leading-tight [word-break:keep-all]">
                {cardTitle}
              </h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-white/62">
                {memberIsCompleted ? copy.completeBody : copy.pendingBody}
              </p>
              <div className="mt-5 grid gap-2">
                <div className="border border-white/12 bg-white/[0.06] px-3 py-3">
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-white/42">
                    {copy.status}
                  </p>
                  <p className="mt-1 truncate text-lg font-black">
                    {statusText}
                  </p>
                </div>
                <div className="border border-white/12 bg-white/[0.06] px-3 py-3">
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-white/42">
                    {copy.walletId}
                  </p>
                  <p className="mt-1 truncate text-sm font-black text-white/86">
                    {accountLabel ?? "-"}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="border-2 border-[#111510] bg-white shadow-[0_18px_44px_rgba(12,18,14,0.12)] lg:sticky lg:top-5 lg:self-start">
          <div className="border-b-2 border-[#111510] p-4">
            <div className="flex items-start gap-3">
              <span
                className={joinClasses(
                  "flex size-12 shrink-0 items-center justify-center",
                  memberIsCompleted
                    ? "bg-[#44f26e] text-black"
                    : syncState.status === "error"
                      ? "bg-red-100 text-red-900"
                      : "bg-[#111510] text-white",
                )}
              >
                {memberIsCompleted ? (
                  <CheckCircle2 className="size-6" />
                ) : syncState.status === "error" ? (
                  <CircleAlert className="size-6" />
                ) : connection.isResolving || syncState.status === "syncing" ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : (
                  <WalletMinimal className="size-6" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#16702e]">
                  {copy.account}
                </p>
                <h2 className="mt-1 break-words text-2xl font-black leading-tight [word-break:keep-all]">
                  {cardTitle}
                </h2>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <dl className="border-y border-black/12">
              <InfoRow
                Icon={Mail}
                label={copy.email}
                value={syncState.email ?? cachedSessionEmail}
              />
              <InfoRow Icon={ShieldCheck} label={copy.status} value={statusText} />
              <InfoRow Icon={WalletMinimal} label={copy.walletId} value={accountLabel} />
              <InfoRow
                Icon={Copy}
                label={copy.projectWallet}
                value={formatAddressLabel(projectWallet)}
              />
            </dl>

            <div className="mt-5 grid gap-2">
              {memberIsCompleted ? (
                <>
                  <Link
                    className="inline-flex h-12 items-center justify-center gap-2 bg-[#44f26e] px-5 text-sm font-black !text-black transition hover:bg-[#69ff8c]"
                    href={returnToHref}
                  >
                    {copy.returnTo}
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    className="inline-flex h-11 items-center justify-center gap-2 border border-black/14 px-5 text-sm font-black !text-[#111510] transition hover:bg-black hover:!text-white"
                    href={newsHomeHref}
                  >
                    {copy.home}
                  </Link>
                </>
              ) : connection.isConnected ? (
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 border border-black/14 px-5 text-sm font-black !text-[#111510] transition hover:bg-black hover:!text-white"
                  href={connectHref}
                >
                  <WalletMinimal className="size-4" />
                  {copy.account}
                </Link>
              ) : (
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 bg-[#44f26e] px-5 text-sm font-black text-black transition hover:bg-[#69ff8c] disabled:cursor-not-allowed disabled:bg-black/12 disabled:text-black/38"
                  disabled={!hasThirdwebClientId}
                  onClick={() => setIsLoginDialogOpen(true)}
                  type="button"
                >
                  <Mail className="size-4" />
                  {hasThirdwebClientId ? copy.connect : copy.missingClient}
                </button>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
