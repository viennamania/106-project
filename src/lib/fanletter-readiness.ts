import type { CreatorProfileRecord } from "@/lib/content";
import type { MemberRecord } from "@/lib/member";

export type FanletterReadinessResponse = {
  character: {
    avatarImageUrl: string | null;
    name: string | null;
    ready: boolean;
  };
  fanRequests: {
    pendingCount: number;
  };
  member: MemberRecord;
  profile: CreatorProfileRecord;
  profileConfigured: boolean;
  vlogs: {
    allCount: number;
    archivedCount: number;
    draftCount: number;
    publishedCount: number;
    totalCount: number;
  };
};
