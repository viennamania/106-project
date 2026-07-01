"use client";

// 404 boundary for the [lang] segment (routes outside /fanletter that call
// notFound() or an unmatched top-level path such as a mistyped /ko/<x>).
// Without this, those fall back to the bare default Next.js 404. Locale is
// read from the pathname so the copy + home link match what the user browses.
import { Compass } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function LocaleNotFound() {
  const pathname = usePathname();
  const locale = pathname?.split("/")[1] ?? "ko";
  const isKorean = locale === "ko";
  const homeHref = `/${locale}/fanletter`;

  const copy = isKorean
    ? {
        eyebrow: "404",
        title: "페이지를 찾을 수 없어요",
        body: "요청하신 페이지가 없거나 이동되었습니다. AIAVpark에서 다시 시작해 보세요.",
        home: "AIAVpark로 이동",
      }
    : {
        eyebrow: "404",
        title: "Page not found",
        body: "The page you requested does not exist or was moved. Start again from AIAVpark.",
        home: "Go to AIAVpark",
      };

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 text-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
          {copy.eyebrow}
        </p>
        <h1 className="mt-2 text-xl font-semibold leading-tight [word-break:keep-all]">
          {copy.title}
        </h1>
        <p className="mt-2 text-sm font-medium leading-6 text-zinc-600 [word-break:keep-all]">
          {copy.body}
        </p>
        <div className="mt-6">
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold !text-white transition hover:bg-zinc-800"
            href={homeHref}
          >
            <Compass className="size-4" />
            {copy.home}
          </Link>
        </div>
      </div>
    </main>
  );
}
