import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SellerLookbookPage } from "@/components/seller-lookbook-page";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function getMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      title: "AI 룩북 스튜디오 — 옷 사진 1장으로 쇼핑몰 룩북",
      description:
        "옷 사진만 올리면 AI 모델이 입은 한국형 쇼핑몰 룩북 세트를 1분 만에. 앱·크립토 없이 크레딧으로 바로 시작하세요.",
    };
  }

  return {
    title: "AI Lookbook Studio — shop lookbooks from one garment photo",
    description:
      "Upload a garment photo and get an AI-model Korean fashion lookbook set in a minute. No app, no crypto — start with credits.",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const meta = getMeta(locale);

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/${locale}/lookbook` },
    openGraph: {
      description: meta.description,
      title: meta.title,
      type: "website",
      url: `/${locale}/lookbook`,
    },
    twitter: {
      card: "summary_large_image",
      description: meta.description,
      title: meta.title,
    },
  };
}

export default async function LocalizedSellerLookbookPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  return <SellerLookbookPage locale={lang as Locale} />;
}
