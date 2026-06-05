import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterNewsConnectPage } from "@/components/fanletter-news-connect-page";
import {
  normalizeFanletterReturnToPath,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { defaultLocale, getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";

type FanletterNewsMeConnectSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

function getMetadataCopy(locale: Locale) {
  return locale === "ko"
    ? {
        description:
          "AIAVpark News 마이 페이지로 돌아가기 위한 전용 뉴스 계정 연결 화면입니다.",
        title: "마이 뉴스 계정 연결",
      }
    : {
        description:
          "A dedicated AIAVpark News account connection screen for returning to the My page.",
        title: "My News Account Connect",
      };
}

function getMyReturnHref({
  locale,
  referralCode,
  returnTo,
}: {
  locale: Locale;
  referralCode: string | null;
  returnTo?: string | string[];
}) {
  const originalReturnToHref = normalizeFanletterReturnToPath(returnTo, locale);
  const myHref = buildPathWithReferral(`/${locale}/fanletter/news/me`, referralCode);

  return originalReturnToHref
    ? setPathSearchParams(myHref, { returnTo: originalReturnToHref })
    : myHref;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsMeConnectSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readFanletterReferralCode(query.ref);
  const { description, title } = getMetadataCopy(locale);
  const url = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/me/connect`, referralCode),
    {
      returnTo: normalizeFanletterReturnToPath(query.returnTo, locale) ?? undefined,
    },
  );

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    robots: {
      follow: false,
      index: false,
    },
  };
}

export default async function LocalizedFanletterNewsMeConnectPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsMeConnectSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode(query.ref);
  const returnToHref = getMyReturnHref({
    locale,
    referralCode,
    returnTo: query.returnTo,
  });

  return (
    <FanletterNewsConnectPage
      dictionary={getDictionary(locale)}
      locale={locale}
      referralCode={referralCode}
      returnToHref={returnToHref}
      surface="my"
    />
  );
}
