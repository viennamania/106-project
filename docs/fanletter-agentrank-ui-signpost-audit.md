# FanLetter / AgentRank UI Signpost Audit

FanLetter is AgentRank Phase 1: AI Star Discovery, Founder Network, Creator Journey, and AI Star Universe should create Reputation Events without making users learn AgentRank terminology first.

## Design Dial

- Consumer pages: mobile-first, black/white base, one accent, one main CTA.
- Founder / Universe pages: map and role state first, copy second.
- Creator pages: eligibility, next condition, and mock launch intent must be visually separate.
- AgentRank pages: evidence, score impact, and next operational action should be visible without dense explanations.
- Motion: low intensity. Use panel transitions, subtle hover, progress, and status changes only.

## Page Priorities

### `/ko/fanletter`

- Current risk: discovery, founder, scout, creator, and AgentRank concepts can compete for attention.
- Primary state: "AI Star Discovery".
- Primary CTA: discover an AI Star.
- Next improvement: make the first screen a compact product console with one CTA, 3-star video preview, and a small flow strip: discover -> join -> share -> reward.
- Reputation result: "Discovery event starts your AgentRank trail" should appear after action context, not in the hero headline.

### `/ko/fanletter/[starId]`

- Current risk: join, account connect, referral preview, and universe explanation can feel like separate tasks.
- Primary state: selected AI Star and user's join readiness.
- Primary CTA: join or connect account, depending on state.
- Next improvement: keep the join step as a single action card, move referral and reputation detail into a bottom sheet / side panel.
- Reputation result: founder join and referral share events should be shown as action receipts.

### `/ko/fanletter/[starId]/universe`

- Current risk: visual richness can obscure the selected member, tier, and next action.
- Primary state: selected Star Universe and user's Founder Network tier.
- Primary CTA: inspect member / invite next founder, depending on view context.
- Next improvement: give the center AI Star, selected tier, and next node a stable visual hierarchy; move detailed member stats into panel.
- Reputation result: universe growth and lineage events should be exposed as evidence links.

### `/ko/fanletter/creator-unlock`

- Current risk: eligibility, source universe, and mock payment intent can look like one blended form.
- Primary state: Creator permission activation progress.
- Primary CTA: complete the next missing condition or create mock launch intent when eligible.
- Next improvement: use a vertical progress state on mobile; source Star Universe selection opens detail panel, not dense cards.
- Reputation result: source universe selected, creator evaluated, and x402 mock intent should each have a clear receipt state.

### `/ko/fanletter/agentrank`

- Current risk: investor narrative, event ledger, score, and coverage all compete.
- Primary state: AgentRank score readiness for the selected AI Star.
- Primary CTA: review missing coverage or inspect evidence packet.
- Next improvement: make score, coverage gap, and next action the top row; move infographic and formulas below.
- Reputation result: score changes should link to event evidence and oracle packet readiness.

### `/ko/fanletter/agentrank/events`

- Current risk: tables/lists can feel operational without explaining why an event matters.
- Primary state: Event Ledger filter and selected event quality.
- Primary CTA: inspect event or review queue action.
- Next improvement: keep filters compact; use side panel / bottom sheet for event impact, evidence, and review receipts.
- Reputation result: every review action should produce or preview a review receipt.

## Implementation Queue

1. Home first screen: reduce competing CTAs and expose one discovery action.
2. Star detail join card: consolidate account connect / founder join / referral state.
3. Universe member panel: make selected member/tier details panel-based.
4. Creator unlock: split eligibility, source universe, and mock launch intent.
5. AgentRank overview: score readiness and coverage gap first, narrative second.
6. Event ledger: panel-based event inspection and receipt-first review actions.

## Validation

- Mobile has no horizontal scroll at 390px width.
- Button text remains visible in Korean.
- Each screen has one main CTA and at most two secondary actions.
- Panel/modal does not open on page entry.
- Payment stays mock-only.
- "해금" is not introduced; use "권한 활성화".
- New meaningful actions reuse existing AgentRank event or funnel tracking patterns.
