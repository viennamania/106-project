import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WalletUnlockPage } from "@/components/wallet-unlock-page";
import {
  getDictionary,
  hasLocale,
  type Locale,
} from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";
import {
  getWalletUnlockCopy,
  normalizeWalletUnlockReturnTo,
} from "@/lib/wallet-unlock";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const dictionary = getDictionary(locale);
  const copy = getWalletUnlockCopy(locale);

  return {
    title: `${dictionary.common.appName} ${copy.unlockTitle}`,
    description: copy.unlockSubtitle,
  };
}

export default async function LocalizedWalletUnlockPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{
    ref?: string | string[];
    returnTo?: string | string[];
  }>;
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
  const returnTo = normalizeWalletUnlockReturnTo(query.returnTo, locale);

  return (
    <WalletUnlockPage
      dictionary={dictionary}
      locale={locale}
      referralCode={referralCode}
      returnTo={returnTo}
    />
  );
}
