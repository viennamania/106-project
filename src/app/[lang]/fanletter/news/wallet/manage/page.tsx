import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WalletPage } from "@/components/wallet-page";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import {
  getSafeFanletterReturnTo,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { getFanletterNewsWalletDictionary } from "@/lib/fanletter-news-wallet-dictionary";
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

type FanletterNewsWalletManageSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

function getMetadataCopy(locale: Locale) {
  return locale === "ko"
    ? {
        description:
          "AIAVpark News 결제 지갑의 USDT 잔액, 입금 주소, 송금, 최근 내역을 뉴스 서비스 안에서 관리하세요.",
        title: "AIAVpark News 전체 지갑 관리",
      }
    : {
        description:
          "Manage USDT balance, deposit address, transfers, and recent activity for the AIAVpark News payment wallet inside the news service.",
        title: "AIAVpark News full wallet",
      };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsWalletManageSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readFanletterReferralCode(query.ref);
  const returnToHref = getSafeFanletterReturnTo({
    fallbackPath: `/${locale}/fanletter/news/wallet`,
    locale,
    referralCode,
    returnTo: query.returnTo,
  });
  const { description, title } = getMetadataCopy(locale);
  const url = setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/wallet/manage`,
      referralCode,
    ),
    { returnTo: returnToHref },
  );
  const ogImagePath = buildFanletterOgImagePath({
    description,
    locale,
    referralCode,
    title,
    variant: "start",
    version: "fanletter-news-wallet-manage-v1",
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

export default async function LocalizedFanletterNewsWalletManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsWalletManageSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode(query.ref);
  const dictionary = getFanletterNewsWalletDictionary(
    getDictionary(locale),
    locale,
  );
  const returnToHref = getSafeFanletterReturnTo({
    fallbackPath: `/${locale}/fanletter/news/wallet`,
    locale,
    referralCode,
    returnTo: query.returnTo,
  });

  return (
    <WalletPage
      dictionary={dictionary}
      locale={locale}
      referralCode={referralCode}
      returnTo={returnToHref}
      service="news"
    />
  );
}
