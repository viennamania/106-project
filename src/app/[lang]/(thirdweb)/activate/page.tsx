import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SmartWalletApp } from "@/components/smart-wallet-app";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import { getReferralLandingExperience } from "@/lib/landing-branding-service";
import { getIncomingReferralState } from "@/lib/member-service";
import { normalizeReferralCode } from "@/lib/member";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const dictionary = getDictionary(locale);

  return {
    title: `${dictionary.common.appName} Activate`,
    description: dictionary.meta.description,
  };
}

export default async function LocalizedActivatePage({
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
  const dictionary = getDictionary(locale);
  const referralInput = Array.isArray(query.ref) ? query.ref[0] : query.ref;
  const incomingReferralCode = normalizeReferralCode(referralInput);
  const incomingReferralState =
    await getIncomingReferralState(incomingReferralCode);
  const incomingReferralBranding =
    incomingReferralCode && incomingReferralState?.status !== "invalid"
      ? (await getReferralLandingExperience(locale, incomingReferralCode)).branding
      : null;

  return (
    <SmartWalletApp
      incomingReferralBranding={incomingReferralBranding}
      dictionary={dictionary}
      incomingReferralState={incomingReferralState}
      locale={locale}
      projectWallet={process.env.PROJECT_WALLET?.trim() ?? null}
    />
  );
}
