import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB_NAME?.trim();
const funnelEventsCollectionName =
  process.env.MONGODB_FUNNEL_EVENTS_COLLECTION?.trim() ?? "funnelEvents";
const lookbackDays = readPositiveInteger(
  process.env.FANLETTER_AGENTRANK_AUDIT_DAYS,
  7,
);
const topLimit = readPositiveInteger(
  process.env.FANLETTER_AGENTRANK_AUDIT_TOP_LIMIT,
  12,
);

if (!uri) {
  throw new Error("MONGODB_URI is not configured.");
}

if (!dbName) {
  throw new Error("MONGODB_DB_NAME is not configured.");
}

function readPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(numerator, denominator) {
  if (!denominator) {
    return "0.0%";
  }

  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

async function aggregateCounts(collection, match, groupField) {
  return collection
    .aggregate([
      { $match: match },
      {
        $group: {
          _id: groupField,
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, _id: 1 } },
      { $limit: topLimit },
    ])
    .toArray();
}

async function main() {
  const client = new MongoClient(uri);

  await client.connect();

  try {
    const db = client.db(dbName);
    const funnelEvents = db.collection(funnelEventsCollectionName);
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const baseMatch = {
      createdAt: { $gte: since },
    };
    const withAgentRankMatch = {
      ...baseMatch,
      agentRank: { $exists: true, $ne: null },
    };
    const [total, withAgentRank, byType, bySource, byStar] = await Promise.all([
      funnelEvents.countDocuments(baseMatch),
      funnelEvents.countDocuments(withAgentRankMatch),
      aggregateCounts(funnelEvents, withAgentRankMatch, "$agentRank.eventType"),
      aggregateCounts(funnelEvents, withAgentRankMatch, "$agentRank.source"),
      aggregateCounts(
        funnelEvents,
        {
          ...withAgentRankMatch,
          "agentRank.starId": { $exists: true, $ne: null },
        },
        "$agentRank.starId",
      ),
    ]);
    const missing = Math.max(0, total - withAgentRank);

    console.log("FanLetter AgentRank funnel coverage audit");
    console.log("-------------------------------------------");
    console.log(`Collection: ${dbName}.${funnelEventsCollectionName}`);
    console.log(`Lookback: ${lookbackDays} day(s) since ${since.toISOString()}`);
    console.log(`Total funnel events: ${formatNumber(total)}`);
    console.log(
      `AgentRank-tagged events: ${formatNumber(withAgentRank)} (${formatPercent(
        withAgentRank,
        total,
      )})`,
    );
    console.log(
      `Untagged events: ${formatNumber(missing)} (${formatPercent(
        missing,
        total,
      )})`,
    );
    console.log("");
    console.log("By event type");
    console.table(byType.map(({ _id, count }) => ({ eventType: _id, count })));
    console.log("By source");
    console.table(bySource.map(({ _id, count }) => ({ source: _id, count })));
    console.log("Top stars");
    console.table(byStar.map(({ _id, count }) => ({ starId: _id, count })));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
