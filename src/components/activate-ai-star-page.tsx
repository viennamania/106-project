"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Camera,
  CheckCircle2,
  CircleAlert,
  ImageIcon,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import {
  useActiveAccount,
  useActiveWalletConnectionStatus,
} from "thirdweb/react";

import { useMemberSession } from "@/components/member-session-provider";
import type {
  CreatorCharacterPersona,
  CreatorProfileRecord,
  CreatorProfileResponse,
  CreatorProfileUploadResponse,
} from "@/lib/content";
import {
  buildPathWithReferral,
  setLandingLanguageContext,
} from "@/lib/landing-branding";
import type { Dictionary, Locale } from "@/lib/i18n";
import { SERVICE_BRAND_NAME } from "@/lib/service-branding";
import {
  getThirdwebUserEmail,
  useThirdwebConnectionState,
} from "@/lib/thirdweb-client";
import { thirdwebClient } from "@/lib/thirdweb";

type AIStarPageStatus = "idle" | "loading" | "ready" | "error";

type AIStarPageState = {
  error: string | null;
  notice: string | null;
  profile: CreatorProfileRecord | null;
  profileConfigured: boolean;
  status: AIStarPageStatus;
};

type ActivateAIStarCopy = {
  aiStarBadge: string;
  back: string;
  connected: string;
  contextAsset: string;
  contextMoat: string;
  description: string;
  errorFallback: string;
  imageLabel: string;
  imageUploadHelp: string;
  loading: string;
  missingConnection: string;
  missingName: string;
  nameHelp: string;
  nameLabel: string;
  nextAction: string;
  noImage: string;
  previewLabel: string;
  retry: string;
  save: string;
  saved: string;
  saving: string;
  sectionKicker: string;
  title: string;
  upload: string;
  uploading: string;
};

function getActivateAIStarCopy(locale: Locale): ActivateAIStarCopy {
  switch (locale) {
    case "ko":
      return {
        aiStarBadge: "AI STAR",
        back: "1066FRIEND+ 허브",
        connected: "연결됨",
        contextAsset: "이름과 프로필 이미지는 콘텐츠, 리워드, 네트워크 피드에서 같은 AI 스타 프로필로 누적됩니다.",
        contextMoat: "가입 회원, 지갑, 추천 코드, AI 스타 프로필이 함께 묶여 복제하기 어려운 Context 자산이 됩니다.",
        description:
          "가입 완료 후 생성된 내 AI 스타의 이름과 프로필 이미지를 관리합니다.",
        errorFallback: "AI 스타 프로필을 불러오지 못했습니다.",
        imageLabel: "프로필 이미지",
        imageUploadHelp: "정사각형 이미지가 가장 안정적으로 보입니다. JPG, PNG, WEBP를 지원합니다.",
        loading: "AI 스타 프로필을 확인하는 중입니다.",
        missingConnection: "먼저 1066FRIEND+에 연결된 회원 상태가 필요합니다.",
        missingName: "AI 스타 이름을 입력하세요.",
        nameHelp: "콘텐츠 피드와 AI 스타 유니버스에 노출되는 이름입니다.",
        nameLabel: "AI 스타 이름",
        nextAction: "저장 후 콘텐츠 제작과 네트워크 피드에서 같은 AI 스타로 표시됩니다.",
        noImage: "이미지 준비 전",
        previewLabel: "내 AI 스타 미리보기",
        retry: "다시 확인",
        save: "AI 스타 정보 저장",
        saved: "AI 스타 프로필이 저장되었습니다.",
        saving: "저장 중",
        sectionKicker: "MY AI STAR",
        title: "내 AI 스타 프로필",
        upload: "이미지 변경",
        uploading: "업로드 중",
      };
    case "ja":
      return {
        aiStarBadge: "AI STAR",
        back: "1066FRIEND+ Hub",
        connected: "接続済み",
        contextAsset: "名前と画像はコンテンツ、リワード、ネットワークフィードで同じAIスターIPとして蓄積されます。",
        contextMoat: "会員、ウォレット、紹介コード、AIスターIPが結びつき、コピーしにくいContext資産になります。",
        description: "登録完了後に作成されたAIスターIPの名前とプロフィール画像を管理します。",
        errorFallback: "AIスターIP情報を読み込めませんでした。",
        imageLabel: "プロフィール画像",
        imageUploadHelp: "正方形画像が最も安定します。JPG、PNG、WEBPに対応しています。",
        loading: "AIスターIP情報を確認しています。",
        missingConnection: "先に1066FRIEND+に接続された会員状態が必要です。",
        missingName: "AIスター名を入力してください。",
        nameHelp: "コンテンツフィードとAIスターUniverseに表示される名前です。",
        nameLabel: "AIスター名",
        nextAction: "保存後、コンテンツ制作とネットワークフィードで同じAIスターとして表示されます。",
        noImage: "画像未設定",
        previewLabel: "AIスターIPプレビュー",
        retry: "再確認",
        save: "AIスター情報を保存",
        saved: "AIスターIP情報を保存しました。",
        saving: "保存中",
        sectionKicker: "AI STAR IP",
        title: "AIスターIP管理",
        upload: "画像を変更",
        uploading: "アップロード中",
      };
    default:
      return {
        aiStarBadge: "AI STAR",
        back: "1066FRIEND+ hub",
        connected: "Connected",
        contextAsset: "The name and image accumulate as the same AI Star profile across content, rewards, and the network feed.",
        contextMoat: "Member, wallet, referral code, and AI Star profile become a hard-to-copy Context asset.",
        description:
          "Manage the AI Star profile name and image created after activation.",
        errorFallback: "Failed to load the AI Star profile.",
        imageLabel: "Profile image",
        imageUploadHelp: "Square images work best. JPG, PNG, and WEBP are supported.",
        loading: "Checking your AI Star profile.",
        missingConnection: "Connect the activated 1066FRIEND+ member first.",
        missingName: "Enter the AI Star name.",
        nameHelp: "This name appears in the content feed and AI Star Universe.",
        nameLabel: "AI Star name",
        nextAction: "After saving, content creation and network feed use the same AI Star identity.",
        noImage: "Image pending",
        previewLabel: "AI Star profile preview",
        retry: "Check again",
        save: "Save AI Star",
        saved: "AI Star profile saved.",
        saving: "Saving",
        sectionKicker: "MY AI STAR",
        title: "My AI Star Profile",
        upload: "Change image",
        uploading: "Uploading",
      };
  }
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

function createFallbackPersona({
  current,
  name,
  referralCode,
}: {
  current: CreatorCharacterPersona | null | undefined;
  name: string;
  referralCode: string | null;
}): CreatorCharacterPersona {
  if (current) {
    return {
      ...current,
      name,
      summary:
        current.summary?.trim() ||
        `${name} is the AI Star profile connected to this 1066FRIEND+ member.`,
    };
  }

  return {
    avoidChanges: [],
    id: `friend-ai-star-${referralCode?.toLowerCase() || Date.now()}`,
    identityPrompt: `${name} is a fictional AI Star profile created for a 1066FRIEND+ activated member. Keep the identity consistent across content, rewards, and network feed surfaces.`,
    lockedTraits: ["1066FRIEND+ AI Star profile", "member-owned creator identity"],
    name,
    realismProfile: null,
    summary: `${name} is the AI Star profile connected to this 1066FRIEND+ member.`,
  };
}

export function ActivateAIStarPage({
  dictionary,
  landingLanguage = null,
  locale,
  referralCode = null,
  returnToHref,
}: {
  dictionary: Dictionary;
  landingLanguage?: string | null;
  locale: Locale;
  referralCode?: string | null;
  returnToHref: string;
}) {
  const copy = getActivateAIStarCopy(locale);
  const account = useActiveAccount();
  const accountAddress = account?.address ?? null;
  const walletStatus = useActiveWalletConnectionStatus();
  const memberSession = useMemberSession();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<AIStarPageState>({
    error: null,
    notice: null,
    profile: null,
    profileConfigured: false,
    status: "idle",
  });
  const [displayName, setDisplayName] = useState("");
  const [intro, setIntro] = useState("");
  const [avatarImageUrl, setAvatarImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const memberSessionEmail =
    accountAddress &&
    memberSession.accountAddress?.toLowerCase() === accountAddress.toLowerCase()
      ? memberSession.email
      : null;
  const { isDisconnected, isResolving } = useThirdwebConnectionState({
    accountAddress,
    disconnectedResolveGraceMs: 4500,
    resolveGraceMs: 4500,
    status: walletStatus,
  });
  const activateHref = useMemo(
    () =>
      setLandingLanguageContext(
        buildPathWithReferral(`/${locale}/activate`, referralCode),
        landingLanguage,
      ),
    [landingLanguage, locale, referralCode],
  );
  const resolvedReturnHref = returnToHref || activateHref;

  const resolveEmail = useCallback(async () => {
    const email =
      memberSessionEmail ??
      (await getThirdwebUserEmail({ client: thirdwebClient }));

    if (!email) {
      throw new Error(dictionary.member.errors.missingEmail);
    }

    return email;
  }, [dictionary.member.errors.missingEmail, memberSessionEmail]);

  const loadProfile = useCallback(async () => {
    if (!accountAddress) {
      setState((current) => ({
        ...current,
        error: copy.missingConnection,
        notice: null,
        status: "idle",
      }));
      return;
    }

    try {
      setState((current) => ({
        ...current,
        error: null,
        notice: null,
        status: "loading",
      }));
      const email = await resolveEmail();
      const response = await fetch(
        `/api/content/profile?email=${encodeURIComponent(email)}&walletAddress=${encodeURIComponent(accountAddress)}`,
      );
      const data = await readApiJson<CreatorProfileResponse>(
        response,
        copy.errorFallback,
      );

      if (!response.ok || !("profile" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : copy.errorFallback,
        );
      }

      setState({
        error: null,
        notice: null,
        profile: data.profile,
        profileConfigured: data.profileConfigured,
        status: "ready",
      });
      setDisplayName(
        data.profile.characterPersona?.name ||
          data.profile.displayName ||
          SERVICE_BRAND_NAME,
      );
      setIntro(data.profile.intro || "");
      setAvatarImageUrl(data.profile.avatarImageUrl || "");
    } catch (error) {
      setState((current) => ({
        ...current,
        error: getErrorMessage(error, copy.errorFallback),
        notice: null,
        status: "error",
      }));
    }
  }, [accountAddress, copy.errorFallback, copy.missingConnection, resolveEmail]);

  useEffect(() => {
    if (isResolving) {
      return;
    }

    if (isDisconnected || !accountAddress) {
      setState((current) => ({
        ...current,
        error: copy.missingConnection,
        notice: null,
        status: "idle",
      }));
      return;
    }

    void loadProfile();
  }, [accountAddress, copy.missingConnection, isDisconnected, isResolving, loadProfile]);

  async function uploadAvatar(file: File | null | undefined) {
    if (!file || !accountAddress) {
      return;
    }

    try {
      setIsUploading(true);
      setState((current) => ({ ...current, error: null, notice: null }));
      const email = await resolveEmail();
      const formData = new FormData();
      formData.set("email", email);
      formData.set("walletAddress", accountAddress);
      formData.set("file", file);

      const response = await fetch("/api/content/profile/upload", {
        body: formData,
        method: "POST",
      });
      const data = await readApiJson<CreatorProfileUploadResponse>(
        response,
        copy.errorFallback,
      );

      if (!response.ok || !("url" in data)) {
        throw new Error(
          "error" in data && data.error ? data.error : copy.errorFallback,
        );
      }

      setAvatarImageUrl(data.url);
      setState((current) => ({
        ...current,
        notice:
          locale === "ko"
            ? "이미지가 업로드되었습니다. 저장을 눌러 AI 스타 프로필에 반영하세요."
            : "Image uploaded. Save to apply it to the AI Star profile.",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: getErrorMessage(error, copy.errorFallback),
        notice: null,
      }));
    } finally {
      setIsUploading(false);
    }
  }

  async function saveAIStar() {
    const name = displayName.trim();

    if (!name) {
      setState((current) => ({
        ...current,
        error: copy.missingName,
        notice: null,
      }));
      return;
    }

    if (!accountAddress || !state.profile) {
      setState((current) => ({
        ...current,
        error: copy.missingConnection,
        notice: null,
      }));
      return;
    }

    try {
      setIsSaving(true);
      setState((current) => ({ ...current, error: null, notice: null }));
      const email = await resolveEmail();
      const persona = createFallbackPersona({
        current: state.profile.characterPersona,
        name,
        referralCode: state.profile.referralCode || referralCode,
      });
      const response = await fetch("/api/content/profile/character", {
        body: JSON.stringify({
          avatarImageSet: state.profile.avatarImageSet,
          avatarImageUrl: avatarImageUrl || null,
          characterMemory: state.profile.characterMemory,
          characterPersona: persona,
          characterTimeline: state.profile.characterTimeline,
          displayName: name,
          email,
          intro,
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

      setState({
        error: null,
        notice: copy.saved,
        profile: data.profile,
        profileConfigured: data.profileConfigured,
        status: "ready",
      });
      setDisplayName(data.profile.characterPersona?.name || data.profile.displayName);
      setIntro(data.profile.intro || "");
      setAvatarImageUrl(data.profile.avatarImageUrl || "");
    } catch (error) {
      setState((current) => ({
        ...current,
        error: getErrorMessage(error, copy.errorFallback),
        notice: null,
      }));
    } finally {
      setIsSaving(false);
    }
  }

  const isBusy = isSaving || isUploading || state.status === "loading";
  const previewName = displayName.trim() || copy.noImage;
  const contextScore = state.profileConfigured ? 8 : 6;

  return (
    <main className="min-h-screen bg-[#f7f3ea] px-4 py-4 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-[0_14px_34px_rgba(15,23,42,0.08)] transition hover:bg-zinc-50"
            href={resolvedReturnHref}
          >
            <ArrowLeft className="size-4" />
            {copy.back}
          </Link>
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="size-4" />
            {copy.connected}
          </span>
        </div>

        <section className="mt-4 overflow-hidden rounded-[32px] border border-zinc-200 bg-white shadow-[0_24px_80px_rgba(24,24,27,0.1)]">
          <div className="grid gap-0 lg:grid-cols-[0.88fr_1.12fr]">
            <div className="bg-zinc-950 p-5 text-white sm:p-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                <Sparkles className="size-3.5 text-emerald-300" />
                {copy.sectionKicker}
              </span>
              <h1 className="mt-5 break-keep text-4xl font-semibold leading-[0.98] tracking-[-0.06em] text-white sm:text-5xl">
                {copy.title}
              </h1>
              <p className="mt-4 max-w-md break-keep text-sm leading-6 text-white/62 sm:text-base sm:leading-7">
                {copy.description}
              </p>

              <div className="mt-7 rounded-[28px] border border-white/12 bg-white/[0.06] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                  {copy.previewLabel}
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <div className="relative size-24 shrink-0 overflow-hidden bg-white/8 [clip-path:polygon(25%_6%,75%_6%,100%_50%,75%_94%,25%_94%,0_50%)] sm:size-28">
                    {avatarImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        className="h-full w-full object-cover"
                        src={avatarImageUrl}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-white/35">
                        <ImageIcon className="size-8" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="inline-flex rounded-full bg-white px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-zinc-950">
                      {copy.aiStarBadge}
                    </span>
                    <h2 className="mt-3 truncate text-2xl font-semibold tracking-tight text-white">
                      {previewName}
                    </h2>
                    <p className="mt-1 truncate text-sm text-white/50">
                      {state.profile?.referralCode ?? referralCode ?? SERVICE_BRAND_NAME}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-white/65">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="font-semibold text-white">{copy.nextAction}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p>{copy.contextAsset}</p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              {state.error ? (
                <div className="mb-4 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-900">
                  <CircleAlert className="mb-2 size-5" />
                  {state.error}
                </div>
              ) : null}
              {state.notice ? (
                <div className="mb-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
                  <CheckCircle2 className="mb-2 size-5" />
                  {state.notice}
                </div>
              ) : null}

              {state.status === "loading" ? (
                <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-zinc-200 bg-zinc-50">
                  <div className="text-center">
                    <Loader2 className="mx-auto size-8 animate-spin text-zinc-500" />
                    <p className="mt-3 text-sm font-semibold text-zinc-600">
                      {copy.loading}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-5">
                  <section className="rounded-[28px] border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
                    <label className="text-sm font-semibold text-zinc-950" htmlFor="ai-star-name">
                      {copy.nameLabel}
                    </label>
                    <input
                      className="mt-3 min-h-14 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-lg font-semibold text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950"
                      id="ai-star-name"
                      maxLength={40}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder={copy.nameLabel}
                      value={displayName}
                    />
                    <p className="mt-2 text-xs font-medium leading-5 text-zinc-500">
                      {copy.nameHelp}
                    </p>
                  </section>

                  <section className="rounded-[28px] border border-zinc-200 bg-white p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-950">
                          {copy.imageLabel}
                        </p>
                        <p className="mt-1 text-xs font-medium leading-5 text-zinc-500">
                          {copy.imageUploadHelp}
                        </p>
                      </div>
                      <button
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-55"
                        disabled={isUploading || !accountAddress}
                        onClick={() => fileInputRef.current?.click()}
                        type="button"
                      >
                        {isUploading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Camera className="size-4" />
                        )}
                        {isUploading ? copy.uploading : copy.upload}
                      </button>
                      <input
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(event) => {
                          void uploadAvatar(event.target.files?.[0]);
                          event.currentTarget.value = "";
                        }}
                        ref={fileInputRef}
                        type="file"
                      />
                    </div>

                    <div className="mt-4 overflow-hidden rounded-[24px] border border-zinc-200 bg-zinc-50">
                      {avatarImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt=""
                          className="aspect-[16/10] w-full object-cover"
                          src={avatarImageUrl}
                        />
                      ) : (
                        <div className="flex aspect-[16/10] w-full items-center justify-center text-zinc-400">
                          <ImageIcon className="size-10" />
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <BadgeCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" />
                      <div>
                        <p className="text-sm font-semibold text-emerald-950">
                          Context Score {contextScore}/10
                        </p>
                        <p className="mt-1 text-sm leading-6 text-emerald-900/75">
                          {copy.contextMoat}
                        </p>
                      </div>
                    </div>
                  </section>

                  <div className="grid gap-2">
                    <button
                      className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white shadow-[0_18px_42px_rgba(15,23,42,0.18)] transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-55"
                      disabled={isBusy || !accountAddress}
                      onClick={() => void saveAIStar()}
                      type="button"
                    >
                      {isSaving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      {isSaving ? copy.saving : copy.save}
                    </button>
                    {state.status === "error" ? (
                      <button
                        className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-50"
                        onClick={() => void loadProfile()}
                        type="button"
                      >
                        {copy.retry}
                      </button>
                    ) : null}
                  </div>

                  <Link
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-50"
                    href={setLandingLanguageContext(
                      buildPathWithReferral(`/${locale}/network-feed`, referralCode),
                      landingLanguage,
                    )}
                  >
                    {locale === "ko" ? "콘텐츠 피드에서 확인" : "View in content feed"}
                    <ArrowUpRight className="size-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
