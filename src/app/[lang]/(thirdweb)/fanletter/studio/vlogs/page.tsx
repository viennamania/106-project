import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterVlogManagementPage } from "@/components/fanletter-vlog-management-page";
import { readFanletterReferralCode } from "@/lib/fanletter-routing";
import { hasLocale, type Locale } from "@/lib/i18n";

type FanletterVlogsSearchParams = {
  ref?: string | string[];
};

function getMetaCopy(locale: Locale) {
  return locale === "ko"
    ? {
        description:
          "FanLetter AI 캐릭터 브이로그를 검색하고 공개, 임시저장, 보관 상태를 관리합니다.",
        title: "브이로그 전체 관리 | FanLetter",
      }
    : {
        description:
          "Search FanLetter AI character vlogs and manage published, draft, and archived states.",
        title: "Manage all vlogs | FanLetter",
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

export default async function LocalizedFanletterVlogManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterVlogsSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  return (
    <FanletterVlogManagementPage
      locale={lang as Locale}
      referralCode={readFanletterReferralCode(query.ref)}
    />
  );
}
