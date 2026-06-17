// AI Star persistent memory (Mem0 adapter).
// Each Star is a distinct Mem0 user (`star:<starId>`). Reads are best-effort —
// any failure (missing key, network, filter shape) degrades to no memories so a
// tick still runs. Writes only happen in live mode (see run-star-agent.ts).
import "server-only";

import MemoryClient from "mem0ai";

import type { StarMemoryEntry } from "./types";

let cachedClient: MemoryClient | null = null;

function getMemoryClient(): MemoryClient | null {
  const apiKey = process.env.MEM0_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = new MemoryClient({ apiKey });
  }
  return cachedClient;
}

function memoryUserId(starId: string): string {
  return `star:${starId}`;
}

export async function recallStarMemories(
  starId: string,
  query: string,
  limit = 6,
): Promise<StarMemoryEntry[]> {
  const client = getMemoryClient();
  if (!client) {
    return [];
  }

  try {
    const response = await client.search(query, {
      filters: { userId: memoryUserId(starId) },
      topK: limit,
    });
    const results = Array.isArray(response) ? response : response.results;

    return (results ?? []).slice(0, limit).map((entry, index) => ({
      id: entry.id ?? `mem-${index}`,
      starId,
      kind: "preference",
      text: entry.memory ?? "",
      createdAt:
        entry.createdAt instanceof Date
          ? entry.createdAt.toISOString()
          : new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function rememberStarTick(
  starId: string,
  text: string,
): Promise<boolean> {
  const client = getMemoryClient();
  if (!client) {
    return false;
  }

  try {
    await client.add([{ role: "assistant", content: text }], {
      userId: memoryUserId(starId),
    });
    return true;
  } catch {
    return false;
  }
}
