import "server-only";

import { createHash } from "node:crypto";

export function stableAgentRankStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableAgentRankStringify).join(",")}]`;
  }

  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableAgentRankStringify(child)}`)
    .join(",")}}`;
}

export function sha256AgentRankPayload(value: unknown) {
  return createHash("sha256")
    .update(stableAgentRankStringify(value))
    .digest("hex");
}
