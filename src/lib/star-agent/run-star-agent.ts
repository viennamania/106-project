// AI Star agent orchestrator (PoC Phase 0).
// One tick: load context -> brain decides -> execute tools -> (would) record
// reputation + write memory. Phase 0 runs in dry-run with a mock brain and stub
// tools, so it is safe and side-effect-free. Invoke from a script or a test:
//
//   const result = await runStarAgentTick("legacy-star-fxbsq976");
//
// TODO(phase 1): load real memories (Mem0/Zep) and signals (AgentRank/feed),
// swap mockStarAgentBrain for the LLM brain, and in "live" mode actually call
// the wired tools + recordFanletterAgentRankServerEvent.
import { mockStarAgentBrain, type StarAgentBrain } from "./brain";
import { loadStarPersona } from "./persona";
import { executeStarAgentTool } from "./tools";
import type {
  StarAgentContext,
  StarAgentMode,
  StarAgentSignals,
  StarAgentTickResult,
  StarMemoryEntry,
} from "./types";

async function loadStarAgentContext(starId: string): Promise<StarAgentContext> {
  const persona = await loadStarPersona(starId);
  // TODO(phase 1): real retrieval.
  const memories: StarMemoryEntry[] = [];
  const signals: StarAgentSignals = {
    recentPosts: 0,
    pendingFanRequests: 0,
    reputationImpactTotal: null,
  };

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
  const brain = options.brain ?? mockStarAgentBrain;

  const context = await loadStarAgentContext(starId);
  const decision = await brain.decide(context);

  const toolResults = await Promise.all(
    decision.toolCalls.map((call) =>
      executeStarAgentTool(starId, call, { dryRun: mode === "dry_run" }),
    ),
  );

  return {
    starId,
    mode,
    decision,
    toolResults,
    memoryWrites: 0,
    at: context.now,
  };
}
