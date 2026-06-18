# AI Star Agent — PoC Design

Goal: make **one** AI Star autonomous (perceive → decide → act → remember → build reputation) on the **existing stack**, without adopting an external character-agent runtime. Build a thin, owned agent loop; buy only the memory layer.

Payments stay **mock-only**, consistent with the rest of FanLetter.

## Status — built & verified (2026-06)

Built end-to-end and **verified live with real gpt-4o**. All on `main`, dry-run safe.

| Slice | Commit | State |
|---|---|---|
| Phase 0 scaffold (`src/lib/star-agent/`) | `6d0cc04e` | ✅ |
| Phase 1: OpenAI brain + Mem0 + gated route | `0c7a3070` | ✅ |
| Dev bundle fix (mem0 native deps externalized) | `91749220` | ✅ |
| Phase 1.5: per-Star persona (MongoDB) + cadence cap | `4d8cc196` | ✅ |
| `setPersona` admin action on the route | `3b952d19` | ✅ |
| Railway cron worker (`railway/star-agent-cron`) | `cac68eec` | ✅ |

**Verified live (local, real OpenAI):** default persona → "daily vlog / morning routine" briefs; seeded "Yuna (K-pop dancer)" persona → "choreography breakdown" brief (per-Star persona persistence works); cadence cap held (3 actions → 1); gate works (503 without key); reputation **intents** (`actor: ai_star`) emitted; dry-run = no side effects.

**Not yet wired (the productionize step):** real tool execution (FAL gen / feed publish / fan-request) and actual AgentRank reputation *recording*. Tools currently describe ("would do X") and reputation is an emitted *intent*, not a DB write.

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

## Operating it

**Local — one tick:**
```
nvm use 20.18.0
# `corepack pnpm dev` may fail (corepack bundled with Node 20.18 has a stale
# signing key for pnpm 10.32.0). If so, run next directly:
STAR_AGENT_INTERNAL_KEY=dev-secret ./node_modules/.bin/next dev
# then, in another shell:
curl -s -X POST localhost:3000/api/internal/star-agent \
  -H 'content-type: application/json' -H 'x-internal-key: dev-secret' \
  -d '{"starId":"<id>"}' | jq            # add "mode":"live" to persist memory
# seed a persona:
curl ... -d '{"action":"setPersona","persona":{ ...StarPersona... }}'
```

**Scheduled (Railway cron — `railway/star-agent-cron`):**
1. Vercel app env: set `STAR_AGENT_INTERNAL_KEY` (the route is 503 until this is set).
2. Railway: new service from `railway/star-agent-cron/`; env `STAR_AGENT_RUN_URL`, `STAR_AGENT_INTERNAL_KEY` (same value), `STAR_AGENT_CRON_STAR_IDS`, `STAR_AGENT_CRON_MODE=dry_run`.
3. Cron `0 */12 * * *` (in railway.json) — adjust as needed.

App env: `OPENAI_API_KEY`, `MEM0_API_KEY` (never committed). Optional: `STAR_AGENT_OPENAI_MODEL` (default `gpt-4o`), `STAR_AGENT_MAX_ACTIONS` (default 2), `MONGODB_STAR_AGENT_PERSONAS_COLLECTION` (default `starAgentPersonas`).

## Reputation integration (the differentiator)
Every agent action emits an AgentRank reputation event with `actor.type = "ai_star"`, so autonomous Star activity flows into the **same** score/coverage/ledger UI already built. New event types may be added (e.g. `ai_star_posted`, `ai_star_responded`) reusing the existing schema + funnel tracking pattern.

## Dependencies to add (decided: Vercel AI SDK + Mem0, OpenAI brain)
- `ai` + `@ai-sdk/openai` (Vercel AI SDK) — provider-agnostic tool-calling in TS. OpenAI is the default brain (reuses the existing OpenAI/Codex key); the provider line is a one-line swap to A/B Claude later.
- `mem0ai` — memory layer.
- Env: `OPENAI_API_KEY`, `MEM0_API_KEY` (user-provided; never committed).

## Phased rollout
1. ✅ **Read-only dry run** — agent decides + would-draft; logs decisions + would-be reputation events. Persona quality validated live.
2. ⬜ **Human-in-the-loop publish** — drafts go to the existing review queue; a human approves.
3. ⬜ **Autonomous within guardrails** — auto-publish low-risk content types; keep x402 mock; rate-limit per Star.
4. ⬜ Scale to N Stars; add Star↔Star interaction only after single-Star is solid.

## Next (productionize) — prerequisites
1. **Product decision** (owner's call): review policy (all human-approved vs auto for low-risk), cadence, how many Stars. This shapes the rest.
2. **Real tool execution** behind a review gate: `generateContent → FAL` draft, `postToFeed → existing review queue`, `respondToFan → fan-request service`. Real cost / DB writes → keep live-gated, dry-run default.
3. **Reputation recording**: add `ai_star_*` to the `FunnelEventName` union, then call `recordFanletterAgentRankServerEvent(actor: ai_star)` in live mode so activity flows into the existing AgentRank score/ledger UI. ⚠️ funnel/AgentRank is **Codex-hot** — coordinate to avoid collision.
4. **Real signals** (replace the stub zeros): recent posts / pending fan requests / reputation total.
5. **Hermes Agent** (Nous Research, Railway one-click) — only if multi-channel social presence (Telegram/Discord/X) becomes a goal. Use it as a *shell* whose custom tool calls this app's star-agent route, not a replacement for the deep domain integration.

## Guardrails / open decisions
- Keep payments **mock-only** until a deliberate go-live decision (matches current rule).
- One Star, one tool, one cadence first — expand incrementally.
- Stack (decided): **Vercel AI SDK + `@ai-sdk/openai` + Mem0**, with OpenAI as the default brain (provider-agnostic, so Claude can be A/B'd with a one-line model swap).
- Concurrency with Codex: this is net-new under `src/lib/star-agent/` + one API route + one script — low collision risk with current founder/UI work.
