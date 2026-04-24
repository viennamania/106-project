import type { Metadata } from "next";

import {
  ContentDetailRoute,
  type ContentDetailRouteSearchParams,
} from "@/components/content-detail-route";
import { getContentCopy } from "@/lib/content-copy";
import {
  getPublishedContentShareMetadata,
} from "@/lib/content-service";
import { hasLocale } from "@/lib/i18n";

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
  searchParams: Promise<ContentDetailRouteSearchParams>;
}) {
  const { contentId, lang } = await params;
  const query = await searchParams;

  return (
    <ContentDetailRoute
      contentId={contentId}
      lang={lang}
      searchParams={query}
    />
  );
}
