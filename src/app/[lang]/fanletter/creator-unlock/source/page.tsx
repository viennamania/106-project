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

type CreatorUnlockSourceSearchParams = {
  coverageAction?: string | string[];
  starId?: string | string[];
};

function getMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "새 AI 스타가 어느 AI 스타 유니버스 성과로 탄생하는지 선택하는 Creator Journey 화면입니다.",
      title: "출처 AI 스타 선택 | FanLetter Creator Journey",
    };
  }

  return {
    description:
      "Choose which AI Star Universe powers the new AI Star launch in Creator Journey.",
    title: "Source AI Star | FanLetter Creator Journey",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const meta = getMeta(locale);

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/fanletter/creator-unlock/source`,
    },
  };
}

export default async function FanletterCreatorUnlockSourceRoutePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<CreatorUnlockSourceSearchParams>;
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
      view="source"
    />
  );
}
