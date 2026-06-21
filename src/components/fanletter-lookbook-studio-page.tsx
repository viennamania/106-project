"use client";

import { Download, Loader2, Sparkles } from "lucide-react";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useActiveAccount } from "thirdweb/react";

import { useMemberSession } from "@/components/member-session-provider";
import type { Locale } from "@/lib/i18n";

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
  },
};

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
  const [resolution, setResolution] = useState<LookbookResolution>("2K");
  const [numImages, setNumImages] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<LookbookImage[]>([]);

  const garmentImageUrls = useMemo(
    () =>
      garmentText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, MAX_GARMENTS),
    [garmentText],
  );

  const canSubmit =
    Boolean(accountAddress) &&
    Boolean(referralCode) &&
    !isSubmitting;

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
        | { images?: LookbookImage[]; error?: string }
        | null;

      if (!response.ok || !data?.images) {
        setError(data?.error ?? copy.genericError);
        return;
      }

      setImages(data.images);
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
        </Field>

        <Field label={copy.sceneLabel}>
          <input
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
            onChange={(event) => setSceneBrief(event.target.value)}
            placeholder={copy.scenePlaceholder}
            type="text"
            value={sceneBrief}
          />
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
