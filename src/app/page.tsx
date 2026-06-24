import type { Metadata } from "next";
import Link from "next/link";

const supportedLandingLocales = ["ko", "en", "ja", "zh", "vi", "id"] as const;

type LandingLocale = (typeof supportedLandingLocales)[number];

export const metadata: Metadata = {
  title: "1066friend+ | 새로운 소셜 패러다임",
  description:
    "참여가 가치와 평판 Context를 만드는 1066friend+ 랜딩 페이지입니다.",
};

function readSingleValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeLandingLocale(value?: string | string[]): LandingLocale {
  const candidate = readSingleValue(value)?.trim().toLowerCase();

  if (candidate === "vn") {
    return "vi";
  }

  if (
    supportedLandingLocales.includes(candidate as LandingLocale)
  ) {
    return candidate as LandingLocale;
  }

  return "ko";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    lang?: string | string[];
    locale?: string | string[];
    ref?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const referralCode = readSingleValue(query.ref);
  const locale = normalizeLandingLocale(query.lang ?? query.locale);
  const iframeParams = new URLSearchParams({ lang: locale });

  if (referralCode) {
    iframeParams.set("ref", referralCode);
  }

  const landingSrc = `/landing/1066friend_landing_v14_ko.html?${iframeParams.toString()}`;

  return (
    <main className="h-dvh overflow-hidden bg-white">
      <iframe
        className="block h-full w-full border-0"
        src={landingSrc}
        title="1066friend+ landing"
      />
      <Link
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-black focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        href={`/${locale}/activate`}
      >
        1066friend+ 서비스 시작하기
      </Link>
    </main>
  );
}
