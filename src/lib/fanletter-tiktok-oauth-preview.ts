import "server-only";

import { randomUUID } from "crypto";

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

export type FanletterTikTokOAuthPreview = {
  blockedReasons: string[];
  liveReady: boolean;
  mode: "oauth_preview";
  oauth: {
    callbackRoute: string;
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
};

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

function getTikTokClientKeyConfigured() {
  return Boolean(
    process.env.TIKTOK_CLIENT_KEY?.trim() ||
      process.env.TIKTOK_CLIENT_ID?.trim(),
  );
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
}: BuildFanletterTikTokOAuthPreviewInput): FanletterTikTokOAuthPreview {
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
    clientKeyConfigured: getTikTokClientKeyConfigured(),
    clientSecretConfigured: Boolean(process.env.TIKTOK_CLIENT_SECRET?.trim()),
    featureFlagEnabled:
      process.env.FANLETTER_TIKTOK_OAUTH_ENABLED === "true",
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
    requiredEnvironment.tokenStoreReady ? null : "token_store_not_ready",
  ].filter((reason): reason is string => Boolean(reason));
  const statePayload = {
    eventType: "creator_social_connected",
    locale,
    returnTo: safeReturnTo,
    source,
    starId,
    stateId: `fanletter-tiktok-oauth-preview:${randomUUID()}`,
    target: "ai_star",
  };

  return {
    blockedReasons,
    liveReady: blockedReasons.length === 0,
    mode: "oauth_preview",
    oauth: {
      callbackRoute:
        "/api/fanletter/founder-club/social-account/tiktok/oauth/callback",
      provider: "tiktok",
      redirectUri,
      scopePreview: ["user.info.basic"],
      statePreview: Buffer.from(JSON.stringify(statePayload)).toString(
        "base64url",
      ),
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
