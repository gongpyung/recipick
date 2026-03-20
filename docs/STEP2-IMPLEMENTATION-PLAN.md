# STEP 2 Implementation Plan — AI Extraction Engine

## 목표
Step 1에서 끝나는 `cleanedText` 파이프라인 뒤에 Step 2 AI 추출 엔진을 연결해, YouTube 텍스트를 구조화 레시피로 변환하고 검증/정규화/저장/조회까지 완료한다.

## 현재 기준점 (2026-03-20)
- 현재 `src/lib/extraction/service.ts`는 `structuring` 단계에서 종료된다.
- LLM 호출, schema validation, normalization, recipe 저장, `recipeId` 응답은 아직 없다.
- 현재 API는 `GET /api/extractions/:id` 완료 응답에 `recipeId`를 포함하지 않는다.
- 현재 DB 타입/마이그레이션은 `videos`, `extractions`까지만 정의되어 있다.
- `PIPELINE_TIMEOUT_MS = 8000`은 Step 2의 LLM 호출 + retry까지 포함하기엔 짧다.

## Step 2 성공 조건
1. Z.ai GLM 호출로 레시피 JSON 초안 생성
2. Zod/Schema validation 실패 시 정책 기반 retry 수행
3. 정규화 후 `recipes`, `ingredients`, `steps`, `warnings` 저장
4. extraction 완료 시 `recipeId` 반환
5. 실패/재시도/원본 응답을 디버깅 가능하게 기록
6. 문서(`05`, `06`)와 API/DB 구현이 일치

## 권장 구현 흐름
1. `fetching_metadata`
2. `fetching_captions`
3. `structuring`
   - prompt 입력 조립
   - Z.ai GLM 호출
   - raw model output 저장
4. `normalizing`
   - JSON parse
   - schema validation
   - 단위/수량/step ordering 정규화
5. `saving`
   - recipe aggregate 저장
   - extraction에 `recipe_id` 또는 raw link 정보 반영
6. `completed`

## Retry 정책 (필수)

### 1) LLM 호출 retry
재시도 대상:
- 네트워크 오류
- `AbortError` / upstream timeout
- HTTP 429
- HTTP 5xx
- 응답 본문이 비어 있거나 JSON block 추출 불가

재시도 비대상:
- 입력 소스 부족 (`INSUFFICIENT_SOURCE_TEXT`)
- 명확한 비레시피 영상 (`NON_RECIPE_VIDEO`)
- 프롬프트 규약과 무관한 영구적 4xx 설정 오류

권장 정책:
- 최대 2회 시도 (`initial + 1 retry`)
- backoff: `300ms * 2^(attempt-1)` + small jitter
- 각 시도마다 attempt number / model / latency / truncated raw output 기록

### 2) Schema validation retry
재시도 대상:
- JSON parse 실패
- required field 누락
- enum/range 위반
- 추가 필드 포함

권장 정책:
- validation 전용 repair prompt로 1회 재시도
- repair prompt에는:
  - validation error summary
  - original cleaned text 재전송
  - 이전 잘못된 JSON 첨부
  - "schema 밖 필드 금지" 지시 포함

실패 처리:
- 재시도 후에도 invalid면 extraction `failed`
- `error_code`는 schema/AI 전용 코드로 구분

## 권장 에러 코드 추가
- `LLM_REQUEST_FAILED`
- `LLM_RATE_LIMITED`
- `INVALID_MODEL_OUTPUT`
- `SCHEMA_VALIDATION_FAILED`
- `INSUFFICIENT_SOURCE_TEXT`
- `NON_RECIPE_VIDEO`
- `RECIPE_SAVE_FAILED`

## 데이터 모델 변경

### 신규 테이블
- `recipes`
- `ingredients`
- `steps`
- `warnings`

### extraction 확장 권장
현재 `docs/06-DOMAIN-AND-DB-SCHEMA.md` 기준으로는 한 extraction이 한 recipe를 생성하므로, 아래 둘 중 하나를 택한다.

#### 옵션 A (권장)
`extractions.recipe_id` nullable FK 추가
- extraction polling 응답에서 바로 `recipeId` 제공 가능
- completed/failure 흐름을 단순화

#### 옵션 B
`recipes.extraction_id`만 유지
- 조회 시 recipe lookup 추가 필요
- API 구현이 더 번거롭다

## 파일별 구현 터치포인트
- `src/lib/llm/` — Z.ai client, retry wrapper, response parser
- `src/lib/extraction/recipe-schema.ts` — Zod schema source of truth
- `src/lib/extraction/prompts.ts` — extraction / repair prompt
- `src/lib/extraction/extractor.ts` — model call orchestration
- `src/lib/extraction/parser.ts` — fenced JSON / text response parsing
- `src/lib/extraction/normalizer.ts` — unit/amount/ordering cleanup
- `src/lib/extraction/service.ts` — Step 1 + Step 2 orchestration 통합
- `src/lib/recipe/` — persistence + API mapping
- `src/lib/supabase/types.ts` — Step 2 tables/types 추가
- `supabase/migrations/002_recipe_tables.sql` — Step 2 schema 추가
- `src/app/api/extractions/[id]/route.ts` — completed 응답에 `recipeId` 포함
- `src/app/api/recipes/[id]/route.ts` — recipe 조회 API 추가

## 구현 순서 (병렬화 기준)

### Track A — LLM/Schema/Parser
- Z.ai client 추가
- extraction prompt 작성
- JSON parser + validation retry 구현
- raw output telemetry 구조 정의

### Track B — Extraction/Normalizer
- `service.ts`에서 structuring 이후 단계 연결
- normalization + domain mapping 구현
- timeout/retry/에러 코드 연결

### Track C — DB/API/Tests
- Step 2 migration/types 추가
- recipe read API 추가
- extraction polling completed 응답 보완
- tests/fixtures 추가

## 코드 품질 주의사항
- `getSupabaseServerClient() as unknown as SupabaseSubset` 캐스팅은 Step 2에서 더 위험해진다. Step 2 table 추가와 함께 타입 정합성 회복이 필요하다.
- 현재 `upsertVideo()`가 단계별로 여러 번 호출되므로 Step 2 저장 단계에서는 recipe 저장과 video 갱신 책임을 분리하는 편이 안전하다.
- 전체 파이프라인을 단일 8초 timeout으로 묶으면 retry가 사실상 불가능해진다. Step 2에서는 per-stage timeout + overall guard로 재설계하는 편이 낫다.
- raw output 저장 시 prompt 전문/개인정보를 그대로 남기지 않도록 필드 범위를 제한한다.

## 테스트 계획

### 단위 테스트
- parser: fenced JSON / prose-mixed response / malformed JSON
- validation retry: first invalid, second valid
- normalizer: unit alias / fractional amount / missing base servings
- retry wrapper: 429/5xx/timeout 재시도, non-retryable 4xx 미재시도

### 통합 테스트
- extraction success → `recipeId` 반환
- extraction failed → errorCode/message 유지
- recipe fetch → aggregate shape 반환
- duplicate extraction reuse vs force re-extract

### 회귀 포인트
- 기존 Step 1 URL/YouTube/text-cleaner 테스트 유지
- `GET /api/extractions/:id` 404 shape 재검토
- completed extraction이 문서 contract와 동일한지 확인

## 완료 정의
- `POST /api/extractions`와 polling 응답이 Step 2 contract를 만족
- 저장된 recipe aggregate를 `GET /api/recipes/:id`로 조회 가능
- retry 정책이 테스트로 고정
- raw output / validation failure / save failure가 관찰 가능
