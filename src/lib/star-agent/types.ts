// AI Star agent — core types (PoC Phase 0).
// See docs/ai-star-agent-poc.md. This module is intentionally self-contained and
// has no dependencies and no wiring yet: nothing imports it at runtime, so it
// has zero effect on the deployed app. The next phase wires the tools to the
// existing services (FAL content gen, fan-request, AgentRank) and swaps the
// mock brain for an LLM brain (Vercel AI SDK).

export type StarAgentToolName =
  | "generateContent"
  | "postToFeed"
  | "respondToFan"
  | "x402MockIntent"
  | "idle";

export type StarAgentRiskLevel = "low" | "medium" | "high";

/** Character-file equivalent: drives the agent's system prompt. */
export interface StarPersona {
  starId: string;
  displayName: string;
  voice: string;
  themes: string[];
  doNots: string[];
  postingCadence: string;
  riskLevel: StarAgentRiskLevel;
}

export interface StarMemoryEntry {
  id: string;
  starId: string;
  kind: "fan_interaction" | "post" | "preference" | "event";
  text: string;
  createdAt: string;
}

/** Lightweight snapshot the agent perceives each tick. */
export interface StarAgentSignals {
  recentPosts: number;
  pendingFanRequests: number;
  reputationImpactTotal: number | null;
}

export interface StarAgentContext {
  persona: StarPersona;
  memories: StarMemoryEntry[];
  signals: StarAgentSignals;
  now: string;
}

export interface StarAgentToolCall {
  tool: StarAgentToolName;
  args: Record<string, unknown>;
  rationale: string;
}

export interface StarAgentDecision {
  toolCalls: StarAgentToolCall[];
  note: string;
}

/** A would-be AgentRank reputation event (actor.type = "ai_star"). */
export interface StarAgentReputationIntent {
  type: string;
  actorType: "ai_star";
  starId: string;
}

export interface StarAgentToolResult {
  tool: StarAgentToolName;
  ok: boolean;
  dryRun: boolean;
  /** Human-readable summary; in dry-run this is the "would do X" description. */
  summary: string;
  /** The reputation event this action would (dry-run) or did (live) emit. */
  reputationIntent: StarAgentReputationIntent | null;
}

export type StarAgentMode = "dry_run" | "live";

export interface StarAgentTickResult {
  starId: string;
  mode: StarAgentMode;
  decision: StarAgentDecision;
  toolResults: StarAgentToolResult[];
  memoryWrites: number;
  at: string;
}
