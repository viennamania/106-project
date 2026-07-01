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

type CreatorUnlockLaunchSearchParams = {
  coverageAction?: string | string[];
  starId?: string | string[];
};

function getMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "실제 결제 없이 10 USDT 생성 의도와 새 AI 스타 생성 미리보기를 확인하는 화면입니다.",
      title: "AI 스타 생성 미리보기 | AIAVpark 크리에이터 여정",
    };
  }

  return {
    description:
      "Preview the 10 USDT mock intent and new AI Star launch without real payment.",
    title: "AI Star Launch Preview | AIAVpark Creator Journey",
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
      canonical: `/${locale}/fanletter/creator-unlock/launch`,
    },
  };
}

export default async function FanletterCreatorUnlockLaunchRoutePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<CreatorUnlockLaunchSearchParams>;
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
      view="launch"
    />
  );
}
