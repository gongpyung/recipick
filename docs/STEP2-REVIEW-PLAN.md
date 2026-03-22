# STEP 2 Review Plan — AI Extraction Engine Retry

## 리뷰 목표

Step 2 구현이 들어온 뒤 아래 4가지를 집중 검토한다.

1. retry가 필요한 경우에만 작동하는가
2. API/DB/document contract가 일치하는가
3. 원본 응답/실패 원인이 디버깅 가능하게 남는가
4. Step 1 동작을 깨지 않았는가

## 현재 선행 이슈 (구현 전 기준)

- `src/app/api/extractions/[id]/route.ts`는 completed 응답에서 `recipeId`를 반환하지 않는다.
- missing extraction에 `VIDEO_NOT_FOUND`를 사용해 의미가 섞여 있다.
- `src/lib/extraction/service.ts`는 `structuring`에서 종료되며 실제 AI extraction retry가 없다.
- `src/lib/supabase/types.ts` / `supabase/migrations/001_initial_schema.sql`은 recipe aggregate를 저장할 수 없다.
- Step 2 전용 plan/review 문서가 없어서 구현 acceptance 기준이 흐릴 수 있다.

## 리뷰 체크리스트

### 1. Retry 설계

- [ ] retryable vs non-retryable 오류가 분리되어 있는가
- [ ] 최대 시도 수가 상수/옵션으로 고정되어 있는가
- [ ] backoff+jitter가 과도하지 않은가
- [ ] validation retry와 transport retry가 섞이지 않았는가
- [ ] 실패 후 마지막 오류 원인이 extraction record에 남는가

### 2. Parser / Schema / Normalizer

- [ ] 모델 응답에서 fenced JSON, plain JSON, prose-mixed JSON을 안정적으로 파싱하는가
- [ ] Zod/schema validation 에러가 사용자 오류와 내부 오류로 적절히 구분되는가
- [ ] repair prompt가 validation error를 구체적으로 전달하는가
- [ ] normalization이 데이터 손실 없이 unit/amount/confidence를 정리하는가

### 3. Service orchestration

- [ ] stage 전환이 `structuring -> normalizing -> saving -> completed` 순서를 따르는가
- [ ] retry 중간 상태가 잘못 `completed`로 노출되지 않는가
- [ ] timeout 정책이 Step 2 latency를 감당하는가
- [ ] raw output / timings / model metadata가 충분히 남는가

### 4. DB / API contract

- [ ] completed extraction polling 응답에 `recipeId`가 포함되는가
- [ ] failed 응답이 문서화된 `errorCode`, `message` shape를 지키는가
- [ ] recipe aggregate가 `docs/06-DOMAIN-AND-DB-SCHEMA.md`와 일치하는가
- [ ] migration / Supabase TS types / runtime query shape가 동기화되어 있는가

### 5. Regression / quality

- [ ] Step 1 URL parser / metadata / caption / cleaner 테스트가 유지되는가
- [ ] force re-extract / cache reuse 규칙이 깨지지 않는가
- [ ] duplicate save 또는 partial save가 없는가
- [ ] lint/typecheck/test가 모두 통과하는가

## 우선 확인해야 할 코드 냄새

1. **Custom Supabase cast 유지**
   - Step 2 테이블이 늘어나면 `unknown as SupabaseSubset`은 누락을 숨긴다.
2. **Single pipeline timeout 8s**
   - LLM 호출 + retry + save까지 한 번에 묶으면 false timeout 위험이 크다.
3. **Error code ambiguity**
   - extraction missing과 video upstream missing을 같은 code로 다루면 운영 분석이 어렵다.
4. **Multiple writes before terminal state**
   - retry 중간 raw output 저장과 terminal failure 저장이 충돌하지 않는지 확인해야 한다.
5. **Docs drift 위험**
   - 구현 후 `05-API-CONTRACT.md`, `06-DOMAIN-AND-DB-SCHEMA.md`, Step 2 docs의 shape가 어긋나지 않게 동시 검토가 필요하다.

## 권장 검증 명령

- `npm run lint`
- `npm run type-check`
- `npm test`

## 리뷰 결과 보고 형식

### PASS 조건

- retry 관련 단위 테스트 존재
- completed polling에서 `recipeId` 확인
- save failure / schema failure / rate limit failure가 재현 가능한 테스트로 고정
- lint/typecheck/test 통과

### FAIL 조건

- retry가 transport/schema failure를 구분하지 못함
- `recipeId` 없이 completed 응답 반환
- DB schema와 runtime types가 불일치
- failure 원인이 로그/DB에 남지 않음
