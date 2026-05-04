import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterStudioPage } from "@/components/fanletter-studio-page";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";

type FanletterStudioSearchParams = {
  ref?: string | string[];
};

function readFirstValue(rawValue?: string | string[]) {
  return Array.isArray(rawValue) ? rawValue[0] : rawValue;
}

function readReferralCode(rawValue?: string | string[]) {
  return normalizeReferralCode(readFirstValue(rawValue));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterStudioSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readReferralCode(query.ref);
  const title =
    locale === "ko"
      ? "FanLetter 나의 연재 스튜디오"
      : "FanLetter My Serial Studio";
  const description =
    locale === "ko"
      ? "FanLetter 안에서 캐릭터 프로필, 일상 에피소드 생성, 게시물 관리, 판매 요약을 확인하세요."
      : "Manage character profile, daily episode creation, posts, and sales summary inside FanLetter.";
  const url = buildPathWithReferral(
    `/${locale}/fanletter/studio`,
    referralCode,
  );
  const ogImagePath = buildFanletterOgImagePath({
    description,
    locale,
    referralCode,
    title,
    variant: "start",
    version: "fanletter-studio-v1",
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

export default async function LocalizedFanletterStudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterStudioSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readReferralCode(query.ref);

  return <FanletterStudioPage locale={locale} referralCode={referralCode} />;
}
