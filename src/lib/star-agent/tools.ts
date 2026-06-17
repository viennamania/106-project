// AI Star agent tools (PoC Phase 0).
// Tools are the ONLY way the agent affects the world — it gets no raw power.
// Phase 0 implements them as dry-run stubs that describe the action and the
// reputation event it would emit. Each maps to an existing service to wire next:
//
//   generateContent -> FAL content service (content-service.ts) — returns a draft
//   postToFeed      -> existing draft -> review -> publish path (kept gated)
//   respondToFan    -> fanletter-fan-request-service.ts
//   x402MockIntent  -> existing x402_mock_payment_intent path (MOCK ONLY)
//   (reputation)    -> recordFanletterAgentRankServerEvent, actor.type "ai_star"
import type {
  StarAgentReputationIntent,
  StarAgentToolCall,
  StarAgentToolResult,
} from "./types";

function reputationIntent(
  starId: string,
  type: string,
): StarAgentReputationIntent {
  return { type, actorType: "ai_star", starId };
}

export async function executeStarAgentTool(
  starId: string,
  call: StarAgentToolCall,
  options: { dryRun: boolean },
): Promise<StarAgentToolResult> {
  const { dryRun } = options;
  const base = { tool: call.tool, ok: true, dryRun } as const;

  switch (call.tool) {
    case "generateContent": {
      const brief = String(call.args.brief ?? "daily update");
      return {
        ...base,
        summary: dryRun
          ? `would generate content (FAL) for brief: "${brief}"`
          : `generated content draft for brief: "${brief}"`,
        reputationIntent: reputationIntent(starId, "ai_star_content_drafted"),
      };
    }
    case "postToFeed":
      return {
        ...base,
        summary: dryRun
          ? "would queue draft to the review gate (no publish)"
          : "queued draft to the review gate",
        reputationIntent: reputationIntent(starId, "ai_star_posted"),
      };
    case "respondToFan":
      return {
        ...base,
        summary: dryRun
          ? "would draft a reply to the pending fan request"
          : "drafted a reply to the pending fan request",
        reputationIntent: reputationIntent(starId, "ai_star_responded"),
      };
    case "x402MockIntent":
      return {
        ...base,
        summary: "x402 mock payment intent (mock only — never real funds)",
        reputationIntent: reputationIntent(starId, "x402_mock_payment_intent"),
      };
    case "idle":
      return {
        ...base,
        summary: "idle (no action this tick)",
        reputationIntent: null,
      };
    default: {
      const exhaustiveCheck: never = call.tool;
      return {
        tool: exhaustiveCheck,
        ok: false,
        dryRun,
        summary: `unknown tool`,
        reputationIntent: null,
      };
    }
  }
}
