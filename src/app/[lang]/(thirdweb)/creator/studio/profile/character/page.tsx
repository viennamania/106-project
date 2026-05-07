import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CreatorContentStudioPage } from "@/components/creator-content-studio-page";
import { getCreatorStudioDictionary } from "@/lib/creator-studio-dictionary";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import { normalizeReferralCode } from "@/lib/member";

function resolveReturnTo(
  locale: Locale,
  value: string | string[] | undefined,
) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (
    !candidate ||
    !candidate.startsWith(`/${locale}/`) ||
    candidate.startsWith("//")
  ) {
    return null;
  }

  return candidate;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "ko";

  return {
    title:
      locale === "ko"
        ? "캐릭터 변경 | Creator Studio | 1066friend+"
        : "Change Character | Creator Studio | 1066friend+",
    description:
      locale === "ko"
        ? "활성 AI 캐릭터를 변경하고 아바타 세트를 다시 생성합니다."
        : "Change the active AI character and regenerate the avatar set.",
  };
}

export default async function LocalizedCreatorStudioCharacterPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ ref?: string | string[]; returnTo?: string | string[] }>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const dictionary = getCreatorStudioDictionary(getDictionary(locale));
  const referralCode = normalizeReferralCode(
    Array.isArray(query.ref) ? query.ref[0] : query.ref,
  );
  const returnToHref = resolveReturnTo(locale, query.returnTo);

  return (
    <CreatorContentStudioPage
      dictionary={dictionary}
      locale={locale}
      referralCode={referralCode}
      returnToHref={returnToHref}
      view="character"
    />
  );
}
