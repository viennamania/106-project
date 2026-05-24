import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { FanletterNewsCharacterRequestPage } from "@/components/fanletter-news-character-request-page";
import type { FanletterNewsReportDocument } from "@/lib/content";
import { getFanletterCreatorPageData } from "@/lib/fanletter-content-service";
import { getFanletterNewsReportsForCharacterChannel } from "@/lib/fanletter-news-report-service";
import {
  FANLETTER_NSFW_OPT_IN_COOKIE,
  isFanletterNsfwOptedIn,
} from "@/lib/fanletter-nsfw";
import { getFanletterNewsCharacterVlogsHref } from "@/lib/fanletter-news-vlog-routing";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";
import { readMemberServerSession } from "@/lib/member-server-session";

type FanletterNewsCharacterRequestSearchParams = {
  action?: string | string[];
  location?: string | string[];
  mood?: string | string[];
  note?: string | string[];
  ref?: string | string[];
};

function readOptionalPresetParam(value?: string | string[]) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const normalizedValue = rawValue?.trim() ?? "";

  return normalizedValue || null;
}

function hasPresetValue(
  preset: Record<"action" | "location" | "mood" | "note", string | null>,
) {
  return Object.values(preset).some(Boolean);
}

function getArticleDisplayTitle(title: string) {
  return title.replace(/^\[(AI 팬 리포트|AI fan report)\]\s*/i, "");
}

function getReportDate(report: FanletterNewsReportDocument) {
  return report.sourcePublishedAt ?? report.createdAt ?? null;
}

function formatDate(value: Date | string | null, locale: Locale) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; referralCode: string }>;
}): Promise<Metadata> {
  const { lang, referralCode } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const normalizedReferralCode = normalizeReferralCode(referralCode) ?? referralCode;
  const data = await getFanletterCreatorPageData(locale, normalizedReferralCode);
  const characterName = data?.profile.character?.name ?? data?.profile.displayName;
  const title = characterName
    ? locale === "ko"
      ? `${characterName} 팬 요청 | FanLetter News`
      : `${characterName} fan request | FanLetter News`
    : locale === "ko"
      ? "FanLetter News 팬 요청"
      : "FanLetter News fan request";
  const description = characterName
    ? locale === "ko"
      ? `${characterName}에게 FanLetter News 전용 팬 요청을 남기는 페이지입니다.`
      : `Leave a FanLetter News fan request for ${characterName}.`
    : locale === "ko"
      ? "FanLetter News 전용 팬 요청 페이지입니다."
      : "A FanLetter News-only fan request page.";
  const image =
    data?.profile.character?.avatarImageSet[0]?.url ??
    data?.profile.avatarImageUrl ??
    data?.items[0]?.coverImageUrl ??
    null;
  const url = `/${locale}/fanletter/news/characters/${normalizedReferralCode}/request`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      description,
      images: image ? [{ url: image }] : undefined,
      siteName: "FanLetter News",
      title,
      type: "website",
      url,
    },
    robots: {
      follow: false,
      index: false,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      description,
      images: image ? [image] : undefined,
      title,
    },
  };
}

export default async function LocalizedFanletterNewsCharacterRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; referralCode: string }>;
  searchParams: Promise<FanletterNewsCharacterRequestSearchParams>;
}) {
  const { lang, referralCode } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const normalizedCharacterReferralCode = normalizeReferralCode(referralCode);

  if (!normalizedCharacterReferralCode) {
    notFound();
  }

  const referralCodeFromQuery = readFanletterReferralCode(query.ref);
  const memberSession = await readMemberServerSession();
  const cookieStore = await cookies();
  const nsfwOptInEnabled = isFanletterNsfwOptedIn(
    cookieStore.get(FANLETTER_NSFW_OPT_IN_COOKIE)?.value,
  );
  const [data, newsData] = await Promise.all([
    getFanletterCreatorPageData(
      locale,
      normalizedCharacterReferralCode,
      memberSession?.email ?? null,
      { includeNsfw: nsfwOptInEnabled },
    ),
    getFanletterNewsReportsForCharacterChannel({
      creatorReferralCode: normalizedCharacterReferralCode,
      limit: 6,
      locale,
    }),
  ]);

  if (!data) {
    notFound();
  }

  const effectiveReferralCode =
    referralCodeFromQuery ?? data.profile.referralCode;
  const initialPreset = {
    action: readOptionalPresetParam(query.action),
    location: readOptionalPresetParam(query.location),
    mood: readOptionalPresetParam(query.mood),
    note: readOptionalPresetParam(query.note),
  };
  const hasInitialPreset = hasPresetValue(initialPreset);
  const character = data.profile.character;
  const characterName = character?.name ?? data.profile.displayName;
  const characterSummary =
    character?.summary ||
    data.profile.intro ||
    (locale === "ko"
      ? "FanLetter News에서 성장 중인 AI 캐릭터입니다."
      : "An AI character growing inside FanLetter News.");
  const avatarImageUrl =
    character?.avatarImageSet[0]?.url ??
    data.profile.avatarImageUrl ??
    data.items[0]?.coverImageUrl ??
    null;
  const newsHomeHref = buildPathWithReferral(
    `/${locale}/fanletter/news`,
    effectiveReferralCode,
  );
  const charactersHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters`,
    effectiveReferralCode,
  );
  const channelHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters/${data.profile.referralCode}`,
    effectiveReferralCode,
  );
  const publicVlogsHref = getFanletterNewsCharacterVlogsHref({
    creatorReferralCode: data.profile.referralCode,
    locale,
    referralCode: effectiveReferralCode,
  });
  const requestHref = buildPathWithReferral(
    `/${locale}/fanletter/news/characters/${data.profile.referralCode}/request`,
    effectiveReferralCode,
  );
  const requestHrefWithPreset = hasInitialPreset
    ? setPathSearchParams(requestHref, initialPreset)
    : requestHref;
  const connectHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/connect`, effectiveReferralCode),
    { returnTo: requestHrefWithPreset },
  );
  const latestReport = newsData.reports[0]
    ? {
        coverImageUrl: newsData.reports[0].coverImageUrl,
        dek: newsData.reports[0].dek,
        href: buildPathWithReferral(
          `/${locale}/fanletter/news/${newsData.reports[0].reportId}`,
          effectiveReferralCode,
        ),
        publishedAt: formatDate(getReportDate(newsData.reports[0]), locale),
        title: getArticleDisplayTitle(newsData.reports[0].title),
      }
    : null;

  return (
    <FanletterNewsCharacterRequestPage
      avatarImageUrl={avatarImageUrl}
      channelHref={channelHref}
      characterName={characterName}
      characterSummary={characterSummary}
      charactersHref={charactersHref}
      connectHref={connectHref}
      creatorReferralCode={data.profile.referralCode}
      fanOnlyContentCount={data.fanOnlyContentCount}
      initialPreset={hasInitialPreset ? initialPreset : null}
      isMemberConnected={Boolean(memberSession)}
      key={requestHrefWithPreset}
      latestReport={latestReport}
      locale={locale}
      newsHomeHref={newsHomeHref}
      newsReportCount={newsData.reportCount}
      publicContentCount={data.publicContentCount}
      publicVlogsHref={publicVlogsHref}
      recentRequests={data.fanRequestPreviews}
    />
  );
}
