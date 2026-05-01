import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AssetManagementPage } from "@/components/asset-management-page";
import { getAssetManagementCopy } from "@/lib/asset-management-copy";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";

function normalizeReturnToPath(
  value: string | string[] | undefined,
  locale: Locale,
) {
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
  const dictionary = getDictionary(locale);
  const copy = getAssetManagementCopy(locale);

  return {
    title: `${dictionary.common.appName} ${copy.title}`,
    description: copy.metaDescription,
  };
}

export default async function LocalizedAssetManagementPage({
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
  const returnTo = normalizeReturnToPath(query.returnTo, locale);

  return (
    <AssetManagementPage
      dictionary={dictionary}
      locale={locale}
      referralCode={referralCode}
      returnTo={returnTo}
    />
  );
}
