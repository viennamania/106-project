import { notFound } from "next/navigation";

import { SmartWalletApp } from "@/components/smart-wallet-app";
import { getDictionary, hasLocale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";
import { getIncomingReferralState } from "@/lib/member-service";

export default async function LocalizedHome({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dictionary = getDictionary(lang);
  const referralInput = Array.isArray(query.ref) ? query.ref[0] : query.ref;
  const incomingReferralCode = normalizeReferralCode(referralInput);
  const incomingReferralState =
    await getIncomingReferralState(incomingReferralCode);

  return (
    <SmartWalletApp
      dictionary={dictionary}
      incomingReferralState={incomingReferralState}
      locale={lang}
      projectWallet={process.env.PROJECT_WALLET?.trim() ?? null}
    />
  );
}
