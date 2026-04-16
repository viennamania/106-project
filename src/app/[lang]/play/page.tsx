import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlayPage } from "@/components/play-page";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const dictionary = getDictionary(locale);

  return {
    title: `${dictionary.common.appName} ${dictionary.playPage.title}`,
    description: dictionary.playPage.description,
  };
}

export default async function LocalizedPlayPage({
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

  return <PlayPage dictionary={dictionary} locale={locale} />;
}
