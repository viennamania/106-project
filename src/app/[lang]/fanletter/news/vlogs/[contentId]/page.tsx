import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { FanletterNewsVlogDetailPage } from "@/components/fanletter-news-vlog-pages";
import { getPublishedContentShareMetadata } from "@/lib/content-service";
import { getFanletterPublicContentDetail } from "@/lib/fanletter-content-service";
import { FANLETTER_OG_IMAGE_SIZE } from "@/lib/fanletter-og";
import {
  getFanletterNewsReporterMemberByEmail,
  getFanletterNewsReportsForContent,
} from "@/lib/fanletter-news-report-service";
import {
  FANLETTER_NSFW_OPT_IN_COOKIE,
  isFanletterNsfwOptedIn,
} from "@/lib/fanletter-nsfw";
import {
  normalizeFanletterReturnToPath,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { readMemberServerSession } from "@/lib/member-server-session";

type FanletterNewsVlogSearchParams = {
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
    ? `${content.title} | FanLetter News`
    : locale === "ko"
      ? "FanLetter News 브이로그"
      : "FanLetter News vlog";
  const description =
    content?.summary ??
    (locale === "ko"
      ? "FanLetter News 전용 AI 캐릭터 브이로그 상세 페이지입니다."
      : "A FanLetter News AI character vlog detail page.");
  const ogImagePath = `/api/og/content?lang=${locale}&contentId=${encodeURIComponent(contentId)}${content ? `&v=${encodeURIComponent(content.updatedAt.toISOString())}` : ""}`;
  const url = `/${locale}/fanletter/news/vlogs/${contentId}`;
  const ogImage = {
    alt: content?.title ?? "FanLetter News",
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
      siteName: "FanLetter News",
      title,
      type: content?.hasVideo ? "video.other" : "website",
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

export default async function LocalizedFanletterNewsVlogDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ contentId: string; lang: string }>;
  searchParams: Promise<FanletterNewsVlogSearchParams>;
}) {
  const { contentId, lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const memberSession = await readMemberServerSession();
  const cookieStore = await cookies();
  const includeNsfw = isFanletterNsfwOptedIn(
    cookieStore.get(FANLETTER_NSFW_OPT_IN_COOKIE)?.value,
  );
  const [content, viewerReporterMember] = await Promise.all([
    getFanletterPublicContentDetail(
      contentId,
      locale,
      memberSession?.email ?? null,
      { includeNsfw },
    ),
    getFanletterNewsReporterMemberByEmail(memberSession?.email ?? null, locale),
  ]);

  if (!content) {
    notFound();
  }

  const newsReportResult = await getFanletterNewsReportsForContent({
    contentId,
    limit: 5,
    locale,
    viewerReporterReferralCode: viewerReporterMember?.referralCode ?? null,
  });

  return (
    <FanletterNewsVlogDetailPage
      content={content}
      locale={locale}
      newsReportCount={newsReportResult.reportCount}
      newsReports={newsReportResult.reports}
      referralCode={readFanletterReferralCode(query.ref)}
      returnToHref={normalizeFanletterReturnToPath(query.returnTo, locale)}
    />
  );
}
