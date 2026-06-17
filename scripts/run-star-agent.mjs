// Thin CLI trigger for one AI Star agent tick. Posts to the internal route, so
// the running Next server (which loads .env.local) holds the OpenAI/Mem0 keys;
// this script only needs STAR_AGENT_INTERNAL_KEY to authenticate.
//
//   STAR_AGENT_INTERNAL_KEY=... node scripts/run-star-agent.mjs <starId>
//   STAR_AGENT_INTERNAL_KEY=... node scripts/run-star-agent.mjs <starId> --live
//
// Optional: STAR_AGENT_BASE_URL (default http://localhost:3000).

const [, , starId, ...flags] = process.argv;

if (!starId) {
  console.error("usage: node scripts/run-star-agent.mjs <starId> [--live]");
  process.exit(1);
}

const internalKey = process.env.STAR_AGENT_INTERNAL_KEY;
if (!internalKey) {
  console.error("STAR_AGENT_INTERNAL_KEY env var is required.");
  process.exit(1);
}

const baseUrl = process.env.STAR_AGENT_BASE_URL ?? "http://localhost:3000";
const mode = flags.includes("--live") ? "live" : "dry_run";

const response = await fetch(`${baseUrl}/api/internal/star-agent`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-internal-key": internalKey,
  },
  body: JSON.stringify({ starId, mode }),
});

const payload = await response.json().catch(() => ({ error: "non-JSON response" }));
console.log(JSON.stringify(payload, null, 2));
process.exit(response.ok ? 0 : 1);
