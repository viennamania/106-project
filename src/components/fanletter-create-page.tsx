"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clapperboard,
  ImageIcon,
  Loader2,
  MessageCircleHeart,
  Play,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useActiveAccount,
  useActiveWalletChain,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { useMemberSession } from "@/components/member-session-provider";
import {
  CONTENT_PAID_USDT_AMOUNT,
  type ContentPostMutationResponse,
  type ContentPostRecord,
  type ContentPriceType,
  type CreatorProfileRecord,
  type CreatorProfileResponse,
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

type CreateMode = "image" | "video";
type GenerationStatus = "error" | "idle" | "loading" | "ready";

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

const EMPTY_FORM: CreateForm = {
  body: "",
  mode: "image",
  priceType: "free",
  prompt: "",
  summary: "",
  title: "",
};
const FANLETTER_CREATE_DISCONNECTED_GRACE_MS = 4500;

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        accountRequired: "계정 연결이 필요합니다.",
        accountRequiredBody:
          "첫 AI 캐릭터 vlog를 만들려면 FanLetter 계정 연결을 먼저 완료해야 합니다.",
        accountRequiredCta: "계정 연결하기",
        back: "프로필로 돌아가기",
        body: "vlog 본문",
        bodyHint:
          "비워두면 vlog 장면 프롬프트를 본문으로 사용합니다. 팬에게 보여줄 설명을 짧게 다듬어도 됩니다.",
        bodyPlaceholder: "팬에게 보여줄 vlog 설명을 입력하세요.",
        contentReady: "오늘의 AI 캐릭터 vlog가 준비되었습니다.",
        draft: "임시 저장",
        draftSaved: "임시 저장했습니다.",
        emptyPrompt: "오늘의 vlog 장면을 입력하세요.",
        errorFallback: "첫 AI 캐릭터 vlog를 처리하지 못했습니다.",
        eyebrow: "FanLetter AI Character Vlog",
        feed: "FanLetter vlog 피드 보기",
        free: "무료 공개",
        generate: "vlog 생성",
        generated: "생성 완료",
        generatingImage: "AI 이미지 생성 중...",
        generatingVideo: "AI 동영상 생성 중...",
        image: "이미지 장면",
        imageBody:
          "페르소나와 아바타를 함께 사용해 숏폼 vlog의 이미지 장면을 만듭니다.",
        loading: "vlog 준비 상태를 확인하고 있습니다.",
        missingMedia: "공개하려면 먼저 이미지 또는 동영상을 생성하세요.",
        paid: `${CONTENT_PAID_USDT_AMOUNT} USDT 유료`,
        paymentRequired: "가입 완료 회원만 첫 AI 캐릭터 vlog를 만들 수 있습니다.",
        paymentRequiredCta: "가입 완료 확인하기",
        personaEmpty: "프로필에서 인물 페르소나를 먼저 선택하면 같은 인물 유지가 강해집니다.",
        price: "공개 방식",
        profileRequired: "프로필 준비가 필요합니다.",
        profileRequiredBody:
          "FanLetter 첫 AI 캐릭터 vlog는 표시 이름과 캐릭터 페르소나를 준비한 뒤 만들면 결과가 더 안정적입니다.",
        profileRequiredCta: "프로필 설정하기",
        prompt: "vlog 장면",
        promptPlaceholder:
          "장소, 행동, 대사, 카메라 느낌, 숏폼 분위기를 자연스럽게 입력하세요.",
        publish: "vlog 공개",
        published: "공개했습니다.",
        result: "vlog 미리보기",
        summary: "요약",
        summaryPlaceholder: "짧은 소개 문구",
        studio: "vlog 스튜디오",
        title: "제목",
        titlePlaceholder: "오늘의 vlog 제목",
        titleText: "오늘의 AI 캐릭터 vlog를 바로 만드세요.",
        video: "숏폼 vlog",
        videoBody:
          "세로형 동영상 vlog를 생성해 모바일 캐릭터 피드에 바로 연결합니다.",
        viewContent: "vlog 보기",
      }
    : {
        accountRequired: "Account connection required.",
        accountRequiredBody:
          "Connect your FanLetter account before creating the first AI character vlog.",
        accountRequiredCta: "Connect account",
        back: "Back to profile",
        body: "Vlog body",
        bodyHint:
          "When empty, the vlog scene prompt is used as the body. You can also write a shorter fan-facing description.",
        bodyPlaceholder: "Write the vlog description for fans.",
        contentReady: "Today's AI character vlog is ready.",
        draft: "Save draft",
        draftSaved: "Draft saved.",
        emptyPrompt: "Enter today's vlog scene.",
        errorFallback: "Failed to process first AI character vlog.",
        eyebrow: "FanLetter AI Character Vlog",
        feed: "View FanLetter vlog feed",
        free: "Free public",
        generate: "Generate vlog",
        generated: "Generated",
        generatingImage: "Generating AI image...",
        generatingVideo: "Generating AI video...",
        image: "Image scene",
        imageBody:
          "Use the persona and avatar together to create an image scene for the short-form vlog.",
        loading: "Checking vlog setup.",
        missingMedia: "Generate an image or video before publishing.",
        paid: `${CONTENT_PAID_USDT_AMOUNT} USDT paid`,
        paymentRequired: "Only completed members can create the first AI character vlog.",
        paymentRequiredCta: "Verify signup",
        personaEmpty:
          "Choose a persona in profile setup first to keep the same person stronger.",
        price: "Visibility",
        profileRequired: "Profile setup required.",
        profileRequiredBody:
          "The first AI character vlog works better after setting a display name and character persona.",
        profileRequiredCta: "Set up profile",
        prompt: "Vlog scene",
        promptPlaceholder:
          "Describe location, action, dialogue, camera feel, and short-form mood.",
        publish: "Publish vlog",
        published: "Published.",
        result: "Vlog preview",
        summary: "Summary",
        summaryPlaceholder: "Short intro",
        studio: "Vlog studio",
        title: "Title",
        titlePlaceholder: "Today's vlog title",
        titleText: "Create today's AI character vlog inside FanLetter.",
        video: "Short-form vlog",
        videoBody:
          "Generate a vertical video vlog that connects directly to the mobile character feed.",
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

export function FanletterCreatePage({
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
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [generatedMedia, setGeneratedMedia] = useState<GeneratedMedia | null>(
    null,
  );
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] =
    useState<GenerationStatus>("idle");
  const [isSaving, setIsSaving] = useState(false);
  const [loadStatus, setLoadStatus] =
    useState<"idle" | "loading" | "ready" | "error">("idle");
  const [member, setMember] = useState<MemberRecord | null>(
    memberSession.member,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [profile, setProfile] = useState<CreatorProfileRecord | null>(null);
  const loadInFlightRef = useRef(false);
  const hasProfileBasics = Boolean(profile?.displayName?.trim());
  const hasPersona = Boolean(profile?.characterPersona);
  const canPublish = Boolean(generatedMedia?.url);
  const selectedModeCopy = form.mode === "image" ? copy.imageBody : copy.videoBody;
  const generatedImageUrl = form.mode === "image" ? generatedMedia?.url : null;
  const generatedVideoUrl = form.mode === "video" ? generatedMedia?.url : null;
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

    const endpoint =
      form.mode === "image"
        ? "/api/content/posts/generate-content-image"
        : "/api/content/posts/generate-content-video";

    try {
      setCreatedContent(null);
      setError(null);
      setGeneratedMedia(null);
      setGenerationMessage(
        form.mode === "image" ? copy.generatingImage : copy.generatingVideo,
      );
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

    try {
      setError(null);
      setIsSaving(true);
      setNotice(null);
      const resolvedEmail = await resolveEmail();
      const response = await fetch("/api/content/posts", {
        body: JSON.stringify({
          body,
          contentImageUrls: generatedImageUrl ? [generatedImageUrl] : [],
          contentVideoUrls: generatedVideoUrl ? [generatedVideoUrl] : [],
          coverImageUrl: generatedImageUrl,
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

      setCreatedContent(data.content);
      setNotice(status === "published" ? copy.published : copy.draftSaved);
    } catch (saveError) {
      setError(getErrorMessage(saveError, copy.errorFallback));
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
        title={copy.paymentRequired}
      />
    );
  }

  if (loadStatus === "ready" && !hasProfileBasics) {
    return (
      <StatusPanel
        body={copy.profileRequiredBody}
        cta={copy.profileRequiredCta}
        href={profileHref}
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
                  [Boolean(profile?.displayName), copy.title],
                  [hasPersona, copy.profileRequiredCta],
                  [Boolean(profile?.avatarImageUrl), copy.generated],
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

          <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
            <section className="rounded-lg border border-white/12 bg-white/[0.055] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#44f26e]">
                01
              </p>
              <h2 className="mt-3 text-2xl font-semibold">{copy.prompt}</h2>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {[
                  {
                    Icon: ImageIcon,
                    body: copy.imageBody,
                    label: copy.image,
                    value: "image" as const,
                  },
                  {
                    Icon: Clapperboard,
                    body: copy.videoBody,
                    label: copy.video,
                    value: "video" as const,
                  },
                ].map((option) => {
                  const Icon = option.Icon;
                  const selected = form.mode === option.value;

                  return (
                    <button
                      className={`rounded-lg border p-4 text-left transition ${
                        selected
                          ? "border-[#44f26e] bg-[#44f26e] text-black"
                          : "border-white/12 bg-white/[0.055] text-white"
                      }`}
                      key={option.value}
                      onClick={() => {
                        updateForm({ mode: option.value });
                        setGeneratedMedia(null);
                        setGenerationStatus("idle");
                        setGenerationMessage(null);
                        setCreatedContent(null);
                      }}
                      type="button"
                    >
                      <Icon className="size-5" />
                      <span className="mt-3 block text-sm font-semibold">
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <input
                className="mt-5 h-12 w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#44f26e] focus:bg-white/[0.08]"
                onChange={(event) => {
                  updateForm({ title: event.target.value });
                }}
                placeholder={copy.titlePlaceholder}
                value={form.title}
              />
              <input
                className="mt-3 h-12 w-full rounded-2xl border border-white/12 bg-white/[0.06] px-4 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#44f26e] focus:bg-white/[0.08]"
                onChange={(event) => {
                  updateForm({ summary: event.target.value });
                }}
                placeholder={copy.summaryPlaceholder}
                value={form.summary}
              />
              <textarea
                className="mt-3 min-h-44 w-full resize-none rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-base leading-7 text-white outline-none transition placeholder:text-white/30 focus:border-[#44f26e] focus:bg-white/[0.08]"
                onChange={(event) => {
                  updateForm({ prompt: event.target.value });
                }}
                placeholder={copy.promptPlaceholder}
                value={form.prompt}
              />
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
                  <Sparkles className="size-4" />
                )}
                {generationStatus === "loading"
                  ? form.mode === "image"
                    ? copy.generatingImage
                    : copy.generatingVideo
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
                  {generatedImageUrl ? (
                    <Image
                      alt={form.title || copy.result}
                      className="object-cover"
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      src={generatedImageUrl}
                    />
                  ) : generatedVideoUrl ? (
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
