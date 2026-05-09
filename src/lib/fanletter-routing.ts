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
