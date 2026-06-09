"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Link2,
  Loader2,
  Megaphone,
  MousePointerClick,
  Newspaper,
  PackageSearch,
  RefreshCw,
  Send,
  Share2,
  Sparkles,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  fanletterCampaignCategories,
  fanletterCampaignCategoryLabels,
  fanletterCampaignCharacters,
  fanletterCampaignGoalLabels,
  fanletterCampaignStatusLabels,
  type FanletterCampaignCategory,
  type FanletterCampaignDraft,
  type FanletterCampaignGoal,
  type FanletterCampaignRecord,
  type FanletterCampaignsResponse,
} from "@/lib/fanletter-campaign";
import type { Locale } from "@/lib/i18n";

type LoadStatus = "error" | "idle" | "loading" | "ready";

type CampaignFormState = {
  benefitText: string;
  brandName: string;
  campaignGoal: FanletterCampaignGoal;
  category: FanletterCampaignCategory;
  priceAmount: string;
  productName: string;
  productUrl: string;
  prohibitedCopy: string;
  requiredCopy: string;
  selectedCharacterId: string;
};

const defaultForm: CampaignFormState = {
  benefitText: "10% 쿠폰, 무료배송",
  brandName: "Airly",
  campaignGoal: "click",
  category: "living_appliance",
  priceAmount: "49,000원",
  productName: "미니 공기청정기",
  productUrl: "https://brand.com/products/mini-air-cleaner",
  prohibitedCopy: "질병 예방, 의학적 효능, 미세먼지 완전 제거 표현 금지",
  requiredCopy: "작은 방과 책상 위 공간에 적합",
  selectedCharacterId: "harin",
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        activate: "활성화",
        active: "활성",
        analyze: "상품 분석",
        attachPlacement: "4컷 연결",
        back: "FanLetter 홈",
        benefit: "혜택",
        brand: "브랜드",
        brief: "캠페인 브리프",
        campaignGoal: "캠페인 목표",
        category: "카테고리",
        characterMatch: "캐릭터 매칭",
        clickEvent: "상품 보기",
        copied: "공유링크를 복사했습니다.",
        copyLink: "링크 복사",
        createFailed: "캠페인 요청에 실패했습니다.",
        cutViews: "컷 조회",
        emptyQueue: "저장된 캠페인이 없습니다.",
        heroBody:
          "상품 URL을 AI 캐릭터 성장 캠페인으로 전환하고, 승인 큐와 공유 성과를 같은 화면에서 확인합니다.",
        heroEyebrow: "Advertiser Studio",
        heroTitle: "상품 URL로 캐릭터 캠페인 만들기",
        load: "불러오기",
        loading: "캠페인 데이터를 확인하는 중입니다.",
        noPlacements: "연결된 팬 기자 4컷이 없습니다.",
        operations: "운영 큐",
        placementBody:
          "기존 팬 기자 뉴스컷 공유 URL을 이 캠페인에 붙여서 유입과 클릭 성과를 함께 봅니다.",
        placementLinked: "뉴스컷 공유링크를 연결했습니다.",
        placements: "연결 4컷",
        placementTitle: "팬 기자 4컷 연결",
        placementUrl: "뉴스컷 공유 URL 또는 shareId",
        price: "가격",
        product: "상품명",
        productCard: "상품 카드",
        productUrl: "상품 URL",
        prohibitedCopy: "금지 문구",
        queueActive: "활성",
        queuePending: "승인 대기",
        queueTotal: "전체",
        reject: "반려",
        requiredCopy: "필수 문구",
        reset: "초기화",
        saved: "저장됨",
        select: "선택",
        shareEvent: "공유하기",
        sharePreview: "공유링크 미리보기",
        sourceClicks: "소스 클릭",
        submit: "승인 요청",
        target: "공유 목표",
        testActivate: "테스트 승인",
        unverified: "미검증",
        verified: "검증됨",
      }
    : {
        activate: "Activate",
        active: "Active",
        analyze: "Analyze Product",
        attachPlacement: "Attach 4-Cut",
        back: "FanLetter Home",
        benefit: "Benefit",
        brand: "Brand",
        brief: "Campaign Brief",
        campaignGoal: "Campaign Goal",
        category: "Category",
        characterMatch: "Character Match",
        clickEvent: "View Product",
        copied: "Share link copied.",
        copyLink: "Copy Link",
        createFailed: "Campaign request failed.",
        cutViews: "Cut Views",
        emptyQueue: "No saved campaigns yet.",
        heroBody:
          "Turn a product URL into an AI character growth campaign, then review approval and share performance in one workspace.",
        heroEyebrow: "Advertiser Studio",
        heroTitle: "Create character campaigns from product URLs",
        load: "Load",
        loading: "Checking campaign data.",
        noPlacements: "No fan reporter 4-cut placements linked yet.",
        operations: "Operations Queue",
        placementBody:
          "Attach an existing fan reporter news cut share URL to this campaign and review traffic with campaign performance.",
        placementLinked: "News cut share link attached.",
        placements: "4-Cut Links",
        placementTitle: "Fan Reporter 4-Cut Link",
        placementUrl: "News cut share URL or shareId",
        price: "Price",
        product: "Product",
        productCard: "Product Card",
        productUrl: "Product URL",
        prohibitedCopy: "Blocked Copy",
        queueActive: "Active",
        queuePending: "Pending",
        queueTotal: "Total",
        reject: "Reject",
        requiredCopy: "Required Copy",
        reset: "Reset",
        saved: "Saved",
        select: "Select",
        shareEvent: "Share",
        sharePreview: "Share Link Preview",
        sourceClicks: "Source Clicks",
        submit: "Submit Review",
        target: "Share Target",
        testActivate: "Test Activate",
        unverified: "Unverified",
        verified: "Verified",
      };
}

async function readApiJson<T>(response: Response, fallback: string): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;

  if (!response.ok) {
    throw new Error(data?.error || fallback);
  }

  if (!data) {
    throw new Error(fallback);
  }

  return data;
}

function getCampaignShareHref(locale: Locale, shareSlug: string) {
  return `/${locale}/fanletter/campaigns/${encodeURIComponent(shareSlug)}`;
}

function formatDate(value: string, locale: Locale) {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(value);
}

function getTargetNumber(value: string) {
  const parsed = Number.parseInt(value.replace(/,/g, ""), 10);

  return Number.isFinite(parsed) ? parsed : 500;
}

export function FanletterCampaignsPage({ locale }: { locale: Locale }) {
  const copy = useMemo(() => getCopy(locale), [locale]);
  const [draft, setDraft] = useState<FanletterCampaignDraft | null>(null);
  const [form, setForm] = useState<CampaignFormState>(defaultForm);
  const [campaign, setCampaign] = useState<FanletterCampaignRecord | null>(null);
  const [campaigns, setCampaigns] = useState<FanletterCampaignRecord[]>([]);
  const [placementLoading, setPlacementLoading] = useState(false);
  const [placementUrl, setPlacementUrl] = useState("");
  const [statusCounts, setStatusCounts] = useState<
    FanletterCampaignsResponse["statusCounts"]
  >({});
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("idle");
  const [toast, setToast] = useState<string>("");
  const toastTimeoutRef = useRef<number | null>(null);

  const selectedCharacter = useMemo(
    () =>
      fanletterCampaignCharacters.find(
        (character) => character.id === form.selectedCharacterId,
      ) ?? fanletterCampaignCharacters[0],
    [form.selectedCharacterId],
  );
  const shareSlug =
    campaign?.shareSlug ??
    `${selectedCharacter.id}-${form.brandName}-${form.productName}`
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const shareHref = getCampaignShareHref(locale, shareSlug);
  const progressCount = campaign?.progressCount ?? 0;
  const shareTarget = getTargetNumber(draft?.analysis.shareTarget ?? "500 클릭");
  const progressPercent = Math.min(
    100,
    Math.round((progressCount / shareTarget) * 100),
  );

  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    setToast(message);
    toastTimeoutRef.current = window.setTimeout(() => setToast(""), 2400);
  }, []);

  const updateForm = useCallback(
    <Key extends keyof CampaignFormState>(key: Key, value: CampaignFormState[Key]) => {
      setForm((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const loadCampaigns = useCallback(async () => {
    const response = await fetch("/api/fanletter/campaigns", {
      cache: "no-store",
    });
    const data = await readApiJson<FanletterCampaignsResponse>(
      response,
      copy.createFailed,
    );

    setCampaigns(data.campaigns);
    setStatusCounts(data.statusCounts);
  }, [copy.createFailed]);

  const analyzeProduct = useCallback(
    async (forceInfer = false, payload: CampaignFormState = form) => {
      setLoadStatus("loading");

      try {
        const response = await fetch("/api/fanletter/campaigns/analyze", {
          body: JSON.stringify({ ...payload, forceInfer }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const data = await readApiJson<{ draft: FanletterCampaignDraft }>(
          response,
          copy.createFailed,
        );

        setDraft(data.draft);
        setForm((current) => ({
          ...current,
          brandName: data.draft.product.brand,
          category: data.draft.product.category,
          priceAmount: data.draft.product.price,
          productName: data.draft.product.name,
          selectedCharacterId: data.draft.selectedCharacter.id,
        }));
        setCampaign(null);
        setLoadStatus("ready");
      } catch (error) {
        setLoadStatus("error");
        showToast(error instanceof Error ? error.message : copy.createFailed);
      }
    },
    [copy.createFailed, form, showToast],
  );

  const submitCampaign = useCallback(async () => {
    setLoadStatus("loading");

    try {
      const createResponse = await fetch("/api/fanletter/campaigns", {
        body: JSON.stringify(form),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const created = await readApiJson<{ campaign: FanletterCampaignRecord }>(
        createResponse,
        copy.createFailed,
      );
      const submitResponse = await fetch(
        `/api/fanletter/campaigns/${created.campaign.campaignId}/submit`,
        { method: "POST" },
      );
      const submitted = await readApiJson<{ campaign: FanletterCampaignRecord }>(
        submitResponse,
        copy.createFailed,
      );

      setCampaign(submitted.campaign);
      await loadCampaigns();
      setLoadStatus("ready");
      showToast(copy.saved);
      return submitted.campaign;
    } catch (error) {
      setLoadStatus("error");
      showToast(error instanceof Error ? error.message : copy.createFailed);
      return null;
    }
  }, [copy.createFailed, copy.saved, form, loadCampaigns, showToast]);

  const updateCampaignStatus = useCallback(
    async (campaignId: string, status: "active" | "rejected") => {
      const response = await fetch(
        `/api/fanletter/campaigns/${campaignId}/status`,
        {
          body: JSON.stringify({ status }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        },
      );
      const data = await readApiJson<{ campaign: FanletterCampaignRecord }>(
        response,
        copy.createFailed,
      );

      setCampaign(data.campaign);
      await loadCampaigns();
      showToast(fanletterCampaignStatusLabels[data.campaign.status]);
      return data.campaign;
    },
    [copy.createFailed, loadCampaigns, showToast],
  );

  const recordEvent = useCallback(
    async (eventType: "click" | "share") => {
      if (!campaign) {
        showToast(copy.submit);
        return;
      }

      const response = await fetch(
        `/api/fanletter/campaign-shares/${encodeURIComponent(
          campaign.shareSlug,
        )}/events`,
        {
          body: JSON.stringify({ eventType, source: "advertiser_studio" }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const data = await readApiJson<{ campaign: FanletterCampaignRecord }>(
        response,
        copy.createFailed,
      );

      setCampaign(data.campaign);
      await loadCampaigns();
      showToast(eventType === "click" ? copy.clickEvent : copy.shareEvent);
    },
    [campaign, copy.clickEvent, copy.createFailed, copy.shareEvent, copy.submit, loadCampaigns, showToast],
  );

  const attachPlacement = useCallback(async () => {
    const normalizedPlacementUrl = placementUrl.trim();

    if (!normalizedPlacementUrl) {
      showToast(copy.placementUrl);
      return;
    }

    setPlacementLoading(true);

    try {
      const targetCampaign = campaign ?? (await submitCampaign());

      if (!targetCampaign) {
        return;
      }

      const response = await fetch(
        `/api/fanletter/campaigns/${targetCampaign.campaignId}/placements`,
        {
          body: JSON.stringify({
            channel: "fanletter_news_cut",
            shareUrl: normalizedPlacementUrl,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const data = await readApiJson<{ campaign: FanletterCampaignRecord }>(
        response,
        copy.createFailed,
      );

      setCampaign(data.campaign);
      await loadCampaigns();
      setPlacementUrl("");
      setLoadStatus("ready");
      showToast(copy.placementLinked);
    } catch (error) {
      setLoadStatus("error");
      showToast(error instanceof Error ? error.message : copy.createFailed);
    } finally {
      setPlacementLoading(false);
    }
  }, [
    campaign,
    copy.createFailed,
    copy.placementLinked,
    copy.placementUrl,
    loadCampaigns,
    placementUrl,
    showToast,
    submitCampaign,
  ]);

  const loadCampaign = useCallback(
    (nextCampaign: FanletterCampaignRecord) => {
      setCampaign(nextCampaign);
      setDraft({
        analysis: nextCampaign.analysis,
        brief: nextCampaign.brief,
        goalLabel: nextCampaign.goalLabel,
        matches: nextCampaign.matches,
        product: nextCampaign.product,
        questName: nextCampaign.questName,
        selectedCharacter: nextCampaign.selectedCharacter,
        shareSlug: nextCampaign.shareSlug,
      });
      setForm({
        benefitText:
          nextCampaign.product.benefit === "혜택 입력 필요"
            ? ""
            : nextCampaign.product.benefit,
        brandName: nextCampaign.product.brand,
        campaignGoal: nextCampaign.analysis.goal,
        category: nextCampaign.product.category,
        priceAmount: nextCampaign.product.price,
        productName: nextCampaign.product.name,
        productUrl: nextCampaign.product.url,
        prohibitedCopy: nextCampaign.product.prohibitedCopy,
        requiredCopy: nextCampaign.product.requiredCopy,
        selectedCharacterId: nextCampaign.characterId,
      });
      showToast(copy.load);
    },
    [copy.load, showToast],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadInitialCampaignState() {
      setLoadStatus("loading");

      try {
        const response = await fetch("/api/fanletter/campaigns/analyze", {
          body: JSON.stringify({ ...defaultForm, forceInfer: true }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const data = await readApiJson<{ draft: FanletterCampaignDraft }>(
          response,
          copy.createFailed,
        );

        if (cancelled) {
          return;
        }

        setDraft(data.draft);
        setForm((current) => ({
          ...current,
          brandName: data.draft.product.brand,
          category: data.draft.product.category,
          priceAmount: data.draft.product.price,
          productName: data.draft.product.name,
          selectedCharacterId: data.draft.selectedCharacter.id,
        }));
        await loadCampaigns();

        if (!cancelled) {
          setLoadStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setLoadStatus("error");
          showToast(error instanceof Error ? error.message : copy.createFailed);
        }
      }
    }

    loadInitialCampaignState();

    return () => {
      cancelled = true;

      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [copy.createFailed, loadCampaigns, showToast]);

  return (
    <main className="min-h-screen bg-[#050806] text-white">
      <section className="border-b border-white/10 bg-[#08100b]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-3 text-sm font-bold text-white/80 transition hover:border-[#44f26e] hover:text-white"
              href={`/${locale}/fanletter`}
            >
              <ArrowLeft className="size-4" />
              {copy.back}
            </Link>
            <div className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#44f26e]/30 bg-[#44f26e]/10 px-3 text-sm font-bold text-[#44f26e]">
              <Megaphone className="size-4" />
              {campaign
                ? fanletterCampaignStatusLabels[campaign.status]
                : fanletterCampaignStatusLabels.draft}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr] lg:items-end">
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-[#44f26e]">
                {copy.heroEyebrow}
              </p>
              <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
                {copy.heroTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
                {copy.heroBody}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MetricCard label={copy.queueTotal} value={campaigns.length} />
              <MetricCard
                label={copy.queuePending}
                value={statusCounts.pending_admin ?? 0}
              />
              <MetricCard label={copy.queueActive} value={statusCounts.active ?? 0} />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <form
            className="rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/30"
            onSubmit={(event) => {
              event.preventDefault();
              analyzeProduct(true);
            }}
          >
            <SectionTitle icon={PackageSearch} label="Step 1" title={copy.analyze} />

            <label className="grid gap-2">
              <span className="text-xs font-bold text-white/60">{copy.productUrl}</span>
              <input
                className="min-h-11 rounded-lg border border-white/15 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-[#44f26e]"
                required
                type="url"
                value={form.productUrl}
                onChange={(event) => updateForm("productUrl", event.target.value)}
              />
            </label>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <TextField
                label={copy.brand}
                value={form.brandName}
                onChange={(value) => updateForm("brandName", value)}
              />
              <TextField
                label={copy.product}
                value={form.productName}
                onChange={(value) => updateForm("productName", value)}
              />
              <TextField
                label={copy.price}
                value={form.priceAmount}
                onChange={(value) => updateForm("priceAmount", value)}
              />
              <label className="grid gap-2">
                <span className="text-xs font-bold text-white/60">{copy.category}</span>
                <select
                  className="min-h-11 rounded-lg border border-white/15 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-[#44f26e]"
                  value={form.category}
                  onChange={(event) =>
                    updateForm(
                      "category",
                      event.target.value as FanletterCampaignCategory,
                    )
                  }
                >
                  {fanletterCampaignCategories.map((item) => (
                    <option key={item} value={item}>
                      {fanletterCampaignCategoryLabels[item]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <fieldset className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <legend className="col-span-full mb-1 text-xs font-bold text-white/60">
                {copy.campaignGoal}
              </legend>
              {(Object.keys(fanletterCampaignGoalLabels) as FanletterCampaignGoal[]).map(
                (goal) => (
                  <label key={goal} className="cursor-pointer">
                    <input
                      checked={form.campaignGoal === goal}
                      className="peer sr-only"
                      name="campaignGoal"
                      type="radio"
                      value={goal}
                      onChange={() => updateForm("campaignGoal", goal)}
                    />
                    <span className="grid min-h-10 place-items-center rounded-lg border border-white/15 bg-black/30 px-2 text-sm font-black text-white/60 transition peer-checked:border-[#44f26e] peer-checked:bg-[#44f26e]/15 peer-checked:text-[#44f26e]">
                      {fanletterCampaignGoalLabels[goal]}
                    </span>
                  </label>
                ),
              )}
            </fieldset>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <TextField
                label={copy.benefit}
                value={form.benefitText}
                onChange={(value) => updateForm("benefitText", value)}
              />
              <TextField
                label={copy.requiredCopy}
                value={form.requiredCopy}
                onChange={(value) => updateForm("requiredCopy", value)}
              />
            </div>

            <label className="mt-4 grid gap-2">
              <span className="text-xs font-bold text-white/60">
                {copy.prohibitedCopy}
              </span>
              <textarea
                className="min-h-24 resize-y rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-[#44f26e]"
                value={form.prohibitedCopy}
                onChange={(event) => updateForm("prohibitedCopy", event.target.value)}
              />
            </label>

            <div className="mt-5 flex flex-wrap gap-2">
              <ActionButton icon={Sparkles} loading={loadStatus === "loading"} type="submit">
                {copy.analyze}
              </ActionButton>
              <ActionButton icon={Send} type="button" onClick={submitCampaign}>
                {copy.submit}
              </ActionButton>
              <ActionButton
                icon={CheckCircle2}
                tone="dark"
                type="button"
                onClick={() =>
                  void (async () => {
                    const targetCampaign = campaign ?? (await submitCampaign());

                    if (targetCampaign) {
                      await updateCampaignStatus(targetCampaign.campaignId, "active");
                    }
                  })()
                }
              >
                {copy.testActivate}
              </ActionButton>
              <button
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-3 text-sm font-black text-white/75 transition hover:border-white/30 hover:text-white"
                type="button"
                onClick={() => {
                  setForm(defaultForm);
                  setCampaign(null);
                  analyzeProduct(true, defaultForm);
                }}
              >
                <RefreshCw className="size-4" />
                {copy.reset}
              </button>
            </div>
          </form>

          <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <SectionTitle icon={Bot} label="Analysis" title={copy.productCard} />
            <div className="grid gap-4 lg:grid-cols-[13rem_1fr]">
              <div className="relative min-h-64 overflow-hidden rounded-lg border border-white/10 bg-[#0e1b14]">
                <div className="absolute left-6 top-6 h-20 w-20 rounded-lg border border-[#44f26e]/30 bg-[#44f26e]/10" />
                <div className="absolute bottom-6 right-8 h-36 w-24 rounded-lg border-2 border-white/70 bg-white/90 shadow-xl">
                  <div className="mx-auto mt-5 h-2 w-10 rounded-full bg-black/70" />
                  <div className="mx-auto mt-14 h-11 w-11 rounded-full border-8 border-[#44f26e]" />
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-[#ffb84d]">
                  {draft
                    ? fanletterCampaignCategoryLabels[draft.product.category]
                    : fanletterCampaignCategoryLabels[form.category]}
                </p>
                <h2 className="text-2xl font-black">
                  {draft
                    ? `${draft.product.brand} ${draft.product.name}`
                    : `${form.brandName} ${form.productName}`}
                </h2>
                <p className="mt-3 text-sm leading-6 text-white/65">
                  {draft?.analysis.summary ?? copy.loading}
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <InfoTile label="Type" value={draft?.analysis.type ?? "-"} />
                  <InfoTile label="Risk" value={draft?.analysis.risk ?? "-"} />
                  <InfoTile
                    label={copy.target}
                    value={draft?.analysis.shareTarget ?? "-"}
                  />
                </div>
              </div>
            </div>
          </section>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <SectionTitle icon={Sparkles} label="Step 2" title={copy.characterMatch} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {(draft?.matches ?? []).map((match) => (
              <article
                className={`rounded-lg border p-4 ${
                  form.selectedCharacterId === match.character.id
                    ? "border-[#44f26e] bg-[#44f26e]/10"
                    : "border-white/10 bg-black/20"
                }`}
                key={match.character.id}
              >
                <div className="grid size-11 place-items-center rounded-lg bg-white text-lg font-black text-black">
                  {match.character.mark}
                </div>
                <h3 className="mt-3 text-lg font-black">{match.character.name}</h3>
                <p className="text-sm font-bold text-white/60">{match.character.role}</p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-white/55">Fit</span>
                  <strong className="text-2xl">{match.fitScore}</strong>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full bg-[#44f26e]"
                    style={{ width: `${match.fitScore}%` }}
                  />
                </div>
                <p className="mt-3 min-h-20 text-sm leading-5 text-white/60">
                  {match.fitReason}
                </p>
                <button
                  className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-white/15 text-sm font-black text-white/80 transition hover:border-[#44f26e] hover:text-[#44f26e]"
                  type="button"
                  onClick={() => updateForm("selectedCharacterId", match.character.id)}
                >
                  {copy.select}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <SectionTitle icon={Clipboard} label="Step 3" title={copy.brief} />
            <BriefBlock label="Story Hook" value={draft?.brief.storyHook} />
            <BriefBlock label="Share Copy" value={draft?.brief.shareCopy} />
            <BriefBlock label="Compliance" value={draft?.brief.complianceCopy} />
          </article>

          <article className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <SectionTitle icon={Share2} label="Step 4" title={copy.sharePreview} />
            <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
              <div className="mx-auto grid aspect-[9/16] w-44 place-items-center rounded-lg border-2 border-white/60 bg-black p-2">
                <div className="relative size-full overflow-hidden rounded-lg bg-[#142118]">
                  <div className="absolute right-4 top-4 h-20 w-14 rounded-lg border border-white/25 bg-white/10" />
                  <div className="absolute bottom-20 left-6 grid size-20 place-items-center rounded-full bg-[#ff7a45] text-3xl font-black">
                    {selectedCharacter.mark}
                  </div>
                  <div className="absolute bottom-8 right-5 h-24 w-14 rounded-lg border-2 border-white bg-white" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ffb84d]">
                  광고 · AI 캐릭터 콘텐츠
                </p>
                <h3 className="mt-3 text-2xl font-black">
                  {selectedCharacter.name}의 {draft?.questName ?? "성장 캠페인"}
                </h3>
                <p className="mt-3 text-sm leading-6 text-white/65">
                  {draft?.brief.shareCopy ?? copy.loading}
                </p>
                <div className="mt-4 rounded-lg border border-white/10 bg-black/25 p-3">
                  <div className="flex items-center justify-between gap-3 text-sm font-bold text-white/70">
                    <span>{copy.target}</span>
                    <strong>
                      {formatNumber(progressCount, locale)} /{" "}
                      {formatNumber(shareTarget, locale)}
                    </strong>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full bg-[#44f26e]"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ActionButton
                    icon={MousePointerClick}
                    type="button"
                    onClick={() => recordEvent("click")}
                  >
                    {copy.clickEvent}
                  </ActionButton>
                  <ActionButton
                    icon={Share2}
                    tone="dark"
                    type="button"
                    onClick={() => recordEvent("share")}
                  >
                    {copy.shareEvent}
                  </ActionButton>
                  <button
                    className="inline-flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-white/15 px-3 text-sm font-black text-white/75 transition hover:border-white/30 hover:text-white"
                    type="button"
                    onClick={() =>
                      navigator.clipboard
                        .writeText(new URL(shareHref, window.location.origin).toString())
                        .then(() => showToast(copy.copied))
                    }
                  >
                    <Clipboard className="size-4 shrink-0" />
                    {copy.copyLink}
                  </button>
                  <Link
                    className="inline-flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-white/15 px-3 text-sm font-black text-white/75 transition hover:border-white/30 hover:text-white"
                    href={shareHref}
                  >
                    <ExternalLink className="size-4 shrink-0" />
                    <span className="truncate">{shareHref}</span>
                  </Link>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <SectionTitle
                icon={Newspaper}
                label="Placement"
                title={copy.placementTitle}
              />
              <p className="text-sm leading-6 text-white/65">{copy.placementBody}</p>
              <div className="mt-4 grid gap-2">
                <label className="grid gap-2">
                  <span className="text-xs font-bold text-white/60">
                    {copy.placementUrl}
                  </span>
                  <input
                    className="min-h-11 rounded-lg border border-white/15 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-[#44f26e]"
                    placeholder="https://www.net402.ai/ko/fanletter/news/cuts/..."
                    type="text"
                    value={placementUrl}
                    onChange={(event) => setPlacementUrl(event.target.value)}
                  />
                </label>
                <div>
                  <ActionButton
                    icon={Link2}
                    loading={placementLoading}
                    type="button"
                    onClick={attachPlacement}
                  >
                    {copy.attachPlacement}
                  </ActionButton>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {campaign?.placements.length ? (
                campaign.placements.map((placement) => (
                  <article
                    className="rounded-lg border border-white/10 bg-black/25 p-3"
                    key={placement.placementId}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black">
                            {placement.label}
                          </h3>
                          <span
                            className={`rounded-md border px-2 py-1 text-xs font-black ${
                              placement.verificationStatus === "verified"
                                ? "border-[#44f26e]/30 bg-[#44f26e]/10 text-[#44f26e]"
                                : "border-[#ffb84d]/30 bg-[#ffb84d]/10 text-[#ffb84d]"
                            }`}
                          >
                            {placement.verificationStatus === "verified"
                              ? copy.verified
                              : copy.unverified}
                          </span>
                        </div>
                        <p className="mt-1 break-all text-xs font-bold text-white/45">
                          {placement.shareId}
                        </p>
                        <p className="mt-1 text-sm text-white/55">
                          {placement.reportId ?? "-"} · Cut{" "}
                          {placement.cutSlotNumber ?? "-"}
                        </p>
                      </div>
                      <a
                        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/15 px-3 text-sm font-black text-white/75 transition hover:border-white/30 hover:text-white"
                        href={placement.shareUrl || placement.targetHref || "#"}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <ExternalLink className="size-4" />
                        {copy.load}
                      </a>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <InfoTile
                        label={copy.cutViews}
                        value={formatNumber(placement.metrics.cutViews, locale)}
                      />
                      <InfoTile
                        label={copy.sourceClicks}
                        value={formatNumber(
                          placement.metrics.sourceOpenClicks,
                          locale,
                        )}
                      />
                      <InfoTile
                        label="Events"
                        value={formatNumber(placement.metrics.eventCount, locale)}
                      />
                    </div>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-white/15 p-4 text-sm font-bold text-white/55">
                  {copy.noPlacements}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <SectionTitle icon={Megaphone} label="Operations" title={copy.operations} />
          {campaigns.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/15 p-4 text-sm font-bold text-white/55">
              {copy.emptyQueue}
            </p>
          ) : (
            <div className="grid gap-3">
              {campaigns.map((item) => (
                <article
                  className="grid gap-3 rounded-lg border border-white/10 bg-black/25 p-3 lg:grid-cols-[1fr_12rem_auto] lg:items-center"
                  key={item.campaignId}
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-black">
                      {item.product.brand} {item.product.name}
                    </h3>
                    <p className="mt-1 truncate text-sm text-white/55">
                      {item.selectedCharacter.name} · {item.questName} ·{" "}
                      {formatDate(item.updatedAt, locale)}
                    </p>
                  </div>
                  <div className="grid gap-2 text-sm sm:grid-cols-3">
                    <InfoTile
                      label="Status"
                      value={fanletterCampaignStatusLabels[item.status]}
                    />
                    <InfoTile
                      label="Events"
                      value={formatNumber(item.report.total, locale)}
                    />
                    <InfoTile
                      label={copy.placements}
                      value={formatNumber(item.placements.length, locale)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <QueueButton onClick={() => loadCampaign(item)}>
                      {copy.load}
                    </QueueButton>
                    {item.status !== "active" && item.status !== "rejected" ? (
                      <QueueButton
                        tone="primary"
                        onClick={() => updateCampaignStatus(item.campaignId, "active")}
                      >
                        {copy.activate}
                      </QueueButton>
                    ) : null}
                    {item.status !== "rejected" && item.status !== "completed" ? (
                      <QueueButton
                        tone="danger"
                        onClick={() => updateCampaignStatus(item.campaignId, "rejected")}
                      >
                        {copy.reject}
                      </QueueButton>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 max-w-[min(24rem,calc(100vw-2.5rem))] rounded-lg bg-white px-4 py-3 text-sm font-bold text-black shadow-2xl">
          {toast}
        </div>
      ) : null}
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 p-3">
      <span className="block text-xs font-bold text-white/50">{label}</span>
      <strong className="mt-1 block text-2xl font-black">{value}</strong>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  label,
  title,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-lg bg-[#44f26e]/15 text-[#44f26e]">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#44f26e]">
          {label}
        </p>
        <h2 className="text-xl font-black">{title}</h2>
      </div>
    </div>
  );
}

function TextField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-bold text-white/60">{label}</span>
      <input
        className="min-h-11 rounded-lg border border-white/15 bg-black/30 px-3 text-sm text-white outline-none transition focus:border-[#44f26e]"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 p-3">
      <span className="block text-xs font-bold text-white/45">{label}</span>
      <strong className="mt-1 block text-sm font-black text-white">{value}</strong>
    </div>
  );
}

function BriefBlock({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="border-t border-white/10 py-4">
      <span className="block text-xs font-black uppercase tracking-[0.18em] text-[#44f26e]">
        {label}
      </span>
      <p className="mt-2 text-sm leading-6 text-white/70">{value ?? "-"}</p>
    </div>
  );
}

function ActionButton({
  children,
  icon: Icon,
  loading = false,
  onClick,
  tone = "primary",
  type,
}: {
  children: ReactNode;
  icon: LucideIcon;
  loading?: boolean;
  onClick?: () => void;
  tone?: "dark" | "primary";
  type: "button" | "submit";
}) {
  return (
    <button
      className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-black transition ${
        tone === "primary"
          ? "border-[#44f26e] bg-[#44f26e] text-black hover:bg-[#7dff98]"
          : "border-white/15 bg-white text-black hover:bg-white/85"
      }`}
      disabled={loading}
      type={type}
      onClick={onClick}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
      {children}
    </button>
  );
}

function QueueButton({
  children,
  onClick,
  tone = "default",
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "danger" | "default" | "primary";
}) {
  return (
    <button
      className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-sm font-black transition ${
        tone === "primary"
          ? "border-[#44f26e] bg-[#44f26e] text-black"
          : tone === "danger"
            ? "border-red-400/40 bg-red-500/10 text-red-100"
            : "border-white/15 bg-black/25 text-white/80"
      }`}
      type="button"
      onClick={onClick}
    >
      {tone === "danger" ? <XCircle className="size-4" /> : null}
      {children}
    </button>
  );
}
