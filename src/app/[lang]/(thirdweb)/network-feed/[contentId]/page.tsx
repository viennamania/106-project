import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NetworkFeedDetailPage } from "@/components/network-feed-detail-page";
import { getContentCopy } from "@/lib/content-copy";
import {
  getPublicNetworkFeedForReferralCode,
  getPublishedContentShareMetadata,
} from "@/lib/content-service";
import {
  contentFeedViews,
  type ContentFeedView,
} from "@/lib/content";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";
import { normalizeShareId } from "@/lib/share-tracking";

type NetworkFeedDetailSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
  shareId?: string | string[];
  view?: string | string[];
};

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

function normalizeFeedView(value: string | string[] | undefined): ContentFeedView {
  const candidate = Array.isArray(value) ? value[0] : value;

  return contentFeedViews.includes(candidate as ContentFeedView)
    ? (candidate as ContentFeedView)
    : "network";
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
    ? `${content.title} | ${copy.meta.feedTitle} | 1066friend+`
    : `${copy.meta.feedTitle} | 1066friend+`;
  const description = content?.summary ?? copy.meta.feedDescription;
  const ogImagePath = `/api/og/content?lang=${locale}&contentId=${encodeURIComponent(contentId)}${content ? `&v=${encodeURIComponent(content.updatedAt.toISOString())}` : ""}`;
  const url = `/${locale}/network-feed/${contentId}`;

  return {
    title,
    description,
    openGraph: {
      description,
      images: [
        {
          alt: content?.title ?? copy.meta.feedTitle,
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

export default async function LocalizedNetworkFeedDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ contentId: string; lang: string }>;
  searchParams: Promise<NetworkFeedDetailSearchParams>;
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
  const shareId = normalizeShareId(
    Array.isArray(query.shareId) ? query.shareId[0] : query.shareId,
  );
  const returnToHref = normalizeReturnToPath(query.returnTo, locale);
  const feedView = normalizeFeedView(query.view);
  const initialPublicFeed =
    feedView === "network" && referralCode
      ? await getPublicNetworkFeedForReferralCode(referralCode, locale).catch(
          () => null,
        )
      : null;

  return (
    <NetworkFeedDetailPage
      contentId={contentId}
      dictionary={dictionary}
      feedView={feedView}
      initialPublicFeed={initialPublicFeed}
      locale={locale}
      referralCode={referralCode}
      returnToHref={returnToHref}
      shareId={shareId}
    />
  );
}
