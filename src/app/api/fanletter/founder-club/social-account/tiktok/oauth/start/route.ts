import {
  buildFanletterTikTokOAuthPreview,
  normalizeFanletterTikTokOAuthCanConnect,
  normalizeFanletterTikTokOAuthCreatorRole,
  normalizeFanletterTikTokOAuthLocale,
  normalizeFanletterTikTokOAuthSource,
  normalizeFanletterTikTokOAuthStarId,
} from "@/lib/fanletter-tiktok-oauth-preview";
import { readMemberServerSession } from "@/lib/member-server-session";

export const dynamic = "force-dynamic";

type TikTokOAuthStartRequestBody = {
  canConnect?: unknown;
  creatorRole?: unknown;
  locale?: unknown;
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
  request,
}: {
  body: TikTokOAuthStartRequestBody;
  request: Request;
}) {
  const starId = normalizeFanletterTikTokOAuthStarId(body.starId);

  if (!starId) {
    return null;
  }

  const locale = normalizeFanletterTikTokOAuthLocale(body.locale);

  return buildFanletterTikTokOAuthPreview({
    canConnect: normalizeFanletterTikTokOAuthCanConnect(body.canConnect),
    creatorRole: normalizeFanletterTikTokOAuthCreatorRole(body.creatorRole),
    locale,
    requestUrl: request.url,
    returnTo: readString(body.returnTo),
    source: normalizeFanletterTikTokOAuthSource(body.source),
    starId,
  });
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const preview = buildPreviewResponse({
    body: {
      canConnect: searchParams.get("canConnect"),
      creatorRole: searchParams.get("creatorRole"),
      locale: searchParams.get("locale"),
      returnTo: searchParams.get("returnTo"),
      source: searchParams.get("source"),
      starId: searchParams.get("starId"),
    },
    request,
  });

  if (!preview) {
    return jsonError("A valid AI Star id is required.", 400, {
      mode: "oauth_preview",
    });
  }

  const session = await readMemberServerSession();

  return Response.json(
    {
      ...preview,
      session: {
        email: session?.email ?? null,
        hasMemberSession: Boolean(session?.email),
        walletAddress: session?.walletAddress ?? null,
      },
    },
    { status: preview.permission.allowed ? 200 : 403 },
  );
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

  const preview = buildPreviewResponse({ body, request });

  if (!preview) {
    return jsonError("A valid AI Star id is required.", 400, {
      mode: "oauth_preview",
    });
  }

  const session = await readMemberServerSession();

  return Response.json(
    {
      ...preview,
      session: {
        email: session?.email ?? null,
        hasMemberSession: Boolean(session?.email),
        walletAddress: session?.walletAddress ?? null,
      },
    },
    { status: preview.permission.allowed ? 200 : 403 },
  );
}
