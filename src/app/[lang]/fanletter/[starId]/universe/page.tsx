import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterFounderUniverseExplorer } from "@/components/fanletter-founder-universe-explorer";
import { getFanletterFounderUniverseExplorer } from "@/lib/fanletter-founder-universe-explorer-service";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";
import { hasLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; starId: string }>;
}): Promise<Metadata> {
  const { lang, starId: rawStarId } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const starId = normalizeFanletterStarId(rawStarId);
  const universe = starId
    ? await getFanletterFounderUniverseExplorer(starId)
    : null;

  if (!universe) {
    return {
      title: "Founder Universe | FanLetter",
    };
  }

  const starName =
    universe.star.name?.trim() || universe.star.displayName?.trim() || "AI Star";
  const title = `${starName} Founder Universe Explorer`;
  const description = `${starName} AI Star Founder Universe with ${universe.totals.totalMembers} members and ${universe.totals.edgeCount} referral edges.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/fanletter/${universe.star.id}/universe`,
    },
    openGraph: {
      description,
      siteName: "AIAVpark",
      title,
      type: "website",
      url: `/${locale}/fanletter/${universe.star.id}/universe`,
    },
    twitter: {
      card: "summary_large_image",
      description,
      title,
    },
  };
}

export default async function FanletterFounderUniverseExplorerRoute({
  params,
}: {
  params: Promise<{ lang: string; starId: string }>;
}) {
  const { lang, starId: rawStarId } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const starId = normalizeFanletterStarId(rawStarId);

  if (!starId) {
    notFound();
  }

  const universe = await getFanletterFounderUniverseExplorer(starId);

  if (!universe) {
    notFound();
  }

  return <FanletterFounderUniverseExplorer locale={lang} universe={universe} />;
}
