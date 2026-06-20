import type { AgentRankInteractionEventType } from "@/lib/agentrank/interaction-events";

export type FanletterTikTokApiCapabilityStatus =
  | "app_review_required"
  | "connected_ready"
  | "scope_required";

export type FanletterTikTokApiCapability = {
  agentRankEventType: AgentRankInteractionEventType;
  endpoint: string;
  id:
    | "content_publish"
    | "performance_sync"
    | "profile_sync"
    | "video_library";
  requiredScopes: string[];
  status: FanletterTikTokApiCapabilityStatus;
};

export const fanletterTikTokApiCapabilities = [
  {
    agentRankEventType: "creator_social_connected",
    endpoint: "/v2/user/info/",
    id: "profile_sync",
    requiredScopes: ["user.info.basic"],
    status: "connected_ready",
  },
  {
    agentRankEventType: "content_engaged",
    endpoint: "/v2/video/list/",
    id: "video_library",
    requiredScopes: ["video.list"],
    status: "scope_required",
  },
  {
    agentRankEventType: "content_engaged",
    endpoint: "/v2/video/query/",
    id: "performance_sync",
    requiredScopes: ["video.list"],
    status: "scope_required",
  },
  {
    agentRankEventType: "content_engaged",
    endpoint: "/v2/post/publish/*",
    id: "content_publish",
    requiredScopes: ["video.upload", "video.publish"],
    status: "app_review_required",
  },
] as const satisfies FanletterTikTokApiCapability[];

