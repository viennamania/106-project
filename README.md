# Pocket Smart Wallet

`Vercel v0` 확장에 맞는 구조와 `thirdweb SDK` Smart Wallet 플로우를 합친 모바일 우선 웹앱입니다.

## Stack

- Next.js 16 App Router
- Tailwind CSS v4
- thirdweb React SDK v5
- v0-compatible `components.json` + alias structure

## What is included

- 인라인 `ConnectEmbed` 기반 모바일 온보딩
- Email 전용 로그인 진입점
- BSC Smart Wallet 연결 기본값
- BSC USDT 잔액 전용 표시
- `PROJECT_WALLET` 로의 정확한 `10 USDT` 전송 기반 회원가입
- MongoDB Atlas 회원 상태 관리 (`pending_payment` -> `completed`)
- 가입 완료 시점 레퍼럴 코드 생성 및 추천인 코드 저장
- thirdweb Insight BSC USDT webhook 수신
- explorer / USDT contract / dashboard 빠른 링크

## Run locally

1. 환경변수 파일 생성

```bash
cp .env.example .env.local
```

2. `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`, thirdweb webhook, MongoDB Atlas 환경변수 설정

```bash
THIRDWEB_SECRET_KEY=your_server_secret_key
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
NEXT_PUBLIC_APP_URL=https://your-public-web-domain
PROJECT_WALLET=0x...
THIRDWEB_WEBHOOK_BASE_URL=https://your-railway-api-domain
THIRDWEB_WEBHOOK_URL=
THIRDWEB_WEBHOOK_SECRETS=
MONGODB_URI=your_mongodb_atlas_connection_string
MONGODB_DB_NAME=your_database_name
MONGODB_MEMBERS_COLLECTION=members
MONGODB_REFERRAL_REWARDS_COLLECTION=referralRewards
MONGODB_THIRDWEB_WEBHOOK_EVENTS_COLLECTION=thirdwebWebhookEvents
MONGODB_THIRDWEB_WEBHOOK_INGRESS_COLLECTION=thirdwebWebhookIngressLogs
RECONCILE_API_TOKEN=optional_shared_secret
RECONCILE_BASE_URL=https://your-api-base-url
RECONCILE_LIMIT=25
RECONCILE_INTERVAL_MS=30000
RECONCILE_EMAIL=
```

3. 개발 서버 실행

```bash
pnpm dev
```

4. 브라우저에서 `http://localhost:3000` 열기

## Smart Wallet notes

- 기본 체인은 `BSC`입니다.
- Connect UI는 `accountAbstraction` 옵션으로 Smart Wallet 흐름을 사용합니다.
- 로그인 방식은 이메일 OTP만 허용합니다.
- 잔액 조회는 BSC의 USDT 컨트랙트만 대상으로 합니다.
- 지갑 연결 후 현재 이메일 주소를 키로 `pending_payment` 회원 상태를 MongoDB Atlas에 upsert합니다.
- 연결된 지갑에서 `PROJECT_WALLET` 로 정확히 `10 USDT` 를 보내야 회원가입이 완료됩니다.
- `POST /api/webhooks/thirdweb`는 thirdweb Insight webhook를 검증한 뒤 BSC USDT 전송 이벤트를 저장하고, 정확히 `10 USDT` 입금이 확인되면 회원 상태를 `completed` 로 승격합니다.
- 레퍼럴 코드는 회원가입 완료 시점에만 생성됩니다.
- 브라우저는 `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`를 사용하고, 서버 API 및 Railway worker는 `THIRDWEB_SECRET_KEY`가 있으면 이를 우선 사용합니다.

## thirdweb webhook setup

1. 수신 엔드포인트가 공개 HTTPS 주소로 열려 있어야 합니다.

2. `PROJECT_WALLET`와 `THIRDWEB_SECRET_KEY`를 설정한 뒤 webhook를 등록합니다.

```bash
pnpm thirdweb:webhooks:register
```

3. 스크립트 출력의 `THIRDWEB_WEBHOOK_SECRETS=...` 값을 `.env.local`에 추가합니다.

`http://localhost:3000` 같은 로컬 주소는 thirdweb이 호출할 수 없으므로 등록 스크립트가 거부합니다. 배포된 HTTPS 주소를 `THIRDWEB_WEBHOOK_BASE_URL` 또는 `THIRDWEB_WEBHOOK_URL`에 넣어야 합니다.

현재 운영 기준으로는 public 웹 도메인 `https://1066.loot.menu` 과 별개로 Railway API 서비스가 webhook ingress를 받습니다. 따라서 `THIRDWEB_WEBHOOK_BASE_URL`은 사용자 웹앱 주소가 아니라 webhook를 수신할 Railway API 주소를 가리키는 쪽이 맞습니다.

등록 스크립트는 다음 webhook 2개를 thirdweb Insight에 맞춰 생성하거나 재사용합니다.

- BSC USDT `Transfer` 이벤트 중 `to=PROJECT_WALLET`
- BSC USDT `Transfer` 이벤트 중 `from=PROJECT_WALLET`

## Railway backend

- 운영 백엔드를 분리할 때는 [docs/railway-backend.md](/Users/nevertry/parksang/106-project/docs/railway-backend.md)를 기준으로 설정하면 됩니다.
- 현재 운영 기준 public 사이트 도메인은 `https://1066.loot.menu` 입니다.
- 현재 운영 기준 webhook ingress 대상은 Railway API 서비스 `https://api-production-d58a.up.railway.app` 입니다.
- `GET /api/health` 는 필수 환경변수와 MongoDB 연결 상태를 확인합니다.
- `POST /api/internal/reconcile-signups` 는 Bearer 토큰으로 보호된 재조정 엔드포인트입니다.
- `pnpm reconcile:pending` 는 1회 재조정을 실행합니다.
- `pnpm reconcile:worker` 는 일정 간격으로 재조정을 반복합니다.
- `RECONCILE_EMAIL` 을 주면 특정 이메일만 재조정할 수 있습니다.

## Signup flow

1. 이메일 지갑을 연결합니다.
2. 연결된 지갑에서 `PROJECT_WALLET` 로 정확히 `10 USDT` 를 전송합니다.
3. thirdweb webhook가 입금을 확인하면 회원 상태가 `completed` 로 바뀌고, 레퍼럴 코드가 발급됩니다.
4. `?ref=CODE` 파라미터로 들어온 추천인 코드는 회원가입 완료 시 회원 정보에 저장됩니다.

## v0 workflow

이 프로젝트는 `v0 init`이 Tailwind v4 감지 문제로 실패할 수 있는 환경을 고려해 수동으로 `components.json`과 alias를 맞춰 둔 상태입니다.

이후 v0에서 이어서 작업하려면:

- v0 웹 UI에서 화면을 수정하고 `Add to Codebase`를 사용하거나
- 새로운 컴포넌트를 생성한 뒤 현재 alias 구조(`@/components`, `@/lib`)에 맞춰 추가하면 됩니다.

## Verification

다음 명령으로 검증했습니다.

```bash
pnpm lint
pnpm build
```
