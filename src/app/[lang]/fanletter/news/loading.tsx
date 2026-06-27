"use client";

import { usePathname } from "next/navigation";

// Tailored loading boundary for the AIAVpark News surface, whose newspaper
// layout (masthead + section nav + ticker + investor brief + action cards)
// differs from the generic fanletter console skeleton. Used as the Suspense
// fallback for the news page and its sub-routes that lack their own loading
// state. The masthead is rendered per-page (not in news/layout.tsx), so the
// skeleton reproduces it here.
// loading.tsx cannot receive the [lang] route param, so derive the locale from
// the pathname to localize the screen-reader status (was hardcoded Korean).
const NEWS_LOADING_STATUS_MESSAGE: Record<string, string> = {
  en: "Loading news.",
  id: "Memuat berita.",
  ja: "ニュースを読み込んでいます。",
  ko: "뉴스를 불러오는 중입니다.",
  vi: "Đang tải tin tức.",
  zh: "正在加载新闻。",
};

function Block({ className }: { className: string }) {
  return (
    <div className={`bg-black/[0.06] motion-safe:animate-pulse ${className}`} />
  );
}

function DarkBlock({ className }: { className: string }) {
  return (
    <div className={`bg-white/12 motion-safe:animate-pulse ${className}`} />
  );
}

export default function FanletterNewsLoading() {
  const pathname = usePathname();
  const localeSegment = pathname?.split("/")[1] ?? "ko";
  const statusMessage =
    NEWS_LOADING_STATUS_MESSAGE[localeSegment] ?? NEWS_LOADING_STATUS_MESSAGE.ko;

  return (
    <main className="min-h-screen bg-[#f5f6f7] text-zinc-950" aria-busy="true">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {/* Date / tagline bar */}
        <div className="flex items-center justify-between">
          <Block className="h-3 w-40 rounded-full" />
          <Block className="h-3 w-48 rounded-full" />
        </div>

        {/* Masthead */}
        <div className="mt-4 flex items-center justify-between gap-4 border-b-2 border-zinc-900/80 pb-5">
          <div className="flex items-center gap-3">
            <Block className="size-12 rounded-xl" />
            <Block className="h-10 w-56 rounded-lg sm:w-80" />
          </div>
          <Block className="hidden h-8 w-56 rounded-full sm:block" />
        </div>

        {/* Section nav */}
        <div className="mt-4 flex flex-wrap gap-3">
          {Array.from({ length: 9 }, (_, index) => (
            <Block className="h-4 w-16 rounded-full" key={index} />
          ))}
        </div>

        {/* News ticker */}
        <Block className="mt-4 h-7 w-full rounded-lg" />

        {/* Investor brief (dark hero) */}
        <div className="mt-5 grid gap-5 rounded-2xl bg-zinc-900 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="space-y-3">
            <DarkBlock className="h-3 w-32 rounded-full" />
            <DarkBlock className="h-9 w-3/4 rounded-lg" />
            <DarkBlock className="h-4 w-2/3 rounded-full" />
          </div>
          <div className="flex items-center gap-3">
            {Array.from({ length: 3 }, (_, index) => (
              <DarkBlock className="h-16 w-20 rounded-lg" key={index} />
            ))}
            <DarkBlock className="h-11 w-32 rounded-full" />
          </div>
        </div>

        {/* Action cards */}
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              className="rounded-2xl border border-black/10 bg-white p-5"
              key={index}
            >
              <Block className="h-3 w-16 rounded-full" />
              <Block className="mt-3 h-6 w-40 rounded-lg" />
              <Block className="mt-3 h-12 w-full rounded-lg" />
              <Block className="mt-4 h-11 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </p>
    </main>
  );
}
