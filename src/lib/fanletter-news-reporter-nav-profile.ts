import { normalizeReferralCode } from "@/lib/member";

export const FANLETTER_NEWS_REPORTER_PROFILE_STORAGE_KEY =
  "fanletter.news.reporterProfile";
export const FANLETTER_NEWS_REPORTER_PROFILE_CHANGE_EVENT =
  "fanletter-news-reporter-profile-change";

export type FanletterNewsReporterNavProfile = {
  avatarImageUrl: string | null;
  displayName: string | null;
  referralCode: string | null;
};

function normalizeString(value: unknown, limit: number) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, limit) || null
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeFanletterNewsReporterNavProfile(
  value: unknown,
): FanletterNewsReporterNavProfile | null {
  if (!isRecord(value)) {
    return null;
  }

  const profile = {
    avatarImageUrl: normalizeString(value.avatarImageUrl, 1200),
    displayName: normalizeString(value.displayName, 60),
    referralCode: normalizeReferralCode(normalizeString(value.referralCode, 40)),
  };

  return profile.avatarImageUrl || profile.displayName || profile.referralCode
    ? profile
    : null;
}
