// Railway cron worker: runs one AI Star agent tick per configured Star.
// Mirrors railway/content-automation-cron. It calls the deployed star-agent
// route, which holds the OpenAI/Mem0 keys; this worker only needs the gate key.
//
// Env:
//   STAR_AGENT_RUN_URL        e.g. https://www.net402.ai/api/internal/star-agent
//   STAR_AGENT_INTERNAL_KEY   the route's gate key (sent as x-internal-key)
//   STAR_AGENT_CRON_STAR_IDS  comma-separated Star ids to tick
//   STAR_AGENT_CRON_MODE      "dry_run" (default) | "live"

const runUrl = process.env.STAR_AGENT_RUN_URL?.trim();
const internalKey = process.env.STAR_AGENT_INTERNAL_KEY?.trim();
const starIds = (process.env.STAR_AGENT_CRON_STAR_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);
const mode = process.env.STAR_AGENT_CRON_MODE === "live" ? "live" : "dry_run";

if (!runUrl) {
  console.error("STAR_AGENT_RUN_URL is required.");
  process.exit(1);
}
if (!internalKey) {
  console.error("STAR_AGENT_INTERNAL_KEY is required.");
  process.exit(1);
}
if (starIds.length === 0) {
  console.error("STAR_AGENT_CRON_STAR_IDS is required (comma-separated).");
  process.exit(1);
}

let failed = 0;

for (const starId of starIds) {
  try {
    const response = await fetch(runUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": internalKey,
      },
      body: JSON.stringify({ starId, mode }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      failed += 1;
      console.error(
        JSON.stringify({ starId, status: response.status, payload }, null, 2),
      );
      continue;
    }

    const note = payload?.result?.decision?.note ?? "";
    const actions =
      payload?.result?.toolResults?.map((result) => result.tool).join(", ") ??
      "";
    console.log(JSON.stringify({ starId, mode, note, actions }, null, 2));
  } catch (error) {
    failed += 1;
    console.error(
      JSON.stringify(
        {
          starId,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
  }
}

console.log(
  `star-agent cron done: ${starIds.length - failed}/${starIds.length} ok, mode=${mode}`,
);
process.exit(failed > 0 ? 1 : 0);
