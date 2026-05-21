"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2, Newspaper } from "lucide-react";
import { useCallback, useState } from "react";

import { shouldBypassFanletterImageOptimization } from "@/lib/fanletter-image";
import type { FanletterRelatedNewsItem } from "@/lib/fanletter-news-related";
import { cn } from "@/lib/utils";

type FanletterNewsRelatedListCopy = {
  empty: string;
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

function isRelatedListResponse(
  value: unknown,
): value is FanletterNewsRelatedListResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const response = value as Partial<FanletterNewsRelatedListResponse>;

  return Array.isArray(response.items) && typeof response.hasMore === "boolean";
}

function RelatedNewsCard({ item }: { item: FanletterRelatedNewsItem }) {
  return (
    <Link
      className="group grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] gap-3 border-b border-black/10 pb-4 transition last:border-b-0 last:pb-0 hover:border-[#19b84b]"
      href={item.href}
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
        <div className="mt-2 flex flex-wrap gap-2 text-[0.66rem] font-bold uppercase tracking-[0.1em] text-black/44">
          {item.publishedAt ? <span>{item.publishedAt}</span> : null}
          <span>{item.reporterName}</span>
        </div>
      </div>
    </Link>
  );
}

export function FanletterNewsRelatedList({
  copy,
  initialHasMore,
  initialItems,
  pageSize,
  relatedApiHref,
}: {
  copy: FanletterNewsRelatedListCopy;
  initialHasMore: boolean;
  initialItems: FanletterRelatedNewsItem[];
  pageSize: number;
  relatedApiHref: string;
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

      setItems((currentItems) => [...currentItems, ...data.items]);
      setHasMore(data.hasMore);
    } catch {
      setError(copy.error);
    } finally {
      setIsLoading(false);
    }
  }, [copy.error, hasMore, isLoading, items.length, pageSize, relatedApiHref]);

  return (
    <section className="border border-black/12 bg-white p-4 text-[#111510] shadow-[0_14px_40px_rgba(17,21,16,0.06)]">
      <div className="border-b border-black/12 pb-3">
        <div>
          <p className="text-xs font-bold text-[#16702e]">FanLetter News</p>
          <h2 className="mt-1 text-lg font-black tracking-normal">
            {copy.title}
          </h2>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="mt-4 grid gap-4">
          {items.map((item) => (
            <RelatedNewsCard item={item} key={item.reportId} />
          ))}
        </div>
      ) : (
        <p className="mt-4 border border-black/10 bg-[#f5f6f2] px-4 py-4 text-sm font-semibold leading-6 text-black/52">
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
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-black/12 bg-[#f5f7f1] px-4 text-sm font-black text-[#111510] transition hover:border-[#19b84b] hover:bg-[#ecfff0] disabled:cursor-wait disabled:opacity-60"
          disabled={isLoading}
          onClick={handleLoadMore}
          type="button"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin text-[#16702e]" />
          ) : null}
          {isLoading ? copy.loading : copy.loadMore}
        </button>
      ) : null}
    </section>
  );
}
