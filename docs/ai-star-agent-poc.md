# AI Star Agent — PoC Design

Goal: make **one** AI Star autonomous (perceive → decide → act → remember → build reputation) on the **existing stack**, without adopting an external character-agent runtime. Build a thin, owned agent loop; buy only the memory layer.

This is a design doc. No code is written yet. Payments stay **mock-only**, consistent with the rest of FanLetter.

## Why build-on-stack (not ElizaOS)

The hard parts already exist in this repo:

| Capability | Existing module |
|---|---|
| Reputation graph (AI Star is already a 1st-class actor) | `src/lib/agentrank/*` — `AgentRankActorType = "ai_star"`, `recordFanletterAgentRankServerEvent()` |
| Agent payments (mock) | `x402_mock_payment_intent` event + creator mock launch flow |
| Content generation | FAL image/video services (`content-service.ts`, `FAL_*` env) |
| Tokenomics / network | CP, founders, universes, `fanletter-founder-*` services |
| Data | MongoDB collections |

The missing piece is only the **agent loop** that strings these together. That is small and best kept native (TS, in the Next.js app). ElizaOS is a useful *design reference* (character file = persona, providers = context, actions = tools, evaluators = post-step learning) but adopting it as a runtime means porting this data model into a foreign, fast-churning framework.

## Architecture (one AI Star = one agent)

```
trigger (cron / fan event)
        │
        ▼
  load Star context ──► persona (character file)  +  memory (Mem0/Zep)  +  recent feed/AgentRank signals
        │
        ▼
   LLM brain (Vercel AI SDK, tool-calling)  ──► decides: post? respond? x402 intent? idle?
        │
        ▼
   execute tool(s)  ──► generateContent(FAL) · postToFeed · respondToFan · x402MockIntent
        │
        ▼
   record AgentRank reputation event(s)  (actor: ai_star)  +  write memory  +  trackFunnelEvent
```

## New modules (mapped to this repo)

```
src/lib/star-agent/
  persona.ts          # Star persona schema + loader (character-file equivalent)
  memory.ts           # thin adapter over Mem0 or Zep (get/append per starId)
  tools.ts            # tool definitions wrapping EXISTING services (no new business logic)
  brain.ts            # Vercel AI SDK agent: prompt = persona + memory + signals; tool-calling loop
  run-star-agent.ts   # orchestrator: load → decide → act → record → remember
src/app/api/internal/star-agent/route.ts   # POST { starId } — invokes one tick (auth: INTERNAL_KEY, like content-automation)
scripts/run-star-agent.mjs                  # local/remote trigger (mirrors existing scripts/*.mjs)
```

### Tools (wrap existing services — agent gets no raw power)
- `generateContent({ starId, brief })` → existing FAL content service. Returns a draft (not auto-published).
- `postToFeed({ starId, contentId })` → existing content/feed write path. **Gated**: draft → review → publish (reuse the existing draft/review pattern).
- `respondToFan({ starId, requestId, message })` → existing fan-request service.
- `recordReputation({ ... })` → `recordFanletterAgentRankServerEvent` with `actor.type = "ai_star"`.
- `x402MockIntent({ ... })` → existing `x402_mock_payment_intent` path. **Mock only.**

### Persona (character-file equivalent)
Per-Star document: `{ starId, displayName, voice, themes, doNots, postingCadence, riskLevel }`. Stored alongside the Star record in MongoDB. Drives the system prompt.

### Memory (the one thing to buy)
Adopt **Mem0** (or **Zep/Graphiti**) keyed by `starId`: stores fan interactions, past posts, learned preferences. Don't build this. Inject top-K relevant memories into the prompt; append after each tick.

## Trigger / scheduling
- **Phase 1**: manual/cron tick via `scripts/run-star-agent.mjs` (mirrors `content-automation:run`, `notifications:backfill`).
- **Phase 2**: Vercel cron or a queue, one tick per Star on a cadence; fan events (new request/comment) can also trigger a reactive tick.

## Reputation integration (the differentiator)
Every agent action emits an AgentRank reputation event with `actor.type = "ai_star"`, so autonomous Star activity flows into the **same** score/coverage/ledger UI already built. New event types may be added (e.g. `ai_star_posted`, `ai_star_responded`) reusing the existing schema + funnel tracking pattern.

## Dependencies to add (decided: Vercel AI SDK + Mem0, OpenAI brain)
- `ai` + `@ai-sdk/openai` (Vercel AI SDK) — provider-agnostic tool-calling in TS. OpenAI is the default brain (reuses the existing OpenAI/Codex key); the provider line is a one-line swap to A/B Claude later.
- `mem0ai` — memory layer.
- Env: `OPENAI_API_KEY`, `MEM0_API_KEY` (user-provided; never committed).

## Phased rollout
1. **Read-only dry run**: agent *decides + drafts* but never publishes; log decisions + would-be AgentRank events. Validate persona quality.
2. **Human-in-the-loop publish**: drafts go to the existing review queue; a human approves.
3. **Autonomous within guardrails**: auto-publish low-risk content types; keep x402 mock; rate-limit per Star.
4. Scale to N Stars; add Star↔Star interaction only after single-Star is solid.

## Guardrails / open decisions
- Keep payments **mock-only** until a deliberate go-live decision (matches current rule).
- One Star, one tool, one cadence first — expand incrementally.
- Stack (decided): **Vercel AI SDK + `@ai-sdk/openai` + Mem0**, with OpenAI as the default brain (provider-agnostic, so Claude can be A/B'd with a one-line model swap).
- Concurrency with Codex: this is net-new under `src/lib/star-agent/` + one API route + one script — low collision risk with current founder/UI work.
