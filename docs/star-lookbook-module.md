# AI 스타 룩북 스튜디오 (Star Lookbook) — style-room.ai 대응 모듈

> 상태: **MVP 코어 구현됨 (브랜치 `feature/style-room-lookbook`)**. TikTok 유통 연동은 Codex 작업 완료 후.

## 1. 왜 만드는가

style-room.ai("옷 사진 1장 → 한국형 AI 모델 룩북", 엔젤리그, 룩북당 ~300원)와 동일 카테고리.
차이는 **모델의 정체**: style-room은 익명 AI 얼굴, 우리는 **팔로워 있는 AI 스타**.

→ 셀러가 옷 사진을 올리면 fanletter AI 스타가 그 옷을 입은 룩북을 생성하고,
그 결과물이 AI 스타의 TikTok 채널로 유통된다 = **모델컷 + 인플루언서 노출 동시 제공**.
style-room이 구조적으로 따라올 수 없는 차별점.

## 2. 핵심 통찰 (기존 코드 재사용)

`src/lib/content-gallery-image-service.ts`가 이미 `fal-ai/nano-banana-2/edit`(다중 레퍼런스 합성)을
기본 모델로 쓴다. 콘텐츠 파이프라인은 "옷을 복사하지 말라"(`createReferenceIdentityPrompt`)인데,
피팅은 정확히 그 반대 — **옷은 보존, 사람만 AI 스타**. 즉 신규 빌드가 아니라 프롬프트 분기.

## 3. 이번에 추가된 것 (additive only, 기존 파일 미수정)

| 파일 | 역할 |
|---|---|
| `src/lib/star-lookbook-service.ts` | 피팅 엔진. `generateStarLookbook()` — `[스타아바타, ...옷사진]`을 nano-banana-2/edit에 넣고, 옷을 픽셀 단위로 보존하는 프롬프트로 룩북 생성 → Vercel Blob 업로드 |
| `src/app/api/fanletter/lookbook/route.ts` | `POST /api/fanletter/lookbook` — 멤버 지갑 인증 후 서비스 호출 |
| `src/components/fanletter-lookbook-studio-page.tsx` | 셀러 UI(client). `useActiveAccount`+`useMemberSession`으로 인증. 옷/스타 이미지 **파일 업로드**(기존 `/api/content/posts/upload` 재사용) + **"내 AI 스타 불러오기"**(`GET /api/content/profile`로 avatar/이름 프리필) + URL 직접 입력도 지원. 배경·비율·해상도·장수 입력 → API 호출 → 결과 갤러리(다운로드) |
| `src/app/[lang]/(thirdweb)/fanletter/studio/lookbook/page.tsx` | 페이지 셸. `(thirdweb)` 그룹 하위(=`MemberSessionProvider`+지갑 사용 가능). 경로: `/{lang}/fanletter/studio/lookbook` |

자립형(자체 fal 클라이언트·blob·env). Codex의 TikTok 코드와 0 충돌.
파일 업로드는 신규 엔드포인트 없이 기존 업로드 라우트를 재사용함.

### API 계약
```jsonc
POST /api/fanletter/lookbook
{
  "email": "...", "walletAddress": "0x...",      // 멤버 인증
  "starAvatarUrl": "https://.../star.png",        // AI 스타 정체 (필수)
  "garmentImageUrls": ["https://.../top.jpg"],    // 셀러 옷 사진 1~4장 (필수)
  "sceneBrief": "성수동 카페, 자연광, full body",  // 선택
  "starName": "윤서",                             // 선택
  "aspectRatio": "4:5", "resolution": "2K", "numImages": 1
}
// → { "images": [{ "url", "pathname", "contentType", "sourceUrl" }] }
```

## 4. 남은 작업 (우선순위)

1. ~~셀러 UI~~ ✅ 완료 (`/{lang}/fanletter/studio/lookbook`).
2. ~~파일 업로드 + 스타 선택~~ ✅ 완료 (옷/스타 파일 업로드 + "내 AI 스타 불러오기" 프리필). 후속 개선: 본인 AI 스타가 여러 명일 때 목록에서 골라 선택(현재는 대표 프로필 1개 프리필).
3. **결제/GTM** — 셀러는 USDT 안 씀 → 원화/포인트 룩북 과금 모델 (현 최대 리스크). **사업 결정 필요** — 통화/과금단위/결제수단.
4. **TikTok 유통 연동** — Codex의 AI 스타↔TikTok 연결 완료 후, 룩북 자동 게시.
5. **품질 튜닝** — 원단/프린트/로고 보존 한계 시 해상도 상향·레퍼런스 다각도·후처리.
6. **한국형 배경 프리셋** — sceneBrief 템플릿화 (성수/한남/스튜디오 등).

## 5. 검증

- 타입체크 통과 확인 후 커밋. **`main` push 금지**(Codex 활성). 리뷰용 브랜치로 유지.
- 실측 생성은 `FAL_KEY`/`BLOB_READ_WRITE_TOKEN` 환경에서 라우트 호출로.
