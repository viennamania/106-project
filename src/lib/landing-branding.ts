import type { Locale } from "@/lib/i18n";
import { getLandingBrandingCopy } from "@/lib/landing-branding-copy";

export const landingBrandModes = ["default", "custom"] as const;
export const landingBrandThemeKeys = [
  "gold",
  "ocean",
  "emerald",
  "rose",
] as const;

export const LANDING_BRANDING_LIMITS = {
  badgeLabel: 32,
  brandName: 36,
  ctaLabel: 32,
  description: 220,
  headline: 88,
} as const;
export const BRANDING_IMAGE_MAX_BYTES = 4 * 1024 * 1024;

export const defaultLandingBrandMode = "default";
export const defaultLandingBrandThemeKey = "gold";

export type LandingBrandingMode = (typeof landingBrandModes)[number];
export type LandingBrandThemeKey = (typeof landingBrandThemeKeys)[number];

export type LandingBrandingInput = {
  badgeLabel: string;
  brandName: string;
  ctaLabel: string;
  description: string;
  headline: string;
  heroImagePathname: string | null;
  heroImageUrl: string | null;
  mode: LandingBrandingMode;
  themeKey: LandingBrandThemeKey;
};

export type LandingBrandingDocument = LandingBrandingInput & {
  updatedAt?: Date | null;
};

export type LandingBrandingRecord = LandingBrandingInput & {
  updatedAt: string | null;
};

export type LandingBrandTheme = {
  accent: string;
  accentSoft: string;
  buttonFrom: string;
  buttonMid: string;
  buttonTo: string;
  codeSurface: string;
  glow: string;
  heroFrom: string;
  heroGlow: string;
  heroGlowSecondary: string;
  heroTo: string;
  key: LandingBrandThemeKey;
  lightAccent: string;
  previewFrom: string;
  previewTo: string;
  sponsorFrom: string;
  sponsorTo: string;
};

export type LandingPageBranding = LandingBrandingRecord & {
  brandedExperienceLabel: string;
  referralCode: string | null;
  referralCodeLabel: string;
  sharedByLabel: string;
  theme: LandingBrandTheme;
};

const landingBrandThemes: Record<LandingBrandThemeKey, LandingBrandTheme> = {
  emerald: {
    accent: "#34d399",
    accentSoft: "rgba(52,211,153,0.18)",
    buttonFrom: "#064e3b",
    buttonMid: "#0f766e",
    buttonTo: "#34d399",
    codeSurface: "rgba(52,211,153,0.14)",
    glow: "rgba(52,211,153,0.28)",
    heroFrom: "#052e2b",
    heroGlow: "rgba(52,211,153,0.22)",
    heroGlowSecondary: "rgba(59,130,246,0.18)",
    heroTo: "#14532d",
    key: "emerald",
    lightAccent: "#d1fae5",
    previewFrom: "#062b24",
    previewTo: "#14532d",
    sponsorFrom: "rgba(6,78,59,0.96)",
    sponsorTo: "rgba(20,83,45,0.92)",
  },
  gold: {
    accent: "#f5c34d",
    accentSoft: "rgba(245,195,77,0.16)",
    buttonFrom: "#0f172a",
    buttonMid: "#1e293b",
    buttonTo: "#b45309",
    codeSurface: "rgba(245,195,77,0.14)",
    glow: "rgba(245,195,77,0.26)",
    heroFrom: "#09111f",
    heroGlow: "rgba(245,204,96,0.2)",
    heroGlowSecondary: "rgba(131,169,238,0.18)",
    heroTo: "#1d2f4b",
    key: "gold",
    lightAccent: "#fff1cf",
    previewFrom: "#0f172a",
    previewTo: "#6b3e10",
    sponsorFrom: "rgba(180,83,9,0.92)",
    sponsorTo: "rgba(15,23,42,0.96)",
  },
  ocean: {
    accent: "#67e8f9",
    accentSoft: "rgba(103,232,249,0.18)",
    buttonFrom: "#082f49",
    buttonMid: "#0f766e",
    buttonTo: "#0891b2",
    codeSurface: "rgba(103,232,249,0.14)",
    glow: "rgba(56,189,248,0.26)",
    heroFrom: "#061b2d",
    heroGlow: "rgba(56,189,248,0.22)",
    heroGlowSecondary: "rgba(103,232,249,0.18)",
    heroTo: "#164e63",
    key: "ocean",
    lightAccent: "#cffafe",
    previewFrom: "#082032",
    previewTo: "#164e63",
    sponsorFrom: "rgba(8,145,178,0.92)",
    sponsorTo: "rgba(8,47,73,0.96)",
  },
  rose: {
    accent: "#fda4af",
    accentSoft: "rgba(253,164,175,0.18)",
    buttonFrom: "#4a0d2a",
    buttonMid: "#9d174d",
    buttonTo: "#e11d48",
    codeSurface: "rgba(253,164,175,0.14)",
    glow: "rgba(244,63,94,0.24)",
    heroFrom: "#2c0b1d",
    heroGlow: "rgba(251,113,133,0.2)",
    heroGlowSecondary: "rgba(253,164,175,0.18)",
    heroTo: "#881337",
    key: "rose",
    lightAccent: "#ffe4e6",
    previewFrom: "#311024",
    previewTo: "#881337",
    sponsorFrom: "rgba(157,23,77,0.92)",
    sponsorTo: "rgba(49,16,36,0.96)",
  },
};

function collapseWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function clampText(value: string, limit: number) {
  return collapseWhitespace(value).slice(0, limit);
}

function formatTemplate(
  template: string,
  replacements: Record<string, string | number>,
) {
  return Object.entries(replacements).reduce((message, [key, value]) => {
    return message.replaceAll(`{${key}}`, String(value));
  }, template);
}

function isLandingBrandMode(value: string): value is LandingBrandingMode {
  return landingBrandModes.includes(value as LandingBrandingMode);
}

function isLandingBrandThemeKey(value: string): value is LandingBrandThemeKey {
  return landingBrandThemeKeys.includes(value as LandingBrandThemeKey);
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readNullableString(value: unknown) {
  const normalized = readString(value).trim();
  return normalized ? normalized : null;
}

export function getConfiguredAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
}

export function isAllowedBrandingImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function buildReferralLandingPath(
  locale: Locale,
  referralCode: string | null,
) {
  const pathname = `/${locale}`;

  if (!referralCode) {
    return pathname;
  }

  return `${pathname}?ref=${encodeURIComponent(referralCode)}`;
}

export function buildReferralLandingUrl(
  locale: Locale,
  referralCode: string | null,
) {
  const path = buildReferralLandingPath(locale, referralCode);
  const appUrl = getConfiguredAppUrl();

  if (!appUrl) {
    return path;
  }

  try {
    return new URL(path, appUrl).toString();
  } catch {
    return path;
  }
}

export function buildReferralOgImagePath({
  locale,
  referralCode,
  version,
}: {
  locale: Locale;
  referralCode: string | null;
  version?: string | null;
}) {
  const searchParams = new URLSearchParams({
    lang: locale,
  });

  if (referralCode) {
    searchParams.set("ref", referralCode);
  }

  if (version) {
    searchParams.set("v", version);
  }

  return `/api/og/referral?${searchParams.toString()}`;
}

export function inferBrandNameFromEmail(email: string) {
  const localPart = email.trim().split("@")[0] ?? "";
  const cleaned = localPart
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  return cleaned
    .split(" ")
    .map((part) => {
      if (!part) {
        return "";
      }

      return `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`;
    })
    .join(" ")
    .slice(0, LANDING_BRANDING_LIMITS.brandName);
}

export function getLandingBrandTheme(
  themeKey?: LandingBrandThemeKey | null,
) {
  return landingBrandThemes[themeKey ?? defaultLandingBrandThemeKey] ??
    landingBrandThemes[defaultLandingBrandThemeKey];
}

export function createDefaultLandingBranding({
  email,
  locale,
}: {
  email: string;
  locale: Locale;
}): LandingBrandingRecord {
  const copy = getLandingBrandingCopy(locale);
  const inferredBrandName =
    inferBrandNameFromEmail(email) || copy.defaults.brandNameFallback;
  const brandName = clampText(
    inferredBrandName,
    LANDING_BRANDING_LIMITS.brandName,
  );

  return {
    badgeLabel: clampText(
      copy.defaults.badgeLabel,
      LANDING_BRANDING_LIMITS.badgeLabel,
    ),
    brandName,
    ctaLabel: clampText(
      copy.defaults.ctaLabel,
      LANDING_BRANDING_LIMITS.ctaLabel,
    ),
    description: clampText(
      formatTemplate(copy.defaults.descriptionTemplate, {
        brandName,
      }),
      LANDING_BRANDING_LIMITS.description,
    ),
    headline: clampText(
      formatTemplate(copy.defaults.headlineTemplate, {
        brandName,
      }),
      LANDING_BRANDING_LIMITS.headline,
    ),
    heroImagePathname: null,
    heroImageUrl: null,
    mode: defaultLandingBrandMode,
    themeKey: defaultLandingBrandThemeKey,
    updatedAt: null,
  };
}

export function serializeLandingBranding(
  branding?: LandingBrandingDocument | LandingBrandingRecord | null,
): LandingBrandingRecord | null {
  if (!branding) {
    return null;
  }

  const updatedAt =
    branding.updatedAt instanceof Date
      ? branding.updatedAt.toISOString()
      : typeof branding.updatedAt === "string"
        ? branding.updatedAt
        : null;
  const mode = isLandingBrandMode(branding.mode)
    ? branding.mode
    : defaultLandingBrandMode;
  const themeKey = isLandingBrandThemeKey(branding.themeKey)
    ? branding.themeKey
    : defaultLandingBrandThemeKey;

  return {
    badgeLabel: clampText(
      readString(branding.badgeLabel),
      LANDING_BRANDING_LIMITS.badgeLabel,
    ),
    brandName: clampText(
      readString(branding.brandName),
      LANDING_BRANDING_LIMITS.brandName,
    ),
    ctaLabel: clampText(
      readString(branding.ctaLabel),
      LANDING_BRANDING_LIMITS.ctaLabel,
    ),
    description: clampText(
      readString(branding.description),
      LANDING_BRANDING_LIMITS.description,
    ),
    headline: clampText(
      readString(branding.headline),
      LANDING_BRANDING_LIMITS.headline,
    ),
    heroImagePathname: readNullableString(branding.heroImagePathname),
    heroImageUrl: isAllowedBrandingImageUrl(readString(branding.heroImageUrl))
      ? readString(branding.heroImageUrl).trim()
      : null,
    mode,
    themeKey,
    updatedAt,
  };
}

export function resolveLandingBrandingDraft({
  email,
  locale,
  storedBranding,
}: {
  email: string;
  locale: Locale;
  storedBranding?: LandingBrandingDocument | LandingBrandingRecord | null;
}) {
  const defaults = createDefaultLandingBranding({
    email,
    locale,
  });
  const stored = serializeLandingBranding(storedBranding);

  if (!stored) {
    return defaults;
  }

  return {
    ...defaults,
    ...stored,
    updatedAt: stored.updatedAt ?? defaults.updatedAt,
  };
}

export function normalizeLandingBrandingInput(
  input: Partial<LandingBrandingInput> | null | undefined,
) {
  const brandName = clampText(
    readString(input?.brandName),
    LANDING_BRANDING_LIMITS.brandName,
  );
  const badgeLabel = clampText(
    readString(input?.badgeLabel),
    LANDING_BRANDING_LIMITS.badgeLabel,
  );
  const headline = clampText(
    readString(input?.headline),
    LANDING_BRANDING_LIMITS.headline,
  );
  const description = clampText(
    readString(input?.description),
    LANDING_BRANDING_LIMITS.description,
  );
  const ctaLabel = clampText(
    readString(input?.ctaLabel),
    LANDING_BRANDING_LIMITS.ctaLabel,
  );
  const heroImageUrl = readNullableString(input?.heroImageUrl);
  const heroImagePathname = readNullableString(input?.heroImagePathname);
  const rawMode = readString(input?.mode);
  const rawThemeKey = readString(input?.themeKey);
  const mode: LandingBrandingMode = isLandingBrandMode(rawMode)
    ? rawMode
    : defaultLandingBrandMode;
  const themeKey: LandingBrandThemeKey = isLandingBrandThemeKey(rawThemeKey)
    ? rawThemeKey
    : defaultLandingBrandThemeKey;

  if (!brandName) {
    return {
      data: null,
      error: "brandName is required.",
    };
  }

  if (!badgeLabel) {
    return {
      data: null,
      error: "badgeLabel is required.",
    };
  }

  if (!headline) {
    return {
      data: null,
      error: "headline is required.",
    };
  }

  if (!description) {
    return {
      data: null,
      error: "description is required.",
    };
  }

  if (!ctaLabel) {
    return {
      data: null,
      error: "ctaLabel is required.",
    };
  }

  if (heroImageUrl && !isAllowedBrandingImageUrl(heroImageUrl)) {
    return {
      data: null,
      error: "heroImageUrl must be a Vercel Blob public URL.",
    };
  }

  if ((heroImageUrl && !heroImagePathname) || (!heroImageUrl && heroImagePathname)) {
    return {
      data: null,
      error: "hero image metadata is incomplete.",
    };
  }

  return {
    data: {
      badgeLabel,
      brandName,
      ctaLabel,
      description,
      headline,
      heroImagePathname,
      heroImageUrl,
      mode,
      themeKey,
    },
    error: null,
  };
}

export function isCustomLandingBrandingActive(
  branding?: Pick<LandingBrandingInput, "mode"> | null,
) {
  return branding?.mode === "custom";
}

export function toLandingPageBranding({
  branding,
  locale,
  referralCode,
}: {
  branding: LandingBrandingRecord;
  locale: Locale;
  referralCode: string | null;
}): LandingPageBranding {
  const copy = getLandingBrandingCopy(locale);

  return {
    ...branding,
    brandedExperienceLabel: copy.landing.brandedExperience,
    referralCode,
    referralCodeLabel: copy.landing.referralCode,
    sharedByLabel: copy.landing.sharedBy,
    theme: getLandingBrandTheme(branding.themeKey),
  };
}
