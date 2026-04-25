export const SHARE_ID_QUERY_PARAM = "shareId";

export function normalizeShareId(value: unknown) {
  const candidate = typeof value === "string" ? value.trim() : "";

  if (!/^[A-Za-z0-9_-]{6,80}$/.test(candidate)) {
    return null;
  }

  return candidate;
}

export function createShareId(scope = "share") {
  const normalizedScope = scope.replace(/[^A-Za-z0-9]/g, "").slice(0, 12) || "share";
  const randomSource =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const randomId = randomSource.replace(/[^A-Za-z0-9]/g, "").slice(0, 24);

  return `${normalizedScope}_${Date.now().toString(36)}_${randomId}`;
}

export function setShareIdOnHref(href: string, shareId: string | null) {
  const normalizedShareId = normalizeShareId(shareId);

  if (!normalizedShareId) {
    return href;
  }

  try {
    const isAbsolute = /^[a-z][a-z\d+\-.]*:\/\//i.test(href);
    const parsed = new URL(href, "https://pocket.local");
    parsed.searchParams.set(SHARE_ID_QUERY_PARAM, normalizedShareId);

    if (isAbsolute) {
      return parsed.toString();
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return href;
  }
}
