"use client";

import Link from "next/link";
import { ArrowLeft, Newspaper } from "lucide-react";

import { FanletterAccountStatusLink } from "@/components/fanletter-account-status-link";
import { FanletterBrandMark } from "@/components/fanletter-brand-mark";
import { FanletterGlobalLanguageSwitcher } from "@/components/fanletter-global-language-switcher";
import type { Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";
import { cn } from "@/lib/utils";

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        back: "이전 화면",
        reports: "리포트",
        home: "AIAVpark 홈",
      }
    : {
        back: "Previous screen",
        reports: "Reports",
        home: "AIAVpark home",
      };
}

export function FanletterTabTopBar({
  actionHref,
  actionLabel,
  accountActivateHref,
  accountConnectHref,
  accountFallbackHref,
  backHref,
  className,
  homeHref,
  locale,
  referralCode,
  reportsHref,
  reportsLabel,
}: {
  actionHref?: string;
  actionLabel?: string;
  accountActivateHref?: string;
  accountConnectHref?: string;
  accountFallbackHref?: string;
  backHref?: string;
  className?: string;
  homeHref?: string;
  locale: Locale;
  referralCode: string | null;
  reportsHref?: string;
  reportsLabel?: string;
}) {
  const copy = getCopy(locale);
  const resolvedHomeHref =
    homeHref ?? buildPathWithReferral(`/${locale}/fanletter`, referralCode);
  const resolvedReportsHref = reportsHref ?? buildPathWithReferral(
    `/${locale}/fanletter/reports`,
    referralCode,
  );

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
          <FanletterBrandMark className="size-11 sm:size-9" />
          <span className="hidden truncate text-xl font-semibold tracking-normal sm:inline">
            AIAVpark
          </span>
        </Link>
      </div>

      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <Link
          className="hidden h-10 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.045] px-3 text-xs font-semibold !text-white/78 transition hover:border-[#44f26e]/36 hover:bg-white/[0.075] hover:!text-white lg:inline-flex"
          href={resolvedReportsHref}
        >
          <Newspaper className="size-4 text-[#44f26e]" />
          {reportsLabel ?? copy.reports}
        </Link>
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
          accountActivateHref={accountActivateHref}
          accountConnectHref={accountConnectHref}
          accountFallbackHref={accountFallbackHref}
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
