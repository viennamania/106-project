import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { ContentBridgePage } from "@/components/content-bridge-page";
import { getContentCopy } from "@/lib/content-copy";
import { getPublishedContentShareMetadata } from "@/lib/content-service";
import {
  inferBridgePlatform,
  isBridgeCrawler,
  isRestrictedInAppBrowser,
} from "@/lib/in-app-browser";
import { hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  buildReferralLandingPath,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";

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
  const url = `/${locale}/content/bridge/${contentId}`;

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

export default async function LocalizedContentBridgePage({
  params,
  searchParams,
}: {
  params: Promise<{ contentId: string; lang: string }>;
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const { contentId, lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = normalizeReferralCode(
    Array.isArray(query.ref) ? query.ref[0] : query.ref,
  );
  const teaser = await getPublishedContentShareMetadata(contentId);

  if (!teaser) {
    notFound();
  }

  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent") ?? "";
  const autoRedirect =
    !isRestrictedInAppBrowser(userAgent) && !isBridgeCrawler(userAgent);
  const targetHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/content/${contentId}`, referralCode),
    { fromBridge: "1" },
  );
  const homeHref = buildReferralLandingPath(locale, referralCode);

  return (
    <ContentBridgePage
      authorDisplayName={teaser.authorDisplayName}
      autoRedirect={autoRedirect}
      coverImageUrl={teaser.coverImageUrl}
      homeHref={homeHref}
      locale={locale}
      platformHint={inferBridgePlatform(userAgent)}
      publishedAt={teaser.publishedAt?.toISOString() ?? null}
      summary={teaser.summary}
      targetHref={targetHref}
      title={teaser.title}
    />
  );
}
