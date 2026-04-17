import "server-only";

import {
  serializeMemberAnnouncement,
  type MemberAnnouncementsResponse,
  type MemberAnnouncementRecipientPreview,
  type MemberAnnouncementRecipientSummary,
} from "@/lib/announcements";
import { normalizeEmail } from "@/lib/member";
import {
  getMemberAnnouncementsCollection,
  getMembersCollection,
} from "@/lib/mongodb";
import { createAppNotification } from "@/lib/notifications-service";
import { normalizeAddress } from "@/lib/thirdweb-webhooks";

const ANNOUNCEMENT_HISTORY_LIMIT = 20;
const ANNOUNCEMENT_PREVIEW_LIMIT = 8;
const MAX_ANNOUNCEMENT_TITLE_LENGTH = 80;
const MAX_ANNOUNCEMENT_BODY_LENGTH = 500;

function createDirectRecipientFilter(senderEmail: string) {
  return {
    email: { $ne: senderEmail },
    $or: [{ sponsorEmail: senderEmail }, { referredByEmail: senderEmail }],
  };
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
): Promise<MemberAnnouncementRecipientSummary> {
  const collection = await getMembersCollection();
  const filter = createDirectRecipientFilter(senderEmail);
  const [totalCount, completedCount, pendingCount, preview] =
    await Promise.all([
      collection.countDocuments(filter),
      collection.countDocuments({ ...filter, status: "completed" }),
      collection.countDocuments({ ...filter, status: "pending_payment" }),
      collection
        .find(filter)
        .project<Pick<MemberAnnouncementRecipientPreview, "email" | "status">>({
          email: 1,
          status: 1,
        })
        .sort({ registrationCompletedAt: -1, createdAt: -1, email: 1 })
        .limit(ANNOUNCEMENT_PREVIEW_LIMIT)
        .toArray(),
    ]);

  return {
    completedCount,
    pendingCount,
    preview,
    totalCount,
  };
}

export async function getAnnouncementCenterForMember(
  memberEmail: string,
): Promise<MemberAnnouncementsResponse> {
  const normalizedEmail = normalizeEmail(memberEmail);
  const [historyCollection, recipients] = await Promise.all([
    getMemberAnnouncementsCollection(),
    getDirectAnnouncementRecipientSummary(normalizedEmail),
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
  walletAddress,
  title,
}: {
  body: string;
  href?: string | null;
  memberEmail: string;
  walletAddress: string | null;
  title: string;
}) {
  const normalizedEmail = normalizeEmail(memberEmail);
  const normalizedTitle = sanitizeAnnouncementTitle(title);
  const normalizedBody = sanitizeAnnouncementBody(body);
  const normalizedHref = sanitizeAnnouncementHref(href);
  const membersCollection = await getMembersCollection();
  const recipients = await membersCollection
    .find(createDirectRecipientFilter(normalizedEmail))
    .project<Pick<MemberAnnouncementRecipientPreview, "email" | "status">>({
      email: 1,
      status: 1,
    })
    .toArray();

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

  return getAnnouncementCenterForMember(normalizedEmail);
}
