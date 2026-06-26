import type { Locale } from "@/lib/i18n";

/**
 * Public-facing role simplification. The data model keeps the full 7-tier
 * founder-universe grade (creator / genesis_founder / founder / mentor /
 * producer / partner / legend), but users only ever see two states: a member
 * who has launched/owns an AI Star is a "크리에이터 (Creator)", and everyone
 * else — including every founder-network grade and plain members — is a
 * "팬 (Fan)". This collapses the display layer only; no data migration.
 */
export function isFanletterCreatorRole(
  role: string | null | undefined,
): boolean {
  return role === "creator";
}

export function getFanletterPublicRoleLabel(
  role: string | null | undefined,
  locale: Locale,
): string {
  const isCreator = isFanletterCreatorRole(role);

  if (locale === "ko") {
    return isCreator ? "크리에이터" : "팬";
  }

  return isCreator ? "Creator" : "Fan";
}
