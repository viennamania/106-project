import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterWalletPage } from "@/components/fanletter-wallet-page";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import {
  getSafeFanletterReturnTo,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
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

type FanletterNewsWalletSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

function getMetadataCopy(locale: Locale) {
  return locale === "ko"
    ? {
        description:
          "AIAVpark News에서 사용하는 이메일 지갑, USDT 잔액, 입금 주소와 최근 활동을 뉴스 서비스 안에서 관리하세요.",
        title: "AIAVpark News 지갑 관리",
      }
    : {
        description:
          "Manage the email wallet, USDT balance, deposit address, and recent activity used for AIAVpark News inside the news service.",
        title: "AIAVpark News Wallet",
      };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsWalletSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readFanletterReferralCode(query.ref);
  const returnToHref = getSafeFanletterReturnTo({
    fallbackPath: `/${locale}/fanletter/news`,
    locale,
    referralCode,
    returnTo: query.returnTo,
  });
  const { description, title } = getMetadataCopy(locale);
  const url = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/wallet`, referralCode),
    { returnTo: returnToHref },
  );
  const ogImagePath = buildFanletterOgImagePath({
    description,
    locale,
    referralCode,
    title,
    variant: "start",
    version: "fanletter-news-wallet-v1",
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
      siteName: "AIAVpark News",
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

export default async function LocalizedFanletterNewsWalletPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsWalletSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode(query.ref);
  const returnToHref = getSafeFanletterReturnTo({
    fallbackPath: `/${locale}/fanletter/news`,
    locale,
    referralCode,
    returnTo: query.returnTo,
  });

  return (
    <FanletterWalletPage
      dictionary={getDictionary(locale)}
      locale={locale}
      referralCode={referralCode}
      returnToHref={returnToHref}
      service="news"
    />
  );
}
