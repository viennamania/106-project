import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ReferralBridgePage } from "@/components/referral-bridge-page";
import {
  inferBridgePlatform,
  isBridgeCrawler,
  isKakaoInAppBrowser,
} from "@/lib/in-app-browser";
import { getContentCopy } from "@/lib/content-copy";
import {
  buildNetworkFeedOgImagePath,
  buildPathWithReferral,
  buildReferralLandingPath,
  buildReferralOgImagePath,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { getReferralLandingExperience } from "@/lib/landing-branding-service";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { getLandingCopy } from "@/lib/marketing-copy";
import { normalizeReferralCode } from "@/lib/member";

function readReferralCode(rawValue?: string | string[]) {
  return normalizeReferralCode(Array.isArray(rawValue) ? rawValue[0] : rawValue);
}

type ReferralBridgeSearchParams = {
  ref?: string | string[];
  target?: string | string[];
};

function readBridgeTarget(rawValue?: string | string[]) {
  const target = Array.isArray(rawValue) ? rawValue[0] : rawValue;

  return target === "feed" ? "feed" : "landing";
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<ReferralBridgeSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readReferralCode(query.ref);
  const bridgeTarget = readBridgeTarget(query.target);
  const copy = getLandingCopy(locale);
  const contentCopy = getContentCopy(locale);
  const experience = await getReferralLandingExperience(locale, referralCode);
  const activeReferralCode = experience.referralCode ?? referralCode;
  const title =
    bridgeTarget === "feed"
      ? experience.branding
        ? `${experience.branding.brandName} | ${contentCopy.meta.feedTitle}`
        : contentCopy.meta.feedTitle
      : experience.branding
        ? `${experience.branding.brandName} | ${copy.meta.title}`
        : copy.meta.title;
  const description =
    bridgeTarget === "feed"
      ? contentCopy.meta.feedDescription
      : experience.branding?.description ?? copy.meta.description;
  const ogImagePath =
    bridgeTarget === "feed"
      ? buildNetworkFeedOgImagePath({
          locale,
          referralCode: activeReferralCode,
          version: experience.branding?.updatedAt ?? activeReferralCode ?? null,
        })
      : buildReferralOgImagePath({
          locale,
          referralCode: activeReferralCode,
          version: experience.branding?.updatedAt ?? activeReferralCode ?? null,
        });
  const url =
    bridgeTarget === "feed"
      ? buildPathWithReferral(`/${locale}/network-feed`, activeReferralCode)
      : buildReferralLandingPath(locale, activeReferralCode);

  return {
    title,
    description,
    openGraph: {
      description,
      images: [
        {
          alt:
            bridgeTarget === "feed"
              ? `${contentCopy.meta.feedTitle} preview`
              : experience.branding
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
  searchParams: Promise<ReferralBridgeSearchParams>;
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
  const bridgeTarget = readBridgeTarget(query.target);
  const branding = experience.branding;
  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent") ?? "";
  const autoRedirect =
    !isKakaoInAppBrowser(userAgent) && !isBridgeCrawler(userAgent);
  const targetHref = setPathSearchParams(
    bridgeTarget === "feed"
      ? buildPathWithReferral(`/${locale}/network-feed`, activeReferralCode)
      : buildReferralLandingPath(locale, activeReferralCode),
    { fromBridge: "1" },
  );

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
