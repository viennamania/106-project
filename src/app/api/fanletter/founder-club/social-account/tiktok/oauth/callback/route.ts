import { tryRecordFanletterAgentRankServerEvent } from "@/lib/agentrank/server-events";
import {
  tryUpsertFanletterAIStarSocialAccount,
  type FanletterAIStarSocialAccountUpsertResult,
} from "@/lib/fanletter-ai-star-social-accounts";
import {
  resolveFanletterAIStarSocialConnectServerPermission,
} from "@/lib/fanletter-ai-star-social-permissions";
import {
  exchangeFanletterTikTokOAuthCode,
  encryptFanletterTikTokToken,
  fetchFanletterTikTokOAuthProfile,
  FanletterTikTokOAuthProviderError,
  getFanletterTikTokOAuthExpiresAt,
} from "@/lib/fanletter-tiktok-oauth-live";
import {
  decodeFanletterTikTokOAuthState,
  getFanletterTikTokOAuthAppUrl,
} from "@/lib/fanletter-tiktok-oauth-preview";
import { readMemberServerSession } from "@/lib/member-server-session";
import { getMembersCollection } from "@/lib/mongodb";
import type { FanletterAIStarSocialAccount } from "@/mock/fanletter-social-accounts";

export const dynamic = "force-dynamic";

function appendStatus({
  origin,
  returnTo,
  status,
  reason,
}: {
  origin: string;
  reason?: string | null;
  returnTo: string;
  status: "connected" | "failed";
}) {
  const url = new URL(returnTo, origin);
  url.searchParams.set("tiktok", status);

  if (reason) {
    url.searchParams.set("tiktokReason", reason);
  }

  return url;
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

function getTikTokOAuthFailureReason(error: unknown) {
  if (error instanceof FanletterTikTokOAuthProviderError) {
    return error.code || "tiktok_token_exchange_failed";
  }

  const message =
    error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("non_sandbox_target")) {
    return "non_sandbox_target";
  }

  if (message.includes("unauthorized_client")) {
    return "unauthorized_client";
  }

  if (message.includes("client key") || message.includes("client secret")) {
    return "tiktok_client_config_missing";
  }

  if (message.includes("token exchange")) {
    return "tiktok_token_exchange_failed";
  }

  if (message.includes("profile fetch")) {
    return "tiktok_profile_fetch_failed";
  }

  return "tiktok_oauth_failed";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getFanletterTikTokOAuthAppUrl(request.url);
  const state = decodeFanletterTikTokOAuthState(url.searchParams.get("state"));
  const fallbackReturnTo = "/ko/fanletter/creator-unlock/tiktok";
  const returnTo = state?.returnTo ?? fallbackReturnTo;
  const providerError = url.searchParams.get("error");

  if (providerError) {
    return Response.redirect(
      appendStatus({
        origin,
        reason: providerError,
        returnTo,
        status: "failed",
      }),
      303,
    );
  }

  const code = url.searchParams.get("code");

  if (!state || !code) {
    return Response.redirect(
      appendStatus({
        origin,
        reason: "invalid_oauth_callback",
        returnTo,
        status: "failed",
      }),
      303,
    );
  }

  const session = await readMemberServerSession();
  const permission = await resolveFanletterAIStarSocialConnectServerPermission({
    memberEmail: session?.email,
    starId: state.starId,
  });

  if (!permission.allowed || !permission.role) {
    return Response.redirect(
      appendStatus({
        origin,
        reason: permission.reason,
        returnTo,
        status: "failed",
      }),
      303,
    );
  }

  try {
    const redirectUri = new URL(
      "/api/fanletter/founder-club/social-account/tiktok/oauth/callback",
      origin,
    ).toString();
    const token = await exchangeFanletterTikTokOAuthCode({
      code,
      mode: state.oauthMode ?? "production",
      redirectUri,
    });
    const profile = await fetchFanletterTikTokOAuthProfile({
      accessToken: token.access_token ?? "",
      fallbackOpenId: token.open_id,
    });
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
    const account: FanletterAIStarSocialAccount = {
      connectedAt: new Date().toISOString(),
      connectedByMemberId,
      connectedByMemberInitials,
      connectedByMemberName,
      creatorRoleAtConnection: permission.role,
      handle: profile.handle,
      platform: "tiktok",
      profileUrl: profile.profileUrl,
      starId: state.starId,
      status: "verified",
    };
    const serverAccount: FanletterAIStarSocialAccountUpsertResult =
      await tryUpsertFanletterAIStarSocialAccount({
        account,
        connectedByMemberEmail: session?.email ?? null,
        connectedByMemberWalletAddress: session?.walletAddress ?? null,
        eventPath: state.returnTo,
        mode: "oauth",
        oauth: {
          expiresAt: getFanletterTikTokOAuthExpiresAt(token.expires_in),
          providerAccountId: profile.openId,
          providerDisplayName: profile.displayName,
          providerRawProfile: profile.raw,
          providerScope: token.scope ?? null,
          tokenCiphertext: encryptFanletterTikTokToken(token.access_token),
          tokenRefreshCiphertext: encryptFanletterTikTokToken(
            token.refresh_token,
          ),
          tokenType: token.token_type ?? null,
        },
        source: state.source,
        starName: state.starId,
      });

    await tryRecordFanletterAgentRankServerEvent({
      agentRank: {
        eventType: "creator_social_connected",
        intent: "creator_tiktok_channel_oauth_connected",
        source: state.source,
        starId: state.starId,
      },
      eventName: "fanletter_creator_social_connected",
      memberEmail: session?.email ?? null,
      memberWalletAddress: session?.walletAddress ?? null,
      metadata: {
        actorMemberId: connectedByMemberId,
        actorMemberInitials: connectedByMemberInitials,
        actorMemberName: connectedByMemberName,
        actorType: "creator_member",
        creatorJourneyConditionId: "creatorSocialConnected",
        creatorJourneyConditionMet: true,
        creatorRoleAtConnection: permission.role,
        handle: account.handle,
        mockOnly: false,
        oauthMode: state.oauthMode ?? "production",
        oauthProviderAccountId: profile.openId,
        oauthTokenStored: Boolean(serverAccount.saved),
        page: "fanletter_social_account_tiktok_oauth_callback",
        platform: account.platform,
        profileUrl: account.profileUrl,
        socialConnectionStatus: account.status,
        storageSource: "server",
        targetType: "ai_star",
      },
      path: state.returnTo,
      targetHref: account.profileUrl,
      userAgent: request.headers.get("user-agent"),
    });

    return Response.redirect(
      appendStatus({
        origin,
        returnTo: state.returnTo,
        status: "connected",
      }),
      303,
    );
  } catch (error) {
    console.warn("FanLetter TikTok OAuth callback failed", {
      error,
      starId: state.starId,
    });

    return Response.redirect(
      appendStatus({
        origin,
        reason: getTikTokOAuthFailureReason(error),
        returnTo: state.returnTo,
        status: "failed",
      }),
      303,
    );
  }
}
