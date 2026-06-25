import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterMyAIPage } from "@/components/fanletter-my-ai-page";
import {
  tryGetFanletterAIStarStoredSocialAccount,
} from "@/lib/fanletter-ai-star-social-accounts";
import {
  getFanletterFounderClubHomeStars,
  getFanletterFounderClubMemberPortfolio,
} from "@/lib/fanletter-founder-club-service";
import { hasLocale, type Locale } from "@/lib/i18n";
import { readMemberServerSession } from "@/lib/member-server-session";
import type { FanletterAIStarSocialAccount } from "@/mock/fanletter-social-accounts";

export const dynamic = "force-dynamic";

function getMyAIMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "내가 운영하는 AI 스타, TikTok 연결 상태, 크리에이터 권한 활성화와 활동 기록을 확인하세요.",
      title: "내 AI | FanLetter",
    };
  }

  return {
    description:
      "Review AI Stars you operate, TikTok connection status, Creator permission activation, and reputation records.",
    title: "My AI | FanLetter",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const meta = getMyAIMeta(locale);

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/fanletter/my-ai`,
    },
    openGraph: {
      description: meta.description,
      siteName: "AIAVpark",
      title: meta.title,
      type: "website",
      url: `/${locale}/fanletter/my-ai`,
    },
    twitter: {
      card: "summary_large_image",
      description: meta.description,
      title: meta.title,
    },
  };
}

export default async function FanletterMyAIRoutePage({
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
  const storedSocialAccounts = await Promise.all(
    (portfolio?.ownedStars ?? []).map((star) =>
      tryGetFanletterAIStarStoredSocialAccount({
        platform: "tiktok",
        starId: star.id,
      }),
    ),
  );

  return (
    <FanletterMyAIPage
      isSignedIn={Boolean(memberEmail)}
      locale={locale}
      portfolio={portfolio}
      stars={stars}
      storedSocialAccounts={storedSocialAccounts.filter(
        (account): account is FanletterAIStarSocialAccount =>
          Boolean(account),
      )}
    />
  );
}
