import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ReferralBridgePage } from "@/components/referral-bridge-page";
import {
  inferBridgePlatform,
  isBridgeCrawler,
  isRestrictedInAppBrowser,
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

function getFeedShareTitle({
  brandName,
  locale,
}: {
  brandName?: string | null;
  locale: Locale;
}) {
  if (locale === "ko") {
    return brandName
      ? `${brandName} 네트워크 피드 미리보기`
      : "1066friend+ 네트워크 피드 미리보기";
  }

  return brandName
    ? `${brandName} network feed preview`
    : "1066friend+ network feed preview";
}

function getFeedShareDescription({
  brandName,
  locale,
}: {
  brandName?: string | null;
  locale: Locale;
}) {
  if (locale === "ko") {
    return brandName
      ? `${brandName}이 공유한 최신 콘텐츠를 확인하고 1066friend+ 네트워크를 시작하세요.`
      : "SNS로 공유된 최신 네트워크 콘텐츠를 먼저 확인하고 1066friend+를 시작하세요.";
  }

  return brandName
    ? `Explore the latest content shared by ${brandName} and start your 1066friend+ network.`
    : "Preview the latest shared network content and start your 1066friend+ network.";
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
  const feedShareTitle = getFeedShareTitle({
    brandName: experience.branding?.brandName,
    locale,
  });
  const feedShareDescription = getFeedShareDescription({
    brandName: experience.branding?.brandName,
    locale,
  });
  const feedBridgeUrl = setPathSearchParams(
    buildPathWithReferral(`/${locale}/referral/bridge`, activeReferralCode),
    { target: "feed" },
  );
  const title =
    bridgeTarget === "feed"
      ? feedShareTitle
      : experience.branding
        ? `${experience.branding.brandName} | ${copy.meta.title}`
        : copy.meta.title;
  const description =
    bridgeTarget === "feed"
      ? feedShareDescription
      : experience.branding?.description ?? copy.meta.description;
  const ogImagePath =
    bridgeTarget === "feed"
      ? buildNetworkFeedOgImagePath({
          locale,
          referralCode: activeReferralCode,
          version: activeReferralCode,
        })
      : buildReferralOgImagePath({
          locale,
          referralCode: activeReferralCode,
          version: experience.branding?.updatedAt ?? activeReferralCode ?? null,
        });
  const url =
    bridgeTarget === "feed"
      ? feedBridgeUrl
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
          type: "image/png",
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
      images: [
        {
          alt:
            bridgeTarget === "feed"
              ? `${contentCopy.meta.feedTitle} preview`
              : experience.branding
                ? `${experience.branding.brandName} referral landing preview`
                : copy.meta.title,
          height: 630,
          type: "image/png",
          url: ogImagePath,
          width: 1200,
        },
      ],
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
    !isRestrictedInAppBrowser(userAgent) && !isBridgeCrawler(userAgent);
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
      description={
        bridgeTarget === "feed"
          ? getFeedShareDescription({ brandName: branding?.brandName, locale })
          : branding?.description ?? landingCopy.hero.description
      }
      eyebrow={
        bridgeTarget === "feed"
          ? locale === "ko"
            ? "SNS 피드 미리보기"
            : "SNS feed preview"
          : branding?.brandedExperienceLabel ?? landingCopy.hero.eyebrow
      }
      locale={locale}
      platformHint={inferBridgePlatform(userAgent)}
      referralCode={activeReferralCode}
      target={bridgeTarget}
      targetHref={targetHref}
      title={
        bridgeTarget === "feed"
          ? getFeedShareTitle({ brandName: branding?.brandName, locale })
          : branding?.headline ?? landingCopy.hero.title
      }
    />
  );
}
