import type { CreatorProfileRecord } from "@/lib/content";
import type { MemberRecord } from "@/lib/member";

export type FanletterCharacterReadinessIssue =
  | "avatar_set"
  | "character_memory"
  | "world_location";

export type FanletterReadinessResponse = {
  character: {
    avatarImageUrl: string | null;
    healthScore: number;
    issues: FanletterCharacterReadinessIssue[];
    name: string | null;
    quality: {
      avatarSetCount: number;
      avatarSetReady: boolean;
      memoryCount: number;
      timelineCount: number;
      worldLocationLabel: string | null;
      worldLocationReady: boolean;
    };
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
