"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import {
  useActiveAccount,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { useMemberSession } from "@/components/member-session-provider";
import type { Locale } from "@/lib/i18n";
import { hasThirdwebClientId } from "@/lib/thirdweb";
import { useThirdwebConnectionState } from "@/lib/thirdweb-client";

type SetupStatus =
  | "checking"
  | "connected"
  | "disconnected"
  | "issue"
  | "pendingPayment"
  | "setupMissing";

type SetupSurface = "dark" | "light";
type SetupVariant = "onboarding" | "start";

type SetupLinks = {
  activateHref: string;
  connectHref: string;
  createHref: string;
  onboardingHref: string;
  profileHref: string;
  studioHref: string;
};

type SetupHeroActionsProps = SetupLinks & {
  locale: Locale;
  surface: SetupSurface;
  variant: SetupVariant;
};

type SetupStepActionProps = SetupLinks & {
  defaultLabel: string;
  locale: Locale;
  stepIndex: number;
};

type SetupStepAction = {
  href: string;
  label: string;
  tone?: "success";
};

const CONNECTION_RESOLVE_GRACE_MS = 3000;

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getSetupStatus({
  connection,
  memberSession,
}: {
  connection: ReturnType<typeof useThirdwebConnectionState>;
  memberSession: ReturnType<typeof useMemberSession>;
}): SetupStatus {
  if (!hasThirdwebClientId) {
    return "setupMissing";
  }

  if (
    connection.isResolving ||
    memberSession.isValidating ||
    memberSession.status === "validating"
  ) {
    return "checking";
  }

  if (connection.isDisconnected) {
    return "disconnected";
  }

  if (memberSession.member?.serviceSuspendedAt) {
    return "issue";
  }

  if (memberSession.member?.status === "pending_payment") {
    return "pendingPayment";
  }

  if (memberSession.status === "error" && !memberSession.member) {
    return "issue";
  }

  if (connection.isConnected) {
    return "connected";
  }

  return "disconnected";
}

function useSetupStatus() {
  const account = useActiveAccount();
  const connectionStatus = useActiveWalletConnectionStatus();
  const memberSession = useMemberSession();
  const accountAddress = account?.address ?? null;
  const connection = useThirdwebConnectionState({
    accountAddress,
    clientConfigured: hasThirdwebClientId,
    disconnectedResolveGraceMs: CONNECTION_RESOLVE_GRACE_MS,
    resolveGraceMs: CONNECTION_RESOLVE_GRACE_MS,
    status: connectionStatus,
  });

  return getSetupStatus({
    connection,
    memberSession,
  });
}

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        accountStatus: "계정 상태 보기",
        checking: "계정 확인 중",
        connect: "계정 연결하기",
        connected: "완료",
        create: "캐릭터 만들기",
        firstVlog: "첫 브이로그 만들기",
        onboardingPrimary: "계정 연결하기",
        onboardingSecondary: "캐릭터 만들기",
        signupPrimary: "가입하고 채널 시작",
        signupSecondary: "캐릭터 만들기",
        studio: "브이로그 스튜디오",
        verify: "가입 완료 확인하기",
      }
    : {
        accountStatus: "View account status",
        checking: "Checking account",
        connect: "Connect account",
        connected: "Done",
        create: "Create character",
        firstVlog: "Create first vlog",
        onboardingPrimary: "Start with account",
        onboardingSecondary: "Create character",
        signupPrimary: "Start channel with signup",
        signupSecondary: "Create character",
        studio: "Vlog studio",
        verify: "Verify signup",
      };
}

function getActionClassName({
  isPrimary,
  surface,
  tone,
}: {
  isPrimary: boolean;
  surface: SetupSurface;
  tone?: "success";
}) {
  const base =
    "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition sm:w-fit";

  if (tone === "success") {
    return joinClasses(base, "bg-[#44f26e] !text-black hover:bg-[#67ff88]");
  }

  if (surface === "light") {
    return joinClasses(
      base,
      "sm:min-w-[12rem]",
      isPrimary
        ? "bg-black !text-white hover:bg-black/82"
        : "border border-black/12 bg-white !text-black hover:bg-black/[0.03]",
    );
  }

  return joinClasses(
    base,
    isPrimary
      ? "bg-[#44f26e] !text-black hover:bg-[#67ff88]"
      : "border border-white/18 bg-white/8 !text-white hover:bg-white/12",
  );
}

function getHeroActions({
  copy,
  links,
  status,
  variant,
}: {
  copy: ReturnType<typeof getCopy>;
  links: SetupLinks;
  status: SetupStatus;
  variant: SetupVariant;
}) {
  if (status === "checking") {
    return {
      primaryHref: links.connectHref,
      primaryLabel: copy.checking,
      secondaryHref: links.studioHref,
      secondaryLabel: copy.studio,
    };
  }

  if (status === "pendingPayment") {
    return {
      primaryHref: links.activateHref,
      primaryLabel: copy.verify,
      secondaryHref: links.connectHref,
      secondaryLabel: copy.accountStatus,
    };
  }

  if (status === "connected") {
    return {
      primaryHref: links.profileHref,
      primaryLabel: copy.create,
      secondaryHref: links.studioHref,
      secondaryLabel: copy.studio,
    };
  }

  if (status === "issue" || status === "setupMissing") {
    return {
      primaryHref: links.connectHref,
      primaryLabel: copy.accountStatus,
      secondaryHref: links.profileHref,
      secondaryLabel: copy.create,
    };
  }

  if (variant === "start") {
    return {
      primaryHref: links.onboardingHref,
      primaryLabel: copy.signupPrimary,
      secondaryHref: links.profileHref,
      secondaryLabel: copy.signupSecondary,
    };
  }

  return {
    primaryHref: links.connectHref,
    primaryLabel: copy.onboardingPrimary,
    secondaryHref: links.profileHref,
    secondaryLabel: copy.onboardingSecondary,
  };
}

function getStepAction({
  copy,
  links,
  status,
  stepIndex,
}: {
  copy: ReturnType<typeof getCopy>;
  links: SetupLinks;
  status: SetupStatus;
  stepIndex: number;
}): SetupStepAction {
  if (stepIndex === 0) {
    if (status === "connected") {
      return {
        href: links.connectHref,
        label: copy.accountStatus,
        tone: "success" as const,
      };
    }

    if (status === "checking") {
      return {
        href: links.connectHref,
        label: copy.checking,
      };
    }

    if (status === "pendingPayment") {
      return {
        href: links.activateHref,
        label: copy.verify,
      };
    }

    return {
      href: links.connectHref,
      label:
        status === "issue" || status === "setupMissing"
          ? copy.accountStatus
          : copy.connect,
    };
  }

  if (status === "pendingPayment") {
    return {
      href: links.activateHref,
      label: copy.verify,
    };
  }

  return stepIndex === 1
    ? {
        href: links.profileHref,
        label: copy.create,
      }
    : {
        href: links.createHref,
        label: copy.firstVlog,
      };
}

export function FanletterSetupHeroActions({
  activateHref,
  connectHref,
  createHref,
  locale,
  onboardingHref,
  profileHref,
  studioHref,
  surface,
  variant,
}: SetupHeroActionsProps) {
  const status = useSetupStatus();
  const copy = getCopy(locale);
  const links = {
    activateHref,
    connectHref,
    createHref,
    onboardingHref,
    profileHref,
    studioHref,
  };
  const actions = getHeroActions({
    copy,
    links,
    status,
    variant,
  });

  return (
    <>
      <Link
        className={getActionClassName({ isPrimary: true, surface })}
        href={actions.primaryHref}
      >
        {status === "checking" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : null}
        {actions.primaryLabel}
      </Link>
      <Link
        className={getActionClassName({ isPrimary: false, surface })}
        href={actions.secondaryHref}
      >
        {actions.secondaryLabel}
      </Link>
    </>
  );
}

export function FanletterSetupStepAction({
  activateHref,
  connectHref,
  createHref,
  defaultLabel,
  locale,
  onboardingHref,
  profileHref,
  stepIndex,
  studioHref,
}: SetupStepActionProps) {
  const status = useSetupStatus();
  const copy = getCopy(locale);
  const action = getStepAction({
    copy,
    links: {
      activateHref,
      connectHref,
      createHref,
      onboardingHref,
      profileHref,
      studioHref,
    },
    status,
    stepIndex,
  });

  return (
    <Link
      className={joinClasses(
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition sm:w-fit",
        action.tone === "success"
          ? "bg-[#44f26e] !text-black hover:bg-[#67ff88]"
          : "bg-black !text-white hover:bg-black/82",
      )}
      href={action.href}
    >
      {status === "checking" && stepIndex === 0 ? (
        <Loader2 className="size-4 animate-spin" />
      ) : null}
      {action.label || defaultLabel}
      <ArrowRight className="size-4" />
    </Link>
  );
}

export function FanletterSetupStepBadge({
  locale,
}: {
  locale: Locale;
}) {
  const status = useSetupStatus();
  const copy = getCopy(locale);
  const isComplete = status === "connected";
  const isChecking = status === "checking";

  return (
    <span
      className={joinClasses(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em]",
        isComplete
          ? "bg-[#e8f9ed] text-[#16702e]"
          : "bg-black/5 text-black/52",
      )}
    >
      {isChecking ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : isComplete ? (
        <CheckCircle2 className="size-3.5" />
      ) : (
        <ArrowRight className="size-3.5" />
      )}
      {isChecking ? copy.checking : isComplete ? copy.connected : copy.connect}
    </span>
  );
}
