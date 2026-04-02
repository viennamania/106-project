import { createHash, randomUUID } from "node:crypto";

import { completePendingMembersForWebhookEvent } from "@/lib/member-service";
import {
  getThirdwebWebhookEventsCollection,
  getThirdwebWebhookIngressLogsCollection,
} from "@/lib/mongodb";
import {
  extractTrackedTransferEvent,
  getThirdwebWebhookSecrets,
  verifyThirdwebWebhookSignature,
  type ThirdwebWebhookIngressLogDocument,
  type ThirdwebInsightEventWebhookPayload,
} from "@/lib/thirdweb-webhooks";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function parseWebhookPayload(payloadText: string) {
  try {
    return JSON.parse(payloadText) as ThirdwebInsightEventWebhookPayload;
  } catch {
    return null;
  }
}

async function createWebhookIngressLog({
  payload,
  projectWallet,
  request,
  requestId,
  signature,
  timestamp,
}: {
  payload: string;
  projectWallet: string | null;
  request: Request;
  requestId: string;
  signature: string | null;
  timestamp: string | null;
}) {
  try {
    const payloadJson = parseWebhookPayload(payload);
    const now = new Date();
    const collection = await getThirdwebWebhookIngressLogsCollection();
    const document: ThirdwebWebhookIngressLogDocument = {
      completedCount: null,
      errorMessage: null,
      ignoredCount: null,
      method: request.method,
      path: new URL(request.url).pathname,
      payloadBytes: Buffer.byteLength(payload),
      payloadEventCount: Array.isArray(payloadJson?.data)
        ? payloadJson.data.length
        : null,
      payloadSha256: createHash("sha256").update(payload).digest("hex"),
      payloadTopic: payloadJson?.topic ?? null,
      processingStatus: "pending",
      projectWallet,
      requestId,
      responseStatus: null,
      receivedAt: now,
      signaturePrefix: signature ? signature.slice(0, 12) : null,
      signaturePresent: Boolean(signature),
      storedCount: null,
      timestampHeader: timestamp,
      updatedAt: now,
      userAgent: request.headers.get("user-agent"),
      verificationStatus: "pending",
    };

    await collection.insertOne(document);
    return requestId;
  } catch {
    return null;
  }
}

async function updateWebhookIngressLog(
  requestId: string | null,
  update: Partial<ThirdwebWebhookIngressLogDocument>,
) {
  if (!requestId) {
    return;
  }

  try {
    const collection = await getThirdwebWebhookIngressLogsCollection();

    await collection.updateOne(
      { requestId },
      {
        $set: {
          ...update,
          updatedAt: new Date(),
        },
      },
    );
  } catch {
    // Ingress logging is best-effort and should never block webhook handling.
  }
}

export async function GET() {
  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-webhook-signature");
  const timestamp = request.headers.get("x-webhook-timestamp");
  const payloadText = await request.text();
  const requestId = await createWebhookIngressLog({
    payload: payloadText,
    projectWallet: process.env.PROJECT_WALLET?.trim() ?? null,
    request,
    requestId: randomUUID(),
    signature,
    timestamp,
  });

  if (!signature) {
    await updateWebhookIngressLog(requestId, {
      errorMessage: "Missing x-webhook-signature.",
      processingStatus: "ignored",
      responseStatus: 400,
      verificationStatus: "missing_signature",
    });
    return jsonError("Missing x-webhook-signature.", 400);
  }

  const secrets = getThirdwebWebhookSecrets();

  if (secrets.length === 0) {
    await updateWebhookIngressLog(requestId, {
      errorMessage: "THIRDWEB_WEBHOOK_SECRETS is not configured.",
      processingStatus: "processing_error",
      responseStatus: 500,
      verificationStatus: "config_error",
    });
    return jsonError("THIRDWEB_WEBHOOK_SECRETS is not configured.", 500);
  }

  const projectWallet = process.env.PROJECT_WALLET?.trim();

  if (!projectWallet) {
    await updateWebhookIngressLog(requestId, {
      errorMessage: "PROJECT_WALLET is not configured.",
      processingStatus: "processing_error",
      responseStatus: 500,
      verificationStatus: "config_error",
    });
    return jsonError("PROJECT_WALLET is not configured.", 500);
  }

  try {
    verifyThirdwebWebhookSignature({
      payload: payloadText,
      secrets,
      signature,
      timestamp,
    });
  } catch (error) {
    await updateWebhookIngressLog(requestId, {
      errorMessage:
        error instanceof Error ? error.message : "Invalid webhook signature.",
      processingStatus: "ignored",
      responseStatus: 401,
      verificationStatus: "invalid_signature",
    });
    return jsonError(
      error instanceof Error ? error.message : "Invalid webhook signature.",
      401,
    );
  }

  const payload = parseWebhookPayload(payloadText);

  if (!payload) {
    await updateWebhookIngressLog(requestId, {
      errorMessage: "Invalid JSON body.",
      processingStatus: "ignored",
      responseStatus: 400,
      verificationStatus: "invalid_json",
    });
    return jsonError("Invalid JSON body.", 400);
  }

  if (payload.topic !== "v1.events" || !Array.isArray(payload.data)) {
    await updateWebhookIngressLog(requestId, {
      completedCount: 0,
      errorMessage: null,
      ignoredCount: 0,
      processingStatus: "ignored",
      responseStatus: 200,
      storedCount: 0,
      verificationStatus: "verified",
    });
    return Response.json({
      completed: 0,
      ignored: 0,
      received: 0,
      stored: 0,
    });
  }

  try {
    const collection = await getThirdwebWebhookEventsCollection();
    let completed = 0;
    let ignored = 0;
    let stored = 0;

    for (const event of payload.data) {
      const trackedEvent = extractTrackedTransferEvent(event, projectWallet);

      if (!trackedEvent) {
        ignored += 1;
        continue;
      }

      await collection.updateOne(
        { webhookEventId: trackedEvent.webhookEventId },
        {
          $set: trackedEvent,
        },
        { upsert: true },
      );

      stored += 1;
      completed += await completePendingMembersForWebhookEvent(trackedEvent);
    }

    await updateWebhookIngressLog(requestId, {
      completedCount: completed,
      errorMessage: null,
      ignoredCount: ignored,
      processingStatus: "processed",
      responseStatus: 200,
      storedCount: stored,
      verificationStatus: "verified",
    });

    return Response.json({
      completed,
      ignored,
      received: payload.data.length,
      stored,
    });
  } catch (error) {
    await updateWebhookIngressLog(requestId, {
      errorMessage:
        error instanceof Error ? error.message : "Failed to store webhook events.",
      processingStatus: "processing_error",
      responseStatus: 500,
      verificationStatus: "verified",
    });
    return jsonError(
      error instanceof Error ? error.message : "Failed to store webhook events.",
      500,
    );
  }
}
