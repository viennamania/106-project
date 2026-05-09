import { Suspense, type ReactNode } from "react";

import { FanletterPwaMobileBridge } from "@/components/fanletter-pwa-mobile-bridge";
import { ThirdwebRuntimeLayout } from "@/components/thirdweb-runtime-layout";
import {
  createFanletterPwaMetadata,
  fanletterViewport,
} from "@/lib/fanletter-pwa";
import { defaultLocale, hasLocale } from "@/lib/i18n";

export const viewport = fanletterViewport;

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

  return (
    <ThirdwebRuntimeLayout>
      {children}
      <Suspense fallback={null}>
        <FanletterPwaMobileBridge locale={locale} />
      </Suspense>
    </ThirdwebRuntimeLayout>
  );
}
