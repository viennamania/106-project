import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "crypto";

import {
  isAgentRankInteractionSource,
  type AgentRankInteractionSource,
} from "@/lib/agentrank/interaction-events";
import {
  normalizeFanletterReturnToPath,
  normalizeFanletterStarId,
} from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import {
  resolveFanletterAIStarSocialConnectPermission,
  type FanletterAIStarSocialConnectPermission,
} from "@/mock/fanletter-social-accounts";

export type FanletterTikTokOAuthCreatorRole = "creator" | "owner";
export type FanletterTikTokOAuthMode = "production" | "sandbox";

export type FanletterTikTokOAuthPreview = {
  blockedReasons: string[];
  liveReady: boolean;
  mode: "oauth_preview";
  oauth: {
    authorizeUrl: string | null;
    callbackRoute: string;
    clientKeyPreview: string | null;
    mode: FanletterTikTokOAuthMode;
    provider: "tiktok";
    redirectUri: string;
    scopePreview: string[];
    statePreview: string;
    willRedirect: false;
  };
  permission: FanletterAIStarSocialConnectPermission;
  reputationEventOnSuccess: {
    actor: "creator_member";
    eventType: "creator_social_connected";
    platform: "tiktok";
    target: "ai_star";
  };
  request: {
    locale: Locale;
    returnTo: string;
    source: AgentRankInteractionSource;
    starId: string;
  };
  requiredEnvironment: {
    clientKeyConfigured: boolean;
    clientSecretConfigured: boolean;
    featureFlagEnabled: boolean;
    tokenStoreReady: boolean;
  };
};

type BuildFanletterTikTokOAuthPreviewInput = {
  canConnect: boolean;
  creatorRole: FanletterTikTokOAuthCreatorRole | null;
  locale: Locale;
  requestUrl: string;
  returnTo?: string | null;
  source: AgentRankInteractionSource;
  starId: string;
  oauthMode?: FanletterTikTokOAuthMode;
};

export type FanletterTikTokOAuthStatePayload = {
  eventType: "creator_social_connected";
  issuedAt: number;
  locale: Locale;
  returnTo: string;
  source: AgentRankInteractionSource;
  starId: string;
  stateId: string;
  target: "ai_star";
  oauthMode?: FanletterTikTokOAuthMode;
};

const TIKTOK_AUTHORIZATION_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export function normalizeFanletterTikTokOAuthLocale(value: unknown): Locale {
  return typeof value === "string" && hasLocale(value) ? value : defaultLocale;
}

export function normalizeFanletterTikTokOAuthStarId(value: unknown) {
  return normalizeFanletterStarId(typeof value === "string" ? value : null);
}

export function normalizeFanletterTikTokOAuthCreatorRole(
  value: unknown,
): FanletterTikTokOAuthCreatorRole | null {
  return value === "creator" || value === "owner" ? value : null;
}

export function normalizeFanletterTikTokOAuthSource(
  value: unknown,
): AgentRankInteractionSource {
  return isAgentRankInteractionSource(value)
    ? value
    : "fanletter_star_detail";
}

export function normalizeFanletterTikTokOAuthCanConnect(value: unknown) {
  return value !== false && value !== "false";
}

export function normalizeFanletterTikTokOAuthMode(
  value: unknown,
): FanletterTikTokOAuthMode {
  return value === "sandbox" ? "sandbox" : "production";
}

export function getFanletterTikTokOAuthAppUrl(requestUrl: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    return configured;
  }

  try {
    return new URL(requestUrl).origin;
  } catch {
    return "https://www.net402.ai";
  }
}

function getTikTokClientKeyConfigured(mode: FanletterTikTokOAuthMode) {
  return Boolean(getFanletterTikTokClientKey(mode));
}

function maskTikTokClientKey(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length <= 8) {
    return `${normalized.slice(0, 2)}...${normalized.slice(-2)}`;
  }

  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
}

export function getFanletterTikTokClientKey(
  mode: FanletterTikTokOAuthMode = "production",
) {
  if (mode === "sandbox") {
    return process.env.TIKTOK_SANDBOX_CLIENT_KEY?.trim() || "";
  }

  return (
    process.env.TIKTOK_CLIENT_KEY?.trim() ||
    process.env.TIKTOK_CLIENT_ID?.trim() ||
    ""
  );
}

export function getFanletterTikTokClientSecret(
  mode: FanletterTikTokOAuthMode = "production",
) {
  if (mode === "sandbox") {
    return process.env.TIKTOK_SANDBOX_CLIENT_SECRET?.trim() || "";
  }

  return process.env.TIKTOK_CLIENT_SECRET?.trim() || "";
}

function getTikTokOAuthStateSecret() {
  return (
    process.env.FANLETTER_TIKTOK_OAUTH_STATE_SECRET?.trim() ||
    process.env.MEMBER_SESSION_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    ""
  );
}

function signStatePayload(encodedPayload: string) {
  const secret = getTikTokOAuthStateSecret();

  if (!secret) {
    return "";
  }

  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function encodeFanletterTikTokOAuthState(
  payload: FanletterTikTokOAuthStatePayload,
) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signature = signStatePayload(encodedPayload);

  return signature ? `${encodedPayload}.${signature}` : encodedPayload;
}

export function decodeFanletterTikTokOAuthState(value: string | null) {
  if (!value) {
    return null;
  }

  const [encodedPayload, signature] = value.split(".");

  if (!encodedPayload) {
    return null;
  }

  if (signature) {
    const expectedSignature = signStatePayload(encodedPayload);

    if (!expectedSignature) {
      return null;
    }

    const expected = Buffer.from(expectedSignature);
    const received = Buffer.from(signature);

    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      return null;
    }
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<FanletterTikTokOAuthStatePayload>;

    if (
      parsed.eventType !== "creator_social_connected" ||
      parsed.target !== "ai_star" ||
      !parsed.starId ||
      !parsed.returnTo ||
      !parsed.issuedAt ||
      Date.now() - parsed.issuedAt > TIKTOK_OAUTH_STATE_TTL_MS ||
      (parsed.oauthMode &&
        normalizeFanletterTikTokOAuthMode(parsed.oauthMode) !==
          parsed.oauthMode) ||
      typeof parsed.locale !== "string" ||
      !hasLocale(parsed.locale) ||
      typeof parsed.source !== "string" ||
      !isAgentRankInteractionSource(parsed.source)
    ) {
      return null;
    }

    return parsed as FanletterTikTokOAuthStatePayload;
  } catch {
    return null;
  }
}

function getSafeReturnTo({
  locale,
  returnTo,
  starId,
}: {
  locale: Locale;
  returnTo?: string | null;
  starId: string;
}) {
  return (
    normalizeFanletterReturnToPath(returnTo ?? undefined, locale) ??
    `/${locale}/fanletter/${encodeURIComponent(starId)}#tiktok-channel`
  );
}

export function buildFanletterTikTokOAuthPreview({
  canConnect,
  creatorRole,
  locale,
  requestUrl,
  returnTo,
  source,
  starId,
  oauthMode,
}: BuildFanletterTikTokOAuthPreviewInput): FanletterTikTokOAuthPreview {
  const mode = normalizeFanletterTikTokOAuthMode(oauthMode);
  const appUrl = getFanletterTikTokOAuthAppUrl(requestUrl);
  const redirectUri = new URL(
    "/api/fanletter/founder-club/social-account/tiktok/oauth/callback",
    appUrl,
  ).toString();
  const safeReturnTo = getSafeReturnTo({ locale, returnTo, starId });
  const permission = resolveFanletterAIStarSocialConnectPermission({
    canConnect,
    creatorRole,
  });
  const requiredEnvironment = {
    clientKeyConfigured: getTikTokClientKeyConfigured(mode),
    clientSecretConfigured: Boolean(getFanletterTikTokClientSecret(mode)),
    featureFlagEnabled:
      mode === "sandbox"
        ? process.env.FANLETTER_TIKTOK_SANDBOX_ENABLED === "true"
        : process.env.FANLETTER_TIKTOK_OAUTH_ENABLED === "true",
    tokenStoreReady:
      process.env.FANLETTER_TIKTOK_TOKEN_STORE_READY === "true",
  };
  const blockedReasons = [
    permission.allowed ? null : "creator_or_owner_required",
    requiredEnvironment.featureFlagEnabled
      ? null
      : "fanletter_tiktok_oauth_preview_mode",
    requiredEnvironment.clientKeyConfigured
      ? null
      : "tiktok_client_key_missing",
    requiredEnvironment.clientSecretConfigured
      ? null
      : "tiktok_client_secret_missing",
    getTikTokOAuthStateSecret() ? null : "oauth_state_secret_missing",
    requiredEnvironment.tokenStoreReady ? null : "token_store_not_ready",
  ].filter((reason): reason is string => Boolean(reason));
  const statePayload: FanletterTikTokOAuthStatePayload = {
    eventType: "creator_social_connected",
    issuedAt: Date.now(),
    locale,
    returnTo: safeReturnTo,
    source,
    starId,
    stateId: `fanletter-tiktok-oauth-preview:${randomUUID()}`,
    target: "ai_star",
    oauthMode: mode === "sandbox" ? "sandbox" : undefined,
  };
  const scopePreview = ["user.info.basic"];
  const statePreview = encodeFanletterTikTokOAuthState(statePayload);
  const clientKey = getFanletterTikTokClientKey(mode);
  const authorizeUrl = new URL(TIKTOK_AUTHORIZATION_URL);
  authorizeUrl.searchParams.set("client_key", clientKey);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", scopePreview.join(","));
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", statePreview);

  if (mode === "sandbox") {
    authorizeUrl.searchParams.set("disable_auto_auth", "1");
  }

  return {
    blockedReasons,
    liveReady: blockedReasons.length === 0,
    mode: "oauth_preview",
    oauth: {
      authorizeUrl: blockedReasons.length === 0 ? authorizeUrl.toString() : null,
      callbackRoute:
        "/api/fanletter/founder-club/social-account/tiktok/oauth/callback",
      clientKeyPreview: maskTikTokClientKey(clientKey),
      mode,
      provider: "tiktok",
      redirectUri,
      scopePreview,
      statePreview,
      willRedirect: false,
    },
    permission,
    reputationEventOnSuccess: {
      actor: "creator_member",
      eventType: "creator_social_connected",
      platform: "tiktok",
      target: "ai_star",
    },
    request: {
      locale,
      returnTo: safeReturnTo,
      source,
      starId,
    },
    requiredEnvironment,
  };
}
