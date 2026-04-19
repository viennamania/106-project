export const appNotificationTypes = [
  "direct_member_completed",
  "member_announcement",
  "network_content_published",
  "network_member_completed",
  "network_level_completed",
] as const;

export type AppNotificationType = (typeof appNotificationTypes)[number];

export type AppNotificationDocument = {
  body: string;
  createdAt: Date;
  eventKey: string;
  href: string | null;
  memberEmail: string;
  notificationId: string;
  readAt?: Date | null;
  targetLevel?: number | null;
  targetMemberEmail?: string | null;
  title: string;
  type: AppNotificationType;
  updatedAt: Date;
};

export type AppNotificationRecord = {
  body: string;
  createdAt: string;
  href: string | null;
  isRead: boolean;
  memberEmail: string;
  notificationId: string;
  readAt: string | null;
  targetLevel: number | null;
  targetMemberEmail: string | null;
  title: string;
  type: AppNotificationType;
};

export type AppNotificationPreferencesDocument = {
  createdAt: Date;
  directMemberCompletedEnabled: boolean;
  memberEmail: string;
  networkContentPublishedEnabled: boolean;
  networkMemberCompletedEnabled: boolean;
  networkLevelCompletedEnabled: boolean;
  updatedAt: Date;
};

export type AppNotificationPreferencesRecord = {
  directMemberCompletedEnabled: boolean;
  memberEmail: string;
  networkContentPublishedEnabled: boolean;
  networkMemberCompletedEnabled: boolean;
  networkLevelCompletedEnabled: boolean;
  updatedAt: string;
};

export type AppPushSubscriptionDocument = {
  createdAt: Date;
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
  locale: string | null;
  memberEmail: string;
  updatedAt: Date;
  userAgent: string | null;
};

export type AppPushSubscriptionStatusResponse = {
  isConfigured: boolean;
  isSubscribed: boolean;
};

export type AppNotificationsResponse = {
  hasMore: boolean;
  nextCursor: string | null;
  notifications: AppNotificationRecord[];
  preferences: AppNotificationPreferencesRecord;
  unreadCount: number;
};

export function createDefaultAppNotificationPreferencesDocument(
  memberEmail: string,
): AppNotificationPreferencesDocument {
  const now = new Date();

  return {
    createdAt: now,
    directMemberCompletedEnabled: true,
    memberEmail,
    networkContentPublishedEnabled: true,
    networkMemberCompletedEnabled: true,
    networkLevelCompletedEnabled: true,
    updatedAt: now,
  };
}

export function serializeAppNotification(
  notification: AppNotificationDocument,
): AppNotificationRecord {
  return {
    body: notification.body,
    createdAt: notification.createdAt.toISOString(),
    href: notification.href ?? null,
    isRead: Boolean(notification.readAt),
    memberEmail: notification.memberEmail,
    notificationId: notification.notificationId,
    readAt: notification.readAt?.toISOString() ?? null,
    targetLevel: notification.targetLevel ?? null,
    targetMemberEmail: notification.targetMemberEmail ?? null,
    title: notification.title,
    type: notification.type,
  };
}

export function serializeAppNotificationPreferences(
  preferences: AppNotificationPreferencesDocument,
): AppNotificationPreferencesRecord {
  return {
    directMemberCompletedEnabled: preferences.directMemberCompletedEnabled,
    memberEmail: preferences.memberEmail,
    networkContentPublishedEnabled: preferences.networkContentPublishedEnabled,
    networkMemberCompletedEnabled: preferences.networkMemberCompletedEnabled,
    networkLevelCompletedEnabled: preferences.networkLevelCompletedEnabled,
    updatedAt: preferences.updatedAt.toISOString(),
  };
}
