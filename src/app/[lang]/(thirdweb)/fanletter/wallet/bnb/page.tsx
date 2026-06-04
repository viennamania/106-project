import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BnbWalletPage } from "@/components/bnb-wallet-page";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import {
  getSafeFanletterReturnTo,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { getFanletterWalletDictionary } from "@/lib/fanletter-wallet-dictionary";
import {
  defaultLocale,
  getDictionary,
  hasLocale,
  type Locale,
} from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";

type FanletterBnbWalletSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

function getMetadataCopy(locale: Locale) {
  return locale === "ko"
    ? {
        description:
          "AIAVpark 스마트월렛의 BNB 잔액과 네트워크 수수료 준비 상태를 확인하세요.",
        title: "AIAVpark BNB 관리",
      }
    : {
        description:
          "Check BNB balance and network-fee readiness for the AIAVpark smart wallet.",
        title: "AIAVpark BNB",
      };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterBnbWalletSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readFanletterReferralCode(query.ref);
  const returnToHref = getSafeFanletterReturnTo({
    fallbackPath: `/${locale}/fanletter/wallet/manage`,
    locale,
    referralCode,
    returnTo: query.returnTo,
  });
  const { description, title } = getMetadataCopy(locale);
  const url = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/wallet/bnb`, referralCode),
    { returnTo: returnToHref },
  );
  const ogImagePath = buildFanletterOgImagePath({
    description,
    locale,
    referralCode,
    title,
    variant: "start",
    version: "fanletter-wallet-bnb-v1",
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
      siteName: "AIAVpark",
      title,
      type: "website",
      url,
    },
    robots: {
      follow: false,
      index: false,
    },
    twitter: {
      card: "summary_large_image",
      description,
      images: [ogImage],
      title,
    },
  };
}

export default async function LocalizedFanletterBnbWalletPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterBnbWalletSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode(query.ref);
  const dictionary = getFanletterWalletDictionary(getDictionary(locale), locale);
  const returnToHref = getSafeFanletterReturnTo({
    fallbackPath: `/${locale}/fanletter/wallet/manage`,
    locale,
    referralCode,
    returnTo: query.returnTo,
  });

  return (
    <BnbWalletPage
      dictionary={dictionary}
      locale={locale}
      referralCode={referralCode}
      returnTo={returnToHref}
    />
  );
}
