import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterCreatePage } from "@/components/fanletter-create-page";
import {
  readFanletterCreateInitialPlan,
  type FanletterCreateSearchParams,
} from "@/lib/fanletter-create-plan";
import { getFanletterNewsVlogManageHref } from "@/lib/fanletter-news-vlog-routing";
import {
  getSafeFanletterReturnTo,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { setPathSearchParams } from "@/lib/landing-branding";

function getCopy(locale: Locale) {
  return locale === "ko"
    ? {
        description:
          "FanLetter News에 노출할 무료 공개 브이로그를 AI로 만들거나 직접 업로드하고, 프리뷰 영상과 프레임 후보를 함께 준비합니다.",
        title: "새 브이로그 등록 | FanLetter News",
      }
    : {
        description:
          "Create or upload a free public vlog for FanLetter News, including preview video and frame candidates.",
        title: "Register New Vlog | FanLetter News",
      };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterCreateSearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? (lang as Locale) : defaultLocale;
  const referralCode = readFanletterReferralCode(query.ref);
  const copy = getCopy(locale);
  const manageHref = getFanletterNewsVlogManageHref({
    locale,
    referralCode,
  });
  const canonical = setPathSearchParams(
    `/${locale}/fanletter/news/vlogs/new`,
    {
      ref: referralCode,
      returnTo: getSafeFanletterReturnTo({
        fallbackPath: manageHref,
        locale,
        referralCode,
        returnTo: query.returnTo,
      }),
    },
  );

  return {
    description: copy.description,
    alternates: {
      canonical,
    },
    robots: {
      follow: false,
      index: false,
    },
    title: copy.title,
  };
}

export default async function LocalizedFanletterNewsVlogNewPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterCreateSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode(query.ref);
  const manageHref = getFanletterNewsVlogManageHref({
    locale,
    referralCode,
  });

  return (
    <FanletterCreatePage
      initialPlan={readFanletterCreateInitialPlan(query)}
      locale={locale}
      referralCode={referralCode}
      returnToHref={getSafeFanletterReturnTo({
        fallbackPath: manageHref,
        locale,
        referralCode,
        returnTo: query.returnTo,
      })}
      surface="news"
    />
  );
}
