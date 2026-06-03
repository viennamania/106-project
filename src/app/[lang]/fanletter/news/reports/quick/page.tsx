import type { Metadata } from "next";

import {
  renderFanletterNewsReportComposerRoute,
  type FanletterNewsReportNewSearchParams,
} from "@/app/[lang]/fanletter/news/reports/new/page";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        title: "미언락 원본 4컷 기사 작성",
      }
    : {
        title: "Write Locked-Source Four-Cut Report",
      };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? (lang as Locale) : defaultLocale;
  const copy = getCopy(locale);

  return {
    robots: {
      follow: false,
      index: false,
    },
    title: `${copy.title} | FanLetter News`,
  };
}

export default async function LocalizedFanletterNewsReportQuickPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterNewsReportNewSearchParams>;
}) {
  return renderFanletterNewsReportComposerRoute({
    experience: "quick",
    params,
    searchParams,
  });
}
