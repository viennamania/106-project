import type { Locale } from "@/lib/i18n";

export const FANLETTER_OG_IMAGE_SIZE = {
  height: 630,
  width: 1200,
} as const;

export type FanletterOgVariant = "creator" | "feed" | "home" | "start";

const FANLETTER_OG_VARIANTS = new Set<FanletterOgVariant>([
  "creator",
  "feed",
  "home",
  "start",
]);

export function isFanletterOgVariant(
  value: string | null,
): value is FanletterOgVariant {
  return Boolean(value && FANLETTER_OG_VARIANTS.has(value as FanletterOgVariant));
}

export function getFanletterOgAlt(locale: Locale, variant: FanletterOgVariant) {
  if (locale === "ko") {
    switch (variant) {
      case "creator":
        return "FanLetter 크리에이터 채널 미리보기";
      case "feed":
        return "FanLetter 공개 AI 콘텐츠 피드 미리보기";
      case "start":
        return "FanLetter 크리에이터 시작하기 미리보기";
      case "home":
      default:
        return "FanLetter AI 크리에이터 수익화 홈 미리보기";
    }
  }

  switch (variant) {
    case "creator":
      return "FanLetter creator channel preview";
    case "feed":
      return "FanLetter public AI content feed preview";
    case "start":
      return "FanLetter creator onboarding preview";
    case "home":
    default:
      return "FanLetter AI creator monetisation home preview";
  }
}

export function buildFanletterOgImagePath({
  description,
  layout,
  locale,
  referralCode,
  title,
  variant,
  version,
}: {
  description?: string | null;
  layout?: "default" | "promo";
  locale: Locale;
  referralCode?: string | null;
  title?: string | null;
  variant: FanletterOgVariant;
  version?: string | null;
}) {
  const searchParams = new URLSearchParams({
    lang: locale,
    variant,
  });

  if (title) {
    searchParams.set("title", title);
  }

  if (description) {
    searchParams.set("description", description);
  }

  if (layout && layout !== "default") {
    searchParams.set("layout", layout);
  }

  if (referralCode) {
    searchParams.set("ref", referralCode);
  }

  if (version) {
    searchParams.set("v", version);
  }

  return `/api/og/fanletter?${searchParams.toString()}`;
}

export function buildFanletterOgVersionToken(
  ...parts: Array<string | null | undefined>
) {
  const source = parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join("|");

  if (!source) {
    return null;
  }

  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) | 0;
  }

  return Math.abs(hash).toString(36);
}
