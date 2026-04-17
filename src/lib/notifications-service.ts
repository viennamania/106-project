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
  getAppPushSubscriptionsCollection,
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
import { isWebPushConfigured, sendWebPushNotification } from "@/lib/web-push";

const NOTIFICATION_PAGE_SIZE = 20;

function resolveLocale(input?: string | null): Locale {
  return input && hasLocale(input) ? input : defaultLocale;
}

function encodeNotificationCursor(notification: AppNotificationDocument) {
  return `${notification.createdAt.toISOString()}::${notification.notificationId}`;
}

function decodeNotificationCursor(cursor?: string | null) {
  if (!cursor) {
    return null;
  }

  const separatorIndex = cursor.indexOf("::");

  if (separatorIndex <= 0) {
    return null;
  }

  const createdAtValue = cursor.slice(0, separatorIndex);
  const notificationId = cursor.slice(separatorIndex + 2).trim();
  const createdAt = new Date(createdAtValue);

  if (!notificationId || Number.isNaN(createdAt.getTime())) {
    return null;
  }

  return {
    createdAt,
    notificationId,
  };
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

  const missingDefaults = {
    ...(typeof preferences.directMemberCompletedEnabled !== "boolean"
      ? {
          directMemberCompletedEnabled: defaults.directMemberCompletedEnabled,
        }
      : {}),
    ...(typeof preferences.networkMemberCompletedEnabled !== "boolean"
      ? {
          networkMemberCompletedEnabled: defaults.networkMemberCompletedEnabled,
        }
      : {}),
    ...(typeof preferences.networkLevelCompletedEnabled !== "boolean"
      ? {
          networkLevelCompletedEnabled: defaults.networkLevelCompletedEnabled,
        }
      : {}),
  };

  if (Object.keys(missingDefaults).length > 0) {
    const updatedAt = new Date();

    await collection.updateOne(
      { memberEmail: normalizedEmail },
      {
        $set: {
          ...missingDefaults,
          updatedAt,
        },
      },
    );

    return {
      ...preferences,
      ...missingDefaults,
      updatedAt,
    };
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
  sendPush = true,
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
  sendPush?: boolean;
}) {
  const collection = await getAppNotificationsCollection();
  const now = new Date();
  const notificationId = crypto.randomUUID();

  const result = await collection.updateOne(
    { eventKey },
    {
      $setOnInsert: {
        body,
        createdAt,
        eventKey,
        href,
        memberEmail,
        notificationId,
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

  if (sendPush && result.upsertedCount > 0) {
    await sendPushNotificationToMember({
      body,
      href,
      memberEmail,
      notificationId,
      title,
      type,
    });
  }
}

async function sendPushNotificationToMember({
  body,
  href,
  memberEmail,
  notificationId,
  title,
  type,
}: {
  body: string;
  href: string | null;
  memberEmail: string;
  notificationId: string;
  title: string;
  type: AppNotificationDocument["type"];
}) {
  if (!isWebPushConfigured()) {
    return;
  }

  const collection = await getAppPushSubscriptionsCollection();
  const normalizedEmail = normalizeEmail(memberEmail);
  const subscriptions = await collection.find({ memberEmail: normalizedEmail }).toArray();

  if (subscriptions.length === 0) {
    return;
  }

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await sendWebPushNotification(subscription, {
          body,
          href,
          notificationId,
          title,
          type,
        });
      } catch (error) {
        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          typeof error.statusCode === "number"
            ? error.statusCode
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await collection.deleteOne({ endpoint: subscription.endpoint });
          return;
        }

        console.error("Failed to deliver web push notification.", error);
      }
    }),
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
  return notifyDirectSponsorOfCompletedMemberWithOptions(member, {});
}

async function notifyDirectSponsorOfCompletedMemberWithOptions(
  member: MemberDocument,
  options: {
    ignorePreferences?: boolean;
    sendPush?: boolean;
  },
) {
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

  if (!options.ignorePreferences && !preferences.directMemberCompletedEnabled) {
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
    sendPush: options.sendPush,
  });
}

async function notifyPlacementAncestorsOfCompletedMember(member: MemberDocument) {
  return notifyPlacementAncestorsOfCompletedMemberWithOptions(member, {});
}

async function notifyPlacementAncestorsOfCompletedMemberWithOptions(
  member: MemberDocument,
  options: {
    ignorePreferences?: boolean;
    sendPush?: boolean;
  },
) {
  const collection = await getMembersCollection();
  const seenReferralCodes = new Set<string>();
  const directSponsorEmail = normalizeEmail(
    member.sponsorEmail ?? member.referredByEmail ?? "",
  );
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

    if (!recipient) {
      break;
    }

    if (directSponsorEmail && normalizeEmail(recipient.email) === directSponsorEmail) {
      currentReferralCode = recipient.placementReferralCode ?? null;
      continue;
    }

    const preferences = await getOrCreateNotificationPreferences(recipient.email);

    if (
      !options.ignorePreferences &&
      !preferences.networkMemberCompletedEnabled
    ) {
      currentReferralCode = recipient.placementReferralCode ?? null;
      continue;
    }

    const locale = resolveLocale(recipient.locale);
    const copy = getDictionary(locale).activateNetworkPage.notifications;
    const createdAt = member.registrationCompletedAt ?? new Date();

    await createNotification({
      body: formatTemplate(copy.messages.networkMemberCompletedBody, {
        email: member.email,
        level,
      }),
      createdAt,
      eventKey: `network_member_completed:${recipient.email}:${member.email}:${level}`,
      href: `/${locale}/activate/network?member=${encodeURIComponent(member.email)}`,
      memberEmail: recipient.email,
      targetLevel: level,
      targetMemberEmail: member.email,
      title: copy.messages.networkMemberCompletedTitle,
      type: "network_member_completed",
      sendPush: options.sendPush,
    });

    currentReferralCode = recipient.placementReferralCode ?? null;
  }
}

async function notifyCompletedLevelMilestones(member: MemberDocument) {
  return notifyCompletedLevelMilestonesWithOptions(member, {});
}

async function notifyCompletedLevelMilestonesWithOptions(
  member: MemberDocument,
  options: {
    ignorePreferences?: boolean;
    sendPush?: boolean;
  },
) {
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

    if (options.ignorePreferences || preferences.networkLevelCompletedEnabled) {
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
          sendPush: options.sendPush,
        });
      }
    }

    currentReferralCode = recipient.placementReferralCode ?? null;
  }
}

export async function emitCompletedMemberNotifications(member: MemberDocument) {
  return emitCompletedMemberNotificationsWithOptions(member, {
    sendPush: true,
  });
}

export async function emitCompletedMemberNotificationsWithOptions(
  member: MemberDocument,
  options: {
    ignorePreferences?: boolean;
    sendPush?: boolean;
  },
) {
  if (member.status !== "completed") {
    return;
  }

  await Promise.all([
    notifyDirectSponsorOfCompletedMemberWithOptions(member, options),
    notifyPlacementAncestorsOfCompletedMemberWithOptions(member, options),
    notifyCompletedLevelMilestonesWithOptions(member, options),
  ]);
}

export async function backfillAppNotifications(options?: {
  email?: string;
  limit?: number;
}) {
  const membersCollection = await getMembersCollection();
  const notificationsCollection = await getAppNotificationsCollection();
  const normalizedEmail =
    typeof options?.email === "string" ? normalizeEmail(options.email) : null;
  const limit =
    typeof options?.limit === "number" && Number.isFinite(options.limit)
      ? Math.max(1, Math.trunc(options.limit))
      : null;
  const filter = normalizedEmail
    ? { email: normalizedEmail, status: "completed" as const }
    : { status: "completed" as const };
  const beforeCount = await notificationsCollection.countDocuments();
  const cursor = membersCollection
    .find(filter)
    .sort({ registrationCompletedAt: 1, createdAt: 1, email: 1 });

  if (limit) {
    cursor.limit(limit);
  }

  const members = await cursor.toArray();

  for (const member of members) {
    await emitCompletedMemberNotificationsWithOptions(member, {
      ignorePreferences: true,
      sendPush: false,
    });
  }

  const afterCount = await notificationsCollection.countDocuments();

  return {
    createdCount: Math.max(0, afterCount - beforeCount),
    memberEmail: normalizedEmail,
    processedMembers: members.length,
    totalNotifications: afterCount,
  };
}

export async function upsertPushSubscription({
  endpoint,
  keys,
  locale,
  memberEmail,
  userAgent,
}: {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
  locale?: string | null;
  memberEmail: string;
  userAgent?: string | null;
}) {
  const collection = await getAppPushSubscriptionsCollection();
  const normalizedEmail = normalizeEmail(memberEmail);
  const now = new Date();

  await collection.updateOne(
    { endpoint },
    {
      $set: {
        keys,
        locale: locale?.trim() || null,
        memberEmail: normalizedEmail,
        updatedAt: now,
        userAgent: userAgent?.trim() || null,
      },
      $setOnInsert: {
        createdAt: now,
        endpoint,
      },
    },
    { upsert: true },
  );

  return {
    isConfigured: isWebPushConfigured(),
    isSubscribed: true,
  };
}

export async function removePushSubscription({
  endpoint,
  memberEmail,
}: {
  endpoint: string;
  memberEmail: string;
}) {
  const collection = await getAppPushSubscriptionsCollection();
  const normalizedEmail = normalizeEmail(memberEmail);

  await collection.deleteOne({
    endpoint,
    memberEmail: normalizedEmail,
  });

  return {
    isConfigured: isWebPushConfigured(),
    isSubscribed: false,
  };
}

export async function sendTestNotificationToMember(options: {
  body?: string;
  email: string;
  href?: string | null;
  title?: string;
}) {
  const normalizedEmail = normalizeEmail(options.email);
  const membersCollection = await getMembersCollection();
  const member = await membersCollection.findOne({
    email: normalizedEmail,
    status: "completed",
  });

  if (!member) {
    throw new Error("Completed member not found.");
  }

  const locale = resolveLocale(member.locale);
  const copy = getDictionary(locale).activateNetworkPage.notifications;
  const subscriptionsCollection = await getAppPushSubscriptionsCollection();
  const subscriptionCount = await subscriptionsCollection.countDocuments({
    memberEmail: normalizedEmail,
  });
  const title = options.title?.trim() || copy.push.title;
  const body =
    options.body?.trim() ||
    `${member.email} · ${copy.push.subscribed}`;
  const href =
    typeof options.href === "string" && options.href.trim()
      ? options.href.trim()
      : `/${locale}/activate`;

  await createNotification({
    body,
    createdAt: new Date(),
    eventKey: `test_push:${normalizedEmail}:${crypto.randomUUID()}`,
    href,
    memberEmail: normalizedEmail,
    targetMemberEmail: normalizedEmail,
    title,
    type: "direct_member_completed",
    sendPush: true,
  });

  return {
    isWebPushConfigured: isWebPushConfigured(),
    locale,
    memberEmail: normalizedEmail,
    subscriptionCount,
  };
}

export async function getNotificationCenterForMember(
  memberEmail: string,
  options?: {
    cursor?: string | null;
    pageSize?: number;
  },
): Promise<AppNotificationsResponse> {
  const normalizedEmail = normalizeEmail(memberEmail);
  const requestedPageSize = options?.pageSize;
  const pageSize =
    typeof requestedPageSize === "number" && Number.isFinite(requestedPageSize)
      ? Math.max(1, Math.min(Math.trunc(requestedPageSize), 50))
      : NOTIFICATION_PAGE_SIZE;
  const parsedCursor = decodeNotificationCursor(options?.cursor);
  const [collection, preferences] = await Promise.all([
    getAppNotificationsCollection(),
    getOrCreateNotificationPreferences(normalizedEmail),
  ]);
  const notificationFilter = parsedCursor
    ? {
        memberEmail: normalizedEmail,
        $or: [
          {
            createdAt: {
              $lt: parsedCursor.createdAt,
            },
          },
          {
            createdAt: parsedCursor.createdAt,
            notificationId: {
              $lt: parsedCursor.notificationId,
            },
          },
        ],
      }
    : { memberEmail: normalizedEmail };
  const [notifications, unreadCount] = await Promise.all([
    collection
      .find(notificationFilter)
      .sort({ createdAt: -1, notificationId: -1 })
      .limit(pageSize + 1)
      .toArray(),
    collection.countDocuments({
      memberEmail: normalizedEmail,
      readAt: null,
    }),
  ]);
  const hasMore = notifications.length > pageSize;
  const visibleNotifications = hasMore
    ? notifications.slice(0, pageSize)
    : notifications;
  const nextCursor =
    hasMore && visibleNotifications.length > 0
      ? encodeNotificationCursor(
          visibleNotifications[visibleNotifications.length - 1]!,
        )
      : null;

  return {
    hasMore,
    nextCursor,
    notifications: visibleNotifications.map(serializeAppNotification),
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
  networkMemberCompletedEnabled,
  networkLevelCompletedEnabled,
}: {
  directMemberCompletedEnabled?: boolean;
  memberEmail: string;
  networkMemberCompletedEnabled?: boolean;
  networkLevelCompletedEnabled?: boolean;
}) {
  const collection = await getAppNotificationPreferencesCollection();
  const normalizedEmail = normalizeEmail(memberEmail);
  const defaults =
    createDefaultAppNotificationPreferencesDocument(normalizedEmail);
  const insertDefaults = {
    createdAt: defaults.createdAt,
    memberEmail: defaults.memberEmail,
    ...(typeof directMemberCompletedEnabled !== "boolean"
      ? {
          directMemberCompletedEnabled: defaults.directMemberCompletedEnabled,
        }
      : {}),
    ...(typeof networkMemberCompletedEnabled !== "boolean"
      ? {
          networkMemberCompletedEnabled: defaults.networkMemberCompletedEnabled,
        }
      : {}),
    ...(typeof networkLevelCompletedEnabled !== "boolean"
      ? {
          networkLevelCompletedEnabled: defaults.networkLevelCompletedEnabled,
        }
      : {}),
  };

  await collection.updateOne(
    { memberEmail: normalizedEmail },
    {
      $setOnInsert: insertDefaults,
      $set: {
        ...(typeof directMemberCompletedEnabled === "boolean"
          ? { directMemberCompletedEnabled }
          : {}),
        ...(typeof networkMemberCompletedEnabled === "boolean"
          ? { networkMemberCompletedEnabled }
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
