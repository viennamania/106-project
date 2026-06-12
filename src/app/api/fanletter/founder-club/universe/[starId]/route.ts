import { getFanletterFounderUniverseExplorer } from "@/lib/fanletter-founder-universe-explorer-service";
import { normalizeFanletterStarId } from "@/lib/fanletter-routing";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

function jsonError(message: string, status: number) {
  return Response.json(
    { error: message },
    {
      headers: noStoreHeaders,
      status,
    },
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ starId: string }> },
) {
  const { starId: rawStarId } = await context.params;
  const starId = normalizeFanletterStarId(decodeURIComponent(rawStarId));

  if (!starId) {
    return jsonError("Invalid AI Star ID.", 400);
  }

  const universe = await getFanletterFounderUniverseExplorer(starId);

  if (!universe) {
    return jsonError("Star Universe not found.", 404);
  }

  return Response.json({ universe }, { headers: noStoreHeaders });
}
