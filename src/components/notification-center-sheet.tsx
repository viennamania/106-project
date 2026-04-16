"use client";

import { useEffect, type ReactNode } from "react";
import { CheckCheck, X } from "lucide-react";

type NotificationCenterSheetProps = {
  children: ReactNode;
  closeLabel: string;
  eyebrow: string;
  markAllDisabled?: boolean;
  markAllReadLabel: string;
  open: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
  title: string;
  unreadCountText: string;
};

export function NotificationCenterSheet({
  children,
  closeLabel,
  eyebrow,
  markAllDisabled = false,
  markAllReadLabel,
  onClose,
  onMarkAllRead,
  open,
  title,
  unreadCountText,
}: NotificationCenterSheetProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeydown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-labelledby="notification-center-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/52 px-0 pb-0 pt-6 backdrop-blur-sm sm:px-4 sm:py-6 lg:items-stretch lg:justify-end"
      role="dialog"
    >
      <button
        aria-label={closeLabel}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section className="relative flex h-[min(92vh,calc(100vh-8px))] w-full max-w-2xl flex-col overflow-hidden rounded-t-[32px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] shadow-[0_32px_90px_rgba(15,23,42,0.34)] sm:h-[min(88vh,calc(100vh-32px))] sm:rounded-[32px] lg:h-[calc(100vh-32px)] lg:max-w-[36rem]">
        <header className="border-b border-slate-200/80 bg-white/88 px-5 pb-4 pt-5 backdrop-blur md:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="eyebrow">{eyebrow}</p>
              <h3
                className="text-xl font-semibold tracking-tight text-slate-950"
                id="notification-center-title"
              >
                {title}
              </h3>
              <p className="text-sm leading-6 text-slate-600">{unreadCountText}</p>
            </div>
            <button
              aria-label={closeLabel}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
              onClick={onClose}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={markAllDisabled}
              onClick={onMarkAllRead}
              type="button"
            >
              <CheckCheck className="size-4" />
              {markAllReadLabel}
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4 md:px-6">
          {children}
        </div>
      </section>
    </div>
  );
}
