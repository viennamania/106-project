import { tryRecordFanletterAgentRankServerEvent } from "@/lib/agentrank/server-events";
import {
  isAgentRankInteractionSource,
  type AgentRankInteractionSource,
} from "@/lib/agentrank/interaction-events";
import {
  tryUpsertFanletterAIStarSocialAccount,
  type FanletterAIStarSocialAccountUpsertResult,
} from "@/lib/fanletter-ai-star-social-accounts";
import {
  getFanletterAIStarSocialConnectPermissionStatus,
  resolveFanletterAIStarSocialConnectServerPermission,
  type FanletterAIStarSocialConnectServerPermission,
} from "@/lib/fanletter-ai-star-social-permissions";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { readMemberServerSession } from "@/lib/member-server-session";
import { getMembersCollection } from "@/lib/mongodb";
import {
  buildFanletterAIStarMockSocialAccount,
  normalizeFanletterTikTokHandle,
  type FanletterAIStarSocialAccount,
} from "@/mock/fanletter-social-accounts";

type MockSocialAccountConnectRequestBody = {
  canConnect?: unknown;
  connectedByMemberId?: unknown;
  connectedByMemberInitials?: unknown;
  connectedByMemberName?: unknown;
  creatorRoleAtConnection?: unknown;
  handle?: unknown;
  locale?: unknown;
  source?: unknown;
  starId?: unknown;
  starName?: unknown;
};

type MockSocialAccountConnectResponse = {
  account: FanletterAIStarSocialAccount;
  agentRank: {
    eventType: "creator_social_connected";
    intent: "creator_tiktok_channel_mock_connected";
    source: AgentRankInteractionSource;
    starId: string;
  };
  mode: "mock";
  permission: FanletterAIStarSocialConnectServerPermission;
  reputationEvent: {
    actor: "creator_member";
    mockOnly: true;
    platform: "tiktok";
    target: "ai_star";
    type: "creator_social_connected";
  };
  serverAccount: FanletterAIStarSocialAccountUpsertResult | null;
  session: {
    email: string | null;
    hasMemberSession: boolean;
    walletAddress: string | null;
  };
};

function jsonError(message: string, status: number, extra?: object) {
  return Response.json({ error: message, ...(extra ?? {}) }, { status });
}

function normalizeLocale(value: unknown): Locale {
  return typeof value === "string" && hasLocale(value) ? value : defaultLocale;
}

function normalizeText(value: unknown, fallback: string, maxLength: number) {
  const normalized = typeof value === "string" ? value.trim() : "";

  return (normalized || fallback).slice(0, maxLength);
}

function normalizeCreatorRole(value: unknown) {
  return value === "creator" || value === "owner" ? value : null;
}

function normalizeSource(value: unknown): AgentRankInteractionSource {
  return isAgentRankInteractionSource(value)
    ? value
    : "fanletter_star_detail";
}

function normalizeCanConnect(value: unknown) {
  return value !== false;
}

function getInitials(value: string) {
  const normalized = value.replace(/[^a-zA-Z0-9가-힣\s]/g, " ").trim();
  const words = normalized.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }

  return (words[0] ?? value).slice(0, 2).toUpperCase();
}

function getMemberDisplayName({
  email,
  publicDisplayName,
}: {
  email: string;
  publicDisplayName?: string | null;
}) {
  const displayName = publicDisplayName?.replace(/\s+/g, " ").trim();

  return displayName || email.split("@")[0] || "Creator";
}

export async function POST(request: Request) {
  let body: MockSocialAccountConnectRequestBody;

  try {
    body = (await request.json()) as MockSocialAccountConnectRequestBody;
  } catch {
    return jsonError("Invalid mock social account connection request.", 400);
  }

  const starId = normalizeFanletterStarId(
    typeof body.starId === "string" ? body.starId : null,
  );

  if (!starId) {
    return jsonError("A valid AI Star id is required.", 400);
  }

  const handle = normalizeFanletterTikTokHandle(
    typeof body.handle === "string" ? body.handle : "",
  );

  if (!handle) {
    return jsonError("A valid TikTok handle is required.", 400);
  }

  const creatorRoleAtConnection = normalizeCreatorRole(
    body.creatorRoleAtConnection,
  );
  const session = await readMemberServerSession();
  const permission = await resolveFanletterAIStarSocialConnectServerPermission({
    memberEmail: session?.email,
    starId,
  });

  if (!permission.allowed || !permission.role) {
    return jsonError(
      "Creator or Owner permission is required.",
      getFanletterAIStarSocialConnectPermissionStatus(permission.reason),
      {
        mode: "mock",
        permission,
      },
    );
  }

  const locale = normalizeLocale(body.locale);
  const source = normalizeSource(body.source);
  const starName = normalizeText(body.starName, starId, 80);
  const membersCollection = await getMembersCollection();
  const member = await membersCollection.findOne(
    { email: session?.email },
    {
      projection: {
        email: 1,
        publicProfile: 1,
        referralCode: 1,
      },
    },
  );
  const connectedByMemberName = getMemberDisplayName({
    email: session?.email ?? "creator",
    publicDisplayName: member?.publicProfile?.displayName,
  });
  const connectedByMemberId = member?.referralCode
    ? `member:${member.referralCode}`
    : `member:${session?.email?.split("@")[0] ?? "creator"}`;
  const connectedByMemberInitials = getInitials(connectedByMemberName);
  const account = buildFanletterAIStarMockSocialAccount({
    connectedByMemberId,
    connectedByMemberInitials,
    connectedByMemberName,
    creatorRoleAtConnection: permission.role,
    handle,
    starId,
  });
  const agentRank = {
    eventType: "creator_social_connected" as const,
    intent: "creator_tiktok_channel_mock_connected" as const,
    source,
    starId,
  };
  const eventPath =
    source === "fanletter_creator_unlock"
      ? `/${locale}/fanletter/creator-unlock#tiktok-channel`
      : `/${locale}/fanletter/${encodeURIComponent(starId)}#tiktok-channel`;
  const serverAccount = await tryUpsertFanletterAIStarSocialAccount({
    account,
    connectedByMemberEmail: session?.email ?? null,
    connectedByMemberWalletAddress: session?.walletAddress ?? null,
    eventPath,
    source,
    starName,
  });

  await tryRecordFanletterAgentRankServerEvent({
    agentRank,
    eventName: "fanletter_creator_social_connected",
    memberEmail: session?.email ?? null,
    memberWalletAddress: session?.walletAddress ?? null,
    metadata: {
      actorMemberId: connectedByMemberId,
      actorMemberName: connectedByMemberName,
      actorType: "creator_member",
      creatorJourneyConditionId: "creatorSocialConnected",
      creatorJourneyConditionMet: true,
      clientCanConnectClaim: normalizeCanConnect(body.canConnect),
      clientCreatorRoleClaim: creatorRoleAtConnection,
      creatorRoleAtConnection: permission.role,
      handle: account.handle,
      mockOnly: true,
      page: "fanletter_social_account_mock_connect_api",
      platform: account.platform,
      permissionReason: permission.reason,
      permissionSource: permission.source,
      socialConnectionStatus: account.status,
      starId,
      starName,
      targetType: "ai_star",
    },
    path: eventPath,
    targetHref: account.profileUrl,
    userAgent: request.headers.get("user-agent"),
  });

  const response: MockSocialAccountConnectResponse = {
    account,
    agentRank,
    mode: "mock",
    permission,
    reputationEvent: {
      actor: "creator_member",
      mockOnly: true,
      platform: "tiktok",
      target: "ai_star",
      type: "creator_social_connected",
    },
    serverAccount,
    session: {
      email: session?.email ?? null,
      hasMemberSession: Boolean(session?.email),
      walletAddress: session?.walletAddress ?? null,
    },
  };

  return Response.json(response);
}
