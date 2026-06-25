import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ActivateAIStarPage } from "@/components/activate-ai-star-page";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import { normalizeLandingLanguageContext } from "@/lib/landing-branding";
import { normalizeReferralCode } from "@/lib/member";
import {
  buildServiceMetadata,
  SERVICE_BRAND_NAME,
} from "@/lib/service-branding";

function normalizeReturnToPath(
  value: string | string[] | undefined,
  locale: Locale,
  referralCode: string | null,
) {
  const fallback = `/${locale}/activate${referralCode ? `?ref=${referralCode}` : ""}`;
  const candidate = Array.isArray(value) ? value[0] : value;

  if (!candidate || !candidate.startsWith(`/${locale}/`)) {
    return fallback;
  }

  if (candidate.startsWith("//")) {
    return fallback;
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

  return buildServiceMetadata({
    title: `${SERVICE_BRAND_NAME} AI Star IP`,
    description:
      locale === "ko"
        ? "1066FRIEND+ 가입 완료 후 자동 생성된 AI 스타 IP의 이름과 프로필 이미지를 관리합니다."
        : "Manage the AI Star IP name and profile image created after 1066FRIEND+ activation.",
    path: `/${locale}/activate/ai-star`,
  });
}

export default async function LocalizedActivateAIStarPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{
    landingLang?: string | string[];
    ref?: string | string[];
    returnTo?: string | string[];
  }>;
}) {
  const { lang } = await params;
  const query = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const locale = lang as Locale;
  const dictionary = getDictionary(locale);
  const referralCode = normalizeReferralCode(
    Array.isArray(query.ref) ? query.ref[0] : query.ref,
  );
  const landingLanguage = normalizeLandingLanguageContext(query.landingLang);
  const returnToHref = normalizeReturnToPath(query.returnTo, locale, referralCode);

  return (
    <ActivateAIStarPage
      dictionary={dictionary}
      landingLanguage={landingLanguage}
      locale={locale}
      referralCode={referralCode}
      returnToHref={returnToHref}
    />
  );
}
