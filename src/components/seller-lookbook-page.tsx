"use client";

import {
  Coins,
  Download,
  Layers,
  Loader2,
  Send,
  Shirt,
  Sparkles,
  Upload,
  Video,
  X,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Locale } from "@/lib/i18n";
import {
  isLookbookBlobUrl,
  LOOKBOOK_VIDEO_CREDITS,
} from "@/lib/star-lookbook-pricing";

type AspectRatio = "4:5" | "3:4" | "2:3" | "9:16" | "1:1" | "auto";
type LookbookImage = { url: string; pathname: string; contentType: string };
type CreditPack = { id: string; credits: number; priceKrw: number; label: string };
type Workspace = { workspaceId: string; workspaceKey: string };
type SellerStar = {
  id: string;
  name: string;
  images: string[];
  allowFeedPublish?: boolean;
};
type SellerGeneration = {
  generationId: string;
  starId: string;
  garmentImageUrls?: string[];
  imageUrls: string[];
  createdAt: string;
};
type BatchJobStatus = "queued" | "processing" | "done" | "failed" | "error";
type BatchJob = {
  productUrl: string;
  jobId: string | null;
  status: BatchJobStatus;
  imageUrls: string[];
};

const STORAGE_KEY = "fanletter_seller_lookbook";
const ASPECT_OPTIONS: AspectRatio[] = ["4:5", "3:4", "2:3", "9:16", "1:1", "auto"];
const COUNT_OPTIONS = [1, 2, 3, 4];
const MAX_GARMENTS = 4;
const BATCH_MAX = 8;

const SCENE_PRESETS = [
  { ko: "성수동 카페", en: "Seongsu cafe", brief: "a cozy Seongsu-dong cafe with warm window light, wooden interior, full body" },
  { ko: "한남동 거리", en: "Hannam street", brief: "a stylish Hannam-dong street with soft daylight, urban Seoul backdrop, full body" },
  { ko: "미니멀 스튜디오", en: "Minimal studio", brief: "a clean minimal studio with a neutral seamless backdrop and soft even lighting, full body" },
  { ko: "한강 공원", en: "Han River park", brief: "a Han River park with natural daylight and greenery, relaxed outdoor mood, full body" },
  { ko: "화이트 홈", en: "White home", brief: "a bright minimalist home interior with natural window light, lifestyle mood, full body" },
];

const FIELD =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-[#44f26e]";

// Video requires a FAL_KEY with reference-to-video access + an accessible model.
// Operator enables it via NEXT_PUBLIC_SELLER_VIDEO_ENABLED=1 once configured.
const VIDEO_ENABLED = process.env.NEXT_PUBLIC_SELLER_VIDEO_ENABLED === "1";

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
  const [brokenStarIds, setBrokenStarIds] = useState<Set<string>>(new Set());
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [garmentText, setGarmentText] = useState("");
  const [sceneBrief, setSceneBrief] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:5");
  const [numImages, setNumImages] = useState(4);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobStage, setJobStage] = useState<"queued" | "processing" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<LookbookImage[]>([]);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [history, setHistory] = useState<SellerGeneration[]>([]);
  const [videos, setVideos] = useState<Record<string, string>>({});
  const [videoBusyUrl, setVideoBusyUrl] = useState<string | null>(null);
  const [publishedImages, setPublishedImages] = useState<Set<string>>(new Set());
  const [publishBusyUrl, setPublishBusyUrl] = useState<string | null>(null);
  const [batchProducts, setBatchProducts] = useState<string[]>([]);
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  const loadHistory = useCallback(async (ws: Workspace) => {
    try {
      const res = await fetch(
        `/api/seller/lookbook/history?workspaceId=${encodeURIComponent(
          ws.workspaceId,
        )}&workspaceKey=${encodeURIComponent(ws.workspaceKey)}`,
      );
      const data = (await res.json().catch(() => null)) as
        | { generations?: SellerGeneration[] }
        | null;
      if (res.ok && Array.isArray(data?.generations)) {
        setHistory(data.generations);
      }
    } catch {
      // best-effort
    }
  }, []);

  useEffect(() => {
    if (workspace) {
      void loadHistory(workspace);
    }
  }, [workspace, loadHistory]);

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
  const displayStars = stars.filter((star) => !brokenStarIds.has(star.id));
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

  useEffect(() => {
    if (selectedStarId) return;
    const first = stars.find((star) => !brokenStarIds.has(star.id));
    if (first) {
      setSelectedStarId(first.id);
      setSelectedImageIndex(0);
    }
  }, [brokenStarIds, selectedStarId, stars]);

  const markStarBroken = useCallback((id: string) => {
    setBrokenStarIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setSelectedStarId((cur) => (cur === id ? null : cur));
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
      // Snapshot synchronously: the file <input> resets value="" right after
      // calling us, which empties the FileList before this async code (which
      // awaits ensureWorkspace first) reads it — silently dropping the upload.
      const fileArray = files ? Array.from(files) : [];
      if (fileArray.length === 0) return;
      setError(null);
      setIsUploading(true);
      try {
        const ws = await ensureWorkspace();
        const remaining = MAX_GARMENTS - garmentImageUrls.length;
        const picked = fileArray.slice(0, Math.max(0, remaining));
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

  // Pasted external image URLs can't be used directly (they don't preview and
  // are blocked server-side as SSRF). Import them into our Blob store so they
  // become first-class uploads. Triggered when the URL field loses focus.
  const importExternalGarmentUrls = useCallback(async () => {
    const lines = garmentText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const external = lines.filter(
      (url) => /^https?:\/\//i.test(url) && !isLookbookBlobUrl(url),
    );
    if (external.length === 0) return;

    setError(null);
    setIsUploading(true);
    try {
      const ws = await ensureWorkspace();
      const replacements = new Map<string, string>();
      for (const url of external) {
        const res = await fetch("/api/seller/import-url", {
          body: JSON.stringify({
            url,
            workspaceId: ws.workspaceId,
            workspaceKey: ws.workspaceKey,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const data = (await res.json().catch(() => null)) as
          | { url?: string; error?: string }
          | null;
        if (!res.ok || !data?.url) {
          throw new Error(
            data?.error ??
              (en
                ? "Couldn't fetch that image URL. Upload the file instead."
                : "이 URL에서 이미지를 가져오지 못했습니다. 파일을 직접 업로드해 주세요."),
          );
        }
        replacements.set(url, data.url);
      }
      setGarmentText((prev) =>
        prev
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((url) => replacements.get(url) ?? url)
          .join("\n"),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "이미지를 가져오지 못했습니다.");
    } finally {
      setIsUploading(false);
    }
  }, [en, ensureWorkspace, garmentText]);

  const refreshBalance = useCallback(async (ws: Workspace) => {
    try {
      const res = await fetch(
        `/api/seller/workspace?workspaceId=${encodeURIComponent(
          ws.workspaceId,
        )}&workspaceKey=${encodeURIComponent(ws.workspaceKey)}`,
      );
      const data = (await res.json().catch(() => null)) as
        | { workspace?: { creditBalance?: number } }
        | null;
      if (res.ok && typeof data?.workspace?.creditBalance === "number") {
        setCreditBalance(data.workspace.creditBalance);
      }
    } catch {
      // best-effort
    }
  }, []);

  type PolledJob = {
    status: "queued" | "processing" | "done" | "failed" | "canceled";
    error: string | null;
    result: { imageUrls?: string[] } | null;
  };
  type PollOutcome =
    | { kind: "final"; job: PolledJob }
    | { kind: "stalled" }
    | { kind: "timeout" };

  // Poll the async job. If it never reaches "processing" within ~27s the
  // Railway worker is likely down/busy, so we report "stalled" and the caller
  // falls back to the synchronous path. Otherwise poll to completion (~5 min).
  const pollJob = useCallback(
    async (ws: Workspace, jobId: string): Promise<PollOutcome> => {
      let everProcessing = false;
      for (let i = 0; i < 100; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const res = await fetch(
          `/api/seller/lookbook/job?workspaceId=${encodeURIComponent(
            ws.workspaceId,
          )}&workspaceKey=${encodeURIComponent(
            ws.workspaceKey,
          )}&jobId=${encodeURIComponent(jobId)}`,
        );
        const data = (await res.json().catch(() => null)) as
          | { job?: PolledJob }
          | null;
        const job = data?.job;
        if (!job) continue;
        if (job.status === "processing") {
          everProcessing = true;
          setJobStage("processing");
          continue;
        }
        if (job.status === "queued") {
          setJobStage("queued");
          if (!everProcessing && i >= 8) return { kind: "stalled" };
          continue;
        }
        return { job, kind: "final" };
      }
      return { kind: "timeout" };
    },
    [],
  );

  // Synchronous fallback (runs the generation on the request itself). Used when
  // the Railway worker is not draining the queue, so the product keeps working
  // even if the worker is down.
  const runSyncFallback = useCallback(
    async (ws: Workspace): Promise<boolean> => {
      setJobStage("processing");
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
        return false;
      }
      setImages(data.images);
      if (typeof data.creditBalance === "number") {
        setCreditBalance(data.creditBalance);
      }
      void loadHistory(ws);
      return true;
    },
    [
      aspectRatio,
      en,
      garmentImageUrls,
      loadHistory,
      numImages,
      sceneBrief,
      selectedImageIndex,
      selectedStarId,
    ],
  );

  // Async path: enqueue a job (charges credits) and poll while the Railway
  // worker runs the heavy generation off the request. If the worker is not
  // draining, cancel+refund the queued job and fall back to the sync path so
  // the product keeps working. Credits are auto-refunded if a job fails.
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
    setJobStage("queued");
    setImages([]);
    try {
      const ws = await ensureWorkspace();
      const res = await fetch("/api/seller/lookbook/job", {
        body: JSON.stringify({
          aspectRatio,
          garmentImageUrls,
          numImages,
          sceneBrief: sceneBrief.trim() || null,
          starId: selectedStarId,
          starImageIndex: selectedImageIndex,
          type: "image",
          workspaceId: ws.workspaceId,
          workspaceKey: ws.workspaceKey,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as
        | { creditBalance?: number; job?: { jobId?: string }; error?: string }
        | null;
      if (!res.ok || !data?.job?.jobId) {
        setError(data?.error ?? (en ? "Generation failed." : "생성에 실패했습니다."));
        return;
      }
      const jobId = data.job.jobId;
      if (typeof data.creditBalance === "number") {
        setCreditBalance(data.creditBalance);
      }

      let outcome = await pollJob(ws, jobId);
      while (outcome.kind === "stalled") {
        // Worker not draining — cancel+refund if still queued, then fall back.
        const cancelRes = await fetch(
          `/api/seller/lookbook/job?workspaceId=${encodeURIComponent(
            ws.workspaceId,
          )}&workspaceKey=${encodeURIComponent(
            ws.workspaceKey,
          )}&jobId=${encodeURIComponent(jobId)}`,
          { method: "DELETE" },
        );
        const cancelData = (await cancelRes.json().catch(() => null)) as
          | { canceled?: boolean }
          | null;
        if (cancelData?.canceled) {
          await runSyncFallback(ws);
          return;
        }
        // The worker claimed it just now; resume polling to completion.
        outcome = await pollJob(ws, jobId);
      }

      if (outcome.kind === "timeout") {
        setError(
          en
            ? "Still processing — check 'My lookbooks' in a moment."
            : "생성이 지연되고 있습니다. 잠시 후 '내 룩북'에서 확인해 주세요.",
        );
        return;
      }

      const job = outcome.job;
      if (job.status === "failed" || job.status === "canceled") {
        setError(
          job.error ?? (en ? "Generation failed." : "생성에 실패했습니다."),
        );
        await refreshBalance(ws); // credits were auto-refunded
        return;
      }
      const urls = job.result?.imageUrls ?? [];
      setImages(
        urls.map((url) => ({ contentType: "image/png", pathname: url, url })),
      );
      void loadHistory(ws);
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setIsSubmitting(false);
      setJobStage(null);
    }
  }, [
    aspectRatio,
    en,
    ensureWorkspace,
    garmentImageUrls,
    loadHistory,
    numImages,
    pollJob,
    refreshBalance,
    runSyncFallback,
    sceneBrief,
    selectedImageIndex,
    selectedStarId,
  ]);

  const makeVideo = useCallback(
    async (imageUrl: string) => {
      setError(null);
      setVideoBusyUrl(imageUrl);
      try {
        const ws = await ensureWorkspace();
        const res = await fetch("/api/seller/lookbook/video", {
          body: JSON.stringify({
            imageUrl,
            sceneBrief: sceneBrief.trim() || null,
            workspaceId: ws.workspaceId,
            workspaceKey: ws.workspaceKey,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const data = (await res.json().catch(() => null)) as
          | { video?: { url?: string }; error?: string; creditBalance?: number }
          | null;
        if (!res.ok || !data?.video?.url) {
          setError(data?.error ?? (en ? "Video failed." : "영상 생성 실패"));
          return;
        }
        const videoUrl = data.video.url;
        setVideos((prev) => ({ ...prev, [imageUrl]: videoUrl }));
        if (typeof data.creditBalance === "number") {
          setCreditBalance(data.creditBalance);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "영상 실패");
      } finally {
        setVideoBusyUrl(null);
      }
    },
    [en, ensureWorkspace, sceneBrief],
  );

  // Publish a result to the (opted-in) AI star's feed with seller/ad attribution.
  const publishToFeed = useCallback(
    async (imageUrl: string) => {
      if (!selectedStarId) return;
      setError(null);
      setPublishBusyUrl(imageUrl);
      try {
        const ws = await ensureWorkspace();
        const res = await fetch("/api/seller/lookbook/publish", {
          body: JSON.stringify({
            imageUrl,
            starId: selectedStarId,
            starName: selectedStar?.name ?? null,
            workspaceId: ws.workspaceId,
            workspaceKey: ws.workspaceKey,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; error?: string }
          | null;
        if (!res.ok || !data?.ok) {
          setError(
            data?.error ?? (en ? "Failed to publish." : "피드 게시에 실패했습니다."),
          );
          return;
        }
        setPublishedImages((prev) => new Set(prev).add(imageUrl));
      } catch (e) {
        setError(e instanceof Error ? e.message : "피드 게시 실패");
      } finally {
        setPublishBusyUrl(null);
      }
    },
    [en, ensureWorkspace, selectedStar?.name, selectedStarId],
  );

  const handleBatchFiles = useCallback(
    async (files: FileList | null) => {
      // Snapshot before any await — the <input> resets value="" right after,
      // emptying the FileList (see handleGarmentFiles).
      const fileArray = files ? Array.from(files) : [];
      if (fileArray.length === 0) return;
      setError(null);
      setIsBatchUploading(true);
      try {
        const ws = await ensureWorkspace();
        const remaining = BATCH_MAX - batchProducts.length;
        const picked = fileArray.slice(0, Math.max(0, remaining));
        const urls: string[] = [];
        for (const file of picked) urls.push(await uploadImage(file, ws));
        if (urls.length > 0) {
          setBatchProducts((prev) => [...prev, ...urls].slice(0, BATCH_MAX));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "업로드 실패");
      } finally {
        setIsBatchUploading(false);
      }
    },
    [batchProducts.length, ensureWorkspace, uploadImage],
  );

  const removeBatchProduct = useCallback((url: string) => {
    setBatchProducts((prev) => prev.filter((u) => u !== url));
  }, []);

  // Batch: one job per product (1 hero cut each), enqueued together and polled
  // in parallel while the Railway worker drains them. Jobs that outlast the
  // poll window still finish server-side and appear in "My lookbooks".
  const runBatch = useCallback(async () => {
    setError(null);
    if (!selectedStarId) {
      setError(en ? "Pick an AI star." : "AI 스타를 선택하세요.");
      return;
    }
    if (batchProducts.length === 0) {
      setError(en ? "Add product photos." : "상품 사진을 올리세요.");
      return;
    }
    setIsBatchRunning(true);
    setBatchJobs(
      batchProducts.map((url) => ({
        imageUrls: [],
        jobId: null,
        productUrl: url,
        status: "queued",
      })),
    );
    try {
      const ws = await ensureWorkspace();
      const enqueued = await Promise.all(
        batchProducts.map(async (url) => {
          try {
            const res = await fetch("/api/seller/lookbook/job", {
              body: JSON.stringify({
                aspectRatio,
                garmentImageUrls: [url],
                numImages: 1,
                sceneBrief: sceneBrief.trim() || null,
                starId: selectedStarId,
                starImageIndex: selectedImageIndex,
                type: "image",
                workspaceId: ws.workspaceId,
                workspaceKey: ws.workspaceKey,
              }),
              headers: { "Content-Type": "application/json" },
              method: "POST",
            });
            const data = (await res.json().catch(() => null)) as
              | { creditBalance?: number; job?: { jobId?: string } }
              | null;
            if (res.ok && typeof data?.creditBalance === "number") {
              setCreditBalance(data.creditBalance);
            }
            return { jobId: data?.job?.jobId ?? null, url };
          } catch {
            return { jobId: null, url };
          }
        }),
      );

      setBatchJobs((prev) =>
        prev.map((job) => {
          const match = enqueued.find((e) => e.url === job.productUrl);
          return match?.jobId
            ? { ...job, jobId: match.jobId }
            : { ...job, status: "error" };
        }),
      );

      const pending = new Map(
        enqueued
          .filter((e): e is { jobId: string; url: string } => Boolean(e.jobId))
          .map((e) => [e.jobId, e.url]),
      );

      for (let i = 0; i < 160 && pending.size > 0; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await Promise.all(
          [...pending.entries()].map(async ([jobId, url]) => {
            const res = await fetch(
              `/api/seller/lookbook/job?workspaceId=${encodeURIComponent(
                ws.workspaceId,
              )}&workspaceKey=${encodeURIComponent(
                ws.workspaceKey,
              )}&jobId=${encodeURIComponent(jobId)}`,
            );
            const data = (await res.json().catch(() => null)) as
              | {
                  job?: {
                    status?: BatchJobStatus;
                    result?: { imageUrls?: string[] } | null;
                  };
                }
              | null;
            const job = data?.job;
            if (!job?.status) return;
            if (job.status === "queued" || job.status === "processing") {
              setBatchJobs((prev) =>
                prev.map((b) =>
                  b.productUrl === url ? { ...b, status: job.status! } : b,
                ),
              );
              return;
            }
            pending.delete(jobId);
            setBatchJobs((prev) =>
              prev.map((b) =>
                b.productUrl === url
                  ? {
                      ...b,
                      imageUrls: job.result?.imageUrls ?? [],
                      status: job.status!,
                    }
                  : b,
              ),
            );
          }),
        );
      }
      await refreshBalance(ws);
      void loadHistory(ws);
    } catch (e) {
      setError(e instanceof Error ? e.message : "배치 생성 실패");
    } finally {
      setIsBatchRunning(false);
    }
  }, [
    aspectRatio,
    batchProducts,
    en,
    ensureWorkspace,
    loadHistory,
    refreshBalance,
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

  // Export the seller's whole lookbook catalog (single + batch results) as a
  // CSV they can bulk-import into their shop. BOM so Excel reads Korean UTF-8.
  const exportHistoryCsv = useCallback(() => {
    if (history.length === 0) return;
    const rows: string[][] = [["createdAt", "generationId", "starId", "imageUrl"]];
    for (const gen of history) {
      for (const url of gen.imageUrls) {
        rows.push([gen.createdAt, gen.generationId, gen.starId, url]);
      }
    }
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`﻿${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = `lookbooks-${new Date().toISOString().slice(0, 10)}.csv`;
    a.href = href;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  }, [history]);

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

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            desc: en
              ? "Drag in your product photos — color, print and logos are kept."
              : "상품 사진을 올리세요. 색·프린트·로고가 그대로 보존됩니다.",
            icon: Upload,
            step: "1",
            title: en ? "Upload garments" : "옷 사진 업로드",
          },
          {
            desc: en
              ? "The model is always a consented fanletter AI star — no real people."
              : "모델은 항상 동의된 fanletter AI 스타입니다. 실제 인물 아님.",
            icon: Sparkles,
            step: "2",
            title: en ? "Pick an AI star" : "AI 스타·배경 선택",
          },
          {
            desc: en
              ? "Get a Korean shop lookbook set in about a minute, ready to download."
              : "1분 안에 한국형 쇼핑몰 룩북 세트가 나옵니다. 바로 다운로드.",
            icon: Download,
            step: "3",
            title: en ? "Generate & download" : "룩북 생성·다운로드",
          },
        ].map(({ desc, icon: Icon, step, title }) => (
          <div
            className="flex gap-3 rounded-2xl border border-black/10 bg-white/80 p-4 shadow-[0_18px_42px_rgba(8,18,12,0.05)]"
            key={step}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#44f26e]/15 text-[#16702e]">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black text-[#16702e]">
                  STEP {step}
                </span>
              </div>
              <div className="text-sm font-extrabold text-neutral-900">{title}</div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500">
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>

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
            {displayStars.length === 0 ? (
              <p className="text-xs text-neutral-400">
                {en ? "Loading AI stars…" : "AI 스타 불러오는 중…"}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2.5">
                  {displayStars.map((star) => {
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
                          onError={() => markStarBroken(star.id)}
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
                <label
                  className="flex h-20 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-black/20 text-neutral-400 hover:border-[#44f26e] hover:text-[#16702e]"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    void handleGarmentFiles(e.dataTransfer.files);
                  }}
                >
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
              onBlur={() => void importExternalGarmentUrls()}
              onChange={(e) => setGarmentText(e.target.value)}
              placeholder={
                en
                  ? "or paste an image URL (auto-imported)"
                  : "또는 이미지 URL 붙여넣기 (자동으로 가져옵니다)"
              }
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
              <>
                {garmentImageUrls.length > 0 ? (
                  <div className="mb-3 rounded-xl border border-black/10 bg-neutral-50/60 p-2.5">
                    <span className="mb-1.5 block text-[11px] font-bold text-neutral-400">
                      {en
                        ? "Your garment (color/print/logo preserved)"
                        : "원본 옷 (색·프린트·로고 보존)"}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {garmentImageUrls.map((url) => (
                        <span className="block" key={url}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt="garment"
                            className="h-12 w-10 rounded-md border border-black/10 object-cover"
                            src={url}
                          />
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
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
                      {!VIDEO_ENABLED ? null : videos[image.url] ? (
                        <a
                          className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#16702e] px-2 py-1.5 text-xs font-bold text-white"
                          download
                          href={videos[image.url]}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <Video className="h-3.5 w-3.5" />
                          {en ? "Video" : "영상"}
                        </a>
                      ) : (
                        <button
                          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#16702e]/40 px-2 py-1.5 text-xs font-bold text-[#16702e] disabled:opacity-50"
                          disabled={videoBusyUrl !== null}
                          onClick={() => makeVideo(image.url)}
                          type="button"
                        >
                          {videoBusyUrl === image.url ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              {en ? "Making…" : "생성 중…"}
                            </>
                          ) : (
                            <>
                              <Video className="h-3.5 w-3.5" />
                              {en
                                ? `Video · ${LOOKBOOK_VIDEO_CREDITS}cr`
                                : `영상 · ${LOOKBOOK_VIDEO_CREDITS}크레딧`}
                            </>
                          )}
                        </button>
                      )}
                      {selectedStar?.allowFeedPublish ? (
                        publishedImages.has(image.url) ? (
                          <span className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#44f26e]/15 px-2 py-1.5 text-xs font-bold text-[#16702e]">
                            <Send className="h-3.5 w-3.5" />
                            {en ? "Published to feed" : "피드에 게시됨"}
                          </span>
                        ) : (
                          <button
                            className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#16702e]/40 px-2 py-1.5 text-xs font-bold text-[#16702e] disabled:opacity-50"
                            disabled={publishBusyUrl !== null}
                            onClick={() => publishToFeed(image.url)}
                            type="button"
                          >
                            {publishBusyUrl === image.url ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                {en ? "Publishing…" : "게시 중…"}
                              </>
                            ) : (
                              <>
                                <Send className="h-3.5 w-3.5" />
                                {en ? "Post to AI star feed" : "AI 스타 피드에 게시"}
                              </>
                            )}
                          </button>
                        )
                      ) : null}
                    </figcaption>
                  </figure>
                ))}
                </div>
              </>
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
                {jobStage === "queued"
                  ? en
                    ? "Queued…"
                    : "대기 중…"
                  : en
                    ? "Generating…"
                    : "생성 중…"}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {en ? "Generate lookbook" : "룩북 생성"}
              </>
            )}
          </button>
        </div>

        <p className="px-1 text-[11px] leading-relaxed text-neutral-400">
          {en
            ? "Lookbooks you generate are licensed to you for commercial use. The model is always a fanletter AI star. "
            : "생성한 룩북은 회원님이 상업적으로 사용할 수 있습니다. 모델은 항상 fanletter AI 스타입니다. "}
          <a
            className="font-bold text-[#16702e] underline"
            href={`/${locale}/lookbook/terms`}
          >
            {en ? "Terms & license" : "이용약관·라이선스"}
          </a>
        </p>

        <div className="rounded-2xl border border-black/10 bg-white/80 p-5 shadow-[0_18px_42px_rgba(8,18,12,0.05)]">
          <div className="mb-1 flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#16702e]" />
            <span className="text-xs font-bold text-neutral-700">
              {en ? "Batch — many products at once" : "여러 상품 일괄 생성 (배치)"}
            </span>
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-neutral-400">
            {en
              ? "Upload several product photos and get one lookbook shot per product with the selected AI star. 1 credit each."
              : "상품 사진을 여러 장 올리면 선택한 AI 스타로 상품마다 룩북 1컷씩 한 번에 생성됩니다. 상품당 1크레딧."}
          </p>

          <div className="flex flex-wrap gap-2.5">
            {batchProducts.map((url) => (
              <div
                className="relative h-20 w-16 overflow-hidden rounded-xl border border-black/10 bg-neutral-50"
                key={url}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="product" className="h-full w-full object-cover" src={url} />
                {!isBatchRunning ? (
                  <button
                    aria-label="remove"
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-neutral-600"
                    onClick={() => removeBatchProduct(url)}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            ))}
            {batchProducts.length < BATCH_MAX ? (
              <label
                className="flex h-20 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-black/20 text-neutral-400 hover:border-[#44f26e] hover:text-[#16702e]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void handleBatchFiles(e.dataTransfer.files);
                }}
              >
                {isBatchUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
                <span className="px-1 text-center text-[10px] font-bold">
                  {en ? "Add" : "추가"}
                </span>
                <input
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={isBatchUploading || isBatchRunning}
                  multiple
                  onChange={(e) => {
                    void handleBatchFiles(e.target.files);
                    e.target.value = "";
                  }}
                  type="file"
                />
              </label>
            ) : null}
          </div>

          <button
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16702e] px-7 py-3 text-sm font-extrabold text-white transition hover:bg-[#0f5722] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={
              !selectedStarId ||
              batchProducts.length === 0 ||
              isBatchRunning ||
              isBatchUploading
            }
            onClick={runBatch}
            type="button"
          >
            {isBatchRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {en ? "Generating batch…" : "일괄 생성 중…"}
              </>
            ) : (
              <>
                <Layers className="h-4 w-4" />
                {en
                  ? `Generate ${batchProducts.length} products · ${batchProducts.length} credits`
                  : `${batchProducts.length}개 상품 생성 · ${batchProducts.length}크레딧`}
              </>
            )}
          </button>

          {batchJobs.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {batchJobs.map((job) => (
                <div
                  className="overflow-hidden rounded-xl border border-black/10 bg-neutral-50"
                  key={job.productUrl}
                >
                  <div className="relative aspect-[4/5]">
                    {job.status === "done" && job.imageUrls[0] ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt="lookbook"
                          className="h-full w-full object-cover"
                          src={job.imageUrls[0]}
                        />
                        <a
                          className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900/85 text-white"
                          download
                          href={job.imageUrls[0]}
                          rel="noreferrer"
                          target="_blank"
                          title={en ? "Save" : "저장"}
                        >
                          <Download className="h-3 w-3" />
                        </a>
                      </>
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt="product"
                          className="h-full w-full object-cover opacity-30"
                          src={job.productUrl}
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-neutral-500">
                          {job.status === "failed" || job.status === "error" ? (
                            <span className="text-rose-500">
                              {en ? "Failed" : "실패"}
                            </span>
                          ) : (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                              <span>
                                {job.status === "processing"
                                  ? en
                                    ? "Making…"
                                    : "생성 중…"
                                  : en
                                    ? "Queued…"
                                    : "대기 중…"}
                              </span>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/80 p-5 shadow-[0_18px_42px_rgba(8,18,12,0.05)]">
          <span className="mb-3 block text-xs font-bold text-neutral-700">
            {en ? "FAQ" : "자주 묻는 질문"}
          </span>
          <div className="space-y-2">
            {[
              {
                a: en
                  ? "Yes — a worldwide, perpetual, non-exclusive commercial license to use them in your shop."
                  : "네. 회원님 쇼핑몰에 쓸 수 있는 전세계·영구·비독점 상업 라이선스가 부여됩니다.",
                q: en
                  ? "Can I use the lookbooks for my store?"
                  : "생성한 룩북을 제 쇼핑몰에 써도 되나요?",
              },
              {
                a: en
                  ? "Always a consented fanletter AI star — never a real person. You cannot upload your own model."
                  : "항상 동의된 fanletter AI 스타입니다. 실제 인물이 아니며, 셀러가 임의 모델을 올릴 수 없습니다.",
                q: en ? "Who is the model?" : "모델은 누구인가요?",
              },
              {
                a: en
                  ? "Yes — free trial credits to start, no sign-up or crypto wallet required. 1 credit per shot."
                  : "네. 가입·지갑 없이 무료 체험 크레딧으로 바로 시작할 수 있습니다. 컷당 1크레딧.",
                q: en ? "Can I try it for free?" : "무료로 써볼 수 있나요?",
              },
              {
                a: en
                  ? "The garment's color, print and logos are preserved; only the model and scene are AI-generated."
                  : "옷의 색·프린트·로고는 보존하고, 모델과 배경만 AI로 생성합니다.",
                q: en
                  ? "Are my garment details preserved?"
                  : "옷 디테일이 보존되나요?",
              },
            ].map((item) => (
              <details
                className="group rounded-xl border border-black/10 bg-white px-3.5 py-2.5"
                key={item.q}
              >
                <summary className="cursor-pointer list-none text-sm font-bold text-neutral-800 marker:hidden">
                  {item.q}
                </summary>
                <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-500">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
          <a
            className="mt-3 inline-block text-[11px] font-bold text-[#16702e] underline"
            href={`/${locale}/lookbook/terms`}
          >
            {en ? "Full terms & license" : "전체 이용약관·라이선스 보기"}
          </a>
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

        {history.length > 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white/80 p-5 shadow-[0_18px_42px_rgba(8,18,12,0.05)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-neutral-700">
                {en ? "My lookbooks" : "내 룩북"}
              </span>
              <button
                className="flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-[11px] font-bold text-neutral-600 transition hover:border-[#44f26e] hover:text-[#16702e]"
                onClick={exportHistoryCsv}
                type="button"
              >
                <Download className="h-3 w-3" />
                {en ? "Export CSV" : "CSV 내보내기"}
              </button>
            </div>
            <div className="space-y-4">
              {history.map((gen) => (
                <div key={gen.generationId}>
                  <div className="mb-1.5 text-[11px] text-neutral-400">
                    {new Date(gen.createdAt).toLocaleString()}
                  </div>
                  {gen.garmentImageUrls && gen.garmentImageUrls.length > 0 ? (
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-neutral-400">
                        {en ? "Garment" : "원본"}
                      </span>
                      {gen.garmentImageUrls.map((url) => (
                        <span className="block" key={url}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt="garment"
                            className="h-10 w-8 rounded border border-black/10 object-cover"
                            src={url}
                          />
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {gen.imageUrls.map((url, index) => (
                      <a
                        className="block h-24 w-[4.8rem] overflow-hidden rounded-lg border border-black/10 bg-neutral-50"
                        download
                        href={url}
                        key={url}
                        rel="noreferrer"
                        target="_blank"
                        title={en ? "Download" : "다운로드"}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={`lookbook ${index + 1}`}
                          className="h-full w-full object-cover"
                          src={url}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
    <div className="block">
      <span className="mb-1.5 block text-xs font-bold text-neutral-700">{label}</span>
      {hint ? <span className="mb-1.5 block text-[11px] text-neutral-400">{hint}</span> : null}
      {children}
    </div>
  );
}
