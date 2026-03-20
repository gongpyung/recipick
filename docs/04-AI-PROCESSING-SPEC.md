# 04. AI Processing Spec

## 목표
유튜브 URL을 받아 **예측 가능하고 재현 가능한 파이프라인**으로 구조화 레시피를 만든다.

---

## MVP 권장 범위
### 포함
- URL 파싱
- 메타데이터 수집
- 설명란 수집
- 자막 수집
- LLM 구조화 추출
- schema validation
- 결과 저장 / 편집

### 제외 또는 후순위
- OCR
- 비전 기반 재료 인식
- 프레임 샘플링
- 멀티모달 분석

**판단:** 첫 버전은 subtitle-first가 맞다.

---

## LLM Provider 결정
- 1차 LLM 제공자는 **Z.ai**
- 사용 플랜은 **GLM 코딩 플랜**
- 서버는 Z.ai의 coding endpoint를 사용해 구조화 추출을 수행한다.
- 브라우저에서 LLM API를 직접 호출하지 않고, 반드시 서버 API를 통해 호출한다.
- 모델 ID는 계정에서 실제 사용 가능한 GLM 계열 모델로 확정하되, 환경변수로 바꿀 수 있게 둔다.

### 권장 환경변수
- `ZAI_API_KEY`
- `ZAI_BASE_URL`
- `ZAI_MODEL`

### 권장 기본값
- `ZAI_BASE_URL=https://api.z.ai/api/coding/paas/v4`

### 설계 원칙
- Z.ai provider 종속은 인정하되, 모델명은 코드에 하드코딩하지 않는다.
- 추후 모델 변경 시 `ZAI_MODEL`만 바꿔 재사용 가능하게 만든다.
- prompt / normalization / validation 로직은 provider 교체와 분리된 구조로 둔다.

---

## 처리 단계
### 1. URL 검증
입력 URL이 아래 형식인지 확인한다.
- `youtube.com/watch?v=...`
- `youtu.be/...`
- `youtube.com/shorts/...`

출력:
- `videoId`
- `sourceType` (`video` | `shorts`)

### 2. 메타데이터 수집
- 제목
- 설명란
- 썸네일
- 채널명 (선택)

### 3. 자막 수집
우선순위:
1. 수동 자막
2. 자동 생성 자막
3. 없으면 실패 또는 후속 fallback

### 4. 텍스트 정리
입력 텍스트를 정리한다.
- 반복 제거
- 지나친 공백/노이즈 제거
- 타임스탬프 제거
- 설명란/자막 결합

### 5. 1차 구조화 추출
LLM이 아래 내용을 수행한다.
- 레시피 제목 식별
- 기본 인분 추정 또는 추출
- 재료 목록 추출
- 조리 단계 분리
- 팁/주의사항 추출
- 경고 생성

### 6. Schema Validation
- JSON Schema 기준 유효성 검사
- invalid 시 1회 재시도
- 재시도 후에도 실패하면 extraction failed

### 7. 후처리 정규화
- 단위 정규화
- 숫자형 수량 정규화
- `scalable` 판정
- confidence 보정

### 8. 결과 저장
- raw extraction 결과 저장
- normalized recipe 저장
- 사용자가 편집 가능한 상태로 제공

---

## 추출 전략
### 추천: 2-pass 구조
#### Pass 1. Extraction
모델이 원문으로부터 재료/단계/팁을 구조화한다.

#### Pass 2. Normalization
별도 규칙으로:
- 단위 정규화
- 숫자 변환
- confidence 및 warnings 보강

**장점:**
- 디버깅 쉬움
- 품질 문제 원인 분리 가능
- prompt 수정 범위 축소 가능

---

## 실패 조건
아래는 실패 또는 unsupported 처리 가능.
- 레시피 영상이 아님
- 자막/설명 정보가 너무 부족함
- 복수 요리가 혼합되어 구조화가 불가능함
- schema valid 결과를 만들지 못함

---

## 경고 조건
완전 실패는 아니지만 사용자 주의가 필요한 경우.
- 기본 인분이 없음
- 재료 수량 다수가 없음
- 일부 단계가 추정 기반임
- 재료명은 있으나 단위가 불명확함

---

## 모델 출력 원칙
1. 없는 정보는 만들지 않는다.
2. 추정이면 warning을 남긴다.
3. schema 밖의 필드를 넣지 않는다.
4. 결과는 항상 JSON만 반환하게 한다.

---

## 저장 권장 항목
- raw prompt input (민감정보 없는 범위)
- raw model output
- normalized output
- extractor version
- model name
- 처리 시간
- source 사용 내역 (`title`, `description`, `captions` 등)

---

## 버전 전략
### v1
- subtitle-first
- 설명란 + 자막 기반
- 구조화 + 편집 + 인분 조절

### v1.1
- 자막 없는 경우 ASR fallback

### v1.2
- OCR / 비전 보강

---

## 품질 전략
이 제품은 **모든 걸 자동 정답화**하는 대신,
- 구조화는 잘하고
- 불확실성은 숨기지 않고
- 사용자가 쉽게 보정하게 만드는 방향이 적합하다.
