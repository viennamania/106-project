"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Images,
  Newspaper,
  PenLine,
  Sparkles,
  UserRound,
} from "lucide-react";

import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import {
  FANLETTER_NEWS_PUBLIC_CUT_PAGE_SIZE,
  type FanletterNewsPublicCutFeedLoadResponse,
  type SerializedFanletterNewsPublicCut,
  type SerializedFanletterNewsPublicCutFeedItem,
} from "@/lib/fanletter-news-public-cuts-shared";
import {
  getFanletterNewsBareArticleDisplayTitle,
} from "@/lib/fanletter-news-related";
import type { Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        adult: "성인 팬 전용",
        character: "캐릭터",
        cutLink: "컷 링크",
        emptyBody:
          "아직 공개 피드로 보여줄 리포터 편집 컷이 없습니다. 팬 기자가 티저 컷을 저장하면 이곳에 모입니다.",
        emptyCta: "뉴스 홈으로 돌아가기",
        emptyTitle: "리포터 컷 피드가 준비 중입니다.",
        eyebrow: "Reporter Cut Feed",
        feedTitle: "리포터 컷",
        home: "뉴스 홈",
        instruction: "위아래로 넘겨 팬 기자가 고른 4컷을 확인하세요.",
        loadError: "다음 리포터 컷을 불러오지 못했습니다.",
        loadMore: "더 보기",
        loadingMore: "다음 리포터 컷 불러오는 중",
        news: "뉴스 보기",
        noMore: "모든 리포터 컷을 확인했습니다.",
        paid: "팬 전용 원본",
        reporter: "팬 기자",
        slot: (index: string) => `컷 ${index}`,
        title: "팬 기자가 편집한 4컷 피드",
      }
    : {
        adult: "Adult fan-only",
        character: "Character",
        cutLink: "Cut link",
        emptyBody:
          "No reporter-edited cuts are ready for the public feed yet. Saved teaser cuts will appear here.",
        emptyCta: "Back to News",
        emptyTitle: "Reporter cut feed is getting ready.",
        eyebrow: "Reporter Cut Feed",
        feedTitle: "Reporter Cuts",
        home: "News Home",
        instruction: "Swipe vertically to review the four cuts chosen by fan reporters.",
        loadError: "Could not load more reporter cuts.",
        loadMore: "Load more",
        loadingMore: "Loading more reporter cuts",
        news: "Read news",
        noMore: "You have reviewed every reporter cut.",
        paid: "Fan-only source",
        reporter: "Fan reporter",
        slot: (index: string) => `Cut ${index}`,
        title: "Four-cut feed edited by fan reporters",
      };
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(date);
}

function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function getReportHref({
  locale,
  referralCode,
  reportId,
}: {
  locale: Locale;
  referralCode: string | null;
  reportId: string;
}) {
  return buildPathWithReferral(
    `/${locale}/fanletter/news/${reportId}`,
    referralCode,
  );
}

function getCharacterHref({
  creatorReferralCode,
  locale,
  referralCode,
}: {
  creatorReferralCode: string | null;
  locale: Locale;
  referralCode: string | null;
}) {
  return buildPathWithReferral(
    creatorReferralCode
      ? `/${locale}/fanletter/news/characters/${creatorReferralCode}`
      : `/${locale}/fanletter/news/characters`,
    referralCode ?? creatorReferralCode,
  );
}

function getReporterHref({
  locale,
  referralCode,
  reporterReferralCode,
}: {
  locale: Locale;
  referralCode: string | null;
  reporterReferralCode: string;
}) {
  return buildPathWithReferral(
    `/${locale}/fanletter/news/reporters/${reporterReferralCode}`,
    referralCode,
  );
}

function getCutHref({
  locale,
  referralCode,
  reportId,
}: {
  locale: Locale;
  referralCode: string | null;
  reportId: string;
}) {
  return buildPathWithReferral(
    `/${locale}/fanletter/news/cuts/${reportId}`,
    referralCode,
  );
}

function CutThumbnail({
  blurred,
  copy,
  cut,
  title,
}: {
  blurred: boolean;
  copy: ReturnType<typeof getCopy>;
  cut: SerializedFanletterNewsPublicCut;
  title: string;
}) {
  const slotNumber = cut.slotNumber.toString().padStart(2, "0");

  return (
    <div className="relative aspect-[9/16] min-w-20 overflow-hidden rounded-lg border border-white/16 bg-white/8 shadow-[0_12px_30px_rgba(0,0,0,0.26)] sm:min-w-24">
      <Image
        alt={`${title} ${copy.slot(slotNumber)}`}
        className={blurred ? "object-cover blur-md brightness-50" : "object-cover"}
        fill
        sizes="6rem"
        src={cut.imageUrl}
        unoptimized={shouldBypassFanletterImageOptimization(cut.imageUrl)}
      />
      <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/72 px-2 py-1 text-[0.58rem] font-black text-white">
        {slotNumber}
      </span>
    </div>
  );
}

function FeedSlide({
  hasMore,
  index,
  item,
  itemCount,
  locale,
  referralCode,
}: {
  hasMore: boolean;
  index: number;
  item: SerializedFanletterNewsPublicCutFeedItem;
  itemCount: number;
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const { report } = item;
  const title = getFanletterNewsBareArticleDisplayTitle(report.title);
  const positionLabel = hasMore
    ? `${formatNumber(index + 1, locale)} / ${formatNumber(itemCount, locale)}+`
    : `${formatNumber(index + 1, locale)} / ${formatNumber(itemCount, locale)}`;
  const publishedAt = formatDate(report.sourcePublishedAt ?? report.createdAt, locale);
  const isNsfw = report.contentMaturityRating === "nsfw";
  const reportHref = getReportHref({
    locale,
    referralCode,
    reportId: report.reportId,
  });
  const characterHref = getCharacterHref({
    creatorReferralCode: report.creatorReferralCode,
    locale,
    referralCode,
  });
  const reporterHref = getReporterHref({
    locale,
    referralCode,
    reporterReferralCode: report.reporterReferralCode,
  });
  const cutHref = getCutHref({
    locale,
    referralCode,
    reportId: report.reportId,
  });

  return (
    <article
      className="relative min-h-[100dvh] snap-start snap-always overflow-hidden bg-[#050706] text-white"
      id={report.reportId}
    >
      <div className="absolute inset-0">
        <Image
          alt=""
          aria-hidden="true"
          className={
            isNsfw
              ? "scale-110 object-cover blur-2xl brightness-[0.34] saturate-[0.7]"
              : "object-cover brightness-[0.72]"
          }
          fill
          priority={index < 2}
          sizes="100vw"
          src={item.leadCut.imageUrl}
          unoptimized={shouldBypassFanletterImageOptimization(
            item.leadCut.imageUrl,
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/58 via-black/10 to-black/86" />
        <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black via-black/62 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[100dvh] max-w-7xl grid-rows-[1fr_auto] gap-5 px-4 pb-[calc(env(safe-area-inset-bottom)+1.1rem)] pt-[calc(env(safe-area-inset-top)+5.4rem)] sm:px-6 sm:pb-7 lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-1 lg:items-end lg:px-8">
        <section className="flex min-w-0 flex-col justify-end">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[0.64rem] font-black uppercase tracking-[0.12em]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#44f26e] px-3 py-1.5 text-black">
              <Images className="size-3.5" />
              {copy.feedTitle}
            </span>
            <span className="rounded-full border border-white/16 bg-white/10 px-3 py-1.5 text-white/76 backdrop-blur">
              {positionLabel}
            </span>
            {isNsfw ? (
              <span className="rounded-full bg-rose-600 px-3 py-1.5 text-white">
                {copy.adult}
              </span>
            ) : report.priceType === "paid" ? (
              <span className="rounded-full border border-white/16 bg-white/10 px-3 py-1.5 text-white/76 backdrop-blur">
                {copy.paid}
              </span>
            ) : null}
          </div>
          <p className="max-w-2xl text-[0.7rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
            {report.creatorName}
          </p>
          <h1
            className={`mt-2 max-w-4xl break-words text-[2.2rem] font-black leading-[1.02] tracking-normal [word-break:keep-all] sm:text-[4rem] lg:text-[5.1rem] ${
              isNsfw ? "select-none blur-[2px]" : ""
            }`}
          >
            {title}
          </h1>
          <p
            className={`mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/70 sm:text-base sm:leading-7 ${
              isNsfw ? "select-none blur-[2px]" : ""
            }`}
          >
            {report.dek}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-white/58">
            <span>{report.reporterName}</span>
            {publishedAt ? <span>{publishedAt}</span> : null}
          </div>
          <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap">
            <Link
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-black !text-[#111510] transition hover:bg-[#65ff86]"
              href={reportHref}
            >
              <Newspaper className="size-4" />
              {copy.news}
            </Link>
            <Link
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/10 px-5 text-sm font-black !text-white backdrop-blur transition hover:bg-white hover:!text-[#111510]"
              href={characterHref}
            >
              <Sparkles className="size-4 text-[#44f26e]" />
              {copy.character}
            </Link>
            <Link
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/10 px-5 text-sm font-black !text-white backdrop-blur transition hover:bg-white hover:!text-[#111510]"
              href={reporterHref}
            >
              <PenLine className="size-4 text-[#44f26e]" />
              {copy.reporter}
            </Link>
          </div>
        </section>

        <aside className="min-w-0 rounded-2xl border border-white/14 bg-black/36 p-3 shadow-[0_18px_42px_rgba(0,0,0,0.32)] backdrop-blur-xl lg:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#44f26e]">
              {copy.title}
            </p>
            <Link
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white hover:text-[#111510]"
              href={cutHref}
              title={copy.cutLink}
            >
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:grid lg:grid-cols-2 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
            {item.cuts.map((cut) => (
              <CutThumbnail
                blurred={isNsfw}
                copy={copy}
                cut={cut}
                key={`${report.reportId}-${cut.slotNumber}-${cut.imageUrl}`}
                title={title}
              />
            ))}
          </div>
        </aside>
      </div>
    </article>
  );
}

function mergePublicCutItems(
  previousItems: SerializedFanletterNewsPublicCutFeedItem[],
  nextItems: SerializedFanletterNewsPublicCutFeedItem[],
) {
  const seenReportIds = new Set(
    previousItems.map((item) => item.report.reportId),
  );
  const mergedItems = [...previousItems];

  for (const item of nextItems) {
    if (seenReportIds.has(item.report.reportId)) {
      continue;
    }

    seenReportIds.add(item.report.reportId);
    mergedItems.push(item);
  }

  return mergedItems;
}

export function FanletterNewsPublicCutsFeedPage({
  excludeReportId = null,
  hasMore: initialHasMore,
  items: initialItems,
  locale,
  nextOffset: initialNextOffset,
  referralCode,
}: {
  excludeReportId?: string | null;
  hasMore: boolean;
  items: SerializedFanletterNewsPublicCutFeedItem[];
  locale: Locale;
  nextOffset: number;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    referralCode,
  );
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    setLoadError(null);

    try {
      const params = new URLSearchParams({
        limit: String(FANLETTER_NEWS_PUBLIC_CUT_PAGE_SIZE),
        locale,
        offset: String(nextOffset),
      });

      if (excludeReportId) {
        params.set("excludeReportId", excludeReportId);
      }

      const response = await fetch(`/api/fanletter/news-cuts?${params}`, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(copy.loadError);
      }

      const data = (await response.json()) as FanletterNewsPublicCutFeedLoadResponse;

      setItems((currentItems) =>
        mergePublicCutItems(currentItems, data.items),
      );
      setHasMore(data.hasMore);
      setNextOffset(data.nextOffset);
    } catch {
      setLoadError(copy.loadError);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    copy.loadError,
    excludeReportId,
    hasMore,
    isLoadingMore,
    locale,
    nextOffset,
  ]);

  useEffect(() => {
    if (!hasMore) {
      return;
    }

    const sentinel = loadMoreRef.current;
    const root = scrollContainerRef.current;

    if (!sentinel || !root) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      {
        root,
        rootMargin: "1400px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadMore]);

  if (items.length === 0) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#050706] px-4 text-white">
        <section className="max-w-lg rounded-2xl border border-white/12 bg-white/8 p-6 text-center shadow-2xl backdrop-blur-xl">
          <UserRound className="mx-auto size-10 text-[#44f26e]" />
          <h1 className="mt-4 text-2xl font-black tracking-normal [word-break:keep-all]">
            {copy.emptyTitle}
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/60">
            {copy.emptyBody}
          </p>
          <Link
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#44f26e] px-5 text-sm font-black !text-[#111510]"
            href={newsHomeHref}
          >
            <ArrowLeft className="size-4" />
            {copy.emptyCta}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="h-[100dvh] overflow-hidden bg-[#050706] text-white">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-black/34 px-3 py-3 text-white backdrop-blur-xl sm:px-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Link
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white hover:text-[#111510]"
            href={newsHomeHref}
            title={copy.home}
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 text-center">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#44f26e]">
              {copy.eyebrow}
            </p>
            <h1 className="truncate text-sm font-black sm:text-base">
              {copy.title}
            </h1>
          </div>
          <div className="hidden min-w-40 justify-end text-right text-[0.68rem] font-bold text-white/54 sm:block">
            {copy.instruction}
          </div>
          <div className="size-11 shrink-0 sm:hidden" aria-hidden="true" />
        </div>
      </header>
      <div
        className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth"
        ref={scrollContainerRef}
      >
        {items.map((item, index) => (
          <FeedSlide
            hasMore={hasMore}
            index={index}
            item={item}
            itemCount={items.length}
            key={item.report.reportId}
            locale={locale}
            referralCode={referralCode}
          />
        ))}
        <section
          className="flex min-h-[48dvh] snap-start items-center justify-center px-4 py-10 text-center"
          ref={loadMoreRef}
        >
          <div className="max-w-sm rounded-2xl border border-white/12 bg-white/8 p-5 shadow-2xl backdrop-blur-xl">
            <Images className="mx-auto size-8 text-[#44f26e]" />
            <p className="mt-3 text-sm font-black text-white">
              {isLoadingMore
                ? copy.loadingMore
                : loadError
                  ? copy.loadError
                  : hasMore
                    ? copy.loadingMore
                    : copy.noMore}
            </p>
            {loadError ? (
              <button
                className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[#44f26e] px-4 text-xs font-black text-[#111510]"
                onClick={() => void loadMore()}
                type="button"
              >
                {copy.loadMore}
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
