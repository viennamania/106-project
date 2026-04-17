import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WalletPage } from "@/components/wallet-page";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const dictionary = getDictionary(locale);

  return {
    title: `${dictionary.common.appName} Wallet`,
    description: dictionary.walletPage.description,
  };
}

export default async function LocalizedWalletPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const dictionary = getDictionary(locale);
  const referralCode = normalizeReferralCode(
    Array.isArray(query.ref) ? query.ref[0] : query.ref,
  );

  return (
    <WalletPage
      dictionary={dictionary}
      locale={locale}
      referralCode={referralCode}
    />
  );
}
