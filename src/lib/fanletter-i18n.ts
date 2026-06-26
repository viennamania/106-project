import type { Locale } from "@/lib/i18n";

/**
 * Pick a localized FanLetter copy variant with English fallback.
 *
 * Consumer pages historically branch only on ko/en; this lets us add
 * ja/zh/vi/id for the high-visibility *structural* strings (titles, labels,
 * CTAs, status) incrementally — any locale without a variant falls back to en.
 *
 * NOTE: ja/zh/vi/id values added via this helper are AI drafts pending native
 * review (especially anything financial/legal). Long-form marketing copy and
 * USDT / revenue-share / referral-reward text are intentionally left to fall
 * back to English until reviewed.
 */
export function pickFanletterCopy<T>(
  locale: Locale,
  variants: { en: T } & Partial<Record<Exclude<Locale, "en">, T>>,
): T {
  return (variants as Record<Locale, T | undefined>)[locale] ?? variants.en;
}
