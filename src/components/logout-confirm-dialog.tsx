"use client";

import { useEffect } from "react";

export function LogoutConfirmDialog({
  cancelLabel,
  confirmLabel,
  description,
  onCancel,
  onConfirm,
  open,
  title,
}: {
  cancelLabel: string;
  confirmLabel: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeydown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-labelledby="logout-confirm-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/48 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-6 sm:items-center sm:px-6 sm:py-10"
      role="dialog"
    >
      <button
        aria-label={cancelLabel}
        className="absolute inset-0 cursor-default"
        onClick={onCancel}
        type="button"
      />
      <div className="relative w-full max-w-md rounded-[30px] border border-white/75 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.22)] sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
          Pocket Smart Wallet
        </p>
        <h2
          className="mt-3 text-2xl font-semibold tracking-tight text-slate-950"
          id="logout-confirm-title"
        >
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
