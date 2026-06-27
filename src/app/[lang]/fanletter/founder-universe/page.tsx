import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FanletterFounderUniverseInvestorPage } from "@/components/fanletter-founder-universe-investor-page";
import { getFanletterFounderUniverseInvestorSnapshot } from "@/lib/fanletter-founder-universe-investor-service";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";
import { hasLocale, type Locale } from "@/lib/i18n";

function getFounderUniverseInvestorMeta(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "FanLetter 크리에이터 네트워크 기반 AI 스타 인큐베이터 모델을 라이브 데이터로 보여주는 투자자용 인포그래픽입니다.",
      title: "크리에이터 네트워크 인포그래픽 | FanLetter",
    };
  }

  return {
    description:
      "An investor-facing live-data infographic for the FanLetter Creator Network AI Star incubation model.",
    title: "Creator Network Infographic | FanLetter",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";
  const meta = getFounderUniverseInvestorMeta(locale);

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `/${locale}/fanletter/founder-universe`,
    },
    openGraph: {
      description: meta.description,
      siteName: "AIAVpark",
      title: meta.title,
      type: "website",
      url: `/${locale}/fanletter/founder-universe`,
    },
    twitter: {
      card: "summary_large_image",
      description: meta.description,
      title: meta.title,
    },
  };
}

export default async function FanletterFounderUniverseInvestorRoute({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ star?: string }>;
}) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);

  if (!hasLocale(lang)) {
    notFound();
  }

  const starId =
    typeof query.star === "string" ? normalizeFanletterStarId(query.star) : null;
  const snapshot = await getFanletterFounderUniverseInvestorSnapshot({
    starId,
  });

  if (!snapshot) {
    notFound();
  }

  return (
    <FanletterFounderUniverseInvestorPage
      locale={lang}
      snapshot={snapshot}
    />
  );
}
