# Step 1 Review Plan — 개발 완료 후 검토 계획

## 검토 목표

Step 1 구현이 계획대로 완료되었는지, 품질 기준을 충족하는지 확인한다.

---

## 1. 구조 검토 (Structure Review)

### 1-1. 폴더 구조 일치 확인

- [ ] `STEP1-IMPLEMENTATION-PLAN.md`의 폴더 구조와 실제 구조 비교
- [ ] 불필요한 파일이 생성되지 않았는지 확인
- [ ] 누락된 파일이 없는지 확인

### 1-2. 환경변수 검토

- [ ] `.env.example`에 모든 필수 변수가 정의되어 있는지
- [ ] `.env.local`이 `.gitignore`에 포함되어 있는지
- [ ] `lib/env.ts`의 Zod 검증이 필수 변수 누락 시 명확한 에러를 던지는지
- [ ] 민감 정보(API key, service role key)가 코드에 하드코딩되지 않았는지

### 1-3. 의존성 검토

- [ ] `package.json`의 dependencies가 적절한지 (불필요한 패키지 없는지)
- [ ] devDependencies 분리가 올바른지
- [ ] 보안 취약점이 있는 패키지가 없는지 (`npm audit`)

---

## 2. 기능 검토 (Functional Review)

### 2-1. URL 파싱

테스트할 URL 목록:

```
✅ 정상 케이스:
- https://www.youtube.com/watch?v=dQw4w9WgXcQ
- https://youtube.com/watch?v=dQw4w9WgXcQ
- https://youtu.be/dQw4w9WgXcQ
- https://www.youtube.com/shorts/dQw4w9WgXcQ
- https://m.youtube.com/watch?v=dQw4w9WgXcQ
- https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120&list=PLxxx

❌ 비정상 케이스:
- (빈 문자열)
- https://vimeo.com/12345
- https://www.youtube.com/watch (videoId 없음)
- https://www.youtube.com/channel/UCxxx
- not-a-url
```

확인 사항:

- [ ] 모든 정상 URL에서 videoId와 sourceType이 올바르게 추출되는가
- [ ] 모든 비정상 URL에서 적절한 에러가 반환되는가
- [ ] 추가 query param이 있어도 정상 동작하는가

### 2-2. YouTube Data API v3 연동

```
확인 사항:
- [ ] 유효한 videoId로 메타데이터(title, description, thumbnail) 수집 성공
- [ ] 자막 수집 성공 (자막이 있는 영상)
- [ ] 자막 없는 영상에서 null 반환 (에러가 아닌 정상 처리)
- [ ] 자동 생성 자막 fallback 동작
- [ ] 자막 언어 우선순위: 수동 > 자동, 한국어 > 영어 > 기타
- [ ] API 키 없음/잘못됨 시 명확한 에러
- [ ] 존재하지 않는 videoId 처리
- [ ] 비공개/삭제된 영상 처리
```

### 2-3. 텍스트 정리

```
확인 사항:
- [ ] 타임스탬프 제거 ([00:00], 0:00 등)
- [ ] 자동 자막 중복 텍스트 제거
- [ ] 과도한 공백/줄바꿈 정규화
- [ ] 설명란 + 자막 텍스트 결합
- [ ] usedSources 배열이 올바른 소스를 포함하는지
- [ ] 빈 입력 / null 입력 처리
```

### 2-4. Supabase 연동

```
확인 사항:
- [ ] videos 테이블에 데이터 정상 저장
- [ ] extractions 테이블에 레코드 생성
- [ ] youtube_id UNIQUE 제약 조건 동작 (중복 insert 시 upsert)
- [ ] status/stage 업데이트 동작
- [ ] 인덱스 생성 확인
```

### 2-5. API 엔드포인트

```
POST /api/extractions 테스트:
- [ ] 유효한 URL → 202 + extractionId 반환
- [ ] 잘못된 URL → 400 INVALID_URL
- [ ] 지원 불가 URL → 422 UNSUPPORTED_URL
- [ ] 같은 videoId 재요청 (24h 이내) → 캐시된 extractionId 반환
- [ ] forceReExtract: true → 새 extraction 생성
- [ ] 에러 응답 형식이 표준화되어 있는지

GET /api/extractions/:id 테스트:
- [ ] 존재하는 ID → 올바른 상태 반환 (status, stage)
- [ ] 존재하지 않는 ID → 404
- [ ] 응답 형식이 docs/05-API-CONTRACT.md와 일치하는지
```

### 2-6. 캐시 정책

```
확인 사항:
- [ ] 24시간 이내 같은 videoId → 기존 extraction 반환
- [ ] 24시간 초과 → 새 extraction 생성
- [ ] 진행 중인 extraction이 있으면 해당 ID 반환
- [ ] forceReExtract로 캐시 무시 가능
```

---

## 3. 코드 품질 검토 (Code Quality Review)

### 3-1. TypeScript

- [ ] `npm run type-check` (tsc --noEmit) 에러 0건
- [ ] `any` 타입 사용 최소화 (정당한 이유 없이 사용하지 않았는지)
- [ ] 타입 정의가 docs/03-EXTRACTION-SCHEMA.json과 일관성 유지

### 3-2. Lint / Format

- [ ] `npm run lint` 에러 0건
- [ ] 코드 포맷팅 일관성 (Prettier 적용)

### 3-3. 테스트

- [ ] `npm test` 전체 통과
- [ ] URL 파서 테스트 커버리지: 정상 6+ / 비정상 5+ 케이스
- [ ] API 클라이언트 테스트: fixture 기반 mock 사용
- [ ] 텍스트 클리너 테스트: 각 정리 규칙별 케이스
- [ ] 에러 모듈 테스트: 응답 형식 검증
- [ ] API 라우트 테스트 존재 여부

### 3-4. 에러 처리

- [ ] 모든 외부 호출(YouTube API, Supabase)에 try-catch 존재
- [ ] 에러 응답이 표준화 모듈을 통해 생성되는지
- [ ] extraction 실패 시 status가 `failed`로 업데이트되는지
- [ ] error_code와 error_message가 DB에 기록되는지

### 3-5. 보안

- [ ] API key가 클라이언트에 노출되지 않는지 (NEXT*PUBLIC* prefix 주의)
- [ ] Supabase service role key가 서버 사이드에서만 사용되는지
- [ ] 입력 검증이 충분한지 (URL injection 등)
- [ ] CORS 설정 확인

---

## 4. 문서 일치 검토 (Documentation Alignment)

- [ ] API 응답 형식이 `docs/05-API-CONTRACT.md`와 일치
- [ ] DB 스키마가 `docs/06-DOMAIN-AND-DB-SCHEMA.md`와 일치 (videos, extractions 부분)
- [ ] extraction status/stage 값이 `docs/04-AI-PROCESSING-SPEC.md`와 일치
- [ ] 에러 코드가 문서에 정의된 것과 일치

---

## 5. 통합 테스트 (E2E Smoke Test)

실제 YouTube URL로 전체 흐름 수동 테스트:

### Test Case 1: 자막이 풍부한 한국어 요리 영상

```
URL: (실제 한국어 요리 영상 URL)
기대:
- videoId 파싱 성공
- 메타데이터 수집 성공 (한국어 제목)
- 한국어 자막 수집 성공
- videos 테이블에 저장 확인
- extraction 생성 + status=processing 확인
```

### Test Case 2: 쇼츠 URL

```
URL: (실제 쇼츠 URL)
기대:
- sourceType='shorts' 파싱
- 메타데이터 수집 성공
- 자막 수집 (있으면 성공, 없으면 null)
```

### Test Case 3: 자막 없는 영상

```
URL: (자막이 없는 영상 URL)
기대:
- 메타데이터 수집 성공
- 자막: null 반환 (에러 아님)
- extraction은 정상 생성
```

### Test Case 4: 캐시 동작

```
1. 같은 URL로 POST 2번
2. 두 번째 요청은 첫 번째 extractionId 반환
```

### Test Case 5: 에러 케이스

```
- 잘못된 URL → 400
- 삭제된 영상 URL → 적절한 에러
```

---

## 6. 성능 검토

- [ ] POST /api/extractions 응답 시간: 8초 이내
- [ ] 각 단계별 소요 시간 로깅이 동작하는지
- [ ] 타임아웃 가드(AbortController)가 설정되어 있는지

---

## 7. CI 검토

- [ ] `.github/workflows/ci.yml` 존재
- [ ] push/PR 트리거 설정
- [ ] lint → typecheck → test 순서
- [ ] 테스트가 실제 외부 API를 호출하지 않는지 (mock/fixture 사용)

---

## 검토 결과 판정 기준

| 등급           | 기준                                           |
| -------------- | ---------------------------------------------- |
| ✅ PASS        | 모든 필수 체크리스트 통과 + 스모크 테스트 성공 |
| ⚠️ CONDITIONAL | 필수 항목 90% 이상 통과 + 잔여 이슈 목록 제공  |
| ❌ FAIL        | 필수 항목 미달 또는 치명적 이슈 존재           |

---

## 검토 후 산출물

1. 검토 결과 보고서 (PASS/CONDITIONAL/FAIL + 상세 피드백)
2. 발견된 이슈 목록 (severity: HIGH/MEDIUM/LOW)
3. Step 2 착수 가능 여부 판정
4. Step 2 계획에 반영할 사항 (있으면)
