import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterContentDetailPage } from "@/components/fanletter-subpages";
import { getFanletterPublicContentDetail } from "@/lib/fanletter-content-service";
import { getPublishedContentShareMetadata } from "@/lib/content-service";
import { FANLETTER_OG_IMAGE_SIZE } from "@/lib/fanletter-og";
import {
  normalizeFanletterReturnToPath,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { readMemberServerSession } from "@/lib/member-server-session";

type FanletterContentSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ contentId: string; lang: string }>;
}): Promise<Metadata> {
  const { contentId, lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const content = await getPublishedContentShareMetadata(contentId);
  const title = content
    ? `${content.title} | FanLetter`
    : locale === "ko"
      ? "FanLetter 브이로그"
      : "FanLetter vlog";
  const description =
    content?.summary ??
    (locale === "ko"
      ? "FanLetter 공개 AI 캐릭터 브이로그 상세 페이지입니다."
      : "A public FanLetter AI character vlog detail page.");
  const ogImagePath = `/api/og/content?lang=${locale}&contentId=${encodeURIComponent(contentId)}${content ? `&v=${encodeURIComponent(content.updatedAt.toISOString())}` : ""}`;
  const openGraphType = content?.hasVideo ? "video.other" : "website";
  const url = `/${locale}/fanletter/content/${contentId}`;
  const ogImage = {
    alt: content?.title ?? "FanLetter",
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
      type: openGraphType,
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

export default async function LocalizedFanletterContentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ contentId: string; lang: string }>;
  searchParams: Promise<FanletterContentSearchParams>;
}) {
  const { contentId, lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const memberSession = await readMemberServerSession();
  const content = await getFanletterPublicContentDetail(
    contentId,
    locale,
    memberSession?.email ?? null,
  );

  if (!content) {
    notFound();
  }

  return (
    <FanletterContentDetailPage
      content={content}
      locale={locale}
      referralCode={readFanletterReferralCode(query.ref)}
      returnToHref={normalizeFanletterReturnToPath(query.returnTo, locale)}
    />
  );
}
