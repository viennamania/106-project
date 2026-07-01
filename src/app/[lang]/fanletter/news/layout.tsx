import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { FanletterNewsMobileBottomNav } from "@/components/fanletter-news-mobile-bottom-nav";
import { FanletterNewsPlatformPendingProvider as FanletterNewsNavigationPendingProvider } from "@/components/fanletter-news-platform-pending-link";
import { getFanletterNavLabels } from "@/lib/fanletter-nav-labels";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";

function getNavigationPendingCopy(locale: Locale) {
  return locale === "ko"
    ? {
        body: "이동할 화면을 불러오고 있습니다. 잠시만 기다려주세요.",
        fallbackLabel: "다음 화면으로 이동 중",
        title: "이동 중",
      }
    : {
        body: "Loading the next screen. Please wait a moment.",
        fallbackLabel: "Opening next screen",
        title: "Moving",
      };
}

export default async function FanletterNewsLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const navigationPendingCopy = getNavigationPendingCopy(locale);
  const navLabels = getFanletterNavLabels(locale);

  // News shares the core AIAVpark member session; surface direct entry points
  // into the core sections so the News sub-app isn't a navigational dead-end
  // (its own bottom nav only links within News). White pills stay legible over
  // both the light and dark News page backgrounds.
  const coreLinks = [
    { href: `/${locale}/fanletter/discovery`, label: navLabels.browse },
    { href: `/${locale}/fanletter/my-ai`, label: navLabels.myStars },
    { href: `/${locale}/fanletter/creator-unlock`, label: navLabels.create },
  ];

  return (
    <FanletterNewsNavigationPendingProvider copy={navigationPendingCopy}>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 px-4 pt-3 sm:px-6">
        <Link
          aria-label={locale === "ko" ? "AIAVpark 메인으로" : "Back to AIAVpark"}
          className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/90 px-3 py-1.5 text-xs font-semibold text-black shadow-sm backdrop-blur transition hover:bg-white"
          href={`/${locale}/fanletter`}
        >
          ← AIAVpark
        </Link>
        <span aria-hidden className="mx-0.5 hidden h-3.5 w-px bg-black/15 sm:block" />
        <nav
          aria-label={locale === "ko" ? "AIAVpark 주요 메뉴" : "AIAVpark sections"}
          className="flex flex-wrap items-center gap-1.5"
        >
          {coreLinks.map((link) => (
            <Link
              key={link.href}
              className="rounded-full border border-black/10 bg-white/70 px-2.5 py-1.5 text-xs font-semibold text-black/70 shadow-sm backdrop-blur transition hover:bg-white hover:text-black"
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
      <Suspense fallback={null}>
        <FanletterNewsMobileBottomNav locale={locale} />
      </Suspense>
    </FanletterNewsNavigationPendingProvider>
  );
}
