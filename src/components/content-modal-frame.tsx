"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function ContentModalFrame({
  children,
  closeLabel,
}: {
  children: ReactNode;
  closeLabel: string;
}) {
  const router = useRouter();
  const close = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [close]);

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/58 backdrop-blur-sm motion-safe:animate-[content-modal-backdrop_180ms_ease-out]">
      <button
        aria-label={closeLabel}
        className="absolute inset-0 hidden h-full w-full cursor-default sm:block"
        onClick={close}
        type="button"
      />
      <div className="relative z-10 flex h-[100dvh] w-full justify-center sm:p-4">
        <div
          aria-modal="true"
          className="relative flex h-full w-full flex-col overflow-hidden bg-[#fafafa] shadow-[0_28px_90px_rgba(2,6,23,0.34)] motion-safe:animate-[content-modal-panel_220ms_cubic-bezier(0.16,1,0.3,1)] sm:max-w-3xl sm:rounded-[30px] sm:border sm:border-white/60"
          role="dialog"
        >
          <div className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-center border-b border-slate-200/80 bg-[#fafafa]/92 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:h-13 sm:pt-0">
            <span className="h-1.5 w-12 rounded-full bg-slate-300 sm:hidden" />
            <button
              aria-label={closeLabel}
              className="absolute right-3 top-[calc(env(safe-area-inset-top)+0.5rem)] inline-flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200 hover:text-slate-950 sm:top-2"
              onClick={close}
              type="button"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
