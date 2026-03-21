# Step 2 Review Result — 2026-03-21

## 자동 검증
```
✅ npm run lint
✅ npm run type-check
✅ npm test       → 12 files passed, 43 passed, 1 skipped
✅ npm run build
```

## 요약
Step 2 AI extraction engine의 핵심 구성요소는 코드상 구현되었고, 로컬 자동 검증도 모두 통과했다.  
다만 **실제 Supabase + Z.ai 자격증명 기반 smoke test는 아직 수행되지 않았고**, 일부 Supabase query typing이 수동 subset/cast에 의존하므로 최종 판정은 `⚠️ CONDITIONAL`이다.

---

## 1. Retry / LLM 계층 ✅

- [x] `src/lib/llm/client.ts`
  - Z.ai `/chat/completions` 호출
  - 429 / timeout / retryable transport 재시도
  - 응답 텍스트 추출
- [x] `src/lib/llm/json-parser.ts`
  - payload text 추출
  - fenced JSON / balanced JSON 파싱
- [x] `src/lib/extraction/schema-retry.ts`
  - schema retry 전용 래퍼
  - `SchemaRetryableError` 지원
- [x] `__tests__/lib/llm/client.test.ts`
- [x] `__tests__/lib/extraction/schema-retry.test.ts`

## 2. Extraction / Schema / Normalization ✅

- [x] `src/lib/extraction/prompts.ts`
  - extraction prompt / repair prompt
- [x] `src/lib/extraction/parser.ts`
  - 모델 출력 JSON 파싱
- [x] `src/lib/extraction/recipe-schema.ts`
  - structured recipe Zod schema
- [x] `src/lib/extraction/normalizer.ts`
  - step ordering / null normalization / warning dedupe
- [x] `src/lib/extraction/unit-map.ts`
  - 단위 alias 정규화
- [x] `src/lib/extraction/extractor.ts`
  - model call → parse → schema retry → normalize
- [x] 관련 단위 테스트
  - `extractor.test.ts`
  - `parser.test.ts`
  - `recipe-schema.test.ts`
  - `normalizer.test.ts`

## 3. Service Orchestration ✅

- [x] `src/lib/extraction/service.ts`
  - `fetching_metadata`
  - `fetching_captions`
  - `structuring`
  - `normalizing`
  - `saving`
  - `completed`
- [x] `PIPELINE_TIMEOUT_MS = 90000`
- [x] source text 부족 시 `INSUFFICIENT_SOURCE_TEXT`
- [x] recipe 판별 실패 시 `NON_RECIPE_VIDEO`
- [x] raw/model/timing debug payload 저장
- [x] `POST /api/extractions`는 extraction row를 만들고 queued 응답을 반환한 뒤 파이프라인을 비동기적으로 진행

### 주의
- 현재 비동기 실행은 route 내부 background dispatch(`setTimeout`) 방식이다.
- 문서상 “job/extraction 기반 async API”에 더 가까워졌지만, 전용 worker/job queue 만큼 견고하지는 않다.

## 4. DB / Recipe Persistence ✅

- [x] `supabase/migrations/002_recipe_tables.sql`
  - `recipes`
  - `ingredients`
  - `steps`
  - `warnings`
- [x] `src/lib/supabase/types.ts`
  - Step 2 tables typed
- [x] `src/lib/recipe/service.ts`
  - `saveRecipeAggregate`
  - `getRecipe`
  - `getRecipeIdByExtractionId`
  - `listRecentRecipes`
  - `updateRecipeAggregate`

### 저장 안정성
- [x] child insert 실패 시 recipe row rollback 수행
- [ ] DB transaction/RPC 기반의 완전한 atomic save는 아직 아님

## 5. API Contract 정합성 ✅/⚠️

### 구현됨
- [x] `POST /api/extractions`
- [x] `GET /api/extractions/:id`
- [x] `GET /api/recipes/:id`
- [x] `PATCH /api/recipes/:id`
- [x] `GET /api/recipes?scope=recent`

### 계약상 여전히 남는 리스크
- [ ] extraction 실행이 durable background worker가 아니라 route-triggered background dispatch에 의존

## 6. 최종 판정

### ⚠️ CONDITIONAL

조건부 통과 사유:
1. **실환경 smoke 미실행**
   - 현재 `.env.local` 없음
   - 실제 `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 로컬 런타임 smoke 미실행
   - `ZAI_MODEL` 실환경 smoke 미실행
2. **Supabase 타입 우회**
   - extraction / recipe service 일부가 manual subset/cast에 의존
3. **background dispatch 한계**
   - 현재 async contract는 흉내가 아니라 실제 queued 응답으로 동작하지만, durable queue 수준은 아님

## 다음 권장 작업
1. `.env.local` 구성
2. 실제 YouTube URL로 `POST /api/extractions` smoke test
3. polling → completed → `recipeId` → `GET /api/recipes/:id` E2E 검증
4. 필요 시 extraction 실행을 durable worker / queue 구조로 분리
