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
        "얼굴 공개 없이 고정 AI 캐릭터로 숏폼 브이로그를 만들고 팬 피드와 유료 콘텐츠로 연결하는 FanLetter 창작자 플랫폼입니다.",
      title: "FanLetter | AI 캐릭터 브이로그 창작자 플랫폼",
    };
  }

  return {
    description:
      "FanLetter helps creators make short-form vlogs with a fixed AI character and connect them to fan feeds and paid content without showing their real face.",
    title: "FanLetter | AI character vlogger platform",
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
