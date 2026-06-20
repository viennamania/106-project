import { Bot, CheckCircle2, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type AIStarIdentityProps = {
  accentColor?: string | null;
  accentSecondary?: string | null;
  badgeLabel?: string;
  className?: string;
  compact?: boolean;
  meta?: string | null;
  name: string;
  portraitImageUrl?: string | null;
  portraitInitials?: string | null;
  statusLabel?: string | null;
  universeName?: string | null;
};

function getInitials(name: string, fallback?: string | null) {
  if (fallback?.trim()) {
    return fallback.trim().slice(0, 2).toUpperCase();
  }

  const normalized = name
    .replace(/[^a-zA-Z0-9가-힣\s]/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  if (!normalized) {
    return "AI";
  }

  const parts = normalized.split(" ");

  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : normalized.slice(0, 2))
    .toUpperCase();
}

export function FanletterAIStarIdentity({
  accentColor = "#111827",
  accentSecondary = "#a1a1aa",
  badgeLabel = "AI STAR",
  className,
  compact = false,
  meta,
  name,
  portraitImageUrl,
  portraitInitials,
  statusLabel,
  universeName,
}: AIStarIdentityProps) {
  const initials = getInitials(name, portraitInitials);
  const sizeClass = compact ? "size-14 rounded-2xl" : "size-20 rounded-[1.35rem]";
  const titleClass = compact ? "text-lg" : "text-2xl";

  return (
    <div
      className={cn(
        "min-w-0 rounded-[1.25rem] border border-zinc-200 bg-white p-3 shadow-[0_16px_42px_rgba(15,23,42,0.06)]",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "relative flex shrink-0 items-center justify-center overflow-hidden border border-zinc-200 bg-zinc-100 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.12)]",
            sizeClass,
          )}
          style={{
            background: portraitImageUrl
              ? undefined
              : `linear-gradient(145deg, ${accentColor ?? "#111827"}, ${
                  accentSecondary ?? "#a1a1aa"
                })`,
          }}
        >
          {portraitImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- AI Star portraits can come from mock, uploads, or external sources not configured for next/image.
            <img
              alt={`${name} AI Star`}
              className="absolute inset-0 size-full object-cover"
              src={portraitImageUrl}
            />
          ) : (
            initials
          )}
          <span className="absolute inset-0 ring-1 ring-inset ring-white/18" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-1 text-[0.62rem] font-semibold leading-none text-white">
              <Sparkles className="size-3" />
              {badgeLabel}
            </span>
            {statusLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.62rem] font-semibold leading-none text-emerald-800">
                <CheckCircle2 className="size-3" />
                {statusLabel}
              </span>
            ) : null}
          </div>
          <p
            className={cn(
              "mt-2 truncate font-semibold leading-tight tracking-normal text-zinc-950",
              titleClass,
            )}
          >
            {name}
          </p>
          {universeName ? (
            <p className="mt-1 truncate text-sm font-semibold text-zinc-500">
              {universeName}
            </p>
          ) : null}
          {meta ? (
            <p className="mt-1 inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-zinc-500">
              <Bot className="size-3.5 shrink-0" />
              <span className="truncate">{meta}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
