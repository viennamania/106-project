import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterAIStarGenealogyPage } from "@/components/fanletter-ai-star-genealogy-page";
import { getFanletterAIStarGenealogySnapshot } from "@/lib/fanletter-ai-star-genealogy-service";
import { hasLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function getAIStarGenealogyMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "AIAVpark AI 스타 계보와 CP 보상 백필 현황을 라이브 데이터로 보여주는 인포그래픽입니다.",
      title: "AI 스타 계보 맵 | AIAVpark",
    };
  }

  return {
    description:
      "A live-data infographic for AIAVpark AI Star genealogy and CP reward backfill.",
    title: "AI Star Genealogy Map | AIAVpark",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const meta = getAIStarGenealogyMeta(locale);

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/fanletter/ai-star-genealogy`,
    },
    openGraph: {
      description: meta.description,
      siteName: "AIAVpark",
      title: meta.title,
      type: "website",
      url: `/${locale}/fanletter/ai-star-genealogy`,
    },
    twitter: {
      card: "summary_large_image",
      description: meta.description,
      title: meta.title,
    },
  };
}

export default async function FanletterAIStarGenealogyRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const snapshot = await getFanletterAIStarGenealogySnapshot();

  return <FanletterAIStarGenealogyPage locale={lang} snapshot={snapshot} />;
}
