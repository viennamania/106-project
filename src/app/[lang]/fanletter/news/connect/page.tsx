import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterNewsConnectPage } from "@/components/fanletter-news-connect-page";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import {
  getSafeFanletterReturnTo,
  readFanletterReferralCode,
  unwrapFanletterNewsMeReturnToPath,
} from "@/lib/fanletter-routing";
import { defaultLocale, getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";

type FanletterNewsConnectSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

function getMetadataCopy(locale: Locale) {
  return locale === "ko"
    ? {
        description:
          "AIAVpark News에서 팬 기자 활동, AI 리포트 공유, 팬 전용 브이로그 결제와 열람을 이어가기 위해 뉴스 계정을 연결하세요.",
        title: "AIAVpark News 계정 연결",
      }
    : {
        description:
          "Connect your AIAVpark News account to continue fan reporter actions, AI report sharing, fan-only vlog payments, and access.",
        title: "AIAVpark News Account Connect",
      };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsConnectSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readFanletterReferralCode(query.ref);
  const returnToHref = unwrapFanletterNewsMeReturnToPath(
    getSafeFanletterReturnTo({
      fallbackPath: `/${locale}/fanletter/news`,
      locale,
      referralCode,
      returnTo: query.returnTo,
    }),
    locale,
  );
  const { description, title } = getMetadataCopy(locale);
  const url = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, referralCode),
    { returnTo: returnToHref },
  );
  const ogImagePath = buildFanletterOgImagePath({
    description,
    locale,
    referralCode,
    title,
    variant: "start",
    version: "fanletter-news-connect-v1",
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

export default async function LocalizedFanletterNewsConnectPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsConnectSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode(query.ref);
  const returnToHref = unwrapFanletterNewsMeReturnToPath(
    getSafeFanletterReturnTo({
      fallbackPath: `/${locale}/fanletter/news`,
      locale,
      referralCode,
      returnTo: query.returnTo,
    }),
    locale,
  );

  return (
    <FanletterNewsConnectPage
      dictionary={getDictionary(locale)}
      locale={locale}
      referralCode={referralCode}
      returnToHref={returnToHref}
    />
  );
}
