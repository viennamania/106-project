import type { Filter } from "mongodb";

import {
  normalizeContentLocale,
  type ContentPostDocument,
  type FanletterNewsReportDocument,
} from "@/lib/content";
import { FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD } from "@/lib/fanletter-news-source-reveal";
import { defaultLocale, type Locale } from "@/lib/i18n";
import {
  getContentPostsCollection,
  getContentSocialActionsCollection,
  getCreatorProfilesCollection,
} from "@/lib/mongodb";

const LEGACY_NSFW_VIDEO_URL_PATTERN = /(?:^|[\W_])nsfw\d*(?:[\W_]|$)/i;
const CHARACTER_DISCOVERY_COVER_BONUS_MS = 2 * 24 * 60 * 60 * 1000;
const CHARACTER_DISCOVERY_PUBLIC_VIDEO_BONUS_MS = 2 * 24 * 60 * 60 * 1000;
const CHARACTER_DISCOVERY_REPORTER_BONUS_MS = 18 * 60 * 60 * 1000;
const CHARACTER_DISCOVERY_SOURCE_REVEAL_BONUS_MS = 36 * 60 * 60 * 1000;
const CHARACTER_DISCOVERY_TEASER_BONUS_MS = 3 * 24 * 60 * 60 * 1000;
const CHARACTER_DISCOVERY_VOLUME_BONUS_MS = 10 * 60 * 60 * 1000;

export type FanletterNewsCharacterStat = {
  avatarImageUrl: string | null;
  fanOnlyCount: number;
  latestReportAt: Date | null;
  name: string;
  newsCount: number;
  nsfwCount: number;
  publicCount: number;
  publicVideoCount: number;
  referralCode: string;
  representativeReport: FanletterNewsReportDocument;
  reporterCount: number;
  sourceRevealUnlockedCount: number;
};

type FanletterNewsCharacterStatAccumulator = FanletterNewsCharacterStat & {
  reporterReferralCodes: Set<string>;
};

type FanletterNewsCharacterVideoMetrics = {
  publicVideoCount: number;
  sourceRevealUnlockedCount: number;
};

type FanletterNewsCharacterVideoPost = Pick<
  ContentPostDocument,
  "authorReferralCode" | "contentId"
>;

type FanletterNewsCharacterSourceRevealRow = {
  _id: string;
  count: number;
};

type FanletterNewsCharacterStatsSort = "discovery" | "volume";

type FanletterNewsCharacterStatsOptions = {
  sort?: FanletterNewsCharacterStatsSort;
};

type HydrateFanletterNewsCharacterStatsOptions =
  FanletterNewsCharacterStatsOptions & {
    limit?: number;
  };

function getReportSortTime(report: FanletterNewsReportDocument) {
  return (
    report.sourcePublishedAt?.getTime() ??
    report.createdAt?.getTime() ??
    report.updatedAt?.getTime() ??
    0
  );
}

function getReportTeaserScore(report: FanletterNewsReportDocument) {
  const croppedTeaserCount =
    report.teaserImages?.filter((image) => image.source === "reporter_cropped")
      .length ?? 0;

  if (croppedTeaserCount > 0) {
    return Math.min(1, croppedTeaserCount / 4);
  }

  const selectedTeaserCount = report.teaserImageUrls?.length ?? 0;

  return selectedTeaserCount > 0 ? Math.min(0.45, selectedTeaserCount / 8) : 0;
}

function getRepresentativeDiscoveryScore(report: FanletterNewsReportDocument) {
  return (
    getReportSortTime(report) +
    (report.coverImageUrl ? CHARACTER_DISCOVERY_COVER_BONUS_MS : 0) +
    getReportTeaserScore(report) * CHARACTER_DISCOVERY_TEASER_BONUS_MS
  );
}

function compareCharacterVolume(
  left: FanletterNewsCharacterStat,
  right: FanletterNewsCharacterStat,
) {
  return (
    right.newsCount - left.newsCount ||
    (right.latestReportAt?.getTime() ?? 0) -
      (left.latestReportAt?.getTime() ?? 0)
  );
}

function getCharacterDiscoveryScore(character: FanletterNewsCharacterStat) {
  return (
    (character.latestReportAt?.getTime() ?? 0) +
    (character.representativeReport.coverImageUrl
      ? CHARACTER_DISCOVERY_COVER_BONUS_MS
      : 0) +
    getReportTeaserScore(character.representativeReport) *
      CHARACTER_DISCOVERY_TEASER_BONUS_MS +
    Math.min(character.newsCount, 12) * CHARACTER_DISCOVERY_VOLUME_BONUS_MS +
    Math.min(character.reporterCount, 8) *
      CHARACTER_DISCOVERY_REPORTER_BONUS_MS +
    Math.min(character.publicVideoCount, 3) *
      CHARACTER_DISCOVERY_PUBLIC_VIDEO_BONUS_MS +
    Math.min(character.sourceRevealUnlockedCount, 2) *
      CHARACTER_DISCOVERY_SOURCE_REVEAL_BONUS_MS
  );
}

function compareCharacterDiscovery(
  left: FanletterNewsCharacterStat,
  right: FanletterNewsCharacterStat,
) {
  const scoreDelta =
    getCharacterDiscoveryScore(right) - getCharacterDiscoveryScore(left);

  if (scoreDelta !== 0) {
    return scoreDelta;
  }

  return compareCharacterVolume(left, right);
}

function sortFanletterNewsCharacterStats(
  characters: FanletterNewsCharacterStat[],
  options?: FanletterNewsCharacterStatsOptions,
) {
  const compare =
    options?.sort === "discovery"
      ? compareCharacterDiscovery
      : compareCharacterVolume;

  return [...characters].sort(compare);
}

export function getFanletterNewsCharacterStats(
  reports: FanletterNewsReportDocument[],
  limit = 8,
  options?: FanletterNewsCharacterStatsOptions,
) {
  const map = new Map<string, FanletterNewsCharacterStatAccumulator>();

  for (const report of reports) {
    const referralCode = report.creatorReferralCode?.trim();
    const reporterReferralCode = report.reporterReferralCode?.trim();

    if (!referralCode) {
      continue;
    }

    const reportDate = report.sourcePublishedAt ?? report.createdAt ?? null;
    const existing = map.get(referralCode);

    if (!existing) {
      map.set(referralCode, {
        avatarImageUrl: null,
        fanOnlyCount: report.priceType === "paid" ? 1 : 0,
        latestReportAt: reportDate,
        name: report.creatorName.trim() || referralCode,
        newsCount: 1,
        nsfwCount: report.contentMaturityRating === "nsfw" ? 1 : 0,
        publicCount: report.priceType === "free" ? 1 : 0,
        publicVideoCount: 0,
        referralCode,
        representativeReport: report,
        reporterCount: reporterReferralCode ? 1 : 0,
        reporterReferralCodes: new Set(
          reporterReferralCode ? [reporterReferralCode] : [],
        ),
        sourceRevealUnlockedCount: 0,
      });
      continue;
    }

    const existingDateTime = existing.latestReportAt?.getTime() ?? 0;
    const reportDateTime = reportDate?.getTime() ?? 0;
    const shouldUseAsRepresentative =
      options?.sort === "discovery"
        ? getRepresentativeDiscoveryScore(report) >
          getRepresentativeDiscoveryScore(existing.representativeReport)
        : (report.coverImageUrl && !existing.representativeReport.coverImageUrl) ||
          (report.coverImageUrl &&
            reportDateTime > existingDateTime &&
            Boolean(existing.representativeReport.coverImageUrl));
    const reporterReferralCodes = new Set(existing.reporterReferralCodes);

    if (reporterReferralCode) {
      reporterReferralCodes.add(reporterReferralCode);
    }

    map.set(referralCode, {
      avatarImageUrl: existing.avatarImageUrl,
      fanOnlyCount:
        existing.fanOnlyCount + (report.priceType === "paid" ? 1 : 0),
      latestReportAt:
        reportDateTime > existingDateTime ? reportDate : existing.latestReportAt,
      name: existing.name,
      newsCount: existing.newsCount + 1,
      nsfwCount:
        existing.nsfwCount + (report.contentMaturityRating === "nsfw" ? 1 : 0),
      publicCount:
        existing.publicCount + (report.priceType === "free" ? 1 : 0),
      publicVideoCount: existing.publicVideoCount,
      referralCode,
      representativeReport: shouldUseAsRepresentative
        ? report
        : existing.representativeReport,
      reporterCount: reporterReferralCodes.size,
      reporterReferralCodes,
      sourceRevealUnlockedCount: existing.sourceRevealUnlockedCount,
    });
  }

  const characters = Array.from(map.values()).map(
    ({ reporterReferralCodes, ...character }) => {
      void reporterReferralCodes;

      return character;
    },
  );

  return sortFanletterNewsCharacterStats(characters, options).slice(
    0,
    Math.max(1, limit),
  );
}

function getPublishedContentLocaleFilter(
  locale: Locale,
): Filter<ContentPostDocument> {
  const contentLocale = normalizeContentLocale(locale);

  return contentLocale === defaultLocale
    ? {
        $or: [
          { locale: contentLocale },
          { locale: { $exists: false } },
          { locale: null },
        ],
      }
    : { locale: contentLocale };
}

function getLegacyNsfwVideoSignalFilter(): Filter<ContentPostDocument> {
  return {
    $and: [
      { priceType: "paid" },
      { "contentVideoUrls.0": { $exists: true } },
      { contentVideoUrls: LEGACY_NSFW_VIDEO_URL_PATTERN },
      {
        $or: [
          { contentMaturityRating: { $exists: false } },
          { contentMaturityRating: null },
        ],
      },
    ],
  };
}

async function getFanletterNewsCharacterVideoMetrics(
  characters: FanletterNewsCharacterStat[],
) {
  const referralCodes = Array.from(
    new Set(characters.map((character) => character.referralCode)),
  );
  const locale = characters[0]?.representativeReport.locale;
  const metricsByReferralCode = new Map<
    string,
    FanletterNewsCharacterVideoMetrics
  >();

  for (const referralCode of referralCodes) {
    metricsByReferralCode.set(referralCode, {
      publicVideoCount: 0,
      sourceRevealUnlockedCount: 0,
    });
  }

  if (!locale || referralCodes.length === 0) {
    return metricsByReferralCode;
  }

  const postsCollection = await getContentPostsCollection();
  const publicVideoPosts = await postsCollection
    .find<FanletterNewsCharacterVideoPost>(
      {
        ...getPublishedContentLocaleFilter(locale),
        "contentVideoUrls.0": { $exists: true },
        authorReferralCode: { $in: referralCodes },
        priceType: "free",
        status: "published",
        $nor: [
          { contentMaturityRating: "nsfw" },
          getLegacyNsfwVideoSignalFilter(),
        ],
      },
      {
        projection: {
          authorReferralCode: 1,
          contentId: 1,
        },
      },
    )
    .toArray();
  const referralCodeByContentId = new Map<string, string>();

  for (const post of publicVideoPosts) {
    const metrics = metricsByReferralCode.get(post.authorReferralCode);

    if (!metrics) {
      continue;
    }

    metrics.publicVideoCount += 1;
    referralCodeByContentId.set(post.contentId, post.authorReferralCode);
  }

  const contentIds = Array.from(referralCodeByContentId.keys());

  if (contentIds.length === 0) {
    return metricsByReferralCode;
  }

  const socialActionsCollection = await getContentSocialActionsCollection();
  const sourceRevealRows = await socialActionsCollection
    .aggregate<FanletterNewsCharacterSourceRevealRow>([
      {
        $match: {
          contentId: { $in: contentIds },
          sourceRevealRequested: true,
        },
      },
      {
        $group: {
          _id: "$contentId",
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $gte: FANLETTER_NEWS_SOURCE_REVEAL_THRESHOLD },
        },
      },
    ])
    .toArray();

  for (const row of sourceRevealRows) {
    const referralCode = referralCodeByContentId.get(row._id);

    if (!referralCode) {
      continue;
    }

    const metrics = metricsByReferralCode.get(referralCode);

    if (!metrics) {
      continue;
    }

    metrics.sourceRevealUnlockedCount += 1;
  }

  return metricsByReferralCode;
}

export async function hydrateFanletterNewsCharacterStats(
  characters: FanletterNewsCharacterStat[],
  options?: HydrateFanletterNewsCharacterStatsOptions,
) {
  if (characters.length === 0) {
    return characters;
  }

  const referralCodes = Array.from(
    new Set(characters.map((character) => character.referralCode)),
  );
  const profilesCollection = await getCreatorProfilesCollection();
  const [profiles, videoMetricsByReferralCode] = await Promise.all([
    profilesCollection
      .find(
        { referralCode: { $in: referralCodes } },
        {
          projection: {
            avatarImageSet: 1,
            avatarImageUrl: 1,
            characterPersona: 1,
            displayName: 1,
            referralCode: 1,
          },
        },
      )
      .toArray(),
    getFanletterNewsCharacterVideoMetrics(characters),
  ]);
  const profilesByReferralCode = new Map(
    profiles.map((profile) => [profile.referralCode, profile]),
  );

  const hydratedCharacters = characters.map((character) => {
    const profile = profilesByReferralCode.get(character.referralCode);
    const avatarImageUrl =
      profile?.avatarImageSet?.[0]?.url ?? profile?.avatarImageUrl ?? null;
    const profileName =
      profile?.characterPersona?.name?.trim() || profile?.displayName?.trim();
    const videoMetrics = videoMetricsByReferralCode.get(character.referralCode);

    return {
      ...character,
      avatarImageUrl,
      name: profileName || character.name,
      publicVideoCount: videoMetrics?.publicVideoCount ?? 0,
      sourceRevealUnlockedCount:
        videoMetrics?.sourceRevealUnlockedCount ?? 0,
    };
  });

  const sortedCharacters = options?.sort
    ? sortFanletterNewsCharacterStats(hydratedCharacters, options)
    : hydratedCharacters;

  return options?.limit
    ? sortedCharacters.slice(0, Math.max(1, options.limit))
    : sortedCharacters;
}
