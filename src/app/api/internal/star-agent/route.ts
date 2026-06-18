// Internal endpoint for the AI Star agent (PoC).
// Gated: returns 503 unless STAR_AGENT_INTERNAL_KEY is set, and requires that
// key in the `x-internal-key` header. Two actions via POST body:
//   { starId, mode? }                     -> run one tick (default dry-run)
//   { action: "setPersona", persona }     -> upsert a Star's persona
// Not on any cron — nothing invokes this automatically.
import { setStarPersona } from "@/lib/star-agent/persona";
import { runStarAgentTick } from "@/lib/star-agent/run-star-agent";
import type { StarPersona } from "@/lib/star-agent/types";

export const runtime = "nodejs";

function parsePersona(value: unknown): StarPersona | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const input = value as Record<string, unknown>;
  const str = (key: string) =>
    typeof input[key] === "string" ? (input[key] as string).trim() : "";
  const arr = (key: string) =>
    Array.isArray(input[key]) &&
    input[key].every((item) => typeof item === "string")
      ? (input[key] as string[])
      : null;

  const starId = str("starId");
  const displayName = str("displayName");
  const voice = str("voice");
  const themes = arr("themes");
  const doNots = arr("doNots");
  const postingCadence = str("postingCadence");
  const riskLevel = input.riskLevel;

  if (
    !starId ||
    !displayName ||
    !voice ||
    !themes ||
    !doNots ||
    !postingCadence ||
    (riskLevel !== "low" && riskLevel !== "medium" && riskLevel !== "high")
  ) {
    return null;
  }

  return {
    starId,
    displayName,
    voice,
    themes,
    doNots,
    postingCadence,
    riskLevel,
  };
}

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

  let body: {
    action?: unknown;
    starId?: unknown;
    mode?: unknown;
    persona?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.action === "setPersona") {
    const persona = parsePersona(body.persona);
    if (!persona) {
      return Response.json({ error: "Invalid persona." }, { status: 400 });
    }
    const ok = await setStarPersona(persona);
    return Response.json({ ok, starId: persona.starId }, {
      status: ok ? 200 : 500,
    });
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
