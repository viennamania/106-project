import "server-only";

import {
  REFERRAL_TREE_DEPTH_LIMIT,
  normalizeEmail,
  type MemberDocument,
  type MemberStatus,
} from "@/lib/member";
import {
  serializeMemberAnnouncement,
  type MemberAnnouncementRecipientFilter,
  type MemberAnnouncementRecipientPreview,
  type MemberAnnouncementRecipientScope,
  type MemberAnnouncementsResponse,
  type MemberAnnouncementRecipientSummary,
} from "@/lib/announcements";
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

type AnnouncementRecipientCandidate = {
  createdAt: Date;
  email: string;
  referralCode: string | null;
  registrationCompletedAt: Date | null;
  status: MemberStatus;
};

type AnnouncementRecipient = MemberAnnouncementRecipientPreview;

function projectAnnouncementRecipientCandidate(
  member: Pick<
    MemberDocument,
    "createdAt" | "email" | "referralCode" | "registrationCompletedAt" | "status"
  >,
): AnnouncementRecipientCandidate {
  return {
    createdAt: member.createdAt,
    email: member.email,
    referralCode: member.referralCode ?? null,
    registrationCompletedAt: member.registrationCompletedAt ?? null,
    status: member.status,
  };
}

function compareAnnouncementRecipients(
  left: AnnouncementRecipientCandidate,
  right: AnnouncementRecipientCandidate,
) {
  const leftCompletedAt = left.registrationCompletedAt?.getTime() ?? 0;
  const rightCompletedAt = right.registrationCompletedAt?.getTime() ?? 0;

  if (rightCompletedAt !== leftCompletedAt) {
    return rightCompletedAt - leftCompletedAt;
  }

  const leftCreatedAt = left.createdAt.getTime();
  const rightCreatedAt = right.createdAt.getTime();

  if (rightCreatedAt !== leftCreatedAt) {
    return rightCreatedAt - leftCreatedAt;
  }

  return left.email.localeCompare(right.email);
}

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

async function loadSenderMember(senderEmail: string) {
  const collection = await getMembersCollection();
  return collection.findOne({ email: senderEmail });
}

async function getDirectAnnouncementRecipientCandidates(
  senderEmail: string,
) {
  const collection = await getMembersCollection();
  const rows = await collection
    .find(createDirectRecipientFilter(senderEmail))
    .project<AnnouncementRecipientCandidate>({
      createdAt: 1,
      email: 1,
      referralCode: 1,
      registrationCompletedAt: 1,
      status: 1,
    })
    .toArray();

  return rows.sort(compareAnnouncementRecipients);
}

async function getPlacementAnnouncementRecipientCandidates(
  senderEmail: string,
  senderReferralCode: string,
  recipientScope: Extract<MemberAnnouncementRecipientScope, "level_1" | "downline">,
) {
  const collection = await getMembersCollection();
  const visitedEmails = new Set<string>([senderEmail]);
  const visitedReferralCodes = new Set<string>([senderReferralCode]);
  const collectedMembers: AnnouncementRecipientCandidate[] = [];
  let currentParentCodes = [senderReferralCode];

  for (
    let depth = 1;
    depth <= REFERRAL_TREE_DEPTH_LIMIT && currentParentCodes.length > 0;
    depth += 1
  ) {
    const levelMembers = await collection
      .find({
        email: { $ne: senderEmail },
        placementReferralCode: { $in: currentParentCodes },
      })
      .project<AnnouncementRecipientCandidate>({
        createdAt: 1,
        email: 1,
        referralCode: 1,
        registrationCompletedAt: 1,
        status: 1,
      })
      .toArray();

    if (levelMembers.length === 0) {
      break;
    }

    const nextParentCodes: string[] = [];

    for (const levelMember of levelMembers) {
      const normalizedRecipientEmail = normalizeEmail(levelMember.email);

      if (!visitedEmails.has(normalizedRecipientEmail)) {
        visitedEmails.add(normalizedRecipientEmail);
        collectedMembers.push(levelMember);
      }

      if (
        recipientScope === "downline" &&
        levelMember.referralCode &&
        !visitedReferralCodes.has(levelMember.referralCode)
      ) {
        visitedReferralCodes.add(levelMember.referralCode);
        nextParentCodes.push(levelMember.referralCode);
      }
    }

    if (recipientScope === "level_1") {
      break;
    }

    currentParentCodes = nextParentCodes;
  }

  return collectedMembers.sort(compareAnnouncementRecipients);
}

async function getAnnouncementRecipientsForScope(
  senderEmail: string,
  recipientScope: MemberAnnouncementRecipientScope,
) {
  const candidates =
    recipientScope === "direct"
      ? await getDirectAnnouncementRecipientCandidates(senderEmail)
      : await (async () => {
          const sender = await loadSenderMember(senderEmail);

          if (!sender?.referralCode) {
            return [];
          }

          return getPlacementAnnouncementRecipientCandidates(
            senderEmail,
            sender.referralCode,
            recipientScope,
          );
        })();
  const pushSubscribedEmails = await getPushSubscribedMemberEmails(
    candidates.map((recipient) => recipient.email),
  );

  return candidates.map((recipient) => ({
    email: recipient.email,
    pushSubscribed: pushSubscribedEmails.has(recipient.email),
    status: recipient.status,
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

async function getAnnouncementRecipientSummary(
  senderEmail: string,
  recipientScope: MemberAnnouncementRecipientScope,
  recipientFilter: MemberAnnouncementRecipientFilter,
): Promise<MemberAnnouncementRecipientSummary> {
  const filteredRecipients = applyRecipientFilter(
    await getAnnouncementRecipientsForScope(senderEmail, recipientScope),
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
  recipientScope: MemberAnnouncementRecipientScope = "level_1",
  recipientFilter: MemberAnnouncementRecipientFilter = "all",
): Promise<MemberAnnouncementsResponse> {
  const normalizedEmail = normalizeEmail(memberEmail);
  const [historyCollection, recipients] = await Promise.all([
    getMemberAnnouncementsCollection(),
    getAnnouncementRecipientSummary(
      normalizedEmail,
      recipientScope,
      recipientFilter,
    ),
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

export async function sendAnnouncement({
  body,
  href,
  memberEmail,
  recipientFilter = "all",
  recipientScope = "level_1",
  walletAddress,
  title,
}: {
  body: string;
  href?: string | null;
  memberEmail: string;
  recipientFilter?: MemberAnnouncementRecipientFilter;
  recipientScope?: MemberAnnouncementRecipientScope;
  walletAddress: string | null;
  title: string;
}) {
  const normalizedEmail = normalizeEmail(memberEmail);
  const normalizedTitle = sanitizeAnnouncementTitle(title);
  const normalizedBody = sanitizeAnnouncementBody(body);
  const normalizedHref = sanitizeAnnouncementHref(href);
  const recipients = applyRecipientFilter(
    await getAnnouncementRecipientsForScope(normalizedEmail, recipientScope),
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
    recipientScope,
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

  return getAnnouncementCenterForMember(
    normalizedEmail,
    recipientScope,
    recipientFilter,
  );
}
