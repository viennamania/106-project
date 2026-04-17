import {
  removePushSubscription,
  upsertPushSubscription,
} from "@/lib/notifications-service";
import { validateNotificationOwner } from "@/lib/notification-owner";
import type { AppPushSubscriptionStatusResponse } from "@/lib/notifications";

type PushSubscriptionCreateRequest = {
  email: string;
  locale?: string;
  subscription?: {
    endpoint?: string;
    keys?: {
      auth?: string;
      p256dh?: string;
    };
  };
  walletAddress: string;
};

type PushSubscriptionDeleteRequest = {
  email: string;
  endpoint?: string;
  walletAddress: string;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function jsonResponse(body: AppPushSubscriptionStatusResponse) {
  return Response.json(body);
}

export async function POST(request: Request) {
  let body: PushSubscriptionCreateRequest | null = null;

  try {
    body = (await request.json()) as PushSubscriptionCreateRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.email) {
    return jsonError("email is required.", 400);
  }

  if (!body.walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  const endpoint = body.subscription?.endpoint?.trim() ?? "";
  const auth = body.subscription?.keys?.auth?.trim() ?? "";
  const p256dh = body.subscription?.keys?.p256dh?.trim() ?? "";

  if (!endpoint || !auth || !p256dh) {
    return jsonError("Valid subscription endpoint and keys are required.", 400);
  }

  try {
    const authorization = await validateNotificationOwner({
      allowedStatuses: ["completed", "pending_payment"],
      email: body.email,
      walletAddress: body.walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    return jsonResponse(
      await upsertPushSubscription({
        endpoint,
        keys: {
          auth,
          p256dh,
        },
        locale: body.locale?.trim() ?? null,
        memberEmail: authorization.normalizedEmail,
        userAgent: request.headers.get("user-agent"),
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to save the push subscription.";

    return jsonError(message, 500);
  }
}

export async function DELETE(request: Request) {
  let body: PushSubscriptionDeleteRequest | null = null;

  try {
    body = (await request.json()) as PushSubscriptionDeleteRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.email) {
    return jsonError("email is required.", 400);
  }

  if (!body.walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  const endpoint = body.endpoint?.trim() ?? "";

  if (!endpoint) {
    return jsonError("endpoint is required.", 400);
  }

  try {
    const authorization = await validateNotificationOwner({
      allowedStatuses: ["completed", "pending_payment"],
      email: body.email,
      walletAddress: body.walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    return jsonResponse(
      await removePushSubscription({
        endpoint,
        memberEmail: authorization.normalizedEmail,
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to remove the push subscription.";

    return jsonError(message, 500);
  }
}
