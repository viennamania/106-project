import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DisclaimerPage } from "@/components/disclaimer-page";
import { getDisclaimerCopy } from "@/lib/disclaimer-copy";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const copy = getDisclaimerCopy(locale);

  return {
    title: copy.meta.title,
    description: copy.meta.description,
  };
}

export default async function LocalizedDisclaimerPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const copy = getDisclaimerCopy(locale);
  const dictionary = getDictionary(locale);

  return (
    <DisclaimerPage
      copy={copy}
      languageLabel={dictionary.common.languageLabel}
      locale={locale}
    />
  );
}
