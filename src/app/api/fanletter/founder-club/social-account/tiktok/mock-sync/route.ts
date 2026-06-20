import { tryRecordFanletterAgentRankServerEvent } from "@/lib/agentrank/server-events";
import {
  isAgentRankInteractionSource,
  type AgentRankInteractionSource,
} from "@/lib/agentrank/interaction-events";
import { tryGetFanletterAIStarStoredSocialAccount } from "@/lib/fanletter-ai-star-social-accounts";
import {
  getFanletterAIStarSocialConnectPermissionStatus,
  resolveFanletterAIStarSocialConnectServerPermission,
} from "@/lib/fanletter-ai-star-social-permissions";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";
import { buildFanletterTikTokMockSyncSnapshot } from "@/lib/fanletter-tiktok-mock-sync";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";
import { readMemberServerSession } from "@/lib/member-server-session";
import {
  fanletterTikTokApiCapabilities,
  type FanletterTikTokApiCapability,
} from "@/mock/fanletter-tiktok-api-capabilities";

type MockSyncRequestBody = {
  capabilityId?: unknown;
  locale?: unknown;
  source?: unknown;
  starId?: unknown;
  starName?: unknown;
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

function normalizeSource(value: unknown): AgentRankInteractionSource {
  return isAgentRankInteractionSource(value)
    ? value
    : "fanletter_star_detail";
}

function findCapability(value: unknown): FanletterTikTokApiCapability {
  const capability = fanletterTikTokApiCapabilities.find(
    (item) => item.id === value,
  );

  return capability ?? fanletterTikTokApiCapabilities[1];
}

export async function POST(request: Request) {
  let body: MockSyncRequestBody;

  try {
    body = (await request.json()) as MockSyncRequestBody;
  } catch {
    return jsonError("Invalid TikTok mock sync request.", 400);
  }

  const starId = normalizeFanletterStarId(
    typeof body.starId === "string" ? body.starId : null,
  );

  if (!starId) {
    return jsonError("A valid AI Star id is required.", 400);
  }

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

  const account = await tryGetFanletterAIStarStoredSocialAccount({
    platform: "tiktok",
    starId,
  });

  if (!account) {
    return jsonError("TikTok channel connection is required before sync.", 409, {
      mode: "mock",
      reason: "tiktok_connection_required",
    });
  }

  const locale = normalizeLocale(body.locale);
  const source = normalizeSource(body.source);
  const capability = findCapability(body.capabilityId);
  const starName = normalizeText(body.starName, starId, 80);
  const snapshot = buildFanletterTikTokMockSyncSnapshot({
    account,
    capability,
    starName,
  });
  const eventPath =
    source === "fanletter_creator_unlock"
      ? `/${locale}/fanletter/creator-unlock#tiktok-channel`
      : source === "fanletter_my_ai"
        ? `/${locale}/fanletter/my-ai#my-ai-tiktok-test`
        : `/${locale}/fanletter/${encodeURIComponent(starId)}#tiktok-channel`;

  await tryRecordFanletterAgentRankServerEvent({
    agentRank: {
      eventType: "content_engaged",
      intent: "creator_tiktok_mock_sync_completed",
      source,
      starId,
    },
    eventName: "content_open",
    memberEmail: session?.email ?? null,
    memberWalletAddress: session?.walletAddress ?? null,
    metadata: {
      actorMemberId: account.connectedByMemberId,
      actorMemberName: account.connectedByMemberName,
      actorType: "creator_member",
      agentRankEventType: snapshot.eventType,
      comments: snapshot.totals.comments,
      endpoint: snapshot.endpoint,
      likes: snapshot.totals.likes,
      mockOnly: true,
      page: "fanletter_tiktok_mock_sync_api",
      platform: "tiktok",
      profileUrl: account.profileUrl,
      shares: snapshot.totals.shares,
      socialApiCapability: snapshot.capabilityId,
      starId,
      starName,
      syncedVideos: snapshot.totals.videos,
      targetType: "ai_star",
      views: snapshot.totals.views,
    },
    path: eventPath,
    targetHref: account.profileUrl,
    userAgent: request.headers.get("user-agent"),
  });

  return Response.json({
    agentRank: {
      eventType: "content_engaged",
      intent: "creator_tiktok_mock_sync_completed",
      source,
      starId,
    },
    mode: "mock",
    permission,
    snapshot,
  });
}
