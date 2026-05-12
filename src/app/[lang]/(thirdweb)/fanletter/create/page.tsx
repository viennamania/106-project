import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  FanletterCreatePage,
  type FanletterCreateInitialPlan,
} from "@/components/fanletter-create-page";
import {
  buildFanletterOgImagePath,
  FANLETTER_OG_IMAGE_SIZE,
  getFanletterOgAlt,
} from "@/lib/fanletter-og";
import {
  getSafeFanletterReturnTo,
  readFanletterReferralCode,
  readFirstSearchParam,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { creatorAvatarExpressions } from "@/lib/content";

type FanletterCreateSearchParams = {
  fanRequestBody?: string | string[];
  fanRequestCharacterName?: string | string[];
  fanRequestId?: string | string[];
  fanRequestType?: string | string[];
  planAudience?: string | string[];
  planAvatarExpression?: string | string[];
  planAvatarMode?: string | string[];
  planBody?: string | string[];
  planId?: string | string[];
  planMode?: string | string[];
  planPriceType?: string | string[];
  planPrompt?: string | string[];
  planSummary?: string | string[];
  planTitle?: string | string[];
  ref?: string | string[];
  returnTo?: string | string[];
};

function readPlanText(rawValue: string | string[] | undefined, limit: number) {
  return readFirstSearchParam(rawValue)?.trim().slice(0, limit) || undefined;
}

function readInitialPlan(
  query: FanletterCreateSearchParams,
): FanletterCreateInitialPlan | undefined {
  const title = readPlanText(query.planTitle, 88);
  const summary = readPlanText(query.planSummary, 180);
  const prompt = readPlanText(query.planPrompt, 1_200);
  const body = readPlanText(query.planBody, 600);
  const fanRequestBody = readPlanText(query.fanRequestBody, 600);
  const fanRequestCharacterName = readPlanText(
    query.fanRequestCharacterName,
    80,
  );
  const fanRequestId = readPlanText(query.fanRequestId, 120);
  const rawFanRequestType = readPlanText(query.fanRequestType, 32);
  const fanRequestType =
    rawFanRequestType === "message" || rawFanRequestType === "vlog_request"
      ? rawFanRequestType
      : undefined;
  const rawPriceType = readPlanText(query.planPriceType, 32);
  const priceType =
    rawPriceType === "paid" || rawPriceType === "free" ? rawPriceType : undefined;
  const fanOnlyIntent =
    readPlanText(query.planAudience, 32)?.toLowerCase() === "fan-only";
  const rawAvatarExpression = readPlanText(query.planAvatarExpression, 32);
  const avatarReferenceExpression = creatorAvatarExpressions.find(
    (expression) => expression === rawAvatarExpression,
  );
  const rawAvatarReferenceMode = readPlanText(query.planAvatarMode, 32);
  const avatarReferenceMode =
    rawAvatarReferenceMode === "set" || rawAvatarReferenceMode === "single"
      ? rawAvatarReferenceMode
      : undefined;
  const planId = readPlanText(query.planId, 120);

  if (
    !title &&
    !summary &&
    !prompt &&
    !body &&
    !fanRequestBody &&
    !fanRequestCharacterName &&
    !planId &&
    !fanRequestId &&
    !fanRequestType &&
    !priceType &&
    !fanOnlyIntent &&
    !avatarReferenceExpression &&
    !avatarReferenceMode
  ) {
    return undefined;
  }

  return {
    avatarReferenceExpression,
    avatarReferenceMode,
    body,
    fanOnlyIntent,
    fanRequestBody,
    fanRequestCharacterName,
    fanRequestId,
    fanRequestType,
    mode: "video",
    planId,
    priceType,
    prompt,
    summary,
    title,
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
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readFanletterReferralCode(query.ref);
  const title =
    locale === "ko"
      ? "FanLetter 첫 AI 캐릭터 브이로그 만들기"
      : "Create First FanLetter AI Character Vlog";
  const description =
    locale === "ko"
      ? "AI 캐릭터의 오늘 장면을 세로형 브이로그로 생성하고 FanLetter 피드에 게시하세요."
      : "Generate today's AI character scene as a vertical vlog and publish it to FanLetter.";
  const url = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/create`, referralCode),
    {
      returnTo: getSafeFanletterReturnTo({
        locale,
        referralCode,
        returnTo: query.returnTo,
      }),
    },
  );
  const ogImagePath = buildFanletterOgImagePath({
    description,
    locale,
    referralCode,
    title,
    variant: "start",
    version: "fanletter-create-v1",
  });
  const ogImage = {
    alt: getFanletterOgAlt(locale, "start"),
    height: FANLETTER_OG_IMAGE_SIZE.height,
    type: "image/png",
    url: ogImagePath,
    width: FANLETTER_OG_IMAGE_SIZE.width,
  };

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      description,
      images: [ogImage],
      siteName: "FanLetter",
      title,
      type: "website",
      url,
    },
    twitter: {
      card: "summary_large_image",
      description,
      images: [ogImage],
      title,
    },
  };
}

export default async function LocalizedFanletterCreatePage({
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

  return (
    <FanletterCreatePage
      initialPlan={readInitialPlan(query)}
      locale={locale}
      referralCode={referralCode}
      returnToHref={getSafeFanletterReturnTo({
        locale,
        referralCode,
        returnTo: query.returnTo,
      })}
    />
  );
}
