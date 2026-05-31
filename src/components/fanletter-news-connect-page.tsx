"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clapperboard,
  Home,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Newspaper,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  type LucideIcon,
  UserRound,
  UsersRound,
  WalletMinimal,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useActiveAccount,
  useActiveWallet,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
  useDisconnect,
} from "thirdweb/react";

import { EmailLoginDialog } from "@/components/email-login-dialog";
import { useMemberSession } from "@/components/member-session-provider";
import { readFanletterShareAttributionFromReturnPath } from "@/lib/fanletter-share-attribution";
import type { Dictionary, Locale } from "@/lib/i18n";
import type { MemberRecord } from "@/lib/member";
import { syncServerMemberRegistration } from "@/lib/member-session-client";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import {
  hasThirdwebClientId,
  smartWalletChain,
  thirdwebClient,
} from "@/lib/thirdweb";
import {
  getThirdwebUserEmail,
  useThirdwebConnectionState,
} from "@/lib/thirdweb-client";

type FanletterNewsConnectStatus = "error" | "idle" | "ready" | "syncing";

type FanletterNewsConnectSyncState = {
  email: string | null;
  error: string | null;
  member: MemberRecord | null;
  status: FanletterNewsConnectStatus;
  validationError: string | null;
};

type NewsReturnKind =
  | "article"
  | "character"
  | "characters"
  | "home"
  | "listing"
  | "my"
  | "newReport"
  | "newVlog"
  | "purchases"
  | "reporter"
  | "reporters"
  | "reports"
  | "vlog"
  | "vlogManage"
  | "wallet";

const NEWS_CONNECT_DISCONNECTED_GRACE_MS = 4500;

const emptySyncState: FanletterNewsConnectSyncState = {
  email: null,
  error: null,
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
        accountBody:
          "FanLetter News의 구매함, 팬 기자 리포트, 브이로그 관리가 같은 회원 계정으로 이어지도록 이메일 지갑을 연결합니다.",
        accountReady: "뉴스 계정 연결 완료",
        activate: "가입 완료하기",
        checking: "연결 상태 확인 중",
        connect: "뉴스 지갑 연결",
        connectBody:
          "이메일 지갑을 연결하면 리포트, 공유자 정보, 구매 내역이 한 계정으로 정리됩니다.",
        connectedBody:
          "연결이 확인되었습니다. 선택한 화면으로 바로 이동하거나 뉴스 지갑을 확인할 수 있습니다.",
        disconnected: "뉴스 지갑이 아직 연결되지 않았습니다.",
        edition: "FanLetter Entertainment News",
        email: "이메일",
        errorTitle: "계정 확인이 필요합니다.",
        eyebrow: "FanLetter News Wallet",
        homeReturn: "FanLetter News 홈으로 돌아가기",
        loginTitle: "FanLetter News 지갑 연결",
        member: "회원 상태",
        missingClient:
          "현재 브라우저에서 이메일 지갑 연결을 시작할 수 없습니다. 잠시 후 다시 시도하세요.",
        paymentBody:
          "계정은 연결되었지만 시작 준비 확인이 필요합니다. 확인을 마치면 선택한 화면으로 이동합니다.",
        paymentTitle: "가입 완료가 필요합니다.",
        reconnect: "다시 확인",
        returnLabel: "돌아갈 화면",
        routeTitle: "연결 후 이동",
        signOut: "연결 해제",
        siteName: "FanLetter News",
        statusDesk: "뉴스 계정 데스크",
        steps: ["이메일 지갑 연결", "회원 정보 확인", "선택 화면으로 이동"],
        syncing: "뉴스 계정을 확인하고 있습니다.",
        title: "뉴스 활동을 이어갈 계정 연결",
        wallet: "뉴스 지갑 관리",
        walletId: "연결 ID",
      }
    : {
        account: "News account",
        accountBody:
          "Connect an email wallet so purchases, reporter activity, and vlog management stay attached to one FanLetter News member account.",
        accountReady: "News account connected",
        activate: "Verify signup",
        checking: "Checking connection",
        connect: "Connect news wallet",
        connectBody:
          "Connect with email so reports, sharer identity, and purchases are organized under one account.",
        connectedBody:
          "Connection is ready. Continue to the selected screen or review your FanLetter News wallet.",
        disconnected: "No news wallet is connected yet.",
        edition: "FanLetter Entertainment News",
        email: "Email",
        errorTitle: "Account status needs attention.",
        eyebrow: "FanLetter News Wallet",
        homeReturn: "Back to FanLetter News",
        loginTitle: "Connect FanLetter News wallet",
        member: "Member status",
        missingClient:
          "Email wallet connection cannot start in this browser right now. Please try again shortly.",
        paymentBody:
          "The account is connected, but signup verification is required. Complete it, then continue to the selected screen.",
        paymentTitle: "Signup verification is required.",
        reconnect: "Check again",
        returnLabel: "Destination",
        routeTitle: "Continue after connection",
        signOut: "Disconnect",
        siteName: "FanLetter News",
        statusDesk: "News Account Desk",
        steps: ["Email wallet", "Member check", "Continue"],
        syncing: "Checking your news account.",
        title: "Connect your account to continue",
        wallet: "News wallet",
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
      ? "시작 준비 완료"
      : "Ready"
    : locale === "ko"
      ? "확인 필요"
      : "Needs verification";
}

function getReturnKind(returnToHref: string, locale: Locale): NewsReturnKind {
  const pathname =
    returnToHref.split(/[?#]/, 1)[0]?.replace(/\/+$/, "") || "/";
  const newsBasePath = `/${locale}/fanletter/news`;

  if (pathname === newsBasePath) {
    return "home";
  }

  if (pathname === `${newsBasePath}/my`) {
    return "my";
  }

  if (pathname === `${newsBasePath}/reports/new`) {
    return "newReport";
  }

  if (pathname === `${newsBasePath}/reports`) {
    return "reports";
  }

  if (pathname === `${newsBasePath}/vlogs/new`) {
    return "newVlog";
  }

  if (pathname === `${newsBasePath}/vlogs/manage`) {
    return "vlogManage";
  }

  if (pathname.startsWith(`${newsBasePath}/vlogs/`)) {
    return "vlog";
  }

  if (pathname === `${newsBasePath}/purchases`) {
    return "purchases";
  }

  if (pathname === `${newsBasePath}/wallet`) {
    return "wallet";
  }

  if (pathname === `${newsBasePath}/characters`) {
    return "characters";
  }

  if (pathname.startsWith(`${newsBasePath}/characters/`)) {
    return "character";
  }

  if (pathname === `${newsBasePath}/reporters`) {
    return "reporters";
  }

  if (pathname.startsWith(`${newsBasePath}/reporters/`)) {
    return "reporter";
  }

  if (
    pathname.startsWith(`${newsBasePath}/`) &&
    pathname !== `${newsBasePath}/connect` &&
    pathname !== `${newsBasePath}/activate`
  ) {
    return "article";
  }

  return "listing";
}

function getReturnDestination(kind: NewsReturnKind, locale: Locale): {
  Icon: LucideIcon;
  body: string;
  label: string;
} {
  const ko = locale === "ko";

  switch (kind) {
    case "home":
      return {
        Icon: Home,
        body: ko
          ? "FanLetter News 홈에서 주요 뉴스, 캐릭터, 팬 기자 흐름을 다시 볼 수 있습니다."
          : "Return to the FanLetter News home for featured news, characters, and reporters.",
        label: ko ? "FanLetter News 홈으로 돌아가기" : "Back to FanLetter News",
      };
    case "my":
      return {
        Icon: LayoutDashboard,
        body: ko
          ? "내 구매함, 리포트, 브이로그 관리 현황을 한 화면에서 이어봅니다."
          : "Continue to your purchases, reports, and vlog management hub.",
        label: ko ? "마이페이지로 돌아가기" : "Back to My News",
      };
    case "reports":
      return {
        Icon: Newspaper,
        body: ko
          ? "작성한 팬 기자 리포트와 리워드 상태를 계속 확인합니다."
          : "Continue reviewing your fan reporter reports and reward status.",
        label: ko ? "내 리포트로 돌아가기" : "Back to my reports",
      };
    case "newReport":
      return {
        Icon: Newspaper,
        body: ko
          ? "계정 연결 후 바로 팬 기자 리포트 작성 화면으로 돌아갑니다."
          : "Return directly to the fan reporter composer after connecting.",
        label: ko ? "새 리포트 작성으로 돌아가기" : "Back to new report",
      };
    case "newVlog":
      return {
        Icon: Clapperboard,
        body: ko
          ? "휴대폰 영상 업로드와 뉴스 공개 설정을 이어서 진행합니다."
          : "Continue phone video upload and News publishing setup.",
        label: ko ? "새 브이로그 등록으로 돌아가기" : "Back to new vlog",
      };
    case "vlogManage":
      return {
        Icon: Clapperboard,
        body: ko
          ? "뉴스에 공개할 브이로그 업로드, 수정, 노출 상태를 관리합니다."
          : "Manage uploads, edits, and News exposure for your vlogs.",
        label: ko ? "브이로그 관리로 돌아가기" : "Back to vlog management",
      };
    case "vlog":
      return {
        Icon: Clapperboard,
        body: ko
          ? "열람하려던 원본 브이로그와 공개 컷을 계속 확인합니다."
          : "Continue to the original vlog and its public preview.",
        label: ko ? "브이로그로 돌아가기" : "Back to vlog",
      };
    case "purchases":
      return {
        Icon: ShoppingBag,
        body: ko
          ? "구매한 팬 전용 콘텐츠와 결제 내역을 다시 확인합니다."
          : "Return to purchased fan-only content and payment history.",
        label: ko ? "구매함으로 돌아가기" : "Back to purchases",
      };
    case "wallet":
      return {
        Icon: WalletMinimal,
        body: ko
          ? "뉴스 지갑의 결제, 정산, 입출금 상태를 이어서 확인합니다."
          : "Continue to News wallet payments, settlement, and transfers.",
        label: ko ? "뉴스 지갑으로 돌아가기" : "Back to News wallet",
      };
    case "characters":
      return {
        Icon: Sparkles,
        body: ko
          ? "AI 캐릭터 IP 목록과 인기 캐릭터 홍보 영역으로 돌아갑니다."
          : "Return to AI character IP discovery and promotion.",
        label: ko ? "AI 캐릭터 목록으로 돌아가기" : "Back to AI characters",
      };
    case "character":
      return {
        Icon: Sparkles,
        body: ko
          ? "보고 있던 AI 캐릭터 채널과 공개 브이로그를 계속 봅니다."
          : "Continue to the AI character channel and public vlogs.",
        label: ko ? "AI 캐릭터 채널로 돌아가기" : "Back to character channel",
      };
    case "reporters":
      return {
        Icon: UsersRound,
        body: ko
          ? "팬 기자 전체 목록과 리포터 홍보 영역으로 돌아갑니다."
          : "Return to the fan reporter directory and promotion area.",
        label: ko ? "팬 기자 목록으로 돌아가기" : "Back to fan reporters",
      };
    case "reporter":
      return {
        Icon: UserRound,
        body: ko
          ? "보고 있던 팬 기자 프로필과 작성 리포트를 계속 확인합니다."
          : "Continue to the fan reporter profile and reports.",
        label: ko ? "팬 기자 프로필로 돌아가기" : "Back to reporter profile",
      };
    case "article":
      return {
        Icon: Newspaper,
        body: ko
          ? "읽고 있던 뉴스 기사, 공유자 정보, 원본 브이로그로 돌아갑니다."
          : "Return to the news article, sharer context, and source vlog.",
        label: ko ? "읽던 뉴스로 돌아가기" : "Back to the news",
      };
    case "listing":
    default:
      return {
        Icon: Newspaper,
        body: ko
          ? "뉴스룸 목록으로 돌아가 다시 탐색을 이어갑니다."
          : "Return to the newsroom listing and continue browsing.",
        label: ko ? "뉴스룸으로 돌아가기" : "Back to newsroom",
      };
  }
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
        "rounded-lg border px-3 py-3",
        done
          ? "border-[#16702e]/28 bg-[#e5f7df] text-[#111510]"
          : "border-black/10 bg-white text-black/58",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-current/18 text-[0.68rem] font-bold">
            {index + 1}
          </span>
          <p className="truncate text-[0.68rem] font-bold uppercase tracking-[0.1em]">
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

function AccountInfoRow({
  Icon,
  label,
  value,
  variant = "light",
}: {
  Icon: LucideIcon;
  label: string;
  value: string | null;
  variant?: "dark" | "light";
}) {
  const isDark = variant === "dark";

  return (
    <div
      className={joinClasses(
        "grid gap-1 border-b py-3 last:border-b-0 sm:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)] sm:items-center sm:gap-3",
        isDark ? "border-white/10" : "border-black/10",
      )}
    >
      <dt
        className={joinClasses(
          "flex min-w-0 items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.1em]",
          isDark ? "text-white/44" : "text-black/42",
        )}
      >
        <Icon
          className={joinClasses(
            "size-4 shrink-0",
            isDark ? "text-[#44f26e]" : "text-[#16702e]",
          )}
        />
        <span className="truncate">{label}</span>
      </dt>
      <dd
        className={joinClasses(
          "min-w-0 truncate text-sm font-bold sm:text-right",
          isDark ? "text-white" : "text-[#111510]",
        )}
      >
        {value ?? "-"}
      </dd>
    </div>
  );
}

export function FanletterNewsConnectPage({
  dictionary,
  locale,
  referralCode,
  returnToHref,
}: {
  dictionary: Dictionary;
  locale: Locale;
  referralCode: string | null;
  returnToHref: string;
}) {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const connectionStatus = useActiveWalletConnectionStatus();
  const { disconnect } = useDisconnect();
  const memberSession = useMemberSession();
  const { clearMemberSession, updateMemberSession } = memberSession;
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [syncState, setSyncState] =
    useState<FanletterNewsConnectSyncState>(emptySyncState);
  const [syncNonce, setSyncNonce] = useState(0);
  const syncInFlightRef = useRef(false);
  const copy = getCopy(locale);
  const accountAddress = account?.address ?? null;
  const accountLabel = formatAddressLabel(accountAddress);
  const returnKind = getReturnKind(returnToHref, locale);
  const returnDestination = getReturnDestination(returnKind, locale);
  const ReturnDestinationIcon = returnDestination.Icon;
  const returnLabel = returnDestination.label;
  const fanletterShareAttribution = useMemo(
    () => readFanletterShareAttributionFromReturnPath(returnToHref),
    [returnToHref],
  );
  const connection = useThirdwebConnectionState({
    accountAddress,
    clientConfigured: hasThirdwebClientId,
    disconnectedResolveGraceMs: NEWS_CONNECT_DISCONNECTED_GRACE_MS,
    resolveGraceMs: NEWS_CONNECT_DISCONNECTED_GRACE_MS,
    status: connectionStatus,
  });
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const activateHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/activate`, referralCode),
    { returnTo: returnToHref },
  );
  const walletHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/wallet`, referralCode),
    { returnTo: returnToHref },
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
  const cardTitle = memberIsCompleted
    ? copy.accountReady
    : memberNeedsPayment
      ? copy.paymentTitle
      : syncState.status === "error"
        ? copy.errorTitle
        : connection.isResolving
          ? copy.checking
          : connection.isConnected
            ? copy.syncing
            : copy.disconnected;
  const cardBody = memberIsCompleted
    ? copy.connectedBody
    : memberNeedsPayment
      ? copy.paymentBody
      : connection.isResolving
        ? copy.checking
        : connection.isConnected
          ? copy.syncing
          : copy.connectBody;

  useEffect(() => {
    if (connectionStatus === "connected") {
      setIsLoginDialogOpen(false);
    }
  }, [connectionStatus]);

  useEffect(() => {
    if (!connection.isConnected || !accountAddress) {
      setSyncState(emptySyncState);
      return;
    }

    let isCancelled = false;

    async function syncMember() {
      if (!accountAddress || syncInFlightRef.current) {
        return;
      }

      syncInFlightRef.current = true;
      setSyncState({
        email: cachedSessionEmail,
        error: null,
        member: cachedSessionMember,
        status: cachedSessionMember ? "ready" : "syncing",
        validationError: null,
      });

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
          syncMode: "full",
          walletAddress: accountAddress,
        });

        if (!result.ok) {
          throw new Error(result.error || dictionary.member.errors.syncFailed);
        }

        if (!result.member) {
          throw new Error(dictionary.member.errors.syncFailed);
        }

        if (isCancelled) {
          return;
        }

        updateMemberSession({
          email: result.member.email,
          member: result.member,
          walletAddress: accountAddress,
        });
        setSyncState({
          email: result.member.email,
          error: null,
          member: result.member,
          status: "ready",
          validationError: result.validationError,
        });
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
    syncNonce,
    updateMemberSession,
  ]);

  function handleDisconnect() {
    clearMemberSession(accountAddress);

    if (wallet) {
      void disconnect(wallet);
    }
  }

  function handleRetry() {
    if (syncInFlightRef.current) {
      return;
    }

    setSyncNonce((current) => current + 1);
  }

  const steps = copy.steps.map((step, index) => (
    <StepStatus
      done={
        index === 0
          ? connection.isConnected
          : index === 1
            ? Boolean(connectedMember || syncState.email)
            : memberIsCompleted
      }
      index={index}
      key={step}
      label={step}
      loading={
        (index === 0 && connection.isResolving) ||
        (index === 1 && syncState.status === "syncing")
      }
    />
  ));

  return (
    <main className="min-h-screen bg-[#eef1ec] pb-[calc(6.25rem+env(safe-area-inset-bottom))] text-[#111510] sm:pb-0">
      <EmailLoginDialog
        dictionary={dictionary}
        onClose={() => {
          setIsLoginDialogOpen(false);
        }}
        open={isLoginDialogOpen}
        title={copy.loginTitle}
        variant="fanletter"
      />

      <header className="border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-6 lg:px-8">
          <Link
            className="inline-flex min-w-0 items-center gap-2 !text-[#111510]"
            href={newsHomeHref}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#111510] text-[#44f26e]">
              <Newspaper className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-bold leading-tight sm:text-lg">
                {copy.siteName}
              </span>
              <span className="hidden truncate text-xs font-semibold text-black/46 sm:block">
                {copy.edition}
              </span>
            </span>
          </Link>
          <Link
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-black/12 bg-[#f7f8f4] px-3 text-sm font-bold !text-[#111510] transition hover:border-[#16702e]/36 hover:bg-[#ecfff0]"
            href={returnToHref}
            aria-label={returnLabel}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden max-w-[16rem] truncate sm:inline">
              {returnLabel}
            </span>
            <span className="sm:hidden">
              {locale === "ko" ? "돌아가기" : "Back"}
            </span>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-2 py-3 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-5">
          <section className="min-w-0 rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_52px_rgba(17,21,16,0.08)] sm:p-6 lg:p-7">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#16702e]">
              {copy.eyebrow}
            </p>
            <h1 className="mt-3 max-w-4xl break-words text-[1.8rem] font-bold leading-[1.12] tracking-normal [word-break:keep-all] sm:text-[2.7rem] lg:text-[3.1rem]">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-black/62 [word-break:keep-all] sm:text-base sm:leading-7">
              {copy.accountBody}
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">{steps}</div>
          </section>

          <aside className="rounded-lg bg-[#111510] p-4 text-white shadow-[0_18px_50px_rgba(17,21,16,0.16)] sm:p-5 lg:sticky lg:top-5 lg:row-span-2 lg:self-start">
            <div className="flex items-start gap-3">
              <span
                className={joinClasses(
                  "flex size-12 shrink-0 items-center justify-center rounded-lg",
                  memberIsCompleted
                    ? "bg-[#44f26e] text-black"
                    : memberNeedsPayment
                      ? "bg-amber-200 text-amber-950"
                      : syncState.status === "error"
                        ? "bg-red-100 text-red-900"
                        : "bg-white/10 text-white",
                )}
              >
                {memberIsCompleted ? (
                  <CheckCircle2 className="size-6" />
                ) : memberNeedsPayment ? (
                  <ShieldCheck className="size-6" />
                ) : syncState.status === "error" ? (
                  <CircleAlert className="size-6" />
                ) : connection.isResolving || syncState.status === "syncing" ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : (
                  <WalletMinimal className="size-6" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#44f26e]">
                  {copy.statusDesk}
                </p>
                <h2 className="mt-1 break-words text-2xl font-bold leading-tight [word-break:keep-all]">
                  {cardTitle}
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-white/62 [word-break:keep-all]">
                  {cardBody}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              {memberIsCompleted ? (
                <>
                  <Link
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-bold !text-black transition hover:bg-[#69ff8c]"
                    href={returnToHref}
                  >
                    {returnLabel}
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/14 px-5 text-sm font-bold !text-white transition hover:bg-white hover:!text-[#111510]"
                    href={walletHref}
                  >
                    <WalletMinimal className="size-4" />
                    {copy.wallet}
                  </Link>
                </>
              ) : memberNeedsPayment ? (
                <Link
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-amber-200 px-5 text-sm font-bold !text-amber-950 transition hover:bg-amber-300"
                  href={activateHref}
                >
                  <ShieldCheck className="size-4" />
                  {copy.activate}
                </Link>
              ) : connection.isConnected ? (
                <button
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/14 px-5 text-sm font-bold text-white transition hover:bg-white hover:text-[#111510]"
                  onClick={handleRetry}
                  type="button"
                >
                  <RefreshCw className="size-4" />
                  {copy.reconnect}
                </button>
              ) : (
                <button
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-bold text-black transition hover:bg-[#69ff8c] disabled:cursor-not-allowed disabled:bg-white/12 disabled:text-white/38"
                  disabled={!hasThirdwebClientId}
                  onClick={() => setIsLoginDialogOpen(true)}
                  type="button"
                >
                  <Mail className="size-4" />
                  {hasThirdwebClientId ? copy.connect : copy.missingClient}
                </button>
              )}
              {connection.isConnected ? (
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/14 px-5 text-sm font-bold text-white/62 transition hover:bg-white hover:text-[#111510]"
                  onClick={handleDisconnect}
                  type="button"
                >
                  <LogOut className="size-4" />
                  {copy.signOut}
                </button>
              ) : null}
            </div>

            <dl className="mt-5 hidden border-y border-white/10 sm:block">
              <AccountInfoRow
                Icon={Mail}
                label={copy.email}
                value={syncState.email ?? cachedSessionEmail}
                variant="dark"
              />
              <AccountInfoRow
                Icon={UserRound}
                label={copy.member}
                value={getMemberStatusLabel(connectedMember, locale)}
                variant="dark"
              />
              <AccountInfoRow
                Icon={WalletMinimal}
                label={copy.walletId}
                value={accountLabel}
                variant="dark"
              />
            </dl>

            {syncState.error || syncState.validationError ? (
              <div className="mt-4 rounded-lg border border-red-300/20 bg-red-500/12 p-3 text-sm font-semibold leading-6 text-red-100">
                <div className="flex items-start gap-2">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" />
                  <p>{syncState.error ?? syncState.validationError}</p>
                </div>
              </div>
            ) : null}
          </aside>

          <section className="mt-[calc(5.75rem+env(safe-area-inset-bottom))] rounded-lg border border-black/10 bg-white p-4 shadow-[0_18px_46px_rgba(17,21,16,0.06)] sm:mt-0 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#e5f7df] text-[#16702e]">
                <ReturnDestinationIcon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[#16702e]">
                  {copy.routeTitle}
                </p>
                <h2 className="mt-1 break-words text-xl font-bold leading-tight [word-break:keep-all] sm:text-2xl">
                  {returnLabel}
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-black/58 [word-break:keep-all]">
                  {returnDestination.body}
                </p>
              </div>
            </div>

            <div
              className={joinClasses(
                "mt-4 grid gap-2",
                returnKind !== "home" && "sm:grid-cols-2",
              )}
            >
              <Link
                className="group flex min-h-12 items-center justify-between gap-3 rounded-lg border border-[#16702e]/20 bg-[#ecfff0] px-3 py-2 text-sm font-bold !text-[#111510] transition hover:border-[#16702e]/44 hover:bg-[#ddffe5]"
                href={returnToHref}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <ArrowLeft className="size-4 shrink-0 text-[#16702e]" />
                  <span className="truncate">{returnLabel}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-black/34 transition group-hover:text-[#16702e]" />
              </Link>
              {returnKind !== "home" ? (
                <Link
                  className="group flex min-h-12 items-center justify-between gap-3 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-bold !text-[#111510] transition hover:border-[#16702e]/32 hover:bg-[#f7faf4]"
                  href={newsHomeHref}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Home className="size-4 shrink-0 text-[#16702e]" />
                    <span className="truncate">{copy.homeReturn}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-black/34 transition group-hover:text-[#16702e]" />
                </Link>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
