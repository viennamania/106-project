import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterHomePage } from "@/components/fanletter-home-page";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { buildPathWithReferral } from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";

function readReferralCode(rawValue?: string | string[]) {
  return normalizeReferralCode(Array.isArray(rawValue) ? rawValue[0] : rawValue);
}

function getFanletterMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "AI 이미지와 동영상 생성, 인물 페르소나, 팬 전용 피드, 판매 흐름을 하나로 묶은 FanLetter 크리에이터 홈입니다.",
      title: "FanLetter | AI 크리에이터 수익화 홈",
    };
  }

  return {
    description:
      "FanLetter brings AI images, AI videos, character personas, fan-only feeds, and creator monetisation into one mobile-first home.",
    title: "FanLetter | AI creator monetisation home",
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ ref?: string | string[] }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const query = await searchParams;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const referralCode = readReferralCode(query.ref);
  const meta = getFanletterMeta(locale);
  const url = buildPathWithReferral(`/${locale}/fanletter`, referralCode);

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      description: meta.description,
      title: meta.title,
      url,
    },
    twitter: {
      card: "summary_large_image",
      description: meta.description,
      title: meta.title,
    },
  };
}

export default async function FanletterRoutePage({
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

  return (
    <FanletterHomePage
      locale={lang}
      referralCode={readReferralCode(query.ref)}
    />
  );
}
