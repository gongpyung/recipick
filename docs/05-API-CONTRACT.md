# 05. API Contract

## 설계 원칙

- 추출은 시간이 걸릴 수 있으므로 **job/extraction 기반 비동기 API**로 설계한다.
- 인분 조절은 서버 왕복 없이 **클라이언트에서 계산**한다.
- 저장은 편집 완료 시점에만 수행해도 된다.

---

## 1. POST /api/extractions

새 추출 작업 생성.

### request

```json
{
  "youtubeUrl": "https://www.youtube.com/watch?v=abc123"
}
```

### response 202

```json
{
  "extractionId": "ext_123",
  "status": "queued"
}
```

### errors

- `400 INVALID_URL`
- `422 UNSUPPORTED_URL`
- `429 RATE_LIMITED`

---

## 2. GET /api/extractions/:extractionId

추출 작업 상태 조회.

### response: queued / processing

```json
{
  "extractionId": "ext_123",
  "status": "processing",
  "stage": "structuring"
}
```

### response: completed

```json
{
  "extractionId": "ext_123",
  "status": "completed",
  "recipeId": "rcp_123"
}
```

### response: failed

```json
{
  "extractionId": "ext_123",
  "status": "failed",
  "errorCode": "INSUFFICIENT_SOURCE_TEXT",
  "message": "자막 또는 설명 정보가 부족합니다."
}
```

---

## 3. GET /api/recipes/:recipeId

구조화된 레시피 조회.

### response 200

```json
{
  "id": "rcp_123",
  "title": "대파제육볶음",
  "baseServings": 2,
  "ingredients": [],
  "steps": [],
  "tips": [],
  "warnings": [],
  "confidence": "medium"
}
```

---

## 4. PATCH /api/recipes/:recipeId

사용자 수정 결과 저장.

### request

```json
{
  "title": "대파제육볶음",
  "baseServings": 3,
  "ingredients": [],
  "steps": [],
  "tips": [],
  "warnings": []
}
```

### response 200

```json
{
  "id": "rcp_123",
  "updated": true,
  "updatedAt": "2026-03-20T14:00:00Z"
}
```

---

## 5. GET /api/recipes?scope=recent

최근 생성 레시피 목록 조회.

### response 200

```json
{
  "items": [
    {
      "id": "rcp_123",
      "title": "대파제육볶음",
      "thumbnailUrl": "https://...",
      "updatedAt": "2026-03-20T14:00:00Z"
    }
  ]
}
```

---

## 클라이언트 계산 규칙

인분 조절은 기본적으로 클라이언트에서 수행한다.

```ts
scaledAmount = originalAmount * (targetServings / baseServings);
```

### 예외

- `amount === null` → 그대로
- `scalable === false` → 그대로
- `baseServings === null` → 조절 비활성 또는 경고

---

## 상태값 정의

### extraction status

- `queued`
- `processing`
- `completed`
- `failed`

### stage

- `validating_url`
- `fetching_metadata`
- `fetching_captions`
- `structuring`
- `normalizing`
- `saving`

---

## 보류 중 결정

1. SSE / polling 중 어떤 방식을 쓸지
2. 같은 videoId 재입력 시 기존 결과 재사용 여부
3. 저장 없이 local-only 결과를 허용할지
