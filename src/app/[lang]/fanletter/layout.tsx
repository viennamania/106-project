import { Suspense, type ReactNode } from "react";

import { FanletterMobileBottomNav } from "@/components/fanletter-mobile-bottom-nav";
import { FanletterPwaMobileBridge } from "@/components/fanletter-pwa-mobile-bridge";
import { FanletterScrollToTopButton } from "@/components/fanletter-scroll-to-top-button";
import {
  createFanletterPwaMetadata,
  fanletterViewport,
} from "@/lib/fanletter-pwa";
import { defaultLocale, hasLocale } from "@/lib/i18n";

export const viewport = fanletterViewport;

// Keyboard a11y: localized skip-to-content link, visually hidden until focused.
// Lets keyboard / screen-reader users jump past the per-page navigation straight
// to the main content wrapper below.
const SKIP_TO_CONTENT_LABEL: Record<string, string> = {
  en: "Skip to content",
  id: "Lewati ke konten",
  ja: "本文へスキップ",
  ko: "본문으로 건너뛰기",
  vi: "Chuyển đến nội dung",
  zh: "跳至主要内容",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;

  return createFanletterPwaMetadata(locale);
}

export default async function FanletterLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const skipLabel = SKIP_TO_CONTENT_LABEL[locale] ?? SKIP_TO_CONTENT_LABEL.ko;

  return (
    <>
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-black focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:!text-white focus:shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
        href="#fanletter-main-content"
      >
        {skipLabel}
      </a>
      <div className="outline-none" id="fanletter-main-content" tabIndex={-1}>
        {children}
      </div>
      <Suspense fallback={null}>
        <FanletterMobileBottomNav locale={locale} />
      </Suspense>
      <FanletterScrollToTopButton locale={locale} />
      <Suspense fallback={null}>
        <FanletterPwaMobileBridge locale={locale} />
      </Suspense>
    </>
  );
}
