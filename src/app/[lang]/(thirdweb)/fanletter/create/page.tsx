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
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";

type FanletterCreateSearchParams = {
  fanRequestId?: string | string[];
  planBody?: string | string[];
  planId?: string | string[];
  planMode?: string | string[];
  planPrompt?: string | string[];
  planSummary?: string | string[];
  planTitle?: string | string[];
  ref?: string | string[];
  returnTo?: string | string[];
};

function readFirstValue(rawValue?: string | string[]) {
  return Array.isArray(rawValue) ? rawValue[0] : rawValue;
}

function readReferralCode(rawValue?: string | string[]) {
  return normalizeReferralCode(readFirstValue(rawValue));
}

function getSafeReturnTo({
  locale,
  referralCode,
  returnTo,
}: {
  locale: Locale;
  referralCode: string | null;
  returnTo?: string | string[];
}) {
  const fallback = buildPathWithReferral(
    `/${locale}/fanletter/onboarding`,
    referralCode,
  );
  const rawValue = readFirstValue(returnTo)?.trim();

  if (!rawValue || rawValue.startsWith("//")) {
    return fallback;
  }

  if (!rawValue.startsWith(`/${locale}/`)) {
    return fallback;
  }

  return rawValue;
}

function readPlanText(rawValue: string | string[] | undefined, limit: number) {
  return readFirstValue(rawValue)?.trim().slice(0, limit) || undefined;
}

function readInitialPlan(
  query: FanletterCreateSearchParams,
): FanletterCreateInitialPlan | undefined {
  const title = readPlanText(query.planTitle, 88);
  const summary = readPlanText(query.planSummary, 180);
  const prompt = readPlanText(query.planPrompt, 1_200);
  const body = readPlanText(query.planBody, 600);
  const fanRequestId = readPlanText(query.fanRequestId, 120);
  const planId = readPlanText(query.planId, 120);

  if (!title && !summary && !prompt && !body && !planId && !fanRequestId) {
    return undefined;
  }

  return {
    body,
    fanRequestId,
    mode: "video",
    planId,
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
  const referralCode = readReferralCode(query.ref);
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
    { returnTo: getSafeReturnTo({ locale, referralCode, returnTo: query.returnTo }) },
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
  const referralCode = readReferralCode(query.ref);

  return (
    <FanletterCreatePage
      initialPlan={readInitialPlan(query)}
      locale={locale}
      referralCode={referralCode}
      returnToHref={getSafeReturnTo({
        locale,
        referralCode,
        returnTo: query.returnTo,
      })}
    />
  );
}
