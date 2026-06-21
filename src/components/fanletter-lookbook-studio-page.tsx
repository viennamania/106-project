"use client";

import { Download, Loader2, Sparkles } from "lucide-react";
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
type LookbookResolution = "1K" | "2K" | "4K";

type LookbookImage = {
  url: string;
  pathname: string;
  contentType: string;
  sourceUrl: string | null;
};

type LookbookCopy = {
  title: string;
  subtitle: string;
  starAvatarLabel: string;
  starAvatarHint: string;
  starNameLabel: string;
  starNamePlaceholder: string;
  garmentLabel: string;
  garmentHint: string;
  sceneLabel: string;
  scenePlaceholder: string;
  aspectLabel: string;
  resolutionLabel: string;
  countLabel: string;
  submit: string;
  submitting: string;
  resultTitle: string;
  download: string;
  connectRequired: string;
  membersOnly: string;
  needAvatar: string;
  needGarment: string;
  genericError: string;
  uploadImage: string;
  uploadStarImage: string;
  uploading: string;
  uploadError: string;
  useMyStar: string;
  noStar: string;
  costLabel: string;
  balanceLabel: string;
  insufficientPoints: string;
  scenePresetsLabel: string;
  pickStar: string;
};

const COPY: { ko: LookbookCopy; en: LookbookCopy } = {
  ko: {
    title: "AI 스타 룩북 스튜디오",
    subtitle:
      "옷 사진을 올리면 내 AI 스타가 그 옷을 입은 한국형 쇼핑몰 룩북을 만들어 드립니다.",
    starAvatarLabel: "AI 스타 이미지 URL",
    starAvatarHint: "모델로 쓸 AI 스타의 정면 이미지 URL (얼굴/체형 기준이 됩니다).",
    starNameLabel: "스타 이름 (선택)",
    starNamePlaceholder: "예: 윤서",
    garmentLabel: "옷 사진 URL (한 줄에 하나, 최대 4장)",
    garmentHint: "재현할 상품/의류 사진. 색·프린트·로고가 그대로 보존됩니다.",
    sceneLabel: "배경/연출 (선택)",
    scenePlaceholder: "예: 성수동 카페, 자연광, 전신샷",
    aspectLabel: "비율",
    resolutionLabel: "해상도",
    countLabel: "생성 장수",
    submit: "룩북 생성",
    submitting: "생성 중…",
    resultTitle: "생성된 룩북",
    download: "다운로드",
    connectRequired: "지갑을 연결하면 룩북을 생성할 수 있습니다.",
    membersOnly: "가입을 완료한 회원만 사용할 수 있습니다.",
    needAvatar: "AI 스타 이미지 URL을 입력하세요.",
    needGarment: "옷 사진 URL을 최소 1장 입력하세요.",
    genericError: "룩북 생성에 실패했습니다.",
    uploadImage: "옷 사진 업로드",
    uploadStarImage: "스타 이미지 업로드",
    uploading: "업로드 중…",
    uploadError: "이미지 업로드에 실패했습니다.",
    useMyStar: "내 AI 스타 불러오기",
    noStar: "등록된 AI 스타 이미지가 없습니다.",
    costLabel: "필요 포인트",
    balanceLabel: "보유 포인트",
    insufficientPoints: "포인트가 부족합니다.",
    scenePresetsLabel: "빠른 배경",
    pickStar: "스타 선택",
  },
  en: {
    title: "AI Star Lookbook Studio",
    subtitle:
      "Upload a garment photo and your AI star wears it in a Korean fashion e-commerce lookbook.",
    starAvatarLabel: "AI star image URL",
    starAvatarHint:
      "A front-facing image of the AI star used as the model (anchors face & body).",
    starNameLabel: "Star name (optional)",
    starNamePlaceholder: "e.g. Yunseo",
    garmentLabel: "Garment image URLs (one per line, up to 4)",
    garmentHint:
      "Product/clothing photos to reproduce. Color, print and logos are preserved.",
    sceneLabel: "Scene / styling (optional)",
    scenePlaceholder: "e.g. Seongsu-dong cafe, natural light, full body",
    aspectLabel: "Aspect",
    resolutionLabel: "Resolution",
    countLabel: "Images",
    submit: "Generate lookbook",
    submitting: "Generating…",
    resultTitle: "Generated lookbook",
    download: "Download",
    connectRequired: "Connect your wallet to generate a lookbook.",
    membersOnly: "Only completed members can use this studio.",
    needAvatar: "Enter the AI star image URL.",
    needGarment: "Enter at least one garment image URL.",
    genericError: "Failed to generate the lookbook.",
    uploadImage: "Upload garment photos",
    uploadStarImage: "Upload star image",
    uploading: "Uploading…",
    uploadError: "Failed to upload the image.",
    useMyStar: "Use my AI star",
    noStar: "No AI star image found.",
    costLabel: "Cost",
    balanceLabel: "Your points",
    insufficientPoints: "Not enough points.",
    scenePresetsLabel: "Quick scenes",
    pickStar: "Pick a star",
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
const RESOLUTION_OPTIONS: LookbookResolution[] = ["1K", "2K", "4K"];
const COUNT_OPTIONS = [1, 2, 3, 4];
const MAX_GARMENTS = 4;

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
  const [resolution, setResolution] = useState<LookbookResolution>("1K");
  const [numImages, setNumImages] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<LookbookImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [spendablePoints, setSpendablePoints] = useState<number | null>(null);
  const [starAvatars, setStarAvatars] = useState<{ url: string; label: string }[]>(
    [],
  );

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

  const handleStarFile = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }

      setError(null);
      setIsUploading(true);

      try {
        setStarAvatarUrl(await uploadImage(file));
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

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-violet-600">
          <Sparkles className="h-5 w-5" />
          <span className="text-xs font-extrabold uppercase tracking-wide">
            FanLetter Studio
          </span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-neutral-900">
          {copy.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          {copy.subtitle}
        </p>
      </header>

      {!accountAddress ? (
        <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          {copy.connectRequired}
        </p>
      ) : !referralCode ? (
        <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          {copy.membersOnly}
        </p>
      ) : null}

      <div className="space-y-5">
        <Field label={copy.starAvatarLabel} hint={copy.starAvatarHint}>
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
            inputMode="url"
            onChange={(event) => setStarAvatarUrl(event.target.value)}
            placeholder="https://…/star.png"
            type="url"
            value={starAvatarUrl}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-bold text-violet-700 disabled:opacity-40"
              disabled={!accountAddress || !email}
              onClick={handleUseMyStar}
              type="button"
            >
              {copy.useMyStar}
            </button>
            <label className="cursor-pointer rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-bold text-neutral-600">
              {copy.uploadStarImage}
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
          {starAvatars.length > 1 ? (
            <div className="mt-3">
              <span className="mb-1.5 block text-xs font-bold text-neutral-400">
                {copy.pickStar}
              </span>
              <div className="flex flex-wrap gap-2">
                {starAvatars.map((avatar) => {
                  const active = starAvatarUrl === avatar.url;

                  return (
                    <button
                      className={`overflow-hidden rounded-xl border-2 transition ${
                        active ? "border-violet-500" : "border-transparent"
                      }`}
                      key={avatar.url}
                      onClick={() => setStarAvatarUrl(avatar.url)}
                      title={avatar.label}
                      type="button"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={`AI star ${avatar.label}`}
                        className="h-16 w-16 object-cover"
                        src={avatar.url}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </Field>

        <Field label={copy.starNameLabel}>
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
            onChange={(event) => setStarName(event.target.value)}
            placeholder={copy.starNamePlaceholder}
            type="text"
            value={starName}
          />
        </Field>

        <Field label={copy.garmentLabel} hint={copy.garmentHint}>
          <textarea
            className="h-24 w-full resize-y rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
            onChange={(event) => setGarmentText(event.target.value)}
            placeholder={"https://…/top.jpg\nhttps://…/skirt.jpg"}
            value={garmentText}
          />
          <div className="mt-2 flex items-center gap-2">
            <label className="cursor-pointer rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-bold text-neutral-600">
              {copy.uploadImage}
              <input
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={
                  !accountAddress ||
                  isUploading ||
                  garmentImageUrls.length >= MAX_GARMENTS
                }
                multiple
                onChange={(event) => {
                  void handleGarmentFiles(event.target.files);
                  event.target.value = "";
                }}
                type="file"
              />
            </label>
            {isUploading ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-neutral-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {copy.uploading}
              </span>
            ) : (
              <span className="text-xs text-neutral-400">
                {garmentImageUrls.length}/{MAX_GARMENTS}
              </span>
            )}
          </div>
        </Field>

        <Field label={copy.sceneLabel}>
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
            onChange={(event) => setSceneBrief(event.target.value)}
            placeholder={copy.scenePlaceholder}
            type="text"
            value={sceneBrief}
          />
          <div className="mt-2">
            <span className="mb-1.5 block text-xs font-bold text-neutral-400">
              {copy.scenePresetsLabel}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SCENE_PRESETS.map((preset) => {
                const active = sceneBrief === preset.brief;

                return (
                  <button
                    className={`rounded-full border px-2.5 py-1 text-xs font-bold transition ${
                      active
                        ? "border-violet-400 bg-violet-600 text-white"
                        : "border-neutral-200 bg-white text-neutral-600"
                    }`}
                    key={preset.id}
                    onClick={() =>
                      setSceneBrief(active ? "" : preset.brief)
                    }
                    type="button"
                  >
                    {locale === "en" ? preset.en : preset.ko}
                  </button>
                );
              })}
            </div>
          </div>
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label={copy.aspectLabel}>
            <select
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
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
          </Field>
          <Field label={copy.resolutionLabel}>
            <select
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
              onChange={(event) =>
                setResolution(event.target.value as LookbookResolution)
              }
              value={resolution}
            >
              {RESOLUTION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
          <Field label={copy.countLabel}>
            <select
              className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
              onChange={(event) => setNumImages(Number(event.target.value))}
              value={numImages}
            >
              {COUNT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2.5 text-xs font-bold text-neutral-600">
          <span>
            {copy.costLabel}: {cost.toLocaleString()}P
          </span>
          {spendablePoints !== null ? (
            <span className={hasEnoughPoints ? "text-neutral-600" : "text-rose-600"}>
              {copy.balanceLabel}: {spendablePoints.toLocaleString()}P
            </span>
          ) : null}
        </div>

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

        <button
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-3.5 text-sm font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
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

      {images.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-extrabold text-neutral-900">
            {copy.resultTitle}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((image) => (
              <figure
                key={image.pathname}
                className="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50"
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
        </section>
      ) : null}
    </div>
  );
}

function Field({
  children,
  hint,
  label,
}: {
  children: ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-neutral-700">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1 block text-xs text-neutral-400">{hint}</span>
      ) : null}
    </label>
  );
}
