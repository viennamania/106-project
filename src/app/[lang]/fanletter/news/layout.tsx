import { Suspense, type ReactNode } from "react";

import { FanletterNewsMobileBottomNav } from "@/components/fanletter-news-mobile-bottom-nav";
import { FanletterNewsPlatformPendingProvider as FanletterNewsNavigationPendingProvider } from "@/components/fanletter-news-platform-pending-link";
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

  return (
    <FanletterNewsNavigationPendingProvider copy={navigationPendingCopy}>
      {children}
      <Suspense fallback={null}>
        <FanletterNewsMobileBottomNav locale={locale} />
      </Suspense>
    </FanletterNewsNavigationPendingProvider>
  );
}
