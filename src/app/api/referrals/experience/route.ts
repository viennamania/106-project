import { getReferralLandingExperience } from "@/lib/landing-branding-service";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const localeInput = url.searchParams.get("lang") ?? defaultLocale;
  const locale = (hasLocale(localeInput) ? localeInput : defaultLocale) as Locale;
  const referralCode = normalizeReferralCode(url.searchParams.get("ref"));

  if (!referralCode) {
    return jsonError("ref query parameter is required.", 400);
  }

  try {
    return Response.json(
      await getReferralLandingExperience(locale, referralCode),
    );
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to load referral branding experience.",
      500,
    );
  }
}
