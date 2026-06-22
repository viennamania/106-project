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

type CreatorUnlockConditionsSearchParams = {
  coverageAction?: string | string[];
  starId?: string | string[];
};

function getMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "크리에이터 권한 활성화 조건과 다음 행동을 확인하는 FanLetter 크리에이터 여정 전용 화면입니다.",
      title: "크리에이터 권한 조건 | FanLetter 크리에이터 여정",
    };
  }

  return {
    description:
      "Review Creator permission activation conditions and the next action in FanLetter Creator Journey.",
    title: "Creator Conditions | FanLetter Creator Journey",
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
      canonical: `/${locale}/fanletter/creator-unlock/conditions`,
    },
  };
}

export default async function FanletterCreatorUnlockConditionsRoutePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<CreatorUnlockConditionsSearchParams>;
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
      view="conditions"
    />
  );
}
