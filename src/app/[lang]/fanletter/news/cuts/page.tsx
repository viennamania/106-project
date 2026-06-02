import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterNewsPublicCutsFeedPage } from "@/components/fanletter-news-public-cuts-feed-page";
import {
  getFanletterNewsPublicCutFeedPage,
  serializeFanletterNewsPublicCutFeedItems,
} from "@/lib/fanletter-news-public-cuts";
import { FANLETTER_NEWS_PUBLIC_CUT_INITIAL_PAGE_SIZE } from "@/lib/fanletter-news-public-cuts-shared";
import {
  readFanletterReferralCode,
  readFirstSearchParam,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { readMemberServerSession } from "@/lib/member-server-session";
import { normalizeShareId } from "@/lib/share-tracking";

type FanletterNewsCutsSearchParams = {
  ref?: string | string[];
  shareId?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        description:
          "팬 기자가 직접 편집한 4컷에서 원본 브이로그, AI 캐릭터, 팬 기자 채널로 이어지는 FanLetter News 홈 피드입니다.",
        title: "FanLetter News 홈 피드",
      }
    : {
        description:
          "A FanLetter News home feed that starts with four cuts edited by fan reporters and continues to source vlogs, AI characters, and reporter channels.",
        title: "FanLetter News Home Feed",
      };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? (lang as Locale) : defaultLocale;
  const copy = getCopy(locale);

  return {
    title: copy.title,
    description: copy.description,
  };
}

export default async function LocalizedFanletterNewsCutsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsCutsSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode(query.ref);
  const shareId = normalizeShareId(readFirstSearchParam(query.shareId));
  const session = await readMemberServerSession();
  const feedPage = await getFanletterNewsPublicCutFeedPage({
    limit: FANLETTER_NEWS_PUBLIC_CUT_INITIAL_PAGE_SIZE,
    locale,
    referralCode,
    shareId,
    viewerEmail: session?.email ?? null,
  });

  return (
    <FanletterNewsPublicCutsFeedPage
      hasMore={feedPage.hasMore}
      items={serializeFanletterNewsPublicCutFeedItems(feedPage.items)}
      locale={locale}
      nextOffset={feedPage.nextOffset}
      referralCode={referralCode}
      shareId={shareId}
    />
  );
}
