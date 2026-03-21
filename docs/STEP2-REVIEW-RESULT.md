# Step 2 Review Result — 2026-03-21

## 자동 검증
```
✅ npm run lint
✅ npm run type-check
✅ npm test       → 12 files passed, 43 tests passed, 1 skipped
✅ npm run build
```

## 구현 현황

### 1) LLM / Parser / Schema / Normalizer
- [x] `src/lib/llm/client.ts` — Z.ai chat completion client + transport retry
- [x] `src/lib/llm/json-parser.ts` — LLM payload text 추출 / JSON block 파싱
- [x] `src/lib/extraction/prompts.ts` — extraction / repair prompt
- [x] `src/lib/extraction/extractor.ts` — extraction orchestration + schema retry
- [x] `src/lib/extraction/parser.ts` — 구조화 JSON 파싱 보조
- [x] `src/lib/extraction/recipe-schema.ts` — Zod recipe schema
- [x] `src/lib/extraction/normalizer.ts` — nullable normalization / warning dedupe / step ordering
- [x] `src/lib/extraction/unit-map.ts` — 단위 alias 정규화

### 2) Service Orchestration
- [x] `service.ts`가 `fetching_metadata → fetching_captions → structuring → normalizing → saving → completed` 흐름을 수행
- [x] `PIPELINE_TIMEOUT_MS` 확장 (`90000`)
- [x] source text 부족 시 `INSUFFICIENT_SOURCE_TEXT` 처리
- [x] LLM/정규화/저장 디버그 정보 `raw_output_json`에 기록
- [x] completed extraction 반환 경로 구현

### 3) DB / API
- [x] `002_recipe_tables.sql` — recipes / ingredients / steps / warnings
- [x] `src/lib/supabase/types.ts` — Step 2 table types
- [x] `src/lib/recipe/service.ts` — recipe aggregate 조회 + 저장
- [x] `GET /api/extractions/:id` — completed 시 `recipeId` 반환
- [x] `GET /api/recipes/:id` — recipe aggregate 조회

### 4) Retry 정책
- [x] transport retry: `src/lib/llm/client.ts`
- [x] schema retry: `src/lib/extraction/schema-retry.ts`
- [x] parser failure를 retryable issue로 승격
- [x] repair prompt에 이전 output + validation issues 포함

## 테스트 범위
- `__tests__/lib/llm/client.test.ts`
- `__tests__/lib/extraction/extractor.test.ts`
- `__tests__/lib/extraction/parser.test.ts`
- `__tests__/lib/extraction/recipe-schema.test.ts`
- `__tests__/lib/extraction/normalizer.test.ts`
- 기존 Step 1 테스트 전체 유지

## 남은 리스크 / 제한
1. **실서비스 smoke 미실행**
   - 현재 로컬 환경에서 `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`가 없고
   - `ZAI_MODEL`도 로컬 런타임 기준 비어 있어
   - 실제 Z.ai + Supabase end-to-end smoke test는 아직 미실행
2. **타입 안전성 우회**
   - `service.ts`의 `as unknown as SupabaseSubset` 패턴은 여전히 존재
   - 동작은 하지만 장기적으로는 generated types / query helper 정비가 필요
3. **비동기 job 계약**
   - 현재 구현은 extraction route 내부에서 파이프라인을 수행하므로
   - 문서상 “job/extraction 기반 비동기 API”와 완전히 일치한다고 보긴 어렵다

## 최종 판정
### ⚠️ CONDITIONAL

코드 기준 Step 2 핵심 AI extraction engine 구성요소는 구현되었고, 로컬 자동 검증도 모두 통과했다.  
다만 **실제 Z.ai + Supabase 자격증명 기반 smoke test 부재**와 **완전한 비동기 job 계약 미정리** 때문에 최종 PASS 대신 CONDITIONAL로 판정한다.

## 다음 권장 작업
1. `.env.local`에 실제 Supabase / Z.ai 값 세팅
2. 실제 YouTube URL로 `POST /api/extractions` smoke 실행
3. completed extraction → `GET /api/extractions/:id` → `GET /api/recipes/:id` E2E 확인
4. 필요 시 extraction 실행을 background job/polling 구조로 분리
