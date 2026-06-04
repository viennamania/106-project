import "server-only";

import {
  createEmptyContentSocialSummary,
  FANLETTER_NEWS_REPORT_DEFAULT_SLOT_LIMIT,
  normalizeFanletterNewsReportSlotLimit,
  type CreatorProfileDocument,
  type FanletterNewsReportDocument,
  type FanletterNewsReportTeaserImageDocument,
} from "@/lib/content";
import {
  getContentSocialSummaryForViewer,
  getContentSourceRevealParticipants,
} from "@/lib/content-service";
import {
  getContentPostsCollection,
  getCreatorProfilesCollection,
  getFanletterNewsReportsCollection,
} from "@/lib/mongodb";
import {
  getLatestFanletterNewsReports,
} from "@/lib/fanletter-news-report-service";
import {
  createFanletterNewsSourceRevealState,
  type FanletterNewsSourceRevealState,
} from "@/lib/fanletter-news-source-reveal";
import {
  FANLETTER_NEWS_PUBLIC_CUT_INITIAL_PAGE_SIZE,
  FANLETTER_NEWS_PUBLIC_CUT_MAX_PAGE_SIZE,
  type FanletterNewsPublicCutFeedLoadResponse,
  type SerializedFanletterNewsPublicCutFeedItem,
} from "@/lib/fanletter-news-public-cuts-shared";
import type { Locale } from "@/lib/i18n";

const FANLETTER_NEWS_PUBLIC_CUT_LIMIT = 4;
const FANLETTER_NEWS_PUBLIC_CUT_FEED_REPORT_LIMIT =
  FANLETTER_NEWS_PUBLIC_CUT_INITIAL_PAGE_SIZE;
const FANLETTER_NEWS_PUBLIC_CUT_FEED_LOOKAHEAD_LIMIT = 48;

type FanletterNewsPublicCutFeedAudience = "guest_direct" | "guest_social" | "member";
type FanletterNewsPublicCutFeedMode = "default" | "reporter_locked";

export type FanletterNewsPublicCut = {
  imageUrl: string;
  slotNumber: number;
  source: FanletterNewsReportTeaserImageDocument["source"] | "legacy_teaser";
  sourceImageUrl: string | null;
};

export type FanletterNewsPublicCutFeedItem = {
  creatorAvatarImageUrl: string | null;
  cuts: FanletterNewsPublicCut[];
  leadCut: FanletterNewsPublicCut;
  report: FanletterNewsReportDocument;
  reportSlot: {
    full: boolean;
    limit: number;
    remaining: number;
    used: number;
  };
  sourceReveal: FanletterNewsSourceRevealState;
};

function getCreatorAvatarImageUrl(
  profile: Pick<CreatorProfileDocument, "avatarImageSet" | "avatarImageUrl"> | null,
) {
  return (
    profile?.avatarImageSet?.find((avatar) => Boolean(avatar.url.trim()))?.url ??
    profile?.avatarImageUrl?.trim() ??
    null
  );
}

export type FanletterNewsPublicCutFeedPage = {
  hasMore: boolean;
  items: FanletterNewsPublicCutFeedItem[];
  nextOffset: number;
};

function normalizePublicCutFeedLimit(limit: number) {
  if (!Number.isFinite(limit)) {
    return FANLETTER_NEWS_PUBLIC_CUT_INITIAL_PAGE_SIZE;
  }

  return Math.max(
    1,
    Math.min(Math.floor(limit), FANLETTER_NEWS_PUBLIC_CUT_MAX_PAGE_SIZE),
  );
}

function normalizePublicCutFeedOffset(offset: number) {
  if (!Number.isFinite(offset)) {
    return 0;
  }

  return Math.max(0, Math.floor(offset));
}

function resolvePublicCutFeedAudience({
  referralCode,
  shareId,
  targetReport,
  viewerEmail,
}: {
  referralCode?: string | null;
  shareId?: string | null;
  targetReport?: FanletterNewsReportDocument | null;
  viewerEmail?: string | null;
}): FanletterNewsPublicCutFeedAudience {
  if (viewerEmail?.trim()) {
    return "member";
  }

  if (shareId?.trim() || referralCode?.trim() || targetReport) {
    return "guest_social";
  }

  return "guest_direct";
}

function getPublicCutReportSortTime(report: FanletterNewsReportDocument) {
  return (report.sourcePublishedAt ?? report.createdAt).getTime();
}

function scoreFanletterNewsPublicCutFeedItem({
  audience,
  item,
  mode = "default",
  referralCode,
  targetReport,
}: {
  audience: FanletterNewsPublicCutFeedAudience;
  item: FanletterNewsPublicCutFeedItem;
  mode?: FanletterNewsPublicCutFeedMode;
  referralCode: string | null;
  targetReport: FanletterNewsReportDocument | null;
}) {
  const { report, sourceReveal } = item;
  const remaining = Math.max(0, sourceReveal.threshold - sourceReveal.count);
  const nearUnlock = !sourceReveal.unlocked && remaining <= 2;
  const referralMatchesReporter = referralCode === report.reporterReferralCode;
  const referralMatchesCreator = referralCode === report.creatorReferralCode;
  let score = 0;

  if (targetReport) {
    if (report.contentId === targetReport.contentId) {
      score += audience === "member" ? 140 : 260;
    }

    if (report.creatorReferralCode === targetReport.creatorReferralCode) {
      score += audience === "member" ? 90 : 180;
    }

    if (report.reporterReferralCode === targetReport.reporterReferralCode) {
      score += audience === "member" ? 70 : 130;
    }
  }

  if (referralMatchesReporter) {
    score += audience === "member" ? 70 : 180;
  }

  if (referralMatchesCreator) {
    score += audience === "member" ? 60 : 140;
  }

  if (mode === "reporter_locked") {
    score += sourceReveal.unlocked ? -260 : 280;
    score += nearUnlock ? 150 : 0;
    score += sourceReveal.requestedByViewer ? 70 : 0;
    score += sourceReveal.count * 22;
    score += report.coverImageUrl ? 24 : 0;
    score += report.priceType === "free" ? 36 : -20;
    score += report.contentMaturityRating === "nsfw" ? -80 : 0;
  } else if (audience === "guest_social") {
    score += sourceReveal.unlocked ? 120 : 0;
    score += nearUnlock ? 110 : 0;
    score += sourceReveal.count * 15;
    score += report.coverImageUrl ? 18 : 0;
    score += report.priceType === "free" ? 20 : -35;
    score += report.contentMaturityRating === "nsfw" ? -120 : 0;
  } else if (audience === "guest_direct") {
    score += sourceReveal.unlocked ? 180 : 0;
    score += nearUnlock ? 140 : 0;
    score += sourceReveal.count * 18;
    score += report.coverImageUrl ? 30 : 0;
    score += report.priceType === "free" ? 25 : -45;
    score += report.contentMaturityRating === "nsfw" ? -160 : 0;
  } else {
    score += sourceReveal.requestedByViewer ? 190 : 0;
    score += sourceReveal.unlocked ? 120 : 0;
    score += nearUnlock ? 90 : 0;
    score += sourceReveal.count * 10;
    score += report.coverImageUrl ? 12 : 0;
    score += report.contentMaturityRating === "nsfw" ? -20 : 0;
  }

  return score;
}

function sortFanletterNewsPublicCutFeedItems({
  audience,
  items,
  mode = "default",
  referralCode,
  targetReport,
}: {
  audience: FanletterNewsPublicCutFeedAudience;
  items: FanletterNewsPublicCutFeedItem[];
  mode?: FanletterNewsPublicCutFeedMode;
  referralCode: string | null;
  targetReport: FanletterNewsReportDocument | null;
}) {
  const sortedItems = [...items].sort((left, right) => {
    const scoreDelta =
      scoreFanletterNewsPublicCutFeedItem({
        audience,
        item: right,
        mode,
        referralCode,
        targetReport,
      }) -
      scoreFanletterNewsPublicCutFeedItem({
        audience,
        item: left,
        mode,
        referralCode,
        targetReport,
      });

    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    const dateDelta =
      getPublicCutReportSortTime(right.report) -
      getPublicCutReportSortTime(left.report);

    if (dateDelta !== 0) {
      return dateDelta;
    }

    return right.report.reportId.localeCompare(left.report.reportId);
  });

  if (mode !== "reporter_locked") {
    return sortedItems;
  }

  const firstByContentId = new Set<string>();
  const firstPass: FanletterNewsPublicCutFeedItem[] = [];
  const duplicatePass: FanletterNewsPublicCutFeedItem[] = [];

  for (const item of sortedItems) {
    const contentId = item.report.contentId.trim();

    if (!contentId || firstByContentId.has(contentId)) {
      duplicatePass.push(item);
      continue;
    }

    firstByContentId.add(contentId);
    firstPass.push(item);
  }

  return [...firstPass, ...duplicatePass];
}

function getPublicCutsFromReport(
  report: Pick<FanletterNewsReportDocument, "teaserImages" | "teaserImageUrls">,
): FanletterNewsPublicCut[] {
  const croppedCuts =
    report.teaserImages
      ?.filter(
        (image) =>
          image.source === "reporter_cropped" && Boolean(image.imageUrl.trim()),
      )
      .map((image, index) => ({
        imageUrl: image.imageUrl.trim(),
        slotNumber: index + 1,
        source: image.source,
        sourceImageUrl: image.sourceImageUrl.trim() || null,
      })) ?? [];

  if (croppedCuts.length > 0) {
    return croppedCuts.slice(0, FANLETTER_NEWS_PUBLIC_CUT_LIMIT);
  }

  return (report.teaserImageUrls ?? [])
    .map((imageUrl) => imageUrl.trim())
    .filter(Boolean)
    .slice(0, FANLETTER_NEWS_PUBLIC_CUT_LIMIT)
    .map((imageUrl, index) => ({
      imageUrl,
      slotNumber: index + 1,
      source: "legacy_teaser" as const,
      sourceImageUrl: imageUrl,
    }));
}

export function createFanletterNewsPublicCutFeedItem(
  report: FanletterNewsReportDocument,
): FanletterNewsPublicCutFeedItem | null {
  const cuts = getPublicCutsFromReport(report);
  const leadCut = cuts[0] ?? null;

  if (!leadCut) {
    return null;
  }

  return {
    creatorAvatarImageUrl: null,
    cuts,
    leadCut,
    report,
    reportSlot: {
      full: false,
      limit: FANLETTER_NEWS_REPORT_DEFAULT_SLOT_LIMIT,
      remaining: FANLETTER_NEWS_REPORT_DEFAULT_SLOT_LIMIT,
      used: 0,
    },
    sourceReveal: createFanletterNewsSourceRevealState(
      createEmptyContentSocialSummary(),
    ),
  };
}

async function hydrateFanletterNewsPublicCutFeedItemsReportSlots(
  items: FanletterNewsPublicCutFeedItem[],
) {
  if (items.length === 0) {
    return items;
  }

  const uniqueContentIds = [
    ...new Set(
      items
        .map((item) => item.report.contentId.trim())
        .filter((contentId) => contentId.length > 0),
    ),
  ];

  if (uniqueContentIds.length === 0) {
    return items;
  }

  const [postsCollection, reportsCollection] = await Promise.all([
    getContentPostsCollection(),
    getFanletterNewsReportsCollection(),
  ]);
  const [posts, reportSlotRows] = await Promise.all([
    postsCollection
      .find(
        { contentId: { $in: uniqueContentIds } },
        { projection: { contentId: 1, fanReportLimit: 1 } },
      )
      .toArray(),
    reportsCollection
      .aggregate<{ _id: string; count: number }>([
        {
          $match: {
            contentId: { $in: uniqueContentIds },
            status: "published",
          },
        },
        {
          $group: {
            _id: "$contentId",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
  ]);
  const slotLimitByContentId = new Map(
    posts.map((post) => [
      post.contentId,
      normalizeFanletterNewsReportSlotLimit(post.fanReportLimit),
    ]),
  );
  const slotUsedByContentId = new Map(
    reportSlotRows.map((row) => [row._id, row.count]),
  );

  return items.map((item) => {
    const limit =
      slotLimitByContentId.get(item.report.contentId) ??
      FANLETTER_NEWS_REPORT_DEFAULT_SLOT_LIMIT;
    const used = slotUsedByContentId.get(item.report.contentId) ?? 0;

    return {
      ...item,
      reportSlot: {
        full: used >= limit,
        limit,
        remaining: Math.max(0, limit - used),
        used,
      },
    };
  });
}

async function hydrateFanletterNewsPublicCutFeedItemsSourceReveal(
  items: FanletterNewsPublicCutFeedItem[],
  viewerEmail?: string | null,
) {
  if (items.length === 0) {
    return items;
  }

  const uniqueContentIds = [
    ...new Set(
      items
        .map((item) => item.report.contentId.trim())
        .filter((contentId) => contentId.length > 0),
    ),
  ];

  if (uniqueContentIds.length === 0) {
    return items;
  }

  const sourceRevealByContentId = new Map<string, FanletterNewsSourceRevealState>();

  await Promise.all(
    uniqueContentIds.map(async (contentId) => {
      let social = createEmptyContentSocialSummary();

      try {
        const [nextSocial, participants] = await Promise.all([
          getContentSocialSummaryForViewer(contentId, viewerEmail ?? null),
          getContentSourceRevealParticipants(contentId),
        ]);

        social = nextSocial;
        sourceRevealByContentId.set(
          contentId,
          createFanletterNewsSourceRevealState(social, {
            participants,
          }),
        );
      } catch {
        social = createEmptyContentSocialSummary();
        sourceRevealByContentId.set(
          contentId,
          createFanletterNewsSourceRevealState(social),
        );
      }
    }),
  );

  return items.map((item) => ({
    ...item,
    sourceReveal:
      sourceRevealByContentId.get(item.report.contentId) ?? item.sourceReveal,
  }));
}

async function hydrateFanletterNewsPublicCutFeedItemsProfileImages(
  items: FanletterNewsPublicCutFeedItem[],
) {
  if (items.length === 0) {
    return items;
  }

  const creatorReferralCodes = [
    ...new Set(
      items
        .map((item) => item.report.creatorReferralCode?.trim())
        .filter((code): code is string => Boolean(code)),
    ),
  ];

  if (creatorReferralCodes.length === 0) {
    return items;
  }

  const profilesCollection = await getCreatorProfilesCollection();
  const profiles = await profilesCollection
    .find(
      { referralCode: { $in: creatorReferralCodes } },
      {
        projection: {
          avatarImageSet: 1,
          avatarImageUrl: 1,
          referralCode: 1,
        },
      },
    )
    .toArray();
  const creatorAvatarByReferralCode = new Map(
    profiles.map((profile) => [
      profile.referralCode,
      getCreatorAvatarImageUrl(profile),
    ]),
  );

  return items.map((item) => ({
    ...item,
    creatorAvatarImageUrl:
      (item.report.creatorReferralCode
        ? creatorAvatarByReferralCode.get(item.report.creatorReferralCode)
        : null) ?? item.creatorAvatarImageUrl,
  }));
}

async function hydrateFanletterNewsPublicCutFeedItems(
  items: FanletterNewsPublicCutFeedItem[],
  viewerEmail?: string | null,
) {
  const sourceRevealItems =
    await hydrateFanletterNewsPublicCutFeedItemsSourceReveal(items, viewerEmail);
  const reportSlotItems =
    await hydrateFanletterNewsPublicCutFeedItemsReportSlots(sourceRevealItems);

  return hydrateFanletterNewsPublicCutFeedItemsProfileImages(reportSlotItems);
}

export function serializeFanletterNewsPublicCutFeedItem(
  item: FanletterNewsPublicCutFeedItem,
): SerializedFanletterNewsPublicCutFeedItem {
  return {
    cuts: item.cuts,
    leadCut: item.leadCut,
    report: {
      contentId: item.report.contentId,
      contentMaturityRating: item.report.contentMaturityRating,
      coverImageUrl: item.report.coverImageUrl,
      createdAt: item.report.createdAt.toISOString(),
      creatorAvatarImageUrl: item.creatorAvatarImageUrl,
      creatorName: item.report.creatorName,
      creatorReferralCode: item.report.creatorReferralCode,
      dek: item.report.dek,
      priceType: item.report.priceType,
      reporterAvatarImageUrl: item.report.reporterAvatarImageUrl ?? null,
      reporterName: item.report.reporterName,
      reporterReferralCode: item.report.reporterReferralCode,
      reportId: item.report.reportId,
      sourcePublishedAt: item.report.sourcePublishedAt?.toISOString() ?? null,
      title: item.report.title,
    },
    reportSlot: item.reportSlot,
    sourceReveal: item.sourceReveal,
  };
}

export function serializeFanletterNewsPublicCutFeedItems(
  items: FanletterNewsPublicCutFeedItem[],
) {
  return items.map((item) => serializeFanletterNewsPublicCutFeedItem(item));
}

export function serializeFanletterNewsPublicCutFeedPage(
  page: FanletterNewsPublicCutFeedPage,
): FanletterNewsPublicCutFeedLoadResponse {
  return {
    hasMore: page.hasMore,
    items: serializeFanletterNewsPublicCutFeedItems(page.items),
    nextOffset: page.nextOffset,
  };
}

export async function getFanletterNewsPublicCutFeedPage({
  excludeReportIds = [],
  limit = FANLETTER_NEWS_PUBLIC_CUT_INITIAL_PAGE_SIZE,
  locale,
  mode = "default",
  offset = 0,
  referralCode = null,
  shareId = null,
  targetReport = null,
  viewerEmail = null,
}: {
  excludeReportIds?: string[];
  limit?: number;
  locale: Locale;
  mode?: FanletterNewsPublicCutFeedMode;
  offset?: number;
  referralCode?: string | null;
  shareId?: string | null;
  targetReport?: FanletterNewsReportDocument | null;
  viewerEmail?: string | null;
}): Promise<FanletterNewsPublicCutFeedPage> {
  const normalizedLimit = normalizePublicCutFeedLimit(limit);
  const normalizedOffset = normalizePublicCutFeedOffset(offset);
  const normalizedReferralCode = referralCode?.trim() || null;
  const normalizedShareId = shareId?.trim() || null;
  const targetItem = targetReport
    ? createFanletterNewsPublicCutFeedItem(targetReport)
    : null;
  const includeTargetItem = Boolean(targetItem && normalizedOffset === 0);
  const normalizedExcludeReportIds = [
    ...new Set(
      [
        ...excludeReportIds,
        ...(targetItem ? [targetItem.report.reportId] : []),
      ]
        .map((reportId) => reportId.trim())
        .filter(Boolean),
    ),
  ];
  const queryLimit = Math.max(1, normalizedLimit - (includeTargetItem ? 1 : 0));
  const candidateWindowLimit =
    normalizedOffset +
    Math.max(queryLimit + 1, FANLETTER_NEWS_PUBLIC_CUT_FEED_LOOKAHEAD_LIMIT);
  const audience = resolvePublicCutFeedAudience({
    referralCode: normalizedReferralCode,
    shareId: normalizedShareId,
    targetReport,
    viewerEmail,
  });
  const reportsCollection = await getFanletterNewsReportsCollection();
  const reports = await reportsCollection
    .find({
      locale,
      ...(normalizedExcludeReportIds.length > 0
        ? { reportId: { $nin: normalizedExcludeReportIds } }
        : {}),
      $or: [
        {
          teaserImages: {
            $elemMatch: {
              imageUrl: { $regex: /\S/ },
              source: "reporter_cropped",
            },
          },
        },
        {
          teaserImageUrls: {
            $elemMatch: { $regex: /\S/ },
          },
        },
      ],
      status: "published",
    })
    .sort({ sourcePublishedAt: -1, createdAt: -1 })
    .limit(candidateWindowLimit)
    .toArray();
  const candidateItems = reports
    .map((report) => createFanletterNewsPublicCutFeedItem(report))
    .filter((item): item is FanletterNewsPublicCutFeedItem => Boolean(item));
  const hydratedItems = await hydrateFanletterNewsPublicCutFeedItems(
    targetItem ? [targetItem, ...candidateItems] : candidateItems,
    viewerEmail,
  );
  const hydratedTargetItem = targetItem ? hydratedItems[0] ?? null : null;
  const hydratedCandidateItems = targetItem
    ? hydratedItems.slice(1)
    : hydratedItems;
  const sortedCandidateItems = sortFanletterNewsPublicCutFeedItems({
    audience,
    items: hydratedCandidateItems,
    mode,
    referralCode: normalizedReferralCode,
    targetReport,
  });
  const feedItems = sortedCandidateItems.slice(
    normalizedOffset,
    normalizedOffset + queryLimit,
  );
  const items =
    includeTargetItem && hydratedTargetItem
      ? [hydratedTargetItem, ...feedItems]
      : feedItems;

  return {
    hasMore:
      sortedCandidateItems.length > normalizedOffset + queryLimit ||
      reports.length >= candidateWindowLimit,
    items,
    nextOffset: normalizedOffset + feedItems.length,
  };
}

export async function getFanletterNewsPublicCutFeed({
  limit = FANLETTER_NEWS_PUBLIC_CUT_FEED_REPORT_LIMIT,
  locale,
  targetReport = null,
  viewerEmail = null,
}: {
  limit?: number;
  locale: Locale;
  targetReport?: FanletterNewsReportDocument | null;
  viewerEmail?: string | null;
}) {
  if (limit <= FANLETTER_NEWS_PUBLIC_CUT_MAX_PAGE_SIZE) {
    const page = await getFanletterNewsPublicCutFeedPage({
      limit,
      locale,
      targetReport,
      viewerEmail,
    });

    return page.items;
  }

  const normalizedLimit = Math.max(
    1,
    Math.min(Math.floor(limit), FANLETTER_NEWS_PUBLIC_CUT_FEED_REPORT_LIMIT),
  );
  const reports = await getLatestFanletterNewsReports({
    limit: FANLETTER_NEWS_PUBLIC_CUT_FEED_LOOKAHEAD_LIMIT,
    locale,
    promoteFirstReports: true,
  });
  const itemsByReportId = new Map<string, FanletterNewsPublicCutFeedItem>();
  const targetItem = targetReport
    ? createFanletterNewsPublicCutFeedItem(targetReport)
    : null;

  if (targetItem) {
    itemsByReportId.set(targetItem.report.reportId, targetItem);
  }

  for (const report of reports) {
    if (itemsByReportId.has(report.reportId)) {
      continue;
    }

    const item = createFanletterNewsPublicCutFeedItem(report);

    if (item) {
      itemsByReportId.set(report.reportId, item);
    }
  }

  return hydrateFanletterNewsPublicCutFeedItems(
    Array.from(itemsByReportId.values()).slice(0, normalizedLimit),
    viewerEmail,
  );
}
