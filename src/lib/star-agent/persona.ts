// AI Star persona loader (PoC Phase 0).
// TODO(phase 1): persist a persona document alongside the Star record in
// MongoDB and load it here. For now returns a safe default so the loop is
// runnable in dry-run.
import type { StarPersona } from "./types";

export function defaultStarPersona(starId: string): StarPersona {
  return {
    starId,
    displayName: starId,
    voice: "warm, playful, concise",
    themes: ["daily vlog", "fan shout-out", "behind the scenes"],
    doNots: ["no real-money promises", "no NSFW", "stay in character"],
    postingCadence: "1-2 posts per day",
    riskLevel: "low",
  };
}

export async function loadStarPersona(starId: string): Promise<StarPersona> {
  return defaultStarPersona(starId);
}
