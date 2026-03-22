# Step 2 Review Result — 2026-03-21 (4차 검토 — Smoke Test PASS)

## 자동 검증

```
✅ npm run lint
✅ npm run type-check
✅ npm test       → 12 files passed, 43 passed, 1 skipped
✅ npm run build
```

## 요약

Step 2 AI extraction engine의 핵심 구성요소가 전부 구현되었고, 로컬 자동 검증 + 빌드 모두 통과했다.
3차 검토에서 `response_format: { type: "json_object" }` 추가가 확인되어 코드 레벨 개선사항은 모두 반영 완료.
최종 판정은 **✅ CONDITIONAL PASS** — 실환경 smoke test만 수행하면 완전 PASS 전환 가능.

---

## 1. Retry / LLM 계층 ✅

- [x] `src/lib/llm/client.ts`
  - Z.ai `/chat/completions` 호출
  - `response_format: { type: "json_object" }` 적용 (3차 검토에서 확인)
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
  - `PIPELINE_TIMEOUT_MS = 90_000`
  - `EXTRACTOR_VERSION = 'step2-ai-engine'`
  - upsertVideo **1회만 호출**
  - `ensureSufficientSourceText`: 40자 미만 → INSUFFICIENT_SOURCE_TEXT
  - `ensureRecipeVideo`: NON_RECIPE_VIDEO warning + error severity → 실패
  - raw_output_json에 source, metadata, captions, cleanedText, llm, normalizedRecipe, timings, persistedRecipe 전부 기록
  - 실패 시 failure.code + failure.message도 raw_output_json에 저장
  - 비동기 dispatch: `setTimeout(() => processExtractionPipeline(...), 0)` — POST 즉시 202 반환
  - completed 시 model_name 저장

### 주의

- 현재 비동기 실행은 route 내부 background dispatch(`setTimeout`) 방식이다.
- 문서상 "job/extraction 기반 async API"에 더 가까워졌지만, 전용 worker/job queue 만큼 견고하지는 않다.

## 4. DB / Recipe Persistence ✅

- [x] `supabase/migrations/002_recipe_tables.sql`
  - recipes (extraction_id UNIQUE), ingredients, steps, warnings
  - ON DELETE CASCADE, CHECK 제약조건, 인덱스 4개
  - tips_json JSONB
- [x] `src/lib/supabase/types.ts`
  - 6개 테이블 Row/Insert/Update 타입 완비
- [x] `src/lib/recipe/service.ts`
  - `saveRecipeAggregate`
  - `getRecipe`
  - `getRecipeIdByExtractionId`
  - `listRecentRecipes`
  - `updateRecipeAggregate`

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

## 6. Regression / Quality ✅

- [x] Step 1 테스트 전부 유지
- [x] Step 2 신규 테스트: extractor, parser, recipe-schema, normalizer, llm/client, schema-retry
- [x] 총 12개 파일, 43개 테스트 케이스

---

## 7. 최종 판정

### ✅ PASS

4차 검토에서 실환경 smoke test 통과로 PASS 전환.

**Smoke Test 결과 (2026-03-21):**

- 테스트 영상: 봄동비빔밥 쇼츠 (`shorts/5TyWCXQxxzY`)
- `POST /api/extractions` → 202 queued ✅
- polling 14회 (~70초) → completed ✅
- `GET /api/recipes/:id` → 레시피 전체 반환 ✅
- 재료 12개, 조리 단계 3개, 팁 3개 정확 추출
- confidence: high

**Smoke Test 중 발견/수정:**

- `DEFAULT_TIMEOUT_MS` 25초 → 90초로 변경 (glm-5 모델이 긴 프롬프트에 ~70초 소요)

**남은 기술 부채 (PASS에 영향 없음):**

1. Supabase 타입 우회 (`as unknown as SupabaseSubset`) — 기능적 이슈 아님
2. background dispatch (`setTimeout`) — 프로덕션 배포 시 durable queue 검토
3. atomic transaction 없음 — rollback으로 보완됨

---

## 검토 이력

| 항목             | 1차 (03-20)      | 2차 (03-21)        | 3차 (03-21)         |
| ---------------- | ---------------- | ------------------ | ------------------- | ------- |
| LLM 클라이언트   | ❌               | ✅                 | ✅                  |
| response_format  | —                | ❌ 미사용          | ✅ json_object 적용 |
| 프롬프트         | ❌               | ✅                 | ✅                  |
| 추출 함수        | ❌               | ✅                 | ✅                  |
| 정규화           | ❌               | ✅                 | ✅                  |
| Zod 스키마       | ❌               | ✅                 | ✅                  |
| JSON 파서        | ❌               | ✅                 | ✅                  |
| 파이프라인       | structuring 멈춤 | ✅ completed       | ✅ completed        |
| PIPELINE_TIMEOUT | 8초              | ✅ 90초            | ✅ 90초             |
| upsertVideo      | 3회              | ✅ 1회             | ✅ 1회              |
| 에러 코드        | 11개             | ✅ 17개            | ✅ 17개             |
| API 엔드포인트   | 2개              | ✅ 5개             | ✅ 5개              |
| 테스트           | 7파일 28케이스   | ✅ 12파일 43케이스 | ✅ 12파일 43케이스  | ✅ 동일 |
| LLM timeout      | 없음             | 25초               | 25초                | ✅ 90초 |
| Smoke Test       | —                | —                  | —                   | ✅ PASS |
| 완성도           | ~35%             | ~95%               | ~98%                | ✅ 100% |

## 다음 권장 작업

1. ~~`.env.local` 구성~~ ✅ 완료
2. ~~실환경 smoke test~~ ✅ PASS
3. ~~`response_format: { type: "json_object" }`~~ ✅ 적용됨
4. Step 3 (프론트엔드) 계획 수립
5. 필요 시 durable worker / queue 구조 도입
