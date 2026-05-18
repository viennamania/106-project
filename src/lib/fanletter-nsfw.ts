import type { Locale } from "@/lib/i18n";

export const FANLETTER_NSFW_OPT_IN_COOKIE = "fanletter_nsfw_opt_in";
export const FANLETTER_NSFW_OPT_IN_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export function isFanletterNsfwOptedIn(value: string | null | undefined) {
  return value === "1";
}

export function getFanletterNsfwCopy(locale: Locale) {
  return locale === "ko"
    ? {
        badge: "NSFW",
        disabledBody:
          "성인 팬 전용 콘텐츠는 별도 opt-in 후 피드와 팬 전용 영역에서 표시됩니다.",
        disabledCta: "NSFW 보기 켜기",
        disabledTitle: "NSFW 숨김",
        enabledBody:
          "NSFW 팬 전용 콘텐츠를 피드, 캐릭터 채널, 팬 전용 영역에서 함께 표시합니다.",
        enabledCta: "NSFW 보기 끄기",
        enabledTitle: "NSFW 표시 중",
        hiddenCount: (count: string) => `숨겨진 NSFW 콘텐츠 ${count}개`,
        studioBody:
          "직접 업로드한 유료 팬 전용 동영상에만 적용됩니다. 기본 피드에서는 숨겨지고, opt-in한 팬에게 NSFW 배지와 함께 강조됩니다.",
        studioLabel: "NSFW 팬 전용으로 표시",
        studioTitle: "NSFW opt-in 노출",
      }
    : {
        badge: "NSFW",
        disabledBody:
          "Adult fan-only content appears only after a separate opt-in.",
        disabledCta: "Show NSFW",
        disabledTitle: "NSFW hidden",
        enabledBody:
          "NSFW fan-only content is shown across feeds, character channels, and fan-only areas.",
        enabledCta: "Hide NSFW",
        enabledTitle: "NSFW visible",
        hiddenCount: (count: string) => `${count} NSFW posts hidden`,
        studioBody:
          "Available only for paid fan-only videos uploaded directly. It stays hidden in the default feed and is highlighted with an NSFW badge for opted-in fans.",
        studioLabel: "Mark as NSFW fan-only",
        studioTitle: "NSFW opt-in visibility",
      };
}
