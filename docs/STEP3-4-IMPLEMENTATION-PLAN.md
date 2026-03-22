# Step 3+4: Frontend Implementation Plan

## Overview

Step 1(데이터 파이프라인) + Step 2(AI 추출 엔진) 위에 프론트엔드를 구축한다.
Step 3는 핵심 화면(홈, 진행, 결과+인분 조절), Step 4는 편집+히스토리+폴리시.

## Tech Stack

- Next.js 15 App Router + TypeScript
- Tailwind CSS + shadcn/ui v4 (@base-ui/react)
- SWR (데이터 페칭 + 폴링)
- 기존 서버 타입 재사용 (`src/lib/extraction/types.ts`)

## Confirmed Decisions (Planner-Architect-Critic 합의)

- SWR 도입 (raw fetch + custom hook 대신)
- 컴포넌트 8개 (14개에서 축소)
- 기존 타입 재사용 (별도 프론트엔드 타입 파일 없음)
- 편집 모드: useState 토글 (query param 아님)
- 클립보드 붙여넣기 UX 포함
- @media print CSS 포함
- "링크 복사" 버튼 포함
- shadcn/ui v4 패턴 준수 (기존 button.tsx 참고)
- Server Components 기본, 'use client' 필요한 곳만

## API Endpoints (이미 구현됨)

- `POST /api/extractions` → 202 { extractionId, status }
- `GET /api/extractions/:id` → { extractionId, status, stage?, recipeId?, errorCode?, message? }
- `GET /api/recipes/:id` → { id, title, baseServings, ingredients, steps, tips, warnings, confidence }
- `PATCH /api/recipes/:id` → { id, updated, updatedAt }
- `GET /api/recipes?scope=recent` → { items: [{ id, title, thumbnailUrl, updatedAt }] }

## Routing

```
/                    → 홈 (Screen A)
/extractions/[id]    → 추출 진행 (Screen B)
/recipes/[id]        → 레시피 결과 (Screen C) + 편집 (Screen D)
/history             → 히스토리 (Screen E)
```

---

# Step 3: 핵심 화면 (홈, 진행, 결과)

## Phase 1: 기반 (병렬)

### Task 1-1. shadcn/ui 컴포넌트 추가 설치 [S]

```bash
npx shadcn@latest add input card badge separator skeleton alert dialog textarea label
```

- 기존 button.tsx의 @base-ui/react 패턴을 참고하여 v4 호환 확인
- AGENTS.md 경고 준수: `node_modules/next/dist/docs/` 참고

### Task 1-2. SWR 설치 + API 클라이언트 [S]

```bash
npm install swr
```

**New file: `src/lib/api/client.ts`**

```typescript
// 공통 fetch 래퍼
async function apiFetch<T>(url: string, options?: RequestInit): Promise<T>;

// 개별 함수
function createExtraction(
  youtubeUrl: string,
  forceReExtract?: boolean,
): Promise<{ extractionId: string; status: string }>;
function getExtraction(id: string): Promise<ExtractionStatus>;
function getRecipe(id: string): Promise<RecipeDetails>;
function getRecentRecipes(): Promise<{ items: RecentRecipeListItem[] }>;
function updateRecipe(
  id: string,
  data: RecipeUpdatePayload,
): Promise<{ id: string; updated: boolean; updatedAt: string }>;
```

- 에러 응답: response.ok 확인 → throw ApiError
- 타입: `src/lib/extraction/types.ts`와 `src/lib/recipe/service.ts`에서 import
- SWR fetcher: `apiFetch`를 래핑

### Task 1-3. 인분 조절 유틸 + 테스트 [S]

**New file: `src/lib/recipe/scaling.ts`**

```typescript
function scaleIngredient(
  ingredient: RecipeIngredient,
  targetServings: number,
  baseServings: number | null,
): { displayAmount: string | null; displayUnit: string | null };

function formatAmount(amount: number): string;
// 정수면 정수, 소수점 있으면 소수 첫째자리까지
```

규칙:

- `baseServings === null` → 원본 그대로
- `amount === null` → 원본 그대로
- `scalable === false` → 원본 그대로
- 그 외: `amount * (targetServings / baseServings)`

**New file: `__tests__/lib/recipe/scaling.test.ts`**
테스트 케이스 (필수):

- 정상 스케일링 (2인분 → 4인분, amount 2배)
- amount null → 그대로
- scalable false → 그대로
- baseServings null → 스케일링 비활성
- 소수점 결과 (0.5 → 1.0)
- amount 0 → 그대로

---

## Phase 2: 핵심 화면 (순차)

### Task 2-1. 레이아웃 + Header [S]

**Modified: `src/app/layout.tsx`**

- metadata 업데이트 (title: "YouTube Recipe AI", description)
- Header 컴포넌트 포함

**New file: `src/components/header.tsx`**

- 로고/서비스명 (홈 링크)
- "최근 레시피" 링크 → /history
- 반응형: 모바일에서 간결하게

### Task 2-2. 홈 화면 (Screen A) [M]

**Modified: `src/app/page.tsx`** — 전면 교체

구성:

- Server Component (최근 레시피 SSR)
- 서비스 한 줄 설명
- URLInputForm (Client Component)
- 최근 레시피 5개

**New file: `src/components/url-input-form.tsx`** ('use client')

- Input + "레시피 추출하기" Button
- YouTube URL 클라이언트 검증 (정규식)
- 잘못된 URL → 인라인 에러 메시지
- 클립보드 붙여넣기 UX:
  - input focus 시 클립보드에 YouTube URL이 있으면 자동 제안
  - `navigator.clipboard.readText()` (HTTPS 필요)
- Submit → POST /api/extractions → router.push(`/extractions/${extractionId}`)
- 로딩 중 Button disabled + spinner
- 지원 형식 안내 (일반 영상 / 쇼츠)

디자인 참고: Recipe Retriever 스타일 (중앙 정렬, 큰 입력창, 단일 CTA)

### Task 2-3. 추출 진행 화면 (Screen B) [M]

**New file: `src/app/extractions/[id]/page.tsx`** ('use client')

**New file: `src/components/extraction-progress.tsx`** ('use client')

SWR 폴링:

```typescript
const { data } = useSWR(`/api/extractions/${id}`, fetcher, {
  refreshInterval: (data) =>
    data?.status === 'completed' || data?.status === 'failed' ? 0 : 2000,
});
```

진행 단계 표시 (한글):

```typescript
const STAGE_LABELS: Record<string, string> = {
  validating_url: 'URL 확인 중',
  fetching_metadata: '영상 정보 수집 중',
  fetching_captions: '자막 수집 중',
  structuring: '레시피 구조화 중',
  normalizing: '결과 검증 중',
  saving: '저장 중',
};
```

- 완료된 단계: 체크 아이콘
- 현재 단계: 로딩 애니메이션
- 대기 단계: 회색
- completed → `router.push(/recipes/${recipeId})`
- failed → ErrorDisplay 표시 + "다시 시도하기" 버튼

### Task 2-4. 레시피 결과 화면 (Screen C) [L]

**New file: `src/app/recipes/[id]/page.tsx`** — Server Component (초기 데이터)

**New file: `src/components/recipe-view.tsx`** ('use client')
통합 컴포넌트 — 재료, 단계, 팁, 경고를 하나의 파일에서 렌더링
(파일이 300줄 넘으면 그때 분리)

구성:

- 레시피 제목
- 원본 영상 링크
- ServingControl
- 재료 목록 (스케일링 적용)
  - confidence 'low' → 시각적 구분 (opacity 또는 ? 아이콘)
  - note 있으면 재료 옆에 표시
  - amountText 있으면 원본 표현 tooltip
- 조리 단계 목록 (stepNo 순서)
- 팁/메모 섹션
- 경고/불확실성 박스 (severity별 색상)
- "수정하기" 버튼 (Step 4에서 연결)
- "링크 복사" 버튼 (`navigator.clipboard.writeText`)
- `@media print` CSS (요리 시 인쇄용)

**New file: `src/components/serving-control.tsx`** ('use client')

- 1~8 인분 선택 (-, 숫자, +)
- baseServings === null → "인분 정보 없음" 경고 + 비활성화
- 변경 시 recipe-view에 실시간 반영

레이아웃:

- 모바일: 제목 → 인분 → 재료 → 단계 → 팁 → 경고 (세로)
- 데스크톱 (md+): 왼쪽 재료, 오른쪽 단계 / 상단 제목+인분

디자인 참고: BBC Good Food 스타일

---

# Step 4: 편집 + 히스토리 + 폴리시

## Phase 3: 편집 + 히스토리 (부분 병렬)

### Task 3-1. 편집 모드 (Screen D) [L]

**Modified: `src/components/recipe-view.tsx`** — view/edit 토글 추가

**New file: `src/components/recipe-edit-form.tsx`** ('use client')

편집 모드 진입: `useState(false)` — URL에 반영하지 않음

수정 가능 항목:

- 제목: Input
- 기본 인분 수: number Input
- 재료: 각 재료별 name/amount/unit/note 인라인 편집
  - 재료 추가/삭제 버튼
  - 드래그 정렬 MVP 미지원
- 조리 단계: textarea 기반 각 단계 편집
  - 단계 추가/삭제 버튼
- 팁: textarea 리스트

저장: "저장하기" 버튼 → PATCH /api/recipes/:id

- confidence, warnings는 원본 값 유지
- 저장 후 edit 모드 해제 + SWR mutate로 데이터 갱신

취소: "취소" 버튼

- 변경 사항 있으면 확인 dialog ("수정 내용을 버리시겠습니까?")
- 변경 없으면 바로 view 모드

### Task 3-2. 히스토리 페이지 (Screen E) [M]

**New file: `src/app/history/page.tsx`** — Server Component

구성:

- GET /api/recipes?scope=recent (limit 20)
- 카드 목록: 썸네일, 제목, 시간
- 각 카드 클릭 → /recipes/[id]
- 결과 없으면 빈 상태 UI ("아직 추출한 레시피가 없어요")

**New file: `src/components/history-list.tsx`**

### Task 3-3. 에러 표시 컴포넌트 [S]

**New file: `src/components/error-display.tsx`**

에러 코드별 UI:
| errorCode | 메시지 | 재시도 |
|-----------|--------|--------|
| INVALID_URL | "유효한 유튜브 URL이 아닙니다" | ❌ |
| VIDEO_NOT_FOUND | "영상을 찾을 수 없습니다" | ❌ |
| INSUFFICIENT_SOURCE_TEXT | "자막/설명이 부족합니다" | ❌ |
| NON_RECIPE_VIDEO | "레시피 영상이 아닙니다" | ❌ |
| LLM_REQUEST_FAILED | "AI 처리 중 오류" | ✅ |
| LLM_RATE_LIMITED | "잠시 후 다시 시도해주세요" | ✅ |
| INTERNAL_ERROR | "서버 오류가 발생했습니다" | ✅ |

구성: 에러 아이콘 + 메시지 + 행동 버튼 (재시도 / 홈으로)

---

## Phase 4: 폴리시

### Task 4-1. 모바일 반응형 점검 [M]

- 320px ~ 1440px 대응
- 터치 타겟 최소 44px
- 인분 조절 버튼 모바일 탭 용이
- URL input: type="url" + 모바일 키보드
- 썸네일 lazy loading

### Task 4-2. 로딩 상태 [S]

- `src/app/loading.tsx` — 전역 로딩
- `src/app/recipes/[id]/loading.tsx` — 레시피 Skeleton
- `src/app/history/loading.tsx` — 히스토리 Skeleton
- shadcn/ui Skeleton 컴포넌트 활용

---

## File Structure (New + Modified)

```
src/
├── app/
│   ├── page.tsx                    [MODIFY] 홈 화면
│   ├── layout.tsx                  [MODIFY] Header 추가
│   ├── loading.tsx                 [NEW] 전역 로딩
│   ├── extractions/
│   │   └── [id]/
│   │       └── page.tsx            [NEW] 추출 진행
│   ├── recipes/
│   │   └── [id]/
│   │       ├── page.tsx            [NEW] 결과+편집
│   │       └── loading.tsx         [NEW] Skeleton
│   └── history/
│       ├── page.tsx                [NEW] 히스토리
│       └── loading.tsx             [NEW] Skeleton
├── components/
│   ├── ui/                         [MODIFY] shadcn 추가
│   ├── header.tsx                  [NEW]
│   ├── url-input-form.tsx          [NEW]
│   ├── extraction-progress.tsx     [NEW]
│   ├── recipe-view.tsx             [NEW]
│   ├── serving-control.tsx         [NEW]
│   ├── recipe-edit-form.tsx        [NEW]
│   ├── history-list.tsx            [NEW]
│   └── error-display.tsx           [NEW]
├── lib/
│   ├── api/
│   │   ├── client.ts               [NEW] 프론트엔드 API 클라이언트
│   │   └── response.ts             [EXISTING]
│   └── recipe/
│       ├── scaling.ts              [NEW] 인분 조절 유틸
│       └── service.ts              [EXISTING]
└── __tests__/
    └── lib/recipe/
        └── scaling.test.ts         [NEW] 인분 조절 테스트
```

## Parallel Execution Plan

```
Phase 1 (병렬):     1-1 + 1-2 + 1-3
Phase 2 (순차):     2-1 → 2-2 → 2-3 → 2-4
--- Step 3 검토 ---
Phase 3 (부분 병렬): 3-1 + 3-2 병렬, 3-3 독립
Phase 4 (병렬):     4-1 + 4-2
--- Step 4 검토 ---
```

## Risk Flags

1. **shadcn/ui v4**: @base-ui/react 패턴. v3 문서 참고하지 않기
2. **Next.js 15**: params가 Promise, Server Actions 등 새 API
3. **클립보드 API**: HTTPS 필요, 브라우저 권한 요청
4. **SWR + Server Components**: SWR은 Client Component에서만 사용

## Success Criteria

### Step 3

- URL 입력 → 추출 진행 → 레시피 결과 표시 전체 플로우
- 인분 조절 동작 (클라이언트 계산)
- 폴링 기반 진행 상태 추적
- 모바일 반응형 기본 대응

### Step 4

- 레시피 편집 + PATCH 저장
- 히스토리 목록 표시
- 에러 케이스별 적절한 UI
- 프린트 CSS, 링크 복사 동작
- 전체 화면 반응형 완성
