import type { Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";

export type FanletterSearchParamValue = string | string[] | undefined;

export function readFirstSearchParam(rawValue?: FanletterSearchParamValue) {
  return Array.isArray(rawValue) ? rawValue[0] : rawValue;
}

export function readFanletterReferralCode(rawValue?: FanletterSearchParamValue) {
  return normalizeReferralCode(readFirstSearchParam(rawValue));
}

export function normalizeFanletterStarId(rawValue?: string | null) {
  const value = rawValue?.trim();

  if (!value || value.length > 128) {
    return null;
  }

  return /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(value) ? value : null;
}

export function readFanletterStarId(rawValue?: FanletterSearchParamValue) {
  return normalizeFanletterStarId(readFirstSearchParam(rawValue));
}

export function normalizeFanletterReturnToPath(
  rawValue: FanletterSearchParamValue,
  locale: Locale,
) {
  const candidate = readFirstSearchParam(rawValue)?.trim();

  if (!candidate || candidate.startsWith("//")) {
    return null;
  }

  if (!candidate.startsWith(`/${locale}/`)) {
    return null;
  }

  return candidate;
}

export function isFanletterNewsCutFeedReturnPath(
  value: string | null | undefined,
  locale: Locale,
) {
  const pathname = value?.split(/[?#]/)[0]?.replace(/\/+$/, "");
  const cutsPath = `/${locale}/fanletter/news/cuts`;

  return pathname === cutsPath || pathname?.startsWith(`${cutsPath}/`) === true;
}

export function unwrapFanletterNewsMeReturnToPath(
  value: string,
  locale: Locale,
) {
  try {
    const url = new URL(value, "https://aiavpark.local");
    const pathname = url.pathname.replace(/\/+$/, "");

    if (pathname !== `/${locale}/fanletter/news/me`) {
      return value;
    }

    return (
      normalizeFanletterReturnToPath(
        url.searchParams.get("returnTo") ?? undefined,
        locale,
      ) ?? value
    );
  } catch {
    return value;
  }
}

export function getSafeFanletterReturnTo({
  fallbackPath,
  locale,
  referralCode,
  returnTo,
}: {
  fallbackPath?: string;
  locale: Locale;
  referralCode: string | null;
  returnTo?: FanletterSearchParamValue;
}) {
  return (
    normalizeFanletterReturnToPath(returnTo, locale) ??
    buildPathWithReferral(
      fallbackPath ?? `/${locale}/fanletter/onboarding`,
      referralCode,
    )
  );
}
