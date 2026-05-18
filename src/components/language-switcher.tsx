"use client";

import { Globe, ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  localeLabels,
  replaceLocaleInPathname,
  supportedLocales,
  type Locale,
} from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LanguageSwitcherVariant = "default" | "fanletter";

export function LanguageSwitcher({
  className,
  hideIcon = false,
  label,
  locale,
  variant = "default",
}: {
  className?: string;
  hideIcon?: boolean;
  label: string;
  locale: Locale;
  variant?: LanguageSwitcherVariant;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const styles =
    variant === "fanletter"
      ? {
          chevron: "text-[#8dffa5]",
          icon: "text-[#8dffa5]",
          root:
            "border border-[#44f26e]/28 bg-[#06120b]/88 text-white shadow-[0_14px_30px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:min-w-[142px] sm:w-auto",
          select: "text-white",
        }
      : {
          chevron: "text-slate-500",
          icon: "text-slate-500",
          root:
            "border border-slate-200 bg-white text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.08)] sm:min-w-[152px] sm:w-auto",
          select: "text-slate-900",
        };

  return (
    <label
      className={cn(
        "relative flex h-11 w-full min-w-0 items-center rounded-full pl-4 pr-10 text-sm font-medium",
        styles.root,
        className,
      )}
    >
      <span className="sr-only">{label}</span>
      {hideIcon ? null : <Globe className={cn("mr-2 size-4", styles.icon)} />}
      <select
        aria-label={label}
        className={cn(
          "h-full min-h-11 w-full appearance-none bg-transparent pr-3 outline-none disabled:cursor-wait disabled:opacity-70",
          styles.select,
        )}
        disabled={isPending}
        onChange={(event) => {
          const nextLocale = event.target.value as Locale;
          const nextPathname = replaceLocaleInPathname(pathname, nextLocale);
          const queryString =
            typeof window === "undefined"
              ? ""
              : window.location.search.slice(1);
          const nextHref = queryString
            ? `${nextPathname}?${queryString}`
            : nextPathname;

          startTransition(() => {
            router.replace(nextHref, { scroll: false });
          });
        }}
        value={locale}
      >
        {supportedLocales.map((value) => (
          <option key={value} value={value}>
            {localeLabels[value]}
          </option>
        ))}
      </select>
      <ChevronDown
        className={cn("pointer-events-none absolute right-4 size-4", styles.chevron)}
      />
    </label>
  );
}
