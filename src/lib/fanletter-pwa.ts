import type { Metadata, MetadataRoute, Viewport } from "next";

import type { Locale } from "@/lib/i18n";

export const FANLETTER_PWA_THEME_COLOR = "#030504";
export const FANLETTER_PWA_BACKGROUND_COLOR = "#030504";
export const FANLETTER_PWA_NAME = "FanLetter";
export const FANLETTER_PWA_DESCRIPTION =
  "FanLetter News turns AI character one-take vlogs into photo news, fan participation, and transparent USDT profit sharing.";
export const FANLETTER_PWA_ICON_192 = "/fanletter-icon-192.png";
export const FANLETTER_PWA_ICON_512 = "/fanletter-icon-512.png";
export const FANLETTER_PWA_APPLE_ICON = "/fanletter-apple-icon.png";

export const fanletterViewport: Viewport = {
  colorScheme: "dark",
  themeColor: FANLETTER_PWA_THEME_COLOR,
  viewportFit: "cover",
  width: "device-width",
};

export function getFanletterPwaStartUrl(locale: Locale) {
  return `/${locale}/fanletter/news/cuts?pwa=1`;
}

export function getFanletterPwaScope(locale: Locale) {
  return `/${locale}/fanletter`;
}

export function createFanletterPwaManifest(
  locale: Locale,
): MetadataRoute.Manifest {
  const scope = getFanletterPwaScope(locale);
  const copy = getFanletterPwaCopy(locale);

  return {
    background_color: FANLETTER_PWA_BACKGROUND_COLOR,
    categories: ["entertainment", "news", "photo", "social", "video"],
    description: copy.description,
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    icons: [
      {
        src: FANLETTER_PWA_ICON_192,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: FANLETTER_PWA_ICON_192,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: FANLETTER_PWA_ICON_512,
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: FANLETTER_PWA_ICON_512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    id: `/${locale}/fanletter`,
    lang: locale,
    launch_handler: {
      client_mode: "navigate-existing",
    },
    name: copy.name,
    orientation: "portrait",
    scope,
    shortcuts: [
      {
        description: copy.shortcuts.news.description,
        name: copy.shortcuts.news.name,
        short_name: copy.shortcuts.news.shortName,
        url: `${scope}/news/cuts`,
      },
      {
        description: copy.shortcuts.characters.description,
        name: copy.shortcuts.characters.name,
        short_name: copy.shortcuts.characters.shortName,
        url: `${scope}/news/characters`,
      },
      {
        description: copy.shortcuts.purchases.description,
        name: copy.shortcuts.purchases.name,
        short_name: copy.shortcuts.purchases.shortName,
        url: `${scope}/news/purchases`,
      },
      {
        description: copy.shortcuts.reports.description,
        name: copy.shortcuts.reports.name,
        short_name: copy.shortcuts.reports.shortName,
        url: `${scope}/news/reports`,
      },
      {
        description: copy.shortcuts.studio.description,
        name: copy.shortcuts.studio.name,
        short_name: copy.shortcuts.studio.shortName,
        url: `${scope}/studio/vlogs`,
      },
    ],
    short_name: copy.shortName,
    start_url: getFanletterPwaStartUrl(locale),
    theme_color: FANLETTER_PWA_THEME_COLOR,
  };
}

export function createFanletterPwaMetadata(locale: Locale): Metadata {
  const copy = getFanletterPwaCopy(locale);

  return {
    applicationName: copy.shortName,
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: copy.shortName,
    },
    description: copy.description,
    icons: {
      apple: [
        {
          sizes: "180x180",
          type: "image/png",
          url: FANLETTER_PWA_APPLE_ICON,
        },
      ],
      icon: [
        {
          sizes: "192x192",
          type: "image/png",
          url: FANLETTER_PWA_ICON_192,
        },
        {
          sizes: "512x512",
          type: "image/png",
          url: FANLETTER_PWA_ICON_512,
        },
      ],
    },
    manifest: `/${locale}/fanletter/manifest.webmanifest`,
    other: {
      "mobile-web-app-capable": "yes",
    },
    title: copy.name,
  };
}

function getFanletterPwaCopy(locale: Locale) {
  if (locale === "ko") {
    return {
      description:
        "FanLetter News는 AI 캐릭터 One Take 브이로그를 포토 뉴스, 팬 참여, 투명한 USDT 수익 공유로 연결합니다.",
      name: "FanLetter News",
      shortName: "FanLetter",
      shortcuts: {
        characters: {
          description: "AI 캐릭터 채널과 최신 일상을 탐색합니다.",
          name: "AI 캐릭터",
          shortName: "캐릭터",
        },
        news: {
          description: "팬 기자가 편집한 4컷 홈 피드를 엽니다.",
          name: "홈 피드",
          shortName: "홈",
        },
        purchases: {
          description: "구매한 팬 전용 콘텐츠를 이어봅니다.",
          name: "구매함",
          shortName: "구매",
        },
        reports: {
          description: "팬 리포터 리포트를 작성하고 관리합니다.",
          name: "리포트 관리",
          shortName: "리포트",
        },
        studio: {
          description: "브이로그 콘텐츠 허브를 엽니다.",
          name: "브이로그 스튜디오",
          shortName: "스튜디오",
        },
      },
    };
  }

  return {
    description: FANLETTER_PWA_DESCRIPTION,
    name: "FanLetter News",
    shortName: FANLETTER_PWA_NAME,
    shortcuts: {
      characters: {
        description: "Explore AI character channels and daily updates.",
        name: "AI Characters",
        shortName: "Characters",
      },
      news: {
        description: "Open the four-cut home feed edited by fan reporters.",
        name: "Home Feed",
        shortName: "Home",
      },
      purchases: {
        description: "Continue purchased fan-only content.",
        name: "Purchases",
        shortName: "Purchases",
      },
      reports: {
        description: "Write and manage fan reporter news reports.",
        name: "Reporter Desk",
        shortName: "Reports",
      },
      studio: {
        description: "Open the vlog content management hub.",
        name: "Vlog Studio",
        shortName: "Studio",
      },
    },
  };
}
