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

async function getMongoClient() {
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
