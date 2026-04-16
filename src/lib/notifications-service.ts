import "server-only";

import {
  defaultLocale,
  getDictionary,
  hasLocale,
  type Locale,
} from "@/lib/i18n";
import {
  getAppNotificationPreferencesCollection,
  getAppNotificationsCollection,
  getMembersCollection,
} from "@/lib/mongodb";
import {
  normalizeEmail,
  REFERRAL_SIGNUP_LIMIT,
  REFERRAL_TREE_DEPTH_LIMIT,
  type MemberDocument,
} from "@/lib/member";
import {
  createDefaultAppNotificationPreferencesDocument,
  serializeAppNotification,
  serializeAppNotificationPreferences,
  type AppNotificationDocument,
  type AppNotificationPreferencesDocument,
  type AppNotificationsResponse,
} from "@/lib/notifications";

function resolveLocale(input?: string | null): Locale {
  return input && hasLocale(input) ? input : defaultLocale;
}

function formatTemplate(
  template: string,
  replacements: Record<string, string | number>,
) {
  return Object.entries(replacements).reduce((message, [key, value]) => {
    return message.replaceAll(`{${key}}`, String(value));
  }, template);
}

async function getOrCreateNotificationPreferences(
  memberEmail: string,
): Promise<AppNotificationPreferencesDocument> {
  const collection = await getAppNotificationPreferencesCollection();
  const normalizedEmail = normalizeEmail(memberEmail);
  const defaults =
    createDefaultAppNotificationPreferencesDocument(normalizedEmail);

  await collection.updateOne(
    { memberEmail: normalizedEmail },
    {
      $setOnInsert: defaults,
    },
    { upsert: true },
  );

  const preferences = await collection.findOne({ memberEmail: normalizedEmail });

  if (!preferences) {
    throw new Error("Notification preferences could not be loaded.");
  }

  return preferences;
}

async function createNotification({
  body,
  createdAt,
  eventKey,
  href,
  memberEmail,
  targetLevel = null,
  targetMemberEmail = null,
  title,
  type,
}: {
  body: string;
  createdAt: Date;
  eventKey: string;
  href: string | null;
  memberEmail: string;
  targetLevel?: number | null;
  targetMemberEmail?: string | null;
  title: string;
  type: AppNotificationDocument["type"];
}) {
  const collection = await getAppNotificationsCollection();
  const now = new Date();

  await collection.updateOne(
    { eventKey },
    {
      $setOnInsert: {
        body,
        createdAt,
        eventKey,
        href,
        memberEmail,
        notificationId: crypto.randomUUID(),
        readAt: null,
        targetLevel,
        targetMemberEmail,
        title,
        type,
        updatedAt: now,
      } satisfies AppNotificationDocument,
    },
    { upsert: true },
  );
}

async function countCompletedMembersAtDepth({
  depth,
  ownerReferralCode,
}: {
  depth: number;
  ownerReferralCode: string;
}) {
  if (!ownerReferralCode || depth <= 0) {
    return 0;
  }

  const collection = await getMembersCollection();
  let currentParentCodes = [ownerReferralCode];

  for (let currentDepth = 1; currentDepth <= depth; currentDepth += 1) {
    if (currentParentCodes.length === 0) {
      return 0;
    }

    const levelMembers = await collection
      .find({
        placementReferralCode: { $in: currentParentCodes },
        status: "completed",
      })
      .project<{ referralCode?: string | null }>({
        referralCode: 1,
      })
      .toArray();

    if (currentDepth === depth) {
      return levelMembers.length;
    }

    currentParentCodes = levelMembers
      .map((member) => member.referralCode ?? null)
      .filter((referralCode): referralCode is string => Boolean(referralCode));
  }

  return 0;
}

async function notifyDirectSponsorOfCompletedMember(member: MemberDocument) {
  const rawSponsorEmail = member.sponsorEmail ?? member.referredByEmail ?? null;

  if (!rawSponsorEmail) {
    return;
  }

  const sponsorEmail = normalizeEmail(rawSponsorEmail);
  const defaultSponsorEmail = process.env.DEFAULT_SIGNUP_SPONSOR_EMAIL
    ? normalizeEmail(process.env.DEFAULT_SIGNUP_SPONSOR_EMAIL)
    : null;

  if (defaultSponsorEmail && sponsorEmail === defaultSponsorEmail) {
    return;
  }

  const collection = await getMembersCollection();
  const sponsor = await collection.findOne({
    email: sponsorEmail,
    status: "completed",
  });

  if (!sponsor) {
    return;
  }

  const preferences = await getOrCreateNotificationPreferences(sponsor.email);

  if (!preferences.directMemberCompletedEnabled) {
    return;
  }

  const locale = resolveLocale(sponsor.locale);
  const copy = getDictionary(locale).activateNetworkPage.notifications;
  const createdAt = member.registrationCompletedAt ?? new Date();

  await createNotification({
    body: formatTemplate(copy.messages.directMemberCompletedBody, {
      email: member.email,
    }),
    createdAt,
    eventKey: `direct_member_completed:${sponsor.email}:${member.email}`,
    href: `/${locale}/activate/network?member=${encodeURIComponent(member.email)}`,
    memberEmail: sponsor.email,
    targetMemberEmail: member.email,
    title: copy.messages.directMemberCompletedTitle,
    type: "direct_member_completed",
  });
}

async function notifyCompletedLevelMilestones(member: MemberDocument) {
  const collection = await getMembersCollection();
  const seenReferralCodes = new Set<string>();
  let currentReferralCode = member.placementReferralCode ?? null;

  for (
    let level = 1;
    level <= REFERRAL_TREE_DEPTH_LIMIT && currentReferralCode;
    level += 1
  ) {
    if (seenReferralCodes.has(currentReferralCode)) {
      break;
    }

    seenReferralCodes.add(currentReferralCode);

    const recipient = await collection.findOne({
      referralCode: currentReferralCode,
      status: "completed",
    });

    if (!recipient || !recipient.referralCode) {
      break;
    }

    const preferences = await getOrCreateNotificationPreferences(recipient.email);

    if (preferences.networkLevelCompletedEnabled) {
      const targetCount = REFERRAL_SIGNUP_LIMIT ** level;
      const currentCount = await countCompletedMembersAtDepth({
        depth: level,
        ownerReferralCode: recipient.referralCode,
      });

      if (currentCount >= targetCount) {
        const locale = resolveLocale(recipient.locale);
        const copy = getDictionary(locale).activateNetworkPage.notifications;

        await createNotification({
          body: formatTemplate(copy.messages.networkLevelCompletedBody, {
            count: currentCount,
            level,
            target: targetCount,
          }),
          createdAt: member.registrationCompletedAt ?? new Date(),
          eventKey: `network_level_completed:${recipient.email}:${level}`,
          href: `/${locale}/activate/network`,
          memberEmail: recipient.email,
          targetLevel: level,
          title: copy.messages.networkLevelCompletedTitle,
          type: "network_level_completed",
        });
      }
    }

    currentReferralCode = recipient.placementReferralCode ?? null;
  }
}

export async function emitCompletedMemberNotifications(member: MemberDocument) {
  if (member.status !== "completed") {
    return;
  }

  await Promise.all([
    notifyDirectSponsorOfCompletedMember(member),
    notifyCompletedLevelMilestones(member),
  ]);
}

export async function getNotificationCenterForMember(
  memberEmail: string,
): Promise<AppNotificationsResponse> {
  const normalizedEmail = normalizeEmail(memberEmail);
  const [collection, preferences] = await Promise.all([
    getAppNotificationsCollection(),
    getOrCreateNotificationPreferences(normalizedEmail),
  ]);
  const [notifications, unreadCount] = await Promise.all([
    collection
      .find({ memberEmail: normalizedEmail })
      .sort({ createdAt: -1, notificationId: -1 })
      .limit(20)
      .toArray(),
    collection.countDocuments({
      memberEmail: normalizedEmail,
      readAt: null,
    }),
  ]);

  return {
    notifications: notifications.map(serializeAppNotification),
    preferences: serializeAppNotificationPreferences(preferences),
    unreadCount,
  };
}

export async function markAllNotificationsRead(memberEmail: string) {
  const collection = await getAppNotificationsCollection();
  const normalizedEmail = normalizeEmail(memberEmail);

  await collection.updateMany(
    {
      memberEmail: normalizedEmail,
      readAt: null,
    },
    {
      $set: {
        readAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  return getNotificationCenterForMember(normalizedEmail);
}

export async function markNotificationsRead(
  memberEmail: string,
  notificationIds: string[],
) {
  const collection = await getAppNotificationsCollection();
  const normalizedEmail = normalizeEmail(memberEmail);
  const sanitizedIds = [...new Set(notificationIds.map((id) => id.trim()).filter(Boolean))];

  if (sanitizedIds.length === 0) {
    return getNotificationCenterForMember(normalizedEmail);
  }

  await collection.updateMany(
    {
      memberEmail: normalizedEmail,
      notificationId: { $in: sanitizedIds },
      readAt: null,
    },
    {
      $set: {
        readAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  return getNotificationCenterForMember(normalizedEmail);
}

export async function updateNotificationPreferences({
  directMemberCompletedEnabled,
  memberEmail,
  networkLevelCompletedEnabled,
}: {
  directMemberCompletedEnabled?: boolean;
  memberEmail: string;
  networkLevelCompletedEnabled?: boolean;
}) {
  const collection = await getAppNotificationPreferencesCollection();
  const normalizedEmail = normalizeEmail(memberEmail);
  const defaults =
    createDefaultAppNotificationPreferencesDocument(normalizedEmail);

  await collection.updateOne(
    { memberEmail: normalizedEmail },
    {
      $setOnInsert: defaults,
      $set: {
        ...(typeof directMemberCompletedEnabled === "boolean"
          ? { directMemberCompletedEnabled }
          : {}),
        ...(typeof networkLevelCompletedEnabled === "boolean"
          ? { networkLevelCompletedEnabled }
          : {}),
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );

  return getNotificationCenterForMember(normalizedEmail);
}
