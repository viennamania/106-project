import type { FanletterFounderUniverseRole } from "@/lib/fanletter-founder-universe";
import type { Locale } from "@/lib/i18n";

export type FanletterSocialPlatform = "tiktok";

export type FanletterAIStarSocialAccountStatus =
  | "mock_connected"
  | "pending"
  | "verified";

export type FanletterAIStarSocialAccount = {
  connectedAt: string;
  connectedByMemberId: string;
  connectedByMemberInitials?: string | null;
  connectedByMemberName: string;
  creatorRoleAtConnection:
    | Extract<FanletterFounderUniverseRole, "creator">
    | "owner";
  handle: string;
  platform: FanletterSocialPlatform;
  profileUrl: string;
  starId: string;
  status: FanletterAIStarSocialAccountStatus;
};

export type FanletterAIStarSocialAccountViewModel = {
  account: FanletterAIStarSocialAccount | null;
  canConnect: boolean;
  creatorMemberId: string;
  creatorMemberInitials: string;
  creatorMemberName: string;
  creatorRole: "creator" | "owner";
  permission: FanletterAIStarSocialConnectPermission;
  platform: FanletterSocialPlatform;
  starId: string;
};

export type FanletterAIStarSocialConnectPermission = {
  allowed: boolean;
  reason: "creator_or_owner_required" | "ok";
  requiredRoles: ["creator", "owner"];
  role: "creator" | "owner" | null;
};

export const fanletterAIStarSocialAccounts: FanletterAIStarSocialAccount[] = [
  {
    connectedAt: "2026-06-18T02:14:00.000Z",
    connectedByMemberId: "member-a",
    connectedByMemberInitials: "A",
    connectedByMemberName: "Member A",
    creatorRoleAtConnection: "creator",
    handle: "@minseo.golf.ai",
    platform: "tiktok",
    profileUrl: "https://www.tiktok.com/@minseo.golf.ai",
    starId: "minseo",
    status: "mock_connected",
  },
  {
    connectedAt: "2026-06-17T12:40:00.000Z",
    connectedByMemberId: "member-bayl",
    connectedByMemberInitials: "BY",
    connectedByMemberName: "Member BAYL",
    creatorRoleAtConnection: "creator",
    handle: "@amin.creator.ai",
    platform: "tiktok",
    profileUrl: "https://www.tiktok.com/@amin.creator.ai",
    starId: "legacy-star-t7v7bayl",
    status: "verified",
  },
  {
    connectedAt: "2026-06-16T09:25:00.000Z",
    connectedByMemberId: "member-hpgq",
    connectedByMemberInitials: "HG",
    connectedByMemberName: "Member HPGQ",
    creatorRoleAtConnection: "creator",
    handle: "@yoonseo.ai.story",
    platform: "tiktok",
    profileUrl: "https://www.tiktok.com/@yoonseo.ai.story",
    starId: "legacy-star-hpgqr7s6",
    status: "mock_connected",
  },
];

function getInitials(value: string) {
  const normalized = value.replace(/[^a-zA-Z0-9가-힣\s]/g, " ").trim();
  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }

  return (words[0] ?? value).slice(0, 2).toUpperCase();
}

export function normalizeFanletterTikTokHandle(value: string) {
  const withoutUrl = value
    .trim()
    .replace(/^https?:\/\/(www\.)?tiktok\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 48);

  return withoutUrl ? `@${withoutUrl}` : "";
}

export function validateFanletterTikTokHandle(value: string) {
  const normalizedHandle = normalizeFanletterTikTokHandle(value);
  const username = normalizedHandle.replace(/^@/, "");

  if (!username) {
    return {
      handle: "",
      ok: false,
      reason: "empty" as const,
      username,
    };
  }

  if (username.length < 2) {
    return {
      handle: normalizedHandle,
      ok: false,
      reason: "too_short" as const,
      username,
    };
  }

  if (username.length > 48) {
    return {
      handle: normalizedHandle,
      ok: false,
      reason: "too_long" as const,
      username,
    };
  }

  return {
    handle: normalizedHandle,
    ok: true,
    reason: "ok" as const,
    username,
  };
}

export function buildFanletterTikTokProfileUrl(handle: string) {
  return `https://www.tiktok.com/${handle}`;
}

export function buildFanletterSuggestedTikTokHandle({
  fallbackId,
  starName,
}: {
  fallbackId: string;
  starName?: string | null;
}) {
  const normalizedName = (starName ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 28);
  const normalizedFallback = fallbackId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^legacy\.star\./, "")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 28);

  return `@${normalizedName || normalizedFallback || "ai.star"}.ai`;
}

export function resolveFanletterAIStarSocialConnectPermission({
  canConnect = true,
  creatorRole,
}: {
  canConnect?: boolean;
  creatorRole?: "creator" | "owner" | null;
}): FanletterAIStarSocialConnectPermission {
  const allowedRole = creatorRole === "creator" || creatorRole === "owner";
  const allowed = Boolean(canConnect && allowedRole);

  return {
    allowed,
    reason: allowed ? "ok" : "creator_or_owner_required",
    requiredRoles: ["creator", "owner"],
    role: allowedRole ? creatorRole : null,
  };
}

export function buildFanletterAIStarMockSocialAccount({
  connectedAt,
  connectedByMemberId,
  connectedByMemberInitials,
  connectedByMemberName,
  creatorRoleAtConnection,
  handle,
  platform = "tiktok",
  starId,
  status = "mock_connected",
}: {
  connectedAt?: string | null;
  connectedByMemberId: string;
  connectedByMemberInitials?: string | null;
  connectedByMemberName: string;
  creatorRoleAtConnection: FanletterAIStarSocialAccount["creatorRoleAtConnection"];
  handle: string;
  platform?: FanletterSocialPlatform;
  starId: string;
  status?: FanletterAIStarSocialAccountStatus;
}): FanletterAIStarSocialAccount {
  const normalizedHandle = normalizeFanletterTikTokHandle(handle);

  return {
    connectedAt: connectedAt ?? new Date().toISOString(),
    connectedByMemberId,
    connectedByMemberInitials,
    connectedByMemberName,
    creatorRoleAtConnection,
    handle: normalizedHandle,
    platform,
    profileUrl: buildFanletterTikTokProfileUrl(normalizedHandle),
    starId,
    status,
  };
}

export function getFanletterAIStarSocialAccount(
  starId: string | null | undefined,
  platform: FanletterSocialPlatform = "tiktok",
) {
  if (!starId) {
    return null;
  }

  return (
    fanletterAIStarSocialAccounts.find(
      (account) => account.starId === starId && account.platform === platform,
    ) ?? null
  );
}

export function buildFanletterAIStarSocialAccountViewModel({
  canConnect = true,
  creatorMemberId,
  creatorMemberInitials,
  creatorMemberName,
  creatorRole = "creator",
  platform = "tiktok",
  starId,
}: {
  canConnect?: boolean;
  creatorMemberId?: string | null;
  creatorMemberInitials?: string | null;
  creatorMemberName?: string | null;
  creatorRole?: "creator" | "owner";
  platform?: FanletterSocialPlatform;
  starId: string;
}): FanletterAIStarSocialAccountViewModel {
  const account = getFanletterAIStarSocialAccount(starId, platform);
  const fallbackName =
    creatorMemberName ?? account?.connectedByMemberName ?? "Creator";
  const fallbackInitials =
    creatorMemberInitials ??
    account?.connectedByMemberInitials ??
    getInitials(fallbackName);
  const permission = resolveFanletterAIStarSocialConnectPermission({
    canConnect,
    creatorRole,
  });

  return {
    account,
    canConnect: permission.allowed,
    creatorMemberId:
      creatorMemberId ?? account?.connectedByMemberId ?? "mock-creator",
    creatorMemberInitials: fallbackInitials,
    creatorMemberName: fallbackName,
    creatorRole,
    permission,
    platform,
    starId,
  };
}

export function getFanletterAIStarSocialStatusLabel({
  locale,
  status,
}: {
  locale: Locale;
  status: FanletterAIStarSocialAccountStatus;
}) {
  if (locale === "ko") {
    return status === "verified"
      ? "검증됨"
      : status === "pending"
        ? "검토 중"
        : "mock 연결됨";
  }

  if (locale === "ja") {
    return status === "verified"
      ? "検証済み"
      : status === "pending"
        ? "確認中"
        : "mock接続済み";
  }

  return status === "verified"
    ? "Verified"
    : status === "pending"
      ? "Pending"
      : "Mock connected";
}
