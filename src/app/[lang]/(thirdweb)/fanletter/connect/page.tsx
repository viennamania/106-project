import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterConnectPage } from "@/components/fanletter-connect-page";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import {
  getSafeFanletterReturnTo,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { defaultLocale, getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";

type FanletterConnectSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

function getFanletterConnectMetadataCopy(locale: Locale, returnToHref: string) {
  const returnToPathname = returnToHref.split(/[?#]/, 1)[0];
  const isContentReturn = returnToPathname.includes("/fanletter/content/");

  if (locale === "ko") {
    return isContentReturn
      ? {
          description:
            "FanLetter 팬 전용 콘텐츠 결제와 전체 열람을 이어가기 위해 이메일 계정을 연결하세요.",
          title: "FanLetter 팬 전용 콘텐츠 계정 연결",
        }
      : {
          description:
            "FanLetter 계정 연결과 시작 준비 확인을 완료하고 보던 위치로 돌아가세요.",
          title: "FanLetter 계정 연결",
        };
  }

  return isContentReturn
    ? {
        description:
          "Connect your email account to continue FanLetter fan-only payment and full access.",
        title: "FanLetter Fan-only Account Connect",
      }
    : {
        description:
          "Complete FanLetter account connection and readiness confirmation, then return where you left off.",
        title: "FanLetter Account Connect",
      };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterConnectSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readFanletterReferralCode(query.ref);
  const returnToHref = getSafeFanletterReturnTo({
    locale,
    referralCode,
    returnTo: query.returnTo,
  });
  const { description, title } = getFanletterConnectMetadataCopy(
    locale,
    returnToHref,
  );
  const url = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/connect`, referralCode),
    {
      returnTo: returnToHref,
    },
  );
  const ogImagePath = buildFanletterOgImagePath({
    description,
    locale,
    referralCode,
    title,
    variant: "start",
    version: "fanletter-connect-v2",
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

export default async function LocalizedFanletterConnectPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterConnectSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode(query.ref);

  return (
    <FanletterConnectPage
      dictionary={getDictionary(locale)}
      locale={locale}
      referralCode={referralCode}
      returnToHref={getSafeFanletterReturnTo({
        locale,
        referralCode,
        returnTo: query.returnTo,
      })}
    />
  );
}
