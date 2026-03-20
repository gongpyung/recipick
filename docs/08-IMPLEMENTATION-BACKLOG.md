# 08. Implementation Backlog

## Phase 0. 프로젝트 부트스트랩
### 목표
문서 기준을 코드 구조로 옮길 준비.

### 작업
- [ ] Next.js + TypeScript 프로젝트 생성
- [ ] Tailwind / shadcn/ui 세팅
- [ ] 기본 폴더 구조 정의
- [ ] 환경변수 구조 정의 (`ZAI_API_KEY`, `ZAI_BASE_URL`, `ZAI_MODEL` 포함)
- [ ] Z.ai GLM 코딩 플랜 기준 서버 환경 구성
- [ ] lint / format / basic CI 세팅

---

## Phase 1. 입력 + 추출 작업 골격
### 목표
URL을 받아 extraction job을 만들고 상태를 조회할 수 있게 한다.

### 작업
- [ ] URL validator 구현
- [ ] `POST /api/extractions` 구현
- [ ] `GET /api/extractions/:id` 구현
- [ ] extraction status model 정의
- [ ] 홈 화면 + 진행 화면 연결

---

## Phase 2. 메타데이터/자막 수집
### 목표
유튜브 입력으로부터 실제 텍스트 소스를 얻는다.

### 작업
- [ ] video id 파서 구현
- [ ] 메타데이터 수집 모듈
- [ ] 자막 수집 모듈
- [ ] 설명란 정리 모듈
- [ ] source text normalize 모듈

---

## Phase 3. 구조화 추출 + 검증
### 목표
LLM 결과를 schema valid recipe로 만든다.

### 작업
- [ ] Z.ai GLM 코딩 플랜 기반 LLM client 구현
- [ ] extraction prompt 1차 작성
- [ ] normalization pass 작성
- [ ] JSON schema validation 연결
- [ ] retry 정책 정의
- [ ] raw output 저장
- [ ] Z.ai 응답/에러 포맷 로깅 구조 정의

---

## Phase 4. 결과 화면 + 인분 조절
### 목표
사용자가 바로 결과를 보고 인분 조절을 할 수 있게 한다.

### 작업
- [ ] 결과 화면 구현
- [ ] 재료 목록 UI 구현
- [ ] 단계 UI 구현
- [ ] 인분 조절 로직 구현
- [ ] warning / confidence UI 구현

---

## Phase 5. 편집 + 최근 결과
### 목표
AI 결과를 수정하고 다시 열 수 있게 한다.

### 작업
- [ ] 편집 모드 구현
- [ ] PATCH 저장 API 구현
- [ ] recent history 구현
- [ ] localStorage 또는 DB 저장 연결

---

## Phase 6. 평가셋 + 품질 개선
### 목표
MVP 품질 기준을 맞춘다.

### 작업
- [ ] eval set URL 채우기
- [ ] 수동 평가 루틴 만들기
- [ ] 실패 패턴 분류
- [ ] prompt / normalization 개선
- [ ] unsupported 탐지 개선

---

## 추천 우선순위
1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6

---

## 개발 첫 주 권장 완료선
### Week 1 목표
- URL 입력 가능
- extraction job 생성 가능
- 자막/설명 텍스트 수집 가능
- mock recipe 결과 렌더링 가능

### Week 2 목표
- 실제 LLM 구조화 추출
- schema validation
- 인분 조절

### Week 3 목표
- 편집 + recent history
- eval set 1차 검증

---

## 즉시 결정해야 할 것
- [x] subtitle-first MVP 확정
- [ ] localStorage 시작 vs DB 바로 도입
- [ ] extraction 비동기 polling vs SSE
- [x] 1차 LLM 제공자: **Z.ai / GLM 코딩 플랜**
- [ ] 실제 기본 모델 ID 확정 (`ZAI_MODEL`)
