"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCcw } from "lucide-react";

import { cn } from "@/lib/utils";

export type CreatorStudioHeaderStat = {
  label: string;
  loading?: boolean;
  value: string;
};

export type CreatorStudioTabItem = {
  href: string;
  isActive: boolean;
  label: string;
};

export function CreatorStudioHeader({
  backHref,
  description,
  eyebrow,
  refreshDisabled = false,
  refreshLabel,
  refreshLoading = false,
  shortcutHref = null,
  shortcutLabel = null,
  stats = [],
  title,
  onRefresh,
}: {
  backHref: string;
  description: string;
  eyebrow: string;
  refreshDisabled?: boolean;
  refreshLabel: string;
  refreshLoading?: boolean;
  shortcutHref?: string | null;
  shortcutLabel?: string | null;
  stats?: CreatorStudioHeaderStat[];
  title: string;
  onRefresh: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 overflow-hidden border-b border-slate-200/80 bg-white/94 px-3 py-2 shadow-none backdrop-blur-xl sm:top-[calc(env(safe-area-inset-top)+0.75rem)] sm:rounded-[28px] sm:border sm:border-white/80 sm:bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.72),transparent_34%),radial-gradient(circle_at_right,rgba(254,240,138,0.34),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] sm:px-6 sm:py-5 sm:shadow-[0_24px_60px_rgba(15,23,42,0.10)] lg:static">
      <div className="pointer-events-none absolute inset-x-6 top-0 hidden h-px bg-[linear-gradient(90deg,transparent,rgba(148,163,184,0.6),transparent)] sm:block" />
      <div className="relative flex flex-col gap-2 sm:gap-4">
        <div className="flex items-center justify-between gap-3 sm:items-start">
          <div className="flex min-w-0 items-center gap-2 sm:items-start sm:gap-3">
            <Link
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-none transition hover:bg-slate-50 sm:size-12 sm:rounded-2xl sm:border-white/80 sm:bg-white/92 sm:shadow-[0_14px_28px_rgba(15,23,42,0.10)] sm:hover:-translate-y-0.5 sm:hover:border-slate-200 sm:hover:bg-white"
              href={backHref}
            >
              <ArrowLeft className="size-4 sm:size-5" />
            </Link>
            <div className="min-w-0">
              <p className="eyebrow hidden sm:block">{eyebrow}</p>
              <h1 className="truncate text-base font-semibold tracking-tight text-slate-950 sm:text-[1.45rem]">
                {title}
              </h1>
              <p className="mt-0.5 line-clamp-1 max-w-2xl text-xs leading-5 text-slate-500 sm:mt-1 sm:line-clamp-none sm:text-sm sm:leading-6 sm:text-slate-600">
                {description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {shortcutHref && shortcutLabel ? (
              <Link
                className="hidden h-11 items-center justify-center rounded-full border border-white/80 bg-white/92 px-4 text-sm font-semibold text-slate-950 shadow-[0_14px_28px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white sm:inline-flex"
                href={shortcutHref}
              >
                {shortcutLabel}
              </Link>
            ) : null}
            <button
              aria-busy={refreshLoading}
              className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-950 shadow-none transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:w-auto sm:border-white/80 sm:bg-white/92 sm:px-4 sm:shadow-[0_14px_28px_rgba(15,23,42,0.08)] sm:hover:-translate-y-0.5 sm:hover:border-slate-200 sm:hover:bg-white"
              disabled={refreshDisabled}
              onClick={onRefresh}
              type="button"
            >
              <RefreshCcw
                className={cn("size-4", refreshLoading && "animate-spin")}
              />
              <span className="hidden sm:inline">{refreshLabel}</span>
            </button>
          </div>
        </div>

        {stats.length > 0 ? (
          <div className="hidden grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {stats.map((stat) => (
              <CreatorStudioHeaderStatChip
                key={`${stat.label}:${stat.value}`}
                label={stat.label}
                loading={stat.loading}
                value={stat.value}
              />
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function CreatorStudioTabs({ items }: { items: CreatorStudioTabItem[] }) {
  return (
    <nav className="hidden gap-2 sm:flex sm:overflow-x-auto sm:pb-1">
      {items.map((item) => (
        <Link
          className={cn(
            "inline-flex h-10 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-medium transition",
            item.isActive
              ? "border-slate-950 bg-slate-950 !text-white shadow-[0_16px_36px_rgba(15,23,42,0.22)] [text-shadow:0_1px_12px_rgba(255,255,255,0.12)]"
              : "border-slate-200 bg-white text-slate-950 hover:border-slate-300 hover:bg-slate-50",
          )}
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function CreatorStudioHeaderStatChip({
  label,
  loading = false,
  value,
}: CreatorStudioHeaderStat) {
  return (
    <div className="min-w-[128px] rounded-[20px] border border-white/80 bg-white/88 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur">
      <p className="max-w-[10rem] truncate text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      {loading ? (
        <div className="mt-2 h-7 w-16 rounded-full bg-slate-200/80 motion-safe:animate-pulse" />
      ) : (
        <p className="mt-1 max-w-[10rem] truncate text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
          {value}
        </p>
      )}
    </div>
  );
}
