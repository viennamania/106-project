"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Loader2,
  LogOut,
  Mail,
  Newspaper,
  RefreshCw,
  Route,
  ShieldCheck,
  type LucideIcon,
  UserRound,
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

type NewsReturnKind = "article" | "home" | "listing";

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
          "뉴스 기사에서 팬 기자 활동, AI 리포트 공유, 팬 전용 브이로그 결제와 열람을 이어가려면 같은 이메일 지갑으로 연결해야 합니다.",
        accountReady: "뉴스 계정 연결 완료",
        activate: "가입 완료 확인하기",
        articleReturn: "보던 기사로 돌아가기",
        checking: "연결 상태 확인 중",
        connect: "뉴스 지갑 연결",
        connectBody:
          "이메일로 연결하면 FanLetter News에서 생성한 리포트, 공유자 정보, 구매 내역이 같은 회원 기준으로 이어집니다.",
        connectedBody:
          "연결이 확인되었습니다. 보던 뉴스 기사로 돌아가거나 FanLetter 지갑에서 결제 내역을 확인할 수 있습니다.",
        disconnected: "뉴스 지갑이 아직 연결되지 않았습니다.",
        edition: "FanLetter Entertainment News",
        email: "이메일",
        errorTitle: "계정 확인이 필요합니다.",
        eyebrow: "FanLetter News Wallet",
        fallbackReturn: "뉴스룸으로 돌아가기",
        homeReturn: "FanLetter News 홈으로 돌아가기",
        loginTitle: "FanLetter News 지갑 연결",
        member: "회원 상태",
        missingClient:
          "현재 브라우저에서 이메일 지갑 연결을 시작할 수 없습니다. 잠시 후 다시 시도하세요.",
        paymentBody:
          "계정은 연결되었지만 시작 준비 확인이 필요합니다. 확인을 마치면 보던 뉴스로 돌아옵니다.",
        paymentTitle: "가입 완료 확인이 필요합니다.",
        reconnect: "다시 확인",
        returnLabel: "연결 전 위치",
        routeTitle: "복귀 경로",
        signOut: "연결 해제",
        siteName: "FanLetter News",
        statusDesk: "뉴스 계정 데스크",
        steps: ["이메일 지갑 연결", "팬 기자 계정 확인", "뉴스로 복귀"],
        syncing: "뉴스 계정을 동기화하고 있습니다.",
        title: "FanLetter News 계정 연결",
        wallet: "FanLetter 지갑 관리",
        walletId: "연결 ID",
      }
    : {
        account: "News account",
        accountBody:
          "Connect with the same email wallet to continue fan reporter actions, AI report sharing, fan-only vlog payments, and access from the news story.",
        accountReady: "News account connected",
        activate: "Verify signup",
        articleReturn: "Back to the story",
        checking: "Checking connection",
        connect: "Connect news wallet",
        connectBody:
          "Connect with email so FanLetter News reports, sharer identity, and purchases stay attached to the same member account.",
        connectedBody:
          "Connection is ready. Return to the story or review payment activity from your FanLetter wallet.",
        disconnected: "No news wallet is connected yet.",
        edition: "FanLetter Entertainment News",
        email: "Email",
        errorTitle: "Account status needs attention.",
        eyebrow: "FanLetter News Wallet",
        fallbackReturn: "Back to newsroom",
        homeReturn: "Back to FanLetter News",
        loginTitle: "Connect FanLetter News wallet",
        member: "Member status",
        missingClient:
          "Email wallet connection cannot start in this browser right now. Please try again shortly.",
        paymentBody:
          "The account is connected, but signup verification is required. Complete it, then return to the news page.",
        paymentTitle: "Signup verification is required.",
        reconnect: "Check again",
        returnLabel: "Previous location",
        routeTitle: "Return route",
        signOut: "Disconnect",
        siteName: "FanLetter News",
        statusDesk: "News Account Desk",
        steps: ["Email wallet", "Fan reporter account", "Return to news"],
        syncing: "Syncing your news account.",
        title: "Connect FanLetter News account",
        wallet: "FanLetter wallet",
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
  const pathname = returnToHref.split(/[?#]/, 1)[0];
  const newsBasePath = `/${locale}/fanletter/news`;

  if (pathname === newsBasePath) {
    return "home";
  }

  if (pathname.startsWith(`${newsBasePath}/`) && pathname !== `${newsBasePath}/connect`) {
    return "article";
  }

  return "listing";
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

function AccountInfoRow({
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
  const returnLabel =
    returnKind === "article"
      ? copy.articleReturn
      : returnKind === "home"
        ? copy.homeReturn
        : copy.fallbackReturn;
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
    buildPathWithReferral(`/${locale}/activate`, referralCode),
    { returnTo: returnToHref },
  );
  const walletHref = buildPathWithReferral(
    `/${locale}/fanletter/wallet`,
    referralCode,
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
    <main className="min-h-screen bg-[#eef1ec] text-[#111510]">
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
              {returnLabel}
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
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-black/14 bg-white text-[#111510] transition hover:bg-black hover:text-white"
            href={returnToHref}
            aria-label={returnLabel}
          >
            <ArrowLeft className="size-5" />
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-[92rem] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:px-8 lg:py-8 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <section className="min-w-0 overflow-hidden border-y-2 border-[#111510] bg-white shadow-[0_18px_48px_rgba(17,21,16,0.08)]">
          <div className="border-b-2 border-[#111510] p-4 sm:p-5">
            <div className="min-w-0">
              <p className="text-[0.72rem] font-black uppercase tracking-[0.18em] text-[#16702e]">
                {copy.eyebrow}
              </p>
              <h1 className="mt-3 max-w-4xl break-words text-[2.15rem] font-black leading-[1.05] tracking-normal [word-break:keep-all] sm:text-[3.45rem] lg:text-[3.9rem]">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-black/62 [word-break:keep-all] sm:text-base sm:leading-7">
                {copy.accountBody}
              </p>
            </div>
            <div className="mt-5 grid gap-px border border-black/10 bg-black/10 sm:grid-cols-3">
              {steps}
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.45fr)]">
            <div className="min-w-0 p-4 sm:p-5">
              <div className="border border-black/12 bg-[#f7faf4] p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center bg-[#111510] text-[#44f26e]">
                    <Route className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#16702e]">
                      {copy.routeTitle}
                    </p>
                    <h2 className="mt-1 break-words text-xl font-black leading-tight [word-break:keep-all]">
                      {returnLabel}
                    </h2>
                  </div>
                </div>
                <div
                  className={joinClasses(
                    "mt-4 grid gap-2",
                    returnToHref !== newsHomeHref && "sm:grid-cols-2",
                  )}
                >
                  <Link
                    className="group flex min-h-14 items-center justify-between gap-3 border border-black/12 bg-white px-3 py-2 text-sm font-black !text-[#111510] transition hover:border-[#16702e]/42 hover:bg-[#ecfff0]"
                    href={returnToHref}
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <ArrowLeft className="size-4 shrink-0 text-[#16702e]" />
                      <span className="truncate">{returnLabel}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-black/34 transition group-hover:text-[#16702e]" />
                  </Link>
                  {returnToHref !== newsHomeHref ? (
                    <Link
                      className="group flex min-h-14 items-center justify-between gap-3 border border-black/12 bg-white px-3 py-2 text-sm font-black !text-[#111510] transition hover:border-[#16702e]/42 hover:bg-[#ecfff0]"
                      href={newsHomeHref}
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <Newspaper className="size-4 shrink-0 text-[#16702e]" />
                        <span className="truncate">{copy.homeReturn}</span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-black/34 transition group-hover:text-[#16702e]" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            <aside className="border-t border-black/12 bg-[#111510] p-4 text-white sm:p-5 lg:border-l lg:border-t-0">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#44f26e]">
                {copy.statusDesk}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/62">
                {cardBody}
              </p>
              <div className="mt-5 grid gap-2">
                <div className="border border-white/12 bg-white/[0.06] px-3 py-3">
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-white/42">
                    {copy.account}
                  </p>
                  <p className="mt-1 truncate text-lg font-black">
                    {getMemberStatusLabel(connectedMember, locale)}
                  </p>
                </div>
                <div className="border border-white/12 bg-white/[0.06] px-3 py-3">
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-white/42">
                    {copy.returnLabel}
                  </p>
                  <p className="mt-1 truncate text-sm font-black text-white/86">
                    {returnLabel}
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
                    : memberNeedsPayment
                      ? "bg-amber-200 text-amber-950"
                      : syncState.status === "error"
                        ? "bg-red-100 text-red-900"
                        : "bg-[#111510] text-white",
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
              <AccountInfoRow
                Icon={Mail}
                label={copy.email}
                value={syncState.email ?? cachedSessionEmail}
              />
              <AccountInfoRow
                Icon={UserRound}
                label={copy.member}
                value={getMemberStatusLabel(connectedMember, locale)}
              />
              <AccountInfoRow
                Icon={WalletMinimal}
                label={copy.walletId}
                value={accountLabel}
              />
            </dl>

            {syncState.error || syncState.validationError ? (
              <div className="mt-4 border border-red-200 bg-red-50 p-3 text-sm font-semibold leading-6 text-red-900">
                <div className="flex items-start gap-2">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" />
                  <p>{syncState.error ?? syncState.validationError}</p>
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid gap-2">
              {memberIsCompleted ? (
                <>
                  <Link
                    className="inline-flex h-12 items-center justify-center gap-2 bg-[#44f26e] px-5 text-sm font-black !text-black transition hover:bg-[#69ff8c]"
                    href={returnToHref}
                  >
                    {returnLabel}
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link
                    className="inline-flex h-11 items-center justify-center gap-2 border border-black/14 px-5 text-sm font-black !text-[#111510] transition hover:bg-black hover:!text-white"
                    href={walletHref}
                  >
                    <WalletMinimal className="size-4" />
                    {copy.wallet}
                  </Link>
                </>
              ) : memberNeedsPayment ? (
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 bg-amber-200 px-5 text-sm font-black !text-amber-950 transition hover:bg-amber-300"
                  href={activateHref}
                >
                  <ShieldCheck className="size-4" />
                  {copy.activate}
                </Link>
              ) : connection.isConnected ? (
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 border border-black/14 px-5 text-sm font-black text-[#111510] transition hover:bg-black hover:text-white"
                  onClick={handleRetry}
                  type="button"
                >
                  <RefreshCw className="size-4" />
                  {copy.reconnect}
                </button>
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
              {connection.isConnected ? (
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 border border-black/14 px-5 text-sm font-black text-black/62 transition hover:bg-black hover:text-white"
                  onClick={handleDisconnect}
                  type="button"
                >
                  <LogOut className="size-4" />
                  {copy.signOut}
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
