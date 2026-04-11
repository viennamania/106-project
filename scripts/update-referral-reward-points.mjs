import { MongoClient } from "mongodb";

const levelOneTargetPoints = 200;
const downstreamTargetPoints = 80;
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
  const [levelOneResult, downstreamResult, unexpectedLevelCount] =
    await Promise.all([
      collection.updateMany(
        {
          level: 1,
          points: { $ne: levelOneTargetPoints },
        },
        {
          $set: {
            points: levelOneTargetPoints,
          },
        },
      ),
      collection.updateMany(
        {
          level: { $gte: 2 },
          points: { $ne: downstreamTargetPoints },
        },
        {
          $set: {
            points: downstreamTargetPoints,
          },
        },
      ),
      collection.countDocuments({
        level: {
          $nin: [1, 2, 3, 4, 5, 6],
        },
      }),
    ]);

  console.log(
    JSON.stringify(
      {
        collection: collectionName,
        dbName,
        matchedCount:
          levelOneResult.matchedCount + downstreamResult.matchedCount,
        modifiedCount:
          levelOneResult.modifiedCount + downstreamResult.modifiedCount,
        targetPointsByLevel: {
          G1: levelOneTargetPoints,
          G2ToG6: downstreamTargetPoints,
        },
        unexpectedLevelCount,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
