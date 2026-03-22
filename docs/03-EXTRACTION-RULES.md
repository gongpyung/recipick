# 03. Extraction Rules

## 목적

LLM이 레시피를 구조화할 때 **무엇을 추정하고, 무엇을 비워두고, 무엇을 경고로 돌릴지**를 명확히 정의한다.

---

## 입력 소스 우선순위

### MVP v1

1. 영상 제목
2. 영상 설명란
3. 자막(자동/수동)

### 후속 버전

4. 음성 전사 fallback
5. OCR / 프레임 텍스트 인식
6. 비전 기반 재료 인식

**권고:** MVP는 1~3만 사용한다.

---

## 기본 규칙

1. 확실하지 않은 정보는 단정하지 않는다.
2. 없는 정보를 상상해서 채우지 않는다.
3. 추정한 경우 `warnings`에 남긴다.
4. 수량이 숫자형이 아니면 `scalable=false`로 둔다.
5. 레시피가 아닌 영상이면 실패 또는 unsupported로 처리한다.

---

## 재료 추출 규칙

### 필수 필드

- `name`
- `amount`
- `unit`
- `scalable`
- `note`
- `confidence`

### 수량 처리 규칙

- 숫자형이면 `amount`에 number 저장
- 표현만 있고 숫자로 확정이 어려우면 `amount=null`
- 예: `적당량`, `조금`, `한 줌`, `취향껏` → `scalable=false`

### 예시

- `간장 2큰술` → amount=2, unit=`tbsp` 또는 `큰술`, scalable=true
- `후추 약간` → amount=null, unit=`약간`, scalable=false
- `양파 반 개` → amount=0.5, unit=`개`, scalable=true

---

## 단위 정규화 규칙

### MVP 기본 단위 집합

- g
- kg
- ml
- l
- tsp / 작은술
- tbsp / 큰술
- cup
- 개
- 줄기
- 줌
- 약간

### 권장 방향

- 내부 저장은 표준형으로
- UI는 한국어 친화적으로 표시 가능

예:

- `큰 술`, `큰술`, `tbsp` → 내부 표준 `tbsp`
- `작은 술`, `작은술`, `tsp` → 내부 표준 `tsp`

---

## 인분 규칙

- 기본 인분(`baseServings`)이 추정 가능하면 number 저장
- 없으면 `null` 허용 가능하지만 MVP에서는 가능한 한 추정 시도
- 추정 시 `warnings`에 남긴다

예:

- `2인분 레시피` 명시 → 2
- `4 servings` 명시 → 4
- 명시가 전혀 없으면 null 또는 2 기본 추정 + warning

**권고:** 기본 인분이 전혀 없으면 억지로 2를 넣지 말고 `warning`과 함께 `null` 허용을 고려한다.

---

## 조리 단계 규칙

- 단계는 최소 1개 이상
- 너무 긴 문단 하나로 만들지 않는다
- 가능하면 행동 중심으로 분리
- 시간 정보가 있으면 note 또는 step text에 유지

### 좋은 예

1. 양파를 얇게 썬다.
2. 팬에 기름을 두르고 양파를 볶는다.
3. 고기와 양념을 넣고 센 불에 볶는다.

### 나쁜 예

- 재료 준비와 조리를 한 문장에 모두 몰아넣은 장문

---

## 경고(warnings) 코드 제안

- `MISSING_QUANTITY`
- `MISSING_BASE_SERVINGS`
- `LOW_CONFIDENCE_INGREDIENT`
- `LOW_CONFIDENCE_STEP`
- `MULTIPLE_DISHES_DETECTED`
- `NON_RECIPE_VIDEO`
- `INSUFFICIENT_SOURCE_TEXT`
- `OCR_REQUIRED_BUT_DISABLED`

---

## confidence 기준

### high

- 텍스트에서 명확히 언급됨
- 재료명/수량/단위가 직접적으로 확인됨

### medium

- 텍스트 일부 누락이 있지만 문맥상 꽤 합리적

### low

- 추정 성격이 강함
- 직접적 근거가 약함
- 사용자 확인이 필요함

---

## 절대 하지 말 것

- 없는 재료를 보완해서 넣기
- 그럴듯한 양념을 임의로 추가하기
- 한국 요리니까 당연히 들어간다고 가정하기
- 기본 인분을 무조건 2로 고정하기

---

## 제품 관점 메모

이 앱에서 중요한 것은 **완벽한 정답**보다 **솔직한 구조화**다.
즉,

- 맞는 건 구조화하고
- 애매한 건 애매하다고 표시하고
- 사용자가 쉽게 수정할 수 있게 만드는 것
  이 방향이 더 낫다.
