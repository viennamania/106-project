import { redirect } from "next/navigation";

import { defaultLocale, hasLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/**
 * The crypto-free seller workspace account was retired in the points migration.
 * Members manage their account through the fanletter member system, so this
 * redirects into the unified studio.
 */
export default async function LocalizedSellerAccountPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;

  redirect(`/${locale}/fanletter/studio/lookbook`);
}
