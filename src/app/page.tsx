import type { Metadata } from "next";
import Link from "next/link";

const supportedLandingLanguages = ["ko", "en", "ja", "zh", "vn", "id", "km"] as const;

type LandingLanguage = (typeof supportedLandingLanguages)[number];

const activationLocaleByLandingLanguage: Record<LandingLanguage, string> = {
  ko: "ko",
  en: "en",
  ja: "ja",
  zh: "zh",
  vn: "vi",
  id: "id",
  km: "en",
};

export const metadata: Metadata = {
  title: "1066friend+ | 새로운 소셜 패러다임",
  description:
    "참여가 가치와 평판 Context를 만드는 1066friend+ 랜딩 페이지입니다.",
};

function readSingleValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeLandingLanguage(value?: string | string[]): LandingLanguage {
  const candidate = readSingleValue(value)?.trim().toLowerCase();

  if (candidate === "vi") {
    return "vn";
  }

  if (candidate === "zh-cn") {
    return "zh";
  }

  if (
    supportedLandingLanguages.includes(candidate as LandingLanguage)
  ) {
    return candidate as LandingLanguage;
  }

  return "ko";
}

function buildActivationHref({
  activationLocale,
  landingLanguage,
  referralCode,
}: {
  activationLocale: string;
  landingLanguage: LandingLanguage;
  referralCode?: string;
}) {
  const params = new URLSearchParams({ landingLang: landingLanguage });

  if (referralCode) {
    params.set("ref", referralCode);
  }

  return `/${activationLocale}/activate?${params.toString()}`;
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
  const landingLanguage = normalizeLandingLanguage(query.lang ?? query.locale);
  const activationLocale = activationLocaleByLandingLanguage[landingLanguage];
  const iframeParams = new URLSearchParams({ lang: landingLanguage });
  const activationHref = buildActivationHref({
    activationLocale,
    landingLanguage,
    referralCode,
  });

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
        href={activationHref}
      >
        1066friend+ 서비스 시작하기
      </Link>
    </main>
  );
}
