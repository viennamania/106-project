import type { FanletterNewsReportDocument } from "@/lib/content";
import { getCreatorProfilesCollection } from "@/lib/mongodb";

export type FanletterNewsCharacterStat = {
  avatarImageUrl: string | null;
  fanOnlyCount: number;
  latestReportAt: Date | null;
  name: string;
  newsCount: number;
  nsfwCount: number;
  publicCount: number;
  referralCode: string;
  representativeReport: FanletterNewsReportDocument;
};

export function getFanletterNewsCharacterStats(
  reports: FanletterNewsReportDocument[],
  limit = 8,
) {
  const map = new Map<string, FanletterNewsCharacterStat>();

  for (const report of reports) {
    const referralCode = report.creatorReferralCode?.trim();

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
        referralCode,
        representativeReport: report,
      });
      continue;
    }

    const existingDateTime = existing.latestReportAt?.getTime() ?? 0;
    const reportDateTime = reportDate?.getTime() ?? 0;
    const shouldUseAsRepresentative =
      (report.coverImageUrl && !existing.representativeReport.coverImageUrl) ||
      (report.coverImageUrl &&
        reportDateTime > existingDateTime &&
        Boolean(existing.representativeReport.coverImageUrl));

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
      referralCode,
      representativeReport: shouldUseAsRepresentative
        ? report
        : existing.representativeReport,
    });
  }

  return Array.from(map.values())
    .sort(
      (left, right) =>
        right.newsCount - left.newsCount ||
        (right.latestReportAt?.getTime() ?? 0) -
          (left.latestReportAt?.getTime() ?? 0),
    )
    .slice(0, Math.max(1, limit));
}

export async function hydrateFanletterNewsCharacterStats(
  characters: FanletterNewsCharacterStat[],
) {
  if (characters.length === 0) {
    return characters;
  }

  const referralCodes = Array.from(
    new Set(characters.map((character) => character.referralCode)),
  );
  const profilesCollection = await getCreatorProfilesCollection();
  const profiles = await profilesCollection
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
    .toArray();
  const profilesByReferralCode = new Map(
    profiles.map((profile) => [profile.referralCode, profile]),
  );

  return characters.map((character) => {
    const profile = profilesByReferralCode.get(character.referralCode);
    const avatarImageUrl =
      profile?.avatarImageSet?.[0]?.url ?? profile?.avatarImageUrl ?? null;
    const profileName =
      profile?.characterPersona?.name?.trim() || profile?.displayName?.trim();

    return {
      ...character,
      avatarImageUrl,
      name: profileName || character.name,
    };
  });
}
