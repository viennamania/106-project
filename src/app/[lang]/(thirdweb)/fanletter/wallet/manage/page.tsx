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

type FanletterWalletManageSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

function getMetadataCopy(locale: Locale) {
  return locale === "ko"
    ? {
        description:
          "AIAVpark 팬 전용 콘텐츠 결제 지갑의 USDT 잔액, 입금 주소, 송금, 최근 내역을 관리하세요.",
        title: "AIAVpark 전체 지갑 관리",
      }
    : {
        description:
          "Manage USDT balance, deposit address, transfers, and recent activity for the AIAVpark fan-content payment wallet.",
        title: "AIAVpark full wallet",
      };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterWalletManageSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readFanletterReferralCode(query.ref);
  const returnToHref = getSafeFanletterReturnTo({
    fallbackPath: `/${locale}/fanletter/wallet`,
    locale,
    referralCode,
    returnTo: query.returnTo,
  });
  const { description, title } = getMetadataCopy(locale);
  const url = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/wallet/manage`, referralCode),
    { returnTo: returnToHref },
  );
  const ogImagePath = buildFanletterOgImagePath({
    description,
    locale,
    referralCode,
    title,
    variant: "start",
    version: "fanletter-wallet-manage-v1",
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

export default async function LocalizedFanletterWalletManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterWalletManageSearchParams>;
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
    fallbackPath: `/${locale}/fanletter/wallet`,
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
      service="fanletter"
    />
  );
}
