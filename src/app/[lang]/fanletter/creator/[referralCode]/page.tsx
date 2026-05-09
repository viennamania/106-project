import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterCreatorPage } from "@/components/fanletter-subpages";
import { getFanletterCreatorPageData } from "@/lib/fanletter-content-service";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";

type FanletterCreatorSearchParams = {
  ref?: string | string[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; referralCode: string }>;
}): Promise<Metadata> {
  const { lang, referralCode } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const data = await getFanletterCreatorPageData(locale, referralCode);
  const characterName = data?.profile.character?.name ?? data?.profile.displayName;
  const title = data
    ? `${characterName} | FanLetter`
    : locale === "ko"
      ? "FanLetter 캐릭터"
      : "FanLetter character";
  const description =
    data?.profile.character?.summary ??
    data?.profile.intro ??
    (locale === "ko"
      ? "FanLetter 가상 인물 공개 채널입니다."
      : "A public FanLetter virtual character channel.");
  const normalizedReferralCode = normalizeReferralCode(referralCode);
  const url = `/${locale}/fanletter/creator/${normalizedReferralCode ?? referralCode}`;
  const ogImagePath = buildFanletterOgImagePath({
    description,
    locale,
    referralCode: normalizedReferralCode,
    title,
    variant: "creator",
    version: normalizedReferralCode ?? referralCode,
  });
  const ogImage = {
    alt: getFanletterOgAlt(locale, "creator"),
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
      type: "profile",
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

export default async function LocalizedFanletterCreatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; referralCode: string }>;
  searchParams: Promise<FanletterCreatorSearchParams>;
}) {
  const { lang, referralCode } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const data = await getFanletterCreatorPageData(locale, referralCode);

  if (!data) {
    notFound();
  }

  const queryReferralCode = readFanletterReferralCode(query.ref);

  return (
    <FanletterCreatorPage
      data={data}
      locale={locale}
      referralCode={queryReferralCode ?? data.profile.referralCode}
    />
  );
}
