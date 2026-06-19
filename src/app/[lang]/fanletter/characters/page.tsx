import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { FanletterCharacterDirectoryPage } from "@/components/fanletter-character-directory-page";
import {
  fanletterCharacterDirectorySortOptions,
  getFanletterCharacterDirectoryPageData,
  type FanletterCharacterDirectorySort,
} from "@/lib/fanletter-content-service";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import {
  FANLETTER_NSFW_OPT_IN_COOKIE,
  isFanletterNsfwOptedIn,
} from "@/lib/fanletter-nsfw";
import {
  readFanletterReferralCode,
  readFirstSearchParam,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";

type FanletterCharactersSearchParams = {
  page?: string | string[];
  q?: string | string[];
  ref?: string | string[];
  sort?: string | string[];
};

function readCharactersSort(
  rawValue?: string | string[],
): FanletterCharacterDirectorySort {
  const value = readFirstSearchParam(rawValue);

  return fanletterCharacterDirectorySortOptions.includes(
    value as FanletterCharacterDirectorySort,
  )
    ? (value as FanletterCharacterDirectorySort)
    : "featured";
}

function readCharactersPage(rawValue?: string | string[]) {
  const parsed = Number(readFirstSearchParam(rawValue));

  return Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 1;
}

function getCharactersMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "AIAVpark에서 브이로그와 팬 반응으로 성장 중인 AI 스타를 발견하고 파운더 참여로 이어가세요.",
      title: "AIAVpark AI 스타 발견",
    };
  }

  return {
    description:
      "Discover AIAVpark AI Stars growing through vlogs and fan reactions, then continue into Founder participation.",
    title: "AIAVpark AI Star Discovery",
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterCharactersSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readFanletterReferralCode(query.ref);
  const meta = getCharactersMeta(locale);
  const url = buildPathWithReferral(
    `/${locale}/fanletter/characters`,
    referralCode,
  );
  const ogImagePath = buildFanletterOgImagePath({
    description: meta.description,
    locale,
    referralCode,
    title: meta.title,
    variant: "feed",
    version: "fanletter-characters-v1",
  });
  const ogImage = {
    alt: getFanletterOgAlt(locale, "feed"),
    height: FANLETTER_OG_IMAGE_SIZE.height,
    type: "image/png",
    url: ogImagePath,
    width: FANLETTER_OG_IMAGE_SIZE.width,
  };

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      description: meta.description,
      images: [ogImage],
      siteName: "AIAVpark",
      title: meta.title,
      type: "website",
      url,
    },
    twitter: {
      card: "summary_large_image",
      description: meta.description,
      images: [ogImage],
      title: meta.title,
    },
  };
}

export default async function LocalizedFanletterCharactersPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterCharactersSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode(query.ref);
  const cookieStore = await cookies();
  const includeNsfw = isFanletterNsfwOptedIn(
    cookieStore.get(FANLETTER_NSFW_OPT_IN_COOKIE)?.value,
  );
  const data = await getFanletterCharacterDirectoryPageData(
    locale,
    referralCode,
    {
      includeNsfw,
      page: readCharactersPage(query.page),
      query: readFirstSearchParam(query.q),
      sort: readCharactersSort(query.sort),
    },
  );

  return (
    <FanletterCharacterDirectoryPage
      data={data}
      locale={locale}
      referralCode={data.referralCode}
    />
  );
}
