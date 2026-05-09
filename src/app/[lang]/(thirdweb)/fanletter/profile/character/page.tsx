import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CreatorContentStudioPage } from "@/components/creator-content-studio-page";
import { getCreatorStudioDictionary } from "@/lib/creator-studio-dictionary";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";
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
        ? "캐릭터 변경 | FanLetter"
        : "Change Character | FanLetter",
    description:
      locale === "ko"
        ? "FanLetter AI 캐릭터 페르소나와 대표 아바타를 전용 변경 화면에서 관리하세요."
        : "Manage the FanLetter AI character persona and representative avatar in a dedicated change screen.",
  };
}

export default async function LocalizedFanletterCharacterPage({
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
  const fallbackReturnTo = buildPathWithReferral(
    `/${locale}/fanletter/profile`,
    referralCode,
  );
  const returnToHref = resolveReturnTo(locale, query.returnTo) ?? fallbackReturnTo;
  const fanletterHomeHref = buildPathWithReferral(
    `/${locale}/fanletter`,
    referralCode,
  );
  const fanletterStudioHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/studio`, referralCode),
    { returnTo: returnToHref },
  );
  const fanletterProfileHref = setPathSearchParams(fallbackReturnTo, {
    returnTo: returnToHref,
  });
  const fanletterCharacterHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/profile/character`, referralCode),
    { returnTo: returnToHref },
  );
  const fanletterCreateHref = setPathSearchParams(
    buildPathWithReferral(`/${locale}/fanletter/create`, referralCode),
    { returnTo: returnToHref },
  );

  return (
    <CreatorContentStudioPage
      characterHrefOverride={fanletterCharacterHref}
      dictionary={dictionary}
      homeHrefOverride={fanletterHomeHref}
      locale={locale}
      newPostHrefOverride={fanletterCreateHref}
      postsManagerHrefOverride={fanletterStudioHref}
      profileHrefOverride={fanletterProfileHref}
      referralCode={referralCode}
      returnToHref={returnToHref}
      salesManagerHrefOverride={fanletterStudioHref}
      studioHomeHrefOverride={fanletterStudioHref}
      view="character"
    />
  );
}
