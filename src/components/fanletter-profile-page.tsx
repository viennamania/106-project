"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CircleAlert,
  Heart,
  ImageIcon,
  Loader2,
  LockKeyhole,
  MessageCircleHeart,
  Save,
  Sparkles,
  Trophy,
  UserRound,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { FanletterAccountStatusLink } from "@/components/fanletter-account-status-link";
import { useMemberSession } from "@/components/member-session-provider";
import type {
  CreatorCharacterPersona,
  CreatorCharacterPersonaGenerateResponse,
  CreatorProfileAvatarCandidate,
  CreatorProfileAvatarGenerateResponse,
  CreatorProfileRecord,
  CreatorProfileResponse,
} from "@/lib/content";
import type {
  FanletterCharacterGrowthRecord,
  FanletterCharacterGrowthResponse,
} from "@/lib/fanletter-character-growth";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import type { Locale } from "@/lib/i18n";
import type { MemberRecord } from "@/lib/member";
import { syncServerMemberRegistration } from "@/lib/member-session-client";
import { smartWalletChain, thirdwebClient } from "@/lib/thirdweb";
import {
  getThirdwebUserEmail,
  useThirdwebConnectionState,
} from "@/lib/thirdweb-client";

type EditableFanletterProfile = {
  avatarImageSet: CreatorProfileAvatarCandidate[];
  avatarImageUrl: string;
  characterPersona: CreatorCharacterPersona | null;
  displayName: string;
  heroImageUrl: string;
  intro: string;
  payoutWalletAddress: string;
};

type PersonaGenerationState = {
  ageRange: "" | "20s" | "30s" | "40s" | "50s_plus";
  appearanceTone:
    | "auto"
    | "african_diaspora"
    | "east_asian"
    | "latin"
    | "middle_eastern_mediterranean"
    | "south_asian"
    | "western";
  candidates: CreatorCharacterPersona[];
  error: string | null;
  gender: "" | "female" | "male";
  status: "idle" | "loading" | "ready" | "error";
};

type AvatarGenerationState = {
  candidates: CreatorProfileAvatarCandidate[];
  error: string | null;
  status: "idle" | "loading" | "ready" | "error";
};

type CharacterQuickstartState = {
  advancedOpen: boolean;
  ageRange: "auto" | "20s" | "30s" | "40s" | "50s_plus";
  appearanceTone:
    | "auto"
    | "african_diaspora"
    | "east_asian"
    | "latin"
    | "middle_eastern_mediterranean"
    | "south_asian"
    | "western";
  error: string | null;
  gender: "auto" | "female" | "male";
  status: "idle" | "loading" | "ready" | "error";
  style: "chic" | "daily" | "fan_service" | "friendly";
};

type CharacterGrowthState = {
  data: FanletterCharacterGrowthRecord | null;
  error: string | null;
  status: "idle" | "loading" | "ready" | "error";
};

const EMPTY_PROFILE: EditableFanletterProfile = {
  avatarImageSet: [],
  avatarImageUrl: "",
  characterPersona: null,
  displayName: "",
  heroImageUrl: "",
  intro: "",
  payoutWalletAddress: "",
};

const EMPTY_PERSONA_GENERATION: PersonaGenerationState = {
  ageRange: "",
  appearanceTone: "auto",
  candidates: [],
  error: null,
  gender: "",
  status: "idle",
};

const EMPTY_AVATAR_GENERATION: AvatarGenerationState = {
  candidates: [],
  error: null,
  status: "idle",
};
const EMPTY_QUICK_CHARACTER: CharacterQuickstartState = {
  advancedOpen: false,
  ageRange: "auto",
  appearanceTone: "auto",
  error: null,
  gender: "auto",
  status: "idle",
  style: "friendly",
};
const EMPTY_CHARACTER_GROWTH: CharacterGrowthState = {
  data: null,
  error: null,
  status: "idle",
};
const FANLETTER_PROFILE_DISCONNECTED_GRACE_MS = 4500;

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        age: "연령대",
        ageOptions: [
          ["20s", "20대"],
          ["30s", "30대"],
          ["40s", "40대"],
          ["50s_plus", "50대 이상"],
        ] as const,
        appearance: "인종/외형 톤",
        appearanceHint: "자동을 선택해도 됩니다. 특정 이미지 톤이 필요하면 선택하세요.",
        appearanceOptions: [
          ["auto", "자동"],
          ["east_asian", "동아시아"],
          ["western", "서구권"],
          ["latin", "라틴"],
          ["south_asian", "남아시아"],
          ["middle_eastern_mediterranean", "중동/지중해"],
          ["african_diaspora", "아프리카 디아스포라"],
        ] as const,
        avatar: "AI 브이로그 아바타",
        avatarBody:
          "선택한 캐릭터 페르소나로 기본, 미소, 차분한 표정의 브이로그 아바타 세트를 만들고 대표 이미지를 저장합니다.",
        avatarGenerate: "AI 아바타 생성",
        avatarGenerating: "아바타 생성 중...",
        avatarRequired: "캐릭터 페르소나를 먼저 선택하세요.",
        avatarSelect: "대표로 저장",
        avatarSelected: "대표 이미지",
        back: "온보딩으로 돌아가기",
        characterChange: "캐릭터 변경 페이지",
        characterLockedBody:
          "이 화면에서는 성장 상태와 다음 미션을 확인합니다. 페르소나나 대표 아바타를 바꾸려면 전용 변경 페이지에서 진행하세요.",
        characterLockedTitle: "캐릭터 정체성이 고정되어 있습니다.",
        characterReview: "캐릭터 확인",
        connectRequired:
          "AI 캐릭터를 만들기 전에 계정 연결을 먼저 완료하세요. 연결 후 이 캐릭터 만들기 화면으로 돌아옵니다.",
        connectRequiredCta: "계정 연결하기",
        completed: "준비 완료",
        contentHome: {
          avatarSet: "아바타 세트",
          body:
            "이 프로필은 생성 설정이 아니라 팬이 소비하는 캐릭터 채널의 중심 자산입니다.",
          changeCta: "정체성 변경",
          createCta: "오늘의 브이로그 만들기",
          emptySkill: "첫 브이로그를 만들면 콘텐츠 강점이 열립니다.",
          eyebrow: "Character Content Home",
          fanSignal: "팬 요청 반응력",
          identitySignal: "고정 정체성",
          nextPrompt: "다음 콘텐츠는 캐릭터의 강점과 팬 요청 흐름을 반영해 만드세요.",
          reactionSignal: "팬 반응",
          skills: "콘텐츠 강점",
          studioCta: "스튜디오 보기",
          title: "내 캐릭터 콘텐츠 홈",
          vlogSignal: "공개 브이로그",
        },
        contentCta: "첫 브이로그 만들기",
        disconnected: "계정 연결이 필요합니다.",
        displayName: "표시 이름",
        displayNameHint: "브이로그 피드와 상세에 보이는 AI 캐릭터/채널 이름입니다.",
        displayNamePlaceholder: "예: 지니뮤직",
        errorFallback: "프로필을 처리하지 못했습니다.",
        eyebrow: "FanLetter Profile",
        gender: "성별",
        genderAuto: "자동",
        genderFemale: "여성",
        genderMale: "남성",
        generatePersona: "AI가 페르소나 추천",
        generatingPersona: "페르소나 생성 중...",
        loading: "프로필을 불러오는 중입니다.",
        missingDisplayName: "표시 이름을 입력하세요.",
        manualSetupBody:
          "원하는 경우 성별, 연령, 페르소나 후보, 아바타 후보를 직접 고를 수 있습니다.",
        manualSetupTitle: "직접 고급 설정",
        paymentRequired:
          "가입 완료 회원만 FanLetter 프로필을 설정할 수 있습니다.",
        paymentRequiredCta: "가입 완료 확인하기",
        profileStep: "02 · 캐릭터 만들기",
        persona: "캐릭터 페르소나",
        personaBody:
          "같은 AI 브이로그 캐릭터가 유지되도록 얼굴, 헤어, 피부 톤, 신체 실루엣의 고정 정보를 선택합니다.",
        personaRequired: "성별과 연령대를 먼저 선택하세요.",
        personaSave: "선택하고 저장",
        personaSaved: "적용됨",
        quickAdvanced: "고급 설정",
        quickAge: "연령대",
        quickAgeAuto: "자동",
        quickBody:
          "표시 이름과 분위기만 정하면 캐릭터 페르소나, 아바타, 대표 이미지를 자동으로 저장합니다.",
        quickButton: "캐릭터 만들기",
        quickCreating: "캐릭터 생성 중...",
        quickGender: "캐릭터 타입",
        quickStyle: "분위기",
        quickStyleChic: "시크한",
        quickStyleDaily: "일상 브이로그",
        quickStyleFanService: "팬서비스형",
        quickStyleFriendly: "친근한",
        quickSuccess: "캐릭터를 만들고 FanLetter 프로필에 저장했습니다.",
        quickPanelTitle: "표시 이름과 분위기만 정하면 끝",
        quickTitle: "빠른 캐릭터 만들기",
        refresh: "다시 불러오기",
        save: "프로필 저장",
        saving: "저장 중...",
        selectedPersona: "선택된 페르소나",
        readyBody:
          "대표 페르소나와 아바타는 고정되어 있습니다. 여기서는 성장 단계와 다음 미션을 보고, 변경이 필요할 때만 전용 페이지로 이동합니다.",
        readyTitle: "AI 캐릭터의 성장 상태를 확인하세요.",
        setupBody:
          "표시 이름과 분위기만 정하면 캐릭터 설정을 자동으로 끝내고 첫 숏폼 브이로그 생성으로 바로 이어집니다.",
        studio: "브이로그 스튜디오",
        title: "AI 캐릭터 브이로그 프로필을 빠르게 준비하세요.",
        nextContentCta: "다음 단계: 첫 브이로그 만들기",
        growthActionCta: "진행하기",
        growthAvatarCollection: "아바타 성장 컬렉션",
        growthCompleted: "완료",
        growthContentSkills: "콘텐츠 스킬",
        growthFallbackBody:
          "계정 데이터를 불러오면 캐릭터 레벨, 성장 미션, 해금 상태를 보여줍니다.",
        growthFallbackTitle: "캐릭터 성장 준비 중",
        growthIdentityBody:
          "페르소나와 대표 아바타는 캐릭터의 고정 정체성입니다. 성장은 표정, 콘텐츠 스킬, 연출 방향을 확장합니다.",
        growthIdentityLocked: "정체성 고정됨",
        growthLoading: "캐릭터 성장 상태를 계산하는 중입니다.",
        growthMissions: "성장 미션",
        growthNext: "다음 성장",
        growthSignals: "성장 신호",
        growthTitle: "캐릭터 성장 센터",
        growthUnlocked: "해금됨",
        growthXp: "XP",
        growthXpMax: "최고 레벨",
        growthXpToNext: "다음 레벨까지",
        metricComments: "댓글",
        metricFanRequests: "팬 요청",
        metricPublished: "공개 브이로그",
        metricReactions: "팬 반응",
        metricSaves: "저장",
      }
    : {
        age: "Age range",
        ageOptions: [
          ["20s", "20s"],
          ["30s", "30s"],
          ["40s", "40s"],
          ["50s_plus", "50s+"],
        ] as const,
        appearance: "Ethnicity / appearance tone",
        appearanceHint: "Auto is fine. Choose a tone when you need a specific look.",
        appearanceOptions: [
          ["auto", "Auto"],
          ["east_asian", "East Asian"],
          ["western", "Western"],
          ["latin", "Latin"],
          ["south_asian", "South Asian"],
          ["middle_eastern_mediterranean", "Middle Eastern / Mediterranean"],
          ["african_diaspora", "African diaspora"],
        ] as const,
        avatar: "AI vlogger avatar",
        avatarBody:
          "Create a small vlogger expression set from the selected character persona and save the representative avatar.",
        avatarGenerate: "Generate AI avatar",
        avatarGenerating: "Generating avatar...",
        avatarRequired: "Select a character persona first.",
        avatarSelect: "Save as avatar",
        avatarSelected: "Current avatar",
        back: "Back to onboarding",
        characterChange: "Change character",
        characterLockedBody:
          "This screen is for growth status and next missions. Use the dedicated change page when you need to change the persona or representative avatar.",
        characterLockedTitle: "Character identity is locked.",
        characterReview: "Character review",
        connectRequired:
          "Connect your account before creating the AI character. After connection, you will return to this character setup screen.",
        connectRequiredCta: "Connect account",
        completed: "Ready",
        contentHome: {
          avatarSet: "Avatar set",
          body:
            "This profile is the core content asset for the character channel, not just setup.",
          changeCta: "Change identity",
          createCta: "Create today's vlog",
          emptySkill: "Create the first vlog to unlock content strengths.",
          eyebrow: "Character Content Home",
          fanSignal: "Fan request response",
          identitySignal: "Locked identity",
          nextPrompt:
            "Create the next post with the character strengths and fan request loop in mind.",
          reactionSignal: "Fan reactions",
          skills: "Content strengths",
          studioCta: "Open studio",
          title: "My character content home",
          vlogSignal: "Public vlogs",
        },
        contentCta: "Create first vlog",
        disconnected: "Account connection required.",
        displayName: "Display name",
        displayNameHint: "Shown in the vlog feed and detail pages.",
        displayNamePlaceholder: "Example: Genie Music",
        errorFallback: "Failed to process profile.",
        eyebrow: "FanLetter Profile",
        gender: "Gender",
        genderAuto: "Auto",
        genderFemale: "Female",
        genderMale: "Male",
        generatePersona: "Suggest personas",
        generatingPersona: "Generating personas...",
        loading: "Loading profile.",
        missingDisplayName: "Enter a display name.",
        manualSetupBody:
          "Optionally choose gender, age range, persona candidates, and avatar candidates yourself.",
        manualSetupTitle: "Manual advanced setup",
        paymentRequired:
          "Only completed members can set up a FanLetter profile.",
        paymentRequiredCta: "Verify signup",
        profileStep: "02 · Create character",
        persona: "Character persona",
        personaBody:
          "Choose fixed face, hair, skin tone, and neutral body silhouette details to keep the same AI vlogger.",
        personaRequired: "Select gender and age range first.",
        personaSave: "Select and save",
        personaSaved: "Applied",
        quickAdvanced: "Advanced settings",
        quickAge: "Age range",
        quickAgeAuto: "Auto",
        quickBody:
          "Choose a display name and mood. Persona, avatar set, representative image, and profile save happen automatically.",
        quickButton: "Create character",
        quickCreating: "Creating character...",
        quickGender: "Character type",
        quickStyle: "Mood",
        quickStyleChic: "Chic",
        quickStyleDaily: "Daily vlog",
        quickStyleFanService: "Fan service",
        quickStyleFriendly: "Friendly",
        quickSuccess: "Character created and saved to your FanLetter profile.",
        quickPanelTitle: "Name and mood are enough",
        quickTitle: "Quick character setup",
        refresh: "Reload",
        save: "Save profile",
        saving: "Saving...",
        selectedPersona: "Selected persona",
        readyBody:
          "The representative persona and avatar are locked. Review growth progress and next missions here, and only move to the change page when needed.",
        readyTitle: "Review your AI character growth.",
        setupBody:
          "Choose a display name and mood to finish character setup automatically, then continue to the first short-form vlog.",
        studio: "Vlog studio",
        title: "Prepare your AI character vlogger profile quickly.",
        nextContentCta: "Next: Create first vlog",
        growthActionCta: "Continue",
        growthAvatarCollection: "Avatar growth collection",
        growthCompleted: "Done",
        growthContentSkills: "Content skills",
        growthFallbackBody:
          "After account data loads, this shows character level, missions, and unlocks.",
        growthFallbackTitle: "Character growth setup",
        growthIdentityBody:
          "Persona and representative avatar are the fixed identity. Growth expands expressions, content skills, and direction.",
        growthIdentityLocked: "Identity locked",
        growthLoading: "Calculating character growth.",
        growthMissions: "Growth missions",
        growthNext: "Next growth",
        growthSignals: "Growth signals",
        growthTitle: "Character growth center",
        growthUnlocked: "Unlocked",
        growthXp: "XP",
        growthXpMax: "Max level",
        growthXpToNext: "To next level",
        metricComments: "Comments",
        metricFanRequests: "Fan requests",
        metricPublished: "Public vlogs",
        metricReactions: "Fan reactions",
        metricSaves: "Saves",
      };
}

function createEditableProfile(
  profile: CreatorProfileRecord | null | undefined,
): EditableFanletterProfile {
  if (!profile) {
    return EMPTY_PROFILE;
  }

  return {
    avatarImageSet: profile.avatarImageSet ?? [],
    avatarImageUrl: profile.avatarImageUrl ?? "",
    characterPersona: profile.characterPersona ?? null,
    displayName: profile.displayName,
    heroImageUrl: profile.heroImageUrl ?? "",
    intro: profile.intro,
    payoutWalletAddress: profile.payoutWalletAddress ?? "",
  };
}

async function readApiJson<T>(response: Response, fallbackMessage: string) {
  const text = await response.text();

  if (!text.trim()) {
    return {} as T | { error?: string };
  }

  try {
    return JSON.parse(text) as T | { error?: string };
  } catch {
    return { error: fallbackMessage };
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function StatusPanel({
  body,
  cta,
  eyebrow,
  href,
  secondaryCta,
  secondaryHref,
  title,
}: {
  body: string;
  cta: string;
  eyebrow?: string;
  href: string;
  secondaryCta?: string;
  secondaryHref?: string;
  title: string;
}) {
  return (
    <main className="min-h-[calc(100svh-5.1rem)] bg-[#030504] px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] text-white sm:min-h-screen sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100svh-8rem)] max-w-xl items-center sm:min-h-[70vh]">
        <section className="w-full rounded-lg border border-white/12 bg-white/[0.055] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.32)] sm:p-6">
          <CircleAlert className="size-8 text-[#44f26e]" />
          {eyebrow ? (
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-5 text-3xl font-semibold leading-tight">{title}</h1>
          <p className="mt-3 text-sm font-medium leading-6 text-white/58">
            {body}
          </p>
          <div className="mt-6 grid gap-2">
            <Link
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold !text-black transition hover:bg-[#67ff88]"
              href={href}
            >
              {cta}
              <ArrowRight className="size-4" />
            </Link>
            {secondaryCta && secondaryHref ? (
              <Link
                className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/16 px-5 text-sm font-semibold !text-white transition hover:bg-white/10"
                href={secondaryHref}
              >
                {secondaryCta}
              </Link>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

export function FanletterProfilePage({
  locale,
  referralCode,
  returnToHref,
}: {
  locale: Locale;
  referralCode: string | null;
  returnToHref: string;
}) {
  const copy = getCopy(locale);
  const account = useActiveAccount();
  const chain = useActiveWalletChain() ?? smartWalletChain;
  const connectionStatus = useActiveWalletConnectionStatus();
  const memberSession = useMemberSession();
  const { updateMemberSession } = memberSession;
  const accountAddress = account?.address ?? null;
  const connection = useThirdwebConnectionState({
    accountAddress,
    disconnectedResolveGraceMs: FANLETTER_PROFILE_DISCONNECTED_GRACE_MS,
    resolveGraceMs: FANLETTER_PROFILE_DISCONNECTED_GRACE_MS,
    status: connectionStatus,
  });
  const onboardingHref = buildPathWithReferral(
    `/${locale}/fanletter/onboarding`,
    referralCode,
  );
  const currentProfileHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/profile`, referralCode),
    { returnTo: returnToHref || onboardingHref },
  );
  const changeCharacterHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/profile/character`, referralCode),
    { returnTo: currentProfileHref },
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode),
    { returnTo: currentProfileHref },
  );
  const activateHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/activate`, referralCode),
    { returnTo: currentProfileHref },
  );
  const createHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/create`, referralCode),
    { returnTo: returnToHref || onboardingHref },
  );
  const studioHref = buildPathWithReferral(
    `/${locale}/fanletter/studio`,
    referralCode,
  );
  const [email, setEmail] = useState<string | null>(memberSession.email);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadStatus, setLoadStatus] =
    useState<"idle" | "loading" | "ready" | "error">("idle");
  const [member, setMember] = useState<MemberRecord | null>(
    memberSession.member,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [profile, setProfile] =
    useState<EditableFanletterProfile>(EMPTY_PROFILE);
  const [profileConfigured, setProfileConfigured] = useState(false);
  const [personaGeneration, setPersonaGeneration] =
    useState<PersonaGenerationState>(EMPTY_PERSONA_GENERATION);
  const [avatarGeneration, setAvatarGeneration] =
    useState<AvatarGenerationState>(EMPTY_AVATAR_GENERATION);
  const [quickCharacter, setQuickCharacter] =
    useState<CharacterQuickstartState>(EMPTY_QUICK_CHARACTER);
  const [characterGrowth, setCharacterGrowth] =
    useState<CharacterGrowthState>(EMPTY_CHARACTER_GROWTH);
  const loadInFlightRef = useRef(false);
  const selectedPersona = profile.characterPersona;
  const setupProgress = useMemo(
    () =>
      [
        Boolean(profile.displayName.trim()),
        Boolean(profile.characterPersona),
        Boolean(profile.avatarImageUrl),
      ].filter(Boolean).length,
    [profile.avatarImageUrl, profile.characterPersona, profile.displayName],
  );
  const characterReady = Boolean(
    profileConfigured &&
      profile.displayName.trim() &&
      profile.characterPersona &&
      profile.avatarImageUrl,
  );
  const avatarCandidates =
    avatarGeneration.candidates.length > 0
      ? avatarGeneration.candidates
      : profile.avatarImageSet;
  const cameFromOnboarding =
    returnToHref.split("?")[0] === `/${locale}/fanletter/onboarding`;
  const contentCtaLabel = cameFromOnboarding
    ? copy.nextContentCta
    : copy.contentCta;
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US"),
    [locale],
  );

  const resolveEmail = useCallback(async () => {
    const resolved =
      email ?? memberSession.email ?? (await getThirdwebUserEmail({ client: thirdwebClient }));

    if (!resolved) {
      throw new Error(copy.connectRequired);
    }

    setEmail(resolved);
    return resolved;
  }, [copy.connectRequired, email, memberSession.email]);

  const loadCharacterGrowth = useCallback(
    async (resolvedEmail: string) => {
      if (!accountAddress) {
        return;
      }

      try {
        setCharacterGrowth((current) => ({
          ...current,
          error: null,
          status: "loading",
        }));
        const params = new URLSearchParams({
          email: resolvedEmail,
          locale,
          walletAddress: accountAddress,
        });
        const response = await fetch(
          `/api/fanletter/character-growth?${params.toString()}`,
        );
        const data = await readApiJson<FanletterCharacterGrowthResponse>(
          response,
          copy.errorFallback,
        );

        if (!response.ok || !("growth" in data)) {
          throw new Error(
            "error" in data && data.error ? data.error : copy.errorFallback,
          );
        }

        setCharacterGrowth({
          data: data.growth,
          error: null,
          status: "ready",
        });
      } catch (growthError) {
        setCharacterGrowth({
          data: null,
          error: getErrorMessage(growthError, copy.errorFallback),
          status: "error",
        });
      }
    },
    [accountAddress, copy.errorFallback, locale],
  );

  const loadProfile = useCallback(async () => {
    if (!accountAddress || loadInFlightRef.current) {
      return;
    }

    loadInFlightRef.current = true;
    setError(null);
    setNotice(null);
    setLoadStatus("loading");

    try {
      const resolvedEmail = await resolveEmail();
      const profileUrl = `/api/content/profile?email=${encodeURIComponent(
        resolvedEmail,
      )}&walletAddress=${encodeURIComponent(accountAddress)}`;
      let response = await fetch(profileUrl);
      let data = await readApiJson<CreatorProfileResponse>(
        response,
        copy.errorFallback,
      );

      if (!response.ok && response.status === 404) {
        const syncData = await syncServerMemberRegistration({
          chainId: chain.id,
          chainName: chain.name ?? "BSC",
          email: resolvedEmail,
          locale,
          referredByCode: referralCode,
          syncMode: "light",
          walletAddress: accountAddress,
        });

        if (!syncData.ok) {
          throw new Error(syncData.error || copy.errorFallback);
        }

        if (syncData.member) {
          setMember(syncData.member);
          updateMemberSession({
            email: syncData.member.email,
            member: syncData.member,
            walletAddress: accountAddress,
          });
        }

        if (syncData.validationError) {
          setError(syncData.validationError);
          setLoadStatus("ready");
          return;
        }

        if (syncData.member?.status !== "completed") {
          setError(copy.paymentRequired);
          setLoadStatus("ready");
          return;
        }

        response = await fetch(profileUrl);
        data = await readApiJson<CreatorProfileResponse>(
          response,
          copy.errorFallback,
        );
      }

      if (!response.ok || !("profile" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : copy.errorFallback,
        );
      }

      if (data.member) {
        setMember(data.member);
        updateMemberSession({
          email: resolvedEmail,
          member: data.member,
          walletAddress: accountAddress,
        });
      }

      setProfile(createEditableProfile(data.profile));
      setProfileConfigured(data.profileConfigured);
      setLoadStatus("ready");
      void loadCharacterGrowth(resolvedEmail);
    } catch (loadError) {
      setError(getErrorMessage(loadError, copy.errorFallback));
      setLoadStatus("error");
    } finally {
      loadInFlightRef.current = false;
    }
  }, [
    accountAddress,
    chain.id,
    chain.name,
    copy.errorFallback,
    copy.paymentRequired,
    locale,
    referralCode,
    loadCharacterGrowth,
    resolveEmail,
    updateMemberSession,
  ]);

  useEffect(() => {
    if (!connection.isConnected) {
      return;
    }

    void loadProfile();
  }, [connection.isConnected, loadProfile]);

  async function saveProfile(profileOverride?: EditableFanletterProfile) {
    const nextProfile = profileOverride ?? profile;

    if (!nextProfile.displayName.trim()) {
      setError(copy.missingDisplayName);
      return;
    }

    if (!accountAddress) {
      setError(copy.connectRequired);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setNotice(null);
      const resolvedEmail = await resolveEmail();
      const response = await fetch("/api/content/profile", {
        body: JSON.stringify({
          avatarImageSet: nextProfile.avatarImageSet,
          avatarImageUrl: nextProfile.avatarImageUrl || null,
          characterPersona: nextProfile.characterPersona,
          displayName: nextProfile.displayName.trim(),
          email: resolvedEmail,
          heroImageUrl: nextProfile.heroImageUrl || null,
          intro: nextProfile.intro,
          payoutWalletAddress: nextProfile.payoutWalletAddress || null,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = await readApiJson<CreatorProfileResponse>(
        response,
        copy.errorFallback,
      );

      if (!response.ok || !("profile" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : copy.errorFallback,
        );
      }

      setProfile(createEditableProfile(data.profile));
      setProfileConfigured(data.profileConfigured);
      setNotice(locale === "ko" ? "프로필을 저장했습니다." : "Profile saved.");
      void loadCharacterGrowth(resolvedEmail);
    } catch (saveError) {
      setError(getErrorMessage(saveError, copy.errorFallback));
    } finally {
      setIsSaving(false);
    }
  }

  async function createQuickCharacter() {
    if (!profile.displayName.trim()) {
      setQuickCharacter((current) => ({
        ...current,
        error: copy.missingDisplayName,
        status: "error",
      }));
      setError(null);
      return;
    }

    if (!accountAddress) {
      setError(copy.connectRequired);
      return;
    }

    try {
      setQuickCharacter((current) => ({
        ...current,
        error: null,
        status: "loading",
      }));
      setError(null);
      setNotice(null);
      const resolvedEmail = await resolveEmail();
      const response = await fetch("/api/content/profile/character/quickstart", {
        body: JSON.stringify({
          ageRange:
            quickCharacter.ageRange === "auto" ? null : quickCharacter.ageRange,
          appearanceTone:
            quickCharacter.appearanceTone === "auto"
              ? null
              : quickCharacter.appearanceTone,
          displayName: profile.displayName.trim(),
          email: resolvedEmail,
          gender:
            quickCharacter.gender === "auto" ? null : quickCharacter.gender,
          intro: profile.intro,
          locale,
          style: quickCharacter.style,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = await readApiJson<CreatorProfileResponse>(
        response,
        copy.errorFallback,
      );

      if (!response.ok || !("profile" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : copy.errorFallback,
        );
      }

      setProfile(createEditableProfile(data.profile));
      setProfileConfigured(data.profileConfigured);
      setPersonaGeneration(EMPTY_PERSONA_GENERATION);
      setAvatarGeneration({
        candidates: data.profile.avatarImageSet,
        error: null,
        status: data.profile.avatarImageSet.length > 0 ? "ready" : "idle",
      });
      setQuickCharacter((current) => ({
        ...current,
        error: null,
        status: "ready",
      }));
      setNotice(data.characterWarning ?? copy.quickSuccess);
      void loadCharacterGrowth(resolvedEmail);
    } catch (quickError) {
      const message = getErrorMessage(quickError, copy.errorFallback);

      setQuickCharacter((current) => ({
        ...current,
        error: message,
        status: "error",
      }));
      setError(message);
    }
  }

  async function generatePersonas() {
    if (!personaGeneration.gender || !personaGeneration.ageRange) {
      setPersonaGeneration((current) => ({
        ...current,
        candidates: [],
        error: copy.personaRequired,
        status: "error",
      }));
      return;
    }

    if (!accountAddress) {
      setError(copy.connectRequired);
      return;
    }

    try {
      setPersonaGeneration((current) => ({
        ...current,
        candidates: [],
        error: null,
        status: "loading",
      }));
      const resolvedEmail = await resolveEmail();
      const response = await fetch("/api/content/profile/personas", {
        body: JSON.stringify({
          ageRange: personaGeneration.ageRange,
          appearanceTone:
            personaGeneration.appearanceTone === "auto"
              ? null
              : personaGeneration.appearanceTone,
          avatarImageUrl: profile.avatarImageUrl || null,
          displayName: profile.displayName,
          email: resolvedEmail,
          gender: personaGeneration.gender,
          intro: profile.intro,
          locale,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = await readApiJson<CreatorCharacterPersonaGenerateResponse>(
        response,
        copy.errorFallback,
      );

      if (!response.ok || !("candidates" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : copy.errorFallback,
        );
      }

      setPersonaGeneration((current) => ({
        ...current,
        candidates: data.candidates,
        error: null,
        status: "ready",
      }));
      setNotice(
        locale === "ko"
          ? "페르소나 후보가 준비되었습니다. 하나를 선택하면 바로 저장됩니다."
          : "Persona candidates are ready. Select one to save it.",
      );
    } catch (personaError) {
      const message = getErrorMessage(personaError, copy.errorFallback);

      setPersonaGeneration((current) => ({
        ...current,
        candidates: [],
        error: message,
        status: "error",
      }));
      setError(message);
    }
  }

  async function savePersona(persona: CreatorCharacterPersona) {
    const nextProfile = {
      ...profile,
      avatarImageSet: [],
      avatarImageUrl: "",
      characterPersona: persona,
    };

    setProfile(nextProfile);
    setAvatarGeneration(EMPTY_AVATAR_GENERATION);
    await saveProfile(nextProfile);
  }

  async function generateAvatars() {
    if (!profile.characterPersona) {
      setAvatarGeneration({
        candidates: [],
        error: copy.avatarRequired,
        status: "error",
      });
      return;
    }

    if (!accountAddress) {
      setError(copy.connectRequired);
      return;
    }

    try {
      setAvatarGeneration({
        candidates: [],
        error: null,
        status: "loading",
      });
      const resolvedEmail = await resolveEmail();
      const response = await fetch("/api/content/profile/avatar-candidates", {
        body: JSON.stringify({
          characterPersona: profile.characterPersona,
          displayName: profile.displayName,
          email: resolvedEmail,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = await readApiJson<CreatorProfileAvatarGenerateResponse>(
        response,
        copy.errorFallback,
      );

      if (!response.ok || !("candidates" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : copy.errorFallback,
        );
      }

      setAvatarGeneration({
        candidates: data.candidates,
        error: null,
        status: "ready",
      });
      setNotice(
        locale === "ko"
          ? "아바타 후보가 준비되었습니다. 대표 이미지를 선택하세요."
          : "Avatar candidates are ready. Select one as the representative image.",
      );
    } catch (avatarError) {
      const message = getErrorMessage(avatarError, copy.errorFallback);

      setAvatarGeneration({
        candidates: [],
        error: message,
        status: "error",
      });
      setError(message);
    }
  }

  async function saveAvatar(candidate: CreatorProfileAvatarCandidate) {
    const avatarImageSet =
      avatarGeneration.candidates.length > 0
        ? avatarGeneration.candidates
        : profile.avatarImageSet;
    const nextProfile = {
      ...profile,
      avatarImageSet,
      avatarImageUrl: candidate.url,
    };

    setProfile(nextProfile);
    await saveProfile(nextProfile);
  }

  function getGrowthActionHref(
    action: FanletterCharacterGrowthRecord["missions"][number]["action"],
  ) {
    if (action === "create_character") {
      return currentProfileHref;
    }

    if (action === "create_vlog") {
      return createHref;
    }

    return studioHref;
  }

  function renderCharacterContentHome() {
    if (!characterReady) {
      return null;
    }

    const growth = characterGrowth.data;
    const reactionCount = growth
      ? growth.metrics.likeCount +
        growth.metrics.commentCount +
        growth.metrics.saveCount
      : 0;
    const contentStrengths =
      growth?.contentSkills.filter((skill) => skill.unlocked).slice(0, 3) ?? [];
    const fallbackStrengths =
      selectedPersona?.lockedTraits.slice(0, 3).map((trait, index) => ({
        description: copy.growthIdentityLocked,
        id: `trait-${index}-${trait}`,
        label: trait,
      })) ?? [];
    const strengths =
      contentStrengths.length > 0 ? contentStrengths : fallbackStrengths;
    const avatarPreviewSet = [
      ...(profile.avatarImageUrl
        ? [
            {
              label: copy.avatarSelected,
              url: profile.avatarImageUrl,
            },
          ]
        : []),
      ...profile.avatarImageSet
        .filter((candidate) => candidate.url !== profile.avatarImageUrl)
        .slice(0, 3)
        .map((candidate) => ({
          label: candidate.label ?? candidate.expression ?? copy.avatar,
          url: candidate.url,
        })),
    ].slice(0, 4);
    const signalCards = [
      {
        Icon: Video,
        label: copy.contentHome.vlogSignal,
        value: growth?.metrics.publishedVlogCount ?? 0,
      },
      {
        Icon: MessageCircleHeart,
        label: copy.contentHome.fanSignal,
        value: growth?.metrics.fanRequestTotalCount ?? 0,
      },
      {
        Icon: Heart,
        label: copy.contentHome.reactionSignal,
        value: reactionCount,
      },
    ];

    return (
      <section className="mt-5 rounded-lg border border-[#44f26e]/24 bg-[linear-gradient(135deg,#07100b_0%,#0f2a18_56%,#44f26e_170%)] p-4 text-white shadow-[0_30px_90px_rgba(0,0,0,0.3)] sm:p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:items-stretch">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#8dffa5]">
              {copy.contentHome.eyebrow}
            </p>
            <h2 className="mt-3 text-[2.25rem] font-semibold leading-[1.02] tracking-normal [word-break:keep-all] sm:text-[3.25rem]">
              {copy.contentHome.title}
            </h2>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-white/64 sm:text-base sm:leading-7">
              {copy.contentHome.body}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e] px-3 py-1 text-xs font-semibold text-black">
                <Trophy className="size-3.5" />
                {growth ? `Lv.${growth.level} · ${growth.title}` : copy.completed}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-white/[0.07] px-3 py-1 text-xs font-semibold text-white/72">
                <LockKeyhole className="size-3.5 text-[#44f26e]" />
                {copy.contentHome.identitySignal}
              </span>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {signalCards.map(({ Icon, label, value }) => (
                <div
                  className="rounded-lg border border-white/10 bg-white/[0.07] p-3"
                  key={label}
                >
                  <Icon className="size-4 text-[#44f26e]" />
                  <p className="mt-3 text-2xl font-semibold leading-none">
                    {numberFormatter.format(value)}
                  </p>
                  <p className="mt-2 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-white/42">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold !text-black transition hover:bg-[#67ff88]"
                href={createHref}
              >
                {copy.contentHome.createCta}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/16 px-5 text-sm font-semibold !text-white transition hover:bg-white/10"
                href={studioHref}
              >
                {copy.contentHome.studioCta}
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[13rem_minmax(0,1fr)]">
            <div className="min-w-0 rounded-lg border border-white/10 bg-black/22 p-3">
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-white/10 bg-black/24">
                {profile.avatarImageUrl ? (
                  <Image
                    alt={profile.displayName || copy.displayName}
                    className="object-cover"
                    fill
                    sizes="(max-width: 768px) 90vw, 208px"
                    src={profile.avatarImageUrl}
                  />
                ) : (
                  <span className="flex size-full items-center justify-center">
                    <UserRound className="size-12 text-[#44f26e]" />
                  </span>
                )}
              </div>
              <p className="mt-3 truncate text-lg font-semibold">
                {selectedPersona?.name ?? profile.displayName}
              </p>
              <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-white/50">
                {selectedPersona?.summary ?? copy.growthIdentityBody}
              </p>
            </div>

            <div className="grid min-w-0 gap-4">
              <div className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">
                    {copy.contentHome.skills}
                  </h3>
                  <Sparkles className="size-5 text-[#44f26e]" />
                </div>
                <div className="mt-3 grid gap-2">
                  {strengths.length > 0 ? (
                    strengths.map((strength) => (
                      <div
                        className="rounded-lg border border-white/10 bg-black/18 p-3"
                        key={strength.id}
                      >
                        <p className="text-sm font-semibold text-white">
                          {strength.label}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-white/48">
                          {strength.description}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-lg border border-white/10 bg-black/18 p-3 text-sm font-medium leading-6 text-white/50">
                      {copy.contentHome.emptySkill}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.055] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">
                    {copy.contentHome.avatarSet}
                  </h3>
                  <ImageIcon className="size-5 text-[#44f26e]" />
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {avatarPreviewSet.map((avatar) => (
                    <div
                      className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-black/22"
                      key={avatar.url}
                    >
                      <div className="relative aspect-square">
                        <Image
                          alt={avatar.label}
                          className="object-cover"
                          fill
                          sizes="72px"
                          src={avatar.url}
                        />
                      </div>
                    </div>
                  ))}
                  {avatarPreviewSet.length === 0 ? (
                    <div className="col-span-4 rounded-lg border border-white/10 bg-black/18 p-3 text-sm font-medium text-white/50">
                      {copy.avatarBody}
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <p className="text-xs font-medium leading-5 text-white/50">
                    {copy.contentHome.nextPrompt}
                  </p>
                  <Link
                    className="inline-flex h-10 items-center justify-center rounded-full border border-white/14 px-4 text-xs font-semibold !text-white transition hover:bg-white/8"
                    href={changeCharacterHref}
                  >
                    {copy.contentHome.changeCta}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderCharacterGrowthCenter() {
    const growth = characterGrowth.data;
    const nextMission = growth?.missions.find((mission) => !mission.completed);
    const progressPercent = growth?.progressPercent ?? setupProgress * 33;
    const xpLabel = growth
      ? `${numberFormatter.format(growth.totalXp)} ${copy.growthXp}`
      : copy.growthFallbackTitle;
    const nextLevelLabel = growth
      ? growth.xpToNextLevel === null
        ? copy.growthXpMax
        : `${numberFormatter.format(growth.xpToNextLevel)} ${copy.growthXp}`
      : copy.growthLoading;
    const reactionCount = growth
      ? growth.metrics.likeCount +
        growth.metrics.commentCount +
        growth.metrics.saveCount
      : 0;
    const avatarUnlocks = growth?.avatarUnlocks ?? [];
    const contentSkills = growth?.contentSkills ?? [];
    const metricTiles = [
      {
        icon: <Video className="size-4" />,
        label: copy.metricPublished,
        value: growth?.metrics.publishedVlogCount ?? 0,
      },
      {
        icon: <Heart className="size-4" />,
        label: copy.metricReactions,
        value: reactionCount,
      },
      {
        icon: <MessageCircleHeart className="size-4" />,
        label: copy.metricFanRequests,
        value: growth?.metrics.fanRequestTotalCount ?? 0,
      },
      {
        icon: <Save className="size-4" />,
        label: copy.metricSaves,
        value: growth?.metrics.saveCount ?? 0,
      },
    ];
    const identityTraits = selectedPersona?.lockedTraits.slice(0, 6) ?? [];

    return (
      <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.04fr)_minmax(21rem,0.96fr)]">
        <article className="rounded-lg border border-[#44f26e]/24 bg-[linear-gradient(135deg,rgba(68,242,110,0.16),rgba(255,255,255,0.045)_42%,rgba(3,5,4,0.78))] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.28)] sm:p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <span className="relative flex size-28 shrink-0 overflow-hidden rounded-lg border border-white/12 bg-black/28">
              {profile.avatarImageUrl ? (
                <Image
                  alt={profile.displayName || copy.displayName}
                  className="object-cover"
                  fill
                  sizes="112px"
                  src={profile.avatarImageUrl}
                />
              ) : (
                <span className="flex size-full items-center justify-center">
                  <UserRound className="size-10 text-[#44f26e]" />
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#44f26e] px-3 py-1 text-xs font-semibold text-black">
                  <Trophy className="size-3.5" />
                  {growth ? `Lv.${growth.level}` : `${setupProgress}/3`}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/[0.065] px-3 py-1 text-xs font-semibold text-white/72">
                  <LockKeyhole className="size-3.5 text-[#44f26e]" />
                  {copy.growthIdentityLocked}
                </span>
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                {copy.growthTitle}
              </p>
              <h2 className="mt-2 text-3xl font-semibold leading-tight text-white [word-break:keep-all]">
                {growth
                  ? growth.title
                  : profile.displayName || copy.growthFallbackTitle}
              </h2>
              <p className="mt-3 text-sm font-medium leading-6 text-white/64 [word-break:keep-all]">
                {growth?.summary ?? copy.growthFallbackBody}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-white/52">
              <span>{xpLabel}</span>
              <span>
                {copy.growthXpToNext}: {nextLevelLabel}
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#44f26e]"
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {metricTiles.map((metric) => (
              <div
                className="rounded-lg border border-white/12 bg-black/20 p-3"
                key={metric.label}
              >
                <div className="flex items-center gap-2 text-[#44f26e]">
                  {metric.icon}
                  <span className="text-xs font-semibold">{metric.label}</span>
                </div>
                <p className="mt-3 text-2xl font-semibold text-white">
                  {numberFormatter.format(metric.value)}
                </p>
              </div>
            ))}
          </div>
        </article>

        <div className="grid gap-4">
          <section className="rounded-lg border border-white/12 bg-white/[0.055] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <BadgeCheck className="mt-0.5 size-5 shrink-0 text-[#44f26e]" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                  {copy.growthIdentityLocked}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  {selectedPersona?.name ?? (profile.displayName || copy.persona)}
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-white/58">
                  {selectedPersona?.summary ?? copy.growthIdentityBody}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {identityTraits.length > 0
                ? identityTraits.map((trait) => (
                    <span
                      className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/72"
                      key={trait}
                    >
                      {trait}
                    </span>
                  ))
                : [copy.displayName, copy.persona, copy.avatar].map((trait) => (
                    <span
                      className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/50"
                      key={trait}
                    >
                      {trait}
                    </span>
                  ))}
            </div>
          </section>

          <section className="rounded-lg border border-white/12 bg-white/[0.055] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                  {copy.growthNext}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  {nextMission?.title ?? copy.growthCompleted}
                </h2>
              </div>
              {nextMission ? (
                <Link
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[#44f26e] px-4 text-xs font-semibold !text-black transition hover:bg-[#67ff88]"
                  href={getGrowthActionHref(nextMission.action)}
                >
                  {copy.growthActionCta}
                </Link>
              ) : null}
            </div>
            <p className="mt-3 text-sm font-medium leading-6 text-white/58">
              {nextMission?.description ?? copy.growthIdentityBody}
            </p>
          </section>
        </div>

        <section className="rounded-lg border border-white/12 bg-white/[0.04] p-4 sm:p-5 lg:col-span-2">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="size-5 text-[#44f26e]" />
                <h2 className="text-xl font-semibold text-white">
                  {copy.growthMissions}
                </h2>
              </div>
              <div className="mt-4 grid gap-3">
                {(growth?.missions ?? []).slice(0, 5).map((mission) => {
                  const percent = Math.round(
                    (mission.progress / Math.max(1, mission.target)) * 100,
                  );

                  return (
                    <article
                      className="rounded-lg border border-white/12 bg-black/20 p-3"
                      key={mission.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-white">
                            {mission.title}
                          </h3>
                          <p className="mt-1 text-xs font-medium leading-5 text-white/50">
                            {mission.description}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold ${
                            mission.completed
                              ? "bg-[#44f26e] text-black"
                              : "bg-white/10 text-white/62"
                          }`}
                        >
                          {mission.completed
                            ? copy.growthCompleted
                            : `${numberFormatter.format(mission.progress)}/${numberFormatter.format(mission.target)}`}
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-[#44f26e]"
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                    </article>
                  );
                })}
                {characterGrowth.status === "loading" ? (
                  <div className="rounded-lg border border-white/12 bg-black/20 p-4 text-sm font-medium text-white/58">
                    <Loader2 className="mb-2 size-4 animate-spin text-[#44f26e]" />
                    {copy.growthLoading}
                  </div>
                ) : null}
                {characterGrowth.error ? (
                  <div className="rounded-lg border border-red-300/20 bg-red-500/12 p-4 text-sm font-medium leading-6 text-red-100">
                    {characterGrowth.error}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="size-5 text-[#44f26e]" />
                  <h2 className="text-xl font-semibold text-white">
                    {copy.growthAvatarCollection}
                  </h2>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {avatarUnlocks.length > 0 ? (
                    avatarUnlocks.map((unlock) => (
                      <div
                        className={`rounded-lg border p-3 ${
                          unlock.unlocked
                            ? "border-[#44f26e]/40 bg-[#44f26e]/10"
                            : "border-white/12 bg-black/20"
                        }`}
                        key={unlock.id}
                      >
                        <p className="text-sm font-semibold text-white">
                          {unlock.label}
                        </p>
                        <p className="mt-1 text-xs font-medium leading-5 text-white/50">
                          {unlock.description}
                        </p>
                        {unlock.unlocked ? (
                          <span className="mt-3 inline-flex rounded-full bg-[#44f26e] px-2.5 py-1 text-[0.68rem] font-semibold text-black">
                            {copy.growthUnlocked}
                          </span>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-white/12 bg-black/20 p-3 text-sm font-medium leading-6 text-white/50 sm:col-span-2">
                      {copy.growthLoading}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-[#44f26e]" />
                  <h2 className="text-xl font-semibold text-white">
                    {copy.growthContentSkills}
                  </h2>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {contentSkills.length > 0 ? (
                    contentSkills.map((skill) => (
                      <div
                        className={`rounded-lg border p-3 ${
                          skill.unlocked
                            ? "border-[#44f26e]/40 bg-[#44f26e]/10"
                            : "border-white/12 bg-black/20"
                        }`}
                        key={skill.id}
                      >
                        <p className="text-sm font-semibold text-white">
                          {skill.label}
                        </p>
                        <p className="mt-1 text-xs font-medium leading-5 text-white/50">
                          {skill.description}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-white/12 bg-black/20 p-3 text-sm font-medium leading-6 text-white/50 sm:col-span-2">
                      {copy.growthLoading}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>
    );
  }

  function renderCharacterReadyPanel() {
    const identityTraits = selectedPersona?.lockedTraits.slice(0, 8) ?? [];

    return (
      <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.96fr)_minmax(19rem,0.64fr)]">
        <article className="rounded-lg border border-[#44f26e]/24 bg-white/[0.055] p-4 sm:p-5">
          <div className="flex flex-col gap-5 sm:flex-row">
            <span className="relative flex aspect-square w-full shrink-0 overflow-hidden rounded-lg border border-white/12 bg-black/28 sm:w-40">
              {profile.avatarImageUrl ? (
                <Image
                  alt={profile.displayName || copy.displayName}
                  className="object-cover"
                  fill
                  sizes="(max-width: 640px) 90vw, 160px"
                  src={profile.avatarImageUrl}
                />
              ) : (
                <span className="flex size-full items-center justify-center">
                  <UserRound className="size-12 text-[#44f26e]" />
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                {copy.characterReview}
              </p>
              <h2 className="mt-3 text-2xl font-semibold leading-tight text-white [word-break:keep-all]">
                {selectedPersona?.name ?? profile.displayName}
              </h2>
              <p className="mt-3 text-sm font-medium leading-6 text-white/62 [word-break:keep-all]">
                {selectedPersona?.summary ?? copy.growthIdentityBody}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {identityTraits.length > 0
                  ? identityTraits.map((trait) => (
                      <span
                        className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/72"
                        key={trait}
                      >
                        {trait}
                      </span>
                    ))
                  : [copy.displayName, copy.persona, copy.avatar].map((trait) => (
                      <span
                        className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/54"
                        key={trait}
                      >
                        {trait}
                      </span>
                    ))}
              </div>
            </div>
          </div>
        </article>

        <aside className="rounded-lg border border-white/12 bg-[linear-gradient(180deg,rgba(68,242,110,0.11),rgba(255,255,255,0.045))] p-4 sm:p-5">
          <BadgeCheck className="size-7 text-[#44f26e]" />
          <h2 className="mt-4 text-2xl font-semibold leading-tight text-white [word-break:keep-all]">
            {copy.characterLockedTitle}
          </h2>
          <p className="mt-3 text-sm font-medium leading-6 text-white/62 [word-break:keep-all]">
            {copy.characterLockedBody}
          </p>
          <Link
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#44f26e]/50 bg-[#44f26e] px-5 text-sm font-semibold !text-black transition hover:bg-[#67ff88]"
            href={changeCharacterHref}
          >
            {copy.characterChange}
            <ArrowRight className="size-4" />
          </Link>
        </aside>
      </section>
    );
  }

  function renderQuickCharacterPanel() {
    const isCreatingCharacter = quickCharacter.status === "loading";
    const styleOptions = [
      ["friendly", copy.quickStyleFriendly],
      ["chic", copy.quickStyleChic],
      ["daily", copy.quickStyleDaily],
      ["fan_service", copy.quickStyleFanService],
    ] as const;
    const genderOptions = [
      ["auto", copy.genderAuto],
      ["female", copy.genderFemale],
      ["male", copy.genderMale],
    ] as const;
    const ageOptions = [
      ["auto", copy.quickAgeAuto],
      ...copy.ageOptions,
    ] as const;

    return (
      <section className="mt-4 rounded-lg border border-[#44f26e]/24 bg-[#44f26e]/10 p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#44f26e] text-black">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
              {copy.quickTitle}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              {copy.quickPanelTitle}
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-white/62">
              {copy.quickBody}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
              {copy.displayName}
            </p>
            <input
              className="mt-2 h-12 w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#44f26e] focus:bg-white/[0.08]"
              disabled={isCreatingCharacter}
              onChange={(event) => {
                setProfile((current) => ({
                  ...current,
                  displayName: event.target.value,
                }));
                setQuickCharacter((current) => ({
                  ...current,
                  error: null,
                  status: "idle",
                }));
              }}
              placeholder={copy.displayNamePlaceholder}
              value={profile.displayName}
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
              {copy.quickStyle}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {styleOptions.map(([value, label]) => {
                const selected = quickCharacter.style === value;

                return (
                  <button
                    aria-pressed={selected}
                    className={`min-h-11 rounded-full border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      selected
                        ? "border-[#44f26e] bg-[#44f26e] text-black"
                        : "border-white/12 bg-white/[0.055] text-white hover:bg-white/[0.08]"
                    }`}
                    disabled={isCreatingCharacter}
                    key={value}
                    onClick={() => {
                      setQuickCharacter((current) => ({
                        ...current,
                        error: null,
                        status: "idle",
                        style: value,
                      }));
                    }}
                    type="button"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-white/12 bg-black/18 p-3">
          <button
            className="flex h-10 w-full items-center justify-between gap-3 rounded-full px-1 text-sm font-semibold text-white"
            disabled={isCreatingCharacter}
            onClick={() => {
              setQuickCharacter((current) => ({
                ...current,
                advancedOpen: !current.advancedOpen,
              }));
            }}
            type="button"
          >
            <span>{copy.quickAdvanced}</span>
            <ArrowRight
              className={`size-4 transition ${
                quickCharacter.advancedOpen ? "rotate-90" : ""
              }`}
            />
          </button>
          {quickCharacter.advancedOpen ? (
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                  {copy.quickGender}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {genderOptions.map(([value, label]) => {
                    const selected = quickCharacter.gender === value;

                    return (
                      <button
                        aria-pressed={selected}
                        className={`h-10 rounded-full border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          selected
                            ? "border-[#44f26e] bg-[#44f26e] text-black"
                            : "border-white/12 bg-white/[0.055] text-white"
                        }`}
                        disabled={isCreatingCharacter}
                        key={value}
                        onClick={() => {
                          setQuickCharacter((current) => ({
                            ...current,
                            error: null,
                            gender: value,
                            status: "idle",
                          }));
                        }}
                        type="button"
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                  {copy.quickAge}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {ageOptions.map(([value, label]) => {
                    const selected = quickCharacter.ageRange === value;

                    return (
                      <button
                        aria-pressed={selected}
                        className={`h-10 rounded-full border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          selected
                            ? "border-[#44f26e] bg-[#44f26e] text-black"
                            : "border-white/12 bg-white/[0.055] text-white"
                        }`}
                        disabled={isCreatingCharacter}
                        key={value}
                        onClick={() => {
                          setQuickCharacter((current) => ({
                            ...current,
                            ageRange: value,
                            error: null,
                            status: "idle",
                          }));
                        }}
                        type="button"
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                  {copy.appearance}
                </p>
                <div className="mt-2 flex snap-x gap-2 overflow-x-auto pb-1">
                  {copy.appearanceOptions.map(([value, label]) => {
                    const selected = quickCharacter.appearanceTone === value;

                    return (
                      <button
                        aria-pressed={selected}
                        className={`h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          selected
                            ? "border-[#44f26e] bg-[#44f26e] text-black"
                            : "border-white/12 bg-white/[0.055] text-white"
                        }`}
                        disabled={isCreatingCharacter}
                        key={value}
                        onClick={() => {
                          setQuickCharacter((current) => ({
                            ...current,
                            appearanceTone: value,
                            error: null,
                            status: "idle",
                          }));
                        }}
                        type="button"
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {quickCharacter.status === "loading" ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[copy.persona, copy.avatar, copy.save].map((label) => (
              <div
                className="rounded-lg border border-white/12 bg-black/18 p-3 text-sm font-semibold text-white/62"
                key={label}
              >
                <Loader2 className="mb-2 size-4 animate-spin text-[#44f26e]" />
                {label}
              </div>
            ))}
          </div>
        ) : null}

        {quickCharacter.error ? (
          <p className="mt-3 rounded-lg border border-red-300/20 bg-red-500/12 p-3 text-sm leading-6 text-red-100">
            {quickCharacter.error}
          </p>
        ) : null}

        <button
          aria-busy={isCreatingCharacter}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold text-black transition hover:bg-[#67ff88] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          disabled={isCreatingCharacter || isSaving || !accountAddress}
          onClick={() => {
            void createQuickCharacter();
          }}
          type="button"
        >
          {isCreatingCharacter ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {isCreatingCharacter ? copy.quickCreating : copy.quickButton}
        </button>
      </section>
    );
  }

  if (connection.isResolving) {
    return (
      <StatusPanel
        body={copy.loading}
        cta={copy.refresh}
        href={currentProfileHref}
        title={copy.loading}
      />
    );
  }

  if (connection.isDisconnected) {
    return (
      <StatusPanel
        body={copy.connectRequired}
        cta={copy.connectRequiredCta}
        eyebrow={copy.profileStep}
        href={connectHref}
        secondaryCta={copy.back}
        secondaryHref={returnToHref || onboardingHref}
        title={copy.disconnected}
      />
    );
  }

  if (member?.status === "pending_payment") {
    return (
      <StatusPanel
        body={copy.paymentRequired}
        cta={copy.paymentRequiredCta}
        eyebrow={copy.profileStep}
        href={activateHref}
        secondaryCta={copy.back}
        secondaryHref={returnToHref || onboardingHref}
        title={copy.paymentRequired}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#030504] text-white">
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
            <div className="flex items-center gap-2">
              <FanletterAccountStatusLink
                locale={locale}
                referralCode={referralCode}
              />
              <Link
                className="hidden h-11 items-center justify-center rounded-full border border-white/16 px-4 text-sm font-semibold !text-white transition hover:border-white/36 lg:inline-flex"
                href={studioHref}
              >
                {copy.studio}
              </Link>
            </div>
          </header>

          <div className="grid gap-8 pb-10 pt-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(22rem,0.78fr)] lg:items-end lg:pb-14 lg:pt-20">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#44f26e]">
                {copy.eyebrow}
              </p>
              <h1 className="mt-4 text-[2.65rem] font-semibold leading-[0.98] tracking-normal [word-break:keep-all] sm:text-[5rem]">
                {characterReady ? copy.readyTitle : copy.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/68 [word-break:keep-all] sm:text-lg">
                {characterReady ? copy.readyBody : copy.setupBody}
              </p>
            </div>

            <aside className="rounded-lg border border-white/12 bg-white/[0.055] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.32)] backdrop-blur-md sm:p-5">
              <div className="flex items-start gap-4">
                <span className="relative flex size-20 shrink-0 overflow-hidden rounded-full border border-white/12 bg-white/[0.06]">
                  {profile.avatarImageUrl ? (
                    <Image
                      alt={profile.displayName || copy.displayName}
                      className="object-cover"
                      fill
                      sizes="80px"
                      src={profile.avatarImageUrl}
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center">
                      <UserRound className="size-8 text-[#44f26e]" />
                    </span>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                    {profileConfigured && setupProgress >= 3
                      ? copy.completed
                      : `${setupProgress}/3`}
                  </p>
                  <h2 className="mt-2 truncate text-2xl font-semibold">
                    {profile.displayName || copy.displayNamePlaceholder}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-white/56">
                    {profile.characterPersona?.summary ?? copy.personaBody}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[copy.displayName, copy.persona, copy.avatar].map((label, index) => {
                  const done =
                    index === 0
                      ? Boolean(profile.displayName.trim())
                      : index === 1
                        ? Boolean(profile.characterPersona)
                        : Boolean(profile.avatarImageUrl);

                  return (
                    <div
                      className={`rounded-lg border p-3 ${
                        done
                          ? "border-[#44f26e] bg-[#44f26e] text-black"
                          : "border-white/12 bg-white/[0.055] text-white"
                      }`}
                      key={label}
                    >
                      <CheckCircle2 className="size-4" />
                      <p className="mt-2 truncate text-[0.62rem] font-semibold">
                        {label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>

          {loadStatus === "loading" ? (
            <div className="rounded-lg border border-white/12 bg-white/[0.055] p-5">
              <Loader2 className="size-6 animate-spin text-[#44f26e]" />
              <p className="mt-3 text-sm font-medium text-white/62">
                {copy.loading}
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-lg border border-red-300/20 bg-red-500/12 p-4 text-sm font-medium leading-6 text-red-100">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="mb-4 rounded-lg border border-[#44f26e]/22 bg-[#44f26e]/10 p-4 text-sm font-medium leading-6 text-[#c9ffd5]">
              {notice}
            </div>
          ) : null}

          {renderCharacterContentHome()}

          {renderCharacterGrowthCenter()}

          {characterReady ? (
            renderCharacterReadyPanel()
          ) : (
            <>
              {renderQuickCharacterPanel()}

	          <details className="mt-4 rounded-lg border border-white/12 bg-white/[0.035] p-3 sm:p-4">
	            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-white">
              <span>{copy.manualSetupTitle}</span>
              <span className="hidden text-xs font-medium text-white/44 sm:block">
	                {copy.manualSetupBody}
	              </span>
	            </summary>
	            <div className="mt-4 grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
            <section className="rounded-lg border border-white/12 bg-white/[0.055] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                01
              </p>
              <h2 className="mt-3 text-2xl font-semibold">{copy.displayName}</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-white/56">
                {copy.displayNameHint}
              </p>
              <input
                className="mt-5 h-12 w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#44f26e] focus:bg-white/[0.08]"
                onChange={(event) => {
                  setProfile((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }));
                }}
                placeholder={copy.displayNamePlaceholder}
                value={profile.displayName}
              />
              <button
                className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold text-black transition hover:bg-[#67ff88] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                onClick={() => {
                  void saveProfile();
                }}
                type="button"
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {isSaving ? copy.saving : copy.save}
              </button>
	            </section>

            <section className="rounded-lg border border-white/12 bg-white/[0.055] p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                    02
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold">{copy.persona}</h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/56">
                    {copy.personaBody}
                  </p>
                </div>
                {selectedPersona ? (
                  <span className="rounded-full bg-[#44f26e] px-3 py-1 text-xs font-semibold text-black">
                    {copy.personaSaved}
                  </span>
                ) : null}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                    {copy.gender}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[
                      ["female", copy.genderFemale],
                      ["male", copy.genderMale],
                    ].map(([value, label]) => (
                      <button
                        className={`h-11 rounded-full border px-3 text-sm font-semibold transition ${
                          personaGeneration.gender === value
                            ? "border-[#44f26e] bg-[#44f26e] text-black"
                            : "border-white/12 bg-white/[0.055] text-white"
                        }`}
                        key={value}
                        onClick={() => {
                          setPersonaGeneration((current) => ({
                            ...current,
                            gender: value as PersonaGenerationState["gender"],
                          }));
                        }}
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                    {copy.age}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {copy.ageOptions.map(([value, label]) => (
                      <button
                        className={`h-11 rounded-full border px-3 text-sm font-semibold transition ${
                          personaGeneration.ageRange === value
                            ? "border-[#44f26e] bg-[#44f26e] text-black"
                            : "border-white/12 bg-white/[0.055] text-white"
                        }`}
                        key={value}
                        onClick={() => {
                          setPersonaGeneration((current) => ({
                            ...current,
                            ageRange:
                              value as PersonaGenerationState["ageRange"],
                          }));
                        }}
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                  {copy.appearance}
                </p>
                <div className="mt-2 flex snap-x gap-2 overflow-x-auto pb-1">
                  {copy.appearanceOptions.map(([value, label]) => (
                    <button
                      className={`h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition ${
                        personaGeneration.appearanceTone === value
                          ? "border-[#44f26e] bg-[#44f26e] text-black"
                          : "border-white/12 bg-white/[0.055] text-white"
                      }`}
                      key={value}
                      onClick={() => {
                        setPersonaGeneration((current) => ({
                          ...current,
                          appearanceTone:
                            value as PersonaGenerationState["appearanceTone"],
                        }));
                      }}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs font-medium leading-5 text-white/42">
                  {copy.appearanceHint}
                </p>
              </div>

              <button
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold text-black transition hover:bg-[#67ff88] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={personaGeneration.status === "loading"}
                onClick={() => {
                  void generatePersonas();
                }}
                type="button"
              >
                {personaGeneration.status === "loading" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {personaGeneration.status === "loading"
                  ? copy.generatingPersona
                  : copy.generatePersona}
              </button>

              {personaGeneration.error ? (
                <p className="mt-3 rounded-lg border border-red-300/20 bg-red-500/12 p-3 text-sm leading-6 text-red-100">
                  {personaGeneration.error}
                </p>
              ) : null}

              {selectedPersona ? (
                <article className="mt-4 rounded-lg border border-[#44f26e]/24 bg-[#44f26e]/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#44f26e]">
                    {copy.selectedPersona}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white">
                    {selectedPersona.name}
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/62">
                    {selectedPersona.summary}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedPersona.lockedTraits.slice(0, 6).map((trait) => (
                      <span
                        className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70"
                        key={trait}
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </article>
              ) : null}

              {personaGeneration.candidates.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {personaGeneration.candidates.map((candidate) => {
                    const selected = selectedPersona?.id === candidate.id;

                    return (
                      <article
                        className="rounded-lg border border-white/12 bg-black/24 p-4"
                        key={candidate.id}
                      >
                        <h3 className="text-lg font-semibold text-white">
                          {candidate.name}
                        </h3>
                        <p className="mt-2 text-sm font-medium leading-6 text-white/58">
                          {candidate.summary}
                        </p>
                        <button
                          className={`mt-4 inline-flex h-11 w-full items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
                            selected
                              ? "bg-white/10 text-white"
                              : "bg-[#44f26e] text-black hover:bg-[#67ff88]"
                          }`}
                          onClick={() => {
                            void savePersona(candidate);
                          }}
                          type="button"
                        >
                          {selected ? copy.personaSaved : copy.personaSave}
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : null}
	          </section>
          </div>

          <section className="mt-4 rounded-lg border border-white/12 bg-white/[0.055] p-4 sm:p-5">
            <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                  03
                </p>
                <h2 className="mt-3 text-2xl font-semibold">{copy.avatar}</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-white/56">
                  {copy.avatarBody}
                </p>
                <button
                  className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold text-black transition hover:bg-[#67ff88] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={avatarGeneration.status === "loading"}
                  onClick={() => {
                    void generateAvatars();
                  }}
                  type="button"
                >
                  {avatarGeneration.status === "loading" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {avatarGeneration.status === "loading"
                    ? copy.avatarGenerating
                    : copy.avatarGenerate}
                </button>
                {avatarGeneration.error ? (
                  <p className="mt-3 rounded-lg border border-red-300/20 bg-red-500/12 p-3 text-sm leading-6 text-red-100">
                    {avatarGeneration.error}
                  </p>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {avatarCandidates.length > 0 ? (
                  avatarCandidates.map((candidate) => {
                    const selected = profile.avatarImageUrl === candidate.url;

                    return (
                      <article
                        className={`overflow-hidden rounded-lg border ${
                          selected ? "border-[#44f26e]" : "border-white/12"
                        } bg-black/24`}
                        key={candidate.url}
                      >
                        <div className="relative aspect-square">
                          <Image
                            alt={candidate.label ?? copy.avatar}
                            className="object-cover"
                            fill
                            sizes="(max-width: 640px) 45vw, 180px"
                            src={candidate.url}
                          />
                        </div>
                        <button
                          className={`h-11 w-full px-3 text-sm font-semibold ${
                            selected
                              ? "bg-[#44f26e] text-black"
                              : "bg-white/[0.07] text-white"
                          }`}
                          onClick={() => {
                            void saveAvatar(candidate);
                          }}
                          type="button"
                        >
                          {selected ? copy.avatarSelected : copy.avatarSelect}
                        </button>
                      </article>
                    );
                  })
                ) : (
                  <div className="col-span-full rounded-lg border border-dashed border-white/14 p-6 text-sm font-medium leading-6 text-white/44">
                    {copy.avatarRequired}
                  </div>
                )}
              </div>
            </div>
	          </section>
	          </details>
            </>
          )}

          <div className="sticky bottom-[calc(5.1rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-6 border-t border-white/10 bg-[#030504]/92 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <Link
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold !text-black transition hover:bg-white/90 sm:w-fit"
                href={createHref}
              >
                {contentCtaLabel}
                <ArrowRight className="size-4" />
              </Link>
              {cameFromOnboarding ? (
                <Link
                  className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/16 px-5 text-sm font-semibold !text-white transition hover:bg-white/10 sm:w-fit"
                  href={returnToHref || onboardingHref}
                >
                  {copy.back}
                </Link>
              ) : null}
              <Link
                className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/16 px-5 text-sm font-semibold !text-white transition hover:bg-white/10 sm:w-fit"
                href={studioHref}
              >
                {copy.studio}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
