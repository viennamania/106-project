# Seller Lookbook — operations runbook

Operator guide for the crypto-free seller lookbook product (and the related
crypto member studio). Covers what runs where, the env vars, the async worker,
failure modes, security knobs, and the known external blockers.

For the Railway worker deploy mechanics specifically, see
[`railway-backend.md`](./railway-backend.md) (the "Seller lookbook worker" section).

## What it is

Sellers upload a garment photo and get an AI-star fashion lookbook — no wallet,
no crypto, no sign-up. Spending is in money-bought **credits** (1 credit = 1
shot). The model is always a consented fanletter **AI star** (resolved
server-side from `starId`).

- Public seller studio: `/[lang]/lookbook` (outside the thirdweb route group).
- Terms/license: `/[lang]/lookbook/terms` (draft — legal review pending).
- Crypto member studio: `/[lang]/fanletter/studio/lookbook` (points-based,
  wallet members) → `/api/fanletter/lookbook`.

## Request flow

```
Seller UI ──POST /api/seller/lookbook/job──▶ enqueue (charge credits, status=queued)
   │                                              │
   │  poll GET /api/seller/lookbook/job?jobId     ▼
   │                                   sellerLookbookJobs (Mongo)
   │                                              ▲ claim (atomic)
   │                          Railway lookbook-worker (continuous loop)
   │                                              │ POST /api/internal/seller-lookbook/process
   │                                              ▼ generate (OpenAI) → Blob → done + royalty
   └─ if job stays "queued" ~27s (worker down/busy):
        DELETE the queued job (refund) → fall back to POST /api/seller/lookbook (sync, on Vercel)
```

- **Async path** (default): heavy generation runs on the Railway worker, off the
  user-facing Vercel function.
- **Sync fallback**: if the worker is not draining, the client cancels+refunds
  the queued job and runs generation synchronously on Vercel (≤300s, so ≤4
  shots). The product keeps working even if the worker is down.
- **Batch**: one job per product (1 shot each), enqueued together and polled in
  parallel. The single worker drains them sequentially.

## Where it runs

| Piece | Where |
| --- | --- |
| Next app (UI + all API routes) | Vercel — project `106-loot` (scope `singal`), prod `https://www.net402.ai` |
| Async worker | Railway — account `genie1647`, project `famnote-ai-star-video`, service `lookbook-worker` (continuous, Dockerfile in `railway/lookbook-worker/`) |
| Data | MongoDB (`MONGODB_DB_NAME`) |
| Images | Vercel Blob (`t0gqytzvlsa2lapo.public.blob.vercel-storage.com`) |

## Environment variables

### Vercel (the Next app)

| Var | Purpose |
| --- | --- |
| `MONGODB_DB_NAME` (+ Mongo connection) | data store |
| `OPENAI_API_KEY` | lookbook image generation (gpt-image-1 edits) |
| `BLOB_READ_WRITE_TOKEN` | garment upload + generated image storage |
| `SELLER_JOB_WORKER_TOKEN` | **must match the worker** — authorizes the process route |
| `SELLER_TRIAL_WORKSPACES_PER_IP_PER_DAY` | optional, default `10` — trial-farming cap |
| `OPENAI_LOOKBOOK_MODEL` | optional, default `gpt-image-1` |
| `OPENAI_LOOKBOOK_INPUT_FIDELITY` | optional, default `high` |
| `NEXT_PUBLIC_SELLER_VIDEO_ENABLED` | `1` to show the video button (needs FAL access; off by default) |
| `FAL_KEY`, `FAL_LOOKBOOK_VIDEO_MODEL` | video generation (currently blocked — no model access) |
| `SELLER_PAYMENT_PROVIDER`, `PORTONE_STORE_ID`, `PORTONE_CHANNEL_KEY` | real credit purchases (PortOne — not yet configured) |

### Railway worker (`lookbook-worker`)

| Var | Purpose |
| --- | --- |
| `LOOKBOOK_PROCESS_URL` | full URL of the process route (e.g. `https://www.net402.ai/api/internal/seller-lookbook/process`) |
| `SELLER_JOB_WORKER_TOKEN` | same secret as on Vercel |
| `LOOKBOOK_WORKER_INTERVAL_MS` | idle poll interval when the queue is empty (default `5000`) |

To activate the async pipeline: deploy the worker, set both `SELLER_JOB_WORKER_TOKEN`
values to the same secret. If the token is unset on Vercel, the process route
returns 500 and jobs never drain (the client then falls back to sync).

## Credits & pricing

- 1 credit = 1 shot. Free trial = 8 credits per new workspace.
- Packs: starter 50 / ₩9,900 · pro 200 / ₩29,900 · studio 600 / ₩79,900.
- Video = 8 credits (blocked until FAL access).
- Charge is up front; failed/cancelled jobs auto-refund (atomic ledger, idempotent
  by `sourceId`).

## Royalty & licensing

- Using an AI star credits its owner **10 points/shot** (opted-in stars only,
  `sellerStarSettings`).
- Seller license: `seller-commercial-nonexclusive-v1` (worldwide, perpetual,
  non-exclusive commercial). Recorded per generation in `sellerLookbookGenerations`.
- **Terms are a draft pending legal review.**

## Security measures (and their knobs)

- **SSRF**: garment/avatar image URLs are fetched server-side, so all routes
  require them to be on our Blob store (`isLookbookBlobUrl` in
  `star-lookbook-pricing.ts`). Applies to `/api/seller/lookbook`,
  `/api/seller/lookbook/job`, and `/api/fanletter/lookbook`.
- **Trial farming**: new workspaces are capped per client IP per 24h
  (`SELLER_TRIAL_WORKSPACES_PER_IP_PER_DAY`, default 10; hashed IP). Over the cap
  → 429. Best-effort cost control (uses `x-real-ip`); not a hard boundary — a
  determined attacker can rotate IPs. Tighten before scaling paid acquisition.
- **Workspace auth**: unguessable `workspaceKey` (stored hashed), constant-time
  compare. Resuming a workspace is unaffected by the trial cap.

## Monitoring & troubleshooting

- **Worker logs**: `railway logs -s lookbook-worker` (logs `{processed, jobId, status}`
  per drained job; `[ERRO] status=500 SELLER_JOB_WORKER_TOKEN is not configured`
  means the Vercel token is missing/mismatched).
- **Queue health (for uptime monitors)**: `GET /api/internal/seller-lookbook/health`
  with `Authorization: Bearer <SELLER_JOB_WORKER_TOKEN>` →
  `{ ok, stats: { queued, processing, doneLastHour, failedLastHour, oldestQueuedAgeSec } }`.
  Alert when `oldestQueuedAgeSec` is high while `processing` is 0 — the worker is
  not draining (down / token mismatch). Point an external monitor at this.
- **Worker liveness probe**: `curl -X POST <LOOKBOOK_PROCESS_URL> -H "Authorization: Bearer <token>"`
  → `{"processed":0}` (queue empty + auth OK) / `{"processed":1,...}` (drained one).
  Note this *claims* a job, so prefer the GET health endpoint for passive monitoring.
- **Symptom: generations slow then succeed via "sync" / button sits "Queued…"**
  → worker is down or not authorized; jobs fall back to sync after ~27s. Check
  the worker is running and the token matches.
- **429 on workspace create** → IP hit the trial cap; expected. Raise
  `SELLER_TRIAL_WORKSPACES_PER_IP_PER_DAY` if it blocks legit users behind a
  shared NAT.
- **402 insufficient credits** → expected; user must buy credits (PortOne not
  wired, so only trial credits exist today).

## Scaling

The worker is a single instance, so batches drain sequentially (N shots ≈ N×40s).
To parallelize, raise the worker's replica count on Railway (`deploy.numReplicas`
in `railway/lookbook-worker/railway.json`, or the dashboard). `claimNextSellerJob`
is an atomic `findOneAndUpdate`, so multiple replicas drain safely in parallel —
no code change needed.

## Data model (collections)

| Collection | Holds |
| --- | --- |
| `sellerWorkspaces` | workspace (hashed key, credit balance, hashed creator IP) |
| `sellerCreditLedger` | credit entries (trial/purchase/spend/refund), idempotent |
| `sellerLookbookJobs` | async jobs (queued/processing/done/failed/canceled) |
| `sellerLookbookGenerations` | provenance + license per generation |
| `sellerStarSettings` | AI star opt-in for seller use |
| creator profiles | AI star catalog source (avatars resolved server-side) |

## Known external blockers (not code — operator/owner action)

1. **FAL video access** — `reference-to-video` model returns 403; lookbook→video
   is built and gated behind `NEXT_PUBLIC_SELLER_VIDEO_ENABLED` until access exists.
2. **PortOne (PG) merchant + keys** — real credit purchases. Until set, only free
   trial credits work; `grantSellerCredits` is idempotent and ready for the
   payment-verified webhook.
3. **Legal review** — terms/license/royalty are drafts.
4. **creath.park Railway `api` service is down** (trial expired) — separate
   project from the worker; affects thirdweb webhooks / reconciliation. Unrelated
   to the seller worker (which runs under the `genie1647` account) but worth
   restoring.
5. **Worker lives on a personal account** (`genie1647`) — consider moving it to
   the org/production account and adding uptime monitoring.
