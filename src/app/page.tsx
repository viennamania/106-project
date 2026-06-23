import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "1066friend+ | 새로운 소셜 패러다임",
  description:
    "참여가 가치와 평판 Context를 만드는 1066friend+ 랜딩 페이지입니다.",
};

function readSingleValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const query = await searchParams;
  const referralCode = readSingleValue(query.ref);
  const landingSrc = referralCode
    ? `/landing/1066friend_landing_v14_ko.html?ref=${encodeURIComponent(referralCode)}`
    : "/landing/1066friend_landing_v14_ko.html";

  return (
    <main className="h-dvh overflow-hidden bg-white">
      <iframe
        className="block h-full w-full border-0"
        src={landingSrc}
        title="1066friend+ landing"
      />
      <Link
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-black focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        href="/ko/referrals"
      >
        1066friend+ 추천 네트워크 시작하기
      </Link>
    </main>
  );
}
