import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ActivateNetworkPage } from "@/components/activate-network-page";
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
    title: `${dictionary.common.appName} ${dictionary.activateNetworkPage.title}`,
    description: dictionary.activateNetworkPage.description,
  };
}

export default async function LocalizedActivateNetworkPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ member?: string | string[] }>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const dictionary = getDictionary(locale);
  const requestedMemberEmail = Array.isArray(query.member)
    ? query.member[0] ?? null
    : query.member ?? null;

  return (
    <ActivateNetworkPage
      dictionary={dictionary}
      locale={locale}
      requestedMemberEmail={requestedMemberEmail}
    />
  );
}
