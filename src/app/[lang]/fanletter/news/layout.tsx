import { Suspense, type ReactNode } from "react";

import { FanletterNewsMobileBottomNav } from "@/components/fanletter-news-mobile-bottom-nav";
import { defaultLocale, hasLocale } from "@/lib/i18n";

export default async function FanletterNewsLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;

  return (
    <>
      {children}
      <Suspense fallback={null}>
        <FanletterNewsMobileBottomNav locale={locale} />
      </Suspense>
    </>
  );
}
