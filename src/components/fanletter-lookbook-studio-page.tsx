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
  setHint: string;
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
    countLabel: "룩북 컷 수",
    setHint: "정면 · 3/4 · 디테일 · 착석 컷이 같은 모델·같은 옷으로 자동 구성됩니다.",
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
    countLabel: "Lookbook shots",
    setHint: "Front · 3/4 · detail · lifestyle shots, same model & garment.",
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
const BATCH_MAX = 8;

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
  const [numImages, setNumImages] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<LookbookImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [spendablePoints, setSpendablePoints] = useState<number | null>(null);
  const [starAvatars, setStarAvatars] = useState<{ url: string; label: string }[]>(
    [],
  );
  const [publicStars, setPublicStars] = useState<
    { id: string; name: string; images: string[] }[]
  >([]);
  const [selectedPublicStarId, setSelectedPublicStarId] = useState<string | null>(
    null,
  );
  const [showStarUrl, setShowStarUrl] = useState(false);
  const [showGarmentUrl, setShowGarmentUrl] = useState(false);
  const [batchProducts, setBatchProducts] = useState<string[]>([]);
  const [batchJobs, setBatchJobs] = useState<
    {
      productUrl: string;
      status: "pending" | "generating" | "done" | "failed";
      imageUrl: string | null;
    }[]
  >([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [history, setHistory] = useState<
    {
      generationId: string;
      starId: string | null;
      starName: string | null;
      garmentImageUrls: string[];
      imageUrls: string[];
      createdAt: string;
    }[]
  >([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [modelOptIn, setModelOptIn] = useState<boolean | null>(null);
  const [feedPublishOptIn, setFeedPublishOptIn] = useState<boolean | null>(null);
  const [royaltyTotal, setRoyaltyTotal] = useState<number | null>(null);
  const [optInBusy, setOptInBusy] = useState(false);
  const [feedOptInBusy, setFeedOptInBusy] = useState(false);
  const [feedRequests, setFeedRequests] = useState<
    {
      publicationId: string;
      contentId: string;
      imageUrl: string;
      productUrl?: string | null;
      shopName?: string | null;
    }[]
  >([]);
  const [feedReqBusy, setFeedReqBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!accountAddress || !email) {
      setModelOptIn(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(
          `/api/fanletter/lookbook/opt-in?email=${encodeURIComponent(
            email,
          )}&walletAddress=${encodeURIComponent(accountAddress)}`,
        );
        const data = (await response.json().catch(() => null)) as
          | { optIn?: boolean; allowFeedPublish?: boolean; royaltyTotal?: number }
          | null;

        if (!cancelled && response.ok && typeof data?.optIn === "boolean") {
          setModelOptIn(data.optIn);
          setFeedPublishOptIn(Boolean(data.allowFeedPublish));
          if (typeof data.royaltyTotal === "number") {
            setRoyaltyTotal(data.royaltyTotal);
          }
        }
      } catch {
        // best-effort
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accountAddress, email]);

  const toggleModelOptIn = useCallback(async () => {
    if (!accountAddress || !email) {
      return;
    }

    setOptInBusy(true);
    const next = !(modelOptIn ?? false);

    try {
      const response = await fetch("/api/fanletter/lookbook/opt-in", {
        body: JSON.stringify({ email, optIn: next, walletAddress: accountAddress }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as
        | { optIn?: boolean }
        | null;

      if (response.ok && typeof data?.optIn === "boolean") {
        setModelOptIn(data.optIn);
      }
    } catch {
      // best-effort
    } finally {
      setOptInBusy(false);
    }
  }, [accountAddress, email, modelOptIn]);

  const toggleFeedPublishOptIn = useCallback(async () => {
    if (!accountAddress || !email) {
      return;
    }

    setFeedOptInBusy(true);
    const next = !(feedPublishOptIn ?? false);

    try {
      const response = await fetch("/api/fanletter/lookbook/opt-in", {
        body: JSON.stringify({
          allowFeedPublish: next,
          email,
          walletAddress: accountAddress,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as
        | { allowFeedPublish?: boolean }
        | null;

      if (response.ok && typeof data?.allowFeedPublish === "boolean") {
        setFeedPublishOptIn(data.allowFeedPublish);
      }
    } catch {
      // best-effort
    } finally {
      setFeedOptInBusy(false);
    }
  }, [accountAddress, email, feedPublishOptIn]);

  useEffect(() => {
    if (!accountAddress || !email || !feedPublishOptIn) {
      setFeedRequests([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(
          `/api/fanletter/lookbook/feed-requests?email=${encodeURIComponent(
            email,
          )}&walletAddress=${encodeURIComponent(accountAddress)}`,
        );
        const data = (await response.json().catch(() => null)) as
          | {
              requests?: {
                publicationId: string;
                contentId: string;
                imageUrl: string;
                productUrl?: string | null;
                shopName?: string | null;
              }[];
            }
          | null;
        if (!cancelled && response.ok && Array.isArray(data?.requests)) {
          setFeedRequests(data.requests);
        }
      } catch {
        // best-effort
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accountAddress, email, feedPublishOptIn]);

  const moderateFeedRequest = useCallback(
    async (contentId: string, action: "approve" | "reject") => {
      if (!accountAddress || !email) {
        return;
      }
      setFeedReqBusy(contentId);
      try {
        const response = await fetch("/api/fanletter/lookbook/feed-requests", {
          body: JSON.stringify({
            action,
            contentId,
            email,
            walletAddress: accountAddress,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        if (response.ok) {
          setFeedRequests((prev) =>
            prev.filter((item) => item.contentId !== contentId),
          );
        }
      } catch {
        // best-effort
      } finally {
        setFeedReqBusy(null);
      }
    },
    [accountAddress, email],
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
        setSelectedPublicStarId(null);
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
      setSelectedPublicStarId(null);
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

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/seller/stars");
        const data = (await res.json().catch(() => null)) as
          | { stars?: { id: string; name: string; images: string[] }[] }
          | null;
        if (res.ok && Array.isArray(data?.stars)) {
          setPublicStars(data.stars);
        }
      } catch {
        // best-effort
      }
    })();
  }, []);

  const loadHistory = useCallback(async () => {
    if (!accountAddress || !email) {
      setHistory([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/fanletter/lookbook/history?email=${encodeURIComponent(
          email,
        )}&walletAddress=${encodeURIComponent(accountAddress)}`,
      );
      const data = (await res.json().catch(() => null)) as
        | { generations?: typeof history }
        | null;
      if (res.ok && Array.isArray(data?.generations)) {
        setHistory(data.generations);
      }
    } catch {
      // best-effort
    }
  }, [accountAddress, email]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

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
          starId: selectedPublicStarId,
          starImageIndex: 0,
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

      void loadHistory();
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
    loadHistory,
    numImages,
    resolution,
    sceneBrief,
    selectedPublicStarId,
    starAvatarUrl,
    starName,
  ]);

  const handleBatchFiles = useCallback(
    async (files: FileList | null) => {
      // Snapshot before the <input> resets value="" (empties the FileList).
      const fileArray = files ? Array.from(files) : [];
      if (fileArray.length === 0) return;
      setError(null);
      setIsBatchUploading(true);
      try {
        const remaining = BATCH_MAX - batchProducts.length;
        const picked = fileArray.slice(0, Math.max(0, remaining));
        const urls: string[] = [];
        for (const file of picked) urls.push(await uploadImage(file));
        if (urls.length > 0) {
          setBatchProducts((prev) => [...prev, ...urls].slice(0, BATCH_MAX));
        }
      } catch (uploadFailure) {
        setError(
          uploadFailure instanceof Error
            ? uploadFailure.message
            : copy.uploadError,
        );
      } finally {
        setIsBatchUploading(false);
      }
    },
    [batchProducts.length, copy.uploadError, uploadImage],
  );

  const removeBatchProduct = useCallback((url: string) => {
    setBatchProducts((prev) => prev.filter((item) => item !== url));
  }, []);

  // Batch: one lookbook (1 cut) per product, generated sequentially with the
  // selected star — each charges points via the member route.
  const runBatch = useCallback(async () => {
    setError(null);
    if (!accountAddress || !email || !starAvatarUrl.trim()) {
      setError(copy.needAvatar);
      return;
    }
    if (batchProducts.length === 0) {
      setError(locale === "en" ? "Add product photos." : "상품 사진을 올리세요.");
      return;
    }
    setIsBatchRunning(true);
    setBatchJobs(
      batchProducts.map((url) => ({
        imageUrl: null,
        productUrl: url,
        status: "pending",
      })),
    );
    try {
      for (const productUrl of batchProducts) {
        setBatchJobs((prev) =>
          prev.map((job) =>
            job.productUrl === productUrl
              ? { ...job, status: "generating" }
              : job,
          ),
        );
        try {
          const res = await fetch("/api/fanletter/lookbook", {
            body: JSON.stringify({
              aspectRatio,
              email,
              garmentImageUrls: [productUrl],
              numImages: 1,
              resolution,
              sceneBrief: sceneBrief.trim() || null,
              starAvatarUrl: starAvatarUrl.trim(),
              starId: selectedPublicStarId,
              starImageIndex: 0,
              starName: starName.trim() || null,
              walletAddress: accountAddress,
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
          });
          const data = (await res.json().catch(() => null)) as
            | {
                images?: LookbookImage[];
                summary?: { spendablePoints?: number };
              }
            | null;
          if (!res.ok || !data?.images?.[0]) {
            setBatchJobs((prev) =>
              prev.map((job) =>
                job.productUrl === productUrl
                  ? { ...job, status: "failed" }
                  : job,
              ),
            );
            if (res.status === 402) {
              setError(
                locale === "en"
                  ? "Not enough points."
                  : "포인트가 부족합니다.",
              );
              break;
            }
            continue;
          }
          if (typeof data.summary?.spendablePoints === "number") {
            setSpendablePoints(data.summary.spendablePoints);
          }
          setBatchJobs((prev) =>
            prev.map((job) =>
              job.productUrl === productUrl
                ? { ...job, imageUrl: data.images![0].url, status: "done" }
                : job,
            ),
          );
        } catch {
          setBatchJobs((prev) =>
            prev.map((job) =>
              job.productUrl === productUrl
                ? { ...job, status: "failed" }
                : job,
            ),
          );
        }
      }
    } finally {
      setIsBatchRunning(false);
      void loadHistory();
    }
  }, [
    accountAddress,
    aspectRatio,
    batchProducts,
    copy.needAvatar,
    email,
    loadHistory,
    locale,
    resolution,
    sceneBrief,
    selectedPublicStarId,
    starAvatarUrl,
    starName,
  ]);

  // Export the member's whole lookbook catalog (single + batch) as a CSV they
  // can bulk-import into a shop. BOM so Excel reads Korean UTF-8.
  const exportHistoryCsv = useCallback(() => {
    if (history.length === 0) return;
    const rows: string[][] = [
      ["createdAt", "generationId", "starId", "starName", "imageUrl"],
    ];
    for (const gen of history) {
      for (const url of gen.imageUrls) {
        rows.push([
          gen.createdAt,
          gen.generationId,
          gen.starId ?? "",
          gen.starName ?? "",
          url,
        ]);
      }
    }
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`﻿${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.download = `lookbooks-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.href = href;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  }, [history]);

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

      {!accountAddress ? (
        <div className="mb-6 space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                desc:
                  locale === "en"
                    ? "Drag in your product photos — color, print and logos are kept."
                    : "상품 사진을 올리세요. 색·프린트·로고가 그대로 보존됩니다.",
                icon: Upload,
                step: "1",
                title: locale === "en" ? "Upload garments" : "옷 사진 업로드",
              },
              {
                desc:
                  locale === "en"
                    ? "The model is always a fanletter AI star — no real people."
                    : "모델은 항상 fanletter AI 스타입니다. 실제 인물 아님.",
                icon: Sparkles,
                step: "2",
                title: locale === "en" ? "Pick an AI star" : "AI 스타·배경 선택",
              },
              {
                desc:
                  locale === "en"
                    ? "Get a Korean shop lookbook in about a minute, ready to download."
                    : "1분 안에 한국형 쇼핑몰 룩북이 나옵니다. 바로 다운로드.",
                icon: Download,
                step: "3",
                title:
                  locale === "en" ? "Generate & download" : "룩북 생성·다운로드",
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
                  <span className="text-[10px] font-black text-[#16702e]">
                    STEP {step}
                  </span>
                  <div className="text-sm font-extrabold text-neutral-900">
                    {title}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-black/10 bg-white/80 p-5 shadow-[0_18px_42px_rgba(8,18,12,0.05)]">
            <span className="mb-3 block text-xs font-bold text-neutral-700">
              {locale === "en" ? "FAQ" : "자주 묻는 질문"}
            </span>
            <div className="space-y-2">
              {[
                {
                  a:
                    locale === "en"
                      ? "Yes — a worldwide, perpetual, non-exclusive commercial license to use them in your shop."
                      : "네. 회원님 쇼핑몰에 쓸 수 있는 전세계·영구·비독점 상업 라이선스가 부여됩니다.",
                  q:
                    locale === "en"
                      ? "Can I use the lookbooks for my store?"
                      : "생성한 룩북을 제 쇼핑몰에 써도 되나요?",
                },
                {
                  a:
                    locale === "en"
                      ? "Always a fanletter AI star — never a real person. You cannot upload your own model."
                      : "항상 fanletter AI 스타입니다. 실제 인물이 아니며, 임의 모델을 올릴 수 없습니다.",
                  q: locale === "en" ? "Who is the model?" : "모델은 누구인가요?",
                },
                {
                  a:
                    locale === "en"
                      ? "Connect your fanletter member wallet, then generate with points — 50P per shot."
                      : "fanletter 멤버(지갑)로 연결한 뒤 포인트로 생성합니다. 컷당 50P.",
                  q:
                    locale === "en"
                      ? "How do I start and what does it cost?"
                      : "어떻게 시작하고 비용은 얼마인가요?",
                },
                {
                  a:
                    locale === "en"
                      ? "The garment's color, print and logos are preserved; only the model and scene are AI-generated."
                      : "옷의 색·프린트·로고는 보존하고, 모델과 배경만 AI로 생성합니다.",
                  q:
                    locale === "en"
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
              {locale === "en"
                ? "Full terms & license"
                : "전체 이용약관·라이선스 보기"}
            </a>
          </div>
        </div>
      ) : null}

      {accountAddress && referralCode ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/80 px-4 py-3.5 shadow-[0_18px_42px_rgba(8,18,12,0.05)]">
          <div>
            <p className="text-sm font-extrabold text-neutral-900">
              {locale === "en"
                ? "Offer my AI star as a seller model"
                : "내 AI 스타를 셀러 룩북 모델로 제공"}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {locale === "en"
                ? "Sellers can dress my star in their products; I earn royalty points per shot. On by default — turn off to opt out."
                : "셀러가 내 스타에 옷을 입혀 룩북을 만들 수 있고, 사용될 때마다 로열티 포인트를 받습니다. 기본 제공이며, 끄면 제외됩니다."}
            </p>
            {royaltyTotal && royaltyTotal > 0 ? (
              <p className="mt-1 text-xs font-bold text-[#16702e]">
                {locale === "en"
                  ? `Model royalties earned: ${royaltyTotal.toLocaleString()}P`
                  : `지금까지 모델 수익: ${royaltyTotal.toLocaleString()}P`}
              </p>
            ) : null}
          </div>
          <button
            aria-pressed={Boolean(modelOptIn)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
              modelOptIn ? "bg-[#44f26e]" : "bg-neutral-300"
            }`}
            disabled={optInBusy || modelOptIn === null}
            onClick={toggleModelOptIn}
            type="button"
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                modelOptIn ? "left-[1.375rem]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      ) : null}

      {accountAddress && referralCode && modelOptIn ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/80 px-4 py-3.5 shadow-[0_18px_42px_rgba(8,18,12,0.05)]">
          <div>
            <p className="text-sm font-extrabold text-neutral-900">
              {locale === "en"
                ? "Allow seller lookbooks on my feed"
                : "셀러 룩북을 내 피드에 게시 허용"}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {locale === "en"
                ? "Sellers can publish lookbooks of my star to my feed, clearly labeled as sponsored (ad)."
                : "허용하면 셀러가 내 스타로 만든 룩북을 내 피드에 '[광고]' 표시로 게시할 수 있습니다."}
            </p>
          </div>
          <button
            aria-pressed={Boolean(feedPublishOptIn)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
              feedPublishOptIn ? "bg-[#44f26e]" : "bg-neutral-300"
            }`}
            disabled={feedOptInBusy || feedPublishOptIn === null}
            onClick={toggleFeedPublishOptIn}
            type="button"
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                feedPublishOptIn ? "left-[1.375rem]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      ) : null}

      {accountAddress &&
      referralCode &&
      feedPublishOptIn &&
      feedRequests.length > 0 ? (
        <div className="mb-5 rounded-2xl border border-black/10 bg-white/80 p-4 shadow-[0_18px_42px_rgba(8,18,12,0.05)]">
          <p className="mb-1 text-sm font-extrabold text-neutral-900">
            {locale === "en" ? "Seller feed requests" : "셀러 피드 게시 요청"}
          </p>
          <p className="mb-3 text-xs text-neutral-500">
            {locale === "en"
              ? "Approve to publish to your feed (labeled as ad), or reject."
              : "승인하면 내 피드에 '[광고]' 표시로 게시되고, 거절하면 게시되지 않습니다."}
          </p>
          <div className="space-y-2">
            {feedRequests.map((req) => (
              <div
                className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-2"
                key={req.publicationId}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="lookbook"
                  className="h-14 w-11 rounded-lg border border-black/10 object-cover"
                  src={req.imageUrl}
                />
                <div className="min-w-0 flex-1">
                  {req.shopName ? (
                    <p className="truncate text-xs font-bold text-neutral-700">
                      {req.shopName}
                    </p>
                  ) : null}
                  {req.productUrl ? (
                    <a
                      className="block truncate text-[11px] text-[#16702e] underline"
                      href={req.productUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {req.productUrl}
                    </a>
                  ) : (
                    <p className="text-[11px] text-neutral-400">
                      {locale === "en" ? "No shop link" : "상품 링크 없음"}
                    </p>
                  )}
                </div>
                <button
                  className="rounded-lg bg-[#16702e] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                  disabled={feedReqBusy !== null}
                  onClick={() => moderateFeedRequest(req.contentId, "approve")}
                  type="button"
                >
                  {feedReqBusy === req.contentId
                    ? "…"
                    : locale === "en"
                      ? "Approve"
                      : "승인"}
                </button>
                <button
                  className="rounded-lg border border-black/15 px-3 py-1.5 text-xs font-bold text-neutral-600 disabled:opacity-50"
                  disabled={feedReqBusy !== null}
                  onClick={() => moderateFeedRequest(req.contentId, "reject")}
                  type="button"
                >
                  {locale === "en" ? "Reject" : "거절"}
                </button>
              </div>
            ))}
          </div>
        </div>
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
                    onClick={() => {
                      setStarAvatarUrl(avatar.url);
                      setSelectedPublicStarId(null);
                    }}
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
                onChange={(event) => {
                  setStarAvatarUrl(event.target.value);
                  setSelectedPublicStarId(null);
                }}
                placeholder="https://…/star.png"
                type="url"
                value={starAvatarUrl}
              />
            ) : null}

            {publicStars.length > 0 ? (
              <div className="mt-3 border-t border-black/5 pt-3">
                <p className="mb-2 text-xs font-bold text-neutral-500">
                  {locale === "en"
                    ? "Or pick a public AI star"
                    : "또는 공개 AI 스타에서 선택"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {publicStars.map((star) => {
                    const active = selectedPublicStarId === star.id;
                    return (
                      <button
                        className={`h-12 w-12 overflow-hidden rounded-full transition ${
                          active
                            ? "ring-2 ring-[#44f26e] ring-offset-2"
                            : "ring-1 ring-black/10 hover:ring-black/25"
                        }`}
                        key={star.id}
                        onClick={() => {
                          setSelectedPublicStarId(star.id);
                          setStarAvatarUrl(star.images[0] ?? "");
                          setStarName(star.name);
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
                {selectedPublicStarId ? (
                  <p className="mt-1.5 text-[11px] text-neutral-400">
                    {locale === "en"
                      ? "Using a public star — the owner earns royalty points."
                      : "공개 스타 사용 — 소유자가 포인트 로열티를 받습니다."}
                  </p>
                ) : null}
              </div>
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
          <p className="text-[11px] leading-relaxed text-neutral-400">
            {copy.setHint}
          </p>
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
              <>
                {garmentImageUrls.length > 0 ? (
                  <div className="mb-3 rounded-xl border border-black/10 bg-neutral-50/60 p-2.5">
                    <span className="mb-1.5 block text-[11px] font-bold text-neutral-400">
                      {locale === "en"
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
              </>
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

        <div className="rounded-2xl border border-black/10 bg-white/80 p-5 shadow-[0_18px_42px_rgba(8,18,12,0.05)]">
          <div className="mb-1 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#16702e]" />
            <span className="text-xs font-bold text-neutral-700">
              {locale === "en"
                ? "Batch — many products at once"
                : "여러 상품 일괄 생성 (배치)"}
            </span>
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-neutral-400">
            {locale === "en"
              ? "Upload several product photos; each gets one lookbook with the selected star (1 cut each, points)."
              : "상품 사진을 여러 장 올리면 선택한 스타로 상품마다 룩북 1컷씩 순차 생성됩니다. 컷당 포인트."}
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
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void handleBatchFiles(event.dataTransfer.files);
                }}
              >
                {isBatchUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
                <span className="px-1 text-center text-[10px] font-bold">
                  {locale === "en" ? "Add" : "추가"}
                </span>
                <input
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={!accountAddress || isBatchUploading || isBatchRunning}
                  multiple
                  onChange={(event) => {
                    void handleBatchFiles(event.target.files);
                    event.target.value = "";
                  }}
                  type="file"
                />
              </label>
            ) : null}
          </div>
          <button
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16702e] px-7 py-3 text-sm font-extrabold text-white transition hover:bg-[#0f5722] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={
              !accountAddress ||
              !starAvatarUrl.trim() ||
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
                {locale === "en" ? "Generating batch…" : "일괄 생성 중…"}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {locale === "en"
                  ? `Generate ${batchProducts.length} products`
                  : `${batchProducts.length}개 상품 생성`}
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
                    {job.status === "done" && job.imageUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt="lookbook"
                          className="h-full w-full object-cover"
                          src={job.imageUrl}
                        />
                        <a
                          className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900/85 text-white"
                          download
                          href={job.imageUrl}
                          rel="noreferrer"
                          target="_blank"
                          title={copy.download}
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
                          {job.status === "failed" ? (
                            <span className="text-rose-500">
                              {locale === "en" ? "Failed" : "실패"}
                            </span>
                          ) : (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                              <span>
                                {job.status === "generating"
                                  ? locale === "en"
                                    ? "Making…"
                                    : "생성 중…"
                                  : locale === "en"
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

        {history.length > 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white/80 p-5 shadow-[0_18px_42px_rgba(8,18,12,0.05)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-neutral-700">
                {locale === "en" ? "My lookbooks" : "내 룩북"}
              </span>
              <button
                className="flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 transition hover:border-black/25"
                onClick={exportHistoryCsv}
                type="button"
              >
                <Download className="h-3.5 w-3.5" />
                {locale === "en" ? "Export CSV" : "CSV 내보내기"}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {history.flatMap((gen) =>
                gen.imageUrls.map((url) => (
                  <a
                    className="group relative block overflow-hidden rounded-xl border border-black/10 bg-neutral-50"
                    download
                    href={url}
                    key={`${gen.generationId}-${url}`}
                    rel="noreferrer"
                    target="_blank"
                    title={gen.starName ?? undefined}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt="lookbook"
                      className="aspect-[4/5] w-full object-cover"
                      src={url}
                    />
                    <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900/80 text-white opacity-0 transition group-hover:opacity-100">
                      <Download className="h-3 w-3" />
                    </span>
                  </a>
                )),
              )}
            </div>
          </div>
        ) : null}
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
