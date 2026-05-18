"use client";

import Link from "next/link";
import { ArrowLeft, MessageCircleHeart } from "lucide-react";

import { FanletterAccountStatusLink } from "@/components/fanletter-account-status-link";
import { FanletterGlobalLanguageSwitcher } from "@/components/fanletter-global-language-switcher";
import type { Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";
import { cn } from "@/lib/utils";

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        back: "이전 화면",
        home: "FanLetter 홈",
      }
    : {
        back: "Previous screen",
        home: "FanLetter home",
      };
}

export function FanletterTabTopBar({
  actionHref,
  actionLabel,
  backHref,
  className,
  homeHref,
  locale,
  referralCode,
}: {
  actionHref?: string;
  actionLabel?: string;
  backHref?: string;
  className?: string;
  homeHref?: string;
  locale: Locale;
  referralCode: string | null;
}) {
  const copy = getCopy(locale);
  const resolvedHomeHref =
    homeHref ?? buildPathWithReferral(`/${locale}/fanletter`, referralCode);

  return (
    <header className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-2">
        {backHref ? (
          <Link
            aria-label={copy.back}
            className="hidden size-11 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/[0.06] text-white transition hover:bg-white/10 sm:inline-flex"
            href={backHref}
          >
            <ArrowLeft className="size-5" />
          </Link>
        ) : null}
        <Link
          aria-label={copy.home}
          className="flex min-h-11 min-w-0 items-center gap-2"
          href={resolvedHomeHref}
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#44f26e] text-black sm:size-9">
            <MessageCircleHeart className="size-5" />
          </span>
          <span className="hidden truncate text-xl font-semibold tracking-normal sm:inline">
            FanLetter
          </span>
        </Link>
      </div>

      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <FanletterGlobalLanguageSwitcher
          className="inline-flex sm:hidden"
          compact
          locale={locale}
          tight
        />
        <FanletterGlobalLanguageSwitcher
          className="hidden sm:inline-flex"
          locale={locale}
        />
        <FanletterAccountStatusLink
          className="max-w-[7.25rem] sm:max-w-[14rem]"
          locale={locale}
          referralCode={referralCode}
        />
        {actionHref && actionLabel ? (
          <Link
            className="hidden h-11 items-center justify-center rounded-full border border-white/16 px-4 text-sm font-semibold !text-white transition hover:border-white/36 lg:inline-flex"
            href={actionHref}
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </header>
  );
}
