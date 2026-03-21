# src/app/ -- Next.js App Router 페이지와 API 라우트

## 개요

Next.js 15 App Router 구조. 페이지 라우트와 API 라우트가 이 디렉토리에 공존한다.

**핵심 주의**: Next.js 15에서 동적 라우트의 `params`는 `Promise`이므로 반드시 `await`해야 한다.

---

## 라우트 구조

```
app/
├── page.tsx                         # GET /        홈 페이지
├── layout.tsx                       # 루트 레이아웃
├── loading.tsx                      # 루트 로딩 UI
├── globals.css                      # 디자인 시스템 토큰
├── extractions/[id]/page.tsx        # GET /extractions/:id  추출 진행
├── history/
│   ├── page.tsx                     # GET /history  이력
│   └── loading.tsx                  # 이력 로딩 UI
├── recipes/[id]/page.tsx            # GET /recipes/:id  레시피 상세
└── api/
    ├── extractions/
    │   ├── route.ts                 # POST /api/extractions
    │   └── [id]/route.ts            # GET  /api/extractions/:id
    └── recipes/
        ├── route.ts                 # GET  /api/recipes?scope=recent
        └── [id]/route.ts            # GET  /api/recipes/:id
                                     # PATCH /api/recipes/:id
```

---

## 페이지 라우트

### `page.tsx` -- 홈 (/)

**렌더링**: `export const dynamic = 'force-dynamic'` -- 서버 사이드 동적 렌더링 (최근 레시피 목록 때문).

**구성**:
1. Hero 섹션 (타이틀 + 설명)
2. `<UrlInputForm />` -- URL 입력 폼 (클라이언트 컴포넌트)
3. Feature Cards -- 3개 기능 소개 (정적)
4. `<RecentRecipes />` -- 최근 레시피 (서버 컴포넌트, SSR)
5. `<BottomNav />` -- 모바일 하단 네비

### `extractions/[id]/page.tsx` -- 추출 진행 (/extractions/:id)

**렌더링**: 서버 컴포넌트 (params await 후 클라이언트 컴포넌트에 id 전달)

**params 패턴** (Next.js 15):
```typescript
export default async function ExtractionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExtractionProgress extractionId={id} />;
}
```

**핵심**: `<ExtractionProgress />`가 SWR 폴링으로 진행 상태 표시. 완료 시 `/recipes/:id`로 자동 리다이렉트.

### `recipes/[id]/page.tsx` -- 레시피 상세 (/recipes/:id)

**렌더링**: 서버 컴포넌트 (params await 후 클라이언트 컴포넌트에 id 전달)

**핵심**: `<RecipeView />`가 SWR로 레시피 데이터 로드. 인분 조절, 편집, 링크 복사 기능 포함.

### `history/page.tsx` -- 이력 (/history)

**렌더링**: 서버 컴포넌트 (정적 셸 + 클라이언트 `<HistoryList />`)

**핵심**: `<HistoryList />`가 SWR로 전체 레시피 목록 로드. 그리드 카드 레이아웃.

### `layout.tsx` -- 루트 레이아웃

**폰트**: Gowun Batang (본문, `--font-gowun`) + Jua (제목, `--font-jua`)
**언어**: `<html lang="ko">`
**Viewport**: `themeColor: '#fce4ec'`, `maximumScale: 1` (모바일 줌 방지)
**구성**: `<Header />` + `{children}`

### `globals.css` -- 디자인 시스템

Tailwind CSS v4 설정 + 커스텀 디자인 토큰:
- CSS 변수 (색상 팔레트, 폰트)
- 유틸리티 클래스 (`hero-bg`, `card-culinary`, `tips-sage`, `warn-amber`, `badge-gold`)
- 인쇄 스타일 (`no-print`, `print-full`)
- 반응형 조정

---

## API 라우트

### `POST /api/extractions` -- 추출 시작

**파일**: `api/extractions/route.ts`

**요청 바디**:
```json
{ "youtubeUrl": "https://...", "forceReExtract": false }
```

**응답** (202):
```json
{ "extractionId": "uuid", "status": "queued" }
```

**동작**: `createExtraction()` 호출 → 캐시 확인 → 새 추출 생성 → 백그라운드 파이프라인 시작

**에러 응답**: `{ error, code, category }` 형태. ExtractionErrorCode 기반.

### `GET /api/extractions/:id` -- 추출 상태 조회

**파일**: `api/extractions/[id]/route.ts`

**응답 (진행 중)**:
```json
{ "extractionId": "uuid", "status": "processing", "stage": "structuring" }
```

**응답 (완료)**:
```json
{ "extractionId": "uuid", "status": "completed", "recipeId": "uuid" }
```

**응답 (실패)**:
```json
{ "extractionId": "uuid", "status": "failed", "errorCode": "NON_RECIPE_VIDEO", "message": "..." }
```

**주의**: `status === 'completed'`인데 `recipeId`가 없으면 `INTERNAL_ERROR` 반환 (데이터 불일치).

### `GET /api/recipes?scope=recent` -- 최근 레시피 목록

**파일**: `api/recipes/route.ts`

**응답**:
```json
{ "items": [{ "id": "uuid", "title": "...", "thumbnailUrl": null, "updatedAt": "..." }] }
```

**제약**: `scope=recent` 외 값이면 400 에러.

### `GET /api/recipes/:id` -- 레시피 상세 조회

**파일**: `api/recipes/[id]/route.ts`

**응답**: `RecipeDetails` 전체 (재료, 단계, 팁, 경고, 영상 URL, 썸네일 포함)

### `PATCH /api/recipes/:id` -- 레시피 수정

**파일**: `api/recipes/[id]/route.ts`

**요청 바디**:
```json
{
  "title": "...",
  "baseServings": 2,
  "ingredients": [...],
  "steps": [...],
  "tips": [...],
  "warnings": [...],
  "confidence": "high"
}
```

**응답**:
```json
{ "id": "uuid", "updated": true, "updatedAt": "2026-..." }
```

**동작**: 레시피 헤더 업데이트 + 자식 테이블 전부 삭제 후 재삽입 (delete-then-insert)

---

## API 응답 패턴

### 성공
```typescript
successResponse(data, status)  // 기본 200
```

### 에러
```typescript
errorResponse(code, message, status)
// → { error: message, code: code, category: 'user_error' | 'upstream_error' | 'internal_error' }
```

에러 카테고리는 `ExtractionErrorCode`에서 자동 추론. 미등록 코드는 HTTP 상태에서 추론.

---

## Next.js 15 주의사항

### 1. 동적 라우트 params는 Promise

```typescript
// 올바른 패턴
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
}

// 잘못된 패턴 (Next.js 14 스타일)
export default function Page({ params }: { params: { id: string } }) {
  // params.id -- 동작하지 않음
}
```

### 2. API 라우트 context.params도 Promise

```typescript
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
}
```

### 3. Metadata와 Viewport 분리

```typescript
// layout.tsx에서 별도 export
export const metadata: Metadata = { ... };
export const viewport: Viewport = { ... };  // Metadata에 넣지 않음
```

### 4. force-dynamic

홈 페이지에서 `export const dynamic = 'force-dynamic'`을 사용. 서버 컴포넌트 `<RecentRecipes />`가 매 요청마다 최신 데이터를 가져오기 위함.

---

## 흔한 실수

1. **params를 await하지 않음**: Next.js 15에서 가장 흔한 실수. 모든 동적 라우트에서 `await params` 필수
2. **API 라우트에서 서비스 에러를 직접 throw**: API 라우트의 catch 블록에서 `code`/`status` 프로퍼티가 있는 에러만 구조화된 응답으로 변환. 그 외는 `INTERNAL_ERROR`로 폴백
3. **클라이언트 컴포넌트에서 서버 모듈 import**: 페이지 파일은 서버 컴포넌트이지만, 실제 데이터 페칭은 클라이언트 컴포넌트 내부의 SWR이 담당. 페이지에서 직접 Supabase를 호출하지 않음 (`recent-recipes.tsx` 예외)
4. **scope 파라미터 누락**: `GET /api/recipes`는 `scope=recent` 필수. 없으면 400
