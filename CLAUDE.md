@AGENTS.md

# 레시픽 (Recipick) — Claude 작업 가이드

## 프로젝트 개요

**서비스명**: 레시픽 (Recipick)
**슬로건**: YouTube 영상에서 레시피를 뽑아내는 AI 도우미
**핵심 기능**:
- YouTube URL 입력 → 자막·설명 추출 → Z.ai LLM으로 구조화된 레시피 생성
- 인분 자동 조절 (배율 기반 재료 스케일링)
- 추출 이력 조회 및 레시피 편집
- 귀여운 한국 앱 스타일 UI (핑크/베이지/세이지 그린 팔레트)

**개발 상태**: 핵심 파이프라인 완성, 배포 준비 단계 (TODO.md 참고)

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 (App Router), React 19 |
| 언어 | TypeScript 5 (strict) |
| 스타일링 | Tailwind CSS v4, shadcn/ui v4, tw-animate-css |
| UI 컴포넌트 | shadcn/ui v4 (`@base-ui/react`), lucide-react |
| 데이터베이스 | Supabase (PostgreSQL) |
| LLM | Z.ai API (`glm-4.5-air` 기본값) |
| 데이터 페칭 | SWR v2 (클라이언트), Server Components (SSR) |
| 유효성 검증 | Zod v4 |
| 유닛 테스트 | Vitest v3 |
| E2E 테스트 | Playwright |
| 린트/포맷 | ESLint 9, Prettier (tailwindcss 플러그인 포함) |

---

## 주요 명령어

```bash
# 개발 서버
npm run dev

# 프로덕션 빌드
npm run build

# 유닛 테스트 (단발 실행)
npm run test

# 유닛 테스트 (감시 모드)
npm run test:watch

# E2E 테스트
npm run test:e2e

# E2E 테스트 (UI 모드)
npm run test:e2e:ui

# 타입 검사
npm run type-check

# 린트
npm run lint

# 포맷
npm run format
```

**품질 게이트 (커밋 전)**: `npm run type-check && npm run lint && npm run test`

---

## 환경변수 (.env.local)

`.env.example`을 복사해서 작성한다.

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# YouTube Data API v3
YOUTUBE_API_KEY=<google-api-key>

# Z.ai LLM (선택)
ZAI_API_KEY=<z-ai-key>
ZAI_BASE_URL=https://api.z.ai/api/coding/paas/v4   # 기본값
ZAI_MODEL=glm-4.5-air                               # 기본값
```

환경변수는 `src/lib/env.ts`의 Zod 스키마로 시작 시점에 검증된다. 누락 시 명확한 오류 메시지가 출력된다.

---

## 프로젝트 구조

```
src/
├── app/                        # Next.js App Router 페이지
│   ├── api/
│   │   ├── extractions/        # POST /api/extractions, GET /api/extractions/[id]
│   │   └── recipes/            # GET /api/recipes, GET/PATCH /api/recipes/[id]
│   ├── extractions/[id]/       # 추출 진행 페이지
│   ├── history/                # 추출 이력 페이지
│   ├── recipes/[id]/           # 레시피 상세 페이지
│   ├── globals.css             # 디자인 시스템 (테마 토큰, 유틸리티 클래스)
│   ├── layout.tsx              # 루트 레이아웃 (폰트: Jua + Gowun Dodum)
│   └── page.tsx                # 홈 (URL 입력 + 최근 레시피)
├── components/                 # UI 컴포넌트
│   ├── ui/                     # shadcn/ui 기본 컴포넌트
│   ├── recent-recipes.tsx      # Server Component (SSR)
│   ├── extraction-progress.tsx # SWR 폴링
│   ├── recipe-view.tsx         # 레시피 뷰어 + 인분 조절
│   ├── recipe-edit-form.tsx    # 레시피 편집
│   └── history-list.tsx        # 이력 목록
└── lib/
    ├── api/
    │   ├── client.ts           # 클라이언트 fetch 래퍼 (apiFetch)
    │   └── response.ts         # API 응답 헬퍼
    ├── env.ts                  # Zod 환경변수 검증 + 캐싱
    ├── extraction/
    │   ├── service.ts          # 추출 파이프라인 오케스트레이터
    │   ├── extractor.ts        # LLM 호출 + schema-retry
    │   ├── normalizer.ts       # 레시피 정규화
    │   ├── schema-retry.ts     # Zod 실패 시 재시도 로직
    │   ├── prompts.ts          # LLM 프롬프트
    │   ├── recipe-schema.ts    # Zod 레시피 스키마
    │   ├── errors.ts           # ExtractionErrorCode 열거형
    │   └── types.ts            # 추출 타입 정의
    ├── llm/
    │   ├── client.ts           # Z.ai HTTP 클라이언트 (재시도 포함)
    │   └── json-parser.ts      # LLM 응답 JSON 파싱
    ├── recipe/
    │   ├── service.ts          # 레시피 CRUD (Supabase)
    │   └── scaling.ts          # 인분 배율 계산
    ├── supabase/
    │   ├── client.ts           # Supabase 클라이언트 (서버/클라이언트 분리)
    │   └── types.ts            # DB 행 타입 (ExtractionRow, VideoRow 등)
    └── youtube/
        ├── api-client.ts       # YouTube Data API v3
        ├── text-cleaner.ts     # 자막·설명 전처리
        └── url-parser.ts       # YouTube URL 파싱
```

---

## 중요 패턴

### 1. SWR — 클라이언트 데이터 페칭

클라이언트 컴포넌트에서 `SWR`로 API를 폴링한다. `extraction-progress.tsx`가 대표 사례다.

```typescript
// 추출 상태 폴링 (완료/실패 시 자동 중단)
const { data } = useSWR(
  `/api/extractions/${extractionId}`,
  fetcher,
  { refreshInterval: isActive ? 2000 : 0 }
)
```

`src/lib/api/client.ts`의 `apiFetch`를 SWR fetcher로 사용한다.

### 2. Server Components — SSR 데이터 페칭

`recent-recipes.tsx`는 `async` 서버 컴포넌트로, DB를 직접 조회해 HTML로 렌더링한다. 클라이언트 JS를 실행하지 않으므로 초기 로딩이 빠르다.

```typescript
// 서버에서 직접 Supabase 쿼리
export async function RecentRecipes() {
  const items = (await listRecentRecipes()).slice(0, 5)
  // ...JSX 반환
}
```

### 3. Supabase 타입 캐스팅 패턴 (SupabaseSubset)

`@supabase/supabase-js`의 제네릭 클라이언트 타입이 복잡하기 때문에, 실제로 쓰는 테이블/메서드만 인터페이스로 선언해 `as unknown as SupabaseSubset`으로 캐스팅한다.

```typescript
// src/lib/extraction/service.ts
interface SupabaseSubset {
  from(table: 'videos'): VideosTableClient
  from(table: 'extractions'): ExtractionsTableClient
}

function getSupabase(): SupabaseSubset {
  const client: unknown = getSupabaseServerClient()
  return client as SupabaseSubset  // 의도적 캐스팅
}
```

이 패턴은 기술 부채로 분류되어 있다 (TODO.md 참고). 수정 시 전체 캐스팅 체인을 함께 정리해야 한다.

### 4. LLM 재시도 전략 (2-tier retry)

**Tier 1 — transport retry** (`src/lib/llm/client.ts`):
- 기본 2회 시도, `retryable` 오류(5xx, 네트워크 오류, 빈 응답)에만 재시도
- jittered exponential backoff: `300ms * 2^(attempt-1) + random(0..74)ms`

**Tier 2 — schema retry** (`src/lib/extraction/schema-retry.ts`):
- Zod 검증 실패 시 이전 실패 내역을 프롬프트에 포함해 LLM 재호출
- `runWithSchemaRetry({ generate, validate, maxAttempts: 2 })`
- `ZodError` 또는 `SchemaRetryableError`가 아닌 오류는 즉시 throw

전체 파이프라인 타임아웃은 90초 (`PIPELINE_TIMEOUT_MS`)다.

### 5. v0 스타일 귀여운 한국 디자인

`src/app/globals.css`에 디자인 토큰이 정의되어 있다.

**팔레트**:
- primary: `#e8a4b8` (소프트 핑크)
- secondary: `#f5e6d3` (웜 베이지)
- accent: `#c8e6c9` (세이지 그린)
- background: `#fef7f9`

**폰트**:
- `--font-display` / `.font-display`: 주아 (Jua) — 제목, 브랜딩
- `--font-body` / `.font-body`: 고운돋움 (Gowun Dodum) — 본문

**유틸리티 클래스** (globals.css 정의):
- `.card-culinary` — 핑크 그림자 카드 (hover 시 lift)
- `.hero-bg` — 핑크 그라데이션 배경
- `.tips-sage` — 세이지 그린 팁 박스
- `.warn-amber` — 앰버 경고 박스
- `.badge-gold` — 골드 배지
- `.step-connector` — 조리 단계 연결선

---

## 테스트 전략

### 유닛 테스트 (Vitest)
- 위치: `src/**/*.test.ts`
- 대상: `src/lib/` 내 순수 함수 (파싱, 스케일링, 정규화, 오류 매핑)
- 실행: `npm run test`

### E2E 테스트 (Playwright)
- 위치: `e2e/`
- 설정: `playwright.config.ts`
- 브라우저: Desktop Chrome (1440×900), Mobile Pixel 7 (375×812)
- 로컬에서는 기존 dev 서버 재사용 (`reuseExistingServer: true`)
- CI에서는 단일 worker, 2회 재시도
- 현재 44개 테스트 (봄동비빔밥, 대파제육볶음 smoke test 포함)
- 실행: `npm run test:e2e`

---

## 리뷰 프로세스 (3단계)

비사소한 소스 변경에 적용한다.

1. **UI/UX 검토** (`ui-ux-pro-max`): 귀여운 한국 앱 스타일 일관성, 반응형, 접근성
2. **코드 리뷰** (`code-review`): 로직 결함, 타입 안전성, 패턴 준수, 기술 부채 확산 방지
3. **직접 검토**: 체크리스트 + 자동 검증 (`type-check`, `lint`, `test`)

---

## 추출 파이프라인 흐름

```
YouTube URL 입력
  → parseYouTubeUrl (유효성 검사)
  → Supabase: 기존 추출 재사용 여부 확인 (TTL: 24시간)
  → 신규: extraction record 생성 (status: queued)
  → setTimeout 0ms로 비동기 파이프라인 시작
      ├── fetching_metadata  : YouTube API → 제목, 설명, 썸네일
      ├── fetching_captions  : youtube-transcript 라이브러리
      ├── structuring        : Z.ai LLM → 구조화된 JSON (schema-retry 포함)
      ├── normalizing        : 정규화 + 비레시피 영상 판별
      └── saving             : Supabase에 recipe aggregate 저장
  → status: completed | failed
```

클라이언트는 SWR로 `/api/extractions/[id]`를 2초마다 폴링해 진행 상태를 표시한다.

---

## 기술 부채 (작업 전 인지 필요)

- `as unknown as SupabaseSubset` 캐스팅 → 정식 타입 생성으로 교체 예정
- `setTimeout` 백그라운드 파이프라인 → durable worker/queue 전환 예정
- `<img>` 태그 → `next/image` 마이그레이션 예정
- DB rollback 보완 필요

자세한 내용은 `TODO.md` 참고.
