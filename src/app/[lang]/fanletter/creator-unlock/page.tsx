import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterCreatorUnlockPage } from "@/components/fanletter-creator-unlock-page";
import { getFanletterAgentRankFounderContribution } from "@/lib/agentrank/score";
import {
  normalizeAgentRankCoverageAction,
  readFirstSearchParam,
} from "@/lib/agentrank/coverage-action";
import {
  getFanletterFounderClubCreatorUnlock,
  getFanletterFounderClubMemberPortfolio,
} from "@/lib/fanletter-founder-club-service";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";
import { hasLocale, type Locale } from "@/lib/i18n";
import { readMemberServerSession } from "@/lib/member-server-session";

export const dynamic = "force-dynamic";

function getCreatorUnlockMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "Creator Club 2.0에서 크리에이터 권한 활성화 후 새 AI 스타를 출시하는 10 USDT 미리보기 흐름입니다.",
      title: "크리에이터 권한 활성화 | AIAVpark Creator Club 2.0",
    };
  }

  if (locale === "ja") {
    return {
      description:
        "Preview the Creator Club 2.0 Creator Permission Activation flow for launching a new AI Star before real checkout.",
      title: "Creator Permission Activation | AIAVpark Creator Club 2.0",
    };
  }

  return {
    description:
      "Preview the Creator Club 2.0 Creator Permission Activation flow for launching a new AI Star before real checkout.",
    title: "Creator Permission Activation | AIAVpark Creator Club 2.0",
  };
}

type CreatorUnlockSearchParams = {
  coverageAction?: string | string[];
  starId?: string | string[];
};

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
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<CreatorUnlockSearchParams>;
}) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const coverageAction = normalizeAgentRankCoverageAction(query.coverageAction);
  const coverageStarId = normalizeFanletterStarId(
    readFirstSearchParam(query.starId) ?? null,
  );
  const memberSession = await readMemberServerSession();
  const memberEmail = memberSession?.email ?? null;
  const [memberPortfolio, founderContribution] = await Promise.all([
    getFanletterFounderClubMemberPortfolio(memberEmail),
    getFanletterAgentRankFounderContribution({
      limit: 250,
      memberEmail,
    }),
  ]);
  const creatorUnlock = await getFanletterFounderClubCreatorUnlock(memberEmail, {
    founderContribution,
  });

  return (
    <FanletterCreatorUnlockPage
      creatorUnlock={creatorUnlock}
      founderContribution={founderContribution}
      coverageAction={
        coverageAction
          ? {
              action: coverageAction,
              starId: coverageStarId,
            }
          : null
      }
      isSignedIn={Boolean(memberSession?.email)}
      locale={locale}
      memberPortfolio={memberPortfolio}
    />
  );
}
