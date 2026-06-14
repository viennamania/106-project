import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterConnectPage } from "@/components/fanletter-connect-page";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import { getFanletterFounderClubStarDetail } from "@/lib/fanletter-founder-club-service";
import {
  getSafeFanletterReturnTo,
  normalizeFanletterStarId,
  readFanletterReferralCode,
  readFanletterStarId,
  readFirstSearchParam,
} from "@/lib/fanletter-routing";
import { defaultLocale, getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { getFanletterV2MockStar } from "@/mock/fanletterV2";

type FanletterConnectSearchParams = {
  coverageAction?: string | string[];
  ref?: string | string[];
  returnTo?: string | string[];
  star?: string | string[];
  starId?: string | string[];
};

function getFanletterConnectMetadataCopy(locale: Locale, returnToHref: string) {
  const returnToPathname = returnToHref.split(/[?#]/, 1)[0];
  const isContentReturn = returnToPathname.includes("/fanletter/content/");

  if (locale === "ko") {
    return isContentReturn
      ? {
          description:
            "AIAVpark 팬 전용 콘텐츠 결제와 전체 열람을 이어가기 위해 이메일 계정을 연결하세요.",
          title: "AIAVpark 팬 전용 콘텐츠 계정 연결",
        }
      : {
          description:
            "AIAVpark 계정 연결과 시작 준비 확인을 완료하고 보던 위치로 돌아가세요.",
          title: "AIAVpark 계정 연결",
        };
  }

  return isContentReturn
    ? {
        description:
          "Connect your email account to continue AIAVpark fan-only payment and full access.",
        title: "AIAVpark Fan-only Account Connect",
      }
    : {
        description:
          "Complete AIAVpark account connection and readiness confirmation, then return where you left off.",
        title: "AIAVpark Account Connect",
      };
}

function readFanletterStarIdFromReturnTo(returnToHref: string) {
  try {
    const url = new URL(returnToHref, "https://www.net402.ai");

    return (
      normalizeFanletterStarId(url.searchParams.get("starId")) ??
      normalizeFanletterStarId(url.searchParams.get("star"))
    );
  } catch {
    return null;
  }
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
  const returnToHref = getSafeFanletterReturnTo({
    locale,
    referralCode,
    returnTo: query.returnTo,
  });
  const coverageAction = readFirstSearchParam(query.coverageAction)?.trim() ?? null;
  const founderClubStarId =
    readFanletterStarId(query.starId) ??
    readFanletterStarId(query.star) ??
    readFanletterStarIdFromReturnTo(returnToHref);
  const founderClubStar = founderClubStarId
    ? getFanletterV2MockStar(founderClubStarId) ??
      (await getFanletterFounderClubStarDetail(founderClubStarId))
    : null;

  return (
    <FanletterConnectPage
      dictionary={getDictionary(locale)}
      coverageAction={coverageAction}
      founderClubStar={founderClubStar}
      locale={locale}
      referralCode={referralCode}
      returnToHref={returnToHref}
      trackingStarId={founderClubStarId}
    />
  );
}
