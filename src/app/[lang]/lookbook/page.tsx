import { redirect } from "next/navigation";

import { defaultLocale, hasLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/**
 * Migrated to the unified points-based member studio.
 *
 * The seller path's credit + crypto-free guest economy was retired in favor of
 * a single wallet/points studio (`/{lang}/fanletter/studio/lookbook`), which
 * has full feature parity (public AI stars, fidelity, batch, history/CSV). The
 * credit backend stays dormant for now; this redirect is the cutover (revert by
 * restoring the page). Existing credits were free-trial only (no PG, no real
 * money), so nothing paid is stranded.
 */
export default async function LocalizedSellerLookbookPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;

  redirect(`/${locale}/fanletter/studio/lookbook`);
}
