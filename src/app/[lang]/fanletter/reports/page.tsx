import { notFound, redirect } from "next/navigation";

import { buildPathWithReferral } from "@/lib/landing-branding";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { hasLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// The reports surface moved into the News sub-app at /fanletter/news/reports
// during the News split. Internal links now point there directly; this route
// redirects any remaining /fanletter/reports traffic (bookmarks, stale share
// URLs) to the canonical location, preserving the referral code.
export default async function FanletterReportsRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode((await searchParams).ref);

  redirect(
    buildPathWithReferral(`/${locale}/fanletter/news/reports`, referralCode),
  );
}
