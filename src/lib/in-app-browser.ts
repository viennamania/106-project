export type BridgePlatformHint = "android" | "ios" | "other";

export function inferBridgePlatform(userAgent: string): BridgePlatformHint {
  if (/android/i.test(userAgent)) {
    return "android";
  }

  if (/(iphone|ipad|ipod)/i.test(userAgent)) {
    return "ios";
  }

  return "other";
}

export function isKakaoInAppBrowser(userAgent: string) {
  return /KAKAOTALK/i.test(userAgent);
}

export function isRestrictedInAppBrowser(userAgent: string) {
  return /(KAKAOTALK|Instagram|FBAN|FBAV|Line\/|NAVER|DaumApps|KAKAOStory)/i.test(
    userAgent,
  );
}

export function isBridgeCrawler(userAgent: string) {
  return /(bot|crawler|spider|facebookexternalhit|slackbot|twitterbot|linkedinbot|whatsapp|discordbot|kakaotalk-scrap)/i.test(
    userAgent,
  );
}

export function buildChromeIntentUrl(targetUrl: string) {
  try {
    const parsed = new URL(targetUrl);
    return `intent://${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}#Intent;scheme=${parsed.protocol.replace(":", "")};package=com.android.chrome;end`;
  } catch {
    return null;
  }
}
