import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { FanletterStarDetailPage } from "@/components/fanletter-star-detail-page";
import {
  getFanletterFounderClubHomeStars,
  getFanletterFounderClubStarScoutShareLoop,
  getFanletterFounderClubStarDetail,
} from "@/lib/fanletter-founder-club-service";
import {
  normalizeFanletterStarId,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { hasLocale, type Locale } from "@/lib/i18n";
import { readMemberServerSession } from "@/lib/member-server-session";
import {
  fanletterV2Mock,
  getFanletterV2LocalizedText,
  getFanletterV2MockStar,
  type AIStar,
} from "@/mock/fanletterV2";

type FanletterStarLandingSearchParams = {
  ref?: string | string[];
};

function buildFanletterStarRedirectHref({
  locale,
  referralCode,
  starId,
}: {
  locale: Locale;
  referralCode: string | null;
  starId: string;
}) {
  const searchParams = new URLSearchParams({
    star: starId,
  });

  if (referralCode) {
    searchParams.set("ref", referralCode);
  }

  return `/${locale}/fanletter?${searchParams.toString()}#founder-club`;
}

async function resolveFanletterStarDetail(starId: string): Promise<{
  relatedStars: AIStar[];
  star: AIStar | null;
}> {
  const mockStar = getFanletterV2MockStar(starId);

  if (mockStar) {
    return {
      relatedStars: fanletterV2Mock.aiStars
        .filter((item) => item.id !== mockStar.id)
        .slice(0, 3),
      star: mockStar,
    };
  }

  const [liveStar, liveStars] = await Promise.all([
    getFanletterFounderClubStarDetail(starId),
    getFanletterFounderClubHomeStars({
      limit: 4,
      selectedStarId: starId,
    }),
  ]);

  if (!liveStar) {
    return {
      relatedStars: [],
      star: null,
    };
  }

  return {
    relatedStars: [
      ...liveStars.filter((item) => item.id !== liveStar.id),
      ...fanletterV2Mock.aiStars,
    ]
      .filter((item, index, list) =>
        list.findIndex((candidate) => candidate.id === item.id) === index,
      )
      .slice(0, 3),
    star: liveStar,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; starId: string }>;
}): Promise<Metadata> {
  const { lang, starId: rawStarId } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const starId = normalizeFanletterStarId(rawStarId);
  const star = starId
    ? (await resolveFanletterStarDetail(starId)).star
    : null;

  if (!star) {
    return {
      title: "AIAVpark | FanLetter",
    };
  }

  const specialty = getFanletterV2LocalizedText(star.specialty, locale);
  const title = `${star.name} Universe | Founder Club 2.0`;
  const description = `${star.name} ${specialty} Founder Universe. Join as Founder, create a mock referral code, and grow Creator progress.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/fanletter/${star.id}`,
    },
    openGraph: {
      description,
      siteName: "AIAVpark",
      title,
      type: "website",
      url: `/${locale}/fanletter/${star.id}`,
    },
    twitter: {
      card: "summary_large_image",
      description,
      title,
    },
  };
}

export default async function FanletterStarLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; starId: string }>;
  searchParams: Promise<FanletterStarLandingSearchParams>;
}) {
  const [{ lang, starId: rawStarId }, query] = await Promise.all([
    params,
    searchParams,
  ]);

  if (!hasLocale(lang)) {
    notFound();
  }

  const starId = normalizeFanletterStarId(rawStarId);

  if (!starId) {
    notFound();
  }

  const { relatedStars, star } = await resolveFanletterStarDetail(starId);
  const referralCode = readFanletterReferralCode(query.ref);
  const memberSession = await readMemberServerSession();

  if (star) {
    const viewerScoutShareLoop =
      await getFanletterFounderClubStarScoutShareLoop({
        email: memberSession?.email ?? null,
        locale: lang,
        starId: star.id,
      });

    return (
      <FanletterStarDetailPage
        isAuthenticated={Boolean(memberSession?.email)}
        inboundReferralCode={referralCode}
        locale={lang}
        relatedStars={relatedStars}
        star={star}
        viewerScoutShareLoop={viewerScoutShareLoop}
      />
    );
  }

  redirect(
    buildFanletterStarRedirectHref({
      locale: lang,
      referralCode,
      starId,
    }),
  );
}
