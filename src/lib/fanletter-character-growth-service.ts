import "server-only";

import {
  getCreatorProfileSnapshotForCompletedMember,
} from "@/lib/content-service";
import type { ContentPostDocument } from "@/lib/content";
import {
  buildFanletterCharacterGrowthRecord,
  type FanletterCharacterGrowthMetrics,
  type FanletterCharacterGrowthRecord,
} from "@/lib/fanletter-character-growth";
import type { Locale } from "@/lib/i18n";
import type { MemberDocument } from "@/lib/member";
import {
  getContentCommentsCollection,
  getContentOrdersCollection,
  getContentPostsCollection,
  getContentSocialActionsCollection,
  getFanletterFanRequestsCollection,
} from "@/lib/mongodb";

type AggregateCount = {
  _id: string;
  count: number;
};

type SocialAggregateCount = {
  _id: string | null;
  likeCount: number;
  saveCount: number;
};

function getPublishingStreakDays(posts: ContentPostDocument[]) {
  const dayValues = [
    ...new Set(
      posts
        .filter((post) => post.status === "published")
        .map((post) => (post.publishedAt ?? post.createdAt).toISOString().slice(0, 10)),
    ),
  ].sort((a, b) => (a < b ? 1 : -1));

  if (dayValues.length === 0) {
    return 0;
  }

  let streak = 1;
  let previous = new Date(`${dayValues[0]}T00:00:00.000Z`).getTime();

  for (const dayValue of dayValues.slice(1)) {
    const current = new Date(`${dayValue}T00:00:00.000Z`).getTime();
    const diffDays = Math.round((previous - current) / (24 * 60 * 60 * 1000));

    if (diffDays !== 1) {
      break;
    }

    streak += 1;
    previous = current;
  }

  return streak;
}

async function getContentReactionMetrics(contentIds: string[]) {
  if (contentIds.length === 0) {
    return {
      commentCount: 0,
      likeCount: 0,
      paidBuyerCount: 0,
      saveCount: 0,
    };
  }

  const socialActionsCollection = await getContentSocialActionsCollection();
  const commentsCollection = await getContentCommentsCollection();
  const ordersCollection = await getContentOrdersCollection();
  const [actionCounts, commentCounts, orderCounts] = await Promise.all([
    socialActionsCollection
      .aggregate<SocialAggregateCount>([
        {
          $match: {
            contentId: { $in: contentIds },
          },
        },
        {
          $group: {
            _id: null,
            likeCount: {
              $sum: {
                $cond: ["$liked", 1, 0],
              },
            },
            saveCount: {
              $sum: {
                $cond: ["$saved", 1, 0],
              },
            },
          },
        },
      ])
      .toArray(),
    commentsCollection.countDocuments({
      contentId: { $in: contentIds },
    }),
    ordersCollection.countDocuments({
      contentId: { $in: contentIds },
      status: "confirmed",
    }),
  ]);
  const actionCount = actionCounts[0];

  return {
    commentCount: commentCounts,
    likeCount: actionCount?.likeCount ?? 0,
    paidBuyerCount: orderCounts,
    saveCount: actionCount?.saveCount ?? 0,
  };
}

async function getFanRequestMetrics(memberEmail: string) {
  const requestsCollection = await getFanletterFanRequestsCollection();
  const counts = await requestsCollection
    .aggregate<AggregateCount>([
      {
        $match: {
          creatorEmail: memberEmail,
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

  const countByStatus = new Map(counts.map((item) => [item._id, item.count]));

  return {
    completedCount: countByStatus.get("used") ?? 0,
    pendingCount: (countByStatus.get("new") ?? 0) + (countByStatus.get("reviewed") ?? 0),
    totalCount: counts.reduce((total, item) => total + item.count, 0),
  };
}

export async function getFanletterCharacterGrowthForMember({
  locale,
  member,
}: {
  locale: Locale;
  member: MemberDocument;
}): Promise<FanletterCharacterGrowthRecord> {
  const [profileSnapshot, posts] = await Promise.all([
    getCreatorProfileSnapshotForCompletedMember(member),
    (async () => {
      const postsCollection = await getContentPostsCollection();

      return postsCollection
        .find({
          authorEmail: member.email,
          "contentVideoUrls.0": { $exists: true },
        })
        .toArray();
    })(),
  ]);
  const contentIds = posts.map((post) => post.contentId);
  const [reactions, fanRequests] = await Promise.all([
    getContentReactionMetrics(contentIds),
    getFanRequestMetrics(member.email),
  ]);
  const draftVlogCount = posts.filter((post) => post.status === "draft").length;
  const publishedVlogCount = posts.filter(
    (post) => post.status === "published",
  ).length;
  const characterReady = Boolean(
    profileSnapshot.profile.displayName.trim() &&
      profileSnapshot.profile.characterPersona &&
      profileSnapshot.profile.avatarImageUrl,
  );
  const metrics: FanletterCharacterGrowthMetrics = {
    commentCount: reactions.commentCount,
    draftVlogCount,
    fanRequestCompletedCount: fanRequests.completedCount,
    fanRequestPendingCount: fanRequests.pendingCount,
    fanRequestTotalCount: fanRequests.totalCount,
    likeCount: reactions.likeCount,
    paidBuyerCount: reactions.paidBuyerCount,
    publishedVlogCount,
    saveCount: reactions.saveCount,
    streakDays: getPublishingStreakDays(posts),
    totalVlogCount: draftVlogCount + publishedVlogCount,
  };
  return buildFanletterCharacterGrowthRecord({
    characterReady,
    locale,
    metrics,
  });
}
