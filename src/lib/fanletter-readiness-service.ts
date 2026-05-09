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
  const characterReady = Boolean(
    profileSnapshot.profile.displayName.trim() &&
      persona &&
      profileSnapshot.profile.avatarImageUrl,
  );

  return {
    character: {
      avatarImageUrl: profileSnapshot.profile.avatarImageUrl,
      name: persona?.name ?? profileSnapshot.profile.displayName ?? null,
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
