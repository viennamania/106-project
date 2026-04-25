function ProfileSkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/80 ${className}`} />;
}

function ProfileFormSkeleton() {
  return (
    <div className="border-y border-slate-200/80 bg-white p-4 shadow-none sm:rounded-[30px] sm:border sm:border-white/80 sm:bg-white/80 sm:p-5 sm:shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="flex items-start gap-3">
        <ProfileSkeletonBlock className="size-12 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2 pt-1">
          <ProfileSkeletonBlock className="h-3 w-24" />
          <ProfileSkeletonBlock className="h-6 w-40" />
        </div>
      </div>
      <div className="mt-5 space-y-4">
        <ProfileSkeletonBlock className="h-20 w-full" />
        <ProfileSkeletonBlock className="h-28 w-full" />
        <ProfileSkeletonBlock className="h-20 w-full" />
        <div className="flex items-center gap-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
          <ProfileSkeletonBlock className="size-20 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <ProfileSkeletonBlock className="h-4 w-32" />
            <ProfileSkeletonBlock className="h-10 w-full max-w-56 rounded-full" />
          </div>
        </div>
        <ProfileSkeletonBlock className="h-11 w-full max-w-40 rounded-full" />
      </div>
    </div>
  );
}

function AutomationSkeleton() {
  return (
    <div className="border-y border-slate-200/80 bg-white p-4 shadow-none sm:rounded-[30px] sm:border sm:border-white/80 sm:bg-white/80 sm:p-5 sm:shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <ProfileSkeletonBlock className="h-3 w-28" />
          <ProfileSkeletonBlock className="h-6 w-36" />
        </div>
        <ProfileSkeletonBlock className="h-8 w-20 rounded-full" />
      </div>
      <div className="mt-5 space-y-3">
        <ProfileSkeletonBlock className="h-12 w-full" />
        <ProfileSkeletonBlock className="h-24 w-full" />
        <ProfileSkeletonBlock className="h-11 w-full rounded-full" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-3 px-0 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-0 sm:gap-5 sm:px-6 sm:py-6 lg:px-8">
      <section className="sticky top-0 z-30 overflow-hidden border-b border-slate-200/80 bg-white/94 px-3 py-2 backdrop-blur-xl sm:top-[calc(env(safe-area-inset-top)+0.75rem)] sm:rounded-[28px] sm:border sm:border-white/80 sm:px-6 sm:py-5 sm:shadow-[0_20px_48px_rgba(15,23,42,0.10)] lg:static">
        <span className="sr-only">Loading creator profile</span>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <ProfileSkeletonBlock className="size-10 shrink-0 rounded-full sm:size-12 sm:rounded-2xl" />
            <div className="min-w-0 space-y-2">
              <ProfileSkeletonBlock className="h-4 w-32 sm:w-44" />
              <ProfileSkeletonBlock className="h-3 w-44 max-w-[58vw] sm:w-80" />
            </div>
          </div>
          <ProfileSkeletonBlock className="size-10 shrink-0 rounded-full sm:h-11 sm:w-24" />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl">
        <div className="grid gap-3 sm:gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <ProfileFormSkeleton />
          <div className="space-y-3 sm:space-y-5">
            <AutomationSkeleton />
            <AutomationSkeleton />
          </div>
        </div>
      </section>
    </main>
  );
}
