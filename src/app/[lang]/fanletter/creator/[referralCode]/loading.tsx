export default function FanletterCreatorLoading() {
  return (
    <main className="min-h-screen bg-[#030504] text-white">
      <section className="border-b border-white/10 px-4 pb-10 pt-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-2">
            <span className="size-9 rounded-lg bg-[#44f26e]" />
            <span className="h-6 w-32 rounded-full bg-white/12" />
          </div>
          <div className="grid gap-8 pt-14 sm:pt-24 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,25rem)] lg:items-end">
            <div>
              <div className="h-4 w-48 rounded-full bg-[#44f26e]/40" />
              <div className="mt-5 h-14 max-w-3xl rounded-lg bg-white/12 sm:h-24" />
              <div className="mt-4 h-5 max-w-xl rounded-full bg-white/10" />
              <div className="mt-8 flex gap-3">
                <div className="h-12 w-36 rounded-full bg-[#44f26e]/70" />
                <div className="h-12 w-32 rounded-full border border-white/14 bg-white/8" />
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-white/12 bg-white/[0.055]">
              <div className="aspect-[4/5] animate-pulse bg-white/10" />
              <div className="grid grid-cols-3 gap-2 border-t border-white/10 p-4">
                <div className="h-16 rounded-lg bg-white/8" />
                <div className="h-16 rounded-lg bg-white/8" />
                <div className="h-16 rounded-lg bg-white/8" />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-[#f6f8f4] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[92rem] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div
              className="aspect-[9/14] animate-pulse rounded-lg bg-black/10"
              key={item}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
