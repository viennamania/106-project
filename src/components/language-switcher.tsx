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

export function LanguageSwitcher({
  label,
  locale,
}: {
  label: string;
  locale: Locale;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="relative flex h-11 min-w-[152px] items-center rounded-full border border-slate-200 bg-white pl-4 pr-10 text-sm font-medium text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
      <span className="sr-only">{label}</span>
      <Globe className="mr-2 size-4 text-slate-500" />
      <select
        aria-label={label}
        className="w-full appearance-none bg-transparent pr-3 outline-none"
        disabled={isPending}
        onChange={(event) => {
          const nextLocale = event.target.value as Locale;
          const nextPathname = replaceLocaleInPathname(pathname, nextLocale);

          startTransition(() => {
            router.replace(nextPathname, { scroll: false });
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
      <ChevronDown className="pointer-events-none absolute right-4 size-4 text-slate-500" />
    </label>
  );
}
