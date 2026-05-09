"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  type FanletterAccountStatusKind,
  useFanletterAccountStatus,
} from "@/lib/fanletter-account-status";
import type { CreatorProfileResponse } from "@/lib/content";
import type { Locale } from "@/lib/i18n";

type SetupStatus = FanletterAccountStatusKind;
type CharacterStatus = "checking" | "empty" | "error" | "ready" | "unavailable";

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
const EMPTY_CHARACTER_STATE = {
  avatarImageUrl: null,
  error: null,
  name: null,
  status: "unavailable" as CharacterStatus,
};

type CharacterState = {
  avatarImageUrl: string | null;
  error: string | null;
  name: string | null;
  status: CharacterStatus;
};

type SetupState = {
  accountStatus: SetupStatus;
  character: CharacterState;
};

const FanletterSetupStatusContext = createContext<SetupState | null>(null);

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function FanletterSetupStatusProvider({
  children,
}: {
  children: ReactNode;
}) {
  const accountStatus = useFanletterAccountStatus({
    disconnectedResolveGraceMs: CONNECTION_RESOLVE_GRACE_MS,
    resolveGraceMs: CONNECTION_RESOLVE_GRACE_MS,
  });
  const [character, setCharacter] = useState<CharacterState>(
    EMPTY_CHARACTER_STATE,
  );

  useEffect(() => {
    if (accountStatus.status === "checking") {
      setCharacter({
        ...EMPTY_CHARACTER_STATE,
        status: "checking",
      });
      return;
    }

    if (
      accountStatus.status !== "connected" ||
      !accountStatus.accountAddress
    ) {
      setCharacter(EMPTY_CHARACTER_STATE);
      return;
    }

    if (!accountStatus.email) {
      setCharacter({
        ...EMPTY_CHARACTER_STATE,
        status: "checking",
      });
      return;
    }

    const controller = new AbortController();

    setCharacter((current) => ({
      ...current,
      error: null,
      status: "checking",
    }));

    async function loadCharacter() {
      try {
        const params = new URLSearchParams({
          email: accountStatus.email ?? "",
          walletAddress: accountStatus.accountAddress ?? "",
        });
        const response = await fetch(`/api/content/profile?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => null)) as
          | CreatorProfileResponse
          | { error?: string }
          | null;

        if (!response.ok || !data || !("profile" in data)) {
          throw new Error(
            data && "error" in data && data.error
              ? data.error
              : "Failed to load character profile.",
          );
        }

        const persona = data.profile.characterPersona;

        setCharacter({
          avatarImageUrl: data.profile.avatarImageUrl,
          error: null,
          name: persona?.name ?? data.profile.displayName ?? null,
          status: persona ? "ready" : "empty",
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setCharacter({
          ...EMPTY_CHARACTER_STATE,
          error: error instanceof Error ? error.message : null,
          status: "error",
        });
      }
    }

    void loadCharacter();

    return () => {
      controller.abort();
    };
  }, [accountStatus.accountAddress, accountStatus.email, accountStatus.status]);

  const value = useMemo(
    () => ({
      accountStatus: accountStatus.status,
      character,
    }),
    [accountStatus.status, character],
  );

  return (
    <FanletterSetupStatusContext.Provider value={value}>
      {children}
    </FanletterSetupStatusContext.Provider>
  );
}

function useSetupState() {
  const state = useContext(FanletterSetupStatusContext);

  if (!state) {
    throw new Error(
      "Fanletter setup actions must be rendered inside FanletterSetupStatusProvider.",
    );
  }

  return state;
}

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        accountStatus: "계정 상태 보기",
        checking: "계정 확인 중",
        characterChecking: "캐릭터 확인 중",
        characterManage: "캐릭터 확인/변경",
        characterReady: "캐릭터 준비 완료",
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
        characterChecking: "Checking character",
        characterManage: "Review/change character",
        characterReady: "Character ready",
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
  character,
  copy,
  links,
  status,
  variant,
}: {
  character: CharacterState;
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
    if (character.status === "checking") {
      return {
        primaryHref: links.profileHref,
        primaryLabel: copy.characterChecking,
        secondaryHref: links.studioHref,
        secondaryLabel: copy.studio,
      };
    }

    if (character.status === "ready") {
      return {
        primaryHref: links.createHref,
        primaryLabel: copy.firstVlog,
        secondaryHref: links.profileHref,
        secondaryLabel: copy.characterManage,
      };
    }

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
  character,
  copy,
  links,
  status,
  stepIndex,
}: {
  character: CharacterState;
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
    ? character.status === "ready"
      ? {
          href: links.profileHref,
          label: copy.characterManage,
          tone: "success" as const,
        }
      : character.status === "checking"
        ? {
            href: links.profileHref,
            label: copy.characterChecking,
          }
        : {
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
  const setupState = useSetupState();
  const status = setupState.accountStatus;
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
    character: setupState.character,
    copy,
    links,
    status,
    variant,
  });
  const isChecking =
    status === "checking" ||
    (status === "connected" && setupState.character.status === "checking");

  return (
    <>
      <Link
        className={getActionClassName({ isPrimary: true, surface })}
        href={actions.primaryHref}
      >
        {isChecking ? (
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
  const setupState = useSetupState();
  const status = setupState.accountStatus;
  const copy = getCopy(locale);
  const action = getStepAction({
    character: setupState.character,
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
      {(status === "checking" && stepIndex === 0) ||
      (setupState.character.status === "checking" && stepIndex === 1) ? (
        <Loader2 className="size-4 animate-spin" />
      ) : null}
      {action.label || defaultLabel}
      <ArrowRight className="size-4" />
    </Link>
  );
}

export function FanletterSetupStepBadge({
  locale,
  stepIndex = 0,
}: {
  locale: Locale;
  stepIndex?: number;
}) {
  const setupState = useSetupState();
  const status = setupState.accountStatus;
  const copy = getCopy(locale);
  const isCharacterStep = stepIndex === 1;
  const isComplete = isCharacterStep
    ? setupState.character.status === "ready"
    : status === "connected";
  const isChecking = isCharacterStep
    ? setupState.character.status === "checking"
    : status === "checking";
  const label = isCharacterStep
    ? isChecking
      ? copy.characterChecking
      : isComplete
        ? setupState.character.name
          ? `${setupState.character.name} · ${copy.characterReady}`
          : copy.characterReady
        : copy.create
    : isChecking
      ? copy.checking
      : isComplete
        ? copy.connected
        : copy.connect;

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
      {label}
    </span>
  );
}
