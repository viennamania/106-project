// AI Star agent orchestrator.
// One tick: recall memory -> brain decides -> execute tools (dry-run gated) ->
// in live mode, persist a memory of the tick. Reputation recording via
// recordFanletterAgentRankServerEvent is intentionally NOT wired yet: the new
// ai_star event names must first be added to the FunnelEventName union. Until
// then each tool result carries a `reputationIntent` (the would-be event) for
// logging. Payments stay mock-only.
//
//   const result = await runStarAgentTick("legacy-star-fxbsq976");           // dry-run, LLM if key present
//   const result = await runStarAgentTick("...", { mode: "live" });          // persists memory
//   const result = await runStarAgentTick("...", { brain: mockStarAgentBrain }); // offline
import {
  createLlmStarAgentBrain,
  mockStarAgentBrain,
  type StarAgentBrain,
} from "./brain";
import { recallStarMemories, rememberStarTick } from "./memory";
import { loadStarPersona } from "./persona";
import { executeStarAgentTool } from "./tools";
import type {
  StarAgentContext,
  StarAgentMode,
  StarAgentSignals,
  StarAgentTickResult,
} from "./types";

const STAR_AGENT_MAX_ACTIONS = Math.max(
  1,
  Number(process.env.STAR_AGENT_MAX_ACTIONS) || 2,
);

function defaultBrain(): StarAgentBrain {
  return process.env.OPENAI_API_KEY?.trim()
    ? createLlmStarAgentBrain({ maxActions: STAR_AGENT_MAX_ACTIONS })
    : mockStarAgentBrain;
}

async function loadStarAgentContext(starId: string): Promise<StarAgentContext> {
  const persona = await loadStarPersona(starId);
  // TODO(phase 1.5): real signals from AgentRank/feed.
  const signals: StarAgentSignals = {
    recentPosts: 0,
    pendingFanRequests: 0,
    reputationImpactTotal: null,
  };
  const memories = await recallStarMemories(
    starId,
    `${persona.displayName} recent fan interactions and posting context`,
  );

  return {
    persona,
    memories,
    signals,
    now: new Date().toISOString(),
  };
}

export async function runStarAgentTick(
  starId: string,
  options: { mode?: StarAgentMode; brain?: StarAgentBrain } = {},
): Promise<StarAgentTickResult> {
  const mode = options.mode ?? "dry_run";
  const brain = options.brain ?? defaultBrain();

  const context = await loadStarAgentContext(starId);
  const rawDecision = await brain.decide(context);
  // Hard cap, in case the LLM ignores the prompt's max-actions instruction.
  const decision: typeof rawDecision = {
    ...rawDecision,
    toolCalls: rawDecision.toolCalls.slice(0, STAR_AGENT_MAX_ACTIONS),
  };

  const toolResults = await Promise.all(
    decision.toolCalls.map((call) =>
      executeStarAgentTool(starId, call, { dryRun: mode === "dry_run" }),
    ),
  );

  let memoryWrites = 0;
  if (mode === "live") {
    const summary = `Tick ${context.now}: ${decision.note}. Actions: ${toolResults
      .map((result) => result.summary)
      .join(" | ")}`;
    if (await rememberStarTick(starId, summary)) {
      memoryWrites = 1;
    }
  }

  return {
    starId,
    mode,
    decision,
    toolResults,
    memoryWrites,
    at: context.now,
  };
}
