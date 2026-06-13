import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB_NAME?.trim();
const funnelEventsCollectionName =
  process.env.MONGODB_FUNNEL_EVENTS_COLLECTION?.trim() ?? "funnelEvents";
const lookbackDays = readPositiveInteger(
  process.env.FANLETTER_AGENTRANK_FUNNEL_BACKFILL_DAYS,
  30,
);
const limit = readPositiveInteger(
  process.env.FANLETTER_AGENTRANK_FUNNEL_BACKFILL_LIMIT,
  5000,
);
const writeChanges = ["1", "true", "yes", "on"].includes(
  String(process.env.FANLETTER_AGENTRANK_FUNNEL_BACKFILL_WRITE ?? "")
    .trim()
    .toLowerCase(),
);

if (!uri) {
  throw new Error("MONGODB_URI is not configured.");
}

if (!dbName) {
  throw new Error("MONGODB_DB_NAME is not configured.");
}

const reservedFanletterSegments = new Set([
  "agentrank",
  "ai-star-genealogy",
  "campaigns",
  "characters",
  "connect",
  "content",
  "creator",
  "creator-unlock",
  "feed",
  "founder-club",
  "founder-universe",
  "manifest.webmanifest",
  "news",
  "onboarding",
  "reports",
  "share",
  "start",
  "studio",
  "wallet",
]);

function readPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readSafeString(value, maxLength = 96) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

function inferStarIdFromRoute(...values) {
  for (const value of values) {
    if (!value) {
      continue;
    }

    const match = value.match(/\/fanletter\/([^/?#]+)/);
    const segment = match?.[1]?.trim();

    if (segment && !reservedFanletterSegments.has(segment)) {
      return decodeURIComponent(segment).slice(0, 128);
    }
  }

  return null;
}

function inferStarId(event) {
  const metadata = event.metadata ?? {};

  return (
    readSafeString(metadata.starId, 128) ??
    readSafeString(metadata.sourceStarId, 128) ??
    readSafeString(metadata.spawnedStarId, 128) ??
    inferStarIdFromRoute(event.path, event.targetHref)
  );
}

function inferSource(event) {
  const route = `${event.path ?? ""} ${event.targetHref ?? ""}`;

  if (route.includes("/fanletter/creator-unlock")) {
    return "fanletter_creator_unlock";
  }

  if (route.includes("/fanletter/agentrank")) {
    return "fanletter_agentrank";
  }

  if (route.includes("/universe")) {
    return "fanletter_founder_universe";
  }

  if (route.includes("/fanletter/news")) {
    return "fanletter_news";
  }

  if (
    route.includes("/fanletter/content") ||
    route.includes("/fanletter/share") ||
    route.includes("/fanletter/creator/")
  ) {
    return "fanletter_content";
  }

  if (
    route.includes("/fanletter/onboarding") ||
    route.includes("/fanletter/connect")
  ) {
    return "fanletter_bridge";
  }

  return inferStarId(event) ? "fanletter_star_detail" : "fanletter_home";
}

function inferEventType(event) {
  const route = `${event.path ?? ""} ${event.targetHref ?? ""}`;

  if (event.name === "signup_cta_click") {
    if (route.includes("/fanletter/creator-unlock")) {
      return "creator_unlocked";
    }

    if (
      event.referralCode ||
      route.includes("/fanletter/onboarding") ||
      route.includes("/fanletter/connect") ||
      inferStarId(event)
    ) {
      return "founder_joined";
    }

    return "ai_star_discovered";
  }

  if (event.name === "share_click" || event.name?.startsWith("promo_share_to_")) {
    return "referral_code_created";
  }

  if (event.name === "bridge_view") {
    return event.referralCode || event.shareId
      ? "referral_converted"
      : "content_engaged";
  }

  if (
    event.name === "content_open" ||
    event.name === "external_browser_click" ||
    event.name === "feed_view_public" ||
    event.name === "paid_unlock_click" ||
    event.name?.startsWith("fanletter_news_")
  ) {
    return "content_engaged";
  }

  return null;
}

function inferAgentRank(event) {
  const eventType = inferEventType(event);

  if (!eventType) {
    return null;
  }

  return {
    eventType,
    intent: String(event.name).slice(0, 96),
    source: inferSource(event),
    starId: inferStarId(event),
  };
}

function increment(map, key) {
  map.set(key ?? "unknown", (map.get(key ?? "unknown") ?? 0) + 1);
}

function tableFromMap(map, keyName) {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([key, count]) => ({ [keyName]: key, count }));
}

async function main() {
  const client = new MongoClient(uri);

  await client.connect();

  try {
    const db = client.db(dbName);
    const funnelEvents = db.collection(funnelEventsCollectionName);
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const cursor = funnelEvents
      .find({
        createdAt: { $gte: since },
        $or: [{ agentRank: { $exists: false } }, { agentRank: null }],
      })
      .sort({ createdAt: -1 })
      .limit(limit);
    const operations = [];
    const byType = new Map();
    const bySource = new Map();
    let scanned = 0;
    let inferred = 0;
    let skipped = 0;

    for await (const event of cursor) {
      scanned += 1;

      const agentRank = inferAgentRank(event);

      if (!agentRank) {
        skipped += 1;
        continue;
      }

      inferred += 1;
      increment(byType, agentRank.eventType);
      increment(bySource, agentRank.source);
      operations.push({
        updateOne: {
          filter: { _id: event._id },
          update: { $set: { agentRank } },
        },
      });
    }

    let modified = 0;

    if (writeChanges && operations.length > 0) {
      const result = await funnelEvents.bulkWrite(operations, { ordered: false });
      modified = result.modifiedCount;
    }

    console.log("FanLetter AgentRank funnel backfill");
    console.log("-----------------------------------");
    console.log(`Mode: ${writeChanges ? "WRITE" : "DRY RUN"}`);
    console.log(`Collection: ${dbName}.${funnelEventsCollectionName}`);
    console.log(`Lookback: ${lookbackDays} day(s) since ${since.toISOString()}`);
    console.log(`Scan limit: ${limit}`);
    console.log(`Scanned: ${scanned}`);
    console.log(`Inferred: ${inferred}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Modified: ${modified}`);
    console.log("");
    console.log("Inferred by event type");
    console.table(tableFromMap(byType, "eventType"));
    console.log("Inferred by source");
    console.table(tableFromMap(bySource, "source"));

    if (!writeChanges) {
      console.log("");
      console.log(
        "Set FANLETTER_AGENTRANK_FUNNEL_BACKFILL_WRITE=1 to apply these updates.",
      );
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
