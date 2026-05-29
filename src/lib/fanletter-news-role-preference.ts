export const FANLETTER_NEWS_ROLE_PREFERENCE_STORAGE_KEY =
  "fanletter.news.rolePreference";
export const FANLETTER_NEWS_ROLE_PREFERENCE_CHANGE_EVENT =
  "fanletter-news-role-preference-change";

export const fanletterNewsRolePreferences = [
  "general",
  "reporter",
  "vlogger",
] as const;

export type FanletterNewsRolePreference =
  (typeof fanletterNewsRolePreferences)[number];

export function normalizeFanletterNewsRolePreference(
  value?: string | null,
): FanletterNewsRolePreference {
  return value === "reporter" || value === "vlogger" ? value : "general";
}
