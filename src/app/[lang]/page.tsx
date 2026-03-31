import { notFound } from "next/navigation";

import { SmartWalletApp } from "@/components/smart-wallet-app";
import { getDictionary, hasLocale } from "@/lib/i18n";

export default async function LocalizedHome({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dictionary = getDictionary(lang);

  return <SmartWalletApp dictionary={dictionary} locale={lang} />;
}
