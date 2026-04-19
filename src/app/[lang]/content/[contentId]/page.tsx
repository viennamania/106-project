import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentDetailPage } from "@/components/content-detail-page";
import { getContentCopy } from "@/lib/content-copy";
import {
  getPublishedContentShareMetadata,
} from "@/lib/content-service";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";

function normalizeReturnToPath(value: string | string[] | undefined, locale: Locale) {
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
  const locale = hasLocale(lang) ? lang : "ko";
  const copy = getContentCopy(locale);
  const content = await getPublishedContentShareMetadata(contentId);
  const title = content
    ? `${content.title} | ${copy.meta.detailTitle} | 1066friend+`
    : `${copy.meta.detailTitle} | 1066friend+`;
  const description = content?.summary ?? copy.meta.detailDescription;
  const ogImagePath = `/api/og/content?lang=${locale}&contentId=${encodeURIComponent(contentId)}${content ? `&v=${encodeURIComponent(content.updatedAt.toISOString())}` : ""}`;
  const url = `/${locale}/content/${contentId}`;

  return {
    title,
    description,
    openGraph: {
      description,
      images: [
        {
          alt: content?.title ?? copy.meta.detailTitle,
          height: 630,
          url: ogImagePath,
          width: 1200,
        },
      ],
      title,
      url,
    },
    twitter: {
      card: "summary_large_image",
      description,
      images: [ogImagePath],
      title,
    },
  };
}

export default async function LocalizedContentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ contentId: string; lang: string }>;
  searchParams: Promise<{ ref?: string | string[]; returnTo?: string | string[] }>;
}) {
  const { contentId, lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const dictionary = getDictionary(locale);
  const referralCode = normalizeReferralCode(
    Array.isArray(query.ref) ? query.ref[0] : query.ref,
  );
  const returnToHref = normalizeReturnToPath(query.returnTo, locale);
  const initialTeaser = await getPublishedContentShareMetadata(contentId);

  return (
    <ContentDetailPage
      contentId={contentId}
      dictionary={dictionary}
      initialTeaser={
        initialTeaser
          ? {
              authorDisplayName: initialTeaser.authorDisplayName,
              coverImageUrl: initialTeaser.coverImageUrl,
              publishedAt: initialTeaser.publishedAt?.toISOString() ?? null,
              summary: initialTeaser.summary,
              title: initialTeaser.title,
            }
          : null
      }
      locale={locale}
      referralCode={referralCode}
      returnToHref={returnToHref}
    />
  );
}
