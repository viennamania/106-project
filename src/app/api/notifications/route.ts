import {
  getNotificationCenterForMember,
  markAllNotificationsRead,
  markNotificationsRead,
  updateNotificationPreferences,
} from "@/lib/notifications-service";

type NotificationActionRequest =
  | {
      action: "mark_all_read";
      email: string;
    }
  | {
      action: "mark_read";
      email: string;
      notificationIds?: string[];
    }
  | {
      action: "update_preferences";
      directMemberCompletedEnabled?: boolean;
      email: string;
      networkLevelCompletedEnabled?: boolean;
    };

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawEmail = url.searchParams.get("email");

  if (!rawEmail) {
    return jsonError("email query parameter is required.", 400);
  }

  try {
    const response = await getNotificationCenterForMember(rawEmail);

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

  try {
    if (body.action === "mark_all_read") {
      return Response.json(await markAllNotificationsRead(body.email));
    }

    if (body.action === "mark_read") {
      return Response.json(
        await markNotificationsRead(body.email, body.notificationIds ?? []),
      );
    }

    if (body.action === "update_preferences") {
      return Response.json(
        await updateNotificationPreferences({
          directMemberCompletedEnabled: body.directMemberCompletedEnabled,
          memberEmail: body.email,
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
