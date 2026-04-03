# Next.js Landing Rebuild Plan

## Goal

Rebuild the current Gamma sales page as a first-party Next.js landing inside this repo while preserving:

- locale-aware routing under `/{lang}`
- referral handoff into the wallet signup flow
- existing member activation, payment verification, and referrals backend

The landing should improve trust, reduce regulatory risk in the copy, and separate marketing from the authenticated product flow.

## Current state

Today the root localized route `src/app/[lang]/page.tsx` renders `SmartWalletApp` directly.

That mixes three concerns in one route:

1. marketing and positioning
2. wallet activation and payment
3. post-signup member/referral dashboard

This makes the home route heavy, request-time, and hard to optimize for either SEO or conversion clarity.

## Proposed route architecture

Keep the locale root as the public marketing landing, and move the current wallet-driven experience to a dedicated route.

```text
src/app/page.tsx                        # locale redirect, keep
src/app/[lang]/layout.tsx              # locale metadata shell, keep
src/app/[lang]/page.tsx                # new static landing page
src/app/[lang]/activate/page.tsx       # wallet signup / payment flow
src/app/[lang]/referrals/page.tsx      # member referral dashboard, keep
src/app/robots.ts                      # indexability control
src/app/sitemap.ts                     # sitemap
src/app/opengraph-image.tsx            # share image
src/components/landing/*               # new landing sections
```

## Why this split

- The landing should be mostly static for performance and shareability.
- The activation flow is inherently dynamic because it depends on wallet state, query params, and member lookup.
- The referral dashboard is already a product surface and should remain separate.

This matches the App Router model well:

- `page.tsx` is the route leaf for the public landing.
- localized metadata stays in `src/app/[lang]/layout.tsx`
- route-level metadata should use the Metadata API, not manual `<head>` tags

I checked the local Next.js 16 docs for `page`, `layout`, and metadata before drafting this plan.

## Rendering strategy

### `src/app/[lang]/page.tsx`

Make the landing a Server Component with no request-time data.

- No DB calls
- No `searchParams` on the server
- No wallet hooks
- No referral validation on first render

Result:

- static generation per locale
- better TTFB and cacheability
- simpler metadata and OG handling

### Referral code handoff

The current landing URL may arrive with `?ref=CODE`.

Do not validate that code on the landing route.

Instead:

- read `ref` in a tiny client CTA helper with `useSearchParams`
- append it to the primary CTA URL: `/{lang}/activate?ref=CODE`
- validate the referral only inside `activate/page.tsx`

This keeps the landing static while preserving campaign/referral attribution.

## UX structure

The Gamma page is persuasive but over-indexes on guaranteed-return style claims.
The rebuilt landing should keep the same funnel logic but present it as a product onboarding surface, not an aggressive earnings pitch.

### Section map

1. Hero
   - one-line value proposition
   - low-friction entry point
   - primary CTA to `/{lang}/activate`
   - secondary CTA to “How it works”
2. Trust strip
   - BSC
   - 10 USDT activation
   - email-based smart wallet
   - webhook-confirmed completion
3. How it works
   - connect email wallet
   - send exact `10 USDT`
   - webhook/payment verification
   - receive member/referral state
4. Why this model
   - low entry amount
   - automated processing
   - referral network visibility
   - global access
5. Referral mechanics
   - explain direct referral capacity
   - explain automatic completion logic carefully
   - show what is algorithmic vs what is user-driven
6. Proof and transparency
   - project wallet address
   - webhook verification
   - transaction traceability
   - payout rules and limits
7. FAQ
   - what happens after payment
   - what counts as a valid payment
   - how referral codes work
   - when status changes
   - what risks and limitations exist
8. Final CTA
   - activation CTA
   - legal/risk note

## Copy direction

### Keep

- low entry point
- exact amount requirement
- automation
- global access
- referral mechanics

### Remove or rewrite

These should not survive into the Next.js landing in their current form:

- `리스크 제로`
- guaranteed-profit framing
- inevitability language
- exaggerated compounding promises
- “선점하면 자동으로 돈이 쌓인다” style copy

### Replace with

- product/process language
- verification language
- operational clarity
- conditional outcomes
- explicit limitations

Examples:

- `리스크 제로` -> `낮은 초기 참여 비용`
- `즉시 현금화` -> `조건 충족 시 출금 가능 상태 반영`
- `24시간 자동 수익 시스템` -> `24시간 자동 검증 및 상태 반영`
- `$12에서 $44,796` -> remove from hero flow unless legally defensible and provable

## Visual direction

Do not mimic Gamma slide aesthetics directly.

Use a product-brand direction that feels more like an on-chain operations dashboard crossed with a premium landing page.

### Recommended visual language

- base: warm ivory and slate, not pure white
- accent: deep blue + emerald + restrained amber
- surfaces: frosted cards only where hierarchy matters
- typography: keep `Space Grotesk` and `IBM Plex Mono` already configured
- numerics: monospace for wallet, amounts, timestamps, route stats
- motion: one hero entrance, one CTA hover system, no decorative over-animation

### Visual hierarchy

- hero should be bold, not busy
- one dominant CTA
- one supporting diagram
- proof blocks should look operational, not speculative

## Component architecture

Create a separate landing component family rather than expanding `SmartWalletApp`.

```text
src/components/landing/landing-page.tsx
src/components/landing/hero-section.tsx
src/components/landing/trust-strip.tsx
src/components/landing/how-it-works.tsx
src/components/landing/value-grid.tsx
src/components/landing/referral-mechanics.tsx
src/components/landing/proof-panel.tsx
src/components/landing/faq-section.tsx
src/components/landing/final-cta.tsx
src/components/landing/referral-aware-cta.tsx   # client component
```

### Boundaries

- Landing sections: mostly Server Components
- `referral-aware-cta.tsx`: Client Component
- `SmartWalletApp`: move unchanged into the activation route first, then trim later

## Content model

Do not keep landing copy inside the existing `Dictionary` shape unless you are ready to refactor the entire app copy model.

Preferred approach:

```text
src/lib/marketing-copy.ts
```

This file should export per-locale landing content with a shape like:

```ts
type LandingCopy = {
  meta: { title: string; description: string }
  hero: { eyebrow: string; title: string; description: string; primaryCta: string; secondaryCta: string }
  trust: Array<{ label: string; value: string }>
  steps: Array<{ title: string; description: string }>
  values: Array<{ title: string; description: string }>
  referral: { title: string; description: string; bullets: string[] }
  proof: { title: string; bullets: string[] }
  faq: Array<{ question: string; answer: string }>
  legal: { note: string }
}
```

This avoids making `src/lib/i18n.ts` even larger than it already is.

## Metadata and SEO

The Gamma page currently serves `noindex, nofollow`, which is fine for a slide site but wrong for an owned landing once it is ready for public traffic.

### Next.js plan

- keep root metadata in `src/app/layout.tsx`
- generate locale-specific page metadata in `src/app/[lang]/page.tsx` or `src/app/[lang]/layout.tsx`
- add:
  - `src/app/robots.ts`
  - `src/app/sitemap.ts`
  - `src/app/opengraph-image.tsx`

### Metadata requirements

- title per locale
- description per locale
- canonical by locale
- OG image that looks like product infrastructure, not a slide screenshot

## Legal and trust requirements

The current Gamma page is vulnerable on trust and compliance. The rebuilt landing should ship with visible guardrails.

Minimum additions:

- operator/entity disclosure
- contact or support channel
- terms link
- privacy link
- risk disclosure
- regional eligibility note if applicable
- clear statement of what is and is not guaranteed

If these documents do not exist yet, the landing should include placeholder routes and soft-launch copy until they do.

## Integration with existing product flow

### Activation route

Move the current logic from `src/app/[lang]/page.tsx` into:

```text
src/app/[lang]/activate/page.tsx
```

This route can continue to:

- read `searchParams.ref`
- call `getIncomingReferralState`
- render `SmartWalletApp`
- pass `projectWallet`

### Referral route

Keep:

```text
src/app/[lang]/referrals/page.tsx
```

But update internal navigation so the landing points to activation first, then referrals after completion.

## Implementation phases

### Phase 1: Route split

- move current localized home logic into `activate/page.tsx`
- replace localized home with a static landing shell
- preserve locale redirect from `/` to `/{lang}`

### Phase 2: Landing sections

- implement hero, trust strip, how-it-works, value grid, proof, FAQ, final CTA
- add referral-aware CTA client helper

### Phase 3: Metadata and share assets

- proper metadata
- OG image
- `robots.ts`
- `sitemap.ts`

### Phase 4: Trust layer

- legal links
- risk disclosure
- operator/support block

### Phase 5: Conversion polish

- event tracking on CTA clicks
- scroll depth and section engagement
- A/B test hero variants if needed

## File-by-file migration plan

### Keep

- `src/app/page.tsx`
- `src/app/[lang]/layout.tsx`
- `src/components/smart-wallet-app.tsx`
- existing member/referral APIs

### Change

- `src/app/[lang]/page.tsx`
  - from wallet-first page
  - to static marketing landing

### Add

- `src/app/[lang]/activate/page.tsx`
- `src/components/landing/*`
- `src/lib/marketing-copy.ts`
- metadata files in `src/app`

## Success criteria

- landing route is static per locale
- activation route preserves `ref` and existing signup flow
- homepage messaging is clearer and less legally fragile
- page looks like a real product landing, not a hosted slide deck
- metadata and sharing are owned by the app, not Gamma

## Suggested first build

If implementation starts immediately, the first PR should only do this:

1. split `/{lang}` and `/{lang}/activate`
2. add a minimal but polished landing
3. preserve all current wallet/referral functionality
4. ship locale metadata and CTA handoff

That gets the architecture right before any deeper visual or copy iteration.
