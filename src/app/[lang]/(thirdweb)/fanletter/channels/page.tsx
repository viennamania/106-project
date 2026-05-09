import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterChannelsPage } from "@/components/fanletter-channels-page";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import {
  getSafeFanletterReturnTo,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";

type FanletterChannelsSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterChannelsSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readFanletterReferralCode(query.ref);
  const title =
    locale === "ko"
      ? "FanLetter 브이로그 채널 배포 관리"
      : "FanLetter Vlog Channel Distribution";
  const description =
    locale === "ko"
      ? "FanLetter AI 캐릭터 브이로그를 Instagram Reels, YouTube Shorts, TikTok에 올릴 수 있는 게시 패키지로 정리하세요."
      : "Prepare FanLetter AI character vlogs as posting packages for Instagram Reels, YouTube Shorts, and TikTok.";
  const url = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/channels`, referralCode),
    {
      returnTo: getSafeFanletterReturnTo({
        fallbackPath: `/${locale}/fanletter/studio`,
        locale,
        referralCode,
        returnTo: query.returnTo,
      }),
    },
  );
  const ogImagePath = buildFanletterOgImagePath({
    description,
    locale,
    referralCode,
    title,
    variant: "start",
    version: "fanletter-channels-v1",
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

export default async function LocalizedFanletterChannelsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterChannelsSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode(query.ref);
  const returnToHref = getSafeFanletterReturnTo({
    fallbackPath: `/${locale}/fanletter/studio`,
    locale,
    referralCode,
    returnTo: query.returnTo,
  });

  return (
    <FanletterChannelsPage
      locale={locale}
      referralCode={referralCode}
      returnToHref={returnToHref}
    />
  );
}
