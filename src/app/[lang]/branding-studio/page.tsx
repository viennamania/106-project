import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BrandingStudioPage } from "@/components/branding-studio-page";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import { getLandingBrandingCopy } from "@/lib/landing-branding-copy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const copy = getLandingBrandingCopy(locale);

  return {
    title: copy.meta.title,
    description: copy.meta.description,
  };
}

export default async function LocalizedBrandingStudioPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const dictionary = getDictionary(locale);

  return <BrandingStudioPage dictionary={dictionary} locale={locale} />;
}
