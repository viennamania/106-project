import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterContentDetailPage } from "@/components/fanletter-subpages";
import { getFanletterPublicContentDetail } from "@/lib/fanletter-content-service";
import { getPublishedContentShareMetadata } from "@/lib/content-service";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";

type FanletterContentSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

function readReferralCode(rawValue?: string | string[]) {
  return normalizeReferralCode(Array.isArray(rawValue) ? rawValue[0] : rawValue);
}

function normalizeReturnToPath(
  value: string | string[] | undefined,
  locale: Locale,
) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (!candidate || !candidate.startsWith(`/${locale}/`)) {
    return null;
  }

  if (candidate.startsWith("//")) {
    return null;
  }

  return candidate;
}

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
      ? "FanLetter 콘텐츠"
      : "FanLetter content";
  const description =
    content?.summary ??
    (locale === "ko"
      ? "FanLetter 공개 콘텐츠 상세 페이지입니다."
      : "A public FanLetter content detail page.");
  const ogImagePath = `/api/og/content?lang=${locale}&contentId=${encodeURIComponent(contentId)}${content ? `&v=${encodeURIComponent(content.updatedAt.toISOString())}` : ""}`;
  const openGraphType = content?.hasVideo ? "video.other" : "website";

  return {
    title,
    description,
    openGraph: {
      description,
      images: [
        {
          alt: content?.title ?? "FanLetter",
          height: 630,
          url: ogImagePath,
          width: 1200,
        },
      ],
      title,
      type: openGraphType,
      url: `/${locale}/fanletter/content/${contentId}`,
    },
    twitter: {
      card: "summary_large_image",
      description,
      images: [ogImagePath],
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
  const content = await getFanletterPublicContentDetail(contentId);

  if (!content) {
    notFound();
  }

  return (
    <FanletterContentDetailPage
      content={content}
      locale={locale}
      referralCode={readReferralCode(query.ref)}
      returnToHref={normalizeReturnToPath(query.returnTo, locale)}
    />
  );
}
