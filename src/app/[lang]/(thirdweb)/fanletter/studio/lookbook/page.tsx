import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterLookbookStudioPage } from "@/components/fanletter-lookbook-studio-page";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";

function getLookbookMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      title: "AI 스타 룩북 스튜디오 | AIAVpark",
      description:
        "옷 사진을 올리면 내 AI 스타가 그 옷을 입은 한국형 쇼핑몰 룩북을 만들어 드립니다.",
    };
  }

  return {
    title: "AI Star Lookbook Studio | AIAVpark",
    description:
      "Upload a garment photo and your AI star wears it in a Korean fashion e-commerce lookbook.",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const meta = getLookbookMeta(locale);

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/fanletter/studio/lookbook`,
    },
    openGraph: {
      description: meta.description,
      siteName: "AIAVpark",
      title: meta.title,
      type: "website",
      url: `/${locale}/fanletter/studio/lookbook`,
    },
    twitter: {
      card: "summary_large_image",
      description: meta.description,
      title: meta.title,
    },
  };
}

export default async function LocalizedFanletterLookbookPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  return <FanletterLookbookStudioPage locale={lang as Locale} />;
}
