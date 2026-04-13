import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RewardsPage } from "@/components/rewards-page";
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
    title: dictionary.rewardsPage.title,
    description: dictionary.rewardsPage.description,
  };
}

export default async function LocalizedRewardsPage({
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

  return <RewardsPage dictionary={dictionary} locale={locale} />;
}
