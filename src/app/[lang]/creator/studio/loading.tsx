function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/80 ${className}`} />;
}

function SkeletonCard() {
  return (
    <div className="rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="size-11 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-3/5" />
          <SkeletonBlock className="h-3 w-4/5" />
        </div>
      </div>
      <SkeletonBlock className="mt-4 h-32 w-full rounded-[20px]" />
      <div className="mt-4 flex gap-2">
        <SkeletonBlock className="h-9 flex-1 rounded-full" />
        <SkeletonBlock className="h-9 w-20 rounded-full" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-0 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-0 sm:gap-5 sm:px-6 sm:py-6 lg:px-8">
      <section className="sticky top-0 z-30 overflow-hidden border-b border-slate-200/80 bg-white/94 px-3 py-2 backdrop-blur-xl sm:static sm:rounded-[28px] sm:border sm:border-white/80 sm:px-6 sm:py-5 sm:shadow-[0_20px_48px_rgba(15,23,42,0.10)]">
        <span className="sr-only">Loading creator studio</span>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <SkeletonBlock className="size-10 shrink-0 rounded-full sm:size-12 sm:rounded-2xl" />
            <div className="min-w-0 space-y-2">
              <SkeletonBlock className="h-4 w-36 sm:w-52" />
              <SkeletonBlock className="h-3 w-48 max-w-[60vw] sm:w-96" />
            </div>
          </div>
          <SkeletonBlock className="size-10 shrink-0 rounded-full sm:h-11 sm:w-24" />
        </div>
        <div className="mt-4 hidden flex-wrap gap-2 sm:flex">
          <SkeletonBlock className="h-9 w-24 rounded-full" />
          <SkeletonBlock className="h-9 w-28 rounded-full" />
          <SkeletonBlock className="h-9 w-24 rounded-full" />
          <SkeletonBlock className="h-9 w-32 rounded-full" />
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="space-y-3 sm:space-y-5">
          <SkeletonCard />
          <div className="grid gap-3 sm:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    </main>
  );
}
