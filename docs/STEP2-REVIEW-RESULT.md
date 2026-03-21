# Step 2 Review Result — 2026-03-21 (2차 검토 반영)

## 자동 검증
```
✅ npm run lint
✅ npm run type-check
✅ npm test       → 12 files passed, 43 passed, 1 skipped
✅ npm run build
```

## 요약
Step 2 AI extraction engine의 핵심 구성요소가 전부 구현되었고, 로컬 자동 검증도 모두 통과했다.
1차 검토(2026-03-20) 대비 **LLM 클라이언트, 프롬프트, 추출 함수, 정규화, 파이프라인 연결**이 모두 추가됨.
다만 **실제 Supabase + Z.ai 자격증명 기반 smoke test는 아직 수행되지 않았고**, 일부 Supabase query typing이 수동 subset/cast에 의존하므로 최종 판정은 `⚠️ CONDITIONAL`이다.

---

## 1. Retry / LLM 계층 ✅

- [x] `src/lib/llm/client.ts`
  - Z.ai `/chat/completions` 호출
  - 429 → retryable, 5xx → retryable, 4xx → non-retryable 분리
  - jitteredBackoff: `300ms * 2^(attempt-1) + random(0-75)`
  - maxAttempts=2 상수
  - AbortController 기반 per-request timeout (25초)
  - parent signal 전파
  - ZAI_API_KEY 런타임 검증 (env.ts에서 optional 유지)
  - fetch 주입 가능 (DI for testing)
  - rawResponse에 contentPreview만 저장 (전체 content 미노출)
- [x] `src/lib/llm/json-parser.ts`
  - `extractTextFromLlmPayload`: choices[].message.content, output_text 등 다양한 형식 지원
  - `findBalancedJsonSegment`: 스택 기반 균형 JSON 블록 탐색
  - fenced JSON (```json) 제거
  - prose-mixed 응답에서 JSON 추출
- [x] `src/lib/extraction/schema-retry.ts`
  - schema retry 전용 래퍼
  - `ZodError` + `SchemaRetryableError` 모두 retry 대상
  - transport 에러는 retry 안 함
  - previousIssues 전달
  - SchemaRetryExhaustedError에 attempts, issues 포함
- [x] `__tests__/lib/llm/client.test.ts`
- [x] `__tests__/lib/extraction/schema-retry.test.ts`

## 2. Extraction / Schema / Normalization ✅

- [x] `src/lib/extraction/prompts.ts`
  - extraction prompt: JSON 구조 명세 포함, 03-EXTRACTION-RULES.md 규칙 반영
  - repair prompt: validation issues + previous JSON + source context 전달
  - "Return JSON only. Do not wrap it in prose." 지시
  - NON_RECIPE_VIDEO warning 지시 포함
- [x] `src/lib/extraction/parser.ts`
  - fenced JSON 추출 + balanced JSON 추출
  - JSON parse 실패 → SchemaRetryableError (retry 대상)
- [x] `src/lib/extraction/recipe-schema.ts`
  - 03-EXTRACTION-SCHEMA.json과 1:1 대응 Zod 스키마
  - `.strict()` 적용 (추가 필드 거부)
  - ingredients.min(1), steps.min(1)
  - tips/warnings에 `.default([])`
- [x] `src/lib/extraction/normalizer.ts`
  - 단위 정규화 (unit-map.ts 사용)
  - step ordering (stepNo 재정렬)
  - null normalization
  - warning dedupe
  - MISSING_BASE_SERVINGS 자동 추가
- [x] `src/lib/extraction/unit-map.ts`
  - 한국어/영어 38개 alias 매핑
  - 큰술→tbsp, 작은술→tsp, 그램→g, 약간/조금/적당량→약간 등
- [x] `src/lib/extraction/extractor.ts`
  - 1차: buildExtractionMessages → generateText → parse → validate
  - 2차 (retry): buildRepairMessages → generateText → parse → validate
  - SchemaRetryExhaustedError → ExtractorError(SCHEMA_VALIDATION_FAILED) 매핑
  - rawOutput, model, attemptCount, requestId 반환
- [x] 관련 단위 테스트
  - `extractor.test.ts`
  - `parser.test.ts`
  - `recipe-schema.test.ts`
  - `normalizer.test.ts`

## 3. Service Orchestration ✅

- [x] `src/lib/extraction/service.ts`
  - 파이프라인 완전 연결: `fetching_metadata` → `fetching_captions` → `structuring` → `normalizing` → `saving` → `completed`
  - `PIPELINE_TIMEOUT_MS = 90_000` (8초에서 변경됨)
  - `EXTRACTOR_VERSION = 'step2-ai-engine'`
  - upsertVideo **1회만 호출** (Step 1 개선 적용됨)
  - `ensureSufficientSourceText`: 40자 미만 → INSUFFICIENT_SOURCE_TEXT
  - `ensureRecipeVideo`: NON_RECIPE_VIDEO warning + error severity → 실패
  - raw_output_json에 source, metadata, captions, cleanedText, llm, normalizedRecipe, timings, persistedRecipe 전부 기록
  - 실패 시 failure.code + failure.message도 raw_output_json에 저장
  - 비동기 dispatch: `setTimeout(() => processExtractionPipeline(...), 0)` — POST 즉시 202 반환
  - completed 시 model_name 저장
- [x] `POST /api/extractions`는 extraction row를 만들고 queued 응답을 반환한 뒤 파이프라인을 비동기적으로 진행

### 주의
- 현재 비동기 실행은 route 내부 background dispatch(`setTimeout`) 방식이다.
- 문서상 "job/extraction 기반 async API"에 더 가까워졌지만, 전용 worker/job queue 만큼 견고하지는 않다.

## 4. DB / Recipe Persistence ✅

- [x] `supabase/migrations/002_recipe_tables.sql`
  - recipes (extraction_id UNIQUE), ingredients, steps, warnings
  - ON DELETE CASCADE, CHECK 제약조건, 인덱스 4개
  - tips_json JSONB
- [x] `src/lib/supabase/types.ts`
  - 6개 테이블 (videos, extractions, recipes, ingredients, steps, warnings) Row/Insert/Update 타입 완비
- [x] `src/lib/recipe/service.ts`
  - `saveRecipeAggregate`: recipe → ingredients → steps → warnings 순서 저장
  - `getRecipe`: recipe + ingredients + steps + warnings aggregate 조회
  - `getRecipeIdByExtractionId`: extraction → recipe ID 조회
  - `listRecentRecipes`: 최근 레시피 + 썸네일 조회
  - `updateRecipeAggregate`: 편집 후 저장 (delete + re-insert, is_user_edited=true)

### 저장 안정성
- [x] child insert 실패 시 recipe row rollback 수행
- [ ] DB transaction/RPC 기반의 완전한 atomic save는 아직 아님

## 5. API Contract 정합성 ✅

### 구현됨 (5개 엔드포인트)
- [x] `POST /api/extractions` → 202 + extractionId
- [x] `GET /api/extractions/:id` → completed 시 recipeId 포함
- [x] `GET /api/recipes/:id` → aggregate 반환
- [x] `PATCH /api/recipes/:id` → 편집 저장 (is_user_edited=true)
- [x] `GET /api/recipes?scope=recent` → 최근 목록

### 에러 코드 (17개)
- INVALID_URL, UNSUPPORTED_URL, VIDEO_NOT_FOUND
- EXTRACTION_NOT_FOUND, RECIPE_NOT_FOUND
- CAPTIONS_NOT_AVAILABLE, INSUFFICIENT_SOURCE_TEXT, NON_RECIPE_VIDEO
- LLM_REQUEST_FAILED, LLM_RATE_LIMITED, INVALID_MODEL_OUTPUT, SCHEMA_VALIDATION_FAILED
- RECIPE_SAVE_FAILED, METADATA_FETCH_FAILED, QUOTA_EXCEEDED, EXTRACTION_TIMEOUT
- INTERNAL_ERROR

### 계약상 여전히 남는 리스크
- [ ] extraction 실행이 durable background worker가 아니라 route-triggered background dispatch에 의존

## 6. Regression / Quality ✅

- [x] Step 1 테스트 전부 유지 (url-parser, api-client, text-cleaner, env, response, errors)
- [x] Step 2 신규 테스트: extractor, parser, recipe-schema, normalizer, llm/client, schema-retry
- [x] 총 12개 파일, 43개 테스트 케이스

---

## 7. 최종 판정

### ⚠️ CONDITIONAL

조건부 통과 사유:

1. **실환경 smoke 미실행**
   - 현재 `.env.local` 없음
   - 실제 `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 로컬 런타임 smoke 미실행
   - `ZAI_MODEL` 실환경 smoke 미실행

2. **Supabase 타입 우회**
   - `service.ts:131` — `getSupabaseServerClient() as unknown as SupabaseSubset`
   - `recipe/service.ts:123` — `getSupabaseServerClient() as unknown as RecipeSupabaseSubset`
   - 수동 subset/cast에 의존하여 테이블 변경 시 누락 위험

3. **background dispatch 한계**
   - `setTimeout(() => processExtractionPipeline(...), 0)` 기반
   - Vercel serverless에서 함수 종료 후 실행 보장 안 됨
   - durable queue 수준은 아님

4. **atomic transaction 없음**
   - recipe 저장이 rollback으로 보완되지만 DB transaction 수준은 아님

### 개선 권장 (필수 아님)
- `response_format: { type: "json_object" }` 추가 — Phase 0에서 Z.ai 지원 확인됨, JSON 안정성 향상 가능

---

## 1차 → 2차 검토 변경 이력

| 항목 | 1차 검토 (03-20) | 2차 검토 (03-21) |
|------|-----------------|-----------------|
| LLM 클라이언트 | ❌ 미구현 | ✅ 완성 |
| 프롬프트 | ❌ 미구현 | ✅ extraction + repair |
| 추출 함수 | ❌ 미구현 | ✅ schema retry 연동 |
| 정규화 | ❌ 미구현 | ✅ 단위매핑 + ordering |
| Zod 스키마 | ❌ 미구현 | ✅ strict, 단일 원천 |
| JSON 파서 | ❌ 미구현 | ✅ fenced + balanced |
| 파이프라인 | structuring에서 멈춤 | ✅ completed까지 연결 |
| PIPELINE_TIMEOUT | 8초 | ✅ 90초 |
| EXTRACTOR_VERSION | step1-foundation | ✅ step2-ai-engine |
| upsertVideo | 3회 호출 | ✅ 1회 |
| 에러 코드 | 11개 | ✅ 17개 |
| API 엔드포인트 | 2개 | ✅ 5개 |
| 테스트 | 7파일 28케이스 | ✅ 12파일 43케이스 |
| 완성도 | ~35% | ~95% |

## 다음 권장 작업
1. `.env.local` 구성
2. 실제 YouTube URL로 `POST /api/extractions` smoke test
3. polling → completed → `recipeId` → `GET /api/recipes/:id` E2E 검증
4. 필요 시 extraction 실행을 durable worker / queue 구조로 분리
5. `response_format: { type: "json_object" }` LLM client에 추가
