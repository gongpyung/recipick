# src/lib/ -- 핵심 비즈니스 로직 모듈

## 개요

애플리케이션의 모든 비즈니스 로직이 이 디렉토리에 위치한다. UI 레이어(`components/`)와 라우트 레이어(`app/`)는 이 모듈의 함수만 호출하며, 직접 외부 API를 호출하지 않는다.

---

## 모듈 의존 관계

```
app/api/  →  extraction/service  →  youtube/api-client
                                 →  youtube/text-cleaner
                                 →  youtube/url-parser
                                 →  extraction/extractor  →  llm/client
                                                          →  extraction/prompts
                                                          →  extraction/parser
                                                          →  extraction/recipe-schema
                                                          →  extraction/schema-retry
                                                          →  extraction/normalizer
                                 →  recipe/service  →  supabase/client
                                 →  supabase/client

components/  →  api/client  →  (fetch to /api/* routes)
             →  recipe/scaling
             →  youtube/url-parser (클라이언트 측 URL 검증용)
```

**핵심 규칙**: `extraction/`, `recipe/`, `supabase/`, `youtube/api-client`은 서버 전용 모듈이다. 클라이언트 컴포넌트에서 직접 import하면 빌드 에러가 발생한다.

---

## api/ -- API 클라이언트와 서버 응답 헬퍼

### `client.ts` (클라이언트 전용)

브라우저에서 `/api/*` 라우트를 호출하는 fetch 래퍼.

| 함수                                           | 설명                                               |
| ---------------------------------------------- | -------------------------------------------------- |
| `apiFetch<T>(url, options)`                    | 공통 fetch + 에러 핸들링. 실패 시 `ApiError` throw |
| `createExtraction(youtubeUrl, forceReExtract)` | `POST /api/extractions`                            |
| `getExtraction(id)`                            | `GET /api/extractions/[id]`                        |
| `getRecipe(id)`                                | `GET /api/recipes/[id]`                            |
| `getRecentRecipes()`                           | `GET /api/recipes?scope=recent`                    |
| `updateRecipe(id, data)`                       | `PATCH /api/recipes/[id]`                          |

**주의**: `ApiError` 클래스는 `code`, `status`, `category` 프로퍼티를 가진다. SWR의 `error` 객체에서 이 프로퍼티들을 직접 참조한다.

### `response.ts` (서버 전용)

API 라우트에서 사용하는 응답 헬퍼.

| 함수                                   | 설명                                         |
| -------------------------------------- | -------------------------------------------- |
| `errorResponse(code, message, status)` | `{ error, code, category }` 형태의 JSON 응답 |
| `successResponse(data, status)`        | 성공 JSON 응답 (기본 200)                    |

에러 카테고리는 `ExtractionErrorCode`에서 자동 추론되며, 그 외 코드는 HTTP 상태로부터 추론한다.

---

## extraction/ -- 추출 파이프라인 핵심

### 파일별 역할

| 파일               | 역할                                                          | 서버/클라이언트 |
| ------------------ | ------------------------------------------------------------- | --------------- |
| `service.ts`       | 파이프라인 오케스트레이터. 모든 단계를 조율                   | 서버 전용       |
| `extractor.ts`     | LLM 호출 + schema-retry 루프                                  | 서버 전용       |
| `normalizer.ts`    | 추출 결과 정규화 (유닛, confidence, 중복 경고 제거)           | 서버 전용       |
| `prompts.ts`       | LLM 시스템/유저 프롬프트 빌더                                 | 서버 전용       |
| `parser.ts`        | LLM 텍스트 응답에서 JSON 추출 (fenced block, balanced braces) | 서버 전용       |
| `recipe-schema.ts` | Zod v4 스키마 정의 + `parseStructuredRecipe()`                | 양쪽 사용 가능  |
| `schema-retry.ts`  | Zod 실패 시 이전 이슈를 포함한 재시도 로직                    | 서버 전용       |
| `errors.ts`        | `ExtractionErrorCode` enum + 한국어 메시지 매핑               | 양쪽 사용 가능  |
| `types.ts`         | 모든 도메인 타입 정의 (StructuredRecipe, ExtractionRecord 등) | 양쪽 사용 가능  |
| `unit-map.ts`      | 한국어/영어 계량 단위 정규화 맵                               | 양쪽 사용 가능  |

### `service.ts` 핵심 함수

| 함수                               | 설명                                                |
| ---------------------------------- | --------------------------------------------------- |
| `createExtraction(url, options?)`  | 외부 진입점. URL 검증 → 캐시 확인 → 파이프라인 시작 |
| `getExtraction(id)`                | 추출 상태 조회 (폴링용)                             |
| `processExtractionPipeline(input)` | 6단계 비동기 파이프라인. `setTimeout(0)`으로 호출됨 |

### 에러 코드 체계 (`errors.ts`)

| 카테고리         | 코드 예시                                                       | HTTP 상태     |
| ---------------- | --------------------------------------------------------------- | ------------- |
| `user_error`     | `INVALID_URL`, `NON_RECIPE_VIDEO`, `INSUFFICIENT_SOURCE_TEXT`   | 400, 404, 422 |
| `upstream_error` | `LLM_REQUEST_FAILED`, `QUOTA_EXCEEDED`, `METADATA_FETCH_FAILED` | 429, 502, 504 |
| `internal_error` | `INTERNAL_ERROR`, `RECIPE_SAVE_FAILED`                          | 500           |

### 주의사항

- `ExtractionServiceError`는 `service.ts` 내부에서만 사용. API 라우트에서는 `code`/`status` 프로퍼티를 통해 에러 응답 생성
- `normalizeStructuredRecipe()`는 `extractor.ts`와 `service.ts`에서 각각 호출됨 -- 2단계 정규화
- LLM 프롬프트(`prompts.ts`)는 영어로 작성됨. 한국어 영상에서 한국어 레시피를 반환하도록 LLM이 자동 판단
- `EXTRACTOR_VERSION = 'step2-ai-engine'` -- 추출기 버전 추적용 상수

---

## llm/ -- Z.ai LLM 클라이언트

### `client.ts`

OpenAI 호환 `/chat/completions` 엔드포인트를 호출하는 HTTP 클라이언트.

| 설정            | 기본값                              |
| --------------- | ----------------------------------- |
| 모델            | `glm-4.5-air`                       |
| temperature     | `0.1` (결정적 출력)                 |
| 타임아웃        | 90초                                |
| 최대 시도       | 2회                                 |
| response_format | `json_object`                       |
| 재시도 백오프   | `300ms * 2^(n-1) + random(0..74ms)` |

**핵심 클래스**: `LlmClientError` -- `code` (`LLM_REQUEST_FAILED` | `LLM_RATE_LIMITED` | `INVALID_MODEL_OUTPUT`), `status`, `retryable` 프로퍼티

**의존성 주입**: `fetchImpl`, `signal` 옵션으로 테스트/파이프라인 abort 가능

### `json-parser.ts`

LLM 응답 페이로드에서 텍스트를 추출하는 다형적 파서.

지원하는 응답 형식:

1. `string` (직접 텍스트)
2. `{ output_text: string }` (일부 모델)
3. `{ content: string }` (직접)
4. `{ content: [{ text }] }` (OpenAI content parts)
5. `{ choices: [{ message: { content } }] }` (OpenAI 표준)

**주의**: `findBalancedJsonSegment()`는 중첩 JSON을 올바르게 추출하기 위해 스택 기반 파서를 사용. 정규식 기반이 아님.

---

## recipe/ -- 레시피 영속성과 스케일링

### `service.ts` (서버 전용)

| 함수                            | 설명                                                                      |
| ------------------------------- | ------------------------------------------------------------------------- |
| `saveRecipeAggregate(input)`    | 레시피 + 재료 + 단계 + 경고를 한 번에 저장. 자식 저장 실패 시 레시피 롤백 |
| `getRecipe(id)`                 | 레시피 + 자식 테이블 + 영상 정보를 조인하여 `RecipeDetails` 반환          |
| `listRecentRecipes(limit)`      | 최근 레시피 목록 (기본 20개)                                              |
| `updateRecipeAggregate(input)`  | 레시피 수정 (delete-then-insert 전략)                                     |
| `getRecipeIdByExtractionId(id)` | extraction → recipe ID 조회                                               |

**롤백 전략**: `saveRecipeAggregate`에서 재료/단계/경고 저장 실패 시 레시피 행을 삭제하는 "수동 롤백" 사용. Supabase가 DB 트랜잭션을 직접 지원하지 않기 때문이며, 기술 부채로 분류됨.

**수정 전략**: `updateRecipeAggregate`에서 자식 테이블을 전부 삭제 후 재삽입 (delete-then-insert). 부분 업데이트보다 단순하지만 비용이 높음.

### `scaling.ts` (클라이언트 사용 가능)

| 함수                                        | 설명                             |
| ------------------------------------------- | -------------------------------- |
| `scaleIngredient(ingredient, target, base)` | 인분 비율에 따른 재료량 계산     |
| `formatAmount(amount)`                      | 숫자 포맷 (정수 또는 소수 1자리) |

**스케일링 규칙**:

- `baseServings === null` 또는 `scalable === false` → 원본 값 유지
- `baseServings === 0` → 0으로 나누기 방지, 원본 유지
- 그 외 → `amount * (targetServings / baseServings)`

---

## supabase/ -- 데이터베이스 클라이언트

### `client.ts`

서버 전용 Supabase 클라이언트. `service_role_key`를 사용하며 싱글톤으로 캐시됨.

**중요**: auth 기능은 비활성화 (`autoRefreshToken: false`, `persistSession: false`). RLS 없이 service role로 직접 접근.

### `types.ts`

`Database` 인터페이스가 Supabase의 6개 테이블 스키마를 정의. Row/Insert/Update 타입과 외래키 관계가 명시되어 있다.

**내보내기 패턴**: 각 테이블에 대해 `Row`, `Insert`, `Update` 타입을 export. 예: `VideoRow`, `VideoInsert`, `VideoUpdate`.

---

## youtube/ -- YouTube 데이터 접근

### `url-parser.ts` (클라이언트 + 서버)

| 지원 형식 | 예시                                 |
| --------- | ------------------------------------ |
| 표준      | `https://www.youtube.com/watch?v=ID` |
| 단축      | `https://youtu.be/ID`                |
| 모바일    | `https://m.youtube.com/watch?v=ID`   |
| Shorts    | `https://www.youtube.com/shorts/ID`  |

**규칙**:

- HTTPS만 허용
- 영상 ID는 정확히 11자 (`[A-Za-z0-9_-]{11}`)
- `sourceType`은 `'video'` 또는 `'shorts'`

### `api-client.ts` (서버 전용)

YouTube Data API v3을 호출하여 메타데이터와 자막을 가져온다.

| 함수                                   | 설명                                       |
| -------------------------------------- | ------------------------------------------ |
| `fetchVideoMetadata(videoId, options)` | 제목, 설명, 썸네일, 채널명, 언어, 재생시간 |
| `fetchCaptions(videoId, options)`      | 자막 텍스트 + 언어 + 자동생성 여부         |

**자막 우선순위**: 수동 자막 > 자동 자막, 한국어 > 영어 > 기타

**에러 처리**: `YouTubeApiError` (`QUOTA_EXCEEDED`, `VIDEO_NOT_FOUND`, `METADATA_FETCH_FAILED`, `CAPTIONS_FETCH_FAILED`)

### `text-cleaner.ts` (서버 전용)

YouTube 설명/자막 텍스트에서 노이즈를 제거하는 전처리기.

**제거 대상**: 타임스탬프 (`0:00`, `[1:23]`), URL, 해시태그, 연속 중복 줄
**출력**: `CleanedText` -- `combinedText`, `descriptionText`, `captionText`, `usedSources`

---

## env.ts -- 환경변수 관리

Zod 스키마로 환경변수를 검증하고 캐시한다.

- `readEnv()`: 검증된 환경변수 객체 반환. 실패 시 상세 에러 메시지와 함께 throw
- `resetEnvForTests()`: 테스트에서 캐시 리셋용

---

## utils.ts -- 유틸리티

`cn()` 함수 (clsx + tailwind-merge). shadcn/ui 패턴.

---

## 흔한 실수와 주의사항

1. **서버 모듈을 클라이언트에서 import하지 말 것**: `extraction/service`, `recipe/service`, `supabase/client`, `youtube/api-client`는 서버 전용
2. **Supabase 타입 캐스팅을 직접 수정하지 말 것**: 기존 `SupabaseSubset` 패턴을 유지. 전면 리팩토링이 필요한 부분
3. **LLM 프롬프트 수정 시 schema-retry 테스트도 확인**: 스키마 변경은 `recipe-schema.ts`, `prompts.ts`, `normalizer.ts`가 모두 연동됨
4. **에러 코드 추가 시 3곳 수정 필요**: `errors.ts` (정의) + `service.ts` (매핑) + 클라이언트 UI (표시)
5. **`cleanYouTubeText`의 출력이 LLM 프롬프트의 입력**: 텍스트 클리닝 로직 변경은 LLM 추출 품질에 직접 영향
