import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SellerAccountPage } from "@/components/seller-account-page";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const title =
    locale === "en" ? "My account — AI Lookbook Studio" : "마이페이지 — AI 룩북 스튜디오";

  return {
    title,
    alternates: { canonical: `/${locale}/lookbook/account` },
    robots: { follow: false, index: false },
  };
}

export default async function LocalizedSellerAccountPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  return <SellerAccountPage locale={lang as Locale} />;
}
