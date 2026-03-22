# T-002: youtube-transcript Hanging 수정 계획

## 문제

`youtube-transcript` 라이브러리의 `fetchTranscript` 호출이 간헐적으로 무한 정체(hang)됨.

### 근본 원인

```
fetchTranscript()
  → fetchViaInnerTube()    // POST — custom fetch 사용 ✅
      catch { return; }     // AbortError 포함 모든 에러 삼킴 ❌
  → fetchViaWebPage()      // GET — custom fetch 사용 ✅
      await response.text() // 바디 읽기 — AbortSignal 미적용 ❌
  → parseInlineJson()      // 동기 CPU 루프 — abort 불가 ❌
  → fetchTranscriptFromTracks()
      await response.text() // 바디 읽기 — AbortSignal 미적용 ❌
```

- `abortableFetch`가 `fetch()` 호출은 보호하지만, `response.text()` 바디 읽기와 동기 파싱은 보호 불가
- `fetchViaInnerTube`의 `catch { return; }` 이 AbortError를 삼켜서 fallback으로 넘어감
- 파이프라인 90초 타임아웃이 라이브러리 내부 hanging을 끊지 못함

### 사용자 영향

- 추출 레코드가 `processing` / `fetching_captions` 상태로 영구 정체
- 클라이언트 SWR 폴링이 무한 지속 (스피너 영구 표시)
- 같은 URL 재시도 시 stuck 레코드가 그대로 반환되어 탈출 불가

---

## 수정 내용

### 변경 1: Stage-level `Promise.race` 타임아웃

**파일**: `src/lib/extraction/service.ts`

`withTimeout` 유틸리티를 모듈 레벨에 추가하고, `fetchCaptions` 호출을 20초 타임아웃으로 감싼다.

1. 상수 추가:

```typescript
const CAPTION_STAGE_TIMEOUT_MS = 20_000;
```

2. `withTimeout` 함수 추가 (모듈 레벨):

```typescript
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => {
      const error = new Error(`${label} timed out after ${ms}ms`);
      error.name = 'AbortError';
      reject(error);
    }, ms);
    promise.then(resolve, reject).finally(() => clearTimeout(id));
  });
}
```

핵심: `error.name = 'AbortError'`로 설정하여 기존 `mapUpstreamError` (line 297)가 `EXTRACTION_TIMEOUT`으로 자동 매핑되도록 한다.

3. `processExtractionPipeline` 내 `fetchCaptions` 호출 래핑 (현재 line 473-475):

```typescript
// Before
const captions = await runStage('fetching_captions', () =>
  fetchCaptions(videoId, { fetchImpl }),
);

// After
const captions = await runStage('fetching_captions', () =>
  withTimeout(
    fetchCaptions(videoId, { fetchImpl }),
    CAPTION_STAGE_TIMEOUT_MS,
    'fetchCaptions',
  ),
);
```

**타임아웃 20초 근거**:

| 단계                  | 정상 소요  | 예산                   |
| --------------------- | ---------- | ---------------------- |
| fetching_metadata     | 1-3초      | 10초 (기존 5초+재시도) |
| **fetching_captions** | **2-10초** | **20초**               |
| structuring (LLM)     | 10-40초    | ~55초                  |
| normalizing           | <1초       | 무시                   |
| saving                | 1-3초      | 무시                   |

### 변경 2: Pipeline cleanup 시 abort 호출

**파일**: `src/lib/extraction/service.ts` — `createPipelineController` 함수 (현재 line 153-161)

파이프라인 성공 완료 후에도 `Promise.race`로 방치된 `fetchTranscript`가 백그라운드에서 소켓을 물고 있을 수 있음. `cleanup` 시 `abort()` 호출로 즉시 정리.

```typescript
// Before
cleanup: () => clearTimeout(timeoutId),

// After
cleanup: () => {
  clearTimeout(timeoutId);
  controller.abort();
},
```

### 변경 3: Stale extraction 복구 로직

**파일**: `src/lib/extraction/service.ts` — `selectReusableExtraction` 함수 (현재 line 311-333)

stuck된 추출이 `processing` 상태로 남으면, 같은 URL 재시도 시 동일한 stuck 레코드를 반환하여 사용자가 영원히 탈출 불가. 2분 이상 된 active 추출은 abandoned로 간주.

1. 상수 및 헬퍼 추가:

```typescript
const STALE_EXTRACTION_MS = 2 * 60 * 1_000;

function isStaleActiveExtraction(extraction: ExtractionRow) {
  return (
    isActiveStatus(extraction.status) &&
    Date.now() - new Date(extraction.updated_at).getTime() > STALE_EXTRACTION_MS
  );
}
```

2. `selectReusableExtraction` 수정:

```typescript
// Before
const activeExtraction = extractions.find((extraction) =>
  isActiveStatus(extraction.status),
);
if (activeExtraction) {
  return activeExtraction;
}

// After
const activeExtraction = extractions.find((extraction) =>
  isActiveStatus(extraction.status),
);
if (activeExtraction) {
  if (isStaleActiveExtraction(activeExtraction)) {
    return null;
  }
  return activeExtraction;
}
```

### 변경 4: 클라이언트 폴링 타임아웃

**파일**: `src/components/extraction-progress.tsx`

SWR 폴링이 `completed`/`failed`만 체크하므로 stuck 시 영원히 스피너 표시. 2분 폴링 타임아웃 추가.

1. 상수 및 상태 추가:

```typescript
const POLLING_TIMEOUT_MS = 120_000;

// 컴포넌트 내부
const [startedAt] = useState(() => Date.now());
```

2. 타임아웃 판정을 SWR 갱신 주기와 연동:

```typescript
const isTimedOut = Date.now() - startedAt > POLLING_TIMEOUT_MS;
const isActive = data
  ? data.status !== 'completed' && data.status !== 'failed' && !isTimedOut
  : true;
```

3. 타임아웃 시 에러 UI 표시:

```typescript
if (isTimedOut) {
  // 에러 상태 UI 표시 — "처리 시간이 초과되었습니다. 다시 시도해 주세요."
  // "홈에서 다시 시도하기" 버튼으로 홈 이동
}
```

---

## 변경 요약

| #   | 파일                                     | 변경 내용                            | 예상 줄 수 |
| --- | ---------------------------------------- | ------------------------------------ | ---------- |
| 1   | `src/lib/extraction/service.ts`          | `withTimeout` + `fetchCaptions` 래핑 | ~15줄 추가 |
| 2   | `src/lib/extraction/service.ts`          | `cleanup`에 `abort()` 추가           | 1줄        |
| 3   | `src/lib/extraction/service.ts`          | stale extraction 감지 로직           | ~10줄 추가 |
| 4   | `src/components/extraction-progress.tsx` | 클라이언트 폴링 타임아웃             | ~10줄 추가 |

**총 2개 파일, ~36줄 추가, 0줄 삭제**

---

## 구현 순서

```
1. service.ts에 withTimeout 유틸리티 추가
2. service.ts에 CAPTION_STAGE_TIMEOUT_MS 상수 추가
3. processExtractionPipeline에서 fetchCaptions 호출을 withTimeout으로 래핑
4. createPipelineController.cleanup에 controller.abort() 추가
5. STALE_EXTRACTION_MS + isStaleActiveExtraction 추가
6. selectReusableExtraction에 stale 감지 로직 추가
7. extraction-progress.tsx에 폴링 타임아웃 추가
```

## 주의사항

- `withTimeout`의 에러는 반드시 `error.name = 'AbortError'`로 설정 — `mapUpstreamError`가 이 이름으로 `EXTRACTION_TIMEOUT` 매핑
- `api-client.ts`는 수정하지 않음
- 기존 에러 핸들링 흐름 변경 없음
- `withTimeout`의 `finally` 블록에서 반드시 타이머 정리

## Acceptance Criteria

- `npm run type-check` 통과
- `npm run lint` 통과
- `npm run test` 통과
- 수동 테스트: curl로 추출 요청 시 캡션 단계가 20초 이내에 완료 또는 타임아웃
