import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NetworkFeedPage } from "@/components/network-feed-page";
import { getContentCopy } from "@/lib/content-copy";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildNetworkFeedOgImagePath,
  buildPathWithReferral,
} from "@/lib/landing-branding";
import { getReferralLandingExperience } from "@/lib/landing-branding-service";
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
  searchParams: Promise<NetworkFeedSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : "ko";
  const referralCode = normalizeReferralCode(
    Array.isArray(query.ref) ? query.ref[0] : query.ref,
  );
  const copy = getContentCopy(locale);
  const experience = await getReferralLandingExperience(locale, referralCode);
  const activeReferralCode = experience.referralCode ?? referralCode;
  const title = getFeedShareTitle({
    brandName: experience.branding?.brandName,
    locale,
  });
  const description = getFeedShareDescription({
    brandName: experience.branding?.brandName,
    locale,
  });
  const ogImagePath = buildNetworkFeedOgImagePath({
    locale,
    referralCode: activeReferralCode,
    version: activeReferralCode,
  });
  const url = buildPathWithReferral(`/${locale}/network-feed`, activeReferralCode);

  return {
    title,
    description,
    openGraph: {
      description,
      images: [
        {
          alt: `${copy.meta.feedTitle} preview`,
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
          alt: `${copy.meta.feedTitle} preview`,
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
