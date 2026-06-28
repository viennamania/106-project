import Link from "next/link";
import type { ReactNode } from "react";

import { FanletterAccountStatusLink } from "@/components/fanletter-account-status-link";
import { FanletterBrandMark } from "@/components/fanletter-brand-mark";
import { FanletterGlobalLanguageSwitcher } from "@/components/fanletter-global-language-switcher";
import type { Locale } from "@/lib/i18n";
import { getFanletterNavLabels } from "@/lib/fanletter-nav-labels";
import { buildPathWithReferral } from "@/lib/landing-branding";

/**
 * Shared primary header for top-level FanLetter destinations (home, discovery,
 * my-ai, …) so the brand + 둘러보기/내 스타/만들기 nav + language/account controls
 * stay identical across pages on desktop. Renders as a self-contained flex row
 * meant to drop into a page's existing padded container.
 */
export function FanletterPrimaryHeader({
  aside,
  current,
  locale,
  referralCode,
}: {
  /** Optional page-specific trailing element (e.g. a status badge). */
  aside?: ReactNode;
  /** The active top-level destination, highlighted in the nav. */
  current?: "create" | "discovery" | "feed" | "founder-club" | "my-ai";
  locale: Locale;
  referralCode: string | null;
}) {
  const navItemClassName = (active: boolean) =>
    active
      ? "inline-flex min-h-8 items-center whitespace-nowrap rounded-full bg-black px-3 !text-white transition hover:bg-zinc-800"
      : "inline-flex min-h-8 items-center whitespace-nowrap rounded-full px-3 transition hover:bg-zinc-100 hover:text-black";
  const homeHref = buildPathWithReferral(`/${locale}/fanletter`, referralCode);
  const discoveryHref = buildPathWithReferral(
    `/${locale}/fanletter/discovery`,
    referralCode,
  );
  const feedHref = buildPathWithReferral(
    `/${locale}/fanletter/feed`,
    referralCode,
  );
  const myAiHref = buildPathWithReferral(
    `/${locale}/fanletter/my-ai`,
    referralCode,
  );
  const founderClubHref = buildPathWithReferral(
    `/${locale}/fanletter/founder-club`,
    referralCode,
  );
  // '만들기' tab routes to the creator activation hub (creator-unlock); the hub
  // links onward to the vlog creation tool (/create) once activated.
  const createHref = buildPathWithReferral(
    `/${locale}/fanletter/creator-unlock`,
    referralCode,
  );
  const navLabels = getFanletterNavLabels(locale);

  return (
    <header className="flex items-center justify-between gap-2 sm:gap-4">
      <Link className="flex min-h-11 min-w-0 items-center gap-2" href={homeHref}>
        <FanletterBrandMark className="size-9 shrink-0" />
        <span className="truncate text-xl font-semibold tracking-tight text-black">
          AIAVpark
        </span>
      </Link>

      <nav
        aria-label={locale === "ko" ? "핵심 여정" : "Primary journey"}
        className="hidden items-center gap-1.5 rounded-full border border-zinc-200 bg-white/72 p-1 text-xs font-semibold text-black/62 md:flex lg:gap-2 lg:text-sm"
      >
        <Link
          aria-current={current === "discovery" ? "page" : undefined}
          className={navItemClassName(current === "discovery")}
          href={discoveryHref}
        >
          {navLabels.browse}
        </Link>
        <Link
          aria-current={current === "feed" ? "page" : undefined}
          className={navItemClassName(current === "feed")}
          href={feedHref}
        >
          {navLabels.feed}
        </Link>
        <Link
          aria-current={current === "my-ai" ? "page" : undefined}
          className={navItemClassName(current === "my-ai")}
          href={myAiHref}
        >
          {navLabels.myStars}
        </Link>
        <Link
          aria-current={current === "founder-club" ? "page" : undefined}
          className={navItemClassName(current === "founder-club")}
          href={founderClubHref}
        >
          {navLabels.club}
        </Link>
        <Link
          aria-current={current === "create" ? "page" : undefined}
          className={navItemClassName(current === "create")}
          href={createHref}
        >
          {navLabels.create}
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
