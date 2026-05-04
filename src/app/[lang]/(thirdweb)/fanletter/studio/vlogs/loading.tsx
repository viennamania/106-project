import { Clapperboard, MessageCircleHeart } from "lucide-react";

export default function FanletterVlogsLoading() {
  return (
    <main className="min-h-screen bg-[#030504] text-white">
      <section className="px-4 pb-8 pt-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex items-center justify-between gap-3">
            <div className="size-11 rounded-full border border-white/14 bg-white/[0.04]" />
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-[#44f26e] text-black">
                <MessageCircleHeart className="size-5" />
              </span>
              <span className="text-sm font-semibold">FanLetter</span>
            </div>
            <div className="size-11 rounded-full border border-white/14 bg-white/[0.04]" />
          </header>

          <div className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)] lg:items-end lg:py-14">
            <div>
              <div className="h-4 w-48 rounded-full bg-[#44f26e]/30 motion-safe:animate-pulse" />
              <div className="mt-5 h-12 w-72 max-w-full rounded-full bg-white/10 motion-safe:animate-pulse" />
              <div className="mt-4 h-5 w-full max-w-2xl rounded-full bg-white/10 motion-safe:animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  className="rounded-lg border border-white/12 bg-white/[0.04] p-4"
                  key={index}
                >
                  <div className="h-3 w-20 rounded-full bg-white/10 motion-safe:animate-pulse" />
                  <div className="mt-4 h-8 w-14 rounded-full bg-white/10 motion-safe:animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f6f8f4] px-4 py-8 text-black sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)]">
          <aside className="rounded-lg border border-black/10 bg-white p-5">
            <Clapperboard className="size-8 text-[#16702e]" />
            <div className="mt-5 h-8 w-3/4 rounded-full bg-black/10 motion-safe:animate-pulse" />
            <div className="mt-5 grid gap-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  className="h-16 rounded-lg bg-black/[0.06] motion-safe:animate-pulse"
                  key={index}
                />
              ))}
            </div>
          </aside>
          <div className="rounded-lg border border-black/10 bg-white p-5">
            <div className="h-8 w-48 rounded-full bg-black/10 motion-safe:animate-pulse" />
            <div className="mt-5 h-12 rounded-full bg-black/[0.06] motion-safe:animate-pulse" />
            <div className="mt-5 grid gap-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  className="h-48 rounded-lg bg-black/[0.06] motion-safe:animate-pulse"
                  key={index}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
