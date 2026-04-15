import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LandingPage } from "@/components/landing/landing-page";
import { getDisclaimerCopy } from "@/lib/disclaimer-copy";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import { getLandingCopy } from "@/lib/marketing-copy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const copy = getLandingCopy(locale);

  return {
    title: copy.meta.title,
    description: copy.meta.description,
  };
}

export default async function LocalizedHome({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getLandingCopy(locale);
  const disclaimerCopy = getDisclaimerCopy(locale);
  const dictionary = getDictionary(locale);

  return (
    <LandingPage
      bnbWalletHref={`/${locale}/wallet/bnb`}
      bnbWalletLabel={dictionary.bnbPage.title}
      copy={copy}
      disclaimerHref={`/${locale}/disclaimer`}
      disclaimerLabel={disclaimerCopy.navLabel}
      languageLabel={dictionary.common.languageLabel}
      locale={locale}
      projectWallet={process.env.PROJECT_WALLET?.trim() ?? null}
      rewardsHref={`/${locale}/rewards`}
      rewardsLabel={dictionary.rewardsPage.title}
      walletHref={`/${locale}/wallet`}
      walletLabel={dictionary.walletPage.title}
    />
  );
}
