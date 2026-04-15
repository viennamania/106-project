import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SilverRewardClaimPage } from "@/components/silver-reward-claim-page";
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
    title: dictionary.rewardsPage.silverClaim.title,
    description: dictionary.rewardsPage.silverClaim.description,
  };
}

export default async function LocalizedSilverRewardClaimPage({
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

  return <SilverRewardClaimPage dictionary={dictionary} locale={locale} />;
}
