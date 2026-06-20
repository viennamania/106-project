import {
  buildFanletterTikTokOAuthPreview,
  normalizeFanletterTikTokOAuthLocale,
  normalizeFanletterTikTokOAuthMode,
  normalizeFanletterTikTokOAuthSource,
  normalizeFanletterTikTokOAuthStarId,
  type FanletterTikTokOAuthPreview,
} from "@/lib/fanletter-tiktok-oauth-preview";
import {
  resolveFanletterAIStarSocialConnectServerPermission,
  type FanletterAIStarSocialConnectServerPermission,
} from "@/lib/fanletter-ai-star-social-permissions";
import { readMemberServerSession } from "@/lib/member-server-session";

export const dynamic = "force-dynamic";

type TikTokOAuthStartRequestBody = {
  canConnect?: unknown;
  creatorRole?: unknown;
  locale?: unknown;
  oauthMode?: unknown;
  returnTo?: unknown;
  source?: unknown;
  starId?: unknown;
};

function jsonError(message: string, status: number, extra?: object) {
  return Response.json({ error: message, ...(extra ?? {}) }, { status });
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function buildPreviewResponse({
  body,
  creatorRole,
  canConnect,
  request,
}: {
  body: TikTokOAuthStartRequestBody;
  creatorRole: "creator" | "owner" | null;
  canConnect: boolean;
  request: Request;
}) {
  const starId = normalizeFanletterTikTokOAuthStarId(body.starId);

  if (!starId) {
    return null;
  }

  const locale = normalizeFanletterTikTokOAuthLocale(body.locale);

  return buildFanletterTikTokOAuthPreview({
    canConnect,
    creatorRole,
    locale,
    oauthMode: normalizeFanletterTikTokOAuthMode(body.oauthMode),
    requestUrl: request.url,
    returnTo: readString(body.returnTo),
    source: normalizeFanletterTikTokOAuthSource(body.source),
    starId,
  });
}

function applyServerPermissionBlockedReason({
  preview,
  serverPermission,
}: {
  preview: FanletterTikTokOAuthPreview;
  serverPermission: FanletterAIStarSocialConnectServerPermission;
}) {
  if (serverPermission.allowed) {
    return preview;
  }

  const blockedReasons = [
    serverPermission.reason,
    ...preview.blockedReasons.filter(
      (reason) =>
        reason !== serverPermission.reason &&
        reason !== "creator_or_owner_required",
    ),
  ];

  return {
    ...preview,
    blockedReasons,
    liveReady: false,
  };
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const starId = normalizeFanletterTikTokOAuthStarId(searchParams.get("starId"));

  if (!starId) {
    return jsonError("A valid AI Star id is required.", 400, {
      mode: "oauth_preview",
    });
  }

  const session = await readMemberServerSession();
  const serverPermission =
    await resolveFanletterAIStarSocialConnectServerPermission({
      memberEmail: session?.email,
      starId,
    });
  const preview = buildPreviewResponse({
    body: {
      canConnect: searchParams.get("canConnect"),
      creatorRole: searchParams.get("creatorRole"),
      locale: searchParams.get("locale"),
      oauthMode: searchParams.get("oauthMode"),
      returnTo: searchParams.get("returnTo"),
      source: searchParams.get("source"),
      starId,
    },
    canConnect: serverPermission.allowed,
    creatorRole: serverPermission.role,
    request,
  });

  if (!preview) {
    return jsonError("A valid AI Star id is required.", 400, {
      mode: "oauth_preview",
    });
  }

  const responseBody = {
    ...applyServerPermissionBlockedReason({ preview, serverPermission }),
    serverPermission,
    session: {
      email: session?.email ?? null,
      hasMemberSession: Boolean(session?.email),
      walletAddress: session?.walletAddress ?? null,
    },
  };

  if (responseBody.liveReady && responseBody.oauth.authorizeUrl) {
    return Response.redirect(responseBody.oauth.authorizeUrl, 303);
  }

  return Response.json(responseBody, {
    status: responseBody.permission.allowed ? 200 : 403,
  });
}

export async function POST(request: Request) {
  let body: TikTokOAuthStartRequestBody;

  try {
    body = (await request.json()) as TikTokOAuthStartRequestBody;
  } catch {
    return jsonError("Invalid TikTok OAuth preview request.", 400, {
      mode: "oauth_preview",
    });
  }

  const starId = normalizeFanletterTikTokOAuthStarId(body.starId);

  if (!starId) {
    return jsonError("A valid AI Star id is required.", 400, {
      mode: "oauth_preview",
    });
  }

  const session = await readMemberServerSession();
  const serverPermission =
    await resolveFanletterAIStarSocialConnectServerPermission({
      memberEmail: session?.email,
      starId,
    });
  const preview = buildPreviewResponse({
    body: {
      ...body,
      starId,
    },
    canConnect: serverPermission.allowed,
    creatorRole: serverPermission.role,
    request,
  });

  if (!preview) {
    return jsonError("A valid AI Star id is required.", 400, {
      mode: "oauth_preview",
    });
  }

  return Response.json(
    {
      ...applyServerPermissionBlockedReason({ preview, serverPermission }),
      serverPermission,
      session: {
        email: session?.email ?? null,
        hasMemberSession: Boolean(session?.email),
        walletAddress: session?.walletAddress ?? null,
      },
    },
    { status: preview.permission.allowed ? 200 : 403 },
  );
}
