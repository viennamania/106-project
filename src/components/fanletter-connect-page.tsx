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
import { readFanletterShareAttributionFromReturnPath } from "@/lib/fanletter-share-attribution";
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

type FanletterConnectReturnKind =
  | "content"
  | "create"
  | "creator"
  | "feed"
  | "home"
  | "onboarding"
  | "previous"
  | "profile"
  | "share"
  | "studio";

type FanletterConnectReturnTarget = {
  backLabel: string;
  body: string;
  cta: string;
  kind: FanletterConnectReturnKind;
  label: string;
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
          "계정 연결은 온보딩의 첫 단계입니다. 연결 후 체크리스트로 돌아가 캐릭터 만들기와 첫 브이로그 생성을 이어갑니다.",
        backToOnboarding: "온보딩으로 돌아가기",
        backToTarget: (target: string) => `${target}으로 돌아가기`,
        completedBody:
          "계정 연결이 확인되었습니다. 온보딩 체크리스트에서 캐릭터 만들기와 첫 브이로그 생성을 이어가세요.",
        completedTitle: "FanLetter 계정 연결이 끝났습니다.",
        connect: "이메일로 계정 연결",
        connectBody:
          "이메일로 FanLetter 계정을 연결하면 캐릭터, 팬 요청, 구매와 판매 내역이 같은 계정에 저장됩니다.",
        connecting: "연결 상태 확인 중",
        disconnected: "아직 연결되지 않았습니다.",
        email: "이메일",
        eyebrow: "FanLetter Account",
        helper:
          "연결 상태가 확인되면 온보딩 체크리스트에서 다음 단계가 열립니다.",
        loginTitle: "FanLetter 계정 연결",
        member: "시작 상태",
        missingClient:
          "현재 브라우저에서 이메일 계정 연결을 시작할 수 없습니다. 잠시 후 다시 시도하세요.",
        onboardingBody:
          "이 페이지는 온보딩 1단계입니다. 연결 후에도 같은 체크리스트에서 캐릭터 설정과 첫 브이로그 생성을 이어갑니다.",
        onboardingCta: "온보딩 체크리스트 보기",
        onboardingTitle: "온보딩과 연결됨",
        paymentBody:
          "계정은 연결되었지만 시작 준비 확인이 더 필요합니다. 확인 화면에서 완료한 뒤 온보딩 체크리스트로 돌아오세요.",
        paymentCta: "가입 완료 확인하기",
        paymentTitle: "가입 완료 확인이 필요합니다.",
        primary: "온보딩 계속하기",
        readinessBody:
          "가입 완료 확인이 필요한 경우 확인 화면을 거치고, 완료되면 온보딩 체크리스트로 돌아옵니다.",
        reconnect: "다시 확인",
        returnBody: (target: string) =>
          `연결을 취소하거나 확인만 하려면 ${target}으로 돌아갈 수 있습니다.`,
        returnCta: (target: string) => `${target}으로 돌아가기`,
        returnTitle: "연결 전 위치",
        restoring: "기존 계정 연결을 복원하고 있습니다.",
        secondary: "첫 브이로그 만들기",
        signOut: "연결 해제",
        studio: "브이로그 스튜디오로 이동",
        steps: ["이메일 로그인", "계정 연결 확인", "시작 준비 확인"],
        syncErrorTitle: "계정 상태 확인이 필요합니다.",
        syncing: "시작 준비 상태를 확인하고 있습니다.",
        title: "계정 연결 후 온보딩을 이어가세요.",
        wallet: "연결 ID",
        walletManagement: "지갑 관리",
      }
    : {
        account: "Account",
        accountBody:
          "Account connection is the first onboarding step. After connecting, return to the checklist to create a character and first vlog.",
        backToOnboarding: "Back to onboarding",
        backToTarget: (target: string) => `Back to ${target}`,
        completedBody:
          "Your account connection is ready. Continue in the onboarding checklist to create a character and first vlog.",
        completedTitle: "Your FanLetter account is connected.",
        connect: "Connect with email",
        connectBody:
          "Connect with email so characters, fan requests, purchases, and sales stay attached to the same FanLetter account.",
        connecting: "Checking connection",
        disconnected: "Not connected yet.",
        email: "Email",
        eyebrow: "FanLetter Account",
        helper:
          "After the connection is confirmed, the next steps open from the onboarding checklist.",
        loginTitle: "Connect FanLetter account",
        member: "Readiness",
        missingClient:
          "Email account connection cannot start in this browser right now. Please try again shortly.",
        onboardingBody:
          "This page is onboarding step one. After connection, the same checklist continues into character setup and first vlog creation.",
        onboardingCta: "View onboarding checklist",
        onboardingTitle: "Connected to onboarding",
        paymentBody:
          "The account is connected, but readiness confirmation is still required. Complete it on the verification screen, then return to the onboarding checklist.",
        paymentCta: "Verify signup",
        paymentTitle: "Signup verification is required.",
        primary: "Continue onboarding",
        readinessBody:
          "If signup verification is required, complete it on the verification screen and return to the onboarding checklist.",
        reconnect: "Check again",
        returnBody: (target: string) =>
          `If you only need to confirm or cancel connection, you can return to ${target}.`,
        returnCta: (target: string) => `Back to ${target}`,
        returnTitle: "Where you came from",
        restoring: "Restoring the existing account connection.",
        secondary: "Create first vlog",
        signOut: "Disconnect",
        studio: "Go to vlog studio",
        steps: ["Email login", "Account check", "Readiness check"],
        syncErrorTitle: "Account status needs attention.",
        syncing: "Checking readiness.",
        title: "Connect your account, then continue onboarding.",
        wallet: "Connection ID",
        walletManagement: "Wallet",
      };
}

function getContextCopy(
  locale: Locale,
  returnTarget: FanletterConnectReturnTarget,
) {
  const isContentReturn = returnTarget.kind === "content";

  if (locale === "ko") {
    if (isContentReturn) {
      return {
        accountBody:
          "이메일 계정을 연결하면 팬 전용 콘텐츠 결제와 열람 권한, 구매 내역, 팬 요청이 같은 계정에 저장됩니다. 연결 후 보던 콘텐츠로 바로 돌아갑니다.",
        completedBody:
          "계정 연결이 확인되었습니다. 보던 팬 전용 콘텐츠로 돌아가 결제와 전체 열람을 이어가세요.",
        connectBody:
          "이메일로 FanLetter 계정을 연결하면 팬 전용 콘텐츠 결제, 구매 내역, 열람 권한이 같은 계정에 저장됩니다.",
        helper:
          "연결 상태가 확인되면 팬 전용 콘텐츠 결제와 열람 권한을 이 계정 기준으로 확인합니다.",
        onboardingBody:
          "캐릭터 만들기나 첫 브이로그 제작을 시작하려면 온보딩 체크리스트에서 이어갈 수 있습니다.",
        onboardingCta: "온보딩 체크리스트 보기",
        onboardingTitle: "필요할 때 온보딩으로 이동",
        paymentBody:
          "계정은 연결되었지만 시작 준비 확인이 더 필요합니다. 확인 화면에서 완료하면 보던 팬 전용 콘텐츠로 돌아옵니다.",
        primary: returnTarget.backLabel,
        readinessBody:
          "가입 완료 확인이 필요한 경우 확인 화면을 거치고, 완료되면 보던 팬 전용 콘텐츠로 돌아옵니다.",
        returnBody: returnTarget.body,
        returnCta: returnTarget.cta,
        returnTitle: "보던 콘텐츠",
        steps: ["이메일 로그인", "구매 계정 확인", "콘텐츠로 복귀"],
        title: "팬 전용 콘텐츠를 열기 위해 계정을 연결하세요.",
      };
    }

    return {
      accountBody:
        "계정 연결은 FanLetter를 시작하는 첫 단계입니다. 연결 후 보던 위치로 돌아가거나 온보딩 체크리스트에서 캐릭터 만들기와 첫 브이로그 생성을 이어갑니다.",
      completedBody: `계정 연결이 확인되었습니다. ${returnTarget.label}에서 이어서 진행하세요.`,
      connectBody:
        "이메일로 FanLetter 계정을 연결하면 캐릭터, 팬 요청, 구매와 판매 내역이 같은 계정에 저장됩니다.",
      helper: "연결 상태가 확인되면 보던 위치로 돌아갈 수 있습니다.",
      onboardingBody:
        "캐릭터 설정과 첫 브이로그 생성을 시작하려면 온보딩 체크리스트에서 이어갈 수 있습니다.",
      onboardingCta: "온보딩 체크리스트 보기",
      onboardingTitle: "온보딩도 이어갈 수 있음",
      paymentBody:
        "계정은 연결되었지만 시작 준비 확인이 더 필요합니다. 확인 화면에서 완료한 뒤 보던 위치로 돌아옵니다.",
      primary:
        returnTarget.kind === "onboarding"
          ? "온보딩 계속하기"
          : returnTarget.backLabel,
      readinessBody:
        "가입 완료 확인이 필요한 경우 확인 화면을 거치고, 완료되면 보던 위치로 돌아옵니다.",
      returnBody: returnTarget.body,
      returnCta: returnTarget.cta,
      returnTitle: "연결 전 위치",
      steps: ["이메일 로그인", "계정 연결 확인", "시작 준비 확인"],
      title:
        returnTarget.kind === "onboarding"
          ? "계정 연결 후 온보딩을 이어가세요."
          : "계정 연결 후 보던 위치로 돌아가세요.",
    };
  }

  if (isContentReturn) {
    return {
      accountBody:
        "Connect with email so fan-only payments, access, purchase history, and fan requests stay attached to the same account. After connecting, you will return to the content you were viewing.",
      completedBody:
        "Your account connection is ready. Return to the fan-only content to continue payment and full access.",
      connectBody:
        "Connect with email so fan-only payments, purchase history, and access stay attached to the same account.",
      helper:
        "After connection, FanLetter checks fan-only payment and access from this account.",
      onboardingBody:
        "If you want to create a character or first vlog, continue from the onboarding checklist.",
      onboardingCta: "View onboarding checklist",
      onboardingTitle: "Onboarding is optional here",
      paymentBody:
        "The account is connected, but readiness confirmation is still required. Complete it, then return to the fan-only content.",
      primary: returnTarget.backLabel,
      readinessBody:
        "If signup verification is required, complete it and return to the fan-only content.",
      returnBody: returnTarget.body,
      returnCta: returnTarget.cta,
      returnTitle: "Content you were viewing",
      steps: ["Email login", "Purchase account", "Return to content"],
      title: "Connect your account to unlock fan-only content.",
    };
  }

  return {
    accountBody:
      "Account connection is the first FanLetter step. After connecting, return to where you came from or continue in the onboarding checklist.",
    completedBody: `Your account connection is ready. Continue from ${returnTarget.label}.`,
    connectBody:
      "Connect with email so characters, fan requests, purchases, and sales stay attached to the same FanLetter account.",
    helper: "After connection, you can return to where you came from.",
    onboardingBody:
      "Continue in the onboarding checklist when you want to set up a character and first vlog.",
    onboardingCta: "View onboarding checklist",
    onboardingTitle: "Onboarding is still available",
    paymentBody:
      "The account is connected, but readiness confirmation is still required. Complete it, then return to where you came from.",
    primary:
      returnTarget.kind === "onboarding"
        ? "Continue onboarding"
        : returnTarget.backLabel,
    readinessBody:
      "If signup verification is required, complete it and return to where you came from.",
    returnBody: returnTarget.body,
    returnCta: returnTarget.cta,
    returnTitle: "Where you came from",
    steps: ["Email login", "Account check", "Readiness check"],
    title:
      returnTarget.kind === "onboarding"
        ? "Connect your account, then continue onboarding."
        : "Connect your account, then return where you left off.",
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
      : "Needs confirmation";
}

function getReturnTarget(path: string, locale: Locale): FanletterConnectReturnTarget {
  const pathname = path.split(/[?#]/, 1)[0];

  if (pathname === `/${locale}/fanletter`) {
    return locale === "ko"
      ? {
          backLabel: "FanLetter 홈으로 돌아가기",
          body: "연결을 취소하거나 확인만 하려면 FanLetter 홈으로 돌아갈 수 있습니다.",
          cta: "FanLetter 홈으로 돌아가기",
          kind: "home",
          label: "FanLetter 홈",
        }
      : {
          backLabel: "Back to FanLetter home",
          body: "If you only need to confirm or cancel connection, you can return to FanLetter home.",
          cta: "Back to FanLetter home",
          kind: "home",
          label: "FanLetter home",
        };
  }

  if (pathname === `/${locale}/fanletter/onboarding`) {
    return locale === "ko"
      ? {
          backLabel: "온보딩으로 돌아가기",
          body: "연결을 취소하거나 확인만 하려면 온보딩 체크리스트로 돌아갈 수 있습니다.",
          cta: "온보딩 체크리스트로 돌아가기",
          kind: "onboarding",
          label: "온보딩 체크리스트",
        }
      : {
          backLabel: "Back to onboarding",
          body: "If you only need to confirm or cancel connection, you can return to the onboarding checklist.",
          cta: "Back to onboarding checklist",
          kind: "onboarding",
          label: "onboarding checklist",
        };
  }

  if (pathname === `/${locale}/fanletter/studio`) {
    return locale === "ko"
      ? {
          backLabel: "브이로그 스튜디오로 돌아가기",
          body: "연결을 취소하거나 확인만 하려면 브이로그 스튜디오로 돌아갈 수 있습니다.",
          cta: "브이로그 스튜디오로 돌아가기",
          kind: "studio",
          label: "브이로그 스튜디오",
        }
      : {
          backLabel: "Back to vlog studio",
          body: "If you only need to confirm or cancel connection, you can return to vlog studio.",
          cta: "Back to vlog studio",
          kind: "studio",
          label: "vlog studio",
        };
  }

  if (pathname === `/${locale}/fanletter/profile`) {
    return locale === "ko"
      ? {
          backLabel: "캐릭터 설정으로 돌아가기",
          body: "연결을 취소하거나 확인만 하려면 캐릭터 설정으로 돌아갈 수 있습니다.",
          cta: "캐릭터 설정으로 돌아가기",
          kind: "profile",
          label: "캐릭터 설정",
        }
      : {
          backLabel: "Back to character setup",
          body: "If you only need to confirm or cancel connection, you can return to character setup.",
          cta: "Back to character setup",
          kind: "profile",
          label: "character setup",
        };
  }

  if (pathname === `/${locale}/fanletter/create`) {
    return locale === "ko"
      ? {
          backLabel: "브이로그 만들기로 돌아가기",
          body: "연결을 취소하거나 확인만 하려면 브이로그 만들기로 돌아갈 수 있습니다.",
          cta: "브이로그 만들기로 돌아가기",
          kind: "create",
          label: "브이로그 만들기",
        }
      : {
          backLabel: "Back to vlog creation",
          body: "If you only need to confirm or cancel connection, you can return to vlog creation.",
          cta: "Back to vlog creation",
          kind: "create",
          label: "vlog creation",
        };
  }

  if (pathname === `/${locale}/fanletter/feed`) {
    return locale === "ko"
      ? {
          backLabel: "브이로그 피드로 돌아가기",
          body: "연결을 취소하거나 확인만 하려면 브이로그 피드로 돌아갈 수 있습니다.",
          cta: "브이로그 피드로 돌아가기",
          kind: "feed",
          label: "브이로그 피드",
        }
      : {
          backLabel: "Back to vlog feed",
          body: "If you only need to confirm or cancel connection, you can return to vlog feed.",
          cta: "Back to vlog feed",
          kind: "feed",
          label: "vlog feed",
        };
  }

  if (pathname.includes("/fanletter/share/")) {
    return locale === "ko"
      ? {
          backLabel: "공유 페이지로 돌아가기",
          body: "연결을 취소하거나 확인만 하려면 공유 페이지로 돌아갈 수 있습니다.",
          cta: "공유 페이지로 돌아가기",
          kind: "share",
          label: "공유 페이지",
        }
      : {
          backLabel: "Back to share page",
          body: "If you only need to confirm or cancel connection, you can return to the share page.",
          cta: "Back to share page",
          kind: "share",
          label: "share page",
        };
  }

  if (pathname.includes("/fanletter/creator/")) {
    return locale === "ko"
      ? {
          backLabel: "캐릭터 채널로 돌아가기",
          body: "연결을 취소하거나 확인만 하려면 캐릭터 채널로 돌아갈 수 있습니다.",
          cta: "캐릭터 채널로 돌아가기",
          kind: "creator",
          label: "캐릭터 채널",
        }
      : {
          backLabel: "Back to character channel",
          body: "If you only need to confirm or cancel connection, you can return to the character channel.",
          cta: "Back to character channel",
          kind: "creator",
          label: "character channel",
        };
  }

  if (pathname.includes("/fanletter/content/")) {
    return locale === "ko"
      ? {
          backLabel: "팬 전용 콘텐츠로 돌아가기",
          body: "연결을 취소하면 보던 팬 전용 콘텐츠 페이지로 돌아갑니다.",
          cta: "팬 전용 콘텐츠로 돌아가기",
          kind: "content",
          label: "팬 전용 콘텐츠",
        }
      : {
          backLabel: "Back to fan-only content",
          body: "If you cancel connection, you can return to the fan-only content you were viewing.",
          cta: "Back to fan-only content",
          kind: "content",
          label: "fan-only content",
        };
  }

  return locale === "ko"
    ? {
        backLabel: "이전 페이지로 돌아가기",
        body: "연결을 취소하거나 확인만 하려면 이전 페이지로 돌아갈 수 있습니다.",
        cta: "이전 페이지로 돌아가기",
        kind: "previous",
        label: "이전 페이지",
      }
    : {
        backLabel: "Back to previous page",
        body: "If you only need to confirm or cancel connection, you can return to the previous page.",
        cta: "Back to previous page",
        kind: "previous",
        label: "previous page",
      };
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
  const fanletterShareAttribution = useMemo(
    () => readFanletterShareAttributionFromReturnPath(returnToHref),
    [returnToHref],
  );
  const accountAddress = account?.address ?? null;
  const connection = useThirdwebConnectionState({
    accountAddress,
    clientConfigured: hasThirdwebClientId,
    disconnectedResolveGraceMs: FANLETTER_CONNECT_DISCONNECTED_GRACE_MS,
    resolveGraceMs: FANLETTER_CONNECT_DISCONNECTED_GRACE_MS,
    status: connectionStatus,
  });
  const accountLabel = formatAddressLabel(accountAddress);
  const onboardingBaseHref = buildPathWithReferral(
    `/${locale}/fanletter/onboarding`,
    referralCode,
  );
  const returnTarget = getReturnTarget(returnToHref, locale);
  const contextCopy = getContextCopy(locale, returnTarget);
  const isReturnToOnboarding = returnTarget.kind === "onboarding";
  const backLabel = returnTarget.backLabel;
  const onboardingHref = isReturnToOnboarding
    ? returnToHref
    : setPathSearchParams(onboardingBaseHref, { returnTo: returnToHref });
  const postConnectHref = isReturnToOnboarding ? onboardingHref : returnToHref;
  const createHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/create`, referralCode),
    { returnTo: onboardingHref },
  );
  const studioHref = buildPathWithReferral(
    `/${locale}/fanletter/studio`,
    referralCode,
  );
  const walletHref = buildPathWithReferral(
    `/${locale}/fanletter/wallet`,
    referralCode,
  );
  const activateHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/activate`, referralCode),
    { returnTo: postConnectHref },
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
    ? contextCopy.completedBody
    : memberNeedsPayment
      ? contextCopy.paymentBody
      : connection.isResolving
        ? copy.restoring
        : connection.isConnected
          ? contextCopy.helper
          : contextCopy.connectBody;

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

  function renderStepStatuses() {
    return contextCopy.steps.map((step, index) => (
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
          (index === 2 && syncState.status === "syncing")
        }
      />
    ));
  }

  function renderReturnActionCards(className: string) {
    return (
      <div className={className}>
        <Link
          className="rounded-lg border border-[#44f26e]/24 bg-[#44f26e]/10 p-4 transition hover:bg-[#44f26e]/14"
          href={onboardingHref}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-[#9bffad]">
            <Sparkles className="size-4" />
            {contextCopy.onboardingTitle}
          </span>
          <span className="mt-2 block text-sm font-medium leading-6 text-white/62">
            {contextCopy.onboardingBody}
          </span>
          <span className="mt-3 inline-flex text-xs font-semibold text-[#b9ffc8]">
            {contextCopy.onboardingCta}
          </span>
        </Link>
        {!isReturnToOnboarding ? (
          <Link
            className="rounded-lg border border-white/10 bg-white/[0.045] p-4 transition hover:bg-white/[0.07]"
            href={returnToHref}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <ArrowLeft className="size-4 text-[#44f26e]" />
              {contextCopy.returnTitle}
            </span>
            <span className="mt-2 block text-sm font-medium leading-6 text-white/58">
              {contextCopy.returnBody}
            </span>
            <span className="mt-3 inline-flex text-xs font-semibold text-white/76">
              {contextCopy.returnCta}
            </span>
          </Link>
        ) : null}
      </div>
    );
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

      <section className="px-4 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-[calc(env(safe-area-inset-top)+16px)] sm:px-6 sm:pb-10 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="flex items-center justify-between gap-3">
            <Link
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/[0.06] text-white transition hover:bg-white/10"
              href={returnToHref}
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
                href={returnToHref}
              >
                {backLabel}
              </Link>
            </div>
            <span className="size-11 sm:hidden" />
          </header>

          <div className="mt-4 flex lg:hidden">
            <FanletterGlobalLanguageSwitcher compact locale={locale} />
          </div>

          <div className="grid gap-5 pb-8 pt-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(22rem,0.78fr)] lg:items-start lg:gap-8 lg:pb-14 lg:pt-20">
            <div className="order-1 min-w-0">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#44f26e]">
                {copy.eyebrow}
              </p>
              <h1 className="mt-4 text-[2.35rem] font-semibold leading-[1.04] tracking-normal text-white [word-break:keep-all] sm:text-[3.85rem] lg:text-[4.15rem]">
                {contextCopy.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/68 [word-break:keep-all] sm:text-lg">
                {contextCopy.accountBody}
              </p>
              <div className="mt-8 hidden gap-2 lg:grid lg:grid-cols-3">
                {renderStepStatuses()}
              </div>
              {renderReturnActionCards(
                `mt-5 hidden gap-3 lg:grid ${
                  isReturnToOnboarding ? "" : "lg:grid-cols-2"
                }`,
              )}
            </div>

            <div className="order-2 rounded-lg border border-white/12 bg-white/[0.055] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.32)] backdrop-blur-md sm:p-5">
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

              <div className="mt-5 hidden gap-2 sm:grid">
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
                      href={postConnectHref}
                    >
                      {contextCopy.primary}
                      <ArrowRight className="size-4" />
                    </Link>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Link
                        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/16 bg-white/8 px-5 text-sm font-semibold !text-white transition hover:bg-white/12"
                        href={studioHref}
                      >
                        {copy.studio}
                      </Link>
                      <Link
                        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/16 bg-white/8 px-5 text-sm font-semibold !text-white transition hover:bg-white/12"
                        href={createHref}
                      >
                        {copy.secondary}
                      </Link>
                      <Link
                        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/16 bg-white/8 px-5 text-sm font-semibold !text-white transition hover:bg-white/12"
                        href={walletHref}
                      >
                        {copy.walletManagement}
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

            <div className="order-3 grid gap-2 sm:grid-cols-3 lg:hidden">
              {renderStepStatuses()}
            </div>
            {renderReturnActionCards(
              `order-4 grid gap-3 lg:hidden ${
                isReturnToOnboarding ? "" : "sm:grid-cols-2"
              }`,
            )}
          </div>

          <div className="grid gap-3 border-t border-white/10 pt-6 md:grid-cols-3">
            {[
              {
                Icon: Mail,
                body: contextCopy.connectBody,
                title: contextCopy.steps[0],
              },
              {
                Icon: ShieldCheck,
                body: contextCopy.helper,
                title: contextCopy.steps[1],
              },
              {
                Icon: Sparkles,
                body: memberIsCompleted
                  ? contextCopy.completedBody
                  : memberNeedsPayment
                    ? contextCopy.paymentBody
                    : contextCopy.readinessBody,
                title: contextCopy.steps[2],
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
