// Internal trigger for one AI Star agent tick (PoC).
// Gated: returns 503 unless STAR_AGENT_INTERNAL_KEY is set, and requires that
// key in the `x-internal-key` header. Defaults to dry-run; "live" must be asked
// for explicitly. Not on any cron — nothing invokes this automatically.
import { runStarAgentTick } from "@/lib/star-agent/run-star-agent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const internalKey = process.env.STAR_AGENT_INTERNAL_KEY?.trim();
  if (!internalKey) {
    return Response.json(
      { error: "Star agent endpoint is disabled." },
      { status: 503 },
    );
  }
  if (request.headers.get("x-internal-key") !== internalKey) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { starId?: unknown; mode?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const starId = typeof body.starId === "string" ? body.starId.trim() : "";
  if (!starId) {
    return Response.json({ error: "starId is required." }, { status: 400 });
  }
  const mode = body.mode === "live" ? "live" : "dry_run";

  try {
    const result = await runStarAgentTick(starId, { mode });
    return Response.json({ result });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Star agent tick failed.",
      },
      { status: 500 },
    );
  }
}
