// AI Star persona: per-Star voice/themes/guardrails, persisted in MongoDB.
// Loads a Star's persona document if present, else a safe default — so each
// Star can have its own character while the loop stays runnable for unseeded
// Stars. Self-contained: reuses the shared Mongo client, no edits to mongodb.ts.
import "server-only";

import { getMongoClient } from "@/lib/mongodb";

import type { StarPersona } from "./types";

const PERSONA_COLLECTION =
  process.env.MONGODB_STAR_AGENT_PERSONAS_COLLECTION ?? "starAgentPersonas";

type StarPersonaDocument = StarPersona & { updatedAt: Date };

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

async function getPersonaCollection() {
  const dbName = process.env.MONGODB_DB_NAME;
  if (!dbName) {
    return null;
  }
  const client = await getMongoClient();
  return client.db(dbName).collection<StarPersonaDocument>(PERSONA_COLLECTION);
}

export async function loadStarPersona(starId: string): Promise<StarPersona> {
  try {
    const collection = await getPersonaCollection();
    const doc = await collection?.findOne({ starId });
    if (doc) {
      return {
        starId: doc.starId,
        displayName: doc.displayName,
        voice: doc.voice,
        themes: doc.themes,
        doNots: doc.doNots,
        postingCadence: doc.postingCadence,
        riskLevel: doc.riskLevel,
      };
    }
  } catch {
    // Missing config / connection issues fall back to the default persona.
  }
  return defaultStarPersona(starId);
}

export async function setStarPersona(persona: StarPersona): Promise<boolean> {
  try {
    const collection = await getPersonaCollection();
    if (!collection) {
      return false;
    }
    await collection.updateOne(
      { starId: persona.starId },
      { $set: { ...persona, updatedAt: new Date() } },
      { upsert: true },
    );
    return true;
  } catch {
    return false;
  }
}
