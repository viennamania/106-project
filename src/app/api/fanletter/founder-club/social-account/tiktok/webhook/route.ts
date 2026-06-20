import { createHmac, timingSafeEqual } from "node:crypto";

import { tryRecordFanletterAgentRankServerEvent } from "@/lib/agentrank/server-events";
import {
  tryGetFanletterAIStarStoredSocialAccount,
  tryGetFanletterAIStarStoredSocialAccountByProviderAccountId,
} from "@/lib/fanletter-ai-star-social-accounts";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";

export const dynamic = "force-dynamic";

type TikTokWebhookEventType =
  | "authorization.removed"
  | "post.publish.complete"
  | "post.publish.failed";

type TikTokWebhookPayload = {
  client_key?: unknown;
  content?: Record<string, unknown> | null;
  event?: unknown;
  event_type?: unknown;
  open_id?: unknown;
  post_id?: unknown;
  publish_id?: unknown;
  reason?: unknown;
  star_id?: unknown;
  starId?: unknown;
  type?: unknown;
  video_id?: unknown;
};

const supportedEvents = new Set<TikTokWebhookEventType>([
  "authorization.removed",
  "post.publish.complete",
  "post.publish.failed",
]);

function jsonError(message: string, status: number, extra?: object) {
  return Response.json({ error: message, ...(extra ?? {}) }, { status });
}

function readString(value: unknown, maxLength = 180) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

function normalizeEventType(payload: TikTokWebhookPayload) {
  const eventType = readString(payload.event_type ?? payload.event ?? payload.type);

  return eventType && supportedEvents.has(eventType as TikTokWebhookEventType)
    ? (eventType as TikTokWebhookEventType)
    : null;
}

function getSignatureHeader(headers: Headers) {
  return (
    headers.get("tiktok-signature") ??
    headers.get("x-tiktok-signature") ??
    headers.get("x-tt-signature")
  );
}

function parseTikTokSignatureHeader(value: string | null) {
  const parts = new Map<string, string>();

  for (const part of value?.split(",") ?? []) {
    const [key, ...rawValue] = part.split("=");
    const normalizedKey = key?.trim();
    const normalizedValue = rawValue.join("=").trim();

    if (normalizedKey && normalizedValue) {
      parts.set(normalizedKey, normalizedValue);
    }
  }

  return {
    signature: parts.get("s") ?? "",
    timestamp: parts.get("t") ?? "",
  };
}

function secureCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length > 0 &&
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function readWebhookSecrets() {
  return [
    process.env.TIKTOK_WEBHOOK_SECRET,
    process.env.TIKTOK_CLIENT_SECRET,
    process.env.TIKTOK_SANDBOX_WEBHOOK_SECRET,
    process.env.TIKTOK_SANDBOX_CLIENT_SECRET,
  ]
    .flatMap((value) => value?.split(",") ?? [])
    .map((value) => value.trim())
    .filter((value, index, values) => value && values.indexOf(value) === index);
}

function verifyTikTokWebhookSignature({
  rawBody,
  request,
}: {
  rawBody: string;
  request: Request;
}) {
  const secrets = readWebhookSecrets();
  const dryRun =
    new URL(request.url).searchParams.get("dryRun") === "1" &&
    request.headers.get("x-fanletter-webhook-preview") === "true";

  if (!secrets.length) {
    return {
      ok: dryRun,
      reason: dryRun
        ? "dry_run_without_secret"
        : "tiktok_webhook_secret_missing",
    };
  }

  const { signature: providedSignature, timestamp } =
    parseTikTokSignatureHeader(getSignatureHeader(request.headers));

  if (!providedSignature || !timestamp) {
    return {
      ok: false,
      reason: "tiktok_signature_header_invalid",
    };
  }

  const signedPayload = `${timestamp}.${rawBody}`;

  return {
    ok: secrets.some((secret) => {
      const digest = createHmac("sha256", secret).update(signedPayload).digest();
      const expectedSignatures = [
        digest.toString("hex"),
        digest.toString("base64"),
        digest.toString("base64url"),
      ];

      return expectedSignatures.some((expectedSignature) =>
        secureCompare(providedSignature, expectedSignature),
      );
    }),
    reason: "signature_mismatch",
  };
}

async function resolveWebhookSocialAccount(payload: TikTokWebhookPayload) {
  const starId = normalizeFanletterStarId(
    readString(payload.starId ?? payload.star_id, 128),
  );

  if (starId) {
    return tryGetFanletterAIStarStoredSocialAccount({
      platform: "tiktok",
      starId,
    });
  }

  const openId = readString(payload.open_id, 256);

  return openId
    ? tryGetFanletterAIStarStoredSocialAccountByProviderAccountId({
        platform: "tiktok",
        providerAccountId: openId,
      })
    : null;
}

function getWebhookEventConfig(eventType: TikTokWebhookEventType) {
  if (eventType === "authorization.removed") {
    return {
      eventName: "fanletter_creator_social_disconnected" as const,
      reputationEventType: "creator_social_disconnected" as const,
      status: "disconnected",
    };
  }

  if (eventType === "post.publish.complete") {
    return {
      eventName: "fanletter_tiktok_content_published" as const,
      reputationEventType: "content_published" as const,
      status: "published",
    };
  }

  return {
    eventName: "fanletter_tiktok_content_publish_failed" as const,
    reputationEventType: "content_publish_failed" as const,
    status: "failed",
  };
}

function getWebhookContentId(payload: TikTokWebhookPayload) {
  const content = payload.content ?? {};

  return (
    readString(payload.video_id, 160) ??
    readString(payload.post_id, 160) ??
    readString(payload.publish_id, 160) ??
    readString(content.video_id, 160) ??
    readString(content.post_id, 160) ??
    readString(content.publish_id, 160)
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verification = verifyTikTokWebhookSignature({ rawBody, request });

  if (!verification.ok) {
    console.info("[fanletter:tiktok:webhook] signature verification failed", {
      contentType: request.headers.get("content-type"),
      hasSignature: Boolean(getSignatureHeader(request.headers)),
      reason: verification.reason,
      requestUrl: request.url,
      userAgent: request.headers.get("user-agent"),
    });

    return jsonError("Invalid TikTok webhook signature.", 401, {
      reason: verification.reason,
    });
  }

  let payload: TikTokWebhookPayload;

  try {
    payload = JSON.parse(rawBody) as TikTokWebhookPayload;
  } catch {
    return jsonError("Invalid TikTok webhook JSON.", 400);
  }

  const eventType = normalizeEventType(payload);

  if (!eventType) {
    return Response.json({
      error: "Unsupported TikTok webhook event.",
      ignored: true,
    });
  }

  const account = await resolveWebhookSocialAccount(payload);

  if (!account) {
    return Response.json({
      error: "Connected AI Star TikTok account was not found.",
      eventType,
      ignored: true,
      reason: "social_account_not_found",
    });
  }

  const config = getWebhookEventConfig(eventType);
  const contentId = getWebhookContentId(payload);
  const path = `/ko/fanletter/${encodeURIComponent(account.starId)}#tiktok-channel`;

  const eventId = await tryRecordFanletterAgentRankServerEvent({
    agentRank: {
      eventType: config.reputationEventType,
      intent: `tiktok_webhook_${eventType.replaceAll(".", "_")}`,
      source: "fanletter_content",
      starId: account.starId,
    },
    contentId,
    eventName: config.eventName,
    memberEmail: null,
    memberWalletAddress: null,
    metadata: {
      actorMemberId: account.connectedByMemberId,
      actorMemberName: account.connectedByMemberName,
      actorType: "creator_member",
      contentId,
      creatorRoleAtConnection: account.creatorRoleAtConnection,
      handle: account.handle,
      mockOnly: false,
      page: "fanletter_tiktok_webhook",
      platform: "tiktok",
      profileUrl: account.profileUrl,
      providerEventType: eventType,
      providerOpenId: readString(payload.open_id, 256),
      providerReason: readString(payload.reason, 240),
      socialConnectionStatus: config.status,
      starId: account.starId,
      targetType: "ai_star",
      webhookVerified: verification.reason !== "dry_run_without_secret",
    },
    path,
    targetHref: account.profileUrl,
    userAgent: request.headers.get("user-agent"),
  });

  return Response.json({
    agentRank: {
      eventId,
      eventType: config.reputationEventType,
      source: "fanletter_content",
      starId: account.starId,
    },
    ok: true,
    platform: "tiktok",
    providerEventType: eventType,
  });
}
