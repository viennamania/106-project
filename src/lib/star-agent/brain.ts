// AI Star agent "brain" — decision layer (PoC Phase 0).
// The brain turns context into a decision (which tools to call). Phase 0 ships a
// deterministic mock brain (no LLM, no deps) so the loop is testable end-to-end.
//
// TODO(phase 1): add LlmStarAgentBrain implemented with the Vercel AI SDK (`ai`)
// using tool-calling, where the prompt = persona + retrieved memories + signals,
// and the default model is the latest Claude. The mock brain stays as a cheap
// offline fallback / test double.
import type { StarAgentContext, StarAgentDecision } from "./types";

export interface StarAgentBrain {
  decide(context: StarAgentContext): Promise<StarAgentDecision>;
}

export const mockStarAgentBrain: StarAgentBrain = {
  async decide(context): Promise<StarAgentDecision> {
    const { persona, signals } = context;

    if (signals.pendingFanRequests > 0) {
      return {
        toolCalls: [
          {
            tool: "respondToFan",
            args: { tone: persona.voice },
            rationale: `${signals.pendingFanRequests} pending fan request(s)`,
          },
        ],
        note: "mock: prioritize fan engagement",
      };
    }

    if (signals.recentPosts < 1) {
      return {
        toolCalls: [
          {
            tool: "generateContent",
            args: { brief: persona.themes[0] ?? "daily update" },
            rationale: "no recent post within cadence",
          },
          {
            tool: "postToFeed",
            args: {},
            rationale: "publish the generated draft (gated by review)",
          },
        ],
        note: "mock: produce a cadence post",
      };
    }

    return {
      toolCalls: [{ tool: "idle", args: {}, rationale: "cadence satisfied" }],
      note: "mock: idle this tick",
    };
  },
};
