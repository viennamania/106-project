import "server-only";

import { randomUUID } from "node:crypto";

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
  getContentSocialActionsCollection,
  getContentPostsCollection,
  getCreatorProfilesCollection,
  getFanletterNewsReportsCollection,
} from "@/lib/mongodb";
import {
  getLatestFanletterNewsReports,
} from "@/lib/fanletter-news-report-service";
import {
  getFanletterNewsShareCohortSignals,
  hasFanletterNewsShareCohortSignals,
  type FanletterNewsShareCohortSignals,
} from "@/lib/fanletter-news-share-cohort";
import {
  FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD,
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
const FANLETTER_NEWS_PUBLIC_CUT_FEED_SOCIAL_LOOKAHEAD_LIMIT = 144;
const FANLETTER_NEWS_PUBLIC_CUT_FEED_ARCHIVE_UNLOCKED_CONTENT_LIMIT = 96;
const FANLETTER_NEWS_PUBLIC_CUT_FEED_ARCHIVE_UNLOCKED_CONTENT_POOL_LIMIT = 240;
const FANLETTER_NEWS_PUBLIC_CUT_FEED_ARCHIVE_UNLOCKED_REPORT_LIMIT = 36;
const FANLETTER_NEWS_PUBLIC_CUT_FEED_ARCHIVE_UNLOCKED_REPORT_POOL_LIMIT = 144;
const FANLETTER_NEWS_PUBLIC_CUT_FEED_ARCHIVE_UNLOCKED_FIRST_INDEX = 5;
const FANLETTER_NEWS_PUBLIC_CUT_FEED_ARCHIVE_UNLOCKED_INTERVAL = 8;
const FANLETTER_NEWS_PUBLIC_CUT_FEED_ROTATION_BUCKET_MS = 1000 * 60 * 15;

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

export function createFanletterNewsPublicCutFeedRotationSeed() {
  const timeBucket = Math.floor(
    Date.now() / FANLETTER_NEWS_PUBLIC_CUT_FEED_ROTATION_BUCKET_MS,
  );
  const randomPart = randomUUID().replace(/-/g, "").slice(0, 16);

  return `cut-feed:${timeBucket}:${randomPart}`;
}

function normalizePublicCutFeedRotationSeed(value?: string | null) {
  return value?.trim().slice(0, 128) || createFanletterNewsPublicCutFeedRotationSeed();
}

function hashPublicCutFeedSeed(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getPublicCutFeedSeedRank(seed: string, value: string) {
  return hashPublicCutFeedSeed(`${seed}:${value}`);
}

function shufflePublicCutFeedItemsBySeed<T>(
  items: T[],
  seed: string,
  getKey: (item: T) => string,
) {
  return [...items].sort((left, right) => {
    const leftRank = getPublicCutFeedSeedRank(seed, getKey(left));
    const rightRank = getPublicCutFeedSeedRank(seed, getKey(right));

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return getKey(left).localeCompare(getKey(right));
  });
}

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

function normalizePublicCutFeedScoreKey(value?: string | null) {
  return value?.trim().toUpperCase() || null;
}

function readShareCohortScore(map: Map<string, number>, key?: string | null) {
  const normalizedKey = normalizePublicCutFeedScoreKey(key);

  return normalizedKey ? (map.get(normalizedKey) ?? 0) : 0;
}

function scoreFanletterNewsShareCohortFit({
  item,
  signals,
}: {
  item: FanletterNewsPublicCutFeedItem;
  signals: FanletterNewsShareCohortSignals | null;
}) {
  if (!hasFanletterNewsShareCohortSignals(signals)) {
    return 0;
  }

  const { report } = item;
  const contentScore = readShareCohortScore(
    signals.contentScoreById,
    report.contentId,
  );
  const creatorScore = readShareCohortScore(
    signals.creatorScoreByReferralCode,
    report.creatorReferralCode,
  );
  const reporterScore = readShareCohortScore(
    signals.reporterScoreByReferralCode,
    report.reporterReferralCode,
  );
  const reportScore = readShareCohortScore(
    signals.reportScoreById,
    report.reportId,
  );

  return (
    Math.min(90, contentScore * 14) +
    Math.min(70, creatorScore * 10) +
    Math.min(42, reporterScore * 6) +
    Math.min(30, reportScore * 8)
  );
}

function scoreFanletterNewsPublicCutFeedItem({
  audience,
  focusCreatorReferralCode,
  item,
  mode = "default",
  referralCode,
  shareCohortSignals = null,
  targetReport,
}: {
  audience: FanletterNewsPublicCutFeedAudience;
  focusCreatorReferralCode: string | null;
  item: FanletterNewsPublicCutFeedItem;
  mode?: FanletterNewsPublicCutFeedMode;
  referralCode: string | null;
  shareCohortSignals?: FanletterNewsShareCohortSignals | null;
  targetReport: FanletterNewsReportDocument | null;
}) {
  const { report, sourceReveal } = item;
  const remaining = Math.max(0, sourceReveal.threshold - sourceReveal.count);
  const nearUnlock = !sourceReveal.unlocked && remaining <= 2;
  const referralMatchesReporter = referralCode === report.reporterReferralCode;
  const referralMatchesCreator = referralCode === report.creatorReferralCode;
  const focusMatchesCreator =
    normalizePublicCutFeedScoreKey(focusCreatorReferralCode) ===
    normalizePublicCutFeedScoreKey(report.creatorReferralCode);
  let score = 0;

  if (focusCreatorReferralCode) {
    score += focusMatchesCreator ? 640 : -80;
  }

  if (targetReport) {
    if (report.contentId === targetReport.contentId) {
      score += audience === "member" ? 140 : audience === "guest_social" ? 80 : 260;
    }

    if (report.creatorReferralCode === targetReport.creatorReferralCode) {
      score += audience === "member" ? 90 : audience === "guest_social" ? 95 : 180;
    }

    if (report.reporterReferralCode === targetReport.reporterReferralCode) {
      score += audience === "member" ? 70 : audience === "guest_social" ? 55 : 130;
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
    score += scoreFanletterNewsShareCohortFit({
      item,
      signals: shareCohortSignals,
    });
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

function moveDuplicateContentAfterFirstPass(
  sortedItems: FanletterNewsPublicCutFeedItem[],
) {
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

function incrementFeedKeyCount(map: Map<string, number>, key: string | null) {
  if (!key) {
    return;
  }

  map.set(key, (map.get(key) ?? 0) + 1);
}

function diversifySocialGuestFeedItems({
  focusCreatorReferralCode,
  sortedItems,
  targetReport,
}: {
  focusCreatorReferralCode: string | null;
  sortedItems: FanletterNewsPublicCutFeedItem[];
  targetReport: FanletterNewsReportDocument | null;
}) {
  const remaining = [...sortedItems];
  const result: FanletterNewsPublicCutFeedItem[] = [];
  const contentCounts = new Map<string, number>();
  const creatorCounts = new Map<string, number>();
  const targetContentId = normalizePublicCutFeedScoreKey(targetReport?.contentId);
  const targetCreatorCode = normalizePublicCutFeedScoreKey(
    targetReport?.creatorReferralCode,
  );
  const focusCreatorCode = normalizePublicCutFeedScoreKey(
    focusCreatorReferralCode,
  );
  let previousContentId: string | null = null;
  let previousCreatorCode: string | null = null;

  while (remaining.length > 0) {
    const candidateWindowSize = remaining.length;
    let selectedIndex = 0;
    let selectedPenalty = Number.POSITIVE_INFINITY;

    for (let index = 0; index < candidateWindowSize; index += 1) {
      const candidate = remaining[index];
      const contentId = normalizePublicCutFeedScoreKey(candidate.report.contentId);
      const creatorCode = normalizePublicCutFeedScoreKey(
        candidate.report.creatorReferralCode,
      );
      const contentSeenCount = contentId ? (contentCounts.get(contentId) ?? 0) : 0;
      const creatorSeenCount = creatorCode ? (creatorCounts.get(creatorCode) ?? 0) : 0;
      let penalty = index * 4;

      if (contentId && contentId === previousContentId) {
        penalty += 1200;
      }

      if (creatorCode && creatorCode === previousCreatorCode) {
        penalty += creatorCode === focusCreatorCode ? 80 : 520;
      }

      penalty += contentSeenCount * 360;
      penalty += creatorSeenCount * (creatorCode === focusCreatorCode ? 40 : 120);

      if (result.length < 4 && targetContentId && contentId === targetContentId) {
        penalty += 520;
      }

      if (
        result.length < 4 &&
        targetCreatorCode &&
        creatorCode === targetCreatorCode &&
        !focusCreatorCode
      ) {
        penalty += 140;
      }

      if (result.length < 4 && focusCreatorCode) {
        penalty += creatorCode === focusCreatorCode ? -180 : 480;
      }

      if (penalty < selectedPenalty) {
        selectedIndex = index;
        selectedPenalty = penalty;
      }
    }

    const [selectedItem] = remaining.splice(selectedIndex, 1);
    const selectedContentId = normalizePublicCutFeedScoreKey(
      selectedItem.report.contentId,
    );
    const selectedCreatorCode = normalizePublicCutFeedScoreKey(
      selectedItem.report.creatorReferralCode,
    );

    result.push(selectedItem);
    incrementFeedKeyCount(contentCounts, selectedContentId);
    incrementFeedKeyCount(creatorCounts, selectedCreatorCode);
    previousContentId = selectedContentId;
    previousCreatorCode = selectedCreatorCode;
  }

  return result;
}

function sortFanletterNewsPublicCutFeedItems({
  audience,
  focusCreatorReferralCode,
  items,
  mode = "default",
  referralCode,
  shareCohortSignals = null,
  targetReport,
}: {
  audience: FanletterNewsPublicCutFeedAudience;
  focusCreatorReferralCode: string | null;
  items: FanletterNewsPublicCutFeedItem[];
  mode?: FanletterNewsPublicCutFeedMode;
  referralCode: string | null;
  shareCohortSignals?: FanletterNewsShareCohortSignals | null;
  targetReport: FanletterNewsReportDocument | null;
}) {
  const sortedItems = [...items].sort((left, right) => {
    const scoreDelta =
      scoreFanletterNewsPublicCutFeedItem({
        audience,
        focusCreatorReferralCode,
        item: right,
        mode,
        referralCode,
        shareCohortSignals,
        targetReport,
      }) -
      scoreFanletterNewsPublicCutFeedItem({
        audience,
        focusCreatorReferralCode,
        item: left,
        mode,
        referralCode,
        shareCohortSignals,
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
    return audience === "guest_social"
      ? diversifySocialGuestFeedItems({
          focusCreatorReferralCode,
          sortedItems,
          targetReport,
        })
      : sortedItems;
  }

  return moveDuplicateContentAfterFirstPass(sortedItems);
}

function hasPublicCutFeedNeighborConflict(
  item: FanletterNewsPublicCutFeedItem,
  neighbor: FanletterNewsPublicCutFeedItem | null,
) {
  if (!neighbor) {
    return false;
  }

  const itemContentId = normalizePublicCutFeedScoreKey(item.report.contentId);
  const neighborContentId = normalizePublicCutFeedScoreKey(
    neighbor.report.contentId,
  );
  const itemCreatorCode = normalizePublicCutFeedScoreKey(
    item.report.creatorReferralCode,
  );
  const neighborCreatorCode = normalizePublicCutFeedScoreKey(
    neighbor.report.creatorReferralCode,
  );

  return Boolean(
    (itemContentId && itemContentId === neighborContentId) ||
      (itemCreatorCode && itemCreatorCode === neighborCreatorCode),
  );
}

function takeArchiveUnlockedItem({
  archiveItems,
  nextRegularItem,
  previousItem,
  rotationSeed,
}: {
  archiveItems: FanletterNewsPublicCutFeedItem[];
  nextRegularItem: FanletterNewsPublicCutFeedItem | null;
  previousItem: FanletterNewsPublicCutFeedItem | null;
  rotationSeed: string;
}) {
  let preferredIndex = -1;
  let preferredRank = Number.POSITIVE_INFINITY;

  for (let index = 0; index < archiveItems.length; index += 1) {
    const item = archiveItems[index];

    if (
      hasPublicCutFeedNeighborConflict(item, previousItem) ||
      hasPublicCutFeedNeighborConflict(item, nextRegularItem)
    ) {
      continue;
    }

    const rank = getPublicCutFeedSeedRank(
      rotationSeed,
      `${item.report.contentId}:${item.report.reportId}`,
    );

    if (rank < preferredRank) {
      preferredIndex = index;
      preferredRank = rank;
    }
  }

  const selectedIndex = preferredIndex >= 0 ? preferredIndex : 0;
  const [selectedItem] = archiveItems.splice(selectedIndex, 1);

  return selectedItem;
}

function mixArchiveUnlockedFeedItems({
  archiveReportIds,
  audience,
  rotationSeed,
  sortedItems,
}: {
  archiveReportIds: Set<string>;
  audience: FanletterNewsPublicCutFeedAudience;
  rotationSeed: string;
  sortedItems: FanletterNewsPublicCutFeedItem[];
}) {
  if (archiveReportIds.size === 0) {
    return sortedItems;
  }

  const archiveItems = shufflePublicCutFeedItemsBySeed(
    sortedItems.filter(
      (item) =>
        archiveReportIds.has(item.report.reportId) && item.sourceReveal.unlocked,
    ),
    rotationSeed,
    (item) => `${item.report.contentId}:${item.report.reportId}`,
  );

  if (archiveItems.length === 0) {
    return sortedItems;
  }

  const archiveReportIdSet = new Set(
    archiveItems.map((item) => item.report.reportId),
  );
  const regularItems = sortedItems.filter(
    (item) => !archiveReportIdSet.has(item.report.reportId),
  );
  const result: FanletterNewsPublicCutFeedItem[] = [];
  let nextArchiveIndex =
    audience === "guest_direct"
      ? FANLETTER_NEWS_PUBLIC_CUT_FEED_ARCHIVE_UNLOCKED_FIRST_INDEX - 1
      : FANLETTER_NEWS_PUBLIC_CUT_FEED_ARCHIVE_UNLOCKED_FIRST_INDEX;

  for (let index = 0; index < regularItems.length; index += 1) {
    const regularItem = regularItems[index];

    if (result.length >= nextArchiveIndex && archiveItems.length > 0) {
      const archiveItem = takeArchiveUnlockedItem({
        archiveItems,
        nextRegularItem: regularItem,
        previousItem: result.at(-1) ?? null,
        rotationSeed,
      });

      if (archiveItem) {
        result.push(archiveItem);
        nextArchiveIndex +=
          FANLETTER_NEWS_PUBLIC_CUT_FEED_ARCHIVE_UNLOCKED_INTERVAL;
      }
    }

    result.push(regularItem);
  }

  while (archiveItems.length > 0 && result.length >= nextArchiveIndex) {
    const archiveItem = takeArchiveUnlockedItem({
      archiveItems,
      nextRegularItem: null,
      previousItem: result.at(-1) ?? null,
      rotationSeed,
    });

    if (!archiveItem) {
      break;
    }

    result.push(archiveItem);
    nextArchiveIndex +=
      FANLETTER_NEWS_PUBLIC_CUT_FEED_ARCHIVE_UNLOCKED_INTERVAL;
  }

  return result;
}

async function getArchiveUnlockedFanletterNewsReports({
  excludeReportIds,
  locale,
  rotationSeed,
}: {
  excludeReportIds: string[];
  locale: Locale;
  rotationSeed: string;
}) {
  const socialActionsCollection = await getContentSocialActionsCollection();
  const unlockedContentRows = await socialActionsCollection
    .aggregate<{ _id: string; latestRequestedAt: Date | null }>([
      {
        $match: {
          contentId: {
            $type: "string",
          },
          sourceRevealRequested: true,
        },
      },
      {
        $group: {
          _id: "$contentId",
          latestRequestedAt: { $max: "$sourceRevealRequestedAt" },
          sourceRevealCount: { $sum: 1 },
        },
      },
      {
        $match: {
          _id: { $ne: "" },
          sourceRevealCount: {
            $gte: FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD,
          },
        },
      },
      { $sort: { latestRequestedAt: 1, _id: 1 } },
      {
        $limit:
          FANLETTER_NEWS_PUBLIC_CUT_FEED_ARCHIVE_UNLOCKED_CONTENT_POOL_LIMIT,
      },
    ])
    .toArray();
  const unlockedContentIds = shufflePublicCutFeedItemsBySeed(
    unlockedContentRows
      .map((row) => row._id.trim())
      .filter(Boolean),
    rotationSeed,
    (contentId) => contentId,
  ).slice(0, FANLETTER_NEWS_PUBLIC_CUT_FEED_ARCHIVE_UNLOCKED_CONTENT_LIMIT);

  if (unlockedContentIds.length === 0) {
    return [];
  }

  const reportsCollection = await getFanletterNewsReportsCollection();

  const archiveReportPool = await reportsCollection
    .find({
      contentId: { $in: unlockedContentIds },
      ...(excludeReportIds.length > 0
        ? { reportId: { $nin: excludeReportIds } }
        : {}),
      locale,
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
    .sort({ sourcePublishedAt: 1, createdAt: 1 })
    .limit(FANLETTER_NEWS_PUBLIC_CUT_FEED_ARCHIVE_UNLOCKED_REPORT_POOL_LIMIT)
    .toArray();

  return shufflePublicCutFeedItemsBySeed(
    archiveReportPool,
    rotationSeed,
    (report) => `${report.contentId}:${report.reportId}`,
  ).slice(0, FANLETTER_NEWS_PUBLIC_CUT_FEED_ARCHIVE_UNLOCKED_REPORT_LIMIT);
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
  focusCreatorReferralCode = null,
  limit = FANLETTER_NEWS_PUBLIC_CUT_INITIAL_PAGE_SIZE,
  locale,
  mode = "default",
  offset = 0,
  referralCode = null,
  rotationSeed = null,
  shareId = null,
  targetReport = null,
  targetOnly = false,
  timelineAnchorReportId = null,
  viewerEmail = null,
}: {
  excludeReportIds?: string[];
  focusCreatorReferralCode?: string | null;
  limit?: number;
  locale: Locale;
  mode?: FanletterNewsPublicCutFeedMode;
  offset?: number;
  referralCode?: string | null;
  rotationSeed?: string | null;
  shareId?: string | null;
  targetReport?: FanletterNewsReportDocument | null;
  targetOnly?: boolean;
  timelineAnchorReportId?: string | null;
  viewerEmail?: string | null;
}): Promise<FanletterNewsPublicCutFeedPage> {
  const normalizedLimit = normalizePublicCutFeedLimit(limit);
  const normalizedOffset = normalizePublicCutFeedOffset(offset);
  const normalizedReferralCode = referralCode?.trim() || null;
  const normalizedFocusCreatorReferralCode =
    focusCreatorReferralCode?.trim() || null;
  const normalizedRotationSeed = normalizePublicCutFeedRotationSeed(rotationSeed);
  const normalizedShareId = shareId?.trim() || null;
  const normalizedTimelineAnchorReportId =
    timelineAnchorReportId?.trim() || null;
  const audience = resolvePublicCutFeedAudience({
    referralCode: normalizedReferralCode,
    shareId: normalizedShareId,
    targetReport,
    viewerEmail,
  });
  const targetItem = targetReport
    ? createFanletterNewsPublicCutFeedItem(targetReport)
    : null;
  const includeTargetItem = Boolean(targetItem && normalizedOffset === 0);

  if (targetOnly && includeTargetItem && targetItem) {
    const [hydratedTargetItem] = await hydrateFanletterNewsPublicCutFeedItems(
      [targetItem],
      viewerEmail,
    );

    return {
      hasMore: true,
      items: hydratedTargetItem ? [hydratedTargetItem] : [],
      nextOffset: 0,
    };
  }

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
  const lookaheadLimit =
    audience === "guest_social"
      ? FANLETTER_NEWS_PUBLIC_CUT_FEED_SOCIAL_LOOKAHEAD_LIMIT
      : FANLETTER_NEWS_PUBLIC_CUT_FEED_LOOKAHEAD_LIMIT;
  const candidateWindowLimit = Math.max(
    normalizedOffset + queryLimit + 1,
    lookaheadLimit,
  );
  const [reportsCollection, shareCohortSignals] = await Promise.all([
    getFanletterNewsReportsCollection(),
    audience === "guest_social" && normalizedShareId
      ? getFanletterNewsShareCohortSignals(normalizedShareId)
      : Promise.resolve(null),
  ]);
  const publicCutReportQuery = {
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
    status: "published" as const,
  };

  if (normalizedTimelineAnchorReportId && normalizedFocusCreatorReferralCode) {
    const anchorReport =
      targetReport?.reportId === normalizedTimelineAnchorReportId
        ? targetReport
        : await reportsCollection.findOne({
            locale,
            reportId: normalizedTimelineAnchorReportId,
          });
    const anchorCreatorReferralCode = anchorReport?.creatorReferralCode?.trim() || null;
    const anchorCreatorMatches =
      normalizePublicCutFeedScoreKey(anchorCreatorReferralCode) ===
      normalizePublicCutFeedScoreKey(normalizedFocusCreatorReferralCode);

    if (anchorReport && anchorCreatorReferralCode && anchorCreatorMatches) {
      const timelineExcludeReportIds = [
        ...new Set([...normalizedExcludeReportIds, anchorReport.reportId]),
      ];
      const anchorTime = anchorReport.sourcePublishedAt ?? anchorReport.createdAt;
      const timelineReports = await reportsCollection
        .aggregate<FanletterNewsReportDocument>([
          {
            $match: {
              ...publicCutReportQuery,
              ...(anchorReport.contentId.trim()
                ? { contentId: { $ne: anchorReport.contentId.trim() } }
                : {}),
              creatorReferralCode: anchorCreatorReferralCode,
              reportId: { $nin: timelineExcludeReportIds },
            },
          },
          {
            $addFields: {
              publicCutSortTime: { $ifNull: ["$sourcePublishedAt", "$createdAt"] },
            },
          },
          {
            $addFields: {
              timelineDistanceMs: {
                $abs: { $subtract: ["$publicCutSortTime", anchorTime] },
              },
              timelineDirection: {
                $cond: [{ $gt: ["$publicCutSortTime", anchorTime] }, 0, 1],
              },
            },
          },
          {
            $sort: {
              timelineDirection: 1,
              timelineDistanceMs: 1,
              publicCutSortTime: 1,
              reportId: 1,
            },
          },
          { $skip: normalizedOffset },
          { $limit: queryLimit + 1 },
          {
            $project: {
              publicCutSortTime: 0,
              timelineDirection: 0,
              timelineDistanceMs: 0,
            },
          },
        ])
        .toArray();
      const timelineItems = timelineReports
        .slice(0, queryLimit)
        .map((report) => createFanletterNewsPublicCutFeedItem(report))
        .filter((item): item is FanletterNewsPublicCutFeedItem => Boolean(item));
      const hydratedTimelineItems = await hydrateFanletterNewsPublicCutFeedItems(
        timelineItems,
        viewerEmail,
      );

      return {
        hasMore: timelineReports.length > queryLimit,
        items: hydratedTimelineItems,
        nextOffset: normalizedOffset + hydratedTimelineItems.length,
      };
    }
  }

  const [reports, focusedCreatorReports] = await Promise.all([
    reportsCollection
      .find(publicCutReportQuery)
      .sort({ sourcePublishedAt: -1, createdAt: -1 })
      .limit(candidateWindowLimit)
      .toArray(),
    normalizedFocusCreatorReferralCode
      ? reportsCollection
          .find({
            ...publicCutReportQuery,
            creatorReferralCode: normalizedFocusCreatorReferralCode,
          })
          .sort({ sourcePublishedAt: -1, createdAt: -1 })
          .limit(Math.max(queryLimit + 8, 16))
          .toArray()
      : Promise.resolve([]),
  ]);
  const shouldMixArchiveUnlocked =
    mode === "default";
  const archiveReports = shouldMixArchiveUnlocked
    ? await getArchiveUnlockedFanletterNewsReports({
        excludeReportIds: normalizedExcludeReportIds,
        locale,
        rotationSeed: normalizedRotationSeed,
      })
    : [];
  const reportsById = new Map(
    [...focusedCreatorReports, ...reports, ...archiveReports].map((report) => [
      report.reportId,
      report,
    ]),
  );
  const archiveReportIds = new Set(
    archiveReports.map((report) => report.reportId),
  );
  const candidateItems = [...reportsById.values()]
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
    focusCreatorReferralCode: normalizedFocusCreatorReferralCode,
    items: hydratedCandidateItems,
    mode,
    referralCode: normalizedReferralCode,
    shareCohortSignals,
    targetReport,
  });
  const mixedCandidateItems = shouldMixArchiveUnlocked
    ? mixArchiveUnlockedFeedItems({
        archiveReportIds,
        audience,
        rotationSeed: normalizedRotationSeed,
        sortedItems: sortedCandidateItems,
      })
    : sortedCandidateItems;
  const feedItems = mixedCandidateItems.slice(
    normalizedOffset,
    normalizedOffset + queryLimit,
  );
  const items =
    includeTargetItem && hydratedTargetItem
      ? [hydratedTargetItem, ...feedItems]
      : feedItems;

  return {
    hasMore:
      mixedCandidateItems.length > normalizedOffset + queryLimit ||
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
