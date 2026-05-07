"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Loader2,
  MessageCircleHeart,
  Save,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { useMemberSession } from "@/components/member-session-provider";
import type {
  CreatorCharacterPersona,
  CreatorCharacterPersonaGenerateResponse,
  CreatorProfileAvatarCandidate,
  CreatorProfileAvatarGenerateResponse,
  CreatorProfileRecord,
  CreatorProfileResponse,
} from "@/lib/content";
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
        connectRequired:
          "프로필을 설정하려면 FanLetter 계정 연결을 먼저 완료해야 합니다.",
        connectRequiredCta: "계정 연결하기",
        completed: "준비 완료",
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
        quickTitle: "빠른 캐릭터 만들기",
        refresh: "다시 불러오기",
        save: "프로필 저장",
        saving: "저장 중...",
        selectedPersona: "선택된 페르소나",
        setupBody:
          "표시 이름과 분위기만 정하면 캐릭터 설정을 자동으로 끝내고 첫 숏폼 브이로그 생성으로 바로 이어집니다.",
        studio: "브이로그 스튜디오",
        title: "AI 캐릭터 브이로그 프로필을 빠르게 준비하세요.",
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
        connectRequired:
          "Connect your FanLetter account before setting up a profile.",
        connectRequiredCta: "Connect account",
        completed: "Ready",
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
        quickTitle: "Quick character setup",
        refresh: "Reload",
        save: "Save profile",
        saving: "Saving...",
        selectedPersona: "Selected persona",
        setupBody:
          "Choose a display name and mood to finish character setup automatically, then continue to the first short-form vlog.",
        studio: "Vlog studio",
        title: "Prepare your AI character vlogger profile quickly.",
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
  href,
  title,
}: {
  body: string;
  cta: string;
  href: string;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-[#030504] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center">
        <section className="w-full rounded-lg border border-white/12 bg-white/[0.055] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.32)]">
          <CircleAlert className="size-8 text-[#44f26e]" />
          <h1 className="mt-5 text-3xl font-semibold leading-tight">{title}</h1>
          <p className="mt-3 text-sm font-medium leading-6 text-white/58">
            {body}
          </p>
          <Link
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold !text-black transition hover:bg-[#67ff88]"
            href={href}
          >
            {cta}
            <ArrowRight className="size-4" />
          </Link>
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
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode),
    { returnTo: returnToHref || onboardingHref },
  );
  const activateHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/activate`, referralCode),
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
  const avatarCandidates =
    avatarGeneration.candidates.length > 0
      ? avatarGeneration.candidates
      : profile.avatarImageSet;

  const resolveEmail = useCallback(async () => {
    const resolved =
      email ?? memberSession.email ?? (await getThirdwebUserEmail({ client: thirdwebClient }));

    if (!resolved) {
      throw new Error(copy.connectRequired);
    }

    setEmail(resolved);
    return resolved;
  }, [copy.connectRequired, email, memberSession.email]);

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
      setError(copy.missingDisplayName);
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
      <section className="rounded-lg border border-[#44f26e]/24 bg-[#44f26e]/10 p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#44f26e] text-black">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
              {copy.quickTitle}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">
              {copy.title}
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
        href={setPathSearchParams(
          buildPathWithReferral(`/${locale}/fanletter/profile`, referralCode),
          { returnTo: returnToHref || onboardingHref },
        )}
        title={copy.loading}
      />
    );
  }

  if (connection.isDisconnected) {
    return (
      <StatusPanel
        body={copy.connectRequired}
        cta={copy.connectRequiredCta}
        href={connectHref}
        title={copy.disconnected}
      />
    );
  }

  if (member?.status === "pending_payment") {
    return (
      <StatusPanel
        body={copy.paymentRequired}
        cta={copy.paymentRequiredCta}
        href={activateHref}
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
            <Link
              className="hidden h-11 items-center justify-center rounded-full border border-white/16 px-4 text-sm font-semibold !text-white transition hover:border-white/36 sm:inline-flex"
              href={studioHref}
            >
              {copy.studio}
            </Link>
            <span className="size-11 sm:hidden" />
          </header>

          <div className="grid gap-8 pb-10 pt-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(22rem,0.78fr)] lg:items-end lg:pb-14 lg:pt-20">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#44f26e]">
                {copy.eyebrow}
              </p>
              <h1 className="mt-4 text-[2.65rem] font-semibold leading-[0.98] tracking-normal [word-break:keep-all] sm:text-[5rem]">
                {copy.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/68 [word-break:keep-all] sm:text-lg">
                {copy.setupBody}
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

          <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-white/10 bg-[#030504]/92 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <Link
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold !text-black transition hover:bg-white/90 sm:w-fit"
                href={createHref}
              >
                {copy.contentCta}
                <ArrowRight className="size-4" />
              </Link>
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
