# Railway Backend Notes

This project keeps the public web app on `https://1066.loot.menu` and uses Railway for webhook ingress plus reconciliation work.

## Why Railway helps here

- `thirdweb` webhook delivery is not consistently arriving at the app.
- Signup recovery currently depends on request-time reconciliation.
- Railway is a better place to run long-lived workers and cron-driven reconciliation.

## Current split

1. Keep the public web app on the public site domain.
2. Run a Railway API service from the same repo for backend routes and thirdweb webhook ingress.
3. Run a Railway worker service from the same repo to reconcile pending signups.

## Endpoints added for Railway

- `GET /api/health`
  - Returns `200` only when required env vars are present and MongoDB is reachable.
- `POST /api/internal/reconcile-signups`
  - Protected by `Authorization: Bearer <token>`.
  - Re-checks pending members and completes them when chain data proves the payment.

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
- `RECONCILE_INTERVAL_MS`
  - Optional worker loop interval. Default is `30000`.
- `RECONCILE_EMAIL`
  - Optional email filter for one-off manual reconciliation runs.

## Railway service setup

### API service

- Source repo: this repository
- Root directory: `/`
- Start command: `pnpm start`
- Healthcheck path: `/api/health`
- Current API public domain: `https://api-production-d58a.up.railway.app`

`THIRDWEB_WEBHOOK_BASE_URL` should point to this Railway API service. This is the current production webhook target.

### Cron service

- Source repo: this repository
- Root directory: `/`
- Start command: `pnpm reconcile:pending`
- Schedule: every 1 to 5 minutes
- Required env vars:
  - `RECONCILE_API_TOKEN`
  - `RECONCILE_BASE_URL`

### Worker service

- Source repo: this repository
- Root directory: `/`
- Start command: `pnpm reconcile:worker`
- Required env vars:
  - `RECONCILE_API_TOKEN`
  - `RECONCILE_BASE_URL`
- Recommended `RECONCILE_BASE_URL`: `http://api.railway.internal:8080`
- Recommended `RECONCILE_LIMIT`: `1` while backfill requests are expensive

Use the worker when you want tighter recovery than cron alone.

## Suggested rollout

1. Deploy the API service to Railway and verify `/api/health`.
2. Add `RECONCILE_API_TOKEN`.
3. Point `THIRDWEB_WEBHOOK_BASE_URL` at the Railway API domain and re-register thirdweb webhooks.
4. Deploy the worker with an internal `RECONCILE_BASE_URL`.
5. Confirm `POST /api/internal/reconcile-signups` responds quickly when `pending_payment` is empty or bounded.

## Scripts

- `pnpm reconcile:pending`
  - Sends one authenticated reconciliation request.
- `pnpm reconcile:worker`
  - Repeats reconciliation in a loop.
