import { notFound } from "next/navigation";

import { ReferralsPage } from "@/components/referrals-page";
import { getDictionary, hasLocale } from "@/lib/i18n";

export default async function LocalizedReferralsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dictionary = getDictionary(lang);

  return <ReferralsPage dictionary={dictionary} locale={lang} />;
}
