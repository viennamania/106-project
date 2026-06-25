import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterCreatorTikTokPage } from "@/components/fanletter-creator-tiktok-page";
import { getFanletterFounderClubMemberPortfolio } from "@/lib/fanletter-founder-club-service";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";
import { hasLocale, type Locale } from "@/lib/i18n";
import { readMemberServerSession } from "@/lib/member-server-session";

export const dynamic = "force-dynamic";

type CreatorTikTokSearchParams = {
  starId?: string | string[];
  tiktok?: string | string[];
  tiktokReason?: string | string[];
};

function readFirstSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getCreatorTikTokMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "AI 스타별 TikTok 채널을 연결하고 활동 기록을 생성하는 전용 화면입니다.",
      title: "AI 스타 TikTok 채널 | FanLetter 크리에이터 여정",
    };
  }

  if (locale === "ja") {
    return {
      description:
        "Connect a Creator TikTok channel per AI Star and generate an AgentRank Reputation Record.",
      title: "AI Star TikTok Channel | FanLetter Creator Journey",
    };
  }

  return {
    description:
      "Connect a Creator TikTok channel per AI Star and generate an AgentRank Reputation Record.",
    title: "AI Star TikTok Channel | FanLetter Creator Journey",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const meta = getCreatorTikTokMeta(locale);

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/fanletter/creator-unlock/tiktok`,
    },
    openGraph: {
      description: meta.description,
      siteName: "AIAVpark",
      title: meta.title,
      type: "website",
      url: `/${locale}/fanletter/creator-unlock/tiktok`,
    },
    twitter: {
      card: "summary_large_image",
      description: meta.description,
      title: meta.title,
    },
  };
}

export default async function FanletterCreatorTikTokRoutePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<CreatorTikTokSearchParams>;
}) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const memberSession = await readMemberServerSession();
  const memberPortfolio = await getFanletterFounderClubMemberPortfolio(
    memberSession?.email ?? null,
  );
  const selectedStarId = normalizeFanletterStarId(
    readFirstSearchParam(query.starId) ?? null,
  );
  const tiktokStatus = readFirstSearchParam(query.tiktok);
  const oauthCallbackStatus =
    tiktokStatus === "connected" || tiktokStatus === "failed"
      ? {
          reason: readFirstSearchParam(query.tiktokReason) ?? null,
          status: tiktokStatus as "connected" | "failed",
        }
      : null;

  return (
    <FanletterCreatorTikTokPage
      isSignedIn={Boolean(memberSession?.email)}
      locale={locale}
      memberPortfolio={memberPortfolio}
      oauthCallbackStatus={oauthCallbackStatus}
      selectedStarId={selectedStarId}
    />
  );
}
