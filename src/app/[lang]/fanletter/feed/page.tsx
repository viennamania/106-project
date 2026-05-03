import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterFeedPage } from "@/components/fanletter-subpages";
import { getFanletterFeedPageData } from "@/lib/fanletter-content-service";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";

type FanletterFeedSearchParams = {
  ref?: string | string[];
};

function readReferralCode(rawValue?: string | string[]) {
  return normalizeReferralCode(Array.isArray(rawValue) ? rawValue[0] : rawValue);
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterFeedSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readReferralCode(query.ref);
  const title =
    locale === "ko"
      ? "FanLetter 피드 | 공개 AI 콘텐츠"
      : "FanLetter Feed | Public AI content";
  const description =
    locale === "ko"
      ? "FanLetter에서 공개된 AI 이미지와 동영상 콘텐츠를 확인하세요."
      : "Browse public AI image and video content on FanLetter.";
  const url = buildPathWithReferral(`/${locale}/fanletter/feed`, referralCode);
  const ogImagePath = buildFanletterOgImagePath({
    description,
    locale,
    referralCode,
    title,
    variant: "feed",
    version: "fanletter-feed-v1",
  });
  const ogImage = {
    alt: getFanletterOgAlt(locale, "feed"),
    height: FANLETTER_OG_IMAGE_SIZE.height,
    type: "image/png",
    url: ogImagePath,
    width: FANLETTER_OG_IMAGE_SIZE.width,
  };

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      description,
      images: [ogImage],
      siteName: "FanLetter",
      title,
      type: "website",
      url,
    },
    twitter: {
      card: "summary_large_image",
      description,
      images: [ogImage],
      title,
    },
  };
}

export default async function LocalizedFanletterFeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterFeedSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readReferralCode(query.ref);
  const data = await getFanletterFeedPageData(locale, referralCode);

  return (
    <FanletterFeedPage
      items={data.items}
      locale={locale}
      referralCode={data.referralCode}
    />
  );
}
