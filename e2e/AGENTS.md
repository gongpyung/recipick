# e2e/ -- Playwright E2E 테스트 가이드

## 개요

Playwright 기반 E2E 테스트. 모든 테스트는 API 라우트를 mock하여 외부 의존성(YouTube, LLM, Supabase) 없이 실행된다. 총 44개 테스트.

---

## 디렉토리 구조

```
e2e/
├── fixtures/           # 테스트용 mock 데이터
│   ├── extraction.ts   # 추출 응답 fixture (생성, 단계별 폴링, 실패)
│   └── recipe.ts       # 레시피 응답 fixture (상세, 인분없음, 최근목록)
├── helpers/
│   └── api-mock.ts     # Playwright route mock 헬퍼 함수
└── tests/              # 테스트 파일
    ├── home.spec.ts        # 홈 페이지 (URL 입력, 검증, 제출)
    ├── extraction.spec.ts  # 추출 진행 (타임라인, 완료 리다이렉트, 실패)
    ├── recipe.spec.ts      # 레시피 상세 (재료, 단계, 인분 조절, 편집)
    ├── recipe-edit.spec.ts # 레시피 편집 (수정, 저장)
    ├── history.spec.ts     # 이력 페이지 (목록, 빈 상태)
    └── responsive.spec.ts  # 반응형 (하단 네비 표시/숨김)
```

---

## 설정 (`playwright.config.ts`)

| 항목 | 값 |
|------|-----|
| `testDir` | `./e2e` |
| `outputDir` | `./e2e/.results` |
| `fullyParallel` | `true` |
| `timeout` | 30초 |
| `baseURL` | `http://localhost:3000` |
| `webServer` | `npm run dev` |

### 프로젝트 (브라우저)

| 이름 | 디바이스 | 뷰포트 |
|------|---------|--------|
| `desktop` | Desktop Chrome | 1440 x 900 |
| `mobile` | Pixel 7 | 375 x 812 |

### CI vs 로컬

- **로컬**: 기존 dev 서버 재사용 (`reuseExistingServer: true`), 병렬 실행
- **CI**: 새 dev 서버 시작, 단일 worker (`workers: 1`), 2회 재시도 (`retries: 2`)

---

## Mock 헬퍼 (`helpers/api-mock.ts`)

모든 테스트는 Playwright의 `page.route()` API로 `/api/*` 요청을 가로채서 mock 응답을 반환한다.

| 함수 | mock 대상 | 메서드 |
|------|----------|--------|
| `mockExtractionCreate(page, response)` | `**/api/extractions` | POST |
| `mockExtractionPolling(page, stages[])` | `**/api/extractions/*` | GET (순차 응답) |
| `mockRecipeDetail(page, recipe)` | `**/api/recipes/*` | GET (scope 없는 요청) |
| `mockRecipeUpdate(page, response?)` | `**/api/recipes/*` | PATCH |
| `mockRecentRecipes(page, response)` | `**/api/recipes?scope=recent` | GET |
| `mockRecipeNotFound(page)` | `**/api/recipes/*` | GET (404 응답) |

### 폴링 시뮬레이션

`mockExtractionPolling`은 호출 횟수를 추적하여 `stages[]` 배열을 순차적으로 반환한다. 마지막 원소를 초과하면 마지막 응답을 계속 반환.

```typescript
// 3단계 진행 후 완료
await mockExtractionPolling(page, [
  { status: 'processing', stage: 'validating_url' },
  { status: 'processing', stage: 'fetching_metadata' },
  { status: 'processing', stage: 'structuring' },
  { status: 'completed', recipeId: 'test-recipe-001' },
]);
```

### `route.fallback()` vs `route.continue()`

- `mockRecipeDetail`과 `mockRecipeUpdate`는 `route.fallback()`을 사용하여 다른 mock과 공존 가능
- `mockRecentRecipes`는 `route.fulfill()`만 사용 (scope=recent 정확 매칭)
- 같은 URL에 대해 여러 mock을 등록할 때 순서 주의: 먼저 등록한 handler가 우선

---

## Fixture 데이터

### 추출 Fixture (`fixtures/extraction.ts`)

| 상수 | 설명 |
|------|------|
| `EXTRACTION_CREATE_RESPONSE` | POST 응답 (`{ extractionId: 'ext-001', status: 'queued' }`) |
| `EXTRACTION_STAGES` | 4단계 폴링 시퀀스 (processing x 3 → completed) |
| `EXTRACTION_FAILED` | 실패 응답 (`NON_RECIPE_VIDEO`) |

### 레시피 Fixture (`fixtures/recipe.ts`)

| 상수 | 설명 |
|------|------|
| `MOCK_RECIPE` | 완전한 레시피 (백종원 김치찌개, 2인분, 재료 5개, 단계 3개) |
| `MOCK_RECIPE_NO_SERVINGS` | 인분 없는 레시피 (`baseServings: null`) |
| `MOCK_RECENT_RECIPES` | 최근 레시피 목록 (2개) |
| `MOCK_RECENT_EMPTY` | 빈 레시피 목록 |

---

## 테스트 파일별 커버리지

### `home.spec.ts` -- 홈 페이지

- hero 타이틀과 입력창 표시
- 빈 URL 제출 → 에러 ("YouTube URL is required.")
- 잘못된 URL 제출 → 에러 ("Unsupported YouTube URL format.")
- 유효한 URL 제출 → `/extractions/ext-001`로 이동
- 제출 중 버튼 비활성화 + "레시피 추출 중..." 표시

### `extraction.spec.ts` -- 추출 진행

- 타임라인 6단계 라벨 표시
- 추출 완료 → `/recipes/test-recipe-001`로 리다이렉트
- 추출 실패 → 에러 메시지 + 홈 버튼

### `recipe.spec.ts` -- 레시피 상세

- 제목, 재료, 조리 단계 표시
- 인분 + 버튼 → 재료량 증가 (2인분→3인분: 300g→450g)
- 인분 - 버튼 → 재료량 감소 (2인분→1인분: 300g→150g)
- 팁, 경고 표시
- 인분 없는 레시피 → 조절 불가 안내
- 존재하지 않는 레시피 → 에러 표시

### `recipe-edit.spec.ts` -- 레시피 편집

- 수정 버튼 → 편집 폼 표시
- 제목 변경 + 저장
- 취소 → 원래 뷰어로 복귀

### `history.spec.ts` -- 이력

- 최근 레시피 목록 표시
- 빈 상태 → "아직 추출한 레시피가 없어요" 안내

### `responsive.spec.ts` -- 반응형

- 데스크톱 (1440px) → 하단 네비 숨김
- 모바일 (375px) → 하단 네비 표시

---

## 테스트 작성 규칙

### 1. 모든 외부 API를 mock할 것

실제 YouTube API, LLM, Supabase를 호출하지 않는다. `helpers/api-mock.ts`의 헬퍼를 사용하거나, `page.route()`로 직접 mock.

### 2. 한국어 텍스트로 assertion

UI 텍스트가 한국어이므로 assertion도 한국어를 사용한다.
```typescript
await expect(page.getByText('레시피를 만들고 있어요')).toBeVisible();
await expect(page.getByRole('heading', { name: '백종원 김치찌개' })).toBeVisible();
```

단, URL 파서의 에러 메시지는 영어이므로 주의:
```typescript
await expect(page.getByText('YouTube URL is required.')).toBeVisible();
```

### 3. 타임아웃을 적절히 설정

- 리다이렉트 대기: `page.waitForURL(/regex/, { timeout: 15_000 })`
- 일반 요소 대기: 기본 타임아웃 (30초) 사용

### 4. locator 우선순위

1. `getByRole()` -- 접근성 역할 기반 (권장)
2. `getByText()` -- 텍스트 기반
3. `getByPlaceholder()` -- 입력 필드
4. `locator('.class')` -- CSS 셀렉터 (마지막 수단)

### 5. 새 fixture 추가 시

`fixtures/` 디렉토리에 타입 안전한 상수를 추가. `as const`로 타입 좁히기.

---

## 실행 방법

```bash
# 전체 실행 (headless)
npm run test:e2e

# UI 모드 (디버깅)
npm run test:e2e:ui

# headed 모드 (브라우저 표시)
npm run test:e2e:headed

# 특정 파일만
npx playwright test e2e/tests/home.spec.ts

# 특정 프로젝트만 (desktop or mobile)
npx playwright test --project=desktop
```

---

## 흔한 실수

1. **mock을 `page.goto()` 전에 설정할 것**: `page.route()`는 페이지 탐색 전에 호출해야 첫 번째 요청부터 가로챌 수 있음
2. **최근 레시피 mock 누락**: 홈 페이지는 `RecentRecipes` 서버 컴포넌트가 Supabase를 직접 호출하므로, 홈 페이지 테스트에서는 API mock만으로 충분하지 않을 수 있음. 필요 시 `mockRecentRecipes()` 추가
3. **폴링 mock의 stages 배열 크기**: `mockExtractionPolling`에 전달하는 배열이 너무 짧으면 최종 상태가 반복됨. 완료/실패 상태를 마지막에 포함할 것
4. **desktop/mobile 프로젝트**: 뷰포트에 의존하는 테스트는 프로젝트명으로 실행 범위를 제한할 것
