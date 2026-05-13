import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CreatorContentStudioPage } from "@/components/creator-content-studio-page";
import { getCreatorStudioDictionary } from "@/lib/creator-studio-dictionary";
import {
  getSafeFanletterReturnTo,
  readFanletterReferralCode,
} from "@/lib/fanletter-routing";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import {
  buildPathWithReferral,
  setPathSearchParams,
} from "@/lib/landing-branding";

type FanletterPaidUploadSearchParams = {
  ref?: string | string[];
  returnTo?: string | string[];
};

function getMetaCopy(locale: Locale) {
  return locale === "ko"
    ? {
        description:
          "직접 업로드한 동영상을 1 USDT 유료 FanLetter 콘텐츠로 등록합니다.",
        title: "유료 콘텐츠 직접 업로드 | FanLetter",
      }
    : {
        description:
          "Register a directly uploaded video as 1 USDT paid FanLetter content.",
        title: "Upload paid content | FanLetter",
      };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? (lang as Locale) : "ko";
  const copy = getMetaCopy(locale);

  return {
    description: copy.description,
    title: copy.title,
  };
}

export default async function LocalizedFanletterPaidUploadPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<FanletterPaidUploadSearchParams>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const referralCode = readFanletterReferralCode(query.ref);
  const dictionary = getCreatorStudioDictionary(getDictionary(locale));
  const paidUploadHref = buildPathWithReferral(
    `/${locale}/fanletter/studio/paid-upload`,
    referralCode,
  );
  const studioHref = buildPathWithReferral(
    `/${locale}/fanletter/studio`,
    referralCode,
  );
  const returnToHref = getSafeFanletterReturnTo({
    fallbackPath: `/${locale}/fanletter/studio`,
    locale,
    referralCode,
    returnTo: query.returnTo,
  });

  return (
    <CreatorContentStudioPage
      dictionary={dictionary}
      homeHrefOverride={buildPathWithReferral(`/${locale}/fanletter`, referralCode)}
      locale={locale}
      newPostHrefOverride={setPathSearchParams(paidUploadHref, {
        returnTo: returnToHref,
      })}
      postComposerMode="paid-upload"
      postsManagerHrefOverride={buildPathWithReferral(
        `/${locale}/fanletter/studio/vlogs`,
        referralCode,
      )}
      profileHrefOverride={setPathSearchParams(
        buildPathWithReferral(`/${locale}/fanletter/profile`, referralCode),
        { returnTo: paidUploadHref },
      )}
      referralCode={referralCode}
      returnToHref={returnToHref}
      salesManagerHrefOverride={buildPathWithReferral(
        `/${locale}/fanletter/studio/sales`,
        referralCode,
      )}
      showMobileNav={false}
      studioHomeHrefOverride={studioHref}
      surface="fanletter"
      view="new"
    />
  );
}
