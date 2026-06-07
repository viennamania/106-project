import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  FanletterNewsCutActionPage,
  type FanletterNewsCutAction,
} from "@/components/fanletter-news-cut-action-page";
import {
  getSafeFanletterReturnTo,
  readFanletterReferralCode,
  readFirstSearchParam,
  type FanletterSearchParamValue,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { normalizeShareId } from "@/lib/share-tracking";

type FanletterNewsCutActionSearchParams = {
  characterName?: FanletterSearchParamValue;
  characterRef?: FanletterSearchParamValue;
  ref?: FanletterSearchParamValue;
  returnTo?: FanletterSearchParamValue;
  shareId?: FanletterSearchParamValue;
  sourceReportId?: FanletterSearchParamValue;
};

const actionSet = new Set<FanletterNewsCutAction>([
  "alerts",
  "characters",
  "continue",
  "share",
]);

function isFanletterNewsCutAction(
  value: string,
): value is FanletterNewsCutAction {
  return actionSet.has(value as FanletterNewsCutAction);
}

function getMetadataCopy(locale: Locale, action: string) {
  if (locale !== "ko") {
    return {
      description:
        "A dedicated AIAVpark News follow-up page for shared 4-cut report viewers.",
      title:
        action === "alerts"
          ? "Get New Report Alerts"
          : action === "characters"
            ? "Browse AI Characters"
            : action === "share"
              ? "Share This Flow"
              : "Continue Character Flow",
    };
  }

  return {
    description:
      "공유 4컷 리포트를 본 사용자가 AI 캐릭터 브이로그 흐름을 계속 이어갈 수 있는 AIAVpark News 전용 후속 페이지입니다.",
    title:
      action === "alerts"
        ? "새 리포트 알림 받기"
        : action === "characters"
          ? "AI 캐릭터 둘러보기"
          : action === "share"
            ? "이 흐름 공유하기"
            : "캐릭터 계속 보기",
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ action: string; lang: string }>;
  searchParams: Promise<FanletterNewsCutActionSearchParams>;
}): Promise<Metadata> {
  const { action, lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;

  if (!isFanletterNewsCutAction(action)) {
    return {};
  }

  const referralCode = readFanletterReferralCode(query.ref);
  const returnToHref = getSafeFanletterReturnTo({
    fallbackPath: `/${locale}/fanletter/news/cuts`,
    locale,
    referralCode,
    returnTo: query.returnTo,
  });
  const { description, title } = getMetadataCopy(locale, action);
  const url = setPathSearchParams(
    buildPathWithReferral(
      `/${locale}/fanletter/news/cuts/actions/${action}`,
      referralCode,
    ),
    {
      characterName: readFirstSearchParam(query.characterName)?.trim() || null,
      characterRef: readFirstSearchParam(query.characterRef)?.trim() || null,
      returnTo: returnToHref,
      shareId: normalizeShareId(readFirstSearchParam(query.shareId)),
      sourceReportId: readFirstSearchParam(query.sourceReportId)?.trim() || null,
    },
  );

  return {
    title: `${title} | AIAVpark News`,
    description,
    alternates: {
      canonical: url,
    },
    robots: {
      follow: false,
      index: false,
    },
  };
}

export default async function LocalizedFanletterNewsCutActionPage({
  params,
  searchParams,
}: {
  params: Promise<{ action: string; lang: string }>;
  searchParams: Promise<FanletterNewsCutActionSearchParams>;
}) {
  const { action, lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang) || !isFanletterNewsCutAction(action)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode(query.ref);
  const returnToHref = getSafeFanletterReturnTo({
    fallbackPath: `/${locale}/fanletter/news/cuts`,
    locale,
    referralCode,
    returnTo: query.returnTo,
  });

  return (
    <FanletterNewsCutActionPage
      action={action}
      characterName={readFirstSearchParam(query.characterName)?.trim() || null}
      characterReferralCode={
        readFirstSearchParam(query.characterRef)?.trim() || null
      }
      locale={locale}
      referralCode={referralCode}
      returnToHref={returnToHref}
      shareId={normalizeShareId(readFirstSearchParam(query.shareId))}
      sourceReportId={readFirstSearchParam(query.sourceReportId)?.trim() || null}
    />
  );
}
