"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Newspaper,
} from "lucide-react";
import { useCallback, useState } from "react";

import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import type { FanletterRelatedNewsItem } from "@/lib/fanletter-news-related";
import { cn } from "@/lib/utils";

type FanletterNewsRelatedListCopy = {
  description: string;
  empty: string;
  eyebrow: string;
  error: string;
  loadMore: string;
  loading: string;
  title: string;
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

function buildRelatedStateHref({
  baseHref,
  itemCount,
  pageSize,
  stateParamName,
}: {
  baseHref: string;
  itemCount: number;
  pageSize: number;
  stateParamName: string;
}) {
  const url = new URL(baseHref, "https://fanletter.local");

  if (itemCount > pageSize) {
    url.searchParams.set(stateParamName, String(itemCount));
  } else {
    url.searchParams.delete(stateParamName);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function replaceCurrentRelatedState({
  itemCount,
  pageSize,
  stateParamName,
}: {
  itemCount: number;
  pageSize: number;
  stateParamName: string;
}) {
  const url = new URL(window.location.href);

  if (itemCount > pageSize) {
    url.searchParams.set(stateParamName, String(itemCount));
  } else {
    url.searchParams.delete(stateParamName);
  }

  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
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

function SourceRevealThumbnailBadge({
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
        "absolute bottom-1.5 left-1.5 z-20 inline-flex max-w-[calc(100%-0.75rem)] items-center gap-1 rounded-full border px-1.5 py-1 text-[0.58rem] font-black leading-none shadow-[0_10px_22px_rgba(0,0,0,0.24)]",
        item.sourceReveal.unlocked
          ? "border-[#44f26e]/50 bg-[#eaffef] text-[#0b6f29]"
          : "border-white/20 bg-black/72 text-white",
      )}
    >
      <SourceRevealIcon
        className="size-3"
        unlocked={item.sourceReveal.unlocked}
      />
      <span className="truncate">{item.sourceReveal.progressLabel}</span>
    </div>
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
        "mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 text-[0.66rem] font-black leading-none",
        item.sourceReveal.unlocked
          ? "border-[#44f26e]/38 bg-[#eaffef] text-[#11732d]"
          : "border-black/12 bg-[#f5f7f1] text-[#111510]",
      )}
    >
      <SourceRevealIcon
        className="size-3.5"
        unlocked={item.sourceReveal.unlocked}
      />
      <span className="truncate">{item.sourceReveal.statusLabel}</span>
      <span className="shrink-0 text-black/42">
        {item.sourceReveal.progressLabel}
      </span>
    </div>
  );
}

function RelatedNewsCard({
  href,
  item,
}: {
  href: string;
  item: FanletterRelatedNewsItem;
}) {
  return (
    <Link
      className="group grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] gap-3 border-b border-black/10 pb-4 transition last:border-b-0 last:pb-0 hover:border-[#19b84b]"
      href={href}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-[#111510]">
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
            sizes="6rem"
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
        <SourceRevealThumbnailBadge item={item} />
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "line-clamp-2 break-words text-sm font-black leading-5 [word-break:keep-all]",
            item.shouldBlur ? "select-none blur-[2px]" : "",
          )}
        >
          {item.title}
        </p>
        <p
          className={cn(
            "mt-1 line-clamp-2 text-xs font-medium leading-5 text-black/58",
            item.shouldBlur ? "select-none blur-[2px]" : "",
          )}
        >
          {item.dek}
        </p>
        <SourceRevealStatusPill item={item} />
        <div className="mt-2 flex flex-wrap gap-2 text-[0.66rem] font-bold uppercase tracking-[0.1em] text-black/44">
          {item.publishedAt ? <span>{item.publishedAt}</span> : null}
          <span>{item.reporterName}</span>
        </div>
      </div>
    </Link>
  );
}

export function FanletterNewsRelatedList({
  characterName,
  copy,
  initialHasMore,
  initialItems,
  pageSize,
  relatedApiHref,
  relatedStateParamName,
}: {
  characterName: string | null;
  copy: FanletterNewsRelatedListCopy;
  initialHasMore: boolean;
  initialItems: FanletterRelatedNewsItem[];
  pageSize: number;
  relatedApiHref: string;
  relatedStateParamName: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoadMore = useCallback(async () => {
    if (isLoading || !hasMore) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        buildPageHref(relatedApiHref, items.length, pageSize),
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

      const nextItems = [...items, ...data.items];

      setItems(nextItems);
      setHasMore(data.hasMore);
      replaceCurrentRelatedState({
        itemCount: nextItems.length,
        pageSize,
        stateParamName: relatedStateParamName,
      });
    } catch {
      setError(copy.error);
    } finally {
      setIsLoading(false);
    }
  }, [
    copy.error,
    hasMore,
    isLoading,
    items,
    pageSize,
    relatedApiHref,
    relatedStateParamName,
  ]);

  return (
    <section className="overflow-hidden border border-black/12 bg-white text-[#111510] shadow-[0_14px_40px_rgba(17,21,16,0.06)]">
      <div className="border-b border-black/12 bg-[#f5f7f1] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-black uppercase tracking-[0.13em] text-[#16702e]">
              <BadgeCheck className="size-3.5" />
              {copy.eyebrow}
            </p>
            <h2 className="mt-2 break-words text-lg font-black leading-tight tracking-normal [word-break:keep-all]">
              {copy.title}
            </h2>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full border border-[#16702e]/20 bg-white px-2.5 py-1 text-[0.64rem] font-black uppercase tracking-[0.08em] text-[#16702e]">
            FanLetter
          </span>
        </div>
        {characterName ? (
          <p className="mt-2 line-clamp-1 text-sm font-black text-black/64">
            {characterName}
          </p>
        ) : null}
        <p className="mt-2 text-sm font-semibold leading-6 text-black/54">
          {copy.description}
        </p>
      </div>

      <div className="p-4">
        {items.length > 0 ? (
          <div className="grid gap-4">
            {items.map((item) => {
              const href = buildRelatedStateHref({
                baseHref: item.href,
                itemCount: items.length,
                pageSize,
                stateParamName: relatedStateParamName,
              });

              return (
                <RelatedNewsCard href={href} item={item} key={item.reportId} />
              );
            })}
          </div>
        ) : (
          <p className="border border-black/10 bg-[#f5f6f2] px-4 py-4 text-sm font-semibold leading-6 text-black/52">
            {copy.empty}
          </p>
        )}

        {error ? (
          <p className="mt-3 border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold leading-5 text-rose-700">
            {error}
          </p>
        ) : null}

        {hasMore ? (
          <button
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-black/12 bg-[#f5f7f1] px-4 py-2 text-center text-sm font-black leading-5 text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0] disabled:cursor-wait disabled:opacity-60"
            disabled={isLoading}
            onClick={handleLoadMore}
            type="button"
          >
            {isLoading ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-[#16702e]" />
            ) : null}
            {isLoading ? copy.loading : copy.loadMore}
          </button>
        ) : null}
      </div>
    </section>
  );
}
