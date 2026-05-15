import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterCreatorPromoSharePage } from "@/components/fanletter-subpages";
import {
  getFanletterCreatorPageData,
  type FanletterCreatorPageData,
} from "@/lib/fanletter-content-service";
import {
  buildFanletterOgImagePath,
  buildFanletterOgVersionToken,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import { getFanletterPromoSponsor } from "@/lib/fanletter-promo-sponsor";
import {
  readFanletterReferralCode,
  readFirstSearchParam,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { setPathSearchParams } from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";
import { normalizeShareId } from "@/lib/share-tracking";

type FanletterPromoShareSearchParams = {
  creator?: string | string[];
  ref?: string | string[];
  sponsor?: string | string[];
};

function formatShareNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale).format(value);
}

function getPromoShareMetadata({
  characterName,
  data,
  locale,
}: {
  characterName: string;
  data: FanletterCreatorPageData;
  locale: Locale;
}) {
  const publicCount = formatShareNumber(data.publicContentCount, locale);
  const fanOnlyCount = formatShareNumber(data.fanOnlyContentCount, locale);

  if (locale === "ko") {
    return {
      description: `무료 브이로그 ${publicCount}개와 팬 전용 티저 ${fanOnlyCount}개를 먼저 확인할 수 있는 FanLetter 공유 전용 페이지입니다.`,
      title: `${characterName} AI 브이로그 프로모션`,
    };
  }

  return {
    description: `A FanLetter promotional share page with ${publicCount} free vlogs and ${fanOnlyCount} fan-only teasers.`,
    title: `${characterName} AI vlog promotion`,
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; shareId: string }>;
  searchParams: Promise<FanletterPromoShareSearchParams>;
}): Promise<Metadata> {
  const { lang, shareId } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const normalizedShareId = normalizeShareId(shareId);
  const creatorReferralCode = normalizeReferralCode(
    readFirstSearchParam(query.creator),
  );
  const queryReferralCode = readFanletterReferralCode(query.ref);
  const sponsor = getFanletterPromoSponsor(readFirstSearchParam(query.sponsor));
  const data = creatorReferralCode
    ? await getFanletterCreatorPageData(locale, creatorReferralCode, null)
    : null;
  const characterName = data?.profile.character?.name ?? data?.profile.displayName;
  const fallbackTitle =
    locale === "ko" ? "FanLetter 공유 페이지" : "FanLetter share page";
  const fallbackDescription =
    locale === "ko"
      ? "FanLetter AI 캐릭터 프로모션 공유 페이지입니다."
      : "A FanLetter AI character promotional share page.";
  const shareMetadata =
    data && characterName
      ? getPromoShareMetadata({ characterName, data, locale })
      : { description: fallbackDescription, title: fallbackTitle };
  const url = setPathSearchParams(
    `/${locale}/fanletter/share/${normalizedShareId ?? shareId}`,
    {
      creator: creatorReferralCode,
      ref: queryReferralCode,
      sponsor: sponsor.slug,
    },
  );
  const ogVisualUrl =
    data?.items[0]?.coverImageUrl ??
    data?.profile.character?.avatarImageSet[0]?.url ??
    data?.profile.avatarImageUrl ??
    null;
  const ogAvatarVersionSeed = data?.profile.character?.avatarImageSet
    .map((avatar) =>
      [avatar.expression, avatar.label, avatar.url].filter(Boolean).join(":"),
    )
    .join("|");
  const ogImagePath = buildFanletterOgImagePath({
    description: shareMetadata.description,
    layout: "promo",
    locale,
    referralCode: creatorReferralCode,
    title: shareMetadata.title,
    variant: "creator",
    version:
      buildFanletterOgVersionToken(
        "creator-promo-share-og-v3",
        normalizedShareId,
        creatorReferralCode,
        sponsor.slug,
        shareMetadata.title,
        shareMetadata.description,
        ogAvatarVersionSeed,
        ogVisualUrl,
        data?.items[0]?.contentId,
      ) ??
      normalizedShareId ??
      creatorReferralCode,
  });
  const ogImage = {
    alt: data
      ? locale === "ko"
        ? `${characterName} FanLetter 프로모션 미리보기`
        : `${characterName} FanLetter promotion preview`
      : getFanletterOgAlt(locale, "creator"),
    height: FANLETTER_OG_IMAGE_SIZE.height,
    type: "image/png",
    url: ogImagePath,
    width: FANLETTER_OG_IMAGE_SIZE.width,
  };

  return {
    title: shareMetadata.title,
    description: shareMetadata.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      description: shareMetadata.description,
      images: [ogImage],
      siteName: "FanLetter",
      title: shareMetadata.title,
      type: "website",
      url,
    },
    robots: {
      follow: true,
      index: false,
    },
    twitter: {
      card: "summary_large_image",
      description: shareMetadata.description,
      images: [ogImage],
      title: shareMetadata.title,
    },
  };
}

export default async function LocalizedFanletterPromoSharePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; shareId: string }>;
  searchParams: Promise<FanletterPromoShareSearchParams>;
}) {
  const { lang, shareId } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const normalizedShareId = normalizeShareId(shareId);
  const creatorReferralCode = normalizeReferralCode(
    readFirstSearchParam(query.creator),
  );

  if (!normalizedShareId || !creatorReferralCode) {
    notFound();
  }

  const data = await getFanletterCreatorPageData(locale, creatorReferralCode, null);

  if (!data) {
    notFound();
  }

  const queryReferralCode = readFanletterReferralCode(query.ref);
  const sponsor = getFanletterPromoSponsor(readFirstSearchParam(query.sponsor));

  return (
    <FanletterCreatorPromoSharePage
      data={data}
      locale={locale}
      referralCode={queryReferralCode ?? data.profile.referralCode}
      shareId={normalizedShareId}
      sponsor={sponsor}
    />
  );
}
