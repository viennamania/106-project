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

type SetupStepNavLinkProps = SetupLinks & {
  children: ReactNode;
  className?: string;
  locale: Locale;
  stepIndex: number;
};

type SetupStepAction = {
  href: string;
  label: string;
  tone?: "success";
};

type SetupStepState = "active" | "attention" | "checking" | "complete" | "locked";

type SetupProgressItem = {
  label: string;
  title: string;
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
        characterReview: "캐릭터 확인 필요",
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
        characterReview: "Review character",
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

function getOnboardingCopy(locale: Locale) {
  return locale === "ko"
    ? {
        accountCheckingBody:
          "회원 세션과 지갑 연결 상태를 확인하고 있습니다. 확인이 끝나면 다음 단계가 자동으로 정리됩니다.",
        accountCheckingTitle: "계정 상태 확인 중",
        accountReadyBody:
          "회원 세션과 지갑 연결이 확인되었습니다. 이제 캐릭터 상태만 이어서 확인하면 됩니다.",
        accountReadyTitle: "계정 연결 완료",
        accountReviewBody:
          "가입 또는 연결 상태 확인이 필요합니다. 계정 연결 페이지에서 상태를 먼저 정리하세요.",
        accountReviewTitle: "계정 상태 확인 필요",
        characterCardChecking: "캐릭터 확인 중",
        characterCardFallback: "저장된 AI 캐릭터",
        characterCardReady: "콘텐츠에 자동 적용됩니다",
        characterCardReview: "상태 확인이 필요합니다",
        characterCheckingBody:
          "저장된 캐릭터와 대표 아바타를 불러오고 있습니다.",
        characterCheckingTitle: "AI 캐릭터 확인 중",
        characterEmptyBody:
          "표시 이름과 분위기만 정하면 대표 아바타까지 자동으로 준비합니다.",
        characterEmptyTitle: "AI 캐릭터 만들기",
        characterReadyBody: (name: string | null) =>
          name
            ? `${name} 캐릭터가 준비되어 있습니다. 필요하면 전용 페이지에서 확인하거나 변경할 수 있습니다.`
            : "AI 캐릭터가 준비되어 있습니다. 필요하면 전용 페이지에서 확인하거나 변경할 수 있습니다.",
        characterReadyTitle: "AI 캐릭터 준비 완료",
        characterReviewBody:
          "저장된 캐릭터 정보를 확인하지 못했습니다. 캐릭터 페이지에서 상태를 다시 확인하세요.",
        characterReviewTitle: "캐릭터 상태 확인 필요",
        firstReadyBody:
          "준비된 캐릭터를 자동 적용해 오늘의 장면을 세로형 브이로그로 만들 수 있습니다.",
        firstReadyTitle: "첫 브이로그를 만들 차례",
        firstRequiresCharacterBody:
          "먼저 캐릭터를 만들면 해당 캐릭터가 첫 브이로그 생성 화면에 자동 적용됩니다.",
        firstRequiresCharacterTitle: "캐릭터 준비 후 생성 가능",
        firstWaitingBody:
          "캐릭터 확인이 끝나면 바로 첫 브이로그 생성으로 이어갈 수 있습니다.",
        firstWaitingTitle: "캐릭터 확인 후 생성 가능",
        heroCharacterPending:
          "계정 연결은 확인되었습니다. 표시 이름과 분위기만 정하면 캐릭터와 대표 아바타를 자동으로 준비합니다.",
        heroChecking:
          "계정과 캐릭터 상태를 확인하고 있습니다. 확인이 끝나면 필요한 다음 작업만 보여드립니다.",
        heroPayment:
          "가입 완료 확인이 필요합니다. 결제 또는 가입 상태를 정리한 뒤 FanLetter 흐름을 이어가세요.",
        heroReady: (name: string | null) =>
          name
            ? `${name} 캐릭터가 준비되어 있습니다. 이제 첫 브이로그를 만들고 FanLetter 피드로 이어가세요.`
            : "계정과 AI 캐릭터가 준비되어 있습니다. 이제 첫 브이로그를 만들고 FanLetter 피드로 이어가세요.",
        heroReview:
          "계정 연결 상태 확인이 필요합니다. 먼저 연결 상태를 정리한 뒤 캐릭터와 브이로그 생성을 이어가세요.",
        progress: {
          active: "다음",
          attention: "확인",
          checking: "확인 중",
          complete: "완료",
          locked: "대기",
        },
        statusCharacterPending:
          "계정은 연결되어 있습니다. 캐릭터를 만들면 첫 브이로그 생성으로 바로 이어집니다.",
        statusChecking:
          "연결 상태를 확인하는 중입니다. 잠시 후 완료된 단계가 자동으로 표시됩니다.",
        statusReady:
          "계정과 캐릭터가 준비되어 있습니다. 이제 첫 브이로그 생성이 다음 단계입니다.",
      }
    : {
        accountCheckingBody:
          "Checking the member session and wallet connection. The next step will update automatically.",
        accountCheckingTitle: "Checking account status",
        accountReadyBody:
          "The member session and wallet connection are ready. Next, confirm the character state.",
        accountReadyTitle: "Account connected",
        accountReviewBody:
          "Signup or connection status needs review. Start by resolving it on the account page.",
        accountReviewTitle: "Review account status",
        characterCardChecking: "Checking character",
        characterCardFallback: "Saved AI character",
        characterCardReady: "Applied automatically to content",
        characterCardReview: "Needs review",
        characterCheckingBody:
          "Loading the saved character and representative avatar.",
        characterCheckingTitle: "Checking AI character",
        characterEmptyBody:
          "Choose a display name and mood to prepare the representative avatar automatically.",
        characterEmptyTitle: "Create AI character",
        characterReadyBody: (name: string | null) =>
          name
            ? `${name} is ready. You can review or change the character on the dedicated page.`
            : "The AI character is ready. You can review or change it on the dedicated page.",
        characterReadyTitle: "AI character ready",
        characterReviewBody:
          "The saved character could not be confirmed. Review it on the character page.",
        characterReviewTitle: "Review character status",
        firstReadyBody:
          "Use the prepared character automatically and turn today's moment into a vertical vlog.",
        firstReadyTitle: "Create the first vlog next",
        firstRequiresCharacterBody:
          "Create the character first, then it will be applied automatically to the first vlog flow.",
        firstRequiresCharacterTitle: "Create after character setup",
        firstWaitingBody:
          "Once the character check finishes, you can continue directly into first vlog creation.",
        firstWaitingTitle: "Create after character check",
        heroCharacterPending:
          "The account is connected. Choose a display name and mood to prepare the character and avatar automatically.",
        heroChecking:
          "Checking account and character status. Once resolved, only the next required action will be shown.",
        heroPayment:
          "Signup verification is required. Resolve payment or signup status before continuing FanLetter.",
        heroReady: (name: string | null) =>
          name
            ? `${name} is ready. Create the first vlog and continue into the FanLetter feed.`
            : "The account and AI character are ready. Create the first vlog and continue into the FanLetter feed.",
        heroReview:
          "Account connection needs review. Resolve the connection first, then continue into character and vlog creation.",
        progress: {
          active: "Next",
          attention: "Review",
          checking: "Checking",
          complete: "Done",
          locked: "Waiting",
        },
        statusCharacterPending:
          "The account is connected. Create the character to continue into first vlog creation.",
        statusChecking:
          "Checking connection status. Completed steps will update automatically.",
        statusReady:
          "The account and character are ready. First vlog creation is the next step.",
      };
}

function getSetupStepState({
  character,
  status,
  stepIndex,
}: {
  character: CharacterState;
  status: SetupStatus;
  stepIndex: number;
}): SetupStepState {
  if (stepIndex === 0) {
    if (status === "connected") {
      return "complete";
    }

    if (status === "checking") {
      return "checking";
    }

    if (
      status === "issue" ||
      status === "pendingPayment" ||
      status === "setupMissing"
    ) {
      return "attention";
    }

    return "active";
  }

  if (stepIndex === 1) {
    if (status === "checking") {
      return "checking";
    }

    if (status !== "connected") {
      return "locked";
    }

    if (character.status === "ready") {
      return "complete";
    }

    if (character.status === "checking") {
      return "checking";
    }

    if (character.status === "error") {
      return "attention";
    }

    return "active";
  }

  if (status === "connected" && character.status === "ready") {
    return "active";
  }

  if (
    status === "checking" ||
    (status === "connected" && character.status === "checking")
  ) {
    return "checking";
  }

  return "locked";
}

function getProgressTileClassName(state: SetupStepState) {
  const base = "rounded-lg border p-3 transition";

  if (state === "complete") {
    return joinClasses(base, "border-[#44f26e] bg-[#44f26e] text-black");
  }

  if (state === "active") {
    return joinClasses(
      base,
      "border-[#44f26e]/70 bg-white/[0.085] text-white shadow-[0_14px_34px_rgba(68,242,110,0.12)]",
    );
  }

  if (state === "attention") {
    return joinClasses(base, "border-[#ffd166]/60 bg-[#ffd166]/12 text-white");
  }

  if (state === "checking") {
    return joinClasses(base, "border-white/18 bg-white/[0.08] text-white");
  }

  return joinClasses(base, "border-white/10 bg-white/[0.045] text-white/46");
}

function getStepText({
  body,
  character,
  locale,
  status,
  stepIndex,
  title,
}: {
  body: string;
  character: CharacterState;
  locale: Locale;
  status: SetupStatus;
  stepIndex: number;
  title: string;
}) {
  const copy = getOnboardingCopy(locale);

  if (stepIndex === 0) {
    if (status === "connected") {
      return {
        body: copy.accountReadyBody,
        title: copy.accountReadyTitle,
      };
    }

    if (status === "checking") {
      return {
        body: copy.accountCheckingBody,
        title: copy.accountCheckingTitle,
      };
    }

    if (
      status === "issue" ||
      status === "pendingPayment" ||
      status === "setupMissing"
    ) {
      return {
        body: copy.accountReviewBody,
        title: copy.accountReviewTitle,
      };
    }
  }

  if (stepIndex === 1 && status === "connected") {
    if (character.status === "ready") {
      return {
        body: copy.characterReadyBody(character.name),
        title: copy.characterReadyTitle,
      };
    }

    if (character.status === "checking") {
      return {
        body: copy.characterCheckingBody,
        title: copy.characterCheckingTitle,
      };
    }

    if (character.status === "error") {
      return {
        body: copy.characterReviewBody,
        title: copy.characterReviewTitle,
      };
    }

    return {
      body: copy.characterEmptyBody,
      title: copy.characterEmptyTitle,
    };
  }

  if (stepIndex === 2) {
    if (status === "connected" && character.status === "ready") {
      return {
        body: copy.firstReadyBody,
        title: copy.firstReadyTitle,
      };
    }

    if (status === "connected" && character.status === "checking") {
      return {
        body: copy.firstWaitingBody,
        title: copy.firstWaitingTitle,
      };
    }

    if (status === "connected") {
      return {
        body: copy.firstRequiresCharacterBody,
        title: copy.firstRequiresCharacterTitle,
      };
    }
  }

  return {
    body,
    title,
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

  if (stepIndex === 1) {
    return character.status === "ready"
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
          };
  }

  if (status === "checking") {
    return {
      href: links.connectHref,
      label: copy.checking,
    };
  }

  if (status !== "connected") {
    return {
      href: links.connectHref,
      label: copy.connect,
    };
  }

  if (character.status === "ready") {
    return {
        href: links.createHref,
        label: copy.firstVlog,
    };
  }

  if (character.status === "checking") {
    return {
      href: links.profileHref,
      label: copy.characterChecking,
    };
  }

  return {
    href: links.profileHref,
    label: copy.create,
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
  const isChecking =
    (status === "checking" && stepIndex === 0) ||
    (setupState.character.status === "checking" && stepIndex > 0);

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
      {isChecking ? <Loader2 className="size-4 animate-spin" /> : null}
      {action.label || defaultLabel}
      <ArrowRight className="size-4" />
    </Link>
  );
}

export function FanletterSetupStepNavLink({
  activateHref,
  children,
  className,
  connectHref,
  createHref,
  locale,
  onboardingHref,
  profileHref,
  stepIndex,
  studioHref,
}: SetupStepNavLinkProps) {
  const setupState = useSetupState();
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
    status: setupState.accountStatus,
    stepIndex,
  });

  return (
    <Link className={className} href={action.href}>
      {children}
    </Link>
  );
}

export function FanletterSetupStepBadge({
  locale,
  surface = "light",
  stepIndex = 0,
}: {
  locale: Locale;
  surface?: SetupSurface;
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
  const isAttention = isCharacterStep && setupState.character.status === "error";
  const label = isCharacterStep
    ? isChecking
      ? copy.characterChecking
      : isAttention
        ? copy.characterReview
      : isComplete
        ? copy.characterReady
        : copy.create
    : isChecking
      ? copy.checking
      : isComplete
        ? copy.connected
        : copy.connect;

  return (
    <span
      className={joinClasses(
        "inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em]",
        isComplete
          ? surface === "dark"
            ? "bg-[#44f26e]/16 text-[#44f26e]"
            : "bg-[#e8f9ed] text-[#16702e]"
          : isAttention
            ? surface === "dark"
              ? "bg-[#ffd166]/16 text-[#ffd166]"
              : "bg-[#fff4d6] text-[#7a4e00]"
            : surface === "dark"
              ? "bg-white/14 text-white/76"
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

export function FanletterSetupHeroDescription({
  defaultText,
  locale,
}: {
  defaultText: string;
  locale: Locale;
}) {
  const setupState = useSetupState();
  const copy = getOnboardingCopy(locale);
  const { accountStatus, character } = setupState;
  const text =
    accountStatus === "checking"
      ? copy.heroChecking
      : accountStatus === "pendingPayment"
        ? copy.heroPayment
        : accountStatus === "issue" || accountStatus === "setupMissing"
          ? copy.heroReview
          : accountStatus === "connected" && character.status === "checking"
            ? copy.heroChecking
            : accountStatus === "connected" && character.status === "ready"
              ? copy.heroReady(character.name)
              : accountStatus === "connected"
                ? copy.heroCharacterPending
                : defaultText;

  return <>{text}</>;
}

export function FanletterSetupProgressTiles({
  items,
  locale,
}: {
  items: SetupProgressItem[];
  locale: Locale;
}) {
  const setupState = useSetupState();
  const copy = getOnboardingCopy(locale);

  return (
    <div className="mt-6 grid grid-cols-3 gap-2">
      {items.map((item, index) => {
        const state = getSetupStepState({
          character: setupState.character,
          status: setupState.accountStatus,
          stepIndex: index,
        });
        const statusLabel = copy.progress[state];

        return (
          <div className={getProgressTileClassName(state)} key={item.title}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xl font-semibold leading-none">
                {String(index + 1).padStart(2, "0")}
              </p>
              {state === "checking" ? (
                <Loader2 className="size-3.5 shrink-0 animate-spin opacity-70" />
              ) : state === "complete" ? (
                <CheckCircle2 className="size-3.5 shrink-0 opacity-80" />
              ) : (
                <ArrowRight className="size-3.5 shrink-0 opacity-55" />
              )}
            </div>
            <p className="mt-2 truncate text-[0.56rem] font-semibold uppercase tracking-[0.1em] opacity-75">
              {item.label}
            </p>
            <p className="mt-2 text-[0.68rem] font-semibold leading-none opacity-90">
              {statusLabel}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function FanletterSetupStatusNote({
  defaultText,
  locale,
}: {
  defaultText: string;
  locale: Locale;
}) {
  const setupState = useSetupState();
  const copy = getOnboardingCopy(locale);
  const text =
    setupState.accountStatus === "checking"
      ? copy.statusChecking
      : setupState.accountStatus === "connected" &&
          setupState.character.status === "checking"
        ? copy.statusChecking
      : setupState.accountStatus === "connected" &&
          setupState.character.status === "ready"
        ? copy.statusReady
        : setupState.accountStatus === "connected"
          ? copy.statusCharacterPending
          : defaultText;

  return <>{text}</>;
}

export function FanletterSetupStepText({
  body,
  locale,
  stepIndex,
  title,
}: {
  body: string;
  locale: Locale;
  stepIndex: number;
  title: string;
}) {
  const setupState = useSetupState();
  const copy = getOnboardingCopy(locale);
  const text = getStepText({
    body,
    character: setupState.character,
    locale,
    status: setupState.accountStatus,
    stepIndex,
    title,
  });
  const shouldShowCharacterCard =
    stepIndex === 1 &&
    setupState.accountStatus === "connected" &&
    (setupState.character.status === "checking" ||
      setupState.character.status === "error" ||
      setupState.character.status === "ready");
  const characterName =
    setupState.character.name?.trim() || copy.characterCardFallback;
  const characterInitial = characterName.charAt(0).toUpperCase() || "F";
  const characterCardLabel =
    setupState.character.status === "ready"
      ? copy.characterCardReady
      : setupState.character.status === "checking"
        ? copy.characterCardChecking
        : copy.characterCardReview;

  return (
    <>
      <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-normal">
        {text.title}
      </h2>
      <p className="mt-2 text-sm font-medium leading-6 text-black/58">
        {text.body}
      </p>
      {shouldShowCharacterCard ? (
        <div
          className={joinClasses(
            "mt-3 flex min-w-0 items-center gap-3 rounded-lg border p-3",
            setupState.character.status === "error"
              ? "border-[#ffd166]/70 bg-[#fff8df]"
              : "border-[#44f26e]/30 bg-[#f0fff4]",
          )}
        >
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#44f26e] bg-cover bg-center text-sm font-semibold text-black ring-2 ring-white"
            style={
              setupState.character.avatarImageUrl
                ? {
                    backgroundImage: `url(${setupState.character.avatarImageUrl})`,
                  }
                : undefined
            }
          >
            {setupState.character.avatarImageUrl ? null : characterInitial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-black/46">
              {characterCardLabel}
            </span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-black">
              {characterName}
            </span>
          </span>
          {setupState.character.status === "checking" ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-black/42" />
          ) : setupState.character.status === "ready" ? (
            <CheckCircle2 className="size-4 shrink-0 text-[#16702e]" />
          ) : (
            <ArrowRight className="size-4 shrink-0 text-[#7a4e00]" />
          )}
        </div>
      ) : null}
    </>
  );
}
