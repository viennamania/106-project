"use client";

// Error boundary for [lang] routes outside /fanletter (content/referral
// bridges, disclaimer, etc.). fanletter has its own error.tsx; this catches
// runtime errors elsewhere under [lang] so they get an on-brand recovery card
// instead of bubbling to the bare default. Locale is read from the pathname.
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function LocaleError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const pathname = usePathname();
  const locale = pathname?.split("/")[1] ?? "ko";
  const isKorean = locale === "ko";
  const homeHref = `/${locale}/fanletter`;

  useEffect(() => {
    console.error(error);
  }, [error]);

  const copy = isKorean
    ? {
        title: "문제가 발생했어요",
        body: "페이지를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        retry: "다시 시도",
        home: "홈으로",
      }
    : {
        title: "Something went wrong",
        body: "An error occurred while loading this page. Please try again in a moment.",
        retry: "Try again",
        home: "Go home",
      };

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 text-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <h1 className="text-xl font-semibold leading-tight [word-break:keep-all]">
          {copy.title}
        </h1>
        <p className="mt-2 text-sm font-medium leading-6 text-zinc-600 [word-break:keep-all]">
          {copy.body}
        </p>
        {error.digest ? (
          <p className="mt-3 break-all font-mono text-[0.7rem] text-zinc-400">
            {error.digest}
          </p>
        ) : null}
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-semibold !text-white transition hover:bg-zinc-800"
            onClick={() => unstable_retry()}
            type="button"
          >
            <RefreshCw className="size-4" />
            {copy.retry}
          </button>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50"
            href={homeHref}
          >
            {copy.home}
          </Link>
        </div>
      </div>
    </main>
  );
}
