"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LockKeyhole,
  Newspaper,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import type { FanletterRelatedNewsItem } from "@/lib/fanletter-news-related";
import { cn } from "@/lib/utils";

type FanletterNewsRelatedListCopy = {
  current: string;
  description: string;
  empty: string;
  eyebrow: string;
  error: string;
  loading: string;
  next: string;
  page: string;
  previous: string;
  title: string;
};

type FanletterNewsRelatedSortOption = {
  active: boolean;
  href: string;
  label: string;
  value: string;
};

type FanletterNewsRelatedListResponse = {
  hasMore: boolean;
  items: FanletterRelatedNewsItem[];
};

function buildPageHref(baseHref: string, offset: number, limit: number) {
  const url = new URL(baseHref, window.location.origin);

  url.searchParams.set("offset", String(offset));
  url.searchParams.set("limit", String(limit));

  return `${url.pathname}${url.search}${url.hash}`;
}

function buildRelatedSortHref({
  baseHref,
  sortParamName,
  sortValue,
}: {
  baseHref: string;
  sortParamName: string;
  sortValue: string;
}) {
  const url = new URL(baseHref, "https://fanletter.local");

  url.searchParams.set(sortParamName, sortValue);

  return `${url.pathname}${url.search}${url.hash}`;
}

function isRelatedListResponse(
  value: unknown,
): value is FanletterNewsRelatedListResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Partial<FanletterNewsRelatedListResponse>;

  return Array.isArray(response.items) && typeof response.hasMore === "boolean";
}

function SourceRevealIcon({
  className,
  unlocked,
}: {
  className?: string;
  unlocked: boolean;
}) {
  const Icon = unlocked ? CheckCircle2 : LockKeyhole;

  return <Icon aria-hidden="true" className={cn("shrink-0", className)} />;
}

function FirstReportBadge({
  className,
  item,
}: {
  className?: string;
  item: FanletterRelatedNewsItem;
}) {
  if (!item.isFirstReport || !item.firstReportBadge) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full bg-[#44f26e] px-2 py-1 text-[0.56rem] font-black uppercase leading-none tracking-[0.08em] text-black shadow-[0_10px_24px_rgba(0,0,0,0.2)]",
        className,
      )}
    >
      <span className="truncate">{item.firstReportBadge}</span>
    </span>
  );
}

function SourceRevealStatusPill({
  item,
}: {
  item: FanletterRelatedNewsItem;
}) {
  if (!item.sourceReveal) {
    return null;
  }

  return (
    <div
      className={cn(
        "mt-1 inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[0.58rem] font-black leading-none sm:mt-1.5 sm:gap-1.5 sm:text-[0.62rem]",
        item.sourceReveal.unlocked
          ? "border-[#44f26e]/38 bg-[#eaffef] text-[#11732d]"
          : "border-black/12 bg-[#f5f7f1] text-[#111510]",
      )}
    >
      <SourceRevealIcon
        className="size-3 sm:size-3.5"
        unlocked={item.sourceReveal.unlocked}
      />
      <span className="truncate">{item.sourceReveal.statusLabel}</span>
      <span className="shrink-0 text-black/42">
        {item.sourceReveal.progressLabel}
      </span>
    </div>
  );
}

function countLoadedRelatedItems(
  items: FanletterRelatedNewsItem[],
  currentReportId: string,
) {
  return items.reduce(
    (count, item) => count + (item.reportId === currentReportId ? 0 : 1),
    0,
  );
}

function getRelatedPageItems(
  items: FanletterRelatedNewsItem[],
  currentReportId: string,
) {
  return items.filter((item) => item.reportId !== currentReportId);
}

type RelatedNewsPage = {
  hasMore: boolean;
  items: FanletterRelatedNewsItem[];
};

function RelatedNewsCard({
  currentLabel,
  href,
  isCurrent,
  item,
}: {
  currentLabel: string;
  href: string;
  isCurrent: boolean;
  item: FanletterRelatedNewsItem;
}) {
  const cardClassName = cn(
    "group grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-2 transition sm:grid-cols-[7.25rem_minmax(0,1fr)] sm:gap-2.5",
    isCurrent
      ? "rounded-lg border border-[#19b84b]/45 bg-[#ecfff0] p-2 shadow-[0_14px_32px_rgba(25,184,75,0.12)] sm:p-2.5"
      : "border-b border-black/10 pb-2.5 last:border-b-0 last:pb-0 hover:border-[#19b84b] sm:pb-3",
  );
  const content = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-[#111510] sm:rounded-lg">
        {item.coverImageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className={
              item.shouldBlur
                ? "scale-[1.06] object-cover blur-md brightness-[0.68] saturate-[0.86] transition duration-300 group-hover:scale-[1.08]"
                : "object-cover transition duration-300 group-hover:scale-[1.04]"
            }
            fill
            sizes="(max-width: 640px) 5.5rem, 7.25rem"
            src={item.coverImageUrl}
            unoptimized={shouldBypassFanletterImageOptimization(
              item.coverImageUrl,
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/68">
            <Newspaper className="size-7 text-[#44f26e]" />
          </div>
        )}
        {item.isNsfw ? (
          <div
            className={cn(
              "absolute p-2 text-center",
              item.shouldBlur
                ? "inset-0 flex items-center justify-center bg-black/34"
                : "right-0 top-0",
            )}
          >
            <span className="inline-flex rounded-full bg-rose-500 px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.1em] text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)]">
              {item.nsfwBadge}
            </span>
          </div>
        ) : null}
      </div>
      <div className="min-w-0">
        {isCurrent ? (
          <span className="mb-1 inline-flex max-w-full items-center gap-1 rounded-full border border-[#19b84b]/28 bg-white px-2 py-0.5 text-[0.56rem] font-black uppercase leading-none tracking-[0.08em] text-[#11732d] sm:mb-1.5 sm:py-1 sm:text-[0.58rem]">
            <CheckCircle2 aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">{currentLabel}</span>
          </span>
        ) : null}
        <p
          className={cn(
            "line-clamp-2 break-words text-[0.86rem] font-black leading-[1.16rem] [word-break:keep-all] sm:text-[0.92rem] sm:leading-5",
            item.shouldBlur ? "select-none blur-[2px]" : "",
          )}
        >
          {item.title}
        </p>
        <p
          className={cn(
            "mt-0.5 line-clamp-1 text-[0.72rem] font-medium leading-4 text-black/58 sm:text-xs sm:leading-5",
            item.shouldBlur ? "select-none blur-[2px]" : "",
          )}
        >
          {item.dek}
        </p>
        <SourceRevealStatusPill item={item} />
        <div className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden text-[0.54rem] font-bold uppercase tracking-[0.08em] text-black/44 sm:mt-1.5 sm:text-[0.62rem]">
          <FirstReportBadge
            className="shrink-0 border border-[#1eb84a]/20 bg-[#eaffef] px-1.5 py-0.5 text-[#11732d] shadow-none sm:px-2"
            item={item}
          />
          {item.publishedAt ? <span className="shrink-0">{item.publishedAt}</span> : null}
          <span className="min-w-0 truncate">{item.reporterName}</span>
        </div>
      </div>
    </>
  );

  if (isCurrent) {
    return (
      <div aria-current="page" className={cardClassName}>
        {content}
      </div>
    );
  }

  return (
    <Link className={cardClassName} href={href}>
      {content}
    </Link>
  );
}

export function FanletterNewsRelatedList({
  characterName,
  copy,
  currentReportId,
  initialHasMore,
  initialItems,
  pageSize,
  relatedApiHref,
  relatedSortParamName,
  sortLabel,
  sortOptions,
  sortValue,
}: {
  characterName: string | null;
  copy: FanletterNewsRelatedListCopy;
  currentReportId: string;
  initialHasMore: boolean;
  initialItems: FanletterRelatedNewsItem[];
  pageSize: number;
  relatedApiHref: string;
  relatedSortParamName: string;
  sortLabel: string;
  sortOptions: FanletterNewsRelatedSortOption[];
  sortValue: string;
}) {
  const currentItem = initialItems.find((item) => item.reportId === currentReportId);
  const relatedPageSize = Math.max(1, pageSize);
  const [pages, setPages] = useState<RelatedNewsPage[]>([
    {
      hasMore: initialHasMore,
      items: getRelatedPageItems(initialItems, currentReportId).slice(
        0,
        relatedPageSize,
      ),
    },
  ]);
  const [pageIndex, setPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const activePage = pages[pageIndex] ?? pages[0];
  const visibleRelatedItems = activePage.items;
  const hasAnyRelatedItems =
    pages.some((page) => page.items.length > 0) ||
    countLoadedRelatedItems(initialItems, currentReportId) > 0;

  const scrollToSectionTop = useCallback(() => {
    if (!sectionRef.current) {
      return;
    }

    if (!window.matchMedia("(max-width: 639px)").matches) {
      return;
    }

    sectionRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const goToPage = useCallback(async (nextPageIndex: number) => {
    if (isLoading || nextPageIndex < 0) {
      return;
    }

    if (pages[nextPageIndex]) {
      setPageIndex(nextPageIndex);
      setError(null);
      scrollToSectionTop();
      return;
    }

    if (!activePage.hasMore || nextPageIndex !== pageIndex + 1) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        buildPageHref(
          relatedApiHref,
          nextPageIndex * relatedPageSize,
          relatedPageSize,
        ),
        {
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to load related news.");
      }

      const data: unknown = await response.json();

      if (!isRelatedListResponse(data)) {
        throw new Error("Invalid related news response.");
      }

      const nextPage = {
        hasMore: data.hasMore,
        items: getRelatedPageItems(data.items, currentReportId),
      };

      setPages((currentPages) => {
        const updatedPages = [...currentPages];
        updatedPages[nextPageIndex] = nextPage;
        return updatedPages;
      });
      setPageIndex(nextPageIndex);
      scrollToSectionTop();
    } catch {
      setError(copy.error);
    } finally {
      setIsLoading(false);
    }
  }, [
    activePage.hasMore,
    copy.error,
    currentReportId,
    isLoading,
    pageIndex,
    pages,
    relatedApiHref,
    relatedPageSize,
    scrollToSectionTop,
  ]);
  const canGoPrevious = pageIndex > 0;
  const canGoNext = activePage.hasMore || Boolean(pages[pageIndex + 1]);
  const pageLabel = `${copy.page} ${pageIndex + 1}`;

  return (
    <section
      className="overflow-hidden border border-black/12 bg-white text-[#111510] shadow-none sm:shadow-[0_14px_40px_rgba(17,21,16,0.06)]"
      ref={sectionRef}
    >
      <div className="border-b border-black/12 bg-[#f5f7f1] p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[0.62rem] font-black uppercase tracking-[0.13em] text-[#16702e] sm:text-[0.68rem]">
              <BadgeCheck className="size-3.5" />
              {copy.eyebrow}
            </p>
            <h2 className="mt-1.5 break-words text-base font-black leading-tight tracking-normal [word-break:keep-all] sm:mt-2 sm:text-lg">
              {copy.title}
            </h2>
          </div>
          <span className="hidden shrink-0 items-center rounded-full border border-[#16702e]/20 bg-white px-2.5 py-1 text-[0.64rem] font-black uppercase tracking-[0.08em] text-[#16702e] sm:inline-flex">
            FanLetter
          </span>
        </div>
        {characterName ? (
          <p className="mt-2 hidden line-clamp-1 text-sm font-black text-black/64 sm:block">
            {characterName}
          </p>
        ) : null}
        <p className="mt-2 hidden text-sm font-semibold leading-6 text-black/54 sm:block">
          {copy.description}
        </p>
        {sortOptions.length > 0 ? (
          <div
            aria-label={sortLabel}
            className="-mx-3 mt-2.5 flex items-center gap-1.5 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:mt-3 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
          >
            <span className="mr-1 shrink-0 text-[0.62rem] font-black uppercase tracking-[0.1em] text-black/42 sm:text-[0.66rem]">
              {sortLabel}
            </span>
            {sortOptions.map((option) => (
              <Link
                aria-current={option.active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-8 shrink-0 items-center rounded-full border px-3 py-1 text-[0.72rem] font-black transition",
                  option.active
                    ? "border-[#111510] bg-[#111510] !text-white"
                    : "border-black/12 bg-white !text-[#111510] hover:border-[#19b84b] hover:bg-[#ecfff0]",
                )}
                href={option.href}
                key={option.value}
              >
                {option.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="p-3 sm:p-4">
        {currentItem ? (
          <div className="mb-3">
            <RelatedNewsCard
              currentLabel={copy.current}
              href={buildRelatedSortHref({
                baseHref: currentItem.href,
                sortParamName: relatedSortParamName,
                sortValue,
              })}
              isCurrent
              item={currentItem}
            />
          </div>
        ) : null}

        {visibleRelatedItems.length > 0 ? (
          <div className="grid gap-2.5 sm:gap-3">
            {visibleRelatedItems.map((item) => {
              const href = buildRelatedSortHref({
                baseHref: item.href,
                sortParamName: relatedSortParamName,
                sortValue,
              });

              return (
                <RelatedNewsCard
                  currentLabel={copy.current}
                  href={href}
                  isCurrent={false}
                  item={item}
                  key={item.reportId}
                />
              );
            })}
          </div>
        ) : (
          <p className="border border-black/10 bg-[#f5f6f2] px-3 py-3 text-sm font-semibold leading-6 text-black/52 sm:px-4 sm:py-4">
            {copy.empty}
          </p>
        )}

        {currentItem && !hasAnyRelatedItems ? (
          <p className="mt-3 border border-black/10 bg-[#f5f6f2] px-3 py-3 text-sm font-semibold leading-6 text-black/52 sm:px-4">
            {copy.empty}
          </p>
        ) : null}

        {error ? (
          <p className="mt-3 border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold leading-5 text-rose-700">
            {error}
          </p>
        ) : null}

        {hasAnyRelatedItems ? (
          <div className="mt-3 flex items-center justify-between gap-2 sm:mt-4">
            <button
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-black/12 bg-[#f5f7f1] px-3 py-2 text-center text-xs font-black leading-5 text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0] disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm"
              disabled={!canGoPrevious || isLoading}
              onClick={() => {
                void goToPage(pageIndex - 1);
              }}
              type="button"
            >
              <ChevronLeft className="size-4 shrink-0" />
              {copy.previous}
            </button>
            <span className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white px-3 text-xs font-black text-black/54">
              {isLoading ? (
                <Loader2 className="size-4 animate-spin text-[#16702e]" />
              ) : (
                pageLabel
              )}
            </span>
            <button
              className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-black/12 bg-[#111510] px-3 py-2 text-center text-xs font-black leading-5 text-white transition hover:bg-[#263027] disabled:cursor-not-allowed disabled:bg-[#f5f7f1] disabled:text-black/36 sm:text-sm"
              disabled={!canGoNext || isLoading}
              onClick={() => {
                void goToPage(pageIndex + 1);
              }}
              type="button"
            >
              {isLoading ? copy.loading : copy.next}
              <ChevronRight className="size-4 shrink-0" />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
