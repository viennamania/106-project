import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterHomePage } from "@/components/fanletter-home-page";
import { getFanletterLandingData } from "@/lib/fanletter-landing-service";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";

function getFanletterMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "팬 요청으로 성장하는 AI 캐릭터 브이로그를 만들고, 팬 전용 콘텐츠 수익을 참여 보상과 공유 모델로 확장하는 FanLetter 플랫폼입니다.",
      title: "FanLetter | 팬이 키우는 AI 캐릭터 성장 플랫폼",
    };
  }

  return {
    description:
      "FanLetter helps creators grow AI character vlogs through fan requests, then expand fan-only content revenue into participation rewards and sharing models.",
    title: "FanLetter | Fan-powered AI character growth platform",
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
  const referralCode = readFanletterReferralCode(query.ref);
  const meta = getFanletterMeta(locale);
  const url = buildPathWithReferral(`/${locale}/fanletter`, referralCode);
  const ogImagePath = buildFanletterOgImagePath({
    description: meta.description,
    locale,
    referralCode,
    title: meta.title,
    variant: "home",
    version: "fanletter-home-v5",
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
  const referralCode = readFanletterReferralCode(query.ref);
  const landingData = await getFanletterLandingData(lang);

  return (
    <FanletterHomePage
      featuredPaidVideos={landingData.featuredPaidVideos}
      featuredVideos={landingData.featuredVideos}
      locale={lang}
      liveStats={landingData.liveStats}
      referralCode={referralCode}
    />
  );
}
