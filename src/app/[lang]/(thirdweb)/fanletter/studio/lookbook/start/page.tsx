import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LookbookStartPage } from "@/components/lookbook-start-page";
import {
  defaultLocale,
  getDictionary,
  hasLocale,
  type Locale,
} from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const title =
    locale === "ko"
      ? "AI 룩북 시작하기 — 옷 사진 한 장으로 쇼핑몰 룩북"
      : "Start your AI lookbook — shop photos from one garment";
  const description =
    locale === "ko"
      ? "한국형 AI 스타를 고르고 옷 사진을 올리면 1분 만에 쇼핑몰 룩북이 나옵니다. 이메일로 무료 체험 시작."
      : "Pick a Korean AI star, upload a garment photo, and get a shop-ready lookbook in a minute. Start a free trial with email.";
  const url = `/${locale}/fanletter/studio/lookbook/start`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      description,
      title,
      type: "website",
      url,
    },
    twitter: {
      card: "summary_large_image",
      description,
      title,
    },
  };
}

export default async function LocalizedLookbookStartPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;

  return (
    <LookbookStartPage dictionary={getDictionary(locale)} locale={locale} />
  );
}
