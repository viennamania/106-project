import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DisclaimerPage } from "@/components/disclaimer-page";
import { getDisclaimerCopy } from "@/lib/disclaimer-copy";
import { buildReferralLandingPath } from "@/lib/landing-branding";
import { hasLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";

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
  const copy = getDisclaimerCopy(locale);
  const referralCode = normalizeReferralCode(
    Array.isArray(query.ref) ? query.ref[0] : query.ref,
  );

  return (
    <DisclaimerPage
      copy={copy}
      homeHref={buildReferralLandingPath(locale, referralCode)}
    />
  );
}
