import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterProfilePage } from "@/components/fanletter-profile-page";
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

type FanletterProfileSearchParams = {
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
  searchParams: Promise<FanletterProfileSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readReferralCode(query.ref);
  const title =
    locale === "ko" ? "FanLetter 프로필 설정" : "FanLetter Profile Setup";
  const description =
    locale === "ko"
      ? "표시 이름, 캐릭터 페르소나, AI 아바타를 설정해 같은 AI 캐릭터 브이로그 채널을 준비하세요."
      : "Set display name, character persona, and AI avatar to prepare a consistent AI character vlogger channel.";
  const url = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/profile`, referralCode),
    { returnTo: getSafeReturnTo({ locale, referralCode, returnTo: query.returnTo }) },
  );
  const ogImagePath = buildFanletterOgImagePath({
    description,
    locale,
    referralCode,
    title,
    variant: "start",
    version: "fanletter-profile-v1",
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

export default async function LocalizedFanletterProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterProfileSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readReferralCode(query.ref);

  return (
    <FanletterProfilePage
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
