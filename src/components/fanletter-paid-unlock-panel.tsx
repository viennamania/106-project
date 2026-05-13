"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Coins,
  ExternalLink,
  FileText,
  Film,
  LoaderCircle,
  LockKeyhole,
  PlayCircle,
  RefreshCw,
  ImageIcon,
  X,
} from "lucide-react";
import { getContract } from "thirdweb";
import { transfer } from "thirdweb/extensions/erc20";
import { toUnits } from "thirdweb/utils";
import {
  TransactionButton,
  useActiveAccount,
  useActiveWalletConnectionStatus,
  useWalletBalance,
} from "thirdweb/react";

import { FanletterAutoplayVideo } from "@/components/fanletter-autoplay-video";
import { useMemberSession } from "@/components/member-session-provider";
import {
  useWalletUnlockGate,
  WalletUnlockAction,
} from "@/components/wallet-unlock-gate";
import {
  CONTENT_PAID_USDT_AMOUNT,
  CONTENT_PAID_USDT_AMOUNT_WEI,
  type ContentDetailLoadResponse,
  type ContentDetailRecord,
  type ContentOrderCreateResponse,
  type ContentOrderRecord,
  type ContentOrderVerifyResponse,
} from "@/lib/content";
import { trackFunnelEvent } from "@/lib/funnel-client";
import type { Locale } from "@/lib/i18n";
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

type PaidUnlockState = {
  error: string | null;
  order: ContentOrderRecord | null;
  recipientWalletAddress: string | null;
  status: "idle" | "creating" | "sent" | "verifying" | "unlocked" | "error";
  txHash: string | null;
};

type FanletterPaidUnlockPanelProps = {
  connectHref: string;
  contentId: string;
  creatorHref: string;
  currentHref: string;
  contentImageCount: number;
  contentVideoCount: number;
  initialBody: string;
  initialCoverImageUrl: string | null;
  initialSummary: string;
  initialTitle: string;
  locale: Locale;
  onboardingHref: string;
  priceUsdt: string | null;
  referralCode: string | null;
};

const usdtContract = getContract({
  address: BSC_USDT_ADDRESS,
  chain: smartWalletChain,
  client: thirdwebClient,
});
const FANLETTER_ACCESS_REQUEST_TIMEOUT_MS = 12000;

function formatAddressLabel(address?: string | null) {
  const trimmed = address?.trim();

  if (!trimmed) {
    return "-";
  }

  if (trimmed.length <= 12) {
    return trimmed;
  }

  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function formatTokenDisplay(value: string, locale: Locale) {
  const normalized = value.trim();

  if (!/^-?\d+(\.\d+)?$/u.test(normalized)) {
    const numericValue = Number(normalized);

    return Number.isFinite(numericValue)
      ? new Intl.NumberFormat(locale, {
          maximumFractionDigits: 4,
        }).format(numericValue)
      : normalized;
  }

  const [integerPartRaw, fractionPartRaw = ""] = normalized.split(".");
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

function getUsdtAmountWei(amount: string) {
  try {
    return toUnits(amount, 18);
  } catch {
    return BigInt(CONTENT_PAID_USDT_AMOUNT_WEI);
  }
}

async function fetchFanletterAccess(url: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, FANLETTER_ACCESS_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        alreadyUnlocked: "결제 완료 · 전체 열람 가능",
        alreadyUnlockedBody:
          "이 팬 전용 브이로그는 이미 잠금 해제되어 전체 영상과 본문을 볼 수 있습니다.",
        accessChecking: "열람 권한 확인 중",
        amount: "결제 금액",
        balanceAvailable: "결제 가능",
        balanceChecking: "잔고 확인 중",
        balanceInsufficient: "잔고 부족",
        balanceUnknown: "확인 필요",
        cancel: "취소",
        connectBody:
          "FanLetter 계정을 연결하면 팬 전용 브이로그를 바로 열 수 있습니다.",
        connectCta: "계정 연결하기",
        connectTitle: "팬 전용 브이로그를 열려면 계정 연결이 필요합니다.",
        fullBody: "전체 브이로그 본문",
        fullMedia: "전체 브이로그 미디어",
        lockedBody:
          "결제하면 이 캐릭터의 팬 전용 영상, 전체 본문, 추가 미디어가 이 화면에서 바로 열립니다.",
        lockedEyebrow: "FanLetter 팬 전용",
        lockedTitle: "팬 전용 브이로그 잠금 해제",
        unlockBody: "결제 후 열리는 항목",
        unlockImages: "추가 이미지",
        unlockText: "전체 본문",
        unlockVideo: "전체 영상",
        memberWallet: "내 결제 주소",
        networkBody:
          "이 콘텐츠는 캐릭터 채널 네트워크 안에서만 결제할 수 있습니다. 초대 링크로 들어왔는지 확인해 주세요.",
        networkCta: "캐릭터 채널 보기",
        networkTitle: "결제 가능한 네트워크 범위 밖입니다.",
        order: "주문",
        pay: "결제하기",
        paymentBody:
          "승인 전 USDT 금액과 받는 주소를 확인하세요. 결제가 끝나면 전체 브이로그가 자동으로 열립니다.",
        paymentTitle: "USDT 결제 확인",
        preparing: "결제 정보 준비 중",
        preview: "미리보기",
        reload: "다시 확인",
        retryVerification: "결제 다시 확인",
        sellerWallet: "크리에이터 정산 주소",
        signupBody:
          "FanLetter 시작 절차를 완료하면 팬 전용 콘텐츠 결제와 댓글, 요청 기능을 이어서 사용할 수 있습니다.",
        signupCta: "FanLetter 시작 완료",
        signupTitle: "회원 권한 확인이 필요합니다.",
        transaction: "결제 트랜잭션 보기",
        verifying: "결제 확인 중",
        walletApproval:
          "승인 창에서 결제를 확인하면 잠금 해제 상태를 자동으로 다시 확인합니다.",
        walletBalance:
          "결제하려면 연결된 결제 주소에 최소 {amount} USDT가 필요합니다.",
        walletBalanceLabel: "내 지갑 잔고",
        walletMismatch:
          "현재 결제 주소가 이 FanLetter 계정에 등록된 주소와 다릅니다. 계정을 다시 연결해 주세요.",
      }
    : {
        alreadyUnlocked: "Payment complete · Full access",
        alreadyUnlockedBody:
          "This fan-only vlog is unlocked. You can view the full video and body here.",
        accessChecking: "Checking access",
        amount: "Amount",
        balanceAvailable: "Can pay",
        balanceChecking: "Checking balance",
        balanceInsufficient: "Low balance",
        balanceUnknown: "Needs check",
        cancel: "Cancel",
        connectBody:
          "Connect your FanLetter account to unlock this fan-only vlog.",
        connectCta: "Connect account",
        connectTitle: "Connect an account to unlock this fan-only vlog.",
        fullBody: "Full vlog body",
        fullMedia: "Full vlog media",
        lockedBody:
          "Pay once to open the fan-only video, full body, and extra media on this page.",
        lockedEyebrow: "FanLetter fan-only",
        lockedTitle: "Unlock fan-only vlog",
        unlockBody: "What unlocks",
        unlockImages: "Extra images",
        unlockText: "Full body",
        unlockVideo: "Full video",
        memberWallet: "Your payment address",
        networkBody:
          "This content can be paid for only inside the character channel network. Check that you opened it from an invite link.",
        networkCta: "View character channel",
        networkTitle: "Outside the payable network.",
        order: "Order",
        pay: "Pay",
        paymentBody:
          "Review the USDT amount and recipient before approval. The full vlog opens automatically after payment.",
        paymentTitle: "Confirm USDT payment",
        preparing: "Preparing payment",
        preview: "Preview",
        reload: "Check again",
        retryVerification: "Check payment again",
        sellerWallet: "Creator settlement address",
        signupBody:
          "Complete FanLetter onboarding to use fan-only payments, comments, and requests.",
        signupCta: "Complete FanLetter setup",
        signupTitle: "Membership verification required.",
        transaction: "View payment transaction",
        verifying: "Verifying payment",
        walletApproval:
          "Approve the payment prompt, then FanLetter will recheck the unlock status automatically.",
        walletBalance:
          "Your connected payment address needs at least {amount} USDT to pay.",
        walletBalanceLabel: "Wallet balance",
        walletMismatch:
          "The current payment address is not registered to this FanLetter account. Reconnect your account.",
      };
}

function translatePaidUnlockError(message: string, locale: Locale) {
  if (locale !== "ko") {
    return message;
  }

  if (message === "Content already unlocked.") {
    return "이미 잠금 해제된 콘텐츠입니다.";
  }

  if (message === "Member not found.") {
    return "FanLetter 회원 정보를 찾지 못했습니다. 계정을 다시 연결해 주세요.";
  }

  if (
    message === "Completed signup is required." ||
    message === "This member status is not authorized for this action."
  ) {
    return "FanLetter 시작 절차를 완료한 뒤 결제를 확인할 수 있습니다.";
  }

  if (message === "Content order not found.") {
    return "결제 주문을 찾지 못했습니다. 페이지를 새로 확인한 뒤 다시 시도해 주세요.";
  }

  if (message === "Content order is not payable.") {
    return "이 결제 주문은 더 이상 결제할 수 없습니다. 다시 확인 후 새로 시도해 주세요.";
  }

  if (message === "Transaction has already been used.") {
    return "이미 처리된 결제 트랜잭션입니다. 다시 확인을 눌러 열람 권한을 갱신해 주세요.";
  }

  if (message === "Transaction is not confirmed successfully.") {
    return "트랜잭션이 성공 상태로 확인되지 않았습니다.";
  }

  if (message === "Matching USDT transfer log not found in receipt.") {
    return "결제 트랜잭션에서 일치하는 USDT 전송 내역을 찾지 못했습니다.";
  }

  if (message === "Transaction is outside the order payment window.") {
    return "결제 주문 유효 시간이 지났습니다. 새로 결제를 진행해 주세요.";
  }

  if (
    message === "This wallet is not authorized for the requested member." ||
    message === "Member session does not match this request."
  ) {
    return "현재 결제 주소가 이 FanLetter 계정에 등록된 주소와 다릅니다. 계정을 다시 연결해 주세요.";
  }

  if (
    message === "Valid transaction hash is required." ||
    message.endsWith("is required.")
  ) {
    return "결제 확인에 필요한 정보가 누락되었습니다. 페이지를 다시 확인해 주세요.";
  }

  return message;
}

export function FanletterPaidUnlockPanel({
  connectHref,
  contentId,
  contentImageCount,
  contentVideoCount,
  creatorHref,
  currentHref,
  initialBody,
  initialCoverImageUrl,
  initialSummary,
  initialTitle,
  locale,
  onboardingHref,
  priceUsdt,
  referralCode,
}: FanletterPaidUnlockPanelProps) {
  const copy = getCopy(locale);
  const router = useRouter();
  const paidUnlockAmount = priceUsdt ?? CONTENT_PAID_USDT_AMOUNT;
  const account = useActiveAccount();
  const connectionStatus = useActiveWalletConnectionStatus();
  const accountAddress = account?.address ?? null;
  const memberSession = useMemberSession();
  const {
    accountAddress: memberSessionAccountAddress,
    email: memberSessionResolvedEmail,
    updateMemberSession,
  } = memberSession;
  const memberSessionEmail =
    accountAddress &&
    memberSessionAccountAddress?.toLowerCase() === accountAddress.toLowerCase()
      ? memberSessionResolvedEmail
      : null;
  const { isDisconnected, isResolving } = useThirdwebConnectionState({
    accountAddress,
    status: connectionStatus,
  });
  const {
    data: usdtBalance,
    isFetching: isUsdtBalanceFetching,
    isLoading: isUsdtBalanceLoading,
  } = useWalletBalance(
    {
      address: accountAddress ?? undefined,
      chain: smartWalletChain,
      client: thirdwebClient,
      tokenAddress: BSC_USDT_ADDRESS,
    },
    {
      refetchInterval: connectionStatus === "connected" ? 5000 : false,
      refetchIntervalInBackground: true,
    },
  );
  const walletUnlock = useWalletUnlockGate({
    email: memberSessionEmail,
    locale,
    referralCode,
    returnTo: currentHref,
    walletAddress: accountAddress,
  });
  const [detail, setDetail] = useState<ContentDetailRecord | null>(null);
  const [gateReason, setGateReason] =
    useState<ContentDetailLoadResponse["gateReason"]>("paid");
  const [loadStatus, setLoadStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paidUnlock, setPaidUnlock] = useState<PaidUnlockState>({
    error: null,
    order: null,
    recipientWalletAddress: null,
    status: "idle",
    txHash: null,
  });
  const paidOrderRef = useRef<ContentOrderRecord | null>(null);
  const paidRecipientWalletRef = useRef<string | null>(null);
  const accessLoadKeyRef = useRef<string | null>(null);
  const accessRefreshRequestedRef = useRef(false);

  const paidUnlockAmountWei = getUsdtAmountWei(paidUnlockAmount);
  const hasResolvedUsdtBalance = typeof usdtBalance?.value === "bigint";
  const isUsdtBalancePending =
    Boolean(accountAddress) &&
    !hasResolvedUsdtBalance &&
    (isUsdtBalanceLoading || isUsdtBalanceFetching);
  const isInsufficientPaidUnlockBalance =
    hasResolvedUsdtBalance && usdtBalance.value < paidUnlockAmountWei;
  const paidUnlockBalanceLabel = hasResolvedUsdtBalance
    ? `${formatTokenDisplay(usdtBalance.displayValue ?? "0", locale)} ${
        usdtBalance.symbol ?? "USDT"
      }`
    : isUsdtBalancePending
      ? copy.balanceChecking
      : "-";
  const paidUnlockBalanceStatus = hasResolvedUsdtBalance
    ? isInsufficientPaidUnlockBalance
      ? copy.balanceInsufficient
      : copy.balanceAvailable
    : isUsdtBalancePending
      ? copy.balanceChecking
      : copy.balanceUnknown;
  const paidUnlockBalanceStatusClassName = hasResolvedUsdtBalance
    ? isInsufficientPaidUnlockBalance
      ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
      : "border-[#44f26e]/30 bg-[#44f26e]/10 text-[#c9ffd3]"
    : "border-white/12 bg-white/[0.06] text-white/58";
  const isUnlocked = Boolean(detail?.canAccess);
  const displayBody = detail?.body ?? initialBody;
  const displayTitle = detail?.title ?? initialTitle;
  const displaySummary = detail?.summary ?? initialSummary;
  const displayCoverImageUrl = detail?.coverImageUrl ?? initialCoverImageUrl;
  const shouldShowLoading = loadStatus === "loading" || isResolving;
  const unlockItems = [
    {
      Icon: Film,
      label: copy.unlockVideo,
      value:
        contentVideoCount > 0
          ? `${formatTokenDisplay(String(contentVideoCount), locale)}${
              locale === "ko" ? "개" : ""
            }`
          : locale === "ko"
            ? "포함"
            : "Included",
    },
    {
      Icon: FileText,
      label: copy.unlockText,
      value: locale === "ko" ? "전체" : "Full",
    },
    {
      Icon: ImageIcon,
      label: copy.unlockImages,
      value:
        contentImageCount > 0
          ? `${formatTokenDisplay(String(contentImageCount), locale)}${
              locale === "ko" ? "개" : ""
            }`
          : locale === "ko"
            ? "선택"
            : "Optional",
    },
  ];
  const paidUnlockPaymentButtonLabel =
    paidUnlock.status === "creating"
      ? copy.preparing
      : paidUnlock.status === "sent" || paidUnlock.status === "verifying"
        ? copy.verifying
        : isUsdtBalancePending
          ? copy.balanceChecking
          : isInsufficientPaidUnlockBalance
            ? copy.balanceInsufficient
            : `${paidUnlockAmount} USDT ${copy.pay}`;

  const loadDetail = useCallback(async () => {
    if (!accountAddress) {
      return;
    }

    setLoadStatus("loading");
    setLoadError(null);

    try {
      const email =
        memberSessionEmail ??
        (await getThirdwebUserEmail({ client: thirdwebClient }));

      if (!email) {
        throw new Error(
          locale === "ko"
            ? "연결된 이메일을 확인하지 못했습니다."
            : "Could not resolve the connected email.",
        );
      }

      const searchParams = new URLSearchParams({
        email,
        locale,
        walletAddress: accountAddress,
      });

      if (referralCode) {
        searchParams.set("ref", referralCode);
      }

      const response = await fetchFanletterAccess(
        `/api/content/posts/${encodeURIComponent(contentId)}?${searchParams.toString()}`,
      );
      const data = (await response.json()) as
        | ContentDetailLoadResponse
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : locale === "ko"
              ? "콘텐츠 권한을 확인하지 못했습니다."
              : "Failed to verify content access.",
        );
      }

      if ("member" in data && data.member) {
        updateMemberSession({
          email: data.member.email,
          member: data.member,
          walletAddress: accountAddress,
        });
      }

      setDetail("content" in data ? data.content : null);
      setGateReason("gateReason" in data ? data.gateReason : null);
      setLoadStatus("ready");
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? locale === "ko"
            ? "열람 권한 확인 시간이 초과되었습니다. 다시 확인해 주세요."
            : "Checking content access timed out. Please try again."
          : error instanceof Error
          ? error.message
          : locale === "ko"
            ? "콘텐츠 권한을 확인하지 못했습니다."
            : "Failed to verify content access.";

      if (message === "Member not found.") {
        setDetail(null);
        setGateReason("signup");
        setLoadError(null);
        setLoadStatus("ready");
        return;
      }

      if (
        message === "This wallet is not authorized for the requested member." ||
        message === "Member session does not match this request."
      ) {
        setGateReason("connect");
        setLoadError(copy.walletMismatch);
        setLoadStatus("error");
        return;
      }

      setLoadError(translatePaidUnlockError(message, locale));
      setLoadStatus("error");
    }
  }, [
    accountAddress,
    copy.walletMismatch,
    contentId,
    locale,
    memberSessionEmail,
    referralCode,
    updateMemberSession,
  ]);

  useEffect(() => {
    accessLoadKeyRef.current = null;
    accessRefreshRequestedRef.current = false;
    paidOrderRef.current = null;
    paidRecipientWalletRef.current = null;
    setIsPaymentOpen(false);
    setPaidUnlock({
      error: null,
      order: null,
      recipientWalletAddress: null,
      status: "idle",
      txHash: null,
    });
  }, [accountAddress, contentId]);

  useEffect(() => {
    if (!detail?.canAccess || accessRefreshRequestedRef.current) {
      return;
    }

    accessRefreshRequestedRef.current = true;
    router.refresh();
  }, [detail?.canAccess, router]);

  useEffect(() => {
    if (isResolving) {
      return;
    }

    if (
      !hasThirdwebClientId ||
      connectionStatus !== "connected" ||
      !accountAddress
    ) {
      setDetail(null);
      setGateReason("connect");
      setLoadStatus("idle");
      setLoadError(null);
      accessLoadKeyRef.current = null;
      return;
    }

    const accessLoadKey = [
      accountAddress,
      contentId,
      referralCode ?? "",
      memberSessionEmail ?? "",
    ].join(":");

    if (accessLoadKeyRef.current === accessLoadKey) {
      return;
    }

    accessLoadKeyRef.current = accessLoadKey;
    void loadDetail();
  }, [
    accountAddress,
    contentId,
    connectionStatus,
    isResolving,
    loadDetail,
    memberSessionEmail,
    referralCode,
  ]);

  const ensurePaidUnlockOrder = useCallback(async () => {
    if (
      paidOrderRef.current &&
      paidRecipientWalletRef.current &&
      paidOrderRef.current.contentId === contentId &&
      paidOrderRef.current.status === "pending_payment"
    ) {
      return {
        order: paidOrderRef.current,
        recipientWalletAddress: paidRecipientWalletRef.current,
      };
    }

    if (!accountAddress) {
      throw new Error(copy.connectTitle);
    }

    if (isUsdtBalancePending) {
      throw new Error(copy.balanceChecking);
    }

    if (isInsufficientPaidUnlockBalance) {
      throw new Error(
        copy.walletBalance.replace("{amount}", paidUnlockAmount),
      );
    }

    setPaidUnlock((current) => ({
      ...current,
      error: null,
      status: "creating",
      txHash: null,
    }));

    const email =
      memberSessionEmail ??
      (await getThirdwebUserEmail({ client: thirdwebClient }));

    if (!email) {
      throw new Error(
        locale === "ko"
          ? "연결된 이메일을 확인하지 못했습니다."
          : "Could not resolve the connected email.",
      );
    }

    const response = await fetch("/api/content/orders", {
      body: JSON.stringify({
        contentId,
        email,
        referralCode,
        walletAddress: accountAddress,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const data = (await response.json()) as
      | ContentOrderCreateResponse
      | { error?: string };

    if (!response.ok || !("order" in data)) {
      if ("error" in data && data.error === "Content already unlocked.") {
        await loadDetail();
        setIsPaymentOpen(false);
        setPaidUnlock({
          error: null,
          order: null,
          recipientWalletAddress: null,
          status: "unlocked",
          txHash: null,
        });
      }

      throw new Error(
        "error" in data && data.error
          ? data.error
          : locale === "ko"
            ? "결제 주문을 만들지 못했습니다."
            : "Failed to create payment order.",
      );
    }

    paidOrderRef.current = data.order;
    paidRecipientWalletRef.current = data.recipientWalletAddress;
    setPaidUnlock({
      error: null,
      order: data.order,
      recipientWalletAddress: data.recipientWalletAddress,
      status: "idle",
      txHash: null,
    });

    return {
      order: data.order,
      recipientWalletAddress: data.recipientWalletAddress,
    };
  }, [
    accountAddress,
    copy.balanceChecking,
    contentId,
    copy.connectTitle,
    copy.walletBalance,
    isInsufficientPaidUnlockBalance,
    isUsdtBalancePending,
    loadDetail,
    locale,
    memberSessionEmail,
    paidUnlockAmount,
    referralCode,
  ]);

  const createPaidUnlockTransaction = useCallback(async () => {
    if (!walletUnlock.isUnlocked) {
      throw new Error(walletUnlock.copy.unlockRequired);
    }

    const preparedOrder = await ensurePaidUnlockOrder();

    setPaidUnlock((current) => ({
      ...current,
      error: null,
      order: preparedOrder.order,
      recipientWalletAddress: preparedOrder.recipientWalletAddress,
    }));

    return transfer({
      amount: preparedOrder.order.amountUsdt,
      contract: usdtContract,
      to: preparedOrder.recipientWalletAddress,
    });
  }, [
    ensurePaidUnlockOrder,
    walletUnlock.copy.unlockRequired,
    walletUnlock.isUnlocked,
  ]);

  const handlePaidUnlockSent = useCallback(
    (result: { transactionHash: string }) => {
      setPaidUnlock((current) => ({
        ...current,
        error: null,
        status: "sent",
        txHash: result.transactionHash,
      }));
    },
    [],
  );

  const verifyPaidUnlockTransaction = useCallback(
    ({ order, txHash }: { order: ContentOrderRecord; txHash: string }) => {
      void (async () => {
        if (!order || !accountAddress) {
          setPaidUnlock((current) => ({
            ...current,
            error:
              locale === "ko"
                ? "결제 주문 정보를 확인하지 못했습니다."
                : "Payment order is missing.",
            status: "error",
          }));
          return;
        }

        setPaidUnlock((current) => ({
          ...current,
          error: null,
          status: "verifying",
          txHash,
        }));

        try {
          const email =
            memberSessionEmail ??
            (await getThirdwebUserEmail({ client: thirdwebClient }));

          if (!email) {
            throw new Error(
              locale === "ko"
                ? "연결된 이메일을 확인하지 못했습니다."
                : "Could not resolve the connected email.",
            );
          }

          const response = await fetch(
            `/api/content/orders/${encodeURIComponent(order.orderId)}/verify`,
            {
              body: JSON.stringify({
                email,
                txHash,
                walletAddress: accountAddress,
              }),
              headers: {
                "Content-Type": "application/json",
              },
              method: "POST",
            },
          );
          const data = (await response.json()) as
            | ContentOrderVerifyResponse
            | { error?: string };

          if (!response.ok || !("order" in data)) {
            throw new Error(
              "error" in data && data.error
                ? data.error
                : locale === "ko"
                  ? "결제 검증에 실패했습니다."
                  : "Failed to verify payment.",
            );
          }

          setPaidUnlock((current) => ({
            ...current,
            error: null,
            order: data.order,
            status: "unlocked",
            txHash,
          }));
          paidOrderRef.current = data.order;
          setIsPaymentOpen(false);
          await loadDetail();
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : locale === "ko"
                ? "결제 검증에 실패했습니다."
                : "Failed to verify payment.";
          setPaidUnlock((current) => ({
            ...current,
            error: translatePaidUnlockError(message, locale),
            status: "error",
          }));
        }
      })();
    },
    [accountAddress, loadDetail, locale, memberSessionEmail],
  );

  const handlePaidUnlockConfirmed = useCallback(
    (receipt: { transactionHash: string }) => {
      const order = paidOrderRef.current;

      if (!order) {
        setPaidUnlock((current) => ({
          ...current,
          error:
            locale === "ko"
              ? "결제 주문 정보를 확인하지 못했습니다."
              : "Payment order is missing.",
          status: "error",
        }));
        return;
      }

      verifyPaidUnlockTransaction({
        order,
        txHash: receipt.transactionHash,
      });
    },
    [locale, verifyPaidUnlockTransaction],
  );

  const reloadOrRetryPaidUnlock = useCallback(() => {
    const order = paidOrderRef.current ?? paidUnlock.order;

    if (
      order &&
      paidUnlock.txHash &&
      (paidUnlock.status === "error" || paidUnlock.status === "sent")
    ) {
      verifyPaidUnlockTransaction({
        order,
        txHash: paidUnlock.txHash,
      });
      return;
    }

    void loadDetail();
  }, [
    loadDetail,
    paidUnlock.order,
    paidUnlock.status,
    paidUnlock.txHash,
    verifyPaidUnlockTransaction,
  ]);

  const handlePaidUnlockError = useCallback(
    (error: Error) => {
      if (error.message === "Content already unlocked.") {
        void loadDetail();
        setIsPaymentOpen(false);
        setPaidUnlock((current) => ({
          ...current,
          error: null,
          status: "unlocked",
        }));
        return;
      }

      setPaidUnlock((current) => ({
        ...current,
        error: translatePaidUnlockError(
          error.message ||
            (locale === "ko" ? "결제에 실패했습니다." : "Payment failed."),
          locale,
        ),
        status: "error",
      }));
    },
    [loadDetail, locale],
  );

  const openPayment = useCallback(() => {
    trackFunnelEvent("paid_unlock_click", {
      contentId,
      metadata: {
        amountUsdt: paidUnlockAmount,
        source: "fanletter-content-detail",
      },
      referralCode,
    });
    setPaidUnlock((current) => ({
      ...current,
      error: null,
    }));
    setIsPaymentOpen(true);
  }, [contentId, paidUnlockAmount, referralCode]);

  return (
    <section className="mt-6 overflow-hidden rounded-lg border border-[#44f26e]/28 bg-[linear-gradient(135deg,rgba(68,242,110,0.14)_0%,rgba(255,255,255,0.055)_48%,rgba(0,0,0,0.24)_100%)] text-white shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <div className="grid gap-0 lg:grid-cols-[0.84fr_1.16fr]">
        <div className="relative min-h-[18rem] border-b border-white/10 bg-black/30 lg:border-b-0 lg:border-r">
          {displayCoverImageUrl ? (
            <Image
              alt={displayTitle}
              className="object-cover"
              fill
              sizes="(max-width: 1024px) 100vw, 38vw"
              src={displayCoverImageUrl}
            />
          ) : (
            <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(145deg,#07100b,#102019_56%,#1a3722)]">
              <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(68,242,110,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(68,242,110,0.12)_1px,transparent_1px)] [background-size:34px_34px]" />
              <div className="absolute left-1/2 top-[38%] flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-[#44f26e]/26 bg-[#44f26e]/12 text-[#44f26e] shadow-[0_0_44px_rgba(68,242,110,0.16)]">
                <LockKeyhole className="size-9" />
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.68)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <span className="inline-flex rounded-full bg-[#44f26e] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-black">
              {paidUnlockAmount} USDT
            </span>
            <h2 className="mt-3 break-words text-2xl font-semibold leading-tight">
              {displayTitle}
            </h2>
            <p className="mt-2 line-clamp-3 text-sm font-medium leading-6 text-white/70">
              {displaySummary}
            </p>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {isUnlocked ? (
            <FanletterPaidUnlockedContent
              body={detail?.body ?? displayBody}
              copy={copy}
              content={detail}
              priceLabel={`${paidUnlockAmount} USDT`}
              title={displayTitle}
            />
          ) : (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                {copy.lockedEyebrow}
              </p>
              <div className="mt-3 flex items-start gap-3">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                  <LockKeyhole className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="break-words text-2xl font-semibold leading-tight">
                    {copy.lockedTitle}
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/64">
                    {copy.lockedBody}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-white/10 bg-black/24 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                  {copy.preview}
                </p>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm font-medium leading-7 text-white/74">
                  {displayBody}
                </p>
              </div>

              <div className="mt-4 rounded-lg border border-[#44f26e]/18 bg-[#44f26e]/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b9ffc8]">
                  {copy.unlockBody}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {unlockItems.map(({ Icon, label, value }) => (
                    <div
                      className="rounded-lg border border-white/10 bg-black/22 p-3"
                      key={label}
                    >
                      <span className="inline-flex size-8 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                        <Icon className="size-4" />
                      </span>
                      <p className="mt-3 text-lg font-semibold leading-none text-white">
                        {value}
                      </p>
                      <p className="mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/44">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {shouldShowLoading ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-white/72">
                  <LoaderCircle className="size-4 animate-spin" />
                  {copy.accessChecking}
                </div>
              ) : null}

              {loadError || paidUnlock.error ? (
                <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-medium leading-6 text-red-100">
                  {paidUnlock.error ?? loadError}
                </p>
              ) : null}

              {paidUnlock.txHash ? (
                <a
                  className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#b9ffc8] underline"
                  href={`${BSC_EXPLORER}/tx/${paidUnlock.txHash}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  {copy.transaction}
                  <ExternalLink className="size-3.5" />
                </a>
              ) : null}

              <FanletterPaidUnlockActions
                connectHref={connectHref}
                copy={copy}
                creatorHref={creatorHref}
                gateReason={gateReason}
                isDisconnected={isDisconnected}
                isInsufficientPaidUnlockBalance={isInsufficientPaidUnlockBalance}
                isResolving={shouldShowLoading}
                onOpenPayment={openPayment}
                onReload={reloadOrRetryPaidUnlock}
                onboardingHref={onboardingHref}
                paidUnlockAmount={paidUnlockAmount}
                paidUnlockStatus={paidUnlock.status}
              />
            </div>
          )}
        </div>
      </div>

      {isPaymentOpen ? (
        <div className="fixed inset-0 z-[170] flex items-end justify-center bg-black/68 px-0 backdrop-blur-sm sm:items-center sm:px-4">
          <div className="max-h-[92svh] w-full max-w-[520px] overflow-y-auto rounded-t-[28px] border border-white/12 bg-[#08110c] p-4 text-white shadow-[0_-24px_70px_rgba(0,0,0,0.38)] sm:rounded-[28px] sm:p-5">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/18 sm:hidden" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                  FanLetter
                </p>
                <h2 className="mt-2 text-xl font-semibold">
                  {copy.paymentTitle}
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-white/62">
                  {copy.paymentBody}
                </p>
              </div>
              <button
                aria-label={copy.cancel}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/64 transition hover:bg-white/12 hover:text-white disabled:opacity-40"
                disabled={
                  paidUnlock.status === "creating" ||
                  paidUnlock.status === "sent" ||
                  paidUnlock.status === "verifying"
                }
                onClick={() => {
                  setIsPaymentOpen(false);
                }}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.045] p-4">
              <p className="line-clamp-2 text-sm font-semibold leading-5">
                {displayTitle}
              </p>
              <div className="mt-4 grid gap-3 text-sm">
                <PaymentRow label={copy.amount} value={`${paidUnlockAmount} USDT`} />
                <PaymentBalanceRow
                  label={copy.walletBalanceLabel}
                  status={paidUnlockBalanceStatus}
                  statusClassName={paidUnlockBalanceStatusClassName}
                  value={paidUnlockBalanceLabel}
                />
                <PaymentRow
                  label={copy.memberWallet}
                  value={formatAddressLabel(accountAddress)}
                />
                <PaymentRow
                  label={copy.sellerWallet}
                  value={
                    paidUnlock.recipientWalletAddress
                      ? formatAddressLabel(paidUnlock.recipientWalletAddress)
                      : locale === "ko"
                        ? "승인 시 지정"
                        : "On approval"
                  }
                />
                {paidUnlock.order ? (
                  <PaymentRow
                    label={copy.order}
                    value={paidUnlock.order.orderId.slice(0, 8)}
                  />
                ) : null}
              </div>
            </div>

            <p className="mt-3 rounded-lg border border-[#44f26e]/24 bg-[#44f26e]/10 px-3 py-2 text-xs font-medium leading-5 text-[#d8ffe0]">
              {copy.walletApproval}
            </p>

            {isInsufficientPaidUnlockBalance ? (
              <p className="mt-3 rounded-lg border border-amber-300/28 bg-amber-300/10 px-3 py-2 text-sm font-medium leading-6 text-amber-100">
                {copy.walletBalance.replace("{amount}", paidUnlockAmount)}
              </p>
            ) : null}

            {paidUnlock.error ? (
              <p className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-medium leading-6 text-red-100">
                {paidUnlock.error}
              </p>
            ) : null}

            <div className="mt-5 grid gap-2.5 sm:grid-cols-[0.82fr_1.18fr]">
              <button
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={
                  paidUnlock.status === "creating" ||
                  paidUnlock.status === "sent" ||
                  paidUnlock.status === "verifying"
                }
                onClick={() => {
                  setIsPaymentOpen(false);
                }}
                type="button"
              >
                {copy.cancel}
              </button>
              {!walletUnlock.isUnlocked ? (
                <WalletUnlockAction
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
                  href={walletUnlock.unlockHref}
                >
                  {walletUnlock.copy.unlockAction}
                </WalletUnlockAction>
              ) : paidUnlock.status === "error" &&
                paidUnlock.txHash &&
                paidUnlock.order ? (
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={reloadOrRetryPaidUnlock}
                  type="button"
                >
                  <RefreshCw className="size-4" />
                  {copy.retryVerification}
                </button>
              ) : (
                <TransactionButton
                  className="inline-flex h-12 items-center justify-center rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={
                    !accountAddress ||
                    isUsdtBalancePending ||
                    isInsufficientPaidUnlockBalance ||
                    paidUnlock.status === "creating" ||
                    paidUnlock.status === "sent" ||
                    paidUnlock.status === "verifying"
                  }
                  onError={handlePaidUnlockError}
                  onTransactionConfirmed={handlePaidUnlockConfirmed}
                  onTransactionSent={handlePaidUnlockSent}
                  transaction={createPaidUnlockTransaction}
                  type="button"
                  unstyled
                >
                  <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                    <Coins className="size-4 shrink-0" />
                    <span>{paidUnlockPaymentButtonLabel}</span>
                  </span>
                </TransactionButton>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function FanletterPaidUnlockActions({
  connectHref,
  copy,
  creatorHref,
  gateReason,
  isDisconnected,
  isInsufficientPaidUnlockBalance,
  isResolving,
  onOpenPayment,
  onReload,
  onboardingHref,
  paidUnlockAmount,
  paidUnlockStatus,
}: {
  connectHref: string;
  copy: ReturnType<typeof getCopy>;
  creatorHref: string;
  gateReason: ContentDetailLoadResponse["gateReason"];
  isDisconnected: boolean;
  isInsufficientPaidUnlockBalance: boolean;
  isResolving: boolean;
  onOpenPayment: () => void;
  onReload: () => void;
  onboardingHref: string;
  paidUnlockAmount: string;
  paidUnlockStatus: PaidUnlockState["status"];
}) {
  if (isDisconnected || gateReason === "connect") {
    return (
      <div className="mt-5 rounded-lg border border-white/10 bg-black/24 p-4">
        <p className="text-sm font-semibold">{copy.connectTitle}</p>
        <p className="mt-2 text-sm font-medium leading-6 text-white/58">
          {copy.connectBody}
        </p>
        <Link
          className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
          href={connectHref}
        >
          {copy.connectCta}
        </Link>
      </div>
    );
  }

  if (gateReason === "signup") {
    return (
      <div className="mt-5 rounded-lg border border-white/10 bg-black/24 p-4">
        <p className="text-sm font-semibold">{copy.signupTitle}</p>
        <p className="mt-2 text-sm font-medium leading-6 text-white/58">
          {copy.signupBody}
        </p>
        <Link
          className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[#44f26e] px-4 text-sm font-semibold !text-black transition hover:bg-[#64ff84]"
          href={onboardingHref}
        >
          {copy.signupCta}
        </Link>
      </div>
    );
  }

  if (gateReason === "network") {
    return (
      <div className="mt-5 rounded-lg border border-white/10 bg-black/24 p-4">
        <p className="text-sm font-semibold">{copy.networkTitle}</p>
        <p className="mt-2 text-sm font-medium leading-6 text-white/58">
          {copy.networkBody}
        </p>
        <Link
          className="mt-4 inline-flex h-11 items-center justify-center rounded-full border border-white/14 px-4 text-sm font-semibold !text-white transition hover:bg-white/10"
          href={creatorHref}
        >
          {copy.networkCta}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
      <button
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold text-black transition hover:bg-[#64ff84] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={
          isResolving ||
          isInsufficientPaidUnlockBalance ||
          paidUnlockStatus === "creating" ||
          paidUnlockStatus === "sent" ||
          paidUnlockStatus === "verifying"
        }
        onClick={onOpenPayment}
        type="button"
      >
        {paidUnlockStatus === "creating" ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Coins className="size-4" />
        )}
        {paidUnlockStatus === "creating"
          ? copy.preparing
          : paidUnlockStatus === "sent" || paidUnlockStatus === "verifying"
            ? copy.verifying
            : `${paidUnlockAmount} USDT ${copy.pay}`}
      </button>
      <button
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/14 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
        onClick={onReload}
        type="button"
      >
        <RefreshCw className="size-4" />
        {copy.reload}
      </button>
    </div>
  );
}

function PaymentRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/50">{label}</span>
      <span className="min-w-0 truncate font-mono text-xs font-semibold text-white">
        {value}
      </span>
    </div>
  );
}

function PaymentBalanceRow({
  label,
  status,
  statusClassName,
  value,
}: {
  label: string;
  status: string;
  statusClassName: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/50">{label}</span>
      <span className="flex min-w-0 items-center justify-end gap-2">
        <span className="min-w-0 truncate font-mono text-xs font-semibold text-white">
          {value}
        </span>
        <span
          className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${statusClassName}`}
        >
          {status}
        </span>
      </span>
    </div>
  );
}

function FanletterPaidUnlockedContent({
  body,
  content,
  copy,
  priceLabel,
  title,
}: {
  body: string;
  content: ContentDetailRecord | null;
  copy: ReturnType<typeof getCopy>;
  priceLabel: string;
  title: string;
}) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
          <CheckCircle2 className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="break-words text-2xl font-semibold leading-tight">
              {copy.alreadyUnlocked}
            </h2>
            <span className="rounded-full border border-[#44f26e]/40 bg-[#44f26e]/12 px-2.5 py-1 text-xs font-semibold text-[#b9ffc8]">
              {priceLabel}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium leading-6 text-white/64">
            {copy.alreadyUnlockedBody}
          </p>
        </div>
      </div>

      {mediaCountForContent(content) > 0 ? (
        <section className="mt-5">
          <div className="mb-3 flex items-center gap-2">
            <PlayCircle className="size-4 text-[#44f26e]" />
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/48">
              {copy.fullMedia}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {content?.contentVideoUrls.map((videoUrl) => (
              <div
                className="overflow-hidden rounded-lg border border-white/10 bg-black"
                key={videoUrl}
              >
                <FanletterAutoplayVideo
                  className="aspect-[9/14] w-full object-cover"
                  controls
                  src={videoUrl}
                  title={title}
                />
              </div>
            ))}
            {content?.contentImageUrls.map((imageUrl) => (
              <div
                className="relative aspect-[9/14] overflow-hidden rounded-lg border border-white/10 bg-black"
                key={imageUrl}
              >
                <Image
                  alt={title}
                  className="object-cover"
                  fill
                  sizes="(max-width: 640px) 50vw, 280px"
                  src={imageUrl}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-5 rounded-lg bg-white p-4 text-black">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/42">
          {copy.fullBody}
        </p>
        <p className="mt-3 whitespace-pre-wrap break-words text-base font-medium leading-8 text-black/74">
          {body}
        </p>
      </section>
    </div>
  );
}

function mediaCountForContent(content: ContentDetailRecord | null) {
  return (
    (content?.contentVideoUrls.length ?? 0) +
    (content?.contentImageUrls.length ?? 0)
  );
}
