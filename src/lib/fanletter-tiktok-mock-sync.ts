import "server-only";

import type { FanletterTikTokApiCapability } from "@/mock/fanletter-tiktok-api-capabilities";
import type { FanletterAIStarSocialAccount } from "@/mock/fanletter-social-accounts";

export type FanletterTikTokMockSyncVideo = {
  comments: number;
  contentId: string;
  likes: number;
  shares: number;
  title: string;
  videoUrl: string;
  views: number;
};

export type FanletterTikTokMockSyncSnapshot = {
  capabilityId: FanletterTikTokApiCapability["id"];
  endpoint: string;
  eventType: "content_engaged";
  mockOnly: true;
  platform: "tiktok";
  profileUrl: string;
  syncedAt: string;
  totals: {
    comments: number;
    likes: number;
    shares: number;
    videos: number;
    views: number;
  };
  videos: FanletterTikTokMockSyncVideo[];
};

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function metric(seed: number, min: number, max: number) {
  const range = max - min + 1;

  return min + (seed % range);
}

function buildMockVideo({
  account,
  index,
  seed,
  starName,
}: {
  account: FanletterAIStarSocialAccount;
  index: number;
  seed: number;
  starName: string;
}): FanletterTikTokMockSyncVideo {
  const videoSeed = seed + index * 997;
  const title =
    index === 0
      ? `${starName} 오늘의 브이로그`
      : index === 1
        ? `${starName} Creator behind`
        : `${starName} Founder community`;
  const views = metric(videoSeed, 8200, 68000);
  const likes = metric(Math.floor(videoSeed / 3), 420, 7800);
  const comments = metric(Math.floor(videoSeed / 7), 24, 680);
  const shares = metric(Math.floor(videoSeed / 11), 18, 420);

  return {
    comments,
    contentId: `tiktok:${account.starId}:${index + 1}`,
    likes,
    shares,
    title,
    videoUrl: `${account.profileUrl}/video/mock-${account.starId}-${index + 1}`,
    views,
  };
}

export function buildFanletterTikTokMockSyncSnapshot({
  account,
  capability,
  starName,
}: {
  account: FanletterAIStarSocialAccount;
  capability: FanletterTikTokApiCapability;
  starName: string;
}): FanletterTikTokMockSyncSnapshot {
  const seed = hashString(`${account.starId}:${account.handle}:${capability.id}`);
  const videoCount = capability.id === "profile_sync" ? 1 : 3;
  const videos = Array.from({ length: videoCount }, (_, index) =>
    buildMockVideo({ account, index, seed, starName }),
  );
  const totals = videos.reduce(
    (acc, video) => ({
      comments: acc.comments + video.comments,
      likes: acc.likes + video.likes,
      shares: acc.shares + video.shares,
      videos: acc.videos + 1,
      views: acc.views + video.views,
    }),
    { comments: 0, likes: 0, shares: 0, videos: 0, views: 0 },
  );

  return {
    capabilityId: capability.id,
    endpoint: capability.endpoint,
    eventType: "content_engaged",
    mockOnly: true,
    platform: "tiktok",
    profileUrl: account.profileUrl,
    syncedAt: new Date().toISOString(),
    totals,
    videos,
  };
}
