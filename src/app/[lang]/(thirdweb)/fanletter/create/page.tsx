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
      ? "AIAVpark 첫 AI 캐릭터 브이로그 만들기"
      : "Create First AIAVpark AI Character Vlog";
  const description =
    locale === "ko"
      ? "AI 캐릭터의 오늘 장면을 세로형 브이로그로 생성하고 AIAVpark 피드에 게시하세요."
      : "Generate today's AI character scene as a vertical vlog and publish it to AIAVpark.";
  const url = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/create`, referralCode),
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
    version: "fanletter-create-v1",
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
    twitter: {
      card: "summary_large_image",
      description,
      images: [ogImage],
      title,
    },
  };
}

export default async function LocalizedFanletterCreatePage({
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
