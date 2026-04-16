import {
  getNotificationCenterForMember,
  markAllNotificationsRead,
  markNotificationsRead,
  updateNotificationPreferences,
} from "@/lib/notifications-service";
import { normalizeEmail } from "@/lib/member";
import { getMembersCollection } from "@/lib/mongodb";
import { normalizeAddress } from "@/lib/thirdweb-webhooks";

type NotificationActionRequest =
  | {
      action: "mark_all_read";
      email: string;
      walletAddress: string;
    }
  | {
      action: "mark_read";
      email: string;
      notificationIds?: string[];
      walletAddress: string;
    }
  | {
      action: "update_preferences";
      directMemberCompletedEnabled?: boolean;
      email: string;
      networkMemberCompletedEnabled?: boolean;
      networkLevelCompletedEnabled?: boolean;
      walletAddress: string;
    };

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function validateNotificationOwner({
  email,
  walletAddress,
}: {
  email: string;
  walletAddress: string;
}) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedWalletAddress = normalizeAddress(walletAddress);
  const collection = await getMembersCollection();
  const member = await collection.findOne({ email: normalizedEmail });

  if (!member) {
    return {
      error: jsonError("Member not found.", 404),
      member: null,
      normalizedEmail,
    };
  }

  if (member.status !== "completed") {
    return {
      error: jsonError("Member signup is not complete.", 403),
      member: null,
      normalizedEmail,
    };
  }

  const knownWallets = new Set(
    [member.lastWalletAddress, ...member.walletAddresses]
      .filter(Boolean)
      .map((address) => normalizeAddress(address)),
  );

  if (!knownWallets.has(normalizedWalletAddress)) {
    return {
      error: jsonError("This wallet is not authorized for the requested member.", 403),
      member: null,
      normalizedEmail,
    };
  }

  return {
    error: null,
    member,
    normalizedEmail,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email");
  const rawWalletAddress = url.searchParams.get("walletAddress");
  const cursor = url.searchParams.get("cursor");
  const rawPageSize = url.searchParams.get("pageSize");

  if (!rawEmail) {
    return jsonError("email query parameter is required.", 400);
  }

  if (!rawWalletAddress) {
    return jsonError("walletAddress query parameter is required.", 400);
  }

  try {
    const authorization = await validateNotificationOwner({
      email: rawEmail,
      walletAddress: rawWalletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const response = await getNotificationCenterForMember(
      authorization.normalizedEmail,
      {
        cursor,
        pageSize: rawPageSize ? Number.parseInt(rawPageSize, 10) : undefined,
      },
    );

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load notifications.";

    return jsonError(message, 500);
  }
}

export async function POST(request: Request) {
  let body: NotificationActionRequest | null = null;

  try {
    body = (await request.json()) as NotificationActionRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.email) {
    return jsonError("email is required.", 400);
  }

  if (!body.walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  try {
    const authorization = await validateNotificationOwner({
      email: body.email,
      walletAddress: body.walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    if (body.action === "mark_all_read") {
      return Response.json(
        await markAllNotificationsRead(authorization.normalizedEmail),
      );
    }

    if (body.action === "mark_read") {
      return Response.json(
        await markNotificationsRead(
          authorization.normalizedEmail,
          body.notificationIds ?? [],
        ),
      );
    }

    if (body.action === "update_preferences") {
      return Response.json(
        await updateNotificationPreferences({
          directMemberCompletedEnabled: body.directMemberCompletedEnabled,
          memberEmail: authorization.normalizedEmail,
          networkMemberCompletedEnabled: body.networkMemberCompletedEnabled,
          networkLevelCompletedEnabled: body.networkLevelCompletedEnabled,
        }),
      );
    }

    return jsonError("Unsupported notification action.", 400);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update notifications.";

    return jsonError(message, 500);
  }
}
