import Link from "next/link";
import type { ReactNode } from "react";

import { FanletterAccountStatusLink } from "@/components/fanletter-account-status-link";
import { FanletterBrandMark } from "@/components/fanletter-brand-mark";
import { FanletterGlobalLanguageSwitcher } from "@/components/fanletter-global-language-switcher";
import type { Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";

/**
 * Shared primary header for top-level FanLetter destinations (home, discovery,
 * growth, my-ai, …) so the brand + 발견/성장/내 AI nav + language/account controls
 * stay identical across pages on desktop. Renders as a self-contained flex row
 * meant to drop into a page's existing padded container.
 */
export function FanletterPrimaryHeader({
  aside,
  locale,
  referralCode,
}: {
  /** Optional page-specific trailing element (e.g. a status badge). */
  aside?: ReactNode;
  locale: Locale;
  referralCode: string | null;
}) {
  const homeHref = buildPathWithReferral(`/${locale}/fanletter`, referralCode);
  const discoveryHref = buildPathWithReferral(
    `/${locale}/fanletter/discovery`,
    referralCode,
  );
  const growthHref = buildPathWithReferral(
    `/${locale}/fanletter/growth`,
    referralCode,
  );
  const myAiHref = buildPathWithReferral(
    `/${locale}/fanletter/my-ai`,
    referralCode,
  );

  return (
    <header className="flex items-center justify-between gap-2 sm:gap-4">
      <Link className="flex min-h-11 min-w-0 items-center gap-2" href={homeHref}>
        <FanletterBrandMark className="size-9 shrink-0" />
        <span className="hidden truncate text-xl font-semibold tracking-tight text-black sm:inline">
          AIAVpark
        </span>
      </Link>

      <nav
        aria-label={locale === "ko" ? "핵심 여정" : "Primary journey"}
        className="hidden items-center gap-1.5 rounded-full border border-zinc-200 bg-white/72 p-1 text-xs font-semibold text-black/62 md:flex lg:gap-2 lg:text-sm"
      >
        <Link
          className="inline-flex min-h-8 items-center rounded-full px-3 transition hover:bg-zinc-100 hover:text-black"
          href={discoveryHref}
        >
          {locale === "ko" ? "발견" : "Discovery"}
        </Link>
        <Link
          className="inline-flex min-h-8 items-center rounded-full px-3 transition hover:bg-zinc-100 hover:text-black"
          href={growthHref}
        >
          {locale === "ko" ? "성장" : "Growth"}
        </Link>
        <Link
          className="inline-flex min-h-8 items-center rounded-full bg-black px-3 !text-white transition hover:bg-zinc-800"
          href={myAiHref}
        >
          {locale === "ko" ? "내 AI" : "My AI"}
        </Link>
      </nav>

      <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
        {aside}
        <FanletterGlobalLanguageSwitcher
          className="inline-flex sm:hidden"
          compact
          locale={locale}
          surface="light"
          tight
        />
        <FanletterGlobalLanguageSwitcher
          className="hidden sm:inline-flex"
          locale={locale}
          surface="light"
        />
        <FanletterAccountStatusLink
          className="max-w-[6.8rem] sm:max-w-[14rem]"
          locale={locale}
          referralCode={referralCode}
          surface="light"
        />
      </div>
    </header>
  );
}
