import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AssetManagementPage } from "@/components/asset-management-page";
import { getAssetManagementCopy } from "@/lib/asset-management-copy";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import { normalizeLandingLanguageContext } from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";
import {
  buildServiceMetadata,
  SERVICE_BRAND_NAME,
} from "@/lib/service-branding";

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
  const copy = getAssetManagementCopy(locale);

  return buildServiceMetadata({
    title: `${SERVICE_BRAND_NAME} ${copy.title}`,
    description: copy.metaDescription,
    path: `/${locale}/activate/assets`,
  });
}

export default async function LocalizedAssetManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{
    landingLang?: string | string[];
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
  const landingLanguage = normalizeLandingLanguageContext(query.landingLang);
  const returnTo = normalizeReturnToPath(query.returnTo, locale);

  return (
    <AssetManagementPage
      dictionary={dictionary}
      landingLanguage={landingLanguage}
      locale={locale}
      referralCode={referralCode}
      returnTo={returnTo}
    />
  );
}
