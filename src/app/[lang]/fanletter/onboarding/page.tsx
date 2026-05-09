import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterOnboardingPage } from "@/components/fanletter-subpages";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";

type FanletterOnboardingSearchParams = {
  ref?: string | string[];
};

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterOnboardingSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readFanletterReferralCode(query.ref);
  const title =
    locale === "ko"
      ? "FanLetter 온보딩"
      : "FanLetter Onboarding";
  const description =
    locale === "ko"
      ? "계정 연결, 원클릭 AI 캐릭터 만들기, 첫 숏폼 브이로그 생성을 FanLetter 흐름 안에서 시작하세요."
      : "Start account connection, one-click AI character creation, and first short-form vlog creation inside FanLetter.";
  const url = buildPathWithReferral(
    `/${locale}/fanletter/onboarding`,
    referralCode,
  );
  const ogImagePath = buildFanletterOgImagePath({
    description,
    locale,
    referralCode,
    title,
    variant: "start",
    version: "fanletter-onboarding-v1",
  });
  const ogImage = {
    alt: getFanletterOgAlt(locale, "start"),
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

export default async function LocalizedFanletterOnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterOnboardingSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  return (
    <FanletterOnboardingPage
      locale={lang as Locale}
      referralCode={readFanletterReferralCode(query.ref)}
    />
  );
}
