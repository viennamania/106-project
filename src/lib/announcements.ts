import type { MemberStatus } from "@/lib/member";

export const memberAnnouncementRecipientScopes = [
  "direct",
  "level_1",
  "downline",
] as const;

export type MemberAnnouncementRecipientScope =
  (typeof memberAnnouncementRecipientScopes)[number];

export const memberAnnouncementRecipientFilters = [
  "all",
  "completed",
  "push_ready",
] as const;

export type MemberAnnouncementRecipientFilter =
  (typeof memberAnnouncementRecipientFilters)[number];

export type MemberAnnouncementRecipientPreview = {
  email: string;
  pushSubscribed: boolean;
  status: MemberStatus;
};

export type MemberAnnouncementRecipientSummary = {
  completedCount: number;
  pendingCount: number;
  pushSubscribedCount: number;
  preview: MemberAnnouncementRecipientPreview[];
  totalCount: number;
};

export type MemberAnnouncementDocument = {
  actionHref?: string | null;
  announcementId: string;
  body: string;
  completedRecipientCount: number;
  createdAt: Date;
  href: string | null;
  pendingRecipientCount: number;
  recipientFilter?: MemberAnnouncementRecipientFilter;
  recipientScope?: MemberAnnouncementRecipientScope;
  recipientCount: number;
  recipientPreview: MemberAnnouncementRecipientPreview[];
  senderEmail: string;
  senderWalletAddress: string | null;
  title: string;
  updatedAt: Date;
};

export type MemberAnnouncementRecord = {
  actionHref: string | null;
  announcementId: string;
  body: string;
  completedRecipientCount: number;
  createdAt: string;
  href: string | null;
  pendingRecipientCount: number;
  recipientFilter: MemberAnnouncementRecipientFilter;
  recipientScope: MemberAnnouncementRecipientScope;
  recipientCount: number;
  recipientPreview: MemberAnnouncementRecipientPreview[];
  senderEmail: string;
  title: string;
};

export type MemberAnnouncementDetailRecord = {
  actionHref: string | null;
  announcementId: string;
  body: string;
  createdAt: string;
  href: string | null;
  senderEmail: string;
  title: string;
};

export type MemberAnnouncementsResponse = {
  history: MemberAnnouncementRecord[];
  recipients: MemberAnnouncementRecipientSummary;
};

export type MemberAnnouncementDetailResponse = {
  announcement: MemberAnnouncementDetailRecord;
};

export function isMemberAnnouncementRecipientFilter(
  value: string,
): value is MemberAnnouncementRecipientFilter {
  return memberAnnouncementRecipientFilters.includes(
    value as MemberAnnouncementRecipientFilter,
  );
}

export function isMemberAnnouncementRecipientScope(
  value: string,
): value is MemberAnnouncementRecipientScope {
  return memberAnnouncementRecipientScopes.includes(
    value as MemberAnnouncementRecipientScope,
  );
}

export function serializeMemberAnnouncement(
  announcement: MemberAnnouncementDocument,
): MemberAnnouncementRecord {
  return {
    actionHref: announcement.actionHref ?? null,
    announcementId: announcement.announcementId,
    body: announcement.body,
    completedRecipientCount: announcement.completedRecipientCount,
    createdAt: announcement.createdAt.toISOString(),
    href: announcement.href ?? null,
    pendingRecipientCount: announcement.pendingRecipientCount,
    recipientFilter: announcement.recipientFilter ?? "all",
    recipientScope: announcement.recipientScope ?? "direct",
    recipientCount: announcement.recipientCount,
    recipientPreview: announcement.recipientPreview.map((recipient) => ({
      ...recipient,
      pushSubscribed: Boolean(recipient.pushSubscribed),
    })),
    senderEmail: announcement.senderEmail,
    title: announcement.title,
  };
}

export function serializeMemberAnnouncementDetail(
  announcement: MemberAnnouncementDocument,
): MemberAnnouncementDetailRecord {
  return {
    actionHref: announcement.actionHref ?? null,
    announcementId: announcement.announcementId,
    body: announcement.body,
    createdAt: announcement.createdAt.toISOString(),
    href: announcement.href ?? null,
    senderEmail: announcement.senderEmail,
    title: announcement.title,
  };
}
