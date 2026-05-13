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
  tone = "default",
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
  tone?: "default" | "fanletter";
  title: string;
  onRefresh: () => void;
}) {
  const isFanletterTone = tone === "fanletter";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 overflow-hidden border-b px-3 py-2 shadow-none backdrop-blur-xl sm:top-[calc(env(safe-area-inset-top)+0.75rem)] sm:rounded-[28px] sm:border sm:px-6 sm:py-5 lg:static",
        isFanletterTone
          ? "border-[#44f26e]/18 bg-[#07100b]/94 sm:border-[#44f26e]/18 sm:bg-[linear-gradient(135deg,#07100b,#0b1710_52%,#102019)] sm:shadow-[0_24px_70px_rgba(0,0,0,0.24)]"
          : "border-slate-200/80 bg-white/94 sm:border-white/80 sm:bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.72),transparent_34%),radial-gradient(circle_at_right,rgba(254,240,138,0.34),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] sm:shadow-[0_24px_60px_rgba(15,23,42,0.10)]",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-6 top-0 hidden h-px sm:block",
          isFanletterTone
            ? "bg-[linear-gradient(90deg,transparent,rgba(68,242,110,0.58),transparent)]"
            : "bg-[linear-gradient(90deg,transparent,rgba(148,163,184,0.6),transparent)]",
        )}
      />
      <div className="relative flex flex-col gap-2 sm:gap-4">
        <div className="flex items-center justify-between gap-3 sm:items-start">
          <div className="flex min-w-0 items-center gap-2 sm:items-start sm:gap-3">
            <Link
              className={cn(
                "inline-flex size-10 shrink-0 items-center justify-center rounded-full border shadow-none transition sm:size-12 sm:rounded-2xl sm:shadow-[0_14px_28px_rgba(15,23,42,0.10)] sm:hover:-translate-y-0.5",
                isFanletterTone
                  ? "border-white/14 bg-white/[0.06] text-white hover:bg-white/10 sm:border-white/14 sm:bg-white/[0.07] sm:hover:border-[#44f26e]/40 sm:hover:bg-white/10"
                  : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50 sm:border-white/80 sm:bg-white/92 sm:hover:border-slate-200 sm:hover:bg-white",
              )}
              href={backHref}
            >
              <ArrowLeft className="size-4 sm:size-5" />
            </Link>
            <div className="min-w-0">
              <p
                className={cn(
                  "eyebrow hidden sm:block",
                  isFanletterTone && "!text-[#44f26e]",
                )}
              >
                {eyebrow}
              </p>
              <h1
                className={cn(
                  "truncate text-base font-semibold tracking-tight sm:text-[1.45rem]",
                  isFanletterTone ? "text-white" : "text-slate-950",
                )}
              >
                {title}
              </h1>
              <p
                className={cn(
                  "mt-0.5 line-clamp-1 max-w-2xl text-xs leading-5 sm:mt-1 sm:line-clamp-none sm:text-sm sm:leading-6",
                  isFanletterTone ? "text-white/62" : "text-slate-500 sm:text-slate-600",
                )}
              >
                {description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {shortcutHref && shortcutLabel ? (
              <Link
                className={cn(
                  "hidden h-11 items-center justify-center rounded-full border px-4 text-sm font-semibold shadow-[0_14px_28px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 sm:inline-flex",
                  isFanletterTone
                    ? "border-[#44f26e]/40 bg-[#44f26e] !text-black hover:border-[#64ff84] hover:bg-[#64ff84]"
                    : "border-white/80 bg-white/92 text-slate-950 hover:border-slate-200 hover:bg-white",
                )}
                href={shortcutHref}
              >
                {shortcutLabel}
              </Link>
            ) : null}
            <button
              aria-busy={refreshLoading}
              className={cn(
                "inline-flex size-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border text-sm font-semibold shadow-none transition disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:w-auto sm:px-4 sm:shadow-[0_14px_28px_rgba(15,23,42,0.08)] sm:hover:-translate-y-0.5",
                isFanletterTone
                  ? "border-white/14 bg-white/[0.06] text-white hover:bg-white/10 sm:border-white/14 sm:bg-white/[0.07] sm:hover:border-[#44f26e]/40 sm:hover:bg-white/10"
                  : "border-slate-200 bg-white text-slate-950 hover:bg-slate-50 sm:border-white/80 sm:bg-white/92 sm:hover:border-slate-200 sm:hover:bg-white",
              )}
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

export function CreatorStudioTabs({
  items,
  tone = "default",
}: {
  items: CreatorStudioTabItem[];
  tone?: "default" | "fanletter";
}) {
  const isFanletterTone = tone === "fanletter";

  return (
    <nav className="hidden gap-2 sm:flex sm:overflow-x-auto sm:pb-1">
      {items.map((item) => (
        <Link
          className={cn(
            "inline-flex h-10 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-medium transition",
            item.isActive && isFanletterTone
              ? "border-[#44f26e] bg-[#44f26e] !text-black shadow-[0_16px_36px_rgba(68,242,110,0.18)]"
              : item.isActive
                ? "border-slate-950 bg-slate-950 !text-white shadow-[0_16px_36px_rgba(15,23,42,0.22)] [text-shadow:0_1px_12px_rgba(255,255,255,0.12)]"
                : isFanletterTone
                  ? "border-white/12 bg-[#07100b] text-white hover:border-[#44f26e]/42 hover:bg-[#0b1510]"
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
