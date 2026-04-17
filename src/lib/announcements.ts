import type { MemberStatus } from "@/lib/member";

export type MemberAnnouncementRecipientPreview = {
  email: string;
  status: MemberStatus;
};

export type MemberAnnouncementRecipientSummary = {
  completedCount: number;
  pendingCount: number;
  preview: MemberAnnouncementRecipientPreview[];
  totalCount: number;
};

export type MemberAnnouncementDocument = {
  announcementId: string;
  body: string;
  completedRecipientCount: number;
  createdAt: Date;
  href: string | null;
  pendingRecipientCount: number;
  recipientCount: number;
  recipientPreview: MemberAnnouncementRecipientPreview[];
  senderEmail: string;
  senderWalletAddress: string | null;
  title: string;
  updatedAt: Date;
};

export type MemberAnnouncementRecord = {
  announcementId: string;
  body: string;
  completedRecipientCount: number;
  createdAt: string;
  href: string | null;
  pendingRecipientCount: number;
  recipientCount: number;
  recipientPreview: MemberAnnouncementRecipientPreview[];
  senderEmail: string;
  title: string;
};

export type MemberAnnouncementsResponse = {
  history: MemberAnnouncementRecord[];
  recipients: MemberAnnouncementRecipientSummary;
};

export function serializeMemberAnnouncement(
  announcement: MemberAnnouncementDocument,
): MemberAnnouncementRecord {
  return {
    announcementId: announcement.announcementId,
    body: announcement.body,
    completedRecipientCount: announcement.completedRecipientCount,
    createdAt: announcement.createdAt.toISOString(),
    href: announcement.href ?? null,
    pendingRecipientCount: announcement.pendingRecipientCount,
    recipientCount: announcement.recipientCount,
    recipientPreview: announcement.recipientPreview,
    senderEmail: announcement.senderEmail,
    title: announcement.title,
  };
}
