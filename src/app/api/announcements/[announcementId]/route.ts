import { getAnnouncementDetailForMember } from "@/lib/announcements-service";
import { validateNotificationOwner } from "@/lib/notification-owner";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ announcementId: string }> },
) {
  const { announcementId } = await context.params;
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const walletAddress = url.searchParams.get("walletAddress");

  if (!announcementId) {
    return jsonError("announcementId is required.", 400);
  }

  if (!email) {
    return jsonError("email query parameter is required.", 400);
  }

  if (!walletAddress) {
    return jsonError("walletAddress query parameter is required.", 400);
  }

  try {
    const authorization = await validateNotificationOwner({
      allowedStatuses: ["completed", "pending_payment"],
      email,
      walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    return Response.json(
      await getAnnouncementDetailForMember({
        announcementId,
        memberEmail: authorization.normalizedEmail,
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load announcement.";
    const status = message === "Announcement not found." ? 404 : 500;

    return jsonError(message, status);
  }
}
