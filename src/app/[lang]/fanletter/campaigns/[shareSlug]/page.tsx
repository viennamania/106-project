import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterCampaignSharePage } from "@/components/fanletter-campaign-share-page";
import { getFanletterCampaignByShareSlug } from "@/lib/fanletter-campaign-service";
import { getFanletterNewsCutSharePublicCampaignRecap } from "@/lib/fanletter-news-cut-share-links";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; shareSlug: string }>;
}): Promise<Metadata> {
  const { lang, shareSlug } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const campaign = await getFanletterCampaignByShareSlug(
    decodeURIComponent(shareSlug),
  );
  const title = campaign
    ? `${campaign.selectedCharacter.name}의 ${campaign.questName}`
    : locale === "ko"
      ? "FanLetter 캠페인"
      : "FanLetter Campaign";

  return {
    description:
      campaign?.brief.shareCopy ??
      (locale === "ko"
        ? "FanLetter AI 캐릭터 캠페인 공유 페이지입니다."
        : "FanLetter AI character campaign share page."),
    title,
  };
}

export default async function LocalizedFanletterCampaignSharePage({
  params,
}: {
  params: Promise<{ lang: string; shareSlug: string }>;
}) {
  const { lang, shareSlug } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const campaign = await getFanletterCampaignByShareSlug(
    decodeURIComponent(shareSlug),
  );

  if (!campaign) {
    notFound();
  }

  const newsCutRecaps = (
    await Promise.all(
      campaign.placements.map((placement) =>
        getFanletterNewsCutSharePublicCampaignRecap({
          reportId: placement.reportId,
          shareId: placement.shareId,
        }),
      ),
    )
  ).filter((recap): recap is NonNullable<typeof recap> => Boolean(recap));

  return (
    <FanletterCampaignSharePage
      campaign={campaign}
      locale={lang as Locale}
      newsCutRecaps={newsCutRecaps}
    />
  );
}
