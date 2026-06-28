import type { Locale } from "@/lib/i18n";

/**
 * Primary FanLetter navigation labels (둘러보기 / 내 스타 / 만들기), localized for
 * all supported locales so the top headers match the bottom nav instead of
 * falling back to English for ja/zh/vi/id. Keep these in sync with the bottom
 * nav copy in fanletter-mobile-bottom-nav.tsx.
 */
export type FanletterNavLabels = {
  browse: string;
  feed: string;
  club: string;
  create: string;
  myStars: string;
};

const FANLETTER_NAV_LABELS: Record<Locale, FanletterNavLabels> = {
  ko: { browse: "둘러보기", feed: "브이로그", club: "내 클럽", create: "만들기", myStars: "내 스타" },
  en: { browse: "Browse", feed: "Vlogs", club: "My Club", create: "Create", myStars: "My Stars" },
  ja: { browse: "見て回る", feed: "ブイログ", club: "マイクラブ", create: "作成", myStars: "マイスター" },
  zh: { browse: "浏览", feed: "视频", club: "我的俱乐部", create: "创建", myStars: "我的明星" },
  vi: {
    browse: "Khám phá",
    feed: "Vlog",
    club: "CLB của tôi",
    create: "Tạo",
    myStars: "Ngôi sao của tôi",
  },
  id: {
    browse: "Jelajahi",
    feed: "Vlog",
    club: "Klub Saya",
    create: "Buat",
    myStars: "Bintang Saya",
  },
};

export function getFanletterNavLabels(locale: Locale): FanletterNavLabels {
  return FANLETTER_NAV_LABELS[locale] ?? FANLETTER_NAV_LABELS.en;
}
