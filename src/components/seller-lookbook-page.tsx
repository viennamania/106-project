"use client";

import { Coins, Download, Loader2, Shirt, Sparkles, Upload, X } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Locale } from "@/lib/i18n";

type AspectRatio = "4:5" | "3:4" | "2:3" | "9:16" | "1:1" | "auto";
type LookbookImage = { url: string; pathname: string; contentType: string };
type CreditPack = { id: string; credits: number; priceKrw: number; label: string };
type Workspace = { workspaceId: string; workspaceKey: string };
type SellerStar = { id: string; name: string; images: string[] };

const STORAGE_KEY = "fanletter_seller_lookbook";
const ASPECT_OPTIONS: AspectRatio[] = ["4:5", "3:4", "2:3", "9:16", "1:1", "auto"];
const COUNT_OPTIONS = [1, 2, 3, 4];
const MAX_GARMENTS = 4;

const SCENE_PRESETS = [
  { ko: "성수동 카페", en: "Seongsu cafe", brief: "a cozy Seongsu-dong cafe with warm window light, wooden interior, full body" },
  { ko: "한남동 거리", en: "Hannam street", brief: "a stylish Hannam-dong street with soft daylight, urban Seoul backdrop, full body" },
  { ko: "미니멀 스튜디오", en: "Minimal studio", brief: "a clean minimal studio with a neutral seamless backdrop and soft even lighting, full body" },
  { ko: "한강 공원", en: "Han River park", brief: "a Han River park with natural daylight and greenery, relaxed outdoor mood, full body" },
  { ko: "화이트 홈", en: "White home", brief: "a bright minimalist home interior with natural window light, lifestyle mood, full body" },
];

const FIELD =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#44f26e]";

function readWorkspace(): Workspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Workspace>;
    return parsed.workspaceId && parsed.workspaceKey
      ? { workspaceId: parsed.workspaceId, workspaceKey: parsed.workspaceKey }
      : null;
  } catch {
    return null;
  }
}

export function SellerLookbookPage({ locale }: { locale: Locale }) {
  const en = locale === "en";

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [email, setEmail] = useState("");
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [stars, setStars] = useState<SellerStar[]>([]);
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [garmentText, setGarmentText] = useState("");
  const [sceneBrief, setSceneBrief] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:5");
  const [numImages, setNumImages] = useState(4);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<LookbookImage[]>([]);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  const garmentImageUrls = useMemo(
    () =>
      garmentText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, MAX_GARMENTS),
    [garmentText],
  );
  const cost = numImages;
  const selectedStar = stars.find((star) => star.id === selectedStarId) ?? null;

  useEffect(() => {
    const existing = readWorkspace();
    if (!existing) return;
    setWorkspace(existing);

    void (async () => {
      try {
        const res = await fetch(
          `/api/seller/workspace?workspaceId=${encodeURIComponent(
            existing.workspaceId,
          )}&workspaceKey=${encodeURIComponent(existing.workspaceKey)}`,
        );
        const data = (await res.json().catch(() => null)) as
          | { workspace?: { creditBalance?: number; email?: string } }
          | null;
        if (res.ok && typeof data?.workspace?.creditBalance === "number") {
          setCreditBalance(data.workspace.creditBalance);
          if (data.workspace.email) setEmail(data.workspace.email);
        }
      } catch {
        // best-effort
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/seller/credits/checkout");
        const data = (await res.json().catch(() => null)) as
          | { packs?: CreditPack[] }
          | null;
        if (res.ok && Array.isArray(data?.packs)) setPacks(data.packs);
      } catch {
        // best-effort
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/seller/stars");
        const data = (await res.json().catch(() => null)) as
          | { stars?: SellerStar[] }
          | null;
        if (res.ok && Array.isArray(data?.stars)) {
          setStars(data.stars);
          if (data.stars[0]) {
            setSelectedStarId(data.stars[0].id);
            setSelectedImageIndex(0);
          }
        }
      } catch {
        // best-effort
      }
    })();
  }, []);

  const ensureWorkspace = useCallback(async (): Promise<Workspace> => {
    if (workspace) return workspace;

    const res = await fetch("/api/seller/workspace", {
      body: JSON.stringify({ email: email.trim() || null }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const data = (await res.json().catch(() => null)) as
      | {
          workspace?: { workspaceId?: string; creditBalance?: number };
          workspaceKey?: string;
        }
      | null;

    if (!res.ok || !data?.workspace?.workspaceId || !data.workspaceKey) {
      throw new Error(data ? "워크스페이스 생성 실패" : "워크스페이스 생성 실패");
    }

    const created: Workspace = {
      workspaceId: data.workspace.workspaceId,
      workspaceKey: data.workspaceKey,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
    setWorkspace(created);
    if (typeof data.workspace.creditBalance === "number") {
      setCreditBalance(data.workspace.creditBalance);
    }
    return created;
  }, [email, workspace]);

  const uploadImage = useCallback(
    async (file: File, ws: Workspace): Promise<string> => {
      const formData = new FormData();
      formData.set("workspaceId", ws.workspaceId);
      formData.set("workspaceKey", ws.workspaceKey);
      formData.set("file", file);
      const res = await fetch("/api/seller/upload", {
        body: formData,
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;
      if (!res.ok || !data?.url) {
        throw new Error(data?.error ?? "이미지 업로드 실패");
      }
      return data.url;
    },
    [],
  );

  const handleGarmentFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setError(null);
      setIsUploading(true);
      try {
        const ws = await ensureWorkspace();
        const remaining = MAX_GARMENTS - garmentImageUrls.length;
        const picked = Array.from(files).slice(0, Math.max(0, remaining));
        const urls: string[] = [];
        for (const file of picked) urls.push(await uploadImage(file, ws));
        if (urls.length > 0) {
          setGarmentText((prev) => [prev.trim(), ...urls].filter(Boolean).join("\n"));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "업로드 실패");
      } finally {
        setIsUploading(false);
      }
    },
    [ensureWorkspace, garmentImageUrls.length, uploadImage],
  );

  const removeGarment = useCallback((url: string) => {
    setGarmentText((prev) =>
      prev
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .filter((u) => u !== url)
        .join("\n"),
    );
  }, []);

  const handleGenerate = useCallback(async () => {
    setError(null);
    if (!selectedStarId) {
      setError(en ? "Pick an AI star." : "AI 스타를 선택하세요.");
      return;
    }
    if (garmentImageUrls.length === 0) {
      setError(en ? "Add a garment photo." : "옷 사진을 올리세요.");
      return;
    }
    setIsSubmitting(true);
    setImages([]);
    try {
      const ws = await ensureWorkspace();
      const res = await fetch("/api/seller/lookbook", {
        body: JSON.stringify({
          aspectRatio,
          garmentImageUrls,
          numImages,
          sceneBrief: sceneBrief.trim() || null,
          starId: selectedStarId,
          starImageIndex: selectedImageIndex,
          workspaceId: ws.workspaceId,
          workspaceKey: ws.workspaceKey,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as
        | { images?: LookbookImage[]; error?: string; creditBalance?: number }
        | null;
      if (!res.ok || !data?.images) {
        setError(data?.error ?? (en ? "Generation failed." : "생성에 실패했습니다."));
        return;
      }
      setImages(data.images);
      if (typeof data.creditBalance === "number") setCreditBalance(data.creditBalance);
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    aspectRatio,
    en,
    ensureWorkspace,
    garmentImageUrls,
    numImages,
    sceneBrief,
    selectedImageIndex,
    selectedStarId,
  ]);

  const buyCredits = useCallback(
    async (packId: string) => {
      setCheckoutNotice(null);
      try {
        const ws = await ensureWorkspace();
        const res = await fetch("/api/seller/credits/checkout", {
          body: JSON.stringify({
            packId,
            workspaceId: ws.workspaceId,
            workspaceKey: ws.workspaceKey,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const data = (await res.json().catch(() => null)) as
          | { checkout?: { status?: string; message?: string } }
          | null;
        if (data?.checkout?.status === "not_configured") {
          setCheckoutNotice(
            data.checkout.message ??
              "결제 연동 준비 중입니다. 무료 체험 크레딧을 이용해 주세요.",
          );
        } else {
          setCheckoutNotice(
            en ? "Payment is being prepared." : "결제 준비됨 (PG 연동 필요).",
          );
        }
      } catch (e) {
        setCheckoutNotice(e instanceof Error ? e.message : "체크아웃 실패");
      }
    },
    [en, ensureWorkspace],
  );

  const canSubmit =
    Boolean(selectedStarId) &&
    garmentImageUrls.length > 0 &&
    !isSubmitting &&
    !isUploading;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-[#16702e]">
            <Sparkles className="h-4 w-4" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              Lookbook Studio
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900">
            {en ? "AI Lookbook Studio for sellers" : "셀러를 위한 AI 룩북 스튜디오"}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-neutral-500">
            {en
              ? "Upload a garment photo and get a Korean fashion lookbook set in a minute. No app, no crypto — just credits."
              : "옷 사진만 올리면 1분 만에 한국형 쇼핑몰 룩북 세트가 나옵니다. 앱·크립토 없이 크레딧으로 바로."}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-bold text-neutral-600">
          <Coins className="h-3.5 w-3.5 text-[#16702e]" />
          {creditBalance === null
            ? en
              ? "Free trial ready"
              : "무료 체험"
            : `${en ? "Credits" : "크레딧"} ${creditBalance.toLocaleString()}`}
        </span>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5 rounded-2xl border border-black/10 bg-white/80 p-5 shadow-[0_18px_42px_rgba(8,18,12,0.05)]">
          <Field
            label={en ? "AI star (model)" : "AI 스타 (모델)"}
            hint={
              en
                ? "The model is always a fanletter AI star."
                : "모델은 항상 fanletter AI 스타입니다."
            }
          >
            {stars.length === 0 ? (
              <p className="text-xs text-neutral-400">
                {en ? "Loading AI stars…" : "AI 스타 불러오는 중…"}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2.5">
                  {stars.map((star) => {
                    const active = selectedStarId === star.id;
                    return (
                      <button
                        className={`h-14 w-14 overflow-hidden rounded-full transition ${
                          active
                            ? "ring-2 ring-[#44f26e] ring-offset-2"
                            : "ring-1 ring-black/10 hover:ring-black/25"
                        }`}
                        key={star.id}
                        onClick={() => {
                          setSelectedStarId(star.id);
                          setSelectedImageIndex(0);
                        }}
                        title={star.name}
                        type="button"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={star.name}
                          className="h-full w-full object-cover"
                          src={star.images[0]}
                        />
                      </button>
                    );
                  })}
                </div>
                {selectedStar && selectedStar.images.length > 1 ? (
                  <div className="mt-2.5">
                    <span className="mb-1.5 block text-[11px] font-bold text-neutral-400">
                      {en ? "Pick a pose" : "포즈 선택"}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedStar.images.map((url, index) => {
                        const active = selectedImageIndex === index;
                        return (
                          <button
                            className={`h-16 w-12 overflow-hidden rounded-lg border-2 transition ${
                              active ? "border-[#44f26e]" : "border-transparent"
                            }`}
                            key={url}
                            onClick={() => setSelectedImageIndex(index)}
                            type="button"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              alt={`${selectedStar.name} ${index + 1}`}
                              className="h-full w-full object-cover"
                              src={url}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </Field>

          <Field label={en ? "Garment photos" : "옷 사진"} hint={en ? "Color, print and logos are preserved." : "색·프린트·로고가 그대로 보존됩니다."}>
            <div className="flex flex-wrap gap-2.5">
              {garmentImageUrls.map((url) => (
                <div className="relative h-20 w-16 overflow-hidden rounded-xl border border-black/10 bg-neutral-50" key={url}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="garment" className="h-full w-full object-cover" src={url} />
                  <button
                    aria-label="remove"
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-neutral-600"
                    onClick={() => removeGarment(url)}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {garmentImageUrls.length < MAX_GARMENTS ? (
                <label className="flex h-20 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-black/20 text-neutral-400 hover:border-[#44f26e] hover:text-[#16702e]">
                  {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                  <span className="px-2 text-center text-[11px] font-bold">
                    {en ? "Drag or click to upload" : "드래그 또는 클릭해 업로드"}
                  </span>
                  <input
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={isUploading}
                    multiple
                    onChange={(e) => {
                      void handleGarmentFiles(e.target.files);
                      e.target.value = "";
                    }}
                    type="file"
                  />
                </label>
              ) : null}
            </div>
            <textarea
              className={`${FIELD} mt-2 h-16 resize-y`}
              onChange={(e) => setGarmentText(e.target.value)}
              placeholder={"https://…/top.jpg"}
              value={garmentText}
            />
          </Field>

          <Field label={en ? "Scene (optional)" : "배경/연출 (선택)"}>
            <input
              className={FIELD}
              onChange={(e) => setSceneBrief(e.target.value)}
              placeholder={en ? "e.g. Seongsu cafe, natural light" : "예: 성수동 카페, 자연광, 전신샷"}
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
                    key={preset.ko}
                    onClick={() => setSceneBrief(active ? "" : preset.brief)}
                    type="button"
                  >
                    {en ? preset.en : preset.ko}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={en ? "Aspect" : "비율"}>
              <select className={FIELD} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} value={aspectRatio}>
                {ASPECT_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field label={en ? "Shots" : "룩북 컷 수"}>
              <select className={FIELD} onChange={(e) => setNumImages(Number(e.target.value))} value={numImages}>
                {COUNT_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </Field>
          </div>
          <p className="text-[11px] leading-relaxed text-neutral-400">
            {en
              ? "Front · 3/4 · detail · lifestyle shots, same model & garment. 1 credit / shot."
              : "정면 · 3/4 · 디테일 · 착석 컷이 같은 모델·같은 옷으로 자동 구성됩니다. 컷당 1크레딧."}
          </p>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-black/10 bg-white/80 p-5 shadow-[0_18px_42px_rgba(8,18,12,0.05)]">
            <span className="mb-2 block text-xs font-bold text-neutral-700">
              {en ? "Preview" : "미리보기"}
            </span>
            {isSubmitting ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: numImages }).map((_, i) => (
                  <div className="flex aspect-[4/5] animate-pulse items-center justify-center rounded-xl bg-neutral-100" key={i}>
                    <Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
                  </div>
                ))}
              </div>
            ) : images.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {images.map((image) => (
                  <figure className="overflow-hidden rounded-xl border border-black/10 bg-neutral-50" key={image.pathname}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="lookbook" className="aspect-[4/5] w-full object-cover" src={image.url} />
                    <figcaption className="p-2">
                      <a className="flex items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-2 py-1.5 text-xs font-bold text-white" download href={image.url} rel="noreferrer" target="_blank">
                        <Download className="h-3.5 w-3.5" />
                        {en ? "Save" : "저장"}
                      </a>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="flex aspect-[4/5] max-h-80 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-black/15 text-center">
                <Shirt className="h-8 w-8 text-neutral-300" />
                <p className="text-sm font-bold text-neutral-500">
                  {en ? "Your lookbook appears here" : "여기에 룩북이 표시됩니다"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-600">{error}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 bg-white/80 px-4 py-3 shadow-[0_18px_42px_rgba(8,18,12,0.05)]">
          <div className="text-sm text-neutral-500">
            {en ? "Cost" : "필요 크레딧"}{" "}
            <span className="font-bold text-neutral-900">{cost}</span>
            <span className="text-neutral-400"> · {numImages}{en ? " shots" : "컷"}</span>
          </div>
          <div className="flex-1" />
          <button
            className="flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-7 py-3 text-sm font-extrabold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canSubmit}
            onClick={handleGenerate}
            type="button"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {en ? "Generating…" : "생성 중…"}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {en ? "Generate lookbook" : "룩북 생성"}
              </>
            )}
          </button>
        </div>

        {packs.length > 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white/80 p-5 shadow-[0_18px_42px_rgba(8,18,12,0.05)]">
            <span className="mb-3 block text-xs font-bold text-neutral-700">
              {en ? "Buy credits" : "크레딧 충전"}
            </span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {packs.map((pack) => (
                <button
                  className="rounded-xl border border-black/10 bg-white p-4 text-left transition hover:border-[#44f26e]"
                  key={pack.id}
                  onClick={() => buyCredits(pack.id)}
                  type="button"
                >
                  <div className="text-sm font-extrabold text-neutral-900">{pack.label}</div>
                  <div className="mt-1 text-lg font-black text-[#16702e]">
                    {pack.credits.toLocaleString()} <span className="text-xs font-bold text-neutral-400">credits</span>
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-500">₩{pack.priceKrw.toLocaleString()}</div>
                </button>
              ))}
            </div>
            {checkoutNotice ? (
              <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-700">
                {checkoutNotice}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
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
      <span className="mb-1.5 block text-xs font-bold text-neutral-700">{label}</span>
      {hint ? <span className="mb-1.5 block text-[11px] text-neutral-400">{hint}</span> : null}
      {children}
    </label>
  );
}
