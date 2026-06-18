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
  platform: FanletterSocialPlatform;
  starId: string;
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

  return {
    account,
    canConnect,
    creatorMemberId:
      creatorMemberId ?? account?.connectedByMemberId ?? "mock-creator",
    creatorMemberInitials: fallbackInitials,
    creatorMemberName: fallbackName,
    creatorRole,
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
