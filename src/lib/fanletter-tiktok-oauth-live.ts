import "server-only";

import { createCipheriv, createHash, randomBytes } from "node:crypto";

import {
  getFanletterTikTokClientKey,
  getFanletterTikTokClientSecret,
  type FanletterTikTokOAuthMode,
} from "@/lib/fanletter-tiktok-oauth-preview";
import {
  buildFanletterTikTokProfileUrl,
  normalizeFanletterTikTokHandle,
} from "@/mock/fanletter-social-accounts";

const TIKTOK_TOKEN_ENDPOINT = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_USER_INFO_ENDPOINT = "https://open.tiktokapis.com/v2/user/info/";

type TikTokTokenResponse = {
  access_token?: string;
  error?: string | {
    code?: string;
    log_id?: string;
    message?: string;
  };
  error_description?: string;
  expires_in?: number;
  log_id?: string;
  message?: string;
  open_id?: string;
  refresh_expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type TikTokUserInfoResponse = {
  data?: {
    user?: {
      avatar_url?: string;
      display_name?: string;
      open_id?: string;
      profile_deep_link?: string;
      union_id?: string;
      username?: string;
    };
  };
  error?: {
    code?: string;
    log_id?: string;
    message?: string;
  };
};

export type FanletterTikTokOAuthLiveProfile = {
  avatarUrl: string | null;
  displayName: string | null;
  handle: string;
  openId: string;
  profileUrl: string;
  raw: Record<string, unknown>;
  username: string | null;
};

export class FanletterTikTokOAuthProviderError extends Error {
  code: string | null;
  description: string | null;
  logId: string | null;

  constructor({
    code,
    description,
    logId,
    message,
  }: {
    code?: string | null;
    description?: string | null;
    logId?: string | null;
    message: string;
  }) {
    super(message);
    this.name = "FanletterTikTokOAuthProviderError";
    this.code = code ?? null;
    this.description = description ?? null;
    this.logId = logId ?? null;
  }
}

function getTokenEncryptionSecret() {
  return (
    process.env.FANLETTER_TIKTOK_TOKEN_ENCRYPTION_KEY?.trim() ||
    process.env.MEMBER_SESSION_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    ""
  );
}

export function encryptFanletterTikTokToken(value: string | null | undefined) {
  const secret = getTokenEncryptionSecret();

  if (!value || !secret) {
    return null;
  }

  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export async function exchangeFanletterTikTokOAuthCode({
  code,
  mode = "production",
  redirectUri,
}: {
  code: string;
  mode?: FanletterTikTokOAuthMode;
  redirectUri: string;
}) {
  const clientKey = getFanletterTikTokClientKey(mode);
  const clientSecret = getFanletterTikTokClientSecret(mode);

  if (!clientKey || !clientSecret) {
    throw new Error("TikTok client key/secret is not configured.");
  }

  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const response = await fetch(TIKTOK_TOKEN_ENDPOINT, {
    body,
    cache: "no-store",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  const data = (await response.json().catch(() => null)) as
    | TikTokTokenResponse
    | null;

  if (!response.ok || !data?.access_token) {
    const providerError =
      typeof data?.error === "string" ? data.error : data?.error?.code;
    const providerMessage =
      typeof data?.error === "object"
        ? data.error.message
        : data?.message ?? data?.error_description;
    const logId =
      (typeof data?.error === "object" ? data.error.log_id : null) ??
      data?.log_id ??
      null;

    throw new FanletterTikTokOAuthProviderError({
      code: providerError ?? null,
      description: providerMessage ?? null,
      logId,
      message: [
        "TikTok token exchange failed",
        providerError,
        providerMessage,
        logId ? `log_id:${logId}` : null,
      ]
        .filter(Boolean)
        .join(": "),
    });
  }

  return data;
}

export async function fetchFanletterTikTokOAuthProfile({
  accessToken,
  fallbackOpenId,
}: {
  accessToken: string;
  fallbackOpenId?: string | null;
}): Promise<FanletterTikTokOAuthLiveProfile> {
  const fields = [
    "open_id",
    "union_id",
    "avatar_url",
    "display_name",
  ].join(",");
  const response = await fetch(
    `${TIKTOK_USER_INFO_ENDPOINT}?fields=${encodeURIComponent(fields)}`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  const data = (await response.json().catch(() => null)) as
    | TikTokUserInfoResponse
    | null;
  const user = data?.data?.user;
  const openId = user?.open_id || fallbackOpenId || "";

  if (!response.ok || !openId) {
    throw new FanletterTikTokOAuthProviderError({
      code: data?.error?.code ?? "tiktok_profile_fetch_failed",
      description: data?.error?.message ?? null,
      logId: data?.error?.log_id ?? null,
      message: [
        "TikTok profile fetch failed",
        data?.error?.code,
        data?.error?.message,
        data?.error?.log_id ? `log_id:${data.error.log_id}` : null,
      ]
        .filter(Boolean)
        .join(": "),
    });
  }

  const handle =
    normalizeFanletterTikTokHandle(user?.username ?? "") ||
    normalizeFanletterTikTokHandle(user?.display_name ?? "") ||
    normalizeFanletterTikTokHandle(`tiktok-${openId.slice(0, 10)}`);

  return {
    avatarUrl: user?.avatar_url ?? null,
    displayName: user?.display_name ?? null,
    handle,
    openId,
    profileUrl: user?.profile_deep_link || buildFanletterTikTokProfileUrl(handle),
    raw: (user ?? {}) as Record<string, unknown>,
    username: user?.username ?? null,
  };
}

export function getFanletterTikTokOAuthExpiresAt(expiresIn?: number) {
  if (!expiresIn || !Number.isFinite(expiresIn)) {
    return null;
  }

  return new Date(Date.now() + Math.max(0, expiresIn) * 1000);
}
