"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  MousePointerClick,
  Share2,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  fanletterCampaignStatusLabels,
  type FanletterCampaignRecord,
} from "@/lib/fanletter-campaign";
import type { Locale } from "@/lib/i18n";

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        back: "FanLetter",
        click: "상품 보기",
        inactive: "공유링크 준비 중",
        progress: "목표 진행률",
        share: "공유하기",
        sponsor: "광고 · AI 캐릭터 콘텐츠",
        updated: "참여가 기록되었습니다.",
      }
    : {
        back: "FanLetter",
        click: "View Product",
        inactive: "Share link pending",
        progress: "Goal Progress",
        share: "Share",
        sponsor: "Ad · AI character content",
        updated: "Engagement recorded.",
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

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(value);
}

function getTargetNumber(value: string) {
  const parsed = Number.parseInt(value.replace(/,/g, ""), 10);

  return Number.isFinite(parsed) ? parsed : 500;
}

export function FanletterCampaignSharePage({
  campaign: initialCampaign,
  locale,
}: {
  campaign: FanletterCampaignRecord;
  locale: Locale;
}) {
  const copy = getCopy(locale);
  const [campaign, setCampaign] = useState(initialCampaign);
  const [loadingEvent, setLoadingEvent] = useState<"click" | "share" | null>(null);
  const [toast, setToast] = useState("");
  const targetNumber = useMemo(
    () => getTargetNumber(campaign.analysis.shareTarget),
    [campaign.analysis.shareTarget],
  );
  const progressPercent = Math.min(
    100,
    Math.round((campaign.progressCount / targetNumber) * 100),
  );
  const isActive = campaign.status === "active";

  async function recordEvent(eventType: "click" | "share") {
    if (!isActive) {
      setToast(copy.inactive);
      window.setTimeout(() => setToast(""), 2200);
      return;
    }

    setLoadingEvent(eventType);

    try {
      const response = await fetch(
        `/api/fanletter/campaign-shares/${encodeURIComponent(
          campaign.shareSlug,
        )}/events`,
        {
          body: JSON.stringify({
            eventType,
            source: "campaign_share_page",
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const data = await readApiJson<{ campaign: FanletterCampaignRecord }>(
        response,
        copy.updated,
      );

      setCampaign(data.campaign);
      setToast(copy.updated);

      if (eventType === "click") {
        window.open(campaign.product.url, "_blank", "noopener,noreferrer");
      } else if (navigator.share) {
        await navigator.share({
          text: campaign.brief.shareCopy,
          title: `${campaign.selectedCharacter.name}의 ${campaign.questName}`,
          url: window.location.href,
        });
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : copy.inactive);
    } finally {
      setLoadingEvent(null);
      window.setTimeout(() => setToast(""), 2200);
    }
  }

  return (
    <main className="min-h-screen bg-[#050806] text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[0.82fr_1fr] lg:items-center lg:px-8">
        <section className="flex flex-col gap-5">
          <Link
            className="inline-flex min-h-10 w-fit items-center gap-2 rounded-lg border border-white/15 px-3 text-sm font-bold text-white/75 transition hover:border-[#44f26e] hover:text-white"
            href={`/${locale}/fanletter`}
          >
            <ArrowLeft className="size-4" />
            {copy.back}
          </Link>

          <div className="mx-auto grid aspect-[9/16] w-full max-w-[20rem] place-items-center rounded-lg border-2 border-white/60 bg-black p-3 shadow-2xl shadow-black/50">
            <div className="relative size-full overflow-hidden rounded-lg bg-[#142118]">
              <div className="absolute left-5 top-5 rounded-lg border border-[#44f26e]/30 bg-[#44f26e]/10 px-3 py-2 text-xs font-black text-[#44f26e]">
                {campaign.selectedCharacter.role}
              </div>
              <div className="absolute right-6 top-20 h-28 w-20 rounded-lg border border-white/25 bg-white/10" />
              <div className="absolute bottom-28 left-8 grid size-28 place-items-center rounded-full bg-[#ff7a45] text-5xl font-black shadow-xl">
                {campaign.selectedCharacter.mark}
              </div>
              <div className="absolute bottom-10 right-8 h-32 w-20 rounded-lg border-2 border-white bg-white shadow-xl">
                <div className="mx-auto mt-4 h-2 w-9 rounded-full bg-black/70" />
                <div className="mx-auto mt-16 h-9 w-9 rounded-full border-8 border-[#44f26e]" />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30">
          <div className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-[#44f26e]/30 bg-[#44f26e]/10 px-3 text-xs font-black text-[#44f26e]">
            <Sparkles className="size-4" />
            {isActive
              ? fanletterCampaignStatusLabels[campaign.status]
              : copy.inactive}
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-[#ffb84d]">
            {copy.sponsor}
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
            {campaign.selectedCharacter.name}의 {campaign.questName}
          </h1>
          <p className="mt-4 text-base leading-7 text-white/70">
            {campaign.brief.shareCopy}
          </p>

          <div className="mt-6 rounded-lg border border-white/10 bg-black/25 p-4">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#44f26e]">
              {campaign.product.brand}
            </span>
            <strong className="mt-2 block text-2xl">
              {campaign.product.name}
            </strong>
            <p className="mt-2 text-sm font-bold text-white/55">
              {campaign.product.price} · {campaign.product.benefit}
            </p>
          </div>

          <div className="mt-6 rounded-lg border border-white/10 bg-black/25 p-4">
            <div className="flex items-center justify-between gap-3 text-sm font-bold text-white/70">
              <span>{copy.progress}</span>
              <strong>
                {formatNumber(campaign.progressCount, locale)} /{" "}
                {formatNumber(targetNumber, locale)}
              </strong>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <span
                className="block h-full rounded-full bg-[#44f26e]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#44f26e] bg-[#44f26e] px-4 text-sm font-black text-black transition hover:bg-[#7dff98]"
              type="button"
              onClick={() => recordEvent("click")}
            >
              {loadingEvent === "click" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MousePointerClick className="size-4" />
              )}
              {copy.click}
              <ExternalLink className="size-4" />
            </button>
            <button
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-white px-4 text-sm font-black text-black transition hover:bg-white/85"
              type="button"
              onClick={() => recordEvent("share")}
            >
              {loadingEvent === "share" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Share2 className="size-4" />
              )}
              {copy.share}
            </button>
          </div>
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
