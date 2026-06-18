// AI Star agent "brain" — decision layer.
// Two implementations:
//  - mockStarAgentBrain: deterministic, no LLM, for offline tests / fallback.
//  - createLlmStarAgentBrain(): OpenAI via the Vercel AI SDK (provider-agnostic
//    — swap the `openai(...)` model line for another provider to A/B). The brain
//    only DECIDES (returns tool calls); run-star-agent.ts executes them with
//    dry-run gating, so the LLM never triggers a real side effect directly.
import { openai } from "@ai-sdk/openai";
import { generateText, jsonSchema, tool } from "ai";

import type {
  StarAgentContext,
  StarAgentDecision,
  StarAgentToolCall,
  StarAgentToolName,
} from "./types";

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

// Tool definitions the LLM chooses from. No `execute`: the AI SDK returns the
// chosen calls instead of running them, so the orchestrator keeps control.
const emptyObjectSchema = jsonSchema({
  type: "object",
  properties: {},
  additionalProperties: false,
});

const decisionTools = {
  generateContent: tool({
    description: "Generate a new piece of content (vlog/post) for this AI Star.",
    inputSchema: jsonSchema({
      type: "object",
      properties: {
        brief: { type: "string", description: "Short brief / theme." },
      },
      required: ["brief"],
      additionalProperties: false,
    }),
  }),
  postToFeed: tool({
    description: "Queue the most recent draft to the feed (passes a review gate).",
    inputSchema: emptyObjectSchema,
  }),
  respondToFan: tool({
    description: "Draft a reply to a pending fan request in the Star's voice.",
    inputSchema: jsonSchema({
      type: "object",
      properties: {
        tone: { type: "string", description: "Optional tone hint." },
      },
      additionalProperties: false,
    }),
  }),
  x402MockIntent: tool({
    description: "Create a MOCK-ONLY x402 payment intent. Never moves real funds.",
    inputSchema: jsonSchema({
      type: "object",
      properties: {
        amountUsdt: { type: "number", description: "Mock amount in USDT." },
      },
      required: ["amountUsdt"],
      additionalProperties: false,
    }),
  }),
  idle: tool({
    description: "Do nothing this tick (cadence satisfied or nothing to do).",
    inputSchema: emptyObjectSchema,
  }),
};

function buildSystemPrompt(
  context: StarAgentContext,
  maxActions: number,
): string {
  const { persona, memories } = context;
  const memoryLines = memories.length
    ? memories.map((m) => `- ${m.text}`).join("\n")
    : "- (no relevant memories yet)";

  return [
    `You are the autonomous agent for the AI Star "${persona.displayName}".`,
    `Voice: ${persona.voice}.`,
    `Themes: ${persona.themes.join(", ")}.`,
    `Hard rules (never violate): ${persona.doNots.join("; ")}.`,
    `Posting cadence: ${persona.postingCadence}. Risk level: ${persona.riskLevel}.`,
    `Relevant memories:`,
    memoryLines,
    `Respect the posting cadence and do not over-post. Choose AT MOST ${maxActions} tool call(s) this tick, and prefer fewer. If the cadence is already satisfied or there is nothing worth doing, choose only "idle".`,
  ].join("\n");
}

function buildUserPrompt(context: StarAgentContext): string {
  const { signals, now } = context;
  return [
    `Now: ${now}.`,
    `Signals — recentPosts: ${signals.recentPosts}, pendingFanRequests: ${signals.pendingFanRequests}, reputationImpactTotal: ${signals.reputationImpactTotal ?? "n/a"}.`,
    `Decide this tick's action(s).`,
  ].join("\n");
}

export function createLlmStarAgentBrain(options?: {
  model?: string;
  maxActions?: number;
}): StarAgentBrain {
  const modelId =
    options?.model ?? process.env.STAR_AGENT_OPENAI_MODEL ?? "gpt-4o";
  const maxActions = Math.max(1, options?.maxActions ?? 2);

  return {
    async decide(context): Promise<StarAgentDecision> {
      const result = await generateText({
        model: openai(modelId),
        system: buildSystemPrompt(context, maxActions),
        prompt: buildUserPrompt(context),
        tools: decisionTools,
        toolChoice: "required",
      });

      const toolCalls: StarAgentToolCall[] = result.toolCalls.map((call) => ({
        tool: call.toolName as StarAgentToolName,
        args: (call.input ?? {}) as Record<string, unknown>,
        rationale: "llm",
      }));

      return {
        toolCalls: toolCalls.length
          ? toolCalls
          : [{ tool: "idle", args: {}, rationale: "no tool chosen" }],
        note: result.text || `llm decision (${modelId})`,
      };
    },
  };
}
