"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clapperboard,
  Loader2,
  MessageCircleHeart,
  Play,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { FanletterAccountStatusLink } from "@/components/fanletter-account-status-link";
import { FanletterGlobalLanguageSwitcher } from "@/components/fanletter-global-language-switcher";
import { useMemberSession } from "@/components/member-session-provider";
import {
  CONTENT_PAID_USDT_AMOUNT,
  type ContentPostMutationResponse,
  type ContentPostRecord,
  type ContentPriceType,
  type CreatorProfileRecord,
  type CreatorProfileResponse,
  type FanletterFanRequestStatusUpdateResponse,
  type FanletterFanRequestType,
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

type CreateMode = "video";
type FanRequestSyncStatus = "failed" | "idle" | "reviewed" | "syncing" | "used";
type GenerationStatus = "error" | "idle" | "loading" | "ready";
type RestorableGenerationStatus = Exclude<GenerationStatus, "loading">;
type LocalDraftStatus = "cleared" | "idle" | "restored" | "saved";

type GeneratedMedia = {
  contentType: string;
  revisedPrompt: string | null;
  url: string;
};

type CreateForm = {
  body: string;
  mode: CreateMode;
  priceType: ContentPriceType;
  prompt: string;
  summary: string;
  title: string;
};

export type FanletterCreateInitialPlan = Partial<
  Pick<CreateForm, "body" | "mode" | "prompt" | "summary" | "title">
> & {
  fanOnlyIntent?: boolean;
  fanRequestBody?: string;
  fanRequestCharacterName?: string;
  fanRequestId?: string;
  fanRequestType?: FanletterFanRequestType;
  planId?: string;
  priceType?: ContentPriceType;
};

const EMPTY_FORM: CreateForm = {
  body: "",
  mode: "video",
  priceType: "free",
  prompt: "",
  summary: "",
  title: "",
};
const CHARACTER_PLAYBOOK_PLAN_IDS = new Set([
  "avatar-set-direction",
  "character-daily-scene",
  "fan-request-episode",
]);
const FANLETTER_CREATE_DISCONNECTED_GRACE_MS = 4500;
const FANLETTER_CREATE_LOCAL_DRAFT_VERSION = 1;
const FANLETTER_CREATE_LOCAL_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type FanletterCreateLocalDraft = {
  form: CreateForm;
  generatedMedia: GeneratedMedia | null;
  generationMessage: string | null;
  generationStatus: RestorableGenerationStatus;
  savedAt: number;
  version: typeof FANLETTER_CREATE_LOCAL_DRAFT_VERSION;
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        accountRequired: "계정 연결이 필요합니다.",
        accountRequiredBody:
          "첫 AI 캐릭터 브이로그를 만들려면 FanLetter 계정 연결을 먼저 완료해야 합니다.",
        accountRequiredCta: "계정 연결하기",
        back: "프로필로 돌아가기",
        body: "공개 설명",
        bodyHint:
          "생성된 동영상과 함께 피드에 보일 설명입니다. 비워두면 장면 프롬프트를 설명으로 사용합니다.",
        bodyPlaceholder: "팬에게 보여줄 동영상 설명을 입력하세요.",
        contentReady: "오늘의 AI 캐릭터 브이로그 동영상이 준비되었습니다.",
        draft: "임시 저장",
        draftAutosaveCleared: "로컬 자동 저장본을 정리했습니다.",
        draftAutosaveHint:
          "입력값과 생성된 영상 링크를 이 기기에 자동 저장해 새로고침 후에도 이어갈 수 있습니다.",
        draftAutosaveRestored: "이전에 작성하던 브이로그를 복구했습니다.",
        draftAutosaveSaved: "자동 저장됨",
        draftSaved: "임시 저장했습니다.",
        emptyPrompt: "동영상으로 만들 브이로그 장면을 입력하세요.",
        errorFallback: "첫 AI 캐릭터 브이로그를 처리하지 못했습니다.",
        eyebrow: "FanLetter AI 캐릭터 브이로그",
        fanRequestContext: {
          autoClose: "공개하면 팬 요청함에서 제작 반영으로 자동 정리됩니다.",
          autoFill: "제목, 요약, 장면 프롬프트에 요청 내용이 반영되었습니다.",
          body: "팬이 남긴 내용을 보면서 장면만 다듬으면 됩니다.",
          draftSynced: "임시 저장 상태로 팬 요청을 확인함 처리했습니다.",
          eyebrow: "Fan Request",
          failed:
            "브이로그는 저장됐지만 팬 요청 상태를 갱신하지 못했습니다. 스튜디오 요청함에서 다시 처리하세요.",
          fanOnlyDefault:
            "팬 전용 요청으로 감지되어 공개 방식이 1 USDT 유료로 기본 설정되었습니다.",
          fanOnlyHint:
            "이 브이로그는 캐릭터 채널의 팬 전용 영역에 쌓이고, 상세 페이지에서 결제 후 열람됩니다.",
          publishStep: "공개하면 요청 카드가 완성된 브이로그와 연결됩니다.",
          requestTypes: {
            message: "응원 메시지",
            vlog_request: "브이로그 요청",
          },
          synced: "팬 요청함에서 제작 반영으로 정리되었습니다.",
          syncing: "팬 요청함을 정리하고 있습니다.",
          title: "팬 요청으로 브이로그를 만들고 있습니다.",
        },
        planContext: {
          applied: "제목, 요약, 장면 프롬프트에 추천 기획이 반영되었습니다.",
          body:
            "프로필의 캐릭터 정체성, 성장 신호, 팬 반응 흐름을 바탕으로 만든 브이로그 동영상 기획입니다. 필요하면 문장만 다듬고 바로 생성하세요.",
          bodyPlanner:
            "스튜디오에서 선택한 기획이 입력값에 반영되었습니다. 장면만 다듬고 바로 브이로그 동영상을 생성할 수 있습니다.",
          eyebrow: "Character Playbook",
          eyebrowPlanner: "Selected Plan",
          generateCta: "브이로그 동영상 생성",
          nextStep: "버튼을 누르면 이미지가 아니라 세로형 동영상 생성이 시작됩니다.",
          nextStepLabel: "다음 동작",
          outputLabel: "생성 결과",
          outputValue: "세로형 AI 브이로그 동영상",
          promptLabel: "추천 장면",
          summaryLabel: "기획 포인트",
          title: "프로필 추천 기획으로 시작합니다.",
          titleLabel: "추천 제목",
          titlePlanner: "선택한 기획으로 시작합니다.",
        },
        feed: "FanLetter 브이로그 피드 보기",
        free: "무료 공개",
        generate: "AI 브이로그 동영상 생성",
        generated: "생성 완료",
        generatingVideo: "AI 동영상 생성 중...",
        loading: "브이로그 준비 상태를 확인하고 있습니다.",
        missingMedia: "공개하려면 먼저 브이로그 동영상을 생성하세요.",
        paid: `${CONTENT_PAID_USDT_AMOUNT} USDT 유료`,
        paymentRequired: "가입 완료 회원만 첫 AI 캐릭터 브이로그를 만들 수 있습니다.",
        paymentRequiredCta: "가입 완료 확인하기",
        personaEmpty: "프로필에서 캐릭터를 한 번 만들면 같은 인물 유지가 강해집니다.",
        price: "공개 방식",
        profileRequired: "프로필 준비가 필요합니다.",
        profileRequiredBody:
          "표시 이름, 페르소나, 대표 아바타까지 준비하면 첫 브이로그에 자동 적용됩니다.",
        profileRequiredCta: "캐릭터 만들기",
        prompt: "브이로그 동영상 장면",
        promptPlaceholder:
          "장소, 움직임, 행동, 대사, 카메라 느낌, 숏폼 분위기를 자연스럽게 입력하세요.",
        publish: "브이로그 동영상 공개",
        published: "공개했습니다.",
        result: "AI 동영상 미리보기",
        setupChecks: {
          character: "캐릭터 적용",
          title: "제목 입력",
          video: "동영상 생성",
        },
        summary: "동영상 요약",
        summaryPlaceholder: "짧은 소개 문구",
        studio: "브이로그 스튜디오",
        title: "제목",
        titlePlaceholder: "오늘의 브이로그 제목",
        titleText: "오늘의 AI 캐릭터 브이로그를 바로 만드세요.",
        video: "생성 결과: 숏폼 브이로그 동영상",
        videoBody:
          "이미지가 아니라 세로형 AI 브이로그 동영상을 생성해 모바일 캐릭터 피드에 바로 연결합니다.",
        viewContent: "브이로그 보기",
      }
    : {
        accountRequired: "Account connection required.",
        accountRequiredBody:
          "Connect your FanLetter account before creating the first AI character vlog.",
        accountRequiredCta: "Connect account",
        back: "Back to profile",
        body: "Public description",
        bodyHint:
          "This appears with the generated video in the feed. When empty, the scene prompt is used as the description.",
        bodyPlaceholder: "Write the video description for fans.",
        contentReady: "Today's AI character vlog video is ready.",
        draft: "Save draft",
        draftAutosaveCleared: "Local autosave was cleared.",
        draftAutosaveHint:
          "Inputs and the generated video link are saved on this device so you can continue after refreshing.",
        draftAutosaveRestored: "Restored the vlog you were editing.",
        draftAutosaveSaved: "Autosaved",
        draftSaved: "Draft saved.",
        emptyPrompt: "Enter the vlog scene to turn into a video.",
        errorFallback: "Failed to process first AI character vlog.",
        eyebrow: "FanLetter AI Character Vlog",
        fanRequestContext: {
          autoClose:
            "Publishing will automatically mark the fan request as used.",
          autoFill:
            "The title, summary, and scene prompt already include the request.",
          body: "Keep the fan note visible while you refine the scene.",
          draftSynced: "The fan request was marked as reviewed for this draft.",
          eyebrow: "Fan Request",
          failed:
            "The vlog was saved, but the fan request status could not be updated. Retry from the studio inbox.",
          fanOnlyDefault:
            "Fan-only intent was detected, so visibility defaults to 1 USDT paid.",
          fanOnlyHint:
            "This vlog will live in the character channel's fan-only area and unlock from the detail page after payment.",
          publishStep: "Publishing links the request card to the finished vlog.",
          requestTypes: {
            message: "Support message",
            vlog_request: "Vlog request",
          },
          synced: "The fan request was moved to produced.",
          syncing: "Updating the fan request inbox.",
          title: "Creating a vlog from a fan request.",
        },
        planContext: {
          applied:
            "The recommended title, summary, and scene prompt have been applied.",
          body:
            "This vlog video plan comes from the character identity, growth signals, and fan reaction loop in the profile. Refine the wording if needed, then generate.",
          bodyPlanner:
            "The selected studio plan has been applied to the inputs. Refine the scene and generate the vlog video.",
          eyebrow: "Character Playbook",
          eyebrowPlanner: "Selected Plan",
          generateCta: "Generate vlog video",
          nextStep: "This button starts vertical video generation, not image generation.",
          nextStepLabel: "Next action",
          outputLabel: "Output",
          outputValue: "Vertical AI vlog video",
          promptLabel: "Suggested scene",
          summaryLabel: "Plan angle",
          title: "Starting from a profile recommendation.",
          titleLabel: "Suggested title",
          titlePlanner: "Starting from the selected plan.",
        },
        feed: "View FanLetter vlog feed",
        free: "Free public",
        generate: "Generate AI vlog video",
        generated: "Generated",
        generatingVideo: "Generating AI video...",
        loading: "Checking vlog setup.",
        missingMedia: "Generate a vlog video before publishing.",
        paid: `${CONTENT_PAID_USDT_AMOUNT} USDT paid`,
        paymentRequired: "Only completed members can create the first AI character vlog.",
        paymentRequiredCta: "Verify signup",
        personaEmpty:
          "Create a character once in your profile to keep the same person stronger.",
        price: "Visibility",
        profileRequired: "Profile setup required.",
        profileRequiredBody:
          "Prepare a display name, persona, and representative avatar so the character is applied to the first vlog automatically.",
        profileRequiredCta: "Create character",
        prompt: "Vlog video scene",
        promptPlaceholder:
          "Describe location, motion, action, dialogue, camera feel, and short-form mood.",
        publish: "Publish vlog video",
        published: "Published.",
        result: "AI video preview",
        setupChecks: {
          character: "Character applied",
          title: "Title ready",
          video: "Video generated",
        },
        summary: "Video summary",
        summaryPlaceholder: "Short intro",
        studio: "Vlog studio",
        title: "Title",
        titlePlaceholder: "Today's vlog title",
        titleText: "Create today's AI character vlog inside FanLetter.",
        video: "Output: short-form vlog video",
        videoBody:
          "Generate a vertical AI vlog video, not an image, and connect it directly to the mobile character feed.",
        viewContent: "View vlog",
      };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
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

function getInitialCreateForm(
  initialPlan?: FanletterCreateInitialPlan,
): CreateForm {
  return {
    ...EMPTY_FORM,
    body: initialPlan?.body?.trim() ?? EMPTY_FORM.body,
    mode: "video",
    priceType:
      initialPlan?.priceType ??
      (initialPlan?.fanOnlyIntent ? "paid" : EMPTY_FORM.priceType),
    prompt: initialPlan?.prompt?.trim() ?? EMPTY_FORM.prompt,
    summary: initialPlan?.summary?.trim() ?? EMPTY_FORM.summary,
    title: initialPlan?.title?.trim() ?? EMPTY_FORM.title,
  };
}

function hasMeaningfulCreateDraft(form: CreateForm, media: GeneratedMedia | null) {
  return Boolean(
    media?.url ||
      form.title.trim() ||
      form.summary.trim() ||
      form.prompt.trim() ||
      form.body.trim() ||
      form.priceType !== EMPTY_FORM.priceType,
  );
}

function normalizeGeneratedMedia(value: unknown): GeneratedMedia | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const media = value as Partial<GeneratedMedia>;

  if (
    typeof media.url !== "string" ||
    !media.url.trim() ||
    typeof media.contentType !== "string"
  ) {
    return null;
  }

  return {
    contentType: media.contentType,
    revisedPrompt:
      typeof media.revisedPrompt === "string" ? media.revisedPrompt : null,
    url: media.url,
  };
}

function normalizeCreateDraftForm(value: unknown): CreateForm | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const form = value as Partial<CreateForm>;

  return {
    body: typeof form.body === "string" ? form.body.slice(0, 2_400) : "",
    mode: "video",
    priceType: form.priceType === "paid" ? "paid" : "free",
    prompt: typeof form.prompt === "string" ? form.prompt.slice(0, 4_000) : "",
    summary: typeof form.summary === "string" ? form.summary.slice(0, 600) : "",
    title: typeof form.title === "string" ? form.title.slice(0, 180) : "",
  };
}

function buildCreateDraftKey({
  fanRequestId,
  locale,
  planId,
  referralCode,
}: {
  fanRequestId: string | null;
  locale: Locale;
  planId: string | null;
  referralCode: string | null;
}) {
  return [
    "fanletter:create-draft:v1",
    locale,
    referralCode?.trim() || "direct",
    planId?.trim() || "manual",
    fanRequestId?.trim() || "no-request",
  ].join(":");
}

function readCreateLocalDraft(key: string): FanletterCreateLocalDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<FanletterCreateLocalDraft>;

    if (
      parsed.version !== FANLETTER_CREATE_LOCAL_DRAFT_VERSION ||
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > FANLETTER_CREATE_LOCAL_DRAFT_TTL_MS
    ) {
      window.localStorage.removeItem(key);
      return null;
    }

    const form = normalizeCreateDraftForm(parsed.form);

    if (!form) {
      return null;
    }

    const generatedMedia = normalizeGeneratedMedia(parsed.generatedMedia);
    const generationStatus: RestorableGenerationStatus = generatedMedia
      ? "ready"
      : parsed.generationStatus === "error"
        ? "error"
        : "idle";

    return {
      form,
      generatedMedia,
      generationMessage:
        typeof parsed.generationMessage === "string"
          ? parsed.generationMessage
          : null,
      generationStatus,
      savedAt: parsed.savedAt,
      version: FANLETTER_CREATE_LOCAL_DRAFT_VERSION,
    };
  } catch {
    return null;
  }
}

function writeCreateLocalDraft(
  key: string,
  draft: Omit<FanletterCreateLocalDraft, "savedAt" | "version">,
) {
  if (typeof window === "undefined") {
    return null;
  }

  const savedAt = Date.now();

  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        ...draft,
        savedAt,
        version: FANLETTER_CREATE_LOCAL_DRAFT_VERSION,
      } satisfies FanletterCreateLocalDraft),
    );
    return savedAt;
  } catch {
    return null;
  }
}

function clearCreateLocalDraft(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Local draft recovery is a convenience layer; saving and publishing still work.
  }
}

function formatDraftSavedAt(value: number | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function inferTitle(form: CreateForm, fallback: string) {
  return (
    form.title.trim() ||
    form.prompt
      .split("\n")
      .find((line) => line.trim())
      ?.trim()
      .slice(0, 72) ||
    fallback
  );
}

function inferSummary(form: CreateForm) {
  return (
    form.summary.trim() ||
    form.prompt.trim().replace(/\s+/g, " ").slice(0, 140)
  );
}

function StatusPanel({
  body,
  cta,
  href,
  locale,
  title,
}: {
  body: string;
  cta: string;
  href: string;
  locale: Locale;
  title: string;
}) {
  return (
    <main className="min-h-[calc(100svh-5.1rem)] bg-[#030504] px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] text-white sm:min-h-screen sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100svh-8rem)] max-w-xl items-center sm:min-h-[70vh]">
        <section className="w-full rounded-lg border border-white/12 bg-white/[0.055] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.32)] sm:p-6">
          <div className="mb-5 flex justify-end">
            <FanletterGlobalLanguageSwitcher compact locale={locale} />
          </div>
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

export function FanletterCreatePage({
  initialPlan,
  locale,
  referralCode,
  returnToHref,
}: {
  initialPlan?: FanletterCreateInitialPlan;
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
    disconnectedResolveGraceMs: FANLETTER_CREATE_DISCONNECTED_GRACE_MS,
    resolveGraceMs: FANLETTER_CREATE_DISCONNECTED_GRACE_MS,
    status: connectionStatus,
  });
  const onboardingHref = buildPathWithReferral(
    `/${locale}/fanletter/onboarding`,
    referralCode,
  );
  const profileHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/profile`, referralCode),
    { returnTo: returnToHref || onboardingHref },
  );
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode),
    { returnTo: returnToHref || onboardingHref },
  );
  const activateHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/activate`, referralCode),
    { returnTo: returnToHref || onboardingHref },
  );
  const feedHref = buildPathWithReferral(
    `/${locale}/fanletter/feed`,
    referralCode,
  );
  const studioHref = buildPathWithReferral(
    `/${locale}/fanletter/studio`,
    referralCode,
  );
  const [createdContent, setCreatedContent] =
    useState<ContentPostRecord | null>(null);
  const [email, setEmail] = useState<string | null>(memberSession.email);
  const [error, setError] = useState<string | null>(null);
  const [fanRequestSyncError, setFanRequestSyncError] = useState<string | null>(
    null,
  );
  const [fanRequestSyncStatus, setFanRequestSyncStatus] =
    useState<FanRequestSyncStatus>("idle");
  const [form, setForm] = useState<CreateForm>(() =>
    getInitialCreateForm(initialPlan),
  );
  const [generatedMedia, setGeneratedMedia] = useState<GeneratedMedia | null>(
    null,
  );
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] =
    useState<GenerationStatus>("idle");
  const [localDraftSavedAt, setLocalDraftSavedAt] = useState<number | null>(null);
  const [localDraftStatus, setLocalDraftStatus] =
    useState<LocalDraftStatus>("idle");
  const [isSaving, setIsSaving] = useState(false);
  const [loadStatus, setLoadStatus] =
    useState<"idle" | "loading" | "ready" | "error">("idle");
  const [member, setMember] = useState<MemberRecord | null>(
    memberSession.member,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [profile, setProfile] = useState<CreatorProfileRecord | null>(null);
  const loadInFlightRef = useRef(false);
  const localDraftRestoredRef = useRef(false);
  const hasProfileBasics = Boolean(profile?.displayName?.trim());
  const hasPersona = Boolean(profile?.characterPersona);
  const hasAvatar = Boolean(profile?.avatarImageUrl);
  const hasCharacterReady = hasProfileBasics && hasPersona && hasAvatar;
  const initialPlanId = initialPlan?.planId?.trim() || null;
  const initialFanRequestId = initialPlan?.fanRequestId?.trim() || null;
  const fanOnlyIntent = Boolean(initialPlan?.fanOnlyIntent);
  const localDraftKey = useMemo(
    () =>
      buildCreateDraftKey({
        fanRequestId: initialFanRequestId,
        locale,
        planId: initialPlanId,
        referralCode,
      }),
    [initialFanRequestId, initialPlanId, locale, referralCode],
  );
  const initialFanRequestBody =
    initialPlan?.fanRequestBody?.trim() || initialPlan?.body?.trim() || null;
  const initialFanRequestType = initialPlan?.fanRequestType ?? null;
  const initialFanRequestCharacterName =
    initialPlan?.fanRequestCharacterName?.trim() ||
    profile?.characterPersona?.name?.trim() ||
    profile?.displayName?.trim() ||
    null;
  const fanRequestTypeLabel = initialFanRequestType
    ? copy.fanRequestContext.requestTypes[initialFanRequestType]
    : null;
  const fanRequestSyncLabel =
    fanRequestSyncStatus === "syncing"
      ? copy.fanRequestContext.syncing
      : fanRequestSyncStatus === "used"
        ? copy.fanRequestContext.synced
        : fanRequestSyncStatus === "reviewed"
          ? copy.fanRequestContext.draftSynced
          : fanRequestSyncStatus === "failed"
            ? (fanRequestSyncError ?? copy.fanRequestContext.failed)
            : null;
  const isCharacterPlaybookPlan = Boolean(
    initialPlanId &&
      (CHARACTER_PLAYBOOK_PLAN_IDS.has(initialPlanId) ||
        initialPlanId.startsWith("character-playbook-")),
  );
  const hasPlanContext = Boolean(
    initialPlan &&
      !initialFanRequestId &&
      (initialPlanId ||
        form.title.trim() ||
        form.summary.trim() ||
        form.prompt.trim()),
  );
  const canPublish = Boolean(generatedMedia?.url);
  const selectedModeCopy = copy.videoBody;
  const generatedVideoUrl = generatedMedia?.url ?? null;
  const localDraftSavedTime = formatDraftSavedAt(localDraftSavedAt, locale);
  const localDraftLabel =
    localDraftStatus === "restored"
      ? copy.draftAutosaveRestored
      : localDraftStatus === "cleared"
        ? copy.draftAutosaveCleared
        : localDraftStatus === "saved" && localDraftSavedTime
          ? `${copy.draftAutosaveSaved} · ${localDraftSavedTime}`
          : localDraftStatus === "saved"
            ? copy.draftAutosaveSaved
            : null;
  const contentHref = createdContent
    ? buildPathWithReferral(
        `/${locale}/fanletter/content/${createdContent.contentId}`,
        referralCode ?? createdContent.authorReferralCode,
      )
    : null;

  const resolveEmail = useCallback(async () => {
    const resolved =
      email ??
      memberSession.email ??
      (await getThirdwebUserEmail({ client: thirdwebClient }));

    if (!resolved) {
      throw new Error(copy.accountRequiredBody);
    }

    setEmail(resolved);
    return resolved;
  }, [copy.accountRequiredBody, email, memberSession.email]);

  const loadSetup = useCallback(async () => {
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

      setProfile(data.profile);
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

    void loadSetup();
  }, [connection.isConnected, loadSetup]);

  useEffect(() => {
    localDraftRestoredRef.current = false;
    const timeout = window.setTimeout(() => {
      const draft = readCreateLocalDraft(localDraftKey);

      if (draft) {
        setForm(draft.form);
        setGeneratedMedia(draft.generatedMedia);
        setGenerationMessage(draft.generationMessage);
        setGenerationStatus(draft.generationStatus);
        setLocalDraftSavedAt(draft.savedAt);
        setLocalDraftStatus("restored");
      }

      localDraftRestoredRef.current = true;
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [localDraftKey]);

  useEffect(() => {
    if (!localDraftRestoredRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (!hasMeaningfulCreateDraft(form, generatedMedia)) {
        clearCreateLocalDraft(localDraftKey);
        return;
      }

      const savedAt = writeCreateLocalDraft(localDraftKey, {
        form,
        generatedMedia,
        generationMessage,
        generationStatus:
          generationStatus === "loading"
            ? generatedMedia
              ? "ready"
              : "idle"
            : generationStatus,
      });

      if (savedAt) {
        setLocalDraftSavedAt(savedAt);
        setLocalDraftStatus("saved");
      }
    }, 650);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    form,
    generatedMedia,
    generationMessage,
    generationStatus,
    localDraftKey,
  ]);

  function updateForm(patch: Partial<CreateForm>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function generateMedia() {
    if (!form.prompt.trim()) {
      setError(copy.emptyPrompt);
      return;
    }

    if (!accountAddress) {
      setError(copy.accountRequiredBody);
      return;
    }

    const endpoint = "/api/content/posts/generate-content-video";

    try {
      setCreatedContent(null);
      setError(null);
      setGeneratedMedia(null);
      setGenerationMessage(copy.generatingVideo);
      setGenerationStatus("loading");
      setNotice(null);

      const resolvedEmail = await resolveEmail();
      const response = await fetch(endpoint, {
        body: JSON.stringify({
          email: resolvedEmail,
          locale,
          summary: inferSummary(form),
          title: inferTitle(form, copy.generate),
          visualBrief: form.prompt,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = await readApiJson<GeneratedMedia>(response, copy.errorFallback);

      if (!response.ok || !("url" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : copy.errorFallback,
        );
      }

      setGeneratedMedia({
        contentType: data.contentType,
        revisedPrompt: data.revisedPrompt,
        url: data.url,
      });
      setGenerationMessage(copy.contentReady);
      setGenerationStatus("ready");
      setNotice(copy.contentReady);
    } catch (generationError) {
      const message = getErrorMessage(generationError, copy.errorFallback);

      setError(message);
      setGenerationMessage(message);
      setGenerationStatus("error");
    }
  }

  async function savePost(status: "draft" | "published") {
    if (!accountAddress) {
      setError(copy.accountRequiredBody);
      return;
    }

    if (status === "published" && !generatedMedia?.url) {
      setError(copy.missingMedia);
      return;
    }

    const title = inferTitle(form, copy.generate);
    const body = form.body.trim() || form.prompt.trim() || title;
    const summary = inferSummary(form) || body.replace(/\s+/g, " ").slice(0, 140);
    let savedContent: ContentPostRecord | null = null;

    try {
      setError(null);
      setFanRequestSyncError(null);
      if (initialFanRequestId) {
        setFanRequestSyncStatus("idle");
      }
      setIsSaving(true);
      setNotice(null);
      const resolvedEmail = await resolveEmail();
      const response = await fetch("/api/content/posts", {
        body: JSON.stringify({
          body,
          contentImageUrls: [],
          contentVideoUrls: generatedVideoUrl ? [generatedVideoUrl] : [],
          coverImageUrl: null,
          email: resolvedEmail,
          locale,
          priceType: form.priceType,
          priceUsdt:
            form.priceType === "paid" ? CONTENT_PAID_USDT_AMOUNT : null,
          status,
          summary,
          title,
          walletAddress: accountAddress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = await readApiJson<ContentPostMutationResponse>(
        response,
        copy.errorFallback,
      );

      if (!response.ok || !("content" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : copy.errorFallback,
        );
      }

      savedContent = data.content;
      setCreatedContent(data.content);
      if (initialPlanId && !isCharacterPlaybookPlan) {
        await fetch("/api/content/planner", {
          body: JSON.stringify({
            contentId: data.content.contentId,
            email: resolvedEmail,
            planId: initialPlanId,
            status: status === "published" ? "published" : "created",
            walletAddress: accountAddress,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PATCH",
        }).catch(() => null);
      }
      if (initialFanRequestId) {
        setFanRequestSyncStatus("syncing");
        const fanRequestResponse = await fetch("/api/fanletter/requests", {
          body: JSON.stringify({
            contentId: status === "published" ? data.content.contentId : null,
            email: resolvedEmail,
            requestId: initialFanRequestId,
            status: status === "published" ? "used" : "reviewed",
            walletAddress: accountAddress,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PATCH",
        });
        const fanRequestData =
          await readApiJson<FanletterFanRequestStatusUpdateResponse>(
            fanRequestResponse,
            copy.fanRequestContext.failed,
          );

        if (!fanRequestResponse.ok || !("request" in fanRequestData)) {
          throw new Error(
            "error" in fanRequestData && fanRequestData.error
              ? fanRequestData.error
              : copy.fanRequestContext.failed,
          );
        }

        setFanRequestSyncStatus(
          status === "published" ? "used" : "reviewed",
        );
      }
      setNotice(status === "published" ? copy.published : copy.draftSaved);
      clearCreateLocalDraft(localDraftKey);
      setLocalDraftSavedAt(null);
      setLocalDraftStatus("cleared");
    } catch (saveError) {
      const message = getErrorMessage(saveError, copy.errorFallback);

      if (savedContent && initialFanRequestId) {
        setFanRequestSyncError(message);
        setFanRequestSyncStatus("failed");
      } else {
        setError(message);
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (connection.isResolving) {
    return (
      <StatusPanel
        body={copy.loading}
        cta={copy.accountRequiredCta}
        href={connectHref}
        locale={locale}
        title={copy.loading}
      />
    );
  }

  if (connection.isDisconnected) {
    return (
      <StatusPanel
        body={copy.accountRequiredBody}
        cta={copy.accountRequiredCta}
        href={connectHref}
        locale={locale}
        title={copy.accountRequired}
      />
    );
  }

  if (member?.status === "pending_payment") {
    return (
      <StatusPanel
        body={copy.paymentRequired}
        cta={copy.paymentRequiredCta}
        href={activateHref}
        locale={locale}
        title={copy.paymentRequired}
      />
    );
  }

  if (loadStatus === "ready" && !hasCharacterReady) {
    return (
      <StatusPanel
        body={copy.profileRequiredBody}
        cta={copy.profileRequiredCta}
        href={profileHref}
        locale={locale}
        title={copy.profileRequired}
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
              href={profileHref}
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
              <FanletterGlobalLanguageSwitcher
                className="hidden lg:inline-flex"
                locale={locale}
              />
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

          <div className="mt-4 flex lg:hidden">
            <FanletterGlobalLanguageSwitcher compact locale={locale} />
          </div>

          <div className="grid gap-8 pb-10 pt-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(22rem,0.78fr)] lg:items-end lg:pb-14 lg:pt-20">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#44f26e]">
                {copy.eyebrow}
              </p>
              <h1 className="mt-4 text-[2.65rem] font-semibold leading-[0.98] tracking-normal [word-break:keep-all] sm:text-[5rem]">
                {copy.titleText}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/68 [word-break:keep-all] sm:text-lg">
                {selectedModeCopy}
              </p>
            </div>

            <aside className="rounded-lg border border-white/12 bg-white/[0.055] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.32)] backdrop-blur-md sm:p-5">
              <div className="flex items-start gap-4">
                <span className="relative flex size-20 shrink-0 overflow-hidden rounded-full border border-white/12 bg-white/[0.06]">
                  {profile?.avatarImageUrl ? (
                    <Image
                      alt={profile.displayName || copy.title}
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
                    Creator Persona
                  </p>
                  <h2 className="mt-2 truncate text-2xl font-semibold">
                    {profile?.displayName || copy.profileRequired}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-white/56">
                    {profile?.characterPersona?.summary ?? copy.personaEmpty}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  [Boolean(profile?.displayName), copy.setupChecks.title],
                  [hasPersona, copy.setupChecks.character],
                  [Boolean(generatedVideoUrl), copy.setupChecks.video],
                ].map(([done, label]) => (
                  <div
                    className={`rounded-lg border p-3 ${
                      done
                        ? "border-[#44f26e] bg-[#44f26e] text-black"
                        : "border-white/12 bg-white/[0.055] text-white"
                    }`}
                    key={String(label)}
                  >
                    <CheckCircle2 className="size-4" />
                    <p className="mt-2 truncate text-[0.62rem] font-semibold">
                      {String(label)}
                    </p>
                  </div>
                ))}
              </div>
            </aside>
          </div>

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
          {localDraftLabel ? (
            <div className="mb-4 flex flex-col gap-2 rounded-lg border border-white/12 bg-white/[0.055] p-4 text-sm font-medium leading-6 text-white/62 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#44f26e]" />
                <div>
                  <p className="font-semibold text-[#c9ffd5]">
                    {localDraftLabel}
                  </p>
                  <p className="mt-1 text-xs font-medium leading-5 text-white/44">
                    {copy.draftAutosaveHint}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {hasPlanContext ? (
            <section className="mb-4 rounded-lg border border-[#44f26e]/24 bg-[linear-gradient(135deg,rgba(68,242,110,0.14),rgba(255,255,255,0.045)_46%,rgba(3,5,4,0.8))] p-4 text-[#d8ffe0] sm:p-5">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)] lg:items-start">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#44f26e]">
                    {isCharacterPlaybookPlan
                      ? copy.planContext.eyebrow
                      : copy.planContext.eyebrowPlanner}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-normal [word-break:keep-all]">
                    {isCharacterPlaybookPlan
                      ? copy.planContext.title
                      : copy.planContext.titlePlanner}
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/62 [word-break:keep-all]">
                    {isCharacterPlaybookPlan
                      ? copy.planContext.body
                      : copy.planContext.bodyPlanner}
                  </p>
                  <div className="mt-4 flex items-start gap-3 rounded-lg border border-white/10 bg-black/24 p-3">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#44f26e]" />
                    <p className="text-xs font-semibold leading-5 text-white/64">
                      {copy.planContext.applied}
                    </p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-[#44f26e]/22 bg-[#44f26e]/10 p-3">
                      <Clapperboard className="size-4 text-[#44f26e]" />
                      <p className="mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#8dffa5]">
                        {copy.planContext.outputLabel}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {copy.planContext.outputValue}
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/24 p-3">
                      <Play className="size-4 text-[#44f26e]" />
                      <p className="mt-2 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white/40">
                        {copy.planContext.nextStepLabel}
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-white/62">
                        {copy.planContext.nextStep}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="rounded-lg border border-white/10 bg-black/24 p-3">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/38">
                      {copy.planContext.titleLabel}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-white">
                      {form.title || copy.titlePlaceholder}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/24 p-3">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/38">
                      {copy.planContext.summaryLabel}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-white/62">
                      {form.summary || copy.summaryPlaceholder}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/24 p-3">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/38">
                      {copy.planContext.promptLabel}
                    </p>
                    <p className="mt-2 line-clamp-3 text-sm font-medium leading-6 text-white/62 [overflow-wrap:anywhere]">
                      {form.prompt || copy.promptPlaceholder}
                    </p>
                  </div>
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-4 text-sm font-semibold text-black transition hover:bg-[#67ff88] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={generationStatus === "loading"}
                    onClick={() => {
                      void generateMedia();
                    }}
                    type="button"
                  >
                    {generationStatus === "loading" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Clapperboard className="size-4" />
                    )}
                    {generationStatus === "loading"
                      ? copy.generatingVideo
                      : copy.planContext.generateCta}
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {initialFanRequestId ? (
            <section className="mb-4 rounded-lg border border-[#44f26e]/24 bg-[#44f26e]/10 p-4 text-[#d8ffe0] sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#44f26e]">
                    {copy.fanRequestContext.eyebrow}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-normal">
                    {copy.fanRequestContext.title}
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-white/62">
                    {copy.fanRequestContext.body}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {fanRequestTypeLabel ? (
                      <span className="rounded-full border border-[#44f26e]/26 bg-black/24 px-3 py-1 text-xs font-semibold text-[#b9ffc8]">
                        {fanRequestTypeLabel}
                      </span>
                    ) : null}
                    {initialFanRequestCharacterName ? (
                      <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold text-white/62">
                        {initialFanRequestCharacterName}
                      </span>
                    ) : null}
                  </div>
                  {initialFanRequestBody ? (
                    <p className="mt-4 line-clamp-3 rounded-lg border border-white/10 bg-black/24 p-3 text-sm font-semibold leading-6 text-white [overflow-wrap:anywhere]">
                      {initialFanRequestBody}
                    </p>
                  ) : null}
                  {fanRequestSyncLabel ? (
                    <div
                      className={`mt-3 flex items-start gap-3 rounded-lg border p-3 ${
                        fanRequestSyncStatus === "failed"
                          ? "border-red-300/20 bg-red-500/12 text-red-100"
                          : "border-[#44f26e]/24 bg-[#44f26e]/10 text-[#d8ffe0]"
                      }`}
                    >
                      {fanRequestSyncStatus === "syncing" ? (
                        <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-[#44f26e]" />
                      ) : fanRequestSyncStatus === "failed" ? (
                        <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-200" />
                      ) : (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#44f26e]" />
                      )}
                      <p className="text-xs font-semibold leading-5">
                        {fanRequestSyncLabel}
                      </p>
                    </div>
                  ) : null}
                </div>
                <div className="grid shrink-0 gap-2 sm:grid-cols-2 lg:w-[24rem] lg:grid-cols-1">
                  {[
                    copy.fanRequestContext.autoFill,
                    ...(fanOnlyIntent
                      ? [copy.fanRequestContext.fanOnlyDefault]
                      : []),
                    copy.fanRequestContext.publishStep,
                    copy.fanRequestContext.autoClose,
                  ].map((item) => (
                    <div
                      className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.055] p-3"
                      key={item}
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#44f26e]" />
                      <p className="text-xs font-semibold leading-5 text-white/64">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
            <section className="rounded-lg border border-white/12 bg-white/[0.055] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                01
              </p>
              <h2 className="mt-3 text-2xl font-semibold">{copy.prompt}</h2>
              <div className="mt-5 rounded-lg border border-[#44f26e]/30 bg-[#44f26e]/12 p-4 text-[#d7ffdf]">
                <Clapperboard className="size-5 text-[#44f26e]" />
                <span className="mt-3 block text-sm font-semibold">
                  {copy.video}
                </span>
                <p className="mt-2 text-sm font-medium leading-6 text-white/62">
                  {copy.videoBody}
                </p>
              </div>
              <div className="mt-5 grid gap-3">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                    {copy.title}
                  </span>
                  <input
                    className="mt-2 h-12 w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#44f26e] focus:bg-white/[0.08]"
                    onChange={(event) => {
                      updateForm({ title: event.target.value });
                    }}
                    placeholder={copy.titlePlaceholder}
                    value={form.title}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                    {copy.summary}
                  </span>
                  <input
                    className="mt-2 h-12 w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#44f26e] focus:bg-white/[0.08]"
                    onChange={(event) => {
                      updateForm({ summary: event.target.value });
                    }}
                    placeholder={copy.summaryPlaceholder}
                    value={form.summary}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                    {copy.prompt}
                  </span>
                  <textarea
                    className="mt-2 min-h-44 w-full resize-none rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-base leading-7 text-white outline-none transition placeholder:text-white/30 focus:border-[#44f26e] focus:bg-white/[0.08]"
                    onChange={(event) => {
                      updateForm({ prompt: event.target.value });
                    }}
                    placeholder={copy.promptPlaceholder}
                    value={form.prompt}
                  />
                </label>
              </div>
              <button
                className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold text-black transition hover:bg-[#67ff88] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={generationStatus === "loading"}
                onClick={() => {
                  void generateMedia();
                }}
                type="button"
              >
                {generationStatus === "loading" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Clapperboard className="size-4" />
                )}
                {generationStatus === "loading"
                  ? copy.generatingVideo
                  : copy.generate}
              </button>
            </section>

            <section className="rounded-lg border border-white/12 bg-white/[0.055] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                02
              </p>
              <h2 className="mt-3 text-2xl font-semibold">{copy.result}</h2>
              <div className="mt-5 overflow-hidden rounded-lg border border-white/12 bg-black/32">
                <div className="relative aspect-[4/5]">
                  {generatedVideoUrl ? (
                    <video
                      autoPlay
                      className="h-full w-full object-contain"
                      controls
                      loop
                      muted
                      playsInline
                      src={generatedVideoUrl}
                    />
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center px-6 text-center text-white/44">
                      {generationStatus === "loading" ? (
                        <Loader2 className="size-8 animate-spin text-[#44f26e]" />
                      ) : (
                        <Play className="size-8 text-[#44f26e]" />
                      )}
                      <p className="mt-3 text-sm font-medium leading-6">
                        {generationMessage ?? selectedModeCopy}
                      </p>
                    </div>
                  )}
                </div>
                {generatedMedia?.revisedPrompt ? (
                  <p className="border-t border-white/10 p-3 text-xs font-medium leading-5 text-white/46">
                    {generatedMedia.revisedPrompt}
                  </p>
                ) : null}
              </div>
            </section>
          </div>

          <section className="mt-4 rounded-lg border border-white/12 bg-white/[0.055] p-4 sm:p-5">
            <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                  03
                </p>
                <h2 className="mt-3 text-2xl font-semibold">{copy.publish}</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-white/56">
                  {copy.bodyHint}
                </p>
              </div>
              <div>
                <textarea
                  className="min-h-32 w-full resize-none rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-base leading-7 text-white outline-none transition placeholder:text-white/30 focus:border-[#44f26e] focus:bg-white/[0.08]"
                  onChange={(event) => {
                    updateForm({ body: event.target.value });
                  }}
                  placeholder={copy.bodyPlaceholder}
                  value={form.body}
                />
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/42">
                  {copy.price}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    ["free", copy.free],
                    ["paid", copy.paid],
                  ].map(([value, label]) => (
                    <button
                      className={`h-11 rounded-full border px-3 text-sm font-semibold transition ${
                        form.priceType === value
                          ? "border-[#44f26e] bg-[#44f26e] text-black"
                          : "border-white/12 bg-white/[0.055] text-white"
                      }`}
                      key={value}
                      onClick={() => {
                        updateForm({ priceType: value as ContentPriceType });
                      }}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {fanOnlyIntent ? (
                  <p className="mt-3 rounded-lg border border-[#44f26e]/24 bg-[#44f26e]/10 px-3 py-2 text-xs font-semibold leading-5 text-[#d8ffe0]">
                    {copy.fanRequestContext.fanOnlyHint}
                  </p>
                ) : null}

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    className="inline-flex h-12 items-center justify-center rounded-full border border-white/16 bg-white/8 px-5 text-sm font-semibold text-white transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSaving}
                    onClick={() => {
                      void savePost("draft");
                    }}
                    type="button"
                  >
                    {isSaving ? <Loader2 className="size-4 animate-spin" /> : copy.draft}
                  </button>
                  <button
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-semibold text-black transition hover:bg-[#67ff88] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSaving || !canPublish}
                    onClick={() => {
                      void savePost("published");
                    }}
                    type="button"
                  >
                    {isSaving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Clapperboard className="size-4" />
                    )}
                    {copy.publish}
                  </button>
                </div>

                {contentHref ? (
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <Link
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold !text-black transition hover:bg-white/90"
                      href={contentHref}
                    >
                      {copy.viewContent}
                      <ArrowRight className="size-4" />
                    </Link>
                    <Link
                      className="inline-flex h-12 items-center justify-center rounded-full border border-white/16 px-5 text-sm font-semibold !text-white transition hover:bg-white/10"
                      href={feedHref}
                    >
                      {copy.feed}
                    </Link>
                    <Link
                      className="inline-flex h-12 items-center justify-center rounded-full border border-white/16 px-5 text-sm font-semibold !text-white transition hover:bg-white/10"
                      href={studioHref}
                    >
                      {copy.studio}
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
