import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterCreatePage } from "@/components/fanletter-create-page";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";

type FanletterCreateSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

function readFirstValue(rawValue?: string | string[]) {
  return Array.isArray(rawValue) ? rawValue[0] : rawValue;
}

function readReferralCode(rawValue?: string | string[]) {
  return normalizeReferralCode(readFirstValue(rawValue));
}

function getSafeReturnTo({
  locale,
  referralCode,
  returnTo,
}: {
  locale: Locale;
  referralCode: string | null;
  returnTo?: string | string[];
}) {
  const fallback = buildPathWithReferral(
    `/${locale}/fanletter/onboarding`,
    referralCode,
  );
  const rawValue = readFirstValue(returnTo)?.trim();

  if (!rawValue || rawValue.startsWith("//")) {
    return fallback;
  }

  if (!rawValue.startsWith(`/${locale}/`)) {
    return fallback;
  }

  return rawValue;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterCreateSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readReferralCode(query.ref);
  const title =
    locale === "ko"
      ? "FanLetter 첫 일상 에피소드 만들기"
      : "Create First FanLetter Daily Episode";
  const description =
    locale === "ko"
      ? "가상 인물의 오늘 장면을 이미지나 동영상 에피소드로 생성하고 FanLetter 피드에 게시하세요."
      : "Generate today's virtual character scene as an image or video episode and publish it to FanLetter.";
  const url = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/create`, referralCode),
    { returnTo: getSafeReturnTo({ locale, referralCode, returnTo: query.returnTo }) },
  );
  const ogImagePath = buildFanletterOgImagePath({
    description,
    locale,
    referralCode,
    title,
    variant: "start",
    version: "fanletter-create-v1",
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

export default async function LocalizedFanletterCreatePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterCreateSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readReferralCode(query.ref);

  return (
    <FanletterCreatePage
      locale={locale}
      referralCode={referralCode}
      returnToHref={getSafeReturnTo({
        locale,
        referralCode,
        returnTo: query.returnTo,
      })}
    />
  );
}
