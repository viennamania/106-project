import "server-only";

import { MongoClient, ServerApiVersion, type Collection } from "mongodb";
import type { MemberDocument } from "@/lib/member";
import type { ThirdwebWebhookEventDocument } from "@/lib/thirdweb-webhooks";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
  mongoMembersCollectionPromise?: Promise<Collection<MemberDocument>>;
  mongoThirdwebWebhookEventsCollectionPromise?: Promise<
    Collection<ThirdwebWebhookEventDocument>
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

export async function getMembersCollection() {
  if (!globalForMongo.mongoMembersCollectionPromise) {
    globalForMongo.mongoMembersCollectionPromise = (async () => {
      const { collectionName, dbName } = getMongoConfig();
      const client = await getMongoClient();
      const collection = client
        .db(dbName)
        .collection<MemberDocument>(collectionName);

      await Promise.all([
        collection.createIndex({ email: 1 }, { unique: true }),
        collection.createIndex(
          { lastWalletAddress: 1 },
          {
            unique: true,
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
      ]);

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
