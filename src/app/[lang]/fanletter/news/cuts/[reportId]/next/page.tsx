import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterNewsSharedNextPickerPage } from "@/components/fanletter-news-shared-next-picker-page";
import {
  createFanletterNewsPublicCutFeedItem,
  createFanletterNewsPublicCutFeedRotationSeed,
  getFanletterNewsPublicCutFeedItemsByReportIds,
  getFanletterNewsPublicCutFeedPage,
  serializeFanletterNewsPublicCutFeedItem,
  serializeFanletterNewsPublicCutFeedItems,
} from "@/lib/fanletter-news-public-cuts";
import { getFanletterNewsCutShareCampaignReportIds } from "@/lib/fanletter-news-cut-share-links";
import {
  appendFanletterNewsPublicCutJourneyReportId,
  FANLETTER_NEWS_PUBLIC_CUT_JOURNEY_PARAM,
  normalizeFanletterNewsPublicCutSlotNumber,
  readFanletterNewsPublicCutJourneyReportIds,
} from "@/lib/fanletter-news-public-cuts-shared";
import { getFanletterNewsReportById } from "@/lib/fanletter-news-report-service";
import {
  normalizeFanletterReturnToPath,
  readFanletterReferralCode,
  readFirstSearchParam,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral, setPathSearchParams } from "@/lib/landing-branding";
import { readMemberServerSession } from "@/lib/member-server-session";
import { normalizeShareId } from "@/lib/share-tracking";

const SHARED_NEXT_TIMELINE_LIMIT = 6;

type FanletterNewsSharedNextSearchParams = {
  cut?: string | string[];
  journey?: string | string[];
  ref?: string | string[];
  returnTo?: string | string[];
  shareId?: string | string[];
  step?: string | string[];
};

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        description:
          "공유 링크에서 본 4컷 이후 같은 AI 캐릭터의 다음 브이로그 팬 리포트를 선택하는 화면입니다.",
        title: "다음 브이로그 팬 리포트 선택 | AIAVpark News",
      }
    : {
        description:
          "Choose the next fan report from the same AI character after a shared 4-cut report.",
        title: "Choose Next Vlog Fan Report | AIAVpark News",
      };
}

function readSharedJourneyStep(value: string | null) {
  const parsed = value ? Number.parseInt(value, 10) : 1;

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.min(parsed, 12);
}

function getCurrentReportHref({
  cutSlotNumber,
  locale,
  referralCode,
  reportId,
  shareId,
  step,
}: {
  cutSlotNumber: number | null;
  locale: Locale;
  referralCode: string | null;
  reportId: string;
  shareId: string | null;
  step: number;
}) {
  return setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/news/cuts/${reportId}`, referralCode),
    {
      cut: cutSlotNumber ? String(cutSlotNumber) : null,
      shareId,
      step: String(step),
    },
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; reportId: string }>;
  searchParams: Promise<FanletterNewsSharedNextSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? (lang as Locale) : defaultLocale;
  const copy = getCopy(locale);

  return {
    description: copy.description,
    title: copy.title,
  };
}

export default async function LocalizedFanletterNewsSharedNextPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; reportId: string }>;
  searchParams: Promise<FanletterNewsSharedNextSearchParams>;
}) {
  const { lang, reportId } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode(query.ref);
  const shareId = normalizeShareId(readFirstSearchParam(query.shareId));
  const initialCutSlotNumber = normalizeFanletterNewsPublicCutSlotNumber(
    readFirstSearchParam(query.cut),
  );
  const journeyStep = readSharedJourneyStep(
    readFirstSearchParam(query.step) ?? null,
  );
  const journeyReportIds = appendFanletterNewsPublicCutJourneyReportId(
    readFanletterNewsPublicCutJourneyReportIds(
      readFirstSearchParam(query[FANLETTER_NEWS_PUBLIC_CUT_JOURNEY_PARAM]),
    ),
    reportId,
  );
  const session = await readMemberServerSession();
  const report = await getFanletterNewsReportById(reportId);

  if (!report || report.locale !== locale) {
    notFound();
  }

  const completedItem = createFanletterNewsPublicCutFeedItem(report);

  if (!completedItem) {
    notFound();
  }

  const returnToHref =
    normalizeFanletterReturnToPath(query.returnTo, locale) ??
    getCurrentReportHref({
      cutSlotNumber: initialCutSlotNumber,
      locale,
      referralCode,
      reportId: report.reportId,
      shareId,
      step: journeyStep,
    });

  const campaignReportIds = shareId
    ? await getFanletterNewsCutShareCampaignReportIds({ shareId })
    : [];
  const campaignAnchorIndex = campaignReportIds.indexOf(report.reportId);
  const campaignNextReportId =
    campaignAnchorIndex >= 0
      ? campaignReportIds[campaignAnchorIndex + 1] ?? null
      : null;
  const campaignNextItems = campaignNextReportId
    ? await getFanletterNewsPublicCutFeedItemsByReportIds({
        locale,
        reportIds: [campaignNextReportId],
        viewerEmail: session?.email ?? null,
      })
    : [];
  const useCampaignTimeline = campaignAnchorIndex >= 0;
  const timelinePage =
    useCampaignTimeline
      ? {
          hasMore: false,
          items: campaignNextItems,
          nextOffset: campaignNextItems.length,
        }
      : report.creatorReferralCode
        ? await getFanletterNewsPublicCutFeedPage({
            excludeReportIds: [report.reportId],
            focusCreatorReferralCode: report.creatorReferralCode,
            limit: SHARED_NEXT_TIMELINE_LIMIT,
            locale,
            referralCode,
            rotationSeed: createFanletterNewsPublicCutFeedRotationSeed(),
            shareId,
            timelineAnchorReportId: report.reportId,
            viewerEmail: session?.email ?? null,
          })
        : {
            hasMore: false,
            items: [],
            nextOffset: 0,
          };
  const [targetItem = null] = serializeFanletterNewsPublicCutFeedItems(
    timelinePage.items,
  );

  return (
    <FanletterNewsSharedNextPickerPage
      completedItem={serializeFanletterNewsPublicCutFeedItem(completedItem)}
      initialCutSlotNumber={initialCutSlotNumber}
      journeyReportIds={journeyReportIds}
      journeyStep={journeyStep}
      locale={locale}
      referralCode={referralCode}
      returnToHref={returnToHref}
      shareId={shareId}
      targetItem={targetItem}
    />
  );
}
