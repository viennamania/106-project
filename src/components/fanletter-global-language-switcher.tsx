"use client";

import { Globe2 } from "lucide-react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { supportedLocales, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const copyByLocale: Record<
  Locale,
  {
    detail: string;
    eyebrow: string;
    label: string;
  }
> = {
  ko: {
    detail: `${supportedLocales.length}개 언어 지원`,
    eyebrow: "글로벌 서비스",
    label: "AIAVpark 언어 선택",
  },
  en: {
    detail: `${supportedLocales.length} languages`,
    eyebrow: "GLOBAL SERVICE",
    label: "Select AIAVpark language",
  },
  ja: {
    detail: `${supportedLocales.length} languages`,
    eyebrow: "GLOBAL SERVICE",
    label: "Select AIAVpark language",
  },
  zh: {
    detail: `${supportedLocales.length} languages`,
    eyebrow: "GLOBAL SERVICE",
    label: "Select AIAVpark language",
  },
  vi: {
    detail: `${supportedLocales.length} languages`,
    eyebrow: "GLOBAL SERVICE",
    label: "Select AIAVpark language",
  },
  id: {
    detail: `${supportedLocales.length} languages`,
    eyebrow: "GLOBAL SERVICE",
    label: "Select AIAVpark language",
  },
};

export function FanletterGlobalLanguageSwitcher({
  className,
  compact = false,
  locale,
  surface = "dark",
  tight = false,
}: {
  className?: string;
  compact?: boolean;
  locale: Locale;
  surface?: "dark" | "light";
  tight?: boolean;
}) {
  const copy = copyByLocale[locale] ?? copyByLocale.ko;
  const isLightSurface = surface === "light";

  return (
    <div className={className}>
      <div
        className={cn(
          "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border backdrop-blur-xl",
          isLightSurface
            ? "border-zinc-200 bg-white/88 shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
            : "border-[#44f26e]/28 bg-[#44f26e]/10 shadow-[0_18px_42px_rgba(0,0,0,0.2)]",
          tight || compact ? "p-0.5" : "p-1",
        )}
      >
        <div
          className={cn(
            "hidden min-w-0 items-center gap-2 pl-3 pr-1",
            !tight && (compact ? "xl:flex" : "lg:flex"),
          )}
        >
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full",
              isLightSurface ? "bg-zinc-100 text-black" : "bg-[#44f26e] text-black",
            )}
          >
            <Globe2 className="size-4" />
          </span>
          <span className="grid min-w-0 leading-none">
            <span
              className={cn(
                "text-[0.62rem] font-semibold uppercase tracking-[0.18em]",
                isLightSurface ? "text-zinc-500" : "text-[#8dffa5]",
              )}
            >
              {copy.eyebrow}
            </span>
            <span
              className={cn(
                "mt-1 truncate text-[0.7rem] font-semibold",
                isLightSurface ? "text-black/58" : "text-white/74",
              )}
            >
              {copy.detail}
            </span>
          </span>
        </div>

        <LanguageSwitcher
          className={cn(
            "h-10 min-w-[7rem] text-xs shadow-none sm:min-w-[8.5rem]",
            isLightSurface
              ? "border-zinc-200 bg-white/95 text-zinc-950"
              : "border-[#44f26e]/26 bg-black/35",
            compact &&
              "w-[9.35rem] min-w-[9.35rem] max-w-[9.35rem] sm:w-auto sm:min-w-[8rem] sm:max-w-none",
            tight &&
              "!h-10 !w-[5.7rem] !min-w-[5.7rem] !max-w-[5.7rem] !pl-3 !pr-7 !text-[0.72rem] sm:!h-10 sm:!w-auto sm:!max-w-none",
          )}
          hideIcon={tight}
          label={copy.label}
          locale={locale}
          variant={isLightSurface ? "fanletterLight" : "fanletter"}
        />
      </div>
    </div>
  );
}
