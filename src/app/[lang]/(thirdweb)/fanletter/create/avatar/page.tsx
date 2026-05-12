import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterCreatePage } from "@/components/fanletter-create-page";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import {
  readFanletterCreateInitialPlan,
  type FanletterCreateSearchParams,
} from "@/lib/fanletter-create-plan";
import {
  getSafeFanletterReturnTo,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterCreateSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readFanletterReferralCode(query.ref);
  const title =
    locale === "ko"
      ? "FanLetter 표정 컷 브이로그 만들기"
      : "Create a FanLetter Avatar Cut Vlog";
  const description =
    locale === "ko"
      ? "선택한 캐릭터 표정 컷을 reference로 사용해 인물 중심 세로형 브이로그 동영상을 생성하세요."
      : "Use the selected character expression cut as a reference to generate a person-centered vertical vlog video.";
  const url = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/create/avatar`, referralCode),
    {
      returnTo: getSafeFanletterReturnTo({
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
    version: "fanletter-avatar-create-v1",
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

export default async function LocalizedFanletterAvatarCreatePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterCreateSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode(query.ref);

  return (
    <FanletterCreatePage
      experience="avatar"
      initialPlan={readFanletterCreateInitialPlan(query)}
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
