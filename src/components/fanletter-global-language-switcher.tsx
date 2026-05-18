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
    eyebrow: "GLOBAL SERVICE",
    label: "FanLetter 언어 선택",
  },
  en: {
    detail: `${supportedLocales.length} languages`,
    eyebrow: "GLOBAL SERVICE",
    label: "Select FanLetter language",
  },
  ja: {
    detail: `${supportedLocales.length} languages`,
    eyebrow: "GLOBAL SERVICE",
    label: "Select FanLetter language",
  },
  zh: {
    detail: `${supportedLocales.length} languages`,
    eyebrow: "GLOBAL SERVICE",
    label: "Select FanLetter language",
  },
  vi: {
    detail: `${supportedLocales.length} languages`,
    eyebrow: "GLOBAL SERVICE",
    label: "Select FanLetter language",
  },
  id: {
    detail: `${supportedLocales.length} languages`,
    eyebrow: "GLOBAL SERVICE",
    label: "Select FanLetter language",
  },
};

export function FanletterGlobalLanguageSwitcher({
  className,
  compact = false,
  locale,
  tight = false,
}: {
  className?: string;
  compact?: boolean;
  locale: Locale;
  tight?: boolean;
}) {
  const copy = copyByLocale[locale] ?? copyByLocale.ko;

  return (
    <div className={className}>
      <div
        className={cn(
          "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-[#44f26e]/28 bg-[#44f26e]/10 shadow-[0_18px_42px_rgba(0,0,0,0.2)] backdrop-blur-xl",
          tight ? "p-0.5" : "p-1",
        )}
      >
        <div
          className={cn(
            "hidden min-w-0 items-center gap-2 pl-3 pr-1",
            !tight && (compact ? "xl:flex" : "lg:flex"),
          )}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#44f26e] text-black">
            <Globe2 className="size-4" />
          </span>
          <span className="grid min-w-0 leading-none">
            <span className="text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-[#8dffa5]">
              {copy.eyebrow}
            </span>
            <span className="mt-1 truncate text-[0.7rem] font-semibold text-white/74">
              {copy.detail}
            </span>
          </span>
        </div>

        <LanguageSwitcher
          className={cn(
            "h-10 min-w-[7rem] border-[#44f26e]/26 bg-black/35 text-xs shadow-none sm:min-w-[8.5rem]",
            compact && "min-w-[6.85rem] sm:min-w-[8rem]",
            tight &&
              "h-12 w-[5.85rem] min-w-[5.85rem] max-w-[5.85rem] pl-3 pr-7 text-[0.72rem] sm:h-10 sm:w-auto sm:max-w-none",
          )}
          hideIcon={tight}
          label={copy.label}
          locale={locale}
          variant="fanletter"
        />
      </div>
    </div>
  );
}
