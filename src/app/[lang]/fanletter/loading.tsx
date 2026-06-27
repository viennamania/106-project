"use client";

// Shared navigation loading boundary for the FanLetter surface.
// App Router uses the nearest ancestor loading.tsx as the Suspense fallback,
// so this single skeleton gives instant feedback when navigating to any nested
// fanletter route that does not define its own loading state. Kept generic
// (header + hero + console + card grid) because it covers many page layouts.
import { usePathname } from "next/navigation";

// loading.tsx cannot receive the [lang] route param, so derive the locale from
// the pathname to localize the screen-reader status (was hardcoded Korean, which
// announced Korean to screen-reader users on every non-Korean locale).
const LOADING_STATUS_MESSAGE: Record<string, string> = {
  en: "Loading content.",
  id: "Memuat konten.",
  ja: "コンテンツを読み込んでいます。",
  ko: "콘텐츠를 불러오는 중입니다.",
  vi: "Đang tải nội dung.",
  zh: "正在加载内容。",
};

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div className={`rounded-2xl bg-zinc-100 motion-safe:animate-pulse ${className}`} />
  );
}

export default function FanletterLoading() {
  const pathname = usePathname();
  const localeSegment = pathname?.split("/")[1] ?? "ko";
  const statusMessage =
    LOADING_STATUS_MESSAGE[localeSegment] ?? LOADING_STATUS_MESSAGE.ko;

  return (
    <main className="min-h-screen bg-white text-zinc-950" aria-busy="true">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        {/* Top chrome row (logo + actions) */}
        <div className="flex items-center justify-between gap-3">
          <SkeletonBlock className="h-9 w-32" />
          <SkeletonBlock className="h-9 w-24 rounded-full" />
        </div>

        {/* Hero / page intro */}
        <div className="mt-8 space-y-3">
          <SkeletonBlock className="h-6 w-44 rounded-full" />
          <SkeletonBlock className="h-12 w-3/4 max-w-xl sm:h-16" />
          <SkeletonBlock className="h-5 w-2/3 max-w-md rounded-full" />
        </div>

        {/* Console / status card */}
        <div className="mt-8 grid gap-4 rounded-2xl border border-zinc-200 p-5 sm:grid-cols-2">
          {[0, 1].map((column) => (
            <div className="space-y-3" key={column}>
              <SkeletonBlock className="h-4 w-24 rounded-full" />
              <SkeletonBlock className="h-7 w-40 rounded-full" />
              <SkeletonBlock className="h-16 w-full" />
            </div>
          ))}
        </div>

        {/* Progress strip */}
        <SkeletonBlock className="mt-6 h-2 w-full rounded-full" />

        {/* Content card grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonBlock className="h-44 w-full" key={index} />
          ))}
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </p>
    </main>
  );
}
