# Railway Backend Notes

This project keeps the public web app on `https://1066.loot.menu` and uses Railway for webhook ingress, reconciliation work, and creator content automation cron runs.

## Why Railway helps here

- `thirdweb` webhook delivery is not consistently arriving at the app.
- Signup recovery currently depends on request-time reconciliation.
- Railway is a better place to run long-lived workers and cron-driven reconciliation.

## Current split

1. Keep the public web app on the public site domain.
2. Run a Railway API service from the same repo for backend routes and thirdweb webhook ingress.
3. Run a Railway worker service from the same repo to reconcile pending signups plus completed-member network cleanup.
4. Run a Railway cron service from the same repo when you want scheduled AI content draft generation for test creators.

## Endpoints added for Railway

- `GET /api/health`
  - Returns `200` only when required env vars are present and MongoDB is reachable.
- `POST /api/internal/reconcile-signups`
  - Protected by `Authorization: Bearer <token>`.
  - Re-checks pending members and completes them when chain data proves the payment.
- `POST /api/internal/reconcile-completed-members`
  - Protected by `Authorization: Bearer <token>`.
  - Re-runs completed-member placement/reward finalization outside user-facing request paths.
- `POST /api/internal/content-automation/run`
  - Protected by `x-automation-key: <token>`.
  - Runs one `discover_and_draft` automation cycle for a target creator account.

## Environment variables

Shared between Vercel and Railway:

- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `PROJECT_WALLET`
- `THIRDWEB_SECRET_KEY`
- `THIRDWEB_WEBHOOK_SECRETS`
- `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`

Server-side thirdweb calls should prefer `THIRDWEB_SECRET_KEY`. The public site still needs `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` for wallet UI, but Railway API and worker reconciliation should run against thirdweb infrastructure with the server secret when it is configured.

Railway-only additions:

- `RECONCILE_API_TOKEN`
  - Secret used by Railway cron and worker calls.
- `RECONCILE_BASE_URL`
  - Base URL used by reconciliation callers.
  - Public callers can use the Railway domain, for example `https://api-production-d58a.up.railway.app`.
  - Railway worker-to-API traffic should prefer the internal URL `http://api.railway.internal:8080`.
- `RECONCILE_LIMIT`
  - Optional batch size for each reconciliation run. Default is `25`.
- `RECONCILE_PENDING_LIMIT`
  - Optional override for pending signup reconciliation batch size.
- `RECONCILE_INTERVAL_MS`
  - Optional worker loop interval. Default is `30000`.
- `RECONCILE_EMAIL`
  - Optional email filter for one-off manual reconciliation runs.
- `RECONCILE_PENDING_EMAIL`
  - Optional email filter for pending signup reconciliation in the worker.
- `RECONCILE_COMPLETED_LIMIT`
  - Optional batch size for completed-member network reconciliation.
  - Recommended value on Railway worker: `1`.
- `RECONCILE_COMPLETED_EMAIL`
  - Optional email filter for completed-member reconciliation.
- `CONTENT_AUTOMATION_INTERNAL_KEY`
  - Secret used by internal automation API routes and Railway cron.
- `CONTENT_AUTOMATION_RUN_URL`
  - Full internal or public URL for `POST /api/internal/content-automation/run`.
  - Recommended Railway value: `http://api.railway.internal:8080/api/internal/content-automation/run`
- `CONTENT_AUTOMATION_TARGET_MEMBER_EMAIL`
  - Optional override used by `pnpm content-automation:run` when you want to run a single creator.
  - Leave empty to run every enabled automation profile.
- `CONTENT_AUTOMATION_ALLOWED_MEMBER_EMAILS`
  - Beta allowlist for the creator automation UI and member-scoped API.
  - Keep this as `genie1647@gmail.com` during initial testing.
  - Expand to comma-separated emails for staged rollout, or `*` for full release.
- `OPENAI_API_KEY`
  - Required for automation source discovery, draft generation, and AI cover generation.
- `OPENAI_CONTENT_DISCOVERY_MODEL`
  - Optional, defaults to `gpt-5.4`.
- `OPENAI_CONTENT_DISCOVERY_REASONING`
  - Optional, defaults to `medium`.
- `OPENAI_CONTENT_DRAFT_MODEL`
  - Optional, defaults to `gpt-5.4`.
- `OPENAI_CONTENT_DRAFT_REASONING`
  - Optional, defaults to `high`.
- `OPENAI_CONTENT_IMAGE_MODEL`
  - Optional, defaults to `gpt-image-1.5`.
- `OPENAI_CONTENT_IMAGE_QUALITY`
  - Optional, defaults to `high`.
- `OPENAI_CONTENT_IMAGE_SIZE`
  - Optional, defaults to `1536x1024`.
- `BLOB_READ_WRITE_TOKEN`
  - Required for creator uploads and AI-generated cover image storage.

## Railway service setup

### API service

- Source repo: this repository
- Root directory: `/`
- Start command: `pnpm start`
- Healthcheck path: `/api/health`
- Current API public domain: `https://api-production-d58a.up.railway.app`

`THIRDWEB_WEBHOOK_BASE_URL` should point to this Railway API service. This is the current production webhook target.

### Pending cron service

- Source repo: this repository
- Root directory: `/`
- Start command: `pnpm reconcile:pending`
- Schedule: every 1 to 5 minutes
- Required env vars:
  - `RECONCILE_API_TOKEN`
  - `RECONCILE_BASE_URL`

### Completed-network cron service

- Source repo: this repository
- Root directory: `/`
- Start command: `pnpm reconcile:completed`
- Schedule: every 5 to 15 minutes
- Required env vars:
  - `RECONCILE_API_TOKEN`
  - `RECONCILE_BASE_URL`
  - `RECONCILE_COMPLETED_LIMIT`

### Worker service

- Source repo: this repository
- Root directory: `/`
- Start command: `pnpm reconcile:worker`
- Required env vars:
  - `RECONCILE_API_TOKEN`
  - `RECONCILE_BASE_URL`
- Recommended `RECONCILE_BASE_URL`: `http://api.railway.internal:8080`
- Recommended `RECONCILE_LIMIT`: `1` while backfill requests are expensive
- Recommended `RECONCILE_COMPLETED_LIMIT`: `1`

The worker now runs both tasks sequentially on each tick:

- pending signup reconcile
- completed-member network reconcile

Use the worker when you want tighter recovery than cron alone.

### Content automation cron service

- Source repo: this repository
- Root directory: `/`
- Start command: `pnpm content-automation:run`
- Schedule: start with every 6 hours or once per day
- Required env vars:
  - `CONTENT_AUTOMATION_INTERNAL_KEY`
  - `CONTENT_AUTOMATION_RUN_URL`
  - `CONTENT_AUTOMATION_ALLOWED_MEMBER_EMAILS`
  - `OPENAI_API_KEY`
  - `BLOB_READ_WRITE_TOKEN`
  - `MONGODB_URI`
  - `MONGODB_DB_NAME`
- Recommended Railway values during beta:
  - `CONTENT_AUTOMATION_ALLOWED_MEMBER_EMAILS=genie1647@gmail.com`
  - `CONTENT_AUTOMATION_RUN_URL=http://api.railway.internal:8080/api/internal/content-automation/run`
  - optional targeted test run: `CONTENT_AUTOMATION_TARGET_MEMBER_EMAIL=genie1647@gmail.com`

Use this as a conservative beta flow:

1. Leave `autoPublish=false` in `/{lang}/creator/studio/profile`
2. Run the cron 1 to 4 times per day
3. Review the generated drafts, AI covers, and source attributions
4. Increase frequency only after quality is stable

## Suggested rollout

1. Deploy the API service to Railway and verify `/api/health`.
2. Add `RECONCILE_API_TOKEN`.
3. Point `THIRDWEB_WEBHOOK_BASE_URL` at the Railway API domain and re-register thirdweb webhooks.
4. Deploy the worker with an internal `RECONCILE_BASE_URL`.
5. Set `RECONCILE_COMPLETED_LIMIT=1` on the worker or completed-network cron.
6. Add the content automation cron and leave `CONTENT_AUTOMATION_TARGET_MEMBER_EMAIL` empty for “all enabled creators”, or set it only for one-off creator-specific tests.
7. Confirm draft generation, AI cover uploads, and source attribution all succeed before widening the allowlist.

## Scripts

- `pnpm reconcile:pending`
  - Sends one authenticated reconciliation request.
- `pnpm reconcile:completed`
  - Sends one authenticated completed-member reconciliation request.
- `pnpm reconcile:worker`
  - Repeats pending signup plus completed-member reconciliation in a loop.
- `pnpm content-automation:run`
  - Sends one authenticated content automation request.
  - Without `CONTENT_AUTOMATION_TARGET_MEMBER_EMAIL`, it runs every enabled creator automation profile.
  - With `CONTENT_AUTOMATION_TARGET_MEMBER_EMAIL`, it runs only that creator.
