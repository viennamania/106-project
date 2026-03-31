import { getThirdwebWebhookEventsCollection } from "@/lib/mongodb";
import {
  extractTrackedTransferEvent,
  getThirdwebWebhookSecrets,
  verifyThirdwebWebhookSignature,
  type ThirdwebInsightEventWebhookPayload,
} from "@/lib/thirdweb-webhooks";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET() {
  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  const signature = request.headers.get("x-webhook-signature");
  const timestamp = request.headers.get("x-webhook-timestamp");

  if (!signature || !timestamp) {
    return jsonError("Missing x-webhook-signature or x-webhook-timestamp.", 400);
  }

  const secrets = getThirdwebWebhookSecrets();

  if (secrets.length === 0) {
    return jsonError("THIRDWEB_WEBHOOK_SECRETS is not configured.", 500);
  }

  const projectWallet = process.env.PROJECT_WALLET?.trim();

  if (!projectWallet) {
    return jsonError("PROJECT_WALLET is not configured.", 500);
  }

  const payloadText = await request.text();

  try {
    verifyThirdwebWebhookSignature({
      payload: payloadText,
      secrets,
      signature,
      timestamp,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Invalid webhook signature.",
      401,
    );
  }

  let payload: ThirdwebInsightEventWebhookPayload;

  try {
    payload = JSON.parse(payloadText) as ThirdwebInsightEventWebhookPayload;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (payload.topic !== "v1.events" || !Array.isArray(payload.data)) {
    return Response.json({
      ignored: 0,
      received: 0,
      stored: 0,
    });
  }

  try {
    const collection = await getThirdwebWebhookEventsCollection();
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
    }

    return Response.json({
      ignored,
      received: payload.data.length,
      stored,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to store webhook events.",
      500,
    );
  }
}
