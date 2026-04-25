import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NetworkFeedPage } from "@/components/network-feed-page";
import { getContentCopy } from "@/lib/content-copy";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";

type NetworkFeedSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

function normalizeReturnToPath(value: string | string[] | undefined, locale: Locale) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (!candidate || !candidate.startsWith(`/${locale}/`)) {
    return null;
  }

  if (candidate.startsWith("//")) {
    return null;
  }

  return candidate;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const copy = getContentCopy(locale);

  return {
    title: `${copy.meta.feedTitle} | 1066friend+`,
    description: copy.meta.feedDescription,
  };
}

export default async function LocalizedNetworkFeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<NetworkFeedSearchParams>;
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
  const returnToHref = normalizeReturnToPath(query.returnTo, locale);

  return (
    <NetworkFeedPage
      dictionary={dictionary}
      locale={locale}
      referralCode={referralCode}
      returnToHref={returnToHref}
    />
  );
}
