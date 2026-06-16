"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function FanletterResponsiveActionPanel({
  children,
  closeLabel,
  description,
  eyebrow,
  footer,
  onClose,
  open,
  title,
}: {
  children: ReactNode;
  closeLabel: string;
  description?: string;
  eyebrow?: string;
  footer?: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-stretch sm:justify-end"
      role="dialog"
    >
      <button
        aria-label={closeLabel}
        className="absolute inset-0 cursor-default bg-black/42 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />
      <section
        className={joinClasses(
          "relative flex max-h-[86svh] w-full max-w-[42rem] flex-col overflow-hidden rounded-t-[1.35rem] border border-zinc-200 bg-white text-zinc-950 shadow-[0_-22px_80px_rgba(15,23,42,0.22)]",
          "sm:h-full sm:max-h-none sm:max-w-[27rem] sm:rounded-none sm:border-y-0 sm:border-r-0 sm:shadow-[0_0_80px_rgba(15,23,42,0.18)]",
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="mt-1 text-xl font-semibold leading-tight tracking-normal [word-break:keep-all]">
              {title}
            </h2>
            {description ? (
              <p className="mt-2 text-sm font-medium leading-6 text-zinc-600 [word-break:keep-all]">
                {description}
              </p>
            ) : null}
          </div>
          <button
            aria-label={closeLabel}
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-zinc-200 bg-zinc-50 px-4 py-3 sm:px-5">
            {footer}
          </div>
        ) : null}
      </section>
    </div>
  );
}
