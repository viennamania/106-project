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
  MessageCircleHeart,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
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
import { FanletterGlobalLanguageSwitcher } from "@/components/fanletter-global-language-switcher";
import { useMemberSession } from "@/components/member-session-provider";
import type { Dictionary, Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import type { MemberRecord } from "@/lib/member";
import { syncServerMemberRegistration } from "@/lib/member-session-client";
import {
  hasThirdwebClientId,
  smartWalletChain,
  thirdwebClient,
} from "@/lib/thirdweb";
import {
  getThirdwebUserEmail,
  useThirdwebConnectionState,
} from "@/lib/thirdweb-client";

type FanletterConnectStatus = "error" | "idle" | "ready" | "syncing";

type FanletterConnectSyncState = {
  email: string | null;
  error: string | null;
  member: MemberRecord | null;
  status: FanletterConnectStatus;
  validationError: string | null;
};

const FANLETTER_CONNECT_DISCONNECTED_GRACE_MS = 4500;

const emptySyncState: FanletterConnectSyncState = {
  email: null,
  error: null,
  member: null,
  status: "idle",
  validationError: null,
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        account: "계정",
        accountBody:
          "FanLetter 전용 온보딩에서 이메일 지갑과 회원 상태를 먼저 확인합니다.",
        back: "온보딩으로 돌아가기",
        completedBody:
          "가입 완료 회원으로 확인되었습니다. 브이로그 스튜디오에서 AI 캐릭터 프로필, 브이로그, 공개 상태를 이어서 관리하세요.",
        completedTitle: "FanLetter 시작 준비가 끝났습니다.",
        connect: "이메일로 계정 연결",
        connectBody:
          "기존 Pocket Smart Wallet 이메일 로그인을 사용하되 화면은 FanLetter 흐름에 맞춰 정리했습니다.",
        connecting: "연결 상태 확인 중",
        disconnected: "아직 연결되지 않았습니다.",
        email: "이메일",
        eyebrow: "FanLetter Account",
        helper:
          "계정 연결 후 회원 API 동기화가 끝나야 AI 캐릭터 프로필과 첫 브이로그 생성 단계로 이동할 수 있습니다.",
        loginTitle: "FanLetter 계정 연결",
        member: "회원 상태",
        missingClient:
          "Thirdweb 클라이언트 설정이 없어 이메일 지갑 연결을 시작할 수 없습니다.",
        paymentBody:
          "회원 정보는 연결되었지만 가입 완료 결제 확인이 필요합니다. 결제 확인 화면에서 완료한 뒤 온보딩으로 돌아오세요.",
        paymentCta: "가입 완료 확인하기",
        paymentTitle: "가입 완료 확인이 필요합니다.",
        primary: "캐릭터 만들기로 이동",
        reconnect: "다시 확인",
        restoring: "기존 계정 연결을 복원하고 있습니다.",
        secondary: "첫 브이로그 만들기",
        signOut: "연결 해제",
        studio: "브이로그 스튜디오로 이동",
        steps: ["이메일 로그인", "스마트 지갑 연결", "회원 상태 동기화"],
        syncErrorTitle: "회원 상태 확인이 필요합니다.",
        syncing: "회원 상태를 동기화하고 있습니다.",
        title: "계정 연결을 FanLetter 흐름 안에서 끝내세요.",
        wallet: "지갑",
      }
    : {
        account: "Account",
        accountBody:
          "Confirm the email wallet and member status inside the FanLetter onboarding flow.",
        back: "Back to onboarding",
        completedBody:
          "This member is completed. Manage character profile, vlogs, and publishing from the vlog studio.",
        completedTitle: "Your FanLetter account is ready.",
        connect: "Connect with email",
        connectBody:
          "This keeps the existing Pocket Smart Wallet login while presenting it in the FanLetter flow.",
        connecting: "Checking connection",
        disconnected: "Not connected yet.",
        email: "Email",
        eyebrow: "FanLetter Account",
        helper:
          "After account connection, member API sync must finish before character profile and first vlog steps can continue.",
        loginTitle: "Connect FanLetter account",
        member: "Member status",
        missingClient:
          "Thirdweb client configuration is missing, so email wallet login cannot start.",
        paymentBody:
          "The member is connected, but signup payment verification is still required. Complete it on the verification screen, then return here.",
        paymentCta: "Verify signup",
        paymentTitle: "Signup verification is required.",
        primary: "Go create character",
        reconnect: "Check again",
        restoring: "Restoring the existing account connection.",
        secondary: "Create first vlog",
        signOut: "Disconnect",
        studio: "Go to vlog studio",
        steps: ["Email login", "Smart wallet", "Member sync"],
        syncErrorTitle: "Member status needs attention.",
        syncing: "Syncing member status.",
        title: "Finish account connection inside FanLetter.",
        wallet: "Wallet",
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
      className={`rounded-lg border p-3 ${
        done
          ? "border-[#44f26e] bg-[#44f26e] text-black"
          : "border-white/12 bg-white/[0.055] text-white"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-76">
          {label}
        </p>
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : done ? (
          <CheckCircle2 className="size-4" />
        ) : (
          <span className="size-2 rounded-full bg-current opacity-36" />
        )}
      </div>
    </div>
  );
}

export function FanletterConnectPage({
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
    useState<FanletterConnectSyncState>(emptySyncState);
  const [syncNonce, setSyncNonce] = useState(0);
  const syncInFlightRef = useRef(false);
  const copy = getCopy(locale);
  const accountAddress = account?.address ?? null;
  const connection = useThirdwebConnectionState({
    accountAddress,
    clientConfigured: hasThirdwebClientId,
    disconnectedResolveGraceMs: FANLETTER_CONNECT_DISCONNECTED_GRACE_MS,
    resolveGraceMs: FANLETTER_CONNECT_DISCONNECTED_GRACE_MS,
    status: connectionStatus,
  });
  const accountLabel = formatAddressLabel(accountAddress);
  const onboardingHref = buildPathWithReferral(
    `/${locale}/fanletter/onboarding`,
    referralCode,
  );
  const profileHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/profile`, referralCode),
    { returnTo: returnToHref || onboardingHref },
  );
  const createHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/create`, referralCode),
    { returnTo: returnToHref || onboardingHref },
  );
  const studioHref = buildPathWithReferral(
    `/${locale}/fanletter/studio`,
    referralCode,
  );
  const activateHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/activate`, referralCode),
    { returnTo: returnToHref || onboardingHref },
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
    ? copy.completedTitle
    : memberNeedsPayment
      ? copy.paymentTitle
      : syncState.status === "error"
        ? copy.syncErrorTitle
        : connection.isResolving
          ? copy.connecting
          : connection.isConnected
            ? copy.syncing
            : copy.disconnected;
  const cardBody = memberIsCompleted
    ? copy.completedBody
    : memberNeedsPayment
      ? copy.paymentBody
      : connection.isResolving
        ? copy.restoring
        : connection.isConnected
          ? copy.helper
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

      <section className="px-4 pb-10 pt-[calc(env(safe-area-inset-top)+16px)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="flex items-center justify-between gap-3">
            <Link
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/[0.06] text-white transition hover:bg-white/10"
              href={returnToHref || onboardingHref}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <Link
              className="flex min-w-0 items-center gap-2"
              href={buildPathWithReferral(`/${locale}/fanletter`, referralCode)}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <MessageCircleHeart className="size-5" />
              </span>
              <span className="truncate text-xl font-semibold tracking-normal">
                FanLetter
              </span>
            </Link>
            <div className="hidden items-center gap-2 sm:flex">
              <FanletterGlobalLanguageSwitcher
                className="hidden lg:inline-flex"
                locale={locale}
              />
              <Link
                className="h-11 items-center justify-center rounded-full border border-white/16 px-4 text-sm font-semibold !text-white transition hover:border-white/36 sm:inline-flex"
                href={returnToHref || onboardingHref}
              >
                {copy.back}
              </Link>
            </div>
            <span className="size-11 sm:hidden" />
          </header>

          <div className="mt-4 flex lg:hidden">
            <FanletterGlobalLanguageSwitcher compact locale={locale} />
          </div>

          <div className="grid gap-8 pb-10 pt-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(22rem,0.78fr)] lg:items-end lg:pb-14 lg:pt-20">
            <div className="min-w-0">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#44f26e]">
                {copy.eyebrow}
              </p>
              <h1 className="mt-4 text-[2.65rem] font-semibold leading-[0.98] tracking-normal text-white [word-break:keep-all] sm:text-[5rem]">
                {copy.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/68 [word-break:keep-all] sm:text-lg">
                {copy.accountBody}
              </p>
              <div className="mt-8 grid gap-2 sm:grid-cols-3">
                {copy.steps.map((step, index) => (
                  <StepStatus
                    done={
                      index === 0
                        ? connection.isConnected
                        : index === 1
                          ? Boolean(accountAddress)
                          : memberIsCompleted || memberNeedsPayment
                    }
                    key={step}
                    label={step}
                    loading={
                      (index === 0 && connection.isResolving) ||
                      (index === 2 && syncState.status === "syncing")
                    }
                  />
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/12 bg-white/[0.055] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.32)] backdrop-blur-md sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                  {memberIsCompleted ? (
                    <CheckCircle2 className="size-6" />
                  ) : memberNeedsPayment ? (
                    <ShieldCheck className="size-6" />
                  ) : connection.isConnected || connection.isResolving ? (
                    <Loader2 className="size-6 animate-spin" />
                  ) : (
                    <Mail className="size-6" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {cardTitle}
                  </p>
                  <p className="mt-1 text-xs font-medium leading-5 text-white/56">
                    {cardBody}
                  </p>
                </div>
              </div>

              {syncState.error ? (
                <div className="mt-4 rounded-lg border border-red-300/20 bg-red-500/12 p-3 text-sm font-medium leading-6 text-red-100">
                  <div className="flex items-start gap-2">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" />
                    <p>{syncState.error}</p>
                  </div>
                </div>
              ) : null}

              {syncState.validationError ? (
                <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-400/12 p-3 text-sm font-medium leading-6 text-amber-100">
                  {syncState.validationError}
                </div>
              ) : null}

              <div className="mt-5 grid gap-2">
                <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                  <div className="flex items-center gap-3">
                    <UserRound className="size-4 text-[#44f26e]" />
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                      {copy.email}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold text-white">
                    {syncState.email ?? cachedSessionEmail ?? "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                  <div className="flex items-center gap-3">
                    <WalletCards className="size-4 text-[#44f26e]" />
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                      {copy.wallet}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold text-white">
                    {accountLabel ?? "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 p-3">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="size-4 text-[#44f26e]" />
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                      {copy.member}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {getMemberStatusLabel(connectedMember, locale)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-2">
                {!hasThirdwebClientId ? (
                  <div className="rounded-lg border border-amber-300/20 bg-amber-400/12 p-3 text-sm font-medium leading-6 text-amber-100">
                    {copy.missingClient}
                  </div>
                ) : connection.isResolving ? (
                  <button
                    className="inline-flex h-12 w-full cursor-wait items-center justify-center gap-2 rounded-full border border-white/16 bg-white/8 px-5 text-sm font-semibold text-white/70"
                    disabled
                    type="button"
                  >
                    <Loader2 className="size-4 animate-spin" />
                    {copy.connecting}
                  </button>
                ) : connection.isDisconnected ? (
                  <button
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold text-black transition hover:bg-[#67ff88]"
                    onClick={() => {
                      setIsLoginDialogOpen(true);
                    }}
                    type="button"
                  >
                    <Mail className="size-4" />
                    {copy.connect}
                  </button>
                ) : memberIsCompleted ? (
                  <>
                    <Link
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold !text-black transition hover:bg-[#67ff88]"
                      href={studioHref}
                    >
                      {copy.studio}
                      <ArrowRight className="size-4" />
                    </Link>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Link
                        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/16 bg-white/8 px-5 text-sm font-semibold !text-white transition hover:bg-white/12"
                        href={profileHref}
                      >
                        {copy.primary}
                      </Link>
                      <Link
                        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/16 bg-white/8 px-5 text-sm font-semibold !text-white transition hover:bg-white/12"
                        href={createHref}
                      >
                        {copy.secondary}
                      </Link>
                    </div>
                  </>
                ) : memberNeedsPayment ? (
                  <Link
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold !text-black transition hover:bg-[#67ff88]"
                    href={activateHref}
                  >
                    {copy.paymentCta}
                    <ArrowRight className="size-4" />
                  </Link>
                ) : (
                  <button
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/16 bg-white/8 px-5 text-sm font-semibold text-white transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={syncState.status === "syncing"}
                    onClick={handleRetry}
                    type="button"
                  >
                    {syncState.status === "syncing" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    {syncState.status === "syncing"
                      ? copy.connecting
                      : copy.reconnect}
                  </button>
                )}

                {connection.isConnected ? (
                  <button
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-black/28 px-5 text-sm font-semibold text-white/70 transition hover:bg-black/42 hover:text-white"
                    onClick={handleDisconnect}
                    type="button"
                  >
                    <LogOut className="size-4" />
                    {copy.signOut}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-white/10 pt-6 md:grid-cols-3">
            {[
              {
                Icon: Mail,
                body: copy.connectBody,
                title: copy.steps[0],
              },
              {
                Icon: WalletCards,
                body: copy.helper,
                title: copy.steps[1],
              },
              {
                Icon: Sparkles,
                body: memberIsCompleted
                  ? copy.completedBody
                  : memberNeedsPayment
                    ? copy.paymentBody
                    : copy.helper,
                title: copy.steps[2],
              },
            ].map((item) => {
              const Icon = item.Icon;

              return (
                <article
                  className="rounded-lg border border-white/10 bg-white/[0.045] p-4"
                  key={item.title}
                >
                  <Icon className="size-5 text-[#44f26e]" />
                  <h2 className="mt-4 text-lg font-semibold text-white">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/54">
                    {item.body}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
