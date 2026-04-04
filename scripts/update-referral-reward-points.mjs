import { MongoClient } from "mongodb";

const targetPoints = 200;
const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB_NAME?.trim();
const collectionName =
  process.env.MONGODB_REFERRAL_REWARDS_COLLECTION?.trim() ?? "referralRewards";

if (!uri) {
  throw new Error("MONGODB_URI is not configured.");
}

if (!dbName) {
  throw new Error("MONGODB_DB_NAME is not configured.");
}

const client = new MongoClient(uri);

try {
  await client.connect();

  const collection = client.db(dbName).collection(collectionName);
  const result = await collection.updateMany(
    { points: { $ne: targetPoints } },
    {
      $set: {
        points: targetPoints,
      },
    },
  );

  console.log(
    JSON.stringify(
      {
        collection: collectionName,
        dbName,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        targetPoints,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
