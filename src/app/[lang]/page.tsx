import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LandingPage } from "@/components/landing/landing-page";
import { getDisclaimerCopy } from "@/lib/disclaimer-copy";
import {
  buildPathWithReferral,
  buildReferralLandingPath,
  buildReferralOgImagePath,
} from "@/lib/landing-branding";
import { getReferralLandingExperience } from "@/lib/landing-branding-service";
import {
  defaultLocale,
  getDictionary,
  hasLocale,
  type Locale,
} from "@/lib/i18n";
import { getLandingCopy } from "@/lib/marketing-copy";
import { normalizeReferralCode } from "@/lib/member";

function readReferralCode(rawValue?: string | string[]) {
  return normalizeReferralCode(
    Array.isArray(rawValue) ? rawValue[0] : rawValue,
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ ref?: string | string[] }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readReferralCode(query.ref);
  const copy = getLandingCopy(locale);
  const experience = await getReferralLandingExperience(locale, referralCode);
  const title = experience.branding
    ? `${experience.branding.brandName} | ${copy.meta.title}`
    : copy.meta.title;
  const description = experience.branding?.description ?? copy.meta.description;
  const ogImagePath = buildReferralOgImagePath({
    locale,
    referralCode: experience.referralCode ?? referralCode,
    version:
      experience.branding?.updatedAt ??
      experience.referralCode ??
      null,
  });

  return {
    title,
    description,
    openGraph: {
      description,
      images: [
        {
          alt: experience.branding
            ? `${experience.branding.brandName} referral landing preview`
            : copy.meta.title,
          height: 630,
          url: ogImagePath,
          width: 1200,
        },
      ],
      title,
      url: buildReferralLandingPath(locale, experience.referralCode ?? referralCode),
    },
    twitter: {
      card: "summary_large_image",
      description,
      images: [ogImagePath],
      title,
    },
  };
}

export default async function LocalizedHome({
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
  const referralCode = readReferralCode(query.ref);
  const copy = getLandingCopy(locale);
  const disclaimerCopy = getDisclaimerCopy(locale);
  const dictionary = getDictionary(locale);
  const experience = await getReferralLandingExperience(locale, referralCode);
  const activeReferralCode = experience.referralCode ?? referralCode;

  return (
    <LandingPage
      activateHref={buildPathWithReferral(`/${locale}/activate`, activeReferralCode)}
      bnbWalletHref={buildPathWithReferral(`/${locale}/wallet/bnb`, activeReferralCode)}
      bnbWalletLabel={dictionary.bnbPage.title}
      branding={experience.branding}
      copy={copy}
      disclaimerHref={buildPathWithReferral(`/${locale}/disclaimer`, activeReferralCode)}
      feedHref={buildPathWithReferral(`/${locale}/network-feed`, activeReferralCode)}
      disclaimerLabel={disclaimerCopy.navLabel}
      languageLabel={dictionary.common.languageLabel}
      locale={locale}
      projectWallet={process.env.PROJECT_WALLET?.trim() ?? null}
      rewardsHref={buildPathWithReferral(`/${locale}/rewards`, activeReferralCode)}
      rewardsLabel={dictionary.rewardsPage.title}
      walletHref={buildPathWithReferral(`/${locale}/wallet`, activeReferralCode)}
      walletLabel={dictionary.walletPage.title}
    />
  );
}
