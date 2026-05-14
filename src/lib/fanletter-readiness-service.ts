import "server-only";

import {
  getCreatorProfileSnapshotForCompletedMember,
} from "@/lib/content-service";
import type { FanletterReadinessResponse } from "@/lib/fanletter-readiness";
import { type MemberDocument, serializeMember } from "@/lib/member";
import {
  getContentPostsCollection,
  getFanletterFanRequestsCollection,
} from "@/lib/mongodb";
import type { FanletterCharacterReadinessIssue } from "@/lib/fanletter-readiness";

type StatusCount = {
  _id: string;
  count: number;
};

function buildVlogSummary(counts: StatusCount[]) {
  const summary = {
    allCount: 0,
    archivedCount: 0,
    draftCount: 0,
    publishedCount: 0,
    totalCount: 0,
  };

  for (const item of counts) {
    if (item._id === "archived") {
      summary.archivedCount = item.count;
    } else if (item._id === "draft") {
      summary.draftCount = item.count;
    } else if (item._id === "published") {
      summary.publishedCount = item.count;
    }

    summary.allCount += item.count;
  }

  summary.totalCount = summary.draftCount + summary.publishedCount;

  return summary;
}

export async function getFanletterReadinessForMember(
  member: MemberDocument,
): Promise<FanletterReadinessResponse> {
  const [profileSnapshot, vlogStatusCounts, pendingFanRequestCount] =
    await Promise.all([
      getCreatorProfileSnapshotForCompletedMember(member),
      (async () => {
        const postsCollection = await getContentPostsCollection();

        return postsCollection
          .aggregate<StatusCount>([
            {
              $match: {
                authorEmail: member.email,
                "contentVideoUrls.0": { $exists: true },
              },
            },
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ])
          .toArray();
      })(),
      (async () => {
        const requestsCollection = await getFanletterFanRequestsCollection();

        return requestsCollection.countDocuments({
          creatorEmail: member.email,
          status: { $in: ["new", "reviewed"] },
        });
      })(),
    ]);
  const persona = profileSnapshot.profile.characterPersona;
  const avatarSetCount = profileSnapshot.profile.avatarImageSet.filter(
    (candidate) => Boolean(candidate.url?.trim()),
  ).length;
  const worldLocation =
    persona?.realismProfile?.worldLocation?.label?.trim() || null;
  const memoryCount = profileSnapshot.profile.characterMemory.length;
  const timelineCount = profileSnapshot.profile.characterTimeline.length;
  const characterIssues: FanletterCharacterReadinessIssue[] = [];
  const characterReady = Boolean(
    profileSnapshot.profile.displayName.trim() &&
      persona &&
      profileSnapshot.profile.avatarImageUrl,
  );

  if (characterReady && avatarSetCount < 4) {
    characterIssues.push("avatar_set");
  }

  if (characterReady && !worldLocation) {
    characterIssues.push("world_location");
  }

  if (characterReady && memoryCount + timelineCount === 0) {
    characterIssues.push("character_memory");
  }

  return {
    character: {
      avatarImageUrl: profileSnapshot.profile.avatarImageUrl,
      healthScore: characterReady
        ? Math.max(0, 100 - characterIssues.length * 18)
        : 0,
      issues: characterIssues,
      name: persona?.name ?? profileSnapshot.profile.displayName ?? null,
      quality: {
        avatarSetCount,
        avatarSetReady: avatarSetCount >= 4,
        memoryCount,
        timelineCount,
        worldLocationLabel: worldLocation,
        worldLocationReady: Boolean(worldLocation),
      },
      ready: characterReady,
    },
    fanRequests: {
      pendingCount: pendingFanRequestCount,
    },
    member: serializeMember(member),
    profile: profileSnapshot.profile,
    profileConfigured: profileSnapshot.profileConfigured,
    vlogs: buildVlogSummary(vlogStatusCounts),
  };
}
