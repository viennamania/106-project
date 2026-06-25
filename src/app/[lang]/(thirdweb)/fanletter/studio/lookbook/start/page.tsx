import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LookbookStartPage } from "@/components/lookbook-start-page";
import {
  defaultLocale,
  getDictionary,
  hasLocale,
  type Locale,
} from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;

  return {
    title:
      locale === "ko" ? "AI 룩북 시작하기" : "Start your AI lookbook",
    robots: { follow: false, index: false },
  };
}

export default async function LocalizedLookbookStartPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;

  return (
    <LookbookStartPage dictionary={getDictionary(locale)} locale={locale} />
  );
}
