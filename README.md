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
- `sponsorGas=true` 고정
- BSC USDT 잔액 전용 표시
- MongoDB Atlas 회원 등록 및 관리
- explorer / USDT contract / dashboard 빠른 링크

## Run locally

1. 환경변수 파일 생성

```bash
cp .env.example .env.local
```

2. `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`와 MongoDB Atlas 환경변수 설정

```bash
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
NEXT_PUBLIC_APP_URL=http://localhost:3000
MONGODB_URI=your_mongodb_atlas_connection_string
MONGODB_DB_NAME=your_database_name
MONGODB_MEMBERS_COLLECTION=members
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
- `sponsorGas=true`로 고정되어 있습니다.
- 잔액 조회는 BSC의 USDT 컨트랙트만 대상으로 합니다.
- 지갑 연결 후 현재 이메일 주소를 키로 회원 정보가 MongoDB Atlas에 upsert됩니다.
- sponsored transaction 데모가 동작하려면 thirdweb 대시보드에서 BSC용 gas sponsorship 설정이 필요합니다.

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
