import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterHomePage } from "@/components/fanletter-home-page";
import { getFanletterLandingData } from "@/lib/fanletter-landing-service";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";

function readReferralCode(rawValue?: string | string[]) {
  return normalizeReferralCode(Array.isArray(rawValue) ? rawValue[0] : rawValue);
}

function getFanletterMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "고정 페르소나를 가진 가상 인물의 일상 장면을 이미지와 동영상 에피소드로 연재하는 FanLetter 홈입니다.",
      title: "FanLetter | 가상 인물 일상 연재 홈",
    };
  }

  return {
    description:
      "FanLetter is a mobile home for serialising a virtual character's daily life through image and video episodes.",
    title: "FanLetter | Virtual character daily serials",
  };
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
  const meta = getFanletterMeta(locale);
  const url = buildPathWithReferral(`/${locale}/fanletter`, referralCode);
  const ogImagePath = buildFanletterOgImagePath({
    description: meta.description,
    locale,
    referralCode,
    title: meta.title,
    variant: "home",
    version: "fanletter-home-v2",
  });
  const ogImage = {
    alt: getFanletterOgAlt(locale, "home"),
    height: FANLETTER_OG_IMAGE_SIZE.height,
    type: "image/png",
    url: ogImagePath,
    width: FANLETTER_OG_IMAGE_SIZE.width,
  };

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      description: meta.description,
      images: [ogImage],
      siteName: "FanLetter",
      title: meta.title,
      type: "website",
      url,
    },
    twitter: {
      card: "summary_large_image",
      description: meta.description,
      images: [ogImage],
      title: meta.title,
    },
  };
}

export default async function FanletterRoutePage({
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
  const referralCode = readReferralCode(query.ref);
  const landingData = await getFanletterLandingData(lang, referralCode);

  return (
    <FanletterHomePage
      featuredVideos={landingData.featuredVideos}
      locale={lang}
      liveStats={landingData.liveStats}
      referralCode={referralCode}
    />
  );
}
