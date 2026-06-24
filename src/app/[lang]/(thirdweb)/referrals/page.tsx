import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReferralsPage } from "@/components/referrals-page";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";
import {
  buildServiceMetadata,
  SERVICE_BRAND_NAME,
} from "@/lib/service-branding";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const dictionary = getDictionary(locale);

  return buildServiceMetadata({
    title: `${SERVICE_BRAND_NAME} ${dictionary.referralsPage.title}`,
    description: dictionary.referralsPage.description,
    path: `/${locale}/referrals`,
  });
}

export default async function LocalizedReferralsPage({
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

  const dictionary = getDictionary(lang);
  const referralCode = normalizeReferralCode(
    Array.isArray(query.ref) ? query.ref[0] : query.ref,
  );

  return (
    <ReferralsPage
      dictionary={dictionary}
      locale={lang}
      referralCode={referralCode}
    />
  );
}
