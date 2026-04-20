import {
  getAnnouncementCenterForMember,
  sendAnnouncement,
} from "@/lib/announcements-service";
import {
  isMemberAnnouncementRecipientFilter,
  isMemberAnnouncementRecipientScope,
  type MemberAnnouncementRecipientFilter,
  type MemberAnnouncementRecipientScope,
} from "@/lib/announcements";
import { validateNotificationOwner } from "@/lib/notification-owner";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

type SendAnnouncementRequest = {
  body: string;
  email: string;
  href?: string | null;
  locale?: string | null;
  recipientFilter?: MemberAnnouncementRecipientFilter;
  recipientScope?: MemberAnnouncementRecipientScope;
  title: string;
  walletAddress: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const rawRecipientFilter = url.searchParams.get("recipientFilter");
  const rawRecipientScope = url.searchParams.get("recipientScope");
  const walletAddress = url.searchParams.get("walletAddress");

  if (!email) {
    return jsonError("email query parameter is required.", 400);
  }

  if (!walletAddress) {
    return jsonError("walletAddress query parameter is required.", 400);
  }

  if (
    rawRecipientFilter &&
    !isMemberAnnouncementRecipientFilter(rawRecipientFilter)
  ) {
    return jsonError("recipientFilter query parameter is invalid.", 400);
  }

  if (
    rawRecipientScope &&
    !isMemberAnnouncementRecipientScope(rawRecipientScope)
  ) {
    return jsonError("recipientScope query parameter is invalid.", 400);
  }

  const recipientFilter: MemberAnnouncementRecipientFilter =
    rawRecipientFilter && isMemberAnnouncementRecipientFilter(rawRecipientFilter)
      ? rawRecipientFilter
      : "all";
  const recipientScope: MemberAnnouncementRecipientScope =
    rawRecipientScope && isMemberAnnouncementRecipientScope(rawRecipientScope)
      ? rawRecipientScope
      : "level_1";

  try {
    const authorization = await validateNotificationOwner({
      email,
      walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    return Response.json(
      await getAnnouncementCenterForMember(
        authorization.normalizedEmail,
        recipientScope,
        recipientFilter,
      ),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load announcements.";

    return jsonError(message, 500);
  }
}

export async function POST(request: Request) {
  let body: SendAnnouncementRequest | null = null;

  try {
    body = (await request.json()) as SendAnnouncementRequest;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!body?.email) {
    return jsonError("email is required.", 400);
  }

  if (!body.walletAddress) {
    return jsonError("walletAddress is required.", 400);
  }

  if (
    body.recipientFilter &&
    !isMemberAnnouncementRecipientFilter(body.recipientFilter)
  ) {
    return jsonError("recipientFilter is invalid.", 400);
  }

  if (
    body.recipientScope &&
    !isMemberAnnouncementRecipientScope(body.recipientScope)
  ) {
    return jsonError("recipientScope is invalid.", 400);
  }

  try {
    const authorization = await validateNotificationOwner({
      email: body.email,
      walletAddress: body.walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    return Response.json(
      await sendAnnouncement({
        body: body.body,
        href: body.href,
        locale: body.locale,
        memberEmail: authorization.normalizedEmail,
        recipientFilter: body.recipientFilter ?? "all",
        recipientScope: body.recipientScope ?? "level_1",
        title: body.title,
        walletAddress: body.walletAddress,
      }),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send announcement.";

    return jsonError(message, 500);
  }
}
