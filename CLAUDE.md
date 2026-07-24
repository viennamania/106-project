@AGENTS.md

# CLAUDE.md

Guidance for AI assistants (Claude Code and others) working in this repository.

> **Read `AGENTS.md` first (imported above).** This project runs **Next.js 16**,
> which has breaking changes vs. older Next.js. Before writing framework code,
> consult the relevant guide in `node_modules/next/dist/docs/` and heed
> deprecation notices. Do not assume App Router APIs behave as they did in
> Next.js 13–15.

## What this project is

A mobile-first web app (package name `aiavpark`, README title "Pocket Smart
Wallet", production domain `https://1066.loot.menu`). It combines a
**thirdweb Smart Wallet** onboarding/rewards flow with a large **"Fanletter"**
product surface (AI star creators, an AI-generated news/content platform,
referral network, campaigns, and an "AgentRank" reputation system).

Core user flow (see `README.md` for the authoritative walkthrough):
1. Connect an email-based thirdweb Smart Wallet (BSC, email OTP only).
2. Send exactly **10 USDT** on BSC to `PROJECT_WALLET`.
3. A thirdweb Insight webhook confirms the deposit → member status goes
   `pending_payment` → `completed`, and a referral code is issued.
4. Rewards (points, Silver/Gold/VIP NFTs) and the referral network build on top.

## Tech stack

- **Next.js 16.2.1** App Router + **Turbopack** (`turbopack.root` pinned in `next.config.ts`)
- **React 19.2.4** / React DOM 19.2.4
- **TypeScript 5**, `strict: true`, `noEmit` (type-check only)
- **Tailwind CSS v4** (`@tailwindcss/postcss`), shadcn-style setup (`components.json`, "new-york", lucide icons)
- **thirdweb v5** — Smart Wallet / account abstraction on BSC, USDT
- **MongoDB Atlas** (`mongodb` driver) — all persistence
- **AI SDK** (`ai` v6, `@ai-sdk/openai`), **fal-ai**, **replicate**, **mem0ai** — content/video/image generation
- **web-push** (VAPID) — push notifications; **@vercel/blob** — media storage
- **pnpm 10.32.0** (see `packageManager`); Node **>= 20.9.0** required for `next build`

## Repository layout

```
src/
  app/                     # Next.js App Router
    layout.tsx             # root layout, PWA manifest/icons, OG images
    page.tsx               # root landing page (its own landing-language set)
    [lang]/                # localized app; lang ∈ ko|en|ja|zh|vi|id
      layout.tsx           # locale layout: generateStaticParams + dictionary
      (thirdweb)/          # route group for wallet-runtime pages (wallet, rewards, referrals, content, fanletter…)
      fanletter/           # Fanletter product (AI stars, news, campaigns, founder-club, agentrank…)
      content/ lookbook/ referral/ disclaimer/
    api/                   # 115 route handlers (route.ts) — see below
  components/              # ~1 file-per-page/feature React components (mostly "use client")
    ui/                    # shadcn primitives (alias @/components/ui) — may be empty/lazily added
  lib/                     # business logic, data models, services (server-only where noted)
    agentrank/  star-agent/ # feature subpackages
  mock/                    # mock data (tiktok, social accounts, fanletter v2)
  types/                   # ambient .d.ts
scripts/                   # *.mjs operational CLIs (backfill / reconcile / audit / deploy)
railway/                   # standalone cron worker services (Dockerfile + railway.json each)
docs/                      # design/architecture notes
public/                    # static assets, landing images, service worker (sw.js)
output/                    # generated artifacts (OG images, playwright output)
```

### `src/app/api` — route handlers

115 `route.ts` handlers grouped by domain: `activity`, `announcements`,
`content`, `fanletter`, `funnel`, `health`, `internal`, `market`, `members`,
`notifications`, `og`, `points`, `referrals`, `rewards`, `seller`, `session`,
`wallet`, `webhooks`. Conventions:
- Return with `Response.json(...)`; small `jsonError(message, status)` helpers are common.
- Authenticated routes read the member session via `readMemberServerSession()` (`@/lib/member-server-session`).
- `api/internal/*` endpoints are protected by a Bearer token or `x-automation-key`.
- `api/webhooks/thirdweb` verifies thirdweb Insight signatures before processing BSC USDT transfers.

### `src/lib` — business logic

The heart of the app. Two file styles coexist:
- **Data/model modules** (e.g. `member.ts`, `points.ts`, `wallet.ts`, `content.ts`):
  document types, serializers, normalizers, constants.
- **Service modules** (`*-service.ts`): stateful/DB operations built on the models.

Key modules:
- `mongodb.ts` — the single source of DB access. Exposes `get<Collection>()`
  accessors typed against the model modules. **Always** go through these
  accessors; don't create ad-hoc `MongoClient`s. Marked `import "server-only"`.
- `i18n.ts` — `supportedLocales = [ko, en, ja, zh, vi, id]`, `defaultLocale = "ko"`,
  `Dictionary` type + `getDictionary`, `hasLocale`. Cookie name in `locale-constants.ts` (`preferred-locale`).
- `thirdweb-client.ts` / `thirdweb-server.ts` — client uses
  `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`; server prefers `THIRDWEB_SECRET_KEY`.
- `member*.ts`, `member-server-session.ts` — membership, sessions, referral tree.
- `rewards-nft.ts`, `points*.ts`, `silver-reward-claim*.ts` — rewards + NFT minting.
- `fanletter-*.ts` (~60 files) — the Fanletter product domain.
- `agentrank/`, `star-agent/` — reputation and AI-star agent subsystems.

## Conventions

- **Imports use the `@/*` alias** → `src/*` (see `tsconfig.json`). Component/lib
  aliases are defined in `components.json` (`@/components`, `@/components/ui`,
  `@/lib`, `@/lib/utils`, `@/hooks`).
- **`import "server-only"`** guards server-only libs (~80 files). Never import a
  `server-only` module into a client component. Server actions/handlers may.
- **`"use client"`** marks client components (~150 files). Most page-level
  components in `src/components/*-page.tsx` are client components.
- **Localization**: user-facing app routes live under `src/app/[lang]/`. Copy is
  supplied via dictionaries (`getDictionary`), not hardcoded strings. When adding
  locale-facing UI, extend the `Dictionary` type and all locales.
- **App Router async params**: route/layout `params` are Promises in this
  version — `const { lang } = await params;`. Follow existing pages, not older
  Next.js habits.
- **Icons**: `lucide-react`. **Styling**: Tailwind v4 utility classes; global
  styles in `src/app/globals.css`.
- **v0 compatibility**: `components.json` + aliases are hand-tuned so Vercel v0
  can round-trip components; keep the alias structure intact.

## Common commands

```bash
pnpm dev            # next dev (Turbopack)
pnpm build          # next build (requires Node >= 20.9.0)
pnpm start          # next start
pnpm lint           # eslint (flat config: eslint.config.mjs)
pnpm exec tsc --noEmit   # type-check (project is noEmit)
```

**Verify changes** the way the project does: `pnpm lint` and
`pnpm exec tsc --noEmit`. Run `pnpm build` only on Node >= 20.9.0.

### Operational scripts (`scripts/*.mjs`)

Many maintenance jobs are exposed as pnpm scripts (see `package.json` for the
full list). Categories:
- `referral-placement:*`, `referral-rewards:*` — referral tree migrate/repair/reconcile
- `reconcile:*` — signup / completed-member reconciliation (also run by Railway workers)
- `notifications:*` — backfill, test web-push
- `content-automation:run` — run creator content-automation profiles
- `fanletter:*` — many backfill/audit jobs (video metadata, founder-club, agentrank funnel, ai-star genealogy…)
- `rewards:nft:deploy` — deploy the rewards ERC721 contract; `thirdweb:webhooks:register` — register BSC USDT webhooks

### Railway workers (`railway/`)

Standalone containerized cron services, each with its own `Dockerfile`,
`railway.json`, and runner: `content-automation-cron` and `star-agent-cron`.
The public web app and the webhook-ingress API are deployed separately (see
`README.md` and `docs/railway-backend.md`; production API is a Railway service).

## Environment

Copy `.env.example` → `.env.local`. Notable groups (see `.env.example` and
`README.md` for the full, authoritative list):
- **thirdweb**: `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`, `THIRDWEB_SECRET_KEY`, `PROJECT_WALLET`, rewards-NFT + webhook vars
- **MongoDB**: `MONGODB_URI`, `MONGODB_DB_NAME`, and per-collection name overrides (`MONGODB_*_COLLECTION`)
- **AI / media**: `OPENAI_API_KEY`, `REPLICATE_API_TOKEN`, `FAL_KEY` + `FAL_CONTENT_VIDEO_*` / `OPENAI_CONTENT_*` tuning, `BLOB_READ_WRITE_TOKEN`
- **Push**: `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY`, `WEB_PUSH_VAPID_SUBJECT`
- **Ops**: `RECONCILE_*`, `CONTENT_AUTOMATION_*`, `MEMBER_SESSION_SECRET`

`.env*` files are gitignored — never commit secrets. Local Claude config
(`.claude/`) is also gitignored.

## Docs to consult

- `README.md` — setup, signup/webhook/rewards flows, Railway deploy notes (Korean, authoritative)
- `docs/railway-backend.md` — backend/worker deployment
- `docs/ai-star-agent-poc.md`, `docs/star-lookbook-module.md`, `docs/fanletter-agentrank-ui-signpost-audit.md`, `docs/nextjs-landing-rebuild-plan.md` — feature designs

## Notes for assistants

- This is a large, evolving codebase (~630 source files). Prefer reading the
  specific `lib/*` model + service pair and the neighboring route before editing.
- Match existing patterns: `Response.json`, `server-only` guards, dictionary-based
  copy, `@/` imports, per-collection accessors in `mongodb.ts`.
- Blockchain values are exact-match sensitive (e.g. "exactly 10 USDT"); don't
  loosen amount/address checks.
- When touching framework behavior, re-check `node_modules/next/dist/docs/` per
  `AGENTS.md` rather than relying on prior Next.js knowledge.
