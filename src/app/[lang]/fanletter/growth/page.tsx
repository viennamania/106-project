import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterGrowthPage } from "@/components/fanletter-growth-page";
import {
  getFanletterFounderClubCreatorUnlock,
  getFanletterFounderClubMemberPortfolio,
} from "@/lib/fanletter-founder-club-service";
import { hasLocale, type Locale } from "@/lib/i18n";
import { readMemberServerSession } from "@/lib/member-server-session";

export const dynamic = "force-dynamic";

function getGrowthMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "FanLetter 성장 허브에서 AI 스타 발견, 파운더 네트워크, Creator Journey, 활동 기록의 다음 행동을 확인하세요.",
      title: "성장 허브 | FanLetter",
    };
  }

  return {
    description:
      "Use the FanLetter Growth Hub to choose the next action across AI Star Discovery, Founder Network, Creator Journey, and Reputation Records.",
    title: "Growth Hub | FanLetter",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const meta = getGrowthMeta(locale);

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/fanletter/growth`,
    },
    openGraph: {
      description: meta.description,
      siteName: "AIAVpark",
      title: meta.title,
      type: "website",
      url: `/${locale}/fanletter/growth`,
    },
    twitter: {
      card: "summary_large_image",
      description: meta.description,
      title: meta.title,
    },
  };
}

export default async function FanletterGrowthRoutePage({
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
  const [portfolio, creatorUnlock] = await Promise.all([
    getFanletterFounderClubMemberPortfolio(memberEmail),
    getFanletterFounderClubCreatorUnlock(memberEmail),
  ]);

  return (
    <FanletterGrowthPage
      creatorUnlock={creatorUnlock}
      isSignedIn={Boolean(memberEmail)}
      locale={locale}
      portfolio={portfolio}
    />
  );
}
