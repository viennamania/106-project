import "server-only";

import {
  serializeMemberAnnouncement,
  type MemberAnnouncementRecipientFilter,
  type MemberAnnouncementsResponse,
  type MemberAnnouncementRecipientPreview,
  type MemberAnnouncementRecipientSummary,
} from "@/lib/announcements";
import { normalizeEmail } from "@/lib/member";
import {
  getAppPushSubscriptionsCollection,
  getMemberAnnouncementsCollection,
  getMembersCollection,
} from "@/lib/mongodb";
import { createAppNotification } from "@/lib/notifications-service";
import { normalizeAddress } from "@/lib/thirdweb-webhooks";

const ANNOUNCEMENT_HISTORY_LIMIT = 20;
const ANNOUNCEMENT_PREVIEW_LIMIT = 8;
const MAX_ANNOUNCEMENT_TITLE_LENGTH = 80;
const MAX_ANNOUNCEMENT_BODY_LENGTH = 500;

type AnnouncementRecipient = MemberAnnouncementRecipientPreview;

async function getPushSubscribedMemberEmails(recipientEmails: string[]) {
  if (recipientEmails.length === 0) {
    return new Set<string>();
  }

  const collection = await getAppPushSubscriptionsCollection();
  const rows = await collection
    .aggregate<{ _id: string }>([
      {
        $match: {
          memberEmail: { $in: recipientEmails },
        },
      },
      {
        $group: {
          _id: "$memberEmail",
        },
      },
    ])
    .toArray();

  return new Set(rows.map((row) => row._id));
}

function createDirectRecipientFilter(senderEmail: string) {
  return {
    email: { $ne: senderEmail },
    $or: [{ sponsorEmail: senderEmail }, { referredByEmail: senderEmail }],
  };
}

function applyRecipientFilter(
  recipients: AnnouncementRecipient[],
  recipientFilter: MemberAnnouncementRecipientFilter,
) {
  if (recipientFilter === "completed") {
    return recipients.filter((recipient) => recipient.status === "completed");
  }

  if (recipientFilter === "push_ready") {
    return recipients.filter((recipient) => recipient.pushSubscribed);
  }

  return recipients;
}

async function getDirectAnnouncementRecipients(
  senderEmail: string,
): Promise<AnnouncementRecipient[]> {
  const collection = await getMembersCollection();
  const recipients = await collection
    .find(createDirectRecipientFilter(senderEmail))
    .project<Pick<MemberAnnouncementRecipientPreview, "email" | "status">>({
      email: 1,
      status: 1,
    })
    .sort({ registrationCompletedAt: -1, createdAt: -1, email: 1 })
    .toArray();
  const pushSubscribedEmails = await getPushSubscribedMemberEmails(
    recipients.map((recipient) => recipient.email),
  );

  return recipients.map((recipient) => ({
    ...recipient,
    pushSubscribed: pushSubscribedEmails.has(recipient.email),
  }));
}

function sanitizeAnnouncementTitle(title: string) {
  const normalized = title.trim();

  if (!normalized) {
    throw new Error("Announcement title is required.");
  }

  if (normalized.length > MAX_ANNOUNCEMENT_TITLE_LENGTH) {
    throw new Error(
      `Announcement title must be ${MAX_ANNOUNCEMENT_TITLE_LENGTH} characters or fewer.`,
    );
  }

  return normalized;
}

function sanitizeAnnouncementBody(body: string) {
  const normalized = body.trim();

  if (!normalized) {
    throw new Error("Announcement body is required.");
  }

  if (normalized.length > MAX_ANNOUNCEMENT_BODY_LENGTH) {
    throw new Error(
      `Announcement body must be ${MAX_ANNOUNCEMENT_BODY_LENGTH} characters or fewer.`,
    );
  }

  return normalized;
}

function sanitizeAnnouncementHref(href?: string | null) {
  const normalized = href?.trim() ?? "";

  if (!normalized) {
    return null;
  }

  if (!normalized.startsWith("/")) {
    throw new Error("Announcement link must be an internal path that starts with '/'.");
  }

  return normalized;
}

async function getDirectAnnouncementRecipientSummary(
  senderEmail: string,
  recipientFilter: MemberAnnouncementRecipientFilter,
): Promise<MemberAnnouncementRecipientSummary> {
  const filteredRecipients = applyRecipientFilter(
    await getDirectAnnouncementRecipients(senderEmail),
    recipientFilter,
  );
  const preview = filteredRecipients.slice(0, ANNOUNCEMENT_PREVIEW_LIMIT);
  const completedCount = filteredRecipients.filter((recipient) => {
    return recipient.status === "completed";
  }).length;
  const pendingCount = filteredRecipients.filter((recipient) => {
    return recipient.status === "pending_payment";
  }).length;

  return {
    completedCount,
    pendingCount,
    preview,
    pushSubscribedCount: filteredRecipients.filter((recipient) => {
      return recipient.pushSubscribed;
    }).length,
    totalCount: filteredRecipients.length,
  };
}

export async function getAnnouncementCenterForMember(
  memberEmail: string,
  recipientFilter: MemberAnnouncementRecipientFilter = "all",
): Promise<MemberAnnouncementsResponse> {
  const normalizedEmail = normalizeEmail(memberEmail);
  const [historyCollection, recipients] = await Promise.all([
    getMemberAnnouncementsCollection(),
    getDirectAnnouncementRecipientSummary(normalizedEmail, recipientFilter),
  ]);
  const history = await historyCollection
    .find({ senderEmail: normalizedEmail })
    .sort({ createdAt: -1, announcementId: -1 })
    .limit(ANNOUNCEMENT_HISTORY_LIMIT)
    .toArray();

  return {
    history: history.map(serializeMemberAnnouncement),
    recipients,
  };
}

export async function sendAnnouncementToDirectMembers({
  body,
  href,
  memberEmail,
  recipientFilter = "all",
  walletAddress,
  title,
}: {
  body: string;
  href?: string | null;
  memberEmail: string;
  recipientFilter?: MemberAnnouncementRecipientFilter;
  walletAddress: string | null;
  title: string;
}) {
  const normalizedEmail = normalizeEmail(memberEmail);
  const normalizedTitle = sanitizeAnnouncementTitle(title);
  const normalizedBody = sanitizeAnnouncementBody(body);
  const normalizedHref = sanitizeAnnouncementHref(href);
  const recipients = applyRecipientFilter(
    await getDirectAnnouncementRecipients(normalizedEmail),
    recipientFilter,
  );

  if (recipients.length === 0) {
    throw new Error("There are no members available to receive this announcement.");
  }

  const announcementId = crypto.randomUUID();
  const createdAt = new Date();
  const recipientPreview = recipients.slice(0, ANNOUNCEMENT_PREVIEW_LIMIT);
  const completedRecipientCount = recipients.filter((recipient) => {
    return recipient.status === "completed";
  }).length;
  const pendingRecipientCount = recipients.length - completedRecipientCount;
  const historyCollection = await getMemberAnnouncementsCollection();

  await historyCollection.insertOne({
    announcementId,
    body: normalizedBody,
    completedRecipientCount,
    createdAt,
    href: normalizedHref,
    pendingRecipientCount,
    recipientFilter,
    recipientCount: recipients.length,
    recipientPreview,
    senderEmail: normalizedEmail,
    senderWalletAddress: walletAddress ? normalizeAddress(walletAddress) : null,
    title: normalizedTitle,
    updatedAt: createdAt,
  });

  await Promise.allSettled(
    recipients.map(async (recipient) => {
      await createAppNotification({
        body: normalizedBody,
        createdAt,
        eventKey: `member_announcement:${announcementId}:${recipient.email}`,
        href: normalizedHref,
        memberEmail: recipient.email,
        title: normalizedTitle,
        type: "member_announcement",
      });
    }),
  );

  return getAnnouncementCenterForMember(normalizedEmail, recipientFilter);
}
