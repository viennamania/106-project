import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ReferralBridgePage } from "@/components/referral-bridge-page";
import {
  inferBridgePlatform,
  isBridgeCrawler,
  isKakaoInAppBrowser,
} from "@/lib/in-app-browser";
import {
  buildReferralLandingPath,
  buildReferralOgImagePath,
} from "@/lib/landing-branding";
import { getReferralLandingExperience } from "@/lib/landing-branding-service";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { getLandingCopy } from "@/lib/marketing-copy";
import { normalizeReferralCode } from "@/lib/member";

function readReferralCode(rawValue?: string | string[]) {
  return normalizeReferralCode(Array.isArray(rawValue) ? rawValue[0] : rawValue);
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
    version: experience.branding?.updatedAt ?? experience.referralCode ?? null,
  });
  const url = buildReferralLandingPath(locale, experience.referralCode ?? referralCode);

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
      url,
    },
    twitter: {
      card: "summary_large_image",
      description,
      images: [ogImagePath],
      title,
    },
  };
}

export default async function LocalizedReferralBridgePage({
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

  if (!referralCode) {
    notFound();
  }

  const landingCopy = getLandingCopy(locale);
  const experience = await getReferralLandingExperience(locale, referralCode);
  const activeReferralCode = experience.referralCode ?? referralCode;
  const branding = experience.branding;
  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent") ?? "";
  const autoRedirect =
    !isKakaoInAppBrowser(userAgent) && !isBridgeCrawler(userAgent);
  const targetHref = buildReferralLandingPath(locale, activeReferralCode);

  return (
    <ReferralBridgePage
      autoRedirect={autoRedirect}
      brandName={branding?.brandName ?? null}
      coverImageUrl={branding?.heroImageUrl ?? null}
      description={branding?.description ?? landingCopy.hero.description}
      eyebrow={branding?.brandedExperienceLabel ?? landingCopy.hero.eyebrow}
      locale={locale}
      platformHint={inferBridgePlatform(userAgent)}
      referralCode={activeReferralCode}
      targetHref={targetHref}
      title={branding?.headline ?? landingCopy.hero.title}
    />
  );
}
