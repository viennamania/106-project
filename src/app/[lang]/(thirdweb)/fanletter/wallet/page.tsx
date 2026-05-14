import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterWalletPage } from "@/components/fanletter-wallet-page";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import {
  defaultLocale,
  getDictionary,
  hasLocale,
  type Locale,
} from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";

type FanletterWalletSearchParams = {
  ref?: string | string[];
};

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterWalletSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readFanletterReferralCode(query.ref);
  const title =
    locale === "ko" ? "FanLetter 지갑 관리" : "FanLetter Wallet";
  const description =
    locale === "ko"
      ? "FanLetter 결제 지갑, USDT 잔액, 입금 주소, 최근 입출금, 정산 진입점을 한곳에서 확인하세요."
      : "Manage your FanLetter payment wallet, USDT balance, deposit address, recent activity, and settlement links.";
  const url = buildPathWithReferral(
    `/${locale}/fanletter/wallet`,
    referralCode,
  );
  const ogImagePath = buildFanletterOgImagePath({
    description,
    locale,
    referralCode,
    title,
    variant: "start",
    version: "fanletter-wallet-v1",
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

export default async function LocalizedFanletterWalletPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterWalletSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;

  return (
    <FanletterWalletPage
      dictionary={getDictionary(locale)}
      locale={locale}
      referralCode={readFanletterReferralCode(query.ref)}
    />
  );
}
