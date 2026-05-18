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
          "FanLetter AI 캐릭터 브이로그를 무료 공개와 유료 팬 전용으로 분리해 관리합니다.",
        title: "브이로그 전체 관리 | FanLetter",
      }
    : {
        description:
          "Separate FanLetter AI character vlogs into free public and paid fan-only management.",
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
