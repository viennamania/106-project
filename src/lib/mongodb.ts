import "server-only";

import { MongoClient, ServerApiVersion, type Collection } from "mongodb";
import type {
  MemberDocument,
  ReferralPlacementSlotDocument,
  ReferralRewardDocument,
} from "@/lib/member";
import type {
  ThirdwebWebhookEventDocument,
  ThirdwebWebhookIngressLogDocument,
} from "@/lib/thirdweb-webhooks";
import type {
  WalletTransferDocument,
  WalletTransferSyncStateDocument,
} from "@/lib/wallet";
import type {
  PointBalanceDocument,
  PointLedgerDocument,
  RewardRedemptionDocument,
} from "@/lib/points";
import type { SilverRewardClaimDocument } from "@/lib/silver-reward-claim";
import type {
  AppNotificationDocument,
  AppNotificationPreferencesDocument,
  AppPushSubscriptionDocument,
} from "@/lib/notifications";
import type {
  ActivityDailyStateDocument,
  ActivityLedgerDocument,
  ActivityProfileDocument,
  ActivityTapSessionDocument,
} from "@/lib/activity";
import type { MemberAnnouncementDocument } from "@/lib/announcements";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
  mongoMembersCollectionPromise?: Promise<Collection<MemberDocument>>;
  mongoThirdwebWebhookEventsCollectionPromise?: Promise<
    Collection<ThirdwebWebhookEventDocument>
  >;
  mongoReferralRewardsCollectionPromise?: Promise<
    Collection<ReferralRewardDocument>
  >;
  mongoReferralPlacementSlotsCollectionPromise?: Promise<
    Collection<ReferralPlacementSlotDocument>
  >;
  mongoThirdwebWebhookIngressLogsCollectionPromise?: Promise<
    Collection<ThirdwebWebhookIngressLogDocument>
  >;
  mongoWalletTransfersCollectionPromise?: Promise<
    Collection<WalletTransferDocument>
  >;
  mongoWalletTransferSyncStatesCollectionPromise?: Promise<
    Collection<WalletTransferSyncStateDocument>
  >;
  mongoPointLedgerCollectionPromise?: Promise<
    Collection<PointLedgerDocument>
  >;
  mongoPointBalancesCollectionPromise?: Promise<
    Collection<PointBalanceDocument>
  >;
  mongoRewardRedemptionsCollectionPromise?: Promise<
    Collection<RewardRedemptionDocument>
  >;
  mongoSilverRewardClaimsCollectionPromise?: Promise<
    Collection<SilverRewardClaimDocument>
  >;
  mongoAppNotificationsCollectionPromise?: Promise<
    Collection<AppNotificationDocument>
  >;
  mongoAppNotificationPreferencesCollectionPromise?: Promise<
    Collection<AppNotificationPreferencesDocument>
  >;
  mongoAppPushSubscriptionsCollectionPromise?: Promise<
    Collection<AppPushSubscriptionDocument>
  >;
  mongoActivityProfilesCollectionPromise?: Promise<
    Collection<ActivityProfileDocument>
  >;
  mongoActivityLedgerCollectionPromise?: Promise<
    Collection<ActivityLedgerDocument>
  >;
  mongoActivityDailyStatesCollectionPromise?: Promise<
    Collection<ActivityDailyStateDocument>
  >;
  mongoActivityTapSessionsCollectionPromise?: Promise<
    Collection<ActivityTapSessionDocument>
  >;
  mongoMemberAnnouncementsCollectionPromise?: Promise<
    Collection<MemberAnnouncementDocument>
  >;
};

function getMongoConfig() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;
  const collectionName = process.env.MONGODB_MEMBERS_COLLECTION ?? "members";

  if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (!dbName) {
    throw new Error("MONGODB_DB_NAME is not configured.");
  }

  return { collectionName, dbName, uri };
}

function createMongoClient() {
  const { uri } = getMongoConfig();

  return new MongoClient(uri, {
    serverApi: {
      deprecationErrors: true,
      strict: true,
      version: ServerApiVersion.v1,
    },
  });
}

export async function getMongoClient() {
  if (!globalForMongo.mongoClientPromise) {
    globalForMongo.mongoClientPromise = createMongoClient().connect();
  }

  return globalForMongo.mongoClientPromise;
}

async function ensureMembersIndexes(
  collection: Collection<MemberDocument>,
) {
  const indexes = await collection.indexes();
  const walletIndex = indexes.find((index) => index.name === "lastWalletAddress_1");
  const walletIndexName = walletIndex?.name;

  // Older builds created a unique wallet index, which breaks reconnect flows
  // when the same wallet address is reused during testing or recovery.
  if (walletIndex?.unique && walletIndexName) {
    await collection.dropIndex(walletIndexName);
  }

  await Promise.all([
    collection.createIndex({ email: 1 }, { unique: true }),
    collection.createIndex(
      { lastWalletAddress: 1 },
      {
        partialFilterExpression: {
          lastWalletAddress: { $type: "string" },
        },
      },
    ),
    collection.createIndex(
      { referralCode: 1 },
      {
        unique: true,
        partialFilterExpression: {
          referralCode: { $type: "string" },
        },
      },
    ),
    collection.createIndex(
      { referredByCode: 1 },
      {
        partialFilterExpression: {
          referredByCode: { $type: "string" },
        },
      },
    ),
    collection.createIndex({
      status: 1,
      lastWalletAddress: 1,
      awaitingPaymentSince: -1,
    }),
    collection.createIndex({
      status: 1,
      paymentBackfillCheckedAt: 1,
      awaitingPaymentSince: 1,
    }),
    collection.createIndex({
      status: 1,
      referredByCode: 1,
      registrationCompletedAt: -1,
    }),
    collection.createIndex(
      { sponsorReferralCode: 1 },
      {
        partialFilterExpression: {
          sponsorReferralCode: { $type: "string" },
        },
      },
    ),
    collection.createIndex(
      { placementReferralCode: 1 },
      {
        partialFilterExpression: {
          placementReferralCode: { $type: "string" },
        },
      },
    ),
    collection.createIndex({
      status: 1,
      placementReferralCode: 1,
      registrationCompletedAt: -1,
    }),
  ]);
}

export async function getMembersCollection() {
  if (!globalForMongo.mongoMembersCollectionPromise) {
    globalForMongo.mongoMembersCollectionPromise = (async () => {
      const { collectionName, dbName } = getMongoConfig();
      const client = await getMongoClient();
      const collection = client
        .db(dbName)
        .collection<MemberDocument>(collectionName);

      await ensureMembersIndexes(collection);

      return collection;
    })();
  }

  return globalForMongo.mongoMembersCollectionPromise;
}

export async function getThirdwebWebhookEventsCollection() {
  if (!globalForMongo.mongoThirdwebWebhookEventsCollectionPromise) {
    globalForMongo.mongoThirdwebWebhookEventsCollectionPromise = (async () => {
      const { dbName } = getMongoConfig();
      const client = await getMongoClient();
      const collectionName =
        process.env.MONGODB_THIRDWEB_WEBHOOK_EVENTS_COLLECTION ??
        "thirdwebWebhookEvents";
      const collection = client
        .db(dbName)
        .collection<ThirdwebWebhookEventDocument>(collectionName);

      await Promise.all([
        collection.createIndex({ webhookEventId: 1 }, { unique: true }),
        collection.createIndex({ projectWallet: 1, receivedAt: -1 }),
        collection.createIndex({ transactionHash: 1, logIndex: 1 }),
      ]);

      return collection;
    })();
  }

  return globalForMongo.mongoThirdwebWebhookEventsCollectionPromise;
}

export async function getReferralRewardsCollection() {
  if (!globalForMongo.mongoReferralRewardsCollectionPromise) {
    globalForMongo.mongoReferralRewardsCollectionPromise = (async () => {
      const { dbName } = getMongoConfig();
      const client = await getMongoClient();
      const collectionName =
        process.env.MONGODB_REFERRAL_REWARDS_COLLECTION ?? "referralRewards";
      const collection = client
        .db(dbName)
        .collection<ReferralRewardDocument>(collectionName);

      await Promise.all([
        collection.createIndex(
          { recipientEmail: 1, sourceMemberEmail: 1 },
          { unique: true },
        ),
        collection.createIndex({ recipientEmail: 1, awardedAt: -1 }),
        collection.createIndex({ sourceMemberEmail: 1, awardedAt: -1 }),
      ]);

      return collection;
    })();
  }

  return globalForMongo.mongoReferralRewardsCollectionPromise;
}

export async function getReferralPlacementSlotsCollection() {
  if (!globalForMongo.mongoReferralPlacementSlotsCollectionPromise) {
    globalForMongo.mongoReferralPlacementSlotsCollectionPromise = (async () => {
      const { dbName } = getMongoConfig();
      const client = await getMongoClient();
      const collectionName =
        process.env.MONGODB_REFERRAL_PLACEMENT_SLOTS_COLLECTION ??
        "referralPlacementSlots";
      const collection = client
        .db(dbName)
        .collection<ReferralPlacementSlotDocument>(collectionName);

      await Promise.all([
        collection.createIndex(
          { ownerReferralCode: 1, slotIndex: 1 },
          { unique: true },
        ),
        collection.createIndex(
          { claimedByEmail: 1 },
          {
            unique: true,
            partialFilterExpression: {
              claimedByEmail: { $type: "string" },
            },
          },
        ),
        collection.createIndex({ ownerEmail: 1, slotIndex: 1 }),
        collection.createIndex({
          claimedByEmail: 1,
          ownerRegistrationCompletedAt: 1,
          ownerReferralCode: 1,
          slotIndex: 1,
        }),
      ]);

      return collection;
    })();
  }

  return globalForMongo.mongoReferralPlacementSlotsCollectionPromise;
}

export async function getThirdwebWebhookIngressLogsCollection() {
  if (!globalForMongo.mongoThirdwebWebhookIngressLogsCollectionPromise) {
    globalForMongo.mongoThirdwebWebhookIngressLogsCollectionPromise = (async () => {
      const { dbName } = getMongoConfig();
      const client = await getMongoClient();
      const collectionName =
        process.env.MONGODB_THIRDWEB_WEBHOOK_INGRESS_COLLECTION ??
        "thirdwebWebhookIngressLogs";
      const collection = client
        .db(dbName)
        .collection<ThirdwebWebhookIngressLogDocument>(collectionName);

      await Promise.all([
        collection.createIndex({ requestId: 1 }, { unique: true }),
        collection.createIndex({ receivedAt: -1 }),
        collection.createIndex({
          verificationStatus: 1,
          processingStatus: 1,
          receivedAt: -1,
        }),
        collection.createIndex({ payloadSha256: 1, receivedAt: -1 }),
      ]);

      return collection;
    })();
  }

  return globalForMongo.mongoThirdwebWebhookIngressLogsCollectionPromise;
}

export async function getWalletTransfersCollection() {
  if (!globalForMongo.mongoWalletTransfersCollectionPromise) {
    globalForMongo.mongoWalletTransfersCollectionPromise = (async () => {
      const { dbName } = getMongoConfig();
      const client = await getMongoClient();
      const collectionName =
        process.env.MONGODB_WALLET_TRANSFERS_COLLECTION ?? "walletTransfers";
      const collection = client
        .db(dbName)
        .collection<WalletTransferDocument>(collectionName);

      await Promise.all([
        collection.createIndex(
          { walletAddress: 1, transactionHash: 1, logIndex: 1 },
          { unique: true },
        ),
        collection.createIndex({
          walletAddress: 1,
          blockTimestamp: -1,
          blockNumber: -1,
          logIndex: -1,
        }),
        collection.createIndex({ walletAddress: 1, updatedAt: -1 }),
        collection.createIndex({ transactionHash: 1, logIndex: 1 }),
      ]);

      return collection;
    })();
  }

  return globalForMongo.mongoWalletTransfersCollectionPromise;
}

export async function getWalletTransferSyncStatesCollection() {
  if (!globalForMongo.mongoWalletTransferSyncStatesCollectionPromise) {
    globalForMongo.mongoWalletTransferSyncStatesCollectionPromise = (async () => {
      const { dbName } = getMongoConfig();
      const client = await getMongoClient();
      const collectionName =
        process.env.MONGODB_WALLET_TRANSFER_SYNC_STATES_COLLECTION ??
        "walletTransferSyncStates";
      const collection = client
        .db(dbName)
        .collection<WalletTransferSyncStateDocument>(collectionName);

      await Promise.all([
        collection.createIndex({ walletAddress: 1 }, { unique: true }),
        collection.createIndex({ lastSyncedAt: -1 }),
        collection.createIndex({ updatedAt: -1 }),
      ]);

      return collection;
    })();
  }

  return globalForMongo.mongoWalletTransferSyncStatesCollectionPromise;
}

export async function getPointLedgerCollection() {
  if (!globalForMongo.mongoPointLedgerCollectionPromise) {
    globalForMongo.mongoPointLedgerCollectionPromise = (async () => {
      const { dbName } = getMongoConfig();
      const client = await getMongoClient();
      const collectionName =
        process.env.MONGODB_POINT_LEDGER_COLLECTION ?? "pointLedger";
      const collection = client
        .db(dbName)
        .collection<PointLedgerDocument>(collectionName);

      await Promise.all([
        collection.createIndex({ ledgerEntryId: 1 }, { unique: true }),
        collection.createIndex({ memberEmail: 1, createdAt: -1 }),
        collection.createIndex({
          memberEmail: 1,
          sourceType: 1,
          sourceId: 1,
        }),
      ]);

      return collection;
    })();
  }

  return globalForMongo.mongoPointLedgerCollectionPromise;
}

export async function getPointBalancesCollection() {
  if (!globalForMongo.mongoPointBalancesCollectionPromise) {
    globalForMongo.mongoPointBalancesCollectionPromise = (async () => {
      const { dbName } = getMongoConfig();
      const client = await getMongoClient();
      const collectionName =
        process.env.MONGODB_POINT_BALANCES_COLLECTION ?? "pointBalances";
      const collection = client
        .db(dbName)
        .collection<PointBalanceDocument>(collectionName);

      await Promise.all([
        collection.createIndex({ memberEmail: 1 }, { unique: true }),
        collection.createIndex({ updatedAt: -1 }),
        collection.createIndex({ tier: 1, spendablePoints: -1 }),
      ]);

      return collection;
    })();
  }

  return globalForMongo.mongoPointBalancesCollectionPromise;
}

export async function getRewardRedemptionsCollection() {
  if (!globalForMongo.mongoRewardRedemptionsCollectionPromise) {
    globalForMongo.mongoRewardRedemptionsCollectionPromise = (async () => {
      const { dbName } = getMongoConfig();
      const client = await getMongoClient();
      const collectionName =
        process.env.MONGODB_REWARD_REDEMPTIONS_COLLECTION ?? "rewardRedemptions";
      const collection = client
        .db(dbName)
        .collection<RewardRedemptionDocument>(collectionName);

      await Promise.all([
        collection.createIndex({ redemptionId: 1 }, { unique: true }),
        collection.createIndex({ memberEmail: 1, rewardId: 1 }, { unique: true }),
        collection.createIndex({ memberEmail: 1, createdAt: -1 }),
        collection.createIndex({ status: 1, updatedAt: -1 }),
      ]);

      return collection;
    })();
  }

  return globalForMongo.mongoRewardRedemptionsCollectionPromise;
}

export async function getSilverRewardClaimsCollection() {
  if (!globalForMongo.mongoSilverRewardClaimsCollectionPromise) {
    globalForMongo.mongoSilverRewardClaimsCollectionPromise = (async () => {
      const { dbName } = getMongoConfig();
      const client = await getMongoClient();
      const collectionName =
        process.env.MONGODB_SILVER_REWARD_CLAIMS_COLLECTION ??
        "silverRewardClaims";
      const collection = client
        .db(dbName)
        .collection<SilverRewardClaimDocument>(collectionName);

      await Promise.all([
        collection.createIndex({ claimId: 1 }, { unique: true }),
        collection.createIndex({ memberEmail: 1, rewardId: 1 }, { unique: true }),
        collection.createIndex({ memberEmail: 1, createdAt: -1 }),
        collection.createIndex({ status: 1, updatedAt: -1 }),
      ]);

      return collection;
    })();
  }

  return globalForMongo.mongoSilverRewardClaimsCollectionPromise;
}

export async function getAppNotificationsCollection() {
  if (!globalForMongo.mongoAppNotificationsCollectionPromise) {
    globalForMongo.mongoAppNotificationsCollectionPromise = (async () => {
      const { dbName } = getMongoConfig();
      const client = await getMongoClient();
      const collectionName =
        process.env.MONGODB_APP_NOTIFICATIONS_COLLECTION ?? "appNotifications";
      const collection = client
        .db(dbName)
        .collection<AppNotificationDocument>(collectionName);

      await Promise.all([
        collection.createIndex({ eventKey: 1 }, { unique: true }),
        collection.createIndex({ memberEmail: 1, createdAt: -1 }),
        collection.createIndex({ memberEmail: 1, readAt: 1, createdAt: -1 }),
      ]);

      return collection;
    })();
  }

  return globalForMongo.mongoAppNotificationsCollectionPromise;
}

export async function getAppNotificationPreferencesCollection() {
  if (!globalForMongo.mongoAppNotificationPreferencesCollectionPromise) {
    globalForMongo.mongoAppNotificationPreferencesCollectionPromise =
      (async () => {
        const { dbName } = getMongoConfig();
        const client = await getMongoClient();
        const collectionName =
          process.env.MONGODB_APP_NOTIFICATION_PREFERENCES_COLLECTION ??
          "appNotificationPreferences";
        const collection = client
          .db(dbName)
          .collection<AppNotificationPreferencesDocument>(collectionName);

        await Promise.all([
          collection.createIndex({ memberEmail: 1 }, { unique: true }),
          collection.createIndex({ updatedAt: -1 }),
        ]);

        return collection;
      })();
  }

  return globalForMongo.mongoAppNotificationPreferencesCollectionPromise;
}

export async function getAppPushSubscriptionsCollection() {
  if (!globalForMongo.mongoAppPushSubscriptionsCollectionPromise) {
    globalForMongo.mongoAppPushSubscriptionsCollectionPromise =
      (async () => {
        const { dbName } = getMongoConfig();
        const client = await getMongoClient();
        const collectionName =
          process.env.MONGODB_APP_PUSH_SUBSCRIPTIONS_COLLECTION ??
          "appPushSubscriptions";
        const collection = client
          .db(dbName)
          .collection<AppPushSubscriptionDocument>(collectionName);

        await Promise.all([
          collection.createIndex({ endpoint: 1 }, { unique: true }),
          collection.createIndex({ memberEmail: 1, updatedAt: -1 }),
        ]);

        return collection;
      })();
  }

  return globalForMongo.mongoAppPushSubscriptionsCollectionPromise;
}

export async function getActivityProfilesCollection() {
  if (!globalForMongo.mongoActivityProfilesCollectionPromise) {
    globalForMongo.mongoActivityProfilesCollectionPromise = (async () => {
      const { dbName } = getMongoConfig();
      const client = await getMongoClient();
      const collectionName =
        process.env.MONGODB_ACTIVITY_PROFILES_COLLECTION ?? "activityProfiles";
      const collection = client
        .db(dbName)
        .collection<ActivityProfileDocument>(collectionName);

      await Promise.all([
        collection.createIndex({ memberEmail: 1 }, { unique: true }),
        collection.createIndex({ updatedAt: -1 }),
      ]);

      return collection;
    })();
  }

  return globalForMongo.mongoActivityProfilesCollectionPromise;
}

export async function getActivityLedgerCollection() {
  if (!globalForMongo.mongoActivityLedgerCollectionPromise) {
    globalForMongo.mongoActivityLedgerCollectionPromise = (async () => {
      const { dbName } = getMongoConfig();
      const client = await getMongoClient();
      const collectionName =
        process.env.MONGODB_ACTIVITY_LEDGER_COLLECTION ?? "activityLedger";
      const collection = client
        .db(dbName)
        .collection<ActivityLedgerDocument>(collectionName);

      await Promise.all([
        collection.createIndex({ ledgerEntryId: 1 }, { unique: true }),
        collection.createIndex(
          { memberEmail: 1, sourceType: 1, sourceId: 1 },
          { unique: true },
        ),
        collection.createIndex({ memberEmail: 1, createdAt: -1 }),
        collection.createIndex({ memberEmail: 1, dateKey: 1, createdAt: -1 }),
      ]);

      return collection;
    })();
  }

  return globalForMongo.mongoActivityLedgerCollectionPromise;
}

export async function getActivityDailyStatesCollection() {
  if (!globalForMongo.mongoActivityDailyStatesCollectionPromise) {
    globalForMongo.mongoActivityDailyStatesCollectionPromise = (async () => {
      const { dbName } = getMongoConfig();
      const client = await getMongoClient();
      const collectionName =
        process.env.MONGODB_ACTIVITY_DAILY_STATES_COLLECTION ??
        "activityDailyStates";
      const collection = client
        .db(dbName)
        .collection<ActivityDailyStateDocument>(collectionName);

      await Promise.all([
        collection.createIndex({ memberEmail: 1, dateKey: 1 }, { unique: true }),
        collection.createIndex({ dateKey: 1, updatedAt: -1 }),
      ]);

      return collection;
    })();
  }

  return globalForMongo.mongoActivityDailyStatesCollectionPromise;
}

export async function getActivityTapSessionsCollection() {
  if (!globalForMongo.mongoActivityTapSessionsCollectionPromise) {
    globalForMongo.mongoActivityTapSessionsCollectionPromise = (async () => {
      const { dbName } = getMongoConfig();
      const client = await getMongoClient();
      const collectionName =
        process.env.MONGODB_ACTIVITY_TAP_SESSIONS_COLLECTION ??
        "activityTapSessions";
      const collection = client
        .db(dbName)
        .collection<ActivityTapSessionDocument>(collectionName);

      await Promise.all([
        collection.createIndex({ sessionId: 1 }, { unique: true }),
        collection.createIndex({ memberEmail: 1, status: 1, createdAt: -1 }),
        collection.createIndex({ memberEmail: 1, expiresAt: 1 }),
      ]);

      return collection;
    })();
  }

  return globalForMongo.mongoActivityTapSessionsCollectionPromise;
}

export async function getMemberAnnouncementsCollection() {
  if (!globalForMongo.mongoMemberAnnouncementsCollectionPromise) {
    globalForMongo.mongoMemberAnnouncementsCollectionPromise = (async () => {
      const { dbName } = getMongoConfig();
      const client = await getMongoClient();
      const collectionName =
        process.env.MONGODB_MEMBER_ANNOUNCEMENTS_COLLECTION ??
        "memberAnnouncements";
      const collection = client
        .db(dbName)
        .collection<MemberAnnouncementDocument>(collectionName);

      await Promise.all([
        collection.createIndex({ announcementId: 1 }, { unique: true }),
        collection.createIndex({ senderEmail: 1, createdAt: -1 }),
        collection.createIndex({ createdAt: -1 }),
      ]);

      return collection;
    })();
  }

  return globalForMongo.mongoMemberAnnouncementsCollectionPromise;
}
