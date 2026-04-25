import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NetworkFeedPage } from "@/components/network-feed-page";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";
import { normalizeShareId } from "@/lib/share-tracking";

type NetworkFeedSearchParams = {
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const title = locale === "ko" ? "저장한 피드" : "Saved feed";
  const description =
    locale === "ko"
      ? "내가 저장한 네트워크 피드를 다시 확인하세요."
      : "Revisit network feed posts you saved.";

  return {
    description,
    robots: {
      follow: false,
      index: false,
    },
    title,
  };
}

export default async function LocalizedSavedNetworkFeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<NetworkFeedSearchParams>;
}) {
  const { lang } = await params;
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

  return (
    <NetworkFeedPage
      dictionary={dictionary}
      feedView="saved"
      locale={locale}
      referralCode={referralCode}
      returnToHref={returnToHref}
      shareId={shareId}
    />
  );
}
