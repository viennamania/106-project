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
  ShieldCheck,
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
        signOut: "연결 해제",
        siteName: "FanLetter News",
        steps: ["이메일 지갑 연결", "팬 기자 계정 확인", "뉴스로 복귀"],
        syncing: "뉴스 계정을 동기화하고 있습니다.",
        title: "뉴스 기사에서 바로 이어지는 지갑 연결",
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
        signOut: "Disconnect",
        siteName: "FanLetter News",
        steps: ["Email wallet", "Fan reporter account", "Return to news"],
        syncing: "Syncing your news account.",
        title: "Connect your wallet from the news story",
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
  label,
  loading,
}: {
  done: boolean;
  label: string;
  loading?: boolean;
}) {
  return (
    <div
      className={joinClasses(
        "border px-3 py-3",
        done
          ? "border-[#16702e] bg-[#e5f7df] text-[#111510]"
          : "border-black/12 bg-white text-black/58",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.68rem] font-black uppercase tracking-[0.12em]">
          {label}
        </p>
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
      key={step}
      label={step}
      loading={
        (index === 0 && connection.isResolving) ||
        (index === 1 && syncState.status === "syncing")
      }
    />
  ));

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#111510]">
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
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 text-[0.72rem] font-semibold text-black/52 sm:px-6 lg:px-8">
            <span>{copy.edition}</span>
            <Link className="font-bold !text-[#16702e]" href={returnToHref}>
              {returnLabel}
            </Link>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl items-end justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            className="inline-flex items-center gap-3 text-[2rem] font-black leading-none tracking-normal !text-[#111510] sm:text-[3.2rem]"
            href={newsHomeHref}
          >
            {copy.siteName}
          </Link>
          <Link
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-black/14 bg-white text-[#111510] transition hover:bg-black hover:text-white"
            href={returnToHref}
          >
            <ArrowLeft className="size-5" />
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-7 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(22rem,0.66fr)] lg:px-8 lg:py-12">
        <div className="min-w-0">
          <p className="text-[0.72rem] font-black uppercase tracking-[0.18em] text-[#16702e]">
            {copy.eyebrow}
          </p>
          <h1 className="mt-4 max-w-4xl text-[2.3rem] font-black leading-[1.08] tracking-normal [word-break:keep-all] sm:text-[3.9rem] sm:leading-[1.03]">
            {copy.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-black/62 [word-break:keep-all] sm:text-lg">
            {copy.accountBody}
          </p>

          <div className="mt-7 grid gap-2 sm:grid-cols-3">{steps}</div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link
              className="border border-black/12 bg-white p-4 transition hover:border-[#16702e]/42 hover:bg-[#f2fbef]"
              href={returnToHref}
            >
              <span className="flex items-center gap-2 text-sm font-black text-[#111510]">
                <Newspaper className="size-4 text-[#16702e]" />
                {copy.returnLabel}
              </span>
              <span className="mt-2 block text-sm font-semibold leading-6 text-black/58">
                {returnLabel}
              </span>
            </Link>
            <Link
              className="border border-black/12 bg-white p-4 transition hover:border-[#16702e]/42 hover:bg-[#f2fbef]"
              href={newsHomeHref}
            >
              <span className="flex items-center gap-2 text-sm font-black text-[#111510]">
                <Newspaper className="size-4 text-[#16702e]" />
                {copy.siteName}
              </span>
              <span className="mt-2 block text-sm font-semibold leading-6 text-black/58">
                {copy.homeReturn}
              </span>
            </Link>
          </div>
        </div>

        <section className="border border-black/12 bg-white p-4 shadow-[0_18px_44px_rgba(12,18,14,0.12)] sm:p-5">
          <div className="flex items-start gap-3">
            <span
              className={joinClasses(
                "flex size-12 shrink-0 items-center justify-center rounded-full",
                memberIsCompleted
                  ? "bg-[#44f26e] text-black"
                  : memberNeedsPayment
                    ? "bg-amber-100 text-amber-950"
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
              <p className="mt-2 text-sm font-semibold leading-6 text-black/58">
                {cardBody}
              </p>
            </div>
          </div>

          <dl className="mt-5 grid gap-2">
            <div className="flex items-center justify-between gap-3 border border-black/10 bg-[#f7f7f4] px-3 py-3">
              <dt className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-black/42">
                <Mail className="size-4 text-[#16702e]" />
                {copy.email}
              </dt>
              <dd className="min-w-0 truncate text-sm font-bold">
                {syncState.email ?? cachedSessionEmail ?? "-"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border border-black/10 bg-[#f7f7f4] px-3 py-3">
              <dt className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-black/42">
                <UserRound className="size-4 text-[#16702e]" />
                {copy.member}
              </dt>
              <dd className="min-w-0 truncate text-sm font-bold">
                {getMemberStatusLabel(connectedMember, locale)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 border border-black/10 bg-[#f7f7f4] px-3 py-3">
              <dt className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-black/42">
                <WalletMinimal className="size-4 text-[#16702e]" />
                {copy.walletId}
              </dt>
              <dd className="min-w-0 truncate text-sm font-bold">
                {accountLabel ?? "-"}
              </dd>
            </div>
          </dl>

          {syncState.error || syncState.validationError ? (
            <div className="mt-4 border border-red-200 bg-red-50 p-3 text-sm font-semibold leading-6 text-red-900">
              {syncState.error ?? syncState.validationError}
            </div>
          ) : null}

          <div className="mt-5 grid gap-2">
            {memberIsCompleted ? (
              <>
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-black !text-black transition hover:bg-[#69ff8c]"
                  href={returnToHref}
                >
                  {returnLabel}
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/14 px-5 text-sm font-black !text-[#111510] transition hover:bg-black hover:!text-white"
                  href={walletHref}
                >
                  {copy.wallet}
                </Link>
              </>
            ) : memberNeedsPayment ? (
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-amber-200 px-5 text-sm font-black !text-amber-950 transition hover:bg-amber-300"
                href={activateHref}
              >
                <ShieldCheck className="size-4" />
                {copy.activate}
              </Link>
            ) : connection.isConnected ? (
              <button
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-black/14 px-5 text-sm font-black text-[#111510] transition hover:bg-black hover:text-white"
                onClick={handleRetry}
                type="button"
              >
                <RefreshCw className="size-4" />
                {copy.reconnect}
              </button>
            ) : (
              <button
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-black text-black transition hover:bg-[#69ff8c] disabled:cursor-not-allowed disabled:bg-black/12 disabled:text-black/38"
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
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/14 px-5 text-sm font-black text-black/62 transition hover:bg-black hover:text-white"
                onClick={handleDisconnect}
                type="button"
              >
                <LogOut className="size-4" />
                {copy.signOut}
              </button>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
