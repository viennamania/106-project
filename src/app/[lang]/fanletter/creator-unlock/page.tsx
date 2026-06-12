import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterCreatorUnlockPage } from "@/components/fanletter-creator-unlock-page";
import {
  getFanletterFounderClubCreatorUnlock,
  getFanletterFounderClubMemberPortfolio,
} from "@/lib/fanletter-founder-club-service";
import { hasLocale, type Locale } from "@/lib/i18n";
import { readMemberServerSession } from "@/lib/member-server-session";

export const dynamic = "force-dynamic";

function getCreatorUnlockMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "Founder Club 2.0에서 크리에이터 해금 후 새 AI 스타를 출시하는 10 USDT 미리보기 흐름입니다.",
      title: "크리에이터 해금 | FanLetter Founder Club 2.0",
    };
  }

  if (locale === "ja") {
    return {
      description:
        "Preview the Founder Club 2.0 Creator Unlock flow for launching a new AI Star before real checkout.",
      title: "Creator Unlock | FanLetter Founder Club 2.0",
    };
  }

  return {
    description:
      "Preview the Founder Club 2.0 Creator Unlock flow for launching a new AI Star before real checkout.",
    title: "Creator Unlock | FanLetter Founder Club 2.0",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const meta = getCreatorUnlockMeta(locale);

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/fanletter/creator-unlock`,
    },
    openGraph: {
      description: meta.description,
      siteName: "AIAVpark",
      title: meta.title,
      type: "website",
      url: `/${locale}/fanletter/creator-unlock`,
    },
    twitter: {
      card: "summary_large_image",
      description: meta.description,
      title: meta.title,
    },
  };
}

export default async function FanletterCreatorUnlockRoutePage({
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
  const [memberPortfolio, creatorUnlock] = await Promise.all([
    getFanletterFounderClubMemberPortfolio(memberSession?.email ?? null),
    getFanletterFounderClubCreatorUnlock(memberSession?.email ?? null),
  ]);

  return (
    <FanletterCreatorUnlockPage
      creatorUnlock={creatorUnlock}
      isSignedIn={Boolean(memberSession?.email)}
      locale={locale}
      memberPortfolio={memberPortfolio}
    />
  );
}
