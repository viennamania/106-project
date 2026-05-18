import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterSalesPage } from "@/components/fanletter-sales-page";
import {
  getSafeFanletterReturnTo,
  normalizeFanletterReturnToPath,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { hasLocale, type Locale } from "@/lib/i18n";

type FanletterSalesSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

function getMetaCopy(locale: Locale) {
  return locale === "ko"
    ? {
        description:
          "FanLetter AI 캐릭터 브이로그 판매 내역, 판매용 지갑, 회수 상태를 관리합니다.",
        title: "판매 내역 | FanLetter",
      }
    : {
        description:
          "Manage FanLetter AI character vlog sales, seller wallet, and withdrawal status.",
        title: "Sales history | FanLetter",
      };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? (lang as Locale) : "ko";
  const copy = getMetaCopy(locale);

  return {
    description: copy.description,
    title: copy.title,
  };
}

export default async function LocalizedFanletterSalesPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterSalesSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode(query.ref);
  const explicitReturnToHref = normalizeFanletterReturnToPath(
    query.returnTo,
    locale,
  );
  const returnToHref = getSafeFanletterReturnTo({
    fallbackPath: `/${locale}/fanletter/studio`,
    locale,
    referralCode,
    returnTo: query.returnTo,
  });

  return (
    <FanletterSalesPage
      locale={locale}
      preserveReturnTo={Boolean(explicitReturnToHref)}
      referralCode={referralCode}
      returnToHref={returnToHref}
    />
  );
}
