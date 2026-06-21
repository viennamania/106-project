"use client";

import {
  Check,
  Download,
  Loader2,
  Plus,
  Send,
  Shirt,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useActiveAccount } from "thirdweb/react";

import { useMemberSession } from "@/components/member-session-provider";
import type { Locale } from "@/lib/i18n";
import { computeLookbookPointCost } from "@/lib/star-lookbook-pricing";

type LookbookAspectRatio = "auto" | "1:1" | "3:4" | "4:5" | "2:3" | "9:16";

type LookbookImage = {
  url: string;
  pathname: string;
  contentType: string;
  sourceUrl: string | null;
};

type LookbookCopy = {
  title: string;
  subtitle: string;
  starLabel: string;
  starHint: string;
  useMyStar: string;
  uploadStar: string;
  starUrlLabel: string;
  garmentLabel: string;
  garmentHint: string;
  uploadGarment: string;
  dropHint: string;
  garmentUrlLabel: string;
  advanced: string;
  starNameLabel: string;
  starNamePlaceholder: string;
  sceneLabel: string;
  scenePlaceholder: string;
  scenePresetsLabel: string;
  aspectLabel: string;
  countLabel: string;
  previewLabel: string;
  emptyTitle: string;
  emptyBody: string;
  waiting: string;
  submit: string;
  submitting: string;
  download: string;
  remove: string;
  connectRequired: string;
  membersOnly: string;
  needAvatar: string;
  needGarment: string;
  genericError: string;
  uploadError: string;
  noStar: string;
  costLabel: string;
  balanceLabel: string;
  insufficientPoints: string;
  publish: string;
  publishing: string;
  published: string;
  publishError: string;
  viewFeed: string;
};

const COPY: { ko: LookbookCopy; en: LookbookCopy } = {
  ko: {
    title: "AI 스타 룩북 스튜디오",
    subtitle: "옷 사진을 올리면 내 AI 스타가 입은 한국형 쇼핑몰 룩북을 만듭니다.",
    starLabel: "AI 스타",
    starHint: "모델로 쓸 AI 스타를 고르세요. 얼굴·체형 기준이 됩니다.",
    useMyStar: "내 AI 스타 불러오기",
    uploadStar: "이미지 업로드",
    starUrlLabel: "AI 스타 이미지 URL",
    garmentLabel: "옷 사진",
    garmentHint: "재현할 상품/의류 사진. 색·프린트·로고가 그대로 보존됩니다.",
    uploadGarment: "옷 사진 업로드",
    dropHint: "드래그 또는 클릭해 업로드",
    garmentUrlLabel: "옷 사진 URL (한 줄에 하나)",
    advanced: "URL 직접 입력",
    starNameLabel: "스타 이름 (선택)",
    starNamePlaceholder: "예: 윤서",
    sceneLabel: "배경/연출 (선택)",
    scenePlaceholder: "예: 성수동 카페, 자연광, 전신샷",
    scenePresetsLabel: "빠른 배경",
    aspectLabel: "비율",
    countLabel: "생성 장수",
    previewLabel: "미리보기",
    emptyTitle: "여기에 룩북이 표시됩니다",
    emptyBody: "스타와 옷을 고른 뒤 룩북을 생성하세요.",
    waiting: "생성 대기",
    submit: "룩북 생성",
    submitting: "생성 중…",
    download: "저장",
    remove: "삭제",
    connectRequired: "지갑을 연결하면 룩북을 생성할 수 있습니다.",
    membersOnly: "가입을 완료한 회원만 사용할 수 있습니다.",
    needAvatar: "AI 스타를 선택하거나 이미지를 올리세요.",
    needGarment: "옷 사진을 최소 1장 올리세요.",
    genericError: "룩북 생성에 실패했습니다.",
    uploadError: "이미지 업로드에 실패했습니다.",
    noStar: "등록된 AI 스타 이미지가 없습니다.",
    costLabel: "필요 포인트",
    balanceLabel: "보유 포인트",
    insufficientPoints: "포인트가 부족합니다.",
    publish: "AI 스타 피드에 게시",
    publishing: "게시 중…",
    published: "피드에 게시됨",
    publishError: "게시에 실패했습니다.",
    viewFeed: "피드 보기",
  },
  en: {
    title: "AI Star Lookbook Studio",
    subtitle:
      "Upload a garment photo and your AI star wears it in a Korean fashion lookbook.",
    starLabel: "AI star",
    starHint: "Pick the AI star used as the model — it anchors face & body.",
    useMyStar: "Load my AI star",
    uploadStar: "Upload image",
    starUrlLabel: "AI star image URL",
    garmentLabel: "Garment photos",
    garmentHint: "Product photos to reproduce. Color, print and logos are preserved.",
    uploadGarment: "Upload garment",
    dropHint: "Drag or click to upload",
    garmentUrlLabel: "Garment image URLs (one per line)",
    advanced: "Enter URL manually",
    starNameLabel: "Star name (optional)",
    starNamePlaceholder: "e.g. Yunseo",
    sceneLabel: "Scene / styling (optional)",
    scenePlaceholder: "e.g. Seongsu-dong cafe, natural light, full body",
    scenePresetsLabel: "Quick scenes",
    aspectLabel: "Aspect",
    countLabel: "Images",
    previewLabel: "Preview",
    emptyTitle: "Your lookbook appears here",
    emptyBody: "Pick a star and garment, then generate.",
    waiting: "Waiting",
    submit: "Generate lookbook",
    submitting: "Generating…",
    download: "Save",
    remove: "Remove",
    connectRequired: "Connect your wallet to generate a lookbook.",
    membersOnly: "Only completed members can use this studio.",
    needAvatar: "Pick an AI star or upload an image.",
    needGarment: "Add at least one garment photo.",
    genericError: "Failed to generate the lookbook.",
    uploadError: "Failed to upload the image.",
    noStar: "No AI star image found.",
    costLabel: "Cost",
    balanceLabel: "Your points",
    insufficientPoints: "Not enough points.",
    publish: "Publish to AI star feed",
    publishing: "Publishing…",
    published: "Published to feed",
    publishError: "Failed to publish.",
    viewFeed: "View feed",
  },
};

type ScenePreset = { id: string; ko: string; en: string; brief: string };

const SCENE_PRESETS: ScenePreset[] = [
  {
    id: "seongsu-cafe",
    ko: "성수동 카페",
    en: "Seongsu cafe",
    brief:
      "a cozy Seongsu-dong cafe with warm window light, wooden interior, full body",
  },
  {
    id: "hannam-street",
    ko: "한남동 거리",
    en: "Hannam street",
    brief:
      "a stylish Hannam-dong street with soft daylight and an urban Seoul backdrop, full body",
  },
  {
    id: "minimal-studio",
    ko: "미니멀 스튜디오",
    en: "Minimal studio",
    brief:
      "a clean minimal studio with a neutral seamless backdrop and soft even lighting, full body",
  },
  {
    id: "han-river",
    ko: "한강 공원",
    en: "Han River park",
    brief:
      "a Han River park with natural daylight and greenery, relaxed outdoor mood, full body",
  },
  {
    id: "city-night",
    ko: "도심 야경",
    en: "City night",
    brief:
      "a Seoul city street at night with soft bokeh neon lights, cinematic mood, full body",
  },
  {
    id: "white-home",
    ko: "화이트 홈",
    en: "White home",
    brief:
      "a bright minimalist home interior with natural window light, lifestyle mood, full body",
  },
];

const ASPECT_OPTIONS: LookbookAspectRatio[] = [
  "4:5",
  "3:4",
  "2:3",
  "9:16",
  "1:1",
  "auto",
];
const COUNT_OPTIONS = [1, 2, 3, 4];
const MAX_GARMENTS = 4;

const FIELD_INPUT =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#44f26e]";

export function FanletterLookbookStudioPage({ locale }: { locale: Locale }) {
  const copy = locale === "en" ? COPY.en : COPY.ko;
  const account = useActiveAccount();
  const accountAddress = account?.address ?? null;
  const memberSession = useMemberSession();
  const email = memberSession.email;
  const referralCode = memberSession.member?.referralCode ?? null;

  const [starAvatarUrl, setStarAvatarUrl] = useState("");
  const [starName, setStarName] = useState("");
  const [garmentText, setGarmentText] = useState("");
  const [sceneBrief, setSceneBrief] = useState("");
  const [aspectRatio, setAspectRatio] = useState<LookbookAspectRatio>("4:5");
  const [resolution] = useState<"1K" | "2K" | "4K">("1K");
  const [numImages, setNumImages] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<LookbookImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [spendablePoints, setSpendablePoints] = useState<number | null>(null);
  const [starAvatars, setStarAvatars] = useState<{ url: string; label: string }[]>(
    [],
  );
  const [showStarUrl, setShowStarUrl] = useState(false);
  const [showGarmentUrl, setShowGarmentUrl] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountAddress || !email) {
      setSpendablePoints(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(
          `/api/points/summary?email=${encodeURIComponent(
            email,
          )}&walletAddress=${encodeURIComponent(accountAddress)}`,
        );
        const data = (await response.json().catch(() => null)) as
          | { summary?: { spendablePoints?: number } }
          | null;

        if (
          !cancelled &&
          response.ok &&
          typeof data?.summary?.spendablePoints === "number"
        ) {
          setSpendablePoints(data.summary.spendablePoints);
        }
      } catch {
        // Balance display is best-effort; the server enforces the charge.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accountAddress, email]);

  const uploadImage = useCallback(
    async (file: File): Promise<string> => {
      const formData = new FormData();
      formData.set("email", email ?? "");
      formData.set("walletAddress", accountAddress ?? "");
      formData.set("file", file);

      const response = await fetch("/api/content/posts/upload", {
        body: formData,
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;

      if (!response.ok || !data?.url) {
        throw new Error(data?.error ?? copy.uploadError);
      }

      return data.url;
    },
    [accountAddress, copy.uploadError, email],
  );

  const garmentImageUrls = useMemo(
    () =>
      garmentText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, MAX_GARMENTS),
    [garmentText],
  );

  const cost = useMemo(() => computeLookbookPointCost(numImages), [numImages]);
  const hasEnoughPoints = spendablePoints === null || spendablePoints >= cost;

  const canSubmit =
    Boolean(accountAddress) &&
    Boolean(referralCode) &&
    Boolean(starAvatarUrl.trim()) &&
    garmentImageUrls.length > 0 &&
    hasEnoughPoints &&
    !isSubmitting &&
    !isUploading;

  const handleGarmentFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }

      setError(null);
      setIsUploading(true);

      try {
        const remaining = MAX_GARMENTS - garmentImageUrls.length;
        const picked = Array.from(files).slice(0, Math.max(0, remaining));
        const uploadedUrls: string[] = [];

        for (const file of picked) {
          uploadedUrls.push(await uploadImage(file));
        }

        if (uploadedUrls.length > 0) {
          setGarmentText((previous) =>
            [previous.trim(), ...uploadedUrls].filter(Boolean).join("\n"),
          );
        }
      } catch (uploadFailure) {
        setError(
          uploadFailure instanceof Error
            ? uploadFailure.message
            : copy.uploadError,
        );
      } finally {
        setIsUploading(false);
      }
    },
    [copy.uploadError, garmentImageUrls.length, uploadImage],
  );

  const removeGarment = useCallback((url: string) => {
    setGarmentText((previous) =>
      previous
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((item) => item !== url)
        .join("\n"),
    );
  }, []);

  const handleStarFile = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }

      setError(null);
      setIsUploading(true);

      try {
        const url = await uploadImage(file);
        setStarAvatarUrl(url);
        setStarAvatars((previous) =>
          previous.some((item) => item.url === url)
            ? previous
            : [...previous, { url, label: String(previous.length + 1) }],
        );
      } catch (uploadFailure) {
        setError(
          uploadFailure instanceof Error
            ? uploadFailure.message
            : copy.uploadError,
        );
      } finally {
        setIsUploading(false);
      }
    },
    [copy.uploadError, uploadImage],
  );

  const handleUseMyStar = useCallback(async () => {
    if (!accountAddress || !email) {
      return;
    }

    setError(null);

    try {
      const response = await fetch(
        `/api/content/profile?email=${encodeURIComponent(
          email,
        )}&walletAddress=${encodeURIComponent(accountAddress)}`,
      );
      const data = (await response.json().catch(() => null)) as {
        profile?: {
          avatarImageUrl?: string | null;
          avatarImageSet?: Array<{ url?: string | null; label?: string | null }> | null;
          displayName?: string | null;
          characterPersona?: { name?: string | null } | null;
        };
        error?: string;
      } | null;

      if (!response.ok || !data?.profile?.avatarImageUrl) {
        setError(data?.error ?? copy.noStar);
        return;
      }

      const primaryUrl = data.profile.avatarImageUrl;
      const candidateUrls = [
        primaryUrl,
        ...(data.profile.avatarImageSet ?? []).map((item) => item.url ?? ""),
      ].filter(Boolean) as string[];
      const uniqueUrls = Array.from(new Set(candidateUrls));

      setStarAvatars(
        uniqueUrls.map((url, index) => ({ url, label: `${index + 1}` })),
      );
      setStarAvatarUrl(primaryUrl);
      const resolvedName =
        data.profile.characterPersona?.name ?? data.profile.displayName ?? "";

      if (resolvedName) {
        setStarName(resolvedName);
      }
    } catch (loadFailure) {
      setError(
        loadFailure instanceof Error ? loadFailure.message : copy.genericError,
      );
    }
  }, [accountAddress, copy.genericError, copy.noStar, email]);

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (!starAvatarUrl.trim()) {
      setError(copy.needAvatar);
      return;
    }

    if (garmentImageUrls.length === 0) {
      setError(copy.needGarment);
      return;
    }

    setIsSubmitting(true);
    setImages([]);
    setPublished(false);
    setPublishError(null);

    try {
      const response = await fetch("/api/fanletter/lookbook", {
        body: JSON.stringify({
          aspectRatio,
          email,
          garmentImageUrls,
          numImages,
          resolution,
          sceneBrief: sceneBrief.trim() || null,
          starAvatarUrl: starAvatarUrl.trim(),
          starName: starName.trim() || null,
          walletAddress: accountAddress,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      const data = (await response.json().catch(() => null)) as
        | {
            images?: LookbookImage[];
            error?: string;
            summary?: { spendablePoints?: number };
          }
        | null;

      if (!response.ok || !data?.images) {
        setError(data?.error ?? copy.genericError);
        return;
      }

      setImages(data.images);

      if (typeof data.summary?.spendablePoints === "number") {
        setSpendablePoints(data.summary.spendablePoints);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : copy.genericError,
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    accountAddress,
    aspectRatio,
    copy.genericError,
    copy.needAvatar,
    copy.needGarment,
    email,
    garmentImageUrls,
    numImages,
    resolution,
    sceneBrief,
    starAvatarUrl,
    starName,
  ]);

  const handlePublish = useCallback(async () => {
    if (images.length === 0 || !accountAddress || !email) {
      return;
    }

    setPublishError(null);
    setIsPublishing(true);

    try {
      const preset = SCENE_PRESETS.find((item) => item.brief === sceneBrief);
      const sceneLabel = preset
        ? locale === "en"
          ? preset.en
          : preset.ko
        : "";
      const name =
        starName.trim() || (locale === "en" ? "My AI star" : "내 AI 스타");
      const title = (
        locale === "en" ? `${name}'s lookbook` : `${name} 룩북`
      ).slice(0, 100);
      const body = (
        locale === "en"
          ? `A new lookbook from ${name}${sceneLabel ? ` · ${sceneLabel}` : ""}.`
          : `${name}의 새 룩북이에요${sceneLabel ? ` · ${sceneLabel}` : ""}.`
      ).slice(0, 400);

      const response = await fetch("/api/content/posts", {
        body: JSON.stringify({
          contentImageUrls: images.map((image) => image.url),
          contentMaturityRating: "general",
          coverImageUrl: images[0]?.url,
          email,
          locale,
          priceType: "free",
          status: "published",
          summary: title,
          title,
          body,
          walletAddress: accountAddress,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setPublishError(data?.error ?? copy.publishError);
        return;
      }

      setPublished(true);
    } catch (publishFailure) {
      setPublishError(
        publishFailure instanceof Error
          ? publishFailure.message
          : copy.publishError,
      );
    } finally {
      setIsPublishing(false);
    }
  }, [
    accountAddress,
    copy.publishError,
    email,
    images,
    locale,
    sceneBrief,
    starName,
  ]);

  const gate = !accountAddress
    ? copy.connectRequired
    : !referralCode
      ? copy.membersOnly
      : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-[#16702e]">
            <Sparkles className="h-4 w-4" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              FanLetter Studio
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">
            {copy.title}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-neutral-500">
            {copy.subtitle}
          </p>
        </div>
        {spendablePoints !== null ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-bold text-neutral-600">
            <span className="h-2 w-2 rounded-full bg-[#44f26e]" />
            {copy.balanceLabel} {spendablePoints.toLocaleString()}P
          </span>
        ) : null}
      </header>

      {gate ? (
        <p className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          {gate}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Controls */}
        <div className="space-y-5 rounded-2xl border border-black/10 bg-white/80 p-5 shadow-[0_18px_42px_rgba(8,18,12,0.05)]">
          {/* Star */}
          <section>
            <SectionLabel hint={copy.starHint}>{copy.starLabel}</SectionLabel>
            <div className="flex flex-wrap items-center gap-2.5">
              {starAvatars.map((avatar) => {
                const active = starAvatarUrl === avatar.url;

                return (
                  <button
                    className={`h-14 w-14 overflow-hidden rounded-full transition ${
                      active
                        ? "ring-2 ring-[#44f26e] ring-offset-2"
                        : "ring-1 ring-black/10 hover:ring-black/25"
                    }`}
                    key={avatar.url}
                    onClick={() => setStarAvatarUrl(avatar.url)}
                    type="button"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={`AI star ${avatar.label}`}
                      className="h-full w-full object-cover"
                      src={avatar.url}
                    />
                  </button>
                );
              })}
              <label className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-dashed border-black/20 text-neutral-400 transition hover:border-[#44f26e] hover:text-[#16702e]">
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
                <input
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={!accountAddress || isUploading}
                  onChange={(event) => {
                    void handleStarFile(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                  type="file"
                />
              </label>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs font-bold">
              <button
                className="text-[#16702e] disabled:opacity-40"
                disabled={!accountAddress || !email}
                onClick={handleUseMyStar}
                type="button"
              >
                {copy.useMyStar}
              </button>
              <button
                className="text-neutral-400 hover:text-neutral-600"
                onClick={() => setShowStarUrl((value) => !value)}
                type="button"
              >
                {copy.advanced}
              </button>
            </div>
            {showStarUrl ? (
              <input
                className={`${FIELD_INPUT} mt-2`}
                inputMode="url"
                onChange={(event) => setStarAvatarUrl(event.target.value)}
                placeholder="https://…/star.png"
                type="url"
                value={starAvatarUrl}
              />
            ) : null}
          </section>

          {/* Garment */}
          <section>
            <SectionLabel hint={copy.garmentHint}>{copy.garmentLabel}</SectionLabel>
            <div className="flex flex-wrap gap-2.5">
              {garmentImageUrls.map((url) => (
                <div
                  className="relative h-20 w-16 overflow-hidden rounded-xl border border-black/10 bg-neutral-50"
                  key={url}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="garment"
                    className="h-full w-full object-cover"
                    src={url}
                  />
                  <button
                    aria-label={copy.remove}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-neutral-600 shadow-sm"
                    onClick={() => removeGarment(url)}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {garmentImageUrls.length < MAX_GARMENTS ? (
                <label className="flex h-20 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-black/20 text-neutral-400 transition hover:border-[#44f26e] hover:text-[#16702e]">
                  {isUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                  <span className="px-2 text-center text-[11px] font-bold">
                    {copy.dropHint}
                  </span>
                  <input
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={!accountAddress || isUploading}
                    multiple
                    onChange={(event) => {
                      void handleGarmentFiles(event.target.files);
                      event.target.value = "";
                    }}
                    type="file"
                  />
                </label>
              ) : null}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <button
                className="font-bold text-neutral-400 hover:text-neutral-600"
                onClick={() => setShowGarmentUrl((value) => !value)}
                type="button"
              >
                {copy.advanced}
              </button>
              <span className="text-neutral-400">
                {garmentImageUrls.length}/{MAX_GARMENTS}
              </span>
            </div>
            {showGarmentUrl ? (
              <textarea
                className={`${FIELD_INPUT} mt-2 h-20 resize-y`}
                onChange={(event) => setGarmentText(event.target.value)}
                placeholder={"https://…/top.jpg\nhttps://…/skirt.jpg"}
                value={garmentText}
              />
            ) : null}
          </section>

          {/* Star name */}
          <section>
            <SectionLabel>{copy.starNameLabel}</SectionLabel>
            <input
              className={FIELD_INPUT}
              onChange={(event) => setStarName(event.target.value)}
              placeholder={copy.starNamePlaceholder}
              type="text"
              value={starName}
            />
          </section>

          {/* Scene */}
          <section>
            <SectionLabel>{copy.sceneLabel}</SectionLabel>
            <input
              className={FIELD_INPUT}
              onChange={(event) => setSceneBrief(event.target.value)}
              placeholder={copy.scenePlaceholder}
              type="text"
              value={sceneBrief}
            />
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {SCENE_PRESETS.map((preset) => {
                const active = sceneBrief === preset.brief;

                return (
                  <button
                    className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
                      active
                        ? "bg-[#44f26e] text-[#07100b]"
                        : "border border-black/10 bg-white text-neutral-600 hover:border-black/25"
                    }`}
                    key={preset.id}
                    onClick={() => setSceneBrief(active ? "" : preset.brief)}
                    type="button"
                  >
                    {locale === "en" ? preset.en : preset.ko}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Aspect + count */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <SectionLabel>{copy.aspectLabel}</SectionLabel>
              <select
                className={FIELD_INPUT}
                onChange={(event) =>
                  setAspectRatio(event.target.value as LookbookAspectRatio)
                }
                value={aspectRatio}
              >
                {ASPECT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <SectionLabel>{copy.countLabel}</SectionLabel>
              <select
                className={FIELD_INPUT}
                onChange={(event) => setNumImages(Number(event.target.value))}
                value={numImages}
              >
                {COUNT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-black/10 bg-white/80 p-5 shadow-[0_18px_42px_rgba(8,18,12,0.05)]">
            <SectionLabel>{copy.previewLabel}</SectionLabel>
            {isSubmitting ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: numImages }).map((_, index) => (
                  <div
                    className="flex aspect-[4/5] animate-pulse items-center justify-center rounded-xl bg-neutral-100"
                    key={index}
                  >
                    <Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
                  </div>
                ))}
              </div>
            ) : images.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {images.map((image) => (
                  <figure
                    className="overflow-hidden rounded-xl border border-black/10 bg-neutral-50"
                    key={image.pathname}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt="AI star lookbook"
                      className="aspect-[4/5] w-full object-cover"
                      src={image.url}
                    />
                    <figcaption className="p-2">
                      <a
                        className="flex items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-2 py-1.5 text-xs font-bold text-white"
                        download
                        href={image.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <Download className="h-3.5 w-3.5" />
                        {copy.download}
                      </a>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="flex aspect-[4/5] max-h-80 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 text-center">
                <Shirt className="h-8 w-8 text-neutral-300" />
                <p className="text-sm font-bold text-neutral-500">
                  {copy.emptyTitle}
                </p>
                <p className="px-6 text-xs text-neutral-400">{copy.emptyBody}</p>
              </div>
            )}

            {images.length > 0 && !isSubmitting ? (
              <div className="mt-3">
                {published ? (
                  <div className="flex items-center justify-between rounded-xl border border-[#44f26e]/50 bg-[#f1fdf3] px-3 py-2.5">
                    <span className="flex items-center gap-1.5 text-sm font-bold text-[#16702e]">
                      <Check className="h-4 w-4" />
                      {copy.published}
                    </span>
                    <a
                      className="text-xs font-bold text-[#16702e] underline"
                      href={`/${locale}/fanletter/feed`}
                    >
                      {copy.viewFeed}
                    </a>
                  </div>
                ) : (
                  <>
                    <button
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#44f26e] px-4 py-2.5 text-sm font-extrabold text-[#07100b] transition hover:brightness-95 disabled:opacity-50"
                      disabled={isPublishing}
                      onClick={handlePublish}
                      type="button"
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {copy.publishing}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          {copy.publish}
                        </>
                      )}
                    </button>
                    {publishError ? (
                      <p className="mt-2 text-xs font-semibold text-rose-600">
                        {publishError}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Generate bar */}
      <div className="mt-5 space-y-3">
        {!hasEnoughPoints ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-600">
            {copy.insufficientPoints}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-600">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 bg-white/80 px-4 py-3 shadow-[0_18px_42px_rgba(8,18,12,0.05)]">
          <div className="text-sm text-neutral-500">
            {copy.costLabel}{" "}
            <span className="font-bold text-neutral-900">
              {cost.toLocaleString()}P
            </span>
            <span className="text-neutral-400"> · {numImages}장</span>
          </div>
          <div className="flex-1" />
          <button
            className="flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-7 py-3 text-sm font-extrabold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canSubmit}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {copy.submitting}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {copy.submit}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-2">
      <span className="block text-xs font-bold text-neutral-700">{children}</span>
      {hint ? (
        <span className="mt-0.5 block text-[11px] text-neutral-400">{hint}</span>
      ) : null}
    </div>
  );
}
