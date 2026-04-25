import { notFound } from "next/navigation";

import { ContentDetailPage } from "@/components/content-detail-page";
import { getPublishedContentShareMetadata } from "@/lib/content-service";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";
import { normalizeShareId } from "@/lib/share-tracking";

export type ContentDetailRouteSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
  shareId?: string | string[];
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

export async function ContentDetailRoute({
  contentId,
  lang,
  presentation = "page",
  searchParams,
}: {
  contentId: string;
  lang: string;
  presentation?: "modal" | "page";
  searchParams: ContentDetailRouteSearchParams;
}) {
  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const dictionary = getDictionary(locale);
  const referralCode = normalizeReferralCode(
    Array.isArray(searchParams.ref) ? searchParams.ref[0] : searchParams.ref,
  );
  const returnToHref = normalizeReturnToPath(searchParams.returnTo, locale);
  const shareId = normalizeShareId(
    Array.isArray(searchParams.shareId)
      ? searchParams.shareId[0]
      : searchParams.shareId,
  );
  const initialTeaser = await getPublishedContentShareMetadata(contentId);

  return (
    <ContentDetailPage
      contentId={contentId}
      dictionary={dictionary}
      initialTeaser={
        initialTeaser
          ? {
              authorAvatarImageUrl: initialTeaser.authorAvatarImageUrl,
              authorDisplayName: initialTeaser.authorDisplayName,
              coverImageUrl: initialTeaser.coverImageUrl,
              priceType: initialTeaser.priceType,
              priceUsdt: initialTeaser.priceUsdt,
              publishedAt: initialTeaser.publishedAt?.toISOString() ?? null,
              summary: initialTeaser.summary,
              title: initialTeaser.title,
            }
          : null
      }
      locale={locale}
      presentation={presentation}
      referralCode={referralCode}
      returnToHref={returnToHref}
      shareId={shareId}
    />
  );
}
