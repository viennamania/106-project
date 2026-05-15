const productionSiteUrl = "https://1066.loot.menu";

function normalizeBaseUrl(value?: string | null) {
  const candidate = value?.trim();

  if (!candidate) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(candidate)
    ? candidate
    : `https://${candidate}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

export function getPublicSiteUrl() {
  return (
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeBaseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeBaseUrl(process.env.VERCEL_URL) ??
    productionSiteUrl
  );
}

export function createPublicUrl(pathname: string) {
  return new URL(pathname, getPublicSiteUrl()).toString();
}
