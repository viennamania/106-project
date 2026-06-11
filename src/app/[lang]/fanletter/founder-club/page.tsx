import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterFounderClubPage } from "@/components/fanletter-founder-club-page";
import {
  getFanletterFounderClubHomeStars,
  getFanletterFounderClubMemberPortfolio,
  getFanletterFounderClubStarScoutShareLoop,
} from "@/lib/fanletter-founder-club-service";
import { hasLocale, type Locale } from "@/lib/i18n";
import { readMemberServerSession } from "@/lib/member-server-session";

function getFounderClubMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "내 AI 스타 파운더 역할, 추천 링크, CP, 영향력, 크리에이터 진행률을 관리하는 Founder Club 2.0 포트폴리오입니다.",
      title: "내 파운더 클럽 | FanLetter Founder Club 2.0",
    };
  }

  return {
    description:
      "Manage your AI Star Founder roles, referral links, CP, influence, and Creator progress in Founder Club 2.0.",
    title: "My Founder Club | FanLetter Founder Club 2.0",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const meta = getFounderClubMeta(locale);

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/fanletter/founder-club`,
    },
    openGraph: {
      description: meta.description,
      siteName: "AIAVpark",
      title: meta.title,
      type: "website",
      url: `/${locale}/fanletter/founder-club`,
    },
    twitter: {
      card: "summary_large_image",
      description: meta.description,
      title: meta.title,
    },
  };
}

export default async function FanletterFounderClubRoutePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const memberSession = await readMemberServerSession();
  const memberEmail = memberSession?.email ?? null;
  const [portfolio, stars] = await Promise.all([
    getFanletterFounderClubMemberPortfolio(memberEmail),
    getFanletterFounderClubHomeStars(),
  ]);
  const roleShares =
    portfolio && memberEmail
      ? await Promise.all(
          portfolio.roles.map(async (role) => ({
            loop: await getFanletterFounderClubStarScoutShareLoop({
              email: memberEmail,
              locale,
              starId: role.starId,
            }),
            role,
          })),
        )
      : null;

  return (
    <FanletterFounderClubPage
      locale={locale}
      portfolio={portfolio}
      roleShares={roleShares}
      stars={stars}
    />
  );
}
